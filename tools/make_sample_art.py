"""
Generates the ORIGINAL sample artwork used by the public demo (/demo) and the marketing page.

Everything is drawn procedurally from scratch (gradients, glows, silhouettes, bokeh): no photographs, no
people, no text, no third-party assets, so there is nothing to license and no real person is depicted.

    python3 tools/make_sample_art.py

Needs: Pillow, numpy, ffmpeg on PATH (only for the short private video).
Writes into frontend/public/demo/. The demo song (demo-song.mp3) comes from make_demo_assets.py and is kept.
"""
import math, os, random, subprocess
import numpy as np
from PIL import Image, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "demo")
os.makedirs(OUT, exist_ok=True)
SS = 2  # supersampling factor for crisp silhouettes


def hexc(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)


def vgrad(w, h, stops):
    """Vertical gradient. stops = [(pos 0..1, '#hex'), ...]"""
    ys = np.linspace(0, 1, h, dtype=np.float32)
    pos = [p for p, _ in stops]
    cols = np.stack([hexc(c) for _, c in stops])
    out = np.stack([np.interp(ys, pos, cols[:, i]) for i in range(3)], axis=1)
    return np.repeat(out[:, None, :], w, axis=1)


def add_glow(arr, cx, cy, radius, color, strength=1.0):
    h, w, _ = arr.shape
    y0, y1 = int(max(0, cy - radius * 3)), int(min(h, cy + radius * 3))
    x0, x1 = int(max(0, cx - radius * 3)), int(min(w, cx + radius * 3))
    if y1 <= y0 or x1 <= x0:
        return
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    d2 = ((xx - cx) ** 2 + (yy - cy) ** 2) / (radius ** 2)
    g = np.exp(-d2)[..., None] * strength
    arr[y0:y1, x0:x1] += g * hexc(color) if isinstance(color, str) else g * np.array(color, dtype=np.float32)


def ridge(w, h, base, amp, seed, octaves=4, rough=0.5):
    """y-values of a rolling ridge line."""
    rnd = random.Random(seed)
    xs = np.linspace(0, 1, w, dtype=np.float32)
    y = np.zeros(w, dtype=np.float32)
    f, a = 1.5, 1.0
    for _ in range(octaves):
        y += a * np.sin(xs * f * 2 * math.pi + rnd.uniform(0, 6.28))
        f *= 2.1
        a *= rough
    y = y / (np.abs(y).max() + 1e-6)
    return base + y * amp


def fill_below(arr, line, color, alpha=1.0, fade=None):
    h, w, _ = arr.shape
    ys = np.arange(h, dtype=np.float32)[:, None]
    mask = (ys >= line[None, :]).astype(np.float32)
    # 1px soft edge for anti-aliasing
    mask = np.clip(ys - line[None, :] + 0.5, 0, 1)
    col = hexc(color) if isinstance(color, str) else np.array(color, dtype=np.float32)
    if fade:  # darken toward the bottom
        t = np.clip((ys - line[None, :]) / fade, 0, 1)[..., None]
        col = col * (1 - 0.35 * t)
    a = (mask * alpha)[..., None]
    arr[:] = arr * (1 - a) + col * a


def stars(arr, rnd, n, ymax=0.7, bright=1.0):
    h, w, _ = arr.shape
    for _ in range(n):
        x, y = rnd.randrange(w), int(rnd.random() ** 1.4 * h * ymax)
        b = rnd.uniform(0.3, 1.0) * bright
        r = rnd.choice([1, 1, 1, 2])
        arr[max(0, y - r):y + r, max(0, x - r):x + r] += 255 * b


