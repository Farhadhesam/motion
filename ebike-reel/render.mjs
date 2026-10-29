// Renders index.html frame by frame in parallel workers, then muxes the
// original voice with the synthesised effects track.
// Usage: node render.mjs [out.mp4] [--workers 3] [--from 0 --to 12] [--stills 1,4.5,9]
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, def) => (args.includes(name) ? args[args.indexOf(name) + 1] : def);
const out = path.resolve(args.find(a => a.endsWith('.mp4')) ?? path.join(here, 'out', 'ebike-edit.mp4'));
const workers = Number(opt('--workers', 3));
const source = path.join(here, 'assets', 'source.mp4');
const tmp = path.join(here, 'out', 'parts');
const FPS = 30;
fs.mkdirSync(tmp, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto(pathToFileURL(path.join(here, 'index.html')).href + '?render');
  await page.evaluate(async () => {
    await Promise.all([
      ...['300', '400', '700', '900'].map(w => document.fonts.load(`${w} 40px Vazirmatn`, 'یخوان')),
      document.fonts.load('40px Lalezar', 'یخوان'),
    ]);
    await window.ready;
  });
  return page;
}

const run = (cmd, a) => {
  const r = spawnSync(cmd, a, { stdio: 'inherit' });
  if (r.status) throw new Error(`${cmd} exited ${r.status}`);
};

if (args.includes('--stills')) {
  const page = await openPage();
  for (const t of opt('--stills').split(',').map(Number)) {
    await page.evaluate(t => window.renderAt(t), t);
    await page.screenshot({ path: path.join(here, 'out', `still-${t}.jpg`), type: 'jpeg', quality: 90 });
  }
  await browser.close();
  process.exit(0);
}

const first = await openPage();
const duration = await first.evaluate(() => window.DURATION);
const cues = await first.evaluate(() => window.SFX);
const t0 = Number(opt('--from', 0)), t1 = Math.min(duration, Number(opt('--to', duration)));
const f0 = Math.round(t0 * FPS), f1 = Math.round(t1 * FPS);
const per = Math.ceil((f1 - f0) / workers);

async function renderRange(page, k, a, b) {
  const file = path.join(tmp, `part-${String(k).padStart(2, '0')}.mp4`);
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-threads', '2',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    file,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = a; i < b; i++) {
    await page.evaluate(t => window.renderAt(t), i / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 94 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((i - a) % 150 === 0) process.stdout.write(`worker ${k}: frame ${i - a}/${b - a}\n`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => (c ? rej(new Error(`ffmpeg exited ${c}`)) : res())));
  return file;
}

const pages = [first, ...(await Promise.all(Array.from({ length: workers - 1 }, openPage)))];
const parts = await Promise.all(pages.map((p, k) =>
  renderRange(p, k, f0 + k * per, Math.min(f1, f0 + (k + 1) * per))));
await browser.close();

const list = path.join(tmp, 'list.txt');
fs.writeFileSync(list, parts.map(p => `file '${p}'`).join('\n'));
const video = path.join(tmp, 'video.mp4');
run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', video]);

// effects track from the page's cue list, mixed under the original voice
const cueFile = path.join(tmp, 'sfx.json');
fs.writeFileSync(cueFile, JSON.stringify(cues.map(c => ({ ...c, t: c.t - t0 }))));
const sfx = path.join(tmp, 'sfx.wav');
run('python3', [path.join(here, 'sfx.py'), cueFile, String(t1 - t0), sfx]);
run('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-i', video, '-ss', String(t0), '-t', String(t1 - t0), '-i', source, '-i', sfx,
  '-filter_complex',
  '[1:a]aresample=48000,highpass=f=70,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=200,volume=1.0[v];' +
  '[2:a]aresample=48000,volume=0.5[s];' +
  '[v][s]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9[a]',
  '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
  '-movflags', '+faststart', '-shortest', out,
]);
console.log('wrote', out);
