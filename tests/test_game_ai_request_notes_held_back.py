"""Plan 104 lane H1, version one: on a turn the plugin marks "your notes do not cover this", the
notes can be held back from the AI altogether (switch NOTES_LEFT_OUT_ON, off when it lands).

Run through the real ask path against a small real library, with the model stood in for. What a
person would notice on the Deck: a made-up boss gets a reply written without any note about
something else to borrow from, and the screen does not say notes were used.

Every question here is about Deep Rock Galactic: Survivor, running. The made-up boss attaches two
loosely related notes and the reply ends "No close match"; the real boss attaches its own note and
carries no footer; a horse attaches nothing and the reply ends "Not in my notes".
"""

import asyncio
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.ask.game_ai_request import run_game_ai_request  # noqa: E402
from backend.knowledge import kb_followup_memory, kb_notes_footers  # noqa: E402
from backend.knowledge.kb_not_in_notes_notice import kb_attach_log_line  # noqa: E402
from backend.knowledge import kb_notes_turn_flags  # noqa: E402
from backend.prompts import ollama_prompts  # noqa: E402
from backend.prompts.ollama_prompts import TURN_FLAG_NOTES_DO_NOT_COVER  # noqa: E402
from test_game_ai_request_story_game_named import (  # noqa: E402
    _DRG_APP_ID,
    _DRG_APP_NAME,
    SmallLibraryAskSetup,
    _FakePlugin,
)

_MADE_UP = "How do I defeat the boss named Grimthak in this game"
_REAL_BOSS = "How do I beat the Glyphid Dreadnought boss in Deep Rock Galactic Survivor?"
_NOT_ATTACHED = "How do I tame a horse in Deep Rock Galactic Survivor?"
_FLAGGED = frozenset({TURN_FLAG_NOTES_DO_NOT_COVER})


def _left_out(on: bool):
    # create=True: before this change the switch does not exist, and the tests below must fail on what a
    # turn does, not on a missing name.
    return patch.object(ollama_prompts, "NOTES_LEFT_OUT_ON", on, create=True)


class _Asked:
    def __init__(self, plugin, result, log_lines):
        self.call = plugin.ask_calls[0]
        self.result = result
        self.log_lines = log_lines

    @property
    def context(self) -> str:
        return self.call.get("proton_log_attachment") or ""

    @property
    def reply(self) -> str:
        return str(self.result["response"])

    @property
    def notes_chip(self) -> dict:
        """The "Local knowledge base" chip Show details draws for the turn."""
        chips = [c for c in self.result["transparency"]["context_chips"] if c.get("id") == "kb"]
        assert len(chips) == 1, chips
        return chips[0]


