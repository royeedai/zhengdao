# 开源发布与版本治理 Spec

## 1. 模块概述

- **模块目标**：将证道整理为可公开托管、可下载、可持续发布并兼容应用内更新的开源桌面项目
- **所属阶段**：build / verify / ship
- **关联 Mission / Design**：`MISSION.md` 当前基线 `CR-20260420-232439-open-source-release-hardening`
- **关联需求点 ID / 标题**：
  - `REQ-OSS-001` 开源仓库文档与模板
  - `REQ-OSS-002` 自动版本号与 CHANGELOG 治理
  - `REQ-OSS-003` 项目级 GitHub 发布 skill
  - `REQ-OSS-004` GitHub 仓库首发
  - `REQ-OSS-005` 下载与应用内更新说明

## 2. 业务规则与目标

- **核心规则**：
  - README 只写“当前已实现能力”与“后续路线图”，两者必须显式分区
  - 后续发布必须通过统一脚本推进版本号、更新 changelog、创建 `v<version>` tag
  - GitHub Releases 继续作为安装包下载入口与在线更新元数据源
  - 首发版本默认使用当前应用版本 `1.0.0`
  - 若 GitHub token 无效或权限不足，必须以 blocker 形式报告，而不是写成已发布
- **必须优先保证的正确性**：仓库地址正确、版本号 / tag / changelog 一致、文档不夸大功能、Release 产物兼容自动更新
- **允许延后处理的细节**：发布徽章美化、品牌素材、beta / alpha 渠道、自动生成详细 release notes
- **本轮非目标 / 禁止越界项**：不重构主业务功能，不补全 macOS 签名 / notarization 全流程，不处理 Linux 发布

## 3. 界面 / 接口 / 命令清单

- **交互模式**：repository-governed + release-script-driven
- **推荐模式理由**：文档、版本治理和 GitHub 发布应可重复执行，不能依赖一次性手工操作
- **拒绝的交互模式**：手动只改 `package.json` 版本、不更新 changelog 就发布；只在聊天里说明 release 步骤而不沉淀仓库脚本 / skill

| 编号 | 类型 | 名称 | 描述 | 验收点 |
|------|------|------|------|--------|
| I-OSS-001 | 仓库元数据 | `README.md` | 项目简介、功能、安装、下载、应用内更新、开发与贡献说明 | AC-OSS-001 / AC-OSS-005 |
| I-OSS-002 | 仓库文档 | `LICENSE` / `CHANGELOG.md` / `CONTRIBUTING.md` / `SECURITY.md` / `CODE_OF_CONDUCT.md` / `SUPPORT.md` | 开源治理与协作基线 | AC-OSS-001 |
| I-OSS-003 | 仓库模板 | `.github/ISSUE_TEMPLATE/*` / `.github/pull_request_template.md` | 公开协作入口模板 | AC-OSS-001 |
| I-OSS-004 | 版本脚本 | `scripts/release/*.mjs` | 自动 bump 版本、预置 changelog、校验 git 状态、推送 tag / 分支 | AC-OSS-002 |
| I-OSS-005 | npm scripts | `release:prepare` / `release:publish` | 维护者执行统一发布命令 | AC-OSS-002 |
| I-OSS-006 | 项目 skill | `.agents/skills/*` | 指导 AI 使用仓库发布脚本、变更 changelog、推送 GitHub 并验证 release | AC-OSS-003 |
| I-OSS-007 | 发布链路 | `.github/workflows/release.yml` + `electron-builder.config.ts` | tag 触发 GitHub Release 构建与自动更新元数据上传 | AC-OSS-004 / AC-OSS-005 |
| I-OSS-008 | 仓库托管 | Git 仓库 + GitHub 远端 | 首版代码、tag 与 release 发布目标 | AC-OSS-004 |

## 4. 关键流程与状态流转

