#!/usr/bin/env python3
"""Title: Screenshot marks eval

Purpose: Find out whether the small picture models the Deck can run are able to put marks on a boss picture. For
         each labelled picture that shows a boss or enemy, and each picture model this PC holds, it asks for up to
         three marks (hit, avoid or dodge), each on one line: the kind, where (across and down, two numbers from 0
         to 1), three words, and sure or not sure. A strict reader turns the reply into marks; a line that does not
         read is counted and never guessed at. Each mark is drawn on a copy of the picture the way the mock-up
         board draws them (hit green, avoid red, dodge amber, numbered, dashed when not sure), at full size and as a
         260 by 140 preview, and one grading sheet per model lists the picture, the boss, the library note's own
         advice for it, and every try's marks in words, so a stronger model can grade them out of ten.
         Plan 103 lane P3.
Used for: the "can the Deck's AI mark a boss picture" decision (plan 103 call 12): the marked screenshot is built
          only if the best model averages 7 or more on at least 15 boss pictures. The labels are
          tests/fixtures/screenshot_eval_v1.json; the pictures, the drawn copies and the sheets all live in the
          workshop (screenshots/plan103-set and screenshots/plan103-marks), never in this repo.
Solves: Nothing measured what a small model does when told to point at things on a picture, so the marked
        screenshot in the mock-up board (tab 5) had no number behind it.
Does not: Grade anything itself, touch the Deck, change the plugin, draw anything inside the plugin, or save a
          report in this repo. Sampling is random, so three tries per picture and model are asked for.

Usage:
  python scripts/kb/eval_screenshot_marks.py --only p1-oot-wolfos-pair --samples 1
  python scripts/kb/eval_screenshot_marks.py --samples 3        # every picture with a boss, every model held

Needs: Ollama on this PC with the models (it is shared; run one measurement at a time), Pillow for the drawing,
       and a built library at --corpus for the notes' advice on the sheets.
"""
from __future__ import annotations

import argparse
import base64
import json
import math
import re
import sqlite3
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any, Callable, Optional

# Nearest folder above this file that holds main.py: no count of folders to break when the script moves.
ROOT = next(p for p in Path(__file__).resolve().parents if (p / "main.py").is_file())
sys.path.insert(0, str(Path(__file__).resolve().parent))
import eval_screenshot_reading as reading  # noqa: E402  (the picture labels, their loader, the model helpers)

DEFAULT_LABELS = ROOT / "tests" / "fixtures" / "screenshot_eval_v1.json"
DEFAULT_CORPUS = ROOT / "build" / "knowledge-base"
DEFAULT_OLLAMA = reading.DEFAULT_OLLAMA
# The picture models the Deck offers, the starter first. The script asks only for the ones this PC holds.
DEFAULT_MODELS = "gemma4:e2b-it-qat,qwen2.5vl:3b,qwen3.5:4b,llava:7b"

# --- the question ----------------------------------------------------------------------------

# The example in the question shows the form only. Its numbers and words are ones no real picture would earn on
# merit (the far lower-left corner, a purple teapot), so a model that copies it is caught, not rewarded.
EXAMPLE_KIND, EXAMPLE_X, EXAMPLE_Y, EXAMPLE_WORDS, EXAMPLE_SURE = "avoid", 0.04, 0.96, "purple teapot", "sure"
EXAMPLE_LINE = f"{EXAMPLE_KIND}, {EXAMPLE_X}, {EXAMPLE_Y}, {EXAMPLE_WORDS}, {EXAMPLE_SURE}"
SYSTEM_TEXT = "You look at one video game screenshot and point at things on it. No other text."
QUESTION = (
    "Mark up to three things on this screenshot that matter when fighting the boss or enemy you can see. "
    "Write one line per mark and nothing else, in exactly this form: kind, x, y, three words, sure. "
    "The kind is hit (a weak point to attack), avoid (something that hurts you) or dodge (an attack to step away "
    "from). x is how far across the picture from the left edge and y is how far down from the top edge, each a "
    "number from 0 to 1. Then three words naming the thing. End with sure, or with not sure when you are guessing. "
    f"This line shows the form only and is not an answer: {EXAMPLE_LINE}. "
    "If you cannot see a boss or an enemy, write the single word none."
)
MAX_MARKS = 3
KINDS = ("hit", "avoid", "dodge")
NO_MARKS_WORD = "none"
# Allowed in the three words: letters, digits, an apostrophe or a hyphen; 1 to 6 words.
MAX_WORDS = 6
ASK_OPTIONS = {"num_predict": 200, "num_ctx": 8192}
SECONDS_PER_ASK_LIMIT = 300
BUSY_RETRIES = 2  # plan 103 rule 10: the model is shared; wait two minutes and try again, twice
BUSY_WAIT_SECONDS = 120


