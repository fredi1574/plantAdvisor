import type { User } from '@supabase/supabase-js';

import { supabase } from '@/services/supabase/client';
import {
  mapRowToProfile,
  type DbProfileRow,
} from '@/services/supabase/mappers';
import type { ExperienceLevel, UserProfile } from '@/types/plant';

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

    const rawLevel = user.user_metadata?.experience_level;
    const experienceLevel: ExperienceLevel =
      rawLevel === 'beginner' ||
      rawLevel === 'enthusiast' ||
      rawLevel === 'master_gardener'
        ? rawLevel
        : 'enthusiast';

    const nowIso = new Date().toISOString();
    const { data: created, error: upsertError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: user.email ?? '',
          display_name: fallbackName,
          experience_level: experienceLevel,
          bio: '',
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
        experienceLevel,
        bio: '',
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
    experienceLevel?: ExperienceLevel;
    bio?: string;
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
  if (updates.experienceLevel !== undefined) {
    payload.experience_level = updates.experienceLevel;
  }
  if (updates.bio !== undefined) {
    payload.bio = updates.bio.trim();
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
