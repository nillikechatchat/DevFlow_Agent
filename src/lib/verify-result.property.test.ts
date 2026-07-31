import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  computeVerifyStatus,
  evaluateVerifyResult,
  type VerifyGates,
} from '@/lib/verify-result';

const gatesArbitrary: fc.Arbitrary<VerifyGates> = fc.record({
  blocking_questions: fc.integer({ min: 0, max: 10 }),
  traceability: fc.constantFrom('ok' as const, 'broken' as const),
  p0_p1_open: fc.integer({ min: 0, max: 10 }),
  pr_checks: fc.constantFrom('passed' as const, 'failed' as const),
});

const cleanGates: VerifyGates = {
  blocking_questions: 0,
  traceability: 'ok',
  p0_p1_open: 0,
  pr_checks: 'passed',
};

describe('verify determinism properties (C5)', () => {
  it('computes the same status for the same gates on every call', () => {
    fc.assert(
      fc.property(gatesArbitrary, (gates) => {
        const first = computeVerifyStatus(gates);
        const second = computeVerifyStatus(gates);
        expect(second).toBe(first);
      }),
      { numRuns: 200 },
    );
  });

  it('derives the status consistently between evaluate and compute', () => {
    fc.assert(
      fc.property(gatesArbitrary, fc.string({ minLength: 1, maxLength: 12 }), (gates, change) => {
        const evaluated = evaluateVerifyResult({ ...gates, change, reasons: [] });
        expect(evaluated.status).toBe(computeVerifyStatus(gates));
      }),
      { numRuns: 200 },
    );
  });

  it('is deterministic across repeated evaluations of the same input', () => {
    fc.assert(
      fc.property(gatesArbitrary, (gates) => {
        const first = evaluateVerifyResult({ ...gates, change: 'issue-x', reasons: [] });
        const second = evaluateVerifyResult({ ...gates, change: 'issue-x', reasons: [] });
        expect(second).toEqual(first);
      }),
      { numRuns: 200 },
    );
  });
});

describe('verify gate boundaries (R1-3)', () => {
  it('always passes when every gate is clean', () => {
    expect(computeVerifyStatus(cleanGates)).toBe('PASS');
  });

  it('always fails when any gate hits its failure condition', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10 }), (violations) => {
        expect(
          computeVerifyStatus({ ...cleanGates, blocking_questions: violations }),
        ).toBe('FAIL');
        expect(
          computeVerifyStatus({ ...cleanGates, p0_p1_open: violations }),
        ).toBe('FAIL');
        expect(
          computeVerifyStatus({ ...cleanGates, traceability: 'broken' }),
        ).toBe('FAIL');
        expect(
          computeVerifyStatus({ ...cleanGates, pr_checks: 'failed' }),
        ).toBe('FAIL');
      }),
      { numRuns: 100 },
    );
  });

  it('keeps non-negative gate counters stable through evaluation', () => {
    fc.assert(
      fc.property(gatesArbitrary, (gates) => {
        const evaluated = evaluateVerifyResult({ ...gates, change: 'issue-y', reasons: [] });
        expect(evaluated.blocking_questions).toBeGreaterThanOrEqual(0);
        expect(evaluated.p0_p1_open).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 200 },
    );
  });
});
