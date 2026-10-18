"""Title: Move-commit checker tests

Purpose: Prove scripts/check_move_commit.py does its one job: pass a commit that only moves files
    and fixes the references to them, and fail one that changed anything else. Each case builds
    a small throwaway git repo, makes a commit the way a person or the mover script would, and runs
    the real checker on it. Every "passes" case has a "fails" twin where one thing is made wrong
    on purpose (a changed character, an import pointing at a different module, a mock path nobody
    updated), because a check that has never been seen failing may not be checking anything.
Used for: scripts/check_move_commit.py, which every move commit of the folder-per-feature step is
    checked with. Covers Python moves (done by hand with git mv) and screen-file moves.
Solves: Nothing else would notice a "move" commit that also changed a line of code.
Does not: Run the screen-file mover (tests for that are in scripts/move_screen_file.test.mjs) or
    touch the real repository.
"""

import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CHECKER = REPO / "scripts" / "check_move_commit.py"


class Sandbox:
    """A throwaway git repo that is deleted when the test ends."""

    def __init__(self, files: dict[str, str]):
        self.root = Path(tempfile.mkdtemp(prefix="movecheck-"))
        self.git("init", "-q", ".")
        self.git("config", "user.email", "t@example.com")
        self.git("config", "user.name", "t")
        self.git("config", "core.autocrlf", "false")
        for rel, text in files.items():
            self.write(rel, text)
        self.commit("start")

    def git(self, *args: str) -> str:
        done = subprocess.run(["git", "-C", str(self.root), *args], capture_output=True, text=True)
        assert done.returncode == 0, f"git {' '.join(args)}: {done.stderr}"
        return done.stdout

    def write(self, rel: str, text: str | bytes) -> None:
        target = self.root / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(text, bytes):
            target.write_bytes(text)
        else:
            target.write_bytes(text.encode("utf8"))

    def read(self, rel: str) -> str:
        return (self.root / rel).read_text(encoding="utf8")

    def edit(self, rel: str, old: str, new: str) -> None:
        text = self.read(rel)
        assert old in text, f"{old!r} not in {rel}"
        self.write(rel, text.replace(old, new))

    def move(self, old: str, new: str) -> None:
        (self.root / new).parent.mkdir(parents=True, exist_ok=True)
        self.git("mv", old, new)

    def commit(self, message: str) -> None:
        self.git("add", "-A")
        self.git("commit", "-q", "-m", message)

    def check(self, rev: str = "HEAD") -> tuple[int, str]:
        done = subprocess.run(
            [sys.executable, str(CHECKER), rev, "--repo", str(self.root)], capture_output=True, text=True
        )
        return done.returncode, done.stdout + done.stderr

    def cleanup(self) -> None:
        def unlock(func, path, _info):
            os.chmod(path, 0o700)
            func(path)

        shutil.rmtree(self.root, onerror=unlock)


PY_FILES = {
    "py_modules/backend/services/util.py": "def helper():\n    return 1\n",
    "py_modules/backend/services/foo.py": (
        '"""Foo."""\n'
        "from . import util\n"
        "from backend.services.util import helper\n"
        "\n"
        "def bar():\n"
        "    return util.helper() + helper()\n"
    ),
    "py_modules/backend/services/consumer.py": (
        "from backend.services.foo import bar\n"
        "from backend.services import foo\n"
        "from .foo import bar as bar2\n"
        "import backend.services.foo as f\n"
        "\n"
        "def run():\n"
        "    return bar() + foo.bar() + bar2() + f.bar()\n"
    ),
    "tests/test_foo.py": (
        "import importlib\n"
        "from unittest.mock import patch\n"
        "\n"
        "def test_it():\n"
        '    with patch("backend.services.foo.bar"):\n'
        '        importlib.import_module("backend.services.foo")\n'
        '    return "py_modules/backend/services/foo.py"\n'
    ),
    "docs/note.md": "The code is in `py_modules/backend/services/foo.py` and its tests.\n",
}


