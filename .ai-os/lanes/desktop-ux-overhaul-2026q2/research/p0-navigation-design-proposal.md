# P0 导航与命令体系 设计方案（TASK-DUX-003）

> 设计日期：2026-05-09
> 配对审计：[`p0-navigation-audit.md`](./p0-navigation-audit.md)（28 条 issue）
> 参考：[`competitive-pattern-map.md`](./competitive-pattern-map.md)、Linear / Raycast / Notion / Arc 公开文档
> 性质：设计方案候选，不含实现代码。lock 后再开 TASK-DUX-005 实施 plan。

## 0. 总体设计原则映射

| Design Principle | 本方案落地手段 |
| --- | --- |
| DP-1 写作主路径优先 | 书架页只承担「找作品 + 起作品」两件事，所有运维/账户/AI 操作折叠为次级；TopBar 只承担「在哪本书 + 当前布局 + 主操作」三件事 |
| DP-2 任务分区明确 | 「找动作 = CommandPalette」，「找内容 = GlobalSearch」，「打开工具 = 工作区工具区」三件事各占一个入口；TopBar 不再混合工具按钮 |
| DP-3 命令中心为动作真理源 | 引入 `WORKSPACE_COMMAND_REGISTRY`：TopBar 工具按钮、CommandPalette、右键菜单、键盘快捷键全部从同一份 metadata 派生 |
| DP-4 上下文操作优先 | BookCard 改为右上角 ⋯ → action panel；TopBar 「打开总览」收回到工具区；目录树/编辑器选区动作不在本方案范围（属 TASK-DUX-004） |
| DP-5 状态完整 | 每个 surface 显式列出 6 种状态（空/有/loading/error/键盘/溢出）的处理方式 |
| DP-6 AI 可控 | 本批改造不影响 AI 写入路径（属 TASK-DUX-006） |

## 1. SURF-BOOK-001 `BookshelfPage`

### 1.1 IA proposed

```
BookshelfPage
├─ Top chrome（drag region，48px）
│   ├─ Left: AppBrand
│   ├─ Center: ⌘K 命令面板 / ⌘P 全局搜索 hint（与 Linear top chrome 相同）
│   └─ Right: AccountSettingsMenu（无「设置」入口，账户面板内才有「应用设置」）
├─ Hero（仅空态）
│   └─ 单选项 dialog: 「以一段灵感开新作品」/「自己起一份空白稿」/「迁移已有作品」
├─ Inventory bar
│   ├─ Left: 「我的作品 N」+ 排序下拉（持久化）+ 视图切换（grid/list，持久化）
│   └─ Right: 局部搜索框（⌘F）+ 「新建作品」menu button（默认 AI 起书；下拉「空白作品」「迁移作品」）
└─ Content
    └─ Books grid / list with action panel on hover (right-top ⋯)
```

### 1.2 Before / Proposed 对照

| Issue | Before | Proposed |
| --- | --- | --- |
| BOOK-1 | 顶栏「新建作品」+ 空态 AI 起书是两个语义重叠入口；视觉权重颠倒（AI 起书在空态 surface tone，新建空白 button tone） | 新建作品收口为单一「menu button」：默认动作 = 「以一段灵感开新作品」（AI 起书），下拉次选「空白作品」「迁移作品」。空态 hero 用同一组件，只放大尺寸 |
| BOOK-2 | 没有命令面板入口 | Top chrome center 显示 `⌘K 找动作` `⌘P 找内容` 两个轻量 button，hover 显示 keyboard hint。书架场景下 `⌘K` 也能开 — 把「主题切换」「打开设置」「关于本应用」「检查更新」做成 requiresBook: false |
| BOOK-3 | 搜索无结果时直接列表为空 | 空结果显示 `EmptyState` 组件：图标 + 「未找到匹配作品」+ 「清空查询」action button + 「以「{query}」起一本新作品」secondary action（直接把 query 作为 AI 起书的初始 prompt） |
| BOOK-4 | hover icon button（删除/换封面/重新生成）权重过高 | 卡片右上角 ⋯ icon button → 打开 action panel（按 Linear / Raycast 模式）。封面操作 + 重命名 + 重新生成 + 删除 都在 panel 里，删除还是 destructive style + 二次确认 |
| BOOK-5 | AccountSettingsMenu 在书架页有「设置」入口但 projectSettings/aiSettings 都打不开 | AccountSettingsMenu 在书架场景只显示「账户」「应用设置」「关于」「退出」；projectSettings / aiSettings 仅在工作区可见 |
| BOOK-6 | 排序无持久化 | 把 `viewMode` + `sortBy` + `searchQuery` 持久化到 ui-store 的 `bookshelfPreferences`；`searchQuery` 不持久化（避免下次进来还残留旧 query） |
| BOOK-7 | 长标题溢出未审计 | BookCard 标题用 `line-clamp-2`，鼠标 hover 时显示 tooltip 显示完整标题 |

