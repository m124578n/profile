import { z } from 'zod';

const link = z.object({ label: z.string(), href: z.string() });

export const siteSchema = z.object({
  meta: z.object({
    title: z.string(),
    description: z.string().max(160),
    name: z.string(),
    jobTitle: z.string(),
  }),
  nav: z.object({
    links: z.array(z.object({ label: z.string(), href: z.string(), rel: z.string().optional() })).min(1),
    switchLang: z.string(),
    toggleTheme: z.string(),
    primaryNav: z.string(),
    skipToContent: z.string(),
  }),
  hero: z.object({
    headline: z.string().min(1),
    sub: z.string(),
    primaryCta: link,
    secondaryCta: link,
  }),
  about: z.object({
    heading: z.string(),
    short: z.string(),
    acts: z.array(z.object({ title: z.string(), body: z.string() })).length(3),
    readMore: z.string(),
  }),
  pillars: z.object({
    heading: z.string(),
    items: z.array(z.object({ title: z.string(), points: z.array(z.string()).min(2) })).length(3),
  }),
  projects: z.object({
    heading: z.string(),
    flipHint: z.string(),
    flipBack: z.string(),
    items: z.array(
      z.object({
        name: z.string(),
        tagline: z.string(),
        story: z.string(),
        tags: z.array(z.string()).min(1),
        stats: z.array(z.object({ value: z.string(), label: z.string() })).min(1),
        links: z.array(link),
        featured: z.boolean().default(false),
      }),
    ).length(4),
  }),
  proof: z.object({
    heading: z.string(),
    items: z.array(z.object({ label: z.string(), value: z.string(), href: z.string().optional() })),
  }),
  footer: z.object({
    contact: z.string(),
    email: z.email(),
    note: z.string(),
  }),
});

export type Site = z.infer<typeof siteSchema>;
