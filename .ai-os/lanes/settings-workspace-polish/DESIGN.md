# 系统/作品设置拆分与工作区统一收口 Design

## 1. 设计目标

- **信息架构目标**：系统级与作品级设置彻底拆开，避免标题栏与设置面板混放。
- **数据目标**：题材模板升级为系统级持久化资源；作品只保存套用后的字段快照，不建立模板引用同步。
- **交互目标**：新建作品、标题栏、右侧灵感与创世沙盘形成更明确、更可发现的主路径。
- **视觉目标**：剩余旧页面统一使用主题变量，不再保留硬编码暗色/紫绿主视觉。

## 2. 关键页面与交互

| 页面 / 入口 | 改动目标 | 保持不变 |
|---|---|---|
| 应用设置 | 成为系统设置真入口，承接系统级配置 | 现有主题、账号、更新能力逻辑 |
| 项目设置 | 收窄为作品级配置，只负责套用题材和设置本作日更 | 仍通过现有 modal 入口打开 |
| 新建作品第二步 | 从系统模板库选模板；空库时可叠加进入系统设置建模板 | 第一步标题/作者创建流程 |
| 工作区 TopBar | 显式区分应用设置与作品设置；标题栏背景双击可最大化 | 现有书名返回、面板开关、核心工具入口 |
| 右侧灵感 | tab 展示数量 badge，并与列表状态实时同步 | 新增/删除灵感的作品绑定语义 |
| 创世沙盘 | 首节点可见、横纵拖拽、点击/拖拽分离、滚动与空状态更清晰 | `PlotNodeModal` 详细编辑职责 |
| 旧样式页面 | 统一接入主题 token | 数据计算、业务逻辑、modal type |

## 3. 核心数据与接口

- 新增 `genre_templates` 表：
  - `id`, `name`, `slug`, `character_fields`, `faction_labels`, `status_labels`, `emotion_labels`, `is_seed`, `created_at`, `updated_at`
- 新增系统级 app state：
  - `system_default_genre_template_id`
  - `system_default_daily_goal`
- `project_config` 新增 `daily_goal_mode`：
  - `follow_system`
  - `custom`
- preload / IPC 新增：
  - 题材模板 CRUD / copy / set default / get default
  - 系统默认日更目标读写
  - `window:toggleMaximize`
  - `window:isMaximized`

## 4. 关键规则

- 作品套用模板时，把模板字段快照写入 `project_config`，不保留动态引用。
- migration 回填策略：
  - 历史 `daily_goal = 6000` 的作品回填 `follow_system`
  - 非 6000 的作品回填 `custom`
- 新建作品：
  - 有默认模板则自动选中
  - 无默认模板但有模板库则需显式选择
  - 模板库为空则禁用提交，并允许叠加打开“应用设置 / 题材模板”
- 标题栏双击只在非交互区域生效；按钮、输入、菜单继续使用 `no-drag`。

## 5. 共享层副作用清单

- SQLite schema / migration / preload API 变更会影响书架、工作区、新建作品与设置面板。
- `AppSettingsModal` 与 `ProjectSettingsModal` 会重新分配快捷键、备份与迁移、AI 入口的归属。
- `TopBar`、`BookshelfPage`、`BottomPanel` 的交互改动会影响窗口 chrome、onboarding 可发现性和窄屏菜单。
- 旧样式统一会波及多处 modal surface 和 canvas / svg 渲染色，需要保留语义色但改为主题派生。

## 6. 验收标准

- AC-SWP-001：系统级配置不再出现在项目设置中，作品级配置不再混入应用设置。
- AC-SWP-002：题材模板库支持新建、复制、编辑、默认模板；新建作品和项目设置均可使用。
- AC-SWP-003：作品支持“跟随系统 / 自定义”两种日更目标模式，跟随中的作品随系统默认变化。
- AC-SWP-004：灵感数量可见；标题栏双击可最大化/还原；创世沙盘首节点可见且拖拽更新章节与爽度。
- AC-SWP-005：总览、风格分析、文本分析、导出、一致性检查、角色对比及其关联局部图表不再保留旧硬编码皮肤。
- AC-SWP-006：已有作品不会因为编辑系统模板而被动改写题材字段。
