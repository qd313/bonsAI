"""Tests for the "From the notes" block's own backend field: the notes retrieval actually
attached to a turn, published in the note's own words and nowhere else (plan 58 phase 1).

Two layers, matching how the feature is actually built:

1. `_parse_kb_attached_notes` (game_ai_request.py) turns the formatted text block retrieval
   built -- the same string handed to the model -- back into one entry per note. It is tested
   here against the REAL `_format_block` in knowledge_base_service.py, feeding it hand-built
   `KnowledgeCard` rows rather than a hand-typed approximation of the block's format, so a future
   change to that format's header shape breaks this test instead of silently mis-parsing.
2. `run_game_ai_request` wiring tests (the `_FakePlugin` shape every other file in this test
   suite already uses for the same function) prove the notes reach the finished result, the
   saved-chat transparency, and the live snapshot before the model is ever called -- not just
   that all three eventually carry the same value.
"""

import asyncio
import sys
import threading
import types
import unittest
from unittest.mock import patch

if "decky" not in sys.modules:
    _decky = types.ModuleType("decky")
    _decky.DECKY_PLUGIN_SETTINGS_DIR = "/tmp"
    _decky.logger = types.SimpleNamespace(
        info=lambda *a, **k: None,
        warning=lambda *a, **k: None,
        error=lambda *a, **k: None,
        exception=lambda *a, **k: None,
    )
    sys.modules["decky"] = _decky

from backend.services.game_ai_request import _parse_kb_attached_notes, run_game_ai_request
from backend.services.knowledge_base_service import (
    _COMPAT_GAME_TITLE,
    KnowledgeCard,
    KnowledgeRetrievalResult,
    _format_block,
)


def _card(**overrides) -> KnowledgeCard:
    base = dict(
        section_id=1,
        game_id=1,
        game_title="Hollow Knight",
        section_type="boss",
        name="Broken Vessel",
        card="The infected husk shaped like you, far west in the Ancient Basin.",
        source_url="https://hollowknight.wiki/w/Broken_Vessel",
        source_license="CC-BY-SA-3.0",
        source_version=None,
        crawled_at="2026-09-01",
        trust_tier="wiki_verified",
    )
    base.update(overrides)
    return KnowledgeCard(**base)


def _tip_card(**overrides) -> KnowledgeCard:
    """A shared troubleshooting tip, carrying the game title `_compat_row_to_card` gives every tip."""
    base = dict(
        game_title=_COMPAT_GAME_TITLE,
        section_type="tip",
        name="Proton log tip",
        card="Proton log: PROTON_LOG=1 %command% captures useful launch traces to ~/steam-*.log.",
        source_url="",
        source_license="",
        trust_tier="fallback_no_source",
    )
    base.update(overrides)
    return _card(**base)


def _round_trip(cards, *, domain="strategy", max_bytes=6_144):
    """Format `cards` with the real `_format_block`, then parse that block back apart."""
    text_block, _trust, sources = _format_block(
        cards, fallback_text=None, domain=domain, max_bytes=max_bytes
    )
    return _parse_kb_attached_notes(text_block, kb_domain=domain, sources=sources), sources


