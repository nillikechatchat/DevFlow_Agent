import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import AdmZip from 'adm-zip';
import { readWorkerConfig, packWorker } from './worker-package.js';
import {
  readAgentTeamsPackage,
  buildWorkerCrFromPackage,
  validateAgentTeamsPackage,
  parseAgentTeamsManifest,
} from './agentteams-package.js';

const WORKER_YAML = `apiVersion: agentteams.io/v1beta1
kind: Worker
metadata:
  name: qa-worker
spec:
  model: qwen3.5-plus
  runtime: openclaw
  soul: |
    你是质量保障 Agent，负责 verify 门禁。
  agents: |
    - 监控 CI 流水线
  skills:
    - verify
    - retro
`;

let tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'atk-wp-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs = [];
});

function makeWorkerDir(): string {
  const dir = makeTempDir();
  const workerDir = path.join(dir, 'qa-worker');
  mkdirSync(path.join(workerDir, 'skills', 'verify'), { recursive: true });
  writeFileSync(path.join(workerDir, 'worker.yaml'), WORKER_YAML);
  writeFileSync(path.join(workerDir, 'skills', 'verify', 'SKILL.md'), '# verify\n');
  return workerDir;
}

describe('readWorkerConfig', () => {
  it('解析 worker.yaml 主配置（name/skills）', () => {
    const { configPath, spec } = readWorkerConfig(makeWorkerDir());
    expect(configPath.endsWith('worker.yaml')).toBe(true);
    expect(spec.name).toBe('qa-worker');
    expect(spec.skills).toEqual(['verify', 'retro']);
  });

  it('缺少主配置时抛错', () => {
    const dir = makeTempDir();
    expect(() => readWorkerConfig(dir)).toThrow(/worker.yaml/);
  });
});

describe('packWorker (AgentTeams 原生工具包)', () => {
  it('打包 AgentTeams 原生 Worker ZIP（manifest.json + config/ + skills/）', () => {
    const workerDir = makeWorkerDir();
    const output = path.join(workerDir, 'qa-worker.zip');
    const result = packWorker(workerDir, { output });

    expect(result.name).toBe('qa-worker');
    expect(result.version).toBe('1.0');
    expect(existsSync(output)).toBe(true);

    const zip = new AdmZip(output);
    const names = zip.getEntries().map((entry) => entry.entryName).sort();
    expect(names).toContain('manifest.json');
    expect(names).toContain('config/SOUL.md');
    expect(names).toContain('config/AGENTS.md');
    expect(names).toContain('skills/verify/SKILL.md');

    const manifest = parseAgentTeamsManifest(zip.readAsText('manifest.json'));
    expect(manifest.worker.suggested_name).toBe('qa-worker');
    expect(manifest.worker.model).toBe('qwen3.5-plus');
    expect(manifest.worker.runtime).toBe('openclaw');
  });

  it('config/SOUL.md 与 config/AGENTS.md 来自 worker.yaml 的 soul/agents 字段', () => {
    const workerDir = makeWorkerDir();
    const output = path.join(workerDir, 'qa-worker.zip');
    packWorker(workerDir, { output });

    const zip = new AdmZip(output);
    expect(zip.readAsText('config/SOUL.md')).toContain('质量保障 Agent');
    expect(zip.readAsText('config/AGENTS.md')).toContain('监控 CI 流水线');
  });

  it('默认输出文件名 <name>@<version>.zip', () => {
    const workerDir = makeWorkerDir();
    const result = packWorker(workerDir);
    expect(result.archivePath).toContain('qa-worker@1.0.zip');
  });

  it('--version 覆盖包版本号', () => {
    const workerDir = makeWorkerDir();
    const result = packWorker(workerDir, { version: '2.0.0' });
    expect(result.version).toBe('2.0.0');
    expect(result.archivePath).toContain('qa-worker@2.0.0.zip');
  });

  it('缺少 spec.model 时抛错，可用 --model 补齐', () => {
    const workerDir = makeTempDir();
    mkdirSync(workerDir, { recursive: true });
    writeFileSync(
      path.join(workerDir, 'worker.yaml'),
      'apiVersion: agentteams.io/v1beta1\nkind: Worker\nmetadata:\n  name: alice\nspec:\n  runtime: openclaw\n',
    );
    expect(() => packWorker(workerDir)).toThrow(/spec.model/);

    const result = packWorker(workerDir, { model: 'qwen3.5-plus' });
    const zip = new AdmZip(result.archivePath);
    const manifest = parseAgentTeamsManifest(zip.readAsText('manifest.json'));
    expect(manifest.worker.model).toBe('qwen3.5-plus');
  });
});

describe('readAgentTeamsPackage / buildWorkerCrFromPackage / validateAgentTeamsPackage', () => {
  it('从 ZIP 读取 manifest 并生成 Worker CR（spec.package 引用）', () => {
    const workerDir = makeWorkerDir();
    const output = path.join(workerDir, 'qa-worker.zip');
    packWorker(workerDir, { output });

    const pkg = readAgentTeamsPackage(output);
    expect(pkg.manifest.worker.suggested_name).toBe('qa-worker');
    expect(pkg.hasConfigFile('SOUL.md')).toBe(true);

    const cr = buildWorkerCrFromPackage(pkg, {
      packageUri: 'packages/qa-worker.zip',
      skills: ['verify', 'retro'],
    });
    expect(cr).toContain('apiVersion: agentteams.io/v1beta1');
    expect(cr).toContain('kind: Worker');
    expect(cr).toContain('name: qa-worker');
    expect(cr).toContain('model: qwen3.5-plus');
    expect(cr).toContain('runtime: openclaw');
    expect(cr).toContain('package: packages/qa-worker.zip');
    expect(cr).toContain('skills: [verify, retro]');
  });

  it('--name 覆盖 Worker 名称，--inline 内联 SOUL.md/AGENTS.md', () => {
    const workerDir = makeWorkerDir();
    const output = path.join(workerDir, 'qa-worker.zip');
    packWorker(workerDir, { output });

    const pkg = readAgentTeamsPackage(output);
    const cr = buildWorkerCrFromPackage(pkg, { name: 'qa-lead', inlineConfig: true });
    expect(cr).toContain('name: qa-lead');
    expect(cr).toContain('soul: |');
    expect(cr).toContain('你是质量保障 Agent');
    expect(cr).toContain('agents: |');
  });

  it('validateAgentTeamsPackage 通过合法包、拒绝缺 manifest 的包', () => {
    const workerDir = makeWorkerDir();
    const output = path.join(workerDir, 'qa-worker.zip');
    packWorker(workerDir, { output });
    expect(validateAgentTeamsPackage(output)).toEqual([]);

    const bad = path.join(workerDir, 'bad.zip');
    const zip = new AdmZip();
    zip.addFile('notes.txt', Buffer.from('hi'));
    zip.writeZip(bad);
    const errors = validateAgentTeamsPackage(bad);
    expect(errors.some((e) => e.includes('manifest.json'))).toBe(true);
  });
});
