<!-- ai-os-generated -->

# AI-OS 项目交付操作系统

本项目使用 AI-OS 进行交付管理。完整规则见 `AGENTS.md`。

## 会话初始化

每次新 session 启动时，先确认当前 lane；若存在多个 active lane，先执行 `create-ai-os lane list .` 明确拓扑。确认当前 lane 后，依次读取以下文件了解项目状态：

1. 当前 lane 的 `.ai-os/lanes/<lane-id>/STATE.md`（legacy 单交付项目则是 `.ai-os/STATE.md`） — 当前阶段、进度和待确认项
2. 当前 lane 的 `.ai-os/lanes/<lane-id>/MISSION.md`（legacy 单交付项目则是 `.ai-os/MISSION.md`） — 已确认的当前交付基线章程
3. 当前 lane 的 `.ai-os/lanes/<lane-id>/baseline-log/`（legacy 单交付项目则是 `.ai-os/baseline-log/`） — 最近的基线记录目录（优先读最新 confirmed 记录）
4. `.ai-os/memory.md` — 稳定决策和约束（优先读 active 条目）

如果上述文件不存在，说明项目尚未初始化，从 `/align` 开始。

## 核心原则

- 无已确认需求基准不编写业务代码
- 关键设计和逻辑未锁定不大规模实现
- 需求变更先更新基准再改代码
- 完成必须有证据，不接受口头声明
- 详细规则见 `AGENTS.md`

## Workflow 命令

| 命令 | 用途 | 详细流程 |
|------|------|---------|
| /align | 澄清目标、用户、范围、项目模式、质量标准、关键选型和待确认项 | `.agents/workflows/align.md` |
| /auto-advance | 在设计门和逻辑门通过后按任务波次自动推进 | `.agents/workflows/auto-advance.md` |
| /build | 在设计门和逻辑门通过后按 wave 实现 | `.agents/workflows/build.md` |
| /change-request | 在需求补充、范围调整和验收变化前先同步需求基准并等待确认 | `.agents/workflows/change-request.md` |
| /debug | 对单点 bug 和轻量改动执行方案确认、边界锁定、修复验证的轻量闭环 | `.agents/workflows/debug.md` |
| /design | 锁定关键信息架构、页面、交互、视觉方向和关键流程 | `.agents/workflows/design.md` |
| /next | 推断当前最值得执行的就绪任务 | `.agents/workflows/next.md` |
| /plan | 生成 specs、tasks、acceptance 和证据计划 | `.agents/workflows/plan.md` |
| /postmortem | 对项目或里程碑做复盘并沉淀稳定经验 | `.agents/workflows/postmortem.md` |
| /resume | 从 STATE.md 恢复当前方位和最小阅读集 | `.agents/workflows/resume.md` |
| /review | 对方案、实现或交付进行多维度结构化审查 | `.agents/workflows/review.md` |
| /ship | 做交付、发布、回滚和移交 | `.agents/workflows/ship.md` |
| /status | 查看当前方位、已锁定内容、待确认项和任务概览 | `.agents/workflows/status.md` |
| /verify | 验证设计一致性、逻辑正确性、工程质量和运行态证据 | `.agents/workflows/verify.md` |

## Skill 能力

遇到以下场景时，读取对应 skill 文件获取详细指引：

| Skill | 触发场景 | 文件 |
|-------|---------|------|
| acceptance-gate | 当需要定义或更新验收门禁时，使用本 Skill 管理设计确认门、逻辑确认门、实现质量门、交付质量门和 parity-gate。 | `.agents/skills/acceptance-gate/SKILL.md` |
| api-design | RESTful 和 GraphQL API 设计指南。创建新 API、重构现有接口或编写 API 文档时使用。 | `.agents/skills/api-design/SKILL.md` |
| architecture-reviewer | 代码架构与抽象审查守卫。在完成复杂业务模块后，用于审查代码的坏味道、设计模式的合理性以及 SOLID 原则的落地情况。 | `.agents/skills/architecture-reviewer/SKILL.md` |
| change-impact-analyzer | 处理需求变更、范围调整、补充规则和漏项修复。 | `.agents/skills/change-impact-analyzer/SKILL.md` |
| code-review-guard | 代码交付前自审守卫。在完成模块开发后、标记为完成前，必须使用此 Skill | `.agents/skills/code-review-guard/SKILL.md` |
| database-schema-design | 数据库 Schema 设计与优化指南。创建新数据库、设计表结构、定义关联关系、索引策略或数据库迁移时使用。 | `.agents/skills/database-schema-design/SKILL.md` |
| fullstack-dev-checklist | 在 build / verify 阶段检查跨页面、接口、持久化和关键联动链路的交付完整性。 | `.agents/skills/fullstack-dev-checklist/SKILL.md` |
| git-workflow | Git 工作流管理。提交代码、管理分支、合并、解决冲突时使用。 | `.agents/skills/git-workflow/SKILL.md` |
| memory-manager | 维护可恢复的项目记忆，只记录稳定决策、约束、偏好和坑点；通过分层归档防止记忆膨胀和信息陈旧。 | `.agents/skills/memory-manager/SKILL.md` |
| performance-optimization | 应用性能优化指南。改善页面加载速度、减小打包体积、优化数据库查询或解决性能瓶颈时使用。 | `.agents/skills/performance-optimization/SKILL.md` |
| project-planner | 当任务仍处于 align 阶段、目标或范围还不清楚时，使用本 Skill 把模糊目标收敛为薄 Mission 基线章程，明确项目模式、质量标准、关键选型、范围和… | `.agents/skills/project-planner/SKILL.md` |
| release-manager | 发布与回滚守卫。在准备上线、交付用户、执行迁移、紧急修复或需要发布检查时必须使用。 | `.agents/skills/release-manager/SKILL.md` |
| reverse-engineer | 在 reverse-spec 模式下，把截图、API、参考源码和口述收敛为 Design、Spec 和 Parity Map。 | `.agents/skills/reverse-engineer/SKILL.md` |
| security-guard | 代码防线与安全审计守卫。在开发核心业务（订单、支付、用户权限等）或 Code Review 时必须使用的基础安全检查 Checklist。 | `.agents/skills/security-guard/SKILL.md` |
| spec-validator | 当生成或更新 spec，或准备从 /design /plan 进入后续实现前，使用本 Skill 检查 spec 是否已经能支撑设计确认门和逻辑确认门通过。 | `.agents/skills/spec-validator/SKILL.md` |
| subagent-executor | 当 /build 阶段需要按任务执行实现时，使用本 Skill 为每个任务分配隔离子代理， | `.agents/skills/subagent-executor/SKILL.md` |
| systematic-debugging | 遇到任何 Bug、测试失败或异常行为时，在提出修复方案之前必须使用此 Skill | `.agents/skills/systematic-debugging/SKILL.md` |
| task-orchestrator | 当 spec 已可进入 build、需要在 /plan 阶段拆任务时，使用本 Skill 把 Mission / Design / Spec 收敛为可执行任务波… | `.agents/skills/task-orchestrator/SKILL.md` |
| testing-strategies | 软件质量保障的测试策略指南。实现任何功能或修复任何 Bug 之前必须使用。 | `.agents/skills/testing-strategies/SKILL.md` |

## 分级流程

- **P0**（新项目/大变更）：/align → /design → /plan → /build → /verify → /ship
- **P1**（小功能）：/change-request → /plan → /build → /verify
- **P2**（bug/微调）：/debug（方案确认 → 定界修改 → 验证回归）