def do_python_move(box: Sandbox) -> None:
    """What a careful person (or the back-end mover) does: git mv plus the import edits."""
    box.move("py_modules/backend/services/foo.py", "py_modules/backend/services/sub/foo.py")
    box.edit("py_modules/backend/services/sub/foo.py", "from . import util", "from .. import util")
    c = "py_modules/backend/services/consumer.py"
    box.edit(c, "from backend.services.foo import bar", "from backend.services.sub.foo import bar")
    box.edit(c, "from backend.services import foo", "from backend.services.sub import foo")
    box.edit(c, "from .foo import bar as bar2", "from .sub.foo import bar as bar2")
    box.edit(c, "import backend.services.foo as f", "import backend.services.sub.foo as f")
    box.edit("tests/test_foo.py", "backend.services.foo", "backend.services.sub.foo")
    box.edit("tests/test_foo.py", "backend/services/foo.py", "backend/services/sub/foo.py")
    box.edit("docs/note.md", "backend/services/foo.py", "backend/services/sub/foo.py")


class PythonMoveTests(unittest.TestCase):
    def setUp(self):
        self.box = Sandbox(PY_FILES)
        self.addCleanup(self.box.cleanup)

    def test_a_careful_python_move_passes(self):
        do_python_move(self.box)
        self.box.commit("move foo")
        code, out = self.box.check()
        self.assertEqual(code, 0, out)

    def test_a_comment_in_the_short_backend_form_may_follow_the_move(self):
        self.box.write("py_modules/backend/services/note.py", "# see backend/services/foo.py and services/foo.py\n")
        self.box.commit("add note")
        do_python_move(self.box)
        self.box.edit(
            "py_modules/backend/services/note.py",
            "# see backend/services/foo.py and services/foo.py",
            "# see backend/services/sub/foo.py and services/sub/foo.py",
        )
        self.box.commit("move foo")
        code, out = self.box.check()
        self.assertEqual(code, 0, out)

    def test_a_short_form_pointing_at_the_wrong_folder_fails(self):
        self.box.write("py_modules/backend/services/note.py", "# see backend/services/foo.py\n")
        self.box.commit("add note")
        do_python_move(self.box)
        self.box.edit("py_modules/backend/services/note.py", "backend/services/foo.py", "backend/other/foo.py")
        self.box.commit("move foo")
        code, out = self.box.check()
        self.assertEqual(code, 1, out)
        self.assertIn("note.py", out)

    def test_one_changed_character_in_the_moved_file_fails(self):
        do_python_move(self.box)
        self.box.edit("py_modules/backend/services/sub/foo.py", "+ helper()", "+ helper() + 1")
        self.box.commit("move foo (and change it)")
        code, out = self.box.check()
        self.assertEqual(code, 1, out)
        self.assertIn("sub/foo.py", out)
        self.assertIn("helper() + 1", out)

    def test_an_import_that_now_names_a_different_module_fails(self):
        do_python_move(self.box)
        self.box.edit(
            "py_modules/backend/services/consumer.py",
            "from backend.services.sub.foo import bar",
            "from backend.services.util import helper as bar",
        )
        self.box.commit("move foo")
        code, out = self.box.check()
        self.assertEqual(code, 1, out)
        self.assertIn("consumer.py", out)

    def test_an_import_nobody_updated_fails(self):
        do_python_move(self.box)
        self.box.edit("py_modules/backend/services/consumer.py", "from backend.services.sub import foo", "from backend.services import foo")
        self.box.commit("move foo, forgot one import")
        code, out = self.box.check()
        self.assertEqual(code, 1, out)
        self.assertIn("imports are not the same", out)

    def test_a_relative_import_inside_the_moved_file_must_follow(self):
        do_python_move(self.box)
        self.box.edit("py_modules/backend/services/sub/foo.py", "from .. import util", "from . import util")
        self.box.commit("move foo, forgot its own relative import")
        code, out = self.box.check()
        self.assertEqual(code, 1, out)
        self.assertIn("sub/foo.py", out)
        self.assertIn("imports are not the same", out)

    def test_an_importer_the_commit_never_touched_fails(self):
        do_python_move(self.box)
        self.box.git("checkout", "-q", "HEAD", "--", "py_modules/backend/services/consumer.py")
        self.box.commit("move foo, forgot the whole importer")
        code, out = self.box.check()
        self.assertEqual(code, 1, out)
        self.assertIn("consumer.py: not in the commit", out)

    def test_a_patch_string_with_the_wrong_name_fails(self):
        do_python_move(self.box)
        self.box.edit("tests/test_foo.py", 'patch("backend.services.sub.foo.bar")', 'patch("backend.services.sub.foo.baz")')
        self.box.commit("move foo")
        code, out = self.box.check()
        self.assertEqual(code, 1, out)
        self.assertIn("baz", out)

    def test_an_unrelated_comment_edit_in_a_touched_file_fails(self):
        do_python_move(self.box)
        self.box.edit("py_modules/backend/services/consumer.py", "def run():", "# tidy\ndef run():")
        self.box.commit("move foo")
        code, out = self.box.check()
        self.assertEqual(code, 1, out)
        self.assertIn("# tidy", out)


