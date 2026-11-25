import { SEED_NOTEBOOK_ENTRIES, SEED_PLANTS } from '@/constants/seedData';
import i18n from '@/i18n';
import { toFriendlyErrorMessage } from '@/services/errorMessages';
import {
  cancelAllGardenNotifications,
  syncAllPlantNotifications,
} from '@/services/notificationService';
import {
  getCurrentUserId,
  isSupabaseConfigured,
  pullOrSeedGardenWithSupabase,
  syncCareEntriesBatchToSupabase,
  syncPlantsBatchToSupabase,
} from '@/services/supabase';
import type { PlantSliceCreator, SyncSlice } from '@/store/plantStoreTypes';
import {
  collectLocalPhotoRecoveryOps,
  executePendingSyncOps,
  removePendingOp,
} from '@/store/syncQueue';

export const createSyncSlice: PlantSliceCreator<SyncSlice> = (set, get) => ({
  ownerUserId: null,
  hasGuestEdits: false,
  pendingOps: [],
  pendingSyncCount: 0,
  lastSyncedAt: null,
  syncError: null,
  isSyncing: false,

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

    const recoveredOps = collectLocalPhotoRecoveryOps(
      get().pendingOps,
      get().plants,
      get().entries
    );
    if (recoveredOps.length !== get().pendingOps.length) {
      set({
        pendingOps: recoveredOps,
        pendingSyncCount: recoveredOps.length,
      });
    }

    const ops = [...recoveredOps];
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
        set({ syncError: toFriendlyErrorMessage(lastError, 'sync') });
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
    } else if (prevOwner === userId) {
      const recovered = collectLocalPhotoRecoveryOps(
        get().pendingOps,
        get().plants,
        get().entries
      );
      if (recovered.length > 0) {
        await get().flushPendingSync();
      }
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
          localAssessments: canSeedFromGuest ? get().healthAssessments : [],
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
        await syncAllPlantNotifications(remote.plants, get().notificationPrefs);
      } else {
        set({
          ownerUserId: userId,
          syncError: i18n.t('errors.syncOffline'),
        });
      }
    } finally {
      set({ isSyncing: false });
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
});
