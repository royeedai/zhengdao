import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareRelease } from './prepare-release.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

function run(command, args) {
  execFileSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit'
  })
}

function read(command, args) {
  return execFileSync(command, args, {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe']
  })
    .toString()
    .trim()
}

function ensureGitRepository() {
  try {
    read('git', ['rev-parse', '--is-inside-work-tree'])
  } catch {
    throw new Error('release:publish must be run inside a git repository')
  }
}

function ensureCleanWorktree() {
  const status = read('git', ['status', '--porcelain'])

  if (status) {
    throw new Error('release:publish requires a clean git worktree')
  }
}

function resolveCurrentBranch() {
  const branch = read('git', ['branch', '--show-current'])
  return branch || 'main'
}

try {
  ensureGitRepository()
  ensureCleanWorktree()

  const result = prepareRelease(process.argv.slice(2))
  const branch = resolveCurrentBranch()
  const tag = `v${result.version}`

  run('npm', ['test'])
  run('npm', ['run', 'build'])
  run('git', ['add', 'package.json', 'package-lock.json', 'CHANGELOG.md'])
  run('git', ['commit', '-m', `release: ${tag}`])
  run('git', ['tag', tag])
  run('git', ['push', 'origin', branch])
  run('git', ['push', 'origin', tag])

  console.log(`Published ${tag}. GitHub Actions should now build and upload the release artifacts.`)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
