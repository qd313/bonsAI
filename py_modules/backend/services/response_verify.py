"""Title: Ollama response verifier

Purpose: Rule-based post-check for hallucination-prone patterns in Ollama replies.
Used for: Optional verify pass after chat completes when game context is missing or JSON promised.
Solves: Invented AppID warnings and lightweight secondary model verify without mutating text.
Does not: Block or rewrite replies automatically — returns warnings for transparency/UI only.
"""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from typing import Any, Callable, Optional, Sequence

from backend.services.strategy_spoiler_policy import (
    boss_like_card_names,
    fence_opener_is_spoiler,
    fence_segment_is_closed,
    move_midline_fence_openers_to_line_start,
    partial_fence_tail_match,
    protected_spoiler_names,
    spoiler_cover_required,
)

_MAX_VERIFY_EXCERPT_CHARS = 1500
_VERIFY_NUM_PREDICT = 64

# Steam AppIDs are numeric; flag invented IDs when no game context was provided.
_INVENTED_APPID_RE = re.compile(
    r"\b(?:app\s*id|appid)\s*[:#]?\s*(\d{4,8})\b",
    re.IGNORECASE,
)


def verify_ollama_response(
    *,
    response_text: str,
    app_id: str,
    app_name: str,
    promised_json: bool = False,
) -> dict[str, Any]:
    """Lightweight rules pass; returns warnings without mutating the reply."""
    text = response_text or ""
    warnings: list[str] = []
    has_game = bool((app_id or "").strip()) or bool((app_name or "").strip())

    if not has_game:
        for match in _INVENTED_APPID_RE.finditer(text):
            warnings.append(
                f"mentions AppID {match.group(1)} but no active game context was attached"
            )

    if promised_json and "```json" not in text and '"tdp_watts"' not in text:
        warnings.append("reply promised JSON tuning block but none was found")

    if re.search(r"\bI am (?:certain|sure) (?:this is|that is)\b", text, re.IGNORECASE) and not has_game:
        warnings.append("high-confidence game claim without game context")

    return {
        "passed": len(warnings) == 0,
        "warnings": warnings,
    }


def _parse_yes_no_verdict(raw: str) -> Optional[bool]:
    """Return True/False when the verifier reply is clearly YES/NO; else None."""
    s = (raw or "").strip().upper()
    if not s:
        return None
    first = s.split()[0] if s.split() else s
    if first.startswith("YES"):
        return False
    if first.startswith("NO"):
        return True
    return None


def run_verifier_second_pass(
    *,
    chat_url: str,
    model_name: str,
    response_text: str,
    has_game: bool,
    request_timeout_seconds: int = 30,
    logger: Any = None,
) -> dict[str, Any]:
    """Ask a user-configured Ollama model whether the reply looks unsupported (YES/NO)."""
    model = (model_name or "").strip()
    if not model:
        return {"ran": False, "skipped": "no_model"}
    excerpt = (response_text or "")[:_MAX_VERIFY_EXCERPT_CHARS]
    game_line = (
        "Active game context was attached."
        if has_game
        else "No active game context was attached."
    )
    system = (
        "You verify assistant replies for unsupported claims. "
        "Reply with exactly one word: YES if the assistant reply may contain "
        "invented game facts (e.g. AppID, store IDs, or specific game behavior) "
        "not supported by the context, otherwise NO. No other text."
    )
    user = f"{game_line}\n\nAssistant reply excerpt:\n{excerpt}"
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "stream": False,
        "options": {"num_predict": _VERIFY_NUM_PREDICT, "temperature": 0},
    }
    payload = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        chat_url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    timeout = max(10, min(int(request_timeout_seconds or 30), 120))
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8", "replace"))
    except urllib.error.HTTPError as exc:
        if logger:
            logger.info(
                "verifier_second_pass: HTTP %s model=%s",
                exc.code,
                model,
            )
        return {"ran": True, "passed": True, "error": f"http_{exc.code}", "model": model}
    except Exception as exc:  # noqa: BLE001
        if logger:
            logger.info("verifier_second_pass: failed model=%s err=%s", model, exc)
        return {"ran": True, "passed": True, "error": "request_failed", "model": model}

    msg = data.get("message") if isinstance(data.get("message"), dict) else {}
    content = str(msg.get("content") or "")
    verdict = _parse_yes_no_verdict(content)
    if verdict is None:
        if logger:
            logger.info("verifier_second_pass: unclear verdict model=%s", model)
        return {"ran": True, "passed": True, "unclear": True, "model": model}
    passed = verdict is True
    if logger:
        logger.info("verifier_second_pass: model=%s passed=%s", model, passed)
    return {"ran": True, "passed": passed, "model": model, "verdict": "NO" if passed else "YES"}


