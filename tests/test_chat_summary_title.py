"""Tests for the fresher chat title a summary can offer (plan 79 helper H).

Three layers: the wording and the line parser (chat_summary_title.py), the summary request and
the summary it returns (chat_summary_service.write_chat_summary, with the model's reply faked),
and what the chat file and the rename call do with the offer (chat_slot_service, chat_slot_rpc).
The level the Deck check looks at is the last one: the card shows what the loaded chat carries,
so these end on the payload the screen gets.
"""

import asyncio
import json
import tempfile
import threading
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.services.chat_slot_service import (  # noqa: E402
    create_slot,
    decline_title_offer,
    load_slot,
    sanitize_slot,
    save_slot_summary,
    slot_to_rpc_payload,
    update_slot_label,
)
from backend.services.chat_summary_service import (  # noqa: E402
    SummaryPlan,
    _summary_request_messages,
    decide_and_write_chat_summary,
    write_chat_summary,
)
from backend.services.chat_summary_title import (  # noqa: E402
    clean_suggested_title,
    split_title_line,
    title_instruction,
    title_to_second_guess,
)
from fake_ollama_stream import ndjson_response  # noqa: E402
from test_chat_sum_up_job import ChatSlotJobTestCase, _seed_chat  # noqa: E402


def _turns(n: int) -> list[dict]:
    out = []
    for i in range(n):
        out.append({"id": f"q{i}", "role": "user", "text": f"how do i use the crossbow {i}"})
        out.append({"id": f"a{i}", "role": "assistant", "text": f"hold zoom for a steady shot {i}"})
    return out


class TitleLineTests(unittest.TestCase):
    def test_the_title_line_is_taken_out_of_the_summary_text(self):
        reply = "Games: Half-Life 2\nStuck on: the helicopter\nTITLE: Half-Life 2 weapons"
        text, words = split_title_line(reply)
        self.assertEqual(text, "Games: Half-Life 2\nStuck on: the helicopter")
        self.assertEqual(words, "Half-Life 2 weapons")

    def test_other_ways_a_small_model_writes_the_line_are_taken_out_too(self):
        for line in ("**Title:** Half-Life 2 weapons", "Suggested title - Half-Life 2 weapons", "title = Half-Life 2 weapons"):
            text, words = split_title_line(f"Games: Half-Life 2\n{line}")
            self.assertEqual(text, "Games: Half-Life 2", line)
            self.assertEqual(words, "Half-Life 2 weapons", line)

    def test_a_repeated_title_line_leaves_none_behind(self):
        text, words = split_title_line("one\nTITLE: A b\ntwo\nTITLE: C d")
        self.assertEqual(text, "one\ntwo")
        self.assertEqual(words, "A b")

    def test_a_reply_with_no_title_line_is_unchanged_and_offers_nothing(self):
        text, words = split_title_line("Games: Hades\nStuck on: the boss")
        self.assertEqual(text, "Games: Hades\nStuck on: the boss")
        self.assertIsNone(words)

    def test_a_line_that_only_mentions_a_title_in_a_sentence_is_kept(self):
        line = "Player asked about the title screen of Hades"
        self.assertEqual(split_title_line(line), (line, None))

    def test_keep_in_any_form_is_no_offer(self):
        for words in ("KEEP", "keep", "Keep.", "keep it", "Keep the title", "none", ""):
            self.assertEqual(clean_suggested_title(words, "wheatley fight"), "", words)

    def test_the_chats_own_title_is_not_offered_back(self):
        self.assertEqual(clean_suggested_title('"Wheatley Fight."', "wheatley fight"), "")

    def test_a_suggestion_is_tidied_to_plain_words(self):
        self.assertEqual(clean_suggested_title('  "Half-Life 2 weapons".', "wheatley fight"), "Half-Life 2 weapons")
        self.assertEqual(clean_suggested_title("**Half-Life 2 weapons**", "wheatley fight"), "Half-Life 2 weapons")

    def test_something_too_long_to_be_a_name_is_no_offer(self):
        long_words = "Half-Life 2 weapons and how to beat every boss in the game"
        self.assertEqual(clean_suggested_title(long_words, "wheatley fight"), "")
        self.assertEqual(clean_suggested_title(None, "wheatley fight"), "")

    def test_a_typed_title_is_never_second_guessed_and_an_old_chat_counts_as_not_typed(self):
        self.assertEqual(title_to_second_guess({"label": "wheatley fight", "label_by_hand": True}), "")
        self.assertEqual(title_to_second_guess({"label": "wheatley fight"}), "wheatley fight")
        self.assertEqual(title_to_second_guess({"label": "wheatley fight", "label_by_hand": False}), "wheatley fight")
        self.assertEqual(title_to_second_guess(None), "")

    def test_the_instruction_names_the_title_and_cannot_be_broken_by_a_quote_in_it(self):
        text = title_instruction('say "hi"')
        self.assertIn("TITLE:", text)
        self.assertIn("KEEP", text)
        self.assertIn("say 'hi'", text)