# --- the strict reader -----------------------------------------------------------------------

@dataclass
class Mark:
    n: int
    kind: str
    x: float
    y: float
    words: str
    sure: bool


@dataclass
class MarkReading:
    """What one reply turned into. ``marks`` are the first three that read; ``unread`` lists every line that did
    not (kept word for word); ``extra`` counts marks that read but came after the third and were left out;
    ``said_none`` is a reply that was only the word none (an honest empty answer, not a failure to read);
    ``copied`` lists the lines whose numbers and words are the question's example, word for word: not a mark and
    not an unread line, counted on their own."""

    marks: list[Mark] = field(default_factory=list)
    unread: list[str] = field(default_factory=list)
    copied: list[str] = field(default_factory=list)
    extra: int = 0
    lines: int = 0
    said_none: bool = False

    @property
    def clean(self) -> bool:
        """The reply read without a single line lost or copied."""
        return not self.unread and not self.copied and (bool(self.marks) or self.said_none)


_NUMBER = r"(?:0(?:\.\d+)?|1(?:\.0+)?|\.\d+)"
_WORD = r"[A-Za-z0-9][A-Za-z0-9'’-]*"
_MARK_LINE = re.compile(
    r"^(?P<kind>hit|avoid|dodge)\s*,\s*(?P<x>" + _NUMBER + r")\s*,\s*(?P<y>" + _NUMBER + r")\s*,\s*"
    r"(?P<words>" + _WORD + r"(?:\s+" + _WORD + r"){0," + str(MAX_WORDS - 1) + r"})\s*,\s*(?P<sure>not sure|sure)$",
    re.IGNORECASE,
)
# A list mark in front of a line is not part of the mark: "1." "2)" "-" "*".
_LIST_MARK = re.compile(r"^(?:\d{1,2}[.)]|[-*•])\s+")
_THINK = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)


def _is_example(m: "re.Match[str]") -> bool:
    """A mark line whose two numbers and words are the question's example's (the kind and the sure do not matter:
    a model that copies the numbers and the words has copied the example, whatever it changed around them)."""
    return (float(m.group("x")), float(m.group("y"))) == (EXAMPLE_X, EXAMPLE_Y) and (
        " ".join(m.group("words").split()).lower() == EXAMPLE_WORDS)


def read_marks(reply: str) -> MarkReading:
    """Read a reply strictly. Every non-blank line must be a mark in exactly the asked form (a list mark in front
    is allowed), or the single word none. A line with the example's numbers and words is "copied", not a mark. A kind that is not hit, avoid or dodge, a number outside 0 to 1 or
    written as a percent, a missing or wrong sure, or more than six words all leave the line unread. Nothing is
    repaired, reordered or guessed; a line that does not read is kept in ``unread`` so it can be counted."""
    out = MarkReading()
    text = _THINK.sub("", str(reply or "")).replace("**", "")
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        out.lines += 1
        body = _LIST_MARK.sub("", line).strip().rstrip(".").strip()
        if body.lower() == NO_MARKS_WORD:
            out.said_none = True
            continue
        m = _MARK_LINE.match(body)
        if not m:
            out.unread.append(line)
            continue
        if _is_example(m):
            out.copied.append(line)
            continue
        if len(out.marks) >= MAX_MARKS:
            out.extra += 1
            continue
        out.marks.append(Mark(
            n=len(out.marks) + 1, kind=m.group("kind").lower(), x=float(m.group("x")), y=float(m.group("y")),
            words=" ".join(m.group("words").split()), sure=m.group("sure").lower() == "sure"))
    if out.marks:
        out.said_none = False  # a reply with marks and a stray "none" is a reply with marks
    return out


