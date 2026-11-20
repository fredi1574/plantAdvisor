import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  syncAllPlantNotifications,
  type NotificationPreferences,
} from '@/services/notificationService';
import {
  DEFAULT_ADAPTIVE_CARE_PREFS,
  type PlantSliceCreator,
  type PreferencesSlice,
} from '@/store/plantStoreTypes';

export const createPreferencesSlice: PlantSliceCreator<PreferencesSlice> = (
  set,
  get
) => ({
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
});
