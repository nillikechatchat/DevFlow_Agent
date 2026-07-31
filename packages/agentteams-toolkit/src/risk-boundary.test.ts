import { describe, it, expect } from 'vitest';
import {
  classifyRisk,
  isActionPermitted,
  type ApprovalContext,
  type RiskAction,
} from './risk-boundary.js';

function action(kind: RiskAction['kind'], target = 'example'): RiskAction {
  return { kind, target };
}

const noApproval: ApprovalContext = {
  roomConfirmed: false,
  approvalGranted: false,
};

const roomConfirmed: ApprovalContext = {
  roomConfirmed: true,
  approvalGranted: false,
};

const fullyApproved: ApprovalContext = {
  roomConfirmed: true,
  approvalGranted: true,
};

describe('classifyRisk', () => {
  it('classifies read-only actions as L0', () => {
    expect(classifyRisk(action('search'))).toBe('L0');
    expect(classifyRisk(action('read'))).toBe('L0');
    expect(classifyRisk(action('read-log'))).toBe('L0');
  });

  it('classifies in-process draft changes as L1', () => {
    expect(classifyRisk(action('draft'))).toBe('L1');
  });

  it('classifies PR submission as L2', () => {
    expect(classifyRisk(action('create-pr'))).toBe('L2');
  });

  it('classifies merge, publish and delete-branch as L3', () => {
    expect(classifyRisk(action('merge'))).toBe('L3');
    expect(classifyRisk(action('publish'))).toBe('L3');
    expect(classifyRisk(action('delete-branch'))).toBe('L3');
  });
});

describe('isActionPermitted', () => {
  it('auto-executes L0 actions without any approval', () => {
    const verdict = isActionPermitted(action('read'), noApproval);
    expect(verdict.permitted).toBe(true);
    expect(verdict.level).toBe('L0');
  });

  it('auto-executes L1 drafts without any approval', () => {
    const verdict = isActionPermitted(action('draft'), noApproval);
    expect(verdict.permitted).toBe(true);
    expect(verdict.level).toBe('L1');
  });

  it('blocks L2 PR submission without room confirmation', () => {
    const verdict = isActionPermitted(action('create-pr'), noApproval);
    expect(verdict.permitted).toBe(false);
    expect(verdict.reason).toContain('房间确认');
  });

  it('allows L2 PR submission after room confirmation', () => {
    const verdict = isActionPermitted(action('create-pr'), roomConfirmed);
    expect(verdict.permitted).toBe(true);
  });

  it('blocks L3 actions without strong approval even when the room confirmed', () => {
    const verdict = isActionPermitted(action('merge'), roomConfirmed);
    expect(verdict.permitted).toBe(false);
    expect(verdict.reason).toContain('强制审批');
  });

  it('allows L3 actions only after tool guard approvals', () => {
    for (const kind of ['merge', 'publish', 'delete-branch'] as const) {
      const verdict = isActionPermitted(action(kind), fullyApproved);
      expect(verdict.permitted).toBe(true);
    }
  });
});