def bokeh(arr, rnd, n, colors, rmin, rmax, alpha=(0.15, 0.5), region=None):
    h, w, _ = arr.shape
    x0, y0, x1, y1 = region or (0, 0, w, h)
    for _ in range(n):
        cx, cy = rnd.uniform(x0, x1), rnd.uniform(y0, y1)
        r = rnd.uniform(rmin, rmax)
        c = hexc(rnd.choice(colors))
        ys, ye = int(max(0, cy - r)), int(min(h, cy + r + 1))
        xs, xe = int(max(0, cx - r)), int(min(w, cx + r + 1))
        if ye <= ys or xe <= xs:
            continue
        yy, xx = np.mgrid[ys:ye, xs:xe].astype(np.float32)
        d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / r
        disk = np.clip((1 - d) * 6, 0, 1) * 0.55 + np.clip((1 - np.abs(d - 0.92) * 9), 0, 1) * 0.45
        arr[ys:ye, xs:xe] += disk[..., None] * c * rnd.uniform(*alpha)


def vignette(arr, strength=0.35):
    h, w, _ = arr.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.hypot((xx - w / 2) / (w / 2), (yy - h / 2) / (h / 2))
    arr *= (1 - strength * np.clip(d - 0.35, 0, 1) ** 1.6)[..., None]


def finish(arr, path, seed, grain=5.0, blur=0.0, size=None):
    rnd = np.random.default_rng(seed)
    arr = np.clip(arr, 0, 255)
    img = Image.fromarray(arr.astype("uint8"))
    if blur:
        img = img.filter(ImageFilter.GaussianBlur(blur))
    if size:
        img = img.resize(size, Image.LANCZOS)
    a = np.asarray(img).astype(np.float32)
    a += rnd.normal(0, grain, a.shape[:2])[..., None]  # fine film grain
    Image.fromarray(np.clip(a, 0, 255).astype("uint8")).save(path, quality=82, optimize=True, progressive=True)


def canvas(w, h, stops):
    return vgrad(w * SS, h * SS, stops)


def sun(a, cx, cy, r, core="#fff2cf", halo="#ff9c6b"):
    add_glow(a, cx, cy, r * 6, halo, 0.55)
    add_glow(a, cx, cy, r * 2.2, "#ffc58a", 0.55)
    yy, xx = np.mgrid[int(cy - r) - 2:int(cy + r) + 3, int(cx - r) - 2:int(cx + r) + 3].astype(np.float32)
    d = np.hypot(xx - cx, yy - cy)
    m = np.clip(r - d, 0, 1)[..., None]
    a[int(cy - r) - 2:int(cy + r) + 3, int(cx - r) - 2:int(cx + r) + 3] = a[int(cy - r) - 2:int(cy + r) + 3, int(cx - r) - 2:int(cx + r) + 3] * (1 - m) + hexc(core) * m


def birds(a, rnd, n, region, color="#2a1420"):
    h, w, _ = a.shape
    x0, y0, x1, y1 = region
    for _ in range(n):
        cx, cy, s = rnd.uniform(x0, x1), rnd.uniform(y0, y1), rnd.uniform(0.6, 1.2) * w / 60
        for t in np.linspace(-1, 1, 40):
            x = cx + t * s
            y = cy - (1 - abs(t)) * s * 0.28 + abs(t) * s * 0.1
            a[int(y):int(y) + 3, int(x):int(x) + 3] = hexc(color)


# ----------------------------------------------------------------- scenes

def golden_hour(w, h, seed):
    rnd = random.Random(seed)
    a = canvas(w, h, [(0, "#3b2a6b"), (0.35, "#b5478a"), (0.62, "#ff9a7a"), (0.8, "#ffd6a0"), (1, "#ffe9c4")])
    W, H = a.shape[1], a.shape[0]
    sun(a, W * rnd.uniform(0.35, 0.65), H * 0.58, W * 0.05)
    birds(a, rnd, 5, (W * 0.15, H * 0.12, W * 0.8, H * 0.4))
    for i, (b, c) in enumerate([(0.68, "#c0607a"), (0.74, "#8c3f67"), (0.82, "#4d2250"), (0.91, "#25102f")]):
        fill_below(a, ridge(W, H, H * b, H * 0.05, seed + i, rough=0.55), c)
    vignette(a, 0.25)
    return a


