import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import PaperScene from './PaperScene.jsx'
import ToolBar from './ToolBar.jsx'
import CharmPicker from './CharmPicker.jsx'
import PaperSheet from './PaperSheet.jsx'
import RibbonSheet from './RibbonSheet.jsx'
import LampSheet from './LampSheet.jsx'
import NotesSheet from './NotesSheet.jsx'
import ShareSheet from './ShareSheet.jsx'
import { playSound, unlockAudio } from '../sounds.js'
import { caretCell, caretForCell, layoutText, WRITER_COLS } from '../text.js'
import { shareImage, shareText } from '../share.js'

const HISTORY_ABOVE = 8
const LINES_BELOW = 4

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export default function Editor({
  note,
  notes,
  settings,
  onChange,
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
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? 390 : Math.min(window.visualViewport?.width ?? window.innerWidth, 560),
    height: typeof window === 'undefined' ? 844 : (window.visualViewport?.height ?? window.innerHeight),
  }))

  const textareaRef = useRef(null)
  const sceneRef = useRef(null)
  const typingTimer = useRef(null)
  const previous = useRef({ lineIndex: 0, length: note.text.length })

  const L = viewport.width
  // La veilleuse est allumée dès l’ouverture de l’écriture : sans elle,
  // l’encre noire sur papier sombre serait illisible.
  const [veilleuseOn, setVeilleuseOn] = useState(true)
  const lampOn = veilleuseOn

  const layout = useMemo(() => layoutText(note.text, WRITER_COLS), [note.text])
  const cell = useMemo(() => caretCell(layout, caret), [layout, caret])
  const first = Math.max(0, cell.lineIndex - HISTORY_ABOVE)
  const last = Math.min(layout.length - 1, cell.lineIndex + LINES_BELOW)

  const contextRaw = useMemo(() => {
    const result = []
    for (let index = first; index <= last; index += 1) {
      if (index !== cell.lineIndex) result.push({ index, text: layout[index].text })
    }
    return result
  }, [layout, first, last, cell.lineIndex])

  // Tant que la ligne visée reste la même, le tableau des lignes de contexte
  // garde la même référence : PaperScene ne re-rend pas ces nœuds.
  const contextKey = `${cell.lineIndex}|${contextRaw.map((line) => `${line.index}:${line.text}`).join('\u0000')}`
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const contextLines = useMemo(() => contextRaw, [contextKey])

  const activeText = layout[cell.lineIndex]?.text ?? ''
  const activeLength = activeText.length

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
    textareaRef.current?.focus()
  }, [note.id])

  useEffect(() => () => window.clearTimeout(typingTimer.current), [])

  // Seule la ligne visée est touchée dans le DOM ; le curseur est un calque
  // séparé déplacé par transform, sans réécrire la ligne.
  useLayoutEffect(() => {
    sceneRef.current?.updateCurrentLine(activeText, cell.lineIndex, note.id, cell.column)
  }, [activeText, cell.lineIndex, cell.column, note.id])

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
    if (nextCell.lineIndex !== previous.current.lineIndex) sceneRef.current?.beginNewLine()
    previous.current = { lineIndex: nextCell.lineIndex, length: nextText.length }
    setCaret(safeCaret)
    onChange(nextText)
  }

  function moveCaret(nextCaret) {
    const safeCaret = clamp(nextCaret, 0, note.text.length)
    const nextCell = caretCell(layout, safeCaret)
    if (nextCell.lineIndex !== cell.lineIndex) {
      sceneRef.current?.scrollLines(Math.sign(nextCell.lineIndex - cell.lineIndex))
    }
    previous.current = { lineIndex: nextCell.lineIndex, length: note.text.length }
    setCaret(safeCaret)
  }

  function selectCell(lineIndex, column) {
    const safeLine = clamp(lineIndex, 0, layout.length - 1)
    moveCaret(caretForCell(layout, safeLine, column))
  }

  function keepFocus() {
    const textarea = textareaRef.current
    if (!textarea) return
    if (document.activeElement !== textarea) textarea.focus({ preventScroll: true })
    textarea.setSelectionRange(caret, caret)
  }

  function handleKeyDown(event) {
    unlockAudio()
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
    commit(event.target.value, event.target.selectionStart ?? event.target.value.length)
  }

  function toggleLamp() {
    unlockAudio()
    playSound('lamp', settings)
    setVeilleuseOn(!lampOn)
    updateSettings({ mode: lampOn ? 'jour' : 'nuit' })
  }

  function toggleCharm(id) {
    const next = settings.charms.includes(id)
      ? settings.charms.filter((charm) => charm !== id)
      : [...settings.charms, id]
    updateSettings({ charms: next })
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
    <main className="screen writer-screen" onPointerDown={unlockAudio}>
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
        activeLineIndex={cell.lineIndex}
        activeLineText={activeText}
        activeLineLength={activeLength}
        caretColumn={cell.column}
        lineCount={layout.length}
        interactive
        onToggleLamp={toggleLamp}
        onSelectCell={selectCell}
        onGoToEnd={() => moveCaret(note.text.length)}
        onKeepFocus={keepFocus}
        onMachineClick={keepFocus}
      />

      <ToolBar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        activeTool={sheet}
        lampOn={lampOn}
        onTool={handleTool}
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
      {sheet === 'jardin' && <CharmPicker selected={settings.charms} onToggle={toggleCharm} onClose={() => setSheet(null)} />}
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
