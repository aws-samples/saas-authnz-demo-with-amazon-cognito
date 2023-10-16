import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import config_ja from './ja.json';

// https://react.i18next.com/
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'ja',
    interpolation: {
      escapeValue: false
    },
    resources: {
      ja: {
        translation: config_ja
      }
    }
  });

  export default i18n;