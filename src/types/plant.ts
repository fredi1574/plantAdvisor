/**
 * FloraLog — Core Domain Models & AI Service Contracts
 * Structured for offline-first Zustand persistence today and 1:1 Supabase PostgreSQL sync in Phase 3.
 */

export type PlantType = 'succulent' | 'foliage' | 'propagation' | 'flowering';

export type HealthStatus = 'thriving' | 'needs_attention' | 'critical';

export type CareEventType =
  | 'water'
  | 'fertilize'
  | 'repot'
  | 'prune'
  | 'propagation'
  | 'note'
  | 'ai_scan';

export type PotMaterial =
  | 'terracotta'
  | 'ceramic_glazed'
  | 'plastic_nursery'
  | 'glass_vessel'
  | 'fabric_grow_bag';

export type LightExposure =
  | 'bright_direct'
  | 'bright_indirect'
  | 'medium_filtered'
  | 'low_shade'
  | 'grow_light';

export type ActionUrgency = 'immediate' | 'soon' | 'routine';

export interface SucculentGuardrails {
  isSucculentOrCactus: boolean;
  neverMistFoliage: boolean;
  soakAndDryRequired: boolean;
  minimumDryBackDays: number;
  rotWarningNote: string;
}

export interface BaselineCare {
  idealLight: string;
  baseWateringDays: number;
  soilRecommendation: string;
  succulentGuardrails: SucculentGuardrails;
}

/**
 * Taxonomic & baseline botanical care reference (`species_catalog` table in Phase 3)
 */
export interface SpeciesCatalog {
  id: string;
  commonName: string;
  scientificName: string;
  family: string;
  plantType: PlantType;
  baselineCare: BaselineCare;
}

/**
 * Checkable action item inside an AI Health Assessment
 */
export interface RecommendedAction {
  id: string;
  instruction: string;
  urgency: ActionUrgency;
  rationale?: string;
  completed: boolean;
}

/**
 * Output of `diagnosePlantHealth` (`health_assessments` table in Phase 3)
 */
export interface HealthAssessment {
  id: string;
  plantId: string;
  createdAt: string; // ISO-8601
  imageUri?: string;
  healthStatus: HealthStatus;
  detectedSymptoms: string[];
  diagnosisSummary: string;
  followUpQuestions: string[];
  recommendedActions: RecommendedAction[];
  adjustedWateringIntervalDays: number;
  succulentGuardrailApplied?: string;
}

/**
 * Chronological care or propagation notebook entry (`notebook_entries` table in Phase 3)
 */
export interface NotebookEntry {
  id: string;
  plantId: string;
  eventType: CareEventType;
  timestamp: string; // ISO-8601
  title: string;
  notes: string;
  photoUri?: string;
  metrics?: {
    waterAmountMl?: number;
    rootLengthCm?: number;
    stemHeightCm?: number;
    leafCount?: number;
    soilMoisture?: 'bone_dry' | 'slightly_damp' | 'moist' | 'waterlogged';
  };
}

/**
 * User's individual plant specimen (`user_plants` table in Phase 3)
 */
export interface UserPlant {
  id: string;
  nickname: string;
  species: SpeciesCatalog;
  photoUri: string;
  acquiredAt: string; // ISO-8601
  location: string;
  isIndoor: boolean;
  lightExposure: LightExposure;
  hasDrainageHole: boolean;
  potMaterial: PotMaterial;
  lastWateredAt: string; // ISO-8601
  customWateringIntervalDays: number;
  latestHealthAssessment?: HealthAssessment;
}

/**
 * Structured AI Output for `identifyPlant(imageUriOrName)`
 */
export interface PlantIdentificationResult {
  commonName: string;
  scientificName: string;
  family: string;
  plantType: PlantType;
  confidence: number; // 0.0 - 1.0
  baselineCare: BaselineCare;
  identificationNotes: string;
}

/**
 * Structured AI Output for `diagnosePlantHealth(imageUri, plantProfile, recentLogs)`
 */
export interface PlantDiagnosisResult {
  healthStatus: HealthStatus;
  detectedSymptoms: string[];
  diagnosisSummary: string;
  followUpQuestions: string[];
  recommendedActions: {
    instruction: string;
    urgency: ActionUrgency;
    rationale?: string;
  }[];
  adjustedWateringIntervalDays: number;
  succulentGuardrailApplied?: string;
}

export type ExperienceLevel = 'beginner' | 'enthusiast' | 'master_gardener';

/**
 * User profile synchronized with `public.profiles` (`auth.users` 1:1)
 */
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  experienceLevel: ExperienceLevel;
  bio: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}


