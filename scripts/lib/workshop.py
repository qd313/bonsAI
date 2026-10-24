"""Title: Where the workshop folder is

Purpose: The history of the plugin (every Deck check's evidence, the saved Deck walks, the old research
    reports) lives in a second, private repo called the workshop, not in this one. Anything that saves
    or reads that kind of file needs to know where the workshop sits on this PC. This file answers that
    in one place, so no script has to guess. The answer comes from, in this order: the BONSAI_WORKSHOP
    environment variable, a BONSAI_WORKSHOP= line in the repo's own .env file (the file is not tracked),
    and finally the folder named bonsAI-workshop that sits next to the repo folder. When a script runs
    from one of the repo's own working copies (under .claude/worktrees), "the repo folder" means the main
    checkout those copies hang off, so every copy finds the same workshop.
Used for: scripts/kb/eval_kb_answers.py and scripts/kb/eval_kb_embed_models.py (their reports). The same
    answer in JavaScript is scripts/lib/workshop.mjs, used by the overnight Deck run.
Solves: Evidence files used to be written under docs/ in this repo. Now that they live in the workshop,
    each script would otherwise carry its own copy of "where is the workshop", and they would drift.
Does not: Create the workshop, clone it, or write any file in it. It only names the folders. A script
    that saves a file makes the folder it needs itself. When the workshop is missing it stops with one
    plain sentence, rather than quietly writing the file somewhere else.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Mapping, Optional

SETTING_NAME = "BONSAI_WORKSHOP"

# Folders inside the workshop. A path under docs/ in this repo loses the "docs/" there.
EVIDENCE_FOLDER = "test-evidence"
WALKS_FOLDER = "checks"
RESEARCH_FOLDER = Path("archive") / "research"

_DEFAULT_FOLDER_NAME = "bonsAI-workshop"


class WorkshopNotFound(RuntimeError):
    """The workshop folder is not where the setting (or the default place) says. The text is a full sentence."""


def default_repo_root() -> Path:
    """The repo folder this file belongs to (two levels above scripts/lib)."""
    return Path(__file__).resolve().parents[2]


def main_checkout_root(repo_root: Path) -> Path:
    """The main checkout, when repo_root is one of its working copies under .claude/worktrees/<name>."""
    parts = repo_root.parts
    for i in range(1, len(parts) - 2):
        if parts[i] == ".claude" and parts[i + 1] == "worktrees":
            return Path(*parts[:i])
    return repo_root


def read_env_file_setting(env_file: Path, name: str = SETTING_NAME) -> Optional[str]:
    """The value of NAME= in a .env file, or None. Comments, `export ` and quotes are tolerated."""
    try:
        text = env_file.read_text(encoding="utf-8")
    except OSError:
        return None
    found: Optional[str] = None
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export "):].lstrip()
        key, sep, value = line.partition("=")
        if not sep or key.strip() != name:
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        found = value
    return found or None


def _configured_value(repo_root: Path, environ: Mapping[str, str]) -> Optional[str]:
    value = (environ.get(SETTING_NAME) or "").strip()
    if value:
        return value
    for root in dict.fromkeys([repo_root, main_checkout_root(repo_root)]):
        value = read_env_file_setting(root / ".env")
        if value:
            return value
    return None


def workshop_root(repo_root: Optional[Path] = None, environ: Optional[Mapping[str, str]] = None) -> Path:
    """The workshop folder. Raises WorkshopNotFound (one plain sentence) when it is not there."""
    repo = Path(repo_root) if repo_root is not None else default_repo_root()
    env = os.environ if environ is None else environ
    configured = _configured_value(repo, env)
    if configured:
        root = Path(configured)
        if not root.is_absolute():
            raise WorkshopNotFound(
                f"{SETTING_NAME} must be an absolute folder path, but it is {configured!r}: "
                f"fix it in .env or in the environment."
            )
    else:
        root = main_checkout_root(repo).parent / _DEFAULT_FOLDER_NAME
    if not root.is_dir():
        raise WorkshopNotFound(
            f"the workshop repo was not found at {root}: clone qd313/bonsAI-workshop next to this repo, "
            f"or set {SETTING_NAME} in .env"
        )
    return root


def evidence_dir(repo_root: Optional[Path] = None, environ: Optional[Mapping[str, str]] = None) -> Path:
    """Where Deck check evidence (results, screenshots, logs, recordings) is saved."""
    return workshop_root(repo_root, environ) / EVIDENCE_FOLDER


def walks_dir(repo_root: Optional[Path] = None, environ: Optional[Mapping[str, str]] = None) -> Path:
    """Where the Deck tool's saved walks are kept and replayed from."""
    return workshop_root(repo_root, environ) / WALKS_FOLDER


def research_dir(repo_root: Optional[Path] = None, environ: Optional[Mapping[str, str]] = None) -> Path:
    """Where eval and bake-off reports are saved."""
    return workshop_root(repo_root, environ) / RESEARCH_FOLDER
