"""
Title: Back-end file mover tests

Purpose: Build a small throwaway git repository that looks like this one in miniature (a
         `py_modules/backend/services/` package, a `main.py`, a test, a script and some
         Markdown), then run scripts/move_backend_file.py on it and check, one by one, that
         every way of reaching a moved module was rewritten, that a name which stays was left
         alone, that history was not touched, that a bad request changes nothing, and that
         the moved code still imports and its own tiny test still passes.
Used for: scripts/move_backend_file.py, the tool plan 86 step 4 uses to split the back end's
          services folder one area at a time.
Solves: A mover that misses one way of naming a module only fails later, as an import error on
        the Deck or a `patch(...)` that quietly stops patching. Each case here is one such way.
Does not: Touch this repository: every run happens inside a temporary folder. It also does not
          cover the real service files; that was tried once by hand in a scratch clone.
"""

import contextlib
import importlib.util
import io
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


def _load_mover():
    spec = importlib.util.spec_from_file_location(
        "move_backend_file", REPO_ROOT / "scripts" / "move_backend_file.py"
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


HEADER = '"""Title: {t}\n\nPurpose: test fixture.\nUsed for: tests.\nSolves: nothing.\nDoes not: anything.\n"""\n'

FILES = {
    "py_modules/backend/__init__.py": '"""Title: Backend package\n\nPurpose: fixture.\n"""\n',
    "py_modules/backend/services/__init__.py": '"""Title: Services package\n\nPurpose: fixture.\n"""\n',
    "py_modules/backend/services/zz_moving.py": HEADER.format(t="moving")
    + '''"""See py_modules/backend/services/zz_moving.py and [the guide](../../../docs/guide.md)."""
import os

from backend.services.zz_staying import stays


def hello():
    return "hello " + stays() + str(bool(os.sep))


def other():
    return 2
''',
    "py_modules/backend/services/zz_staying.py": HEADER.format(t="staying")
    + '''
def stays():
    return "staying"
''',
    "py_modules/backend/services/zz_other.py": HEADER.format(t="other")
    + '''
def value():
    return 7
''',
    # Every way of reaching zz_moving.
    "py_modules/backend/services/zz_user.py": HEADER.format(t="user")
    + '''from backend.services.zz_moving import hello, other
from backend.services.zz_moving import (
    hello as hello_two,
    other as other_two,
)
import backend.services.zz_moving
import backend.services.zz_moving as mv
from backend.services import zz_moving, zz_staying
from backend.services import (
    zz_moving as moving_alias,
    zz_other,
)  # noqa: E402
from py_modules.backend.services import zz_moving as via_py_modules


def use():
    def inner():
        from backend.services import zz_staying as late, zz_moving as late_moving

        return late.stays() + late_moving.hello()

    return (
        backend.services.zz_moving.hello(),
        mv.other(),
        zz_moving.hello(),
        moving_alias.other(),
        zz_other.value(),
        hello(),
        hello_two(),
        other() + other_two(),
        via_py_modules.hello(),
        inner(),
    )
''',
    "py_modules/backend/services/zz_rel.py": HEADER.format(t="rel")
    + '''from . import zz_moving, zz_staying
from .zz_moving import hello
''',
    "main.py": '"""Title: front door\n\nPurpose: fixture.\n"""\n'
    "from backend.services import zz_moving\n"
    "from backend.services import zz_staying\n",
    "scripts/tool.py": HEADER.format(t="tool")
    + "from backend.services.zz_moving import hello  # noqa: E402\n",
    "scripts/walk.sh": "#!/bin/sh\nls py_modules/backend/services/*.py\n",
    "tests/test_zz_moving.py": HEADER.format(t="the tiny test")
    + '''import importlib
import sys
import unittest
from unittest import mock
from unittest.mock import patch

import backend.services.zz_moving as target
from backend.services import zz_staying
from backend.services.zz_user import use


class Tiny(unittest.TestCase):
    def test_patch_by_string(self):
        with patch("backend.services.zz_moving.other", return_value=5):
            self.assertEqual(target.other(), 5)
        with mock.patch("backend.services.zz_moving.hello") as fake:
            fake.return_value = "x"
            self.assertEqual(target.hello(), "x")

    def test_other_string_forms(self):
        mod = importlib.import_module("backend.services.zz_moving")
        self.assertIs(sys.modules["backend.services.zz_moving"], mod)
        self.assertEqual(zz_staying.stays(), "staying")

    def test_every_import_form_resolves(self):
        out = use()
        self.assertEqual(out[4], 7)
        self.assertTrue(out[0].startswith("hello staying"))
''',
    "docs/guide.md": """# Guide

Code: [moving](../py_modules/backend/services/zz_moving.py) and
[the same file](../py_modules/backend/services/zz_moving.py#L3).
Plain mention of py_modules/backend/services/zz_moving.py, of backend/services/zz_moving.py,
of services/zz_moving.py, and of `backend.services.zz_moving`. Not this one:
backend.services.zz_moving_extra and services/zz_moving.pyc and docs/services/zz_moving.py.
Staying file: py_modules/backend/services/zz_staying.py.
""",
    "py_modules/backend/note.md": "Link from beside the code: [m](services/zz_moving.py)\n",
    "docs/archive/old.md": "History: py_modules/backend/services/zz_moving.py\n",
    "checks/rec.json": '{"inputs": ["py_modules/backend/services/zz_moving.py"]}\n',
    "CHANGELOG.md": "- fixed py_modules/backend/services/zz_moving.py\n",
}


def _git(repo, *args, check=True):
    proc = subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True)
    if check and proc.returncode != 0:
        raise AssertionError(f"git {args} failed: {proc.stderr}")
    return proc.stdout


