import unittest

from backend.services.chat_memory_service import (
    CANCELLED_ANSWER_TEXT,
    HIDDEN_NOTE_PLACEHOLDER,
    MAX_REMEMBERED_ANSWER_CHARS,
    MEMORY_SUMMARY_HEADER,
    MEMORY_TRUNCATED_NOTE,
    build_chat_memory,
    plan_and_build_chat_memory,
    strip_fenced_blocks,
    turns_not_yet_summarized,
)
from backend.services.token_accounting_service import (
    estimate_tokens_from_chars,
    reset_token_accounting,
)

SPOILER_ANSWER = (
    "Morpha hides inside a water tentacle. Use the Longshot to pull the nucleus out.\n\n"
    "```bonsai-spoiler\n"
    "The Water Temple is where you meet Dark Link, and afterwards Sheik reveals her identity.\n"
    "```\n\n"
    "Keep the Iron Boots off."
)


def _chat(pairs):
    turns = []
    for question, answer in pairs:
        turns.append({"role": "user", "text": question})
        turns.append({"role": "assistant", "text": answer})
    return turns


class HidingWhatWasHiddenTests(unittest.TestCase):
    def setUp(self) -> None:
        reset_token_accounting()

    def test_a_spoiler_the_ai_hid_never_comes_back_as_plain_text(self):
        """The worst thing this feature could do. An answer that fenced something off did that
        because the person had not asked to know it; carrying it into the next question as plain
        text would hand it straight back to the AI to repeat."""
        memory = build_chat_memory(_chat([("how do i beat morpha", SPOILER_ANSWER)]), 2000)
        self.assertNotIn("Dark Link", memory.text)
        self.assertNotIn("Sheik", memory.text)
        self.assertNotIn("bonsai-spoiler", memory.text)
        self.assertEqual(memory.hidden_notes_removed, 1)

    def test_what_was_around_the_spoiler_is_still_remembered(self):
        """Hiding the fenced part must not throw the whole answer away -- the rest is the advice
        the person actually got."""
        memory = build_chat_memory(_chat([("how do i beat morpha", SPOILER_ANSWER)]), 2000)
        self.assertIn("Longshot", memory.text)
        self.assertIn(HIDDEN_NOTE_PLACEHOLDER, memory.text)

    def test_the_screen_only_blocks_go_too(self):
        """The branch picker and the checklist are instructions to the screen, not things anybody
        said. Carrying their raw contents would be noise at best and confusing at worst."""
        answer = 'Pick one.\n```bonsai-strategy-branches\n{"options":[{"id":"n","label":"North"}]}\n```\nUp to you.'
        cleaned, removed = strip_fenced_blocks(answer)
        self.assertNotIn("North", cleaned)
        self.assertNotIn("bonsai-strategy-branches", cleaned)
        self.assertEqual(removed, 1)
        self.assertIn("Up to you.", cleaned)

    def test_an_unclosed_fence_is_still_removed(self):
        """A reply cut off mid-fence -- which happens when the model runs out of room -- must not
        leak the part that did arrive."""
        answer = "Here is the plan.\n```bonsai-spoiler\nThe ending is that"
        cleaned, removed = strip_fenced_blocks(answer)
        self.assertNotIn("ending", cleaned)
        self.assertEqual(removed, 1)

    def test_an_answer_with_no_fence_is_left_exactly_alone(self):
        plain = "Put the Iron Boots on to sink, then take them off."
        cleaned, removed = strip_fenced_blocks(plain)
        self.assertEqual(cleaned, plain)
        self.assertEqual(removed, 0)


