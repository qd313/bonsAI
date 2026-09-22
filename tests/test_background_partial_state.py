"""Unit tests for background Ask partial_response streaming state (main.Plugin)."""

import sys
import types
import unittest

if "fcntl" not in sys.modules:
    _fcntl = types.ModuleType("fcntl")
    _fcntl.LOCK_EX = 2
    _fcntl.LOCK_NB = 4
    _fcntl.LOCK_UN = 8

    def _noop_flock(*_a, **_k):
        return False

    _fcntl.flock = _noop_flock
    sys.modules["fcntl"] = _fcntl

if "decky" not in sys.modules:
    _decky = types.ModuleType("decky")
    _decky.DECKY_PLUGIN_SETTINGS_DIR = "/tmp"
    _decky.logger = types.SimpleNamespace(
        info=lambda *a, **k: None,
        warning=lambda *a, **k: None,
        error=lambda *a, **k: None,
        exception=lambda *a, **k: None,
    )
    sys.modules["decky"] = _decky

from backend.services.game_ai_request import _publish_kb_attached_notes_live  # noqa: E402
from main import Plugin  # noqa: E402


class BackgroundPartialStateTests(unittest.TestCase):
    def setUp(self) -> None:
        self.plugin = Plugin()

    def test_stale_request_id_ignored(self) -> None:
        self.plugin._reset_partial_stream_snapshot(1)
        self.plugin._update_partial_response(1, "Hello", False)
        self.plugin._update_partial_response(2, "Stale", False)
        with self.plugin._partial_response_lock:
            self.assertEqual(self.plugin._partial_stream_snapshot["partial_response"], "Hello")

    def test_done_clears_streaming_flag(self) -> None:
        self.plugin._reset_partial_stream_snapshot(3)
        self.plugin._update_partial_response(3, "Partial", False)
        self.plugin._update_partial_response(3, "Final", True)
        with self.plugin._partial_response_lock:
            snap = self.plugin._partial_stream_snapshot
            self.assertEqual(snap["partial_response"], "Final")
            self.assertFalse(snap["streaming"])

    def test_streaming_true_while_visible_text_empty(self) -> None:
        self.plugin._reset_partial_stream_snapshot(5)
        self.plugin._update_partial_response(5, "", False)
        with self.plugin._partial_response_lock:
            snap = self.plugin._partial_stream_snapshot
            self.assertTrue(snap["streaming"])
            self.assertIsNone(snap.get("partial_response"))

    def test_partial_response_throttles_rapid_growth(self) -> None:
        self.plugin._reset_partial_stream_snapshot(6)
        self.plugin._update_partial_response(6, "Hello", False)
        self.plugin._update_partial_response(6, "Hello world", False)
        with self.plugin._partial_response_lock:
            snap = self.plugin._partial_stream_snapshot
            self.assertEqual(snap["partial_response"], "Hello")

    def test_partial_response_shrink_bypasses_throttle(self) -> None:
        self.plugin._reset_partial_stream_snapshot(6)
        self.plugin._update_partial_response(6, "A B Continuing…", False)
        self.plugin._update_partial_response(6, "A B", False)
        with self.plugin._partial_response_lock:
            snap = self.plugin._partial_stream_snapshot
            self.assertEqual(snap["partial_response"], "A B")

    def test_merge_partial_into_pending_status(self) -> None:
        self.plugin._background_state = {
            "status": "pending",
            "request_id": 7,
            "response": "Thinking...",
            "started_at": 0.0,
        }
        self.plugin._reset_partial_stream_snapshot(7)
        self.plugin._update_partial_response(7, "Growing reply", False)
        merged = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        self.assertTrue(merged.get("streaming"))
        self.assertEqual(merged.get("partial_response"), "Growing reply")

    def test_merge_preserves_chat_slot_id_while_streaming(self) -> None:
        """Plan 63 bug 2 ("a chat that is still writing does not look busy from another chat"):
        the slot row's dot reads ``chat_slot_id`` off every poll, not just the terminal one. This
        repo has already been bitten once by a per-turn fact that only reached the screen once an
        answer completed (``kb_attached_notes``, plan 58 phase 1) because it lived only on the
        partial-stream snapshot and nothing copied it across on a pending poll.

        ``chat_slot_id`` does not have that shape: it is set on ``_background_state`` itself at
        accept (main.py:2643, ``pending_background_state(chat_slot_id=...)``), and
        ``_merge_partial_into_background_status`` starts from ``dict(state)`` and only overlays
        partial-only fields — it never touches ``chat_slot_id`` either way. So it should already
        ride every merged poll, pending or terminal, untouched. This locks that in.
        """
        self.plugin._background_state = {
            "status": "pending",
            "request_id": 13,
            "response": "Thinking...",
            "started_at": 0.0,
            "chat_slot_id": "slot-a",
        }
        self.plugin._reset_partial_stream_snapshot(13)
        self.plugin._update_partial_response(13, "Growing reply", False)
        merged = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        self.assertTrue(merged.get("streaming"))
        self.assertEqual(merged.get("chat_slot_id"), "slot-a")

    def test_thinking_only_delta_without_partial(self) -> None:
        self.plugin._background_state = {
            "status": "pending",
            "request_id": 9,
            "response": "Thinking...",
            "started_at": 0.0,
        }
        self.plugin._reset_partial_stream_snapshot(9)
        self.plugin._update_partial_response(
            9,
            "Should not appear",
            False,
            "Checking Proton log",
            update_partial=False,
        )
        with self.plugin._partial_response_lock:
            snap = self.plugin._partial_stream_snapshot
            self.assertIsNone(snap.get("partial_response"))
            self.assertEqual(snap.get("thinking_summary"), "Checking Proton log")
        merged = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        self.assertEqual(merged.get("thinking_summary"), "Checking Proton log")
        self.assertIsNone(merged.get("partial_response"))

    def test_merge_thinking_fallback_when_no_model_tag(self) -> None:
        import time

        self.plugin._background_state = {
            "status": "pending",
            "request_id": 8,
            "response": "Thinking...",
            "started_at": time.time() - 10,
        }
        self.plugin._reset_partial_stream_snapshot(8)
        merged = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        summary = merged.get("thinking_summary") or ""
        self.assertIn("still thinking", summary.lower())

    def test_publish_thinking_phase_key(self) -> None:
        self.plugin._reset_partial_stream_snapshot(11)
        self.plugin._publish_thinking_phase_key(11, "starting")
        merged = self.plugin._merge_partial_into_background_status(
            {"status": "pending", "request_id": 11, "response": "Thinking...", "started_at": 0.0}
        )
        self.assertEqual(merged.get("thinking_summary"), "Starting…")

    def test_publish_thinking_phase_key_woven(self) -> None:
        self.plugin._reset_partial_stream_snapshot(13)
        self.plugin._publish_thinking_phase_key(
            13,
            "proton_logs",
            app_name="Elden Ring",
            question="why crash on launch",
        )
        merged = self.plugin._merge_partial_into_background_status(
            {"status": "pending", "request_id": 13, "response": "Thinking...", "started_at": 0.0}
        )
        summary = merged.get("thinking_summary") or ""
        self.assertIn("crash", summary.lower())
        self.assertIn("Elden Ring", summary)

    def test_compose_opening_blurb_weaves_question_and_game(self) -> None:
        blurb, meta = self.plugin._compose_opening_thinking_blurb(
            21,
            "why does the game crash on launch",
            app_name="Elden Ring",
            ask_mode="speed",
            settings={},
        )
        self.assertTrue(blurb.strip())
        self.assertIsNotNone(meta)
        self.assertIsNone(meta.resolved_preset_id)

    def test_compose_opening_blurb_matches_what_the_starting_phase_would_render(self) -> None:
        """The client renders this string; the backend must not disagree with itself later.

        format_thinking_phase("starting", ...) delegates to the same composer, so a divergence
        here would mean the opener returned by start_background_game_ai differs from the one any
        later "starting" publish would produce for the same Ask.
        """
        from backend.services.bonsai_stream_tags import format_thinking_phase

        for rid in (1, 2, 7, 40):
            blurb, _meta = self.plugin._compose_opening_thinking_blurb(
                rid,
                "why is my fps low",
                app_name="Elden Ring",
                ask_mode="speed",
                settings={},
            )
            self.assertEqual(
                blurb,
                format_thinking_phase(
                    "starting",
                    question="why is my fps low",
                    app_name="Elden Ring",
                    request_id=rid,
                ),
            )

    def test_opening_blurb_is_published_before_the_task_starts(self) -> None:
        """A poll landing before any prep phase must already read the opener, not a fallback."""
        self.plugin._reset_partial_stream_snapshot(23)
        blurb, _meta = self.plugin._compose_opening_thinking_blurb(
            23,
            "why crash on launch",
            app_name="Elden Ring",
            settings={},
        )
        self.plugin._publish_thinking_phase(23, blurb)
        merged = self.plugin._merge_partial_into_background_status(
            {"status": "pending", "request_id": 23, "response": "Thinking...", "started_at": 0.0}
        )
        self.assertEqual(merged.get("thinking_summary"), blurb)

    def test_compose_opening_blurb_tone_follows_a_deadpan_character(self) -> None:
        """The returned meta is what the request task reuses, so tone and voice cannot diverge.

        ai_character_random defaults to *on*, so it is pinned off here -- and that default is
        exactly why the meta is threaded to the task rather than resolved twice: two calls would
        roll two different characters and put a deadpan blurb in front of a witty reply.
        """
        deadpan_settings = {
            "ai_character_enabled": True,
            "ai_character_random": False,
            "ai_character_preset_id": "portal_glados",
        }
        differed = False
        for rid in range(1, 13):
            witty, witty_meta = self.plugin._compose_opening_thinking_blurb(
                rid, "why crash on launch", app_name="Elden Ring", settings={}
            )
            deadpan, meta = self.plugin._compose_opening_thinking_blurb(
                rid, "why crash on launch", app_name="Elden Ring", settings=deadpan_settings
            )
            self.assertIsNone(witty_meta.resolved_preset_id)
            self.assertEqual(meta.resolved_preset_id, "portal_glados")
            differed = differed or witty != deadpan
        self.assertTrue(differed, "deadpan preset produced identical copy at every request id")

    def test_merge_uses_fallback_after_prep_without_sticky_connect(self) -> None:
        """Prep phases publish thinking; Ollama wait without publish uses elapsed fallback."""
        import time

        self.plugin._background_state = {
            "status": "pending",
            "request_id": 12,
            "response": "Thinking...",
            "started_at": time.time() - 3,
        }
        self.plugin._reset_partial_stream_snapshot(12)
        self.plugin._publish_thinking_phase_key(12, "building_context", app_name="Zelda")
        merged_early = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        early_summary = merged_early.get("thinking_summary") or ""
        self.assertIn("zelda", early_summary.lower())
        with self.plugin._partial_response_lock:
            self.plugin._partial_stream_snapshot["thinking_summary"] = None
        merged_late = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        late_summary = merged_late.get("thinking_summary") or ""
        self.assertTrue(
            "hard" in late_summary.lower() or "passable" in late_summary.lower(),
        )

    def test_repeated_identical_publishes_do_not_reset_the_stale_clock(self) -> None:
        """A phase that re-publishes the same string must not look perpetually fresh.

        Without this the escalation never fires: every delta re-stamps the clock and the line is
        judged to have just changed, no matter how long it has actually been on screen.
        """
        import time as _time

        self.plugin._reset_partial_stream_snapshot(41)
        self.plugin._publish_thinking_phase(41, "Model's warming up. Hang in there…")
        with self.plugin._partial_response_lock:
            first = self.plugin._partial_stream_snapshot["thinking_summary_monotonic"]
        self.assertGreater(first, 0.0)

        # Long enough to clear the Windows monotonic clock granularity (~16ms), so a stamp that
        # did move is unambiguous.
        _time.sleep(0.05)
        self.plugin._publish_thinking_phase(41, "Model's warming up. Hang in there…")
        with self.plugin._partial_response_lock:
            self.assertEqual(self.plugin._partial_stream_snapshot["thinking_summary_monotonic"], first)

        _time.sleep(0.05)
        self.plugin._publish_thinking_phase(41, "Writing your answer…")
        with self.plugin._partial_response_lock:
            self.assertGreater(
                self.plugin._partial_stream_snapshot["thinking_summary_monotonic"], first
            )

    def test_a_line_that_goes_quiet_is_escalated_on_later_polls(self) -> None:
        """The reported bug, end to end through the read path the client actually polls."""
        import time as _time

        self.plugin._background_state = {
            "status": "pending",
            "request_id": 42,
            "response": "Thinking...",
            "started_at": _time.time(),
        }
        self.plugin._reset_partial_stream_snapshot(42)
        stuck = "Model's warming up for “how well does this run”. Hang in there…"
        self.plugin._publish_thinking_phase(42, stuck)

        fresh = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        self.assertEqual(fresh.get("thinking_summary"), stuck)

        # Backdate the stamp instead of sleeping: the windows are seconds long. The first sample
        # is past the widest possible first window (13s) so this does not depend on which schedule
        # request id 42 happens to draw.
        seen = set()
        for aged in (14.0, 25.0, 34.0, 47.0, 61.0):
            with self.plugin._partial_response_lock:
                self.plugin._partial_stream_snapshot["thinking_summary_monotonic"] = (
                    _time.monotonic() - aged
                )
            merged = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
            summary = merged.get("thinking_summary") or ""
            self.assertTrue(summary.strip())
            self.assertNotEqual(summary, stuck)
            seen.add(summary)
        self.assertGreaterEqual(len(seen), 3, msg=seen)

    def test_a_model_tag_arriving_resets_the_escalation(self) -> None:
        """Real news outranks a duration line, and restarts the clock."""
        import time as _time

        self.plugin._background_state = {
            "status": "pending",
            "request_id": 43,
            "response": "Thinking...",
            "started_at": _time.time(),
        }
        self.plugin._reset_partial_stream_snapshot(43)
        self.plugin._publish_thinking_phase(43, "Model's warming up. Hang in there…")
        with self.plugin._partial_response_lock:
            self.plugin._partial_stream_snapshot["thinking_summary_monotonic"] = (
                _time.monotonic() - 40.0
            )
        self.assertNotEqual(
            self.plugin._merge_partial_into_background_status(self.plugin._background_state).get(
                "thinking_summary"
            ),
            "Checking your GPU driver",
        )

        self.plugin._publish_thinking_phase(43, "Checking your GPU driver")
        merged = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        self.assertEqual(merged.get("thinking_summary"), "Checking your GPU driver")

    def test_merge_omits_partial_when_not_pending(self) -> None:
        self.plugin._background_state = {"status": "completed", "request_id": 7}
        self.plugin._reset_partial_stream_snapshot(7)
        self.plugin._update_partial_response(7, "ignored", False)
        merged = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        self.assertFalse(merged.get("streaming"))
        self.assertIsNone(merged.get("partial_response"))

    def test_publish_asked_entity_reaches_a_pending_merge(self) -> None:
        """Plan 54 gap 2: the named thing must reach the live poll before completion."""
        self.plugin._background_state = {
            "status": "pending",
            "request_id": 7,
            "response": "Thinking...",
            "started_at": 0.0,
        }
        self.plugin._reset_partial_stream_snapshot(7)
        self.plugin._publish_asked_entity(7, "Wheatley")
        merged = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        self.assertEqual(merged.get("strategy_spoiler_asked_entity"), "Wheatley")

    def test_publish_asked_entity_for_a_stale_request_id_is_ignored(self) -> None:
        self.plugin._background_state = {
            "status": "pending",
            "request_id": 7,
            "response": "Thinking...",
            "started_at": 0.0,
        }
        self.plugin._reset_partial_stream_snapshot(7)
        self.plugin._publish_asked_entity(8, "Wrong request")
        merged = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        self.assertNotIn("strategy_spoiler_asked_entity", merged)

    def test_publish_asked_entity_not_grafted_onto_a_completed_state(self) -> None:
        self.plugin._background_state = {"status": "completed", "request_id": 7}
        self.plugin._reset_partial_stream_snapshot(7)
        self.plugin._publish_asked_entity(7, "Wheatley")
        merged = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        self.assertNotIn("strategy_spoiler_asked_entity", merged)

    def test_reasoning_reaches_a_pending_merge_before_any_answer_text(self) -> None:
        """Plan 57: a thinking chunk must reach the poll even while the visible answer is empty.

        This is the same lesson plan 54 needed a fourth commit for -- a field that only lands at
        completion is useless for a live display. Passing "" as the visible text here matches what
        a thinking-only delta actually looks like on the wire before any answer token exists.
        """
        self.plugin._background_state = {
            "status": "pending",
            "request_id": 50,
            "response": "Thinking...",
            "started_at": 0.0,
        }
        self.plugin._reset_partial_stream_snapshot(50)
        self.plugin._update_partial_response(
            50, "", False, reasoning_partial="Let me think about this…", reasoning_seconds=2
        )
        merged = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        self.assertEqual(merged.get("reasoning_partial"), "Let me think about this…")
        self.assertEqual(merged.get("reasoning_seconds"), 2)
        # The composed-phrase question text is still absent -- only the live thinking arrived.
        self.assertIsNone(merged.get("partial_response"))

    def test_reasoning_seconds_freezes_once_reported_frozen(self) -> None:
        """The caller (ollama_service._publish_partial) works out the freeze; this just proves the
        frozen number survives a later delta unchanged, the way the folded line needs it to.
        """
        self.plugin._background_state = {
            "status": "pending",
            "request_id": 51,
            "response": "Thinking...",
            "started_at": 0.0,
        }
        self.plugin._reset_partial_stream_snapshot(51)
        self.plugin._update_partial_response(
            51, "", False, reasoning_partial="thinking…", reasoning_seconds=3
        )
        self.plugin._update_partial_response(
            51, "Here", False, reasoning_partial="thinking…", reasoning_seconds=3
        )
        merged = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        self.assertEqual(merged.get("reasoning_seconds"), 3)

    def test_a_composed_phase_publish_does_not_blank_out_real_reasoning(self) -> None:
        """`_publish_thinking_phase` (the "waking up" / "still thinking" phrases) never passes
        reasoning kwargs at all -- it must not stomp reasoning a streaming delta already wrote.
        """
        self.plugin._background_state = {
            "status": "pending",
            "request_id": 52,
            "response": "Thinking...",
            "started_at": 0.0,
        }
        self.plugin._reset_partial_stream_snapshot(52)
        self.plugin._update_partial_response(
            52, "", False, reasoning_partial="Considering the boss's attacks…", reasoning_seconds=1
        )
        self.plugin._publish_thinking_phase(52, "Still thinking…")
        with self.plugin._partial_response_lock:
            snap = self.plugin._partial_stream_snapshot
            self.assertEqual(snap.get("reasoning_partial"), "Considering the boss's attacks…")
            self.assertEqual(snap.get("reasoning_seconds"), 1)

    def test_reasoning_is_null_on_a_fresh_snapshot(self) -> None:
        """Thinking Off, or a model that cannot think: nothing to show, not an empty string."""
        self.plugin._background_state = {
            "status": "pending",
            "request_id": 53,
            "response": "Thinking...",
            "started_at": 0.0,
        }
        self.plugin._reset_partial_stream_snapshot(53)
        self.plugin._update_partial_response(53, "An ordinary answer", False)
        merged = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        self.assertIsNone(merged.get("reasoning_partial"))
        self.assertIsNone(merged.get("reasoning_seconds"))

    def test_kb_attached_notes_reaches_a_pending_merge(self) -> None:
        """Plan 58 phase 1: the "From the notes" block's own material must reach the live poll
        before the reply finishes -- the same lesson plan 54 needed a fourth commit for, proven
        above for the named-thing gap. `_publish_kb_attached_notes_live` is game_ai_request.py's
        own write into this same snapshot; this is the one line in `_merge_partial_into_
        background_status` that was missing to carry it out again."""
        self.plugin._background_state = {
            "status": "pending",
            "request_id": 7,
            "response": "Thinking...",
            "started_at": 0.0,
        }
        self.plugin._reset_partial_stream_snapshot(7)
        note = {"name": "Broken Vessel", "card": "The infected husk shaped like you."}
        _publish_kb_attached_notes_live(self.plugin, 7, [note])
        merged = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        self.assertEqual(merged.get("kb_attached_notes"), [note])

    def test_kb_attached_notes_for_a_stale_request_id_is_ignored(self) -> None:
        self.plugin._background_state = {
            "status": "pending",
            "request_id": 7,
            "response": "Thinking...",
            "started_at": 0.0,
        }
        self.plugin._reset_partial_stream_snapshot(7)
        _publish_kb_attached_notes_live(self.plugin, 8, [{"name": "Wrong request"}])
        merged = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        self.assertEqual(merged.get("kb_attached_notes"), [])

    def test_kb_attached_notes_not_grafted_onto_a_completed_state(self) -> None:
        self.plugin._background_state = {"status": "completed", "request_id": 7}
        self.plugin._reset_partial_stream_snapshot(7)
        _publish_kb_attached_notes_live(self.plugin, 7, [{"name": "Broken Vessel"}])
        merged = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        # Not "pending", so the merge's else-branch runs and never touches this key -- whatever
        # the completed state already carried survives untouched (here, nothing at all).
        self.assertNotIn("kb_attached_notes", merged)

    def test_kb_attached_notes_defaults_to_empty_list_on_a_fresh_snapshot(self) -> None:
        self.plugin._background_state = {
            "status": "pending",
            "request_id": 53,
            "response": "Thinking...",
            "started_at": 0.0,
        }
        self.plugin._reset_partial_stream_snapshot(53)
        merged = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        self.assertEqual(merged.get("kb_attached_notes"), [])

    def test_publish_asked_entity_empty_leaves_the_key_absent(self) -> None:
        self.plugin._background_state = {
            "status": "pending",
            "request_id": 7,
            "response": "Thinking...",
            "started_at": 0.0,
        }
        self.plugin._reset_partial_stream_snapshot(7)
        self.plugin._publish_asked_entity(7, "")
        merged = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        self.assertNotIn("strategy_spoiler_asked_entity", merged)


if __name__ == "__main__":
    unittest.main()
