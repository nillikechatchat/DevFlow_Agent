import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import AdmZip from 'adm-zip';
import { parseSkillFrontmatter, packSkill } from './skill-package.js';

const SKILL_WITH_FRONTMATTER = `---
name: my-skill
description: "测试技能描述"
author: agentteams-toolkit
version: 1.2.0
repository: https://example.com/my-skill
---

# my-skill

## name

- 类型：string
- 值：\`my-skill\`
`;

let tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'atk-sp-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs = [];
});

describe('parseSkillFrontmatter', () => {
  it('解析 HiMarket frontmatter 元数据与正文', () => {
    const { metadata, body } = parseSkillFrontmatter(SKILL_WITH_FRONTMATTER);
    expect(metadata.name).toBe('my-skill');
    expect(metadata.description).toBe('测试技能描述');
    expect(metadata.author).toBe('agentteams-toolkit');
    expect(metadata.version).toBe('1.2.0');
    expect(metadata.repository).toBe('https://example.com/my-skill');
    expect(body).toContain('# my-skill');
    expect(body.startsWith('---')).toBe(false);
  });

  it('无 frontmatter 时返回空元数据', () => {
    const { metadata, body } = parseSkillFrontmatter('# plain skill');
    expect(metadata).toEqual({});
    expect(body).toBe('# plain skill');
  });
});

describe('packSkill', () => {
  it('将 skill 目录打包为 HiMarket ZIP（含 SKILL.md 与可选目录）', () => {
    const dir = makeTempDir();
    const skillDir = path.join(dir, 'my-skill');
    mkdirSync(path.join(skillDir, 'scripts'), { recursive: true });
    mkdirSync(path.join(skillDir, 'assets'), { recursive: true });
    writeFileSync(path.join(skillDir, 'SKILL.md'), SKILL_WITH_FRONTMATTER);
    writeFileSync(path.join(skillDir, 'scripts', 'run.sh'), '#!/bin/sh\n');
    writeFileSync(path.join(skillDir, 'assets', 'logo.png'), 'fake-image');

    const output = path.join(dir, 'out.zip');
    const result = packSkill(skillDir, { output });

    expect(result.archivePath).toBe(output);
    expect(result.metadata.name).toBe('my-skill');
    expect(existsSync(output)).toBe(true);

    const zip = new AdmZip(output);
    const names = zip.getEntries().map((entry) => entry.entryName).sort();
    expect(names).toContain('SKILL.md');
    expect(names).toContain('scripts/run.sh');
    expect(names).toContain('assets/logo.png');
    expect(zip.readAsText('SKILL.md')).toContain('name: my-skill');
  });

  it('缺少 name frontmatter 时抛错', () => {
    const dir = makeTempDir();
    const skillDir = path.join(dir, 'bad');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(path.join(skillDir, 'SKILL.md'), '## name\n\nbad\n');
    expect(() => packSkill(skillDir)).toThrow(/name/);
  });

  it('缺少 description frontmatter 时抛错', () => {
    const dir = makeTempDir();
    const skillDir = path.join(dir, 'bad');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: bad\n---\n## name\n');
    expect(() => packSkill(skillDir)).toThrow(/description/);
  });

  it('支持一级子目录含 SKILL.md 的 ZIP 结构', () => {
    const dir = makeTempDir();
    const skillDir = path.join(dir, 'my-skill');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(path.join(skillDir, 'SKILL.md'), SKILL_WITH_FRONTMATTER);

    const wrapper = path.join(dir, 'wrapper');
    mkdirSync(path.join(wrapper, 'my-skill'), { recursive: true });
    writeFileSync(path.join(wrapper, 'my-skill', 'SKILL.md'), SKILL_WITH_FRONTMATTER);

    const result = packSkill(skillDir, { output: path.join(dir, 'a.zip') });
    expect(existsSync(result.archivePath)).toBe(true);

    const nested = packSkill(wrapper, { output: path.join(dir, 'b.zip') });
    expect(existsSync(nested.archivePath)).toBe(true);
    const zip = new AdmZip(nested.archivePath);
    expect(zip.readAsText('SKILL.md')).toContain('name: my-skill');
  });

  it('默认输出文件名 <name>@<version>.zip', () => {
    const dir = makeTempDir();
    const skillDir = path.join(dir, 'my-skill');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(path.join(skillDir, 'SKILL.md'), SKILL_WITH_FRONTMATTER);
    const result = packSkill(skillDir);
    expect(result.archivePath).toContain('my-skill@1.2.0.zip');
    expect(readFileSync(result.archivePath).length).toBeGreaterThan(0);
  });
});
