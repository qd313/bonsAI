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
side that meets another stretch, so the fade darkens only frames nobody needs to see. A stretch
with a third number holds its last frame that many seconds: the panel scrolls away from an answer
the moment it finishes, so a pause on the finished answer has to be a held frame.

Cut only a wait longer than about five seconds; shorter pauses and moving around the panel play
through (the maintainer, 2026-10-30: fewer fades, more navigation).
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

# clip name -> (shape, stretches in seconds of that shape's video, each (start, end[, hold]))
CLIPS: dict[str, tuple[str, list[tuple[float, ...]]]] = {
    "ask-about-your-game": ("panel", [(10.5, 30.5), (38.5, 59.3, 2.5)]),
    "wiki-notes": ("panel", [(1.5, 5), (24, 44)]),
    "your-notes": ("full", [(2.5, 17.5), (25, 38), (48, 58)]),
    "spoiler": ("panel", [(3.5, 31)]),
    "strategy-checklist": ("panel", [(13.5, 35)]),
    "ask-about-a-screenshot": ("full", [(9, 23.5), (33.5, 48), (69.5, 79)]),
    "search": ("full", [(0.5, 8), (33, 53)]),
    "reply-ready": ("full", [(2, 8), (17.5, 24)]),
    "saved-chats": ("full", [(0.5, 9), (63, 82)]),
    "talk": ("panel", [(8.5, 17)]),
    "show-details": ("panel", [(0, 13)]),
    "first-run": ("crop", [(0, 20)]),
}


def build(name: str) -> None:
    shape, keep = CLIPS[name]
    src = SRC_DIR / f"{name}-deck-{shape}.mp4"
    out = OUT_DIR / f"{name}.gif"
    half = FADE / 2
    parts, lengths = [], []
    for i, (a, b, *hold) in enumerate(keep):
        a = max(a - (half if i else 0), 0)
        tail = half if i < len(keep) - 1 else 0
        # A held stretch takes its fade margin from the frozen frame, not from later footage.
        hold_s = hold[0] + tail if hold else 0
        b = b if hold else b + tail
        freeze = f",tpad=stop_mode=clone:stop_duration={hold_s}" if hold_s else ""
        parts.append(f"[0:v]trim={a}:{b},setpts=PTS-STARTPTS,fps={FPS},"
                     f"scale={WIDTH[shape]}:-2:flags=lanczos,format=yuv420p{freeze}[s{i}]")
        lengths.append(b - a + hold_s)
    cur, length = "s0", lengths[0]
    for i in range(1, len(keep)):
        offset = length - FADE
        parts.append(f"[{cur}][s{i}]xfade=transition=fadeblack:duration={FADE}:offset={offset:.3f}[x{i}]")
        cur = f"x{i}"
        length = offset + lengths[i]
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
