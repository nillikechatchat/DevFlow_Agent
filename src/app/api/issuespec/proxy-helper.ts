// Shared proxy helper for issue-spec API routes.
// Proxies requests to the standalone issue-spec server.

import { NextRequest, NextResponse } from 'next/server';

const TIMEOUT_MS = 10000;

const DEFAULT_ISSUESPEC_SERVER_URL = 'http://localhost:8091';

export function getIssueSpecServerUrl(): string {
  return process.env.ISSUESPEC_SERVER_URL || DEFAULT_ISSUESPEC_SERVER_URL;
}

export function assertSafeIssueSpecUrl(url: string): void {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Invalid issue-spec server protocol');
  }
}

export async function proxyToIssueSpec(
  request: NextRequest,
  path: string,
  options: {
    method?: string;
    forwardBody?: boolean;
    contentType?: string;
  } = {}
): Promise<NextResponse> {
  const serverUrl = getIssueSpecServerUrl();
  const { method = request.method, forwardBody = true, contentType } = options;
  const targetUrl = new URL(path, serverUrl).toString();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const fetchOptions: RequestInit = {
      method,
      signal: controller.signal,
      headers: {},
    };

    if (forwardBody && ['POST', 'PUT', 'PATCH'].includes(method)) {
      const body = await request.text();
      fetchOptions.body = body;
      (fetchOptions.headers as Record<string, string>)['content-type'] = 'application/json';
    }

    const res = await fetch(targetUrl, fetchOptions);
    clearTimeout(timeout);

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await res.arrayBuffer();
    const responseHeaders = new Headers();
    const resCT = res.headers.get('content-type');
    if (resCT) responseHeaders.set('content-type', resCT);
    responseHeaders.set('cache-control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    responseHeaders.set('pragma', 'no-cache');
    responseHeaders.set('expires', '0');

    return new NextResponse(data, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    clearTimeout(timeout);
    const message = err instanceof Error && err.name === 'AbortError'
      ? 'Request timeout'
      : err instanceof Error
        ? err.message
        : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
