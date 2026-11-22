import type { User } from '@supabase/supabase-js';

import { supabase } from '@/services/supabase/client';
import {
  mapRowToProfile,
  type DbProfileRow,
} from '@/services/supabase/mappers';
import type { UserProfile } from '@/types/plant';

export async function fetchOrCreateUserProfile(
  user: User
): Promise<UserProfile | null> {
  if (!supabase) return null;

  try {
    const { data: existing, error: selectError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!selectError && existing) {
      return mapRowToProfile(existing as DbProfileRow);
    }

    const fallbackName =
      (typeof user.user_metadata?.display_name === 'string' &&
        user.user_metadata.display_name.trim()) ||
      (user.email ? user.email.split('@')[0] : 'Gardener');

    const nowIso = new Date().toISOString();
    const { data: created, error: upsertError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: user.email ?? '',
          display_name: fallbackName,
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      )
      .select('*')
      .single();

    if (upsertError || !created) {
      return {
        id: user.id,
        email: user.email ?? '',
        displayName: fallbackName,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    }

    return mapRowToProfile(created as DbProfileRow);
  } catch {
    return null;
  }
}

export async function updateUserProfileInSupabase(
  userId: string,
  updates: {
    displayName?: string;
    avatarUrl?: string;
  }
): Promise<UserProfile | null> {
  if (!supabase) return null;

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.displayName !== undefined) {
    payload.display_name = updates.displayName.trim() || 'Gardener';
  }
  if (updates.avatarUrl !== undefined) {
    payload.avatar_url = updates.avatarUrl;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Could not update profile.');
  }

  return mapRowToProfile(data as DbProfileRow);
}

/**
 * Invokes the `delete-account` Supabase Edge Function to permanently delete
 * the currently authenticated user's account, garden data, and uploaded photos.
 */
export async function deleteAccountInSupabase(): Promise<void> {
  if (!supabase) {
    throw new Error('Cloud sync is not configured.');
  }

  const { data, error } = await supabase.functions.invoke<{
    deleted?: boolean;
    error?: string;
  }>('delete-account', {
    body: { confirm: 'DELETE' },
  });

  if (error) {
    throw new Error(
      error.message || 'Could not delete your account. Please try again.'
    );
  }

  if (data && data.error) {
    throw new Error(data.error);
  }
}
