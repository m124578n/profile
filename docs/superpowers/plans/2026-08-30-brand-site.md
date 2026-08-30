# shunzz.com Brand Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建好 monorepo 骨架與 `apps/brand`(shunzz.com)單頁雙語個人品牌站,可 build、可通過內容檢查、可部署到 Cloudflare Pages。

**Architecture:** npm workspaces monorepo;`packages/ui` 放共用 CSS tokens、Layout、SEO 元件與 i18n 工具;`apps/brand` 是 Astro 靜態站,內容存 `src/content/{zh,en}/site.json`,以 zod 驗證雙語結構一致,build 前掃禁用詞。測試用 Node 內建 `node:test` 對 `dist/` 輸出做斷言。

**Tech Stack:** Node 24、npm workspaces、Astro 7.x、@astrojs/sitemap、zod 4、sharp(產 OG 圖)、純 CSS、Google Fonts(Noto Sans TC + Inter + JetBrains Mono)。

**Spec:** `docs/superpowers/specs/2026-08-30-shunzz-sites-design.md`

## Global Constraints

- Node ≥ 24;Astro `^7`;`output: 'static'`;`site: 'https://shunzz.com'`;`compressHTML: true`(避免 v7 `'jsx'` 模式吃掉中英之間空白)。
- 語言路由:`/`(zh-Hant,無前綴)與 `/en/`;`i18n.defaultLocale: 'zh-hant'`, `locales: ['zh-hant','en']`, `routing.prefixDefaultLocale: false`。
- 不用 Tailwind、不用前端框架;客戶端 JS 僅 inline `<script>`:語言記憶、深淺色、hero 打字。
- 禁用詞(出現即 build 失敗):(清單見 private/forbidden-terms.txt,不進 repo)。
- 所有 HTML 標籤必須閉合(Astro 7 Rust compiler 嚴格)。
- 每頁唯一 `<h1>`;`<html lang>` 隨語言(`zh-Hant` / `en`)。
- 動畫尊重 `prefers-reduced-motion`。
- Commit 用 `git -c user.name=shunzz -c user.email=m23568n@gmail.com commit`(repo 未設全域 user)。
- 兩份素材 md 已在 `.gitignore`,絕不 `git add -f`。

---

## File Structure

```
package.json                         # workspaces + root scripts
packages/ui/package.json             # name: @shunzz/ui, exports ./styles/*, ./components/*, ./i18n
packages/ui/styles/tokens.css        # 色票、字體、間距變數,含 dark theme
packages/ui/styles/base.css          # reset、body、typography、section 共用
packages/ui/i18n.ts                  # Locale 型別、localePath()、htmlLang()
packages/ui/components/Seo.astro     # title/description/canonical/hreflang/OG/Twitter/JSON-LD
packages/ui/components/BaseLayout.astro
packages/ui/components/ThemeToggle.astro
packages/ui/components/LangSwitch.astro
apps/brand/package.json
apps/brand/astro.config.mjs
apps/brand/tsconfig.json
apps/brand/public/robots.txt
apps/brand/public/_headers
apps/brand/public/og.png             # 由 scripts/gen-og.mjs 產生
apps/brand/scripts/gen-og.mjs
apps/brand/scripts/check-content.mjs # 禁用詞掃描 src/content + dist
apps/brand/src/content/schema.ts     # zod schema
apps/brand/src/content/zh/site.json
apps/brand/src/content/en/site.json
apps/brand/src/content/load.ts       # loadSite(locale) 驗證後回傳
apps/brand/src/components/Hero.astro
apps/brand/src/components/About.astro
apps/brand/src/components/Pillars.astro
apps/brand/src/components/Projects.astro
apps/brand/src/components/Proof.astro
apps/brand/src/components/Footer.astro
apps/brand/src/pages/index.astro     # zh
apps/brand/src/pages/en/index.astro
apps/brand/test/content.test.mjs     # schema 與雙語一致
apps/brand/test/dist.test.mjs        # build 輸出 SEO/結構斷言
.github/workflows/ci.yml
README.md
```

---

### Task 1: Monorepo 骨架與可 build 的 Astro 站

**Files:**
- Create: `package.json`, `packages/ui/package.json`, `apps/brand/package.json`, `apps/brand/astro.config.mjs`, `apps/brand/tsconfig.json`, `apps/brand/src/pages/index.astro`, `apps/brand/src/pages/en/index.astro`, `apps/brand/test/dist.test.mjs`

**Interfaces:**
- Produces: root scripts `npm run build`(= build brand)、`npm test`;`apps/brand/dist/index.html` 與 `dist/en/index.html`。

- [ ] **Step 1: 寫 dist 測試(先失敗)**

`apps/brand/test/dist.test.mjs`:
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

test('html lang 隨語言', () => {
  assert.match(html('index.html'), /<html[^>]*lang="zh-Hant"/);
  assert.match(html('en/index.html'), /<html[^>]*lang="en"/);
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `node --test apps/brand/test/`
Expected: FAIL(dist 不存在)

- [ ] **Step 3: 建 root package.json**

`package.json`:
```json
{
  "name": "shunzz-sites",
  "private": true,
  "type": "module",
  "workspaces": ["apps/*", "packages/*"],
  "engines": { "node": ">=24" },
  "scripts": {
    "dev": "npm run dev -w apps/brand",
    "build": "npm run build -w apps/brand",
    "test": "npm run test -w apps/brand",
    "check": "npm run check -w apps/brand"
  }
}
```

- [ ] **Step 4: 建 packages/ui**

`packages/ui/package.json`:
```json
{
  "name": "@shunzz/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./styles/*": "./styles/*",
    "./components/*": "./components/*",
    "./i18n": "./i18n.ts"
  }
}
```
先建空目錄 `packages/ui/styles`、`packages/ui/components`,並放 `packages/ui/i18n.ts`:
```ts
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
```

- [ ] **Step 5: 建 apps/brand**

`apps/brand/package.json`:
```json
{
  "name": "@shunzz/brand",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "check": "astro check",
    "preview": "astro preview",
    "test": "node --test test/"
  },
  "dependencies": {
    "@shunzz/ui": "*",
    "astro": "^7.2.0"
  }
}
```

`apps/brand/astro.config.mjs`:
```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://shunzz.com',
  output: 'static',
  compressHTML: true,
  i18n: {
    defaultLocale: 'zh-hant',
    locales: ['zh-hant', 'en'],
    routing: { prefixDefaultLocale: false },
  },
});
```

`apps/brand/tsconfig.json`:
```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*", "../../packages/ui/**/*"],
  "exclude": ["dist"]
}
```

`apps/brand/src/pages/index.astro`:
```astro
---
import { htmlLang } from '@shunzz/ui/i18n';
---
<html lang={htmlLang('zh-hant')}>
  <head><meta charset="utf-8" /><title>shunzz</title></head>
  <body><h1>shunzz</h1></body>
</html>
```

`apps/brand/src/pages/en/index.astro`:
```astro
---
import { htmlLang } from '@shunzz/ui/i18n';
---
<html lang={htmlLang('en')}>
  <head><meta charset="utf-8" /><title>shunzz</title></head>
  <body><h1>shunzz</h1></body>
</html>
```

- [ ] **Step 6: 安裝並 build**

Run: `npm install && npm run build`
Expected: `apps/brand/dist/index.html`、`dist/en/index.html` 存在,無錯誤。

- [ ] **Step 7: 跑測試**

Run: `npm test`
Expected: 2 tests PASS

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json packages apps
git -c user.name=shunzz -c user.email=m23568n@gmail.com commit -m "feat: monorepo scaffold with astro brand app"
```

---

### Task 2: 內容 schema、雙語 JSON、載入器

**Files:**
- Create: `apps/brand/src/content/schema.ts`, `apps/brand/src/content/load.ts`, `apps/brand/src/content/zh/site.json`, `apps/brand/src/content/en/site.json`, `apps/brand/test/content.test.mjs`
- Modify: `apps/brand/package.json`(加 zod)

**Interfaces:**
- Produces: `loadSite(locale: Locale): Site`,`Site` 型別如 schema。後續 section 元件全部只吃 `Site` 的子物件。

- [ ] **Step 1: 寫內容測試(先失敗)**

`apps/brand/test/content.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const load = (l) => JSON.parse(readFileSync(resolve(root, `src/content/${l}/site.json`), 'utf8'));

function shape(v) {
  if (Array.isArray(v)) return `[${v.length}:${v.length ? shape(v[0]) : ''}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${k}:${shape(v[k])}`).join(',')}}`;
  return typeof v;
}

test('zh 與 en 內容結構一致(key 與陣列長度)', () => {
  assert.equal(shape(load('zh')), shape(load('en')));
});

test('每個 project 有 name/tagline/tags/stats', () => {
  for (const l of ['zh', 'en']) {
    for (const p of load(l).projects.items) {
      assert.ok(p.name && p.tagline && p.tags.length && p.stats.length, `${l}:${p.name}`);
    }
  }
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm test`
Expected: FAIL(找不到 site.json)

