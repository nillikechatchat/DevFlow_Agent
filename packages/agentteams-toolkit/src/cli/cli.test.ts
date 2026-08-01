import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import AdmZip from 'adm-zip';
import { validateSkillsDirectory } from './commands/validate.js';
import { validateManifest } from './commands/manifest.js';
import { verifyPipeline } from './commands/verify-pipeline.js';
import { runInit } from './commands/init.js';
import { runPack } from './commands/pack.js';
import { runApply } from './commands/apply.js';
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
        ? 'apiVersion: agentteams.io/v1beta1\nkind: Worker\nmetadata:\n  name: dev-worker\nspec:\n  model: qwen3.5-plus\n  runtime: openclaw\n  role: developer\n'
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

  it('pack worker produces an AgentTeams-native ZIP', () => {
    const root = makeTempDir();
    const workerDir = path.join(root, 'qa-worker');
    mkdirSync(path.join(workerDir, 'skills', 'verify'), { recursive: true });
    writeFileSync(
      path.join(workerDir, 'worker.yaml'),
      'apiVersion: agentteams.io/v1beta1\nkind: Worker\nmetadata:\n  name: qa-worker\nspec:\n  model: qwen3.5-plus\n  runtime: openclaw\n  skills:\n    - verify\n',
    );
    writeFileSync(path.join(workerDir, 'README.md'), '# QA Worker');
    writeFileSync(path.join(workerDir, 'skills', 'verify', 'SKILL.md'), '# verify\n');

    const output = path.join(root, 'qa-worker.zip');
    expect(runPack(['worker', workerDir, '--output', output])).toBe(0);
    expect(existsSync(output)).toBe(true);

    const zip = new AdmZip(output);
    const names = zip.getEntries().map((entry) => entry.entryName).sort();
    expect(names).toContain('manifest.json');
    expect(names).toContain('skills/verify/SKILL.md');
    expect(zip.readAsText('manifest.json')).toContain('"suggested_name": "qa-worker"');
  });

  it('pack worker fails when spec.model is missing and no --model is given', () => {
    const root = makeTempDir();
    const workerDir = path.join(root, 'bad-worker');
    mkdirSync(workerDir, { recursive: true });
    writeFileSync(
      path.join(workerDir, 'worker.yaml'),
      'apiVersion: agentteams.io/v1beta1\nkind: Worker\nmetadata:\n  name: bad\nspec:\n  runtime: openclaw\n',
    );
    expect(runPack(['worker', workerDir])).toBe(1);
  });

  it('apply worker --zip generates a Worker CR from an AgentTeams-native package', () => {
    const root = makeTempDir();
    const workerDir = path.join(root, 'qa-worker');
    mkdirSync(path.join(workerDir, 'skills', 'verify'), { recursive: true });
    writeFileSync(
      path.join(workerDir, 'worker.yaml'),
      'apiVersion: agentteams.io/v1beta1\nkind: Worker\nmetadata:\n  name: qa-worker\nspec:\n  model: qwen3.5-plus\n  runtime: openclaw\n  skills:\n    - verify\n',
    );
    writeFileSync(path.join(workerDir, 'skills', 'verify', 'SKILL.md'), '# verify\n');

    const zipPath = path.join(root, 'qa-worker.zip');
    expect(runPack(['worker', workerDir, '--output', zipPath])).toBe(0);

    const output = path.join(root, 'applied-worker.yaml');
    expect(
      runApply([
        'worker',
        '--zip',
        zipPath,
        '--package-uri',
        'packages/qa-worker.zip',
        '--output',
        output,
      ]),
    ).toBe(0);
    expect(existsSync(output)).toBe(true);
    const cr = readFileSync(output, 'utf8');
    expect(cr).toContain('apiVersion: agentteams.io/v1beta1');
    expect(cr).toContain('kind: Worker');
    expect(cr).toContain('name: qa-worker');
    expect(cr).toContain('package: packages/qa-worker.zip');
  });

  it('apply worker fails for a non-package ZIP', () => {
    const root = makeTempDir();
    const zipPath = path.join(root, 'bad.zip');
    const zip = new AdmZip();
    zip.addFile('notes.txt', Buffer.from('hi'));
    zip.writeZip(zipPath);
    expect(runApply(['worker', '--zip', zipPath])).toBe(1);
  });

  it('pack project produces a project soul package with team blueprint', () => {
    const root = makeTempDir();
    const projectDir = path.join(root, 'project');
    mkdirSync(path.join(projectDir, '.agents', 'examples'), { recursive: true });
    mkdirSync(path.join(projectDir, '.agents', 'skills', 'triage'), { recursive: true });
    mkdirSync(path.join(projectDir, 'docs', 'contracts'), { recursive: true });
    writeFileSync(
      path.join(projectDir, '.agents', 'examples', 'team.yaml'),
      'apiVersion: agentteams.io/v1beta1\nkind: Team\nmetadata:\n  name: devflow-team\nspec:\n  description: Test team\n  workerMembers:\n    - name: devflow-leader\n      role: team_leader\n    - name: qa-worker\n      role: worker\n',
    );
    writeFileSync(
      path.join(projectDir, '.agents', 'skills', 'triage', 'SKILL.md'),
      '# triage\n',
    );
    writeFileSync(
      path.join(projectDir, 'docs', 'contracts', 'process-dag.md'),
      '# PROCESS DAG\n',
    );

    const output = path.join(root, 'soul.zip');
    expect(runPack(['project', projectDir, '--output', output])).toBe(0);
    expect(existsSync(output)).toBe(true);

    const zip = new AdmZip(output);
    const names = zip.getEntries().map((entry) => entry.entryName).sort();
    expect(names).toContain('manifest.json');
    expect(names).toContain('skills/triage/SKILL.md');
    expect(names).toContain('contracts/process-dag.md');
    expect(zip.readAsText('manifest.json')).toContain('devflow-team');
  });

  it('apply project --zip generates multi-doc team setup YAML', () => {
    const root = makeTempDir();
    const projectDir = path.join(root, 'project');
    mkdirSync(path.join(projectDir, '.agents', 'examples'), { recursive: true });
    writeFileSync(
      path.join(projectDir, '.agents', 'examples', 'team.yaml'),
      'apiVersion: agentteams.io/v1beta1\nkind: Team\nmetadata:\n  name: devflow-team\nspec:\n  workerMembers:\n    - name: devflow-leader\n      role: team_leader\n    - name: qa-worker\n      role: worker\n',
    );

    const zipPath = path.join(root, 'soul.zip');
    expect(runPack(['project', projectDir, '--output', zipPath])).toBe(0);

    const output = path.join(root, 'team-setup.yaml');
    expect(runApply(['project', '--zip', zipPath, '--output', output])).toBe(0);
    expect(existsSync(output)).toBe(true);
    const setup = readFileSync(output, 'utf8');
    expect((setup.match(/^kind: Worker$/gm) ?? []).length).toBe(2);
    expect((setup.match(/^kind: Team$/gm) ?? []).length).toBe(1);
    expect(setup).toContain('name: devflow-team');
    expect(setup).toContain('role: team_leader');
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
