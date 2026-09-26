"""Replays whole answers through the back end's live path, flush by flush, and checks every
snapshot the screen would be sent.

Plan 70, SPOILER-COVER-01: on the Deck a protected boss name read in plain text for up to 9 s
while an answer streamed. Before fixing, this replay was run to find out whether the back end's
own snapshots ever carried the name uncovered: 0 of 5,333 did (the leak was the screen's reveal
splicing rewritten snapshots -- useSmoothStreamReveal.ts). This keeps that true. The answers are
the ones the Deck saved (HK-MENU, HK-A), rebuilt with the fence the model itself wrote, plus the
other ways a model opens a cover.
"""

import re
import unittest

from backend.services.bonsai_stream_tags import extract_bonsai_status
from backend.services.response_verify import build_live_spoiler_cover
from backend.services.strategy_guide_parse import hide_incomplete_strategy_branch_fence

_NAMES = ("Soul Master", "Soul Tyrant")
_SYSTEM = (
    "Notes:\n[Hollow Knight / boss: Soul Master] Teleports; hit him from below.\n"
    "[Hollow Knight / boss: Soul Tyrant] The return fight.\n"
)
_BRANCH = (
    "```bonsai-strategy-branches\n"
    '{"question": "Are you currently facing the Soul Master boss?", "options": '
    '[{"id": "a", "label": "Yes"}, {"id": "b", "label": "No"}]}\n```'
)

# What the model wrote, as best the saved answers and the 250 ms screen reads show it.
_ANSWERS = {
    # L3 HK-MENU: the first sentence plain (the back end covered it), the second passage in the
    # model's own fence (held back on screen for 1.3 s until its closer came, as measured).
    "HK-MENU": (
        "I'll give you the rundown on how to handle the Soul Master fight at the top of the "
        "Soul Sanctum.\n\nThis fight is all about timing and positioning because he teleports "
        "constantly.\n\nDon't try to heal him constantly; focus on surviving his attacks and "
        "hitting him during those openings.\n\n```bonsai-spoiler\nThe Soul Master teleports "
        "between attacks, and has a ring of four orbs that boomerang back. Hitting him from below "
        "while he conjures orbs is the best opening to deal damage.\n```\n\n" + _BRANCH
    ),
    # L3 HK-A: the named sentence opens the answer, written plain.
    "HK-A": (
        "When fighting the Soul Master, the key is timing your attacks around his movement.\n"
        "He teleports between his various attacks, so you need to be ready to react quickly.\n\n"
        + _BRANCH
    ),
    "own fence first": (
        "```bonsai-spoiler\nWhen fighting the Soul Master, time your attacks.\n```\n"
        "He teleports a lot.\n\n" + _BRANCH
    ),
    "own fence glued to prose": (
        "Here is the plan. ```bonsai-spoiler\nThe Soul Master teleports.\n```\nKeep moving.\n\n"
        + _BRANCH
    ),
    "status tag first": (
        "<bonsai-status>Reading the fight</bonsai-status>The Soul Master teleports. "
        "Keep moving.\n\n" + _BRANCH
    ),
}

_CLOSED_COVER_RE = re.compile(r"```bonsai-spoiler[^\n]*\n.*?\n```", re.S)
_OPEN_COVER_RE = re.compile(r"```bonsai-spoiler[^\n]*\n(.*)$", re.S)


def _snapshot_problems(snapshot: str) -> list[str]:
    problems = []
    outside = _CLOSED_COVER_RE.sub("", snapshot)
    still_open = _OPEN_COVER_RE.search(outside)
    if still_open:
        if still_open.group(1).strip():
            problems.append("an open cover's body was sent")
        outside = outside[: still_open.start()]
    for name in _NAMES:
        if name in outside:
            problems.append(f"{name} outside a closed cover")
    # None of these answers has an ordinary code block, so every marker line must be whole.
    whole_markers = ("```", "```bonsai-spoiler", "```bonsai-strategy-branches")
    for line in snapshot.split("\n"):
        marker = line.strip()
        if marker.startswith("`") and marker not in whole_markers:
            problems.append(f"half a fence marker: {marker!r}")
    return problems


def _live_snapshots(answer: str, step: int):
    """What ollama_chat_stream.py's _publish_partial and ollama_ask_service.py's _on_delta hand
    the screen after each flush of `step` more characters."""
    cover = build_live_spoiler_cover(
        consent=False,
        strategy_domain=True,
        app_name="Hollow Knight",
        question="in hollow knight how do I beat the spell casting boss at the top of the sanctum",
        system_content=_SYSTEM,
    )
    for end in range(step, len(answer) + step, step):
        _status, visible = extract_bonsai_status(answer[:end])
        yield cover.answer(hide_incomplete_strategy_branch_fence(visible), False)
    _status, visible = extract_bonsai_status(answer)
    yield cover.answer(hide_incomplete_strategy_branch_fence(visible), True)


class LiveSpoilerCoverReplayTests(unittest.TestCase):
    def test_no_snapshot_ever_shows_a_protected_name_or_half_a_marker(self):
        checked = 0
        for label, answer in _ANSWERS.items():
            for step in (1, 2, 3, 5, 7):
                for snapshot in _live_snapshots(answer, step):
                    checked += 1
                    with self.subTest(answer=label, step=step, tail=snapshot[-60:]):
                        self.assertEqual(_snapshot_problems(snapshot), [])
        self.assertGreater(checked, 3000)

    def test_the_replay_really_covers_something(self):
        # The guard above is only worth something if the cover is active in this replay.
        finished = list(_live_snapshots(_ANSWERS["HK-A"], 1000))[-1]
        self.assertIn("```bonsai-spoiler\nWhen fighting the Soul Master", finished)

    def test_the_checker_catches_a_name_in_plain_text(self):
        self.assertTrue(_snapshot_problems("When fighting the Soul Master, t"))
        self.assertTrue(_snapshot_problems("Intro.\n```bonsai-spoiler\nThe Soul"))
        self.assertTrue(_snapshot_problems("Intro.\n```bonsa"))


if __name__ == "__main__":
    unittest.main()