### 1.3 状态完整矩阵

| 状态 | 当前 | 提议 |
| --- | --- | --- |
| 空书架 | 「开始你的创作之旅」+ 三个 secondary 按钮 | 单 hero dialog：默认 focus AI 起书，按 Tab 切到「空白」「迁移」 |
| 有作品 | grid / list | 同 + 右上 ⋯ action panel |
| 搜索无结果 | 列表空，无文案 | EmptyState + 引导 action |
| loading | 无 loading 显示 | `loadBooks` 期间 grid 显示骨架屏 |
| error | 抛到 boundary | toast + retry button，用 toast-store |
| 键盘 | 无 | `⌘K`/`⌘P`/`⌘F` 全局快捷键；上下键聚焦卡片 |
| 文本溢出 | 不一致 | line-clamp + tooltip |

## 2. SURF-NAV-001 `TopBar`

### 2.1 IA proposed

把 TopBar 当前的 4 类功能（导航 / 布局 / 工具 / 系统）拆为 **2 行** 或 **1 行 + 2 段** 的清晰分区：

**方案 A（2 行 chrome，48 + 36 = 84px）：**

```
[Brand] [《作品名》↩] | [⌘K 找动作] [⌘P 找内容] [布局: focus ▾]               [PomodoroTimer] [Account ▾]   ← drag region
[Outline ▣ Editor ▣ AI ▣ Bottom ▣]   [总览] [角色] [设定] [伏笔] [灵感] [项目设置]              ← 工具与面板
```

**方案 B（1 行 + 滑入工具抽屉，48px + on-demand）：**

```
[Brand] [《作品名》↩] [⌘K 找动作] [⌘P 找内容] [布局: focus ▾]   |   [Outline ▣ Editor ▣ AI ▣ Bottom ▣]   |   [⋯ 工具] [Pomodoro] [Account ▾]
```

工具按钮全部收进 ⋯ 抽屉，只有当前布局对应的高频工具会浮在抽屉首项。

### 2.2 Before / Proposed 对照

| Issue | Before | Proposed |
| --- | --- | --- |
| NAV-1 | 12px 高承担 4 类功能，xl 屏才显示工具区 | 选 A 或 B 拆开。倾向 A（双行）—— 长篇创作场景显示器一般 ≥ 1440，48+36 损失 36px 不影响编辑器；窄屏自动折叠为 B |
| NAV-2 | 没有 ⌘K 入口 | 中部固定显示「⌘K 找动作」「⌘P 找内容」按钮，参考 Linear top chrome |
| NAV-3 | 当前布局 preset 不可见 | 「布局: focus ▾」直接显示当前 preset 名字；hover 显示快捷键 |
| NAV-4 | 「打开总览」用 accent surface 占顶栏视觉位 | 收到工具区第一行第一项；首页位置预留给「⌘K / ⌘P / 布局」 |
| NAV-5 | xl 屏宽度变化时硬切 | 用 `ResizeObserver` 渐进折叠：先把 secondary 工具收进 ⋯，再收 primary，最后整体改为方案 B |
| NAV-6 | panel toggle 无快捷键提示 | tooltip 显示 `⌘\`（左）`⌘.`（右）`⌘\``（底）；TopBar 本身不显示 — 太挤 |
| NAV-7 | custom layout preset 不能改名/删除 | 布局菜单加 hover 「重命名」「删除」icon-button；与 Linear saved view 模式一致 |

