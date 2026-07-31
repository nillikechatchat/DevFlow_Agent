# PROCESS DAG 调度契约

本文档定义 DevFlow_Agent 工具包中实现阶段 PROCESS DAG 的节点、依赖、并行判定与状态同步规则，覆盖需求 R5 的 4 条验收标准。

## PROCESS 节点模型

每个 PROCESS 节点由适配的 Agent 拥有，字段如下：

```json
{
  "id": "process-B",
  "name": "修复后端",
  "owner": "developer-worker",
  "dependencies": [],
  "parallel": ["process-C"],
  "status": "RUNNING",
  "evidence": "https://github.com/.../pull/45"
}
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 节点唯一标识 |
| name | string | 节点名称 |
| owner | string | 拥有节点的 Agent（Worker） |
| dependencies | string[] | 依赖的 PROCESS 节点 id |
| parallel | string[] | 可并行的 PROCESS 节点 id |
| status | string | PENDING / RUNNING / COMPLETED / FAILED |
| evidence | string | 产出证据链接 |

## 调度规则

1. **节点归属**：每个 PROCESS 节点分配给适配的 Agent 拥有，实现即 agent DAG。
2. **并行判定**：两个 PROCESS 节点写域不重叠时允许并行执行；写域重叠的节点按依赖顺序执行。
3. **依赖执行**：PROCESS 节点在全部依赖节点完成后执行。
4. **无环约束**：PROCESS 依赖关系构成有向无环图，调度器检测到环时阻断。
5. **状态同步**：节点状态变化以 typed comment 同步到 issue，供 change board 展示进度。

## 并行判定示例

```text
PROCESS·A 诊断日志（developer-worker）
  └─▶ PROCESS·B 修复后端（developer-worker）
  └─▶ PROCESS·C 前端校验（developer-worker）
         └─▶ PROCESS·D 补充单测（qa-worker）
```

- B 与 C 写域不重叠，并行执行。
- D 依赖 B/C 结果，阻塞等待两者完成后执行。

## typed comment 同步

状态变化事件同步到 issue：

| 事件 | typed comment 类型 |
| --- | --- |
| 节点创建 | PROCESS |
| 节点状态变化 | PROCESS |
| 任务单元创建/更新 | TASK |

## 验收映射

| 验收标准 | 契约落点 |
| --- | --- |
| R5-1 每个 PROCESS 分配给适配 Agent | 调度规则 1 |
| R5-2 写域不重叠允许并行 | 调度规则 2 |
| R5-3 依赖完成后执行 | 调度规则 3 |
| R5-4 状态变化以 typed comment 同步 | 调度规则 5 与 typed comment 同步章节 |
