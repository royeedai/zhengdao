# P0 写作工作区 UX 审计（TASK-DUX-004）

> 审计日期：2026-05-09
> 来源：`surface-ledger.json` 自动生成的 surface 元数据 + 源码反推。
> 范围：4 个 P0 surface — `WorkspaceLayout`、`OutlineTree`、`EditorArea`、`AiAssistantDock`。
> 配对设计方案：[`p0-workspace-design-proposal.md`](./p0-workspace-design-proposal.md)。
> 实施仍需等 TASK-DUX-005 经设计 lock 后由你审批，本审计只输出问题清单与方案候选。

## 0. Design Principles 速查（与 TASK-DUX-003 对齐）

来自 [`DESIGN.md`](../DESIGN.md) 6 条原则（DP-1 写作主路径优先；DP-2 任务分区明确；DP-3 命令中心为动作真理源；DP-4 上下文操作优先；DP-5 状态完整；DP-6 AI 可控）。下文每个 issue 都对到对应 DP 编号。

## 1. SURF-WORK-001 `WorkspaceLayout`

源码：[`src/renderer/src/components/layout/WorkspaceLayout.tsx`](../../../../src/renderer/src/components/layout/WorkspaceLayout.tsx)（327 LOC）

### 1.1 当前结构

```
WorkspaceLayout (root flex column, h-screen)
├─ TopBar （48px，详见 TASK-DUX-003 audit §2）
├─ DailyWorkbench （常驻栏，工作区下方）
├─ Group orientation=horizontal, key=horizontalKey
│   ├─ Panel#workspace-left  minSize 12% maxSize 28%   ← OutlineTree（条件：effectiveLeftPanelOpen）
│   ├─ Panel#workspace-center minSize 36%
│   │   └─ if bottomPanelOpen
│   │      Group orientation=vertical
│   │      ├─ Panel#workspace-editor minSize 40%   ← EditorArea | SplitEditor（splitView）
│   │      └─ Panel#workspace-terminal minSize 18% maxSize 44%   ← TerminalArea
│   │     else
│   │      EditorArea | SplitEditor
│   └─ Panel#workspace-right minSize 18% maxSize 36%   ← RightPanel（条件：effectiveRightPanelOpen）
├─ AiAssistantDock （fixed dock）
├─ FloatingButton 「{warningCount} 坑待填」 （fixed bottom-16 right-4，条件：warningCount > 0 && !effectiveRightPanelOpen）
└─ OnboardingTour （signal-driven）
```

`compactWorkspace`（`window.innerWidth < 1280`）会强制 `effectiveLeftPanelOpen` 和 `effectiveRightPanelOpen` 为 false。Panel size 持久化在 ui-store `workspaceLayoutPanelSizes.{left,right,terminal}`。

### 1.2 状态盘点

来自 ledger：`默认布局、专注布局、审阅布局、设定布局、自定义布局、紧凑宽度、小黑屋`。

源码补充：
- `splitView` 状态（双 EditorArea/SplitEditor）没有列在 ledger
- `aiChapterDraft` 接管 EditorArea 时 layout 不变但 center 内容完全替换（这是 EditorArea 内部判断，layout 看不见）
- 「布局过满」状态没有处理：splitView=true + bottomPanel=true + left/right 同开 时 editor 实际宽度可能 < 320px
- `horizontalKey` 包含 `workspaceLayoutPresetId / left/right/terminal/compact` 5 个变量，任何一个变化都会重新 mount Group，**panel 用户拖拽的 size 在 mount 时会临时回到 default**
- `BlackRoomMode` 是早期返回 — 不渲染 TopBar/Workbench/Group/Dock，唯一全屏体验

### 1.3 Issue 清单

| ID | 严重度 | 原则 | 问题 |
| --- | --- | --- | --- |
| WORK-1 | P0 | DP-5 | `horizontalKey` 触发 Group 重 mount 后用户调整的 panel size 临时回到 default —— 切换 panel 开关 / 布局 preset 时损失自定义尺寸 |
| WORK-2 | P0 | DP-5 | splitView + bottomPanel + left+right 同时开时 editor 区域可能被压到 320px 以下；没有 UI 警告 |
| WORK-3 | P0 | DP-2 | `splitView` 没在 ledger 也没在 `BUILTIN_WORKSPACE_LAYOUT_PRESETS` 里——用户必须从某个隐藏入口（推测在 EditorArea 顶部右?）切换；功能存在但发现性极差 |
| WORK-4 | P1 | DP-4 | foreshadow「催债」浮窗只在 right panel 关闭时显示。用户故意关 right panel 时可能不想要这条提示；建议按 user preference 控制 |
| WORK-5 | P1 | DP-5 | 4 区 IDE 布局迁移 toast 「4 区 IDE 布局已启用，可在顶部布局菜单切换预设」只在第一次显示一次；后来的用户看不到这条说明 |
| WORK-6 | P1 | DP-2 | `DailyWorkbench` 与 `TerminalArea`（底部 panel）都承载「写作元信息」（字数、日历、待办、统计），但层级和入口不同；Workbench 是常驻栏，TerminalArea 是底部可关 panel；两者职责需要重新分工 |
| WORK-7 | P2 | DP-5 | `BlackRoomMode` 退出方式没有显式提示（推测靠 F11/Esc）；首次用户可能不知道怎么出 |

