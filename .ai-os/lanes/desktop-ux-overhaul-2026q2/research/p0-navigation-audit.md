# P0 导航与命令体系 UX 审计（TASK-DUX-003）

> 审计日期：2026-05-09
> 来源：`surface-ledger.json` 自动生成的 surface 元数据 + 源码反推。
> 范围：4 个 P0 surface — `BookshelfPage`、`TopBar`、`CommandPalette`、`GlobalSearchModal`。
> 配对设计方案：[`p0-navigation-design-proposal.md`](./p0-navigation-design-proposal.md)。
> 实施仍需等 TASK-DUX-005 经设计 lock 后由你审批，本审计只输出问题清单与方案候选。

## 0. Design Principles 速查

来自本 lane [`DESIGN.md`](../DESIGN.md) 的 6 条 Design Principles，下文每个 surface 的 P0/P1/P2 issue 都对到下面的 ID：

| ID | 原则 |
| --- | --- |
| DP-1 | 写作主路径优先 |
| DP-2 | 任务分区明确 |
| DP-3 | 命令中心为动作真理源 |
| DP-4 | 上下文操作优先 |
| DP-5 | 状态完整（空/有/loading/error/权限/键盘/溢出） |
| DP-6 | AI 可控（写入前必须预览和用户确认） |

## 1. SURF-BOOK-001 `BookshelfPage`

源码：[`src/renderer/src/components/bookshelf/BookshelfPage.tsx`](../../../../src/renderer/src/components/bookshelf/BookshelfPage.tsx)

### 1.1 当前结构

| 区域 | 元素 | 行为 |
| --- | --- | --- |
| 12px 顶栏（`drag-region`） | `AppBrand` + 「新建作品」按钮 + `AccountSettingsMenu` | 双击切换最大化；「新建作品」→ `openModal('newBook')` |
| 内容区 | 空态：「开始你的创作之旅」+「让 AI 一起开本书」+「先创建空白作品」+「迁移现有作品」三按钮 | 空态时 AI 起书是「次主操作」（accent surface），新建空白是「主操作」（accent button） |
| 工具栏 | 标题（"作品库"）+ 数量提示 + 排序下拉 + 视图切换 + 搜索框 | 搜索仅在 `book.title` / `book.author` 上做 substring 过滤，没有跨作品内容搜索 |
| 网格/列表 | `BookCard` × N | hover 出现 `chooseCover` / `regenerateCover` / `delete` 三个 icon-button，需 `event.stopPropagation()` 避免误打开 |

### 1.2 状态盘点

来自 ledger：`空书架、有作品、搜索无结果、网格、列表、删除确认、AI 起书 Dock 打开`。

源码补充：
- 空查询 + 有作品 → `filteredBooks` = 全部
- 有查询 + 无匹配 → 列表完全为空（**没有「无结果」专属空状态**，与 ledger 描述不一致）
- AccountSettingsMenu 的「设置」入口与作品级设置（projectSettings）混淆 — 用户在书架页能打开应用设置，但作品级设置只能在工作区开
- 删除时 `BookCard` 内部触发 confirm，无 undo 路径

### 1.3 Issue 清单

| ID | 严重度 | 原则 | 问题 |
| --- | --- | --- | --- |
| BOOK-1 | P0 | DP-2 | 顶栏「新建作品」与空态「让 AI 一起开本书」是同一意图的两个不同入口，但视觉重权颠倒：AI 起书在空态是 accent surface（次级），新建空白是 accent button（主级）。建议统一为「新建作品 / AI 起书」二选一对话流 |
| BOOK-2 | P0 | DP-3 | 没有 `⌘K` / `⌘P` 提示触发 `CommandPalette`；新用户无法发现命令面板。书架是新用户首次落地，必须在此暴露命令中心 |
| BOOK-3 | P0 | DP-5 | 搜索无结果时直接列表为空，缺空态文案 + 引导动作（清除查询 / 切换全部作品 / AI 起书） |
| BOOK-4 | P1 | DP-4 | hover icon-button 视觉权重过高（删除按钮长在卡片上），易误删。建议改为右键菜单或卡片右上角 ⋯ 触发的 action panel |
| BOOK-5 | P1 | DP-2 | `AccountSettingsMenu` 既显示「设置」（应用设置）又能点出账户面板，但「设置」对应的 modal 在书架与工作区行为不一致（书架打不开 projectSettings/aiSettings 因为没有 currentBook） |
| BOOK-6 | P2 | DP-5 | 排序下拉默认 `updated`，缺持久化（用户换 title 后下次回来又变回来）。Linear / Raycast 都把视图偏好持久化 |
| BOOK-7 | P2 | DP-5 | 长标题截断在 BookCard 内未审计；网格密度切换会让卡片宽度变窄，需要 ledger 补「文本溢出」一项 |

