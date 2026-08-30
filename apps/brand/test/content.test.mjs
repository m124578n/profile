import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

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

test('check-content 對乾淨內容 exit 0', () => {
  const r = spawnSync(process.execPath, ['../../scripts/check-content.mjs', 'src/content'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, FORBIDDEN_TERMS: 'zzforbiddenzz' },
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('check-content 命中禁用詞 exit 1', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cc-'));
  writeFileSync(join(dir, 'x.json'), '{"a":"contains zzforbiddenzz here"}');
  const r = spawnSync(process.execPath, ['../../scripts/check-content.mjs', dir], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, FORBIDDEN_TERMS: 'zzforbiddenzz' },
  });
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /zzforbiddenzz/);
});

test('check-content 無禁用詞來源時 exit 1', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cc-'));
  const r = spawnSync(process.execPath, ['../../scripts/check-content.mjs', dir], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, FORBIDDEN_TERMS: '', FORBIDDEN_TERMS_FILE: join(dir, 'missing.txt') },
  });
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /no denylist/);
});
