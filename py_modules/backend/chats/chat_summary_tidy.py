"""Title: Making the chat summary read like a note a person would write

Purpose: The model that sums a chat up (``chat_summary_service.py``) is a small one. On the
Deck it wrote "Game: Parrying practice" (a thing the player asked about, not a game), and
"Player is stuck on: None apparent in this log." (a line that should have been left out, in the
model's own log-speak). This file is the code-side guard that runs on the model's reply before
it is saved: it drops lines that say nothing, and it rewrites the Game line from names that
can be checked instead of trusting the model's.
Used for: ``chat_summary_service.write_chat_summary``, on every finished English summary.
Solves: A card the player reads under "What the AI remembers" that has odd lines on it. A guard
here can be unit-tested; a prompt change alone has to be measured and drifts with the model.
Does not: Ask the model anything, save anything, or touch a summary written in another language
(the empty-answer phrases and the Game label are English wording; a Spanish summary is left
exactly as the model wrote it).

How it works:
 1. Markdown the model was told not to write (bold, bullets, numbers) is stripped, and a line
    that repeats an earlier one is dropped.
 2. A line whose answer is an empty phrase ("None.", "None apparent in this log.", "Not
    specified", "n/a", "unknown", "no sticking point mentioned") is dropped, but only when the
    WHOLE answer is the empty phrase plus filler: "not sure how to beat the boss" and "none of
    the weapons work" say something and are kept as written. If a sentence of real content
    follows an empty first sentence, that sentence is kept as its own line.
 3. Every line that is the Game line (``Game: ...``, ``Games are ...``, ``Game is ...``) is taken
    apart into names. A name is a game only if it is one the chat already knows (the game the
    chat was opened in, or one that was running when a question was asked), a game the notes
    library knows (its titles and nicknames), or a well-known game from the short list the
    library-miss check already uses. Everything else ("Parrying practice", "Action games",
    "General", "Antlion Guard") is thrown away.
 4. One Game line is written from what survives, first, with the chat's own games ahead of any
    the model added. A chat with no game and no game the model named gets no Game line at all.
 5. Nothing else is cut: no real line is dropped to reach a line count.
"""

from __future__ import annotations

import re
from collections import Counter
from typing import Callable, Optional

from backend.services.kb_other_game_named import other_game_named_in
from backend.services.knowledge_base_schema import normalize_alias

MAX_GAMES_SHOWN = 5

