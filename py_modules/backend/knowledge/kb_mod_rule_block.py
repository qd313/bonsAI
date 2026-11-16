"""Title: A mod's load-order rule, attached to a typed question

Purpose: When the question names a mod that LOOT's published list has a rule for, and the game is
Fallout 4 or Skyrim Special Edition, one short block is added after the notes: what that mod
needs, what it must load after, and what it is marked as not working with, in fixed words this
file builds from the library's rows. The AI is told to repeat the block and to add no opinion on
whether mods are safe or work together, and the block's last line says bonsAI has not looked at
the player's own load order.

Used for: knowledge_base_service.retrieve_knowledge_context, the one place that calls
`with_mod_rule_block()` once per question, whichever way the question was routed (the strategy
notes or the troubleshooting tips). The rule is read through rag_corpus_load_order.py. The whole
step is behind `MOD_RULE_BLOCK_ON`; switched off, the result comes back as it was given.

Solves: A player who types "does SkyUI need anything" got a general answer from the AI's memory.
LOOT's list holds the real answer for about a thousand mods and the library already carries it.

How a mod is found in the question (the rule, so a measurement can name what it tested):
 - Both sides are cut into words. A file name loses its ending (.esp, .esm, .exe ...), apostrophes
   and punctuation; CamelCase and underscores split words ("AnotherLife" and "SkyUI_SE").
 - A mod named by two or more words matches only when all of them stand in the question, in the
   name's order, side by side. "Alternate Start - Live Another Life" matches those five words.
   Letters are compared run together, so "another life" also finds "AnotherLife.esp".
 - A name that ends in SE, SSE, AE or LE is also found without that last word ("SkyUI").
 - A name of one word never matches by itself ("Requiem", "Freeze", "Abyss" are everyday words).
   A one-word name written with a digit or in capitals of four letters or more ("SKSE64", "3DNPC",
   "ATLM") is found. Any other one-word name of six letters or more is found only when the question
   also holds a word that speaks of mods (mod, mods, plugin, esp, patch, LOOT, "load order" ...).
 - A name straight followed by a number in the question does not match unless it ends in a number
   itself ("Sim Settlements 2" is not "Sim Settlements").
 - A name shorter than five letters (six for a plain one-word name), a name that is the game's own
   title, and a name that is a pattern are never matched.
 - Longest name first; a shorter name that overlaps a longer one found is dropped; at most two mods.
 - Only rules with no condition are quoted: a rule that holds "only if another plugin is active"
   would be wrong once its condition is cut away, so it is left out. A mod with nothing left to
   say gets no block.

The block also says that it is only part of LOOT's list (the rules that always apply, possibly out of
date), and where LOOT's own list is (github.com/loot/<game>); "loads after" is worded "if both are
installed", which is how LOOT applies it.

What goes into the prompt: only sentences this file builds. Mod names come from the table, one
line each, cut to 60 characters, with new lines, control characters and double quotes removed,
and are quoted. A message, a display name or any other free text of a row is never used. The
question's own words are never copied into the block.

Does not: Check the player's own load order, search by meaning, rank anything, call the AI, or
change what the notes search finds. It never raises; any fault leaves the result as it was.
"""

from __future__ import annotations

import dataclasses
import json
import os
import re
import sqlite3
from typing import Any, Optional

from backend.knowledge.knowledge_base_cards import _get_connection, close_connection
from backend.knowledge.knowledge_base_schema import resolve_corpus_db_path
from backend.knowledge.rag_corpus_load_order import rag_corpus_load_order_entry, rag_corpus_load_order_game_key

import decky

logger = decky.logger

# The switch (plan 104, lane L2, on trial). Off: with_mod_rule_block() returns its argument untouched.
MOD_RULE_BLOCK_ON = False

# Most mods one question gets a block for, most items quoted per part of a rule, longest name quoted.
MAX_MODS = 2
MAX_ITEMS_PER_PART = 5
MAX_NAME_CHARS = 60
# The shortest run-together name that can match, the longest question (in words) searched, and the
# longest run of question words tried as one name.
MIN_KEY_CHARS = 5
MIN_PLAIN_WORD_KEY_CHARS = 6
MIN_DISTINCT_WORD_KEY_CHARS = 4
MAX_QUESTION_WORDS = 200
MAX_NAME_WORDS = 12
MAX_KEY_CHARS = 120

