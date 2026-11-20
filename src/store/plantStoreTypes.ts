import type { StateCreator } from 'zustand';

import type { ProjectedTaskKind } from '@/services/calendarUtils';
import type { Hemisphere } from '@/services/careIntelligenceService';
import {
  scheduleDailyGardenDigest,
  schedulePlantWateringReminder,
  type NotificationPreferences,
} from '@/services/notificationService';
import type { PendingSyncOp } from '@/store/syncQueue';
import type {
  CareEventType,
  HealthAssessment,
  LightExposure,
  NotebookEntry,
  PlantDiagnosisResult,
  PlantIdentificationResult,
  PlantType,
  PotMaterial,
  UserPlant,
} from '@/types/plant';

export interface AddPlantPayload {
  nickname: string;
  location: string;
  isIndoor: boolean;
  lightExposure: LightExposure;
  hasDrainageHole: boolean;
  potMaterial: PotMaterial;
  photoUri?: string;
  identification: PlantIdentificationResult;
}

export interface UpdatePlantPayload {
  nickname?: string;
  location?: string;
  isIndoor?: boolean;
  lightExposure?: LightExposure;
  hasDrainageHole?: boolean;
  potMaterial?: PotMaterial;
  customWateringIntervalDays?: number;
  fertilizeIntervalDays?: number;
  rotateIntervalDays?: number;
  photoUri?: string;
  commonName?: string;
  scientificName?: string;
  family?: string;
  plantType?: PlantType;
}

export interface LogCareEventPayload {
  plantId: string;
  eventType: CareEventType;
  title: string;
  notes: string;
  photoUri?: string;
  metrics?: NotebookEntry['metrics'];
}

export interface UpdateCareEntryPayload {
  eventType?: CareEventType;
  title?: string;
  notes?: string;
  metrics?: NotebookEntry['metrics'];
}

export interface AdaptiveCarePreferences {
  hemisphere: Hemisphere;
  latitude: string;
  longitude: string;
}

export const DEFAULT_ADAPTIVE_CARE_PREFS: AdaptiveCarePreferences = {
  hemisphere: 'northern',
  latitude: '40.71',
  longitude: '-74.01',
};

export const DEFAULT_FALLBACK_PHOTO =
  'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?auto=format&fit=crop&w=900&q=80';

export interface PreferencesSlice {
  notificationPrefs: NotificationPreferences;
  adaptiveCarePrefs: AdaptiveCarePreferences;
  setNotificationPrefs: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  setAdaptiveCarePrefs: (prefs: Partial<AdaptiveCarePreferences>) => void;
  rescheduleAllNotifications: () => Promise<void>;
}

export interface SyncSlice {
  ownerUserId: string | null;
  hasGuestEdits: boolean;
  pendingOps: PendingSyncOp[];
  pendingSyncCount: number;
  lastSyncedAt: string | null;
  syncError: string | null;
  isSyncing: boolean;
  syncWithSupabase: (explicitUserId?: string) => Promise<void>;
  flushPendingSync: () => Promise<void>;
  clearUserGarden: () => Promise<void>;
  resetToSeedData: () => void;
}

export interface PlantSlice {
  plants: UserPlant[];
  addPlant: (payload: AddPlantPayload) => UserPlant;
  updatePlant: (plantId: string, payload: UpdatePlantPayload) => void;
  deletePlant: (plantId: string) => void;
}

export interface CareLogSlice {
  entries: NotebookEntry[];
  logCareEvent: (payload: LogCareEventPayload) => NotebookEntry;
  updateCareEntry: (entryId: string, payload: UpdateCareEntryPayload) => void;
  deleteCareEntry: (entryId: string) => void;
  waterPlantNow: (plantId: string, notes?: string) => void;
  completeScheduledCareTask: (plantId: string, kind: ProjectedTaskKind) => void;
  waterAllNeedingWater: () => number;
  waterAllPlants: () => number;
}

export interface HealthAssessmentSlice {
  healthAssessments: HealthAssessment[];
  saveHealthAssessment: (
    plantId: string,
    diagnosis: PlantDiagnosisResult,
    imageUri?: string
  ) => HealthAssessment;
  toggleRecommendedAction: (plantId: string, actionId: string) => void;
}

export type PlantStoreState = PreferencesSlice &
  SyncSlice &
  PlantSlice &
  CareLogSlice &
  HealthAssessmentSlice;

export type PlantSliceCreator<T> = StateCreator<PlantStoreState, [], [], T>;

export async function reschedulePlantAndDigest(
  get: () => PlantStoreState,
  plant?: UserPlant
): Promise<void> {
  const prefs = get().notificationPrefs;
  if (plant) {
    await schedulePlantWateringReminder(plant, prefs);
  }
  await scheduleDailyGardenDigest(get().plants, prefs);
}