## 2. SURF-LEFT-001 `OutlineTree`

源码：[`src/renderer/src/components/sidebar-left/OutlineTree.tsx`](../../../../src/renderer/src/components/sidebar-left/OutlineTree.tsx)（562 LOC）

### 2.1 当前结构

- 顶部 tab bar：大纲 / 人物 / 设定 三个 tab（带 icon）
- 大纲 tab：volume 树（可折叠）+ chapter 列表（dnd-kit 拖拽排序）
- 人物 tab：character 列表（推断：showcase 角色卡）
- 设定 tab：wiki 设定列表
- 单条 chapter：单击选择、双击重命名、右键菜单（重命名 / 删除 / 移动卷）
- 拖拽 handle (`GripVertical`) 在 hover 时显示

### 2.2 状态盘点

来自 ledger：`空作品、有卷章、右键菜单、拖拽/排序、删除确认、面板收起`。

源码补充：
- 「人物 / 设定」tab 进入后，tab 切回大纲时不知道是否还原（推测每次重新 render）
- 三个 tab 的「+」按钮（新建卷 / 新建章 / 新建角色 / 新建 wiki）入口推测在每个 tab 内部，需要进 tab 才能用
- 右键菜单逻辑：`onContextMenu` 会调用 `clampOutlineMenuPosition` 防止溢出
- 双击重命名 vs 右键重命名两条路径，都触发 `editText` state

### 2.3 Issue 清单

| ID | 严重度 | 原则 | 问题 |
| --- | --- | --- | --- |
| LEFT-1 | P0 | DP-2 | 「大纲」「人物」「设定」三 tab 共享 left panel，但三者职责不同：大纲是导航（点击切章节）、人物是资产管理（点击编辑卡片）、设定是 wiki 浏览（点击查看 entry）。tab 切换强迫用户在「写作主路径」和「资产维护」之间切上下文 |
| LEFT-2 | P0 | DP-3 | 新建卷 / 新建章 / 新建角色 / 新建 wiki 入口分散在各 tab，且与 `CommandPalette`「新建卷 / 新建章 / 新建角色」命令重复实现，**没有共用 command registry** |
| LEFT-3 | P0 | DP-4 | 单条 chapter 同时承担：单击 = 选择、双击 = 重命名、右键 = 菜单、hover = 显示拖拽 handle、可拖拽排序——交互冲突；新用户单击想编辑章节标题但实际只切换章节 |
| LEFT-4 | P1 | DP-5 | volume 折叠状态没有持久化（推测，需源码验证 useState）；用户每次进作品都要重新折叠 |
| LEFT-5 | P1 | DP-5 | 删除卷有 `getVolumeDeleteMessage` 友好确认，但删除单章没有同样级别的二次确认（仅靠 `window.confirm`）—— 数据丢失风险不一致 |
| LEFT-6 | P2 | DP-5 | tab bar 高度 `py-2.5` text-[10px] 字过小，且没有快捷键标识 |

## 3. SURF-EDIT-001 `EditorArea`

源码：[`src/renderer/src/components/editor/EditorArea.tsx`](../../../../src/renderer/src/components/editor/EditorArea.tsx)（1521 LOC）

### 3.1 当前结构

- Tiptap 编辑器 + 多个 extension（StarterKit、Placeholder、SensitiveHighlight、FocusMode、Annotation、TextReplace、ScriptKindAttr、AiInlineDraft、Mention `@`）
- ScriptToolbar（aiWorkGenre === 'script' 时挂）
- 学术工具栏（aiWorkGenre === 'academic' 时显示，硬编码 banner：插入引文 / 引文管理 / 生成参考文献）
- 顶部渐变伪标题（48px，pointer-events-none，灰显当前章节）
- HUD 右上浮层：快照 + 保存状态（点击编辑器后显示）
- 底部状态栏（28px）：本章字数 / 全书字数 + 聚焦 / 续写 / 摘要 / 风格 4 按钮
- find/replace 顶部条（⌘F 触发）
- 上下文菜单（右键，按 selection.empty 切换菜单内容）
- 摘要 modal（生成 / 查看）
- 批注 popover（选中文本后右键「添加批注」）
- AI 章节草稿全屏接管（`aiChapterDraft` 存在时）
- AI 内联草稿（光标位置浮层）
- 自动保存：800ms debounce + idle flush draft 到 localStorage

