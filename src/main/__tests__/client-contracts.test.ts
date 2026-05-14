import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

interface ClientPlatformFixture {
  desktop: {
    createBookRequest: {
      deviceId: string
      payloadSchemaVersion: number
      payload: {
        export_version: number
        book: Record<string, unknown>
        chapters: Array<Record<string, unknown>>
      }
    }
    updateBookRequest: {
      expectedVersion: number
      payloadSchemaVersion: number
      payload: {
        export_version: number
      }
    }
  }
  errors: {
    versionConflict: {
      status: number
      body: {
        code: string
        current?: {
          version?: number
        }
      }
    }
  }
  assistant: {
    nonStreamResponse: {
      message: {
        content: string
        metadata?: {
          authorThought?: { lines?: string[] }
        }
      }
      metadata?: {
        authorThought?: { lines?: string[] }
      }
    }
  }
  toolbox: {
    catalogResponse: {
      launchSurfaces: string[]
      contentPolicy: {
        noCompetitorCopying: boolean
        aiWritesRequireDraftBasket: boolean
      }
      tools: Array<{
        slug: string
        surfaces: string[]
        aiDraftBoundary: boolean
      }>
    }
    parityResponse: {
      items: Array<{ competitor: string; coverage: string }>
    }
    workspaceResponse: {
      schemaVersion: string
      assets: Array<{ assetKind: string; syncStatus: string; contentHash: string }>
      publications: Array<{ visibility: string; accessRules: { externalCheckout: boolean } }>
      runs: Array<{ toolSlug: string; requiresDraftBasket: boolean }>
    }
  }
}

function readClientFixture(): ClientPlatformFixture {
  return JSON.parse(
    readFileSync(
      resolve(process.cwd(), '../agentx-backend/packages/client-contracts/fixtures/client-platform-golden.json'),
      'utf8'
    )
  ) as ClientPlatformFixture
}

describe('desktop client contract parity', () => {
  it('uses the backend-owned desktop book package contract fixture', () => {
    const fixture = readClientFixture()

    expect(fixture.desktop.createBookRequest.payloadSchemaVersion).toBe(2)
    expect(fixture.desktop.createBookRequest.payload.export_version).toBe(2)
    expect(fixture.desktop.updateBookRequest.expectedVersion).toBeGreaterThan(0)
    expect(fixture.desktop.updateBookRequest.payload.export_version).toBe(2)
  })

  it('keeps the desktop sync fixture sanitized for client parity tests', () => {
    const fixtureText = readFileSync(
      resolve(process.cwd(), '../agentx-backend/packages/client-contracts/fixtures/client-platform-golden.json'),
      'utf8'
    )

    const credentialPatterns = [
      /api[_-]?key/i,
      /"token"\s*:/i,
      /"(?:access|refresh|session|auth|id|bearer|jwt)[_-]?token"\s*:/i,
      /token[_-]?(?:secret|value)/i,
      /cookie/i,
      /credential/i,
    ]

    for (const pattern of credentialPatterns) {
      expect(fixtureText).not.toMatch(pattern)
    }
  })

  it('recognizes the shared optimistic conflict error envelope', () => {
    const fixture = readClientFixture()

    expect(fixture.errors.versionConflict.status).toBe(409)
    expect(fixture.errors.versionConflict.body.code).toBe('VERSION_CONFLICT')
    expect(fixture.errors.versionConflict.body.current?.version).toBeGreaterThan(0)
  })

  it('recognizes assistant presentation metadata without visible control markers', () => {
    const fixture = readClientFixture()

    expect(fixture.assistant.nonStreamResponse.message.content).not.toContain('<<<AUTHOR_THOUGHT_BLOCK>>>')
    expect(fixture.assistant.nonStreamResponse.message.metadata?.authorThought?.lines).toHaveLength(2)
    expect(fixture.assistant.nonStreamResponse.metadata?.authorThought?.lines).toEqual(
      fixture.assistant.nonStreamResponse.message.metadata?.authorThought?.lines
    )
  })

  it('recognizes creative toolbox contract coverage for desktop project use', () => {
    const fixture = readClientFixture()
    const slugs = new Set(fixture.toolbox.catalogResponse.tools.map((tool) => tool.slug))

    expect(fixture.toolbox.catalogResponse.launchSurfaces).toContain('desktop_project')
    expect(fixture.toolbox.catalogResponse.contentPolicy.noCompetitorCopying).toBe(true)
    expect(fixture.toolbox.catalogResponse.contentPolicy.aiWritesRequireDraftBasket).toBe(true)
    expect(Array.from(slugs)).toEqual(expect.arrayContaining(['world-bible', 'rpg-campaign']))
    expect(fixture.toolbox.parityResponse.items.some((item) => item.competitor === 'world_anvil')).toBe(true)
    expect(fixture.toolbox.workspaceResponse.assets[0]).toMatchObject({
      assetKind: 'interactive-map',
      syncStatus: 'pending'
    })
    expect(fixture.toolbox.workspaceResponse.publications[0].accessRules.externalCheckout).toBe(false)
    expect(fixture.toolbox.workspaceResponse.runs[0].requiresDraftBasket).toBe(true)
  })
})
