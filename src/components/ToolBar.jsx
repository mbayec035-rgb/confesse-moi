import { useEffect, useRef } from 'react'

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }

function Icon({ id }) {
  if (id === 'boite') return <svg viewBox="0 0 24 24" {...stroke}><path d="M3 10a6 6 0 0 1 6-6h6a6 6 0 0 1 6 6v7H3z" /><path d="M3 13h18M9 17v3h6v-3" /><circle cx="17" cy="10" r="1.2" /></svg>
  if (id === 'jardin') return <svg viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="2.5" /><path d="M12 9.5c-1-3-4-4.5-6-3s-1 5 2 6c2 .7 4 .3 4-3zM14.5 12c3-1 4.5-4 3-6s-5-1-6 2c-.7 2-.3 4 3 4zM12 14.5c1 3 4 4.5 6 3s1-5-2-6c-2-.7-4-.3-4 3zM9.5 12c-3 1-4.5 4-3 6s5 1 6-2c.7-2 .3-4-3-4z" /></svg>
  if (id === 'papier') return <svg viewBox="0 0 24 24" {...stroke}><path d="M5 4h11l3 3v13H5z" /><path d="M16 4v4h3M8 12h8M8 16h6" /></svg>
  if (id === 'ruban') return <svg viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.5" /><path d="M12 5v4.5M19 12h-4.5M12 19v-4.5M5 12h4.5" /></svg>
  if (id === 'lampe') return <svg viewBox="0 0 24 24" {...stroke}><path d="M6 21v-8a6 6 0 0 1 12 0v8" /><path d="M10 21v-7a2 2 0 0 1 4 0M9 4 7 2M15 4l2-2M12 2v2" /></svg>
  return <svg viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2" /><path d="M12 4v3M12 17v3M4 12h3M17 12h3" /><path d="m12 12 3-3" /></svg>
}

const TOOLS = [
  { id: 'boite', label: 'Boîte' },
  { id: 'jardin', label: 'Autocollants' },
  { id: 'papier', label: 'Papier et encre' },
  { id: 'ruban', label: 'Ruban et encre' },
  { id: 'lampe', label: 'Veilleuse' },
]

export default function ToolBar({ collapsed, onToggleCollapse, activeTool, lampOn, onTool, onLampToggle, onLampSettings }) {
  // Le clic bascule la lampe ; le double-clic ouvre les réglages. On retarde
  // le clic pour pouvoir l’annuler quand le double-clic arrive.
  const lampTimer = useRef(null)
  useEffect(() => () => {
    if (lampTimer.current) window.clearTimeout(lampTimer.current)
  }, [])

  function scheduleLamp() {
    if (lampTimer.current) window.clearTimeout(lampTimer.current)
    lampTimer.current = window.setTimeout(() => {
      lampTimer.current = null
      onLampToggle?.()
    }, 260)
  }

  function openLampSettings() {
    if (lampTimer.current) {
      window.clearTimeout(lampTimer.current)
      lampTimer.current = null
    }
    onLampSettings?.()
  }

  return (
    <nav className={`tool-pill ${collapsed ? 'collapsed' : ''}`} aria-label="Outils d’écriture">
      <button
        type="button"
        className="tool-icon chevron-button"
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Déplier la barre d’outils' : 'Replier la barre d’outils'}
        aria-expanded={!collapsed}
      >
        <svg viewBox="0 0 24 24" {...stroke}><path d="m9 5 7 7-7 7" /></svg>
      </button>
      {!collapsed && (
        <div className="tool-icons">
          {TOOLS.map((tool) => {
            const isLamp = tool.id === 'lampe'
            return (
              <button
                type="button"
                key={tool.id}
                className={`tool-icon ${activeTool === tool.id || (isLamp && lampOn) ? 'active' : ''}`}
                onClick={() => (isLamp ? scheduleLamp() : onTool(tool.id))}
                onDoubleClick={isLamp ? (event) => { event.preventDefault(); openLampSettings() } : undefined}
                aria-label={tool.label}
                aria-pressed={isLamp ? lampOn : undefined}
                title={isLamp ? `${lampOn ? 'Éteindre' : 'Allumer'} la veilleuse · double-clic : réglages` : tool.label}
              >
                <Icon id={tool.id} />
              </button>
            )
          })}
          <span className="tool-separator" aria-hidden="true" />
          <button
            type="button"
            className={`tool-icon ${activeTool === 'studio' ? 'active' : ''}`}
            onClick={() => onTool('studio')}
            aria-label="Studio et réglages"
            title="Studio et réglages"
          >
            <Icon id="studio" />
          </button>
        </div>
      )}
    </nav>
  )
}
