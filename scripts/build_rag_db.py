#!/usr/bin/env python3
"""Build the bonsAI on-Deck knowledge base corpus (maintainer PC).

Creates SQLite + FTS5 (+ optional vector placeholders), compresses for distribution,
and emits corpus-manifest.json + ATTRIBUTIONS.md. Corpus is never committed to git.

Usage:
  python scripts/build_rag_db.py --seed --out ./build/knowledge-base
  python scripts/build_rag_db.py --out ./build/knowledge-base   # scaffold only (no crawl in v1)

Output goes under ``build/``, not ``dist/``: ``npm run build`` clears ``dist/``, so a corpus
built there was deleted by the next plugin build with no warning.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sqlite3
import sys
import urllib.request
import zlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
PY_MODULES = REPO_ROOT / "py_modules"
KB_DATA_DIR = REPO_ROOT / "data" / "kb"
if str(PY_MODULES) not in sys.path:
    sys.path.insert(0, str(PY_MODULES))

from backend.services.knowledge_base_schema import (  # noqa: E402
    CORPUS_ATTRIBUTIONS_FILENAME,
    CORPUS_DB_FILENAME,
    CORPUS_GITHUB_RELEASE_TAG,
    CORPUS_GITHUB_REPO,
    CORPUS_HF_NAMESPACE,
    CORPUS_MANIFEST_FILENAME,
    CORPUS_SCHEMA_VERSION,
    DEFAULT_EMBEDDING_DIM,
    DEFAULT_EMBEDDING_MODEL,
    EMBEDDING_VARIANT,
    apply_schema,
    normalize_alias,
    pack_embedding_vector,
    write_manifest,
)
from backend.services.ollama_embed_service import format_embed_document  # noqa: E402
from backend.services.transparency_service import build_attribution_entries  # noqa: E402

MAINTAINER_LICENSE = "bonsAI-maintainer"

# Licence strings as stored on cards → deed URL (ATTR-2.2). ATTR-5.2 will later refuse an
# unversioned "CC BY-SA" reaching a published corpus.
_LICENSE_DEED_URLS: dict[str, str] = {
    "CC-BY-4.0": "https://creativecommons.org/licenses/by/4.0/",
    "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
    "CC-BY-SA-2.5": "https://creativecommons.org/licenses/by-sa/2.5/",
    "CC BY-SA 2.5": "https://creativecommons.org/licenses/by-sa/2.5/",
    "CC-BY-SA-3.0": "https://creativecommons.org/licenses/by-sa/3.0/",
    "CC BY-SA 3.0": "https://creativecommons.org/licenses/by-sa/3.0/",
    "CC-BY-SA-4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
    "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
    "GFDL": "https://www.gnu.org/licenses/fdl-1.3.html",
    "GNU Free Documentation License": "https://www.gnu.org/licenses/fdl-1.3.html",
}


def licence_deed_url(license_name: str) -> str:
    """Map a per-card ``source_license`` to a human-readable deed URL."""
    raw = str(license_name or "").strip()
    if not raw or raw == MAINTAINER_LICENSE:
        return ""
    if raw in _LICENSE_DEED_URLS:
        return _LICENSE_DEED_URLS[raw]
    key = raw.upper().replace("_", "-")
    compact = key.replace(" ", "")
    for name, url in _LICENSE_DEED_URLS.items():
        if name.upper().replace(" ", "").replace("_", "-") == compact:
            return url
    if "BY-SA" in compact or "BYSA" in compact:
        return "https://creativecommons.org/licenses/by-sa/4.0/"
    if compact.startswith("CC-BY") or compact.startswith("CCBY"):
        return "https://creativecommons.org/licenses/by/4.0/"
    if "GFDL" in compact or "FREE DOCUMENTATION" in key:
        return "https://www.gnu.org/licenses/fdl-1.3.html"
    return ""


def licence_string_includes_version(license_name: str) -> bool:
    """True when a third-party ``source_license`` names a version (ATTR-5.2).

    Bare ``CC BY-SA`` / ``CC-BY-SA`` (no version) must not reach a published corpus — that was
    the Combine OverWiki ``api.php`` gap. ``GFDL`` is accepted as a named licence (deed maps to
    FDL 1.3). Maintainer licence is not third-party and returns True (N/A).
    """
    raw = str(license_name or "").strip()
    if not raw or raw == MAINTAINER_LICENSE:
        return True
    if re.fullmatch(r"CC[\s\-]?BY[\s\-]?SA", raw, flags=re.IGNORECASE):
        return False
    if re.fullmatch(r"CC[\s\-]?BY", raw, flags=re.IGNORECASE):
        return False
    compact = re.sub(r"[\s_\-]+", "", raw.upper())
    if "GFDL" in compact or "FREEDOCUMENTATION" in compact:
        return True
    return bool(re.search(r"\d", raw))


def _card_title(game_title: str, section_name: str) -> str:
    game = str(game_title or "").strip()
    name = str(section_name or "").strip()
    if game and name:
        return f"{game} — {name}"
    return game or name


def collect_third_party_attribution_sources(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    """Rows shaped for ``build_attribution_entries`` (title / url / license / captured)."""
    sources: list[dict[str, Any]] = []
    for title, name, url, license_name, crawled in conn.execute(
        "SELECT g.canonical_title, s.name, s.source_url, s.source_license, s.crawled_at "
        "FROM sections s "
        "JOIN games g ON g.game_id = s.game_id "
        "ORDER BY g.canonical_title, s.name"
    ):
        url_s = str(url or "").strip()
        if not url_s:
            continue
        sources.append(
            {
                "title": _card_title(str(title or ""), str(name or "")),
                "url": url_s,
                "license": str(license_name or "").strip(),
                "captured": crawled,
            }
        )
    for topic, url, license_name in conn.execute(
        "SELECT topic, source_url, source_license FROM compat_patterns ORDER BY topic"
    ):
        url_s = str(url or "").strip()
        if not url_s:
            continue
        sources.append(
            {
                "title": f"Compat — {str(topic or '').strip() or 'tip'}",
                "url": url_s,
                "license": str(license_name or "").strip(),
                "captured": "",
            }
        )
    return sources


def _maintainer_strategy_titles(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute(
        "SELECT g.canonical_title, s.name "
        "FROM sections s "
        "JOIN games g ON g.game_id = s.game_id "
        "WHERE TRIM(COALESCE(s.source_url, '')) = '' "
        "ORDER BY g.canonical_title, s.name"
    ).fetchall()
    return [_card_title(str(t or ""), str(n or "")) for t, n in rows if str(t or n).strip()]


def _attributions_header_lines() -> list[str]:
    """Redistribution / accuracy header for ATTRIBUTIONS.md (ATTR-3.1 / 3.2)."""
    return [
        "# bonsAI Knowledge Base — Attributions",
        "",
        "This file is **generated from the corpus database** at build time. Editing it by hand",
        "will be overwritten on the next `build_rag_db.py` run.",
        "",
        "## May I redistribute this corpus?",
        "",
        "**Yes, under the licence of each card — not under the bonsAI plugin licence.**",
        "",
        "- The **plugin** is Apache-2.0. This corpus is a **separate download** and is **not**",
        "  Apache-2.0. Do not treat the plugin zip and the corpus as one combined work.",
        "- Strategy and tip cards that name a third-party source are **adaptations** of that",
        "  source, distilled for Deck Q&A — not verbatim wiki pages.",
        "- **Each card carries its own licence** in the database column `source_license`",
        "  (queryable; also listed below per source). That per-card licence is what actually",
        "  governs what you may do with an individual card.",
        "- **ShareAlike (CC BY-SA / GFDL) cards:** if you adapt or redistribute those cards,",
        "  ShareAlike (or GFDL) binds *your* adaptation of them. Attribution must name the",
        "  source site, the licence, and a link to the material (see the groups below).",
        "- **CC BY cards:** redistribution and adaptation are allowed with attribution under",
        "  that BY deed (no ShareAlike obligation from that card alone).",
        "- **Maintainer-authored** cards (`bonsAI-maintainer`, no `source_url`) credit nobody",
        "  beyond bonsAI; they are not third-party licensed material.",
        "- **Publish policy (D20):** the published corpus is distributed as one work under",
        "  **CC BY-SA 4.0** (the umbrella label required by dataset hosts) — this does not",
        "  replace the per-card terms above; a card's own licence still governs reuse of that",
        "  card specifically. GFDL and NonCommercial sources are excluded outright: GFDL does",
        "  not mix with Creative Commons, and NC does not mix with ShareAlike redistribution.",
        "",
        "## Accuracy",
        "",
        "Wiki and community sources can be wrong; so can our distillation of them. Cards are",
        "**distilled, not authoritative.** When something is wrong, we **fix forward** in a",
        "later corpus point release rather than treating any card as canonical game truth.",
        "",
        "## Third-party sources",
        "",
    ]


def format_attributions_markdown(conn: sqlite3.Connection) -> str:
    """Build ATTRIBUTIONS.md body from the live corpus connection (ATTR-2 / 3)."""
    entries = sorted(
        build_attribution_entries(collect_third_party_attribution_sources(conn)),
        key=lambda e: (e.get("source") or "", e.get("license") or ""),
    )

    lines: list[str] = _attributions_header_lines()
    if not entries:
        lines.append("_No third-party sourced cards in this build._")
        lines.append("")
    else:
        for entry in entries:
            source = str(entry.get("source") or "").strip()
            license_name = str(entry.get("license") or "").strip() or "(unspecified)"
            page_url = str(entry.get("url") or "").strip()
            deed = licence_deed_url(license_name)
            captured = str(entry.get("captured") or "").strip()
            lines.append(f"### {source} · {license_name}")
            lines.append("")
            if deed:
                lines.append(f"- Licence: [{license_name}]({deed})")
            else:
                lines.append(f"- Licence: {license_name}")
            if page_url:
                lines.append(f"- Example page: {page_url}")
            if captured:
                lines.append(f"- Oldest capture in this group: {captured}")
            cards = entry.get("cards") or []
            if cards:
                lines.append("- Cards:")
                for card in cards:
                    lines.append(f"  - {card}")
            lines.append("")

    maintainer_titles = _maintainer_strategy_titles(conn)
    compat_n = int(
        conn.execute(
            "SELECT COUNT(*) FROM compat_patterns WHERE TRIM(COALESCE(source_url, '')) = ''"
        ).fetchone()[0]
    )
    genre_n = int(conn.execute("SELECT COUNT(*) FROM genre_patterns").fetchone()[0])

    lines.extend(
        [
            "## Maintainer-authored",
            "",
            "These cards have no third-party `source_url` and credit nobody beyond bonsAI.",
            "",
        ]
    )
    if maintainer_titles:
        lines.append(f"### Strategy cards ({len(maintainer_titles)})")
        lines.append("")
        for title in maintainer_titles:
            lines.append(f"- {title}")
        lines.append("")
    if compat_n:
        lines.append(f"- Shared troubleshooting tips: {compat_n} (`{MAINTAINER_LICENSE}`)")
    if genre_n:
        lines.append(f"- Genre pattern entries: {genre_n} (`{MAINTAINER_LICENSE}`)")
    if not maintainer_titles and not compat_n and not genre_n:
        lines.append("_None in this build._")
    lines.append("")
    lines.append(
        "Per-reply attribution also appears in Input transparency when third-party cards "
        "are injected."
    )
    lines.append("")
    return "\n".join(lines)


def write_attributions(conn: sqlite3.Connection, out_dir: Path) -> str:
    """Write ATTRIBUTIONS.md from ``conn``; return the exact text stored (ATTR-2.3)."""
    text = format_attributions_markdown(conn)
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / CORPUS_ATTRIBUTIONS_FILENAME).write_text(text, encoding="utf-8")
    return text


def _list_installed_ollama_tags(base_http: str, timeout_seconds: float = 5.0) -> list[str]:
    url = f"{base_http.rstrip('/')}/api/tags"
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        models = data.get("models") if isinstance(data, dict) else None
        if not isinstance(models, list):
            return []
        tags: list[str] = []
        for m in models:
            if isinstance(m, dict):
                name = str(m.get("name") or "").strip()
                if name:
                    tags.append(name)
        return tags
    except Exception:
        return []


DEFAULT_BUILD_OLLAMA_BASE = "http://127.0.0.1:11434"

# One request per 16 rows rather than one request for the entire corpus. A single request
# scales badly with corpus depth (Phase 5 takes the seed from 22 sections to ~100+), gives no
# progress, and cannot resume.
EMBED_BATCH_SIZE = 16


class _BuildEmbedError(Exception):
    pass


def _embed_texts_build(
    base_http: str,
    texts: list[str],
    *,
    model: str,
    timeout_s: float,
) -> list[list[float]]:
    url = f"{base_http.rstrip('/')}/api/embed"
    payload = {"model": model, "input": texts[0] if len(texts) == 1 else texts}
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    embeddings = data.get("embeddings") if isinstance(data, dict) else None
    if not isinstance(embeddings, list) or len(embeddings) != len(texts):
        raise _BuildEmbedError("invalid embed response")
    return [[float(x) for x in item] for item in embeddings]


def _utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fp:
        for chunk in iter(lambda: fp.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _load_json(path: Path) -> Any:
    with open(path, "r", encoding="utf-8") as fp:
        return json.load(fp)


def _seed_compat_patterns(conn: sqlite3.Connection) -> int:
    path = KB_DATA_DIR / "compat_patterns.json"
    if not path.is_file():
        return 0
    rows = _load_json(path)
    if not isinstance(rows, list):
        return 0
    conn.executemany(
        "INSERT INTO compat_patterns(pattern_id, topic, platforms, card, source_url, "
        "source_license, app_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
            (
                int(r["pattern_id"]),
                str(r["topic"]),
                json.dumps(r.get("platforms") or []),
                str(r["card"]),
                str(r.get("source_url") or ""),
                str(r.get("source_license") or ""),
                # D29: null for every shared tip (all but a handful today). A per-game row's
                # own key -- the Steam AppID it names in strategy_seed.json's `games` table,
                # or that title's igdb_id when it has no Steam AppID at all.
                (str(r["app_id"]).strip() or None) if r.get("app_id") is not None else None,
            )
            for r in rows
        ],
    )
    return len(rows)


STARTING_OUT_KIND = "starting_out"
_STARTING_OUT_NAME_PREFIX = "Starting out in"


def mistyped_starting_out_rows(sections: list[dict]) -> list[str]:
    """Names of rows called "Starting out in ..." that are not typed ``starting_out`` (D65).

    Helpers writing a new game's notes may still file these as `mechanic` (the kind
    `starting_out` replaces) while this lands elsewhere -- this check catches any left that
    way before the corpus builds, so a re-typing pass is never skipped by accident.
    """
    return sorted(
        str(s.get("name") or f"section {s.get('section_id')}")
        for s in sections
        if str(s.get("name") or "").startswith(_STARTING_OUT_NAME_PREFIX)
        and str(s.get("section_type") or "") != STARTING_OUT_KIND
    )


def _seed_strategy_corpus(conn: sqlite3.Connection) -> None:
    path = KB_DATA_DIR / "strategy_seed.json"
    if not path.is_file():
        seed_sample_corpus_legacy(conn)
        return
    data = _load_json(path)
    games = data.get("games") or []
    conn.executemany(
        "INSERT INTO games(game_id, app_id, igdb_id, canonical_title, edition, platform, genres) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
            (
                int(g["game_id"]),
                g.get("app_id"),
                g.get("igdb_id"),
                str(g["canonical_title"]),
                g.get("edition"),
                g.get("platform"),
                json.dumps(g.get("genres") or []),
            )
            for g in games
        ],
    )
    aliases = data.get("aliases") or []
    conn.executemany(
        "INSERT INTO aliases(alias_normalized, game_id) VALUES (?, ?)",
        [(normalize_alias(str(a["alias"])), int(a["game_id"])) for a in aliases],
    )
    sections = data.get("sections") or []
    # A third-party row must state when its text was captured -- the snapshot date of the
    # archive.org dump it was distilled from, or the day the live wiki was read. That date is
    # licensing-relevant: it is what ATTRIBUTIONS reports as "Oldest capture in this group".
    # Refuse to guess it. Stamping build time here would relabel 2020 wiki text with today's
    # date on every rebuild, which is exactly the staleness the reader needs to see -- and it
    # would make the corpus unreproducible, since the bytes would change on every build.
    undated = sorted(
        str(s.get("name") or f"section {s.get('section_id')}")
        for s in sections
        if str(s.get("source_url") or "").strip() and not str(s.get("crawled_at") or "").strip()
    )
    if undated:
        raise SystemExit(
            "strategy_seed.json: these rows cite a source_url but no crawled_at, so their "
            "capture date cannot be attributed: " + ", ".join(undated)
        )
    mistyped = mistyped_starting_out_rows(sections)
    if mistyped:
        raise SystemExit(
            "strategy_seed.json: these rows are named \"Starting out in ...\" but are not "
            f"typed {STARTING_OUT_KIND!r} -- re-type their section_type before this build: "
            + ", ".join(mistyped)
        )
    conn.executemany(
        "INSERT INTO sections(section_id, game_id, section_type, name, card, source_url, "
        "source_license, source_version, crawled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
            (
                int(s["section_id"]),
                int(s["game_id"]),
                str(s["section_type"]),
                str(s["name"]),
                str(s["card"]),
                str(s.get("source_url") or ""),
                str(s.get("source_license") or ""),
                s.get("source_version"),
                # Maintainer-authored rows were never crawled from anywhere, so they carry no
                # capture date. Both readers of this column already treat empty as "no source"
                # (see collect_third_party_attribution_sources, which skips url-less rows).
                str(s.get("crawled_at") or ""),
            )
            for s in sections
        ],
    )
    genre_patterns = data.get("genre_patterns") or []
    conn.executemany(
        "INSERT INTO genre_patterns(pattern_id, genre_tags, card, source_license) VALUES (?, ?, ?, ?)",
        [
            (
                int(p["pattern_id"]),
                str(p["genre_tags"]),
                str(p["card"]),
                str(p.get("source_license") or ""),
            )
            for p in genre_patterns
        ],
    )


def seed_sample_corpus_legacy(conn: sqlite3.Connection) -> None:
    """Fallback when strategy_seed.json is missing."""
    # Maintainer-authored rows, no third-party source -- so no capture date to record.
    crawled = ""
    games = [
        (1, None, "emudeck-oot-n64", "The Legend of Zelda: Ocarina of Time", "N64", "Nintendo 64", '["action-adventure"]'),
        (
            2,
            "2321470",
            None,
            "Deep Rock Galactic: Survivor",
            "PC",
            "Steam",
            '["bullet-heaven","roguelike","action"]',
        ),
    ]
    conn.executemany(
        "INSERT INTO games(game_id, app_id, igdb_id, canonical_title, edition, platform, genres) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        games,
    )
    aliases = [
        (normalize_alias("ocarina of time"), 1),
        (normalize_alias("oot"), 1),
        (normalize_alias("ship of harkinian"), 1),
        (normalize_alias("deep rock galactic survivor"), 2),
    ]
    conn.executemany(
        "INSERT INTO aliases(alias_normalized, game_id) VALUES (?, ?)",
        aliases,
    )
    sections = [
        (
            1,
            1,
            "boss",
            "Queen Gohma",
            "Weak point: the giant eye. Stun it, then strike the eye directly.",
            "",
            "bonsAI-maintainer",
            "seed-1.0",
            crawled,
        ),
        (
            3,
            2,
            "boss",
            "Glyphid Dreadnought",
            "Kite the Dreadnought between waves.",
            "",
            "bonsAI-maintainer",
            "seed-1.0",
            crawled,
        ),
    ]
    conn.executemany(
        "INSERT INTO sections(section_id, game_id, section_type, name, card, source_url, "
        "source_license, source_version, crawled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        sections,
    )


def seed_sample_corpus(conn: sqlite3.Connection) -> None:
    """Seed dev/sample rows: 11-title strategy mix + shared compat tip sheet."""
    _seed_strategy_corpus(conn)
    tip_count = _seed_compat_patterns(conn)
    if tip_count == 0:
        conn.execute(
            "INSERT INTO compat_patterns(pattern_id, topic, platforms, card, source_url, source_license) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (
                1,
                "proton",
                json.dumps(["deck", "linux"]),
                "Common Deck Proton steps: verify Proton Experimental, clear shader cache, check ProtonDB.",
                "",
                "bonsAI-maintainer",
            ),
        )
    conn.commit()


def compress_db(db_path: Path) -> Path:
    """zlib-compress corpus.db for release chunks (stdlib; Deck decompresses with zlib)."""
    out = db_path.with_suffix(db_path.suffix + ".zlib")
    data = db_path.read_bytes()
    out.write_bytes(zlib.compress(data, level=9))
    return out


def _populate_vectors_for_table(
    conn: sqlite3.Connection,
    *,
    table: str,
    id_column: str,
    select_sql: str,
    ollama_base: str = DEFAULT_BUILD_OLLAMA_BASE,
    model: str = DEFAULT_EMBEDDING_MODEL,
    timeout_s: float = 120.0,
) -> tuple[int, int]:
    """Embed the rows ``select_sql`` names. Returns ``(populated, total)``.

    ``populated`` can fall short of ``total`` three ways, and the caller (``build_corpus``)
    decides whether that shortfall is acceptable: the embedding model is not installed
    (populated stays 0), the run stops partway through (host/network failure after at least
    one batch landed), or one row's vector comes back the wrong size and is skipped. ``total``
    is read before any of those checks so a caller can always compute how many are missing.
    """
    rows = conn.execute(select_sql).fetchall()
    total = len(rows)
    if not rows:
        return 0, 0

    tags = _list_installed_ollama_tags(ollama_base, timeout_seconds=5.0)
    model_l = model.lower()
    if not any(t.lower() == model_l or t.lower().startswith(f"{model_l}:") for t in tags):
        print(f"Skipping {table} embeddings: {model} not installed on {ollama_base}", file=sys.stderr)
        return 0, total

    populated = 0
    cleared = False
    print(f"Embedding {total} rows for {table} (batch {EMBED_BATCH_SIZE})...", file=sys.stderr)

    for start in range(0, total, EMBED_BATCH_SIZE):
        batch = rows[start : start + EMBED_BATCH_SIZE]
        # Document task prefix — must stay paired with format_embed_query() at retrieval
        # time. The pairing is what EMBEDDING_VARIANT in the manifest records.
        texts = [format_embed_document(f"{row[1]}\n{row[2]}", model=model) for row in batch]
        try:
            vectors = _embed_texts_build(
                ollama_base,
                texts,
                model=model,
                timeout_s=timeout_s,
            )
        except (_BuildEmbedError, OSError, urllib.error.URLError) as exc:
            if not cleared:
                # Nothing has been deleted yet, so the corpus keeps whatever vectors it had.
                print(f"Skipping {table} embeddings: {exc}", file=sys.stderr)
                return 0, total
            print(
                f"WARNING: {table} embeddings stopped after {populated}/{total} rows: {exc}\n"
                f"         The table is now partially populated. Re-run the build.",
                file=sys.stderr,
            )
            conn.commit()
            return populated, total

        # Clear only once the host has actually answered. The previous code deleted the whole
        # table before the single embed request, so any failure wiped existing vectors and
        # left nothing to fall back on.
        if not cleared:
            conn.execute(f"DELETE FROM {table}")
            cleared = True

        for row, vector in zip(batch, vectors):
            if len(vector) != DEFAULT_EMBEDDING_DIM:
                print(
                    f"Skipping {table} {row[0]}: expected dim {DEFAULT_EMBEDDING_DIM}, "
                    f"got {len(vector)}",
                    file=sys.stderr,
                )
                continue
            conn.execute(
                f"INSERT INTO {table}({id_column}, embedding) VALUES (?, ?)",
                (int(row[0]), pack_embedding_vector(vector)),
            )
            populated += 1
        conn.commit()
        print(f"  {table}: {min(start + EMBED_BATCH_SIZE, total)}/{total}", file=sys.stderr)

    return populated, total


def populate_section_vectors(
    conn: sqlite3.Connection,
    *,
    ollama_base: str = DEFAULT_BUILD_OLLAMA_BASE,
    model: str = DEFAULT_EMBEDDING_MODEL,
    timeout_s: float = 120.0,
) -> tuple[int, int]:
    """Embed section cards when local Ollama has ``model``; returns (populated, total)."""
    return _populate_vectors_for_table(
        conn,
        table="section_vectors",
        id_column="section_id",
        select_sql="SELECT section_id, name, card FROM sections ORDER BY section_id",
        ollama_base=ollama_base,
        model=model,
        timeout_s=timeout_s,
    )


def populate_compat_vectors(
    conn: sqlite3.Connection,
    *,
    ollama_base: str = DEFAULT_BUILD_OLLAMA_BASE,
    model: str = DEFAULT_EMBEDDING_MODEL,
    timeout_s: float = 120.0,
) -> tuple[int, int]:
    """Embed compat tip cards; returns (populated, total)."""
    return _populate_vectors_for_table(
        conn,
        table="compat_pattern_vectors",
        id_column="pattern_id",
        select_sql="SELECT pattern_id, topic, card FROM compat_patterns ORDER BY pattern_id",
        ollama_base=ollama_base,
        model=model,
        timeout_s=timeout_s,
    )


def build_corpus(out_dir: Path, *, seed: bool, allow_missing_embeddings: bool = False) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    db_path = out_dir / CORPUS_DB_FILENAME
    if db_path.exists():
        db_path.unlink()

    conn = sqlite3.connect(str(db_path))
    attributions_text = ""
    embeddings_populated = False
    embedding_section_count = 0
    embedding_compat_count = 0
    section_total = 0
    compat_total = 0
    refusal: str | None = None
    try:
        apply_schema(conn)
        if seed:
            seed_sample_corpus(conn)
        conn.execute("INSERT INTO sections_fts(sections_fts) VALUES('rebuild')")
        conn.execute("INSERT INTO compat_patterns_fts(compat_patterns_fts) VALUES('rebuild')")
        embedding_section_count, section_total = populate_section_vectors(conn)
        embedding_compat_count, compat_total = populate_compat_vectors(conn)
        embeddings_populated = embedding_section_count > 0 or embedding_compat_count > 0
        conn.commit()

        section_missing = section_total - embedding_section_count
        compat_missing = compat_total - embedding_compat_count
        missing_count = section_missing + compat_missing
        if missing_count > 0 and not allow_missing_embeddings:
            # A note or tip with no meaning-search vector ships silently otherwise — see the
            # three ways this happens in _populate_vectors_for_table's docstring. Refuse rather
            # than warn: the maintainer decides with --allow-missing-embeddings, not a scrollback
            # line nobody reads.
            refusal = (
                f"{missing_count} card(s) would ship with no meaning-search vector "
                f"({section_missing} section(s), {compat_missing} compat tip(s)). "
                "Install the embedding model and re-run, or pass --allow-missing-embeddings "
                "to build anyway."
            )

        if refusal is None:
            # Generate attributions while the connection is open (ATTR-2.1). Write the file
            # after VACUUM so a failed vacuum cannot leave a half-built ATTRIBUTIONS.md beside
            # a missing DB.
            attributions_text = format_attributions_markdown(conn)
            # Ship a single self-contained file. The schema opens WAL, so without this the tail
            # of the corpus can sit in a -wal that is not part of the release, and the Deck now
            # opens the DB with immutable=1, which ignores a WAL outright. DELETE mode folds it
            # back in; VACUUM then reclaims the space the build churned.
            conn.execute("PRAGMA journal_mode=DELETE")
            conn.isolation_level = None  # VACUUM cannot run inside sqlite3's implicit transaction
            conn.execute("VACUUM")
    finally:
        conn.close()

    if refusal is not None:
        if db_path.exists():
            db_path.unlink()
        raise SystemExit(refusal)

    if not attributions_text:
        raise RuntimeError("corpus build finished without generating ATTRIBUTIONS.md")

    (out_dir / CORPUS_ATTRIBUTIONS_FILENAME).write_text(attributions_text, encoding="utf-8")

    compressed = compress_db(db_path)
    db_sha = _sha256_file(str(db_path))
    chunk_sha = _sha256_file(str(compressed))
    version = datetime.now(timezone.utc).strftime("%Y.%m.%d")

    manifest = {
        "version": version,
        "schema_version": CORPUS_SCHEMA_VERSION,
        "embedding_model": DEFAULT_EMBEDDING_MODEL,
        "embedding_dim": DEFAULT_EMBEDDING_DIM,
        "embedding_variant": EMBEDDING_VARIANT,
        "embeddings_populated": embeddings_populated,
        "embedding_section_count": embedding_section_count,
        "embedding_compat_count": embedding_compat_count,
        # Recorded either way (whether zero or not) so a corpus built with
        # --allow-missing-embeddings is still honest about what it is missing.
        "embedding_section_total_count": section_total,
        "embedding_compat_total_count": compat_total,
        "embedding_missing_count": section_total - embedding_section_count
        + (compat_total - embedding_compat_count),
        "db_filename": CORPUS_DB_FILENAME,
        "db_sha256": db_sha,
        "compressed_filename": compressed.name,
        "compressed_sha256": chunk_sha,
        "compressed_bytes": compressed.stat().st_size,
        "uncompressed_bytes": db_path.stat().st_size,
        "published_at": _utc_now(),
        "chunks": [
            {
                "filename": compressed.name,
                "sha256": chunk_sha,
                "bytes": compressed.stat().st_size,
                "compression": "zlib",
            }
        ],
        "urls": {
            # A stable release/dataset address, not one derived from `version` (the date) —
            # point releases replace the assets under this same tag so the plugin's fixed
            # discovery URL (DEFAULT_MANIFEST_HF_URL / DEFAULT_MANIFEST_GITHUB_URL) keeps
            # resolving. `version` is what drives update detection, not the URL.
            "huggingface": f"https://huggingface.co/datasets/{CORPUS_HF_NAMESPACE}/resolve/main/{compressed.name}",
            "github_release": f"https://github.com/{CORPUS_GITHUB_REPO}/releases/download/{CORPUS_GITHUB_RELEASE_TAG}/{compressed.name}",
        },
        # Same string as the file on disk (ATTR-2.3) — do not re-read and risk newline drift.
        "attributions_markdown": attributions_text,
    }
    write_manifest(str(out_dir / CORPUS_MANIFEST_FILENAME), manifest)
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description="Build bonsAI knowledge base corpus")
    # Not under dist/ -- `npm run build` clears that directory and would delete the corpus.
    parser.add_argument("--out", type=Path, default=Path("build/knowledge-base"), help="Output directory")
    parser.add_argument("--seed", action="store_true", help="Include sample games/sections for dev QA")
    parser.add_argument(
        "--allow-missing-embeddings",
        action="store_true",
        help=(
            "Finish the build even when some sections or compat tips have no meaning-search "
            "vector (missing embedding model, an interrupted run, or a bad vector). Without "
            "this flag the build refuses to finish and nothing is written."
        ),
    )
    args = parser.parse_args()
    manifest = build_corpus(args.out, seed=args.seed, allow_missing_embeddings=args.allow_missing_embeddings)
    print(json.dumps(manifest, indent=2))
    print(f"Wrote {args.out / CORPUS_DB_FILENAME} and manifest version {manifest['version']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