# The strategy-branch prompt shows the model a worked example purely to demonstrate the JSON
# shape it must reply in, then tells it in as many words never to reuse that wording. It
# sometimes copies the example into a real answer anyway (seen under a Portal 2 and a Hades
# answer, and again -- after the example's wording below was changed to placeholders -- under
# a no-game turn that read "Where are you at in THIS GAME? A. <a place early in THIS game>
# B. <a place later in THIS game>", the prompt's own placeholder text copied verbatim; see
# ollama_prompts.py's bonsai-strategy-branches worked example and
# docs/test-evidence/plan58p1-QA-NOTES-BLOCK-03.json). These are the example's exact words
# (old and current), kept lower-case for a case-insensitive match.
_WORKED_EXAMPLE_OPTION_LABELS_HL2 = {
    "just arrived at the train station",
    "fighting through ravenholm",
}
_WORKED_EXAMPLE_MARKERS_HL2 = ("ravenholm", "train station")
# The placeholder-wording set has no Half-Life 2-style exception: no real game is literally
# titled "This Game", so this phrase is always the leaked template, never a genuine answer.
_WORKED_EXAMPLE_OPTION_LABELS_PLACEHOLDER = {
    "a place early in this game",
    "a place later in this game",
}
_WORKED_EXAMPLE_MARKERS_PLACEHOLDER = ("this game",)
# The same placeholders with a real title swapped in: "<a place early in Deep Rock Galactic
# Survivor>" (Deck, 2026-09-25) -- the model filled in the title and kept the rest, which the
# exact-words check above cannot see. A bracketed phrase starting with a letter never belongs in a
# real menu, and neither does the example's own wording in front of any title.
_PLACEHOLDER_BRACKETS = re.compile(r"<[a-z][^<>]*>")
_PLACEHOLDER_LABEL_OPENINGS = ("a place early in ", "a place later in ")


def drop_branch_menu_copying_the_worked_example(
    branches: Optional[dict[str, Any]], app_name: str
) -> Optional[dict[str, Any]]:
    """Drop a follow-up menu whose question or choices are still the prompt's worked example.

    Mirrors the parser's own rule for a broken checklist (strategy_guide_parse.py: "a rejected
    block is simply dropped ... rather than shown") for a block that parsed fine but still
    carries the example's wording -- Ravenholm, the train station, Half-Life 2 when that is not
    the game actually being asked about, or the placeholder phrase "this game" that stands in
    for a real title (ollama_prompts.py: '"question":"Where are you at in <THIS GAME>?"').
    """
    if not branches:
        return branches
    options = branches.get("options")
    if not isinstance(options, list):
        return branches

    # Ravenholm, the train station and Half-Life 2 itself are all real, legitimate answers
    # when Half-Life 2 is actually the game being asked about -- only suspicious when it is not.
    is_half_life_2 = (app_name or "").strip().lower() == "half-life 2"

    def _copies_the_example(text: str) -> bool:
        low = (text or "").strip().lower()
        if not low:
            return False
        if low in _WORKED_EXAMPLE_OPTION_LABELS_PLACEHOLDER:
            return True
        if any(marker in low for marker in _WORKED_EXAMPLE_MARKERS_PLACEHOLDER):
            return True
        if _PLACEHOLDER_BRACKETS.search(low):
            return True
        if low.strip("<> ").startswith(_PLACEHOLDER_LABEL_OPENINGS):
            return True
        if is_half_life_2:
            return False
        if low in _WORKED_EXAMPLE_OPTION_LABELS_HL2:
            return True
        if any(marker in low for marker in _WORKED_EXAMPLE_MARKERS_HL2):
            return True
        if "half-life 2" in low:
            return True
        return False

    question = branches.get("question")
    if _copies_the_example(question if isinstance(question, str) else ""):
        return None
    for opt in options:
        if isinstance(opt, dict) and _copies_the_example(str(opt.get("label", ""))):
            return None
    return branches


