export const APP_NAME = 'Confesse-moi'

export const CAPSULES = [
  {
    id: 'classique',
    nom: 'Classique',
    couleur: '#3A3836',
    thème: 'Libre',
    son: { nom: 'Frappe douce', pitch: 1, gain: 0.55, filtre: 2400 },
  },
  {
    id: 'lettre',
    nom: 'Lettre',
    couleur: '#423A34',
    thème: 'Épistolaire',
    son: { nom: 'Frappe feutrée', pitch: 0.9, gain: 0.6, filtre: 1800 },
  },
  {
    id: 'poeme',
    nom: 'Poème',
    couleur: '#39403A',
    thème: 'Vers libres',
    son: { nom: 'Frappe claire', pitch: 1.18, gain: 0.45, filtre: 3600 },
  },
  {
    id: 'journal',
    nom: 'Journal',
    couleur: '#343B42',
    thème: 'Intime',
    son: { nom: 'Frappe grave', pitch: 0.82, gain: 0.65, filtre: 1400 },
  },
]

export const CHARMS = [
  { id: 'etoile', nom: 'Étoile', couleur: '#E7C878', effet: 'Une frappe plus claire, comme une étincelle.' },
  { id: 'clef', nom: 'Clé', couleur: '#C2A77A', effet: 'Le papier prend une teinte dorée.' },
  { id: 'coeur', nom: 'Cœur', couleur: '#D6797B', effet: 'Un petit ornement veille sur la feuille.' },
]

function stickerSvg(body) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 40">${body}</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function flower(cx, cy, petal, center) {
  const petals = [[-4, 0], [4, 0], [0, -4], [0, 4], [-3, -3], [3, -3], [-3, 3], [3, 3]]
    .map(([dx, dy]) => `<circle cx="${cx + dx}" cy="${cy + dy}" r="2.6" fill="${petal}"/>`)
    .join('')
  return `${petals}<circle cx="${cx}" cy="${cy}" r="2" fill="${center}"/>`
}

// liste extensible : ajouter un objet {id, image, label} suffit pour proposer
// un nouveau marqueur dans le sélecteur.
export const STICKERS = [
  {
    id: 'bouquet',
    label: 'Bouquet de fleurs',
    image: stickerSvg(`
      <path d="M14 22v10M32 22v11M50 22v10" stroke="#5C8A58" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M14 28c-4-4-7-2-6 1 1 2 4 2 6-1zM32 29c4-4 7-2 6 1-1 2-4 2-6-1zM50 28c-4-4-7-2-6 1 1 2 4 2 6-1z" fill="#6E9B63"/>
      ${flower(14, 16, '#E88FA8', '#F6C85F')}
      ${flower(32, 15, '#F4F7FF', '#8DB8F0')}
      ${flower(50, 16, '#F2A65A', '#F6D365')}
    `),
  },
  {
    id: 'epingle',
    label: 'Épingle',
    image: stickerSvg(`
      <circle cx="20" cy="12" r="7" fill="#D96B6B" stroke="#2B2D31" stroke-width="1"/>
      <circle cx="18" cy="10" r="2" fill="#fff" opacity=".7"/>
      <path d="M25 17 48 34" stroke="#B8B2A6" stroke-width="3" stroke-linecap="round"/>
      <path d="m47 33 5 3" stroke="#2B2D31" stroke-width="1.2" stroke-linecap="round"/>
    `),
  },
  {
    id: 'etoile',
    label: 'Étoile',
    image: stickerSvg(`
      <path d="M32 3 38 15 51 17 41 26 44 38 32 32 20 38 23 26 13 17 26 15Z" fill="#F2C14E" stroke="#2B2D31" stroke-width="1"/>
    `),
  },
  {
    id: 'coeur',
    label: 'Cœur',
    image: stickerSvg(`
      <path d="M32 35S8 22 8 13a9 9 0 0 1 16-5 9 9 0 0 1 16 5c0 9-24 22-24 22Z" fill="#E06E7C" stroke="#2B2D31" stroke-width="1"/>
    `),
  },
  {
    id: 'coche',
    label: 'Coche',
    image: stickerSvg(`
      <path d="M12 21 26 33 52 8" fill="none" stroke="#4F9D69" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    `),
  },
  {
    id: 'drapeau',
    label: 'Drapeau',
    image: stickerSvg(`
      <path d="M20 6v29" stroke="#4A4640" stroke-width="2" stroke-linecap="round"/>
      <path d="M22 7h27l-7 9 7 9H22Z" fill="#D96B6B" stroke="#2B2D31" stroke-width="1"/>
    `),
  },
  {
    id: 'plume',
    label: 'Plume',
    image: stickerSvg(`
      <path d="M46 6C28 6 16 17 15 31c0 3 1 5 3 5 14-1 25-12 28-30Z" fill="#B8C9E8" stroke="#2B2D31" stroke-width="1"/>
      <path d="M18 36 46 8M25 30l9-9M31 28l8-8" stroke="#6C7C9A" stroke-width="1" stroke-linecap="round"/>
    `),
  },
  {
    id: 'bougie',
    label: 'Bougie',
    image: stickerSvg(`
      <path d="M28 14h8v19h-8z" fill="#F2E4C9" stroke="#2B2D31" stroke-width="1"/>
      <path d="M32 13c-4-4-1-9 0-11 1 3 5 7 0 11Z" fill="#F2A65A"/>
      <path d="M24 33h16" stroke="#8C6A4A" stroke-width="2" stroke-linecap="round"/>
    `),
  },
  {
    id: 'lune',
    label: 'Croissant de lune',
    image: stickerSvg(`
      <path d="M40 5a16 16 0 1 0 9 29A17 17 0 0 1 40 5Z" fill="#F2D777" stroke="#2B2D31" stroke-width="1"/>
    `),
  },
  {
    id: 'trefle',
    label: 'Trèfle',
    image: stickerSvg(`
      <path d="M32 33c-8 0-12-5-12-10a6 6 0 0 1 10-4 6 6 0 0 1 10 0c-1 5-4 5-4 5s7-1 8-6a5 5 0 0 1 7 1c1 5-5 14-19 14Z" fill="#5CA86A" stroke="#2B2D31" stroke-width="1"/>
    `),
  },
  {
    id: 'papillon',
    label: 'Papillon',
    image: stickerSvg(`
      <path d="M31 20C21 4 8 8 11 19c-5 8 8 14 20 5ZM33 20C43 4 56 8 53 19c5 8-8 14-20 5Z" fill="#C89BE8" stroke="#2B2D31" stroke-width="1"/>
      <path d="M32 17v14M29 15l-5-6M35 15l5-6" stroke="#4A4640" stroke-width="1.5" stroke-linecap="round"/>
    `),
  },
  {
    id: 'exclamation',
    label: 'Point d’exclamation',
    image: stickerSvg(`
      <path d="M28 8h8l-2 17h-4Z" fill="#E8B44A" stroke="#2B2D31" stroke-width="1"/>
      <circle cx="32" cy="32" r="4" fill="#E8B44A" stroke="#2B2D31" stroke-width="1"/>
    `),
  },
]

