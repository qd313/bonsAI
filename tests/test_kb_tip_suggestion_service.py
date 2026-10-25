"""Tests for "Suggest as a tip": the record it writes, where it writes it, and the link it builds."""

import json
import os
import re
import tempfile
import unittest
from datetime import datetime, timezone
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

from backend.notes.kb_tip_suggestion_service import (
    ISSUE_NEW_URL,
    TIP_FOLDER_NAME,
    build_tip_record,
    suggest_tip_sync,
)

NOW = datetime(2026, 10, 25, 15, 30, 12, tzinfo=timezone.utc)
QUESTION = "How do I beat the Mantis Lords without taking damage?"
ANSWER = "Stay near the middle and dash through the first lord's lunge; heal only after the second wave."


def _tip_dir(home: str) -> str:
    return os.path.join(home, "Desktop", "bonsAI_logs", TIP_FOLDER_NAME)


class RecordTests(unittest.TestCase):
    """build_tip_record: a valid section row from a real saved answer."""

    def test_a_real_answer_makes_a_row_with_exactly_the_five_required_fields(self):
        rec = build_tip_record(QUESTION, ANSWER, "367520", "Hollow Knight", "boss", NOW)
        self.assertEqual(sorted(rec), ["card", "game_id", "name", "section_id", "section_type"])
        self.assertEqual(rec["section_id"], 0)
        self.assertEqual(rec["game_id"], 0)
        self.assertEqual(rec["section_type"], "boss")
        self.assertTrue(rec["card"].startswith("Suggested by a player on 2026-10-25:\n"))
        self.assertIn("Hollow Knight", rec["card"].splitlines()[1])
        self.assertIn("Stay near the middle", rec["card"])

    def test_the_kind_defaults_to_mechanic_and_an_unknown_kind_falls_back_to_it(self):
        self.assertEqual(build_tip_record(QUESTION, ANSWER, "", "", "", NOW)["section_type"], "mechanic")
        self.assertEqual(build_tip_record(QUESTION, ANSWER, "", "", "../../etc", NOW)["section_type"], "mechanic")

    def test_a_card_is_at_most_700_characters_and_still_starts_with_the_date_line(self):
        rec = build_tip_record(QUESTION, "word " * 500, "1", "G", "mechanic", NOW)
        self.assertLessEqual(len(rec["card"]), 700)
        self.assertTrue(rec["card"].startswith("Suggested by a player on 2026-10-25:"))

    def test_the_name_comes_from_the_question_and_is_under_60_characters(self):
        rec = build_tip_record("x " * 100, ANSWER, "", "", "mechanic", NOW)
        self.assertGreater(len(rec["name"]), 0)
        self.assertLess(len(rec["name"]), 60)
        self.assertEqual(build_tip_record("  How do I\n heal?  ", ANSWER, "", "", "mechanic", NOW)["name"], "How do I heal?")

    def test_an_empty_question_still_gets_a_name(self):
        self.assertEqual(build_tip_record("", ANSWER, "", "Hollow Knight", "mechanic", NOW)["name"], "Hollow Knight tip")
        self.assertEqual(build_tip_record("", ANSWER, "", "", "mechanic", NOW)["name"], "Suggested tip")

    def test_an_empty_answer_is_refused(self):
        for blank in ("", "   \n  ", None):
            with self.assertRaises(ValueError):
                build_tip_record(QUESTION, blank, "", "", "mechanic", NOW)

    def test_control_characters_are_dropped_from_the_card(self):
        rec = build_tip_record(QUESTION, "Dash\x00 now\x07.", "", "", "mechanic", NOW)
        self.assertIn("Dash now.", rec["card"])
        self.assertNotRegex(rec["card"], r"[\x00-\x08\x0b-\x1f]")

    def test_a_lone_surrogate_half_is_dropped_so_it_can_never_reach_the_writer(self):
        rec = build_tip_record("Why \ud800 this?", "Dash \udfff now.", "", "Hollow \ud800 Knight", "mechanic", NOW)
        for value in (rec["name"], rec["card"]):
            value.encode("utf-8")  # raises on a lone half
        self.assertIn("Dash  now.", rec["card"])

    def test_the_app_id_is_kept_only_when_it_is_digits(self):
        self.assertIn("367520", build_tip_record(QUESTION, ANSWER, "367520", "G", "mechanic", NOW)["card"])
        self.assertNotIn("evil", build_tip_record(QUESTION, ANSWER, "evil/../x", "G", "mechanic", NOW)["card"])


