// Synthèse audio Web Audio : aucun fichier protégé, tout fonctionne hors ligne.
let context = null

export function unlockAudio() {
  if (!context && typeof window !== 'undefined') {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    context = new AudioContext()
  }
  if (context?.state === 'suspended') context.resume().catch(() => {})
}

function audio() {
  return context && context.state !== 'closed' ? context : null
}

function noiseBuffer(ctx, duration) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration))
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1
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

const PROFILES = {
  sec: { frequency: 2100, q: 1.1, tone: 190, gain: 0.42, duration: 0.05 },
  doux: { frequency: 1150, q: 0.8, tone: 120, gain: 0.34, duration: 0.062 },
  claquant: { frequency: 2800, q: 1.6, tone: 260, gain: 0.48, duration: 0.042 },
}

export function playSound(kind, settings) {
  const ctx = audio()
  if (!ctx) return
  const sound = settings?.sound ?? {}
  const volume = Math.max(0, Math.min(1, sound.volume ?? 0.7))
  if (volume === 0) return
  const haptics = Boolean(sound.haptiques)
  const variation = 0.92 + Math.random() * 0.16

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
