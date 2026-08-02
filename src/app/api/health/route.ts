import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    service: 'agentteams-dashboard',
    issuespec: { status: 'embedded', path: '/api/issuespec' },
    timestamp: new Date().toISOString() 
  });
}
