"""Title: The knowledge base's table layout and install rules

Purpose: The knowledge base is a set of game notes kept on the Deck so the AI
can answer from them instead of guessing. This file describes the shape that
download takes once it lands on your Deck: the database table layout (games,
their other names, strategy write-ups, compatibility tips, and the search
indexes over them), the file names involved, and the rules for where it is
allowed to live on disk -- your home folder, or an SD card plugged into the
Deck.

Used for: The services that download and install the knowledge base
(rag_corpus_local_install, rag_corpus_download_service, rag_corpus_status)
build its database with `apply_schema()` and check install paths with
`sanitize_corpus_install_dir()`. knowledge_base_service reads through these
tables when it answers a question.

Solves: Keeping one schema version everyone agrees on, refusing to install
the knowledge base somewhere it should not go, and telling whether a
downloaded copy actually has the extra vectors baked in that meaning-based
search needs, since an older download may not.

Does not: Download the knowledge base itself, or search it for an answer --
those are the rag services and knowledge_base_service.

How it works:
 1. `CREATE_SCHEMA_SQL` and `apply_schema()` create the tables a knowledge
    base needs: games, their alternate names, strategy write-ups, genre-wide
    and compatibility tips, a fast keyword-search index kept in sync by the
    triggers in `FTS_SYNC_TRIGGERS_SQL`, and, when the download includes
    them, a table of vectors for meaning-based search.
 2. `list_rag_storage_options()`, `default_corpus_dir_internal()` and
    `default_corpus_dir_sd()` work out where the knowledge base can be
    installed -- inside your home folder, or on a plugged-in SD card -- and
    how much room is free there. `sanitize_corpus_install_dir()` and
    `is_allowed_corpus_install_path()` then refuse anywhere else, so a bad
    install path can never write somewhere outside those two places.
 3. `load_manifest_from_path()` and `parse_manifest_json()` read the small
    JSON file (corpus-manifest.json) that ships beside the download,
    describing what is in it.
 4. `corpus_has_usable_section_vectors()`, `corpus_has_usable_compat_vectors()`,
    and the "fully indexed" pair (`corpus_section_vectors_fully_indexed()`,
    `corpus_compat_vectors_fully_indexed()`) answer whether meaning-based
    search actually has anything to search: first from counts the manifest
    already recorded, falling back to checking the database itself when it
    did not.
 5. `corpus_embedding_compatible()` checks a downloaded copy's vectors were
    baked with a matching model and format before anything tries to search
    them with today's model, since mixing the two returns confident-looking
    nonsense rather than an error.

Gotchas:
 - `_vector_table_has_rows()` is deliberately a "does even one exist" check,
   not a count -- its own comment explains that counting scanned every row of
   a large table on every single question asked.
 - A downloaded knowledge base whose vectors do not match today's embedding
   model or format is not repaired or migrated -- `corpus_embedding_compatible()`
   just says no, and search falls back to plain keyword matching. Getting the
   newer format means downloading the knowledge base again.
"""

from __future__ import annotations

import json
import os
import re
import struct
from pathlib import Path
from typing import Any, Iterable, Optional

CORPUS_SCHEMA_VERSION = 3
CORPUS_MANIFEST_FILENAME = "corpus-manifest.json"
CORPUS_DB_FILENAME = "corpus.db"
CORPUS_ATTRIBUTIONS_FILENAME = "ATTRIBUTIONS.md"
DEFAULT_EMBEDDING_MODEL = "nomic-embed-text"
DEFAULT_EMBEDDING_DIM = 768

# Identifies the *format* of the baked vectors, not the model that produced them. Schema v3
# embeds documents as "search_document: <text>" and queries as "search_query: <text>"; a v2
# corpus baked bare text with the same model and the same dimension, so nothing but this
# string can tell the two apart. Retrieval refuses hybrid when it does not match — mixing a
# prefixed query against unprefixed documents returns plausible garbage rather than an error.
EMBEDDING_VARIANT = "nomic-prefixed-v1"

# Publish targets — single source of truth. build_rag_db.py imports these rather than
# hardcoding its own copies, so the tag baked into published asset URLs can never drift from
# the tag this module (and therefore every client) looks for.
CORPUS_HF_NAMESPACE = "qd313/bonsai-knowledge-base"
CORPUS_GITHUB_REPO = "qd313/bonsAI"
CORPUS_GITHUB_RELEASE_TAG = "knowledge-base-v1"

