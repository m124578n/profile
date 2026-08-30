export type Locale = 'zh-hant' | 'en';
export const LOCALES: Locale[] = ['zh-hant', 'en'];
export const DEFAULT_LOCALE: Locale = 'zh-hant';

/** 回傳該語言的根路徑:zh → '/',en → '/en/' */
export function localePath(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? '/' : `/${locale}/`;
}

/** <html lang> 用的 BCP47 */
export function htmlLang(locale: Locale): string {
  return locale === 'zh-hant' ? 'zh-Hant' : 'en';
}