class _FakePlugin:
    def __init__(self):
        self._abort_current_ollama_chat = threading.Event()
        self._chat_resp_ready_evt = None
        self._active_ollama_chat_http_response = None
        self._active_ollama_chat_pc_ip = None
        self._active_ollama_chat_model = None

    def _abort_ollama_chat_check(self) -> bool:
        return self._abort_current_ollama_chat.is_set()


def _reply(text: str):
    return ndjson_response([json.dumps({"message": {"role": "assistant", "content": text}, "done": True})])


def _plan(turns):
    return SummaryPlan(needed=True, covered_turns=turns, kept_turns=[], oldest_turns_unread=0, previous=None)


class SummaryRequestAndReplyTests(unittest.TestCase):
    def _write(self, urlopen, reply, *, title_offer_for):
        urlopen.return_value = _reply(reply)
        turns = _turns(6)
        outcome = asyncio.run(
            write_chat_summary(
                _FakePlugin(), chat={"turns": turns}, plan=_plan(turns), model_name="gemma4:e2b-it-qat",
                url="http://127.0.0.1:11434/api/chat", keep_alive="5m", window_tokens=16384,
                reply_language="english", request_id=1, title_offer_for=title_offer_for,
            )
        )
        return outcome, json.loads(urlopen.call_args[0][0].data.decode("utf-8"))

    def test_the_request_carries_the_current_title_only_when_a_title_may_be_offered(self):
        asked = _summary_request_messages(_plan(_turns(2)), "m", "english", "wheatley fight")[0]["content"]
        self.assertIn("wheatley fight", asked)
        self.assertIn("TITLE:", asked)
        plain = _summary_request_messages(_plan(_turns(2)), "m", "english")[0]["content"]
        self.assertNotIn("TITLE", plain)

    @patch("backend.services.ollama_chat_stream.urllib.request.urlopen")
    def test_a_suggestion_rides_in_the_summary_and_never_in_its_text(self, urlopen):
        reply = "Games: Half-Life 2\nStuck on: the helicopter\nTITLE: Half-Life 2 weapons"
        outcome, body = self._write(urlopen, reply, title_offer_for="wheatley fight")
        self.assertEqual(outcome.status, "written")
        self.assertEqual(outcome.summary["suggested_title"], "Half-Life 2 weapons")
        self.assertNotIn("TITLE", outcome.summary["text"])
        self.assertNotIn("Half-Life 2 weapons", outcome.summary["text"])
        self.assertIn("wheatley fight", body["messages"][0]["content"])

    @patch("backend.services.ollama_chat_stream.urllib.request.urlopen")
    def test_keep_leaves_the_summary_with_no_offer(self, urlopen):
        outcome, _body = self._write(urlopen, "Stuck on: the second boss\nTITLE: KEEP", title_offer_for="Hades keepsakes")
        self.assertEqual(outcome.status, "written")
        self.assertNotIn("suggested_title", outcome.summary)
        self.assertNotIn("TITLE", outcome.summary["text"])

    @patch("backend.services.ollama_chat_stream.urllib.request.urlopen")
    def test_a_chat_not_asked_about_its_title_is_summed_up_exactly_as_before(self, urlopen):
        outcome, body = self._write(urlopen, "Stuck on: the second boss\nTITLE: Something else", title_offer_for="")
        self.assertNotIn("TITLE:", body["messages"][0]["content"])
        self.assertNotIn("suggested_title", outcome.summary)


class SlotAndRenameTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.dir = tmp.name
        self.sid = create_slot(self.dir, label="wheatley fight")["id"]

    def _offer(self, title="Half-Life 2 weapons"):
        return save_slot_summary(self.dir, self.sid, {"text": "notes", "covers_through_turn_id": "t1", "suggested_title": title})

    def _old_file(self, label, first_question="how do i beat the helicopter", **extra):
        """A chat file saved before label_by_hand existed: the key is simply not in it."""
        raw = {
            "id": "old", "label": label, "created_at": 1, "updated_at": 2, "origin_app_name": "Half-Life 2",
            "turns": [
                {"id": "q1", "role": "user", "text": first_question},
                {"id": "a1", "role": "assistant", "text": "use the rocket launcher"},
            ],
            "summary": {"text": "notes", "covers_through_turn_id": "a1", "suggested_title": "Half-Life 2 weapons"},
            **extra,
        }
        self.assertNotIn("label_by_hand", raw)
        return raw

    def test_an_old_chat_still_named_by_the_plugin_stays_open_to_an_offer(self):
        for label in ("how do i beat the helicopter", "New chat"):
            slot = sanitize_slot(self._old_file(label))
            self.assertFalse(slot["label_by_hand"], label)
            self.assertEqual(title_to_second_guess(slot), label)

    def test_an_old_chat_with_any_other_title_counts_as_typed_and_is_never_offered_one(self):
        slot = sanitize_slot(self._old_file("my helicopter notes"))
        self.assertTrue(slot["label_by_hand"])
        self.assertEqual(title_to_second_guess(slot), "")
        self.assertNotIn("suggested_title", slot_to_rpc_payload(slot)["summary"])

    def test_an_old_chat_named_after_its_game_or_a_long_first_question_is_still_the_plugins_name(self):
        game = self._old_file("Half-Life 2")
        game["turns"] = []
        self.assertFalse(sanitize_slot(game)["label_by_hand"])
        long_q = "how do i beat the helicopter " * 8
        long_name = long_q.strip()[:119] + "…"
        self.assertFalse(sanitize_slot(self._old_file(long_name, first_question=long_q))["label_by_hand"])

    def test_a_chat_with_the_key_present_is_read_as_it_says(self):
        self.assertFalse(sanitize_slot({**self._old_file("my helicopter notes"), "label_by_hand": False})["label_by_hand"])
        self.assertTrue(sanitize_slot({**self._old_file("how do i beat the helicopter"), "label_by_hand": True})["label_by_hand"])

    def test_a_new_chat_is_not_taken_for_a_typed_one_when_it_is_saved(self):
        sid = create_slot(self.dir, first_question="where is the crossbow", app_name="Half-Life 2")["id"]
        self.assertFalse(load_slot(self.dir, sid)["label_by_hand"])

    def test_the_offer_is_stored_with_the_summary_and_reaches_the_screen(self):
        self._offer()
        payload = slot_to_rpc_payload(load_slot(self.dir, self.sid))
        self.assertEqual(payload["summary"]["suggested_title"], "Half-Life 2 weapons")
        self.assertEqual(payload["label"], "wheatley fight")  # stored, not applied

    def test_a_title_typed_by_hand_is_remembered_and_closes_the_offer(self):
        self._offer()
        saved = update_slot_label(self.dir, self.sid, "my own name")
        self.assertTrue(saved["label_by_hand"])
        self.assertNotIn("suggested_title", saved["summary"])

    def test_saying_yes_renames_without_marking_the_title_as_typed(self):
        self._offer()
        saved = update_slot_label(self.dir, self.sid, "Half-Life 2 weapons", by_hand=False)
        self.assertEqual(saved["label"], "Half-Life 2 weapons")
        self.assertFalse(saved["label_by_hand"])
        self.assertNotIn("suggested_title", saved["summary"])

    def test_keep_closes_the_offer_changes_nothing_else_and_is_not_offered_twice(self):
        self._offer()
        before = load_slot(self.dir, self.sid)
        saved = decline_title_offer(self.dir, self.sid)
        self.assertEqual(saved["label"], "wheatley fight")
        self.assertEqual(saved["updated_at"], before["updated_at"])
        self.assertNotIn("suggested_title", saved["summary"])
        self._offer()  # a later summary suggests the very same title again
        self.assertNotIn("suggested_title", load_slot(self.dir, self.sid)["summary"])
        self._offer("Half-Life 2 guns")  # a different one is a new suggestion
        self.assertEqual(load_slot(self.dir, self.sid)["summary"]["suggested_title"], "Half-Life 2 guns")

    def test_a_hand_renamed_chat_shows_no_offer_even_if_one_was_suggested(self):
        update_slot_label(self.dir, self.sid, "my own name")
        self._offer()  # a summary that was already running when the person renamed the chat
        self.assertNotIn("suggested_title", load_slot(self.dir, self.sid)["summary"])
        # and a file that already holds one (saved by an older build) is still hidden from the card
        slot = load_slot(self.dir, self.sid)
        slot["summary"]["suggested_title"] = "Half-Life 2 weapons"
        self.assertNotIn("suggested_title", slot_to_rpc_payload(slot)["summary"])

    def test_the_chats_own_title_is_not_stored_as_an_offer(self):
        self._offer("Wheatley Fight")
        self.assertNotIn("suggested_title", load_slot(self.dir, self.sid)["summary"])


