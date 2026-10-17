// Renders remix.html frame by frame and encodes it with the soundtrack from audio.py.
// Expects the original clip at assets/source.mp4 (kept out of git).
// Usage: node render.mjs [out.mp4] [--stills 1,12.5]
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const stillsArg = args.indexOf('--stills');
const out = path.resolve(args.find(a => a.endsWith('.mp4')) ?? path.join(here, 'out', 'luxury-remix.mp4'));
const FPS = 30;

mkdirSync(path.join(here, 'out'), { recursive: true });
const framesDir = path.join(here, 'assets', 'frames');
if (!existsSync(path.join(framesDir, '0000.jpg'))) {
  mkdirSync(framesDir, { recursive: true });
  execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(here, 'assets', 'source.mp4'), '-q:v', '2', '-start_number', '0', path.join(framesDir, '%04d.jpg')]);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.addInitScript(tl => { window.TIMELINE = tl; }, JSON.parse(readFileSync(path.join(here, 'timeline.json'), 'utf8')));
await page.goto(pathToFileURL(path.join(here, 'remix.html')).href + '?render');
await page.evaluate(() => window.ready);

if (stillsArg >= 0) {
  for (const t of args[stillsArg + 1].split(',').map(Number)) {
    await page.evaluate(t => window.renderAt(t), t);
    await page.screenshot({ path: path.join(here, 'out', `still-${t}.png`) });
  }
  await browser.close();
  process.exit(0);
}

const audio = path.join(here, 'out', 'audio.wav');
execFileSync('python3', [path.join(here, 'audio.py'), audio], { stdio: 'inherit' });

const duration = await page.evaluate(() => window.DURATION);
const ff = spawn('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-i', audio, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k',
  '-t', String(duration),
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