def where_in_words(x: float, y: float) -> str:
    """Plain words for a spot, by thirds: "upper left", "middle right", "lower centre", "centre"."""
    col = "left" if x < 1 / 3 else ("right" if x >= 2 / 3 else "centre")
    row = "upper" if y < 1 / 3 else ("lower" if y >= 2 / 3 else "middle")
    if row == "middle" and col == "centre":
        return "centre"
    return f"{row} {col}"


def mark_in_words(mark: Mark) -> str:
    sure = "sure" if mark.sure else "not sure"
    return f'{mark.n}. {mark.kind} at ({mark.x:.2f}, {mark.y:.2f}), {where_in_words(mark.x, mark.y)}: "{mark.words}", {sure}'


# --- the drawing's arithmetic ----------------------------------------------------------------
# The numbers are the mock-up board's own (docs/demos/mockup-board/src/45b-maps-r2.js, m5ShotSvg): a picture 260
# units wide, a circle of radius 14 to 22, a stroke of 2, a number badge of radius 7 at the circle's upper right
# (0.72 of the radius out each way), the number 9 units tall, dashes of 4 and gaps of 3 when not sure.

BOARD_WIDTH = 260
BOARD_HEIGHT = 140
MARK_RADIUS = 18  # between the board's 14 and 22: the model gives a spot, not a size
STROKE = 2
BADGE_RADIUS = 7
BADGE_OFFSET = 0.72
FONT_SIZE = 9
DASH = 4
GAP = 3
COLOURS = {"hit": "#7dff9a", "avoid": "#ff8a7a", "dodge": "#ffd36b"}
BADGE_TEXT = "#0b0f14"
PREVIEW_BACKGROUND = "#0b0f14"
SUPERSAMPLE = 4


@dataclass(frozen=True)
class Geometry:
    cx: float
    cy: float
    r: float
    stroke: float
    badge_cx: float
    badge_cy: float
    badge_r: float
    font: float
    dash_deg: float  # how many degrees of the ring one dash covers
    gap_deg: float


def mark_geometry(mark: Mark, width: float, height: float) -> Geometry:
    """Where and how big a mark is on a picture ``width`` by ``height``: the board's numbers, scaled by how much
    wider the picture is than the board's 260 units."""
    s = width / BOARD_WIDTH
    r = MARK_RADIUS * s
    cx, cy = mark.x * width, mark.y * height
    per_unit = 180.0 / (math.pi * r)  # degrees of ring per board-unit-scaled pixel along it
    return Geometry(
        cx=cx, cy=cy, r=r, stroke=STROKE * s,
        badge_cx=cx + r * BADGE_OFFSET, badge_cy=cy - r * BADGE_OFFSET, badge_r=BADGE_RADIUS * s,
        font=FONT_SIZE * s, dash_deg=DASH * s * per_unit, gap_deg=GAP * s * per_unit)


def dash_spans(geo: Geometry, sure: bool) -> list[tuple[float, float]]:
    """The arcs of the ring that are painted, as (start, end) degrees. A sure mark is one whole ring; a mark that
    is not sure is dashes of 4 and gaps of 3 board units, the last dash cut to fit."""
    if sure:
        return [(0.0, 360.0)]
    spans, a = [], 0.0
    while a < 360.0:
        spans.append((a, min(a + geo.dash_deg, 360.0)))
        a += geo.dash_deg + geo.gap_deg
    return spans


