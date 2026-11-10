"""Title: The picture's own guess, as extra words for the note search

Purpose: Before the notes are searched for a Strategy question that carries a picture, ask the
picture model one short question about the picture (the game, the place, any boss or enemy) and
turn its three lines into a few plain search words, dropping every "not sure". Plan 103 lane P2.
Used for: game_ai_request.run_game_ai_request, once per picture turn, between the "should we search"
check and the search itself; scripts/kb/eval_screenshot_reading.py, which measures the extra call.
Solves: "How do I beat this" with a boss on screen searched the notes for "how do I beat this" and
nothing else; the picture was only shown to the AI after the notes had already been chosen.
Does not: Search the notes, change what the person or the AI is told, or run at all while
PICTURE_GUESS_ON is False (it lands switched off: the four pictures with a note were too few to
carry an "on" decision). The guess's words never leave the search words: they are not shown, not
saved and not put in the AI's prompt, and read_guess() lets through only letters, digits and
spaces, at most 3 lines, 8 words a line and 14 words in all.
"""
from __future__ import annotations

import asyncio
import functools
import re
import threading
import time
import unicodedata
from dataclasses import dataclass
from typing import Any, Optional

import decky

from backend.ask.ask_payload import screen_ask_attachments
from backend.ask.ollama_ask_extras import resolve_ask_model_routing
from backend.ask.ollama_chat_stream import _stream_ollama_chat_once
from backend.ask.ollama_window_fit import ollama_base_from_chat_url
from backend.media.screenshot_media import prepare_attachment_images
from backend.ollama.local_ollama_setup_service import list_installed_ollama_tags
from backend.ollama.ollama_keep_alive_rule import effective_keep_alive
from backend.ollama.ollama_urls import normalize_ollama_base
from backend.ollama.token_accounting_service import choose_window_tokens, known_window_tokens

logger = decky.logger

# The switch. Off: no extra call is ever made and every turn is exactly what it was. Plan 103 call 10
# turns it on only for Strategy with a picture and the library on, and only if the right note is found at
# least twice as often and the extra call adds under ten seconds on the PC; the labelled set had too few
# pictures with a note (four, none a boss) to say so, so it ships off.
PICTURE_GUESS_ON = False

# Long enough for a cold start of the small model on the Deck; the answer waits behind this call, so a
# stuck one must end. Past it the question is searched the ordinary way.
PICTURE_GUESS_TIME_LIMIT_SECONDS = 60

PICTURE_GUESS_QUESTION = (
    "Name the game, the place, and any boss or enemy you can see. Three short lines, starting "
    "Game:, Place: and Enemy:. Write 'not sure' where you are not."
)
PICTURE_GUESS_SYSTEM = "You look at one video game screenshot and name what is on it. No other text."

# What the call is asked to stay within: three short lines is about 40 tokens.
_GUESS_BUDGETS = {"num_predict": 120, "think": False, "visible_num_predict": 120, "thinking_budget": 0}

STOPPED_RESULT = {
    "success": False,
    "response": "Request stopped (connection closed).",
    "model_policy_disclosure": None,
    "cancelled": True,
}

_SLOTS = ("game", "place", "enemy")
_LABEL_SLOT = {
    "game": "game", "title": "game", "place": "place", "location": "place", "area": "place",
    "level": "place", "enemy": "enemy", "enemies": "enemy", "boss": "enemy", "boss or enemy": "enemy",
    "boss enemy": "enemy", "enemy or boss": "enemy",
}
# A value that says it does not know. Phrases no game name starts with count however long the value is.
_NOT_SURE_STARTS = (
    "not sure", "not certain", "not clear", "not visible", "not applicable", "not able", "not identif",
    "not possible", "not shown", "unsure", "unclear", "cannot", "can t", "cant", "unable", "i don t",
    "i do not", "i cannot", "i can t", "no boss", "no enemy", "no enemies", "no visible", "no place",
    "no game", "no idea", "no clear", "no specific",
)
# One word that is a refusal when it is nearly all the value ("none", "unknown place") and a name when
# it starts a longer one ("Nothing Beside Remains", "Unknown 9: Awakening" is two words and is lost).
_NOT_SURE_SHORT = ("none", "unknown", "nothing", "n a", "na")
_MAX_LINES = 3
_MAX_WORDS_PER_LINE = 8
_MAX_WORDS_IN_ALL = 14
_NOT_ALNUM = re.compile(r"[^0-9a-z ]+")
# A line's list mark: bullets, quote or heading marks, "1." or "2)" -- but not a game that starts with a number.
_LIST_MARK = re.compile(r"^(?:[\s>*_#\-\u2022]+|\d+[.)]\s+)+")
# "Hornet's" is searched as "Hornet": a stray "s" would match almost any note (see _fts_match_query).
_POSSESSIVE = re.compile(r"['\u2019]s\b")


