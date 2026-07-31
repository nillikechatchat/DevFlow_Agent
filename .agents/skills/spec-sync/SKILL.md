---
name: spec-sync
description: "需求规格与任务清单同步，确保 EARS 规范一致"
author: agentteams-toolkit
version: 0.1.0
---

# spec-sync Skill

## name

- 类型：string
- 值：`spec-sync`

## role

- 类型：string
- 值：`orchestration`
- 说明：由编排层（Manager / TeamLeader）执行，负责跨阶段同步。

## triggers

- 类型：string[]
- 值：
  - issue-spec 阶段切换（Proposal → Design → Implement）
  - typed comment 产生或状态变化

## inputs

- 类型：string[]
- 值：
  - 当前阶段状态与目标阶段
  - 各阶段产生的 typed comment（SPEC / QUESTION / ANSWER / TASK / PROCESS / REVIEW / VERIFY）

## outputs

- 类型：string[]
- 值：
  - 阶段切换指令：驱动各 Worker 进入对应阶段
  - typed comment 同步：确保 change board 与 Issue 呈现一致的状态与进度

## permissions

- 类型：string[]
- 值：
  - 协调能力：读全部阶段上下文、写 typed comment 同步记录
  - 真实凭据：空（经 Higress 网关 consumer token 转发）
