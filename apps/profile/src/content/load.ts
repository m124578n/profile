import type { Locale } from '@shunzz/ui/i18n';
import { resumeSchema, type Resume } from './schema';
import zh from './zh/resume.json';
import en from './en/resume.json';
const raw: Record<Locale, unknown> = { 'zh-hant': zh, en };
export function loadResume(locale: Locale): Resume {
  const r = resumeSchema.safeParse(raw[locale]);
  if (!r.success) throw new Error(`content/${locale} invalid: ${r.error.message}`);
  return r.data;
}