class WholeCommitTests(unittest.TestCase):
    def setUp(self):
        self.box = Sandbox({**PY_FILES, "docs/code-map.md": "- py_modules/backend/services/foo.py\n", "data/blob.bin": b"\x00\x01\x02" * 50})
        self.addCleanup(self.box.cleanup)

    def test_a_file_added_with_no_partner_fails(self):
        do_python_move(self.box)
        self.box.write("py_modules/backend/services/new.py", "x = 1\n")
        self.box.commit("move foo and add a file")
        code, out = self.box.check()
        self.assertEqual(code, 1, out)
        self.assertIn("ADDED", out)

    def test_a_move_may_add_a_code_free_package_marker(self):
        do_python_move(self.box)
        self.box.write("py_modules/backend/services/sub/__init__.py", '"""Title: sub package\n\nPurpose: marks the folder."""\n# a comment\n')
        self.box.commit("move foo and add the package marker")
        code, out = self.box.check()
        self.assertEqual(code, 0, out)

    def test_an_added_package_marker_holding_code_fails(self):
        do_python_move(self.box)
        self.box.write("py_modules/backend/services/sub/__init__.py", '"""Marks the folder."""\nX = 1\n')
        self.box.commit("move foo and add a marker with code")
        code, out = self.box.check()
        self.assertEqual(code, 1, out)
        self.assertIn("ADDED", out)

    def test_a_file_deleted_with_no_partner_fails(self):
        do_python_move(self.box)
        self.box.git("rm", "-q", "-f", "docs/note.md")
        self.box.commit("move foo and delete a doc")
        code, out = self.box.check()
        self.assertEqual(code, 1, out)
        self.assertIn("DELETED", out)

    def test_generated_files_may_change_alongside_a_move(self):
        do_python_move(self.box)
        self.box.write("docs/code-map.md", "- py_modules/backend/services/sub/foo.py\n- something else entirely\n")
        self.box.commit("move foo, regenerate the map")
        code, out = self.box.check()
        self.assertEqual(code, 0, out)

    def test_a_changed_binary_file_fails_and_a_moved_identical_one_passes(self):
        self.box.move("data/blob.bin", "data/sub/blob.bin")
        self.box.commit("move the blob")
        self.assertEqual(self.box.check()[0], 0)
        self.box.write("data/sub/blob.bin", b"\x00\x01\x03" * 50)
        self.box.commit("change the blob")
        code, out = self.box.check()
        self.assertEqual(code, 1, out)
        self.assertIn("binary", out)

    def test_a_file_mode_change_fails(self):
        self.box.git("update-index", "--chmod=+x", "docs/note.md")
        self.box.git("commit", "-q", "-m", "make it executable")
        code, out = self.box.check()
        self.assertEqual(code, 1, out)
        self.assertIn("mode", out)

    def test_a_range_checks_every_commit_on_its_own(self):
        base = self.box.git("rev-parse", "HEAD").strip()
        do_python_move(self.box)
        self.box.commit("move foo")
        self.box.edit("py_modules/backend/services/util.py", "return 1", "return 2")
        self.box.commit("a sneaky change")
        code, out = self.box.check(f"{base}..HEAD")
        self.assertEqual(code, 1, out)
        self.assertIn("ok   ", out)
        self.assertIn("FAIL ", out)
        self.assertIn("return 2", out)

    def test_a_note_names_a_file_that_still_mentions_the_old_path(self):
        # a document the move did not touch (history stays as written): the check still passes,
        # but says so, so a forgotten mention does not go unseen
        self.box.write("docs/other.md", "Also see py_modules/backend/services/foo.py.\n")
        self.box.commit("add a doc that names the file")
        do_python_move(self.box)
        self.box.commit("move foo")
        code, out = self.box.check()
        self.assertEqual(code, 0, out)
        self.assertIn("note: docs/other.md:1: still names a moved file's old path", out)


