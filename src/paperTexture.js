// Grain du papier généré une seule fois, avec une graine fixe : la feuille est
// strictement identique à chaque ouverture. Le dataURL est mis en cache.
const SIZE = 512
let cache = null

function prng(seed) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function getPaperTexture() {
  if (cache !== null) return cache
  if (typeof document === 'undefined') return ''

  const random = prng(0x5eedc0de)
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  // Bruit gris fin, alpha 6–10 %.
  const image = ctx.createImageData(SIZE, SIZE)
  for (let index = 0; index < image.data.length; index += 4) {
    const gray = Math.floor(random() * 256)
    image.data[index] = gray
    image.data[index + 1] = gray
    image.data[index + 2] = gray
    image.data[index + 3] = Math.round((0.06 + random() * 0.04) * 255)
  }
  ctx.putImageData(image, 0, 0)

  // 4 à 6 grandes zones de teinte très douces (3 %).
  const zones = 4 + Math.floor(random() * 3)
  for (let index = 0; index < zones; index += 1) {
    const x = random() * SIZE
    const y = random() * SIZE
    const radius = 70 + random() * 150
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, 'rgba(120, 95, 60, 0.03)')
    gradient.addColorStop(1, 'rgba(120, 95, 60, 0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  // ~90 petites taches sombres.
  for (let index = 0; index < 90; index += 1) {
    const radius = 0.5 + random() * 1
    ctx.fillStyle = `rgba(20, 15, 10, ${(0.15 + random() * 0.25).toFixed(3)})`
    ctx.beginPath()
    ctx.arc(random() * SIZE, random() * SIZE, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  // ~25 fibres courtes, angles aléatoires.
  for (let index = 0; index < 25; index += 1) {
    const x = random() * SIZE
    const y = random() * SIZE
    const length = 3 + random() * 5
    const angle = random() * Math.PI * 2
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length)
    ctx.stroke()
  }

  cache = canvas.toDataURL('image/png')
  return cache
}
