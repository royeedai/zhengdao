---
name: ai-os-build
description: >-
  AI-OS /build workflow：按 wave 实现已确认的任务。当用户提到 /build、开始实现、开始开发、start building、implement 时触发。
---
<!-- ai-os-generated -->

# /build — 在设计门和逻辑门通过后按 wave 实现

当任务已确认，准备按 wave 实现时使用。

## 快速入口

- 有审批停点的任务 → 逐个确认后推进
- 简单任务 → 按波次批量实现

## 详细流程

完整的 /build 工作流定义在 `.agents/workflows/build.md`，请阅读该文件获取完整步骤和禁止事项。
