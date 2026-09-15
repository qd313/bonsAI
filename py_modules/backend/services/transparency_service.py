"""Title: What "Show details" knows about one answer

Purpose: Every Ask reply carries a "Show details" panel that lets a person see what actually
happened behind the answer — was a screenshot sent, did it check the local knowledge base, which
model answered, and so on. This file is where that record gets built, whichever path the
question took. A question can be answered several different ways (a normal trip to Ollama, an
instant local shortcut, blocked by the safety filter, an outright error), and each of those paths
builds its own version of the record here, but they all end up the same shape. This file then
turns that raw record into the small, ordered list of "chips" — Screenshot attached, Knowledge
base used, Routed to such-and-such model, and so on — that the panel actually displays, plus a
catch-all "Developer details" chip with the whole raw record for anyone who wants it.
Used for: Called at the end of every Ask question, whichever path it took, to build what Show
details displays; also used when trimming a turn down to the handful of fields worth keeping in
saved chat history.
Solves: One shared shape for this record, so every path through Ask (a real model call, a
blocked question, an instant shortcut, an error) produces a Show details panel that looks and
behaves the same way, instead of each path inventing its own fields.
Does not: Save anything to disk, or draw the panel itself — everything here is a plain dict of
facts; the frontend is what turns it into the on-screen panel.

How it works:
1. One of several snapshot-building functions builds the raw record first, depending on which
   path answered the question: `build_ollama_route_snapshot()` for a normal trip to Ollama (by
   far the most detailed one — see the note on that function below), `build_immediate_command_snapshot()`
   and `build_sanitizer_command_snapshot()` for the fast local shortcuts that never call Ollama at
   all, `build_sanitizer_block_snapshot()` and `build_capability_denied_snapshot()` for a question
   that got refused before it went anywhere, `build_error_route_snapshot()` for an outright
   failure, and `build_voice_transcribe_snapshot()` for a voice question.
2. `build_context_chips_manifest()` turns that raw record into the ordered list of chips Show
   details actually displays — one chip per fact worth surfacing (a screenshot, the knowledge
   base, which model answered, and so on), each numbered in display order, ending with a
   "Developer details" chip that carries the whole raw record as JSON via
   `_developer_chip_snapshot_summary()`. A handful of small helpers format the text inside
   individual chips — `kb_retrieval_chip_label()`, `kb_coverage_chip_label()`,
   `source_display_name()` (turns a source URL into the wiki name a reader would recognise), and
   `build_attribution_entries()` (groups knowledge-base credits so the same wiki is not printed
   three times in a row).
3. `ensure_context_chips_on_snapshot()` is a safety net: three of the snapshot builders above
   build their chips lazily, only when something later reads them, rather than up front. This
   function fills the chips in on demand for those, so nothing downstream has to know which
   builders were lazy about it.
4. `transparency_snapshot_for_chat_slot()` trims a full record down to the few fields worth
   keeping in saved chat history — a stored turn only ever needs its route, whether it succeeded,
   and its chips; keeping the rest (the full prompt text, the raw model reply) would make every
   saved chat many times bigger for fields nothing re-reads later.
"""

from __future__ import annotations

import re
from typing import Any, Optional

from backend.services.spoiler_risk_service import (
    compute_spoiler_risk_band,
    parse_bonsai_spoiler_risk_tag,
    spoiler_risk_chip_label,
    spoiler_risk_detail_bullets,
    spoiler_risk_signals_from_snapshot,
)


def _base_snapshot_fields() -> dict[str, Any]:
    return {
        "ollama_model": None,
        "system_prompt": None,
        "user_text_for_model": None,
        "user_image_count": 0,
        "attachment_paths": [],
        "assistant_raw": None,
        "assistant_after_attachment_format": None,
        "model_policy_disclosure": None,
    }


