"""
Heuristic Ollama model source classes for policy tiers and disclosure copy.

Classifications support UX and routing only — not legal advice. See README model policy section.
"""

from __future__ import annotations

from typing import Final, Literal

ModelSourceClass = Literal["foss", "open_weight", "non_foss", "unknown"]

ModelPolicyTier = Literal["open_source_only", "open_weight", "non_foss"]

DEFAULT_MODEL_POLICY_TIER: Final[str] = "open_source_only"
DEFAULT_MODEL_POLICY_NON_FOSS_UNLOCKED: Final[bool] = False

_VALID_TIERS: frozenset[str] = frozenset(("open_source_only", "open_weight", "non_foss"))

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
        "orca-mini",
        "vicuna",
        "openchat",
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
        "gemma4",
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
    )
    if _family_match(base, open_weight_prefixes):
        return "open_weight"

    # Explicit non-FOSS / commercial API mirrors in Ollama (extend as needed)
    non_foss_prefixes = (
        "gpt-oss",
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
            "Tier 1 allows only open-source–aligned families in the plugin table (e.g. many Qwen/Llava tags). "
            "Tier 2 adds common “open model” (open-weight) releases such as Llama and Gemma."
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
