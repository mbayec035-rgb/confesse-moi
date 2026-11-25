import { PAPER_COLORS } from '../data.js'
import { Range, Swatches } from './controls.jsx'

export default function PaperSheet({ settings, updateSettings, onClose }) {
  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div className="sheet" onClick={(event) => event.stopPropagation()} role="dialog" aria-label="Papier et encre">
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div>
            <h2>Papier</h2>
            <p>La matière et l’encre de la page.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="setting-block">
          <span className="setting-label">Couleur du papier</span>
          <Swatches colors={PAPER_COLORS} value={settings.paperColor} onChange={(paperColor) => updateSettings({ paperColor })} label="papier" />
        </div>
        <Range label="Grain du papier" value={settings.grain} min={0} max={1} step={0.05} display={`${Math.round(settings.grain * 100)} %`} onChange={(grain) => updateSettings({ grain })} />
        <Range label="Intensité de l’encre" value={settings.inkIntensity} min={50} max={150} step={5} display={`${settings.inkIntensity} %`} onChange={(inkIntensity) => updateSettings({ inkIntensity })} />
        <Range label="Taille de police" value={settings.fontSize} min={11} max={22} display={`${settings.fontSize} px`} onChange={(fontSize) => updateSettings({ fontSize })} />
        <Range label="Interligne" value={settings.lineHeight} min={1.3} max={2} step={0.05} display={`${settings.lineHeight.toFixed(2)}×`} onChange={(lineHeight) => updateSettings({ lineHeight })} />
      </div>
    </div>
  )
}