- [ ] **Step 3: 安裝 zod 並寫 schema**

Run: `npm install zod@^4 -w apps/brand`

`apps/brand/src/content/schema.ts`:
```ts
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
    projects: z.string(),
    about: z.string(),
    contact: z.string(),
    profileSite: z.string(),
    switchLang: z.string(),
    toggleTheme: z.string(),
  }),
  hero: z.object({
    headline: z.string(),
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
    email: z.string().email(),
    note: z.string(),
  }),
});

export type Site = z.infer<typeof siteSchema>;
```

- [ ] **Step 4: 寫載入器**

`apps/brand/src/content/load.ts`:
```ts
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
```

- [ ] **Step 5: 寫中文內容**

`apps/brand/src/content/zh/site.json`:
```json
{
  "meta": {
    "title": "shunzz — Build with AI. Ship for real.",
    "description": "文組轉工程的 Senior Systems Analyst。用「規格驅動 + AI Agent」工作流獨立交付企業級系統、ML 模型與雲端基礎設施;寫 Claude Skills、建 MCP Gateway。",
    "name": "shunzz",
    "jobTitle": "Senior Systems Analyst · AI-Native Software Engineer"
  },
  "nav": {
    "projects": "專案",
    "about": "關於我",
    "contact": "聯絡",
    "profileSite": "專業履歷版",
    "switchLang": "English",
    "toggleTheme": "切換深淺色"
  },
  "hero": {
    "headline": "Build with AI. Ship for real.",
    "sub": "規格驅動 × AI Agent × 全端交付。我不只用 AI 寫 code——我管理 AI 的工作流程,也為 AI 造工具。",
    "primaryCta": { "label": "看精選專案", "href": "#projects" },
    "secondaryCta": { "label": "GitHub", "href": "https://github.com/m124578n" }
  },
  "about": {
    "heading": "關於我",
    "short": "文組轉工程、JLPT N1 的 Senior Systems Analyst。用「規格驅動 + AI Agent」的工作流獨立交付企業級系統、ML 模型與雲端基礎設施;寫 Claude Skills、建 MCP Gateway、對內推廣 AI 開發方法論。相信 AI 時代的工程師價值在於判斷與流程設計,而不是打字速度。",
    "acts": [
      {
        "title": "第一幕:非典型起點",
        "body": "文藻日文系畢業、JLPT N1。職涯從語言開始,經資策會半年 AI/雲端養成班轉入工程,先在新創做 AI 應用(內容轉影片平台、LINE avatar 與語音克隆),現於零售集團 IT 子公司擔任 Senior Systems Analyst,橫跨 Data Engineering、DevOps、Cloud Architecture。"
      },
      {
        "title": "第二幕:AI 改變了我做事的方式",
        "body": "過去一年,我把開發流程重構成「規格驅動 + AI Agent 執行」:需求 → brainstorm → design spec → implementation plan → TDD 實作。AI 負責執行、我負責審查與決策。用這套流程,我獨立交付了企業級配貨平台(2.5 個月)、CDP 的 AI 服務、demand-forecasting ML 模型,也在 3 天內做出公司的 MCP Gateway、1 天做出有 62 個測試的完整應用。每個數字都在 git 歷史裡。"
      },
      {
        "title": "第三幕:從使用者變成建設者",
        "body": "我不只使用 AI 工具——我把團隊 domain 知識封裝成含 evals 的 Claude Skills、建了讓全公司 AI 工具安全存取內部 API 的 gateway、做內部技術分享推廣這套工作流。下一步:做出能真正影響世界的產品。"
      }
    ],
    "readMore": "讀完整的故事"
  },
  "pillars": {
    "heading": "我怎麼工作",
    "items": [
      {
        "title": "用 AI 交付產品",
        "points": [
          "企業級零售配貨平台,2.5 個月獨立交付",
          "AI 求職助手 Career Agent,3 天上線、有真實使用者",
          "Flask 每日工作紀錄系統,1 天、62 個測試"
        ]
      },
      {
        "title": "管理 AI 的方法論",
        "points": [
          "規格驅動:brainstorm → spec → plan → TDD",
          "共用 AGENTS.md 同時駕馭 Claude Code 與 Copilot CLI",
          "自動化 AI code review 迴圈,直到收斂"
        ]
      },
      {
        "title": "為 AI 造工具",
        "points": [
          "自建 MCP Gateway:內部 API 統一封裝為 MCP tools",
          "把 domain 知識寫成含 evals 的 Claude Skills",
          "對內技術分享,推廣 prototype 驅動的需求對齊"
        ]
      }
    ]
  },
  "projects": {
    "heading": "精選專案",
    "flipHint": "翻面看數字",
    "items": [
      {
        "name": "Career Agent",
        "tagline": "AI 求職助手:上傳履歷 → AI 診斷 → 自動爬職缺 → 契合度排序 → 客製求職信",
        "story": "做它是為了讓別人能用工具解決自己的問題。上線後 Threads 介紹貼文瀏覽破萬,有真實使用者。",
        "tags": ["FastAPI", "MongoDB", "Playwright", "Claude API", "React", "TypeScript"],
        "stats": [
          { "value": "3 天", "label": "上線" },
          { "value": "73", "label": "commits" },
          { "value": "10K+", "label": "貼文瀏覽" }
        ],
        "links": [
          { "label": "Live", "href": "https://career-agent-at2.pages.dev" },
          { "label": "GitHub", "href": "https://github.com/m124578n/career_agent" }
        ],
        "featured": true
      },
      {
        "name": "酸脆",
        "tagline": "Threads AI 吐槽產生器:輸入帳號 → 四風格吐槽圖卡 → 分享解鎖隱藏風格",
        "story": "產品思維與失敗學習:發現 Threads 反爬會回 200 但內容閹割、導致 AI 捏造人格,於是把「不捏造」寫進產品鐵律。上線後觸及不如 Career Agent——工具解決真問題,比娛樂產品更會傳播。",
        "tags": ["Cloudflare Workers", "Hono", "KV", "React", "npm workspaces"],
        "stats": [
          { "value": "1 天", "label": "上線" },
          { "value": "67", "label": "commits" },
          { "value": "4", "label": "packages 各有測試" }
        ],
        "links": [],
        "featured": false
      },
      {
        "name": "MCP Gateway",
        "tagline": "把企業內部 API 統一封裝成 MCP tools,讓各家 AI coding agent 經單一入口安全存取",
        "story": "設計重點:per-client 授權、SSRF 防護、上游憑證加密、稽核記錄含敏感參數遮罩。工具目錄存 DB,審核後即時上線、免改碼免重啟。",
        "tags": ["Python", "MCP SDK", "Starlette", "SQLAlchemy", "pytest"],
        "stats": [
          { "value": "3 天", "label": "v1 上線" },
          { "value": "20+", "label": "測試檔" }
        ],
        "links": [],
        "featured": false
      },
      {
        "name": "企業級交付",
        "tagline": "零售配貨平台、CDP AI 服務、需求預測 ML 模型、Azure IaC",
        "story": "在零售集團 IT 子公司以 AI 協作獨立交付:2.5 個月的配貨平台(FastAPI + React 19)、Google ADK pipeline 的 CDP AI 服務、LightGBM/CatBoost 配量模型、Bicep 模組化基礎設施。",
        "tags": ["FastAPI", "React 19", ".NET 8", "Google ADK", "Azure", "Bicep", "LightGBM"],
        "stats": [
          { "value": "2.5 月", "label": "配貨平台" },
          { "value": "1,100+", "label": "檔案" },
          { "value": "6", "label": "CDP repos" }
        ],
        "links": [],
        "featured": false
      }
    ]
  },
  "proof": {
    "heading": "足跡",
    "items": [
      { "label": "GitHub", "value": "m124578n", "href": "https://github.com/m124578n" },
      { "label": "Blog", "value": "56+ 篇,含 30 天寫作挑戰", "href": "https://m124578n.github.io" },
      { "label": "Dev.to", "value": "週更 Azure 系列", "href": "https://dev.to/m124578n" },
      { "label": "Threads", "value": "@m23568n", "href": "https://www.threads.net/@m23568n" },
      { "label": "語言", "value": "中文 · 英文 · 日文(JLPT N1)" }
    ]
  },
  "footer": {
    "contact": "聯絡我",
    "email": "m23568n@gmail.com",
    "note": "這個網站用 Astro 做,部署在 Cloudflare Pages——當然,也是跟 AI 一起做的。"
  }
}
```

