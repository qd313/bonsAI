"""
Title: KB answer eval harness tests

Purpose: Pin the harness plumbing added for the prompt-diet lane (plan 46, Lane C) that does not
         need a live Ollama: prompt-length reporting, the settings the harness writes for a voice
         or thinking-effort run, the kb-placement wrapper, and the two window-warning columns.
Used for: scripts/eval_kb_answers.py.
Solves: The harness itself has no test coverage, so a flag that silently no-ops (e.g. --voice not
        reaching settings.json) would only be caught by a maintainer reading a report and wondering
        why nothing changed.
Does not: Run the real Ask pipeline or touch Ollama — every test here is pure plumbing / file I/O.
"""

import asyncio
import importlib.util
import json
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "py_modules"))


def _load_eval_module():
    spec = importlib.util.spec_from_file_location(
        "eval_kb_answers", REPO_ROOT / "scripts" / "eval_kb_answers.py"
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    try:
        spec.loader.exec_module(module)
    except Exception:  # pragma: no cover - a load failure must not leave a stub behind
        sys.modules.pop(spec.name, None)
        raise
    return module


class EvalKbAnswersHarnessTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mod = _load_eval_module()

    @classmethod
    def tearDownClass(cls):
        sys.modules.pop("eval_kb_answers", None)

    def _sample(self, **overrides):
        """A minimal SampleResult; every field the dataclass needs, override what a test cares about."""
        mod = self.mod
        base = dict(
            case_id="c1",
            sample=1,
            success=True,
            elapsed_s=1.0,
            model="m",
            reply="hello",
            kb_attached=True,
            cards=[],
            card_ok=None,
            attached_ok=None,
            mention_hits=[],
            mention_ok=None,
            notsay_hits=[],
            notsay_ok=None,
            fence_present=False,
            fence_ok=None,
            branches_present=False,
            branches_ok=None,
            payload_bytes=None,
            prompt_eval_tokens=None,
            system_prompt_chars=None,
            window_warning=False,
            prompt_tokens_est=None,
        )
        base.update(overrides)
        return mod.SampleResult(**base)

    def _case(self, **overrides):
        """A minimal Case; every field the dataclass needs, override what a test cares about."""
        mod = self.mod
        base = dict(
            id="c1",
            app_id="1",
            app_name="Game",
            ask_mode="strategy",
            question="q",
            expect_card=None,
            must_mention=[],
            must_not_say=[],
            expect_fence=None,
            expect_branches=None,
            expect_attached=None,
            note="",
        )
        base.update(overrides)
        return mod.Case(**base)

    # --- commit 1: prompt_chars mean ----------------------------------------------------------

    def test_mean_prompt_chars_averages_only_captured_samples(self):
        samples = [
            self._sample(system_prompt_chars=1000),
            self._sample(system_prompt_chars=2000),
            self._sample(system_prompt_chars=None),  # sample 2+ of a case: no captured prompt
        ]
        self.assertEqual(self.mod.mean_prompt_chars(samples), 1500.0)

    def test_mean_prompt_chars_is_none_with_nothing_captured(self):
        samples = [self._sample(system_prompt_chars=None)]
        self.assertIsNone(self.mod.mean_prompt_chars(samples))

    # --- commit 4: settings writer flags (--voice, --think) ------------------------------------

    def test_write_harness_settings_default_run_has_no_voice_and_thinking_off(self):
        mod = self.mod
        with tempfile.TemporaryDirectory() as tmp:
            settings_dir = Path(tmp)
            path = mod.write_harness_settings(
                settings_dir, corpus_dir=Path(tmp), corpus_version="1", model="m"
            )
            payload = json.loads(path.read_text(encoding="utf-8"))
        self.assertFalse(payload["ai_character_enabled"])
        self.assertNotIn("ai_character_preset_id", payload)
        self.assertEqual(payload["ask_think_effort"], "off")

    def test_write_harness_settings_voice_enables_character_and_records_preset(self):
        mod = self.mod
        with tempfile.TemporaryDirectory() as tmp:
            settings_dir = Path(tmp)
            path = mod.write_harness_settings(
                settings_dir,
                corpus_dir=Path(tmp),
                corpus_version="1",
                model="m",
                voice_preset_id="alig_ali_g",
            )
            payload = json.loads(path.read_text(encoding="utf-8"))
        self.assertTrue(payload["ai_character_enabled"])
        self.assertEqual(payload["ai_character_preset_id"], "alig_ali_g")

    def test_write_harness_settings_rejects_unknown_voice_preset(self):
        mod = self.mod
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError):
                mod.write_harness_settings(
                    Path(tmp),
                    corpus_dir=Path(tmp),
                    corpus_version="1",
                    model="m",
                    voice_preset_id="not_a_real_preset",
                )

    def test_write_harness_settings_think_effort_writes_ask_think_effort(self):
        mod = self.mod
        with tempfile.TemporaryDirectory() as tmp:
            path = mod.write_harness_settings(
                Path(tmp), corpus_dir=Path(tmp), corpus_version="1", model="m", think_effort="medium"
            )
            payload = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(payload["ask_think_effort"], "medium")

    # --- commit 4: kb-placement wrapper (same monkeypatch shape as the variant hook) -----------

    def test_build_prompt_wrapper_forwards_kb_placement_kwarg(self):
        mod = self.mod
        calls = []

        def fake_real_build(*a, **kw):
            calls.append(kw)
            return "PROMPT"

        wrapped = mod._build_prompt_wrapper(fake_real_build, kb_placement="late", variant_fn=None)
        out = wrapped(question="hi")
        self.assertEqual(out, "PROMPT")
        self.assertEqual(calls[-1].get("knowledge_block_placement"), "late")

    def test_build_prompt_wrapper_early_does_not_pass_the_kwarg(self):
        """Early is the shipped default; the wrapper should not force a kwarg the function
        already defaults to, so a real_build that predates the parameter still works."""
        mod = self.mod
        calls = []

        def fake_real_build(*a, **kw):
            calls.append(kw)
            return "PROMPT"

        wrapped = mod._build_prompt_wrapper(fake_real_build, kb_placement="early", variant_fn=None)
        wrapped(question="hi")
        self.assertNotIn("knowledge_block_placement", calls[-1])

    def test_build_prompt_wrapper_applies_variant_after_placement(self):
        mod = self.mod

        def fake_real_build(*a, **kw):
            return "PROMPT with the fence sentence"

        def drop_fence(text: str) -> str:
            return text.replace(" with the fence sentence", "")

        wrapped = mod._build_prompt_wrapper(fake_real_build, kb_placement="late", variant_fn=drop_fence)
        self.assertEqual(wrapped(question="hi"), "PROMPT")

    # --- commit 4: window-warning columns --------------------------------------------------------

    def test_extract_window_warning_reads_the_estimate_out_of_the_log_line(self):
        mod = self.mod
        lines = [
            "[INFO]: ask_ollama: POST http://x model=m payload_bytes=100 num_predict=800 think=False",
            "[WARNING]: ask_ollama: prompt ~2800 tokens + num_predict 2112 = 4912 exceeds the "
            "assumed 4096-token window by ~816; Ollama keeps the end of the prompt and drops its "
            "start silently (identity, rules, cards). Trim what is attached (D46).",
        ]
        warned, tokens = mod._extract_window_warning(lines)
        self.assertTrue(warned)
        self.assertEqual(tokens, 2800)

    def test_extract_window_warning_false_when_nothing_fired(self):
        mod = self.mod
        lines = ["[INFO]: ask_ollama: POST http://x model=m payload_bytes=100 num_predict=800 think=False"]
        warned, tokens = mod._extract_window_warning(lines)
        self.assertFalse(warned)
        self.assertIsNone(tokens)

    def test_window_warning_count_and_mean_prompt_tokens(self):
        samples = [
            self._sample(window_warning=True, prompt_tokens_est=2800),
            self._sample(window_warning=False, prompt_tokens_est=1200),
            self._sample(window_warning=True, prompt_tokens_est=3000),
        ]
        warned, total = self.mod.window_warning_count(samples)
        self.assertEqual((warned, total), (2, 3))
        self.assertAlmostEqual(self.mod.mean_prompt_tokens(samples), 2333.3, places=1)

    # --- plan 48 lane A, commit 1: tolerant fact matching (D86/D88) ----------------------------
    #
    # The old check passed a must_mention alternative only when it appeared as an exact phrase in
    # the reply, so a right answer in different words was scored as a missing fact. These four
    # pairs are the ones the roadmap bug named; the fifth uses the real reply text recorded in
    # docs/archive/research/kb-answer-eval-2026-09-07-after-wave2.md for case A-TTYD-01, which
    # failed both fact groups under the old check ("missing facts: `eats the audience`, `cricket`")
    # even though it plainly states both facts, just in different words.

    def test_fact_group_hit_matches_keep_the_crowd_thin_against_thin_the_crowd(self):
        self.assertTrue(
            self.mod.fact_group_hit("you need to keep the crowd thin", ["thin the crowd"])
        )

    def test_fact_group_hit_matches_killing_the_mother_against_kill_the_mother(self):
        self.assertTrue(
            self.mod.fact_group_hit("killing the mother first is the plan", ["kill the mother"])
        )

    def test_fact_group_hit_matches_hurting_her_badly_against_hurts_her_badly(self):
        self.assertTrue(
            self.mod.fact_group_hit("fire is also noted as hurting her badly", ["fire hurts her badly"])
        )

    def test_fact_group_hit_matches_the_paper_mario_report_reply(self):
        reply = (
            "The key to dealing with Hooktail's healing is managing the audience. She heals by "
            "eating members of the audience, so you need to keep the crowd thin. Also, remember "
            "that her bite cannot be blocked, so focus on keeping your own HP high rather than "
            "trying to guard against her attacks. Koops is useful here because his shell toss hits "
            "her first before you commit Mario. Fire is also noted as hurting her badly."
        )
        group1 = ["eats the audience", "eats spectators to heal", "thin the crowd", "keep the audience small"]
        group2 = ["cricket", "chirping sound", "the badge with the cricket noise", "fire damage", "fire hurts her badly"]
        self.assertTrue(self.mod.fact_group_hit(reply, group1))
        self.assertTrue(self.mod.fact_group_hit(reply, group2))

    def test_fact_group_hit_fails_when_the_words_are_too_far_apart(self):
        # A wrong answer must still fail: "crowd" and "thin" both occur somewhere in this reply,
        # but nowhere near each other -- a check with no window would wrongly pass it.
        reply = (
            "The crowd cheered loudly. "
            + " ".join(["and then something else happened"] * 4)
            + " The paint looked thin."
        )
        self.assertFalse(self.mod.fact_group_hit(reply, ["thin the crowd"]))

    def test_fact_group_hit_fails_when_the_stems_match_but_the_context_does_not(self):
        # Same shape, a different pair of words: "kill" and "mother" both occur, in two unrelated
        # sentences far apart, not describing the claim "kill the mother".
        reply = (
            "You can kill the runt easily. "
            + " ".join(["it takes a few hits to bring down"] * 4)
            + " Her mother taught her everything about the forest."
        )
        self.assertFalse(self.mod.fact_group_hit(reply, ["kill the mother"]))

    # --- plan 48 lane A, commit 2: negation-aware contradiction check (D86/D88) ----------------
    #
    # The old check only caught a contradiction that used one of a fixed list of exact sentences.
    # The Pikmin 2 reply recorded in docs/archive/research/kb-answer-eval-2026-09-07-after-wave2.md
    # for case A-PIK2-02 said "yes, there is still a day limit" -- a plain contradiction of the
    # note, which the old check missed because the fixture's sentence was "there's a day limit"
    # (a different contraction) and "you have a limited number of days" (different words again).

    def test_claim_group_hit_catches_the_pikmin_reply_that_kept_the_day_limit(self):
        reply = (
            "Regarding the day limit, yes, there is still a day limit. The day ends at sunset, "
            "and any Pikmin that is not with a captain or back at the Onion will be eaten when "
            "the night creatures wake up. You need to watch the sun and call everyone in early."
        )
        self.assertTrue(self.mod.claim_group_hit(reply, ["there is a day limit"]))

    def test_claim_group_hit_does_not_fire_when_the_reply_denies_the_claim(self):
        reply = "There is no day limit in Pikmin 2 -- take as long as you need."
        self.assertFalse(self.mod.claim_group_hit(reply, ["there is a day limit"]))

    def test_claim_group_hit_recognises_no_longer_as_a_negation(self):
        reply = "There is no longer a day limit in this game."
        self.assertFalse(self.mod.claim_group_hit(reply, ["there is a day limit"]))

    def test_claim_group_hit_known_miss_not_only_is_there_a_day_limit(self):
        # Named in plan 48 (docs/planning/48-kb-wave-three-session.md, section 10) as a phrasing a
        # negation-aware check on a fixed lookback can be fooled by: "not" sits just before "there"
        # here, so it reads as a negation of the claim even though "not only" does not actually
        # deny that a day limit exists -- the opposite of what the sentence means. Documented as a
        # known miss rather than chased; the judge column (commit 3) is the second opinion for
        # exactly this kind of case.
        reply = "Not only is there a day limit."
        self.assertFalse(self.mod.claim_group_hit(reply, ["there is a day limit"]))

    # --- the two false contradictions the first real run produced, 2026-09-07 -----------------
    #
    # Running the 61-question set with the new check gave seven contradiction hits, and four of
    # them were the check misreading a reply that was giving the right advice. Both replies below
    # are verbatim from that run. A false contradiction is the expensive kind of mistake here:
    # "never contradicts its note" is the number this project quotes about whether its answers can
    # be trusted, so inflating it is as bad as the 100% it replaced.

    def test_claim_group_hit_does_not_join_words_across_a_sentence_break(self):
        # Verbatim Black Mesa reply. "shooting" is in one sentence and "legs" in the next, and
        # both sentences say the opposite of the claim -- avoid the shell, the legs hurt YOU.
        reply = (
            "You need to target the pale egg sac underneath its body for damage. "
            "Avoid shooting at the shell. Up close, its front legs can deal significant damage."
        )
        self.assertFalse(
            self.mod.claim_group_hit(
                reply, ["shoot the legs", "aim for the legs", "target its legs"]
            )
        )

    def test_claim_group_hit_reads_too_close_as_a_warning_not_as_advice(self):
        # Verbatim DOOM Eternal reply. The note says stay at mid-range and the reply says exactly
        # that; "too close" is the warning, not the advice.
        reply = (
            "Focus on staying at mid-range. If you get too close, "
            "it will draw your super shotgun faster than you can dash."
        )
        self.assertFalse(
            self.mod.claim_group_hit(
                reply,
                ["rush him", "get in close", "close the distance", "stand right next to him"],
            )
        )

    def test_claim_group_hit_still_catches_the_same_claim_given_as_advice(self):
        # The other side of the two tests above: without "too", and inside one sentence, this is
        # the reply genuinely telling someone to do the thing the note warns against.
        self.assertTrue(
            self.mod.claim_group_hit("Just rush him down and keep swinging.", ["rush him"])
        )

    def test_claim_group_hit_any_alternative_in_the_group_counts(self):
        self.assertTrue(
            self.mod.claim_group_hit(
                "focus one first and ignore the other twin", ["kill one first", "focus one first"]
            )
        )

    # --- plan 48 lane A, commit 2: must_not_say fixture shape --------------------------------

    def test_parse_must_not_say_wraps_the_old_flat_shape_as_one_claim_group(self):
        self.assertEqual(
            self.mod._parse_must_not_say(["training perk", "power armor training"]),
            [["training perk", "power armor training"]],
        )

    def test_parse_must_not_say_keeps_the_new_nested_shape(self):
        self.assertEqual(
            self.mod._parse_must_not_say([["training perk", "power armor training"], ["a second claim"]]),
            [["training perk", "power armor training"], ["a second claim"]],
        )

    def test_parse_must_not_say_empty_is_empty(self):
        self.assertEqual(self.mod._parse_must_not_say([]), [])
        self.assertEqual(self.mod._parse_must_not_say(None), [])

    # --- plan 48 lane A, commit 3: judge column (report-only, D86 call 4) ---------------------

    class _FakeOllamaResponse:
        """Enough of ``http.client.HTTPResponse`` for ``call_judge``: a context manager whose
        ``read()`` returns the body bytes urllib.request.urlopen would have handed back."""

        def __init__(self, body: bytes):
            self._body = body

        def read(self):
            return self._body

        def __enter__(self):
            return self

        def __exit__(self, *_a):
            return False

    def _fake_ollama_chat(self, message_json: dict):
        return self._FakeOllamaResponse(
            json.dumps({"message": {"content": json.dumps(message_json)}}).encode("utf-8")
        )

    def test_call_judge_parses_a_well_formed_verdict(self):
        mod = self.mod
        response = self._fake_ollama_chat({"contradicts_note": True, "facts_stated": [True, False]})
        with patch.object(mod.urllib.request, "urlopen", return_value=response) as mock_urlopen:
            out = mod.call_judge("http://127.0.0.1:11434", "judge-model", "note text", "reply text", [["a"], ["b"]])
        self.assertEqual(out, {"contradicts_note": True, "facts_stated": [True, False]})
        # the request went to the chat endpoint, non-streaming, naming the judge model
        req = mock_urlopen.call_args.args[0]
        self.assertTrue(req.full_url.endswith("/api/chat"))
        sent = json.loads(req.data.decode("utf-8"))
        self.assertEqual(sent["model"], "judge-model")
        self.assertFalse(sent["stream"])

    def test_call_judge_raises_on_unparseable_content(self):
        mod = self.mod
        response = self._FakeOllamaResponse(json.dumps({"message": {"content": "not json"}}).encode("utf-8"))
        with patch.object(mod.urllib.request, "urlopen", return_value=response):
            with self.assertRaises(Exception):
                mod.call_judge("http://127.0.0.1:11434", "judge-model", "note", "reply", [])

    def test_call_judge_missing_facts_stated_is_an_empty_list_not_an_error(self):
        mod = self.mod
        response = self._fake_ollama_chat({"contradicts_note": False})
        with patch.object(mod.urllib.request, "urlopen", return_value=response):
            out = mod.call_judge("http://127.0.0.1:11434", "judge-model", "note", "reply", [["a"]])
        self.assertEqual(out, {"contradicts_note": False, "facts_stated": []})

    def test_judge_prompt_carries_the_note_reply_and_fact_count(self):
        prompt = self.mod._judge_prompt("THE NOTE", "THE REPLY", [["a", "b"], ["c"]])
        self.assertIn("THE NOTE", prompt)
        self.assertIn("THE REPLY", prompt)
        self.assertIn("2", prompt)  # two fact groups to answer for

    def test_mean_judge_elapsed_s_is_none_when_the_judge_never_ran(self):
        samples = [self._sample(judge_elapsed_s=None)]
        self.assertIsNone(self.mod.mean_judge_elapsed_s(samples))

    def test_mean_judge_elapsed_s_averages_only_samples_that_ran(self):
        samples = [
            self._sample(judge_elapsed_s=1.0),
            self._sample(judge_elapsed_s=3.0),
            self._sample(judge_elapsed_s=None),
        ]
        self.assertEqual(self.mod.mean_judge_elapsed_s(samples), 2.0)

    def test_judge_cell_reports_the_error_when_the_judge_call_failed(self):
        r = self._sample(judge_error="TimeoutError: timed out")
        self.assertIn("TimeoutError", self.mod._judge_cell(r))

    def test_judge_cell_is_na_when_the_judge_did_not_run(self):
        r = self._sample()
        self.assertEqual(self.mod._judge_cell(r), "n/a")

    def test_judge_cell_reports_contradiction_and_facts(self):
        r = self._sample(judge_contradicts=True, judge_all_facts_stated=False)
        cell = self.mod._judge_cell(r)
        self.assertIn("contradicts", cell)
        self.assertIn("missing", cell)

    def test_sample_result_all_ok_ignores_the_judge_columns(self):
        # The judge column must never move a score: a sample every fixed check likes, but where
        # the judge (rightly or wrongly) flags a contradiction, is still all_ok.
        r = self._sample(
            success=True, card_ok=True, attached_ok=True, mention_ok=True, notsay_ok=True,
            fence_ok=True, branches_ok=True, judge_contradicts=True, judge_all_facts_stated=False,
        )
        self.assertTrue(r.all_ok)

    def test_summarize_judge_agreement_counts_only_when_both_checks_ran(self):
        mod = self.mod
        case = self._case(id="c1")
        samples = [
            # judge ran, fixed contradiction check did not (no must_not_say on this case) -- not counted
            self._sample(case_id="c1", notsay_ok=None, judge_contradicts=False),
            # neither ran -- not counted
            self._sample(case_id="c1", notsay_ok=None, judge_contradicts=None),
        ]
        summary = mod.summarize([case], samples)
        self.assertEqual(summary.judge_contradiction_agree.of, 0)

    def test_summarize_judge_agreement_true_when_they_agree_false_when_they_disagree(self):
        mod = self.mod
        case = self._case(id="c1")
        samples = [
            # fixed check found a contradiction (notsay_ok False); judge agrees (judge_contradicts True)
            self._sample(case_id="c1", notsay_ok=False, judge_contradicts=True, mention_ok=None),
            # fixed check found nothing wrong (notsay_ok True); judge disagrees (judge_contradicts True)
            self._sample(case_id="c1", notsay_ok=True, judge_contradicts=True, mention_ok=None),
        ]
        summary = mod.summarize([case], samples)
        self.assertEqual((summary.judge_contradiction_agree.hit, summary.judge_contradiction_agree.of), (1, 2))

    # --- plan 48 followup-shapes measurement lane: SampleResult gains two off-by-default fields -

    def test_sample_result_followup_fields_default_off(self):
        r = self._sample()
        self.assertFalse(r.followup_used)
        self.assertEqual(r.followup_subject, "")

    def test_summarize_judge_facts_agreement(self):
        mod = self.mod
        case = self._case(id="c1")
        samples = [
            self._sample(case_id="c1", mention_ok=True, judge_all_facts_stated=True, notsay_ok=None),
            self._sample(case_id="c1", mention_ok=True, judge_all_facts_stated=False, notsay_ok=None),
        ]
        summary = mod.summarize([case], samples)
        self.assertEqual((summary.judge_facts_agree.hit, summary.judge_facts_agree.of), (1, 2))


