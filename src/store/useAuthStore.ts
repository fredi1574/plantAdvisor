/**
 * FloraLog — Authentication & Gardener Profile Store
 * Powered by Supabase Auth + `public.profiles` table synchronization.
 */

import type { Session, Subscription, User } from "@supabase/supabase-js";
import { create } from "zustand";

import {
  fetchOrCreateUserProfile,
  supabase,
  updateUserProfileInSupabase,
} from "@/services/supabase";
import { usePlantStore } from "@/store/usePlantStore";
import type { ExperienceLevel, UserProfile } from "@/types/plant";

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
      set({ isInitialized: true });
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
    if (!supabase) {
      return { ok: false, error: "Supabase is not configured in .env." };
    }

    set({ isLoading: true, authError: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
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
    if (!supabase) {
      return { ok: false, error: "Supabase is not configured in .env." };
    }

    set({ isLoading: true, authError: null });
    try {
      const cleanName = displayName.trim() || email.split("@")[0] || "Gardener";
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
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
    if (!supabase) return;
    set({ isLoading: true, authError: null });
    try {
      await supabase.auth.signOut();
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
