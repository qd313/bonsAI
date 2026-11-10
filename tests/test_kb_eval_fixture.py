"""Title: The question loader (main file plus the question folder)

Purpose: Pin how the search test's questions are read: the main file first, then every *.json file in
    tests/fixtures/kb_eval/ in name order; an id used twice is refused with both files named; an unknown
    key, a missing field or a bad split is refused with the file named; a file's own default split reaches
    its rows. Every case but the first runs in a temporary folder, never in the real fixtures.
Used for: scripts/lib/kb_eval_fixture.py, the one reader the evaluation scripts and the tests share.
Solves: A question written in a new file being quietly left out of a count, or two files giving the same id
    to two different questions so one hides the other.
Does not: Search anything, call the AI model, or check that a label names a real note (test_eval_kb_arms does).
"""

import ast
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from script_loader import load_script

loader = load_script("kb_eval_fixture")


def _row(row_id, **extra):
    return {"id": row_id, "domain": "strategy", "query": f"question {row_id}", **extra}


class QuestionLoaderTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.base = Path(tmp.name)
        self.folder = self.base / "kb_eval"

    def write_main(self, rows, **top):
        body = {"version": "v2", "default_split": "tune", "status": "approved_for_rebuild_and_bakeoff", **top, "queries": rows}
        (self.base / "kb_eval_v2.json").write_text(json.dumps(body), encoding="utf-8")

    def write_folder_file(self, name, body):
        self.folder.mkdir(exist_ok=True)
        (self.folder / name).write_text(body if isinstance(body, str) else json.dumps(body), encoding="utf-8")

    def load(self):
        return loader.load_eval_fixture(self.base)

    def test_the_real_folder_loads_and_adds_to_the_main_file(self):
        data = loader.load_eval_fixture()
        main = json.loads((loader.default_fixtures_dir() / "kb_eval_v2.json").read_text(encoding="utf-8"))
        self.assertGreaterEqual(len(data["queries"]), len(main["queries"]))
        self.assertEqual([q["id"] for q in data["queries"][: len(main["queries"])]], [q["id"] for q in main["queries"]])
        self.assertEqual(sum(f["rows"] for f in data["files"]), len(data["queries"]))

    def test_a_missing_folder_adds_nothing(self):
        self.write_main([_row("A-1")])
        data = self.load()
        self.assertEqual([q["id"] for q in data["queries"]], ["A-1"])
        self.assertEqual(data["status"], "approved_for_rebuild_and_bakeoff")
        self.assertEqual(data["default_split"], "tune")

    def test_folder_files_follow_the_main_file_in_name_order(self):
        self.write_main([_row("M-1"), _row("M-2")])
        self.write_folder_file("b-game.json", {"queries": [_row("B-1")]})
        self.write_folder_file("a-game.json", {"queries": [_row("A-1"), _row("A-2")]})
        data = self.load()
        self.assertEqual([q["id"] for q in data["queries"]], ["M-1", "M-2", "A-1", "A-2", "B-1"])
        self.assertEqual(data["origins"]["A-2"], "kb_eval/a-game.json")
        self.assertEqual(data["origins"]["M-1"], "kb_eval_v2.json")
        self.assertEqual([f["file"] for f in data["files"]], ["kb_eval_v2.json", "kb_eval/a-game.json", "kb_eval/b-game.json"])

    def test_a_notes_sidecar_and_a_readme_are_not_question_files(self):
        self.write_main([_row("M-1")])
        self.write_folder_file("a.json", {"queries": [_row("A-1")]})
        self.write_folder_file("a.sources.json", "this is not even json")
        (self.folder / "README.md").write_text("how to write a question file", encoding="utf-8")
        self.assertEqual([q["id"] for q in self.load()["queries"]], ["M-1", "A-1"])

    def test_an_id_used_in_the_main_file_and_a_folder_file_is_refused_naming_both(self):
        self.write_main([_row("X-1")])
        self.write_folder_file("later.json", {"queries": [_row("X-1")]})
        with self.assertRaises(loader.EvalFixtureError) as ctx:
            self.load()
        message = str(ctx.exception)
        self.assertIn("X-1", message)
        self.assertIn("kb_eval_v2.json", message)
        self.assertIn("kb_eval/later.json", message)

    def test_an_id_used_in_two_folder_files_is_refused_naming_both(self):
        self.write_main([_row("M-1")])
        self.write_folder_file("one.json", {"queries": [_row("X-9")]})
        self.write_folder_file("two.json", {"queries": [_row("X-9")]})
        with self.assertRaises(loader.EvalFixtureError) as ctx:
            self.load()
        message = str(ctx.exception)
        self.assertIn("kb_eval/one.json", message)
        self.assertIn("kb_eval/two.json", message)

    def test_an_unknown_key_at_the_top_of_a_file_is_refused(self):
        self.write_main([_row("M-1")])
        self.write_folder_file("a.json", {"queries": [], "queries_v3": []})
        with self.assertRaises(loader.EvalFixtureError) as ctx:
            self.load()
        self.assertIn("kb_eval/a.json", str(ctx.exception))
        self.assertIn("queries_v3", str(ctx.exception))

    def test_an_unknown_key_in_a_row_is_refused(self):
        self.write_main([_row("M-1")])
        self.write_folder_file("a.json", {"queries": [_row("A-1", expect_sectoin="Boss")]})
        with self.assertRaises(loader.EvalFixtureError) as ctx:
            self.load()
        self.assertIn("A-1", str(ctx.exception))
        self.assertIn("expect_sectoin", str(ctx.exception))

    def test_a_row_without_id_query_or_domain_is_refused(self):
        self.write_main([_row("M-1")])
        for missing in ("id", "query", "domain"):
            with self.subTest(missing=missing):
                row = _row("A-1")
                del row[missing]
                self.write_folder_file("a.json", {"queries": [row]})
                with self.assertRaises(loader.EvalFixtureError) as ctx:
                    self.load()
                self.assertIn(missing, str(ctx.exception))

    def test_a_split_that_is_not_tune_or_holdout_is_refused(self):
        self.write_main([_row("M-1")])
        self.write_folder_file("a.json", {"queries": [_row("A-1", split="holdoot")]})
        with self.assertRaises(loader.EvalFixtureError) as ctx:
            self.load()
        self.assertIn("holdoot", str(ctx.exception))
        self.write_folder_file("a.json", {"default_split": "blind", "queries": []})
        with self.assertRaises(loader.EvalFixtureError):
            self.load()

    def test_a_file_that_is_not_an_object_with_queries_is_refused(self):
        self.write_main([_row("M-1")])
        for body in ('[{"id": "A-1"}]', '{"rows": []}', '{"queries": "none"}', "not json at all"):
            with self.subTest(body=body):
                self.write_folder_file("a.json", body)
                with self.assertRaises(loader.EvalFixtureError) as ctx:
                    self.load()
                self.assertIn("kb_eval/a.json", str(ctx.exception))

    def test_a_files_default_split_reaches_its_rows_without_changing_the_main_file(self):
        self.write_main([_row("M-1")], default_split="tune")
        self.write_folder_file("blind.json", {"default_split": "holdout", "queries": [_row("B-1"), _row("B-2", split="tune")]})
        self.write_folder_file("plain.json", {"queries": [_row("P-1")]})
        data = self.load()
        splits = {q["id"]: q.get("split") for q in data["queries"]}
        self.assertEqual(splits, {"M-1": None, "B-1": "holdout", "B-2": "tune", "P-1": "tune"})
        self.assertEqual(data["default_split"], "tune")

    def test_a_files_status_defaults_to_the_main_files_and_must_be_a_known_one(self):
        self.write_main([_row("M-1")])
        self.write_folder_file("a.json", {"queries": []})
        self.write_folder_file("b.json", {"status": "awaiting_maintainer_signoff", "queries": []})
        statuses = {f["file"]: f["status"] for f in self.load()["files"]}
        self.assertEqual(statuses["kb_eval/a.json"], "approved_for_rebuild_and_bakeoff")
        self.assertEqual(statuses["kb_eval/b.json"], "awaiting_maintainer_signoff")
        self.write_folder_file("b.json", {"status": "done", "queries": []})
        with self.assertRaises(loader.EvalFixtureError):
            self.load()


