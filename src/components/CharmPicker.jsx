import { CHARMS } from '../data.js'

export function CharmIcon({ id, size = 26, color = 'currentColor' }) {
  if (id === 'etoile') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="m12 2.5 2.5 6.2 6.5.5-5 4.3 1.6 6.4L12 16.6 6.4 19.9 8 13.5 3 9.2l6.5-.5z"
          fill={color}
          stroke="#2B2D31"
          strokeWidth="0.8"
        />
      </svg>
    )
  }
  if (id === 'clef') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <g fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <circle cx="8" cy="8" r="4.2" />
          <path d="M11 11 20 20M16 16l2.5-2.5M18.5 18.5 21 16" />
        </g>
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20.5S3.5 15 3.5 9.2A4.7 4.7 0 0 1 12 6.6a4.7 4.7 0 0 1 8.5 2.6C20.5 15 12 20.5 12 20.5Z"
        fill={color}
        stroke="#2B2D31"
        strokeWidth="0.8"
      />
    </svg>
  )
}

export default function CharmPicker({ selected, onToggle, onClose }) {
  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div className="sheet" onClick={(event) => event.stopPropagation()} role="dialog" aria-label="Choisir des breloques">
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div>
            <h2>Breloques</h2>
            <p>De petits objets accrochés à la machine.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="charm-list">
          {CHARMS.map((charm) => {
            const active = selected.includes(charm.id)
            return (
              <button
                type="button"
                key={charm.id}
                className={`charm-row ${active ? 'selected' : ''}`}
                onClick={() => onToggle(charm.id)}
                aria-pressed={active}
              >
                <CharmIcon id={charm.id} color={charm.couleur} size={30} />
                <span className="charm-info">
                  <strong>{charm.nom}</strong>
                  <small>{charm.effet}</small>
                </span>
                <span className="check-mark" aria-hidden="true">{active ? '✓' : ''}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
