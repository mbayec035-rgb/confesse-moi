import { useEffect, useRef, useState } from 'react'
import PaperScene from './PaperScene.jsx'
import CapsulePicker from './CapsulePicker.jsx'
import CharmPicker from './CharmPicker.jsx'
import { BEAM_SHAPES, LAMP_COLORS, PAPER_COLORS, TYPING_MODES, TYPING_TYPES, getCapsule } from '../data.js'
import { Range, SegmentGroup, Swatches } from './controls.jsx'
import { playSound, unlockAudio } from '../sounds.js'

function Toggle({ checked, onChange, label, description }) {
  return (
    <button type="button" className={`lamp-switch ${checked ? 'on' : ''}`} onClick={onChange} aria-pressed={checked}>
      <span className="switch-knob" />
      <span><strong>{label}</strong>{description && <small>{description}</small>}</span>
    </button>
  )
}

export default function Settings({ settings, updateSettings, updateLamp, onExport, onImport, storageReady }) {
  const [sheet, setSheet] = useState(null)
  const [message, setMessage] = useState('')
  const [persisted, setPersisted] = useState(false)
  const fileRef = useRef(null)
  const capsule = getCapsule(settings.capsuleId)
  // « jour » = lumière allumée, comme dans l’écriture.
  const lampOn = settings.mode === 'jour'

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => {})
  }, [])

  useEffect(() => {
    if (!message) return undefined
    const timer = window.setTimeout(() => setMessage(''), 4000)
    return () => window.clearTimeout(timer)
  }, [message])

  function toggleCharm(id) {
    const next = settings.charms.includes(id)
      ? settings.charms.filter((charm) => charm !== id)
      : [...settings.charms, id]
    updateSettings({ charms: next })
  }

  function toggleLamp() {
    unlockAudio()
    playSound('lamp', settings)
    updateSettings({ mode: lampOn ? 'nuit' : 'jour' })
  }

  async function handleFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      await onImport(JSON.parse(await file.text()))
      setMessage('Tes notes ont été restaurées.')
    } catch (error) {
      setMessage(error.message || 'Import impossible.')
    }
    event.target.value = ''
  }

  const previewSettings = { ...settings, fontSize: 12, lineHeight: 1.5 }

  return (
    <main className={`screen settings-screen ${lampOn ? 'lamp-on' : 'lamp-off'}`}>
      <header className="app-header">
        <h1>Studio</h1>
        <p>Réglages de la page, du ruban, de la lampe et du son.</p>
      </header>

      <section className="settings-section">
        <h2>Aperçu</h2>
        <div className="preview-wrap">
          <PaperScene
            seed="apercu-studio"
            settings={previewSettings}
            lampOn={lampOn}
            grain={settings.grain}
            L={390}
            contextLines={[
              { index: 0, text: 'Confie-toi,' },
              { index: 1, text: 'la page t’attend.' },
            ]}
            activeLineIndex={2}
            activeLineText="Chaque mot reste ici."
            activeLineLength={22}
            lineCount={3}
            caretColumn={8}
          />
        </div>
      </section>

      <section className="settings-section">
        <h2>Mise en page et frappe</h2>
        <div className="setting-block">
          <span className="setting-label">Couleur du papier</span>
          <Swatches colors={PAPER_COLORS} value={settings.paperColor} onChange={(paperColor) => updateSettings({ paperColor })} label="papier" />
        </div>
        <Range label="Grain du papier" value={settings.grain} min={0} max={1} step={0.05} display={`${Math.round(settings.grain * 100)} %`} onChange={(grain) => updateSettings({ grain })} />
        <Range label="Intensité de l’encre" value={settings.inkIntensity} min={50} max={150} step={5} display={`${settings.inkIntensity} %`} onChange={(inkIntensity) => updateSettings({ inkIntensity })} />
        <Range label="Taille de police" value={settings.fontSize} min={11} max={22} display={`${settings.fontSize} px`} onChange={(fontSize) => updateSettings({ fontSize })} />
        <Range label="Interligne" value={settings.lineHeight} min={1.3} max={2} step={0.05} display={`${settings.lineHeight.toFixed(2)}×`} onChange={(lineHeight) => updateSettings({ lineHeight })} />
        <div className="setting-block">
          <span className="setting-label">Frappe</span>
          <SegmentGroup options={TYPING_MODES} value={settings.typingMode} onChange={(typingMode) => updateSettings({ typingMode })} label="Mode de frappe" />
        </div>
        <p className="section-note">Écraser remplace la lettre sous le T ; Insérer décale le texte à droite et recalcule les lignes.</p>
        <div className="setting-block">
          <span className="setting-label">Capsule (ruban)</span>
          <button type="button" className="setting-choice" onClick={() => setSheet('capsules')}>
            <span className="pill small" style={{ backgroundColor: capsule.couleur }} aria-hidden="true" />
            <span><strong>{capsule.nom}</strong><small>{capsule.thème} · {capsule.son.nom}</small></span>
            <span className="chevron">›</span>
          </button>
        </div>
        <Toggle checked={settings.patineRuban} onChange={() => updateSettings({ patineRuban: !settings.patineRuban })} label="Patiné ruban" description="Encre brune #2B1F1A" />
        <div className="setting-block">
          <span className="setting-label">Breloques</span>
          <button type="button" className="setting-choice" onClick={() => setSheet('charms')}>
            <span className="control-icon" aria-hidden="true">✦</span>
            <span><strong>{settings.charms.length ? `${settings.charms.length} breloque${settings.charms.length > 1 ? 's' : ''}` : 'Aucune breloque'}</strong><small>Étoile, clé, cœur</small></span>
            <span className="chevron">›</span>
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h2>Veilleuse</h2>
        <Toggle checked={lampOn} onChange={toggleLamp} label="Lampe allumée" description="Faisceau bleu-blanc sur la feuille" />
        <div className="setting-block">
          <span className="setting-label">Couleur de la lumière</span>
          <Swatches colors={LAMP_COLORS} value={settings.lamp.couleur} onChange={(couleur) => updateLamp({ couleur })} label="veilleuse" />
        </div>
        <Range label="Luminosité" value={settings.lamp.luminosite} min={0.1} max={1} step={0.05} display={`${Math.round(settings.lamp.luminosite * 100)} %`} onChange={(luminosite) => updateLamp({ luminosite })} />
        <Range label="Intensité de la couleur" value={settings.lamp.intensite} min={0} max={100} display={`${settings.lamp.intensite} %`} onChange={(intensite) => updateLamp({ intensite })} />
        <div className="setting-block">
          <span className="setting-label">Forme du faisceau</span>
          <SegmentGroup options={BEAM_SHAPES} value={settings.lamp.forme} onChange={(forme) => updateLamp({ forme })} label="Forme du faisceau" />
        </div>
        <Range label="Portée de la lumière" value={settings.lamp.portee} min={20} max={100} display={`${settings.lamp.portee} %`} onChange={(portee) => updateLamp({ portee })} />
        <Range label="Angle du faisceau" value={settings.lamp.angle} min={60} max={120} display={`${settings.lamp.angle}°`} onChange={(angle) => updateLamp({ angle })} />
        <p className="section-note">Le faisceau naît de la pointe en T : il suit la capsule et s’incline vers le centre de la feuille. Aucune lampe n’est dessinée.</p>
      </section>

      <section className="settings-section">
        <h2>Son et toucher</h2>
        <Toggle
          checked={settings.sound.active !== false}
          onChange={() => {
            const active = settings.sound.active === false
            unlockAudio()
            updateSettings({ sound: { ...settings.sound, active } })
            if (active) playSound('paper-tap', { ...settings, sound: { ...settings.sound, active } })
          }}
          label="Sons"
          description="Frisottis du papier et défilement"
        />
        <Range label="Volume" value={settings.sound.volume} min={0} max={1} step={0.05} display={`${Math.round(settings.sound.volume * 100)} %`} onChange={(volume) => updateSettings({ sound: { ...settings.sound, volume } })} />
        <div className="setting-block">
          <span className="setting-label">Type de frappe</span>
          <SegmentGroup options={TYPING_TYPES} value={settings.sound.type} onChange={(type) => { unlockAudio(); updateSettings({ sound: { ...settings.sound, type } }); playSound('key', { ...settings, sound: { ...settings.sound, type } }) }} label="Type de frappe" />
        </div>
        <Toggle checked={settings.sound.haptiques} onChange={() => updateSettings({ sound: { ...settings.sound, haptiques: !settings.sound.haptiques } })} label="Retours tactiles" description="navigator.vibrate si disponible" />
      </section>

      <section className="settings-section">
        <h2>Sauvegarde</h2>
        <p className="section-note">
          {storageReady
            ? `Notes enregistrées sur cet appareil${persisted ? ' · stockage protégé' : ''}.`
            : 'Stockage local indisponible sur ce navigateur.'}
        </p>
        <div className="backup-row">
          <button type="button" className="secondary-button" onClick={onExport}>Exporter en JSON</button>
          <button type="button" className="secondary-button" onClick={() => fileRef.current?.click()}>Importer</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={handleFile} />
        </div>
        {message && <p className="settings-message" role="status">{message}</p>}
      </section>

      <section className="settings-section help-section">
        <h2>Sur ton iPhone</h2>
        <p>Pour installer Confesse-moi sur l’écran d’accueil : <strong>Safari &gt; Partager &gt; Sur l’écran d’accueil</strong>. L’application s’ouvre ensuite plein écran et fonctionne sans réseau.</p>
      </section>

      <p className="settings-footer">Confesse-moi · tes mots restent les tiens.</p>

      {sheet === 'capsules' && (
        <CapsulePicker activeId={settings.capsuleId} onSelect={(id) => { updateSettings({ capsuleId: id }); setSheet(null) }} onClose={() => setSheet(null)} />
      )}
      {sheet === 'charms' && <CharmPicker selected={settings.charms} onToggle={toggleCharm} onClose={() => setSheet(null)} />}
    </main>
  )
}
