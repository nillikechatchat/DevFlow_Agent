---
name: verify
description: "质量保障门禁，对变更进行验证与归档"
author: agentteams-toolkit
version: 0.1.0
---

# verify Skill

## name

- 类型：string
- 值：`verify`

## role

- 类型：string
- 值：`qa`
- 说明：由 QA Worker 执行。

## triggers

- 类型：string[]
- 值：
  - 变更进入归档前阶段
  - 归档操作被请求

## inputs

- 类型：string[]
- 值：
  - 变更的 Issue、PR 与 typed comment 记录
  - CI / 单测 / lint 检查结果
  - 审批记录（L3 高风险动作的 Human 审批状态）

## outputs

- 类型：string[]
- 值：
  - `verify --json` 输出，六字段结构：
    - `change`：变更标识
    - `status`：`PASS` 或 `FAIL`
    - `blocking_questions`：未解决的阻塞 QUESTION 数量
    - `traceability`：`ok` 或 `broken`（需求→设计→代码行链路）
    - `p0_p1_open`：未闭合的 P0/P1 REVIEW findings 数量
    - `pr_checks`：`passed` 或 `failed`（CI / 单测 / lint）
    - `reasons`：判定原因列表
  - 判定边界：阻塞 QUESTION 未解、可追溯性断裂、P0/P1 未闭合、PR 检查未过、高风险无审批，任一命中即 `FAIL`，不允许归档

## permissions

- 类型：string[]
- 值：
  - 只读访问 Issue、PR、CI 与审批记录
  - 真实凭据：空（经 Higress 网关 consumer token 转发）
