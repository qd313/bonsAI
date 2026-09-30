"""Tests for rule-based response verification."""

import unittest

from backend.services.response_verify import (
    _parse_yes_no_verdict,
    cover_named_spoilers,
    cover_thinking_text,
    drop_branch_menu_copying_the_worked_example,
    verify_ollama_response,
)


class ResponseVerifyTests(unittest.TestCase):
    def test_flags_invented_appid_without_game(self):
        result = verify_ollama_response(
            response_text="Try AppID 1234567 for that title.",
            app_id="",
            app_name="",
        )
        self.assertFalse(result["passed"])
        self.assertTrue(result["warnings"])


    def test_parse_yes_no_verdict(self):
        self.assertFalse(_parse_yes_no_verdict("YES"))
        self.assertTrue(_parse_yes_no_verdict("NO"))
        self.assertIsNone(_parse_yes_no_verdict("maybe"))


class DropBranchMenuCopyingTheWorkedExampleTests(unittest.TestCase):
    """Roadmap: "The follow-up menu keeps offering Half-Life 2 whatever game you asked about"

    and "A follow-up offered a place from a different game" -- one cause, the model copying
    the prompt's own worked example (Half-Life 2, the train station, Ravenholm) instead of
    answering for the real game.
    """

    def _menu(self, question: str, label_a: str, label_b: str) -> dict:
        return {
            "question": question,
            "options": [
                {"id": "a", "label": label_a},
                {"id": "b", "label": label_b},
            ],
        }

    def test_a_menu_carrying_the_examples_words_is_dropped(self):
        menu = self._menu(
            "Where are you at in Portal 2?",
            "Just arrived at the train station",
            "Fighting through Ravenholm",
        )
        self.assertIsNone(drop_branch_menu_copying_the_worked_example(menu, "Portal 2"))

    def test_a_menu_whose_heading_names_the_wrong_game_is_dropped(self):
        menu = self._menu(
            "Where are you at in Half-Life 2?",
            "Early in the boss fight",
            "Right before the final area",
        )
        self.assertIsNone(drop_branch_menu_copying_the_worked_example(menu, "Hades"))

    def test_a_legitimate_menu_passes_unchanged(self):
        menu = self._menu(
            "Where are you at in Hades?",
            "Just started a run from the House of Hades",
            "Fighting through Elysium",
        )
        self.assertEqual(
            drop_branch_menu_copying_the_worked_example(menu, "Hades"), menu
        )

    def test_half_life_2_itself_is_allowed_to_mention_half_life_2(self):
        menu = self._menu(
            "Where are you at in Half-Life 2?",
            "Just left the train station in City 17",
            "Deep into the Highway 17 chapter",
        )
        self.assertEqual(
            drop_branch_menu_copying_the_worked_example(menu, "Half-Life 2"), menu
        )

    def test_no_branches_block_passes_through(self):
        self.assertIsNone(drop_branch_menu_copying_the_worked_example(None, "Hades"))

    def test_a_menu_carrying_the_no_game_placeholder_is_dropped(self):
        """Roadmap: "The no-game branch menu leaks its template" (found 2026-09-18).

        With no game known, the reply's menu came back reading exactly the prompt's
        own placeholder text (py_modules/backend/services/ollama_prompts.py lines
        1513-1515: '"question":"Where are you at in <THIS GAME>?"', options
        '"<a place early in THIS game>"' / '"<a place later in THIS game>"') --
        the same real text captured in
        docs/test-evidence/plan58p1-QA-NOTES-BLOCK-03.json.
        """
        menu = self._menu(
            "Where are you at in THIS GAME?",
            "<a place early in THIS game>",
            "<a place later in THIS game>",
        )
        self.assertIsNone(drop_branch_menu_copying_the_worked_example(menu, ""))

    def test_a_menu_whose_heading_alone_keeps_the_placeholder_is_dropped(self):
        """docs/test-evidence/plan58p1-M-tip-before.json: the options were real-looking

        ("Early in the game" / "Later in the game") but the heading still read
        'Where are you at in THIS GAME?' -- the heading alone must be enough to drop it.
        """
        menu = self._menu(
            "Where are you at in THIS GAME?",
            "Early in the game",
            "Later in the game",
        )
        self.assertIsNone(drop_branch_menu_copying_the_worked_example(menu, ""))

    def test_a_menu_that_filled_the_title_into_the_placeholder_is_dropped(self):
        """Roadmap: "The branch menu still copies its own template, now with the game's name

        filled in" (Deck, 2026-09-25, screenshots/DeckCapture_20260925_002145_game.png): the
        choices read "<a place early in Deep Rock Galactic Survivor>" -- the title swapped in,
        the brackets and the example's wording kept.
        """
        menu = self._menu(
            "Where are you at in Deep Rock Galactic Survivor?",
            "<a place early in Deep Rock Galactic Survivor>",
            "<a place later in Deep Rock Galactic Survivor>",
        )
        self.assertIsNone(
            drop_branch_menu_copying_the_worked_example(menu, "Deep Rock Galactic: Survivor")
        )

    def test_the_placeholder_wording_is_dropped_even_without_its_brackets(self):
        menu = self._menu(
            "Where are you at in Hades?",
            "A place early in Hades",
            "A place later in Hades",
        )
        self.assertIsNone(drop_branch_menu_copying_the_worked_example(menu, "Hades"))

    def test_a_heading_still_wrapping_the_title_in_brackets_is_dropped(self):
        menu = self._menu(
            "Where are you at in <Hades>?",
            "Tartarus",
            "Asphodel",
        )
        self.assertIsNone(drop_branch_menu_copying_the_worked_example(menu, "Hades"))

    def test_real_choices_that_happen_to_start_alike_are_kept(self):
        menu = self._menu(
            "Where are you at in Fallout 3?",
            "A place called Megaton",
            "Health below 50% (<50%)",
        )
        self.assertEqual(drop_branch_menu_copying_the_worked_example(menu, "Fallout 3"), menu)