class WriteTests(unittest.TestCase):
    """suggest_tip_sync: the file, its name, the refusal on a bad folder, and the link."""

    def test_it_writes_the_record_as_json_under_the_tips_folder_and_names_the_file_from_the_game_and_time(self):
        with tempfile.TemporaryDirectory() as home:
            res = suggest_tip_sync(home, QUESTION, ANSWER, "367520", "Hollow Knight", "boss", NOW)
            self.assertTrue(res["ok"], res)
            self.assertEqual(res["error"], "")
            self.assertEqual(res["file"], "hollow-knight-20261025-153012.json")
            path = os.path.join(_tip_dir(home), res["file"])
            with open(path, encoding="utf-8") as f:
                rec = json.load(f)
            self.assertEqual(sorted(rec), ["card", "game_id", "name", "section_id", "section_type"])
            self.assertEqual(rec["section_type"], "boss")

    def test_the_file_name_never_comes_from_the_question_or_the_answer(self):
        with tempfile.TemporaryDirectory() as home:
            res = suggest_tip_sync(home, "../../evil", "../../pwned " + ANSWER, "1", "", "mechanic", NOW)
            self.assertTrue(res["ok"], res)
            self.assertEqual(res["file"], "game-20261025-153012.json")
            self.assertEqual(os.listdir(_tip_dir(home)), [res["file"]])

    def test_a_hostile_game_name_becomes_letters_digits_and_dashes_cut_to_40(self):
        with tempfile.TemporaryDirectory() as home:
            res = suggest_tip_sync(home, QUESTION, ANSWER, "1", "..\\..\\Sys/Tem: 32 \x00 Ünï" + "x" * 80, "mechanic", NOW)
            self.assertTrue(res["ok"], res)
            stem = res["file"][: -len("-20261025-153012.json")]
            self.assertRegex(stem, r"^[a-z0-9-]+$")
            self.assertLessEqual(len(stem), 40)
            self.assertFalse(stem.startswith("-") or stem.endswith("-"))
            self.assertEqual(os.listdir(_tip_dir(home)), [res["file"]])

    def test_a_second_tip_in_the_same_second_gets_its_own_file_and_nothing_is_overwritten(self):
        with tempfile.TemporaryDirectory() as home:
            a = suggest_tip_sync(home, QUESTION, ANSWER, "1", "Hollow Knight", "mechanic", NOW)
            b = suggest_tip_sync(home, QUESTION, "A different answer.", "1", "Hollow Knight", "mechanic", NOW)
            self.assertTrue(a["ok"] and b["ok"])
            self.assertNotEqual(a["file"], b["file"])
            with open(os.path.join(_tip_dir(home), a["file"]), encoding="utf-8") as f:
                self.assertIn("Stay near the middle", json.load(f)["card"])

    def test_an_empty_answer_writes_nothing_and_says_why(self):
        with tempfile.TemporaryDirectory() as home:
            res = suggest_tip_sync(home, QUESTION, "  ", "1", "Hollow Knight", "mechanic", NOW)
            self.assertFalse(res["ok"])
            self.assertEqual(res["file"], "")
            self.assertEqual(res["issue_url"], "")
            self.assertIn("answer", res["error"].lower())
            self.assertFalse(os.path.exists(_tip_dir(home)))

    def test_a_folder_that_leads_outside_the_notes_folder_is_refused_and_nothing_is_written(self):
        with tempfile.TemporaryDirectory() as home, tempfile.TemporaryDirectory() as elsewhere:
            logs = os.path.join(home, "Desktop", "bonsAI_logs")
            os.makedirs(logs)
            try:
                os.symlink(elsewhere, os.path.join(logs, TIP_FOLDER_NAME), target_is_directory=True)
            except (OSError, NotImplementedError):
                self.skipTest("this machine cannot make symbolic links")
            res = suggest_tip_sync(home, QUESTION, ANSWER, "1", "Hollow Knight", "mechanic", NOW)
            self.assertFalse(res["ok"])
            self.assertEqual(res["file"], "")
            self.assertEqual(os.listdir(elsewhere), [])

    def test_the_inside_the_folder_check_is_what_stands_between_a_path_and_the_write(self):
        with tempfile.TemporaryDirectory() as home:
            with patch("backend.notes.kb_tip_suggestion_service._is_path_under", return_value=False):
                res = suggest_tip_sync(home, QUESTION, ANSWER, "1", "Hollow Knight", "mechanic", NOW)
            self.assertFalse(res["ok"])
            self.assertEqual(res["file"], "")
            tip_dir = _tip_dir(home)
            self.assertEqual(os.listdir(tip_dir) if os.path.isdir(tip_dir) else [], [])

    def test_a_write_that_fails_answers_with_the_shared_message_and_no_path(self):
        with tempfile.TemporaryDirectory() as home:
            with patch("backend.notes.kb_tip_suggestion_service.os.makedirs", side_effect=PermissionError(13, "no", home)):
                res = suggest_tip_sync(home, QUESTION, ANSWER, "1", "Hollow Knight", "mechanic", NOW)
            self.assertFalse(res["ok"])
            self.assertNotIn(home, res["error"])

    def test_the_link_is_the_fixed_new_issue_address_with_only_an_encoded_title(self):
        with tempfile.TemporaryDirectory() as home:
            res = suggest_tip_sync(home, "Mantis Lords & more? #1", ANSWER + " SECRET-ANSWER-TEXT", "1", "Hollow Knight", "mechanic", NOW)
        url = res["issue_url"]
        self.assertTrue(url.startswith(ISSUE_NEW_URL + "?"), url)
        parts = urlsplit(url)
        self.assertEqual(f"{parts.scheme}://{parts.netloc}{parts.path}", "https://github.com/qd313/bonsAI/issues/new")
        query = parse_qs(parts.query)
        self.assertEqual(list(query), ["title"])
        self.assertEqual(query["title"], ["Suggested tip: Mantis Lords & more? #1"])
        self.assertRegex(parts.query, r"^title=[A-Za-z0-9%._~-]+$")
        self.assertNotIn("SECRET", url)
        self.assertNotIn(" ", url)

    def test_a_lone_surrogate_half_in_the_question_or_answer_still_writes_a_whole_json_file(self):
        with tempfile.TemporaryDirectory() as home:
            res = suggest_tip_sync(home, "Why \ud800 this?", "Dash \ud800 now.", "1", "Hollow Knight", "mechanic", NOW)
            self.assertTrue(res["ok"], res)
            path = os.path.join(_tip_dir(home), res["file"])
            self.assertGreater(os.path.getsize(path), 0)
            with open(path, encoding="utf-8") as f:
                self.assertEqual(json.load(f)["section_type"], "mechanic")
            self.assertEqual(os.listdir(_tip_dir(home)), [res["file"]])

    def test_the_default_utc_clock_is_used_when_no_time_is_given(self):
        with tempfile.TemporaryDirectory() as home:
            res = suggest_tip_sync(home, QUESTION, ANSWER, "1", "Hollow Knight", "mechanic")
            self.assertRegex(res["file"], r"^hollow-knight-\d{8}-\d{6}\.json$")


if __name__ == "__main__":
    unittest.main()
