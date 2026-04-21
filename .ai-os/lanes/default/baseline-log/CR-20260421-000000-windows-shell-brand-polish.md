# 变更请求

- **变更标题**：Windows 安装版桌面壳层与品牌图标收口
- **提出时间**：2026-04-21 00:00:00 +08:00
- **变更原因**：用户在 Windows 安装版中看到默认 Electron 风格的白色标题栏、菜单栏 `File / Edit / View / Window / Help`、窗口标题残留 `Path to God`，以及默认 Electron 图标；要求把安装版收口为正式客户端外观，并更换正式品牌图标。
- **优先级**：P1

## 变更内容

- [新增] Windows 主窗口改为正式客户端壳层：移除默认菜单栏，使用隐藏标题栏 + 应用自有深色顶栏
- [新增] Windows / Linux 主窗口统一移除原生应用菜单；macOS 保持系统菜单
- [新增] 对外名称统一收口为 `证道`，安装后窗口标题和 HTML 标题不再出现 `Path to God`
- [新增] 顶部栏品牌头去掉 `Pro` 样机感标识，书架页与工作区风格统一
- [新增] 新的“笔尖印章”品牌图标资源，补齐 `icon.ico`、`icon.icns` 和矢量母稿
- [新增] `electron-builder` 与主窗口同步接入正式图标资源

## 影响分析

| 维度 | 是否受影响 | 说明 |
|------|------------|------|
| MISSION | 是 | 当前交付主题与成功标准发生变化 |
| baseline-log | 是 | 需要新增本条 CR |
| spec | 是 | 需要补主窗口壳层、菜单策略、图标与命名策略 |
| tasks | 是 | 需要新增窗口壳层、顶栏视觉、图标资源与打包验证任务 |
| tests | 是 | 需要为平台壳层配置和标题栏 inset 增加失败测试 |
| acceptance | 是 | 需要新增 Windows 安装版外观与图标验收口径 |
| release | 是 | 需要把 Windows 打包 smoke 和图标接入写入 release-plan |
| memory | 否 | 当前不回写共享 memory |
| evals | 否 | 当前不新增 eval 工件 |

## 新增风险 / blocker

- 若直接走裸 `frame:false`，会引入拖拽、吸附、缩放与系统按钮适配风险
- 若只隐藏菜单但不调整顶栏留白，Windows 原生窗口按钮会压到应用按钮
- 若只替换 `svg` 而未产出 `ico/icns`，安装后仍会继续显示默认 Electron 图标
- 若窗口标题和 HTML 标题不同步，会出现任务栏 / 安装项 / 窗口标题口径不一致

## 后续动作

- 更新 `MISSION.md`、`specs/example.spec.md`、`tasks.yaml`、`acceptance.yaml`、`release-plan.md`、`STATE.md`
- 先写失败测试锁定 Windows 壳层配置和品牌标题 / inset 规则
- 实现主窗口壳层、顶栏视觉与菜单移除
- 生成并接入正式图标资源，完成 build 与打包 smoke