## 2. SURF-NAV-001 `TopBar`

源码：[`src/renderer/src/components/layout/TopBar.tsx`](../../../../src/renderer/src/components/layout/TopBar.tsx)（384 LOC）

### 2.1 当前结构

12px drag region，三段：

| 段 | 元素（左→右） |
| --- | --- |
| 左 | `AppBrand compact` ＋ 竖线 ＋ 「《作品名》」（点击关闭作品）＋ 「打开总览」按钮（accent）＋ `panelLeft/right/bottom` 三个 toggle ＋ `LayoutPanelTop` 布局菜单（4 builtin + custom + 「保存当前布局」） |
| 中 | `topbar-tools`（仅 `xl:flex`）：`primaryToolActions` × N（accent / secondary tone） |
| 右-1 | `MoreHorizontal` 「更多工作区工具」（仅 < xl 显示，或 `topbarToolsCollapsed`）：按 group 分组，最后一项是「固定显示工具区 / 收起工具区」开关 |
| 右-2 | `PomodoroTimer` ＋ `AccountSettingsMenu showTrash` |

### 2.2 状态盘点

来自 ledger：`工具区展开/折叠、布局菜单、保存自定义布局、窄屏更多菜单、拖拽安全区`。

源码补充：
- 「打开总览」按钮永远使用 accent surface — 与「新建作品」「AI 起书」的视觉权重相同，但语义优先级低很多
- 三个 panel toggle（`PanelLeftClose/Open` 等）有 hover、aria-label、title，但没有显示快捷键
- 布局菜单 4 个 builtin（`default / focus / review / canon` 之类）+ N custom；不显示当前 preset 名字（只有打开菜单后才看见 ✓）
- xl 之间切换没有过渡：`hidden xl:flex` → `flex xl:hidden` 是硬切，不展示 transition
- 只在 `MoreHorizontal` 菜单里有「固定显示工具区 / 收起工具区」开关；该开关在 xl 屏一般用不到（已有 `xl:flex`），但 xl 窗口宽度变窄会突然消失

### 2.3 Issue 清单

| ID | 严重度 | 原则 | 问题 |
| --- | --- | --- | --- |
| NAV-1 | P0 | DP-2 | TopBar 同时承担导航（返回书架 + 作品名）+ 布局（4 panel toggle + 布局预设）+ 工具入口（6 个工作区工具）+ 系统入口（番茄 + 账户）+ 总览快捷入口；高度 12px 容纳不下，导致中间「工具区」必须 `xl:flex` 才显示，1280px 以下用户被迫用 `MoreHorizontal` 菜单。这违反「任务分区明确」 |
| NAV-2 | P0 | DP-3 | TopBar 没有 ⌘K / ⌘P 入口提示；用户必须背快捷键才能用命令面板。Linear / Raycast 都把 root search 入口在 top chrome 提示出来 |
| NAV-3 | P0 | DP-5 | 当前 `workspaceLayoutPresetId` 在 TopBar 上不可见（只有 `LayoutPanelTop` icon），用户不知道当前是哪个布局；切换布局后没有可视化反馈 |
| NAV-4 | P1 | DP-2 | 「打开总览」用 accent surface 占了与三个 panel toggle 同级的视觉位置，是隐式「主操作」但语义上是次操作。建议改为 secondary tone 或挪到工作区工具区 |
| NAV-5 | P1 | DP-5 | xl 屏宽度变化时工具区硬切（`hidden xl:flex` → `flex xl:hidden`），没有 transition 也没有渐进消失提示 |
| NAV-6 | P1 | DP-4 | panel toggle 没有显示对应的快捷键（相比 `view-blackroom` 命令在面板里显示了 F11）；用户不知道有快捷键也不知道是什么 |
| NAV-7 | P2 | DP-5 | 布局菜单的 `customWorkspaceLayoutPresets` 只能新增和应用，不能重命名/删除（需要去 settings 操作） |

