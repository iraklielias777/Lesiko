
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './i18n/resources';

const urlLang = (() => {
  try {
    const value = new URLSearchParams(window.location.search).get('lang');
    if (value === 'en' || value === 'ka') return value;
  } catch {
    /* no window during a non-browser import */
  }
  return null;
})();

if (urlLang) {
  try {
    localStorage.setItem('lesiko-lang-chosen', '1');
  } catch {
    /* storage unavailable */
  }
}

const storedLang = localStorage.getItem('i18nextLng');
const defaultLang = urlLang || storedLang || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLang, // Use stored language or default to English
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    react: {
      useSuspense: false
    }
  });

// Persist language change
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('i18nextLng', lng);
  document.documentElement.lang = lng;
});

export default i18n;
