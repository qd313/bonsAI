"""Title: Deciding the spoiler rule for a Strategy Guide turn

Purpose: Strategy Guide coaching normally hides story spoilers behind ```bonsai-spoiler```
fences, but that default has to bend in a few known ways -- the player said spoilers are
okay, they named a specific boss or enemy by name so that one thing is fair game, or the
game itself treats boss and enemy tactics as routine gameplay rather than story (a bullet-
heaven or roguelike, say). This file writes the actual policy paragraph the AI is told for
the turn, picking the right one of those cases.

Used for: Called from ollama_prompts.build_system_prompt every time Strategy Guide mode is
active, or a Speed/Expert turn has strategy knowledge-base cards attached. Also used
directly by game_ai_request.py and ollama_service.py (``user_consents_strategy_spoilers``)
to read the player's own wording for consent.

Solves: Getting the wording wrong is not symmetric with getting the entity-matching wrong
(see strategy_entity_extraction.py) -- here the risk is a contradiction inside the same
block. A small local model resolves a contradiction toward the more restrictive reading, so
when a relaxed case fires it has to fully replace the restrictive sentence rather than sit
next to it and argue. The comments next to each branch below explain why, with the measured
numbers behind the ones that were tuned against real answers.

Does not: Work out whether the player named an entity, or whether a title counts as
low-narrative-risk in the first place -- those come in as arguments, resolved by
strategy_entity_extraction.py and spoiler_title_profiles.py respectively.
"""

import re
from typing import Any, Iterable, Optional, Sequence

from backend.services.spoiler_title_profiles import title_profile_is_low_narrative
from backend.services.strategy_guide_parse import STRATEGY_FOLLOWUP_PREFIX

# Plan 70 helper A (D112 #7, the spoiler safety net): a name is "named" in the question the
# same tolerant way strategy_entity_extraction.py's own known-entity matcher already treats a
# corpus title as present -- case-insensitive, word-boundary anchored, one trailing plural "s"
# allowed ("exploders" for the card "Exploder"). Kept here rather than imported, since that
# matcher lives inside a private closure this lane's file list marks read-only.
_NAME_PATTERN_CACHE: dict[str, "re.Pattern[str]"] = {}


def _name_pattern(name: str) -> "re.Pattern[str]":
    pat = _NAME_PATTERN_CACHE.get(name)
    if pat is None:
        pat = re.compile(rf"(?<![a-z0-9]){re.escape(name.lower())}s?(?![a-z0-9])")
        _NAME_PATTERN_CACHE[name] = pat
    return pat


def name_appears_in_text(haystack: str, name: str) -> bool:
    """True when ``name`` (case-insensitive, plural-tolerant) shows up in ``haystack``."""
    n = (name or "").strip()
    if not n:
        return False
    return bool(_name_pattern(n).search((haystack or "").lower()))


def user_consents_strategy_spoilers(question: str) -> bool:
    """True when sanitized user text (plus optional branch prefix strip) signals spoiler permission."""
    raw = (question or "").strip()
    if not raw:
        return False
    if raw.startswith(STRATEGY_FOLLOWUP_PREFIX):
        raw = raw[len(STRATEGY_FOLLOWUP_PREFIX) :].lstrip()
    s = raw.lower()
    needles = (
        "spoilers are okay",
        "spoilers are ok",
        "spoiler ok",
        "spoilers okay",
        "full spoilers",
        "i want spoilers",
        "spoil me",
        "spoilers allowed",
        "unrestricted spoilers",
        "spoilers are fine",
        "okay to spoil",
        "ok to spoil",
        "spoilers welcome",
    )
    return any(n in s for n in needles)


def _strategy_title_is_low_spoiler_risk(
    *,
    app_id: str = "",
    app_name: str = "",
    title_profile: str = "",
) -> bool:
    """True when this title treats named bosses/enemies as routine gameplay, not story spoilers.

    ``title_profile``, when set, is the profile already resolved for the risk chip on this same
    turn (plan 54 gap 3) -- a game recognised only from the question, with nothing running, has
    no ``app_id``/``app_name`` to look up here otherwise. When absent (every call before this
    change), falls back to the id/name lookup exactly as before.
    """
    if title_profile:
        return title_profile == "low_narrative"
    return title_profile_is_low_narrative(app_id, app_name=app_name)


