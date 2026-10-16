// Renders promo.html frame by frame with Playwright and pipes the frames + audio.wav into ffmpeg.
// Usage: node render.js            -> out/repla-promo.mp4
//        node render.js 1.2 9 20   -> out/still-<t>.png (quick preview of given seconds)
import { chromium } from 'playwright';
import ffmpeg from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const FPS = 30, DURATION = 35;
const stills = process.argv.slice(2).map(Number);
mkdirSync('out', { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(pathToFileURL('promo.html').href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

if (stills.length) {
  for (const t of stills) {
    await page.evaluate(t => seek(t), t);
    await page.screenshot({ path: `out/still-${t}.png` });
  }
} else {
  const ff = spawn(ffmpeg, ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-i', 'out/audio.wav',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest',
    '-movflags', '+faststart', 'out/repla-promo.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = FPS * DURATION;
  for (let f = 0; f < total; f++) {
    await page.evaluate(t => seek(t), f / FPS);
    const jpg = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(jpg)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 60 === 0) console.log(`frame ${f}/${total}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
}
await browser.close();
