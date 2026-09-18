"""Title: Wiki note reader

Purpose: Pin scripts/extract_wiki_notes.py's "trim only" guarantee (D111, plan 58 phase 1
Section 8 item 2): an AI may never write a sentence into a wiki note, only cut. Covers
section finding, table/infobox-to-labelled-line conversion, whole-sentence length trimming,
the licence allow-list gate, and the verbatim guarantee itself.
Used for: scripts/extract_wiki_notes.py.
Solves: Every wiki note shipped before this phase was an AI rewrite, not the wiki's own
words -- see docs/planning/58-phase-1-notes-shown-and-wiki-extracts.md Section 1. This is the
test suite for the reader that replaces that rewrite step.
Does not: Hit the network -- every fixture here is a short, hand-written page. The five real
samples for the maintainer are generated separately and written to
docs/test-evidence/plan58p1-B-samples.md, not exercised as an automated test.
"""

from __future__ import annotations

import importlib.util
import io
import json
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


def _load_module():
    path = REPO_ROOT / "scripts" / "extract_wiki_notes.py"
    spec = importlib.util.spec_from_file_location("extract_wiki_notes", path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    # dataclass, with `from __future__ import annotations` in the module under test, resolves
    # its string annotations through sys.modules[cls.__module__] -- it must exist there before
    # exec_module runs the class bodies, or Python 3.12 raises on the very first @dataclass.
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


m = _load_module()


class SelectSectionTests(unittest.TestCase):
    def test_exact_heading_match_wins(self):
        text = "== Overview\nLead text.\n== Strategy\nDo the thing.\n== Trivia\nFun fact.\n"
        headings = m.extract_headings(text)
        choice = m.select_section(headings, text)
        self.assertEqual(choice.heading.title, "Strategy")
        self.assertIn("Do the thing.", choice.body)
        self.assertNotIn("Fun fact.", choice.body)

    def test_substring_match_when_no_exact_heading(self):
        text = "== Tips and tricks\nWatch the tell.\n== Trivia\nFun fact.\n"
        headings = m.extract_headings(text)
        choice = m.select_section(headings, text)
        self.assertEqual(choice.heading.title, "Tips and tricks")
        self.assertIn("tips", choice.reason)

    def test_falls_back_to_overview(self):
        text = "== Overview\nThe boss lives in the swamp.\n== Trivia\nFun fact.\n"
        headings = m.extract_headings(text)
        choice = m.select_section(headings, text)
        self.assertEqual(choice.heading.title, "Overview")
        self.assertIn("fallback", choice.reason)

    def test_no_matching_heading_uses_first_section_and_says_so(self):
        text = "== History\nIt was added in patch 1.\n== Trivia\nFun fact.\n"
        headings = m.extract_headings(text)
        choice = m.select_section(headings, text)
        self.assertEqual(choice.heading.title, "History")
        self.assertIn("check this by hand", choice.reason)

    def test_empty_exact_match_is_skipped_for_a_lower_priority_non_empty_section(self):
        """Real case from gta.fandom.com: a mission page's "Walkthrough" heading exists but
        has nothing written under it; the actual mission text sits under a heading not on
        our priority list at all. An empty note would be worse than a real one."""
        text = "== Mission\nDrive to the dock and blow up the boat.\n== Walkthrough\n"
        headings = m.extract_headings(text)
        choice = m.select_section(headings, text)
        self.assertEqual(choice.heading.title, "Mission")
        self.assertIn("Drive to the dock", choice.body)

    def test_no_headings_at_all_uses_whole_page(self):
        text = "Just one paragraph, no headings anywhere.\n"
        choice = m.select_section([], text)
        self.assertIsNone(choice.heading)
        self.assertEqual(choice.body, text)

    def test_nested_subsection_stays_inside_the_parent(self):
        text = "== Strategy\nPhase one text.\n=== Phase two\nPhase two text.\n== Trivia\nFun fact.\n"
        headings = m.extract_headings(text)
        choice = m.select_section(headings, text)
        self.assertIn("Phase one text.", choice.body)
        self.assertIn("Phase two text.", choice.body)
        self.assertNotIn("Fun fact.", choice.body)


class SelectSectionHostPreferenceTests(unittest.TestCase):
    """Second-pass work: on 4 of the 5 sampled wikis, the general heading list never
    matched anything, and the reader fell back to "first section with real words" -- right
    for Hollow Knight wiki, wrong often enough elsewhere that each of the other four wikis
    gets its own ordered preference, seeded from real pages (see
    docs/test-evidence/plan58p1-B-samples.md)."""

    def test_gta_prefers_mission_over_the_general_list(self):
        text = (
            "== Conditions of Mission Failure\nDon't die.\n"
            "== Mission\nDrive to the dock and blow up the boat.\n"
            "== Walkthrough\n"
        )
        headings = m.extract_headings(text)
        choice = m.select_section(headings, text, host="gta.fandom.com")
        self.assertEqual(choice.heading.title, "Mission")
        self.assertIn("Drive to the dock", choice.body)

    def test_gta_still_falls_back_to_the_general_list_when_no_mission_heading(self):
        """The Trashmaster vehicle page has no "Mission" heading at all -- the host
        preference must not swallow every other wiki's page shape."""
        text = "== Overview\nA large truck used to collect city refuse.\n== Gallery\n"
        headings = m.extract_headings(text)
        choice = m.select_section(headings, text, host="gta.fandom.com")
        self.assertEqual(choice.heading.title, "Overview")

    def test_ssbwiki_prefers_attributes_then_techniques(self):
        text = (
            "== Moveset\nA list of moves.\n"
            "== Attributes\nMario is a balanced character.\n"
            "== Techniques\nThunderspiking is a named trick.\n"
        )
        headings = m.extract_headings(text)
        choice = m.select_section(headings, text, host="www.ssbwiki.com")
        self.assertEqual(choice.heading.title, "Attributes")

    def test_ssbwiki_falls_back_to_techniques_when_attributes_is_empty(self):
        text = "== Attributes\n== Techniques\nThunderspiking is a named trick.\n"
        headings = m.extract_headings(text)
        choice = m.select_section(headings, text, host="www.ssbwiki.com")
        self.assertEqual(choice.heading.title, "Techniques")

    def test_mariowiki_narrows_history_to_the_matching_game_subsection(self):
        text = (
            "== History\n"
            "=== Donkey Kong 64\nArmy Dillo fights Donkey Kong in Jungle Japes.\n"
            "=== Uho'uho Daishizen Gag: Donkey Kong\nA comic-book cameo.\n"
            "== Gallery\n"
        )
        headings = m.extract_headings(text)
        choice = m.select_section(headings, text, host="www.mariowiki.com", game_title="Donkey Kong 64")
        self.assertEqual(choice.heading.title, "Donkey Kong 64")
        self.assertIn("Jungle Japes", choice.body)
        self.assertNotIn("comic-book cameo", choice.body)

    def test_mariowiki_falls_back_to_whole_history_when_no_subsection_matches(self):
        text = "== History\nA general history paragraph with no per-game breakdown.\n== Gallery\n"
        headings = m.extract_headings(text)
        choice = m.select_section(headings, text, host="www.mariowiki.com", game_title="Donkey Kong 64")
        self.assertEqual(choice.heading.title, "History")
        self.assertIn("general history paragraph", choice.body)

    def test_mariowiki_with_no_game_title_behaves_like_before(self):
        text = "== History\nSome history text.\n== Gallery\n"
        headings = m.extract_headings(text)
        choice = m.select_section(headings, text, host="www.mariowiki.com")
        self.assertEqual(choice.heading.title, "History")

    def test_strategywiki_prefers_the_boss_name_heading_over_stage(self):
        text = (
            "== Stage\nA: hop on the goblin.\nB: fight the flying enemies.\n"
            "== Metal Man\nMetal Man jumps and throws blades when you fire at him.\n"
        )
        headings = m.extract_headings(text)
        choice = m.select_section(headings, text, host="strategywiki.org")
        self.assertEqual(choice.heading.title, "Metal Man")
        self.assertIn("throws blades", choice.body)

    def test_strategywiki_falls_back_to_stage_when_nothing_else_has_content(self):
        text = "== Stage\nA: hop on the goblin.\n== Metal Man\n"
        headings = m.extract_headings(text)
        choice = m.select_section(headings, text, host="strategywiki.org")
        self.assertEqual(choice.heading.title, "Stage")
        self.assertIn("only the 'Stage' map key had content", choice.reason)

    def test_strategywiki_skips_a_navigation_heading(self):
        text = "== Table of Contents\n== Stage\nA: hop on the goblin.\n== Metal Man\nBeat him fast.\n"
        headings = m.extract_headings(text)
        choice = m.select_section(headings, text, host="strategywiki.org")
        self.assertEqual(choice.heading.title, "Metal Man")

    def test_unknown_host_uses_the_plain_general_list(self):
        text = "== Strategy\nGeneral tactics text.\n"
        headings = m.extract_headings(text)
        choice = m.select_section(headings, text, host="some-other-wiki.example")
        self.assertEqual(choice.heading.title, "Strategy")


class BodyToUnitsTests(unittest.TestCase):
    def test_prose_splits_into_sentences_in_order(self):
        units, dropped = m.body_to_units("First sentence. Second sentence.\n")
        self.assertEqual([u.text for u in units], ["First sentence.", "Second sentence."])
        self.assertEqual(dropped, [])

    def test_two_column_no_header_table_becomes_a_labelled_line(self):
        units, _ = m.body_to_units("!! Health\n|| 800\n")
        self.assertEqual(len(units), 1)
        self.assertEqual(units[0].kind, "label")
        self.assertEqual(units[0].text, "Health: 800")
        self.assertEqual(units[0].checks, ["Health", "800"])

    def test_wide_table_zips_header_row_with_each_data_row(self):
        body = "!! Move !! Damage\n|| Jab || 3%\n|| Kick || 6%\n"
        units, _ = m.body_to_units(body)
        self.assertEqual([u.text for u in units], ["Move: Jab", "Damage: 3%", "Move: Kick", "Damage: 6%"])

    def test_two_bare_data_cells_with_no_header_read_as_label_value(self):
        units, _ = m.body_to_units("|| Health || 800\n")
        self.assertEqual(units[0].text, "Health: 800")

    def test_list_items_stay_on_their_own_lines(self):
        units, _ = m.body_to_units("- First tip.\n- Second tip.\n")
        self.assertEqual([u.kind for u in units], ["list", "list"])
        card = m.render_card(units)
        self.assertEqual(card, "- First tip.\n- Second tip.")

    def test_invisible_marks_are_trimmed_from_a_sentence(self):
        """Real case from hollowknight.wiki's False Knight page: its "Behaviour and
        Tactics" section opens with two left-to-right marks (U+200E) that are invisible on
        screen but were landing at the very start of the printed note."""
        units, _ = m.body_to_units("‎ ‎ Most attack names used by the wiki are non-canon.\n")
        self.assertEqual(units[0].text, "Most attack names used by the wiki are non-canon.")

    def test_invisible_marks_are_trimmed_from_a_list_item(self):
        units, _ = m.body_to_units("- ‎Leap: jumps into the air.\n")
        self.assertEqual(units[0].text, "- Leap: jumps into the air.")

    def test_invisible_marks_are_trimmed_from_a_labelled_value(self):
        units, _ = m.body_to_units("|| Description: ‎Falls back and lands.\n")
        self.assertEqual(units[0].text, "Description: Falls back and lands.")
        self.assertEqual(units[0].checks, ["Description", "Falls back and lands."])

    def test_nested_heading_inside_the_section_is_dropped_and_named(self):
        units, dropped = m.body_to_units("Lead in.\n== Sub heading\nMore text.\n")
        self.assertEqual([u.text for u in units], ["Lead in.", "More text."])
        self.assertTrue(any("Sub heading" in d for d in dropped))

    def test_row_with_one_label_and_extra_values_is_named_as_a_limitation(self):
        units, dropped = m.body_to_units("!! Move\n|| Jab || 3% || fast\n")
        self.assertEqual(units[0].text, "Move: Jab")
        self.assertTrue(any("one label" in d for d in dropped))

    def test_bare_marker_line_with_no_text_is_skipped_quietly(self):
        """A blank stat-widget row (Hollow Knight wiki's Combat Values box has these) is not
        content and not a parsing failure -- it should vanish with no unit and no dropped note."""
        units, dropped = m.body_to_units("|| Hits: 11\n||\n|| Combo: 6\n")
        self.assertEqual([u.text for u in units], ["Hits: 11", "Combo: 6"])
        self.assertEqual(dropped, [])

    def test_a_cell_that_already_writes_its_own_label_is_read_as_is(self):
        """Some stat widgets put "Label: value" inside one cell's own text rather than a
        separate header cell -- the page did the labelling, so trust it rather than dropping
        the line as unparseable."""
        units, dropped = m.body_to_units("|| Description: Falls back and lands on his chest.\n")
        self.assertEqual(len(units), 1)
        self.assertEqual(units[0].kind, "label")
        self.assertEqual(units[0].text, "Description: Falls back and lands on his chest.")
        self.assertEqual(dropped, [])


class ExtractLeadSentenceTests(unittest.TestCase):
    """Third-pass work: lane D found that the shipping False Knight note wins a search
    question the verbatim one loses, because the shipping note's first sentence names the
    boss's location and role and the "Behaviour and Tactics" section never does -- that
    framing lives only in the page's lead paragraph."""

    def test_returns_the_first_sentence_of_the_lead(self):
        text = (
            "The armoured maggot in the Forgotten Crossroads is the first real boss fight. "
            "He wields a mace.\n"
            "== Behaviour and Tactics\nHe leaps and slams the ground.\n"
        )
        headings = m.extract_headings(text)
        lead = m.extract_lead_sentence(text, headings)
        self.assertEqual(lead.kind, "sentence")
        self.assertEqual(lead.text, "The armoured maggot in the Forgotten Crossroads is the first real boss fight.")

    def test_no_headings_reads_the_whole_page_as_the_lead(self):
        text = "Just one sentence, no headings anywhere."
        lead = m.extract_lead_sentence(text, [])
        self.assertEqual(lead.text, "Just one sentence, no headings anywhere.")

    def test_a_marked_infobox_line_before_the_first_sentence_is_skipped(self):
        text = "!! Health\n|| 800\nThe boss is found in the swamp.\n== Strategy\nDodge left.\n"
        headings = m.extract_headings(text)
        lead = m.extract_lead_sentence(text, headings)
        self.assertEqual(lead.text, "The boss is found in the swamp.")

    def test_an_empty_lead_returns_none(self):
        text = "== Strategy\nDodge left.\n"
        headings = m.extract_headings(text)
        self.assertIsNone(m.extract_lead_sentence(text, headings))


class TrimToLengthTests(unittest.TestCase):
    def test_stops_before_exceeding_the_cap(self):
        units = [m.Unit("sentence", "Word.", ["Word."]) for _ in range(500)]
        kept, note = m.trim_to_length(units, min_chars=10, max_chars=50)
        self.assertLessEqual(len(m.render_card(kept)), 50)
        self.assertLess(len(kept), len(units))

    def test_a_single_oversized_unit_is_kept_whole_not_cut_mid_sentence(self):
        long_sentence = "This sentence alone is written to run well past the usual cap. " * 5
        units = [m.Unit("sentence", long_sentence.strip(), [long_sentence.strip()])]
        kept, note = m.trim_to_length(units, min_chars=10, max_chars=50)
        self.assertEqual(kept, units)
        self.assertIn("over the 50 cap", note)

    def test_short_section_is_used_whole_and_says_so(self):
        units = [m.Unit("sentence", "Short.", ["Short."])]
        kept, note = m.trim_to_length(units, min_chars=400, max_chars=880)
        self.assertEqual(kept, units)
        self.assertIn("short of the 400 aim", note)


class ScoreUnitTests(unittest.TestCase):
    """Third-pass work: lane D found the two facts an answer question needed ("hit the
    exposed head", "jump the shockwave") were on the page, in the chosen section, but past
    the 880-character cap, because the section opens with attack descriptions and puts the
    "how to beat it" sentences last. Scoring lets those sentences win a place regardless of
    where they sit in the section."""

    def test_counts_each_matching_tactic_word(self):
        unit = m.Unit("sentence", "Dodge the swipe, then jump over the shockwave.", [])
        # "dodge", "jump over", "jump" (also matches inside "jump over"), and "then".
        self.assertEqual(m.score_unit(unit), 4)

    def test_naming_the_subject_adds_a_bonus(self):
        with_name = m.Unit("sentence", "False Knight will hit you if you get too close.", [])
        without_name = m.Unit("sentence", "It will hit you if you get too close.", [])
        self.assertEqual(m.score_unit(with_name, subject="False Knight") - m.score_unit(without_name, subject="False Knight"), 1)

    def test_pure_description_is_penalised(self):
        description = m.Unit("sentence", "Most attack names used by the wiki are non-canon.", [])
        self.assertLess(m.score_unit(description), 0)

    def test_a_tactic_sentence_outscores_pure_description(self):
        description = m.Unit("sentence", "False Knight possesses a variety of attacks.", [])
        tactic = m.Unit("sentence", "Hit the exposed head while he is staggered.", [])
        self.assertGreater(m.score_unit(tactic, subject="False Knight"), m.score_unit(description, subject="False Knight"))


class SelectUnitsByScoreTests(unittest.TestCase):
    def test_a_late_high_scoring_sentence_survives_a_tight_cap(self):
        """The exact shape lane D found: attack descriptions first, the actionable "how to
        beat it" sentence last, cap too tight for all of it."""
        units = [
            m.Unit("sentence", "The Knight leaps into the air before slamming down.", []),
            m.Unit("sentence", "It then charges forward across the room.", []),
            m.Unit("sentence", "Hit the exposed head once it is staggered.", []),
        ]
        kept, _note, rows = m._select_units_by_score(units, min_chars=10, max_chars=55)
        self.assertIn(units[2], kept)

    def test_kept_units_are_emitted_in_original_page_order_not_score_order(self):
        units = [
            m.Unit("sentence", "Hit the weak point when it is exposed.", []),  # scores high
            m.Unit("sentence", "A short filler sentence.", []),  # scores low
        ]
        kept, _note, _rows = m._select_units_by_score(units, min_chars=10, max_chars=200)
        self.assertEqual(kept, units)  # both fit; page order preserved regardless of score

    def test_lead_is_always_first_and_never_competes_for_space(self):
        lead = m.Unit("sentence", "The armoured maggot in the Forgotten Crossroads.", [])
        units = [m.Unit("sentence", "Hit the exposed head.", [])]
        kept, _note, rows = m._select_units_by_score(units, min_chars=10, max_chars=200, lead=lead)
        self.assertEqual(kept[0], lead)
        self.assertNotIn(lead, [u for u, _s, _k in rows])  # the lead never shows up as a scored row

    def test_ties_preserve_page_order(self):
        units = [m.Unit("sentence", f"Sentence {i}.", []) for i in range(5)]
        kept, _note, _rows = m._select_units_by_score(units, min_chars=10, max_chars=1000)
        self.assertEqual(kept, units)

    def test_explain_rows_mark_every_unit_kept_or_not(self):
        units = [m.Unit("sentence", "Word.", []) for _ in range(20)]
        _kept, _note, rows = m._select_units_by_score(units, min_chars=10, max_chars=50)
        self.assertEqual(len(rows), len(units))
        self.assertTrue(any(kept for _u, _s, kept in rows))
        self.assertTrue(any(not kept for _u, _s, kept in rows))


class VerifyVerbatimTests(unittest.TestCase):
    """The guard, and the proof that it actually refuses (D111 item 2, rule 7)."""

    def test_genuine_sentences_pass(self):
        page = "Hornet strikes twice then leaps back to the edge of the arena."
        units = [m.Unit("sentence", page, [page])]
        ok, problems = m.verify_verbatim(units, page)
        self.assertTrue(ok)
        self.assertEqual(problems, [])

    def test_refuses_a_rewritten_sentence(self):
        """Prove the guard by breaking it: one unit is the page's real sentence, the second
        is an AI-style paraphrase that was never on the page. The check must catch exactly
        the rewritten one and must not silently pass the whole card."""
        page_text = "Hornet strikes twice then leaps back to the edge of the arena."
        units = [
            m.Unit("sentence", "Hornet strikes twice then leaps back to the edge of the arena.",
                   ["Hornet strikes twice then leaps back to the edge of the arena."]),
            m.Unit("sentence", "She retreats to safety after each combo.",
                   ["She retreats to safety after each combo."]),
        ]
        ok, problems = m.verify_verbatim(units, page_text)
        self.assertFalse(ok)
        self.assertEqual(problems, ["She retreats to safety after each combo."])

    def test_label_and_value_are_checked_separately(self):
        """A table's label and its value rarely sit next to each other in the source page --
        they are separate cells. The two must each appear, but not necessarily adjacent."""
        page = "The stat block lists Health somewhere and 800 somewhere else entirely."
        units = [m.Unit("label", "Health: 800", ["Health", "800"])]
        ok, problems = m.verify_verbatim(units, page)
        self.assertTrue(ok)

    def test_refuses_a_label_whose_value_never_appeared(self):
        page = "The stat block lists Health but no number at all."
        units = [m.Unit("label", "Health: 800", ["Health", "800"])]
        ok, problems = m.verify_verbatim(units, page)
        self.assertFalse(ok)
        self.assertEqual(problems, ["800"])

    def test_whitespace_only_is_ignored(self):
        page = "Hornet   strikes\ntwice."
        units = [m.Unit("sentence", "Hornet strikes twice.", ["Hornet strikes twice."])]
        ok, _ = m.verify_verbatim(units, page)
        self.assertTrue(ok)


class WikitextToPlainTests(unittest.TestCase):
    def test_template_and_ref_and_comment_are_stripped(self):
        raw = "{{Infobox|x=1}}\nText<ref>cite</ref> stays.<!-- hidden --> \n"
        plain = m.wikitext_to_plain(raw)
        self.assertNotIn("Infobox", plain)
        self.assertNotIn("cite", plain)
        self.assertNotIn("hidden", plain)
        self.assertIn("Text stays.", plain)

    def test_piped_and_plain_links_resolve_to_their_label(self):
        raw = "See [[Some Page|the page]] and [[Other Page]].\n"
        plain = m.wikitext_to_plain(raw)
        self.assertIn("See the page and Other Page.", plain)

    def test_file_caption_is_dropped_entirely(self):
        raw = "Body text.\n[[File:Thing.png|thumb|A [[caption]] with a link]]\nMore text.\n"
        plain = m.wikitext_to_plain(raw)
        self.assertNotIn("caption", plain)
        self.assertIn("Body text.", plain)
        self.assertIn("More text.", plain)

    def test_bullet_list_becomes_dash_lines(self):
        raw = "* First item\n* Second item\n"
        plain = m.wikitext_to_plain(raw)
        self.assertIn("- First item", plain)
        self.assertIn("- Second item", plain)

    def test_category_links_are_dropped_from_the_body(self):
        """[[Category:...]] never appears in a live-fetched page (MediaWiki puts it in the
        footer, which the live fetcher already skips) -- a dump page reads raw wikitext, so
        without this it would render as stray "Category:Bosses" text in the body."""
        raw = "Body text.\n[[Category:Bosses]]\n[[Category:Mega Man 2 enemies|Metal Man]]\nMore text.\n"
        plain = m.wikitext_to_plain(raw)
        self.assertNotIn("Category", plain)
        self.assertNotIn("Bosses", plain)
        self.assertIn("Body text.", plain)
        self.assertIn("More text.", plain)

    def test_wikitext_table_converts_to_markers(self):
        raw = "{|\n! Attack\n! Damage\n|-\n| Jab\n| 3%\n|}\n"
        plain = m.wikitext_to_plain(raw)
        self.assertIn("!! Attack", plain)
        self.assertIn("!! Damage", plain)
        self.assertIn("|| Jab", plain)
        self.assertIn("|| 3%", plain)

    def test_headings_survive_the_conversion(self):
        raw = "== Strategy ==\nDo the thing.\n"
        plain = m.wikitext_to_plain(raw)
        headings = m.extract_headings(plain)
        self.assertEqual([h.title for h in headings], ["Strategy"])


class WikitextCategoryExtractionTests(unittest.TestCase):
    def test_categories_are_read_from_raw_wikitext(self):
        raw = "Some intro.\n[[Category:Bosses]]\n[[Category:Mega Man 2 enemies|Metal Man]]\n"
        self.assertEqual(m.extract_wikitext_categories(raw), ["Bosses", "Mega Man 2 enemies"])

    def test_no_categories_is_an_empty_list(self):
        self.assertEqual(m.extract_wikitext_categories("Just some text, no categories.\n"), [])


class LicenceTests(unittest.TestCase):
    def test_cc_by_sa_variants_by_url(self):
        self.assertEqual(m.canonical_licence("", "https://creativecommons.org/licenses/by-sa/4.0/"), "CC-BY-SA-4.0")
        self.assertEqual(m.canonical_licence("", "https://creativecommons.org/licenses/by-sa/3.0/"), "CC-BY-SA-3.0")
        self.assertEqual(m.canonical_licence("", "https://creativecommons.org/licenses/by/4.0/"), "CC-BY-4.0")

    def test_cc_by_sa_by_footer_text_when_no_url(self):
        self.assertEqual(
            m.canonical_licence("Content is available under Creative Commons Attribution-ShareAlike 4.0 unless otherwise noted.", ""),
            "CC-BY-SA-4.0",
        )

    def test_unrecognised_licence_is_none(self):
        self.assertIsNone(m.canonical_licence("All rights reserved.", ""))
        self.assertIsNone(m.canonical_licence("", ""))

    def test_noncommercial_is_not_mistaken_for_sharealike(self):
        self.assertIsNone(
            m.canonical_licence("Creative Commons Attribution-NonCommercial-ShareAlike 3.0 (Unported)",
                                 "https://creativecommons.org/licenses/by-nc-sa/3.0/")
        )

    def test_allow_list_matches_publish_corpus(self):
        allowed = m._load_allowed_licences()
        self.assertIn("CC-BY-SA-3.0", allowed)
        self.assertIn("CC-BY-SA-4.0", allowed)
        self.assertIn("CC-BY-4.0", allowed)


class BuildNoteEndToEndTests(unittest.TestCase):
    """Exercises load_live_page / load_dump_page / build_note together against small
    on-disk fixtures shaped like the real fetchers' own output."""

    def _write_live_fixture(self, tmp: Path) -> Path:
        page = tmp / "hornet.txt"
        page.write_text(
            "# source: https://hollowknight.wiki/w/Hornet\n"
            "# site: Hollow Knight Wiki\n"
            "# revision: 12345 (2026-09-01T00:00:00Z)\n"
            "# licence: (unused when a manifest sits beside it) \n"
            "# read: 2026-09-17\n\n"
            "== Overview\nHornet is the guardian of Greenpath.\n\n"
            "== Strategy\n"
            "Hornet strikes twice then leaps back to the edge of the arena. "
            "Watch for the thread trap she throws.\n"
            "!! Health\n|| 800\n\n"
            "== Trivia\nHornet reappears later in the game.\n",
            encoding="utf-8",
        )
        manifest = {
            "site": {"sitename": "Hollow Knight Wiki"},
            "pages": [
                {
                    "requested": "Hornet",
                    "title": "Hornet",
                    "url": "https://hollowknight.wiki/w/Hornet",
                    "revid": 12345,
                    "timestamp": "2026-09-01T00:00:00Z",
                    "licence_text": "Creative Commons Attribution-Share Alike 3.0 (Unported)",
                    "licence_url": "https://creativecommons.org/licenses/by-sa/3.0/",
                    "read_on": "2026-09-17",
                    "file": "hornet.txt",
                }
            ],
        }
        (tmp / "_manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
        return page

    def test_live_fixture_produces_the_nine_fields(self):
        with tempfile.TemporaryDirectory() as tmp_str:
            tmp = Path(tmp_str)
            page_path = self._write_live_fixture(tmp)
            allowed = m._load_allowed_licences()
            note, sidecar, dropped = m.build_note(
                page_path=page_path,
                page_format="live",
                game_id=42,
                section_type_arg=None,
                name_arg=None,
                min_chars=50,
                max_chars=400,
                allowed_licences=allowed,
            )
            self.assertEqual(set(note.keys()), set(m.NOTE_FIELDS))
            self.assertIsNone(note["section_id"])
            self.assertIsNone(note["source_version"])
            self.assertEqual(note["game_id"], 42)
            self.assertEqual(note["name"], "Hornet")
            self.assertEqual(note["source_url"], "https://hollowknight.wiki/w/Hornet")
            self.assertEqual(note["source_license"], "CC-BY-SA-3.0")
            self.assertEqual(note["crawled_at"], "2026-09-17")
            self.assertIn("Hornet strikes twice", note["card"])
            self.assertNotIn("Hornet is the guardian of Greenpath.", note["card"])
            self.assertNotIn("Hornet reappears later in the game.", note["card"])
            self.assertEqual(sidecar["section_heading"], "Strategy")
            self.assertEqual(sidecar["revision_id"], 12345)
            self.assertEqual(sidecar["char_count"], len(note["card"]))

    def test_the_lead_sentence_opens_the_card(self):
        """End-to-end version of ExtractLeadSentenceTests: a page whose lead paragraph
        exists (unlike the shared _write_live_fixture, which starts straight at a heading)
        opens its card with that lead sentence, verbatim, ahead of the section's own text."""
        with tempfile.TemporaryDirectory() as tmp_str:
            tmp = Path(tmp_str)
            page = tmp / "false-knight.txt"
            page.write_text(
                "# source: https://hollowknight.wiki/w/False_Knight\n"
                "# site: Hollow Knight Wiki\n"
                "# revision: 1 (2026-01-01T00:00:00Z)\n"
                "# licence: (unused when a manifest sits beside it)\n"
                "# read: 2026-09-17\n\n"
                "The armoured maggot in the Forgotten Crossroads is the first real fight.\n\n"
                "== Behaviour and Tactics\n"
                "He leaps and slams the ground with his mace.\n",
                encoding="utf-8",
            )
            manifest = {
                "pages": [{
                    "requested": "False Knight", "title": "False Knight",
                    "url": "https://hollowknight.wiki/w/False_Knight", "revid": 1,
                    "timestamp": "2026-01-01T00:00:00Z",
                    "licence_text": "Creative Commons Attribution-Share Alike 3.0 (Unported)",
                    "licence_url": "https://creativecommons.org/licenses/by-sa/3.0/",
                    "read_on": "2026-09-17", "file": "false-knight.txt",
                }],
            }
            (tmp / "_manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
            allowed = m._load_allowed_licences()
            note, _, _ = m.build_note(
                page_path=page, page_format="live", game_id=1,
                section_type_arg=None, name_arg=None,
                min_chars=10, max_chars=400, allowed_licences=allowed,
            )
            self.assertTrue(
                note["card"].startswith("The armoured maggot in the Forgotten Crossroads is the first real fight."),
                note["card"],
            )
            self.assertIn("He leaps and slams the ground", note["card"])

    def test_a_late_tactic_sentence_survives_a_tight_cap_end_to_end(self):
        """The exact shape of lane D's real loss: a "Behaviour and Tactics" section that
        opens with attack descriptions and puts the "how to beat it" sentence last, cut by a
        cap too tight for all of it. Under the old first-N-in-order trim this sentence would
        never survive; scored selection keeps it regardless of where it sits."""
        with tempfile.TemporaryDirectory() as tmp_str:
            tmp = Path(tmp_str)
            page = tmp / "false-knight.txt"
            page.write_text(
                "# source: https://hollowknight.wiki/w/False_Knight\n"
                "# site: Hollow Knight Wiki\n"
                "# revision: 1 (2026-01-01T00:00:00Z)\n"
                "# licence: (unused when a manifest sits beside it)\n"
                "# read: 2026-09-17\n\n"
                "The armoured maggot in the Forgotten Crossroads is the first real fight.\n\n"
                "== Behaviour and Tactics\n"
                "The maggot leaps into the air and slams his mace into the ground. "
                "It charges across the room toward you. "
                "It rears back and swings its mace in a wide arc. "
                "Hit the exposed head once it is staggered. "
                "Jump over the shockwave rather than backing away from it.\n",
                encoding="utf-8",
            )
            manifest = {
                "pages": [{
                    "requested": "False Knight", "title": "False Knight",
                    "url": "https://hollowknight.wiki/w/False_Knight", "revid": 1,
                    "timestamp": "2026-01-01T00:00:00Z",
                    "licence_text": "Creative Commons Attribution-Share Alike 3.0 (Unported)",
                    "licence_url": "https://creativecommons.org/licenses/by-sa/3.0/",
                    "read_on": "2026-09-17", "file": "false-knight.txt",
                }],
            }
            (tmp / "_manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
            allowed = m._load_allowed_licences()
            note, _, _ = m.build_note(
                page_path=page, page_format="live", game_id=1,
                section_type_arg=None, name_arg=None,
                min_chars=10, max_chars=180, allowed_licences=allowed,
            )
            self.assertIn("Hit the exposed head", note["card"])
            self.assertIn("Jump over the shockwave", note["card"])

    def test_a_category_in_the_manifest_reaches_the_note_s_section_type(self):
        """End-to-end version of GuessSectionTypeTests: a category recorded in the fetcher's
        own manifest (fetch_wiki_live_pages.py's resolve_page now queries these) settles
        section_type before body words are read."""
        with tempfile.TemporaryDirectory() as tmp_str:
            tmp = Path(tmp_str)
            page_path = self._write_live_fixture(tmp)
            manifest = json.loads((tmp / "_manifest.json").read_text(encoding="utf-8"))
            manifest["pages"][0]["categories"] = ["Hollow Knight bosses"]
            (tmp / "_manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
            allowed = m._load_allowed_licences()
            note, _, _ = m.build_note(
                page_path=page_path, page_format="live", game_id=1,
                section_type_arg=None, name_arg=None,
                min_chars=50, max_chars=400, allowed_licences=allowed,
            )
            self.assertEqual(note["section_type"], "boss")

    def test_mariowiki_host_narrows_history_end_to_end(self):
        """The full pipeline version of test_mariowiki_narrows_history_to_the_matching_game_
        subsection: host and game_title come from build_note's own arguments (host derived
        from the fetched source_url, never guessed), and the resulting note's card excludes
        the comic-book cameo from a different History subsection."""
        with tempfile.TemporaryDirectory() as tmp_str:
            tmp = Path(tmp_str)
            page = tmp / "army-dillo.txt"
            page.write_text(
                "# source: https://www.mariowiki.com/Army_Dillo\n"
                "# site: Super Mario Wiki\n"
                "# revision: 1 (2026-01-01T00:00:00Z)\n"
                "# licence: (unused when a manifest sits beside it)\n"
                "# read: 2026-09-17\n\n"
                "== History\n"
                "=== Donkey Kong 64\n"
                "Army Dillo fights Donkey Kong in a jungle arena in Jungle Japes.\n"
                "=== Uho'uho Daishizen Gag: Donkey Kong\n"
                "Army Dillo appears in a comic book as a mecha built by the Kremlings.\n"
                "== Gallery\n",
                encoding="utf-8",
            )
            manifest = {
                "site": {"sitename": "Super Mario Wiki"},
                "pages": [{
                    "requested": "Army Dillo", "title": "Army Dillo",
                    "url": "https://www.mariowiki.com/Army_Dillo", "revid": 1,
                    "timestamp": "2026-01-01T00:00:00Z",
                    "categories": ["Donkey Kong 64 bosses"],
                    "licence_text": "Attribution-ShareAlike 4.0 International",
                    "licence_url": "https://creativecommons.org/licenses/by-sa/4.0/",
                    "read_on": "2026-09-17", "file": "army-dillo.txt",
                }],
            }
            (tmp / "_manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
            allowed = m._load_allowed_licences()
            note, sidecar, _ = m.build_note(
                page_path=page, page_format="live", game_id=9,
                section_type_arg=None, name_arg=None,
                min_chars=10, max_chars=400, allowed_licences=allowed,
                game_title="Donkey Kong 64",
            )
            self.assertIn("Jungle Japes", note["card"])
            self.assertNotIn("comic book", note["card"])
            self.assertEqual(sidecar["section_heading"], "Donkey Kong 64")
            self.assertEqual(note["section_type"], "boss")

    def test_licence_override_is_used_when_the_live_read_has_no_version(self):
        """Some Fandom wikis answer with a bare "CC-BY-SA" and no version (gta.fandom.com
        does exactly this) even when the version was already established from other
        evidence -- see docs/archive/15-corpus-licensing-attribution-plan.md."""
        with tempfile.TemporaryDirectory() as tmp_str:
            tmp = Path(tmp_str)
            page_path = self._write_live_fixture(tmp)
            manifest = json.loads((tmp / "_manifest.json").read_text(encoding="utf-8"))
            manifest["pages"][0]["licence_text"] = "CC-BY-SA"
            manifest["pages"][0]["licence_url"] = "https://www.fandom.com/licensing"
            (tmp / "_manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
            allowed = m._load_allowed_licences()
            note, _, _ = m.build_note(
                page_path=page_path, page_format="live", game_id=1,
                section_type_arg=None, name_arg=None,
                min_chars=50, max_chars=400, allowed_licences=allowed,
                licence_override="CC-BY-SA-3.0",
            )
            self.assertEqual(note["source_license"], "CC-BY-SA-3.0")

    def test_licence_override_is_still_checked_against_the_allow_list(self):
        with tempfile.TemporaryDirectory() as tmp_str:
            tmp = Path(tmp_str)
            page_path = self._write_live_fixture(tmp)
            manifest = json.loads((tmp / "_manifest.json").read_text(encoding="utf-8"))
            manifest["pages"][0]["licence_text"] = "CC-BY-SA"
            manifest["pages"][0]["licence_url"] = "https://www.fandom.com/licensing"
            (tmp / "_manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
            allowed = m._load_allowed_licences()
            with self.assertRaises(SystemExit):
                m.build_note(
                    page_path=page_path, page_format="live", game_id=1,
                    section_type_arg=None, name_arg=None,
                    min_chars=50, max_chars=400, allowed_licences=allowed,
                    licence_override="GFDL",
                )

    def test_disallowed_licence_refuses_and_prints_why(self):
        with tempfile.TemporaryDirectory() as tmp_str:
            tmp = Path(tmp_str)
            page_path = self._write_live_fixture(tmp)
            manifest = json.loads((tmp / "_manifest.json").read_text(encoding="utf-8"))
            manifest["pages"][0]["licence_text"] = "GNU Free Documentation License"
            manifest["pages"][0]["licence_url"] = "https://www.gnu.org/licenses/fdl-1.3.html"
            (tmp / "_manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
            allowed = m._load_allowed_licences()
            with self.assertRaises(SystemExit) as ctx:
                m.build_note(
                    page_path=page_path, page_format="live", game_id=1,
                    section_type_arg=None, name_arg=None,
                    min_chars=50, max_chars=400, allowed_licences=allowed,
                )
            self.assertIn("no recognised licence", str(ctx.exception))

    def test_dump_fixture_reconstructs_the_url_and_uses_the_snapshot_date(self):
        with tempfile.TemporaryDirectory() as tmp_str:
            tmp = Path(tmp_str)
            page_path = tmp / "Some_Boss.wikitext"
            page_path.write_text(
                "'''Some Boss''' lives in the swamp.\n\n"
                "== Strategy ==\n"
                "Approach from the left to avoid the first swing. "
                "Jump the ground slam rather than block it.\n",
                encoding="utf-8",
            )
            manifest = {
                "dump": "dump-item",
                "original_url": "https://example-wiki.fandom.com",
                "publicdate": "2024-03-02T00:00:00Z",
                "item_licenseurl": "https://creativecommons.org/licenses/by-sa/3.0/",
                "siteinfo": {
                    "rightsinfo": {
                        "text": "Creative Commons Attribution-Share Alike 3.0 (Unported)",
                        "url": "https://creativecommons.org/licenses/by-sa/3.0/",
                    }
                },
                "pages": [{"title": "Some Boss", "file": "Some_Boss.wikitext", "revision_id": "999", "timestamp": "2024-03-01T00:00:00Z"}],
            }
            (tmp / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
            allowed = m._load_allowed_licences()
            note, sidecar, _ = m.build_note(
                page_path=page_path, page_format="dump", game_id=7,
                section_type_arg="boss", name_arg=None,
                min_chars=10, max_chars=400, allowed_licences=allowed,
            )
            self.assertEqual(note["source_url"], "https://example-wiki.fandom.com/wiki/Some_Boss")
            self.assertEqual(note["crawled_at"], "2024-03-02")
            self.assertEqual(note["section_type"], "boss")
            self.assertEqual(sidecar["revision_id"], "999")


class RebuildPageUrlTests(unittest.TestCase):
    """Real bug found while sampling strategywiki.org: its api.php lives under "/w/api.php",
    which is not its article root, and guessing "/wiki/Title" off that address produced
    "https://strategywiki.org/w/api.php/wiki/Mega_Man_2/Air_Man" -- not a real page."""

    def test_uses_the_snapshot_s_own_server_and_articlepath(self):
        siteinfo = {"server": "//strategywiki.org", "articlepath": "/wiki/$1"}
        url = m._rebuild_page_url({}, siteinfo, "Mega Man 2/Air Man")
        self.assertEqual(url, "https://strategywiki.org/wiki/Mega_Man_2/Air_Man")

    def test_a_non_slash_wiki_articlepath_is_respected_too(self):
        """hollowknight.wiki's own articlepath is "/w/$1", not "/wiki/$1" -- a hardcoded
        guess would have been wrong for this wiki specifically."""
        siteinfo = {"server": "https://hollowknight.wiki", "articlepath": "/w/$1"}
        url = m._rebuild_page_url({}, siteinfo, "Hornet (Hollow Knight)")
        self.assertEqual(url, "https://hollowknight.wiki/w/Hornet_(Hollow_Knight)")

    def test_falls_back_to_stripping_api_php_when_no_articlepath_recorded(self):
        manifest = {"original_url": "https://example-wiki.fandom.com/api.php"}
        url = m._rebuild_page_url(manifest, {}, "Some Boss")
        self.assertEqual(url, "https://example-wiki.fandom.com/wiki/Some_Boss")


class GuessSectionTypeTests(unittest.TestCase):
    def test_boss_wins_when_the_word_boss_appears(self):
        self.assertEqual(m.guess_section_type("Some Boss", []), "boss")

    def test_defaults_to_mechanic(self):
        self.assertEqual(m.guess_section_type("Round timer", []), "mechanic")

    def test_a_boss_category_wins_over_a_body_word_guess(self):
        """Real case: Army Dillo's own body words guessed "mechanic" (wrong -- it's a
        boss). The page's own category should settle it before body words are even read."""
        section_type = m.guess_section_type("Army Dillo", [], categories=["Donkey Kong 64 bosses"])
        self.assertEqual(section_type, "boss")

    def test_no_matching_category_falls_back_to_body_words(self):
        section_type = m.guess_section_type("Some Boss", [], categories=["Trivia", "Stub articles"])
        self.assertEqual(section_type, "boss")

    def test_character_category_maps_to_mechanic(self):
        """There is no "character" bucket among the five existing section_type values."""
        section_type = m.guess_section_type("Mario", [], categories=["Playable characters"])
        self.assertEqual(section_type, "mechanic")

    def test_empty_categories_list_is_the_same_as_none(self):
        self.assertEqual(m.guess_section_type("Some Boss", [], categories=[]), "boss")


class MainCliTests(unittest.TestCase):
    def test_main_prints_a_note_and_writes_the_out_file(self):
        with tempfile.TemporaryDirectory() as tmp_str:
            tmp = Path(tmp_str)
            page = tmp / "hornet.txt"
            page.write_text(
                "# source: https://hollowknight.wiki/w/Hornet\n"
                "# site: Hollow Knight Wiki\n"
                "# revision: 1 (2026-01-01T00:00:00Z)\n"
                "# licence: Creative Commons Attribution-Share Alike 3.0 (Unported) https://creativecommons.org/licenses/by-sa/3.0/\n"
                "# read: 2026-09-17\n\n"
                "== Strategy\nHornet strikes twice then leaps back to the edge of the arena.\n",
                encoding="utf-8",
            )
            out_path = tmp / "out.json"
            buf = io.StringIO()
            with redirect_stdout(buf):
                rc = m.main([
                    "--page", str(page), "--game-id", "3",
                    "--min-chars", "10", "--max-chars", "200",
                    "--out", str(out_path),
                ])
            self.assertEqual(rc, 0)
            self.assertIn("NOTE RECORD", buf.getvalue())
            payload = json.loads(out_path.read_text(encoding="utf-8"))
            self.assertEqual(len(payload["notes"]), 1)
            self.assertEqual(payload["notes"][0]["game_id"], 3)
            # This file is a scratch file the test cleans up itself -- never the seed.
            self.assertNotEqual(out_path, REPO_ROOT / "data" / "kb" / "strategy_seed.json")


if __name__ == "__main__":
    unittest.main()
