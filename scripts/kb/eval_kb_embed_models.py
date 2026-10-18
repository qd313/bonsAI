#!/usr/bin/env python3
"""KB retrieval eval — maintainer bake-off against the seed corpus.

Two independent questions, both answered here:

1. **Which embed model?** Bare vs prompted columns per model, over the English fixtures.
2. **Does fusion beat its parts?** keyword / vector-only / RRF-rerank-only / RRF at the
   baseline model, on the *same* corpus, with bootstrap confidence intervals. Same-corpus only
   (R4): numbers from a different corpus are not comparable and must not be quoted against
   each other. ``rrf`` is what ships; ``rrf_rerank_only`` is what shipped before 2026-08-18,
   kept as an arm so the vector recall pass has to keep earning its embed round trip.

Two honesty rules are enforced in code rather than left to the reader:

- **Splits.** Weights and the relevance floor are tuned on ``tune`` cases. ``holdout`` is the
  ship gate and must not be looked at while tuning (R1).
- **Gate reachability.** A fixture's ``domain`` says what we *want* retrieval to do. Production
  decides for itself via ``should_retrieve_knowledge``, and today a natural-language
  troubleshooting Ask never reaches the compat path (deferred Q8). Every case is checked
  against the live gate and compat is reported twice — overall, and gate-reachable-only — so
  tuning cannot be driven by traffic production never routes (R2).

Usage:
  python scripts/kb/eval_kb_embed_models.py
  python scripts/kb/eval_kb_embed_models.py --ollama http://127.0.0.1:11434 --write-report
  python scripts/kb/eval_kb_embed_models.py --arms-only     # skip the 6-model sweep
"""

from __future__ import annotations

import argparse
import json
import random
import sqlite3
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any, Literal

# Nearest folder above this file that holds main.py: no count of folders to break when the script moves.
REPO_ROOT = next(p for p in Path(__file__).resolve().parents if (p / "main.py").is_file())
PY_MODULES = REPO_ROOT / "py_modules"
FIXTURES = REPO_ROOT / "tests" / "fixtures"
# Under build/, not dist/: `npm run build` clears dist/ and would delete the eval corpus.
DEFAULT_OUT_DIR = REPO_ROOT / "build" / "knowledge-base-embed-bakeoff"
DEFAULT_OLLAMA = "http://127.0.0.1:11434"

DEFAULT_MODELS = [
    "nomic-embed-text",
    "nomic-embed-text-v2-moe",
    "qwen3-embedding:0.6b",
    "mxbai-embed-large",
    "snowflake-arctic-embed2",
    "bge-m3",
]

BASELINE_MODEL = "nomic-embed-text"
WINNER_MARGIN_TOP3 = 5.0  # absolute percentage points on prompted top-3

MODEL_SIZE_MB: dict[str, int] = {
    "nomic-embed-text": 274,
    "nomic-embed-text-v2-moe": 958,
    "qwen3-embedding:0.6b": 639,
    "mxbai-embed-large": 670,
    "snowflake-arctic-embed2": 1200,
    "bge-m3": 1200,
}

if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(PY_MODULES) not in sys.path:
    sys.path.insert(0, str(PY_MODULES))

# Reports are saved in the workshop repo, not in this one (scripts/lib/workshop.py says where it is).
_WORKSHOP_LIB = str(REPO_ROOT / "scripts" / "lib")
if _WORKSHOP_LIB not in sys.path:
    sys.path.insert(0, _WORKSHOP_LIB)
import workshop  # noqa: E402

from backend.knowledge.knowledge_base_service import (  # noqa: E402
    HYBRID_FTS_SHORTLIST_K,
    KnowledgeCard,
    _budget_for_mode,
    _dot_similarity,
    _expand_query,
    _fuse_cards_by_rrf,
    _resolve_game_id,
    _search_compat_patterns,
    _search_sections,
    _vector_recall_sections,
    VECTOR_RECALL_FLOOR,
    VECTOR_RECALL_K,
)
from backend.knowledge.knowledge_base_service import (  # noqa: E402
    should_retrieve_knowledge,
)
from backend.knowledge.ollama_embed_service import (  # noqa: E402
    format_embed_document,
    format_embed_query,
)

# Kept as a module reference, not just the two names, so the weight sweep can set
# RRF_W_FTS / RRF_W_VEC on the *module* between runs. `_fuse_cards_by_rrf` reads those two
# names as globals at call time from this same module object, so writing through this
# reference changes the blend `_hybrid_retrieve` uses without editing the service file.
from backend.knowledge import knowledge_base_service as kb_service  # noqa: E402

PromptMode = Literal["bare", "prompted"]
RetrievalArm = Literal["keyword", "vector_only", "rrf_rerank_only", "rrf"]
Split = Literal["tune", "holdout"]
EVAL_MIN_TOP_K = 3  # fixtures often use speed (top_k=1); bake-off needs top-3 signal

# Percentile bootstrap over per-case hits. Seeded so two runs of the same fixtures report the
# same interval -- an eval whose confidence bounds move on their own cannot settle an argument.
BOOTSTRAP_RESAMPLES = 2000
BOOTSTRAP_SEED = 20260806
CI_PERCENTILES = (2.5, 97.5)


@dataclass
class CorpusDoc:
    doc_id: int
    domain: Literal["compat", "strategy"]
    label: str
    bare_text: str
    game_id: int = 0


@dataclass
class DomainVectors:
    """Two vector maps, never one.

    ``compat_patterns.pattern_id`` and ``sections.section_id`` are independent sequences that
    both land in ``CorpusDoc.doc_id``. Keying one dict by it meant a section card's vector
    silently overwrote the tip's for every id present in both tables -- 122 of 124 tips at the
    current corpus size -- so every compat case in a vector-using arm was scored against a
    strategy card's vector. Production never has this problem: it stores ``section_vectors``
    and ``compat_pattern_vectors`` in separate tables and reads whichever the query needs.

    Fixed 2026-08-21. Compat numbers in reports before that date are wrong for the
    ``vector_only``, ``rrf_rerank_only`` and ``rrf`` arms; the keyword arm uses no vectors and
    is unaffected, as is every strategy case -- sections were written last, so they kept
    their own vectors.
    """

    compat: dict[int, list[float]]
    strategy: dict[int, list[float]]

    def for_domain(self, domain: str) -> dict[int, list[float]]:
        return self.compat if domain == "compat" else self.strategy


@dataclass
class QueryCase:
    case_id: str
    query: str
    ask_mode: str
    domain: Literal["compat", "strategy"]
    app_id: str
    shortcut: str
    expect_topic: str
    # A single card name, or a list of names for a question with more than one right answer.
    # A list row is only valid with a non-empty fixture `note` -- see `_load_fixture`.
    expect_section: str | list[str]
    suite: str
    split: Split = "tune"
    # Computed from the live gate, never read from the fixture. A baked boolean goes stale the
    # first time the phrase list changes and then lies quietly.
    gate_reachable: bool = False
    gate_domain: str = ""


@dataclass
class QueryResult:
    case_id: str
    hit_at_1: bool
    hit_at_3: bool
    fts_empty: bool
    embed_ms: float
    top_names: list[str] = field(default_factory=list)


@dataclass
class ModelScores:
    model: str
    prompt_mode: PromptMode
    top1_pct: float
    top3_pct: float
    mean_embed_ms: float
    fts_empty_pct: float
    query_results: list[QueryResult] = field(default_factory=list)


class EmbedError(Exception):
    pass


def _gate_verdict(
    *, ask_mode: str, question: str, app_id: str, app_name: str
) -> tuple[bool, str]:
    """Ask the production gate what it would do with this query.

    Returns ``(should_run, domain)``. ``domain`` is what production *chooses*, which is not
    always the domain the fixture wants -- that mismatch is the point of the R2 reporting.
    """
    should_run, domain = should_retrieve_knowledge(
        use_local_knowledge_base=True,
        ask_mode=ask_mode,
        question=question,
        app_id=app_id,
        app_name=app_name,
    )
    return bool(should_run), str(domain or "")


def _load_fixture(path: Path, suite: str) -> list[QueryCase]:
    data = json.loads(path.read_text(encoding="utf-8"))
    default_split: Split = data.get("default_split") if data.get("default_split") in ("tune", "holdout") else "tune"
    out: list[QueryCase] = []
    for row in data.get("queries", []):
        split = row.get("split") if row.get("split") in ("tune", "holdout") else default_split
        ask_mode = str(row.get("ask_mode") or "speed")
        query = str(row["query"])
        app_id = str(row.get("app_id") or "")
        shortcut = str(row.get("shortcut") or "")
        # Strategy routing keys off the running app, which the fixture models as app_id or a
        # shortcut name -- pass the shortcut as the app name so the gate sees what Ask sees.
        gate_ok, gate_domain = _gate_verdict(
            ask_mode=ask_mode, question=query, app_id=app_id, app_name=shortcut
        )
        raw_expect_section = row.get("expect_section") or ""
        expect_section: str | list[str]
        if isinstance(raw_expect_section, list):
            # A second right answer is a deliberate call, not a default -- the fixture must
            # say why in `note`, or the row fails to load rather than shipping unexplained.
            if not str(row.get("note") or "").strip():
                raise ValueError(
                    f"{row.get('id')}: a list expect_section requires a non-empty note"
                )
            expect_section = [str(name) for name in raw_expect_section]
        else:
            expect_section = str(raw_expect_section)
        out.append(
            QueryCase(
                case_id=str(row["id"]),
                query=query,
                ask_mode=ask_mode,
                domain=row["domain"],
                app_id=app_id,
                shortcut=shortcut,
                expect_topic=str(row.get("expect_topic") or ""),
                expect_section=expect_section,
                suite=suite,
                split=split,
                gate_reachable=gate_ok and gate_domain == row["domain"],
                gate_domain=gate_domain,
            )
        )
    return out


