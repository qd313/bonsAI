"""Title: The short names on the Show details chips

Purpose: Each Show details chip carries a short name beside its full label (plan 105, the density
board's round 2 option A, decided 2026-10-11): the chip says only the fact ("Thought 16 s",
"Spoilers: high", "gemma4:e2b"), and the box that opens under it keeps the full label in grey
under its title. These are the rules that turn the facts a chip is built from into its short name.
Used for: transparency_service.py's ``build_context_chips_manifest``, which puts the result on each
chip as ``short_label``; the screen draws it on the chip and falls back to ``label`` when it is
empty (a chip saved before plan 105 has none).
Solves: Smaller chips, so the usual eight take three short rows instead of five long ones. The
short name needs facts the full label does not spell out (the watts, the model's tag), so it is
built here on the back end, where those facts are, and not cut out of the label on the screen.
Does not: Replace the full label. ``label`` keeps its wording for the box, the saved chat and the
Developer details snapshot. A chip whose label is already short gets no short name ("").
"""

from __future__ import annotations

from typing import Any


def _count(n: int, one: str, many: str) -> str:
    """``1 screenshot`` or ``3 screenshots``."""
    return f"{n} {one if n == 1 else many}"


def journal_short_label(count: int) -> str:
    """The Proton journal chip: ``2 earlier tries``; none when nothing was tried before."""
    return _count(count, "earlier try", "earlier tries") if count > 0 else ""


def screenshot_short_label(count: int) -> str:
    """The screenshot chip: ``1 screenshot``."""
    return _count(count, "screenshot", "screenshots") if count > 0 else ""


def kb_short_label(attached: bool) -> str:
    """The knowledge-base chip: ``KB search``, or ``KB skipped`` when nothing was attached."""
    return "KB search" if attached else "KB skipped"


def kb_coverage_short_label(status: str, section_count: int) -> str:
    """The coverage chip: ``14 sections``; the other states are short already and keep their label."""
    return _count(max(0, int(section_count or 0)), "section", "sections") if status == "sections" else ""


def tdp_short_label(watts: Any) -> str:
    """The power chip: ``TDP 12 W`` (a whole number of watts drops its ``.0``)."""
    if isinstance(watts, float) and watts.is_integer():
        watts = int(watts)
    return f"TDP {watts} W"


def reply_style_short_label(style: str) -> str:
    """The reply style chip: the style alone, capitalised (``Balanced``)."""
    style = str(style or "").strip()
    return style[:1].upper() + style[1:]


def reasoning_short_label(seconds: Any) -> str:
    """The thinking chip: ``Thought 16 s``, the seconds counted as the full label counts them."""
    whole = int(seconds) if isinstance(seconds, (int, float)) and not isinstance(seconds, bool) else 0
    return f"Thought {whole} s"


_SPOILER_BAND_WORDS = {"low": "low", "med": "medium", "high": "high"}


def spoiler_short_label(band: str) -> str:
    """The spoiler chip: ``Spoilers: high``, with ``med`` written out as ``medium``."""
    return f"Spoilers: {_SPOILER_BAND_WORDS.get(str(band), str(band))}"


def model_short_label(model: str) -> str:
    """The model chip: the model's name and the first part of its tag (``gemma4:e2b-it-qat`` is
    ``gemma4:e2b``), without any folder in front of the name; none when no model is named."""
    name = str(model or "").strip().rsplit("/", 1)[-1]
    if ":" not in name:
        return name
    base, tag = name.split(":", 1)
    return f"{base}:{tag.split('-', 1)[0]}" if tag.split("-", 1)[0] else base
