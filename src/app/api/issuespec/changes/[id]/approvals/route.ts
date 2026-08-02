import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/server/issue-spec';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return NextResponse.json(storage.getApprovals(id));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { decision, reason, decidedBy } = body;

  if (!decision) {
    return NextResponse.json({ error: 'decision is required' }, { status: 400 });
  }

  const approval = {
    id: `appr-${Date.now()}`,
    changeId: id,
    action: decision,
    requestedAt: new Date().toISOString(),
    decidedBy,
    decision,
    decidedAt: new Date().toISOString(),
    reason,
  };
  storage.createApproval(approval);
  return NextResponse.json(approval);
}
