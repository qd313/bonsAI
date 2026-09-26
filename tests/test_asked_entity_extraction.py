"""Title: Asked-entity extraction

Purpose: Pin how the spoiler path decides whether the user named the thing they asked about.
Used for: extract_strategy_asked_entity and kb_card_names in ollama_prompts.
Solves: The extractor only read verb-first sentences, which is not how people type on a
        controller -- of 100 eval queries that name their subject it recognised 8, and four
        captures were filler that applied the named-entity discount for nothing.
Does not: Cover fence rendering or the risk-band arithmetic -- see test_spoiler_risk_service.py.

The two failure directions are not symmetric, and the tests are written to say so. A missed
entity over-fences somebody who did name the boss. A *wrong* entity un-fences content they
never asked about and drops the bogus string straight into the prompt.
"""

import json
import re
import unittest
from pathlib import Path

from backend.services.ollama_prompts import (
    extract_strategy_asked_entity,
    kb_card_names,
)
from backend.services.strategy_guide_parse import STRATEGY_FOLLOWUP_PREFIX

FIXTURE = Path(__file__).resolve().parent / "fixtures" / "kb_eval_v2.json"


class VerbFirstPhrasingTests(unittest.TestCase):
    """The register that already worked. These must not regress."""

    def test_how_do_i_beat(self):
        self.assertEqual(
            extract_strategy_asked_entity("How do I beat Glyphid Dreadnought?"),
            "Glyphid Dreadnought",
        )

    def test_tips_for(self):
        self.assertEqual(extract_strategy_asked_entity("tips for the Water Temple"), "Water Temple")

    def test_leading_article_is_dropped(self):
        self.assertEqual(extract_strategy_asked_entity("best way to kill a strider"), "strider")

    def test_followup_prefix_is_stripped_before_matching(self):
        question = f"{STRATEGY_FOLLOWUP_PREFIX} how do i beat king dodongo"
        self.assertEqual(extract_strategy_asked_entity(question), "king dodongo")

    def test_operating_verbs_read_the_versus_register(self):
        """"how to use smoker" is a different question from "smoker grabbing me off roofs"."""
        self.assertEqual(extract_strategy_asked_entity("how to use smoker"), "smoker")
        self.assertEqual(extract_strategy_asked_entity("how to use the gravity gun"), "gravity gun")

    def test_deal_with_is_a_verb(self):
        """Confirmed on device 2026-08-22: this phrasing extracted "" and let a spoiler fence
        through on a low-narrative title with the relevant card sitting unused in the prompt."""
        self.assertEqual(
            extract_strategy_asked_entity("how do i deal with the exploders"), "exploders"
        )


class EntityFirstPhrasingTests(unittest.TestCase):
    """The register the eval set was re-authored into, which the extractor could not read."""

    def test_name_then_qualifier(self):
        self.assertEqual(extract_strategy_asked_entity("wheatley fight"), "wheatley")
        self.assertEqual(extract_strategy_asked_entity("adam smasher fight"), "adam smasher")

    def test_name_then_stacked_qualifiers(self):
        """The row that regressed a real spoiler band: it used to return the entity "strategy"."""
        self.assertEqual(extract_strategy_asked_entity("raphael fight strategy"), "raphael")

    def test_multi_word_name_before_qualifier(self):
        self.assertEqual(
            extract_strategy_asked_entity("supply lines rc plane tips"), "supply lines rc plane"
        )

    def test_qualifier_must_end_the_question(self):
        """A query written to *avoid* naming the boss must not yield one.

        Unanchored, "fire boss that flies out of holes" returned "fire". The name has to be the
        whole of what precedes the qualifier, or it is not a name.
        """
        self.assertEqual(extract_strategy_asked_entity("fire boss that flies out of holes"), "")


