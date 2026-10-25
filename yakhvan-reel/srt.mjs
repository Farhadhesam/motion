// Writes the captions in edit.js as an .srt file (one cue per phrase).
// Usage: node srt.mjs [out.srt]
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(here, 'edit.js'), 'utf8'), ctx);
const out = path.resolve(process.argv[2] ?? path.join(here, 'out', 'yakhvan-subtitles.srt'));

const stamp = t => {
  const ms = Math.round(t * 1000);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
const cues = ctx.window.EDIT.CAPS.map((c, i) =>
  `${i + 1}\n${stamp(c.t0)} --> ${stamp(c.t1)}\n${c.text.replace(/\*/g, '')}\n`);
fs.writeFileSync(out, cues.join('\n'));
console.log('wrote', out, cues.length, 'cues');
