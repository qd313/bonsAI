"""Title: The "thinking…" line you see while waiting for an answer

Purpose: While the AI works on your question, the Deck screen shows a line
describing what is happening -- "Searching knowledge base…", "Writing your
answer…" -- instead of a plain, silent spinner. This file both reads that
line out of the model's own reply, when the model reports it, and writes the
fallback lines the plugin shows itself the rest of the time, including a
personality (witty or deadpan) when a character is enabled.

Used for: The pending-Ask screen, on every chunk of a streaming reply.
main.py's token-streaming path calls `extract_bonsai_status()` on each
chunk; the frontend calls `format_thinking_phase()` (mirrored client-side by
composeThinkingBlurb.ts, so the two must always agree) for the phases it
already knows about before the model has said anything.

Solves: A blank or unchanging wait reads as the plugin having frozen,
especially on a Deck where a local model can genuinely take a long time.
Picking a line has to be repeatable -- the same request re-rendering should
not flash a different joke each time -- while still not staying frozen once
the work has clearly moved on, or once it has sat still long enough that
"warming up" is no longer even true.

Does not: Own how the line fades or animates on screen -- see
useSmoothStreamReveal on the frontend. This file only decides which words
appear.

How it works:

Reading the model's own status, through `extract_bonsai_status()`: a model
that supports it can wrap a short status inside a
<bonsai-status>…</bonsai-status> tag as it streams. This keeps only the last
*complete* tag seen -- not the first, so the line keeps moving instead of
freezing the moment the earliest tag closes -- and a tag still being typed
out is hidden by `_strip_incomplete_bonsai_status_open()` rather than shown
half-written.

Building the plugin's own line, when the model has not said anything yet:
 1. `format_thinking_phase()` is the entry point, given a known phase name
    (`AskThinkingPhase`, e.g. "searching_kb", "generating") for a step the
    plugin itself is doing, before the model is even involved.
 2. When there is a real question to weave in, it calls `_phase_pool()` for
    a small set of matching lines for that phase and tone, and
    `_pick_template()` chooses one of them -- deterministically, from a hash
    of the request id, so the same request always shows the same line
    (`_stable_bucket()`).
 3. The very first phase, "starting", instead goes through
    `compose_thinking_blurb()`, which reads the question itself
    (`_resolve_compose_intent()`) to open with a line about troubleshooting,
    power, screenshots or strategy specifically, rather than a generic one.
 4. Without a question to weave in, `format_thinking_phase()` falls back to
    a short, plain phrase per phase instead of trying to compose one.

Once the wait runs long, `escalate_static_thinking_line()` notices when a
line has not changed in a while -- the model went quiet with no new status
tag -- and rotates in a "still working" line instead, one that gets more
direct about the wait the longer it goes on (`_still_working_pool()`'s
tiers). Timing is intentionally irregular so it never ticks on a visible
metronome, but which line shows next is not random, so two lines never
repeat back to back.

Gotchas:
 - `_stable_bucket()` mixes a per-phase "salt" into its hash on purpose:
   keying every phase of one Ask on the request id alone made the trailing
   emoji line every pool ends with show up disproportionately often. The
   salted version keeps that from clustering.
 - `escalate_static_thinking_line()` is the one place in this file where the
   line changes on a timer rather than only on a phase change -- its own
   comment explains why: once the model stops sending status tags, nothing
   else would ever move the line again, and a truly static line during a
   long wait reads as broken.
 - "building_context" and "connecting_model" deliberately read as
   encouraging rather than sarcastic, unlike the rest of this file's lines --
   those are the two stretches of an Ask most likely to look stalled to the
   person watching it, and a joke there reads as a fault report.
"""

from __future__ import annotations

import re
from typing import Literal, Optional, Tuple

from backend.services.ollama_prompts import (
    _user_asks_resolution_relevant_performance,
    question_matches_troubleshooting_log_context,
    user_asks_ollama_bonsai_host_or_latency,
    user_wants_power_or_performance_topic,
)
from backend.tdp_intent import is_current_tdp_read_intent

AskThinkingPhase = Literal[
    "starting",
    "proton_logs",
    "tdp_read",
    "screenshot_prep",
    "searching_kb",
    "building_context",
    "connecting_model",
    "model_retry",
    "generating",
    "summing_up",
]

# Plan 68: shown while the chat's own summary of its older turns is being written, just before
# an answer that needed one. One fixed line, the same for every tone and character on purpose --
# every other phase's line is woven around the question or dressed up for a character voice, but
# this is bookkeeping the plugin is doing about the CHAT, not about what was asked, so weaving the
# question into it would read oddly ("Summing up the chat about is it worth it to buy the season
# pass so far"). The maintainer picked this exact wording.
SUMMING_UP_LINE = "Summing up the chat so far"

