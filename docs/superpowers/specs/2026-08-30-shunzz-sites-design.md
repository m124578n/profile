# shunzz.com / profile.shunzz.com 設計 Spec

日期:2026-08-30
狀態:待使用者審閱

## 1. 目標

做兩個公開個人網站,內容來源為 `profile素材_shunzz.md` 與 `履歷更新_2026-08.md`(去識別化後):

| 站 | 網域 | 定位 | 語氣 |
|---|---|---|---|
| brand | shunzz.com | 個人品牌、故事、Featured Projects | 簡單、專案感、一點好玩 |
| profile | profile.shunzz.com | 專業履歷版 | 正經、可掃讀 |

兩站皆中英雙語。首輪只做 brand 站到可上線;profile 站第二輪。

## 2. 非目標(YAGNI)

- 不做 CMS、不做評論、不做表單後端(聯絡用 mailto / 社群連結)
- 不搬 Hexo 部落格;只放連結(之後可另掛 blog.shunzz.com)
- 不做專案子頁(單頁長捲動)
- 不做 PDF 履歷自動產生(profile 站預留一個下載連結位置即可)

## 3. 架構

npm workspaces monorepo,Astro 5 靜態輸出,部署 Cloudflare Pages(每個 app 一個 Pages 專案)。

```
profile/
├─ package.json            # workspaces: apps/*, packages/*
├─ apps/
│  ├─ brand/               # shunzz.com
│  │  ├─ astro.config.mjs  # site: https://shunzz.com, i18n
│  │  ├─ src/pages/index.astro          # zh(預設,無前綴)
│  │  ├─ src/pages/en/index.astro
│  │  ├─ src/content/     # 內容 JSON(zh/en 各一份)
│  │  └─ src/components/  # 各 section
│  └─ profile/             # profile.shunzz.com(第二輪)
└─ packages/
   └─ ui/                  # 共用:tokens.css、BaseLayout、Seo、LangSwitch、ThemeToggle、ProjectCard、i18n 工具
```

- 語言路由:`/`(zh-Hant)與 `/en/`。Astro 內建 i18n(`defaultLocale: 'zh-hant'`, `prefixDefaultLocale: false`)。
- 內容與版分離:每個 section 讀 `src/content/{zh,en}/*.json`,元件不寫死文字。翻譯缺項時 build 失敗(用 zod schema 驗證兩語言結構一致)。
- 樣式:純 CSS + CSS 變數,不用 Tailwind(兩站共享 `tokens.css`,靜態站不需要 utility 框架)。
- 互動 JS 只有兩處:深淺色切換、hero 打字動畫。全部 `<script>` inline,無框架 island。

## 4. brand 站頁面結構(單頁)

1. **Hero** — `Build with AI. Ship for real.`(打字機動畫,尊重 `prefers-reduced-motion`)+ 副標「規格驅動 × AI Agent × 全端交付…」+ 兩個 CTA(看專案 / GitHub)
2. **About** — 三幕敘事(非典型起點 / AI 改變做事方式 / 從使用者變建設者),長版可摺疊
3. **三層敘事** — 三欄:用 AI 交付產品 / 管理 AI 的方法論 / 為 AI 造工具,各附 2–3 條要點
4. **Featured Projects ×4** — Career Agent(主打)、酸脆(失敗學習角度)、MCP Gateway(概念化)、企業級匿名彙總卡。卡片欄位:名稱、一句話、技術標籤、數字(如 3 天 73 commits)、連結。「好玩」點:hover 時卡片翻面顯示 commit/測試數字。
5. **Proof Points** — GitHub、Blog、Dev.to、Threads/Medium、語言能力
6. **Footer** — 聯絡 mailto、語言切換、© 、profile.shunzz.com 連結

## 5. 視覺

- 極簡編輯感:大留白、字體階層為主、單一強調色。
- 字體:Google Fonts 一組(中文 Noto Sans TC + 英文/數字 Inter 或等寬 JetBrains Mono 作點綴),有 system fallback。
- 深淺色:`prefers-color-scheme` + 手動切換,存 localStorage。
- 「好玩」限定三處:hero 打字、卡片翻面、主題切換按鈕的小動畫。其餘靜態。
- 詳細色票/字體在實作時用 frontend-design skill 定案,不在本 spec 綁死。

## 6. SEO

- 每頁 `<title>`、`<meta description>`、canonical、`hreflang`(zh-Hant / en / x-default)、Open Graph + Twitter card、OG 圖(build 時靜態產一張)。
- JSON-LD `Person`(name、url、sameAs: GitHub/LinkedIn/Threads、jobTitle、knowsLanguage)。
- `@astrojs/sitemap` 產 sitemap,`robots.txt` 允許全站。
- 語意 HTML(`header/main/section/h1..h3`,每頁唯一 h1)、圖片 alt、`lang` 屬性隨語言。
- 效能即 SEO:零框架 JS、字體 `preconnect` + `display=swap`、圖片 `loading=lazy`,目標 Lighthouse 四項 ≥ 95。
- Cloudflare Pages 設定 `_headers`(基本安全標頭)。

## 7. 內容紅線(build 時可檢查)

- 禁用詞清單:客戶公司名等敏感字串(清單見 private/forbidden-terms.txt,不進 repo)。加一個 `scripts/check-content.mjs` 掃 `src/content/**` 與 `dist/**`,命中即 build 失敗。
- 只寫方法論、技術棧、去識別化規模數字、個人 side projects。

## 8. 測試

- 內容 schema 驗證(zod)—— zh/en 結構一致、必填欄位。
- 禁用詞掃描 —— 見 §7。
- `astro check` + `astro build` 在 CI(GitHub Actions)跑;Cloudflare Pages 接 GitHub 自動部署。
- 手動:Lighthouse、雙語切換、深淺色、reduced-motion。

## 9. 部署

- Cloudflare Pages 專案 `shunzz-brand`(root `/`, build `npm run build -w apps/brand`, output `apps/brand/dist`),綁 shunzz.com + www 轉址。
- 第二輪 `shunzz-profile` 同法綁 profile.shunzz.com。

## 10. 第二輪:profile 站(僅列範圍)

Hero(姓名/職稱/Summary)→ 工作經歷(零售 IT 子公司 Senior Systems Analyst,去識別化 bullets;OSENSE)→ 技術棧 → Side Projects → 語言/教育 → 聯絡 + PDF 連結位。共用 `packages/ui`,版面更緊湊、可列印(`@media print`)。