class NotesHeldBackThroughTheAskPathTests(SmallLibraryAskSetup, unittest.TestCase):
    def _ask(self, question, *, ask_mode="strategy") -> _Asked:
        plugin = _FakePlugin(self.settings)
        plugin.reply = "I have no notes on that."
        with patch.object(kb_notes_footers, "logger") as footer_logger:
            result = asyncio.run(
                run_game_ai_request(
                    plugin, question, "127.0.0.1:11434", app_id=_DRG_APP_ID, app_name=_DRG_APP_NAME,
                    ask_mode=ask_mode,
                )
            )
        kb_followup_memory.forget()
        lines = [str(c.args[0]) for c in footer_logger.info.call_args_list if c.args]
        return _Asked(plugin, result, lines)

    # -- the switch off: nothing about a turn changes ----------------------------------------

    def test_with_the_switch_off_a_made_up_boss_turn_still_sends_the_notes_and_lists_them(self):
        with _left_out(False):
            asked = self._ask(_MADE_UP)
        self.assertEqual(asked.call["turn_flags"], _FLAGGED)
        self.assertIn("Glyphid Dreadnought", asked.context)
        self.assertEqual([n["name"] for n in asked.result["kb_attached_notes"]], ["Glyphid Dreadnought", "Hollow Bough"])
        self.assertTrue(asked.notes_chip["attached"])
        self.assertIn("2 notes attached", asked.log_lines[-1])

    # -- the switch on, a marked turn: what the AI is sent -----------------------------------

    def test_with_the_switch_on_the_ai_is_sent_no_note_at_all_on_a_made_up_boss_turn(self):
        with _left_out(True):
            asked = self._ask(_MADE_UP)
        for fragment in ("Glyphid Dreadnought", "Hollow Bough", "weak spot", "Local knowledge base", "end of knowledge base"):
            self.assertNotIn(fragment, asked.context)

    def test_with_the_switch_on_the_turn_is_still_marked_so_the_ai_is_still_told_to_say_it_has_no_notes(self):
        with _left_out(True):
            asked = self._ask(_MADE_UP)
        self.assertEqual(asked.call["turn_flags"], _FLAGGED)

    # -- the switch on, a marked turn: what the screen and the log say ------------------------

    def test_with_the_switch_on_the_screen_lists_no_notes_and_does_not_claim_any_were_used(self):
        with _left_out(True):
            asked = self._ask(_MADE_UP)
        self.assertEqual(asked.result["kb_attached_notes"], [])
        self.assertEqual(asked.result["transparency"]["kb_attached_notes"], [])
        self.assertFalse(asked.notes_chip["attached"])
        self.assertEqual(asked.notes_chip["label"], "Knowledge base (skipped)")
        self.assertEqual(asked.notes_chip["body"]["paths"], [])
        self.assertEqual(asked.notes_chip["body"].get("attribution", []), [])
        self.assertTrue(any("held back" in b.lower() for b in asked.notes_chip["body"]["bullets"]))

    def test_with_the_switch_on_the_reply_still_ends_no_close_match_and_never_not_in_my_notes(self):
        with _left_out(True):
            asked = self._ask(_MADE_UP)
        self.assertIn("No close match in my notes", asked.reply)
        self.assertNotIn("Not in my notes", asked.reply)

    def test_with_the_switch_on_the_log_says_the_notes_were_held_back_not_used(self):
        with _left_out(True):
            asked = self._ask(_MADE_UP)
        line = asked.log_lines[-1]
        self.assertIn("held back", line)
        self.assertNotIn("attached", line)
        self.assertIn("none was used", line)
        self.assertIn("'No close match' line added", line)

    # -- the switch on, every other turn: as before -------------------------------------------

    def test_with_the_switch_on_a_turn_a_note_answers_is_sent_the_same_bytes_and_lists_its_note(self):
        with _left_out(False):
            before = self._ask(_REAL_BOSS)
        with _left_out(True):
            after = self._ask(_REAL_BOSS)
        self.assertEqual(after.context, before.context)
        self.assertIn("Glyphid Dreadnought", after.context)
        self.assertEqual(after.result["kb_attached_notes"], before.result["kb_attached_notes"])
        self.assertEqual(after.reply, before.reply)
        self.assertEqual(after.log_lines, before.log_lines)

    def test_with_the_switch_on_a_turn_where_nothing_attached_reads_as_before(self):
        with _left_out(False):
            before = self._ask(_NOT_ATTACHED)
        with _left_out(True):
            after = self._ask(_NOT_ATTACHED)
        self.assertEqual(after.context, before.context)
        self.assertEqual(after.reply, before.reply)
        self.assertIn("Not in my notes", after.reply)
        self.assertEqual(after.log_lines, before.log_lines)

    def test_with_the_switch_on_a_speed_turn_is_not_marked_and_keeps_its_notes(self):
        with _left_out(False):
            before = self._ask(_MADE_UP, ask_mode="speed")
        with _left_out(True):
            after = self._ask(_MADE_UP, ask_mode="speed")
        self.assertEqual(after.call["turn_flags"], frozenset())
        self.assertEqual(after.context, before.context)
        self.assertEqual(after.result["kb_attached_notes"], before.result["kb_attached_notes"])


_FOUND = {"kb_attached": True, "kb_sources": [{"title": "Glyphid Dreadnought"}], "kb_notes": "", "kb_unavailable_reason": ""}
_TWO_NOTES = [{"name": "Glyphid Dreadnought"}, {"name": "Hollow Bough"}]


