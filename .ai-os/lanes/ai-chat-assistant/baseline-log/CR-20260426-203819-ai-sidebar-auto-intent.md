# CR-20260426-203819 AI 侧栏与自动能力路由

## 背景

用户反馈客户端 AI 能力卡不应要求用户先选择，应该像 skill 一样由系统自动匹配；AI 创作助手以弹框形式使用不方便，应回到工作区右侧栏，形成“三栏一底”的高频 AI 写作体验。

## 需求变更

- AI 助手默认根据入口、选区、输入文本、当前章节和可用能力自动选择 skill。
- 右下角浮层不再作为主体验；AI 进入右侧辅助栏 tab，与伏笔、角色、灵感并列。
- 用户仍可从输入区的小标签切换为自动识别、普通对话或指定能力。
- 正文和资产写入仍必须进入 AI 草稿篮确认。

## 影响范围

- Renderer AI assistant UI、conversation mode resolver、right panel tabs、UI store entry semantics。
- 不改数据库 schema、IPC、provider routing 或 AI account/work profile 数据模型。
- 已有浮动 launcher 仅作为右侧栏关闭时的恢复入口。

## 验证

- `npm test -- src/renderer/src/components/ai src/renderer/src/utils/__tests__/workspace-layout.test.ts src/renderer/src/stores/__tests__/ui-store.test.ts`
- `npm run build`
