"""Title: Destructive mod/save advice guard

Purpose: Output-side check that flags a finished Ollama reply advising the user to delete
save data, a Wine/Proton prefix, or compatdata, without a backup step anywhere in the same
reply.
Used for: Post-generation safety pass in run_game_ai_request (game_ai_request.py), run once
the full reply text is available.
Solves: workshop:planning/12-deep-mod-ai-hints-feasibility.md Section 5.3 -- there was no
output-side check on destructive advice. The only existing mitigation is a prompt instruction
at ollama_prompts.py:926 ("Auto-clarity: for irreversible or destructive warnings..."), which is
input-side only: a model that ignores it produces unflagged destructive advice.
Does not: Block, truncate, or rewrite the model's text -- it only appends a visible safety
notice when the check fires, so a reply that is otherwise useful still reaches the user. Does
not run per-token against the live stream; token streaming (ollama_ask_service.py's on_delta
callback) publishes partial text to the UI before this module ever sees the reply, so on a
streamed Ask the raw text is already visible before the notice can be appended. Catching that
would mean scanning partial, still-growing text turn by turn and deciding when to abort a
stream mid-generation -- a materially bigger change than one output-side check, and out of
scope here. See the module-level test file for the false-positive cases this is tuned against.

Known misses, kept honest because this is a safety check and an overstated one is worse than
none. It is keyword matching, not comprehension: a reply that describes the deletion without
naming the folder ("just start it fresh and let Steam rebuild everything"), or that names a
target several clauses away from the verb, still gets through. `format` is deliberately not
inflected -- see the comment on the verb pattern. And on a streamed Ask the raw text is on
screen before this runs at all, per the paragraph above.
"""

from __future__ import annotations

import re
from typing import Any

# Sentence-scoped on purpose: "remove the mod" or "delete the shortcut" name no destructive
# target, so they never trip the guard even though "remove"/"delete" alone are common words.
# Both a verb and a target must land in the same sentence for a signal to count.
#
# Inflected forms are matched, not just the bare imperative. `\bdelete\b` leaves no word
# boundary before "ing", so "deleting" never matched -- and a model writing prose says
# "try deleting" far more often than "delete". Measured on device 2026-08-27: the reply
# "Try deleting the existing prefix folder and letting Steam rebuild it" reached the user
# with no notice, and this was one of its two independent reasons (DESTRUCT-ADVICE-01).
#
# `format` / `reformat` stay uninflected on purpose. "formatting" collides with the
# ordinary text sense ("the save file formatting"), and unlike the others this verb has a
# common innocent meaning, so widening it would buy a rare catch for a routine false hit.
_DESTRUCTIVE_VERB_RE = re.compile(
    r"\b(?:"
    r"delet(?:e|es|ed|ing)|"
    r"remov(?:e|es|ed|ing)|"
    r"wip(?:e|es|ed|ing)|"
    r"eras(?:e|es|ed|ing)|"
    r"nuk(?:e|es|ed|ing)|"
    r"uninstall(?:s|ed|ing)?|"
    r"reformat|format|"
    r"clear(?:s|ed|ing)?\s+out|"
    r"(?:get|gets|getting|got)\s+rid\s+of|"
    r"rm\s+-rf"
    r")\b",
    re.IGNORECASE,
)

# Targets that name the dangerous thing outright. Unambiguous on their own.
_DESTRUCTIVE_TARGET_RE = re.compile(
    r"\b(?:compatdata|(?:wine|proton)\s*prefix|pfx|"
    r"prefix\s+(?:folder|director(?:y|ies)|dir)|"
    r"save\s*(?:file|data|game)s?|savegames?)\b",
    re.IGNORECASE,
)

