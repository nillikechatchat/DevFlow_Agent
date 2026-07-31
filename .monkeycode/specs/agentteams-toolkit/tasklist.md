# 需求实施计划 — agentteams-toolkit

- [x] 1. 建立工具包目录结构与契约文档骨架
  - [x] 1.1 创建 .agents/skills 目录结构
    - 创建 `.agents/skills/{triage,root-cause,implement,review,verify,retro,spec-sync}/` 七个 Skill 目录
    - 创建 `docs/contracts/` 契约文档目录
    - 建立统一的 SKILL.md 契约模板（name/role/triggers/inputs/outputs/permissions 六字段）
    - 对应设计 C2 契约完备属性

  - [x] 1.2 编写 MCP 工具集成契约文档
    - 编写 `docs/contracts/mcp-integration.md`
    - 定义 GitHub MCP（经 code-provider bridge，权限限于读 Issue/PR 与提交 review）、Code Host MCP（provider-neutral 证据）、Log MCP（只读）、Higress 网关凭据托管四类接入方式
    - 覆盖需求 R3 的 5 条验收标准

  - [x] 1.3 编写声明式资源契约文档
    - 编写 `docs/contracts/resource-contract.md`
    - 定义 Worker（name/runtime/role/spec.env/soul/token）、Team（members/workers/humans）、Human（permission/room）、Manager（runtime/modelConfig）字段
    - 覆盖需求 R4 的 5 条验收标准

  - [x] 1.4 编写 PROCESS DAG 调度契约文档
    - 编写 `docs/contracts/process-dag.md`
    - 定义 PROCESS 节点、依赖关系、写域不重叠并行判定、typed comment 状态同步规则
    - 覆盖需求 R5 的 4 条验收标准

  - [x] 1.5 编写安全边界契约文档
    - 编写 `docs/contracts/security-boundary.md`
    - 定义 L0 只读自动执行、L1 草稿自动+记录、L2 提交 PR 需房间确认、L3 合并/发布/删分支强制审批四级规则
    - 覆盖需求 R6 的 5 条验收标准

- [x] 2. 实现七个 Skill 制品
  - [x] 2.1 编写 triage Skill
    - 编写 `.agents/skills/triage/SKILL.md`，定义 Proposal issue 创建触发与 QUESTION 决策清单产出
    - 对应设计 R1 的验收标准 1

  - [x] 2.2 编写 root-cause Skill
    - 编写 `.agents/skills/root-cause/SKILL.md`，定义 Design issue 编写触发与根因+验收标准产出
    - 对应设计 R1 的验收标准 1

  - [x] 2.3 编写 implement Skill
    - 编写 `.agents/skills/implement/SKILL.md`，定义 PROCESS DAG 节点触发与代码变更 PR 产出
    - 对应设计 R1 的验收标准 1 与 R5 的验收标准 1

  - [x] 2.4 编写 review Skill
    - 编写 `.agents/skills/review/SKILL.md`，定义 REVIEW typed comment 触发与 P0/P1 findings 产出
    - 对应设计 R1 的验收标准 1

  - [x] 2.5 编写 verify Skill
    - 编写 `.agents/skills/verify/SKILL.md`，定义 verify --json 触发与 PASS/FAIL+reasons 产出
    - 定义输出 JSON 六字段结构（change/status/blocking_questions/traceability/p0_p1_open/pr_checks/reasons）
    - 对应设计 R1 的验收标准 3 与 C5 确定性属性

  - [x] 2.6 编写 retro Skill
    - 编写 `.agents/skills/retro/SKILL.md`，定义归档触发与 durable spec PR 产出
    - 对应设计 R1 的验收标准 1

  - [x] 2.7 编写 spec-sync Skill
    - 编写 `.agents/skills/spec-sync/SKILL.md`，定义 stage 切换触发与 typed comment 同步产出
    - 对应设计 R1 的验收标准 1 与 R5 的验收标准 4

  - [x] 2.8 编写 Skill 契约完整性校验脚本与测试
    - 编写脚本校验七个 SKILL.md 均包含六字段
    - 编写 vitest 单测验证契约字段完整性
    - 对应设计 C2 契约完备属性

