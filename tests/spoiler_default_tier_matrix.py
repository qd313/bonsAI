"""The inputs the default-tier golden file was built from (plan 98, lane B).

`tests/fixtures/spoiler_default_tier_golden.json` holds a fingerprint (SHA-256) of what the spoiler
policy, its short form for Speed and Expert turns, and the whole system prompt read on the tip commit BEFORE the spoiler tiers setting existed (344d42e3). The
file was written by running `build_golden()` from this module on that commit, not typed by hand.
`tests/test_spoiler_tier.py` runs the same inputs on today's code and demands the same text, so
"default is today's wording, byte for byte" is checked against what the old code really said.
"""

import hashlib
import itertools

from backend.prompts.ollama_prompts import build_system_prompt
from backend.spoilers.strategy_spoiler_policy import (
    _strategy_spoiler_constitution_compact_block,
    _strategy_spoiler_policy_block,
)

KB_BLOCK = (
    "--- Local knowledge base (bonsAI; offline corpus; may be truncated) ---\n"
    "Domain: strategy\n\n"
    "[Hades / boss: Megaera] (trust: high)\n"
    "Some tactics text here.\n"
    "--- end of knowledge base ---"
)

PROFILES = ("", "low_narrative", "protect_progression", "unknown")


def policy_cases():
    """Every combination the policy block branches on, as (name, keyword arguments)."""
    for consent, followup, entity, kb_match, profile, ui in itertools.product(
        (False, True), (False, True), ("", "Megaera"), (False, True), PROFILES, (True, False)
    ):
        name = f"consent={consent} followup={followup} entity={entity!r} kb_match={kb_match} profile={profile!r} ui={ui}"
        yield name, dict(
            consent=consent,
            followup=followup,
            asked_entity=entity,
            kb_entity_match=kb_match,
            title_profile=profile,
            include_strategy_ui_fences=ui,
        )


def compact_cases():
    for consent, entity, profile, terse in itertools.product((False, True), ("", "Megaera"), PROFILES, (False, True)):
        yield f"compact consent={consent} entity={entity!r} profile={profile!r} terse={terse}", dict(
            consent=consent, asked_entity=entity, title_profile=profile, terse_branch_menu=terse
        )


def prompt_cases():
    """Whole system prompts, built the way the Ask path builds them."""
    low = {"app_id": "2321470", "app_name": "Deep Rock Galactic: Survivor", "strategy_title_profile": "low_narrative"}
    story = {"app_id": "1145360", "app_name": "Hades", "strategy_title_profile": "protect_progression"}
    plain = {"app_id": "1145360", "app_name": "Hades"}
    yield "strategy, story title, nothing named", dict(ask_mode="strategy", **story)
    yield "strategy, no profile", dict(ask_mode="strategy", **plain)
    yield "strategy, entity named", dict(ask_mode="strategy", strategy_spoiler_asked_entity="Megaera", strategy_spoiler_kb_entity_match=True, **story)
    yield "strategy, low-risk title", dict(ask_mode="strategy", **low)
    yield "strategy, low-risk title, entity", dict(ask_mode="strategy", strategy_spoiler_asked_entity="Dreadnought", strategy_spoiler_kb_entity_match=True, **low)
    yield "strategy, consent", dict(ask_mode="strategy", strategy_spoiler_consent=True, **story)
    yield "strategy, follow-up", dict(ask_mode="strategy", question="[Strategy follow-up] I'm at the second boss.", **story)
    yield "speed with notes, story title", dict(ask_mode="speed", strategy_domain_guidance=True, **story)
    yield "expert with notes, low-risk title", dict(ask_mode="expert", strategy_domain_guidance=True, **low)


def build_prompt(**kw) -> str:
    question = kw.pop("question", "how do i beat megaera")
    app_id = kw.pop("app_id", "1145360")
    app_name = kw.pop("app_name", "Hades")
    return build_system_prompt(
        question, app_id, app_name, [], [], lambda a: "", lambda p: {}, early_context_suffix=KB_BLOCK, **kw
    )


def sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def build_golden() -> dict:
    return {
        "policy_blocks_sha256": {n: sha(_strategy_spoiler_policy_block(**kw)) for n, kw in policy_cases()},
        "compact_blocks_sha256": {n: sha(_strategy_spoiler_constitution_compact_block(**kw)) for n, kw in compact_cases()},
        "prompt_sha256": {n: sha(build_prompt(**kw)) for n, kw in prompt_cases()},
    }