def build_immediate_command_snapshot(
    *,
    route: str,
    parsed_question: str,
    resp: str,
    sanitizer_action: str,
    sanitizer_reason_codes: list,
    app_id: str,
    app_name: str,
    pc_ip: str,
) -> dict[str, Any]:
    """Transparency row for sanitizer/shortcut/VAC paths that finish inside ``start_background_game_ai``."""
    return ensure_context_chips_on_snapshot(
        {
            "route": route,
            "raw_question": parsed_question,
            "sanitizer_action": sanitizer_action,
            "sanitizer_reason_codes": list(sanitizer_reason_codes),
            "text_after_sanitizer": parsed_question,
            **_base_snapshot_fields(),
            "final_response": resp,
            "applied": None,
            "success": True,
            "app_id": app_id,
            "app_name": app_name,
            "pc_ip": pc_ip,
            "error_message": "",
            "elapsed_seconds": 0.0,
        }
    )


def build_sanitizer_block_snapshot(
    *,
    raw_question: str,
    sanitizer_action: str,
    sanitizer_reason_codes: list,
    text_after_sanitizer: str,
    final_response: str,
    app_id: str,
    app_name: str,
    pc_ip: str,
    elapsed_seconds: float = 0.0,
) -> dict[str, Any]:
    return {
        "route": "sanitizer_block",
        "raw_question": raw_question,
        "sanitizer_action": sanitizer_action,
        "sanitizer_reason_codes": list(sanitizer_reason_codes),
        "text_after_sanitizer": text_after_sanitizer,
        **_base_snapshot_fields(),
        "final_response": final_response,
        "applied": None,
        "success": False,
        "app_id": app_id,
        "app_name": app_name,
        "pc_ip": pc_ip,
        "error_message": "",
        "elapsed_seconds": elapsed_seconds,
    }


def build_capability_denied_snapshot(
    *,
    raw_question: str,
    attachment_paths: list[str],
    final_response: str,
    app_id: str,
    app_name: str,
    pc_ip: str,
    elapsed_seconds: float,
) -> dict[str, Any]:
    return {
        "route": "capability_denied",
        "raw_question": raw_question,
        "sanitizer_action": "n/a",
        "sanitizer_reason_codes": [],
        "text_after_sanitizer": raw_question,
        **_base_snapshot_fields(),
        "attachment_paths": list(attachment_paths),
        "final_response": final_response,
        "applied": None,
        "success": False,
        "app_id": app_id,
        "app_name": app_name,
        "pc_ip": pc_ip,
        "error_message": "media_library_access",
        "elapsed_seconds": elapsed_seconds,
        "proton_log_excerpt_attached": False,
        "proton_log_sources": [],
        "proton_log_notes": "",
    }


def build_sanitizer_command_snapshot(
    *,
    raw_question: str,
    final_response: str,
    app_id: str,
    app_name: str,
    pc_ip: str,
    elapsed_seconds: float,
) -> dict[str, Any]:
    return {
        "route": "sanitizer_command",
        "raw_question": raw_question,
        "sanitizer_action": "command",
        "sanitizer_reason_codes": [],
        "text_after_sanitizer": raw_question,
        **_base_snapshot_fields(),
        "final_response": final_response,
        "applied": None,
        "success": True,
        "app_id": app_id,
        "app_name": app_name,
        "pc_ip": pc_ip,
        "error_message": "",
        "elapsed_seconds": elapsed_seconds,
        "proton_log_excerpt_attached": False,
        "proton_log_sources": [],
        "proton_log_notes": "",
    }


def build_knowledge_base_transparency(
    *,
    attached: bool,
    trust_tier: str,
    sources: list,
    notes: str,
    timing_ms: dict,
    unavailable_reason: str = "",
    retrieval_method: str = "keyword",
    kb_domain: str = "",
    best_meaning: float | None = None,
    top_card_keyword_score: float = 0.0,
) -> dict[str, Any]:
    """Collect one turn's knowledge-base facts into the dict the rest of the turn reads.

    ``best_meaning`` and ``top_card_keyword_score`` say how well the winning note actually
    matched, not just whether one attached -- see KnowledgeRetrievalResult for both, and
    kb_not_in_notes_notice.should_show_no_close_match_notice for the one thing that reads them.
    ``best_meaning`` is None whenever the meaning half never ran, which is a different fact from
    a low score and must stay tellable apart from one.
    """
    return {
        "kb_attached": attached,
        "kb_trust_tier": trust_tier,
        "kb_sources": list(sources or []),
        "kb_notes": notes or "",
        "kb_timing_ms": dict(timing_ms or {}),
        "kb_unavailable_reason": unavailable_reason or "",
        "kb_retrieval_method": retrieval_method or "keyword",
        "kb_domain": str(kb_domain or ""),
        "kb_best_meaning": best_meaning,
        "kb_top_card_keyword_score": float(top_card_keyword_score or 0.0),
    }


