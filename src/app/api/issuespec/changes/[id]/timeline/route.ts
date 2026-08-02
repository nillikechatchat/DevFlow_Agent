import { NextResponse } from 'next/server';
import { storage } from '@/server/issue-spec';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const comments = storage.getComments(id);
  return NextResponse.json(comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
}
