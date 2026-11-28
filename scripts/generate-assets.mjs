// Génère les icônes PNG à partir du logo et les sons WAV de Confesse-moi, sans dépendance externe.
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

/* ---------- Lecture du logo (PNG RGBA 8 bits) ---------- */
function paeth(a, b, c) {
  const q = a + b - c
  const pa = Math.abs(q - a)
  const pb = Math.abs(q - b)
  const pc = Math.abs(q - c)
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
}

function readPng(file) {
  const buffer = fs.readFileSync(file)
  let offset = 8
  let width = 0
  let height = 0
  let depth = 0
  let colorType = 0
  const idat = []
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      depth = data[8]
      colorType = data[9]
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') {
      break
    }
    offset += 12 + length
  }
  if (depth !== 8 || (colorType !== 6 && colorType !== 2)) {
    throw new Error(`Logo PNG non pris en charge : ${file}`)
  }
  const channels = colorType === 6 ? 4 : 3
  const stride = width * channels
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const scanlines = Buffer.alloc(height * stride)
  let cursor = 0
  for (let y = 0; y < height; y += 1) {
    const filter = raw[cursor]
    cursor += 1
    for (let x = 0; x < stride; x += 1) {
      const value = raw[cursor]
      cursor += 1
      const a = x >= channels ? scanlines[y * stride + x - channels] : 0
      const b = y > 0 ? scanlines[(y - 1) * stride + x] : 0
      const c = x >= channels && y > 0 ? scanlines[(y - 1) * stride + x - channels] : 0
      let decoded
      if (filter === 0) decoded = value
      else if (filter === 1) decoded = value + a
      else if (filter === 2) decoded = value + b
      else if (filter === 3) decoded = value + Math.floor((a + b) / 2)
      else if (filter === 4) decoded = value + paeth(a, b, c)
      else throw new Error(`Filtre PNG inconnu (${filter}) dans ${file}`)
      scanlines[y * stride + x] = decoded & 0xff
    }
  }
  const pixels = new Uint8Array(width * height * 4)
  for (let i = 0; i < width * height; i += 1) {
    const src = i * channels
    const dst = i * 4
    pixels[dst] = scanlines[src]
    pixels[dst + 1] = scanlines[src + 1]
    pixels[dst + 2] = scanlines[src + 2]
    pixels[dst + 3] = channels === 4 ? scanlines[src + 3] : 255
  }
  return { width, height, pixels }
}

// Réduction par surface : évite le crénelage quand on passe de 1024 à 180 px.
function resizeRgba(image, size) {
  const out = new Uint8Array(size * size * 4)
  const { width, height, pixels } = image
  for (let y = 0; y < size; y += 1) {
    const y0 = (y * height) / size
    const y1 = ((y + 1) * height) / size
    for (let x = 0; x < size; x += 1) {
      const x0 = (x * width) / size
      const x1 = ((x + 1) * width) / size
      let red = 0
      let green = 0
      let blue = 0
      let alpha = 0
      let total = 0
      for (let sy = Math.floor(y0); sy < Math.min(Math.ceil(y1), height); sy += 1) {
        const wy = Math.min(sy + 1, y1) - Math.max(sy, y0)
        if (wy <= 0) continue
        for (let sx = Math.floor(x0); sx < Math.min(Math.ceil(x1), width); sx += 1) {
          const wx = Math.min(sx + 1, x1) - Math.max(sx, x0)
          if (wx <= 0) continue
          const weight = wx * wy
          const src = (sy * width + sx) * 4
          const a = pixels[src + 3] / 255
          red += pixels[src] * a * weight
          green += pixels[src + 1] * a * weight
          blue += pixels[src + 2] * a * weight
          alpha += a * weight
          total += weight
        }
      }
      const dst = (y * size + x) * 4
      if (alpha > 0) {
        out[dst] = Math.round(red / alpha)
        out[dst + 1] = Math.round(green / alpha)
        out[dst + 2] = Math.round(blue / alpha)
      }
      out[dst + 3] = Math.round((alpha / total) * 255)
    }
  }
  return out
}

const logoPath = path.join(publicDir, 'logo-confesse-moi.png')
let logo = null

function makeIcon(size) {
  if (!logo) logo = readPng(logoPath)
  writePng(path.join(publicDir, `icon-${size}.png`), size, resizeRgba(logo, size))
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
