import path from 'node:path';
import { packAgentTeamsWorker, readWorkerYaml } from './agentteams-package.js';

export * from './agentteams-package.js';

export interface WorkerPackageSpec {
  name: string;
  version: string;
  skills?: string[];
}

export interface WorkerPackageOptions {
  version?: string;
  output?: string;
  model?: string;
  runtime?: string;
  baseImage?: string;
  aptPackages?: string[];
  pipPackages?: string[];
  npmPackages?: string[];
}

export function readWorkerConfig(dir: string): {
  configPath: string;
  spec: WorkerPackageSpec;
} {
  const { configPath, doc } = readWorkerYaml(dir);
  const name = doc?.metadata?.name;
  if (!name || typeof name !== 'string') {
    throw new Error(`worker.yaml 缺少 metadata.name`);
  }
  const skillsRaw = doc?.spec?.skills;
  const skills = Array.isArray(skillsRaw)
    ? skillsRaw.map((skill: unknown) => String(skill))
    : undefined;
  return {
    configPath,
    spec: { name, version: '0.1.0', skills },
  };
}

export interface PackedWorker {
  archivePath: string;
  name: string;
  version: string;
  entryCount: number;
}

export function packWorker(
  workerDir: string,
  options: WorkerPackageOptions = {},
): PackedWorker {
  const result = packAgentTeamsWorker(workerDir, {
    output: options.output,
    version: options.version,
    model: options.model,
    runtime: options.runtime,
    baseImage: options.baseImage,
    aptPackages: options.aptPackages,
    pipPackages: options.pipPackages,
    npmPackages: options.npmPackages,
  });
  return {
    archivePath: result.archivePath,
    name: result.manifest.worker.suggested_name,
    version: result.manifest.version,
    entryCount: result.entryCount,
  };
}

export function resolvePackageOutput(
  workerDir: string,
  name: string,
  version: string,
  output?: string,
): string {
  return output ?? path.resolve(workerDir, `${name}@${version}.zip`);
}