class RejectsNonEntitiesTests(unittest.TestCase):
    """Every case here previously returned something, and returning something was the bug."""

    def test_verb_matching_is_boundary_anchored(self):
        """`kill` matches inside `skill`, so this used to extract the entity "fast"."""
        self.assertEqual(extract_strategy_asked_entity("how to raise a skill fast"), "")

    def test_run_on_sentence_is_not_a_name(self):
        self.assertEqual(
            extract_strategy_asked_entity("i beat the final boss once and now i cant do it again"),
            "",
        )

    def test_generic_nouns_are_not_names(self):
        for question in ("how to beat the boss", "how do i beat it", "tips for the fight"):
            with self.subTest(question=question):
                self.assertEqual(extract_strategy_asked_entity(question), "")

    def test_questions_that_name_nothing(self):
        for question in ("best build", "im stuck", "best spot to hold", ""):
            with self.subTest(question=question):
                self.assertEqual(extract_strategy_asked_entity(question), "")

    def test_trailing_clause_is_not_part_of_the_name(self):
        self.assertEqual(
            extract_strategy_asked_entity("kill boomer without getting bile"), "boomer"
        )

    def test_trailing_adverb_is_not_part_of_the_name(self):
        self.assertEqual(extract_strategy_asked_entity("how to kill deathclaw early"), "deathclaw")

    def test_a_conjunction_joining_two_names_is_kept(self):
        """`and` is deliberately not a clause break -- it joins names."""
        self.assertEqual(
            extract_strategy_asked_entity("how to beat theseus and the bull"),
            "theseus and the bull",
        )


