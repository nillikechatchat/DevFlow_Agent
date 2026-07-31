import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { check, resolveTargetDir, type Checker } from '../util.js';
import { parseSkillFrontmatter } from '../../skill-package.js';

const REQUIRED_FIELDS = [
  'name',
  'role',
  'triggers',
  'inputs',
  'outputs',
  'permissions',
];

const SEMVER_RE = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

function validateFrontmatter(checker: Checker, skillName: string, content: string): void {
  const { metadata } = parseSkillFrontmatter(content);
  if (!metadata.name) {
    check(checker, false, skillName, 'missing frontmatter name (HiMarket 规范必填)');
    return;
  }
  if (metadata.name !== skillName) {
    check(
      checker,
      false,
      skillName,
      `frontmatter name "${metadata.name}" 与目录名不一致`,
    );
  }
  if (!metadata.description) {
    check(checker, false, skillName, 'missing frontmatter description (HiMarket 规范必填)');
  }
  if (metadata.version && !SEMVER_RE.test(metadata.version)) {
    check(
      checker,
      false,
      skillName,
      `frontmatter version "${metadata.version}" 不是语义化版本`,
    );
  }
}

export function validateSkillsDirectory(rootDir: string, log = true): boolean {
  const checker: Checker = { failed: false };
  const skillsDir = path.join(rootDir, '.agents', 'skills');

  if (!existsSync(skillsDir) || !statSync(skillsDir).isDirectory()) {
    check(checker, false, '.agents/skills directory', 'missing');
    return !checker.failed;
  }

  const skillNames = readdirSync(skillsDir).filter((entry) =>
    statSync(path.join(skillsDir, entry)).isDirectory(),
  );

  for (const skillName of skillNames) {
    const filePath = path.join(skillsDir, skillName, 'SKILL.md');
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      if (log) {
        console.log(`SKIP  ${skillName}: no SKILL.md in directory`);
      }
      continue;
    }
    const content = readFileSync(filePath, 'utf8');
    validateFrontmatter(checker, skillName, content);
    const missing = REQUIRED_FIELDS.filter((field) => {
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
      check(checker, false, skillName, `missing fields: ${missing.join(', ')}`);
    } else if (log) {
      check(checker, true, skillName, 'all fields present');
    }
  }

  if (log) {
    console.log(
      checker.failed
        ? `Validated ${skillNames.length} skills with errors.`
        : `Validated ${skillNames.length} skills successfully.`,
    );
  }
  return !checker.failed;
}

export function runValidate(args: string[]): number {
  const dir = resolveTargetDir(args[0]);
  console.log(`==> agentteams-toolkit validate ${dir}`);
  const ok = validateSkillsDirectory(dir);
  if (!ok) {
    console.log('FAIL: skill contract validation failed');
    return 1;
  }
  console.log('PASS: all skills match the contract');
  return 0;
}
