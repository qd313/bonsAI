"""
Title: Saved chats you can switch between

Purpose: Every separate conversation you keep on the Ask screen -- the ones
you can switch between instead of losing your place -- is stored here as one
file per chat ("slot"), plus a small index file listing all of them so the
switcher can show titles without opening every chat. A chat only exists here
once main.py calls `create_slot()` or `ensure_slot()`, when you start a new
chat or open a stored one for the first time in a session.

Used for: the handful of things the screen can ask the back end to do with a
chat -- start a new one, switch to one, rename it, delete it -- and the code
that records each question and answer as it happens, through `append_turn()`.

Solves: Keeping a bounded, disk-backed set of chats -- eight at most, two
hundred questions-and-answers at most in each -- written so a crash mid-save
cannot corrupt a chat, and an index kept in step with the chats it lists.

Does not: Decide which chat is currently open on screen, or match an
in-flight question back up with its answer -- that bookkeeping lives on the
Plugin class in main.py, in memory, not here.

How it works:
 1. Each chat is its own JSON file, named by its id and found through
    `slot_path()`. A small index file (`index_path()`) lists every chat's id,
    title and last-updated time, so the switcher can show a list without
    opening eight files.
 2. `create_slot()` makes a new chat: it works out a title with
    `heuristic_slot_label()` if none was given, writes the chat file with
    `save_slot()`, then adds it to the index with `_upsert_index_row()`.
 3. `ensure_slot()` is what main.py actually calls when a chat may or may not
    already exist -- it looks the id up first with `load_slot()` and only
    creates one if that comes back empty.
 4. Every question and answer is added with `append_turn()`: it loads the
    chat, cleans the new turn through `_normalize_turn()`, appends it, trims
    down to the newest 200 turns if the limit is passed, and saves both the
    chat file and the index.
 5. Both `save_slot()` and `save_index()` write to a temporary file first and
    only swap it into place once the write has finished, so a crash or power
    loss mid-write cannot leave a half-written chat behind.
 6. When a ninth chat would be created, `_prune_oldest_slot()` deletes the
    least-recently-updated one first, keeping the count at eight.

Gotchas:
 - A chat's title comes from the question asked, not the game it was asked
   in -- `heuristic_slot_label()`'s own notes explain why: naming every chat
   after the game made the chat list read as a column of near-identical
   prefixes.
 - A turn's game id is stored on the turn itself, not just once per chat,
   because a chat can outlive one play session -- you can keep asking in the
   same saved chat after closing one game and opening another.
"""

from __future__ import annotations

import json
import os
import time
import uuid
from typing import Any

from backend.services.ollama_service import REASONING_CUT_NOTE, REASONING_TEXT_CAP_CHARS

SCHEMA_VERSION = 1
MAX_CHAT_SLOTS = 8
MAX_TURNS_PER_SLOT = 200
MAX_TURN_TEXT_LEN = 120_000
MAX_LABEL_LEN = 120
MAX_DISPLAY_TEXT_LEN = 300
# The game's display name, kept alongside its app id so the slot row can show which game a chat
# belongs to without a lookup. The id alone cannot be shown to a reader, and resolving it needs the
# game to be running, which it usually is not by the time you are browsing old chats.
MAX_APP_NAME_LEN = 48
# The thing the backend worked out a question named (plan 54 gap 2) — a card title such as
# "Wheatley" or "Dreadnought Twins". Longer than a game name, since a card title can run longer,
# but still bounded: this is a display fact, not a place to smuggle a long question in.
MAX_ASKED_ENTITY_LEN = 120
# Plan 58 phase 1: the "From the notes" block's own material -- the notes retrieval attached to
# a turn, kept alongside its saved transparency so reopening the chat shows the same block again.
# Bounds below mirror what the backend already caps a card at (retrieve_knowledge_context's own
# per-mode byte budget is a few KB at most; MAX_KB_NOTE_CARD_LEN is generous headroom on top of
# that, not a second place deciding how long a note may be).
MAX_KB_ATTACHED_NOTES = 8
MAX_KB_NOTE_NAME_LEN = 200
MAX_KB_NOTE_KIND_LEN = 40
MAX_KB_NOTE_CARD_LEN = 6_000
MAX_KB_NOTE_TRUST_TIER_LEN = 40
MAX_KB_NOTE_SOURCE_HOST_LEN = 120
MAX_KB_NOTE_SOURCE_LICENSE_LEN = 60
MAX_KB_NOTE_GAME_TITLE_LEN = 120
SLOTS_SUBDIR = "chat_slots"