_PHASE_MAX_LEN = 240
_APP_NAME_MAX_LEN = 40
_SNIPPET_MAX_LEN = 56
_BUILDING_CONTEXT_MAX_SECONDS = 1.0

_THINKING_TONE = Literal["neutral", "witty", "deadpan"]

_EMOJI_ONLY_LINES = ("🙄", "😮‍💨", "🫠", "🌳")

_BONSAI_STATUS_RE = re.compile(
    r"<bonsai-status>\s*(.*?)\s*</bonsai-status>",
    re.IGNORECASE | re.DOTALL,
)
_BONSAI_STATUS_OPEN = "<bonsai-status>"
_BONSAI_STATUS_CLOSE = "</bonsai-status>"

_LAZY_THINKING_OPENER_RE = re.compile(
    r"^\s*(?:"
    r"yeah\b[,!?.\s—–-]*"
    r"|fine\b[.\s—–-]*"
    r"|sure\b[.\s—–-]*"
    r"|oh joy\b[,!\s—–-]*"
    r"|right\b[.\s—–-]*"
    r")",
    re.IGNORECASE,
)


def sanitize_thinking_summary(text: str) -> str:
    """Strip lazy sarcastic openers (Yeah/Fine/Sure/…) from any thinking blurb source."""
    raw = (text or "").strip()
    if not raw:
        return raw
    cleaned = raw
    for _ in range(3):
        next_text = _LAZY_THINKING_OPENER_RE.sub("", cleaned, count=1).strip()
        if next_text == cleaned:
            break
        cleaned = next_text
    return cleaned if cleaned else raw


def _strip_incomplete_bonsai_status_open(raw: str) -> str:
    """Hide a still-streaming status tag (full open, partial `<bons…`, or broken `<bons you're…`)."""
    lower = raw.lower()
    open_idx = lower.find(_BONSAI_STATUS_OPEN)
    if open_idx >= 0:
        if _BONSAI_STATUS_CLOSE in lower[open_idx:]:
            return raw
        return raw[:open_idx].rstrip()
    # Tokens arrive as `<`, `<b`, `<bons`, … before the full opener exists.
    # Models also emit broken forms like `<bons you're asking…` (prefix then prose).
    lt = lower.rfind("<")
    if lt < 0:
        return raw
    target = "bonsai-status>"
    rest = lower[lt + 1 :]
    matched = 0
    for ch in rest:
        if matched < len(target) and ch == target[matched]:
            matched += 1
            continue
        # Diverged after matching at least "bons" → treat as broken status opener.
        if matched >= 4:
            return raw[:lt].rstrip()
        return raw
    # Exhausted input while still matching an incomplete opener (`<bons`, `<bonsai-stat`, …).
    # Reaching here means every character after the `<` matched the opener, because any divergence
    # returns inside the loop above. `matched == 0` therefore means nothing followed the `<` at all
    # — a bare trailing `<`, which is the first token of a tag far more often than it is content.
    # Hiding it costs nothing when it is real: the next token reveals the divergence and the `<`
    # comes straight back. Leaving it visible is what put a one-character `<` in the reply bubble
    # when Stop landed within the first second of a stream.
    return raw[:lt].rstrip()


def partial_stream_has_content(text: Optional[str]) -> bool:
    """True when a streamed partial is worth keeping as an answer rather than discarding.

    Stop can land on the first frame of a reply, when all that has arrived is the opening of some
    markup — a status tag (`<`), a code fence (```` ``` ````), a list bullet. Publishing that as
    the answer shows the user punctuation debris where a reply should be; the abort path already
    has a better string for the empty case ("Request cancelled.").

    One alphanumeric character is enough. Short real answers ("42", "Yes") must survive, so this
    deliberately does not impose a minimum length.
    """
    return any(ch.isalnum() for ch in (text or ""))


def extract_bonsai_status(text: str) -> Tuple[Optional[str], str]:
    """Return (status_summary, text_with_status_tags_removed).

    The summary is the **last** complete tag in the text, not the first. This runs against the
    full joined stream on every delta, so keeping the first meant the thinking line froze the
    moment the opening tag closed and stayed frozen for the whole generation -- the longest part
    of a Deck Ask, and the part where a static line reads as a hang.

    Only complete tags count. A tag still arriving has no closing marker, does not match, and
    therefore cannot flicker a half-written status onto the line; the previous one stays up until
    the new one finishes.
    """
    raw = text or ""
    summary: Optional[str] = None
    stripped = raw
    while True:
        match = _BONSAI_STATUS_RE.search(stripped)
        if not match:
            break
        candidate = sanitize_thinking_summary((match.group(1) or "").strip())
        if candidate:
            summary = candidate[:240]
        stripped = _BONSAI_STATUS_RE.sub("", stripped, count=1).lstrip()
    stripped = _strip_incomplete_bonsai_status_open(stripped)
    stripped = re.sub(r"\n{3,}", "\n\n", stripped).strip()
    return summary, stripped