class ParseKbAttachedNotesAgainstTheRealFormatterTests(unittest.TestCase):
    """`_parse_kb_attached_notes` reads knowledge_base_service.py's own `_card_lines` format back
    apart -- these prove it stays in step with the real formatter, not a hand-typed guess at its
    shape (test_game_ai_request_followup_memory.py's fixtures are exactly that kind of guess,
    and are missing the "(trust: ...)" segment this parser depends on)."""

    def test_a_single_strategy_card_round_trips_byte_for_byte(self):
        card = _card()
        notes, _sources = _round_trip([card])
        self.assertEqual(len(notes), 1)
        note = notes[0]
        # The exact assertion the brief asks for: published text equals the attached card's own
        # text, byte for byte -- not "close enough" or re-wrapped.
        self.assertEqual(note["card"], card.card)
        self.assertEqual(note["name"], "Broken Vessel")
        self.assertEqual(note["kind"], "boss")
        self.assertEqual(note["game_title"], "Hollow Knight")
        self.assertEqual(note["trust_tier"], "wiki_verified")
        self.assertEqual(note["domain"], "strategy")
        self.assertEqual(note["source_host"], "hollowknight.wiki")
        self.assertEqual(note["source_license"], "CC-BY-SA-3.0")

    def test_a_game_title_containing_a_colon_still_splits_correctly(self):
        """Real data: "The Legend of Zelda: Ocarina of Time" -- a colon inside game_title must
        not be mistaken for the kind/name separator, which also uses ": "."""
        card = _card(game_title="The Legend of Zelda: Ocarina of Time", section_type="mechanic",
                     name="Deku Nuts", card="Stun enemies briefly with a thrown Deku Nut.",
                     source_url="", source_license="")
        notes, _sources = _round_trip([card])
        self.assertEqual(len(notes), 1)
        self.assertEqual(notes[0]["game_title"], "The Legend of Zelda: Ocarina of Time")
        self.assertEqual(notes[0]["name"], "Deku Nuts")
        self.assertEqual(notes[0]["kind"], "mechanic")

    def test_a_note_with_no_source_carries_no_host_or_licence(self):
        """The maintainer's own notes and every troubleshooting tip have no source_url.

        `_format_block`'s `sources` list used to drop these cards entirely (the bug filed as
        "The credit line under a reply never names a note with no source page, or a shared
        tip"), which is why this parser reads the formatted text block directly rather than
        `sources` alone. Now that `_format_block` names every attached card in `sources` too
        (url/license left "" when there is nothing to cite), this parser's own result is
        unchanged -- it already treated a missing title match as "no host, no licence", and an
        entry with a blank url reads exactly the same way.
        """
        card = _card(source_url="", source_license="", trust_tier="fallback_no_source")
        notes, sources = _round_trip([card])
        self.assertEqual(len(sources), 1, "the card is named in `sources` now, just with no url")
        self.assertEqual(sources[0]["url"], "")
        self.assertEqual(len(notes), 1)
        self.assertEqual(notes[0]["source_host"], "")
        self.assertEqual(notes[0]["source_license"], "")
        self.assertEqual(notes[0]["trust_tier"], "fallback_no_source")

    def test_a_compat_tip_card_is_kind_tip_and_carries_no_game_title(self):
        card = _tip_card()
        notes, _sources = _round_trip([card], domain="compat", max_bytes=2_048)
        self.assertEqual(len(notes), 1)
        note = notes[0]
        self.assertEqual(note["kind"], "tip")
        self.assertEqual(note["domain"], "compat")
        self.assertEqual(note["game_title"], "")
        self.assertEqual(note["card"], card.card)

    def test_a_shared_tip_with_a_source_page_still_gets_it_credited(self):
        """The bug filed as "A shared troubleshooting tip that has a source page never gets it
        shown" (plan 63 lane G): `_format_block`'s `sources` entry for a tip is keyed under
        "Shared troubleshooting — {name}" (the tip's real `game_title`, per
        `_compat_row_to_card`), but a tip's own header text never prints a game title
        (`_card_lines` writes "[Tip: Name]" only) -- so the parser used to rebuild the lookup
        key as "" and never found the entry, even when the tip really did have a url and a
        licence. Built with the real `_format_block`, not a hand-written header string, so this
        proves the two sides actually agree rather than testing a guess at their shapes."""
        card = _tip_card(
            source_url="https://www.protondb.com/help",
            source_license="CC-BY-SA-4.0",
            trust_tier="wiki_verified",
        )
        notes, _sources = _round_trip([card], domain="compat", max_bytes=2_048)
        self.assertEqual(len(notes), 1)
        note = notes[0]
        self.assertEqual(note["kind"], "tip")
        self.assertEqual(note["source_host"], "www.protondb.com")
        self.assertEqual(note["source_license"], "CC-BY-SA-4.0")

    def test_a_game_note_still_matches_its_source_alongside_a_sourceless_tip(self):
        """Guards against a fix that only special-cases tips and breaks the ordinary game-note
        lookup, or one that only works when a tip is the sole card attached."""
        tip_card = _tip_card(
            name="Verify integrity",
            card="Right-click the game in Steam, Properties, Local Files, Verify integrity.",
        )
        notes, _sources = _round_trip([_card(), tip_card])
        self.assertEqual(len(notes), 2)
        self.assertEqual(notes[0]["source_host"], "hollowknight.wiki")
        self.assertEqual(notes[0]["source_license"], "CC-BY-SA-3.0")
        self.assertEqual(notes[1]["kind"], "tip")
        self.assertEqual(notes[1]["source_host"], "")
        self.assertEqual(notes[1]["source_license"], "")

    def test_a_card_written_as_labelled_lines_keeps_its_embedded_newlines(self):
        """The real Exploder/Praetorian seed rows write Summary/Weak points/Tips as three lines
        inside one card. The parser must not collapse or split on those internal newlines --
        only on the block's own card-boundary and end-of-block markers."""
        labelled = (
            "Summary: Large orange glyphids that walk into you and detonate in a wide blast.\n"
            "Weak points: Fragile, and the blasts chain, so one popped early clears the group "
            "behind it.\n"
            "Tips: Weapons fire themselves, so it dies where you stand - keep distance and the "
            "blast lands in the swarm instead."
        )
        card = _card(
            game_title="Deep Rock Galactic: Survivor",
            section_type="enemy",
            name="Exploder",
            card=labelled,
            source_url="",
            source_license="",
            trust_tier="fallback_no_source",
        )
        text_block, _trust, sources = _format_block(
            [card], fallback_text=None, domain="strategy", max_bytes=6_144
        )
        notes = _parse_kb_attached_notes(text_block, kb_domain="strategy", sources=sources)
        self.assertEqual(len(notes), 1)
        self.assertEqual(notes[0]["card"], labelled)
        self.assertEqual(notes[0]["card"].count("\n"), 2)

    def test_two_cards_in_one_block_are_both_recovered_in_order(self):
        first = _card(name="False Knight", section_type="boss", card="The armoured maggot.")
        second = _card(name="Hornet in Greenpath", section_type="boss", card="The fight for the dash.")
        text_block, _trust, sources = _format_block(
            [first, second], fallback_text=None, domain="strategy", max_bytes=6_144
        )
        notes = _parse_kb_attached_notes(text_block, kb_domain="strategy", sources=sources)
        self.assertEqual([n["name"] for n in notes], ["False Knight", "Hornet in Greenpath"])
        self.assertEqual(notes[0]["card"], "The armoured maggot.")
        self.assertEqual(notes[1]["card"], "The fight for the dash.")

    def test_a_card_dropped_by_the_byte_budget_never_appears(self):
        """`_format_block` itself drops whole cards that do not fit and appends an "N more
        card(s) omitted" trailer -- that trailer must not be mistaken for a card, and the
        dropped card must not appear as a note with truncated text."""
        big = _card(name="Big Note", card="x" * 500)
        small = _card(name="Small Note", card="short")
        # 740 fits "Big Note" (tried first, in list order) plus the omitted-count trailer, but
        # not both cards -- found empirically against the real formatter rather than guessed,
        # since the header and sentinel's own fixed overhead makes the boundary non-obvious.
        text_block, _trust, sources = _format_block(
            [big, small], fallback_text=None, domain="strategy", max_bytes=740
        )
        self.assertIn("omitted", text_block)
        notes = _parse_kb_attached_notes(text_block, kb_domain="strategy", sources=sources)
        names = [n["name"] for n in notes]
        self.assertNotIn("Small Note", names, "the omitted note must not appear at all")
        for note in notes:
            self.assertNotIn("omitted", note["card"])

    def test_nothing_attached_gives_an_empty_list(self):
        self.assertEqual(_parse_kb_attached_notes("", kb_domain="strategy", sources=[]), [])