def slots_dir(settings_dir: str) -> str:
    return os.path.join(settings_dir, SLOTS_SUBDIR)


def index_path(settings_dir: str) -> str:
    return os.path.join(slots_dir(settings_dir), "index.json")


def slot_path(settings_dir: str, slot_id: str) -> str:
    safe = _sanitize_slot_id(slot_id)
    return os.path.join(slots_dir(settings_dir), f"{safe}.json")


def _sanitize_slot_id(slot_id: str) -> str:
    sid = str(slot_id or "").strip()
    if not sid or "/" in sid or "\\" in sid or "\x00" in sid:
        raise ValueError("Invalid slot id.")
    return sid


def _empty_index() -> dict[str, Any]:
    return {"version": SCHEMA_VERSION, "slots": []}


def _normalize_attachment_refs(raw: Any) -> list[dict[str, str]]:
    if not isinstance(raw, list):
        return []
    out: list[dict[str, str]] = []
    for item in raw[:8]:
        if not isinstance(item, dict):
            continue
        path = str(item.get("path", "") or "").strip()
        if not path:
            continue
        out.append(
            {
                "path": path[:512],
                "name": str(item.get("name", "") or "")[:120],
                "source": str(item.get("source", "unknown") or "unknown")[:32],
            }
        )
    return out


def _normalize_kb_attached_note(raw: Any) -> dict[str, Any] | None:
    """One note for the "From the notes" block, sanitized. ``name`` and non-empty ``card`` are
    both required -- a note with either missing is not something the block could ever show, so
    it is dropped here rather than stored as a placeholder a reader has to guess the shape of."""
    if not isinstance(raw, dict):
        return None
    name = str(raw.get("name") or "").strip()
    card = str(raw.get("card") or "")
    if not name or not card.strip():
        return None
    return {
        "name": name[:MAX_KB_NOTE_NAME_LEN],
        "kind": str(raw.get("kind") or "")[:MAX_KB_NOTE_KIND_LEN],
        "card": card[:MAX_KB_NOTE_CARD_LEN],
        "trust_tier": str(raw.get("trust_tier") or "")[:MAX_KB_NOTE_TRUST_TIER_LEN],
        "source_host": str(raw.get("source_host") or "")[:MAX_KB_NOTE_SOURCE_HOST_LEN],
        "source_license": str(raw.get("source_license") or "")[:MAX_KB_NOTE_SOURCE_LICENSE_LEN],
        "domain": str(raw.get("domain") or "")[:20],
        "game_title": str(raw.get("game_title") or "")[:MAX_KB_NOTE_GAME_TITLE_LEN],
    }


