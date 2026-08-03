/**
 * Prepend the Next.js basePath to an API path so fetch() works
 * regardless of whether the app is deployed at root or under /dashboard.
 *
 * Also ensures trailing slash for API routes (Next.js trailingSlash: true
 * causes 308 redirects on POST requests without trailing slash).
 *
 * Usage:  fetch(apiUrl('/api/auth/login'), { ... })
 */
export function apiUrl(path: string): string {
  // NEXT_PUBLIC_BASE_PATH is baked at build time by Next.js.
  const base = process.env.NEXT_PUBLIC_BASE_PATH || '';

  // Handle paths with query strings correctly
  const queryIndex = path.indexOf('?');
  let normalized: string;
  if (queryIndex !== -1) {
    const pathPart = path.substring(0, queryIndex);
    const queryPart = path.substring(queryIndex);
    normalized = (pathPart.endsWith('/') ? pathPart : pathPart + '/') + queryPart;
  } else {
    normalized = path.endsWith('/') ? path : `${path}/`;
  }

  return `${base}${normalized}`;
}