def mountains(w, h, seed):
    rnd = random.Random(seed)
    a = canvas(w, h, [(0, "#16234d"), (0.4, "#5a5fa6"), (0.7, "#e9a8b8"), (1, "#fbe3dc")])
    W, H = a.shape[1], a.shape[0]
    stars(a, rnd, 140, 0.4, 0.7)
    add_glow(a, W * 0.72, H * 0.2, W * 0.05, "#fff6e0", 0.9)
    add_glow(a, W * 0.72, H * 0.2, W * 0.2, "#c9c9ff", 0.2)
    cols = ["#8d7bb8", "#6a5a9f", "#4a3d83", "#2d2764", "#171442"]
    for i, c in enumerate(cols):
        fill_below(a, ridge(W, H, H * (0.45 + i * 0.1), H * (0.09 - i * 0.008), seed + 5 + i, 5, 0.6), c)
        fog = vgrad(W, H, [(0, "#000000"), (1, "#000000")])
        add_glow(a, W * 0.5, H * (0.5 + i * 0.1), W * 0.55, "#ffd9e6", 0.07)
    vignette(a, 0.3)
    return a


def rain_window(w, h, seed):
    rnd = random.Random(seed)
    a = canvas(w, h, [(0, "#1d1236"), (0.55, "#43214d"), (1, "#120a1e")])
    W, H = a.shape[1], a.shape[0]
    bokeh(a, rnd, 46, ["#ffb36b", "#ff7a9c", "#ffe0a3", "#9cc4ff", "#ffd1e0"], W * 0.025, W * 0.075, (0.2, 0.5), (0, H * 0.08, W, H * 0.7))
    img = Image.fromarray(np.clip(a, 0, 255).astype("uint8")).filter(ImageFilter.GaussianBlur(W * 0.003))
    a = np.asarray(img).astype(np.float32)
    drops = Image.new("L", (W, H), 0)
    px = drops.load()
    for _ in range(90):  # a few raindrops
        x, y = rnd.randrange(W), rnd.randrange(int(H * 0.8))
        r = rnd.randint(int(W * 0.005), int(W * 0.012))
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                if dx * dx + dy * dy <= r * r and 0 <= x + dx < W and 0 <= y + dy < H:
                    px[x + dx, y + dy] = 190
    d = np.asarray(drops.filter(ImageFilter.GaussianBlur(W * 0.002))).astype(np.float32)[..., None] / 255
    a += d * np.array([190, 200, 240], dtype=np.float32) * 0.45
    # a mug on the sill, with steam
    cx, cy, r = W * 0.5, H * 0.8, W * 0.12
    fill_below(a, np.full(W, H * 0.9, dtype=np.float32), "#150c1c", 0.95)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    body = ((np.abs(xx - cx) < r * (1 - 0.18 * np.clip((yy - cy) / (r * 1.1), 0, 1))) & (yy > cy) & (yy < cy + r * 1.1)).astype(np.float32)[..., None]
    a = a * (1 - body) + hexc("#7a3a4c") * body
    rim = (((np.abs(xx - cx) < r) & (yy > cy - 3) & (yy < cy + r * 0.07))).astype(np.float32)[..., None]
    a = a * (1 - rim) + hexc("#e8b8a0") * rim
    handle = ((np.hypot(xx - (cx + r * 1.02), yy - (cy + r * 0.5)) < r * 0.42) & (np.hypot(xx - (cx + r * 1.02), yy - (cy + r * 0.5)) > r * 0.26) & (xx > cx + r * 0.9)).astype(np.float32)[..., None]
    a = a * (1 - handle) + hexc("#7a3a4c") * handle
    add_glow(a, cx, cy + r * 0.5, r * 2.0, "#ffa95c", 0.16)
    for k in range(3):
        for tt in np.linspace(0, 1, 120):
            x = cx + (k - 1) * r * 0.45 + math.sin(tt * 6 + k) * r * 0.22
            y = cy - tt * r * 2.2
            add_glow(a, x, y, r * 0.1 * (1 + tt), "#ffe9d6", 0.05 * (1 - tt))
    vignette(a, 0.4)
    return a


