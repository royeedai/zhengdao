import { app } from 'electron'
import { realpathSync } from 'fs'
import { basename, dirname, isAbsolute, join, normalize, relative, resolve } from 'path'

/**
 * SPLIT-007 — write-path security helpers.
 *
 * fs:writeFile / export:pdf / data:exportFull all funnel through
 * `assertAllowedWritePath` so a renderer-supplied path cannot escape
 * the user-known directories. Pulled out of ipc-handlers.ts so a
 * future "allow more dirs" change touches one file.
 */

function resolveWritablePath(filePath: string): string {
  const resolved = resolve(normalize(filePath))
  try {
    return realpathSync.native(resolved)
  } catch {
    try {
      return join(realpathSync.native(dirname(resolved)), basename(resolved))
    } catch {
      return resolved
    }
  }
}

function isSameOrChildPath(target: string, root: string): boolean {
  const rel = relative(root, target)
  return rel === '' || (!!rel && !rel.startsWith('..') && !isAbsolute(rel))
}

function getAllowedWriteRoots(): string[] {
  const homeDir = app.getPath('home')
  const roots = [
    app.getPath('userData'),
    app.getPath('temp'),
    resolve('/tmp'),
    resolve('/private/tmp'),
    resolve(homeDir, 'Desktop'),
    resolve(homeDir, 'Documents'),
    resolve(homeDir, 'Downloads')
  ]

  return Array.from(new Set(roots.map(resolveWritablePath)))
}

export function assertAllowedWritePath(filePath: string): string {
  const resolved = resolveWritablePath(filePath)
  const allowed = getAllowedWriteRoots().some((root) => isSameOrChildPath(resolved, root))
  if (!allowed) {
    throw new Error(`Write denied: path "${resolved}" is outside allowed directories`)
  }
  return resolved
}

// Test-only re-exports so internals.test can pin the contract without
// duplicating the path-walking logic.
export const __testing = {
  resolveWritablePath,
  isSameOrChildPath,
  getAllowedWriteRoots
}
