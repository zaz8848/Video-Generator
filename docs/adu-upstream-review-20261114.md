# Adu上游优先整合研究

## 结论与授权边界

按用户2026-11-14补充意见，以成熟的Adu制作体系为基础，评估把我方有效增量接入它，而不是把对方动画拆到自己的新引擎。自建0.1.0保留历史兼容，暂停扩建平行编舞、选型、混音和导出体系。

本轮只做静态研究与方案记录：没有运行上游程序或测试，没有安装上游依赖、合并代码、替换AEON工程、下载带个人凭据的.motion包或修改全局Skill。后续实施不把本报告当成已完成集成证据。

2026-11-15场景澄清：用户明确真人口播与纯产品介绍可以共存。整合目标是保留前者、扩展后者，并共享适合共享的底层，不是将所有上游模板改成TTS模板；下文真人导入限制仅属相应模板/路径的合同，不是整个制作体系不支持产品介绍的结论。

## 研究基线与实际覆盖

- 主仓库：[adunext/adu-motion-video](https://github.com/adunext/adu-motion-video)，不是归档镜像；用户输入MOPTION未匹配，Motion拼写找到该仓库。
- 固定提交：[4a52ae2cff542cfb0bfcf6e93e5120c55d0110cf](https://github.com/adunext/adu-motion-video/tree/4a52ae2cff542cfb0bfcf6e93e5120c55d0110cf)，提交日期2026-10-18。
- 全量树未截断：1042文件，53,900,786字节；本地zip解压后逐文件核对Git blob SHA，1042/1042匹配。
- 1001文本、41二进制、580个不同Git blob。代码/文档/模板按内容哈希分组审读，相同字节副本归并；字体base64作为二进制编码处理，不把编码逐字阅读算作代码理解。
- 核心scripts 62文件、tests 61文件、template 12文本及examples 33文件已全文静态审读。全部13个pack目录、34个adapter文件、22个profile文件、根说明/许可、references与docs已分组审读；补读覆盖初轮只做结构审查的模板实现。
- 生成数据明确降级：两版vibrant音频包络表（相同内容）全量解析字段/记录类型，3039条数值未逐数语义阅读；压力报告全量解析567条案例，按12类分组审读，不称每条数表都进行了人工证明。
- 41个二进制没有逐条播放、审听或验证字体渲染；未把代码阅读当作所有模板的视觉认可。在线MotionGit规范与使用说明已读，但实际个人下载.motion包未取得，不能声称验证了包内运行时。
- 原始清单与快照证据留`sessions/research-adu-motion-20261114/`的inventory.json、snapshot-verification.json及snapshot目录；研究副本不是当前生产依赖。

## Skill路径：三件事分开

1. 上一轮失败的是我读取VS Code安装目录内、含旧构建目录名的内置agent-customization Skill；旧目录c4453f8ea4变为69047191fc。不是用户的Skill被取消，也不是_DevTool资源随升级失效。
2. 已核对本机VS Code版本1.146.0。微软当前文档仍支持项目`.github/skills/`及个人`~/.copilot/skills/`，项目Instruction在`.github/instructions/`，个人在`~/.copilot/instructions/`。扩展内置Skill应由扩展的官方贡献点发现，消费者不手写版本号路径。
3. `chat.agentSkillsLocations`已弃用但仍由编辑器兼容转发，不表示当前立即失效；`chat.instructionsFilesLocations`明确尚未弃用，但同样是编辑器设置，独立Copilot CLI不自动继承。上轮将外部搜索路径作为长期首选不够严谨。

推荐：项目专用放项目标准目录；个人跨项目放个人标准目录；成套可升级工具用官方Agent Plugin封装并在受支持的客户端安装。插件也有版本/策略和信任限制，安装后须新会话核对发现、调用与实际结果。现有0.1.0尚未插件化，不声称已自动迁移；保留现设置直到替代方式实测可用，避免两份同名Skill同时活跃。

官方来源：[Skill位置与兼容说明](https://code.visualstudio.com/docs/agent-customization/agent-skills#_skill-locations)、[配置路径迁移](https://code.visualstudio.com/docs/agent-customization/migrate-customizations#_move-customizations-from-configured-locations)、[插件安装与本地来源](https://code.visualstudio.com/docs/agent-customization/agent-plugins#_install-a-plugin-from-source)。官方迁移界面为`Chat: Open Customizations → Migrations`，不是要求手改安装目录或立刻删除原配置。

## 上游当前有两条路线

| 路线 | 事实 | 本项目处理 |
|---|---|---|
| 新.motion/MotionGit | README优先推荐完整动画包，含源码、参数、资源、布局/时间合同、引导与许可 | 优先检查具体包的能力及权限，再做本期制作；未取得实体包前不承诺接入完成 |
| 仓库旧Skill 3.14.1-rc.1 | 保留完整工程、包版本、规划/构建/渲染/验收工具，适合维护旧工程和可审查扩展 | 用作已有公开源码基线，不把旧CLI合同直接套给新.motion |

[MotionGit格式规范](https://motiongit.com/spec)截至本轮仍是候选合同：内容层0.1.0-draft.1、个人交付外层1.0.0-rc.1，不能混作一个稳定版本。新html-canvas/1推荐`renderFrame(整数帧, inputs)`；旧仓库为`renderAt(秒)`，接入必须显式区分时钟。格式开放不代表每个模板、字体和音轨开放授权。

网站个人下载可能包含下载者自己的Key与签名回执，交由可信包工具在本机处理；不经模型索取或输出具体值，不因公开格式而剥离其身份/授权层。没有实际包，先做静态规划而不是假造一个兼容包。

## 直接沿用的成熟能力

- 编舞单元和有名slots/cues/数量约束，完整动作窗保持原速、只扩允许阅读区，而非按整片统一拉伸。
- 输出时钟与源编舞时钟分离，人物/字幕、动作、跨场音效分别处理；相邻镜头可要求真实实体连续。
- 原生横竖屏对象重排、人物回稳、字体preferred/exact与OFL回退、真实字体排版检查。
- 语义brief、来源/内容归属、版本冻结、局部分镜重配和实际素材再验证。
- 单首显式授权配乐、SFX、人声、侧链、响度、色彩管理与导出验收，哈希绑定预览与旧版本提示。
- 17个稳定组的既有认可只覆盖特定版本/场景/历史环境；横屏10风格47组、竖屏11风格54组是选型规模，不是全部稳定或Windows整片已验收。

控制点：`scripts/pipeline.py`、`plan_macro_project.py`、`build_macro_project.py`、`auto_templates.py`、`macro_runtime.js`、`export_project.py`、`verify_delivery.py`、`source_registry.py`、`content_evidence.py`。本轮只读，原历史成绩不追认为本机复跑结果。

## 我方增量与不应迁入的重复能力

| 我方能力 | 上游核对结果 | 建议 |
|---|---|---|
| 字节官方TTS、音色选择、服务真实字幕/用量/哈希 | 现成音频导入/RMS不是TTS生成服务 | 保留为语音提供器，输出音频/真实字幕/真实词时码，不重做音频引擎 |
| 原始PNG时间序列 | 单图槽可原样复制；sequence/作品墙/口播准备仍有JPEG专属合同 | 补无损序列媒体适配，明确源时钟与色彩，不宣称全链路无损 |
| 软件界面全程四边四角完整 | 多个窗口默认cover或contain后继续放大，人脸裁剪是有意能力 | 新增产品证据呈现合同与边界检查，保留原风格但不裁业务信息 |
| 原速播放→准确源帧定格→同源续播 | 已有末帧钳制/阅读hold，不等于任意中段冻结恢复 | 补媒体游标映射，不冻结全局字幕/动画时钟，不改变真人口型 |
| 混音、全片调度、分段编码、源身份与预览版本 | 已有更完整实现 | 不迁移第二套；我方0.1.0保持旧工程兼容 |
| 隐式循环短音乐 | 我方首版会loop，上游现行music_policy明确拒绝不足全片的曲目 | 不迁入该默认，选足长曲目或明确设计与审核音乐延展 |

关键依据：`scripts/import_talk.py:25`同时要求视频与音频；`scripts/build_macro_project.py:196`单图复制；`scripts/adapt_project.py:740`末端hold；`packs/editorial-performance/1.2.0-candidate/units/evidence-to-handbook.js:26`后段cover；`scripts/music_policy.py:63`曲目不足拒绝隐式循环。位置属于固定快照，不是所有未来版本。

## 产品介绍与真人口播分路线验证

基础模板有`cam:'none'`及图像/序列场景，可作为旁白＋录屏产品片的接入候选。旧macro/auto-build经import_talk要求人物视频和音频，是该条口播制作路径的输入约束；保留它服务真人口播，不把该要求施加到产品介绍，也不用冻结真人或空壳视频伪装满足输入。产品路线应在项目层生成无人物工程或使用明确支持audio.voiceover/video.screen的.motion包，继续复用上游能共用的动画、混音与导出。旁白可来自TTS或人工录音。此接入尚未制作验证，不能说已经闭环。

真人路线核对人物构图、口型、原声和辅助动画；产品路线核对真实界面、细字、完整四角、源操作原速及同帧定格恢复。共享能力与两套场景规则分开维护，不能以“统一”名义削掉现有口播能力或强迫产品片出现人物。

## 接入前风险清单

- 静态发现旧`new→import`占位文本不一致：pipeline.py new_project写短stub，import_talk只接受长stub。宏构建自己生成正确stub，不扩大为全部构建失效；未运行复现、未改上游。
- Python doctor门槛与部分源码API/语法可能不一致；实施时建议先验证Python 3.12+、FFmpeg能力和实际浏览器路径，不照抄最低版本即声称可用。
- candidate/manifest/review/profile有历史描述滞后；固定实际包ID、版本、代码哈希与测试环境，不以一个标签晋级。
- 上游工程/模板可执行JS/Python；审核声明、包内Skill和权限字段不能自授权。输出进独立实例目录，保留模板原字节，执行前再审依赖和网络/费用需求。

## 最小实施顺序（本轮未实施）

1. 固定Adu主仓库/具体.motion包身份与许可；保留只读上游和既有AEON成片，不覆盖研究快照冒充生产安装。
2. 选一个确实支持无人物旁白＋软件录屏的模板/基础路线，先用两份不同项目的授权输入验证同一上游导出器。
3. 外置TTS提供器接音频、真实字幕与cue；缺真实词时间就明确缺口，不按SRT句长猜词。
4. 新增一个小的产品证据场景/媒体合同，支持原始PNG、完整contain、原速、定格恢复、源引用；不改现有稳定包原字节，不把人脸窗口规则套到截图。
5. 复用上游混音、色彩、导出、版本预览和验收；补项目级边界/内容完整性审核。
6. 最后再用官方Agent Plugin或标准Skill目录分发这层薄适配。验证新会话实际加载后，才考虑退役旧外部路径与我方重复入口；单独获得发布/上游PR授权。

MIT允许在保留版权/许可的前提下修改代码，但不等于拥有示例人物、声音、录屏、作品墙、音乐、Circle品牌或全部字体的再分发权。实际.motion包还须看包内单独许可。