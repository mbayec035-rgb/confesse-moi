import { openDB } from 'idb'
import { APP_NAME, DEFAULT_SETTINGS } from './data.js'

const DB_NAME = 'confesse-moi'
const DB_VERSION = 1
const SETTINGS_KEY = 'app'

let dbPromise

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('notes')) db.createObjectStore('notes', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' })
      },
    })
  }
  return dbPromise
}

export async function initStorage() {
  try {
    const db = await getDb()
    if (navigator.storage?.persisted && navigator.storage?.persist) {
      const already = await navigator.storage.persisted()
      if (!already) await navigator.storage.persist()
    }
    return Boolean(db)
  } catch (error) {
    console.warn('Stockage indisponible :', error)
    return false
  }
}

export async function listNotes() {
  const db = await getDb()
  const notes = await db.getAll('notes')
  return notes.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getNote(id) {
  return (await getDb()).get('notes', id)
}

export async function saveNote(note) {
  return (await getDb()).put('notes', note)
}

export async function deleteNote(id) {
  return (await getDb()).delete('notes', id)
}

export async function loadSettings() {
  const db = await getDb()
  const stored = await db.get('settings', SETTINGS_KEY)
  const storedSound = { ...(stored?.value?.sound ?? {}) }
  delete storedSound.cloche
  return {
    ...DEFAULT_SETTINGS,
    ...stored?.value,
    lamp: { ...DEFAULT_SETTINGS.lamp, ...stored?.value?.lamp },
    sound: { ...DEFAULT_SETTINGS.sound, ...storedSound },
  }
}

export async function saveSettings(settings) {
  return (await getDb()).put('settings', { key: SETTINGS_KEY, value: settings })
}

export async function exportBackup() {
  const [notes, settings] = await Promise.all([listNotes(), loadSettings()])
  return {
    application: APP_NAME,
    version: 1,
    exportéLe: new Date().toISOString(),
    notes,
    réglages: settings,
  }
}

export async function importBackup(data) {
  if (!data || !Array.isArray(data.notes)) throw new Error('Fichier de sauvegarde invalide.')
  const db = await getDb()
  const transaction = db.transaction(['notes', 'settings'], 'readwrite')
  for (const note of data.notes) {
    if (note && typeof note.id === 'string') await transaction.objectStore('notes').put(note)
  }
  if (data.réglages) {
    await transaction.objectStore('settings').put({ key: SETTINGS_KEY, value: data.réglages })
  }
  await transaction.done
}
