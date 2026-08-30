#!/usr/bin/env node
// 掃描公開內容與 build 輸出,命中保密紅線即失敗。
// 禁用詞清單不進 repo:優先讀環境變數 FORBIDDEN_TERMS(逗號分隔),
// 否則讀 private/forbidden-terms.txt(gitignored,repo root)。
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXT = new Set(['.json', '.html', '.astro', '.md', '.ts', '.js', '.txt', '.xml']);

function loadTerms() {
  const envTerms = (process.env.FORBIDDEN_TERMS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (envTerms.length) return envTerms;

  const filePath = process.env.FORBIDDEN_TERMS_FILE
    ? process.env.FORBIDDEN_TERMS_FILE
    : fileURLToPath(new URL('../private/forbidden-terms.txt', import.meta.url));

  if (existsSync(filePath)) {
    const lines = readFileSync(filePath, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
    if (lines.length) return lines;
  }
  return [];
}

const FORBIDDEN = loadTerms();
if (!FORBIDDEN.length) {
  console.error('check-content: no denylist (set FORBIDDEN_TERMS or create private/forbidden-terms.txt)');
  process.exit(1);
}

function* walk(p) {
  const st = statSync(p);
  if (st.isFile()) {
    if (EXT.has(extname(p))) yield p;
    return;
  }
  for (const name of readdirSync(p)) {
    yield* walk(join(p, name));
  }
}

const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['src', 'dist'];
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