def build_repo(root, files=None, binary=None):
    for rel, text in (files or FILES).items():
        path = Path(root) / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(text.encode("utf-8"))
    for rel, data in (binary or {}).items():
        path = Path(root) / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    _git(root, "init", "-q")
    _git(root, "config", "user.email", "t@example.invalid")
    _git(root, "config", "user.name", "t")
    _git(root, "config", "core.autocrlf", "false")
    _git(root, "add", ".")
    _git(root, "commit", "-q", "-m", "fixture")


class MoveBackendFileTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mod = _load_mover()

    @classmethod
    def tearDownClass(cls):
        sys.modules.pop("move_backend_file", None)

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.repo = Path(self._tmp.name)
        build_repo(self.repo)

    def run_mover(self, *args):
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = self.mod.main([*args, "--repo", str(self.repo)])
        return code, out.getvalue(), err.getvalue()

    def read(self, rel):
        return (self.repo / rel).read_text(encoding="utf-8")

    def status(self):
        return _git(self.repo, "status", "--porcelain")

    # ------------------------------------------------------------------ the happy path

    def move_one(self, *extra):
        code, out, err = self.run_mover(
            "py_modules/backend/services/zz_moving.py", "py_modules/backend/area/", *extra
        )
        self.assertEqual(code, 0, err + out)
        return out

    def test_dry_run_prints_the_edits_and_changes_nothing(self):
        out = self.move_one("--dry-run")
        self.assertEqual(self.status(), "")
        self.assertIn("-from backend.services.zz_moving import hello, other", out)
        self.assertIn("+from backend.area.zz_moving import hello, other", out)
        self.assertTrue((self.repo / "py_modules/backend/services/zz_moving.py").exists())

    def test_every_way_of_reaching_the_module_is_fixed(self):
        self.move_one()
        self.assertFalse((self.repo / "py_modules/backend/services/zz_moving.py").exists())
        self.assertTrue((self.repo / "py_modules/backend/area/zz_moving.py").exists())
        user = self.read("py_modules/backend/services/zz_user.py")
        self.assertIn("from backend.area.zz_moving import hello, other\n", user)
        self.assertIn(
            "from backend.area.zz_moving import (\n    hello as hello_two,\n    other as other_two,\n)\n",
            user,
        )
        self.assertIn("import backend.area.zz_moving\n", user)
        self.assertIn("import backend.area.zz_moving as mv\n", user)
        self.assertIn("backend.area.zz_moving.hello()", user)
        # the mixed line: the staying name keeps `backend.services`, the moved one is split off
        self.assertIn("from backend.services import zz_staying\nfrom backend.area import zz_moving\n", user)
        self.assertIn(
            "from backend.services import (\n    zz_other,\n)  # noqa: E402\n"
            "from backend.area import (\n    zz_moving as moving_alias,\n)  # noqa: E402\n",
            user,
        )
        self.assertIn("from py_modules.backend.area import zz_moving as via_py_modules\n", user)
        # an indented import inside a function keeps its indent
        self.assertIn(
            "        from backend.services import zz_staying as late\n"
            "        from backend.area import zz_moving as late_moving\n",
            user,
        )
        self.assertNotIn("backend.services.zz_moving", user)
        # names that were not moved are untouched
        self.assertIn("zz_other.value()", user)

    def test_main_script_and_tests_are_fixed(self):
        self.move_one()
        self.assertEqual(
            self.read("main.py").split("\n")[-3:],
            ["from backend.area import zz_moving", "from backend.services import zz_staying", ""],
        )
        self.assertIn("from backend.area.zz_moving import hello  # noqa: E402", self.read("scripts/tool.py"))
        test = self.read("tests/test_zz_moving.py")
        for form in (
            'patch("backend.area.zz_moving.other"',
            'mock.patch("backend.area.zz_moving.hello")',
            'importlib.import_module("backend.area.zz_moving")',
            'sys.modules["backend.area.zz_moving"]',
            "import backend.area.zz_moving as target",
        ):
            self.assertIn(form, test)
        self.assertNotIn("backend.services.zz_moving", test)
        self.assertIn("from backend.services import zz_staying", test)

    def test_relative_imports_are_recomputed(self):
        self.move_one()
        rel = self.read("py_modules/backend/services/zz_rel.py")
        self.assertIn("from . import zz_staying\n", rel)
        self.assertIn("from ..area import zz_moving\n", rel)
        self.assertIn("from ..area.zz_moving import hello\n", rel)

    def test_a_moved_file_with_relative_imports_keeps_reaching_the_same_modules(self):
        code, out, err = self.run_mover(
            "py_modules/backend/services/zz_rel.py", "py_modules/backend/area/"
        )
        self.assertEqual(code, 0, err)
        rel = self.read("py_modules/backend/area/zz_rel.py")
        self.assertIn("from ..services import zz_moving, zz_staying\n", rel)
        self.assertIn("from ..services.zz_moving import hello\n", rel)

    def test_mentions_in_explanations_and_links(self):
        self.move_one()
        guide = self.read("docs/guide.md")
        self.assertIn("(../py_modules/backend/area/zz_moving.py)", guide)
        self.assertIn("(../py_modules/backend/area/zz_moving.py#L3)", guide)
        self.assertIn("mention of py_modules/backend/area/zz_moving.py,", guide)
        self.assertIn("of backend/area/zz_moving.py,", guide)
        self.assertIn("of area/zz_moving.py,", guide)
        self.assertIn("`backend.area.zz_moving`", guide)
        # look-alikes are left alone
        self.assertIn("backend.services.zz_moving_extra", guide)
        self.assertIn("services/zz_moving.pyc", guide)
        self.assertIn("docs/services/zz_moving.py", guide)
        self.assertIn("py_modules/backend/services/zz_staying.py", guide)
        # a link written from beside the code resolves from where that page sits
        self.assertEqual(self.read("py_modules/backend/note.md"), "Link from beside the code: [m](area/zz_moving.py)\n")

    def test_the_moved_file_keeps_working_links_and_its_own_path(self):
        self.move_one()
        moved = self.read("py_modules/backend/area/zz_moving.py")
        self.assertIn("py_modules/backend/area/zz_moving.py", moved)
        self.assertIn("[the guide](../../../docs/guide.md)", moved)  # same depth, same link
        self.assertIn("from backend.services.zz_staying import stays", moved)

    def test_history_and_recordings_are_left_as_written(self):
        out = self.move_one()
        self.assertEqual(self.read("docs/archive/old.md"), FILES["docs/archive/old.md"])
        self.assertEqual(self.read("checks/rec.json"), FILES["checks/rec.json"])
        self.assertEqual(self.read("CHANGELOG.md"), FILES["CHANGELOG.md"])
        self.assertIn("left as written", out)

    def test_a_new_folder_gets_a_headed_init_that_is_staged(self):
        self.move_one()
        init = self.read("py_modules/backend/area/__init__.py")
        for label in ("Title:", "Purpose:", "Used for:", "Solves:", "Does not:"):
            self.assertIn(label, init)
        self.assertIn("backend.area", init)
        self.assertIn("A  py_modules/backend/area/__init__.py", self.status())
        self.assertRegex(
            self.status(),
            r"R. py_modules/backend/services/zz_moving.py -> py_modules/backend/area/zz_moving.py",
        )

    def test_the_moved_code_still_imports_and_its_test_passes(self):
        self.move_one()
        env = dict(os.environ, PYTHONPATH=str(self.repo / "py_modules"))
        proc = subprocess.run(
            [sys.executable, "-m", "unittest", "discover", "-s", "tests", "-v"],
            cwd=self.repo, env=env, capture_output=True, text=True,
        )
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        self.assertIn("test_patch_by_string", proc.stderr)
        # and the same test fails on the OLD import paths: it really goes through the new place
        out = subprocess.run(
            [sys.executable, "-c", "import backend.services.zz_moving"],
            cwd=self.repo, env=env, capture_output=True, text=True,
        )
        self.assertNotEqual(out.returncode, 0)

    def test_scripts_that_list_the_old_folder_are_reported(self):
        out = self.move_one()
        self.assertIn("scripts/walk.sh:2", out)
        self.assertIn("check by hand", out)

    # ------------------------------------------------------------------ rename, map file, several

    def test_a_rename_changes_the_bare_file_name_too(self):
        files = dict(FILES)
        files["docs/note.md"] = "See zz_other.py and `backend.services.zz_other` (not test_zz_other.py).\n"
        self.tearDown_repo()
        build_repo(self.repo, files)
        code, out, err = self.run_mover(
            "py_modules/backend/services/zz_other.py", "py_modules/backend/pkg/zz_renamed.py"
        )
        self.assertEqual(code, 0, err)
        self.assertEqual(
            self.read("docs/note.md"),
            "See zz_renamed.py and `backend.pkg.zz_renamed` (not test_zz_other.py).\n",
        )
        user = self.read("py_modules/backend/services/zz_user.py")
        # the local name is kept, so nothing further down the file changes
        self.assertIn("from backend.pkg import (\n    zz_renamed as zz_other,\n)  # noqa: E402\n", user)
        self.assertIn("zz_other.value()", user)

    def tearDown_repo(self):
        # start the case from a fresh folder
        self._tmp.cleanup()
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.repo = Path(self._tmp.name)

    def test_map_file_and_two_moves_at_once(self):
        mapfile = self.repo.parent / "moves-for-test.tsv"
        mapfile.write_text(
            "# comment\npy_modules/backend/services/zz_moving.py\tpy_modules/backend/area\n"
            "py_modules/backend/services/zz_other.py\tpy_modules/backend/area/\n",
            encoding="utf-8",
        )
        self.addCleanup(mapfile.unlink)
        code, out, err = self.run_mover("--map", str(mapfile))
        self.assertEqual(code, 0, err)
        user = self.read("py_modules/backend/services/zz_user.py")
        # both moved names land in one group, in their original order
        self.assertIn("from backend.area import (\n    zz_moving as moving_alias,\n    zz_other,\n)", user)
        self.assertTrue((self.repo / "py_modules/backend/area/zz_other.py").exists())

    def test_crlf_files_stay_crlf(self):
        self.tearDown_repo()
        build_repo(self.repo, binary={
            "py_modules/backend/services/zz_crlf.py": (
                HEADER.format(t="crlf").replace("\n", "\r\n")
                + "from backend.services import zz_staying, zz_moving\r\n"
            ).encode()
        })
        code, out, err = self.run_mover("py_modules/backend/services/zz_moving.py", "py_modules/backend/area")
        self.assertEqual(code, 0, err)
        data = (self.repo / "py_modules/backend/services/zz_crlf.py").read_bytes()
        self.assertTrue(data.endswith(b"from backend.services import zz_staying\r\nfrom backend.area import zz_moving\r\n"), data[-120:])
        self.assertEqual(data.count(b"\n"), data.count(b"\r\n"))

    # ------------------------------------------------------------------ refusals

    def assert_refused(self, *args, fragment):
        before = self.status()
        code, out, err = self.run_mover(*args)
        self.assertEqual(code, 2, out + err)
        self.assertIn(fragment, err)
        self.assertIn("nothing was changed", err)
        self.assertEqual(self.status(), before)
        self.assertTrue((self.repo / "py_modules/backend/services/zz_moving.py").exists())

    def test_refuses_an_untracked_source(self):
        (self.repo / "py_modules/backend/services/zz_new.py").write_text("x = 1\n")
        self.assert_refused("py_modules/backend/services/zz_new.py", "py_modules/backend/area", fragment="not tracked")

    def test_refuses_when_the_target_exists(self):
        self.assert_refused(
            "py_modules/backend/services/zz_moving.py", "py_modules/backend/services/zz_staying.py",
            fragment="already exists",
        )

    def test_refuses_an_existing_target_even_if_untracked(self):
        (self.repo / "py_modules/backend/area").mkdir()
        (self.repo / "py_modules/backend/area/zz_moving.py").write_text("x = 1\n")
        self.assert_refused("py_modules/backend/services/zz_moving.py", "py_modules/backend/area", fragment="already exists")

    def test_refuses_two_moves_that_collide(self):
        self.assert_refused(
            "py_modules/backend/services/zz_moving.py", "py_modules/backend/area/same.py",
            "py_modules/backend/services/zz_other.py", "py_modules/backend/area/same.py",
            fragment="same target",
        )

    def test_refuses_a_source_outside_the_back_end_and_odd_arguments(self):
        self.assert_refused("main.py", "py_modules/backend/area", fragment="must be a .py file under")
        self.assert_refused("py_modules/backend/services/zz_moving.py", fragment="pairs")

    def test_refuses_a_folder_that_would_hide_a_module(self):
        (self.repo / "py_modules/backend/area.py").write_text("x = 1\n")
        _git(self.repo, "add", "py_modules/backend/area.py")
        _git(self.repo, "commit", "-q", "-m", "module")
        self.assert_refused("py_modules/backend/services/zz_moving.py", "py_modules/backend/area", fragment="would hide")

    def test_refuses_a_comment_inside_a_split_import_without_changing_anything(self):
        path = self.repo / "py_modules/backend/services/zz_user.py"
        path.write_text(
            path.read_text(encoding="utf-8")
            + "from backend.services import (\n    zz_moving,  # keep\n    zz_staying,\n)\n",
            encoding="utf-8",
        )
        _git(self.repo, "commit", "-q", "-am", "comment")
        self.assert_refused("py_modules/backend/services/zz_moving.py", "py_modules/backend/area", fragment="comment sits inside")


if __name__ == "__main__":
    unittest.main()
