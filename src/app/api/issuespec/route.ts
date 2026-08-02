import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/server/issue-spec';

export async function GET(request: NextRequest) {
  const changes = storage.listChanges();
  return NextResponse.json(changes);
}
