import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: {
    getPath(name: 'home' | 'userData' | 'temp') {
      switch (name) {
        case 'home':
          return '/Users/test-user'
        case 'userData':
          return '/Users/test-user/Library/Application Support/zhengdao'
        case 'temp':
        default:
          return '/tmp'
      }
    }
  }
}))

import { __testing, assertAllowedWritePath } from '../path-security'

const { isSameOrChildPath, getAllowedWriteRoots } = __testing

/**
 * SPLIT-007 — boundary-lock test for path-security.
 *
 * `assertAllowedWritePath` is the only safety gate between the renderer
 * (which can pass arbitrary paths via fs:writeFile / export:pdf /
 * data:exportFull) and the local filesystem. A regression here is a
 * security regression — these tests pin the allow/deny semantics.
 */

describe('isSameOrChildPath', () => {
  it('allows the root itself', () => {
    expect(isSameOrChildPath('/foo', '/foo')).toBe(true)
  })

  it('allows a nested file', () => {
    expect(isSameOrChildPath('/foo/bar/baz.txt', '/foo')).toBe(true)
  })

  it('rejects a sibling outside the root', () => {
    expect(isSameOrChildPath('/other/baz.txt', '/foo')).toBe(false)
  })

  it('rejects parent traversal', () => {
    expect(isSameOrChildPath('/foo/../etc/passwd', '/foo')).toBe(false)
  })
})

describe('getAllowedWriteRoots', () => {
  it('contains the standard user-known roots', () => {
    const roots = getAllowedWriteRoots()
    expect(roots.length).toBeGreaterThan(3)
    // userData + Documents + Downloads should always be allowed
    expect(roots.some((r) => r.includes('Application Support/zhengdao'))).toBe(true)
    expect(roots.some((r) => r.includes('Documents'))).toBe(true)
    expect(roots.some((r) => r.includes('Downloads'))).toBe(true)
  })
})

describe('assertAllowedWritePath', () => {
  it('allows a Documents-anchored path', () => {
    const out = assertAllowedWritePath('/Users/test-user/Documents/export.pdf')
    expect(out).toMatch(/Documents\/export\.pdf$/)
  })

  it('allows a Downloads-anchored path', () => {
    const out = assertAllowedWritePath('/Users/test-user/Downloads/zhengdao-export.db')
    expect(out).toMatch(/Downloads\/zhengdao-export\.db$/)
  })

  it('allows the userData directory', () => {
    const out = assertAllowedWritePath(
      '/Users/test-user/Library/Application Support/zhengdao/backups/now.db'
    )
    expect(out).toMatch(/zhengdao\/backups\/now\.db$/)
  })

  it('rejects a system path outside the user-known roots', () => {
    expect(() => assertAllowedWritePath('/etc/passwd')).toThrow(/Write denied/)
  })

  it('rejects writes into another users home', () => {
    expect(() => assertAllowedWritePath('/Users/other-user/Desktop/x.txt')).toThrow(/Write denied/)
  })
})