def _strategy_kb_spoiler_clause_suppressed(
    *,
    app_id: str = "",
    app_name: str = "",
    asked_entity: str = "",
    title_profile: str = "",
) -> bool:
    """True when the KB spoiler clause should be dropped for this turn."""
    low_risk = (
        title_profile == "low_narrative"
        if title_profile
        else title_profile_is_low_narrative(app_id, app_name=app_name)
    )
    return low_risk or bool((asked_entity or "").strip())


def _strategy_spoiler_low_risk_addendum(
    *,
    asked_entity: str,
    kb_entity_match: bool,
    app_id: str = "",
    app_name: str = "",
    title_profile: str = "",
) -> str:
    """Extra policy when boss/enemy tactics are routine gameplay, not narrative spoilers."""
    title_low_risk = _strategy_title_is_low_spoiler_risk(
        app_id=app_id, app_name=app_name, title_profile=title_profile
    )
    entity = (asked_entity or "").strip()
    if not title_low_risk and not entity:
        return ""
    if not title_low_risk:
        # Named-entity consent only. Scoped hard to the thing the user named: this arm fires on
        # story titles, where relaxing anything else would spoil the game we are trying to protect.
        return (
            f"NAMED-ENTITY CONSENT: The user asked about “{entity}” by name, so they have already "
            "chosen to know about it. Keep direct tactics for that entity in plain text — do NOT wrap "
            "them in ```bonsai-spoiler``` fences.\n"
            "This applies to that entity ONLY. Everything the user did not name — story beats, later "
            "areas, adjacent secrets, endings, and other bosses — keeps the default spoiler treatment.\n\n"
        )
    lines = [
        "LOW-SPOILER-RISK CONTEXT: This title treats named bosses/enemies/waves as routine gameplay beats, "
        "not story spoilers.",
    ]
    if entity:
        lines.append(
            f"The user asked about “{entity}”. Keep direct tactics for that entity in plain text; "
            "do NOT wrap routine boss/enemy guidance in ```bonsai-spoiler``` fences."
        )
    elif kb_entity_match:
        lines.append(
            "Attached knowledge-base cards cover the asked entity. Ground tactics in those cards in plain text; "
            "do NOT fence KB-backed boss/enemy guidance as story spoilers."
        )
    else:
        lines.append(
            "For bullet-heaven / roguelike / survivor-style titles, boss and elite enemy names are not narrative "
            "spoilers — keep mechanical coaching visible. Do NOT wrap routine boss/enemy guidance in "
            "```bonsai-spoiler``` fences just because no specific entity was identified in this question — "
            "the title-level low-spoiler-risk context above already applies with or without one."
        )
    lines.append(
        "Reserve ```bonsai-spoiler``` only for hidden narrative twists, endings, or secret unlock paths — "
        "not standard boss move-sets or wave tactics.\n"
    )
    return "\n".join(lines) + "\n"