# The three inputs that decide whether the eval's saved copy of the library is still current:
# the two data files the corpus is built from, and the builder itself (a script change can
# change what a rebuild would produce even with the same data files).
CORPUS_STALE_CHECK_RELPATHS = (
    Path("data") / "kb" / "strategy_seed.json",
    Path("data") / "kb" / "compat_patterns.json",
)
# The builder sits next to this script, so it is found by name beside __file__, not by a folder path.
BUILDER_SCRIPT = Path(__file__).resolve().parent / "build_rag_db.py"


def _default_stale_check_paths() -> list[Path]:
    return [*(REPO_ROOT / rel for rel in CORPUS_STALE_CHECK_RELPATHS), BUILDER_SCRIPT]


def _corpus_is_stale(db_mtime: float, input_mtimes: list[float]) -> bool:
    """True when any input is newer than the corpus copy the eval would otherwise reuse.

    Pure: takes modification times, not paths, so the rebuild rule is pinned by a test without
    touching a filesystem or Ollama. ``_ensure_seed_db`` is the only caller that stats real
    files -- the notes (``strategy_seed.json``, ``compat_patterns.json``) and the builder itself
    (``build_rag_db.py``). A copy that predates any of the three is void: this project spent
    weeks quoting search numbers from a copy of the library that had gone stale unnoticed.
    """
    return any(t > db_mtime for t in input_mtimes)


class StaleCorpusUnrebuildableError(Exception):
    """The eval's saved copy of the library is out of date and Ollama cannot be reached to
    rebuild it. Raised instead of quietly measuring the old copy."""


def _ollama_reachable(ollama_base: str, *, timeout_s: float = 5.0) -> bool:
    """``GET {base}/api/tags`` and report whether Ollama answered at all.

    Used only to decide whether an out-of-date corpus copy can be safely rebuilt here -- never
    to pick a model or change what gets embedded.
    """
    url = f"{ollama_base.rstrip('/')}/api/tags"
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            resp.read()
        return True
    except Exception:
        return False


def _ensure_seed_db(
    out_dir: Path,
    *,
    ollama_base: str = DEFAULT_OLLAMA,
    force_rebuild: bool = False,
    stale_check_paths: list[Path] | None = None,
) -> Path:
    db_path = out_dir / "corpus.db"
    stale = False
    if db_path.is_file() and not force_rebuild:
        paths = _default_stale_check_paths() if stale_check_paths is None else stale_check_paths
        input_mtimes = [p.stat().st_mtime for p in paths if p.is_file()]
        stale = _corpus_is_stale(db_path.stat().st_mtime, input_mtimes)
        if not stale:
            return db_path
        print(
            "the eval's saved copy of the library is older than the notes or the builder -- "
            "rebuilding it before this run searches anything",
            file=sys.stderr,
        )
        # A stale copy needs a real rebuild, which needs the embedding model. Refuse rather
        # than measure the old copy, and never fall back to a keyword-only rebuild -- a search
        # number taken on a copy nobody meant to measure is worse than no number at all.
        if not _ollama_reachable(ollama_base):
            raise StaleCorpusUnrebuildableError(
                "the eval's saved copy of the library is out of date and the embedding model "
                "is not reachable, so this run cannot be trusted -- start Ollama and try again"
            )
    out_dir.mkdir(parents=True, exist_ok=True)
    if force_rebuild or stale:
        for name in ("corpus.db", "corpus.db.zlib", "corpus-manifest.json", "ATTRIBUTIONS.md"):
            path = out_dir / name
            if path.is_file():
                path.unlink()
    subprocess.run(
        [
            sys.executable,
            str(BUILDER_SCRIPT),
            "--seed",
            "--out",
            str(out_dir),
        ],
        check=True,
        cwd=str(REPO_ROOT),
    )
    return db_path


def _read_corpus_manifest(out_dir: Path) -> dict[str, Any]:
    """Read the manifest written alongside the corpus this run actually searched.

    Both report writers (markdown and JSON) stamp their header with these three values, so a
    stale or thin copy shows on the page instead of hiding behind a plain filename.
    """
    manifest_path = out_dir / "corpus-manifest.json"
    if not manifest_path.is_file():
        return {"version": "unknown", "note_count": 0, "tip_count": 0}
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    return {
        "version": str(data.get("version") or "unknown"),
        "note_count": int(data.get("embedding_section_total_count") or 0),
        "tip_count": int(data.get("embedding_compat_total_count") or 0),
    }


def _load_corpus_docs(conn: sqlite3.Connection) -> list[CorpusDoc]:
    docs: list[CorpusDoc] = []
    for row in conn.execute(
        "SELECT pattern_id, topic, card FROM compat_patterns ORDER BY pattern_id"
    ):
        topic = str(row[1] or "")
        card = str(row[2] or "")
        docs.append(
            CorpusDoc(
                doc_id=int(row[0]),
                domain="compat",
                label=topic,
                bare_text=f"{topic}\n{card}",
            )
        )
    for row in conn.execute(
        "SELECT section_id, name, card, game_id FROM sections ORDER BY section_id"
    ):
        name = str(row[1] or "")
        card = str(row[2] or "")
        docs.append(
            CorpusDoc(
                doc_id=int(row[0]),
                domain="strategy",
                label=name,
                bare_text=f"{name}\n{card}",
                game_id=int(row[3] or 0),
            )
        )
    return docs


# "prompted" delegates to the production helpers on purpose. These used to be private copies
# here, and the copies are how the eval drifted from what shipped — it measured prefixed
# retrieval while production embedded bare text. "bare" stays local because it exists only to
# measure the no-prefix arm; production has no such mode.
def _format_query(model: str, query: str, mode: PromptMode) -> str:
    if mode == "bare":
        return query
    return format_embed_query(query, model=model)


def _format_document(model: str, bare_text: str, mode: PromptMode) -> str:
    if mode == "bare":
        return bare_text
    return format_embed_document(bare_text, model=model)


def _embed_batch(
    ollama_base: str,
    model: str,
    texts: list[str],
    *,
    timeout_s: float = 120.0,
    batch_size: int = 16,
) -> list[list[float]]:
    if not texts:
        return []
    url = f"{ollama_base.rstrip('/')}/api/embed"
    out: list[list[float]] = []
    for start in range(0, len(texts), batch_size):
        chunk = texts[start : start + batch_size]
        payload = {"model": model, "input": chunk if len(chunk) > 1 else chunk[0]}
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout_s) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:300]
            raise EmbedError(f"{model}: HTTP {exc.code}: {detail}") from exc
        except Exception as exc:
            raise EmbedError(f"{model}: {exc}") from exc
        embeddings = data.get("embeddings") if isinstance(data, dict) else None
        if not isinstance(embeddings, list) or len(embeddings) != len(chunk):
            raise EmbedError(f"{model}: invalid embed response for batch of {len(chunk)}")
        for item in embeddings:
            if not isinstance(item, list) or not item:
                raise EmbedError(f"{model}: empty vector in batch response")
            out.append([float(x) for x in item])
    return out


def _embed_one(ollama_base: str, model: str, text: str, *, timeout_s: float = 30.0) -> tuple[list[float], float]:
    t0 = time.perf_counter()
    vectors = _embed_batch(ollama_base, model, [text], timeout_s=timeout_s, batch_size=1)
    ms = round((time.perf_counter() - t0) * 1000, 2)
    return vectors[0], ms


def _card_matches(case: QueryCase, card: KnowledgeCard) -> bool:
    if case.domain == "compat":
        return case.expect_topic.lower() == card.name.lower()
    names = case.expect_section if isinstance(case.expect_section, list) else [case.expect_section]
    return any(name.lower() == card.name.lower() for name in names)


def _eval_top_k(ask_mode: str) -> int:
    top_k, _ = _budget_for_mode(ask_mode)
    return max(top_k, EVAL_MIN_TOP_K)


def _score_cards(cards: list[KnowledgeCard], case: QueryCase, top_k: int) -> tuple[bool, bool]:
    trimmed = cards[:top_k]
    hits = [_card_matches(case, c) for c in trimmed]
    hit_at_1 = bool(hits and hits[0])
    hit_at_3 = any(hits[: min(3, len(hits))])
    return hit_at_1, hit_at_3


def _keyword_retrieve(
    conn: sqlite3.Connection,
    case: QueryCase,
    *,
    fts_k: int,
    top_k: int,
) -> list[KnowledgeCard]:
    expanded = _expand_query(case.query, "")
    if case.domain == "compat":
        return _search_compat_patterns(conn, query=expanded, top_k=min(fts_k, top_k))
    game_id, _ = _resolve_game_id(
        conn,
        app_id=case.app_id,
        app_name="",
        shortcut_name=case.shortcut,
    )
    return _search_sections(conn, game_id=game_id, query=expanded, top_k=min(fts_k, top_k))


