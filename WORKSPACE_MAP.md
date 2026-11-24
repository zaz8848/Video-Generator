# Video Generator — 工作区目录说明

本文件按工作区骨架实例化，只维护目录与落点；进度见STATUS，设计见BLUEPRINT。

## 核心项目文件

| 文件 | 用途 |
|---|---|
| PROJECT_BLUEPRINT.md | 目标、分层、数据契约与稳定决策 |
| PROJECT_STATUS.md | 进度、验证证据、待办与卡点 |
| WORKSPACE_MAP.md | 文件落点与主要入口 |
| .github/copilot-instructions.md | 工具维护规则与导航 |
| README.md | 人用说明、安装和跨项目接入 |

## 工作区目录树

```text
Video-Generator/
  .github/instructions/       通用视频与声音制作规则
  .github/skills/             创建视频、配音、验收入口
  plugin.json                GitHub Copilot Agent Plugins 1.0清单
  skills/                    插件发现用薄入口，完整流程仍在.github/skills
  com.github.copilot/rules/   插件通用制作规则入口，正文仍在.github/instructions
  src/                       通用CLI和确定性媒体处理
  upstream/adu-motion-video/  固定提交的完整上游，只读保留所有资产/许可/测试
  extensions/                产品介绍场景与工程运行时扩展，不改上游稳定包
  scripts/                   官方TTS生成器
  templates/                 项目JSON模板
  test/                      本工具离线测试
  docs/                      契约与接入说明
  sessions/                  本工具开发验证过程（Git忽略）
  deliverables/              工具演示交付（Git忽略）
  profiles/                  本机凭据模板与忽略配置
  .runtime/                  Git忽略的本机Python虚拟环境，上游只通过约定链接读取
  README.md
  PROJECT_BLUEPRINT.md
  PROJECT_STATUS.md
  WORKSPACE_MAP.md
  upstream.lock.json         上游来源、提交与逐文件完整性清单
```

## 文件落点

| 类型 | 位置与边界 |
|---|---|
| 通用入口/制作知识 | .github/skills/、.github/instructions/；不放消费项目品牌、固定台词 |
| GitHub Copilot插件分发 | plugin.json、skills/、com.github.copilot/rules/；只路由到已有流程与规则，不复制代码/模板/凭据，不自动安装或运行联网hooks |
| 创作方法与持续增补 | .github/skills/video-adu/references/creative-production-sop.md；创作与审片共用正文，入口保持精简，新增规则按正文归属表路由 |
| 运行时/生成辅助 | src/、scripts/；数据来自项目清单 |
| 固定上游及资产账本 | upstream/adu-motion-video/、upstream.lock.json；全量保留，任何更新独立核对，不编辑原文件 |
| 场景扩展 | extensions/；产品原帧、完整取景与定格恢复，使用上游渲染/导出合同 |
| 整合报告及验证报告 | docs/merge-report-*.md；机器资产核对放sessions/，报告区分保留/新增/停用/未验证 |
| 可分发资产账本 | docs/upstream-assets.json；由scripts/audit-merge.mjs按锁文件和真实磁盘生成，列每个保留文件而非手工维护摘要 |
| 通用模板/测试 | templates/、test/；不复制客户数据或凭据 |
| 本工具验证素材/证据 | sessions/；只存合成测试媒体或用户授权的本地引用 |
| 本机配置 | profiles/*.local.env；只保留模板入Git，不打印密钥 |
| 本机运行环境 | .runtime/adu-python/；upstream下.venv-windows或.venv-posix只是指向它的链接，不修改锁定源文件 |
| 本地连续标签页录屏工具 | .runtime/screenity/<版本>/；官方发布包、摘要和完整许可保留，使用独立浏览器Profile，不修改用户Profile或上游视频模板；不同于截图采样脚本 |
| 消费项目素材/声音/成片 | 消费项目自己的assets/、sessions/、deliverables/，不聚合进工具仓库 |

## 主要入口

安装：npm install；CLI：node src/cli.mjs；验证：npm test。新增目录用途先更新本文件。