def _strategy_spoiler_policy_block(
    consent: bool,
    followup: bool,
    *,
    asked_entity: str = "",
    kb_entity_match: bool = False,
    app_id: str = "",
    app_name: str = "",
    title_profile: str = "",
    include_strategy_ui_fences: bool = True,
) -> str:
    """Injected after STRATEGY GUIDE MODE header; defines ```bonsai-spoiler fences and ordering."""
    low_risk = _strategy_spoiler_low_risk_addendum(
        asked_entity=asked_entity,
        kb_entity_match=kb_entity_match,
        app_id=app_id,
        app_name=app_name,
        title_profile=title_profile,
    )
    # Subtractive, not additive: when the addendum fires it must REPLACE the boss-name
    # prohibition rather than argue with it in the same block. A 2B-class local model
    # resolves a contradiction toward the prohibitive reading — fencing satisfies both
    # instructions at once, so it is the cheaper error for the model to make.
    #
    # Three states, not two. Named-entity consent on a *story* title must carve out only the
    # entity the user named; dropping the boss clause wholesale there would relax every other
    # boss in the game, which is the over-relax failure the Hades row guards against.
    title_low_risk = _strategy_title_is_low_spoiler_risk(
        app_id=app_id, app_name=app_name, title_profile=title_profile
    )
    entity = (asked_entity or "").strip()
    if title_low_risk:
        followup_avoid = "Avoid story endings, major twists, and precise puzzle solutions in plain text. "
        first_turn_avoid = (
            "Avoid story endings, major twists, and exact puzzle solutions in plain text unless "
            "essential for branching.\n"
        )
    elif entity:
        followup_avoid = (
            "Avoid story endings, major twists, and precise puzzle or boss spoilers in plain text — "
            f"except for “{entity}”, which the user named and asked about directly. "
        )
        first_turn_avoid = (
            f"Avoid story endings, major twists, late-game boss names other than “{entity}”, and exact "
            "puzzle solutions in plain text unless essential for branching; prefer vague labels until "
            "the player picks a branch.\n"
        )
    else:
        followup_avoid = (
            "Avoid story endings, major twists, and precise puzzle or boss spoilers in plain text. "
        )
        first_turn_avoid = (
            "Avoid story endings, major twists, late-game boss names, and exact puzzle solutions in "
            "plain text unless essential for branching; prefer vague labels until the player picks a "
            "branch.\n"
        )
    if consent:
        lines = (
            "STRATEGY SPOILER POLICY (user opted in): The user explicitly consented to spoilers for this turn "
            "(their wording). Give direct walkthrough detail, names, and puzzle solutions as needed. "
            "You may still wrap optional ultra-sensitive notes in ```bonsai-spoiler ... ``` fences, "
            "but it is not required for normal tactics.\n"
        )
        if include_strategy_ui_fences and not followup:
            lines += (
                "On this first turn, the ```bonsai-strategy-branches fence remains the last characters of the reply; "
                "place any optional ```bonsai-spoiler blocks above it only.\n\n"
            )
        else:
            lines += "\n"
        return lines + low_risk
    if followup:
        return (
            "STRATEGY SPOILER POLICY (default): Coaching is spoiler-minimized unless the user opted in. "
            f"{followup_avoid}"
            "Put spoilery narrative only inside ```bonsai-spoiler ... ``` fences "
            "(opening line exactly ```bonsai-spoiler, closing ``` on its own line). "
            "These fences may appear anywhere in this reply. "
            "Even under **If you want to cheat…**, keep spoilery plot or ending detail inside ```bonsai-spoiler "
            "when the user has not opted in.\n"
            f"{low_risk}\n"
        )
    # The fence-format sentences are subtractive too. Measured 2026-09-02 with
    # scripts/eval_kb_answers.py (Deck model on the PC, 37 cases x 3 samples, two runs each):
    # with the two sentences below in place, 28 of 96 low-risk / named-entity samples carried a
    # fence around a harmless opening line ("This guide focuses on general tactics against the
    # Tank.") even though the addendum says not to. The placement rule reads, to a 2B model, as
    # an order that a block exists. Dropping only the placement rule removed every fence,
    # including the ones due on ending questions (0 of 9). Replacing both sentences with one
    # plain "do not fence" line on those turns cut misfires to 3 of 96 while the ending questions
    # kept their fences (8 of 9). Story titles with no named entity are unchanged.
    # docs/archive/research/kb-answer-eval-2026-09-02-fence-subtractive.md
    if title_low_risk:
        fence_rules = (
            "Do not use ```bonsai-spoiler fences in this reply: nothing about this title's bosses, "
            "enemies or waves is a story spoiler.\n"
        )
    elif entity:
        fence_rules = (
            f"Do not put anything about “{entity}” inside a ```bonsai-spoiler fence. Only if you must "
            "mention a story event the user did not ask about, wrap that one thing in "
            "```bonsai-spoiler ... ```"
            + (" and place it above the branch fence" if include_strategy_ui_fences else "")
            + ".\n"
        )
    else:
        fence_rules = (
            "Put unavoidably spoilery detail only inside ```bonsai-spoiler ... ``` fences "
            "(opening line exactly ```bonsai-spoiler).\n"
            + (
                "On this first turn, every ```bonsai-spoiler block must appear **above** the opening ```bonsai-strategy-branches line; "
                "the branch fence must still close the reply — no characters after its closing ```.\n"
                if include_strategy_ui_fences
                else ""
            )
        )
    return (
        "STRATEGY SPOILER POLICY (default): Coaching is spoiler-minimized by default; say so briefly in your opening. "
        f"{first_turn_avoid}"
        + fence_rules
        + f"{low_risk}\n"
    )


