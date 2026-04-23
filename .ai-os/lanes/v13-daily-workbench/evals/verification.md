# v1.3 可信日更工作台验证记录

## 自动化验证

- `npm test`：36 files / 142 tests passed
- `npm run build`：Electron main、preload、renderer production build passed
- `git diff --check`：passed

## 本机桌面烟测

- 启动 Electron dev 版进入书架，进入现有作品后日更状态条显示运行、保存、快照、本地备份、云同步和伏笔风险状态。
- 选中章节后“本章审稿”入口从禁用变为可用，审稿台展示固定六维审稿结构。未点击“开始审稿”，因为该动作会向已配置 AI provider 发送当前章节和上下文。
- 点击本地备份状态创建备份，收到“本地备份已完成”通知。
- 点击云同步未登录状态进入应用设置的“账号与云同步”页。
- 发布检查包当前章节 / 全书切换正常，复制发布稿后通过系统剪贴板读取确认内容。
- TXT 导出到 `/tmp/zhengdao-v13-publish-test-2.txt`，内容与发布预览一致并保留段落。
- Markdown 导出到 `/tmp/zhengdao-v13-publish-test.md`，文件包含书名、作者、卷章标题和段落。
- DOCX 导出到 `/tmp/zhengdao-v13-publish-test-2.docx`，zip 结构有效，`word/document.xml` 中正文按段落拆分。

## 覆盖点

- 日更工作台状态模型：目标进度、保存状态、快照、本地备份、云备份状态区分。
- 本章审稿台：固定审稿段落、非合规报告归一化、资产建议只提取支持的草稿类型。
- 发布前检查包：HTML 转纯文本、敏感词、空标题、空正文、字数异常和平台中立发布稿。
- 发布包导出：修复保存对话框选择 `/tmp` 后主进程拒写、TXT 旧导出格式压缩段落、DOCX 浏览器端 `nodebuffer` 报错和段落压缩。
- 开发环境：增加 `predev` / `pretest`，分别处理 Electron ABI 与 Node ABI 下的 native 模块重建。

## 仍需人工验收

- Windows x64 实机下工作区新增日更状态条不遮挡顶栏、左右栏、底部沙盘和 AI 悬浮入口。
- 真实 AI provider 下审稿报告可读性和资产建议质量。
- 真实 AI provider 下草稿篮接收资产建议后的采纳 / 拒绝完整链路。