def garden(w, h, seed):
    rnd = random.Random(seed)
    a = canvas(w, h, [(0, "#9fd0e6"), (0.45, "#f4e2b6"), (1, "#f9c9a6")])
    W, H = a.shape[1], a.shape[0]
    add_glow(a, W * 0.82, H * 0.12, W * 0.1, "#fff6d0", 0.9)
    fill_below(a, np.full(W, H * 0.62, dtype=np.float32), "#d9e8c0", 1.0)
    fill_below(a, ridge(W, H, H * 0.66, H * 0.02, seed, 3), "#a8cf8a")
    for i in range(18):  # potted plants
        cx = W * (0.05 + 0.9 * i / 17) + rnd.uniform(-W * 0.02, W * 0.02)
        base = H * rnd.uniform(0.78, 0.97)
        pw = W * rnd.uniform(0.04, 0.07)
        col = rnd.choice(["#c0603c", "#a8482f", "#d98a5b"])
        yy, xx = np.mgrid[int(base - pw):int(base + pw * 0.2), int(cx - pw):int(cx + pw)]
        a[int(base):int(base + pw * 0.9), int(cx - pw * 0.7):int(cx + pw * 0.7)] = hexc(col)
        for _ in range(rnd.randint(7, 13)):  # leaves
            ang = rnd.uniform(-1.3, 1.3)
            ln = pw * rnd.uniform(1.4, 3.2)
            lc = rnd.choice(["#3f7d3a", "#58a04a", "#2f6a35", "#7fbe5d"])
            for t in np.linspace(0, 1, 60):
                x, y = cx + math.sin(ang) * ln * t, base - math.cos(ang) * ln * t
                rr = max(2, int(pw * 0.32 * math.sin(math.pi * t)))
                a[int(y - rr):int(y + rr), int(x - rr):int(x + rr)] = hexc(lc)
        if rnd.random() < 0.55:
            fx, fy = cx + rnd.uniform(-pw, pw), base - pw * rnd.uniform(1.4, 2.6)
            add_glow(a, fx, fy, pw * 0.28, rnd.choice(["#ff7a9c", "#ffb347", "#fff1f4"]), 1.0)
    for i in range(28):  # fairy lights
        x = W * i / 27
        y = H * 0.12 + math.sin(i * 0.6) * H * 0.04 + (i % 2) * H * 0.012
        add_glow(a, x, y, W * 0.012, "#ffe39a", 1.0)
        add_glow(a, x, y, W * 0.05, "#ffd27a", 0.22)
    vignette(a, 0.18)
    return a


def city_dusk(w, h, seed):
    rnd = random.Random(seed)
    a = canvas(w, h, [(0, "#1c1f55"), (0.42, "#7a4a9c"), (0.7, "#ff8f8a"), (0.88, "#ffd0a3"), (1, "#ffe6c8")])
    W, H = a.shape[1], a.shape[0]
    stars(a, rnd, 90, 0.35, 0.6)
    for layer, (base, col, lit) in enumerate([(0.74, "#5d3a79", 0.0), (0.8, "#35204f", 0.25), (0.9, "#170d2b", 0.5)]):
        x = 0
        while x < W:
            bw = rnd.randint(int(W * 0.04), int(W * 0.1))
            bh = rnd.randint(int(H * 0.08), int(H * (0.28 - layer * 0.05)))
            top = int(H * base) - bh + int(H * 0.08)
            a[top:H, x:x + bw] = hexc(col)
            if lit:
                for wy in range(top + 12, H - 10, int(H * 0.018)):
                    for wx in range(x + 8, x + bw - 8, int(W * 0.016)):
                        if rnd.random() < lit:
                            a[wy:wy + int(H * 0.008), wx:wx + int(W * 0.007)] = hexc(rnd.choice(["#ffd88a", "#ffc46b", "#fff1c9"]))
            x += bw + rnd.randint(0, 6)
    add_glow(a, W * 0.5, H * 0.78, W * 0.5, "#ff9b7a", 0.12)
    vignette(a, 0.25)
    return a


