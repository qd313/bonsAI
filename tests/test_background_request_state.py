"""Unit tests for the background-request state shape (backend.services.background_request_state).

The point of this module is that four hand-written copies of one dict became one declaration.
These tests assert the property that made the duplication a latent bug: **every state carries the
same keys**, whichever path built it. A future edit that adds a key to one constructor and not the
others fails here rather than on-device.
"""

import unittest

from backend.services.background_request_state import (
    OMIT,
    completed_local_command_state,
    new_background_state,
    new_partial_stream_snapshot,
    pending_background_state,
)

# The 26 keys the status poller and the frontend expect on every background state.
EXPECTED_KEYS = {
    "status",
    "request_id",
    "question",
    "app_id",
    "app_name",
    "app_context",
    "success",
    "response",
    "applied",
    "elapsed_seconds",
    "error",
    "started_at",
    "completed_at",
    "strategy_guide_branches",
    "model_policy_disclosure",
    "preset_carousel_inject",
    "partial_response",
    "streaming",
    "thinking_summary",
    "thinking_unsupported",
    "model",
    "chat_slot_id",
    # Plan 57: the model's own thinking, live (`reasoning_partial`/`reasoning_seconds`) and once
    # the answer is done (`reasoning_text`/`reasoning_seconds`/`reasoning_tokens`).
    "reasoning_partial",
    "reasoning_seconds",
    "reasoning_text",
    "reasoning_tokens",
    # Plan 58 phase 1: the notes the search attached to this turn, in their own words.
    "kb_attached_notes",
    # Plan 68 step 4: "ask" for an ordinary question, "sum_up" for the Session tab's own
    # *Sum up this chat* button running as a job of its own through the same slot.
    "kind",
}


class TestBackgroundStateShape(unittest.TestCase):
    def test_idle_default_has_the_expected_keys(self):
        self.assertEqual(set(new_background_state()), EXPECTED_KEYS)

    def test_idle_default_values(self):
        state = new_background_state()
        self.assertEqual(state["status"], "idle")
        self.assertIsNone(state["request_id"])
        self.assertEqual(state["question"], "")
        self.assertEqual(state["app_id"], "")
        self.assertEqual(state["app_context"], "none")
        self.assertIsNone(state["success"])
        self.assertEqual(state["response"], "")
        self.assertIsNone(state["applied"])
        self.assertEqual(state["elapsed_seconds"], 0)
        self.assertIsNone(state["error"])
        self.assertIsNone(state["started_at"])
        self.assertIsNone(state["completed_at"])
        self.assertIsNone(state["strategy_guide_branches"])
        self.assertIsNone(state["model_policy_disclosure"])
        self.assertIsNone(state["preset_carousel_inject"])
        self.assertIsNone(state["partial_response"])
        self.assertIs(state["streaming"], False)
        self.assertIsNone(state["thinking_summary"])
        self.assertIsNone(state["chat_slot_id"])
        self.assertIsNone(state["reasoning_partial"])
        self.assertIsNone(state["reasoning_seconds"])
        self.assertEqual(state["reasoning_text"], "")
        self.assertEqual(state["reasoning_tokens"], 0)
        self.assertEqual(state["kb_attached_notes"], [])
        self.assertEqual(state["kind"], "ask")

    def test_every_constructor_agrees_on_the_key_set(self):
        """The regression this module exists to prevent.

        Before the extraction the local-command literal omitted partial_response, streaming and
        thinking_summary. It was survivable only because the merge step writes all three before the
        state reaches the frontend; a reader that skipped the merge got a KeyError shape that
        differed by code path.
        """
        pending = pending_background_state(
            request_id=1,
            question="q",
            app_id="7",
            app_context="active",
            started_at=100.0,
        )
        completed = completed_local_command_state(
            request_id=2,
            question="q",
            app_id="7",
            app_context="active",
            response="done",
            now=100.0,
        )
        self.assertEqual(set(pending), EXPECTED_KEYS)
        self.assertEqual(set(completed), EXPECTED_KEYS)
        self.assertEqual(set(pending), set(new_background_state()))

    def test_callers_cannot_mutate_a_shared_default(self):
        first = new_background_state()
        first["status"] = "mutated"
        self.assertEqual(new_background_state()["status"], "idle")

    def test_kb_attached_notes_list_is_not_shared_between_calls(self):
        """A caller appending to one state's list must not leak into the next state built."""
        first = new_background_state()
        first["kb_attached_notes"].append({"name": "Some note"})
        self.assertEqual(new_background_state()["kb_attached_notes"], [])


