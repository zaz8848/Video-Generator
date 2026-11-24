# Video Generator — 开发进度

本文件按项目进度骨架实例化，记进度/卡点/绕行；稳定边界只链接蓝图与项目规则。

## 文档导航

| 通用章节（迁移保留） | 放什么与读写 |
|---|---|
| 当前阶段 | 全局状态；读写 |
| 已定开发约定 | 权威规则链接；读 |
| 下一步行动清单 | 还要做什么；读写 |
| 待开发需求 | 新需求规格；读写 |
| 阶段里程碑细节 | 真实实施与证据；读 |
| 常用接口/命令速查 | 实际入口；读 |
| 进度流水 | 每次进展；读写 |
| Block（卡点） | 外部阻塞；读写 |
| Workaround（绕行） | 临时处理与还债；读写 |

项目专有：本机CLI验证/跨项目接入归当前阶段和里程碑；迁移新项目清空这些记录。

## 当前阶段

- 2026-11-24，用户授权发布GitHub公开仓库供同事在GitHub Copilot本机使用。新增Agent Plugins 1.0根manifest、五个skills薄路由和两份com.github.copilot/rules路由，复用现有Skill/Instruction正文与唯一一套代码/模板；无自动联网安装hooks，不修改Copilot Studio或消费项目注册。
- 结构检查验证五入口、两规则及7条路由链接通过；README增加clone、依赖准备、doctor、本地pluginLocations及凭据说明。凭据、node_modules、.runtime、sessions、deliverables排除Git，profiles仅保留变量名模板；上游MIT与媒体许可原样保留。新同事机器的Plugin发现、安装和声画效果仍未验证。
- 本轮npm test实际14/14通过，使用明确合成媒体，含大帧数回归和1042上游完整性；证据sessions/tests-1795484072593/integration-results.json。本阶段4/5。已按用户明确Public授权创建并推送 https://github.com/zaz8848/Video-Generator ，远端回读确认PUBLIC/main及plugin.json存在，本地与origin/main同步。公开1090文件约54.5MB，实际暂存扫描排除本地资源并比对已知TTS Key无泄露；同事机器安装/加载及真实声画效果仍未验证。

- 2026-11-19，按用户授权修复 src/product.mjs 的大帧数选择表达式：将线性相加改成平衡表达式，降低 FFmpeg 解析深度；不修改固定上游、源 PTS、选择顺序或冻结恢复合同。新增 product.test.mjs 定向回归，240帧播放加冻结/恢复实际成功，首/中/尾PNG与独立源帧哈希相同。npm test 实际14/14通过，证据在 sessions/tests-1795047474937/integration-results.json 及 sessions/product-1795047474952-74464/；编辑器无错误，回归中的1042上游资产原字节校验通过。
- 同一修复已在消费项目真实VFR原片失败路径复验：完整产品工程和2571帧成片由原导出器生成，交付校验/完整解码/正常速度播放通过。消费项目素材与业务说明不进入工具源码；未调用TTS或修改业务数据。先前许可字段不兼容和大表达式失败保留，不计为成功；平衡表达式不是分批取帧，也不把源帧采样称为运动插帧。方法效果/声音自然度与用户认可仍另验。工具版本保持0.2.0，本阶段3/5。

- 2026-11-19，通用创作与修订 SOP 已落在 [.github/skills/video-adu/references/creative-production-sop.md](.github/skills/video-adu/references/creative-production-sop.md)：覆盖目标/事实、叙事选型、连续对象与因果、焦点阅读、素材与真实时钟、审片交付、局部修订及新规则归属。video-adu 新建/重创必读，video-review 引用同一审片表；WORKSPACE_MAP 登记落点。不将消费项目品牌、邮件/Excel、示例条数、固定透明度或时长固化为通用模板；不复制上游方法，也不改原锁定文件。
- 本轮四份文档 UTF-8/元数据/21 条本地链接及锚点、八阶段覆盖检查通过，编辑器无错误。npm test 实际 13/13 通过，含离线 CLI 与真人/产品合成导出回归；证据位于 sessions/tests-1795028557206/integration-results.json、sessions/presenter-contract-Bxkmdk/evidence.json、sessions/product-1795028557205-59008/。upstream verify 核对 1042 文件，无缺失/改动。共享目录无 Git 仓库，git status 未能执行，不冒称已核对 Git diff。未改运行时代码、消费项目视频或锁定上游，未调用网络 TTS/付费服务；尚未验证新会话遵守或据此制作新片的声画效果。工具保持 0.2.0，本阶段 2/5。