def kb_retrieval_chip_label(retrieval_method: str) -> str:
    """User-facing chip label for KB retrieval method."""
    if retrieval_method == "hybrid":
        return "Keyword + meaning"
    return "Keyword search"


def kb_retrieval_detail_label(retrieval_method: str) -> str:
    """Full retrieval label for Show details bullets."""
    if retrieval_method == "hybrid":
        return "Keyword + meaning"
    if retrieval_method == "keyword_embed_unavailable":
        return "Keyword search (embed unavailable)"
    # Deliberately not the same string as embed-unavailable (Decision 5): this one is a
    # setting someone chose, and reads as a bug if it is reported as a missing model.
    if retrieval_method == "keyword_hybrid_disabled":
        return "Keyword search (hybrid disabled)"
    return "Keyword search"


def kb_coverage_chip_label(*, status: str, section_count: int = 0) -> str:
    """Short Show-details chip for offline corpus coverage (distinct from Ask-turn kb chip)."""
    if status == "kb_off":
        return "KB: off"
    if status == "corpus_missing":
        return "KB: no corpus"
    if status == "no_app":
        return "KB: no game running"
    if status in ("no_sections", "app_unresolved"):
        return "KB: none for this game"
    if status == "corpus_error":
        return "KB: unreadable"
    if status == "sections":
        count = max(0, int(section_count or 0))
        if count == 1:
            return "KB: 1 section"
        return f"KB: {count} sections"
    return "KB: ?"


def kb_coverage_detail_bullets(*, status: str, section_count: int = 0, reason: str = "") -> list[str]:
    if status == "kb_off":
        return ["Local knowledge base is disabled in Settings."]
    if status == "corpus_missing":
        return ["No knowledge-base corpus is installed."]
    if status == "no_app":
        return ["No game is running, so there is nothing to look up."]
    if status == "app_unresolved":
        return ["Running game could not be matched to corpus entries."]
    if status == "no_sections":
        return ["Corpus has no strategy sections for this game."]
    if status == "corpus_error":
        detail = str(reason or "").strip()
        return [detail or "Corpus could not be read."]
    if status == "sections":
        count = max(0, int(section_count or 0))
        noun = "section" if count == 1 else "sections"
        return [f"{count} strategy {noun} in corpus for this game."]
    return []


def build_proton_log_transparency(
    *,
    excerpt_attached: bool,
    sources: list,
    notes: str,
) -> dict[str, Any]:
    return {
        "proton_log_excerpt_attached": excerpt_attached,
        "proton_log_sources": list(sources),
        "proton_log_notes": notes,
    }


def _developer_chip_snapshot_summary(snapshot: dict[str, Any]) -> dict[str, Any]:
    """Lightweight dev chip payload — avoids duplicating full prompts in RPC responses."""
    return {
        "route": snapshot.get("route"),
        "success": snapshot.get("success"),
        "app_id": snapshot.get("app_id"),
        "app_name": snapshot.get("app_name"),
        "ollama_model": snapshot.get("ollama_model"),
        "elapsed_seconds": snapshot.get("elapsed_seconds"),
        "kb_attached": snapshot.get("kb_attached"),
        "user_image_count": snapshot.get("user_image_count"),
        "reply_verbosity": snapshot.get("reply_verbosity"),
        "note": "Enable Desktop Ask verbose logging for full prompt dump.",
    }