class EvalKbAnswersOrientationFirstVariantTests(unittest.TestCase):
    """Plan 48, Lane D: the ``orientation_first`` prompt-variant hook.

    This was ``answer_first`` and ran the other way round. Tactics-first won the measurement on
    2026-09-07 and the maintainer took it, so it is now what the plugin ships and this variant
    restores the OLD orientation-first sentence instead -- which is what these tests assert.
    Measures nothing itself -- it
    only proves the swap fires on the turn shape it is meant for and stays out of the way of every
    other turn shape, the same way the two spoiler-fence variants above it are proven."""

    _KB_BLOCK = (
        "--- Local knowledge base (bonsAI; offline corpus; may be truncated) ---\n"
        "Domain: strategy\n\n"
        "[Half-Life 2 / boss: Nova Prospekt] (trust: high)\n"
        "Some tactics text here.\n"
        "--- end of knowledge base ---"
    )

    @classmethod
    def setUpClass(cls):
        cls.mod = _load_eval_module()
        from backend.services.ollama_prompts import build_system_prompt

        cls.build_system_prompt = staticmethod(build_system_prompt)

    @classmethod
    def tearDownClass(cls):
        sys.modules.pop("eval_kb_answers", None)

    def _strategy_prompt(self, *, entity: str = "", early_context_suffix: str = ""):
        return self.build_system_prompt(
            "how do i beat the strider",
            "220",
            "Half-Life 2",
            [],
            [],
            lambda app_id: "",
            lambda path: {},
            ask_mode="strategy",
            early_context_suffix=early_context_suffix,
            strategy_spoiler_asked_entity=entity,
            strategy_spoiler_kb_entity_match=bool(entity),
        )

    def test_restores_the_orientation_sentence_on_a_strategy_turn_with_a_named_thing_and_a_note(self):
        prompt = self._strategy_prompt(entity="the strider", early_context_suffix=self._KB_BLOCK)
        # Sanity: both conditions the variant looks for are actually present in the built prompt.
        self.assertIn("NAMED-ENTITY CONSENT", prompt)
        self.assertIn("Local knowledge base", prompt)
        self.assertIn(self.mod._ANSWER_FIRST_SENTENCE, prompt)

        out = self.mod._variant_orientation_first(prompt)

        self.assertNotEqual(out, prompt)
        self.assertNotIn(self.mod._ANSWER_FIRST_SENTENCE, out)
        self.assertIn(self.mod._ORIENTATION_MENU_SENTENCE, out)
        # The rest of the turn (the menu fence, the spoiler policy line) is untouched.
        self.assertIn("```bonsai-strategy-branches", out)
        self.assertIn("NAMED-ENTITY CONSENT", out)

    def test_leaves_a_speed_turn_untouched(self):
        prompt = self.build_system_prompt(
            "how do i beat the strider",
            "220",
            "Half-Life 2",
            [],
            [],
            lambda app_id: "",
            lambda path: {},
            ask_mode="speed",
            early_context_suffix=self._KB_BLOCK,
        )
        out = self.mod._variant_orientation_first(prompt)
        self.assertEqual(out, prompt)

    def test_leaves_a_strategy_turn_untouched_when_no_note_is_attached(self):
        prompt = self._strategy_prompt(entity="the strider", early_context_suffix="")
        self.assertIn(self.mod._ANSWER_FIRST_SENTENCE, prompt)
        out = self.mod._variant_orientation_first(prompt)
        self.assertEqual(out, prompt)

    def test_leaves_a_strategy_turn_untouched_when_nothing_was_named(self):
        prompt = self._strategy_prompt(entity="", early_context_suffix=self._KB_BLOCK)
        self.assertIn(self.mod._ANSWER_FIRST_SENTENCE, prompt)
        out = self.mod._variant_orientation_first(prompt)
        self.assertEqual(out, prompt)

    def test_registered_in_the_variant_table(self):
        self.assertIn("orientation_first", self.mod.VARIANTS)
        self.assertIs(
            self.mod.VARIANTS["orientation_first"], self.mod._variant_orientation_first
        )


