---
name: "通用视频工具：声音与本机配置"
description: "生成视频配音、女声男声试听、字节豆包TTS、真实字幕、混音或配置本机语音凭据时使用。"
applyTo: "**/video/**,**/videos/**,**/demo-video/**,**/*.local.env"
---

# 声音制作流程

- 通过[video-voice](../skills/video-voice/SKILL.md)执行；音色、文案和输出属于消费项目，不把客户品牌/选音写为工具全局默认。
- 官方接口为`https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse`；已验证资源`seed-tts-2.0`，输入普通话文案与官方speaker ID，得到MP3及服务真实字幕时间。
- 凭据从进程环境、显式`--env-file`或工具`profiles/tts.local.env`读取；只输出状态/变量名，消费项目可直接引用自己的本机配置。
- 用[官方控制台](https://console.volcengine.com/speech/new)核对目标资源、额度及用途，额外付费/购买/声音克隆由用户先确认。
- 按[官方音色表](https://www.volcengine.com/docs/6561/1257544)选择候选，同一短文案、同语速、无配乐试听，由用户选定后有限批量生成。
- `--check`只读配置不联网；`--self-check`不读凭据、不联网；生成显式设`--max-characters`与独立输出前缀，遇错如实记录，不盲目重试。
- 成功必须核对20000000、实际用量、音频哈希及ffprobe时长；字幕只用真实服务时间，没有字幕就说明缺失，不补造。
- 全片按新声音时间重新绑定镜头，配乐沿连续时间线混音，人声/音乐/字幕都按最终MP4审核。
- 原接口说明：[V3单向流](https://www.volcengine.com/docs/6561/1598757)。本工具迁移的SSE解析已离线验证，真实网络调用结果每次另记录。