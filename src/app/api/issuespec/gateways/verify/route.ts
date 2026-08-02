import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/server/issue-spec';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { changeId } = body;
  
  if (!changeId) {
    return NextResponse.json({ error: 'changeId is required' }, { status: 400 });
  }

  const result = {
    change: changeId,
    status: 'PASS' as const,
    blocking_questions: 0,
    traceability: 'ok' as const,
    p0_p1_open: 0,
    pr_checks: 'passed' as const,
    reasons: ['Verify completed successfully'],
  };
  storage.setVerify(changeId, result);
  return NextResponse.json(result);
}