# A bullet or number the model put in front of a line.
_LEAD_RE = re.compile(r"^\s*(?:[-*•]\s+|\d{1,2}[.)]\s+)")
_EMPHASIS_RE = re.compile(r"\*\*|__")
# "Stuck on: ..." -- a short label (never a whole sentence) then the answer.
# The colon must be followed by a space (or end the line): "bonsai:vac-check" is not a label.
_LABEL_RE = re.compile(r"^([A-Za-z][A-Za-z' /]{0,40}?):(?:\s+(.*)|\s*)$")
# "Game: x", "Games: x", "Game 1: x", "Game is x", "Games are x", "Games discussed include x",
# "Game unknown". "Game crashes after..." is NOT a Game line (no colon, is, are, include).
_GAME_LINE_RE = re.compile(
    r"^(?:the )?games?(?:\s+\d+)?(?:\s+(?:discussed|title|name))?"
    r"\s*(?::|\bis\b|\bare\b|\binclude[sd]?\b|\bunknown\b)\s*(.*)$",
    re.IGNORECASE,
)
# How an answer that says nothing begins. It is empty only if NOTHING but filler follows (see
# _FILLER_WORDS): "none apparent in this log" is empty, "none of the weapons work" is not.
_EMPTY_HEAD_RE = re.compile(
    r"^(?:none|nothing|nobody|n/?a|na|unknown|unclear|unspecified|undefined|"
    r"not (?:specified|stated|mentioned|known|applicable|clear|available|given|identified|"
    r"determined|sure|yet|decided)|no (?:one|info|information|data|game|specific game))\b"
)
_FILLER_WORDS = frozenset(
    "apparent explicitly specifically specified stated mentioned noted yet so far at this that "
    "time the moment now right currently in log logs chat conversation text transcript here "
    "found given provided available identified reported discussed requested asked applicable "
    "clear known decided specific particular current anywhere all for again and or anything "
    "is was are from".split()
)
# A whole short sentence that says nothing ("No specific current sticking point mentioned.").
# Everything between "no" and the closing word must come from a short list of plain nouns and
# adjectives, so "No weapon works against the boss yet." is never mistaken for one.
_NOTHING_NOUNS = (
    r"(?:specific|current|new|other|further|more|sticking|point|points|problem|problems|issue|"
    r"issues|topic|topics|question|questions|help|request|requests|progress|location|game|"
    r"games|goal|goals|info|information|details|recent|instruction|instructions)"
)
# "...asked about how to answer" -- the model's way of saying the player gave no answering rules.
_ABOUT_ANSWERING = (
    r"(?: (?:about|for|on|regarding) (?:how to answer|answering|answers|replying|how to reply))?"
)
_EMPTY_SENTENCE_RES = (
    re.compile(
        rf"^(?:there (?:is|are) )?no (?:{_NOTHING_NOUNS} ){{0,4}}{_NOTHING_NOUNS}"
        rf"{_ABOUT_ANSWERING}"
        r" (?:(?:were|was|are|is|have been|has been) )?"
        r"(?:mentioned|stated|specified|apparent|identified|discussed|requested|noted|asked|"
        r"given|provided)"
        rf"{_ABOUT_ANSWERING}"
        r"(?: (?:so far|yet|at this time|in (?:this|the) (?:log|chat|conversation|text|"
        r"summary)))?\.?$",
        re.IGNORECASE,
    ),
    re.compile(
        r"^player (?:is|was) (?:currently )?not stuck"
        r"(?: on (?:anything|(?:a |any )?(?:specific )?(?:problem|point|issue|thing)s?))?"
        r"(?: right now| at the moment)?\.?$",
        re.IGNORECASE,
    ),
)
_EMPTY_SENTENCE_MAX_LEN = 90

# What can split one Game line's answer into names.
_NAME_SPLIT_RE = re.compile(r"\s*(?:,|;|&|/|\band\b)\s*", re.IGNORECASE)
_PAREN_RE = re.compile(r"\([^)]*\)")

LibraryTitleLookup = Callable[[str], str]


def known_games_of_chat(chat: Optional[dict], covered_turns: list) -> list[str]:
    """The games the chat itself already knows, most certain first: the game it was opened in,
    then every game that was running when one of the covered turns was asked, most often first.
    Names are kept as the chat spells them, once each."""
    names: list[str] = []
    origin = str((chat or {}).get("origin_app_name") or "").strip()
    if origin:
        names.append(origin)
    counts: Counter = Counter()
    for turn in covered_turns or []:
        name = str((turn or {}).get("app_name") or "").strip()
        if name:
            counts[name] += 1
    for name, _count in counts.most_common():
        if normalize_alias(name) not in {normalize_alias(n) for n in names}:
            names.append(name)
    return names


def _contains_words(haystack: str, needle: str) -> bool:
    if not haystack or not needle:
        return False
    return re.search(rf"(?<!\w){re.escape(needle)}(?!\w)", haystack) is not None


def _name_as_game(item: str, known_games: list[str], library_title: Optional[LibraryTitleLookup]) -> str:
    """The game ``item`` names, spelled the way to show it, or "" when it names no game."""
    norm = normalize_alias(item)
    if len(norm) < 3:
        return ""
    for known in known_games:
        known_norm = normalize_alias(known)
        # Either way round: the model may add words ("... weapon upgrades") or drop one
        # ("Deep Rock Galactic" for "Deep Rock Galactic: Survivor").
        if known_norm and (_contains_words(norm, known_norm) or _contains_words(known_norm, norm)):
            return known
    if library_title is not None:
        try:
            title = str(library_title(item) or "").strip()
        except Exception:  # noqa: BLE001 -- a library hiccup must never cost the summary
            title = ""
        if title:
            return title
    if other_game_named_in(item):
        return re.sub(r"\s+", " ", item).strip(" .")
    return ""