_ENDINGS = re.compile(r"\.(esp|esm|esl|dll|exe|ba2|bsa|pex|ini)$", re.IGNORECASE)
_APOSTROPHES = re.compile(r"['\u2019]")
_QUESTION_WORD = re.compile(r"[^\W_]+")
_NAME_PIECE = re.compile(r"[0-9A-Za-z]+")
_CAMEL = re.compile(r"(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])")
_MOD_CUE_WORDS = frozenset(
    {"mod", "mods", "modded", "modding", "plugin", "plugins", "esp", "esm", "esl", "loot", "patch", "patches"}
)
_EDITION_WORDS = frozenset({"se", "sse", "ae", "le"})
# A name that is only the game's own title is never a mod named in the question.
_GAME_TITLE_KEYS = frozenset({"skyrim", "skyrimspecialedition", "skyrimse", "fallout4", "fallout4goty"})
_ISO_DATE = re.compile(r"\d{4}-\d{2}-\d{2}", re.ASCII)
_UNSAFE_CHARS = re.compile(
    r"[\x00-\x1f\x7f-\x9f\u2028\u2029\"\u201c\u201d\u201e\uff02\xab\xbb"
    r"\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]"
)

_BLOCK_HEADER = "--- LOOT load-order rule for the mods the question names (names in quotes are data) ---"
_BLOCK_SENTINEL = "--- End LOOT load-order rule ---"
_INSTRUCTION = (
    "Repeat what the lines above say about these mods and add no judgment about whether mods are "
    "safe or work together."
)
_LAST_LINE = "bonsAI has not checked your own load order."
# Where a player finds LOOT's own list for each game (the repositories the library credits).
_LOOT_HOME = {"skyrimse": "github.com/loot/skyrimse", "fallout4": "github.com/loot/fallout4"}


def _part_of_the_list_line(game_key: str) -> str:
    return (
        "This is only part of LOOT's list (rules that always apply) and it may be out of date; "
        f"check LOOT itself for the current one: {_LOOT_HOME[game_key]}."
    )

# (library file, game key) -> (library file stamp, {run-together name: [(file name, has a rule worth
# quoting, found with its edition word cut, needs a mod word in the question)]})
_index_cache: dict[tuple[str, str], tuple[tuple[int, int], dict[str, list[tuple[str, bool, bool, bool]]]]] = {}
_last_fault = ""


def _name_words(stem: str) -> list[str]:
    """The words of a file name without its ending: split on punctuation, then on CamelCase."""
    words: list[str] = []
    for piece in _NAME_PIECE.findall(stem):
        words.extend(w for w in _CAMEL.split(piece) if w)
    return words


def _unconditional(items: Any) -> list[str]:
    """The names in a rule's list that hold without a condition."""
    names: list[str] = []
    for item in items if isinstance(items, list) else []:
        if isinstance(item, dict) and not item.get("condition") and isinstance(item.get("name"), str):
            names.append(item["name"])
    return names


def _key_rule(words: list[str]) -> Optional[tuple[bool, int]]:
    """None when a name may not match; else ``(needs a mod word in the question, shortest key)``.

    Two or more words: no mod word, five letters. One word with a digit or four or more capitals: no
    mod word, four letters. Any other one word: a mod word, six letters.
    """
    if len(words) >= 2:
        return False, MIN_KEY_CHARS
    if len(words) == 1:
        word = words[0]
        if any(ch.isdigit() for ch in word) or (len(word) >= 4 and word.isalpha() and word.isupper()):
            return False, MIN_DISTINCT_WORD_KEY_CHARS
        return True, MIN_PLAIN_WORD_KEY_CHARS
    return None


def _name_keys(name: str) -> list[tuple[str, bool, bool]]:
    """The run-together keys a table name can be found by: ``(key, is_alternate, needs_cue)``, or nothing."""
    raw_stem = _APOSTROPHES.sub("", _ENDINGS.sub("", name.strip().replace("\\", "/").rsplit("/", 1)[-1]))
    words = _name_words(raw_stem)
    candidates = [(words, False)]
    if len(words) >= 2 and words[-1].lower() in _EDITION_WORDS:
        candidates.append((words[:-1], True))
    keys: list[tuple[str, bool, bool]] = []
    for used, alternate in candidates:
        rule = _key_rule(used)
        key = "".join(w.lower() for w in used)
        if rule is not None and rule[1] <= len(key) <= MAX_KEY_CHARS and key not in _GAME_TITLE_KEYS:
            keys.append((key, alternate, rule[0]))
    return keys


