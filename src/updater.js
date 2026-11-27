// Rechargement silencieux des onglets déjà ouverts après un nouveau déploiement.
// Fonctionne avec le service worker (HTTPS / installé) et sans lui (IP LAN en http).

const CHECK_MS = 45_000
const TYPING_GRACE_MS = 1_500

let remoteVersion = null
let reloading = false
let registration = null

function localVersion() {
  return document.querySelector('meta[name="confesse-version"]')?.content ?? ''
}

function reloadOnce() {
  if (reloading) return
  reloading = true
  window.location.reload()
}

async function readVersion() {
  try {
    const url = `${import.meta.env.BASE_URL}version.json?t=${Date.now()}`
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) return null
    const data = await response.json()
    return typeof data.version === 'string' ? data.version : null
  } catch {
    // Hors ligne : on garde la version courante, on réessaiera plus tard.
    return null
  }
}

function isTyping() {
  return performance.now() - lastInputAt < TYPING_GRACE_MS
}

let lastInputAt = 0
function markInput() {
  lastInputAt = performance.now()
}

async function check() {
  if (reloading || remoteVersion) return
  const version = await readVersion()
  if (!version || version === localVersion()) return
  remoteVersion = version
  if (isTyping()) {
    // Une frappe est en cours : on réessaie dès qu’elle s’arrête.
    window.setTimeout(() => {
      remoteVersion = null
      void check()
    }, TYPING_GRACE_MS)
    return
  }
  try {
    registration?.waiting?.postMessage?.({ type: 'SKIP_WAITING' })
  } catch {
    // Pas de service worker actif sur cette origine (http LAN) : on recharge quand même.
  }
  window.setTimeout(reloadOnce, registration ? 80 : 0)
}

export function startUpdater() {
  if (!import.meta.env.PROD) return

  document.addEventListener('keydown', markInput, true)
  document.addEventListener('input', markInput, true)

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (remoteVersion) reloadOnce()
    })
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' })
      .then((current) => {
        registration = current
        current.addEventListener('updatefound', () => {
          const worker = current.installing
          if (!worker) return
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              worker.postMessage({ type: 'SKIP_WAITING' })
            }
          })
        })
        void check()
      })
      .catch(() => void check())
  }

  void check()
  window.setInterval(() => void check(), CHECK_MS)
  for (const event of ['focus', 'pageshow']) window.addEventListener(event, () => void check())
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void check()
  })
}
