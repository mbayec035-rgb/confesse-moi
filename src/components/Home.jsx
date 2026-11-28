import { useState } from 'react'
import { excerpt, formatDate } from '../text.js'
import { APP_NAME, getSticker } from '../data.js'
import StickerPicker from './StickerPicker.jsx'
import ConfirmSheet from './ConfirmSheet.jsx'
import TrashSheet from './TrashSheet.jsx'

const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' })

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

// Icône conservée pour le futur point d’entrée du mode sélection.
function SelectIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.6" y="3.6" width="8" height="8" rx="1.4" />
      <rect x="12.4" y="12.4" width="8" height="8" rx="1.4" />
      <path d="m5.4 15.2 2.3 2.3 4.3-4.8" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.4" y="5.2" width="17.2" height="15.4" rx="1.6" />
      <path d="M3.4 9.8h17.2M8 3.4v3.4M16 3.4v3.4" />
      <path d="M7.4 13.4h2.2M14.4 13.4h2.2M7.4 17h2.2" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.6 7h14.8M9.4 7V4.6h5.2V7M6.4 7l.8 12.4h9.6L17.6 7" />
      <path d="M10 10.6v5.4M14 10.6v5.4" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg className="month-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
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

export default function Home({
  notes, settings, onOpen, onCreate, onRename, onDelete, onDeleteMany, onSign,
  trash, onOpenTrash, onRestoreTrashed, onPurgeTrashed, onEmptyTrash,
}) {
  const [menuId, setMenuId] = useState(null)
  const [renamingId, setRenamingId] = useState(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [signingId, setSigningId] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [collapsedMonths, setCollapsedMonths] = useState([])
  const [trashOpen, setTrashOpen] = useState(false)
  const [trashConfirm, setTrashConfirm] = useState(null)

  const needle = fold(query).trim()
  const visibleNotes = needle
    ? notes.filter((note) => fold(`${note.title} ${note.text}`).includes(needle))
    : notes
  const visibleIds = visibleNotes.map((note) => note.id)
  const monthGroups = new Map()
  for (const note of visibleNotes) {
    const date = new Date(note.updatedAt)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!monthGroups.has(key)) monthGroups.set(key, { key, label: monthFormatter.format(date), notes: [] })
    monthGroups.get(key).notes.push(note)
  }
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))

  function toggleSearch() {
    if (searchOpen) setQuery('')
    setSearchOpen(!searchOpen)
  }

  function clearSearch() {
    setQuery('')
    setSearchOpen(false)
  }

  function startSelection() {
    setSearchOpen(false)
    setQuery('')
    setMenuId(null)
    setRenamingId(null)
    setSelectedIds([])
    setSelectMode(true)
  }

  function exitSelection() {
    setSelectMode(false)
    setSelectedIds([])
    setConfirmOpen(false)
  }

  function toggleMonth(key) {
    setCollapsedMonths((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])
  }

  function toggleSelect(id) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  function toggleAll() {
    setSelectedIds((current) => allSelected
      ? current.filter((id) => !visibleIds.includes(id))
      : [...new Set([...current, ...visibleIds])])
  }

  function confirmDeleteMany() {
    setConfirmOpen(false)
    onDeleteMany?.(selectedIds)
    exitSelection()
  }

  function openTrash() {
    onOpenTrash?.()
    setTrashOpen(true)
  }

  function askPurge(note) {
    setTrashConfirm({
      title: 'Supprimer définitivement ?',
      description: `« ${note.title || 'Sans titre'} » sera effacée sans retour possible.`,
      confirmLabel: 'Supprimer définitivement',
      onConfirm: () => {
        onPurgeTrashed?.([note.id])
        setTrashConfirm(null)
      },
    })
  }

  function askEmptyTrash() {
    setTrashConfirm({
      title: 'Vider la corbeille ?',
      description: 'Toutes les notes supprimées seront effacées définitivement.',
      confirmLabel: 'Tout supprimer',
      onConfirm: () => {
        onEmptyTrash?.()
        setTrashConfirm(null)
      },
    })
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
        <img className="brand-logo header-logo" src="/logo-confesse-moi.png" alt="" aria-hidden="true" />
        {selectMode ? (
          <div>
            <h1>Sélection</h1>
            <p aria-live="polite">
              {selectedIds.length} {selectedIds.length > 1 ? 'notes sélectionnées' : 'note sélectionnée'}
            </p>
          </div>
        ) : (
          <div>
            <h1>{APP_NAME}</h1>
            <p>{notes.length ? `${notes.length} ${notes.length > 1 ? 'confessions' : 'confession'}` : 'Tes pages, à l’abri.'}</p>
          </div>
        )}
        {!selectMode && <BotanicalSprig className="home-sprig" />}
        {selectMode ? (
          <button
            type="button"
            className="icon-button home-search-button"
            onClick={exitSelection}
            aria-label="Annuler la sélection"
          >
            ✕
          </button>
        ) : (
          <>
            <button
              type="button"
              className="icon-button home-search-button"
              onClick={toggleSearch}
              aria-label={searchOpen ? 'Fermer la recherche' : 'Rechercher une note'}
              aria-expanded={searchOpen}
            >
              <SearchIcon />
            </button>
          </>
        )}
      </header>

      {selectMode ? (
        <div className="home-select-bar">
          <button type="button" className="select-all-button" onClick={toggleAll}>
            {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
          </button>
          <button
            type="button"
            className="select-delete-button"
            disabled={selectedIds.length === 0}
            onClick={() => setConfirmOpen(true)}
          >
            Supprimer
          </button>
        </div>
      ) : searchOpen && (
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
          {[...monthGroups.values()].map((group) => {
            const collapsed = collapsedMonths.includes(group.key)
            return (
              <section className="month-group" key={group.key}>
                <button
                  type="button"
                  className="month-heading"
                  onClick={() => toggleMonth(group.key)}
                  aria-expanded={!collapsed}
                  aria-controls={`month-${group.key}`}
                >
                  <CalendarIcon />
                  <span className="month-label">{group.label}</span>
                  <span className="month-count">
                    {group.notes.length} {group.notes.length > 1 ? 'pages' : 'page'}
                  </span>
                  <ChevronIcon />
                </button>
                <div className="note-list" id={`month-${group.key}`} hidden={collapsed}>
                    {group.notes.map((note) => {
                      const selected = selectedIds.includes(note.id)
                      return (
                        <article
                          className={`note-card${selectMode ? ' selectable' : ''}${selected ? ' selected' : ''}${menuId === note.id ? ' menu-open' : ''}`}
                          key={note.id}
                          onClick={() => {
                            if (renamingId === note.id) return
                            if (selectMode) toggleSelect(note.id)
                            else onOpen(note.id)
                          }}
                          role={selectMode ? 'checkbox' : undefined}
                          aria-checked={selectMode ? selected : undefined}
                          tabIndex={selectMode ? 0 : undefined}
                          onKeyDown={selectMode ? (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              toggleSelect(note.id)
                            }
                          } : undefined}
                        >
                          {selectMode && (
                            <span className="note-select-slot" aria-hidden="true">
                              <span className={`note-check${selected ? ' checked' : ''}`}>{selected ? '✓' : ''}</span>
                            </span>
                          )}
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
                                      disabled={selectMode}
                                      onClick={(event) => { event.stopPropagation(); if (!selectMode) startSigning(note.id) }}
                                      aria-label="Changer la signature"
                                      title={`Signée : ${getSticker(note.signature).label}`}
                                    >
                                      <img src={getSticker(note.signature).image} alt="" draggable="false" />
                                    </button>
                                  )}
                                </div>
                                {!selectMode && (
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
                                )}
                              </div>
                              <p className="note-excerpt">{excerpt(note.text) || 'Page encore blanche…'}</p>
                              <time dateTime={new Date(note.updatedAt).toISOString()}>{formatDate(note.updatedAt)}</time>
                              {!selectMode && menuId === note.id && (
                                <div
                                  className="note-menu"
                                  onPointerDown={(event) => event.stopPropagation()}
                                  onClick={(event) => event.stopPropagation()}
                                >
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
                      )
                    })}
                </div>
              </section>
            )
          })}
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
      {confirmOpen && (
        <ConfirmSheet
          title={`Supprimer ${selectedIds.length} ${selectedIds.length > 1 ? 'notes' : 'note'} ?`}
          description="Les pages choisies iront dans la corbeille et pourront être restaurées pendant 7 jours."
          confirmLabel={`Supprimer ${selectedIds.length} ${selectedIds.length > 1 ? 'notes' : 'note'}`}
          onConfirm={confirmDeleteMany}
          onClose={() => setConfirmOpen(false)}
        />
      )}
      {trashOpen && (
        <TrashSheet
          notes={trash ?? []}
          confirmOpen={Boolean(trashConfirm)}
          onRestore={(id) => onRestoreTrashed?.([id])}
          onPurge={askPurge}
          onEmpty={askEmptyTrash}
          onClose={() => setTrashOpen(false)}
        />
      )}
      {trashConfirm && (
        <ConfirmSheet {...trashConfirm} onClose={() => setTrashConfirm(null)} />
      )}
      <button type="button" className="home-trash-link" onClick={openTrash}>
        <TrashIcon />
        Corbeille
      </button>
      <p className="home-footer">Rien ne quitte cet appareil.</p>
    </main>
  )
}