### 3.2 状态盘点

来自 ledger：`无章节、有章节、保存中/已保存、选区菜单、引用操作、敏感词、空章节`。

源码补充（ledger 缺）：
- AI 章节草稿全屏接管模式（`aiChapterDraft` 存在）
- AI 内联草稿浮层（`inlineAiDraft` 存在）
- ScriptToolbar 模式（剧本题材）
- 学术工具栏 banner 模式
- find/replace 显示模式
- 摘要 modal 显示模式
- 批注 popover 显示模式
- focus mode 段落聚焦
- BlackRoomMode（不在本 surface，但应在 ledger 关联）

### 3.3 Issue 清单

| ID | 严重度 | 原则 | 问题 |
| --- | --- | --- | --- |
| EDIT-1 | P0 | DP-1 + DP-5 | EditorArea 1521 LOC 已超过架构治理核心文件 1200 行预算（参照 [`docs/architecture-governance.md § Core file budgets`](../../../../../../docs/architecture-governance.md)）。继续加功能没有空间，必须按 surface (find/replace、context menu、annotation popover、summary modal、ai-chapter-draft mode) 拆分子组件 |
| EDIT-2 | P0 | DP-2 | 章节身份在三处显示：左侧大纲选中态、顶部渐变伪标题、底部状态栏隐含字数关联——三者样式各异，用户难以快速识别「我在哪一章」 |
| EDIT-3 | P0 | DP-4 | 右键菜单按 `selection.empty` 切换内容，但「文本分析（本章）」「AI 续写」（无选区）和「文本分析」「AI 续写」（有选区）label 相同语义不同，用户混淆 |
| EDIT-4 | P0 | DP-5 | HUD 浮层「快照 + 保存状态」只在「点击编辑器」后显示（`onClick={() => setEditorHudVisible(true)}`）。新用户进章节没点击就看不到保存状态，有数据安全焦虑 |
| EDIT-5 | P0 | DP-2 | ScriptToolbar (剧本题材) + 学术工具栏 banner (学术题材) 是两种不同的「题材专属工具」呈现方式：ScriptToolbar 是组件、学术工具栏是 inline JSX；新增题材会复制粘贴 |
| EDIT-6 | P1 | DP-5 | find/replace「全部替换」一次性，无 undo / 单步替换 / 计数预览。数据破坏风险高 |
| EDIT-7 | P1 | DP-6 | AI 章节草稿全屏接管模式 vs AI 内联草稿浮层模式 —— 两种「未写入正文的 AI 产出」呈现方式不一致，用户需要分别学习如何 accept / dismiss / retry |
| EDIT-8 | P1 | DP-5 | 学术工具栏 banner 永久显示（不可折叠），与编辑器视觉竞争；剧本 ScriptToolbar 推测同问题 |
| EDIT-9 | P1 | DP-5 | 「⌘F 搜索章节内」与「⌘P 全局搜索」（GlobalSearchModal）+「⌘K 命令面板」三个键的语义关系，用户没有统一文档说明 |
| EDIT-10 | P2 | DP-5 | 摘要 modal 和批注 popover 都用 fixed positioning 自管 z-index（z-50 / z-60），与 ModalManager 不在同一栈 |

## 4. SURF-AI-001 `AiAssistantDock`

源码：[`src/renderer/src/components/ai/AiAssistantDock.tsx`](../../../../src/renderer/src/components/ai/AiAssistantDock.tsx)（已经经过 SPLIT-006 拆分，子组件清晰）

### 4.1 当前结构

- 桌面常驻 dock（书架 + 工作区都有）
- 多入口打开：`openAiAssistant({ surface, input, autoSend, command })`
- Hook 拆分良好：`useAiAssistantContext` / `useAiAssistantData` / `useAiAssistantRequest`
- 子组件：`AssistantPanelHeader` / `AuthorWorkflowRail` / `ConversationListDropdown` / `DraftListPanel` / `MessageStreamArea` / `StoryFactProposalPanel` / `AssistantPanelComposer` / `BookshelfCreationAssistantPanel`
- 模式切换：`AssistantInteractionMode` (chat / agent / 等)
- Skill template overrides + work profile 管理
- 草稿应用走 `applyAiDraft`（强制 preview，符合 DP-6）
- 故事事实建议（StoryFactProposal）独立面板

### 4.2 状态盘点

来自 ledger：`关闭、打开、书架起书、作品对话、流式中、失败、草稿列表、反馈`。

源码补充：
- `assistantMode` 持久化到 localStorage `zhengdao.aiAssistant.interactionMode`
- 多入口的 `command`、`input`、`autoSend`、`seededSkillKey` 状态在打开时各不相同
- BookshelfCreationAssistantPanel 是独立分支（书架场景的「AI 起书」面板）
- DraftListPanel 与 EditorArea 的 `aiChapterDraft` 状态共享（同一份 draft）