def _sanitize_app_name(app_name: str) -> str:
    """Truncate and strip control chars from game title for user-visible status lines."""
    raw = (app_name or "").strip()
    if not raw:
        return ""
    cleaned = re.sub(r"[\x00-\x1f\x7f]", "", raw)
    if len(cleaned) > _APP_NAME_MAX_LEN:
        return cleaned[: _APP_NAME_MAX_LEN - 1].rstrip() + "…"
    return cleaned


def extract_question_snippet(question: str, max_len: int = _SNIPPET_MAX_LEN) -> str:
    """First meaningful clause from the user question for status-line weaving."""
    raw = re.sub(r"\s+", " ", (question or "").strip())
    if not raw:
        return ""
    for sep in (". ", "? ", "! ", "; ", " — ", " - "):
        if sep in raw:
            raw = raw.split(sep, 1)[0].strip()
            break
    if len(raw) > max_len:
        return raw[: max_len - 1].rstrip() + "…"
    return raw


def _stable_bucket(request_id: int, salt: str = "") -> int:
    """Deterministic template index seed.

    ``salt`` exists because every phase pool ends with an emoji-only line, so keying every phase
    of one Ask on ``request_id`` alone meant one Ask in five rendered a bare 🙄 / 🌳 next to the
    spinner for *every* transition (measured: 11 of 50 request ids). Mixing the phase key in makes
    the pick independent per phase; the emoji lines stay, they just stop clustering.

    An empty salt must reproduce the pre-salt value exactly: ``compose_thinking_blurb`` is mirrored
    by ``composeThinkingBlurb.ts`` on the client, and the two must still pick the same opener.
    """
    rid = max(0, int(request_id or 0))
    bucket = (rid * 2654435761) & 0x7FFFFFFF
    for ch in salt:
        bucket = ((bucket * 31) + ord(ch)) & 0x7FFFFFFF
    return bucket


def _resolve_thinking_tone(
    character_enabled: bool,
    character_preset_id: Optional[str],
) -> _THINKING_TONE:
    """Default witty sarcasm; deadpan when a deadpan character preset is active."""
    if not character_enabled:
        return "witty"
    from backend.services.ai_character_service import thinking_status_tone_for_preset

    tone = thinking_status_tone_for_preset(character_preset_id)
    return tone if tone in ("witty", "deadpan") else "witty"


def _pick_template(templates: list[str], request_id: int, salt: str = "") -> str:
    if not templates:
        return "Working on your question…"
    idx = _stable_bucket(request_id, salt) % len(templates)
    return templates[idx]


def _thinking_weave_bits(question: str, app_name: str) -> tuple[str, str, str]:
    """Return (quote, game_bit, game_title) for woven status lines."""
    snippet = extract_question_snippet(question)
    game_title = _sanitize_app_name(app_name)
    quote = f'"{snippet}"' if snippet else "your question"
    game_bit = f" in {game_title}" if game_title else ""
    return quote, game_bit, game_title


def _witty_generic_pool(quote: str, game_bit: str, game_title: str) -> list[str]:
    pool = [
        f"🔥🔥Another crisis 🔥🔥: {quote}. Give me a moment{game_bit}.",
        f"On it — {quote}{game_bit}…",
        f'"Fascinating" request: {quote}. Processing anyway.',
        f"Great. {quote}. Just what I needed{game_bit}.",
        f"Copy that. Wrestling with {quote}{game_bit}…",
        f"Noted. {quote}. I'll pretend this is exciting.",
        f"Standing by while I dig into {quote}{game_bit}…",
        f'Ticket received: {quote}. Filing it under "urgent to you."',
        f"Alright, alright — {quote}{game_bit}…",
        *_EMOJI_ONLY_LINES,
    ]
    if game_title:
        pool.extend(
            [
                f"Still struggling with {game_title}?",
                f"Back to wrestling with {game_title}…",
                f"{game_title} again? Alright…",
                f"Having a moment with {game_title}, I see.",
            ]
        )
    return pool


def _deadpan_generic_pool(quote: str, game_bit: str, game_title: str) -> list[str]:
    pool = [
        f"{quote}. Acknowledged{game_bit}.",
        f"Processing {quote}{game_bit}. No enthusiasm detected.",
        f"Working on {quote}. Try not to interrupt.",
        f"{quote}{game_bit}. Inevitably.",
        f"Examining {quote}. Results pending.",
        f"Request logged: {quote}. Continuing.",
        *_EMOJI_ONLY_LINES,
    ]
    if game_title:
        pool.extend(
            [
                f"{game_title}. Again.",
                f"Still {game_title}. Noted.",
                f"Resuming {game_title}. Proceeding.",
            ]
        )
    return pool


def _witty_screenshot_pool(quote: str, game_bit: str) -> list[str]:
    return [
        f"Staring at your screenshot for {quote}…",
        f"Squinting at pixels for {quote}{game_bit}…",
        f"Let me decode this screenshot about {quote}…",
        f"Your screenshot and {quote} — delightful{game_bit}.",
        f"Comparing the capture to {quote}{game_bit}…",
        "🫠",
    ]