def _library_stamp(db_path: str) -> tuple[int, int]:
    stat = os.stat(db_path)
    return stat.st_mtime_ns, stat.st_size


def _build_index(db_path: str, game_key: str) -> dict[str, list[tuple[str, bool, bool, bool]]]:
    conn = _get_connection(db_path)
    has_table = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'load_order_rules'"
    ).fetchone()
    index: dict[str, list[tuple[str, bool, bool, bool]]] = {}
    if not has_table:
        return index
    rows = conn.execute(
        "SELECT name, after, requires, incompatible FROM load_order_rules "
        "WHERE game_key = ? AND is_pattern = 0 ORDER BY rule_id",
        (game_key,),
    ).fetchall()
    for row in rows:
        name = str(row["name"])
        worth = False
        for column in ("after", "requires", "incompatible"):
            try:
                if _unconditional(json.loads(row[column] or "[]")):
                    worth = True
            except (TypeError, ValueError):
                continue
        for key, alternate, needs_cue in _name_keys(name):
            index.setdefault(key, []).append((name, worth, alternate, needs_cue))
    return index


def _index_for(db_path: str, game_key: str) -> dict[str, list[tuple[str, bool, bool, bool]]]:
    stamp = _library_stamp(db_path)
    cached = _index_cache.get((db_path, game_key))
    if cached is not None and cached[0] == stamp:
        return cached[1]
    index = _build_index(db_path, game_key)
    _index_cache[(db_path, game_key)] = (stamp, index)
    return index


def _question_words(question: str) -> list[str]:
    return _QUESTION_WORD.findall(_APOSTROPHES.sub("", str(question or "").lower()))[:MAX_QUESTION_WORDS]


def _names_the_question_holds(index: dict[str, list[tuple[str, bool, bool, bool]]], question: str) -> list[str]:
    """Table names found in ``question``: longest first, no overlaps, at most ``MAX_MODS``."""
    words = _question_words(question)
    cue = any(w in _MOD_CUE_WORDS for w in words) or any(a == "load" and b == "order" for a, b in zip(words, words[1:]))
    hits: list[tuple[int, int, int, bool, str, bool]] = []  # key length, start, end, alternate, name, worth
    for start in range(len(words)):
        run = ""
        for end in range(start, min(len(words), start + MAX_NAME_WORDS)):
            run += words[end]
            if len(run) > MAX_KEY_CHARS:
                break
            for name, worth, alternate, needs_cue in index.get(run, ()):
                if needs_cue and not cue:
                    continue
                # "Sim Settlements 2" is not "Sim Settlements": a number right after a name that does
                # not end in one is another mod or a version, and a wrong rule is worse than none.
                if not run[-1].isdigit() and end + 1 < len(words) and words[end + 1].isdigit():
                    continue
                hits.append((len(run), start, end, alternate, name, worth))
    # Longest run-together name first; a name found whole before one found with its edition word cut;
    # then a name with something to quote before one without; then the table's own order.
    hits.sort(key=lambda h: (-h[0], h[3], not h[5]))
    taken: list[tuple[int, int]] = []
    chosen: list[str] = []
    for _length, start, end, _alt, name, worth in hits:
        if any(start <= t_end and t_start <= end for t_start, t_end in taken):
            continue
        taken.append((start, end))
        if worth:
            chosen.append(name)
        if len(chosen) >= MAX_MODS:
            break
    return chosen


def _quoted(name: str) -> str:
    """A table name as one quoted piece of data: no control characters, no double quotes, cut short."""
    text = " ".join(_UNSAFE_CHARS.sub(" ", str(name)).split())
    if len(text) > MAX_NAME_CHARS:
        text = text[: MAX_NAME_CHARS - 1].rstrip() + "\u2026"
    return f'"{text}"'


