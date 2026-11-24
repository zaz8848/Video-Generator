---
name: video-adu
description: "直接使用完整保留的Adu原版视频制作工作流、模板包、自动/指定分镜规划、局部重配、声效、预览与导出，不经过简化的产品拼接入口。"
---

# 完整Adu工作流

本入口同时服务真人口播与无人物产品片，不是仅供手动查命令的旁路。以下引用是上游方法的直接入口，不用本文件的摘要代替原文，也不改写或删减固定上游文件。

新建或重新创作时先读[通用视频创作与修订 SOP](references/creative-production-sop.md)，按阶段准备本期简报、分镜、对象/状态、焦点和真实时钟，再执行下列上游方法。局部修订读取受影响阶段及审片检查表；新增可复用规则按该文第 8 节增补，不把案例参数写成通用硬模板。

## 先执行上游方法

1. 读取[原版SKILL](../../../upstream/adu-motion-video/SKILL.md)、[创作引导](../../../upstream/adu-motion-video/references/start-creating.md)及[制作约定](../../../upstream/adu-motion-video/references/rules.md)，按已有素材区分文案、录音、人物、演示和参考；用户已明确的信息不重复索取。完整保留全部模板/版本/示例/测试/许可，[资产账本](../../../docs/upstream-assets.json)只证明保存，不证明本片已经使用或验收。
2. 新内容按[文案与编舞适配](../../../upstream/adu-motion-video/references/adaptive-composition.md)先组织表达关系，再分段选动画；不要一句字幕套一个特效，不为模板固定数量编内容。每段记录原文/事实依据、观众要理解什么、真实素材、声音及动作落点、阅读停留和前后承接。
3. 未锁定风格时按[自动选型](../../../upstream/adu-motion-video/references/automatic-selection.md)执行`auto-capabilities → auto-plan → auto-build`；锁定完整包时按[完整工程复用](../../../upstream/adu-motion-video/references/full-project-templating.md)与包指南执行`macro-plan → macro-build`。先核对素材/语义/动作窗/数量的实际兼容性；不因基础TPL容易运行就绕过完整编舞，也不为满足模板伪造真人。仅需轻量探索或有具体不匹配原因时才选基础TPL/新变体，并记录采用及未采用的原因。
4. 用户只要求参考时，先实际观察可访问的动态画面并注明范围，再据本期内容原创，不将复用模板合同当成参考创作的硬门槛。参考媒体/声音/品牌不自动授权进成片，受保护内容不擅自解包；不得把原创Scene或少量TPL说成完整包复刻。参考路线仍执行上游表达、节奏与声画核对方法。
5. 按[字幕方案](../../../upstream/adu-motion-video/references/subtitle-options.md)用本期可靠字幕/词时码驱动强调；缺词时码不能估算后声称精准同步。按[声音与混音](../../../upstream/adu-motion-video/references/audio.md)处理当前旁白、连续授权音乐、动作SFX和尾音；TTS生成交[video-voice](../video-voice/SKILL.md)。最终输出时钟与原编舞时钟分开，保留原速动作和完整人声，不以全片变速/截断口播塞进模板。
6. 按上游适配中的重复与连接检查减少连续重复组/动作家族，检查同一对象交接与强弱/阅读停留；完整场景不能随意拆断，不能只换标题反复填时长。根据内容兼容性增加变化，不随机堆特效。交[video-review](../video-review/SKILL.md)从最终片检查表达与声画，而不是仅验文件存在。

## 执行与边界

- 工具根从本Skill位置向上三级确定。运行`node "<TOOL_ROOT>/src/cli.mjs" upstream verify`；`adu <command> ...`完整透传原pipeline，包括packs、macro/auto规划构建、rematch、audio/mix、preview、repair、render和check，不设命令白名单。
- 模板/源素材/真实cue/许可与实际环境满足后按原合同制作；缺依赖先说明，依赖装工具根或外部运行环境，不改锁定上游文件。输出独立，既有项目不覆盖；模板不兼容时报告具体边界，不能未经说明切成低能力拼接。
- 原GitHub Skill与个人.motion分别遵守各自指南/运行时，当前公开包的适配记录不追认到其他包。Key、云调用及费用授权保持独立；合成技术检查不替代本期真实素材与连续声画认可。