class KnownEntityGazetteerTests(unittest.TestCase):
    """Card titles are facts, so they outrank anything guessed from phrasing."""

    KB = (
        "\n[Left 4 Dead 2 / boss: Tank] (trust: bonsAI-maintainer)\nKite it.\n"
        "\n[Left 4 Dead 2 / boss: Witch] (trust: bonsAI-maintainer)\nDo not startle.\n"
        "\n[Tip: Proton black screen on resume] (trust: bonsAI-maintainer)\nToggle it.\n"
    )

    def test_card_names_parsed_from_both_header_shapes(self):
        self.assertEqual(
            kb_card_names(self.KB),
            ["Tank", "Witch", "Proton black screen on resume"],
        )

    def test_card_names_on_empty_text(self):
        self.assertEqual(kb_card_names(""), [])

    def test_description_style_query_resolves_via_the_gazetteer(self):
        """No verb and no qualifier -- unreachable by pattern, trivial with card titles."""
        names = kb_card_names(self.KB)
        self.assertEqual(extract_strategy_asked_entity("witch how to not startle", known_entities=names), "Witch")
        self.assertEqual(extract_strategy_asked_entity("tank rock aim versus", known_entities=names), "Tank")

    def test_gazetteer_match_is_boundary_anchored(self):
        """A card called "Tank" must not match inside "tanking" or "Stalingrad"."""
        self.assertEqual(
            extract_strategy_asked_entity("best tanking stats", known_entities=["Tank"]), ""
        )

    def test_longest_matching_card_wins(self):
        names = ["Nova", "Nova Prospekt"]
        self.assertEqual(
            extract_strategy_asked_entity("nova prospekt turret defence", known_entities=names),
            "Nova Prospekt",
        )

    def test_unmatched_gazetteer_falls_through_to_patterns(self):
        self.assertEqual(
            extract_strategy_asked_entity("wheatley fight", known_entities=["Tank", "Witch"]),
            "wheatley",
        )

    def test_gazetteer_match_allows_a_plural(self):
        """"exploders" must match the card "Exploder" -- confirmed on device 2026-08-22 that the
        singular resolved fine and only the plural was missed."""
        self.assertEqual(
            extract_strategy_asked_entity(
                "how do i deal with the exploders", known_entities=["Exploder"]
            ),
            "Exploder",
        )

    def test_gazetteer_plural_match_stays_boundary_anchored(self):
        """The trailing "s" allowance must not reopen the "tanking"/"Stalingrad" false match."""
        self.assertEqual(
            extract_strategy_asked_entity("best tanking stats", known_entities=["Tank"]), ""
        )

    def test_shortened_multi_word_card_resolves_to_the_full_title(self):
        """Players type the head noun, not the whole card title.

        Measured on device 2026-08-23: "how do i beat the twins" produced the bare entity
        "twins" on four consecutive runs while the attached card was "Dreadnought Twins", so
        the prompt never named the card the corpus had actually supplied.
        """
        self.assertEqual(
            extract_strategy_asked_entity(
                "how do i beat the twins", known_entities=["Dreadnought Twins"]
            ),
            "Dreadnought Twins",
        )

    def test_shortened_match_picks_the_card_whose_head_noun_was_typed(self):
        """Both DRG cards share a word; only one shares the word the player used."""
        names = ["Glyphid Dreadnought", "Dreadnought Twins", "Acid Spitter"]
        self.assertEqual(
            extract_strategy_asked_entity("how do i beat the twins", known_entities=names),
            "Dreadnought Twins",
        )
        self.assertEqual(
            extract_strategy_asked_entity("how do i beat the dreadnought", known_entities=names),
            "Glyphid Dreadnought",
        )

    def test_full_title_match_still_wins_over_a_head_noun(self):
        """The fallback runs only when nothing matched in full, so it cannot demote an exact hit."""
        self.assertEqual(
            extract_strategy_asked_entity(
                "any tips for the glyphid dreadnought",
                known_entities=["Glyphid Dreadnought", "Dreadnought Twins"],
            ),
            "Glyphid Dreadnought",
        )

    def test_generic_head_noun_never_stands_in_for_a_card(self):
        """The safety direction. Naming an entity unfences it, so "boss" must reach nothing.

        Without this guard "how do i beat the boss" would resolve to a real boss card on a story
        title and unfence its tactics -- the opposite of what spoiler masking is for.
        """
        for question in (
            "how do i beat the boss",
            "any tips for the level",
            "how do i beat the water temple boss",
        ):
            self.assertEqual(
                extract_strategy_asked_entity(
                    question, known_entities=["Water Temple Boss", "Fire Temple Level"]
                ),
                "" if question != "how do i beat the water temple boss" else "Water Temple Boss",
                msg=question,
            )

    def test_single_word_cards_are_untouched_by_the_fallback(self):
        """A one-word title has no head noun to shorten, so the old behaviour must be identical."""
        self.assertEqual(
            extract_strategy_asked_entity("best tanking stats", known_entities=["Tank"]), ""
        )
        self.assertEqual(
            extract_strategy_asked_entity("how do i beat the tank", known_entities=["Tank"]),
            "Tank",
        )

    def test_a_starting_out_card_is_never_the_named_entity(self):
        """SPOILER-RISK-CHIP-01 / plan 70: "in hollow knight how should i prepare for the fight
        against the hollow knight at the end" recorded "Named entity: Starting out in Hollow
        Knight" -- a generic onboarding note, not the boss being asked about. Hollow Knight is
        both the game's own name and its final boss's name, and the onboarding card's whole
        title is built by appending the game's name -- "Starting out in Hollow Knight" -- so the
        shortened-name fallback read the question naming the game as the question naming that
        card. The seed corpus has no card for the boss itself, so the correct result here is ""
        (over-fencing, the safe direction), never the note title.
        """
        question = (
            "in hollow knight how should i prepare for the fight against the hollow knight "
            "at the end"
        )
        self.assertEqual(
            extract_strategy_asked_entity(
                question, known_entities=["Starting out in Hollow Knight"]
            ),
            "",
        )
        # Same guard on the shortened-tail fallback with a phrasing that never reaches the
        # verb-first/entity-first patterns, so only the gazetteer path is exercised.
        self.assertEqual(
            extract_strategy_asked_entity(
                "let's talk about hollow knight",
                known_entities=["Starting out in Hollow Knight"],
            ),
            "",
        )

    def test_a_starting_out_card_never_wins_even_alongside_a_real_card(self):
        """The exclusion must not depend on there being nothing else to match -- a real card in
        the same pool must still be found once the generic onboarding card is skipped."""
        names = ["Starting out in Hollow Knight", "Mantis Lords"]
        self.assertEqual(
            extract_strategy_asked_entity(
                "let's talk about mantis lords and hollow knight", known_entities=names
            ),
            "Mantis Lords",
        )

    def test_game_name_stripping_stops_the_final_fight_question_naming_a_wrong_boss(self):
        """Follow-up measured on the Deck 2026-09-26 (docs/test-evidence/plan70-L1-8-HELPER-M.json):
        excluding "Starting out in Hollow Knight" was not the whole fix. The exact same worked
        question then recorded "False Knight" instead -- still wrong, since the question is about
        the final fight, which has no note in the corpus. The word "knight" in the game's own
        name "Hollow Knight" was enough on its own to satisfy False Knight's shortened-name
        fallback (its own tail is "Knight"), with nothing left in the question to tell the two
        apart. Passing the resolved game's name strips it from the question before either match
        pass runs, so the correct result is nothing named at all.
        """
        question = (
            "in hollow knight how should I prepare for the fight against the hollow knight "
            "at the end"
        )
        names = ["Starting out in Hollow Knight", "Watcher Knights", "False Knight"]
        # Without the game name, the old (partially fixed) bug reproduces: False Knight wins.
        self.assertEqual(
            extract_strategy_asked_entity(question, known_entities=names),
            "False Knight",
        )
        # With it, nothing in the question is left to name either card.
        self.assertEqual(
            extract_strategy_asked_entity(question, known_entities=names, game_name="Hollow Knight"),
            "",
        )

    def test_game_name_stripping_does_not_hide_a_real_mention_of_a_different_card(self):
        """The strip must remove only the game's own name, not any text that happens to share a
        word with it -- a question that actually names False Knight by name must still resolve
        to False Knight even when the same game's name is passed in."""
        self.assertEqual(
            extract_strategy_asked_entity(
                "how do i beat false knight",
                known_entities=["False Knight"],
                game_name="Hollow Knight",
            ),
            "False Knight",
        )

    def test_game_name_stripping_is_anchored_not_a_bare_substring(self):
        """A game name that is not actually present in the question must strip nothing -- the
        removal is a whole-word-boundary phrase match, not a loose substring cut that could eat
        part of an unrelated word."""
        self.assertEqual(
            extract_strategy_asked_entity(
                "how do i beat false knight",
                known_entities=["False Knight"],
                game_name="Something Else Entirely",
            ),
            "False Knight",
        )


