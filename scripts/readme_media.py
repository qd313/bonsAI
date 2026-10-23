#!/usr/bin/env python3
"""Title: README clip cutter

Purpose: Cut one README master recording into the six shapes the README uses (plans 95 and 99).
Used for: `python scripts/readme_media.py <master> --clip <name> --screen deck|monitor`.
Solves: Every clip comes in two screens and two shapes; one script with the crop and avatar boxes
    measured once per screen keeps them all alike, and a clip can be re-cut without re-filming.
Does not: Record anything, speed anything up, or copy files into `assets/readme/`. It also never
    checks the 10 MB limit GitHub puts on a hand-uploaded video; look at the size it prints.

A master is one real-time screen recording from the Deck (`deck_record`, saved under
`recordings/` as `<clip>-<deck|monitor>.mkv`). It is never edited; this script only cuts from it:

  <clip>-<screen>-full.mp4   whole screen, H.264, 1280 wide, source frame rate up to 60, no sound (hand upload)
  <clip>-<screen>-full.webp  whole screen as a self-playing animated WebP, 560 wide, 30 fps, quality 90
  <clip>-<screen>-panel.webp the plugin column alone as an animated WebP, 360 wide, 30 fps, quality 90
  <clip>-<screen>-full.gif   whole screen, 560 wide, 10 fps, two-pass 128-color palette (older shape)
  <clip>-<screen>-panel.gif  the plugin column alone, 360 wide, 10 fps (older shape)
  <clip>-<screen>-panel.mp4  the plugin column alone as a video

Nothing is sped up or cut from the middle: --start and --end only trim the ends. The Steam avatar
sits in the Quick Access Menu's top bar even over a running game, so every whole-screen cut gets a
black box over it; the panel crop starts below that bar and never shows it.

Usage:
  python scripts/readme_media.py recordings/ask-deck.mkv --clip ask --screen deck [--start 1.5] [--end 80]
  python scripts/readme_media.py ... --only panel.webp    # one shape
  python scripts/readme_media.py ... --still 12.0         # one PNG frame of each shape instead
"""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path

OUT_DIR = Path("recordings/readme-cuts")

# Measured once per screen from a frame of a master, in that master's own pixels (x, y, w, h).
# deck: 1280x800, measured 2026-10-17 from a screenshot of today's build over a running game.
SCREENS = {
    "deck": {
        "panel": (831, 58, 449, 682),
        "avatar": (1192, 0, 88, 62),
        # Steam's own profile card (avatar and name), drawn top right while the menu is closed or a
        # Steam box is up. It overlaps the plugin's corner when the menu is open, so it is only
        # blacked out in the time ranges --card names.
        "card": (1138, 24, 142, 172),
    },
    # monitor: 1920x1080, measured 2026-10-17 from a screenshot of today's build over a running game.
    "monitor": {
        "panel": (1536, 48, 384, 986),
        "avatar": (1840, 0, 80, 46),
        "card": (1630, 30, 200, 235),
    },
}

SHAPES = ("full.mp4", "full.webp", "panel.webp", "full.gif", "panel.gif", "panel.mp4")

# GitHub refuses a hand-uploaded video over 10 MB; raise this for a long clip that does not fit.
FULL_MP4_CRF = 23
MAX_FPS = 60


def _source_fps(master: Path) -> float:
    """The master's nominal frame rate (a variable-rate master reports its top rate)."""
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate",
         "-of", "default=nw=1:nk=1", str(master)], capture_output=True, text=True, check=True)
    num, _, den = probe.stdout.strip().partition("/")
    return float(num) / float(den or 1)


def _out_fps(shape: str, source_fps: float) -> str:
    """Frame rate for a shape: GIFs 10, WebP 30, the whole-screen video the source's up to 60."""
    if shape.endswith(".gif"):
        return "10"
    if shape.endswith(".webp") or shape == "panel.mp4":
        return "30"
    return f"{min(source_fps, MAX_FPS):g}"


