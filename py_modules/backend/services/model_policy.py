"""Title: Which AI models you are allowed to use, by how open they are

Purpose: The Model policy setting lets you choose how open-source an AI model has to be
before the plugin will use it: only fully open-source models, open-source plus models
whose weights are published under looser terms, or (once you flip an extra unlock) almost
anything installed. This file is what sorts a model's name into one of those groups by
matching it against known name families -- the Qwen 3 and Gemma 4 families read as fully
open-source, the Llama and older Gemma families as the looser "open weight" kind, and so on --
and then narrows
the list of models the plugin is willing to try down to whatever your chosen setting
allows.
Used for: The moment an Ask actually needs to pick which installed model to answer with,
and keeping the Model policy setting itself internally consistent (the strictest unlock
option cannot be on while a looser tier is chosen, and vice versa).
Solves: One shared, named list of which model families count as which kind of open, so
that decision is not made slightly differently in Settings and at Ask time.
Licence facts (read from each model's Ollama page and its maker's model card on 2026-09-29): a
few Qwen sizes, one LLaVA size and the old Vicuna / orca-mini models are NOT under an
open-source licence even though their family mostly is, so those are listed by name below.
Does not: Give legal advice about any model's licence, or actually stop a model from
running anywhere else -- this only decides which models the plugin itself will offer to
use.
"""

from __future__ import annotations

from typing import Final, Literal

ModelSourceClass = Literal["foss", "open_weight", "non_foss", "unknown"]

DEFAULT_MODEL_POLICY_TIER: Final[str] = "open_source_only"
_VALID_TIERS: frozenset[str] = frozenset(("open_source_only", "open_weight", "non_foss"))

# Sizes whose licence is NOT the family's open-source one (family base -> tag sizes). Sources,
# all read 2026-09-29: Qwen2.5 3B/72B = Qwen Research / Qwen licence (ollama.com/library/qwen2.5
# and the Qwen/Qwen2.5-3B-Instruct, -72B-Instruct, Qwen2.5-Coder-3B-Instruct and
# Qwen2.5-VL-3B/72B-Instruct cards); Qwen2 72B = Tongyi Qianwen licence (ollama.com/library/qwen2);
# LLaVA 13b = Llama 2 community licence (ollama.com/library/llava:13b). llava:7b/34b ship Apache 2.0.
_SIZE_LIMITED_LICENCE: Final[dict[str, tuple[str, ...]]] = {
    "qwen2.5": ("3b", "72b"),
    "qwen2.5-coder": ("3b",),
    "qwen2.5vl": ("3b", "72b"),
    "qwen2": ("72b",),
    "llava": ("13b",),
}

# Whole families (any tag) that are not open-source: the first Qwen generation (Tongyi Qianwen
# licences on every size, ollama.com/library/qwen) and llava-llama3 (a Llama 3 fine-tune).
_LIMITED_LICENCE_FAMILIES: Final[frozenset[str]] = frozenset(("qwen", "llava-llama3"))

# Decision pending with the maintainer (2026-09-29, plan 77 helper D): these two sizes are under
# the Qwen Research licence on Qwen's own cards (Ollama's qwen2.5vl page ships Apache 2.0 text),
# yet they are the Tier 1 default picture model and the second Tier 1 text fallback. The call was
# "labels only, never change what gets picked", so they stay in Tier 1 for now. Emptying this set
# moves both to Tier 2 -- and empties Tier 1's essentials, so it is a call, not a clean-up.
KEPT_IN_TIER_1_PENDING_CALL: Final[frozenset[tuple[str, str]]] = frozenset(
    (("qwen2.5vl", "3b"), ("qwen2.5", "3b"))
)

def _normalize_base_model(name: str) -> str:
    """First path segment of Ollama model id (before `:`), after optional `repo/` prefix."""
    raw = (name or "").strip().lower()
    if not raw:
        return ""
    if "/" in raw:
        raw = raw.split("/")[-1]
    if ":" in raw:
        raw = raw.split(":", 1)[0]
    return raw.strip()


def _split_tag(name: str) -> tuple[str, str]:
    """(family base, tag) of an Ollama id, both lower-case; tag is '' when none is given."""
    raw = (name or "").strip().lower()
    if "/" in raw:
        raw = raw.split("/")[-1]
    base, _, tag = raw.partition(":")
    return base.strip(), tag.strip()


def _has_limited_licence(name: str) -> bool:
    """True for a model whose own licence is not open-source although its family mostly is."""
    base, tag = _split_tag(name)
    if base in _LIMITED_LICENCE_FAMILIES:
        return True
    for size in _SIZE_LIMITED_LICENCE.get(base, ()):
        if tag == size or tag.startswith(size + "-"):
            return (base, size) not in KEPT_IN_TIER_1_PENDING_CALL
    return False


def _starts_family(base: str, family: str) -> bool:
    """True if ``base`` is this Ollama family (e.g. qwen2.5, qwen3-vl, internvl3.5)."""
    if base == family:
        return True
    if not base.startswith(family):
        return False
    if len(base) == len(family):
        return True
    c = base[len(family)]
    return c in ":-._0123456789"


def _family_match(base: str, families: tuple[str, ...]) -> bool:
    return any(_starts_family(base, fam) for fam in families)


