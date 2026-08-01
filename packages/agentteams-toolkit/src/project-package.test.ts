import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import AdmZip from 'adm-zip';
import {
  readTeamBlueprint,
  packAgentTeamsProject,
  readProjectPackage,
  buildTeamSetupFromPackage,
  validateProjectPackage,
} from './project-package.js';

const TEAM_YAML = `apiVersion: agentteams.io/v1beta1
kind: Team
metadata:
  name: devflow-team
spec:
  description: DevFlow development team
  workerMembers:
    - name: devflow-leader
      role: team_leader
    - name: triage-worker
      role: worker
    - name: qa-worker
      role: worker
`;

let tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'atk-pp-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs = [];
});

function makeProjectDir(): string {
  const dir = makeTempDir();
  mkdirSync(path.join(dir, '.agents', 'examples'), { recursive: true });
  mkdirSync(path.join(dir, '.agents', 'skills', 'triage'), { recursive: true });
  mkdirSync(path.join(dir, 'docs', 'contracts'), { recursive: true });
  mkdirSync(path.join(dir, 'config'), { recursive: true });
  writeFileSync(path.join(dir, '.agents', 'examples', 'team.yaml'), TEAM_YAML);
  writeFileSync(
    path.join(dir, '.agents', 'examples', 'worker.yaml'),
    'apiVersion: agentteams.io/v1beta1\nkind: Worker\nmetadata:\n  name: qa-worker\nspec:\n  model: qwen3.5-plus\n  runtime: openclaw\n',
  );
  writeFileSync(path.join(dir, '.agents', 'skills', 'triage', 'SKILL.md'), '# triage\n');
  writeFileSync(path.join(dir, 'docs', 'contracts', 'process-dag.md'), '# PROCESS DAG\n');
  writeFileSync(path.join(dir, 'config', 'SOUL.md'), '# DevFlow Soul\n');
  writeFileSync(path.join(dir, 'config', 'AGENTS.md'), '# DevFlow Agents\n');
  return dir;
}

describe('readTeamBlueprint', () => {
  it('解析 v1beta1 workerMembers，保证有且仅有一个 team_leader', () => {
    const dir = makeTempDir();
    mkdirSync(path.join(dir, '.agents', 'examples'), { recursive: true });
    writeFileSync(path.join(dir, '.agents', 'examples', 'team.yaml'), TEAM_YAML);
    const blueprint = readTeamBlueprint(dir);
    expect(blueprint.name).toBe('devflow-team');
    expect(blueprint.workers.map((w) => w.name)).toEqual([
      'devflow-leader',
      'triage-worker',
      'qa-worker',
    ]);
    expect(blueprint.workers.filter((w) => w.role === 'team_leader')).toHaveLength(1);
  });

  it('兼容 v1 字符串列表 workers，自动补 team_leader', () => {
    const dir = makeTempDir();
    mkdirSync(path.join(dir, '.agents', 'examples'), { recursive: true });
    writeFileSync(
      path.join(dir, '.agents', 'examples', 'team.yaml'),
      'apiVersion: agentteams.io/v1\nkind: Team\nmetadata:\n  name: devflow-team\nspec:\n  workers: [triage-worker, qa-worker]\n',
    );
    const blueprint = readTeamBlueprint(dir);
    expect(blueprint.workers[0].role).toBe('team_leader');
    expect(blueprint.workers[0].name).toBe('devflow-leader');
    expect(blueprint.workers).toHaveLength(3);
  });

  it('缺少团队蓝图时抛错', () => {
    const dir = makeTempDir();
    expect(() => readTeamBlueprint(dir)).toThrow(/team.yaml/);
  });
});

