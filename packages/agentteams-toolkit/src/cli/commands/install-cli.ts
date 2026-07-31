import path from 'node:path';
import { installSkill, installWorker, installSkillFromZip } from './install.js';

export function runInstall(args: string[]): Promise<number> {
  const kind = args[0];
  const name = args[1];
  const registryFlagIndex = args.indexOf('--registry');
  const registry = registryFlagIndex >= 0 ? args[registryFlagIndex + 1] : undefined;
  const versionFlagIndex = args.indexOf('--version');
  const version = versionFlagIndex >= 0 ? args[versionFlagIndex + 1] : undefined;
  const dirFlagIndex = args.indexOf('--dir');
  const targetDir = dirFlagIndex >= 0 ? args[dirFlagIndex + 1] : undefined;

  if ((kind !== 'skill' && kind !== 'worker') || !name) {
    console.error(
      'Usage: agentteams-toolkit install <skill|worker> <name> [--registry <uri>] [--version <ver>] [--dir <target>]',
    );
    return Promise.resolve(1);
  }

  if (kind === 'skill') {
    const fromZip = name.endsWith('.zip') ? path.resolve(name) : null;
    if (fromZip) {
      try {
        const dest = installSkillFromZip(fromZip, { targetDir });
        console.log(`PASS: skill installed to ${dest}`);
        return Promise.resolve(0);
      } catch (error) {
        console.error(`FAIL: ${String(error)}`);
        return Promise.resolve(1);
      }
    }
    return installSkill(name, { registry, version, targetDir })
      .then((dest) => {
        console.log(`PASS: skill ${name} installed to ${dest}`);
        return 0;
      })
      .catch((error) => {
        console.error(`FAIL: ${String(error)}`);
        return 1;
      });
  }

  return installWorker(name, { registry, version, targetDir })
    .then((dest) => {
      console.log(`PASS: worker ${name} installed to ${dest}`);
      return 0;
    })
    .catch((error) => {
      console.error(`FAIL: ${String(error)}`);
      return 1;
    });
}