def _hybrid_retrieve(
    conn: sqlite3.Connection,
    case: QueryCase,
    *,
    query_vector: list[float],
    vectors_by_id: DomainVectors,
    fts_k: int,
    top_k: int,
    with_recall: bool,
) -> list[KnowledgeCard]:
    """Fusion as production runs it (``with_recall=True``) or as it ran before 2026-08-18.

    ``with_recall=False`` reproduces the old shape exactly -- one FTS query, vectors for those
    candidates only, and nothing at all when FTS came up empty. It is kept as an arm because a
    measurement that cannot show what the recall pass bought cannot show when it stops paying.

    **The recall pass reads the vectors baked into the corpus**, not the ``vectors_by_id`` the
    caller embedded for this run. Those agree only because the arms run always uses
    BASELINE_MODEL with production's document prefix -- the same model and prefix the corpus
    was baked with, and embeddings are deterministic. Run the arms at another model and this
    arm silently mixes two vector spaces; that is why ``_run_retrieval_arms`` is not given a
    model parameter to vary.
    """
    expanded = _expand_query(case.query, "")
    recall_cards: list[KnowledgeCard] = []
    vectors = vectors_by_id.for_domain(case.domain)
    if case.domain == "compat":
        # Production does not run recall on the tip sheet -- see the open compat topic-filter
        # bug. When it does, this branch has to move with it or the arm goes stale again.
        cards = _search_compat_patterns(conn, query=expanded, top_k=fts_k)
    else:
        game_id, _ = _resolve_game_id(
            conn,
            app_id=case.app_id,
            app_name="",
            shortcut_name=case.shortcut,
        )
        cards = _search_sections(conn, game_id=game_id, query=expanded, top_k=fts_k)
        if with_recall and game_id is not None:
            recall_cards, vectors = _vector_recall_sections(
                conn,
                game_id=game_id,
                query_vector=query_vector,
                top_k=VECTOR_RECALL_K,
                min_similarity=VECTOR_RECALL_FLOOR,
                exclude_ids={c.section_id for c in cards},
            )
    if not cards and not recall_cards:
        return []
    return _fuse_cards_by_rrf(
        cards,
        query_vector,
        vectors,
        top_k=top_k,
        recall_cards=recall_cards,
    )


def _vector_only(
    docs: list[CorpusDoc],
    *,
    query_vector: list[float],
    vectors: dict[int, list[float]],
    top_k: int,
) -> list[KnowledgeCard]:
    """Rank the whole candidate set by cosine alone -- no FTS shortlist in front of it.

    This is the arm that answers "is the keyword half pulling its weight?". It scans every
    doc, which production never does; it exists to bound the comparison, not to ship.
    """
    scored: list[tuple[float, CorpusDoc]] = []
    for doc in docs:
        vec = vectors.get(doc.doc_id)
        if vec:
            scored.append((_dot_similarity(query_vector, vec), doc))
    scored.sort(key=lambda item: item[0], reverse=True)
    out: list[KnowledgeCard] = []
    for _, doc in scored[:top_k]:
        name, _, card = doc.bare_text.partition("\n")
        out.append(
            KnowledgeCard(
                section_id=doc.doc_id,
                game_id=doc.game_id,
                game_title="Shared troubleshooting" if doc.domain == "compat" else "",
                section_type="tip" if doc.domain == "compat" else "section",
                name=name,
                card=card,
                source_url="",
                source_license="bonsAI-maintainer",
                source_version=None,
                crawled_at=None,
                trust_tier="fallback",
            )
        )
    return out


def _vector_only_for_case(
    case: QueryCase,
    conn: sqlite3.Connection,
    *,
    query_vector: list[float],
    docs: list[CorpusDoc],
    vectors: DomainVectors,
    top_k: int,
) -> list[KnowledgeCard]:
    """Domain-scoped vector-only retrieval, matching what the keyword arm is allowed to see."""
    if case.domain == "compat":
        pool = [d for d in docs if d.domain == "compat"]
    else:
        game_id, _ = _resolve_game_id(
            conn, app_id=case.app_id, app_name="", shortcut_name=case.shortcut
        )
        if game_id is None:
            return []
        pool = [d for d in docs if d.domain == "strategy" and d.game_id == game_id]
    return _vector_only(
        pool, query_vector=query_vector, vectors=vectors.for_domain(case.domain), top_k=top_k
    )


def _build_vectors(
    ollama_base: str,
    model: str,
    docs: list[CorpusDoc],
    mode: PromptMode,
) -> DomainVectors:
    texts = [_format_document(model, doc.bare_text, mode) for doc in docs]
    vectors = _embed_batch(ollama_base, model, texts)
    by_domain = DomainVectors(compat={}, strategy={})
    for doc, vec in zip(docs, vectors):
        by_domain.for_domain(doc.domain)[doc.doc_id] = vec
    return by_domain


def _evaluate_model(
    conn: sqlite3.Connection,
    ollama_base: str,
    model: str,
    docs: list[CorpusDoc],
    cases: list[QueryCase],
    *,
    prompt_mode: PromptMode,
    hybrid: bool,
    vectors_by_id: DomainVectors | None = None,
) -> ModelScores:
    if hybrid and vectors_by_id is None:
        vectors_by_id = _build_vectors(ollama_base, model, docs, prompt_mode)
    elif not hybrid:
        vectors_by_id = DomainVectors(compat={}, strategy={})
    # warm query embed
    if hybrid:
        _embed_one(ollama_base, model, _format_query(model, "warmup", prompt_mode))

    results: list[QueryResult] = []
    embed_times: list[float] = []
    fts_empty = 0

    for case in cases:
        top_k = _eval_top_k(case.ask_mode)
        expanded = _expand_query(case.query, "")
        if hybrid:
            q_text = _format_query(model, expanded, prompt_mode)
            q_vec, embed_ms = _embed_one(ollama_base, model, q_text)
            embed_times.append(embed_ms)
            cards = _hybrid_retrieve(
                conn,
                case,
                query_vector=q_vec,
                vectors_by_id=vectors_by_id,
                fts_k=HYBRID_FTS_SHORTLIST_K,
                top_k=top_k,
                # The model sweep measures models against the pipeline that ships, so it takes
                # the recall pass. Only the arms run has a reason to turn it off, and it does
                # that to hold the old shape alongside the new one for comparison.
                with_recall=True,
            )
        else:
            embed_ms = 0.0
            cards = _keyword_retrieve(
                conn,
                case,
                fts_k=top_k,
                top_k=top_k,
            )

        if not cards:
            fts_empty += 1
        hit_at_1, hit_at_3 = _score_cards(cards, case, top_k)
        results.append(
            QueryResult(
                case_id=case.case_id,
                hit_at_1=hit_at_1,
                hit_at_3=hit_at_3,
                fts_empty=not cards,
                embed_ms=embed_ms,
                top_names=[c.name for c in cards[:3]],
            )
        )

    n = len(cases) or 1
    return ModelScores(
        model=model,
        prompt_mode=prompt_mode,
        top1_pct=round(100.0 * sum(r.hit_at_1 for r in results) / n, 1),
        top3_pct=round(100.0 * sum(r.hit_at_3 for r in results) / n, 1),
        mean_embed_ms=round(sum(embed_times) / len(embed_times), 1) if embed_times else 0.0,
        fts_empty_pct=round(100.0 * fts_empty / n, 1),
        query_results=results,
    )


def _evaluate_spanish_probe(
    conn: sqlite3.Connection,
    ollama_base: str,
    model: str,
    compat_docs: list[CorpusDoc],
    cases: list[QueryCase],
    *,
    bare_vectors: DomainVectors,
    prompted_vectors: DomainVectors,
) -> dict[str, Any]:
    def _run(mode: PromptMode, vectors: DomainVectors, *, vector_only: bool) -> ModelScores:
        results: list[QueryResult] = []
        embed_times: list[float] = []
        fts_empty = 0
        for case in cases:
            top_k = _eval_top_k(case.ask_mode)
            expanded = _expand_query(case.query, "")
            q_text = _format_query(model, expanded, mode)
            q_vec, embed_ms = _embed_one(ollama_base, model, q_text)
            embed_times.append(embed_ms)
            if vector_only:
                cards = _vector_only(
                    compat_docs,
                    query_vector=q_vec,
                    vectors=vectors.compat,
                    top_k=top_k,
                )
            else:
                cards = _hybrid_retrieve(
                    conn,
                    case,
                    query_vector=q_vec,
                    vectors_by_id=vectors,
                    fts_k=HYBRID_FTS_SHORTLIST_K,
                    top_k=top_k,
                    # Compat cases only, and production runs no recall on the tip sheet, so
                    # this reads the same either way. Passed explicitly so the next person to
                    # change the compat path sees there is a decision here.
                    with_recall=True,
                )
            if not cards:
                fts_empty += 1
            hit_at_1, hit_at_3 = _score_cards(cards, case, top_k)
            results.append(
                QueryResult(
                    case_id=case.case_id,
                    hit_at_1=hit_at_1,
                    hit_at_3=hit_at_3,
                    fts_empty=not cards,
                    embed_ms=embed_ms,
                    top_names=[c.name for c in cards[:3]],
                )
            )
        n = len(cases) or 1
        return ModelScores(
            model=model,
            prompt_mode=mode,
            top1_pct=round(100.0 * sum(r.hit_at_1 for r in results) / n, 1),
            top3_pct=round(100.0 * sum(r.hit_at_3 for r in results) / n, 1),
            mean_embed_ms=round(sum(embed_times) / len(embed_times), 1) if embed_times else 0.0,
            fts_empty_pct=round(100.0 * fts_empty / n, 1),
            query_results=results,
        )

    return {
        "hybrid_bare": _run("bare", bare_vectors, vector_only=False),
        "hybrid_prompted": _run("prompted", prompted_vectors, vector_only=False),
        "vector_only_bare": _run("bare", bare_vectors, vector_only=True),
        "vector_only_prompted": _run("prompted", prompted_vectors, vector_only=True),
    }


