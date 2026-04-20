export type AiProvider = 'openai' | 'gemini' | 'ollama' | 'custom'

export interface AiConfig {
  ai_provider: AiProvider
  ai_api_key: string
  ai_api_endpoint: string
  ai_model: string
}

export type AiCallerConfig = Omit<AiConfig, 'ai_provider'> & {
  ai_provider?: AiProvider | string
}

export interface AiResponse {
  content: string
  error?: string
}

export interface AiStreamCallbacks {
  onToken: (token: string) => void
  onComplete: (fullText: string) => void
  onError: (error: string) => void
}

export interface AiProviderAdapter {
  complete(
    config: AiConfig,
    systemPrompt: string,
    userPrompt: string,
    maxTokens?: number,
    temperature?: number
  ): Promise<AiResponse>
  stream(
    config: AiConfig,
    systemPrompt: string,
    userPrompt: string,
    callbacks: AiStreamCallbacks,
    maxTokens?: number,
    temperature?: number
  ): Promise<void>
}
