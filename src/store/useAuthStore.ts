/**
 * FloraLog — Authentication & Gardener Profile Store
 * Powered by Supabase Auth + `public.profiles` synchronization,
 * with automatic local AsyncStorage fallback when Supabase isn't configured.
 */

import type { Session, Subscription, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { Platform, TurboModuleRegistry } from 'react-native';
import { create } from 'zustand';

import i18n from '@/i18n';
import { toFriendlyErrorMessage } from '@/services/errorMessages';
import {
  clearLocalAuthSession,
  deleteLocalAccount,
  readLocalAuthSession,
  signInLocally,
  signUpLocally,
  updateLocalProfile,
} from '@/services/localAuthFallback';
import {
  deleteAccountInSupabase,
  fetchOrCreateUserProfile,
  supabase,
  updateUserProfileInSupabase,
} from '@/services/supabase';
import { usePlantStore } from '@/store/usePlantStore';
import type { UserProfile } from '@/types/plant';
import { parseAuthCallbackUrl } from '@/utils/authDeepLink';

export interface SignUpPayload {
  email: string;
  password: string;
  displayName: string;
}

interface AuthStoreState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isInitialized: boolean;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  authError: string | null;
  initializeAuth: () => Promise<void>;
  handleAuthDeepLink: (url: string) => Promise<{
    ok: boolean;
    handled: boolean;
    isRecovery?: boolean;
    error?: string;
  }>;
  signInWithEmail: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  signUpWithEmail: (payload: SignUpPayload) => Promise<{
    ok: boolean;
    needsEmailConfirmation?: boolean;
    error?: string;
  }>;
  signInWithGoogle: () => Promise<{ ok: boolean; cancelled?: boolean; error?: string }>;
  resetPasswordForEmail: (email: string) => Promise<{ ok: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ ok: boolean; error?: string }>;
  cancelPasswordRecovery: () => Promise<void>;
  updateProfile: (updates: {
    displayName?: string;
    avatarUrl?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  deleteAccount: () => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

let authSubscription: Subscription | null = null;
let googleConfigured = false;

function getGoogleSigninModule(): GoogleSigninModule | null {
  if (Platform.OS === 'web') return null;
  if (!TurboModuleRegistry.get('RNGoogleSignin')) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-google-signin/google-signin') as GoogleSigninModule;
  } catch {
    return null;
  }
}

function ensureGoogleConfigured(mod: GoogleSigninModule): string | null {
  const webClientId = (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '').trim();
  if (!webClientId || Platform.OS === 'web') return null;

  if (!googleConfigured) {
    const iosClientId = (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '').trim();
    mod.GoogleSignin.configure({
      webClientId,
      ...(iosClientId ? { iosClientId } : {}),
    });
    googleConfigured = true;
  }

  return webClientId;
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isInitialized: false,
  isLoading: false,
  isPasswordRecovery: false,
  authError: null,

  initializeAuth: async () => {
    if (!supabase) {
      const localSession = await readLocalAuthSession();
      set({
        session: localSession?.session ?? null,
        user: localSession?.user ?? null,
        profile: localSession?.profile ?? null,
        isInitialized: true,
      });
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const profile = await fetchOrCreateUserProfile(session.user);
        set({
          session,
          user: session.user,
          profile,
          isInitialized: true,
        });
        void usePlantStore.getState().syncWithSupabase();
      } else {
        set({
          session: null,
          user: null,
          profile: null,
          isInitialized: true,
        });
      }

      if (!authSubscription) {
        const { data } = supabase.auth.onAuthStateChange(
          (event, nextSession) => {
            const nextUser = nextSession?.user ?? null;
            const nextRecovery =
              event === 'PASSWORD_RECOVERY'
                ? true
                : event === 'SIGNED_OUT'
                  ? false
                  : get().isPasswordRecovery;

            set({
              session: nextSession,
              user: nextUser,
              profile: nextUser ? get().profile : null,
              isPasswordRecovery: nextRecovery,
            });

            if (nextUser && !nextRecovery) {
              void (async () => {
                const profile = await fetchOrCreateUserProfile(nextUser);
                set({ profile });
                await usePlantStore.getState().syncWithSupabase(nextUser.id);
              })();
            }
          }
        );
        authSubscription = data.subscription;
      }
    } catch {
      set({ isInitialized: true });
    }
  },

  handleAuthDeepLink: async (url) => {
    const parsed = parseAuthCallbackUrl(url);
    if (!parsed) {
      return { ok: true, handled: false };
    }

    if (parsed.errorDescription) {
      const msg = toFriendlyErrorMessage(parsed.errorDescription, 'auth');
      set({ authError: msg, isPasswordRecovery: false });
      return { ok: false, handled: true, error: msg };
    }

    if (!supabase) {
      return { ok: false, handled: true, error: i18n.t('auth.resetRequiresCloud') };
    }

    set({ isLoading: true, authError: null });
    try {
      if (parsed.code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          parsed.code
        );
        if (error) {
          const msg = toFriendlyErrorMessage(error, 'auth');
          set({ isLoading: false, authError: msg });
          return { ok: false, handled: true, error: msg };
        }
        const isRecovery = parsed.isRecovery || get().isPasswordRecovery;
        set({
          session: data.session ?? get().session,
          user: data.user ?? data.session?.user ?? get().user,
          isPasswordRecovery: isRecovery,
          isLoading: false,
          authError: null,
        });
        return { ok: true, handled: true, isRecovery };
      }

      if (parsed.accessToken && parsed.refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: parsed.accessToken,
          refresh_token: parsed.refreshToken,
        });
        if (error) {
          const msg = toFriendlyErrorMessage(error, 'auth');
          set({ isLoading: false, authError: msg });
          return { ok: false, handled: true, error: msg };
        }
        const isRecovery = parsed.isRecovery || get().isPasswordRecovery;
        set({
          session: data.session ?? get().session,
          user: data.user ?? data.session?.user ?? get().user,
          isPasswordRecovery: isRecovery,
          isLoading: false,
          authError: null,
        });
        return { ok: true, handled: true, isRecovery };
      }

      set({ isLoading: false });
      return { ok: true, handled: false };
    } catch (err) {
      const msg = toFriendlyErrorMessage(err, 'auth');
      set({ isLoading: false, authError: msg });
      return { ok: false, handled: true, error: msg };
    }
  },

  signInWithEmail: async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    set({ isLoading: true, authError: null });

    if (!supabase) {
      try {
        const res = await signInLocally(normalizedEmail, password);
        if (!res.ok) {
          const msg = toFriendlyErrorMessage(res.error, 'auth');
          set({ isLoading: false, authError: msg });
          return { ok: false, error: msg };
        }
        set({
          session: res.session.session,
          user: res.session.user,
          profile: res.session.profile,
          isLoading: false,
          authError: null,
        });
        return { ok: true };
      } catch (err) {
        const msg = toFriendlyErrorMessage(err, 'auth');
        set({ isLoading: false, authError: msg });
        return { ok: false, error: msg };
      }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error || !data.user) {
        const msg = toFriendlyErrorMessage(
          error ?? 'Invalid login credentials',
          'auth'
        );
        set({ isLoading: false, authError: msg });
        return { ok: false, error: msg };
      }

      const profile = await fetchOrCreateUserProfile(data.user);
      set({
        session: data.session,
        user: data.user,
        profile,
        isLoading: false,
        authError: null,
      });

      void usePlantStore.getState().syncWithSupabase();
      return { ok: true };
    } catch (err) {
      const msg = toFriendlyErrorMessage(err, 'auth');
      set({ isLoading: false, authError: msg });
      return { ok: false, error: msg };
    }
  },

  signUpWithEmail: async ({ email, password, displayName }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const cleanName =
      displayName.trim() || normalizedEmail.split('@')[0] || 'Gardener';
    set({ isLoading: true, authError: null });

    if (!supabase) {
      try {
        const localSession = await signUpLocally({
          normalizedEmail,
          password,
          cleanName,
        });
        set({
          session: localSession.session,
          user: localSession.user,
          profile: localSession.profile,
          isLoading: false,
          authError: null,
        });
        return { ok: true, needsEmailConfirmation: false };
      } catch (err) {
        const msg = toFriendlyErrorMessage(err, 'auth');
        set({ isLoading: false, authError: msg });
        return { ok: false, error: msg };
      }
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            display_name: cleanName,
          },
        },
      });

      if (error) {
        const msg = toFriendlyErrorMessage(error, 'auth');
        set({ isLoading: false, authError: msg });
        return { ok: false, error: msg };
      }

      if (data.user && !data.session) {
        set({ isLoading: false, authError: null });
        return { ok: true, needsEmailConfirmation: true };
      }

      if (data.user && data.session) {
        const profile = await fetchOrCreateUserProfile(data.user);
        set({
          session: data.session,
          user: data.user,
          profile,
          isLoading: false,
          authError: null,
        });
        void usePlantStore.getState().syncWithSupabase();
      } else {
        set({ isLoading: false });
      }

      return { ok: true, needsEmailConfirmation: false };
    } catch (err) {
      const msg = toFriendlyErrorMessage(err, 'auth');
      set({ isLoading: false, authError: msg });
      return { ok: false, error: msg };
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, authError: null });

    if (!supabase) {
      const msg = i18n.t('errors.googleUnavailable');
      set({ isLoading: false, authError: msg });
      return { ok: false, error: msg };
    }

    const googleMod = getGoogleSigninModule();
    if (!googleMod) {
      const msg = i18n.t('errors.googleUnavailable');
      set({ isLoading: false, authError: msg });
      return { ok: false, error: msg };
    }

    const webClientId = ensureGoogleConfigured(googleMod);
    if (!webClientId) {
      const msg = i18n.t('errors.googleUnavailable');
      set({ isLoading: false, authError: msg });
      return { ok: false, error: msg };
    }

    const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = googleMod;

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        set({ isLoading: false, authError: null });
        return { ok: false, cancelled: true };
      }

      const idToken = response.data.idToken;
      if (!idToken) {
        const msg = 'Google Sign-In did not return an ID token.';
        set({ isLoading: false, authError: msg });
        return { ok: false, error: msg };
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error || !data.user) {
        const msg = toFriendlyErrorMessage(error, 'auth');
        set({ isLoading: false, authError: msg });
        return { ok: false, error: msg };
      }

      const profile = await fetchOrCreateUserProfile(data.user);
      set({
        session: data.session,
        user: data.user,
        profile,
        isLoading: false,
        authError: null,
      });

      void usePlantStore.getState().syncWithSupabase();
      return { ok: true };
    } catch (err) {
      if (isErrorWithCode(err)) {
        if (err.code === statusCodes.SIGN_IN_CANCELLED) {
          set({ isLoading: false, authError: null });
          return { ok: false, cancelled: true };
        }
        if (err.code === statusCodes.IN_PROGRESS) {
          set({ isLoading: false });
          return { ok: false, cancelled: true };
        }
        if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          const msg = i18n.t('errors.googlePlayServices');
          set({ isLoading: false, authError: msg });
          return { ok: false, error: msg };
        }
      }

      const msg = toFriendlyErrorMessage(err, 'auth');
      set({ isLoading: false, authError: msg });
      return { ok: false, error: msg };
    }
  },

  resetPasswordForEmail: async (email) => {
    const normalizedEmail = email.trim().toLowerCase();
    set({ isLoading: true, authError: null });

    if (!supabase) {
      const msg = i18n.t('auth.resetRequiresCloud');
      set({ isLoading: false, authError: msg });
      return { ok: false, error: msg };
    }

    try {
      const redirectTo = Linking.createURL('/auth');
      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        { redirectTo }
      );

      if (error) {
        const msg = toFriendlyErrorMessage(error, 'auth');
        set({ isLoading: false, authError: msg });
        return { ok: false, error: msg };
      }

      set({ isLoading: false, authError: null });
      return { ok: true };
    } catch (err) {
      const msg = toFriendlyErrorMessage(err, 'auth');
      set({ isLoading: false, authError: msg });
      return { ok: false, error: msg };
    }
  },

  updatePassword: async (newPassword) => {
    set({ isLoading: true, authError: null });

    if (!supabase) {
      const msg = i18n.t('auth.resetRequiresCloud');
      set({ isLoading: false, authError: msg });
      return { ok: false, error: msg };
    }

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        const msg = toFriendlyErrorMessage(error, 'auth');
        set({ isLoading: false, authError: msg });
        return { ok: false, error: msg };
      }

      const activeUser = data.user ?? get().user;
      const profile = activeUser
        ? await fetchOrCreateUserProfile(activeUser)
        : get().profile;

      set({
        user: activeUser,
        profile,
        isPasswordRecovery: false,
        isLoading: false,
        authError: null,
      });

      if (activeUser) {
        void usePlantStore.getState().syncWithSupabase(activeUser.id);
      }

      return { ok: true };
    } catch (err) {
      const msg = toFriendlyErrorMessage(err, 'auth');
      set({ isLoading: false, authError: msg });
      return { ok: false, error: msg };
    }
  },

  cancelPasswordRecovery: async () => {
    set({ isPasswordRecovery: false, authError: null });
    if (supabase) {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    }
    set({ session: null, user: null, profile: null });
  },

  updateProfile: async (updates) => {
    const currentUser = get().user;
    if (!currentUser) {
      return {
        ok: false,
        error: 'You must be signed in to update your profile.',
      };
    }

    set({ isLoading: true, authError: null });

    if (!supabase) {
      try {
        const localSession = await updateLocalProfile(
          currentUser,
          get().profile,
          updates
        );
        set({
          profile: localSession.profile,
          user: localSession.user,
          session: localSession.session,
          isLoading: false,
        });
        return { ok: true };
      } catch (err) {
        const msg = toFriendlyErrorMessage(err, 'profile');
        set({ isLoading: false, authError: msg });
        return { ok: false, error: msg };
      }
    }

    try {
      const updated = await updateUserProfileInSupabase(
        currentUser.id,
        updates
      );
      if (updated) {
        set({ profile: updated, isLoading: false });
      } else {
        set({ isLoading: false });
      }
      return { ok: true };
    } catch (err) {
      const msg = toFriendlyErrorMessage(err, 'profile');
      set({ isLoading: false, authError: msg });
      return { ok: false, error: msg };
    }
  },

  deleteAccount: async () => {
    const currentUser = get().user;
    if (!currentUser) {
      return {
        ok: false,
        error: 'You must be signed in to delete your account.',
      };
    }

    set({ isLoading: true, authError: null });

    try {
      const googleMod = getGoogleSigninModule();
      await googleMod?.GoogleSignin.signOut().catch(() => undefined);

      if (supabase) {
        await deleteAccountInSupabase();
        await supabase.auth.signOut({ scope: 'local' });
        await clearLocalAuthSession();
      } else {
        await deleteLocalAccount(currentUser.email);
      }

      await usePlantStore.getState().clearUserGarden();
      set({
        session: null,
        user: null,
        profile: null,
        isLoading: false,
        authError: null,
      });
      return { ok: true };
    } catch (err) {
      const msg = toFriendlyErrorMessage(err, 'delete_account');
      set({ isLoading: false, authError: msg });
      return { ok: false, error: msg };
    }
  },

  signOut: async () => {
    set({ isLoading: true, authError: null });
    try {
      await clearLocalAuthSession();
      const googleMod = getGoogleSigninModule();
      await googleMod?.GoogleSignin.signOut().catch(() => undefined);
      if (supabase) {
        await supabase.auth.signOut();
      }
      await usePlantStore.getState().clearUserGarden();
    } finally {
      set({
        session: null,
        user: null,
        profile: null,
        isLoading: false,
        authError: null,
      });
    }
  },

  clearError: () => set({ authError: null }),
}));
