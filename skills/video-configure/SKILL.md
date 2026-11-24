---
name: video-configure
description: "配置本地视频制作工具与消费项目，包括运行环境、素材、画幅、字幕、声音、输出和配音配置。"
---

# 视频配置

必须读取并完整执行[配置流程](../../.github/skills/video-configure/SKILL.md)，相对路径以被读取文件自身位置解析。

工具根为本文件上两级目录。首次安装按工具README执行npm ci及setup-runtime，再运行doctor和doctor --upstream；只在用户授权时安装依赖。TTS密钥由使用者在本机配置，不随GitHub仓库分发。消费项目素材、过程和成片放在消费项目自己的目录。