DEFAULT_MANIFEST_HF_URL = (
    f"https://huggingface.co/datasets/{CORPUS_HF_NAMESPACE}/resolve/main/corpus-manifest.json"
)
DEFAULT_MANIFEST_GITHUB_URL = (
    f"https://github.com/{CORPUS_GITHUB_REPO}/releases/download/{CORPUS_GITHUB_RELEASE_TAG}/corpus-manifest.json"
)

TRUST_TIER_WIKI_VERIFIED = "wiki_verified"
TRUST_TIER_WIKI_NO_PATCH = "wiki_no_patch"
TRUST_TIER_FALLBACK = "fallback_no_source"

CREATE_SCHEMA_SQL = """
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;

CREATE TABLE IF NOT EXISTS games (
    game_id INTEGER PRIMARY KEY,
    app_id TEXT,
    igdb_id TEXT,
    canonical_title TEXT NOT NULL,
    edition TEXT,
    platform TEXT,
    genres TEXT,
    CHECK (app_id IS NOT NULL OR igdb_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_games_app_id ON games(app_id) WHERE app_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_games_igdb_id ON games(igdb_id) WHERE igdb_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS aliases (
    alias_normalized TEXT NOT NULL,
    game_id INTEGER NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
    PRIMARY KEY (alias_normalized, game_id)
);

CREATE INDEX IF NOT EXISTS idx_aliases_game_id ON aliases(game_id);

CREATE TABLE IF NOT EXISTS sections (
    section_id INTEGER PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
    section_type TEXT NOT NULL,
    name TEXT NOT NULL,
    card TEXT NOT NULL,
    source_url TEXT,
    source_license TEXT,
    source_version TEXT,
    crawled_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sections_game_id ON sections(game_id);

CREATE VIRTUAL TABLE IF NOT EXISTS sections_fts USING fts5(
    name,
    card,
    content='sections',
    content_rowid='section_id',
    tokenize='porter unicode61'
);

CREATE TABLE IF NOT EXISTS genre_patterns (
    pattern_id INTEGER PRIMARY KEY,
    genre_tags TEXT NOT NULL,
    card TEXT NOT NULL,
    source_license TEXT
);

CREATE TABLE IF NOT EXISTS compat_patterns (
    pattern_id INTEGER PRIMARY KEY,
    topic TEXT NOT NULL,
    platforms TEXT NOT NULL DEFAULT '[]',
    card TEXT NOT NULL,
    source_url TEXT,
    source_license TEXT
);

CREATE VIRTUAL TABLE IF NOT EXISTS compat_patterns_fts USING fts5(
    topic,
    platforms,
    card,
    content='compat_patterns',
    content_rowid='pattern_id',
    tokenize='porter unicode61'
);

CREATE TABLE IF NOT EXISTS section_vectors (
    section_id INTEGER PRIMARY KEY REFERENCES sections(section_id) ON DELETE CASCADE,
    embedding BLOB
);

CREATE TABLE IF NOT EXISTS compat_pattern_vectors (
    pattern_id INTEGER PRIMARY KEY REFERENCES compat_patterns(pattern_id) ON DELETE CASCADE,
    embedding BLOB
);
"""

FTS_SYNC_TRIGGERS_SQL = """
CREATE TRIGGER IF NOT EXISTS sections_ai AFTER INSERT ON sections BEGIN
    INSERT INTO sections_fts(rowid, name, card) VALUES (new.section_id, new.name, new.card);
END;
CREATE TRIGGER IF NOT EXISTS sections_ad AFTER DELETE ON sections BEGIN
    INSERT INTO sections_fts(sections_fts, rowid, name, card) VALUES('delete', old.section_id, old.name, old.card);
END;
CREATE TRIGGER IF NOT EXISTS sections_au AFTER UPDATE ON sections BEGIN
    INSERT INTO sections_fts(sections_fts, rowid, name, card) VALUES('delete', old.section_id, old.name, old.card);
    INSERT INTO sections_fts(rowid, name, card) VALUES (new.section_id, new.name, new.card);
END;

CREATE TRIGGER IF NOT EXISTS compat_patterns_ai AFTER INSERT ON compat_patterns BEGIN
    INSERT INTO compat_patterns_fts(rowid, topic, platforms, card) VALUES (new.pattern_id, new.topic, new.platforms, new.card);
END;
CREATE TRIGGER IF NOT EXISTS compat_patterns_ad AFTER DELETE ON compat_patterns BEGIN
    INSERT INTO compat_patterns_fts(compat_patterns_fts, rowid, topic, platforms, card) VALUES('delete', old.pattern_id, old.topic, old.platforms, old.card);
END;
CREATE TRIGGER IF NOT EXISTS compat_patterns_au AFTER UPDATE ON compat_patterns BEGIN
    INSERT INTO compat_patterns_fts(compat_patterns_fts, rowid, topic, platforms, card) VALUES('delete', old.pattern_id, old.topic, old.platforms, old.card);
    INSERT INTO compat_patterns_fts(rowid, topic, platforms, card) VALUES (new.pattern_id, new.topic, new.platforms, new.card);
END;
"""


