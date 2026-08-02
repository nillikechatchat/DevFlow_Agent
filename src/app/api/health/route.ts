import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    service: 'agentteams-dashboard',
    issuespec: { 
      status: 'running', 
      port: parseInt(process.env.ISSUESPEC_SERVER_PORT || '8091'),
      url: process.env.ISSUESPEC_SERVER_URL || 'http://localhost:8091'
    },
    timestamp: new Date().toISOString() 
  });
}
