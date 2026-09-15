"""Title: Knowledge base install from a folder

Purpose: Check every way installing from a folder can be refused, and what a success saves.
Used for: The decision lifted out of main.py on 2026-09-14, which had no test before.
Solves: All four refusals happen before a single file is touched, so they can be checked
        without a knowledge base on disk and without writing anything.
Does not: Test the copying and unpacking itself -- that is the download service's own job,
          and it is handed in here so these tests never touch the filesystem for it.
"""

import asyncio
import contextlib
import os
import tempfile
import unittest

from backend.services.knowledge_base_schema import CORPUS_MANIFEST_FILENAME
from backend.services.rag_corpus_local_install import (
    DEVELOPER_TAB_OFF_ERROR,
    install_rag_corpus_from_local_dir,
    plan_local_install,
)

DEV_ON = {"show_developer_tab": True}


@contextlib.contextmanager
def source_folder(with_notes: bool = True):
    """A throwaway folder, with or without the notes file the install looks for."""
    with tempfile.TemporaryDirectory() as folder:
        if with_notes:
            open(os.path.join(folder, CORPUS_MANIFEST_FILENAME), "w").close()
        yield folder


@contextlib.contextmanager
def installed_folder(version: str):
    """A throwaway folder that looks like a finished install of the given version."""
    with tempfile.TemporaryDirectory() as folder:
        notes = os.path.join(folder, CORPUS_MANIFEST_FILENAME)
        with open(notes, "w", encoding="utf-8") as f:
            f.write('{"version": "%s"}' % version)
        yield folder


class RefusalTests(unittest.TestCase):
    def test_developer_tab_off_is_refused_first(self):
        plan, error = plan_local_install({"show_developer_tab": False}, {"source_dir": "/tmp/x"})
        self.assertIsNone(plan)
        self.assertEqual(error, DEVELOPER_TAB_OFF_ERROR)

    def test_developer_tab_missing_counts_as_off(self):
        plan, error = plan_local_install({}, None)
        self.assertIsNone(plan)
        self.assertEqual(error, DEVELOPER_TAB_OFF_ERROR)

    def test_a_folder_with_no_notes_file_is_refused_and_names_the_folder(self):
        with source_folder(with_notes=False) as empty:
            plan, error = plan_local_install(DEV_ON, {"source_dir": empty})
            self.assertIsNone(plan)
            self.assertIn(CORPUS_MANIFEST_FILENAME, error)
            self.assertIn(empty, error)

    def test_a_folder_that_is_not_allowed_is_refused_with_the_reason(self):
        with source_folder() as src:
            plan, error = plan_local_install(
                DEV_ON, {"source_dir": src, "install_path": "/etc/definitely-not-allowed"}
            )
            self.assertIsNone(plan)
            self.assertTrue(error)
            self.assertNotIn(
                CORPUS_MANIFEST_FILENAME, error, "should be the folder complaint, not the notes one"
            )


class PlanTests(unittest.TestCase):
    def test_the_other_spelling_of_the_source_field_works(self):
        with source_folder() as src:
            plan, error = plan_local_install(DEV_ON, {"path": src})
            self.assertIsNone(error)
            self.assertEqual(plan.source_dir, src)
            self.assertEqual(plan.manifest_path, os.path.join(src, CORPUS_MANIFEST_FILENAME))

    def test_a_blank_source_falls_back_to_the_shipped_folder(self):
        """Nothing typed means the folder the plugin ships with, not an error."""
        plan, error = plan_local_install(DEV_ON, {"source_dir": "   "})
        # Either it found the shipped folder or it said that folder has no notes file.
        # Both are fine here; what matters is that a blank box is not its own complaint.
        self.assertTrue(plan is not None or CORPUS_MANIFEST_FILENAME in error)


class SuccessAndFailureTests(unittest.TestCase):
    def run_install(self, src, run_install):
        return asyncio.run(
            install_rag_corpus_from_local_dir(DEV_ON, {"source_dir": src}, run_install=run_install)
        )

    def test_a_successful_install_reports_where_and_which_version(self):
        with source_folder() as src, installed_folder("9") as dest:
            outcome = self.run_install(src, lambda _plan: dest)
            self.assertTrue(outcome.result["ok"])
            self.assertEqual(outcome.result["install_path"], dest)
            self.assertEqual(outcome.result["version"], "9")

    def test_a_successful_install_asks_for_three_settings_to_be_saved(self):
        """Including switching the knowledge base on, which is the point of installing it."""
        with source_folder() as src, installed_folder("9") as dest:
            outcome = self.run_install(src, lambda _plan: dest)
            self.assertEqual(
                outcome.settings_to_save,
                {
                    "rag_corpus_path": dest,
                    "rag_corpus_version": "9",
                    "use_local_knowledge_base": True,
                },
            )

    def test_an_install_that_fails_saves_nothing_and_reports_why(self):
        def boom(_plan):
            raise OSError("disk full")

        with source_folder() as src:
            outcome = self.run_install(src, boom)
        self.assertFalse(outcome.result["ok"])
        self.assertIn("disk full", outcome.result["error"])
        self.assertIsNone(outcome.settings_to_save, "a failed install must not change settings")

    def test_a_refusal_saves_nothing(self):
        outcome = asyncio.run(install_rag_corpus_from_local_dir({}, None))
        self.assertFalse(outcome.result["ok"])
        self.assertIsNone(outcome.settings_to_save)


if __name__ == "__main__":
    unittest.main()
