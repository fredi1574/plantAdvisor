import i18n from '@/i18n';

export type FriendlyErrorContext = 'auth' | 'sync' | 'profile' | 'delete_account';

function extractRawMessage(err: unknown): string {
  if (!err) return '';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || '';
  if (
    typeof err === 'object' &&
    'message' in err &&
    typeof (err as { message?: unknown }).message === 'string'
  ) {
    return (err as { message: string }).message;
  }
  return '';
}

/**
 * Maps raw Supabase, network, and OAuth errors into concise, localized,
 * user-friendly messages so technical stack traces or backend strings never
 * leak into the UI.
 */
export function toFriendlyErrorMessage(
  err: unknown,
  context: FriendlyErrorContext = 'auth'
): string {
  const raw = extractRawMessage(err).trim();
  const lower = raw.toLowerCase();

  // Network / offline errors
  if (
    lower.includes('network request failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('fetch failed') ||
    lower.includes('net::err_') ||
    lower.includes('econnrefused') ||
    lower.includes('etimedout') ||
    lower.includes('offline')
  ) {
    return context === 'sync'
      ? i18n.t('errors.syncOffline')
      : i18n.t('errors.networkOffline');
  }

  // Auth-specific Supabase / GoTrue errors
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_credentials') ||
    lower.includes('invalid email or password')
  ) {
    return i18n.t('errors.invalidCredentials');
  }

  if (lower.includes('email not confirmed')) {
    return i18n.t('errors.emailNotConfirmed');
  }

  if (
    lower.includes('user already registered') ||
    lower.includes('already been registered') ||
    lower.includes('already exists')
  ) {
    return i18n.t('errors.userAlreadyExists');
  }

  if (
    lower.includes('password should be at least') ||
    lower.includes('weak password')
  ) {
    return i18n.t('errors.weakPassword');
  }

  if (
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('for security purposes') ||
    lower.includes('429')
  ) {
    return i18n.t('errors.rateLimited');
  }

  if (
    lower.includes('jwt expired') ||
    lower.includes('refresh token') ||
    lower.includes('session_not_found') ||
    lower.includes('session expired')
  ) {
    return i18n.t('errors.sessionExpired');
  }

  switch (context) {
    case 'sync':
      return i18n.t('errors.syncFailed');
    case 'profile':
      return i18n.t('errors.genericProfile');
    case 'delete_account':
      return i18n.t('errors.genericDeleteAccount');
    default:
      return i18n.t('errors.genericAuth');
  }
}
