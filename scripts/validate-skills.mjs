import {
  readdirSync,
  readFileSync,
  statSync,
  existsSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const skillsDir = path.join(rootDir, '.agents', 'skills');
const requiredFields = [
  'name',
  'role',
  'triggers',
  'inputs',
  'outputs',
  'permissions',
];

const skillNames = readdirSync(skillsDir).filter((entry) =>
  statSync(path.join(skillsDir, entry)).isDirectory(),
);

let failed = false;

for (const skillName of skillNames) {
  const skillDir = path.join(skillsDir, skillName);
  const filePath = path.join(skillDir, 'SKILL.md');
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    console.log(`SKIP  ${skillName}: no SKILL.md in directory`);
    continue;
  }
  const content = readFileSync(filePath, 'utf8');
  const missing = requiredFields.filter((field) => {
    const sectionRe = new RegExp(`^##\\s+${field}[ \\t]*$`, 'm');
    const headingMatch = sectionRe.exec(content);
    if (!headingMatch) return true;
    const start = headingMatch.index + headingMatch[0].length;
    const nextHeading = new RegExp('^##\\s+[A-Za-z0-9_-]+[ \\t]*$', 'gm');
    nextHeading.lastIndex = start;
    const next = nextHeading.exec(content);
    const end = next ? next.index : content.length;
    return content.slice(start, end).trim().length === 0;
  });
  if (missing.length > 0) {
    console.error(`FAIL  ${skillName}: missing fields: ${missing.join(', ')}`);
    failed = true;
  } else {
    console.log(`OK    ${skillName}: all ${requiredFields.length} fields present`);
  }
}

if (failed) {
  process.exit(1);
}
console.log(`Validated ${skillNames.length} skills successfully.`);
