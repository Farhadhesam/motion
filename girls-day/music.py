"""Synthesises a short, gentle music-box lullaby (15 s) to sit under the animation."""
import sys
import wave

import numpy as np

SR = 44100
DUR = 15.0
t_all = np.arange(int(SR * DUR)) / SR
out = np.zeros_like(t_all)


def freq(note):
    return 440.0 * 2 ** ((note - 69) / 12)


def bell(note, start, amp=0.22, decay=1.6):
    n = int(SR * min(3.0, DUR - start))
    t = np.arange(n) / SR
    f = freq(note)
    tone = (np.sin(2 * np.pi * f * t)
            + 0.35 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 3)
            + 0.12 * np.sin(2 * np.pi * 4.07 * f * t) * np.exp(-t * 6))
    env = np.exp(-t * decay) * np.minimum(1, t * 400)
    i = int(SR * start)
    out[i:i + n] += amp * tone * env


def pad(notes, start, length, amp=0.05):
    n = int(SR * length)
    t = np.arange(n) / SR
    env = np.sin(np.pi * t / length) ** 2
    sig = sum(np.sin(2 * np.pi * freq(m) * t) + 0.3 * np.sin(2 * np.pi * freq(m) * 2.003 * t) for m in notes)
    i = int(SR * start)
    out[i:i + n] += amp * sig * env


# C – Am – F – G – C, one chord every 3 s; arpeggio in eighths (0.375 s)
chords = [(60, 64, 67), (57, 60, 64), (53, 57, 60), (55, 59, 62), (60, 64, 67)]
melody = [
    [72, 76, 79, 76, 74, 76, 72, 79],
    [69, 72, 76, 72, 71, 72, 69, 76],
    [65, 69, 72, 77, 76, 72, 69, 72],
    [67, 71, 74, 79, 77, 74, 71, 74],
    [72, 79, 84],
]
for c, (ch, mel) in enumerate(zip(chords, melody)):
    start = c * 3.0
    pad(ch, start, 3.4 if c < 4 else DUR - start)
    bell(ch[0] - 12, start, amp=0.16, decay=1.0)
    step = 0.375 if c < 4 else 0.5
    for k, m in enumerate(mel):
        bell(m, start + k * step, amp=0.2 if k else 0.26)

# sparkle chime when the name appears (~5 s) and on the final wish (~11.2 s)
for base in (5.0, 11.2):
    for k, m in enumerate((84, 88, 91, 96)):
        bell(m, base + k * 0.06, amp=0.09, decay=3)

fade = np.clip((DUR - t_all) / 1.5, 0, 1) * np.clip(t_all / 0.3, 0, 1)
out *= fade
out /= np.max(np.abs(out)) * 1.15
# a little stereo width via a short delay on one side
left = out
right = np.concatenate([np.zeros(int(SR * 0.012)), out[:-int(SR * 0.012)]])
stereo = (np.stack([left, right], axis=1) * 32767).astype(np.int16)

path = sys.argv[1] if len(sys.argv) > 1 else "out/music.wav"
with wave.open(path, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(stereo.tobytes())
print("wrote", path)
