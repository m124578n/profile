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
