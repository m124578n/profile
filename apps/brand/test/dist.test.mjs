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

test('hero/about/pillars 內容渲染', () => {
  const zh = html('index.html');
  assert.match(zh, /<h1[^>]*data-typewriter[^>]*>Build with AI\. Ship for real\.<\/h1>/);
  assert.match(zh, /id="about"/);
  assert.match(zh, /第一幕/);
  assert.match(zh, /用 AI 交付產品/);
  assert.match(zh, /為 AI 造工具/);
});

test('projects/proof/footer 渲染', () => {
  const zh = html('index.html');
  assert.match(zh, /id="projects"/);
  assert.equal((zh.match(/class="card[" ]/g) ?? []).length, 4);
  assert.match(zh, /href="https:\/\/career-agent-at2\.pages\.dev"/);
  assert.match(zh, /id="contact"/);
  assert.match(zh, /mailto:m23568n@gmail\.com/);
});

test('sitemap 與 robots', () => {
  assert.ok(existsSync(resolve(root, 'dist/sitemap-index.xml')));
  const sm = readFileSync(resolve(root, 'dist/sitemap-0.xml'), 'utf8');
  assert.match(sm, /<loc>https:\/\/shunzz\.com\/<\/loc>/);
  assert.match(sm, /hreflang="en"/);
  assert.match(html('robots.txt'), /Sitemap: https:\/\/shunzz\.com\/sitemap-index\.xml/);
  assert.match(html('_headers'), /X-Content-Type-Options: nosniff/);
});

test('theme-init script 早於 Google Fonts 連結(避免 FOUC)', () => {
  const zh = html('index.html');
  const themeIdx = zh.indexOf("localStorage.getItem('theme')");
  const fontsIdx = zh.indexOf('fonts.googleapis.com');
  assert.ok(themeIdx >= 0 && fontsIdx >= 0);
  assert.ok(themeIdx < fontsIdx, `theme-init script(${themeIdx}) should be before fonts.googleapis.com(${fontsIdx})`);
});

test('footer 在 main 之外', () => {
  const zh = html('index.html');
  const mainCloseIdx = zh.indexOf('</main>');
  const footerIdx = zh.indexOf('<footer');
  assert.ok(mainCloseIdx >= 0 && footerIdx >= 0);
  assert.ok(mainCloseIdx < footerIdx, `</main>(${mainCloseIdx}) should be before <footer(${footerIdx})`);
});

test('en 內容渲染(projects/pillars heading)', () => {
  const en = html('en/index.html');
  assert.match(en, /Featured projects/);
  assert.match(en, /How I work/);
});

test('skip link 與 main landmark 存在', () => {
  const zh = html('index.html');
  assert.match(zh, /class="skip-link"/);
  assert.match(zh, /id="main"/);
});

test('不再寫入 localStorage lang(#10 YAGNI)', () => {
  assert.doesNotMatch(html('index.html'), /localStorage\.setItem\('lang'/);
  assert.doesNotMatch(html('en/index.html'), /localStorage\.setItem\('lang'/);
});

test('og.png 是 1200x630 PNG', () => {
  const buf = readFileSync(resolve(root, 'dist/og.png'));
  assert.equal(buf.toString('ascii', 1, 4), 'PNG');
  assert.equal(buf.readUInt32BE(16), 1200);
  assert.equal(buf.readUInt32BE(20), 630);
});

test('about 展開動畫:details 帶 data-story 且有對應 inline script', () => {
  for (const p of ['index.html', 'en/index.html']) {
    const h = html(p);
    assert.match(h, /<details[^>]*data-story/, p);
    assert.match(h, /data-story[\s\S]*prefers-reduced-motion/, p);
  }
});

test('nav 由 links 陣列渲染(含 profile 站連結)', () => {
  const zh = html('index.html');
  assert.match(zh, /<nav[^>]*aria-label="主選單"[^>]*>[\s\S]*href="https:\/\/profile\.shunzz\.com"[^>]*rel="me"/);
  assert.equal((zh.match(/<nav[^>]*>[\s\S]*?<\/nav>/)[0].match(/<a /g) ?? []).length, 5); // 4 links + LangSwitch
});
