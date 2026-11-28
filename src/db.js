import { openDB } from 'idb'
import { APP_NAME, DEFAULT_SETTINGS } from './data.js'

const DB_NAME = 'confesse-moi'
const DB_VERSION = 1
const SETTINGS_KEY = 'app'
const TRASH_RETENTION_MS = 7 * 24 * 60 * 60 * 1000

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
  return notes.filter((note) => !note.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function listTrashedNotes() {
  const db = await getDb()
  const notes = await db.getAll('notes')
  return notes.filter((note) => note.deletedAt).sort((a, b) => b.deletedAt - a.deletedAt)
}

export async function getNote(id) {
  return (await getDb()).get('notes', id)
}

export async function saveNote(note) {
  return (await getDb()).put('notes', note)
}

// Une suppression déplace la note dans la corbeille ; elle n’est effacée
// que par purgeNotes() ou lors de la rotation des 7 jours.
export async function deleteNote(id) {
  const db = await getDb()
  const note = await db.get('notes', id)
  if (!note || note.deletedAt) return
  await db.put('notes', { ...note, deletedAt: Date.now() })
}

export async function deleteNotes(ids) {
  const db = await getDb()
  const transaction = db.transaction('notes', 'readwrite')
  const store = transaction.objectStore('notes')
  const now = Date.now()
  for (const id of ids) {
    const note = await store.get(id)
    if (note && !note.deletedAt) await store.put({ ...note, deletedAt: now })
  }
  await transaction.done
}

export async function restoreNotes(ids) {
  const db = await getDb()
  const transaction = db.transaction('notes', 'readwrite')
  const store = transaction.objectStore('notes')
  for (const id of ids) {
    const note = await store.get(id)
    if (!note?.deletedAt) continue
    const { deletedAt, ...restored } = note
    await store.put(restored)
  }
  await transaction.done
}

export async function purgeNotes(ids) {
  const db = await getDb()
  const transaction = db.transaction('notes', 'readwrite')
  const store = transaction.objectStore('notes')
  for (const id of ids) await store.delete(id)
  await transaction.done
}

export async function purgeExpiredTrash() {
  const db = await getDb()
  const notes = await db.getAll('notes')
  const expired = notes
    .filter((note) => note.deletedAt && Date.now() - note.deletedAt >= TRASH_RETENTION_MS)
    .map((note) => note.id)
  if (expired.length) await purgeNotes(expired)
  return expired.length
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
  const [notes, corbeille, settings] = await Promise.all([listNotes(), listTrashedNotes(), loadSettings()])
  return {
    application: APP_NAME,
    version: 2,
    exportéLe: new Date().toISOString(),
    notes,
    corbeille,
    réglages: settings,
  }
}

export async function importBackup(data) {
  if (!data || (!Array.isArray(data.notes) && !Array.isArray(data.corbeille))) {
    throw new Error('Fichier de sauvegarde invalide.')
  }
  const db = await getDb()
  const transaction = db.transaction(['notes', 'settings'], 'readwrite')
  const store = transaction.objectStore('notes')
  for (const note of data.notes ?? []) {
    if (note && typeof note.id === 'string') await store.put(note)
  }
  // La corbeille est importée en dernier : en cas d’id dupliqué, c’est son
  // état supprimé qui fait foi.
  for (const note of data.corbeille ?? []) {
    if (note && typeof note.id === 'string') {
      await store.put({ ...note, deletedAt: Number(note.deletedAt) || Date.now() })
    }
  }
  if (data.réglages) {
    await transaction.objectStore('settings').put({ key: SETTINGS_KEY, value: data.réglages })
  }
  await transaction.done
}
