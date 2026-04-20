---
name: ai-os-debug
description: >-
  AI-OS /debug workflow：单点 bug 修复的轻量闭环。当用户提到 /debug、修 bug、调试、fix bug、troubleshoot 时触发。
---
<!-- ai-os-generated -->

# /debug — 对单点 bug 和轻量改动执行方案确认、边界锁定、修复验证的轻量闭环

当遇到单点 bug 或轻量改动时使用。

## 快速入口

- 先定界：根因、影响、修复方案
- 确认后定点修改 + 回归验证

## 详细流程

完整的 /debug 工作流定义在 `.agents/workflows/debug.md`，请阅读该文件获取完整步骤和禁止事项。