class CoverNamedSpoilersTests(unittest.TestCase):
    """D112 #7, the spoiler safety net: roadmap entry "A name-withheld boss question on a
    story-protected game comes back with no spoiler box" (measured on the Deck 2026-09-22 and
    2026-09-23, 83 reads during streaming, never covered)."""

    def test_a_sentence_naming_a_protected_thing_is_fenced(self):
        text = (
            "Soul Master will use projectile attacks. He also dashes across the arena. "
            "Watch your footing near the edges."
        )
        out = cover_named_spoilers(text, ["Soul Master"])
        self.assertIn("```bonsai-spoiler", out)
        self.assertIn("Soul Master will use projectile attacks.", out)
        self.assertIn("He also dashes across the arena.", out)
        # Only the sentence that actually names the protected thing is fenced -- exactly one
        # fence, and the very next sentence sits in plain text right after its closing ```.
        self.assertEqual(out.count("```bonsai-spoiler"), 1)
        self.assertIn("```\nHe also dashes across the arena.", out)

    def test_no_protected_name_present_leaves_the_reply_untouched(self):
        text = "Keep an eye on your stamina and dodge to the side."
        self.assertEqual(cover_named_spoilers(text, ["Soul Master"]), text)

    def test_no_protected_names_at_all_leaves_the_reply_untouched(self):
        text = "Soul Master will fake its death partway through the fight."
        self.assertEqual(cover_named_spoilers(text, []), text)

    def test_consecutive_protected_sentences_share_one_fence_not_two(self):
        """A checker that fenced each sentence on its own would write two ```bonsai-spoiler```
        blocks back to back -- the exact doubled-block shape plan 68's 6843f8e1 found and filed
        as a bug. This is what proves this checker never produces that shape itself."""
        text = "Soul Master appears first. Soul Master then splits into a shade. The fight ends there."
        out = cover_named_spoilers(text, ["Soul Master"])
        self.assertEqual(out.count("```bonsai-spoiler"), 1)
        self.assertIn("Soul Master appears first.", out)
        self.assertIn("Soul Master then splits into a shade.", out)

    def test_a_doubled_spoiler_block_is_treated_as_already_covered(self):
        """Plan 68's own bug (6843f8e1): a saved answer with the SAME ```bonsai-spoiler``` block
        written twice in a row. The safety net must leave it exactly as it found it -- not
        collapse it, not wrap it again, not touch what is already inside either copy."""
        doubled = (
            "Before the fight.\n\n"
            "```bonsai-spoiler\nSoul Master fakes its death.\n```\n\n"
            "```bonsai-spoiler\nSoul Master fakes its death.\n```\n\n"
            "After the fight."
        )
        self.assertEqual(cover_named_spoilers(doubled, ["Soul Master"]), doubled)

    def test_text_already_inside_a_fence_is_left_alone(self):
        text = "```bonsai-spoiler\nSoul Master returns as Soul Tyrant.\n```\nGeneral advice follows."
        self.assertEqual(cover_named_spoilers(text, ["Soul Master"]), text)

    def test_running_it_twice_changes_nothing_the_second_time(self):
        text = "Soul Master will fake its death partway through the fight."
        once = cover_named_spoilers(text, ["Soul Master"])
        twice = cover_named_spoilers(once, ["Soul Master"])
        self.assertEqual(once, twice)

    def test_a_branch_menu_fence_at_the_end_is_never_touched_or_moved(self):
        text = (
            "Soul Master hits hard early on.\n\n"
            "```bonsai-strategy-branches\n"
            '{"question":"Where are you at?","options":[]}\n'
            "```"
        )
        out = cover_named_spoilers(text, ["Soul Master"])
        self.assertTrue(out.endswith("```bonsai-strategy-branches\n"
                                      '{"question":"Where are you at?","options":[]}\n'
                                      "```"))
        self.assertIn("```bonsai-spoiler", out)

    def test_a_growing_name_is_held_back_from_the_live_snapshot(self):
        """The "start of a name" case: without this, "Soul Ma" would flash on screen bare for
        the handful of tokens it takes the model to finish typing "Soul Master"."""
        out = cover_named_spoilers(
            "The next boss is Soul Ma",
            ["Soul Master"],
            hold_back_incomplete_trailing=True,
        )
        self.assertEqual(out, "")

    def test_a_completed_name_is_covered_immediately_even_mid_sentence(self):
        out = cover_named_spoilers(
            "The next boss is Soul Master and he",
            ["Soul Master"],
            hold_back_incomplete_trailing=True,
        )
        self.assertIn("```bonsai-spoiler", out)
        self.assertIn("Soul Master", out)

    def test_an_ordinary_trailing_word_is_never_held_back(self):
        out = cover_named_spoilers(
            "Continuing…",
            ["Soul Master"],
            hold_back_incomplete_trailing=True,
        )
        self.assertEqual(out, "Continuing…")

    def test_finished_replies_are_not_held_back(self):
        out = cover_named_spoilers(
            "The next boss is Soul Ma",
            ["Soul Master"],
            hold_back_incomplete_trailing=False,
        )
        self.assertEqual(out, "The next boss is Soul Ma")


