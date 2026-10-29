// Writes the subtitle cues (edit.js phrases merged by captions.js) as an .srt file.
// Usage: node srt.mjs [out.srt]       node srt.mjs --list   (numbered plain text)
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = { window: {} };
vm.createContext(ctx);
for (const f of ['edit.js', 'captions.js']) vm.runInContext(fs.readFileSync(path.join(here, f), 'utf8'), ctx);
const cues = ctx.window.buildCues(ctx.window.EDIT.CAPS).map(c => ({ ...c, text: c.text.replace(/\*/g, '') }));

const stamp = (t, sep = ',') => {
  const ms = Math.round(t * 1000);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)}${sep}${p(ms % 1000, 3)}`;
};

if (process.argv.includes('--list')) {
  cues.forEach((c, i) => console.log(`${i + 1}. [${stamp(c.t0).slice(3, 8)}] ${c.text}`));
} else {
  const out = path.resolve(process.argv[2] ?? path.join(here, 'out', 'ebike-subtitles.srt'));
  fs.writeFileSync(out, cues.map((c, i) => `${i + 1}\n${stamp(c.t0)} --> ${stamp(c.t1)}\n${c.text}\n`).join('\n'));
  console.log('wrote', out, cues.length, 'cues');
}
