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

import argparse
import asyncio
import json
import re
import statistics
import sys
import time
import urllib.request
from dataclasses import dataclass, field
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
        error=error or ("" if success else str(result.get("response") or "")[:200]),
    )


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


def main() -> int:
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
        "--write-report", action="store_true",
        help="also save the report in the workshop's research folder (never in this repo)")
    args = parser.parse_args()
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
    others = other_game_names([p for p, _ in found])
    arms = ARMS if args.arms == "both" else (args.arms,)
    print(f"model {args.model} | {len(found)} pictures x {args.samples} tries | ways of asking: {', '.join(arms)}")
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
        "model": args.model, "samples": args.samples, "pictures": len(found),
        "note": f"run {date.today().isoformat()}, {minutes} min, library {corpus_version}",
    }
    report = format_report(meta, runs)
    print()
    print(report)
    if args.write_report:
        sys.path.insert(0, str(ROOT / "scripts" / "lib"))
        import workshop  # noqa: E402

        out = workshop.research_dir(ROOT) / f"screenshot-reading-{date.today().isoformat()}.md"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(report, encoding="utf-8")
        print(f"Wrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
