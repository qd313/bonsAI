"""Title: Read every search-test question, from the main file and from the question folder

Purpose: The search test's questions used to live in one file (tests/fixtures/kb_eval_v2.json), so two
    people adding questions at once changed the same end of the same file. This reads that file and then
    every *.json file in the folder tests/fixtures/kb_eval/ (in name order) and hands back one list of
    questions, so a question in a new file counts everywhere the main file's questions count. A file in
    the folder is an object with a `queries` list and, if it likes, `description`, `version`, `status`
    and `default_split`; its rows use the same fields as the main file's. It stops, with a sentence that
    names the file, on an id that appears twice (and says where each one is), a key it does not know, a
    row missing `id`, `query` or `domain`, a `split` that is neither tune nor holdout, and a file that is
    not an object with a `queries` list.
Used for: scripts/kb/eval_kb_embed_models.py, scripts/measure_kb_thin_match.py,
    scripts/measure_kb_floor_holdout.py and the tests that read the questions (test_eval_kb_arms,
    test_compat_topic_router, test_compat_patterns_plain_words, test_asked_entity_extraction,
    test_kb_game_tip_meaning, test_knowledge_base_service, test_kb_eval_fixture). Tests load it with
    `load_script("kb_eval_fixture")`; the scripts import it by name once scripts/lib is on their path.
Solves: Four question writers working at the same time on one file, and a reader that quietly leaves out a
    question because it opened only the main file.
Does not: Change the main file, score anything, or touch the library. The back end never imports it (it is
    for the scripts and the tests). A file ending in `.sources.json` is a note of where rows came from, not
    questions, and is skipped, the way the library builder skips it.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

MAIN_FIXTURE_NAME = "kb_eval_v2.json"
FOLDER_NAME = "kb_eval"
SOURCES_SUFFIX = ".sources.json"

SPLITS = ("tune", "holdout")
STATUSES = ("awaiting_maintainer_signoff", "approved_for_rebuild_and_bakeoff")

# What a file may carry at its top level.
FILE_KEYS = frozenset({"queries", "description", "version", "status", "default_split"})
# What a row in a folder file may carry: every field any row of the main file carries today.
ROW_KEYS = frozenset({
    "id", "split", "domain", "app_id", "shortcut", "query", "intent", "topic_hint",
    "withheld_card_terms", "skill_level", "input_style", "expect_section", "note", "ask_mode",
    "expect_topic", "gate_style", "meaning_only", "expect_pattern_id", "needs_clarification",
})
REQUIRED_ROW_KEYS = ("id", "domain", "query")


class EvalFixtureError(ValueError):
    """A question file cannot be read. The text is a full sentence that names the file."""


def default_fixtures_dir() -> Path:
    """tests/fixtures of the repo this file belongs to (two levels above scripts/lib)."""
    return Path(__file__).resolve().parents[2] / "tests" / "fixtures"


def question_files(fixtures_dir: Path | None = None) -> list[Path]:
    """The main file, then every *.json file in the question folder in name order (a missing folder adds none)."""
    base = fixtures_dir or default_fixtures_dir()
    folder = base / FOLDER_NAME
    extra = []
    if folder.is_dir():
        extra = sorted(p for p in folder.glob("*.json") if p.is_file() and not p.name.endswith(SOURCES_SUFFIX))
    return [base / MAIN_FIXTURE_NAME, *extra]


def _read_object(path: Path, label: str) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise EvalFixtureError(f"{label}: this is not valid JSON ({exc}).") from exc
    if not isinstance(data, dict) or not isinstance(data.get("queries"), list):
        raise EvalFixtureError(f"{label}: a question file is an object with a `queries` list.")
    return data


def _check_file_level(data: dict[str, Any], label: str) -> None:
    unknown = sorted(set(data) - FILE_KEYS)
    if unknown:
        raise EvalFixtureError(
            f"{label}: unknown key {', '.join(repr(k) for k in unknown)} at the top of the file "
            f"(it may hold only {', '.join(sorted(FILE_KEYS))})."
        )
    split = data.get("default_split")
    if split is not None and split not in SPLITS:
        raise EvalFixtureError(f"{label}: default_split is {split!r}; it must be 'tune' or 'holdout'.")
    status = data.get("status")
    if status is not None and status not in STATUSES:
        raise EvalFixtureError(f"{label}: status is {status!r}; it must be one of {', '.join(STATUSES)}.")


def _check_row(row: Any, label: str, position: int) -> None:
    if not isinstance(row, dict):
        raise EvalFixtureError(f"{label}: row {position + 1} is not an object.")
    missing = [k for k in REQUIRED_ROW_KEYS if not str(row.get(k) or "").strip()]
    if missing:
        raise EvalFixtureError(
            f"{label}: row {position + 1} ({row.get('id') or 'no id'}) is missing {', '.join(missing)}."
        )
    unknown = sorted(set(row) - ROW_KEYS)
    if unknown:
        raise EvalFixtureError(
            f"{label}: row {row['id']} has an unknown key {', '.join(repr(k) for k in unknown)}."
        )
    if "split" in row and row["split"] not in SPLITS:
        raise EvalFixtureError(f"{label}: row {row['id']} has split {row['split']!r}; it must be 'tune' or 'holdout'.")


def load_eval_fixture(fixtures_dir: Path | None = None) -> dict[str, Any]:
    """Every question, as one object shaped like the main file.

    The top-level fields are the main file's (`version`, `description`, `status`, `default_split`);
    `queries` is the main file's rows followed by each folder file's rows in name order. A folder
    row with no `split` gets its own file's `default_split` (else the main file's, else tune) written
    in, so a reader that applies only the main file's default still sees the right one. Two extra keys:
    `origins` maps every id to the file it came from, and `files` lists each file with its row count
    and its effective status and default split.
    """
    base = fixtures_dir or default_fixtures_dir()
    paths = question_files(base)
    main = _read_object(paths[0], MAIN_FIXTURE_NAME)
    _check_file_level(main, MAIN_FIXTURE_NAME)
    main_split = main.get("default_split") if main.get("default_split") in SPLITS else "tune"
    merged: dict[str, Any] = {k: v for k, v in main.items() if k != "queries"}
    queries: list[dict[str, Any]] = []
    origins: dict[str, str] = {}
    files: list[dict[str, Any]] = []

    def take(rows: list[Any], label: str, default_split: str, resolve_split: bool) -> None:
        for position, row in enumerate(rows):
            if resolve_split:
                _check_row(row, label, position)
                row = dict(row) if "split" in row else {**row, "split": default_split}
            elif not isinstance(row, dict) or "id" not in row:
                raise EvalFixtureError(f"{label}: row {position + 1} has no id.")
            first = origins.get(str(row["id"]))
            if first is not None:
                raise EvalFixtureError(
                    f"{label}: the id {row['id']} is used twice, in {first} and in {label}. Give one of them a new id."
                )
            origins[str(row["id"])] = label
            queries.append(row)

    take(main["queries"], MAIN_FIXTURE_NAME, main_split, resolve_split=False)
    files.append({"file": MAIN_FIXTURE_NAME, "rows": len(main["queries"]),
                  "status": main.get("status"), "default_split": main_split})
    for path in paths[1:]:
        label = f"{FOLDER_NAME}/{path.name}"
        data = _read_object(path, label)
        _check_file_level(data, label)
        own_split = data.get("default_split") or main_split
        take(data["queries"], label, own_split, resolve_split=True)
        files.append({"file": label, "rows": len(data["queries"]),
                      "status": data.get("status") or main.get("status"), "default_split": own_split})
    merged.update(queries=queries, origins=origins, files=files)
    return merged
