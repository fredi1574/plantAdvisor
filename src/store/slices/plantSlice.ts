import { SEED_PLANTS } from '@/constants/seedData';
import { cancelPlantReminder } from '@/services/notificationService';
import {
  DEFAULT_FALLBACK_PHOTO,
  reschedulePlantAndDigest,
  type PlantSlice,
  type PlantSliceCreator,
} from '@/store/plantStoreTypes';
import { mergePendingOps } from '@/store/syncQueue';
import type { HealthAssessment, NotebookEntry, UserPlant } from '@/types/plant';
import { createEntityId } from '@/utils/ids';

export const createPlantSlice: PlantSliceCreator<PlantSlice> = (set, get) => ({
  plants: SEED_PLANTS,

  addPlant: (payload) => {
    const nowIso = new Date().toISOString();
    const newPlantId = createEntityId('plant');
    const { identification } = payload;

    const initialAssessment: HealthAssessment = {
      id: createEntityId('ha-init'),
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
      succulentGuardrailApplied: identification.baselineCare.succulentGuardrails
        .isSucculentOrCactus
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
      customWateringIntervalDays: identification.baselineCare.baseWateringDays,
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
        hasGuestEdits: state.ownerUserId === null ? true : state.hasGuestEdits,
        pendingOps: nextOps,
        pendingSyncCount: nextOps.length,
      };
    });

    void (async () => {
      await reschedulePlantAndDigest(get, newPlant);
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
          hasDrainageHole: payload.hasDrainageHole ?? plant.hasDrainageHole,
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
                ? payload.scientificName.trim() || plant.species.scientificName
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
        hasGuestEdits: state.ownerUserId === null ? true : state.hasGuestEdits,
        pendingOps: nextOps,
        pendingSyncCount: nextOps.length,
      };
    });

    if (updatedPlantRef) {
      const targetPlant = updatedPlantRef as UserPlant;
      void (async () => {
        await reschedulePlantAndDigest(get, targetPlant);
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
        hasGuestEdits: state.ownerUserId === null ? true : state.hasGuestEdits,
        pendingOps: nextOps,
        pendingSyncCount: nextOps.length,
      };
    });

    void (async () => {
      await cancelPlantReminder(plantId);
      await reschedulePlantAndDigest(get);
      await get().flushPendingSync();
    })();
  },
});
