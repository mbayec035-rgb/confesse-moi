import { CAPSULES } from '../data.js'

export default function CapsulePicker({ activeId, onSelect, onClose }) {
  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div className="sheet" onClick={(event) => event.stopPropagation()} role="dialog" aria-label="Choisir une capsule">
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div>
            <h2>Capsules</h2>
            <p>Choisis le mode d’écriture de ta machine.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="capsule-list">
          {CAPSULES.map((capsule) => (
            <button
              type="button"
              key={capsule.id}
              className={`capsule-row ${activeId === capsule.id ? 'selected' : ''}`}
              onClick={() => onSelect(capsule.id)}
            >
              <span className="pill" style={{ backgroundColor: capsule.couleur }} aria-hidden="true" />
              <span className="capsule-info">
                <strong>{capsule.nom}</strong>
                <small>{capsule.thème} · {capsule.son.nom}</small>
              </span>
              <span className="check-mark" aria-hidden="true">{activeId === capsule.id ? '✓' : ''}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
