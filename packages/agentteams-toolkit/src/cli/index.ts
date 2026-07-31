#!/usr/bin/env node
import { runValidate } from './commands/validate.js';
import { runManifest } from './commands/manifest.js';
import { runVerifyPipeline } from './commands/verify-pipeline.js';
import { runInit } from './commands/init.js';

const HELP = `agentteams-toolkit - verification and scaffolding for agentteams projects

Usage:
  agentteams-toolkit <command> [dir]

Commands:
  validate [dir]          Validate .agents/skills structure against the skill contract
  manifest [dir]          Verify toolkit artifacts (skills, contracts, examples) and references
  verify-pipeline [dir]   Verify the agentteams skill pipeline (registry mirror, Nacos URL, worker token)
  init <dir>              Scaffold a .agents directory from bundled templates
  help                    Show this help

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
