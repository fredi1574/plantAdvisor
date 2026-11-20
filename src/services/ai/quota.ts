import { isSupabaseConfigured, supabase } from '@/services/supabase';
import type { AiQuotaStatus } from '@/types/plant';

export const DEFAULT_FREE_DAILY_SCAN_LIMIT = 5;

export class AiAuthRequiredError extends Error {
  constructor(
    message = 'Please sign in to your FloraLog account to use live AI plant scans.'
  ) {
    super(message);
    this.name = 'AiAuthRequiredError';
  }
}

export class AiQuotaExceededError extends Error {
  quota: AiQuotaStatus;

  constructor(message: string, quota: AiQuotaStatus) {
    super(message);
    this.name = 'AiQuotaExceededError';
    this.quota = quota;
  }
}

function getNextUtcMidnightIso(): string {
  const now = new Date();
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0
    )
  );
  return next.toISOString();
}

let mockQuotaState: AiQuotaStatus = {
  limit: DEFAULT_FREE_DAILY_SCAN_LIMIT,
  remaining: DEFAULT_FREE_DAILY_SCAN_LIMIT,
  used: 0,
  resetAt: getNextUtcMidnightIso(),
  tier: 'free',
};

let latestKnownQuota: AiQuotaStatus | null = null;
const quotaListeners = new Set<(quota: AiQuotaStatus) => void>();

export function isMockAiEnabled(): boolean {
  const envFlag = process.env.EXPO_PUBLIC_USE_MOCK_AI?.trim().toLowerCase();

  if (envFlag === 'true') {
    return true;
  }
  if (isSupabaseConfigured && supabase) {
    return false;
  }
  return true;
}

export function subscribeToAiQuota(
  listener: (quota: AiQuotaStatus) => void
): () => void {
  quotaListeners.add(listener);
  if (latestKnownQuota) {
    listener(latestKnownQuota);
  }
  return () => {
    quotaListeners.delete(listener);
  };
}

export function publishQuota(quota: AiQuotaStatus): void {
  latestKnownQuota = quota;
  for (const listener of quotaListeners) {
    listener(quota);
  }
}

export function resetMockAiQuota(limit = DEFAULT_FREE_DAILY_SCAN_LIMIT): void {
  mockQuotaState = {
    limit,
    remaining: limit,
    used: 0,
    resetAt: getNextUtcMidnightIso(),
    tier: 'free',
  };
  publishQuota(mockQuotaState);
}

export function consumeMockQuotaOrThrow(): AiQuotaStatus {
  if (Date.now() >= new Date(mockQuotaState.resetAt).getTime()) {
    resetMockAiQuota(mockQuotaState.limit);
  }
  if (mockQuotaState.remaining <= 0) {
    publishQuota(mockQuotaState);
    throw new AiQuotaExceededError(
      `Daily limit of ${mockQuotaState.limit} free AI scans reached.`,
      mockQuotaState
    );
  }
  mockQuotaState = {
    ...mockQuotaState,
    used: mockQuotaState.used + 1,
    remaining: Math.max(0, mockQuotaState.remaining - 1),
  };
  publishQuota(mockQuotaState);
  return mockQuotaState;
}

export async function fetchAiQuotaStatus(): Promise<AiQuotaStatus> {
  if (isMockAiEnabled() || !isSupabaseConfigured || !supabase) {
    if (Date.now() >= new Date(mockQuotaState.resetAt).getTime()) {
      resetMockAiQuota(mockQuotaState.limit);
    }
    publishQuota(mockQuotaState);
    return mockQuotaState;
  }

  try {
    const { data, error } = await supabase.functions.invoke<{
      quota?: AiQuotaStatus;
      error?: string;
    }>('plant-ai', {
      body: { action: 'quota' },
    });

    if (!error && data?.quota) {
      publishQuota(data.quota);
      return data.quota;
    }
  } catch {
    // Fall back to cached or default quota if offline
  }

  const fallback = latestKnownQuota ?? mockQuotaState;
  publishQuota(fallback);
  return fallback;
}

function mapEdgeStatusMessage(
  status: number | undefined,
  serverMessage: string | undefined,
  fallbackMessage: string
): Error {
  if (status === 401) {
    return new AiAuthRequiredError(
      'Please sign in to your FloraLog account to use live AI plant scans.'
    );
  }
  if (status === 413) {
    return new Error(
      'Photo is too large to analyze. Try taking a closer or lower-resolution photo.'
    );
  }
  if (status === 429) {
    return new Error(
      serverMessage ||
        'Too many AI scan requests. Please wait a minute and try again.'
    );
  }
  if (status && status >= 502 && status <= 504) {
    return new Error(
      'The AI plant advisor is temporarily unavailable. Please try again in a moment.'
    );
  }
  return new Error(serverMessage || fallbackMessage);
}

export async function handleEdgeFunctionError(
  error: { message?: string; context?: unknown } | null,
  fallbackMessage: string
): Promise<never> {
  const response = error?.context as Response | undefined;
  const status = typeof response?.status === 'number' ? response.status : undefined;

  if (response && typeof response.json === 'function') {
    let payload:
      | {
          code?: string;
          error?: string;
          quota?: AiQuotaStatus;
        }
      | undefined;

    try {
      payload = (await response.json()) as {
        code?: string;
        error?: string;
        quota?: AiQuotaStatus;
      };
    } catch {
      // Non-JSON error response; fall through to status mapping
    }

    if (payload?.code === 'QUOTA_EXCEEDED' && payload.quota) {
      publishQuota(payload.quota);
      throw new AiQuotaExceededError(
        payload.error || 'Daily AI scan limit reached.',
        payload.quota
      );
    }

    throw mapEdgeStatusMessage(status, payload?.error, fallbackMessage);
  }

  const rawMessage = error?.message || '';
  if (
    /failed to send a request to the edge function|network request failed|fetch failed|load failed/i.test(
      rawMessage
    )
  ) {
    throw new Error(
      'Unable to reach FloraLog AI. Check your internet connection and try again.'
    );
  }

  throw mapEdgeStatusMessage(status, rawMessage || undefined, fallbackMessage);
}
