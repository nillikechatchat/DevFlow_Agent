import { NextResponse } from 'next/server';
import { storage } from '@/server/issue-spec';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return NextResponse.json(storage.getTasks(id));
}
