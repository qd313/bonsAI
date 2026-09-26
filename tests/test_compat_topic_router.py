"""
Title: Compat topic router tests
Purpose: Pin what routes an Ask to the shared troubleshooting corpus, and what must not.
Used for: py_modules/backend/services/compat_topic_router.py, decision D16.
Solves: The router trades precision for reach on purpose. That trade is only safe while the
        strategy side stays clean, so the false-positive direction needs a test, not a hope.
Does not: Test ranking or retrieval quality — only the routing decision.
"""

import json
import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT / "py_modules") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "py_modules"))

from backend.services.compat_topic_router import (  # noqa: E402
    known_compat_topics,
    match_compat_corpus_topics,
    question_targets_compat_corpus,
)
from backend.services.knowledge_base_service import should_retrieve_knowledge  # noqa: E402


class CompatTopicRouterTests(unittest.TestCase):
    def test_every_corpus_topic_can_be_reached(self):
        """Drift guard. A tip sheet topic with no routing rule is content nobody can retrieve.

        This is the failure D16 was raised for, in miniature: eight anti-cheat tips shipped
        and no question could reach them. Adding a topic to the corpus without a rule here
        must fail a test rather than quietly ship dead cards.
        """
        patterns = json.loads(
            (REPO_ROOT / "data" / "kb" / "compat_patterns.json").read_text(encoding="utf-8")
        )
        corpus_topics = {str(p.get("topic") or "").strip() for p in patterns}
        corpus_topics.discard("")
        missing = sorted(corpus_topics - known_compat_topics())
        self.assertEqual(missing, [], f"corpus topics with no routing rule: {missing}")

    def test_plain_english_troubleshooting_now_routes(self):
        """The D16 headline: none of these reached the compat corpus before."""
        for question in (
            "I'm out of room and want my installs on the memory card instead",
            "the game only responds to the touchpad and ignores the sticks",
            "I can play alone but online kicks me out straight away",
            "my headset disconnects whenever anything else is plugged in",
            "my playstation 2 games run at half speed on the handheld",
            "playing from my desktop over wifi keeps hitching every few seconds",
        ):
            with self.subTest(question=question):
                should_run, domain = should_retrieve_knowledge(
                    use_local_knowledge_base=True,
                    ask_mode="speed",
                    question=question,
                    app_id="",
                    app_name="",
                )
                self.assertTrue(should_run)
                self.assertEqual(domain, "compat")

    def test_strategy_questions_do_not_route_to_troubleshooting(self):
        """Every one of these fired before word-boundary matching went in.

        "lan" matched inside "plants", "plane" and "island"; "motion aim" matched Red Dead's
        slow-motion aiming. A strategy Ask answered with a networking tip is worse than no
        tip at all, so these are pinned by example rather than by rule.
        """
        for question in (
            "the biome with all the sticky plants keeps killing my run",
            "I can't pass the plane lessons in the desert",
            "the tropical island chapter feels like a different game, what do I keep",
            "the slow-motion aiming barely lasts, how do I get more of it",
            "the big lizard in the cave rolls into a ball and I can't hurt it",
            "which god's gifts should I take for a spear run",
        ):
            with self.subTest(question=question):
                self.assertFalse(question_targets_compat_corpus(question))

    def test_lan_does_not_match_inside_a_longer_word(self):
        """Word-boundary matching went in for the *start* of a term, not the end.

        "lan" still matched inside "land", "language" and "lane" -- a Paper Mario question
        ending "...right before they land" was routed as a network problem (found 2026-09-26).
        Fixed by requiring a word boundary on both sides of this one term; the suffix-matching
        other rules rely on ("upscal" reaching "upscaling") is untouched.
        """
        for question in (
            "they land",
            "check the language settings",
            "which lane is that",
        ):
            with self.subTest(question=question):
                self.assertNotIn("network", match_compat_corpus_topics(question))
        for question in (
            "set up a lan party",
            "play over lan",
        ):
            with self.subTest(question=question):
                self.assertIn("network", match_compat_corpus_topics(question))

    def test_a_weak_topic_alone_does_not_route(self):
        """"Deck" and "crash" are ordinary words in a game question."""
        self.assertEqual(match_compat_corpus_topics("how do I beat this boss on my deck"), ["deck"])
        self.assertFalse(question_targets_compat_corpus("how do I beat this boss on my deck"))
        self.assertFalse(question_targets_compat_corpus("the boss crashes into me and I die"))
        # But a weak topic riding alongside a real one is fine.
        self.assertTrue(question_targets_compat_corpus("proton crash on my deck"))

    def test_crash_and_linux_route_alone_with_no_game_in_context(self):
        """Reproduced on the tip: with nothing running, plain crash sentences hit nothing.

        "my game keeps crashing" has no boss to blame the word on. Once there is no running
        game and none named in the question, "crash" and "linux" stop needing a second,
        stronger topic alongside them.
        """
        for question in (
            "my game keeps crashing",
            "my game wont launch",
            "black screen when i start the game",
            "game keeps crashing on my steam deck",
        ):
            with self.subTest(question=question):
                self.assertTrue(question_targets_compat_corpus(question, game_in_context=False))

    def test_crash_stays_weak_with_a_game_in_context(self):
        """The moment a game is running, "crash" goes back to meaning what a boss does."""
        self.assertFalse(
            question_targets_compat_corpus("the boss crashes into me and I die", game_in_context=True)
        )
        self.assertFalse(
            question_targets_compat_corpus("how do I beat this boss on my deck", game_in_context=False)
        )

    def test_deck_stays_weak_even_with_no_game_in_context(self):
        """"deck" is excluded from the no-game exception -- it is too ordinary a word."""
        self.assertFalse(question_targets_compat_corpus("my deck gets really hot", game_in_context=False))

    def test_question_targets_compat_corpus_default_matches_old_behaviour(self):
        """No caller has to pass the new argument for existing behaviour to hold."""
        self.assertFalse(question_targets_compat_corpus("my game keeps crashing"))

    def test_should_retrieve_knowledge_routes_plain_crash_with_no_game_running(self):
        """The gate that actually decides whether an Ask reaches the compat corpus."""
        for question in (
            "my game keeps crashing",
            "my game wont launch",
            "black screen when i start the game",
            "game keeps crashing on my steam deck",
        ):
            with self.subTest(question=question):
                should_run, domain = should_retrieve_knowledge(
                    use_local_knowledge_base=True,
                    ask_mode="speed",
                    question=question,
                    app_id="",
                    app_name="",
                )
                self.assertTrue(should_run)
                self.assertEqual(domain, "compat")

    def test_should_retrieve_knowledge_keeps_crash_weak_with_a_running_game(self):
        """A crash sentence behaves exactly as it did before when a game is running."""
        should_run, domain = should_retrieve_knowledge(
            use_local_knowledge_base=True,
            ask_mode="speed",
            question="my game keeps crashing",
            app_id="440",
            app_name="Team Fortress 2",
        )
        # Speed mode with a game running still reaches the strategy corpus (D17) -- the point
        # under test is that it is *not* "compat", i.e. the weak "crash" topic did not fire
        # on its own just because a game happens to be running.
        self.assertTrue(should_run)
        self.assertEqual(domain, "strategy")

    def test_should_retrieve_knowledge_keeps_crash_weak_with_a_named_title(self):
        """A game named in the question (D19) counts as a game in context too."""
        should_run, domain = should_retrieve_knowledge(
            use_local_knowledge_base=True,
            ask_mode="speed",
            question="my game keeps crashing",
            app_id="",
            app_name="",
            text_resolved_title="Team Fortress 2",
        )
        self.assertTrue(should_run)
        self.assertEqual(domain, "strategy")

    def test_plain_words_reach_their_subject(self):
        """Ordinary phrasing for symptoms the rules previously only knew by their jargon name.

        "stutter" replaces "frame rate drop", "vibrat(ing)" replaces "haptic", "torn" replaces
        "tearing", "cant find" replaces "subnet", and the contraction "isnt working" replaces
        the already-plain "not working" that only matched its own spelling.
        """
        cases = {
            "performance": "why does my game stutter after a few minutes",
            "steam_input": "my controller isnt working after i reconnect it",
            "display": "the screen looks torn when i turn my character quickly",
            "controller": "the controller keeps vibrating way more than i want it to",
            "network": "my computer and my deck cant find each other on the wifi",
        }
        for subject, question in cases.items():
            with self.subTest(subject=subject, question=question):
                self.assertIn(subject, match_compat_corpus_topics(question))

    def test_plain_words_do_not_reopen_the_substring_bug(self):
        """The new terms must not fire on ordinary sentences that merely contain their letters.

        This is the same class of bug the module docstring warns about ("lan" inside
        "plants"): a plain new term is only safe if it needs a second word, or if the word
        itself never means anything else in a gaming sentence.
        """
        for question in (
            "the fight moves so slowly it feels like a cutscene",
            "my favorite outfit for this run is the one with the torn cape",
            "I got so far off course I couldn't find my way back to camp",
        ):
            with self.subTest(question=question):
                self.assertFalse(question_targets_compat_corpus(question))

    def test_apostrophes_survive_normalization(self):
        """A rule written as `cant see` has to match a question written `can't see`.

        Spacing the apostrophe instead of dropping it produced `can t see`, which silently
        killed two rules that read as though they worked.
        """
        self.assertTrue(
            question_targets_compat_corpus(
                "the handheld can't see the computer running the model on my home wifi"
            )
        )

    def test_router_is_additive_not_a_replacement(self):
        """The original phrase gate still routes what it always routed."""
        for question in ("why is my game crashing proton issue", "deck sleep resume black screen"):
            with self.subTest(question=question):
                self.assertTrue(
                    should_retrieve_knowledge(
                        use_local_knowledge_base=True,
                        ask_mode="speed",
                        question=question,
                        app_id="",
                        app_name="",
                    )[0]
                )

    def test_knowledge_base_off_still_wins(self):
        should_run, domain = should_retrieve_knowledge(
            use_local_knowledge_base=False,
            ask_mode="speed",
            question="I'm out of room and want my installs on the memory card",
            app_id="",
            app_name="",
        )
        self.assertFalse(should_run)
        self.assertEqual(domain, "")

    def test_empty_and_junk_questions_route_nowhere(self):
        for question in ("", "   ", "!!!", "hello"):
            with self.subTest(question=question):
                self.assertFalse(question_targets_compat_corpus(question))

    def test_measured_reach_on_the_drafted_intents(self):
        """The number D16 was decided on, pinned so a rule edit cannot quietly undo it.

        Holdout compat intents were not read while the rules were written — they are the
        blind check. The misses are named here rather than patched for, all the same
        shape: a symptom described without naming any troubleshooting term. V2-C-04 sits
        in tune; V2-BLIND-H19 and V2-BLIND-H55 (both written blind under D37 — H19 in the
        first batch, H55 in the second) sit in holdout — rewording any of them until it
        routes would tune it against the router and undo the blindness it exists to
        provide, so the misses are recorded instead.

        The router reaches a question that names a troubleshooting term and not one that
        only describes the symptom. That is the D16 gate working as specified and is a
        real reach limit, filed on the roadmap rather than patched here.

        **The V2-W2-SYM rows are the wave-two blind batch (D85).** Twenty-four sentences
        for twelve everyday problems, written by someone who had not read the tips or
        these rules. Sixteen of the twenty-four miss. Measured either side of the wave-two
        routing and tip work: 6 of 24 reached before it, 8 of 24 after — so widening the
        rules with plainly-worded terms bought two rows, and the shape of the rules is
        what limits the rest. The two that were bought are V2-W2-SYM-08 (stutter) and
        V2-W2-SYM-15 (a torn picture).

        The clearest single case is V2-BLIND-H55, *"the game drops me back to the library
        a few minutes in"*. That is the exact crash symptom the wave-two tips were
        rewritten to describe, and the question still does not route, because the rule
        wants the word "crash" and the person did not say it. **Do not fix that by adding
        this sentence as a term** — it is a blind row and tuning against it spends it.
        """
        data = json.loads(
            (REPO_ROOT / "tests" / "fixtures" / "kb_eval_v2.json").read_text(encoding="utf-8")
        )
        compat = [q for q in data["queries"] if q["domain"] == "compat"]
        strategy = [q for q in data["queries"] if q["domain"] == "strategy"]

        holdout = [q for q in compat if q["split"] == "holdout"]
        missed_holdout = [
            q["id"] for q in holdout if not question_targets_compat_corpus(q["query"])
        ]
        self.assertEqual(
            missed_holdout,
            [
                "V2-BLIND-H19",
                "V2-BLIND-H55",
                # The wave-two blind batch. Sixteen of its twenty-four rows miss; the eight
                # that reach are SYM-08, -11, -13, -15, -17, -18, -21 and -24.
                "V2-W2-SYM-01",
                "V2-W2-SYM-02",
                "V2-W2-SYM-03",
                "V2-W2-SYM-04",
                "V2-W2-SYM-05",
                "V2-W2-SYM-06",
                "V2-W2-SYM-07",
                "V2-W2-SYM-09",
                "V2-W2-SYM-10",
                "V2-W2-SYM-12",
                "V2-W2-SYM-14",
                "V2-W2-SYM-16",
                "V2-W2-SYM-19",
                "V2-W2-SYM-20",
                "V2-W2-SYM-22",
                "V2-W2-SYM-23",
            ],
        )

        missed_tune = [
            q["id"]
            for q in compat
            if q["split"] == "tune" and not question_targets_compat_corpus(q["query"])
        ]
        self.assertEqual(missed_tune, ["V2-C-04"])

        false_positives = [
            q["id"] for q in strategy if question_targets_compat_corpus(q["query"])
        ]
        self.assertEqual(false_positives, [])


if __name__ == "__main__":
    unittest.main()
