"""Synthesises the 30 s soundtrack: monitor beeps, a racing clock, soft piano and pads at 72 bpm.

Cue times mirror index.html (BEAT = 60 / 72; b(n) = n * BEAT).
Usage: python3 music.py [out.wav]
"""
import sys
import wave

import numpy as np

SR = 44100
DUR = 30.0
BEAT = 60 / 72
N = int(SR * DUR)
music = np.zeros(N)   # piano, pads, bass: goes quiet on the cold-tea pause
fx = np.zeros(N)      # beeps, ticks, thumps: never ducked
rng = np.random.default_rng(7)


def b(n):
    return n * BEAT


def freq(note):
    return 440.0 * 2 ** ((note - 69) / 12)


def add(buf, start, sig):
    i = int(SR * start)
    j = min(N, i + len(sig))
    if j > i:
        buf[i:j] += sig[:j - i]


def piano(note, start, dur, amp=0.2):
    n = int(SR * min(dur + 2.5, DUR - start))
    t = np.arange(n) / SR
    f = freq(note)
    sig = np.zeros(n)
    for k in range(1, 8):
        fk = f * k * (1 + 0.0004 * k * k)
        sig += np.sin(2 * np.pi * fk * t) * k ** -1.4 * np.exp(-t * (0.9 + 0.7 * k))
    env = np.minimum(1, t * 300) * np.where(t < dur, 1, np.exp(-(t - dur) * 3))
    add(music, start, amp * sig * env)


def bell(note, start, amp=0.1, decay=2.0, buf=None):
    n = int(SR * min(3.0, DUR - start))
    t = np.arange(n) / SR
    f = freq(note)
    sig = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t * 4)
           + 0.15 * np.sin(2 * np.pi * 5.4 * f * t) * np.exp(-t * 8))
    add(music if buf is None else buf, start, amp * sig * np.exp(-t * decay) * np.minimum(1, t * 500))


def pad(notes, start, length, amp=0.035, attack=0.8):
    n = int(SR * min(length + 1.2, DUR - start))
    t = np.arange(n) / SR
    env = np.minimum(1, t / attack) * np.where(t < length, 1, np.exp(-(t - length) * 3.5))
    sig = np.zeros(n)
    for m in notes:
        for det in (-0.12, 0, 0.11):
            fm = freq(m + det)
            sig += np.sin(2 * np.pi * fm * t + rng.uniform(0, 6)) + 0.25 * np.sin(4 * np.pi * fm * t)
    add(music, start, amp * sig * env * (1 + 0.08 * np.sin(2 * np.pi * 0.3 * t)))


