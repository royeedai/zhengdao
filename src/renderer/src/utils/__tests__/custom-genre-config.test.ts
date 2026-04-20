import { describe, expect, it } from 'vitest'
import { buildGenreConfigPayload, deriveGenreEditorState } from '../custom-genre-config'

const builtInPreset = {
  id: 'urban',
  name: '都市商战',
  character_fields: [{ key: 'skill', label: '核心底牌', type: 'text' as const }],
  faction_labels: [{ value: 'enemy', label: '反派', color: 'red' }],
  status_labels: [{ value: 'active', label: '活跃' }],
  emotion_labels: [{ score: 1, label: '铺垫' }]
}

describe('deriveGenreEditorState', () => {
  it('treats a non built-in genre id as a custom genre and preserves its current templates', () => {
    expect(
      deriveGenreEditorState(
        {
          genre: 'my-wuxia',
          character_fields: [{ key: 'weapon', label: '兵器', type: 'text' }],
          faction_labels: [{ value: 'ally', label: '盟友', color: '#10b981' }],
          status_labels: [{ value: 'alive', label: '在场' }],
          emotion_labels: [{ score: 5, label: '大高潮' }]
        },
        [builtInPreset]
      )
    ).toMatchObject({
      mode: 'custom',
      genreId: 'my-wuxia',
      genreName: 'my-wuxia',
      customPreset: {
        id: 'my-wuxia',
        name: 'my-wuxia'
      }
    })
  })
})

describe('buildGenreConfigPayload', () => {
  it('builds a current-book custom genre payload from editor state', () => {
    expect(
      buildGenreConfigPayload({
        mode: 'custom',
        builtInGenreId: 'urban',
        customPreset: {
          id: 'my-wuxia',
          name: '江湖武侠',
          character_fields: [{ key: 'weapon', label: '兵器', type: 'text' }],
          faction_labels: [{ value: 'ally', label: '盟友', color: '#10b981' }],
          status_labels: [{ value: 'alive', label: '在场' }],
          emotion_labels: [{ score: 5, label: '大高潮' }]
        }
      })
    ).toEqual({
      genre: 'my-wuxia',
      character_fields: [{ key: 'weapon', label: '兵器', type: 'text' }],
      faction_labels: [{ value: 'ally', label: '盟友', color: '#10b981' }],
      status_labels: [{ value: 'alive', label: '在场' }],
      emotion_labels: [{ score: 5, label: '大高潮' }]
    })
  })
})