export const PAPER_COLORS = [
  { nom: 'Crème', valeur: '#E9DFC8' },
  { nom: 'Ivoire', valeur: '#F1EAD9' },
  { nom: 'Vieilli', valeur: '#D9CBB0' },
  { nom: 'Brun-gris', valeur: '#3A3835' },
  { nom: 'Gris perle', valeur: '#D9D7D2' },
]

export const LAMP_COLORS = [
  { nom: 'Bleu-blanc', valeur: '#E6F0FF' },
  { nom: 'Lune', valeur: '#BFD4F5' },
  { nom: 'Glace', valeur: '#A9C9F2' },
  { nom: 'Lavande', valeur: '#D8BFF0' },
]

export const BEAM_SHAPES = [
  { id: 'cone', nom: 'Cône large' },
  { id: 'spot', nom: 'Spot' },
  { id: 'double', nom: 'Double faisceau' },
]

export const TYPING_TYPES = [
  { id: 'sec', nom: 'Sec' },
  { id: 'doux', nom: 'Doux' },
  { id: 'claquant', nom: 'Claquant' },
]

export const TYPING_MODES = [
  { id: 'ecraser', nom: 'Écraser' },
  { id: 'inserer', nom: 'Insérer' },
]

export const DEFAULT_SETTINGS = {
  mode: 'jour',
  paperColor: '#3A3835',
  grain: 0.5,
  patineRuban: false,
  inkIntensity: 100,
  fontSize: 15,
  lineHeight: 1.6,
  typingMode: 'ecraser',
  capsuleId: 'classique',
  charms: [],
  sound: {
    active: true,
    volume: 0.7,
    type: 'sec',
    haptiques: true,
  },
  lamp: {
    luminosite: 0.85,
    couleur: '#E6F0FF',
    intensite: 75,
    forme: 'cone',
    portee: 78,
    angle: 100,
  },
}

export function getCapsule(id) {
  return CAPSULES.find((capsule) => capsule.id === id) ?? CAPSULES[0]
}

export function getSticker(id) {
  return STICKERS.find((sticker) => sticker.id === id) ?? STICKERS[0]
}
