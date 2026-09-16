"""Title: Spotting "what's my power limit right now" questions

Purpose: The Ask box gets power-related questions in several shapes: "what's my
TDP right now", "set my TDP to 12 watts", "what TDP should I use for this
game". This file spots the first kind -- a plain question about the current
power cap -- so the plugin can answer it directly from the Deck's own numbers
instead of waiting on the AI model to reply. It also reads a proposed new power
cap and clock speed back out of the model's own reply, and can remove that
proposal from the words a person actually sees.
Used for: deciding, before a question reaches the model, whether it is a
"what is it right now" question the plugin can answer itself; reading a
proposed new power cap out of the model's reply and keeping it inside the
Deck's real limits; and cleaning that same proposal out of a reply's visible
text once it has been used, so a person is not shown raw computer-readable
text in the middle of a sentence.
Solves: a plain "what's my TDP" question used to wait on a full model reply
just to report a number the plugin already had. And without the last part, the
model's raw suggestion -- a line that looks like `{"tdp_watts": 12, ...}` --
could show up in the middle of a reply meant for a person to read.
Does not: change the power cap itself or talk to the hardware -- see
tdp_service for that. Recognizing a "what is it now" question is done by
matching the wording, not by asking the model, so an unusually worded question
may fall through to the model instead of being answered directly.
"""

import json
import re
from typing import Optional


def is_current_tdp_read_intent(question: str) -> bool:
    """True when the user wants to *read* the current TDP cap, not change or recommend one."""
    t = (question or "").strip().lower()
    if not t:
        return False
    if "tdp" not in t and "thermal design power" not in t:
        return False
    excl = (
        "recommend",
        "suggest",
        "set tdp",
        "set my tdp",
        "change ",
        "increase",
        "decrease",
        "lower my",
        "raise my",
        "cap at",
        "best tdp",
        "optimal tdp",
        "should i",
        "should i use",
        "optimize for",
    )
    if any(s in t for s in excl):
        return False
    if re.search(
        r"\b(what|how much)\b.{0,40}\b(tdp|watts?)\b",
        t,
    ) and "current" in t:
        return True
    if re.search(r"\b(what|how much)\b.{0,20}\b(current|the)\b.{0,20}\b(tdp|watts?)\b", t):
        return True
    if re.search(
        r"\b(current|read|right now|present|actual)\b.{0,30}\b(tdp|watts?)\b",
        t,
    ):
        return True
    if re.search(
        r"\b(tdp|watts?)\b.{0,20}\b(is|are|am i|we at|we running)\b",
        t,
    ):
        return True
    if re.search(r"\bwhat tdp (is|am|are|right now)\b", t) or re.search(r"\bhow much tdp\b", t):
        return True
    return "what's" in t and "tdp" in t


def parse_tdp_recommendation(
    text: str,
    tdp_min: int,
    tdp_max: int,
    gpu_min_mhz: int,
    gpu_max_mhz: int,
) -> Optional[dict]:
    """Parse and clamp TDP recommendations from JSON blocks or natural-language fallbacks."""
    rec = None

    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if not fenced:
        fenced = re.search(r'(\{\s*"tdp_watts"\s*:\s*\d+[^}]*\})', text, re.DOTALL)
    if fenced:
        try:
            rec = json.loads(fenced.group(1))
        except json.JSONDecodeError:
            rec = None

    if rec is None:
        natural = re.search(r"(?:tdp|TDP)\s*(?:to|of|at|:)?\s*(\d+)\s*(?:w|W|watts?)", text)
        if natural:
            rec = {"tdp_watts": int(natural.group(1))}

    if rec is None:
        return None

    tdp = rec.get("tdp_watts")
    gpu = rec.get("gpu_clock_mhz")
    if not isinstance(tdp, (int, float)):
        return None

    result: dict = {"tdp_watts": max(tdp_min, min(tdp_max, int(tdp)))}
    if isinstance(gpu, (int, float)):
        result["gpu_clock_mhz"] = max(gpu_min_mhz, min(gpu_max_mhz, int(gpu)))
    else:
        result["gpu_clock_mhz"] = None
    return result


_RAW_TDP_BLOCK_RE = re.compile(r'\{\s*"tdp_watts"\s*:\s*\d+[^}]*\}')
_FENCE_RE = re.compile(r"```.*?```", re.DOTALL)

# The plugin's own instruction (ollama_prompts.py) tells the model to put the power block
# inside a fenced code box, e.g. ```json\n{"tdp_watts": 5, "gpu_clock_mhz": 1200}\n```. That is
# the one shape the plain _FENCE_RE skip above can never remove, so it needs its own pattern:
# a fence (with or without a language tag) whose entire content, once trimmed, is nothing but
# the power block. A box holding real code -- or the power block plus anything else -- does not
# match this and is left untouched by design.
_FENCED_TDP_ONLY_RE = re.compile(
    r'```[ \t]*[A-Za-z0-9_+-]*[ \t]*\r?\n\s*(\{\s*"tdp_watts"\s*:\s*\d+[^}]*\})\s*```',
    re.DOTALL,
)


def strip_tdp_recommendation_block(text: str) -> str:
    """Remove a ``{"tdp_watts": ...}`` block from reply text before it reaches a person.

    ``parse_tdp_recommendation`` reads this block (it is how the power suggestion feature
    works) but never removes it, so on some replies the model's raw JSON ends up sitting in
    the words a person reads. This mirrors the same fallback pattern used to *find* the block
    so stripping matches parsing exactly. A fenced code box that holds only the power block --
    the exact shape the prompt instructs the model to use -- is removed as a whole unit; a
    fenced box holding real code, or the power block alongside other text, is left alone
    because that text was asked for on purpose.
    """
    if not text or '"tdp_watts"' not in text:
        return text

    changed = False

    def _replace_fenced_tdp_only(match: "re.Match[str]") -> str:
        nonlocal changed
        changed = True
        return ""

    text = _FENCED_TDP_ONLY_RE.sub(_replace_fenced_tdp_only, text)

    fenced_spans = [m.span() for m in _FENCE_RE.finditer(text)]

    def _in_fenced_span(pos: int) -> bool:
        return any(start <= pos < end for start, end in fenced_spans)

    def _replace(match: "re.Match[str]") -> str:
        nonlocal changed
        if _in_fenced_span(match.start()):
            return match.group(0)
        changed = True
        return ""

    stripped = _RAW_TDP_BLOCK_RE.sub(_replace, text)
    if not changed:
        return text

    stripped = re.sub(r"[ \t]+\n", "\n", stripped)
    stripped = re.sub(r"\n{3,}", "\n\n", stripped)
    return stripped.strip()