def lanterns(w, h, seed):
    rnd = random.Random(seed)
    a = canvas(w, h, [(0, "#070a24"), (0.5, "#1a1650"), (0.85, "#3a2160"), (1, "#0b0720")])
    W, H = a.shape[1], a.shape[0]
    stars(a, rnd, 220, 0.75, 0.9)
    pts = []
    for _ in range(46):
        x = rnd.uniform(0.04, 0.96) * W
        y = (rnd.random() ** 1.3) * H * 0.78 + H * 0.04
        s = W * rnd.uniform(0.012, 0.03) * (0.6 + y / H)
        pts.append((x, y, s))
        add_glow(a, x, y, s * 3.2, "#ff9a3c", 0.38)
        add_glow(a, x, y, s * 1.2, "#ffd88a", 0.9)
    fill_below(a, np.full(W, H * 0.9, dtype=np.float32), "#0a0820", 0.85)  # dark water
    for x, y, s in pts:  # reflections
        ry = H * 0.9 + (H * 0.9 - y) * 0.18
        if ry < H:
            add_glow(a, x, ry, s * 1.6, "#ff8c3c", 0.16)
    vignette(a, 0.4)
    return a


def long_road(w, h, seed):
    rnd = random.Random(seed)
    a = canvas(w, h, [(0, "#4b3a8c"), (0.45, "#f0788e"), (0.62, "#ffc48a"), (1, "#ffe7b8")])
    W, H = a.shape[1], a.shape[0]
    hy = H * 0.58
    sun(a, W * 0.5, hy - H * 0.02, W * 0.045)
    fill_below(a, ridge(W, H, hy, H * 0.012, seed, 3), "#3d2a55")
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    below = yy > hy
    t = np.clip((yy - hy) / (H - hy), 0, 1)
    road_half = (W * 0.012 + t * W * 0.42)
    road = below & (np.abs(xx - W / 2) < road_half)
    a[below & ~road] = a[below & ~road] * 0.2 + hexc("#2e1f3d") * 0.8
    a[road] = hexc("#3a2c4a") * (1 - t[road][:, None] * 0.0) * 0.9 + hexc("#ff9b80") * (0.25 * (1 - t[road])[:, None])
    dash = road & (np.abs(xx - W / 2) < (road_half * 0.03 + 1)) & (((1 / np.maximum(t, 0.01)) * 2.2) % 2 < 1)
    a[dash] = hexc("#ffe9b0")
    for side in (-1, 1):  # poles
        for k in range(1, 9):
            tt = (k / 9) ** 1.8
            x = W / 2 + side * (W * 0.012 + tt * W * 0.55)
            yb = hy + tt * (H - hy)
            ph = (H * 0.22) * (0.15 + tt * 1.0)
            a[int(yb - ph):int(yb), int(x - max(1, tt * W * 0.006)):int(x + max(1, tt * W * 0.006))] = hexc("#1b1030")
    add_glow(a, W * 0.5, hy, W * 0.45, "#ffa07a", 0.18)
    vignette(a, 0.3)
    return a


