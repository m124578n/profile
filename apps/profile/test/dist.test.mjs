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
