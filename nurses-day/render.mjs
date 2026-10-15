// Renders index.html frame by frame and pipes the frames into ffmpeg.
// Usage: node render.mjs [out.mp4] [--audio file] [--from "sender name"] [--stills 1,4.5,9]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = name => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const out = path.resolve(args.find(a => a.endsWith('.mp4')) ?? path.join(here, 'out', 'nurses-day.mp4'));
const audio = opt('--audio') && path.resolve(opt('--audio'));
const from = opt('--from');
const FPS = 30;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', e => { console.error('page error:', e.message); process.exit(1); });
const url = pathToFileURL(path.join(here, 'index.html'));
url.searchParams.set('render', '');
if (from) url.searchParams.set('from', from);
await page.goto(url.href);
await page.evaluate(async () => {
  await Promise.all(['300', '400', '700', '900'].map(w => document.fonts.load(`${w} 40px Vazirmatn`, 'پرستار')));
  await window.ready;
});

if (opt('--stills')) {
  for (const t of opt('--stills').split(',').map(Number)) {
    await page.evaluate(t => window.renderAt(t), t);
    await page.screenshot({ path: path.join(here, 'out', `still-${t}.png`) });
  }
  await browser.close();
  process.exit(0);
}

const duration = await page.evaluate(() => window.DURATION);
const ff = spawn('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  ...(audio ? ['-i', audio, '-c:a', 'aac', '-b:a', '192k', '-t', String(duration)] : []),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-movflags', '+faststart',
  out,
], { stdio: ['pipe', 'inherit', 'inherit'] });

const frames = Math.round(duration * FPS);
for (let i = 0; i < frames; i++) {
  await page.evaluate(t => window.renderAt(t), i / FPS);
  const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % 60 === 0) process.stdout.write(`frame ${i}/${frames}\n`);
}
ff.stdin.end();
await new Promise((res, rej) => ff.on('close', c => (c ? rej(new Error(`ffmpeg exited ${c}`)) : res())));
await browser.close();
console.log('wrote', out);
