import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  issuespecApi,
  type ChangeDetail,
  type ChangeSummary,
  type ProcessDag,
  type TaskItem,
  type TypedComment,
  type VerifyResult,
  type ApprovalRecord,
} from '@/lib/issuespec-api';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const mockSummary: ChangeSummary = {
  id: 'change-1',
  stage: 'implement',
  title: '实现 issuespec 追踪模块',
  repo: 'nillikechatchat/DevFlow_Agent',
  status: 'in_progress',
  updatedAt: '2026-07-31T10:00:00.000Z',
};

const mockComment: TypedComment = {
  id: 'comment-1',
  type: 'VERIFY',
  author: 'verify-worker',
  createdAt: '2026-07-31T09:00:00.000Z',
  content: 'verify --json 输出',
  changeId: 'change-1',
};

const mockDetail: ChangeDetail = {
  ...mockSummary,
  comments: [mockComment],
};

const mockDag: ProcessDag = {
  nodes: [
    {
      id: 'p1',
      name: 'proxy 层',
      owner: 'developer-worker',
      dependencies: [],
      parallelWith: ['p2'],
      status: 'COMPLETED',
    },
    {
      id: 'p2',
      name: 'hooks',
      owner: 'developer-worker',
      dependencies: [],
      parallelWith: ['p1'],
      status: 'RUNNING',
    },
  ],
};

const mockTask: TaskItem = {
  id: 'task-1',
  changeId: 'change-1',
  title: '实现 proxy helper',
  status: 'done',
  nodeId: 'p1',
  evidence: 'https://github.com/nillikechatchat/DevFlow_Agent/pull/1',
};

const mockVerify: VerifyResult = {
  change: 'change-1',
  status: 'FAIL',
  blocking_questions: 1,
  traceability: 'broken',
  p0_p1_open: 2,
  pr_checks: 'failed',
  reasons: ['阻塞 QUESTION 未解', '可追溯性断裂'],
};

const mockApproval: ApprovalRecord = {
  id: 'approval-1',
  changeId: 'change-1',
  action: 'merge',
  requestedAt: '2026-07-31T08:00:00.000Z',
  decidedBy: 'human-admin',
  decision: 'approved',
  decidedAt: '2026-07-31T08:05:00.000Z',
};

function expectFieldMatch<T extends Record<string, unknown>>(
  received: T,
  fixture: Record<string, unknown>,
  label: string,
) {
  for (const key of Object.keys(fixture)) {
    expect(received, `${label}.${key}`).toHaveProperty(key);
    expect(typeof received[key]).toBe(typeof fixture[key]);
  }
}

describe('issuespecApi type consistency', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses change summaries without dropping fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([mockSummary])));
    const result = await issuespecApi.listChanges();
    expect(result).toHaveLength(1);
    expectFieldMatch(result[0], mockSummary, 'ChangeSummary');
  });

  it('parses change detail with its typed comments', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(mockDetail)));
    const result = await issuespecApi.getChangeDetail('change-1');
    expectFieldMatch(result, mockDetail, 'ChangeDetail');
    expect(result.comments).toHaveLength(1);
    expectFieldMatch(result.comments[0], mockComment, 'TypedComment');
  });

  it('parses the timeline list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([mockComment])));
    const result = await issuespecApi.getTimeline('change-1');
    expect(result).toHaveLength(1);
    expectFieldMatch(result[0], mockComment, 'TypedComment');
  });

  it('parses the PROCESS DAG nodes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(mockDag)));
    const result = await issuespecApi.getDag('change-1');
    expect(result.nodes).toHaveLength(2);
    expectFieldMatch(result.nodes[0], mockDag.nodes[0], 'ProcessNode');
  });

  it('parses the task list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([mockTask])));
    const result = await issuespecApi.getTasks('change-1');
    expect(result).toHaveLength(1);
    expectFieldMatch(result[0], mockTask, 'TaskItem');
  });

  it('parses the verify result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(mockVerify)));
    const result = await issuespecApi.getVerify('change-1');
    expectFieldMatch(result, mockVerify, 'VerifyResult');
    expect(Array.isArray(result.reasons)).toBe(true);
  });

  it('parses approval records', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([mockApproval])));
    const result = await issuespecApi.getApprovals('change-1');
    expect(result).toHaveLength(1);
    expectFieldMatch(result[0], mockApproval, 'ApprovalRecord');
  });

  it('sends POST bodies with the expected shape', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(mockApproval));
    vi.stubGlobal('fetch', fetchMock);
    await issuespecApi.submitApproval('change-1', {
      decision: 'approved',
      reason: '测试通过',
    });
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toContain('/api/issuespec/changes/change-1/approvals');
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({
      decision: 'approved',
      reason: '测试通过',
    });
  });

  it('surfaces API errors as ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('not found', { status: 404 })),
    );
    await expect(issuespecApi.getChangeDetail('missing')).rejects.toMatchObject({
      status: 404,
    });
  });
});
