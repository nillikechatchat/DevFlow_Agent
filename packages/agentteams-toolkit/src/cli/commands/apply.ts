import { writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { readAgentTeamsPackage, buildWorkerCrFromPackage } from '../../agentteams-package.js';

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
  const zipArg = args[1];
  const zipFlagIndex = args.indexOf('--zip');
  const zipPath = zipArg?.endsWith('.zip') ? zipArg : (zipFlagIndex >= 0 ? args[zipFlagIndex + 1] : undefined);

  if (kind !== 'worker' || !zipPath) {
    console.error(
      'Usage: agentteams-toolkit apply worker --zip <path> [--name <name>] [--package-uri <uri>] [--inline] [--skills a,b] [--output <path>]',
    );
    return 1;
  }
  const resolved = path.resolve(zipPath);
  if (!existsSync(resolved)) {
    console.error(`FAIL: package not found: ${resolved}`);
    return 1;
  }

  try {
    const pkg = readAgentTeamsPackage(resolved);
    const nameFlagIndex = args.indexOf('--name');
    const name = nameFlagIndex >= 0 ? args[nameFlagIndex + 1] : undefined;
    const uriFlagIndex = args.indexOf('--package-uri');
    const packageUri = uriFlagIndex >= 0 ? args[uriFlagIndex + 1] : undefined;
    const inline = args.includes('--inline');
    const skillsFlagIndex = args.indexOf('--skills');
    const skills = skillsFlagIndex >= 0
      ? args[skillsFlagIndex + 1].split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;
    const outputFlagIndex = args.indexOf('--output');
    const output = outputFlagIndex >= 0 ? args[outputFlagIndex + 1] : undefined;

    const crYaml = buildWorkerCrFromPackage(pkg, { name, packageUri, inlineConfig: inline, skills });
    const dest = output ?? path.join(process.cwd(), 'worker.yaml');
    writeFileSync(dest, crYaml, 'utf8');

    const crName = name ?? pkg.manifest.worker.suggested_name;
    console.log(`PASS: Worker CR written to ${dest}`);
    console.log(`  worker: ${crName} (model: ${pkg.manifest.worker.model}, runtime: ${pkg.manifest.worker.runtime})`);
    console.log('  使用 agentteams-apply.sh 应用资源:');
    console.log(`    bash install/agentteams-apply.sh -f ${dest}`);
    console.log('  或直接导入工具包创建 Worker:');
    console.log(`    bash install/agentteams-import.sh worker --name ${crName} --zip ${resolved}`);
    return 0;
  } catch (error) {
    console.error(`FAIL: ${String(error)}`);
    return 1;
  }
}

export function runApplyHelp(): string {
  return [
    'Usage:',
    '  agentteams-toolkit apply worker --zip <path> [options]',
    '',
    'Read an AgentTeams native worker package ZIP and generate a Worker custom resource.',
    'The Controller creates the Worker (container + Matrix account + MinIO) when the resource is applied.',
    '',
    'Options:',
    '  --name <name>        Override the Worker name (default: manifest.worker.suggested_name)',
    '  --package-uri <uri>  Set spec.package (file://, http(s)://, nacos:// or packages/<name>.zip)',
    '  --inline             Inline package SOUL.md/AGENTS.md into the Worker CR (overrides package files)',
    '  --skills <a,b>       Built-in skills to enable (merged with package custom skills)',
    '  --output <path>      Output YAML path (default: ./worker.yaml)',
  ].join('\n');
}
