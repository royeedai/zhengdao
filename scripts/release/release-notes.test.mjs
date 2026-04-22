import { describe, expect, it } from 'vitest'
import {
  buildGitHubReleaseBody,
  extractChangelogEntry,
  resolveVersionFromRef,
  updateGitHubReleaseNotes
} from './update-github-release-notes.mjs'

const changelog = `# Changelog

## v1.2.3 - 2026-04-22

### Release

- Fix release packaging native rebuild

### Fixed

- Disable electron-builder's default all-dependency native rebuild.

## v1.2.2 - 2026-04-22

### Release

- Previous release entry
`

describe('GitHub release notes generation', () => {
  it('extracts only the matching changelog entry', () => {
    const entry = extractChangelogEntry(changelog, '1.2.3')

    expect(entry).toContain('## v1.2.3 - 2026-04-22')
    expect(entry).toContain("Disable electron-builder's default all-dependency native rebuild.")
    expect(entry).not.toContain('## v1.2.2')
  })

  it('builds release body with changelog, assets, update metadata and release notes', () => {
    const body = buildGitHubReleaseBody({
      version: '1.2.3',
      changelogEntry: extractChangelogEntry(changelog, '1.2.3')
    })

    expect(body).toContain('## 更新日志')
    expect(body).toContain('## 安装包与自动更新')
    expect(body).toContain('## 发布注意事项')
    expect(body).toContain('zhengdao-1.2.3-arm64.dmg')
    expect(body).toContain('zhengdao-1.2.3-x64-setup.exe')
    expect(body).toContain('latest-mac.yml')
    expect(body).toContain('latest.yml')
    expect(body).not.toMatch(/Fill in|TODO/)
  })

  it('resolves versions from tag refs', () => {
    expect(resolveVersionFromRef('v1.2.3')).toBe('1.2.3')
    expect(resolveVersionFromRef('1.2.3')).toBe('1.2.3')
    expect(resolveVersionFromRef('refs/tags/v1.2.3')).toBe('1.2.3')
  })

  it('rejects placeholder changelog entries', () => {
    expect(() =>
      extractChangelogEntry(
        `# Changelog

## v1.2.3 - 2026-04-22

- TODO
`,
        '1.2.3'
      )
    ).toThrow(/placeholder/)
  })

  it('patches the GitHub Release body for the matching tag', async () => {
    const requests = []
    const fetchImpl = async (url, options = {}) => {
      requests.push({ url, options })

      if (String(url).endsWith('/releases/tags/v1.2.3')) {
        return new Response(JSON.stringify({ url: 'https://api.github.com/repos/owner/repo/releases/123' }), {
          status: 200
        })
      }

      return new Response('{}', { status: 200 })
    }

    await updateGitHubReleaseNotes({
      fetchImpl,
      token: 'test-token',
      repository: 'owner/repo',
      version: 'v1.2.3',
      body: 'release body'
    })

    expect(requests).toHaveLength(2)
    expect(requests[0].url).toBe('https://api.github.com/repos/owner/repo/releases/tags/v1.2.3')
    expect(requests[1].url).toBe('https://api.github.com/repos/owner/repo/releases/123')
    expect(requests[1].options.method).toBe('PATCH')
    expect(requests[1].options.headers.Authorization).toBe('Bearer test-token')
    expect(JSON.parse(requests[1].options.body)).toEqual({ body: 'release body' })
  })
})
