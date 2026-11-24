# Video Generator

供多个VS Code项目引用的本机视频工具。0.2.0以完整保留的Adu固定源码为基础，统一真人口播与产品介绍入口；消费项目保留自己的品牌、素材、凭据和成片。

## 同事安装：GitHub Copilot Plugin

本仓库现在提供 Agent Plugins 1.0 入口：根目录 plugin.json、五个 skills/ 路由和 com.github.copilot/rules/。五个流程共用同一套源码、依赖、模板与完整方法论，不复制五份工具。不需要Copilot Studio、PAC、Knowledge或HTTP Flow。

以下是VS Code GitHub Copilot的本机安装方式。先安装Node.js 22.16+、Python 3.12+、FFmpeg/ffprobe 9+和Chrome/Edge，并确保命令在PATH中：

```powershell
git clone https://github.com/zaz8848/Video-Generator.git
cd Video-Generator
npm ci
node scripts/setup-runtime.mjs
node src/cli.mjs doctor
node src/cli.mjs doctor --upstream
```

安装工具与Python依赖需要网络和使用者授权。工具不自动安装系统级FFmpeg或浏览器，不会因Skill已被发现就宣称所有制作能力已就绪。Windows技术路线已测；其他系统需要自行通过doctor与实际导出验证。

在要制作视频的项目中，合并以下VS Code设置，路径替换为**同事电脑上实际clone位置**，不要照搬原作者D盘路径：

```json
{
  "chat.pluginLocations": {
    "C:/Tools/Video-Generator": true
  }
}
```

新开Copilot会话，在 `Chat: Open Customizations → Plugins` 核对video-generator来源，以及video-configure、video-create、video-adu、video-voice、video-review五个入口。不要同时注册同一工具的旧agentSkillsLocations方式和Plugin方式，避免重复入口；其他工具配置保留。此设置受VS Code版本与组织策略影响。也可在支持直接Git源安装的Copilot会话使用 `/plugin install https://github.com/zaz8848/Video-Generator.git`；直接安装的依赖路径和权限仍需按实际宿主核对，本轮没有声称已在同事机器测试。

同事可以给Copilot这段话：

```text
请阅读Video-Generator仓库README，确认运行依赖和五个视频Skill可用。
先用video-configure检查我的项目，不要使用作者的本机路径或凭据。
我要制作一个功能演示视频，请先确认目标、授权素材与输出位置，再按完整方法论制作。
```

使用配音时，把自己的获授权TTS Key配置在clone目录的 `profiles/tts.local.env`，变量名参考 `profiles/tts.env.example`；该文件被Git忽略。不要把Key发进聊天或提交GitHub。未配置TTS也可使用已有配音或真人录音。浏览器录屏与登录取决于使用者实际提供的工具及授权，安装此插件不代表自动获得业务账号或任意录屏能力。

公开仓库不包含凭据、node_modules、本机Python/录屏环境、消费项目素材或成片；安装和制作数据留在各自电脑。本插件静态结构与本地测试通过不等于同事新会话已完整加载或成片效果已验收。

## 当前路线：以上游为基础

目标是**一个通用视频工具，同时支持真人口播与产品介绍**。统一入口只在需求不明确时问视频类型，不让用户选择舍弃哪类能力或在Adu/自建引擎间取舍。上游已能用、许可允许且适合内容的能力尽量沿用，我们补齐产品录屏与解说差异；输入和验收按场景处理。

已按该方向完成固定GitHub源码级整合：1042个上游文件原字节保留、删除0、上游修改0，含13个pack目录及全部历史版本/示例/许可/测试。新产品路线调用同一上游导出器，不调用旧0.1渲染器。见[合并报告](docs/merge-report-20261115.md)及[逐文件资产账本](docs/upstream-assets.json)。个人.motion包、插件安装和所有模板的实际声画验收仍未完成，详见报告边界。

## 0.2统一入口

只在需求不明确时问“真人口播还是产品介绍”，两类能力同时保留。`video-create`统一创作，`video-adu`直接阅读原版Skill并使用全部原工作流；video-configure/voice/review继续提供配置、配音与审片。