def _deadpan_screenshot_pool(quote: str, game_bit: str) -> list[str]:
    return [
        f"Screenshot received for {quote}. Analyzing.",
        f"Visual input noted. Relating to {quote}.",
        f"Image attached. Context: {quote}{game_bit}.",
        f"Processing visual data for {quote}.",
        f"Screenshot queued for {quote}{game_bit}.",
        "🌳",
    ]


def _witty_troubleshooting_pool(quote: str, game_bit: str) -> list[str]:
    return [
        f"Log-diving for {quote}{game_bit}. Try not to enjoy this.",
        f"Proton archaeology on {quote} — my favorite hobby{game_bit}.",
        f"Cross-referencing crash vibes with {quote}{game_bit}…",
        f"Someone said {quote}? Time to read logs{game_bit}.",
        f"Tracing {quote} through the wreckage{game_bit}…",
        "😮‍💨",
    ]


def _deadpan_troubleshooting_pool(quote: str, game_bit: str) -> list[str]:
    return [
        f"Reading logs for {quote}{game_bit}. Standard procedure.",
        f"Proton log scan: {quote}. Proceeding.",
        f"Crash context for {quote}{game_bit}. No commentary.",
        f"Host/latency check on {quote}. As requested.",
        f"Diagnostic pass for {quote}{game_bit}.",
        "🙄",
    ]


def _witty_power_pool(quote: str, game_bit: str) -> list[str]:
    return [
        f"Watts, frames, regrets — {quote}{game_bit}…",
        f"TDP theater for {quote}. Curtain up{game_bit}.",
        f"Benchmarking my patience with {quote}{game_bit}…",
        f"Power math on {quote}. Hold the applause{game_bit}.",
        f"Thermal feelings about {quote}{game_bit}…",
        "🙄",
    ]


def _deadpan_power_pool(quote: str, game_bit: str) -> list[str]:
    return [
        f"TDP read for {quote}{game_bit}. Expect numbers.",
        f"Power context: {quote}. Collecting.",
        f"Performance data for {quote}{game_bit}.",
        f"Wattage inquiry noted: {quote}.",
        f"Sysfs peek for {quote}{game_bit}.",
        "🌳",
    ]


def _witty_resolution_pool(quote: str, game_bit: str) -> list[str]:
    return [
        f"Resolution roulette for {quote}{game_bit}…",
        f"FPS fantasies vs {quote} — let's see{game_bit}.",
        f"Graphics settings guilt trip: {quote}{game_bit}.",
        f"Balancing pixels and battery on {quote}…",
        f"FSR prayer circle for {quote}{game_bit}.",
        "🫠",
    ]


def _deadpan_resolution_pool(quote: str, game_bit: str) -> list[str]:
    return [
        f"Graphics settings review: {quote}{game_bit}.",
        f"FPS/resolution analysis for {quote}.",
        f"Display tradeoffs on {quote}{game_bit}.",
        f"Settings pass: {quote}.",
        f"Frame pacing review: {quote}{game_bit}.",
        "😮‍💨",
    ]


def _witty_strategy_pool(quote: str, game_bit: str) -> list[str]:
    return [
        f"Strategy mode: {quote}{game_bit} — spoilers locked.",
        f"Scouting {quote} without ruining the surprise{game_bit}…",
        f"Puzzle patrol on {quote}. Minimal hints{game_bit}.",
        f"Map in my head for {quote}{game_bit}…",
        f"Boss? What boss? Just {quote}{game_bit}.",
        "🌳",
    ]


def _deadpan_strategy_pool(quote: str, game_bit: str) -> list[str]:
    return [
        f"Strategy notes for {quote}{game_bit}. Spoiler-safe.",
        f"Guide lookup: {quote}. No plot leaks.",
        f"Tactical review of {quote}{game_bit}.",
        f"Puzzle context: {quote}. Restricted detail.",
        f"Spoiler-free pass on {quote}{game_bit}.",
        "🙄",
    ]


def _resolve_compose_intent(question: str, ask_mode: str, has_shot: bool) -> str:
    if question_matches_troubleshooting_log_context(question) or user_asks_ollama_bonsai_host_or_latency(
        question
    ):
        return "troubleshooting"
    if is_current_tdp_read_intent(question) or user_wants_power_or_performance_topic(question):
        return "power"
    if _user_asks_resolution_relevant_performance(question):
        return "resolution"
    if ask_mode == "strategy":
        return "strategy"
    if has_shot:
        return "screenshot"
    return "generic"


