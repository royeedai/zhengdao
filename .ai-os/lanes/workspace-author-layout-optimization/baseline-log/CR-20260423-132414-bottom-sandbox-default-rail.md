# CR-20260423-132414-bottom-sandbox-default-rail

## 变更背景

用户反馈“创世沙盘”需要默认可见，并指出当前必须先选择文章 / 章节才会出现入口；同时希望底栏创世沙盘不再依赖右下角悬浮按钮。

## 影响分析

- 当前底部沙盘组件由 `WorkspaceLayout` 挂载，数据依赖当前作品和剧情 store，不依赖当前章节。
- 当前沙盘入口按钮位于 `EditorArea` 的已选章节渲染分支；未选择章节时 `EditorArea` 提前返回空状态，因此入口不可达。
- 本次改动只调整 renderer UI 状态和组件布局，不修改 SQLite schema、IPC、preload API、剧情节点数据模型或 AI 能力。

## 设计决策

- 无历史偏好时底部沙盘默认展开。
- 用户折叠后持久化折叠偏好，下次进入作品不强制展开。
- 移除编辑区右下角悬浮沙盘按钮，改为底部固定 rail 和面板内折叠按钮。
- `Ctrl+\``、命令面板“切换底部沙盘”继续保留。

## 验收要求

- 进入作品但未选择章节时，创世沙盘入口仍可见并可展开。
- 折叠状态持久化；展开状态也持久化。
- 展开后保留现有新建剧情节点、剧情线管理、拖拽调整高度、毒点提示。
- 项目原生验证至少覆盖 `npm test -- src/renderer/src/utils/__tests__/workspace-layout.test.ts`、`npm test`、`npm run build`、`git diff --check`。
