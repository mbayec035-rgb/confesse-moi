import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import PaperScene from './PaperScene.jsx'
import ToolBar from './ToolBar.jsx'
import StickerPicker from './StickerPicker.jsx'
import PaperSheet from './PaperSheet.jsx'
import RibbonSheet from './RibbonSheet.jsx'
import LampSheet from './LampSheet.jsx'
import NotesSheet from './NotesSheet.jsx'
import ShareSheet from './ShareSheet.jsx'
import { disposePaperSounds, playSound, setPaperScrollSpeed, unlockAudio } from '../sounds.js'
import { caretCell, caretForCell, layoutText, WRITER_COLS } from '../text.js'
import { shareImage, shareText } from '../share.js'

// Une ligne supplémentaire reste rendue au-dessus : elle glisse sous le
// rouleau au lieu de disparaître d’un coup quand on dépasse la 8e ligne.
const HISTORY_ABOVE = 9
const LINES_BELOW = 4

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export default function Editor({
  note,
  notes,
  settings,
  onChange,
  onStickersChange,
  onRename,
  onDelete,
  onCreate,
  onOpenNote,
  onBack,
  onNavigateSettings,
  updateSettings,
  updateLamp,
  onToast,
}) {
  const [sheet, setSheet] = useState(null)
  const [collapsed, setCollapsed] = useState(false)
  const [caret, setCaret] = useState(() => note.text.length)
  // Lignes remontées au-dessus de la ligne active : 0 = vue de frappe.
  const [scroll, setScroll] = useState(0)
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? 390 : Math.min(window.visualViewport?.width ?? window.innerWidth, 560),
    height: typeof window === 'undefined' ? 844 : (window.visualViewport?.height ?? window.innerHeight),
  }))

  const textareaRef = useRef(null)
  const sceneRef = useRef(null)
  const typingTimer = useRef(null)
  const previous = useRef({ lineIndex: 0, length: note.text.length })
  const scrollRef = useRef(0)
  const scrollMotion = useRef(null)
  const activeLineRef = useRef(0)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const L = viewport.width
  // « jour » = lumière allumée : le même interrupteur pilote le Studio et
  // l’écriture, sans état local qui les désynchronise.
  const lampOn = settings.mode === 'jour'

  const stickers = Array.isArray(note.stickers) ? note.stickers : []
  const layout = useMemo(() => layoutText(note.text, WRITER_COLS), [note.text])
  const cell = useMemo(() => caretCell(layout, caret), [layout, caret])
  activeLineRef.current = cell.lineIndex
  // La ligne sous le T pendant le défilement ; à scroll 0, c’est la ligne active.
  const viewLineIndex = clamp(cell.lineIndex - Math.round(scroll), 0, layout.length - 1)
  const first = Math.max(0, viewLineIndex - HISTORY_ABOVE)
  const last = Math.min(layout.length - 1, viewLineIndex + LINES_BELOW)

  const contextRaw = useMemo(() => {
    const result = []
    for (let index = first; index <= last; index += 1) {
      // La vraie ligne active est dessinée par CurrentLine : toutes les autres,
      // y compris celle sous le rail pendant le défilement, passent par le pli
      // continu. Aucun changement de nœud au franchissement d’une ligne.
      if (index !== cell.lineIndex) result.push({ index, text: layout[index].text })
    }
    return result
  }, [layout, first, last, cell.lineIndex])

  // Tant que la fenêtre reste la même, le tableau des lignes de contexte
  // garde la même référence : PaperScene ne re-rend pas ces nœuds.
  const contextKey = `${first}|${last}|${contextRaw.map((line) => `${line.index}:${line.text}`).join('\u0000')}`
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const contextLines = useMemo(() => contextRaw, [contextKey])

  const activeText = layout[cell.lineIndex]?.text ?? ''
  const activeLength = layout[cell.lineIndex]?.text.length ?? 0
  // Le T reste au rail ; la ligne active descend avec le papier pendant le
  // défilement, donc on masque le curseur dès que le mouvement commence.
  const showCaret = scroll < 0.02

  // Hauteur visible = visualViewport. Le clavier qui s’ouvre recalcule H et
  // toute la scène (en % de H) reste au-dessus de lui.
  useEffect(() => {
    textareaRef.current?.focus()
    const update = () => {
      const vv = window.visualViewport
      const height = vv?.height ?? window.innerHeight
      const top = vv?.offsetTop ?? 0
      const width = Math.min(vv?.width ?? window.innerWidth, 560)
      const keyboard = Math.max(0, window.innerHeight - height - top)
      const root = document.documentElement.style
      root.setProperty('--H', `${height}px`)
      root.setProperty('--vv-top', `${top}px`)
      root.setProperty('--L', `${width}px`)
      root.setProperty('--keyboard-offset', `${keyboard}px`)
      setViewport({ width, height })
    }
    update()
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update)
      window.visualViewport?.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('scroll', update)
      document.documentElement.style.removeProperty('--H')
      document.documentElement.style.removeProperty('--vv-top')
      document.documentElement.style.removeProperty('--L')
      document.documentElement.style.removeProperty('--keyboard-offset')
    }
  }, [])

  useEffect(() => {
    const nextLayout = layoutText(note.text, WRITER_COLS)
    setCaret(note.text.length)
    previous.current = {
      lineIndex: caretCell(nextLayout, note.text.length).lineIndex,
      length: note.text.length,
    }
    if (scrollMotion.current) cancelAnimationFrame(scrollMotion.current)
    scrollMotion.current = null
    scrollRef.current = 0
    setScroll(0)
    textareaRef.current?.focus()
  }, [note.id])

  useEffect(() => () => {
    window.clearTimeout(typingTimer.current)
    if (scrollMotion.current) cancelAnimationFrame(scrollMotion.current)
    disposePaperSounds()
  }, [])

  // Seule la vraie ligne active est touchée dans le DOM, et jamais pendant un
  // défilement : sa position suit le papier en continu, ses lettres restent.
  useLayoutEffect(() => {
    sceneRef.current?.updateCurrentLine(activeText, cell.lineIndex, note.id, showCaret ? cell.column : -1)
  }, [activeText, cell.lineIndex, cell.column, showCaret, note.id])

  // Le textarea reste le clavier : sa sélection suit toujours le T.
  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    if (textarea.value !== note.text) textarea.value = note.text
    textarea.setSelectionRange(caret, caret)
  }, [caret, note.text])

  function commit(nextText, nextCaret) {
    const safeCaret = clamp(nextCaret, 0, nextText.length)
    const nextCell = caretCell(layoutText(nextText, WRITER_COLS), safeCaret)
    if (nextCell.lineIndex !== previous.current.lineIndex) {
      sceneRef.current?.beginNewLine(
        nextCell.lineIndex,
        nextCell.lineIndex > previous.current.lineIndex,
      )
    }
    previous.current = { lineIndex: nextCell.lineIndex, length: nextText.length }
    setCaret(safeCaret)
    onChange(nextText)
  }

  function moveCaret(nextCaret, silent = false) {
    const safeCaret = clamp(nextCaret, 0, note.text.length)
    const nextCell = caretCell(layout, safeCaret)
    if (!silent && nextCell.lineIndex !== cell.lineIndex) {
      sceneRef.current?.scrollLines(Math.sign(nextCell.lineIndex - cell.lineIndex))
    }
    previous.current = { lineIndex: nextCell.lineIndex, length: note.text.length }
    setCaret(safeCaret)
  }

  function selectCell(lineIndex, column, silent = false) {
    const safeLine = clamp(lineIndex, 0, layout.length - 1)
    moveCaret(caretForCell(layout, safeLine, column), silent)
  }

  function cancelScrollMotion() {
    if (scrollMotion.current) cancelAnimationFrame(scrollMotion.current)
    scrollMotion.current = null
  }

  // Bornes du papier : vers le haut jusqu’à la ligne du curseur, vers le bas
  // jusqu’à la dernière ligne de la note. Un tap sur un mot déplace le curseur
  // vers le haut ; sans borne basse, on ne pouvait plus revenir aux lignes
  // récentes qui se trouvent alors sous le T.
  function scrollBounds() {
    const active = clamp(activeLineRef.current, 0, Math.max(0, layout.length - 1))
    return { min: Math.min(0, active - (layout.length - 1)), max: Math.max(0, active) }
  }

  // Résistance aux extrémités : le doigt peut dépasser d’un peu, puis rebondit.
  function applyScrollLimits(value) {
    const { min, max } = scrollBounds()
    const current = scrollRef.current
    let next = value
    if (current >= min && next < min) next = min + (next - min) * 0.3
    else if (current <= max && next > max) next = max + (next - max) * 0.3
    return clamp(next, min - 0.6, max + 0.6)
  }

  function setScrollValue(value) {
    const previousValue = scrollRef.current
    if (Math.abs(value - previousValue) < 0.0001) return
    scrollRef.current = value
    setScroll(value)
    setPaperScrollSpeed(value - previousValue, settingsRef.current)
  }

  function finishScroll() {
    setPaperScrollSpeed(0, settingsRef.current)
  }

  function animateScrollTo(target, duration) {
    cancelScrollMotion()
    // Une molette peut encore avoir un retour d’inertie en attente.
    sceneRef.current?.cancelWheel?.()
    const from = scrollRef.current
    if (Math.abs(from - target) < 0.001) {
      setScrollValue(target)
      finishScroll()
      return
    }
    let start = null
    const step = (now) => {
      if (start === null) start = now
      const progress = clamp((now - start) / duration, 0, 1)
      const eased = 1 - (1 - progress) ** 3
      setScrollValue(from + (target - from) * eased)
      if (progress < 1) scrollMotion.current = requestAnimationFrame(step)
      else {
        scrollMotion.current = null
        setScrollValue(target)
        finishScroll()
      }
    }
    scrollMotion.current = requestAnimationFrame(step)
  }

  function scrollByLines(delta) {
    cancelScrollMotion()
    setScrollValue(applyScrollLimits(scrollRef.current + delta))
  }

  function endScroll(velocity) {
    cancelScrollMotion()
    const { min, max } = scrollBounds()
    const value = scrollRef.current
    if (value < min - 0.01 || value > max + 0.01) {
      animateScrollTo(clamp(value, min, max), 300)
      return
    }
    let speed = clamp(velocity, -20, 20)
    if (Math.abs(speed) < 0.01) {
      setScrollValue(clamp(value, min, max))
      finishScroll()
      return
    }
    let position = value
    const step = () => {
      speed *= 0.95
      const wasOutside = position < min - 0.01 || position > max + 0.01
      let next = position + speed
      if (next > max) {
        next = Math.min(next, max + 0.6)
        speed = (max - next) * 0.25
      } else if (next < min) {
        next = Math.max(next, min - 0.6)
        speed = (min - next) * 0.25
      } else if (wasOutside) {
        // Retour dans la plage : on s’arrête sur la limite, sans la dépasser.
        next = clamp(next, min, max)
        speed = 0
      }
      position = next
      setScrollValue(position)
      if (Math.abs(speed) < 0.01 && position >= min && position <= max) {
        scrollMotion.current = null
        setScrollValue(position)
        finishScroll()
        return
      }
      scrollMotion.current = requestAnimationFrame(step)
    }
    scrollMotion.current = requestAnimationFrame(step)
  }

  function wordTap(lineIndex, column) {
    unlockAudio()
    playSound('paper-tap', settings)
    cancelScrollMotion()
    selectCell(lineIndex, column, true)
    // Retour « clic » : le papier revient en même temps que le son de tap.
    animateScrollTo(0, 110)
    sceneRef.current?.recenter()
    keepFocus()
  }

  function keepFocus() {
    const textarea = textareaRef.current
    if (!textarea) return
    if (document.activeElement !== textarea) textarea.focus({ preventScroll: true })
    textarea.setSelectionRange(caret, caret)
  }

  function handleKeyDown(event) {
    unlockAudio()
    if (Math.abs(scrollRef.current) > 0.01) animateScrollTo(0, 300)
    if (event.isComposing || event.key === 'Process') return
    if (event.metaKey || event.ctrlKey || event.altKey) return

    if (event.key === 'Backspace') {
      event.preventDefault()
      playSound('backspace', settings)
      if (caret > 0) commit(note.text.slice(0, caret - 1) + note.text.slice(caret), caret - 1)
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      commit(`${note.text.slice(0, caret)}\n${note.text.slice(caret)}`, caret + 1)
      return
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      moveCaret(caret + (event.key === 'ArrowLeft' ? -1 : 1))
      return
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      const target = clamp(cell.lineIndex + (event.key === 'ArrowUp' ? -1 : 1), 0, layout.length - 1)
      moveCaret(caretForCell(layout, target, cell.column))
      return
    }

    if (event.key.length !== 1) return
    event.preventDefault()
    playSound(event.key === ' ' ? 'space' : 'key', settings)
    sceneRef.current?.flash()
    sceneRef.current?.setTyping(true)
    window.clearTimeout(typingTimer.current)
    typingTimer.current = window.setTimeout(() => sceneRef.current?.setTyping(false), 110)

    const overwriting = settings.typingMode !== 'inserer'
      && caret < note.text.length
      && note.text[caret] !== '\n'
    const nextText = overwriting
      ? note.text.slice(0, caret) + event.key + note.text.slice(caret + 1)
      : note.text.slice(0, caret) + event.key + note.text.slice(caret)
    commit(nextText, caret + 1)
  }

  // Entrée éventuelle d’un clavier mobile / IME qui n’a pas envoyé de key.
  function handleChange(event) {
    if (Math.abs(scrollRef.current) > 0.01) animateScrollTo(0, 300)
    commit(event.target.value, event.target.selectionStart ?? event.target.value.length)
  }

  function toggleLamp() {
    unlockAudio()
    playSound('lamp', settings)
    updateSettings({ mode: lampOn ? 'nuit' : 'jour' })
  }

  function addSticker(id) {
    const rotation = Number((Math.random() * 12 - 6).toFixed(2))
    onStickersChange?.([...stickers, { ligne: cell.lineIndex, id, rotation }])
    setSheet(null)
    keepFocus()
  }

  function removeSticker(index) {
    onStickersChange?.(stickers.filter((_, position) => position !== index))
    keepFocus()
  }

  async function handleShare(kind) {
    const message = kind === 'texte' ? await shareText(note) : await shareImage(note, settings)
    setSheet(null)
    if (message) onToast(message)
  }

  function handleTool(id) {
    unlockAudio()
    if (id === 'boite') {
      onBack()
      return
    }
    if (id === 'studio') {
      onNavigateSettings()
      return
    }
    setSheet((current) => (current === id ? null : id))
  }

  return (
    <main className={`screen writer-screen ${lampOn ? 'lamp-on' : 'lamp-off'}`} onPointerDown={unlockAudio}>
      <header className="writer-header">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Retour à la Boîte">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 5-7 7 7 7" />
          </svg>
        </button>
        <span className="char-counter" title="Information seulement : aucune limite de caractères">
          <strong>{note.text.length}</strong> car.
        </span>
        <button type="button" className="icon-button" onClick={() => setSheet('partager')} aria-label="Partager la note">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15V3M8 7l4-4 4 4M5 12v8h14v-8" />
          </svg>
        </button>
      </header>

      <PaperScene
        ref={sceneRef}
        seed={note.id}
        settings={settings}
        lampOn={lampOn}
        grain={settings.grain}
        L={L}
        contextLines={contextLines}
        stickers={stickers}
        onRemoveSticker={removeSticker}
        scroll={scroll}
        onScrollBy={scrollByLines}
        onScrollEnd={endScroll}
        onWordTap={wordTap}
        activeLineIndex={cell.lineIndex}
        activeLineText={activeText}
        activeLineLength={activeLength}
        caretColumn={cell.column}
        lineCount={layout.length}
        H={viewport.height}
        interactive
        onSelectCell={selectCell}
        onGoToEnd={() => {
          // Même quand le curseur est déjà à la fin, un double appui sur la
          // capsule doit ramener le papier à la ligne de frappe.
          if (Math.abs(scrollRef.current) > 0.01) animateScrollTo(0, 300)
          moveCaret(note.text.length)
        }}
        onKeepFocus={keepFocus}
        onMachineClick={keepFocus}
      />

      <ToolBar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        activeTool={sheet}
        lampOn={lampOn}
        onTool={handleTool}
        onLampToggle={toggleLamp}
        onLampSettings={() => setSheet('lampe')}
      />

      {/* Le clavier tape ici ; le texte affiché vit dans PaperScene. */}
      <textarea
        ref={textareaRef}
        className="hidden-input"
        value={note.text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Texte de la note"
      />

      {sheet === 'notes' && (
        <NotesSheet
          note={note}
          notes={notes}
          onRename={onRename}
          onDelete={onDelete}
          onCreate={onCreate}
          onOpen={(id) => { setSheet(null); onOpenNote(id) }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'jardin' && <StickerPicker onPick={addSticker} onClose={() => setSheet(null)} />}
      {sheet === 'papier' && <PaperSheet settings={settings} updateSettings={updateSettings} onClose={() => setSheet(null)} />}
      {sheet === 'ruban' && <RibbonSheet settings={settings} updateSettings={updateSettings} onClose={() => setSheet(null)} />}
      {sheet === 'lampe' && (
        <LampSheet
          settings={settings}
          updateSettings={updateSettings}
          updateLamp={updateLamp}
          lampOn={lampOn}
          onToggleLamp={toggleLamp}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'partager' && (
        <ShareSheet onText={() => handleShare('texte')} onImage={() => handleShare('image')} onClose={() => setSheet(null)} />
      )}
    </main>
  )
}
