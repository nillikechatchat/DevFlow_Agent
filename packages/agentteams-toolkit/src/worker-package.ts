import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import AdmZip from 'adm-zip';

export interface WorkerPackageSpec {
  name: string;
  version: string;
  skills?: string[];
}

export interface WorkerPackageOptions {
  version?: string;
  output?: string;
}

function listFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...listFiles(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

function findWorkerConfig(dir: string): string | null {
  const candidates = ['worker.yaml', 'worker.yml', 'worker.json'];
  for (const name of candidates) {
    const full = path.join(dir, name);
    if (existsSync(full) && statSync(full).isFile()) return full;
  }
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    for (const name of candidates) {
      const nested = path.join(full, name);
      if (existsSync(nested) && statSync(nested).isFile()) return nested;
    }
  }
  return null;
}

export function readWorkerConfig(dir: string): {
  configPath: string;
  spec: WorkerPackageSpec;
} {
  const configPath = findWorkerConfig(dir);
  if (!configPath) {
    throw new Error(`worker 目录 ${dir} 缺少主配置文件 worker.yaml（根目录或一级子目录）`);
  }
  const raw = readFileSync(configPath, 'utf8');
  const doc = configPath.endsWith('.json')
    ? JSON.parse(raw)
    : parse(raw);
  const metadataName = doc?.metadata?.name;
  const specName = doc?.spec?.name ?? doc?.name;
  const name = metadataName ?? specName;
  if (!name || typeof name !== 'string') {
    throw new Error(`worker.yaml 未定义 name（metadata.name 或 spec.name）`);
  }
  const version =
    (doc?.spec?.version as string | undefined) ??
    (doc?.version as string | undefined) ??
    '0.1.0';
  const skillsRaw = doc?.spec?.skills ?? doc?.skills;
  const skills = Array.isArray(skillsRaw)
    ? skillsRaw.map((skill: unknown) => String(skill))
    : undefined;
  return { configPath, spec: { name, version, skills } };
}

export interface PackedWorker {
  archivePath: string;
  name: string;
  version: string;
  entryCount: number;
}

export function packWorker(workerDir: string, options: WorkerPackageOptions = {}): PackedWorker {
  const { configPath, spec } = readWorkerConfig(workerDir);
  const root = path.dirname(configPath);
  const version = options.version ?? spec.version;
  const output = options.output ?? path.resolve(workerDir, `${spec.name}@${version}.zip`);

  const zip = new AdmZip();
  zip.addFile(path.basename(configPath), Buffer.from(readFileSync(configPath, 'utf8')));

  const readmeCandidates = ['README.md', 'readme.md'];
  for (const name of readmeCandidates) {
    const full = path.join(root, name);
    if (existsSync(full) && statSync(full).isFile()) {
      zip.addFile(name, Buffer.from(readFileSync(full, 'utf8')));
      break;
    }
  }

  const skillsDir = path.join(root, 'skills');
  if (existsSync(skillsDir) && statSync(skillsDir).isDirectory()) {
    for (const file of listFiles(skillsDir)) {
      const relative = path.relative(root, file);
      zip.addFile(relative.replaceAll(path.sep, '/'), Buffer.from(readFileSync(file)));
    }
  }

  zip.writeZip(output);
  return { archivePath: output, name: spec.name, version, entryCount: zip.getEntries().length };
}
