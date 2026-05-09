# P0 写作工作区 设计方案（TASK-DUX-004）

> 设计日期：2026-05-09
> 配对审计：[`p0-workspace-audit.md`](./p0-workspace-audit.md)（33 条 issue）
> 参考：[`competitive-pattern-map.md`](./competitive-pattern-map.md)、Linear Workspace、Notion Editor、Arc Spaces
> 性质：设计方案候选，不含实现代码。lock 后再开 TASK-DUX-005 实施 plan。

## 0. 总体原则映射

| Design Principle | 本方案落地手段 |
| --- | --- |
| DP-1 写作主路径优先 | EditorArea 拆分、章节身份单一信号源、HUD 默认可见，让作者写作时不被干扰 |
| DP-2 任务分区明确 | 左 panel 由「大纲/人物/设定 3 tab」改为「大纲专一 + 资产折叠子区」；DailyWorkbench 与 TerminalArea 重新分工 |
| DP-3 命令中心为动作真理源 | 「新建卷/章/角色」「文本分析」「AI 续写」等所有跨 surface 动作都从 `WORKSPACE_COMMAND_REGISTRY`（TASK-DUX-003 提出）派生 |
| DP-4 上下文操作优先 | OutlineTree 单条交互拆分；EditorArea 右键菜单按选区状态明确 label；AI Dock 入口规则化 |
| DP-5 状态完整 | 每个 surface 显式补齐 splitView / aiChapterDraft / overflow / blackroom 等隐藏状态 |
| DP-6 AI 可控 | DraftListPanel 与 EditorArea aiChapterDraft 共用 single source of truth；草稿写入前永远预览（已满足，仅明确化） |

## 1. SURF-WORK-001 `WorkspaceLayout`

### 1.1 IA proposed

```
WorkspaceLayout
├─ TopBar           （48px，详 TASK-DUX-003 方案）
├─ DailyWorkbench   （仅显示当日核心信息：今日字数 / 目标 / 状态徽章；详细统计移入 TerminalArea）
├─ Workspace Body
│   ├─ Left  ← OutlineTree (优化版，详 §2)
│   ├─ Center
│   │   ├─ Editor stack（默认 EditorArea；可切 SplitView，详 §3 + 1.4）
│   │   └─ Terminal panel（条件：bottomPanelOpen，承载详细统计 / 沙盘）
│   └─ Right ← RightPanel
└─ AiAssistantDock  （详 §4）
```

### 1.2 Before / Proposed 对照

| Issue | Before | Proposed |
| --- | --- | --- |
| WORK-1 | `horizontalKey` 触发 Group 重 mount 后 panel size 临时回到 default | 把 `key` 拆掉（或仅用 `compactWorkspace + workspaceLayoutPresetId` 作为 key），左右 panel 开关用 conditional render 而不是触发 key 变更；panel size 在 useUIStore 中持久化的值就是 source of truth |
| WORK-2 | splitView+bottomPanel+left+right 同时开 editor 可被压到 < 320px | 在 WorkspaceLayout 顶部出现一条 inline banner「布局过满，编辑器宽度过窄」+ 「自动整理」按钮（关闭次要 panel）；触发条件：editor 实测宽度 < 360px |
| WORK-3 | splitView 没在 ledger / preset 里 | 把 splitView 加入 `BUILTIN_WORKSPACE_LAYOUT_PRESETS` 一项「分屏写作」；ledger 增加 `SURF-EDIT-002 SplitEditor` 子 surface |
| WORK-4 | foreshadow 浮窗与 right panel 开关耦合 | 浮窗常驻显示（不论 right panel），但增加 user preference toggle「打扰我」/「静默」；静默时只在 TerminalArea 写作统计 tab 显示 dot 提醒 |
| WORK-5 | 4 区 IDE 迁移 toast 只首次显示 | 移除 toast；改为 onboarding tour 首次进入工作区时介绍布局菜单；之后用户可在「帮助」里重看 |
| WORK-6 | DailyWorkbench 与 TerminalArea 职责重叠 | DailyWorkbench 收口为「当日 1 行 chip 栏」（今日字数 / 目标 / 连续 N 天），可 collapse；TerminalArea 接管所有「写作统计 / AI 活动 / 沙盘」详细面板 |
| WORK-7 | BlackRoomMode 退出方式无提示 | 进入时 toast「按 Esc 或 F11 退出小黑屋」；浮层右上一直显示「小黑屋 · Esc 退出」徽章 |