- [ ] **Step 6: 寫英文內容**

`apps/brand/src/content/en/site.json`:
```json
{
  "meta": {
    "title": "shunzz — Build with AI. Ship for real.",
    "description": "Senior Systems Analyst who ships with AI agents: spec-driven development, enterprise systems, ML models, cloud IaC, Claude Skills and an MCP Gateway.",
    "name": "shunzz",
    "jobTitle": "Senior Systems Analyst · AI-Native Software Engineer"
  },
  "nav": {
    "projects": "Projects",
    "about": "About",
    "contact": "Contact",
    "profileSite": "Résumé site",
    "switchLang": "中文",
    "toggleTheme": "Toggle theme"
  },
  "hero": {
    "headline": "Build with AI. Ship for real.",
    "sub": "Spec-driven × AI agents × full-stack delivery. I don't just use AI to write code — I manage how AI works, and I build tools for it.",
    "primaryCta": { "label": "See featured projects", "href": "#projects" },
    "secondaryCta": { "label": "GitHub", "href": "https://github.com/m124578n" }
  },
  "about": {
    "heading": "About",
    "short": "Japanese Literature major turned Senior Systems Analyst (JLPT N1). I ship enterprise systems, ML models and cloud infrastructure with a spec-driven, AI-agent workflow; I write Claude Skills, built an MCP Gateway, and teach the workflow internally. In the AI era an engineer's value is judgment and process design, not typing speed.",
    "acts": [
      {
        "title": "Act 1: An unusual start",
        "body": "Japanese Literature degree, JLPT N1. My career began with language; a six-month AI/cloud bootcamp moved me into engineering. I built AI applications at a startup (content-to-video, LINE avatars and voice cloning) and now work as a Senior Systems Analyst at a retail group's IT subsidiary, spanning data engineering, DevOps and cloud architecture."
      },
      {
        "title": "Act 2: AI changed how I work",
        "body": "Over the past year I rebuilt my workflow around spec-driven development with AI agents: requirements → brainstorm → design spec → implementation plan → TDD. AI executes; I review and decide. With it I independently delivered an enterprise allocation platform (2.5 months), the AI service of a Customer Data Platform, demand-forecasting ML models, a company MCP Gateway in 3 days, and a full app with 62 tests in one day. Every number is in the git history."
      },
      {
        "title": "Act 3: From user to builder",
        "body": "I don't just use AI tools — I package team domain knowledge as Claude Skills with evals, built the gateway that lets every AI tool in the company reach internal APIs safely, and teach the workflow in internal talks. Next: build something that actually matters."
      }
    ],
    "readMore": "Read the full story"
  },
  "pillars": {
    "heading": "How I work",
    "items": [
      {
        "title": "Ship products with AI",
        "points": [
          "Enterprise retail allocation platform, delivered solo in 2.5 months",
          "Career Agent, an AI job-search assistant, live in 3 days with real users",
          "A Flask daily-log system in one day, 62 tests"
        ]
      },
      {
        "title": "Manage how AI works",
        "points": [
          "Spec-driven: brainstorm → spec → plan → TDD",
          "One shared AGENTS.md driving Claude Code and Copilot CLI",
          "Automated AI code-review loop until it converges"
        ]
      },
      {
        "title": "Build tools for AI",
        "points": [
          "Self-built MCP Gateway wrapping internal APIs as MCP tools",
          "Domain knowledge packaged as Claude Skills with evals",
          "Internal talks on prototype-driven requirement alignment"
        ]
      }
    ]
  },
  "projects": {
    "heading": "Featured projects",
    "flipHint": "Flip for numbers",
    "items": [
      {
        "name": "Career Agent",
        "tagline": "AI job-search assistant: upload résumé → AI diagnosis → auto-crawl listings → fit ranking → tailored cover letters",
        "story": "Built so others could solve their own problem with a tool. The launch post on Threads passed 10K views and it has real users.",
        "tags": ["FastAPI", "MongoDB", "Playwright", "Claude API", "React", "TypeScript"],
        "stats": [
          { "value": "3 days", "label": "to launch" },
          { "value": "73", "label": "commits" },
          { "value": "10K+", "label": "post views" }
        ],
        "links": [
          { "label": "Live", "href": "https://career-agent-at2.pages.dev" },
          { "label": "GitHub", "href": "https://github.com/m124578n/career_agent" }
        ],
        "featured": true
      },
      {
        "name": "Suancui (酸脆)",
        "tagline": "Threads AI roast generator: enter a handle → four roast styles as share cards → share to unlock hidden styles",
        "story": "Product thinking and a lesson in failure: Threads' anti-scraping returned 200 with gutted content, so the AI fabricated personalities. \"Never fabricate\" became a product rule. It spread less than Career Agent — tools that solve real problems travel further than entertainment.",
        "tags": ["Cloudflare Workers", "Hono", "KV", "React", "npm workspaces"],
        "stats": [
          { "value": "1 day", "label": "to launch" },
          { "value": "67", "label": "commits" },
          { "value": "4", "label": "packages, each tested" }
        ],
        "links": [],
        "featured": false
      },
      {
        "name": "MCP Gateway",
        "tagline": "Wraps internal enterprise APIs as MCP tools so any AI coding agent reaches them safely through one entry point",
        "story": "Design focus: per-client auth, SSRF protection, encrypted upstream credentials, audit logs with sensitive-parameter masking. Tool catalog lives in a DB — approved tools go live without code changes or restarts.",
        "tags": ["Python", "MCP SDK", "Starlette", "SQLAlchemy", "pytest"],
        "stats": [
          { "value": "3 days", "label": "to v1" },
          { "value": "20+", "label": "test files" }
        ],
        "links": [],
        "featured": false
      },
      {
        "name": "Enterprise delivery",
        "tagline": "Retail allocation platform, CDP AI service, demand-forecasting ML, Azure IaC",
        "story": "Delivered solo with AI collaboration at a retail group's IT subsidiary: a 2.5-month allocation platform (FastAPI + React 19), a CDP AI service on a Google ADK pipeline, LightGBM/CatBoost allocation models, and modular Bicep infrastructure.",
        "tags": ["FastAPI", "React 19", ".NET 8", "Google ADK", "Azure", "Bicep", "LightGBM"],
        "stats": [
          { "value": "2.5 mo", "label": "allocation platform" },
          { "value": "1,100+", "label": "files" },
          { "value": "6", "label": "CDP repos" }
        ],
        "links": [],
        "featured": false
      }
    ]
  },
  "proof": {
    "heading": "Footprints",
    "items": [
      { "label": "GitHub", "value": "m124578n", "href": "https://github.com/m124578n" },
      { "label": "Blog", "value": "56+ posts incl. a 30-day writing challenge", "href": "https://m124578n.github.io" },
      { "label": "Dev.to", "value": "Weekly Azure series", "href": "https://dev.to/m124578n" },
      { "label": "Threads", "value": "@m23568n", "href": "https://www.threads.net/@m23568n" },
      { "label": "Languages", "value": "Chinese · English · Japanese (JLPT N1)" }
    ]
  },
  "footer": {
    "contact": "Get in touch",
    "email": "m23568n@gmail.com",
    "note": "Built with Astro, deployed on Cloudflare Pages — and yes, built together with AI."
  }
}
```

