/**
 * FloraLog — Offline-First Plant & Notebook Store
 * Composed from focused Zustand domain slices with AsyncStorage persistence
 * and background Supabase sync queue.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  AdaptiveCarePreferences,
  AddPlantPayload,
  LogCareEventPayload,
  PlantStoreState,
  UpdateCareEntryPayload,
  UpdatePlantPayload,
} from '@/store/plantStoreTypes';
import { createCareLogSlice } from '@/store/slices/careLogSlice';
import { createHealthAssessmentSlice } from '@/store/slices/healthAssessmentSlice';
import { createPlantSlice } from '@/store/slices/plantSlice';
import { createPreferencesSlice } from '@/store/slices/preferencesSlice';
import { createSyncSlice } from '@/store/slices/syncSlice';
import type { PendingSyncOp } from '@/store/syncQueue';
import { doesPlantNeedWatering, getDaysUntilNextWater } from '@/utils/watering';

export {
  doesPlantNeedWatering,
  getDaysUntilNextWater,
  type AdaptiveCarePreferences,
  type AddPlantPayload,
  type LogCareEventPayload,
  type PendingSyncOp,
  type PlantStoreState,
  type UpdateCareEntryPayload,
  type UpdatePlantPayload,
};

export const usePlantStore = create<PlantStoreState>()(
  persist(
    (...args) => ({
      ...createPreferencesSlice(...args),
      ...createSyncSlice(...args),
      ...createPlantSlice(...args),
      ...createCareLogSlice(...args),
      ...createHealthAssessmentSlice(...args),
    }),
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
