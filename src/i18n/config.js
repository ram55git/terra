import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';
import es from '../locales/es.json';
import hi from '../locales/hi.json';
import ta from '../locales/ta.json';
import kn from '../locales/kn.json';
import ml from '../locales/ml.json';
import te from '../locales/te.json';
import mr from '../locales/mr.json';
import bn from '../locales/bn.json';

// Get saved language from localStorage or default to English
const savedLanguage = localStorage.getItem('language') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      hi: { translation: hi },
      ta: { translation: ta },
      kn: { translation: kn },
      ml: { translation: ml },
      te: { translation: te },
      mr: { translation: mr },
      bn: { translation: bn }
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

// Save language preference when it changes
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
});

export default i18n;
