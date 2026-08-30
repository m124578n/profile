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
  for (const l of ['zh', 'en']) for (const e of load(l).experience) {
    const n = e.bullets.length + (e.groups ?? []).reduce((s, g) => s + g.bullets.length, 0);
    assert.ok(n >= 3, `${l}:${e.company}`);
  }
});
