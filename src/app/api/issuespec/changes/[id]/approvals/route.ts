import { NextRequest } from 'next/server';
import { getIssueSpecServerUrl, proxyToIssueSpec } from '../../../proxy-helper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToIssueSpec(
    request,
    getIssueSpecServerUrl(),
    `/changes/${encodeURIComponent(id)}/approvals`,
    { forwardBody: false },
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToIssueSpec(
    request,
    getIssueSpecServerUrl(),
    `/changes/${encodeURIComponent(id)}/approvals`,
    { method: 'POST' },
  );
}
