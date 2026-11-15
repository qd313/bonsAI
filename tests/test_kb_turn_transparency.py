"""Plan 104 lane H1: the piece moved out of game_ai_request.py keeps doing what it did there.

``record_kb_turn_facts`` builds the turn's notes facts after the notes met the context budget. The
wiring tests in test_game_ai_request_kb_attached_notes.py (the app-activity log) and
test_kb_choice_log_line.py already run it through the real ask path; these pin its own contract.
"""

import asyncio
import types
import unittest

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.ask.kb_turn_transparency import record_kb_turn_facts  # noqa: E402
from backend.knowledge.knowledge_base_service import KnowledgeRetrievalResult  # noqa: E402

_EMPTY = {"kb_attached": False, "kb_notes": "", "kb_sources": []}


class _Plugin:
    def __init__(self):
        self.app_logs: list[dict] = []

    async def _maybe_app_log(self, category, message, *, level="default", fields=None):
        self.app_logs.append({"category": category, "level": level, "fields": fields or {}})


def _record(plugin, result, stacked_attached, **kw):
    stacked = types.SimpleNamespace(knowledge_attached=stacked_attached)
    return asyncio.run(
        record_kb_turn_facts(
            plugin, result, stacked, kb_transparency=_EMPTY, kb_domain="strategy", app_name="Hades", **kw
        )
    )


def _found(**overrides) -> KnowledgeRetrievalResult:
    base = dict(
        attached=True, text_block="x", trust_tier="wiki_verified",
        sources=[{"title": "Hades / boss: Megaera", "url": ""}], notes="app_id:1145360",
    )
    base.update(overrides)
    return KnowledgeRetrievalResult(**base)


class RecordKbTurnFactsTests(unittest.TestCase):
    def test_with_no_search_result_the_facts_come_back_as_they_were_and_nothing_is_logged(self):
        plugin = _Plugin()
        facts, survived = _record(plugin, None, False)
        self.assertIs(facts, _EMPTY)
        self.assertFalse(survived)
        self.assertEqual(plugin.app_logs, [])

    def test_notes_that_survived_the_budget_are_recorded_as_attached_with_their_sources(self):
        plugin = _Plugin()
        facts, survived = _record(plugin, _found(), True)
        self.assertTrue(survived)
        self.assertTrue(facts["kb_attached"])
        self.assertEqual(facts["kb_trust_tier"], "wiki_verified")
        self.assertEqual([s["title"] for s in facts["kb_sources"]], ["Hades / boss: Megaera"])

    def test_notes_cut_by_the_budget_are_not_recorded_as_attached_and_say_why(self):
        plugin = _Plugin()
        facts, survived = _record(plugin, _found(), False)
        self.assertFalse(survived)
        self.assertFalse(facts["kb_attached"])
        self.assertEqual(facts["kb_sources"], [])
        self.assertEqual(facts["kb_notes"], "dropped_by_context_budget")

    def test_one_verbose_app_log_line_is_written_when_the_plugin_has_the_logger(self):
        plugin = _Plugin()
        _record(plugin, _found(), True)
        self.assertEqual([(e["category"], e["level"]) for e in plugin.app_logs], [("ask.kb_search", "verbose")])

    def test_a_plugin_without_the_app_log_is_fine(self):
        facts, survived = _record(object(), _found(), True)
        self.assertTrue(survived)
        self.assertTrue(facts["kb_attached"])


if __name__ == "__main__":
    unittest.main()
