"""Title: Corpus-build test support

Purpose: Lets a test build a real knowledge-base corpus on a machine that has the
embedding model, and skip cleanly on one that does not, without ever hiding a
genuine build failure.

Used for: the three tests that build a seed corpus for real -- the attributions
check, the download round trip, and the knowledge-base service suite. Not
discovered as a test itself: the runner only collects files named test_*.py.

Solves: The corpus build refuses to finish when a card would ship with no
meaning-search vector, and making those vectors needs a local model. The build
machine has no such model, so every push failed on three tests from 2026-09-07
onward. These helpers turn that one refusal into a skip and leave every other
failure alone.

Does not: Install anything, reach the network, or weaken the guarantee. It matches
the refusal by its wording, so a build that breaks for any other reason still
fails the test that runs it. It also never skips silently -- the skip message says
what is missing and where the check still runs.
"""

from __future__ import annotations

import subprocess
import sys
import unittest
from pathlib import Path

# The exact refusal the corpus build raises when cards have no meaning-search
# vector. Matched on this phrase rather than the whole sentence because the
# counts in it change with the corpus; matched on something rather than bare
# SystemExit so a build that fails for any other reason still fails the test.
NO_EMBEDDINGS_MARKER = "no meaning-search vector"

SKIP_REASON = (
    "needs a local embedding model to build the corpus. This runs on a machine "
    "that has one (the full check before a landing), not on the build server."
)


def is_missing_embeddings(error: BaseException) -> bool:
    """Is this the corpus build refusing for want of an embedding model?"""
    return NO_EMBEDDINGS_MARKER in str(error)


def build_corpus_or_skip(build_rag_db, out_dir: Path, **kwargs):
    """Build a corpus, or skip the calling test if there is no embedding model here.

    Any other failure is re-raised untouched, so this cannot quietly turn a broken
    build into a green run.
    """
    try:
        return build_rag_db.build_corpus(out_dir, **kwargs)
    except SystemExit as exit_error:
        if is_missing_embeddings(exit_error):
            raise unittest.SkipTest(SKIP_REASON) from exit_error
        raise


def run_seed_build_or_skip(repo_root: Path, out_dir: Path) -> None:
    """Same thing for the build run as a separate process.

    The output is captured rather than inherited so the refusal can be read; on any
    failure that is not the missing model, it is printed and the test fails, so a
    real break is never swallowed along with the output.
    """
    result = subprocess.run(
        [sys.executable, str(repo_root / "scripts" / "build_rag_db.py"),
         "--seed", "--out", str(out_dir)],
        cwd=str(repo_root),
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        return
    combined = f"{result.stdout}\n{result.stderr}"
    if is_missing_embeddings(combined):
        raise unittest.SkipTest(SKIP_REASON)
    raise AssertionError(
        f"the corpus build failed (exit {result.returncode}):\n{combined.strip()[-2000:]}"
    )
