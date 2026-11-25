import { useState } from 'react'
import { excerpt, formatDate } from '../text.js'
import { APP_NAME, getCapsule } from '../data.js'
import MachineDecor from './MachineDecor.jsx'

export default function Home({ notes, settings, onOpen, onCreate, onRename, onDelete }) {
  const [menuId, setMenuId] = useState(null)
  const [renamingId, setRenamingId] = useState(null)
  const [draftTitle, setDraftTitle] = useState('')

  function startRename(note) {
    setDraftTitle(note.title)
    setRenamingId(note.id)
    setMenuId(null)
  }

  function commitRename(id) {
    const title = draftTitle.trim()
    if (title) onRename(id, title)
    setRenamingId(null)
  }

  return (
    <main className="screen home-screen">
      <header className="app-header">
        <span className="header-capsule" aria-hidden="true" />
        <div>
          <h1>{APP_NAME}</h1>
          <p>{notes.length ? `${notes.length} ${notes.length > 1 ? 'confessions' : 'confession'}` : 'Tes pages, à l’abri.'}</p>
        </div>
      </header>

      {settings.afficherMachine && (
        <div className="home-machine"><MachineDecor capsuleColor={getCapsule(settings.capsuleId).couleur} /></div>
      )}

      {notes.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 120 110" aria-hidden="true" className="empty-illustration">
            <rect x="22" y="12" width="76" height="86" rx="4" fill="#F3E9D2" stroke="#CFC4AD" />
            <path d="M32 34h56M32 46h56M32 58h44" stroke="#B8A98D" strokeWidth="2" strokeLinecap="round" />
            <rect x="14" y="86" width="92" height="10" rx="5" fill="#2B2D31" />
          </svg>
          <h2>Confie-toi, la page t’attend.</h2>
          <p>Une note, un souffle, un secret. Tout reste sur ton téléphone.</p>
          <button type="button" className="primary-button" onClick={onCreate}>Écrire une première note</button>
        </div>
      ) : (
        <div className="note-list">
          {notes.map((note) => (
            <article className="note-card" key={note.id} onClick={() => renamingId !== note.id && onOpen(note.id)}>
              {renamingId === note.id ? (
                <div className="rename-row" onClick={(event) => event.stopPropagation()}>
                  <input
                    autoFocus
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') commitRename(note.id)
                      if (event.key === 'Escape') setRenamingId(null)
                    }}
                    aria-label="Nouveau titre"
                  />
                  <button type="button" className="primary-button small" onClick={() => commitRename(note.id)}>OK</button>
                </div>
              ) : (
                <>
                  <div className="note-card-top">
                    <h2>{note.title || 'Sans titre'}</h2>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Options de ${note.title || 'Sans titre'}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        setMenuId(menuId === note.id ? null : note.id)
                      }}
                    >
                      •••
                    </button>
                  </div>
                  <p className="note-excerpt">{excerpt(note.text) || 'Page encore blanche…'}</p>
                  <time dateTime={new Date(note.updatedAt).toISOString()}>{formatDate(note.updatedAt)}</time>
                  {menuId === note.id && (
                    <div className="note-menu" onClick={(event) => event.stopPropagation()}>
                      <button type="button" onClick={() => onOpen(note.id)}>Ouvrir</button>
                      <button type="button" onClick={() => startRename(note)}>Renommer</button>
                      <button type="button" className="danger" onClick={() => { setMenuId(null); onDelete(note.id) }}>Supprimer</button>
                    </div>
                  )}
                </>
              )}
            </article>
          ))}
        </div>
      )}
      <p className="home-footer">Rien ne quitte cet appareil.</p>
    </main>
  )
}
