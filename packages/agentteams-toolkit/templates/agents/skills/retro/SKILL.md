# retro Skill

## name

- 类型：string
- 值：`retro`

## role

- 类型：string
- 值：`retro`
- 说明：由 Retro Worker 执行。

## triggers

- 类型：string[]
- 值：
  - 变更通过 verify 门禁并完成归档

## inputs

- 类型：string[]
- 值：
  - 已归档变更的 Issue、PR 与 verify 结果
  - 全链路的 typed comment 记录

## outputs

- 类型：string[]
- 值：
  - durable spec PR：将本次经验与可复用规范归档入仓
  - 沉淀的经验成为后续检索复用的知识源

## permissions

- 类型：string[]
- 值：
  - 写 spec 仓库（spec 归档仓库）
  - 真实凭据：空（经 Higress 网关 consumer token 转发）