class MidlineFenceLeakTests(unittest.TestCase):
    """D112 #7 leak fix: SPOILER-COVER-01, measured live on the Deck 2026-09-26 (Hollow
    Knight, "tips for the teleporting boss that throws orbs in the sanctum"). The raw reads
    are in the session's scratchpad L1-2-HK-C.jsonl; the fragments below are reconstructed
    from what those reads actually showed on screen, not an idealized guess at the shape.

    The model glued its own ```bonsai-spoiler fence to the end of a word ("The```bonsai-
    spoiler"), which neither this checker nor the screen's own scanner recognises as a fence
    opener (both require one to start its own line) -- so "The Soul Master fight is all about
    timing his movements." showed bare for about 4.7 s, next to raw ```bonsai-spoiler / ```bon
    text and a "Code block incoming…" chip, until the finished-reply cover caught up.
    """

    def test_a_midline_glued_opener_never_leaves_the_name_readable_while_streaming(self):
        # Reconstructed from L1-2-HK-C.jsonl t=29386..30486: the model wrote "The" then its own
        # fence opener with no newline between them, and had not reached a closing ``` yet.
        raw = (
            "He comes back through the roof for a faster second round with far less time to "
            "heal, so learn the dodges in round one.\n\n"
            "The```bonsai-spoiler\nThe Soul Master fight is all about timing his movements."
        )
        out = cover_named_spoilers(raw, ["Soul Master"], hold_back_incomplete_trailing=True)
        self.assertNotIn("Soul Master", out)
        self.assertNotIn("timing his movements", out)

    def test_a_half_typed_opener_never_shows_raw(self):
        # Reconstructed from L1-2-HK-C.jsonl t=33065, the literal captured tail: "```bon".
        raw = (
            "He comes back through the roof. When he deflates and gasps, there is a brief "
            "moment where you can land a hit to stagger him.\n\n```bon"
        )
        out = cover_named_spoilers(raw, ["Soul Master"], hold_back_incomplete_trailing=True)
        self.assertNotIn("```bon", out)
        self.assertIn("land a hit to stagger him.", out)

    def test_the_same_glued_opener_is_recognised_once_the_reply_finishes(self):
        """Once the model's own fence actually closes, the finished-reply pass (no holdback)
        recognises it as a real cover -- after the midline marker is moved to its own line --
        rather than wrapping a second, redundant fence around the same sentence."""
        raw = (
            "Intro line.\n\n"
            "The```bonsai-spoiler\nThe Soul Master fight is all about timing his movements.\n```\n"
            "Outro line."
        )
        out = cover_named_spoilers(raw, ["Soul Master"], hold_back_incomplete_trailing=False)
        self.assertEqual(out.count("```bonsai-spoiler"), 1)
        self.assertIn("Outro line.", out)


