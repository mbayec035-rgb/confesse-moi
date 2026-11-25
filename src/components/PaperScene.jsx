import { forwardRef, memo, useImperativeHandle, useLayoutEffect, useRef } from 'react'
import { CHARMS } from '../data.js'
import { WRITER_COLS } from '../text.js'
import { getPaperTexture } from '../paperTexture.js'

function hash(seed, index) {
  let value = 2166136261 ^ index
  for (let cursor = 0; cursor < seed.length; cursor += 1) {
    value = Math.imul(value ^ seed.charCodeAt(cursor), 16777619)
  }
  return ((value >>> 0) % 100000) / 100000
}

function hexToRgb(hex) {
  const value = String(hex).replace('#', '')
  return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16))
}

function rgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// L’interligne se resserre vers le haut de la courbure : 4,5 % L à la ligne
// de frappe, ~2,8 % L à la huitième ligne.
function lineStepAt(distance, nearStep, farStep) {
  return nearStep + ((farStep - nearStep) * (distance - 1)) / 7
}

function lineOffsetAt(distance, nearStep, farStep) {
  const delta = (farStep - nearStep) / 7
  return distance * nearStep + delta * (distance * (distance - 1)) / 2
}

const PaperTexture = memo(function PaperTexture({ grain }) {
  const texture = getPaperTexture()
  return (
    <div
      className="paper-texture"
      style={{ backgroundImage: texture ? `url("${texture}")` : 'none', opacity: 0.72 + grain * 0.45 }}
      aria-hidden="true"
    />
  )
})

// Lignes déjà écrites : rendues une seule fois, mémorisées. Une frappe dans la
// ligne courante ne touche jamais ces nœuds.
const HistoryLines = memo(function HistoryLines({ lines, seed, inkColor, nearStep, farStep }) {
  const first = Math.max(0, lines.length - 8)
  const shown = lines.slice(first)
  return (
    <>
      {shown.map((text, index) => {
        const lineIndex = first + index
        const distance = shown.length - index
        // distance 1 = juste au-dessus de la pointe ; distance 8 = bord supérieur.
        const closeness = Math.max(0, Math.min(1, (8 - distance) / 7))
        const step = lineStepAt(distance, nearStep, farStep)
        const offset = lineOffsetAt(distance, nearStep, farStep)
        return (
          <div
            key={lineIndex}
            data-history-line={lineIndex}
            className="printed-line history-line"
            style={{
              color: inkColor,
              bottom: `${offset.toFixed(2)}px`,
              height: `${step.toFixed(2)}px`,
              lineHeight: `${step.toFixed(2)}px`,
              opacity: 0.35 + 0.65 * closeness,
              transform: `scale(${(0.88 + 0.12 * closeness).toFixed(3)})`,
              filter: `blur(${(1.5 * (1 - closeness)).toFixed(2)}px)`,
            }}
          >
            {Array.from(text).map((character, position) => {
              const base = lineIndex * WRITER_COLS + position
              return (
                <span
                  key={position}
                  className="printed-char"
                  style={{
                    opacity: 0.72 + hash(seed, base) * 0.28,
                    transform: `translate(${((hash(seed, base + 1) - 0.5) * 1).toFixed(2)}px, ${((hash(seed, base + 2) - 0.5) * 1).toFixed(2)}px) rotate(${((hash(seed, base + 3) - 0.5) * 1.6).toFixed(2)}deg)`,
                    fontWeight: hash(seed, base + 4) > 0.88 ? 700 : 400,
                  }}
                >
                  {character === ' ' ? '\u00a0' : character}
                </span>
              )
            })}
          </div>
        )
      })}
    </>
  )
})

// Ligne courante : son contenu est écrit directement dans le DOM par
// update(), sans re-render React du paragraphe à chaque touche.
const CurrentLine = memo(forwardRef(function CurrentLine({ inkColor }, ref) {
  const nodeRef = useRef(null)

  useImperativeHandle(ref, () => ({
    update(text, lineIndex, seedValue) {
      const node = nodeRef.current
      if (!node) return
      if (seedValue) node.dataset.seed = seedValue
      const signature = `${seedValue ?? node.dataset.seed ?? ''}|${lineIndex}|${text}`
      if (node.dataset.signature === signature) return
      node.dataset.signature = signature

      const fragment = document.createDocumentFragment()
      for (let position = 0; position < text.length; position += 1) {
        const character = text[position]
        const base = lineIndex * WRITER_COLS + position
        const span = document.createElement('span')
        span.className = 'printed-char'
        span.style.opacity = String(0.72 + hash(node.dataset.seed || '', base) * 0.28)
        span.style.transform = `translate(${((hash(node.dataset.seed || '', base + 1) - 0.5) * 1).toFixed(2)}px, ${((hash(node.dataset.seed || '', base + 2) - 0.5) * 1).toFixed(2)}px) rotate(${((hash(node.dataset.seed || '', base + 3) - 0.5) * 1.6).toFixed(2)}deg)`
        span.textContent = character === ' ' ? '\u00a0' : character
        fragment.appendChild(span)
      }
      node.replaceChildren(fragment)
    },
  }), [])

  return <div ref={nodeRef} className="printed-line current-line" style={{ color: inkColor, bottom: 0 }} />
}))

