# Contributing

感谢你愿意为证道贡献代码、文档或反馈。

## 提交前先做什么

1. 先确认你的问题或想法没有被现有 issue 覆盖。
2. 大改动、方向性改动或跨模块重构，先开 issue 讨论再动手。
3. Bug 修复请尽量附上复现步骤、影响范围和验证方式。

## 本地开发

```bash
npm install
npm run dev
```

常用验证命令：

```bash
npm test
npm run build
```

## Pull Request 约定

- PR 说明里写清楚做了什么、为什么做、怎么验证。
- 不要把 `dist/`、`out/`、`node_modules/` 之类的构建产物提交进来。
- 非 release PR 不要顺手 bump 版本号，也不要改 `CHANGELOG.md` 顶部版本条目，除非这次变更本身就是一次正式发布。
- 涉及 UI 变更时，最好附截图或录屏。
- 涉及行为变更时，补最小必要的测试或在 PR 里说明为什么暂时无法自动化验证。

## 代码与文档风格

- 保持改动聚焦，不要顺手重构无关代码。
- 优先沿用仓库现有模式和命名。
- 文档要区分“当前已实现能力”和“后续路线图”，不要混写。

## 发布相关

维护者发布新版本时，请使用仓库内置命令：

```bash
npm run release:prepare -- patch "简短发布摘要"
npm run release:publish -- patch "简短发布摘要"
```

详细步骤见 [RELEASING.md](./RELEASING.md)。
