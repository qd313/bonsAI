"""Title: Knowledge-base attached notes -- parsing, logging fields, live publish

Purpose: Turn the formatted knowledge-base text block a question actually sent to the model
back into one entry per attached note, build the fields an app-activity log line needs to say
what the knowledge-base search found and what survived the context budget, and publish those
notes into the live partial-stream snapshot before the model call finishes.

Used for: Called by game_ai_request.py's run_game_ai_request, once per Ask that searched the
knowledge base, to build the "From the notes" record Show details shows and the notes a live
poll can read before the model's first word.

Solves: Retrieval's own result exposes the full text the model saw and a `sources` list built
for crediting third-party wikis -- but that list silently drops every card with no source URL,
which is most of the shared troubleshooting tips and every hand-written note. The per-card name
and text this needs only survive in the formatted string every attached card was written into,
so it is read back apart here instead.

Does not: Decide whether to search the knowledge base at all, or run the search itself --
knowledge_base_service.py owns both. Decide what a card's own text says -- only reads it back.
"""

from __future__ import annotations

import re
from typing import Any, Optional

from backend.services.knowledge_base_service import (
    # Plan 58 phase 1: the end-of-block marker `_parse_kb_attached_notes` (below) uses to trim a
    # card's own text apart from the block's own trailer. Reused rather than duplicated as a
    # literal string, on purpose -- an ImportError if this is ever renamed is a louder, safer
    # failure than a parser that quietly stops trimming correctly. See that function's docstring
    # for why the notes it needs are not exposed any more directly than this.
    _BLOCK_SENTINEL,
    # The `game_title` every shared troubleshooting tip's `sources` entry is keyed under
    # (knowledge_base_service.py's `_compat_row_to_card` and `_format_block`). Reused here for
    # the same reason as `_BLOCK_SENTINEL` above: a tip's own text never writes its game title
    # (`_card_lines` writes "[Tip: Name]" only), so `_parse_kb_attached_notes` cannot recover it
    # from the parsed block and has to know the fixed value the sources side used instead.
    _COMPAT_GAME_TITLE,
)

# Matches one card's own header line the way knowledge_base_service.py's `_card_lines` writes it:
# either "\n[Tip: Name] (trust: tier)\n" for a troubleshooting tip, or
# "\n[Game Title / kind: Name] (trust: tier)\n" for a strategy note. Kept here, not imported,
# because it is a *shape* two branches of one private function write, not a single named
# constant like _BLOCK_SENTINEL -- there is nothing smaller to import that would catch a format
# drift the way importing _BLOCK_SENTINEL does. `test_game_ai_request_kb_attached_notes.py`
# builds real KnowledgeCard rows and calls the real `_format_block` to prove this still matches.
_KB_NOTE_HEADER_RE = re.compile(
    r"\n\[(?:Tip: (?P<tip_name>[^\]]+)"
    r"|(?P<game_title>[^/\]]+) / (?P<kind>[^:\]]+): (?P<name>[^\]]+))\]"
    r" \(trust: (?P<trust>[A-Za-z_]+)\)\n"
)
# The one other shape a card boundary can butt up against: `_format_block`'s own
# "N more card(s) omitted to fit budget" trailer, appended after the last kept card when earlier
# ones were dropped for the byte budget. Never a real card's own text -- trimmed off the same way
# the block's end sentinel is.
_KB_NOTE_OMITTED_TAIL_RE = re.compile(r"\n\[\d+ more card\(s\) omitted")


def _kb_note_source_host(url: str) -> str:
    """The credited host, exactly as written -- `www.` kept, unlike transparency_service.py's
    `source_display_name`, because the header wording map the screen side uses keys three wikis
    by their `www.` host (`www.pikminwiki.com`, `www.mariowiki.com`, `www.ssbwiki.com`)."""
    raw = str(url or "").strip()
    if not raw:
        return ""
    match = re.match(r"^[a-zA-Z][a-zA-Z0-9+.\-]*://([^/?#]+)", raw)
    host = (match.group(1) if match else raw.split("/", 1)[0]).strip().lower()
    return host.rsplit("@", 1)[-1].split(":", 1)[0]


