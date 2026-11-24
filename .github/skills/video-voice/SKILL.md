---
name: video-voice
description: "口播文案、产品旁白、新稿或既有录音的选择，以及豆包字节官方TTS、音色试听、MP3与真实字幕；继承Adu表达/编舞方法，跨项目按授权和有限字数执行。"
---

# 配音与试听

读取[声音规则](../../instructions/video-voice.instructions.md)，工具根从本Skill位置向上三级确定。

## 文案与声音先分开

新建/重新创作按[上游创作引导](../../../upstream/adu-motion-video/references/start-creating.md)、[表达与文案适配](../../../upstream/adu-motion-video/references/adaptive-composition.md)组织本期内容，按[制作约定](../../../upstream/adu-motion-video/references/rules.md)与[音频方法](../../../upstream/adu-motion-video/references/audio.md)连接声音和画面。这些上游方法同时适用于真人与纯旁白，不因使用豆包TTS而跳过。

- 区分文案、音色、音频文件和时点。用户要求新叙事时先形成适合受众和真实素材的新稿；保持音色不代表沿用旧文案/原音频。只修画质、特效、字幕或混音时保留未受影响的已认可声音；用户要求保留原稿/真人原声时不得擅自重写替换。
- 文案围绕本期观众的具体问题、可见过程/结果及其判断依据，用该领域自然语言表达。每段对应真实事实/素材或明确的解释；不以空泛价值口号、技术报幕或为模板凑项替代内容，不编造素材没有的成果。具体业务台词与数值留消费项目，不写进通用Skill。
- 为本期段落建立“旁白→依据→画面阶段→动作落点”关联，再选择可容纳的原生场景。TTS生成后用实际时长和[可靠字幕](../../../upstream/adu-motion-video/references/subtitle-options.md)更新关联；不套旧词时码、不靠加速口播或整场动画硬塞时长。文案、音频、字幕变更另存版本，保留来源和复用理由。

## TTS生成与核对

1. 按消费项目选音/文案/预算，核对官方控制台资源与余额。已选音色复用，新音色同文案短试听后确认。
2. `node "<TOOL_ROOT>/scripts/tts.mjs" --self-check`离线解析自检。跨项目默认复用工具根的 `profiles/tts.local.env`，先运行 `node "<TOOL_ROOT>/scripts/tts.mjs" --check`；无需向消费项目复制密钥，该文件由 `profiles/*.local.env` 忽略。只有项目明确使用独立配置时才传 `--env-file "<local.env>"`；检查不联网，音色显式 `--speaker`。配置检查失败不代表没有 TTS 能力，先核对实际配置入口，不擅自替换成其他配音引擎。
3. 生成：`node "<TOOL_ROOT>/scripts/tts.mjs" --text-file "<script.txt>" --speaker <official-id> --rate 0 --max-characters 150 --env-file "<local.env>" --output "<project>/assets/voice/intro-v1"`。
4. 只记录实际服务成功码/用量/音频哈希/字幕状态；用ffprobe测长度、FFmpeg完整解码，缺字幕如实说明。
5. 消费项目清单narration.source引用MP3，metadata引用服务JSON，at声明成片起点；配音超出镜头时延长定格，不随意加速真实操作。

工具本身不默认某个客户的音色，Key不放Skill正文或会被提交的配置。