def fit_box(width: int, height: int, box_w: int = BOARD_WIDTH, box_h: int = BOARD_HEIGHT) -> tuple[int, int, int, int]:
    """The picture shrunk to sit whole inside the 260 by 140 preview: (new width, new height, left, top)."""
    scale = min(box_w / width, box_h / height)
    w, h = max(1, round(width * scale)), max(1, round(height * scale))
    return w, h, (box_w - w) // 2, (box_h - h) // 2


def _require_pillow() -> Any:
    try:
        from PIL import Image, ImageDraw, ImageFont  # noqa: F401
    except ImportError:
        raise SystemExit("Drawing the marks needs Pillow (python -m pip install pillow).")
    import PIL

    return PIL


def _font(size: float) -> Any:
    from PIL import ImageFont

    px = max(8, round(size))
    for name in ("arialbd.ttf", "DejaVuSans-Bold.ttf", "Arial Bold.ttf"):
        try:
            return ImageFont.truetype(name, px)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_marks(image: Any, marks: list[Mark]) -> Any:
    """The picture with the marks drawn on a copy. Drawn four times larger and shrunk back so the rings are smooth."""
    _require_pillow()
    from PIL import Image, ImageDraw

    base = image.convert("RGBA")
    w, h = base.size
    big = SUPERSAMPLE
    overlay = Image.new("RGBA", (w * big, h * big), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    for mark in marks:
        g = mark_geometry(mark, w * big, h * big)
        colour = COLOURS[mark.kind]
        # Pillow draws a ring's width inward from its box, an SVG stroke is centred on its radius (the board's way):
        # grow the box by half the stroke so the ring's middle sits on the radius.
        out_r = g.r + g.stroke / 2
        box = (g.cx - out_r, g.cy - out_r, g.cx + out_r, g.cy + out_r)
        for start, end in dash_spans(g, mark.sure):
            if end - start >= 359.99:
                d.ellipse(box, outline=colour, width=max(1, round(g.stroke)))
            else:
                d.arc(box, start, end, fill=colour, width=max(1, round(g.stroke)))
        d.ellipse((g.badge_cx - g.badge_r, g.badge_cy - g.badge_r, g.badge_cx + g.badge_r, g.badge_cy + g.badge_r), fill=colour)
        d.text((g.badge_cx, g.badge_cy), str(mark.n), fill=BADGE_TEXT, font=_font(g.font), anchor="mm")
    overlay = overlay.resize((w, h), Image.LANCZOS)
    return Image.alpha_composite(base, overlay).convert("RGB")


def make_preview(image: Any, marks: list[Mark]) -> Any:
    """The 260 by 140 preview: the picture fitted whole on the board's dark ground, the marks drawn at that size."""
    _require_pillow()
    from PIL import Image

    w, h, left, top = fit_box(*image.size)
    small = draw_marks(image.convert("RGB").resize((w, h), Image.LANCZOS), marks)
    canvas = Image.new("RGB", (BOARD_WIDTH, BOARD_HEIGHT), PREVIEW_BACKGROUND)
    canvas.paste(small, (left, top))
    return canvas


# --- asking the model ------------------------------------------------------------------------

@dataclass
class Ask:
    reply: str = ""
    seconds: float = 0.0
    error: str = ""


def _b64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("ascii")


def ask_model(ollama_base: str, model: str, image_path: Path, *, sleep: Callable[[float], None] = time.sleep) -> Ask:
    """One ask with the picture attached, straight to Ollama's chat, the answer thinking switched off, not
    streamed. A timeout means another lane is using the shared model: wait two minutes and try again, twice."""
    body = json.dumps({
        "model": model, "stream": False, "think": False, "options": ASK_OPTIONS, "keep_alive": "10m",
        "messages": [
            {"role": "system", "content": SYSTEM_TEXT},
            {"role": "user", "content": QUESTION, "images": [_b64(image_path)]},
        ],
    }).encode("utf-8")
    ask = Ask()
    for attempt in range(BUSY_RETRIES + 1):
        t0 = time.perf_counter()
        try:
            req = urllib.request.Request(f"{ollama_base}/api/chat", data=body, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=SECONDS_PER_ASK_LIMIT) as resp:
                data = json.loads(resp.read())
            ask.reply = str((data.get("message") or {}).get("content") or "")
            ask.error = ""
            ask.seconds = round(time.perf_counter() - t0, 1)
            return ask
        except (TimeoutError, urllib.error.URLError, OSError) as exc:
            ask.error = f"{type(exc).__name__}: {exc}"
            ask.seconds = round(time.perf_counter() - t0, 1)
            if attempt < BUSY_RETRIES:
                sleep(BUSY_WAIT_SECONDS)
        except Exception as exc:  # a reply Ollama sent that is not what was expected
            ask.error = f"{type(exc).__name__}: {exc}"
            ask.seconds = round(time.perf_counter() - t0, 1)
            return ask
    return ask


# --- the library's advice --------------------------------------------------------------------

def _plain_key(text: str) -> str:
    return " ".join(re.sub(r"[^a-z0-9]+", " ", str(text or "").lower().replace("'", "")).split())


def note_advice(db_path: Path, pic: Any) -> list[tuple[str, str]]:
    """The library's own notes for the boss on the picture: (note name, its text). First the note the labels name
    (``expect_section`` and its alternatives) in the picture's game; with no such label, any note of that game
    whose name is the boss's name or one of its aliases. Empty when the library holds none."""
    if not db_path.is_file():
        return []
    wanted = [n for n in [pic.expect_section, *pic.expect_section_also] if n]
    by_boss = not wanted
    if by_boss:
        wanted = [n for n in [pic.boss, *pic.boss_aliases] if n]
    keys = {_plain_key(n) for n in wanted}
    con = sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True)
    try:
        titles = {_plain_key(t) for t in [pic.game, pic.app_name, *pic.game_aliases] if t}
        games = [gid for gid, app, title in con.execute("select game_id, app_id, canonical_title from games")
                 if (pic.app_id and str(app or "") == pic.app_id) or _plain_key(title) in titles]
        if not games:
            return []
        marks = ",".join("?" for _ in games)
        rows = con.execute(f"select name, card from sections where game_id in ({marks}) order by section_id", games).fetchall()
    finally:
        con.close()
    return [(str(n), str(c)) for n, c in rows if _plain_key(n) in keys]