def classify_ollama_model_name(name: str) -> ModelSourceClass:
    """
    Map an Ollama model tag to a coarse source class.

    - foss: Families treated as Tier-1 open-source–aligned for routing (permissive community norms).
    - open_weight: Weights published for local use; licenses/training may differ from Tier 1.
    - non_foss: Proprietary or restrictive terms for local inference in our table.
    - unknown: Not listed — only allowed in Tier 3 with explicit unlock.
    """
    base = _normalize_base_model(name)
    if not base:
        return "unknown"

    if _has_limited_licence(name):
        return "open_weight"

    # Tier 1 — Apache/MIT/BSD-style families commonly used as FOSS-friendly defaults
    foss_prefixes = (
        "qwen",
        "qwen2",
        "qwen2.5",
        "qwen3",
        "qwen3.5",
        "llava",
        "phi",
        "phi3",
        "tinyllama",
        "openchat",
        # Gemma 4 moved to Apache 2.0 in April 2026 (docs/planning/41-deck-model-survey.md);
        # only this generation -- gemma, gemma2 and gemma3 stay open-weight below.
        "gemma4",
        # Granite 4.2 ships under Apache 2.0 (data/model_bakeoff/roster.json).
        "granite",
        # gpt-oss is Apache 2.0 at both sizes (ollama.com/library/gpt-oss, openai/gpt-oss-20b card).
        "gpt-oss",
    )
    if _family_match(base, foss_prefixes):
        return "foss"

    # Open-weight industry releases (custom terms; often called "open models")
    open_weight_prefixes = (
        "llama",
        "llama2",
        "llama3",
        "llama3.2",
        "gemma",
        "gemma2",
        "gemma3",
        "mistral",
        "mixtral",
        "codellama",
        "deepseek",
        "internvl",
        "internlm",
        "yi",
        "solar",
        "nous-hermes",
        "dolphin",
        # Vicuna is fine-tuned from Llama 1 / Llama 2 (Llama licences, ollama.com/library/vicuna
        # and the lmsys cards); orca-mini is CC BY-NC-SA (original) or Llama 2 (v3), see
        # huggingface.co/pankajmathur.
        "vicuna",
        "orca-mini",
        # Liquid's LFM models: weights published under the LFM Open License, not an
        # OSI-approved licence (data/model_bakeoff/roster.json).
        "lfm",
        "liquid",
    )
    if _family_match(base, open_weight_prefixes):
        return "open_weight"

    # Explicit non-FOSS / commercial API mirrors in Ollama (extend as needed)
    non_foss_prefixes = (
        "claude",
        "command-r-plus",
    )
    if _family_match(base, non_foss_prefixes):
        return "non_foss"

    return "unknown"


def _allowed_classes_for_tier(tier: str, non_foss_unlocked: bool) -> frozenset[ModelSourceClass]:
    t = tier if tier in _VALID_TIERS else DEFAULT_MODEL_POLICY_TIER
    if t == "open_source_only":
        return frozenset(("foss",))
    if t == "open_weight":
        return frozenset(("foss", "open_weight"))
    # non_foss tier
    allowed: set[ModelSourceClass] = {"foss", "open_weight", "non_foss"}
    if non_foss_unlocked:
        allowed.add("unknown")
    return frozenset(allowed)


def filter_model_list(
    models: list[str],
    tier: str,
    non_foss_unlocked: bool,
) -> list[str]:
    """Keep only models permitted by the current policy tier."""
    allowed = _allowed_classes_for_tier(tier, non_foss_unlocked)
    out: list[str] = []
    for m in models:
        cls = classify_ollama_model_name(m)
        if cls in allowed:
            out.append(m)
    return out


def empty_filter_user_message(tier: str, non_foss_unlocked: bool, requires_vision: bool) -> str:
    """Actionable error when no models remain after filtering."""
    vision = "vision " if requires_vision else ""
    base = (
        f"No {vision}models in the fallback list match your Model policy tier. "
        "Install a permitted Ollama model, or open Settings and choose a higher tier (see README model policy). "
    )
    if tier == "open_source_only":
        return base + (
            "Tier 1 allows only open-source–licensed families in the plugin table (e.g. Qwen 3, Gemma 4, Granite, gpt-oss). "
            "Tier 2 adds “open model” (open-weight) releases with their own licence, such as Llama, Gemma 3 and older, and the Qwen sizes under Qwen’s own licence."
        )
    if tier == "open_weight":
        return base + (
            "Tier 2 allows open-weight families plus Tier 1. Tier 3 can include other tags if you enable "
            "the non-FOSS / unclassified unlock."
        )
    if not non_foss_unlocked:
        return base + "Enable the non-FOSS and unclassified unlock in Settings to try tags outside the curated list."
    return base + "Add a matching model on your Ollama host or adjust Ask mode."


def disclosure_for_model(model_name: str) -> dict:
    """Structured disclosure for API/UI (single successful completion path)."""
    cls = classify_ollama_model_name(model_name)
    return {
        "model": model_name,
        "source_class": cls,
        "read_more_anchor": "model-policy-tiers",
    }


def sanitize_model_policy_tier(value: object) -> str:
    if isinstance(value, str) and value in _VALID_TIERS:
        return value
    return DEFAULT_MODEL_POLICY_TIER


def sanitize_model_policy_non_foss_unlocked(value: object) -> bool:
    return value is True


def reconcile_model_policy_tier(
    tier: str,
    non_foss_unlocked: bool,
) -> tuple[str, bool]:
    """
    Persisted settings must stay consistent: non_foss tier requires unlock flag;
    unlock clears when leaving non_foss tier.
    """
    t = sanitize_model_policy_tier(tier)
    ack = sanitize_model_policy_non_foss_unlocked(non_foss_unlocked)
    if t != "non_foss":
        return t, False
    if not ack:
        return "open_weight", False
    return "non_foss", True