def flowers(w, h, seed):
    from PIL import ImageDraw
    rnd = random.Random(seed)
    a = canvas(w, h, [(0, "#fbe9e4"), (0.55, "#f3c9cf"), (1, "#d98aa0")])
    W, H = a.shape[1], a.shape[0]
    bokeh(a, rnd, 34, ["#ffffff", "#ffe3ea", "#ffd0dc"], W * 0.02, W * 0.07, (0.08, 0.22))
    img = Image.fromarray(np.clip(a, 0, 255).astype("uint8")).convert("RGBA")
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    def ellipse_poly(cx, cy, rx, ry, ang, n=36):
        pts = []
        for k in range(n):
            t = 2 * math.pi * k / n
            x, y = math.cos(t) * rx, math.sin(t) * ry
            pts.append((cx + x * math.cos(ang) - y * math.sin(ang), cy + x * math.sin(ang) + y * math.cos(ang)))
        return pts

    heads = []
    for _ in range(16):
        heads.append((W * rnd.uniform(0.14, 0.86), H * rnd.uniform(0.16, 0.56), W * rnd.uniform(0.055, 0.1)))
    heads.sort(key=lambda t: t[1])
    for cx, cy, R in heads:  # stems first so petals sit on top
        x0 = W * 0.5 + (cx - W * 0.5) * 0.35
        pts = []
        for t in np.linspace(0, 1, 40):
            pts.append((x0 + (cx - x0) * t ** 1.5, H * 1.02 + (cy - H * 1.02) * t))
        d.line(pts, fill=(70, 120, 74, 255), width=max(3, int(W * 0.007)))
        mx, my = pts[22]
        d.polygon(ellipse_poly(mx + R * 0.5, my, R * 0.62, R * 0.2, -0.5), fill=(88, 150, 86, 255))
    palettes = [((255, 122, 156), (255, 194, 209)), ((255, 250, 247), (255, 226, 232)), ((255, 179, 71), (255, 227, 166)), ((217, 76, 120), (247, 166, 191)), ((196, 140, 255), (232, 210, 255))]
    for cx, cy, R in heads:
        outer, inner = rnd.choice(palettes)
        n = rnd.randint(6, 9)
        for layer_i, (scale, col) in enumerate([(1.0, outer), (0.68, inner)]):
            for k in range(n):
                ang = 2 * math.pi * k / n + layer_i * math.pi / n + rnd.uniform(-0.08, 0.08)
                px_, py_ = cx + math.cos(ang) * R * 0.5 * scale, cy + math.sin(ang) * R * 0.5 * scale
                d.polygon(ellipse_poly(px_, py_, R * 0.5 * scale, R * 0.27 * scale, ang), fill=col + (235,), outline=(255, 255, 255, 120))
        d.ellipse([cx - R * 0.14, cy - R * 0.14, cx + R * 0.14, cy + R * 0.14], fill=(240, 176, 60, 255))
    layer = layer.filter(ImageFilter.GaussianBlur(0.8))
    # soft drop shadow so the bouquet lifts off the background
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shadow.paste((90, 30, 50, 70), mask=layer.split()[3].filter(ImageFilter.GaussianBlur(W * 0.012)))
    img = Image.alpha_composite(Image.alpha_composite(img, shadow), layer)
    arr = np.asarray(img.convert("RGB")).astype(np.float32)
    vignette(arr, 0.2)
    return arr


def balloons(w, h, seed):
    rnd = random.Random(seed)
    a = canvas(w, h, [(0, "#2a0f3d"), (0.6, "#7a2a63"), (1, "#c2527a")])
    W, H = a.shape[1], a.shape[0]
    bokeh(a, rnd, 60, ["#ffd88a", "#ff9ab8", "#ffffff", "#c9a8ff"], W * 0.015, W * 0.07, (0.15, 0.5))
    for _ in range(11):
        cx, cy, R = W * rnd.uniform(0.08, 0.92), H * rnd.uniform(0.15, 0.7), W * rnd.uniform(0.07, 0.12)
        col = rnd.choice(["#ff5c8a", "#ffc24a", "#ff8c5a", "#c88cff", "#ff9ab8", "#f4e4c1"])
        ys, ye = int(max(0, cy - R * 1.3)), int(min(H, cy + R * 1.5))
        xs, xe = int(max(0, cx - R)), int(min(W, cx + R))
        yy, xx = np.mgrid[ys:ye, xs:xe].astype(np.float32)
        d = ((xx - cx) / R) ** 2 + ((yy - cy) / (R * 1.2)) ** 2
        m = np.clip((1 - d) * 18, 0, 1)[..., None]
        shade = hexc(col) * (0.7 + 0.5 * np.clip(1 - d, 0, 1))[..., None]
        sl = a[ys:ye, xs:xe]
        sl[:] = sl * (1 - m) + shade * m
        add_glow(a, cx - R * 0.35, cy - R * 0.45, R * 0.22, "#ffffff", 0.7)
        for t in np.linspace(0, 1, 140):  # string
            x = cx + math.sin(t * 5 + cx) * R * 0.15
            y = cy + R * 1.2 + t * R * 2.6
            if y < H:
                a[int(y):int(y) + 2, int(x):int(x) + 2] = hexc("#ffe9f1") * 0.8
    vignette(a, 0.35)
    return a


