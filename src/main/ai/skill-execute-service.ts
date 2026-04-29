// DI-01 v2 / DI-04 v2 — 后端 Skill 执行客户端
//
// 桌面端调用 agent.xiangweihu.com /v1/skills/execute 走与官方 AI 同样的
// auth 通道。Skill 输入/输出按各 Skill 自己的 zod schema，本 service 仅
// 做 HTTP 边界 + 错误整形，不感知具体 schema。
//
// 用法：
//   const r = await executeOfficialSkill('layer2.style-learning', input, token)
//   if (r.error) ... else r.output 是 Skill 的 outputSchema 输出

import {
  buildSkillFeedbackApiBody,
  type SkillFeedbackPayload,
  type SkillFeedbackSubmitResult
} from '../../shared/skill-feedback'

const WEBSITE_URL = (process.env.ZHENGDAO_WEBSITE_URL || 'https://agent.xiangweihu.com').replace(/\/$/, '')
const API_BASE = (process.env.ZHENGDAO_API_URL || `${WEBSITE_URL}/api/v1`).replace(/\/$/, '')

export interface SkillExecuteResult<TOutput = unknown> {
  runId?: string
  output?: TOutput
  modelUsed?: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    costUsd: number
  }
  error?: string
  /**
   * 后端响应中的 code 字段，常见值：
   *  - PRO_REQUIRED / QUOTA_EXCEEDED （402，受 quota 限制）
   *  - GENRE_PACK_REQUIRED （402，需要订阅对应题材包）
   *  - SKILL_TIMEOUT （504，超时）
   *  - RATE_LIMITED （429）
   */
  code?: string
  /**
   * 当 code === 'GENRE_PACK_REQUIRED' 时，附带 plans 提示前端可订阅哪个 SKU
   */
  genre?: string
  plans?: { monthly: string; yearly: string }
}

export async function executeOfficialSkill<TInput = unknown, TOutput = unknown>(
  skillId: string,
  input: TInput,
  token: string | null,
  options: {
    modelHint?: 'fast' | 'balanced' | 'heavy'
    abortSignal?: AbortSignal
  } = {}
): Promise<SkillExecuteResult<TOutput>> {
  if (!token) {
    return { error: '请先登录证道账号后使用官方 Skill 执行' }
  }
  let response: Response
  try {
    response = await fetch(`${API_BASE}/skills/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        skillId,
        input,
        options: options.modelHint ? { modelHint: options.modelHint } : undefined
      }),
      signal: options.abortSignal
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { error: '执行已取消', code: 'CLIENT_ABORTED' }
    }
    return { error: error instanceof Error ? error.message : String(error) }
  }

  const text = await response.text()
  let payload: Record<string, unknown> = {}
  if (text) {
    try {
      payload = JSON.parse(text) as Record<string, unknown>
    } catch {
      if (response.ok) {
        return { error: '证道 Skill 响应格式异常' }
      }
    }
  }

  if (!response.ok) {
    const code = typeof payload.code === 'string' ? payload.code : `HTTP_${response.status}`
    const message =
      typeof payload.message === 'string'
        ? payload.message
        : `证道 Skill 请求失败 (${response.status})`
    const result: SkillExecuteResult<TOutput> = { error: message, code }
    if (typeof payload.genre === 'string') result.genre = payload.genre
    if (
      payload.plans &&
      typeof payload.plans === 'object' &&
      !Array.isArray(payload.plans) &&
      'monthly' in payload.plans &&
      'yearly' in payload.plans
    ) {
      const plans = payload.plans as { monthly: unknown; yearly: unknown }
      result.plans = {
        monthly: String(plans.monthly),
        yearly: String(plans.yearly)
      }
    }
    return result
  }

  return {
    runId: typeof payload.runId === 'string' ? payload.runId : undefined,
    output: payload.output as TOutput,
    modelUsed: typeof payload.modelUsed === 'string' ? payload.modelUsed : undefined,
    usage: payload.usage as SkillExecuteResult['usage']
  }
}

export async function submitOfficialSkillFeedback(
  payload: SkillFeedbackPayload,
  token: string | null
): Promise<SkillFeedbackSubmitResult> {
  if (!token) {
    return { error: '请先登录证道账号后提交 Skill 反馈', code: 'AUTH_REQUIRED' }
  }

  let body: ReturnType<typeof buildSkillFeedbackApiBody>
  try {
    body = buildSkillFeedbackApiBody(payload)
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error), code: 'INVALID_PAYLOAD' }
  }
  const runId = payload.runId.trim()

  let response: Response
  try {
    response = await fetch(`${API_BASE}/skills/runs/${encodeURIComponent(runId)}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }

  const text = await response.text()
  let parsed: Record<string, unknown> = {}
  if (text) {
    try {
      parsed = JSON.parse(text) as Record<string, unknown>
    } catch {
      if (response.ok) return { error: '证道 Skill 反馈响应格式异常' }
    }
  }

  if (!response.ok) {
    return {
      error:
        typeof parsed.message === 'string'
          ? parsed.message
          : `证道 Skill 反馈提交失败 (${response.status})`,
      code: typeof parsed.code === 'string' ? parsed.code : `HTTP_${response.status}`
    }
  }

  return { feedback: parsed.feedback }
}
