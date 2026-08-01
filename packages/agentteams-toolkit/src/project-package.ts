import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import AdmZip from 'adm-zip';
import {
  AGENTTEAMS_API_VERSION,
  AGENTTEAMS_PACKAGE_VERSION,
  AGENTTEAMS_RUNTIMES,
  serializeAgentTeamsManifest,
  type AgentTeamsManifest,
} from './agentteams-package.js';

export interface TeamWorkerBlueprint {
  name: string;
  role: 'team_leader' | 'worker';
  model: string;
  runtime: string;
  skills?: string[];
}

export interface TeamBlueprint {
  name: string;
  description?: string;
  workers: TeamWorkerBlueprint[];
}

export interface ProjectSoulManifest extends AgentTeamsManifest {
  project?: {
    name?: string;
    description?: string;
  };
  team?: TeamBlueprint;
}

export interface ProjectPackageOptions {
  output?: string;
  version?: string;
  model?: string;
  runtime?: string;
  packageUri?: string;
}

export interface PackedProjectSoul {
  archivePath: string;
  manifest: ProjectSoulManifest;
  entryCount: number;
}

const TEAM_FILE_CANDIDATES = ['team.yaml', 'team.yml', 'team.json'];

function findTeamBlueprint(dir: string): string | null {
  const roots = [
    dir,
    path.join(dir, '.agents', 'examples'),
    path.join(dir, '.agents'),
  ];
  for (const root of roots) {
    for (const name of TEAM_FILE_CANDIDATES) {
      const full = path.join(root, name);
      if (existsSync(full) && statSync(full).isFile()) return full;
    }
  }
  return null;
}

export interface ParsedTeamDocument {
  metadata?: { name?: unknown };
  spec?: {
    description?: unknown;
    workerMembers?: unknown;
    members?: unknown;
    workers?: unknown;
  };
}

function parseTeamDocument(content: string): ParsedTeamDocument {
  const doc = parse(content) as unknown;
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) {
    throw new Error('team.yaml 必须是 YAML 对象');
  }
  return doc as ParsedTeamDocument;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : undefined;
}

function normalizeWorkerList(
  value: unknown,
): { name?: unknown; role?: unknown }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === 'string' && item.trim().length > 0) {
      return [{ name: item, role: undefined }];
    }
    if (typeof item === 'object' && item !== null) {
      return [item as Record<string, unknown>];
    }
    return [];
  });
}

export function readTeamBlueprint(dir: string): TeamBlueprint {
  const blueprintPath = findTeamBlueprint(dir);
  if (!blueprintPath) {
    throw new Error(
      `项目目录 ${dir} 缺少团队蓝图 team.yaml（根目录、.agents/ 或 .agents/examples/）`,
    );
  }
  const doc = parseTeamDocument(readFileSync(blueprintPath, 'utf8'));
  const teamName = asString(doc?.metadata?.name);
  if (!teamName) {
    throw new Error('team.yaml 缺少 metadata.name');
  }
  const description = asString(doc?.spec?.description);
  const workers = normalizeWorkerList(
    doc?.spec?.workerMembers ?? doc?.spec?.workers,
  );
  if (workers.length === 0) {
    throw new Error('team.yaml 缺少 workerMembers（或 v1 workers 列表）');
  }

  const members: TeamWorkerBlueprint[] = workers.map((member, index) => {
    const name = asString(member.name);
    if (!name) {
      throw new Error(`workerMembers[${index}] 缺少 name`);
    }
    const rawRole = asString(member.role) ?? 'worker';
    const role: TeamWorkerBlueprint['role'] =
      rawRole === 'team_leader' ? 'team_leader' : 'worker';
    return {
      name,
      role,
      model: 'qwen3.5-plus',
      runtime: 'openclaw',
    };
  });

  if (!members.some((worker) => worker.role === 'team_leader')) {
    members.unshift({
      name: `${teamName.replace(/-team$/, '')}-leader`,
      role: 'team_leader',
      model: 'qwen3.5-plus',
      runtime: 'openclaw',
    });
  }

  return { name: teamName, description, workers: members };
}