### 2.3 状态完整矩阵

| 状态 | 当前 | 提议 |
| --- | --- | --- |
| 默认 | 工具区 hidden xl:flex | 双行 chrome，工具区始终在第二行 |
| 工具区折叠 | `topbarToolsCollapsed` | 移除该开关，靠 ResizeObserver 自动折叠 |
| 布局菜单 | open/close | 加 hover「重命名」「删除」action |
| 窄屏 | hidden xl:flex 硬切 | 渐进折叠 |
| 拖拽安全区 | 已有 `getCurrentTitlebarSafeArea` | 保留 |
| 键盘 | 三 panel 有 aria-label，无 shortcut | tooltip 显示快捷键 |

## 3. SURF-CMD-001 `CommandPalette`

### 3.1 核心改动：引入 `WORKSPACE_COMMAND_REGISTRY`

在 `src/renderer/src/commands/registry.ts`（新文件，本方案不实施）建立单一 metadata：

```ts
type CommandId = 'nav.bookshelf' | 'nav.commandPalette' | 'nav.globalSearch' | 'nav.aiAssistant'
              | 'nav.fullCharacters' | 'nav.wiki' | 'nav.projectSettings' | 'nav.foreshadowBoard'
              | 'nav.quickNotes' | 'nav.export' | 'nav.import' | 'nav.writingIntel'
              | 'nav.marketScan' | 'nav.director' | 'nav.visualStudio' | 'nav.mcp'
              | 'edit.newVolume' | 'edit.newChapter' | 'edit.newCharacter'
              | 'view.left' | 'view.right' | 'view.bottom' | 'view.blackroom'
              | 'theme.set'   // 单一动作 + theme picker，不再 7 行
              | 'app.settings' | 'app.about' | 'app.checkUpdate'

interface CommandDef {
  id: CommandId
  label: string
  category: '导航' | '编辑' | 'AI' | '视图' | '主题' | '应用'
  icon: LucideIcon
  shortcut?: { mac: string; windows: string }
  requiresBook?: boolean
  destructive?: boolean
  aliases?: string[]
  surfaces: Array<'commandPalette' | 'topbarTools' | 'bookActionPanel' | 'editorContext'>
}
```

`CommandPalette` / `TopBar workspace tools` / `BookCard action panel` 全部从这份 registry 派生。

### 3.2 Before / Proposed 对照

| Issue | Before | Proposed |
| --- | --- | --- |
| CMD-1 | 命令面板与 TopBar 工具是两份 metadata | 引入 `WORKSPACE_COMMAND_REGISTRY`，所有 surface 从 registry 过滤；新动作只加一处 |
| CMD-2 | 缺「打开命令面板」「关闭作品」「打开搜索」「Director」「VisualStudio」「MCP」「WritingIntel」等 | registry 全覆盖，CommandPalette 自动展示。requiresBook=false 的动作也补齐（「打开应用设置」「检查更新」「关于」） |
| CMD-3 | 无 recent / favorites / alias | 加 `aliases?: string[]`；ui-store 持久化 `recentCommandIds`（最多 5 个）；首屏在 query 为空时显示 recent + favorites（参考 Raycast root） |
| CMD-4 | 7 个主题命令占容量 | 主题改为单 `theme.set` 命令；执行后弹出 theme picker submodal（保留 7 个主题选项 + 系统） |
| CMD-5 | shortcut hint 仅 3 项 | registry 把所有快捷键集中维护；CommandPalette 自动渲染 shortcut hint |

### 3.3 状态完整矩阵

