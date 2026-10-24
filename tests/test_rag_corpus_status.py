"""Title: Knowledge base status answers

Purpose: Check what the Knowledge base section is told about itself.
Used for: The answer lifted out of main.py on 2026-09-14, which had no test before.
Solves: Which machine gets asked about the meaning-search model, what happens when
        reading the corpus notes or the storage list fails, and that a download in
        progress is never hidden by the settled facts.
Does not: Test downloading or installing -- that is the download service's own job.
"""

import os
import sqlite3
import tempfile
import unittest

from backend.core.constants import DEFAULT_OLLAMA_PCIP
from backend.knowledge.rag_corpus_status import (
    StatusTools,
    build_rag_corpus_status,
    pc_ip_for_status,
    read_corpus_counts,
)

STORAGE = {"internal": {"id": "internal", "free_bytes": 100}, "sd_card": None}


def tools(
    *,
    db_path="/data/corpus.db",
    manifest=None,
    manifest_raises=False,
    embed_available=True,
    storage_raises=False,
    record=None,
    counts=None,
):
    def load_manifest(_path):
        if manifest_raises:
            raise OSError("unreadable")
        return manifest or {}

    def embed(pc_ip):
        if record is not None:
            record.append(pc_ip)
        return embed_available

    def storage():
        if storage_raises:
            raise OSError("no disks")
        return STORAGE

    return StatusTools(
        resolve_db_path=lambda _settings: db_path,
        manifest_path_for=lambda path: f"{path}/manifest.json",
        load_manifest=load_manifest,
        embed_model_available=embed,
        storage_options=storage,
        internal_dir=lambda: "/home/deck/.local/share/bonsai",
        corpus_counts=(lambda _path: counts) if counts is not None else (lambda _path: {}),
    )


class WhichMachineGetsAskedTests(unittest.TestCase):
    def test_what_the_caller_passed_wins(self):
        settings = {"ollama_local_on_deck": True}
        self.assertEqual(pc_ip_for_status(settings, {"pc_ip": "192.168.1.9"}), "192.168.1.9")

    def test_the_other_spelling_of_the_field_also_works(self):
        self.assertEqual(pc_ip_for_status({}, {"PcIp": "192.168.1.9"}), "192.168.1.9")

    def test_this_deck_when_the_ai_runs_here(self):
        self.assertEqual(pc_ip_for_status({"ollama_local_on_deck": True}, None), DEFAULT_OLLAMA_PCIP)

    def test_otherwise_the_first_saved_host(self):
        settings = {"named_ollama_hosts": [{"host": "192.168.1.20"}, {"host": "192.168.1.21"}]}
        self.assertEqual(pc_ip_for_status(settings, None), "192.168.1.20")

    def test_a_saved_host_stored_under_ip_instead_of_host(self):
        self.assertEqual(pc_ip_for_status({"named_ollama_hosts": [{"ip": "10.0.0.4"}]}, None), "10.0.0.4")

    def test_nothing_to_ask_is_empty_not_an_error(self):
        self.assertEqual(pc_ip_for_status({}, None), "")
        self.assertEqual(pc_ip_for_status({"named_ollama_hosts": "not a list"}, None), "")


class LibraryCountTests(unittest.TestCase):
    """P96-F15: the library line on screen shows how many games the installed file holds."""

    def _db(self, games, sections):
        d = tempfile.mkdtemp()
        path = os.path.join(d, "corpus.db")
        conn = sqlite3.connect(path)
        conn.execute("CREATE TABLE games (game_id INTEGER PRIMARY KEY, canonical_title TEXT)")
        conn.execute("CREATE TABLE sections (section_id INTEGER PRIMARY KEY, game_id INTEGER)")
        for i in range(games):
            conn.execute("INSERT INTO games (canonical_title) VALUES (?)", (f"g{i}",))
        for i in range(sections):
            conn.execute("INSERT INTO sections (game_id) VALUES (1)")
        conn.commit()
        conn.close()
        return path

    def test_a_small_database_reports_its_game_and_section_counts(self):
        path = self._db(3, 5)
        self.assertEqual(read_corpus_counts(path), {"game_count": 3, "section_count": 5})

    def test_the_status_carries_the_counts(self):
        out = build_rag_corpus_status(
            {}, None, {}, tools(counts={"game_count": 38, "section_count": 414})
        )
        self.assertEqual(out["game_count"], 38)
        self.assertEqual(out["section_count"], 414)

    def test_a_changed_file_is_counted_again(self):
        path = self._db(2, 2)
        self.assertEqual(read_corpus_counts(path)["game_count"], 2)
        conn = sqlite3.connect(path)
        conn.execute("INSERT INTO games (canonical_title) VALUES ('x')")
        conn.commit()
        conn.close()
        self.assertEqual(read_corpus_counts(path)["game_count"], 3)

    def test_an_unreadable_file_leaves_the_counts_out_instead_of_failing(self):
        self.assertEqual(read_corpus_counts("/no/such/corpus.db"), {})
        out = build_rag_corpus_status({}, None, {}, tools(counts={}))
        self.assertNotIn("game_count", out)
        self.assertTrue(out["installed"])


