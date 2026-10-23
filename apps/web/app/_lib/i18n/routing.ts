export const locales = ['zh', 'de', 'en'] as const;
export type Locale = typeof locales[number];
export const futureLocales = ['nl', 'fr', 'it', 'es'] as const;
// Bump this cookie name so stale locale selections from the pre-routing build do not force Chinese.
export const localeCookie = 'alsvid-locale-v2';
export function isLocale(value: unknown): value is Locale {
  return locales.some(locale => locale === value);
}
export function preferredLocale(saved: unknown, accepted = ''): Locale {
  if (isLocale(saved)) return saved;
  const preferences = accepted.split(',').map(item => {
    const [tag = '', quality] = item.trim().split(';');
    return { language: tag.toLowerCase().split('-')[0], quality: quality ? Number(quality.trim().replace(/^q=/, '')) : 1 };
  }).filter(item => item.quality > 0).sort((a, b) => b.quality - a.quality);
  return preferences.find(item => isLocale(item.language))?.language as Locale | undefined ?? 'en';
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