def normalize_alias(text: str) -> str:
    """Lowercase, collapse whitespace, strip punctuation for alias lookup."""
    raw = (text or "").strip().lower()
    raw = re.sub(r"[^\w\s]", " ", raw, flags=re.UNICODE)
    return re.sub(r"\s+", " ", raw).strip()


def default_corpus_dir_internal() -> str:
    return str(Path.home() / ".bonsai" / "rag")


def default_seed_corpus_source_dir() -> str:
    """Dev/QA seed corpus dropped by build.ps1 (install_rag_corpus_local source)."""
    return str(Path.home() / "homebrew" / "settings" / "bonsAI" / "seed-knowledge-base")


def _free_bytes_at_path(path: str) -> int:
    try:
        if hasattr(os, "statvfs"):
            st = os.statvfs(path)
            return int(st.f_bavail * st.f_frsize)
        import shutil

        return int(shutil.disk_usage(path).free)
    except OSError:
        return 0


def discover_sd_card_mount_base() -> Optional[str]:
    """First writable volume under /run/media/<user>/ (SteamOS microSD)."""
    media_root = Path(f"/run/media/{Path.home().name}")
    if not media_root.is_dir():
        return None
    try:
        candidates = sorted(
            (p for p in media_root.iterdir() if p.is_dir() and not p.name.startswith(".")),
            key=lambda p: p.name.lower(),
        )
    except OSError:
        return None
    for candidate in candidates:
        try:
            resolved = candidate.resolve()
            if os.access(resolved, os.W_OK | os.X_OK):
                return str(resolved)
        except OSError:
            continue
    return None


def default_corpus_dir_sd(sd_mount: Optional[str] = None) -> str:
    mount = str(sd_mount or discover_sd_card_mount_base() or "").strip()
    if not mount:
        raise ValueError("No SD card mount detected.")
    return str(Path(mount) / ".bonsai" / "rag")


def is_allowed_corpus_install_path(target: Path) -> bool:
    """Allow install roots under home or SteamOS SD mounts (/run/media/<user>/…)."""
    resolved = target.resolve()
    home = Path.home().resolve()
    try:
        resolved.relative_to(home)
        return True
    except ValueError:
        pass
    media_base = Path(f"/run/media/{home.name}").resolve()
    try:
        resolved.relative_to(media_base)
        return True
    except ValueError:
        return False


def list_rag_storage_options() -> dict[str, Any]:
    """Return internal + optional SD install targets for the download picker."""
    internal_path = default_corpus_dir_internal()
    internal_parent = str(Path(internal_path).parent)
    options: dict[str, Any] = {
        "internal": {
            "id": "internal",
            "label": "Internal storage",
            "install_path": internal_path,
            "free_bytes": _free_bytes_at_path(internal_parent),
        },
        "sd_card": None,
    }
    sd_mount = discover_sd_card_mount_base()
    if sd_mount:
        sd_path = default_corpus_dir_sd(sd_mount)
        options["sd_card"] = {
            "id": "sd_card",
            "label": "SD card",
            "install_path": sd_path,
            "mount": sd_mount,
            "free_bytes": _free_bytes_at_path(sd_mount),
        }
    return options


def sanitize_corpus_install_dir(install_dir: str) -> str:
    """Resolve install dir and refuse paths outside home or SteamOS SD mounts."""
    expanded = os.path.expanduser(str(install_dir or "").strip())
    if not expanded:
        raise ValueError("Install path is required.")
    target = Path(expanded).resolve()
    if not is_allowed_corpus_install_path(target):
        raise ValueError(
            "Knowledge base install path must be under your home directory or SD card (/run/media/…)."
        )
    return str(target)


def resolve_corpus_db_path(settings: dict) -> Optional[str]:
    """Return absolute path to corpus.db when configured and present."""
    path = str(settings.get("rag_corpus_path") or "").strip()
    if not path:
        return None
    db = os.path.join(path, CORPUS_DB_FILENAME)
    return db if os.path.isfile(db) else None