def _normalize_kb_attached_notes(raw: Any) -> list[dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    out: list[dict[str, Any]] = []
    for item in raw[:MAX_KB_ATTACHED_NOTES]:
        note = _normalize_kb_attached_note(item)
        if note is not None:
            out.append(note)
    return out


def _normalize_turn_transparency(raw: Any) -> dict[str, Any] | None:
    """Sanitize the trimmed snapshot ``transparency_snapshot_for_chat_slot`` hands us.

    Only ``context_chips`` is load-bearing here — it is what
    ``SessionContextStrip.tsx`` filters archived turns on (``t.transparency && chipsFromSnapshot(...)
    .length > 0``). A turn with no chips is treated the same as no snapshot at all, so a slot
    round-tripped through disk cannot resurrect an empty placeholder as a countable turn.

    ``kb_attached_notes`` (plan 58 phase 1) rides here too, kept even on a turn whose own chips
    list is empty for every OTHER reason but not for this one — in practice a turn with a note
    attached always carries a kb chip as well (build_context_chips_manifest adds one whenever
    kb_attached), so the two are not expected to disagree; if they ever do, the chip gate above
    still wins and the whole transparency object is dropped, notes included.
    """
    if not isinstance(raw, dict):
        return None
    chips = raw.get("context_chips")
    if not isinstance(chips, list) or not chips:
        return None
    return {
        "route": str(raw.get("route") or ""),
        "success": bool(raw.get("success")),
        "context_chips": chips,
        "overflow_skips": list(raw.get("overflow_skips") or []),
        "kb_attached_notes": _normalize_kb_attached_notes(raw.get("kb_attached_notes")),
    }


def _normalize_turn_reasoning(raw: Any) -> dict[str, Any] | None:
    """Sanitize a turn's saved reasoning (plan 57): the model's thinking, its whole seconds and
    a token estimate. Returns ``None`` on a turn with no thinking, so ``_normalize_turn`` leaves
    the ``reasoning`` key off entirely rather than writing an empty placeholder -- the same rule
    ``_normalize_turn_transparency`` already follows for an empty chip list.

    ``text`` arrives already capped by ``ollama_service.cap_reasoning_text`` (end kept, one-line
    cut note); the length check here is a safety net against a malformed slot file, not a second
    place that decides what gets cut.
    """
    if not isinstance(raw, dict):
        return None
    text = str(raw.get("text") or "")
    if not text.strip():
        return None
    def _num(value: Any, default: Any) -> Any:
        return int(value) if isinstance(value, (int, float)) and not isinstance(value, bool) else default

    max_len = REASONING_TEXT_CAP_CHARS + len(REASONING_CUT_NOTE)
    return {
        "text": text[:max_len],
        "seconds": _num(raw.get("seconds"), None),
        "tokens": _num(raw.get("tokens"), 0),
    }


def _normalize_turn(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    role = str(raw.get("role", "") or "").strip().lower()
    if role not in ("user", "assistant"):
        return None
    text = str(raw.get("text", "") or "")
    if not text.strip():
        return None
    turn_id = str(raw.get("id", "") or "").strip() or str(uuid.uuid4())
    rid = raw.get("request_id")
    request_id = int(rid) if isinstance(rid, (int, float)) and not isinstance(rid, bool) else None
    turn: dict[str, Any] = {
        "id": turn_id[:64],
        "role": role,
        "text": text[:MAX_TURN_TEXT_LEN],
        "request_id": request_id,
        # Which game was running when this turn happened. Per-turn and not per-slot because a
        # slot outlives a play session: the player can close one game, open another, and keep
        # asking in the same saved chat. Reading the slot's ``origin_app_id`` for every turn
        # would relabel the older answers with the newer game.
        #
        # Turns saved before this field existed round-trip as "" — a load-bearing empty string,
        # not a bug. ``turnsToCollapsedTurns`` in TS falls back to the slot's ``origin_app_id``
        # for those, which is right in the ordinary one-chat-one-game case and no worse than the
        # "" the frontend used to hardcode in every other case.
        "app_id": str(raw.get("app_id", "") or "").strip()[:32],
        # Display name of the game running when this turn happened, alongside ``app_id`` above —
        # needed for a title reachable only by name (an emulator shortcut with no Steam AppID,
        # plan 54 gap 1). Same "" round-trip for turns saved before this field existed.
        "app_name": str(raw.get("app_name", "") or "").strip()[:MAX_APP_NAME_LEN],
        # The thing the backend worked out this question named (plan 54 gap 2). Only ever set on
        # the assistant turn — the backend does not know it until the question has been run. ""
        # round-trips the same way for a turn with nothing named and one saved before this field
        # existed; the two are indistinguishable and that is fine, both re-fence by default.
        "asked_entity": str(raw.get("asked_entity", "") or "").strip()[:MAX_ASKED_ENTITY_LEN],
        # What the user saw as their question, when it differs from ``text`` (the composed prompt
        # actually sent to the model — e.g. a branch pick sends "[Strategy follow-up] I'm at: …"
        # while the header shows "I'm at: …"). Display only: anything that reasons about the turn
        # (spoiler unwrap, follow-up context) keeps reading ``text``. "" means they are the same,
        # which is also what every turn saved before this field existed reports.
        "display_text": str(raw.get("display_text", "") or "").strip()[:MAX_DISPLAY_TEXT_LEN],
        "attachment_refs": _normalize_attachment_refs(raw.get("attachment_refs")),
        "transparency": _normalize_turn_transparency(raw.get("transparency")),
        "created_at": int(raw.get("created_at") or time.time()),
    }
    # Plan 57: only ever set on a turn that actually thought -- absent on every older turn and on
    # a turn made with thinking Off, not a key holding ``None``.
    reasoning = _normalize_turn_reasoning(raw.get("reasoning"))
    if reasoning is not None:
        turn["reasoning"] = reasoning
    return turn


def sanitize_slot(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    sid = str(raw.get("id", "") or "").strip()
    if not sid:
        return None
    turns_raw = raw.get("turns")
    turns: list[dict[str, Any]] = []
    if isinstance(turns_raw, list):
        for t in turns_raw[:MAX_TURNS_PER_SLOT]:
            norm = _normalize_turn(t)
            if norm is not None:
                turns.append(norm)
    label = str(raw.get("label", "") or "").strip()[:MAX_LABEL_LEN] or "New chat"
    return {
        "id": sid,
        "label": label,
        "created_at": int(raw.get("created_at") or time.time()),
        "updated_at": int(raw.get("updated_at") or time.time()),
        "origin_app_id": str(raw.get("origin_app_id", "") or "").strip()[:32],
        "origin_app_name": str(raw.get("origin_app_name", "") or "").strip()[:MAX_APP_NAME_LEN],
        "turns": turns,
    }


def heuristic_slot_label(first_question: str, app_name: str = "") -> str:
    """Name a slot after what was ASKED, not after where it was asked.

    The label used to be f"{app_name}: {question}". In the slot row that reads as a column of
    identical prefixes — every chat opened while the same game is running begins with the same
    twenty-odd characters, and the part that actually distinguishes them is pushed past the
    ellipsis. Reported by the maintainer on 2026-08-30 looking at a row of "Deep Rock Galactic:
    Survivor: …" entries; the row window is ~167px, so the game name alone could consume it.

    The game is not lost: it is stored per slot as `origin_app_id`, shown by the context line, and
    carried on every turn. Falling back to the game name only when there is no question keeps a
    slot created before its first Ask from being nameless.
    """
    q = str(first_question or "").strip()
    name = str(app_name or "").strip()
    if q:
        return (q[: MAX_LABEL_LEN - 1] + "…") if len(q) > MAX_LABEL_LEN else q
    if name:
        return name[:MAX_LABEL_LEN]
    return "New chat"


def load_index(settings_dir: str, logger: Any = None) -> dict[str, Any]:
    path = index_path(settings_dir)
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            return _empty_index()
        slots = data.get("slots")
        if not isinstance(slots, list):
            return _empty_index()
        cleaned: list[dict[str, Any]] = []
        for row in slots[:MAX_CHAT_SLOTS]:
            if not isinstance(row, dict):
                continue
            sid = str(row.get("id", "") or "").strip()
            if not sid:
                continue
            cleaned.append(
                {
                    "id": sid,
                    "label": str(row.get("label", "") or "New chat")[:MAX_LABEL_LEN],
                    "created_at": int(row.get("created_at") or 0),
                    "updated_at": int(row.get("updated_at") or 0),
                    "origin_app_id": str(row.get("origin_app_id", "") or "").strip()[:32],
                    "origin_app_name": str(row.get("origin_app_name", "") or "").strip()[
                        :MAX_APP_NAME_LEN
                    ],
                    "turn_count": int(row.get("turn_count") or 0),
                }
            )
        return {"version": SCHEMA_VERSION, "slots": cleaned}
    except FileNotFoundError:
        return _empty_index()
    except Exception as exc:
        if logger is not None:
            logger.warning("load_chat_slots_index: failed %s: %s", path, exc)
        return _empty_index()


def save_index(settings_dir: str, index: dict[str, Any], logger: Any = None) -> None:
    path = index_path(settings_dir)
    os.makedirs(slots_dir(settings_dir), exist_ok=True)
    payload = {"version": SCHEMA_VERSION, "slots": list(index.get("slots") or [])[:MAX_CHAT_SLOTS]}
    tmp = f"{path}.tmp"
    try:
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, sort_keys=True)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    except OSError as exc:
        if logger is not None:
            logger.exception("save_chat_slots_index: failed %s", path)
        raise RuntimeError(f"Failed to save chat slots index: {exc}") from exc


def load_slot(settings_dir: str, slot_id: str, logger: Any = None) -> dict[str, Any] | None:
    path = slot_path(settings_dir, slot_id)
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return sanitize_slot(data)
    except FileNotFoundError:
        return None
    except Exception as exc:
        if logger is not None:
            logger.warning("load_chat_slot: failed %s: %s", path, exc)
        return None


def save_slot(settings_dir: str, slot: dict[str, Any], logger: Any = None) -> dict[str, Any]:
    sanitized = sanitize_slot(slot)
    if sanitized is None:
        raise ValueError("Invalid slot payload.")
    path = slot_path(settings_dir, sanitized["id"])
    os.makedirs(slots_dir(settings_dir), exist_ok=True)
    tmp = f"{path}.tmp"
    try:
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(sanitized, f, indent=2, sort_keys=True)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
        return sanitized
    except OSError as exc:
        if logger is not None:
            logger.exception("save_chat_slot: failed %s", path)
        raise RuntimeError(f"Failed to save chat slot: {exc}") from exc


def _upsert_index_row(index: dict[str, Any], slot: dict[str, Any]) -> dict[str, Any]:
    rows = [r for r in (index.get("slots") or []) if isinstance(r, dict)]
    rows = [r for r in rows if str(r.get("id", "")) != slot["id"]]
    rows.append(
        {
            "id": slot["id"],
            "label": slot["label"],
            "created_at": slot["created_at"],
            "updated_at": slot["updated_at"],
            "origin_app_id": slot.get("origin_app_id", ""),
            "origin_app_name": slot.get("origin_app_name", ""),
            "turn_count": len(slot.get("turns") or []),
        }
    )
    rows.sort(key=lambda r: int(r.get("updated_at") or 0), reverse=True)
    return {"version": SCHEMA_VERSION, "slots": rows[:MAX_CHAT_SLOTS]}


def _prune_oldest_slot(settings_dir: str, index: dict[str, Any], logger: Any = None) -> dict[str, Any]:
    rows = list(index.get("slots") or [])
    if len(rows) < MAX_CHAT_SLOTS:
        return index
    rows.sort(key=lambda r: int(r.get("updated_at") or 0))
    while len(rows) >= MAX_CHAT_SLOTS:
        oldest = rows.pop(0)
        sid = str(oldest.get("id", "") or "")
        if sid:
            try:
                os.remove(slot_path(settings_dir, sid))
            except FileNotFoundError:
                pass
            except OSError as exc:
                if logger is not None:
                    logger.warning("prune_chat_slot: could not remove %s: %s", sid, exc)
    return {"version": SCHEMA_VERSION, "slots": rows}


def create_slot(
    settings_dir: str,
    *,
    label: str = "",
    origin_app_id: str = "",
    first_question: str = "",
    app_name: str = "",
    slot_id: str | None = None,
    logger: Any = None,
) -> dict[str, Any]:
    index = load_index(settings_dir, logger)
    index = _prune_oldest_slot(settings_dir, index, logger)
    now = int(time.time())
    sid = str(slot_id or "").strip() or str(uuid.uuid4())
    resolved_label = (label or "").strip() or heuristic_slot_label(first_question, app_name)
    slot = {
        "id": sid,
        "label": resolved_label[:MAX_LABEL_LEN],
        "created_at": now,
        "updated_at": now,
        "origin_app_id": str(origin_app_id or "").strip()[:32],
        # Already passed in for the label heuristic; kept now rather than discarded, because the
        # slot row shows the game above the title and nothing else records the NAME.
        "origin_app_name": str(app_name or "").strip()[:MAX_APP_NAME_LEN],
        "turns": [],
    }
    save_slot(settings_dir, slot, logger)
    index = _upsert_index_row(index, slot)
    save_index(settings_dir, index, logger)
    return slot


def ensure_slot(
    settings_dir: str,
    slot_id: str,
    *,
    origin_app_id: str = "",
    first_question: str = "",
    app_name: str = "",
    logger: Any = None,
) -> dict[str, Any]:
    sid = _sanitize_slot_id(slot_id)
    existing = load_slot(settings_dir, sid, logger)
    if existing is not None:
        return existing
    return create_slot(
        settings_dir,
        slot_id=sid,
        origin_app_id=origin_app_id,
        first_question=first_question,
        app_name=app_name,
        logger=logger,
    )


def list_slot_summaries(settings_dir: str, logger: Any = None) -> list[dict[str, Any]]:
    index = load_index(settings_dir, logger)
    rows = list(index.get("slots") or [])
    rows.sort(key=lambda r: int(r.get("updated_at") or 0), reverse=True)
    return rows


def delete_slot(settings_dir: str, slot_id: str, logger: Any = None) -> bool:
    sid = _sanitize_slot_id(slot_id)
    try:
        os.remove(slot_path(settings_dir, sid))
    except FileNotFoundError:
        return False
    index = load_index(settings_dir, logger)
    rows = [r for r in (index.get("slots") or []) if str(r.get("id", "")) != sid]
    save_index(settings_dir, {"version": SCHEMA_VERSION, "slots": rows}, logger)
    return True


def append_turn(
    settings_dir: str,
    slot_id: str,
    *,
    role: str,
    text: str,
    request_id: int | None = None,
    attachment_refs: list[dict[str, str]] | None = None,
    transparency: dict[str, Any] | None = None,
    app_id: str = "",
    app_name: str = "",
    asked_entity: str = "",
    display_text: str = "",
    reasoning: dict[str, Any] | None = None,
    label: str | None = None,
    logger: Any = None,
) -> dict[str, Any] | None:
    slot = load_slot(settings_dir, slot_id, logger)
    if slot is None:
        return None
    turn = _normalize_turn(
        {
            "id": str(uuid.uuid4()),
            "role": role,
            "text": text,
            "request_id": request_id,
            "attachment_refs": attachment_refs or [],
            "transparency": transparency,
            "app_id": app_id,
            "app_name": app_name,
            "asked_entity": asked_entity,
            "display_text": display_text,
            "reasoning": reasoning,
            "created_at": int(time.time()),
        }
    )
    if turn is None:
        return None
    turns = list(slot.get("turns") or [])
    turns.append(turn)
    slot["turns"] = turns[-MAX_TURNS_PER_SLOT:]
    slot["updated_at"] = int(time.time())
    if label:
        slot["label"] = str(label)[:MAX_LABEL_LEN]
    elif role == "user" and len(turns) == 1 and slot.get("label") in ("", "New chat"):
        slot["label"] = heuristic_slot_label(text)
    saved = save_slot(settings_dir, slot, logger)
    index = load_index(settings_dir, logger)
    index = _upsert_index_row(index, saved)
    save_index(settings_dir, index, logger)
    return saved


def update_slot_label(
    settings_dir: str, slot_id: str, label: str, logger: Any = None
) -> dict[str, Any] | None:
    slot = load_slot(settings_dir, slot_id, logger)
    if slot is None:
        return None
    slot["label"] = str(label or "").strip()[:MAX_LABEL_LEN] or slot.get("label", "New chat")
    slot["updated_at"] = int(time.time())
    saved = save_slot(settings_dir, slot, logger)
    index = load_index(settings_dir, logger)
    index = _upsert_index_row(index, saved)
    save_index(settings_dir, index, logger)
    return saved


def slot_to_rpc_payload(slot: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": slot.get("id", ""),
        "label": slot.get("label", ""),
        "created_at": slot.get("created_at"),
        "updated_at": slot.get("updated_at"),
        "origin_app_id": slot.get("origin_app_id", ""),
        "origin_app_name": slot.get("origin_app_name", ""),
        "turns": slot.get("turns") or [],
    }


def wipe_all_slots(settings_dir: str, logger: Any = None) -> None:
    sdir = slots_dir(settings_dir)
    if os.path.isdir(sdir):
        for name in os.listdir(sdir):
            fp = os.path.join(sdir, name)
            try:
                if os.path.isfile(fp):
                    os.remove(fp)
            except OSError as exc:
                if logger is not None:
                    logger.warning("wipe_all_slots: could not remove %s: %s", fp, exc)
    save_index(settings_dir, _empty_index(), logger)
