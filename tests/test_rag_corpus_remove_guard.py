"""Title: The knowledge library's Remove never deletes a whole home folder or SD card

Purpose: Pin the two guards the 0.6.0 security review asked for. The library's folder comes
from the rag_corpus_path setting, which the screen can save with only a ".." check, and Remove
(and Clear all data, which calls the same function) used to run a whole-folder delete on it.
The allowed-path check accepted the home folder itself and the SD-card mount folder itself, so
one bad setting could wipe either.
Used for: knowledge_base_schema.is_allowed_corpus_install_path and
rag_corpus_download_service.remove_corpus_at_path.
Does not: touch the real home folder -- Path.home() is pointed at a temp folder throughout.
"""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from backend.services.knowledge_base_schema import is_allowed_corpus_install_path
from backend.services.rag_corpus_download_service import remove_corpus_at_path

MODULE = "backend.services.rag_corpus_download_service"


class _Logger:
    def __init__(self):
        self.warnings: list[str] = []

    def warning(self, msg, *args, **kwargs):
        self.warnings.append(msg % args if args else msg)


class AllowedPathTests(unittest.TestCase):
    def test_home_folder_itself_is_refused(self):
        with mock.patch("pathlib.Path.home", return_value=Path("/home/deck")):
            self.assertFalse(is_allowed_corpus_install_path(Path("/home/deck")))

    def test_sd_mount_folder_itself_is_refused(self):
        with mock.patch("pathlib.Path.home", return_value=Path("/home/deck")):
            self.assertFalse(is_allowed_corpus_install_path(Path("/run/media/deck")))

    def test_a_cards_root_is_refused(self):
        with mock.patch("pathlib.Path.home", return_value=Path("/home/deck")):
            self.assertFalse(is_allowed_corpus_install_path(Path("/run/media/deck/SD128")))

    def test_the_normal_places_are_still_allowed(self):
        with mock.patch("pathlib.Path.home", return_value=Path("/home/deck")):
            self.assertTrue(is_allowed_corpus_install_path(Path("/home/deck/.bonsai/rag")))
            self.assertTrue(is_allowed_corpus_install_path(Path("/run/media/deck/SD128/.bonsai/rag")))
            self.assertTrue(is_allowed_corpus_install_path(Path("/home/deck/some/dev/kb")))


class RemoveCorpusTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.home = Path(self._tmp.name).resolve()
        self._home_patch = mock.patch("pathlib.Path.home", return_value=self.home)
        self._home_patch.start()

    def tearDown(self):
        self._home_patch.stop()
        self._tmp.cleanup()

    def _library_files(self, folder: Path) -> None:
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "corpus.db").write_bytes(b"sqlite")
        (folder / "corpus-manifest.json").write_text(
            json.dumps({"version": "1", "chunks": [{"filename": "corpus.db.zlib"}]}), encoding="utf-8"
        )
        (folder / "ATTRIBUTIONS.md").write_text("credits\n", encoding="utf-8")
        (folder / "corpus.db.zlib.part").write_bytes(b"half")

    def test_remove_refuses_the_home_folder_itself(self):
        keep = self.home / "my-save.txt"
        keep.write_text("precious", encoding="utf-8")
        (self.home / "corpus.db").write_bytes(b"sqlite")
        logger = _Logger()
        self.assertFalse(remove_corpus_at_path(str(self.home), logger))
        self.assertTrue(keep.is_file())
        self.assertTrue((self.home / "corpus.db").is_file())

    def test_remove_refuses_the_sd_mount_and_a_cards_root(self):
        for path in ("/run/media/" + self.home.name, "/run/media/" + self.home.name + "/SD128"):
            with self.subTest(path=path), mock.patch(f"{MODULE}.os.path.isdir", return_value=True), \
                    mock.patch(f"{MODULE}.shutil.rmtree") as rmtree, \
                    mock.patch(f"{MODULE}.os.remove") as remove:
                self.assertFalse(remove_corpus_at_path(path, _Logger()))
                rmtree.assert_not_called()
                remove.assert_not_called()

    def test_the_normal_bonsai_rag_folder_is_removed_whole(self):
        rag = self.home / ".bonsai" / "rag"
        self._library_files(rag)
        (rag / "leftover.tmp").write_bytes(b"x")
        self.assertTrue(remove_corpus_at_path(str(rag), _Logger()))
        self.assertFalse(rag.exists())
        self.assertTrue((self.home / ".bonsai").is_dir())

    def test_a_non_standard_folder_keeps_a_users_unrelated_file(self):
        folder = self.home / "Documents"
        self._library_files(folder)
        mine = folder / "taxes.pdf"
        mine.write_bytes(b"mine")
        self.assertTrue(remove_corpus_at_path(str(folder), _Logger()))
        self.assertTrue(mine.is_file())
        for name in ("corpus.db", "corpus-manifest.json", "ATTRIBUTIONS.md", "corpus.db.zlib.part"):
            self.assertFalse((folder / name).exists(), name)

    def test_a_non_standard_folder_holding_only_the_library_is_removed(self):
        folder = self.home / "dev-kb"
        self._library_files(folder)
        self.assertTrue(remove_corpus_at_path(str(folder), _Logger()))
        self.assertFalse(folder.exists())


if __name__ == "__main__":
    unittest.main()
