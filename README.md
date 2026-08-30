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

## Forbidden-term denylist
禁用詞清單不進 repo。本機開發:建立 `private/forbidden-terms.txt`(已 gitignore),一行一個詞。
CI / Cloudflare Pages:改用環境變數 `FORBIDDEN_TERMS`(逗號分隔)。
- GitHub Actions:在 repo secrets 設定 `FORBIDDEN_TERMS`。
- Cloudflare Pages:在專案的 environment variables 設定 `FORBIDDEN_TERMS`。
兩者皆無時 `check-content.mjs` 會印出錯誤並以 exit 1 中止 build。

## Deploy (Cloudflare Pages)
- Project `shunzz-brand`:Build command `npm run build`,Build output `apps/brand/dist`,Root directory `/`,Node 24(`NODE_VERSION=24`)。
- Custom domains:`shunzz.com`(+ `www` → 301 到 apex)。
- OG 圖:`npm run og -w apps/brand` 重新產生 `public/og.png`。
