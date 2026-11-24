---
name: video-configure
description: "为统一视频工具配置真人口播或产品介绍项目的素材、画幅、字幕、声音、输出与可用运行时，支持跨项目接入。"
---

# 配置消费项目

1. 读取工具[README](../../../README.md)与[项目契约](../../../docs/project-contract.md)，确认消费项目目录、输出目录与获准素材。
2. 确认本次真人口播/产品介绍类型及实际可用运行时；类型已明确就不重复问。共享工具优先采用标准Skill目录或已验证的官方Agent Plugin；已有0.1.0外部路径作为兼容配置保留，切换前验证新入口，避免同名双份。
3. 工具根从本Skill位置向上三级确定，先运行`node "<TOOL_ROOT>/src/cli.mjs" doctor`、`doctor --upstream`。真人基础工程用`create presenter "<new-project>"`；完整包保留原Adu的macro/auto流程并通过`adu ...`调用。产品路线按[场景合同](../../../docs/product-scenario.md)准备清单，`create product "<project.json>" "<new-project>"`创建无人物工程。不改固定upstream文件，依赖装工具根；原0.1.0 init仅作历史兼容。
4. 素材放消费项目assets，过程放sessions，独立成片放deliverables；填写name/画幅、片段时间与旁白。init后的默认素材占位尚不可渲染。
5. 本机声音配置可用自己的Git忽略env，也可依工具profiles模板创建`.local.env`；只引用，不复制其他项目密钥。
6. 按路径和实测时长运行validate；只有成功后进入video-create。初始化不触发TTS或真实业务接口。