export function projectNameFrom(dir: string, blueprint: TeamBlueprint): string {
  const pkg = existsSync(path.join(dir, 'package.json'))
    ? JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')) as {
        name?: string;
      }
    : undefined;
  return pkg?.name ?? blueprint.name.replace(/-team$/, '');
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

function findProjectSoulFile(dir: string, fileName: string): string | null {
  const candidates = [
    path.join(dir, 'config', fileName),
    path.join(dir, fileName),
    path.join(dir, '.agents', 'config', fileName),
    path.join(dir, '.agents', fileName),
  ];
  return candidates.find((full) => existsSync(full) && statSync(full).isFile()) ?? null;
}

export function packAgentTeamsProject(
  projectDir: string,
  options: ProjectPackageOptions = {},
): PackedProjectSoul {
  const root = path.resolve(projectDir);
  const blueprint = readTeamBlueprint(root);
  const projectName = projectNameFrom(root, blueprint);
  const version = options.version ?? AGENTTEAMS_PACKAGE_VERSION;
  const output =
    options.output ?? path.resolve(root, `${projectName}@${version}-soul.zip`);

  const now = new Date().toISOString();
  const manifest: ProjectSoulManifest = {
    version,
    source: { created_at: now },
    worker: {
      suggested_name: blueprint.workers[0].name,
      model: options.model ?? blueprint.workers[0].model,
      runtime: options.runtime ?? blueprint.workers[0].runtime,
    },
    project: {
      name: projectName,
      description: blueprint.description,
    },
    team: {
      name: blueprint.name,
      description: blueprint.description,
      workers: blueprint.workers.map((worker) => ({
        name: worker.name,
        role: worker.role,
        model: options.model ?? worker.model,
        runtime: options.runtime ?? worker.runtime,
        skills: worker.skills,
      })),
    },
  };

  const zip = new AdmZip();
  zip.addFile(
    'manifest.json',
    Buffer.from(serializeAgentTeamsManifest(manifest), 'utf8'),
  );

  addDirIfExists(zip, path.join(root, 'config'), 'config/');
  addDirIfExists(zip, path.join(root, 'skills'), 'skills/');
  addDirIfExists(zip, path.join(root, '.agents', 'skills'), 'skills/');
  addDirIfExists(zip, path.join(root, 'docs', 'contracts'), 'contracts/');
  addDirIfExists(zip, path.join(root, 'docs', 'contracts'), 'docs/contracts/');

  const soulSource = findProjectSoulFile(root, 'SOUL.md');
  if (soulSource && !zip.getEntries().some((entry) => entry.entryName === 'config/SOUL.md')) {
    zip.addFile('config/SOUL.md', Buffer.from(readFileSync(soulSource)));
  }
  const agentsSource = findProjectSoulFile(root, 'AGENTS.md');
  if (agentsSource && !zip.getEntries().some((entry) => entry.entryName === 'config/AGENTS.md')) {
    zip.addFile('config/AGENTS.md', Buffer.from(readFileSync(agentsSource)));
  }

  zip.writeZip(output);
  return { archivePath: output, manifest, entryCount: zip.getEntries().length };
}

export interface ProjectPackageContent {
  manifest: ProjectSoulManifest;
  entries: { entryName: string; content: string }[];
  hasFile: (entryName: string) => boolean;
}

export function readProjectPackage(archivePath: string): ProjectPackageContent {
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
    throw new Error('项目灵魂包缺少 manifest.json');
  }
  const manifest = JSON.parse(manifestEntry.content) as ProjectSoulManifest;
  if (!manifest.team || !Array.isArray(manifest.team.workers)) {
    throw new Error('manifest.json 缺少 team.workers 蓝图（非项目灵魂包）');
  }
  return {
    manifest,
    entries,
    hasFile: (entryName) =>
      entries.some((entry) => entry.entryName === entryName),
  };
}

