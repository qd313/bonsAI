#!/usr/bin/env python3
"""Title: Screenshot reading eval

Purpose: Measure how well the AI reads a screenshot a player attaches to a question. For each labelled
         picture it asks the way the plugin does, with the picture attached, "What game is this and where
         am I? Name any boss or enemy on screen.", once with the running game's id handed over and once with
         nothing known, then reads the reply and marks four things: it named the right game, the right area
         (title, menu, play, pause, loading), the right boss or enemy, or it said it did not know (its own,
         better-than-wrong result). It also times the first answer word. The report gives four plain figures
         out of a hundred per model and per way of asking. Roadmap step 1 only: a labelled set and a scoring
         script; nothing in the plugin changes.
Used for: the screenshot reading measurement of plan 98 (docs/planning/98-kb-feature-wave-and-deck-test-wave.md
          section 5e); the labels are tests/fixtures/screenshot_eval_v0.json and the pictures live outside the
          repo (the workshop's screenshots/plan98 folder, or any folder given with --root).
Solves: Attaching a screenshot is a headline feature and nothing measured how well the AI reads one, so every
        change to the picture path, the prompt or the model was judged by eye.
Does not: Touch the Deck, judge with a second model, change a prompt, or save a report unless asked
          (--write-report puts one in the workshop's research folder; it is never committed here). Sampling is
          stochastic at the shipped temperature, so a figure is a rate over --samples tries, not a verdict.

Usage:
  python scripts/kb/eval_screenshot_reading.py                     # every labelled picture, 3 tries each
  python scripts/kb/eval_screenshot_reading.py --only drg-survivor-title-1 --samples 1
  python scripts/kb/eval_screenshot_reading.py --root C:/path/to/pictures --model gemma4:e4b-it-qat

Needs: Ollama on this PC with the chat model (the Deck's own starter model also reads pictures), and a built
library at --corpus (python scripts/kb/build_rag_db.py --seed --out ./build/knowledge-base).
"""
from __future__ import annotations

import json
import re
import statistics
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

# Nearest folder above this file that holds main.py: no count of folders to break when the script moves.
ROOT = next(p for p in Path(__file__).resolve().parents if (p / "main.py").is_file())

DEFAULT_LABELS = ROOT / "tests" / "fixtures" / "screenshot_eval_v0.json"
DEFAULT_QUESTION = "What game is this and where am I? Name any boss or enemy on screen."
SCENES = ("title", "menu", "play", "pause", "loading", "other")
ARMS = ("known", "unknown")

# Words that count as naming a scene. A picture's own `scene_words` replace its scene's list; "other" has no
# list and is only scored when the picture brings its own.
SCENE_WORDS: dict[str, tuple[str, ...]] = {
    "title": ("title screen", "title menu", "start screen", "title page", "splash screen", "press any key", "title"),
    "menu": ("main menu", "menu screen", "game menu", "start menu", "home menu", "the menu"),
    "play": ("gameplay", "in game", "in the middle of", "combat", "battle", "fighting", "level", "stage", "arena"),
    "pause": ("pause menu", "pause screen", "paused", "pause"),
    "loading": ("loading screen", "loading"),
}

# Plain ways a reply says it does not know. Written with apostrophes left out, like `_norm` writes the reply.
UNKNOWN_PHRASES = (
    "i dont know", "i do not know", "dont know", "cant tell", "cannot tell", "cant identify", "cannot identify",
    "cant determine", "cannot determine", "unable to identify", "unable to determine", "unable to tell",
    "not able to tell", "not able to identify", "not sure", "im not certain", "i am not certain",
    "no way to tell", "dont recognize", "do not recognize", "dont recognise", "do not recognise",
    "isnt clear", "is not clear", "unclear which", "unclear what game",
)

# Another game's name only counts against a reply when it is at least this long: a very short name is too
# likely to be an everyday word.
_MIN_OTHER_GAME_CHARS = 5


# --- labels ----------------------------------------------------------------------------------

@dataclass
class Picture:
    id: str
    file: str
    path: str
    game: str
    game_aliases: list[str]
    scene: str
    boss: str
    boss_aliases: list[str]
    running_game_known: bool
    app_id: str
    app_name: str
    scene_words: list[str] = field(default_factory=list)


def _str_list(raw: Any) -> list[str]:
    return [str(x) for x in (raw or []) if str(x).strip()]


