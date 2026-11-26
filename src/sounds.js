// Synthèse audio Web Audio : aucun fichier protégé, tout fonctionne hors ligne.
// Les sons de papier peuvent être remplacés par /assets/sounds/paper-tap.mp3
// et /assets/sounds/paper-scroll.mp3 ; la synthèse sert de repli.
let context = null
let paperTapBuffer = null
let paperScrollBuffer = null
let loadingPaper = false

let scrollVoice = null
let scrollGain = null
let scrollFilter = null

export function unlockAudio() {
  if (!context && typeof window !== 'undefined') {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    context = new AudioContext()
  }
  if (context?.state === 'suspended') context.resume().catch(() => {})
  if (context && !loadingPaper) {
    loadingPaper = true
    loadPaperSounds().catch(() => {})
  }
}

function audio() {
  return context && context.state !== 'closed' ? context : null
}

async function loadClip(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Audio indisponible : ${url}`)
  return context.decodeAudioData(await response.arrayBuffer())
}

async function loadPaperSounds() {
  const ctx = audio()
  if (!ctx) return
  const [tap, scroll] = await Promise.allSettled([
    loadClip('/assets/sounds/paper-tap.mp3'),
    loadClip('/assets/sounds/paper-scroll.mp3'),
  ])
  if (tap.status === 'fulfilled') paperTapBuffer = tap.value
  if (scroll.status === 'fulfilled') {
    paperScrollBuffer = scroll.value
    if (scrollVoice) scrollVoice.buffer = scroll.value
  }
}

function noiseBuffer(ctx, duration) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration))
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1
  return buffer
}

// Bruit de boucle sans clic à la jointure : la fin rejoint le début.
function scrollNoise(ctx) {
  const length = Math.floor(ctx.sampleRate * 1.2)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * 0.7
  const fade = Math.floor(ctx.sampleRate * 0.02)
  for (let index = 0; index < fade; index += 1) {
    const ratio = index / fade
    data[length - fade + index] = data[length - fade + index] * (1 - ratio) + data[index] * ratio
  }
  return buffer
}

function burst(ctx, { duration, type = 'bandpass', frequency = 1800, q = 1, gain = 0.4, attack = 0.002, sweepTo }) {
  const now = ctx.currentTime
  const source = ctx.createBufferSource()
  source.buffer = noiseBuffer(ctx, duration)
  const filter = ctx.createBiquadFilter()
  filter.type = type
  filter.frequency.setValueAtTime(frequency, now)
  if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, now + duration)
  filter.Q.value = q
  const volume = ctx.createGain()
  volume.gain.setValueAtTime(0.0001, now)
  volume.gain.linearRampToValueAtTime(gain, now + attack)
  volume.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  source.connect(filter).connect(volume).connect(ctx.destination)
  source.start(now)
  source.stop(now + duration + 0.01)
}

function tone(ctx, { frequency, duration, gain = 0.2, type = 'sine', attack = 0.003, endFrequency }) {
  const now = ctx.currentTime
  const oscillator = ctx.createOscillator()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, now)
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration)
  const volume = ctx.createGain()
  volume.gain.setValueAtTime(0.0001, now)
  volume.gain.linearRampToValueAtTime(gain, now + attack)
  volume.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  oscillator.connect(volume).connect(ctx.destination)
  oscillator.start(now)
  oscillator.stop(now + duration + 0.01)
}

function haptic(enabled, pattern) {
  if (enabled && navigator.vibrate) navigator.vibrate(pattern)
}

function soundSettings(settings) {
  const sound = settings?.sound ?? {}
  const volume = Math.max(0, Math.min(1, sound.volume ?? 0.7))
  return { sound, volume, enabled: sound.active !== false && volume > 0, haptics: Boolean(sound.haptiques) }
}

const PROFILES = {
  sec: { frequency: 2100, q: 1.1, tone: 190, gain: 0.42, duration: 0.05 },
  doux: { frequency: 1150, q: 0.8, tone: 120, gain: 0.34, duration: 0.062 },
  claquant: { frequency: 2800, q: 1.6, tone: 260, gain: 0.48, duration: 0.042 },
}

// ±5 % : assez pour éviter l’effet répétitif, sans changer le caractère du son.
function paperPitch() {
  return 0.95 + Math.random() * 0.1
}

function playPaperTap(ctx, volume, haptics) {
  const pitch = paperPitch()
  if (paperTapBuffer) {
    const source = ctx.createBufferSource()
    source.buffer = paperTapBuffer
    source.playbackRate.value = pitch
    const gain = ctx.createGain()
    gain.gain.value = 0.4 * volume
    source.connect(gain).connect(ctx.destination)
    source.start()
    source.stop(ctx.currentTime + Math.min(paperTapBuffer.duration, 0.35))
  } else {
    burst(ctx, {
      duration: 0.3, type: 'bandpass', frequency: 1500 * pitch, q: 0.55,
      gain: 0.4 * volume, attack: 0.025, sweepTo: 700 * pitch,
    })
    burst(ctx, {
      duration: 0.18, type: 'highpass', frequency: 2600 * pitch,
      gain: 0.16 * volume, attack: 0.045,
    })
  }
  haptic(haptics, 10)
}

function ensureScrollVoice(ctx) {
  if (scrollVoice) return
  const source = ctx.createBufferSource()
  source.buffer = paperScrollBuffer ?? scrollNoise(ctx)
  source.loop = true
  source.playbackRate.value = paperPitch()
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 900
  filter.Q.value = 0.5
  const gain = ctx.createGain()
  gain.gain.value = 0.0001
  source.connect(filter).connect(gain).connect(ctx.destination)
  source.start()
  scrollVoice = source
  scrollFilter = filter
  scrollGain = gain
}

// Vitesse en lignes par frame ; le gain suit la vitesse et revient au silence.
export function setPaperScrollSpeed(speed, settings) {
  const ctx = audio()
  if (!ctx) return
  const { sound, volume, enabled } = soundSettings(settings)
  const target = Math.min(1, Math.abs(speed) / 10)
  if (!enabled || target < 0.01) {
    stopPaperScroll()
    return
  }
  ensureScrollVoice(ctx)
  const now = ctx.currentTime
  scrollGain.gain.setTargetAtTime(0.4 * volume * 0.45 * target, now, 0.04)
  scrollFilter.frequency.setTargetAtTime(700 + target * 900, now, 0.08)
}

export function stopPaperScroll() {
  const ctx = audio()
  if (!ctx || !scrollGain) return
  scrollGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.03)
}

export function disposePaperSounds() {
  stopPaperScroll()
  if (scrollVoice) {
    try { scrollVoice.stop() } catch { /* déjà arrêtée */ }
    scrollVoice.disconnect()
    scrollFilter?.disconnect()
    scrollGain?.disconnect()
  }
  scrollVoice = null
  scrollFilter = null
  scrollGain = null
}

export function playSound(kind, settings) {
  const ctx = audio()
  if (!ctx) return
  const { sound, volume, enabled, haptics } = soundSettings(settings)
  if (!enabled) return
  const variation = 0.92 + Math.random() * 0.16

  if (kind === 'paper-tap') {
    playPaperTap(ctx, volume, haptics)
    return
  }

  if (kind === 'key') {
    const profile = PROFILES[sound.type] ?? PROFILES.sec
    burst(ctx, {
      duration: profile.duration * variation,
      frequency: profile.frequency * variation,
      q: profile.q,
      gain: profile.gain * volume * variation,
    })
    tone(ctx, { frequency: profile.tone * variation, duration: 0.045, gain: 0.18 * volume * variation, type: 'triangle' })
    haptic(haptics, 7)
    return
  }

  if (kind === 'space') {
    burst(ctx, { duration: 0.075, type: 'lowpass', frequency: 380 * variation, gain: 0.4 * volume * variation })
    tone(ctx, { frequency: 95, duration: 0.06, gain: 0.2 * volume, type: 'sine' })
    haptic(haptics, 6)
    return
  }

  if (kind === 'backspace') {
    burst(ctx, { duration: 0.026, type: 'highpass', frequency: 3200, gain: 0.3 * volume })
    tone(ctx, { frequency: 520 * variation, duration: 0.025, gain: 0.12 * volume, type: 'square' })
    haptic(haptics, 5)
    return
  }

  if (kind === 'insert') {
    burst(ctx, { duration: 0.32, frequency: 1100, q: 0.4, gain: 0.26 * volume, attack: 0.06 })
    tone(ctx, { frequency: 140, duration: 0.14, gain: 0.18 * volume, type: 'triangle' })
    haptic(haptics, 18)
    return
  }

  if (kind === 'lamp') {
    tone(ctx, { frequency: 880, duration: 0.018, gain: 0.16 * volume, type: 'square' })
    burst(ctx, { duration: 0.03, type: 'highpass', frequency: 2500, gain: 0.2 * volume })
    haptic(haptics, 12)
  }
}
