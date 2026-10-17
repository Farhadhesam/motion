// Burns the Persian subtitles into the source video. Every source frame is decoded, drawn behind the
// subtitle page, captured and re-encoded, so output frame i is source frame i at t = i / fps and the
// original audio is copied untouched — the subtitles cannot drift.
// Usage: node render.mjs <source.mp4> [out.mp4] [--from s --to s] [--stills 5,14.5] [--srt out.srt]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = name => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const positional = args.filter((a, i) => !a.startsWith('--') && !(i && args[i - 1].startsWith('--')));
const src = positional[0] && path.resolve(positional[0]);
const out = path.resolve(positional[1] ?? path.join(here, 'out', 'persian-subtitled.mp4'));

const ctx = { window: {} };
vm.runInNewContext(readFileSync(path.join(here, 'subs.js'), 'utf8'), ctx);
const SUBS = ctx.window.SUBS;
const FPS = SUBS.fps;

if (opt('--srt')) {
  writeFileSync(path.resolve(opt('--srt')), toSrt(SUBS));
  console.log('wrote', opt('--srt'));
  process.exit(0);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
await page.goto(pathToFileURL(path.join(here, 'index.html')).href);
await page.evaluate(async () => {
  await Promise.all(['400', '700', '900'].map(w => document.fonts.load(`${w} 30px Vazirmatn`, 'فارسی')));
  await window.ready;
});

async function showFrame(jpeg, t) {
  await page.evaluate(async ([b64, t]) => {
    const img = document.getElementById('frame');
    img.src = 'data:image/jpeg;base64,' + b64;
    await img.decode();
    window.renderAt(t);
  }, [jpeg.toString('base64'), t]);
}

function decode(from, dur) {
  const ff = spawn('ffmpeg', ['-v', 'error', ...(from ? ['-ss', String(from)] : []), '-i', src,
    ...(dur ? ['-t', String(dur)] : []), '-f', 'image2pipe', '-c:v', 'mjpeg', '-q:v', '2', '-'],
    { stdio: ['ignore', 'pipe', 'inherit'] });
  return jpegFrames(ff.stdout);
}

// Splits ffmpeg's MJPEG stream into frames (each runs from FFD8 to FFD9; FFD9 cannot occur inside).
async function* jpegFrames(stream) {
  let buf = Buffer.alloc(0);
  for await (const chunk of stream) {
    buf = Buffer.concat([buf, chunk]);
    let end;
    while ((end = buf.indexOf(Buffer.from([0xff, 0xd9]), 2)) >= 0) {
      yield buf.subarray(0, end + 2);
      buf = buf.subarray(end + 2);
    }
  }
}

if (opt('--stills')) {
  for (const t of opt('--stills').split(',').map(Number)) {
    for await (const f of decode(t, 1 / FPS)) { await showFrame(f, t); break; }
    await page.screenshot({ path: path.join(here, 'out', `still-${t}.png`) });
  }
  await browser.close();
  process.exit(0);
}

const from = Number(opt('--from') ?? 0), to = Number(opt('--to') ?? SUBS.duration);
const enc = spawn('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  ...(from ? ['-ss', String(from)] : []), '-i', src, ...(opt('--to') ? ['-t', String(to - from)] : []),
  '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-preset', 'slow',
  '-c:a', 'copy', '-movflags', '+faststart', out,
], { stdio: ['pipe', 'inherit', 'inherit'] });

let i = 0;
const total = Math.round((to - from) * FPS);
for await (const f of decode(from, opt('--to') ? to - from : 0)) {
  await showFrame(f, from + i / FPS);
  const shot = await page.screenshot({ type: 'jpeg', quality: 95 });
  if (!enc.stdin.write(shot)) await new Promise(r => enc.stdin.once('drain', r));
  if (++i % 250 === 0) console.log(`frame ${i}/${total}`);
}
enc.stdin.end();
await new Promise((res, rej) => enc.on('close', c => (c ? rej(new Error(`ffmpeg exited ${c}`)) : res())));
await browser.close();
console.log(`wrote ${out} (${i} frames)`);

function toSrt({ narration, dialogue, outro }) {
  const ts = s => {
    const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60;
    const pad = (n, k = 2) => String(n).padStart(k, '0');
    return `${pad(h)}:${pad(m)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
  };
  const cues = [
    ...narration.map(n => [n.t0, n.t1, n.fa]),
    ...dialogue.map(d => [d.t0, d.t1, (d.label ? `${d.label}: ` : '') + d.beats.map(b => b[1]).join(' ')]),
    [outro.t0, outro.t1, outro.fa],
  ].sort((a, b) => a[0] - b[0]);
  // RLE … PDF keeps punctuation on the correct side in players that don't detect RTL.
  return cues.map(([a, b, text], k) => `${k + 1}\n${ts(a)} --> ${ts(b)}\n‫${text}‬\n`).join('\n');
}
