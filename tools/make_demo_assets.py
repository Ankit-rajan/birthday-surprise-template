"""
Generates the demo background SONG (frontend/public/demo/demo-song.mp3): an original synthesised piano-style piece,
so there is nothing to license. The demo PICTURES, video and social image come from make_sample_art.py.

    python3 tools/make_demo_assets.py

Needs: numpy and ffmpeg on PATH.
"""
import math, os, random, subprocess, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "demo")
os.makedirs(OUT, exist_ok=True)

PALETTES = [
    ((123, 26, 53), (244, 207, 211)),
    ((58, 10, 23), (212, 180, 131)),
    ((90, 15, 35), (232, 163, 176)),
    ((36, 6, 16), (236, 217, 176)),
    ((140, 29, 58), (250, 244, 232)),
    ((75, 20, 45), (244, 207, 211)),
]


def font(size, bold=False):
    names = ["/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"]
    for n in names:
        try:
            return ImageFont.truetype(n, size)
        except Exception:
            pass
    return ImageFont.load_default()


def petal(d, cx, cy, s, rot, color):
    pts = []
    for i in range(40):
        t = i / 39 * 2 * math.pi
        x = math.sin(t) * s * 0.62
        y = -math.cos(t) * s * (1.0 if math.cos(t) > 0 else 0.9)
        pts.append((cx + x * math.cos(rot) - y * math.sin(rot), cy + x * math.sin(rot) + y * math.cos(rot)))
    d.polygon(pts, fill=color)


def make_image(path, w, h, label, seed, sub="DEMO PHOTO  -  replace me"):
    rnd = random.Random(seed)
    c1, c2 = PALETTES[seed % len(PALETTES)]
    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy = rnd.uniform(0.25, 0.75) * w, rnd.uniform(0.2, 0.6) * h
    d = np.clip(np.hypot((xx - cx) / w, (yy - cy) / h) * 1.5, 0, 1)[..., None]
    arr = (np.array(c2) * (1 - d) + np.array(c1) * d).astype("uint8")
    img = Image.fromarray(arr).convert("RGBA")
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    for _ in range(14):
        petal(ld, rnd.uniform(0, w), rnd.uniform(0, h), rnd.uniform(w * 0.04, w * 0.1), rnd.uniform(0, 6.28), (255, 255, 255, rnd.randint(28, 70)))
    layer = layer.filter(ImageFilter.GaussianBlur(2))
    img = Image.alpha_composite(img, layer)
    dr = ImageDraw.Draw(img)
    f1, f2 = font(max(18, w // 14), True), font(max(12, w // 32))
    tw = dr.textlength(label, font=f1)
    dr.text(((w - tw) / 2, h * 0.44), label, font=f1, fill=(255, 248, 236, 235))
    tw = dr.textlength(sub, font=f2)
    dr.text(((w - tw) / 2, h * 0.44 + w // 11), sub, font=f2, fill=(255, 248, 236, 170))
    img.convert("RGB").save(path, quality=84, optimize=True)



# ---- demo song: an original gentle piano-style piece (C - G - Am - F), ~64 s, loops cleanly.
SR = 44100


def note(freq, dur, vel=0.5):
    n = int(SR * dur)
    t = np.arange(n) / SR
    env = np.exp(-t * 2.6) * (1 - np.exp(-t * 90))
    tone = sum(a * np.sin(2 * np.pi * freq * k * t) for k, a in [(1, 1), (2, 0.38), (3, 0.16), (4, 0.07)])
    return vel * env * tone


def hz(name):
    names = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
    n, octave = name[0], int(name[-1])
    semis = names[n] + (1 if "#" in name else 0) + 12 * (octave - 4) - 9
    return 440 * 2 ** (semis / 12)


BPM = 72
beat = 60 / BPM
bars = [
    (["C3", "G3", "E4", "G3", "C4", "G3", "E4", "G3"], ["E5", None, "G5", None, "E5", "D5", "C5", None]),
    (["G2", "D3", "B3", "D3", "G3", "D3", "B3", "D3"], ["D5", None, "B4", None, "D5", "E5", "D5", None]),
    (["A2", "E3", "C4", "E3", "A3", "E3", "C4", "E3"], ["C5", None, "E5", None, "A5", "G5", "E5", None]),
    (["F2", "C3", "A3", "C3", "F3", "C3", "A3", "C3"], ["A4", None, "C5", None, "F5", "E5", "C5", None]),
]
total = int(SR * (beat * 4 * len(bars) * 4 + 3))
mix = np.zeros(total)
pos = 0.0
for rep in range(4):
    for arp, mel in bars:
        for i in range(8):
            s = int((pos + i * beat / 2) * SR)
            nn = note(hz(arp[i]), 2.2, 0.28)
            mix[s : s + len(nn)] += nn[: total - s]
            if mel[i]:
                mm = note(hz(mel[i]), 2.6, 0.34 if rep % 2 == 0 else 0.4)
                mix[s : s + len(mm)] += mm[: total - s]
        pos += beat * 4
# soft reverb-ish echo
for delay, gain in [(0.23, 0.32), (0.41, 0.2), (0.67, 0.12)]:
    d = int(delay * SR)
    mix[d:] += mix[:-d] * gain
mix = mix[: int(SR * (beat * 4 * len(bars) * 4))]  # trim tail so it loops cleanly
fade = int(0.05 * SR)
mix[:fade] *= np.linspace(0, 1, fade)
mix[-fade:] *= np.linspace(1, 0, fade)
mix = mix / np.max(np.abs(mix)) * 0.85
with wave.open(f"{OUT}/_song.wav", "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{OUT}/_song.wav", "-codec:a", "libmp3lame", "-b:a", "96k", f"{OUT}/demo-song.mp3"], check=True)
os.remove(f"{OUT}/_song.wav")
print("done ->", os.path.abspath(OUT))