def _strategy_spoiler_constitution_compact_block(
    consent: bool,
    *,
    asked_entity: str = "",
    kb_entity_match: bool = False,
    app_id: str = "",
    app_name: str = "",
    title_profile: str = "",
) -> str:
    """Short constitution inject for Speed/Expert turns with strategy KB cards attached."""
    policy = _strategy_spoiler_policy_block(
        consent,
        followup=False,
        asked_entity=asked_entity,
        kb_entity_match=kb_entity_match,
        app_id=app_id,
        app_name=app_name,
        title_profile=title_profile,
        include_strategy_ui_fences=False,
    )
    return (
        "\n\nSTRATEGY SPOILER CONSTITUTION (knowledge-base coaching):\n"
        f"{policy}"
        "This is not a Strategy Guide branch turn — do not emit ```bonsai-strategy-branches``` "
        "or ```bonsai-strategy-checklist``` fences.\n"
    )


def spoiler_cover_required(
    consent: bool,
    *,
    strategy_domain: bool,
    app_id: str = "",
    app_name: str = "",
    title_profile: str = "",
) -> bool:
    """True when this turn's own prompt (built above) told the model to keep coaching
    spoiler-minimized -- the one branch that puts spoilery detail behind ```bonsai-spoiler```
    fences at all.

    D112 #7, the spoiler safety net: nothing has ever checked whether the model actually did
    that once told to (the roadmap bug this answers: a question describing a boss without
    naming it came back with the boss named in plain text). This is the one place both the
    streaming safety net (ollama_ask_service.py) and the finished-reply one
    (game_ai_request.py) ask "was a cover promised this turn at all" -- mirroring the exact
    branch ``_strategy_spoiler_policy_block`` above chose, so the safety net can never disagree
    with the prompt about whether hiding was asked for.

    False on every turn the prompt never asked for a cover: the player opted in
    (``consent``), the title reads as routine gameplay rather than story
    (``_strategy_title_is_low_spoiler_risk``), or this is not a Strategy/Expert-with-KB-cards
    turn at all (``strategy_domain`` -- the same test ``ollama_prompts.build_system_prompt``
    uses to decide whether to inject any spoiler policy in the first place).
    """
    if not strategy_domain:
        return False
    if consent:
        return False
    return not _strategy_title_is_low_spoiler_risk(
        app_id=app_id, app_name=app_name, title_profile=title_profile
    )


# Only these two card kinds count as "an attached boss or story note" for the safety net --
# an item, a mechanic, an area or a general tip is not, and treating one as protected is not
# the harmless occasional miss the docstring below accepts elsewhere. Measured 2026-09-26
# against the eval fixture: scoping this to every attached card, not just these two kinds,
# fenced an attached WEAPON's own card ("Shield of Chaos", kind "item") on a Hades turn that
# named neither it nor any fence-worthy thing -- fence-not-misfired on the two existing rows
# that name their own boss fell from 100% to 44% before this was narrowed. "enemy" is included
# alongside "boss" because a notable named enemy can carry the same kind of reveal a boss does;
# "story" is not a kind this corpus uses today (data/kb/strategy_seed.json's section_type
# values, checked the same day: mechanic, boss, item, area, enemy, quest, dungeon), so nothing
# is dropped from that other than the wording of D112 #7 itself suggesting it might exist.
_BOSS_LIKE_KINDS = frozenset({"boss", "enemy"})

