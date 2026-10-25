// Edit decision list for the Yakhvan reel. Times are seconds in the source video.
// CAPS: one entry per spoken phrase; *word* marks a keyword, cut:true lets the camera re-frame there.
window.EDIT = {
  DURATION: 178.3,
  FRAMES: 5350,

  // shot changes found with ffmpeg's scene filter, labelled by eye
  SHOTS: [
    { t: 0, kind: 'talk' },
    { t: 9.033, kind: 'broll' },
    { t: 13.467, kind: 'talk' },
    { t: 35.5, kind: 'talk' },
    { t: 56.533, kind: 'broll' },
    { t: 57.7, kind: 'talk' },
    { t: 58.833, kind: 'talk' },
    { t: 60.5, kind: 'broll' },
    { t: 61.6, kind: 'talk' },
    { t: 63.433, kind: 'broll' },
    { t: 64.633, kind: 'talk' },
    { t: 68.767, kind: 'broll' },
    { t: 69.867, kind: 'talk' },
    { t: 76.133, kind: 'broll' },
    { t: 76.8, kind: 'broll' },
    { t: 77.933, kind: 'broll' },
    { t: 78.267, kind: 'broll' },
    { t: 81.8, kind: 'broll' },
    { t: 83.2, kind: 'broll' },
    { t: 88.233, kind: 'broll' },
    { t: 90.933, kind: 'talk' },
    { t: 95.8, kind: 'broll' },
    { t: 97.133, kind: 'broll' },
    { t: 99.767, kind: 'broll' },
    { t: 104.8, kind: 'talk' },
    { t: 113.067, kind: 'broll' },
    { t: 115.267, kind: 'broll' },
    { t: 119.833, kind: 'broll' },
    { t: 121.433, kind: 'talk' },
    { t: 135.333, kind: 'broll' },
    { t: 144.367, kind: 'talk' },
    { t: 148.433, kind: 'broll' },
    { t: 151.8, kind: 'talk' },
    { t: 163.467, kind: 'broll' },
    { t: 165.1, kind: 'talk' },
    { t: 166.7, kind: 'broll' },
    { t: 168.8, kind: 'talk' },
  ],

  CAPS: [],

  HOOK: { t0: 0.25, t1: 3.7, a: 'بستنیِ خونگی، فقط در', b: '۷ دقیقه' },

  VS: { t0: 18.6, tStrike: 27.6, tNew: 28.0, t1: 33.4,
        oldLabel: '⏳ روش معمولی', oldBig: '۷ ساعت', newLabel: '⚡ با یخ‌وان', newBig: '۷ دقیقه' },

  ING: { t0: 56.4, t1: 80.6, title: 'مواد لازم', items: [] },

  STEPS: [],

  STICKERS: [],

  // talk framing held while a graphic needs the space
  CAMLOCK: [
    { t0: 0, t1: 3.7, f: 'mid' },
    { t0: 18.4, t1: 33.4, f: 'mid' },
    { t0: 56.3, t1: 80.6, f: 'wide' },
  ],

  END: { t: 173.5, tag: 'بستنیِ خونگی در ۷ دقیقه', cta: 'ذخیره کن و برای یه بستنی‌دوست بفرست 🍦' },
};
