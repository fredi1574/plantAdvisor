import { parseAuthCallbackUrl } from '@/utils/authDeepLink';

describe('parseAuthCallbackUrl', () => {
  it('parses implicit recovery fragment parameters', () => {
    const parsed = parseAuthCallbackUrl(
      'plantadvisor://auth#access_token=tok_123&refresh_token=ref_456&type=recovery'
    );
    expect(parsed).toEqual({
      code: undefined,
      accessToken: 'tok_123',
      refreshToken: 'ref_456',
      type: 'recovery',
      errorDescription: undefined,
      isRecovery: true,
    });
  });

  it('parses PKCE query code callback parameters', () => {
    const parsed = parseAuthCallbackUrl(
      'plantadvisor://auth?code=pkce_code_789&type=recovery'
    );
    expect(parsed).toEqual({
      code: 'pkce_code_789',
      accessToken: undefined,
      refreshToken: undefined,
      type: 'recovery',
      errorDescription: undefined,
      isRecovery: true,
    });
  });

  it('parses error_description when a reset link is expired', () => {
    const parsed = parseAuthCallbackUrl(
      'plantadvisor://auth?error=access_denied&error_description=Email+link+is+invalid+or+has+expired'
    );
    expect(parsed?.errorDescription).toBe(
      'Email link is invalid or has expired'
    );
    expect(parsed?.isRecovery).toBe(false);
  });

  it('returns null for unrelated app deep links', () => {
    expect(parseAuthCallbackUrl('plantadvisor://plant/plant-1')).toBeNull();
    expect(parseAuthCallbackUrl('')).toBeNull();
  });
});