def load_pictures(path: Path, only: Optional[set[str]]) -> list[Picture]:
    """The labelled pictures, checked. A bad row stops the run: a typo in a label is a wrong figure."""
    raw = json.loads(path.read_text(encoding="utf-8"))
    pictures: list[Picture] = []
    for row in raw.get("pictures") or []:
        pid = str(row.get("id") or "").strip()
        scene = str(row.get("scene") or "").strip()
        if not pid:
            raise SystemExit(f"{path.name}: a picture has no id")
        if scene not in SCENES:
            raise SystemExit(f"{path.name}: picture {pid} has scene {scene!r}; use one of {', '.join(SCENES)}")
        if not str(row.get("file") or row.get("path") or "").strip():
            raise SystemExit(f"{path.name}: picture {pid} names no file and no path")
        known = bool(row.get("running_game_known"))
        app_id = str(row.get("app_id") or "").strip()
        if known and not app_id:
            raise SystemExit(f"{path.name}: picture {pid} says the game is known but has no app_id")
        game = str(row.get("game") or "").strip()
        if not game:
            raise SystemExit(f"{path.name}: picture {pid} has no game")
        if only and pid not in only:
            continue
        pictures.append(
            Picture(
                id=pid,
                file=str(row.get("file") or ""),
                path=str(row.get("path") or ""),
                game=game,
                game_aliases=_str_list(row.get("game_aliases")),
                scene=scene,
                boss=str(row.get("boss") or "").strip(),
                boss_aliases=_str_list(row.get("boss_aliases")),
                running_game_known=known,
                app_id=app_id,
                app_name=str(row.get("app_name") or game).strip() if known else "",
                scene_words=_str_list(row.get("scene_words")),
            )
        )
    if only:
        missing = only - {p.id for p in pictures}
        if missing:
            raise SystemExit(f"unknown picture id(s): {', '.join(sorted(missing))}")
    return pictures


def resolve_picture(pic: Picture, roots: list[Path]) -> Optional[Path]:
    """Where the picture is on this PC: its own absolute path first, then its file name in each root."""
    if pic.path:
        p = Path(pic.path)
        if p.is_file():
            return p
    if pic.file:
        for root in roots:
            candidate = root / pic.file
            if candidate.is_file():
                return candidate
    return None


# --- the reply reader ------------------------------------------------------------------------

def _norm(text: str) -> str:
    """Lower case, apostrophes dropped, every other mark a space: 'Don't' -> 'dont', 'A:B' -> 'a b'."""
    t = (text or "").lower().replace("â€™", "'").replace("â€˜", "'")
    t = t.replace("'", "")
    t = re.sub(r"[^a-z0-9]+", " ", t)
    return f" {' '.join(t.split())} "


def _has_phrase(norm_text: str, phrase: str) -> bool:
    p = _norm(phrase).strip()
    return bool(p) and f" {p} " in norm_text


def _blank_phrase(norm_text: str, phrase: str) -> str:
    p = _norm(phrase).strip()
    return norm_text.replace(f" {p} ", "  ") if p else norm_text


@dataclass
class Verdict:
    game: bool  # named the right game and no other
    area: Optional[bool]  # named the scene; None when the picture has no words to look for
    boss: Optional[bool]  # named the boss; None when the picture shows none
    said_unknown: bool  # said it did not know (own result, not part of the other three)
    other_games: list[str]  # other games the reply named, so a person can spot a false alarm


def scene_words_for(pic: Picture) -> tuple[str, ...]:
    return tuple(pic.scene_words) if pic.scene_words else SCENE_WORDS.get(pic.scene, ())


def read_reply(reply: str, pic: Picture, other_games: list[str]) -> Verdict:
    """Score one reply against its picture's labels. Plain phrase matching, no second AI.

    Right game: the game's name (or an alias) is in the reply and no other game's name is. The game's own
    name is blanked out before the others are looked for, so "Deep Rock Galactic: Survivor" is not also
    "Deep Rock Galactic". Right area: any word of the scene's list is in the reply (a reply that names two
    scenes passes on either). Right boss: the boss or an alias is in the reply.
    """
    text = _norm(reply)
    own_names = [pic.game, *pic.game_aliases]
    named_own = any(_has_phrase(text, n) for n in own_names)
    rest = text
    for name in sorted(own_names, key=len, reverse=True):
        rest = _blank_phrase(rest, name)
    # An "other game" that is just one of this game's own names is not another game.
    own_norm = {_norm(n) for n in own_names}
    named_others = [
        g for g in other_games
        if len(g.strip()) >= _MIN_OTHER_GAME_CHARS and _norm(g) not in own_norm and _has_phrase(rest, g)
    ]

    words = scene_words_for(pic)
    area: Optional[bool] = None if not words else any(_has_phrase(text, w) for w in words)

    boss: Optional[bool] = None
    if pic.boss:
        boss = any(_has_phrase(text, n) for n in [pic.boss, *pic.boss_aliases])

    return Verdict(
        game=named_own and not named_others,
        area=area,
        boss=boss,
        said_unknown=any(_has_phrase(text, p) for p in UNKNOWN_PHRASES),
        other_games=named_others,
    )


