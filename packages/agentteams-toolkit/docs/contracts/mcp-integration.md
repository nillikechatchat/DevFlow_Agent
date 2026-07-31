# MCP 工具集成契约

本文档定义 DevFlow_Agent 工具包中 Worker 对 GitHub / GitLab / 日志平台的 MCP 工具接入契约，覆盖需求 R3 的 5 条验收标准。

## 契约红线

- Worker 永远不直接持有真实凭据，调用一律经 Higress AI Gateway，仅持网关签发的 consumer token。
- MCP Server 由网关统一托管，声明式挂载到 Worker / Manager / Team CRD，配置版本化、变更可审计、可回滚。

## 工具清单

### GitHub MCP

- 接入方式：经 code-provider bridge 对接 GitHub。
- 能力：Issue / PR / Review / CI 数据读写。
- 权限：读取 Issue、读取 PR、提交 review。写操作仅限于 review 提交，不授予仓库其他写权限。
- 凭据：GitHub PAT 仅存于 Higress 网关。

### Code Host MCP

- 接入方式：provider-neutral 接入，支持 GitLab 与内部代码托管。
- 能力：Issue / MR / 代码检索。
- 权限：只读；返回的代码证据绑定版本（revision-bound）。
- 凭据：对应平台令牌仅存于 Higress 网关。

### Log MCP

- 接入方式：经网关托管连接日志平台。
- 能力：日志查询与检索。
- 权限：只读，作为根因定位的输入。

### Higress 网关

- 角色：LLM 代理 + MCP Server 托管 + 凭据托管。
- 约束：模型密钥与代码托管平台令牌不出网关；Worker 仅持 consumer token。

## 声明式 MCP 挂载契约

MCP 服务器配置声明于 Worker / Manager / Team CRD 上，示例：

```yaml
spec:
  mcpServers:
    - name: github
      url: https://higress.example.com/mcp/github
      transport: sse
      consumerTokenRef: gateway-consumer
```

挂载规则：

1. 配置随 CRD 版本化，变更可审计。
2. 回滚通过 CRD 版本回退实现。
3. 同一 MCP Server 可被多个 Worker 复用。

## 验收映射

| 验收标准 | 契约落点 |
| --- | --- |
| R3-1 GitHub 经 bridge、权限限于读 Issue/PR 与提交 review | 工具清单 GitHub MCP 行 |
| R3-2 Code Host 返回 provider-neutral 绑定版本证据 | 工具清单 Code Host MCP 行 |
| R3-3 Log MCP 只读 | 工具清单 Log MCP 行 |
| R3-4 声明式 MCP 挂载版本化可回滚 | 声明式 MCP 挂载契约章节 |
| R3-5 Worker 仅持 consumer token | 契约红线章节 |
