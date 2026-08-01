import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { parseSkillFrontmatter } from '../../skill-package.js';

export interface InstallOptions {
  registry?: string;
  version?: string;
  targetDir?: string;
}

export function buildNacosDownloadUrl(registryUri: string, skillName: string, version: string): string {
  const trimmed = registryUri.replace(/\/+$/, '');
  const scheme = trimmed.split('://')[0];
  if (scheme === 'nacos') {
    const rest = trimmed.replace(/^nacos:\/\//, '');
    const slashIndex = rest.indexOf('/');
    const authority = slashIndex === -1 ? rest : rest.slice(0, slashIndex);
    const namespace = slashIndex === -1 ? 'public' : rest.slice(slashIndex + 1);
    const host = authority.includes(':') ? authority : `${authority}:80`;
    return `http://${host}/nacos/v1/cs/configs?dataId=${encodeURIComponent(
      `${skillName}@${version}`,
    )}&group=${encodeURIComponent(namespace)}`;
  }
  if (scheme === 'http' || scheme === 'https') {
    return `${trimmed}/${skillName}/${version}/SKILL.md`;
  }
  throw new Error(`不支持的技能注册中心协议: ${scheme}`);
}

export async function fetchNacosSkill(
  registryUri: string,
  skillName: string,
  version: string,
): Promise<{ content: string }> {
  const url = buildNacosDownloadUrl(registryUri, skillName, version);
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) {
    throw new Error(`拉取技能失败: HTTP ${res.status} ${url}`);
  }
  return { content: await res.text() };
}

export async function installSkill(
  skillName: string,
  options: InstallOptions = {},
): Promise<string> {
  const registry = options.registry ?? process.env.AGENTTEAMS_SKILLS_API_URL ?? 'nacos://market.agentteams.io:80/public';
  const version = options.version ?? 'latest';
  const targetDir = path.resolve(options.targetDir ?? path.join(process.cwd(), '.agents', 'skills'));
  const destDir = path.join(targetDir, skillName);

  const { content } = await fetchNacosSkill(registry, skillName, version);
  mkdirSync(destDir, { recursive: true });
  writeFileSync(path.join(destDir, 'SKILL.md'), content, 'utf8');
  return destDir;
}

export function installSkillFromZip(
  zipPath: string,
  options: InstallOptions = {},
): string {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  let skillRoot: { dir: string; prefix: string } | null = null;
  for (const entry of entries) {
    const parts = entry.entryName.replace(/\\/g, '/').split('/').filter(Boolean);
    if (parts.length >= 1 && parts[parts.length - 1] === 'SKILL.md') {
      if (parts.length === 1) {
        skillRoot = { dir: '', prefix: '' };
      } else if (parts.length === 2) {
        skillRoot = { dir: parts[0], prefix: `${parts[0]}/` };
      }
      if (skillRoot) break;
    }
  }
  if (!skillRoot) {
    throw new Error(`ZIP 包缺少 SKILL.md（根目录或一级子目录）`);
  }
  const skillEntry = entries.find(
    (entry) => entry.entryName.replace(/\\/g, '/').replace(/\/+$/, '') === `${skillRoot!.prefix}SKILL.md`,
  );

  const content = skillEntry ? skillEntry.getData().toString('utf8') : '';
  const { metadata } = parseSkillFrontmatter(content);
  const skillName = metadata.name ?? (skillRoot.dir !== '' ? skillRoot.dir : 'skill');

  const targetDir = path.resolve(options.targetDir ?? path.join(process.cwd(), '.agents', 'skills'));
  const baseDir = path.join(targetDir, skillName);
  mkdirSync(baseDir, { recursive: true });
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const entryName = entry.entryName.replace(/\\/g, '/');
    if (skillRoot!.prefix !== '' && !entryName.startsWith(skillRoot!.prefix)) continue;
    const relative = entryName.slice(skillRoot!.prefix.length);
    if (!relative) continue;
    const outPath = path.join(baseDir, ...relative.split('/'));
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, entry.getData());
  }
  return baseDir;
}

export function agentteamsImportHint(workerName: string, packageUri?: string): string {
  return packageUri
    ? `bash install/agentteams-import.sh worker --name ${workerName} --zip ${packageUri}`
    : `bash install/agentteams-import.sh worker --name ${workerName}`;
}

export async function installWorker(
  workerName: string,
  options: InstallOptions = {},
): Promise<string> {
  const registry = options.registry ?? process.env.AGENTTEAMS_SKILLS_API_URL ?? 'nacos://market.agentteams.io:80/public';
  const version = options.version ?? 'latest';
  const targetDir = path.resolve(options.targetDir ?? path.join(process.cwd(), '.agents', 'workers'));
  const destDir = path.join(targetDir, workerName);

  const url = buildNacosDownloadUrl(registry, workerName, version);
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) {
    throw new Error(
      `拉取 Worker 包失败: HTTP ${res.status} ${url}\n` +
        `请确认注册表地址与认证信息。也可直接从本地工具包导入: ${agentteamsImportHint(workerName, './worker.zip')}`,
    );
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const zip = new AdmZip(buffer);
  mkdirSync(destDir, { recursive: true });
  zip.extractAllTo(destDir, true);
  return destDir;
}
