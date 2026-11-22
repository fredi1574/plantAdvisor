export {
  getCurrentUserId,
  isSupabaseConfigured,
  supabase,
} from '@/services/supabase/client';
export {
  deleteCareEntryFromSupabase,
  deletePlantFromSupabase,
  pullOrSeedGardenWithSupabase,
  syncCareEntriesBatchToSupabase,
  syncCareEntryToSupabase,
  syncHealthAssessmentToSupabase,
  syncPlantsBatchToSupabase,
  syncPlantToSupabase,
  type SyncOperationResult,
} from '@/services/supabase/gardenSync';
export {
  fromDbId,
  mapEntryToRow,
  mapPlantToRow,
  mapRowToEntry,
  mapRowToHealthAssessment,
  mapRowToPlant,
  mapRowToProfile,
  toDbId,
  type DbHealthAssessmentRow,
  type DbNotebookEntryRow,
  type DbProfileRow,
  type DbUserPlantRow,
} from '@/services/supabase/mappers';
export {
  deleteAccountInSupabase,
  fetchOrCreateUserProfile,
  updateUserProfileInSupabase,
} from '@/services/supabase/profiles';
export { uploadPlantPhotoIfNeeded } from '@/services/supabase/storage';
