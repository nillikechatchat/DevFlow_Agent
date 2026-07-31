# 需求实施计划 — issue-spec-tracking

- [x] 1. 搭建 issuespec API 代理层
  - [x] 1.1 实现 issuespec 代理 helper 与客户端基础
    - 创建 `src/app/api/issuespec/proxy-helper.ts`，仿照 `src/app/api/agentteams/proxy-helper.ts` 实现请求转发、错误归一化、超时与 SSRF 防护
    - 配置 issue-spec server 地址环境变量与默认值
    - 对应设计 CP1 只读代理属性

  - [x] 1.2 实现变更列表与详情路由
    - 实现 `GET /api/issuespec/changes`（变更列表）与 `GET /api/issuespec/changes/[id]`（单变更详情）
    - 返回三阶段状态与 typed comment 摘要，字段与 `ChangeSummary`/`ChangeDetail` 类型一致
    - 对应需求 R1 的验收标准 1-3

  - [x] 1.3 实现时间线与 DAG 路由
    - 实现 `GET /api/issuespec/changes/[id]/timeline`（typed comment 时间线）与 `GET /api/issuespec/changes/[id]/dag`（PROCESS DAG 数据）
    - DAG 返回节点、依赖与并行标注，字段与 `ProcessNode` 类型一致
    - 对应需求 R1 的验收标准 2 与 R2 的验收标准 1-2

  - [x] 1.4 实现任务、verify 与审批路由
    - 实现 `GET /api/issuespec/changes/[id]/tasks`（任务单元列表）
    - 实现 `GET /api/issuespec/changes/[id]/verify` 与 `POST /api/issuespec/gateways/verify`（verify 结果与触发）
    - 实现 `GET/POST /api/issuespec/changes/[id]/approvals`（审批查询与提交）
    - 对应需求 R3/R4/R5 的验收标准

  - [x] 1.5 编写 API 路由单元测试
    - mock issue-spec server，测试各路由请求转发、错误归一化与超时
    - 对应设计测试策略 API 路由单测

- [x] 2. 定义数据访问层与类型
  - [x] 2.1 定义 issue-spec 数据模型类型
    - 在 `src/lib/issuespec-api.ts` 定义 `ChangeSummary`/`ChangeDetail`/`ProcessNode`/`TaskItem`/`VerifyResult`/`TypedComment` 六类接口
    - 类型字段与 API 路由返回保持一致
    - 对应设计数据模型章节

  - [x] 2.2 实现 issuespecApi 客户端
    - 仿照 `src/lib/agentteams-api.ts` 实现 `proxyRequest()` 统一封装与 `issuespecApi` 对象
    - 覆盖 changes/timeline/dag/tasks/verify/approvals 全部方法
    - 对应设计数据访问层章节与 R6 的验收标准 1

  - [x] 2.3 编写类型一致性测试
    - 校验类型字段与 mock API 返回的字段匹配，防止前后端契约漂移
    - 对应设计测试策略类型渲染测试

- [x] 3. 实现数据查询与变更 hooks
  - [x] 3.1 实现查询类 hooks
    - 实现 `use-issuespec-changes.ts`（10s 轮询）、`use-issuespec-change-detail.ts`、`use-issuespec-dag.ts`、`use-issuespec-tasks.ts`、`use-issuespec-verify.ts`
    - 使用 TanStack Query，queryKey 前缀 `issuespec`，复用 QueryProvider 配置
    - 对应需求 R1/R2/R3/R5 的展示需求

  - [x] 3.2 实现变更类 hooks
    - 实现 `use-issuespec-mutations.ts`，包含 verify 触发与审批提交 mutation
    - 复用现有模式：invalidateQueries + auditMutation + toast + addNotification
    - 对应需求 R3 的验收标准 4 与 R4 的验收标准 2-4

  - [x] 3.3 编写 hooks 行为测试
    - 测试轮询、缓存失效与错误降级行为
    - 对应设计测试策略集成测试

- [x] 4. 检查点 - 确保所有测试通过
  - 确保所有测试通过,如有疑问请询问用户