def _compose_intent_pool(intent: str, tone: _THINKING_TONE, quote: str, game_bit: str, game_title: str) -> list[str]:
    if tone == "deadpan":
        if intent == "troubleshooting":
            return _deadpan_troubleshooting_pool(quote, game_bit)
        if intent == "power":
            return _deadpan_power_pool(quote, game_bit)
        if intent == "resolution":
            return _deadpan_resolution_pool(quote, game_bit)
        if intent == "strategy":
            return _deadpan_strategy_pool(quote, game_bit)
        if intent == "screenshot":
            return _deadpan_screenshot_pool(quote, game_bit)
        return _deadpan_generic_pool(quote, game_bit, game_title)
    if intent == "troubleshooting":
        return _witty_troubleshooting_pool(quote, game_bit)
    if intent == "power":
        return _witty_power_pool(quote, game_bit)
    if intent == "resolution":
        return _witty_resolution_pool(quote, game_bit)
    if intent == "strategy":
        return _witty_strategy_pool(quote, game_bit)
    if intent == "screenshot":
        return _witty_screenshot_pool(quote, game_bit)
    return _witty_generic_pool(quote, game_bit, game_title)


def _phase_pool(
    phase: AskThinkingPhase,
    tone: _THINKING_TONE,
    *,
    quote: str,
    game_bit: str,
    attachment_count: int = 0,
    still_building: bool = False,
) -> list[str]:
    """What line to show while the AI is "thinking", for one moment in an Ask.

    In: `phase` is which stage of answering is happening right now
    (`AskThinkingPhase`, e.g. "searching_kb", "generating"). `tone` picks
    which personality voice to use, witty or deadpan. `quote`, `game_bit` and
    `attachment_count` are pre-built bits of text this stitches into the
    line -- a snippet of the question, a mention of which game, how many
    screenshots. `still_building` overrides everything else: it is set only
    when context assembly is taking longer than normal, and needs its own
    line regardless of which phase is technically active.

    Out: a small list of candidate lines for that exact phase and tone, the
    last one always a bare emoji. The caller, not this function, picks one of
    them, and does so the same way for the same question, so the line does
    not change every time the screen re-renders.

    Nothing here can raise -- an unrecognised phase falls through to a
    generic "working on it" pair at the very end rather than erroring, so a
    new phase added to `AskThinkingPhase` without updating this function
    degrades to something plain instead of crashing the Ask.

    1. `still_building` is checked first and, if set, returns its own pair of
       lines regardless of `phase` -- this is the one case that is not
       phase-specific.
    2. "proton_logs", "tdp_read", "searching_kb" and "screenshot_prep" each
       return their own pool; "screenshot_prep" also branches on whether more
       than one screenshot is attached, since "sorting 3 screenshots" reads
       differently than "sorting a screenshot".
    3. "building_context" and "connecting_model" are the two stretches where
       an Ask can look stalled to the person watching it -- a cold model can
       take real time to load before the first word appears. Their lines are
       deliberately encouraging rather than sarcastic like the rest of this
       function, because a sarcastic sigh during a long wait reads as
       something having broken, not as personality.
    4. "generating" fires the moment the first word of the actual answer
       arrives, replacing whatever came before it.
    5. "model_retry" covers a fallback to a second model after the first one
       failed.
    6. Anything else -- an unrecognised or future phase -- falls through to
       one last plain "working on it" pair.
    """
    if still_building:
        if tone == "deadpan":
            return [
                f"Still preparing {quote}{game_bit}.",
                f"Context load: {quote}. Ongoing.",
                f"Assembly continues: {quote}.",
                f"Still working on {quote}{game_bit}.",
                "🌳",
            ]
        return [
            f"Still wrestling {quote}{game_bit}. Almost…",
            f"Context isn't instant: {quote}…",
            f"Bear with me on {quote}{game_bit}.",
            f"Still loading the drama around {quote}…",
            "🫠",
        ]

    if phase == "proton_logs":
        if tone == "deadpan":
            return [
                f"Proton logs: {quote}{game_bit}. Reading.",
                f"Log excerpt search for {quote}.",
                f"Crash log correlation: {quote}{game_bit}.",
                f"Log scan in progress: {quote}.",
                "🙄",
            ]
        return [
            f"Log spelunking for {quote}{game_bit}. Glamorous.",
            f"Proton logs vs {quote} — fight!{game_bit}",
            f"Reading crash tea leaves in {quote}{game_bit}…",
            f"Journal of pain: {quote}{game_bit}.",
            "😮‍💨",
        ]

    if phase == "tdp_read":
        if tone == "deadpan":
            return [
                f"Current TDP for {quote}{game_bit}. Querying.",
                f"Power limits: {quote}. Reading.",
                f"Wattage snapshot for {quote}{game_bit}.",
                f"TDP inquiry: {quote}.",
                "🌳",
            ]
        return [
            f"How many watts is {quote} worth{game_bit}?",
            f"TDP peek for {quote}. Brace{game_bit}.",
            f"Power meter on {quote}{game_bit}…",
            f"Thermal interrogation: {quote}{game_bit}.",
            "🫠",
        ]

    if phase == "searching_kb":
        if tone == "deadpan":
            return [
                f"Searching knowledge base for {quote}{game_bit}.",
                f"Local knowledge lookup: {quote}.",
                f"Offline strategy notes for {quote}{game_bit}.",
                f"Knowledge base query: {quote}.",
                "🙄",
            ]
        return [
            f"Searching knowledge base for {quote}{game_bit}.",
            f"Looking up strategy notes on {quote}…",
            f"Checking offline cards for {quote}{game_bit}.",
            f"Pulling local tips about {quote}…",
            "🌳",
        ]

    if phase == "screenshot_prep":
        n = max(0, int(attachment_count or 0))
        if n > 1:
            if tone == "deadpan":
                return [
                    f"Preparing {n} screenshots for {quote}.",
                    f"{n} images queued for {quote}{game_bit}.",
                    f"Batch visual prep: {quote}.",
                    f"{n} captures for {quote}{game_bit}.",
                    "🌳",
                ]
            return [
                f"Sorting {n} screenshots for {quote}{game_bit}.",
                f"{n} images, one question: {quote}.",
                f"Gallery night for {quote}{game_bit}.",
                f"Stacking {n} proofs of {quote}…",
                "🫠",
            ]
        if tone == "deadpan":
            return [
                f"Screenshot prep for {quote}{game_bit}.",
                f"Visual attach: {quote}. Processing.",
                f"Image pipeline for {quote}{game_bit}.",
                f"Capture queued: {quote}.",
                "🙄",
            ]
        return [
            f"Polishing pixels for {quote}{game_bit}.",
            f"Screenshot runway for {quote} — cleared{game_bit}.",
            f"Loading your proof of {quote}…",
            f"Attaching evidence of {quote}{game_bit}.",
            "😮‍💨",
        ]

    # building_context and connecting_model cover the two stretches where an Ask looks stalled:
    # context assembly, and the cold-model load before the first token. Their copy is the one
    # place in these pools that leans encouraging rather than put-upon — the user is staring at a
    # spinner wondering whether it broke, and a line that sighs at them there reads as a fault
    # report. Still literally true: each fires immediately before the work it names.
    if phase == "building_context":
        if tone == "deadpan":
            return [
                f"Building context for {quote}{game_bit}.",
                f"Worth doing properly: gathering facts on {quote}.",
                f"Context assembly for {quote}{game_bit}. Reasonable question.",
                f"Collecting what I have on {quote}.",
                "🌳",
            ]
        return [
            f"Good one — pulling together everything on {quote}{game_bit}…",
            f"Lining up the facts for {quote}{game_bit}. Won't be long.",
            f"Worth answering properly: gathering context on {quote}…",
            f"Digging up what I know about {quote}{game_bit}…",
            "🌳",
        ]

    if phase == "connecting_model":
        if tone == "deadpan":
            return [
                f"Handing {quote} to the model. This part takes the longest.",
                f"Model loading for {quote}{game_bit}. Expected.",
                f"Connecting for {quote}. Stay put.",
                f"{quote} is with the model now{game_bit}.",
                "🌳",
            ]
        return [
            f"Waking the model up for {quote}{game_bit}…",
            f"Handed {quote}{game_bit} over — this is the slow bit, not a crash.",
            f"Model's warming up for {quote}. Hang in there…",
            f"{quote} is in good hands now{game_bit}…",
            # Not the melting face the other pools use. This is the longest pause in an Ask, and a
            # distress glyph during it reads as the thing having died.
            "🌳",
        ]

    # Fires on the first content token. Without it "waking the model up" stayed on screen for the
    # whole generation, which is not just static — by then it is false.
    if phase == "generating":
        if tone == "deadpan":
            return [
                f"Writing the answer for {quote}{game_bit}.",
                f"Reply in progress: {quote}.",
                f"Answer forming for {quote}{game_bit}.",
                f"Composing on {quote}.",
                "🌳",
            ]
        return [
            f"Writing your answer on {quote}{game_bit}…",
            f"Words are happening for {quote}…",
            f"Answer taking shape for {quote}{game_bit}…",
            f"Drafting the reply to {quote}…",
            "🌳",
        ]

    if phase == "model_retry":
        if tone == "deadpan":
            return [
                f"Retrying models for {quote}{game_bit}.",
                f"Alternate model for {quote}.",
                f"Fallback chain: {quote}{game_bit}.",
                f"Second attempt on {quote}.",
                "🙄",
            ]
        return [
            f"Plan B for {quote}{game_bit}. Typical.",
            f"Another model, same {quote}. Joy{game_bit}.",
            f"Fallback round on {quote}…",
            f"Round two for {quote}{game_bit}.",
            "😮‍💨",
        ]

    if tone == "deadpan":
        return [f"Working on {quote}{game_bit}.", f"Processing {quote}.", "🌳"]
    return [f"Working on {quote}{game_bit}…", f"On it — {quote}{game_bit}…", "🙄"]


