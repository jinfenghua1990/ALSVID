import de from './de.json';
import en from './en.json';
import type { Locale } from './routing';
export type { Locale } from './routing';
export type TranslationKey = keyof typeof en;
const catalogs: Record<Locale, Record<TranslationKey, string>> = { de, en };
export function translator(locale: Locale) {
  return (key: TranslationKey, values: Record<string, string | number> = {}) =>
    catalogs[locale][key].replace(/\{(\w+)\}/g, (placeholder, name: string) => String(values[name] ?? placeholder));
}
