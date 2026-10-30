#!/usr/bin/env python3
"""Title: README GIF builder

Purpose: Turn the README clips into short, self-playing GIFs, every one cut the same way.
Used for: `python scripts/readme_gifs.py [clip ...]` after `scripts/readme_media.py` has cut the
    panel and whole-screen videos into `recordings/readme-cuts/`.
Solves: The clips are real time, so most of their length is waiting for the AI. This keeps only
    the stretches listed below and joins them with a one-second fade through black, so every cut
    is easy to see and looks the same in every GIF.
Does not: Speed anything up. Each kept stretch plays at its real speed. It never records or
    re-cuts a master either; change a clip's stretches here and run it again.

Each stretch is the part that must be fully visible. The script widens it by half a fade on each
side that meets another stretch, so the fade darkens only frames nobody needs to see.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

SRC_DIR = Path("recordings/readme-cuts")
OUT_DIR = Path("assets/readme")
FADE = 1.0  # seconds; the maintainer asked for a slower fade than 0.5 (2026-10-29)
FPS = 15
# "crop" is the first-run popups alone; its video was rebuilt at 30 fps from the WebP the README
# used before, since that crop box was never written down.
WIDTH = {"panel": 360, "full": 640, "crop": 600}

# clip name -> (shape, stretches in seconds of that shape's video)
CLIPS: dict[str, tuple[str, list[tuple[float, float]]]] = {
    "ask-about-your-game": ("panel", [(13, 17), (26, 30.5), (40, 46), (59.5, 63), (77, 81.5), (85.5, 89), (90, 95)]),
    "wiki-notes": ("panel", [(1.5, 5), (24.5, 30), (35.5, 44)]),
    "your-notes": ("full", [(2.5, 6), (9, 17.5), (25.5, 29), (33, 36), (50, 58)]),
    "spoiler": ("panel", [(3.5, 11), (22, 31)]),
    "strategy-checklist": ("panel", [(13.5, 20), (23, 27), (28.5, 34)]),
    "ask-about-a-screenshot": ("full", [(0.5, 3.5), (11.5, 19), (34, 41), (45.5, 49), (69.5, 76)]),
    "search": ("full", [(0.5, 7), (12.5, 16.5), (45.5, 53)]),
    "reply-ready": ("full", [(2, 7.5), (17.5, 23)]),
    "saved-chats": ("full", [(0.5, 8.5), (63.5, 74), (84, 88)]),
    "talk": ("panel", [(8.5, 17)]),
    "show-details": ("panel", [(0, 6.5), (9, 13)]),
    "first-run": ("crop", [(0, 2.5), (4, 6.5), (14.5, 20)]),
}


def build(name: str) -> None:
    shape, keep = CLIPS[name]
    src = SRC_DIR / f"{name}-deck-{shape}.mp4"
    out = OUT_DIR / f"{name}.gif"
    half = FADE / 2
    padded = [(a - (half if i else 0), b + (half if i < len(keep) - 1 else 0)) for i, (a, b) in enumerate(keep)]

    parts = []
    for i, (a, b) in enumerate(padded):
        parts.append(f"[0:v]trim={max(a, 0)}:{b},setpts=PTS-STARTPTS,fps={FPS},"
                     f"scale={WIDTH[shape]}:-2:flags=lanczos,format=yuv420p[s{i}]")
    cur, length = "s0", padded[0][1] - max(padded[0][0], 0)
    for i in range(1, len(padded)):
        offset = length - FADE
        parts.append(f"[{cur}][s{i}]xfade=transition=fadeblack:duration={FADE}:offset={offset:.3f}[x{i}]")
        cur = f"x{i}"
        length = offset + padded[i][1] - padded[i][0]
    # One palette for the whole GIF, built from what changes, so the fades stay smooth.
    parts.append(f"[{cur}]split[p][q];[p]palettegen=max_colors=192:stats_mode=diff[pal];"
                 "[q][pal]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle[g]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-filter_complex", ";".join(parts),
                    "-map", "[g]", "-loop", "0", str(out)], check=True)
    print(f"{out}: {length:.1f} s, {out.stat().st_size / 1e6:.1f} MB")


def main() -> int:
    names = sys.argv[1:] or list(CLIPS)
    for name in names:
        build(name)
    return 0


if __name__ == "__main__":
    sys.exit(main())
