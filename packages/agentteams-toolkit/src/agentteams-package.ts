import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import AdmZip from 'adm-zip';

export const AGENTTEAMS_API_VERSION = 'agentteams.io/v1beta1';
export const AGENTTEAMS_PACKAGE_VERSION = '1.0';
export const AGENTTEAMS_RUNTIMES = ['openclaw', 'copaw', 'hermes'] as const;

export interface AgentTeamsManifestWorker {
  suggested_name: string;
  model: string;
  runtime: string;
  base_image?: string;
  apt_packages?: string[];
  pip_packages?: string[];
  npm_packages?: string[];
}

export interface AgentTeamsManifest {
  version: string;
  source: {
    openclaw_version?: string;
    hostname?: string;
    os?: string;
    created_at: string;
  };
  worker: AgentTeamsManifestWorker;
}

export interface WorkerYaml {
  apiVersion?: unknown;
  kind?: unknown;
  metadata?: { name?: unknown };
  spec?: {
    model?: unknown;
    runtime?: unknown;
    image?: unknown;
    soul?: unknown;
    agents?: unknown;
    skills?: unknown;
    version?: unknown;
    [key: string]: unknown;
  };
}

export function readWorkerYaml(dir: string): { configPath: string; doc: WorkerYaml } {
  const candidates = ['worker.yaml', 'worker.yml', 'worker.json'];
  const configPath = candidates
    .map((name) => path.join(dir, name))
    .find((full) => existsSync(full) && statSync(full).isFile());
  if (!configPath) {
    throw new Error(`worker 目录 ${dir} 缺少主配置文件 worker.yaml`);
  }
  const raw = readFileSync(configPath, 'utf8');
  const doc = configPath.endsWith('.json')
    ? (JSON.parse(raw) as WorkerYaml)
    : (parse(raw) as WorkerYaml);
  if (typeof doc !== 'object' || doc === null) {
    throw new Error('worker.yaml 必须是 YAML 对象');
  }
  return { configPath, doc };
}

export function parseAgentTeamsManifest(content: string): AgentTeamsManifest {
  const doc = JSON.parse(content) as Partial<AgentTeamsManifest>;
  if (typeof doc !== 'object' || doc === null || typeof doc.worker !== 'object' || doc.worker === null) {
    throw new Error('manifest.json 缺少 worker 配置');
  }
  const worker = doc.worker as Partial<AgentTeamsManifestWorker>;
  if (!worker.suggested_name || typeof worker.suggested_name !== 'string') {
    throw new Error('manifest.json worker.suggested_name 必填');
  }
  if (!worker.model || typeof worker.model !== 'string') {
    throw new Error('manifest.json worker.model 必填');
  }
  const runtime = worker.runtime ?? 'openclaw';
  if (!(AGENTTEAMS_RUNTIMES as readonly string[]).includes(runtime)) {
    throw new Error(`manifest.json worker.runtime 必须为 ${AGENTTEAMS_RUNTIMES.join('/')}`);
  }
  const now = new Date().toISOString();
  return {
    version: doc.version ?? AGENTTEAMS_PACKAGE_VERSION,
    source: {
      openclaw_version: doc.source?.openclaw_version,
      hostname: doc.source?.hostname,
      os: doc.source?.os,
      created_at: doc.source?.created_at ?? now,
    },
    worker: {
      suggested_name: worker.suggested_name,
      model: worker.model,
      runtime,
      base_image: worker.base_image,
      apt_packages: worker.apt_packages,
      pip_packages: worker.pip_packages,
      npm_packages: worker.npm_packages,
    },
  };
}

