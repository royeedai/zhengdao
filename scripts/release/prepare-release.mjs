import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildChangelogEntry,
  bumpSemver,
  formatReleaseDate,
  parseReleaseArgs,
  prependChangelogEntry
} from './release-utils.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const packageJsonPath = resolve(repoRoot, 'package.json')
const changelogPath = resolve(repoRoot, 'CHANGELOG.md')

function readPackageJson() {
  return JSON.parse(readFileSync(packageJsonPath, 'utf8'))
}

function resolveTargetVersion(currentVersion, args) {
  if (args.explicitVersion) {
    return args.explicitVersion
  }

  return bumpSemver(currentVersion, args.releaseType)
}

export function prepareRelease(argv = process.argv.slice(2)) {
  const args = parseReleaseArgs(argv)
  const pkg = readPackageJson()
  const nextVersion = resolveTargetVersion(pkg.version, args)
  const date = formatReleaseDate()
  const changelogEntry = buildChangelogEntry({
    version: nextVersion,
    summary: args.summary,
    date
  })

  if (args.dryRun) {
    return {
      version: nextVersion,
      date,
      changelogEntry,
      dryRun: true
    }
  }

  execFileSync('npm', ['version', nextVersion, '--no-git-tag-version'], {
    cwd: repoRoot,
    stdio: 'inherit'
  })

  const existingChangelog = existsSync(changelogPath)
    ? readFileSync(changelogPath, 'utf8')
    : '# Changelog\n'

  const updatedChangelog = prependChangelogEntry(existingChangelog, changelogEntry)
  writeFileSync(changelogPath, updatedChangelog, 'utf8')

  return {
    version: nextVersion,
    date,
    changelogEntry,
    dryRun: false
  }
}

function isEntrypoint() {
  return process.argv[1] === fileURLToPath(import.meta.url)
}

if (isEntrypoint()) {
  try {
    const result = prepareRelease()

    console.log(`Prepared release v${result.version}`)
    console.log(result.changelogEntry)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