def _split_first_sentence(text: str) -> tuple[str, str]:
    match = re.search(r"\.\s+", text)
    if not match:
        return text, ""
    return text[: match.start()], text[match.end():]


def _is_empty_answer(text: str) -> bool:
    """True only when the WHOLE of ``text`` (the answer after a label) says nothing: an empty
    phrase, optionally followed by filler and nothing else. "None apparent in this log" is empty;
    "none of the weapons work", "not sure how to beat X" and "unknown how to open the gate" go on
    to say something, so they are real and kept. When unsure, the answer is kept."""
    tokens = re.findall(r"[a-z0-9'/]+", text.lower())
    if not tokens:
        return True
    cleaned = " ".join(tokens)
    head = _EMPTY_HEAD_RE.match(cleaned)
    if head is None:
        return _is_empty_sentence(cleaned)
    return all(word in _FILLER_WORDS for word in cleaned[head.end():].split())


def _is_empty_sentence(line: str) -> bool:
    if len(line) > _EMPTY_SENTENCE_MAX_LEN:
        return False
    return any(rx.match(line.strip()) for rx in _EMPTY_SENTENCE_RES)


def _without_empty_head(content: str) -> str:
    """``content`` with a leading empty-answer sentence removed; "" when nothing real is left."""
    head, tail = _split_first_sentence(content)
    if _is_empty_answer(head):
        return tail.strip()
    return content.strip()


def tidy_summary_text(
    text: str,
    *,
    known_games: Optional[list[str]] = None,
    library_title: Optional[LibraryTitleLookup] = None,
) -> str:
    """The model's summary with its empty lines dropped and its Game line rebuilt from names
    that can be checked (see the module docstring). Returns "" when nothing real is left."""
    chat_games = [g for g in (known_games or []) if str(g or "").strip()]
    verified: list[str] = []
    seen_games: set[str] = set()

    def _add_game(name: str) -> None:
        key = normalize_alias(name)
        if key and key not in seen_games:
            seen_games.add(key)
            verified.append(name)

    for name in chat_games:
        _add_game(name)

    kept: list[str] = []
    seen_lines: set[str] = set()

    def _keep(line: str) -> None:
        line = re.sub(r"\s+", " ", line).strip()
        key = normalize_alias(line)
        if line and key and key not in seen_lines:
            seen_lines.add(key)
            kept.append(line)

    for raw in str(text or "").splitlines():
        line = _LEAD_RE.sub("", _EMPHASIS_RE.sub("", raw)).strip()
        if not line:
            continue

        game_match = _GAME_LINE_RE.match(line)
        if game_match:
            head, tail = _split_first_sentence(game_match.group(1).strip())
            for item in _NAME_SPLIT_RE.split(_PAREN_RE.sub("", head).strip(" .")):
                game = _name_as_game(item.strip(" ."), chat_games, library_title)
                if game:
                    _add_game(game)
            tail = tail.strip()
            if tail and not _is_empty_answer(tail) and not _is_empty_sentence(tail):
                _keep(tail)
            continue

        label_match = _LABEL_RE.match(line)
        if label_match:
            label, content = label_match.group(1), label_match.group(2) or ""
            kept_content = _without_empty_head(content)
            if not kept_content or _is_empty_sentence(kept_content):
                continue
            if kept_content != content.strip():
                line = f"{label}: {kept_content}"  # an empty first sentence was cut off
        elif _is_empty_sentence(line):
            continue
        _keep(line)

    shown = verified[:MAX_GAMES_SHOWN]
    lines = kept
    if shown:
        lines = [("Game: " if len(shown) == 1 else "Games: ") + ", ".join(shown)] + kept
    return "\n".join(lines)
