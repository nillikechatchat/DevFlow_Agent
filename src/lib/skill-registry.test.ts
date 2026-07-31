import { describe, it, expect } from 'vitest';
import {
  buildSkillDownloadUrl,
  contentHash,
  SkillRegistry,
} from '@/lib/skill-registry';

describe('buildSkillDownloadUrl', () => {
  it('builds a deterministic Nacos URL for a pinned version', () => {
    const url = buildSkillDownloadUrl(
      'nacos://market.agentteams.io:80/public',
      'verify',
      'v1.2.0',
    );
    expect(url).toBe(
      'http://market.agentteams.io:80/nacos/v1/cs/configs?dataId=verify%40v1.2.0&group=public',
    );
  });

  it('defaults the namespace to public and port to 80', () => {
    expect(buildSkillDownloadUrl('nacos://market.agentteams.io', 'triage', 'v1')).toBe(
      'http://market.agentteams.io:80/nacos/v1/cs/configs?dataId=triage%40v1&group=public',
    );
  });

  it('supports HTTP(S) registry URIs with a path layout', () => {
    expect(
      buildSkillDownloadUrl('https://registry.example.com/skills', 'retro', 'v3'),
    ).toBe('https://registry.example.com/skills/retro/v3/SKILL.md');
  });

  it('rejects unknown protocols', () => {
    expect(() =>
      buildSkillDownloadUrl('file:///tmp/skills', 'verify', 'v1'),
    ).toThrow('不支持的技能注册中心协议');
  });
});

describe('contentHash', () => {
  it('is deterministic for identical content', () => {
    expect(contentHash('same')).toBe(contentHash('same'));
  });

  it('differs for changed content', () => {
    expect(contentHash('v1')).not.toBe(contentHash('v2'));
  });
});

describe('SkillRegistry', () => {
  it('records the previous version on gradual release', () => {
    const registry = new SkillRegistry();
    registry.publish({ name: 'verify', version: 'v1', content: 'one' });
    const second = registry.publish({ name: 'verify', version: 'v2', content: 'two' });
    expect(second.previousVersion).toBe('v1');
  });

  it('keeps full release history for rollback', () => {
    const registry = new SkillRegistry();
    registry.publish({ name: 'verify', version: 'v1', content: 'one' });
    registry.publish({ name: 'verify', version: 'v2', content: 'two' });
    registry.publish({ name: 'verify', version: 'v3', content: 'three' });
    const releases = registry.releases('verify');
    expect(releases.map((release) => release.version)).toEqual([
      'v1',
      'v2',
      'v3',
    ]);
    expect(registry.latest('verify')?.version).toBe('v3');
    expect(registry.latest('verify')?.previousVersion).toBe('v2');
    expect(registry.canRollback('verify')).toBe(true);
  });

  it('stores the content hash for deterministic replay', () => {
    const registry = new SkillRegistry();
    const release = registry.publish({ name: 'verify', version: 'v1', content: 'payload' });
    expect(release.contentHash).toBe(contentHash('payload'));
  });

  it('cannot roll back a single first release', () => {
    const registry = new SkillRegistry();
    registry.publish({ name: 'verify', version: 'v1', content: 'one' });
    expect(registry.latest('verify')?.previousVersion).toBeNull();
    expect(registry.canRollback('verify')).toBe(false);
  });

  it('reports empty releases for an unknown skill', () => {
    const registry = new SkillRegistry();
    expect(registry.releases('missing')).toEqual([]);
    expect(registry.latest('missing')).toBeUndefined();
    expect(registry.canRollback('missing')).toBe(false);
  });
});