@dataclass
class PictureGuess:
    """What the picture model named. Each field is "" where it was not sure or said nothing."""

    game: str = ""
    place: str = ""
    enemy: str = ""
    lines_read: int = 0
    not_sure_lines: int = 0

    @property
    def search_words(self) -> str:
        """The words that join the search: game, place, enemy, in that order, at most 14 words."""
        words = " ".join(w for w in (self.game, self.place, self.enemy) if w).split()
        return " ".join(words[:_MAX_WORDS_IN_ALL])


@dataclass
class GuessOutcome:
    """How one first call ended. ``status``: written, skipped, failed or stopped."""

    status: str
    guess: PictureGuess
    seconds: float = 0.0
    model: str = ""
    raw: str = ""
    error: str = ""


def _plain(text: str) -> str:
    """Lower case letters and digits only, one space between words: how every value is compared."""
    folded = unicodedata.normalize("NFKD", str(text or "")).encode("ascii", "ignore").decode("ascii")
    return " ".join(_NOT_ALNUM.sub(" ", folded.lower().replace("'", " ")).split())


def _says_not_sure(value: str) -> bool:
    plain = _plain(value)
    if not plain or any(plain == s or plain.startswith(s + " ") for s in _NOT_SURE_STARTS):
        return True
    return len(plain.split()) <= 2 and any(plain == s or plain.startswith(s + " ") for s in _NOT_SURE_SHORT)


def _search_safe(value: str) -> str:
    """A value cut down to letters, digits and spaces, bracketed asides removed, at most 8 words, with
    its capitals kept (the library's search ignores them; a person reading the log does not)."""
    unbracketed = re.sub(r"[(\[{<][^)\]}>]*[)\]}>]?", " ", str(value or ""))
    folded = unicodedata.normalize("NFKD", unbracketed).encode("ascii", "ignore").decode("ascii")
    words = re.sub(r"[^0-9A-Za-z ]+", " ", _POSSESSIVE.sub("", folded).replace("'", "")).split()
    return " ".join(words[:_MAX_WORDS_PER_LINE])


def read_guess(reply: str) -> PictureGuess:
    """Turn the model's reply into a guess. Reads at most three lines; a line starting ``Game:``,
    ``Place:`` or ``Enemy:`` (a few other labels count) goes to that slot, an unlabelled line goes to the
    next slot not yet filled, in the order game, place, enemy. A "not sure" value, or a value with no
    letter or digit left after cleaning, leaves its slot empty. Anything else is thrown away."""
    guess = PictureGuess()
    taken: set[str] = set()
    lines = [_LIST_MARK.sub("", ln).replace("*", "").strip() for ln in str(reply or "").splitlines()]
    for line in [ln for ln in lines if ln][:_MAX_LINES]:
        label, sep, rest = line.partition(":")
        slot = _LABEL_SLOT.get(_plain(label)) if sep else None
        value = rest if slot else line
        if slot is None:
            slot = next((s for s in _SLOTS if s not in taken), "")
        if not slot or slot in taken:
            continue
        taken.add(slot)
        guess.lines_read += 1
        if _says_not_sure(value):
            guess.not_sure_lines += 1
            continue
        setattr(guess, slot, _search_safe(value))
    return guess


def with_guess_words(search_words: str, guess: PictureGuess) -> str:
    """The words the notes are searched for: the ones already there, then the guess's, the way a follow-up's
    remembered subject is added (kb_followup_memory.augment_search_words). Unchanged when the guess has none."""
    return f"{search_words} {guess.search_words}" if guess.search_words else search_words


def picture_guess_applies(*, ask_mode: str, has_picture: bool, library_on: bool, domain: str, switch: Optional[bool] = None) -> bool:
    """True when this turn gets the extra call: the switch is on, a picture is attached, the library is
    on, the turn is Strategy and its notes search is the strategy one (a troubleshooting turn is not)."""
    on = PICTURE_GUESS_ON if switch is None else switch
    return bool(on and has_picture and library_on and (ask_mode or "").strip().lower() == "strategy" and domain == "strategy")


def _wire_stop(plugin: Any, url: str, model_name: str):
    """Make a Stop pressed during this call close this call's connection, and say whether one was
    pressed. Returns the check. The flag is lowered first: after a Stop it stays raised until the next
    call lowers it, so a call that did not would stop itself at once (the trap chat_summary_service names)."""
    abort_evt = getattr(plugin, "_abort_current_ollama_chat", None)
    if isinstance(abort_evt, threading.Event):
        abort_evt.clear()
    plugin._chat_resp_ready_evt = threading.Event()
    plugin._active_ollama_chat_pc_ip = ollama_base_from_chat_url(url)
    plugin._active_ollama_chat_model = str(model_name)

    def _opened(resp: Any) -> None:
        plugin._active_ollama_chat_http_response = resp
        plugin._chat_resp_ready_evt.set()

    def _done() -> None:
        plugin._active_ollama_chat_http_response = None

    def _check() -> bool:
        check = getattr(plugin, "_abort_ollama_chat_check", None)
        return bool(check and check())

    return _check, _opened, _done