def ensure_context_chips_on_snapshot(snapshot: dict[str, Any]) -> dict[str, Any]:
    """Attach ranked context chips when missing (legacy/error/immediate-command rows)."""
    if isinstance(snapshot.get("context_chips"), list) and snapshot["context_chips"]:
        return snapshot
    manifest = build_context_chips_manifest(
        snapshot=snapshot,
        overflow_skips=snapshot.get("overflow_skips") or [],
    )
    out = dict(snapshot)
    out["context_chips"] = manifest["context_chips"]
    out["overflow_skips"] = manifest["overflow_skips"]
    return out


def transparency_snapshot_for_chat_slot(snapshot: dict[str, Any]) -> dict[str, Any]:
    """Trim a full transparency snapshot to what a persisted chat-slot turn needs.

    Chat slots keep up to 200 turns per slot (``MAX_TURNS_PER_SLOT`` in chat_slot_service.py).
    The session context strip only ever reads ``route``, ``success`` and ``context_chips`` off a
    stored turn (``SessionContextStrip.tsx``, ``chipsFromSnapshot``) — storing the rest (raw
    prompts, system prompt text, the developer chip's dev_json) would multiply slot size on disk
    for fields no persisted-turn UI reads. ``ensure_context_chips_on_snapshot`` runs first because
    some snapshot builders (sanitizer block, capability denied, sanitizer command) build chips
    lazily at RPC-read time rather than at build time.
    """
    enriched = ensure_context_chips_on_snapshot(snapshot)
    return {
        "route": enriched.get("route"),
        "success": bool(enriched.get("success")),
        "context_chips": enriched.get("context_chips") or [],
        "overflow_skips": enriched.get("overflow_skips") or [],
    }