export interface TeamSetupOptions {
  packageUri?: string;
  inlineConfig?: boolean;
  skillsApiUrl?: string;
}

export function buildTeamSetupFromPackage(
  pkg: ProjectPackageContent,
  options: TeamSetupOptions = {},
): string {
  const manifest = pkg.manifest;
  const team = manifest.team;
  if (!team) {
    throw new Error('项目灵魂包缺少 team 蓝图');
  }
  const packageUri =
    options.packageUri ??
    (manifest.worker.suggested_name ? `packages/${projectArchiveName(manifest)}` : '');

  const docs: string[] = [];

  const soul = pkg.entries.find((entry) => entry.entryName === 'config/SOUL.md')?.content;
  const agents = pkg.entries.find((entry) => entry.entryName === 'config/AGENTS.md')?.content;

  for (const worker of team.workers) {
    const lines: string[] = [
      `apiVersion: ${AGENTTEAMS_API_VERSION}`,
      'kind: Worker',
      'metadata:',
      `  name: ${worker.name}`,
      'spec:',
      `  model: ${worker.model}`,
      `  runtime: ${worker.runtime}`,
    ];
    if (packageUri) {
      lines.push(`  package: ${packageUri}`);
    }
    const skills = worker.skills ?? [];
    if (skills.length > 0) {
      lines.push(`  skills: [${skills.join(', ')}]`);
    }
    if (options.inlineConfig) {
      const roleSoul = pkg.entries.find(
        (entry) => entry.entryName === `config/soul-${worker.name}.md`,
      )?.content;
      const workerSoul = roleSoul ?? (worker.role === 'team_leader' ? soul : undefined);
      if (workerSoul) {
        lines.push('  soul: |');
        for (const line of workerSoul.trimEnd().split('\n')) {
          lines.push(`    ${line}`);
        }
      }
      if (agents) {
        lines.push('  agents: |');
        for (const line of agents.trimEnd().split('\n')) {
          lines.push(`    ${line}`);
        }
      }
    }
    docs.push(lines.join('\n'));
  }

  const teamLines: string[] = [
    `apiVersion: ${AGENTTEAMS_API_VERSION}`,
    'kind: Team',
    'metadata:',
    `  name: ${team.name}`,
    'spec:',
  ];
  if (team.description) {
    teamLines.push(`  description: ${JSON.stringify(team.description)}`);
  }
  teamLines.push('  workerMembers:');
  for (const worker of team.workers) {
    teamLines.push(`    - name: ${worker.name}`);
    teamLines.push(`      role: ${worker.role}`);
  }
  docs.push(teamLines.join('\n'));

  return `${docs.join('\n---\n')}\n`;
}

function projectArchiveName(manifest: ProjectSoulManifest): string {
  const projectName = manifest.project?.name ?? 'project';
  return `${projectName}@${manifest.version}-soul.zip`;
}

export function validateProjectPackage(archivePath: string): string[] {
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
  try {
    const manifestEntry = entryNames.find((name) => name === 'manifest.json');
    if (manifestEntry) {
      const manifest = JSON.parse(zip.readAsText(manifestEntry)) as ProjectSoulManifest;
      if (!manifest.team || !Array.isArray(manifest.team.workers)) {
        errors.push('manifest.json 缺少 team.workers 蓝图');
      } else {
        const leaders = manifest.team.workers.filter((w) => w.role === 'team_leader');
        if (leaders.length !== 1) {
          errors.push('team.workers 必须恰好有一个 team_leader');
        }
        const names = manifest.team.workers.map((w) => w.name);
        if (new Set(names).size !== names.length) {
          errors.push('team.workers 名称重复');
        }
        for (const worker of manifest.team.workers) {
          if (!(AGENTTEAMS_RUNTIMES as readonly string[]).includes(worker.runtime)) {
            errors.push(`worker ${worker.name} runtime 无效: ${worker.runtime}`);
          }
        }
      }
    }
  } catch (error) {
    errors.push(`manifest.json 无效: ${String(error)}`);
  }
  return errors;
}
