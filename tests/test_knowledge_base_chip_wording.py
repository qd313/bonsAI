"""The question a chip puts in the box, for the five newer kinds of note (plan 17, OV-1.4).

A chip is built from a note's kind and name. A kind the chip code did not know fell through to
"What should I know about X?", which reads as though the library does not know what it is
holding. Plan 103 lane V1 gives the versus, co-op, callout, survival and realism kinds their own
wording, short enough to sit on a chip and true for any name a note can have.
"""

import unittest

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.knowledge import knowledge_base_chips as chips  # noqa: E402
import test_knowledge_base_chip_pool_size as pool  # noqa: E402


class NewKindChipWordingTests(unittest.TestCase):
    def test_each_of_the_five_kinds_has_its_own_wording(self):
        cases = [
            # A role card, named the way the seven "Playing as" notes are, reads as a question
            # about playing that role in versus -- not "How do I play Playing as the Smoker".
            ("versus", "Playing as the Smoker", "How do I play as the Smoker in versus?"),
            ("versus", "No Mercy versus", "Tips for No Mercy versus?"),
            ("versus", "Boomer and Smoker combos", "Versus tips for Boomer and Smoker combos?"),
            ("coop", "Reviving a teammate", "Co-op tips for Reviving a teammate?"),
            ("coop", "Co-op in Dark Carnival", "Tips for Co-op in Dark Carnival?"),
            ("callout", "Death charge spots", "What are the callouts for Death charge spots?"),
            ("survival", "The Mall atrium", "Survival tips for The Mall atrium?"),
            ("survival", "Survival mode", "Tips for Survival mode?"),
            ("realism", "Weapon drops", "Realism tips for Weapon drops?"),
            ("realism", "Realism mode", "Tips for Realism mode?"),
        ]
        for kind, name, want in cases:
            with self.subTest(kind=kind, name=name):
                self.assertEqual(chips._curtail_section_to_chip(kind, name), want)

    def test_none_of_the_five_falls_through_to_the_unknown_kind_wording(self):
        for kind in ("versus", "coop", "callout", "survival", "realism"):
            with self.subTest(kind=kind):
                got = chips._curtail_section_to_chip(kind, "Anything")
                self.assertNotEqual(got, "What should I know about Anything?")
                self.assertLessEqual(len(got), 80)
                self.assertTrue(got.endswith("?"))

    def test_a_long_name_is_still_cut_to_a_chip_that_ends_in_a_question_mark(self):
        name = "Survivor team positions on the second floor of the mall atrium before the horde"
        got = chips._curtail_section_to_chip("callout", name)
        self.assertLessEqual(len(got), 80)
        self.assertTrue(got.endswith("?"))

    def test_the_chip_a_player_sees_for_a_versus_note_reads_as_the_new_wording(self):
        """The level the Deck looks at: the chip list for a running game, built from a library
        whose only strategy note is a versus one."""
        # The neighbouring test file's own setup: a small library on disk, then the chip list.
        strategy = pool.ChipPoolSizeTests._chips_for(self, [("versus", "Playing as the Tank")])
        self.assertEqual(strategy, ["How do I play as the Tank in versus?"])


if __name__ == "__main__":
    unittest.main()
