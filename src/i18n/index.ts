import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import ru from './locales/ru.json';

export type SupportedLanguage = 'en' | 'ru';
export type LanguagePreference = 'system' | SupportedLanguage;

/**
 * Resolve the device's primary language to a supported app locale.
 */
export function getDeviceLanguage(): SupportedLanguage {
  try {
    const code = getLocales()[0]?.languageCode;
    return code === 'ru' ? 'ru' : 'en';
  } catch {
    return 'en';
  }
}

/**
 * Convert a user preference ('system' | 'en' | 'ru') into a concrete locale.
 */
export function resolveLanguage(pref: LanguagePreference): SupportedLanguage {
  return pref === 'system' ? getDeviceLanguage() : pref;
}

if (!i18n.isInitialized) {
  // eslint-disable-next-line import/no-named-as-default-member
  void i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ru: { translation: ru },
    },
    lng: getDeviceLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });
} else {
  i18n.addResourceBundle('en', 'translation', en, true, true);
  i18n.addResourceBundle('ru', 'translation', ru, true, true);
}

export default i18n;
