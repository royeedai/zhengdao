# 变更请求

- **变更标题**：开源发布治理、GitHub 首发与持续版本管理
- **提出时间**：2026-04-20 23:24:39 +08:00
- **变更原因**：用户要求把当前桌面端整理为可公开托管的开源项目，补齐 README、许可证、贡献与安全文档、GitHub Releases、更新日志、版本策略，并提供后续一键发布到 GitHub 的可复用 skill / 自动化能力；同时要求完成首个 GitHub 仓库推送与正式版发布。
- **优先级**：P1

## 变更内容

- [新增] 将当前交付主题从“在线更新能力”扩展为“开源发布与持续版本管理”
- [新增] 补齐开源仓库必需元数据与维护者文档：README、LICENSE、CHANGELOG、CONTRIBUTING、SECURITY、CODE_OF_CONDUCT、SUPPORT、issue / PR 模板
- [新增] 定义版本号与更新日志治理策略，确保后续发布能自动推进版本号并沉淀 changelog
- [新增] 生成项目内可复用的 GitHub 发布 skill，并提供一键式 release 脚本
- [新增] 初始化 Git 仓库、创建远端 GitHub 仓库、推送代码并发布首个 GitHub Release
- [补充约束] 在线更新仍以 GitHub Releases 为唯一更新源，首发产物必须兼容应用内自动更新

## 影响分析

| 维度 | 是否受影响 | 说明 |
|------|------------|------|
| MISSION | 是 | 当前 lane 的交付主题、成功标准和外部依赖发生变化 |
| baseline-log | 是 | 需要新增本条 CR 记录 |
| spec | 是 | 需要从“在线更新”扩展为“开源发布 + 版本治理 + 首发发布” |
| tasks | 是 | 需要新增文档治理、版本脚本、skill、GitHub 首发与验证任务 |
| tests | 是 | 需要补版本治理与 release 准备脚本的最小自动化验证 |
| acceptance | 是 | 需要新增开源治理与 GitHub Release 放行口径 |
| release | 是 | Release 计划需扩展为公开仓库、GitHub Releases、后续版本升级 |
| memory | 否 / 待定 | 若仓库名、发布流程和版本策略锁定为长期约定，再回写共享 memory |
| evals | 否 | 当前暂无新增长期 eval 入口 |

## 新增风险 / blocker

- 用户提供的 GitHub token 若无效、过期或权限不足，会阻塞远端仓库创建、push 与首次 release
- macOS 自动更新对外可用仍依赖签名与 notarization，不能因首发仓库完成而误标记为完全上线
- 开源 README 若继续沿用宣传式措辞，会产生“功能已实现”与“路线图能力”混淆风险
- 首次仓库发布若不补 issue / PR / security 基线，会留下后续协作和漏洞披露缺口

## 后续动作

- 更新 `MISSION.md`、`specs/example.spec.md`、`tasks.yaml`、`acceptance.yaml`、`release-plan.md`、`STATE.md`
- 重写仓库级开源工件并补齐发布脚本 / skill
- 初始化 Git 仓库并尝试创建 GitHub 远端仓库
- 构建并发布首个 GitHub Release；若 token 无效，则保留本地完整首发工件并显式报告 blocker