- [x] 5. 实现 Spec 工作流视图
  - [x] 5.1 实现 SpecWorkflowSection 组件
    - 实现 `src/components/dashboard/sections/spec-workflow-section.tsx`
    - 展示 Proposal/Design/Implement 三阶段 issue 列表与状态，支持阶段切换
    - 对应需求 R1 的验收标准 1、3

  - [x] 5.2 实现 TypedCommentTimeline 组件
    - 实现 `src/components/dashboard/sections/spec/typed-comment-timeline.tsx`
    - 渲染六类 typed comment（SPEC/QUESTION/ANSWER/TASK/PROCESS/REVIEW/VERIFY），展示类型、作者、时间与内容
    - 对应需求 R1 的验收标准 2、4

  - [x] 5.3 编写时间线与阶段渲染测试
    - Testing Library 测试三阶段切换与六类 typed comment 渲染
    - 对应设计测试策略类型渲染测试

- [x] 6. 实现 PROCESS DAG 面板
  - [x] 6.1 实现 ProcessDagPanel 组件
    - 实现 `src/components/dashboard/sections/spec/process-dag-panel.tsx`
    - 以节点与连线渲染 DAG 依赖关系，标注可并行节点与执行状态
    - 点击节点展示拥有 Agent 与执行日志入口
    - 对应需求 R2 的验收标准 1-4

  - [x] 6.2 编写 DAG 渲染测试
    - 覆盖空图、单节点、并行、循环引用四类样例渲染
    - 对应设计测试策略 DAG 渲染测试

- [x] 7. 实现 verify 门禁看板与审批流
  - [x] 7.1 实现 VerifyPanel 组件
    - 实现 `src/components/dashboard/sections/spec/verify-panel.tsx`
    - 展示 status（PASS/FAIL）、reasons 与 blocking_questions/traceability/p0_p1_open/pr_checks 明细
    - verify FAIL 时禁用归档操作入口
    - 对应需求 R3 的验收标准 1-4 与 CP3 门禁锁存属性

  - [x] 7.2 实现 ApprovalCard 审批卡片
    - 实现 `src/components/dashboard/sections/spec/approval-card.tsx`
    - 检测 L3 动作请求并展示 tool guard approval 卡片，支持批准/拒绝
    - 审批动作写入审计记录，保留回放链路
    - 对应需求 R4 的验收标准 1-4 与 CP4 审批留痕属性

  - [x] 7.3 编写门禁与审批逻辑测试
    - 测试 verify FAIL 时归档入口禁用、审批动作调用审计写入
    - 对应设计测试策略门禁逻辑测试

- [x] 8. 实现变更看板任务模块
  - [x] 8.1 实现 ChangeBoardSection 组件
    - 实现 `src/components/dashboard/sections/change-board-section.tsx`
    - 展示 TASK 任务单元列表与 change board 进度，支持按阶段/状态筛选
    - 任务关联 PROCESS 节点时展示所属节点与证据链接
    - 对应需求 R5 的验收标准 1-4

  - [x] 8.2 编写任务模块渲染测试
    - Testing Library 测试任务列表、筛选与进度展示
    - 对应设计测试策略类型渲染测试

- [x] 9. 导航集成与 sectionMap 挂载
  - [x] 9.1 更新导航定义
    - 在 `src/components/dashboard/nav-items.ts` 新增 `spec`（Spec 工作流）与 `tasks`（变更看板）导航项
    - 对应设计前端新增组件章节

  - [x] 9.2 挂载 sectionMap 与懒加载
    - 在 `src/components/dashboard/agent-teams-dashboard.tsx` 将 SpecWorkflowSection 与 ChangeBoardSection 以 `lazy()` 挂载进 sectionMap
    - 对应设计前端新增组件章节

  - [x] 9.3 编写集成渲染测试
    - 结合 Matrix mock 房间消息流，验证 spec section 与现有 chat 的 A2UI 富文本渲染共存
    - 对应设计测试策略集成测试

- [x] 10. 检查点 - 确保所有测试通过
  - 确保所有测试通过,如有疑问请询问用户
