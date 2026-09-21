"""Title: Knowing the real token numbers instead of guessing at them

Purpose: Every question the plugin sends has to fit inside a fixed amount of
room, measured in tokens. Until now the plugin guessed at two of the three
numbers involved: it assumed the room was always 4,096 tokens, and it worked
out how big a question was by counting characters and dividing by 3.5. This
file replaces both guesses with the real numbers -- it asks the AI server how
much room the model was actually loaded with, and it learns the real size of
the plugin's own text from the counts the server hands back after every reply.
Used for: deciding how long a reply may be, and (later) how much of a chat can
be carried into the next question.
Solves: both guesses were wrong on the Deck, and both cost a person something.
The room is not always 4,096 -- that is only what this server happens to load
by default, and the model itself can hold far more. And counting characters
and dividing by 3.5 makes the plugin's own prompts look about a quarter bigger
than they are, so the plugin trims replies to make space that was never
needed. Measured on the Deck 2026-09-20; the numbers are in the comments below.
Does not: change how much room anything is given, set the size of the room, or
decide what gets dropped when something will not fit. It only reports honest
numbers for those decisions to be made from.

How it works:
 1. `resolve_window_tokens()` asks the AI server which models it has in memory
    right now and how much room each was loaded with. That answer is the truth
    about this moment, which the model's own advertised maximum is not.
 2. The answer is remembered for the rest of the plugin session, per server and
    model, so an ordinary question never pays for that extra round trip.
 3. If the server cannot be reached, or the model is not in memory yet, the old
    assumption of 4,096 is used, because being wrong in that direction only
    costs reply length -- being wrong the other way loses half the question.
 4. `note_real_counts()` is handed the true size of each question after the
    reply arrives. It keeps the last twenty of those per model and works out how
    many characters really make up a token, so the next guess is close.
 5. `estimate_tokens_from_chars()` uses what was learned, plus a small safety
    margin, because going even one token over the room costs half of everything
    sent -- see `OVERFLOW_SURVIVING_FRACTION`.
"""

from __future__ import annotations

import json
import math
import statistics
import urllib.request
from typing import Any, Optional

# What the Deck loads with when nothing asks for anything different. Measured on the Deck
# 2026-09-20 with Ollama 0.34.1: gemma4:e2b-it-qat reports context_length 4096 in /api/ps,
# while the model itself advertises 131,072. The 4,096 is the server's default, not a limit
# of the model or of the machine. Kept as the fallback only -- being wrong low costs reply
# length, being wrong high loses half the question (see below).
FALLBACK_WINDOW_TOKENS = 4096

# How much room to ask the server for. Measured on the Deck 2026-09-20 and chosen by the
# maintainer the same day: the model itself can hold 131,072, and asking for four times the
# default costs 0.6 GB of memory and NOTHING else. Against a fixed graphics load the model parked
# at 4,096 and at 16,384 scored 17,897 and 17,859 -- the same number twice -- and answers came out
# at the same 21.7 tokens a second at every size with a game running.
PREFERRED_WINDOW_TOKENS = 16384

# Changing the size makes the server reload the model: measured 5.7 to 8.1 seconds on an idle
# Deck, and 10 to 16 with a game running. Asking for the SAME size again costs nothing at all
# (0.0 seconds, three times in a row). So the size is chosen once per model per plugin session and
# never varies -- not per question, not per Ask mode, not per chat. Anything that varies it hands
# every affected question a model reload.
WINDOW_RELOAD_SECONDS_IDLE = 6

# Measured on the Deck 2026-09-20. A question that does not fit is not trimmed to the edge of
# the room: the server throws away everything but about HALF the room and answers from that.
# Sending 4,220 tokens into a 4,096-token room delivered 2,051 of them; sending 19,620 into the
# same room also delivered 2,051. So there is no gentle slope here, only a cliff -- one token
# too many costs roughly half of everything, and it is always the START that is lost, which is
# where the identity block, the rules and the game cards live.
OVERFLOW_SURVIVING_FRACTION = 0.5

# The old guess, kept as the starting point for a model nothing has been learned about yet.
# Deliberately pessimistic: on the plugin's own prompts the real figure measured 4.3 to 4.5
# characters per token, so 3.5 makes a prompt look about a quarter bigger than it is.
FALLBACK_CHARS_PER_TOKEN = 3.5

