import { describe, expect, it } from 'vitest'
import { buildAiGlobalAccountStatusRequest } from '../global-account-status'

describe('buildAiGlobalAccountStatusRequest', () => {
  it('passes the in-progress draft secret for unsaved accounts', () => {
    expect(
      buildAiGlobalAccountStatusRequest({
        id: null,
        provider: 'openai',
        api_endpoint: 'http://127.0.0.1:8045/v1',
        model: 'gemini-3-flash',
        api_key: 'local-token'
      }, true)
    ).toEqual({
      provider: 'openai',
      options: {
        probe: true,
        config: {
          accountId: null,
          api_key: 'local-token',
          api_endpoint: 'http://127.0.0.1:8045/v1',
          model: 'gemini-3-flash'
        }
      }
    })
  })

  it('keeps the saved account id so the main process can reuse the stored secret', () => {
    expect(
      buildAiGlobalAccountStatusRequest({
        id: 12,
        provider: 'custom',
        api_endpoint: 'https://example.test/v1',
        model: 'gpt-4o-mini',
        api_key: ''
      })
    ).toEqual({
      provider: 'custom',
      options: {
        probe: false,
        config: {
          accountId: 12,
          api_key: '',
          api_endpoint: 'https://example.test/v1',
          model: 'gpt-4o-mini'
        }
      }
    })
  })
})
