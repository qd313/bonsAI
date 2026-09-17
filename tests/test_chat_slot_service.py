"""Unit tests for chat_slot_service."""

import tempfile
import unittest

from backend.services.chat_slot_service import (
    MAX_CHAT_SLOTS,
    append_turn,
    create_slot,
    delete_slot,
    heuristic_slot_label,
    list_slot_summaries,
    load_slot,
    save_slot,
    update_slot_label,
    wipe_all_slots,
)


class ChatSlotServiceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.settings_dir = self.tmp

    def tearDown(self):
        import shutil

        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_create_and_append_turns(self):
        slot = create_slot(
            self.settings_dir,
            first_question="How do I parry?",
            app_name="Elden Ring",
        )
        # The question names the slot; the game does not prefix it. A column of chats from one
        # game shared an identical opening otherwise, which is what the row shows at a glance.
        self.assertEqual(slot["label"], "How do I parry?")
        sid = slot["id"]
        append_turn(
            self.settings_dir,
            sid,
            role="user",
            text="How do I parry?",
            request_id=1,
        )
        saved = append_turn(
            self.settings_dir,
            sid,
            role="assistant",
            text="Practice the timing window.",
            request_id=1,
        )
        self.assertIsNotNone(saved)
        assert saved is not None
        self.assertEqual(len(saved["turns"]), 2)

    def test_turns_persist_the_app_id_they_were_asked_under(self):
        """Regression (DRG-GLOSSARY-01, measured on device 2026-08-28): nothing recorded which
        game a turn was about, so a reply that had glossary chips while it streamed lost them
        the moment it settled into history and was re-read from the saved chat.
        """
        slot = create_slot(self.settings_dir, first_question="What is kiting?", app_name="Deep Rock")
        sid = slot["id"]
        append_turn(self.settings_dir, sid, role="user", text="What is kiting?", app_id="548430")
        saved = append_turn(
            self.settings_dir,
            sid,
            role="assistant",
            text="Keep moving and shoot behind you.",
            app_id="548430",
        )
        assert saved is not None
        self.assertEqual([t["app_id"] for t in saved["turns"]], ["548430", "548430"])

        reloaded = load_slot(self.settings_dir, sid)
        assert reloaded is not None
        self.assertEqual(reloaded["turns"][-1]["app_id"], "548430")

    def test_turns_saved_before_the_field_existed_load_with_an_empty_app_id(self):
        """A slot file written by an older build has no ``app_id`` on its turns. It must load
        rather than fail — the frontend falls back to the slot's ``origin_app_id`` for these.
        """
        slot = create_slot(self.settings_dir, origin_app_id="548430", label="old chat")
        sid = slot["id"]
        legacy = {
            **slot,
            "turns": [
                {"id": "u1", "role": "user", "text": "What is kiting?"},
                {"id": "a1", "role": "assistant", "text": "Keep moving."},
            ],
        }
        save_slot(self.settings_dir, legacy)
        reloaded = load_slot(self.settings_dir, sid)
        assert reloaded is not None
        self.assertEqual([t["app_id"] for t in reloaded["turns"]], ["", ""])
        self.assertEqual(reloaded["origin_app_id"], "548430")

    def test_turn_persists_the_display_caption_separately_from_the_composed_prompt(self):
        """Roadmap: a reopened chat's header showed '[Strategy follow-up] I'm at: …' because only
        the composed prompt was saved. The friendly caption now rides along, display-only.
        """
        slot = create_slot(self.settings_dir, label="captions")
        sid = slot["id"]
        saved = append_turn(
            self.settings_dir,
            sid,
            role="user",
            text="[Strategy follow-up] I'm at: the twins",
            display_text="I'm at: the twins",
        )
        assert saved is not None
        turn = saved["turns"][-1]
        self.assertEqual(turn["display_text"], "I'm at: the twins")
        self.assertEqual(turn["text"], "[Strategy follow-up] I'm at: the twins")

        reloaded = load_slot(self.settings_dir, sid)
        assert reloaded is not None
        self.assertEqual(reloaded["turns"][-1]["display_text"], "I'm at: the twins")

    def test_turns_without_a_display_caption_load_with_an_empty_one(self):
        slot = create_slot(self.settings_dir, label="no-caption")
        saved = append_turn(self.settings_dir, slot["id"], role="user", text="plain question")
        assert saved is not None
        self.assertEqual(saved["turns"][-1]["display_text"], "")

    def test_turn_app_id_is_bounded(self):
        slot = create_slot(self.settings_dir, label="bounds")
        saved = append_turn(
            self.settings_dir, slot["id"], role="user", text="q", app_id=" " + ("9" * 80) + " "
        )
        assert saved is not None
        self.assertEqual(saved["turns"][-1]["app_id"], "9" * 32)

    def test_turns_persist_the_app_name_they_were_asked_under(self):
        """Plan 54 gap 1: a title reachable only by name (an emulator shortcut with no Steam
        AppID) needs its name carried the same way the AppID is, or a reopened chat re-fences
        boss tactics the screen would otherwise show in plain text.
        """
        slot = create_slot(self.settings_dir, first_question="boss tips?", app_name="Doom 64")
        sid = slot["id"]
        append_turn(
            self.settings_dir,
            sid,
            role="user",
            text="boss tips?",
            app_name="Doom 64: Retribution",
        )
        saved = append_turn(
            self.settings_dir,
            sid,
            role="assistant",
            text="Circle-strafe and pop the weak point.",
            app_name="Doom 64: Retribution",
        )
        assert saved is not None
        self.assertEqual(
            [t["app_name"] for t in saved["turns"]],
            ["Doom 64: Retribution", "Doom 64: Retribution"],
        )

        reloaded = load_slot(self.settings_dir, sid)
        assert reloaded is not None
        self.assertEqual(reloaded["turns"][-1]["app_name"], "Doom 64: Retribution")

    def test_turns_saved_before_the_app_name_field_existed_load_with_an_empty_one(self):
        slot = create_slot(self.settings_dir, origin_app_id="", label="old chat")
        sid = slot["id"]
        legacy = {
            **slot,
            "turns": [
                {"id": "u1", "role": "user", "text": "boss tips?"},
                {"id": "a1", "role": "assistant", "text": "Circle-strafe."},
            ],
        }
        save_slot(self.settings_dir, legacy)
        reloaded = load_slot(self.settings_dir, sid)
        assert reloaded is not None
        self.assertEqual([t["app_name"] for t in reloaded["turns"]], ["", ""])

    def test_assistant_turn_persists_transparency_snapshot(self):
        """Regression: assistant turns used to save no transparency at all, so a slot restored
        from disk could never show more than the newest archived turn in SessionContextStrip
        (chatSlotTurns.ts hardcoded the field to null because there was nothing to read).
        """
        slot = create_slot(self.settings_dir, first_question="How do I parry?", app_name="Elden Ring")
        sid = slot["id"]
        snapshot = {
            "route": "ollama",
            "success": True,
            "context_chips": [{"id": "kb", "rank": 1, "label": "KB", "attached": True}],
            "overflow_skips": [],
        }
        saved = append_turn(
            self.settings_dir,
            sid,
            role="assistant",
            text="Practice the timing window.",
            request_id=1,
            transparency=snapshot,
        )
        assert saved is not None
        assistant_turn = saved["turns"][-1]
        self.assertEqual(assistant_turn["transparency"], snapshot)

        # Round-trips through disk unchanged.
        reloaded = load_slot(self.settings_dir, sid)
        assert reloaded is not None
        self.assertEqual(reloaded["turns"][-1]["transparency"], snapshot)

    def test_transparency_with_no_chips_is_dropped(self):
        """A snapshot with an empty context_chips list is indistinguishable from no snapshot to
        the frontend filter (`t.transparency && chipsFromSnapshot(t.transparency).length > 0`),
        so persistence normalizes it to None rather than storing a chip-less placeholder.
        """
        slot = create_slot(self.settings_dir, label="chipless")
        sid = slot["id"]
        saved = append_turn(
            self.settings_dir,
            sid,
            role="assistant",
            text="answer",
            transparency={"route": "ollama", "success": True, "context_chips": []},
        )
        assert saved is not None
        self.assertIsNone(saved["turns"][-1]["transparency"])

    def test_user_turn_without_transparency_stores_none(self):
        slot = create_slot(self.settings_dir, label="no-transparency")
        sid = slot["id"]
        saved = append_turn(self.settings_dir, sid, role="user", text="question")
        assert saved is not None
        self.assertIsNone(saved["turns"][-1]["transparency"])

    def test_assistant_turn_persists_reasoning(self):
        """Plan 57: a turn made with thinking on keeps the text, its seconds and a token
        estimate, and round-trips through disk unchanged, the same as the transparency snapshot
        above.
        """
        slot = create_slot(self.settings_dir, first_question="how do i kill the boss")
        sid = slot["id"]
        saved = append_turn(
            self.settings_dir,
            sid,
            role="assistant",
            text="Stand behind it and swing.",
            request_id=1,
            reasoning={"text": "Thinking Process: the boss has a weak point.", "seconds": 41, "tokens": 380},
        )
        assert saved is not None
        assistant_turn = saved["turns"][-1]
        self.assertEqual(
            assistant_turn["reasoning"],
            {"text": "Thinking Process: the boss has a weak point.", "seconds": 41, "tokens": 380},
        )

        reloaded = load_slot(self.settings_dir, sid)
        assert reloaded is not None
        self.assertEqual(reloaded["turns"][-1]["reasoning"], assistant_turn["reasoning"])

    def test_a_turn_made_with_no_thinking_has_no_reasoning_key_at_all(self):
        """Not a key holding null -- the key is simply absent, the same rule
        ``_normalize_turn_transparency`` already follows for a chip-less snapshot.
        """
        slot = create_slot(self.settings_dir, label="no-reasoning")
        sid = slot["id"]
        saved = append_turn(self.settings_dir, sid, role="assistant", text="answer")
        assert saved is not None
        self.assertNotIn("reasoning", saved["turns"][-1])

    def test_an_explicit_none_reasoning_leaves_the_key_absent_too(self):
        slot = create_slot(self.settings_dir, label="explicit-none")
        sid = slot["id"]
        saved = append_turn(
            self.settings_dir, sid, role="assistant", text="answer", reasoning=None
        )
        assert saved is not None
        self.assertNotIn("reasoning", saved["turns"][-1])

    def test_an_older_turn_saved_before_reasoning_existed_loads_with_the_key_absent(self):
        """A slot file written before plan 57 has no ``reasoning`` key on its old turns at all --
        proven here by sanitizing a raw turn dict that never had the key, the same shape a file
        from before this feature landed would hand back.
        """
        from backend.services.chat_slot_service import sanitize_slot

        raw_slot = {
            "id": "old-slot",
            "label": "Old chat",
            "turns": [
                {
                    "id": "t1",
                    "role": "assistant",
                    "text": "An answer from before thinking was ever kept.",
                    "created_at": 1,
                }
            ],
        }
        sanitized = sanitize_slot(raw_slot)
        assert sanitized is not None
        self.assertNotIn("reasoning", sanitized["turns"][0])

    def test_slot_keeps_the_game_name_it_was_created_under(self):
        """The slot row shows the game above the conversation title, and nothing else records the
        NAME - ``origin_app_id`` cannot be shown to a reader, and resolving it needs the game to be
        running, which it usually is not when you are browsing old chats.
        """
        slot = create_slot(
            self.settings_dir,
            first_question="How do I parry?",
            app_name="Elden Ring",
            origin_app_id="1245620",
        )
        self.assertEqual(slot["origin_app_name"], "Elden Ring")

        reloaded = load_slot(self.settings_dir, slot["id"])
        assert reloaded is not None
        self.assertEqual(reloaded["origin_app_name"], "Elden Ring")

        summaries = list_slot_summaries(self.settings_dir)
        self.assertEqual(summaries[0]["origin_app_name"], "Elden Ring")

    def test_slot_saved_before_the_game_name_existed_loads_with_an_empty_one(self):
        slot = create_slot(self.settings_dir, label="legacy")
        legacy = {k: v for k, v in slot.items() if k != "origin_app_name"}
        save_slot(self.settings_dir, legacy)
        reloaded = load_slot(self.settings_dir, slot["id"])
        assert reloaded is not None
        self.assertEqual(reloaded["origin_app_name"], "")

    def test_prune_at_cap(self):
        for i in range(MAX_CHAT_SLOTS + 2):
            create_slot(self.settings_dir, label=f"slot-{i}")
        summaries = list_slot_summaries(self.settings_dir)
        self.assertLessEqual(len(summaries), MAX_CHAT_SLOTS)

    def test_delete_slot(self):
        slot = create_slot(self.settings_dir, label="delete-me")
        sid = slot["id"]
        self.assertTrue(delete_slot(self.settings_dir, sid))
        self.assertIsNone(load_slot(self.settings_dir, sid))

    def test_rename_persists_and_reindexes(self):
        slot = create_slot(self.settings_dir, label="old-name")
        sid = slot["id"]
        updated = update_slot_label(self.settings_dir, sid, "Elden Ring build")
        self.assertIsNotNone(updated)
        assert updated is not None
        self.assertEqual(updated["label"], "Elden Ring build")
        summaries = list_slot_summaries(self.settings_dir)
        self.assertEqual(len(summaries), 1)
        self.assertEqual(summaries[0]["label"], "Elden Ring build")

    def test_heuristic_label(self):
        self.assertIn("foo", heuristic_slot_label("foo bar baz", ""))
        # The question leads, and the game name is NOT prefixed onto it: a row of chats from one
        # game used to share the same opening twenty characters and read as identical at a glance.
        self.assertEqual(heuristic_slot_label("question", "Game"), "question")
        self.assertNotIn("Game", heuristic_slot_label("question", "Game"))
        # Only a slot with no question yet falls back to the game name.
        self.assertEqual(heuristic_slot_label("", "Game"), "Game")
        self.assertEqual(heuristic_slot_label("", ""), "New chat")

    def test_wipe_all(self):
        create_slot(self.settings_dir, label="a")
        create_slot(self.settings_dir, label="b")
        wipe_all_slots(self.settings_dir)
        self.assertEqual(list_slot_summaries(self.settings_dir), [])

    def test_assistant_turn_persists_the_asked_entity(self):
        """Plan 54 gap 2: the named thing the backend worked out ("Wheatley" for "wheatley
        fight") must round-trip, so a reopened chat's boss tactics stay unfenced too.
        """
        slot = create_slot(self.settings_dir, first_question="wheatley fight")
        sid = slot["id"]
        append_turn(self.settings_dir, sid, role="user", text="wheatley fight")
        saved = append_turn(
            self.settings_dir,
            sid,
            role="assistant",
            text="Wheatley starts lying immediately.",
            asked_entity="Wheatley",
        )
        assert saved is not None
        self.assertEqual(saved["turns"][-1]["asked_entity"], "Wheatley")

        reloaded = load_slot(self.settings_dir, sid)
        assert reloaded is not None
        self.assertEqual(reloaded["turns"][-1]["asked_entity"], "Wheatley")

    def test_turns_saved_before_the_asked_entity_field_existed_load_with_an_empty_one(self):
        slot = create_slot(self.settings_dir, label="old chat")
        sid = slot["id"]
        legacy = {
            **slot,
            "turns": [
                {"id": "u1", "role": "user", "text": "wheatley fight"},
                {"id": "a1", "role": "assistant", "text": "Wheatley starts lying immediately."},
            ],
        }
        save_slot(self.settings_dir, legacy)
        reloaded = load_slot(self.settings_dir, sid)
        assert reloaded is not None
        self.assertEqual([t["asked_entity"] for t in reloaded["turns"]], ["", ""])


if __name__ == "__main__":
    unittest.main()
