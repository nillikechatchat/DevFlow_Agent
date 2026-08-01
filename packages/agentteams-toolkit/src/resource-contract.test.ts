import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseResourceYaml,
  validateResource,
  validateWorkerResource,
  type ParsedResource,
} from './resource-contract.js';

const examplesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../templates/agents/examples',
);

function loadExample(fileName: string): ParsedResource {
  return parseResourceYaml(
    readFileSync(path.join(examplesDir, fileName), 'utf8'),
  );
}

describe('parseResourceYaml', () => {
  it('parses a valid YAML object', () => {
    const doc = parseResourceYaml('kind: Worker\nmetadata:\n  name: w1\n');
    expect(doc.kind).toBe('Worker');
    expect(doc.metadata?.name).toBe('w1');
  });

  it('rejects a YAML array at the top level', () => {
    expect(() => parseResourceYaml('- a\n- b\n')).toThrow('必须是 YAML 对象');
  });

  it('rejects a scalar YAML document', () => {
    expect(() => parseResourceYaml('just a string')).toThrow('必须是 YAML 对象');
  });
});

describe('validateWorkerResource', () => {
  it('accepts the shipped worker.yaml (AgentTeams v1beta1)', () => {
    const doc = loadExample('worker.yaml');
    expect(validateWorkerResource(doc)).toEqual([]);
  });

  it('rejects a token type other than consumer', () => {
    const doc = loadExample('worker.yaml') as Record<string, unknown>;
    const spec = doc.spec as Record<string, unknown>;
    spec.token = { type: 'github-pat' };
    expect(validateWorkerResource(doc as ParsedResource)).toContain(
      'spec.token.type 必须为 consumer',
    );
  });

  it('rejects a missing spec.model', () => {
    const doc = loadExample('worker.yaml');
    delete (doc.spec as Record<string, unknown>).model;
    expect(validateWorkerResource(doc)).toContain(
      '缺少字段 spec.model（AgentTeams v1beta1 必填）',
    );
  });

  it('rejects an unknown runtime value', () => {
    const doc = loadExample('worker.yaml') as Record<string, unknown>;
    (doc.spec as Record<string, unknown>).runtime = 'docker';
    expect(validateWorkerResource(doc as ParsedResource)).toContain(
      'spec.runtime 必须为 openclaw/copaw/hermes',
    );
  });

  it('rejects an unknown role value', () => {
    const doc = loadExample('worker.yaml') as Record<string, unknown>;
    (doc.spec as Record<string, unknown>).role = 'manager';
    expect(validateWorkerResource(doc as ParsedResource)).toContain(
      'spec.role 必须为 triage/architect/developer/reviewer/qa/retro',
    );
  });

  it('reports a missing metadata.name', () => {
    const doc = loadExample('worker.yaml');
    delete doc.metadata;
    expect(validateWorkerResource(doc)).toContain('缺少字段 metadata.name');
  });
});

describe('shipped example resources', () => {
  it.each([
    ['worker.yaml', 'Worker'],
    ['team.yaml', 'Team'],
    ['human.yaml', 'Human'],
    ['manager.yaml', 'Manager'],
  ])('%s satisfies the %s resource contract', (fileName, kind) => {
    const doc = loadExample(fileName);
    expect(validateResource(kind as never, doc)).toEqual([]);
  });

  it('ensures every shipped Worker declares a model', () => {
    const doc = loadExample('worker.yaml');
    const model = (doc.spec as Record<string, unknown>).model;
    expect(typeof model).toBe('string');
    expect((model as string).length).toBeGreaterThan(0);
  });
});