# A learned figure is still a guess about the NEXT question, so it is padded before use. 8% was
# chosen because it covers the spread measured across the plugin's three Ask modes (4.30, 4.38
# and 4.48 characters per token) without giving back the quarter that 3.5 was costing.
#
# The padding applies ONLY to a learned figure. The 3.5 fallback is already pessimistic by about
# a quarter, and padding that again would make the very first question of a session worse than it
# is today -- the opposite of the point. So until this model has been watched, nothing changes.
ESTIMATE_SAFETY_MARGIN = 1.08

# A learned figure outside this band is not believed. Text made almost entirely of punctuation
# or of long words can sit near either edge; anything past them means the sample was wrong
# rather than the text unusual -- an image attachment is the likely cause, and those are skipped.
MIN_CHARS_PER_TOKEN = 2.5
MAX_CHARS_PER_TOKEN = 6.0

# How many replies are remembered per model before the oldest is dropped. Twenty is enough for
# the middle value to settle and short enough that a change of prompt shape is noticed quickly.
SAMPLES_KEPT_PER_MODEL = 20

# Below this many real tokens a sample is not learned from: the fixed chat-template wrapper
# (15 tokens on the Deck's model) is a large enough share of a short exchange to skew the figure.
MIN_SAMPLE_TOKENS = 200

# Session caches. Process lifetime is exactly plugin-session lifetime. Both hold facts that are
# cheap to relearn, so a stale entry costs one slightly-off estimate, never a wrong answer.
# Tests MUST call reset_token_accounting() in setUp rather than depend on execution order.
_WINDOW_BY_HOST_AND_MODEL: dict[tuple[str, str], int] = {}
_CHAR_SAMPLES_BY_MODEL: dict[str, list[float]] = {}
_ASKED_FOR_BY_HOST_AND_MODEL: dict[tuple[str, str], int] = {}


def reset_token_accounting() -> None:
    """Test-only: forget every learned window and every learned character count."""
    _WINDOW_BY_HOST_AND_MODEL.clear()
    _CHAR_SAMPLES_BY_MODEL.clear()
    _ASKED_FOR_BY_HOST_AND_MODEL.clear()


def _read_loaded_windows(base_http: str, timeout_seconds: float = 4.0) -> dict[str, int]:
    """Map model name to the room it is loaded with right now, from ``GET {base}/api/ps``.

    Empty on any failure, and on an older server that does not report the figure. Never raises:
    a question must still go out when this cannot be answered.
    """
    base = str(base_http or "").rstrip("/")
    try:
        req = urllib.request.Request(base + "/api/ps", method="GET")
        with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception:
        return {}
    models = data.get("models") if isinstance(data, dict) else None
    if not isinstance(models, list):
        return {}
    found: dict[str, int] = {}
    for entry in models:
        if not isinstance(entry, dict):
            continue
        name = str(entry.get("name") or entry.get("model") or "").strip()
        window = entry.get("context_length")
        if name and isinstance(window, int) and window > 0:
            found[name] = window
    return found


def window_is_known(base_http: str, model_name: str) -> bool:
    """True only when a real answer has been read back from the server for this model.

    The difference matters. ``known_window_tokens`` returns 4,096 both when the server really said
    4,096 and when nothing is loaded and nothing could be asked, and those are not the same fact.
    Treating the second as the first made a log line claim a model was "loaded with 4096" when
    nothing was loaded at all, and would let the never-lower rule below fire on a number nobody
    ever reported.
    """
    host = str(base_http or "").strip().rstrip("/")
    model = str(model_name or "").strip()
    return (host, model) in _WINDOW_BY_HOST_AND_MODEL


def known_window_tokens(base_http: str, model_name: str) -> int:
    """How much room this model is known to have, without asking anything. Never waits.

    This is the one to call on the ordinary path. It answers from what a previous look-up
    already learned, and otherwise gives the old 4,096 assumption. Nothing here touches the
    network, so a question is never made slower by wanting to be better informed.
    """
    host = str(base_http or "").strip().rstrip("/")
    model = str(model_name or "").strip()
    return _WINDOW_BY_HOST_AND_MODEL.get((host, model)) or FALLBACK_WINDOW_TOKENS