class StatusAnswerTests(unittest.TestCase):
    def test_installed_is_true_when_there_is_a_database(self):
        out = build_rag_corpus_status({}, None, {}, tools())
        self.assertTrue(out["installed"])

    def test_installed_is_false_when_there_is_none(self):
        out = build_rag_corpus_status({}, None, {}, tools(db_path=""))
        self.assertFalse(out["installed"])

    def test_vectors_are_reported_from_the_corpus_notes(self):
        settings = {"rag_corpus_path": "/sd/corpus"}
        out = build_rag_corpus_status(
            settings, None, {}, tools(manifest={"embeddings_populated": True})
        )
        self.assertTrue(out["embeddings_populated"])

    def test_unreadable_corpus_notes_mean_no_vectors_rather_than_a_crash(self):
        settings = {"rag_corpus_path": "/sd/corpus"}
        out = build_rag_corpus_status(settings, None, {}, tools(manifest_raises=True))
        self.assertFalse(out["embeddings_populated"])

    def test_no_corpus_path_means_the_notes_are_never_read(self):
        out = build_rag_corpus_status({}, None, {}, tools(manifest_raises=True))
        self.assertFalse(out["embeddings_populated"])

    def test_no_machine_to_ask_means_the_model_is_not_reported_available(self):
        asked: list = []
        out = build_rag_corpus_status({}, None, {}, tools(embed_available=True, record=asked))
        self.assertFalse(out["embed_model_available"])
        self.assertEqual(asked, [], "nothing should be asked when there is no machine")

    def test_a_failed_storage_lookup_still_offers_internal_storage(self):
        """Offering nowhere to install to would leave the screen with no choice at all."""
        out = build_rag_corpus_status({}, None, {}, tools(storage_raises=True))
        self.assertEqual(out["storage_options"]["internal"]["free_bytes"], 0)
        self.assertEqual(
            out["storage_options"]["internal"]["install_path"], "/home/deck/.local/share/bonsai"
        )
        self.assertIsNone(out["storage_options"]["sd_card"])

    def test_a_download_in_progress_is_reported_alongside_the_settled_facts(self):
        out = build_rag_corpus_status(
            {}, None, {"phase": "downloading", "percent": 42}, tools()
        )
        self.assertEqual(out["phase"], "downloading")
        self.assertEqual(out["percent"], 42)
        self.assertTrue(out["installed"])

    def test_the_settled_facts_win_over_a_stale_key_of_the_same_name(self):
        """Download state is spread first on purpose, so it cannot mask what is true now."""
        out = build_rag_corpus_status({}, None, {"installed": False}, tools())
        self.assertTrue(out["installed"])

    def test_the_switch_and_the_version_are_passed_through(self):
        settings = {"use_local_knowledge_base": True, "rag_corpus_version": 7}
        out = build_rag_corpus_status(settings, None, {}, tools())
        self.assertTrue(out["use_local_knowledge_base"])
        self.assertEqual(out["corpus_version"], "7")

    def test_the_switch_is_only_true_for_a_real_true(self):
        out = build_rag_corpus_status({"use_local_knowledge_base": "yes"}, None, {}, tools())
        self.assertFalse(out["use_local_knowledge_base"])


if __name__ == "__main__":
    unittest.main()