def corpus_install_root(path: str) -> str:
    """Normalize install directory (contains corpus.db + manifest)."""
    p = str(path or "").strip()
    if not p:
        return ""
    if os.path.basename(p) == CORPUS_DB_FILENAME:
        return os.path.dirname(p)
    return p


def parse_manifest_json(raw: Any) -> dict[str, Any]:
    """Validate minimal manifest fields."""
    if not isinstance(raw, dict):
        raise ValueError("manifest must be a JSON object")
    version = str(raw.get("version") or "").strip()
    if not version:
        raise ValueError("manifest.version is required")
    chunks = raw.get("chunks")
    if chunks is not None and not isinstance(chunks, list):
        raise ValueError("manifest.chunks must be a list when present")
    return raw


def load_manifest_from_path(path: str) -> dict[str, Any]:
    with open(path, "r", encoding="utf-8") as fp:
        return parse_manifest_json(json.load(fp))


def write_manifest(path: str, manifest: dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as fp:
        json.dump(manifest, fp, indent=2, sort_keys=True)
        fp.write("\n")


def _migrate_compat_patterns_v2(conn: Any) -> None:
    """Add Phase 3 columns/tables when opening a v1 corpus.db."""
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='compat_patterns'"
    ).fetchone()
    if not row:
        return
    cols = {r[1] for r in conn.execute("PRAGMA table_info(compat_patterns)").fetchall()}
    if "platforms" not in cols:
        conn.execute(
            "ALTER TABLE compat_patterns ADD COLUMN platforms TEXT NOT NULL DEFAULT '[]'"
        )
    fts_row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='compat_patterns_fts'"
    ).fetchone()
    if not fts_row:
        conn.executescript(
            """
            CREATE VIRTUAL TABLE IF NOT EXISTS compat_patterns_fts USING fts5(
                topic,
                platforms,
                card,
                content='compat_patterns',
                content_rowid='pattern_id',
                tokenize='porter unicode61'
            );
            """
        )
        conn.execute("INSERT INTO compat_patterns_fts(compat_patterns_fts) VALUES('rebuild')")
    vec_row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='compat_pattern_vectors'"
    ).fetchone()
    if not vec_row:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS compat_pattern_vectors ("
            "pattern_id INTEGER PRIMARY KEY REFERENCES compat_patterns(pattern_id) ON DELETE CASCADE, "
            "embedding BLOB)"
        )


def apply_schema(conn: Any) -> None:
    conn.executescript(CREATE_SCHEMA_SQL)
    conn.executescript(FTS_SYNC_TRIGGERS_SQL)
    _migrate_compat_patterns_v2(conn)
    conn.commit()


def pack_embedding_vector(vec: Iterable[float]) -> bytes:
    """Pack float32 embedding as little-endian BLOB for ``section_vectors.embedding``."""
    values = list(vec)
    return struct.pack(f"<{len(values)}f", *values)


def unpack_embedding_vector(blob: bytes) -> list[float]:
    """Unpack little-endian float32 BLOB from ``section_vectors.embedding``."""
    if not blob:
        return []
    count = len(blob) // 4
    return list(struct.unpack(f"<{count}f", blob[: count * 4]))


def corpus_manifest_path(install_root: str) -> Optional[str]:
    """Return absolute path to corpus-manifest.json when present under install root."""
    root = str(install_root or "").strip()
    if not root:
        return None
    manifest = os.path.join(root, CORPUS_MANIFEST_FILENAME)
    return manifest if os.path.isfile(manifest) else None


def _vector_table_has_rows(conn: Any, table: str) -> bool:
    """True when ``table`` holds at least one embedding.

    ``SELECT 1 ... LIMIT 1``, not ``COUNT(*)``. The question is only ever "any?", and the
    count form scanned every row of a multi-KB BLOB table on every single Ask.
    """
    try:
        row = conn.execute(
            f"SELECT 1 FROM {table} WHERE embedding IS NOT NULL LIMIT 1"
        ).fetchone()
    except Exception:
        return False
    return row is not None


def _manifest_vector_count(manifest: Optional[dict[str, Any]], key: str) -> Optional[int]:
    """Read a vector count the builder already recorded, when it is present and sane."""
    if not isinstance(manifest, dict):
        return None
    value = manifest.get(key)
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        return None
    return value


def corpus_has_usable_section_vectors(
    conn: Any, manifest: Optional[dict[str, Any]] = None
) -> bool:
    """True when strategy section vectors exist for hybrid retrieval."""
    if isinstance(manifest, dict) and manifest.get("embeddings_populated") is False:
        return False
    count = _manifest_vector_count(manifest, "embedding_section_count")
    if count is not None:
        return count > 0
    return _vector_table_has_rows(conn, "section_vectors")