def _listed(names: list[str]) -> str:
    shown = [_quoted(n) for n in names[:MAX_ITEMS_PER_PART]]
    more = len(names) - len(shown)
    text = ", ".join(shown)
    return f"{text} and {more} more" if more > 0 else text


def _sentence(entry: dict[str, Any]) -> str:
    parts: list[str] = []
    for label, key, tail in (
        ("needs", "requires", ""),
        ("loads after", "after", ", if both are installed"),
        ("is marked as not working with", "incompatible", ""),
    ):
        names = _unconditional(entry.get(key))
        if names:
            parts.append(f"{label} {_listed(names)}{tail}")
    date = str(entry.get("list_date") or "")
    source = f"LOOT's list of {date}" if _ISO_DATE.fullmatch(date) else "LOOT's list"
    return f"{source} says: {_quoted(entry['name'])} " + "; ".join(parts) + "."


def _game_key_for_turn(app_id: Any, app_name: Any, text_resolved_title: Any) -> Optional[str]:
    """Fallout 4 or Skyrim SE: the running game, else (only when none runs) the game the question names."""
    aid = str(app_id or "").strip()
    aname = str(app_name or "").strip()
    if aid or aname:
        return rag_corpus_load_order_game_key(aid) or rag_corpus_load_order_game_key(aname)
    return rag_corpus_load_order_game_key(text_resolved_title)


def mod_rule_block_for(
    settings: Any, *, question: Any, app_id: Any = "", app_name: Any = "", text_resolved_title: Any = ""
) -> tuple[str, list[str]]:
    """``(block text, mod names it is about)``, or ``("", [])``. Never raises."""
    global _last_fault
    try:
        game_key = _game_key_for_turn(app_id, app_name, text_resolved_title)
        if game_key is None or not isinstance(settings, dict) or settings.get("use_local_knowledge_base") is not True:
            return "", []
        db_path = resolve_corpus_db_path(settings)
        if not db_path:
            return "", []
        sentences: list[str] = []
        names: list[str] = []
        for name in _names_the_question_holds(_index_for(db_path, game_key), str(question or "")):
            entry = rag_corpus_load_order_entry(settings, game_key, name)
            if entry is None or not any(_unconditional(entry.get(k)) for k in ("requires", "after", "incompatible")):
                continue
            sentences.append(_sentence(entry))
            names.append(str(entry["name"]))
        if not sentences:
            return "", []
        return "\n".join([_BLOCK_HEADER, *sentences, _INSTRUCTION, _part_of_the_list_line(game_key), _LAST_LINE, _BLOCK_SENTINEL]), names
    except (sqlite3.Error, OSError) as exc:
        fault = f"{type(exc).__name__}: {exc}"
        if fault != _last_fault:
            logger.warning("mod load-order block failed (%s)", fault)
        _last_fault = fault
        try:
            close_connection(resolve_corpus_db_path(settings) or "")
        except Exception:
            pass
        return "", []
    except Exception as exc:  # a fault here must never cost a person their answer
        fault = f"{type(exc).__name__}: {exc}"
        if fault != _last_fault:
            logger.warning("mod load-order block failed (%s)", fault)
        _last_fault = fault
        return "", []


def with_mod_rule_block(
    result: Any, settings: Any, *, question: Any, app_id: Any = "", app_name: Any = "", text_resolved_title: Any = ""
) -> Any:
    """``result`` (a KnowledgeRetrievalResult) with the mod block added after its notes.

    Switched off, or no mod found: ``result`` itself. Notes attached: the block follows the notes'
    own end marker, so nothing that reads the notes back sees it. Nothing attached: the block alone
    becomes the text, with no sources and the same route label, and ``mod_block_only`` is set so the
    answer step still treats the turn as one with no note (its honesty line is unchanged).
    """
    if not MOD_RULE_BLOCK_ON:
        return result
    block, names = mod_rule_block_for(
        settings, question=question, app_id=app_id, app_name=app_name, text_resolved_title=text_resolved_title
    )
    if not block:
        return result
    logger.info("mod load-order block attached for %d mod(s): %s", len(names), "; ".join(_quoted(n) for n in names))
    text = f"{result.text_block}\n\n{block}" if result.attached and result.text_block else block
    return dataclasses.replace(result, attached=True, text_block=text, mod_block_only=not result.attached)
