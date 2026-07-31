import { NextRequest } from 'next/server';
import { getIssueSpecServerUrl, proxyToIssueSpec } from '../../proxy-helper';

export async function POST(request: NextRequest) {
  return proxyToIssueSpec(request, getIssueSpecServerUrl(), '/gateways/verify', {
    method: 'POST',
  });
}
