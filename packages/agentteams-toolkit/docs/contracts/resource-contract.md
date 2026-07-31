# 声明式资源契约

本文档定义 DevFlow_Agent 工具包中 Worker / Team / Human / Manager 的声明式资源字段，覆盖需求 R4 的 5 条验收标准。资源以 YAML 表达，可版本化、可回滚，部署到任意 AgentTeams 集群生成行为一致的角色实例。

## Worker

```yaml
apiVersion: agentteams.io/v1
kind: Worker
metadata:
  name: qa-worker
spec:
  runtime: openclaw
  role: qa
  spec:
    env:
      SKILLS_API_URL: nacos://market.agentteams.io:80/public
  soul: |
    你是质量保障 Agent，负责 verify 门禁。
  token:
    type: consumer
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| name | string | 角色唯一标识 |
| runtime | string | openclaw / copaw / hermes |
| role | string | triage / architect / developer / reviewer / qa / retro |
| spec.env | map | 注入运行环境变量 |
| soul | string | 可选 SOUL.md 设定人格 |
| token.type | string | 恒为 consumer，仅消费令牌，无真实凭据 |

## Team

```yaml
apiVersion: agentteams.io/v1
kind: Team
metadata:
  name: devflow-team
spec:
  members: []
  workers: [triage-worker, architect-worker, developer-worker, reviewer-worker, qa-worker, retro-worker]
  humans: [dev-lead]
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| name | string | 研发闭环名称 |
| members | string[] | 成员列表 |
| workers | string[] | 关联 Worker |
| humans | string[] | 关联 Human |

## Human

```yaml
apiVersion: agentteams.io/v1
kind: Human
metadata:
  name: dev-lead
spec:
  permission: high
  room: "#devflow-project"
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| name | string | 研发负责人标识 |
| permission | string | 权限级别（low / medium / high） |
| room | string | 所属 Matrix 房间 |

## Manager

```yaml
apiVersion: agentteams.io/v1
kind: Manager
metadata:
  name: devflow-leader
spec:
  runtime: openclaw
  modelConfig:
    model: devflow-leader
    temperature: 0.2
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| name | string | 管理器标识 |
| runtime | string | openclaw（默认）/ copaw / hermes |
| modelConfig | map | 模型配置 |

## 契约要点

- 声明式：Worker / Team / Human / Manager 均为 YAML 资源，可版本化、可回滚。
- 最小权限：Worker 仅持 consumer token，真实密钥在 Higress 网关。
- 可复现：同一资源在任意 AgentTeams 集群生成相同角色实例。
- 可审计：资源与 Matrix 房间记录构成完整行为溯源。

## 验收映射

| 验收标准 | 契约落点 |
| --- | --- |
| R4-1 Worker 支持六字段 | Worker 章节 |
| R4-2 Team 支持四字段 | Team 章节 |
| R4-3 Human 支持三字段 | Human 章节 |
| R4-4 Manager 支持两字段 | Manager 章节 |
| R4-5 同资源跨集群行为一致 | 契约要点-可复现 |
