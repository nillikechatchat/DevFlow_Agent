# DevFlow_Agent

DevFlow_Agent 是一套 Spec-First 研发管控系统。它以 AgentTeams 协作模型编排研发角色，并以 `issue-spec` 的可验证交付流程连接 Issue、日志、代码、CI 与 Pull Request，形成可回放、可审计、可沉淀的工程闭环。

## 解决的问题

企业缺陷修复常跨越 Issue、日志、代码和 CI，根因定位高度依赖资深工程师。传统编码 Agent 缺少可信验收过程，经验也难以沉淀为可复用资产。

DevFlow_Agent 将研发过程组织为具备明确输入、产出与验收标准的协作流：每个阶段留下证据，关键动作纳入审批，验证结果决定流程是否闭环。

## 核心能力

| 能力 | 说明 |
| --- | --- |
| 多角色协作 | TeamLeader 编排 Triage、Architect、Developer、Reviewer、QA 与 Retro Worker。 |
| Spec-First 流程 | `issue-spec` 以提案、实施、验证三个阶段驱动交付，约束上下文、产出和验收。 |
| 可验证验收 | `issue-spec verify` 校验阻塞问题、流程断链、未关闭的 P0/P1 和 PR 检查状态。 |
| 证据原生沉淀 | Issue、PR 和验证记录共同构成可追溯、可审计、可回放的交付证据。 |
| 经验资产化 | 经过验证的规范通过 durable spec PR 归档到仓库，持续复用。 |
| 人在回路 | Worker 保持零凭据运行，高风险动作需要 Human 审批。 |
| 可视化管控 | Dashboard 提供团队、Worker、基础设施、权限和协作状态的统一操作面。 |

## 研发闭环

```text
Issue / 日志 / 代码 / CI
          |
          v
TeamLeader 编排专业 Worker
          |
          v
issue-spec: 提案 -> 实施 -> 验证
          |
          v
Issue 与 PR 证据沉淀
          |
          v
durable spec PR 归档复用
```

`PROCESS` 以 DAG 方式描述可并行的协作步骤；typed comment 用于在角色之间传递结构化上下文。

## 技术基础

- Next.js 16、React 19、TypeScript 5
- Tailwind CSS 4 与 shadcn/ui
- Zustand 与 TanStack Query
- AgentTeams 协作运行时与 Matrix 通信能力
- Docker 与 Next.js standalone 部署

## 本地启动

运行环境需要 Node.js 20 或更高版本。

```bash
npm ci
npm run dev
```

开发服务默认运行在 `http://localhost:3000`。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动开发服务 |
| `npm run build` | 构建生产产物 |
| `npm start` | 启动生产服务 |
| `npm run lint` | 执行 ESLint 检查 |
| `npm run typecheck` | 执行 TypeScript 类型检查 |
| `npm test` | 执行 Vitest 测试 |

## 项目定位

DevFlow_Agent 面向需求交付、缺陷修复和持续改进场景，提供从任务输入到验收归档的研发协作基础能力。Dashboard 是该系统的二开管控面，后续可与团队的 AgentTeams、Nacos 治理和交付流程集成。

## 仓库

https://github.com/nillikechatchat/DevFlow_Agent
