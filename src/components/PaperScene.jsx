import { forwardRef, memo, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { CHARMS, DEFAULT_SETTINGS, getSticker } from '../data.js'
import { WRITER_COLS } from '../text.js'
import { getPaperTexture } from '../paperTexture.js'

// Bloc de texte à 55 % de L, centré : marge 22,5 %, colonne 2,2 % (55 / 25).
const GRID_LEFT = 0.225
const GRID_COL = 0.022
// Le papier commence à se replier quand on quitte la 8e ligne ; la 9e est la
// dernière lignée rendue, celle qui glisse sous le rabat.
const ROLL_START = 8
const ROLL_DEPTH = 9

function hash(seed, index) {
  let value = 2166136261 ^ index
  for (let cursor = 0; cursor < seed.length; cursor += 1) {
    value = Math.imul(value ^ seed.charCodeAt(cursor), 16777619)
  }
  return ((value >>> 0) % 100000) / 100000
}

// L’irrégularité d’encrage est tirée une seule fois par lettre, puis stockée :
// le même coup de tampon sert à chaque rendu, sans recalcul au scroll ni au toucher.
const inkCache = new Map()
function inkFor(seed, base) {
  const key = `${seed}|${base}`
  let ink = inkCache.get(key)
  if (!ink) {
    ink = {
      opacity: 0.72 + hash(seed, base) * 0.28,
      dx: (hash(seed, base + 1) - 0.5) * 1,
      dy: (hash(seed, base + 2) - 0.5) * 1,
      rotation: (hash(seed, base + 3) - 0.5) * 1.6,
    }
    inkCache.set(key, ink)
  }
  return ink
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function toRgb(hex) {
  const value = String(hex).replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(value)) return [0, 0, 0]
  return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16))
}

function toHex(channels) {
  return '#' + channels.map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0')).join('')
}

// Applique à une couleur l’écart entre deux réglages : avec la valeur par
// défaut, l’écart est nul et l’aspect reste exactement celui de référence.
function shiftColor(hex, reference, target) {
  const color = toRgb(hex)
  const from = toRgb(reference)
  const to = toRgb(target)
  return toHex(color.map((value, index) => value + to[index] - from[index]))
}

function boostColor(hex, amount) {
  return toHex(toRgb(hex).map((value) => (amount >= 0 ? value + (255 - value) * amount : value * (1 + amount))))
}