class OneLineHiddenBlockWhileStreamingTests(unittest.TestCase):
    """The model sometimes writes a hidden block on one line ("```bonsai-spoiler text ```"), the
    inline shape its own instructions show. While the closing backticks were arriving, that line
    was not yet a fence (no newline after it) and not a half-typed opener either (it already held
    a backtick past the opener), so the live pass wrapped it in a second fence: two opening
    markers on screen, and in the saved chat if Stop landed in that moment. Found by feeding the
    real function one letter at a time (plan 72 lane 6)."""

    FENCE = "`" * 3
    NAMES = ["Soul Master"]

    def _shapes(self) -> dict[str, tuple[str, str]]:
        """Each one-line shape the model writes, and what the finished-reply pass makes of it."""
        f = self.FENCE
        return {
            "glued to a bullet": (
                f"- tip: {f}bonsai-spoiler The Soul Master teleports. {f}\nGood luck.",
                f"- tip: \n{f}bonsai-spoiler The Soul Master teleports. \n{f}\nGood luck.",
            ),
            "on its own line": (
                f"Intro.\n{f}bonsai-spoiler The Soul Master teleports.{f}\nGood luck.",
                f"Intro.\n{f}bonsai-spoiler The Soul Master teleports.\n{f}\nGood luck.",
            ),
        }

    def _stream(self, raw: str) -> list[str]:
        return [
            cover_named_spoilers(raw[:i], self.NAMES, hold_back_incomplete_trailing=True)
            for i in range(1, len(raw) + 1)
        ]

    def test_no_partial_ever_holds_two_opening_markers(self):
        opener = f"{self.FENCE}bonsai-spoiler"
        for name, (raw, _finished) in self._shapes().items():
            with self.subTest(name):
                for i, partial in enumerate(self._stream(raw), start=1):
                    self.assertLessEqual(partial.count(opener), 1, f"after {i} letters: {partial!r}")

    def test_the_finished_text_is_unchanged(self):
        for name, (raw, finished) in self._shapes().items():
            with self.subTest(name):
                self.assertEqual(cover_named_spoilers(raw, self.NAMES), finished)


