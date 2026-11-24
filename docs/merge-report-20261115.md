# Video-Generator 0.2.0 合并报告

日期：2026-11-15。结论：**已完成固定GitHub上游基线的源码与功能入口级整合，真人口播和产品介绍均有实际导出验证；没有删除上游资产。** 这不等于所有候选模板已在Windows完成真人声画验收，也不包含个人.motion包或Agent Plugin安装。

本报告唯一维护版本位于Video-Generator的docs目录；AEON docs/history中的同名内容是交付副本。

## 1. 合并方式与来源

以上游[adunext/adu-motion-video](https://github.com/adunext/adu-motion-video)为主体，固定提交`4a52ae2cff542cfb0bfcf6e93e5120c55d0110cf`、Skill版本3.14.1-rc.1。1042文件完整放入upstream/adu-motion-video，不是只抄几个动画，也不是把上游改成旧clip拼接器。

原始文件由upstream.lock.json记录Git blob SHA，调用上游前后复核；可用`node src/cli.mjs upstream verify`或`node scripts/audit-merge.mjs`重新检查。逐文件账本为docs/upstream-assets.json，1042行资产均标记retained-byte-identical。

基线原文件未编辑；新增的.venv-windows本机链接指向工具.runtime/adu-python，仅满足上游约定的依赖查找，不计为原始资产。此处“只读基线”是维护策略与哈希门禁，不冒充操作系统沙箱或强制只读权限。

## 2. 上游资产保留清单

| 原目录 | 文件数 | 处理结果 |
|---|---:|---|
| 根入口/README/SKILL/AGENTS/许可证/依赖声明 | 10 | 全部原字节保留 |
| adaptation-profiles | 22 | 全部版本保留 |
| adapters | 34 | 全部保留 |
| agents | 1 | 保留 |
| assets | 48 | 字体/示例/媒体及来源信息全部保留 |
| docs | 20 | 历史验收、能力边界与报告全部保留 |
| examples | 33 | 全部示例保留 |
| packs | 699 | 13个pack目录及全部历史/候选/稳定版本保留 |
| references | 35 | 目录、声音、字幕、兼容、规则等全部保留 |
| scripts | 62 | 全部原入口、规划、构建、混音、导出、验收程序保留 |
| template | 14 | 原生基础工程全部保留 |
| tests | 61 | 上游全部测试保留，没有删掉未运行的测试 |
| third-party | 3 | 全部依赖许可/NOTICE保留 |
| **合计** | **1042** | **删除0，修改上游原文件0** |

13个pack目录：anim3、anim4、classic-performance、continuous-performance、dark-3d-showcase、doubao-console-performance、editorial-performance、kinetic-performance、paper-balance、paper-ball-performance、stage-performance、vibrant-color-performance、vivid-sticker-performance。目录数量不是稳定模板数量，原candidate/experimental标记没有擅自晋级。

上游全部pipeline命令通过`node src/cli.mjs adu <command> ...`原样访问，没有命令名称白名单裁减。macro/auto规划与构建、局部重配、SFX、audio/mix、preview、repair、render、check等均保留。新增video-adu Skill直接读取原版SKILL及其目录，原工作流不被简化的统一入口遮蔽。

## 3. 我方新增与实际改动

| 层 | 内容 |
|---|---|
| 统一入口 | create presenter/product、export、check-export、adu原命令透传与资产校验 |
| 真人口播兼容 | 调原new创建工程；只对新工程的精确空talkmap stub规范化，使原import可接；增加兼容收据和许可说明 |
| 产品介绍 | 无需人物视频的独立场景；原视频PTS、原图、完整contain、准确冻结恢复、独立旁白/字幕，沿用上游Scene/renderAt及正式导出器 |
| 语音提供器 | 原官方TTS脚本保留；显式选音、有限字数、真实字幕/用量/哈希，不将TTS强制用于真人原声 |
| 工程证据 | product.json保存源SHA/PTS/冻结映射/声音与许可；正式MP4有上游原manifest，调用原verify_delivery.py核对 |
| 本机依赖 | 工具根安装与上游一致的Acorn8.15.0、Playwright Core1.58.2；隔离Python环境安装上游声明依赖，通过约定链接接入 |
| 入口说明 | video-create/configure/review对齐双场景实际命令，新增video-adu；项目仍保留自己的品牌、素材、凭据与输出 |

新增核心文件：src/upstream.mjs、src/presenter.mjs、src/product.mjs、extensions/product-runtime.js，以及资产导入/审计/运行环境脚本和对应测试。根CLI/package/锁文件/说明/目录地图已更新；这些是我方适配，不是对上游模板动刀。

## 4. 舍去了什么，没舍弃什么

**文件删除：0个上游文件。** 没有因为“暂时用不上”就删旧版本、适配器、模板、测试、字体通知或媒体示例。

- 旧0.1.0自建整片渲染器不再是新整合路线的主引擎；src/media.mjs、schema、模板和原init/validate/render/verify命令全部保留，4项旧行为测试继续通过。
- 新产品路线拒绝隐式循环不足全片的配乐，遵守上游已有音乐原则；旧CLI的历史行为未强行删除，便于重放旧工程。
- AEON专用品牌、固定台词、素材、选音认可、已有V22工程不复制进通用工具，仍留在AEON原处；没有删除或覆盖它们。专用架构/Canvas片段没有冒称已经变成通用模板。
- 原Adu人物、声音、音乐、作品墙、Circle品牌、字体/演示等资产完整保留相关说明。保留文件不授予额外商用、再分发或冒充人物身份的权利。
- 没有将全部模板强改成纯产品片，也没有让产品片伪造人物来满足原口播接口。两条路线共存，按各自合同制作和验收。

## 5. 验证结果与证据

- 最终本地集成测试：**13/13通过**，不是声称跑完并通过上游61个测试文件或所有模板。
- 真人口播链路：合成图像/音调组成的技术探针，原生new→import→export，1.2秒、10fps、12帧、1920×1080，音轨48kHz；导入PCM与源解码一致，重复目标拒绝。不是人脸/口型效果认可。
- 产品链路：真实上游导出的无人物技术片，1.8秒、10fps、18帧、320×240；旁白、字幕字面文本、防注入、四角、准确PTS冻结/恢复、声音和真实manifest验证通过。另有480×320单图片与分数PTS检查。
- HDR/广色域输入门禁、短音乐拒绝、输出/路径保护、原图哈希、上游修改/缺失检测通过。
- 原上游doctor：Python3.14.5、Node24.16.0、FFmpeg/ffprobe9.0.1、Playwright1.58.2、本机Chrome和音频/对齐依赖均通过。包未安装之前doctor的MISSING没有计为成功，补环境后重新取得通过结果。
- TTS离线SSE/字幕自检通过，networkCalled=false，本次没有真实配音请求和费用。
- 最终资产审计：1042原文件全部Git blob SHA匹配。资产账本SHA256：`8cf083652581ec513d5fd4a6d838ea5e20bc4700092c9bdcbb7803b632f98eaf`。

证据位置（相对工具根）：

```text
docs/upstream-assets.json
sessions/upstream-preservation.json
sessions/runtime-setup.json
sessions/tests-1794680632911/integration-results.json
sessions/presenter-contract-Sr0k8t/evidence.json
sessions/product-1794680632912-50184/产品 合成 contract/evidence.json
```

失败过程如实保留：首次Windows ESM测试导入路径格式不对，修正为file URL后校验成功；声明HDR的合成素材实际只保留BT.2020标签，按广色域同样需规范化补齐门禁并重跑通过；这些不是上游资产损坏，也没有把失败结果写为通过。

## 6. 尚未接入或未验收（不是已删除）

- 个人.motion包、个人交付Key/签名/解密与新格式运行时：本次是固定GitHub旧Skill源码基线，不是MotionGit个人包整合。没有自写解释器绕开其权限。
- 官方Agent Plugin安装和新会话发现：未实施，原注册兼容方式保留，未擅自迁移全局Skill。
- 上游全部模板在Windows、长片、多种字体与真实人物的连续声画验收：未完成，稳定范围仍按原记录。
- 产品场景套用任意真人宏模板的自动转换：未实现；模板资产完整可达，但不能因此宣称每个模板已支持无人物。
- 新产品扩展的HDR/广色域、旋转和非方形像素原素材：先走上游明确准备，未声称直接任意支持。
- CDP/screencast原始PNG采集清单自动导入、自动操作业务页面录制、既有AEON完整片迁移：未实施，原始资料均未删除。
- 本轮技术片采用合成媒体，未用源作者示例人物/声音冒充新生产素材；主观自然度、细字与真人效果仍逐片审核。

## 7. 后续如何复查

```powershell
node src/cli.mjs upstream verify
node scripts/audit-merge.mjs
node src/cli.mjs doctor --upstream
npm test
```

调用和运行环境说明见工具README。本轮无Git commit/push，无上游PR，无业务接口调用，未复制客户密钥。源码级整合已经落地，尚未验证的内容如上单列，不以“全部保留”替代“全部可无条件使用”。