```powershell
# 真人基础工程；完整模板的macro/auto工作流仍按原Adu Skill执行
node D:/A_Code/_DevTool/Video-Generator/src/cli.mjs create presenter "D:/Projects/MyVideo/episode-v1"
node D:/A_Code/_DevTool/Video-Generator/src/cli.mjs adu import "D:/Projects/MyVideo/episode-v1" "D:/Media/talk.mp4"
# 产品介绍，无需人物视频；素材/许可/字幕清单沿用已验证的输入结构
node D:/A_Code/_DevTool/Video-Generator/src/cli.mjs create product "D:/Projects/MyProduct/video/project.json" "sessions/adu-v1"
node D:/A_Code/_DevTool/Video-Generator/src/cli.mjs export "D:/Projects/MyProduct/video/sessions/adu-v1" "D:/Projects/MyProduct/video/deliverables/product-v1.mp4"
node D:/A_Code/_DevTool/Video-Generator/src/cli.mjs check-export "D:/Projects/MyProduct/video/sessions/adu-v1" "D:/Projects/MyProduct/video/deliverables/product-v1.mp4"
# 所有上游pipeline命令完整保留，不设命令名称白名单
node D:/A_Code/_DevTool/Video-Generator/src/cli.mjs adu --help
node D:/A_Code/_DevTool/Video-Generator/src/cli.mjs adu packs
node D:/A_Code/_DevTool/Video-Generator/src/cli.mjs upstream verify
```

创建只是工程准备，不会自动编造分镜或素材。真人仍按[原版Skill](upstream/adu-motion-video/SKILL.md)补齐配置/模板/音轨；产品路线读[合同](docs/product-scenario.md)。输出新版本、不覆盖已有项目。`adu`透传不代表所有候选模板都已在本机验收。

## 分层设计

参考Power-Automate-Generator的三层结构：

| 层 | 目录 | 用途 |
|---|---|---|
| Skill | .github/skills/ | 短入口：配置、编导、配音、审片 |
| Instruction | .github/instructions/ | 通用视线/完整边框/真实素材/声音/许可与交付规则 |
| 数据与脚本 | templates/、src/、scripts/、profiles/ | 清单模板、确定性媒体处理、官方TTS、本机配置 |
| 消费项目 | 各项目自己的video目录 | assets、project.json、sessions、deliverables |

区别：Flow Generator组件库是已学习的连接器Schema；本工具不把单个产品片硬编码成通用组件，而通过清单驱动素材与镜头。原项目专用Canvas/架构动画保留原位，AI按真实职责生成授权素材后可接入CLI。

## 安装

Node.js 22.16+、Python3.12+、FFmpeg/ffprobe9+及本机Chrome/Edge。根依赖使用上游同版Acorn8.15.0与Playwright Core1.58.2；安装脚本把Python音频/对齐依赖放.runtime，通过上游已有约定链接读取，不改1042个锁定源文件。现阶段Windows技术路径已测，跨系统与真实声画效果另验。

```powershell
npm install --prefix D:/A_Code/_DevTool/Video-Generator
node D:/A_Code/_DevTool/Video-Generator/scripts/setup-runtime.mjs
node D:/A_Code/_DevTool/Video-Generator/src/cli.mjs doctor
node D:/A_Code/_DevTool/Video-Generator/src/cli.mjs doctor --upstream
```

不需要数据库或常驻服务器。安装依赖需要网络；制作时使用本机浏览器与上游Playwright渲染，项目不含外部资源时可离线。TTS/个人MotionGit服务另需显式配置与授权，不自动调用。不要直接对锁定vendor运行会改源码锁文件的setup；使用上述独立运行环境脚本。

## 其他项目接入

