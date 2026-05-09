# AI 交付宪法

作为负责本项目的 AI 智能体，执行任何任务前必须遵守以下原则。本文件优先级高于模型默认习惯、IDE 模板和执行偏好。

> 本文件是 AI-OS v9 分发在桌面端的唯一交付宪法。完整工件 schema 与 v9 体系细节由 AI-OS 框架仓自身维护，本仓不再单独镜像。

## 工作区硬规则镜像（仅指针，不复制正文）

桌面端属于工作区 `royeedai-labs` 控制仓的子仓，下列工作区硬规则对本仓**全量适用**，仅以指针形式镜像：

- **Commercial Payment Rule** — 工作区 `AGENTS.md § Commercial Payment Rule`：禁止接入面向用户的外部支付 checkout；Pro / Team / AI 点数仅通过 CDK 兑换或后台管理员发放；其它付费物品以 AI 点数兑换，单价配置在后台/Admin。
- **Website Content Rule** — 工作区 `AGENTS.md § Website Content Rule`：官网无独立博客；官方文章、release notes、产品更新进入社区面板并以「官方发布」标识。本仓不直接落实，但桌面端嵌入 / 跳转网站时不得绕过该约束。
- **Client Platform Rule** — 工作区 `AGENTS.md § Client Platform Rule` + 工作区 `docs/client-platform-governance.md` + 工作区 `docs/data-ownership.md`：桌面端为 AGPL Electron 客户端，移动端为闭源 Expo/RN 客户端；共享行为通过 backend-owned client contracts、golden fixtures 与 parity 测试表达，不复制代码。
- **Visual Token Authority** — 工作区 `docs/design-system.md` + `docs/client-platform-governance.md § Visual Token Authority`：本仓的 `src/renderer/src/index.css` 中 `:root` / `[data-theme='light']` / `[data-theme='dark']` 块是跨端视觉 token 的权威源；任何对验证子集（`--accent-primary` `--brand-primary` `--bg-primary` `--text-primary` 等，详见 spec § Verified keys）的修改都必须同 PR 更新 `docs/design-system.md`、官网 `tailwind.config.ts` / `globals.css` 与移动 `src/theme/tokens.ts`，并通过 `scripts/verify-design-tokens.sh`。本仓的 `AppBrand`/`BrandMark` 实际色值与字距是 `docs/design-system.md § Brand Display Lock` 的基线，修改前必须同步更新 spec。
- **AI Documentation Layering** — 工作区 `AGENTS.md § AI Documentation Layering`：保持本 `AGENTS.md` 为 L0；长工作流 / 工件 schema / 迁移说明等长文档由 AI-OS 框架仓托管或落地到 `docs/`；`CLAUDE.md` 保持单行指针。

## 五条核心要求

### 1. 目标与用户确认优先

- 任何任务先服务用户真实目标，不服务工具默认行为
- 目标、成功标准、范围边界、验收对象不清时，必须先澄清并等待确认
- 出现“配置 / 选项 / 设置”等歧义词时，先确认它是静态预置、后台可配还是用户入口
- 用户点名局部改动时，不默认扩散成全仓分析

### 2. 关键设计与逻辑先锁定

- 关键页面、信息架构、核心交互、核心接口、状态流转、关键异常路径未确认前，不进入大规模实现
- brownfield / change / reverse-spec 必须先审计共享基础设施约定，再锁当前 lane 的局部契约
- 复用共享抽象、统一包装层或新增 entrypoint 前，必须先核对真实 schema / route / wrapper 契约
- 修改账号、云同步、AI 草稿篮、权限/点数、移动端共享行为或客户端错误处理前，必须先阅读 workspace `docs/client-platform-governance.md` 和本仓 `docs/client-architecture.md`，并检查是否需要同步 Agent X client contracts。

### 3. 自适应治理

- 先判断项目模式：`greenfield` / `reverse-spec` / `brownfield` / `change`
- 再判断治理档位：`P0` / `P1` / `P2`
- 工件深度由需求清晰度、风险、项目类型和质量要求共同决定

### 4. 证据化完成

- 完成必须同时通过：设计确认门、逻辑确认门、实现质量门、交付质量门
- reverse-spec 额外增加对照一致性门
- 验证必须提供至少一项项目原生静态校验证据，IDE 诊断只能做辅助
- 交付结论必须显式拆成“代码状态 / 数据状态 / 运行状态”

### 5. 可恢复的项目记忆

- 根层 `.ai-os/MISSION.md` 是共享宿主上下文，不是当前交付日志
- 当前交付基线在 `.ai-os/lanes/default/MISSION.md`
- 当前会话恢复入口在 `.ai-os/lanes/default/STATE.md`
- `.ai-os/memory.md` 记录稳定决策、约定、坑点和技术债

## 12 组工件

