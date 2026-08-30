# profile.shunzz.com Résumé Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `apps/profile`(profile.shunzz.com)——雙語、緊湊、可列印的履歷單頁;同時把 `packages/ui` 與共用腳本泛用化,讓兩個 app 共用。

**Architecture:** 與 `apps/brand` 同構的 Astro 7 靜態站;內容在 `src/content/{zh,en}/resume.json`(zod 驗證、雙語結構一致);`BaseLayout` 改為吃 `nav.links[]`;`check-content.mjs` / `gen-og.mjs` 移到根目錄 `scripts/` 供兩個 app 共用;根目錄 `build`/`test`/`check` 跑兩個 app。

**Tech Stack:** Node 24、Astro 7、@astrojs/sitemap、zod 4、sharp、純 CSS(`@media print`)。

**Spec:** `docs/superpowers/specs/2026-08-30-shunzz-sites-design.md` §10(以及 §3/§5/§6/§7 的通用規則)

## Global Constraints

- Astro `^7`、`output: 'static'`、`compressHTML: true`、`build.inlineStylesheets: 'always'`;i18n `defaultLocale: 'zh-hant'`, `locales: ['zh-hant','en']`, `prefixDefaultLocale: false`。
- profile 站 `site: 'https://profile.shunzz.com'`。
- 每頁唯一 `<h1>`;`<html lang>` = `zh-Hant` / `en`;所有非 void 標籤閉合;無 Tailwind/框架;客戶端 JS 只有 inline `<script>`(profile 站只需主題切換,無其他互動)。
- 禁用詞掃描沿用(清單在 gitignored `private/forbidden-terms.txt` 或 env `FORBIDDEN_TERMS`;不得把清單內容寫進任何 tracked 檔案)。**公開內容不得出現**:現職公司名、客戶/品牌名(零售集團與票證品牌)、內部系統代號、手機、地址、年齡、薪資、希望地點。
- 中文內容使用全形逗號「,」;數字千分位保留半形(如 `1,100+`)。
- 測試指令為 `node --test test/*.test.mjs`(Windows Node 24 目錄形式有 bug)。
- Commit 用 `git -c user.name=shunzz -c user.email=m23568n@gmail.com commit`。絕不 `git add -f` 被 ignore 的檔案。
- 內容 JSON 由本 plan 提供,實作者逐字複製,不自行改寫文案。

---

## File Structure

```
scripts/check-content.mjs             # 從 apps/brand/scripts 移來;denylist 路徑改為 ../private
scripts/gen-og.mjs                    # 從 apps/brand/scripts 移來;吃參數 --out --l1 --l2 --sub --eyebrow
packages/ui/components/BaseLayout.astro   # nav.links[] 泛用化
apps/brand/src/content/schema.ts      # nav → { links, switchLang, toggleTheme, primaryNav, skipToContent }
apps/brand/src/content/{zh,en}/site.json  # nav 改為 links 陣列
apps/brand/package.json               # scripts 指向 ../../scripts/*
apps/brand/test/content.test.mjs      # scanner 路徑改為 ../../scripts/check-content.mjs
apps/profile/package.json
apps/profile/astro.config.mjs
apps/profile/tsconfig.json
apps/profile/public/{robots.txt,_headers,favicon.svg,og.png}
apps/profile/src/content/schema.ts
apps/profile/src/content/load.ts
apps/profile/src/content/{zh,en}/resume.json
apps/profile/src/components/{ResumeHeader,Positioning,Experience,SideProjects,Skills,Education,ResumeFooter}.astro
apps/profile/src/styles/resume.css    # 緊湊版面 + @media print
apps/profile/src/pages/index.astro
apps/profile/src/pages/en/index.astro
apps/profile/test/{content,dist}.test.mjs
package.json                          # build/test/check 跑兩個 app;dev:profile
.github/workflows/ci.yml              # 不變(root scripts 已涵蓋兩個 app)
README.md                             # 加 profile 專案列與 Pages 設定
```

---

### Task 1: 共用層泛用化(BaseLayout nav.links、腳本移到根目錄)

**Files:**
- Modify: `packages/ui/components/BaseLayout.astro`, `apps/brand/src/content/schema.ts`, `apps/brand/src/content/zh/site.json`, `apps/brand/src/content/en/site.json`, `apps/brand/package.json`, `apps/brand/test/content.test.mjs`, `package.json`(root)
- Move: `apps/brand/scripts/check-content.mjs` → `scripts/check-content.mjs`;`apps/brand/scripts/gen-og.mjs` → `scripts/gen-og.mjs`(`git mv`)

**Interfaces:**
- Produces: `BaseLayout` props `nav: { links: {label:string; href:string; rel?:string}[]; switchLang; toggleTheme; primaryNav; skipToContent }`;`scripts/check-content.mjs [targets...]`(cwd 相對,預設 `src`、`dist`;denylist 於 `<repo>/private/forbidden-terms.txt` 或 env);`node scripts/gen-og.mjs --out <png> --eyebrow <t> --l1 <t> --l2 <t> --sub <t>`。

- [ ] **Step 1: 先改測試(RED)**

`apps/brand/test/content.test.mjs`:把三處 `'scripts/check-content.mjs'` 改為 `'../../scripts/check-content.mjs'`。
`apps/brand/test/dist.test.mjs` 追加:
```js
test('nav 由 links 陣列渲染(含 profile 站連結)', () => {
  const zh = html('index.html');
  assert.match(zh, /<nav[^>]*aria-label="主選單"[^>]*>[\s\S]*href="https:\/\/profile\.shunzz\.com"[^>]*rel="me"/);
  assert.equal((zh.match(/<nav[^>]*>[\s\S]*?<\/nav>/)[0].match(/<a /g) ?? []).length, 5); // 4 links + LangSwitch
});
```
Run: `npm test` → content 測試 FAIL(找不到 script)、新 dist 測試 FAIL

- [ ] **Step 2: 移動腳本並改路徑**

```bash
mkdir -p scripts && git mv apps/brand/scripts/check-content.mjs scripts/check-content.mjs && git mv apps/brand/scripts/gen-og.mjs scripts/gen-og.mjs
```
`scripts/check-content.mjs`:把預設 denylist 路徑由 `../../../private/forbidden-terms.txt` 改為 `../private/forbidden-terms.txt`(相對 `import.meta.url`)。其餘不變。

`scripts/gen-og.mjs` 全文改為:
```js
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: {
  out: { type: 'string' }, eyebrow: { type: 'string', default: 'shunzz.com' },
  l1: { type: 'string', default: 'Build with AI.' }, l2: { type: 'string', default: 'Ship for real.' },
  sub: { type: 'string', default: 'Spec-driven × AI agents × full-stack delivery' },
} });
if (!values.out) { console.error('usage: gen-og.mjs --out <png> [--eyebrow] [--l1] [--l2] [--sub]'); process.exit(1); }
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#fbfaf7"/>
  <rect x="0" y="0" width="14" height="630" fill="#c73f19"/>
  <text x="90" y="150" font-family="JetBrains Mono, Consolas, monospace" font-size="34" fill="#5f5f5a">${esc(values.eyebrow)}</text>
  <text x="90" y="300" font-family="Inter, Arial, sans-serif" font-size="76" font-weight="700" fill="#1a1a1a">${esc(values.l1)}</text>
  <text x="90" y="390" font-family="Inter, Arial, sans-serif" font-size="76" font-weight="700" fill="#c73f19">${esc(values.l2)}</text>
  <text x="90" y="520" font-family="Inter, Arial, sans-serif" font-size="30" fill="#5f5f5a">${esc(values.sub)}</text>
</svg>`;
const png = await sharp(Buffer.from(svg)).png().toBuffer();
writeFileSync(values.out, png);
console.log('og written', values.out, png.length, 'bytes');
```
`apps/brand/package.json` scripts:
```json
"build": "astro build && node ../../scripts/check-content.mjs",
"check:content": "node ../../scripts/check-content.mjs",
"og": "node ../../scripts/gen-og.mjs --out public/og.png"
```
把 `sharp` devDependency 從 `apps/brand/package.json` 移到 root `package.json` 的 `devDependencies`(`npm uninstall sharp -w apps/brand && npm install -D sharp`)。

- [ ] **Step 3: BaseLayout nav.links**

`packages/ui/components/BaseLayout.astro` 的 Props 與 nav 區塊改為:
```astro
interface Props {
  locale: Locale; title: string; description: string; name: string; jobTitle: string;
  nav: {
    links: { label: string; href: string; rel?: string }[];
    switchLang: string; toggleTheme: string; primaryNav: string; skipToContent: string;
  };
}
```
```astro
      <nav aria-label={nav.primaryNav}>
        {nav.links.map((l) => <a href={l.href} rel={l.rel}>{l.label}</a>)}
        <LangSwitch {locale} label={nav.switchLang} />
        <ThemeToggle label={nav.toggleTheme} />
      </nav>