**迁移提示**：新接入优先使用上面的Plugin方式。微软当前将`chat.agentSkillsLocations`标为弃用、保留编辑器兼容转发；`chat.instructionsFilesLocations`尚未弃用，但独立Copilot CLI不继承该设置。以下为0.1.0已有兼容配置；原配置不会自动迁移，验证新入口后再取消本工具的旧注册，不影响其他工具。见[官方迁移说明](https://code.visualstudio.com/docs/agent-customization/migrate-customizations#_move-customizations-from-configured-locations)。

在消费项目VS Code设置中**合并**两个目录，不覆盖既有工具：

```json
{
  "chat.agentSkillsLocations": {
    "D:/A_Code/_DevTool/Video-Generator/.github/skills": true
  },
  "chat.instructionsFilesLocations": {
    "D:/A_Code/_DevTool/Video-Generator/.github/instructions": true
  }
}
```

已有兼容注册保留；Windows路径用`/`。可迁移工具目录，命令换为实际工具根，Skills通过自身位置确定根目录。入口：`/video-configure`、`/video-create`、`/video-voice`、`/video-review`、`/video-adu`。

```powershell
node D:/A_Code/_DevTool/Video-Generator/src/cli.mjs init "D:/Projects/MyProduct/video"
# 添加获准素材video/assets/recording.mp4，编辑project.json。
node D:/A_Code/_DevTool/Video-Generator/src/cli.mjs validate "D:/Projects/MyProduct/video/project.json"
node D:/A_Code/_DevTool/Video-Generator/src/cli.mjs render "D:/Projects/MyProduct/video/project.json"
node D:/A_Code/_DevTool/Video-Generator/src/cli.mjs verify "D:/Projects/MyProduct/video/project.json"
```

init只是模板，未添加素材前不能render。模板演示视频播放4秒、原帧定格3秒、从原时刻继续4秒；输出独立版本且拒绝覆盖。清单细节见[契约](docs/project-contract.md)。脚本从任何工作目录接受清单绝对路径，素材/声音/输出仍相对该清单目录。

## 配音

已验证的字节官方TTS辅助脚本已迁移，默认配置为工具`profiles/tts.local.env`（Git忽略）；[模板](profiles/tts.env.example)只有变量名。也可用`--env-file`直接引用消费项目的本机配置，**无需复制原项目密钥到工具**。

```powershell
node D:/A_Code/_DevTool/Video-Generator/scripts/tts.mjs --self-check
node D:/A_Code/_DevTool/Video-Generator/scripts/tts.mjs --check --env-file "D:/Projects/MyProduct/.env.local"
node D:/A_Code/_DevTool/Video-Generator/scripts/tts.mjs --text "让复杂工作变得清晰，让下一步行动更直接。" --speaker zh_female_cancan_uranus_bigtts --rate 0 --max-characters 60 --env-file "D:/Projects/MyProduct/.env.local" --output "D:/Projects/MyProduct/video/assets/voice/preview-v1"
```

音色显式指定或在本机配置选定，示例不是所有项目默认音色。先核对额度/权限，再短试听、选定、批量生成；输出MP3、服务JSON和真实字幕（若返回），没有字幕就如实说明。

## 0.1历史兼容能力（未删除）

- 本地视频/静帧、准确源时点定格与恢复、源区间、顺序拼接。
- 完整安全contain、不放大源内容，字幕独立底部阅读带。
- 已有旁白与服务字幕、连续授权音乐、侧链、48kHz统一混音。
- Ajv清单验证、媒体时长/裁剪/旁白重叠/哈希/许可门禁、独立输出。
- FFV1无损中间片、一次最终H.264编码、源哈希与解码报告。
- 官方TTS离线自检和显式有限网络生成；本工具端真实网络调用尚未重新验证。

不是自动业务录屏、AI超分、任意动效引擎或无人审核的创作系统。全片创意、界面细字、音色自然度、真实浏览器带声音播放由Skill审核，不因解码通过自动宣布认可。当前测试使用合成媒体，不代表客户素材全量迁移完成。

## 验证与目录

```powershell
npm test --prefix D:/A_Code/_DevTool/Video-Generator
```

当前14项本地集成测试覆盖旧CLI、上游全部资产、原命令目录、口播创建/导入/导出、产品无人物/PNG/冻结恢复/字幕/声音及大帧数边界。测试素材为明确合成的技术探针，不是真人效果或TTS服务回执。上游原61个测试文件完整保留，不声称每次均复跑。接手看[蓝图](PROJECT_BLUEPRINT.md)、[进度](PROJECT_STATUS.md)、[目录地图](WORKSPACE_MAP.md)。不会未经授权commit、push或覆盖消费项目旧媒体。

## 上游许可

完整Adu固定源码在upstream/adu-motion-video，原MIT LICENSE、许可说明和第三方素材通知一并保留。代码许可不自动涵盖任意示例媒体、品牌、配乐或个人.motion资源；使用或再分发具体素材时核对其原始许可，不把仓库公开等同所有媒体可自由商用。