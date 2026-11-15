/**
 * FloraLog — Supabase Client, Auth Profile & Cloud Sync Service
 * Provides offline-resilient PostgreSQL & Storage synchronization for:
 *   - `profiles` (1:1 with `auth.users`)
 *   - `species_catalog`
 *   - `user_plants`
 *   - `notebook_entries`
 *   - `health_assessments`
 *   - `plant-photos` Storage bucket
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { prepareImageForAI } from '@/services/imageUtils';
import type {
  ExperienceLevel,
  HealthAssessment,
  NotebookEntry,
  SpeciesCatalog,
  UserPlant,
  UserProfile,
} from '@/types/plant';

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
const supabaseKey = (
  process.env.EXPO_PUBLIC_SUPABASE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  ''
).trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

// SSR-safe storage adapter for Expo Router (Web static rendering + iOS/Android)
const expoStorage = {
  getItem: (key: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return Promise.resolve(null);
    }
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return Promise.resolve();
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return Promise.resolve();
    }
    return AsyncStorage.removeItem(key);
  },
};

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: expoStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

// ============================================================================
// Multi-Tenant ID Scoping (Prevents Seed ID Collisions Across Users)
// ============================================================================

function toDbId(localId: string, userId: string): string {
  const prefix = `${userId}:`;
  return localId.startsWith(prefix) ? localId : `${prefix}${localId}`;
}

function fromDbId(dbId: string, userId: string | null): string {
  if (userId && dbId.startsWith(`${userId}:`)) {
    return dbId.slice(userId.length + 1);
  }
  const colonIdx = dbId.indexOf(':');
  if (colonIdx === 36) {
    return dbId.slice(colonIdx + 1);
  }
  return dbId;
}

// ============================================================================
// Database Row Shapes (1:1 with `supabase/schema.sql`)
// ============================================================================

interface DbProfileRow {
  id: string;
  email: string | null;
  display_name: string;
  experience_level: ExperienceLevel;
  bio: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface DbUserPlantRow {
  id: string;
  user_id: string | null;
  species_id: string | null;
  nickname: string;
  species_snapshot: SpeciesCatalog;
  photo_uri: string;
  acquired_at: string;
  location: string;
  is_indoor: boolean;
  light_exposure: UserPlant['lightExposure'];
  has_drainage_hole: boolean;
  pot_material: UserPlant['potMaterial'];
  last_watered_at: string;
  custom_watering_interval_days: number;
  latest_health_assessment: HealthAssessment | null;
}

interface DbNotebookEntryRow {
  id: string;
  user_id: string | null;
  plant_id: string;
  event_type: NotebookEntry['eventType'];
  timestamp: string;
  title: string;
  notes: string;
  photo_uri: string | null;
  metrics: NotebookEntry['metrics'] | null;
}

interface DbHealthAssessmentRow {
  id: string;
  user_id: string | null;
  plant_id: string;
  created_at: string;
  image_uri: string | null;
  health_status: HealthAssessment['healthStatus'];
  detected_symptoms: string[];
  diagnosis_summary: string;
  follow_up_questions: string[];
  recommended_actions: HealthAssessment['recommendedActions'];
  adjusted_watering_interval_days: number;
  succulent_guardrail_applied: string | null;
}

function mapRowToProfile(row: DbProfileRow): UserProfile {
  return {
    id: row.id,
    email: row.email ?? '',
    displayName: row.display_name,
    experienceLevel: row.experience_level,
    bio: row.bio ?? '',
    avatarUrl: row.avatar_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToPlant(row: DbUserPlantRow): UserPlant {
  const localPlantId = fromDbId(row.id, row.user_id);
  const assessment = row.latest_health_assessment
    ? {
        ...row.latest_health_assessment,
        id: fromDbId(row.latest_health_assessment.id, row.user_id),
        plantId: localPlantId,
      }
    : undefined;

  return {
    id: localPlantId,
    nickname: row.nickname,
    species: {
      ...row.species_snapshot,
      id: fromDbId(row.species_snapshot.id, row.user_id),
    },
    photoUri: row.photo_uri,
    acquiredAt: row.acquired_at,
    location: row.location,
    isIndoor: row.is_indoor,
    lightExposure: row.light_exposure,
    hasDrainageHole: row.has_drainage_hole,
    potMaterial: row.pot_material,
    lastWateredAt: row.last_watered_at,
    customWateringIntervalDays: row.custom_watering_interval_days,
    latestHealthAssessment: assessment,
  };
}

function mapPlantToRow(plant: UserPlant, userId: string): DbUserPlantRow {
  return {
    id: toDbId(plant.id, userId),
    user_id: userId,
    species_id: toDbId(plant.species.id, userId),
    nickname: plant.nickname,
    species_snapshot: plant.species,
    photo_uri: plant.photoUri,
    acquired_at: plant.acquiredAt,
    location: plant.location,
    is_indoor: plant.isIndoor,
    light_exposure: plant.lightExposure,
    has_drainage_hole: plant.hasDrainageHole,
    pot_material: plant.potMaterial,
    last_watered_at: plant.lastWateredAt,
    custom_watering_interval_days: plant.customWateringIntervalDays,
    latest_health_assessment: plant.latestHealthAssessment ?? null,
  };
}

function mapRowToEntry(row: DbNotebookEntryRow): NotebookEntry {
  return {
    id: fromDbId(row.id, row.user_id),
    plantId: fromDbId(row.plant_id, row.user_id),
    eventType: row.event_type,
    timestamp: row.timestamp,
    title: row.title,
    notes: row.notes,
    photoUri: row.photo_uri ?? undefined,
    metrics: row.metrics ?? undefined,
  };
}

function mapEntryToRow(entry: NotebookEntry, userId: string): DbNotebookEntryRow {
  return {
    id: toDbId(entry.id, userId),
    user_id: userId,
    plant_id: toDbId(entry.plantId, userId),
    event_type: entry.eventType,
    timestamp: entry.timestamp,
    title: entry.title,
    notes: entry.notes,
    photo_uri: entry.photoUri ?? null,
    metrics: entry.metrics ?? null,
  };
}

function mapRowToHealthAssessment(row: DbHealthAssessmentRow): HealthAssessment {
  return {
    id: fromDbId(row.id, row.user_id),
    plantId: fromDbId(row.plant_id, row.user_id),
    createdAt: row.created_at,
    imageUri: row.image_uri ?? undefined,
    healthStatus: row.health_status,
    detectedSymptoms: Array.isArray(row.detected_symptoms) ? row.detected_symptoms : [],
    diagnosisSummary: row.diagnosis_summary,
    followUpQuestions: Array.isArray(row.follow_up_questions) ? row.follow_up_questions : [],
    recommendedActions: Array.isArray(row.recommended_actions) ? row.recommended_actions : [],
    adjustedWateringIntervalDays: row.adjusted_watering_interval_days,
    succulentGuardrailApplied: row.succulent_guardrail_applied ?? undefined,
  };
}

// ============================================================================
// Session, Profile & Storage Helpers
// ============================================================================

/**
 * Returns the currently signed-in Supabase user's ID, or `null` if in offline/guest mode.
 */