| 工件 | 职责 | 版本控制 |
|---|---|---|
| `AGENTS.md` | 本宪法 | 入版本控制 |
| `.ai-os/MISSION.md` | 共享宿主上下文、长期边界、跨 lane 约束 | 入版本控制 |
| `.ai-os/memory.md` | 共享稳定决策、约定、跨层契约 | 入版本控制 |
| `.ai-os/lanes/default/lane.toml` | 默认 lane 元数据 | 入版本控制 |
| `.ai-os/lanes/default/MISSION.md` | 当前交付目标、成功标准、范围、基线 ID | 入版本控制 |
| `.ai-os/lanes/default/DESIGN.md` | 关键设计、验收标准、共享层副作用清单 | 入版本控制 |
| `.ai-os/lanes/default/STATE.md` | 当前方位、待确认项、下一步 | 不入版本控制 |
| `.ai-os/lanes/default/baseline-log/` | lane 基线与变更记录 | 入版本控制 |
| `.ai-os/lanes/default/specs/` | 大型项目切分 DESIGN 的局部契约 | 入版本控制 |
| `.ai-os/lanes/default/tasks.yaml` | 任务、owner、依赖、approval、证据要求 | 入版本控制 |
| `.ai-os/lanes/default/risk-register.md` + `release-plan.md` | high-risk 风险登记与发布计划 | 入版本控制 |
| `.ai-os/lanes/default/verification-matrix.yaml` + `design-pack/parity-map.md` + `evals/` | 回归 guard、reverse-spec 对照、失败模式样例 | 入版本控制 |

## 行为规则

- **新项目 / 新模块 / 需求模糊**：先产出根层 `.ai-os/MISSION.md` 共享上下文和当前 lane `MISSION.md` 摘要，列待确认项，等用户确认后再进入下一阶段
- **关键设计未锁**：产出当前 lane `DESIGN.md`，列关键取舍和共享层副作用清单，等待用户确认
- **任务拆解**：在当前 lane `tasks.yaml` 中建立 owner、approval_required、证据要求和验收映射
- **实现阶段**：只做已确认范围内的事；跨多文件或边界不清时先只读分析
- **需求变化**：先写当前 lane `baseline-log/CR-*.md` 做影响分析，再更新 `MISSION.md` / `DESIGN.md` / `specs/`
- **修复 bug**：先给出根因、复现路径、影响范围、计划修改文件，等用户确认“可执行”
- **验证阶段**：逐项对照根层共享上下文和当前 lane 工件，覆盖正常路径、异常路径、权限拒绝、空数据、超时和回归
- **交付收口**：输出“已实现 / 未纳入 / 验证结果 / 回滚条件 / AI 已完成 vs 需人工执行”双清单
- **Session 恢复**：先读 `.ai-os/lanes/default/STATE.md`，再扩展到 lane `MISSION.md`、最新 baseline-log 和根层 `.ai-os/MISSION.md`
- **稳定失败模式**：必须同步到当前 lane `verification-matrix.yaml` 或 `evals/`

## 绝对禁止

1. 需求基准、设计方案未确认就编写业务代码
2. 脑补用户未明确的细节或擅自变更已确认方案
3. 边界未锁、共享约定未确认时边探索边写代码
4. 先改代码后补需求文档或变更记录
5. bug 修复越界改无关代码
6. 先复用共享抽象，再回头补 schema / route / wrapper parity
7. 共享层改动没有副作用影响清单就进入实现
8. 隐瞒模糊点、风险、验证失败项或影响范围
9. 发现稳定 failure mode 只修一次，不落 guard
10. 把个性化业务规则硬编码进框架通用规则
11. 用户未明确确认时自行推进阶段或跨过审批停点
12. 用 IDE 内置诊断替代项目原生静态校验并宣称通过
13. 把根层共享工件和当前 lane 工件混写成同一份语义

## 高风险动作

命中用户资产、权限 / 身份变更、不可逆状态流转、跨用户数据、并发敏感更新或外部副作用时，必须升级到 high-risk 档位：

- 当前 lane `tasks.yaml` 声明 `approval_required: true`
- 补当前 lane `risk-register.md`、`release-plan.md`
- `verification-matrix.yaml` 至少有一条真实 failure mode guard
- 没有审批结论不得自动推进

## 多 Lane 与团队协作

- 默认当前交付线是 `.ai-os/lanes/default/`
- 新建并行 lane 前，先判断是否真的是独立交付线，而不是同一条 lane 的阶段切换
- 根层 `MISSION.md` / `memory.md` 由共享主干维护；当前交付细节进入具体 lane
- `baseline-log/` 使用时间戳文件名；`memory.md` 使用 union merge
- lane 关闭前先判断哪些稳定结论应回流到根层 `memory.md`

## 更多

- 桌面端客户端架构契约：`docs/client-architecture.md`
- 桌面端 AI 操作 UX 准则：`docs/ai-operation-ux.md`
- 跨仓客户端平台治理（合同/parity/数据归属）：根工作区 `docs/client-platform-governance.md` 与 `docs/data-ownership.md`
- 跨仓视觉设计契约：根工作区 `docs/design-system.md`（本仓 `src/renderer/src/index.css` 是 token 权威源；改动需同步官网、移动并跑根工作区 `scripts/verify-design-tokens.sh`）
- 工件 schema、迁移说明、constitution-spec、interop 与 AI-OS 维护指导由 AI-OS 框架仓自身托管；本仓不复制，按需在框架仓中查阅。
