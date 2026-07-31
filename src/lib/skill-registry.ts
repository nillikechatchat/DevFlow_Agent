import { createHash } from 'node:crypto';

export interface SkillRelease {
  name: string;
  version: string;
  contentHash: string;
  previousVersion: string | null;
}

export interface PublishedSkill {
  name: string;
  version: string;
  content: string;
}

export function buildSkillDownloadUrl(
  registryUri: string,
  skillName: string,
  version: string,
): string {
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

export function contentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export class SkillRegistry {
  private readonly releasesByName = new Map<string, SkillRelease[]>();

  publish({ name, version, content }: PublishedSkill): SkillRelease {
    const releases = this.releasesByName.get(name) ?? [];
    const previousVersion = releases.length > 0 ? releases[releases.length - 1].version : null;
    const release: SkillRelease = {
      name,
      version,
      contentHash: contentHash(content),
      previousVersion,
    };
    releases.push(release);
    this.releasesByName.set(name, releases);
    return release;
  }

  releases(name: string): SkillRelease[] {
    return [...(this.releasesByName.get(name) ?? [])];
  }

  latest(name: string): SkillRelease | undefined {
    const releases = this.releasesByName.get(name) ?? [];
    return releases[releases.length - 1];
  }

  canRollback(name: string): boolean {
    const releases = this.releasesByName.get(name) ?? [];
    return releases.some((release) => release.previousVersion !== null);
  }
}
