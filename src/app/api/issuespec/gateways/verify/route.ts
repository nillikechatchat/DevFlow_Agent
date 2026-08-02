import { NextRequest, NextResponse } from 'next/server';
import { proxyToIssueSpec } from '../../proxy-helper';

export async function POST(request: NextRequest) {
  return proxyToIssueSpec(request, '/api/gateways/verify', { 
    forwardBody: true,
    method: 'POST'
  });
}
