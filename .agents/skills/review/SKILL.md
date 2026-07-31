# review Skill

## name

- 类型：string
- 值：`review`

## role

- 类型：string
- 值：`reviewer`
- 说明：由 Reviewer Worker 执行。

## triggers

- 类型：string[]
- 值：
  - 代码变更 PR 提交完成
  - 变更 PR 进入评审阶段

## inputs

- 类型：string[]
- 值：
  - 变更 PR 的 diff 与关联 Design issue
  - 实现阶段的 PROCESS DAG 上下文

## outputs

- 类型：string[]
- 值：
  - REVIEW typed comment：行级评审发现，按严重级别标注 P0 / P1 / P2
  - P0/P1 findings 清单：供 verify 门禁消费，未闭合的 P0/P1 不允许合并

## permissions

- 类型：string[]
- 值：
  - 只读访问代码与 PR
  - 提交 review 评论（仅 review 写权限）
  - 真实凭据：空（经 Higress 网关 consumer token 转发）
