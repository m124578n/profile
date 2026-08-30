import { z } from 'zod';

const link = z.object({ label: z.string(), href: z.string(), rel: z.string().optional() });

export const resumeSchema = z.object({
  meta: z.object({ title: z.string(), description: z.string().max(160), name: z.string(), jobTitle: z.string() }),
  nav: z.object({
    links: z.array(link).min(1),
    switchLang: z.string(), toggleTheme: z.string(), primaryNav: z.string(), skipToContent: z.string(),
  }),
  labels: z.object({
    positioning: z.string(), experience: z.string(), sideProjects: z.string(), skills: z.string(),
    education: z.string(), languages: z.string(), contact: z.string(), print: z.string(), backToBrand: z.string(),
  }),
  header: z.object({
    name: z.string(), latinName: z.string(), title: z.string(), location: z.string(),
    contacts: z.array(link).min(1), summary: z.string(),
  }),
  positioning: z.array(z.object({ title: z.string(), body: z.string() })).length(3),
  experience: z.array(z.object({
    company: z.string(), role: z.string(), period: z.string(), location: z.string(),
    intro: z.string().optional(),
    groups: z.array(z.object({ name: z.string(), bullets: z.array(z.string()).min(1) })).optional(),
    bullets: z.array(z.string()),
    stack: z.array(z.string()),
  })).min(1),
  sideProjects: z.array(z.object({
    name: z.string(), period: z.string().optional(), desc: z.string(), links: z.array(link),
  })).min(1),
  skills: z.array(z.object({ group: z.string(), items: z.array(z.string()).min(1) })).min(1),
  education: z.array(z.object({ school: z.string(), degree: z.string(), period: z.string() })).min(1),
  languages: z.array(z.object({ name: z.string(), level: z.string() })).min(1),
  footer: z.object({ email: z.string(), note: z.string() }),
});
export type Resume = z.infer<typeof resumeSchema>;