- [ ] **Step 7: 跑測試**

Run: `npm test`
Expected: content 測試 PASS(dist 測試仍 PASS 因 Task 1 build 尚在;若 dist 已清除先 `npm run build`)

- [ ] **Step 8: 在頁面驗證載入器可用**

把 `apps/brand/src/pages/index.astro` 的 `<title>shunzz</title>` 改成:
```astro
---
import { htmlLang } from '@shunzz/ui/i18n';
import { loadSite } from '../content/load';
const site = loadSite('zh-hant');
---
<html lang={htmlLang('zh-hant')}>
  <head><meta charset="utf-8" /><title>{site.meta.title}</title></head>
  <body><h1>{site.hero.headline}</h1></body>
</html>
```
`en/index.astro` 同樣改為 `loadSite('en')`、`htmlLang('en')`、import 路徑 `../../content/load`。

Run: `npm run build && npm test`
Expected: build 成功,全部 PASS

- [ ] **Step 9: Commit**

```bash
git add apps/brand
git -c user.name=shunzz -c user.email=m23568n@gmail.com commit -m "feat(brand): bilingual content with zod schema"
```

---

### Task 3: 禁用詞掃描

**Files:**
- Create: `apps/brand/scripts/check-content.mjs`
- Modify: `apps/brand/package.json`(scripts)、`apps/brand/test/content.test.mjs`

**Interfaces:**
- Produces: `node scripts/check-content.mjs [dir...]`,預設掃 `src/content` 與 `dist`;命中回傳 exit 1 並列出檔案/行。`build` 腳本改為 `astro build && node scripts/check-content.mjs`。

- [ ] **Step 1: 寫測試(先失敗)**

在 `apps/brand/test/content.test.mjs` 追加:
```js
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('check-content 對乾淨內容 exit 0', () => {
  const r = spawnSync(process.execPath, ['scripts/check-content.mjs', 'src/content'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('check-content 命中禁用詞 exit 1', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cc-'));
  writeFileSync(join(dir, 'x.json'), '{"a":"(清單見 private/forbidden-terms.txt,不進 repo)"}');
  const r = spawnSync(process.execPath, ['scripts/check-content.mjs', dir], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /forbidden/i);
});
```

> 註(final review 修正後):實際測試改用 `FORBIDDEN_TERMS` 環境變數注入無害字串(如 `zzforbiddenzz`)而非硬編碼真實禁用詞,見 `apps/brand/test/content.test.mjs`。

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm test`
Expected: 兩個新測試 FAIL(script 不存在)

- [ ] **Step 3: 寫 script**

`apps/brand/scripts/check-content.mjs`:
```js
#!/usr/bin/env node
// 掃描公開內容與 build 輸出,命中保密紅線即失敗。
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

// 禁用詞清單不硬編碼:優先讀 env FORBIDDEN_TERMS(逗號分隔),
// 否則讀 repo-root 的 private/forbidden-terms.txt(gitignored);兩者皆無則 exit 1。
const FORBIDDEN = loadTerms();
const EXT = new Set(['.json', '.html', '.astro', '.md', '.ts', '.js', '.txt', '.xml']);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (EXT.has(extname(p))) yield p;
  }
}

const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['src/content', 'dist'];
let hits = 0;
for (const t of targets) {
  if (!existsSync(t)) continue;
  for (const file of walk(t)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const w of FORBIDDEN) {
        if (line.toLowerCase().includes(w.toLowerCase())) {
          console.error(`FORBIDDEN "${w}" at ${file}:${i + 1}`);
          hits++;
        }
      }
    });
  }
}
if (hits) { console.error(`\n${hits} forbidden term(s) found.`); process.exit(1); }
console.log('check-content: clean');
```

- [ ] **Step 4: 接進 build**

`apps/brand/package.json` scripts 改:
```json
"build": "astro build && node scripts/check-content.mjs",
"check:content": "node scripts/check-content.mjs"
```

- [ ] **Step 5: 跑測試**

Run: `npm run build && npm test`
Expected: build 尾端印 `check-content: clean`;全部 PASS

- [ ] **Step 6: Commit**

```bash
git add apps/brand
git -c user.name=shunzz -c user.email=m23568n@gmail.com commit -m "feat(brand): forbidden-term content check in build"
```

---

### Task 4: 設計 tokens、BaseLayout、SEO 元件

**Files:**
- Create: `packages/ui/styles/tokens.css`, `packages/ui/styles/base.css`, `packages/ui/components/Seo.astro`, `packages/ui/components/BaseLayout.astro`, `packages/ui/components/ThemeToggle.astro`, `packages/ui/components/LangSwitch.astro`
- Modify: `apps/brand/src/pages/index.astro`, `apps/brand/src/pages/en/index.astro`, `apps/brand/test/dist.test.mjs`

**Interfaces:**
- Produces:
  - `BaseLayout` props:`{ locale: Locale; title: string; description: string; name: string; jobTitle: string; nav: Site['nav'] }`,slot 為頁面主體(放在 `<main>` 內)。
  - `Seo` props:`{ locale: Locale; title: string; description: string; name: string; jobTitle: string }`。
  - `ThemeToggle` props `{ label: string }`;`LangSwitch` props `{ locale: Locale; label: string }`。
- 深淺色機制:`<html data-theme="light|dark">`,首次載入依 `prefers-color-scheme`,切換存 `localStorage.theme`。

- [ ] **Step 1: 擴充 dist 測試(先失敗)**

在 `apps/brand/test/dist.test.mjs` 追加:
```js
test('SEO: canonical、hreflang、OG、JSON-LD', () => {
  const zh = html('index.html');
  assert.match(zh, /<link rel="canonical" href="https:\/\/shunzz\.com\/"/);
  assert.match(zh, /hreflang="zh-Hant" href="https:\/\/shunzz\.com\/"/);
  assert.match(zh, /hreflang="en" href="https:\/\/shunzz\.com\/en\/"/);
  assert.match(zh, /hreflang="x-default" href="https:\/\/shunzz\.com\/"/);
  assert.match(zh, /<meta property="og:image" content="https:\/\/shunzz\.com\/og\.png"/);
  assert.match(zh, /<meta name="twitter:card" content="summary_large_image"/);
  assert.match(zh, /<script type="application\/ld\+json">[^<]*"@type":"Person"/);
  const en = html('en/index.html');
  assert.match(en, /<link rel="canonical" href="https:\/\/shunzz\.com\/en\/"/);
});