def _aggregate_english(scores: list[ModelScores]) -> ModelScores:
    if not scores:
        return ModelScores(model="", prompt_mode="bare", top1_pct=0.0, top3_pct=0.0, mean_embed_ms=0.0, fts_empty_pct=0.0)
    total = sum(len(s.query_results) for s in scores)
    top1 = sum(sum(1 for r in s.query_results if r.hit_at_1) for s in scores)
    top3 = sum(sum(1 for r in s.query_results if r.hit_at_3) for s in scores)
    embeds = [r.embed_ms for s in scores for r in s.query_results if r.embed_ms > 0]
    fts_empty = sum(sum(1 for r in s.query_results if r.fts_empty) for s in scores)
    return ModelScores(
        model=scores[0].model,
        prompt_mode=scores[0].prompt_mode,
        top1_pct=round(100.0 * top1 / total, 1) if total else 0.0,
        top3_pct=round(100.0 * top3 / total, 1) if total else 0.0,
        mean_embed_ms=round(sum(embeds) / len(embeds), 1) if embeds else 0.0,
        fts_empty_pct=round(100.0 * fts_empty / total, 1) if total else 0.0,
    )


# --- retrieval arms: keyword vs vector-only vs RRF, same corpus, same cases ----------------


@dataclass
class ArmScores:
    arm: RetrievalArm
    n: int
    top1_pct: float
    top3_pct: float
    top1_ci: tuple[float, float]
    top3_ci: tuple[float, float]


def _bootstrap_ci(hits: list[bool]) -> tuple[float, float]:
    """Percentile bootstrap CI for a hit rate, in percentage points.

    An empty or single-case slice has no interval worth quoting, so it reports the full range
    rather than a falsely tight one -- a slice too small to measure should look too small.
    """
    n = len(hits)
    if n == 0:
        return (0.0, 100.0)
    if n == 1:
        return (0.0, 100.0)
    rng = random.Random(BOOTSTRAP_SEED)
    values = [1.0 if h else 0.0 for h in hits]
    means: list[float] = []
    for _ in range(BOOTSTRAP_RESAMPLES):
        total = 0.0
        for _ in range(n):
            total += values[rng.randrange(n)]
        means.append(100.0 * total / n)
    means.sort()
    lo = means[max(0, int(CI_PERCENTILES[0] / 100.0 * BOOTSTRAP_RESAMPLES) - 1)]
    hi = means[min(BOOTSTRAP_RESAMPLES - 1, int(CI_PERCENTILES[1] / 100.0 * BOOTSTRAP_RESAMPLES))]
    return (round(lo, 1), round(hi, 1))


def _arm_scores(arm: RetrievalArm, results: list[QueryResult]) -> ArmScores:
    n = len(results)
    top1 = [r.hit_at_1 for r in results]
    top3 = [r.hit_at_3 for r in results]
    return ArmScores(
        arm=arm,
        n=n,
        top1_pct=round(100.0 * sum(top1) / n, 1) if n else 0.0,
        top3_pct=round(100.0 * sum(top3) / n, 1) if n else 0.0,
        top1_ci=_bootstrap_ci(top1),
        top3_ci=_bootstrap_ci(top3),
    )


def _run_retrieval_arms(
    conn: sqlite3.Connection,
    ollama_base: str,
    model: str,
    docs: list[CorpusDoc],
    cases: list[QueryCase],
    *,
    vectors_by_id: DomainVectors,
) -> dict[str, list[QueryResult]]:
    """Run all three arms per case off one query embedding.

    Embedding once and reusing it is not just a speed trick: it removes embedding nondeterminism
    as a source of difference between the arms, so a gap between them is a ranking difference.
    """
    out: dict[str, list[QueryResult]] = {
        "keyword": [],
        "vector_only": [],
        "rrf_rerank_only": [],
        "rrf": [],
    }
    for case in cases:
        top_k = _eval_top_k(case.ask_mode)
        expanded = _expand_query(case.query, "")
        q_vec, embed_ms = _embed_one(
            ollama_base, model, _format_query(model, expanded, "prompted")
        )

        keyword_cards = _keyword_retrieve(conn, case, fts_k=top_k, top_k=top_k)
        vector_cards = _vector_only_for_case(
            case, conn, query_vector=q_vec, docs=docs, vectors=vectors_by_id, top_k=top_k
        )
        rerank_only_cards = _hybrid_retrieve(
            conn,
            case,
            query_vector=q_vec,
            vectors_by_id=vectors_by_id,
            fts_k=HYBRID_FTS_SHORTLIST_K,
            top_k=top_k,
            with_recall=False,
        )
        rrf_cards = _hybrid_retrieve(
            conn,
            case,
            query_vector=q_vec,
            vectors_by_id=vectors_by_id,
            fts_k=HYBRID_FTS_SHORTLIST_K,
            top_k=top_k,
            with_recall=True,
        )

        for arm, cards in (
            ("keyword", keyword_cards),
            ("vector_only", vector_cards),
            ("rrf_rerank_only", rerank_only_cards),
            ("rrf", rrf_cards),
        ):
            hit_at_1, hit_at_3 = _score_cards(cards, case, top_k)
            out[arm].append(
                QueryResult(
                    case_id=case.case_id,
                    hit_at_1=hit_at_1,
                    hit_at_3=hit_at_3,
                    fts_empty=not cards,
                    embed_ms=embed_ms if arm != "keyword" else 0.0,
                    top_names=[c.name for c in cards[:3]],
                )
            )
    return out


# --- weight sweep: does a different keyword/vector blend beat 1:1? -------------------------

DEFAULT_SWEEP_WEIGHTS = "1:1,0.75:1,0.5:1,0.25:1,0:1,1:0.75,1:0.5,1.5:1,1:1.5"


def _parse_weight_pairs(spec: str) -> list[tuple[float, float]]:
    """Parse ``"w_fts:w_vec,w_fts:w_vec,..."`` into pairs of floats."""
    pairs: list[tuple[float, float]] = []
    for chunk in spec.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        fts_str, sep, vec_str = chunk.partition(":")
        if not sep or not fts_str or not vec_str:
            raise ValueError(f"bad weight pair {chunk!r}; expected w_fts:w_vec")
        pairs.append((float(fts_str), float(vec_str)))
    if not pairs:
        raise ValueError(f"no weight pairs found in {spec!r}")
    return pairs


def _run_shipping_arm_at_weights(
    conn: sqlite3.Connection,
    cases: list[QueryCase],
    query_vectors: dict[str, list[float]],
    vectors_by_id: DomainVectors,
    weights: tuple[float, float],
) -> list[QueryResult]:
    """Run the shipping arm (``_hybrid_retrieve`` with recall) over ``cases`` at one
    ``(RRF_W_FTS, RRF_W_VEC)`` blend, restoring the constants afterward no matter what.

    Query vectors are supplied rather than embedded here -- the sweep embeds each case once
    and reuses the vector across every pair, since the embed round trip is the slow part and
    changing the weights does not change the embedding.
    """
    old_fts, old_vec = kb_service.RRF_W_FTS, kb_service.RRF_W_VEC
    kb_service.RRF_W_FTS, kb_service.RRF_W_VEC = weights
    try:
        results: list[QueryResult] = []
        for case in cases:
            top_k = _eval_top_k(case.ask_mode)
            q_vec = query_vectors[case.case_id]
            cards = _hybrid_retrieve(
                conn,
                case,
                query_vector=q_vec,
                vectors_by_id=vectors_by_id,
                fts_k=HYBRID_FTS_SHORTLIST_K,
                top_k=top_k,
                with_recall=True,
            )
            hit_at_1, hit_at_3 = _score_cards(cards, case, top_k)
            results.append(
                QueryResult(
                    case_id=case.case_id,
                    hit_at_1=hit_at_1,
                    hit_at_3=hit_at_3,
                    fts_empty=not cards,
                    embed_ms=0.0,
                    top_names=[c.name for c in cards[:3]],
                )
            )
        return results
    finally:
        kb_service.RRF_W_FTS, kb_service.RRF_W_VEC = old_fts, old_vec


def _embed_query_vectors(
    ollama_base: str, model: str, cases: list[QueryCase]
) -> dict[str, list[float]]:
    """Embed every case's query once, keyed by case id, for reuse across weight pairs."""
    out: dict[str, list[float]] = {}
    for case in cases:
        expanded = _expand_query(case.query, "")
        q_vec, _ = _embed_one(ollama_base, model, _format_query(model, expanded, "prompted"))
        out[case.case_id] = q_vec
    return out


def _pair_row(pair: tuple[float, float], results: list[QueryResult]) -> dict[str, Any]:
    scores = _arm_scores("rrf", results)
    return {
        "w_fts": pair[0],
        "w_vec": pair[1],
        "n": scores.n,
        "top1_pct": scores.top1_pct,
        "top3_pct": scores.top3_pct,
        "top1_ci": list(scores.top1_ci),
        "top3_ci": list(scores.top3_ci),
    }


def _sweep_weights(
    conn: sqlite3.Connection,
    ollama_base: str,
    model: str,
    vectors_by_id: DomainVectors,
    cases: list[QueryCase],
    pairs: list[tuple[float, float]],
) -> list[dict[str, Any]]:
    """Try every ``(w_fts, w_vec)`` pair on the shipping arm, **tuning rows only**.

    Holding holdout back here is the whole point of the split (R1) -- this function never even
    looks at a holdout case, let alone scores or prints one.
    """
    tuning_cases = [c for c in cases if c.split == "tune" and _case_is_labeled(c)]
    query_vectors = _embed_query_vectors(ollama_base, model, tuning_cases)
    return [
        _pair_row(
            pair, _run_shipping_arm_at_weights(conn, tuning_cases, query_vectors, vectors_by_id, pair)
        )
        for pair in pairs
    ]


