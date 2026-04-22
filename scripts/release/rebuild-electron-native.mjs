import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const electronVersion = require('electron/package.json').version
const rebuildCli = require.resolve('@electron/rebuild/lib/cli.js')
const arch = process.argv[2] || process.arch

export function buildElectronRebuildArgs({ rebuildCli, electronVersion, arch, moduleDir }) {
  return [
    rebuildCli,
    '--force',
    '--only',
    'better-sqlite3',
    '--version',
    electronVersion,
    '--arch',
    arch,
    '--module-dir',
    moduleDir
  ]
}

export function rebuildElectronNative(targetArch = arch) {
  console.log(`Rebuilding native modules for Electron ${electronVersion} (${targetArch})`)

  execFileSync(process.execPath, buildElectronRebuildArgs({
    rebuildCli,
    electronVersion,
    arch: targetArch,
    moduleDir: repoRoot
  }), {
    cwd: repoRoot,
    stdio: 'inherit'
  })
}

function isEntrypoint() {
  return process.argv[1] === fileURLToPath(import.meta.url)
}

if (isEntrypoint()) {
  rebuildElectronNative()
}
