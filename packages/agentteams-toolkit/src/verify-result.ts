export type VerifyStatus = 'PASS' | 'FAIL';
export type Traceability = 'ok' | 'broken';
export type PrChecks = 'passed' | 'failed';

export interface VerifyGates {
  blocking_questions: number;
  traceability: Traceability;
  p0_p1_open: number;
  pr_checks: PrChecks;
}

export interface VerifyResult extends VerifyGates {
  change: string;
  status: VerifyStatus;
  reasons: string[];
}

export function computeVerifyStatus(gates: VerifyGates): VerifyStatus {
  if (gates.blocking_questions > 0) {
    return 'FAIL';
  }
  if (gates.traceability === 'broken') {
    return 'FAIL';
  }
  if (gates.p0_p1_open > 0) {
    return 'FAIL';
  }
  if (gates.pr_checks === 'failed') {
    return 'FAIL';
  }
  return 'PASS';
}

export function evaluateVerifyResult(
  input: Omit<VerifyResult, 'status'>,
): VerifyResult {
  const status = computeVerifyStatus(input);
  return { ...input, status };
}

export function parseVerifyResult(json: string): VerifyResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('verify 输出不是合法 JSON');
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('verify 输出必须是 JSON 对象');
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.change !== 'string' || obj.change.trim().length === 0) {
    throw new Error('verify 输出缺少非空 change 字段');
  }

  if (
    typeof obj.blocking_questions !== 'number' ||
    !Number.isInteger(obj.blocking_questions) ||
    obj.blocking_questions < 0
  ) {
    throw new Error('verify 输出 blocking_questions 必须为非负整数');
  }

  if (obj.traceability !== 'ok' && obj.traceability !== 'broken') {
    throw new Error('verify 输出 traceability 必须为 ok 或 broken');
  }

  if (
    typeof obj.p0_p1_open !== 'number' ||
    !Number.isInteger(obj.p0_p1_open) ||
    obj.p0_p1_open < 0
  ) {
    throw new Error('verify 输出 p0_p1_open 必须为非负整数');
  }

  if (obj.pr_checks !== 'passed' && obj.pr_checks !== 'failed') {
    throw new Error('verify 输出 pr_checks 必须为 passed 或 failed');
  }

  if (
    !Array.isArray(obj.reasons) ||
    obj.reasons.some((reason) => typeof reason !== 'string')
  ) {
    throw new Error('verify 输出 reasons 必须为字符串数组');
  }

  return evaluateVerifyResult({
    change: obj.change,
    blocking_questions: obj.blocking_questions,
    traceability: obj.traceability,
    p0_p1_open: obj.p0_p1_open,
    pr_checks: obj.pr_checks,
    reasons: obj.reasons as string[],
  });
}
