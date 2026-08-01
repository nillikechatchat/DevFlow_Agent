# agentteams-toolkit

自包含的 agentteams 工具包：资源契约校验、PROCESS DAG、风险边界、技能注册与流水线校验，并按 [AgentTeams 原生工具包规范](https://github.com/agentscope-ai/AgentTeams) 提供 Worker 工具包的打包、导入与 Worker CR 生成。库 API 与 CLI 双出口，可安装到任意 agentteams 项目使用。

## 安装

```bash
npm install agentteams-toolkit
# 或从 git 仓库安装
npm install git+https://github.com/<org>/<repo>.git#<ref>
```

## CLI

```bash
# 校验项目 .agents/skills 是否符合技能契约（含 frontmatter 元数据）
agentteams-toolkit validate ./path/to/project

# 校验 toolkit 产物完整性与引用完整性（skills/contracts/examples）
agentteams-toolkit manifest ./path/to/project

# 校验 agentteams 技能流水线（registry mirror、Nacos URL、worker token）
agentteams-toolkit verify-pipeline ./path/to/project

# 从内置模板脚手架 .agents 目录
agentteams-toolkit init ./new-project

# 将 skill 目录打包为 ZIP（SKILL.md 根目录或一级子目录，可选 scripts/prompts/config/assets）
agentteams-toolkit pack skill ./skills/my-skill --version 1.0.0

# 将 worker 目录打包为 AgentTeams 原生工具包 ZIP
# 产物结构：manifest.json + config/{SOUL,AGENTS,MEMORY}.md + skills/（可含 Dockerfile、crons/）
# worker.yaml 需声明 metadata.name 与 spec.model；spec.soul/spec.agents 会生成 config/SOUL.md、config/AGENTS.md
agentteams-toolkit pack worker ./workers/qa-worker --version 1.0.0 --model qwen3.5-plus

# 从工具包 ZIP 生成 Worker CR（对齐 agt apply worker --zip 语义，Controller 自动创建 Worker）
agentteams-toolkit apply worker --zip ./qa-worker@1.0.0.zip --package-uri packages/qa-worker@1.0.0.zip

# 从注册表安装 skill（Nacos 拉取）
agentteams-toolkit install skill my-skill --registry nacos://market.agentteams.io:80/public

# 从本地 ZIP 安装 skill
agentteams-toolkit install skill ./my-skill@1.0.0.zip --dir .agents/skills

# 从注册表拉取 worker 工具包
agentteams-toolkit install worker qa-worker --version 1.0.0
```

省略 `dir` 时使用当前工作目录。

环境变量：

- `AGENTTEAMS_SKILLS_API_URL`：注册表 URL，默认 `nacos://market.agentteams.io:80/public`
- `AGENTTEAMS_VERIFY_REMOTE=1`：在 verify-pipeline 中启用 HTTP 可达性探测

## AgentTeams 原生工具包

参考 AgentTeams 官方 [声明式资源管理](https://github.com/agentscope-ai/AgentTeams) 文档，Worker 工具包是 Controller 通过 `spec.package` 消费的 ZIP，目录结构固定：

```
{package}/
├── manifest.json           # 包元数据（必需）
├── Dockerfile              # 自定义镜像构建（可选）
├── config/
│   ├── SOUL.md             # Worker 身份与角色定义
│   ├── AGENTS.md           # Agent 行为规则
│   ├── MEMORY.md           # 长期记忆
│   └── memory/             # 记忆文件目录
├── skills/                 # 自定义技能
│   └── <skill-name>/
│       └── SKILL.md
└── crons/
    └── jobs.json           # 定时任务
```

`manifest.json` 结构（`worker.suggested_name` / `worker.model` / `worker.runtime` 必填）：

```json
{
  "version": "1.0",
  "source": { "created_at": "2026-03-18T10:00:00Z" },
  "worker": {
    "suggested_name": "qa-worker",
    "model": "qwen3.5-plus",
    "runtime": "openclaw",
    "base_image": "agentteams/worker-agent:latest",
    "apt_packages": ["ffmpeg"],
    "pip_packages": [],
    "npm_packages": []
  }
}
```

### 通过导入工具包自动创建 Worker

1. **打包**：`agentteams-toolkit pack worker ./workers/qa-worker` 从 `worker.yaml` 生成 AgentTeams 原生工具包 ZIP（`worker.yaml` 的 `soul` / `agents` 字段自动落盘为 `config/SOUL.md` / `config/AGENTS.md`）。
2. **导入**：三选一
   - `agentteams-toolkit apply worker --zip ./qa-worker@1.0.0.zip --package-uri packages/qa-worker@1.0.0.zip` 生成 Worker CR（`spec.package` 指向已上传工具包），再用 `bash install/agentteams-apply.sh -f worker.yaml` 应用，Controller 解析 `spec.package` 自动创建 Worker（容器 + Matrix 账号 + MinIO 空间）；
   - `bash install/agentteams-import.sh worker --name qa-worker --zip ./qa-worker@1.0.0.zip` 直接从 ZIP 导入；
   - 通过 `POST /api/v1/packages` 上传后，`spec.package` 使用 `packages/{name}.zip`。

`spec.package` 支持 `file://`、`http(s)://`、`nacos://` 与 `packages/{name}.zip` 四种 URI；包内 `worker.runtime` 会被 `agt apply worker --zip` 采纳。工具包与 `spec.soul`/`spec.agents` 内联配置可共存——内联字段覆盖工具包内同名文件。

## 项目灵魂包

项目灵魂包把整个项目的灵魂打包成一个 ZIP：团队蓝图（`team.yaml`）+ 全部技能（`.agents/skills/`）+ 契约（`docs/contracts/` 与 `contracts/`）+ 项目级 `config/SOUL.md`/`config/AGENTS.md`。AgentTeams 拿到包后一次性创建团队，leader + 多角色 worker 协作。

```bash
# 打包项目灵魂包（自动探测 .agents/examples/team.yaml 团队蓝图）
agentteams-toolkit pack project ./ --version 1.0.0
# 产物：devflow@1.0-soul.zip
# 内容：manifest.json（project/team 蓝图）+ config/ + skills/ + contracts/ + docs/contracts/

# 从灵魂包生成批量 setup（每个 worker 一个 Worker CR + 末尾一个 Team CR，均 spec.package 指向同一工具包）
agentteams-toolkit apply project --zip ./devflow@1.0-soul.zip --package-uri packages/devflow@1.0-soul.zip
# 产物：./devflow-team-setup.yaml，再用 bash install/agentteams-apply.sh -f devflow-team-setup.yaml 应用
```

`team.yaml` 使用 AgentTeams v1beta1 Team 资源，`workerMembers` 恰好一个 `role: team_leader`、其余 `role: worker`；也兼容 v1 字符串列表 `workers: [a, b]`（缺 leader 时自动补 `<team>-leader`）。`pack project` 支持 `--model` / `--runtime` 整体覆盖所有 worker 蓝图，`apply project` 支持 `--inline` 内联 `config/SOUL.md` 到每个 Worker CR。

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
  parseSkillFrontmatter,
  packSkill,
  packWorker,
  packAgentTeamsWorker,
  readAgentTeamsPackage,
  buildWorkerCrFromPackage,
  validateAgentTeamsPackage,
  computeVerifyStatus,
} from 'agentteams-toolkit';
```

导出内容见 `src/index.ts`，各模块：

- `resource-contract`：Worker/Team/Human/Manager 自定义资源校验
- `process-dag`：PROCESS 节点构建 DAG、拓扑排序、并行度分配
- `risk-boundary`：L0-L3 风险分级与动作权限判定
- `skill-contract`：SKILL.md 字段契约解析与校验
- `skill-registry`：Nacos 技能注册表客户端（构建下载 URL、内容哈希、灰度）
- `skill-package`：Skill 包 frontmatter 解析与 ZIP 打包
- `agentteams-package`：AgentTeams 原生工具包（manifest.json 构建、ZIP 打包、包读取、Worker CR 生成、包校验）
- `project-package`：项目灵魂包（团队蓝图解析、灵魂包打包、多 Worker + Team 批量 setup 生成、包校验）
- `worker-package`：Worker 工具包兼容层（`packWorker` / `readWorkerConfig`，委托 `agentteams-package`）
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
