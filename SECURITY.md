# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x | Yes |
| < 1.0.0 | No |

## Reporting a Vulnerability

如果你发现了可能影响用户数据、安全边界或远程执行风险的问题，请不要直接公开提 issue。

建议流程：

1. 优先使用 GitHub 的 private vulnerability reporting / security advisory 能力。
2. 如果仓库当时还没有启用该能力，请先不要公开披露，等待维护者提供私下沟通渠道。
3. 报告里尽量包含：
   - 影响版本
   - 复现步骤
   - 预期影响
   - 你已经尝试的缓解方式

## Scope

优先级较高的安全问题包括：

- 任意文件读写
- 数据库或备份导入链路导致的恶意覆盖
- 应用内更新链路被劫持
- OAuth / 云同步中的令牌泄露
- 导入导出或富文本链路导致的代码执行

普通产品缺陷、视觉问题和非安全功能请求，请改走常规 issue 模板。
