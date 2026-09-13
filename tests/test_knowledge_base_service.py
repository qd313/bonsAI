import json
import os
import subprocess
import sys
import unittest
from pathlib import Path
from unittest import mock

from backend.services.knowledge_base_schema import (
    TRUST_TIER_FALLBACK,
    TRUST_TIER_WIKI_NO_PATCH,
    TRUST_TIER_WIKI_VERIFIED,
    corpus_has_usable_compat_vectors,
    corpus_has_usable_section_vectors,
    pack_embedding_vector,
    unpack_embedding_vector,
)
from backend.services.knowledge_base_service import (
    _trust_tier_for_row,
    EmbeddingDimensionMismatch,
    KnowledgeCard,
    _best_meaning_score,
    close_connection,
    kb_coverage_to_transparency,
    resolve_title_from_question,
    retrieve_knowledge_context,
    session_rag_chip_candidates_to_rpc,
    should_retrieve_knowledge,
    stack_context_blocks,
    suggest_chip_candidates,
    summarize_kb_coverage,
    _COMPAT_CHIP_TEMPLATES,
    _curtail_section_to_chip,
    _expand_query,
    _format_block,
    _fts_match_query,
    _fuse_cards_by_rrf,
    _compat_tips_for_topics,
    _get_connection,
    _load_section_vectors,
    _search_compat_patterns,
    COMPAT_TOPIC_RECALL_K,
    STRATEGY_MEANING_FLOOR,
    _vector_recall_sections,
    VECTOR_RECALL_FLOOR,
    VECTOR_RECALL_MARGIN_MIN_POOL,
    VECTOR_RECALL_POOL_MARGIN,
)
from backend.services.compat_topic_router import match_compat_corpus_topics
from backend.services.ollama_embed_service import OllamaEmbedError
from corpus_build_support import run_seed_build_or_skip

REPO_ROOT = Path(__file__).resolve().parents[1]
# Under build/, not dist/: `npm run build` clears dist/, so the test corpus was being deleted
# and rebuilt (a ~40s Ollama round trip) after every plugin build.
SEED_DB = REPO_ROOT / "build" / "knowledge-base-test" / "corpus.db"


def _ensure_seed_db() -> None:
    SEED_DB.parent.mkdir(parents=True, exist_ok=True)
    run_seed_build_or_skip(REPO_ROOT, SEED_DB.parent)