### 1.3 状态完整矩阵

| 状态 | 当前 | 提议 |
| --- | --- | --- |
| 默认布局 | left+right+bottom 都开 | 同 |
| 专注布局 | left 关 right 关 bottom 关 | 同 |
| 审阅 / 设定 / 自定义 | builtin presets | 同 + 「分屏写作」preset |
| 紧凑宽度 (<1280) | 强制关 left/right | 同 + 顶部 banner 提示「窄屏自动隐藏 panel，可手动展开」 |
| 布局过满 | 无 | 顶部 banner + 「自动整理」按钮 |
| 小黑屋 | 全屏 | 同 + Esc 退出徽章 |
| 切换 preset 时 panel size | 临时回到 default | 持久化用户拖拽尺寸，preset 仅决定哪些 panel 显示 |

### 1.4 SplitView 设计补充

- 入口：在「分屏写作」preset 中默认开启；TopBar 工具区加「分屏」按钮（`workspace-actions` 中新增）
- SplitEditor 与 EditorArea 平等：左右各一个章节，分别有独立的 currentChapter
- 关闭分屏时合并到主 EditorArea，光标位置保留

## 2. SURF-LEFT-001 `OutlineTree`

### 2.1 IA proposed

```
OutlineTree (单一 panel，不再用 tab)
├─ 顶部 chip：作品名 + 版本徽章
├─ 主区：章节大纲（volume + chapter 树，专一导航）
│   ├─ 单击 = 选择章节
│   ├─ 双击 = 重命名（保留）
│   ├─ 右上 ⋯ → action panel（移动 / 删除 / 拆分 / 合并）
│   └─ 拖拽手柄 = 永久显示在章节左侧（不再 hover-only），更易发现
└─ 底部折叠子区（accordion）
    ├─ 角色（折叠默认）→ Show characters list
    ├─ 设定（折叠默认）→ Show wiki list
    └─ 「打开角色总库」「打开设定维基」 → 跳转对应 modal
```

### 2.2 Before / Proposed 对照

| Issue | Before | Proposed |
| --- | --- | --- |
| LEFT-1 | 大纲/人物/设定 三 tab 共享 left panel | 大纲专一占据 left panel；人物/设定改为底部折叠子区 + modal 入口；专业资产编辑去对应 modal（fullCharacters / wiki settings） |
| LEFT-2 | 新建卷/章/角色 入口分散 | 单一「+」menu button：默认动作根据当前选择上下文（选中卷 → 新建章；未选 → 新建卷）；下拉次选「新建卷 / 新建章 / 新建角色 / 新建 wiki」；所有动作派生自 `WORKSPACE_COMMAND_REGISTRY` |
| LEFT-3 | 单条章节多重交互冲突 | 单击 = 选择 + 显示右上 ⋯；双击 = 重命名；右上 ⋯ → action panel；拖拽手柄常驻；右键菜单去掉，全部走 action panel（避免双路径） |
| LEFT-4 | volume 折叠状态无持久化 | 折叠状态持久化到 ui-store `outline.volumeCollapsedIds: number[]` |
| LEFT-5 | 删除卷有友好确认，删除章只有 window.confirm | 删除章也用同一个 ConfirmDialog 组件，显示「将删除《章节标题》及其全部内容（包括 N 条注释，M 条引用）」，提供「移到回收站」选项（30 天可恢复） |
| LEFT-6 | tab bar 字过小 | 单一 panel 后无需 tab bar；顶部空间用作品名 + 版本徽章 |

### 2.3 状态完整矩阵

| 状态 | 当前 | 提议 |
| --- | --- | --- |
| 空作品 | 空白 | EmptyState「这本书还没有卷章。点击 ＋ 新建第一卷」+ 焦点在 ＋ 按钮 |
| 有卷章 | 树形 | 同 + volume 折叠持久化 |
| 拖拽 / 排序 | hover handle | 永久 handle |
| 删除确认 | window.confirm | ConfirmDialog 含详细影响清单 |
| 面板收起 | TopBar toggle | 同 |
| 上下文菜单 | 右键 | 改为右上 ⋯ + action panel |

## 3. SURF-EDIT-001 `EditorArea`

### 3.1 拆分计划（解决 EDIT-1）