class EvalKbAnswersFollowupPairTests(unittest.TestCase):
    """Plan 48 D98 measurement lane: two-turn ``followup_pairs`` support.

    Nothing here touches Ollama or the Deck. ``load_followup_pairs`` and ``_narrow_text_block_to_
    subject`` are pure functions; ``run_sample``/``run_turn``/``run_followup_pair`` are exercised
    with a fake ``run_game_ai_request`` so the plumbing (turn order, case-id suffixes, memory reset
    between pairs, follow-up capture reset between turns) is pinned without a live model. The one
    test that calls the real ``kb_followup_memory.augment_search_words`` proves the reset-per-turn
    behaviour against the actual shipped function, not a stand-in for it.
    """

    @classmethod
    def setUpClass(cls):
        cls.mod = _load_eval_module()

    @classmethod
    def tearDownClass(cls):
        sys.modules.pop("eval_kb_answers", None)

    def setUp(self):
        self.mod._reset_followup_capture()

    def tearDown(self):
        self.mod._reset_followup_capture()

    def _fixture_path(self, tmp_dir, pairs_raw):
        path = Path(tmp_dir) / "fixture.json"
        path.write_text(json.dumps({"cases": [], "followup_pairs": pairs_raw}), encoding="utf-8")
        return path

    def _fake_capture(self):
        return self.mod._ListHandler()

    # --- load_followup_pairs -------------------------------------------------------------------

    def test_load_followup_pairs_reads_turns_in_order(self):
        mod = self.mod
        pairs_raw = [
            {
                "id": "P-TEST-01",
                "app_id": "123",
                "app_name": "Some Game",
                "ask_mode": "strategy",
                "turns": [
                    {"question": "how do i beat the boss", "expect_card": "Boss"},
                    {"question": "what about its second phase", "expect_card": "Boss"},
                ],
                "note": "test pair",
            }
        ]
        with tempfile.TemporaryDirectory() as tmp:
            pairs = mod.load_followup_pairs(self._fixture_path(tmp, pairs_raw), None)
        self.assertEqual(len(pairs), 1)
        pair = pairs[0]
        self.assertEqual(pair.id, "P-TEST-01")
        self.assertEqual(pair.app_id, "123")
        self.assertEqual(pair.ask_mode, "strategy")
        self.assertEqual(len(pair.turns), 2)
        self.assertEqual(pair.turns[0].question, "how do i beat the boss")
        self.assertEqual(pair.turns[0].expect_card, "Boss")
        self.assertEqual(pair.turns[1].question, "what about its second phase")

    def test_load_followup_pairs_only_filters_by_id(self):
        mod = self.mod
        pairs_raw = [
            {"id": "P-A", "app_id": "1", "app_name": "G1", "ask_mode": "strategy",
             "turns": [{"question": "q1"}, {"question": "q2"}]},
            {"id": "P-B", "app_id": "2", "app_name": "G2", "ask_mode": "strategy",
             "turns": [{"question": "q1"}, {"question": "q2"}]},
        ]
        with tempfile.TemporaryDirectory() as tmp:
            pairs = mod.load_followup_pairs(self._fixture_path(tmp, pairs_raw), {"P-B"})
        self.assertEqual([p.id for p in pairs], ["P-B"])

    def test_load_followup_pairs_rejects_fewer_than_two_turns(self):
        mod = self.mod
        pairs_raw = [
            {"id": "P-SHORT", "app_id": "1", "app_name": "G", "ask_mode": "strategy",
             "turns": [{"question": "only one turn"}]}
        ]
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(SystemExit):
                mod.load_followup_pairs(self._fixture_path(tmp, pairs_raw), None)

    def test_load_followup_pairs_unknown_id_raises(self):
        mod = self.mod
        pairs_raw = [
            {"id": "P-A", "app_id": "1", "app_name": "G", "ask_mode": "strategy",
             "turns": [{"question": "q1"}, {"question": "q2"}]}
        ]
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(SystemExit):
                mod.load_followup_pairs(self._fixture_path(tmp, pairs_raw), {"NOPE"})

    # --- _narrow_text_block_to_subject (shape B, "narrow_notes") --------------------------------

    _BLOCK = (
        "--- Local knowledge base (bonsAI; offline corpus; may be truncated) ---\n"
        "Domain: strategy\n"
        "\n[Deep Rock Galactic: Survivor / boss: Glyphid Dreadnought] (trust: high)\n"
        "Kite between waves.\n"
        "\n[Deep Rock Galactic: Survivor / boss: Dreadnought Twins] (trust: high)\n"
        "Split fire evenly.\n"
        "\n--- End local knowledge base ---"
    )

    def test_narrow_keeps_only_the_matching_card(self):
        out, kept = self.mod._narrow_text_block_to_subject(self._BLOCK, "Glyphid Dreadnought")
        self.assertEqual(kept, ["Glyphid Dreadnought"])
        self.assertIn("Kite between waves.", out)
        self.assertNotIn("Split fire evenly.", out)
        self.assertIn("--- End local knowledge base ---", out)

    def test_narrow_is_case_insensitive(self):
        out, kept = self.mod._narrow_text_block_to_subject(self._BLOCK, "dreadnought twins")
        self.assertEqual(kept, ["Dreadnought Twins"])
        self.assertIn("Split fire evenly.", out)
        self.assertNotIn("Kite between waves.", out)

    def test_narrow_no_matching_card_drops_everything(self):
        # The shape's own choice: a subject with no matching card in this turn's pool gets
        # nothing, not a fallback to the unfiltered set.
        out, kept = self.mod._narrow_text_block_to_subject(self._BLOCK, "Exploder")
        self.assertEqual(out, "")
        self.assertEqual(kept, [])

    def test_narrow_blank_subject_is_unchanged(self):
        out, kept = self.mod._narrow_text_block_to_subject(self._BLOCK, "")
        self.assertEqual(out, self._BLOCK)
        self.assertEqual(kept, [])

    def test_narrow_block_with_no_card_headers_is_unchanged(self):
        block = "--- Local knowledge base ... ---\n\n[Genre/compat fallback] (trust: fallback)\ntext"
        out, kept = self.mod._narrow_text_block_to_subject(block, "Anything")
        self.assertEqual(out, block)
        self.assertEqual(kept, [])

    # --- _wrap_augment_search_words_for_capture (diagnostic, every shape) -----------------------

    def test_capture_wrap_records_when_the_real_fn_augments(self):
        mod = self.mod
        real = lambda q, *, remembered_subject: f"{q} {remembered_subject}"
        wrapped = mod._wrap_augment_search_words_for_capture(real)
        out = wrapped("what about its second phase", remembered_subject="Glyphid Dreadnought")
        self.assertEqual(out, "what about its second phase Glyphid Dreadnought")
        self.assertTrue(mod._followup_capture.is_followup_turn)
        self.assertEqual(mod._followup_capture.remembered_subject, "Glyphid Dreadnought")

    def test_capture_wrap_does_not_record_when_the_real_fn_leaves_it_unchanged(self):
        mod = self.mod
        real = lambda q, *, remembered_subject: q
        wrapped = mod._wrap_augment_search_words_for_capture(real)
        wrapped("how do i beat the glyphid dreadnought", remembered_subject="Glyphid Dreadnought")
        self.assertFalse(mod._followup_capture.is_followup_turn)
        self.assertEqual(mod._followup_capture.remembered_subject, "")

    def test_capture_wrap_never_changes_the_return_value(self):
        mod = self.mod
        real = lambda q, *, remembered_subject: f"{q} {remembered_subject}"
        wrapped = mod._wrap_augment_search_words_for_capture(real)
        self.assertEqual(
            wrapped("q", remembered_subject="Subject"), real("q", remembered_subject="Subject")
        )

    # --- _variant_no_subject_note (shape: strips the now-shipped sentence back out) -------------

    def test_no_subject_note_strips_the_shipped_sentence_when_followup_used(self):
        mod = self.mod
        note = mod.FOLLOWUP_SUBJECT_NOTE_TEMPLATE.format(subject="Glyphid Dreadnought")
        prompt = f"Intro text.\n{mod._KB_BLOCK_HEADER_MARKER}{note}Domain: strategy\nbody"
        mod._followup_capture.is_followup_turn = True
        mod._followup_capture.remembered_subject = "Glyphid Dreadnought"
        out = mod._variant_no_subject_note(prompt)
        self.assertNotEqual(out, prompt)
        self.assertNotIn("FOLLOW-UP CONTEXT", out)
        self.assertNotIn("Glyphid Dreadnought", out)
        self.assertIn(mod._KB_BLOCK_HEADER_MARKER, out)

    def test_no_subject_note_noop_when_not_a_followup_turn(self):
        mod = self.mod
        note = mod.FOLLOWUP_SUBJECT_NOTE_TEMPLATE.format(subject="Glyphid Dreadnought")
        prompt = f"Intro.\n{mod._KB_BLOCK_HEADER_MARKER}{note}body"
        mod._followup_capture.is_followup_turn = False
        mod._followup_capture.remembered_subject = ""
        self.assertEqual(mod._variant_no_subject_note(prompt), prompt)

    def test_no_subject_note_noop_when_the_sentence_was_never_inserted(self):
        mod = self.mod
        prompt = f"Intro.\n{mod._KB_BLOCK_HEADER_MARKER}\nbody -- no follow-up sentence here"
        mod._followup_capture.is_followup_turn = True
        mod._followup_capture.remembered_subject = "Glyphid Dreadnought"
        self.assertEqual(mod._variant_no_subject_note(prompt), prompt)

    # --- run_sample still delegates to run_turn with this case's own fields ---------------------

    def test_run_sample_delegates_to_run_turn_with_case_fields(self):
        mod = self.mod
        case = mod.Case(
            id="c1", app_id="1", app_name="Game", ask_mode="strategy", question="q",
            expect_card=None, must_mention=[], must_not_say=[], expect_fence=None,
            expect_branches=None, expect_attached=None, note="",
        )
        retrieval_log: list = []

        async def fake_run_game_ai_request(plugin, question, ollama_base, app_id, app_name, attachments, ask_mode):
            retrieval_log.append(types.SimpleNamespace(attached=False, text_block=""))
            return {"success": True, "response": "an answer", "strategy_guide_branches": None}

        r = asyncio.run(
            mod.run_sample(
                types.SimpleNamespace(),
                case,
                sample_idx=1,
                ollama_base="http://x",
                retrieval_log=retrieval_log,
                capture=self._fake_capture(),
                kb_card_names=lambda text: [],
                run_game_ai_request=fake_run_game_ai_request,
            )
        )
        self.assertEqual(r.case_id, "c1")
        self.assertEqual(r.reply, "an answer")
        self.assertTrue(r.success)
        self.assertFalse(r.followup_used)  # ordinary cases never touch the followup-pair fields

    # --- run_followup_pair: turn order, case-id suffixes, memory reset between pairs ------------

    def _two_turn_pair(self, q1="q1", q2="what about its second phase"):
        mod = self.mod
        return mod.FollowupPair(
            id="P-TEST",
            app_id="1",
            app_name="Game",
            ask_mode="strategy",
            turns=[
                mod.FollowupTurn(question=q1, expect_card=None, must_mention=[], must_not_say=[],
                                  expect_fence=None, expect_branches=None, expect_attached=None),
                mod.FollowupTurn(question=q2, expect_card=None, must_mention=[], must_not_say=[],
                                  expect_fence=None, expect_branches=None, expect_attached=None),
            ],
        )

    def test_run_followup_pair_runs_turns_in_order_with_suffixed_case_ids(self):
        mod = self.mod
        pair = self._two_turn_pair()
        retrieval_log: list = []
        asked: list[str] = []

        async def fake_run_game_ai_request(plugin, question, ollama_base, app_id, app_name, attachments, ask_mode):
            asked.append(question)
            retrieval_log.append(types.SimpleNamespace(attached=True, text_block=""))
            return {"success": True, "response": f"reply to {question}", "strategy_guide_branches": None}

        results = asyncio.run(
            mod.run_followup_pair(
                types.SimpleNamespace(),
                pair,
                sample_idx=1,
                ollama_base="http://x",
                retrieval_log=retrieval_log,
                capture=self._fake_capture(),
                kb_card_names=lambda text: [],
                run_game_ai_request=fake_run_game_ai_request,
            )
        )
        self.assertEqual([r.case_id for r in results], ["P-TEST-T1", "P-TEST-T2"])
        self.assertEqual(asked, ["q1", "what about its second phase"])

    def test_run_followup_pair_clears_memory_before_the_first_turn(self):
        mod = self.mod
        from backend.services import kb_followup_memory

        pair = self._two_turn_pair()
        retrieval_log: list = []

        async def fake_run_game_ai_request(plugin, question, ollama_base, app_id, app_name, attachments, ask_mode):
            retrieval_log.append(types.SimpleNamespace(attached=False, text_block=""))
            return {"success": True, "response": "reply", "strategy_guide_branches": None}

        with patch.object(kb_followup_memory, "forget") as mock_forget:
            asyncio.run(
                mod.run_followup_pair(
                    types.SimpleNamespace(),
                    pair,
                    sample_idx=1,
                    ollama_base="http://x",
                    retrieval_log=retrieval_log,
                    capture=self._fake_capture(),
                    kb_card_names=lambda text: [],
                    run_game_ai_request=fake_run_game_ai_request,
                )
            )
        mock_forget.assert_called_once()

    def test_run_followup_pair_resets_followup_capture_between_turns(self):
        """Uses the real ``kb_followup_memory.augment_search_words`` (wrapped for capture, not
        replaced) so this proves the reset-per-turn behaviour against shipped logic: turn 1's
        plain question does not look like a follow-up, turn 2's "what about ..." does."""
        mod = self.mod
        from backend.services import kb_followup_memory

        real_augment = kb_followup_memory.augment_search_words
        pair = self._two_turn_pair()
        retrieval_log: list = []
        captured_states: list = []

        async def fake_run_game_ai_request(plugin, question, ollama_base, app_id, app_name, attachments, ask_mode):
            # Stands in for the one call site in game_ai_request.py that can add the remembered
            # subject to the search words -- this is the real function, only wrapped.
            kb_followup_memory.augment_search_words(question, remembered_subject="Glyphid Dreadnought")
            captured_states.append(
                (mod._followup_capture.is_followup_turn, mod._followup_capture.remembered_subject)
            )
            retrieval_log.append(types.SimpleNamespace(attached=True, text_block=""))
            return {"success": True, "response": "reply", "strategy_guide_branches": None}

        with patch.object(
            kb_followup_memory,
            "augment_search_words",
            mod._wrap_augment_search_words_for_capture(real_augment),
        ):
            asyncio.run(
                mod.run_followup_pair(
                    types.SimpleNamespace(),
                    pair,
                    sample_idx=1,
                    ollama_base="http://x",
                    retrieval_log=retrieval_log,
                    capture=self._fake_capture(),
                    kb_card_names=lambda text: [],
                    run_game_ai_request=fake_run_game_ai_request,
                )
            )
        self.assertEqual(
            captured_states,
            [
                (False, ""),                             # turn 1: "q1" does not read as a follow-up
                (True, "Glyphid Dreadnought"),            # turn 2: "what about ..." does
            ],
        )


if __name__ == "__main__":
    unittest.main()
