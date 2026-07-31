import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import AdmZip from 'adm-zip';
import { validateSkillsDirectory } from './commands/validate.js';
import { validateManifest } from './commands/manifest.js';
import { verifyPipeline } from './commands/verify-pipeline.js';
import { runInit } from './commands/init.js';
import { runPack } from './commands/pack.js';
import { installSkillFromZip } from './commands/install.js';

const VALID_SKILL = `---
name: triage
description: "测试分诊技能"
author: agentteams-toolkit
version: 0.1.0
---

## name

triage

## role

triage

## triggers

- user reports a bug

## inputs

- issue description

## outputs

- triage summary

## permissions

- read-only
`;

const CONTRACT_NAMES = [
  'mcp-integration.md',
  'resource-contract.md',
  'process-dag.md',
  'security-boundary.md',
];

let tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'atk-test-'));
  tempDirs.push(dir);
  return dir;
}

function writeSkillsProject(root: string): void {
  for (const skill of [
    'triage',
    'root-cause',
    'implement',
    'review',
    'verify',
    'retro',
    'spec-sync',
  ]) {
    const dir = path.join(root, '.agents', 'skills', skill);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, 'SKILL.md'),
      VALID_SKILL.replace('name: triage', `name: ${skill}`),
    );
  }
  for (const example of ['worker.yaml', 'team.yaml', 'human.yaml', 'manager.yaml']) {
    mkdirSync(path.join(root, '.agents', 'examples'), { recursive: true });
    const body =
      example === 'worker.yaml'
        ? 'spec:\n  runtime: openclaw\n  role: developer\n  token:\n    type: consumer\n'
        : 'spec:\n  name: sample\n';
    writeFileSync(path.join(root, '.agents', 'examples', example), body);
  }
  for (const contract of CONTRACT_NAMES) {
    mkdirSync(path.join(root, 'docs', 'contracts'), { recursive: true });
    writeFileSync(path.join(root, 'docs', 'contracts', contract), '# contract');
  }
}

describe('agentteams-toolkit CLI', () => {
  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs = [];
  });

  it('validate accepts a well-formed skills directory', () => {
    const root = makeTempDir();
    writeSkillsProject(root);
    expect(validateSkillsDirectory(root)).toBe(true);
  });

  it('validate rejects a skill missing required fields', () => {
    const root = makeTempDir();
    const dir = path.join(root, '.agents', 'skills', 'triage');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'SKILL.md'), '## name\n\ntriage\n');
    expect(validateSkillsDirectory(root)).toBe(false);
  });

  it('validate rejects a skill missing frontmatter name', () => {
    const root = makeTempDir();
    const dir = path.join(root, '.agents', 'skills', 'triage');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, 'SKILL.md'),
      `---
description: "缺 name"
---

## name

triage

## role

triage

## triggers

- t

## inputs

- i

## outputs

- o

## permissions

- p
`,
    );
    expect(validateSkillsDirectory(root)).toBe(false);
  });

  it('manifest passes when all artifacts and references resolve', () => {
    const root = makeTempDir();
    writeSkillsProject(root);
    expect(validateManifest(root)).toBe(true);
  });

  it('manifest fails on missing contracts directory', () => {
    const root = makeTempDir();
    writeSkillsProject(root);
    rmSync(path.join(root, 'docs'), { recursive: true, force: true });
    expect(validateManifest(root)).toBe(false);
  });

  it('verify-pipeline reports no failures for a valid project', async () => {
    const root = makeTempDir();
    writeSkillsProject(root);
    const report = await verifyPipeline(root);
    expect(report.failed).toBe(0);
    expect(report.passed).toBeGreaterThan(0);
  });

  it('init scaffolds .agents and refuses to overwrite', () => {
    const root = makeTempDir();
    const target = path.join(root, 'scaffold');
    mkdirSync(target, { recursive: true });

    expect(runInit([target])).toBe(0);
    expect(existsSync(path.join(target, '.agents', 'examples', 'worker.yaml'))).toBe(true);
    expect(existsSync(path.join(target, '.agents', 'skills', 'triage', 'SKILL.md'))).toBe(true);

    expect(runInit([target])).toBe(1);
  });

  it('pack skill produces a HiMarket-compatible ZIP', () => {
    const root = makeTempDir();
    const skillDir = path.join(root, 'triage');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(path.join(skillDir, 'SKILL.md'), VALID_SKILL);

    const output = path.join(root, 'triage.zip');
    expect(runPack(['skill', skillDir, '--output', output])).toBe(0);
    expect(existsSync(output)).toBe(true);

    const zip = new AdmZip(output);
    const names = zip.getEntries().map((entry) => entry.entryName).sort();
    expect(names).toEqual(['SKILL.md']);
    expect(zip.readAsText('SKILL.md')).toContain('name: triage');
  });

  it('pack skill fails when frontmatter name is missing', () => {
    const root = makeTempDir();
    const skillDir = path.join(root, 'bad');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(path.join(skillDir, 'SKILL.md'), '## name\n\nbad\n');
    expect(runPack(['skill', skillDir])).toBe(1);
  });

  it('pack worker produces a HiMarket-compatible ZIP', () => {
    const root = makeTempDir();
    const workerDir = path.join(root, 'qa-worker');
    mkdirSync(path.join(workerDir, 'skills', 'verify'), { recursive: true });
    writeFileSync(
      path.join(workerDir, 'worker.yaml'),
      'apiVersion: agentteams.io/v1\nkind: Worker\nmetadata:\n  name: qa-worker\nspec:\n  version: 1.0.0\n  role: qa\n  skills:\n    - verify\n',
    );
    writeFileSync(path.join(workerDir, 'README.md'), '# QA Worker');
    writeFileSync(path.join(workerDir, 'skills', 'verify', 'SKILL.md'), '# verify\n');

    const output = path.join(root, 'qa-worker.zip');
    expect(runPack(['worker', workerDir, '--output', output])).toBe(0);
    expect(existsSync(output)).toBe(true);

    const zip = new AdmZip(output);
    const names = zip.getEntries().map((entry) => entry.entryName).sort();
    expect(names).toEqual([
      'README.md',
      'skills/verify/SKILL.md',
      'worker.yaml',
    ]);
  });

  it('install skill from a local ZIP writes SKILL.md to target', () => {
    const root = makeTempDir();
    const skillDir = path.join(root, 'triage');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(path.join(skillDir, 'SKILL.md'), VALID_SKILL);
    const zipPath = path.join(root, 'triage.zip');
    expect(runPack(['skill', skillDir, '--output', zipPath])).toBe(0);

    const target = path.join(root, 'installed');
    const dest = installSkillFromZip(zipPath, { targetDir: target });
    expect(dest).toContain('triage');    expect(existsSync(path.join(dest, 'SKILL.md'))).toBe(true);
    expect(
      existsSync(path.join(target, 'triage', 'SKILL.md')),
    ).toBe(true);
  });
});