class _FakePlugin:
    DEFAULT_REQUEST_TIMEOUT_SECONDS = 45

    def __init__(self, settings: dict):
        self._settings = settings
        self._ollama_result: dict = {}
        # Mirrors the real Plugin's own attributes exactly (main.py), which is what
        # `_publish_kb_attached_notes_live` reaches for directly -- see that function's
        # docstring for why it cannot call a named method instead.
        self._partial_response_lock = threading.Lock()
        self._partial_stream_snapshot: dict = {"request_id": 99, "kb_attached_notes": []}
        self.call_order: list = []
        # Recorder for the task 3 app-activity log line -- one entry per call, in order, so a
        # test can check both that it fired and what it said.
        self.app_log_calls: list[dict] = []

    async def load_settings(self):
        return self._settings

    async def _try_handle_sanitizer_keyword_command(self, question, app_id):
        return None

    def _active_request_id(self):
        return 99

    async def ask_ollama(self, *args, **kwargs):
        self.call_order.append(("ask_ollama", None))
        return self._ollama_result

    async def _persist_input_transparency(self, payload):
        pass

    async def _maybe_app_log(self, category, message, *, level="default", fields=None):
        self.app_log_calls.append(
            {"category": category, "message": message, "level": level, "fields": fields or {}}
        )


