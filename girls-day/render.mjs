// Renders index.html frame by frame and pipes the frames into ffmpeg.
// Usage: node render.mjs [out.mp4] [--page architect.html] [--audio file] [--stills 1,4.5,9]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const stillsArg = args.indexOf('--stills');
const out = path.resolve(args.find(a => a.endsWith('.mp4')) ?? path.join(here, 'out', 'pariya.mp4'));
const audio = args.includes('--audio') ? path.resolve(args[args.indexOf('--audio') + 1]) : null;
const page_ = args.includes('--page') ? args[args.indexOf('--page') + 1] : 'index.html';
const FPS = 30;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(pathToFileURL(path.join(here, page_)).href + '?render');
await page.evaluate(async () => {
  await Promise.all(['300', '400', '700', '900'].map(w => document.fonts.load(`${w} 40px Vazirmatn`, 'پریا')));
  await window.ready;
});

if (stillsArg >= 0) {
  for (const t of args[stillsArg + 1].split(',').map(Number)) {
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
  ...(audio ? ['-i', audio, '-af', `afade=t=out:st=${duration - 2}:d=2`, '-c:a', 'aac', '-b:a', '192k', '-t', String(duration)] : []),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart',
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
