# v1.3 可信日更工作台发布计划

## 1. 发布目标

- **目标版本**：`v1.3.0`
- **目标 tag**：`v1.3.0`
- **发布范围**：可信日更工作台、本章审稿台、发布前检查包、应用设置系统入口收口、native ABI dev / test hook。
- **审批结论**：2026-04-23 用户明确要求提交并更新直到完成新版本 release 发布，并提供 GitHub token；本次外部发布动作按 high-risk 已获授权执行。

## 2. 发布前检查

- [x] v1.3 lane Mission / Design / tasks / verification matrix 已建立。
- [x] `CHANGELOG.md` 已新增 `v1.3.0` 真实更新日志。
- [x] `package.json` / `package-lock.json` 已升至 `1.3.0`。
- [x] high-risk 风险登记已补。
- [x] `npm test` 通过：36 files / 142 tests。
- [x] `npm run build` 通过。
- [x] `git diff --check` 通过。
- [ ] 代码与工件 commit 已创建。
- [ ] `v1.3.0` tag 已创建并推送。
- [ ] GitHub Actions release workflow 已通过。
- [ ] GitHub Release 正文、安装包资产和自动更新元数据已复核。

## 3. 发布步骤

1. [AI 执行] 收口版本号、更新日志、release plan、risk register 和 verification guard。
2. [AI 执行] 跑 `npm test`、`npm run build`、`git diff --check`。
3. [AI 执行] 提交本次功能与发布工件。
4. [AI 执行] 创建并推送 `v1.3.0` tag。
5. [AI 执行] 等待 GitHub Actions release workflow 产出 Windows / macOS 安装资产与 `latest*.yml`。
6. [AI 执行] 复核 GitHub Release 正文包含更新日志、安装包说明、验证状态和回滚提示。
7. [需人工执行] 发布后撤销或轮换本次对话中暴露的 GitHub token。

## 4. 回滚条件

- 本地 `npm test`、`npm run build` 或 `git diff --check` 失败且无法在本次范围内修复。
- GitHub Actions release workflow 未产出 Windows installer、macOS dmg / zip、blockmap 或自动更新元数据。
- GitHub Release 正文缺少本版本更新日志、安装包清单、验证状态或回滚说明。
- 新版安装包启动失败、发布前检查导出失败，或自动更新元数据明显指向错误版本。

## 5. 运行态与数据状态

- **代码状态**：本次发布改动在本地验证通过后提交并推送。
- **数据状态**：不新增平台账号，不改变 Google Drive 同步语义，不改变核心作品 SQLite schema。
- **运行状态**：正式安装包由 GitHub Actions release workflow 构建；Windows x64 实机 UI 仍需人工复核。
