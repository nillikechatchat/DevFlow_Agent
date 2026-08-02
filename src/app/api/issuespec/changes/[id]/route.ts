import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/server/issue-spec';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const change = storage.getChange(id);
  if (!change) {
    return NextResponse.json({ error: 'Change not found' }, { status: 404 });
  }
  const comments = storage.getComments(id);
  return NextResponse.json({ ...change, comments });
}