class FittingTheAllowanceTests(unittest.TestCase):
    def setUp(self) -> None:
        reset_token_accounting()

    def test_it_never_goes_over_what_it_was_given(self):
        """The allowance comes from the budget, and the budget's whole job is that the question
        fits. A memory that ignored its allowance would put the question back over the cliff."""
        chat = _chat([(f"question number {i}", f"answer number {i} " * 40) for i in range(30)])
        for allowance in (250, 400, 800, 1600, 5000):
            memory = build_chat_memory(chat, allowance)
            self.assertLessEqual(
                estimate_tokens_from_chars(len(memory.text)), allowance, f"allowance={allowance}"
            )

    def test_the_newest_exchanges_are_the_ones_kept(self):
        """A follow-up is almost always about what was just said."""
        chat = _chat([(f"question {i}", f"answer {i}") for i in range(20)])
        memory = build_chat_memory(chat, 300)
        self.assertIn("question 19", memory.text)
        self.assertNotIn("question 0", memory.text)

    def test_what_was_left_behind_is_counted_and_said(self):
        """Losing part of a conversation is allowed. Losing it silently is not."""
        chat = _chat([(f"question {i}", f"answer {i}") for i in range(20)])
        memory = build_chat_memory(chat, 300)
        self.assertGreater(memory.turns_left_out, 0)
        self.assertIn(MEMORY_TRUNCATED_NOTE, memory.text)

    def test_a_chat_that_fits_whole_says_nothing_was_left_out(self):
        memory = build_chat_memory(_chat([("short question", "short answer")]), 2000)
        self.assertEqual(memory.turns_left_out, 0)
        self.assertNotIn(MEMORY_TRUNCATED_NOTE, memory.text)

    def test_no_allowance_and_no_chat_both_give_nothing(self):
        self.assertEqual(build_chat_memory(_chat([("q", "a")]), 0).text, "")
        self.assertEqual(build_chat_memory([], 2000).text, "")
        self.assertEqual(build_chat_memory(None, 2000).text, "")

    def test_one_enormous_answer_cannot_wipe_out_the_whole_memory(self):
        """The newest answer is read first, so without a cap one very long reply uses the whole
        allowance before anything else is considered — and a chat whose last answer happened to
        be long would remember nothing at all.

        Written first with the long answer OLDEST, and with the line-length check measured
        against the cap constant itself. That proved nothing twice over: the oldest turn is read
        last so it never competed for the allowance, and the assertion moved with the very
        constant it was meant to be testing. The cap is written out as a number here."""
        chat = _chat([("first", "short answer"), ("second", "short answer"), ("third", "x " * 4000)])
        memory = build_chat_memory(chat, 2000)
        self.assertIn("third", memory.text)
        self.assertIn("second", memory.text)
        self.assertIn("first", memory.text)
        longest = max(len(line) for line in memory.text.split("\n"))
        self.assertLess(longest, 500)


class ReadsLikeAConversationTests(unittest.TestCase):
    def setUp(self) -> None:
        reset_token_accounting()

    def test_it_comes_out_oldest_first(self):
        """It is walked backwards to decide what fits, then put back in the order it happened --
        a conversation read bottom to top is not a conversation."""
        chat = _chat([("first question", "first answer"), ("second question", "second answer")])
        memory = build_chat_memory(chat, 2000)
        self.assertLess(memory.text.index("first question"), memory.text.index("second question"))

    def test_the_words_the_person_saw_are_the_words_remembered(self):
        """A branch pick sends the AI a composed line while the screen showed something shorter.
        The memory is about the conversation a person had, so it uses what they saw."""
        turns = [
            {
                "role": "user",
                "text": "[Strategy follow-up] I'm at: the central pillar",
                "display_text": "I'm at: the central pillar",
            },
            {"role": "assistant", "text": "Head east from there."},
        ]
        memory = build_chat_memory(turns, 2000)
        self.assertIn("I'm at: the central pillar", memory.text)
        self.assertNotIn("[Strategy follow-up]", memory.text)

    def test_an_empty_answer_is_skipped_rather_than_remembered_as_blank(self):
        turns = [
            {"role": "user", "text": "a question"},
            {"role": "assistant", "text": "```bonsai-spoiler\nonly a hidden note\n```"},
            {"role": "user", "text": "another question"},
            {"role": "assistant", "text": "a real answer"},
        ]
        memory = build_chat_memory(turns, 2000)
        self.assertIn("a real answer", memory.text)
        self.assertNotIn("only a hidden note", memory.text)


if __name__ == "__main__":
    unittest.main()


class TheLiveQuestionIsNotEchoedBackTests(unittest.TestCase):
    """The question being asked now is already saved in the chat when the Ask is accepted, before
    the answer starts. Read straight back it would reach the model as "You asked: ..." immediately
    before the very same question."""

    def setUp(self) -> None:
        reset_token_accounting()

    def _memory(self, turns):
        _plan, memory = plan_and_build_chat_memory(
            system_content="rules and things",
            question="and what about the boots?",
            chat_turns=turns,
            ask_mode="speed",
            think_effort="off",
            room_tokens=16384,
        )
        return memory

    def test_the_question_in_flight_is_dropped(self):
        memory = self._memory([
            {"role": "user", "text": "how do i beat morpha"},
            {"role": "assistant", "text": "Use the Longshot on the nucleus."},
            {"role": "user", "text": "and what about the boots?"},
        ])
        self.assertIn("how do i beat morpha", memory.text)
        self.assertNotIn("and what about the boots?", memory.text)
        self.assertEqual(memory.turns_carried, 2)

    def test_a_chat_that_is_only_the_question_in_flight_has_no_memory_yet(self):
        memory = self._memory([{"role": "user", "text": "and what about the boots?"}])
        self.assertEqual(memory.text, "")
        self.assertEqual(memory.turns_carried, 0)

    def test_a_chat_ending_on_an_answer_keeps_all_of_it(self):
        memory = self._memory([
            {"role": "user", "text": "how do i beat morpha"},
            {"role": "assistant", "text": "Use the Longshot on the nucleus."},
        ])
        self.assertEqual(memory.turns_carried, 2)

    def test_first_question_plans_against_the_real_room(self):
        """The two sizing errors (plan 68 section 1): the very first question of a session must
        plan against the room the answer will really ask for (16,384 on the Deck), not the
        server's own 4,096 default -- the caller decides the room now, this function no longer
        guesses it."""
        plan, _memory = plan_and_build_chat_memory(
            system_content="rules",
            question="q",
            chat_turns=[],
            ask_mode="speed",
            think_effort="off",
            room_tokens=16384,
        )
        self.assertEqual(plan.room_tokens, 16384)


