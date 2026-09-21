import unittest

from backend.services.prompt_budget_service import (
    ANSWER_FLOOR_TOKENS,
    CARDS_FLOOR_TOKENS,
    MEMORY_FLOOR_TOKENS,
    THINKING_SHARE_CEILING,
    plan_prompt_budget,
    tokens_worth_waiting_for,
)

# The real shapes, measured on the Deck 2026-09-20 with the game's cards attached.
ROOM = 16384
RULES_STRATEGY = 1098
RULES_SPEED = 566
CARDS_STRATEGY = 1410
QUESTION = 9


def _plan(**over):
    base = dict(
        room_tokens=ROOM,
        rules_tokens=RULES_STRATEGY,
        question_tokens=QUESTION,
        answer_wanted=1600,
        thinking_wanted=512,
        cards_wanted=CARDS_STRATEGY,
        memory_wanted=1500,
    )
    base.update(over)
    return plan_prompt_budget(**base)


class EverythingFitsTests(unittest.TestCase):
    def test_a_plan_never_promises_more_than_the_room_holds(self):
        """Going one token over does not cost the excess -- measured on the Deck, it costs about
        half of everything sent, and the half that goes is the beginning. So a plan that adds up
        to more than the room is the one failure this file exists to prevent."""
        for room in (1000, 2000, 4096, 8192, 16384, 32768):
            for rules in (566, 1098, 1500, 3000):
                for thinking in (0, 512, 1024, 9000):
                    for cards in (0, 400, 1410, 5000):
                        plan = _plan(
                            room_tokens=room,
                            rules_tokens=rules,
                            thinking_wanted=thinking,
                            cards_wanted=cards,
                        )
                        total = plan.prompt_tokens + plan.thinking_tokens + plan.answer_tokens
                        if plan.fits:
                            self.assertLessEqual(
                                total, room, f"room={room} rules={rules} plan={plan.as_dict()}"
                            )

    def test_the_one_case_that_cannot_fit_says_so_instead_of_pretending(self):
        """When the rules and the question alone fill the room there is no plan to make. That has
        to be reported, not hidden -- the alternative is a confident answer with nothing behind
        it and only a log line that noticed."""
        plan = _plan(room_tokens=1000, rules_tokens=1500)
        self.assertFalse(plan.fits)
        self.assertTrue(plan.left_out)
        self.assertEqual(plan.cards_tokens, 0)
        self.assertEqual(plan.memory_tokens, 0)


class NothingCanStarveTheAnswerTests(unittest.TestCase):
    def test_a_huge_pile_of_cards_cannot_make_the_reply_short(self):
        """The maintainer ruled this out by name: squeezing the answer to make room for
        everything else is not the answer. A reply that needs to be thorough cannot be cut short
        because something unrelated grew."""
        roomy = _plan(cards_wanted=200, memory_wanted=200)
        buried = _plan(cards_wanted=50_000, memory_wanted=50_000)
        self.assertEqual(buried.answer_tokens, roomy.answer_tokens)
        self.assertEqual(buried.answer_tokens, 1600)

    def test_the_answer_keeps_its_floor_even_in_a_tight_room(self):
        plan = _plan(room_tokens=4096, cards_wanted=50_000, memory_wanted=50_000)
        self.assertGreaterEqual(plan.answer_tokens, ANSWER_FLOOR_TOKENS)

    def test_a_runaway_thinking_setting_cannot_eat_the_answer_or_the_chat(self):
        """The maintainer's words: a runaway thinking budget can never eat the answer, the rules
        or the chat. A person who turns thinking on is asking for reasoning headroom, not for
        their answer to disappear.

        Written first as "thinking must not exceed THINKING_SHARE_CEILING of the room", which
        proved nothing: the expected value was worked out from the very constant being tested, so
        raising the ceiling to 99 times the room moved the assertion with it and the test stayed
        green. The number is written out here instead, and what the ceiling is actually FOR is
        checked as well -- without it, thinking takes everything above the answer's floor and the
        cards and the chat get nothing at all."""
        plan = _plan(room_tokens=4096, thinking_wanted=100_000, cards_wanted=5000, memory_wanted=5000)
        self.assertLessEqual(plan.thinking_tokens, 1024)  # a quarter of 4,096, written out
        self.assertGreaterEqual(plan.answer_tokens, ANSWER_FLOOR_TOKENS)
        self.assertGreaterEqual(plan.cards_tokens, CARDS_FLOOR_TOKENS)
        self.assertGreaterEqual(plan.memory_tokens, MEMORY_FLOOR_TOKENS)
        self.assertIn("some of the thinking room", plan.left_out)

    def test_the_ceiling_is_a_quarter_of_the_room_whatever_the_room_is(self):
        """The share, not a fixed number -- a bigger room means more reasoning headroom, and a
        small one still leaves three quarters for everything else."""
        self.assertEqual(THINKING_SHARE_CEILING, 0.25)
        # Exactly the quarter, not merely under it. "At most a quarter" is also satisfied by a
        # fixed 1,024, which is the thing this is meant to rule out: a fixed number gives a big
        # room no more reasoning headroom than a small one.
        for room, expected in ((4096, 1024), (8192, 2048), (16384, 4096)):
            plan = _plan(room_tokens=room, thinking_wanted=100_000)
            self.assertEqual(plan.thinking_tokens, expected, f"room={room}")

    def test_thinking_off_takes_nothing_and_is_not_reported_as_lost(self):
        plan = _plan(thinking_wanted=0)
        self.assertEqual(plan.thinking_tokens, 0)
        self.assertEqual(plan.left_out, [])