#
# "prefix" on its own is the second half of the same device miss: the model names the brand
# once at the top of a reply and then just says "the prefix". But a bare "prefix" also has an
# ordinary text meaning -- "remove the bonsai- prefix from the setting name" is advice this
# very assistant could give, and flagging it would be a false alarm.
#
# So a bare "prefix" counts as a target only when the reply has already established what kind
# of prefix it is talking about. The topic word may be in any sentence; the destructive verb
# still has to share a sentence with the word "prefix", so this widens the target vocabulary
# without loosening the sentence-scoping the rest of the guard depends on.
_BARE_PREFIX_RE = re.compile(r"\bprefix(?:es)?\b", re.IGNORECASE)
_PREFIX_TOPIC_RE = re.compile(r"\b(?:wine|proton|compatdata)\b", re.IGNORECASE)
_BACKUP_MENTION_RE = re.compile(
    r"\bback(?:\s|-)?up\b|\bbacking\s+up\b|\bmake\s+a\s+copy\b|"
    r"\bkeep(?:ing)?\s+a\s+copy\b|\bcopy\s+(?:it|them|your|the)\b",
    re.IGNORECASE,
)

# A sentence that both names a destructive target and tells the user not to touch it -- "you
# don't need to delete your save data" -- is safe advice, not dangerous advice. Without this,
# the guard would flag its own disclaimers. This is a plain keyword check, not real negation
# parsing, so it will miss double negatives or negation several clauses away from the verb;
# see the module docstring's list of known misses.
_NEGATION_RE = re.compile(
    r"\b(?:don't|do\s+not|doesn't|does\s+not|didn't|did\s+not|"
    r"shouldn't|should\s+not|won't|will\s+not|wouldn't|would\s+not|"
    r"never|avoid|no\s+need\s+to|not\s+necessary\s+to|"
    r"isn't\s+necessary\s+to|is\s+not\s+necessary\s+to)\b",
    re.IGNORECASE,
)

_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+|\n+")

_SIGNAL_EXCERPT_CHARS = 160


def check_destructive_advice(response_text: str) -> dict[str, Any]:
    """Flag a reply that advises deleting save data / a Proton or Wine prefix / compatdata
    without also mentioning a backup step anywhere in the same reply.

    Per workshop:planning/12-deep-mod-ai-hints-feasibility.md Section 5.1, the prompt already
    tells the model to give a backup step first when handing out this kind of advice. This is
    the check on whether it actually did -- a model can ignore a prompt instruction; it cannot
    un-flag this.
    """
    text = response_text or ""
    # Reply-level, so it is computed once rather than per sentence: see _BARE_PREFIX_RE.
    prefix_means_a_folder_here = bool(_PREFIX_TOPIC_RE.search(text))
    signals: list[str] = []
    for sentence in _SENTENCE_SPLIT_RE.split(text):
        if _NEGATION_RE.search(sentence):
            continue
        if not _DESTRUCTIVE_VERB_RE.search(sentence):
            continue
        hits_target = bool(_DESTRUCTIVE_TARGET_RE.search(sentence)) or (
            prefix_means_a_folder_here and bool(_BARE_PREFIX_RE.search(sentence))
        )
        if hits_target:
            signals.append(sentence.strip()[:_SIGNAL_EXCERPT_CHARS])
    if not signals:
        return {"flagged": False, "signals": [], "has_backup_mention": False}
    has_backup = bool(_BACKUP_MENTION_RE.search(text))
    return {
        "flagged": not has_backup,
        "signals": signals,
        "has_backup_mention": has_backup,
    }


_NOTICE = (
    "\n\n—\n**bonsAI safety check:** this reply describes deleting save data, a "
    "Wine/Proton prefix, or compatdata, without a clear backup step. That is permanent unless "
    "the game uses Steam Cloud for saves -- back up the folder before deleting anything."
)


def append_destructive_advice_notice(response_text: str, check_result: dict[str, Any]) -> str:
    """Append a visible safety notice when `check_result` is flagged; unchanged otherwise."""
    if not check_result.get("flagged"):
        return response_text
    return (response_text or "").rstrip() + _NOTICE
