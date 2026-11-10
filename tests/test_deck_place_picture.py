"""Title: Deck picture placer (what it refuses, what it sends, what it removes)

Purpose: Test scripts/deck_place_picture.py without a Deck: every command it would send over SSH is caught by a
    stand-in and checked word for word. Covers the refusal of any target outside a "screenshots" folder, of an
    unsafe host or picture name, the commands for placing and for removing, the list of what was placed, and a
    list that has been tampered with.
Used for: the picture rows of the knowledge-base Deck checks (plan 103, lane T4).
Solves: A script that copies into the Deck's home folder and deletes there must be proven narrow on the PC first:
    it may place only under a screenshots folder, and --remove may delete only the files it placed.
Does not: Send a real command, open a real connection or touch the real workshop: pictures are tiny pretend files
    made in a temporary folder for each test.
"""

import importlib.util
import json
import os
import shutil
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location("deck_place_picture", ROOT / "scripts" / "deck_place_picture.py")
placer = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(placer)

HOST = "deck@192.168.0.5"
TARGET = ".local/share/Steam/userdata/12345/760/remote/2321470/screenshots"


class FakeRun:
    """Stands in for the command runner: records every command and answers the folder listing."""

    def __init__(self, listing="12345\n", fail_on=None):
        self.calls = []
        self.listing = listing
        self.fail_on = fail_on

    def __call__(self, argv, cwd=None):
        self.calls.append((argv, cwd))
        if self.fail_on is not None and len(self.calls) == self.fail_on:
            raise placer.Refusal("scp failed (1): stand-in")
        return self.listing


