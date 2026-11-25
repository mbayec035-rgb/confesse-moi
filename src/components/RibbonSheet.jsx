import { CAPSULES } from '../data.js'

export default function RibbonSheet({ settings, updateSettings, onClose }) {
  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div className="sheet" onClick={(event) => event.stopPropagation()} role="dialog" aria-label="Ruban et encre">
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div>
            <h2>Ruban</h2>
            <p>La capsule et la couleur de l’encre.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="capsule-list">
          {CAPSULES.map((capsule) => (
            <button
              type="button"
              key={capsule.id}
              className={`capsule-row ${settings.capsuleId === capsule.id ? 'selected' : ''}`}
              onClick={() => updateSettings({ capsuleId: capsule.id })}
            >
              <span className="pill" style={{ backgroundColor: capsule.couleur }} aria-hidden="true" />
              <span className="capsule-info">
                <strong>{capsule.nom}</strong>
                <small>{capsule.thème} · {capsule.son.nom}</small>
              </span>
              <span className="check-mark" aria-hidden="true">{settings.capsuleId === capsule.id ? '✓' : ''}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`setting-choice ${settings.patineRuban ? 'selected' : ''}`}
          onClick={() => updateSettings({ patineRuban: !settings.patineRuban })}
          aria-pressed={settings.patineRuban}
        >
          <span className="control-icon" aria-hidden="true">◐</span>
          <span><strong>Patiné ruban</strong><small>Encre brune #2B1F1A au lieu du noir</small></span>
          <span className="check-mark" aria-hidden="true">{settings.patineRuban ? '✓' : ''}</span>
        </button>
      </div>
    </div>
  )
}
