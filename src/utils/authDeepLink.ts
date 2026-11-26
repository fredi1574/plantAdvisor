/**
 * Pure parser for Supabase Auth deep-link callbacks (PKCE `?code=...` and
 * implicit `#access_token=...&refresh_token=...&type=recovery` URLs).
 */

export interface AuthCallbackParams {
  code?: string;
  accessToken?: string;
  refreshToken?: string;
  type?: string;
  errorDescription?: string;
  isRecovery: boolean;
}

function parseParamSegment(segment: string): Map<string, string> {
  const params = new Map<string, string>();
  if (!segment) return params;

  for (const pair of segment.split('&')) {
    if (!pair) continue;
    const eqIndex = pair.indexOf('=');
    const rawKey = eqIndex >= 0 ? pair.slice(0, eqIndex) : pair;
    const rawVal = eqIndex >= 0 ? pair.slice(eqIndex + 1) : '';
    try {
      const key = decodeURIComponent(rawKey.replace(/\+/g, ' '));
      const val = decodeURIComponent(rawVal.replace(/\+/g, ' '));
      if (key) params.set(key, val);
    } catch {
      // Ignore malformed percent-encoding segments
    }
  }

  return params;
}

/**
 * Extracts Supabase auth callback parameters from a deep-link URL.
 * Returns `null` when the URL does not contain any auth callback parameters.
 */
export function parseAuthCallbackUrl(url: string): AuthCallbackParams | null {
  if (!url || typeof url !== 'string') return null;

  const hashIndex = url.indexOf('#');
  const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const hashSegment = hashIndex >= 0 ? url.slice(hashIndex + 1) : '';

  const queryIndex = withoutHash.indexOf('?');
  const querySegment = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : '';

  const merged = new Map<string, string>();
  for (const [k, v] of parseParamSegment(querySegment)) {
    merged.set(k, v);
  }
  for (const [k, v] of parseParamSegment(hashSegment)) {
    merged.set(k, v);
  }

  const code = merged.get('code') || undefined;
  const accessToken = merged.get('access_token') || undefined;
  const refreshToken = merged.get('refresh_token') || undefined;
  const type = merged.get('type') || undefined;
  const errorDescription =
    merged.get('error_description') || merged.get('error') || undefined;

  if (!code && !accessToken && !refreshToken && !errorDescription) {
    return null;
  }

  return {
    code,
    accessToken,
    refreshToken,
    type,
    errorDescription,
    isRecovery: type === 'recovery',
  };
}