class KnowledgeBaseServiceTests(unittest.TestCase):
  @classmethod
  def setUpClass(cls):
    _ensure_seed_db()
    if not SEED_DB.is_file():
      raise unittest.SkipTest("seed corpus build failed")

  def setUp(self):
    if not SEED_DB.is_file():
      self.skipTest("seed corpus missing")

  def _require_seed_vectors(self, kind: str) -> None:
    """Skip when the seed corpus was built without embeddings.

    `build_rag_db.py --seed` needs a local Ollama with nomic-embed-text to populate
    `section_vectors` / `compat_pattern_vectors`; without one it prints "Skipping
    section_vectors embeddings" and writes the corpus anyway. That is correct behaviour --
    a Deck with no embed model still gets a working keyword corpus, and there are tests
    directly below asserting exactly that. But it left the vector tests reading rows that
    were never written, so they failed with a bare `KeyError: 3` on any machine without the
    model. Green on the maintainer's PC, red on every CI run since the gate began blocking.
    Skipping states the dependency instead of asserting on absent data.
    """
    conn = _get_connection(str(SEED_DB))
    has = (
      corpus_has_usable_section_vectors(conn)
      if kind == "section"
      else corpus_has_usable_compat_vectors(conn)
    )
    if not has:
      self.skipTest(
        f"seed corpus has no {kind} vectors -- build it with a local nomic-embed-text to run this"
      )

  def tearDown(self):
    close_connection(str(SEED_DB))

  def test_should_retrieve_strategy_when_enabled(self):
    ok, domain = should_retrieve_knowledge(
      use_local_knowledge_base=True,
      ask_mode="strategy",
      question="How do I beat King Dodongo?",
      app_id="",
      app_name="The Legend of Zelda: Ocarina of Time",
    )
    self.assertTrue(ok)
    self.assertEqual(domain, "strategy")

  def test_should_retrieve_compat_on_troubleshooting(self):
    ok, domain = should_retrieve_knowledge(
      use_local_knowledge_base=True,
      ask_mode="speed",
      question="why is my game crashing proton issue",
      app_id="",
      app_name="",
    )
    self.assertTrue(ok)
    self.assertEqual(domain, "compat")

  def test_should_retrieve_compat_on_deck_sleep_proton(self):
    ok, domain = should_retrieve_knowledge(
      use_local_knowledge_base=True,
      ask_mode="speed",
      question="deck sleep resume proton black screen",
      app_id="",
      app_name="",
    )
    self.assertTrue(ok)
    self.assertEqual(domain, "compat")

  def test_should_not_retrieve_when_disabled(self):
    ok, domain = should_retrieve_knowledge(
      use_local_knowledge_base=False,
      ask_mode="strategy",
      question="boss help",
      app_id="",
      app_name="Zelda",
    )
    self.assertFalse(ok)
    self.assertEqual(domain, "")

  def test_soh_alias_resolves_to_oot_cards(self):
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    result = retrieve_knowledge_context(
      settings,
      ask_mode="strategy",
      question="Queen Gohma boss weak point",
      app_id="",
      app_name="",
      shortcut_name="Ship of Harkinian",
      domain="strategy",
    )
    self.assertTrue(result.attached)
    self.assertIn("Queen Gohma", result.text_block)
    self.assertIn("alias:ship of harkinian", result.notes)

  def test_missing_corpus_graceful(self):
    result = retrieve_knowledge_context(
      {"rag_corpus_path": "/nonexistent/path"},
      ask_mode="strategy",
      question="help",
      app_id="2321470",
      app_name="Deep Rock Galactic: Survivor",
      domain="strategy",
    )
    self.assertFalse(result.attached)
    self.assertEqual(result.unavailable_reason, "corpus_missing")

  def test_stack_context_proton_first(self):
    stacked = stack_context_blocks(
      proton_text="--- Proton logs ---\nline1",
      knowledge_text="--- Local knowledge base ---\ncard1",
      max_total_bytes=10_000,
    )
    self.assertLess(stacked.text.index("Proton"), stacked.text.index("Local knowledge"))
    self.assertTrue(stacked.proton_attached)
    self.assertTrue(stacked.knowledge_attached)

  def test_stack_context_skips_empty_blocks(self):
    stacked = stack_context_blocks(
      proton_text="",
      knowledge_text="--- Local knowledge base ---\ncard1",
      max_total_bytes=10_000,
    )
    self.assertTrue(stacked.text.startswith("--- Local knowledge base ---"))
    self.assertFalse(stacked.proton_attached)
    self.assertTrue(stacked.knowledge_attached)

  def test_stack_context_byte_budget(self):
    stacked = stack_context_blocks(
      proton_text="P" * 5000,
      knowledge_text="K" * 5000,
      max_total_bytes=6000,
    )
    self.assertLessEqual(len(stacked.text.encode("utf-8")), 6200)

  def test_stack_context_reports_a_starved_knowledge_block(self):
    """Proton logs take budget first, so the KB block can be truncated or dropped outright.

    Transparency is built from these flags, so a starved block must not be reportable as
    attached — that was the bug: kb_attached=True with sources cited for text the model
    never received.
    """
    stacked = stack_context_blocks(
      proton_text="P" * 5900,
      knowledge_text="--- Local knowledge base ---\n" + "K" * 5000,
      max_total_bytes=6000,
    )
    self.assertTrue(stacked.proton_attached)
    self.assertFalse(stacked.knowledge_attached)

  def test_stack_context_drops_knowledge_entirely_when_no_budget_remains(self):
    stacked = stack_context_blocks(
      proton_text="P" * 6000,
      knowledge_text="--- Local knowledge base ---\ncard1",
      max_total_bytes=6000,
    )
    self.assertTrue(stacked.proton_attached)
    self.assertFalse(stacked.knowledge_attached)
    self.assertNotIn("Local knowledge", stacked.text)

  def test_suggest_chip_candidates_kb_off(self):
    settings = {
      "use_local_knowledge_base": False,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    result = suggest_chip_candidates(
      settings,
      app_id="2321470",
      app_name="Deep Rock Galactic: Survivor",
    )
    self.assertFalse(result.ok)
    self.assertEqual(result.reason, "kb_off")
    self.assertEqual(result.candidates, [])

  def test_summarize_kb_coverage_kb_off(self):
    summary = summarize_kb_coverage(
      {"use_local_knowledge_base": False},
      app_id="2321470",
      app_name="Deep Rock Galactic: Survivor",
    )
    self.assertEqual(summary.status, "kb_off")
    self.assertEqual(kb_coverage_to_transparency(summary)["kb_coverage_status"], "kb_off")

  def test_summarize_kb_coverage_sections_for_covered_game(self):
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    summary = summarize_kb_coverage(
      settings,
      app_id="2321470",
      app_name="Deep Rock Galactic: Survivor",
    )
    self.assertEqual(summary.status, "sections")
    self.assertGreater(summary.section_count, 0)

  def test_summarize_kb_coverage_missing_corpus(self):
    summary = summarize_kb_coverage(
      {"use_local_knowledge_base": True, "rag_corpus_path": "/nonexistent/path"},
      app_id="2321470",
      app_name="Deep Rock Galactic: Survivor",
    )
    self.assertEqual(summary.status, "corpus_missing")

  def test_summarize_kb_coverage_no_app_running(self):
    """Desktop context (nothing running) is distinct from a running game the corpus can't match.

    Before this status existed both cases collapsed onto "app_unresolved", which made Show
    details claim a running game could not be matched even when no game was running at all.
    """
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    summary = summarize_kb_coverage(settings, app_id="", app_name="")
    self.assertEqual(summary.status, "no_app")

  def test_summarize_kb_coverage_app_unresolved_when_game_running_but_unmatched(self):
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    summary = summarize_kb_coverage(
      settings,
      app_id="999999999",
      app_name="Some Game Not In The Corpus",
    )
    self.assertEqual(summary.status, "app_unresolved")

  def test_suggest_chip_candidates_missing_corpus(self):
    result = suggest_chip_candidates(
      {"use_local_knowledge_base": True, "rag_corpus_path": "/nonexistent/path"},
      app_id="2321470",
      app_name="Deep Rock Galactic: Survivor",
    )
    self.assertFalse(result.ok)
    self.assertEqual(result.reason, "corpus_missing")

  def test_suggest_chip_candidates_appid_hit(self):
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    result = suggest_chip_candidates(
      settings,
      app_id="2321470",
      app_name="Deep Rock Galactic: Survivor",
    )
    self.assertTrue(result.ok)
    texts = [c.text for c in result.candidates]
    self.assertTrue(any("Dreadnought" in t for t in texts))
    dreadnought = next(c for c in result.candidates if "Dreadnought" in c.text)
    self.assertEqual(dreadnought.category, "strategy")
    self.assertEqual(dreadnought.prefer_ask_mode, "strategy")
    self.assertTrue(any("Proton" in t for t in texts))

  def test_suggest_chip_candidates_exact_pool_for_a_covered_game(self):
    """Pin the whole candidate list, so any pool regression fails rather than degrades quietly.

    Before this policy the same corpus produced 29 candidates, 25 of them the template
    "Any known TOPIC issues for this game?" built from raw corpus topic slugs (steam_machine,
    bpm, desktop_mode, gaming_mode, wine, windows_steam, steamvr). Asserting the exact list
    catches a reintroduced fallback, a lifted cap, a reordering, or a new template - a
    "no slugs present" assertion could not, since the offending code path is now gone.
    """
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    result = suggest_chip_candidates(
      settings,
      app_id="2321470",
      app_name="Deep Rock Galactic: Survivor",
    )
    self.assertTrue(result.ok)
    self.assertEqual(
      [c.text for c in result.candidates],
      [
        "How do I beat Glyphid Dreadnought?",
        "Tips for Hollow Bough in this game?",
        "How do I deal with Exploder?",
        "How do I use Red Sugar?",
        "What should I know about Mining and the run timer?",
        "How do I beat Dreadnought Twins?",
        "Any known Proton issues for this game?",
        "Any Steam Input issues for this game?",
      ],
    )
    self.assertEqual(
      [c.domain for c in result.candidates],
      ["strategy"] * 6 + ["compat", "compat"],
    )
  def test_chip_pool_draws_one_kind_at_a_time_rather_than_flooding(self):
    """Measured 2026-08-19: after the Phase 4 cards, Ocarina of Time's six chips were six
    "How do I beat X?" and its items and enemies were unreachable.

    Two things were wrong with that, and only one is cosmetic: the pool stopped representing
    the corpus, and a carousel a player is merely browsing offered six boss names at once.
    """
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    result = suggest_chip_candidates(
      settings,
      app_id="",
      app_name="The Legend of Zelda: Ocarina of Time",
    )
    self.assertTrue(result.ok)
    strategy = [c.text for c in result.candidates if c.domain == "strategy"]
    self.assertEqual(sum(1 for t in strategy if t.startswith("How do I beat ")), 2)
    # One of each other kind the title has, before any kind gets a second turn.
    self.assertIn("How do I deal with ReDead and Gibdo?", strategy)
    self.assertIn("How do I use Bottles?", strategy)
    self.assertIn("How do I get through Shadow Temple invisible floors?", strategy)

  def test_chip_pool_still_fills_from_one_kind_when_a_title_has_only_one(self):
    """The direction interleaving must not cost anything: the pool is still six.

    Left 4 Dead 2 was the lopsided title -- seventeen cards filed as `mechanic` against two
    bosses and one area -- so a per-kind cap would have shrunk its pool. Round-robin keeps
    drawing from whatever is left once the other kinds run dry, so the count holds either way.

    **The pool composition assertion was relaxed on 2026-08-29 and the reason matters.** It used
    to pin "exactly three of the six say *What should I know about*", which was true only because
    the six special infected and a throwable were mis-filed as `mechanic`. Re-typing them under
    Phase 5 fixed the data, so that number is now 1, and re-pinning it at 1 would just be the same
    mistake against newer data. What the row actually protects is the count, plus the fact that
    interleaving reaches more than one kind -- so that is what is asserted.
    """
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    result = suggest_chip_candidates(settings, app_id="550", app_name="Left 4 Dead 2")
    strategy = [c.text for c in result.candidates if c.domain == "strategy"]
    self.assertEqual(len(strategy), 6)
    openers = {t.split(" ")[0] + " " + t.split(" ")[1] for t in strategy}
    self.assertGreaterEqual(
      len(openers), 3, "interleaving should reach several kinds, got: %r" % (strategy,)
    )

  def test_enemy_and_item_cards_get_their_own_chip_wording(self):
    """"What should I know about Exploder?" is the fallback template, and it reads as though
    the corpus does not know what kind of thing it is holding."""
    self.assertEqual(_curtail_section_to_chip("enemy", "Exploder"), "How do I deal with Exploder?")
    self.assertEqual(_curtail_section_to_chip("item", "Bottles"), "How do I use Bottles?")
    self.assertEqual(
      _curtail_section_to_chip("mechanic", "Epona"), "What should I know about Epona?"
    )


  def test_suggest_chip_candidates_caps_generic_compat_chips(self):
    """Generic compat chips are bounded so they cannot crowd out entity-named ones."""
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    result = suggest_chip_candidates(
      settings,
      app_id="2321470",
      app_name="Deep Rock Galactic: Survivor",
    )
    compat = [c for c in result.candidates if c.domain == "compat"]
    strategy = [c for c in result.candidates if c.domain == "strategy"]
    self.assertLessEqual(len(compat), 2)
    self.assertTrue(strategy, "expected at least one entity-named candidate")
    # Entity-named candidates come first, because the composer walks the pool in order.
    self.assertEqual(result.candidates[: len(strategy)], strategy)

  def test_suggest_chip_candidates_uncovered_game_falls_back_to_static_seeds(self):
    """A game with no corpus sections returns ok False rather than generic-only chips."""
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    result = suggest_chip_candidates(
      settings,
      app_id="999999999",
      app_name="Some Game Not In The Corpus",
    )
    self.assertFalse(result.ok)
    self.assertIn(result.reason, ("app_unresolved", "no_sections"))
    self.assertEqual(result.candidates, [])

  def test_suggest_chip_candidates_every_chip_is_corpus_grounded_or_curated(self):
    """The stated rule: a returned chip either names a corpus entity or is a curated topic."""
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    result = suggest_chip_candidates(
      settings,
      app_id="",
      app_name="The Legend of Zelda: Ocarina of Time",
    )
    self.assertTrue(result.ok)
    curated = set(_COMPAT_CHIP_TEMPLATES.values())
    for candidate in result.candidates:
      if candidate.domain == "compat":
        self.assertIn(candidate.text, curated)
      else:
        self.assertEqual(candidate.domain, "strategy")
        self.assertEqual(candidate.prefer_ask_mode, "strategy")

  def test_suggest_chip_candidates_rpc_shape(self):
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    result = suggest_chip_candidates(
      settings,
      app_id="",
      app_name="The Legend of Zelda: Ocarina of Time",
    )
    payload = session_rag_chip_candidates_to_rpc(result)
    self.assertTrue(payload["ok"])
    self.assertGreaterEqual(len(payload["candidates"]), 1)
    self.assertIn("text", payload["candidates"][0])
    self.assertIn("category", payload["candidates"][0])

  @staticmethod
  def _card(section_id: int, name: str) -> KnowledgeCard:
    return KnowledgeCard(
      section_id, 2, "Game", "boss", name, f"card {name}", "", "", None, None, "fallback_no_source"
    )

  def test_rrf_promotes_a_card_the_vectors_favour(self):
    """A weak keyword hit that the vectors love climbs, without simply taking over.

    Rewritten from test_rerank_cards_by_vector_orders_by_similarity (R5), which asserted the
    cosine-only sort this replaces. Fusion is consensus, not override: D is 4th on keywords
    and 1st on vectors, so it lands 2nd overall rather than 1st.
    """
    cards = [self._card(i, n) for i, n in enumerate("ABCDE", start=1)]
    # Query [1, 0]; dot product orders the vector list D > A > B > C > E.
    vectors = {4: [1.0, 0.0], 1: [0.9, 0.0], 2: [0.8, 0.0], 3: [0.7, 0.0], 5: [0.6, 0.0]}
    fused = _fuse_cards_by_rrf(cards, [1.0, 0.0], vectors, top_k=5)
    self.assertEqual([c.name for c in fused], ["A", "D", "B", "C", "E"])

  def test_rrf_keeps_top_keyword_hit_when_its_vector_is_missing(self):
    """Direct regression on the cosine-only reranker, and on naive RRF.

    The old code appended vectorless cards after every vector-scored card, so the #1 keyword
    hit lost to a marginal cosine match purely for lacking a vector. Textbook RRF rebuilds
    that same exile by omission — a card absent from the vector list scores 0 from it, and on
    a 30-card shortlist even the worst vectored card then outranks the best keyword hit.
    Backfilling the missing rank is what keeps A on top here.
    """
    cards = [self._card(i, n) for i, n in enumerate("ABCDE", start=1)]
    # A is the best keyword hit and the only card whose vector never got baked.
    vectors = {2: [0.5, 0.0], 3: [0.6, 0.0], 4: [0.7, 0.0], 5: [0.8, 0.0]}
    fused = _fuse_cards_by_rrf(cards, [1.0, 0.0], vectors, top_k=5)
    self.assertEqual(fused[0].name, "A")

  def test_fts_query_drops_function_words(self):
    self.assertEqual(
      _fts_match_query("How do I beat King Dodongo"),
      '"beat" OR "King" OR "Dodongo"',
    )

  def test_fts_query_is_empty_when_only_function_words(self):
    """No match beats a junk match.

    Every one of these terms appears in nearly every card, so an OR over them used to return
    eight seed cards scoring 1.9-5.2 — above several genuine compat hits. Returning "" sends
    the caller to the genre/compat fallback instead.
    """
    self.assertEqual(_fts_match_query("the a of and to it is"), "")
    self.assertEqual(_fts_match_query("how do i"), "")

  def test_fts_query_keeps_weak_but_meaningful_words(self):
    """The stopword list is function words only, and stays that way.

    "best" reads like filler in "the best thing to do", and like the whole question in "best
    build for this boss". A term wrongly added to the list fails invisibly — it just quietly
    stops matching — so the list is not grown to catch marginal queries. The relevance floor
    and the vector half of fusion handle those.
    """
    self.assertEqual(
      _fts_match_query("what is the best thing to do here"),
      '"best" OR "thing" OR "here"',
    )

  def test_expand_query_drops_app_name_once_the_game_is_resolved(self):
    # Already scoped by game_id, so the title is pure BM25 noise that favours cards
    # repeating it.
    self.assertEqual(
      _expand_query("How do I beat King Dodongo", "Ocarina of Time", game_resolved=True),
      "How do I beat King Dodongo",
    )

  def test_expand_query_prepends_app_name_when_the_game_is_unresolved(self):
    # Prepended, not appended: past the token cap it was silently discarded.
    self.assertEqual(
      _expand_query("How do I beat King Dodongo", "Ocarina of Time", game_resolved=False),
      "Ocarina of Time How do I beat King Dodongo",
    )

  def _tiered_card(self, section_id: int, name: str, tier: str, body: str = "body") -> KnowledgeCard:
    return KnowledgeCard(
      section_id, 2, "Game", "boss", name, body, "https://example.test/x", "CC BY-SA", None, None, tier
    )

  def test_block_trust_tier_is_the_lowest_present(self):
    """A block states one tier for everything in it, so it must be the weakest claim.

    Was cards[0].trust_tier, so one wiki_verified card at the front labelled two
    fallback_no_source cards behind it as verified.
    """
    cards = [
      self._tiered_card(1, "A", "wiki_verified"),
      self._tiered_card(2, "B", "fallback_no_source"),
      self._tiered_card(3, "C", "wiki_no_patch"),
    ]
    _text, trust, _sources = _format_block(
      cards, fallback_text=None, domain="strategy", max_bytes=10_000
    )
    self.assertEqual(trust, "fallback_no_source")

  def test_block_drops_whole_cards_and_keeps_the_end_sentinel(self):
    """Byte-slicing cut the last card mid-sentence and took the sentinel with it."""
    cards = [self._tiered_card(i, f"Card{i}", "wiki_verified", body="X" * 400) for i in range(1, 6)]
    text, _trust, sources = _format_block(
      cards, fallback_text=None, domain="strategy", max_bytes=1_200
    )
    self.assertTrue(text.endswith("--- End local knowledge base ---"))
    self.assertLessEqual(len(text.encode("utf-8")), 1_200)
    # Whole cards only: every card named in the block is present in full.
    for i in range(1, 6):
      if f"Card{i}" in text:
        self.assertIn("X" * 400, text)
    # Sources describe surviving cards only.
    self.assertLess(len(sources), len(cards))
    self.assertEqual(len(sources), text.count("[Game / boss:"))
    self.assertIn("omitted to fit budget", text)

  def test_block_returns_nothing_when_not_even_one_card_fits(self):
    cards = [self._tiered_card(1, "Huge", "wiki_verified", body="X" * 5_000)]
    text, _trust, sources = _format_block(
      cards, fallback_text=None, domain="strategy", max_bytes=200
    )
    self.assertEqual(text, "")
    self.assertEqual(sources, [])

  def test_v2_corpus_refuses_hybrid_and_says_why(self):
    """A pre-v3 corpus baked bare documents; querying it with a prefixed vector is garbage.

    Nothing in the file distinguishes the two — same model, same dimension — so the manifest's
    embedding_variant is the only signal, and its absence has to fail closed.
    """
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    v2_manifest = {"version": "1", "embedding_model": "nomic-embed-text"}  # no embedding_variant
    with mock.patch(
      "backend.services.knowledge_base_service.nomic_embed_available",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service._load_corpus_manifest",
      return_value=v2_manifest,
    ), mock.patch(
      "backend.services.knowledge_base_service.corpus_has_usable_section_vectors",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.embed_texts",
      side_effect=AssertionError("must not embed against an incompatible corpus"),
    ):
      result = retrieve_knowledge_context(
        settings,
        ask_mode="strategy",
        question="Glyphid Dreadnought weak point",
        app_id="2321470",
        app_name="Deep Rock Galactic: Survivor",
        domain="strategy",
        pc_ip="127.0.0.1:11434",
      )
    self.assertTrue(result.attached)
    self.assertEqual(result.retrieval_method, "keyword_embed_unavailable")

  def test_mismatched_embedding_model_refuses_hybrid(self):
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    other_model = {
      "version": "1",
      "embedding_variant": "nomic-prefixed-v1",
      "embedding_model": "bge-m3",
    }
    with mock.patch(
      "backend.services.knowledge_base_service.nomic_embed_available",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service._load_corpus_manifest",
      return_value=other_model,
    ), mock.patch(
      "backend.services.knowledge_base_service.corpus_has_usable_section_vectors",
      return_value=True,
    ):
      result = retrieve_knowledge_context(
        settings,
        ask_mode="strategy",
        question="Glyphid Dreadnought weak point",
        app_id="2321470",
        app_name="Deep Rock Galactic: Survivor",
        domain="strategy",
        pc_ip="127.0.0.1:11434",
      )
    self.assertEqual(result.retrieval_method, "keyword_embed_unavailable")

  def test_query_embedding_carries_the_search_query_prefix(self):
    """Runtime must prefix queries the same way the builder prefixed documents."""
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    with mock.patch(
      "backend.services.knowledge_base_service.nomic_embed_available",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.corpus_has_usable_section_vectors",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.embed_texts",
      return_value=[[1.0, 0.0] + [0.0] * 766],
    ) as embed:
      retrieve_knowledge_context(
        settings,
        ask_mode="strategy",
        question="Glyphid Dreadnought weak point",
        app_id="2321470",
        app_name="Deep Rock Galactic: Survivor",
        domain="strategy",
        pc_ip="127.0.0.1:11434",
      )
    sent = embed.call_args[0][1]
    self.assertEqual(len(sent), 1)
    self.assertTrue(sent[0].startswith("search_query: "))

  def test_relevance_floor_leaves_a_junk_compat_ask_unattached(self):
    """Off-topic Asks used to attach a card anyway, and the prompt cites what it attaches.

    Compat has no genre fallback, so the floor is visible end to end here: every candidate is
    below it, _compat_fallback finds nothing either, and the block is not built.
    """
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    with mock.patch(
      "backend.services.knowledge_base_service.nomic_embed_available",
      return_value=False,
    ):
      result = retrieve_knowledge_context(
        settings,
        ask_mode="speed",
        question="how do i cook pasta for dinner tonight",
        app_id="",
        app_name="",
        domain="compat",
        pc_ip="127.0.0.1:11434",
      )
    self.assertFalse(result.attached)
    self.assertEqual(result.text_block, "")

  def test_followup_header_swamps_the_query_it_is_prepended_to(self):
    """Why game_ai_request retrieves on question_for_retrieval, not question_for_model.

    The header is byte-for-byte identical on every follow-up, and it is long. Prepended to the
    question and passed through the token cap, it displaces the user's own words — so every
    follow-up Ask in the product searched the same boilerplate. This pins the mechanism; that
    the two call sites now pass lane.text is covered on device (testing.md KB rows).
    """
    from backend.services.ollama_prompts import build_reply_followup_context_block

    question = "what about the second phase"
    header = build_reply_followup_context_block("shorter", "How do I beat King Dodongo?", "Roll.")

    polluted = _fts_match_query(f"{header}\n{question}")
    clean = _fts_match_query(question)

    self.assertIn("REPLY", polluted)
    self.assertNotIn("phase", polluted)  # the actual question never reaches the index
    self.assertEqual(clean, '"about" OR "second" OR "phase"')

  def test_rrf_without_any_vectors_preserves_keyword_order(self):
    cards = [self._card(i, n) for i, n in enumerate("ABCDE", start=1)]
    fused = _fuse_cards_by_rrf(cards, [1.0, 0.0], {}, top_k=5)
    self.assertEqual([c.name for c in fused], ["A", "B", "C", "D", "E"])

  def test_rrf_dimension_mismatch_raises_rather_than_truncating(self):
    cards = [
      KnowledgeCard(1, 2, "Game", "boss", "A", "c", "", "", None, None, "fallback_no_source"),
    ]
    with self.assertRaises(EmbeddingDimensionMismatch):
      _fuse_cards_by_rrf(cards, [1.0, 0.0, 0.0], {1: [1.0, 0.0]}, top_k=1)

  def test_hybrid_retrieval_uses_keyword_when_nomic_missing(self):
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    with mock.patch(
      "backend.services.knowledge_base_service.nomic_embed_available",
      return_value=False,
    ), mock.patch(
      "backend.services.knowledge_base_service.corpus_has_usable_section_vectors",
      return_value=True,
    ):
      result = retrieve_knowledge_context(
        settings,
        ask_mode="strategy",
        question="Glyphid Dreadnought weak point",
        app_id="2321470",
        app_name="Deep Rock Galactic: Survivor",
        domain="strategy",
        pc_ip="127.0.0.1:11434",
      )
    self.assertTrue(result.attached)
    self.assertEqual(result.retrieval_method, "keyword")

  def test_hybrid_retrieval_reranks_when_nomic_available(self):
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    with mock.patch(
      "backend.services.knowledge_base_service.nomic_embed_available",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.corpus_has_usable_section_vectors",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.embed_texts",
      return_value=[[1.0, 0.0] + [0.0] * 766],
    ), mock.patch(
      "backend.services.knowledge_base_service._load_section_vectors",
      return_value={
        3: [1.0, 0.0] + [0.0] * 766,
        4: [0.0, 1.0] + [0.0] * 766,
      },
    ):
      result = retrieve_knowledge_context(
        settings,
        ask_mode="strategy",
        question="Glyphid Dreadnought weak point",
        app_id="2321470",
        app_name="Deep Rock Galactic: Survivor",
        domain="strategy",
        pc_ip="127.0.0.1:11434",
      )
    self.assertTrue(result.attached)
    self.assertEqual(result.retrieval_method, "hybrid")
    self.assertIn("Dreadnought", result.text_block)

  def test_speed_mode_never_pays_for_the_meaning_search(self):
    """D62 #2: Speed does the cheap keyword lookup and nothing else.

    Same setup as test_hybrid_retrieval_reranks_when_nomic_available (nomic installed,
    vectors on disk, keyword half finds a hit) but asked in Speed mode. Before this fix, the
    decision to embed never looked at ask_mode, so Speed paid the same embed round trip as
    Strategy whenever the keyword half found anything at all -- measured on the Deck as
    ~1 second added to two of three Speed questions (KB-RECALL-01).
    """
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    with mock.patch(
      "backend.services.knowledge_base_service.nomic_embed_available",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.corpus_has_usable_section_vectors",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.embed_texts",
      return_value=[[1.0, 0.0] + [0.0] * 766],
    ) as embed:
      result = retrieve_knowledge_context(
        settings,
        ask_mode="speed",
        question="Glyphid Dreadnought weak point",
        app_id="2321470",
        app_name="Deep Rock Galactic: Survivor",
        domain="strategy",
        pc_ip="127.0.0.1:11434",
      )
    embed.assert_not_called()
    self.assertTrue(result.attached)
    self.assertEqual(result.retrieval_method, "keyword")
    self.assertIn("Dreadnought", result.text_block)
    self.assertEqual(result.timing_ms.get("embed_ms"), 0)

  def test_hybrid_embed_failure_falls_back_to_keyword_embed_unavailable(self):
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    with mock.patch(
      "backend.services.knowledge_base_service.nomic_embed_available",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.corpus_has_usable_section_vectors",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.embed_texts",
      side_effect=OllamaEmbedError("timeout"),
    ):
      result = retrieve_knowledge_context(
        settings,
        ask_mode="strategy",
        question="Glyphid Dreadnought weak point",
        app_id="2321470",
        app_name="Deep Rock Galactic: Survivor",
        domain="strategy",
        pc_ip="127.0.0.1:11434",
      )
    self.assertTrue(result.attached)
    self.assertEqual(result.retrieval_method, "keyword_embed_unavailable")

  def test_vector_recall_finds_a_card_no_keyword_matched(self):
    """The bug this pass exists for: BM25 returns nothing, the right card is in the corpus.

    Measured on Deck 2026-08-17 -- "how do i kill the big armoured bug boss" returned 0
    candidates with the Glyphid Dreadnought card present, because vectors were only ever
    loaded for cards FTS had already found.
    """
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    with mock.patch(
      "backend.services.knowledge_base_service.nomic_embed_available",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.corpus_has_usable_section_vectors",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.embed_texts",
      return_value=[[1.0, 0.0] + [0.0] * 766],
    ), mock.patch(
      "backend.services.knowledge_base_service._load_section_vectors",
      return_value={
        3: [1.0, 0.0] + [0.0] * 766,
        4: [0.0, 1.0] + [0.0] * 766,
      },
    ):
      result = retrieve_knowledge_context(
        settings,
        ask_mode="strategy",
        question="how do i kill the big armoured bug boss",
        app_id="2321470",
        app_name="Deep Rock Galactic: Survivor",
        domain="strategy",
        pc_ip="127.0.0.1:11434",
      )
    self.assertTrue(result.attached)
    self.assertEqual(result.retrieval_method, "hybrid")
    self.assertIn("Dreadnought", result.text_block)
    self.assertNotIn("Hollow Bough", result.text_block)

  def test_vector_recall_leaves_an_under_floor_card_alone(self):
    """A card the keyword half never found has to clear VECTOR_RECALL_FLOOR to be attached."""
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    under_floor = VECTOR_RECALL_FLOOR - 0.05
    with mock.patch(
      "backend.services.knowledge_base_service.nomic_embed_available",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.corpus_has_usable_section_vectors",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.embed_texts",
      return_value=[[1.0, 0.0] + [0.0] * 766],
    ), mock.patch(
      "backend.services.knowledge_base_service._load_section_vectors",
      return_value={118: [under_floor, 0.0] + [0.0] * 766},
    ):
      result = retrieve_knowledge_context(
        settings,
        ask_mode="strategy",
        question="which character is best for a beginner",
        app_id="2321470",
        app_name="Deep Rock Galactic: Survivor",
        domain="strategy",
        pc_ip="127.0.0.1:11434",
      )
    self.assertNotIn("Classes", result.text_block)

  def test_vector_recall_does_not_run_on_the_implicit_route(self):
    """An Ask that never declared itself to be about the game pays no embed round trip.

    D17 routes every Ask made while a covered game runs. Spending ~800ms on Deck to attach a
    strategy card to "what is the weather tomorrow" is the trade
    IMPLICIT_ROUTE_RELEVANCE_FLOOR already refused for keyword hits.
    """
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    with mock.patch(
      "backend.services.knowledge_base_service.nomic_embed_available",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.corpus_has_usable_section_vectors",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.embed_texts",
      return_value=[[1.0, 0.0] + [0.0] * 766],
    ) as embed:
      result = retrieve_knowledge_context(
        settings,
        ask_mode="speed",
        # Not the "armoured bug boss" phrasing: the spelling fix means that one now has keyword
        # hits, and this test needs a question the keyword half cannot answer at all.
        question="which character is best for a beginner",
        app_id="2321470",
        app_name="Deep Rock Galactic: Survivor",
        domain="strategy",
        pc_ip="127.0.0.1:11434",
      )
    embed.assert_not_called()
    self.assertNotEqual(result.retrieval_method, "hybrid")
    self.assertFalse(result.attached)

  def test_vector_recall_stays_inside_the_resolved_game(self):
    """Recall is per-game for the same reason the keyword search is: wrong-game advice."""
    self._require_seed_vectors("section")
    conn = _get_connection(str(SEED_DB))
    dreadnought_vector = _load_section_vectors(conn, [3])[3]
    cards, vectors = _vector_recall_sections(
      conn,
      game_id=2,
      query_vector=dreadnought_vector,
      top_k=3,
      min_similarity=VECTOR_RECALL_FLOOR,
      exclude_ids=set(),
    )
    self.assertTrue(cards)
    self.assertEqual(cards[0].name, "Glyphid Dreadnought")
    self.assertEqual({c.game_id for c in cards}, {2})
    self.assertGreaterEqual(len(vectors), len(cards))

  def test_vector_recall_skips_a_card_the_keyword_half_already_found(self):
    self._require_seed_vectors("section")
    conn = _get_connection(str(SEED_DB))
    dreadnought_vector = _load_section_vectors(conn, [3])[3]
    cards, _ = _vector_recall_sections(
      conn,
      game_id=2,
      query_vector=dreadnought_vector,
      top_k=3,
      min_similarity=VECTOR_RECALL_FLOOR,
      exclude_ids={3},
    )
    self.assertNotIn(3, [c.section_id for c in cards])

  def test_pool_margin_blocks_a_question_that_singles_nothing_out(self):
    """Junk direction of the second signal: above the floor is no longer enough alone.

    Measured 2026-08-28 (docs/audit/kb-second-signal-2026-08-28.md): "please repeat that"
    scores 0.5308 against Glyphid Dreadnought -- clearing VECTOR_RECALL_FLOOR -- but beats
    DRG's pool average by only 0.0312, because a junk question is roughly equidistant from
    everything the game knows. A flat pool at a middling score must attach nothing, while
    the vectors still come back so fusion can re-rank whatever the keyword half found.
    """
    conn = _get_connection(str(SEED_DB))
    ids = [
      int(r[0])
      for r in conn.execute("SELECT section_id FROM sections WHERE game_id = 2")
    ]
    self.assertGreaterEqual(len(ids), VECTOR_RECALL_MARGIN_MIN_POOL)
    flat = VECTOR_RECALL_FLOOR + 0.01  # above the floor, identical for every card
    with mock.patch(
      "backend.services.knowledge_base_service._load_section_vectors",
      return_value={sid: [flat, 0.0] + [0.0] * 766 for sid in ids},
    ):
      cards, vectors = _vector_recall_sections(
        conn,
        game_id=2,
        query_vector=[1.0, 0.0] + [0.0] * 766,
        top_k=3,
        min_similarity=VECTOR_RECALL_FLOOR,
        exclude_ids=set(),
      )
    self.assertEqual(cards, [])
    self.assertEqual(len(vectors), len(ids))

  def test_pool_margin_lets_a_card_that_stands_out_through(self):
    """Genuine direction: a paraphrase singles one card out even at a modest absolute score."""
    conn = _get_connection(str(SEED_DB))
    ids = [
      int(r[0])
      for r in conn.execute("SELECT section_id FROM sections WHERE game_id = 2")
    ]
    standout = ids[0]
    vectors = {sid: [0.40, 0.0] + [0.0] * 766 for sid in ids}
    vectors[standout] = [VECTOR_RECALL_FLOOR + 0.01, 0.0] + [0.0] * 766
    with mock.patch(
      "backend.services.knowledge_base_service._load_section_vectors",
      return_value=vectors,
    ):
      cards, _ = _vector_recall_sections(
        conn,
        game_id=2,
        query_vector=[1.0, 0.0] + [0.0] * 766,
        top_k=3,
        min_similarity=VECTOR_RECALL_FLOOR,
        exclude_ids=set(),
      )
    self.assertEqual([c.section_id for c in cards], [standout])

  def test_pool_margin_absolute_branch_admits_a_uniformly_strong_pool(self):
    """A broad question naming its own game is close to ALL of that game's cards.

    "how to play state of emergency" has a pool margin of 0.0280 -- *below* every measured
    junk margin -- yet is genuine, and its top score (0.5751) is far above anything junk
    reaches (max 0.5326). The absolute branch (floor + VECTOR_RECALL_POOL_MARGIN) exists
    for exactly this case; without it the margin branch alone would cost a tune case.
    """
    conn = _get_connection(str(SEED_DB))
    ids = [
      int(r[0])
      for r in conn.execute("SELECT section_id FROM sections WHERE game_id = 2")
    ]
    strong = VECTOR_RECALL_FLOOR + VECTOR_RECALL_POOL_MARGIN + 0.01
    with mock.patch(
      "backend.services.knowledge_base_service._load_section_vectors",
      return_value={sid: [strong, 0.0] + [0.0] * 766 for sid in ids},
    ):
      cards, _ = _vector_recall_sections(
        conn,
        game_id=2,
        query_vector=[1.0, 0.0] + [0.0] * 766,
        top_k=3,
        min_similarity=VECTOR_RECALL_FLOOR,
        exclude_ids=set(),
      )
    self.assertEqual(len(cards), 3)

  def test_pool_margin_gate_skips_a_small_pool(self):
    """Below VECTOR_RECALL_MARGIN_MIN_POOL vectored sections, the floor alone decides.

    "Relative to the pool" is not a meaningful statistic over 1-3 cards (with one card the
    margin is identically zero and the gate would block every recall), so a partly-embedded
    or minimal corpus keeps the pre-signal behaviour.
    """
    conn = _get_connection(str(SEED_DB))
    ids = [
      int(r[0])
      for r in conn.execute("SELECT section_id FROM sections WHERE game_id = 2")
    ][: VECTOR_RECALL_MARGIN_MIN_POOL - 1]
    flat = VECTOR_RECALL_FLOOR + 0.01
    with mock.patch(
      "backend.services.knowledge_base_service._load_section_vectors",
      return_value={sid: [flat, 0.0] + [0.0] * 766 for sid in ids},
    ):
      cards, _ = _vector_recall_sections(
        conn,
        game_id=2,
        query_vector=[1.0, 0.0] + [0.0] * 766,
        top_k=3,
        min_similarity=VECTOR_RECALL_FLOOR,
        exclude_ids=set(),
      )
    self.assertEqual(len(cards), len(ids))

  def test_second_signal_keeps_a_junk_ask_unattached_end_to_end(self):
    """D28's regression direction through the full retrieval path.

    "please repeat that" has no keyword hits on the seed corpus, so before the second
    signal the vector recall pass was the only supplier of cards for it (Glyphid
    Dreadnought at 0.5308 on the Deck, 2026-08-23). With a flat above-floor pool the
    recall pass must now stay silent, so no game card reaches the block.
    """
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    conn = _get_connection(str(SEED_DB))
    ids = [
      int(r[0])
      for r in conn.execute("SELECT section_id FROM sections WHERE game_id = 2")
    ]
    flat = VECTOR_RECALL_FLOOR + 0.01
    with mock.patch(
      "backend.services.knowledge_base_service.nomic_embed_available",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.corpus_has_usable_section_vectors",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.embed_texts",
      return_value=[[1.0, 0.0] + [0.0] * 766],
    ), mock.patch(
      "backend.services.knowledge_base_service._load_section_vectors",
      return_value={sid: [flat, 0.0] + [0.0] * 766 for sid in ids},
    ):
      result = retrieve_knowledge_context(
        settings,
        ask_mode="strategy",
        question="please repeat that",
        app_id="2321470",
        app_name="Deep Rock Galactic: Survivor",
        domain="strategy",
        pc_ip="127.0.0.1:11434",
      )
    self.assertNotIn("Dreadnought", result.text_block)
    self.assertNotIn("Praetorian", result.text_block)
    self.assertNotIn("Nitra", result.text_block)

  def test_strategy_meaning_floor_sits_inside_the_calibrated_safe_zone(self):
    """Regression pin for the calibration written into STRATEGY_MEANING_FLOOR's comment: it
    must stay inside the measured safe zone -- above the strongest wrong-attached tuning row
    (0.5183) and below the weakest right-attached one (0.5277) -- or the zero-regression
    guarantee documented there no longer holds."""
    self.assertGreater(STRATEGY_MEANING_FLOOR, 0.5183)
    self.assertLess(STRATEGY_MEANING_FLOOR, 0.5277)

  def test_strategy_meaning_floor_blocks_a_below_floor_pool_end_to_end(self):
    """D87: a real keyword hit is still dropped when nothing in the game's whole vectored note
    set clears the meaning floor -- "attach nothing" beats attaching the only card that shares
    a word with the question, the notes-side twin of the tips test above.

    Every DRG Survivor section is mocked to the same low cosine (0.3, well under
    STRATEGY_MEANING_FLOOR), so the pool-margin gate inside _vector_recall_sections also finds
    nothing stands out -- the keyword hit on "Dreadnought" is the only reason anything would
    attach without this floor.
    """
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    conn = _get_connection(str(SEED_DB))
    ids = [
      int(r[0])
      for r in conn.execute("SELECT section_id FROM sections WHERE game_id = 2")
    ]
    with mock.patch(
      "backend.services.knowledge_base_service.nomic_embed_available",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.corpus_has_usable_section_vectors",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.embed_texts",
      return_value=[[1.0, 0.0] + [0.0] * 766],
    ), mock.patch(
      "backend.services.knowledge_base_service._load_section_vectors",
      return_value={sid: [0.3, 0.0] + [0.0] * 766 for sid in ids},
    ):
      result = retrieve_knowledge_context(
        settings,
        ask_mode="strategy",
        question="Glyphid Dreadnought weak point",
        app_id="2321470",
        app_name="Deep Rock Galactic: Survivor",
        domain="strategy",
        pc_ip="127.0.0.1:11434",
      )
    self.assertFalse(result.attached)
    self.assertEqual(result.text_block, "")
    self.assertTrue(result.notes.startswith("routed_nothing_fit"))

  def test_strategy_meaning_floor_leaves_a_confident_pool_alone(self):
    """The floor reads the pool's best score: one card clearing it keeps the whole game's
    vector pool from being blanked out, even when every sibling card scores low."""
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    conn = _get_connection(str(SEED_DB))
    ids = [
      int(r[0])
      for r in conn.execute("SELECT section_id FROM sections WHERE game_id = 2")
    ]
    vectors = {sid: [0.3, 0.0] + [0.0] * 766 for sid in ids}
    vectors[3] = [0.9, 0.0] + [0.0] * 766  # Glyphid Dreadnought -- clearly above the floor
    with mock.patch(
      "backend.services.knowledge_base_service.nomic_embed_available",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.corpus_has_usable_section_vectors",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.embed_texts",
      return_value=[[1.0, 0.0] + [0.0] * 766],
    ), mock.patch(
      "backend.services.knowledge_base_service._load_section_vectors",
      return_value=vectors,
    ):
      result = retrieve_knowledge_context(
        settings,
        ask_mode="strategy",
        question="Glyphid Dreadnought weak point",
        app_id="2321470",
        app_name="Deep Rock Galactic: Survivor",
        domain="strategy",
        pc_ip="127.0.0.1:11434",
      )
    self.assertTrue(result.attached)
    self.assertEqual(result.retrieval_method, "hybrid")
    self.assertIn("Dreadnought", result.text_block)

  def test_rrf_lets_a_recall_card_compete_without_unseating_the_top_keyword_hit(self):
    keyword = [
      KnowledgeCard(1, 1, "G", "boss", "Keyword first", "c", "", "", None, None, "fallback"),
      KnowledgeCard(2, 1, "G", "boss", "Keyword second", "c", "", "", None, None, "fallback"),
    ]
    recall = [KnowledgeCard(3, 1, "G", "boss", "Vector only", "c", "", "", None, None, "fallback")]
    vectors = {
      3: [1.0, 0.0],
      1: [0.7, 0.7],
      2: [0.0, 1.0],
    }
    fused = _fuse_cards_by_rrf(keyword, [1.0, 0.0], vectors, top_k=5, recall_cards=recall)
    self.assertEqual([c.name for c in fused], ["Keyword first", "Vector only", "Keyword second"])

  def test_rrf_does_not_duplicate_a_recall_card_the_keyword_list_already_had(self):
    keyword = [KnowledgeCard(1, 1, "G", "boss", "Shared", "c", "", "", None, None, "fallback")]
    recall = [KnowledgeCard(1, 1, "G", "boss", "Shared", "c", "", "", None, None, "fallback")]
    fused = _fuse_cards_by_rrf(keyword, [1.0, 0.0], {1: [1.0, 0.0]}, top_k=5, recall_cards=recall)
    self.assertEqual([c.section_id for c in fused], [1])

  def test_rrf_ranks_recall_cards_by_vector_when_keyword_found_nothing(self):
    recall = [
      KnowledgeCard(1, 1, "G", "boss", "Weaker", "c", "", "", None, None, "fallback"),
      KnowledgeCard(2, 1, "G", "boss", "Stronger", "c", "", "", None, None, "fallback"),
    ]
    vectors = {1: [0.6, 0.8], 2: [1.0, 0.0]}
    fused = _fuse_cards_by_rrf([], [1.0, 0.0], vectors, top_k=5, recall_cards=recall)
    self.assertEqual([c.name for c in fused], ["Stronger", "Weaker"])

  def test_compat_hybrid_reranks_when_nomic_available(self):
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    with mock.patch(
      "backend.services.knowledge_base_service.nomic_embed_available",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.corpus_has_usable_compat_vectors",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.embed_texts",
      return_value=[[1.0, 0.0] + [0.0] * 766],
    ), mock.patch(
      "backend.services.knowledge_base_service._load_compat_vectors",
      return_value={
        1: [1.0, 0.0] + [0.0] * 766,
        2: [0.0, 1.0] + [0.0] * 766,
      },
    ):
      # Expert mode (top_k=5), not speed (top_k=1), on purpose. Under the cosine-only
      # reranker a single mocked vector took the top slot outright, because vectorless cards
      # were exiled behind every scored one — so a top_k=1 assertion was really asserting
      # that exile. Fusion instead lets the vector-favoured tip climb from keyword rank 6
      # into the shortlist while the two strongest keyword hits keep their places, which is
      # the behaviour worth pinning.
      result = retrieve_knowledge_context(
        settings,
        ask_mode="expert",
        question="why is my game crashing proton issue",
        app_id="",
        app_name="",
        domain="compat",
        pc_ip="127.0.0.1:11434",
      )
    self.assertTrue(result.attached)
    self.assertEqual(result.retrieval_method, "hybrid")
    self.assertIn("Proton", result.text_block)
    topics = [line for line in result.text_block.splitlines() if line.startswith("[Tip:")]
    self.assertEqual(len(topics), 5)
    # Strongest keyword hits survive fusion rather than being displaced by the vectors.
    self.assertTrue(topics[0].startswith("[Tip: crash]"))

  def test_speed_mode_never_pays_for_the_meaning_search_compat(self):
    """D62 #2, compat domain half. Both nomic_ready branches must gate on ask_mode alike."""
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    with mock.patch(
      "backend.services.knowledge_base_service.nomic_embed_available",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.corpus_has_usable_compat_vectors",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.embed_texts",
      return_value=[[1.0, 0.0] + [0.0] * 766],
    ) as embed:
      result = retrieve_knowledge_context(
        settings,
        ask_mode="speed",
        question="why is my game crashing proton issue",
        app_id="",
        app_name="",
        domain="compat",
        pc_ip="127.0.0.1:11434",
      )
    embed.assert_not_called()
    self.assertTrue(result.attached)
    self.assertEqual(result.retrieval_method, "keyword")

  def test_routed_topic_tip_wins_over_a_keyword_match_on_another_topic(self):
    """D22, and the bug it fixes.

    Measured on Deck 2026-08-17: this sentence routes to steam_input, then retrieval threw the
    topic away and returned the gamescope tip "If game ignores resolution, set in-game
    resolution to match gamescope target" -- a lexical match on *ignores*, beating ten
    steam_input tips that were in the corpus.
    """
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    result = retrieve_knowledge_context(
      settings,
      ask_mode="speed",
      question="the game only responds to the touchpad and ignores the sticks",
      app_id="",
      app_name="",
      domain="compat",
      pc_ip="",
    )
    self.assertTrue(result.attached)
    tips = [ln for ln in result.text_block.splitlines() if ln.startswith("[Tip:")]
    self.assertTrue(tips)
    self.assertIn("steam_input", tips[0])
    self.assertNotIn("gamescope", tips[0])

  def test_topic_recall_reaches_tips_that_share_no_word_with_the_question(self):
    """Why a ranking preference alone could not fix this.

    Measured 2026-08-18: for three of the four KB-ROUTER-01 sentences the on-topic tips were
    not ranked low, they were absent -- 0 of 8 storage tips reached the keyword candidate list.
    You cannot promote a card that was never a candidate.
    """
    conn = _get_connection(str(SEED_DB))
    question = "I'm out of room and want my installs on the memory card instead"
    by_keyword = _search_compat_patterns(conn, query=_expand_query(question, ""), top_k=30)
    self.assertNotIn("storage", [c.name for c in by_keyword])

    recalled = _compat_tips_for_topics(
      conn,
      topics=match_compat_corpus_topics(question),
      exclude_ids=set(),
      top_k=COMPAT_TOPIC_RECALL_K,
    )
    self.assertTrue(recalled)
    self.assertEqual({c.name for c in recalled}, {"storage"})

  def test_topic_preference_is_not_a_filter(self):
    """D22 chose preference over filter, so a clearly better match elsewhere still surfaces.

    This question routes to proton *and* crash, but says "windows" outright, and the
    windows_steam tips keep their place. If this ever returns proton-only, the weight has been
    raised into filter territory and D22 no longer holds.

    Needs compat vectors: this asserts the cosine-ordered result. The test directly below is
    the same claim for a corpus built without an embed model, and that one always runs.
    """
    self._require_seed_vectors("compat")
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    result = retrieve_knowledge_context(
      settings,
      ask_mode="expert",
      question="my windows game shuts itself the moment the loading screen appears",
      app_id="",
      app_name="",
      domain="compat",
      pc_ip="",
    )
    topics = [ln for ln in result.text_block.splitlines() if ln.startswith("[Tip:")]
    self.assertTrue(any("windows_steam" in ln for ln in topics))

  def test_topic_preference_does_not_need_an_embed_model(self):
    """A Deck without nomic installed still gets the routing fix, just without cosine order."""
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    with mock.patch(
      "backend.services.knowledge_base_service.nomic_embed_available",
      return_value=False,
    ):
      result = retrieve_knowledge_context(
        settings,
        ask_mode="speed",
        question="my playstation 2 games run at half speed on the handheld",
        app_id="",
        app_name="",
        domain="compat",
        pc_ip="",
      )
    tips = [ln for ln in result.text_block.splitlines() if ln.startswith("[Tip:")]
    self.assertTrue(tips)
    self.assertIn("emudeck", tips[0])

  def test_compat_keyword_when_nomic_missing(self):
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    with mock.patch(
      "backend.services.knowledge_base_service.nomic_embed_available",
      return_value=False,
    ), mock.patch(
      "backend.services.knowledge_base_service.corpus_has_usable_compat_vectors",
      return_value=True,
    ):
      result = retrieve_knowledge_context(
        settings,
        ask_mode="speed",
        question="proton shader cache deck",
        app_id="",
        app_name="",
        domain="compat",
        pc_ip="127.0.0.1:11434",
      )
    self.assertTrue(result.attached)
    self.assertEqual(result.retrieval_method, "keyword")

  def test_compat_embed_failure_falls_back(self):
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    with mock.patch(
      "backend.services.knowledge_base_service.nomic_embed_available",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.corpus_has_usable_compat_vectors",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.embed_texts",
      side_effect=OllamaEmbedError("timeout"),
    ):
      # Expert, not Speed: since D62 #2, Speed never attempts the embed at all (its own
      # test is test_speed_mode_never_pays_for_the_meaning_search_compat), so this needs a
      # declared mode to reach the embed-failure fallback path being pinned here.
      result = retrieve_knowledge_context(
        settings,
        ask_mode="expert",
        question="proton crash deck sleep",
        app_id="",
        app_name="",
        domain="compat",
        pc_ip="127.0.0.1:11434",
      )
    self.assertTrue(result.attached)
    self.assertEqual(result.retrieval_method, "keyword_embed_unavailable")

  def test_best_meaning_score_reads_the_max_across_the_pool(self):
    """The D87 floor reads the strongest match in the whole pool, not any one card's rank."""
    vectors = {1: [1.0, 0.0], 2: [0.0, 1.0], 3: [0.6, 0.8]}
    self.assertAlmostEqual(_best_meaning_score(vectors, [1.0, 0.0]), 1.0)
    self.assertIsNone(_best_meaning_score({}, [1.0, 0.0]))

  def test_compat_meaning_floor_blocks_a_below_floor_pool_end_to_end(self):
    """D87: a keyword/topic pool whose best meaning score never clears the floor attaches
    nothing at all -- not the weakest tip in the pool, and not the compat fallback either.

    Real keyword pool ("why is my game crashing proton issue" has five real tips on the seed
    corpus, per test_compat_hybrid_reranks_when_nomic_available); every mocked vector is
    orthogonal to the query, so the best meaning score in the pool is 0.0, well under
    COMPAT_MEANING_FLOOR.
    """
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    with mock.patch(
      "backend.services.knowledge_base_service.nomic_embed_available",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.corpus_has_usable_compat_vectors",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.embed_texts",
      return_value=[[1.0, 0.0] + [0.0] * 766],
    ), mock.patch(
      "backend.services.knowledge_base_service._load_compat_vectors",
      return_value={1: [0.0, 1.0] + [0.0] * 766, 2: [0.0, 1.0] + [0.0] * 766},
    ):
      result = retrieve_knowledge_context(
        settings,
        ask_mode="expert",
        question="why is my game crashing proton issue",
        app_id="",
        app_name="",
        domain="compat",
        pc_ip="127.0.0.1:11434",
      )
    self.assertFalse(result.attached)
    self.assertEqual(result.text_block, "")
    self.assertTrue(result.notes.startswith("routed_nothing_fit"))

  def test_compat_meaning_floor_leaves_a_confident_pool_alone(self):
    """The floor reads the pool's best score, so one strong card keeps the whole pool attached
    even when other candidates in it score near zero."""
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    with mock.patch(
      "backend.services.knowledge_base_service.nomic_embed_available",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.corpus_has_usable_compat_vectors",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.embed_texts",
      return_value=[[1.0, 0.0] + [0.0] * 766],
    ), mock.patch(
      "backend.services.knowledge_base_service._load_compat_vectors",
      return_value={1: [1.0, 0.0] + [0.0] * 766, 2: [0.0, 1.0] + [0.0] * 766},
    ):
      result = retrieve_knowledge_context(
        settings,
        ask_mode="expert",
        question="why is my game crashing proton issue",
        app_id="",
        app_name="",
        domain="compat",
        pc_ip="127.0.0.1:11434",
      )
    self.assertTrue(result.attached)
    self.assertEqual(result.retrieval_method, "hybrid")

  def test_thank_you_very_much_attaches_nothing(self):
    """Precision test carried over from wave two's tip lane -- must keep passing unchanged.

    No topic matches, no keyword hit, so this never reaches the meaning floor at all; it is
    pinned here so a future change to either gate cannot quietly start attaching something.
    """
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    result = retrieve_knowledge_context(
      settings,
      ask_mode="speed",
      question="thank you very much",
      app_id="",
      app_name="",
      domain="compat",
      pc_ip="",
    )
    self.assertFalse(result.attached)
    self.assertEqual(result.text_block, "")

  def test_compat_meaning_floor_stands_down_without_an_embed_model(self):
    """No embed model means no meaning score to floor -- keyword attachment is unaffected."""
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    with mock.patch(
      "backend.services.knowledge_base_service.nomic_embed_available",
      return_value=False,
    ), mock.patch(
      "backend.services.knowledge_base_service.corpus_has_usable_compat_vectors",
      return_value=True,
    ):
      result = retrieve_knowledge_context(
        settings,
        ask_mode="expert",
        question="why is my game crashing proton issue",
        app_id="",
        app_name="",
        domain="compat",
        pc_ip="127.0.0.1:11434",
      )
    self.assertTrue(result.attached)
    self.assertEqual(result.retrieval_method, "keyword")

  def test_game_knowledge_is_not_gated_on_ask_mode(self):
    """D17. The same question about the same running game, in each mode.

    Strategy cards used to require Strategy mode, so Speed and Expert got nothing at all --
    Expert being the mode somebody stuck on a hard fight is most likely to be in.
    """
    for mode in ("speed", "strategy", "expert"):
      with self.subTest(ask_mode=mode):
        should_run, domain = should_retrieve_knowledge(
          use_local_knowledge_base=True,
          ask_mode=mode,
          question="how do I beat the tank",
          app_id="550",
          app_name="Left 4 Dead 2",
        )
        self.assertTrue(should_run)
        self.assertEqual(domain, "strategy")

  def test_ask_mode_still_decides_how_many_cards(self):
    """D17 changed whether the corpus is consulted, not how much of it is attached."""
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    counts = {}
    for mode in ("speed", "expert"):
      result = retrieve_knowledge_context(
        settings,
        ask_mode=mode,
        question="proton crash shader deck steam input storage",
        app_id="",
        app_name="",
        domain="compat",
        pc_ip="",
      )
      counts[mode] = len([ln for ln in result.text_block.splitlines() if ln.startswith("[Tip:")])
    self.assertEqual(counts["speed"], 1)
    self.assertGreater(counts["expert"], counts["speed"])

  def test_expert_mode_is_on_the_explicit_route_like_strategy(self):
    """Expert declares the Ask is about the game just as plainly as Strategy does.

    The two mode-keyed knobs disagreed: `_budget_for_mode` gave Expert the largest card budget
    while the route flag put it on IMPLICIT_ROUTE_RELEVANCE_FLOOR, so the mode picked for
    maximum depth hid the most corpus. Measured on device 2026-08-17 and reproduced on the
    seed corpus: DRG Survivor, "what class should i pick" -- Strategy 2 cards, Expert 1.

    Keyword-only on purpose: this is about the relevance floor, not the vector recall pass.
    """
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    counts = {}
    with mock.patch(
      "backend.services.knowledge_base_service.nomic_embed_available",
      return_value=False,
    ):
      for mode in ("speed", "strategy", "expert"):
        result = retrieve_knowledge_context(
          settings,
          ask_mode=mode,
          question="what class should i pick",
          app_id="2321470",
          app_name="Deep Rock Galactic: Survivor",
          domain="strategy",
          pc_ip="",
        )
        counts[mode] = [
          ln for ln in result.text_block.splitlines() if ln.startswith("[Deep Rock")
        ]
    self.assertEqual(len(counts["expert"]), len(counts["strategy"]))
    self.assertGreater(len(counts["expert"]), len(counts["speed"]))
    # The card that died at the implicit floor.
    self.assertTrue(any("Upgrades and overclocks" in ln for ln in counts["expert"]))

  def test_expert_mode_gets_the_vector_recall_pass_too(self):
    """The floor and the recall gate read one flag, so widening it widens both."""
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    with mock.patch(
      "backend.services.knowledge_base_service.nomic_embed_available",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.corpus_has_usable_section_vectors",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.embed_texts",
      return_value=[[1.0, 0.0] + [0.0] * 766],
    ), mock.patch(
      "backend.services.knowledge_base_service._load_section_vectors",
      return_value={3: [1.0, 0.0] + [0.0] * 766},
    ):
      result = retrieve_knowledge_context(
        settings,
        ask_mode="expert",
        question="how do i kill the big armoured bug boss",
        app_id="2321470",
        app_name="Deep Rock Galactic: Survivor",
        domain="strategy",
        pc_ip="127.0.0.1:11434",
      )
    self.assertTrue(result.attached)
    self.assertEqual(result.retrieval_method, "hybrid")
    self.assertIn("Dreadnought", result.text_block)

  def test_troubleshooting_still_wins_over_an_open_game(self):
    """A crash question asked mid-game is a crash question, not a boss question."""
    should_run, domain = should_retrieve_knowledge(
      use_local_knowledge_base=True,
      ask_mode="speed",
      question="proton crash on launch",
      app_id="550",
      app_name="Left 4 Dead 2",
    )
    self.assertTrue(should_run)
    self.assertEqual(domain, "compat")

  def test_question_naming_a_title_reaches_the_corpus_with_no_game_running(self):
    """D19 / KB-NEWTITLE-01, which was specified and never built.

    Measured on Deck 2026-08-17: `hl2 ravenholm` and `drg survivor what class` returned
    gate=False in every mode, so the whole strategy corpus was unreachable from the couch.
    """
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    for question, expected_card in (
      ("hl2 ravenholm", "Ravenholm"),
      ("how do gels work in portal 2", "Gels"),
      ("what is the best way to beat volvagia in oot", "Volvagia"),
    ):
      with self.subTest(question=question):
        title = resolve_title_from_question(settings, question)
        self.assertTrue(title)
        should, domain = should_retrieve_knowledge(
          use_local_knowledge_base=True,
          ask_mode="speed",
          question=question,
          app_id="",
          app_name="",
          text_resolved_title=title,
        )
        self.assertTrue(should)
        self.assertEqual(domain, "strategy")
        result = retrieve_knowledge_context(
          settings,
          ask_mode="strategy",
          question=question,
          app_id="",
          app_name="",
          text_resolved_title=title,
          domain=domain,
          pc_ip="",
        )
        self.assertTrue(result.attached)
        self.assertIn(expected_card, result.text_block)
        self.assertTrue(result.notes.startswith("text:"))

  def test_a_running_game_always_beats_a_title_named_in_the_question(self):
    """The failure this must never cause: answering about a game the user is not playing."""
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    result = retrieve_knowledge_context(
      settings,
      ask_mode="strategy",
      question="how do gels work in portal 2",
      app_id="1145360",
      app_name="Hades",
      text_resolved_title="",
      domain="strategy",
      pc_ip="",
    )
    self.assertNotIn("Gels", result.text_block)

  def test_troubleshooting_still_wins_over_a_title_named_in_the_question(self):
    """"How do I fix proton for portal 2" is a troubleshooting question that names a title."""
    should, domain = should_retrieve_knowledge(
      use_local_knowledge_base=True,
      ask_mode="speed",
      question="how do i fix proton crashes for portal 2",
      app_id="",
      app_name="",
      text_resolved_title="Portal 2",
    )
    self.assertTrue(should)
    self.assertEqual(domain, "compat")

  def test_a_short_alias_inside_an_ordinary_word_does_not_resolve_a_title(self):
    """Word-boundary matching. `soh` must not fire inside "so here"."""
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    for question in ("so here is my problem", "i need a boot disk", "hooters"):
      with self.subTest(question=question):
        self.assertEqual(resolve_title_from_question(settings, question), "")

  def test_longest_alias_wins(self):
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    self.assertEqual(
      resolve_title_from_question(settings, "co-op tips for portal 2 please"), "Portal 2"
    )

  def test_a_canonical_title_with_punctuation_still_resolves(self):
    """`normalize_alias` strips the colon, `lower(canonical_title)` keeps it, so Ocarina of
    Time matched neither table and fell through to the genre fallback."""
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    result = retrieve_knowledge_context(
      settings,
      ask_mode="strategy",
      question="how do i beat queen gohma",
      app_id="",
      app_name="",
      text_resolved_title="The Legend of Zelda: Ocarina of Time",
      domain="strategy",
      pc_ip="",
    )
    self.assertTrue(result.attached)
    self.assertIn("Queen Gohma", result.text_block)

  def test_no_running_game_means_no_strategy_route(self):
    should_run, domain = should_retrieve_knowledge(
      use_local_knowledge_base=True,
      ask_mode="expert",
      question="how do I beat the tank",
      app_id="",
      app_name="",
    )
    self.assertFalse(should_run)
    self.assertEqual(domain, "")

  def test_implicit_route_attaches_nothing_rather_than_a_generic_card(self):
    """The cost of D17 being permissive, contained.

    An explicit Strategy Ask with no hit still gets the genre card as a consolation. An
    ordinary Ask that merely happened while a game was open must not -- otherwise every
    Speed Ask on the Deck grows a boilerplate strategy block that answers nothing.
    """
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    off_topic = "what time do the shops close on a sunday"
    implicit = retrieve_knowledge_context(
      settings,
      ask_mode="speed",
      question=off_topic,
      app_id="550",
      app_name="Left 4 Dead 2",
      domain="strategy",
      pc_ip="",
    )
    self.assertFalse(implicit.attached)

    explicit = retrieve_knowledge_context(
      settings,
      ask_mode="strategy",
      question=off_topic,
      app_id="550",
      app_name="Left 4 Dead 2",
      domain="strategy",
      pc_ip="",
    )
    self.assertTrue(explicit.attached)

  def test_a_british_spelling_reaches_a_us_spelled_card(self):
    """Measured 2026-08-18: `armor` found the Dreadnought card, `armour` found nothing.

    FTS5's porter stemmer normalises word endings, not spelling variants, and every card in the
    corpus is written in US English.
    """
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    with mock.patch(
      "backend.services.knowledge_base_service.nomic_embed_available",
      return_value=False,
    ):
      result = retrieve_knowledge_context(
        settings,
        ask_mode="strategy",
        question="armour",
        app_id="2321470",
        app_name="Deep Rock Galactic: Survivor",
        domain="strategy",
        pc_ip="",
      )
    self.assertIn("Dreadnought", result.text_block)

  def test_spelling_expansion_widens_and_never_replaces(self):
    """Both spellings go in, so a British question reaches a US-spelled card *and* the other way."""
    self.assertEqual(_expand_query("armoured plates", "", game_resolved=True), "armoured plates armored")
    self.assertEqual(_expand_query("customise controls", "", game_resolved=True), "customise controls customize")

  def test_spelling_expansion_leaves_ordinary_words_alone(self):
    """The -our rule must not turn "our" into "or", or "hours" into "hors"."""
    for phrase in ("our team", "four hours", "the flour", "rise and shine", "one sentence"):
      with self.subTest(phrase=phrase):
        self.assertEqual(_expand_query(phrase, "", game_resolved=True), phrase)

  def test_asking_for_the_boss_by_kind_reaches_a_card_typed_as_a_boss(self):
    """A card's type is not in the FTS index, so "how do i beat the boss" found nothing.

    The player who cannot name the boss is the player who needs the card most.
    """
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    result = retrieve_knowledge_context(
      settings,
      ask_mode="strategy",
      question="how do i beat the boss",
      app_id="2321470",
      app_name="Deep Rock Galactic: Survivor",
      domain="strategy",
      pc_ip="",
    )
    self.assertTrue(result.attached)
    self.assertIn("Dreadnought", result.text_block)

  def test_type_recall_does_not_displace_a_card_the_question_named(self):
    """The preference is flat and small: naming a card still beats asking for its kind."""
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    result = retrieve_knowledge_context(
      settings,
      ask_mode="strategy",
      question="how do i beat queen gohma",
      app_id="",
      app_name="The Legend of Zelda: Ocarina of Time",
      domain="strategy",
      pc_ip="",
    )
    first_card = next(ln for ln in result.text_block.splitlines() if ln.startswith("["))
    self.assertIn("Queen Gohma", first_card)
  def test_type_recall_does_not_outrank_a_keyword_match_of_the_same_kind(self):
    """Measured 2026-08-19, once Ocarina of Time went from three boss cards to six.

    `_sections_of_type` takes the game's first TYPE_RECALL_K cards of the kind by section_id,
    which is authoring order and carries no relevance. Preferring them unconditionally promoted
    that arbitrary slice over a real match: "how do i beat the water temple boss" returned Queen
    Gohma, Volvagia and Twinrova and dropped Morpha, whose card opens "The Water Temple boss".
    """
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    for question, expected in (
      ("how do i beat the water temple boss", "Morpha"),
      ("the forest temple boss keeps flying away", "Phantom Ganon"),
    ):
      with self.subTest(question=question):
        result = retrieve_knowledge_context(
          settings,
          ask_mode="strategy",
          question=question,
          app_id="",
          app_name="The Legend of Zelda: Ocarina of Time",
          domain="strategy",
          pc_ip="",
        )
        first_card = next(ln for ln in result.text_block.splitlines() if ln.startswith("["))
        self.assertIn(expected, first_card)

  def test_type_recall_still_rescues_a_kind_the_keyword_half_missed(self):
    """The direction the feature exists for, and the one this narrowing must not break.

    "how do i beat the boss" on DRG Survivor has no keyword hit typed `boss` -- the word matches
    a mechanic and an area card incidentally -- so the recalled boss cards keep the preference.
    """
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    result = retrieve_knowledge_context(
      settings,
      ask_mode="strategy",
      question="how do i beat the boss",
      app_id="2321470",
      app_name="Deep Rock Galactic: Survivor",
      domain="strategy",
      pc_ip="",
    )
    first_card = next(ln for ln in result.text_block.splitlines() if ln.startswith("["))
    self.assertIn("boss:", first_card)


  def test_type_recall_does_not_run_on_the_implicit_route(self):
    """A bare "boss" in a passing Ask is weak evidence the Ask is about the game."""
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    result = retrieve_knowledge_context(
      settings,
      ask_mode="speed",
      question="how do i beat the boss",
      app_id="2321470",
      app_name="Deep Rock Galactic: Survivor",
      domain="strategy",
      pc_ip="",
    )
    self.assertFalse(result.attached)

  def test_a_stardew_valley_session_does_not_inherit_ocarina_of_times_cards(self):
    """413150 is Stardew Valley's real Steam AppID. The seed had it on Ocarina of Time, which
    has none -- so a Stardew player asking about farming got Zelda cards, and, worse, Zelda's
    progression fencing. Measured 2026-08-21 before the fix: three Ocarina of Time cards came
    back for "how do i make more money on my farm".
    """
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    result = retrieve_knowledge_context(
      settings,
      ask_mode="strategy",
      question="how do i make more money on my farm",
      app_id="413150",
      app_name="Stardew Valley",
      domain="strategy",
      pc_ip="",
    )
    self.assertNotIn("Ocarina of Time", result.text_block)

  def test_ocarina_of_time_still_resolves_from_the_session_title(self):
    """The direction the fix must not cost anything. Both the emulator's canonical title and
    the Ship of Harkinian shortcut name reach the same cards, through the alias table."""
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    for app_name in ("The Legend of Zelda: Ocarina of Time", "Ship of Harkinian"):
      with self.subTest(app_name=app_name):
        result = retrieve_knowledge_context(
          settings,
          ask_mode="strategy",
          question="how do i beat volvagia",
          app_id="",
          app_name=app_name,
          domain="strategy",
          pc_ip="",
        )
        self.assertTrue(result.attached)
        self.assertIn("Volvagia", result.text_block)

  def test_structured_enemy_cards_are_reachable_for_the_sample_titles(self):
    """Phase 4 track 2. Measured 2026-08-19: 0 of 18 questions reached a new card before the
    cards existed, 16 after -- these are the two shapes that carried it.

    Named outright and described by what it does; the named case is the one a player types
    mid-run, the described case is what the vector half is for.
    """
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    for question, expected in (
      ("how do i deal with the exploders", "Exploder"),
      ("the flying ones keep getting me", "Mactera"),
      ("what is red sugar for", "Red Sugar"),
    ):
      with self.subTest(question=question):
        result = retrieve_knowledge_context(
          settings,
          ask_mode="strategy",
          question=question,
          app_id="2321470",
          app_name="Deep Rock Galactic: Survivor",
          domain="strategy",
          pc_ip="",
        )
        self.assertTrue(result.attached)
        self.assertIn(expected, result.text_block)

  def test_structured_cards_keep_their_labelled_lines_in_the_block(self):
    """The labels are the whole point of the format -- the prompt clause that turns them into
    bullets fires on their presence in the block, so losing them here silently disables it."""
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    result = retrieve_knowledge_context(
      settings,
      ask_mode="strategy",
      question="how do i deal with the exploders",
      app_id="2321470",
      app_name="Deep Rock Galactic: Survivor",
      domain="strategy",
      pc_ip="",
    )
    self.assertIn("Summary:", result.text_block)
    self.assertIn("Weak points:", result.text_block)

  def test_an_item_question_reaches_an_item_card_not_a_mechanic_card(self):
    """Ocarina of Time's items were the half of the corpus a player asks about most and the
    half that did not exist. `Adult dungeon order` was answering "what should i keep in my
    bottles" before the cards landed."""
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    result = retrieve_knowledge_context(
      settings,
      ask_mode="strategy",
      question="what should i keep in my bottles",
      app_id="",
      app_name="The Legend of Zelda: Ocarina of Time",
      domain="strategy",
      pc_ip="",
    )
    first_card = next(ln for ln in result.text_block.splitlines() if ln.startswith("["))
    self.assertIn("item: Bottles", first_card)

  def test_a_structured_card_uses_known_labels_on_every_line(self):
    """Guards the authoring format across the whole corpus rather than the new rows only.

    A card that opens `Weakpoints:` or `Weaknesses:` reads fine to a human and is invisible to
    the prompt clause in `ollama_prompts.py`, which matches the exact strings.

    A card counts as structured when its **first** line carries an allowed label, and then
    every line must. Prose cards are left alone entirely -- several of them legitimately open a
    line with a colon (`PCSX2:`, `DE edition:`), and no heuristic separates those from a
    mistyped label, so the format opts in rather than being inferred.
    """
    seed = json.loads((REPO_ROOT / "data" / "kb" / "strategy_seed.json").read_text(encoding="utf-8"))
    allowed = {"Summary:", "Weak points:", "Uses:", "Phases:", "Tips:"}
    structured = 0
    for section in seed["sections"]:
      lines = [ln for ln in str(section["card"]).split("\n") if ln.strip()]
      if not lines or not any(lines[0].startswith(label) for label in allowed):
        continue
      structured += 1
      for line in lines:
        with self.subTest(section=section["name"], line=line[:40]):
          self.assertTrue(
            any(line.startswith(label) for label in allowed),
            f"{section['name']!r} is a structured card but this line has no known label: {line[:60]!r}",
          )
    # Fails loudly if the seed ever loses the structured cards, which would make the loop above
    # pass by iterating over nothing. Exact on purpose, so it catches a drop as well as a gain --
    # the cost is that adding structured cards edits this line, which is a deliberate checkpoint.
    # 16 (Phase 4 track 2, two sample titles) -> 22 on 2026-08-29, when State of Emergency gained
    # six cards written from the maintainer's own answers to the corpus gap sheet.
    self.assertEqual(structured, 22)


  def test_fusion_never_lists_the_same_card_twice(self):
    """Two recall paths can surface one card -- a boss card is typed *and* a cosine match."""
    keyword = [KnowledgeCard(1, 1, "G", "boss", "A", "c", "", "", None, None, "fallback")]
    duplicated = [
      KnowledgeCard(2, 1, "G", "boss", "B", "c", "", "", None, None, "fallback"),
      KnowledgeCard(2, 1, "G", "boss", "B", "c", "", "", None, None, "fallback"),
      KnowledgeCard(1, 1, "G", "boss", "A", "c", "", "", None, None, "fallback"),
    ]
    fused = _fuse_cards_by_rrf(keyword, [1.0, 0.0], {}, top_k=10, recall_cards=duplicated)
    self.assertEqual(sorted(c.section_id for c in fused), [1, 2])

  def test_uncovered_game_does_not_get_another_games_cards(self):
    """Strategy search is scoped to the resolved game, or it does not run.

    "Tank" is a Left 4 Dead 2 section. Asked while playing something the corpus has never
    heard of, an unscoped search returned it as the best keyword match in the corpus --
    confidently answering a question about the wrong game. The genre fallback covers the
    unresolved case instead.
    """
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    result = retrieve_knowledge_context(
      settings,
      ask_mode="strategy",
      question="how do I beat the tank",
      app_id="999999",
      app_name="A Game The Corpus Has Never Heard Of",
      domain="strategy",
      pc_ip="",
    )
    self.assertNotIn("Left 4 Dead 2", result.text_block)
    self.assertNotIn("Tank", result.text_block)

  def test_covered_game_still_gets_its_own_cards(self):
    """The scoping fix must not cost the case it was protecting."""
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    result = retrieve_knowledge_context(
      settings,
      ask_mode="strategy",
      question="how do I beat the tank",
      app_id="550",
      app_name="Left 4 Dead 2",
      domain="strategy",
      pc_ip="",
    )
    self.assertTrue(result.attached)
    self.assertIn("Tank", result.text_block)

  def test_kill_switch_leaves_keyword_search_working_and_says_so(self):
    """Hybrid off is a diagnosis aid, not a way to turn the knowledge base off.

    ``embed_texts`` is patched to explode: if the switch were only advisory the call would
    happen anyway and the test would error rather than fail on the assertion.
    """
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
      "rag_hybrid_retrieval_enabled": False,
    }
    with mock.patch(
      "backend.services.knowledge_base_service.nomic_embed_available",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.corpus_has_usable_compat_vectors",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.embed_texts",
      side_effect=AssertionError("query must not be embedded while hybrid is off"),
    ):
      result = retrieve_knowledge_context(
        settings,
        ask_mode="expert",
        question="why is my game crashing proton issue",
        app_id="",
        app_name="",
        domain="compat",
        pc_ip="127.0.0.1:11434",
      )
    self.assertTrue(result.attached)
    self.assertEqual(result.retrieval_method, "keyword_hybrid_disabled")

  def test_hybrid_stays_on_when_the_setting_was_never_saved(self):
    """An older settings.json has no such key. Missing must read as on, not off."""
    settings = {
      "use_local_knowledge_base": True,
      "rag_corpus_path": str(SEED_DB.parent),
    }
    with mock.patch(
      "backend.services.knowledge_base_service.nomic_embed_available",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.corpus_has_usable_compat_vectors",
      return_value=True,
    ), mock.patch(
      "backend.services.knowledge_base_service.embed_texts",
      return_value=[[1.0, 0.0] + [0.0] * 766],
    ), mock.patch(
      "backend.services.knowledge_base_service._load_compat_vectors",
      return_value={1: [1.0, 0.0] + [0.0] * 766},
    ):
      result = retrieve_knowledge_context(
        settings,
        ask_mode="expert",
        question="why is my game crashing proton issue",
        app_id="",
        app_name="",
        domain="compat",
        pc_ip="127.0.0.1:11434",
      )
    self.assertEqual(result.retrieval_method, "hybrid")

  def test_vector_pack_unpack_roundtrip(self):
    vec = [0.1, -0.2, 0.3]
    blob = pack_embedding_vector(vec)
    unpacked = unpack_embedding_vector(blob)
    for a, b in zip(vec, unpacked):
      self.assertAlmostEqual(a, b, places=5)


