# agentteams-toolkit

自包含的 agentteams 工具包：资源契约校验、PROCESS DAG、风险边界、技能注册与流水线校验，并按 [HiMarket](https://higress.ai/docs/himarket/) 包规范提供 Skill / Worker 的打包与安装。库 API 与 CLI 双出口，可安装到任意 agentteams 项目使用。

## 安装

```bash
npm install agentteams-toolkit
# 或从 git 仓库安装
npm install git+https://github.com/<org>/<repo>.git#<ref>
```

## CLI

```bash
# 校验项目 .agents/skills 是否符合技能契约（含 HiMarket frontmatter 元数据）
agentteams-toolkit validate ./path/to/project

# 校验 toolkit 产物完整性与引用完整性（skills/contracts/examples）
agentteams-toolkit manifest ./path/to/project

# 校验 agentteams 技能流水线（registry mirror、Nacos URL、worker token）
agentteams-toolkit verify-pipeline ./path/to/project

# 从内置模板脚手架 .agents 目录
agentteams-toolkit init ./new-project

# 将 skill 目录打包为 HiMarket ZIP（SKILL.md 根目录或一级子目录，可选 scripts/prompts/config/assets）
agentteams-toolkit pack skill ./skills/my-skill --version 1.0.0

# 将 worker 目录打包为 HiMarket ZIP（worker.yaml 主配置 + README + 内置 skills）
agentteams-toolkit pack worker ./workers/qa-worker --version 1.0.0

# 从注册表安装 skill（claw skill install 语义，Nacos 拉取）
agentteams-toolkit install skill my-skill --registry nacos://market.agentteams.io:80/public

# 从本地 ZIP 安装 skill
agentteams-toolkit install skill ./my-skill@1.0.0.zip --dir .agents/skills

# 从注册表安装 worker（himarket install worker 语义）
agentteams-toolkit install worker qa-worker --version 1.0.0
```

省略 `dir` 时使用当前工作目录。

环境变量：

- `AGENTTEAMS_SKILLS_API_URL`：注册表 URL，默认 `nacos://market.agentteams.io:80/public`
- `AGENTTEAMS_VERIFY_REMOTE=1`：在 verify-pipeline 中启用 HTTP 可达性探测

## HiMarket 包规范对齐

参考 [HiMarket Skills 市场](https://higress.ai/docs/himarket/himarket-skills/) 与 [Worker 管理](https://higress.ai/docs/himarket/himarket-workers/)：

- **Skill 包**：ZIP 格式，`SKILL.md` 必须位于根目录或一级子目录；文件顶部 YAML frontmatter 必填 `name` / `description`，可选 `author` / `version` / `repository`；可含 `scripts/`、`prompts/`、`config/`、`assets/`。`pack skill` 生成 `{name}@{version}.zip`，`validate` 校验 frontmatter。
- **Worker 包**：ZIP 格式，必须包含 `worker.yaml` 主配置（定义 `name` / `version` 与依赖 `skills`），建议含 `README.md` 说明文档，可含内置 `skills/` 目录。`pack worker` 生成 `{name}@{version}.zip`。
- **CLI 安装语义**：skill 安装对齐 `npx @anthropic-ai/claw skill install --nacos-host ... --nacos-port ... --namespace ... --skill-name ...`（即通过 Nacos 拉取）；worker 安装对齐 `himarket install worker <name> [--version <ver>]`。

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
  computeVerifyStatus,
} from 'agentteams-toolkit';
```

导出内容见 `src/index.ts`，各模块：

- `resource-contract`：Worker/Team/Human/Manager 自定义资源校验
- `process-dag`：PROCESS 节点构建 DAG、拓扑排序、并行度分配
- `risk-boundary`：L0-L3 风险分级与动作权限判定
- `skill-contract`：SKILL.md 字段契约解析与校验
- `skill-registry`：Nacos 技能注册表客户端（构建下载 URL、内容哈希、灰度）
- `skill-package`：HiMarket Skill 包 frontmatter 解析与 ZIP 打包
- `worker-package`：HiMarket Worker 包主配置解析与 ZIP 打包
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
