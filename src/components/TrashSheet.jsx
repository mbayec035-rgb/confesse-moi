import { useEffect } from 'react'
import { excerpt, formatDate } from '../text.js'

export default function TrashSheet({ notes, confirmOpen, onRestore, onPurge, onEmpty, onClose }) {
  useEffect(() => {
    if (confirmOpen) return undefined
    function handleKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [confirmOpen, onClose])

  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="sheet trash-sheet"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Corbeille"
      >
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div>
            <h2>Corbeille</h2>
            <p>Les notes supprimées restent 7 jours sur cet appareil.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        {notes.length === 0 ? (
          <p className="trash-empty">La corbeille est vide.</p>
        ) : (
          <>
            <div className="trash-list">
              {notes.map((note) => (
                <div className="trash-note" key={note.id}>
                  <strong>{note.title || 'Sans titre'}</strong>
                  <small>{excerpt(note.text) || 'Page encore blanche…'}</small>
                  <time dateTime={new Date(note.deletedAt).toISOString()}>
                    Supprimée {formatDate(note.deletedAt)}
                  </time>
                  <div className="trash-actions">
                    <button type="button" onClick={() => onRestore(note.id)}>Restaurer</button>
                    <button type="button" className="danger" onClick={() => onPurge(note)}>
                      Supprimer définitivement
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="sheet-action danger" onClick={onEmpty}>Vider la corbeille</button>
          </>
        )}
      </div>
    </div>
  )
}
