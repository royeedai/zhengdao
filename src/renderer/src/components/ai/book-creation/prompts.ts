import type { AssistantCreationBrief } from '../../../../../shared/ai-book-creation'
import { formatBriefForPrompt, formatCreationBriefFieldGuide } from './brief'

/**
 * SPLIT-006 — book-creation prompt templates.
 *
 * Two flows:
 *   1. Brief negotiation — the AI keeps narrowing the user's request
 *      until the 3 required fields (title, genreTheme, targetLength)
 *      are settled and the user confirms.
 *   2. Package generation — once the brief is confirmed the AI emits a
 *      complete AiBookCreationPackage JSON the panel uses to seed a new
 *      book via window.api.createBookFromAiPackage.
 *
 * Both prompts return a `{ systemPrompt, userPrompt }` pair shape so
 * the call sites can invoke `aiPromptStream(config, systemPrompt,
 * userPrompt, ...)` uniformly.
 */

interface BookshelfBriefMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export function buildBookshelfBriefSystemPrompt(): string {
  return [
    '你是证道的唯一 AI 创作助手，现在处于书架页的新作品沟通模式。',
    '你的目标是快速收束起书需求，而不是一项一项审问用户。',
    '核心必填只有：作品名或暂定名、题材/主题/核心冲突、目标总字数或篇幅范围。其余字段都是可选项；用户没填时，可以引导用户选择"让 AI 评估""让 AI 写""先按默认"。',
    '不要一轮只追问一个字段。除非用户明确只讨论某一项，否则 assistant_message 只用 1-2 句告诉用户可以在输入框上方点选多项，也可以直接输入其他想法。',
    '选项由界面提供，不要在 assistant_message 里输出编号清单、Markdown 标题、粗体、项目符号或长列表。',
    '支持用户一次性回复多个编号、多个短语或自然语言，例如："1 现实生活，2 10万字内，章节让AI评估，人物让AI写"。',
    '只把用户明确说出的内容、用户选择的候选项，或用户明确授权 AI 评估/代写的内容写入 brief。用户只说不确定时，不要替用户写死方向，要把对应字段写成"让 AI 评估"或继续给组合选择。',
    'brief 只能使用这些英文 key：title, genreTheme, targetLength, chapterPlan, characterPlan, styleAudiencePlatform, worldbuilding, boundaries, otherRequirements, author, productGenre。',
    '请严格返回 JSON，不要 Markdown，不要额外解释。格式：{"assistant_message":"给用户看的回复","brief":{...},"suggestions":[{"field":"字段名","options":["选项1","选项2"]}]}。'
  ].join('\n')
}

export function buildBookshelfBriefUserPrompt(input: {
  brief: AssistantCreationBrief
  userInput: string
  messages: BookshelfBriefMessage[]
}): string {
  const recent = input.messages
    .slice(-8)
    .map((message) => `${message.role}: ${message.content}`)
    .join('\n')
  return [
    `当前已确认需求：\n${formatBriefForPrompt(input.brief)}`,
    `字段规则与可选答案：\n${formatCreationBriefFieldGuide()}`,
    recent ? `最近对话：\n${recent}` : '',
    `用户新输入：\n${input.userInput}`,
    '请更新 brief。assistant_message 不要列选项，只提示用户使用输入框上方选项区或直接输入其他内容；如果核心必填已齐，就提示用户可生成筹备包预览或继续补可选项。'
  ]
    .filter(Boolean)
    .join('\n\n')
}

export function buildBookPackagePrompt(brief: AssistantCreationBrief): {
  systemPrompt: string
  userPrompt: string
} {
  return {
    systemPrompt: [
      '你是长篇小说开书策划助手。',
      '你只能依据用户已确认的核心起书需求生成筹备包，不能新增未经确认的核心方向。',
      '对用户留空或写明"让 AI 评估/让 AI 写/先按默认"的可选字段，你可以按题材常规和平台安全边界合理补全。',
      '必须返回一个完整 JSON 对象。不要写章节正文，所有 chapters.content 必须是空字符串；用 summary 和 plotNodes 表达开篇规划。',
      '请严格返回 JSON，不要 Markdown，不要解释。'
    ].join('\n'),
    userPrompt: [
      `已确认需求：\n${formatBriefForPrompt(brief)}`,
      [
        '请生成 AiBookCreationPackage JSON，字段如下：',
        '{"book":{"title":"","author":""},"workProfile":{"productGenre":"webnovel","styleGuide":"","genreRules":"","contentBoundaries":"","assetRules":"","rhythmRules":""},"volumes":[{"title":"第一卷","chapters":[{"title":"第一章","summary":"","content":""}]}],"characters":[{"name":"","faction":"neutral","status":"active","description":"","customFields":{}}],"wikiEntries":[{"category":"","title":"","content":""}],"plotNodes":[{"chapterNumber":1,"title":"","score":0,"nodeType":"main","description":""}],"foreshadowings":[{"text":"","expectedChapter":null,"expectedWordCount":null}]}',
        '要求：1 个分卷，3-5 个章节规划；每章 content 都留空；人物 2-4 个；设定 2-4 条；剧情节点 3-6 个；伏笔 1-3 个。'
      ].join('\n')
    ].join('\n\n')
  }
}
