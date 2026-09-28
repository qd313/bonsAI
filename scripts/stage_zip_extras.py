"""Title: Stage the extra files the release zip must carry

Purpose: Copy NOTICE and the runtime data files the back end reads into `defaults/`
    right before `decky plugin build`, so they land in the zip's plugin folder.
Used for: .github/workflows/build-plugin-zip.yml (the step before "Build plugin zip"),
    scripts/build.sh (release), and by hand before any local zip build.
Solves: Decky's build tool packs a fixed list -- dist, bin, py_modules, the contents of
    defaults/, LICENSE, README.md, main.py, package.json, plugin.json and top-level *.py
    (SteamDeckHomebrew/cli, src/cli/plugin/build.rs). Anything else is silently left out.
    Before this step the zip had no NOTICE (the BSD-3 template notice must travel with
    binary copies) and no data/ folder, so a fresh install lost the settings-search word
    lists and refused every jump target, while the development deploy (scripts/build.sh
    copies data/) never showed it.
Does not: Copy data/kb/ -- the game notes there are CC BY-SA, not Apache, and belong only
    in the separately published library. `stage` refuses any path under it, and the corpus
    guard runs over the staged tree to hold that line.
"""

from __future__ import annotations

import argparse
import importlib.util
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]

# Everything the back end reads from `<plugin root>/data/` at run time
# (py_modules/backend/services/intent_pack_service.py). Add a path here when the
# back end starts reading a new one; tests/test_stage_zip_extras.py checks the
# staged tree actually satisfies the loaders.
RUNTIME_DATA = (
    "data/settings-search-targets.json",
    "data/intent-packs",
)
TOP_LEVEL_FILES = ("NOTICE",)

# Game notes: CC BY-SA / CC BY, shipped only in the separately published library.
NEVER_STAGE_PREFIX = "data/kb"


def _load_guard():
    path = REPO_ROOT / "scripts" / "plugin_zip_corpus_guard.py"
    spec = importlib.util.spec_from_file_location("plugin_zip_corpus_guard", path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def stage(dest: Path, repo_root: Path = REPO_ROOT) -> list[str]:
    """Copy the extras into `dest`; return the staged paths, relative to `dest`.

    A folder entry is cleared in `dest` first, so a word list removed from the repo does
    not linger from an earlier run and ship anyway.
    """
    for rel in RUNTIME_DATA:
        norm = rel.replace("\\", "/").rstrip("/")
        if norm == NEVER_STAGE_PREFIX or norm.startswith(NEVER_STAGE_PREFIX + "/"):
            raise ValueError(f"stage_zip_extras: {rel} holds game notes and must never ship")
    staged: list[str] = []
    dest.mkdir(parents=True, exist_ok=True)
    for name in TOP_LEVEL_FILES:
        shutil.copy2(repo_root / name, dest / name)
        staged.append(name)
    for rel in RUNTIME_DATA:
        src = repo_root / rel
        out = dest / rel
        if src.is_dir():
            if out.exists():
                shutil.rmtree(out)
            out.mkdir(parents=True)
            for f in sorted(src.glob("*.json")):
                shutil.copy2(f, out / f.name)
                staged.append(f"{rel}/{f.name}")
        else:
            out.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, out)
            staged.append(rel)
    return staged


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("dest", nargs="?", type=Path, default=REPO_ROOT / "defaults",
                        help="Folder decky packs into the plugin root (default: defaults/)")
    args = parser.parse_args(argv)
    staged = stage(args.dest)
    hits = _load_guard().find_forbidden_corpus_paths(args.dest)
    if hits:
        print(f"stage_zip_extras: refusing, game-note files staged: {hits}", file=sys.stderr)
        return 1
    print(f"stage_zip_extras: staged {len(staged)} files into {args.dest}")
    for rel in staged:
        print(f"  {rel}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
