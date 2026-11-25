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
  afficherMachine: false,
  sound: {
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
