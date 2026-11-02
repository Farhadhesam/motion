"""Soft ambient bed + transition whooshes, mixed under the original voice track.
Usage: python3 music.py  ->  out/mix.wav
"""
import subprocess, wave, pathlib
import numpy as np

here = pathlib.Path(__file__).parent
SR, DUR = 48000, 119.1
n = int(SR * DUR)
t = np.arange(n) / SR
rng = np.random.default_rng(3)

def note(m):
    return 440 * 2 ** ((m - 69) / 12)

# slow progression, one chord per 4 s: Am  F  C  G
chords = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]]
bed = np.zeros(n)
seg = 4.0
for i in range(int(DUR / seg) + 1):
    a, b = int(i * seg * SR), min(n, int((i + 1) * seg * SR + SR))
    if a >= n:
        break
    tt = np.arange(b - a) / SR
    env = np.minimum(1, tt / 1.2) * np.clip((seg + 1 - tt) / 1.6, 0, 1)
    for m in chords[i % 4]:
        f = note(m)
        v = np.sin(2 * np.pi * f * tt) + .3 * np.sin(2 * np.pi * f * 2.003 * tt) + .15 * np.sin(2 * np.pi * f * .5 * tt)
        bed[a:b] += v * env * .05
    # soft pluck on the chord root an octave up
    pl = np.exp(-tt * 3) * np.sin(2 * np.pi * note(chords[i % 4][0] + 24) * tt) * .05
    bed[a:b] += pl

# gentle low-pass via moving average
k = 24
bed = np.convolve(bed, np.ones(k) / k, mode='same')

# whooshes at chapter changes
chapters = [8.3, 23.8, 31.9, 41.7, 64.3, 81.8, 103.5, 116.4]
fx = np.zeros(n)
for c in chapters:
    a = int((c - .45) * SR); L = int(.9 * SR)
    if a < 0 or a + L > n:
        continue
    w = rng.standard_normal(L)
    w = np.convolve(w, np.ones(40) / 40, mode='same')
    e = np.sin(np.linspace(0, np.pi, L)) ** 2
    fx[a:a + L] += w * e * .35

mix = bed + fx
fade = np.clip((DUR - t) / 2.5, 0, 1) * np.clip(t / 1.5, 0, 1)
mix *= fade
mix = np.clip(mix, -1, 1)
out = here / 'out'
out.mkdir(exist_ok=True)
with wave.open(str(out / 'bed.wav'), 'wb') as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((mix * 32767).astype(np.int16).tobytes())

# voice on top, bed ducked to a quiet level
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(here / 'assets' / 'voice.wav'), '-i', str(out / 'bed.wav'),
                '-filter_complex', '[1]volume=0.55,aformat=channel_layouts=stereo[b];[0][b]amix=inputs=2:duration=first:normalize=0[m]',
                '-map', '[m]', '-ar', '48000', str(out / 'mix.wav')], check=True)
print('wrote', out / 'mix.wav')
