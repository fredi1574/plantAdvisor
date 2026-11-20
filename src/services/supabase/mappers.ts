import type {
  ExperienceLevel,
  HealthAssessment,
  NotebookEntry,
  SpeciesCatalog,
  UserPlant,
  UserProfile,
} from '@/types/plant';

/**
 * Multi-tenant ID scoping prevents seed/local ID collisions across users.
 */
export function toDbId(localId: string, userId: string): string {
  const prefix = `${userId}:`;
  return localId.startsWith(prefix) ? localId : `${prefix}${localId}`;
}

export function fromDbId(dbId: string, userId: string | null): string {
  if (userId && dbId.startsWith(`${userId}:`)) {
    return dbId.slice(userId.length + 1);
  }
  const colonIdx = dbId.indexOf(':');
  if (colonIdx === 36) {
    return dbId.slice(colonIdx + 1);
  }
  return dbId;
}

export interface DbProfileRow {
  id: string;
  email: string | null;
  display_name: string;
  experience_level: ExperienceLevel;
  bio: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbUserPlantRow {
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
  fertilize_interval_days?: number | null;
  rotate_interval_days?: number | null;
  latest_health_assessment: HealthAssessment | null;
}

export interface DbNotebookEntryRow {
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

export interface DbHealthAssessmentRow {
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

export function mapRowToProfile(row: DbProfileRow): UserProfile {
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

export function mapRowToPlant(row: DbUserPlantRow): UserPlant {
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
    fertilizeIntervalDays: row.fertilize_interval_days ?? undefined,
    rotateIntervalDays: row.rotate_interval_days ?? undefined,
    latestHealthAssessment: assessment,
  };
}

export function mapPlantToRow(plant: UserPlant, userId: string): DbUserPlantRow {
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
    fertilize_interval_days: plant.fertilizeIntervalDays ?? null,
    rotate_interval_days: plant.rotateIntervalDays ?? null,
    latest_health_assessment: plant.latestHealthAssessment ?? null,
  };
}

export function mapRowToEntry(row: DbNotebookEntryRow): NotebookEntry {
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

export function mapEntryToRow(
  entry: NotebookEntry,
  userId: string
): DbNotebookEntryRow {
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

export function mapRowToHealthAssessment(
  row: DbHealthAssessmentRow
): HealthAssessment {
  return {
    id: fromDbId(row.id, row.user_id),
    plantId: fromDbId(row.plant_id, row.user_id),
    createdAt: row.created_at,
    imageUri: row.image_uri ?? undefined,
    healthStatus: row.health_status,
    detectedSymptoms: Array.isArray(row.detected_symptoms)
      ? row.detected_symptoms
      : [],
    diagnosisSummary: row.diagnosis_summary,
    followUpQuestions: Array.isArray(row.follow_up_questions)
      ? row.follow_up_questions
      : [],
    recommendedActions: Array.isArray(row.recommended_actions)
      ? row.recommended_actions
      : [],
    adjustedWateringIntervalDays: row.adjusted_watering_interval_days,
    succulentGuardrailApplied: row.succulent_guardrail_applied ?? undefined,
  };
}
