# 视频清单契约 v1

清单相对目录就是消费项目根；CLI从任意cwd工作，所有素材/许可/输出路径须位于该目录内，拒绝`..`、绝对路径及逃出项目的symlink。TTS的显式env文件是单独配置入口，不受媒体路径限制。

## 顶层

| 字段 | 含义 |
|---|---|
| version | 1，清单契约版本 |
| name | 项目名称（运行时不会擅自写入画面） |
| width/height | 偶数像素，320–4096/240–4096 |
| fps | 1–60整数，默认模板24 |
| inset | 四边安全留白，字幕另保留底部阅读带 |
| background | 六位RGB颜色 |
| output | 新版本MP4，例如deliverables/product-v1.mp4 |
| clips | 顺序播放的片段/静帧，最多100项 |
| narration | 音频及成片起点，可空数组 |
| music | 可选配乐与许可，连续loop到全片并侧链压低 |

## 片段

mode取play、freeze、image；source为本机相对路径，duration为正数。play/freeze的in是源视频秒数；image是PNG/JPEG/WebP。实际时长向上对齐帧，播放和冻结源时间须可用。

crop可选，声明源素材x/y/width/height，先核对包含所需真实内容，再使用完整contain。工具不放大源图、不重画字段，不能恢复源页面未录到的内容。素材自身已经裁切时，几何通过不代表业务全貌。

```json
{"mode":"freeze","source":"assets/recording.mp4","in":4,"duration":3}
```

恢复片段用同一source和in=4；冻结单独抽原帧，不用浏览器seek首帧当证据。中间片用FFV1 RGB，最终H.264/yuv420p仍是有损交付；真实操作源播放速度1，不自动重映射新旁白。

## 旁白与字幕

```json
{"source":"assets/voice/intro.mp3","at":0.2,"metadata":"assets/voice/intro.json"}
```

metadata是TTS真实返回JSON，必须20000000、sha256匹配音频，captions为合法的真实时间。没有metadata只合音频不编字幕。旁白不可重叠或超过片长，需调用者延长定格区间。字幕在保留的底部区域显示，不执行模型生成HTML或ASS样式指令。

## 配乐许可

music含source、license，可选gain 0–1。license文件声明`sha256`（音乐实际哈希）、`sourceUrl`（来源）、`usage`（当前授权用途）、`approved:true`（已经人为核对许可）。CLI只验证完整性，不替代法律许可判断，也不下载音乐。

## 生成与失败

CLI会在sessions/<随机ID>/保留清单快照、冻结原帧、无损中间片、ASS字幕、最终临时片和verification.json，成功编码后独占发布output；既有输出拒绝覆盖。失败保留过程用于排查，未发布不得声称生成成功。额外磁盘开销来自无损中间片。

裁边/字幕检查、源输入SHA256与完整解码是技术门禁；声音自然度、创意、观看尺寸下清晰度及完整带声音播放需要另行审核。当前仅顺序拼接，不宣称支持任意Canvas动效模板、自动业务录屏或全自动创作。