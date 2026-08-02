import { NextResponse } from 'next/server';
import { storage } from '@/server/issue-spec';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = storage.getVerify(id);
  if (!result) {
    return NextResponse.json({ error: 'Verify result not found' }, { status: 404 });
  }
  return NextResponse.json(result);
}
