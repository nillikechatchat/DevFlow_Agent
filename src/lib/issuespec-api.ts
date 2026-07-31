// Issue-Spec API Client - typed data access layer.
// All requests go through the Next.js /api/issuespec proxy routes so the
// browser never reaches the issue-spec server directly.

import { ApiError, NetworkError } from '@/lib/api-error';
import { apiUrl } from '@/lib/api-base';

// ============ Response Types ============

export type IssueStage = 'proposal' | 'design' | 'implement';
export type ChangeStatus = 'open' | 'in_progress' | 'blocked' | 'archived' | 'failed';
export type TypedCommentType =
  | 'SPEC'
  | 'QUESTION'
  | 'ANSWER'
  | 'TASK'
  | 'PROCESS'
  | 'REVIEW'
  | 'VERIFY';
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

// ============ Proxy Request Helper ============

async function proxyRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(`/api/issuespec${path}`), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch (err) {
    throw new NetworkError(path, err);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(
      `API Error ${res.status}: ${text || res.statusText}`,
      res.status,
      path
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  try {
    return await res.json();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    throw new ApiError(
      `Failed to parse API JSON response: ${message}`,
      res.status,
      path,
      err
    );
  }
}

// ============ API Methods ============

export const issuespecApi = {
  listChanges: (): Promise<ChangeSummary[]> =>
    proxyRequest<ChangeSummary[]>('/changes'),

  getChangeDetail: (id: string): Promise<ChangeDetail> =>
    proxyRequest<ChangeDetail>(`/changes/${encodeURIComponent(id)}`),

  getTimeline: (id: string): Promise<TypedComment[]> =>
    proxyRequest<TypedComment[]>(`/changes/${encodeURIComponent(id)}/timeline`),

  getDag: (id: string): Promise<ProcessDag> =>
    proxyRequest<ProcessDag>(`/changes/${encodeURIComponent(id)}/dag`),

  getTasks: (id: string): Promise<TaskItem[]> =>
    proxyRequest<TaskItem[]>(`/changes/${encodeURIComponent(id)}/tasks`),

  getVerify: (id: string): Promise<VerifyResult> =>
    proxyRequest<VerifyResult>(`/changes/${encodeURIComponent(id)}/verify`),

  getApprovals: (id: string): Promise<ApprovalRecord[]> =>
    proxyRequest<ApprovalRecord[]>(`/changes/${encodeURIComponent(id)}/approvals`),

  submitApproval: (
    id: string,
    payload: { decision: ApprovalDecision; reason?: string },
  ): Promise<ApprovalRecord> =>
    proxyRequest<ApprovalRecord>(`/changes/${encodeURIComponent(id)}/approvals`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  triggerVerify: (payload: { changeId: string }): Promise<VerifyResult> =>
    proxyRequest<VerifyResult>('/gateways/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
