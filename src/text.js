// Le texte brut reste intact dans la note. Le moteur ci-dessous calcule
// seulement les lignes affichées sur la feuille (grille monospace de 25 cases).
export const WRITER_COLS = 25

export function wrapText(text, maxCols) {
  return layoutText(text, maxCols).map((line) => line.text)
}

// Découpe le texte en lignes de `cols` cases. Un saut automatique se fait au
// dernier espace de la ligne ; s’il n’y en a pas, la ligne est coupée à `cols`.
// Les Entrées explicites sont conservées telles quelles.
// Chaque ligne garde sa position dans le texte brut (start/end) pour pouvoir
// retrouver la colonne du curseur sans jamais modifier la note.
export function layoutText(text, cols = WRITER_COLS) {
  const limit = Math.max(1, Math.floor(cols))
  const paragraphs = String(text ?? '').split('\n')
  const lines = []
  let offset = 0

  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      lines.push({ text: '', start: offset, end: offset })
    } else {
      let position = 0
      let lastChunkLength = 0
      while (position < paragraph.length) {
        const chunk = paragraph.slice(position, position + limit)
        const isLastChunk = position + chunk.length >= paragraph.length
        const lastSpace = chunk.lastIndexOf(' ')

        if (!isLastChunk && lastSpace > 0) {
          lines.push({
            text: chunk.slice(0, lastSpace),
            start: offset + position,
            end: offset + position + lastSpace,
          })
          position += lastSpace + 1 // l’espace devient le saut de ligne
          lastChunkLength = chunk.length
          continue
        }

        lines.push({
          text: chunk,
          start: offset + position,
          end: offset + position + chunk.length,
        })
        position += chunk.length
        lastChunkLength = chunk.length
      }
      // Une ligne exactement pleine rend la main : la suivante est déjà prête
      // à gauche, comme sur une machine à écrire.
      if (position === paragraph.length && lastChunkLength === limit) {
        lines.push({ text: '', start: offset + paragraph.length, end: offset + paragraph.length })
      }
    }
    offset += paragraph.length + 1 // +1 pour le \n (même après le dernier)
  }

  return lines.length ? lines : [{ text: '', start: 0, end: 0 }]
}

// Transforme un index dans le texte brut en { ligne, colonne } sur la grille.
export function caretCell(lines, caretIndex) {
  const index = Math.max(0, Math.min(Number(caretIndex) || 0, Number.MAX_SAFE_INTEGER))
  let lineIndex = lines.length - 1
  for (let cursor = 0; cursor < lines.length; cursor += 1) {
    const line = lines[cursor]
    const next = lines[cursor + 1]
    const justFilled = next && index === line.end && next.start === index && line.text.length === WRITER_COLS
    if (justFilled) continue // la case suivante est déjà sur la ligne d’après
    if (index <= line.end || cursor === lines.length - 1) {
      lineIndex = cursor
      break
    }
  }
  const line = lines[lineIndex]
  const column = Math.max(0, Math.min(index - line.start, line.text.length))
  return { lineIndex, column }
}

// Inverse de caretCell : place le curseur sur une cellule visible.
export function caretForCell(lines, lineIndex, column) {
  if (!lines.length) return 0
  const index = Math.max(0, Math.min(lineIndex, lines.length - 1))
  const line = lines[index]
  const wanted = Math.max(0, Math.min(column, line.text.length))
  return Math.min(line.end, line.start + wanted)
}

export function formatDate(timestamp) {
  if (!timestamp) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(timestamp))
}

export function excerpt(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, 110)
}

export function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}
