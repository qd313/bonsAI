"""Tests for ``<bonsai-status>`` stream tag extraction."""

import re
import unittest

from backend.services.bonsai_stream_tags import (
    _STATIC_LINE_FIRST_WINDOW_SECONDS,
    _STATIC_LINE_STEP_WINDOW_SECONDS,
    SUMMING_UP_LINE,
    _static_window_seconds,
    compose_thinking_blurb,
    deterministic_thinking_phase_fallback,
    escalate_static_thinking_line,
    extract_bonsai_status,
    extract_question_snippet,
    format_thinking_phase,
    partial_stream_has_content,
    sanitize_thinking_summary,
)

_BANNED_PREFIXES = ("yeah", "fine.", "sure.", "oh joy", "right.")
_EMOJI_ONLY_LINES = ("🙄", "😮‍💨", "🫠", "🌳")


def _static_window_midpoints(request_id: int, count: int) -> list[float]:
    """A time inside each successive stale-line window, for a request whose windows vary."""
    mids: list[float] = []
    boundary = 0.0
    for index in range(count):
        width = _static_window_seconds(request_id, index)
        mids.append(boundary + (width / 2.0))
        boundary += width
    return mids


def _assert_no_banned_prefixes(text: str) -> None:
    lowered = text.lower()
    for prefix in _BANNED_PREFIXES:
        if prefix == "yeah":
            assert not re.match(r"^\s*yeah\b", lowered), f"unexpected Yeah opener in {text!r}"
        else:
            assert not lowered.startswith(prefix), f"unexpected prefix in {text!r}"
    assert "🙄🔥" not in text


