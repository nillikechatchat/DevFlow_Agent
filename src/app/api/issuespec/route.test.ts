import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { GET as getChanges } from './changes/route';
import { GET as getChangeDetail } from './changes/[id]/route';
import { GET as getTimeline } from './changes/[id]/timeline/route';
import { GET as getDag } from './changes/[id]/dag/route';
import { GET as getTasks } from './changes/[id]/tasks/route';
import { GET as getVerify } from './changes/[id]/verify/route';
import { GET as getApprovals, POST as postApproval } from './changes/[id]/approvals/route';
import { POST as postGatewayVerify } from './gateways/verify/route';
import { getIssueSpecServerUrl, proxyToIssueSpec } from './proxy-helper';

vi.mock('./proxy-helper', () => ({
  getIssueSpecServerUrl: vi.fn(() => 'http://issuespec-server:8091'),
  proxyToIssueSpec: vi.fn(),
  assertSafeIssueSpecUrl: vi.fn(),
}));

const mockGetUrl = vi.mocked(getIssueSpecServerUrl);
const mockProxy = vi.mocked(proxyToIssueSpec);

const proxyResponse = (body: unknown, status = 200) =>
  Response.json(body, { status });

describe('issue-spec API routes', () => {
  beforeEach(() => {
    mockGetUrl.mockReturnValue('http://issuespec-server:8091');
    mockProxy.mockResolvedValue(proxyResponse({ ok: true }));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('forwards the change list request read-only', async () => {
    await getChanges(new NextRequest('http://dashboard.test/api/issuespec/changes'));
    expect(mockProxy).toHaveBeenCalledWith(
      expect.any(NextRequest),
      'http://issuespec-server:8091',
      '/changes',
      { forwardBody: false },
    );
  });

  it('forwards a single change detail by id', async () => {
    await getChangeDetail(
      new NextRequest('http://dashboard.test/api/issuespec/changes/abc'),
      { params: Promise.resolve({ id: 'abc' }) },
    );
    expect(mockProxy).toHaveBeenCalledWith(
      expect.any(NextRequest),
      'http://issuespec-server:8091',
      '/changes/abc',
      { forwardBody: false },
    );
  });

  it('forwards the typed comment timeline', async () => {
    await getTimeline(
      new NextRequest('http://dashboard.test/api/issuespec/changes/abc/timeline'),
      { params: Promise.resolve({ id: 'abc' }) },
    );
    expect(mockProxy).toHaveBeenCalledWith(
      expect.any(NextRequest),
      'http://issuespec-server:8091',
      '/changes/abc/timeline',
      { forwardBody: false },
    );
  });

  it('forwards the PROCESS DAG data', async () => {
    await getDag(
      new NextRequest('http://dashboard.test/api/issuespec/changes/abc/dag'),
      { params: Promise.resolve({ id: 'abc' }) },
    );
    expect(mockProxy).toHaveBeenCalledWith(
      expect.any(NextRequest),
      'http://issuespec-server:8091',
      '/changes/abc/dag',
      { forwardBody: false },
    );
  });

  it('forwards the task list', async () => {
    await getTasks(
      new NextRequest('http://dashboard.test/api/issuespec/changes/abc/tasks'),
      { params: Promise.resolve({ id: 'abc' }) },
    );
    expect(mockProxy).toHaveBeenCalledWith(
      expect.any(NextRequest),
      'http://issuespec-server:8091',
      '/changes/abc/tasks',
      { forwardBody: false },
    );
  });

  it('forwards the verify result', async () => {
    await getVerify(
      new NextRequest('http://dashboard.test/api/issuespec/changes/abc/verify'),
      { params: Promise.resolve({ id: 'abc' }) },
    );
    expect(mockProxy).toHaveBeenCalledWith(
      expect.any(NextRequest),
      'http://issuespec-server:8091',
      '/changes/abc/verify',
      { forwardBody: false },
    );
  });

  it('queries approvals with GET and submits them with POST', async () => {
    await getApprovals(
      new NextRequest('http://dashboard.test/api/issuespec/changes/abc/approvals'),
      { params: Promise.resolve({ id: 'abc' }) },
    );
    expect(mockProxy).toHaveBeenCalledWith(
      expect.any(NextRequest),
      'http://issuespec-server:8091',
      '/changes/abc/approvals',
      { forwardBody: false },
    );

    await postApproval(
      new NextRequest('http://dashboard.test/api/issuespec/changes/abc/approvals', {
        method: 'POST',
        body: JSON.stringify({ action: 'approve' }),
      }),
      { params: Promise.resolve({ id: 'abc' }) },
    );
    expect(mockProxy).toHaveBeenCalledWith(
      expect.any(NextRequest),
      'http://issuespec-server:8091',
      '/changes/abc/approvals',
      { method: 'POST' },
    );
  });

  it('triggers verify through the gateways endpoint', async () => {
    await postGatewayVerify(
      new NextRequest('http://dashboard.test/api/issuespec/gateways/verify', {
        method: 'POST',
        body: JSON.stringify({ changeId: 'abc' }),
      }),
    );
    expect(mockProxy).toHaveBeenCalledWith(
      expect.any(NextRequest),
      'http://issuespec-server:8091',
      '/gateways/verify',
      { method: 'POST' },
    );
  });

  it('passes through a 502 timeout response unchanged', async () => {
    mockProxy.mockResolvedValue(proxyResponse({ error: 'Request timeout' }, 502));
    const response = await getChanges(
      new NextRequest('http://dashboard.test/api/issuespec/changes'),
    );
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: 'Request timeout' });
  });
});
