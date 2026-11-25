// Génère les icônes PNG et les sons WAV de Confesse-moi, sans dépendance externe.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const root = path.resolve(import.meta.dirname, '..')
const publicDir = path.join(root, 'public')
fs.mkdirSync(path.join(publicDir, 'sounds'), { recursive: true })

/* ---------- PNG minimal (RGBA 8 bits) ---------- */
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function writePng(file, size, pixels) {
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0
    Buffer.from(pixels.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // profondeur
  ihdr[9] = 6 // RGBA
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
  fs.writeFileSync(file, png)
}

function makeIcon(size) {
  const pixels = new Uint8Array(size * size * 4)
  const bg = [0x2b, 0x2d, 0x31] // anthracite
  const capsule = [0xc8, 0x76, 0x5f] // capsule solide, couleur unie
  const angle = (-28 * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const halfHeight = size * 0.135
  const halfWidth = size * 0.3
  const segment = halfWidth - halfHeight

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x + 0.5 - size / 2
      const dy = y + 0.5 - size / 2
      const rx = dx * cos - dy * sin
      const ry = dx * sin + dy * cos
      const qx = Math.max(Math.abs(rx) - segment, 0)
      const distance = Math.hypot(qx, ry) - halfHeight
      const alpha = Math.min(1, Math.max(0, 0.5 - distance))
      const offset = (y * size + x) * 4
      for (let c = 0; c < 3; c += 1) {
        pixels[offset + c] = Math.round(bg[c] * (1 - alpha) + capsule[c] * alpha)
      }
      pixels[offset + 3] = 255
    }
  }
  writePng(path.join(publicDir, `icon-${size}.png`), size, pixels)
}

/* ---------- WAV mono 16 bits ---------- */
function writeWav(file, samples, sampleRate = 44100) {
  const dataSize = samples.length * 2
  const buffer = Buffer.alloc(44 + dataSize)
  buffer.write('RIFF', 0, 'ascii')
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8, 'ascii')
  buffer.write('fmt ', 12, 'ascii')
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36, 'ascii')
  buffer.writeUInt32LE(dataSize, 40)
  for (let i = 0; i < samples.length; i += 1) {
    const value = Math.max(-1, Math.min(1, samples[i]))
    buffer.writeInt16LE(Math.round(value * 32767), 44 + i * 2)
  }
  fs.writeFileSync(file, buffer)
}

function makeTypeSound() {
  const rate = 44100
  const samples = new Float32Array(Math.round(rate * 0.055))
  for (let i = 0; i < samples.length; i += 1) {
    const t = i / rate
    const attack = Math.min(1, t / 0.001)
    const noise = Math.random() * 2 - 1
    const thock = Math.sin(2 * Math.PI * 168 * t)
    const envelope = Math.exp(-t * 105)
    samples[i] = (noise * 0.5 + thock * 0.5) * envelope * attack * 0.62
  }
  writeWav(path.join(publicDir, 'sounds', 'type.wav'), samples, rate)
}

function makeDingSound() {
  const rate = 44100
  const samples = new Float32Array(Math.round(rate * 0.62))
  for (let i = 0; i < samples.length; i += 1) {
    const t = i / rate
    const attack = Math.min(1, t / 0.002)
    const tone =
      Math.sin(2 * Math.PI * 1180 * t) * 0.48 * Math.exp(-t * 7) +
      Math.sin(2 * Math.PI * 1770 * t) * 0.3 * Math.exp(-t * 11) +
      Math.sin(2 * Math.PI * 2360 * t) * 0.12 * Math.exp(-t * 17)
    samples[i] = tone * attack * 0.7
  }
  writeWav(path.join(publicDir, 'sounds', 'ding.wav'), samples, rate)
}

for (const size of [180, 192, 512]) makeIcon(size)
makeTypeSound()
makeDingSound()
console.log('Icônes et sons générés dans public/.')
