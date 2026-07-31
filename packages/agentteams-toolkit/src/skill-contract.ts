export const SKILL_FIELDS = [
  'name',
  'role',
  'triggers',
  'inputs',
  'outputs',
  'permissions',
] as const;

export type SkillField = (typeof SKILL_FIELDS)[number];

export interface SkillContract {
  name: string;
  role: string;
  triggers: string;
  inputs: string;
  outputs: string;
  permissions: string;
}

export function parseSkillContract(content: string): Partial<SkillContract> {
  const sections: Record<string, string> = {};
  const headingRe = /^##\s+([A-Za-z0-9_-]+)[ \t]*$/gm;
  const headings: { field: string; start: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = headingRe.exec(content)) !== null) {
    headings.push({ field: match[1], start: match.index + match[0].length });
  }
  for (let i = 0; i < headings.length; i++) {
    const end = i + 1 < headings.length ? headings[i + 1].start : content.length;
    sections[headings[i].field] = content
      .slice(headings[i].start, end)
      .trim();
  }
  return sections;
}

export function validateSkillContract(content: string): {
  valid: boolean;
  missing: SkillField[];
  parsed: Partial<SkillContract>;
} {
  const parsed = parseSkillContract(content);
  const missing = SKILL_FIELDS.filter(
    (field) => !parsed[field] || parsed[field].length === 0,
  ) as SkillField[];
  return { valid: missing.length === 0, missing, parsed };
}