# --- the grading sheet -----------------------------------------------------------------------

@dataclass
class Try:
    picture_id: str
    sample: int
    model: str
    reply: str
    seconds: float
    error: str
    reading: MarkReading
    full_path: str = ""
    preview_path: str = ""


def model_folder(model: str) -> str:
    """A model tag as a folder name (Windows has no colons in names)."""
    return re.sub(r"[^A-Za-z0-9._-]+", "-", model).strip("-.")


def format_sheet(model: str, pictures: list[Any], tries: list[Try], advice: dict[str, list[tuple[str, str]]], meta: dict) -> str:
    """One grading sheet: what the grader needs without the repo. Per picture: the file, the game, the boss, the
    note's advice, then every try's marks as words and the path of the drawn copy."""
    by_pic: dict[str, list[Try]] = {}
    for t in tries:
        by_pic.setdefault(t.picture_id, []).append(t)
    n_replies = len(tries)
    n_marks = sum(len(t.reading.marks) for t in tries)
    n_none = sum(1 for t in tries if t.reading.said_none and not t.reading.marks)
    n_unread = sum(len(t.reading.unread) for t in tries)
    n_failed = sum(1 for t in tries if t.error)
    n_copied = sum(1 for t in tries if t.reading.copied)
    lines = [
        f"# Marks on boss pictures: grading sheet for {model}", "",
        meta.get("note", ""), "",
        "How to grade (plan 103 call 12): for each try, open its drawn picture and score it 0 to 10. Is each mark on the thing "
        "it names? Is the advice right for this boss by the note below? A confident wrong mark (sure, but on the wrong "
        "thing) costs more than an honest not sure. No marks at all on a picture with a clear boss scores low, not zero. "
        "Kinds: hit is a weak point to attack, avoid is something that hurts you, dodge is an attack to step away from. "
        "Where: the first number is how far across from the left (0 to 1), the second how far down from the top (0 to 1).", "",
        f"Tries: {n_replies}. Marks that read: {n_marks}. Replies that were only the word none: {n_none}. "
        f"Lines that did not read: {n_unread}. Replies that copied the question's example: {n_copied}. "
        f"Asks that failed: {n_failed}.", "",
    ]
    for pic in pictures:
        mine = by_pic.get(pic.id, [])
        if not mine:
            continue
        lines += [f"## {pic.id}", "",
                  f"- File: {pic.file or pic.path}", f"- Game: {pic.game}", f"- Boss or enemy on screen: {pic.boss}"]
        notes = advice.get(pic.id) or []
        if notes:
            for name, card in notes:
                lines.append(f"- The library note's own advice ({name}): {card}")
        else:
            lines.append("- The library note's own advice: the library holds no note for this one (grade the marks by what the "
                         "picture shows).")
        lines.append("")
        for t in sorted(mine, key=lambda x: x.sample):
            r = t.reading
            lines.append(f"### Try {t.sample} ({t.seconds}s)")
            if t.error:
                lines.append(f"The ask failed: {t.error}")
            elif r.marks:
                lines += [f"- {mark_in_words(m)}" for m in r.marks]
            elif r.said_none:
                lines.append("- The model answered with the single word none: no marks.")
            elif r.copied and not r.unread:
                lines.append("- No mark: the reply only copied the question's example.")
            else:
                lines.append("- No mark could be read from this reply.")
            if r.extra:
                lines.append(f"- {r.extra} further mark line(s) after the third were left out.")
            for bad in r.unread:
                lines.append(f"- Line that did not read: {bad}")
            for copied in r.copied:
                lines.append(f"- Line that copied the question's example (not a mark): {copied}")
            if t.full_path:
                lines.append(f"- Drawn copy: {t.full_path}")
                lines.append(f"- Preview (260 by 140): {t.preview_path}")
            lines.append("")
    return "\n".join(lines).rstrip() + "\n"