class StoppedAnswersAreSkippedTests(unittest.TestCase):
    def setUp(self) -> None:
        reset_token_accounting()

    # A chat with one stopped question in it, shared by the tests below.
    STOPPED_CHAT = [
        {"role": "user", "text": "how do i beat morpha"},
        {"role": "assistant", "text": CANCELLED_ANSWER_TEXT},
        {"role": "user", "text": "and what about the boots"},
        {"role": "assistant", "text": "Take the Iron Boots off to swim up."},
    ]

    def test_a_stopped_answer_is_skipped_by_the_memory_builder(self):
        """A stopped answer is saved as the placeholder text, not something anybody said. It must
        not come back as if the AI had actually replied."""
        memory = build_chat_memory(self.STOPPED_CHAT, 2000)
        self.assertNotIn(CANCELLED_ANSWER_TEXT, memory.text)
        self.assertIn("Iron Boots", memory.text)

    def test_a_skipped_stopped_answer_is_not_counted_as_left_behind(self):
        """Skipping a stopped answer on purpose is not running out of room: nothing is left behind,
        and the block must not claim earlier turns are missing (plan 68, seen on the Deck
        2026-09-25: this count made a chat sum itself up again after every stopped question)."""
        memory = build_chat_memory(self.STOPPED_CHAT, 2000)
        self.assertEqual(memory.turns_left_out, 0)
        self.assertNotIn(MEMORY_TRUNCATED_NOTE, memory.text)


class SummaryInTheMemoryBlockTests(unittest.TestCase):
    def setUp(self) -> None:
        reset_token_accounting()

    def _turns(self):
        return [
            {"id": "t1", "role": "user", "text": "how do i beat morpha"},
            {"id": "t2", "role": "assistant", "text": "Use the Longshot on the nucleus."},
            {"id": "t3", "role": "user", "text": "what about the water temple boots"},
            {"id": "t4", "role": "assistant", "text": "Take the Iron Boots off to swim up."},
            {"id": "t5", "role": "user", "text": "and after that"},
            {"id": "t6", "role": "assistant", "text": "Head to the Shadow Temple next."},
        ]

    def test_a_summary_lists_only_the_turns_after_its_own_coverage(self):
        summary = {"text": "Been through Water Temple.", "covers_through_turn_id": "t4"}
        memory = build_chat_memory(self._turns(), 2000, summary=summary)
        self.assertIn(MEMORY_SUMMARY_HEADER, memory.text)
        self.assertIn("Been through Water Temple.", memory.text)
        self.assertIn("Shadow Temple", memory.text)
        self.assertNotIn("Longshot", memory.text)
        self.assertNotIn("Iron Boots", memory.text)

    def test_a_dropped_coverage_id_means_no_turn_is_covered(self):
        """The 200-turn cap can drop the very turn a summary says it covers through. When that
        happens every surviving turn is chronologically after it already, so none of them are
        skipped as "already covered" -- they all go back to being carried word for word."""
        summary = {"text": "Old ground covered.", "covers_through_turn_id": "gone-from-disk"}
        memory = build_chat_memory(self._turns(), 4000, summary=summary)
        self.assertIn("Old ground covered.", memory.text)
        self.assertIn("Longshot", memory.text)
        self.assertIn("Iron Boots", memory.text)
        self.assertIn("Shadow Temple", memory.text)

    def test_turns_not_yet_summarized_matches_the_memory(self):
        summary = {"text": "x", "covers_through_turn_id": "t2"}
        rest = turns_not_yet_summarized(self._turns(), summary)
        self.assertEqual([t["id"] for t in rest], ["t3", "t4", "t5", "t6"])

    def test_turns_not_yet_summarized_with_no_summary_is_everything(self):
        self.assertEqual(len(turns_not_yet_summarized(self._turns(), None)), 6)