class WithFolder(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp(prefix="bonsai-place-")
        self.addCleanup(shutil.rmtree, self.dir, ignore_errors=True)
        os.makedirs(os.path.join(self.dir, "sub"))
        for name in ("a.png", "b.jpg", "sub/c.webp", "notes.txt"):
            Path(self.dir, name).write_bytes(b"x")
        self.list = os.path.join(self.dir, "deck-placed-2321470.json")


class TargetRefusalTests(unittest.TestCase):
    def test_the_usual_folder_is_accepted(self):
        self.assertEqual(placer.build_target("12345", "2321470"), TARGET)
        self.assertEqual(placer.check_target(TARGET), TARGET)

    def test_a_target_outside_a_screenshots_folder_is_refused(self):
        for bad in (
            "/etc",
            ".local/share/Steam/userdata/1/760/remote/2/screenshots/..",
            ".local/share/Steam/userdata/1/760/remote/2/screenshots/../../..",
            ".local/share/Steam/userdata/1/760/remote/2/thumbnails",
            ".local/share/Steam/userdata/1/760/remote/2/screenshots/thumbnails",
            "screenshots",
            "a/screenshots",
            "../a/b/screenshots",
            "/screenshots/a/screenshots/",
            ".local//share/screenshots",
            "",
        ):
            with self.subTest(bad=bad), self.assertRaises(placer.Refusal):
                placer.check_target(bad)

    def test_a_target_with_shell_characters_is_refused(self):
        for bad in ("a/b/screenshots;rm -rf ~", "a/b/screen shots", "a/$HOME/screenshots", "a/b/screenshots\n", "a/'b'/screenshots"):
            with self.subTest(bad=bad), self.assertRaises(placer.Refusal):
                placer.check_target(bad)

    def test_a_user_or_app_id_that_is_not_a_number_is_refused(self):
        for bad in ("12 34", "1/../2", "abc", "", "1;2", "12\n"):
            with self.subTest(bad=bad):
                with self.assertRaises(placer.Refusal):
                    placer.build_target(bad, "1")
                with self.assertRaises(placer.Refusal):
                    placer.build_target("1", bad)

    def test_only_a_plain_user_at_address_host_is_accepted(self):
        self.assertEqual(placer.check_host("deck@192.168.86.52"), "deck@192.168.86.52")
        for bad in ("-oProxyCommand=x@y", "192.168.0.5", "deck@host;ls", "deck@ho st", "deck@-x", "deck@a b@c", "", "deck@192.168.0.5\n"):
            with self.subTest(bad=bad), self.assertRaises(placer.Refusal):
                placer.check_host(bad)

    def test_the_user_folder_is_taken_only_when_there_is_exactly_one(self):
        self.assertEqual(placer.pick_user_id("0\n12345\n"), "12345")
        for listing in ("", "0\n", "111\n222\n", "anonymous\n"):
            with self.subTest(listing=listing), self.assertRaises(placer.Refusal):
                placer.pick_user_id(listing)


class PlaceTests(WithFolder):
    def test_placing_sends_exactly_three_kinds_of_command_and_writes_the_list(self):
        run = FakeRun()
        listing, placed = placer.place(HOST, "2321470", self.dir, ["a.png", "sub/c.webp"], run=run)
        self.assertEqual(listing, self.list)
        base = ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", "--", HOST]
        scp = ["scp", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", "--"]
        self.assertEqual(
            run.calls,
            [
                (base + [f"ls -1 {placer.USERDATA}"], None),
                (base + [f"mkdir -p -- {TARGET}"], None),
                (scp + ["a.png", f"{HOST}:{TARGET}/bonsai-placed-a.png"], self.dir),
                (scp + ["sub/c.webp", f"{HOST}:{TARGET}/bonsai-placed-c.webp"], self.dir),
            ],
        )
        written = json.loads(Path(self.list).read_text(encoding="utf-8"))
        self.assertEqual(written["target"], TARGET)
        self.assertEqual(written["host"], HOST)
        self.assertEqual([f["as"] for f in written["files"]], ["bonsai-placed-a.png", "bonsai-placed-c.webp"])
        self.assertEqual(written["files"], placed)

    def test_a_given_user_id_skips_the_listing(self):
        run = FakeRun()
        placer.place(HOST, "2321470", self.dir, ["a.png"], user_id="12345", run=run)
        self.assertFalse(any("ls -1" in c[0][-1] for c in run.calls))

    def test_a_target_outside_a_screenshots_folder_sends_nothing(self):
        run = FakeRun()
        with self.assertRaises(placer.Refusal):
            placer.place(HOST, "2321470", self.dir, ["a.png"], target="/home/deck", run=run)
        self.assertEqual(run.calls, [])
        self.assertFalse(os.path.exists(self.list))

    def test_a_bad_picture_name_sends_nothing(self):
        for bad in ("../a.png", "/etc/passwd", "notes.txt", "missing.png", "a b.png", "sub//c.webp", "a.png;ls", "-a.png:x", "sub", "a.png\n"):
            run = FakeRun()
            with self.subTest(bad=bad), self.assertRaises(placer.Refusal):
                placer.place(HOST, "2321470", self.dir, ["a.png", bad], run=run)
            self.assertEqual(run.calls, [])

    def test_two_pictures_with_the_same_plain_name_are_refused(self):
        Path(self.dir, "sub", "a.png").write_bytes(b"y")
        with self.assertRaises(placer.Refusal):
            placer.place(HOST, "2321470", self.dir, ["a.png", "sub/a.png"], run=FakeRun())

    def test_a_second_placing_is_refused_until_the_first_is_removed(self):
        placer.place(HOST, "2321470", self.dir, ["a.png"], run=FakeRun())
        run = FakeRun()
        with self.assertRaises(placer.Refusal):
            placer.place(HOST, "2321470", self.dir, ["b.jpg"], run=run)
        self.assertEqual(run.calls, [])

    def test_a_copy_that_fails_still_lists_what_was_placed_before_it(self):
        run = FakeRun(fail_on=4)  # ls, mkdir, first scp, then the second scp fails
        with self.assertRaises(placer.Refusal) as caught:
            placer.place(HOST, "2321470", self.dir, ["a.png", "b.jpg"], run=run)
        self.assertIn("1 picture(s) placed", str(caught.exception))
        written = json.loads(Path(self.list).read_text(encoding="utf-8"))
        self.assertEqual([f["as"] for f in written["files"]], ["bonsai-placed-a.png"])


class RemoveTests(WithFolder):
    def _placed(self, names=("a.png", "b.jpg")):
        placer.place(HOST, "2321470", self.dir, list(names), run=FakeRun())

    def test_removing_deletes_exactly_the_listed_files_then_the_list(self):
        self._placed()
        run = FakeRun()
        paths = placer.remove(HOST, "2321470", self.dir, run=run)
        want = [f"{TARGET}/bonsai-placed-a.png", f"{TARGET}/bonsai-placed-b.jpg"]
        self.assertEqual(paths, want)
        self.assertEqual(
            run.calls,
            [(["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", "--", HOST, "rm -f -- " + " ".join(want)], None)],
        )
        self.assertFalse(os.path.exists(self.list))

    def test_removing_with_no_list_sends_nothing(self):
        run = FakeRun()
        with self.assertRaises(placer.Refusal):
            placer.remove(HOST, "2321470", self.dir, run=run)
        self.assertEqual(run.calls, [])

    def test_a_list_made_for_another_host_or_game_is_not_used(self):
        self._placed()
        for host, app in (("deck@10.0.0.9", "2321470"),):
            with self.assertRaises(placer.Refusal):
                placer.remove(host, app, self.dir, run=FakeRun())
        data = json.loads(Path(self.list).read_text(encoding="utf-8"))
        data["app"] = "999"
        Path(self.list).write_text(json.dumps(data), encoding="utf-8")
        with self.assertRaises(placer.Refusal):
            placer.remove(HOST, "2321470", self.dir, run=FakeRun())

    def _tamper(self, change):
        self._placed()
        data = json.loads(Path(self.list).read_text(encoding="utf-8"))
        change(data)
        Path(self.list).write_text(json.dumps(data), encoding="utf-8")
        run = FakeRun()
        with self.assertRaises(placer.Refusal):
            placer.remove(HOST, "2321470", self.dir, run=run)
        self.assertEqual(run.calls, [])
        self.assertTrue(os.path.exists(self.list))

    def test_a_list_pointing_outside_a_screenshots_folder_deletes_nothing(self):
        self._tamper(lambda d: d.update(target="/home/deck"))

    def test_a_list_naming_a_file_the_script_did_not_place_deletes_nothing(self):
        self._tamper(lambda d: d["files"].append({"as": "DeckCapture_20261109.png"}))

    def test_a_list_naming_a_path_or_a_non_picture_deletes_nothing(self):
        self._tamper(lambda d: d["files"].append({"as": "bonsai-placed-../../x.png"}))
        os.remove(self.list)
        self._tamper(lambda d: d["files"].append({"as": "bonsai-placed-x.sh"}))

    def test_a_name_with_a_trailing_newline_deletes_nothing(self):
        self._tamper(lambda d: d["files"].append({"as": "bonsai-placed-x.png\n"}))

    def test_a_failed_delete_keeps_the_list_so_it_can_be_tried_again(self):
        self._placed()

        def failing(argv, cwd=None):
            raise placer.Refusal("ssh failed (255): stand-in")

        with self.assertRaises(placer.Refusal):
            placer.remove(HOST, "2321470", self.dir, run=failing)
        self.assertTrue(os.path.exists(self.list))

    def test_the_command_line_refuses_picture_names_with_remove(self):
        with self.assertRaises(SystemExit) as caught:
            placer.main(["--host", HOST, "--app", "2321470", "--from", self.dir, "--remove", "a.png"])
        self.assertEqual(caught.exception.code, 2)


class NoShellTests(unittest.TestCase):
    def test_the_script_never_asks_for_a_shell(self):
        source = (ROOT / "scripts" / "deck_place_picture.py").read_text(encoding="utf-8")
        for banned in ("shell=True", "os.system", "os.popen", "Popen("):
            self.assertNotIn(banned, source)


if __name__ == "__main__":
    unittest.main()
