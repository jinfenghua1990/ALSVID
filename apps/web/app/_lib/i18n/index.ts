import zh from './zh.json';
import de from './de.json';
import en from './en.json';
import fc1Zh from './fc1/zh.json';
import fc1De from './fc1/de.json';
import fc1En from './fc1/en.json';
import fc2Zh from './fc2/zh.json';
import fc2De from './fc2/de.json';
import fc2En from './fc2/en.json';
import type { Locale } from './routing';
export type { Locale } from './routing';
const zhCatalog = { ...zh, ...fc1Zh, ...fc2Zh };
const deCatalog = { ...de, ...fc1De, ...fc2De };
const enCatalog = { ...en, ...fc1En, ...fc2En };
export type TranslationKey = keyof typeof enCatalog;
const catalogs: Record<Locale, Record<TranslationKey, string>> = {
  zh: zhCatalog,
  de: deCatalog,
  en: enCatalog,
};
export function translator(locale: Locale) {
  return (key: TranslationKey, values: Record<string, string | number> = {}) =>
    catalogs[locale][key].replace(/\{(\w+)\}/g, (placeholder, name: string) => String(values[name] ?? placeholder));
}
