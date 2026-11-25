export default function ShareSheet({ onText, onImage, onClose }) {
  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div className="sheet" onClick={(event) => event.stopPropagation()} role="dialog" aria-label="Partager">
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div>
            <h2>Partager</h2>
            <p>Un texte, ou l’image de cette page.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <button type="button" className="sheet-action" onClick={onText}>Partager le texte</button>
        <button type="button" className="sheet-action" onClick={onImage}>Partager l’image</button>
      </div>
    </div>
  )
}