const PaperScene = forwardRef(function PaperScene({
  seed,
  settings,
  lampOn = false,
  grain = 0.5,
  historyLines = [],
  currentLine = '',
  currentLineIndex = 0,
  caretColumn = 0,
  L = 390,
  interactive = false,
  onToggleLamp,
  onMachineClick,
}, ref) {
  const stageRef = useRef(null)
  const linesRef = useRef(null)
  const currentLineRef = useRef(null)
  const flashRef = useRef(null)
  const pressTimer = useRef(null)
  const longPressed = useRef(false)
  const timers = useRef([])

  const lamp = settings.lamp
  const inkColor = settings.patineRuban ? '#2B1F1A' : '#1A1A1A'
  const paperColor = interactive ? '#3A3835' : settings.paperColor
  // Grille : colonne 2,66 % L, marge 21 % L, corps ~3,6 % L.
  const columnWidth = L * 0.0266
  const fontSize = interactive ? L * 0.036 : settings.fontSize
  const nearStep = interactive ? L * 0.045 : fontSize * Math.min(settings.lineHeight, 1.35)
  const farStep = interactive ? L * 0.028 : nearStep
  const heartCharm = CHARMS.find((charm) => charm.id === 'coeur')

  const carriagePx = caretColumn * columnWidth
  const beamPx = L * 0.21 + carriagePx
  const tilt = Math.max(-20, Math.min(20, ((L * 0.5 - beamPx) / L) * 35))

  // Ellipse large : ~92 % L de diamètre et ~9 % H de montée depuis la pointe.
  const rawSpread = 0.15 + ((lamp.angle - 60) / 60) * 0.09
  const spread = lamp.forme === 'spot'
    ? rawSpread * 0.6
    : lamp.forme === 'double' ? rawSpread * 1.12 : rawSpread
  const reach = 0.10 + (lamp.portee / 100) * 0.13
  const alpha = Math.min(0.95, (0.35 + lamp.luminosite * 0.55) * (0.5 + lamp.intensite / 200))

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    stage.style.setProperty('--carriage-x-px', `${carriagePx}px`)
    stage.style.setProperty('--beam-x-px', `${beamPx}px`)
    stage.style.setProperty('--beam-half-px', `${L * 1.1}px`)
    stage.style.setProperty('--tilt', `${tilt.toFixed(2)}deg`)
  }, [carriagePx, beamPx, tilt, L])

  useImperativeHandle(ref, () => ({
    updateCurrentLine(text, lineIndex, seedValue) {
      currentLineRef.current?.update(text, lineIndex, seedValue)
    },
    flash() {
      flashRef.current?.animate?.(
        [{ opacity: 0.95 }, { opacity: 0.6, offset: 0.25 }, { opacity: 0 }],
        { duration: 400, easing: 'ease-out' },
      )
    },
    setTyping(active) {
      stageRef.current?.classList.toggle('typing', Boolean(active))
    },
    beginNewLine() {
      const stage = stageRef.current
      const lines = linesRef.current
      if (!stage || !lines) return
      stage.classList.remove('returning')
      lines.classList.remove('rising')
      // Force la reprise des transitions GPU.
      void stage.offsetWidth
      stage.classList.add('returning')
      lines.classList.add('rising')
      timers.current.push(window.setTimeout(() => lines.classList.remove('rising'), 280))
      timers.current.push(window.setTimeout(() => stage.classList.remove('returning'), 320))
    },
  }), [])

  useLayoutEffect(() => () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current)
    timers.current.forEach((timer) => window.clearTimeout(timer))
  }, [])

  function capsulePointerDown() {
    if (!interactive) return
    longPressed.current = false
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true
      onToggleLamp?.()
    }, 520)
  }

  function capsulePointerUp() {
    if (pressTimer.current) window.clearTimeout(pressTimer.current)
    pressTimer.current = null
  }

  return (
    <div
      ref={stageRef}
      className={`writer-stage ${lampOn ? 'lamp-on' : ''}`}
      onClick={interactive ? onMachineClick : undefined}
      style={{
        '--paper-color': paperColor,
        '--ink-opacity': Math.max(0.5, Math.min(1.5, settings.inkIntensity / 100)),
        '--line-step': `${nearStep.toFixed(2)}px`,
        '--col-width': `${columnWidth.toFixed(2)}px`,
        '--beam-color': lamp.couleur,
        '--beam-spread': `${(spread * 100).toFixed(1)}%`,
        '--beam-reach': `${(reach * 100).toFixed(1)}%`,
        '--beam-alpha': alpha.toFixed(3),
        '--font-size': `${fontSize}px`,
      }}
    >
      <svg className="scene-defs" width="0" height="0" aria-hidden="true">
        <defs>
          <clipPath id="roll" clipPathUnits="objectBoundingBox">
            <path d="M0,1 L0,0.62 C0.01,0.35 0.05,0.12 0.13,0.03 Q0.16,0 0.20,0 L0.80,0 Q0.84,0 0.87,0.03 C0.95,0.12 0.99,0.35 1,0.62 L1,1 Z" />
          </clipPath>
          <filter id="confesse-ink" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.2" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <div className="paper-sheet paper">
        <div className="paper-ambient" aria-hidden="true" />
        {lampOn && (
          <div className="beam-layer" aria-hidden="true">
            <div
              className="beam-dark"
              style={{
                background: '#2A2926',
                WebkitMaskImage: `radial-gradient(ellipse var(--beam-spread) var(--beam-reach) at 50% 100%, transparent 0%, transparent 30%, rgba(0,0,0,.12) 56%, black 84%)`,
                maskImage: `radial-gradient(ellipse var(--beam-spread) var(--beam-reach) at 50% 100%, transparent 0%, transparent 30%, rgba(0,0,0,.12) 56%, black 84%)`,
              }}
            />
            <div
              className="beam-glow"
              style={{
                background: `radial-gradient(ellipse var(--beam-spread) var(--beam-reach) at 50% 100%, ${rgba('#E6F0FF', alpha)} 0%, ${rgba('#E6F0FF', alpha * 0.92)} 12%, ${rgba(lamp.couleur, alpha * 0.72)} 32%, ${rgba('#7FA3E0', alpha * 0.28)} 62%, transparent 86%)`,
              }}
            />
          </div>
        )}
        <PaperTexture grain={grain} />
        <div ref={linesRef} className="paper-lines">
          <HistoryLines
            lines={historyLines}
            seed={seed}
            inkColor={inkColor}
            nearStep={nearStep}
            farStep={farStep}
          />
          <CurrentLine ref={currentLineRef} inkColor={inkColor} />
        </div>
        {settings.charms.includes('coeur') && (
          <span className="paper-heart" style={{ color: heartCharm?.couleur }} aria-hidden="true">♥</span>
        )}
        <div className="paper-vignette" aria-hidden="true" />
      </div>

      {/* La même feuille continue sous le rail, plus sombre, jusqu’à la barre d’outils. */}
      <div className="paper-lower" aria-hidden="true">
        <PaperTexture grain={grain} />
        <div className="paper-lower-shade" />
      </div>

      {/* Rail fixe, centré à 44 % de H. Lampe dessinée : aucune. */}
      <div className="rail-track" aria-hidden="true">
        <span className="rail-cap left" />
        <span className="rail-cap right" />
      </div>

      {/* Capsule + pointe en T : la lumière naît du haut du T. */}
      <div className="carriage-anchor">
        <div className="rail-spill" aria-hidden="true" />
        <span className="tip-bar" aria-hidden="true" />
        <span className="tip-stem" aria-hidden="true" />
        <span ref={flashRef} className="type-flash" aria-hidden="true" />
        <button
          type="button"
          className="capsule-carriage"
          onPointerDown={capsulePointerDown}
          onPointerUp={capsulePointerUp}
          onPointerLeave={capsulePointerUp}
          onPointerCancel={capsulePointerUp}
          onClick={() => { if (!longPressed.current) onMachineClick?.() }}
          aria-label="Capsule — maintenir pour éteindre ou allumer la lumière"
        >
          <span className="voyant green" />
          <span className="voyant blue" />
          <span className="voyant red" />
        </button>
      </div>
    </div>
  )
})

export default memo(PaperScene)
