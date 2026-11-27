import { useState } from 'react'
import { excerpt, formatDate } from '../text.js'
import { APP_NAME, getSticker } from '../data.js'
import StickerPicker from './StickerPicker.jsx'

// Ornements dessinés à la main : aucune police d’icônes ni emoji Unicode.
function BotanicalSprig({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M23.4 44C21.7 35 23.4 24 27.2 13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M24.8 35.5C18.2 34.8 14 29.7 13 23.8c6.2.2 10.8 4 11.8 11.7Z" fill="currentColor" opacity=".28" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      <path d="M26.3 29.4c6.3-1.2 10.6-6 11.8-11.6-6.1-.1-10.8 3.4-11.8 11.6Z" fill="currentColor" opacity=".28" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      <path d="M27.1 18.2c-4.6-1.4-6.9-4.8-6.3-9.1 4.1.6 6.9 3.8 6.3 9.1Z" fill="currentColor" opacity=".28" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      <path d="M27.4 11.8c-2.7-2.4-2.4-5.6.3-6.7 2.7.8 3.5 3.7-.3 6.7Z" fill="currentColor" opacity=".5" stroke="currentColor" strokeWidth=".9" />
      <circle cx="34.4" cy="10.2" r="2" fill="currentColor" opacity=".42" />
      <circle cx="31.8" cy="6.6" r="1.4" fill="currentColor" opacity=".32" />
    </svg>
  )
}

function NotesIcon() {
  return (
    <svg className="note-options-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="5.2" cy="12.6" r="1.35" />
      <circle cx="12" cy="11.8" r="1.35" />
      <circle cx="18.8" cy="12.4" r="1.35" />
      <path d="M4.6 17.4c4.6 1.5 10.2 1.7 14.9-.3" fill="none" stroke="currentColor" strokeWidth=".75" strokeLinecap="round" opacity=".55" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
      <circle cx="10.6" cy="10.6" r="6.2" />
      <path d="m15.2 15.2 4.4 4.4" />
    </svg>
  )
}