| 状态 | 当前 | 提议 |
| --- | --- | --- |
| 空查询 | 显示全部 23 commands | 显示 recent (≤5) + favorites + 「输入搜索全部命令」hint |
| 有查询 | fuzzy + category 分组 | 同 + 命中 alias 时高亮 alias 字符 |
| 无结果 | 「无匹配命令」 | 同 + 「试试搜索『新建』『主题』『打开』」 hint |
| requiresBook 过滤 | 默认隐藏 | 同 |
| 键盘 | ↑↓Enter Esc | 同 + Tab 切 favorites / recent / 全部 |
| 执行后关闭 | 自动关闭 | 同（保留 `useUIStore.getState().activeModal === 'commandPalette'` 守卫） |

## 4. SURF-SEARCH-001 `GlobalSearchModal`

### 4.1 核心改动：扩展 search 后端 + 统一 modal shell

**后端层（不在本方案实施范围，需新 lane 联动）：**

`window.api.searchChapters(query, bookId?)` 扩展为 `window.api.searchAssets({ query, bookId?, kinds: Array<'chapter' | 'character' | 'wiki' | 'foreshadow' | 'reference'> })`，返回 `Hit & { kind }[]`。

**前端层（本方案）：**

- 引入 `<DialogShell>` 共用组件，CommandPalette + GlobalSearchModal 都用它（解决 GLOBAL-3）
- 顶部 placeholder 文案明确「搜内容（章节、角色、设定…）」，区别于 CommandPalette 的「找动作」
- 加 kind filter chips（章节 / 角色 / 设定 / 伏笔 / 引用），可多选
- 加键盘 ↑/↓/Enter 选择 + Esc 关闭
- 错误用 toast-store 提示

### 4.2 Before / Proposed 对照

| Issue | Before | Proposed |
| --- | --- | --- |
| SEARCH-1 | 仅搜章节，但承诺搜资产 | 后端扩展 `searchAssets`；前端按 kind chip 分组显示 hit。短期内可先把 chip 设 disabled + 「即将支持」，但前端组件先按多 kind 设计 |
| SEARCH-2 | 与 CommandPalette 视觉无关联 | 两个 modal 都用 `<DialogShell>`：相同 padding / radius / backdrop / close behavior。区别在 placeholder 文案 + icon（CMD: `Command`，Search: `FileSearch`） |
| SEARCH-3 | 错误未处理 | `searchAssets` 失败 toast「搜索失败：{message}」+ retry；不抛到 error boundary |
| SEARCH-4 | 无键盘导航 | 与 CommandPalette 共用 `useListKeyboard` hook，↑↓Enter 一致 |
| SEARCH-5 | 跨作品命中强制 openBook 副作用 | 命中显示 `📕 {bookTitle}` 标识，跨作品时点击前 confirm dialog：「打开《{title}》并跳到该章节？当前未保存内容会自动保存」 |
| SEARCH-6 | 「仅当前作品」+ 无 currentBookId 时死锁 | 没 currentBookId 时 chip 自动切到「全部作品」，并显示 toast「未打开作品，已切到全部作品搜索」 |

### 4.3 状态完整矩阵

| 状态 | 当前 | 提议 |
| --- | --- | --- |
| 空查询 | 「输入关键字开始搜索」 | 同 + 提示快捷键「⌘P 随时打开」 |
| 搜索中 | 「搜索中...」 | 同 + skeleton |
| 有结果 | snippet + dangerouslySetInnerHTML | 同 + kind chip 标识；snippet 仍用 dangerouslySetInnerHTML（FTS 高亮是受信源） |
| 无结果 | 「未找到匹配章节」 | 同 + kind chip 上显示 0 命中；引导「换个关键词 / 搜全部资产」 |
| 错误 | 抛 boundary | toast + retry |
| 键盘 | 仅鼠标点 | ↑↓Enter |
| 跨作品命中 | 直接 openBook | confirm dialog |

## 5. 跨 surface 关联性问题方案