`EditorArea.tsx` 1521 LOC → 拆为 6 个 subcomponent + 1 个主组件：

| 子文件 | 职责 | 估行数 |
| --- | --- | --- |
| `EditorArea.tsx`（主） | Tiptap editor instance + extension config + 章节切换 effect 链 | ≤ 600 |
| `EditorChapterContextMenu.tsx` | 右键菜单（select / no-select 双状态） | ≤ 200 |
| `EditorFindReplace.tsx` | find/replace 顶部条 + 单步替换 + 计数 | ≤ 150 |
| `EditorAiChapterDraftPanel.tsx` | aiChapterDraft 全屏接管视图 | ≤ 250 |
| `EditorHud.tsx` | 顶部章节标题 + 右上 HUD（快照 + 保存状态） | ≤ 100 |
| `EditorAnnotationDraft.tsx` | 批注 popover | ≤ 120 |
| `EditorBottomBar.tsx` | 底部状态栏（字数 + 4 按钮） | ≤ 100 |

主组件 ≤ 600 LOC，远在 1200 预算内；架构治理 guard 不再触发例外。

### 3.2 Before / Proposed 对照

| Issue | Before | Proposed |
| --- | --- | --- |
| EDIT-1 | 1521 LOC 超核心文件预算 | 按 §3.1 拆 6 子组件 |
| EDIT-2 | 章节身份在三处显示 | 唯一信号源：顶部一个 sticky header「卷名 › 章节名」+ 摘要 chip（点击进 modal）；移除底部状态栏的隐含字数关联，移除顶部渐变伪标题 |
| EDIT-3 | 右键菜单 label 模糊 | 右键菜单按选区状态显示明确 label：「文本分析 ▸ 选区 (N 字)」「文本分析 ▸ 本章 (1234 字)」「AI 续写 ▸ 选区」「AI 续写 ▸ 章末」 |
| EDIT-4 | HUD 只在点击编辑器后显示 | HUD 默认可见，仅在 BlackRoomMode 隐藏；浮层位置不变 |
| EDIT-5 | ScriptToolbar / 学术 banner 不一致 | 抽象 `<GenreToolbar genre={aiWorkGenre} />`，按题材统一渲染。banner 形态统一为可折叠 toolbar；新增题材只加配置，不改 EditorArea |
| EDIT-6 | find/replace 全部替换无 undo | 查找时显示命中数量（「找到 N 处」）；提供「替换当前」「全部替换」两个按钮；全部替换前要 confirm |
| EDIT-7 | aiChapterDraft 全屏 vs inlineDraft 浮层不一致 | 两者共用 `<AiDraftPreview>` 组件外壳：相同的「采纳 / 复制 / 重生成 / 丢弃」工具条；区别仅在「展示位置」（全屏 vs 内联浮层） |
| EDIT-8 | 学术工具栏 banner 永久显示 | 工具栏可折叠（默认展开，记忆到 ui-store） |
| EDIT-9 | ⌘F / ⌘P / ⌘K 关系无文档 | 在 `competitive-pattern-map.md` 加快捷键对照表；onboarding tour 第二步介绍 |
| EDIT-10 | 摘要 modal / 批注 popover 自管 z-index | 全部走 ModalManager 路径，统一 z-index 栈 |

### 3.3 状态完整矩阵

| 状态 | 当前 | 提议 |
| --- | --- | --- |
| 无章节 | EmptyState「选择章节，开始写作」+ 新建按钮 | 同 |
| 有章节 | 编辑器 | 同 + sticky header 章节身份 |
| 保存中 / 已保存 | HUD 浮层（需点击） | HUD 默认可见 |
| 选区菜单 | 右键 | 同 + 明确 label |
| 引用操作 | mention `@角色` | 同 + 学术 banner 折叠 |
| 敏感词 | 高亮 | 同 |
| 空章节 | 占位「开始你的创作...」 | 同 + 提示「按 Tab 开启 AI 续写」（可选） |
| AI 章节草稿 | 全屏接管 | 同 + 共用 `<AiDraftPreview>` |
| AI 内联草稿 | 浮层 | 同 + 共用 `<AiDraftPreview>` |
| Find / replace | 顶部条 | 同 + 命中计数 + 单步替换 |
| Script / Academic toolbar | 题材专属 | `<GenreToolbar>` + 折叠 |
| 摘要 modal | self-managed | ModalManager |
| 批注 popover | self-managed | ModalManager（轻量 popover variant） |

