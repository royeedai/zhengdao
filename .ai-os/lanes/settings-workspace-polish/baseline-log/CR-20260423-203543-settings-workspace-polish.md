# CR-20260423-203543-settings-workspace-polish

- **日期**：2026-04-23
- **变更类型**：change
- **用户诉求**：系统设置和作品设置混用；题材模板缺少系统级新增/复制/编辑；灵感数量、创世沙盘与顶部标题栏交互不清晰；多处页面仍保留旧主题样式。
- **确认方案**：新增独立 lane，一次收口系统/作品设置分层、系统级题材模板库、日更默认继承、顶栏/右侧/沙盘交互以及旧样式主题统一。
- **影响范围**：SQLite schema / migrations、app_state、preload / IPC、AppSettingsModal、ProjectSettingsModal、NewBookWizard、TopBar、BookshelfPage、RightPanel、QuickNotes、BottomPanel 以及若干 legacy modal / canvas 组件。
- **不纳入**：AI provider 底层路由、云同步底层语义、模板 retroactive 同步、打包与发布流程。
