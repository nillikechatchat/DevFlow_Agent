import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { check, resolveTargetDir, type Checker } from '../util.js';

const CANONICAL_SKILLS = [
  'triage',
  'root-cause',
  'implement',
  'review',
  'verify',
  'retro',
  'spec-sync',
];
const CANONICAL_CONTRACTS = [
  'mcp-integration.md',
  'resource-contract.md',
  'process-dag.md',
  'security-boundary.md',
];
const CANONICAL_EXAMPLES = ['worker.yaml', 'team.yaml', 'human.yaml', 'manager.yaml'];

export function validateManifest(rootDir: string): boolean {
  const checker: Checker = { failed: false };
  const skillsDir = path.join(rootDir, '.agents', 'skills');
  const contractsDir = path.join(rootDir, 'docs', 'contracts');
  const examplesDir = path.join(rootDir, '.agents', 'examples');

  check(checker, existsSync(skillsDir), 'skills directory exists');
  check(checker, existsSync(contractsDir), 'contracts directory exists');
  check(checker, existsSync(examplesDir), 'examples directory exists');

  for (const skillName of CANONICAL_SKILLS) {
    const filePath = path.join(skillsDir, skillName, 'SKILL.md');
    check(
      checker,
      existsSync(filePath) && statSync(filePath).isFile(),
      skillName,
      'SKILL.md',
    );
  }

  for (const contract of CANONICAL_CONTRACTS) {
    const filePath = path.join(contractsDir, contract);
    check(checker, existsSync(filePath) && statSync(filePath).isFile(), contract);
  }

  for (const example of CANONICAL_EXAMPLES) {
    const filePath = path.join(examplesDir, example);
    if (!existsSync(filePath)) {
      check(checker, false, example, 'missing');
      continue;
    }
    try {
      const doc = parse(readFileSync(filePath, 'utf8'));
      if (example === 'worker.yaml') {
        const tokenType = doc?.spec?.token?.type;
        check(
          checker,
          tokenType === 'consumer',
          example,
          `token.type=${String(tokenType)}`,
        );
      } else {
        check(checker, doc && typeof doc === 'object', example, 'parsable');
      }
    } catch (error) {
      check(checker, false, example, `unparsable YAML: ${String(error)}`);
    }
  }

  const contractNames = new Set(CANONICAL_CONTRACTS);
  for (const skillName of CANONICAL_SKILLS) {
    const filePath = path.join(skillsDir, skillName, 'SKILL.md');
    if (!existsSync(filePath)) continue;
    const content = readFileSync(filePath, 'utf8');
    const references = [...content.matchAll(/docs\/contracts\/([A-Za-z0-9-]+\.md)/g)]
      .map((match) => match[1])
      .filter((name, index, all) => all.indexOf(name) === index);
    for (const reference of references) {
      if (!contractNames.has(reference)) {
        check(
          checker,
          false,
          `${skillName} -> docs/contracts/${reference}`,
          'unknown contract',
        );
      }
    }
  }

  return !checker.failed;
}

export function runManifest(args: string[]): number {
  const dir = resolveTargetDir(args[0]);
  console.log(`==> agentteams-toolkit manifest ${dir}`);
  const ok = validateManifest(dir);
  if (!ok) {
    console.log('FAIL: toolkit manifest is incomplete or references are broken');
    return 1;
  }
  console.log('PASS: all artifacts present and references resolve');
  return 0;
}