## 4. SURF-AI-001 `AiAssistantDock`

### 4.1 入口规则化（解决 AI-1）

定义 `openAiAssistant` 五种 entry preset：

| Entry | 来源 | 默认 mode | 默认 input | 默认 seeded skill |
| --- | --- | --- | --- | --- |
| `bookshelf` | BookshelfPage 「AI 起书」 | bookshelf-creation | 空 | book-creation |
| `editor-continue` | EditorArea 右键「AI 续写」 | chat | `AI_CONTINUE_PROMPT` | inline-continue |
| `editor-polish` | EditorArea 右键「AI 润色」 | chat | `AI_POLISH_PROMPT` | text-rewrite |
| `editor-deslop` | EditorArea 右键「去 AI 味」 | chat | `REMOVE_AI_TONE_*_INPUT` | layer2.deslop |
| `command-palette` | CommandPalette「打开 AI 创作助手」 | 上次模式 | 空 | 上次 skill |

每种 entry 有独立的 onboarding hint（首次打开提示「这是 XX 模式」）。

### 4.2 Before / Proposed 对照

| Issue | Before | Proposed |
| --- | --- | --- |
| AI-1 | 多入口 default state 各异 | §4.1 表格化；`useAiAssistantContext` 接受 `entry` 参数派生 default state；每种 entry 有 fixture 测试 |
| AI-2 | rail vs composer 两条路径无规则 | rail = 高频固定动作（继续写 / 续写章节 / 检查一致性 / 去 AI 味），从 `WORKSPACE_COMMAND_REGISTRY` 派生；composer = 自由对话；CommandPalette「AI」类目命令一键转入 composer 输入框 |
| AI-3 | DraftListPanel 与 EditorArea aiChapterDraft 两处 draft | 两处共用 `useAiDrafts()` hook 返回 single source；DraftListPanel 是「列表 + summary」，EditorArea 全屏视图是「单 draft 编辑」；点击列表中某 draft 自动跳转到编辑器全屏视图 |
| AI-4 | assistantMode 切换无视觉提示 | AssistantPanelHeader 显示当前 mode badge（「对话」/「自动导演」），按钮 hover 提示模式区别 |
| AI-5 | Dock 在书架页 / 工作区内容完全不同 | 拆为两个 component：`<BookshelfAssistant>`（书架页用）+ `<WorkspaceAssistant>`（工作区用）；两者共用 hooks 与子组件，命名清晰 |
| AI-6 | 流式 / 失败状态隐含 | ledger 补「流式中」「重试中」「失败」三状态；AssistantPanelHeader 显示明确 status pill |
| AI-7 | Skill template overrides 散落 | 把 overrides 编辑入口收口到 AiSettingsModal；Dock 内仅显示「当前作品 N 个 override」chip + 跳转按钮 |

### 4.3 状态完整矩阵

| 状态 | 当前 | 提议 |
| --- | --- | --- |
| 关闭 | dock collapsed | 同 |
| 打开 | dock expanded | 同 + entry preset hint |
| 书架起书 | BookshelfCreationAssistantPanel | 同 + 独立 `<BookshelfAssistant>` 组件 |
| 作品对话 | full panel | 同 + `<WorkspaceAssistant>` |
| 流式中 | 按钮变 streaming | 同 + Header status pill |
| 失败 | error 行 | 同 + retry button + Header status pill |
| 草稿列表 | DraftListPanel | 同 + 与 EditorArea single source |
| 反馈 | feedback form | 同 |

## 5. 跨 surface 关联性问题方案

| Issue | 方案 |
| --- | --- |
| WGLOBAL-1 | 扩展 TASK-DUX-003 提出的 `WORKSPACE_COMMAND_REGISTRY`：增加 `edit.newVolume / edit.newChapter / edit.newCharacter / edit.newWiki / edit.deleteChapter / edit.renameChapter` 命令；OutlineTree action panel + EditorArea 空态 + CommandPalette + TopBar 全部从 registry 派生 |
| WGLOBAL-2 | 在 `useAiAssistantContext` / `useAiAssistantData` / `useAiAssistantRequest` 三个 hook 之外建立 `useEditorAiBridge()` hook 作为 EditorArea ↔ Dock 之间的强类型契约（selection / draft / chapter id / mode）；ui-store 保留为持久化层 |
| WGLOBAL-3 | 章节级动作走 `WORKSPACE_COMMAND_REGISTRY` 的 `chapter.*` 命名空间；OutlineTree action panel + EditorArea 右键 + CommandPalette + TopBar 都派生；同一动作行为完全一致 |