export async function getCurrentUserId(): Promise<string | null> {
  if (!supabase) return null;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

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

function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/^data:[^;]+;base64,/, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Uploads a local camera/gallery URI to the `plant-photos` Supabase Storage bucket
 * and returns its public HTTPS URL. Remote HTTP(S) URLs are returned unchanged.
 */
export async function uploadPlantPhotoIfNeeded(
  photoUri: string | undefined,
  plantId: string
): Promise<string | undefined> {
  if (!photoUri || !supabase) return photoUri;
  if (photoUri.startsWith('http://') || photoUri.startsWith('https://')) {
    return photoUri;
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) return photoUri;

    const prepared = await prepareImageForAI(photoUri);
    if (!prepared.base64) return photoUri;

    const ext = prepared.mimeType === 'image/webp' ? 'webp' : 'jpg';
    const filePath = `${userId}/${plantId}/${Date.now()}.${ext}`;
    const fileBytes = base64ToUint8Array(prepared.base64);

    const { error } = await supabase.storage
      .from('plant-photos')
      .upload(filePath, fileBytes, {
        contentType: prepared.mimeType,
        upsert: true,
      });

    if (error) {
      return photoUri;
    }

    const { data } = supabase.storage.from('plant-photos').getPublicUrl(filePath);
    return data.publicUrl || photoUri;
  } catch {
    return photoUri;
  }
}

