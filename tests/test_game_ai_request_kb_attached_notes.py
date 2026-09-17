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


class ParseKbAttachedNotesAgainstTheRealFormatterTests(unittest.TestCase):
    """`_parse_kb_attached_notes` reads knowledge_base_service.py's own `_card_lines` format back
    apart -- these prove it stays in step with the real formatter, not a hand-typed guess at its
    shape (test_game_ai_request_followup_memory.py's fixtures are exactly that kind of guess,
    and are missing the "(trust: ...)" segment this parser depends on)."""

    def test_a_single_strategy_card_round_trips_byte_for_byte(self):
        card = _card()
        text_block, _trust, sources = _format_block(
            [card], fallback_text=None, domain="strategy", max_bytes=6_144
        )
        notes = _parse_kb_attached_notes(text_block, kb_domain="strategy", sources=sources)
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
        text_block, _trust, sources = _format_block(
            [card], fallback_text=None, domain="strategy", max_bytes=6_144
        )
        notes = _parse_kb_attached_notes(text_block, kb_domain="strategy", sources=sources)
        self.assertEqual(len(notes), 1)
        self.assertEqual(notes[0]["game_title"], "The Legend of Zelda: Ocarina of Time")
        self.assertEqual(notes[0]["name"], "Deku Nuts")
        self.assertEqual(notes[0]["kind"], "mechanic")

    def test_a_note_with_no_source_carries_no_host_or_licence(self):
        """The maintainer's own notes and every troubleshooting tip have no source_url, and
        `_format_block`'s own `sources` list drops them -- this is exactly the case that list
        cannot serve, which is why this parser exists instead of just reading `sources`."""
        card = _card(source_url="", source_license="", trust_tier="fallback_no_source")
        text_block, _trust, sources = _format_block(
            [card], fallback_text=None, domain="strategy", max_bytes=6_144
        )
        self.assertEqual(sources, [], "sanity: a card with no source_url is not in `sources`")
        notes = _parse_kb_attached_notes(text_block, kb_domain="strategy", sources=sources)
        self.assertEqual(len(notes), 1)
        self.assertEqual(notes[0]["source_host"], "")
        self.assertEqual(notes[0]["source_license"], "")
        self.assertEqual(notes[0]["trust_tier"], "fallback_no_source")

    def test_a_compat_tip_card_is_kind_tip_and_carries_no_game_title(self):
        card = _card(
            game_title="Shared troubleshooting",
            section_type="tip",
            name="Proton log tip",
            card="Proton log: PROTON_LOG=1 %command% captures useful launch traces to ~/steam-*.log.",
            source_url="",
            source_license="",
            trust_tier="fallback_no_source",
        )
        text_block, _trust, sources = _format_block(
            [card], fallback_text=None, domain="compat", max_bytes=2_048
        )
        notes = _parse_kb_attached_notes(text_block, kb_domain="compat", sources=sources)
        self.assertEqual(len(notes), 1)
        note = notes[0]
        self.assertEqual(note["kind"], "tip")
        self.assertEqual(note["domain"], "compat")
        self.assertEqual(note["game_title"], "")
        self.assertEqual(note["card"], card.card)

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


if __name__ == "__main__":
    unittest.main()
