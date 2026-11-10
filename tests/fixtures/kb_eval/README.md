# Test questions, one file per writer

The search test's 936 older questions sit in `tests/fixtures/kb_eval_v2.json` and stay there. A new batch of
questions goes in its own file in this folder, so two writers never change the same file. Every reader (the
search test, the two measuring scripts and the tests) reads the main file first and then every `*.json` file
here in name order, through `scripts/lib/kb_eval_fixture.py`.

## The shape of a file

An object with a `queries` list. It may also carry `description`, `version`, `status` and `default_split`
(a row with no `split` takes the file's `default_split`, else `tune`). Nothing else at the top.

```json
{
  "description": "Mario Kart 64 questions, written blind from the note names only, 2026-11-10.",
  "default_split": "holdout",
  "queries": [
    {
      "id": "V2-P103-MK64-01",
      "split": "holdout",
      "domain": "strategy",
      "app_id": "",
      "shortcut": "Mario Kart 64",
      "query": "mk64 toads turnpike trafic",
      "intent": "Get through the traffic.",
      "topic_hint": "",
      "withheld_card_terms": [],
      "skill_level": "familiar",
      "input_style": "terse",
      "note": "Written blind from the note's name only",
      "expect_section": "Traffic (Toad's Turnpike)"
    }
  ]
}
```

A row needs `id`, `domain` and `query`. The other keys a row may use are exactly the ones the main file's rows
use (`app_id`, `shortcut`, `split`, `intent`, `topic_hint`, `withheld_card_terms`, `skill_level`, `input_style`,
`expect_section`, `expect_topic`, `expect_pattern_id`, `note`, `ask_mode`, `gate_style`, `meaning_only`,
`needs_clarification`). A key it does not know (a typo for `expect_section`, say) stops the load.

## What stops the load

- An id used twice, in this folder or against the main file. The message names both files.
- An unknown key, at the top of the file or in a row.
- A row missing `id`, `domain` or `query`; a `split` or `default_split` that is not `tune` or `holdout`.
- A file that is not an object with a `queries` list.

## The rules that still hold

- One file per writer (per game for a note's questions), named after what it holds, for example
  `mario-kart-64.json`. Ids start `V2-P103-` and a short game name, so they never meet an older id.
- `expect_section` names a note that exists, spelt exactly as the note's name. A list of two names needs a
  `note` saying why both are right.
- A `holdout` row is written blind: whoever wrote the note never writes its question, and whoever writes a
  question never reads the note. A row written with the note in view is `tune`.
- A file ending `.sources.json` is skipped (it is not a question file). Other files here are ignored unless
  they end `.json`.
- Tip (compat) rows: the exact lists of missed rows in `tests/test_compat_topic_router.py` name the older rows
  only. A new file's tip rows are held to a rule instead (`NewFileTipRowsRuleTests` in that test): a row that
  names `expect_pattern_id` names a tip that exists, with that tip's own topic as `expect_topic`; a row that
  names only `expect_topic` names a topic the router knows. A tip row the router does not reach is allowed
  (the floor script reports it); a strategy row that reaches the tips is not. Never add a new row to the lists.