## 6. 实施分批建议（待 TASK-DUX-005 lock 后再开 plan）

| 批次 | 范围 | 估时 | 依赖 |
| --- | --- | --- | --- |
| 批 1 | 扩展 `WORKSPACE_COMMAND_REGISTRY` 加入 `chapter.*` / `edit.*` 命名空间（与 TASK-DUX-003 批 1 合并） | 0.5 工日 | TASK-DUX-003 批 1 |
| 批 2 | EditorArea 拆 6 子组件 + line budget 满足 | 2-3 工日 | 批 1 |
| 批 3 | OutlineTree 改为大纲专一 + 底部资产折叠子区 + 单条交互改 ⋯ | 1.5-2 工日 | 批 1 |
| 批 4 | EditorArea 章节身份单一信号 + HUD 默认可见 + 右键菜单明确 label + GenreToolbar 抽象 | 1.5 工日 | 批 2 |
| 批 5 | AiAssistantDock 入口 preset 化 + 拆 BookshelfAssistant / WorkspaceAssistant + Header status pill | 1.5-2 工日 | 批 1 |
| 批 6 | WorkspaceLayout overflow banner + splitView preset + 删除 toast 改 onboarding | 1 工日 | 批 1-5 完成 |
| 批 7 | `<AiDraftPreview>` 共用组件 + DraftListPanel/EditorArea 共用 useAiDrafts | 1 工日 | 批 2, 5 |
| 批 8 | find/replace 命中计数 + 单步替换 + ConfirmDialog 化删除 + ModalManager 收口 | 1 工日 | 批 2 |

总估：10-12 工日，按批次提交。建议批 1 先于 TASK-DUX-003 批 1 一起做（共用同一份 registry）。

## 7. 不做（明确排除）

- 不动 Tiptap extension 内部逻辑（仅拆容器组件）
- 不重写 mention / annotation / sensitive-highlight / focus-mode 等 extension
- 不引入新的编辑器 framework
- 不动 better-sqlite3 / IPC 协议
- 不影响 AI 写入路径的现有「预览 + 用户确认」契约（DP-6 已满足）
- 不动 BlackRoomMode 全屏行为（仅加退出提示）
- 不动 BookshelfPage（属 TASK-DUX-003）
- 不动 TopBar 顶栏（属 TASK-DUX-003）

## 8. 验证矩阵建议

把审计 §6 的 8 条 + 本方案补 4 条加入 [`verification-matrix.yaml`](../verification-matrix.yaml)：

| 校验 ID | 检查点 | 期望 |
| --- | --- | --- |
| workspace-panel-size-persistence | 切换 panel 开关后用户拖拽 size 仍生效 | E2E |
| workspace-layout-overflow-warn | 4 panel + splitView 全开显示 banner | RTL test |
| workspace-splitview-in-presets | `BUILTIN_WORKSPACE_LAYOUT_PRESETS` 含「分屏写作」 | unit test |
| editor-line-budget | `EditorArea.tsx` ≤ 1200 LOC | static guard |
| editor-context-menu-disambiguation | 右键菜单 label 含「▸ 选区/本章」明确区分 | snapshot |
| editor-hud-default-visible | 进入章节 HUD 默认可见 | RTL test |
| editor-genre-toolbar-unified | ScriptToolbar / academic toolbar 都用 `<GenreToolbar>` | snapshot |
| editor-find-replace-confirm | 全部替换前显示命中计数 + confirm | RTL test |
| outline-action-source-of-truth | OutlineTree action panel + CommandPalette 共用 registry | unit test |
| outline-volume-collapse-persist | volume 折叠状态持久化到 ui-store | unit test |
| ai-dock-entry-preset | 5 种 entry preset 各有 fixture | snapshot |
| ai-draft-single-source | 同一 draftId 两处一致 | RTL test |

## 9. 下一步

1. 你审阅本方案 + 审计文档
2. 锁定方案后由你审批 TASK-DUX-005
3. 我按 §6 分批开新 plan 实施（与 TASK-DUX-003 批次合并执行）
