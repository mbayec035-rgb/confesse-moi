import { forwardRef, memo, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
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

// Lignes autour de la ligne visée : seules elles changent quand on change de
// ligne. Une frappe sur la ligne active ne touche jamais ces nœuds.
const ContextLines = memo(function ContextLines({ lines, activeLineIndex, seed, inkColor, nearStep, farStep }) {
  return (
    <>
      {lines.map(({ index, text }) => {
        const offset = index - activeLineIndex
        const distance = Math.abs(offset)
        const closeness = Math.max(0, Math.min(1, (8 - distance) / 7))
        const step = offset <= 0 ? lineStepAt(distance, nearStep, farStep) : nearStep
        const bottom = offset <= 0 ? lineOffsetAt(distance, nearStep, farStep) : -nearStep * offset
        return (
          <div
            key={index}
            data-line-index={index}
            className="printed-line context-line"
            style={{
              color: inkColor,
              bottom: `${bottom.toFixed(2)}px`,
              height: `${step.toFixed(2)}px`,
              lineHeight: `${step.toFixed(2)}px`,
              opacity: 0.35 + 0.65 * closeness,
              transform: `scale(${(0.88 + 0.12 * closeness).toFixed(3)})`,
              filter: `blur(${(1.5 * (1 - closeness)).toFixed(2)}px)`,
            }}
          >
            {Array.from(text).map((character, position) => {
              const base = index * WRITER_COLS + position
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

// Ligne visée : son contenu est écrit directement dans le DOM par update(),
// sans re-render React à chaque frappe. Le curseur est un calque séparé qui ne
// bouge que par transform.
const CurrentLine = memo(forwardRef(function CurrentLine({ inkColor }, ref) {
  const nodeRef = useRef(null)
  const caretRef = useRef(null)
  const activeSpanRef = useRef(null)

  useImperativeHandle(ref, () => {
    function placeCaret(column) {
      const node = nodeRef.current
      if (!node) return
      const spans = node.querySelectorAll('.printed-char')
      if (activeSpanRef.current) activeSpanRef.current.classList.remove('under-caret')
      const index = clamp(column, 0, Math.max(0, spans.length - 1))
      activeSpanRef.current = spans[index] ?? null
      activeSpanRef.current?.classList.add('under-caret')
      if (caretRef.current) {
        caretRef.current.style.transform = `translate3d(calc(var(--col-width) * ${index}), 0, 0)`
      }
    }

    return {
      update(text, lineIndex, seedValue, column = 0) {
        const node = nodeRef.current
        if (!node) return
        if (seedValue) node.dataset.seed = seedValue
        const signature = `${seedValue ?? node.dataset.seed ?? ''}|${lineIndex}|${text}`
        if (node.dataset.signature !== signature) {
          node.dataset.signature = signature
          const fragment = document.createDocumentFragment()
          for (let position = 0; position < text.length; position += 1) {
            const character = text[position]
            const base = lineIndex * WRITER_COLS + position
            const span = document.createElement('span')
            span.className = 'printed-char'
            span.style.opacity = String(0.72 + hash(node.dataset.seed || '', base) * 0.28)
            span.style.transform = `translate(${((hash(node.dataset.seed || '', base + 1) - 0.5) * 1).toFixed(2)}px, ${((hash(node.dataset.seed || '', base + 2) - 0.5) * 1).toFixed(2)}px) rotate(${((hash(node.dataset.seed || '', base + 3) - 0.5) * 1.6).toFixed(2)}deg)`
            // Trait plus épais sur la ligne de frappe : l’encre reste nette
            // même avec le calque en multiply.
            span.style.fontWeight = '700'
            span.textContent = character === ' ' ? '\u00a0' : character
            fragment.appendChild(span)
          }
          node.replaceChildren(fragment)
          activeSpanRef.current = null
        }
        placeCaret(column)
      },
      setCaret(column) {
        placeCaret(column)
      },
    }
  }, [])

  return (
    <div className="current-line-wrap">
      <div ref={nodeRef} className="printed-line current-line" style={{ color: inkColor }} />
      <span ref={caretRef} className="caret-cell" aria-hidden="true" />
    </div>
  )
}))

const PaperScene = forwardRef(function PaperScene({
  seed,
  settings,
  lampOn = false,
  grain = 0.5,
  contextLines = [],
  activeLineIndex = 0,
  activeLineText = '',
  activeLineLength = 0,
  caretColumn = 0,
  lineCount = 1,
  L = 390,
  interactive = false,
  onToggleLamp,
  onMachineClick,
  onSelectCell,
  onGoToEnd,
  onKeepFocus,
}, ref) {
  const stageRef = useRef(null)
  const paperRef = useRef(null)
  const linesRef = useRef(null)
  const currentLineRef = useRef(null)
  const flashRef = useRef(null)
  const pressTimer = useRef(null)
  const tapTimer = useRef(null)
  const longPressed = useRef(false)
  const dragRef = useRef(null)
  const capXRef = useRef(0)
  const timers = useRef([])
  const [dragging, setDragging] = useState(false)

  const lamp = settings.lamp
  // Encre quasi noire : dans le faisceau, le contraste est maximal sur le
  // papier bleu clair. L’aperçu des Réglages garde l’encre paramétrée.
  const inkColor = interactive
    ? '#15110F'
    : settings.patineRuban ? '#2B1F1A' : '#1A1A1A'
  // Hors faisceau, le papier reste sombre comme sur la référence.
  const paperColor = interactive ? '#2F2D2A' : settings.paperColor
  // Grille : colonne 2,66 % L, marge 21 % L, corps ~3,6 % L.
  const columnWidth = L * 0.0266
  const fontSize = interactive ? L * 0.036 : settings.fontSize
  const nearStep = interactive ? L * 0.045 : fontSize * Math.min(settings.lineHeight, 1.35)
  const farStep = interactive ? L * 0.028 : nearStep
  const heartCharm = CHARMS.find((charm) => charm.id === 'coeur')

  // Le T se cale toujours sur une lettre existante ; en fin de ligne, il
  // reste sous la dernière plutôt que de partir dans le vide.
  const maxColumn = Math.max(0, activeLineLength - 1)
  const typedColumn = activeLineLength > 0
    ? Math.min(caretColumn, maxColumn)
    : caretColumn
  // X du chariot : position ABSOLUE dans la scène, centre de la cellule visée.
  // Le faisceau, frère du chariot, lit la même variable --cap-x.
  const columnCenter = (column) => L * 0.21 + (column + 0.5) * columnWidth
  const minX = columnCenter(0)
  const maxX = columnCenter(maxColumn)
  const tiltFor = (x) => clamp(((L * 0.5 - x) / L) * 35, -20, 20)

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    // Grille d’écriture : sans ces variables, les cellules n’ont aucune
    // largeur et le T ne peut pas se placer sous la lettre visée.
    stage.style.setProperty('--paper-color', paperColor)
    stage.style.setProperty('--col-width', `${columnWidth.toFixed(2)}px`)
    stage.style.setProperty('--line-step', `${nearStep.toFixed(2)}px`)
    stage.style.setProperty('--font-size', `${fontSize.toFixed(2)}px`)
    stage.style.setProperty('--beam-color', lamp.couleur)
    // Pendant un glissement, seule la position continue pilotée par le doigt
    // compte : une frappe ne doit jamais écraser le chariot.
    if (!dragRef.current) {
      const x = columnCenter(typedColumn)
      capXRef.current = x
      stage.style.setProperty('--cap-x', `${x.toFixed(2)}px`)
      stage.style.setProperty('--tilt', `${tiltFor(x).toFixed(2)}deg`)
    }
  }, [typedColumn, columnWidth, L, nearStep, fontSize, lamp.couleur, paperColor])

  useImperativeHandle(ref, () => ({
    updateCurrentLine(text, lineIndex, seedValue, column) {
      currentLineRef.current?.update(text, lineIndex, seedValue, column)
    },
    setCaret(column) {
      currentLineRef.current?.setCaret(column)
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
      lines.classList.remove('rising', 'rolling-forward', 'rolling-back')
      void stage.offsetWidth
      stage.classList.add('returning')
      lines.classList.add('rising')
      timers.current.push(window.setTimeout(() => lines.classList.remove('rising'), 280))
      timers.current.push(window.setTimeout(() => stage.classList.remove('returning'), 320))
    },
    scrollLines(direction) {
      const lines = linesRef.current
      if (!lines) return
      const className = direction > 0 ? 'rolling-forward' : 'rolling-back'
      lines.classList.remove('rolling-forward', 'rolling-back')
      void lines.offsetWidth
      lines.classList.add(className)
      timers.current.push(window.setTimeout(() => lines.classList.remove(className), 240))
    },
  }), [])

  useLayoutEffect(() => () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current)
    if (tapTimer.current) window.clearTimeout(tapTimer.current)
    timers.current.forEach((timer) => window.clearTimeout(timer))
  }, [])

  // Une seule variable pilote le chariot : capsule, T et faisceau bougent
  // ensemble. Le rail, lui, n’a aucun transform.
  function setCapX(x) {
    const stage = stageRef.current
    if (!stage) return
    capXRef.current = x
    stage.style.setProperty('--cap-x', `${x.toFixed(2)}px`)
    stage.style.setProperty('--tilt', `${tiltFor(x).toFixed(2)}deg`)
  }

  function startHorizontalDrag(event) {
    if (!interactive) return
    event.preventDefault()
    event.stopPropagation()
    onKeepFocus?.()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    dragRef.current = {
      type: 'horizontal',
      pointerId: event.pointerId,
      startX: event.clientX,
      startCapX: capXRef.current,
      lastColumn: typedColumn,
      moved: false,
    }
    stageRef.current?.classList.add('dragging-capsule')
    setDragging(true)
  }

  function moveHorizontalDrag(event) {
    const drag = dragRef.current
    if (!drag || drag.type !== 'horizontal' || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    const x = clamp(drag.startCapX + event.clientX - drag.startX, minX, maxX)
    setCapX(x)
    const column = clamp(Math.round((x - L * 0.21) / columnWidth - 0.5), 0, maxColumn)
    if (column !== drag.lastColumn) {
      drag.lastColumn = column
      drag.moved = true
      if (settings.sound?.haptiques !== false) navigator.vibrate?.(4)
      onSelectCell?.(activeLineIndex, column)
    }
  }

  function endHorizontalDrag(event) {
    const drag = dragRef.current
    if (!drag || drag.type !== 'horizontal' || drag.pointerId !== event.pointerId) return false
    event.preventDefault()
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    const wasMoved = drag.moved
    const column = drag.lastColumn
    dragRef.current = null
    // On réactive la transition avant de caler la colonne : le retour au
    // centre est animé, pas le suivi du doigt.
    stageRef.current?.classList.remove('dragging-capsule')
    setDragging(false)
    setCapX(columnCenter(column))
    onKeepFocus?.()
    return wasMoved
  }

  function startPaperPointer(event) {
    if (!interactive) return
    event.preventDefault()
    onKeepFocus?.()
    paperRef.current?.setPointerCapture?.(event.pointerId)
    dragRef.current = {
      type: 'paper',
      pointerId: event.pointerId,
      startY: event.clientY,
      startLine: activeLineIndex,
      column: typedColumn,
      appliedSteps: 0,
      moved: false,
    }
  }

  function movePaperPointer(event) {
    const drag = dragRef.current
    if (!drag || drag.type !== 'paper' || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    const total = event.clientY - drag.startY
    if (Math.abs(total) > 6) drag.moved = true
    const steps = Math.trunc(total / nearStep)
    if (steps !== drag.appliedSteps) {
      drag.appliedSteps = steps
      const target = clamp(drag.startLine - steps, 0, lineCount - 1)
      if (target !== activeLineIndex) {
        drag.moved = true
        onSelectCell?.(target, drag.column)
      }
    }
    const fraction = clamp(total - steps * nearStep, -nearStep, nearStep)
    stageRef.current?.style.setProperty('--paper-shift', `${fraction.toFixed(1)}px`)
  }

  function selectFromPoint(event) {
    const stage = stageRef.current
    const lines = linesRef.current
    if (!stage || !lines) return
    const stageRect = stage.getBoundingClientRect()
    const linesRect = lines.getBoundingClientRect()
    const rawColumn = (event.clientX - stageRect.left - L * 0.21) / columnWidth
    const column = clamp(Math.round(rawColumn), 0, WRITER_COLS - 1)
    let bestOffset = 0
    let bestDistance = Infinity
    for (let offset = -8; offset <= 4; offset += 1) {
      const lineIndex = activeLineIndex + offset
      if (lineIndex < 0 || lineIndex >= lineCount) continue
      const distance = Math.abs(offset)
      const bottomY = linesRect.bottom + (offset <= 0 ? lineOffsetAt(distance, nearStep, farStep) : -nearStep * offset)
      const difference = Math.abs(bottomY - event.clientY)
      if (difference < bestDistance) {
        bestDistance = difference
        bestOffset = offset
      }
    }
    onSelectCell?.(clamp(activeLineIndex + bestOffset, 0, lineCount - 1), column)
  }

  function endPaperPointer(event) {
    const drag = dragRef.current
    if (!drag || drag.type !== 'paper' || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    paperRef.current?.releasePointerCapture?.(event.pointerId)
    stageRef.current?.style.setProperty('--paper-shift', '0px')
    dragRef.current = null
    onKeepFocus?.()
    if (!drag.moved && Math.abs(event.clientY - drag.startY) < 8) selectFromPoint(event)
  }

  function capsulePointerDown(event) {
    if (!interactive) return
    longPressed.current = false
    startHorizontalDrag(event)
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true
      onToggleLamp?.()
    }, 520)
  }

  function capsulePointerUp(event) {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    const wasMoved = endHorizontalDrag(event)
    if (longPressed.current || wasMoved) {
      longPressed.current = false
      return
    }
    const now = Date.now()
    if (tapTimer.current) {
      window.clearTimeout(tapTimer.current)
      tapTimer.current = null
      onGoToEnd?.()
      return
    }
    tapTimer.current = window.setTimeout(() => {
      tapTimer.current = null
      onMachineClick?.()
    }, 320)
  }

  function capsulePointerCancel(event) {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    endHorizontalDrag(event)
    longPressed.current = false
  }

  return (
    <div ref={stageRef} className={`writer-stage ${lampOn ? 'lamp-on' : ''}`}>
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

      <div
        ref={paperRef}
        className="paper-sheet paper"
        onPointerDown={interactive ? startPaperPointer : undefined}
        onPointerMove={interactive ? movePaperPointer : undefined}
        onPointerUp={interactive ? endPaperPointer : undefined}
        onPointerCancel={interactive ? endPaperPointer : undefined}
      >
        <div className="paper-ambient" aria-hidden="true" />
        <PaperTexture grain={grain} />
        {settings.charms.includes('coeur') && (
          <span className="paper-heart" style={{ color: heartCharm?.couleur }} aria-hidden="true">♥</span>
        )}
        <div className="paper-vignette" aria-hidden="true" />
      </div>

      {/* Le texte est un calque au-dessus du chariot : la pointe en T et la
          lumière passent derrière les lettres, même pendant la frappe. */}
      <div ref={linesRef} className="paper-lines">
        <ContextLines
          lines={contextLines}
          activeLineIndex={activeLineIndex}
          seed={seed}
          inkColor={inkColor}
          nearStep={nearStep}
          farStep={farStep}
        />
        <CurrentLine ref={currentLineRef} inkColor={inkColor} />
      </div>

      {/* La même feuille continue sous le rail, plus sombre, jusqu’à la barre d’outils. */}
      <div className="paper-lower" aria-hidden="true">
        <PaperTexture grain={grain} />
        <div className="paper-lower-shade" />
      </div>

      {/* 2) Faisceau : FRÈRE du chariot, jamais son enfant. Il lit --cap-x. */}
      {lampOn && <div className="beam-layer" aria-hidden="true" />}

      {/* 4) Rail fixe, puis chariot : la pointe est sous la ligne de frappe. */}
      <div className="rail-track" aria-hidden="true">
        <span className="rail-cap left" />
        <span className="rail-cap right" />
      </div>
      <div className={`chariot ${dragging ? 'dragging' : ''}`}>
        <div className="carriage-anchor" aria-hidden="true">
          <span className="tip-stem" />
          <span className="tip-bar" />
          <span ref={flashRef} className="type-flash" />
        </div>

        <button
          type="button"
          className="capsule-carriage"
          onPointerDown={interactive ? capsulePointerDown : undefined}
          onPointerMove={interactive ? moveHorizontalDrag : undefined}
          onPointerUp={interactive ? capsulePointerUp : undefined}
          onPointerCancel={interactive ? capsulePointerCancel : undefined}
          aria-label="Capsule — glisser pour choisir la lettre, maintenir pour la lumière, double appui pour la fin"
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
