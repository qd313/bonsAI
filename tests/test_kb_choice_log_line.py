"""The plugin's own log names the notes and tips a question chose (plan 74 lane 5).

Found on the Deck in plan 70, flow R: a routing problem could not be traced from the plugin log,
because nothing in it said which notes or tips a question attached. The app-activity log line
(`_kb_search_log_fields`) does, but it is off by default. This line is always on, one per
question, and never carries the question's own words.
"""

import asyncio
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.services import kb_followup_memory  # noqa: E402
from backend.services.game_ai_request import run_game_ai_request  # noqa: E402
from backend.services.kb_attached_notes import kb_choice_log_line  # noqa: E402
from backend.services.knowledge_base_cards import _omitted_note  # noqa: E402
from backend.services.knowledge_base_chips import StackedContext  # noqa: E402
from backend.services.knowledge_base_service import (  # noqa: E402
    KbCoverageSummary,
    KnowledgeRetrievalResult,
)


def _two_notes(text_block: str = "notes") -> KnowledgeRetrievalResult:
    return KnowledgeRetrievalResult(
        attached=True,
        text_block=text_block,
        sources=[
            {"title": "Hollow Knight — Broken Vessel"},
            {"title": "Hollow Knight — Ancient Basin"},
        ],
        notes="app_id:367520",
        retrieval_method="hybrid",
    )


class KbChoiceLogLineTests(unittest.TestCase):
    def test_names_every_attached_note(self):
        line = kb_choice_log_line(
            _two_notes(), kb_domain="strategy", kb_survived=True, starved=False
        )
        self.assertIn("domain=strategy", line)
        self.assertIn("attached=2", line)
        self.assertIn("Hollow Knight — Broken Vessel; Hollow Knight — Ancient Basin", line)
        self.assertIn("dropped_for_room=0", line)
        self.assertIn("route=app_id:367520", line)

    def test_names_a_tip_on_a_tip_turn(self):
        tip = KnowledgeRetrievalResult(
            attached=True,
            text_block="tip",
            sources=[{"title": "Troubleshooting — display"}],
            notes="compat_tips",
        )
        line = kb_choice_log_line(tip, kb_domain="compat", kb_survived=True, starved=False)
        self.assertIn("domain=compat", line)
        self.assertIn("attached=1 [Troubleshooting — display]", line)

    def test_says_when_the_whole_block_was_cut_for_room_and_names_what_was_lost(self):
        line = kb_choice_log_line(
            _two_notes(), kb_domain="strategy", kb_survived=False, starved=True
        )
        self.assertIn("attached=0", line)
        self.assertIn(
            "dropped_for_room=all 2 [Hollow Knight — Broken Vessel; Hollow Knight — Ancient Basin]",
            line,
        )

    def test_counts_cards_the_search_itself_cut_to_fit(self):
        block = "--- header ---\n[Note: Broken Vessel]\n..." + _omitted_note(3)
        line = kb_choice_log_line(
            _two_notes(block), kb_domain="strategy", kb_survived=True, starved=False
        )
        self.assertIn("attached=2", line)
        self.assertIn("dropped_for_room=3 more", line)

    def test_nothing_found_says_why(self):
        empty = KnowledgeRetrievalResult(attached=False, notes="no_hit (app_id:570)")
        line = kb_choice_log_line(empty, kb_domain="strategy", kb_survived=False, starved=False)
        self.assertIn("attached=0", line)
        self.assertIn("route=no_hit (app_id:570)", line)
        self.assertIn("dropped_for_room=0", line)

    def test_no_search_at_all_says_so(self):
        line = kb_choice_log_line(None, kb_domain="", kb_survived=False, starved=False)
        self.assertIn("not searched", line)

    def test_is_one_line(self):
        line = kb_choice_log_line(
            _two_notes(), kb_domain="strategy", kb_survived=True, starved=False
        )
        self.assertNotIn("\n", line)


class _FakePlugin:
    DEFAULT_REQUEST_TIMEOUT_SECONDS = 45

    def __init__(self):
        self._settings = {
            "latency_timeouts_custom_enabled": False,
            "input_sanitizer_user_disabled": False,
            "capabilities": {},
            "use_local_knowledge_base": True,
        }

    async def load_settings(self):
        return self._settings

    async def _try_handle_sanitizer_keyword_command(self, question, app_id):
        return None

    async def ask_ollama(self, *args, **kwargs):
        return {"success": True, "response": "Stay mobile.", "model": "m"}

    async def _persist_input_transparency(self, payload):
        pass


_QUESTION = "zqxv secret words how do i beat the broken vessel"


class KbChoiceLogLineWiringTests(unittest.TestCase):
    def _kb_lines(self, *, stacked=None) -> list[str]:
        patches = [
            patch(
                "backend.services.game_ai_request.summarize_kb_coverage",
                return_value=KbCoverageSummary(status="sections", section_count=4),
            ),
            patch(
                "backend.services.game_ai_request.retrieve_knowledge_context",
                return_value=_two_notes("--- block ---\n[Note: Broken Vessel]\nx"),
            ),
        ]
        if stacked is not None:
            patches.append(
                patch(
                    "backend.services.game_ai_request.stack_context_blocks",
                    return_value=stacked,
                )
            )
        kb_followup_memory.forget()
        try:
            with patch("backend.services.game_ai_request.logger") as logger:
                for p in patches:
                    p.start()
                try:
                    asyncio.run(
                        run_game_ai_request(
                            _FakePlugin(),
                            _QUESTION,
                            "127.0.0.1:11434",
                            app_id="367520",
                            app_name="Hollow Knight",
                            ask_mode="strategy",
                        )
                    )
                finally:
                    for p in patches:
                        p.stop()
                all_lines = []
                for call in logger.info.call_args_list:
                    args = call.args
                    all_lines.append(args[0] % args[1:] if len(args) > 1 else str(args[0]))
        finally:
            kb_followup_memory.forget()
        self.assertFalse(
            any("zqxv" in line for line in all_lines), "the question's words reached the log"
        )
        return [line for line in all_lines if line.startswith("kb: question chose")]

    def test_one_line_per_question_naming_the_notes(self):
        lines = self._kb_lines()
        self.assertEqual(len(lines), 1, lines)
        self.assertIn("Hollow Knight — Broken Vessel", lines[0])
        self.assertIn("attached=2", lines[0])

    def test_a_block_cut_for_room_is_named_in_the_line(self):
        lines = self._kb_lines(stacked=StackedContext(text="", knowledge_attached=False))
        self.assertEqual(len(lines), 1, lines)
        self.assertIn("attached=0", lines[0])
        self.assertIn("dropped_for_room=all 2", lines[0])


if __name__ == "__main__":
    unittest.main()