class TildeAndLongFenceTests(unittest.TestCase):
    """The back end's cover check must read fences the way the panel does (src/utils/
    markdownFenceReader.ts): three or more backticks OR tildes open one, and only a line of the
    same mark, at least as long, closes it. It used to know three-backtick blocks only, so a
    hidden block written with tildes was never seen as a block and its words were covered again
    (or, worse, a name after a longer fence's inner ``` was thought to be outside a block)."""

    NAMES = ["Soul Master"]
    T = "~" * 3
    B = "`" * 3

    def test_a_tilde_hidden_block_is_left_alone_like_a_backtick_one(self):
        text = f"{self.T}bonsai-spoiler\nSoul Master returns as Soul Tyrant.\n{self.T}\nGeneral advice follows."
        self.assertEqual(cover_named_spoilers(text, self.NAMES), text)

    def test_a_name_after_a_closed_tilde_block_is_still_covered(self):
        text = f"{self.T}bonsai-spoiler\nSecret.\n{self.T}\nSoul Master is next."
        out = cover_named_spoilers(text, self.NAMES)
        self.assertTrue(out.startswith(f"{self.T}bonsai-spoiler\nSecret.\n{self.T}"))
        self.assertIn(f"{self.B}bonsai-spoiler", out)
        self.assertIn("Soul Master is next.", out)

    def test_a_backtick_line_does_not_close_a_tilde_block(self):
        text = f"{self.T}bonsai-spoiler\nFirst part.\n{self.B}\nSoul Master is in here.\n{self.T}\nDone."
        self.assertEqual(cover_named_spoilers(text, self.NAMES), text)

    def test_a_tilde_line_does_not_close_a_backtick_block(self):
        text = f"{self.B}bonsai-spoiler\nFirst part.\n{self.T}\nSoul Master is in here.\n{self.B}\nDone."
        self.assertEqual(cover_named_spoilers(text, self.NAMES), text)

    def test_a_shorter_mark_does_not_close_a_longer_fence(self):
        four = "`" * 4
        text = f"{four}bonsai-spoiler\nSoul Master is in here.\n{self.B}\nStill Soul Master.\n{four}\nDone."
        self.assertEqual(cover_named_spoilers(text, self.NAMES), text)

    def test_a_longer_mark_closes_a_fence(self):
        text = f"{self.T}bonsai-spoiler\nSecret.\n{'~' * 5}\nSoul Master is next."
        out = cover_named_spoilers(text, self.NAMES)
        self.assertIn(f"{self.B}bonsai-spoiler", out)

    def test_a_tilde_block_with_no_closer_runs_to_the_end_and_stays_alone(self):
        text = f"Intro.\n{self.T}bonsai-spoiler\nSoul Master returns."
        self.assertEqual(cover_named_spoilers(text, self.NAMES), text)

    def test_a_still_open_tilde_hidden_block_is_held_back_while_streaming(self):
        raw = f"Intro.\n{self.T}bonsai-spoiler\nThe Soul Master fight is all about timing."
        out = cover_named_spoilers(raw, self.NAMES, hold_back_incomplete_trailing=True)
        self.assertNotIn("Soul Master", out)
        self.assertNotIn("timing", out)

    def test_a_half_typed_tilde_opener_never_shows_raw_while_streaming(self):
        raw = "He comes back through the roof.\n\n~~~bon"
        out = cover_named_spoilers(raw, self.NAMES, hold_back_incomplete_trailing=True)
        self.assertNotIn("~~~bon", out)
        self.assertIn("He comes back through the roof.", out)

    def test_streaming_a_tilde_block_letter_by_letter_never_shows_the_name_before_it_closes(self):
        raw = f"Intro line.\n\n{self.T}bonsai-spoiler\nThe Soul Master fight is all about timing.\n{self.T}\nOutro."
        closed_at = raw.index(f"timing.\n{self.T}") + len("timing.\n") + len(self.T)
        for i in range(1, len(raw) + 1):
            out = cover_named_spoilers(raw[:i], self.NAMES, hold_back_incomplete_trailing=True)
            if i < closed_at:
                self.assertNotIn("Soul Master", out, f"after {i} letters: {out!r}")
            self.assertNotIn(f"{self.B}bonsai-spoiler", out, f"a second cover after {i} letters: {out!r}")
        self.assertEqual(cover_named_spoilers(raw, self.NAMES), raw)

    def test_a_tilde_code_block_is_opaque_too(self):
        text = f"{self.T}python\nprint('Soul Master')\n{self.T}\nPlain."
        self.assertEqual(cover_named_spoilers(text, self.NAMES), text)

    def test_backtick_behaviour_is_unchanged(self):
        text = f"{self.B}bonsai-spoiler\nSoul Master returns.\n{self.B}\nGeneral advice follows."
        self.assertEqual(cover_named_spoilers(text, self.NAMES), text)