def compose_thinking_blurb(
    question: str,
    *,
    app_name: str = "",
    attachment_count: int = 0,
    ask_mode: str = "speed",
    request_id: int = 0,
    character_enabled: bool = False,
    character_preset_id: Optional[str] = None,
    elapsed_seconds: float = 0.0,
) -> str:
    """Instant, question-woven pending status (Tier A composer — no extra model call)."""
    del elapsed_seconds  # kept for API parity; selection is request_id-only
    quote, game_bit, game_title = _thinking_weave_bits(question, app_name)
    has_shot = int(attachment_count or 0) > 0
    tone = _resolve_thinking_tone(character_enabled, character_preset_id)
    intent = _resolve_compose_intent(question, ask_mode, has_shot)
    pool = _compose_intent_pool(intent, tone, quote, game_bit, game_title)
    text = _pick_template(pool, request_id)
    return text[:_PHASE_MAX_LEN]


def format_thinking_phase(
    phase: AskThinkingPhase,
    *,
    app_name: str = "",
    attachment_count: int = 0,
    ask_mode: str = "speed",
    elapsed_seconds: float = 0.0,
    question: str = "",
    request_id: int = 0,
    character_enabled: bool = False,
    character_preset_id: Optional[str] = None,
) -> str:
    """Build a deterministic, context-aware status line for pending Ask phases."""
    if phase == "summing_up":
        return SUMMING_UP_LINE[:_PHASE_MAX_LEN]
    woven_q = (question or "").strip()
    if woven_q:
        if phase == "starting":
            return compose_thinking_blurb(
                woven_q,
                app_name=app_name,
                attachment_count=attachment_count,
                ask_mode=ask_mode,
                request_id=request_id,
                character_enabled=character_enabled,
                character_preset_id=character_preset_id,
                elapsed_seconds=elapsed_seconds,
            )
        quote, game_bit, _game_title = _thinking_weave_bits(woven_q, app_name)
        tone = _resolve_thinking_tone(character_enabled, character_preset_id)
        still_building = phase == "building_context" and elapsed_seconds > _BUILDING_CONTEXT_MAX_SECONDS
        pool = _phase_pool(
            phase,
            tone,
            quote=quote,
            game_bit=game_bit,
            attachment_count=attachment_count,
            still_building=still_building,
        )
        text = _pick_template(pool, request_id, salt=str(phase))
        return text[:_PHASE_MAX_LEN]

    if phase == "building_context" and elapsed_seconds > _BUILDING_CONTEXT_MAX_SECONDS:
        return "Still preparing…"[:_PHASE_MAX_LEN]
    game = _sanitize_app_name(app_name)
    game_clause = f" for {game}" if game else ""

    if phase == "starting":
        text = "Starting…"
    elif phase == "proton_logs":
        text = f"Reading Proton logs{game_clause}…" if game else "Reading Proton logs…"
    elif phase == "tdp_read":
        text = "Checking current power limits…"
    elif phase == "searching_kb":
        text = f"Searching knowledge base{game_clause}…" if game else "Searching knowledge base…"
    elif phase == "screenshot_prep":
        n = max(0, int(attachment_count or 0))
        if n <= 1:
            text = "Preparing screenshot…"
        else:
            text = f"Preparing {n} screenshots…"
    elif phase == "building_context":
        text = f"Building context{game_clause}…" if game else "Building context…"
    elif phase == "connecting_model":
        text = "Connecting to model…"
    elif phase == "generating":
        text = "Writing your answer…"
    elif phase == "model_retry":
        text = "Trying another model…"
    else:
        text = "Working…"

    return text[:_PHASE_MAX_LEN]


