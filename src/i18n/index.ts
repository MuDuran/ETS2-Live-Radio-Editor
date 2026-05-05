import payload from "./translations.json";

type TranslationMap = Record<string, string>;
type LanguageMap = Record<string, string>;

const supportedLanguages = payload.supportedLanguages as LanguageMap;
const translations = payload.translations as Record<string, TranslationMap>;

export { supportedLanguages };

export function translate(language: string, key: string, vars: Record<string, string | number> = {}) {
  const dictionary = translations[language] ?? translations.en ?? {};
  const fallback = translations.en ?? {};
  const raw = dictionary[key] ?? fallback[key] ?? key;
  return Object.entries(vars).reduce(
    (message, [token, value]) => message.replaceAll(`{${token}}`, String(value)),
    raw
  );
}
