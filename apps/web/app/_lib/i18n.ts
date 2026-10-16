// Shared public-site entry point. Keep the previous t(locale, key) API for existing components.
export { locales as ENABLED_LOCALES, futureLocales as RESERVED_LOCALES, isLocale, type Locale } from './i18n/routing';
export { translator, type TranslationKey } from './i18n/index';
import { translator, type TranslationKey } from './i18n/index';
import type { Locale } from './i18n/routing';
export function t(locale: Locale, key: TranslationKey): string { return translator(locale)(key); }
