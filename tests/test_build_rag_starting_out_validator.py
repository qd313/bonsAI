"""Title: A "Starting out in ..." row must be typed `starting_out` before the corpus builds

Purpose: D65 gave "starting out" cards their own kind, and the 22 real rows were re-typed
from `mechanic` to `starting_out`. Two other helpers are writing brand-new "Starting out in
..." rows in the same seed file while this lands, still as `mechanic` (the kind this
replaces) because their brief was written first. This is the check that catches a row left
that way before it ever reaches a build, rather than shipping a chip and a rescue phrase
that quietly miss it.
Used for: scripts/build_rag_db.py's `mistyped_starting_out_rows()`, called from
`_seed_strategy_corpus` right before the seed's sections are inserted.
Solves: A silent mismatch here has no other symptom -- the row still searches and answers
fine by keyword, it just never gets the "How do I get started" chip or the "where do I
start" rescue, which is easy to miss without a build-time refusal naming the row.
"""

import unittest

from build_rag_db_loader import REPO_ROOT, load_build_rag_db

build_rag_db = load_build_rag_db()


class MistypedStartingOutRowsTests(unittest.TestCase):
    def test_a_starting_out_named_row_typed_mechanic_is_caught(self):
        sections = [
            {"section_id": 1, "name": "Starting out in Brotato", "section_type": "mechanic"},
        ]
        self.assertEqual(
            build_rag_db.mistyped_starting_out_rows(sections), ["Starting out in Brotato"]
        )

    def test_a_correctly_typed_row_is_not_caught(self):
        sections = [
            {"section_id": 1, "name": "Starting out in Brotato", "section_type": "starting_out"},
        ]
        self.assertEqual(build_rag_db.mistyped_starting_out_rows(sections), [])

    def test_a_row_with_an_unrelated_name_is_never_checked(self):
        sections = [{"section_id": 1, "name": "Glyphid Dreadnought", "section_type": "mechanic"}]
        self.assertEqual(build_rag_db.mistyped_starting_out_rows(sections), [])

    def test_every_real_starting_out_row_in_the_seed_is_typed_correctly(self):
        """The regression this whole check exists for: the 22 real rows, re-typed by hand."""
        import json

        data = json.loads((REPO_ROOT / "data" / "kb" / "strategy_seed.json").read_text(encoding="utf-8"))
        offenders = build_rag_db.mistyped_starting_out_rows(data.get("sections") or [])
        self.assertEqual(offenders, [])
