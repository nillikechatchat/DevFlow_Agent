import path from 'node:path';

export interface Checker {
  failed: boolean;
}

export function check(checker: Checker, ok: boolean, label: string, detail = ''): void {
  const tag = ok ? 'OK' : 'FAIL';
  console.log(`${tag.padEnd(4)} ${label}${detail ? ` (${detail})` : ''}`);
  if (!ok) checker.failed = true;
}

export function resolveTargetDir(cliArg?: string): string {
  return cliArg ? path.resolve(cliArg) : process.cwd();
}