- 2026-11-18，上游方法的默认Skill入口已补齐：此前1042源文件/命令虽完整保留，video-create却仅在真人分支明确引向原版流程，产品分支容易直接走绑定/导出。现两类新建/重创均先进入video-adu，直接引用原版创作引导、制作约定、文案适配、选型/完整工程、字幕和声音方法，再分完整模板复用、参考后原创和局部修订；不是把上游原文压缩重写成另一套方法。
- 同轮更新video-voice与video-review：明确文案/音色/音频/时点分开，新创作不因沿用音色悄悄复用旧稿；局部视觉修订不强迫换音或付费生成。补齐声画阶段、动作家族重复与连续片段核对，交付记录实际采用/未采用原因及新作/复用范围。用户刚补的工具根profiles/tts.local.env默认入口、独立项目--env-file与配置失败不代表无TTS的规则完整保留，未读/复制密钥。
- 本轮验证四份Skill元数据/UTF-8及30条相对链接通过，共同方法入口在产品导出命令之前；编辑器无错误；upstream verify实际1042文件无缺失/改动。首次校验命令受PowerShell引号解析阻断，换安全引用后重跑成功，未计首次为通过。仅验证静态规则与上游保存，未运行新成片/模板/新会话行为评测，不声称未来Agent必然遵守。CLI版本保持0.2.0，不改运行时、不跑冻结业务测试、不调用TTS/付费服务、不改消费项目视频、不commit/push；工具本阶段1/5。

- 2026-11-15，0.2.0源码级merge已落地。完整导入固定Adu3.14.1-rc.1基线1042文件，删除0、上游修改0；统一双场景工程创建、全部原命令透传、原导出与交付验证、产品PNG/真实PTS定格恢复及新工程口播stub兼容。13项本地测试通过，实际口播/产品MP4导出、上游doctor和TTS离线自检通过。[正式报告](docs/merge-report-20261115.md)列明保留/新增/停用/未接入项，[资产账本](docs/upstream-assets.json)逐文件可复核；技术合并不等于所有模板视觉验收。
- 2026-11-15用户进一步明确产品形态为一个通用工具，真人口播和产品介绍都要；只选择本次创作类型，不要求取舍保留能力或选择Adu/自建引擎。video-create/video-configure入口、README与蓝图已对齐，Adu可用流程/模板/效果优先保留复用。入口规则与引用检查通过，运行时整合/上游安装尚未实施，不将规则修改说成已支持所有能力。
- 2026-11-15用户明确真人口播与纯产品介绍是可共存的场景。蓝图和研究结论已澄清：保留上游成熟口播路线，扩展旁白＋产品素材路线，复用适合共享的底层；真人导入合同不作为产品片障碍，TTS是可选语音提供器。当前仅修正设计归属，未实现路由、合并代码或运行上游制作。
- 2026-11-14上游优先研究完成，主线改为以成熟Adu/MotionGit为基础、我方薄适配；0.1.0保留兼容，不继续扩建平行引擎。固定提交4a52ae2的1042文件全部Git blob SHA匹配，文本/模板分组审读、生成数表按结构审查；41二进制未逐条观审，未执行上游程序或测试。[研究报告](docs/adu-upstream-review-20261114.md)包含覆盖、许可、接口风险和最小接入顺序。实际合并/.motion实例/无人物制作/Plugin迁移未执行。
- 2026-11-14，0.1.0首版本地实现完成：清单驱动媒体合成、外部Skill/Instruction、官方TTS辅助、消费项目模板已建立。4项离线测试通过，实际覆盖3个独立项目，AEON外部接入配置已回读验证。此结论只涵盖首版README声明的能力，不包含任意Canvas动画引擎或客户原视频全量迁移。

