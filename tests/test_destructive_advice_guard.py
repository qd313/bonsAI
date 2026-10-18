"""Tests for the output-side destructive advice guard."""

import unittest

from backend.answer.destructive_advice_guard import (
    append_destructive_advice_notice,
    check_destructive_advice,
)


class DestructiveAdviceGuardCatchesDangerousCasesTests(unittest.TestCase):
    def test_flags_compatdata_deletion_without_backup(self):
        result = check_destructive_advice(
            "Just delete the compatdata folder for that AppID and relaunch the game."
        )
        self.assertTrue(result["flagged"])
        self.assertTrue(result["signals"])
        self.assertFalse(result["has_backup_mention"])

    def test_flags_wine_prefix_wipe_without_backup(self):
        result = check_destructive_advice(
            "You should wipe the wine prefix to fix that crash."
        )
        self.assertTrue(result["flagged"])

    def test_flags_proton_prefix_removal_without_backup(self):
        result = check_destructive_advice(
            "Remove the proton prefix entirely and Steam will rebuild it on next launch."
        )
        self.assertTrue(result["flagged"])

    def test_flags_save_data_deletion_without_backup(self):
        result = check_destructive_advice(
            "To reset your progress, delete your save data and restart the game."
        )
        self.assertTrue(result["flagged"])

    def test_flags_when_backup_mentioned_in_different_sentence_but_no_backup_word_at_all(self):
        # No backup language anywhere in the reply -- still flagged even though the destructive
        # sentence is not the first sentence.
        result = check_destructive_advice(
            "That crash is a known Proton issue. Erase the compatdata directory for this "
            "AppID to clear the corrupted config."
        )
        self.assertTrue(result["flagged"])

    # --- DESTRUCT-ADVICE-01, found on device 2026-08-27 ---------------------------------
    #
    # Every positive case above uses a bare imperative verb ("delete", "wipe", "Erase") next
    # to a target that spells out "compatdata", "wine prefix" or "save data". The reply that
    # got past the guard on device did neither, and each miss is enough on its own.

    def test_flags_the_exact_reply_that_got_past_the_guard_on_device(self):
        # Verbatim from ~/Desktop/bonsAI_logs/bonsai-ask-trace-2026-08-28.md, question
        # "my proton prefix is broken how do i start fresh", gemma4:e2b-it-qat. The trace's
        # "Final UI text" section carried no safety notice at all.
        result = check_destructive_advice(
            "Alright, listen up! So you're having trouble with your Proton prefix getting "
            "messed up? Don't sweat it, mate. We can sort this out.\n\n"
            "First off, check ProtonDB for any known launch options or community fixes "
            "related to your specific game. That's where folks usually drop the good stuff. "
            "If that doesn't cut it, sometimes just giving it a fresh start helps. Try "
            "deleting the existing prefix folder and letting Steam rebuild it. Keep an eye "
            "on those logs if you need more detail."
        )
        self.assertTrue(result["flagged"])
        self.assertTrue(any("prefix folder" in s for s in result["signals"]))

    def test_flags_an_ing_form_of_the_verb(self):
        # "deleting" never matched: the pattern is \bdelete\b, and the "ing" leaves no word
        # boundary after "delete". The same held for removing/wiping/erasing.
        result = check_destructive_advice("Try deleting your save data and starting over.")
        self.assertTrue(result["flagged"])

    def test_flags_prefix_without_the_word_proton_or_wine(self):
        # The target pattern required "(wine|proton) prefix". On a Deck a bare "prefix" is
        # the same folder -- the model simply does not repeat the brand in every sentence.
        result = check_destructive_advice("Just remove the prefix folder and relaunch.")
        self.assertTrue(result["flagged"])

    def test_flags_other_inflections(self):
        for text in (
            "I removed the compatdata folder and it fixed it -- do the same.",
            "Wiping your save games will clear the corrupt entry.",
            "Getting rid of the compatdata directory usually sorts it.",
        ):
            with self.subTest(text=text):
                self.assertTrue(check_destructive_advice(text)["flagged"])

    def test_flags_a_bare_prefix_once_the_reply_has_named_proton(self):
        # The shape of the device reply: the brand is stated once at the top, and the sentence
        # carrying the advice just says "the prefix". The verb still has to share a sentence
        # with the word -- only the target vocabulary widens.
        result = check_destructive_advice(
            "That is a classic Proton problem. Erasing the prefix is the usual fix here."
        )
        self.assertTrue(result["flagged"])
        self.assertTrue(any("Erasing the prefix" in s for s in result["signals"]))

    def test_notice_appended_when_flagged(self):
        check = check_destructive_advice("Delete your save data to start over.")
        out = append_destructive_advice_notice("Delete your save data to start over.", check)
        self.assertIn("bonsAI safety check", out)
        self.assertIn("back up the folder", out)


