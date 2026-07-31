# Requirements Document — agentteams-toolkit

## Introduction

Agentteams-toolkit 是 DevFlow_Agent 面向 AgentTeams 运行时提供的可复用工具包。它以七个规范化的 Skill（triage / root-cause / implement / review / verify / retro / spec-sync）为研发角色提供标准能力，以 MCP 工具集成契约统一 Worker 对 GitHub / GitLab / 日志平台的访问，并以声明式资源契约描述 Worker / Team / Human 的组成与权限边界。工具包以仓库 `.agents/skills` 分发，经 Nacos 治理版本与灰度，兼容 skills.sh 社区技能，保证 Worker 零真实凭据运行。

工具包服务的目标用户是 AgentTeams 集群运维者与研发流程负责人，他们需要将 DevFlow_Agent 的 Spec-First 流程平移到自己的研发环境。

## Glossary

- **AgentTeams**：多 Agent 编排运行时，以 K8s CRD（Worker / Team / Human / Manager）声明式管理 Agent 资源。
- **Skill**：绑定特定研发角色的能力单元，包含角色、触发条件、输入输出、权限与凭据范围五项契约。
- **MCP Server**：经 Higress AI Gateway 托管的模型上下文协议服务，Worker 经网关零凭据调用。
- **consumer token**：网关签发的仅消费令牌，不含真实凭据。
- **PROCESS**：issue-spec 实现阶段的 DAG 节点，由适配的 Agent 拥有。
- **Nacos Skills Registry**：企业内统一技能注册中心，负责版本与灰度治理。
- **typed comment**：承载 SPEC / QUESTION / ANSWER / TASK / PROCESS / REVIEW / VERIFY 七类结构化上下文的评论。

## Requirements

### Requirement 1：七个 Skill 的契约化定义

**User Story:** AS 研发流程负责人, I want 七个 Skill 具备统一契约, so that 每个 Skill 可被独立复用与审计

#### Acceptance Criteria

1. WHEN 工具包加载，系统 SHALL 为 triage / root-cause / implement / review / verify / retro / spec-sync 七个 Skill 提供统一的契约字段：角色、触发、输入、输出、权限与凭据范围。
2. WHEN 检查任意 Skill 的凭据范围，系统 SHALL 声明该 Skill 的真实凭据为空，调用一律经 Higress 网关转发。
3. WHEN verify Skill 被触发，系统 SHALL 输出包含 status、reasons、blocking_questions、traceability、p0_p1_open、pr_checks 六项字段的可机读 JSON。

### Requirement 2：Skill 生命周期治理

**User Story:** AS 集群运维者, I want Skill 纳入版本与灰度治理, so that 变更可回滚可追溯

#### Acceptance Criteria

1. WHEN 新 Skill 定义就绪，系统 SHALL 将其发布到 Nacos Skills Registry，注册作用域为 sts-agentteams STS。
2. WHEN Worker 拉取技能，系统 SHALL 按需获取 Nacos 中指定版本的确定性技能。
3. WHEN 技能版本发生灰度发布，系统 SHALL 记录旧版本信息以便回滚。
4. WHEN 技能来源于社区，系统 SHALL 支持从 skills.sh 按需调用且不暴露真实凭据。

### Requirement 3：MCP 工具集成契约

**User Story:** AS AgentTeams 集群运维者, I want Worker 经网关调用 MCP 工具, so that 真实凭据不进入 Worker

#### Acceptance Criteria

1. WHEN Worker 需要访问 GitHub 数据，系统 SHALL 经 code-provider bridge 调用 GitHub MCP，权限限于读 Issue/PR 与提交 review。
2. WHEN Worker 需要访问 GitLab 或内部代码库，系统 SHALL 经 Code Host MCP 返回 provider-neutral 且绑定版本的证据。
3. WHEN Worker 需要查询日志平台，系统 SHALL 以只读权限调用 Log MCP。
4. WHEN 工具挂载到 Worker / Manager / Team，系统 SHALL 支持以声明式 MCP 配置挂载，配置版本化且可回滚。
5. WHEN Worker 发起外部调用，系统 SHALL 仅携带网关签发的 consumer token，不携带任何真实凭据。

### Requirement 4：Worker / Team / Human 声明式资源契约

**User Story:** AS 集群运维者, I want Agent 身份以声明式资源表达, so that 角色可复现、可审计

#### Acceptance Criteria

1. WHEN 定义 Worker，系统 SHALL 支持 name、runtime（openclaw/copaw/hermes）、role（triage/architect/developer/reviewer/qa/retro）、spec.env、soul 与 token 字段。
2. WHEN 定义 Team，系统 SHALL 支持 name、members、workers 与 humans 字段。
3. WHEN 定义 Human，系统 SHALL 支持 name、permission、room 字段。
4. WHEN 定义 Manager，系统 SHALL 支持 runtime 与 modelConfig 字段。
5. WHEN 同一声明式资源被部署到不同集群，系统 SHALL 生成行为一致的角色实例。

### Requirement 5：PROCESS DAG 调度契约

**User Story:** AS 研发流程负责人, I want 实现阶段以 DAG 表达, so that 无依赖节点可并行执行

#### Acceptance Criteria

1. WHEN 实现阶段被拆解，系统 SHALL 将每个 PROCESS 节点分配给适配的 Agent。
2. WHEN 两个 PROCESS 节点写域不重叠，系统 SHALL 允许并行执行。
3. WHEN PROCESS 节点存在依赖，系统 SHALL 在依赖节点完成后执行。
4. WHEN 节点状态变化，系统 SHALL 以 typed comment 同步到 issue，供 change board 展示。

### Requirement 6：Worker 零凭据与最小权限安全边界

**User Story:** AS 安全负责人, I want Worker 不持有真实凭据, so that 凭据泄露面收敛到网关

#### Acceptance Criteria

1. WHEN Worker 执行 L0 只读操作，系统 SHALL 自动执行并记录。
2. WHEN Worker 执行 L1 草稿操作，系统 SHALL 自动执行并记录变更。
3. WHEN Worker 执行 L2 提交 PR，系统 SHALL 要求 Human 在房间确认。
4. WHEN Worker 执行 L3 合并/发布/删分支，系统 SHALL 强制 Human 审批（tool guard approvals）。
5. WHEN 任意凭据被使用，系统 SHALL 保证该凭据仅存于 Higress 网关。

## Notes

- 所有 issue 自然语言内容使用简体中文，保留 `## Requirement:` / `### Scenario:` / `**WHEN**` / `**THEN**` 结构 token。
- 本工具包为代码仓库、安装脚本与文档制品，运行环境为 AgentTeams 集群（Linux）。
