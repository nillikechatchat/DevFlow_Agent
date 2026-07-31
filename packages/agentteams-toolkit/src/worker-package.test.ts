import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import AdmZip from 'adm-zip';
import { readWorkerConfig, packWorker } from './worker-package.js';

const WORKER_YAML = `apiVersion: agentteams.io/v1
kind: Worker
metadata:
  name: qa-worker
spec:
  version: 1.0.0
  runtime: openclaw
  role: qa
  skills:
    - verify
    - retro
  token:
    type: consumer
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
  writeFileSync(path.join(workerDir, 'README.md'), '# QA Worker');
  writeFileSync(path.join(workerDir, 'skills', 'verify', 'SKILL.md'), '# verify\n');
  return workerDir;
}

describe('readWorkerConfig', () => {
  it('解析 worker.yaml 主配置（name/version/skills）', () => {
    const { configPath, spec } = readWorkerConfig(makeWorkerDir());
    expect(configPath.endsWith('worker.yaml')).toBe(true);
    expect(spec.name).toBe('qa-worker');
    expect(spec.version).toBe('1.0.0');
    expect(spec.skills).toEqual(['verify', 'retro']);
  });

  it('缺少主配置时抛错', () => {
    const dir = makeTempDir();
    expect(() => readWorkerConfig(dir)).toThrow(/worker.yaml/);
  });
});

describe('packWorker', () => {
  it('打包 Worker ZIP（主配置 + README + 内置 skills）', () => {
    const workerDir = makeWorkerDir();
    const output = path.join(workerDir, 'qa-worker.zip');
    const result = packWorker(workerDir, { output });

    expect(result.name).toBe('qa-worker');
    expect(result.version).toBe('1.0.0');
    expect(existsSync(output)).toBe(true);

    const zip = new AdmZip(output);
    const names = zip.getEntries().map((entry) => entry.entryName).sort();
    expect(names).toContain('worker.yaml');
    expect(names).toContain('README.md');
    expect(names).toContain('skills/verify/SKILL.md');
    expect(zip.readAsText('worker.yaml')).toContain('name: qa-worker');
  });

  it('默认输出文件名 <name>@<version>.zip', () => {
    const workerDir = makeWorkerDir();
    const result = packWorker(workerDir);
    expect(result.archivePath).toContain('qa-worker@1.0.0.zip');
  });

  it('--version 覆盖 spec 版本号', () => {
    const workerDir = makeWorkerDir();
    const result = packWorker(workerDir, { version: '2.0.0' });
    expect(result.version).toBe('2.0.0');
    expect(result.archivePath).toContain('qa-worker@2.0.0.zip');
  });
});
