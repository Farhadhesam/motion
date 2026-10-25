// Turns the phrase list in edit.js into sentence-sized subtitle cues (at most two lines).
// Shared by index.html and srt.mjs.
(function (root) {
  const MAX = 58;                          // letters that fit in two lines
  const len = s => s.replace(/\*/g, '').length;
  const ends = s => /[.!؟?:]$/.test(s.replace(/\*/g, ''));

  function buildCues(caps) {
    const cues = [];
    for (const c of caps) {
      const cur = cues[cues.length - 1];
      const last = cur && cur.parts[cur.parts.length - 1];
      if (cur && !ends(last.text) && c.t0 - last.t1 < 0.6 && len(cur.text) + 1 + len(c.text) <= MAX) {
        cur.parts.push(c);
        cur.text += ' ' + c.text;
      } else {
        cues.push({ parts: [c], text: c.text });
      }
    }
    // a single phrase that is still too long is split near its middle, preferably at a comma
    const out = [];
    for (const q of cues) {
      const t0 = q.parts[0].t0, t1 = q.parts[q.parts.length - 1].t1;
      if (len(q.text) <= MAX) { out.push({ t0, t1, text: q.text }); continue; }
      const w = q.text.split(' ');
      let best = 1, score = Infinity;
      for (let i = 1; i < w.length; i++) {
        const a = len(w.slice(0, i).join(' '));
        const s = Math.abs(a - len(q.text) / 2) - (/[،,]$/.test(w[i - 1]) ? 8 : 0);
        if (s < score) { score = s; best = i; }
      }
      const a = w.slice(0, best).join(' '), b = w.slice(best).join(' ');
      const tm = t0 + (t1 - t0) * len(a) / (len(a) + len(b));
      out.push({ t0, t1: tm, text: a }, { t0: tm, t1, text: b });
    }
    // hold each cue a little past its last word, but never into the next one
    out.forEach((q, i) => {
      const nx = out[i + 1];
      q.t1 = Math.min(q.t1 + 0.3, nx ? nx.t0 - 0.02 : Infinity);
    });
    return out;
  }

  root.buildCues = buildCues;
})(typeof window !== 'undefined' ? window : globalThis);