def _confirm_holdout(
    conn: sqlite3.Connection,
    ollama_base: str,
    model: str,
    vectors_by_id: DomainVectors,
    cases: list[QueryCase],
    pair: tuple[float, float],
) -> dict[str, Any]:
    """Run exactly one candidate pair, and 1:1 for comparison, on the holdout rows only."""
    holdout_cases = [c for c in cases if c.split == "holdout" and _case_is_labeled(c)]
    query_vectors = _embed_query_vectors(ollama_base, model, holdout_cases)
    candidate = _run_shipping_arm_at_weights(conn, holdout_cases, query_vectors, vectors_by_id, pair)
    baseline = _run_shipping_arm_at_weights(
        conn, holdout_cases, query_vectors, vectors_by_id, (1.0, 1.0)
    )
    return {
        "candidate": _pair_row(pair, candidate),
        "baseline": _pair_row((1.0, 1.0), baseline),
    }


def _print_sweep_table(rows: list[dict[str, Any]]) -> None:
    print("", file=sys.stderr)
    print("Weight sweep (tuning rows only; holdout is never read here):", file=sys.stderr)
    header = f"{'w_fts:w_vec':<12} {'n':>4} {'right card first':>18} {'in top 3':>10} {'ci (right first)':>18} {'ci (top 3)':>18}"
    print(header, file=sys.stderr)
    for row in rows:
        pair_label = f"{row['w_fts']:g}:{row['w_vec']:g}"
        top1_ci = f"[{row['top1_ci'][0]}, {row['top1_ci'][1]}]"
        top3_ci = f"[{row['top3_ci'][0]}, {row['top3_ci'][1]}]"
        print(
            f"{pair_label:<12} {row['n']:>4} {row['top1_pct']:>17.1f}% {row['top3_pct']:>9.1f}% "
            f"{top1_ci:>18} {top3_ci:>18}",
            file=sys.stderr,
        )


def _print_confirm_holdout(result: dict[str, Any]) -> None:
    for label, row in (("candidate", result["candidate"]), ("baseline 1:1", result["baseline"])):
        pair_label = f"{row['w_fts']:g}:{row['w_vec']:g}"
        top1_ci = f"[{row['top1_ci'][0]}, {row['top1_ci'][1]}]"
        top3_ci = f"[{row['top3_ci'][0]}, {row['top3_ci'][1]}]"
        print(
            f"{label} ({pair_label}) n={row['n']} right card first {row['top1_pct']}% {top1_ci} "
            f"in top 3 {row['top3_pct']}% {top3_ci}",
            file=sys.stderr,
        )


# --- tie-break variant: even by default, meaning leans higher only where keyword found
# nothing --------------------------------------------------------------------------------

# The narrower follow-up recommended when the meaning-leaning weight change was reverted
# (docs/planning/47, Lane F): leaning the *whole* blend toward meaning buried a brand-new note
# with no baked vector yet, because a real keyword hit with no vector already pays a one-rank
# penalty in _fuse_cards_by_rrf, and a heavier vector weight makes that penalty bite harder.
# Tilting only when the keyword pass returned nothing at all removes that risk outright -- there
# is no keyword hit to bury when there is not one. Measured only: nothing here ships, and
# knowledge_base_service.py is never edited -- only its module constants are swapped for the
# duration of one query, the same way the weight sweep above does it.
TIE_BREAK_EVEN_WEIGHTS = (1.0, 1.0)
TIE_BREAK_NO_MATCH_WEIGHTS = (1.0, 2.0)


def _tie_break_weights(
    keyword_cards: list[KnowledgeCard],
    *,
    no_match_weights: tuple[float, float] = TIE_BREAK_NO_MATCH_WEIGHTS,
    even_weights: tuple[float, float] = TIE_BREAK_EVEN_WEIGHTS,
) -> tuple[float, float]:
    """Even by default; leans toward meaning only when the keyword pass found no card at all.

    A pure decision with no DB or Ollama call, split out from ``_run_tie_break_arm`` so the
    rule itself -- and not the plumbing around it -- is what a test pins.
    """
    return even_weights if keyword_cards else no_match_weights


def _run_tie_break_arm(
    conn: sqlite3.Connection,
    cases: list[QueryCase],
    query_vectors: dict[str, list[float]],
    vectors_by_id: DomainVectors,
    *,
    no_match_weights: tuple[float, float] = TIE_BREAK_NO_MATCH_WEIGHTS,
    even_weights: tuple[float, float] = TIE_BREAK_EVEN_WEIGHTS,
) -> list[QueryResult]:
    """Even blend by default; leans toward meaning only for a case whose keyword pass found no
    card at all (nothing cleared the relevance floor in ``_search_sections`` /
    ``_search_compat_patterns``). Restores the module constants afterward no matter what.
    """
    old_fts, old_vec = kb_service.RRF_W_FTS, kb_service.RRF_W_VEC
    try:
        results: list[QueryResult] = []
        for case in cases:
            top_k = _eval_top_k(case.ask_mode)
            q_vec = query_vectors[case.case_id]
            expanded = _expand_query(case.query, "")
            if case.domain == "compat":
                keyword_cards = _search_compat_patterns(
                    conn, query=expanded, top_k=HYBRID_FTS_SHORTLIST_K
                )
            else:
                game_id, _ = _resolve_game_id(
                    conn, app_id=case.app_id, app_name="", shortcut_name=case.shortcut
                )
                keyword_cards = (
                    _search_sections(conn, game_id=game_id, query=expanded, top_k=HYBRID_FTS_SHORTLIST_K)
                    if game_id is not None
                    else []
                )
            kb_service.RRF_W_FTS, kb_service.RRF_W_VEC = _tie_break_weights(
                keyword_cards, no_match_weights=no_match_weights, even_weights=even_weights
            )
            cards = _hybrid_retrieve(
                conn,
                case,
                query_vector=q_vec,
                vectors_by_id=vectors_by_id,
                fts_k=HYBRID_FTS_SHORTLIST_K,
                top_k=top_k,
                with_recall=True,
            )
            hit_at_1, hit_at_3 = _score_cards(cards, case, top_k)
            results.append(
                QueryResult(
                    case_id=case.case_id,
                    hit_at_1=hit_at_1,
                    hit_at_3=hit_at_3,
                    fts_empty=not cards,
                    embed_ms=0.0,
                    top_names=[c.name for c in cards[:3]],
                )
            )
        return results
    finally:
        kb_service.RRF_W_FTS, kb_service.RRF_W_VEC = old_fts, old_vec


def _named_row(label: str, results: list[QueryResult]) -> dict[str, Any]:
    scores = _arm_scores("rrf", results)
    return {
        "label": label,
        "n": scores.n,
        "top1_pct": scores.top1_pct,
        "top3_pct": scores.top3_pct,
        "top1_ci": list(scores.top1_ci),
        "top3_ci": list(scores.top3_ci),
    }


def _run_tie_break_comparison(
    conn: sqlite3.Connection,
    ollama_base: str,
    model: str,
    vectors_by_id: DomainVectors,
    cases: list[QueryCase],
    split: Split,
) -> dict[str, Any]:
    """Tie-break vs today's even 1:1 split, over one split's labeled rows only."""
    split_cases = [c for c in cases if c.split == split and _case_is_labeled(c)]
    query_vectors = _embed_query_vectors(ollama_base, model, split_cases)
    tie_break = _run_tie_break_arm(conn, split_cases, query_vectors, vectors_by_id)
    even = _run_shipping_arm_at_weights(
        conn, split_cases, query_vectors, vectors_by_id, TIE_BREAK_EVEN_WEIGHTS
    )
    return {
        "split": split,
        "tie_break": _named_row("tie-break", tie_break),
        "even": _named_row("even 1:1", even),
    }


def _print_tie_break_comparison(result: dict[str, Any]) -> None:
    print("", file=sys.stderr)
    print(f"Tie-break vs even, {result['split']} rows:", file=sys.stderr)
    for row in (result["tie_break"], result["even"]):
        top1_ci = f"[{row['top1_ci'][0]}, {row['top1_ci'][1]}]"
        top3_ci = f"[{row['top3_ci'][0]}, {row['top3_ci'][1]}]"
        print(
            f"{row['label']:<10} n={row['n']} right card first {row['top1_pct']}% {top1_ci} "
            f"in top 3 {row['top3_pct']}% {top3_ci}",
            file=sys.stderr,
        )


def _slice_results(
    results: dict[str, list[QueryResult]], cases: list[QueryCase], keep: Any
) -> dict[str, list[QueryResult]]:
    """Filter every arm's results by a predicate over the matching case, keeping arms aligned."""
    indices = [i for i, case in enumerate(cases) if keep(case)]
    return {arm: [rows[i] for i in indices] for arm, rows in results.items()}


def _per_case_table(
    cases: list[QueryCase], results: dict[str, list[QueryResult]]
) -> dict[str, list[dict[str, Any]]]:
    """One row per case per arm, so a bad case can be read by eye instead of only by average.

    ``results[arm]`` is built one entry per case in the same order as ``cases`` (see
    ``_run_retrieval_arms``), so zipping the two lists lines each result up with the case it
    scored. ``top_names`` is copied through as-is -- it is already rank order.
    """
    out: dict[str, list[dict[str, Any]]] = {}
    for arm, rows in results.items():
        out[arm] = [
            {
                "case_id": row.case_id,
                "split": case.split,
                "domain": case.domain,
                "hit_at_1": row.hit_at_1,
                "hit_at_3": row.hit_at_3,
                "fts_empty": row.fts_empty,
                "top_names": row.top_names,
            }
            for case, row in zip(cases, rows)
        ]
    return out