## 已定开发约定

[蓝图](PROJECT_BLUEPRINT.md)、[目录地图](WORKSPACE_MAP.md)、[维护规则](.github/copilot-instructions.md)、[通用制作](.github/instructions/video-production.instructions.md)。

## 下一步行动清单

| 行动 | 依赖 | 状态 |
|---|---|---|
| 固定GitHub原生口播/无人物基础路线、实际小样 | 固定源码与合成素材 | 0.2.0已完成技术验证 |
| TTS入口保留，PNG/边框/定格恢复接上游工程 | 场景合同与导出证据 | 0.2.0已实现；TTS本轮未联网 |
| 取得并核对具体个人.motion包 | 包身份/许可/权限与对应运行时 | 未接入，不假造支持 |
| 按标准目录/Agent Plugin分发薄适配 | 对应客户端与新会话加载验证 | 待实施；旧路径先保留 |
| AEON只增加外部路径引用，不迁移旧媒体 | 配置合并 | 已完成 |
| 更完整的可复用Canvas架构/关键词动画模板 | 真实多项目样例与输出协议 | 后续，未实现 |
| 原始PNG时间序列清单自动转换 | 消费项目来源与时间契约 | 后续，当前可用独立image/video素材 |
| macOS/Linux字体、FFmpeg和浏览器验证 | 目标系统 | 未验证 |
| 新工具端真实TTS云调用 | 用户授权/配置/额度 | 未执行，不阻塞离线核心 |

## 待开发需求

后续模板只能承载可跨项目的结构/运动规则，品牌/参与者/业务字段/实测数据由消费项目提供。复杂创意模板需独立多项目验证，不能把旧专用渲染器改名当完成。

## 阶段里程碑细节

### 第五轮阶段总结：0.2.0双场景与资产零删除

- 依用户“以成熟上游为主体、两类都要”的要求，完整保留13个pack目录/699文件、全部适配器/profile/示例/媒体/许可和61个原测试文件；机器审计1042文件原Git blob SHA全匹配。运行前后校验，新增依赖链接与源文件统计分离。
- 统一CLI新增create presenter/product、export、check-export、adu原命令透传、upstream verify；新增video-adu直接读原SKILL，避免旧简化入口遮蔽能力。0.1init/validate/render/verify及代码/测试仍保留。
- 产品扩展用原Scene/lib/main/subtitles和pipeline mix/render/export，单PNG原样保存、视频真实PTS→PNG、完整contain、字幕带、准确冻结恢复；短音乐/未规范化HDR与广色域显式拒绝，现有上游色彩/音效/模板能力未删除。
- 口播封装调用原new/import/export，仅改新工程精确空talkmap stub并增加原MIT/第三方说明，原音轨PCM保持。合成探针不当真人口型/跟脸认可，产品与口播工程均继承许可通知。
- 最终13/13本地测试通过，最终证据在sessions/tests-1794680632911、presenter-contract-Sr0k8t、product-1794680632912-50184；上游doctor完整通过，Node24.16/Python3.14.5/FFmpeg9/Playwright1.58.2/本机Chrome。音频依赖隔离安装，原Key未复制，TTS自检networkCalled=false。
- 报告明确不迁入的默认是平行主引擎/隐式短音乐循环/客户硬编码，而非删除资产；个人.motion、Plugin、CDP原PNG清单自动导入、全部候选模板Windows真人验收仍未完成。无业务接口、常驻服务、全局Skill迁移、commit/push。工具0.2.0，5/5；下一轮从1/5。

