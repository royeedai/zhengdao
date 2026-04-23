export type AiGlobalAccountStatusDraft = {
  id: number | null
  provider: string
  api_endpoint: string
  model: string
  api_key: string
}

export type AiGlobalAccountStatusRequest = {
  provider: string
  options: {
    probe: boolean
    config: {
      accountId: number | null
      api_key: string
      api_endpoint: string
      model: string
    }
  }
}

export function buildAiGlobalAccountStatusRequest(
  draft: AiGlobalAccountStatusDraft,
  probe = false
): AiGlobalAccountStatusRequest {
  return {
    provider: draft.provider,
    options: {
      probe,
      config: {
        accountId: draft.id,
        api_key: draft.api_key,
        api_endpoint: draft.api_endpoint,
        model: draft.model
      }
    }
  }
}