def _keyword_blind_slice(
    results: dict[str, list[QueryResult]],
) -> dict[str, list[QueryResult]]:
    """Only the cases where the **keyword** arm returned nothing at all.

    This is the slice that hid the recall bug found on Deck 2026-08-17. With vectors loaded
    only for cards FTS had already found, every fusion arm scored zero here by construction --
    and because the corpus answers most labeled questions on keywords alone, the overall
    numbers barely moved. A hybrid that cannot answer when keyword search comes up empty is not
    adding recall, whatever its average says, and this is where that shows.

    Sliced off the keyword arm's own ``fts_empty`` rather than each arm's, so every arm is
    scored on the same cases.
    """
    keyword = results.get("keyword") or []
    indices = [i for i, row in enumerate(keyword) if row.fts_empty]
    return {arm: [rows[i] for i in indices] for arm, rows in results.items()}


def _arms_table(results: dict[str, list[QueryResult]]) -> dict[str, Any]:
    table: dict[str, Any] = {}
    for arm, rows in results.items():
        scores = _arm_scores(arm, rows)  # type: ignore[arg-type]
        table[arm] = {
            "arm": scores.arm,
            "n": scores.n,
            "top1_pct": scores.top1_pct,
            "top3_pct": scores.top3_pct,
            "top1_ci": list(scores.top1_ci),
            "top3_ci": list(scores.top3_ci),
        }
    return table


def _case_is_labeled(case: QueryCase) -> bool:
    """Blank expect_* rows are deliberate corpus gaps and always miss; exclude them from ship-gate math.

    A list `expect_section` (a second right answer) counts as labeled when any name in it is
    non-blank -- the same rule a single string already followed, just applied per name.
    """
    if case.domain == "compat":
        return bool(case.expect_topic.strip())
    names = case.expect_section if isinstance(case.expect_section, list) else [case.expect_section]
    return any(name.strip() for name in names)


_ARM_LABELS: dict[str, str] = {
    "keyword": "keyword",
    "vector_only": "vector-only",
    "rrf_rerank_only": "RRF-rerank-only",
    "rrf": "RRF",
}


def _arm_label(arm: str) -> str:
    return _ARM_LABELS.get(arm, arm)


def _cap_first(text: str) -> str:
    """Capitalize a label for the start of a sentence without mangling an acronym like RRF."""
    return text if text[:1].isupper() else text[:1].upper() + text[1:]


def _fmt_arm_ci(arm: str, data: dict[str, Any]) -> str:
    lo, hi = data["top3_ci"]
    return f"{_arm_label(arm)} {data['top3_pct']}% [{lo}, {hi}]"


def _arms_verdict(table: dict[str, Any]) -> str:
    """Judge every arm present in the holdout table, not just one hand-picked pair.

    The 2026-08-29 run printed "no separation" while its own table showed `vector_only` well
    ahead, because the old version only ever compared `rrf` against `keyword` regardless of what
    else the table held. This names the arm with the best top-3 point estimate, then applies the
    locked non-overlapping-CI rule between it and *every other* arm present.

    Overlapping intervals mean the fixtures cannot tell the arms apart. That is a real result and
    must be reported as one -- not rounded up to a win because a point estimate is higher. Still
    works for a two-arm table (the shape every existing test and, previously, the report used).
    """
    present = {arm: data for arm, data in table.items() if data}
    if len(present) < 2:
        return "No verdict: fewer than two arms in the holdout run."
    if not any(data.get("n") for data in present.values()):
        return (
            "No verdict: the holdout split has no labeled cases. Blind holdout rows must carry "
            "`expect_section` / `expect_topic` before they can gate fusion."
        )

    arms_judged = ", ".join(_arm_label(arm) for arm in present)
    winner = max(present, key=lambda arm: present[arm]["top3_pct"])
    winner_lo, _winner_hi = present[winner]["top3_ci"]

    # The non-overlap rule, applied pairwise between the winner and every other arm -- not just
    # the one arm the old code happened to hard-code.
    cleared: list[str] = []
    overlapping: list[str] = []
    for arm in present:
        if arm == winner:
            continue
        _lo, hi = present[arm]["top3_ci"]
        (cleared if winner_lo > hi else overlapping).append(arm)

    if not overlapping:
        others = ", ".join(_arm_label(a) for a in cleared)
        detail = " vs ".join(_fmt_arm_ci(a, present[a]) for a in [winner, *cleared])
        verdict = (
            f"{_cap_first(_arm_label(winner))} beats {others} on holdout top-3: {detail} — "
            "intervals do not overlap."
        )
        if winner == "keyword" and "rrf" in cleared:
            verdict += " Fusion is not earning its embed cost on this corpus."
        return f"{verdict} (Arms judged: {arms_judged}.)"

    # Still an overlap even when the winner clears some arms but not all of them -- name it as
    # one rather than rounding the partial win up to a clean beat.
    detail = " vs ".join(_fmt_arm_ci(a, present[a]) for a in [winner, *overlapping])
    verdict = (
        f"No separation on holdout top-3: {detail} — intervals overlap, so these "
        f"fixtures (n={present[winner]['n']}) cannot tell the arms apart. Not a tie; an "
        "unresolved question."
    )
    if cleared:
        beaten = ", ".join(_fmt_arm_ci(a, present[a]) for a in cleared)
        verdict += f" {_cap_first(_arm_label(winner))} does still clear {beaten}."
    return f"{verdict} (Arms judged: {arms_judged}.)"


def _gate_summary(cases: list[QueryCase]) -> dict[str, Any]:
    """What the production gate would actually route, per domain (R2)."""
    out: dict[str, Any] = {}
    for domain in ("compat", "strategy"):
        rows = [c for c in cases if c.domain == domain]
        reachable = [c for c in rows if c.gate_reachable]
        out[domain] = {
            "total": len(rows),
            "gate_reachable": len(reachable),
            "unreachable_ids": [c.case_id for c in rows if not c.gate_reachable][:20],
        }
    return out


def _pick_winner(english_prompted: dict[str, ModelScores]) -> tuple[str, str]:
    if not english_prompted:
        return BASELINE_MODEL, (
            f"No model sweep in this run (`--arms-only`); `{BASELINE_MODEL}` stands unchallenged "
            "by default, not by measurement."
        )
    baseline = english_prompted.get(BASELINE_MODEL)
    baseline_top3 = baseline.top3_pct if baseline else 0.0

    ranked = sorted(
        english_prompted.items(),
        key=lambda item: (
            -item[1].top3_pct,
            -item[1].top1_pct,
            item[1].mean_embed_ms,
            MODEL_SIZE_MB.get(item[0], 9999),
        ),
    )
    winner_model, winner_scores = ranked[0]
    margin = winner_scores.top3_pct - baseline_top3

    if winner_model == BASELINE_MODEL or margin < WINNER_MARGIN_TOP3:
        reason = (
            f"Keep `{BASELINE_MODEL}`: best prompted top-3 is `{winner_model}` at "
            f"{winner_scores.top3_pct}% vs baseline {baseline_top3}% "
            f"(margin {margin:+.1f} pts; need ≥{WINNER_MARGIN_TOP3} to switch)."
        )
        return BASELINE_MODEL, reason

    return winner_model, (
        f"Recommend `{winner_model}`: prompted English top-3 {winner_scores.top3_pct}% "
        f"beats `{BASELINE_MODEL}` {baseline_top3}% by {margin:+.1f} pts "
        f"(≥{WINNER_MARGIN_TOP3} threshold). Mean query embed {winner_scores.mean_embed_ms} ms; "
        f"~{MODEL_SIZE_MB.get(winner_model, '?')} MB download."
    )


def _scores_to_dict(scores: ModelScores) -> dict[str, Any]:
    return {
        "model": scores.model,
        "prompt_mode": scores.prompt_mode,
        "top1_pct": scores.top1_pct,
        "top3_pct": scores.top3_pct,
        "mean_embed_ms": scores.mean_embed_ms,
        "fts_empty_pct": scores.fts_empty_pct,
        "query_results": [
            {
                "case_id": r.case_id,
                "hit_at_1": r.hit_at_1,
                "hit_at_3": r.hit_at_3,
                "fts_empty": r.fts_empty,
                "embed_ms": r.embed_ms,
                "top_names": r.top_names,
            }
            for r in scores.query_results
        ],
    }


def _best_prompted_line(payload: dict[str, Any]) -> str:
    prompted = payload.get("english", {}).get("prompted") or {}
    if not prompted:
        return "not measured in this run (`--arms-only`)."
    model, scores = max(prompted.items(), key=lambda item: item[1].get("top3_pct", 0.0))
    return f"**{scores.get('top3_pct')}%** (`{model}`; see table below)."