async def ask_picture_guess(plugin: Any, *, url: str, model_name: str, image_b64: str, keep_alive: str, window_tokens: int) -> GuessOutcome:
    """The one short streamed call: the question, the one picture, three lines back. Makes no answer
    text appear on screen (no delta callback), saves nothing, never raises."""
    started = time.time()
    messages = [
        {"role": "system", "content": PICTURE_GUESS_SYSTEM},
        {"role": "user", "content": PICTURE_GUESS_QUESTION, "images": [image_b64]},
    ]
    check, opened, done = _wire_stop(plugin, url, model_name)
    try:
        result = await asyncio.get_running_loop().run_in_executor(
            None,
            functools.partial(
                _stream_ollama_chat_once, url, model_name, messages, PICTURE_GUESS_TIME_LIMIT_SECONDS, logger,
                dict(_GUESS_BUDGETS), "speed", keep_alive, check, opened, done, None,
                requested_window_tokens=int(window_tokens or 0),
            ),
        )
    except Exception as exc:  # noqa: BLE001 -- a failed first call must never cost the question
        logger.warning("picture_guess: call failed: %s", exc)
        return GuessOutcome("failed", PictureGuess(), round(time.time() - started, 2), model_name, error=str(exc))
    finally:
        plugin._active_ollama_chat_pc_ip = None
        plugin._active_ollama_chat_model = None
    seconds = round(time.time() - started, 2)
    if result.get("cancelled"):
        return GuessOutcome("stopped", PictureGuess(), seconds, model_name)
    raw = str(result.get("visible_raw") or "") if result.get("success") else ""
    if not raw.strip():
        return GuessOutcome("failed", PictureGuess(), seconds, model_name, error=str(result.get("response") or "empty reply")[:200])
    return GuessOutcome("written", read_guess(raw), seconds, model_name, raw=raw)


async def guess_picture(plugin: Any, settings: dict, attachments: Any, pc_ip: str, preferred_model: Optional[str] = None) -> GuessOutcome:
    """Work out, the way the answer's own call will, which model reads the picture and what the picture
    looks like to it (the same attachment preset, the same model routing, the same room asked of the
    server, so the model is not reloaded for the answer), then make the one call. "skipped" when there is
    no picture to read or no model to read it."""
    cleaned, _paths, refused = screen_ask_attachments(settings, attachments)
    if refused or not cleaned:
        return GuessOutcome("skipped", PictureGuess())
    preset = str(settings.get("screenshot_attachment_preset") or "low")
    images, warnings, errors = await asyncio.to_thread(prepare_attachment_images, cleaned, preset if preset in ("low", "mid", "max") else "low")
    if not images:
        return GuessOutcome("skipped", PictureGuess())
    _host, _port, base = normalize_ollama_base(pc_ip)
    tags = await asyncio.to_thread(list_installed_ollama_tags, base)
    models = resolve_ask_model_routing(
        requires_vision=True, settings=settings, installed_tags=tags, preferred_model=preferred_model,
        attachment_warnings=warnings, attachment_errors=errors, prepared_image_count=len(images),
    )[0]
    if not tags or not models:
        return GuessOutcome("skipped", PictureGuess())
    url = plugin._build_ollama_chat_url(pc_ip)
    window = await asyncio.to_thread(choose_window_tokens, base, models[0], logger=logger) or known_window_tokens(base, models[0])
    keep_alive = effective_keep_alive(settings.get("ollama_keep_alive"), url, source="ask")
    return await ask_picture_guess(plugin, url=url, model_name=models[0], image_b64=images[0]["image_b64"], keep_alive=keep_alive, window_tokens=window)


async def add_picture_guess_words(
    plugin: Any, settings: dict, attachments: Any, pc_ip: str, preferred_model: Optional[str],
    ask_mode: str, search_words: str, library_on: bool, domain: str,
) -> tuple[str, bool]:
    """The call site's one call. Returns ``(search words, stopped)``: the words handed in, with the
    picture's guess added on the end when this turn gets the extra call and the call gave one; and True
    only when a Stop landed during the call, in which case the caller makes no answer call and returns
    ``STOPPED_RESULT``. Never raises; with the switch off it returns the words unchanged at once."""
    if not picture_guess_applies(ask_mode=ask_mode, has_picture=bool(attachments), library_on=library_on, domain=domain):
        return search_words, False
    try:
        outcome = await guess_picture(plugin, settings, attachments, pc_ip, preferred_model)
    except Exception as exc:  # noqa: BLE001 -- the ordinary search is always the fallback
        logger.warning("picture_guess: skipped: %s", exc)
        return search_words, False
    if outcome.status == "stopped":
        logger.info("picture_guess: stopped by the person after %.1f s", outcome.seconds)
        return search_words, True
    joined = with_guess_words(search_words, outcome.guess)
    logger.info("picture_guess: %s in %.1f s, model %s, %d search words added", outcome.status, outcome.seconds, outcome.model or "-", len(joined.split()) - len(search_words.split()))
    return joined, False
