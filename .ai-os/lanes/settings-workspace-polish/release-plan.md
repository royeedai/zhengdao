# 发布计划

## 发布目标

- 随下一次常规桌面端版本发布，目标版本：`v1.4.0`。
- 本 lane 涉及 schema、preload / IPC 和 renderer，多层联动，需跟随下一次桌面端常规版本一起发布。

## 验证证据

- [x] `git diff --check` -> passed
- [x] `npx vitest run src/main/database/__tests__/migrations.test.ts src/main/database/__tests__/genre-template-repo.test.ts src/renderer/src/components/ai/__tests__/panel-layout.test.ts src/renderer/src/components/bottom-panel/__tests__ src/renderer/src/utils/__tests__/daily-goal.test.ts src/renderer/src/utils/ai/__tests__/global-account-status.test.ts` -> 6 files / 24 tests passed
- [x] `npm test` -> 41 files / 160 tests passed
- [x] `npm run build` -> passed
- [x] legacy hard-coded color grep -> reviewed; canvas/token fallbacks and semantic color palettes retained, one stale `focus:border-indigo-500` replaced with `focus:border-[var(--accent-primary)]`

## 回滚条件

- 新建作品无法完成题材选择
- 应用设置 / 项目设置入口错位或能力不可达
- 创世沙盘节点无法稳定拖拽或首节点仍不可见
- 旧样式页面在浅色 / 深色主题下出现明显回退
