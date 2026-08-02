import { NextResponse } from 'next/server';
import { storage } from '@/server/issue-spec';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const dag = storage.getDag(id);
  if (!dag) {
    return NextResponse.json({ error: 'DAG not found' }, { status: 404 });
  }
  return NextResponse.json(dag);
}
