import { useEffect, useState } from 'react'
import BottomNav from './components/BottomNav.jsx'
import Editor from './components/Editor.jsx'
import Home from './components/Home.jsx'
import Settings from './components/Settings.jsx'
import { APP_NAME, DEFAULT_SETTINGS } from './data.js'
import {
  deleteNote,
  deleteNotes,
  exportBackup,
  importBackup,
  initStorage,
  listNotes,
  listTrashedNotes,
  loadSettings,
  purgeExpiredTrash,
  purgeNotes,
  restoreNotes,
  saveNote,
  saveSettings,
} from './db.js'
import { makeId } from './text.js'
import { playSound, unlockAudio } from './sounds.js'

export default function App() {
  const [tab, setTab] = useState('accueil')
  const [notes, setNotes] = useState([])
  const [trash, setTrash] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [activeId, setActiveId] = useState(null)
  const [ready, setReady] = useState(false)
  const [storageReady, setStorageReady] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    let cancelled = false
    async function start() {
      const ok = await initStorage()
      if (cancelled) return
      setStorageReady(ok)
      try {
        await purgeExpiredTrash()
        const [savedNotes, trashedNotes, savedSettings] = await Promise.all([
          listNotes(), listTrashedNotes(), loadSettings(),
        ])
        if (cancelled) return
        setNotes(savedNotes)
        setTrash(trashedNotes)
        setSettings(savedSettings)
      } catch (error) {
        console.warn('Chargement impossible :', error)
      }
      setReady(true)
    }
    start()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 3500)
    return () => window.clearTimeout(timer)
  }, [toast])

  const activeNote = notes.find((note) => note.id === activeId) ?? null

  function patchNote(id, patch) {
    setNotes((current) => {
      const next = current.map((note) => (note.id === id ? { ...note, ...patch, updatedAt: Date.now() } : note))
      const changed = next.find((note) => note.id === id)
      if (changed) saveNote(changed).catch(() => setToast('Sauvegarde impossible.'))
      return next
    })
  }

  function createNote() {
    unlockAudio()
    playSound('insert', settings)
    const now = Date.now()
    const note = { id: makeId(), title: 'Sans titre', text: '', stickers: [], createdAt: now, updatedAt: now }
    setNotes((current) => [note, ...current])
    saveNote(note).catch(() => setToast('Sauvegarde impossible.'))
    setActiveId(note.id)
    setTab('ecrire')
  }

  function removeNote(id) {
    const moved = notes.find((note) => note.id === id)
    if (!moved) return
    setNotes((current) => current.filter((note) => note.id !== id))
    setTrash((current) => [{ ...moved, deletedAt: Date.now() }, ...current])
    deleteNote(id).catch(() => setToast('Suppression impossible.'))
    setToast('Note envoyée à la corbeille.')
    setActiveId(null)
    setTab('accueil')
  }

  function removeNotes(ids) {
    if (!ids.length) return
    const removed = new Set(ids)
    const now = Date.now()
    const moved = notes.filter((note) => removed.has(note.id)).map((note) => ({ ...note, deletedAt: now }))
    setNotes((current) => current.filter((note) => !removed.has(note.id)))
    setTrash((current) => [...moved, ...current])
    deleteNotes(ids).catch(() => setToast('Suppression impossible.'))
    setActiveId(null)
    setToast(`${ids.length} ${ids.length > 1 ? 'notes envoyées' : 'note envoyée'} à la corbeille.`)
  }

  async function refreshTrash() {
    try {
      const purged = await purgeExpiredTrash()
      if (purged) setTrash(await listTrashedNotes())
    } catch {
      // la corbeille affichée reste celle déjà chargée
    }
  }

  function restoreTrashed(ids) {
    if (!ids.length) return
    const restored = trash.filter((note) => ids.includes(note.id)).map(({ deletedAt, ...note }) => note)
    setTrash((current) => current.filter((note) => !ids.includes(note.id)))
    setNotes((current) => [...restored, ...current].sort((a, b) => b.updatedAt - a.updatedAt))
    restoreNotes(ids).catch(() => setToast('Restauration impossible.'))
    setToast(`${ids.length} ${ids.length > 1 ? 'notes restaurées.' : 'note restaurée.'}`)
  }

  function purgeTrashed(ids) {
    if (!ids.length) return
    setTrash((current) => current.filter((note) => !ids.includes(note.id)))
    purgeNotes(ids).catch(() => setToast('Suppression définitive impossible.'))
    setToast(`${ids.length} ${ids.length > 1 ? 'notes supprimées' : 'note supprimée'} définitivement.`)
  }

  function emptyTrash() {
    const ids = trash.map((note) => note.id)
    if (!ids.length) return
    setTrash([])
    purgeNotes(ids).catch(() => setToast('Vidage impossible.'))
    setToast('Corbeille vidée.')
  }

  function changeSettings(patch) {
    setSettings((current) => {
      const next = { ...current, ...patch }
      saveSettings(next).catch(() => {})
      return next
    })
  }

  function changeLamp(patch) {
    setSettings((current) => {
      const next = { ...current, lamp: { ...current.lamp, ...patch } }
      saveSettings(next).catch(() => {})
      return next
    })
  }

  function handleTab(nextTab) {
    if (nextTab === 'ecrire') createNote()
    else {
      setTab(nextTab)
      if (nextTab === 'accueil') setActiveId(null)
    }
  }

  async function handleExport() {
    try {
      const data = await exportBackup()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `confesse-moi-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setToast('Sauvegarde exportée.')
    } catch (error) {
      setToast('Export impossible.')
    }
  }

  async function handleImport(data) {
    await importBackup(data)
    await purgeExpiredTrash()
    const [savedNotes, trashedNotes, savedSettings] = await Promise.all([
      listNotes(), listTrashedNotes(), loadSettings(),
    ])
    setNotes(savedNotes)
    setTrash(trashedNotes)
    setSettings(savedSettings)
    setActiveId(null)
    setTab('accueil')
    setToast('Notes restaurées.')
  }

  return (
    <div className={`app ${settings.mode === 'nuit' ? 'app-night' : ''}`} onPointerDown={unlockAudio}>
      {!ready ? (
        <div className="splash">
          <img className="brand-logo splash-logo" src="/logo-confesse-moi.png" alt="" aria-hidden="true" />
          <h1>{APP_NAME}</h1>
          <p>Confie-toi, la page t’attend.</p>
        </div>
      ) : (
        <>
          {tab === 'accueil' && (
            <Home
              notes={notes}
              settings={settings}
              onCreate={createNote}
              onOpen={(id) => { setActiveId(id); setTab('ecrire') }}
              onRename={(id, title) => patchNote(id, { title })}
              onDelete={removeNote}
              onDeleteMany={removeNotes}
              onSign={(id, stickerId) => patchNote(id, { signature: stickerId })}
              trash={trash}
              onOpenTrash={refreshTrash}
              onRestoreTrashed={restoreTrashed}
              onPurgeTrashed={purgeTrashed}
              onEmptyTrash={emptyTrash}
            />
          )}
          {tab === 'ecrire' && activeNote && (
            <Editor
              note={activeNote}
              notes={notes}
              settings={settings}
              onChange={(text) => patchNote(activeNote.id, { text })}
              onStickersChange={(stickers) => patchNote(activeNote.id, { stickers })}
              onRename={(title) => patchNote(activeNote.id, { title })}
              onDelete={removeNote}
              onCreate={createNote}
              onOpenNote={(id) => setActiveId(id)}
              onBack={() => { setTab('accueil'); setActiveId(null) }}
              onNavigateSettings={() => setTab('reglages')}
              updateSettings={changeSettings}
              updateLamp={changeLamp}
              onToast={setToast}
            />
          )}
          {tab === 'reglages' && (
            <Settings
              settings={settings}
              updateSettings={changeSettings}
              updateLamp={changeLamp}
              onExport={handleExport}
              onImport={handleImport}
              storageReady={storageReady}
            />
          )}
          {tab !== 'ecrire' && <BottomNav tab={tab} onChange={handleTab} />}
        </>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
