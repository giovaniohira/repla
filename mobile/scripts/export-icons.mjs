// App icon + splash from the mascot head. Run after export-mascot.mjs.
import sharp from 'sharp';
import { mascotSvg } from '../src/ui/mascotArt.ts';

const out = 'assets/images/';
const head = (size) => sharp(Buffer.from(mascotSvg('head')), { density: 400 }).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
const grad = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22B8A3"/><stop offset="1" stop-color="#0A7D6E"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#g)"/></svg>');
const onCanvas = async (headSize, bg) => sharp(bg ?? { create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: await head(headSize), gravity: 'center' }]).png().toBuffer();

await sharp(await onCanvas(880, grad)).toFile(out + 'icon.png');
await sharp(await onCanvas(640)).toFile(out + 'android-icon-foreground.png');
await sharp(grad).png().toFile(out + 'android-icon-background.png');
await sharp(await onCanvas(1024)).toFile(out + 'splash-icon.png');
await sharp(await onCanvas(880, grad)).resize(48, 48).toFile(out + 'favicon.png');
// monochrome: alpha silhouette of the head, white
const src = await sharp(await onCanvas(640)).raw().toBuffer({ resolveWithObject: true });
const { data, info } = src;
const alpha = Buffer.alloc(info.width * info.height);
for (let i = 0; i < alpha.length; i++) { const o = i * 4; alpha[i] = data[o + 3] && data[o] + data[o + 1] + data[o + 2] > 330 ? 255 : 0; }
const mono = alpha;
await sharp({ create: { width: 1024, height: 1024, channels: 3, background: '#fff' } }).joinChannel(mono, { raw: { width: info.width, height: info.height, channels: 1 } }).png().toFile(out + 'android-icon-monochrome.png');
