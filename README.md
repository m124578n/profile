# shunzz sites

npm workspaces monorepo.

| app | domain | status |
|---|---|---|
| `apps/brand` | shunzz.com | v1 |
| `apps/profile` | profile.shunzz.com | v1 |
| `packages/ui` | shared tokens / layout / SEO | — |

## Dev

```
npm install
npm run dev        # brand
npm run build      # astro build + forbidden-term check (both apps)
npm test           # node:test against dist/
```

## Content
`apps/brand/src/content/{zh,en}/site.json`,zod schema 在 `schema.ts`;兩語言 key 與陣列長度必須一致(測試會擋)。
`scripts/check-content.mjs` 掃禁用詞,命中即 build 失敗。

## Forbidden-term denylist
禁用詞清單不進 repo。本機開發:建立 `private/forbidden-terms.txt`(已 gitignore),一行一個詞。
CI / Cloudflare Pages:改用環境變數 `FORBIDDEN_TERMS`(逗號分隔)。
- GitHub Actions:在 repo secrets 設定 `FORBIDDEN_TERMS`。
兩者皆無時 `check-content.mjs` 會印出錯誤並以 exit 1 中止 build。

## Deploy (Cloudflare Workers Static Assets)
每個 app 有自己的 `wrangler.jsonc`,custom domain 寫在 `routes[]`(`custom_domain: true`),部署時自動綁定:

```
npx wrangler login                                                  # 一次即可
npm run build -w apps/brand   && (cd apps/brand   && npx wrangler deploy)   # shunzz.com + www.shunzz.com
npm run build -w apps/profile && (cd apps/profile && npx wrangler deploy)   # profile.shunzz.com
```

- `_headers` 放在各 app 的 `public/`,Workers 原生解析。`_redirects` 只接受相對路徑,www → apex 轉址請在 Cloudflare dashboard 建 Redirect Rule(或維持雙網域,canonical 已指向 apex)。
- OG 圖:`npm run og -w apps/brand` / `-w apps/profile` 重新產生 `public/og.png`。
- 兩站互連:brand nav「專業履歷版」→ profile;profile nav/footer → shunzz.com。酸脆維持在 `suancui.shunzz.com`。
- `npm run dev:profile` 本機開發 profile 站。
