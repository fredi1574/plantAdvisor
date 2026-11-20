/**
 * FloraLog — Offline-First Plant & Notebook Store
 * Powered by Zustand + AsyncStorage with background Supabase sync queue.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { SEED_NOTEBOOK_ENTRIES, SEED_PLANTS } from '@/constants/seedData';
import type { ProjectedTaskKind } from '@/services/calendarUtils';
import type { Hemisphere } from '@/services/careIntelligenceService';
import { triggerSuccessHaptic } from '@/services/haptics';
import {
  cancelAllGardenNotifications,
  cancelPlantReminder,
  DEFAULT_NOTIFICATION_PREFERENCES,
  scheduleDailyGardenDigest,
  schedulePlantWateringReminder,
  syncAllPlantNotifications,
  type NotificationPreferences,
} from '@/services/notificationService';
import {
  getCurrentUserId,
  isSupabaseConfigured,
  pullOrSeedGardenWithSupabase,
  syncCareEntriesBatchToSupabase,
  syncPlantsBatchToSupabase,
} from '@/services/supabase';
import {
  enqueueBatchSyncFallbacks,
  executePendingSyncOps,
  mergePendingOps,
  removePendingOp,
  type PendingSyncOp,
} from '@/store/syncQueue';
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
import { createEntityId } from '@/utils/ids';
import {
  buildDefaultWateringCopy,
  doesPlantNeedWatering,
  getDaysUntilNextWater,
} from '@/utils/watering';

export { doesPlantNeedWatering, getDaysUntilNextWater, type PendingSyncOp };

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

const DEFAULT_ADAPTIVE_CARE_PREFS: AdaptiveCarePreferences = {
  hemisphere: 'northern',
  latitude: '40.71',
  longitude: '-74.01',
};

const DEFAULT_FALLBACK_PHOTO =
  'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?auto=format&fit=crop&w=900&q=80';

interface PlantStoreState {
  ownerUserId: string | null;
  hasGuestEdits: boolean;
  plants: UserPlant[];
  entries: NotebookEntry[];
  healthAssessments: HealthAssessment[];
  pendingOps: PendingSyncOp[];
  pendingSyncCount: number;
  lastSyncedAt: string | null;
  syncError: string | null;
  isSyncing: boolean;
  notificationPrefs: NotificationPreferences;
  adaptiveCarePrefs: AdaptiveCarePreferences;
  setNotificationPrefs: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  setAdaptiveCarePrefs: (prefs: Partial<AdaptiveCarePreferences>) => void;
  rescheduleAllNotifications: () => Promise<void>;
  syncWithSupabase: (explicitUserId?: string) => Promise<void>;
  flushPendingSync: () => Promise<void>;
  clearUserGarden: () => Promise<void>;
  addPlant: (payload: AddPlantPayload) => UserPlant;
  updatePlant: (plantId: string, payload: UpdatePlantPayload) => void;
  deletePlant: (plantId: string) => void;
  logCareEvent: (payload: LogCareEventPayload) => NotebookEntry;
  updateCareEntry: (entryId: string, payload: UpdateCareEntryPayload) => void;
  deleteCareEntry: (entryId: string) => void;
  waterPlantNow: (plantId: string, notes?: string) => void;
  completeScheduledCareTask: (plantId: string, kind: ProjectedTaskKind) => void;
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

export const usePlantStore = create<PlantStoreState>()(
  persist(
    (set, get) => {
      const reschedulePlantAndDigest = async (plant?: UserPlant) => {
        const prefs = get().notificationPrefs;
        if (plant) {
          await schedulePlantWateringReminder(plant, prefs);
        }
        await scheduleDailyGardenDigest(get().plants, prefs);
      };

      const waterPlantBatch = (
        targets: UserPlant[],
        idPrefix: string,
        notePrefix: string
      ): number => {
        if (targets.length === 0) return 0;

        const nowIso = new Date().toISOString();
        const targetIds = new Set(targets.map((p) => p.id));

        const batchEntries: NotebookEntry[] = targets.map((plant) => {
          const copy = buildDefaultWateringCopy(plant, notePrefix);
          return {
            id: createEntityId(idPrefix),
            plantId: plant.id,
            eventType: 'water',
            timestamp: nowIso,
            title: copy.title,
            notes: copy.notes,
            metrics: { soilMoisture: copy.soilMoisture },
          };
        });

        const updatedTargets = targets.map((p) => ({
          ...p,
          lastWateredAt: nowIso,
        }));

        set((s) => ({
          plants: s.plants.map((p) =>
            targetIds.has(p.id) ? { ...p, lastWateredAt: nowIso } : p
          ),
          entries: [...batchEntries, ...s.entries],
          hasGuestEdits: s.ownerUserId === null ? true : s.hasGuestEdits,
        }));

        triggerSuccessHaptic();

        void (async () => {
          await syncAllPlantNotifications(get().plants, get().notificationPrefs);
          const pRes = await syncPlantsBatchToSupabase(updatedTargets);
          const eRes = await syncCareEntriesBatchToSupabase(batchEntries);
          if (pRes.ok && eRes.ok) {
            set({ lastSyncedAt: new Date().toISOString(), syncError: null });
          } else if (isSupabaseConfigured && (await getCurrentUserId())) {
            set((s) => {
              const nextOps = enqueueBatchSyncFallbacks(
                s.pendingOps,
                pRes.ok ? [] : updatedTargets,
                eRes.ok ? [] : batchEntries
              );
              return {
                pendingOps: nextOps,
                pendingSyncCount: nextOps.length,
                syncError: pRes.error || eRes.error || 'Sync failed',
              };
            });
          }
        })();

        return targets.length;
      };

      return {
        ownerUserId: null,
        hasGuestEdits: false,
        plants: SEED_PLANTS,
        entries: SEED_NOTEBOOK_ENTRIES,
        healthAssessments: [],
        pendingOps: [],
        pendingSyncCount: 0,
        lastSyncedAt: null,
        syncError: null,
        isSyncing: false,
        notificationPrefs: DEFAULT_NOTIFICATION_PREFERENCES,
        adaptiveCarePrefs: DEFAULT_ADAPTIVE_CARE_PREFS,

        setNotificationPrefs: async (prefs) => {
          const nextPrefs: NotificationPreferences = {
            ...get().notificationPrefs,
            ...prefs,
          };
          set({ notificationPrefs: nextPrefs });
          await syncAllPlantNotifications(get().plants, nextPrefs);
        },

        setAdaptiveCarePrefs: (prefs) => {
          set((state) => ({
            adaptiveCarePrefs: { ...state.adaptiveCarePrefs, ...prefs },
          }));
        },

        rescheduleAllNotifications: async () => {
          await syncAllPlantNotifications(get().plants, get().notificationPrefs);
        },

        clearUserGarden: async () => {
          await cancelAllGardenNotifications();
          set({
            ownerUserId: null,
            hasGuestEdits: false,
            plants: [],
            entries: [],
            healthAssessments: [],
            pendingOps: [],
            pendingSyncCount: 0,
            lastSyncedAt: null,
            syncError: null,
            isSyncing: false,
          });
        },

        flushPendingSync: async () => {
          if (get().isSyncing || !isSupabaseConfigured) return;
          const userId = await getCurrentUserId();
          if (!userId) return;

          if (get().ownerUserId && get().ownerUserId !== userId) {
            await get().syncWithSupabase(userId);
            return;
          }

          const ops = [...get().pendingOps];
          if (ops.length === 0) return;

          set({ isSyncing: true });
          try {
            const { syncedAny, lastError } = await executePendingSyncOps(ops, {
              getPlant: (id) => get().plants.find((p) => p.id === id),
              getEntry: (id) => get().entries.find((e) => e.id === id),
              onOpResolved: (op, uploadedPhoto) => {
                set((s) => {
                  const nextOps = removePendingOp(s.pendingOps, op);
                  return {
                    pendingOps: nextOps,
                    pendingSyncCount: nextOps.length,
                    plants:
                      uploadedPhoto?.entity === 'plant'
                        ? s.plants.map((p) =>
                            p.id === uploadedPhoto.id
                              ? { ...p, photoUri: uploadedPhoto.uri }
                              : p
                          )
                        : s.plants,
                    entries:
                      uploadedPhoto?.entity === 'entry'
                        ? s.entries.map((e) =>
                            e.id === uploadedPhoto.id
                              ? { ...e, photoUri: uploadedPhoto.uri }
                              : e
                          )
                        : s.entries,
                  };
                });
              },
            });

            if (get().pendingOps.length === 0 && syncedAny) {
              set({ lastSyncedAt: new Date().toISOString(), syncError: null });
            } else if (lastError) {
              set({ syncError: lastError });
            }
          } finally {
            set({ isSyncing: false });
          }
        },

        syncWithSupabase: async (explicitUserId) => {
          if (get().isSyncing || !isSupabaseConfigured) return;
          const userId = explicitUserId ?? (await getCurrentUserId());
          if (!userId) return;

          const prevOwner = get().ownerUserId;
          if (prevOwner !== null && prevOwner !== userId) {
            await cancelAllGardenNotifications();
            set({
              ownerUserId: userId,
              hasGuestEdits: false,
              plants: [],
              entries: [],
              healthAssessments: [],
              pendingOps: [],
              pendingSyncCount: 0,
              lastSyncedAt: null,
              syncError: null,
            });
          } else if (prevOwner === userId && get().pendingOps.length > 0) {
            await get().flushPendingSync();
          }

          set({ isSyncing: true });
          try {
            const canSeedFromGuest =
              get().ownerUserId === null && get().hasGuestEdits;
            const remote = await pullOrSeedGardenWithSupabase(
              canSeedFromGuest ? get().plants : [],
              canSeedFromGuest ? get().entries : [],
              {
                allowSeed: canSeedFromGuest,
                localAssessments: canSeedFromGuest
                  ? get().healthAssessments
                  : [],
              }
            );
            if (remote) {
              set({
                ownerUserId: userId,
                hasGuestEdits: false,
                plants: remote.plants,
                entries: remote.entries,
                healthAssessments: remote.healthAssessments,
                lastSyncedAt: new Date().toISOString(),
                syncError: null,
              });
              await syncAllPlantNotifications(
                remote.plants,
                get().notificationPrefs
              );
            } else {
              set({
                ownerUserId: userId,
                syncError: 'Offline — changes saved locally',
              });
            }
          } finally {
            set({ isSyncing: false });
          }
        },

        addPlant: (payload) => {
          const nowIso = new Date().toISOString();
          const newPlantId = createEntityId('plant');
          const { identification } = payload;

          const initialAssessment: HealthAssessment = {
            id: createEntityId('ha-init'),
            plantId: newPlantId,
            createdAt: nowIso,
            healthStatus:
              identification.plantType === 'succulent' &&
              !payload.hasDrainageHole
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
                id: createEntityId('act-init'),
                instruction: `Place in ${identification.baselineCare.idealLight.toLowerCase()}.`,
                urgency: 'soon',
                rationale: 'Matches species baseline photoperiod requirements.',
                completed: false,
              },
              {
                id: createEntityId('act-init'),
                instruction: identification.baselineCare.succulentGuardrails
                  .isSucculentOrCactus
                  ? 'Follow strict Soak-and-Dry cycles; never mist leaves.'
                  : `Use recommended substrate: ${identification.baselineCare.soilRecommendation}`,
                urgency: 'routine',
                completed: false,
              },
            ],
            adjustedWateringIntervalDays:
              identification.baselineCare.baseWateringDays,
            succulentGuardrailApplied: identification.baselineCare
              .succulentGuardrails.isSucculentOrCactus
              ? identification.baselineCare.succulentGuardrails.rotWarningNote
              : undefined,
          };

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
            customWateringIntervalDays:
              identification.baselineCare.baseWateringDays,
            species: {
              id: createEntityId('sp'),
              commonName: identification.commonName,
              scientificName: identification.scientificName,
              family: identification.family,
              plantType: identification.plantType,
              baselineCare: identification.baselineCare,
              petSafety: identification.petSafety,
            },
            latestHealthAssessment: initialAssessment,
          };

          const initialEntry: NotebookEntry = {
            id: createEntityId('log-init'),
            plantId: newPlantId,
            eventType: 'ai_scan',
            timestamp: nowIso,
            title: `Identified as ${identification.commonName} (${identification.scientificName})`,
            notes: `${identification.identificationNotes} Recommended soil: ${identification.baselineCare.soilRecommendation}`,
            photoUri: payload.photoUri,
          };

          set((state) => {
            let nextOps = mergePendingOps(state.pendingOps, {
              kind: 'upsert_plant',
              id: newPlant.id,
            });
            nextOps = mergePendingOps(nextOps, {
              kind: 'upsert_entry',
              id: initialEntry.id,
            });
            return {
              plants: [newPlant, ...state.plants],
              entries: [initialEntry, ...state.entries],
              healthAssessments: [initialAssessment, ...state.healthAssessments],
              hasGuestEdits:
                state.ownerUserId === null ? true : state.hasGuestEdits,
              pendingOps: nextOps,
              pendingSyncCount: nextOps.length,
            };
          });

          void (async () => {
            await reschedulePlantAndDigest(newPlant);
            await get().flushPendingSync();
          })();

          return newPlant;
        },

        updatePlant: (plantId, payload) => {
          let updatedPlantRef: UserPlant | null = null;
          const previousPhotoUri = get().plants.find(
            (p) => p.id === plantId
          )?.photoUri;

          set((state) => {
            const nextPlants = state.plants.map((plant) => {
              if (plant.id !== plantId) return plant;

              const nextInterval =
                payload.customWateringIntervalDays !== undefined &&
                !Number.isNaN(payload.customWateringIntervalDays) &&
                payload.customWateringIntervalDays >= 1
                  ? Math.round(payload.customWateringIntervalDays)
                  : plant.customWateringIntervalDays;

              const updated: UserPlant = {
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
                hasDrainageHole:
                  payload.hasDrainageHole ?? plant.hasDrainageHole,
                potMaterial: payload.potMaterial ?? plant.potMaterial,
                customWateringIntervalDays: nextInterval,
                fertilizeIntervalDays:
                  'fertilizeIntervalDays' in payload
                    ? payload.fertilizeIntervalDays
                    : plant.fertilizeIntervalDays,
                rotateIntervalDays:
                  'rotateIntervalDays' in payload
                    ? payload.rotateIntervalDays
                    : plant.rotateIntervalDays,
                photoUri: payload.photoUri || plant.photoUri,
                species: {
                  ...plant.species,
                  commonName:
                    payload.commonName !== undefined
                      ? payload.commonName.trim() || plant.species.commonName
                      : plant.species.commonName,
                  scientificName:
                    payload.scientificName !== undefined
                      ? payload.scientificName.trim() ||
                        plant.species.scientificName
                      : plant.species.scientificName,
                  family:
                    payload.family !== undefined
                      ? payload.family.trim() || plant.species.family
                      : plant.species.family,
                  plantType: payload.plantType ?? plant.species.plantType,
                },
              };

              updatedPlantRef = updated;
              return updated;
            });

            const nextOps = updatedPlantRef
              ? mergePendingOps(state.pendingOps, {
                  kind: 'upsert_plant',
                  id: plantId,
                  previousPhotoUri:
                    payload.photoUri && payload.photoUri !== previousPhotoUri
                      ? previousPhotoUri
                      : undefined,
                })
              : state.pendingOps;

            return {
              plants: nextPlants,
              hasGuestEdits:
                state.ownerUserId === null ? true : state.hasGuestEdits,
              pendingOps: nextOps,
              pendingSyncCount: nextOps.length,
            };
          });

          if (updatedPlantRef) {
            const targetPlant = updatedPlantRef as UserPlant;
            void (async () => {
              await reschedulePlantAndDigest(targetPlant);
              await get().flushPendingSync();
            })();
          }
        },

        deletePlant: (plantId) => {
          set((state) => {
            const nextOps = mergePendingOps(state.pendingOps, {
              kind: 'delete_plant',
              id: plantId,
            });
            return {
              plants: state.plants.filter((p) => p.id !== plantId),
              entries: state.entries.filter((e) => e.plantId !== plantId),
              healthAssessments: state.healthAssessments.filter(
                (a) => a.plantId !== plantId
              ),
              hasGuestEdits:
                state.ownerUserId === null ? true : state.hasGuestEdits,
              pendingOps: nextOps,
              pendingSyncCount: nextOps.length,
            };
          });

          void (async () => {
            await cancelPlantReminder(plantId);
            await reschedulePlantAndDigest();
            await get().flushPendingSync();
          })();
        },

        logCareEvent: (payload) => {
          const nowIso = new Date().toISOString();
          const newEntry: NotebookEntry = {
            id: createEntityId('log'),
            plantId: payload.plantId,
            eventType: payload.eventType,
            timestamp: nowIso,
            title: payload.title,
            notes: payload.notes,
            photoUri: payload.photoUri,
            metrics: payload.metrics,
          };

          let updatedPlantRef: UserPlant | null = null;

          set((state) => {
            let nextOps = mergePendingOps(state.pendingOps, {
              kind: 'upsert_entry',
              id: newEntry.id,
            });
            const nextPlants =
              payload.eventType === 'water'
                ? state.plants.map((p) => {
                    if (p.id !== payload.plantId) return p;
                    const updated = { ...p, lastWateredAt: nowIso };
                    updatedPlantRef = updated;
                    return updated;
                  })
                : state.plants;

            if (updatedPlantRef) {
              nextOps = mergePendingOps(nextOps, {
                kind: 'upsert_plant',
                id: payload.plantId,
              });
            }

            return {
              entries: [newEntry, ...state.entries],
              plants: nextPlants,
              hasGuestEdits:
                state.ownerUserId === null ? true : state.hasGuestEdits,
              pendingOps: nextOps,
              pendingSyncCount: nextOps.length,
            };
          });

          void (async () => {
            if (updatedPlantRef) {
              await reschedulePlantAndDigest(updatedPlantRef as UserPlant);
            }
            await get().flushPendingSync();
          })();

          return newEntry;
        },

        updateCareEntry: (entryId, payload) => {
          let updatedEntryRef: NotebookEntry | null = null;

          set((state) => {
            const nextEntries = state.entries.map((entry) => {
              if (entry.id !== entryId) return entry;
              const updated: NotebookEntry = {
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
                  payload.metrics !== undefined
                    ? payload.metrics
                    : entry.metrics,
              };
              updatedEntryRef = updated;
              return updated;
            });
            const nextOps = updatedEntryRef
              ? mergePendingOps(state.pendingOps, {
                  kind: 'upsert_entry',
                  id: entryId,
                })
              : state.pendingOps;
            return {
              entries: nextEntries,
              hasGuestEdits:
                state.ownerUserId === null ? true : state.hasGuestEdits,
              pendingOps: nextOps,
              pendingSyncCount: nextOps.length,
            };
          });

          if (updatedEntryRef) {
            void get().flushPendingSync();
          }
        },

        deleteCareEntry: (entryId) => {
          set((state) => {
            const nextOps = mergePendingOps(state.pendingOps, {
              kind: 'delete_entry',
              id: entryId,
            });
            return {
              entries: state.entries.filter((e) => e.id !== entryId),
              hasGuestEdits:
                state.ownerUserId === null ? true : state.hasGuestEdits,
              pendingOps: nextOps,
              pendingSyncCount: nextOps.length,
            };
          });

          void get().flushPendingSync();
        },

        waterPlantNow: (plantId, notes) => {
          const target = get().plants.find((p) => p.id === plantId);
          if (!target) return;

          triggerSuccessHaptic();
          const copy = buildDefaultWateringCopy(target);

          get().logCareEvent({
            plantId,
            eventType: 'water',
            title: copy.title,
            notes: notes || copy.notes,
            metrics: { soilMoisture: copy.soilMoisture },
          });
        },

        completeScheduledCareTask: (plantId, kind) => {
          if (kind === 'water') {
            get().waterPlantNow(plantId);
            return;
          }

          triggerSuccessHaptic();
          if (kind === 'fertilize') {
            get().logCareEvent({
              plantId,
              eventType: 'fertilize',
              title: 'Diluted Nutrient Feed',
              notes: 'Applied balanced liquid fertilizer per care schedule.',
            });
            return;
          }

          get().logCareEvent({
            plantId,
            eventType: 'note',
            title: 'Rotated Pot 90°',
            notes: 'Rotated container for balanced light exposure.',
          });
        },

        waterAllNeedingWater: () => {
          const needing = get().plants.filter((p) => doesPlantNeedWatering(p));
          return waterPlantBatch(needing, 'log-water-batch', 'Batch care: ');
        },

        waterAllPlants: () => {
          return waterPlantBatch(
            get().plants,
            'log-water-all',
            'Full garden care: '
          );
        },

        saveHealthAssessment: (plantId, diagnosis, imageUri) => {
          const nowIso = new Date().toISOString();
          const assessment: HealthAssessment = {
            id: createEntityId('ha'),
            plantId,
            createdAt: nowIso,
            imageUri,
            healthStatus: diagnosis.healthStatus,
            detectedSymptoms: diagnosis.detectedSymptoms,
            diagnosisSummary: diagnosis.diagnosisSummary,
            followUpQuestions: diagnosis.followUpQuestions,
            recommendedActions: diagnosis.recommendedActions.map((act) => ({
              id: createEntityId('act'),
              instruction: act.instruction,
              urgency: act.urgency,
              rationale: act.rationale,
              completed: false,
            })),
            adjustedWateringIntervalDays: diagnosis.adjustedWateringIntervalDays,
            succulentGuardrailApplied: diagnosis.succulentGuardrailApplied,
          };

          const scanLog: NotebookEntry = {
            id: createEntityId('log-scan'),
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

          let updatedPlantRef: UserPlant | null = null;

          set((state) => {
            const nextPlants = state.plants.map((plant) => {
              if (plant.id !== plantId) return plant;
              const updated: UserPlant = {
                ...plant,
                photoUri: imageUri || plant.photoUri,
                customWateringIntervalDays:
                  diagnosis.adjustedWateringIntervalDays,
                latestHealthAssessment: assessment,
              };
              updatedPlantRef = updated;
              return updated;
            });
            let nextOps = mergePendingOps(state.pendingOps, {
              kind: 'upsert_plant',
              id: plantId,
            });
            nextOps = mergePendingOps(nextOps, {
              kind: 'upsert_entry',
              id: scanLog.id,
            });
            return {
              plants: nextPlants,
              entries: [scanLog, ...state.entries],
              healthAssessments: [assessment, ...state.healthAssessments],
              hasGuestEdits:
                state.ownerUserId === null ? true : state.hasGuestEdits,
              pendingOps: nextOps,
              pendingSyncCount: nextOps.length,
            };
          });

          void (async () => {
            if (updatedPlantRef) {
              await reschedulePlantAndDigest(updatedPlantRef as UserPlant);
            }
            await get().flushPendingSync();
          })();

          return assessment;
        },

        toggleRecommendedAction: (plantId, actionId) => {
          let updatedPlantRef: UserPlant | null = null;

          set((state) => {
            const nextPlants = state.plants.map((plant) => {
              if (plant.id !== plantId || !plant.latestHealthAssessment) {
                return plant;
              }
              const updated: UserPlant = {
                ...plant,
                latestHealthAssessment: {
                  ...plant.latestHealthAssessment,
                  recommendedActions:
                    plant.latestHealthAssessment.recommendedActions.map((act) =>
                      act.id === actionId
                        ? { ...act, completed: !act.completed }
                        : act
                    ),
                },
              };
              updatedPlantRef = updated;
              return updated;
            });
            const nextOps = updatedPlantRef
              ? mergePendingOps(state.pendingOps, {
                  kind: 'upsert_plant',
                  id: plantId,
                })
              : state.pendingOps;
            return {
              plants: nextPlants,
              hasGuestEdits:
                state.ownerUserId === null ? true : state.hasGuestEdits,
              pendingOps: nextOps,
              pendingSyncCount: nextOps.length,
            };
          });

          if (updatedPlantRef) {
            void get().flushPendingSync();
          }
        },

        resetToSeedData: () => {
          set({
            plants: SEED_PLANTS,
            entries: SEED_NOTEBOOK_ENTRIES,
            healthAssessments: [],
            hasGuestEdits: false,
            pendingOps: [],
            pendingSyncCount: 0,
            syncError: null,
          });

          void (async () => {
            await syncAllPlantNotifications(SEED_PLANTS, get().notificationPrefs);
            await syncPlantsBatchToSupabase(SEED_PLANTS);
            await syncCareEntriesBatchToSupabase(SEED_NOTEBOOK_ENTRIES);
          })();
        },
      };
    },
    {
      name: 'floralog-garden-storage-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        ownerUserId: state.ownerUserId,
        hasGuestEdits: state.hasGuestEdits,
        plants: state.plants,
        entries: state.entries,
        healthAssessments: state.healthAssessments,
        pendingOps: state.pendingOps,
        pendingSyncCount: state.pendingSyncCount,
        lastSyncedAt: state.lastSyncedAt,
        notificationPrefs: state.notificationPrefs,
        adaptiveCarePrefs: state.adaptiveCarePrefs,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          void state.rescheduleAllNotifications();
          void state.syncWithSupabase();
        }
      },
    }
  )
);
