/**
 * Local AsyncStorage authentication fallback used only when Supabase env vars
 * are not configured (offline/dev preview mode).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';

import type { ExperienceLevel, UserProfile } from '@/types/plant';
import { createEntityId } from '@/utils/ids';

const LOCAL_SESSION_STORAGE_KEY = 'floralog-auth-session-v1';
const LOCAL_ACCOUNTS_STORAGE_KEY = 'floralog-auth-accounts-v1';

interface LocalStoredAccount {
  id: string;
  email: string;
  password: string;
  profile: UserProfile;
}

export interface LocalStoredSession {
  user: User;
  session: Session;
  profile: UserProfile;
}

function buildLocalUserAndSession(profile: UserProfile): LocalStoredSession {
  const nowIso = new Date().toISOString();
  const user: User = {
    id: profile.id,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {
      display_name: profile.displayName,
      experience_level: profile.experienceLevel,
    },
    aud: 'authenticated',
    created_at: profile.createdAt || nowIso,
    email: profile.email,
  };

  const session: Session = {
    access_token: `local-token-${profile.id}`,
    refresh_token: `local-refresh-${profile.id}`,
    expires_in: 60 * 60 * 24 * 365,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    token_type: 'bearer',
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
  accounts: Record<string, LocalStoredAccount>
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      LOCAL_ACCOUNTS_STORAGE_KEY,
      JSON.stringify(accounts)
    );
  } catch {
    // Ignore storage write errors
  }
}

export async function readLocalAuthSession(): Promise<LocalStoredSession | null> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalStoredSession;
    if (parsed?.user && parsed?.session) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function clearLocalAuthSession(): Promise<void> {
  await AsyncStorage.removeItem(LOCAL_SESSION_STORAGE_KEY);
}

export async function signInLocally(
  normalizedEmail: string,
  password: string
): Promise<
  { ok: true; session: LocalStoredSession } | { ok: false; error: string }
> {
  const accounts = await readLocalAccounts();
  const existing = accounts[normalizedEmail];

  if (existing && existing.password !== password) {
    return { ok: false, error: 'Invalid email or password.' };
  }

  const nowIso = new Date().toISOString();
  const profile: UserProfile = existing
    ? existing.profile
    : {
        id: createEntityId('local-user'),
        email: normalizedEmail,
        displayName: normalizedEmail.split('@')[0] || 'Gardener',
        experienceLevel: 'enthusiast',
        bio: '',
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
    JSON.stringify(localSession)
  );
  return { ok: true, session: localSession };
}

export async function signUpLocally(params: {
  normalizedEmail: string;
  password: string;
  cleanName: string;
  experienceLevel: ExperienceLevel;
}): Promise<LocalStoredSession> {
  const accounts = await readLocalAccounts();
  const nowIso = new Date().toISOString();
  const existing = accounts[params.normalizedEmail];

  const profile: UserProfile = {
    id: existing?.id ?? createEntityId('local-user'),
    email: params.normalizedEmail,
    displayName: params.cleanName,
    experienceLevel: params.experienceLevel,
    bio: existing?.profile.bio ?? '',
    createdAt: existing?.profile.createdAt ?? nowIso,
    updatedAt: nowIso,
  };

  accounts[params.normalizedEmail] = {
    id: profile.id,
    email: params.normalizedEmail,
    password: params.password,
    profile,
  };
  await writeLocalAccounts(accounts);

  const localSession = buildLocalUserAndSession(profile);
  await AsyncStorage.setItem(
    LOCAL_SESSION_STORAGE_KEY,
    JSON.stringify(localSession)
  );
  return localSession;
}

export async function updateLocalProfile(
  currentUser: User,
  prevProfile: UserProfile | null,
  updates: {
    displayName?: string;
    experienceLevel?: ExperienceLevel;
    bio?: string;
    avatarUrl?: string;
  }
): Promise<LocalStoredSession> {
  const nowIso = new Date().toISOString();
  const nextProfile: UserProfile = {
    id: currentUser.id,
    email: currentUser.email ?? prevProfile?.email ?? '',
    displayName:
      updates.displayName !== undefined
        ? updates.displayName.trim() || 'Gardener'
        : (prevProfile?.displayName ?? 'Gardener'),
    experienceLevel:
      updates.experienceLevel ?? prevProfile?.experienceLevel ?? 'enthusiast',
    bio:
      updates.bio !== undefined
        ? updates.bio.trim()
        : (prevProfile?.bio ?? ''),
    avatarUrl: updates.avatarUrl ?? prevProfile?.avatarUrl,
    createdAt: prevProfile?.createdAt ?? nowIso,
    updatedAt: nowIso,
  };

  const localSession = buildLocalUserAndSession(nextProfile);
  await AsyncStorage.setItem(
    LOCAL_SESSION_STORAGE_KEY,
    JSON.stringify(localSession)
  );

  if (nextProfile.email) {
    const accounts = await readLocalAccounts();
    const key = nextProfile.email.toLowerCase();
    if (accounts[key]) {
      accounts[key] = { ...accounts[key], profile: nextProfile };
      await writeLocalAccounts(accounts);
    }
  }

  return localSession;
}
