export const locales = ['zh', 'de', 'en'] as const;
export type Locale = typeof locales[number];
export const futureLocales = ['nl', 'fr', 'it', 'es'] as const;
// Bump this cookie name so stale locale selections from the pre-routing build do not force Chinese.
export const localeCookie = 'alsvid-locale-v2';
export function isLocale(value: unknown): value is Locale {
  return locales.some(locale => locale === value);
}
export function preferredLocale(saved: unknown, country?: string | null): Locale {
  if (isLocale(saved)) return saved;
  const code = country?.toUpperCase();
  if (['DE', 'AT', 'CH', 'LI'].includes(code ?? '')) return 'de';
  if (['CN', 'HK', 'MO', 'TW'].includes(code ?? '')) return 'zh';
  return code && /^[A-Z]{2}$/.test(code) && code !== 'XX' ? 'en' : 'de';
}
export function localizedPath(path: string, locale: Locale): string {
  const safePath = path.startsWith('/') && !path.startsWith('//') ? path : '/';
  const segments = safePath.split('/');
  if (isLocale(segments[1])) segments[1] = locale;
  else segments.splice(1, 0, locale);
  return segments.join('/');
}

export const localeLabels: Record<Locale, string> = { zh: '中文', de: 'DE', en: 'EN' };
export const localeNativeLabels: Record<Locale, string> = { zh: '中文', de: 'Deutsch', en: 'English' };