def camp_stars(w, h, seed):
    rnd = random.Random(seed)
    a = canvas(w, h, [(0, "#05071c"), (0.5, "#1b1c58"), (0.85, "#6a3e8c"), (1, "#c0668a")])
    W, H = a.shape[1], a.shape[0]
    stars(a, rnd, 480, 0.85, 1.0)
    for i in range(1400):  # milky way band
        t = rnd.random()
        x = W * (0.1 + 0.8 * t) + rnd.gauss(0, W * 0.05)
        y = H * (0.55 - 0.4 * t) + rnd.gauss(0, H * 0.05)
        if 0 <= x < W and 0 <= y < H:
            a[int(y):int(y) + 2, int(x):int(x) + 2] += 90
    fill_below(a, ridge(W, H, H * 0.86, H * 0.03, seed, 4), "#0d0a24")
    tx, ty = W * 0.62, H * 0.9
    for i in range(int(W * 0.09)):  # tent
        a[int(ty - i * 0.9):int(ty), int(tx - i * 0.5)] = hexc("#2d2358")
        a[int(ty - i * 0.9):int(ty), int(tx + i * 0.5)] = hexc("#2d2358")
    add_glow(a, tx, ty - W * 0.03, W * 0.06, "#ffb25c", 0.85)
    add_glow(a, tx, ty - W * 0.03, W * 0.2, "#ff9640", 0.16)
    vignette(a, 0.4)
    return a


def rooftop(w, h, seed):
    rnd = random.Random(seed)
    a = canvas(w, h, [(0, "#1a1038"), (0.5, "#5c2d66"), (1, "#c8607c")])
    W, H = a.shape[1], a.shape[0]
    stars(a, rnd, 60, 0.4, 0.6)
    for row in range(3):
        pts = []
        for i in range(24):
            x = W * i / 23
            y = H * (0.18 + row * 0.1) + math.sin(i * 0.5 + row) * H * 0.04 + (i % 2) * H * 0.012
            pts.append((x, y))
            add_glow(a, x, y, W * 0.012, "#ffe39a", 1.0)
            add_glow(a, x, y, W * 0.055, "#ffd27a", 0.2)
    bokeh(a, rnd, 40, ["#ffd88a", "#ff9ab8", "#9ad0ff"], W * 0.02, W * 0.06, (0.12, 0.4), (0, H * 0.4, W, H))
    fill_below(a, np.full(W, H * 0.88, dtype=np.float32), "#1a0f2a")
    vignette(a, 0.35)
    return a


def heart_glow(w, h, seed):
    rnd = random.Random(seed)
    a = canvas(w, h, [(0, "#1c0612"), (0.6, "#4a0c24"), (1, "#240610")])
    W, H = a.shape[1], a.shape[0]
    bokeh(a, rnd, 80, ["#ff8aa8", "#ffd1a8", "#ffffff", "#d9728a"], W * 0.01, W * 0.05, (0.1, 0.42))
    cx, cy, S = W * 0.5, H * 0.46, W * 0.016
    for t in np.linspace(0, 2 * math.pi, 600):  # parametric heart
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        add_glow(a, cx + x * S, cy - y * S, W * 0.009, "#ffd9a0", 0.55)
        add_glow(a, cx + x * S, cy - y * S, W * 0.03, "#ff6a8a", 0.12)
    stars(a, rnd, 120, 1.0, 0.8)
    vignette(a, 0.35)
    return a


def rose_bokeh(w, h, seed):
    rnd = random.Random(seed)
    a = canvas(w, h, [(0, "#2a0816"), (0.55, "#6b1631"), (1, "#240610")])
    W, H = a.shape[1], a.shape[0]
    bokeh(a, rnd, 90, ["#ff8aa8", "#ffd1a8", "#e8a3b0", "#f4cfd3", "#d9728a"], W * 0.02, W * 0.1, (0.1, 0.4))
    add_glow(a, W * 0.5, H * 0.4, W * 0.5, "#b3294f", 0.28)
    vignette(a, 0.4)
    return a


