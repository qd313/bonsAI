"""
Title: Eval harness arm-comparison tests
Purpose: Pin the honesty rules the KB retrieval bake-off enforces in code.
Used for: scripts/kb/eval_kb_embed_models.py — splits, bootstrap CIs, the non-overlap verdict,
          the live gate-reachability check (R2), and whether the eval's saved library copy
          is fresh enough to trust.
Solves: The eval is what decides whether fusion ships. A verdict that rounds an overlap up to
        a win, a gate flag that goes stale, or a report measuring a stale library copy without
        saying so, would settle the argument with a wrong number.
Does not: Run any embedding or touch Ollama — every test here is pure scoring logic or plain
          file timestamps on a temp directory.
"""

import contextlib
import io
import json
import os
import re
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from script_loader import load_script

REPO_ROOT = Path(__file__).resolve().parents[1]


def _load_eval_module():
    # @dataclass resolves annotations through sys.modules, so the module is registered before it runs.
    return load_script("eval_kb_embed_models", register=True)


class EvalArmsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mod = _load_eval_module()

    @classmethod
    def tearDownClass(cls):
        sys.modules.pop("eval_kb_embed_models", None)

    def _table(self, keyword_hits, rrf_hits):
        """Build the arm table the verdict reads, from raw per-case hit lists."""
        mod = self.mod
        make = lambda hits: [  # noqa: E731 - a local shorthand, not an abstraction
            mod.QueryResult(case_id=str(i), hit_at_1=h, hit_at_3=h, fts_empty=False, embed_ms=0.0)
            for i, h in enumerate(hits)
        ]
        return mod._arms_table({"keyword": make(keyword_hits), "rrf": make(rrf_hits)})

    def _multi_table(self, **hits_by_arm):
        """Same as `_table`, but for any number of arms -- the shape production actually runs
        (keyword, vector_only, rrf_rerank_only, rrf all at once), not just the rrf/keyword pair."""
        mod = self.mod
        make = lambda hits: [  # noqa: E731 - a local shorthand, not an abstraction
            mod.QueryResult(case_id=str(i), hit_at_1=h, hit_at_3=h, fts_empty=False, embed_ms=0.0)
            for i, h in enumerate(hits)
        ]
        return mod._arms_table({arm: make(hits) for arm, hits in hits_by_arm.items()})

    def test_bootstrap_ci_brackets_the_point_estimate(self):
        hits = [True] * 30 + [False] * 10
        lo, hi = self.mod._bootstrap_ci(hits)
        self.assertLessEqual(lo, 75.0)
        self.assertGreaterEqual(hi, 75.0)

    def test_bootstrap_ci_is_reproducible(self):
        hits = [True, False, True, True, False, True, False, True]
        self.assertEqual(self.mod._bootstrap_ci(hits), self.mod._bootstrap_ci(hits))

    def test_bootstrap_ci_refuses_to_look_confident_on_one_case(self):
        """A one-case slice would otherwise report [100, 100] and read as certainty."""
        self.assertEqual(self.mod._bootstrap_ci([True]), (0.0, 100.0))
        self.assertEqual(self.mod._bootstrap_ci([]), (0.0, 100.0))

    def test_verdict_calls_an_overlap_an_overlap(self):
        """The failure mode worth blocking: a higher point estimate read as a win."""
        table = self._table([True] * 18 + [False] * 2, [True] * 19 + [False])
        verdict = self.mod._arms_verdict(table)
        self.assertIn("No separation", verdict)
        self.assertNotIn("RRF beats", verdict)

    def test_verdict_names_rrf_only_when_intervals_clear(self):
        table = self._table([False] * 40, [True] * 40)
        self.assertIn("RRF beats keyword", self.mod._arms_verdict(table))

    def test_verdict_is_willing_to_say_keyword_won(self):
        """The eval has to be able to return the answer nobody wants."""
        table = self._table([True] * 40, [False] * 40)
        verdict = self.mod._arms_verdict(table)
        self.assertIn("Keyword beats RRF", verdict)
        self.assertIn("not earning its embed cost", verdict)

    def test_empty_holdout_is_reported_as_ungated_not_as_a_tie(self):
        table = self._table([], [])
        self.assertIn("holdout split has no labeled cases", self.mod._arms_verdict(table))

    def test_verdict_names_vector_only_when_it_leads_and_clears_every_other_arm(self):
        """The exact shape of the 2026-08-29 bug: a third (and fourth) arm the old code never
        looked at, since it only ever compared `rrf` against `keyword`."""
        table = self._multi_table(
            keyword=[False] * 20,
            vector_only=[True] * 20,
            rrf_rerank_only=[False] * 20,
            rrf=[False] * 20,
        )
        verdict = self.mod._arms_verdict(table)
        self.assertIn("Vector-only beats", verdict)
        self.assertIn("keyword", verdict)
        self.assertIn("RRF-rerank-only", verdict)
        self.assertNotIn("No separation", verdict)

    def test_verdict_still_calls_it_no_separation_when_vector_only_leads_but_overlaps_one_arm(
        self,
    ):
        """Leading on point estimate is not the same as clearing every arm's interval. Reuses the
        exact 90%-vs-95%-of-20 pairing `test_verdict_calls_an_overlap_an_overlap` already proved
        overlaps, so this is the same rule applied with two extra arms in the table."""
        table = self._multi_table(
            keyword=[True] * 18 + [False] * 2,  # 90%
            vector_only=[True] * 19 + [False] * 1,  # 95%, best point estimate on the table
            rrf_rerank_only=[False] * 20,
            rrf=[False] * 20,
        )
        verdict = self.mod._arms_verdict(table)
        self.assertIn("No separation", verdict)
        self.assertIn("vector-only", verdict)
        self.assertNotIn("Vector-only beats keyword", verdict)
        # Still reports the arms it does clear, rather than going silent on them.
        self.assertIn("RRF-rerank-only", verdict)

    def test_verdict_names_every_arm_it_judged(self):
        """At minimum, the text must say which arms it judged -- true for a clean sweep and for
        an overlap alike."""
        clean = self.mod._arms_verdict(
            self._multi_table(
                keyword=[False] * 10,
                vector_only=[True] * 10,
                rrf_rerank_only=[False] * 10,
                rrf=[False] * 10,
            )
        )
        self.assertIn("Arms judged:", clean)
        for label in ("keyword", "vector-only", "RRF-rerank-only", "RRF"):
            self.assertIn(label, clean)

    def test_gate_reachability_comes_from_the_live_gate(self):
        """A phrase-list change must move this number, not leave a stale fixture boolean."""
        reachable, domain = self.mod._gate_verdict(
            ask_mode="speed",
            question="proton crash on launch",
            app_id="",
            app_name="",
        )
        self.assertTrue(reachable)
        self.assertEqual(domain, "compat")

        # PARA-C01 verbatim. This used to be the demonstration of the Q8 gap -- a
        # plain-English restatement that the phrase list did not match, one of 15 such
        # misses out of 18. Decision D16 added the topic router and it reaches compat now.
        # Kept as a regression pin: if the router is weakened, this goes back to unreachable.
        reachable, domain = self.mod._gate_verdict(
            ask_mode="speed",
            question="linux game keeps closing right after launch compatibility layer",
            app_id="",
            app_name="",
        )
        self.assertTrue(reachable)
        self.assertEqual(domain, "compat")

        # Still unreachable, and correctly so: a strategy question is not troubleshooting.
        reachable, domain = self.mod._gate_verdict(
            ask_mode="speed",
            question="the big lizard in the cave rolls into a ball and I cannot hurt it",
            app_id="",
            app_name="",
        )
        self.assertFalse(reachable)
        self.assertEqual(domain, "")

    def test_fixture_split_defaults_and_overrides(self):
        cases = self.mod._load_fixture(
            REPO_ROOT / "tests" / "fixtures" / "kb_eval_v0.json", "kb_eval_v0"
        )
        self.assertTrue(cases)
        # Every current case is tune by design (R1); a holdout has to be written blind.
        self.assertEqual({c.split for c in cases}, {"tune"})

    def test_drafted_intents_do_not_echo_the_cards_they_will_match(self):
        """R1's sign-off checklist item, as a test rather than a manual read.

        Each intent carries the phrases its eventual card title will use. If a query
        contains one verbatim, the eval would be measuring "can we find the card we wrote the
        query from" -- the exact inflation R1 exists to prevent. Adding a card whose title
        leaks into its own query must fail here, not pass review.
        """
        path = REPO_ROOT / "tests" / "fixtures" / "kb_eval_v2.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        leaks = []
        for row in data["queries"]:
            normalized = re.sub(r"[^a-z0-9 ]+", " ", row["query"].lower())
            haystack = f" {' '.join(normalized.split())} "
            for banned in row.get("withheld_card_terms", []):
                if f" {banned.lower()} " in haystack:
                    leaks.append((row["id"], banned))
        self.assertEqual(leaks, [], f"queries echo their target card title: {leaks}")

    def test_every_label_names_a_card_that_exists(self):
        """A label may only be written once its card is written.

        This started life as "no labels at all until sign-off". That was the right rule while
        no cards existed, and became wrong when 6d began carding titles one at a time --
        Portal 2 and Half-Life 2 have cards and labels; the other eleven have neither. The
        rule worth keeping is the one underneath it: **a label must name a real card**. A
        label written from imagination turns the eval into a measure of our expectations
        rather than of retrieval, which is the same self-referential trap as R1.

        A row's `expect_section` may now be a single card name or a list of names (a second
        right answer) -- this walks both shapes so a phantom name hiding inside a list cannot
        slip past the check the single-name case already had.
        """
        data = json.loads(
            (REPO_ROOT / "tests" / "fixtures" / "kb_eval_v2.json").read_text(encoding="utf-8")
        )
        seed = json.loads(
            (REPO_ROOT / "data" / "kb" / "strategy_seed.json").read_text(encoding="utf-8")
        )
        card_names = {s["name"] for s in seed["sections"]}
        phantom = []
        for row in data["queries"]:
            raw = row.get("expect_section")
            if not raw:
                continue
            names = raw if isinstance(raw, list) else [raw]
            for name in names:
                if name and name not in card_names:
                    phantom.append((row["id"], name))
        self.assertEqual(phantom, [], f"labels naming no card in the seed: {phantom}")

    def test_fixture_status_tracks_whether_every_title_is_carded(self):
        """Unsigned while any title lacks cards; approved once the 13-title seed is complete."""
        data = json.loads(
            (REPO_ROOT / "tests" / "fixtures" / "kb_eval_v2.json").read_text(encoding="utf-8")
        )
        seed = json.loads(
            (REPO_ROOT / "data" / "kb" / "strategy_seed.json").read_text(encoding="utf-8")
        )
        carded = {s["game_id"] for s in seed["sections"]}
        uncarded = [g["canonical_title"] for g in seed["games"] if g["game_id"] not in carded]
        if uncarded:
            self.assertEqual(
                data["status"],
                "awaiting_maintainer_signoff",
                f"fixture claims sign-off while these titles have no cards: {uncarded}",
            )
        else:
            self.assertEqual(
                data["status"],
                "approved_for_rebuild_and_bakeoff",
                "every title is carded — fixture must be approved before PR2 bake-off",
            )

    def test_v2_fixture_has_tune_and_holdout_labeled_cases(self):
        cases = self.mod._load_fixture(
            REPO_ROOT / "tests" / "fixtures" / "kb_eval_v2.json", "kb_eval_v2"
        )
        labeled = [c for c in cases if self.mod._case_is_labeled(c)]
        self.assertTrue(any(c.split == "tune" for c in labeled))
        self.assertTrue(any(c.split == "holdout" for c in labeled))

    def _rows(self, spec):
        """spec: list of (hit, fts_empty) -> QueryResult rows."""
        mod = self.mod
        return [
            mod.QueryResult(
                case_id=str(i), hit_at_1=hit, hit_at_3=hit, fts_empty=empty, embed_ms=0.0
            )
            for i, (hit, empty) in enumerate(spec)
        ]

    def test_keyword_blind_slice_keeps_only_the_cases_keyword_could_not_answer(self):
        """The slice that would have caught the 2026-08-17 recall bug.

        Until the vector half got its own recall pass, every fusion arm scored zero on exactly
        these cases -- and the overall tables barely moved, because keyword search answers most
        labeled questions on its own.
        """
        results = {
            #                    case0          case1         case2
            "keyword": self._rows([(True, False), (False, True), (False, True)]),
            "rrf": self._rows([(True, False), (True, False), (False, False)]),
        }
        blind = self.mod._keyword_blind_slice(results)
        self.assertEqual([r.case_id for r in blind["keyword"]], ["1", "2"])
        self.assertEqual([r.case_id for r in blind["rrf"]], ["1", "2"])
        self.assertEqual([r.hit_at_3 for r in blind["rrf"]], [True, False])

    def test_keyword_blind_slice_reads_the_keyword_arm_not_each_arm(self):
        """Every arm must be scored on the same cases, or the columns are not comparable."""
        results = {
            "keyword": self._rows([(False, True), (True, False)]),
            # This arm found candidates on case 0 and none on case 1 -- irrelevant to the slice.
            "rrf": self._rows([(True, False), (True, True)]),
        }
        blind = self.mod._keyword_blind_slice(results)
        self.assertEqual([r.case_id for r in blind["keyword"]], ["0"])
        self.assertEqual([r.case_id for r in blind["rrf"]], ["0"])

    def test_keyword_blind_slice_is_empty_when_keyword_always_found_something(self):
        results = {"keyword": self._rows([(True, False), (False, False)])}
        self.assertEqual(self.mod._keyword_blind_slice(results)["keyword"], [])

    def test_slice_keeps_arms_aligned(self):
        mod = self.mod
        cases = [
            mod.QueryCase(
                case_id=str(i),
                query="q",
                ask_mode="speed",
                domain="compat" if i % 2 else "strategy",
                app_id="",
                shortcut="",
                expect_topic="",
                expect_section="",
                suite="t",
            )
            for i in range(6)
        ]
        results = {
            arm: [
                mod.QueryResult(
                    case_id=str(i), hit_at_1=False, hit_at_3=False, fts_empty=False, embed_ms=0.0
                )
                for i in range(6)
            ]
            for arm in ("keyword", "rrf")
        }
        sliced = mod._slice_results(results, cases, lambda c: c.domain == "compat")
        self.assertEqual([r.case_id for r in sliced["keyword"]], ["1", "3", "5"])
        self.assertEqual([r.case_id for r in sliced["rrf"]], ["1", "3", "5"])

    # --- weight sweep -----------------------------------------------------------------------

    def _sweep_cases(self, mod):
        return [
            mod.QueryCase(
                case_id="tune-1",
                query="q1",
                ask_mode="speed",
                domain="strategy",
                app_id="",
                shortcut="",
                expect_topic="",
                expect_section="Card A",
                suite="t",
                split="tune",
            ),
            mod.QueryCase(
                case_id="tune-2",
                query="q2",
                ask_mode="speed",
                domain="strategy",
                app_id="",
                shortcut="",
                expect_topic="",
                expect_section="Card B",
                suite="t",
                split="tune",
            ),
            mod.QueryCase(
                case_id="holdout-1",
                query="q3",
                ask_mode="speed",
                domain="strategy",
                app_id="",
                shortcut="",
                expect_topic="",
                expect_section="Card C",
                suite="t",
                split="holdout",
            ),
        ]

    def test_sweep_applies_each_pair_and_restores_the_constants(self):
        """The sweep sets RRF_W_FTS/RRF_W_VEC on the service module for each pair, so the fake
        fusion below sees them at call time, and puts the originals back afterward -- proving
        both halves of the contract, not just that a number changed somewhere."""
        mod = self.mod
        seen: list[tuple[float, float]] = []

        def fake_hybrid_retrieve(conn, case, *, query_vector, vectors_by_id, fts_k, top_k, with_recall):
            seen.append((mod.kb_service.RRF_W_FTS, mod.kb_service.RRF_W_VEC))
            return []

        def fake_embed_one(ollama_base, model, text, *, timeout_s=30.0):
            return [0.1, 0.2], 1.0

        cases = self._sweep_cases(mod)
        original_fts, original_vec = mod.kb_service.RRF_W_FTS, mod.kb_service.RRF_W_VEC

        with mock.patch.object(mod, "_hybrid_retrieve", fake_hybrid_retrieve), mock.patch.object(
            mod, "_embed_one", fake_embed_one
        ):
            rows = mod._sweep_weights(
                conn=None,
                ollama_base="http://example.invalid",
                model="nomic-embed-text",
                vectors_by_id=mod.DomainVectors(compat={}, strategy={}),
                cases=cases,
                pairs=[(0.5, 1.5), (1.0, 1.0)],
            )

        # Two tune-split cases per pair -- one fake-fusion call each, both seeing the pair's
        # weights, in pair order.
        self.assertEqual(seen, [(0.5, 1.5), (0.5, 1.5), (1.0, 1.0), (1.0, 1.0)])
        self.assertEqual((mod.kb_service.RRF_W_FTS, mod.kb_service.RRF_W_VEC), (original_fts, original_vec))
        # Only the two tune-split cases were scored -- the holdout row never enters the sweep.
        self.assertEqual([row["n"] for row in rows], [2, 2])

    def test_sweep_run_prints_no_holdout_numbers(self):
        """A sweep table is built from tune-split cases only, so the printed table carries no
        holdout case id and no count including the holdout row -- the honesty rule R1 exists
        to enforce for every other split use in this file. (The header saying holdout is
        deliberately excluded is fine; a holdout *number* leaking is what this guards.)"""
        mod = self.mod

        def fake_hybrid_retrieve(conn, case, *, query_vector, vectors_by_id, fts_k, top_k, with_recall):
            return []

        def fake_embed_one(ollama_base, model, text, *, timeout_s=30.0):
            return [0.1, 0.2], 1.0

        cases = self._sweep_cases(mod)
        with mock.patch.object(mod, "_hybrid_retrieve", fake_hybrid_retrieve), mock.patch.object(
            mod, "_embed_one", fake_embed_one
        ):
            rows = mod._sweep_weights(
                conn=None,
                ollama_base="http://example.invalid",
                model="nomic-embed-text",
                vectors_by_id=mod.DomainVectors(compat={}, strategy={}),
                cases=cases,
                pairs=[(1.0, 1.0)],
            )
            captured = io.StringIO()
            with contextlib.redirect_stderr(captured):
                mod._print_sweep_table(rows)

        # n=2 (tune only, never 3 -- the holdout row is excluded, not just unlabeled)
        self.assertEqual(rows[0]["n"], 2)
        printed = captured.getvalue()
        self.assertNotIn("holdout-1", printed)
        self.assertIn(" 2 ", printed)

    def test_parse_weight_pairs_reads_the_default_sweep_list(self):
        mod = self.mod
        pairs = mod._parse_weight_pairs(mod.DEFAULT_SWEEP_WEIGHTS)
        self.assertEqual(pairs[0], (1.0, 1.0))
        self.assertEqual(pairs[-1], (1.0, 1.5))
        self.assertEqual(len(pairs), 9)

    def test_parse_weight_pairs_rejects_a_malformed_pair(self):
        mod = self.mod
        with self.assertRaises(ValueError):
            mod._parse_weight_pairs("1:1,not-a-pair")

    # --- per-case output ---------------------------------------------------------------------

    def test_per_case_table_has_names_in_rank_order_for_every_arm(self):
        mod = self.mod
        cases = [
            mod.QueryCase(
                case_id="c1",
                query="q1",
                ask_mode="speed",
                domain="strategy",
                app_id="",
                shortcut="",
                expect_topic="",
                expect_section="Card A",
                suite="t",
                split="tune",
            ),
            mod.QueryCase(
                case_id="c2",
                query="q2",
                ask_mode="speed",
                domain="compat",
                app_id="",
                shortcut="",
                expect_topic="Tip X",
                expect_section="",
                suite="t",
                split="holdout",
            ),
        ]
        results = {
            "keyword": [
                mod.QueryResult(
                    case_id="c1", hit_at_1=True, hit_at_3=True, fts_empty=False, embed_ms=0.0,
                    top_names=["Card A", "Card B", "Card C"],
                ),
                mod.QueryResult(
                    case_id="c2", hit_at_1=False, hit_at_3=False, fts_empty=True, embed_ms=0.0,
                    top_names=[],
                ),
            ],
            "rrf": [
                mod.QueryResult(
                    case_id="c1", hit_at_1=True, hit_at_3=True, fts_empty=False, embed_ms=12.0,
                    top_names=["Card A", "Card D"],
                ),
                mod.QueryResult(
                    case_id="c2", hit_at_1=False, hit_at_3=True, fts_empty=False, embed_ms=9.0,
                    top_names=["Tip X", "Tip Y"],
                ),
            ],
        }

        table = mod._per_case_table(cases, results)

        self.assertEqual(set(table.keys()), {"keyword", "rrf"})
        self.assertEqual(len(table["keyword"]), 2)
        self.assertEqual(len(table["rrf"]), 2)
        self.assertEqual(
            table["rrf"][0],
            {
                "case_id": "c1",
                "split": "tune",
                "domain": "strategy",
                "hit_at_1": True,
                "hit_at_3": True,
                "fts_empty": False,
                "top_names": ["Card A", "Card D"],
            },
        )
        self.assertEqual(table["rrf"][1]["top_names"], ["Tip X", "Tip Y"])
        self.assertEqual(table["keyword"][1]["top_names"], [])

    # --- a second right answer ----------------------------------------------------------------

    def test_list_expect_section_hits_on_its_second_name(self):
        mod = self.mod
        fixture = {
            "queries": [
                {
                    "id": "X-2",
                    "domain": "strategy",
                    "query": "how do I open the vault door",
                    "expect_section": ["Card A", "Card B"],
                    "note": "two cards both answer this question fairly",
                }
            ]
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "fixture.json"
            path.write_text(json.dumps(fixture), encoding="utf-8")
            cases = mod._load_fixture(path, "test-suite")

        self.assertEqual(len(cases), 1)
        self.assertEqual(cases[0].expect_section, ["Card A", "Card B"])
        self.assertTrue(mod._case_is_labeled(cases[0]))

        card = mod.KnowledgeCard(
            section_id=1,
            game_id=1,
            game_title="G",
            section_type="section",
            name="Card B",
            card="text",
            source_url="",
            source_license="x",
            source_version=None,
            crawled_at=None,
            trust_tier="fallback",
        )
        self.assertTrue(mod._card_matches(cases[0], card))

    def test_list_expect_section_without_note_fails_to_load(self):
        mod = self.mod
        fixture = {
            "queries": [
                {
                    "id": "X-3",
                    "domain": "strategy",
                    "query": "how do I open the vault door",
                    "expect_section": ["Card A", "Card B"],
                    "note": "",
                }
            ]
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "fixture.json"
            path.write_text(json.dumps(fixture), encoding="utf-8")
            with self.assertRaises(ValueError) as ctx:
                mod._load_fixture(path, "test-suite")
        self.assertIn("X-3", str(ctx.exception))

    # --- the eval's saved library copy: stale detection ---------------------------------------

    def test_corpus_is_stale_when_an_input_is_newer_than_the_copy(self):
        """A copy built before the notes or the builder changed must not be reused silently."""
        self.assertTrue(
            self.mod._corpus_is_stale(db_mtime=100.0, input_mtimes=[50.0, 60.0, 150.0])
        )

    def test_corpus_is_stale_false_when_the_copy_postdates_every_input(self):
        self.assertFalse(
            self.mod._corpus_is_stale(db_mtime=300.0, input_mtimes=[50.0, 60.0, 150.0])
        )

    def test_ensure_seed_db_rebuilds_when_a_watched_input_is_newer_than_the_copy(self):
        """A copy older than the notes file triggers a rebuild.

        subprocess.run and the Ollama reachability check are both faked, so this never runs
        the real builder or touches a network -- only the rebuild decision is under test.
        """
        mod = self.mod
        with tempfile.TemporaryDirectory() as tmp_dir:
            out_dir = Path(tmp_dir) / "out"
            out_dir.mkdir()
            db_path = out_dir / "corpus.db"
            db_path.write_text("old copy", encoding="utf-8")
            os.utime(db_path, (1000, 1000))

            notes_path = Path(tmp_dir) / "strategy_seed.json"
            notes_path.write_text("{}", encoding="utf-8")
            os.utime(notes_path, (2000, 2000))  # newer than the copy

            calls = []

            def fake_run(cmd, *, check, cwd):
                calls.append(cmd)
                db_path.write_text("rebuilt", encoding="utf-8")

            with mock.patch.object(
                mod.subprocess, "run", fake_run
            ), mock.patch.object(mod, "_ollama_reachable", lambda base, **kw: True):
                captured = io.StringIO()
                with contextlib.redirect_stderr(captured):
                    result = mod._ensure_seed_db(
                        out_dir,
                        ollama_base="http://example.invalid",
                        stale_check_paths=[notes_path],
                    )

            self.assertEqual(result, db_path)
            self.assertEqual(len(calls), 1)
            self.assertEqual(db_path.read_text(encoding="utf-8"), "rebuilt")
            self.assertIn("rebuilding", captured.getvalue())

    def test_ensure_seed_db_refuses_a_stale_rebuild_when_ollama_is_unreachable(self):
        """Rule: never fall back to measuring the old copy just because Ollama is down."""
        mod = self.mod
        with tempfile.TemporaryDirectory() as tmp_dir:
            out_dir = Path(tmp_dir) / "out"
            out_dir.mkdir()
            db_path = out_dir / "corpus.db"
            db_path.write_text("old copy", encoding="utf-8")
            os.utime(db_path, (1000, 1000))

            notes_path = Path(tmp_dir) / "strategy_seed.json"
            notes_path.write_text("{}", encoding="utf-8")
            os.utime(notes_path, (2000, 2000))  # newer than the copy

            calls = []

            def fake_run(cmd, *, check, cwd):
                calls.append(cmd)

            with mock.patch.object(
                mod.subprocess, "run", fake_run
            ), mock.patch.object(mod, "_ollama_reachable", lambda base, **kw: False):
                with self.assertRaises(mod.StaleCorpusUnrebuildableError) as ctx:
                    mod._ensure_seed_db(
                        out_dir,
                        ollama_base="http://example.invalid",
                        stale_check_paths=[notes_path],
                    )

            self.assertIn("out of date", str(ctx.exception))
            self.assertIn("not reachable", str(ctx.exception))
            self.assertEqual(calls, [])  # never ran the builder against the stale copy
            self.assertEqual(db_path.read_text(encoding="utf-8"), "old copy")  # untouched

    def test_ensure_seed_db_reuses_the_copy_when_every_input_is_older(self):
        """A copy newer than all three watched inputs is reused, not rebuilt."""
        mod = self.mod
        with tempfile.TemporaryDirectory() as tmp_dir:
            out_dir = Path(tmp_dir) / "out"
            out_dir.mkdir()
            db_path = out_dir / "corpus.db"
            db_path.write_text("current copy", encoding="utf-8")
            os.utime(db_path, (2000, 2000))

            notes_path = Path(tmp_dir) / "strategy_seed.json"
            notes_path.write_text("{}", encoding="utf-8")
            os.utime(notes_path, (1000, 1000))  # older than the copy

            calls = []

            def fake_run(cmd, *, check, cwd):
                calls.append(cmd)

            with mock.patch.object(mod.subprocess, "run", fake_run):
                result = mod._ensure_seed_db(out_dir, stale_check_paths=[notes_path])

            self.assertEqual(result, db_path)
            self.assertEqual(calls, [])
            self.assertEqual(db_path.read_text(encoding="utf-8"), "current copy")

    def test_ensure_seed_db_force_rebuild_skips_the_staleness_check(self):
        """--force-rebuild keeps working exactly as it does today: no comparison at all."""
        mod = self.mod
        with tempfile.TemporaryDirectory() as tmp_dir:
            out_dir = Path(tmp_dir) / "out"
            out_dir.mkdir()
            db_path = out_dir / "corpus.db"
            db_path.write_text("current copy", encoding="utf-8")
            os.utime(db_path, (2000, 2000))

            notes_path = Path(tmp_dir) / "strategy_seed.json"
            notes_path.write_text("{}", encoding="utf-8")
            os.utime(notes_path, (1000, 1000))  # older than the copy -- would not trigger alone

            calls = []

            def fake_run(cmd, *, check, cwd):
                calls.append(cmd)
                db_path.write_text("rebuilt", encoding="utf-8")

            with mock.patch.object(mod.subprocess, "run", fake_run):
                result = mod._ensure_seed_db(
                    out_dir, force_rebuild=True, stale_check_paths=[notes_path]
                )

            self.assertEqual(result, db_path)
            self.assertEqual(len(calls), 1)

    # --- report headers: naming the corpus a report speaks for --------------------------------

    def test_read_corpus_manifest_reports_version_and_counts(self):
        mod = self.mod
        with tempfile.TemporaryDirectory() as tmp_dir:
            out_dir = Path(tmp_dir)
            manifest = {
                "version": "2026.09.07",
                "embedding_section_total_count": 293,
                "embedding_compat_total_count": 156,
            }
            (out_dir / "corpus-manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
            info = mod._read_corpus_manifest(out_dir)
        self.assertEqual(info["version"], "2026.09.07")
        self.assertEqual(info["note_count"], 293)
        self.assertEqual(info["tip_count"], 156)

    def test_read_corpus_manifest_falls_back_when_missing(self):
        """A run before the manifest exists must not crash -- it just has nothing to say yet."""
        mod = self.mod
        with tempfile.TemporaryDirectory() as tmp_dir:
            info = mod._read_corpus_manifest(Path(tmp_dir))
        self.assertEqual(info["version"], "unknown")
        self.assertEqual(info["note_count"], 0)
        self.assertEqual(info["tip_count"], 0)

    def _report_payload(self, **overrides):
        """The minimal payload shape `_write_report` reads from -- see `run_bakeoff`."""
        payload = {
            "date": "2026-09-07",
            "ollama_base": "http://127.0.0.1:11434",
            "corpus_db": "/tmp/corpus.db",
            "corpus_version": "2026.09.07",
            "corpus_note_count": 293,
            "corpus_tip_count": 156,
            "models": ["nomic-embed-text"],
            "keyword_baseline": {"top1_pct": 10.0, "top3_pct": 20.0, "fts_empty_pct": 5.0},
            "english": {
                "bare": {
                    "nomic-embed-text": {
                        "top1_pct": 1.0,
                        "top3_pct": 2.0,
                        "mean_embed_ms": 3.0,
                        "fts_empty_pct": 4.0,
                    }
                },
                "prompted": {
                    "nomic-embed-text": {
                        "top1_pct": 5.0,
                        "top3_pct": 6.0,
                        "mean_embed_ms": 7.0,
                        "fts_empty_pct": 8.0,
                    }
                },
            },
            "arms": {},
            "gate": {},
            "spanish_probe": {},
            "json_path": "docs/archive/research/kb-embed-bakeoff-2026-09-07.json",
        }
        payload.update(overrides)
        return payload

    def test_report_header_names_the_corpus_it_searched(self):
        """A stale or thin copy must show on the page, not hide behind a plain filename."""
        mod = self.mod
        payload = self._report_payload()
        with tempfile.TemporaryDirectory() as tmp_dir:
            report_path = Path(tmp_dir) / "report.md"
            mod._write_report(
                report_path,
                payload=payload,
                recommendation="keep nomic-embed-text",
                winner="nomic-embed-text",
            )
            text = report_path.read_text(encoding="utf-8")
        header = text.split("## Recommendation")[0]
        self.assertIn("2026.09.07", header)
        self.assertIn("293", header)
        self.assertIn("156", header)


if __name__ == "__main__":
    unittest.main()
