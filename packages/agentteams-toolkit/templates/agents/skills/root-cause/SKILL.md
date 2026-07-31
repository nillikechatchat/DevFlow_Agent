# root-cause Skill

## name

- 类型：string
- 值：`root-cause`

## role

- 类型：string
- 值：`architect`
- 说明：由 Architect Worker 执行。

## triggers

- 类型：string[]
- 值：
  - Proposal issue 通过 Human 评审
  - QUESTION 决策清单已获得 ANSWER

## inputs

- 类型：string[]
- 值：
  - Proposal issue 的内容与评审结论
  - 代码与日志上下文（只读查询）
  - 已确认的 ANSWER 决策记录

## outputs

- 类型：string[]
- 值：
  - Design issue：包含根因分析
  - 验收标准：可测试、可度量的交付判定条件，供后续 verify 消费

## permissions

- 类型：string[]
- 值：
  - 只读访问代码、Issue 与日志
  - 设计文档编写权限
  - 真实凭据：空（经 Higress 网关 consumer token 转发）
