import { mkdirSync, copyFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function templatesAgentsDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '..', '..', '..', 'templates', 'agents');
}

function copyDirRecursive(source: string, target: string): void {
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(source)) {
    const srcPath = path.join(source, entry);
    const destPath = path.join(target, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

export function runInit(args: string[]): number {
  const target = args[0] ? path.resolve(args[0]) : process.cwd();
  const source = templatesAgentsDir();
  const targetDir = path.join(target, '.agents');

  if (existsSync(targetDir)) {
    console.error(`FAIL: ${targetDir} already exists; refusing to overwrite`);
    return 1;
  }
  if (!existsSync(source)) {
    console.error(`FAIL: bundled templates missing at ${source}`);
    return 1;
  }

  copyDirRecursive(source, targetDir);
  console.log(`PASS: agentteams .agents scaffold written to ${targetDir}`);
  return 0;
}
