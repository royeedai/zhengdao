# 证道 Mission

> 当前 lane 记录的是“证道桌面端稳定性与交付能力增强”这条交付线。本轮在既有交互修复、正式安装包与在线更新能力基础上，进一步补齐开源发布治理、GitHub 首发与后续版本管理。

## 1. 交付基线摘要

- **宿主项目 / 系统**：证道 Electron 桌面端创作软件
- **当前交付主题**：开源项目治理、GitHub Releases 首发与持续版本管理
- **当前交付目标**：将当前代码库整理为可公开托管、可下载、可后续持续发布的开源桌面项目，补齐开源文档、版本/更新日志策略、GitHub 发布自动化与应用内更新使用说明，并完成首个 GitHub 仓库推送与首版 Release
- **成功标准**：
  - 仓库具备公开开源项目的最低完整工件：README、LICENSE、CHANGELOG、贡献/安全/支持/行为准则文档与 issue / PR 模板
  - `package.json`、发布脚本和构建配置包含完整仓库元数据与后续 release 所需信息
  - 后续发布可以通过统一脚本 / skill 自动推进版本号、更新 changelog、推送 tag 并触发 GitHub Release
  - GitHub Releases 页面能够承载正式安装包与在线更新元数据，便于用户下载和应用内更新
  - 首个 GitHub 仓库已创建并推送首版代码；若凭据无效，则必须明确报告 blocker，而不是虚报已发布
- **项目模式**：change
- **当前交付档位**：standard
- **当前治理档位**：P1
- **当前基线 ID**：CR-20260420-232439-open-source-release-hardening

## 2. 用户与闭环场景

- **目标用户**：
  - 公开仓库访问者和潜在贡献者
  - 下载安装证道桌面端的作者用户
  - 后续负责持续发布版本的维护者
- **关键场景**：
  - 新用户打开 GitHub 仓库后，能快速理解项目定位、当前能力、安装方式和平台限制
  - 维护者可以通过统一流程自动 bump 版本号、维护 changelog、推送 tag 并触发 Release
  - 用户可以从 GitHub Releases 下载 Windows/macOS 安装包，并理解应用内更新的工作方式与约束
  - 应用安装后，后续版本仍通过 GitHub Releases 供在线更新消费
- **目标市场 / 使用环境**：GitHub 开源仓库 + Windows x64 优先正式发布；macOS 产物继续提供，但自动更新对外可用仍取决于签名与 notarization
- **当前最小可行闭环**：仓库元数据完善 + 版本治理脚本 / skill + GitHub 仓库首发 + GitHub Release 安装包 / 更新元数据
- **明确后续迭代项**：品牌图标补齐、macOS 签名/公证全自动化、beta/alpha 渠道、Linux 发布、更新日志专用弹窗

## 3. 已确认约束与关键决策

- **已确认技术栈与关键选型**：
  - Electron + electron-vite
  - `electron-builder` + GitHub Releases
  - `electron-updater`
  - 项目内 release script + AI skill 共同承载后续一键发布
- **已确认目标运行态 / 部署约束**：
  - GitHub Releases 是对外下载入口和在线更新元数据源
  - 客户端只在 `app.isPackaged` 下启用自动更新
  - Windows 目标为 NSIS；macOS 继续产出 `dmg + zip`
  - 后续发布必须自动推进版本号和 changelog，不允许人工只改其中一部分
- **已确认质量优先级**：可公开理解 > 发布可复用 > 版本一致性 > 自动更新兼容性
- **必须保持的宿主项目约束**：
  - 不夸大 README 中的功能完成度；路线图与当前可用能力必须区分
  - 不因发布脚本引入版本号、tag、CHANGELOG 不一致
  - 在线更新仍保持现有“下载完成后再显示 `更新`”语义
- **已确认核心设计决策**：
  - 仓库名优先采用 `zhengdao`，若远端占用则回退到 `zhengdao-desktop`
  - 后续版本发布采用“本地准备版本 + 推送 tag 触发 GitHub Actions 发布”模式
  - 版本号遵循 semver；tag 统一为 `v<version>`
  - CHANGELOG 采用“版本 + 日期 + 分类条目”结构，由发布脚本自动预置新条目
- **已确认核心逻辑决策**：
  - 版本 bump 必须同步 `package.json` 与 `package-lock.json`
  - 首版公开发布默认为 `v1.0.0`
  - 若 GitHub token 无效或权限不足，允许本地完成全部首发准备，但不得伪造“已推送 / 已发布”

### 已确认非功能性约束
- 远端仓库创建与 release 依赖有效的 GitHub token
- macOS 自动更新正式可用仍依赖签名与 notarization
- 当前图标资源仍不完整，不在本轮补齐品牌资源

## 4. 范围边界与非目标

### 范围内
- 开源仓库必需文档与模板
- README 重写与安装 / 更新 / 发布说明
- LICENSE、CHANGELOG、CONTRIBUTING、SECURITY、CODE_OF_CONDUCT、SUPPORT
- 版本治理脚本、发布脚本和项目级 release skill
- Git 仓库初始化、远端仓库创建、首版推送与 Release 首发
- 发布链路与应用内更新的衔接说明

### 范围外
- 品牌官网、博客、宣传素材
- Linux 正式发布
- macOS 证书申请与 notarization 实操闭环
- 全量 CI 质量门重构

### 非目标
- 不在本轮重构现有业务代码或 UI 功能
- 不承诺当前 lint 历史问题在本轮全部收敛
- 不把未验证的高级能力写入“已完成能力”列表

### 核心需求清单
| 需求 ID | 需求点 | 来源 | 验收入口 |
|---------|--------|------|----------|
| REQ-OSS-001 | 补齐公开开源仓库所需核心文档与模板 | 用户需求 | AC-OSS-001 |
| REQ-OSS-002 | 建立自动推进版本号与 CHANGELOG 的发布治理脚本 | 用户需求 | AC-OSS-002 |
| REQ-OSS-003 | 提供可复用的项目级 GitHub 发布 skill，支持后续一键式发布流程 | 用户需求 | AC-OSS-003 |
| REQ-OSS-004 | 初始化并推送 GitHub 仓库，完成首个公开版本发布 | 用户需求 | AC-OSS-004 |
| REQ-OSS-005 | 在仓库文档中明确用户下载入口、应用内更新机制与平台限制 | 用户需求 | AC-OSS-005 |

## 5. 稳定风险与外部依赖

- **外部依赖**：GitHub API、有效 GitHub token、GitHub Actions、`GH_OWNER` / `GH_REPO` / `GH_TOKEN`、Apple 签名 / 公证 secrets
- **稳定风险**：
  - token 无效会阻塞远端仓库创建、push 与 Release 首发
  - 版本号、tag 和 CHANGELOG 若失配，会直接破坏后续自动更新与发布可信度
  - README 若混写“当前能力”和“规划能力”，会误导用户下载预期
  - macOS 未签名 / 未公证时仍不能把自动更新写成完全可用能力
- **高风险触发因素**：错误公开仓库地址、错误 tag 与版本映射、发布产物缺失 `latest*.yml`、带着无效凭据宣称已成功发布
- **影响范围摘要**：仓库元数据、README 与维护文档、版本脚本、GitHub Release workflow、应用内更新对外说明
- **审批点**：若首发过程中需要公开暴露未签名 macOS 自动更新能力，必须先显式提示限制并经用户确认