```
(其餘保持:theme-init script 在 head 第一個、skip link、`<main id="main">`、`<slot name="footer" />`。)

- [ ] **Step 4: brand schema 與 JSON**

`apps/brand/src/content/schema.ts` 的 `nav`:
```ts
  nav: z.object({
    links: z.array(z.object({ label: z.string(), href: z.string(), rel: z.string().optional() })).min(1),
    switchLang: z.string(),
    toggleTheme: z.string(),
    primaryNav: z.string(),
    skipToContent: z.string(),
  }),
```
`zh/site.json` 的 `nav`:
```json
  "nav": {
    "links": [
      { "label": "專案", "href": "#projects" },
      { "label": "關於我", "href": "#about" },
      { "label": "聯絡", "href": "#contact" },
      { "label": "專業履歷版", "href": "https://profile.shunzz.com", "rel": "me" }
    ],
    "switchLang": "English",
    "toggleTheme": "切換深淺色",
    "primaryNav": "主選單",
    "skipToContent": "跳到主要內容"
  },
```
`en/site.json` 的 `nav`:
```json
  "nav": {
    "links": [
      { "label": "Projects", "href": "#projects" },
      { "label": "About", "href": "#about" },
      { "label": "Contact", "href": "#contact" },
      { "label": "Résumé site", "href": "https://profile.shunzz.com", "rel": "me" }
    ],
    "switchLang": "中文",
    "toggleTheme": "Toggle theme",
    "primaryNav": "Primary",
    "skipToContent": "Skip to content"
  },
```

- [ ] **Step 5: root package.json**

```json
  "scripts": {
    "dev": "npm run dev -w apps/brand",
    "dev:profile": "npm run dev -w apps/profile",
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "check": "npm run check --workspaces --if-present"
  },
```
(`packages/ui` 無這些 script,`--if-present` 會略過。)

- [ ] **Step 6: GREEN**

Run: `npm run build && npm test && npm run check` → 全部通過(brand 21 tests)。確認 `git status` 顯示 `scripts/` 為 rename 而非新增。

- [ ] **Step 7: Commit**

```bash
git add -A scripts apps/brand packages/ui package.json package-lock.json
git -c user.name=shunzz -c user.email=m23568n@gmail.com commit -m "refactor: generic nav links in BaseLayout; shared scripts at repo root"
```

---

### Task 2: apps/profile 骨架、schema、雙語履歷內容

**Files:**
- Create: `apps/profile/package.json`, `astro.config.mjs`, `tsconfig.json`, `public/favicon.svg`, `public/robots.txt`, `public/_headers`, `src/content/schema.ts`, `src/content/load.ts`, `src/content/zh/resume.json`, `src/content/en/resume.json`, `src/pages/index.astro`, `src/pages/en/index.astro`, `test/content.test.mjs`, `test/dist.test.mjs`

**Interfaces:**
- Produces: `loadResume(locale): Resume`;`Resume` 型別(見 schema);頁面先只渲染 `<h1>{resume.header.name}</h1>`,Task 3 補 sections。

- [ ] **Step 1: 測試(RED)**

`apps/profile/test/dist.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const html = (p) => readFileSync(resolve(root, 'dist', p), 'utf8');

test('build 產出 zh 與 en 首頁', () => {
  assert.ok(existsSync(resolve(root, 'dist/index.html')));
  assert.ok(existsSync(resolve(root, 'dist/en/index.html')));
});
test('html lang 與唯一 h1', () => {
  assert.match(html('index.html'), /<html[^>]*lang="zh-Hant"/);
  assert.match(html('en/index.html'), /<html[^>]*lang="en"/);
  for (const p of ['index.html', 'en/index.html']) assert.equal((html(p).match(/<h1[\s>]/g) ?? []).length, 1, p);
});
test('SEO 基本標籤指向 profile.shunzz.com', () => {
  const zh = html('index.html');
  assert.match(zh, /<link rel="canonical" href="https:\/\/profile\.shunzz\.com\/"/);
  assert.match(zh, /hreflang="en" href="https:\/\/profile\.shunzz\.com\/en\/"/);
  assert.match(zh, /"@type":"Person"/);
  assert.match(html('en/index.html'), /<link rel="canonical" href="https:\/\/profile\.shunzz\.com\/en\/"/);
});
```
`apps/profile/test/content.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const load = (l) => JSON.parse(readFileSync(resolve(root, `src/content/${l}/resume.json`), 'utf8'));
function shape(v) {
  if (Array.isArray(v)) return `[${v.length}:${v.length ? shape(v[0]) : ''}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${k}:${shape(v[k])}`).join(',')}}`;
  return typeof v;
}
test('zh 與 en 履歷結構一致', () => { assert.equal(shape(load('zh')), shape(load('en'))); });
test('中文內容不含夾在中文字之間的半形逗號', () => {
  const s = JSON.stringify(load('zh'));
  assert.equal((s.match(/[一-鿿],|,[一-鿿]/g) ?? []).length, 0);
});
test('經歷 bullets 非空', () => {
  for (const l of ['zh', 'en']) for (const e of load(l).experience) assert.ok(e.bullets.length >= 3, `${l}:${e.company}`);
});
```
Run: `npm test -w apps/profile` → FAIL(package 不存在;先建 package.json 再跑會 FAIL 於 dist/json 不存在)

- [ ] **Step 2: package / config**

`apps/profile/package.json`:
```json
{
  "name": "@shunzz/profile",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build && node ../../scripts/check-content.mjs",
    "check": "astro check",
    "preview": "astro preview",
    "test": "node --test test/*.test.mjs",
    "check:content": "node ../../scripts/check-content.mjs",
    "og": "node ../../scripts/gen-og.mjs --out public/og.png --eyebrow profile.shunzz.com --l1 \"Chan Shun-Chih\" --l2 \"AI-Native Software Engineer\" --sub \"Résumé · Python · Azure · React · MCP · JLPT N1\""
  },
  "dependencies": {
    "@astrojs/sitemap": "^3.7.3",
    "@shunzz/ui": "*",
    "astro": "^7.2.0",
    "zod": "^4.5.4"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.0",
    "typescript": "^5.9.0"
  }
}
```
(版本以 `apps/brand/package.json` 實際值為準,複製過來。)

`apps/profile/astro.config.mjs`:
```js
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
```
`apps/profile/tsconfig.json`:複製 brand 的。
`public/favicon.svg`:複製 brand 的。
`public/robots.txt`:
```
User-agent: *
Allow: /
Sitemap: https://profile.shunzz.com/sitemap-index.xml
```
`public/_headers`:複製 brand 的。
`public/og.png`:先複製 brand 的(Task 4 重新產生)。

- [ ] **Step 3: schema 與 loader**

`apps/profile/src/content/schema.ts`:
```ts
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
```
`apps/profile/src/content/load.ts`:
```ts
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
```

- [ ] **Step 4: 中文內容 `src/content/zh/resume.json`**