class MeasuringScriptsReadTheFolderTests(unittest.TestCase):
    """The two measuring scripts count a question written in a new file, as the search test does."""

    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.base = Path(tmp.name)
        (self.base / "kb_eval").mkdir()
        old = _row("OLD-1", app_id="1145360", expect_section="Old note", split="holdout")
        new = _row("NEW-1", app_id="620", expect_section="New note")
        (self.base / "kb_eval_v2.json").write_text(json.dumps({"default_split": "tune", "queries": [old]}), encoding="utf-8")
        (self.base / "kb_eval" / "new-game.json").write_text(
            json.dumps({"default_split": "holdout", "queries": [new]}), encoding="utf-8"
        )

    def _questions_of(self, script_name):
        script = load_script(script_name)
        with mock.patch.object(script, "FIXTURES_DIR", str(self.base)):
            return script, script.load_questions()

    def test_the_floor_measurement_sees_the_new_files_rows_and_their_split(self):
        _script, data = self._questions_of("measure_kb_floor_holdout")
        self.assertEqual([q["id"] for q in data["queries"]], ["OLD-1", "NEW-1"])
        self.assertEqual(data["queries"][1]["split"], "holdout")

    def test_the_thin_match_measurement_sees_the_new_files_rows(self):
        script = load_script("measure_kb_thin_match")
        with mock.patch.object(script, "FIXTURES_DIR", str(self.base)):
            asks = script._gate_asks({"620": "Portal 2"})
        ids = {a["id"] for a in asks}
        self.assertIn("OLD-1/running", ids)
        self.assertIn("NEW-1/running", ids)
        self.assertIn("NEW-1/typed", ids)


