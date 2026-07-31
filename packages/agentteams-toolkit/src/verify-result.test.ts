import { describe, it, expect } from 'vitest';
import {
  parseVerifyResult,
  evaluateVerifyResult,
  computeVerifyStatus,
  type VerifyResult,
} from './verify-result.js';

const passingJson = JSON.stringify({
  change: 'issue-123',
  blocking_questions: 0,
  traceability: 'ok',
  p0_p1_open: 0,
  pr_checks: 'passed',
  reasons: ['all gates satisfied'],
});

const failingJson = JSON.stringify({
  change: 'issue-456',
  blocking_questions: 1,
  traceability: 'ok',
  p0_p1_open: 2,
  pr_checks: 'failed',
  reasons: ['blocking question open', 'P0/P1 findings open', 'PR checks failed'],
});

describe('parseVerifyResult', () => {
  it('parses a passing result with all seven fields', () => {
    const result = parseVerifyResult(passingJson);
    expect(result).toEqual({
      change: 'issue-123',
      status: 'PASS',
      blocking_questions: 0,
      traceability: 'ok',
      p0_p1_open: 0,
      pr_checks: 'passed',
      reasons: ['all gates satisfied'],
    });
  });

  it('parses a failing result and derives FAIL status from gates', () => {
    const result = parseVerifyResult(failingJson);
    expect(result.status).toBe('FAIL');
    expect(result.blocking_questions).toBe(1);
    expect(result.p0_p1_open).toBe(2);
    expect(result.pr_checks).toBe('failed');
    expect(result.reasons).toHaveLength(3);
  });

  it('rejects non-JSON input', () => {
    expect(() => parseVerifyResult('not json')).toThrow('不是合法 JSON');
  });

  it('rejects a top-level array', () => {
    expect(() => parseVerifyResult('[]')).toThrow('必须是 JSON 对象');
  });

  it('rejects a missing change field', () => {
    const json = JSON.stringify({ ...JSON.parse(passingJson), change: undefined });
    expect(() => parseVerifyResult(json)).toThrow('change');
  });

  it('rejects a negative blocking_questions value', () => {
    const json = JSON.stringify({ ...JSON.parse(passingJson), blocking_questions: -1 });
    expect(() => parseVerifyResult(json)).toThrow('blocking_questions');
  });

  it('rejects a non-integer p0_p1_open value', () => {
    const json = JSON.stringify({ ...JSON.parse(passingJson), p0_p1_open: 1.5 });
    expect(() => parseVerifyResult(json)).toThrow('p0_p1_open');
  });

  it('rejects an invalid traceability enum value', () => {
    const json = JSON.stringify({ ...JSON.parse(passingJson), traceability: 'unknown' });
    expect(() => parseVerifyResult(json)).toThrow('traceability');
  });

  it('rejects an invalid pr_checks enum value', () => {
    const json = JSON.stringify({ ...JSON.parse(passingJson), pr_checks: 'running' });
    expect(() => parseVerifyResult(json)).toThrow('pr_checks');
  });

  it('rejects reasons that are not string arrays', () => {
    const json = JSON.stringify({ ...JSON.parse(passingJson), reasons: [42] });
    expect(() => parseVerifyResult(json)).toThrow('reasons');
  });
});

describe('computeVerifyStatus', () => {
  it('passes when every gate is clean', () => {
    expect(
      computeVerifyStatus({
        blocking_questions: 0,
        traceability: 'ok',
        p0_p1_open: 0,
        pr_checks: 'passed',
      }),
    ).toBe('PASS');
  });

  it('fails when a blocking question is open', () => {
    expect(
      computeVerifyStatus({
        blocking_questions: 1,
        traceability: 'ok',
        p0_p1_open: 0,
        pr_checks: 'passed',
      }),
    ).toBe('FAIL');
  });

  it('fails when traceability is broken', () => {
    expect(
      computeVerifyStatus({
        blocking_questions: 0,
        traceability: 'broken',
        p0_p1_open: 0,
        pr_checks: 'passed',
      }),
    ).toBe('FAIL');
  });

  it('fails when P0/P1 findings remain open', () => {
    expect(
      computeVerifyStatus({
        blocking_questions: 0,
        traceability: 'ok',
        p0_p1_open: 1,
        pr_checks: 'passed',
      }),
    ).toBe('FAIL');
  });

  it('fails when PR checks do not pass', () => {
    expect(
      computeVerifyStatus({
        blocking_questions: 0,
        traceability: 'ok',
        p0_p1_open: 0,
        pr_checks: 'failed',
      }),
    ).toBe('FAIL');
  });
});

describe('evaluateVerifyResult', () => {
  it('assigns the derived status to the result', () => {
    const result = evaluateVerifyResult({
      change: 'issue-789',
      blocking_questions: 0,
      traceability: 'ok',
      p0_p1_open: 3,
      pr_checks: 'passed',
      reasons: ['p0 finding remains'],
    });
    expect(result.status).toBe('FAIL');
  });

  it('preserves PASS when all gates are clean', () => {
    const input: Omit<VerifyResult, 'status'> = {
      change: 'issue-abc',
      blocking_questions: 0,
      traceability: 'ok',
      p0_p1_open: 0,
      pr_checks: 'passed',
      reasons: ['ok'],
    };
    expect(evaluateVerifyResult(input)).toEqual({ ...input, status: 'PASS' });
  });
});
