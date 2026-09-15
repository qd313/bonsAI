"""Title: Ask hook order contract

Purpose: Make sure splitting the Ask code never changes the order its hooks run in.
Used for: Phase 4 of the round-two refactor, which keeps lifting blocks out of the Ask
          hook into hooks of their own.
Solves: React matches hooks by the position they run in, not by name. Lifting a block into
        a hook of its own is safe only when the new hook is called from exactly the spot
        the block occupied. Get that wrong and state lands in the wrong place, which shows
        up as a wrong value on screen rather than as an error anywhere.
Does not: Check what any of them do. Only the order, and what each one feeds.

The recorded order is tests/contracts/ask-hook-order.json. Adding a hook, removing one, or
moving one changes that file -- which is fine when it is meant, and the point when it is
not. Update it in the same commit and say why in the commit message.
"""

import json
import re
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
CONTRACT = REPO / "tests/contracts/ask-hook-order.json"
MAIN = "src/hooks/useBonsaiAskOrchestration.ts"
MAIN_FN = "export function useBonsaiAskOrchestration("

# The type argument between the hook name and the bracket -- useRef<string | undefined>( --
# has to be allowed for. A first version of this pattern required the bracket to follow the
# name directly and silently skipped every hook written with one, which was most of them.
HOOK = re.compile(
    r"(?:const\s+(\[[^\]]*\]|\{[^}]*\}|\w+)\s*=\s*)?"
    r"\b(use[A-Z]\w*)\s*(?:<[^()]*?>)?\s*\(",
    re.S,
)


def hook_sequence(text: str, start_marker: str) -> list[str]:
    """Every hook call after the marker, in order, as "what it feeds:which hook".

    What it feeds matters as much as which hook it is: swapping two ``useRef`` calls leaves
    the list of hook names identical while changing which one holds which value.
    """
    if start_marker not in text:
        raise AssertionError(f"could not find {start_marker!r}")
    body = text.split(start_marker, 1)[1]
    out = []
    for m in HOOK.finditer(body):
        target = " ".join((m.group(1) or "(not assigned)").split())
        out.append(f"{target}:{m.group(2)}")
    return out


def flattened_order() -> list[str]:
    """The Ask hook's hooks, with each extracted sub-hook spliced in where it is called."""
    contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
    sequence = hook_sequence((REPO / MAIN).read_text(encoding="utf-8"), MAIN_FN)
    for sub in contract["extracted_sub_hooks"]:
        name, path = sub["name"], sub["file"]
        positions = [i for i, e in enumerate(sequence) if e.endswith(f":{name}")]
        if not positions:
            raise AssertionError(f"{name} is listed as extracted but the Ask hook never calls it")
        if len(positions) > 1:
            raise AssertionError(f"{name} is called {len(positions)} times; expected once")
        inner = hook_sequence(
            (REPO / path).read_text(encoding="utf-8"), f"export function {name}("
        )
        at = positions[0]
        sequence = sequence[:at] + inner + sequence[at + 1 :]
    return sequence


class AskHookOrderTests(unittest.TestCase):
    def test_the_order_matches_what_was_recorded(self):
        recorded = json.loads(CONTRACT.read_text(encoding="utf-8"))["order"]
        actual = flattened_order()
        if actual == recorded:
            return
        first = next(
            (i for i, (a, b) in enumerate(zip(recorded, actual)) if a != b),
            min(len(recorded), len(actual)),
        )
        low = max(0, first - 2)
        self.fail(
            "the order the Ask hook's hooks run in has changed.\n"
            f"  recorded: {len(recorded)} hooks, now: {len(actual)}\n"
            f"  first difference at position {first}:\n"
            f"    recorded: {recorded[low:first + 3]}\n"
            f"    now:      {actual[low:first + 3]}\n"
            "If the change was meant, update tests/contracts/ask-hook-order.json in the "
            "same commit and say why."
        )

    def test_every_extracted_sub_hook_still_exists(self):
        contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
        for sub in contract["extracted_sub_hooks"]:
            with self.subTest(sub=sub["name"]):
                path = REPO / sub["file"]
                self.assertTrue(path.exists(), f"{sub['file']} is gone")
                self.assertIn(f"export function {sub['name']}(", path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
