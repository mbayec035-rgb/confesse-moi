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
import { caretCell, layoutText, WRITER_COLS } from '../text.js'
import { shareImage, shareText } from '../share.js'

const HISTORY_LINES = 8

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
  const lampOn = settings.mode === 'nuit'

  const view = useMemo(() => {
    const layout = layoutText(note.text, WRITER_COLS)
    const cell = caretCell(layout, caret)
    const first = Math.max(0, cell.lineIndex - HISTORY_LINES)
    return {
      cell,
      current: layout[cell.lineIndex]?.text ?? '',
      history: layout.slice(first, cell.lineIndex).map((line) => line.text),
    }
  }, [note.text, caret])

  // Tant que la frappe reste sur la même ligne, le tableau des lignes passées
  // garde la même référence : PaperScene/HistoryLines ne re-rendent pas.
  const historyKey = `${view.cell.lineIndex}|${view.history.join('\u0000')}`
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const historyLines = useMemo(() => view.history, [historyKey])

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
      window.visualViewport?.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('scroll', update)
      document.documentElement.style.removeProperty('--H')
      document.documentElement.style.removeProperty('--vv-top')
      document.documentElement.style.removeProperty('--L')
      document.documentElement.style.removeProperty('--keyboard-offset')
    }
  }, [])

  useEffect(() => {
    setCaret(note.text.length)
    previous.current = { lineIndex: 0, length: note.text.length }
    textareaRef.current?.focus()
  }, [note.id])

  useEffect(() => () => window.clearTimeout(typingTimer.current), [])

  // Seule la ligne courante est touchée dans le DOM à chaque frappe.
  useLayoutEffect(() => {
    sceneRef.current?.updateCurrentLine(view.current, view.cell.lineIndex, note.id)
  }, [view.current, view.cell.lineIndex, note.id])

  function handleKeyDown(event) {
    unlockAudio()
    if (event.key === 'Backspace') {
      playSound('backspace', settings)
      return
    }
    if (event.key === 'Enter') return // aucun son : handleChange se contente de changer de ligne
    if (event.key.length !== 1) return
    playSound(event.key === ' ' ? 'space' : 'key', settings)
    sceneRef.current?.flash()
    sceneRef.current?.setTyping(true)
    window.clearTimeout(typingTimer.current)
    typingTimer.current = window.setTimeout(() => sceneRef.current?.setTyping(false), 110)
  }

  function handleChange(event) {
    const value = event.target.value
    const nextCaret = event.target.selectionStart ?? value.length
    const cell = caretCell(layoutText(value, WRITER_COLS), nextCaret)
    const prev = previous.current

    if (cell.lineIndex > prev.lineIndex) {
      // Fin de ligne : retour chariot et papier qui monte, mais aucun son.
      sceneRef.current?.beginNewLine()
    } else if (cell.lineIndex < prev.lineIndex) {
      sceneRef.current?.beginNewLine()
    }

    previous.current = { lineIndex: cell.lineIndex, length: value.length }
    setCaret(nextCaret)
    onChange(value)
  }

  function toggleLamp() {
    unlockAudio()
    playSound('lamp', settings)
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

  function focusWriter() {
    unlockAudio()
    textareaRef.current?.focus()
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
        historyLines={historyLines}
        currentLine={view.current}
        currentLineIndex={view.cell.lineIndex}
        caretColumn={view.cell.column}
        interactive
        onToggleLamp={toggleLamp}
        onMachineClick={focusWriter}
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
        onSelect={(event) => setCaret(event.target.selectionStart ?? note.text.length)}
        onKeyUp={(event) => setCaret(event.target.selectionStart ?? note.text.length)}
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
