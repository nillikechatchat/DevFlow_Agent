import { NextRequest } from 'next/server';
import { getIssueSpecServerUrl, proxyToIssueSpec } from '../proxy-helper';

export async function GET(request: NextRequest) {
  return proxyToIssueSpec(request, getIssueSpecServerUrl(), '/changes', {
    forwardBody: false,
  });
}
