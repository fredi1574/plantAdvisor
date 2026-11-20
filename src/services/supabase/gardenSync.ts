import { getCurrentUserId, supabase } from '@/services/supabase/client';
import {
  mapEntryToRow,
  mapPlantToRow,
  mapRowToEntry,
  mapRowToHealthAssessment,
  mapRowToPlant,
  toDbId,
  type DbHealthAssessmentRow,
  type DbNotebookEntryRow,
  type DbUserPlantRow,
} from '@/services/supabase/mappers';
import {
  cleanupPlantStorageFolder,
  deletePlantPhotoByUrl,
  uploadPlantPhotoIfNeeded,
} from '@/services/supabase/storage';
import type { HealthAssessment, NotebookEntry, UserPlant } from '@/types/plant';

export interface SyncOperationResult {
  ok: boolean;
  uploadedPhotoUri?: string;
  error?: string;
}

export async function syncPlantToSupabase(
  plant: UserPlant,
  previousPhotoUri?: string
): Promise<SyncOperationResult> {
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  try {
    const userId = await getCurrentUserId();
    if (!userId) return { ok: false, error: 'Not authenticated' };

    const remotePhotoUri =
      (await uploadPlantPhotoIfNeeded(plant.photoUri, plant.id)) ??
      plant.photoUri;

    const updatedPlant: UserPlant = {
      ...plant,
      photoUri: remotePhotoUri,
    };

    const { error: speciesError } = await supabase
      .from('species_catalog')
      .upsert(
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
      console.warn(
        '[Supabase] Failed to upsert species_catalog:',
        speciesError.message
      );
      return { ok: false, error: speciesError.message };
    }

    const { error: plantError } = await supabase.from('user_plants').upsert(
      {
        ...mapPlantToRow(updatedPlant, userId),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (plantError) {
      console.warn(
        '[Supabase] Failed to upsert user_plants:',
        plantError.message
      );
      return { ok: false, error: plantError.message };
    }

    if (updatedPlant.latestHealthAssessment) {
      await syncHealthAssessmentToSupabase(updatedPlant.latestHealthAssessment);
    }

    if (previousPhotoUri && previousPhotoUri !== remotePhotoUri) {
      await deletePlantPhotoByUrl(previousPhotoUri);
    }

    return {
      ok: true,
      uploadedPhotoUri:
        remotePhotoUri !== plant.photoUri ? remotePhotoUri : undefined,
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
        const remoteUri =
          (await uploadPlantPhotoIfNeeded(p.photoUri, p.id)) ?? p.photoUri;
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
      console.warn(
        '[Supabase] Failed batch upsert species_catalog:',
        speciesError.message
      );
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
      console.warn(
        '[Supabase] Failed batch upsert user_plants:',
        error.message
      );
      return { ok: false, plants: uploadedPlants, error: error.message };
    }

    return { ok: true, plants: uploadedPlants };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Batch plant sync failed';
    console.warn('[Supabase] syncPlantsBatchToSupabase error:', err);
    return { ok: false, plants, error: message };
  }
}

export async function deletePlantFromSupabase(
  plantId: string
): Promise<SyncOperationResult> {
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

    const remotePhotoUri = await uploadPlantPhotoIfNeeded(
      entry.photoUri,
      entry.plantId
    );

    const { error } = await supabase.from('notebook_entries').upsert(
      {
        ...mapEntryToRow({ ...entry, photoUri: remotePhotoUri }, userId),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.warn(
        '[Supabase] Failed to upsert notebook_entries:',
        error.message
      );
      return { ok: false, error: error.message };
    }

    return {
      ok: true,
      uploadedPhotoUri:
        remotePhotoUri !== entry.photoUri ? remotePhotoUri : undefined,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Care entry sync failed';
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
      console.warn(
        '[Supabase] Failed batch upsert notebook_entries:',
        error.message
      );
      return { ok: false, entries: uploadedEntries, error: error.message };
    }

    return { ok: true, entries: uploadedEntries };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Batch entry sync failed';
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
      console.warn(
        '[Supabase] Failed to delete notebook entry:',
        error.message
      );
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
      console.warn(
        '[Supabase] Failed to upsert health_assessments:',
        error.message
      );
    }
  } catch (err) {
    console.warn('[Supabase] syncHealthAssessmentToSupabase error:', err);
  }
}

/**
 * Pulls the authenticated user's garden from Supabase.
 * Only seeds an empty cloud garden when `options.allowSeed` is true.
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
    const remoteEntries = (entriesResult.data as DbNotebookEntryRow[]).map(
      mapRowToEntry
    );

    if (
      remotePlants.length === 0 &&
      options?.allowSeed &&
      localPlants.length > 0
    ) {
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
