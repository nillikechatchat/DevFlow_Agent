#!/usr/bin/env node
import { runValidate } from './commands/validate.js';
import { runManifest } from './commands/manifest.js';
import { runVerifyPipeline } from './commands/verify-pipeline.js';
import { runInit } from './commands/init.js';
import { runPack } from './commands/pack.js';
import { runInstall } from './commands/install-cli.js';
import { runApply, runApplyHelp } from './commands/apply.js';

const HELP = `agentteams-toolkit - verification and scaffolding for agentteams projects

Usage:
  agentteams-toolkit <command> [options]

Commands:
  validate [dir]              Validate .agents/skills structure against the skill contract
  manifest [dir]              Verify toolkit artifacts (skills, contracts, examples) and references
  verify-pipeline [dir]       Verify the agentteams skill pipeline (registry mirror, Nacos URL, worker token)
  init <dir>                  Scaffold a .agents directory from bundled templates
  pack <skill|worker> <dir>   Pack a skill or worker directory into an AgentTeams-compatible ZIP
                              worker: manifest.json + config/{SOUL,AGENTS,MEMORY}.md + skills/
                              Options: --version <semver>  --output <path>  --model <model-id>  --runtime <runtime>
  pack project <dir>          Pack the project soul into a team package (manifest team/workers blueprint
                              + config/ + skills/ + contracts/ + team.yaml)
                              Options: --version <semver>  --output <path>  --model <model-id>
  install skill <name>        Install a skill from the skill registry (Nacos/claw style)
  install worker <name>       Install a worker package from the registry
                              Options: --registry <uri>  --version <ver>  --dir <target>
  apply worker --zip <path>   Read an AgentTeams native worker package ZIP and generate a Worker CR
                              Options: --name <name>  --package-uri <uri>  --inline  --skills <a,b>  --output <path>
  apply project --zip <path>  Read a project soul package ZIP and generate the full team setup
                              (multi-doc YAML: Worker CRs + Team CR)
                              Options: --package-uri <uri>  --inline  --output <path>
  help                        Show this help

If [dir] is omitted, the current working directory is used.

Environment:
  AGENTTEAMS_SKILLS_API_URL    Registry URL (default nacos://market.agentteams.io:80/public)
  AGENTTEAMS_VERIFY_REMOTE=1   Enable HTTP reachability probe in verify-pipeline
`;

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const command = args[0] ?? 'help';
  const rest = args.slice(1);

  switch (command) {
    case 'validate':
      return runValidate(rest);
    case 'manifest':
      return runManifest(rest);
    case 'verify-pipeline':
      return runVerifyPipeline(rest);
    case 'init':
      return runInit(rest);
    case 'pack':
      return runPack(rest);
    case 'install':
      return runInstall(rest);
    case 'apply':
      if (rest[0] === 'worker' && rest.includes('--zip')) {
        return runApply(rest);
      }
      if (rest[0] === 'project' && rest.includes('--zip')) {
        return runApply(rest);
      }
      console.error(runApplyHelp());
      return 1;
    case 'help':
    case '--help':
    case '-h':
      console.log(HELP);
      return 0;
    default:
      console.error(`Unknown command: ${command}`);
      console.log(HELP);
      return 1;
  }
}

const exitCode = await main();
process.exit(exitCode);
