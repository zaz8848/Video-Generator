---
project_type: local-video-generator
comm_mode: vscode-only
init_date: 2026-11-14
---

# 工具维护入口

- 接手先读PROJECT_BLUEPRINT.md，再读PROJECT_STATUS.md；创建文件先查WORKSPACE_MAP.md。
- 本工具是可被消费项目引用的Skill＋Instruction＋CLI，不复制客户业务代码、凭据或私有媒体；公开上游示例资产和许可完整保留，保存不等于新增生产复用授权。
- 0.2.0已整合固定Adu GitHub源码基线，先读docs/merge-report-20261115.md；双场景共存，上游1042原文件按锁校验，扩展放extensions/src，不直接改upstream。0.1兼容命令不删；个人.motion/Plugin/全模板真人声画未验收不得冒称完成。
- 原Adu工作流由video-adu和adu完整透传，不能因统一入口裁减模板/历史版本/测试/许可。运行依赖放.runtime，约定链接不计入原始资产；不得直接在vendor运行会重写源锁文件的setup。
- 统一Skill是上游方法的路由和薄适配，不是替代说明。真人/产品新建或重新创作均先走video-adu的原版表达、文案适配、编舞、声音及重复检查，再选择模板/参考原创/工程命令；只保留文件或命令不算方法接入。局部修订保留未受影响内容，不能把保持音色理解成复用旧稿；实际采用、未采用原因与验证范围留消费项目，不将规则修改冒称成片或新会话已验收。
- 参数/模板与运行时分离；所有项目媒体路径以项目清单目录为根，产物留消费项目，旧产物不覆盖。
- 手工改码用apply_patch；中文文件用UTF-8；稳定规则放Instruction，进度和证据放STATUS。
- 验证npm test与CLI离线集成；真实业务页面操作、网络TTS及额外付费需显式授权，秘密由本机配置读取。
- 不擅自commit/push，不修改外部消费项目既有视频，不将技术播放成功写成人的创作认可。