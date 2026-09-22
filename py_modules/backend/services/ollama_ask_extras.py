"""Title: What run_ask_ollama needs before its first try

Purpose: Two pieces of setup run_ask_ollama() (in ollama_ask_service.py) does before it calls
Ollama for the first time. `build_ollama_request_extras()` shapes the one dict of facts about an
Ask attempt -- the actual prompt sent, the question, how many images went with it and their
attachment paths, what a Proton log excerpt said about itself, and the character/verbosity/
language choices in effect -- that gets carried through every model try and spread into every
error response and the final answer alike. `resolve_ask_model_routing()` works out the list of
models to try, in order: the person's saved routing order, a pin if one was given, a policy/tier
filter, a cross-check against what Ollama actually has installed, and the diagnostics record
about all of that which run_ask_ollama() goes on to mutate as the attempt runs.
Used for: Called once per Ask question each, right after the system prompt and any roleplay
voice are finalized, by run_ask_ollama() in ollama_ask_service.py.
Solves: Both used to be built inline inside run_ask_ollama(), which is already one long
orchestration function. Pulling out these two "shape a value from already-known inputs" steps
made room for that file to fit the file-size ratchet without cutting any of its own explanation.

Does not: Decide any of the values it shapes, call Ollama, or build the Show details snapshot
(transparency_service.py) a finished answer is remembered as -- what this file returns is what a
route uses while it is still running; that is what it is remembered as once it is done.
"""

from __future__ import annotations

from typing import Any, Optional

from backend.ollama_routing import (
    build_effective_models_to_try,
    filter_models_to_installed,
    resolve_routing_order,
)
from backend.services.model_policy import filter_model_list


def build_ollama_request_extras(
    *,
    system_content: str,
    question: str,
    prepared_image_count: int,
    attachment_paths: list,
    proton_log_transparency: Optional[dict],
    strategy_spoiler_consent: bool,
    strategy_domain_guidance: bool,
    resolved_character_preset_id: str,
    pyro_asshole_mode: bool,
    reply_verbosity: str,
    reply_language: str,
) -> dict[str, Any]:
    """Shape the extras dict `run_ask_ollama()` spreads into every response it returns."""
    proton_snap = proton_log_transparency if isinstance(proton_log_transparency, dict) else {}
    proton_sources = proton_snap.get("proton_log_sources")
    return {
        "system_prompt": system_content,
        "user_text_for_model": question,
        "user_image_count": prepared_image_count,
        "attachment_paths": attachment_paths,
        "proton_log_excerpt_attached": proton_snap.get("proton_log_excerpt_attached") is True,
        "proton_log_sources": proton_sources if isinstance(proton_sources, list) else [],
        "proton_log_notes": str(proton_snap.get("proton_log_notes") or ""),
        "strategy_spoiler_consent_effective": (
            bool(strategy_spoiler_consent) if strategy_domain_guidance else False
        ),
        "resolved_character_preset_id": resolved_character_preset_id,
        "pyro_asshole_mode": pyro_asshole_mode,
        "reply_verbosity": reply_verbosity,
        "reply_language": reply_language,
    }


def resolve_ask_model_routing(
    *,
    requires_vision: bool,
    settings: dict,
    installed_tags: list,
    preferred_model: Optional[str],
    attachment_warnings: list,
    attachment_errors: list,
    prepared_image_count: int,
) -> tuple[list, list, str, str, bool, dict]:
    """Work out the list of models to try, in order, and the diagnostics record about it.

    Combines the person's saved routing order with a pin (if one was given), a policy/tier
    filter, and a cross-check against what Ollama actually has installed -- see
    run_ask_ollama()'s own "How it works" step 3 for why each of those exists.

    Returns (models_to_try, models_after_policy, routing_strategy, policy_tier,
    non_foss_unlocked, ask_diagnostics). The diagnostics dict is the same one
    run_ask_ollama() goes on to mutate as the attempt runs (models_attempted,
    model_succeeded, elapsed_seconds, models_after_installed_filter).
    """
    models_before_policy = resolve_routing_order(requires_vision, settings, installed_tags)
    pin = str(preferred_model or "").strip()
    if pin and pin in installed_tags:
        models_before_policy = [pin] + [m for m in models_before_policy if m != pin]
    policy_tier = str(settings.get("model_policy_tier") or "open_source_only")
    non_foss_unlocked = settings.get("model_policy_non_foss_unlocked") is True
    models_to_try = filter_model_list(models_before_policy, policy_tier, non_foss_unlocked)
    models_after_policy = list(models_to_try)
    models_to_try, routing_strategy = build_effective_models_to_try(
        models_to_try,
        installed_tags,
        user_chain_before_policy=models_before_policy,
    )
    if routing_strategy == "installed_host_fallback":
        models_to_try = filter_model_list(models_to_try, policy_tier, non_foss_unlocked)
    _, models_skipped_not_installed = filter_models_to_installed(models_after_policy, installed_tags)
    ask_diagnostics: dict = {
        "models_before_policy": list(models_before_policy),
        "models_after_policy": models_after_policy,
        "installed_tags": list(installed_tags),
        "routing_strategy": routing_strategy,
        "routing_skipped_not_installed": list(models_skipped_not_installed),
        "policy_tier": policy_tier,
        "policy_dropped_count": max(0, len(models_before_policy) - len(models_after_policy)),
        "requires_vision": requires_vision,
        "attachment_count": prepared_image_count,
        "attachment_warnings": list(attachment_warnings),
        "attachment_errors": list(attachment_errors),
        "models_attempted": [],
        "model_succeeded": None,
        "elapsed_seconds": None,
    }
    return (
        models_to_try,
        models_after_policy,
        routing_strategy,
        policy_tier,
        non_foss_unlocked,
        ask_diagnostics,
    )