# Plan 70 helper A (D112 #7, the spoiler safety net). The prompt already tells the model to
# keep spoilery detail behind ```bonsai-spoiler``` fences on a turn that needs it
# (strategy_spoiler_policy.py); nothing ever checked whether it did, and a question that
# describes a boss without naming it ("the boss past the crystal spike area" in Hollow Knight)
# came back with the boss named -- and its fake death spoiled -- in plain text (measured on the
# Deck, 83 reads during streaming, never covered). This is that check: find every sentence that
# names something the caller says is protected, and fence it, leaving anything already fenced
# (a real cover, a doubled block from the bug plan 68's 6843f8e1 found, the strategy-branches
# menu) completely alone.
_PROTECTED_NAME_RE_CACHE: dict[str, "re.Pattern[str]"] = {}


def _protected_name_pattern(name: str) -> "re.Pattern[str]":
    pat = _PROTECTED_NAME_RE_CACHE.get(name)
    if pat is None:
        pat = re.compile(rf"(?<![a-z0-9]){re.escape(name.lower())}s?(?![a-z0-9])")
        _PROTECTED_NAME_RE_CACHE[name] = pat
    return pat


def _unit_mentions_protected_name(unit: str, names: Sequence[str]) -> bool:
    low = unit.lower()
    return any(_protected_name_pattern(n).search(low) for n in names)


# A fence marker is only ever recognised at the very start of a line -- matches how every real
# fence in this codebase is written (an opening ```bonsai-spoiler or ```bonsai-strategy-branches
# line, a closing ``` on its own line) and keeps this from ever matching three backticks that
# happen to sit mid-sentence.
_FENCE_OPEN_RE = re.compile(r"(?:(?<=\n)|^)```[^\n]*\n")
_FENCE_CLOSE_RE = re.compile(r"\n```(?=\n|$)")


def _split_fenced_segments(text: str) -> list[tuple[str, str]]:
    """Split ``text`` into ("text", chunk) / ("fence", chunk) pieces that concatenate back to
    ``text`` exactly.

    A fence -- closed, or (mid-stream) still open with no closing ``` yet -- is opaque from
    here on: the sentence-covering below never looks inside one, so a sentence already covered,
    a doubled ```bonsai-spoiler``` block, and the ```bonsai-strategy-branches``` menu are all
    left completely alone, wherever they already are in the reply.
    """
    segments: list[tuple[str, str]] = []
    pos = 0
    n = len(text)
    while pos < n:
        m = _FENCE_OPEN_RE.search(text, pos)
        if not m:
            segments.append(("text", text[pos:]))
            break
        if m.start() > pos:
            segments.append(("text", text[pos : m.start()]))
        close = _FENCE_CLOSE_RE.search(text, m.end())
        if close:
            segments.append(("fence", text[m.start() : close.end()]))
            pos = close.end()
        else:
            segments.append(("fence", text[m.start() :]))
            pos = n
    return segments


# Sentences are found one line at a time first -- a bulleted tactic list rarely ends a line in
# a full stop -- then each line is split further on a sentence-ending mark followed by
# whitespace. Every piece keeps its own trailing whitespace, so joining them back together
# reproduces the original text exactly.
_SENTENCE_TAIL_RE = re.compile(r"(?<=[.!?])(\s+)")


