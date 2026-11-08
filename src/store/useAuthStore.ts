/**
 * FloraLog — Authentication & Gardener Profile Store
 * Powered by Supabase Auth + `public.profiles` table synchronization,
 * with automatic AsyncStorage session persistence when running locally.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session, Subscription, User } from "@supabase/supabase-js";
import { create } from "zustand";

import {
  fetchOrCreateUserProfile,
  supabase,
  updateUserProfileInSupabase,
} from "@/services/supabase";
import { usePlantStore } from "@/store/usePlantStore";
import type { ExperienceLevel, UserProfile } from "@/types/plant";

const LOCAL_SESSION_STORAGE_KEY = "floralog-auth-session-v1";
const LOCAL_ACCOUNTS_STORAGE_KEY = "floralog-auth-accounts-v1";

interface LocalStoredAccount {
  id: string;
  email: string;
  password: string;
  profile: UserProfile;
}

interface LocalStoredSession {
  user: User;
  session: Session;
  profile: UserProfile;
}

function buildLocalUserAndSession(profile: UserProfile): LocalStoredSession {
  const nowIso = new Date().toISOString();
  const user: User = {
    id: profile.id,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {
      display_name: profile.displayName,
      experience_level: profile.experienceLevel,
    },
    aud: "authenticated",
    created_at: profile.createdAt || nowIso,
    email: profile.email,
  };

  const session: Session = {
    access_token: `local-token-${profile.id}`,
    refresh_token: `local-refresh-${profile.id}`,
    expires_in: 60 * 60 * 24 * 365,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    token_type: "bearer",
    user,
  };

  return { user, session, profile };
}

async function readLocalAccounts(): Promise<Record<string, LocalStoredAccount>> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_ACCOUNTS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, LocalStoredAccount>;
  } catch {
    return {};
  }
}

async function writeLocalAccounts(
  accounts: Record<string, LocalStoredAccount>,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      LOCAL_ACCOUNTS_STORAGE_KEY,
      JSON.stringify(accounts),
    );
  } catch {
    // Ignore storage write errors
  }
}

export interface SignUpPayload {
  email: string;
  password: string;
  displayName: string;
  experienceLevel: ExperienceLevel;
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
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  signUpWithEmail: (
    payload: SignUpPayload,
  ) => Promise<{
    ok: boolean;
    needsEmailConfirmation?: boolean;
    error?: string;
  }>;
  updateProfile: (updates: {
    displayName?: string;
    experienceLevel?: ExperienceLevel;
    bio?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

let authSubscription: Subscription | null = null;

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isInitialized: false,
  isLoading: false,
  authError: null,

  initializeAuth: async () => {
    if (!supabase) {
      try {
        const rawSession = await AsyncStorage.getItem(
          LOCAL_SESSION_STORAGE_KEY,
        );
        if (rawSession) {
          const parsed = JSON.parse(rawSession) as LocalStoredSession;
          if (parsed?.user && parsed?.session) {
            set({
              session: parsed.session,
              user: parsed.user,
              profile: parsed.profile,
              isInitialized: true,
            });
            return;
          }
        }
      } catch {
        // Ignore corrupt local session
      }
      set({
        session: null,
        user: null,
        profile: null,
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
                await usePlantStore.getState().syncWithSupabase();
              })();
            }
          },
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
        const accounts = await readLocalAccounts();
        const existing = accounts[normalizedEmail];

        if (existing && existing.password !== password) {
          const msg = "Invalid email or password.";
          set({ isLoading: false, authError: msg });
          return { ok: false, error: msg };
        }

        const nowIso = new Date().toISOString();
        const profile: UserProfile = existing
          ? existing.profile
          : {
              id: `local-user-${Date.now()}`,
              email: normalizedEmail,
              displayName: normalizedEmail.split("@")[0] || "Gardener",
              experienceLevel: "enthusiast",
              bio: "",
              createdAt: nowIso,
              updatedAt: nowIso,
            };

        if (!existing) {
          accounts[normalizedEmail] = {
            id: profile.id,
            email: normalizedEmail,
            password,
            profile,
          };
          await writeLocalAccounts(accounts);
        }

        const localSession = buildLocalUserAndSession(profile);
        await AsyncStorage.setItem(
          LOCAL_SESSION_STORAGE_KEY,
          JSON.stringify(localSession),
        );

        set({
          session: localSession.session,
          user: localSession.user,
          profile: localSession.profile,
          isLoading: false,
          authError: null,
        });
        return { ok: true };
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Unable to sign in right now.";
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
        const msg = error?.message || "Invalid email or password.";
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
        err instanceof Error ? err.message : "Unable to sign in right now.";
      set({ isLoading: false, authError: msg });
      return { ok: false, error: msg };
    }
  },

  signUpWithEmail: async ({
    email,
    password,
    displayName,
    experienceLevel,
  }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const cleanName =
      displayName.trim() || normalizedEmail.split("@")[0] || "Gardener";
    set({ isLoading: true, authError: null });

    if (!supabase) {
      try {
        const accounts = await readLocalAccounts();
        const nowIso = new Date().toISOString();
        const profile: UserProfile = {
          id: accounts[normalizedEmail]?.id ?? `local-user-${Date.now()}`,
          email: normalizedEmail,
          displayName: cleanName,
          experienceLevel,
          bio: accounts[normalizedEmail]?.profile.bio ?? "",
          createdAt: accounts[normalizedEmail]?.profile.createdAt ?? nowIso,
          updatedAt: nowIso,
        };

        accounts[normalizedEmail] = {
          id: profile.id,
          email: normalizedEmail,
          password,
          profile,
        };
        await writeLocalAccounts(accounts);

        const localSession = buildLocalUserAndSession(profile);
        await AsyncStorage.setItem(
          LOCAL_SESSION_STORAGE_KEY,
          JSON.stringify(localSession),
        );

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
            : "Unable to create account right now.";
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
            experience_level: experienceLevel,
          },
        },
      });

      if (error) {
        set({ isLoading: false, authError: error.message });
        return { ok: false, error: error.message };
      }

      // If email confirmation is enabled in Supabase, `data.session` is null until verified
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
          : "Unable to create account right now.";
      set({ isLoading: false, authError: msg });
      return { ok: false, error: msg };
    }
  },

  updateProfile: async (updates) => {
    const currentUser = get().user;
    if (!currentUser) {
      return {
        ok: false,
        error: "You must be signed in to update your profile.",
      };
    }

    set({ isLoading: true, authError: null });

    if (!supabase) {
      try {
        const nowIso = new Date().toISOString();
        const prevProfile = get().profile;
        const nextProfile: UserProfile = {
          id: currentUser.id,
          email: currentUser.email ?? prevProfile?.email ?? "",
          displayName:
            updates.displayName !== undefined
              ? updates.displayName.trim() || "Gardener"
              : (prevProfile?.displayName ?? "Gardener"),
          experienceLevel:
            updates.experienceLevel ??
            prevProfile?.experienceLevel ??
            "enthusiast",
          bio:
            updates.bio !== undefined
              ? updates.bio.trim()
              : (prevProfile?.bio ?? ""),
          createdAt: prevProfile?.createdAt ?? nowIso,
          updatedAt: nowIso,
        };

        const localSession = buildLocalUserAndSession(nextProfile);
        await AsyncStorage.setItem(
          LOCAL_SESSION_STORAGE_KEY,
          JSON.stringify(localSession),
        );

        if (nextProfile.email) {
          const accounts = await readLocalAccounts();
          const key = nextProfile.email.toLowerCase();
          if (accounts[key]) {
            accounts[key] = {
              ...accounts[key],
              profile: nextProfile,
            };
            await writeLocalAccounts(accounts);
          }
        }

        set({
          profile: nextProfile,
          user: localSession.user,
          session: localSession.session,
          isLoading: false,
        });
        return { ok: true };
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Could not update profile.";
        set({ isLoading: false, authError: msg });
        return { ok: false, error: msg };
      }
    }

    try {
      const updated = await updateUserProfileInSupabase(
        currentUser.id,
        updates,
      );
      if (updated) {
        set({ profile: updated, isLoading: false });
      } else {
        set({ isLoading: false });
      }
      return { ok: true };
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not update profile.";
      set({ isLoading: false, authError: msg });
      return { ok: false, error: msg };
    }
  },

  signOut: async () => {
    set({ isLoading: true, authError: null });
    try {
      await AsyncStorage.removeItem(LOCAL_SESSION_STORAGE_KEY);
      if (supabase) {
        await supabase.auth.signOut();
      }
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