function rgba(hex, alpha) {
  const [r, g, b] = toRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// 100 % = couleur de référence ; 50 % l’éclaircit, 150 % l’assombrit.
function inkWithIntensity(hex, intensity) {
  const factor = clamp(intensity / 100, 0.3, 2)
  return toHex(toRgb(hex).map((value) => 255 - (255 - value) * factor))
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

// Distance écran : positive au-dessus du T, négative en dessous. `scroll`
// compte les lignes remontées ; à 0, on retrouve exactement le pli d’origine.
function lineMetrics(index, activeLineIndex, scroll, nearStep, farStep) {
  const distance = activeLineIndex - index - scroll
  const above = distance >= 0
  const fold = clamp(distance, 0, ROLL_DEPTH)
  const closeness = above
    ? clamp((ROLL_DEPTH - distance) / (ROLL_DEPTH - 1), 0, 1)
    : 1
  const flatten = 1 - closeness
  // Sous la première ligne au-dessus du rail, l’interligne reste celui de
  // frappe : sans ce plancher, la formule extrapolait ~1,4 px de plus sur la
  // ligne exactement sous le T et décalait les lignes voisines.
  const step = above ? lineStepAt(Math.max(1, fold), nearStep, farStep) : nearStep
  const bottom = above ? lineOffsetAt(fold, nearStep, farStep) : nearStep * distance
  return { flatten, step, bottom }
}

const PaperTexture = memo(function PaperTexture({ grain, lampOn = true }) {
  const texture = getPaperTexture()
  // Le papier clair reste légèrement grainé, sans devenir sale.
  const opacity = lampOn ? 0.72 + grain * 0.45 : 0.18 + grain * 0.16
  return (
    <div
      className="paper-texture"
      style={{ backgroundImage: texture ? `url("${texture}")` : 'none', opacity }}
      aria-hidden="true"
    />
  )
})

// Lignes autour de la ligne visée : seules elles changent quand on change de
// ligne. Une frappe sur la ligne active ne touche jamais ces nœuds.
const ContextLines = memo(function ContextLines({ lines, activeLineIndex, scroll, seed, inkColor, nearStep, farStep }) {
  return (
    <>
      {lines.map(({ index, text }) => {
        // Seules les lignes au-dessus du T suivent le cylindre. Celles qui
        // sont déjà en bas de la feuille restent droites et nettes.
        const { flatten, step, bottom } = lineMetrics(index, activeLineIndex, scroll, nearStep, farStep)
        // Aplatissement vertical seul : de 1 en bas à 0,4 sur le rouleau.
        const scaleY = 1 - 0.6 * flatten
        const bow = 4 * flatten
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
              opacity: 1 - 0.75 * flatten,
              transform: `scaleY(${scaleY.toFixed(3)})`,
              filter: `blur(${(0.2 + 0.9 * flatten).toFixed(2)}px)`,
            }}
          >
            {Array.from(text).map((character, position) => {
              const base = index * WRITER_COLS + position
              const ink = inkFor(seed, base)
              // Le centre de la ligne remonte, les bords redescendent : les
              // lignes du haut épousent la courbure du rouleau.
              const curve = bow * (((position - (WRITER_COLS - 1) / 2) / ((WRITER_COLS - 1) / 2)) ** 2 - 0.5)
              return (
                <span
                  key={position}
                  className="printed-char"
                  style={{
                    opacity: ink.opacity,
                    transform: `translate(${ink.dx.toFixed(2)}px, ${ink.dy.toFixed(2)}px) rotate(${ink.rotation.toFixed(2)}deg) translateY(${curve.toFixed(2)}px)`,
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

const Sticker = memo(function Sticker({ sticker, index, activeLineIndex, scroll, nearStep, farStep, lit, onRemove, onKeepFocus }) {
  const timer = useRef(null)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  function stop() {
    if (timer.current) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }

  function start(event) {
    event.preventDefault()
    event.stopPropagation()
    onKeepFocus?.()
    stop()
    timer.current = window.setTimeout(() => {
      timer.current = null
      onRemove(index)
    }, 500)
  }

  const art = getSticker(sticker.id)
  const { flatten, step, bottom } = lineMetrics(sticker.ligne, activeLineIndex, scroll, nearStep, farStep)
  const scaleY = 1 - 0.6 * flatten
  const opacity = (1 - 0.75 * flatten) * 0.9
  const blur = 0.2 + 0.9 * flatten
  const rotation = Number(sticker.rotation) || 0
  return (
    <button
      type="button"
      className="sticker"
      data-sticker-id={sticker.id}
      data-sticker-line={sticker.ligne}
      aria-label={`Retirer ${art.label}`}
      title={`${art.label} · appui long pour retirer`}
      style={{
        bottom: `${bottom.toFixed(2)}px`,
        height: `${step.toFixed(2)}px`,
        transform: `scaleY(${scaleY.toFixed(3)}) rotate(${rotation}deg)`,
        opacity: opacity.toFixed(3),
        filter: `blur(${blur.toFixed(2)}px) drop-shadow(0 1px 1px rgba(0,0,0,.28))${lit ? '' : ' brightness(0)'}`,
      }}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => { event.preventDefault(); event.stopPropagation() }}
    >
      <img src={art.image} alt="" draggable="false" />
    </button>
  )
})

// Ligne visée : son contenu est écrit directement dans le DOM par update(),
// sans re-render React à chaque frappe. Le curseur est un calque séparé qui ne
// bouge que par transform.
const CurrentLine = memo(forwardRef(function CurrentLine({ inkColor, bottom = 0 }, ref) {
  const nodeRef = useRef(null)
  const caretRef = useRef(null)

  useImperativeHandle(ref, () => {
    // Un column négatif masque le T : pendant le défilement, la ligne sous le
    // rail n’est pas celle où se trouve réellement le curseur.
    function placeCaret(column) {
      const node = nodeRef.current
      if (!node) return
      const spans = node.querySelectorAll('.printed-char')
      const visible = column >= 0
      const index = clamp(visible ? column : 0, 0, Math.max(0, spans.length - 1))
      if (caretRef.current) {
        caretRef.current.style.opacity = visible ? '' : '0'
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
            const ink = inkFor(node.dataset.seed || '', base)
            const span = document.createElement('span')
            span.className = 'printed-char'
            span.style.opacity = String(ink.opacity)
            span.style.transform = `translate(${ink.dx.toFixed(2)}px, ${ink.dy.toFixed(2)}px) rotate(${ink.rotation.toFixed(2)}deg)`
            span.textContent = character === ' ' ? '\u00a0' : character
            fragment.appendChild(span)
          }
          node.replaceChildren(fragment)
        }
        placeCaret(column)
      },
      setCaret(column) {
        placeCaret(column)
      },
    }
  }, [])

  return (
    <div className="current-line-wrap" style={{ bottom: `${bottom.toFixed(2)}px` }}>
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
  stickers = [],
  onRemoveSticker,
  scroll = 0,
  onScrollBy,
  onScrollEnd,
  onWordTap,
  activeLineIndex = 0,
  activeLineText = '',
  activeLineLength = 0,
  caretColumn = 0,
  lineCount = 1,
  L = 390,
  H = 844,
  interactive = false,
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
  const tapTimer = useRef(null)
  const dragRef = useRef(null)
  const capXRef = useRef(0)
  const timers = useRef([])
  const wheelHandlers = useRef({ by: onScrollBy, end: onScrollEnd })
  wheelHandlers.current = { by: onScrollBy, end: onScrollEnd }
  const wheelTimer = useRef(null)
  const wheelVelocity = useRef(0)
  const [dragging, setDragging] = useState(false)

  const lamp = settings.lamp
  const defaults = DEFAULT_SETTINGS
  // ON : encre quasi noire, invisible hors du faisceau sur papier anthracite.
  // OFF : noir franc sur papier crème. Les réglages restent des écarts relatifs.
  const inkBase = settings.patineRuban ? '#2B1F1A' : lampOn ? '#101010' : '#000000'
  const inkColor = interactive
    ? inkWithIntensity(inkBase, settings.inkIntensity)
    : lampOn ? '#101010' : '#000000'
  const paperReference = lampOn ? '#3A3A3A' : '#E9E4D4'
  const paperColor = interactive
    ? shiftColor(settings.paperColor, defaults.paperColor, paperReference)
    : paperReference
  // Grille : 25 colonnes à 2,2 % L dans un bloc de 55 % L centré ; police ~3 % L.
  const columnWidth = L * GRID_COL
  const lineScale = settings.lineHeight / defaults.lineHeight
  const baseFont = interactive
    ? L * 0.03 * (settings.fontSize / defaults.fontSize)
    : settings.fontSize
  // Interligne : 4,6 % L à la ligne de frappe, 2 % L sur le rouleau.
  const baseNear = interactive ? L * 0.046 * lineScale : baseFont * Math.min(settings.lineHeight, 1.35)
  const baseFar = interactive ? L * 0.02 * lineScale : baseNear
  // La ligne active est à 14 % L au-dessus du centre du rail (41,7 % H + 5,25 % L).
  // Sur les écrans larges, L peut être bien plus grand que H : on resserre alors
  // les pas pour que les 9 lignes tiennent toujours avant le rouleau.
  const typingY = H * 0.417 + L * 0.0525 - L * 0.14
  const available = typingY - H * 0.19 - 4
  const stack = lineOffsetAt(ROLL_DEPTH, baseNear, baseFar)
  const fit = interactive
    ? clamp(available / Math.max(stack, 1), 0.55, 1)
    : 1
  const fontSize = baseFont * fit
  const nearStep = baseNear * fit
  const farStep = baseFar * fit
  // Le rabat suit la plus haute ligne réellement dessinée, quelle que soit
  // la hauteur d’écran : la ligne sortante passe toujours derrière.
  const visibleStack = stack * fit

  // Faisceau en V contenu dans la feuille : du T au bord haut du papier.
  // À 78°, la boîte mesure 1,6 × sa hauteur ; les réglages restent des écarts.
  const lampRef = defaults.lamp
  const shapeFactor = lamp.forme === 'spot' ? 0.62 : lamp.forme === 'double' ? 1.15 : 1
  const angleFactor = clamp(lamp.angle / lampRef.angle, 0.5, 1.6)
  const rangeFactor = clamp(lamp.portee / lampRef.portee, 0.25, 1.8)
  const lampBoost = clamp(
    (lamp.luminosite / lampRef.luminosite - 1) * 0.5 + (lamp.intensite / lampRef.intensite - 1) * 0.25,
    -0.9,
    0.6,
  )
  const beamBase = shiftColor('#BCD4FF', lampRef.couleur, lamp.couleur)
  const beamRgb = toRgb(boostColor(beamBase, lampBoost)).join(', ')
  const beamOpacity = clamp(
    (lamp.luminosite / lampRef.luminosite) * (lamp.intensite / lampRef.intensite),
    0,
    1,
  )
  const beamSpread = 78 * shapeFactor * angleFactor
  const beamWidthRatio = 1.6 * Math.tan((beamSpread / 2) * Math.PI / 180) / Math.tan(39 * Math.PI / 180)
  // Haut du T (41,7 % H - 6,55 % L) moins haut du papier (19 % H).
  const beamHeight = Math.max(0, H * (0.417 - 0.19) - L * 0.0655)
  const beamWidth = beamHeight * beamWidthRatio
  const beamMid = Math.round(clamp(50 / Math.sqrt(rangeFactor), 34, 66))
  const heartCharm = CHARMS.find((charm) => charm.id === 'coeur')

  // Le T se cale toujours sur une lettre existante ; en fin de ligne, il
  // reste sous la dernière plutôt que de partir dans le vide.
  const maxColumn = Math.max(0, activeLineLength - 1)
  const typedColumn = activeLineLength > 0
    ? Math.min(caretColumn, maxColumn)
    : caretColumn
  // X du chariot : position ABSOLUE dans la scène, centre de la cellule visée.
  // Le faisceau, frère du chariot, lit la même variable --cap-x.
  const columnCenter = (column) => L * GRID_LEFT + (column + 0.5) * columnWidth
  const minX = columnCenter(0)
  const maxX = columnCenter(maxColumn)
  const tiltFor = (x) => clamp(((L * 0.5 - x) / L) * 35, -20, 20)
  const capX = columnCenter(typedColumn)
  const beamTilt = tiltFor(capX) * angleFactor
  const tipY = H * 0.19 + beamHeight
  const stickerX = L * 0.135

  function stickerIsLit(lineIndex) {
    if (!lampOn || !beamHeight) return true
    const { step, bottom } = lineMetrics(lineIndex, activeLineIndex, scroll, nearStep, farStep)
    const y = typingY - bottom - step / 2
    const rise = tipY - y
    if (rise < 0 || rise > beamHeight) return false
    const center = capX + Math.sin((beamTilt * Math.PI) / 180) * rise
    const half = (beamWidth / 2) * (rise / beamHeight) + L * 0.035
    return Math.abs(stickerX - center) <= half
  }

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    // Grille d’écriture : sans ces variables, les cellules n’ont aucune
    // largeur et le T ne peut pas se placer sous la lettre visée.
    stage.style.setProperty('--paper-color', paperColor)
    stage.style.setProperty('--grid-left', `${(GRID_LEFT * 100).toFixed(2)}%`)
    stage.style.setProperty('--writer-cols', String(WRITER_COLS))
    stage.style.setProperty('--col-width', `${columnWidth.toFixed(2)}px`)
    stage.style.setProperty('--line-step', `${nearStep.toFixed(2)}px`)
    stage.style.setProperty('--font-size', `${fontSize.toFixed(2)}px`)
    stage.style.setProperty('--roll-top', `${(typingY - visibleStack - 12).toFixed(1)}px`)
    stage.style.setProperty('--beam-rgb', beamRgb)
    stage.style.setProperty('--beam-top', `${beamHeight.toFixed(1)}px`)
    stage.style.setProperty('--beam-height', `${beamHeight.toFixed(1)}px`)
    stage.style.setProperty('--beam-width', `${beamWidth.toFixed(1)}px`)
    stage.style.setProperty('--beam-mid', `${beamMid}%`)
    stage.style.setProperty('--beam-opacity', beamOpacity.toFixed(3))
    // Pendant un glissement, seule la position continue pilotée par le doigt
    // compte : une frappe ne doit jamais écraser le chariot.
    if (!dragRef.current) {
      capXRef.current = capX
      stage.style.setProperty('--cap-x', `${capX.toFixed(2)}px`)
      stage.style.setProperty('--tilt', `${beamTilt.toFixed(2)}deg`)
    }
  }, [typedColumn, capX, beamTilt, columnWidth, L, H, nearStep, fontSize, typingY, visibleStack, paperColor, lamp.couleur,
    lamp.luminosite, lamp.intensite, lamp.forme, lamp.portee, lamp.angle,
    shapeFactor, angleFactor, rangeFactor, lampBoost, beamRgb, beamHeight, beamWidth, beamMid, beamOpacity])

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
    beginNewLine(lineIndex = 0, forward = true) {
      const stage = stageRef.current
      const lines = linesRef.current
      if (!stage || !lines) return
      stage.classList.remove('returning', 'rolling-up')
      lines.classList.remove('rising', 'rolling-forward', 'rolling-back')
      void stage.offsetWidth
      stage.classList.add('returning')
      lines.classList.add('rising')
      timers.current.push(window.setTimeout(() => lines.classList.remove('rising'), 280))
      timers.current.push(window.setTimeout(() => stage.classList.remove('returning'), 320))
      // Franchissement de la 8e ligne : le rabat se replie pendant que le
      // texte monte, une seule fois par nouvelle ligne.
      if (forward && lineIndex >= ROLL_START) {
        stage.classList.add('rolling-up')
        timers.current.push(window.setTimeout(() => stage.classList.remove('rolling-up'), 280))
      }
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
    recenter() {
      const lines = linesRef.current
      if (!lines) return
      lines.classList.remove('recentering')
      void lines.offsetWidth
      lines.classList.add('recentering')
      timers.current.push(window.setTimeout(() => lines.classList.remove('recentering'), 340))
    },
    cancelWheel() {
      if (wheelTimer.current) window.clearTimeout(wheelTimer.current)
      wheelTimer.current = null
      wheelVelocity.current = 0
    },
  }), [])

  useLayoutEffect(() => () => {
    if (tapTimer.current) window.clearTimeout(tapTimer.current)
    timers.current.forEach((timer) => window.clearTimeout(timer))
  }, [])

  // Molette et trackpad : la scène écoute elle-même le wheel en mode non
  // passif pour pouvoir annuler le défilement de la page. Le geste reste le
  // même que sur mobile : mêmes limites, même inertie, même son.
  useEffect(() => {
    if (!interactive) return undefined
    const stage = stageRef.current
    if (!stage) return undefined
    function onWheel(event) {
      event.preventDefault()
      // deltaMode : 0 = pixels, 1 = lignes, 2 = pages.
      const factor = event.deltaMode === 1 ? nearStep : event.deltaMode === 2 ? H : 1
      // Wheel vers le haut (deltaY négatif) = remonter dans le texte, comme
      // un glissement de doigt vers le haut.
      const raw = (-event.deltaY * factor) / nearStep
      const lines = clamp(raw * 0.5, -2, 2)
      wheelVelocity.current = wheelVelocity.current * 0.6 + lines * 0.32
      wheelHandlers.current.by?.(lines)
      if (wheelTimer.current) window.clearTimeout(wheelTimer.current)
      wheelTimer.current = window.setTimeout(() => {
        wheelTimer.current = null
        wheelHandlers.current.end?.(wheelVelocity.current)
        wheelVelocity.current = 0
      }, 90)
    }

    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      stage.removeEventListener('wheel', onWheel)
      if (wheelTimer.current) window.clearTimeout(wheelTimer.current)
    }
  }, [interactive, nearStep, H])

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
    const column = clamp(Math.round((x - L * GRID_LEFT) / columnWidth - 0.5), 0, maxColumn)
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
    if (!interactive || (event.button !== undefined && event.button !== 0)) return
    event.preventDefault()
    onKeepFocus?.()
    paperRef.current?.setPointerCapture?.(event.pointerId)
    dragRef.current = {
      type: 'scroll',
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      lastTime: performance.now(),
      velocity: 0,
      moved: false,
    }
  }

  function movePaperPointer(event) {
    const drag = dragRef.current
    if (!drag || drag.type !== 'scroll' || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    const now = performance.now()
    const deltaY = event.clientY - drag.lastY
    if (Math.abs(event.clientY - drag.startY) > 6) drag.moved = true
    if (deltaY !== 0) {
      const elapsed = Math.max(8, now - drag.lastTime)
      const linesDelta = -deltaY / nearStep
      drag.velocity = drag.velocity * 0.65 + linesDelta * (16.7 / elapsed) * 0.35
      drag.lastY = event.clientY
      drag.lastTime = now
      onScrollBy?.(linesDelta)
    }
  }

  // Tap sur un mot : retrouver la ligne réellement affichée sous le doigt,
  // avec le pli courant, plutôt que la ligne de frappe.
  function selectFromPoint(event) {
    const stage = stageRef.current
    const lines = linesRef.current
    if (!stage || !lines) return
    const stageRect = stage.getBoundingClientRect()
    const linesRect = lines.getBoundingClientRect()
    const rawColumn = (event.clientX - stageRect.left - L * GRID_LEFT) / columnWidth
    const column = clamp(Math.round(rawColumn), 0, WRITER_COLS - 1)
    const viewLine = clamp(activeLineIndex - Math.round(scroll), 0, Math.max(0, lineCount - 1))
    const candidates = new Set([viewLine])
    lines.querySelectorAll('[data-line-index]').forEach((node) => {
      candidates.add(Number(node.dataset.lineIndex))
    })
    let bestIndex = viewLine
    let bestDistance = Infinity
    candidates.forEach((index) => {
      if (index < 0 || index >= lineCount) return
      const { step, bottom } = lineMetrics(index, activeLineIndex, scroll, nearStep, farStep)
      const centerY = linesRect.bottom - bottom - step / 2
      const difference = Math.abs(centerY - event.clientY)
      if (difference < bestDistance) {
        bestDistance = difference
        bestIndex = index
      }
    })
    onWordTap?.(bestIndex, column)
  }

  function endPaperPointer(event) {
    const drag = dragRef.current
    if (!drag || drag.type !== 'scroll' || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    paperRef.current?.releasePointerCapture?.(event.pointerId)
    dragRef.current = null
    onKeepFocus?.()
    if (!drag.moved && Math.abs(event.clientY - drag.startY) < 8) selectFromPoint(event)
    else onScrollEnd?.(drag.velocity)
  }

  // Toucher la capsule ne commande plus la lampe : seul le glissement
  // horizontal déplace le chariot. L’allumage reste dans les réglages.
  function capsulePointerDown(event) {
    if (!interactive) return
    startHorizontalDrag(event)
  }

  function capsulePointerUp(event) {
    const wasMoved = endHorizontalDrag(event)
    if (wasMoved) return
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
    endHorizontalDrag(event)
  }

  return (
    <div ref={stageRef} className={`writer-stage ${lampOn ? 'lamp-on' : 'lamp-off'}`}>
      <svg className="scene-defs" width="0" height="0" aria-hidden="true">
        <defs>
          <clipPath id="roll" clipPathUnits="objectBoundingBox">
            <path d="M0,1 L0,0.48 C0.01,0.34 0.04,0.14 0.08,0.04 Q0.08,0 0.10,0 L0.90,0 Q0.92,0 0.92,0.04 C0.96,0.14 0.99,0.34 1,0.48 L1,1 Z" />
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
        <PaperTexture grain={grain} lampOn={lampOn} />
        {settings.charms.includes('coeur') && (
          <span className="paper-heart" style={{ color: heartCharm?.couleur }} aria-hidden="true">♥</span>
        )}
        <div className="paper-vignette" aria-hidden="true" />
        {/* Faisceau et source : enfants de la feuille, clipés par son overflow. */}
        <div className="beam-anchor" aria-hidden="true">
          <div className="beam-blur"><div className="beam-layer" /></div>
        </div>
        <div className="tip-glow" aria-hidden="true" />
      </div>

      {/* Le texte est un calque au-dessus du chariot : la pointe en T et la
          lumière passent derrière les lettres, même pendant la frappe. */}
      <div ref={linesRef} className="paper-lines">
        <ContextLines
          lines={contextLines}
          activeLineIndex={activeLineIndex}
          scroll={scroll}
          seed={seed}
          inkColor={inkColor}
          nearStep={nearStep}
          farStep={farStep}
        />
        {stickers.map((sticker, index) => (
          <Sticker
            key={`${index}-${sticker.ligne}-${sticker.id}`}
            sticker={sticker}
            index={index}
            activeLineIndex={activeLineIndex}
            scroll={scroll}
            nearStep={nearStep}
            farStep={farStep}
            lit={stickerIsLit(sticker.ligne)}
            onRemove={onRemoveSticker}
            onKeepFocus={onKeepFocus}
          />
        ))}
        <CurrentLine
          ref={currentLineRef}
          inkColor={inkColor}
          bottom={lineMetrics(activeLineIndex, activeLineIndex, scroll, nearStep, farStep).bottom}
        />
      </div>

      {/* Haut du cylindre : le texte glisse derrière ce rabat au lieu de
          disparaître brutalement une fois la 8e ligne dépassée. */}
      {activeLineIndex >= ROLL_START && (
        <div className="paper-cylinder" aria-hidden="true">
          <div className="paper-roll" />
        </div>
      )}

      {/* La même feuille continue sous le rail, plus sombre, jusqu’à la barre d’outils. */}
      <div className="paper-lower" aria-hidden="true">
        <PaperTexture grain={grain} lampOn={lampOn} />
        <div className="paper-lower-shade" />
      </div>

      {/* Rail fixe, puis chariot : la pointe est sous la ligne de frappe. */}
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
          aria-label="Capsule — glisser pour choisir la lettre, double appui pour la fin"
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