class TestPendingState(unittest.TestCase):
    def test_pending_fields(self):
        state = pending_background_state(
            request_id=42,
            question="how do I beat this boss",
            app_id="2321470",
            app_context="active",
            started_at=1234.5,
        )
        self.assertEqual(state["status"], "pending")
        self.assertEqual(state["request_id"], 42)
        self.assertEqual(state["question"], "how do I beat this boss")
        self.assertEqual(state["app_id"], "2321470")
        self.assertEqual(state["app_context"], "active")
        self.assertEqual(state["started_at"], 1234.5)
        self.assertIsNone(state["completed_at"])
        self.assertIsNone(state["success"])
        self.assertIsNone(state["chat_slot_id"])

    def test_pending_carries_the_chat_slot_id(self):
        """The id has to ride the state dict, not `_chat_slot_by_request`.

        That map is popped when a request finishes, before the frontend polls the terminal
        status — exactly when the unread-dot logic needs to know which slot the answer
        belongs to. Riding the state means the terminal write's `**self._background_state`
        spread carries it through for free.
        """
        state = pending_background_state(
            request_id=7,
            question="q",
            app_id="7",
            app_context="active",
            started_at=1.0,
            chat_slot_id="abc",
        )
        self.assertEqual(state["chat_slot_id"], "abc")

    def test_pending_response_placeholder_is_the_thinking_string(self):
        """The frontend treats this exact string as a placeholder, not as an answer."""
        state = pending_background_state(
            request_id=1, question="q", app_id="", app_context="none", started_at=0.0
        )
        self.assertEqual(state["response"], "Thinking...")

    def test_pending_streaming_fields_start_empty(self):
        state = pending_background_state(
            request_id=1, question="q", app_id="", app_context="none", started_at=0.0
        )
        self.assertIsNone(state["partial_response"])
        self.assertIs(state["streaming"], False)
        self.assertIsNone(state["thinking_summary"])

    def test_pending_kind_defaults_to_ask(self):
        """An ordinary Ask never names a kind -- it must still say "ask", the same default the
        idle state carries, so every existing call site keeps saying so for free."""
        state = pending_background_state(
            request_id=1, question="q", app_id="", app_context="none", started_at=0.0
        )
        self.assertEqual(state["kind"], "ask")

    def test_pending_kind_can_be_overridden(self):
        """The Session tab's own *Sum up this chat* button (plan 68 step 4) is the one caller
        that passes something other than the default."""
        state = pending_background_state(
            request_id=1, question="", app_id="", app_context="none", started_at=0.0, kind="sum_up"
        )
        self.assertEqual(state["kind"], "sum_up")


class TestCompletedLocalCommandState(unittest.TestCase):
    def test_completed_fields(self):
        state = completed_local_command_state(
            request_id=9,
            question="is this game VAC protected",
            app_id="440",
            app_context="active",
            response="Yes.",
            now=555.0,
        )
        self.assertEqual(state["status"], "completed")
        self.assertEqual(state["request_id"], 9)
        self.assertIs(state["success"], True)
        self.assertEqual(state["response"], "Yes.")
        self.assertEqual(state["elapsed_seconds"], 0.0)
        self.assertIsNone(state["error"])

    def test_started_and_completed_are_the_same_instant(self):
        """Local keyword branches never await work, so there is no elapsed time to report."""
        state = completed_local_command_state(
            request_id=1,
            question="q",
            app_id="",
            app_context="none",
            response="r",
            now=777.25,
        )
        self.assertEqual(state["started_at"], 777.25)
        self.assertEqual(state["completed_at"], 777.25)

    def test_shortcut_setup_absent_by_default(self):
        """Absent and null are different to the frontend: absent means 'no shortcut prompt'."""
        state = completed_local_command_state(
            request_id=1, question="q", app_id="", app_context="none", response="r", now=0.0
        )
        self.assertNotIn("shortcut_setup", state)

    def test_shortcut_setup_explicit_none_is_kept(self):
        state = completed_local_command_state(
            request_id=1,
            question="q",
            app_id="",
            app_context="none",
            response="r",
            now=0.0,
            shortcut_setup=None,
        )
        self.assertIn("shortcut_setup", state)
        self.assertIsNone(state["shortcut_setup"])

    def test_shortcut_setup_variant_is_kept(self):
        state = completed_local_command_state(
            request_id=1,
            question="q",
            app_id="",
            app_context="none",
            response="r",
            now=0.0,
            shortcut_setup="per_game",
        )
        self.assertEqual(state["shortcut_setup"], "per_game")

    def test_omit_sentinel_is_not_a_usable_value(self):
        """OMIT must be identity-compared, never equality-compared, or None would omit the key."""
        self.assertIsNot(OMIT, None)
        self.assertNotEqual(OMIT, None)


class TestPartialStreamSnapshot(unittest.TestCase):
    def test_snapshot_shape(self):
        snap = new_partial_stream_snapshot(5)
        self.assertEqual(
            set(snap),
            {
                "request_id",
                "partial_response",
                "asked_entity",
                "thinking_summary",
                "thinking_summary_monotonic",
                "thinking_tone",
                "streaming",
                "last_flush_monotonic",
                # Plan 57: the model's own thinking, live.
                "reasoning_partial",
                "reasoning_seconds",
                # Plan 58 phase 1: published before the model call, same reason as asked_entity.
                "kb_attached_notes",
                # Plan 68 step 4: which phase key last published thinking_summary.
                "thinking_phase_key",
            },
        )
        self.assertEqual(snap["request_id"], 5)
        self.assertIsNone(snap["partial_response"])
        self.assertEqual(snap["asked_entity"], "")
        self.assertIsNone(snap["thinking_summary"])
        self.assertEqual(snap["thinking_summary_monotonic"], 0.0)
        self.assertEqual(snap["thinking_tone"], "witty")
        self.assertIs(snap["streaming"], False)
        self.assertEqual(snap["last_flush_monotonic"], 0.0)
        self.assertIsNone(snap["reasoning_partial"])
        self.assertIsNone(snap["reasoning_seconds"])
        self.assertEqual(snap["kb_attached_notes"], [])
        self.assertIsNone(snap["thinking_phase_key"])

    def test_cleared_form_is_the_same_shape_with_a_null_request_id(self):
        """The cleared snapshot used to be a second hand-written literal; it is now this call."""
        cleared = new_partial_stream_snapshot(None)
        self.assertEqual(set(cleared), set(new_partial_stream_snapshot(1)))
        self.assertIsNone(cleared["request_id"])

    def test_cleared_snapshot_cannot_match_a_live_request(self):
        """`_merge_partial_into_background_status` grafts only when request_ids match."""
        cleared = new_partial_stream_snapshot(None)
        for live_request_id in (0, 1, 999):
            self.assertNotEqual(cleared["request_id"], live_request_id)


if __name__ == "__main__":
    unittest.main()