# The stale-line ladder runs on irregular windows, not a fixed beat. A line changing on an exact
# metronome reads as a spinner animation -- the eye locks onto the period and stops reading the
# words. Each window is drawn from a range instead.
#
# The first window is longer: it is the one holding a *real* phase line ("Searching knowledge base
# for X"), which is more specific than anything that replaces it, so it earns a fair showing before
# a generic duration line takes the screen.
_STATIC_LINE_FIRST_WINDOW_SECONDS = (7.0, 13.0)
_STATIC_LINE_STEP_WINDOW_SECONDS = (4.0, 12.0)
# A very long Ask cannot walk the schedule forever; 256 windows is over 17 minutes at the minimum.
_STATIC_LINE_MAX_STEPS = 256
# Tier boundaries, in seconds of *unchanged* line. Later tiers acknowledge the wait more openly.
_STATIC_LINE_TIER_SECONDS = (21.0, 40.0)


def _static_window_bucket(request_id: int, index: int) -> int:
    """Well-mixed hash of (request_id, window index).

    Deliberately not ``_stable_bucket`` with a per-index salt. That salt loop is
    ``bucket * 31 + ord(ch)``, so two salts differing only in their last character produce buckets
    a few apart -- which, taken modulo a window range, yields near-identical and monotonically
    creeping durations. The whole point here is that consecutive windows are unrelated, so this
    needs an avalanche step.
    """
    h = (max(0, int(request_id or 0)) * 2654435761) ^ ((index + 1) * 2246822519)
    h &= 0xFFFFFFFF
    h ^= h >> 15
    h = (h * 2246822519) & 0xFFFFFFFF
    h ^= h >> 13
    h = (h * 3266489917) & 0xFFFFFFFF
    h ^= h >> 16
    return h & 0x7FFFFFFF


