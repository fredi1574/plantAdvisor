import i18n from '@/i18n';
import { toFriendlyErrorMessage } from '@/services/errorMessages';

describe('toFriendlyErrorMessage', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('maps network errors for auth and sync contexts', () => {
    expect(
      toFriendlyErrorMessage(new Error('Network request failed'), 'auth')
    ).toContain('offline');
    expect(
      toFriendlyErrorMessage(new Error('Failed to fetch'), 'sync')
    ).toBe('Offline — changes saved locally');
  });

  it('maps common Supabase GoTrue errors to user-friendly copy', () => {
    expect(
      toFriendlyErrorMessage({ message: 'Invalid login credentials' }, 'auth')
    ).toContain('Incorrect email or password');
    expect(
      toFriendlyErrorMessage({ message: 'Email not confirmed' }, 'auth')
    ).toContain('confirm your email');
    expect(
      toFriendlyErrorMessage({ message: 'User already registered' }, 'auth')
    ).toContain('already exists');
    expect(
      toFriendlyErrorMessage(
        { message: 'Password should be at least 6 characters' },
        'auth'
      )
    ).toContain('stronger password');
    expect(
      toFriendlyErrorMessage({ message: 'Too many requests (429)' }, 'auth')
    ).toContain('Too many attempts');
    expect(
      toFriendlyErrorMessage({ message: 'JWT expired' }, 'auth')
    ).toContain('session expired');
  });

  it('localizes error messages when language is Russian', async () => {
    await i18n.changeLanguage('ru');
    expect(
      toFriendlyErrorMessage({ message: 'Invalid login credentials' }, 'auth')
    ).toContain('Неверный email или пароль');
    expect(
      toFriendlyErrorMessage(new Error('Failed to fetch'), 'sync')
    ).toContain('Офлайн');
  });

  it('falls back safely without leaking raw backend messages', () => {
    const raw = 'PostgREST PGRST301 internal stack trace';
    const res = toFriendlyErrorMessage(new Error(raw), 'sync');
    expect(res).not.toContain('PGRST301');
    expect(res).toContain('safely saved');
  });
});