describe('packAgentTeamsProject', () => {
  it('打包项目灵魂包（manifest + config/ + skills/ + contracts/）', () => {
    const dir = makeProjectDir();
    const output = path.join(dir, 'soul.zip');
    const result = packAgentTeamsProject(dir, { output });

    expect(result.manifest.team?.name).toBe('devflow-team');
    expect(result.manifest.team?.workers).toHaveLength(3);
    expect(result.manifest.project?.name).toBe('devflow');
    expect(existsSync(output)).toBe(true);

    const zip = new AdmZip(output);
    const names = zip.getEntries().map((entry) => entry.entryName).sort();
    expect(names).toContain('manifest.json');
    expect(names).toContain('config/SOUL.md');
    expect(names).toContain('config/AGENTS.md');
    expect(names).toContain('skills/triage/SKILL.md');
    expect(names).toContain('contracts/process-dag.md');
  });

  it('默认输出文件名 <project>@<version>-soul.zip', () => {
    const dir = makeProjectDir();
    const result = packAgentTeamsProject(dir);
    expect(result.archivePath).toContain('devflow@1.0-soul.zip');
  });
});

describe('buildTeamSetupFromPackage', () => {
  it('从项目灵魂包生成多 Worker CR + Team CR 批量 YAML', () => {
    const dir = makeProjectDir();
    const output = path.join(dir, 'soul.zip');
    packAgentTeamsProject(dir, { output });

    const pkg = readProjectPackage(output);
    const setup = buildTeamSetupFromPackage(pkg, {
      packageUri: 'packages/devflow-agent@1.0-soul.zip',
    });

    const workerCount = (setup.match(/^kind: Worker$/gm) ?? []).length;
    const teamCount = (setup.match(/^kind: Team$/gm) ?? []).length;
    expect(workerCount).toBe(3);
    expect(teamCount).toBe(1);
    expect(setup).toContain('name: devflow-leader');
    expect(setup).toContain('name: triage-worker');
    expect(setup).toContain('name: qa-worker');
    expect(setup).toContain('package: packages/devflow-agent@1.0-soul.zip');
    expect(setup).toContain('workerMembers:');
    expect(setup).toContain('role: team_leader');
    expect(setup).toContain('role: worker');
  });

  it('--inline 内联 config/SOUL.md 到 Worker CR', () => {
    const dir = makeProjectDir();
    const output = path.join(dir, 'soul.zip');
    packAgentTeamsProject(dir, { output });

    const pkg = readProjectPackage(output);
    const setup = buildTeamSetupFromPackage(pkg, { inlineConfig: true });
    expect(setup).toContain('soul: |');
    expect(setup).toContain('DevFlow Soul');
  });
});

describe('validateProjectPackage', () => {
  it('通过合法项目灵魂包', () => {
    const dir = makeProjectDir();
    const output = path.join(dir, 'soul.zip');
    packAgentTeamsProject(dir, { output });
    expect(validateProjectPackage(output)).toEqual([]);
  });

  it('拒绝缺少 team.workers 蓝图的包', () => {
    const dir = makeTempDir();
    const bad = path.join(dir, 'bad.zip');
    const zip = new AdmZip();
    zip.addFile(
      'manifest.json',
      Buffer.from(JSON.stringify({ version: '1.0', worker: { suggested_name: 'w' } })),
    );
    zip.writeZip(bad);
    expect(validateProjectPackage(bad).some((e) => e.includes('team.workers'))).toBe(true);
  });

  it('拒绝多个 team_leader', () => {
    const dir = makeTempDir();
    const bad = path.join(dir, 'bad.zip');
    const zip = new AdmZip();
    zip.addFile(
      'manifest.json',
      Buffer.from(
        JSON.stringify({
          version: '1.0',
          worker: { suggested_name: 'a' },
          team: {
            name: 't',
            workers: [
              { name: 'a', role: 'team_leader' },
              { name: 'b', role: 'team_leader' },
            ],
          },
        }),
      ),
    );
    zip.writeZip(bad);
    expect(validateProjectPackage(bad).some((e) => e.includes('team_leader'))).toBe(true);
  });
});