```json
{
  "meta": {
    "title": "詹舜智 Chan Shun-Chih — AI-Native Software Engineer 履歷",
    "description": "詹舜智的履歷:AI-Native Software Engineer · Senior Systems Analyst。以規格驅動 + AI Agent 工作流交付企業級系統、ML 模型、雲端 IaC 與 AI 產品。Python · Azure · React · MCP · JLPT N1。",
    "name": "詹舜智 (Chan Shun-Chih)",
    "jobTitle": "AI-Native Software Engineer · Senior Systems Analyst"
  },
  "nav": {
    "links": [
      { "label": "經歷", "href": "#experience" },
      { "label": "專案", "href": "#side-projects" },
      { "label": "技能", "href": "#skills" },
      { "label": "個人品牌站", "href": "https://shunzz.com", "rel": "me" }
    ],
    "switchLang": "English",
    "toggleTheme": "切換深淺色",
    "primaryNav": "主選單",
    "skipToContent": "跳到主要內容"
  },
  "labels": {
    "positioning": "三層定位",
    "experience": "工作經歷",
    "sideProjects": "Side Projects 與技術貢獻",
    "skills": "技術棧",
    "education": "學歷",
    "languages": "語言能力",
    "contact": "聯絡",
    "print": "列印 / 存成 PDF",
    "backToBrand": "回 shunzz.com"
  },
  "header": {
    "name": "詹舜智",
    "latinName": "Chan Shun-Chih",
    "title": "AI-Native Software Engineer · Senior Systems Analyst",
    "location": "台北,台灣",
    "contacts": [
      { "label": "m23568n@gmail.com", "href": "mailto:m23568n@gmail.com" },
      { "label": "github.com/m124578n", "href": "https://github.com/m124578n", "rel": "me" },
      { "label": "LinkedIn", "href": "https://www.linkedin.com/in/john19980215/", "rel": "me" },
      { "label": "Threads @m23568n", "href": "https://www.threads.net/@m23568n", "rel": "me" }
    ],
    "summary": "4 年 Python 後端與 AI 應用開發經驗。以 AI Agent(Claude Code、GitHub Copilot CLI)為核心的規格驅動開發流程(採用開源 superpowers 工作流並依專案調整),獨立完成企業級系統、ML 模型、雲端 IaC 到個人產品的全端交付;並將此工作流程制度化(內部技術分享、含 evals 的可複用 Claude Skills)、工具化(自建 MCP Gateway 作為公司 AI 基礎設施)。曾從零主導 2 款 AI 影片生成產品,服務 7,000+ 名使用者,將月基礎設施成本由 $40K 降至 $20K、失敗率由 30% 降至 1% 以下。JLPT N1。"
  },
  "positioning": [
    { "title": "用 AI 交付產品", "body": "企業級專案 + side projects,速度與品質有 git 紀錄佐證:2.5 個月獨立交付配貨平台、3 天上線 MCP Gateway、1 天完成 62 個測試的應用。" },
    { "title": "管理 AI 的方法論", "body": "spec 先行、TDD、自動化 AI code review 迴圈、prompt 治理;共用 AGENTS.md 同時駕馭 Claude Code 與 Copilot CLI。" },
    { "title": "為 AI 造工具", "body": "自建 MCP Gateway、撰寫含 evals 的 Claude Agent Skills、加上專案專用 skills(如 Azure DevOps PR 流程),並對內推廣。" }
  ],
  "experience": [
    {
      "company": "零售集團 IT 子公司",
      "role": "Senior Systems Analyst(AI 應用工程師 / 高級系統分析師)",
      "period": "2026/05 – 現在",
      "location": "台北",
      "intro": "負責雲端架構規劃與 AI 應用開發,橫跨 Cloud Architecture、DevOps、Data Engineering 與 AI 產品開發。",
      "groups": [
        {
          "name": "零售配貨標準化平台(主力專案)",
          "bullets": [
            "以 AI 協作開發於 2.5 個月內獨立交付企業級零售配貨/配量系統(約 1,100+ 檔案),大量投入需求訪談,依各門市銷售數據與特殊需求設計配貨邏輯",
            "後端 Python 3.12 / FastAPI / SQLAlchemy 2 / Alembic / PostgreSQL,分層架構(api / core / engine / etl / repositories / services);前端 React 19 + TypeScript / Vite / TanStack Query·Table·Virtual / react-hook-form + zod / Tailwind 4",
            "Contract-first:openapi.json → openapi-typescript 自動生成前端型別,確保前後端契約同步",
            "CI/CD:Azure Pipelines,PR 觸發後端 pytest 與前端 lint/test/build 平行 job;後端 8 個測試模組、前端 56 個測試檔、UAT smoke 測試",
            "需求對齊:先以單檔 HTML prototype 讓需求方提前預覽並回饋,再進正式開發,大幅縮短「規格文件 → 開發 → 驗收」週期;完整文件紀律(decisions / lessons / runbooks / roadmap)"
          ]
        },
        {
          "name": "配量預測 ML 模型",
          "bullets": [
            "店鋪配量/配率預測:LightGBM、CatBoost、Optuna 超參數調校、isotonic calibration",
            "系統化實驗流程:baseline → 特徵工程 → ablation study → 模型 blending → 規則覆蓋層 → 誤配診斷;交付 ML 配量規劃草案、ER model 與 table schema"
          ]
        },
        {
          "name": "企業級 CDP(Customer Data Platform,6 repos / 2,200+ 檔案)",
          "bullets": [
            "前端 React 19 + TS + TanStack Router/Query、.NET 8 Web API、.NET 8 批次系統(含單元測試);SQL Server 多 schema + Azure Synapse 倉儲(CTAS / HASH-distributed 優化)",
            "AI API:Python 3.13 + FastAPI + Google ADK agent pipeline + LiteLLM → Azure OpenAI;商品標籤自動分類(自 legacy 服務遷移)、三階段 pipeline 生成行銷文案;嚴謹 API 契約(四種狀態碼、per-user rate limiting、「誠實失敗、不做 fallback」)",
            "每個 repo 三環境(dev/test/prod)Azure DevOps pipeline;產出 incident 記錄、架構追查手冊等維運文件"
          ]
        },
        {
          "name": "MCP Gateway(自建 AI 基礎設施)",
          "bullets": [
            "將公司內部 HTTP API 統一封裝為 MCP tools,讓 Claude Code / Codex / Copilot 經單一入口安全存取內部系統;工具目錄存 DB,審核後即時上線、免改碼免重啟",
            "安全設計:per-client Bearer token 授權、SSRF 防護(拒絕 localhost/雲端 metadata + 允許清單)、上游憑證 Fernet 加密、稽核記錄含敏感參數遮罩",
            "Python 3.12 / MCP SDK(Streamable HTTP)/ Starlette / SQLAlchemy 2 / Streamlit 管理後台;20+ 測試檔含 acceptance test(pytest-asyncio + respx);3 天完成 v1 上線"
          ]
        },
        {
          "name": "Log 異常分析系統",
          "bullets": [
            "Gradio 介面兩層過濾大量 log → Azure OpenAI 分析異常 → SQLite 存檔;嚴格三層解耦(filter / ai / db);送 AI 前先做 token 預估與費用試算,超閾值警告"
          ]
        },
        {
          "name": "企業聊天機器人產品部署工程",
          "bullets": [
            "企業聊天機器人產品(Java/JSP/Kotlin,700+ 檔)原始碼治理與 Docker 化:Compose 整合 MSSQL 2022、Redis Stack、Solr 9.5、自製 parser;DB 初始化、健康檢查、全新 VM 部署 SOP;git filter-repo 清理歷史、Git LFS 管理大檔"
          ]
        },
        {
          "name": "Azure IaC 與資料工程",
          "bullets": [
            "Bicep 模組化 IaC(network / keyvault / storage / postgres / appservice):IP 白名單 + Private Endpoint 雙路徑、Key Vault 集中機密、VNet Integration + RBAC,含 rollback 文件",
            "Dify(開源 LLM 平台)on Azure Container Apps 部署(PostgreSQL + pgvector / Redis / Storage,含成本估算);Terraform 管理 LLM 資源群組;ADF pipeline 分析與設計(自動訂貨 / 庫存 / 銷售預測)、ML pipeline retry/webhook 設計"
          ]
        },
        {
          "name": "AI 工程方法論(制度化與推廣)",
          "bullets": [
            "以共用 AGENTS.md 同時駕馭 Claude Code 與 Copilot CLI 雙 agent,於企業專案實戰;git worktree 平行開發多分支",
            "導入並營運 agent skill 工具鏈(開源 superpowers 工作流),建立自動化 AI code review 迴圈(AI 修 code → commit → 回覆 review thread → 觸發再審,直到收斂)",
            "將團隊 domain 知識封裝為含 evals 的 Claude Skills(Azure Synapse 效能調校、ADF 開發標準),並加上專案專用 skills(如 Azure DevOps PR 流程)",
            "對內技術分享:「需求 → AI 快速 prototype → 使用者對齊 → 正式開發」工作流(14 頁大綱 + 講稿 + 4 張流程圖),隨附 5 個去專案化可複用 skills"
          ]
        }
      ],
      "bullets": [],
      "stack": ["Python", "FastAPI", "React 19", "TypeScript", ".NET 8", "PostgreSQL", "SQL Server", "Azure Synapse", "Azure Data Factory", "Azure Container Apps", "Bicep", "Terraform", "Google ADK", "Azure OpenAI", "MCP", "LightGBM", "CatBoost", "Azure Pipelines", "Claude Code", "GitHub Copilot CLI"]
    },
    {
      "company": "OSENSE Technology(光禾感知科技)",
      "role": "Software Engineer(AI Application Engineer)",
      "period": "2024/05 – 2025/12",
      "location": "台北",
      "bullets": [
        "主導開發 OVideo——AI 驅動的內容轉影片平台,服務 1,800+ 名使用者;含會員系統、訂閱機制、金流串接與 Azure 雲端部署",
        "規劃並建構完整影片生成 pipeline:整合 LLM(GPT-4、Claude、Gemini)進行內容分析、腳本生成與圖文配對;FFmpeg 影片處理、字幕疊加與編碼優化;異步任務設計 + Server-Sent Events 即時回報進度",
        "效能與成本優化:流程拆分並行,平均影片生成時間 30 分鐘 → 15 分鐘(-50%);調整架構與 Azure 服務,月基礎設施成本 $40,000 → $20,000(-50%);Serverless 架構將承載能力由 10 人擴展至 100+ 併發;累計處理 1,100+ 部影片",
        "導入 Clean Architecture,新功能開發時間縮短 50%;設計 PostgreSQL / MongoDB 混合資料庫架構支援高併發",
        "開發 Osense AI——基於 LINE 的 AI 分身與聲音克隆系統(5,400+ 名使用者):整合 lip-sync、voice cloning,實作 LINE Bot 完整使用者流程;透過優化開源軟體錯誤與錯誤處理,失敗率 30% → <1%",
        "以 Gradio 與基礎前端框架快速開發 PoC 供客戶展示;導入 AI 工具加速開發"
      ],
      "stack": ["FastAPI", "Celery", "PostgreSQL", "MongoDB", "Azure (VM, Container Apps)", "Docker", "FFmpeg", "Wav2Lip", "TTS (Azure Speech, ElevenLabs)"]
    },
    {
      "company": "忠訓國際(Jung Shing International)",
      "role": "Software Engineer(後端工程師)",
      "period": "2022/07 – 2024/04",
      "location": "台北",
      "bullets": [
        "使用 Django 開發內部網站系統,依需求訪談設計資料表,規劃 API 與流程拆分;Django + jQuery 前後端整合並結合 GitLab CI/CD",
        "使用 Selenium 與 Requests 開發並維護爬蟲腳本,優化既有爬蟲效能與反爬應對",
        "開發 PDF 帳單資料擷取工具,自動抓取關鍵欄位寫入資料庫,將人工輸入簡化為欄位檢查",
        "導入 GitLab 版本控制與基礎開發流程;以 Repository Pattern 分離資料存取邏輯"
      ],
      "stack": ["Python", "Django", "Selenium", "Requests", "GitLab CI", "jQuery", "Linux"]
    }
  ],
  "sideProjects": [
    {
      "name": "Career Agent — AI 求職助手",
      "period": "2026/06 – 進行中",
      "desc": "上傳履歷 → AI 診斷 → 爬取職缺 → 語意層契合度排序(分數 + 理由 + 缺少技能)→ 客製求職信 → 應徵追蹤;含雲端多人版與地端個人助理兩套架構。FastAPI + MongoDB + Claude API + Playwright;React + TS + Mantine;3 天 73 commits,Threads 介紹貼文瀏覽破萬、有真實使用者。全程以 Claude Code + superpowers 的 agentic 工作流完成:我負責需求、架構、任務拆解與審查。",
      "links": [
        { "label": "Live", "href": "https://career-agent-at2.pages.dev" },
        { "label": "GitHub", "href": "https://github.com/m124578n/career_agent" }
      ]
    },
    {
      "name": "酸脆 — Threads AI 吐槽產生器",
      "period": "2026",
      "desc": "病毒式成長迴圈設計(分享解鎖隱藏風格);TypeScript npm workspaces monorepo:React 前端、Cloudflare Workers + Hono + KV、爬取層可抽換(自架 GraphQL 爬蟲 / 第三方 API fallback);四個 package 各有 vitest 測試;內建反捏造與人身攻擊護欄。1 天 67 commits。",
      "links": []
    },
    {
      "name": "每日工作紀錄系統",
      "period": "2026",
      "desc": "Flask + SQLAlchemy;完整 spec-driven 流程(design spec → implementation plan → TDD),約 2,100 行、62 個測試、單日完成。",
      "links": []
    },
    {
      "name": "iThome 鐵人賽 2023:Django 原始碼深度解析",
      "period": "2023/09 – 2023/10",
      "desc": "30 天系列文章,從常用 command 與 API 出發,追蹤 Django 接收 request 的流程、ORM 與資料庫互動、Middleware 等內部機制。",
      "links": [{ "label": "Blog", "href": "https://m124578n.github.io" }]
    },
    {
      "name": "其他",
      "desc": "中央氣象署未公開 API 逆向爬蟲(颱風暴風圈機率)、Text-to-SQL 實驗(Vanna + Wren Engine 語意層)、個人 RAG agent(chromadb);Hexo 個人技術部落格 56+ 篇。",
      "links": []
    }
  ],
  "skills": [
    { "group": "語言", "items": ["Python(主力)", "TypeScript", "C# / .NET 8", "SQL(SQL Server / Synapse / PostgreSQL)", "Bicep / Terraform"] },
    { "group": "後端", "items": ["FastAPI", "Flask", "Django", "Starlette", "Hono", "SQLAlchemy 2 + Alembic", "Celery", "async(asyncio / asyncpg / motor)", "RESTful API", "SSE / WebSocket"] },
    { "group": "前端", "items": ["React 18/19 + TS", "Vite", "TanStack(Query / Table / Router / Virtual)", "Tailwind", "zod", "Mantine"] },
    { "group": "AI / LLM", "items": ["Claude API", "Azure OpenAI", "GPT-4 / Gemini", "Google ADK", "LiteLLM", "MCP(自建 server)", "RAG / chromadb", "Prompt Engineering", "Claude Skills + evals", "FFmpeg / Wav2Lip / TTS", "token 成本控制"] },
    { "group": "雲端 / DevOps", "items": ["Azure(DevOps Pipelines、Bicep、Terraform、Synapse、Data Factory、Container Apps、Key Vault、Private Endpoint)", "Cloudflare(Workers / Pages / KV)", "Docker", "Git LFS / git worktree", "GitLab CI", "uv / ruff"] },
    { "group": "ML", "items": ["LightGBM", "CatBoost", "Optuna", "scikit-learn"] },
    { "group": "爬蟲", "items": ["Playwright", "Selenium", "Requests / curl_cffi", "BeautifulSoup", "反爬應對"] },
    { "group": "測試 / 架構", "items": ["pytest(asyncio / respx)", "vitest + Testing Library", "xUnit", "TDD", "UAT smoke / acceptance tests", "Clean Architecture", "Repository Pattern", "Design Patterns"] }
  ],
  "education": [
    { "school": "資策會(勞動力發展署)AI 雲端網頁應用開發養成班", "degree": "全職密集訓練 6 個月", "period": "2021/12 – 2022/05" },
    { "school": "文藻外語大學", "degree": "日本語文學系 學士", "period": "2016/09 – 2020/06" }
  ],
  "languages": [
    { "name": "中文", "level": "母語" },
    { "name": "日文", "level": "JLPT N1(聽/讀/寫 精通,說 中等)" },
    { "name": "英文", "level": "技術文件讀寫,Dev.to / 英文 spec 撰寫" }
  ],
  "footer": {
    "email": "m23568n@gmail.com",
    "note": "本頁支援列印;按 Ctrl/⌘ + P 即可存成 PDF。"
  }
}
```