# --- figures and report ----------------------------------------------------------------------

@dataclass
class Run:
    picture_id: str
    arm: str  # "known" (the game's id handed over) or "unknown"
    sample: int
    model: str
    reply: str
    verdict: Verdict
    first_word_s: Optional[float]
    total_s: float
    success: bool
    error: str


@dataclass
class Figures:
    n: int
    failed: int
    game: int  # out of a hundred
    area: Optional[int]
    boss: Optional[int]  # None when no picture shows a boss
    boss_n: int
    said_unknown: int
    first_word_s: Optional[float]


def _per_hundred(hits: int, n: int) -> int:
    return round(100 * hits / n) if n else 0


def summarize(runs: list[Run]) -> dict[str, Figures]:
    """Four figures out of a hundred per way of asking. A failed ask counts as wrong, never as missing."""
    out: dict[str, Figures] = {}
    for arm in ARMS:
        mine = [r for r in runs if r.arm == arm]
        if not mine:
            continue
        area_runs = [r for r in mine if r.verdict.area is not None]
        boss_runs = [r for r in mine if r.verdict.boss is not None]
        firsts = [r.first_word_s for r in mine if r.first_word_s is not None]
        out[arm] = Figures(
            n=len(mine),
            failed=sum(1 for r in mine if not r.success),
            game=_per_hundred(sum(1 for r in mine if r.success and r.verdict.game), len(mine)),
            area=_per_hundred(sum(1 for r in area_runs if r.success and r.verdict.area), len(area_runs))
            if area_runs else None,
            boss=_per_hundred(sum(1 for r in boss_runs if r.success and r.verdict.boss), len(boss_runs))
            if boss_runs else None,
            boss_n=len(boss_runs),
            said_unknown=_per_hundred(sum(1 for r in mine if r.success and r.verdict.said_unknown), len(mine)),
            first_word_s=round(statistics.mean(firsts), 1) if firsts else None,
        )
    return out


_ARM_TITLE = {"known": "game known (its id handed over)", "unknown": "nothing known"}


def _cell(value: Optional[int]) -> str:
    return "n/a" if value is None else str(value)


def format_report(meta: dict, runs: list[Run]) -> str:
    """The report: per way of asking, four figures out of a hundred and the mean time to the first word."""
    figures = summarize(runs)
    lines = [
        "# Screenshot reading",
        "",
        f"Model: {meta.get('model', '?')} | pictures: {meta.get('pictures', '?')} | tries each: {meta.get('samples', '?')}"
        + (f" | {meta['note']}" if meta.get("note") else ""),
        "",
        "Out of a hundred replies, how many ...",
        "",
        "| Way of asking | Replies | named the game | named the area | named the boss | said it did not know "
        "| First word (s) | Asks that failed |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for arm in ARMS:
        f = figures.get(arm)
        if not f:
            continue
        boss = _cell(f.boss) + (f" (of {f.boss_n})" if f.boss is not None else "")
        first = "n/a" if f.first_word_s is None else f"{f.first_word_s}"
        lines.append(
            f"| {_ARM_TITLE[arm]} | {f.n} | {f.game} | {_cell(f.area)} | {boss} | {f.said_unknown} | {first} | {f.failed} |"
        )
    lines += ["", "## Every reply", ""]
    for r in runs:
        v = r.verdict
        flags = (
            f"game={'Y' if v.game else 'n'} area={'-' if v.area is None else ('Y' if v.area else 'n')} "
            f"boss={'-' if v.boss is None else ('Y' if v.boss else 'n')} unknown={'Y' if v.said_unknown else 'n'}"
        )
        other = f" other games named: {', '.join(v.other_games)}" if v.other_games else ""
        first = "no first word" if r.first_word_s is None else f"first word {r.first_word_s:.1f}s"
        lines.append(f"- {r.picture_id} / {r.arm} / try {r.sample} ({flags}{other}; {first}, total {r.total_s:.1f}s)")
        body = r.reply.strip() or (f"[no reply: {r.error}]" if r.error else "[no reply]")
        lines.append("  > " + " ".join(body.split())[:600])
    return "\n".join(lines) + "\n"
