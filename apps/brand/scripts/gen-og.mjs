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