| Issue | 方案 |
| --- | --- |
| GLOBAL-1 | 引入 `WORKSPACE_COMMAND_REGISTRY`（详见 §3.1）。把现有 `CommandPalette useCommands()` + `TopBar WORKSPACE_TOOL_ACTIONS` + 「BookCard hover icon」全部 derive 自 registry。registry 单元测试断言所有 modal 都有对应 nav.* 命令 |
| GLOBAL-2 | TopBar / BookshelfPage 都暴露「⌘K 找动作」「⌘P 找内容」入口；进一步在 onboarding tour 第一步介绍 |
| GLOBAL-3 | 引入 `<DialogShell>` 共用组件，CommandPalette + GlobalSearchModal + 未来其他「快速行动」modal 都派生自它 |

## 6. 实施分批建议（待 TASK-DUX-005 lock 后再开 plan）

| 批次 | 范围 | 估时 | 依赖 |
| --- | --- | --- | --- |
| 批 1 | 引入 `WORKSPACE_COMMAND_REGISTRY` + CommandPalette derive；TopBar 工具按钮 derive | 1-2 工日 | 无 |
| 批 2 | 引入 `<DialogShell>` + CommandPalette / GlobalSearchModal 都迁过去 | 0.5-1 工日 | 批 1 |
| 批 3 | TopBar 双行 chrome（方案 A）+ ResizeObserver 渐进折叠（去 `topbarToolsCollapsed` 开关） | 1-1.5 工日 | 批 1 |
| 批 4 | BookshelfPage 单一 hero dialog + 「新建作品」menu button + Action panel + 持久化偏好 | 1.5 工日 | 批 1 |
| 批 5 | GlobalSearch 键盘 / 错误处理 / kind chip（前端先做，后端扩展独立 lane） | 1 工日 | 批 2 |
| 批 6 | 命令 recent / favorites / alias + theme.set submodal | 0.5-1 工日 | 批 1 |

总估：5.5 - 7.5 工日，按批次提交，每批独立可 revert。

## 7. 不做（明确排除）

- 不动 `EditorArea` / `OutlineTree` / `AiAssistantDock` 的 UX（属 TASK-DUX-004 范围）
- 不动数据库 schema、IPC 协议（除 §4 search backend 扩展，那条另开 lane）
- 不动 AI 写入路径（属 TASK-DUX-006）
- 不引入新的视觉资产 / 营销级动效 / 主题色
- 不重写 `BookCard` 内部布局（只改 hover action 触发方式）
- 不删除 `topbarToolsCollapsed` 之前的本地存储 key（迁移期保留兼容）

## 8. 验证矩阵建议

实施 TASK-DUX-005 时，把审计 §6 的 5 条 + 本方案补 3 条加入 [`verification-matrix.yaml`](../verification-matrix.yaml)：

| 校验 ID | 命令 / 检查点 | 期望 |
| --- | --- | --- |
| navigation-keyboard-shortcuts | `⌘K` / `⌘P` 在书架 + 工作区都唤起 | RTL test |
| navigation-cmd-source-of-truth | `WORKSPACE_COMMAND_REGISTRY.test.ts` 断言所有新增 modal 都有对应 nav.* | unit test |
| dialog-shell-consistency | snapshot 对比 CommandPalette / GlobalSearchModal 都使用 `<DialogShell>` | snapshot |
| search-vs-command-divergence | placeholder + icon 在 CommandPalette / GlobalSearchModal 上明确区分 | RTL test |
| search-content-coverage | `window.api.searchAssets` 返回 ≥ 4 类资产命中 | API contract |
| search-keyboard-navigation | ↑/↓/Enter 在 GlobalSearchModal 工作 | RTL test |
| topbar-resize-observer | 模拟 1280→1024→800px 顶栏自动折叠到方案 B | visual regression |
| bookshelf-empty-state-keyboard | Tab 顺序：AI 起书 → 空白 → 迁移 | RTL test |

## 9. 下一步

1. 你审阅本方案 + 审计文档
2. 锁定方案后由你审批 TASK-DUX-005
3. 我按 §6 分批开新 plan 实施
