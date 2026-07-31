import {
  readdirSync,
  readFileSync,
  statSync,
  existsSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const skillsDir = path.join(rootDir, '.agents', 'skills');
const contractsDir = path.join(rootDir, 'docs', 'contracts');
const examplesDir = path.join(rootDir, '.agents', 'examples');

const canonicalSkills = [
  'triage',
  'root-cause',
  'implement',
  'review',
  'verify',
  'retro',
  'spec-sync',
];
const canonicalContracts = [
  'mcp-integration.md',
  'resource-contract.md',
  'process-dag.md',
  'security-boundary.md',
];
const canonicalExamples = ['worker.yaml', 'team.yaml', 'human.yaml', 'manager.yaml'];

let failed = false;

function check(ok, label, detail = '') {
  const tag = ok ? 'OK' : 'FAIL';
  console.log(`${tag.padEnd(4)} ${label}${detail ? ` (${detail})` : ''}`);
  if (!ok) failed = true;
}

console.log('==> DevFlow_Agent toolkit manifest');

check(existsSync(skillsDir), 'skills directory exists');
check(existsSync(contractsDir), 'contracts directory exists');
check(existsSync(examplesDir), 'examples directory exists');

console.log('\n--> skills');
for (const skillName of canonicalSkills) {
  const filePath = path.join(skillsDir, skillName, 'SKILL.md');
  check(
    existsSync(filePath) && statSync(filePath).isFile(),
    skillName,
    'SKILL.md',
  );
}

console.log('\n--> contracts');
for (const contract of canonicalContracts) {
  const filePath = path.join(contractsDir, contract);
  check(existsSync(filePath) && statSync(filePath).isFile(), contract);
}

console.log('\n--> example custom resources');
for (const example of canonicalExamples) {
  const filePath = path.join(examplesDir, example);
  if (!existsSync(filePath)) {
    check(false, example, 'missing');
    continue;
  }
  try {
    const doc = parse(readFileSync(filePath, 'utf8'));
    if (example === 'worker.yaml') {
      const tokenType = doc?.spec?.token?.type;
      check(tokenType === 'consumer', example, `token.type=${String(tokenType)}`);
    } else {
      check(doc && typeof doc === 'object', example, 'parsable');
    }
  } catch (error) {
    check(false, example, `unparsable YAML: ${error.message}`);
  }
}

console.log('\n--> reference integrity (SKILL.md -> docs/contracts)');
const contractNames = new Set(canonicalContracts);
for (const skillName of canonicalSkills) {
  const filePath = path.join(skillsDir, skillName, 'SKILL.md');
  if (!existsSync(filePath)) continue;
  const content = readFileSync(filePath, 'utf8');
  const references = [...content.matchAll(/docs\/contracts\/([A-Za-z0-9-]+\.md)/g)]
    .map((match) => match[1])
    .filter((name, index, all) => all.indexOf(name) === index);
  for (const reference of references) {
    if (!contractNames.has(reference)) {
      check(false, `${skillName} -> docs/contracts/${reference}`, 'unknown contract');
    }
  }
}

console.log('\n==> Result:');
if (failed) {
  console.log('FAIL: toolkit manifest is incomplete or references are broken');
  process.exit(1);
}
console.log('PASS: all artifacts present and references resolve');