## 3. SURF-CMD-001 `CommandPalette`

源码：[`src/renderer/src/components/shared/CommandPalette.tsx`](../../../../src/renderer/src/components/shared/CommandPalette.tsx)（439 LOC）

### 3.1 当前结构

- 23 commands × 5 categories：导航 7（characters / wiki / projectSettings / foreshadowBoard / quickNotes / export / import）+ 编辑 3（newVolume / newChapter / newCharacter）+ AI 2（assistant / aiSettings）+ 视图 4（leftPanel / rightPanel / bottomPanel / blackroom）+ 主题 7（system / light / dark / dark-green / dark-blue / dark-warm / dark-oled）
- fuzzy match：所有 query 字符按顺序在 label 里出现即匹配
- 键盘：↑/↓ 切换 cursor，Enter 执行，Esc 关闭
- `requiresBook: true` 在没有 currentBookId 时过滤掉
- 主题命令仅在 `theme-*` 上，`requiresBook: false` — **唯一在书架页可执行的类目**

### 3.2 状态盘点

ledger：`空查询、有查询、无结果、requiresBook 过滤、键盘上下选择、执行后关闭`。

源码补充：
- 「无匹配命令」是唯一的空状态文案，没有给出可发现性建议（如「试试输入『新建』『主题』」）
- 没有 recent / favorites
- 没有 alias（用户输入 `np` 不能命中「新建」）
- 命令源跟 `WORKSPACE_TOOL_ACTIONS`（在 TopBar 用）是两份不同的 metadata，**违反「命令中心为动作真理源」**
- 没有覆盖「打开 GlobalSearch」「关闭当前作品」「打开命令面板」这种导航动作
- 主题命令占 7/23 = 30% 容量，但 query 一般是「主题」二字就能定位 — 这种「枚举状态」型动作压缩为「设置主题 → 子菜单」会更整洁
- 没有 shortcut hint 显示（`shortcut?: string` 字段只在 `nav-export` / `view-bottom` / `view-blackroom` 上填了）

### 3.3 Issue 清单

| ID | 严重度 | 原则 | 问题 |
| --- | --- | --- | --- |
| CMD-1 | P0 | DP-3 | CommandPalette 与 TopBar `WORKSPACE_TOOL_ACTIONS` 是两份独立的命令元数据；同一动作（`fullCharacters` / `projectSettings` / `foreshadowBoard` / `quickNotes`）维护在两处，永远会漂移 |
| CMD-2 | P0 | DP-3 | 命令面板自身没有「打开命令面板」「关闭作品」「打开全局搜索」「打开 AI 助手（书架场景）」这种导航命令；同时没有覆盖 `WritingIntelModal` / `MarketScanDeconstructModal` / `DirectorPanelModal` / `VisualStudioModal` / `MCPSettings` 等新增 modal — 真理源不全 |
| CMD-3 | P1 | DP-5 | 没有 recent / favorites / alias；常用动作每次都要重新输入。Raycast 的 hot keys + favorites 可作为参考 |
| CMD-4 | P1 | DP-4 | 23 commands 中 7 是主题切换，挤占面板容量；建议改为「设置主题 → 子菜单」单一入口 |
| CMD-5 | P2 | DP-5 | shortcut hint 只在 3 个 command 上填了；其余 command 即使有快捷键（如未来 `⌘K` / `⌘P`）也不显示 |

## 4. SURF-SEARCH-001 `GlobalSearchModal`

源码：[`src/renderer/src/components/modals/GlobalSearchModal.tsx`](../../../../src/renderer/src/components/modals/GlobalSearchModal.tsx)（161 LOC）

### 4.1 当前结构

- 单输入框 + 范围切换（「仅当前作品」/「全部作品」）+ 关闭按钮
- 300ms debounce
- 调用 `window.api.searchChapters(query, bookId?)` — **后端只搜章节（标题 + 正文 FTS），不搜角色 / 设定 / Canon Pack / 引用**
- 命中显示 `title` + `volume_title` + 含 `<span class="fts-hit">` 的 snippet（`dangerouslySetInnerHTML`）
- onPick 自动 `openBook(book_id) + loadVolumes + selectChapter + closeModal`

### 4.2 状态盘点

ledger：`空查询、搜索中、有结果、无结果、打开结果、错误`。