if __name__ == "__main__":
  unittest.main()


class TrustTierDerivationTests(unittest.TestCase):
    """A wiki tier has to mean a wiki.

    Found on device 2026-08-22: `source_version` was tested first, and the seed writes a build tag
    there for maintainer-authored cards with no source. 24 unsourced cards were rated
    `wiki_verified` while 59 genuinely wiki-sourced ones were rated lower, so the top tier was
    reachable only through the fault. The tier is passed to the model as well as shown to the
    user, so this was telling the model to trust unsourced advice most.
    """

    @staticmethod
    def _row(source_url, source_version):
        import sqlite3

        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        conn.execute("CREATE TABLE s (source_url TEXT, source_version TEXT)")
        conn.execute("INSERT INTO s VALUES (?, ?)", (source_url, source_version))
        return conn.execute("SELECT * FROM s").fetchone()

    def test_no_source_url_is_never_a_wiki_tier_even_with_a_version(self):
        # The exact shape of the 24 mislabelled cards: seed build tag, no wiki anywhere.
        self.assertEqual(_trust_tier_for_row(self._row("", "seed-1.1")), TRUST_TIER_FALLBACK)
        self.assertEqual(_trust_tier_for_row(self._row(None, "seed-1.0")), TRUST_TIER_FALLBACK)

    def test_wiki_url_without_a_revision_is_wiki_no_patch(self):
        # The 59 real wiki cards. Unchanged by the fix -- that is the point.
        self.assertEqual(
            _trust_tier_for_row(self._row("https://theportalwiki.com/wiki/Gels", "")),
            TRUST_TIER_WIKI_NO_PATCH,
        )

    def test_wiki_url_with_a_revision_is_wiki_verified(self):
        self.assertEqual(
            _trust_tier_for_row(self._row("https://theportalwiki.com/wiki/Gels", "2026-08-09")),
            TRUST_TIER_WIKI_VERIFIED,
        )

    def test_bare_card_with_nothing_is_fallback(self):
        self.assertEqual(_trust_tier_for_row(self._row("", "")), TRUST_TIER_FALLBACK)


