"""A game's own Deck tip is credited as that game's tip, not as a shared one (plan 72 lane 6).

Found on the Deck by plan 70 (docs/test-evidence/plan70-R4-try5.json, plan70-R4-try6.json):
Show details credited Deep Rock Galactic: Survivor's Render Scale tip and Fallout 4's F4SE tip
as "Shared troubleshooting — <topic>", and the notes block over them read "From the shared Deck
tips". Every tip card was given one fixed game title where tip rows become cards, whatever the
row's own ``app_id`` said.

Built against the real seed library and the real ``retrieve_knowledge_context`` /
``_format_block`` / ``_parse_kb_attached_notes``, so the shapes tested are the ones the back end
actually emits.
"""

import unittest

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.services.game_ai_request import _parse_kb_attached_notes  # noqa: E402
from backend.services.knowledge_base_service import (  # noqa: E402
    _COMPAT_GAME_TITLE,
    close_connection,
    retrieve_knowledge_context,
)
# The module, not its test class: a class imported by name here would run all of its tests twice.
import test_knowledge_base_service as kb_service_tests  # noqa: E402

SEED_DB = kb_service_tests.SEED_DB


def _settings(corpus_dir=None):
    return {
        "use_local_knowledge_base": True,
        "rag_corpus_path": str(corpus_dir or SEED_DB.parent),
    }


class OwnGameTipLabelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        kb_service_tests._ensure_seed_db()
        if not SEED_DB.is_file():
            raise unittest.SkipTest("seed corpus build failed")

    def tearDown(self):
        close_connection(str(SEED_DB))

    def _drg_blurry_text(self, corpus_dir=None):
        return retrieve_knowledge_context(
            _settings(corpus_dir),
            ask_mode="speed",
            question="the text in this game looks blurry on my deck, how do i fix it",
            app_id="2321470",
            app_name="Deep Rock Galactic: Survivor",
            domain="strategy",
            pc_ip="",
        )

    def test_a_games_own_tip_is_credited_under_that_game(self):
        result = self._drg_blurry_text()
        self.assertTrue(result.attached)
        self.assertIn("Render Scale", result.text_block)
        titles = [s["title"] for s in result.sources]
        self.assertIn("Deep Rock Galactic: Survivor — display", titles)
        self.assertNotIn(f"{_COMPAT_GAME_TITLE} — display", titles)

    def test_the_parsed_note_carries_its_game_and_keeps_its_source_page(self):
        """The notes block reads `game_title` to tell a game's own tip from a shared one, and
        the tip's source page must still be found now its credit title names the game."""
        result = self._drg_blurry_text()
        notes = _parse_kb_attached_notes(
            result.text_block, kb_domain="compat", sources=result.sources
        )
        own = [n for n in notes if n["name"] == "display"]
        self.assertEqual(len(own), 1)
        self.assertEqual(own[0]["game_title"], "Deep Rock Galactic: Survivor")
        self.assertEqual(own[0]["source_host"], "steamcommunity.com")

    def test_a_shared_tip_is_still_labelled_shared(self):
        result = retrieve_knowledge_context(
            _settings(),
            ask_mode="speed",
            question="my game keeps crashing right after launch on my deck",
            app_id="377160",
            app_name="Fallout 4",
            domain="compat",
            pc_ip="",
        )
        self.assertTrue(result.attached)
        titles = [s["title"] for s in result.sources]
        self.assertEqual(titles, [f"{_COMPAT_GAME_TITLE} — crash"])
        notes = _parse_kb_attached_notes(
            result.text_block, kb_domain="compat", sources=result.sources
        )
        self.assertEqual([n["game_title"] for n in notes], [""])

    def test_a_library_from_before_per_game_tips_keeps_the_shared_label(self):
        """No ``app_id`` column at all: nothing to look up, and nothing must raise."""
        helper = kb_service_tests.KnowledgeBaseServiceTests("test_should_retrieve_strategy_when_enabled")
        with helper._old_library_without_app_id_column() as old_dir:
            result = retrieve_knowledge_context(
                _settings(old_dir),
                ask_mode="speed",
                question="my game keeps crashing right after launch on my deck",
                app_id="377160",
                app_name="Fallout 4",
                domain="compat",
                pc_ip="",
            )
            self.assertTrue(result.attached)
            for source in result.sources:
                self.assertTrue(source["title"].startswith(f"{_COMPAT_GAME_TITLE} — "))


if __name__ == "__main__":
    unittest.main()
