"""Title: The starter model is the same tag on the screen, in the back end and in the setup script

Purpose: The first model a new Deck downloads is named in several places that no code links:
the screen's `TIER1_ESSENTIALS_TAG` (src/data/deckEssentialsTags.ts, which the starter-set box and the
"Install the starter set" button read), the back end's `TIER1_ESSENTIALS_PULL_TAGS` (what the setup run
really pulls), the two shipped try-order seeds (the TypeScript copy in
src/utils/modelRoutingOrder.ts and the Python one in ollama_routing.py, which must agree and list it), and the model list in
scripts/setup-ollama.sh. This fails if any of them is changed alone.
Used for: keeping the starter model one choice (the maintainer's call 2026-10-13: gemma4:e2b-it-qat).
Does not: Check the speech models or the note-search model; test_starter_set_extras.py does.
"""

from __future__ import annotations

import re
import unittest
from pathlib import Path

from backend.ollama.ollama_routing import (
    TIER1_ESSENTIALS_PULL_TAGS,
    default_text_routing_seed,
    default_vision_routing_seed,
    no_installed_routing_models_message,
)
from src_paths import find_src_file

ROOT = Path(__file__).resolve().parent.parent
STARTER = "gemma4:e2b-it-qat"


def _screen_starter_tag() -> str:
    text = find_src_file("deckEssentialsTags.ts").read_text(encoding="utf-8")
    match = re.search(r'export const TIER1_ESSENTIALS_TAG = "([^"]+)"', text)
    assert match, "TIER1_ESSENTIALS_TAG not found in deckEssentialsTags.ts"
    return match.group(1)


def _screen_seed_first(name: str) -> str:
    text = find_src_file("modelRoutingOrder.ts").read_text(encoding="utf-8")
    match = re.search(rf"const {name}: readonly string\[\] = \[\s*\"([^\"]+)\"", text)
    assert match, f"{name} not found in modelRoutingOrder.ts"
    return match.group(1)


class TestStarterTagParity(unittest.TestCase):
    def test_screen_tag_is_the_starter(self):
        self.assertEqual(_screen_starter_tag(), STARTER)

    def test_back_end_pull_tag_matches_the_screen(self):
        self.assertEqual(TIER1_ESSENTIALS_PULL_TAGS[0], _screen_starter_tag())

    def test_try_order_seeds_start_with_the_starter_on_both_sides(self):
        # The seeds only order models already installed ("Automatic", a fresh install), for text and for
        # pictures (Gemma 4 reads both). They are the same list in Python and on the screen.
        self.assertEqual(default_text_routing_seed()[0], STARTER)
        self.assertEqual(default_vision_routing_seed()[0], STARTER)
        self.assertEqual(_screen_seed_first("DEFAULT_TEXT_ROUTING_SEED"), STARTER)
        self.assertEqual(_screen_seed_first("DEFAULT_VISION_ROUTING_SEED"), STARTER)

    def test_the_two_seeds_list_the_same_models_in_the_same_order(self):
        text = find_src_file("modelRoutingOrder.ts").read_text(encoding="utf-8")
        for name, py_seed in (
            ("DEFAULT_TEXT_ROUTING_SEED", default_text_routing_seed()),
            ("DEFAULT_VISION_ROUTING_SEED", default_vision_routing_seed()),
        ):
            body = re.search(rf"const {name}: readonly string\[\] = \[([^\]]*)\]", text).group(1)
            screen = re.findall(r'"([^"]+)"', body)
            # The Python chain sorts older picks (llava, gemma3) to the end; the screen list keeps source order.
            self.assertEqual(sorted(screen), sorted(py_seed), name)
            self.assertEqual(screen[:3], py_seed[:3], name)

    def test_setup_script_pulls_the_starter(self):
        script = (ROOT / "scripts" / "setup-ollama.sh").read_text(encoding="utf-8")
        match = re.search(r"^MODELS=\(([^)]*)\)", script, re.MULTILINE)
        self.assertIsNotNone(match, "MODELS=(...) not found in setup-ollama.sh")
        self.assertIn(STARTER, match.group(1))
        self.assertNotIn("qwen2.5vl", script)

    def test_the_no_model_message_sends_a_person_to_the_starter(self):
        msg = no_installed_routing_models_message([], False)
        self.assertIn(STARTER, msg)
        self.assertNotIn("qwen2.5vl", msg)


if __name__ == "__main__":
    unittest.main()