# The same header shape knowledge_base_service.py's `_card_lines` writes for a real strategy
# card (kb_attached_notes.py's `_KB_NOTE_HEADER_RE` reads the same thing, with the trust tier
# too, which this does not need). A plain regex on the raw text rather than a structured list,
# on purpose: it works the same way whether the caller has retrieval's own `kb_text` (finished
# reply, game_ai_request.py) or only the assembled prompt (live streaming,
# ollama_ask_service.py), which carries the identical card block verbatim.
_CARD_HEADER_RE = re.compile(r"\[(?P<game>[^\]/]+)/\s*(?P<kind>[^:\]]+):\s*(?P<name>[^\]]+)\]")


def boss_like_card_names(kb_text: str) -> list[str]:
    """Names of attached boss/enemy cards only -- read straight off the card block's own header
    line, ``[Game / kind: Name]``, so this needs no structured note list from either caller."""
    names: list[str] = []
    for m in _CARD_HEADER_RE.finditer(kb_text or ""):
        kind = (m.group("kind") or "").strip().lower()
        if kind not in _BOSS_LIKE_KINDS:
            continue
        name = (m.group("name") or "").strip()
        if name and name not in names:
            names.append(name)
    return names


def protected_spoiler_names(question: str, kb_card_titles: Iterable[str]) -> list[str]:
    """Attached boss/enemy note titles the player's own question did not name.

    ``kb_card_titles`` is normally ``boss_like_card_names`` run over whatever knowledge-base
    text actually reached the model this turn. A title the question DID name is the thing the
    player already chose to know about (the "NAMED-ENTITY CONSENT" carve-out above covers that
    one on purpose); every other attached boss or enemy is "protected" for the safety net,
    whether or not the model remembers to fence it.
    """
    out: list[str] = []
    for title in kb_card_titles or ():
        name = (title or "").strip()
        if not name or name in out:
            continue
        if name_appears_in_text(question, name):
            continue
        out.append(name)
    return out


# Plan 70 helper A (D112 #7 leak fix, SPOILER-COVER-01): the model sometimes glues a fence
# marker to the end of running prose ("The```bonsai-spoiler"), which neither this checker's own
# fence-open pattern nor the screen's own line-by-line scanner (streamMarkdownPrepare.ts's
# isFenceLine) will ever recognise as a fence-open -- both require a fence marker to start its
# own line. Measured on the Deck: the marker itself showed as raw backtick text, and the
# model's own later, well-formed closing ``` was misread as *opening* a fresh, unlabelled fence
# instead of closing the intended one. The three small helpers below fix that at the text level,
# shared by response_verify.py's live and finished-reply coverers alike.
_ANY_FENCE_MARKER_RE = re.compile(r"```")


def move_midline_fence_openers_to_line_start(text: str) -> str:
    """Give every ``` a line of its own, wherever the model glued one to running prose.

    Fixes three things at once: the marker stops showing as raw backtick text, a real
    ```bonsai-spoiler``` fence the model DID try to write gets recognised (rather than the
    caller wrapping a second, redundant cover around the same sentence), and a later closing
    ``` stops being misread as the opener of a fresh fence neither side meant to start.
    """
    if "```" not in text:
        return text
    out: list[str] = []
    pos = 0
    for m in _ANY_FENCE_MARKER_RE.finditer(text):
        start = m.start()
        out.append(text[pos:start])
        if start > 0 and text[start - 1] != "\n":
            out.append("\n")
        pos = start
    out.append(text[pos:])
    return "".join(out)


# A line that has started with one to three backticks but has not reached its own closing
# newline yet -- "```bon" at the very end of the reply so far -- is a fence opener still being
# typed, one character at a time. Anchored the same way a real opener is (start of the text, or
# right after a newline), so this never fires on an ordinary word that merely contains a
# backtick mid-line.
_PARTIAL_FENCE_TAIL_RE = re.compile(r"(?:(?<=\n)|^)`{1,3}[^\n`]*$")


def partial_fence_tail_match(text: str):
    """A still-forming fence-opener at the very end of ``text``, or ``None``."""
    return _PARTIAL_FENCE_TAIL_RE.search(text)


# Mirrors response_verify.py's own ``_FENCE_CLOSE_RE`` (a closing ``` on its own line) exactly;
# kept as its own small copy here rather than imported, since that name is private to the file
# that owns the rest of the fence-segment machinery.
_FENCE_CLOSE_TAIL_RE = re.compile(r"\n```(?=\n|$)")