- 2026-11-14研究：正确主仓库为adunext/adu-motion-video，README当前优先.motion路线，仓库旧Skill仍可维护；MIT代码许可不包含任意示例媒体/品牌。借助分组只读审读补全模板实现，所有上游脚本/测试均未运行。两个git clone断线未成功，最终固定提交zip下载并核对1042/1042哈希成功；raw域名失败后入口文档经GitHub内容API取得。研究副本留sessions，不当生产安装。
- 官方Skill迁移澄清：失败的是含旧VS Code构建目录名的内置Skill读取路径；本机1.146.0。Skill未被取消；agentSkillsLocations弃用但编辑器兼容，instructionsFilesLocations尚未弃用。推荐标准项目/个人目录及成套Agent Plugin，不擅自迁移用户其他工具或全局配置。README已标明0.1.0外部路径方案为兼容说明。
- 参考Power-Automate-Generator README的三层/外部注册/配置隔离方式；用户授权自主沿用已有Node/FFmpeg/TTS底座。
- 四项测试通过：Schema与contain、相对路径隔离、第三独立项目的CLI初始化/静帧静音视频、两项目播放/冻结/恢复与字幕/音乐集成。实际覆盖320×240和640×480，带字幕配乐成片各1.5秒/15解码帧；纯静帧成片3解码帧。最后一次证据：[integration-results.json](sessions/tests-1794668997781/integration-results.json)。
- 字幕测试metadata是明确标注的合成契约探针，不冒充云端返回。首次冻结比较跨字幕结束点，改成只比业务图像区后，通过同帧恢复检查。
- 官方TTS脚本机械迁移，不复制Key，改为工具本机配置及显式音色；离线SSE/字幕自检通过，networkCalled=false。
- 未提交Git、未复制客户媒体/密钥，消费项目只新增工具接入。
- CLI doctor实际检查Node v24.16.0和FFmpeg/ffprobe 9.0.1完整构建；编码器/字幕/侧链可用。12份Markdown的23条相对链接、Skill元数据与UTF-8检查通过。
- AEON设置只追加两个外部目录，Power-Automate-Generator原注册保留，四个video-*入口与旧本地Skill不重名；当前沟通已确认vscode-only。
- 初次源码迁移缺scripts目录，创建后重试成功；旧VS Code自定义Skill路径失效，已通过当前安装目录解决。失败未计为成功。新TTS未读/复制AEON Key，profiles仅有tts.env.example，真实网络调用未执行。

## 常用接口/命令速查

CLI：`node src/cli.mjs doctor|init|validate|render|verify`；测试：`npm test`；TTS：`node scripts/tts.mjs --self-check`。详细参数见README。

## 进度流水

| 日期 | 模块 | 内容 | 状态 |
|---|---|---|---|
| 2026-11-15 | 源码级merge | 全量Adu＋双场景适配＋原导出/验证，1042资产零删除 | 13测试/doctor/审计通过；0.2.0，5/5 |
| 2026-11-15 | 统一创作入口 | 需求不明才问口播/产品介绍，保留两类能力并优先使用上游 | Skill规则已对齐，运行时merge未实施；0.1.0，4/5 |
| 2026-11-15 | 场景边界 | 真人口播与产品介绍并列共存，输入和验收分支，共享底层 | 设计已澄清，接入未实施；0.1.0，3/5 |
| 2026-11-14 | 上游研究 | 固定Adu快照、完整性/许可/模板/运行时审读及微软Skill迁移说明 | 研究完成，整合未实施；0.1.0，2/5 |
| 2026-11-14 | 初版 | 独立工具、结构验证、媒体合成、TTS辅助及AEON外部接入 | 4项离线测试/链接/接入通过；0.1.0，1/5 |

## Block（卡点）

没有核心CLI已知阻塞；真实TTS未在新工具调用，跨系统未验证。

## Workaround（绕行）

复杂Canvas动效暂由AI按项目制作成授权视频素材再接入CLI；不声称已有任意动效模板库。无损中间片占磁盘，保留过程供排查，由用户明确批准后清理。