import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  syncAllPlantNotifications,
  type NotificationPreferences,
} from '@/services/notificationService';
import {
  DEFAULT_ADAPTIVE_CARE_PREFS,
  DEFAULT_ROOM_PRESETS,
  type PlantSliceCreator,
  type PreferencesSlice,
  type RoomPreset,
} from '@/store/plantStoreTypes';
import { createEntityId } from '@/utils/ids';

export const createPreferencesSlice: PlantSliceCreator<PreferencesSlice> = (
  set,
  get
) => ({
  notificationPrefs: DEFAULT_NOTIFICATION_PREFERENCES,
  adaptiveCarePrefs: DEFAULT_ADAPTIVE_CARE_PREFS,
  roomPresets: DEFAULT_ROOM_PRESETS,
  hasCompletedOnboarding: false,

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

  addRoomPreset: (preset) => {
    const trimmedName = preset.name.trim();
    const existing = get().roomPresets.find(
      (p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (existing) {
      const updated: RoomPreset = {
        ...existing,
        name: trimmedName || existing.name,
        lightExposure: preset.lightExposure,
        isIndoor: preset.isIndoor,
      };
      set((state) => ({
        roomPresets: state.roomPresets.map((p) =>
          p.id === existing.id ? updated : p
        ),
      }));
      return updated;
    }

    const created: RoomPreset = {
      id: createEntityId('room'),
      name: trimmedName || 'Custom Spot',
      lightExposure: preset.lightExposure,
      isIndoor: preset.isIndoor,
    };

    set((state) => ({
      roomPresets: [...state.roomPresets, created],
    }));

    return created;
  },

  deleteRoomPreset: (presetId) => {
    set((state) => ({
      roomPresets: state.roomPresets.filter((p) => p.id !== presetId),
    }));
  },

  completeOnboarding: () => {
    set({ hasCompletedOnboarding: true });
  },

  rescheduleAllNotifications: async () => {
    await syncAllPlantNotifications(get().plants, get().notificationPrefs);
  },
});
