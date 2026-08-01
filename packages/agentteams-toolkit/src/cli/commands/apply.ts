import { writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import {
  readAgentTeamsPackage,
  buildWorkerCrFromPackage,
} from '../../agentteams-package.js';
import {
  readProjectPackage,
  buildTeamSetupFromPackage,
} from '../../project-package.js';

export interface ApplyOptions {
  name?: string;
  packageUri?: string;
  inline?: boolean;
  skills?: string[];
  output?: string;
}

export function buildWorkerCrYaml(zipPath: string, options: ApplyOptions = {}): string {
  const pkg = readAgentTeamsPackage(zipPath);
  return buildWorkerCrFromPackage(pkg, {
    name: options.name,
    packageUri: options.packageUri,
    inlineConfig: options.inline,
    skills: options.skills,
  });
}

export function applyWorker(zipPath: string, options: ApplyOptions = {}): string {
  const yaml = buildWorkerCrYaml(zipPath, options);
  const output =
    options.output ??
    path.join(process.cwd(), 'worker.yaml');
  writeFileSync(output, yaml, 'utf8');
  return output;
}

export function runApply(args: string[]): number {
  const kind = args[0];
  const zipFlagIndex = args.indexOf('--zip');
  const zipPath = zipFlagIndex >= 0 ? args[zipFlagIndex + 1] : undefined;

  if ((kind !== 'worker' && kind !== 'project') || !zipPath) {
    console.error(
      'Usage: agentteams-toolkit apply <worker|project> --zip <path> [options]',
    );
    return 1;
  }
  const resolved = path.resolve(zipPath);
  if (!existsSync(resolved)) {
    console.error(`FAIL: package not found: ${resolved}`);
    return 1;
  }

  const name = readFlag(args, '--name');
  const packageUri = readFlag(args, '--package-uri');
  const inline = args.includes('--inline');
  const skillsRaw = readFlag(args, '--skills');
  const skills = skillsRaw
    ? skillsRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;
  const output = readFlag(args, '--output');

  try {
    if (kind === 'worker') {
      const pkg = readAgentTeamsPackage(resolved);
      const crYaml = buildWorkerCrFromPackage(pkg, {
        name,
        packageUri,
        inlineConfig: inline,
        skills,
      });
      const dest = output ?? path.join(process.cwd(), 'worker.yaml');
      writeFileSync(dest, crYaml, 'utf8');

      const crName = name ?? pkg.manifest.worker.suggested_name;
      console.log(`PASS: Worker CR written to ${dest}`);
      console.log(
        `  worker: ${crName} (model: ${pkg.manifest.worker.model}, runtime: ${pkg.manifest.worker.runtime})`,
      );
      console.log('  使用 agentteams-apply.sh 应用资源:');
      console.log(`    bash install/agentteams-apply.sh -f ${dest}`);
      console.log('  或直接导入工具包创建 Worker:');
      console.log(
        `    bash install/agentteams-import.sh worker --name ${crName} --zip ${resolved}`,
      );
      return 0;
    }

    const pkg = readProjectPackage(resolved);
    const setupYaml = buildTeamSetupFromPackage(pkg, {
      packageUri,
      inlineConfig: inline,
    });
    const dest =
      output ?? path.join(process.cwd(), `${pkg.manifest.team!.name}-setup.yaml`);
    writeFileSync(dest, setupYaml, 'utf8');

    const team = pkg.manifest.team!;
    const leader = team.workers.find((w) => w.role === 'team_leader')?.name;
    console.log(`PASS: team setup written to ${dest}`);
    console.log(
      `  team: ${team.name} (leader: ${leader ?? '-'}, workers: ${team.workers.length})`,
    );
    console.log('  使用 agentteams-apply.sh 批量创建团队（Worker CR 按序应用，Team 最后）:');
    console.log(`    bash install/agentteams-apply.sh -f ${dest}`);
    console.log('  或在 Worker 工具包导入后逐一创建:');
    console.log(
      `    bash install/agentteams-import.sh worker --name <worker> --zip ${resolved}`,
    );
    return 0;
  } catch (error) {
    console.error(`FAIL: ${String(error)}`);
    return 1;
  }
}

function readFlag(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

export function runApplyHelp(): string {
  return [
    'Usage:',
    '  agentteams-toolkit apply worker --zip <path> [options]',
    '  agentteams-toolkit apply project --zip <path> [options]',
    '',
    'worker:  Read an AgentTeams native worker package ZIP and generate a Worker custom resource.',
    'project: Read a project soul package ZIP and generate the full team setup (multi-doc YAML:',
    '         one Worker CR per blueprint worker + one Team CR). The Controller creates every',
    '         Worker (container + Matrix account + MinIO) and links the Team when applied.',
    '',
    'Options:',
    '  --name <name>        Override the Worker name (worker only)',
    '  --package-uri <uri>  Set spec.package (file://, http(s)://, nacos:// or packages/<name>.zip)',
    '  --inline             Inline package SOUL.md/AGENTS.md into Worker CRs (overrides package files)',
    '  --skills <a,b>       Built-in skills to enable (merged with package custom skills)',
    '  --output <path>      Output YAML path',
  ].join('\n');
}
