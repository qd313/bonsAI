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
from typing import Any, Optional

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
