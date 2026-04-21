# 证道 Windows 壳层 / 图标收口发布计划

> 当前文件聚焦 Windows 安装版的桌面壳层和品牌图标收口。目标是让 Windows 正式包看起来像正式客户端，而不是默认 Electron 样例程序。

## 1. 交付前检查

- [x] 需求基准已更新到 `CR-20260421-000000-windows-shell-brand-polish`
- [x] 当前代码主链路验证证据已存在：`npm test`、`npm run build`
- [x] 项目原生静态校验证据已记录：`npm run build`
- [x] Windows 主窗口壳层已收口
- [x] Windows / Linux 菜单移除已生效
- [x] 品牌标题已统一为 `证道`
- [x] `icon.ico` / `icon.icns` 已生成并接入 builder
- [x] Windows / macOS 打包 smoke 已通过

## 2. 变更范围与依赖

- 本次交付覆盖：
  - Windows 主窗口壳层
  - 应用菜单移除策略
  - 顶栏品牌头收口
  - 应用命名统一
  - 正式图标资源与打包配置
- 本次明确不包含：
  - Linux 自定义标题栏
  - macOS 窗口壳层重做
  - 品牌官网 / 宣传素材
- 依赖：
  - Electron 平台窗口能力
  - 本地图标处理命令
  - `electron-builder`

## 3. 发布步骤

1. [AI 已执行] 写失败测试，锁定平台壳层配置、菜单策略和品牌标题规则
2. [AI 已执行] 实现 Windows 主窗口壳层与菜单移除
3. [AI 已执行] 收口书架页和工作区顶栏品牌头
4. [AI 已执行] 生成并接入正式图标资源
5. [AI 已执行] 执行 `npm test`、`npm run build` 与打包 smoke
6. [AI 已执行] 发布 `v1.1.5` 到 GitHub Releases，并确认 Windows / macOS 构建 job 通过
7. [需人工执行] 在真实 Windows 安装版上人工确认任务栏、开始菜单和安装器图标显示

## 4. 运行态验证

- [x] `npm test` 通过
- [x] `npm run build` 通过
- [x] Windows 壳层配置测试通过
- [x] Windows / macOS 打包 smoke 通过
- [x] GitHub Actions `release` workflow 通过：`v1.1.5` macOS / Windows jobs 均为 success
- [x] GitHub Release `v1.1.5` 已上传 Windows 安装包、macOS dmg/zip、blockmap、`latest.yml`、`latest-mac.yml`
- [x] `v1.1.5` macOS zip 已下载抽检，包内 `better-sqlite3` 可被 Electron runtime 加载并完成内存 SQLite 查询
- [ ] Windows 安装版人工视觉回归完成
- [x] fallback 证据未被误当正式结论：源码实现通过不等于正式安装包观感已放行

## 5. 回滚触发条件

- Windows 顶栏操作区被原生窗口按钮覆盖
- Windows 安装后仍出现默认 Electron 图标
- Windows 仍显示默认菜单栏
- macOS 窗口交互因壳层改动出现回退

## 6. 交付说明与移交

- AI 已完成：
  - 在线更新和正式打包能力已具备
  - GitHub Release `v1.1.5` 已发布，下载包和自动更新元数据已上传
- AI 待完成：
  - 等待真实 Windows 安装环境人工视觉确认
- 需人工执行：
  - 在真实 Windows 安装版上确认任务栏 / 开始菜单 / 桌面快捷方式图标
- 已知风险和后续待办：
  - macOS 仍只同步图标与命名，不调整当前窗口壳层
  - macOS 自动更新正式上线仍需要签名与公证链路
  - 早期失败 tag / release（`v1.1.0`、`v1.1.1`、`v1.1.2`、`v1.1.4`）如需清理，应单独确认后再删除