def _ok_result() -> dict:
    return {"success": True, "response": "Here is how.", "model": "test-model"}


def _settings() -> dict:
    return {
        "latency_timeouts_custom_enabled": False,
        "input_sanitizer_user_disabled": False,
        "capabilities": {},
        "use_local_knowledge_base": True,
    }


def _run(plugin, question="how do i beat this boss", **kwargs):
    return asyncio.run(
        run_game_ai_request(plugin, question, "127.0.0.1:11434", **kwargs)
    )


def _attached_result(
    card: KnowledgeCard, *, domain: str = "strategy", max_bytes: int = 6_144
) -> KnowledgeRetrievalResult:
    text_block, trust, sources = _format_block(
        [card], fallback_text=None, domain=domain, max_bytes=max_bytes
    )
    return KnowledgeRetrievalResult(attached=True, text_block=text_block, trust_tier=trust, sources=sources)


class KbAttachedNotesWiringTests(unittest.TestCase):
    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    @patch("backend.services.game_ai_request.should_retrieve_knowledge")
    def test_the_finished_result_carries_the_attached_note(self, mock_should, mock_retrieve):
        mock_should.return_value = (True, "strategy")
        mock_retrieve.return_value = _attached_result(_card())
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = _ok_result()

        result = _run(plugin, ask_mode="strategy")

        self.assertEqual(len(result["kb_attached_notes"]), 1)
        note = result["kb_attached_notes"][0]
        self.assertEqual(note["name"], "Broken Vessel")
        self.assertEqual(note["card"], _card().card)
        # Carried on the transparency object too, so a reopened saved chat can show it again --
        # see chat_slot_service.py's own tests for the save/reload round trip.
        self.assertEqual(result["transparency"]["kb_attached_notes"], result["kb_attached_notes"])

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    @patch("backend.services.game_ai_request.should_retrieve_knowledge")
    def test_nothing_attached_gives_an_empty_list_not_an_absent_key(self, mock_should, mock_retrieve):
        mock_should.return_value = (True, "strategy")
        mock_retrieve.return_value = KnowledgeRetrievalResult(attached=False)
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = _ok_result()

        result = _run(plugin, ask_mode="strategy")

        self.assertEqual(result["kb_attached_notes"], [])
        self.assertEqual(result["transparency"]["kb_attached_notes"], [])

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    @patch("backend.services.game_ai_request.should_retrieve_knowledge")
    def test_a_card_dropped_by_the_context_budget_is_not_shown_as_attached(
        self, mock_should, mock_retrieve
    ):
        """kb_survived gates this the same way it gates kb_transparency -- a note the model never
        actually saw must never appear in the block, matching the honesty-line rule that the two
        can never both fire off a dropped card."""
        mock_should.return_value = (True, "strategy")
        # `stack_context_blocks` shares a 100 KiB budget across Proton logs and the knowledge
        # block (knowledge_base_service.py); with no Proton text competing for it here, only a
        # knowledge block bigger than that whole budget gets dropped. `max_bytes` here is
        # `_format_block`'s own per-mode cap (retrieval's own budget, a few KB in real use) --
        # raised well past it so the card survives *that* trim and the block that reaches
        # `stack_context_blocks` is the one actually too big for its 100 KiB.
        oversized_card = _card(card="y" * 200_000)
        mock_retrieve.return_value = _attached_result(oversized_card, max_bytes=250_000)
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = _ok_result()

        result = _run(plugin, ask_mode="speed")

        self.assertEqual(result["kb_attached_notes"], [])

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    @patch("backend.services.game_ai_request.should_retrieve_knowledge")
    def test_the_live_snapshot_is_written_before_ask_ollama_is_called(
        self, mock_should, mock_retrieve
    ):
        """The point of publishing this live at all: a caller watching the snapshot must see the
        notes before the model call even starts, not only once the whole turn has finished."""
        mock_should.return_value = (True, "strategy")
        mock_retrieve.return_value = _attached_result(_card())
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = _ok_result()

        # Snapshot starts empty for this request id.
        self.assertEqual(plugin._partial_stream_snapshot["kb_attached_notes"], [])

        original_ask_ollama = plugin.ask_ollama

        async def _ask_ollama_records_snapshot_state(*args, **kwargs):
            # The snapshot must already carry the notes by the time the model is called.
            plugin.call_order.append(
                ("snapshot_at_ask_ollama_time", list(plugin._partial_stream_snapshot["kb_attached_notes"]))
            )
            return await original_ask_ollama(*args, **kwargs)

        plugin.ask_ollama = _ask_ollama_records_snapshot_state

        _run(plugin, ask_mode="strategy")

        snapshot_calls = [c for c in plugin.call_order if c[0] == "snapshot_at_ask_ollama_time"]
        self.assertEqual(len(snapshot_calls), 1)
        self.assertEqual(len(snapshot_calls[0][1]), 1)
        self.assertEqual(snapshot_calls[0][1][0]["name"], "Broken Vessel")

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    @patch("backend.services.game_ai_request.should_retrieve_knowledge")
    def test_a_compat_turns_tips_reach_the_live_snapshot_before_ask_ollama_too(
        self, mock_should, mock_retrieve
    ):
        """First Deck rows (NOTES-BLOCK-03): a troubleshooting turn's tips showed up only with
        the finished snapshot, not live, and the report asked whether the live publish reaches
        the compat route at all or whether the poll drops a 'tip'-kind note. Reproduced here with
        the exact card shape the seed's shared tips actually have (kind "tip", domain "compat",
        no source, name equal to a bare topic word) -- the write path is unchanged from the
        strategy test above and is proven here to behave identically for compat: nothing in
        `_publish_kb_attached_notes_live` or the parser reads or branches on domain or kind, so
        neither hypothesis is a real code defect. See the report for what most likely explains
        the device symptom instead (compat retrieval's own share of a short troubleshooting
        reply's total time, and a poll cadence gap once the turn completes) and the one line in
        main.py, outside every file list handed to this lane so far, that would close it for good.
        """
        tip_card = _card(
            game_title="Shared troubleshooting",
            section_type="tip",
            name="proton",
            card="Check ProtonDB for launch options and community fixes before forcing a Proton version.",
            source_url="",
            source_license="",
            trust_tier="fallback_no_source",
        )
        mock_should.return_value = (True, "compat")
        mock_retrieve.return_value = _attached_result(tip_card, domain="compat")
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = _ok_result()

        self.assertEqual(plugin._partial_stream_snapshot["kb_attached_notes"], [])

        original_ask_ollama = plugin.ask_ollama

        async def _ask_ollama_records_snapshot_state(*args, **kwargs):
            plugin.call_order.append(
                ("snapshot_at_ask_ollama_time", list(plugin._partial_stream_snapshot["kb_attached_notes"]))
            )
            return await original_ask_ollama(*args, **kwargs)

        plugin.ask_ollama = _ask_ollama_records_snapshot_state

        _run(plugin, question="my game will not launch on proton, what should i check?", ask_mode="speed")

        snapshot_calls = [c for c in plugin.call_order if c[0] == "snapshot_at_ask_ollama_time"]
        self.assertEqual(len(snapshot_calls), 1)
        self.assertEqual(len(snapshot_calls[0][1]), 1)
        self.assertEqual(snapshot_calls[0][1][0]["kind"], "tip")
        self.assertEqual(snapshot_calls[0][1][0]["domain"], "compat")
        self.assertEqual(snapshot_calls[0][1][0]["name"], "proton")

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    @patch("backend.services.game_ai_request.should_retrieve_knowledge")
    def test_no_publish_when_nothing_attached(self, mock_should, mock_retrieve):
        mock_should.return_value = (True, "strategy")
        mock_retrieve.return_value = KnowledgeRetrievalResult(attached=False)
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = _ok_result()

        _run(plugin, ask_mode="strategy")

        self.assertEqual(plugin._partial_stream_snapshot["kb_attached_notes"], [])

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    @patch("backend.services.game_ai_request.should_retrieve_knowledge")
    def test_a_mismatched_request_id_is_not_written(self, mock_should, mock_retrieve):
        """`_publish_kb_attached_notes_live` must decline once a newer request owns the
        snapshot -- the same guard `_publish_asked_entity` uses in main.py."""
        mock_should.return_value = (True, "strategy")
        mock_retrieve.return_value = _attached_result(_card())
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = _ok_result()
        # A different request now owns the live snapshot.
        plugin._partial_stream_snapshot["request_id"] = 12345

        _run(plugin, ask_mode="strategy")

        self.assertEqual(plugin._partial_stream_snapshot["kb_attached_notes"], [])