class RenameRpcAndSummaryJobTests(ChatSlotJobTestCase):
    async def test_the_rename_call_answers_the_offer_all_three_ways(self) -> None:
        sid = _seed_chat(self.tmp, turns=2, label="wheatley fight")
        save_slot_summary(self.tmp, sid, {"text": "notes", "covers_through_turn_id": "x", "suggested_title": "Half-Life 2 weapons"})
        kept = await self.plugin.rename_chat_slot({"slot_id": sid, "keep_title_offer": True})
        self.assertTrue(kept["ok"])
        self.assertEqual(kept["slot"]["label"], "wheatley fight")
        self.assertNotIn("suggested_title", kept["slot"]["summary"])

        save_slot_summary(self.tmp, sid, {"text": "notes", "covers_through_turn_id": "x", "suggested_title": "Half-Life 2 guns"})
        yes = await self.plugin.rename_chat_slot({"slot_id": sid, "label": "Half-Life 2 guns", "from_title_offer": True})
        self.assertEqual(yes["slot"]["label"], "Half-Life 2 guns")
        self.assertFalse(yes["slot"]["label_by_hand"])
        self.assertNotIn("suggested_title", yes["slot"]["summary"])

        typed = await self.plugin.rename_chat_slot({"slot_id": sid, "label": "mine"})
        self.assertTrue(typed["slot"]["label_by_hand"])
        blank = await self.plugin.rename_chat_slot({"slot_id": sid})
        self.assertFalse(blank["ok"])
        self.assertEqual(load_slot(self.tmp, sid)["label"], "mine")

    async def test_the_sum_up_button_asks_about_the_title_unless_it_was_typed(self) -> None:
        sid = _seed_chat(self.tmp, turns=60, label="wheatley fight")
        asked = await self._press_sum_up(sid)
        self.assertEqual(asked, "wheatley fight")
        update_slot_label(self.tmp, sid, "mine")
        self.assertEqual(await self._press_sum_up(sid), "")

    async def _press_sum_up(self, sid: str) -> str:
        seen = {}

        async def _write(*_a, **kwargs):
            seen.update(kwargs)
            raise asyncio.CancelledError

        with patch.object(type(self.plugin), "load_settings", return_value={}), patch(
            "backend.services.chat_sum_up_job._pick_model_and_window",
            return_value=("test-model", 16384, "http://127.0.0.1:11434/api/chat"),
        ), patch("backend.services.chat_sum_up_job.write_chat_summary", _write):
            result = await self.plugin.sum_up_chat_slot(sid)
            self.assertTrue(result["accepted"])
            await self.plugin._background_task
        return seen["title_offer_for"]

    async def test_the_summary_a_chat_writes_by_itself_offers_a_title_the_same_way(self) -> None:
        sid = _seed_chat(self.tmp, turns=60, label="wheatley fight")
        saved = []

        async def _write(*_a, **kwargs):
            saved.append(kwargs["title_offer_for"])
            from backend.services.chat_summary_service import SummaryOutcome

            return SummaryOutcome(status="written", summary={"text": "notes", "covers_through_turn_id": "x", "suggested_title": "Half-Life 2 weapons"}, seconds=1.0, error="")

        chat = load_slot(self.tmp, sid)
        with patch("backend.services.chat_summary_service.write_chat_summary", _write):
            _turns_out, summary, mark, stopped = await decide_and_write_chat_summary(
                self.plugin, chat={"id": sid, "turns": chat["turns"], "summary": None}, chat_turns=None,
                system_content="system", question="and the crossbow?", ask_mode="speed", think_effort="off",
                room_tokens=16384, model_name="test-model", url="http://127.0.0.1:11434/api/chat",
                keep_alive="5m", reply_language="english", active_request_id=None, app_name="",
                character_enabled=False, character_preset_id=None,
            )
        self.assertEqual((mark, stopped), ("written", False))
        self.assertEqual(saved, ["wheatley fight"])
        self.assertEqual(load_slot(self.tmp, sid)["summary"]["suggested_title"], "Half-Life 2 weapons")


if __name__ == "__main__":
    unittest.main()