- [ ] **Step 5: 英文內容 `src/content/en/resume.json`**

```json
{
  "meta": {
    "title": "Chan Shun-Chih — AI-Native Software Engineer Résumé",
    "description": "Résumé of Chan Shun-Chih (shunzz): AI-Native Software Engineer · Senior Systems Analyst shipping enterprise systems, ML models, cloud IaC and AI products with a spec-driven AI-agent workflow. Python · Azure · React · MCP · JLPT N1.",
    "name": "Chan Shun-Chih (詹舜智)",
    "jobTitle": "AI-Native Software Engineer · Senior Systems Analyst"
  },
  "nav": {
    "links": [
      { "label": "Experience", "href": "#experience" },
      { "label": "Projects", "href": "#side-projects" },
      { "label": "Skills", "href": "#skills" },
      { "label": "Brand site", "href": "https://shunzz.com", "rel": "me" }
    ],
    "switchLang": "中文",
    "toggleTheme": "Toggle theme",
    "primaryNav": "Primary",
    "skipToContent": "Skip to content"
  },
  "labels": {
    "positioning": "Three layers",
    "experience": "Experience",
    "sideProjects": "Side projects & contributions",
    "skills": "Tech stack",
    "education": "Education",
    "languages": "Languages",
    "contact": "Contact",
    "print": "Print / save as PDF",
    "backToBrand": "Back to shunzz.com"
  },
  "header": {
    "name": "Chan Shun-Chih",
    "latinName": "詹舜智 · shunzz",
    "title": "AI-Native Software Engineer · Senior Systems Analyst",
    "location": "Taipei, Taiwan",
    "contacts": [
      { "label": "m23568n@gmail.com", "href": "mailto:m23568n@gmail.com" },
      { "label": "github.com/m124578n", "href": "https://github.com/m124578n", "rel": "me" },
      { "label": "LinkedIn", "href": "https://www.linkedin.com/in/john19980215/", "rel": "me" },
      { "label": "Threads @m23568n", "href": "https://www.threads.net/@m23568n", "rel": "me" }
    ],
    "summary": "Four years of Python backend and AI application engineering. I specialize in spec-driven development with AI agents (Claude Code, GitHub Copilot CLI; the open-source superpowers workflow, tuned per project), independently delivering enterprise systems, ML models, cloud IaC and consumer products — then institutionalizing the workflow through internal talks, reusable Claude Skills with evals, and a self-built MCP Gateway serving as company-wide AI infrastructure. Previously led two AI video-generation products from zero to 7,000+ users, halving monthly infrastructure cost ($40K → $20K) and cutting failure rate from 30% to under 1%. JLPT N1."
  },
  "positioning": [
    { "title": "Ship products with AI", "body": "Enterprise projects and side projects, with speed and quality in the git history: an allocation platform in 2.5 months, an MCP Gateway live in 3 days, a 62-test app in one day." },
    { "title": "Manage how AI works", "body": "Spec first, TDD, an automated AI code-review loop, prompt governance; one shared AGENTS.md driving both Claude Code and Copilot CLI." },
    { "title": "Build tools for AI", "body": "A self-built MCP Gateway, Claude Agent Skills with evals, project-specific skills (e.g. an Azure DevOps PR flow) — and internal advocacy." }
  ],
  "experience": [
    {
      "company": "IT subsidiary of a retail group",
      "role": "Senior Systems Analyst (AI Application Engineer)",
      "period": "May 2026 – present",
      "location": "Taipei",
      "intro": "Cloud architecture and AI application development across cloud architecture, DevOps, data engineering and AI products.",
      "groups": [
        {
          "name": "Retail allocation platform (primary project)",
          "bullets": [
            "Independently delivered an enterprise retail allocation platform (1,100+ files) in 2.5 months with AI collaboration; heavy requirements interviews, allocation logic designed from per-store sales data and special cases",
            "Backend Python 3.12 / FastAPI / SQLAlchemy 2 / Alembic / PostgreSQL in a layered architecture (api / core / engine / etl / repositories / services); frontend React 19 + TypeScript / Vite / TanStack Query·Table·Virtual / react-hook-form + zod / Tailwind 4",
            "Contract-first: openapi.json → openapi-typescript generates frontend types, keeping both sides in sync",
            "CI/CD on Azure Pipelines: PRs run backend pytest and frontend lint/test/build in parallel; 8 backend test modules, 56 frontend test files, UAT smoke tests",
            "Requirement alignment via single-file HTML prototypes that stakeholders preview before real development, cutting the spec → build → acceptance cycle; disciplined docs (decisions / lessons / runbooks / roadmap)"
          ]
        },
        {
          "name": "Demand-allocation ML models",
          "bullets": [
            "Store-level allocation forecasting with LightGBM, CatBoost, Optuna tuning and isotonic calibration",
            "Systematic pipeline: baseline → feature engineering → ablation → blending → rules overlay → misallocation diagnosis; delivered ML allocation plan draft, ER model and table schema"
          ]
        },
        {
          "name": "Enterprise Customer Data Platform (6 repos / 2,200+ files)",
          "bullets": [
            "React 19 + TS + TanStack Router/Query frontend, .NET 8 Web API, .NET 8 batch system with unit tests; SQL Server multi-schema design + Azure Synapse warehouse (CTAS / HASH-distributed tuning)",
            "AI API: Python 3.13 + FastAPI + Google ADK agent pipeline + LiteLLM → Azure OpenAI; automated product tagging (migrated from a legacy service) and a 3-stage marketing-copy pipeline; strict API contract (four status codes, per-user rate limiting, fail-honestly-no-fallback)",
            "Three environments (dev/test/prod) per repo on Azure DevOps pipelines; incident records and architecture runbooks"
          ]
        },
        {
          "name": "MCP Gateway (self-built AI infrastructure)",
          "bullets": [
            "Wraps internal HTTP APIs as MCP tools so Claude Code / Codex / Copilot reach internal systems through one secure entry point; tool catalog in DB, approved tools go live without code changes or restarts",
            "Security: per-client Bearer auth, SSRF protection (blocks localhost/cloud metadata + allowlist), Fernet-encrypted upstream credentials, audit logs with sensitive-parameter masking",
            "Python 3.12 / MCP SDK (Streamable HTTP) / Starlette / SQLAlchemy 2 / Streamlit admin; 20+ test files incl. acceptance tests (pytest-asyncio + respx); v1 live in 3 days"
          ]
        },
        {
          "name": "Log anomaly analysis",
          "bullets": [
            "Gradio UI with two-stage filtering of large logs → Azure OpenAI analysis → SQLite; strict three-layer decoupling (filter / ai / db); token and cost estimation before each AI call with threshold warnings"
          ]
        },
        {
          "name": "Enterprise chatbot product deployment",
          "bullets": [
            "Source governance and dockerization of an enterprise chatbot product (Java/JSP/Kotlin, 700+ files): Compose with MSSQL 2022, Redis Stack, Solr 9.5, custom parser; DB init, health checks, fresh-VM deployment SOP; git filter-repo history cleanup, Git LFS"
          ]
        },
        {
          "name": "Azure IaC & data engineering",
          "bullets": [
            "Modular Bicep IaC (network / keyvault / storage / postgres / appservice): IP allowlist + Private Endpoint dual path, Key Vault secrets, VNet Integration + RBAC, rollback docs",
            "Dify (open-source LLM platform) on Azure Container Apps (PostgreSQL + pgvector / Redis / Storage, with cost estimate); Terraform for LLM resource groups; ADF pipeline analysis and design (auto-ordering / inventory / sales forecasting), ML pipeline retry/webhook design"
          ]
        },
        {
          "name": "AI engineering methodology (institutionalized)",
          "bullets": [
            "One shared AGENTS.md driving Claude Code and Copilot CLI on enterprise projects; git worktree for parallel branches",
            "Adopted and operated the agent-skill toolchain (open-source superpowers workflow) and built an automated AI code-review loop (AI fixes → commit → replies to review thread → re-review until it converges)",
            "Packaged team domain knowledge as Claude Skills with evals (Azure Synapse tuning, ADF standards) plus project-specific skills (e.g. an Azure DevOps PR flow)",
            "Internal tech talk on the requirement → AI prototype → user alignment → build workflow (14-page outline, script, 4 diagrams) with 5 reusable de-projectized skills"
          ]
        }
      ],
      "bullets": [],
      "stack": ["Python", "FastAPI", "React 19", "TypeScript", ".NET 8", "PostgreSQL", "SQL Server", "Azure Synapse", "Azure Data Factory", "Azure Container Apps", "Bicep", "Terraform", "Google ADK", "Azure OpenAI", "MCP", "LightGBM", "CatBoost", "Azure Pipelines", "Claude Code", "GitHub Copilot CLI"]
    },
    {
      "company": "OSENSE Technology",
      "role": "Software Engineer (AI Application Engineer)",
      "period": "May 2024 – Dec 2025",
      "location": "Taipei",
      "bullets": [
        "Led OVideo, an AI-driven content-to-video platform serving 1,800+ users, incl. membership, subscriptions, payment integration and Azure deployment",
        "Designed the full video-generation pipeline: LLMs (GPT-4, Claude, Gemini) for content analysis, scripting and image-text matching; FFmpeg for processing, subtitles and encoding; async tasks with Server-Sent Events progress",
        "Performance and cost: parallelized the pipeline to cut average generation time from 30 to 15 minutes (-50%); re-architected Azure services to halve monthly infrastructure cost ($40,000 → $20,000); serverless architecture scaled capacity from 10 to 100+ concurrent users; 1,100+ videos processed",
        "Introduced Clean Architecture, cutting new-feature development time by 50%; designed a PostgreSQL / MongoDB hybrid for high concurrency",
        "Built Osense AI, a LINE-based AI avatar and voice-cloning system (5,400+ users): lip-sync and voice cloning, full LINE Bot user flows; fixed upstream open-source bugs and error handling to cut failure rate from 30% to under 1%",
        "Rapid PoCs with Gradio and light frontends for client demos; introduced AI tooling to speed up development"
      ],
      "stack": ["FastAPI", "Celery", "PostgreSQL", "MongoDB", "Azure (VM, Container Apps)", "Docker", "FFmpeg", "Wav2Lip", "TTS (Azure Speech, ElevenLabs)"]
    },
    {
      "company": "Jung Shing International",
      "role": "Software Engineer (Backend)",
      "period": "Jul 2022 – Apr 2024",
      "location": "Taipei",
      "bullets": [
        "Built internal web systems with Django: table design from requirements interviews, API and flow planning; Django + jQuery integration with GitLab CI/CD",
        "Developed and maintained scrapers with Selenium and Requests; optimized existing scrapers and anti-bot handling",
        "Built a PDF invoice extraction tool that captures key fields into the database, reducing manual entry to a field check",
        "Introduced GitLab version control and a basic development process; applied the Repository Pattern to isolate data access"
      ],
      "stack": ["Python", "Django", "Selenium", "Requests", "GitLab CI", "jQuery", "Linux"]
    }
  ],
  "sideProjects": [
    {
      "name": "Career Agent — AI job-search assistant",
      "period": "Jun 2026 – ongoing",
      "desc": "Upload résumé → AI diagnosis → crawl listings → semantic fit ranking (score + reasons + missing skills) → tailored cover letters → application tracking; cloud multi-user and local personal-assistant architectures. FastAPI + MongoDB + Claude API + Playwright; React + TS + Mantine; 73 commits in 3 days, 10K+ views on the launch post, real users. Built end-to-end with the Claude Code + superpowers agentic workflow: I owned requirements, architecture, task breakdown and review.",
      "links": [
        { "label": "Live", "href": "https://career-agent-at2.pages.dev" },
        { "label": "GitHub", "href": "https://github.com/m124578n/career_agent" }
      ]
    },
    {
      "name": "Suancui (酸脆) — Threads AI roast generator",
      "period": "2026",
      "desc": "Viral-loop design (share to unlock hidden styles); TypeScript npm-workspaces monorepo: React frontend, Cloudflare Workers + Hono + KV, swappable scraping layer (self-hosted GraphQL crawler / third-party API fallback); four packages each with vitest tests; anti-fabrication and anti-harassment guardrails. 67 commits in one day.",
      "links": []
    },
    {
      "name": "Daily work-log system",
      "period": "2026",
      "desc": "Flask + SQLAlchemy; full spec-driven flow (design spec → implementation plan → TDD), ~2,100 lines, 62 tests, built in one day.",
      "links": []
    },
    {
      "name": "iThome Ironman 2023: Django source-code deep dive",
      "period": "Sep – Oct 2023",
      "desc": "A 30-day series tracing Django internals from everyday commands and APIs into request handling, the ORM and middleware.",
      "links": [{ "label": "Blog", "href": "https://m124578n.github.io" }]
    },
    {
      "name": "Other",
      "desc": "Reverse-engineered an undocumented Central Weather Administration API (typhoon storm-radius probability); Text-to-SQL experiments (Vanna + Wren Engine semantic layer); personal RAG agent (chromadb); 56+ posts on a Hexo tech blog.",
      "links": []
    }
  ],
  "skills": [
    { "group": "Languages", "items": ["Python (primary)", "TypeScript", "C# / .NET 8", "SQL (SQL Server / Synapse / PostgreSQL)", "Bicep / Terraform"] },
    { "group": "Backend", "items": ["FastAPI", "Flask", "Django", "Starlette", "Hono", "SQLAlchemy 2 + Alembic", "Celery", "async (asyncio / asyncpg / motor)", "RESTful API", "SSE / WebSocket"] },
    { "group": "Frontend", "items": ["React 18/19 + TS", "Vite", "TanStack (Query / Table / Router / Virtual)", "Tailwind", "zod", "Mantine"] },
    { "group": "AI / LLM", "items": ["Claude API", "Azure OpenAI", "GPT-4 / Gemini", "Google ADK", "LiteLLM", "MCP (self-built server)", "RAG / chromadb", "Prompt engineering", "Claude Skills + evals", "FFmpeg / Wav2Lip / TTS", "Token cost control"] },
    { "group": "Cloud / DevOps", "items": ["Azure (DevOps Pipelines, Bicep, Terraform, Synapse, Data Factory, Container Apps, Key Vault, Private Endpoint)", "Cloudflare (Workers / Pages / KV)", "Docker", "Git LFS / git worktree", "GitLab CI", "uv / ruff"] },
    { "group": "ML", "items": ["LightGBM", "CatBoost", "Optuna", "scikit-learn"] },
    { "group": "Scraping", "items": ["Playwright", "Selenium", "Requests / curl_cffi", "BeautifulSoup", "Anti-bot handling"] },
    { "group": "Testing / architecture", "items": ["pytest (asyncio / respx)", "vitest + Testing Library", "xUnit", "TDD", "UAT smoke / acceptance tests", "Clean Architecture", "Repository Pattern", "Design patterns"] }
  ],
  "education": [
    { "school": "Workforce Development Agency — AI Cloud Web Application Development Program", "degree": "Full-time intensive, 6 months", "period": "Dec 2021 – May 2022" },
    { "school": "Wenzao Ursuline University of Languages", "degree": "B.A. in Japanese", "period": "Sep 2016 – Jun 2020" }
  ],
  "languages": [
    { "name": "Chinese", "level": "Native" },
    { "name": "Japanese", "level": "JLPT N1 (listening/reading/writing advanced, speaking intermediate)" },
    { "name": "English", "level": "Technical reading and writing; Dev.to articles and English specs" }
  ],
  "footer": {
    "email": "m23568n@gmail.com",
    "note": "This page is print-friendly — press Ctrl/⌘ + P to save as PDF."
  }
}
```