class CompatPatternsTipContentTests(unittest.TestCase):
    """Pins what a person actually gets back from data/kb/compat_patterns.json.

    Reads the JSON file directly -- no corpus build, no Ollama -- because these are facts
    about the tip text itself, not about search ranking.
    """

    @classmethod
    def setUpClass(cls):
        path = REPO_ROOT / "data" / "kb" / "compat_patterns.json"
        cls.patterns = json.loads(path.read_text(encoding="utf-8"))

    def test_five_thin_subjects_now_have_real_coverage(self):
        """KB wave two, Lane D: each of these had one or two tips and needed 8-10."""
        by_topic: dict[str, int] = {}
        for row in self.patterns:
            by_topic[row["topic"]] = by_topic.get(row["topic"], 0) + 1
        for topic in ("crash", "performance", "audio", "display", "controller"):
            with self.subTest(topic=topic):
                self.assertGreaterEqual(by_topic[topic], 8)
                self.assertLessEqual(by_topic[topic], 10)

    def test_crash_no_longer_claims_a_desktop_that_game_mode_does_not_have(self):
        """A Deck in game mode drops a crashed game back to the library, not to a desktop --
        the old tip told people to go check logs on a desktop that isn't there."""
        crash_cards = [row["card"] for row in self.patterns if row["topic"] == "crash"]
        for card in crash_cards:
            self.assertNotIn("Crash to desktop", card)

    def test_overlay_crash_tip_moved_out_of_proton(self):
        """This tip is about a crash, not about Proton, and used to sit under the wrong topic."""
        overlay_text = "Disable Steam overlay and third-party overlays when crashes happen at launch."
        proton_cards = [row["card"] for row in self.patterns if row["topic"] == "proton"]
        crash_cards = [row["card"] for row in self.patterns if row["topic"] == "crash"]
        self.assertNotIn(overlay_text, proton_cards)
        self.assertIn(overlay_text, crash_cards)

    def test_every_tip_stays_a_sentence_or_two(self):
        """A tip is meant to be read at a glance, not studied."""
        for row in self.patterns:
            self.assertLessEqual(
                len(row["card"]), 200, f"pattern {row['pattern_id']} card is too long to be a quick tip"
            )

    def test_steam_frame_tips_replaced_after_the_frame_study(self):
        """Plan 49 section 6: the four old Frame tips (one of which pointed at a phone app
        that does not exist) are gone, replaced by seven that read as general guidance and
        never claim bonsAI has readings from a headset it cannot have."""
        frame_cards = [row["card"] for row in self.patterns if row["topic"] == "steam_frame"]
        self.assertEqual(len(frame_cards), 7)

        for card in frame_cards:
            with self.subTest(card=card):
                self.assertNotIn("phone", card.lower())
                self.assertNotIn("research-phase", card.lower())
                self.assertNotIn("bonsai observed", card.lower())
                self.assertNotIn("detected", card.lower())

        self.assertTrue(
            any(":11434" in card for card in frame_cards),
            "one tip should tell a person the port to point bonsAI at on the streaming PC",
        )
