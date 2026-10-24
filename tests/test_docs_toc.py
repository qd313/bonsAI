"""The contents-list writer must build links that match GitHub's heading anchors and must
leave a document's opening lines where they are."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import docs_toc  # noqa: E402


DOC = """# Title

Opening text stays first.

## Getting started

### Install `ollama` (on the Deck)

## Steps

```bash
## not a heading
```

## Steps

#### Too deep to list
"""


class DocsTocTests(unittest.TestCase):
    def test_slug_matches_github(self):
        self.assertEqual(docs_toc.slug("Install `ollama` (on the Deck)"), "install-ollama-on-the-deck")
        self.assertEqual(docs_toc.slug("**Bold** and [a link](x.md)"), "bold-and-a-link")
        self.assertEqual(docs_toc.slug("Plan 74, the second wave (2026-09-28)"), "plan-74-the-second-wave-2026-09-28")
        self.assertEqual(docs_toc.slug("Which model does which work"), "which-model-does-which-work")

    def test_list_goes_before_first_section(self):
        out = docs_toc.apply_toc(DOC)
        self.assertTrue(out.startswith("# Title\n\nOpening text stays first.\n\n" + docs_toc.TOC_START))
        self.assertIn("- [Getting started](#getting-started)", out)
        self.assertIn("  - [Install `ollama` (on the Deck)](#install-ollama-on-the-deck)", out)

    def test_repeated_heading_and_code_block(self):
        out = docs_toc.apply_toc(DOC)
        self.assertIn("- [Steps](#steps)", out)
        self.assertIn("- [Steps](#steps-1)", out)
        self.assertNotIn("not a heading](", out)
        self.assertNotIn("Too deep", out.split(docs_toc.TOC_END)[0])

    def test_rewrite_is_stable_and_follows_renames(self):
        once = docs_toc.apply_toc(DOC)
        self.assertEqual(docs_toc.apply_toc(once), once)
        renamed = once.replace("## Getting started", "## First steps")
        again = docs_toc.apply_toc(renamed)
        self.assertIn("- [First steps](#first-steps)", again)
        self.assertNotIn("#getting-started", again)
        self.assertEqual(again.count(docs_toc.TOC_START), 1)

    def test_heading_with_no_letters_is_left_out(self):
        out = docs_toc.apply_toc("# Map\n\n## .\n\n## src\n")
        self.assertNotIn("](#)", out)
        self.assertIn("- [src](#src)", out)

    def test_document_without_sections_is_untouched(self):
        self.assertEqual(docs_toc.apply_toc("# Only a title\n\nText.\n"), "# Only a title\n\nText.\n")

    def test_every_listed_doc_exists(self):
        for rel in docs_toc.DOCS:
            self.assertTrue((ROOT / rel).exists(), rel)


if __name__ == "__main__":
    unittest.main()
