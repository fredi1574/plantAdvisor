import {
  reschedulePlantAndDigest,
  type HealthAssessmentSlice,
  type PlantSliceCreator,
} from '@/store/plantStoreTypes';
import { mergePendingOps } from '@/store/syncQueue';
import type { HealthAssessment, NotebookEntry, UserPlant } from '@/types/plant';
import { createEntityId } from '@/utils/ids';

export const createHealthAssessmentSlice: PlantSliceCreator<
  HealthAssessmentSlice
> = (set, get) => ({
  healthAssessments: [],

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
          customWateringIntervalDays: diagnosis.adjustedWateringIntervalDays,
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
        hasGuestEdits: state.ownerUserId === null ? true : state.hasGuestEdits,
        pendingOps: nextOps,
        pendingSyncCount: nextOps.length,
      };
    });

    void (async () => {
      if (updatedPlantRef) {
        await reschedulePlantAndDigest(get, updatedPlantRef as UserPlant);
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
        hasGuestEdits: state.ownerUserId === null ? true : state.hasGuestEdits,
        pendingOps: nextOps,
        pendingSyncCount: nextOps.length,
      };
    });

    if (updatedPlantRef) {
      void get().flushPendingSync();
    }
  },
});