def resolve_window_tokens(
    base_http: str,
    model_name: str,
    *,
    logger: Any = None,
    timeout_seconds: float = 4.0,
) -> int:
    """How much room this model really has on this server, or the 4,096 fallback.

    This one does go and ask, so it belongs only where the answer is about to change what a
    person gets -- in practice, just before a reply would be shortened to make things fit. Asked
    once per server and model per plugin session; a model not in memory yet cannot be asked
    about, so the fallback stands until the model has been used once.
    """
    host = str(base_http or "").strip().rstrip("/")
    model = str(model_name or "").strip()
    if not host or not model:
        return FALLBACK_WINDOW_TOKENS
    cached = _WINDOW_BY_HOST_AND_MODEL.get((host, model))
    if cached:
        return cached
    loaded = _read_loaded_windows(host, timeout_seconds)
    window = loaded.get(model)
    if not window:
        # The server lists the tag exactly as it was pulled; a caller may have dropped a
        # ":latest" that the server kept, or vice versa. Match on the part before the colon
        # rather than miss a model that is sitting right there in memory.
        wanted = model.split(":")[0]
        for name, value in loaded.items():
            if name.split(":")[0] == wanted:
                window = value
                break
    if not window:
        return FALLBACK_WINDOW_TOKENS
    _WINDOW_BY_HOST_AND_MODEL[(host, model)] = int(window)
    if logger is not None and int(window) != FALLBACK_WINDOW_TOKENS:
        logger.info(
            "token_accounting: %s is loaded with room for %d tokens, not the assumed %d",
            model,
            int(window),
            FALLBACK_WINDOW_TOKENS,
        )
    return int(window)


def _read_model_limits(base_http: str, timeout_seconds: float = 4.0) -> dict[str, int]:
    """Map model name to the most room that model can hold at all, from ``GET {base}/api/tags``.

    This is the model's own ceiling, not what it is loaded with. Asking for more than a model can
    hold is at best wasted memory, so the request is capped by it. Empty on any failure.
    """
    base = str(base_http or "").rstrip("/")
    try:
        req = urllib.request.Request(base + "/api/tags", method="GET")
        with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception:
        return {}
    models = data.get("models") if isinstance(data, dict) else None
    if not isinstance(models, list):
        return {}
    found: dict[str, int] = {}
    for entry in models:
        if not isinstance(entry, dict):
            continue
        name = str(entry.get("name") or entry.get("model") or "").strip()
        details = entry.get("details") if isinstance(entry.get("details"), dict) else {}
        ceiling = details.get("context_length")
        if name and isinstance(ceiling, int) and ceiling > 0:
            found[name] = ceiling
    return found


def choose_window_tokens(
    base_http: str,
    model_name: str,
    *,
    logger: Any = None,
    timeout_seconds: float = 4.0,
) -> int:
    """How much room to ASK the server for, decided once per server and model per session.

    The plugin picks the size rather than accepting whatever the server defaults to, because that
    default is 4,096 on the Deck and the model can hold 131,072. Three rules, all from measurement:

    * **Never lower than what it is already loaded with.** Someone whose server was set up to hold
      more should not be cut down to suit the Deck.
    * **Never more than the model itself can hold.**
    * **Never changed once chosen.** Changing it reloads the model -- see
      ``WINDOW_RELOAD_SECONDS_IDLE``.

    Returns 0 when nothing is known and nothing can be asked, which means "say nothing and let the
    server do what it would have done anyway".
    """
    host = str(base_http or "").strip().rstrip("/")
    model = str(model_name or "").strip()
    if not host or not model:
        return 0
    already = _ASKED_FOR_BY_HOST_AND_MODEL.get((host, model))
    if already:
        return already

    resolve_window_tokens(host, model, timeout_seconds=timeout_seconds)
    # Only a real reading counts here. A model that is not loaded yet reports nothing, and the
    # fallback must not be mistaken for the server having said 4,096.
    loaded_now = known_window_tokens(host, model) if window_is_known(host, model) else 0
    ceilings = _read_model_limits(host, timeout_seconds)
    ceiling = ceilings.get(model)
    if not ceiling:
        wanted_tag = model.split(":")[0]
        for name, value in ceilings.items():
            if name.split(":")[0] == wanted_tag:
                ceiling = value
                break

    target = PREFERRED_WINDOW_TOKENS
    if ceiling:
        target = min(target, int(ceiling))
    # Never take room away from a server that already gives more than this plugin would ask for.
    target = max(target, int(loaded_now or 0))

    _ASKED_FOR_BY_HOST_AND_MODEL[(host, model)] = target
    if logger is not None:
        logger.info(
            "token_accounting: asking %s for room for %d tokens (%s, it can hold %s). Chosen once "
            "for this session -- changing it would reload the model.",
            model,
            target,
            f"it is loaded with {loaded_now}" if loaded_now else "it is not loaded yet",
            ceiling or "an unknown amount",
        )
    return target


