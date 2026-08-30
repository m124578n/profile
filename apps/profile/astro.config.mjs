import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://profile.shunzz.com',
  output: 'static',
  compressHTML: true,
  build: { inlineStylesheets: 'always' },
  i18n: {
    defaultLocale: 'zh-hant',
    locales: ['zh-hant', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({ i18n: { defaultLocale: 'zh-hant', locales: { 'zh-hant': 'zh-Hant', en: 'en' } } }),
  ],
});
