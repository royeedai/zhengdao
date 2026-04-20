<!-- ai-os-generated -->

# AI-OS 项目交付操作系统

本项目使用 AI-OS 进行交付管理。完整规则已在 `AGENTS.md` 中定义（Antigravity 会自动加载）。
本文件提供补充的快速参考。

## 会话初始化

每次新 session 启动时，先确认当前 lane；若存在多个 active lane，先执行 `create-ai-os lane list .`。确认当前 lane 后，依次读取：

1. 当前 lane 的 `.ai-os/lanes/<lane-id>/STATE.md`（legacy 单交付项目则是 `.ai-os/STATE.md`） — 当前阶段和进度
2. 当前 lane 的 `.ai-os/lanes/<lane-id>/MISSION.md`（legacy 单交付项目则是 `.ai-os/MISSION.md`） — 已确认的当前交付基线
3. 当前 lane 的 `.ai-os/lanes/<lane-id>/baseline-log/`（legacy 单交付项目则是 `.ai-os/baseline-log/`） — 最新基线确认记录目录
4. `.ai-os/memory.md` — 稳定决策和约束

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

## Skill 引用

专项能力定义在 `.agents/skills/` 下，每个子目录包含 `SKILL.md`。
关键 skill 触发条件见 `.agents/skills/AGENTS.md`。
