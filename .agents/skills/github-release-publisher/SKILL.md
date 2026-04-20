---
name: github-release-publisher
description: >
  Use when the user wants to prepare or publish a new GitHub release for this
  project, including bumping version numbers, updating CHANGELOG.md, pushing
  tags, triggering GitHub Releases builds, and checking app-update compatibility.
---

# GitHub Release Publisher

Use this skill when the user asks to:

- 发布新版
- 推送到 GitHub 并 release
- bump 版本号
- 更新 changelog
- 生成可供应用内更新消费的 GitHub Releases 产物

## Minimal read set

Read only these files first:

- `package.json`
- `CHANGELOG.md`
- `RELEASING.md`
- `.github/workflows/release.yml`
- `electron-builder.config.ts`
- `README.md`

Only expand to other files if the release is blocked.

## Default workflow

1. 确认这是 `patch`、`minor` 还是 `major`。
2. 如果用户没有明确说明：
   - bugfix / 文档修正 / 小改动：默认 `patch`
   - 新功能但兼容：默认 `minor`
   - 破坏性变更：默认 `major`
3. 用仓库脚本，不要手工改版本号：
   - 仅准备版本：`npm run release:prepare -- <type> "<summary>"`
   - 一键发布：`npm run release:publish -- <type> "<summary>"`
4. 发布后检查：
   - git tag 是否等于 `v<package.json.version>`
   - GitHub Actions release workflow 是否已触发
   - Release 页面是否包含安装包和 `latest*.yml`
5. 对用户汇报时，显式区分：
   - 本地代码状态
   - GitHub 远端状态
   - GitHub Release / 自动更新状态

## Hard rules

- 不要手工只改 `package.json` 而不更新 `CHANGELOG.md`
- 不要跳过 git clean worktree 检查
- 不要把 token 直接写进仓库文件、脚本或最终回复
- 若 GitHub token / push / release 失败，必须以 blocker 报告，不得写成“已发布”
- 若 macOS 仍未签名 / 未公证，必须提醒“可产出包，不等于正式自动更新可用”

## Verification checklist

- `npm test`
- `npm run build`
- tag 与版本号一致
- Release 不是 draft
- Release 包含用户可下载安装包
- Release 包含更新元数据

## Notes

- 本仓库默认发布路径是：本地 `release:publish` 推 tag，GitHub Actions 构建并上传产物
- `npm run release:github` 只作为本地直传 GitHub Releases 的补充入口，不是默认首选