def bass(note, start, length, amp=0.16):
    n = int(SR * min(length + 0.6, DUR - start))
    t = np.arange(n) / SR
    f = freq(note)
    env = np.minimum(1, t * 60) * np.exp(-t * 0.6) * np.where(t < length, 1, np.exp(-(t - length) * 6))
    add(music, start, amp * (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * env)


def beep(start, amp=0.16):
    """Patient-monitor beep: A5 with a soft-edged 110 ms gate."""
    n = int(SR * 0.16)
    t = np.arange(n) / SR
    gate = np.clip(t / 0.006, 0, 1) * np.clip((0.11 - t) / 0.02, 0, 1)
    sig = np.sin(2 * np.pi * 880 * t) + 0.18 * np.sin(2 * np.pi * 1760 * t)
    add(fx, start, amp * sig * gate)


def tick(start, amp=0.05, pitch=2600):
    n = int(SR * 0.03)
    t = np.arange(n) / SR
    sig = (rng.standard_normal(n) * 0.5 + np.sin(2 * np.pi * pitch * t)) * np.exp(-t * 260)
    add(fx, start, amp * sig)


def thump(start, amp=0.55):
    n = int(SR * 0.7)
    t = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(48 + 60 * np.exp(-t * 14)) / SR
    sig = np.sin(ph) * np.exp(-t * 6) + 0.15 * rng.standard_normal(n) * np.exp(-t * 60)
    add(fx, start, amp * sig * np.minimum(1, t * 400))


# ---- harmony: one chord per bar (4 beats) ----
AM, F, C, G = (57, 60, 64), (53, 57, 60), (48, 55, 64), (55, 59, 62)
pad(AM, b(2), b(6), amp=0.022, attack=1.6)
for bar, ch, root in [(2, F, 41), (3, C, 36), (4, G, 43), (5, AM, 45)]:
    pad(ch, b(4 * bar), b(4) if bar < 5 else b(3) - 0.15, amp=0.03)
    bass(root, b(4 * bar), b(4) if bar < 5 else b(3) - 0.15)
# climax after the pause, then the title resolves on C, then an F → C "amen"
for start, length, ch, root in [(25, 3, F, 41), (28, 2, G, 43), (30, 2, C, 36), (32, 2, F, 41), (34, 2, C, 36)]:
    pad(tuple(ch) + (ch[0] + 12,), b(start), b(length), amp=0.034, attack=0.3 if start == 25 else 0.15)
    bass(root, b(start), b(length), amp=0.2)

# gentle broken-chord accompaniment from the hands scene on
ARP = {2: (65, 69, 72), 3: (64, 67, 72), 4: (62, 67, 71), 5: (64, 69, 72)}
for bar, notes in ARP.items():
    for k in range(8):
        s = b(4 * bar + k * 0.5)
        if bar == 5 and k >= 6:
            break
        piano(notes[[0, 1, 2, 1][k % 4]], s, 0.4, amp=0.045)
for start, notes, count in [(25, (65, 69, 72), 6), (28, (67, 71, 74), 4), (30, (64, 67, 72), 4), (32, (65, 69, 72), 4), (34, (64, 67, 72), 3)]:
    for k in range(count):
        piano(notes[[0, 1, 2, 1][k % 4]], b(start + k * 0.5), 0.4, amp=0.05)

# melody: starts when the nurse's hand touches the patient's (beat 10)
MELODY = [
    (10, 76, 1), (11, 77, .5), (11.5, 76, .5),
    (12, 72, 1.5), (13.5, 74, .5), (14, 76, 1), (15, 79, 1),
    (16, 79, 1), (17, 74, 1), (18, 71, 1), (19, 74, 1),
    (20, 72, 1), (21, 76, 1), (22, 81, .8),
    (25, 77, 1), (26, 81, 1), (27, 84, 1),
    (28, 83, 1), (29, 79, 1), (30, 84, 2),
    (32, 81, 1), (33, 77, 1), (34, 76, 2),
]
for beat, note, length in MELODY:
    piano(note, b(beat), b(length), amp=0.15)
    if beat >= 25:
        piano(note - 12, b(beat), b(length), amp=0.06)

# ---- cold-tea pause: the music stops on beat 23 and swells back into beat 25 ----
t_all = np.arange(N) / SR
duck = np.clip((b(23) + 0.25 - t_all) / 0.25, 0, 1) + np.clip((t_all - b(24.6)) / 0.12, 0, 1)
music *= np.clip(duck, 0, 1)
n = int(SR * (b(25) - b(23.6)))
t = np.arange(n) / SR
noise = rng.standard_normal(n)
lp = np.zeros(n)
acc = 0.0
for i in range(n):  # sweeping one-pole low-pass: a soft whoosh into the climax
    a = 0.01 + 0.25 * (i / n) ** 2
    acc += a * (noise[i] - acc)
    lp[i] = acc
add(music, b(23.6), 0.25 * lp * (t / t[-1]) ** 2.2)

# ---- sound effects on the picture's cues ----
for t0 in (b(1), b(2), b(3)):
    beep(t0, 0.17)                      # scene 1 heartbeats
beep(b(4), 0.07)                         # the line lifts off towards the clock
# the clock: hands race from 22:00 to 03:00, one tick per five minutes
CLOCK_DONE = 3.8704
ts = np.linspace(CLOCK_DONE + 0.1, 6.05, 4000)
k = np.clip((ts - (CLOCK_DONE + 0.1)) / (6.05 - CLOCK_DONE - 0.1), 0, 1)
h = 22 + 5 * np.where(k < .5, 4 * k ** 3, 1 - (-2 * k + 2) ** 3 / 2)
marks = np.floor(h * 12)
for i in np.nonzero(np.diff(marks))[0]:
    tick(ts[i + 1], 0.035, 2400 + 300 * (i % 2))
bell(84, 6.05, amp=0.07, decay=1.2, buf=fx)                 # three o'clock
bell(91, 6.1, amp=0.03, decay=1.6, buf=fx)
# the touch, the flame, and the cup
for k2, m in enumerate((84, 88, 91)):
    bell(m, b(10) + k2 * 0.07, amp=0.035, decay=2.5)
for k2, m in enumerate((79, 84, 88, 91, 96)):
    bell(m, b(14.5) + k2 * 0.05, amp=0.045, decay=2.2)
for i in range(5):
    beep(b(18 + i), 0.12)                # the montage, one icon per beep
# heartbeat returns and becomes a heart
beep(b(25.5), 0.13)
beep(b(26), 0.09)
beep(b(27), 0.12)
thump(b(27))
thump(b(28))
for k2, m in enumerate((84, 88, 91, 96)):
    bell(m, b(30) + k2 * 0.06, amp=0.05, decay=2.2)     # title
beep(b(32), 0.05)
beep(b(34), 0.05)

# ---- mix: a simple convolution reverb on the music, then master fade ----
ir_n = int(SR * 2.4)
ir_t = np.arange(ir_n) / SR
mix = []
for seed in (11, 12):
    ir = np.random.default_rng(seed).standard_normal(ir_n) * np.exp(-ir_t * 2.6)
    ir[:int(SR * 0.012)] = 0
    ir /= np.sqrt(np.sum(ir ** 2))
    size = 1 << int(np.ceil(np.log2(N + ir_n)))
    wet = np.fft.irfft(np.fft.rfft(music + 0.4 * fx, size) * np.fft.rfft(ir, size), size)[:N]
    mix.append(music + fx + 0.32 * wet)
out = np.stack(mix, axis=1)
out *= (np.clip((DUR - t_all) / 1.4, 0, 1) * np.clip(t_all / 0.05, 0, 1))[:, None]
out /= np.max(np.abs(out)) * 1.12

path = sys.argv[1] if len(sys.argv) > 1 else "out/music.wav"
with wave.open(path, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print("wrote", path)
