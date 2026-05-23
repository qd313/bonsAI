"""Rule-based post-check for Ollama replies (hallucination-prone patterns)."""

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