def _split_sentence_units(text: str) -> list[str]:
    units: list[str] = []
    for line in text.splitlines(keepends=True):
        parts = _SENTENCE_TAIL_RE.split(line)
        i = 0
        while i < len(parts):
            piece = parts[i]
            if i + 1 < len(parts):
                piece += parts[i + 1]
                i += 2
            else:
                i += 1
            if piece:
                units.append(piece)
    return units


def _cover_sentences_in_text(text: str, names: Sequence[str]) -> str:
    """Wrap each contiguous run of protected sentences in one ```bonsai-spoiler``` fence.

    Consecutive protected sentences share a single fence rather than one each -- two fences
    back to back, wrapping the same reply, is exactly the doubled-block shape plan 68 found and
    filed as a bug; this is what keeps this checker from ever producing that shape itself.
    """
    units = _split_sentence_units(text)
    out: list[str] = []
    buffer: list[str] = []

    def _flush() -> None:
        if not buffer:
            return
        body = "".join(buffer).strip()
        buffer.clear()
        if not body:
            return
        out.append(f"\n```bonsai-spoiler\n{body}\n```\n")

    for unit in units:
        if _unit_mentions_protected_name(unit, names):
            buffer.append(unit)
        else:
            _flush()
            out.append(unit)
    _flush()
    return "".join(out)


_WORD_START_RE = re.compile(r"\b\w")


def _could_be_growing_into_a_protected_name(unit: str, names: Sequence[str]) -> bool:
    """True when the still-being-typed tail of ``unit`` could still turn into a protected name
    once more characters arrive -- "Soul Ma" does not yet match ``_unit_mentions_protected_name``
    against "Soul Master", so without this check it would show on screen, uncovered, for exactly
    as long as it takes the rest of the word to arrive.

    Tries every word-boundary-starting suffix of ``unit`` (not just its last single word, so a
    name's *second* word forming -- "Soul Ma" against "Soul Master" -- is caught too) against
    being a prefix of a protected name; a suffix already as long as the full name is skipped,
    since a real match there would already have been caught above.
    """
    low = re.sub(r"\s+", " ", unit.strip().lower())
    if not low:
        return False
    for name in names:
        name_low = re.sub(r"\s+", " ", (name or "").strip().lower())
        if not name_low:
            continue
        for wm in _WORD_START_RE.finditer(low):
            suffix = low[wm.start() :]
            if len(suffix) >= len(name_low):
                continue
            if name_low.startswith(suffix):
                return True
    return False


def _trailing_unit_is_terminated(unit: str) -> bool:
    return bool(re.search(r"[.!?]\s*$", unit)) or unit.endswith("\n")


