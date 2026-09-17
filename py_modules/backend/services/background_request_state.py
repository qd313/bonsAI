"""Title: The shape of "how is my Ask coming along"

Purpose: An Ask that is still thinking runs in the background while the screen checks
back roughly once a second asking "done yet?". This file is every shape that check can be
answered with: brand new and idle, just accepted and about to start, finished because a
quick built-in command answered it directly, and the small in-progress snapshot -- the
partial reply and the "thinking..." line -- that gets filled in while the AI is still
replying.
Used for: Every place the plugin's front-door file starts, finishes, or resets the status
of a background Ask.
Solves: Without one shared definition, each of those places would build this status by
hand, and it is easy for two hand-built copies to end up with slightly different fields --
one missing something the screen's polling code expects to find.
Does not: Hold the lock that guards this status, the task handle for the AI call itself,
or decide how a new snapshot gets merged into the status already published -- those stay
with the plugin's own class.
"""

from typing import Any, Optional

# Sentinel for "do not add this key at all", distinct from an explicit None value.
# `shortcut_setup` is absent from most states and the frontend distinguishes absent from null.
OMIT = object()


def new_background_state() -> dict[str, Any]:
    """The idle default. Every other state in this module carries exactly these keys."""
    return {
        "status": "idle",
        "request_id": None,
        "question": "",
        "app_id": "",
        # Display name of the running game, alongside "app_id" — needed for a title reachable
        # only by name (an emulator shortcut with no Steam AppID, plan 54 gap 1).
        "app_name": "",
        "app_context": "none",
        "success": None,
        "response": "",
        "applied": None,
        "elapsed_seconds": 0,
        "error": None,
        "started_at": None,
        "completed_at": None,
        "strategy_guide_branches": None,
        "model_policy_disclosure": None,
        "preset_carousel_inject": None,
        "partial_response": None,
        "streaming": False,
        "thinking_summary": None,
        "thinking_unsupported": False,
        "model": None,
        # Plan 57: the model's own thinking. `reasoning_partial`/`reasoning_seconds` are read
        # while an answer is pending (live, newest 600 characters); `reasoning_text` (capped at
        # 6,000 characters) and `reasoning_tokens` (an estimate) join `reasoning_seconds` once the
        # answer is done. All stay at their "nothing to show" default on a turn with no thinking
        # -- thinking Off, or a model that cannot think.
        "reasoning_partial": None,
        "reasoning_seconds": None,
        "reasoning_text": "",
        "reasoning_tokens": 0,
        # Which named chat slot this request belongs to, so a poll can tell whether the
        # tokens it is about to paint are the slot the user is currently looking at.
        # It rides the state dict rather than being looked up per poll, because
        # `_chat_slot_by_request` is popped at terminal — before the frontend polls it.
        "chat_slot_id": None,
        # Plan 58 phase 1: the notes the search actually attached to this turn, in each note's
        # own words -- filled in by game_ai_request.py from what retrieval found, never from
        # anything the model wrote. Empty on every turn with nothing attached. Defaulted here so
        # a poll response always carries the key, matching the live snapshot's own field below.
        "kb_attached_notes": [],
    }


def pending_background_state(
    *,
    request_id: int,
    question: str,
    app_id: str,
    app_context: str,
    started_at: float,
    response: str = "Thinking...",
    chat_slot_id: Optional[str] = None,
    app_name: str = "",
) -> dict[str, Any]:
    """State published when an Ask is admitted and a background task is about to run."""
    state = new_background_state()
    state.update(
        {
            "status": "pending",
            "request_id": request_id,
            "question": question,
            "app_id": app_id,
            "app_name": app_name,
            "app_context": app_context,
            "response": response,
            "started_at": started_at,
            "chat_slot_id": chat_slot_id,
        }
    )
    return state


def completed_local_command_state(
    *,
    request_id: int,
    question: str,
    app_id: str,
    app_context: str,
    response: str,
    now: float,
    shortcut_setup: Any = OMIT,
    app_name: str = "",
) -> dict[str, Any]:
    """Terminal state for a local keyword branch (sanitizer / shortcut / VAC).

    These never spawn a background task, so they publish `completed` directly. `started_at` and
    `completed_at` are both `now` because no work was awaited.
    """
    state = new_background_state()
    state.update(
        {
            "status": "completed",
            "request_id": request_id,
            "question": question,
            "app_id": app_id,
            "app_name": app_name,
            "app_context": app_context,
            "success": True,
            "response": response,
            "elapsed_seconds": 0.0,
            "started_at": now,
            "completed_at": now,
        }
    )
    if shortcut_setup is not OMIT:
        state["shortcut_setup"] = shortcut_setup
    return state


def new_partial_stream_snapshot(request_id: Optional[int]) -> dict[str, Any]:
    """Per-request streaming scratch state, written from the executor thread under a lock.

    `request_id=None` is the cleared form — it matches no live request, so
    `_merge_partial_into_background_status` will not graft it onto any status.
    """
    return {
        "request_id": request_id,
        "partial_response": None,
        # Plan 54 gap 2: the named thing, published before the model call so the streaming
        # bubble can open its spoiler box from the first word instead of waiting for completion.
        "asked_entity": "",
        "thinking_summary": None,
        # When thinking_summary last *changed*, not when it was last written. Repeated identical
        # publishes must not reset it, because this is what tells the read path how long one line
        # has been sitting on screen unchanged.
        "thinking_summary_monotonic": 0.0,
        # Stashed at accept so the read path can escalate a stale line in the right voice without
        # loading settings on every poll.
        "thinking_tone": "witty",
        "streaming": False,
        "last_flush_monotonic": 0.0,
        # Plan 57: the model's own thinking, live. `reasoning_partial` is the newest 600
        # characters of it so far (null before the first thinking chunk); `reasoning_seconds` is
        # whole seconds since that first chunk, frozen the moment the first answer chunk arrives
        # so it stops changing once the fold appears. Both stay null on a turn with no thinking.
        "reasoning_partial": None,
        "reasoning_seconds": None,
        # Plan 58 phase 1: same idea as `asked_entity` above -- published before the model call
        # runs so the "From the notes" block can render on the live streaming bubble from the
        # first word, not only once the reply finishes. See game_ai_request.py's note on why the
        # write happens directly on this snapshot rather than through a named Plugin method, and
        # on the one line still needed in main.py's own merge step to carry this into a poll.
        "kb_attached_notes": [],
    }