1. 维护者执行 `npm run release:prepare -- <patch|minor|major> "<summary>"`，脚本自动推进版本号并在 `CHANGELOG.md` 顶部插入新版本条目
2. 维护者审阅 changelog 后执行 `npm run release:publish -- <patch|minor|major> "<summary>"` 或由 skill 代执行
3. 发布脚本在 clean git 状态下运行测试 / 构建，提交 release commit，创建 `v<version>` tag，并推送当前分支与 tag
4. GitHub Actions 监听 `v*` tag，构建 Windows x64 与 macOS 产物，并通过 `electron-builder` 上传到 GitHub Releases
5. Release 页面承载安装包、`latest.yml`、`latest-mac.yml` 等自动更新元数据
6. 已安装客户端根据既有 updater service 检查 Release 元数据并完成后续在线更新
7. 若远端创建、push 或 release 任一步因无效凭据失败，则流程停止，保留本地工件并报告 blocker

## 5. 数据与契约

- **契约基准**：
  - 版本号遵循 `semver`
  - tag 命名固定为 `v<version>`
  - CHANGELOG 条目结构：`## vX.Y.Z - YYYY-MM-DD` + `Added / Changed / Fixed / Docs / Release`
- **输入**：
  - 当前 `package.json` 版本
  - 发布类型：`patch | minor | major`
  - 发布摘要或 notes
  - GitHub 仓库配置与有效凭据
- **输出**：
  - 更新后的 `package.json` / `package-lock.json`
  - `CHANGELOG.md` 顶部新版本条目
  - release commit 与 `v<version>` tag
  - GitHub Releases 安装包与更新元数据
- **关键字段 / 状态枚举**：
  - `version`: semver
  - `releaseType`: `patch | minor | major`
  - `repo`: `owner/name`
- **字段映射/适配说明**：
  - Release tag 必须与 `package.json.version` 一致
  - GitHub Releases 继续作为 `electron-updater` 的发布源
- **共享层 / 包装层副作用审计**：
  - 仅扩展仓库元数据、发布脚本和 GitHub workflow，不改线上业务协议
  - README 会显式承接现有 updater 能力，但不改变客户端运行逻辑
- **集成触点**：
  - `package.json`
  - `electron-builder.config.ts`
  - `.github/workflows/release.yml`
  - `.agents/skills/*`
  - 仓库级文档文件
- **路由 / 入口契约对照**：无新增应用页面；变更集中在仓库与发布入口
- **Schema / 存储一致性说明**：不新增数据库 schema
- **持久化 / 外部依赖**：GitHub API、GitHub Releases、GitHub Actions、有效 GitHub token、签名 / notarization secrets
- **受影响模块 / 文件边界**：仓库根目录元数据、发布配置、工作流、维护者说明、项目 skill

## 6. 边界条件与异常处理

- GitHub token 无效：停止远端创建 / push / release，报告 blocker
- 远端仓库名占用：优先回退到候选仓库名，而不是覆盖现有仓库
- 工作区不干净：发布脚本拒绝直接继续，避免把临时改动带进 release
- 构建失败：不创建 release tag 或在失败后停止推送后续步骤
- macOS 未签名/未公证：README 与 release 文档显式提示限制，不把自动更新写成完全可用
- Windows 产物仍需保证文件名带 `arch`，避免更新元数据指向错误安装包

## 7. 验收与证据

- **关键用户任务 / 运营任务验证**：
  - GitHub 仓库首页可被新用户理解并找到下载入口
  - 维护者可通过统一命令或 skill 推进版本和发布
  - GitHub Release 可提供安装包与应用内更新元数据
- **设计一致性证据**：README 与 SUPPORT / SECURITY / CONTRIBUTING 文档口径一致，不冲突
- **逻辑正确性证据**：版本脚本测试或最小 CLI 验证、release 输入校验、tag/version/changelog 一致性检查
- **工程质量证据**：`npm test`、`npm run build`
- **运行态证据**：发布脚本 dry-run/prepare 验证、GitHub Release 实际产物或明确 blocker 证据
- **异常/空数据证据**：无效 token、脏工作区、无 changelog summary、构建失败
- **最小验证步骤**：
  - `npm test`
  - `npm run build`
  - `node scripts/release/prepare-release.mjs patch "..." --dry-run`
  - 若凭据有效：GitHub API 创建仓库 + `git push` + 首版 Release 构建
- **回归范围**：`package.json` 版本治理、workflow 发布路径、在线更新文档口径
