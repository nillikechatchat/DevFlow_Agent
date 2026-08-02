// Issue-Spec Server Types

export type IssueStage = 'proposal' | 'design' | 'implement';
export type ChangeStatus = 'open' | 'in_progress' | 'blocked' | 'archived' | 'failed';
export type TypedCommentType = 'SPEC' | 'QUESTION' | 'ANSWER' | 'TASK' | 'PROCESS' | 'REVIEW' | 'VERIFY';
export type ProcessNodeStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type VerifyStatus = 'PASS' | 'FAIL';
export type TaskStatus = 'open' | 'in_progress' | 'done' | 'failed';
export type ApprovalDecision = 'approved' | 'rejected';

export interface ChangeSummary {
  id: string;
  stage: IssueStage;
  title: string;
  repo: string;
  status: ChangeStatus;
  updatedAt: string;
}

export interface ChangeDetail extends ChangeSummary {
  comments: TypedComment[];
}

export interface TypedComment {
  id: string;
  type: TypedCommentType;
  author: string;
  createdAt: string;
  content: string;
  changeId: string;
}

export interface ProcessNode {
  id: string;
  name: string;
  owner: string;
  dependencies: string[];
  parallelWith: string[];
  status: ProcessNodeStatus;
  evidence?: string;
}

export interface ProcessDag {
  nodes: ProcessNode[];
}

export interface TaskItem {
  id: string;
  changeId: string;
  title: string;
  status: TaskStatus;
  nodeId?: string;
  evidence?: string;
}

export interface VerifyResult {
  change: string;
  status: VerifyStatus;
  blocking_questions: number;
  traceability: 'ok' | 'broken';
  p0_p1_open: number;
  pr_checks: 'passed' | 'failed';
  reasons: string[];
}

export interface ApprovalRecord {
  id: string;
  changeId: string;
  action: string;
  requestedAt: string;
  decidedBy?: string;
  decision?: ApprovalDecision;
  decidedAt?: string;
  reason?: string;
}

export interface StoreData {
  changes: ChangeSummary[];
  comments: TypedComment[];
  dags: Record<string, ProcessDag>;
  tasks: TaskItem[];
  verifyResults: Record<string, VerifyResult>;
  approvals: ApprovalRecord[];
}