class EveryReaderGoesThroughTheLoaderTests(unittest.TestCase):
    """No script or test opens the main questions file by its own name, so none can miss a new file."""

    REPO_ROOT = Path(__file__).resolve().parents[1]
    # The reader itself, and this file (its temporary folders write a file with the main file's name).
    MAY_NAME_THE_MAIN_FILE = {"scripts/lib/kb_eval_fixture.py", "tests/test_kb_eval_fixture.py"}

    def _python_files(self, *folders):
        for folder in folders:
            for path in sorted((self.REPO_ROOT / folder).rglob("*.py")):
                if "node_modules" not in path.parts and "__pycache__" not in path.parts:
                    yield path

    def test_nothing_else_names_the_main_file_as_a_path_to_open(self):
        offenders = []
        for path in self._python_files("scripts", "tests"):
            rel = path.relative_to(self.REPO_ROOT).as_posix()
            if rel in self.MAY_NAME_THE_MAIN_FILE:
                continue
            tree = ast.parse(path.read_text(encoding="utf-8"))
            if any(isinstance(n, ast.Constant) and n.value == "kb_eval_v2.json" for n in ast.walk(tree)):
                offenders.append(rel)
        self.assertEqual(offenders, [], f"read the questions through scripts/lib/kb_eval_fixture.py instead: {offenders}")

    def test_the_back_end_never_imports_the_loader(self):
        users = [
            path.relative_to(self.REPO_ROOT).as_posix()
            for path in self._python_files("py_modules")
            if any(
                (isinstance(n, ast.Import) and any(a.name.split(".")[0] == "kb_eval_fixture" for a in n.names))
                or (isinstance(n, ast.ImportFrom) and (n.module or "").split(".")[0] == "kb_eval_fixture")
                for n in ast.walk(ast.parse(path.read_text(encoding="utf-8")))
            )
        ]
        self.assertEqual(users, [])


if __name__ == "__main__":
    unittest.main()