async function cleanupPlantStorageFolder(userId: string, plantId: string): Promise<void> {
  if (!supabase) return;
  try {
    const folder = `${userId}/${plantId}`;
    const { data: items, error } = await supabase.storage
      .from('plant-photos')
      .list(folder, { limit: 100 });
    if (error || !items || items.length === 0) return;

    const paths = items
      .filter((item) => item.name)
      .map((item) => `${folder}/${item.name}`);
    if (paths.length > 0) {
      await supabase.storage.from('plant-photos').remove(paths);
    }
  } catch (err) {
    console.warn('[Supabase] cleanupPlantStorageFolder error:', err);
  }
}

async function deletePlantPhotoByUrl(photoUrl?: string): Promise<void> {
  if (!supabase || !photoUrl) return;
  try {
    const marker = '/storage/v1/object/public/plant-photos/';
    const idx = photoUrl.indexOf(marker);
    if (idx === -1) return;
    const objectPath = decodeURIComponent(photoUrl.slice(idx + marker.length).split('?')[0]);
    if (objectPath) {
      await supabase.storage.from('plant-photos').remove([objectPath]);
    }
  } catch (err) {
    console.warn('[Supabase] deletePlantPhotoByUrl error:', err);
  }
}

export interface SyncOperationResult {
  ok: boolean;
  uploadedPhotoUri?: string;
  error?: string;
}

// ============================================================================
// CRUD Synchronization Operations (Scoped to Authenticated User)
// ============================================================================