- [x] 3. 实现 verify 输出接口解析器
  - [x] 3.1 实现 verify JSON 结构定义与解析器
    - 实现 `issue-spec verify --json` 输出的类型定义与解析函数
    - 定义 PASS/FAIL 判定边界：阻塞 QUESTION 未解、可追溯性断裂、P0/P1 未闭合、PR 检查未过、高风险无审批即 FAIL
    - 对应设计 R1 的验收标准 3 与 C5 属性

  - [x] 3.2 编写 verify 解析器单元测试
    - 对 PASS/FAIL/边界输入运行解析单测，验证六字段完整性
    - 对应设计测试策略 verify 输出测试

  - [x] 3.3 编写 verify 确定性属性测试
    - 使用 fast-check 生成随机输入，验证同一输入恒产生同一结果
    - 对应设计 C5 verify 确定性属性

- [x] 4. 检查点 - 确保所有测试通过
  - 确保所有测试通过,如有疑问请询问用户

- [x] 5. 实现声明式资源契约示例 CR
  - [x] 5.1 编写 Worker CR 示例
    - 编写 `.agents/skills/../examples/worker.yaml`，覆盖 runtime/role/spec.env/soul/token 字段，token.type 恒为 consumer
    - 对应设计 R4 的验收标准 1 与 C1 凭据隔离属性

  - [x] 5.2 编写 Team / Human / Manager CR 示例
    - 编写 team.yaml、human.yaml、manager.yaml，覆盖成员、房间、权限、模型配置字段
    - 对应设计 R4 的验收标准 2-5

  - [x] 5.3 编写资源契约校验测试
    - 编写 vitest 校验示例 CR 字段完整性，验证 token.type 恒为 consumer
    - 对应设计 C1 凭据隔离属性

- [x] 6. 实现 PROCESS DAG 调度契约
  - [ ] 6.1 实现 DAG 节点与依赖数据模型
    - 实现 `ProcessNode` 类型（id/name/owner/dependencies/parallelWith/status/evidence）
    - 实现 DAG 依赖图的构建与序列化
    - 对应设计 R5 的验收标准 1 与数据模型章节

  - [ ] 6.2 实现拓扑排序与并行判定逻辑
    - 实现拓扑排序算法判定依赖顺序，检测循环依赖
    - 实现写域不重叠的并行判定逻辑
    - 对应设计 R5 的验收标准 2-3 与 C3/C4 属性

  - [ ] 6.3 编写 DAG 无环属性测试
    - 使用 fast-check 生成随机 DAG 图，验证拓扑排序结果无环且覆盖全部节点
    - 对应设计 C3 DAG 无环属性

  - [ ] 6.4 编写并行安全属性测试
    - 对任意两个标记为并行的节点，验证其写域不重叠
    - 对应设计 C4 并行安全属性

- [x] 7. 实现 L0-L3 风险动作分级
  - [x] 7.1 实现风险分级判定函数
    - 实现 `classifyRisk(action)` 函数，将动作归类为 L0/L1/L2/L3
    - 实现 L2 房间确认与 L3 强制审批的拦截判定逻辑
    - 对应设计 R6 的验收标准 1-4

  - [x] 7.2 编写风险分级单元测试
    - 为四个风险等级构造动作样例，验证分级与审批拦截逻辑
    - 对应设计测试策略 L0-L3 分级测试

- [x] 8. 检查点 - 确保所有测试通过
  - 确保所有测试通过,如有疑问请询问用户

- [x] 9. 验证工具包与 AgentTeams 集成链路
  - [x] 9.1 实现工具包加载清单与校验脚本
    - 实现清单脚本列出全部 Skill、契约文档与示例 CR，校验引用完整性
    - 对应设计 R2 的验收标准 1（注册前完整性检查）

  - [x] 9.2 编写工具包集成验证脚本
    - 复用 install/agentteams-verify.sh 的只读连通性模式，验证 Worker 拉取技能链路配置
    - 对应设计测试策略集成验证

  - [x] 9.3 编写版本治理契约测试
    - 测试 Nacos 版本拉取配置、灰度版本记录与回滚信息保留逻辑
    - 对应设计 R2 的验收标准 2-4
