// Turns the CAPS list in edit.js (one entry per subtitle) into timed cues.
// Shared by index.html and srt.mjs.
(function (root) {
  const MAX = 64;                          // letters that fit in two lines
  const len = s => s.replace(/\*/g, '').length;

  function buildCues(caps) {
    // an entry too long for two lines is split near its middle, preferably at a comma
    const out = [];
    for (const c of caps) {
      if (len(c.text) <= MAX) { out.push({ t0: c.t0, t1: c.t1, text: c.text }); continue; }
      const w = c.text.split(' ');
      let best = 1, score = Infinity;
      for (let i = 1; i < w.length; i++) {
        const a = len(w.slice(0, i).join(' '));
        const s = Math.abs(a - len(c.text) / 2) - (/[،,]$/.test(w[i - 1]) ? 8 : 0);
        if (s < score) { score = s; best = i; }
      }
      const a = w.slice(0, best).join(' '), b = w.slice(best).join(' ');
      const tm = c.t0 + (c.t1 - c.t0) * len(a) / (len(a) + len(b));
      out.push({ t0: c.t0, t1: tm, text: a }, { t0: tm, t1: c.t1, text: b });
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
