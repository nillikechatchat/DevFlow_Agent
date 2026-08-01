import { parse } from 'yaml';

export type ResourceKind = 'Worker' | 'Team' | 'Human' | 'Manager';

export interface ParsedResource {
  apiVersion?: unknown;
  kind?: unknown;
  metadata?: { name?: unknown };
  spec?: Record<string, unknown>;
}

export const WORKER_RUNTIMES = ['openclaw', 'copaw', 'hermes'] as const;
export const WORKER_ROLES = [
  'triage',
  'architect',
  'developer',
  'reviewer',
  'qa',
  'retro',
] as const;
export const HUMAN_PERMISSIONS = ['low', 'medium', 'high'] as const;
export const MANAGER_RUNTIMES = ['openclaw', 'copaw', 'hermes'] as const;

export function parseResourceYaml(content: string): ParsedResource {
  const doc = parse(content) as unknown;
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) {
    throw new Error('资源必须是 YAML 对象');
  }
  return doc as ParsedResource;
}

function requireString(
  doc: ParsedResource,
  path: string,
  errors: string[],
): string | undefined {
  const parts = path.split('.');
  let current: unknown = doc;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) {
      errors.push(`缺少字段 ${path}`);
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  if (typeof current !== 'string' || current.trim().length === 0) {
    errors.push(`字段 ${path} 必须为非空字符串`);
    return undefined;
  }
  return current;
}

function requireArray(
  doc: ParsedResource,
  path: string,
  errors: string[],
): unknown[] | undefined {
  const parts = path.split('.');
  let current: unknown = doc;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) {
      errors.push(`缺少字段 ${path}`);
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  if (!Array.isArray(current)) {
    errors.push(`字段 ${path} 必须为数组`);
    return undefined;
  }
  return current;
}

export function validateWorkerResource(doc: ParsedResource): string[] {
  const errors: string[] = [];
  if (doc.kind !== 'Worker') {
    errors.push('kind 必须为 Worker');
  }
  requireString(doc, 'metadata.name', errors);

  const hasModel =
    typeof doc.spec?.model === 'string' && doc.spec.model.trim().length > 0;
  if (!hasModel) {
    errors.push('缺少字段 spec.model（AgentTeams v1beta1 必填）');
  }

  const runtime = requireString(doc, 'spec.runtime', errors);
  if (runtime && !(WORKER_RUNTIMES as readonly string[]).includes(runtime)) {
    errors.push(`spec.runtime 必须为 ${WORKER_RUNTIMES.join('/')}`);
  }

  const role = typeof doc.spec?.role === 'string' ? doc.spec.role : undefined;
  if (role && role.trim().length === 0) {
    errors.push('字段 spec.role 必须为非空字符串');
  }
  if (role && !(WORKER_ROLES as readonly string[]).includes(role)) {
    errors.push(`spec.role 必须为 ${WORKER_ROLES.join('/')}`);
  }

  const tokenType =
    typeof doc.spec?.token === 'object' &&
    doc.spec.token !== null &&
    typeof (doc.spec.token as { type?: unknown }).type === 'string'
      ? (doc.spec.token as { type: string }).type
      : undefined;
  if (tokenType && tokenType !== 'consumer') {
    errors.push('spec.token.type 必须为 consumer');
  }
  return errors;
}

export function validateTeamResource(doc: ParsedResource): string[] {
  const errors: string[] = [];
  if (doc.kind !== 'Team') {
    errors.push('kind 必须为 Team');
  }
  requireString(doc, 'metadata.name', errors);
  requireArray(doc, 'spec.members', errors);
  const workers = requireArray(doc, 'spec.workers', errors);
  if (workers && workers.length === 0) {
    errors.push('spec.workers 不能为空数组');
  }
  const humans = requireArray(doc, 'spec.humans', errors);
  if (humans && humans.length === 0) {
    errors.push('spec.humans 不能为空数组');
  }
  return errors;
}

export function validateHumanResource(doc: ParsedResource): string[] {
  const errors: string[] = [];
  if (doc.kind !== 'Human') {
    errors.push('kind 必须为 Human');
  }
  requireString(doc, 'metadata.name', errors);

  const permission = requireString(doc, 'spec.permission', errors);
  if (
    permission &&
    !(HUMAN_PERMISSIONS as readonly string[]).includes(permission)
  ) {
    errors.push(`spec.permission 必须为 ${HUMAN_PERMISSIONS.join('/')}`);
  }

  requireString(doc, 'spec.room', errors);
  return errors;
}

export function validateManagerResource(doc: ParsedResource): string[] {
  const errors: string[] = [];
  if (doc.kind !== 'Manager') {
    errors.push('kind 必须为 Manager');
  }
  requireString(doc, 'metadata.name', errors);

  const runtime = requireString(doc, 'spec.runtime', errors);
  if (runtime && !(MANAGER_RUNTIMES as readonly string[]).includes(runtime)) {
    errors.push(`spec.runtime 必须为 ${MANAGER_RUNTIMES.join('/')}`);
  }

  if (doc.spec?.modelConfig === undefined || doc.spec.modelConfig === null) {
    errors.push('缺少字段 spec.modelConfig');
  }
  return errors;
}

export function validateResource(
  kind: ResourceKind,
  doc: ParsedResource,
): string[] {
  switch (kind) {
    case 'Worker':
      return validateWorkerResource(doc);
    case 'Team':
      return validateTeamResource(doc);
    case 'Human':
      return validateHumanResource(doc);
    case 'Manager':
      return validateManagerResource(doc);
  }
}