- [ ] **Step 6: 最小頁面**

`apps/profile/src/pages/index.astro`:
```astro
---
import BaseLayout from '@shunzz/ui/components/BaseLayout.astro';
import { loadResume } from '../content/load';
const locale = 'zh-hant' as const;
const r = loadResume(locale);
---
<BaseLayout {locale} title={r.meta.title} description={r.meta.description} name={r.meta.name} jobTitle={r.meta.jobTitle} nav={r.nav}>
  <section class="container"><h1>{r.header.name}</h1></section>
</BaseLayout>
```
`en/index.astro` 同,`locale = 'en'`、import 路徑 `../../content/load`。

- [ ] **Step 7: 安裝、GREEN**

Run: `npm install && npm run build && npm test && npm run check`
Expected: 兩個 app 皆 build 成功;profile 6 tests PASS;brand 全綠。

- [ ] **Step 8: Commit**

```bash
git add apps/profile package-lock.json
git -c user.name=shunzz -c user.email=m23568n@gmail.com commit -m "feat(profile): scaffold résumé site with bilingual content and schema"
```

---

### Task 3: 履歷 sections 與列印樣式

**Files:**
- Create: `apps/profile/src/styles/resume.css`, `apps/profile/src/components/ResumeHeader.astro`, `Positioning.astro`, `Experience.astro`, `SideProjects.astro`, `Skills.astro`, `Education.astro`, `ResumeFooter.astro`
- Modify: `apps/profile/src/pages/index.astro`, `en/index.astro`, `test/dist.test.mjs`

