// Renders every mascot pose to assets/mascot/<pose>.png. Needs `sharp` (npm i --no-save sharp). Run: node scripts/export-mascot.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { mascotSvg, POSES } from '../src/ui/mascotArt.ts';

mkdirSync('assets/mascot', { recursive: true });
for (const p of POSES) await sharp(Buffer.from(mascotSvg(p)), { density: 300 }).resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(`assets/mascot/${p}.png`);
