#!/usr/bin/env python3
"""Generate a 9:16 12s demo short-form reel with 4 distinct scenes."""
from __future__ import annotations

import math
import os
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 640, 1136
FPS = 20
SCENE_LEN = 3  # seconds
TOTAL = 12
FONT = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
OUT = "/workspace/public/samples/demo.mp4"


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def clamp(v: float, lo: float = 0, hi: float = 255) -> int:
    return int(max(lo, min(hi, v)))


def font(size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(FONT, size)
    except Exception:
        return ImageFont.load_default()


def scene_cafe(t: float) -> Image.Image:
    img = Image.new("RGB", (W, H), (28, 16, 10))
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, int(H * 0.55), W, H), fill=(42, 24, 14))
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    orbs = [
        (160, 380, 90, (232, 184, 109, 80)),
        (460, 520, 70, (255, 210, 140, 55)),
        (300, 720, 110, (180, 90, 40, 45)),
        (120, 860, 50, (255, 220, 160, 70)),
        (520, 300, 40, (255, 200, 120, 60)),
    ]
    for i, (x, y, r, col) in enumerate(orbs):
        dx = math.sin(t * 0.7 + i) * 18
        dy = math.cos(t * 0.5 + i * 0.6) * 14
        d.ellipse((x + dx - r, y + dy - r, x + dx + r, y + dy + r), fill=col)
    overlay = overlay.filter(ImageFilter.GaussianBlur(18))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(img)
    draw.text((W / 2, 210), "CAFE", font=font(72), fill=(250, 244, 232), anchor="mm")
    draw.text((W / 2, 280), "감성 브이로그", font=font(28), fill=(232, 184, 109), anchor="mm")
    return img



def scene_street(t: float) -> Image.Image:
    img = Image.new("RGB", (W, H), (10, 16, 24))
    draw = ImageDraw.Draw(img)
    for i in range(18):
        x = int((i * 42 + t * 80) % (W + 40) - 20)
        shade = 20 + (i * 9) % 40
        draw.rectangle((x, 0, x + 10, H), fill=(shade, shade + 8, shade + 18))
    haze = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    hd = ImageDraw.Draw(haze)
    hd.rectangle((0, int(H * 0.55), W, H), fill=(30, 50, 70, 90))
    img = Image.alpha_composite(img.convert("RGBA"), haze).convert("RGB")
    d = ImageDraw.Draw(img)
    d.text((W / 2, 200), "STREET", font=font(64), fill=(220, 230, 240), anchor="mm")
    d.text((W / 2, 268), "골목 하이라이트", font=font(26), fill=(140, 170, 190), anchor="mm")
    return img


def scene_closeup(t: float) -> Image.Image:
    img = Image.new("RGB", (W, H), (8, 18, 16))
    draw = ImageDraw.Draw(img)
    for i in range(8):
        k = i / 8
        r = int(40 + k * 220)
        col = (int(8 + k * 20), int(18 + k * 70), int(16 + k * 60))
        draw.ellipse((W / 2 - r, H * 0.46 - r * 1.25, W / 2 + r, H * 0.46 + r * 1.25), fill=col)
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    pulse = 1 + 0.05 * math.sin(t * 2.2)
    rx, ry = 140 * pulse, 180 * pulse
    cx, cy = W / 2, H * 0.46
    od.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), outline=(94, 234, 212, 220), width=4)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((cx - 90, cy - 110, cx + 90, cy + 110), fill=(94, 234, 212, 50))
    glow = glow.filter(ImageFilter.GaussianBlur(24))
    img = Image.alpha_composite(img.convert("RGBA"), glow)
    img = Image.alpha_composite(img, overlay).convert("RGB")
    d = ImageDraw.Draw(img)
    d.text((W / 2, H * 0.78), "CLOSE UP", font=font(48), fill=(244, 244, 245), anchor="mm")
    d.text((W / 2, H * 0.84), "표정 컷", font=font(26), fill=(94, 234, 212), anchor="mm")
    return img



def scene_ending(t: float) -> Image.Image:
    img = Image.new("RGB", (W, H), (10, 10, 12))
    draw = ImageDraw.Draw(img)
    s = 80 + 8 * math.sin(t * 1.5)
    cx, cy = W / 2, H * 0.42
    draw.rounded_rectangle(
        (cx - s, cy - s, cx + s, cy + s),
        radius=28,
        outline=(94, 234, 212),
        width=4,
    )
    draw.polygon(
        [(cx - 18, cy - 28), (cx - 18, cy + 28), (cx + 30, cy)],
        fill=(94, 234, 212),
    )
    fade = min(1.0, t / 0.6)
    col = (int(244 * fade), int(244 * fade), int(245 * fade))
    draw.text((W / 2, H * 0.62), "KLIPO", font=font(72), fill=col, anchor="mm")
    draw.text((W / 2, H * 0.70), "키워드로 컷을 만들다", font=font(24), fill=(158, 158, 166), anchor="mm")
    return img


def frame_at(i: int) -> Image.Image:
    t_abs = i / FPS
    if t_abs < 3:
        return scene_cafe(t_abs)
    if t_abs < 6:
        return scene_street(t_abs - 3)
    if t_abs < 9:
        return scene_closeup(t_abs - 6)
    return scene_ending(t_abs - 9)


def main() -> None:
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    n = FPS * TOTAL
    cmd = [
        "ffmpeg",
        "-y",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-s",
        f"{W}x{H}",
        "-r",
        str(FPS),
        "-i",
        "-",
        "-f",
        "lavfi",
        "-i",
        "anoisesrc=color=pink:d=12:a=0.04,lowpass=f=500,volume=0.5",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-crf",
        "26",
        "-preset",
        "fast",
        "-c:a",
        "aac",
        "-b:a",
        "96k",
        "-shortest",
        "-movflags",
        "+faststart",
        OUT,
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    assert proc.stdin is not None
    for i in range(n):
        img = frame_at(i)
        proc.stdin.write(img.tobytes())
        if i % 40 == 0:
            print(f"frame {i}/{n}", file=sys.stderr)
    proc.stdin.close()
    err = proc.stderr.read().decode("utf-8", errors="replace") if proc.stderr else ""
    code = proc.wait()
    if code != 0:
        print(err[-2000:], file=sys.stderr)
        raise SystemExit(code)
    print("wrote", OUT, os.path.getsize(OUT))


if __name__ == "__main__":
    main()
