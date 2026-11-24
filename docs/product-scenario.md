# 产品介绍场景合同 0.2

## 定位与入口

无人物产品介绍是与真人口播并列的场景。用0.1清单的素材/声音结构作为输入，不使用0.1渲染器；生成包含上游原Scene/lib/main/subtitles的可编辑工程，最终由原pipeline mix/render与export_project.py导出。

```powershell
node <TOOL_ROOT>/src/cli.mjs create product <project.json> <new-project-folder>
node <TOOL_ROOT>/src/cli.mjs export <project-folder> <new-output.mp4>
node <TOOL_ROOT>/src/cli.mjs check-export <project-folder> <output.mp4>
```

新工程目录在消费项目清单根以内，相对路径以清单为基准；导出建议传绝对路径。已有工程/成片不覆盖，失败的新过程目录保留排查。输入清单结构见[旧清单契约](project-contract.md)，但新场景不接受不足全片的音乐、不隐式loop。

## 画面与时钟

- play：按源PTS与目标帧网格映射原速，不用字符串四舍五入后的时间猜帧；音视频源选择实际存在的显示帧。
- freeze：绑定in所在的实际源帧；下一play使用同一in时从同一帧恢复，字幕/动画仍按输出时间继续。
- image：原始PNG/JPEG/WebP文件原字节复制，按声明时长展示；不是将原图先转MP4。
- 视频所需帧抽为PNG，再由上游浏览器渲染。crop为真实源坐标，等比contain且不放大，保留四边与字幕阅读带。
- 当前不提供CDP/screencast原始采集JSON自动导入；视频PTS、单图与准确冻结恢复已实现。不能将其描述为所有PNG序列格式均已支持。
- HDR、BT.2020广色域、Dolby Vision、旋转/非方形像素素材需先显式规范化或走上游原素材准备，当前扩展拒绝静默处理；上游原色彩能力保留。

## 声音与证据

旁白可来自人工录音或选定TTS，原素材音轨默认丢弃，旁白独立绑定；不会拿空壳人物视频满足真人导入要求。服务metadata须匹配音频哈希，字幕使用真实返回时间，文字作为字面文本显示。TTS由独立scripts/tts.mjs显式调用，不会因create或render自动计费。

配乐需已有授权与足够时长，license沿用输入合同；新适配拒绝短音乐静默循环。工程保存原始音频、真实元数据与许可副本，并使用上游mix处理48kHz声音。

product.json记录原始文件SHA、真实源区间/PTS、冻结与恢复映射、旁白起点、字幕、素材副本与上游提交。正式导出必须产生真实上游manifest，check-export再次核对身份、帧钟、色彩标记和完整解码。ADU-LICENSE.txt、ADU-THIRD-PARTY.md及原品牌通知随可编辑工程保留。

本场景技术样本已导出，不等于全部上游宏场景已支持无人物；原模板可通过video-adu/adu完整使用，不能绕过其素材与动作窗口合同。真实内容、字体、细字、配音自然度及完整连续声画仍需逐片审核。