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
         Lane P2 of plan 103 adds a second mode (--picture-search): for each picture it asks the picture model the
         plugin's own short first question (py_modules/backend/ask/picture_guess.py), judges the guess against the
         labels, and, for the pictures that carry an expected note, searches the notes with and without the
         guess's words and counts how often the right note is among those attached, with the seconds the call added.
Used for: the screenshot reading measurement of plan 98 (docs/planning/98-kb-feature-wave-and-deck-test-wave.md
          section 5e); the labels are tests/fixtures/screenshot_eval_v0.json and the pictures live outside the
          repo (the workshop's screenshots/plan98 folder, or any folder given with --root).
Solves: Attaching a screenshot is a headline feature and nothing measured how well the AI reads one, so every
        change to the picture path, the prompt or the model was judged by eye.
Does not: Touch the Deck, judge with a second model, change a prompt, or save a report unless asked
          (--write-report puts one in the workshop's research folder, with a .json file of every row beside it
          for --picture-search; neither is ever committed here). Sampling is
          stochastic at the shipped temperature, so a figure is a rate over --samples tries, not a verdict.

Usage:
  python scripts/kb/eval_screenshot_reading.py                     # every labelled picture, 3 tries each
  python scripts/kb/eval_screenshot_reading.py --only drg-survivor-title-1 --samples 1
  python scripts/kb/eval_screenshot_reading.py --root C:/path/to/pictures --model gemma4:e4b-it-qat
  python scripts/kb/eval_screenshot_reading.py --picture-shape in-question --samples 6 --arms known
  python scripts/kb/eval_screenshot_reading.py --picture-search --labels tests/fixtures/screenshot_eval_v1.json       --root C:/path/to/plan103-set                                 # the picture's own guess, both models

Needs: Ollama on this PC with the chat model (the Deck's own starter model also reads pictures), and a built
library at --corpus (python scripts/kb/build_rag_db.py --seed --out ./build/knowledge-base).
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import statistics
import sys
import time
import urllib.request
from dataclasses import asdict, dataclass, field
from datetime import date
from pathlib import Path
from typing import Any, Callable, Optional

# Nearest folder above this file that holds main.py: no count of folders to break when the script moves.
ROOT = next(p for p in Path(__file__).resolve().parents if (p / "main.py").is_file())

DEFAULT_LABELS = ROOT / "tests" / "fixtures" / "screenshot_eval_v0.json"
DEFAULT_OLLAMA = "http://127.0.0.1:11434"
# What the Deck loads. Its first-run starter set is this one model and it reads pictures itself: the plugin's
# picture route (ollama_routing._VISION_FOSS_ESSENTIALS) puts the same tag first, so there is no separate
# picture model to pick.
DEFAULT_MODEL = "gemma4:e2b-it-qat"
DEFAULT_CORPUS = ROOT / "build" / "knowledge-base"
DEFAULT_WORK_DIR = ROOT / "build" / "screenshot-eval" / "work"
SEED_FILE = ROOT / "data" / "kb" / "strategy_seed.json"
DEFAULT_QUESTION = "What game is this and where am I? Name any boss or enemy on screen."
SCENES = ("title", "menu", "play", "pause", "loading", "other")
ARMS = ("known", "unknown")
# Plan 102 lane D: where the plugin says which game a picture is from (py_modules/backend/prompts/ollama_prompts.py
# reads this variable at each turn; a test keeps the two names the same). "today" is the old way, only in the
# system text; the others also put the game's name at the front of the question.
PICTURE_SHAPE_ENV = "BONSAI_PICTURE_GAME_IN_QUESTION"
PICTURE_SHAPES = ("today", "in-question", "in-question-only")
# The game whose pictures the "named another game" line is about (plan 98: 4 and 6 times in 9).
MIXUP_GAME = "God of War"

# Words that count as naming a scene. A picture's own `scene_words` replace its scene's list; "other" has no
# list and is only scored when the picture brings its own.
SCENE_WORDS: dict[str, tuple[str, ...]] = {
    "title": ("title screen", "title menu", "start screen", "title page", "splash screen", "press any key", "title"),
    "menu": ("menu", "user interface", "buttons"),
    "play": ("gameplay", "in game", "in the middle of", "combat", "battle", "fighting", "level", "stage", "arena"),
    "pause": ("pause menu", "pause screen", "paused", "pause"),
    "loading": ("loading screen", "loading"),
}

# Plain ways a reply says it does not know. Written with apostrophes left out, like `_norm` writes the reply.
UNKNOWN_PHRASES = (
    "i dont know", "i do not know", "dont know", "cant tell", "cannot tell", "cant identify", "cannot identify",
    "cant determine", "cannot determine", "cant name", "cannot name", "cant say", "cannot say",
    "cant definitively", "cannot definitively", "unable to", "not able to", "not sure", "not certain",
    "no way to tell", "dont recognize", "do not recognize", "dont recognise", "do not recognise",
    "isnt clear", "is not clear", "unclear",
)
# A "did not know" sentence is about the GAME. One that is about a boss or enemy does not count (a title screen
# has none, so nearly every reply says so), and neither does one about the scene ("title screen").
_BOSS_WORDS = ("boss", "bosses", "enemy", "enemies")
_SCENE_PHRASES = ("title screen", "title menu", "loading screen", "main menu", "pause menu")
_SHORT_REPLY_WORDS = 6

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
    # Plan 103 lane P1's labels (tests/fixtures/screenshot_eval_v1.json); v0 files carry none of them.
    place: str = ""
    place_aliases: list[str] = field(default_factory=list)
    expect_section: str = ""  # the library note whose subject is on screen, empty when there is none
    expect_section_also: list[str] = field(default_factory=list)
    in_library: bool = True
    confidence: dict = field(default_factory=dict)  # how sure the labeller is of each label


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
                place=str(row.get("place") or "").strip(),
                place_aliases=_str_list(row.get("place_aliases")),
                expect_section=str(row.get("expect_section") or "").strip(),
                expect_section_also=_str_list(row.get("expect_section_also")),
                in_library=row.get("in_library") is not False,
                confidence=dict(row.get("confidence") or {}),
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


def _said_unknown(reply: str) -> bool:
    """True when some sentence says the AI could not tell WHICH GAME this is (or is a short "I don't know").

    Sentence by sentence, because "This is Deep Rock Galactic. I cannot name any boss." is a right game and
    an honest "no boss here", not a reply that did not know. A sentence needs one of UNKNOWN_PHRASES, no
    boss or enemy word, and either the word "game" (or "title" not in "title screen") or to be only a few
    words long.
    """
    for sentence in re.split(r"(?<=[.!?])\s+|\n+", reply or ""):
        s = _norm(sentence)
        if not s.strip() or not any(_has_phrase(s, p) for p in UNKNOWN_PHRASES):
            continue
        if any(_has_phrase(s, w) for w in _BOSS_WORDS):
            continue
        about_game = s
        for scene in _SCENE_PHRASES:
            about_game = _blank_phrase(about_game, scene)
        if _has_phrase(about_game, "game") or _has_phrase(about_game, "title") or len(s.split()) <= _SHORT_REPLY_WORDS:
            return True
    return False


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
    # Once the full name is in the reply, a shorter form inside it ("Deep Rock Galactic" after "Deep Rock Galactic
    # Survivor") is the same game said short, not a second game. Said alone it is still a different game.
    own_text = " ".join(own_norm)
    named_others = [
        g for g in other_games
        if len(g.strip()) >= _MIN_OTHER_GAME_CHARS and _norm(g) not in own_norm and _has_phrase(rest, g)
        and not (named_own and _has_phrase(own_text, g))
    ]

    words = scene_words_for(pic)
    # A pause menu is not the main menu: its words are blanked before the menu words are looked for.
    scene_text = _blank_phrase(text, "pause menu") if pic.scene == "menu" and not pic.scene_words else text
    area: Optional[bool] = None if not words else any(_has_phrase(scene_text, w) for w in words)

    boss: Optional[bool] = None
    if pic.boss:
        boss = any(_has_phrase(text, n) for n in [pic.boss, *pic.boss_aliases])

    return Verdict(
        game=named_own and not named_others,
        area=area,
        boss=boss,
        said_unknown=_said_unknown(reply),
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
    game: str = ""  # the game the picture shows, for the "named another game" line


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


def named_another_game(runs: list[Run], game: str = MIXUP_GAME) -> dict[str, tuple[int, int]]:
    """Per way of asking, (replies on this game's pictures that named a different game, replies on them).
    Left out for a way of asking with none. A failed ask names nothing, so it counts as a reply that did not."""
    out: dict[str, tuple[int, int]] = {}
    for arm in ARMS:
        mine = [r for r in runs if r.arm == arm and r.game == game]
        if mine:
            out[arm] = (sum(1 for r in mine if r.success and r.verdict.other_games), len(mine))
    return out


def _cell(value: Optional[int]) -> str:
    return "n/a" if value is None else str(value)


def format_report(meta: dict, runs: list[Run]) -> str:
    """The report: per way of asking, four figures out of a hundred and the mean time to the first word."""
    figures = summarize(runs)
    lines = [
        "# Screenshot reading",
        "",
        f"Model: {meta.get('model', '?')} | pictures: {meta.get('pictures', '?')} | tries each: {meta.get('samples', '?')}"
        + (f" | shape: {meta['shape']}" if meta.get("shape") else "")
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
    mixups = named_another_game(runs)
    if mixups:
        lines += ["", f"Replies that named another game on the {MIXUP_GAME} pictures: " + "; ".join(
            f"{_ARM_TITLE[arm]} {hits} of {n}" for arm, (hits, n) in mixups.items())]
    answered = sorted({r.model for r in runs if r.model and r.model != meta.get("model")})
    if answered:
        lines += [
            "",
            f"WARNING: answered by another model than the one asked for: {', '.join(answered)}. "
            "These figures are not for the model named above.",
        ]
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


# --- asking the way the plugin does ----------------------------------------------------------

# Look-alikes the library does not hold but a reply may name for a survivors-style game.
_EXTRA_OTHER_GAMES = ("Vampire Survivors", "Halls of Torment", "Brotato")


def other_game_names(pictures: list[Picture], seed_file: Path = SEED_FILE) -> list[str]:
    """Every game name a reply could wrongly name: the library's titles and the part of each before a colon
    ("Deep Rock Galactic" for "Deep Rock Galactic: Survivor"), the labelled games, and a few look-alikes. A
    picture's own names are dropped by the reader, so the same list serves every picture."""
    names: list[str] = []
    try:
        seed = json.loads(seed_file.read_text(encoding="utf-8"))
        names += [str(g.get("canonical_title") or "") for g in seed.get("games") or []]
    except (OSError, ValueError):
        pass  # no library file: the labelled games alone still catch a swap between labelled pictures
    names += [p.game for p in pictures]
    names += list(_EXTRA_OTHER_GAMES)
    names += [n.split(":", 1)[0].strip() for n in list(names) if ":" in n]
    seen: dict[str, str] = {}
    for n in names:
        if n.strip():
            seen.setdefault(_norm(n), n.strip())
    return list(seen.values())


def picture_settings(settings: dict, model: str) -> dict:
    """The harness settings, changed so a picture can be asked about: media access on (the plugin refuses a
    picture without it) and the chosen model first on both the picture route and the text route."""
    out = dict(settings)
    caps = dict(out.get("capabilities") or {})
    caps["media_library_access"] = True
    out["capabilities"] = caps
    out["vision_model_routing_order"] = [model]
    out["text_model_routing_order"] = [model]
    return out


async def ask_picture(
    plugin: Any,
    pic: Picture,
    image_path: Path,
    arm: str,
    *,
    question: str,
    ollama_base: str,
    sample: int,
    model: str,
    other_games: list[str],
    run_game_ai_request: Callable[..., Any],
    ask_mode: str = "speed",
    request_id: int = 1,
) -> Run:
    """One real ask with the picture attached, through the plugin's own ask path.

    "known" hands over the running game's id and name (what the plugin has when a game is running);
    "unknown" hands over neither. Streaming is on so the first answer word can be timed: the plugin tells
    its screen about each new piece of answer text through ``_update_partial_response``, so that hook is
    watched (and always called through) for the length of the ask, then put back.
    """
    snapshots: list[dict] = []
    first_word: list[float] = []
    t0 = time.perf_counter()
    had_update = "_update_partial_response" in vars(plugin)
    real_update = plugin._update_partial_response
    had_persist = "_persist_input_transparency" in vars(plugin)
    real_persist = getattr(plugin, "_persist_input_transparency", None)

    def _watch_update(rid: Any, text: str, done: bool, *args: Any, **kwargs: Any) -> Any:
        if not first_word and (text or "").strip() and kwargs.get("update_partial", True):
            first_word.append(time.perf_counter() - t0)
        return real_update(rid, text, done, *args, **kwargs)

    async def _keep_snapshot(payload: Any) -> None:
        if isinstance(payload, dict):
            snapshots.append(payload)

    plugin._update_partial_response = _watch_update
    plugin._persist_input_transparency = _keep_snapshot
    known = arm == "known"
    attachments = [{
        "path": str(image_path), "name": image_path.name, "source": "recent",
        "app_id": pic.app_id if known else "",
    }]
    error = ""
    try:
        result = await run_game_ai_request(
            plugin, question, ollama_base, pic.app_id if known else "", pic.app_name if known else "",
            attachments, ask_mode, token_stream_request_id=request_id,
        )
    except Exception as exc:  # the ask path swallows its own errors; this is harness breakage
        result = {"success": False, "response": ""}
        error = f"{type(exc).__name__}: {exc}"
    finally:
        total = round(time.perf_counter() - t0, 2)
        for name, had, real in (
            ("_update_partial_response", had_update, real_update),
            ("_persist_input_transparency", had_persist, real_persist),
        ):
            if had:
                setattr(plugin, name, real)
            else:
                vars(plugin).pop(name, None)
    success = bool(result.get("success"))
    reply = str(result.get("response") or "") if success else ""
    answered = ""
    for snap in snapshots:
        diag = snap.get("ask_diagnostics")
        if isinstance(diag, dict) and diag.get("model_succeeded"):
            answered = str(diag["model_succeeded"])
            break
    return Run(
        picture_id=pic.id, arm=arm, sample=sample, model=answered or model, reply=reply,
        verdict=read_reply(reply, pic, other_games),
        first_word_s=round(first_word[0], 1) if first_word else None, total_s=total, success=success,
        error=error or ("" if success else str(result.get("response") or "")[:200]), game=pic.game,
    )


# --- the picture's own guess (plan 103 lane P2) ----------------------------------------------

SEARCH_MODELS = "gemma4:e2b-it-qat,qwen3.5:4b"  # the Deck's starter picture model, then the bigger one
SEARCH_QUESTIONS = ("What should I do here?", "How do I beat this?")  # typed words that name nothing on screen
ENOUGH_PICTURES_WITH_A_NOTE = 15  # plan 103 call 12 asks for 15 pictures before a number may decide anything
EXTRA_SECONDS_CEILING = 10.0  # plan 103 call 10: the first call may add under ten seconds on this PC
KINDS = ("right", "wrong", "unsure", "unchecked")


@dataclass
class GuessVerdict:
    """One guess against one picture's labels. Each of game, place and enemy is one of KINDS: right and wrong
    are for something said with confidence, unsure is "not sure" (or nothing), unchecked is something said that
    the labels cannot judge (the picture has no place or boss label, or the labeller was only guessing)."""

    game: str
    place: str
    enemy: str
    said_not_sure: bool

    @property
    def confident_wrong(self) -> bool:
        return "wrong" in (self.game, self.place, self.enemy)


def _judge_named(said: str, names: list[str], confidence: str) -> str:
    if not said.strip():
        return "unsure"
    if not names or confidence == "low":
        return "unchecked"
    text = _norm(said)
    return "right" if any(_has_phrase(text, n) for n in names) else "wrong"


def judge_guess(guess: Any, pic: Picture, other_games: list[str]) -> GuessVerdict:
    """Score the three slots of a read guess against the labels. The game goes through the reply reader, so
    a guess naming two games, or another game, is wrong exactly as it is in the first measurement."""
    game = read_reply(guess.game, pic, other_games).game if guess.game.strip() else None
    return GuessVerdict(
        game="unsure" if game is None else ("right" if game else "wrong"),
        place=_judge_named(guess.place, [pic.place, *pic.place_aliases] if pic.place else [], pic.confidence.get("place", "")),
        enemy=_judge_named(guess.enemy, [pic.boss, *pic.boss_aliases] if pic.boss else [], pic.confidence.get("boss", "")),
        said_not_sure=bool(guess.not_sure_lines),
    )


def note_found(attached: list[str], pic: Picture) -> bool:
    """True when a note the picture expects (its own, or one it also fits) is among the attached notes, by its
    exact name, case aside. A near name is not a find."""
    wanted = {n.strip().lower() for n in [pic.expect_section, *pic.expect_section_also] if n.strip()}
    return bool(wanted) and any(str(a).strip().lower() in wanted for a in attached)


@dataclass
class SearchRow:
    picture_id: str
    model: str
    sample: int
    status: str  # written | failed | skipped | stopped
    seconds: float
    raw: str
    words: str  # what the guess added to the search words ("" when it added nothing)
    verdict: Optional[GuessVerdict]
    expect: str
    found_today: dict[str, bool] = field(default_factory=dict)  # typed question -> right note attached
    found_with: dict[str, bool] = field(default_factory=dict)


def measure_picture_search(
    found: list[tuple[Picture, Path]], models: list[str], questions: tuple[str, ...], samples: int, *,
    guess_fn: Callable[[Picture, Path, str], Any], search_fn: Callable[[Picture, str], list[str]],
    others: list[str], join_fn: Callable[[str, Any], str],
) -> list[SearchRow]:
    """Ask each model for its guess on each picture (``samples`` tries) and, for a picture with an expected
    note, search the notes for each typed question with today's words and with the guess's words added.

    ``guess_fn(picture, path, model)`` returns the first call's outcome; ``search_fn(picture, words)`` the names
    of the notes attached; ``join_fn(typed words, guess)`` the words the notes are searched for. Today's search
    does not depend on the model or the try, so it is made once per picture and question."""
    rows: list[SearchRow] = []
    for pic, path in found:
        today = {q: note_found(search_fn(pic, q), pic) for q in questions} if pic.expect_section else {}
        for model in models:
            for sample in range(1, samples + 1):
                outcome = guess_fn(pic, path, model)
                written = outcome.status == "written"
                words = outcome.guess.search_words if written else ""
                with_guess = dict(today)
                if today and words:
                    with_guess = {q: note_found(search_fn(pic, join_fn(q, outcome.guess)), pic) for q in questions}
                rows.append(SearchRow(
                    picture_id=pic.id, model=model, sample=sample, status=outcome.status, seconds=float(outcome.seconds),
                    raw=str(outcome.raw or ""), words=words, expect=pic.expect_section,
                    verdict=judge_guess(outcome.guess, pic, others) if written else None,
                    found_today=dict(today), found_with=with_guess,
                ))
    return rows


@dataclass
class SearchFigures:
    calls: int
    failed: int
    mean_s: Optional[float]
    median_s: Optional[float]
    max_s: Optional[float]
    with_note: int  # pictures x tries that carry an expected note
    pictures_with_note: int
    today: dict[str, int]  # typed question -> times the right note was attached
    with_guess: dict[str, int]
    game: dict[str, int]
    place: dict[str, int]
    enemy: dict[str, int]
    judged: int
    said_not_sure: int
    confident_wrong: int


def search_figures(rows: list[SearchRow], model: str, questions: tuple[str, ...]) -> SearchFigures:
    mine = [r for r in rows if r.model == model]
    noted = [r for r in mine if r.found_today]
    judged = [r.verdict for r in mine if r.verdict is not None]
    times = [r.seconds for r in mine]
    return SearchFigures(
        calls=len(mine), failed=sum(1 for r in mine if r.status != "written"),
        mean_s=round(statistics.mean(times), 1) if times else None,
        median_s=round(statistics.median(times), 1) if times else None,
        max_s=round(max(times), 1) if times else None,
        with_note=len(noted), pictures_with_note=len({r.picture_id for r in noted}),
        today={q: sum(1 for r in noted if r.found_today.get(q)) for q in questions},
        with_guess={q: sum(1 for r in noted if r.found_with.get(q)) for q in questions},
        game={k: sum(1 for v in judged if v.game == k) for k in KINDS},
        place={k: sum(1 for v in judged if v.place == k) for k in KINDS},
        enemy={k: sum(1 for v in judged if v.enemy == k) for k in KINDS},
        judged=len(judged), said_not_sure=sum(1 for v in judged if v.said_not_sure),
        confident_wrong=sum(1 for v in judged if v.confident_wrong),
    )


def landing_verdict(today: int, with_guess: int, n: int, mean_s: Optional[float]) -> tuple[bool, bool, str]:
    """Plan 103 call 10's two halves: the right note found at least twice as often (and more often at all), and
    the extra wait under ten seconds. ``today`` and ``with_guess`` are totals over the typed questions."""
    twice = n > 0 and with_guess > today and with_guess >= 2 * today
    fast = mean_s is not None and mean_s < EXTRA_SECONDS_CEILING
    text = (
        f"found at least twice as often: {'yes' if twice else 'no'} (today {today}, with the guess {with_guess}, "
        f"out of {n}); extra wait under ten seconds: {'yes' if fast else 'no'} "
        f"(mean {'n/a' if mean_s is None else f'{mean_s} s'})"
    )
    return twice, fast, text


def search_report_name(day: str, label: str = "") -> str:
    clean = re.sub(r"[^A-Za-z0-9._-]+", "-", (label or "").strip()).strip("-.")
    return f"picture-guess-search-{day}" + (f"-{clean}" if clean else "") + ".md"


def search_rows_name(day: str, label: str = "") -> str:
    """The rows file's name: the report's own name with .json, so the two sit side by side."""
    return search_report_name(day, label)[: -len(".md")] + ".json"


def search_rows_json(rows: list[SearchRow]) -> str:
    """Every row in full. The report cuts each reply short and only totals what the guesses said, so this file
    is what lets a run be sliced afterwards (the boss pictures alone, say) with the same figures code."""
    return json.dumps([asdict(r) for r in rows], indent=1, ensure_ascii=False) + "\n"


def search_rows_from_json(text: str) -> list[SearchRow]:
    out: list[SearchRow] = []
    for raw in json.loads(text):
        verdict = raw.pop("verdict")
        out.append(SearchRow(verdict=GuessVerdict(**verdict) if verdict else None, **raw))
    return out


def format_search_report(meta: dict, rows: list[SearchRow], questions: tuple[str, ...]) -> str:
    """The report: per model, how often the right note was attached today and with the guess, the seconds the
    first call added, and what the guess said against the labels."""
    models = list(meta.get("models") or sorted({r.model for r in rows}))
    lines = [
        "# The picture's own guess, joined to the note search",
        "",
        f"Models: {', '.join(models) or '?'} | pictures: {meta.get('pictures', '?')} | tries each: {meta.get('samples', '?')}"
        + (f" | {meta['note']}" if meta.get("note") else ""),
    ]
    if meta.get("missing_models"):
        lines += ["", "Not installed on this PC, so not measured: " + ", ".join(meta["missing_models"]) + "."]
    for model in models:
        f = search_figures(rows, model, questions)
        lines += ["", f"## {model}", ""]
        if not f.calls:
            lines.append("No calls were made.")
            continue
        lines += [f"The right note, among the notes attached ({f.with_note} tries on {f.pictures_with_note} pictures with a note):", "",
                  "| Typed question | Found today | Found with the guess |", "|---|---|---|"]
        for q in questions:
            lines.append(f"| {q} | {f.today[q]} of {f.with_note} | {f.with_guess[q]} of {f.with_note} |")
        today, with_guess = sum(f.today.values()), sum(f.with_guess.values())
        _twice, _fast, text = landing_verdict(today, with_guess, f.with_note * len(questions), f.mean_s)
        lines += ["", f"Landing rule: {text}.",
                  f"The first call took {f.mean_s} s on average, {f.median_s} s in the middle, {f.max_s} s at most "
                  f"({f.calls} calls, {f.failed} gave no guess)."]
        if f.pictures_with_note < ENOUGH_PICTURES_WITH_A_NOTE:
            lines.append(f"Only {f.pictures_with_note} pictures carry a note: too few (the bar is {ENOUGH_PICTURES_WITH_A_NOTE}) "
                         "for these counts to decide anything, so the switch stays off.")
        lines += ["", f"What the guess said, against the labels ({f.judged} guesses read; {f.said_not_sure} said \"not sure\" somewhere; "
                  f"{f.confident_wrong} said something wrong with confidence):", "",
                  "| | right | wrong | not sure | said, but the labels cannot judge |", "|---|---|---|---|---|"]
        for name, counts in (("game", f.game), ("place", f.place), ("boss or enemy", f.enemy)):
            lines.append(f"| {name} | {counts['right']} | {counts['wrong']} | {counts['unsure']} | {counts['unchecked']} |")
    lines += ["", "## Every guess", ""]
    for r in rows:
        v = r.verdict
        judged = "no guess" if v is None else f"game {v.game}, place {v.place}, enemy {v.enemy}"
        found = ""
        if r.found_today:
            found = "; right note today " + "/".join("Y" if r.found_today[q] else "n" for q in questions) \
                + ", with the guess " + "/".join("Y" if r.found_with.get(q) else "n" for q in questions)
        lines.append(f"- {r.picture_id} / {r.model} / try {r.sample}: {r.status}, {r.seconds:.1f} s; {judged}{found}")
        lines.append("  > " + (" ".join((r.raw or "[no reply]").split())[:300]))
        lines.append(f"  words added: {r.words or '(none)'}")
    return "\n".join(lines) + "\n"


def _installed_models(ollama_base: str) -> list[str]:
    try:
        with urllib.request.urlopen(f"{ollama_base}/api/tags", timeout=10) as resp:
            return [str(m.get("name")) for m in json.loads(resp.read()).get("models") or []]
    except Exception:
        return []


def run_picture_search(args: argparse.Namespace, found: list[tuple[Picture, Path]], plugin: Any, corpus_version: str) -> int:
    """The measurement against this PC's AI and the built library, through the plugin's own first-call code."""
    from backend.ask import picture_guess  # noqa: E402  (needs the fake `decky`, installed by the caller)
    from backend.knowledge.knowledge_base_service import retrieve_knowledge_context, should_retrieve_knowledge  # noqa: E402

    wanted = [m.strip() for m in args.search_models.split(",") if m.strip()]
    installed = _installed_models(args.ollama)
    models = [m for m in wanted if m in installed]
    missing = [m for m in wanted if m not in installed]
    if not models:
        print(f"none of the models is installed ({', '.join(wanted)}); nothing to measure", file=sys.stderr)
        return 2
    questions = tuple(args.search_question) or SEARCH_QUESTIONS
    settings = asyncio.run(plugin.load_settings())
    others = other_game_names([p for p, _ in found])

    def guess_fn(pic: Picture, path: Path, model: str) -> Any:
        known = pic.running_game_known
        attachments = [{"path": str(path), "name": path.name, "source": "recent", "app_id": pic.app_id if known else ""}]
        return asyncio.run(picture_guess.guess_picture(plugin, settings, attachments, args.ollama, preferred_model=model))

    def search_fn(pic: Picture, words: str) -> list[str]:
        app_id, app_name = (pic.app_id, pic.app_name) if pic.running_game_known else ("", "")
        should, domain = should_retrieve_knowledge(
            use_local_knowledge_base=True, ask_mode="strategy", question=words, app_id=app_id, app_name=app_name,
            text_resolved_title="")
        if not should:
            return []
        result = retrieve_knowledge_context(
            settings, ask_mode="strategy", question=words, app_id=app_id, app_name=app_name, domain=domain, pc_ip=args.ollama)
        return [str(c.get("name") or "") for c in result.attached_ids] if result.attached else []

    print(f"models {', '.join(models)} | {len(found)} pictures x {args.search_samples} tries | questions: {' | '.join(questions)}")
    rows: list[SearchRow] = []
    t_run = time.perf_counter()
    for model in models:
        _load_model(args.ollama, model)
        new_rows = measure_picture_search(
            found, [model], questions, args.search_samples, guess_fn=guess_fn, search_fn=search_fn, others=others,
            join_fn=picture_guess.with_guess_words)
        for r in new_rows:
            print(f"{model:<20} {r.picture_id:<30} {r.status:<8} {r.seconds:>5.1f}s  {r.words or '(no words)'}")
        rows += new_rows
    minutes = round((time.perf_counter() - t_run) / 60.0, 1)
    meta = {"models": models, "missing_models": missing, "pictures": len(found), "samples": args.search_samples,
            "note": f"run {date.today().isoformat()}, {minutes} min, library {corpus_version}"}
    report = format_search_report(meta, rows, questions)
    print()
    print(report)
    if args.write_report:
        sys.path.insert(0, str(ROOT / "scripts" / "lib"))
        import workshop  # noqa: E402

        out = workshop.research_dir(ROOT) / search_report_name(date.today().isoformat(), args.label)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(report, encoding="utf-8")
        print(f"Wrote {out}")
        rows_out = out.with_name(search_rows_name(date.today().isoformat(), args.label))
        rows_out.write_text(search_rows_json(rows), encoding="utf-8")
        print(f"Wrote {rows_out}")
    return 0


def _load_model(ollama_base: str, model: str) -> None:
    """Ask the AI to load the model before the first timed ask, so a cold start is not counted as the
    first word of the first picture. A failure is ignored: the first ask then simply carries the load."""
    try:
        body = json.dumps({"model": model, "keep_alive": "10m"}).encode("utf-8")
        req = urllib.request.Request(
            f"{ollama_base}/api/generate", data=body, headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=300).read()
    except Exception:
        pass


def _default_roots() -> list[Path]:
    sys.path.insert(0, str(ROOT / "scripts" / "lib"))
    import workshop  # noqa: E402

    try:
        return [workshop.workshop_root(ROOT) / "screenshots" / "plan98"]
    except workshop.WorkshopNotFound:
        return []


def report_name(day: str, label: str = "") -> str:
    """The report's file name: the date, then the label when one is given, so runs on one day do not overwrite
    each other. Anything in the label other than letters, digits, dot, dash and underscore becomes a dash."""
    clean = re.sub(r"[^A-Za-z0-9._-]+", "-", (label or "").strip()).strip("-.")
    return f"screenshot-reading-{day}" + (f"-{clean}" if clean else "") + ".md"


def apply_picture_shape(shape: str, environ: Any = None) -> None:
    """Set the plugin's own switch for this run. The plugin reads it at every turn, so setting it here is
    the same thing a person's environment would do; "today" is written out so a default that changes later
    cannot change what a "today" run means."""
    (os.environ if environ is None else environ)[PICTURE_SHAPE_ENV] = shape


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--ollama", default=DEFAULT_OLLAMA, help="Ollama base URL on this PC")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="model tag; default is what the Deck loads")
    parser.add_argument("--labels", type=Path, default=DEFAULT_LABELS)
    parser.add_argument(
        "--root", type=Path, action="append", default=[],
        help="a folder holding the pictures (repeatable); the workshop's screenshots/plan98 is always tried last")
    parser.add_argument("--corpus", type=Path, default=DEFAULT_CORPUS, help="folder with corpus.db + corpus-manifest.json")
    parser.add_argument("--work-dir", type=Path, default=DEFAULT_WORK_DIR, help="where the fake plugin keeps its files")
    parser.add_argument("--samples", type=int, default=3, help="tries per picture and way of asking")
    parser.add_argument("--only", default="", help="comma-separated picture ids")
    parser.add_argument("--arms", default="both", choices=("both", "known", "unknown"))
    parser.add_argument("--question", default=DEFAULT_QUESTION)
    parser.add_argument(
        "--picture-shape", default="today", choices=PICTURE_SHAPES,
        help="where the plugin names the running game for a picture turn: today (system text only), in-question "
             "(also first in the question), in-question-only (first in the question, not in the system text)")
    parser.add_argument(
        "--label", default="",
        help="added to the saved report's file name (screenshot-reading-<date>-<label>.md) so runs on one day "
             "do not overwrite each other")
    parser.add_argument(
        "--picture-search", action="store_true",
        help="plan 103 lane P2: measure the picture's own first guess joined to the note search (labels need "
             "expect_section, so use --labels tests/fixtures/screenshot_eval_v1.json) instead of the reading figures")
    parser.add_argument("--search-models", default=SEARCH_MODELS, help="comma-separated model tags for --picture-search")
    parser.add_argument(
        "--search-question", action="append", default=[],
        help="a typed question to search the notes with (repeatable; default: two that name nothing on screen)")
    parser.add_argument("--search-samples", type=int, default=1, help="guesses per picture and model for --picture-search")
    parser.add_argument(
        "--write-report", action="store_true",
        help="also save the report in the workshop's research folder (never in this repo)")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    apply_picture_shape(args.picture_shape)
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # Windows console
    except Exception:
        pass

    only = {s.strip() for s in args.only.split(",") if s.strip()} or None
    pictures = load_pictures(args.labels, only)
    if not pictures:
        print("no pictures selected", file=sys.stderr)
        return 2
    roots = [r.resolve() for r in args.root] + _default_roots()
    found: list[tuple[Picture, Path]] = []
    for pic in pictures:
        path = resolve_picture(pic, roots)
        if path is None:
            where = ", ".join(map(str, roots)) or "any folder"
            print(f"picture {pic.id}: {pic.file or pic.path} not found in {where}; skipped", file=sys.stderr)
            continue
        found.append((pic, path))
    if not found:
        print("none of the labelled pictures could be found; give the folder with --root", file=sys.stderr)
        return 2

    corpus_dir = args.corpus.resolve()
    manifest_path = corpus_dir / "corpus-manifest.json"
    if not (corpus_dir / "corpus.db").is_file() or not manifest_path.is_file():
        print(f"no library at {corpus_dir}; build one with: python scripts/kb/build_rag_db.py --seed --out {corpus_dir}",
              file=sys.stderr)
        return 2
    corpus_version = str(json.loads(manifest_path.read_text(encoding="utf-8")).get("version") or "?")

    # The answer eval's own fake plugin setup, reused as it is (scripts/kb/eval_kb_answers.py).
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import eval_kb_answers as answer_eval  # noqa: E402

    work_dir = args.work_dir.resolve()
    answer_eval.install_fake_decky(work_dir)
    settings_path = answer_eval.write_harness_settings(
        work_dir / "settings", corpus_dir=corpus_dir, corpus_version=corpus_version, model=args.model)
    settings_path.write_text(
        json.dumps(picture_settings(json.loads(settings_path.read_text(encoding="utf-8")), args.model), indent=2),
        encoding="utf-8")

    import main as plugin_main  # noqa: E402  (reads `decky` at import time, so only after the fake is in)
    from backend.ask import game_ai_request as gar  # noqa: E402

    plugin = plugin_main.Plugin()
    if args.picture_search:
        return run_picture_search(args, found, plugin, corpus_version)
    others = other_game_names([p for p, _ in found])
    arms = ARMS if args.arms == "both" else (args.arms,)
    print(f"model {args.model} | {len(found)} pictures x {args.samples} tries | ways of asking: {', '.join(arms)} "
          f"| shape: {args.picture_shape}")
    _load_model(args.ollama, args.model)
    runs: list[Run] = []
    t_run = time.perf_counter()
    for pic, path in found:
        for arm in arms:
            if arm == "known" and not pic.running_game_known:
                continue
            for sample in range(1, args.samples + 1):
                run = asyncio.run(ask_picture(
                    plugin, pic, path, arm, question=args.question, ollama_base=args.ollama, sample=sample,
                    model=args.model, other_games=others, run_game_ai_request=gar.run_game_ai_request))
                runs.append(run)
                v = run.verdict
                print(
                    f"{pic.id:<24} {arm:<8} try {sample}: game={int(v.game)} area={v.area} boss={v.boss} "
                    f"unknown={int(v.said_unknown)} first word {run.first_word_s}s total {run.total_s}s"
                    + (f" ERROR {run.error}" if not run.success else ""))
    minutes = round((time.perf_counter() - t_run) / 60.0, 1)
    meta = {
        "model": args.model, "samples": args.samples, "pictures": len(found), "shape": args.picture_shape,
        "note": f"run {date.today().isoformat()}, {minutes} min, library {corpus_version}",
    }
    report = format_report(meta, runs)
    print()
    print(report)
    if args.write_report:
        sys.path.insert(0, str(ROOT / "scripts" / "lib"))
        import workshop  # noqa: E402

        out = workshop.research_dir(ROOT) / report_name(date.today().isoformat(), args.label)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(report, encoding="utf-8")
        print(f"Wrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
