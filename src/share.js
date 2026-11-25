import { getCapsule } from './data.js'
import { wrapText } from './text.js'

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return 'Texte copié.'
    }
  } catch {
    // on tente la méthode de repli ci-dessous
  }
  const area = document.createElement('textarea')
  area.value = text
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  const copied = document.execCommand?.('copy') ?? false
  area.remove()
  return copied ? 'Texte copié.' : 'Partage indisponible sur ce navigateur.'
}

export async function shareText(note) {
  const title = note.title?.trim() || 'Sans titre'
  const text = `${title}\n\n${note.text ?? ''}`.trim()
  if (navigator.share) {
    // La feuille native s'ouvre immédiatement ; on ne bloque pas l'interface.
    navigator.share({ title, text }).catch(() => {})
    return 'Partage ouvert.'
  }
  return copyText(text)
}

export async function shareImage(note, settings) {
  try {
    await document.fonts.load('22px "Special Elite"')
    await document.fonts.ready
  } catch {
    // la police système prend le relais
  }

  const scale = 2
  const width = 750
  const height = 1000
  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)

  ctx.fillStyle = '#2B2D31'
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'
  ctx.shadowBlur = 36
  ctx.shadowOffsetY = 16
  const paperColor = settings.charms?.includes('clef') ? '#E6D2A6' : settings.paperColor
  ctx.fillStyle = paperColor
  roundedRect(ctx, 56, 60, 638, 880, 16)
  ctx.fill()
  ctx.restore()

  // Grain très léger, comme sur la feuille de la machine
  ctx.save()
  roundedRect(ctx, 56, 60, 638, 880, 16)
  ctx.clip()
  for (let index = 0; index < 1400; index += 1) {
    ctx.fillStyle = `rgba(80, 66, 45, ${Math.random() * 0.045})`
    ctx.fillRect(70 + Math.random() * 610, 74 + Math.random() * 850, 1.2, 1.2)
  }
  ctx.restore()

  const ink = settings.patineRuban ? '#2B1F1A' : '#1A1A1A'
  ctx.globalAlpha = Math.max(0.5, Math.min(1, (settings.inkIntensity ?? 100) / 100))
  ctx.fillStyle = ink
  ctx.font = '36px "Special Elite", "Courier New", monospace'
  ctx.textBaseline = 'top'
  ctx.fillText(note.title?.trim() || 'Sans titre', 96, 104, 550)

  ctx.strokeStyle = 'rgba(80, 66, 45, 0.25)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(96, 164)
  ctx.lineTo(654, 164)
  ctx.stroke()

  const fontSize = Math.max(19, settings.fontSize + 6)
  const lineHeight = fontSize * 1.7
  const maxCols = 40
  const allLines = wrapText(note.text ?? '', maxCols)
  const room = Math.floor((840 - 210) / lineHeight)
  const lines = allLines.slice(0, room)
  ctx.font = `${fontSize}px "Special Elite", "Courier New", monospace`
  lines.forEach((line, index) => {
    ctx.fillText(line, 96, 206 + index * lineHeight, 558)
  })
  if (allLines.length > lines.length) {
    ctx.fillStyle = 'rgba(80, 66, 45, 0.45)'
    ctx.fillText('…', 96, 206 + lines.length * lineHeight)
  }
  ctx.globalAlpha = 1

  ctx.fillStyle = getCapsule(settings.capsuleId).couleur
  roundedRect(ctx, 96, 878, 58, 24, 12)
  ctx.fill()
  ctx.fillStyle = 'rgba(80, 66, 45, 0.45)'
  ctx.font = '16px -apple-system, sans-serif'
  ctx.fillText('Confesse-moi', 168, 882)

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return 'Image indisponible.'

  const file = new File([blob], 'confesse-moi.png', { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    navigator.share({ files: [file], title: 'Confesse-moi' }).catch(() => {})
    return 'Partage ouvert.'
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'confesse-moi.png'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'Image téléchargée.'
}
