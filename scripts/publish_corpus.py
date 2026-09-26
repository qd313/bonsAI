#!/usr/bin/env python3
"""Publish a built bonsAI knowledge base corpus (maintainer PC).

Purpose: Validate a build produced by build_rag_db.py against the D20 license gate and
manifest self-consistency, then push it to the two publish targets — Hugging Face dataset
repo (git) and GitHub Releases (`gh`).
Used for: First public Phase 6 publish and every point release after it.
Solves: nothing previously stopped an NC or GFDL card, an unbaked-embeddings build, or a
manifest/file mismatch from reaching the public download path. This is the gate.
Does not: build the corpus (see build_rag_db.py), or create the Hugging Face dataset repo /
first GitHub release — those are one-time setup, see "First-time setup" below. Does not use
huggingface_hub — the corpus is under 1 MB, far below the LFS threshold, so plain `git` +
`gh` cover both hosts without a build-time dependency.

Usage:
  python scripts/publish_corpus.py --build-dir build/knowledge-base --check
  python scripts/publish_corpus.py --build-dir build/knowledge-base \\
      --hf-clone-dir ../bonsai-knowledge-base --push-hf --push-github

--check (or omitting both --push-* flags) only validates; nothing leaves the machine.

First-time setup (once, by hand — not done by this script):
  1. Create the Hugging Face dataset repo at huggingface.co/new-dataset as
     `qd313/bonsai-knowledge-base`, license `cc-by-sa-4.0`.
  2. Clone it locally: `git clone https://huggingface.co/datasets/qd313/bonsai-knowledge-base`
     — that clone's path is --hf-clone-dir on every run.
  3. `gh auth login` once if `gh release` isn't already authorized.
  4. The GitHub release tag (knowledge_base_schema.CORPUS_GITHUB_RELEASE_TAG) doesn't need to
     exist beforehand — --push-github creates it on first run and reuses it after.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import shutil
import sqlite3
import subprocess
import sys
import zlib
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
PY_MODULES = REPO_ROOT / "py_modules"
if str(PY_MODULES) not in sys.path:
    sys.path.insert(0, str(PY_MODULES))

from backend.services.knowledge_base_schema import (  # noqa: E402
    CORPUS_ATTRIBUTIONS_FILENAME,
    CORPUS_DB_FILENAME,
    CORPUS_GITHUB_RELEASE_TAG,
    CORPUS_GITHUB_REPO,
    CORPUS_HF_NAMESPACE,
    CORPUS_MANIFEST_FILENAME,
)

# D20 (docs/audit/maintainer-decisions-locked.md): the published corpus ships as one CC
# BY-SA 4.0 work. Every card's source_license must be one of these — anything else (GFDL,
# NonCommercial, an unversioned "CC BY-SA") is excluded from the seed already, but this gate
# exists so a future card someone forgets to exclude fails the *publish*, not just the review.
# CC-BY-SA-2.5 joined 2026-09-26 (plan 70) for the Skyrim notes from the Unofficial Elder Scrolls
# Pages: section 4(b) of BY-SA 2.5 lets an adaptation be shared under a later version with the
# same licence elements, so a reworded 2.5 note can ride a BY-SA 4.0 work exactly as 3.0 does.
ALLOWED_SOURCE_LICENSES = frozenset(
    {"CC-BY-4.0", "CC-BY-SA-2.5", "CC-BY-SA-3.0", "CC-BY-SA-4.0", "bonsAI-maintainer"}
)


def _load_build_rag_db():
    """Reuse licence_string_includes_version rather than re-implement it (same pattern the
    test suite already uses for this module — see tests/test_build_rag_attributions.py)."""
    path = REPO_ROOT / "scripts" / "build_rag_db.py"
    spec = importlib.util.spec_from_file_location("build_rag_db", path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fp:
        for chunk in iter(lambda: fp.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def validate_build(build_dir: Path) -> list[str]:
    """Return a list of failure messages; empty means the build is clear to publish."""
    build_rag_db = _load_build_rag_db()
    errors: list[str] = []

    manifest_path = build_dir / CORPUS_MANIFEST_FILENAME
    db_path = build_dir / CORPUS_DB_FILENAME
    attrib_path = build_dir / CORPUS_ATTRIBUTIONS_FILENAME
    if not manifest_path.is_file():
        return [f"missing {CORPUS_MANIFEST_FILENAME} in {build_dir}"]
    if not db_path.is_file():
        return [f"missing {CORPUS_DB_FILENAME} in {build_dir}"]

    manifest: dict[str, Any] = json.loads(manifest_path.read_text(encoding="utf-8"))

    # --- Embeddings must be baked; a silent keyword-only build must not ship as if hybrid ---
    if not manifest.get("embeddings_populated"):
        errors.append(
            "embeddings_populated is false — this build has no baked vectors (Ollama was "
            "probably not running when build_rag_db.py ran). Publishing this would silently "
            "disable hybrid retrieval for every user who downloads it."
        )
    if not int(manifest.get("embedding_section_count") or 0):
        errors.append("embedding_section_count is 0 — no strategy sections have vectors.")
    if not int(manifest.get("embedding_compat_count") or 0):
        errors.append("embedding_compat_count is 0 — no compat tips have vectors.")

    # --- Every note must have a vector, not just some (build_rag_db.py's own guarantee, so
    # this only fires on a manifest built with --allow-missing-embeddings, or an older manifest
    # someone hand-edited). Older manifests without the total fields are not judged here — they
    # predate this check and are caught by the two zero-count checks above if truly empty.
    section_total = manifest.get("embedding_section_total_count")
    section_indexed = int(manifest.get("embedding_section_count") or 0)
    if isinstance(section_total, int) and section_indexed < section_total:
        errors.append(
            f"embedding_section_count ({section_indexed}) is short of "
            f"embedding_section_total_count ({section_total}) — "
            f"{section_total - section_indexed} strategy section(s) have no meaning-search vector."
        )
    compat_total = manifest.get("embedding_compat_total_count")
    compat_indexed = int(manifest.get("embedding_compat_count") or 0)
    if isinstance(compat_total, int) and compat_indexed < compat_total:
        errors.append(
            f"embedding_compat_count ({compat_indexed}) is short of "
            f"embedding_compat_total_count ({compat_total}) — "
            f"{compat_total - compat_indexed} compat tip(s) have no meaning-search vector."
        )

    # --- D20 license allowlist + version requirement, read from the built DB directly ---
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    try:
        for table, url_col in (("sections", "source_url"), ("compat_patterns", "source_url")):
            rows = conn.execute(
                f"SELECT DISTINCT source_license, {url_col} FROM {table}"
            ).fetchall()
            for license_name, source_url in rows:
                license_name = license_name or ""
                if license_name not in ALLOWED_SOURCE_LICENSES:
                    errors.append(
                        f"{table}: disallowed source_license {license_name!r} "
                        f"(allowed: {sorted(ALLOWED_SOURCE_LICENSES)})"
                    )
                is_third_party = bool((source_url or "").strip())
                if is_third_party and not build_rag_db.licence_string_includes_version(license_name):
                    errors.append(
                        f"{table}: third-party source_license {license_name!r} has no version "
                        f"(source_url={source_url!r}) — this is the Combine OverWiki gap ATTR-5.2 "
                        "exists to catch."
                    )
    finally:
        conn.close()

    if not attrib_path.is_file():
        errors.append(f"missing {CORPUS_ATTRIBUTIONS_FILENAME} in {build_dir}")
    else:
        on_disk = attrib_path.read_text(encoding="utf-8")
        if manifest.get("attributions_markdown") != on_disk:
            errors.append(
                f"{CORPUS_ATTRIBUTIONS_FILENAME} on disk does not match "
                "manifest['attributions_markdown'] byte-for-byte — the client writes the "
                "manifest field verbatim and never downloads this file, so a mismatch here "
                "means the published corpus would ship different credits than reviewed."
            )

    # --- Manifest self-consistency: what a client will actually verify against ---
    chunks = manifest.get("chunks")
    if not isinstance(chunks, list) or not chunks:
        errors.append("manifest has no chunks")
    else:
        for chunk in chunks:
            fname = str(chunk.get("filename") or "")
            chunk_path = build_dir / fname
            if not chunk_path.is_file():
                errors.append(f"manifest references chunk {fname!r} not present in {build_dir}")
                continue
            expected_sha = str(chunk.get("sha256") or "")
            actual_sha = _sha256_file(chunk_path)
            if expected_sha != actual_sha:
                errors.append(
                    f"chunk {fname!r} sha256 mismatch: manifest says {expected_sha}, "
                    f"file is {actual_sha}"
                )
            try:
                decompressed = zlib.decompress(chunk_path.read_bytes())
            except zlib.error as exc:
                errors.append(f"chunk {fname!r} failed to zlib-decompress: {exc}")
                decompressed = b""
            db_sha_expected = str(manifest.get("db_sha256") or "")
            db_sha_actual = hashlib.sha256(decompressed).hexdigest()
            if db_sha_expected != db_sha_actual:
                errors.append(
                    f"manifest db_sha256 {db_sha_expected} does not match decompressed "
                    f"{fname!r} ({db_sha_actual}) — a client would refuse this after download"
                )

    urls = manifest.get("urls") if isinstance(manifest.get("urls"), dict) else {}
    hf_expected = f"https://huggingface.co/datasets/{CORPUS_HF_NAMESPACE}/resolve/main/"
    gh_expected = f"https://github.com/{CORPUS_GITHUB_REPO}/releases/download/{CORPUS_GITHUB_RELEASE_TAG}/"
    hf_url = str(urls.get("huggingface") or "")
    gh_url = str(urls.get("github_release") or "")
    if not hf_url.startswith(hf_expected):
        errors.append(f"urls.huggingface {hf_url!r} does not start with expected {hf_expected!r}")
    if not gh_url.startswith(gh_expected):
        errors.append(f"urls.github_release {gh_url!r} does not start with expected {gh_expected!r}")

    return errors


def _run(cmd: list[str], *, cwd: Path | None = None) -> None:
    print(f"$ {' '.join(cmd)}")
    subprocess.run(cmd, cwd=str(cwd) if cwd else None, check=True)


def push_to_huggingface(build_dir: Path, hf_clone_dir: Path, manifest: dict[str, Any]) -> None:
    if not (hf_clone_dir / ".git").is_dir():
        raise RuntimeError(
            f"{hf_clone_dir} is not a git clone of the HF dataset repo — see "
            "'First-time setup' in this script's docstring."
        )
    chunk_filename = str(manifest["chunks"][0]["filename"])
    for name in (chunk_filename, CORPUS_MANIFEST_FILENAME, CORPUS_ATTRIBUTIONS_FILENAME):
        shutil.copy2(build_dir / name, hf_clone_dir / name)
    version = manifest.get("version", "unknown")
    _run(["git", "add", chunk_filename, CORPUS_MANIFEST_FILENAME, CORPUS_ATTRIBUTIONS_FILENAME], cwd=hf_clone_dir)
    _run(["git", "commit", "-m", f"Corpus point release {version}"], cwd=hf_clone_dir)
    _run(["git", "push"], cwd=hf_clone_dir)


def push_to_github(build_dir: Path, manifest: dict[str, Any]) -> None:
    chunk_filename = str(manifest["chunks"][0]["filename"])
    version = manifest.get("version", "unknown")
    assets = [str(build_dir / chunk_filename), str(build_dir / CORPUS_MANIFEST_FILENAME)]
    exists = (
        subprocess.run(
            ["gh", "release", "view", CORPUS_GITHUB_RELEASE_TAG, "--repo", CORPUS_GITHUB_REPO],
            capture_output=True,
        ).returncode
        == 0
    )
    if not exists:
        _run(
            [
                "gh", "release", "create", CORPUS_GITHUB_RELEASE_TAG,
                "--repo", CORPUS_GITHUB_REPO,
                "--title", f"Knowledge base {CORPUS_GITHUB_RELEASE_TAG}",
                "--notes", "bonsAI offline knowledge base corpus. See ATTRIBUTIONS.md on the "
                "Hugging Face dataset page for licensing. Assets here are replaced in place "
                "on each point release — the tag itself does not change.",
                *assets,
            ]
        )
    else:
        _run(
            ["gh", "release", "upload", CORPUS_GITHUB_RELEASE_TAG, "--repo", CORPUS_GITHUB_REPO,
             "--clobber", *assets]
        )
    print(f"[bonsAI] GitHub release {CORPUS_GITHUB_RELEASE_TAG} now serves version {version}.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--build-dir", type=Path, required=True, help="Output of build_rag_db.py --seed")
    parser.add_argument("--check", action="store_true", help="Validate only (default if no --push-* flag given)")
    parser.add_argument("--push-hf", action="store_true", help="Push to the Hugging Face dataset repo")
    parser.add_argument("--push-github", action="store_true", help="Push to the GitHub Releases mirror")
    parser.add_argument("--hf-clone-dir", type=Path, help="Local git clone of the HF dataset repo (required with --push-hf)")
    args = parser.parse_args()

    build_dir: Path = args.build_dir
    errors = validate_build(build_dir)
    if errors:
        print(f"[bonsAI] {len(errors)} problem(s) found — refusing to publish {build_dir}:")
        for err in errors:
            print(f"  - {err}")
        return 1
    print(f"[bonsAI] {build_dir} passes the D20 license gate and manifest self-consistency check.")

    if not args.push_hf and not args.push_github:
        return 0

    manifest = json.loads((build_dir / CORPUS_MANIFEST_FILENAME).read_text(encoding="utf-8"))

    if args.push_hf:
        if not args.hf_clone_dir:
            print("[bonsAI] --push-hf requires --hf-clone-dir.")
            return 1
        push_to_huggingface(build_dir, args.hf_clone_dir, manifest)

    if args.push_github:
        push_to_github(build_dir, manifest)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