class CoverThinkingTextTests(unittest.TestCase):
    """D112 #7 leak fix: THINKING-SPOILER-01, measured live on the Deck 2026-09-26. The live
    thinking line and the saved reasoning shown in the fold afterwards both named a protected
    boss in plain words in 4 of 6 tries, plus raw ```bonsai-spoiler``` marker text twice. The
    fragments below are the literal text captured in the session's scratchpad
    L1-2-HK-C.jsonl and L1-2-HK-named.jsonl, not a hand-typed approximation.
    """

    def test_a_real_captured_thinking_line_naming_the_boss_is_redacted(self):
        # L1-2-HK-C.jsonl t=8237, verbatim.
        thinking = (
            '2.  **Identify Context/Game:** The context is clearly Hollow Knight, and the '
            'specific boss described matches the "Soul Master" from the local knowledge base.\n'
            '3.  **Determine Mode:**'
        )
        out = cover_thinking_text(thinking, ["Soul Master"])
        self.assertNotIn("Soul Master", out)
        self.assertIn("[hidden]", out)
        self.assertIn("3.  **Determine Mode:**", out)

    def test_a_real_captured_raw_fence_marker_is_stripped(self):
        # L1-2-HK-C.jsonl t=11594, verbatim -- the model's own thinking quoting its
        # instructions' fence syntax back at itself.
        thinking = (
            "ential), and exact puzzle solutions in plain text unless essential for branching.\n"
            "    *   If a spoiler is unavoidable, wrap it in ```bonsai-spoiler ... ```.\n"
            "    *   NAMED-ENTITY CONS"
        )
        out = cover_thinking_text(thinking, ["Soul Master"])
        self.assertNotIn("```", out)

    def test_a_growing_name_in_thinking_is_held_back_while_streaming(self):
        out = cover_thinking_text(
            "3.  **Consult Knowledge Base:** Boss: Soul Ma",
            ["Soul Master"],
            hold_back_incomplete_trailing=True,
        )
        self.assertNotIn("Soul Ma", out)

    def test_no_protected_names_leaves_thinking_untouched(self):
        thinking = "1.  **Analyze the Request:** The user wants general performance tips."
        self.assertEqual(cover_thinking_text(thinking, ["Soul Master"]), thinking)

    def test_empty_thinking_is_returned_unchanged(self):
        self.assertEqual(cover_thinking_text("", ["Soul Master"]), "")


if __name__ == "__main__":
    unittest.main()
