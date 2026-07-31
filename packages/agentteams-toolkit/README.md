# agentteams-toolkit

自包含的 agentteams 工具包：资源契约校验、PROCESS DAG、风险边界、技能注册与流水线校验。库 API 与 CLI 双出口，可安装到任意 agentteams 项目使用。

## 安装

```bash
npm install agentteams-toolkit
# 或从 git 仓库安装
npm install git+https://github.com/<org>/<repo>.git#<ref>
```

## CLI

```bash
# 校验项目 .agents/skills 是否符合技能契约
agentteams-toolkit validate ./path/to/project

# 校验 toolkit 产物完整性与引用完整性（skills/contracts/examples）
agentteams-toolkit manifest ./path/to/project

# 校验 agentteams 技能流水线（registry mirror、Nacos URL、worker token）
agentteams-toolkit verify-pipeline ./path/to/project

# 从内置模板脚手架 .agents 目录
agentteams-toolkit init ./new-project
```

省略 `dir` 时使用当前工作目录。

环境变量：

- `AGENTTEAMS_SKILLS_API_URL`：注册表 URL，默认 `nacos://market.agentteams.io:80/public`
- `AGENTTEAMS_VERIFY_REMOTE=1`：在 verify-pipeline 中启用 HTTP 可达性探测

## 库 API

```ts
import {
  validateResource,
  buildProcessGraph,
  topologicalSort,
  classifyRisk,
  isActionPermitted,
  SkillRegistry,
  validateSkillContract,
  computeVerifyStatus,
} from 'agentteams-toolkit';
```

导出内容见 `src/index.ts`，各模块：

- `resource-contract`：Worker/Team/Human/Manager 自定义资源校验
- `process-dag`：PROCESS 节点构建 DAG、拓扑排序、并行度分配
- `risk-boundary`：L0-L3 风险分级与动作权限判定
- `skill-contract`：SKILL.md 字段契约解析与校验
- `skill-registry`：Nacos 技能注册表客户端（构建下载 URL、内容哈希、灰度）
- `verify-result`：verify 门禁与结果解析

## 模板

`templates/agents/` 内置 skills（triage/root-cause/implement/review/verify/retro/spec-sync）与 examples（worker/team/human/manager.yaml），供 `init` 脚手架使用。

## 开发

```bash
npm install
npm run build     # tsc 编译到 dist/
npm test          # vitest 运行单元测试
npm run typecheck # tsc --noEmit
```
