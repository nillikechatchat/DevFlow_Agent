import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { packSkill } from '../../skill-package.js';
import { packWorker } from '../../worker-package.js';

export function runPack(args: string[]): number {
  const kind = args[0];
  const dirArg = args[1];
  const versionFlagIndex = args.indexOf('--version');
  const version = versionFlagIndex >= 0 ? args[versionFlagIndex + 1] : undefined;
  const outputFlagIndex = args.indexOf('--output');
  const output = outputFlagIndex >= 0 ? args[outputFlagIndex + 1] : undefined;
  const target = dirArg ?? '.';
  const resolved = path.resolve(target);

  if (kind !== 'skill' && kind !== 'worker') {
    console.error('Usage: agentteams-toolkit pack <skill|worker> <dir> [--version <semver>] [--output <path>]');
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
    } else {
      const result = packWorker(resolved, { version, output });
      console.log(
        `PASS: worker package written to ${result.archivePath} (${result.entryCount} entries, worker: ${result.name}@${result.version})`,
      );
    }
    return 0;
  } catch (error) {
    console.error(`FAIL: ${String(error)}`);
    return 1;
  }
}
