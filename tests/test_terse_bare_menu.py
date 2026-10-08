"""Terse mode: a menu the AI writes as bare JSON (no fence) still becomes buttons.

What a person sees: with Terse mode on, the small model sometimes ends its answer with the choice
menu as plain JSON, without the fence it was asked for. On the Deck (2026-10-08, three of ten
questions) that JSON showed up as text inside the answer and no buttons appeared. These tests pin
the reader on its own. The end-to-end checks through the real Ask path live in
test_terse_mode_prompt.py (TheMenuInASpeedReplyReachesTheScreen).
"""

import sys
import types
import unittest

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

if "decky" not in sys.modules:  # pragma: no cover - the stub installer above normally owns this
    sys.modules["decky"] = types.ModuleType("decky")

from backend.services.terse_bare_menu import (  # noqa: E402
    hide_bare_branch_menu,
    split_trailing_bare_branch_menu,
)

ANSWER = "Pick one weapon to carry the run, see?"
MENU = (
    '{"question":"Which weapon should I focus on first?","options":[{"id":"a","label":"Details on '
    'primary weapon choices"},{"id":"b","label":"Tips for survivability upgrades"}]}'
)
REPLY = ANSWER + "\n\n" + MENU


class TheBareMenuReader(unittest.TestCase):
    def test_the_menu_comes_off_the_end_and_becomes_options(self):
        head, payload = split_trailing_bare_branch_menu(REPLY)
        self.assertEqual(head, ANSWER)
        self.assertEqual([o["id"] for o in payload["options"]], ["a", "b"])
        self.assertEqual(payload["question"], "Which weapon should I focus on first?")

    def test_a_menu_on_the_same_line_as_the_last_sentence_is_read_too(self):
        head, payload = split_trailing_bare_branch_menu(ANSWER + " " + MENU)
        self.assertEqual(head, ANSWER)
        self.assertEqual(len(payload["options"]), 2)

    def test_a_trailing_comma_is_forgiven(self):
        menu = '{"question":"Which?","options":[{"id":"a","label":"One"},{"id":"b","label":"Two"},]}'
        head, payload = split_trailing_bare_branch_menu(ANSWER + "\n" + menu)
        self.assertEqual(head, ANSWER)
        self.assertEqual(len(payload["options"]), 2)

    def test_an_unreadable_menu_is_cut_with_no_buttons(self):
        head, payload = split_trailing_bare_branch_menu(ANSWER + '\n\n{"question":"Which?","options":[{"id":')
        self.assertEqual(head, ANSWER)
        self.assertIsNone(payload)

    def test_plain_text_is_returned_as_it_came(self):
        self.assertEqual(split_trailing_bare_branch_menu("Just words."), ("Just words.", None))
        self.assertEqual(hide_bare_branch_menu("Just words."), "Just words.")
        self.assertEqual(split_trailing_bare_branch_menu(""), ("", None))

    def test_other_json_or_json_followed_by_words_or_json_in_a_code_block_is_left_alone(self):
        for text in (
            'Set it like this:\n\n{"fps_limit": 40, "tdp": 8}',
            REPLY + "\n\nThat is all for now.",
            "Sample:\n```\n" + MENU + "\n```\nDone.",
            "Sample:\n```json\n" + MENU,
            'Use `{"question": 1}` as the key.',
        ):
            with self.subTest(text=text):
                self.assertEqual(split_trailing_bare_branch_menu(text), (text, None))
                self.assertEqual(hide_bare_branch_menu(text), text)

    def test_a_half_written_menu_is_hidden_mid_stream(self):
        for cut in (MENU[:3], MENU[:12], MENU[:40], MENU[:-5]):
            with self.subTest(cut=cut):
                self.assertEqual(hide_bare_branch_menu(ANSWER + "\n\n" + cut), ANSWER)

    def test_an_ordinary_open_brace_at_the_end_is_not_hidden(self):
        text = ANSWER + " Use {tdp} here"
        self.assertEqual(hide_bare_branch_menu(text), text)


if __name__ == "__main__":
    unittest.main()
