# triage Skill

## name

- 类型：string
- 值：`triage`

## role

- 类型：string
- 值：`triage`
- 说明：由 Triage Worker 执行。

## triggers

- 类型：string[]
- 值：
  - Human 或系统在 Matrix 房间上报缺陷（如 `@team 处理 P1 登录超时`）
  - 创建 Proposal issue 以开启新变更

## inputs

- 类型：string[]
- 值：
  - 上报的 Issue 描述与影响范围
  - 相关日志与运行信息（只读查询）
  - 仓库与 CI 上下文

## outputs

- 类型：string[]
- 值：
  - Proposal issue：描述变更目标、范围与优先级
  - QUESTION 决策清单：需要 Human 或下游角色确认的开放决策项，以 typed comment（QUESTION）记录

## permissions

- 类型：string[]
- 值：
  - 只读访问 Issue 与日志
  - 真实凭据：空（经 Higress 网关 consumer token 转发）
