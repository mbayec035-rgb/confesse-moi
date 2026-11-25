import { BEAM_SHAPES, LAMP_COLORS } from '../data.js'
import { Range, SegmentGroup, Swatches } from './controls.jsx'

export default function LampSheet({ settings, updateSettings, updateLamp, lampOn, onToggleLamp, onClose }) {
  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div className="sheet" onClick={(event) => event.stopPropagation()} role="dialog" aria-label="Veilleuse">
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div>
            <h2>Veilleuse</h2>
            <p>La lumière posée près du rail.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <button
          type="button"
          className={`lamp-switch ${lampOn ? 'on' : ''}`}
          onClick={onToggleLamp}
          aria-pressed={lampOn}
        >
          <span className="switch-knob" />
          <span>{lampOn ? 'Lampe allumée · nuit' : 'Lampe éteinte · jour'}</span>
        </button>

        <Range label="Luminosité" value={settings.lamp.luminosite} min={0.1} max={1} step={0.05} display={`${Math.round(settings.lamp.luminosite * 100)} %`} onChange={(luminosite) => updateLamp({ luminosite })} />
        <Range label="Intensité de la couleur" value={settings.lamp.intensite} min={0} max={100} display={`${settings.lamp.intensite} %`} onChange={(intensite) => updateLamp({ intensite })} />

        <div className="setting-block">
          <span className="setting-label">Couleur du faisceau</span>
          <Swatches colors={LAMP_COLORS} value={settings.lamp.couleur} onChange={(couleur) => updateLamp({ couleur })} label="veilleuse" />
        </div>
        <div className="setting-block">
          <span className="setting-label">Forme du faisceau</span>
          <SegmentGroup options={BEAM_SHAPES} value={settings.lamp.forme} onChange={(forme) => updateLamp({ forme })} label="Forme du faisceau" />
        </div>
        <Range label="Portée de la lumière" value={settings.lamp.portee} min={20} max={100} display={`${settings.lamp.portee} %`} onChange={(portee) => updateLamp({ portee })} />
        <Range label="Angle du faisceau" value={settings.lamp.angle} min={60} max={120} display={`${settings.lamp.angle}°`} onChange={(angle) => updateLamp({ angle })} />
        <p className="section-note">Le faisceau naît de la pointe en T : il suit la capsule à chaque frappe et s’incline vers le centre de la feuille. Aucune lampe n’est dessinée.</p>
      </div>
    </div>
  )
}