源码补充：
- 「错误」状态在源码里没有处理 — `searchChapters` 抛错没 catch，会冒泡到 React error boundary
- 没有键盘上下选择 + Enter 跳转，只能鼠标点
- 「仅当前作品」+ 没有 currentBookId 时显示警告但仍可输入，状态死锁
- 跨作品命中要 openBook 并切换 currentBookId，对当前编辑状态有副作用（如果用户正在编辑未保存草稿…）

### 4.3 Issue 清单

| ID | 严重度 | 原则 | 问题 |
| --- | --- | --- | --- |
| SEARCH-1 | P0 | DP-2 | 仅搜章节，但 modal 标题写「全局搜索」、ledger 写「跨章节、设定、角色、剧情资产查找内容」— **承诺与实现不一致**；用户期望搜出角色/设定，得到空结果 |
| SEARCH-2 | P0 | DP-3 | 与 CommandPalette 没有清晰的视觉对照：用户怎么知道这是「找内容」而不是「找动作」？两个 modal 的 shell 也不统一 |
| SEARCH-3 | P0 | DP-5 | 错误状态未处理（搜索失败抛到 error boundary），`searchChapters` 失败时用户看不到反馈 |
| SEARCH-4 | P0 | DP-5 | 没有键盘 ↑/↓/Enter 导航，键盘党无法使用 |
| SEARCH-5 | P1 | DP-4 | 跨作品命中点击会强制打开新作品 + 切换 currentBookId，对正在编辑的状态有副作用，缺 confirm |
| SEARCH-6 | P2 | DP-5 | 「仅当前作品」+ 无 currentBookId 时既显示警告又允许输入，是死锁状态；建议自动切到「全部作品」 |

## 5. 跨 surface 关联性问题

| ID | 严重度 | 原则 | 问题 | 涉及 surface |
| --- | --- | --- | --- | --- |
| GLOBAL-1 | P0 | DP-3 | 命令面板 / 全局搜索 / TopBar 工具按钮三处各维护一份 metadata（`useCommands` / `searchChapters` / `WORKSPACE_TOOL_ACTIONS`），三份都不全也不互通；DP-3「命令中心为动作真理源」无法落地 | CommandPalette + GlobalSearchModal + TopBar + BookshelfPage |
| GLOBAL-2 | P0 | DP-2 | 「找动作」（CommandPalette）和「找内容」（GlobalSearchModal）在书架/工作区都没有可见入口；用户必须知道快捷键才能用 | CommandPalette + GlobalSearchModal + BookshelfPage + TopBar |
| GLOBAL-3 | P1 | DP-5 | 两个 modal 的 shell 不统一：CommandPalette 用 `pt-14`、`max-w-xl`、`backdrop-blur-sm`、自带 close hint；GlobalSearch 用 `mt-16`、`max-w-3xl`、`backdrop-blur-md`、显式 X 按钮。Modal shell 没有共用组件 | CommandPalette + GlobalSearchModal |

## 6. 验证矩阵建议

本 lane [`verification-matrix.yaml`](../verification-matrix.yaml) 当前未包含 P0 surface 的回归 guard。建议在 TASK-DUX-005 实施时同步添加：

| 校验 ID | 命令 / 检查点 | 期望 |
| --- | --- | --- |
| navigation-keyboard-shortcuts | 键盘 `⌘K` / `⌘P` 在书架 + 工作区都能唤起 CommandPalette | pass |
| navigation-cmd-source-of-truth | TopBar 工具按钮 + CommandPalette 命令的 metadata 共用 `WORKSPACE_COMMAND_REGISTRY`，单一 source | static guard |
| search-vs-command-divergence | GlobalSearch 与 CommandPalette 共用 modal shell；两者 placeholder 文案明确「搜内容」vs「找动作」 | snapshot |
| search-content-coverage | `searchChapters` 扩展为 `searchAssets`，覆盖角色 / 设定 / Canon Pack / 引用 至少 4 类资产 | API contract test |
| search-keyboard-navigation | GlobalSearchModal 支持 ↑/↓/Enter | RTL test |

## 7. 下一步

- 把上面 7 + 7 + 5 + 6 + 3 = 28 条 issue 按设计方案落到 [`p0-navigation-design-proposal.md`](./p0-navigation-design-proposal.md)。
- 设计方案 lock 后，由你审批 TASK-DUX-005，再开新 plan 进入实现。
- 实施时同步把 `verification-matrix.yaml` 第 6 节 5 条新校验补进去。