def corpus_has_usable_compat_vectors(
    conn: Any, manifest: Optional[dict[str, Any]] = None
) -> bool:
    """True when compat tip vectors exist for troubleshooting hybrid retrieval."""
    if isinstance(manifest, dict) and manifest.get("embeddings_populated") is False:
        return False
    count = _manifest_vector_count(manifest, "embedding_compat_count")
    if count is not None:
        return count > 0
    return _vector_table_has_rows(conn, "compat_pattern_vectors")


def _table_row_count(conn: Any, table: str, *, where: Optional[str] = None) -> int:
    """Row count for the "fully indexed" checks only — not the hot Ask path, so a COUNT(*) is
    fine here where ``_vector_table_has_rows`` above deliberately avoids one."""
    sql = f"SELECT COUNT(*) FROM {table}"
    if where:
        sql += f" WHERE {where}"
    try:
        row = conn.execute(sql).fetchone()
    except Exception:
        return 0
    return int(row[0]) if row else 0


def corpus_section_vectors_fully_indexed(
    conn: Any, manifest: Optional[dict[str, Any]] = None
) -> bool:
    """True only when *every* strategy section has a baked vector, not just some.

    This is a stricter question than ``corpus_has_usable_section_vectors``, which only ever
    asks "any?". That check must stay exactly as lenient as it is today — an older library
    already installed on someone's Deck must not lose meaning search the moment they update the
    plugin. This function exists so a future ranking change has an honest "complete or not"
    answer to lean on; nothing reads it yet.
    """
    if isinstance(manifest, dict) and manifest.get("embeddings_populated") is False:
        return False
    total = _manifest_vector_count(manifest, "embedding_section_total_count")
    indexed = _manifest_vector_count(manifest, "embedding_section_count")
    if total is None or indexed is None:
        total = _table_row_count(conn, "sections")
        indexed = _table_row_count(conn, "section_vectors", where="embedding IS NOT NULL")
    return total > 0 and indexed >= total


def corpus_compat_vectors_fully_indexed(
    conn: Any, manifest: Optional[dict[str, Any]] = None
) -> bool:
    """True only when *every* compat tip has a baked vector, not just some. See
    ``corpus_section_vectors_fully_indexed`` for why this exists alongside, not instead of,
    ``corpus_has_usable_compat_vectors``."""
    if isinstance(manifest, dict) and manifest.get("embeddings_populated") is False:
        return False
    total = _manifest_vector_count(manifest, "embedding_compat_total_count")
    indexed = _manifest_vector_count(manifest, "embedding_compat_count")
    if total is None or indexed is None:
        total = _table_row_count(conn, "compat_patterns")
        indexed = _table_row_count(conn, "compat_pattern_vectors", where="embedding IS NOT NULL")
    return total > 0 and indexed >= total


def _base_model_tag(model: str) -> str:
    """Strip an Ollama ``:tag`` suffix so ``nomic-embed-text:latest`` == ``nomic-embed-text``."""
    return str(model or "").strip().lower().split(":", 1)[0]


def corpus_embedding_compatible(
    manifest: Optional[dict[str, Any]],
    *,
    model: str = DEFAULT_EMBEDDING_MODEL,
    variant: str = EMBEDDING_VARIANT,
) -> bool:
    """True when the corpus's baked vectors can be searched with runtime-format query vectors.

    Deliberately fails closed. A corpus with no manifest, or one written before
    ``embedding_variant`` existed (schema v2), cannot prove its vectors were baked with the
    document prefix, so hybrid is refused and the caller degrades to keyword. There is no
    migration path by design — rebuild the corpus.
    """
    if not isinstance(manifest, dict):
        return False
    if str(manifest.get("embedding_variant") or "").strip() != str(variant or "").strip():
        return False
    baked_model = str(manifest.get("embedding_model") or "").strip()
    if not baked_model:
        return False
    return _base_model_tag(baked_model) == _base_model_tag(model)


def corpus_has_usable_vectors(conn: Any, manifest: Optional[dict[str, Any]] = None) -> bool:
    """True when the corpus ships any populated vectors (section or compat) for hybrid UI hints."""
    if isinstance(manifest, dict) and manifest.get("embeddings_populated") is False:
        return False
    return corpus_has_usable_section_vectors(
        conn, manifest
    ) or corpus_has_usable_compat_vectors(conn, manifest)
