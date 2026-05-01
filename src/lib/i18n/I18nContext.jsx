import { createContext, useContext, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage.js';
import { translations } from './translations.js';

const I18nContext = createContext(null);

function interpolate(text, vars = {}) {
  return text.replace(/{{(\w+)}}/g, (_, key) => vars[key] ?? '');
}

export function I18nProvider({ children }) {
  const [language, setLanguage] = useLocalStorage('app.language', 'de');
  const dictionary = translations[language] || translations.de;

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (key, vars) => {
      const value = dictionary[key] || translations.de[key] || key;
      return typeof value === 'string' ? interpolate(value, vars) : value;
    },
  }), [language, setLanguage, dictionary]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}