### 4.3 Issue 清单

| ID | 严重度 | 原则 | 问题 |
| --- | --- | --- | --- |
| AI-1 | P0 | DP-2 | Dock 多入口打开（`openAiAssistant` 来自 BookshelfPage / EditorArea 右键菜单 / CommandPalette / 快捷键），每个入口的 default state 不同（autoSend / input prefill / seed skill）。用户每次打开看到不同初始内容 |
| AI-2 | P0 | DP-3 | `AuthorWorkflowRail` 与 `AssistantPanelComposer` 是两条「触发 AI 动作」的路径——rail 是按钮、composer 是输入框。哪些动作走 rail / 哪些走 composer 没有规则；与 CommandPalette 的「AI 命令」也没有关联 |
| AI-3 | P0 | DP-6 | `DraftListPanel`（dock 内列表视图）与 EditorArea 全屏接管的 `aiChapterDraft`（编辑器替换为 draft 编辑面板）是两处 draft 呈现，用户不知道「同一个 draft 在两处都看得到」 |
| AI-4 | P1 | DP-5 | `assistantMode` 持久化但切换没有 visual hint（用户不知道当前是 chat / agent 模式） |
| AI-5 | P1 | DP-2 | Dock 在书架页和工作区都常驻，但内容完全不同（书架显示 BookshelfCreationAssistantPanel，工作区显示完整 panel）。同一组件多入口多上下文，命名「Dock」不准确 |
| AI-6 | P1 | DP-5 | 流式中状态、失败重试路径没有列在 ledger，UI 行为隐含 |
| AI-7 | P2 | DP-3 | Skill template overrides + work profile 是「AI 设置」相关，但散落在 dock 内部 hook + AiSettingsModal 两处；变更点多 |

## 5. 跨 surface 关联性问题

| ID | 严重度 | 原则 | 问题 | 涉及 surface |
| --- | --- | --- | --- | --- |
| WGLOBAL-1 | P0 | DP-3 | OutlineTree 的「新建卷/章/角色」、CommandPalette 的「edit-volume / edit-chapter / edit-character」、EditorArea 空态的「新建卷」按钮——三处实现同一动作，metadata 不共享。与 TASK-DUX-003 §5 GLOBAL-1 是同一根因 | OutlineTree + CommandPalette + EditorArea + TopBar |
| WGLOBAL-2 | P0 | DP-2 | AiAssistantDock 与 EditorArea 共享 draft state、selection state、context；但两者 props 通过 useUIStore 中转，类型不强耦合，调试时跨文件追踪难 | AiAssistantDock + EditorArea + useUIStore |
| WGLOBAL-3 | P0 | DP-4 | 章节级动作分散在：左侧 OutlineTree 右键菜单、EditorArea 右键菜单、CommandPalette、TopBar 工具栏，4 处；同一动作（「文本分析（本章）」「重命名章节」「AI 续写」）出现在不同地方且行为微妙不同 | OutlineTree + EditorArea + CommandPalette + TopBar |

## 6. 验证矩阵建议

补充到 [`verification-matrix.yaml`](../verification-matrix.yaml)（与 TASK-DUX-003 audit §6 合并）：

| 校验 ID | 命令 / 检查点 | 期望 |
| --- | --- | --- |
| workspace-panel-size-persistence | 切换 panel 开关后用户拖拽的 panel size 仍生效 | E2E |
| workspace-layout-overflow-warn | splitView+bottomPanel+left+right 全开时显示「布局过满」提示 | RTL test |
| editor-line-budget | `EditorArea.tsx` ≤ 1200 LOC（参照架构治理） | static guard |
| editor-context-menu-disambiguation | 右键菜单「文本分析（本章）」「文本分析（选区）」label 区分清晰 | snapshot |
| editor-hud-default-visible | 进入章节后 HUD 默认可见，不依赖点击 | RTL test |
| outline-action-source-of-truth | OutlineTree「新建卷/章/角色」与 CommandPalette 共用 `WORKSPACE_COMMAND_REGISTRY` | unit test |
| ai-dock-entry-consistency | `openAiAssistant({surface})` 的 5 种入口 default state 文档化 + snapshot 测试 | snapshot |
| ai-draft-single-source | 同一 draftId 在 DraftListPanel + EditorArea aiChapterDraft 两处显示一致 | RTL test |

## 7. 下一步

- 把 7 + 6 + 10 + 7 + 3 = 33 条 issue 按设计方案落到 [`p0-workspace-design-proposal.md`](./p0-workspace-design-proposal.md)。
- 设计方案 lock 后由你审批 TASK-DUX-005，开新 plan 进入实施。
- 实施时同步把上面 8 条新校验补到 `verification-matrix.yaml`。
