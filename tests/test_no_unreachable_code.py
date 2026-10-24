"""No statement may follow a return/raise/break/continue in the same block.

This is the mechanism for a bug class that has bitten once and cost real user-facing behavior.
``742db60`` deleted the ``def status(self)`` signature line from
``VoiceTranscriptionSession`` but left its two-line body behind, where it silently became
unreachable code at the end of ``_transcribe_pcm``. The result was voice input raising
``AttributeError`` on every attempt for about two and a half weeks, through four green gates.

Unreachable code after a terminator is never intentional in this codebase, and it is exactly
the fingerprint a half-finished deletion leaves. Python does not warn about it and neither
does the test suite, so this checks for it directly.

Scope is `main.py` plus every module under `py_modules/`, which is what ships to the Deck.
"""

import ast
import io
import os
import unittest

TERMINATORS = (ast.Return, ast.Raise, ast.Continue, ast.Break)
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _python_files() -> list[str]:
    paths = [os.path.join(REPO_ROOT, "main.py")]
    for root, _dirs, files in os.walk(os.path.join(REPO_ROOT, "py_modules")):
        if "__pycache__" in root:
            continue
        paths.extend(os.path.join(root, f) for f in files if f.endswith(".py"))
    return sorted(paths)


def _unreachable_sites(path: str) -> list[str]:
    with io.open(path, encoding="utf-8") as fh:
        tree = ast.parse(fh.read(), filename=path)
    findings: list[str] = []
    rel = os.path.relpath(path, REPO_ROOT).replace(os.sep, "/")
    for node in ast.walk(tree):
        body = getattr(node, "body", None)
        if not isinstance(body, list):
            continue
        for index, stmt in enumerate(body[:-1]):
            if isinstance(stmt, TERMINATORS):
                following = body[index + 1]
                findings.append(
                    "%s:%d %s is followed by unreachable %s on line %d"
                    % (rel, stmt.lineno, type(stmt).__name__, type(following).__name__, following.lineno)
                )
    return findings


class NoUnreachableCodeTests(unittest.TestCase):
    def test_no_statements_follow_a_terminator(self) -> None:
        files = _python_files()
        self.assertGreater(len(files), 40, "file discovery found suspiciously few modules")
        findings: list[str] = []
        for path in files:
            findings.extend(_unreachable_sites(path))
        self.assertEqual(findings, [], "unreachable code found:\n  " + "\n  ".join(findings))


if __name__ == "__main__":
    unittest.main()