**Interfaces:** 每個元件 props 為 `Resume` 的對應子物件 + `labels`(見下);`ResumeFooter` 額外吃 `locale`,以 `slot="footer"` 渲染於 `<main>` 外。

- [ ] **Step 1: 測試(RED)**

追加到 `apps/profile/test/dist.test.mjs`:
```js
test('履歷 sections 與 landmark', () => {
  const zh = html('index.html');
  for (const id of ['experience', 'side-projects', 'skills', 'education']) assert.match(zh, new RegExp(`id="${id}"`), id);
  assert.match(zh, /<h1[^>]*>詹舜智<\/h1>/);
  assert.match(zh, /OSENSE Technology/);
  assert.match(zh, /忠訓國際/);
  assert.match(zh, /<\/main>[\s\S]*<footer/);
  assert.match(zh, /mailto:m23568n@gmail\.com/);
  assert.match(zh, /@media print/);
  assert.match(zh, /<button[^>]*data-print/);
});
test('en 履歷內容', () => {
  const en = html('en/index.html');
  assert.match(en, /Jung Shing International/);
  assert.match(en, /Retail allocation platform/);
});
```

- [ ] **Step 2: resume.css**

`apps/profile/src/styles/resume.css`:
```css
.resume { --measure: 78ch; }
.resume .section { padding-block: var(--space-5); }
.resume h2 { font-size: 1.25rem; letter-spacing: .02em; text-transform: uppercase; font-family: var(--font-mono); color: var(--fg-muted); margin-bottom: var(--space-3); }
.resume h3 { font-size: 1.05rem; margin: 0; }
.resume ul { padding-left: 1.1em; margin: .3em 0 0; }
.resume li + li { margin-top: .35em; }
.resume p { max-width: var(--measure); }
.meta { font-family: var(--font-mono); font-size: .8rem; color: var(--fg-muted); }
.row { display: flex; justify-content: space-between; gap: var(--space-3); flex-wrap: wrap; align-items: baseline; }
.tags { display: flex; flex-wrap: wrap; gap: .35em; margin-top: var(--space-2); }
.entry + .entry { margin-top: var(--space-5); padding-top: var(--space-4); border-top: 1px dashed var(--line); }
.group + .group { margin-top: var(--space-3); }
.group h4 { margin: 0 0 .2em; font-size: .95rem; }
.print-btn { font: inherit; }

@media print {
  :root { --bg: #fff; --bg-elev: #fff; --fg: #000; --fg-muted: #444; --line: #bbb; --accent: #000; }
  @page { size: A4; margin: 14mm; }
  html { font-size: 11pt; }
  .site-header, .skip-link, .print-btn, .theme-toggle, .lang, .no-print { display: none !important; }
  .resume .section { padding-block: 8pt; border-top: none; break-inside: avoid-page; }
  .entry, .group, article { break-inside: avoid; }
  a { color: #000; text-decoration: none; }
  a[href^="http"]::after { content: " (" attr(href) ")"; font-size: 8.5pt; color: #444; }
  a[href^="mailto:"]::after { content: ""; }
  .tag { border-color: #999; }
}
```

