"""Title: Plugin zip corpus guard

Purpose: Fail a release (or a planted staging tree) if knowledge-base corpus files are bundled.
Used for: scripts/verify-decky-plugin-zip.sh and unit tests (ATTR-4.2).
Solves: Apache-2.0 plugin zip must not include CC BY / BY-SA corpus material or the game notes
    in data/kb/ it is built from.
Does not: Build the corpus, verify ATTRIBUTIONS.md content, or download HF assets.
"""

from __future__ import annotations

import argparse
import sys
import zipfile
from pathlib import Path

# Basenames that belong only in a separately distributed knowledge-base package, or in the
# repo's data/kb/ folder the library is built from (CC BY-SA / CC BY game notes; see
# data/kb/NOTICE.md). All compared case-insensitively.
FORBIDDEN_CORPUS_BASENAMES = frozenset(
    {
        "corpus.db",
        "corpus.db.zlib",
        "corpus-manifest.json",
        "attributions.md",
        "strategy_seed.json",
        "compat_patterns.json",
    }
)


def is_forbidden_corpus_basename(name: str) -> bool:
    return Path(name).name.lower() in FORBIDDEN_CORPUS_BASENAMES


def find_forbidden_corpus_paths(root: Path) -> list[str]:
    """Return relative paths under ``root`` whose basenames are corpus artifacts."""
    root = root.resolve()
    hits: list[str] = []
    if not root.is_dir():
        return hits
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if is_forbidden_corpus_basename(path.name):
            hits.append(str(path.relative_to(root)).replace("\\", "/"))
    return sorted(hits)


def find_forbidden_corpus_paths_in_zip(zip_path: Path) -> list[str]:
    """Return zip member paths whose basenames are corpus artifacts."""
    hits: list[str] = []
    with zipfile.ZipFile(zip_path, "r") as zf:
        for info in zf.infolist():
            if info.is_dir():
                continue
            name = info.filename.replace("\\", "/")
            if is_forbidden_corpus_basename(Path(name).name):
                hits.append(name)
    return sorted(hits)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Fail if a plugin tree or zip contains knowledge-base corpus files (ATTR-4.2)."
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--dir", type=Path, help="Unpacked plugin root (or staging dir)")
    group.add_argument("--zip", type=Path, help="Plugin distributable zip")
    args = parser.parse_args(argv)

    if args.dir is not None:
        if not args.dir.is_dir():
            print(f"plugin_zip_corpus_guard: not a directory: {args.dir}", file=sys.stderr)
            return 2
        hits = find_forbidden_corpus_paths(args.dir)
        label = str(args.dir)
    else:
        if not args.zip.is_file():
            print(f"plugin_zip_corpus_guard: not a file: {args.zip}", file=sys.stderr)
            return 2
        hits = find_forbidden_corpus_paths_in_zip(args.zip)
        label = str(args.zip)

    if hits:
        print(
            "plugin_zip_corpus_guard: knowledge-base corpus files must not ship in the plugin "
            f"package ({label}):",
            file=sys.stderr,
        )
        for h in hits:
            print(f"  {h}", file=sys.stderr)
        print(
            "Corpus is a separate download; see NOTICE and ATTRIBUTIONS.md in the corpus package.",
            file=sys.stderr,
        )
        return 1

    print(f"plugin_zip_corpus_guard: OK (no corpus files in {label})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
