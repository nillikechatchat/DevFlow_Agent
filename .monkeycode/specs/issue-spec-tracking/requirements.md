# Requirements Document — issue-spec-tracking

## Introduction

Issue-spec-tracking 是 DevFlow_Agent Dashboard 的二开功能模块。它在现有 agentteams-dashboard 之上构建 issue-spec 三阶段（Proposal / Design / Implement）工作流视图、PROCESS DAG 编排与并行执行面板、verify 确定性门禁结果看板，以及 Human 审批流（tool guard approvals）。模块通过与 GitHub/GitLab Issue、PR、typed comment 和 Matrix 房间同步，将研发变更的完整链路呈现给 Human，并以 Dashboard 作为统一管控面。

本模块的技术栈与现有 Dashboard 一致：Next.js 16 + React 19 + TypeScript 5，Tailwind v4 + shadcn/ui，Zustand + TanStack Query，Node.js 20+，Docker / standalone 部署，默认端口 13000。

## Glossary

- **issue-spec**：承载于 GitHub/GitLab Issue 与 PR 的规格工作流，包含 Proposal、Design、Implement 三阶段。
- **typed comment**：六类结构化上下文评论：SPEC、QUESTION、ANSWER、TASK、PROCESS、REVIEW、VERIFY。
- **verify 门禁**：归档前的确定性判定，依据阻塞问题、可追溯性、P0/P1 findings、PR 检查与审批记录输出 PASS/FAIL。
- **PROCESS DAG**：实现阶段的节点依赖图，节点由适配 Agent 拥有，无依赖节点并行执行。
- **change board**：展示 TASK 与 PROCESS 进度的面板。
- **tool guard approvals**：L3 高风险动作（合并/发布/删分支）的强制 Human 审批。
- **A2UI**：Agent 结构化消息协议，用于渲染 thinking / tool_call 等富文本消息。

## Requirements

### Requirement 1：issue-spec 三阶段工作流视图

**User Story:** AS 研发负责人, I want 在 Dashboard 查看 issue-spec 全流程, so that 每个变更的阶段与状态一目了然

#### Acceptance Criteria

1. WHEN 用户进入 Spec 工作流视图，系统 SHALL 展示 Proposal、Design、Implement 三阶段对应的 issue 列表。
2. WHEN 用户点击某个 issue，系统 SHALL 展示该 issue 的 typed comment 时间线。
3. WHEN issue 阶段发生切换，系统 SHALL 同步展示当前阶段与历史阶段。
4. WHEN 用户打开任一 typed comment，系统 SHALL 展示其类型、作者、时间与原始内容。

### Requirement 2：PROCESS DAG 编排与并行执行面板

**User Story:** AS 研发负责人, I want 查看实现阶段的 DAG, so that 并行与阻塞关系可视化

#### Acceptance Criteria

1. WHEN 用户打开实现阶段的 DAG 面板，系统 SHALL 以节点与连线展示 PROCESS 依赖关系。
2. WHEN 某 PROCESS 节点与另一节点写域不重叠，系统 SHALL 将两者标记为可并行。
3. WHEN PROCESS 节点执行完成，系统 SHALL 更新节点状态为已完成并展示产出摘要。
4. WHEN 用户点击 PROCESS 节点，系统 SHALL 展示该节点由哪个 Agent 拥有及其执行日志入口。

### Requirement 3：verify 确定性门禁结果看板

**User Story:** AS 研发负责人, I want 查看 verify 结果, so that 变更是否达到归档标准有确定性依据

#### Acceptance Criteria

1. WHEN verify 完成，系统 SHALL 展示 status（PASS/FAIL）与 reasons 列表。
2. WHEN verify 失败，系统 SHALL 展示 blocking_questions 数量、traceability 状态、p0_p1_open 数量与 pr_checks 状态。
3. WHEN 用户点击某条 verify 结果，系统 SHALL 跳转至对应 issue 或 PR 的原始证据。
4. WHEN 门禁未通过，系统 SHALL 禁止用户对该变更执行归档操作。

### Requirement 4：Human 审批流（tool guard approvals）

**User Story:** AS 研发负责人, I want 在 Dashboard 审批高风险动作, so that 合并/发布有强制人为把关

#### Acceptance Criteria

1. WHEN 系统检测到 L3 动作请求，系统 SHALL 在 Dashboard Chat 展示 tool guard approval 审批卡片。
2. WHEN 用户批准审批卡片，系统 SHALL 向 Matrix 房间发送批准记录并放行动作。
3. WHEN 用户拒绝审批卡片，系统 SHALL 向 Matrix 房间发送拒绝记录并阻断动作。
4. WHEN 审批事件发生，系统 SHALL 将事件写入审计记录并保留完整回放链路。

### Requirement 5：任务模块（Task 管理）

**User Story:** AS 研发负责人, I want 查看与跟踪任务单元, so that 变更进度可量化

#### Acceptance Criteria

1. WHEN 用户进入任务模块，系统 SHALL 展示 TASK 类型 typed comment 对应的任务单元列表。
2. WHEN 任务状态变化，系统 SHALL 在 change board 同步更新进度。
3. WHEN 任务单元与 PROCESS 节点关联，系统 SHALL 展示任务所属节点。
4. WHEN 用户点击任务单元，系统 SHALL 展示其产出证据链接。

### Requirement 6：与 AgentTeams 及 Matrix 数据同步

**User Story:** AS 研发负责人, I want Dashboard 与后端数据保持一致, so that 管控面反映真实状态

#### Acceptance Criteria

1. WHEN 数据发生变更，系统 SHALL 经 Next.js API 代理层访问 Controller 与 Matrix，不使浏览器直连后端。
2. WHEN Matrix 房间产生新消息，系统 SHALL 以轮询或长轮询方式更新房间消息流。
3. WHEN 用户查看链路证据，系统 SHALL 展示来自 Issue/PR 的原生证据，包括截图与 verify --json 输出。
4. WHEN 网络或后端不可达，系统 SHALL 展示错误提示并保留已加载的本地状态。

## Notes

- 语言约束：所有 issue 内容使用简体中文，保留 `## Requirement:` / `### Scenario:` / `**WHEN**` / `**THEN**` 结构 token。
- 本模块为 Dashboard 内部功能，复用现有代理层、hooks、store 与 A2UI 渲染能力，不引入数据库。