def _parse_kb_attached_notes(
    text_block: str, *, kb_domain: str, sources: list
) -> list[dict[str, Any]]:
    """Recover one entry per attached note from the formatted text the model was actually sent.

    Why this parses a formatted block instead of reading a list of cards directly: retrieval's
    own result (`KnowledgeRetrievalResult` in knowledge_base_service.py) exposes the full text
    the model saw (``text_block``) and a `sources` list built for crediting third-party wikis --
    but that `sources` list silently drops every card with no `source_url`, which today is *all
    159* shared troubleshooting tips and every note the maintainer wrote from memory with no wiki
    behind it. Those two cases are exactly two of the three things this block has to show, so a
    citation list built for "who do we owe credit to" cannot double as "what did the model see" --
    the per-card name and text this needs only survive in the formatted string every attached
    card was written into. This lane's file list marks knowledge_base_service.py read-only, so
    that string is read back apart rather than asking that file to expose the list directly.

    ``sources`` is still used, just for what it is good for: matching a parsed card back to its
    credited URL and licence when it has one, by the same title string `_format_block` builds
    (``f"{game_title} — {name}"``, em dash and all).

    Known limits, both acceptable for the seed library on disk and worth reading before Lane B's
    wiki-extracted notes grow this corpus: a game title containing a literal " / " would be
    mis-split, and a card whose own text opens a line with "[" in the same shape a header uses
    would be cut early. Neither happens anywhere in the corpus today.
    """
    if not text_block:
        return []
    matches = list(_KB_NOTE_HEADER_RE.finditer(text_block))
    if not matches:
        return []
    by_title: dict[str, dict] = {}
    for entry in sources or []:
        title = str(entry.get("title") or "")
        if title:
            by_title[title] = entry
    domain = "compat" if kb_domain == "compat" else "strategy"
    notes: list[dict[str, Any]] = []
    for i, m in enumerate(matches):
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text_block)
        card_text = text_block[start:end]
        card_text = _KB_NOTE_OMITTED_TAIL_RE.split(card_text, maxsplit=1)[0]
        card_text = card_text.split("\n" + _BLOCK_SENTINEL, 1)[0]
        card_text = card_text.rstrip("\n")
        if not card_text:
            continue
        if m.group("tip_name") is not None:
            name = m.group("tip_name")
            kind = "tip"
            # The note itself carries no game title -- a tip's header never writes one -- but
            # the `sources` entry `_format_block` built for this same card is keyed under
            # `_COMPAT_GAME_TITLE` regardless (`_compat_row_to_card` sets it there even though
            # `_card_lines` never prints it). Look the source up under that fixed key so a tip
            # with a real source page is still credited; `game_title` below stays "" so the
            # published note itself is unchanged.
            game_title = ""
            title_key = f"{_COMPAT_GAME_TITLE} — {name}"
        else:
            name = m.group("name")
            kind = m.group("kind")
            game_title = m.group("game_title")
            title_key = f"{game_title} — {name}" if game_title else ""
        src = by_title.get(title_key, {})
        notes.append(
            {
                "name": name,
                "kind": kind,
                "card": card_text,
                "trust_tier": m.group("trust"),
                "source_host": _kb_note_source_host(str(src.get("url") or "")),
                "source_license": str(src.get("license") or ""),
                "domain": domain,
                "game_title": game_title,
            }
        )
    return notes


def _kb_search_log_fields(
    kb_result: Any, *, kb_domain: str, app_name: str, kb_survived: bool, starved: bool
) -> dict[str, Any]:
    """Fields for the app-activity log line naming what the knowledge-base search found this
    turn and what actually reached the model.

    Why this exists (D-lane 63 G, task 3): the check that compares what Show details SAYS
    attached against what retrieval really decided has never once been runnable, because
    nothing in the log recorded either half. ``kb_result.sources`` is retrieval's own decision
    of what to format (searched, and named); ``kb_survived`` is whether that same set stayed in
    the prompt once the outer proton-log/knowledge-base budget in `stack_context_blocks` ran --
    the "starved" case this turn's own comment above describes. When starved, the search still
    found something (`searched_count` > 0) but nothing reached the model (`attached_count` 0),
    which is exactly the gap a screen-vs-log comparison needs to be able to see.

    Names, not just counts -- `searched_notes` / `attached_notes` are "; "-joined titles in the
    same `"{game_title} — {name}"` shape `_format_block` builds them in, so a name here can be
    matched by eye against a card shown on screen. `top_keyword_score` / `best_meaning_score`
    are the same two aggregate numbers Show details itself reads (`kb_top_card_keyword_score`,
    `kb_best_meaning`) -- the turn's best score, not one per card; a full per-card breakdown
    would need new fields on `KnowledgeRetrievalResult` this task did not build.
    """
    titles = [str(source.get("title") or "") for source in (kb_result.sources or [])]
    return {
        "kb_domain": kb_domain,
        "app_name": app_name,
        "searched_count": len(titles),
        "searched_notes": "; ".join(titles),
        "attached_count": len(titles) if kb_survived else 0,
        "attached_notes": "; ".join(titles) if kb_survived else "",
        "starved_by_context_budget": starved,
        "top_keyword_score": kb_result.top_card_keyword_score,
        "best_meaning_score": kb_result.best_meaning,
    }


def _publish_kb_attached_notes_live(
    plugin: Any, request_id: Optional[int], notes: list[dict[str, Any]]
) -> None:
    """Write the attached notes into the live partial-stream snapshot before the model call, the
    same reason and the same guard shape as `plugin._publish_asked_entity` two lines below where
    this is called.

    This reaches `plugin._partial_response_lock` / `plugin._partial_stream_snapshot` directly
    rather than calling a `plugin._publish_...` method the way every other publish here does,
    because adding that method is a change to the Plugin class in main.py, which is outside this
    lane's file list. Both attributes already exist on the real plugin (main.py's own
    `_reset_partial_stream_snapshot` / `_update_partial_response` use them the same way), so this
    works against the real object today without editing it.

    What still needs a small change in main.py, outside this lane: `_merge_partial_into_
    background_status` copies specific named fields (`asked_entity` becomes
    `strategy_spoiler_asked_entity`, and so on) from this same snapshot onto the dict a poll
    reads -- it does not copy everything it finds. One more line there, copying
    `kb_attached_notes` the same way, is what would let a poll actually see what this function
    writes; until that lands, the write below is real but nothing reads it back out of a poll.
    """
    if not notes or not isinstance(request_id, int):
        return
    lock = getattr(plugin, "_partial_response_lock", None)
    if lock is None:
        return
    with lock:
        snap = getattr(plugin, "_partial_stream_snapshot", None)
        if not isinstance(snap, dict) or snap.get("request_id") != request_id:
            return
        snap["kb_attached_notes"] = notes