# --- which pictures --------------------------------------------------------------------------

def boss_pictures(pictures: list[Any]) -> list[Any]:
    """The pictures that show a boss or a named enemy (the labels' ``boss``). The labelled set decides, so new
    pictures with a boss label are taken without a change here."""
    return [p for p in pictures if p.boss]


def _installed(ollama_base: str) -> list[str]:
    return reading._installed_models(ollama_base)


def _default_root() -> Optional[Path]:
    sys.path.insert(0, str(ROOT / "scripts" / "lib"))
    import workshop  # noqa: E402

    try:
        return workshop.workshop_root(ROOT) / "screenshots"
    except workshop.WorkshopNotFound:
        return None


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--ollama", default=DEFAULT_OLLAMA, help="Ollama base URL on this PC")
    parser.add_argument("--models", default=DEFAULT_MODELS, help="comma-separated model tags; only those this PC holds are asked")
    parser.add_argument("--labels", type=Path, default=DEFAULT_LABELS)
    parser.add_argument("--root", type=Path, action="append", default=[], help="a folder holding the pictures (repeatable); the workshop's screenshots/plan103-set is tried last")
    parser.add_argument("--out", type=Path, default=None, help="where the drawn copies and sheets go (default: the workshop's screenshots/plan103-marks)")
    parser.add_argument("--corpus", type=Path, default=DEFAULT_CORPUS, help="folder with corpus.db, for the notes' advice")
    parser.add_argument("--samples", type=int, default=3, help="tries per picture and model")
    parser.add_argument("--only", default="", help="comma-separated picture ids (they must carry a boss label)")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # Windows console
    except Exception:
        pass
    _require_pillow()
    from PIL import Image

    only = {s.strip() for s in args.only.split(",") if s.strip()} or None
    pictures = boss_pictures(reading.load_pictures(args.labels, only))
    if not pictures:
        print("no picture with a boss label selected", file=sys.stderr)
        return 2
    workshop_shots = _default_root()
    roots = [r.resolve() for r in args.root] + ([workshop_shots / "plan103-set"] if workshop_shots else [])
    found: list[tuple[Any, Path]] = []
    for pic in pictures:
        path = reading.resolve_picture(pic, roots)
        if path is None:
            print(f"picture {pic.id}: {pic.file or pic.path} not found; skipped", file=sys.stderr)
            continue
        found.append((pic, path))
    if not found:
        print("none of the pictures could be found; give the folder with --root", file=sys.stderr)
        return 2
    out_root = args.out or (workshop_shots / "plan103-marks" if workshop_shots else None)
    if out_root is None:
        print("the workshop folder was not found and no --out was given", file=sys.stderr)
        return 2

    wanted = [m.strip() for m in args.models.split(",") if m.strip()]
    held = _installed(args.ollama)
    models = [m for m in wanted if m in held]
    missing = [m for m in wanted if m not in held]
    if not models:
        print(f"none of the models is held on this PC ({', '.join(wanted)})", file=sys.stderr)
        return 2
    db_path = args.corpus.resolve() / "corpus.db"
    advice = {pic.id: note_advice(db_path, pic) for pic, _ in found}
    print(f"models {', '.join(models)} (not held: {', '.join(missing) or 'none'}) | {len(found)} pictures x {args.samples} tries")

    for model in models:
        folder = out_root / model_folder(model)
        folder.mkdir(parents=True, exist_ok=True)
        reading._load_model(args.ollama, model)
        tries: list[Try] = []
        t_run = time.perf_counter()
        for pic, path in found:
            with Image.open(path) as opened:
                picture = opened.convert("RGB")
            for sample in range(1, args.samples + 1):
                ask = ask_model(args.ollama, model, path)
                parsed = read_marks(ask.reply)
                stem = f"{pic.id}-try{sample}"
                full = folder / f"{stem}.png"
                preview = folder / f"{stem}-preview.png"
                draw_marks(picture, parsed.marks).save(full)
                make_preview(picture, parsed.marks).save(preview)
                tries.append(Try(pic.id, sample, model, ask.reply, ask.seconds, ask.error, parsed, str(full), str(preview)))
                print(f"{model:<20} {pic.id:<30} try {sample}: {len(parsed.marks)} marks, {len(parsed.unread)} unread, {ask.seconds}s"
                      + (f" ERROR {ask.error}" if ask.error else ""))
        minutes = round((time.perf_counter() - t_run) / 60.0, 1)
        meta = {"note": f"Run {date.today().isoformat()}, {minutes} min, {args.samples} tries per picture."}
        sheet = folder / "grading-sheet.md"
        sheet.write_text(format_sheet(model, [p for p, _ in found], tries, advice, meta), encoding="utf-8")
        (folder / "tries.json").write_text(json.dumps([
            {"picture": t.picture_id, "sample": t.sample, "model": t.model, "seconds": t.seconds, "error": t.error,
             "reply": t.reply, "marks": [m.__dict__ for m in t.reading.marks], "unread": t.reading.unread,
             "extra": t.reading.extra, "said_none": t.reading.said_none} for t in tries], indent=1), encoding="utf-8")
        print(f"Wrote {sheet}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
