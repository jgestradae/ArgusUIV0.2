import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationES from './locales/es/translation.json';
import translationEN from './locales/en/translation.json';

// Translation resources
const resources = {
  es: {
    translation: translationES
  },
  en: {
    translation: translationEN
  }
};

i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources,
    fallbackLng: 'es', // Default language (Spanish for Colombian government)
    debug: false,
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    detection: {
      // Check localStorage first, then use fallback
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      // Explicitly set the key name
      lookupCookie: 'i18next',
      lookupSessionStorage: 'i18nextLng',
    },
    
    // Support for language codes like 'es-CO', 'en-US' -> 'es', 'en'
    load: 'languageOnly',
    supportedLngs: ['es', 'en'],
    nonExplicitSupportedLngs: true,
    cleanCode: true, // Clean up language codes
  });

export default i18n;