SCREEN_FILES = {
    "src/utils/helper.ts": "// helper\nexport const helper = () => 1;\n",
    "src/utils/reexport.ts": 'export * from "./helper";\n',
    "src/components/Panel.tsx": 'import { helper } from "../utils/helper";\nexport const Panel = () => helper();\n',
    "src/components/Panel.test.tsx": (
        'import { Panel } from "./Panel";\n'
        'vi.mock("../utils/helper", () => ({ helper: vi.fn() }));\n'
        'test("p", () => Panel());\n'
    ),
    "docs/guide.md": "See [the helper](../src/utils/helper.ts) and Panel.tsx.\n",
}


def do_screen_move(box: Sandbox) -> None:
    box.move("src/utils/helper.ts", "src/features/shared/helper.ts")
    box.edit("src/components/Panel.tsx", '"../utils/helper"', '"../features/shared/helper"')
    box.edit("src/components/Panel.test.tsx", '"../utils/helper"', '"../features/shared/helper"')
    box.move("src/utils/reexport.ts", "src/features/other/reexport.ts")
    box.edit("src/features/other/reexport.ts", '"./helper"', '"../shared/helper"')
    box.edit("docs/guide.md", "../src/utils/helper.ts", "../src/features/shared/helper.ts")


class ScreenMoveTests(unittest.TestCase):
    def setUp(self):
        self.box = Sandbox(SCREEN_FILES)
        self.addCleanup(self.box.cleanup)

    def test_a_screen_move_passes_even_when_a_tiny_file_has_no_similarity_left(self):
        # reexport.ts is one line and the move rewrites that whole line, so git cannot pair it
        # on content alone -- but it is the same file name, so the checker pairs it and judges it.
        do_screen_move(self.box)
        self.box.commit("move helper")
        code, out = self.box.check()
        self.assertEqual(code, 0, out)

    def test_a_mock_path_nobody_updated_fails_even_though_its_line_did_not_change(self):
        do_screen_move(self.box)
        self.box.edit("src/components/Panel.test.tsx", 'vi.mock("../features/shared/helper"', 'vi.mock("../utils/helper"')
        self.box.commit("move helper, forgot the mock")
        code, out = self.box.check()
        self.assertEqual(code, 1, out)
        self.assertIn("Panel.test.tsx", out)
        self.assertIn("not in the commit", out)
        self.assertIn('"../utils/helper"', out)

    def test_an_import_pointing_at_the_wrong_file_fails(self):
        do_screen_move(self.box)
        self.box.edit("src/components/Panel.tsx", '"../features/shared/helper"', '"../utils/reexport"')
        self.box.commit("move helper")
        code, out = self.box.check()
        self.assertEqual(code, 1, out)
        self.assertIn("Panel.tsx", out)

    def test_a_markdown_link_to_the_wrong_place_fails(self):
        do_screen_move(self.box)
        self.box.edit("docs/guide.md", "../src/features/shared/helper.ts", "../src/utils/reexport.ts")
        self.box.commit("move helper")
        code, out = self.box.check()
        self.assertEqual(code, 1, out)
        self.assertIn("guide.md", out)

    def test_one_changed_character_in_a_moved_screen_file_fails(self):
        do_screen_move(self.box)
        self.box.edit("src/features/shared/helper.ts", "=> 1;", "=> 2;")
        self.box.commit("move helper and change it")
        code, out = self.box.check()
        self.assertEqual(code, 1, out)
        self.assertIn("=> 2", out)

    def test_a_rename_may_change_the_file_name_in_text_but_nothing_else(self):
        self.box.move("src/components/Panel.tsx", "src/components/Window.tsx")
        self.box.move("src/components/Panel.test.tsx", "src/components/Window.test.tsx")
        self.box.edit("src/components/Window.test.tsx", '"./Panel"', '"./Window"')
        self.box.edit("docs/guide.md", "Panel.tsx", "Window.tsx")
        self.box.commit("rename Panel")
        self.assertEqual(self.box.check()[0], 0)
        self.box.edit("docs/guide.md", "See [the helper]", "Read [the helper]")
        self.box.commit("reword")
        # the reword is a plain edit, not a move: the checker must refuse it
        self.assertEqual(self.box.check()[0], 1)


if __name__ == "__main__":
    unittest.main()