def _write_report(
    report_path: Path,
    *,
    payload: dict[str, Any],
    recommendation: str,
    winner: str,
) -> None:
    lines = [
        "# KB embed model bake-off",
        "",
        f"Date: {payload['date']}",
        f"Ollama: `{payload['ollama_base']}`",
        f"Corpus: `{payload['corpus_db']}`",
        f"Corpus version: {payload['corpus_version']} · notes searched: "
        f"{payload['corpus_note_count']} · tips searched: {payload['corpus_tip_count']}",
        "",
        "## Recommendation",
        "",
        recommendation,
        "",
        f"**Winner under locked rule:** `{winner}`",
        "",
        "## Key findings",
        "",
        f"- Keyword-only baseline: **{payload['keyword_baseline']['top1_pct']}%** top-1 / **{payload['keyword_baseline']['top3_pct']}%** top-3.",
        f"- Best hybrid prompted top-3: {_best_prompted_line(payload)}",
        f"- Holdout arm verdict: {(payload.get('arms') or {}).get('verdict', 'not run')}",
        "- Re-run: `python scripts/kb/eval_kb_embed_models.py --write-report`",
        "",
        "## English aggregate (kb_eval_v2, labeled rows)",
        "",
        f"Scoring uses `max(ask_mode top_k, {EVAL_MIN_TOP_K})` so top-3 is meaningful when fixtures use speed mode. "
        "Blank-label gap rows are excluded from model and arm ship-gate math.",
        "",
        "| Model | Bare top-1 | Bare top-3 | Prompted top-1 | Prompted top-3 | Mean embed ms | FTS empty % |",
        "|-------|------------|------------|----------------|----------------|---------------|-------------|",
    ]
    for model in payload["models"]:
        bare = payload["english"]["bare"].get(model, {})
        prompted = payload["english"]["prompted"].get(model, {})
        lines.append(
            f"| {model} | {bare.get('top1_pct', '—')}% | {bare.get('top3_pct', '—')}% | "
            f"{prompted.get('top1_pct', '—')}% | {prompted.get('top3_pct', '—')}% | "
            f"{prompted.get('mean_embed_ms', '—')} | {prompted.get('fts_empty_pct', '—')}% |"
        )

    arms = payload.get("arms") or {}
    if arms:
        lines.extend(
            [
                "",
                "## Retrieval arms — keyword vs vector-only vs RRF",
                "",
                f"Baseline model `{arms['model']}`, prompted, **same corpus for every arm** (R4). "
                "Confidence intervals are a seeded percentile bootstrap "
                f"({BOOTSTRAP_RESAMPLES} resamples) over per-case hits.",
                "",
                "**Weights and the floor are tuned on `tune` only. `holdout` is the ship gate — "
                "reading it before tuning is finished invalidates it.**",
                "",
            ]
        )
        for split in ("tune", "holdout"):
            table = arms["splits"].get(split) or {}
            if not table:
                continue
            lines.extend(
                [
                    f"### {split} (n={table.get('rrf', {}).get('n', 0)})",
                    "",
                    "| Arm | top-1 | top-1 CI | top-3 | top-3 CI |",
                    "|-----|-------|----------|-------|----------|",
                ]
            )
            for arm in ("keyword", "vector_only", "rrf_rerank_only", "rrf"):
                row = table.get(arm)
                if not row:
                    continue
                lines.append(
                    f"| {arm} | {row['top1_pct']}% | [{row['top1_ci'][0]}, {row['top1_ci'][1]}] | "
                    f"{row['top3_pct']}% | [{row['top3_ci'][0]}, {row['top3_ci'][1]}] |"
                )
            lines.append("")
        lines.extend(["**Holdout verdict:** " + arms["verdict"], ""])

        blind = arms.get("keyword_blind") or {}
        blind_n = (blind.get("keyword") or {}).get("n", 0)
        lines.extend(
            [
                "### Recall — labeled cases keyword search cannot answer",
                "",
                "Cases where the **keyword** arm returned no candidate at all. Every arm is "
                "scored on the same cases, so this reads as: when keywords fail, who still "
                "finds the card?",
                "",
                "This slice exists because its absence hid a real bug. Until 2026-08-18 the "
                "vector half only re-ordered the keyword shortlist, so every fusion arm scored "
                "**0% here by construction** — and because the corpus answers most labeled "
                "questions on keywords alone, the overall tables barely moved. A `rrf` row that "
                "matches `rrf_rerank_only` here means the recall pass has stopped working.",
                "",
            ]
        )
        if not blind_n:
            lines.extend(
                [
                    "No labeled case left the keyword arm empty in this run — the slice is "
                    "empty, which is a property of the fixtures, not a pass.",
                    "",
                ]
            )
        else:
            lines.extend(
                [
                    f"| Arm | top-1 | top-3 | n |",
                    "|-----|-------|-------|---|",
                ]
            )
            for arm in ("vector_only", "rrf_rerank_only", "rrf"):
                row = blind.get(arm)
                if not row:
                    continue
                lines.append(
                    f"| {arm} | {row['top1_pct']}% | {row['top3_pct']}% | {row['n']} |"
                )
            lines.append("")

        lines.extend(
            [
                "## Gate reachability (R2)",
                "",
                "A fixture's `domain` is what we want retrieval to do. `should_retrieve_knowledge` "
                "decides what production *actually* does. Cases where those disagree are not "
                "retrieval failures — they are traffic that never reaches retrieval at all, and "
                "they must not drive weight tuning. (Q8 / D16 widened the compat gate; remaining "
                "unreachable rows are expected misses, not a deferred product bug.)",
                "",
                "| Domain | Cases | Gate-reachable | Unreachable |",
                "|--------|-------|----------------|-------------|",
            ]
        )
        for domain, row in (payload.get("gate") or {}).items():
            unreachable = row["total"] - row["gate_reachable"]
            lines.append(
                f"| {domain} | {row['total']} | {row['gate_reachable']} | {unreachable} |"
            )
        compat_only = arms.get("compat_gate_reachable")
        compat_all = arms.get("compat_all")
        if compat_all:
            lines.extend(
                [
                    "",
                    "### Compat scored twice",
                    "",
                    "| Slice | Arm | top-3 | top-3 CI | n |",
                    "|-------|-----|-------|----------|---|",
                ]
            )
            for label, table in (("overall", compat_all), ("gate-reachable only", compat_only)):
                if not table:
                    continue
                for arm in ("keyword", "vector_only", "rrf_rerank_only", "rrf"):
                    row = table.get(arm)
                    if not row:
                        continue
                    lines.append(
                        f"| {label} | {arm} | {row['top3_pct']}% | "
                        f"[{row['top3_ci'][0]}, {row['top3_ci'][1]}] | {row['n']} |"
                    )
            lines.append("")

    lines.extend(
        [
            "",
            "## Keyword-only baseline",
            "",
            f"- Top-1: **{payload['keyword_baseline']['top1_pct']}%**",
            f"- Top-3: **{payload['keyword_baseline']['top3_pct']}%**",
            f"- FTS empty: **{payload['keyword_baseline']['fts_empty_pct']}%**",
            "",
            "## Spanish probe (informational — does not pick winner)",
            "",
            "| Model | Hybrid bare top-3 | Hybrid prompted top-3 | Vector-only bare top-3 | Vector-only prompted top-3 |",
            "|-------|-------------------|----------------------|------------------------|----------------------------|",
        ]
    )
    for model, probe in payload.get("spanish_probe", {}).items():
        lines.append(
            f"| {model} | {probe['hybrid_bare']['top3_pct']}% | {probe['hybrid_prompted']['top3_pct']}% | "
            f"{probe['vector_only_bare']['top3_pct']}% | {probe['vector_only_prompted']['top3_pct']}% |"
        )

    lines.extend(
        [
            "",
            "## Winner rule (locked)",
            "",
            "1. Highest **prompted top-3** on English eval + paraphrases.",
            "2. Ties → top-1, mean embed latency, download size.",
            f"3. Switch only if margin over `{BASELINE_MODEL}` prompted top-3 ≥ **{WINNER_MARGIN_TOP3}** points.",
            "",
            "## Raw JSON",
            "",
            f"Full payload: `{payload['json_path']}`",
            "",
        ]
    )
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text("\n".join(lines), encoding="utf-8")


