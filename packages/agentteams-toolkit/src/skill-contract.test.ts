import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SKILL_FIELDS,
  parseSkillContract,
  validateSkillContract,
} from './skill-contract.js';

const skillsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../templates/agents/skills',
);

const sampleContract = `# triage Skill

## name

- 类型：string
- 值：\`triage\`

## role

- 类型：string
- 值：\`triage\`

## triggers

- 类型：string[]
- 值：
  - Human 上报缺陷

## inputs

- 类型：string[]
- 值：
  - Issue 描述

## outputs

- 类型：string[]
- 值：
  - Proposal issue

## permissions

- 类型：string[]
- 值：
  - 只读访问 Issue 与日志
`;

describe('parseSkillContract', () => {
  it('extracts all six required fields from a valid SKILL.md', () => {
    const parsed = parseSkillContract(sampleContract);
    expect(parsed.name).toContain('triage');
    expect(parsed.role).toContain('triage');
    expect(parsed.triggers).toContain('Human 上报缺陷');
    expect(parsed.inputs).toContain('Issue 描述');
    expect(parsed.outputs).toContain('Proposal issue');
    expect(parsed.permissions).toContain('只读访问 Issue 与日志');
  });

  it('returns empty object for content without sections', () => {
    expect(parseSkillContract('plain text without headings')).toEqual({});
  });

  it('handles a contract missing one field', () => {
    const content = sampleContract.replace(/## permissions[\s\S]*$/, '');
    const parsed = parseSkillContract(content);
    expect(parsed.permissions).toBeUndefined();
    expect(parsed.name).toBeDefined();
  });
});

describe('validateSkillContract', () => {
  it('passes a contract containing all required fields', () => {
    const { valid, missing } = validateSkillContract(sampleContract);
    expect(valid).toBe(true);
    expect(missing).toEqual([]);
  });

  it('reports missing fields when a section is absent', () => {
    const content = sampleContract.replace(/## permissions[\s\S]*$/, '');
    const { valid, missing } = validateSkillContract(content);
    expect(valid).toBe(false);
    expect(missing).toContain('permissions');
  });

  it('reports missing fields when a section is empty', () => {
    const content = sampleContract.replace(
      /## permissions\n\n- 类型：string\[\]\n- 值：\n  - 只读访问 Issue 与日志/,
      '## permissions\n\n- 类型：string[]\n- 值：（空）',
    );
    const { valid } = validateSkillContract(content);
    expect(valid).toBe(true);
  });

  it('lists all six required field names', () => {
    expect(SKILL_FIELDS).toEqual([
      'name',
      'role',
      'triggers',
      'inputs',
      'outputs',
      'permissions',
    ]);
  });
});

describe('shipped skills', () => {
  const skillNames = readdirSync(skillsDir).filter((entry) => {
    const entryPath = path.join(skillsDir, entry);
    return (
      statSync(entryPath).isDirectory() &&
      existsSync(path.join(entryPath, 'SKILL.md'))
    );
  });

  it('contains the seven required skill directories', () => {
    expect(skillNames.sort()).toEqual([
      'implement',
      'retro',
      'review',
      'root-cause',
      'spec-sync',
      'triage',
      'verify',
    ]);
  });

  it.each(skillNames)('SKILL.md of %s satisfies the full contract', (skillName) => {
    const content = readFileSync(
      path.join(skillsDir, skillName, 'SKILL.md'),
      'utf8',
    );
    const { valid, missing, parsed } = validateSkillContract(content);
    expect(valid).toBe(true);
    expect(missing).toEqual([]);
    expect(parsed.name).toContain(skillName);
  });
});
