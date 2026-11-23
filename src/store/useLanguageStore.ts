import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import i18n, { type LanguagePreference, resolveLanguage } from '@/i18n';

interface LanguageState {
  preference: LanguagePreference;
  setPreference: (preference: LanguagePreference) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => {
        set({ preference });
        void i18n.changeLanguage(resolveLanguage(preference));
      },
    }),
    {
      name: 'floralog-language-preference',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          void i18n.changeLanguage(resolveLanguage(state.preference));
        }
      },
    }
  )
);