def _chip_body(
    *,
    title: str,
    paths: Optional[list[str]] = None,
    bullets: Optional[list[str]] = None,
    attribution: Optional[list[dict[str, Any]]] = None,
    dev_json: Any = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {"title": title, "paths": list(paths or []), "bullets": list(bullets or [])}
    if attribution:
        body["attribution"] = list(attribution)
    if dev_json is not None:
        body["dev_json"] = dev_json
    return body


def source_display_name(url: str) -> str:
    """Host a reader would recognise as the author: ``zelda.fandom.com``.

    Deliberately the host and not the page title. Credit has to be legible at a glance on a
    handheld, and every CC BY / BY-SA source in scope is a wiki whose host *is* its name.
    """
    raw = str(url or "").strip()
    if not raw:
        return ""
    match = re.match(r"^[a-z][a-z0-9+.\-]*://([^/?#]+)", raw, flags=re.IGNORECASE)
    host = (match.group(1) if match else raw.split("/", 1)[0]).strip().lower()
    host = host.rsplit("@", 1)[-1].split(":", 1)[0]
    return host[4:] if host.startswith("www.") else host


def _captured_date(value: Any) -> str:
    """Reduce a capture stamp to ``YYYY-MM-DD``.

    Seed rows carry a snapshot date; rows that never stated one inherit the build's ISO
    timestamp. Both are useful to a reader only down to the day.
    """
    raw = str(value or "").strip()
    match = re.match(r"^(\d{4}-\d{2}-\d{2})", raw)
    return match.group(1) if match else ""


def build_attribution_entries(sources: Any) -> list[dict[str, Any]]:
    """Group per-card sources into one credit line per (source, licence).

    One entry per card would print the same wiki three times for a three-card block, which
    reads as noise and gets skipped -- the opposite of crediting anyone. Grouping keeps the
    card titles, so the per-work part of a ShareAlike attribution survives.

    Cards with no ``source_url`` are skipped rather than credited to nobody: those are
    maintainer-authored and have no third party to name.
    """
    grouped: dict[tuple[str, str], dict[str, Any]] = {}
    for item in sources or []:
        if not isinstance(item, dict):
            continue
        url = str(item.get("url") or "").strip()
        if not url:
            continue
        source = source_display_name(url)
        if not source:
            continue
        key = (source, str(item.get("license") or "").strip())
        entry = grouped.setdefault(
            key, {"source": source, "license": key[1], "url": url, "cards": [], "captured": ""}
        )
        title = str(item.get("title") or "").strip()
        if title and title not in entry["cards"]:
            entry["cards"].append(title)
        captured = _captured_date(item.get("captured"))
        # Cards grouped under one wiki can come from different snapshots. Show the oldest --
        # it is the honest bound on how current the credited text is.
        if captured and (not entry["captured"] or captured < entry["captured"]):
            entry["captured"] = captured
    return list(grouped.values())


def _tier_class_from_source_class(source_class: str) -> str:
    sc = str(source_class or "").strip().lower()
    if sc == "foss":
        return "foss"
    if sc in ("open_weight", "open-weight", "openweight"):
        return "open_weight"
    if sc in ("non_foss", "non-foss", "nonfoss"):
        return "non_foss"
    return ""


def build_context_chips_manifest(
    *,
    snapshot: dict[str, Any],
    overflow_skips: Optional[list[str]] = None,
) -> dict[str, Any]:
    """Assemble ranked context chips for F11 Option C UI from a near-complete snapshot."""
    chips: list[dict[str, Any]] = []
    rank = 1

    if snapshot.get("proton_log_excerpt_attached") or snapshot.get("proton_log_notes"):
        sources = snapshot.get("proton_log_sources") or []
        paths = [str(s.get("path", "")) for s in sources if isinstance(s, dict) and s.get("path")]
        bullets: list[str] = []
        if snapshot.get("proton_log_excerpt_attached"):
            bullets.append("Excerpt attached to system prompt")
        else:
            bullets.append("No excerpt attached")
        notes = str(snapshot.get("proton_log_notes") or "").strip()
        if notes:
            bullets.append(notes)
        chips.append(
            {
                "id": "proton_logs",
                "rank": rank,
                "label": "Read Proton log tail" if snapshot.get("proton_log_excerpt_attached") else "Proton logs (skipped)",
                "attached": bool(snapshot.get("proton_log_excerpt_attached")),
                "tier_class": "",
                "body": _chip_body(title="Proton / Steam logs", paths=paths, bullets=bullets),
            }
        )
        rank += 1

    journal_count = int(snapshot.get("proton_journal_entry_count") or 0)
    if journal_count > 0 or snapshot.get("proton_journal_notes"):
        bullets_j: list[str] = []
        if snapshot.get("proton_journal_attached"):
            bullets_j.append(f"{journal_count} prior attempt(s) injected")
        else:
            bullets_j.append("Journal present but not injected this Ask")
        jnotes = str(snapshot.get("proton_journal_notes") or "").strip()
        if jnotes:
            bullets_j.append(jnotes)
        chips.append(
            {
                "id": "journal",
                "rank": rank,
                "label": f"Inject {journal_count} prior tries" if journal_count else "Experiment journal",
                "attached": bool(snapshot.get("proton_journal_attached")),
                "tier_class": "",
                "body": _chip_body(title="Proton experiment journal", bullets=bullets_j),
            }
        )
        rank += 1

    img_count = int(snapshot.get("user_image_count") or 0)
    att_paths = [str(p) for p in (snapshot.get("attachment_paths") or []) if p]
    if img_count > 0 or att_paths:
        chips.append(
            {
                "id": "screenshot",
                "rank": rank,
                "label": f"Attach {img_count or len(att_paths)} screenshot(s)",
                "attached": img_count > 0 or len(att_paths) > 0,
                "tier_class": "",
                "body": _chip_body(
                    title="Screenshot attachment",
                    paths=att_paths,
                    bullets=[f"{img_count or len(att_paths)} image(s) sent to vision model"],
                ),
            }
        )
        rank += 1

    if snapshot.get("kb_attached") or snapshot.get("kb_notes") or snapshot.get("kb_unavailable_reason"):
        kb_sources = snapshot.get("kb_sources") or []
        kb_bullets: list[str] = []
        retrieval_method = str(snapshot.get("kb_retrieval_method") or "keyword")
        if snapshot.get("kb_attached"):
            kb_bullets.append(f"Retrieval: {kb_retrieval_detail_label(retrieval_method)}")
            kb_domain = str(snapshot.get("kb_domain") or "").strip().lower()
            kb_notes = str(snapshot.get("kb_notes") or "").strip().lower()
            if kb_domain == "compat" or kb_notes == "compat_tips":
                kb_bullets.append("Source: shared troubleshooting tips")
            tier = str(snapshot.get("kb_trust_tier") or "").strip()
            if tier:
                kb_bullets.append(f"Trust tier: {tier}")
            kb_notes = str(snapshot.get("kb_notes") or "").strip()
            if kb_notes:
                kb_bullets.append(kb_notes)
            timing = snapshot.get("kb_timing_ms") or {}
            embed_ms = timing.get("embed_ms")
            rerank_ms = timing.get("rerank_ms")
            if embed_ms:
                kb_bullets.append(f"Embed: {embed_ms} ms")
            if rerank_ms:
                kb_bullets.append(f"Re-rank: {rerank_ms} ms")
        else:
            reason = str(snapshot.get("kb_unavailable_reason") or snapshot.get("kb_notes") or "").strip()
            kb_bullets.append(reason or "Not attached")
        chip_label = (
            kb_retrieval_chip_label(retrieval_method)
            if snapshot.get("kb_attached")
            else "Knowledge base (skipped)"
        )
        chips.append(
            {
                "id": "kb",
                "rank": rank,
                "label": chip_label,
                "attached": bool(snapshot.get("kb_attached")),
                "tier_class": "",
                "body": _chip_body(
                    title="Local knowledge base",
                    bullets=kb_bullets,
                    # `paths` only ever held plain strings, and retrieval has always emitted
                    # dicts, so every source was filtered out here and no card was ever
                    # credited in the UI. Structured attribution now has its own field; the
                    # string branch stays for any caller still passing bare paths.
                    paths=[str(s) for s in kb_sources if isinstance(s, str)],
                    attribution=build_attribution_entries(kb_sources),
                ),
            }
        )
        rank += 1

    kb_coverage_status = str(snapshot.get("kb_coverage_status") or "").strip()
    if kb_coverage_status:
        kb_section_count = int(snapshot.get("kb_coverage_section_count") or 0)
        kb_coverage_reason = str(snapshot.get("kb_coverage_reason") or "").strip()
        chips.append(
            {
                "id": "kb_coverage",
                "rank": rank,
                "label": kb_coverage_chip_label(
                    status=kb_coverage_status,
                    section_count=kb_section_count,
                ),
                "attached": kb_coverage_status == "sections" and kb_section_count > 0,
                "tier_class": "",
                "body": _chip_body(
                    title="Knowledge base coverage",
                    bullets=kb_coverage_detail_bullets(
                        status=kb_coverage_status,
                        section_count=kb_section_count,
                        reason=kb_coverage_reason,
                    ),
                ),
            }
        )
        rank += 1

    tdp_w = snapshot.get("tdp_cap_watts")
    if tdp_w is not None:
        chips.append(
            {
                "id": "tdp",
                "rank": rank,
                "label": "Read current TDP",
                "attached": True,
                "tier_class": "",
                "body": _chip_body(
                    title="Power context",
                    bullets=[f"{tdp_w} W cap read for this reply"],
                ),
            }
        )
        rank += 1

    reply_verbosity = str(snapshot.get("reply_verbosity") or "").strip()
    if reply_verbosity:
        chips.append(
            {
                "id": "reply_verbosity",
                "rank": rank,
                "label": f"Reply style: {reply_verbosity}",
                "attached": True,
                "tier_class": "",
                "body": _chip_body(
                    title="Reply verbosity",
                    bullets=[f"Active style: {reply_verbosity}"],
                ),
            }
        )
        rank += 1

    spoiler_signals = spoiler_risk_signals_from_snapshot(snapshot)
    assistant_for_tag = str(
        snapshot.get("assistant_raw") or snapshot.get("final_response") or ""
    )
    model_band = parse_bonsai_spoiler_risk_tag(assistant_for_tag)
    spoiler_band = compute_spoiler_risk_band(spoiler_signals, assistant_text=assistant_for_tag)
    chips.append(
        {
            "id": "spoiler_risk",
            "rank": rank,
            "label": spoiler_risk_chip_label(spoiler_band),
            "attached": True,
            "tier_class": "",
            "body": _chip_body(
                title="Spoiler likelihood estimate",
                bullets=spoiler_risk_detail_bullets(
                    spoiler_band,
                    spoiler_signals,
                    model_band=model_band,
                ),
            ),
        }
    )
    rank += 1

    disclosure = snapshot.get("model_policy_disclosure")
    model_name = str(snapshot.get("ollama_model") or "").strip()
    if isinstance(disclosure, dict) or model_name:
        src_class = ""
        label = "Model routing"
        if isinstance(disclosure, dict):
            src_class = str(disclosure.get("source_class") or "")
            m = str(disclosure.get("model") or model_name or "").strip()
            tier_num = disclosure.get("tier")
            label = f"Routed {m}" if m else "Model policy"
            if tier_num is not None:
                label += f" · Tier {tier_num}"
        elif model_name:
            label = f"Routed {model_name}"
        bullets_m: list[str] = []
        if isinstance(disclosure, dict) and disclosure.get("rationale"):
            bullets_m.append(str(disclosure.get("rationale")))
        chips.append(
            {
                "id": "model",
                "rank": rank,
                "label": label,
                "attached": bool(model_name),
                "tier_class": _tier_class_from_source_class(src_class),
                "body": _chip_body(title="Model source policy", bullets=bullets_m or [label]),
            }
        )
        rank += 1

    skips = [str(s) for s in (overflow_skips or []) if str(s).strip()]
    chips.append(
        {
            "id": "developer",
            "rank": 999,
            "label": "Developer details",
            "attached": True,
            "tier_class": "",
            "body": _chip_body(
                title="Full transparency snapshot",
                bullets=["Raw RPC snapshot JSON below"] + ([f"Skipped: {s}" for s in skips] if skips else []),
                dev_json=_developer_chip_snapshot_summary(snapshot),
            ),
        }
    )

    return {"context_chips": chips, "overflow_skips": skips}


def build_ollama_route_snapshot(
    *,
    raw_question: str,
    sanitizer_action: str,
    sanitizer_reason_codes: list,
    text_after_sanitizer: str,
    ollama_result: dict[str, Any],
    base_response_text: str,
    response_text: str,
    applied: Any,
    app_id: str,
    app_name: str,
    pc_ip: str,
    err_tail: str,
    elapsed_seconds: float,
    verify_result: Optional[dict] = None,
    reply_followup: Optional[dict] = None,
) -> dict[str, Any]:
    """Build the Show details record for an ordinary trip to the AI.

    In: the question as asked, what the safety check did to it, the full result
    of the trip to Ollama, the reply text before and after attachments were
    formatted in, and the app and timing details around the call. A background
    fact-check result and the follow-up chip that started this turn are both
    optional extras.

    Out: the whole Show details record for a normal turn, successful or not,
    with its chips already worked out. This is the one builder here that does
    not leave its chips until something asks for them.

    Watch out for: when this turn was started by a follow-up chip, the route
    name stops being plain "ollama" and becomes the chip's own name instead.
    Anything elsewhere that checks for the route being exactly "ollama" will
    not see those turns.
    """
    route = "ollama"
    if isinstance(reply_followup, dict):
        chip_id = str(reply_followup.get("chip_id") or "").strip()
        if chip_id:
            route = f"reply_followup:{chip_id}"
    base: dict[str, Any] = {
        "route": route,
        "raw_question": raw_question,
        "sanitizer_action": sanitizer_action,
        "sanitizer_reason_codes": list(sanitizer_reason_codes),
        "text_after_sanitizer": text_after_sanitizer,
        "ollama_model": ollama_result.get("model"),
        "system_prompt": ollama_result.get("system_prompt"),
        "user_text_for_model": ollama_result.get("user_text_for_model"),
        "user_image_count": int(ollama_result.get("user_image_count") or 0),
        "attachment_paths": ollama_result.get("attachment_paths") or [],
        "assistant_raw": ollama_result.get("assistant_raw"),
        "assistant_after_attachment_format": base_response_text,
        "final_response": response_text,
        "applied": applied,
        "success": bool(ollama_result.get("success", False)),
        "app_id": app_id,
        "app_name": app_name,
        "pc_ip": pc_ip,
        "error_message": err_tail,
        "elapsed_seconds": elapsed_seconds,
        "model_policy_disclosure": ollama_result.get("model_policy_disclosure"),
        "proton_log_excerpt_attached": bool(ollama_result.get("proton_log_excerpt_attached")),
        "proton_log_sources": ollama_result.get("proton_log_sources") or [],
        "proton_log_notes": str(ollama_result.get("proton_log_notes") or ""),
        "proton_journal_attached": bool(ollama_result.get("proton_journal_attached")),
        "proton_journal_entry_count": int(ollama_result.get("proton_journal_entry_count") or 0),
        "proton_journal_notes": str(ollama_result.get("proton_journal_notes") or ""),
        "tdp_cap_watts": ollama_result.get("tdp_cap_watts"),
        "kb_attached": bool(ollama_result.get("kb_attached")),
        "kb_trust_tier": str(ollama_result.get("kb_trust_tier") or ""),
        "kb_sources": ollama_result.get("kb_sources") or [],
        "kb_notes": str(ollama_result.get("kb_notes") or ""),
        "kb_timing_ms": ollama_result.get("kb_timing_ms") or {},
        "kb_unavailable_reason": str(ollama_result.get("kb_unavailable_reason") or ""),
        "kb_retrieval_method": str(ollama_result.get("kb_retrieval_method") or "keyword"),
        "kb_domain": str(ollama_result.get("kb_domain") or ""),
        "kb_coverage_status": str(ollama_result.get("kb_coverage_status") or ""),
        "kb_coverage_section_count": int(ollama_result.get("kb_coverage_section_count") or 0),
        "kb_coverage_reason": str(ollama_result.get("kb_coverage_reason") or ""),
        "ask_diagnostics": ollama_result.get("ask_diagnostics"),
        "response_verify": verify_result,
        "reply_verbosity": str(ollama_result.get("reply_verbosity") or "balanced"),
        "ask_mode": str(ollama_result.get("ask_mode") or "speed"),
        "spoiler_risk_signals": ollama_result.get("spoiler_risk_signals"),
    }
    chip_manifest = build_context_chips_manifest(
        snapshot=base,
        overflow_skips=ollama_result.get("overflow_skips") or [],
    )
    base["context_chips"] = chip_manifest["context_chips"]
    base["overflow_skips"] = chip_manifest["overflow_skips"]
    return base


def build_error_route_snapshot(
    *,
    raw_question: str,
    final_response: str,
    app_id: str,
    app_name: str,
    pc_ip: str,
    elapsed_seconds: float,
) -> dict[str, Any]:
    return ensure_context_chips_on_snapshot(
        {
            "route": "error",
            "raw_question": raw_question,
            "sanitizer_action": "error",
            "sanitizer_reason_codes": [],
            "text_after_sanitizer": raw_question,
            **_base_snapshot_fields(),
            "final_response": final_response,
            "applied": None,
            "success": False,
            "app_id": app_id,
            "app_name": app_name,
            "pc_ip": pc_ip,
            "error_message": "Internal error (details logged on device).",
            "elapsed_seconds": elapsed_seconds,
            "proton_log_excerpt_attached": False,
            "proton_log_sources": [],
            "proton_log_notes": "",
        }
    )


def build_voice_transcribe_snapshot(*, model_id: str) -> dict[str, Any]:
    return {
        "route": "voice.transcribe",
        "raw_question": None,
        "sanitizer_action": None,
        "sanitizer_reason_codes": [],
        "text_after_sanitizer": None,
        **_base_snapshot_fields(),
        "final_response": None,
        "voice_local_only": True,
        "voice_model_id": model_id,
        "voice_audio_persisted": False,
    }
