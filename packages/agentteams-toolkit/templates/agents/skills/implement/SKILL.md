---
name: implement
description: "根据需求与设计文档实施代码变更，遵循过程 DAG"
author: agentteams-toolkit
version: 0.1.0
---

# implement Skill

## name

- 类型：string
- 值：`implement`

## role

- 类型：string
- 值：`developer`
- 说明：由 Developer Worker 执行。

## triggers

- 类型：string[]
- 值：
  - PROCESS DAG 节点被调度
  - 所属节点的全部依赖已完成

## inputs

- 类型：string[]
- 值：
  - Design issue 中的根因与验收标准
  - 被分配的 PROCESS DAG 节点定义（id/name/dependencies）
  - 共享文件系统（MinIO）中的协作上下文

## outputs

- 类型：string[]
- 值：
  - 代码变更：以 PROCESS 节点为单元实施
  - 变更 PR：包含可被 review 与 verify 消费的证据
  - TASK typed comment：任务单元进度同步

## permissions

- 类型：string[]
- 值：
  - 写代码（L1 草稿级别，自动执行并记录）
  - 提交 PR 需 Human 房间确认（L2）
  - 真实凭据：空（经 Higress 网关 consumer token 转发）