class BonsaiStreamTagsTests(unittest.TestCase):
    def test_extract_and_strip(self):
        raw = "<bonsai-status>Checking GPU</bonsai-status>\n\nHello there."
        summary, stripped = extract_bonsai_status(raw)
        self.assertEqual(summary, "Checking GPU")
        self.assertEqual(stripped, "Hello there.")

    def test_extract_strips_lazy_yeah_opener(self):
        raw = "<bonsai-status>Yeah, checking GPU</bonsai-status>\n\nHello."
        summary, stripped = extract_bonsai_status(raw)
        self.assertEqual(summary, "checking GPU")
        self.assertEqual(stripped, "Hello.")

    def test_sanitize_thinking_summary_strips_yeah_variants(self):
        self.assertEqual(sanitize_thinking_summary("Yeah, on it"), "on it")
        self.assertEqual(sanitize_thinking_summary("Yeah — another crisis"), "another crisis")
        self.assertEqual(sanitize_thinking_summary("Fine. Sure. Working"), "Working")

    def test_sanitize_thinking_summary_parity(self):
        """Same table as composeThinkingBlurb.test.ts.

        Both sanitizers run on the same string in series — Python on the model tag, TS again on
        the polled result — so a divergence does not merely differ, it blanks the thinking line.
        """
        self.assertEqual(sanitize_thinking_summary("Sure."), "Sure.")
        self.assertEqual(sanitize_thinking_summary("Yeah"), "Yeah")
        self.assertEqual(sanitize_thinking_summary("Fine. Sure."), "Fine. Sure.")
        self.assertEqual(sanitize_thinking_summary(""), "")
        self.assertEqual(sanitize_thinking_summary("   "), "")

    def test_sanitize_thinking_summary_is_idempotent(self):
        for text in ("Sure.", "Yeah, checking GPU", "Fine. Sure. Working", "Working"):
            once = sanitize_thinking_summary(text)
            self.assertEqual(sanitize_thinking_summary(once), once)
            self.assertNotEqual(once, "")

    def test_no_tag_passthrough(self):
        raw = "Plain answer."
        summary, stripped = extract_bonsai_status(raw)
        self.assertIsNone(summary)
        self.assertEqual(stripped, raw)

    def test_incomplete_tag_hidden_from_visible(self):
        raw = "<bonsai-status>Checking GPU"
        summary, stripped = extract_bonsai_status(raw)
        self.assertIsNone(summary)
        self.assertEqual(stripped, "")

    def test_partial_open_prefix_hidden(self):
        """Streaming tokens like '<bons' must not leak into the reply bubble."""
        summary, stripped = extract_bonsai_status("<bons")
        self.assertIsNone(summary)
        self.assertEqual(stripped, "")
        summary, stripped = extract_bonsai_status("Hi\n<bonsai-stat")
        self.assertIsNone(summary)
        self.assertEqual(stripped, "Hi")

    def test_bare_trailing_angle_bracket_hidden(self):
        """Deck 2026-08-04: Stop within the first second kept a one-character '<' as the answer.

        `<bons` was already hidden but a lone `<` was not, so the very first streamed token of a
        status tag leaked — into the live bubble for one frame, and permanently into the reply if
        the user pressed Stop on that frame.
        """
        summary, stripped = extract_bonsai_status("<")
        self.assertIsNone(summary)
        self.assertEqual(stripped, "")

        summary, stripped = extract_bonsai_status("Here is the answer so far <")
        self.assertIsNone(summary)
        self.assertEqual(stripped, "Here is the answer so far")

    def test_real_less_than_in_prose_is_kept(self):
        """The guard that makes hiding a bare '<' safe: anything after it that is not the opener."""
        for raw in (
            "set it if a < b",
            "use a value < 60 for battery",
            "compare x <= y",
            "a < b and c < d",
        ):
            summary, stripped = extract_bonsai_status(raw)
            self.assertIsNone(summary, raw)
            self.assertEqual(stripped, raw, raw)

    def test_hidden_bracket_returns_once_the_next_token_diverges(self):
        """Streaming a real '<': hidden for one token, then back. No content is lost."""
        self.assertEqual(extract_bonsai_status("if a <")[1], "if a")
        self.assertEqual(extract_bonsai_status("if a < ")[1], "if a <")
        self.assertEqual(extract_bonsai_status("if a < b")[1], "if a < b")

    def test_partial_stream_has_content_rejects_markup_debris(self):
        """Deck 2026-08-04: an early Stop kept '<', then '```', as the whole answer."""
        for debris in ("", "   ", "<", "```", "```\n", "- ", "**", "#", "\n\n", "<<<", "|"):
            self.assertFalse(partial_stream_has_content(debris), repr(debris))
        self.assertFalse(partial_stream_has_content(None))

    def test_partial_stream_has_content_keeps_short_real_answers(self):
        """No minimum length: '42' and 'Yes' are complete answers to plenty of questions."""
        for real in ("42", "Yes", "a", "```python\nx = 1", "Here is the answer so far"):
            self.assertTrue(partial_stream_has_content(real), repr(real))

    def test_broken_open_prefix_with_prose_hidden(self):
        """Deck: model emits '<bons you're asking…' then corrects once the tag completes."""
        summary, stripped = extract_bonsai_status("<bons you're asking about settings")
        self.assertIsNone(summary)
        self.assertEqual(stripped, "")
        summary, stripped = extract_bonsai_status("Hi\n<bons you're asking")
        self.assertIsNone(summary)
        self.assertEqual(stripped, "Hi")

    def test_extract_strips_multiple_status_tags_and_reports_the_latest(self):
        """The newest complete tag wins; every tag is still stripped from the reply body.

        This used to return "One". Keeping the first meant the thinking line froze as soon as the
        opening tag closed and stayed frozen for the rest of the generation.
        """
        raw = "<bonsai-status>One</bonsai-status>\n\nBody\n\n<bonsai-status>Two</bonsai-status>\n\nTail."
        summary, stripped = extract_bonsai_status(raw)
        self.assertEqual(summary, "Two")
        self.assertEqual(stripped, "Body\n\nTail.")

    def test_incomplete_later_tag_does_not_replace_the_live_summary(self):
        """A half-arrived tag must not flicker onto the line -- the previous one stays up."""
        settled = "<bonsai-status>One</bonsai-status>\n\nBody"
        mid_tag = settled + "\n\n<bonsai-status>Tw"
        self.assertEqual(extract_bonsai_status(settled)[0], "One")
        self.assertEqual(extract_bonsai_status(mid_tag)[0], "One")
        # ...and the partial markup is hidden from the reply body while it arrives.
        self.assertEqual(extract_bonsai_status(mid_tag)[1], "Body")

    def test_summary_advances_delta_by_delta_over_a_stream(self):
        """Replays a stream the way ollama_service does: re-extract from the full joined text."""
        deltas = [
            "<bonsai-status>Reading the logs</bonsai-status>",
            "\n\nFirst part of the answer.",
            "\n\n<bonsai-status>Now checking your settings</bonsai-status>",
            "\n\nSecond part.",
        ]
        seen: list[str] = []
        joined = ""
        for delta in deltas:
            joined += delta
            summary, _ = extract_bonsai_status(joined)
            if summary:
                seen.append(summary)
        self.assertEqual(seen[0], "Reading the logs")
        self.assertEqual(seen[-1], "Now checking your settings")
        self.assertEqual(
            extract_bonsai_status(joined)[1],
            "First part of the answer.\n\nSecond part.",
        )

    def test_deterministic_phase_fallback(self):
        self.assertIn(
            "masterpiece",
            deterministic_thinking_phase_fallback(streaming=True, has_partial=True, elapsed_seconds=0).lower(),
        )
        self.assertIn(
            "still thinking",
            deterministic_thinking_phase_fallback(streaming=False, has_partial=False, elapsed_seconds=10).lower(),
        )
        self.assertIn(
            "hard",
            deterministic_thinking_phase_fallback(streaming=False, has_partial=False, elapsed_seconds=3).lower(),
        )
        self.assertIn(
            "brain",
            deterministic_thinking_phase_fallback(streaming=False, has_partial=False, elapsed_seconds=0).lower(),
        )

    def test_deterministic_phase_fallback_stable_within_tier(self):
        early = deterministic_thinking_phase_fallback(streaming=False, has_partial=False, elapsed_seconds=2)
        later = deterministic_thinking_phase_fallback(streaming=False, has_partial=False, elapsed_seconds=6)
        self.assertEqual(early, later)

    def test_format_thinking_phase_starting(self):
        self.assertEqual(format_thinking_phase("starting"), "Starting…")

    def test_summing_up_is_one_fixed_line_for_every_tone_and_character(self):
        """Plan 68: unlike every other phase, this one line never changes -- not for a question
        to weave in, not for tone, not for a character preset. It is bookkeeping about the chat,
        not about what was asked."""
        for kwargs in (
            {},
            {"question": "what should i do about the boss fight"},
            {"question": "what should i do", "character_enabled": True, "character_preset_id": "pyro"},
            {"question": "help", "app_name": "Elden Ring", "request_id": 7},
        ):
            self.assertEqual(format_thinking_phase("summing_up", **kwargs), SUMMING_UP_LINE)

    def test_format_thinking_phase_with_game(self):
        self.assertEqual(
            format_thinking_phase("proton_logs", app_name="Elden Ring"),
            "Reading Proton logs for Elden Ring…",
        )
        self.assertEqual(
            format_thinking_phase("building_context", app_name="Zelda"),
            "Building context for Zelda…",
        )

    def test_format_thinking_phase_without_game(self):
        self.assertEqual(format_thinking_phase("proton_logs"), "Reading Proton logs…")
        self.assertEqual(format_thinking_phase("building_context"), "Building context…")

    def test_format_thinking_phase_screenshots(self):
        self.assertEqual(format_thinking_phase("screenshot_prep", attachment_count=1), "Preparing screenshot…")
        self.assertEqual(format_thinking_phase("screenshot_prep", attachment_count=2), "Preparing 2 screenshots…")

    def test_format_thinking_phase_truncates_long_game(self):
        long_name = "A" * 60
        out = format_thinking_phase("building_context", app_name=long_name)
        self.assertLessEqual(len(out), 240)
        self.assertIn("Building context for", out)

    def test_building_context_short_vs_long_elapsed(self):
        self.assertIn(
            "Building context",
            format_thinking_phase("building_context", elapsed_seconds=0),
        )
        self.assertEqual(
            format_thinking_phase("building_context", elapsed_seconds=2),
            "Still preparing…",
        )

    def test_extract_question_snippet(self):
        self.assertIn("shrine", extract_question_snippet("stuck on the shrine puzzle? help"))
        self.assertEqual(extract_question_snippet(""), "")

    def test_compose_thinking_blurb_weaves_question(self):
        out = compose_thinking_blurb("why is my fps low in elden ring", app_name="Elden Ring", request_id=7)
        self.assertIn("fps", out.lower())
        self.assertLessEqual(len(out), 240)
        _assert_no_banned_prefixes(out)

    def test_compose_thinking_blurb_witty_without_character(self):
        samples = [
            compose_thinking_blurb("why is my fps low", request_id=i)
            for i in range(12)
        ]
        for out in samples:
            _assert_no_banned_prefixes(out)
        self.assertTrue(
            any(
                "crisis" in out.lower()
                or "on it" in out.lower()
                or "fascinating" in out.lower()
                or "watts" in out.lower()
                or "tdp" in out.lower()
                or out in _EMOJI_ONLY_LINES
                for out in samples
            ),
            msg=samples,
        )

    def test_compose_thinking_blurb_deadpan_character(self):
        samples = [
            compose_thinking_blurb(
                "how do I beat this shrine puzzle",
                request_id=i,
                character_enabled=True,
                character_preset_id="portal_glados",
            )
            for i in range(12)
        ]
        for out in samples:
            _assert_no_banned_prefixes(out)
        lowered = [out.lower() for out in samples]
        self.assertTrue(
            any(
                "acknowledged" in s
                or "no enthusiasm" in s
                or "inevitably" in s
                or "results pending" in s
                or "logged" in s
                for s in lowered
            )
            or any(out in _EMOJI_ONLY_LINES for out in samples),
            msg=samples,
        )

    def test_compose_thinking_blurb_omits_game_title_without_app(self):
        out = compose_thinking_blurb("generic question", request_id=1)
        self.assertNotIn("again? Alright", out)
        self.assertNotIn("Still struggling with", out)

    def test_compose_thinking_blurb_stable_without_elapsed(self):
        a = compose_thinking_blurb("help with stuttering", request_id=11, elapsed_seconds=0.0)
        b = compose_thinking_blurb("help with stuttering", request_id=11, elapsed_seconds=12.0)
        self.assertEqual(a, b)

    def test_format_thinking_phase_woven_proton_logs(self):
        samples = [
            format_thinking_phase(
                "proton_logs",
                question="why crash on launch",
                app_name="Elden Ring",
                request_id=i,
            )
            for i in range(12)
        ]
        for out in samples:
            _assert_no_banned_prefixes(out)
        self.assertTrue(
            any("crash" in out.lower() for out in samples)
            or any(out in _EMOJI_ONLY_LINES for out in samples),
            msg=samples,
        )
        non_emoji = [out for out in samples if out not in _EMOJI_ONLY_LINES]
        if non_emoji:
            self.assertTrue(any("Elden Ring" in out for out in non_emoji))

    def test_format_thinking_phase_woven_tdp_read(self):
        # Sampled rather than pinned to one request_id: every pool ends with an emoji-only line,
        # so any single id may legitimately land on it. The contract is that the *prose* lines
        # weave the question, not that a given id produces prose.
        samples = [
            format_thinking_phase("tdp_read", question="what is my current tdp", request_id=i)
            for i in range(12)
        ]
        for out in samples:
            _assert_no_banned_prefixes(out)
        prose = [out for out in samples if out not in _EMOJI_ONLY_LINES]
        self.assertTrue(prose, msg=samples)
        for out in prose:
            self.assertIn("tdp", out.lower())

    def test_format_thinking_phase_woven_screenshot_prep(self):
        out = format_thinking_phase(
            "screenshot_prep",
            question="what is this UI element",
            app_name="Zelda",
            attachment_count=1,
            request_id=9,
        )
        lowered = out.lower()
        self.assertTrue(
            "screenshot" in lowered
            or "pixels" in lowered
            or "capture" in lowered
            or "ui element" in lowered
            or "proof" in lowered,
            msg=out,
        )
        _assert_no_banned_prefixes(out)

    def test_format_thinking_phase_woven_model_retry(self):
        samples = [
            format_thinking_phase("model_retry", question="help with stuttering", request_id=i)
            for i in range(12)
        ]
        for out in samples:
            _assert_no_banned_prefixes(out)
        prose = [out for out in samples if out not in _EMOJI_ONLY_LINES]
        self.assertTrue(prose, msg=samples)
        for out in prose:
            self.assertIn("stuttering", out.lower())

    def test_format_thinking_phase_woven_building_context_elapsed(self):
        out = format_thinking_phase(
            "building_context",
            question="optimize settings",
            app_name="Zelda",
            elapsed_seconds=2,
            request_id=13,
        )
        self.assertIn("optimize", out.lower())
        _assert_no_banned_prefixes(out)

    def test_format_thinking_phase_starting_delegates_to_blurb(self):
        samples = [
            format_thinking_phase(
                "starting",
                question="why is my fps low",
                app_name="Elden Ring",
                request_id=i,
            )
            for i in range(12)
        ]
        for out in samples:
            _assert_no_banned_prefixes(out)
        self.assertTrue(
            any("fps" in out.lower() for out in samples)
            or any(out in _EMOJI_ONLY_LINES for out in samples),
            msg=samples,
        )

    def test_no_ask_renders_emoji_only_for_every_phase(self):
        """A whole Ask must never be nothing but emoji next to the spinner.

        Every phase pool ends with an emoji-only line, and the pick used to key on request_id
        alone -- so when the bucket landed on that last entry it landed there for *every* phase
        of that Ask. Measured before the phase salt: 11 of these 50 request ids.
        """
        live_phases = ("proton_logs", "searching_kb", "tdp_read", "screenshot_prep", "model_retry")
        for rid in range(1, 51):
            lines = [
                format_thinking_phase(
                    phase,
                    question="why does the game crash on launch",
                    app_name="Elden Ring",
                    request_id=rid,
                )
                for phase in live_phases
            ]
            self.assertFalse(
                all(line in _EMOJI_ONLY_LINES for line in lines),
                msg=f"request_id={rid} rendered emoji-only for every phase: {lines}",
            )

    def test_static_line_is_left_alone_inside_the_grace_window(self):
        base = "Model's warming up for “how well does this run”. Hang in there…"
        for static in (0.0, 3.0, 6.9):
            self.assertEqual(
                escalate_static_thinking_line(base, static_seconds=static, request_id=4),
                base,
            )

    def test_static_line_starts_cycling_once_it_goes_stale(self):
        """The reported bug: one line for a whole 40-second generation.

        Walks the clock the way the poll loop does and requires the line to keep moving.
        """
        base = "Model's warming up. Hang in there…"
        seen = [
            escalate_static_thinking_line(base, static_seconds=float(t), request_id=4)
            for t in range(0, 60, 2)
        ]
        self.assertEqual(seen[0], base)
        # The first window is up to 13s, so only sample past its widest possible end.
        after_first_window = seen[7:]
        self.assertNotIn(base, after_first_window)
        # Not one replacement that then sticks -- it has to keep changing.
        self.assertGreaterEqual(len(set(after_first_window)), 4)

    def test_static_line_never_repeats_on_consecutive_steps(self):
        """Additive stepping, not hashing: two windows in a row must not land on the same line.

        Timing is randomised; content deliberately is not. Randomising both would let a line
        repeat back to back, which looks like the stall this exists to disprove.
        """
        base = "Still connecting…"
        for rid in range(1, 12):
            steps = [
                escalate_static_thinking_line(base, static_seconds=t, request_id=rid)
                # Window 0 holds the base line; the rotation starts at window 1.
                for t in _static_window_midpoints(rid, 9)[1:]
            ]
            for a, b in zip(steps, steps[1:]):
                self.assertNotEqual(a, b, msg=f"rid={rid}: {steps}")

    def test_window_lengths_are_irregular_and_inside_their_range(self):
        """A fixed beat reads as a spinner animation — the eye locks on and stops reading."""
        first_low, first_high = _STATIC_LINE_FIRST_WINDOW_SECONDS
        step_low, step_high = _STATIC_LINE_STEP_WINDOW_SECONDS
        for rid in range(1, 40):
            first = _static_window_seconds(rid, 0)
            self.assertGreaterEqual(first, first_low)
            self.assertLessEqual(first, first_high)
            widths = [_static_window_seconds(rid, i) for i in range(1, 13)]
            for width in widths:
                self.assertGreaterEqual(width, step_low)
                self.assertLessEqual(width, step_high)
            # Not a metronome, and not creeping in one direction either.
            self.assertGreater(len(set(round(w, 1) for w in widths)), 5, msg=f"rid={rid}: {widths}")
            self.assertNotEqual(widths, sorted(widths), msg=f"rid={rid}: {widths}")

    def test_window_lengths_are_stable_for_one_request(self):
        """The poll loop re-derives this every ~1.2s; a live re-roll would strobe the line."""
        for rid in (1, 5, 19):
            for index in range(6):
                self.assertEqual(
                    _static_window_seconds(rid, index), _static_window_seconds(rid, index)
                )
        base = "Still connecting…"
        # Two polls landing inside the same window must agree.
        mid = _static_window_midpoints(6, 4)[2]
        width = _static_window_seconds(6, 2)
        for offset in (-width / 4.0, 0.0, width / 4.0):
            self.assertEqual(
                escalate_static_thinking_line(base, static_seconds=mid + offset, request_id=6),
                escalate_static_thinking_line(base, static_seconds=mid, request_id=6),
            )

    def test_different_asks_do_not_share_a_rhythm(self):
        """Two Asks in a row should not step at the same moments."""
        schedules = {
            rid: tuple(round(_static_window_seconds(rid, i), 2) for i in range(6))
            for rid in range(1, 25)
        }
        self.assertGreater(len(set(schedules.values())), 20, msg=schedules)

    def test_static_line_never_predicts_how_much_longer(self):
        """Duration is unknown here. A "nearly done" followed by another 40s is worse than less."""
        forbidden = ("nearly there", "almost done", "any second", "just about", "finishing up")
        for tone in ("witty", "deadpan"):
            for rid in range(1, 8):
                for t in range(7, 90, 3):
                    out = escalate_static_thinking_line(
                        "base", static_seconds=float(t), request_id=rid, tone=tone
                    ).lower()
                    for phrase in forbidden:
                        self.assertNotIn(phrase, out)

    def test_static_line_acknowledges_a_long_wait_more_openly_over_time(self):
        base = "Still connecting…"
        early = escalate_static_thinking_line(base, static_seconds=9.0, request_id=3)
        late = escalate_static_thinking_line(base, static_seconds=55.0, request_id=3)
        self.assertNotEqual(early, late)
        self.assertTrue(
            any(word in late.lower() for word in ("not stuck", "long", "marathon", "time")),
            msg=late,
        )

    def test_static_line_follows_the_deadpan_tone(self):
        base = "Still connecting…"
        witty = escalate_static_thinking_line(base, static_seconds=30.0, request_id=3, tone="witty")
        deadpan = escalate_static_thinking_line(
            base, static_seconds=30.0, request_id=3, tone="deadpan"
        )
        self.assertNotEqual(witty, deadpan)

    def test_generating_phase_replaces_the_connecting_claim(self):
        """Once tokens arrive, "waking the model up" is not merely static — it is false."""
        connecting = format_thinking_phase(
            "connecting_model", question="how does this run", app_name="Hades", request_id=2
        )
        generating = format_thinking_phase(
            "generating", question="how does this run", app_name="Hades", request_id=2
        )
        self.assertNotEqual(connecting, generating)
        self.assertEqual(format_thinking_phase("generating"), "Writing your answer…")

    def test_slow_phase_copy_stays_encouraging(self):
        """building_context and connecting_model cover the stretches that look like a hang.

        Their prose must not sigh at the user, because that is the moment they are deciding
        whether the plugin broke. The pools elsewhere are free to be put-upon; these two are not.
        """
        discouraging = (
            "riveting",
            "typical",
            "joy",
            "glamorous",
            "again?",
            "seriously",
            "sigh",
        )
        for phase in ("building_context", "connecting_model"):
            for tone_settings in ({}, {"character_enabled": True, "character_preset_id": "portal_glados"}):
                for rid in range(1, 16):
                    out = format_thinking_phase(
                        phase,
                        question="how do I beat this boss",
                        app_name="Hades",
                        request_id=rid,
                        **tone_settings,
                    )
                    lowered = out.lower()
                    for word in discouraging:
                        self.assertNotIn(word, lowered, msg=f"{phase} rid={rid}: {out}")
                    _assert_no_banned_prefixes(out)

    def test_connecting_model_copy_says_the_wait_is_normal(self):
        """At least one line has to tell the user a long pause is the model, not a crash."""
        samples = [
            format_thinking_phase(
                "connecting_model",
                question="how do I beat this boss",
                app_name="Hades",
                request_id=rid,
            )
            for rid in range(1, 16)
        ]
        self.assertTrue(
            any(
                phrase in out.lower()
                for out in samples
                for phrase in ("not a crash", "slow bit", "takes the longest", "hang in there")
            ),
            msg=samples,
        )

    def test_phase_salt_leaves_the_opener_pick_unchanged(self):
        """compose_thinking_blurb has a client mirror; an empty salt must not move its pick."""
        for rid in range(1, 25):
            self.assertEqual(
                compose_thinking_blurb("why is my fps low", app_name="Elden Ring", request_id=rid),
                format_thinking_phase(
                    "starting",
                    question="why is my fps low",
                    app_name="Elden Ring",
                    request_id=rid,
                ),
            )

    def test_format_thinking_phase_searching_kb(self):
        self.assertEqual(format_thinking_phase("searching_kb"), "Searching knowledge base…")
        self.assertEqual(
            format_thinking_phase("searching_kb", app_name="Elden Ring"),
            "Searching knowledge base for Elden Ring…",
        )

    def test_format_thinking_phase_woven_no_lazy_prefixes(self):
        samples = [
            format_thinking_phase(
                "proton_logs",
                question="why crash on launch",
                app_name="Elden Ring",
                request_id=i,
            )
            for i in range(12)
        ]
        for out in samples:
            _assert_no_banned_prefixes(out)
        self.assertTrue(
            any("crash" in out.lower() for out in samples)
            or any(out in _EMOJI_ONLY_LINES for out in samples),
            msg=samples,
        )


if __name__ == "__main__":
    unittest.main()