class KbSearchAppLogTests(unittest.TestCase):
    """Task 3, plan 63 lane G: the app-activity log line naming what the knowledge-base search
    found and what actually reached the model. Off by default (desktop_app_log_level starts
    "off", and `Plugin._maybe_app_log` checks it before writing anything) -- these tests go
    through the fake plugin's recorder instead of a real log file, so they check the call was
    made and what it said, not the on-disk log format (that belongs to
    desktop_note_service.py's own tests)."""

    def _kb_log_calls(self, plugin) -> list[dict]:
        return [c for c in plugin.app_log_calls if c["category"] == "ask.kb_search"]

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    @patch("backend.services.game_ai_request.should_retrieve_knowledge")
    def test_an_attached_note_is_named_as_both_searched_and_attached(self, mock_should, mock_retrieve):
        mock_should.return_value = (True, "strategy")
        mock_retrieve.return_value = _attached_result(_card())
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = _ok_result()

        _run(plugin, ask_mode="strategy", app_name="Hollow Knight")

        calls = self._kb_log_calls(plugin)
        self.assertEqual(len(calls), 1)
        call = calls[0]
        self.assertEqual(call["level"], "verbose")
        fields = call["fields"]
        self.assertEqual(fields["searched_count"], 1)
        self.assertEqual(fields["searched_notes"], "Hollow Knight — Broken Vessel")
        self.assertEqual(fields["attached_count"], 1)
        self.assertEqual(fields["attached_notes"], "Hollow Knight — Broken Vessel")
        self.assertEqual(fields["starved_by_context_budget"], False)

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    @patch("backend.services.game_ai_request.should_retrieve_knowledge")
    def test_nothing_found_still_logs_a_zero_zero_line(self, mock_should, mock_retrieve):
        """A search that finds nothing is itself a fact worth recording -- confirming a screen
        that reads "no notes for this game" really did run a search and really did find none,
        not that the search never ran at all."""
        mock_should.return_value = (True, "strategy")
        mock_retrieve.return_value = KnowledgeRetrievalResult(attached=False)
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = _ok_result()

        _run(plugin, ask_mode="strategy")

        calls = self._kb_log_calls(plugin)
        self.assertEqual(len(calls), 1)
        fields = calls[0]["fields"]
        self.assertEqual(fields["searched_count"], 0)
        self.assertEqual(fields["attached_count"], 0)

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    @patch("backend.services.game_ai_request.should_retrieve_knowledge")
    def test_a_card_dropped_by_the_context_budget_is_searched_but_not_attached(
        self, mock_should, mock_retrieve
    ):
        """The exact gap this line exists to make visible: retrieval found and named a card
        (searched_count 1), but the outer stacking budget dropped it before it ever reached the
        model (attached_count 0, starved_by_context_budget True) -- see
        test_a_card_dropped_by_the_context_budget_is_not_shown_as_attached above for the same
        scenario checked from the "From the notes" block's own side."""
        mock_should.return_value = (True, "strategy")
        oversized_card = _card(card="y" * 200_000)
        mock_retrieve.return_value = _attached_result(oversized_card, max_bytes=250_000)
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = _ok_result()

        _run(plugin, ask_mode="speed")

        calls = self._kb_log_calls(plugin)
        self.assertEqual(len(calls), 1)
        fields = calls[0]["fields"]
        self.assertEqual(fields["searched_count"], 1)
        self.assertEqual(fields["attached_count"], 0)
        self.assertEqual(fields["starved_by_context_budget"], True)

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    @patch("backend.services.game_ai_request.should_retrieve_knowledge")
    def test_no_search_this_turn_means_no_log_line(self, mock_should, mock_retrieve):
        """Speed mode with nothing running never calls retrieval at all -- must not log a search
        that never happened."""
        mock_should.return_value = (False, "")
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = _ok_result()

        _run(plugin, ask_mode="speed")

        self.assertEqual(self._kb_log_calls(plugin), [])
        mock_retrieve.assert_not_called()

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    @patch("backend.services.game_ai_request.should_retrieve_knowledge")
    def test_a_plugin_double_with_no_app_log_method_is_not_broken(self, mock_should, mock_retrieve):
        """`hasattr` guards the call the same way the `_publish_thinking_phase_key` calls above
        it do, so a caller that never implements `_maybe_app_log` -- every other test double in
        this test suite, built before this task added the method -- still runs the KB-attach
        path without error."""

        class _NoAppLogPlugin:
            DEFAULT_REQUEST_TIMEOUT_SECONDS = 45

            def __init__(self, settings: dict):
                self._settings = settings
                self._ollama_result: dict = _ok_result()
                self._partial_response_lock = threading.Lock()
                self._partial_stream_snapshot: dict = {"request_id": 99, "kb_attached_notes": []}

            async def load_settings(self):
                return self._settings

            async def _try_handle_sanitizer_keyword_command(self, question, app_id):
                return None

            def _active_request_id(self):
                return 99

            async def ask_ollama(self, *args, **kwargs):
                return self._ollama_result

            async def _persist_input_transparency(self, payload):
                pass

        mock_should.return_value = (True, "strategy")
        mock_retrieve.return_value = _attached_result(_card())
        plugin = _NoAppLogPlugin(_settings())
        self.assertFalse(hasattr(plugin, "_maybe_app_log"))

        result = _run(plugin, ask_mode="strategy")

        self.assertEqual(len(result["kb_attached_notes"]), 1)


if __name__ == "__main__":
    unittest.main()
