"""Title: The log says which notes were attached and whether the weak-match line was added

Purpose: Pin the one log line that makes the plugin log and the answer on screen tell the same
story. On the Deck 2026-10-08 the budget line said "attached 1042 chars" while the answer ended
"No close match in my notes" and no notes block showed (docs/test-evidence/
plan83-NOTES-BLOCK-04-game.json). Both were true: real notes were attached (that number is the
notes text, plus any Proton log, not the rules or cards), the match was thin, and the answer used
none of them. The new line names the notes and says which line, if any, was added.
Used for: kb_not_in_notes_notice.kb_attach_log_line and kb_notes_footers.append_kb_notes_footers.
Does not: Test the wording of the two footers themselves (test_kb_not_in_notes_notice.py).
"""

import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.services import kb_notes_footers  # noqa: E402
from backend.services.kb_not_in_notes_notice import kb_attach_log_line  # noqa: E402

# The shape run_game_ai_request builds: kb_transparency from build_knowledge_base_transparency,
# kb_attached_notes from _parse_kb_attached_notes (name, kind, card, domain, ...).
_ATTACHED_THIN = {
    "kb_attached": True,
    "kb_domain": "strategy",
    "kb_best_meaning": 0.58,
    "kb_best_meaning_without_game_name": None,
    "kb_top_card_keyword_score": 0.0,
    "kb_notes": "",
    "kb_unavailable_reason": "",
    "kb_sources": [{"title": "Deep Rock Galactic: Survivor — Upgrades and overclocks"}],
}
_NOTES = [
    {"name": "Upgrades and overclocks", "kind": "mechanic", "domain": "strategy", "card": "x" * 700},
    {"name": "Exploder", "kind": "enemy", "domain": "strategy", "card": "y" * 342},
]
_COVERED = {"kb_coverage_status": "sections"}


class AttachLogLineTests(unittest.TestCase):
    def test_names_the_notes_and_says_the_weak_match_line_was_added(self):
        line = kb_attach_log_line(
            _ATTACHED_THIN, _NOTES, not_in_notes_shown=False, no_close_match_shown=True
        )
        self.assertIn("2 notes attached", line)
        self.assertIn("Upgrades and overclocks", line)
        self.assertIn("Exploder", line)
        self.assertIn("attached chars", line)
        self.assertIn("No close match", line)
        self.assertIn("weak match", line)

    def test_says_no_line_was_added_when_the_match_was_good(self):
        line = kb_attach_log_line(
            _ATTACHED_THIN, _NOTES, not_in_notes_shown=False, no_close_match_shown=False
        )
        self.assertIn("2 notes attached", line)
        self.assertIn("no footer line added", line)

    def test_nothing_attached_says_so_and_names_the_line_added(self):
        line = kb_attach_log_line(
            {**_ATTACHED_THIN, "kb_attached": False, "kb_sources": []},
            [],
            not_in_notes_shown=True,
            no_close_match_shown=False,
        )
        self.assertIn("no notes attached", line)
        self.assertIn("Not in my notes", line)

    def test_a_note_cut_for_room_is_not_called_unattached_by_mistake(self):
        line = kb_attach_log_line(
            {**_ATTACHED_THIN, "kb_attached": False, "kb_notes": "dropped_by_context_budget"},
            [],
            not_in_notes_shown=False,
            no_close_match_shown=False,
        )
        self.assertIn("cut for room", line)


class FootersWriteTheLogLineTests(unittest.TestCase):
    def test_the_footer_step_logs_what_it_decided(self):
        with patch.object(kb_notes_footers, "logger") as fake_logger:
            reply = kb_notes_footers.append_kb_notes_footers(
                "I have no info on horses.",
                ask_mode="strategy",
                kb_transparency=_ATTACHED_THIN,
                kb_coverage_transparency=_COVERED,
                text_resolved_title="",
                question_for_kb_search="in deep rock galactic survivor how do I tame a horse",
                kb_attached_notes=_NOTES,
            )
        self.assertIn("No close match in my notes", reply)
        logged = " ".join(str(c.args[0]) % c.args[1:] if len(c.args) > 1 else str(c.args[0]) for c in fake_logger.info.call_args_list)
        self.assertIn("2 notes attached", logged)
        self.assertIn("No close match", logged)


if __name__ == "__main__":
    unittest.main()
