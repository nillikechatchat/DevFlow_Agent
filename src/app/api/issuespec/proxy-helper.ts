// Shared proxy helper for issue-spec API routes.
// The issue-spec functionality is now embedded in the Dashboard.
// This file is kept for backward compatibility.

import { NextRequest, NextResponse } from 'next/server';

const TIMEOUT_MS = 10000;

// Issue-spec is now embedded - all routes are handled directly in src/app/api/issuespec/
// This helper is deprecated and kept for potential future use.

export function getIssueSpecServerUrl(): string {
  return process.env.ISSUESPEC_SERVER_URL || 'http://localhost:8091';
}

export function assertSafeIssueSpecUrl(url: string): void {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Invalid issue-spec server protocol');
  }
}

export async function proxyToIssueSpec(
  request: NextRequest,
  serverUrl: string,
  path: string,
  options: {
    method?: string;
    forwardBody?: boolean;
    contentType?: string;
  } = {}
): Promise<NextResponse> {
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
      if (contentType === 'multipart/form-data') {
        const body = await request.arrayBuffer();
        fetchOptions.body = body;
        const origCT = request.headers.get('content-type');
        if (origCT) {
          (fetchOptions.headers as Record<string, string>)['content-type'] = origCT;
        }
      } else {
        fetchOptions.body = await request.text();
        (fetchOptions.headers as Record<string, string>)['content-type'] = 'application/json';
      }
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
