export interface AiConfig {
  ai_provider?: string
  ai_api_key: string
  ai_api_endpoint: string
  ai_model: string
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

type AiFetchOpts = {
  signal?: AbortSignal
}

function missingConfig(config: AiConfig): AiResponse | null {
  if (!config.ai_api_key || !config.ai_api_endpoint) {
    return { content: '', error: '请先在项目设置中配置 AI 助手 API' }
  }
  return null
}

async function parseJsonResponse(response: Response): Promise<{ content: string; error?: string }> {
  try {
    const data = await response.json()
    const text = data?.choices?.[0]?.message?.content ?? ''
    return { content: typeof text === 'string' ? text : String(text) }
  } catch {
    return { content: '', error: '无法解析 AI 响应' }
  }
}

export async function aiComplete(
  config: AiConfig,
  prompt: string,
  context: string,
  opts?: AiFetchOpts
): Promise<AiResponse> {
  const missing = missingConfig(config)
  if (missing) return missing

  try {
    const response = await fetch(config.ai_api_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.ai_api_key}`
      },
      body: JSON.stringify({
        model: config.ai_model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              '你是一位优秀的网文作家助手。请根据已有内容自然地续写，保持风格一致。只输出续写内容，不要解释。'
          },
          { role: 'user', content: `${prompt}\n\n已有内容：\n${context}` }
        ],
        max_tokens: 500,
        temperature: 0.8
      }),
      signal: opts?.signal
    })

    if (!response.ok) {
      return { content: '', error: `AI 请求失败: HTTP ${response.status}` }
    }
    return parseJsonResponse(response)
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { content: '', error: undefined }
    }
    return { content: '', error: `AI 请求失败: ${(err as Error).message}` }
  }
}

export async function aiCompleteStream(
  config: AiConfig,
  prompt: string,
  context: string,
  callbacks: AiStreamCallbacks,
  opts?: AiFetchOpts
): Promise<void> {
  const missing = missingConfig(config)
  if (missing) {
    callbacks.onError(missing.error || '配置缺失')
    return
  }

  let full = ''
  try {
    const response = await fetch(config.ai_api_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.ai_api_key}`
      },
      body: JSON.stringify({
        model: config.ai_model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              '你是一位优秀的网文作家助手。请根据已有内容自然地续写，保持风格一致。只输出续写内容，不要解释。'
          },
          { role: 'user', content: `${prompt}\n\n已有内容：\n${context}` }
        ],
        max_tokens: 500,
        temperature: 0.8,
        stream: true
      }),
      signal: opts?.signal
    })

    if (!response.ok || !response.body) {
      callbacks.onError(`AI 请求失败: HTTP ${response.status}`)
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (payload === '[DONE]') continue
        try {
          const json = JSON.parse(payload)
          const piece = json?.choices?.[0]?.delta?.content as string | undefined
          if (piece) {
            full += piece
            callbacks.onToken(piece)
          }
        } catch {
          void 0
        }
      }
    }

    callbacks.onComplete(full)
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      callbacks.onComplete(full)
      return
    }
    callbacks.onError(`AI 请求失败: ${(err as Error).message}`)
  }
}

export async function aiSummarize(
  config: AiConfig,
  chapterContent: string,
  opts?: AiFetchOpts
): Promise<AiResponse> {
  const missing = missingConfig(config)
  if (missing) return missing

  try {
    const response = await fetch(config.ai_api_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.ai_api_key}`
      },
      body: JSON.stringify({
        model: config.ai_model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              '你是编辑助理。请用两三句话概括本章剧情要点与情绪走向，客观中立，不要评价文笔。只输出摘要正文。'
          },
          {
            role: 'user',
            content: `请为下列章节正文生成摘要：\n\n${chapterContent}`
          }
        ],
        max_tokens: 400,
        temperature: 0.5
      }),
      signal: opts?.signal
    })

    if (!response.ok) {
      return { content: '', error: `AI 请求失败: HTTP ${response.status}` }
    }
    return parseJsonResponse(response)
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { content: '', error: undefined }
    }
    return { content: '', error: `AI 请求失败: ${(err as Error).message}` }
  }
}

export async function aiAnalyzeStyle(
  config: AiConfig,
  text: string,
  opts?: AiFetchOpts
): Promise<AiResponse> {
  const missing = missingConfig(config)
  if (missing) return missing

  try {
    const response = await fetch(config.ai_api_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.ai_api_key}`
      },
      body: JSON.stringify({
        model: config.ai_model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              '你是文学风格分析师。阅读给定小说文本，输出一个 JSON 对象（不要 markdown 代码围栏），键为：句长均衡度、对话叙事比、用词丰富度、节奏感、画面感、情感张力，值均为 1-10 的整数；另含 "summary" 字符串键，为 2-4 句中文简评。只输出 JSON。'
          },
          { role: 'user', content: text.slice(0, 120000) }
        ],
        max_tokens: 600,
        temperature: 0.4
      }),
      signal: opts?.signal
    })

    if (!response.ok) {
      return { content: '', error: `AI 请求失败: HTTP ${response.status}` }
    }
    return parseJsonResponse(response)
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { content: '', error: undefined }
    }
    return { content: '', error: `AI 请求失败: ${(err as Error).message}` }
  }
}

export async function aiPolish(config: AiConfig, text: string, opts?: AiFetchOpts): Promise<AiResponse> {
  const missing = missingConfig(config)
  if (missing) return missing

  try {
    const response = await fetch(config.ai_api_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.ai_api_key}`
      },
      body: JSON.stringify({
        model: config.ai_model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              '你是一位网文编辑，请润色以下文字，保持原意和风格，使文笔更加流畅生动。只输出润色后的文字。'
          },
          { role: 'user', content: text }
        ],
        max_tokens: 1000,
        temperature: 0.6
      }),
      signal: opts?.signal
    })

    if (!response.ok) {
      return { content: '', error: `AI 请求失败: HTTP ${response.status}` }
    }
    return parseJsonResponse(response)
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { content: '', error: undefined }
    }
    return { content: '', error: `AI 请求失败: ${(err as Error).message}` }
  }
}

export async function aiGenerateNames(
  config: AiConfig,
  genre: string,
  faction: string,
  count = 5,
  opts?: AiFetchOpts
): Promise<string[]> {
  if (!config.ai_api_key || !config.ai_api_endpoint) return []

  try {
    const response = await fetch(config.ai_api_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.ai_api_key}`
      },
      body: JSON.stringify({
        model: config.ai_model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '你是一位小说命名专家。请生成角色名字。只输出名字，每行一个，不要编号。'
          },
          {
            role: 'user',
            content: `请为一部${genre}题材的小说生成${count}个${faction}角色名字。`
          }
        ],
        max_tokens: 200,
        temperature: 0.9
      }),
      signal: opts?.signal
    })

    const data = await response.json()
    const text = data?.choices?.[0]?.message?.content || ''
    return text
      .split('\n')
      .map((n: string) => n.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}
