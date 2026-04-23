# v1.3 可信日更工作台风险登记

| 风险 ID | 描述 | 影响范围 | 触发条件 | 规避措施 | 监测入口 | 审批结论 |
|---|---|---|---|---|---|---|
| R-V13-001 | 新增日更状态条遮挡工作区主路径或增加视觉负担 | 工作区布局、顶栏、左右栏、底部沙盘 | 小窗口、Windows 高 DPI、AI 悬浮入口与状态区叠加 | 状态区保持轻量，桌面 smoke 覆盖主要入口，Windows 实机列为人工验收 | `evals/verification.md`、Windows 人工 smoke | accepted-with-manual-check |
| R-V13-002 | AI 审稿或资产建议绕过用户确认直接写入正文 / 资产 | AI 草稿篮、章节正文、角色 / 设定 / 伏笔 / 剧情资产 | 审稿结果被当作可直接应用的业务操作 | 审稿台只生成报告和草稿建议，资产建议进入确认流，拒绝后不写入 | `chapter-review.test.ts`、手工 accept / dismiss smoke | user-approved |
| R-V13-003 | 发布前检查混入平台 API 或账号依赖，扩大外部副作用 | 发布检查、导出、账号 / 同步边界 | 复制发布稿或导出前要求平台登录 | 平台中立纯文本检查，不接入平台账号，不改变云同步语义 | `publish-check.test.ts`、离线复制 / 导出 smoke | user-approved |
| R-V13-004 | GitHub Release 发布失败或资产 / 自动更新元数据缺失 | 用户下载页、自动更新源、安装包资产 | tag 推送后 release workflow 失败或 release notes job 未补正文 | 本地验证后再 tag；发布后复核 workflow、正文、8 个资产和 `latest*.yml` | GitHub Actions、GitHub Release API | user-approved |
| R-V13-005 | 本次对话中暴露的 GitHub token 被复用 | GitHub 仓库权限、发布权限 | token 未撤销或未轮换 | 发布完成后人工撤销或轮换 token；AI 不在日志和最终答复中复述 token | GitHub token 管理页 | requires-human-rotation |