def run_bakeoff(
    *,
    ollama_base: str,
    out_dir: Path,
    models: list[str],
    write_report: bool,
    arms_only: bool = False,
    force_rebuild: bool = False,
) -> dict[str, Any]:
    # Find the workshop before the long run starts, not after it has finished.
    research_dir = workshop.research_dir(REPO_ROOT)
    db_path = _ensure_seed_db(out_dir, ollama_base=ollama_base, force_rebuild=force_rebuild)
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row

    docs = _load_corpus_docs(conn)
    compat_docs = [d for d in docs if d.domain == "compat"]

    # PR2 ship gate: v2 intents + deepened seed. Legacy v0/paraphrase stay available for
    # historical comparison but no longer drive the arm verdict or model recommendation.
    english_cases = _load_fixture(FIXTURES / "kb_eval_v2.json", "kb_eval_v2")
    labeled_cases = [c for c in english_cases if _case_is_labeled(c)]
    spanish_cases = _load_fixture(FIXTURES / "kb_eval_es_probe_v0.json", "spanish_probe")

    keyword_scores = _evaluate_model(
        conn, ollama_base, "keyword", docs, labeled_cases, prompt_mode="bare", hybrid=False
    )

    gate = _gate_summary(english_cases)
    for domain, row in gate.items():
        unreachable = row["total"] - row["gate_reachable"]
        if unreachable:
            print(
                f"gate: {unreachable}/{row['total']} {domain} cases never reach retrieval in "
                f"production — scored, but reported separately",
                file=sys.stderr,
            )

    # The arm comparison runs at the baseline model only. Crossing three arms with six models
    # would multiply cost without answering the question the arms exist to answer.
    print(f"Embedding corpus for {BASELINE_MODEL} (arms)...", file=sys.stderr)
    arm_vectors = _build_vectors(ollama_base, BASELINE_MODEL, docs, "prompted")
    print(
        f"Running retrieval arms on {len(english_cases)} v2 cases "
        f"({len(labeled_cases)} labeled)...",
        file=sys.stderr,
    )
    arm_results = _run_retrieval_arms(
        conn, ollama_base, BASELINE_MODEL, docs, english_cases, vectors_by_id=arm_vectors
    )
    arms: dict[str, Any] = {
        "model": BASELINE_MODEL,
        "fixture": "kb_eval_v2",
        "n_all": len(english_cases),
        "n_labeled": len(labeled_cases),
        "splits_all": {
            split: _arms_table(
                _slice_results(arm_results, english_cases, lambda c, s=split: c.split == s)
            )
            for split in ("tune", "holdout")
        },
        # Ship-gate numbers ignore blank-label gaps so automatic misses do not drown the arms.
        "splits": {
            split: _arms_table(
                _slice_results(
                    arm_results,
                    english_cases,
                    lambda c, s=split: c.split == s and _case_is_labeled(c),
                )
            )
            for split in ("tune", "holdout")
        },
        "compat_all": _arms_table(
            _slice_results(arm_results, english_cases, lambda c: c.domain == "compat")
        ),
        "compat_gate_reachable": _arms_table(
            _slice_results(
                arm_results, english_cases, lambda c: c.domain == "compat" and c.gate_reachable
            )
        ),
        # The recall question, asked directly: of the labeled cases keyword search cannot
        # answer at all, how many does each arm still get right?
        "keyword_blind": _arms_table(
            _keyword_blind_slice(
                _slice_results(arm_results, english_cases, _case_is_labeled)
            )
        ),
    }
    arms["verdict"] = _arms_verdict(arms["splits"].get("holdout") or {})
    print(arms["verdict"], file=sys.stderr)

    english_bare: dict[str, dict[str, Any]] = {}
    english_prompted: dict[str, dict[str, Any]] = {}
    english_prompted_scores: dict[str, ModelScores] = {}

    for model in [] if arms_only else models:
        print(f"Embedding corpus for {model} (bare)...", file=sys.stderr)
        bare_vectors = _build_vectors(ollama_base, model, docs, "bare")
        print(f"Evaluating {model} (bare) on labeled v2...", file=sys.stderr)
        bare_agg = _evaluate_model(
            conn,
            ollama_base,
            model,
            docs,
            labeled_cases,
            prompt_mode="bare",
            hybrid=True,
            vectors_by_id=bare_vectors,
        )
        english_bare[model] = _scores_to_dict(bare_agg)

        print(f"Embedding corpus for {model} (prompted)...", file=sys.stderr)
        prompted_vectors = _build_vectors(ollama_base, model, docs, "prompted")
        print(f"Evaluating {model} (prompted) on labeled v2...", file=sys.stderr)
        prompted_agg = _evaluate_model(
            conn,
            ollama_base,
            model,
            docs,
            labeled_cases,
            prompt_mode="prompted",
            hybrid=True,
            vectors_by_id=prompted_vectors,
        )
        english_prompted[model] = _scores_to_dict(prompted_agg)
        english_prompted_scores[model] = prompted_agg

    spanish_probe: dict[str, Any] = {}
    for model in [] if arms_only else models:
        print(f"Spanish probe {model}...", file=sys.stderr)
        bare_cv = _build_vectors(ollama_base, model, compat_docs, "bare")
        prompted_cv = _build_vectors(ollama_base, model, compat_docs, "prompted")
        probe = _evaluate_spanish_probe(
            conn,
            ollama_base,
            model,
            compat_docs,
            spanish_cases,
            bare_vectors=bare_cv,
            prompted_vectors=prompted_cv,
        )
        spanish_probe[model] = {
            "hybrid_bare": _scores_to_dict(probe["hybrid_bare"]),
            "hybrid_prompted": _scores_to_dict(probe["hybrid_prompted"]),
            "vector_only_bare": _scores_to_dict(probe["vector_only_bare"]),
            "vector_only_prompted": _scores_to_dict(probe["vector_only_prompted"]),
        }

    conn.close()

    winner, recommendation = _pick_winner(english_prompted_scores)
    today = date.today().isoformat()
    # An arms-only run is a partial. Naming it like the full bake-off leaves a dated file in
    # the research folder that reads as the real thing and is missing the model sweep.
    suffix = "-arms" if arms_only else ""
    json_path = research_dir / f"kb-embed-bakeoff-{today}{suffix}.json"

    corpus_manifest = _read_corpus_manifest(out_dir)
    payload: dict[str, Any] = {
        "date": today,
        "ollama_base": ollama_base,
        "corpus_db": str(db_path),
        "corpus_version": corpus_manifest["version"],
        "corpus_note_count": corpus_manifest["note_count"],
        "corpus_tip_count": corpus_manifest["tip_count"],
        "models": models,
        "keyword_baseline": _scores_to_dict(keyword_scores),
        "english": {"bare": english_bare, "prompted": english_prompted},
        "arms": arms,
        "per_case": _per_case_table(english_cases, arm_results),
        "gate": gate,
        "spanish_probe": spanish_probe,
        "winner": winner,
        "recommendation": recommendation,
        "json_path": "workshop:" + json_path.relative_to(research_dir.parents[1]).as_posix(),
    }

    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    if write_report:
        report_path = research_dir / f"kb-embed-bakeoff-{today}{suffix}.md"
        _write_report(report_path, payload=payload, recommendation=recommendation, winner=winner)
        print(f"Wrote {report_path}", file=sys.stderr)

    print(f"Wrote {json_path}", file=sys.stderr)
    print(recommendation, file=sys.stderr)
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description="KB embed model bake-off eval")
    parser.add_argument("--ollama", default=DEFAULT_OLLAMA, help="Ollama HTTP base URL")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT_DIR, help="Seed corpus output dir")
    parser.add_argument(
        "--models",
        nargs="+",
        default=DEFAULT_MODELS,
        help="Ollama embed model tags to evaluate",
    )
    parser.add_argument("--write-report", action="store_true", default=True)
    parser.add_argument("--no-write-report", action="store_false", dest="write_report")
    parser.add_argument(
        "--arms-only",
        action="store_true",
        help="Run only the keyword/vector-only/RRF comparison, skipping the model sweep",
    )
    parser.add_argument(
        "--force-rebuild",
        action="store_true",
        help="Rebuild the seed corpus even if corpus.db already exists under --out",
    )
    parser.add_argument(
        "--sweep-weights",
        nargs="?",
        const=DEFAULT_SWEEP_WEIGHTS,
        default=None,
        metavar="W_FTS:W_VEC,...",
        help=(
            "Try each RRF weight pair on the shipping arm over tuning rows only, print one "
            f"table, and exit (never touches holdout). Defaults to {DEFAULT_SWEEP_WEIGHTS}."
        ),
    )
    parser.add_argument(
        "--confirm-holdout",
        default=None,
        metavar="W_FTS:W_VEC",
        help=(
            "Run exactly this weight pair, and 1:1 for comparison, on holdout rows only; "
            "prints the two side by side and exits. Nothing else runs."
        ),
    )
    parser.add_argument(
        "--tie-break",
        action="store_true",
        help=(
            "Measure the tie-break variant (even blend, leaning toward meaning only where "
            "keyword found nothing) against today's even split, once on tuning rows and once "
            "on holdout rows. Prints both tables and exits. Never edits "
            "knowledge_base_service.py or ships anything."
        ),
    )
    args = parser.parse_args()

    if args.sweep_weights is not None or args.confirm_holdout is not None or args.tie_break:
        try:
            db_path = _ensure_seed_db(
                args.out, ollama_base=args.ollama, force_rebuild=args.force_rebuild
            )
            conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
            conn.row_factory = sqlite3.Row
            docs = _load_corpus_docs(conn)
            cases = _load_fixture(FIXTURES / "kb_eval_v2.json", "kb_eval_v2")
            print(f"Embedding corpus for {BASELINE_MODEL}...", file=sys.stderr)
            vectors_by_id = _build_vectors(args.ollama, BASELINE_MODEL, docs, "prompted")

            if args.tie_break:
                for split in ("tune", "holdout"):
                    result = _run_tie_break_comparison(
                        conn, args.ollama, BASELINE_MODEL, vectors_by_id, cases, split
                    )
                    _print_tie_break_comparison(result)
                conn.close()
                return 0

            if args.confirm_holdout is not None:
                pair = _parse_weight_pairs(args.confirm_holdout)[0]
                result = _confirm_holdout(
                    conn, args.ollama, BASELINE_MODEL, vectors_by_id, cases, pair
                )
                conn.close()
                _print_confirm_holdout(result)
                return 0

            pairs = _parse_weight_pairs(args.sweep_weights)
            rows = _sweep_weights(conn, args.ollama, BASELINE_MODEL, vectors_by_id, cases, pairs)
            conn.close()
            _print_sweep_table(rows)
            return 0
        except ValueError as exc:
            print(f"bad weight pair: {exc}", file=sys.stderr)
            return 1
        except EmbedError as exc:
            print(f"embed error: {exc}", file=sys.stderr)
            return 1
        except StaleCorpusUnrebuildableError as exc:
            print(str(exc), file=sys.stderr)
            return 1
        except subprocess.CalledProcessError as exc:
            print(f"build_rag_db failed: {exc}", file=sys.stderr)
            return 1

    try:
        run_bakeoff(
            ollama_base=args.ollama,
            out_dir=args.out,
            models=args.models,
            write_report=args.write_report,
            arms_only=args.arms_only,
            force_rebuild=args.force_rebuild,
        )
    except EmbedError as exc:
        print(f"embed error: {exc}", file=sys.stderr)
        return 1
    except (StaleCorpusUnrebuildableError, workshop.WorkshopNotFound) as exc:
        print(str(exc), file=sys.stderr)
        return 1
    except subprocess.CalledProcessError as exc:
        print(f"build_rag_db failed: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