test('每頁恰好一個 h1', () => {
  for (const p of ['index.html', 'en/index.html']) {
    assert.equal((html(p).match(/<h1[\s>]/g) ?? []).length, 1, p);
  }
});

test('theme 初始化 script 在 head 內且不閃爍', () => {
  assert.match(html('index.html'), /<head>[\s\S]*data-theme[\s\S]*<\/head>/);
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm run build && npm test`
Expected: 新增三項 FAIL

- [ ] **Step 3: tokens.css**

`packages/ui/styles/tokens.css`:
```css
:root {
  --font-sans: "Inter", "Noto Sans TC", system-ui, -apple-system, "Segoe UI", "PingFang TC", "Microsoft JhengHei", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  --bg: #fbfaf7;
  --bg-elev: #ffffff;
  --fg: #1a1a1a;
  --fg-muted: #5f5f5a;
  --line: #e6e3dc;
  --accent: #e4572e;
  --accent-ink: #ffffff;

  --space-1: 0.25rem; --space-2: 0.5rem; --space-3: 1rem; --space-4: 1.5rem;
  --space-5: 2.5rem; --space-6: 4rem; --space-7: 6rem;
  --measure: 62ch;
  --radius: 10px;
  --shadow: 0 1px 2px rgb(0 0 0 / .05), 0 8px 24px rgb(0 0 0 / .06);
  --ease: cubic-bezier(.2,.7,.2,1);
}
:root[data-theme="dark"] {
  --bg: #111213;
  --bg-elev: #1a1b1d;
  --fg: #ececea;
  --fg-muted: #a3a39d;
  --line: #2a2b2e;
  --accent: #ff7a50;
  --accent-ink: #111213;
  --shadow: 0 1px 2px rgb(0 0 0 / .4), 0 8px 24px rgb(0 0 0 / .5);
}
```

- [ ] **Step 4: base.css**

`packages/ui/styles/base.css`:
```css
*, *::before, *::after { box-sizing: border-box; }
html { color-scheme: light; scroll-behavior: smooth; }
html[data-theme="dark"] { color-scheme: dark; }
body {
  margin: 0; background: var(--bg); color: var(--fg);
  font-family: var(--font-sans); font-size: 1.0625rem; line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}
img { max-width: 100%; display: block; }
a { color: inherit; text-decoration-color: var(--accent); text-underline-offset: .2em; }
a:hover { color: var(--accent); }
h1, h2, h3 { line-height: 1.2; letter-spacing: -.01em; margin: 0 0 var(--space-3); }
h1 { font-size: clamp(2.2rem, 6vw, 4rem); font-weight: 700; }
h2 { font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 600; }
h3 { font-size: 1.15rem; font-weight: 600; }
p { margin: 0 0 var(--space-3); max-width: var(--measure); }
.container { width: min(100% - 2 * var(--space-4), 68rem); margin-inline: auto; }
.section { padding-block: var(--space-6); border-top: 1px solid var(--line); }
.eyebrow { font-family: var(--font-mono); font-size: .8rem; color: var(--fg-muted); letter-spacing: .08em; text-transform: uppercase; }
.btn {
  display: inline-flex; align-items: center; gap: .5em; padding: .7em 1.2em; border-radius: 999px;
  border: 1px solid var(--line); background: var(--bg-elev); text-decoration: none; font-weight: 600;
  transition: transform .2s var(--ease), background .2s var(--ease);
}
.btn:hover { transform: translateY(-1px); }
.btn.primary { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.tag { font-family: var(--font-mono); font-size: .75rem; padding: .2em .6em; border: 1px solid var(--line); border-radius: 6px; color: var(--fg-muted); }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 5: Seo.astro**

`packages/ui/components/Seo.astro`:
```astro
---
import type { Locale } from '../i18n';
import { localePath, htmlLang, LOCALES } from '../i18n';

interface Props { locale: Locale; title: string; description: string; name: string; jobTitle: string }
const { locale, title, description, name, jobTitle } = Astro.props;

const site = Astro.site!;                                // https://shunzz.com/
const url = (l: Locale) => new URL(localePath(l), site).href;
const canonical = url(locale);
const ogImage = new URL('/og.png', site).href;

const jsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name,
  url: site.href,
  jobTitle,
  knowsLanguage: ['zh-Hant', 'en', 'ja'],
  sameAs: [
    'https://github.com/m124578n',
    'https://www.threads.net/@m23568n',
    'https://dev.to/m124578n',
    'https://m124578n.github.io',
  ],
});
---
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{title}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonical} />
{LOCALES.map((l) => <link rel="alternate" hreflang={htmlLang(l)} href={url(l)} />)}
<link rel="alternate" hreflang="x-default" href={url('zh-hant')} />
<meta property="og:type" content="website" />
<meta property="og:site_name" content={name} />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonical} />
<meta property="og:image" content={ogImage} />
<meta property="og:locale" content={locale === 'en' ? 'en_US' : 'zh_TW'} />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={ogImage} />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="sitemap" href="/sitemap-index.xml" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;600&family=Noto+Sans+TC:wght@400;500;700&display=swap" />
<script type="application/ld+json" set:html={jsonLd} />
```

- [ ] **Step 6: ThemeToggle 與 LangSwitch**

`packages/ui/components/ThemeToggle.astro`:
```astro
---
interface Props { label: string }
const { label } = Astro.props;
---
<button class="theme-toggle" type="button" aria-label={label} title={label} data-theme-toggle>
  <span class="sun" aria-hidden="true">☀</span><span class="moon" aria-hidden="true">☾</span>
</button>
<style>
  .theme-toggle {
    inline-size: 2.4rem; block-size: 2.4rem; border-radius: 999px; border: 1px solid var(--line);
    background: var(--bg-elev); cursor: pointer; position: relative; overflow: hidden; color: var(--fg);
  }
  .theme-toggle span { position: absolute; inset: 0; display: grid; place-items: center; transition: transform .4s var(--ease), opacity .3s; }
  .moon { transform: translateY(120%) rotate(-40deg); opacity: 0; }
  :global(html[data-theme="dark"]) .sun { transform: translateY(-120%) rotate(40deg); opacity: 0; }
  :global(html[data-theme="dark"]) .moon { transform: none; opacity: 1; }
</style>
<script>
  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch {}
    });
  });
</script>
```

`packages/ui/components/LangSwitch.astro`:
```astro
---
import type { Locale } from '../i18n';
import { localePath } from '../i18n';
interface Props { locale: Locale; label: string }
const { locale, label } = Astro.props;
const other: Locale = locale === 'en' ? 'zh-hant' : 'en';
---
<a class="lang" href={localePath(other)} hreflang={other === 'en' ? 'en' : 'zh-Hant'} data-lang-switch={other}>{label}</a>
<style>.lang { font-family: var(--font-mono); font-size: .85rem; text-decoration: none; border: 1px solid var(--line); border-radius: 999px; padding: .4em .9em; }</style>
<script>
  document.querySelectorAll<HTMLAnchorElement>('[data-lang-switch]').forEach((a) => {
    a.addEventListener('click', () => { try { localStorage.setItem('lang', a.dataset.langSwitch!); } catch {} });
  });
</script>
```

- [ ] **Step 7: BaseLayout.astro**

`packages/ui/components/BaseLayout.astro`:
```astro
---
import '../styles/tokens.css';
import '../styles/base.css';
import type { Locale } from '../i18n';
import { htmlLang } from '../i18n';
import Seo from './Seo.astro';
import ThemeToggle from './ThemeToggle.astro';
import LangSwitch from './LangSwitch.astro';

interface Props {
  locale: Locale; title: string; description: string; name: string; jobTitle: string;
  nav: { projects: string; about: string; contact: string; profileSite: string; switchLang: string; toggleTheme: string };
}
const { locale, title, description, name, jobTitle, nav } = Astro.props;
---
<html lang={htmlLang(locale)}>
  <head>
    <Seo {locale} {title} {description} {name} {jobTitle} />
    <script is:inline>
      (function () {
        try {
          var t = localStorage.getItem('theme');
          if (!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          document.documentElement.dataset.theme = t;
        } catch (e) { document.documentElement.dataset.theme = 'light'; }
      })();
    </script>
  </head>
  <body>
    <header class="site-header container">
      <a class="brand" href={locale === 'en' ? '/en/' : '/'}>{name}</a>
      <nav aria-label="primary">
        <a href="#projects">{nav.projects}</a>
        <a href="#about">{nav.about}</a>
        <a href="#contact">{nav.contact}</a>
        <a href="https://profile.shunzz.com" rel="me">{nav.profileSite}</a>
        <LangSwitch {locale} label={nav.switchLang} />
        <ThemeToggle label={nav.toggleTheme} />
      </nav>
    </header>
    <main><slot /></main>
  </body>
</html>
<style>
  .site-header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding-block: var(--space-4); flex-wrap: wrap; }
  .brand { font-family: var(--font-mono); font-weight: 600; text-decoration: none; }
  nav { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
  nav a { text-decoration: none; color: var(--fg-muted); }
  nav a:hover { color: var(--accent); }
</style>
```

- [ ] **Step 8: 頁面改用 BaseLayout,補 favicon 與 og 佔位**

`apps/brand/src/pages/index.astro`:
```astro
---
import BaseLayout from '@shunzz/ui/components/BaseLayout.astro';
import { loadSite } from '../content/load';
const locale = 'zh-hant' as const;
const site = loadSite(locale);
---
<BaseLayout {locale} title={site.meta.title} description={site.meta.description} name={site.meta.name} jobTitle={site.meta.jobTitle} nav={site.nav}>
  <section class="container"><h1>{site.hero.headline}</h1></section>
</BaseLayout>
```
`apps/brand/src/pages/en/index.astro` 同樣,`locale = 'en'`,import 路徑 `../../content/load`。

`apps/brand/public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#e4572e"/><text x="32" y="42" font-family="JetBrains Mono, monospace" font-size="30" font-weight="700" fill="#fff" text-anchor="middle">s_</text></svg>
```
暫時複製一張佔位 `apps/brand/public/og.png`(Task 7 會正式產生):`node -e "require('fs').writeFileSync('apps/brand/public/og.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==','base64'))"`

- [ ] **Step 9: build 與測試**

Run: `npm run build && npm test`
Expected: 全部 PASS

- [ ] **Step 10: Commit**

```bash
git add packages apps
git -c user.name=shunzz -c user.email=m23568n@gmail.com commit -m "feat(ui): tokens, BaseLayout, Seo, theme/lang controls"
```

---

### Task 5: Hero、About、Pillars sections

**Files:**
- Create: `apps/brand/src/components/Hero.astro`, `About.astro`, `Pillars.astro`
- Modify: `apps/brand/src/pages/index.astro`, `en/index.astro`, `test/dist.test.mjs`

**Interfaces:**
- `Hero` props `{ hero: Site['hero'] }`;`About` props `{ about: Site['about'] }`;`Pillars` props `{ pillars: Site['pillars'] }`。
- Hero 打字動畫:h1 內文字直接在 HTML 中(SEO 與無 JS 可讀),JS 只做「先隱藏再逐字顯示」;`prefers-reduced-motion` 時不動。

- [ ] **Step 1: 測試(先失敗)**

追加到 `dist.test.mjs`:
```js
test('hero/about/pillars 內容渲染', () => {
  const zh = html('index.html');
  assert.match(zh, /<h1[^>]*data-typewriter[^>]*>Build with AI\. Ship for real\.<\/h1>/);
  assert.match(zh, /id="about"/);
  assert.match(zh, /第一幕/);
  assert.match(zh, /用 AI 交付產品/);
  assert.match(zh, /為 AI 造工具/);
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm run build && npm test` → 新測試 FAIL

- [ ] **Step 3: Hero.astro**

```astro
---
import type { Site } from '../content/schema';
interface Props { hero: Site['hero'] }
const { hero } = Astro.props;
---
<section class="hero container">
  <p class="eyebrow">shunzz.com</p>
  <h1 data-typewriter>{hero.headline}</h1>
  <p class="sub">{hero.sub}</p>
  <div class="ctas">
    <a class="btn primary" href={hero.primaryCta.href}>{hero.primaryCta.label}</a>
    <a class="btn" href={hero.secondaryCta.href} rel="me noopener">{hero.secondaryCta.label}</a>
  </div>
</section>
<style>
  .hero { padding-block: var(--space-7) var(--space-6); }
  h1 { font-family: var(--font-mono); min-height: 1.2em; }
  h1::after { content: "_"; color: var(--accent); animation: blink 1s steps(1) infinite; }
  .sub { font-size: 1.2rem; color: var(--fg-muted); }
  .ctas { display: flex; gap: var(--space-2); flex-wrap: wrap; margin-top: var(--space-4); }
  @keyframes blink { 50% { opacity: 0; } }
</style>
<script>
  const h = document.querySelector<HTMLElement>('[data-typewriter]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (h && !reduce) {
    const full = h.textContent ?? '';
    h.setAttribute('aria-label', full);
    h.textContent = '';
    let i = 0;
    const tick = () => { h.textContent = full.slice(0, ++i); if (i < full.length) setTimeout(tick, 45); };
    setTimeout(tick, 300);
  }
</script>
```

- [ ] **Step 4: About.astro**

```astro
---
import type { Site } from '../content/schema';
interface Props { about: Site['about'] }
const { about } = Astro.props;
---
<section id="about" class="section container">
  <p class="eyebrow">01</p>
  <h2>{about.heading}</h2>
  <p class="lead">{about.short}</p>
  <details>
    <summary>{about.readMore}</summary>
    <div class="acts">
      {about.acts.map((a) => (<article><h3>{a.title}</h3><p>{a.body}</p></article>))}
    </div>
  </details>
</section>
<style>
  .lead { font-size: 1.15rem; }
  summary { cursor: pointer; color: var(--accent); font-weight: 600; margin-block: var(--space-3); }
  .acts { display: grid; gap: var(--space-4); margin-top: var(--space-3); }
</style>
```

- [ ] **Step 5: Pillars.astro**

```astro
---
import type { Site } from '../content/schema';
interface Props { pillars: Site['pillars'] }
const { pillars } = Astro.props;
---
<section id="how" class="section container">
  <p class="eyebrow">02</p>
  <h2>{pillars.heading}</h2>
  <div class="grid">
    {pillars.items.map((it, i) => (
      <article class="pillar">
        <span class="num">{String(i + 1).padStart(2, '0')}</span>
        <h3>{it.title}</h3>
        <ul>{it.points.map((p) => <li>{p}</li>)}</ul>
      </article>
    ))}
  </div>
</section>
<style>
  .grid { display: grid; gap: var(--space-4); grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); }
  .pillar { padding: var(--space-4); border: 1px solid var(--line); border-radius: var(--radius); background: var(--bg-elev); }
  .num { font-family: var(--font-mono); color: var(--accent); }
  ul { padding-left: 1.2em; margin: 0; color: var(--fg-muted); }
  li + li { margin-top: .4em; }
</style>
```

- [ ] **Step 6: 掛進頁面**

`index.astro` 的 `<section class="container"><h1>…</h1></section>` 換成:
```astro
<Hero hero={site.hero} />
<About about={site.about} />
<Pillars pillars={site.pillars} />
```
並 import 三個元件(`../components/Hero.astro` 等;en 頁面為 `../../components/…`)。

- [ ] **Step 7: build 與測試**

Run: `npm run build && npm test` → 全部 PASS

- [ ] **Step 8: Commit**

```bash
git add apps/brand
git -c user.name=shunzz -c user.email=m23568n@gmail.com commit -m "feat(brand): hero, about, pillars sections"
```

---

### Task 6: Projects(翻面卡)、Proof、Footer

**Files:**
- Create: `apps/brand/src/components/Projects.astro`, `Proof.astro`, `Footer.astro`
- Modify: `apps/brand/src/pages/index.astro`, `en/index.astro`, `test/dist.test.mjs`

**Interfaces:**
- `Projects` props `{ projects: Site['projects'] }`;`Proof` props `{ proof: Site['proof'] }`;`Footer` props `{ footer: Site['footer']; locale: Locale }`。
- 翻面:純 CSS 3D flip(hover / focus-within),另加 `<button>` 讓觸控裝置可點;正面=名稱/tagline/tags,背面=stats/story/links。

- [ ] **Step 1: 測試(先失敗)**

```js
test('projects/proof/footer 渲染', () => {
  const zh = html('index.html');
  assert.match(zh, /id="projects"/);
  assert.equal((zh.match(/class="card[" ]/g) ?? []).length, 4);
  assert.match(zh, /href="https:\/\/career-agent-at2\.pages\.dev"/);
  assert.match(zh, /id="contact"/);
  assert.match(zh, /mailto:m23568n@gmail\.com/);
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm run build && npm test` → FAIL

- [ ] **Step 3: Projects.astro**

```astro
---
import type { Site } from '../content/schema';
interface Props { projects: Site['projects'] }
const { projects } = Astro.props;
---
<section id="projects" class="section container">
  <p class="eyebrow">03</p>
  <h2>{projects.heading}</h2>
  <div class="grid">
    {projects.items.map((p) => (
      <article class:list={['card', { featured: p.featured }]} data-card>
        <div class="inner">
          <div class="face front">
            <h3>{p.name}</h3>
            <p>{p.tagline}</p>
            <ul class="tags">{p.tags.map((t) => <li class="tag">{t}</li>)}</ul>
            <button type="button" class="flip" data-flip aria-label={projects.flipHint}>{projects.flipHint} ↻</button>
          </div>
          <div class="face back">
            <ul class="stats">{p.stats.map((s) => <li><strong>{s.value}</strong><span>{s.label}</span></li>)}</ul>
            <p class="story">{p.story}</p>
            {p.links.length > 0 && (
              <p class="links">{p.links.map((l) => <a href={l.href} rel="noopener">{l.label} ↗</a>)}</p>
            )}
            <button type="button" class="flip" data-flip aria-label="back">↺</button>
          </div>
        </div>
      </article>
    ))}
  </div>
</section>
<style>
  .grid { display: grid; gap: var(--space-4); grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); }
  .card { perspective: 1200px; min-height: 20rem; }
  .card.featured { grid-column: 1 / -1; }
  .inner { position: relative; inline-size: 100%; block-size: 100%; min-height: inherit; transition: transform .6s var(--ease); transform-style: preserve-3d; }
  .card:hover .inner, .card:focus-within .inner, .card.is-flipped .inner { transform: rotateY(180deg); }
  .face {
    position: absolute; inset: 0; padding: var(--space-4); border: 1px solid var(--line); border-radius: var(--radius);
    background: var(--bg-elev); backface-visibility: hidden; display: flex; flex-direction: column; gap: var(--space-2);
  }
  .back { transform: rotateY(180deg); box-shadow: var(--shadow); }
  .tags { list-style: none; padding: 0; margin: auto 0 0; display: flex; flex-wrap: wrap; gap: .4em; }
  .stats { list-style: none; padding: 0; margin: 0; display: flex; gap: var(--space-4); flex-wrap: wrap; }
  .stats strong { display: block; font-family: var(--font-mono); font-size: 1.6rem; color: var(--accent); }
  .stats span { font-size: .8rem; color: var(--fg-muted); }
  .story { font-size: .95rem; color: var(--fg-muted); }
  .links { display: flex; gap: var(--space-3); margin-top: auto; }
  .flip { align-self: flex-end; background: none; border: 0; color: var(--fg-muted); cursor: pointer; font-family: var(--font-mono); font-size: .8rem; }
  @media (prefers-reduced-motion: reduce) {
    .card:hover .inner, .card:focus-within .inner { transform: none; }
    .card.is-flipped .inner { transform: rotateY(180deg); }
  }
</style>
<script>
  document.querySelectorAll<HTMLElement>('[data-card]').forEach((card) => {
    card.querySelectorAll('[data-flip]').forEach((b) =>
      b.addEventListener('click', () => card.classList.toggle('is-flipped')));
  });
</script>
```

- [ ] **Step 4: Proof.astro**

```astro
---
import type { Site } from '../content/schema';
interface Props { proof: Site['proof'] }
const { proof } = Astro.props;
---
<section id="proof" class="section container">
  <p class="eyebrow">04</p>
  <h2>{proof.heading}</h2>
  <dl class="list">
    {proof.items.map((it) => (
      <div class="row">
        <dt>{it.label}</dt>
        <dd>{it.href ? <a href={it.href} rel="me noopener">{it.value} ↗</a> : it.value}</dd>
      </div>
    ))}
  </dl>
</section>
<style>
  .list { margin: 0; display: grid; gap: var(--space-2); }
  .row { display: grid; grid-template-columns: 8rem 1fr; gap: var(--space-3); padding-block: var(--space-2); border-bottom: 1px dashed var(--line); }
  dt { font-family: var(--font-mono); color: var(--fg-muted); font-size: .85rem; }
  dd { margin: 0; }
</style>
```

- [ ] **Step 5: Footer.astro**

```astro
---
import type { Site } from '../content/schema';
import type { Locale } from '@shunzz/ui/i18n';
interface Props { footer: Site['footer']; locale: Locale }
const { footer, locale } = Astro.props;
const year = 2026;
---
<footer id="contact" class="section container">
  <h2>{footer.contact}</h2>
  <p><a class="btn primary" href={`mailto:${footer.email}`}>{footer.email}</a></p>
  <p class="note">{footer.note}</p>
  <p class="copy">© {year} shunzz · <a href="https://profile.shunzz.com">profile.shunzz.com</a> · <a href={locale === 'en' ? '/' : '/en/'}>{locale === 'en' ? '中文' : 'English'}</a></p>
</footer>
<style>
  .note { color: var(--fg-muted); font-size: .95rem; }
  .copy { font-family: var(--font-mono); font-size: .8rem; color: var(--fg-muted); }
</style>
```

- [ ] **Step 6: 掛進頁面**

在 `<Pillars … />` 後追加:
```astro
<Projects projects={site.projects} />
<Proof proof={site.proof} />
<Footer footer={site.footer} {locale} />
```
並 import。

- [ ] **Step 7: build 與測試**

Run: `npm run build && npm test` → 全部 PASS

- [ ] **Step 8: 開 dev server 目視檢查**

Run: `npm run dev`,開 `http://localhost:4321/` 與 `/en/`:hero 打字、卡片 hover 翻面、主題切換、語言切換、手機寬度(DevTools 375px)。確認無水平捲軸。修正後再 build/test。

- [ ] **Step 9: Commit**

```bash
git add apps/brand
git -c user.name=shunzz -c user.email=m23568n@gmail.com commit -m "feat(brand): projects flip cards, proof points, footer"
```

---

### Task 7: Sitemap、robots、headers、OG 圖

**Files:**
- Create: `apps/brand/public/robots.txt`, `apps/brand/public/_headers`, `apps/brand/scripts/gen-og.mjs`
- Modify: `apps/brand/astro.config.mjs`, `apps/brand/package.json`, `test/dist.test.mjs`
- Regenerate: `apps/brand/public/og.png`

- [ ] **Step 1: 測試(先失敗)**

```js
test('sitemap 與 robots', () => {
  assert.ok(existsSync(resolve(root, 'dist/sitemap-index.xml')));
  const sm = readFileSync(resolve(root, 'dist/sitemap-0.xml'), 'utf8');
  assert.match(sm, /<loc>https:\/\/shunzz\.com\/<\/loc>/);
  assert.match(sm, /hreflang="en"/);
  assert.match(html('robots.txt'), /Sitemap: https:\/\/shunzz\.com\/sitemap-index\.xml/);
  assert.match(html('_headers'), /X-Content-Type-Options: nosniff/);
});

test('og.png 是 1200x630 PNG', () => {
  const buf = readFileSync(resolve(root, 'dist/og.png'));
  assert.equal(buf.toString('ascii', 1, 4), 'PNG');
  assert.equal(buf.readUInt32BE(16), 1200);
  assert.equal(buf.readUInt32BE(20), 630);
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm run build && npm test` → FAIL

- [ ] **Step 3: 安裝 sitemap 與 sharp**

Run: `npm install @astrojs/sitemap -w apps/brand && npm install -D sharp -w apps/brand`

`astro.config.mjs` 改為:
```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://shunzz.com',
  output: 'static',
  compressHTML: true,
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

- [ ] **Step 4: robots.txt 與 _headers**

`apps/brand/public/robots.txt`:
```
User-agent: *
Allow: /
Sitemap: https://shunzz.com/sitemap-index.xml
```

`apps/brand/public/_headers`:
```
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
/og.png
  Cache-Control: public, max-age=86400
```

- [ ] **Step 5: gen-og.mjs**

`apps/brand/scripts/gen-og.mjs`:
```js
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#fbfaf7"/>
  <rect x="0" y="0" width="14" height="630" fill="#e4572e"/>
  <text x="90" y="150" font-family="JetBrains Mono, Consolas, monospace" font-size="34" fill="#5f5f5a">shunzz.com</text>
  <text x="90" y="300" font-family="Inter, Arial, sans-serif" font-size="76" font-weight="700" fill="#1a1a1a">Build with AI.</text>
  <text x="90" y="390" font-family="Inter, Arial, sans-serif" font-size="76" font-weight="700" fill="#e4572e">Ship for real.</text>
  <text x="90" y="520" font-family="Inter, Arial, sans-serif" font-size="30" fill="#5f5f5a">Spec-driven × AI agents × full-stack delivery</text>
</svg>`;

const png = await sharp(Buffer.from(svg)).png().toBuffer();
writeFileSync(new URL('../public/og.png', import.meta.url), png);
console.log('og.png written', png.length, 'bytes');
```

`apps/brand/package.json` scripts 加 `"og": "node scripts/gen-og.mjs"`。

Run: `npm run og -w apps/brand`

- [ ] **Step 6: build 與測試**

Run: `npm run build && npm test` → 全部 PASS

- [ ] **Step 7: Commit**

```bash
git add apps/brand package-lock.json
git -c user.name=shunzz -c user.email=m23568n@gmail.com commit -m "feat(brand): sitemap, robots, security headers, OG image"
```

---

### Task 8: CI、README、Lighthouse 驗證

**Files:**
- Create: `.github/workflows/ci.yml`, `README.md`

- [ ] **Step 1: CI**

`.github/workflows/ci.yml`:
```yaml
name: ci
on:
  push: { branches: [main] }
  pull_request:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npm run check
      - run: npm run build
      - run: npm test
```

- [ ] **Step 2: README**

`README.md`:
```markdown
# shunzz sites

npm workspaces monorepo.

| app | domain | status |
|---|---|---|
| `apps/brand` | shunzz.com | v1 |
| `apps/profile` | profile.shunzz.com | planned |
| `packages/ui` | shared tokens / layout / SEO | — |

## Dev
```
npm install
npm run dev        # brand
npm run build      # astro build + forbidden-term check
npm test           # node:test against dist/
```

## Content
`apps/brand/src/content/{zh,en}/site.json`,zod schema 在 `schema.ts`;兩語言 key 與陣列長度必須一致(測試會擋)。
`scripts/check-content.mjs` 掃禁用詞,命中即 build 失敗。

## Deploy (Cloudflare Pages)
- Project `shunzz-brand`:Build command `npm run build`,Build output `apps/brand/dist`,Root directory `/`,Node 24(`NODE_VERSION=24`)。
- Custom domains:`shunzz.com`(+ `www` → 301 到 apex)。
- OG 圖:`npm run og -w apps/brand` 重新產生 `public/og.png`。
```

- [ ] **Step 3: 本機 astro check**

Run: `npm run check`
Expected: 0 errors(warning 可接受)

- [ ] **Step 4: Lighthouse**

Run: `npm run build && npx astro preview --root apps/brand`,以 Chrome DevTools Lighthouse(Mobile)跑 `http://localhost:4321/`。
Expected: Performance / Accessibility / Best Practices / SEO 皆 ≥ 95。未達標時優先檢查:字體阻塞(確認 `display=swap`)、CLS(hero `min-height`)、對比(`--fg-muted` 在 dark 模式對比 ≥ 4.5:1)。修正後重跑 build/test。

- [ ] **Step 5: Commit**

```bash
git add .github README.md
git -c user.name=shunzz -c user.email=m23568n@gmail.com commit -m "chore: CI workflow and README"
```

---

## Self-Review

- **Spec coverage**:§3 架構(T1)、i18n 與內容分離 + zod(T2)、§4 六個 section(T5、T6)、§5 視覺與三個好玩點(T4 主題切換動畫、T5 打字、T6 翻面)、§6 SEO 全部項目(T4 meta/JSON-LD/字體、T7 sitemap/robots/_headers/OG、T8 Lighthouse)、§7 禁用詞(T3)、§8 測試與 CI(各 task + T8)、§9 部署設定(T8 README)。§10 profile 站為第二輪,另立 plan。
- **Placeholder scan**:無 TBD;所有 code 步驟含完整內容。
- **Type consistency**:`loadSite(locale)`、`Site` 型別、`localePath/htmlLang/LOCALES`、`BaseLayout` props 於 T1/T2/T4/T5/T6 一致;`data-typewriter`、`data-card`、`data-flip`、`data-theme-toggle`、`data-lang-switch` 名稱前後一致。
