import zh from './zh.json';
import de from './de.json';
import en from './en.json';
import fc1Zh from './fc1/zh.json';
import fc1De from './fc1/de.json';
import fc1En from './fc1/en.json';
import fc2Zh from './fc2/zh.json';
import fc2De from './fc2/de.json';
import fc2En from './fc2/en.json';
import l8Zh from './l8/zh.json';
import l8De from './l8/de.json';
import l8En from './l8/en.json';
import l7Zh from './l7/zh.json';
import l7De from './l7/de.json';
import l7En from './l7/en.json';
import cupZh from './cup-holder/zh.json';
import cupDe from './cup-holder/de.json';
import cupEn from './cup-holder/en.json';
import authZh from './auth/zh.json';
import authDe from './auth/de.json';
import authEn from './auth/en.json';
import networkZh from './public-network/zh.json';
import networkDe from './public-network/de.json';
import networkEn from './public-network/en.json';
import catalogZh from './catalog/zh.json';
import catalogDe from './catalog/de.json';
import catalogEn from './catalog/en.json';
import type { Locale } from './routing';
export type { Locale } from './routing';
const zhCatalog = { ...zh, ...fc1Zh, ...fc2Zh, ...l8Zh, ...l7Zh, ...cupZh, ...authZh, ...networkZh, ...catalogZh };
const deCatalog = { ...de, ...fc1De, ...fc2De, ...l8De, ...l7De, ...cupDe, ...authDe, ...networkDe, ...catalogDe };
const enCatalog = { ...en, ...fc1En, ...fc2En, ...l8En, ...l7En, ...cupEn, ...authEn, ...networkEn, ...catalogEn };
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
