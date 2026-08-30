import type { Locale } from '@shunzz/ui/i18n';
import { siteSchema, type Site } from './schema';
import zh from './zh/site.json';
import en from './en/site.json';

const raw: Record<Locale, unknown> = { 'zh-hant': zh, en };

export function loadSite(locale: Locale): Site {
  const r = siteSchema.safeParse(raw[locale]);
  if (!r.success) throw new Error(`content/${locale} invalid: ${r.error.message}`);
  return r.data;
}
