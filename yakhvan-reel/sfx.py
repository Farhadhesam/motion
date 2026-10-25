"""Synthesises the effects track (whooshes, ice clinks, soft pops) from a cue list.

usage: python3 sfx.py cues.json duration out.wav
cues.json: [{"t": 12.3, "type": "whoosh" | "clink" | "pop" | "rise", "gain": 1.0}, ...]
"""
import json
import sys
import wave

import numpy as np

SR = 44100
rand = np.random.default_rng(7)


def bandpass_sweep(n, f0, f1, q=3.0):
    # white noise through a resonant 2-pole filter whose centre glides f0 -> f1
    x = rand.standard_normal(n)
    y = np.zeros(n)
    fc = np.geomspace(f0, f1, n)
    y1 = y2 = 0.0
    for i in range(n):
        w = 2 * np.pi * fc[i] / SR
        r = 1 - w / (2 * q)
        a1, a2 = -2 * r * np.cos(w), r * r
        y0 = (1 - r) * x[i] - a1 * y1 - a2 * y2
        y[i], y2, y1 = y0, y1, y0
    return y / (np.abs(y).max() + 1e-9)


def whoosh(dur=0.55):
    n = int(SR * dur)
    t = np.arange(n) / SR
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.6 * np.exp(-t * 1.5)
    return 0.55 * bandpass_sweep(n, 300, 3800) * env


def rise(dur=0.9):
    n = int(SR * dur)
    t = np.arange(n) / SR
    env = (t / dur) ** 2.2 * np.minimum(1, (dur - t) * 40)
    return 0.4 * bandpass_sweep(n, 200, 6000, q=5) * env


def clink():
    # two glasses touching: a cluster of inharmonic high partials with fast decay
    n = int(SR * 1.2)
    t = np.arange(n) / SR
    sig = np.zeros(n)
    for f, a, d in [(2637, 1, 9), (3951, .6, 12), (5274, .4, 16), (3135, .5, 10), (6889, .25, 22)]:
        sig += a * np.sin(2 * np.pi * f * t + rand.uniform(0, 6)) * np.exp(-t * d)
    second = np.roll(sig, int(SR * 0.07)) * 0.45
    second[:int(SR * 0.07)] = 0
    attack = np.minimum(1, t * 3000)
    return 0.22 * (sig + second) * attack


def pop():
    n = int(SR * 0.12)
    t = np.arange(n) / SR
    f = 900 * np.exp(-t * 28) + 180
    ph = 2 * np.pi * np.cumsum(f) / SR
    return 0.35 * np.sin(ph) * np.exp(-t * 38) * np.minimum(1, t * 2000)


SOUNDS = {"whoosh": whoosh, "clink": clink, "pop": pop, "rise": rise}

if __name__ == "__main__":
    cues, dur, out_path = json.load(open(sys.argv[1])), float(sys.argv[2]), sys.argv[3]
    out = np.zeros(int(SR * (dur + 2)))
    cache = {}
    for c in cues:
        s = cache.setdefault(c["type"], SOUNDS[c["type"]]())
        i = int(SR * c["t"])
        if i < 0:
            s, i = s[-i:], 0
        seg = s[: len(out) - i]
        out[i:i + len(seg)] += c.get("gain", 1.0) * seg
    out = out[: int(SR * dur)]
    out /= max(1.0, np.abs(out).max() / 0.95)
    with wave.open(out_path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((out * 32767).astype(np.int16).tobytes())
    print("wrote", out_path, len(cues), "cues")