# ---------------------------------------------------------------- output

def render(fn, name, w, h, seed, blur=0.0):
    arr = fn(w, h, seed)
    finish(arr, os.path.join(OUT, name), seed, blur=blur * SS, size=(w, h))
    print("wrote", name, os.path.getsize(os.path.join(OUT, name)) // 1024, "KB")


def og_image():
    """1200x630 social-share card used when a link to the site is pasted into chat apps and social networks."""
    from PIL import ImageDraw, ImageFont
    W, H = 1200, 630
    a = rose_bokeh(W // SS * 1, H // SS * 1, 11)  # canvas() doubles it; resize below
    base = Image.fromarray(np.clip(a, 0, 255).astype("uint8")).resize((W, H), Image.LANCZOS)
    art = Image.open(os.path.join(OUT, "hero.jpg")).convert("RGB")
    ph = 470
    art = art.resize((int(art.width * ph / art.height), ph), Image.LANCZOS)
    mask = Image.new("L", art.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, art.width, art.height], radius=36, fill=255)
    base.paste(art, (W - art.width - 90, (H - ph) // 2), mask)
    d = ImageDraw.Draw(base)

    def font(size, bold=False):
        for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
                  "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"):
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
        return ImageFont.load_default()

    d.text((80, 130), "SURPRISE STUDIO", font=font(26), fill=(236, 217, 176))
    for i, line in enumerate(["Create a Birthday", "Surprise They'll", "Never Forget."]):
        d.text((80, 190 + i * 82), line, font=font(66, True), fill=(255, 248, 236))
    d.text((80, 470), "Personal birthday websites with photos,", font=font(28), fill=(240, 220, 225))
    d.text((80, 508), "letters, music and a cake to blow out.", font=font(28), fill=(240, 220, 225))
    base.save(os.path.join(OUT, "..", "og-image.png"), optimize=True)
    print("wrote og-image.png")


if __name__ == "__main__":
    # Ten gallery pictures, mixed portrait / landscape / square so the masonry grid looks natural.
    gallery = [
        (golden_hour, 900, 1200), (mountains, 1200, 900), (rain_window, 900, 900), (garden, 900, 1200), (city_dusk, 1200, 800),
        (lanterns, 900, 1100), (long_road, 1000, 1000), (flowers, 900, 1200), (balloons, 1200, 900), (camp_stars, 900, 1200),
    ]
    for i, (fn, w, h) in enumerate(gallery, 1):
        render(fn, f"gallery-{i:02d}.jpg", w, h, 100 + i)
    for i in (11, 12):  # leftovers from the old demo set
        p = os.path.join(OUT, f"gallery-{i}.jpg")
        if os.path.exists(p):
            os.remove(p)

    render(rose_bokeh, "intro.jpg", 1200, 1600, 7, blur=2)
    render(flowers, "hero.jpg", 900, 1200, 21)
    render(heart_glow, "final.jpg", 1000, 1000, 33)

    timeline = [rooftop, rain_window, heart_glow, mountains, garden]
    for i, fn in enumerate(timeline, 1):
        render(fn, f"timeline-{i}.jpg", 900, 700, 200 + i)

    private = [lanterns, golden_hour, balloons, camp_stars, flowers, city_dusk]
    for i, fn in enumerate(private, 1):
        render(fn, f"private-{i:02d}.jpg", 900, 1200 if i % 2 else 900, 300 + i)

    # A short silent clip for the private vault: a slow zoom over the lantern scene.
    frame = os.path.join(OUT, "_video_frame.jpg")
    render(lanterns, "_video_frame.jpg", 1280, 720, 999)
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", frame, "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
        "-vf", "zoompan=z='min(zoom+0.0012,1.25)':d=125:s=1280x720:fps=25,format=yuv420p",
        "-t", "5", "-c:v", "libx264", "-preset", "veryfast", "-crf", "30", "-c:a", "aac", "-b:a", "48k", "-shortest",
        "-movflags", "+faststart", os.path.join(OUT, "private-video.mp4"),
    ], check=True)
    os.remove(frame)
    og_image()
    print("done")
