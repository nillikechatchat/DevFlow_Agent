import { NextRequest, NextResponse } from 'next/server';
import { proxyToIssueSpec } from '../../../proxy-helper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToIssueSpec(request, `/api/changes/${encodeURIComponent(id)}/approvals`, { forwardBody: false });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToIssueSpec(request, `/api/changes/${encodeURIComponent(id)}/approvals`, { 
    forwardBody: true,
    method: 'POST'
  });
}
