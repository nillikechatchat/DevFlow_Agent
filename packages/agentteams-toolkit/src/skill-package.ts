import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';

export const SKILL_PACKAGE_ENTRIES = [
  'scripts',
  'prompts',
  'config',
  'assets',
] as const;

export interface SkillFrontmatter {
  name?: string;
  description?: string;
  author?: string;
  version?: string;
  repository?: string;
}

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/;

export function parseSkillFrontmatter(content: string): {
  metadata: SkillFrontmatter;
  body: string;
} {
  const match = FRONTMATTER_RE.exec(content);
  if (!match) {
    return { metadata: {}, body: content };
  }
  const metadata: SkillFrontmatter = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key === 'name' || key === 'description' || key === 'author' || key === 'version' || key === 'repository') {
      metadata[key] = value;
    }
  }
  return { metadata, body: content.slice(match[0].length) };
}

export interface SkillPackageOptions {
  name?: string;
  version?: string;
  output?: string;
}

const ALLOWED_PACKAGE_DIRS = new Set<string>(['scripts', 'prompts', 'config', 'assets']);

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

function resolveSingleSkillDir(skillDir: string): string {
  if (existsSync(path.join(skillDir, 'SKILL.md'))) return skillDir;
  const entries = readdirSync(skillDir).filter((entry) =>
    statSync(path.join(skillDir, entry)).isDirectory(),
  );
  for (const entry of entries) {
    if (existsSync(path.join(skillDir, entry, 'SKILL.md'))) {
      return path.join(skillDir, entry);
    }
  }
  throw new Error(`skill 目录 ${skillDir} 缺少 SKILL.md（根目录或一级子目录）`);
}

export interface PackedSkill {
  archivePath: string;
  metadata: SkillFrontmatter;
  entryCount: number;
}

export function packSkill(skillDir: string, options: SkillPackageOptions = {}): PackedSkill {
  const root = resolveSingleSkillDir(skillDir);
  const content = readFileSync(path.join(root, 'SKILL.md'), 'utf8');
  const { metadata } = parseSkillFrontmatter(content);
  if (!metadata.name) {
    throw new Error('SKILL.md 顶部缺少 frontmatter 的 name（技能名称必填）');
  }
  if (!metadata.description) {
    throw new Error('SKILL.md 顶部缺少 frontmatter 的 description（技能描述必填）');
  }

  const name = options.name ?? metadata.name;
  const version = options.version ?? metadata.version ?? '0.1.0';
  const output =
    options.output ?? path.resolve(skillDir, `${name}@${version}.zip`);

  const zip = new AdmZip();
  zip.addFile('SKILL.md', Buffer.from(content, 'utf8'));
  for (const dirName of SKILL_PACKAGE_ENTRIES) {
    const dir = path.join(root, dirName);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
    for (const file of listFiles(dir)) {
      const relative = path.relative(root, file);
      if (!ALLOWED_PACKAGE_DIRS.has(relative.split(path.sep)[0])) continue;
      zip.addLocalFile(file, path.posix.dirname(relative.replaceAll(path.sep, '/')));
    }
  }

  zip.writeZip(output);
  return {
    archivePath: output,
    metadata,
    entryCount: zip.getEntries().length,
  };
}
