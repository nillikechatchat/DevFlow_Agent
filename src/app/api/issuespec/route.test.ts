import { afterEach, describe, expect, it, vi } from 'vitest';

// Use vi.hoisted() to define mock before vi.mock is hoisted
const mockedStorage = vi.hoisted(() => ({
  listChanges: vi.fn(),
  getChange: vi.fn(),
  getComments: vi.fn(),
  getDag: vi.fn(),
  getTasks: vi.fn(),
  getVerify: vi.fn(),
  getApprovals: vi.fn(),
  createApproval: vi.fn(),
  setVerify: vi.fn(),
}));

vi.mock('@/server/issue-spec', () => ({
  storage: mockedStorage,
}));

import { GET as getChanges } from './changes/route';
import { GET as getChangeDetail } from './changes/[id]/route';
import { GET as getTimeline } from './changes/[id]/timeline/route';
import { GET as getDag } from './changes/[id]/dag/route';
import { GET as getTasks } from './changes/[id]/tasks/route';
import { GET as getVerify } from './changes/[id]/verify/route';
import { GET as getApprovals, POST as postApproval } from './changes/[id]/approvals/route';
import { POST as postGatewayVerify } from './gateways/verify/route';

describe('issue-spec API routes (embedded)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns the change list', async () => {
    mockedStorage.listChanges.mockReturnValue([
      { id: 'change-001', stage: 'proposal', title: 'Test', repo: 'test', status: 'open', updatedAt: '2026-01-01' },
    ]);

    const response = await getChanges(new Request('http://localhost:3000/api/issuespec/changes'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([
      { id: 'change-001', stage: 'proposal', title: 'Test', repo: 'test', status: 'open', updatedAt: '2026-01-01' },
    ]);
  });

  it('returns a single change detail with comments', async () => {
    mockedStorage.getChange.mockReturnValue({ id: 'abc', stage: 'design', title: 'Test', repo: 'test', status: 'open', updatedAt: '2026-01-01' });
    mockedStorage.getComments.mockReturnValue([
      { id: 'c1', type: 'SPEC', author: 'user', createdAt: '2026-01-01', content: 'comment', changeId: 'abc' },
    ]);

    const response = await getChangeDetail(
      new Request('http://localhost:3000/api/issuespec/changes/abc'),
      { params: Promise.resolve({ id: 'abc' }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe('abc');
    expect(body.comments).toHaveLength(1);
  });

  it('returns 404 for missing change', async () => {
    mockedStorage.getChange.mockReturnValue(undefined);

    const response = await getChangeDetail(
      new Request('http://localhost:3000/api/issuespec/changes/missing'),
      { params: Promise.resolve({ id: 'missing' }) },
    );
    expect(response.status).toBe(404);
  });

  it('returns timeline sorted by date', async () => {
    mockedStorage.getComments.mockReturnValue([
      { id: 'c2', type: 'QUESTION', author: 'user', createdAt: '2026-01-02', content: 'q2', changeId: 'abc' },
      { id: 'c1', type: 'SPEC', author: 'user', createdAt: '2026-01-01', content: 'q1', changeId: 'abc' },
    ]);

    const response = await getTimeline(
      new Request('http://localhost:3000/api/issuespec/changes/abc/timeline'),
      { params: Promise.resolve({ id: 'abc' }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body[0].id).toBe('c1');
    expect(body[1].id).toBe('c2');
  });

  it('returns DAG data', async () => {
    mockedStorage.getDag.mockReturnValue({ nodes: [{ id: 'n1', name: 'Task', owner: 'user', dependencies: [], parallelWith: [], status: 'PENDING' }] });

    const response = await getDag(
      new Request('http://localhost:3000/api/issuespec/changes/abc/dag'),
      { params: Promise.resolve({ id: 'abc' }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.nodes).toHaveLength(1);
  });

  it('returns tasks', async () => {
    mockedStorage.getTasks.mockReturnValue([{ id: 't1', changeId: 'abc', title: 'Task', status: 'open' }]);

    const response = await getTasks(
      new Request('http://localhost:3000/api/issuespec/changes/abc/tasks'),
      { params: Promise.resolve({ id: 'abc' }) },
    );
    expect(response.status).toBe(200);
  });

  it('returns verify result', async () => {
    mockedStorage.getVerify.mockReturnValue({ change: 'abc', status: 'PASS', blocking_questions: 0, traceability: 'ok', p0_p1_open: 0, pr_checks: 'passed', reasons: [] });

    const response = await getVerify(
      new Request('http://localhost:3000/api/issuespec/changes/abc/verify'),
      { params: Promise.resolve({ id: 'abc' }) },
    );
    expect(response.status).toBe(200);
  });

  it('returns approvals with GET', async () => {
    mockedStorage.getApprovals.mockReturnValue([]);

    const response = await getApprovals(
      new Request('http://localhost:3000/api/issuespec/changes/abc/approvals'),
      { params: Promise.resolve({ id: 'abc' }) },
    );
    expect(response.status).toBe(200);
  });

  it('creates approval with POST', async () => {
    mockedStorage.createApproval.mockReturnValue(undefined);

    const response = await postApproval(
      new Request('http://localhost:3000/api/issuespec/changes/abc/approvals', {
        method: 'POST',
        body: JSON.stringify({ decision: 'approved', reason: 'LGTM' }),
      }),
      { params: Promise.resolve({ id: 'abc' }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.decision).toBe('approved');
    expect(body.reason).toBe('LGTM');
  });

  it('triggers verify through gateways endpoint', async () => {
    mockedStorage.setVerify.mockReturnValue(undefined);

    const response = await postGatewayVerify(
      new Request('http://localhost:3000/api/issuespec/gateways/verify', {
        method: 'POST',
        body: JSON.stringify({ changeId: 'abc' }),
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.change).toBe('abc');
    expect(body.status).toBe('PASS');
  });
});
