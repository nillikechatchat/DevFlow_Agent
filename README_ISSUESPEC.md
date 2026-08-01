# issue-spec Server 部署指南

## 问题说明

Dashboard 的 "Spec 工作流" 和 "变更看板" 模块依赖 issue-spec server（HTTP API，默认端口 8091）。当前环境未配置该服务，导致以下错误：

```
无法加载 issue-spec 变更列表，请确认 issue-spec server 已配置
```

## 解决方案

### 方案一：使用 Mock Server（本地开发）

用于本地测试 Dashboard UI，无需真实 issue-spec 服务：

```bash
# 启动 mock server
node mock-issue-spec-server.js &

# 设置环境变量指向 mock server
export ISSUESPEC_SERVER_URL=http://localhost:8091

# 启动 Dashboard
npm run dev
```

Mock server 提供以下端点：
- `GET /changes` - 变更列表（2 条示例数据）
- `GET /changes/:id` - 变更详情
- `GET /changes/:id/timeline` - typed comment 时间线
- `GET /changes/:id/dag` - PROCESS DAG 节点
- `GET /changes/:id/tasks` - 任务列表（空数组）
- `GET /changes/:id/verify` - verify 结果
- `GET/POST /changes/:id/approvals` - 审批记录
- `POST /gateways/verify` - 触发 verify

### 方案二：部署真实 issue-spec Server

需要独立部署 issue-spec server（服务地址由团队提供）。配置方式：

```bash
# 在 .env 或 docker run 中设置
ISSUESPEC_SERVER_URL=http://your-issue-spec-server:8091
```

### 方案三：禁用 Spec 工作流模块

若暂时不需要 issue-spec 功能，可修改 `src/components/dashboard/nav-items.ts` 隐藏该导航项。

## 默认配置

- 服务端默认地址：`http://issuespec-server:8091`（Kubernetes service name）
- 环境变量优先级：`ISSUESPEC_SERVER_URL` > `ISSUESPEC_API_URL` > 默认值
- 代理超时：10 秒

## 相关文件

- `mock-issue-spec-server.js` - Mock 服务器实现
- `src/app/api/issuespec/` - Dashboard 代理路由
- `src/lib/issuespec-api.ts` - API 客户端
