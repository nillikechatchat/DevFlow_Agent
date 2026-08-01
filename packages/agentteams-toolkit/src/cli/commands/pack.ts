import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { packSkill } from '../../skill-package.js';
import { packWorker } from '../../worker-package.js';
import { packAgentTeamsProject } from '../../project-package.js';

function readFlag(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

export function runPack(args: string[]): number {
  const kind = args[0];
  const dirArg = args[1];
  const version = readFlag(args, '--version');
  const output = readFlag(args, '--output');
  const model = readFlag(args, '--model');
  const runtime = readFlag(args, '--runtime');
  const target = dirArg ?? '.';
  const resolved = path.resolve(target);

  if (kind !== 'skill' && kind !== 'worker' && kind !== 'project') {
    console.error(
      'Usage: agentteams-toolkit pack <skill|worker|project> <dir> [--version <semver>] [--output <path>] [--model <model-id>] [--runtime <runtime>]',
    );
    return 1;
  }
  if (!existsSync(resolved) || !statSync(resolved).isDirectory()) {
    console.error(`FAIL: target directory not found: ${resolved}`);
    return 1;
  }

  try {
    if (kind === 'skill') {
      const result = packSkill(resolved, { version, output });
      console.log(
        `PASS: skill package written to ${result.archivePath} (${result.entryCount} entries, metadata: ${result.metadata.name}@${result.metadata.version ?? 'unversioned'})`,
      );
    } else if (kind === 'worker') {
      const result = packWorker(resolved, { version, output, model, runtime });
      console.log(
        `PASS: worker package written to ${result.archivePath} (${result.entryCount} entries, worker: ${result.name}@${result.version})`,
      );
    } else {
      const result = packAgentTeamsProject(resolved, {
        version,
        output,
        model,
        runtime,
      });
      console.log(
        `PASS: project soul package written to ${result.archivePath} (${result.entryCount} entries, project: ${result.manifest.project?.name ?? result.manifest.worker.suggested_name}@${result.manifest.version}, team: ${result.manifest.team?.name}, workers: ${result.manifest.team?.workers.length ?? 0})`,
      );
    }
    return 0;
  } catch (error) {
    console.error(`FAIL: ${String(error)}`);
    return 1;
  }
}