class HeldBackLogLineTests(unittest.TestCase):
    def test_the_default_wording_is_unchanged(self):
        line = kb_attach_log_line(_FOUND, _TWO_NOTES, not_in_notes_shown=False, no_close_match_shown=True)
        self.assertIn("2 notes attached (Glyphid Dreadnought; Hollow Bough)", line)
        self.assertIn("(the attached notes were a weak match)", line)

    def test_held_back_notes_are_named_as_found_and_not_used_never_as_attached(self):
        line = kb_attach_log_line(
            _FOUND, _TWO_NOTES, not_in_notes_shown=False, no_close_match_shown=True, notes_held_back=True
        )
        self.assertEqual(
            line,
            "ask_ollama: notes for this answer: notes held back from the AI: 2 notes found "
            "(Glyphid Dreadnought; Hollow Bough); none was used; "
            "'No close match' line added to the reply (the notes found were a weak match)",
        )

    def test_a_held_back_general_card_is_not_counted_as_zero_notes(self):
        general = {**_FOUND, "kb_sources": []}
        line = kb_attach_log_line(general, [], not_in_notes_shown=False, no_close_match_shown=False, notes_held_back=True)
        self.assertIn("a general card found; none was used", line)
        self.assertNotIn("0 notes", line)


class NotesHeldBackDecisionTests(unittest.TestCase):
    def test_only_a_marked_turn_with_the_switch_on_holds_the_notes_back(self):
        with _left_out(True):
            self.assertTrue(kb_notes_turn_flags.notes_held_back_from_ai(_FLAGGED))
            self.assertFalse(kb_notes_turn_flags.notes_held_back_from_ai(frozenset()))
            self.assertFalse(kb_notes_turn_flags.notes_held_back_from_ai(frozenset({"something_else"})))
        with _left_out(False):
            self.assertFalse(kb_notes_turn_flags.notes_held_back_from_ai(_FLAGGED))

    def test_the_switch_lands_off(self):
        self.assertFalse(ollama_prompts.NOTES_LEFT_OUT_ON)

    def test_a_held_back_turn_keeps_the_proton_text_and_drops_only_the_notes(self):
        with _left_out(True):
            held = kb_notes_turn_flags.notes_for_the_ai(
                _FLAGGED, proton_text="proton excerpt", context="proton excerpt\n\nnotes block",
                kb_transparency=_FOUND, kb_attached_notes=_TWO_NOTES,
            )
        self.assertTrue(held.held_back)
        self.assertEqual(held.context, "proton excerpt")
        self.assertEqual(held.attached_notes, [])
        self.assertFalse(held.transparency["kb_attached"])
        self.assertEqual(held.transparency["kb_sources"], [])
        self.assertEqual(held.transparency["kb_unavailable_reason"], kb_notes_turn_flags.NOTES_HELD_BACK_REASON)

    def test_with_the_switch_off_the_notes_come_back_untouched(self):
        with _left_out(False):
            kept = kb_notes_turn_flags.notes_for_the_ai(
                _FLAGGED, proton_text="p", context="p\n\nnotes", kb_transparency=_FOUND, kb_attached_notes=_TWO_NOTES
            )
        self.assertFalse(kept.held_back)
        self.assertEqual(kept.context, "p\n\nnotes")
        self.assertIs(kept.transparency, _FOUND)
        self.assertIs(kept.attached_notes, _TWO_NOTES)

    def test_a_turn_where_nothing_attached_has_nothing_to_hold_back(self):
        nothing = {**_FOUND, "kb_attached": False, "kb_sources": []}
        with _left_out(True):
            held = kb_notes_turn_flags.notes_for_the_ai(
                _FLAGGED, proton_text="", context="", kb_transparency=nothing, kb_attached_notes=[]
            )
        self.assertFalse(held.held_back)
        self.assertIs(held.transparency, nothing)


if __name__ == "__main__":
    unittest.main()