class SharingWhatIsLeftTests(unittest.TestCase):
    def test_each_optional_part_gets_a_floor_before_either_gets_more(self):
        plan = _plan(room_tokens=4096, cards_wanted=50_000, memory_wanted=50_000)
        self.assertGreaterEqual(plan.cards_tokens, CARDS_FLOOR_TOKENS)
        self.assertGreaterEqual(plan.memory_tokens, MEMORY_FLOOR_TOKENS)

    def test_a_part_that_wants_nothing_takes_nothing_and_is_not_called_lost(self):
        plan = _plan(memory_wanted=0)
        self.assertEqual(plan.memory_tokens, 0)
        self.assertNotIn("the chat's memory", plan.left_out)

    def test_the_chat_memory_is_seated_before_the_game_cards(self):
        """Cards are looked up again on the next question. A conversation that gets dropped is
        gone for good, so when only one floor fits, the memory takes it."""
        # Sized so exactly one floor can be seated: 2,009 of room, less 1,000 of rules, less the
        # question, less the answer's 600 floor, leaves 400 -- enough for the memory's 250 but
        # not for the cards' 300 on top of it.
        plan = plan_prompt_budget(
            room_tokens=2009,
            rules_tokens=1000,
            question_tokens=QUESTION,
            answer_wanted=1600,
            thinking_wanted=0,
            cards_wanted=5000,
            memory_wanted=5000,
        )
        self.assertGreaterEqual(plan.memory_tokens, MEMORY_FLOOR_TOKENS)
        self.assertEqual(plan.cards_tokens, 0)
        self.assertIn("the game's cards", plan.left_out)

    def test_neither_part_is_ever_given_more_than_it_asked_for(self):
        plan = _plan(cards_wanted=120, memory_wanted=80)
        self.assertEqual(plan.cards_tokens, 120)
        self.assertEqual(plan.memory_tokens, 80)

    def test_what_was_left_out_is_named_rather_than_silently_missing(self):
        plan = plan_prompt_budget(
            room_tokens=2009,
            rules_tokens=1000,
            question_tokens=QUESTION,
            answer_wanted=1600,
            thinking_wanted=0,
            cards_wanted=5000,
            memory_wanted=5000,
        )
        self.assertTrue(any("cards" in note for note in plan.left_out))


class HowLongAPersonWaitsTests(unittest.TestCase):
    def test_a_big_room_is_not_an_invitation_to_fill_it(self):
        """Reading the question is the slow part: measured on the Deck at about 1.75 seconds for
        every 1,000 tokens. Filling a 16,384-token room would be nearly half a minute before the
        first word, so the question is held to what is worth waiting for, not to what fits."""
        plan = _plan(cards_wanted=50_000, memory_wanted=50_000)
        self.assertLess(plan.prompt_tokens, ROOM // 2)
        self.assertLessEqual(plan.seconds_to_first_word, 9.0)

    def test_a_longer_wait_allowed_means_more_of_the_chat_carried(self):
        patient = _plan(cards_wanted=50_000, memory_wanted=50_000, seconds_worth_waiting=20)
        hurried = _plan(cards_wanted=50_000, memory_wanted=50_000, seconds_worth_waiting=4)
        self.assertGreater(patient.memory_tokens, hurried.memory_tokens)

    def test_todays_biggest_question_is_not_made_smaller_by_the_wait_limit(self):
        """The limit is a ceiling on growth, not a cut. Expert with the game's cards attached
        measured 2,925 tokens on the Deck, and must come through untouched."""
        plan = plan_prompt_budget(
            room_tokens=ROOM,
            rules_tokens=RULES_SPEED,
            question_tokens=QUESTION,
            answer_wanted=1200,
            thinking_wanted=512,
            cards_wanted=2337,
            memory_wanted=0,
        )
        self.assertEqual(plan.cards_tokens, 2337)
        self.assertEqual(plan.answer_tokens, 1200)
        self.assertEqual(plan.left_out, [])

    def test_the_wait_limit_is_a_real_number_of_tokens(self):
        self.assertGreater(tokens_worth_waiting_for(8), 4000)
        self.assertLess(tokens_worth_waiting_for(8), 5000)
        self.assertEqual(tokens_worth_waiting_for(0), 0)


if __name__ == "__main__":
    unittest.main()