class DestructiveAdviceGuardIgnoresInnocentCasesTests(unittest.TestCase):
    def test_does_not_flag_when_backup_step_present(self):
        result = check_destructive_advice(
            "Back up your save data first, then delete the compatdata folder and relaunch."
        )
        self.assertFalse(result["flagged"])
        self.assertTrue(result["has_backup_mention"])

    def test_does_not_flag_backup_phrased_as_make_a_copy(self):
        result = check_destructive_advice(
            "Make a copy of your save data somewhere safe, then delete the old compatdata folder."
        )
        self.assertFalse(result["flagged"])

    def test_does_not_flag_removing_a_mod(self):
        result = check_destructive_advice(
            "Remove the mod from your Steam Workshop subscriptions and restart Steam."
        )
        self.assertFalse(result["flagged"])
        self.assertEqual(result["signals"], [])

    def test_does_not_flag_deleting_a_shortcut(self):
        result = check_destructive_advice(
            "You can delete the desktop shortcut without affecting the game install."
        )
        self.assertFalse(result["flagged"])

    def test_does_not_flag_the_word_model_as_remove(self):
        # Regression guard for the same false-positive class the plan calls out for the mod
        # keyword gate (mod -> model) -- "remove" alone must not fire without a target.
        result = check_destructive_advice(
            "You could remove one of the smaller background models to free up disk space."
        )
        self.assertFalse(result["flagged"])

    def test_does_not_flag_advice_against_deleting(self):
        result = check_destructive_advice(
            "You don't need to delete your save data -- this bug is unrelated to saves."
        )
        self.assertFalse(result["flagged"])

    def test_does_not_flag_should_not_delete(self):
        result = check_destructive_advice(
            "You should not delete the compatdata folder for this -- try verifying "
            "game files in Steam instead."
        )
        self.assertFalse(result["flagged"])

    def test_does_not_flag_plain_troubleshooting_reply(self):
        result = check_destructive_advice(
            "Try lowering the TDP to 8 watts and see if the crash still happens. "
            "If it does, check the Proton version in the game's compatibility settings."
        )
        self.assertFalse(result["flagged"])
        self.assertEqual(result["signals"], [])

    # --- false positives the DESTRUCT-ADVICE-01 widening could have introduced ----------
    #
    # Two things got looser: the verb now matches its -ing/-s/-ed forms, and "prefix" counts
    # as a target on its own. These pin the edges of both.

    def test_does_not_flag_a_prefix_in_the_text_sense(self):
        result = check_destructive_advice(
            "Remove the bonsai- prefix from the setting name and it will match again."
        )
        self.assertFalse(result["flagged"])

    def test_does_not_flag_an_ing_verb_with_no_destructive_target(self):
        result = check_destructive_advice(
            "Deleting the desktop shortcut is safe -- it does not touch the install."
        )
        self.assertFalse(result["flagged"])

    def test_does_not_flag_advice_against_deleting_in_an_ing_form(self):
        # The negation check has to keep working now that the verb form is wider.
        result = check_destructive_advice(
            "You should not be deleting your save data for this -- verify the files instead."
        )
        self.assertFalse(result["flagged"])

    def test_still_does_not_flag_when_a_backup_is_mentioned(self):
        result = check_destructive_advice(
            "Back up the folder first, then try deleting the prefix and relaunching."
        )
        self.assertFalse(result["flagged"])

    def test_notice_not_appended_when_not_flagged(self):
        text = "Lower the TDP and try again."
        check = check_destructive_advice(text)
        self.assertEqual(append_destructive_advice_notice(text, check), text)

    def test_empty_text_not_flagged(self):
        result = check_destructive_advice("")
        self.assertFalse(result["flagged"])
        self.assertEqual(result["signals"], [])


if __name__ == "__main__":
    unittest.main()
