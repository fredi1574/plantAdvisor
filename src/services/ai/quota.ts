import { isSupabaseConfigured, supabase } from '@/services/supabase';
import type { AiQuotaStatus } from '@/types/plant';

export const DEFAULT_FREE_DAILY_SCAN_LIMIT = 5;

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
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim();

  if (envFlag === 'true') {
    return true;
  }
  if (isSupabaseConfigured && supabase) {
    return false;
  }
  if (apiKey && apiKey.length > 0) {
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

export async function handleEdgeFunctionError(
  error: { message?: string; context?: unknown } | null,
  fallbackMessage: string
): Promise<never> {
  if (error?.context && typeof (error.context as Response).json === 'function') {
    try {
      const payload = (await (error.context as Response).json()) as {
        code?: string;
        error?: string;
        quota?: AiQuotaStatus;
      };
      if (payload?.code === 'QUOTA_EXCEEDED' && payload.quota) {
        publishQuota(payload.quota);
        throw new AiQuotaExceededError(
          payload.error || 'Daily AI scan limit reached.',
          payload.quota
        );
      }
      if (payload?.error) {
        throw new Error(payload.error);
      }
    } catch (inner) {
      if (inner instanceof AiQuotaExceededError) {
        throw inner;
      }
    }
  }
  throw new Error(error?.message || fallbackMessage);
}
