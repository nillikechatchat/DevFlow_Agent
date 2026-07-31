export type RiskLevel = 'L0' | 'L1' | 'L2' | 'L3';

export type RiskActionKind =
  | 'search'
  | 'read'
  | 'read-log'
  | 'draft'
  | 'create-pr'
  | 'merge'
  | 'publish'
  | 'delete-branch';

export interface RiskAction {
  kind: RiskActionKind;
  target: string;
}

const L0_KINDS = new Set<RiskActionKind>(['search', 'read', 'read-log']);
const L2_KINDS = new Set<RiskActionKind>(['create-pr']);
const L3_KINDS = new Set<RiskActionKind>(['merge', 'publish', 'delete-branch']);

export function classifyRisk(action: RiskAction): RiskLevel {
  if (L0_KINDS.has(action.kind)) {
    return 'L0';
  }
  if (action.kind === 'draft') {
    return 'L1';
  }
  if (L2_KINDS.has(action.kind)) {
    return 'L2';
  }
  if (L3_KINDS.has(action.kind)) {
    return 'L3';
  }
  throw new Error(`未识别的动作类型: ${action.kind}`);
}

export interface ApprovalContext {
  roomConfirmed: boolean;
  approvalGranted: boolean;
}

export interface PermissionVerdict {
  permitted: boolean;
  level: RiskLevel;
  reason: string;
}

export function isActionPermitted(
  action: RiskAction,
  context: ApprovalContext,
): PermissionVerdict {
  const level = classifyRisk(action);
  if (level === 'L0' || level === 'L1') {
    return { permitted: true, level, reason: '自动执行并记录' };
  }
  if (level === 'L2') {
    if (!context.roomConfirmed) {
      return { permitted: false, level, reason: '提交 PR 需 Human 在房间确认' };
    }
    return { permitted: true, level, reason: 'Human 已在房间确认' };
  }
  if (context.approvalGranted) {
    return { permitted: true, level, reason: '已通过 tool guard approvals 审批' };
  }
  return { permitted: false, level, reason: 'L3 高风险动作需强制审批' };
}