- [ ] **Step 3: 元件**

`ResumeHeader.astro`:
```astro
---
import type { Resume } from '../content/schema';
interface Props { header: Resume['header']; labels: Resume['labels'] }
const { header, labels } = Astro.props;
---
<header class="container resume-header">
  <div class="row">
    <div>
      <h1>{header.name}</h1>
      <p class="latin">{header.latinName}</p>
    </div>
    <button type="button" class="btn print-btn" data-print>{labels.print}</button>
  </div>
  <p class="title">{header.title} · <span class="meta">{header.location}</span></p>
  <ul class="contacts">
    {header.contacts.map((c) => <li><a href={c.href} rel={c.rel}>{c.label}</a></li>)}
  </ul>
  <p class="summary">{header.summary}</p>
</header>
<style>
  .resume-header { padding-block: var(--space-5) var(--space-3); }
  h1 { font-size: clamp(2rem, 5vw, 2.8rem); margin-bottom: 0; }
  .latin { font-family: var(--font-mono); color: var(--fg-muted); margin: 0; }
  .title { font-weight: 600; margin-top: var(--space-2); }
  .contacts { list-style: none; padding: 0; margin: 0 0 var(--space-3); display: flex; flex-wrap: wrap; gap: .4em 1.2em; font-size: .95rem; }
  .summary { font-size: 1.02rem; }
</style>
<script>
  document.querySelectorAll('[data-print]').forEach((b) => b.addEventListener('click', () => window.print()));
</script>
```
`Positioning.astro`:
```astro
---
import type { Resume } from '../content/schema';
interface Props { items: Resume['positioning']; heading: string }
const { items, heading } = Astro.props;
---
<section id="positioning" class="section container">
  <h2>{heading}</h2>
  <ol class="three">
    {items.map((p) => <li><h3>{p.title}</h3><p>{p.body}</p></li>)}
  </ol>
</section>
<style>
  .three { list-style: none; padding: 0; margin: 0; display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); counter-reset: n; }
  .three li { padding: var(--space-3); border: 1px solid var(--line); border-radius: var(--radius); background: var(--bg-elev); }
  .three li::before { counter-increment: n; content: "0" counter(n); font-family: var(--font-mono); color: var(--accent); display: block; margin-bottom: .3em; }
  .three p { margin: .3em 0 0; font-size: .95rem; color: var(--fg-muted); }
</style>
```
`Experience.astro`:
```astro
---
import type { Resume } from '../content/schema';
interface Props { items: Resume['experience']; heading: string }
const { items, heading } = Astro.props;
---
<section id="experience" class="section container">
  <h2>{heading}</h2>
  {items.map((e) => (
    <article class="entry">
      <div class="row">
        <h3>{e.company} <span class="role">— {e.role}</span></h3>
        <span class="meta">{e.period} · {e.location}</span>
      </div>
      {e.intro && <p class="intro">{e.intro}</p>}
      {e.groups?.map((g) => (
        <div class="group">
          <h4>{g.name}</h4>
          <ul>{g.bullets.map((b) => <li>{b}</li>)}</ul>
        </div>
      ))}
      {e.bullets.length > 0 && <ul>{e.bullets.map((b) => <li>{b}</li>)}</ul>}
      <ul class="tags">{e.stack.map((s) => <li class="tag">{s}</li>)}</ul>
    </article>
  ))}
</section>
<style>
  .role { font-weight: 400; color: var(--fg-muted); }
  .intro { color: var(--fg-muted); margin-top: .3em; }
  .tags { list-style: none; padding: 0; }
</style>
```
`SideProjects.astro`:
```astro
---
import type { Resume } from '../content/schema';
interface Props { items: Resume['sideProjects']; heading: string }
const { items, heading } = Astro.props;
---
<section id="side-projects" class="section container">
  <h2>{heading}</h2>
  {items.map((p) => (
    <article class="entry">
      <div class="row"><h3>{p.name}</h3>{p.period && <span class="meta">{p.period}</span>}</div>
      <p>{p.desc}</p>
      {p.links.length > 0 && <p class="links">{p.links.map((l) => <a href={l.href} rel="noopener">{l.label} <span aria-hidden="true">↗</span></a>)}</p>}
    </article>
  ))}
</section>
<style>
  .entry + .entry { margin-top: var(--space-4); padding-top: var(--space-3); }
  .links { display: flex; gap: var(--space-3); }
</style>
```
`Skills.astro`:
```astro
---
import type { Resume } from '../content/schema';
interface Props { items: Resume['skills']; heading: string }
const { items, heading } = Astro.props;
---
<section id="skills" class="section container">
  <h2>{heading}</h2>
  <dl class="skills">
    {items.map((g) => (
      <div class="skill-row">
        <dt>{g.group}</dt>
        <dd><ul class="tags">{g.items.map((s) => <li class="tag">{s}</li>)}</ul></dd>
      </div>
    ))}
  </dl>
</section>
<style>
  .skills { margin: 0; display: grid; gap: var(--space-2); }
  .skill-row { display: grid; grid-template-columns: 9rem 1fr; gap: var(--space-3); align-items: start; }
  dt { font-family: var(--font-mono); font-size: .85rem; color: var(--fg-muted); padding-top: .3em; }
  dd { margin: 0; }
  .tags { list-style: none; padding: 0; margin: 0; }
  @media (max-width: 40rem) { .skill-row { grid-template-columns: 1fr; gap: .3em; } }
</style>
```
`Education.astro`:
```astro
---
import type { Resume } from '../content/schema';
interface Props { education: Resume['education']; languages: Resume['languages']; labels: Resume['labels'] }
const { education, languages, labels } = Astro.props;
---
<section id="education" class="section container two">
  <div>
    <h2>{labels.education}</h2>
    {education.map((e) => (
      <div class="entry-sm">
        <div class="row"><h3>{e.school}</h3><span class="meta">{e.period}</span></div>
        <p class="meta">{e.degree}</p>
      </div>
    ))}
  </div>
  <div>
    <h2>{labels.languages}</h2>
    <dl class="langs">{languages.map((l) => (<div><dt>{l.name}</dt><dd>{l.level}</dd></div>))}</dl>
  </div>
</section>
<style>
  .two { display: grid; gap: var(--space-5); grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); }
  .entry-sm + .entry-sm { margin-top: var(--space-3); }
  .langs { margin: 0; display: grid; gap: .5em; }
  .langs div { display: grid; grid-template-columns: 5rem 1fr; gap: var(--space-2); }
  .langs dt { font-family: var(--font-mono); color: var(--fg-muted); font-size: .85rem; }
  .langs dd { margin: 0; }
</style>
```
`ResumeFooter.astro`:
```astro
---
import type { Resume } from '../content/schema';
import type { Locale } from '@shunzz/ui/i18n';
interface Props { footer: Resume['footer']; labels: Resume['labels']; locale: Locale }
const { footer, labels, locale } = Astro.props;
const year = new Date().getFullYear();
---
<footer id="contact" class="section container">
  <h2>{labels.contact}</h2>
  <p><a class="btn primary" href={`mailto:${footer.email}`}>{footer.email}</a></p>
  <p class="meta no-print">{footer.note}</p>
  <p class="meta">© {year} shunzz · <a href="https://shunzz.com" rel="me">{labels.backToBrand}</a> · <a href={locale === 'en' ? '/' : '/en/'}>{locale === 'en' ? '中文' : 'English'}</a></p>
</footer>
```