class FixtureWideInvariantTests(unittest.TestCase):
    """Run the whole eval set through it, because that is what exposed the bug."""

    @classmethod
    def setUpClass(cls):
        cls.rows = json.loads(FIXTURE.read_text(encoding="utf-8"))["queries"]

    def test_every_extracted_entity_appears_in_the_question(self):
        """The invariant that would have caught the original defect on day one.

        The entity is interpolated verbatim into the prompt as *"the user asked about X"*. If X
        is not in what they typed, that sentence is false whatever else is true.
        """
        violations = []
        for row in self.rows:
            entity = extract_strategy_asked_entity(row["query"])
            if not entity:
                continue
            normalized = re.sub(r"\s+", " ", row["query"].lower())
            if entity.lower() not in normalized:
                violations.append((row["id"], row["query"], entity))
        self.assertEqual(violations, [], f"entity not present in the question: {violations}")

    def test_needs_clarification_rows_name_nothing(self):
        """These rows exist because they identify no single subject. One must not be invented."""
        named = [
            (row["id"], extract_strategy_asked_entity(row["query"]))
            for row in self.rows
            if row.get("needs_clarification") and extract_strategy_asked_entity(row["query"])
        ]
        self.assertEqual(named, [])

    def test_recognition_does_not_regress_below_the_measured_floor(self):
        """Pinned at the measured number so a pattern edit cannot quietly undo the fix.

        18 of 179 on phrasing alone (re-measured 2026-08-14 after the two GFDL-sourced OoT
        queries — "how to beat king dodongo" / "water temple water level order" — were
        dropped from the fixture per D20; the King Dodongo row was one of the recognized
        ones). It is not 100 and is not meant to be: the rest are description-style queries
        that need the gazetteer, which only has content once cards attach.
        """
        strategy = [r for r in self.rows if r["domain"] == "strategy"]
        found = [r for r in strategy if extract_strategy_asked_entity(r["query"])]
        self.assertGreaterEqual(len(found), 18)


if __name__ == "__main__":
    unittest.main()
