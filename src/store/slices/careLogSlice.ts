import { SEED_NOTEBOOK_ENTRIES } from '@/constants/seedData';
import { triggerSuccessHaptic } from '@/services/haptics';
import { syncAllPlantNotifications } from '@/services/notificationService';
import {
  getCurrentUserId,
  isSupabaseConfigured,
  syncCareEntriesBatchToSupabase,
  syncPlantsBatchToSupabase,
} from '@/services/supabase';
import {
  reschedulePlantAndDigest,
  type CareLogSlice,
  type PlantSliceCreator,
} from '@/store/plantStoreTypes';
import { enqueueBatchSyncFallbacks, mergePendingOps } from '@/store/syncQueue';
import type { NotebookEntry, UserPlant } from '@/types/plant';
import { createEntityId } from '@/utils/ids';
import {
  buildDefaultWateringCopy,
  doesPlantNeedWatering,
} from '@/utils/watering';

export const createCareLogSlice: PlantSliceCreator<CareLogSlice> = (
  set,
  get
) => {
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
    entries: SEED_NOTEBOOK_ENTRIES,

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
              payload.metrics !== undefined ? payload.metrics : entry.metrics,
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
          hasGuestEdits: state.ownerUserId === null ? true : state.hasGuestEdits,
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
          hasGuestEdits: state.ownerUserId === null ? true : state.hasGuestEdits,
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
  };
};