def cover_named_spoilers(
    response_text: str,
    protected_names: Sequence[str],
    *,
    hold_back_incomplete_trailing: bool = False,
) -> str:
    """Wrap the whole sentence(s) naming a protected thing in a ```bonsai-spoiler``` fence.

    "Protected" is decided entirely by the caller (normally
    ``strategy_spoiler_policy.protected_spoiler_names``) -- this function only finds every
    sentence naming one of ``protected_names`` and fences it. Anything already inside a fence
    (a real cover, a doubled block, the branch menu) is left completely alone: a fence is never
    split, never looked inside, never re-wrapped -- so running this twice over the same text
    changes nothing the second time.

    ``hold_back_incomplete_trailing`` is set only by the live streaming path
    (``ollama_ask_service.py``'s ``_on_delta``), where the reply so far can end mid-sentence and
    a protected name can be forming one word at a time. A sentence that already contains the
    full name is covered immediately, exactly as for the finished reply; a trailing sentence
    that is *not yet* sentence-terminated, and whose last word(s) could still grow into a
    protected name, is held back from the return value entirely -- chosen over showing it bare,
    because there is no way to un-show a name that already flashed up. The next flush either
    finishes it (covered) or the words diverged (shown plain, nothing was ever hidden for it).
    An ordinary trailing word with no such risk ("Continuing…", a bullet with no full stop yet)
    is never held back. The same holding-back applies to a fence marker itself, both a half-typed
    opener ("```bon", never shown raw) and a fully-opened ```bonsai-spoiler``` fence with no
    closing ``` yet (its body held back entirely rather than shown while it forms) -- measured
    on the Deck (SPOILER-COVER-01): a name inside one of these read plain for 4.7 s before the
    finished-reply cover caught up.
    """
    if not response_text or not protected_names:
        return response_text
    names = [n.strip() for n in protected_names if (n or "").strip()]
    if not names:
        return response_text
    response_text = move_midline_fence_openers_to_line_start(response_text)
    segments = _split_fenced_segments(response_text)
    if not segments:
        return response_text
    hold_back_len = 0
    drop_open_spoiler_fence = False
    if hold_back_incomplete_trailing:
        last_kind, last_chunk = segments[-1]
        if last_kind == "fence":
            if not fence_segment_is_closed(last_chunk) and fence_opener_is_spoiler(last_chunk):
                drop_open_spoiler_fence = True
        else:
            partial = partial_fence_tail_match(last_chunk)
            if partial:
                hold_back_len = len(last_chunk) - partial.start()
            else:
                trailing_units = _split_sentence_units(last_chunk)
                if trailing_units:
                    last_unit = trailing_units[-1]
                    if (
                        not _trailing_unit_is_terminated(last_unit)
                        and not _unit_mentions_protected_name(last_unit, names)
                        and _could_be_growing_into_a_protected_name(last_unit, names)
                    ):
                        hold_back_len = len(last_unit)
    out: list[str] = []
    last_index = len(segments) - 1
    for i, (kind, chunk) in enumerate(segments):
        if kind == "fence":
            if drop_open_spoiler_fence and i == last_index:
                # Keep only the opener's own line -- the screen's own "Spoiler hidden until
                # complete…" chip still has enough to draw from -- and hold back every
                # character of the still-forming body itself.
                opener_end = chunk.find("\n")
                out.append(chunk[: opener_end + 1] if opener_end != -1 else "")
                continue
            out.append(chunk)
            continue
        text = chunk
        if hold_back_len and i == last_index:
            text = chunk[: len(chunk) - hold_back_len]
        out.append(_cover_sentences_in_text(text, names))
    return "".join(out)


def build_live_spoiler_cover(
    *,
    consent: bool,
    strategy_domain: bool,
    app_id: str = "",
    app_name: str = "",
    title_profile: str = "",
    question: str,
    system_content: str,
) -> Callable[[str, bool], str]:
    """One call, at turn setup, folding the whole D112 #7 policy lookup (was a cover promised
    this turn, and on which names) plus ``cover_named_spoilers`` itself behind a single function
    the caller runs every flushed chunk through -- so ``ollama_ask_service.py``'s own `_on_delta`
    needs only this call plus one line per flush, not the policy lookup inlined there too.
    """
    cover_needed = spoiler_cover_required(
        consent,
        strategy_domain=strategy_domain,
        app_id=app_id,
        app_name=app_name,
        title_profile=title_profile,
    )
    names = protected_spoiler_names(question, boss_like_card_names(system_content)) if cover_needed else []

    def _cover(text: str, done: bool) -> str:
        if not cover_needed or not text:
            return text
        return cover_named_spoilers(text, names, hold_back_incomplete_trailing=not done)

    return _cover


def maybe_append_verifier_notice(response_text: str, verify_result: dict[str, Any]) -> str:
    """Append a short user-visible notice when rules flagged issues (no PII in notice)."""
    if verify_result.get("passed"):
        return response_text
    warnings = verify_result.get("warnings") or []
    if not warnings:
        return response_text
    tail = (
        "\n\n—\n*bonsAI note: this reply may need double-checking "
        f"({len(warnings)} signal{'s' if len(warnings) != 1 else ''}).*"
    )
    return (response_text or "").rstrip() + tail