function fold(value) {
  return String(value ?? '')
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function ArchiveIllustration() {
  return (
    <svg viewBox="0 0 150 126" aria-hidden="true" className="empty-illustration">
      <path d="M39 18c24-4 53-3 73 1l-1 58c-24-3-49-4-72-1Z" fill="#e6e4d1" stroke="#b6b49e" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M49 34c18-2 37-2 52 0M49 46c18-2 35-2 48 0M49 58c14-1 26-2 37-1" stroke="#a9a892" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M18 70c33-4 76-4 113 0l-6 38c-34-4-68-4-101 0Z" fill="#d8d6c0" stroke="#a9a892" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M18 70c33 22 76 23 113 0M18 108c31-17 78-17 107 0" stroke="#a9a892" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <g transform="translate(101 20) scale(.62)" fill="none" stroke="#c4c3a8" strokeWidth="1.5" strokeLinecap="round">
        <path d="M23.4 44C21.7 35 23.4 24 27.2 13.5" />
        <path d="M24.8 35.5C18.2 34.8 14 29.7 13 23.8c6.2.2 10.8 4 11.8 11.7Z" fill="#c4c3a8" fillOpacity=".35" />
        <path d="M26.3 29.4c6.3-1.2 10.6-6 11.8-11.6-6.1-.1-10.8 3.4-11.8 11.6Z" fill="#c4c3a8" fillOpacity=".35" />
        <path d="M27.1 18.2c-4.6-1.4-6.9-4.8-6.3-9.1 4.1.6 6.9 3.8 6.3 9.1Z" fill="#c4c3a8" fillOpacity=".35" />
        <circle cx="29" cy="8" r="2.4" fill="#c4c3a8" fillOpacity=".55" stroke="none" />
      </g>
    </svg>
  )
}

export default function Home({ notes, settings, onOpen, onCreate, onRename, onDelete, onSign }) {
  const [menuId, setMenuId] = useState(null)
  const [renamingId, setRenamingId] = useState(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [signingId, setSigningId] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  const needle = fold(query).trim()
  const visibleNotes = needle
    ? notes.filter((note) => fold(`${note.title} ${note.text}`).includes(needle))
    : notes

  function toggleSearch() {
    if (searchOpen) setQuery('')
    setSearchOpen(!searchOpen)
  }

  function clearSearch() {
    setQuery('')
    setSearchOpen(false)
  }

  function startRename(note) {
    setDraftTitle(note.title)
    setRenamingId(note.id)
    setMenuId(null)
  }

  function startSigning(id) {
    setSigningId(id)
    setMenuId(null)
  }

  function pickSignature(stickerId) {
    onSign?.(signingId, stickerId)
    setSigningId(null)
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
        <BotanicalSprig className="home-sprig" />
        <button
          type="button"
          className="icon-button home-search-button"
          onClick={toggleSearch}
          aria-label={searchOpen ? 'Fermer la recherche' : 'Rechercher une note'}
          aria-expanded={searchOpen}
        >
          <SearchIcon />
        </button>
      </header>

      {searchOpen && (
        <div className="home-search">
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Escape') clearSearch() }}
            placeholder="Chercher dans tes notes…"
            aria-label="Rechercher dans les notes"
          />
          {query && (
            <button type="button" className="icon-button" onClick={() => setQuery('')} aria-label="Effacer la recherche">✕</button>
          )}
        </div>
      )}

      {notes.length === 0 ? (
        <div className="empty-state">
          <ArchiveIllustration />
          <h2>Confie-toi, la page t’attend.</h2>
          <p>Une note, un souffle, un secret. Tout reste sur ton téléphone.</p>
          <button type="button" className="primary-button" onClick={onCreate}>Écrire une première note</button>
        </div>
      ) : visibleNotes.length === 0 ? (
        <div className="empty-state home-search-empty">
          <h2>Aucune note trouvée.</h2>
          <p>Essaie un autre mot ou efface la recherche.</p>
          <button type="button" className="primary-button small" onClick={() => setQuery('')}>Effacer la recherche</button>
        </div>
      ) : (
        <>
          <div className="archive-divider" aria-hidden="true">
            <BotanicalSprig className="divider-sprig" />
            <span>{needle ? 'Résultats' : 'Archives'}</span>
          </div>
          <div className="note-list">
          {visibleNotes.map((note, index) => (
            <article className="note-card" key={note.id} onClick={() => renamingId !== note.id && onOpen(note.id)}>
              <span className="note-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
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
                    <div className="note-title-group">
                      <h2>{note.title || 'Sans titre'}</h2>
                      {note.signature && (
                        <button
                          type="button"
                          className="note-signature"
                          onClick={(event) => { event.stopPropagation(); startSigning(note.id) }}
                          aria-label="Changer la signature"
                          title={`Signée : ${getSticker(note.signature).label}`}
                        >
                          <img src={getSticker(note.signature).image} alt="" draggable="false" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Options de ${note.title || 'Sans titre'}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        setMenuId(menuId === note.id ? null : note.id)
                      }}
                    >
                      <NotesIcon />
                    </button>
                  </div>
                  <p className="note-excerpt">{excerpt(note.text) || 'Page encore blanche…'}</p>
                  <time dateTime={new Date(note.updatedAt).toISOString()}>{formatDate(note.updatedAt)}</time>
                  {menuId === note.id && (
                    <div className="note-menu" onClick={(event) => event.stopPropagation()}>
                      <button type="button" onClick={() => onOpen(note.id)}>Ouvrir</button>
                      <button type="button" onClick={() => startRename(note)}>Renommer</button>
                      <button type="button" onClick={() => startSigning(note.id)}>
                        {note.signature ? 'Changer la signature' : 'Signer la note'}
                      </button>
                      {note.signature && (
                        <button type="button" onClick={() => { setMenuId(null); onSign?.(note.id, null) }}>
                          Retirer la signature
                        </button>
                      )}
                      <button type="button" className="danger" onClick={() => { setMenuId(null); onDelete(note.id) }}>Supprimer</button>
                    </div>
                  )}
                </>
              )}
            </article>
          ))}
          </div>
        </>
      )}
      {signingId && (
        <StickerPicker
          title="Signer la note"
          description="Choisis un marqueur pour la signaler."
          onPick={pickSignature}
          onClose={() => setSigningId(null)}
        />
      )}
      <p className="home-footer">Rien ne quitte cet appareil.</p>
    </main>
  )
}
