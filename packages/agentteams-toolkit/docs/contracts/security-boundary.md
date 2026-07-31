# 安全边界契约

本文档定义 DevFlow_Agent 工具包的风险动作分级（L0-L3）、零凭据与强制审批边界，覆盖需求 R6 的 5 条验收标准。

## 风险动作分级

| 等级 | 动作范围 | 执行方式 | 凭据 |
| --- | --- | --- | --- |
| L0 | 只读：search / read / 日志查询 | 自动执行 | consumer token |
| L1 | 草稿：PROCESS 内改码 | 自动执行 + 记录 | consumer token |
| L2 | 提交 PR | 需 Human 在房间确认 | consumer token |
| L3 | 合并 / 发布 / 删分支 | 强制 Human 审批（tool guard approvals） | consumer token |

## 安全边界三支柱

### 零凭据

- Worker 仅持 consumer token。
- GitHub PAT 与模型密钥只在 Higress 网关。
- 任意 Worker 资源 `token.type` 恒为 consumer。

### 最小权限

- MCP Server 经网关托管，企业级零凭据暴露。
- 各 Skill 的 permissions 字段声明只读或受限写权限。

### 强制审批

- L3 高风险动作在 Dashboard Chat 以 tool guard approvals 拦截。
- 缺失 Human 审批记录时禁止合并 / 发布。

## 审批与审计

- 审批事件（批准 / 拒绝）写入审计记录，保留完整回放链路。
- 每步动作在 Issue / PR / Matrix 房间留痕。

## 验收映射

| 验收标准 | 契约落点 |
| --- | --- |
| R6-1 L0 只读自动执行并记录 | 风险动作分级表 L0 行 |
| R6-2 L1 草稿自动执行并记录 | 风险动作分级表 L1 行 |
| R6-3 L2 提交 PR 需房间确认 | 风险动作分级表 L2 行 |
| R6-4 L3 强制审批 | 风险动作分级表 L3 行与强制审批章节 |
| R6-5 凭据仅存于 Higress 网关 | 零凭据章节 |
