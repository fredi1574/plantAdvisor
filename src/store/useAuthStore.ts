/**
 * FloraLog — Authentication & Gardener Profile Store
 * Powered by Supabase Auth + `public.profiles` synchronization,
 * with automatic local AsyncStorage fallback when Supabase isn't configured.
 */

import type { Session, Subscription, User } from '@supabase/supabase-js';
import { Platform, TurboModuleRegistry } from 'react-native';
import { create } from 'zustand';

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
  authError: string | null;
  initializeAuth: () => Promise<void>;
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
          (_event, nextSession) => {
            const nextUser = nextSession?.user ?? null;
            set({
              session: nextSession,
              user: nextUser,
              profile: nextUser ? get().profile : null,
            });

            if (nextUser) {
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

  signInWithEmail: async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    set({ isLoading: true, authError: null });

    if (!supabase) {
      try {
        const res = await signInLocally(normalizedEmail, password);
        if (!res.ok) {
          set({ isLoading: false, authError: res.error });
          return { ok: false, error: res.error };
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
        const msg =
          err instanceof Error ? err.message : 'Unable to sign in right now.';
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
        const msg = error?.message || 'Invalid email or password.';
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
      const msg =
        err instanceof Error ? err.message : 'Unable to sign in right now.';
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
        const msg =
          err instanceof Error
            ? err.message
            : 'Unable to create account right now.';
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
        set({ isLoading: false, authError: error.message });
        return { ok: false, error: error.message };
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
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to create account right now.';
      set({ isLoading: false, authError: msg });
      return { ok: false, error: msg };
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, authError: null });

    if (!supabase) {
      const msg = 'Google Sign-In requires Supabase cloud configuration.';
      set({ isLoading: false, authError: msg });
      return { ok: false, error: msg };
    }

    const googleMod = getGoogleSigninModule();
    if (!googleMod) {
      const msg =
        Platform.OS === 'web'
          ? 'Google Sign-In is only available on mobile devices.'
          : 'Google Sign-In requires an EAS build or development build (not supported in Expo Go).';
      set({ isLoading: false, authError: msg });
      return { ok: false, error: msg };
    }

    const webClientId = ensureGoogleConfigured(googleMod);
    if (!webClientId) {
      const msg = 'Google Sign-In is not configured yet.';
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
        const msg = error?.message || 'Unable to sign in with Google.';
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
          const msg =
            'Google Play Services is unavailable or out of date on this device.';
          set({ isLoading: false, authError: msg });
          return { ok: false, error: msg };
        }
      }

      const msg =
        err instanceof Error ? err.message : 'Unable to sign in with Google.';
      set({ isLoading: false, authError: msg });
      return { ok: false, error: msg };
    }
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
        const msg =
          err instanceof Error ? err.message : 'Could not update profile.';
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
      const msg =
        err instanceof Error ? err.message : 'Could not update profile.';
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
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to delete your account right now.';
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
