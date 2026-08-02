import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock proxy helper
const mockProxyToIssueSpec = vi.fn();

vi.mock('@/app/api/issuespec/proxy-helper', () => ({
  getIssueSpecServerUrl: vi.fn(() => 'http://localhost:8091'),
  proxyToIssueSpec: (...args: any[]) => mockProxyToIssueSpec(...args),
}));

import { GET as getChanges } from './changes/route';
import { GET as getChangeDetail } from './changes/[id]/route';
import { GET as getTimeline } from './changes/[id]/timeline/route';
import { GET as getDag } from './changes/[id]/dag/route';
import { GET as getTasks } from './changes/[id]/tasks/route';
import { GET as getVerify } from './changes/[id]/verify/route';
import { GET as getApprovals, POST as postApproval } from './changes/[id]/approvals/route';
import { POST as postGatewayVerify } from './gateways/verify/route';

describe('issue-spec API routes (proxy)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('proxies change list request', async () => {
    mockProxyToIssueSpec.mockResolvedValue(new Response(JSON.stringify([{ id: 'change-001' }])));
    
    await getChanges(new NextRequest('http://localhost:3000/api/issuespec/changes'));
    expect(mockProxyToIssueSpec).toHaveBeenCalledWith(
      expect.any(Request),
      '/api/changes',
      { forwardBody: false },
    );
  });

  it('proxies single change detail by id', async () => {
    mockProxyToIssueSpec.mockResolvedValue(new Response(JSON.stringify({ id: 'abc' })));
    
    await getChangeDetail(
      new NextRequest('http://localhost:3000/api/issuespec/changes/abc'),
      { params: Promise.resolve({ id: 'abc' }) },
    );
    expect(mockProxyToIssueSpec).toHaveBeenCalledWith(
      expect.any(Request),
      '/api/changes/abc',
      { forwardBody: false },
    );
  });

  it('proxies timeline request', async () => {
    mockProxyToIssueSpec.mockResolvedValue(new Response(JSON.stringify([])));
    
    await getTimeline(
      new NextRequest('http://localhost:3000/api/issuespec/changes/abc/timeline'),
      { params: Promise.resolve({ id: 'abc' }) },
    );
    expect(mockProxyToIssueSpec).toHaveBeenCalledWith(
      expect.any(Request),
      '/api/changes/abc/timeline',
      { forwardBody: false },
    );
  });

  it('proxies dag request', async () => {
    mockProxyToIssueSpec.mockResolvedValue(new Response(JSON.stringify({ nodes: [] })));
    
    await getDag(
      new NextRequest('http://localhost:3000/api/issuespec/changes/abc/dag'),
      { params: Promise.resolve({ id: 'abc' }) },
    );
    expect(mockProxyToIssueSpec).toHaveBeenCalledWith(
      expect.any(Request),
      '/api/changes/abc/dag',
      { forwardBody: false },
    );
  });

  it('proxies tasks request', async () => {
    mockProxyToIssueSpec.mockResolvedValue(new Response(JSON.stringify([])));
    
    await getTasks(
      new NextRequest('http://localhost:3000/api/issuespec/changes/abc/tasks'),
      { params: Promise.resolve({ id: 'abc' }) },
    );
    expect(mockProxyToIssueSpec).toHaveBeenCalledWith(
      expect.any(Request),
      '/api/changes/abc/tasks',
      { forwardBody: false },
    );
  });

  it('proxies verify request', async () => {
    mockProxyToIssueSpec.mockResolvedValue(new Response(JSON.stringify({ status: 'PASS' })));
    
    await getVerify(
      new NextRequest('http://localhost:3000/api/issuespec/changes/abc/verify'),
      { params: Promise.resolve({ id: 'abc' }) },
    );
    expect(mockProxyToIssueSpec).toHaveBeenCalledWith(
      expect.any(Request),
      '/api/changes/abc/verify',
      { forwardBody: false },
    );
  });

  it('proxies approvals GET', async () => {
    mockProxyToIssueSpec.mockResolvedValue(new Response(JSON.stringify([])));
    
    await getApprovals(
      new NextRequest('http://localhost:3000/api/issuespec/changes/abc/approvals'),
      { params: Promise.resolve({ id: 'abc' }) },
    );
    expect(mockProxyToIssueSpec).toHaveBeenCalledWith(
      expect.any(Request),
      '/api/changes/abc/approvals',
      { forwardBody: false },
    );
  });

  it('proxies approvals POST', async () => {
    mockProxyToIssueSpec.mockResolvedValue(new Response(JSON.stringify({ decision: 'approved' })));
    
    await postApproval(
      new NextRequest('http://localhost:3000/api/issuespec/changes/abc/approvals', {
        method: 'POST',
        body: JSON.stringify({ decision: 'approved' }),
      }),
      { params: Promise.resolve({ id: 'abc' }) },
    );
    expect(mockProxyToIssueSpec).toHaveBeenCalledWith(
      expect.any(Request),
      '/api/changes/abc/approvals',
      { forwardBody: true, method: 'POST' },
    );
  });

  it('proxies gateway verify POST', async () => {
    mockProxyToIssueSpec.mockResolvedValue(new Response(JSON.stringify({ change: 'abc' })));
    
    await postGatewayVerify(
      new NextRequest('http://localhost:3000/api/issuespec/gateways/verify', {
        method: 'POST',
        body: JSON.stringify({ changeId: 'abc' }),
      }),
    );
    expect(mockProxyToIssueSpec).toHaveBeenCalledWith(
      expect.any(Request),
      '/api/gateways/verify',
      { forwardBody: true, method: 'POST' },
    );
  });
});