export function serializeAgentTeamsManifest(manifest: AgentTeamsManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function manifestFromWorkerYaml(
  doc: WorkerYaml,
  options: { model?: string; runtime?: string; baseImage?: string; aptPackages?: string[]; pipPackages?: string[]; npmPackages?: string[] } = {},
): AgentTeamsManifest {
  const name = doc?.metadata?.name;
  if (!name || typeof name !== 'string') {
    throw new Error('worker.yaml 缺少 metadata.name');
  }
  const model = options.model ?? doc?.spec?.model;
  if (!model || typeof model !== 'string') {
    throw new Error(`worker.yaml 缺少 spec.model（或用 --model 指定）`);
  }
  const runtime = options.runtime ?? doc?.spec?.runtime ?? 'openclaw';
  if (!(AGENTTEAMS_RUNTIMES as readonly string[]).includes(runtime as string)) {
    throw new Error(`spec.runtime 必须为 ${AGENTTEAMS_RUNTIMES.join('/')}`);
  }
  const now = new Date().toISOString();
  return {
    version: AGENTTEAMS_PACKAGE_VERSION,
    source: {
      hostname: undefined,
      os: undefined,
      created_at: now,
    },
    worker: {
      suggested_name: name,
      model,
      runtime: runtime as string,
      base_image:
        options.baseImage ??
        (typeof doc?.spec?.image === 'string' ? doc.spec.image : undefined),
      apt_packages: options.aptPackages,
      pip_packages: options.pipPackages,
      npm_packages: options.npmPackages,
    },
  };
}

export interface AgentTeamsPackageOptions {
  output?: string;
  version?: string;
  model?: string;
  runtime?: string;
  baseImage?: string;
  aptPackages?: string[];
  pipPackages?: string[];
  npmPackages?: string[];
}

export interface PackedAgentTeamsWorker {
  archivePath: string;
  manifest: AgentTeamsManifest;
  entryCount: number;
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

function addDirIfExists(
  zip: AdmZip,
  absoluteDir: string,
  zipPrefix: string,
  filter?: (relative: string) => boolean,
): void {
  if (!existsSync(absoluteDir) || !statSync(absoluteDir).isDirectory()) return;
  for (const file of listFiles(absoluteDir)) {
    const relative = path.relative(absoluteDir, file);
    if (filter && !filter(relative)) continue;
    zip.addFile(
      `${zipPrefix}${relative.replaceAll(path.sep, '/')}`,
      Buffer.from(readFileSync(file)),
    );
  }
}

export function packAgentTeamsWorker(
  workerDir: string,
  options: AgentTeamsPackageOptions = {},
): PackedAgentTeamsWorker {
  const { configPath, doc } = readWorkerYaml(workerDir);
  const root = path.dirname(configPath);
  const manifest = manifestFromWorkerYaml(doc, options);  const name = manifest.worker.suggested_name;
  const version = options.version ?? manifest.version;
  manifest.version = version;
  const output =
    options.output ??
    path.resolve(workerDir, `${name}@${version}.zip`);

  const zip = new AdmZip();
  zip.addFile(
    'manifest.json',
    Buffer.from(serializeAgentTeamsManifest(manifest), 'utf8'),
  );

  const configDir = path.join(root, 'config');
  if (existsSync(configDir) && statSync(configDir).isDirectory()) {
    addDirIfExists(zip, configDir, 'config/');
  }
  const soul = doc?.spec?.soul;
  if (soul && typeof soul === 'string' && soul.trim().length > 0) {
    zip.addFile('config/SOUL.md', Buffer.from(soul.trimEnd() + '\n', 'utf8'));
  }
  const agents = doc?.spec?.agents;
  if (agents && typeof agents === 'string' && agents.trim().length > 0) {
    zip.addFile('config/AGENTS.md', Buffer.from(agents.trimEnd() + '\n', 'utf8'));
  }

  addDirIfExists(zip, path.join(root, 'skills'), 'skills/');
  addDirIfExists(zip, path.join(root, 'crons'), 'crons/');
  const dockerfile = path.join(root, 'Dockerfile');
  if (existsSync(dockerfile) && statSync(dockerfile).isFile()) {
    zip.addFile('Dockerfile', Buffer.from(readFileSync(dockerfile)));
  }

  zip.writeZip(output);
  return { archivePath: output, manifest, entryCount: zip.getEntries().length };
}

export interface AgentTeamsPackageContent {
  manifest: AgentTeamsManifest;
  entries: { entryName: string; content: string }[];
  hasConfigFile: (fileName: string) => boolean;
  configFile: (fileName: string) => string | undefined;
}

export function readAgentTeamsPackage(archivePath: string): AgentTeamsPackageContent {
  const zip = new AdmZip(archivePath);
  const entries = zip
    .getEntries()
    .filter((entry) => !entry.isDirectory)
    .map((entry) => ({
      entryName: entry.entryName.replace(/\\/g, '/'),
      content: entry.getData().toString('utf8'),
    }));

  const manifestEntry = entries.find((entry) => entry.entryName === 'manifest.json');
  if (!manifestEntry) {
    throw new Error('ZIP 包缺少 manifest.json（AgentTeams 原生工具包必需）');
  }
  const manifest = parseAgentTeamsManifest(manifestEntry.content);

  const configNames = new Map<string, string>();
  for (const entry of entries) {
    if (entry.entryName.startsWith('config/')) {
      configNames.set(path.basename(entry.entryName), entry.content);
    }
  }

  return {
    manifest,
    entries,
    hasConfigFile: (fileName) => configNames.has(fileName),
    configFile: (fileName) => configNames.get(fileName),
  };
}

export interface WorkerCrOptions {
  name?: string;
  packageUri?: string;
  inlineConfig?: boolean;
  skills?: string[];
}

export function buildWorkerCrFromPackage(
  pkg: AgentTeamsPackageContent,
  options: WorkerCrOptions = {},
): string {
  const manifest = pkg.manifest;
  const name = options.name ?? manifest.worker.suggested_name;
  const lines: string[] = [
    `apiVersion: ${AGENTTEAMS_API_VERSION}`,
    'kind: Worker',
    'metadata:',
    `  name: ${name}`,
    'spec:',
    `  model: ${manifest.worker.model}`,
    `  runtime: ${manifest.worker.runtime}`,
  ];
  if (options.packageUri) {
    lines.push(`  package: ${options.packageUri}`);
  }
  const skills = options.skills ?? [];
  if (skills.length > 0) {
    lines.push(`  skills: [${skills.join(', ')}]`);
  }
  if (options.inlineConfig) {
    const soul = pkg.configFile('SOUL.md');
    if (soul) {
      lines.push('  soul: |');
      for (const line of soul.trimEnd().split('\n')) {
        lines.push(`    ${line}`);
      }
    }
    const agents = pkg.configFile('AGENTS.md');
    if (agents) {
      lines.push('  agents: |');
      for (const line of agents.trimEnd().split('\n')) {
        lines.push(`    ${line}`);
      }
    }
  }
  return `${lines.join('\n')}\n`;
}

export function validateAgentTeamsPackage(archivePath: string): string[] {
  const errors: string[] = [];
  let zip: AdmZip;
  try {
    zip = new AdmZip(archivePath);
  } catch (error) {
    return [`无法读取 ZIP 包: ${String(error)}`];
  }
  const entryNames = zip
    .getEntries()
    .filter((entry) => !entry.isDirectory)
    .map((entry) => entry.entryName.replace(/\\/g, '/'));

  if (!entryNames.includes('manifest.json')) {
    errors.push('缺少 manifest.json');
  }
  if (entryNames.length === 0) {
    errors.push('ZIP 包为空');
  }
  try {
    const manifestEntry = entryNames.find((name) => name === 'manifest.json');
    if (manifestEntry) {
      parseAgentTeamsManifest(zip.readAsText(manifestEntry));
    }
  } catch (error) {
    errors.push(`manifest.json 无效: ${String(error)}`);
  }
  return errors;
}
