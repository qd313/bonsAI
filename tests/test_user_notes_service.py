"""Plan 92 lane N1: the notes file (user_notes.json) and the rules for what a note may be."""

import json
import os
import tempfile
import unittest
from unittest import mock

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.services import user_notes_service as notes  # noqa: E402
from backend.services.user_notes_service import UserNoteError  # noqa: E402


class _Base(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.dir = tmp.name

    def _add(self, text="Steel Soul run", *, at=1_760_000_000.0, **extra):
        return notes.save_note(self.dir, {"id": "", "text": text, **extra}, now_seconds=at)

    def _refused(self, payload, code):
        before = self._file_bytes()
        with self.assertRaises(UserNoteError) as ctx:
            notes.save_note(self.dir, payload, now_seconds=1_760_000_100.0)
        self.assertEqual(ctx.exception.code, code)
        self.assertEqual(self._file_bytes(), before, "a refused save must write nothing")
        return str(ctx.exception)

    def _file_bytes(self):
        try:
            with open(notes.notes_path(self.dir), "rb") as fh:
                return fh.read()
        except FileNotFoundError:
            return None


class FileShapeTests(_Base):
    def test_a_new_note_is_stored_in_the_agreed_shape(self):
        note = self._add("  Steel Soul run  ", app_id="367520", game_title="Hollow Knight", source_turn_id="t-9")
        self.assertEqual(
            note,
            {
                "id": "n-1760000000000",
                "text": "Steel Soul run",
                "app_id": "367520",
                "game_title": "Hollow Knight",
                "on": True,
                "created_at": "2025-10-09T08:53:20Z",
                "source_turn_id": "t-9",
            },
        )
        with open(os.path.join(self.dir, "user_notes.json"), encoding="utf-8") as fh:
            on_disk = json.load(fh)
        self.assertEqual(on_disk, {"version": 1, "notes": [note]})

    def test_a_note_for_every_game_has_no_app_id_and_no_title(self):
        note = self._add("No spoilers past the City of Tears")
        self.assertEqual((note["app_id"], note["game_title"], note["on"]), ("", "", True))

    def test_a_failed_replace_keeps_the_old_file_whole(self):
        self._add("first")
        good = self._file_bytes()
        with mock.patch("backend.services.user_notes_service.os.replace", side_effect=OSError("disk")):
            with self.assertRaises(UserNoteError) as ctx:
                self._add("second", at=1_760_000_050.0)
        self.assertEqual(ctx.exception.code, "invalid")
        self.assertEqual(self._file_bytes(), good)

    def test_a_good_save_leaves_no_temporary_file_behind(self):
        self._add("first")
        self.assertEqual(os.listdir(self.dir), ["user_notes.json"])

    def test_no_file_reads_as_no_notes(self):
        self.assertEqual(notes.load_notes(self.dir), [])


class CapsTests(_Base):
    def test_the_41st_note_is_refused_with_the_agreed_words(self):
        for i in range(40):
            self._add(f"note {i}", at=1_760_000_000.0 + i)
        words = self._refused({"id": "", "text": "one too many"}, "too_many")
        self.assertEqual(words, "That's one note too many. Remove one first.")
        self.assertEqual(len(notes.load_notes(self.dir)), 40)

    def test_forty_notes_are_fine_and_a_removal_makes_room(self):
        made = [self._add(f"note {i}", at=1_760_000_000.0 + i) for i in range(40)]
        notes.delete_note(self.dir, made[0]["id"])
        self._add("room again", at=1_760_000_500.0)
        self.assertEqual(len(notes.load_notes(self.dir)), 40)

    def test_a_201_character_text_is_refused_and_200_is_kept_whole(self):
        words = self._refused({"id": "", "text": "x" * 201}, "too_long")
        self.assertEqual(words, "A note can be up to 200 characters.")
        self.assertEqual(self._add("y" * 200)["text"], "y" * 200)

    def test_empty_and_blank_text_is_refused(self):
        self.assertEqual(self._refused({"id": "", "text": ""}, "empty"), "A note needs some words.")
        self._refused({"id": "", "text": "   \n "}, "empty")
        self._refused({"id": ""}, "empty")

    def test_editing_to_a_too_long_or_empty_text_is_refused_and_changes_nothing(self):
        note = self._add("keep me")
        self._refused({"id": note["id"], "text": "z" * 201}, "too_long")
        self._refused({"id": note["id"], "text": " "}, "empty")
        self.assertEqual(notes.load_notes(self.dir)[0]["text"], "keep me")

    def test_odd_payloads_are_invalid(self):
        self._refused("not a dict", "invalid")
        self._refused({"id": "", "text": "ok", "on": "yes"}, "invalid")
        self._refused({"id": "", "text": "ok", "app_id": "abc"}, "invalid")
        self._refused({"id": 5, "text": "ok"}, "invalid")
        self.assertEqual(notes.ERROR_WORDS["invalid"], "That note could not be saved.")


class EditAndDeleteTests(_Base):
    def test_an_edit_changes_only_the_keys_sent(self):
        note = self._add("Steel Soul run", app_id="367520", game_title="Hollow Knight", source_turn_id="t-1")
        notes.save_note(self.dir, {"id": note["id"], "on": False})
        after = notes.load_notes(self.dir)[0]
        self.assertEqual(after, {**note, "on": False})
        notes.save_note(self.dir, {"id": note["id"], "text": "Steel Soul, no charms"})
        after = notes.load_notes(self.dir)[0]
        self.assertEqual(after, {**note, "on": False, "text": "Steel Soul, no charms"})
        notes.save_note(self.dir, {"id": note["id"], "app_id": "", "game_title": ""})
        after = notes.load_notes(self.dir)[0]
        self.assertEqual((after["app_id"], after["game_title"], after["text"]), ("", "", "Steel Soul, no charms"))
        self.assertEqual(after["created_at"], note["created_at"])
        self.assertEqual(after["id"], note["id"])

    def test_editing_a_missing_note_says_it_is_gone(self):
        self.assertEqual(self._refused({"id": "n-1", "on": False}, "not_found"), "That note is gone.")

    def test_delete_removes_just_that_note(self):
        a = self._add("a", at=1_760_000_000.0)
        b = self._add("b", at=1_760_000_010.0)
        notes.delete_note(self.dir, a["id"])
        self.assertEqual([n["id"] for n in notes.load_notes(self.dir)], [b["id"]])

    def test_delete_of_a_missing_id_says_gone_and_writes_nothing(self):
        self._add("a")
        before = self._file_bytes()
        for missing in ("n-nope", "", None):
            with self.assertRaises(UserNoteError) as ctx:
                notes.delete_note(self.dir, missing)
            self.assertEqual(ctx.exception.code, "not_found")
            self.assertEqual(str(ctx.exception), "That note is gone.")
        self.assertEqual(self._file_bytes(), before)


class OrderAndDamageTests(_Base):
    def test_notes_come_back_newest_first(self):
        first = self._add("first", at=1_760_000_000.0)
        third = self._add("third", at=1_760_000_200.0)
        second = self._add("second", at=1_760_000_100.0)
        self.assertEqual([n["id"] for n in notes.load_notes(self.dir)], [third["id"], second["id"], first["id"]])

    def test_two_notes_in_the_same_second_both_keep_and_the_later_one_is_first(self):
        a = self._add("a", at=1_760_000_000.0)
        b = self._add("b", at=1_760_000_000.5)
        self.assertNotEqual(a["id"], b["id"])
        self.assertEqual([n["text"] for n in notes.load_notes(self.dir)], ["b", "a"])

    def test_two_notes_in_the_same_millisecond_get_different_ids(self):
        a = self._add("a", at=1_760_000_000.0)
        b = self._add("b", at=1_760_000_000.0)
        self.assertNotEqual(a["id"], b["id"])
        self.assertEqual([n["text"] for n in notes.load_notes(self.dir)], ["b", "a"])

    def test_a_corrupt_file_reads_as_no_notes_and_the_next_save_writes_a_good_one(self):
        with open(notes.notes_path(self.dir), "w", encoding="utf-8") as fh:
            fh.write("{ this is not json")
        self.assertEqual(notes.load_notes(self.dir), [])
        self._add("fresh start")
        with open(notes.notes_path(self.dir), encoding="utf-8") as fh:
            self.assertEqual(json.load(fh)["notes"][0]["text"], "fresh start")

    def test_unusable_rows_are_skipped_not_fatal(self):
        rows = [
            "junk",
            {"id": "n-1", "text": ""},
            {"text": "no id"},
            {"id": "n-2", "text": "kept", "created_at": "2025-01-01T00:00:00Z"},
            {"id": "n-2", "text": "same id twice"},
        ]
        with open(notes.notes_path(self.dir), "w", encoding="utf-8") as fh:
            json.dump({"version": 1, "notes": rows}, fh)
        self.assertEqual([n["text"] for n in notes.load_notes(self.dir)], ["kept"])


if __name__ == "__main__":
    unittest.main()
