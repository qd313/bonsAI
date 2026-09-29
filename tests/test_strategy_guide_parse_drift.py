"""Title: Follow-up choices the model wrote in a slightly different shape

Purpose: Pin that the choice-menu reader accepts the shapes a model writes when it drifts from
the exact example in the prompt, so long as the meaning is unambiguous: options given as plain
strings, as an id-to-label object, or with "text"/"title" instead of "label"; the question under
"prompt"; single-quoted or newline-broken text. Anything ambiguous or unusable (one
option, nothing that reads as a label, the example's own dots) is still refused.
Used for: strategy_guide_parse.extract_strategy_guide_branches.
Solves: The plugin log warned twice on troubleshooting turns that a Strategy answer's follow-up
choices were "present but did NOT parse", so no choice menu showed (plan 70, flow L7).
Does not: Read a real model transcript -- the two logged snippets were not kept, so the shapes are
the ones models are known to write; see the roadmap entry.
"""

import unittest

from backend.services.strategy_guide_parse import extract_strategy_guide_branches


def _branches(payload: str):
    raw = "Some coaching first.\n\n```bonsai-strategy-branches\n" + payload + "\n```\n"
    visible, branches = extract_strategy_guide_branches(raw)
    return visible, branches


def _labels(branches) -> list[str]:
    return [o["label"] for o in branches["options"]]


class DriftedChoiceShapesTests(unittest.TestCase):
    def test_options_written_as_plain_strings(self):
        visible, b = _branches('{"question":"What is wrong?","options":["Display looks blurry","No sound"]}')
        self.assertIsNotNone(b)
        self.assertEqual(_labels(b), ["Display looks blurry", "No sound"])
        self.assertEqual([o["id"] for o in b["options"]], ["a", "b"])
        self.assertNotIn("bonsai-strategy-branches", visible)

    def test_options_written_as_an_id_to_label_object(self):
        _v, b = _branches('{"question":"What is wrong?","options":{"a":"Display","b":"Sound"}}')
        self.assertEqual(_labels(b), ["Display", "Sound"])
        self.assertEqual([o["id"] for o in b["options"]], ["a", "b"])

    def test_options_using_text_or_title_instead_of_label(self):
        _v, b = _branches(
            '{"question":"What is wrong?","options":[{"id":"a","text":"Display"},{"key":"x","title":"Sound"}]}'
        )
        self.assertEqual(_labels(b), ["Display", "Sound"])
        self.assertEqual([o["id"] for o in b["options"]], ["a", "x"])

    def test_question_written_under_prompt(self):
        _v, b = _branches('{"prompt":"What is wrong?","options":[{"label":"Display"},{"label":"Sound"}]}')
        self.assertEqual(b["question"], "What is wrong?")

    def test_single_quoted_object(self):
        _v, b = _branches("{'question': 'What is wrong?', 'options': [{'id': 'a', 'label': 'Display'}, {'id': 'b', 'label': 'Sound'}]}")
        self.assertIsNotNone(b)
        self.assertEqual(_labels(b), ["Display", "Sound"])

    def test_a_raw_newline_inside_a_string(self):
        _v, b = _branches('{"question":"What is\nwrong?","options":[{"id":"a","label":"Display"},{"id":"b","label":"Sound"}]}')
        self.assertIsNotNone(b)
        self.assertEqual(_labels(b), ["Display", "Sound"])

    def test_still_refused_when_unusable_or_ambiguous(self):
        for payload in (
            '{"question":"What is wrong?","options":["Only one"]}',
            '{"question":"What is wrong?","options":[{"id":"a"},{"id":"b"}]}',
            '{"question":"What is wrong?","options":["…","…"]}',
            '{"question":"What is wrong?","options":"Display or sound"}',
            '{"question":"What is wrong?","options":{"a":{"x":1},"b":{"y":2}}}',
            '{"options":["Display","Sound"]}',
        ):
            with self.subTest(payload=payload):
                visible, b = _branches(payload)
                self.assertIsNone(b)
                self.assertIn("bonsai-strategy-branches", visible)


if __name__ == "__main__":
    unittest.main()