def _filters(screen: dict, shape: str, cards: list[tuple[float, float]] = (),
             source_fps: float = 30) -> str:
    """The ffmpeg filter chain for one shape, before any GIF palette step."""
    steps = []
    if shape.startswith("full"):
        x, y, w, h = screen["avatar"]
        steps.append(f"drawbox=x={x}:y={y}:w={w}:h={h}:color=black:t=fill")
        for a, b in cards:
            x, y, w, h = screen["card"]
            steps.append(f"drawbox=x={x}:y={y}:w={w}:h={h}:color=black:t=fill:enable='between(t,{a},{b})'")
    else:
        x, y, w, h = screen["panel"]
        steps.append(f"crop={w}:{h}:{x}:{y}")
    width = {"full.mp4": 1280, "full.webp": 560, "panel.webp": 360, "full.gif": 560,
             "panel.gif": 360, "panel.mp4": 0}[shape]
    if width:
        steps.append(f"scale={width}:-2:flags=lanczos")
    # Masters are variable frame rate (the Deck sends no frame when nothing moves); a fixed rate
    # repeats the last frame instead, so the clip keeps its real-time length.
    steps.append(f"fps={_out_fps(shape, source_fps)}")
    return ",".join(steps)


def _run(args: list[str]) -> None:
    print(" ".join(args))
    subprocess.run(args, check=True)


def cut(master: Path, clip: str, screen_name: str, shape: str, start: float | None,
        end: float | None, still: float | None, cards: list[tuple[float, float]] = ()) -> Path:
    screen = SCREENS[screen_name]
    # Card times are given in the master's own seconds; a trimmed cut starts its clock at zero.
    shift = start or 0
    cards = [(a - shift, b - shift) for a, b in cards] if still is None else [(0, 1e9) for _ in cards[:1]]
    trim = []
    if start is not None:
        trim += ["-ss", str(start)]
    if end is not None:
        trim += ["-to", str(end)]
    chain = _filters(screen, shape, cards, _source_fps(master))
    base = ["ffmpeg", "-v", "error", "-y"]
    if still is not None:
        out = OUT_DIR / f"{clip}-{screen_name}-{shape.split('.')[0]}.png"
        _run(base + ["-ss", str(still), "-i", str(master), "-frames:v", "1",
                     "-vf", re.sub(r"fps=[0-9.]+", "null", chain), str(out)])
        return out
    out = OUT_DIR / f"{clip}-{screen_name}-{shape}"
    if shape == "full.mp4":
        _run(base + trim + ["-i", str(master), "-an", "-vf", chain, "-c:v", "libx264",
                            "-crf", str(FULL_MP4_CRF), "-preset", "slow", "-pix_fmt", "yuv420p",
                            "-movflags", "+faststart", str(out)])
    elif shape.endswith(".mp4"):
        _run(base + trim + ["-i", str(master), "-an", "-vf", chain, "-c:v", "libx264",
                            "-preset", "slow", "-b:v", "600k", "-maxrate", "900k",
                            "-bufsize", "1800k", "-pix_fmt", "yuv420p",
                            "-movflags", "+faststart", str(out)])
    elif shape.endswith(".webp"):
        _run(base + trim + ["-i", str(master), "-an", "-vf", chain, "-c:v", "libwebp_anim",
                            "-quality", "90", "-loop", "0", "-compression_level", "6",
                            "-pix_fmt", "yuv420p", str(out)])
    else:
        gif = (f"{chain},split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];"
               f"[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle")
        _run(base + trim + ["-i", str(master), "-an", "-filter_complex", gif, str(out)])
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("master", type=Path)
    parser.add_argument("--clip", required=True, help="short clip name, e.g. ask-about-your-game")
    parser.add_argument("--screen", required=True, choices=sorted(SCREENS))
    parser.add_argument("--start", type=float, help="trim this many seconds off the start")
    parser.add_argument("--end", type=float, help="stop at this second of the master")
    parser.add_argument("--only", choices=SHAPES, action="append", help="cut only these shapes")
    parser.add_argument("--still", type=float, help="write one PNG per shape at this second")
    parser.add_argument("--card", action="append", default=[], metavar="FROM-TO",
                        help="black out Steam's profile card between these master seconds (repeatable)")
    opts = parser.parse_args()

    if not shutil.which("ffmpeg"):
        print("ffmpeg is not on PATH", file=sys.stderr)
        return 1
    if not opts.master.is_file():
        print(f"no such master: {opts.master}", file=sys.stderr)
        return 1
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    shapes = opts.only or list(SHAPES)
    if opts.still is not None:
        shapes = [s for s in shapes if s.endswith((".gif", ".webp"))]
    for shape in shapes:
        cards = [tuple(float(v) for v in c.split("-")) for c in opts.card]
        out = cut(opts.master, opts.clip, opts.screen, shape, opts.start, opts.end, opts.still, cards)
        print(f"{out}  {out.stat().st_size / 1_000_000:.2f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
