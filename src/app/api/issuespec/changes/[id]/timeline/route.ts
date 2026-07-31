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
    `/changes/${encodeURIComponent(id)}/timeline`,
    { forwardBody: false },
  );
}
