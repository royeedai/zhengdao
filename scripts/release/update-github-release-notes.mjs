import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeVersion(version) {
  return String(version || '').trim().replace(/^v/, '')
}

export function resolveVersionFromRef(refName) {
  const tagName = String(refName || '').trim().replace(/^refs\/tags\//, '')
  const version = normalizeVersion(tagName)

  if (!version) {
    throw new Error('Missing release version')
  }

  return version
}

export function extractChangelogEntry(changelog, version) {
  const normalizedVersion = normalizeVersion(version)
  const headerPattern = new RegExp(`^## v${escapeRegExp(normalizedVersion)}(?:\\s+-[^\\n]*)?\\n`, 'm')
  const match = changelog.match(headerPattern)

  if (!match) {
    throw new Error(`Missing CHANGELOG entry for v${normalizedVersion}`)
  }

  const start = match.index ?? 0
  const afterHeader = start + match[0].length
  const rest = changelog.slice(afterHeader)
  const nextEntry = rest.match(/^## v\d/m)
  const end = nextEntry?.index === undefined ? changelog.length : afterHeader + nextEntry.index
  const entry = changelog.slice(start, end).trim()

  if (/Fill in|TODO/.test(entry)) {
    throw new Error(`CHANGELOG entry for v${normalizedVersion} still contains placeholder text`)
  }

  return entry
}

export function buildGitHubReleaseBody({ version, changelogEntry }) {
  const normalizedVersion = normalizeVersion(version)

  return [
    `# 证道 v${normalizedVersion}`,
    '## 更新日志',
    changelogEntry.trim(),
    '## 安装包与自动更新',
    `- macOS Apple Silicon DMG: \`zhengdao-${normalizedVersion}-arm64.dmg\``,
    `- macOS Apple Silicon ZIP: \`zhengdao-${normalizedVersion}-arm64.zip\``,
    `- Windows x64 installer: \`zhengdao-${normalizedVersion}-x64-setup.exe\``,
    '- 自动更新元数据：`latest-mac.yml`、`latest.yml`',
    '- 差分更新辅助文件：对应 `.blockmap` 文件',
    '## 发布注意事项',
    '- macOS 包仍按当前配置未签名、未公证；这是公开测试分发包，不等于完成正式签名链路。',
    '- 发布完成必须同时满足：release workflow 成功、安装包存在、自动更新元数据存在、Release 正文包含更新日志。',
    '- 如发现启动、数据库 ABI、更新元数据或安装包问题，回退到上一条已验证 Release。'
  ].join('\n\n')
}

function resolveRepository(env) {
  if (env.GITHUB_REPOSITORY) {
    return env.GITHUB_REPOSITORY
  }

  if (env.GH_OWNER && env.GH_REPO) {
    return `${env.GH_OWNER}/${env.GH_REPO}`
  }

  throw new Error('Missing GitHub repository. Set GITHUB_REPOSITORY or GH_OWNER/GH_REPO.')
}

async function readErrorBody(response) {
  try {
    return await response.text()
  } catch {
    return ''
  }
}

export async function updateGitHubReleaseNotes({
  fetchImpl = globalThis.fetch,
  token,
  repository,
  version,
  body
}) {
  if (!fetchImpl) {
    throw new Error('Global fetch is unavailable')
  }

  if (!token) {
    throw new Error('Missing GITHUB_TOKEN')
  }

  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28'
  }
  const tag = `v${normalizeVersion(version)}`
  const releaseUrl = `https://api.github.com/repos/${repository}/releases/tags/${tag}`
  const releaseResponse = await fetchImpl(releaseUrl, { headers })

  if (!releaseResponse.ok) {
    const errorBody = await readErrorBody(releaseResponse)
    throw new Error(`Failed to load GitHub Release ${tag}: ${releaseResponse.status} ${errorBody}`)
  }

  const release = await releaseResponse.json()
  const updateResponse = await fetchImpl(release.url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ body })
  })

  if (!updateResponse.ok) {
    const errorBody = await readErrorBody(updateResponse)
    throw new Error(`Failed to update GitHub Release ${tag}: ${updateResponse.status} ${errorBody}`)
  }
}

function readReleaseBody() {
  const packageJson = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'))
  const version = resolveVersionFromRef(process.env.GITHUB_REF_NAME || packageJson.version)
  const changelog = readFileSync(resolve(repoRoot, 'CHANGELOG.md'), 'utf8')
  const changelogEntry = extractChangelogEntry(changelog, version)

  return {
    version,
    body: buildGitHubReleaseBody({ version, changelogEntry })
  }
}

function isEntrypoint() {
  return process.argv[1] === fileURLToPath(import.meta.url)
}

if (isEntrypoint()) {
  try {
    const repository = resolveRepository(process.env)
    const { version, body } = readReleaseBody()

    await updateGitHubReleaseNotes({
      token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN,
      repository,
      version,
      body
    })

    console.log(`Updated GitHub Release notes for v${version}.`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