def _static_window_seconds(request_id: int, index: int) -> float:
    """How long window ``index`` holds, in seconds. Deterministic: a poll must not reshuffle it."""
    low, high = (
        _STATIC_LINE_FIRST_WINDOW_SECONDS if index == 0 else _STATIC_LINE_STEP_WINDOW_SECONDS
    )
    centis = int(round((high - low) * 100))
    return low + (_static_window_bucket(request_id, index) % (centis + 1)) / 100.0


def _static_step_for(request_id: int, static_seconds: float) -> int:
    """Rotation step at ``static_seconds``, or ``-1`` while the original line still holds."""
    boundary = 0.0
    for index in range(_STATIC_LINE_MAX_STEPS):
        boundary += _static_window_seconds(request_id, index)
        if static_seconds < boundary:
            return index - 1
    return _STATIC_LINE_MAX_STEPS - 1


def _still_working_pool(tone: _THINKING_TONE, tier: int) -> list[str]:
    """Lines that stay true no matter which phase went quiet — the work is simply still running."""
    if tone == "deadpan":
        if tier >= 2:
            return [
                "Still running. Local models take their time.",
                "Not stuck. Still generating.",
                "Long reply. Still going.",
                "Still working. This is normal for a handheld.",
            ]
        if tier == 1:
            return [
                "Still going.",
                "Still generating.",
                "Still working on it.",
                "In progress.",
            ]
        return [
            "Working on it…",
            "Still here…",
            "Processing…",
            "Thinking it through…",
        ]
    if tier >= 2:
        return [
            "Still going — long answers take a while on a handheld.",
            "Not stuck, just slow silicon. Still writing.",
            "Still here. This one's a marathon.",
            "Taking its time. Local models do that.",
        ]
    if tier == 1:
        return [
            "Still working on it…",
            "Still going — hang in there…",
            "Not forgotten, still thinking…",
            "Give it a moment longer…",
        ]
    return [
        "Still on it…",
        "Working…",
        "Still thinking…",
        # Nothing here may predict how much longer. The duration is unknown at this point, and a
        # "nearly there" that is followed by another 40 seconds is worse than saying less.
        "Still chewing on it…",
    ]


def escalate_static_thinking_line(
    base: str,
    *,
    static_seconds: float,
    request_id: int = 0,
    tone: _THINKING_TONE = "witty",
) -> str:
    """Replace a line that has not changed in a while with a rotating "still working" line.

    This is the one deliberate exception to the rule that copy changes only on a phase key or a
    model tag (THINKING-COPY-01). That rule exists because rotating *interchangeable* copy on a
    timer felt random and fake. This is the opposite failure: after the last prep phase publishes,
    nothing else fires unless the model emits a ``<bonsai-status>`` tag, and small models often do
    not -- so the line sat on "Model's warming up…" for a whole 40-second generation. Static there
    reads as crashed, and by then the line is also no longer true.

    What rotates is a statement about *duration*, which is real information the user does not
    otherwise have, not a reshuffle of the same joke.

    Timing is irregular and content is not. The windows are drawn from a range so the line does not
    tick on a metronome, but the *choice* of line steps additively through the pool, so two
    consecutive windows can never show the same words. Randomising both would let a line repeat
    itself back to back, which looks like a stall -- the exact impression this exists to avoid.
    """
    text = (base or "").strip()
    step = _static_step_for(request_id, static_seconds)
    if step < 0:
        return text
    tier = sum(1 for bound in _STATIC_LINE_TIER_SECONDS if static_seconds >= bound)
    pool = _still_working_pool(tone, tier)
    idx = (_stable_bucket(request_id, salt="still_working") + step) % len(pool)
    return pool[idx][:_PHASE_MAX_LEN]


def deterministic_thinking_phase_fallback(
    *,
    streaming: bool,
    has_partial: bool,
    elapsed_seconds: float,
) -> str:
    """Phase label when the model did not emit ``<bonsai-status>``."""
    if streaming and has_partial:
        return "Drafting your masterpiece…"
    if elapsed_seconds >= 8:
        return "Still here. Still thinking…"
    if elapsed_seconds >= 2:
        return "Pretending this is hard…"
    return "Warming up the brain cells…"
