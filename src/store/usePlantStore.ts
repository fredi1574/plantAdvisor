/**
 * FloraLog — Offline-First Plant & Notebook Store
 * Powered by Zustand + AsyncStorage, structured for clean Phase 3 Supabase sync.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { SEED_NOTEBOOK_ENTRIES, SEED_PLANTS } from '@/constants/seedData';
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

interface PlantStoreState {
  plants: UserPlant[];
  entries: NotebookEntry[];
  addPlant: (payload: AddPlantPayload) => UserPlant;
  updatePlant: (plantId: string, payload: UpdatePlantPayload) => void;
  deletePlant: (plantId: string) => void;
  logCareEvent: (payload: LogCareEventPayload) => NotebookEntry;
  updateCareEntry: (entryId: string, payload: UpdateCareEntryPayload) => void;
  deleteCareEntry: (entryId: string) => void;
  waterPlantNow: (plantId: string, notes?: string) => void;
  waterAllNeedingWater: () => number;
  waterAllPlants: () => number;
  saveHealthAssessment: (
    plantId: string,
    diagnosis: PlantDiagnosisResult,
    imageUri?: string
  ) => HealthAssessment;
  toggleRecommendedAction: (plantId: string, actionId: string) => void;
  resetToSeedData: () => void;
}

const DEFAULT_FALLBACK_PHOTO =
  'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?auto=format&fit=crop&w=900&q=80';

export function getDaysUntilNextWater(plant: UserPlant): number {
  const lastWateredMs = new Date(plant.lastWateredAt).getTime();
  const nextDueMs =
    lastWateredMs + plant.customWateringIntervalDays * 24 * 60 * 60 * 1000;
  const diffDays = Math.ceil((nextDueMs - Date.now()) / (24 * 60 * 60 * 1000));
  return diffDays;
}

export function doesPlantNeedWatering(plant: UserPlant): boolean {
  return getDaysUntilNextWater(plant) <= 0;
}

export const usePlantStore = create<PlantStoreState>()(
  persist(
    (set, get) => ({
      plants: SEED_PLANTS,
      entries: SEED_NOTEBOOK_ENTRIES,

      addPlant: (payload) => {
        const nowIso = new Date().toISOString();
        const newPlantId = `plant-${Date.now()}`;
        const { identification } = payload;

        const newPlant: UserPlant = {
          id: newPlantId,
          nickname: payload.nickname.trim() || identification.commonName,
          photoUri: payload.photoUri || DEFAULT_FALLBACK_PHOTO,
          acquiredAt: nowIso,
          location: payload.location.trim() || 'Sunny Windowsill',
          isIndoor: payload.isIndoor,
          lightExposure: payload.lightExposure,
          hasDrainageHole: payload.hasDrainageHole,
          potMaterial: payload.potMaterial,
          lastWateredAt: nowIso,
          customWateringIntervalDays: identification.baselineCare.baseWateringDays,
          species: {
            id: `sp-${Date.now()}`,
            commonName: identification.commonName,
            scientificName: identification.scientificName,
            family: identification.family,
            plantType: identification.plantType,
            baselineCare: identification.baselineCare,
          },
          latestHealthAssessment: {
            id: `ha-init-${Date.now()}`,
            plantId: newPlantId,
            createdAt: nowIso,
            healthStatus:
              identification.plantType === 'succulent' && !payload.hasDrainageHole
                ? 'needs_attention'
                : 'thriving',
            detectedSymptoms: [identification.identificationNotes],
            diagnosisSummary: `Added via FloraLog AI Identification (${Math.round(
              identification.confidence * 100
            )}% match). Baseline watering schedule set to every ${
              identification.baselineCare.baseWateringDays
            } days.`,
            followUpQuestions: [],
            recommendedActions: [
              {
                id: `act-init-1-${Date.now()}`,
                instruction: `Place in ${identification.baselineCare.idealLight.toLowerCase()}.`,
                urgency: 'soon',
                rationale: 'Matches species baseline photoperiod requirements.',
                completed: false,
              },
              {
                id: `act-init-2-${Date.now()}`,
                instruction: identification.baselineCare.succulentGuardrails.isSucculentOrCactus
                  ? 'Follow strict Soak-and-Dry cycles; never mist leaves.'
                  : `Use recommended substrate: ${identification.baselineCare.soilRecommendation}`,
                urgency: 'routine',
                completed: false,
              },
            ],
            adjustedWateringIntervalDays: identification.baselineCare.baseWateringDays,
            succulentGuardrailApplied: identification.baselineCare.succulentGuardrails
              .isSucculentOrCactus
              ? identification.baselineCare.succulentGuardrails.rotWarningNote
              : undefined,
          },
        };

        const initialEntry: NotebookEntry = {
          id: `log-init-${Date.now()}`,
          plantId: newPlantId,
          eventType: 'ai_scan',
          timestamp: nowIso,
          title: `Identified as ${identification.commonName} (${identification.scientificName})`,
          notes: `${identification.identificationNotes} Recommended soil: ${identification.baselineCare.soilRecommendation}`,
          photoUri: payload.photoUri,
        };

        set((state) => ({
          plants: [newPlant, ...state.plants],
          entries: [initialEntry, ...state.entries],
        }));

        return newPlant;
      },

      updatePlant: (plantId, payload) => {
        set((state) => ({
          plants: state.plants.map((plant) => {
            if (plant.id !== plantId) return plant;

            const nextInterval =
              payload.customWateringIntervalDays !== undefined &&
              !Number.isNaN(payload.customWateringIntervalDays) &&
              payload.customWateringIntervalDays >= 1
                ? Math.round(payload.customWateringIntervalDays)
                : plant.customWateringIntervalDays;

            return {
              ...plant,
              nickname:
                payload.nickname !== undefined
                  ? payload.nickname.trim() || plant.nickname
                  : plant.nickname,
              location:
                payload.location !== undefined
                  ? payload.location.trim() || plant.location
                  : plant.location,
              isIndoor: payload.isIndoor ?? plant.isIndoor,
              lightExposure: payload.lightExposure ?? plant.lightExposure,
              hasDrainageHole: payload.hasDrainageHole ?? plant.hasDrainageHole,
              potMaterial: payload.potMaterial ?? plant.potMaterial,
              customWateringIntervalDays: nextInterval,
              photoUri: payload.photoUri || plant.photoUri,
              species: {
                ...plant.species,
                commonName:
                  payload.commonName !== undefined
                    ? payload.commonName.trim() || plant.species.commonName
                    : plant.species.commonName,
                scientificName:
                  payload.scientificName !== undefined
                    ? payload.scientificName.trim() || plant.species.scientificName
                    : plant.species.scientificName,
                family:
                  payload.family !== undefined
                    ? payload.family.trim() || plant.species.family
                    : plant.species.family,
                plantType: payload.plantType ?? plant.species.plantType,
              },
            };
          }),
        }));
      },

      deletePlant: (plantId) => {
        set((state) => ({
          plants: state.plants.filter((p) => p.id !== plantId),
          entries: state.entries.filter((e) => e.plantId !== plantId),
        }));
      },

      logCareEvent: (payload) => {
        const nowIso = new Date().toISOString();
        const newEntry: NotebookEntry = {
          id: `log-${Date.now()}`,
          plantId: payload.plantId,
          eventType: payload.eventType,
          timestamp: nowIso,
          title: payload.title,
          notes: payload.notes,
          photoUri: payload.photoUri,
          metrics: payload.metrics,
        };

        set((state) => ({
          entries: [newEntry, ...state.entries],
          plants:
            payload.eventType === 'water'
              ? state.plants.map((p) =>
                  p.id === payload.plantId ? { ...p, lastWateredAt: nowIso } : p
                )
              : state.plants,
        }));

        return newEntry;
      },

      updateCareEntry: (entryId, payload) => {
        set((state) => ({
          entries: state.entries.map((entry) => {
            if (entry.id !== entryId) return entry;
            return {
              ...entry,
              eventType: payload.eventType ?? entry.eventType,
              title:
                payload.title !== undefined
                  ? payload.title.trim() || entry.title
                  : entry.title,
              notes:
                payload.notes !== undefined
                  ? payload.notes.trim() || entry.notes
                  : entry.notes,
              metrics:
                payload.metrics !== undefined ? payload.metrics : entry.metrics,
            };
          }),
        }));
      },

      deleteCareEntry: (entryId) => {
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== entryId),
        }));
      },

      waterPlantNow: (plantId, notes) => {
        const target = get().plants.find((p) => p.id === plantId);
        if (!target) return;

        const isPropagation = target.species.plantType === 'propagation';
        const isSucculent = target.species.plantType === 'succulent';

        get().logCareEvent({
          plantId,
          eventType: 'water',
          title: isPropagation
            ? 'Refreshed Propagation Water'
            : isSucculent
              ? 'Deep Soak & Dry Watering'
              : 'Thorough Watering',
          notes:
            notes ||
            (isPropagation
              ? 'Replaced reservoir water with fresh oxygenated room-temperature water.'
              : isSucculent
                ? 'Verified 100% dry gritty mix before deep drenching until runoff.'
                : 'Watered thoroughly until excess drained freely from bottom hole.'),
          metrics: {
            soilMoisture: isSucculent ? 'bone_dry' : 'slightly_damp',
          },
        });
      },

      waterAllNeedingWater: () => {
        const state = get();
        const needing = state.plants.filter(doesPlantNeedWatering);
        if (needing.length === 0) return 0;

        const now = new Date();
        const nowIso = now.toISOString();
        const nowMs = now.getTime();
        const needingIds = new Set(needing.map((p) => p.id));

        const batchEntries: NotebookEntry[] = needing.map((plant, idx) => {
          const isPropagation = plant.species.plantType === 'propagation';
          const isSucculent = plant.species.plantType === 'succulent';

          return {
            id: `log-water-batch-${nowMs}-${idx}`,
            plantId: plant.id,
            eventType: 'water',
            timestamp: nowIso,
            title: isPropagation
              ? 'Refreshed Propagation Water'
              : isSucculent
                ? 'Deep Soak & Dry Watering'
                : 'Thorough Watering',
            notes: isPropagation
              ? 'Batch care: Replaced reservoir water with fresh oxygenated room-temperature water.'
              : isSucculent
                ? 'Batch care: Verified 100% dry gritty mix before deep drenching until runoff.'
                : 'Batch care: Watered thoroughly until excess drained freely from bottom hole.',
            metrics: {
              soilMoisture: isSucculent ? 'bone_dry' : 'slightly_damp',
            },
          };
        });

        set((s) => ({
          plants: s.plants.map((p) =>
            needingIds.has(p.id) ? { ...p, lastWateredAt: nowIso } : p
          ),
          entries: [...batchEntries, ...s.entries],
        }));

        return needing.length;
      },

      waterAllPlants: () => {
        const state = get();
        if (state.plants.length === 0) return 0;

        const now = new Date();
        const nowIso = now.toISOString();
        const nowMs = now.getTime();

        const batchEntries: NotebookEntry[] = state.plants.map((plant, idx) => {
          const isPropagation = plant.species.plantType === 'propagation';
          const isSucculent = plant.species.plantType === 'succulent';

          return {
            id: `log-water-all-${nowMs}-${idx}`,
            plantId: plant.id,
            eventType: 'water',
            timestamp: nowIso,
            title: isPropagation
              ? 'Refreshed Propagation Water'
              : isSucculent
                ? 'Deep Soak & Dry Watering'
                : 'Thorough Watering',
            notes: isPropagation
              ? 'Full garden care: Replaced reservoir water with fresh oxygenated room-temperature water.'
              : isSucculent
                ? 'Full garden care: Verified 100% dry gritty mix before deep drenching until runoff.'
                : 'Full garden care: Watered thoroughly until excess drained freely from bottom hole.',
            metrics: {
              soilMoisture: isSucculent ? 'bone_dry' : 'slightly_damp',
            },
          };
        });

        set((s) => ({
          plants: s.plants.map((p) => ({ ...p, lastWateredAt: nowIso })),
          entries: [...batchEntries, ...s.entries],
        }));

        return state.plants.length;
      },

      saveHealthAssessment: (plantId, diagnosis, imageUri) => {
        const nowIso = new Date().toISOString();
        const assessment: HealthAssessment = {
          id: `ha-${Date.now()}`,
          plantId,
          createdAt: nowIso,
          imageUri,
          healthStatus: diagnosis.healthStatus,
          detectedSymptoms: diagnosis.detectedSymptoms,
          diagnosisSummary: diagnosis.diagnosisSummary,
          followUpQuestions: diagnosis.followUpQuestions,
          recommendedActions: diagnosis.recommendedActions.map((act, idx) => ({
            id: `act-${Date.now()}-${idx}`,
            instruction: act.instruction,
            urgency: act.urgency,
            rationale: act.rationale,
            completed: false,
          })),
          adjustedWateringIntervalDays: diagnosis.adjustedWateringIntervalDays,
          succulentGuardrailApplied: diagnosis.succulentGuardrailApplied,
        };

        const scanLog: NotebookEntry = {
          id: `log-scan-${Date.now()}`,
          plantId,
          eventType: 'ai_scan',
          timestamp: nowIso,
          title: `AI Health Scan — ${
            diagnosis.healthStatus === 'thriving'
              ? 'Thriving'
              : diagnosis.healthStatus === 'needs_attention'
                ? 'Needs Attention'
                : 'Critical'
          }`,
          notes: diagnosis.diagnosisSummary,
          photoUri: imageUri,
        };

        set((state) => ({
          plants: state.plants.map((plant) =>
            plant.id === plantId
              ? {
                  ...plant,
                  photoUri: imageUri || plant.photoUri,
                  customWateringIntervalDays: diagnosis.adjustedWateringIntervalDays,
                  latestHealthAssessment: assessment,
                }
              : plant
          ),
          entries: [scanLog, ...state.entries],
        }));

        return assessment;
      },

      toggleRecommendedAction: (plantId, actionId) => {
        set((state) => ({
          plants: state.plants.map((plant) => {
            if (plant.id !== plantId || !plant.latestHealthAssessment) {
              return plant;
            }
            return {
              ...plant,
              latestHealthAssessment: {
                ...plant.latestHealthAssessment,
                recommendedActions: plant.latestHealthAssessment.recommendedActions.map((act) =>
                  act.id === actionId ? { ...act, completed: !act.completed } : act
                ),
              },
            };
          }),
        }));
      },

      resetToSeedData: () => {
        set({
          plants: SEED_PLANTS,
          entries: SEED_NOTEBOOK_ENTRIES,
        });
      },
    }),
    {
      name: 'floralog-garden-storage-v1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
