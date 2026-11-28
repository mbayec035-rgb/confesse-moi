import { useEffect } from 'react'

export default function ConfirmSheet({ title, description, confirmLabel = 'Supprimer', onConfirm, onClose }) {
  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="sheet confirm-sheet"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <button type="button" className="sheet-action danger" onClick={onConfirm}>{confirmLabel}</button>
        <button type="button" className="sheet-action" onClick={onClose}>Annuler</button>
      </div>
    </div>
  )
}