export async function syncPlantToSupabase(
  plant: UserPlant,
  previousPhotoUri?: string
): Promise<SyncOperationResult> {
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  try {
    const userId = await getCurrentUserId();
    if (!userId) return { ok: false, error: 'Not authenticated' };

    const remotePhotoUri =
      (await uploadPlantPhotoIfNeeded(plant.photoUri, plant.id)) ?? plant.photoUri;

    const updatedPlant: UserPlant = {
      ...plant,
      photoUri: remotePhotoUri,
    };

    // 1. Upsert species catalog entry first (foreign key target)
    const { error: speciesError } = await supabase.from('species_catalog').upsert(
      {
        id: toDbId(updatedPlant.species.id, userId),
        user_id: userId,
        common_name: updatedPlant.species.commonName,
        scientific_name: updatedPlant.species.scientificName,
        family: updatedPlant.species.family,
        plant_type: updatedPlant.species.plantType,
        baseline_care: updatedPlant.species.baselineCare,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (speciesError) {
      console.warn('[Supabase] Failed to upsert species_catalog:', speciesError.message);
      return { ok: false, error: speciesError.message };
    }

    // 2. Upsert the plant record
    const { error: plantError } = await supabase
      .from('user_plants')
      .upsert(
        {
          ...mapPlantToRow(updatedPlant, userId),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (plantError) {
      console.warn('[Supabase] Failed to upsert user_plants:', plantError.message);
      return { ok: false, error: plantError.message };
    }

    // 3. Upsert latest health assessment if present
    if (updatedPlant.latestHealthAssessment) {
      await syncHealthAssessmentToSupabase(updatedPlant.latestHealthAssessment);
    }

    // 4. Clean up superseded plant photo in storage if replaced
    if (previousPhotoUri && previousPhotoUri !== remotePhotoUri) {
      await deletePlantPhotoByUrl(previousPhotoUri);
    }

    return {
      ok: true,
      uploadedPhotoUri: remotePhotoUri !== plant.photoUri ? remotePhotoUri : undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    console.warn('[Supabase] syncPlantToSupabase error:', err);
    return { ok: false, error: message };
  }
}

export async function syncPlantsBatchToSupabase(
  plants: UserPlant[]
): Promise<{ ok: boolean; plants: UserPlant[]; error?: string }> {
  if (!supabase || plants.length === 0) return { ok: true, plants };

  try {
    const userId = await getCurrentUserId();
    if (!userId) return { ok: false, plants, error: 'Not authenticated' };

    const uploadedPlants: UserPlant[] = await Promise.all(
      plants.map(async (p) => {
        const remoteUri = (await uploadPlantPhotoIfNeeded(p.photoUri, p.id)) ?? p.photoUri;
        return { ...p, photoUri: remoteUri };
      })
    );

    const nowIso = new Date().toISOString();

    const speciesMap = new Map<string, Record<string, unknown>>();
    for (const p of uploadedPlants) {
      const dbSpeciesId = toDbId(p.species.id, userId);
      speciesMap.set(dbSpeciesId, {
        id: dbSpeciesId,
        user_id: userId,
        common_name: p.species.commonName,
        scientific_name: p.species.scientificName,
        family: p.species.family,
        plant_type: p.species.plantType,
        baseline_care: p.species.baselineCare,
        updated_at: nowIso,
      });
    }

    const { error: speciesError } = await supabase
      .from('species_catalog')
      .upsert(Array.from(speciesMap.values()), { onConflict: 'id' });

    if (speciesError) {
      console.warn('[Supabase] Failed batch upsert species_catalog:', speciesError.message);
      return { ok: false, plants: uploadedPlants, error: speciesError.message };
    }

    const plantRows = uploadedPlants.map((p) => ({
      ...mapPlantToRow(p, userId),
      updated_at: nowIso,
    }));

    const { error } = await supabase
      .from('user_plants')
      .upsert(plantRows, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase] Failed batch upsert user_plants:', error.message);
      return { ok: false, plants: uploadedPlants, error: error.message };
    }

    return { ok: true, plants: uploadedPlants };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Batch plant sync failed';
    console.warn('[Supabase] syncPlantsBatchToSupabase error:', err);
    return { ok: false, plants, error: message };
  }
}

export async function deletePlantFromSupabase(plantId: string): Promise<SyncOperationResult> {
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  try {
    const userId = await getCurrentUserId();
    if (!userId) return { ok: false, error: 'Not authenticated' };

    const { error } = await supabase
      .from('user_plants')
      .delete()
      .in('id', [toDbId(plantId, userId), plantId]);
    if (error) {
      console.warn('[Supabase] Failed to delete plant:', error.message);
      return { ok: false, error: error.message };
    }

    await cleanupPlantStorageFolder(userId, plantId);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete plant failed';
    console.warn('[Supabase] deletePlantFromSupabase error:', err);
    return { ok: false, error: message };
  }
}

export async function syncCareEntryToSupabase(
  entry: NotebookEntry
): Promise<SyncOperationResult> {
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  try {
    const userId = await getCurrentUserId();
    if (!userId) return { ok: false, error: 'Not authenticated' };

    const remotePhotoUri = await uploadPlantPhotoIfNeeded(entry.photoUri, entry.plantId);

    const { error } = await supabase.from('notebook_entries').upsert(
      {
        ...mapEntryToRow({ ...entry, photoUri: remotePhotoUri }, userId),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.warn('[Supabase] Failed to upsert notebook_entries:', error.message);
      return { ok: false, error: error.message };
    }

    return {
      ok: true,
      uploadedPhotoUri: remotePhotoUri !== entry.photoUri ? remotePhotoUri : undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Care entry sync failed';
    console.warn('[Supabase] syncCareEntryToSupabase error:', err);
    return { ok: false, error: message };
  }
}

export async function syncCareEntriesBatchToSupabase(
  entries: NotebookEntry[]
): Promise<{ ok: boolean; entries: NotebookEntry[]; error?: string }> {
  if (!supabase || entries.length === 0) return { ok: true, entries };

  try {
    const userId = await getCurrentUserId();
    if (!userId) return { ok: false, entries, error: 'Not authenticated' };

    const uploadedEntries: NotebookEntry[] = await Promise.all(
      entries.map(async (e) => {
        const remoteUri = await uploadPlantPhotoIfNeeded(e.photoUri, e.plantId);
        return { ...e, photoUri: remoteUri };
      })
    );

    const nowIso = new Date().toISOString();
    const rows = uploadedEntries.map((e) => ({
      ...mapEntryToRow(e, userId),
      updated_at: nowIso,
    }));

    const { error } = await supabase
      .from('notebook_entries')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase] Failed batch upsert notebook_entries:', error.message);
      return { ok: false, entries: uploadedEntries, error: error.message };
    }

    return { ok: true, entries: uploadedEntries };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Batch entry sync failed';
    console.warn('[Supabase] syncCareEntriesBatchToSupabase error:', err);
    return { ok: false, entries, error: message };
  }
}

export async function deleteCareEntryFromSupabase(
  entryId: string
): Promise<SyncOperationResult> {
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  try {
    const userId = await getCurrentUserId();
    if (!userId) return { ok: false, error: 'Not authenticated' };

    const { error } = await supabase
      .from('notebook_entries')
      .delete()
      .in('id', [toDbId(entryId, userId), entryId]);
    if (error) {
      console.warn('[Supabase] Failed to delete notebook entry:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete entry failed';
    console.warn('[Supabase] deleteCareEntryFromSupabase error:', err);
    return { ok: false, error: message };
  }
}

export async function syncHealthAssessmentToSupabase(
  assessment: HealthAssessment
): Promise<void> {
  if (!supabase) return;

  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const remoteImageUri = await uploadPlantPhotoIfNeeded(
      assessment.imageUri,
      assessment.plantId
    );

    const { error } = await supabase.from('health_assessments').upsert(
      {
        id: toDbId(assessment.id, userId),
        user_id: userId,
        plant_id: toDbId(assessment.plantId, userId),
        created_at: assessment.createdAt,
        image_uri: remoteImageUri ?? null,
        health_status: assessment.healthStatus,
        detected_symptoms: assessment.detectedSymptoms,
        diagnosis_summary: assessment.diagnosisSummary,
        follow_up_questions: assessment.followUpQuestions,
        recommended_actions: assessment.recommendedActions,
        adjusted_watering_interval_days: assessment.adjustedWateringIntervalDays,
        succulent_guardrail_applied: assessment.succulentGuardrailApplied ?? null,
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.warn('[Supabase] Failed to upsert health_assessments:', error.message);
    }
  } catch (err) {
    console.warn('[Supabase] syncHealthAssessmentToSupabase error:', err);
  }
}

/**
 * Pulls the authenticated user's garden (`user_plants`, `notebook_entries`, `health_assessments`)
 * from Supabase. Only seeds an empty cloud garden when `options.allowSeed` is true.
 */
export async function pullOrSeedGardenWithSupabase(
  localPlants: UserPlant[],
  localEntries: NotebookEntry[],
  options?: {
    allowSeed?: boolean;
    localAssessments?: HealthAssessment[];
  }
): Promise<{
  plants: UserPlant[];
  entries: NotebookEntry[];
  healthAssessments: HealthAssessment[];
} | null> {
  if (!supabase) return null;

  try {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const [plantsResult, entriesResult, assessmentsResult] = await Promise.all([
      supabase
        .from('user_plants')
        .select('*')
        .eq('user_id', userId)
        .order('acquired_at', { ascending: false }),
      supabase
        .from('notebook_entries')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false }),
      supabase
        .from('health_assessments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
    ]);

    if (plantsResult.error || entriesResult.error || assessmentsResult.error) {
      console.warn(
        '[Supabase] Could not fetch user garden:',
        plantsResult.error?.message ||
          entriesResult.error?.message ||
          assessmentsResult.error?.message
      );
      return null;
    }

    const remoteAssessments = (
      (assessmentsResult.data ?? []) as DbHealthAssessmentRow[]
    ).map(mapRowToHealthAssessment);

    const latestByPlantId = new Map<string, HealthAssessment>();
    for (const assessment of remoteAssessments) {
      if (!latestByPlantId.has(assessment.plantId)) {
        latestByPlantId.set(assessment.plantId, assessment);
      }
    }

    const remotePlants = (plantsResult.data as DbUserPlantRow[]).map((row) => {
      const mapped = mapRowToPlant(row);
      if (!mapped.latestHealthAssessment) {
        const fallbackAssessment = latestByPlantId.get(mapped.id);
        if (fallbackAssessment) {
          return { ...mapped, latestHealthAssessment: fallbackAssessment };
        }
      }
      return mapped;
    });
    const remoteEntries = (entriesResult.data as DbNotebookEntryRow[]).map(mapRowToEntry);

    if (remotePlants.length === 0 && options?.allowSeed && localPlants.length > 0) {
      const plantSync = await syncPlantsBatchToSupabase(localPlants);
      const entrySync = await syncCareEntriesBatchToSupabase(localEntries);
      const localAssessments = options.localAssessments ?? [];
      for (const assessment of localAssessments) {
        await syncHealthAssessmentToSupabase(assessment);
      }
      return {
        plants: plantSync.plants,
        entries: entrySync.entries,
        healthAssessments: localAssessments,
      };
    }

    return {
      plants: remotePlants,
      entries: remoteEntries,
      healthAssessments: remoteAssessments,
    };
  } catch (err) {
    console.warn('[Supabase] pullOrSeedGardenWithSupabase error:', err);
    return null;
  }
}
