"""Builds the remix soundtrack: the source audio cut to timeline.json, plus synthesised SFX.

Usage: python3 audio.py [out.wav]
"""
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

SR = 44100
HERE = Path(__file__).parent
TL = json.loads((HERE / 'timeline.json').read_text(encoding='utf-8'))


def load_source():
    raw = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', str(HERE / 'assets' / 'source.mp4'),
         '-vn', '-ac', '2', '-ar', str(SR), '-f', 's16le', '-'],
        check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).reshape(-1, 2).astype(np.float64) / 32768


def env(n, attack, decay):
    t = np.arange(n) / SR
    return np.minimum(1, t / attack) * np.exp(-t * decay)


def bandpass_sweep(x, f0, f1, q=2.5):
    """State-variable band-pass whose centre glides from f0 to f1."""
    out = np.empty_like(x)
    low = band = 0.0
    fc = np.geomspace(f0, f1, len(x))
    for i, v in enumerate(x):
        f = 2 * np.sin(np.pi * fc[i] / SR)
        low += f * band
        high = v - low - band / q
        band += f * high
        out[i] = band
    return out


rand = np.random.default_rng(7)


def whoosh(dur=0.5):
    n = int(SR * dur)
    t = np.arange(n) / SR
    y = bandpass_sweep(rand.standard_normal(n), 250, 3500) * np.sin(np.pi * t / dur) ** 2
    y *= 0.32 / np.abs(y).max()
    pan = np.linspace(-0.6, 0.6, n)
    return np.stack([y * (1 - pan) / 1.3, y * (1 + pan) / 1.3], axis=1)


def boom(dur=1.4):
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = 42 + 110 * np.exp(-t * 16)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.003, 2.4)
    y = np.tanh(2.4 * y) * 0.36
    y[:400] += rand.standard_normal(400) * np.linspace(0.25, 0, 400)
    return y


def thud(dur=0.3):
    n = int(SR * dur)
    t = np.arange(n) / SR
    y = 0.5 * np.sin(2 * np.pi * 75 * t) * env(n, 0.002, 14)
    y += bandpass_sweep(rand.standard_normal(n), 400, 150, q=1) * env(n, 0.001, 30) * 0.6
    return y * 0.8


def pop(dur=0.09):
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = 380 + 900 * np.exp(-t * 60)
    return 0.3 * np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 45)


def bell(freq, dur=0.9, amp=0.2, decay=5):
    n = int(SR * dur)
    t = np.arange(n) / SR
    tone = (np.sin(2 * np.pi * freq * t) + 0.5 * np.sin(2 * np.pi * 2.76 * freq * t) * np.exp(-t * 6)
            + 0.25 * np.sin(2 * np.pi * 5.4 * freq * t) * np.exp(-t * 10))
    return amp * tone * env(n, 0.002, decay)


def ding():
    a, b = bell(1568, amp=0.16), bell(2093, amp=0.16)
    y = np.zeros(len(a) + int(0.09 * SR))
    y[:len(a)] += a
    y[-len(b):] += b
    return y


def twinkle():
    notes = [2093, 2637, 3136, 4186, 3136, 4186]
    y = np.zeros(int(SR * 0.9))
    for i, f in enumerate(notes):
        b = bell(f, dur=0.5, amp=0.07, decay=9)
        s = int(i * 0.055 * SR)
        y[s:s + len(b)] += b[:len(y) - s]
    return y


def glitch(dur=0.3):
    n = int(SR * dur)
    steps = rand.choice([180, 260, 410, 620, 950], size=n // 1300 + 1)
    f = np.repeat(steps, 1300)[:n]
    y = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR))
    y = np.round(y * 4) / 4 * 0.12
    y *= np.minimum(1, np.linspace(3, 0, n))
    return y


SFX = {'whoosh': whoosh, 'boom': boom, 'thud': thud, 'pop': pop, 'ding': ding, 'twinkle': twinkle, 'glitch': glitch}


def main():
    out_path = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / 'out' / 'audio.wav'
    src = load_source()
    shots = TL['shots']
    t = 0.0
    for s in shots:
        s.setdefault('dur', s['src'][1] - s['src'][0] if 'src' in s else 0)
        s['start'] = t
        t += s['dur']
    total = t
    mix = np.zeros((int(SR * total) + SR, 2))

    def add(y, at):
        if y.ndim == 1:
            y = np.stack([y, y], axis=1)
        i = int(round(at * SR))
        if i < 0:
            y, i = y[-i:], 0
        mix[i:i + len(y)] += y[:len(mix) - i]

    # Source dialogue; a short fade only where the cut is not continuous in the source.
    playing = [s for s in shots if 'src' in s and s['src'][1] > s['src'][0]]
    for s in playing:
        a = src[int(s['src'][0] * SR):int(s['src'][1] * SR)].copy()
        prev = next((p for p in shots if abs(p['start'] + p['dur'] - s['start']) < 1e-6), None)
        nxt = next((p for p in shots if abs(p['start'] - (s['start'] + s['dur'])) < 1e-6), None)
        fade = int(0.012 * SR)
        if not (prev in playing and abs(prev['src'][1] - s['src'][0]) < 1e-3):
            a[:fade] *= np.linspace(0, 1, fade)[:, None]
        if not (nxt in playing and abs(nxt['src'][0] - s['src'][1]) < 1e-3):
            a[-fade:] *= np.linspace(1, 0, fade)[:, None]
        add(a, s['start'])

    def out_time(src_t):
        s = next(s for s in playing if s['src'][0] <= src_t < s['src'][1])
        return s['start'] + src_t - s['src'][0]

    for c in TL['cards']:
        at = out_time(c['from'])
        add(pop(), at)
        if c.get('sfx') == 'ding':
            add(ding(), at + (0.95 if 'count' in c else 0.75))
        elif c.get('sfx'):
            add(SFX[c['sfx']](), at + 0.1)

    by_id = {s['id']: s for s in shots}
    for name, shot, offset in TL['sfx']:
        add(SFX[name](), by_id[shot]['start'] + offset)

    mix = mix[:int(SR * total)]
    peak = np.abs(mix).max()
    if peak > 0.97:
        mix *= 0.97 / peak
    with wave.open(str(out_path), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mix * 32767).astype(np.int16).tobytes())
    print(f'wrote {out_path} ({total:.2f}s)')


if __name__ == '__main__':
    main()