def fence_segment_is_closed(fence_chunk: str) -> bool:
    """True when a ("fence", chunk) piece from response_verify.py's own segment split reached
    its own closing ``` -- i.e. it is not still being written."""
    m = _FENCE_CLOSE_TAIL_RE.search(fence_chunk)
    return bool(m and m.end() == len(fence_chunk))


def fence_opener_is_spoiler(fence_chunk: str) -> bool:
    """True when a fence segment's own opener line reads ```bonsai-spoiler -- the same test
    the screen's own live parser uses (streamMarkdownPrepare.ts's isSpoilerFenceOpenLine), so
    this only ever holds back a spoiler fence's body, never an ordinary code sample or the
    ```bonsai-strategy-branches``` menu."""
    line_end = fence_chunk.find("\n")
    opener_line = fence_chunk[:line_end] if line_end != -1 else fence_chunk
    info = opener_line.strip()
    if not info.startswith("```"):
        return False
    info = info[3:].strip().lower()
    return info == "bonsai-spoiler" or info.startswith("bonsai-spoiler")


# D112 #7's third leak (SPOILER-COVER-01's own side finding, NO-CLOSE-MATCH-HK-02): the branch
# menu's question and option labels are buttons the screen draws from `strategy_guide_branches`
# directly, never markdown-rendered and never looked at by cover_named_spoilers (fencing one
# would break the button). Measured on the Deck: "Are you currently struggling with the Soul
# Master's movement or damage output?" in plain view, on a question that never named him.
# Case-insensitive, unlike ``_name_pattern`` above, which is written to run against
# already-lowercased text for a yes/no check, not to substitute inside real-case button text.
_NEUTRALIZING_NAME_RE_CACHE: dict[str, "re.Pattern[str]"] = {}
_NEUTRAL_BOSS_PHRASE = "this boss"


def _neutralizing_pattern(name: str) -> "re.Pattern[str]":
    """Matches a protected name, plus a leading "the"/"a"/"an" when the name has one, so the
    replacement can keep exactly one article -- without this, "the Soul Master's" became "the
    this boss's" (measured while building this fix): the name's own replacement phrase already
    carries "this", so a leading "the" has to be absorbed into the match, not left in place.
    """
    pat = _NEUTRALIZING_NAME_RE_CACHE.get(name)
    if pat is None:
        pat = re.compile(
            rf"(?<![a-z0-9])(?:(the|an?)\s+)?{re.escape(name.lower())}s?(?![a-z0-9])",
            re.IGNORECASE,
        )
        _NEUTRALIZING_NAME_RE_CACHE[name] = pat
    return pat


def neutralize_protected_names_in_branch_menu(
    branches: Optional[dict[str, Any]], protected_names: Sequence[str]
) -> Optional[dict[str, Any]]:
    """Replace a protected name inside the branch menu's question or an option's label with a
    neutral phrase ("this boss"/"the boss") -- never a spoiler fence, which the screen draws as
    a button and would render as literal backtick text, not a cover.
    """
    if not branches or not protected_names:
        return branches
    names = [n.strip() for n in protected_names if (n or "").strip()]
    if not names:
        return branches

    def _replace(m: "re.Match[str]") -> str:
        article = (m.group(1) or "").lower()
        return "the boss" if article == "the" else _NEUTRAL_BOSS_PHRASE

    def _neutralize(text: str) -> str:
        out = text
        for name in names:
            out = _neutralizing_pattern(name).sub(_replace, out)
        return out

    changed = False
    question = branches.get("question")
    new_question = question
    if isinstance(question, str):
        new_question = _neutralize(question)
        changed = changed or new_question != question

    options = branches.get("options")
    new_options = options
    if isinstance(options, list):
        rebuilt = []
        for opt in options:
            if isinstance(opt, dict) and isinstance(opt.get("label"), str):
                new_label = _neutralize(opt["label"])
                if new_label != opt["label"]:
                    opt = {**opt, "label": new_label}
                    changed = True
            rebuilt.append(opt)
        new_options = rebuilt

    if not changed:
        return branches
    return {**branches, "question": new_question, "options": new_options}
