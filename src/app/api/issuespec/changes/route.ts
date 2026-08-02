import { NextRequest, NextResponse } from 'next/server';
import { proxyToIssueSpec } from '../proxy-helper';

export async function GET(request: NextRequest) {
  return proxyToIssueSpec(request, '/api/changes', { forwardBody: false });
}