def note_window_granted(base_http: str, model_name: str, window_tokens: int) -> None:
    """Record what the server actually loaded the model with, which may not be what was asked."""
    host = str(base_http or "").strip().rstrip("/")
    model = str(model_name or "").strip()
    if host and model and int(window_tokens or 0) > 0:
        _WINDOW_BY_HOST_AND_MODEL[(host, model)] = int(window_tokens)


def note_real_counts(
    model_name: str,
    prompt_chars: int,
    prompt_eval_count: Optional[int],
    *,
    had_images: bool = False,
    logger: Any = None,
) -> None:
    """Learn the real size of the plugin's own text from one completed reply.

    ``prompt_eval_count`` is the server's own count of the tokens it read. A reply carrying
    images is skipped outright: those tokens have no characters behind them, so the sample
    would make every later question look far bigger than it is.
    """
    model = str(model_name or "").strip()
    if not model or had_images:
        return
    try:
        real_tokens = int(prompt_eval_count or 0)
    except (TypeError, ValueError):
        return
    chars = int(prompt_chars or 0)
    if real_tokens < MIN_SAMPLE_TOKENS or chars <= 0:
        return
    ratio = chars / real_tokens
    if not MIN_CHARS_PER_TOKEN <= ratio <= MAX_CHARS_PER_TOKEN:
        if logger is not None:
            logger.info(
                "token_accounting: ignoring an out-of-range sample for %s "
                "(%.2f characters per token from %d characters and %d tokens)",
                model,
                ratio,
                chars,
                real_tokens,
            )
        return
    samples = _CHAR_SAMPLES_BY_MODEL.setdefault(model, [])
    samples.append(ratio)
    if len(samples) > SAMPLES_KEPT_PER_MODEL:
        del samples[0 : len(samples) - SAMPLES_KEPT_PER_MODEL]


def chars_per_token(model_name: str) -> float:
    """The learned characters-per-token figure for this model, or the pessimistic fallback.

    The middle value of the samples, not the average: one odd reply -- a wall of punctuation, a
    single foreign-language answer -- should not drag the figure the next twenty questions are
    sized by.
    """
    samples = _CHAR_SAMPLES_BY_MODEL.get(str(model_name or "").strip()) or []
    if not samples:
        return FALLBACK_CHARS_PER_TOKEN
    return float(statistics.median(samples))


def estimate_tokens_from_chars(chars: int, model_name: str = "") -> int:
    """How many tokens this much of the plugin's own text is likely to be.

    Padded by ``ESTIMATE_SAFETY_MARGIN`` once something has actually been learned about this
    model, and left exactly as it has always been until then.
    """
    count = max(0, int(chars or 0))
    if not count:
        return 0
    learned = bool(_CHAR_SAMPLES_BY_MODEL.get(str(model_name or "").strip()))
    margin = ESTIMATE_SAFETY_MARGIN if learned else 1.0
    return int(math.ceil(count / chars_per_token(model_name) * margin))


def tokens_that_survive_overflow(window_tokens: int) -> int:
    """Roughly how much of an over-long question actually reaches the model.

    Not a budget -- a warning. It exists so the cost of going one token over is written down
    somewhere the code can read: about half of everything, and the half that is lost is the
    beginning. See ``OVERFLOW_SURVIVING_FRACTION``.
    """
    return int(max(0, int(window_tokens or 0)) * OVERFLOW_SURVIVING_FRACTION)
