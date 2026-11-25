import { spawn } from 'node:child_process'
import { existsSync, watch } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const root = process.cwd()
// Sous Windows, npm est un .cmd : Node exige shell: true depuis la version 22.
const isWindows = process.platform === 'win32'
const npm = isWindows ? 'npm.cmd' : 'npm'
const options = { cwd: root, stdio: 'inherit', shell: isWindows }

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, options)
    child.on('error', (error) => {
      console.error(`[auto-deploy] ${command} ${args.join(' ')} : ${error.message}`)
      resolve(false)
    })
    child.on('exit', (code) => resolve(code === 0))
  })
}

let building = false
let pending = false

async function build() {
  if (building) {
    pending = true
    return
  }
  building = true
  const ok = await run(npm, ['run', 'build'])
  building = false
  if (!ok) console.error('[auto-deploy] compilation échouée')
  if (pending) {
    pending = false
    await build()
  }
}

// On compile d’abord pour ne jamais servir un dossier dist vide.
await build()

// Serveur permanent sur TOUTES les interfaces, Wi-Fi inclus (0.0.0.0).
const preview = spawn(npm, ['run', 'preview', '--', '--port', '4173', '--strictPort'], options)
preview.on('error', (error) => console.error('[auto-deploy] preview :', error.message))
preview.on('exit', (code) => process.exit(code ?? 1))

const addresses = Object.values(os.networkInterfaces())
  .flat()
  .filter((entry) => entry && entry.family === 'IPv4' && !entry.internal)
  .map((entry) => entry.address)
console.log(`[auto-deploy] Mobile (même Wi-Fi) : ${addresses.map((ip) => `http://${ip}:4173/`).join(' | ')}`)

// Recompile automatiquement quand une source change ; vite preview sert
// dist/ en direct, sans redémarrage ni coupure.
let timer = null
function scheduleBuild() {
  clearTimeout(timer)
  timer = setTimeout(() => { void build() }, 300)
}

function watchPath(target, recursive = false) {
  try {
    watch(target, recursive ? { recursive: true } : {}, scheduleBuild)
  } catch (error) {
    console.warn(`[auto-deploy] surveillance ignorée (${target}) : ${error.message}`)
  }
}

watchPath(path.join(root, 'src'), true)
if (existsSync(path.join(root, 'public'))) watchPath(path.join(root, 'public'), true)
for (const file of ['index.html', 'vite.config.js', 'package.json']) {
  watchPath(path.join(root, file))
}