- [ ] **Step 4: 頁面組裝**

`index.astro`:
```astro
---
import BaseLayout from '@shunzz/ui/components/BaseLayout.astro';
import '../styles/resume.css';
import { loadResume } from '../content/load';
import ResumeHeader from '../components/ResumeHeader.astro';
import Positioning from '../components/Positioning.astro';
import Experience from '../components/Experience.astro';
import SideProjects from '../components/SideProjects.astro';
import Skills from '../components/Skills.astro';
import Education from '../components/Education.astro';
import ResumeFooter from '../components/ResumeFooter.astro';
const locale = 'zh-hant' as const;
const r = loadResume(locale);
---
<BaseLayout {locale} title={r.meta.title} description={r.meta.description} name={r.meta.name} jobTitle={r.meta.jobTitle} nav={r.nav}>
  <div class="resume">
    <ResumeHeader header={r.header} labels={r.labels} />
    <Positioning items={r.positioning} heading={r.labels.positioning} />
    <Experience items={r.experience} heading={r.labels.experience} />
    <SideProjects items={r.sideProjects} heading={r.labels.sideProjects} />
    <Skills items={r.skills} heading={r.labels.skills} />
    <Education education={r.education} languages={r.languages} labels={r.labels} />
  </div>
  <ResumeFooter slot="footer" footer={r.footer} labels={r.labels} {locale} />
</BaseLayout>
```
`en/index.astro` 同(`locale = 'en'`,import 路徑多一層 `../`)。
注意:`<footer>` 在 `.resume` 外、`<main>` 外;`@media print` 樣式因 `inlineStylesheets: 'always'` 會 inline 進 HTML(測試靠這點)。

- [ ] **Step 5: GREEN + 目視**

Run: `npm run build && npm test && npm run check` → 全綠。
`npm run dev:profile` → 開 http://localhost:4321/ 與 `/en/`;Ctrl+P 預覽列印:header nav/按鈕消失、白底、連結顯示網址、section 不被切半。375px 寬無水平捲軸。

- [ ] **Step 6: Commit**

```bash
git add apps/profile
git -c user.name=shunzz -c user.email=m23568n@gmail.com commit -m "feat(profile): résumé sections, compact layout, print stylesheet"
```

---

### Task 4: OG 圖、README、Lighthouse、跨站連結驗證

**Files:**
- Regenerate: `apps/profile/public/og.png`
- Modify: `README.md`, `apps/profile/test/dist.test.mjs`

- [ ] **Step 1: 測試(RED)**

追加:
```js
test('sitemap/robots/og', () => {
  assert.ok(existsSync(resolve(root, 'dist/sitemap-index.xml')));
  assert.match(html('robots.txt'), /Sitemap: https:\/\/profile\.shunzz\.com\/sitemap-index\.xml/);
  const buf = readFileSync(resolve(root, 'dist/og.png'));
  assert.equal(buf.readUInt32BE(16), 1200); assert.equal(buf.readUInt32BE(20), 630);
  assert.match(html('index.html'), /og:image" content="https:\/\/profile\.shunzz\.com\/og\.png"/);
});
```
(og.png 目前是 brand 的圖,尺寸相同故此測試會 PASS——改為先刪除 `apps/profile/public/og.png` 再跑,確認 FAIL,然後 Step 2 產生。)

- [ ] **Step 2: 產 OG、README**

Run: `npm run og -w apps/profile`
README 的表格與 Deploy 段加上:
```markdown
| `apps/profile` | profile.shunzz.com | v1 |
```
```markdown
- Project `shunzz-profile`:Build command `npm run build -w apps/profile`,Build output `apps/profile/dist`,Root directory `/`,`NODE_VERSION=24`,`FORBIDDEN_TERMS`。Custom domain `profile.shunzz.com`。
- 兩站互連:brand nav「專業履歷版」→ profile;profile nav/footer → shunzz.com。
- `npm run dev:profile` 本機開發 profile 站。
```

- [ ] **Step 3: Lighthouse**

同 brand 的做法(headless Chrome,mobile)對 profile 的 `/` 與 `/en/` 跑,目標四項 ≥ 95;不達標則修 CSS/markup(不動文案、不加依賴)。把分數寫進 commit body。

- [ ] **Step 4: GREEN + Commit**

Run: `npm run build && npm test && npm run check`
```bash
git add apps/profile README.md
git -c user.name=shunzz -c user.email=m23568n@gmail.com commit -m "feat(profile): OG image, README deploy docs; lighthouse pass"
```

---

## Self-Review

- **Spec coverage**:§10.1 架構(T1 泛用化與腳本、T2 app)、§10.2 七個區塊(T3;Header 含聯絡列與 Summary、三層定位、經歷含 groups、Side Projects、技術棧、教育與語言、Footer)、§10.3 緊湊與 print(T3)、§10.4 SEO/保密/測試(T2 SEO 測試、T4 sitemap/og、掃描沿用)、§10.5 部署文件(T4)。跨站連結:brand nav links(T1)與 profile footer(T3)。
- **Placeholder scan**:無 TBD;`period` 已從 PDF 填入實際日期。
- **Type consistency**:`loadResume`/`Resume`、`labels` 欄位名(`positioning/experience/sideProjects/skills/education/languages/contact/print/backToBrand`)在 schema、JSON、元件一致;`nav.links` 形狀在 ui/brand/profile 一致;`data-print` 在元件與測試一致;section id `experience/side-projects/skills/education` 與 nav href、測試一致。
- **保密**:內容中現職為「零售集團 IT 子公司」、票證平台寫「零售配貨標準化平台」、聊天機器人產品不寫代號;無手機/地址/年齡/薪資。
