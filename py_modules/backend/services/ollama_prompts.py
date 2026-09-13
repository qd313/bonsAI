"""Title: Ollama prompt builders

Purpose: Prompt construction, intent detectors, and response formatting for Ollama Ask.
Used for: game_ai_request and ollama_ask_service before HTTP chat calls.
Solves: Pure string/policy logic separated from transport in ollama_service.
Does not: Post HTTP to Ollama — see post_ollama_chat in ollama_service.
"""

import re
from typing import Callable, Optional, Any

from backend.constants import (
    DEFAULT_OLLAMA_BASE_URL,
    OLLAMA_TAB_WHERE_AI_RUNS,
)
from backend.services.spoiler_title_profiles import title_profile_is_low_narrative
from backend.tdp_intent import is_current_tdp_read_intent
from backend.services.strategy_guide_parse import (
    STRATEGY_FOLLOWUP_PREFIX,
    format_strategy_checklist_state_block,
    is_strategy_followup_question,
)


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
) -> bool:
    """True when this title treats named bosses/enemies as routine gameplay, not story spoilers."""
    return title_profile_is_low_narrative(app_id, app_name=app_name)


def _strategy_kb_spoiler_clause_suppressed(
    *,
    app_id: str = "",
    app_name: str = "",
    asked_entity: str = "",
) -> bool:
    """True when the KB spoiler clause should be dropped for this turn."""
    return title_profile_is_low_narrative(app_id, app_name=app_name) or bool((asked_entity or "").strip())


# A real entity name is short. Anything longer is a sentence that happened to follow a verb.
_ENTITY_MAX_TOKENS = 4

# Captures that are grammar, not a name. Whatever follows "fight" in "raphael fight strategy"
# is not the boss, and treating it as one applies the named-entity spoiler discount for nothing.
_ENTITY_FILLER = frozenset(
    {
        "it", "this", "that", "them", "him", "her", "me", "us", "these", "those", "one",
        "strategy", "strategies", "tips", "tip", "guide", "help", "advice",
        "boss", "bosses", "enemy", "enemies", "fight", "fights", "battle",
        "final boss", "last boss", "this boss", "the boss", "next boss",
        "the fight", "boss fight", "the game", "game", "level", "mission", "part", "bit",
    }
)

_ENTITY_LEADING_ARTICLES = ("the ", "a ", "an ", "that ", "this ")

# Trail a name in entity-first phrasing: "wheatley fight", "raphael fight strategy".
_ENTITY_TRAILING_QUALIFIERS = frozenset(
    {"fight", "fights", "battle", "boss", "strategy", "strategies", "tips", "tip", "guide",
     "help", "advice"}
)

# Entity-first matching reads text *before* the qualifier, so unlike the verb-first patterns it
# has nothing positional keeping a clause out. Any of these in the capture means it is a
# sentence fragment: "i beat the final boss once" must not yield the entity "i beat the final".
_ENTITY_SENTENCE_TOKENS = frozenset(
    {
        "i", "im", "ive", "you", "we", "my", "me", "our", "us", "they", "their", "it", "its",
        "how", "what", "which", "where", "when", "why", "who",
        "do", "does", "did", "can", "cant", "cannot", "dont", "is", "are", "was", "were", "be",
        "to", "of", "and", "or", "but", "for", "with", "on", "in", "at",
        "beat", "beating", "get", "got", "keeps", "keep", "kept", "need", "want", "trying",
        "best", "good", "better", "worst", "any", "some", "all",
    }
)

# Every verb is boundary-anchored. Without the lookarounds "kill" matches inside "skill", so
# "how to raise a skill fast" yielded the entity "fast" -- the same unanchored-substring class
# of bug that compat_topic_router.py hit with "lan" inside "plants".
#
# "deal with" added 2026-08-23: confirmed on device that "how do i deal with the exploders"
# extracted no entity at all, which is what let the spoiler fence through on that question --
# neither this list nor _match_known_entity's plural handling (see below) covered it alone.
_ENTITY_VERB_FIRST_PATTERNS = (
    r"(?:how\s+(?:do\s+i|to|can\s+i)\s+)?(?<![a-z])(?:beat|defeat|kill|fight|survive(?:\s+against)?|deal\s+with)(?![a-z])\s+(?:the\s+)?(.+?)(?:\?|$)",
    r"(?<![a-z])tips?\s+(?:for|on|against)(?![a-z])\s+(?:the\s+)?(.+?)(?:\?|$)",
    # Versus/co-op register: the player is asking to *operate* the thing, not to survive it.
    r"(?:how\s+(?:do\s+i|to)\s+)?(?<![a-z])(?:use|counter|play\s+as)(?![a-z])\s+(?:the\s+)?(.+?)(?:\?|$)",
)

# Controller users put the name first and the qualifier after it. This is the register the eval
# set was re-authored into, and the verb-first patterns above cannot see any of it.
#
# Anchored to end-of-string, allowing only further qualifiers, because the name has to be the
# whole of what precedes. Unanchored, "fire boss that flies out of holes" -- a query written
# specifically to *avoid* naming Volvagia -- returned the entity "fire".
_ENTITY_QUALIFIER = r"(?:boss\s+fight|boss|fight|strategy|tips?|guide|help)"
_ENTITY_FIRST_PATTERNS = (
    rf"^(.{{2,40}}?)\s+{_ENTITY_QUALIFIER}(?:\s+{_ENTITY_QUALIFIER})*\s*[?.!]*$",
)

# Cut a capture here: what follows is a clause about the entity, not part of its name.
# "and" is deliberately absent -- it joins names ("theseus and the bull").
_ENTITY_CLAUSE_BREAKS = frozenset(
    {"without", "after", "before", "when", "while", "if", "so", "because", "unless", "until",
     "but", "though", "that", "which", "who", "against", "with", "from", "into", "onto",
     "using", "than", "versus", "vs"}
)

# Adverbs a player tacks on that are not part of the name: "kill deathclaw early".
_ENTITY_TRAILING_ADVERBS = frozenset(
    {"early", "late", "fast", "quickly", "quick", "easily", "easy", "first", "again", "now",
     "here", "there", "safely", "solo", "alone", "properly", "cheaply", "reliably"}
)

# Head nouns too generic to stand in for a card title. "Water Temple Boss" must not be reachable
# by typing "boss" -- that is a whole category, not a name, and matching it would unfence
# arbitrary content on a story title. Only consulted for the shortened-name fallback in
# _match_known_entity; a card whose *entire* title is one of these (DRG's "Classes") still
# matches exactly, through the full-title pass that runs first.
_ENTITY_GENERIC_HEADS = frozenset(
    {
        "boss", "bosses", "fight", "fights", "enemy", "enemies", "monster", "monsters",
        "creature", "creatures", "mob", "mobs", "weapon", "weapons", "item", "items",
        "level", "levels", "stage", "stages", "area", "areas", "room", "rooms", "zone", "zones",
        "puzzle", "puzzles", "quest", "quests", "mission", "missions", "wave", "waves",
        "mode", "modes", "class", "classes", "skill", "skills", "guide", "guides",
        "mechanic", "mechanics", "upgrade", "upgrades", "build", "builds", "tips",
    }
)

_KB_CARD_NAME_RE = re.compile(r"\[(?:[^\]/]+/\s*[^:\]]+|Tip)\s*:\s*([^\]]+)\]", re.IGNORECASE)


def kb_card_names(kb_text: str) -> list[str]:
    """Card titles from an assembled KB block, e.g. ``[Left 4 Dead 2 / boss: Tank]`` -> ``Tank``.

    These are the highest-precision entity candidates available: the corpus already decided
    they name a thing, so no guessing is needed when one of them appears in the question.
    """
    names: list[str] = []
    for match in _KB_CARD_NAME_RE.finditer(kb_text or ""):
        name = str(match.group(1) or "").strip()
        if name and name not in names:
            names.append(name)
    return names


def _clean_asked_entity(raw: str, *, entity_first: bool) -> str:
    """Normalize a candidate and reject it when it is grammar rather than a name."""
    entity = re.sub(r"\s+", " ", str(raw or "")).strip().strip("\"'“”")
    entity = entity.rstrip("?.!,;:")
    lowered = entity.lower()
    for article in _ENTITY_LEADING_ARTICLES:
        if lowered.startswith(article):
            entity = entity[len(article) :].strip()
            lowered = entity.lower()
            break
    tokens = entity.split()
    if entity_first:
        while len(tokens) > 1 and tokens[-1].lower().strip("?.!,;:") in _ENTITY_TRAILING_QUALIFIERS:
            tokens.pop()
    else:
        # Verb-first captures run to end of sentence, so they carry the rest of the question
        # with them: "kill boomer without getting bile" -> "boomer without getting bile".
        for index, token in enumerate(tokens):
            if token.lower().strip("?.!,;:") in _ENTITY_CLAUSE_BREAKS:
                tokens = tokens[:index]
                break
    while len(tokens) > 1 and tokens[-1].lower().strip("?.!,;:") in _ENTITY_TRAILING_ADVERBS:
        tokens.pop()
    entity = " ".join(tokens)
    lowered = entity.lower()
    if len(entity) < 3 or lowered in _ENTITY_FILLER:
        return ""
    tokens = entity.split()
    if len(tokens) > _ENTITY_MAX_TOKENS:
        return ""
    if entity_first and any(t.lower().strip("?.!,;:'") in _ENTITY_SENTENCE_TOKENS for t in tokens):
        return ""
    return entity


def _match_known_entity(question: str, known_entities) -> str:
    """Longest known name that appears in the question on word boundaries.

    Allows one trailing "s" past the card's own name -- "exploders" must match the card
    "Exploder" -- because exact-only matching was confirmed on device (2026-08-22) to miss the
    plural while the singular resolved fine. Still boundary-anchored past that "s": a bare
    substring test matches "lan" inside "plants", the same class of false positive
    compat_topic_router.py already had to fix.

    Falls back to the card's *head noun* when the full title does not appear, because players
    shorten multi-word names: the card is "Dreadnought Twins" and nobody types the first word.
    Measured on device 2026-08-23 -- "how do i beat the twins" resolved to the bare word "twins"
    (four runs, identical), so the prompt told the model the user asked about "twins" while the
    attached card was titled "Dreadnought Twins", and the two never got connected.

    The fallback is deliberately narrow, because over-matching here is a *safety* regression and
    not just noise: naming an entity is what unfences it, so a wrong match unfences something on
    a story title. Hence -- only when no full title matched, only trailing spans (the standard
    English shortening; "twins" for "Dreadnought Twins", not "dreadnought" for "Twins Dreadnought"),
    never a generic head like "boss" that would match half the corpus, and never shorter than four
    characters. The returned value is still the *card's* full title, so the prompt names the thing
    the corpus knows about rather than echoing the user's abbreviation back at them.
    """
    haystack = re.sub(r"\s+", " ", (question or "").lower())

    def _appears(text: str) -> bool:
        return bool(re.search(rf"(?<![a-z0-9]){re.escape(text.lower())}s?(?![a-z0-9])", haystack))

    best = ""
    for candidate in known_entities or ():
        name = str(candidate or "").strip()
        if len(name) < 3 or len(name) <= len(best):
            continue
        if _appears(name):
            best = name
    if best:
        return best

    for candidate in known_entities or ():
        name = str(candidate or "").strip()
        words = name.split()
        if len(words) < 2 or len(name) <= len(best):
            continue
        for start in range(1, len(words)):
            tail = " ".join(words[start:])
            lowered = tail.lower()
            if len(tail) < 4 or lowered in _ENTITY_GENERIC_HEADS or lowered in _ENTITY_FILLER:
                continue
            if _appears(tail):
                best = name
                break
    return best


def extract_strategy_asked_entity(question: str, *, known_entities=()) -> str:
    """Pull the boss/enemy/entity name the user named, or "" when they named nothing.

    ``known_entities`` is an optional gazetteer — normally :func:`kb_card_names` over the
    attached KB block — and is tried first because a corpus card title is a fact rather than
    a guess. Without it the function falls back to phrasing patterns in both registers:
    verb-first ("how do I beat the Tank") and entity-first ("wheatley fight"), the latter
    being how people type on a controller.

    Getting this wrong is not symmetric. An empty result over-fences a player who did name the
    thing; a *wrong* result un-fences content they never asked about and drops it verbatim into
    the prompt. Every branch therefore rejects a doubtful capture rather than returning it.
    """
    raw = (question or "").strip()
    if raw.startswith(STRATEGY_FOLLOWUP_PREFIX):
        raw = raw[len(STRATEGY_FOLLOWUP_PREFIX) :].lstrip()

    known = _match_known_entity(raw, known_entities)
    if known:
        return known

    for pattern in _ENTITY_VERB_FIRST_PATTERNS:
        match = re.search(pattern, raw, flags=re.IGNORECASE)
        if not match:
            continue
        entity = _clean_asked_entity(match.group(1), entity_first=False)
        if entity:
            return entity

    for pattern in _ENTITY_FIRST_PATTERNS:
        match = re.search(pattern, raw, flags=re.IGNORECASE)
        if not match:
            continue
        entity = _clean_asked_entity(match.group(1), entity_first=True)
        if entity:
            return entity

    return ""


def kb_text_covers_asked_entity(kb_text: str, entity: str) -> bool:
    """True when attached KB prose likely covers the entity the user asked about."""
    if not entity or not kb_text:
        return False
    entity_l = entity.lower()
    kb_l = kb_text.lower()
    if entity_l in kb_l:
        return True
    tokens = [t for t in re.split(r"[\s\-_/]+", entity_l) if len(t) >= 4]
    return bool(tokens) and sum(1 for t in tokens if t in kb_l) >= max(1, len(tokens) - 1)


def _strategy_spoiler_low_risk_addendum(
    *,
    asked_entity: str,
    kb_entity_match: bool,
    app_id: str = "",
    app_name: str = "",
) -> str:
    """Extra policy when boss/enemy tactics are routine gameplay, not narrative spoilers."""
    title_low_risk = _strategy_title_is_low_spoiler_risk(app_id=app_id, app_name=app_name)
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
    include_strategy_ui_fences: bool = True,
) -> str:
    """Injected after STRATEGY GUIDE MODE header; defines ```bonsai-spoiler fences and ordering."""
    low_risk = _strategy_spoiler_low_risk_addendum(
        asked_entity=asked_entity,
        kb_entity_match=kb_entity_match,
        app_id=app_id,
        app_name=app_name,
    )
    # Subtractive, not additive: when the addendum fires it must REPLACE the boss-name
    # prohibition rather than argue with it in the same block. A 2B-class local model
    # resolves a contradiction toward the prohibitive reading — fencing satisfies both
    # instructions at once, so it is the cheaper error for the model to make.
    #
    # Three states, not two. Named-entity consent on a *story* title must carve out only the
    # entity the user named; dropping the boss clause wholesale there would relax every other
    # boss in the game, which is the over-relax failure the Hades row guards against.
    title_low_risk = _strategy_title_is_low_spoiler_risk(app_id=app_id, app_name=app_name)
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
) -> str:
    """Short constitution inject for Speed/Expert turns with strategy KB cards attached."""
    policy = _strategy_spoiler_policy_block(
        consent,
        followup=False,
        asked_entity=asked_entity,
        kb_entity_match=kb_entity_match,
        app_id=app_id,
        app_name=app_name,
        include_strategy_ui_fences=False,
    )
    return (
        "\n\nSTRATEGY SPOILER CONSTITUTION (knowledge-base coaching):\n"
        f"{policy}"
        "This is not a Strategy Guide branch turn — do not emit ```bonsai-strategy-branches``` "
        "or ```bonsai-strategy-checklist``` fences.\n"
    )

def user_wants_power_or_performance_topic(question: str) -> bool:
    """True when the user message plausibly asks for Deck power/performance tuning."""
    q = (question or "").lower()
    return bool(
        re.search(
            r"\b("
            r"tdp|watts?|fps|frame\s*rate|frametime|frame\s*pacing|performance|"
            r"gpu\s*clock|\bmhz\b|\bgpu\b|thermal|overclock|underclock|\bapu\b|"
            r"battery(\s+life|\s+drain|\s+saving)?|"
            r"power\s*(limit|cap|saving|profile|draw)|"
            r"stutter|stuttering|boost\s*mode|"
            r"efficiency|sweet\s*spot"
            r")\b",
            q,
            flags=re.IGNORECASE,
        )
    )


def _user_asks_sweet_spot_tuning(question: str) -> bool:
    """True when the user asks for an efficiency / performance sweet spot (QAM-oriented copy)."""
    s = (question or "").lower()
    if "sweet spot" in s:
        return True
    return "efficiency" in s and "spot" in s


SWEET_SPOT_QAM_LINE = (
    "\n\nDECK TUNING (efficiency / sweet spot): The user wants a practical balance for the running game. "
    "Answer using the same levers as **Steam Quick Access (⋯) → Performance**: "
    "**Framerate limit** (target Hz or off), **TDP limit** (watts), and **GPU clock** (automatic vs manual MHz). "
    "Recommend concrete values for all three when possible. Put TDP and manual GPU clock into the required JSON when you change them; "
    "state the framerate cap clearly in the prose (this plugin JSON has no FPS field).\n"
)

GRAPHICS_RESOLUTION_SPEED = (
    "\n\nDISPLAY TARGETS (Speed mode): This ask is about graphics or performance tuning on Deck. "
    "The device may be used at **1280×800** (built-in panel), **1080p** on an external display, or **4K**. "
    "In **one reply**, give **separate labeled guidance for all three** (clear headings: 1280×800, 1080p, 4K), including "
    "in-game options, **Quick Access → Performance** levers where relevant, and the required JSON when you change TDP or GPU MHz.\n"
)

GRAPHICS_RESOLUTION_STRATEGY = (
    "\n\nDISPLAY TARGETS (Strategy mode): Do **not** give full triple-resolution tuning tables in this first reply. "
    "Use the required ```bonsai-strategy-branches``` fence with **exactly four** options: **a, b, c** = **1280×800**, **1080p**, **4K** (short, clear labels); "
    "**d** = a custom entry with **exact JSON** `\"id\":\"d\"` and a short label like **Enter your own** (or **Type my resolution**). "
    "The plugin turns option **d** into a button that only opens the text field with a starter line—do not describe that UI behavior in the visible prose. "
    "If the message is only about **FPS, settings, TDP, or GPU** (not a gameplay beat or location), the branch question must be "
    "about that display choice — do **not** default to a story or progress branch. "
    "Save detailed per-target advice for after they pick a, b, or c, or after they send a follow-up with a custom resolution from **d**.\n"
)

GRAPHICS_RESOLUTION_EXPERT = (
    "\n\nDISPLAY TARGETS (Expert mode): Give **concrete recommendations for all three** outputs—**1280×800**, **1080p**, and **4K**—in separate labeled sections. "
    "Then **end** with a follow-up that lists **(1) 1280×800 (2) 1080p (3) 4K (4) Enter your own** — for (4) tell the user they can describe their exact display in the next message, "
    "starting with **My resolution is:** … (Strategy mode on Deck also exposes this as a branch button **d**). "
    "Ask which target to refine next, or to send their custom line.\n"
)


def _user_asks_resolution_relevant_performance(question: str) -> bool:
    """Graphics / FPS tuning where output resolution variant matters (matches shipped performance presets)."""
    s = (question or "").lower()
    if re.search(r"best settings for \d+\s*fps", s):
        return True
    if re.search(r"\bhow do i balance fps and battery\b", s):
        return True
    if "gpu clock" in s:
        return True
    if re.search(r"\bfsr\b", s):
        return True
    if re.search(r"\brecommended tdp\b", s) and "this game" in s:
        return True
    return False


def user_asks_ollama_bonsai_host_or_latency(question: str) -> bool:
    """True when the user is asking about Ollama/bonsAI connectivity, host setup, or slow LLM responses."""
    s = (question or "").lower().strip()
    if not s:
        return False
    if "ollama" in s:
        if any(
            k in s
            for k in (
                "slow",
                "latency",
                "timeout",
                "hang",
                "stuck",
                "diagnose",
                "connection",
                "refused",
                "firewall",
                "host",
                "11434",
                "ollama_host",
                "not responding",
                "speed up",
                "faster",
                "first token",
                "unload",
                "remote",
                "lan",
                "wi-fi",
                "wifi",
                "network",
                "laggy",
                "stalling",
            )
        ):
            return True
        if re.search(r"\blag\b", s):
            return True
        if ("response" in s or "reply" in s) and ("slow" in s or "diagnose" in s):
            return True
        if any(k in s for k in ("setup", "configure", "install")) and any(
            k in s for k in ("bonsai", "deck", "pc", "connect", "url", "http")
        ):
            return True
    if "bonsai" in s and any(
        k in s
        for k in (
            "ollama",
            "host",
            "connection",
            "timeout",
            "slow",
            "connect",
            "can't connect",
            "cannot connect",
            "127.0.0.1",
            "11434",
        )
    ):
        return True
    if re.search(r"\b(slow|latency|timeout|hanging)\b.*\b(inference|generation|llm)\b", s):
        return True
    if re.search(r"\b(inference|generation)\b.*\b(slow|latency)\b", s):
        return True
    return False


def append_deck_tdp_sysfs_grounding(
    system_text: str,
    *,
    read_tdp: bool = False,
    cap_w: Optional[int] = None,
    grounding_requested: bool = False,
) -> str:
    """Append measured TDP cap (or read-failure notice) to the system prompt; no-op if not requested."""
    if not grounding_requested:
        return system_text
    if cap_w is not None:
        block = (
            f"\n\nON-DEVICE TDP (measured; do not contradict for the **current** cap): "
            f"amdgpu `power1_cap` in sysfs reports **{cap_w}W** as the current **power cap** — not the overlay's instant draw. "
        )
        if read_tdp:
            block += (
                "The user is asking for the current TDP / cap. State this value clearly in your usual voice. "
                "Do not use a different wattage for the **current** limit. "
            )
        else:
            block += (
                "When recommending a different TDP, treat this as the **baseline**; you may still suggest a new cap in the required JSON. "
            )
        block += (
            "Hardware range remains 3–15W. The Steam performance overlay shows **power draw (W)**, which may differ from this cap."
        )
        return system_text + block
    return (
        system_text
        + "\n\nON-DEVICE TDP: The power cap could not be read from sysfs. Do not invent a current wattage; say it could not be read."
    )


def _user_asks_model_policy_tiers_explainer(question: str) -> bool:
    """True when the user wants bonsAI Model policy tiers / FOSS vs open-weight vs proprietary explained."""
    s = (question or "").lower().strip()
    if not s:
        return False
    if "explain the model policy tiers" in s:
        return True
    if "model policy tier" in s:
        return True
    if "what does my model policy" in s:
        return True
    if "model policy" in s and (
        "tier" in s
        or "foss" in s
        or "open weight" in s
        or "open-weight" in s
        or "open model" in s
        or "closed source" in s
        or "non-foss" in s
        or "non foss" in s
        or "difference" in s
    ):
        return True
    return False


def _user_asks_deck_troubleshooting_or_compat_line(question: str) -> bool:
    """General compatibility / Proton / stability prompts (shipped main-tab presets, prompt-testing group)."""
    s = (question or "").lower()
    if "what settings should i use" in s:
        return True
    if "any known issues" in s and "deck" in s:
        return True
    if "how well does this game run" in s and "deck" in s:
        return True
    if "why is my game crashing" in s:
        return True
    if re.search(r"\b(how do i fix stuttering|fix stuttering)\b", s):
        return True
    if "troubleshoot" in s and "proton" in s:
        return True
    if re.search(r"\bgame won'?t launch\b", s) and "check" in s:
        return True
    if "proton issue" in s:
        return True
    if "proton" in s and any(
        kw in s
        for kw in (
            "deck",
            "sleep",
            "resume",
            "black screen",
            "crash",
            "launch",
            "stutter",
            "shader",
            "wine",
            "steamos",
            "compat",
        )
    ):
        return True
    if "deck" in s and any(
        kw in s
        for kw in (
            "sleep",
            "resume",
            "black screen",
            "crash",
            "proton",
            "steamos",
            "sd card",
            "storage",
            "update",
            "gamescope",
            "steam input",
        )
    ):
        return True
    return False


def question_matches_troubleshooting_log_context(question: str) -> bool:
    """True when the Ask matches troubleshooting presets (crashes, Proton, stutter, etc.)."""
    return _user_asks_deck_troubleshooting_or_compat_line(question)


OLLAMA_BONSAI_SETUP_LINE = (
    "\n\nOLLAMA / bonsAI (host & inference): The user is asking about **slow or failing Ollama responses** and/or **how Ollama is set up for bonsAI**. "
    "Answer as **LLM/host/network** guidance — **not** Steam **Performance / TDP / FPS / QAM game sliders** unless they explicitly tie slowness to those.\n"
    f"Cover, in plain steps: **bonsAI {OLLAMA_TAB_WHERE_AI_RUNS}** — base URL / host (Deck-local `{DEFAULT_OLLAMA_BASE_URL}` vs Ollama on a **PC** on the LAN), **hard timeout** and warning threshold, **Ollama keep-alive** (how long models stay loaded vs VRAM).\n"
    "Cover **host reachability**: on the PC running Ollama, `OLLAMA_HOST` / bind address, OS firewall allowing **11434**, same subnet as the Deck, and correcting typos in the URL.\n"
    "Cover **model load**: large or heavy tags are slower on Deck; suggest smaller or better-quantized models; **Ask mode** (Speed / Strategy / Expert) changes fallback chains; **model policy tier** can limit which tags run.\n"
    "Cover **telling network vs compute delay**: first-token wait vs steady tokens/s; if the host is remote, mention Wi‑Fi vs Ethernet and distance to the PC.\n"
    "Point to **docs/troubleshooting.md** themes (firewall, `OLLAMA_HOST`, LAN) when relevant. "
    "Do **not** output the ```json``` TDP/GPU recommendation block for this topic.\n"
)

HARDWARE_APPENDIX_SKIPPED_FOR_OLLAMA_TOPIC = (
    "Hardware appendix (Deck TDP/GPU JSON): **Skipped for this topic** — the user is focused on Ollama/bonsAI inference or networking, not in-game power sliders. "
    "Do **not** output the ```json``` TDP/GPU block unless they **also** explicitly ask for Deck TDP or GPU MHz changes in the same message.\n\n"
)

HARDWARE_APPENDIX_SKIPPED_FOR_TROUBLESHOOT = (
    "Hardware appendix (Deck TDP/GPU JSON): **Skipped for this topic** — troubleshooting/compat ask, not power tuning. "
    "Do **not** output the ```json``` TDP/GPU block unless the user explicitly asks for Deck watts, FPS, GPU MHz, "
    "battery drain, or thermal limits in the same message.\n\n"
)

MODEL_POLICY_TIERS_LINE = (
    "\n\nMODEL POLICY TIERS (bonsAI): The user wants **what bonsAI’s Model policy tiers are** and how they differ—not a vague nod. "
    "Answer in clear sections:\n"
    "**1) What this controls:** bonsAI picks **ordered Ollama model fallbacks** from tags on the user’s host; the tier only changes **which tag families may appear** in that list. It does not install models.\n"
    "**2) FOSS / open-source vs open-weight vs closed:** In plain language: **FOSS / open-source–aligned** (Tier 1 routing) means families we classify as **source-available under open licenses** for routing—**not** a lawyer’s verdict. "
    "**Open model / open-weight** (Tier 2) usually means **weights are published** for local inference, but **license, training transparency, or use rules** can differ from Tier 1. "
    "**Closed / proprietary / non-FOSS** (Tier 3 bucket) means tags we treat as outside those defaults, plus **unclassified** Ollama names not in our table—users must **read upstream licenses**.\n"
    "**3) The three tiers (match UI labels):** "
    "**Tier 1 — Open-source only:** strictest; FOSS-aligned routing families only. "
    "**Tier 2 — Open-source + open model (open-weight):** Tier 1 **plus** common open-weight families. "
    "**Tier 3 — Non-FOSS + unclassified:** requires explicit unlock; broadest; unknown tags only when allowed—**verify trust and license**.\n"
    "State that classifications are **heuristic for UX/routing**, not legal advice. Mention **Permissions (or Settings) → Model policy** where the user changes tier, and that replies can show a short **Model source disclosure** after an Ask. "
    "Do **not** pivot to Steam Performance/TDP unless they ask. "
    "If **Strategy Guide mode** is active but this message is **only** about model policy (not gameplay), **do not** output ```bonsai-strategy-branches```—answer with a normal explanation.\n"
)

DECK_TROUBLESHOOT_GAME_SETTINGS_LINE = (
    "\n\nDECK TROUBLESHOOTING (game in focus): The user is asking about settings, how the title runs, crashes, stutter, Proton, or launch. "
    "The plugin cannot run a web browser or live web search. Use **established, widely repeated** public compatibility guidance (for example the "
    "kinds of tips players share on ProtonDB and Steam Deck community threads), phrased as *often reported* or *commonly tried* — and **state uncertainty** when you are not sure. "
    "Do **not** claim to have used Google, performed a real-time search, or read the web today. "
    "When a **game title** is provided above, add a **dedicated short section** on **in-game and launcher** options, Windows/Linux port quirks, and anti-cheat/DRM that are **frequently** tied to that kind of problem on Deck (e.g. graphics API, fullscreen mode, EAC, shader cache, VSync, frame-gen, or game-specific options). "
    "Tie what you name to the **user’s specific symptom** (crash, stutter, Proton, won’t launch) where possible. "
    "On STRATEGY first-turn messages that end with a ```bonsai-strategy-branches``` fence, put that guidance only in the **visible** text **above** the fence; the branch fence must remain the **last** characters of the reply.\n"
)

# Identity + scope (after dynamic game/attachment/vision block; TDP/JSON contract is appended last).
BONSAI_SYSTEM_IDENTITY = (
    "You are bonsAI, an expert system assistant embedded on a Steam Deck handheld. "
    "Always answer directly, concisely, and in English.\n\n"
)

GENERAL_PURPOSE_ASSISTANT_CLAUSE = (
    "Your primary expertise is Steam Deck and handheld PC gaming—including performance, compatibility, and how to use this plugin's "
    "context (running title, screenshots, and any excerpts supplied above). When the user asks about something else, still help usefully "
    "from general knowledge; say clearly when you are unsure or when an answer would need live tools you do not have. Do not claim to "
    "run shell commands or code, browse the web, perform real-time search, or read files beyond what appears in this system message.\n\n"
)

def extract_question_snippet_for_prompt(question: str, max_len: int = 56) -> str:
    """Short user-topic snippet for status-line instructions (avoid circular import with stream tags)."""
    raw = re.sub(r"\s+", " ", (question or "").strip())
    if not raw:
        return ""
    for sep in (". ", "? ", "! ", "; ", " — ", " - "):
        if sep in raw:
            raw = raw.split(sep, 1)[0].strip()
            break
    if len(raw) > max_len:
        return raw[: max_len - 1].rstrip() + "…"
    return raw


def build_bonsai_status_stream_instruction(
    app_name: str = "",
    ask_mode: str = "speed",
    has_images: bool = False,
    question_snippet: str = "",
    character_roleplay_on: bool = False,
) -> str:
    """Dynamic guidance for model-emitted ``<bonsai-status>`` tags during streaming."""
    game = (app_name or "").strip()
    example_game = game or "your game"
    snippet = (question_snippet or "").strip()
    topic_bit = f' about "{snippet}"' if snippet else ""
    image_hint = (
        " When screenshots are attached, mention what you are reviewing in the image "
        "(e.g. HUD, puzzle, boss arena) without inventing details you cannot see."
        if has_images
        else ""
    )
    tone_hint = ""
    if character_roleplay_on:
        tone_hint = (
            " Match the active character voice: dry deadpan or dry wit is fine; stay helpful and under ~120 characters. "
            "Do not spoil strategy secrets.\n"
        )
    else:
        tone_hint = (
            " Keep the line disgruntled or dry-deadpan — weave the user's topic words; stay helpful. "
            "Avoid lazy openers (Yeah, Fine, Sure, Oh joy).\n"
        )
    strategy_hint = ""
    if ask_mode == "strategy":
        # Two instructions, not one, because the model will sometimes name the boss anyway. The
        # first asks it not to; the second gives it somewhere safe to put the name when it does,
        # which the client renders as a block redaction. Belt and braces on a surface where a
        # leak is unrecoverable — the user has already read it.
        strategy_hint = (
            " In Strategy Guide mode, the status line must NEVER spoil story beats, boss names, "
            "puzzle solutions, or hidden secrets — describe your investigative focus only "
            "(e.g. 'Reviewing the shrine layout in your screenshot'). "
            "If you cannot avoid naming something spoilery inside the status line, wrap just that "
            "word or phrase in [[spoiler]]…[[/spoiler]] so it can be hidden "
            "(e.g. 'Working out how to beat [[spoiler]]Malenia's waterfowl dance[[/spoiler]]').\n"
        )
    if has_images:
        example = (
            f"<bonsai-status>Reviewing your {example_game} screenshot{topic_bit}</bonsai-status>"
        )
    else:
        example = (
            f"<bonsai-status>Checking {example_game or 'your question'}{topic_bit}</bonsai-status>"
        )
    return (
        "STATUS LINE (required): As the very first characters of your assistant reply, emit one line "
        "<bonsai-status>short plain-English status for the user</bonsai-status> "
        "(under ~120 characters; no markdown inside the tag). Reference the user's topic when possible. "
        "Then continue with your normal answer on the following lines. "
        "If your focus changes partway through a long answer you may emit one more such tag on its own "
        "line at that point — at most two or three in total, only when the work genuinely moved on. "
        "Every status tag is stripped before the user sees the final reply.\n"
        f"Example: {example}\n"
        f"{tone_hint}"
        f"{strategy_hint}"
        f"{image_hint}\n\n"
    )

THIN_CONTEXT_HONESTY_CLAUSE = (
    "LIMITED CONTEXT: No active game and no screenshots were attached for this turn. "
    "Prefer general Steam Deck guidance; say when you are uncertain or guessing; do not invent a specific game title, "
    "AppID, or on-screen detail you cannot see.\n\n"
)

_REPLY_VERBOSITY_SHARED = (
    "REPLY VERBOSITY: This block shapes visible coaching prose only (the answer body after the required "
    "<bonsai-status> line — not the status tag itself). Structural topic/mode injects and mandatory fences "
    "(```bonsai-strategy-branches```, ```bonsai-strategy-checklist```, ```json``` TDP blocks, "
    "checklists) take priority. Word caps apply to visible prose only, not fence JSON.\n"
)


def user_asks_for_detail_depth(question: str) -> bool:
    """Phrase heuristics: user wants more depth despite Caveman verbosity."""
    q = (question or "").lower()
    needles = (
        "step by step",
        "step-by-step",
        "walkthrough",
        "explain why",
        "in detail",
        "full guide",
        "detailed guide",
        "break it down",
        "tutorial",
        "comprehensive",
    )
    return any(n in q for n in needles)


from backend.services.reply_language_service import language_display_name


def build_reply_language_block(reply_language: str) -> str:
    """Hard instruction to reply in the user's configured language."""
    code = (reply_language or "english").strip().lower()
    if not code or code == "english":
        return ""
    label = language_display_name(code)
    return (
        f"\n\nREPLY LANGUAGE ({label}):\n"
        f"You MUST write all user-visible prose in {label}. This overrides the language of the user's question.\n"
        "For fenced JSON blocks (strategy branches, checklists, TDP recommendations): keep fence names, JSON keys, "
        "and option \"id\" values exactly as specified in English; translate only player-facing string values "
        "(\"label\", \"question\", \"title\", and similar).\n"
        "Keep technical tokens in English: Proton, TDP, AppID, file paths, error codes, model names, and hardware units.\n"
    )


def build_reply_verbosity_block(
    reply_verbosity: str,
    *,
    question: str,
    ask_mode: str,
    character_roleplay_on: bool = False,
) -> str:
    """Inject Caveman/Detailed prose coaching; balanced returns empty (shipped behavior).

    Caveman replaces legacy Short. When AI character roleplay is on, Caveman inject is skipped
    so character voice wins. Legacy settings value ``short`` is treated as caveman.
    """
    v = (reply_verbosity or "balanced").strip().lower()
    if v == "short":
        v = "caveman"
    if v == "balanced" or v not in ("caveman", "detailed"):
        return ""

    shared = _REPLY_VERBOSITY_SHARED
    _ = ask_mode  # reserved for per-mode overrides later

    if v == "caveman":
        # Character voice wins: skip caveman grammar coaching entirely.
        if character_roleplay_on:
            return ""
        relax = ""
        if user_asks_for_detail_depth(question):
            relax = (
                "The user asked for depth: you may add one short extra section after the direct answer, "
                "still bullet-first and still caveman-terse.\n"
            )
        return (
            f"\n\n{shared}"
            "CAVEMAN REPLY STYLE: Speak terse like smart caveman. Keep full technical accuracy. Only fluff dies.\n"
            "Drop articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries, and hedging. "
            "Fragments OK. Prefer short synonyms (big not extensive, fix not implement a solution). "
            "No decorative emoji. Never invent abbreviations. Technical terms stay exact "
            "(Proton, TDP, AppID, file paths, error codes, model names). "
            "Never drop not/never/no/only/except — meaning flips worse than any brevity. "
            "Numbers and units exact. Code blocks and mandatory fence JSON unchanged.\n"
            "Pattern: [thing] [action] [reason]. [next step].\n"
            "Never name or announce this style. No self-reference like caveman mode.\n"
            "Auto-clarity: for irreversible or destructive warnings (delete, wipe, format, remove prefix/compatdata), "
            "use clear normal prose for that warning, then resume caveman after.\n"
            "Stop when the direct answer is complete. Reinforce answering concisely (identity clause above).\n"
            f"{relax}"
        )

    roleplay_note = ""
    if character_roleplay_on:
        roleplay_note = (
            "When character brevity conflicts with this verbosity setting, prioritize paragraph depth "
            "for the main answer body.\n"
        )
    return (
        f"\n\n{shared}"
        "DETAILED REPLY STYLE: Use paragraphs with rationale and context; soft cap ~500 words on visible prose "
        "unless the user explicitly asks for more. If the identity clause says 'concisely', this block overrides "
        "for main answer prose. If running out of generation budget, finish the direct answer first, then trim rationale.\n"
        f"{roleplay_note}"
    )


# Labels the Phase 4 structured enemy/item cards use. Kept here rather than imported from the
# knowledge base service so the prompt layer takes no dependency on retrieval internals; the
# two are coupled by the card authoring format, documented in docs/knowledge-base.md.
_STRUCTURED_CARD_LABELS = ("Weak points:", "Uses:", "Phases:", "Summary:")


# Matches knowledge_base_service._BLOCK_HEADER exactly. Duplicated rather than imported for the
# same reason as _STRUCTURED_CARD_LABELS above -- only used to find where to splice the
# follow-up subject note below (D98).
_KB_BLOCK_HEADER = "--- Local knowledge base (bonsAI; offline corpus; may be truncated) ---"

# D98 (docs/audit/maintainer-decisions-locked.md): what a bare follow-up gets told when
# game_ai_request.py's follow-up memory actually supplied a remembered subject for this turn --
# see build_system_prompt's `followup_subject` parameter below for the gate. Measured
# 2026-09-12 off the device (runs/plan48-followup-shapes.json), three boss-then-follow-up pairs
# from three games, three runs each, every reply read by hand:
#
#   Today, before this shipped ......... right boss 0 of 9
#   This one sentence added ............ right boss 4 of 9 (2/3 Deep Rock Galactic: Survivor,
#                                         2/3 Ocarina of Time, 0/3 DOOM Eternal)
#   Notes narrowed to the subject instead right boss 2 of 9, and neither of those two named the
#                                         boss even when right -- rejected, not shipped
#
# So: a real fix, not a full one. Putting the right note first (already shipped) was not enough
# on its own -- a better-matching *wrong* note was still in the pile and the small model wrote
# about that instead. Telling it which thing to answer about fixes that on the games where the
# model can do the job at all (4 of 6, DOOM Eternal set aside). DOOM Eternal got it right zero
# times under every shape tried, including being handed only the correct note and nothing else
# to be confused by -- that is the model failing to connect "second phase" to the note's own
# text, and nothing on the searching side can close it. Side effect worth knowing: the reply
# comes back about half as long, 87 words down to 44.
#
# Wording is fixed by the measurement, not by taste -- do not reword or reposition this without
# re-measuring. In particular, "This reminder alone is not the user naming {subject} themselves"
# is the one line stopping a remembered subject (which is sometimes just the top attached note's
# own title, never anything the person typed) from ever unfencing that subject's spoilers on its
# own. Public (no leading underscore) so scripts/eval_kb_answers.py imports this exact constant
# to keep measuring the shape that shipped, instead of keeping a hand-copied duplicate that could
# quietly drift from it.
FOLLOWUP_SUBJECT_NOTE_TEMPLATE = (
    "\nFOLLOW-UP CONTEXT (a system reminder, not something the user typed): this question "
    'carries on from the previous one, which was about "{subject}". Answer this one about '
    "{subject} specifically. This reminder alone is not the user naming {subject} themselves.\n"
)


# DRG Survivor jargon glossary (roadmap: tap-to-define jargon). AppID matches the game row at
# data/kb/strategy_seed.json:4. Terms match the frontend's curated list at
# src/data/drgGlossaryTerms.ts -- keep the two in sync by hand; there is no shared source yet
# because this is a deliberately small, single-title first cut, not a generic cross-game
# jargon framework the roadmap explicitly rules out building.
DRG_SURVIVOR_APP_ID = "2321470"
_DRG_SURVIVOR_NAME_NEEDLE = "deep rock galactic: survivor"
_DRG_GLOSSARY_TERM_LABELS = ("kiting", "overclock")


def _is_drg_survivor_title(app_id: str = "", app_name: str = "") -> bool:
    """True for Deep Rock Galactic: Survivor, by AppID or by name."""
    if (app_id or "").strip() == DRG_SURVIVOR_APP_ID:
        return True
    return _DRG_SURVIVOR_NAME_NEEDLE in (app_name or "").strip().lower()


def _drg_survivor_glossary_clause(app_id: str = "", app_name: str = "") -> str:
    """Tell the model DRG Survivor jargon is tap-to-define, so it can use terms without derailing to explain them.

    Conditional on the title, the same shape as STRUCTURED CARDS above: an unconditional clause
    would spend tokens on every Ask regardless of game. Scoped to this one title on purpose --
    see the module-level comment above; this is a curated single-title glossary, not a generic
    jargon-detection framework.
    """
    if not _is_drg_survivor_title(app_id=app_id, app_name=app_name):
        return ""
    terms = " / ".join(_DRG_GLOSSARY_TERM_LABELS)
    return (
        f"\nGLOSSARY (Deep Rock Galactic: Survivor): {terms} are tap-to-define in this UI -- "
        "the player can select one of these words to see its definition. Use them naturally "
        "where they fit rather than stopping to define them inline; only spell one out in "
        "prose if the player directly asks what it means.\n"
    )


def build_system_prompt(
    question: str,
    app_id: str,
    app_name: str,
    normalized_attachments: list,
    prepared_images: list,
    lookup_app_name: Callable[[str], str],
    lookup_screenshot_vdf_metadata: Callable[[str], dict],
    ask_mode: str = "speed",
    early_context_suffix: str = "",
    followup_subject: str = "",
    strategy_spoiler_consent: bool = False,
    strategy_spoiler_asked_entity: str = "",
    strategy_spoiler_kb_entity_match: bool = False,
    strategy_domain_guidance: bool = False,
    character_roleplay_on: bool = False,
    strategy_checklist_state: Optional[dict] = None,
    reply_verbosity: str = "balanced",
    reply_language: str = "english",
    knowledge_block_placement: str = "early",
) -> str:
    """Build the system message used for Ollama requests from game and attachment context.

    Layers (excluding optional roleplay prefix from ``main.py``): dynamic game/attachment/vision → identity +
    general-purpose clause → ``early_context_suffix`` (e.g. Proton excerpts) → topic/mode injects → TDP + JSON
    contract tail. Future RAG snippets belong immediately before the topic injects (same splice as
    ``early_context_suffix``, or an adjacent block in ``main.py``).

    ``knowledge_block_placement``: ``"early"`` (default) keeps ``early_context_suffix`` where it has
    always spliced in, right after identity. ``"late"`` moves it to immediately before the hardware
    appendix tail instead, so on a prompt that overflows the model's window and loses its start,
    the attached cards are the part nearest the end that survives (D46).

    ``followup_subject``: non-empty only on the exact turn game_ai_request.py's follow-up memory
    used a remembered subject (a bare follow-up naming nothing of its own). Splices
    ``FOLLOWUP_SUBJECT_NOTE_TEMPLATE`` right after the knowledge-base block header line -- see that
    constant's comment for why the wording and position are fixed, and for the partial-fix numbers
    (D98). A no-op when blank, or when ``early_context_suffix`` never attached a knowledge-base
    block at all.
    """
    attachment_app_ids = sorted(
        {
            str(att.get("app_id", "") or "").strip()
            for att in normalized_attachments
            if str(att.get("app_id", "") or "").strip()
        }
    )
    if app_name:
        game_line = f"The currently running game is: {app_name} (AppID: {app_id})."
    elif app_id:
        game_line = f"The currently running game has AppID: {app_id} (name unknown)."
    else:
        game_line = "No game is currently running."

    attachment_name_pairs = []
    vdf_caption_hints = []
    vdf_shortcut_hints = []
    for candidate_app_id in attachment_app_ids:
        resolved_name = lookup_app_name(candidate_app_id)
        if resolved_name:
            attachment_name_pairs.append(f"{candidate_app_id}={resolved_name}")

    attachment_game_context_line = (
        f"Resolved game-title hints from attachment AppIDs: {', '.join(attachment_name_pairs)}."
        if attachment_name_pairs
        else (
            "Attachment metadata contains numeric Steam AppIDs, but no reliable title mapping was resolved. "
            "Do NOT treat numeric AppIDs as game titles."
            if attachment_app_ids
            else "No attachment AppID metadata is available."
        )
    )
    for attachment in normalized_attachments:
        hint = lookup_screenshot_vdf_metadata(str(attachment.get("path", "") or ""))
        caption = str(hint.get("caption", "") or "").strip()
        shortcut_name = str(hint.get("shortcut_name", "") or "").strip()
        if caption:
            vdf_caption_hints.append(caption)
        if shortcut_name:
            vdf_shortcut_hints.append(shortcut_name)

    attachment_name_context_line = (
        f"Attachment AppID title hints from Steam manifests: {', '.join(attachment_name_pairs)}."
        if attachment_name_pairs
        else "No local Steam manifest title hints were resolved for attachment AppIDs."
    )
    vdf_context_line = (
        f"Attachment metadata hints from screenshots.vdf: shortcut names={', '.join(vdf_shortcut_hints)}; captions={', '.join(vdf_caption_hints)}."
        if (vdf_caption_hints or vdf_shortcut_hints)
        else "No useful screenshot-level hints were found in screenshots.vdf."
    )
    vision_line = (
        f"Visual context attachments provided: {len(prepared_images)}."
        if prepared_images
        else "No visual context attachments provided."
    )
    vision_priority_line = (
        "When images are provided, prioritize identifying gameplay/world content over Steam overlay or menu chrome. "
        "Treat Steam UI elements as secondary context unless the user asks specifically about the UI. "
        "Do not confidently name a specific game title unless visual evidence is strong and unambiguous. "
        "Require at least two distinct game-specific cues before naming a title. "
        "If those cues are not present, explicitly say uncertainty and describe only concrete visible elements. "
        "Never claim that a numeric AppID value is the game title."
    )
    genre_franchise_cue_line = (
        "Use recognizable in-game HUD motifs to improve game hypotheses. "
        "Examples: hearts + rupees + item C-button layout + temple-area labels strongly suggest Zelda Ocarina-style UI. "
        "When these cues are present, explicitly state the likely franchise/title hypothesis with confidence level. "
        "RULE: Ship of Harkinian (SoH) is The Legend of Zelda: Ocarina of Time for all coaching—same dungeons, items, "
        "boss order, terminology, and spoiler boundaries as OoT; do not treat SoH as a separate unknown title."
    )
    user_game_intent = bool(re.search(r"\b(game|title|level|boss|area)\b", question or "", flags=re.IGNORECASE))
    game_intent_line = (
        "The user is asking about the game itself. Focus first on in-game UI, world art style, HUD motifs, character design, "
        "and objective text. Minimize Steam overlay/plugin UI mentions unless absolutely necessary."
        if user_game_intent
        else "If the user asks about gameplay context, prioritize game-specific visual cues over Steam UI."
    )
    thin_context = not (app_id or "").strip() and not (app_name or "").strip() and not prepared_images
    # These three rules only matter once there is something on screen to read — an unconditional
    # inject spent tokens on every Ask, image or not.
    screenshot_rules = (
        f" {vision_priority_line} {genre_franchise_cue_line} {game_intent_line}" if prepared_images else ""
    )
    dynamic_block = (
        f"{game_line} {attachment_game_context_line} {attachment_name_context_line} {vdf_context_line} "
        f"{vision_line}{screenshot_rules}\n\n"
    )
    if thin_context:
        dynamic_block += THIN_CONTEXT_HONESTY_CLAUSE
    general_block = (
        BONSAI_SYSTEM_IDENTITY
        + GENERAL_PURPOSE_ASSISTANT_CLAUSE
        + build_bonsai_status_stream_instruction(
            app_name=app_name,
            ask_mode=ask_mode,
            has_images=bool(prepared_images),
            question_snippet=extract_question_snippet_for_prompt(question),
            character_roleplay_on=character_roleplay_on,
        )
    )
    drg_glossary_block = _drg_survivor_glossary_clause(app_id=app_id, app_name=app_name)
    strategy_domain = strategy_domain_guidance or ask_mode == "strategy"
    strategy_kb_relaxed = strategy_domain and _strategy_kb_spoiler_clause_suppressed(
        app_id=app_id,
        app_name=app_name,
        asked_entity=strategy_spoiler_asked_entity,
    )
    early_stripped = (early_context_suffix or "").strip()
    if followup_subject and _KB_BLOCK_HEADER in early_stripped:
        followup_note = FOLLOWUP_SUBJECT_NOTE_TEMPLATE.format(subject=followup_subject)
        early_stripped = early_stripped.replace(_KB_BLOCK_HEADER, _KB_BLOCK_HEADER + followup_note, 1)
    early_block = f"\n\n{early_stripped}" if early_stripped else ""
    if early_stripped and "Local knowledge base" in early_stripped:
        early_block += (
            "\n\nKNOWLEDGE BASE (offline corpus): Ground answers in the attached strategy/compat "
            "cards when relevant.\n"
            if strategy_kb_relaxed
            else "\n\nKNOWLEDGE BASE (offline corpus): Ground answers in the attached strategy/compat "
            "cards when relevant. "
            "Put spoilery walkthrough detail inside ```bonsai-spoiler``` when the user has not opted in.\n"
        )
        # Phase 4 R1: structured cards carry labelled lines (Summary / Weak points / Uses /
        # Tips / Phases). Keep those labels in the reply as light bullets so an enemy or item
        # answer has a predictable shape a player can scan mid-fight -- plain markdown on
        # purpose, not a custom UI card, which is a later wave.
        #
        # Conditional on the block actually containing a structured card. An unconditional
        # instruction would spend tokens on every knowledge-base Ask, and most of them attach
        # prose cards with nothing to label.
        if any(label in early_stripped for label in _STRUCTURED_CARD_LABELS):
            early_block += (
                "\nSTRUCTURED CARDS: some attached cards use labelled lines "
                "(Summary / Weak points / Uses / Tips / Phases). When you draw on one, keep "
                "those labels as short bullets rather than dissolving them into a paragraph, "
                "and drop any label the card does not have.\n"
            )

    placement = knowledge_block_placement if knowledge_block_placement == "late" else "early"

    def _assemble(head: str, rest: str, tail_block: str) -> str:
        """Splice ``early_block`` (the Proton excerpt / knowledge-base cards) either right after
        identity (today's order) or immediately before the tail, per ``placement``."""
        if placement == "late":
            return head + rest + early_block + tail_block
        return head + early_block + rest + tail_block

    hardware_tdp_appendix = (
        "Hardware appendix (apply only when relevant): The Steam Deck APU supports a TDP range of 3-15 watts and "
        "GPU clock of 200-1600 MHz. Never suggest power values outside these hardware limits.\n\n"
        "IMPORTANT: When you recommend or apply a TDP or GPU clock change, you MUST include this exact JSON block in your response:\n"
        '```json\n{"tdp_watts": <int 3-15>, "gpu_clock_mhz": <int 200-1600 or null>}\n```\n'
        "Without this JSON block, the change will NOT be applied. Only include it when actively recommending a change. "
        "If the user did not ask about performance, FPS, TDP, battery tuning, or thermal/power limits, skip Deck power talk "
        "and omit this JSON block."
    )

    if ask_mode != "strategy":
        ollama_q = user_asks_ollama_bonsai_host_or_latency(question)
        model_policy_q = _user_asks_model_policy_tiers_explainer(question)
        sweet = _user_asks_sweet_spot_tuning(question)
        gfx = ""
        if _user_asks_resolution_relevant_performance(question):
            gfx = GRAPHICS_RESOLUTION_EXPERT if ask_mode == "expert" else GRAPHICS_RESOLUTION_SPEED
        troubleshoot = (
            app_name.strip()
            and _user_asks_deck_troubleshooting_or_compat_line(question)
            and not ollama_q
        )
        troubleshoot_compat = _user_asks_deck_troubleshooting_or_compat_line(question) and not ollama_q
        power_topic = user_wants_power_or_performance_topic(question)
        read_tdp = is_current_tdp_read_intent(question)
        middle = (
            (OLLAMA_BONSAI_SETUP_LINE if ollama_q else "")
            + (MODEL_POLICY_TIERS_LINE if model_policy_q else "")
            + (SWEET_SPOT_QAM_LINE if sweet else "")
            + gfx
            + (DECK_TROUBLESHOOT_GAME_SETTINGS_LINE if troubleshoot else "")
        )
        if ollama_q:
            tail = HARDWARE_APPENDIX_SKIPPED_FOR_OLLAMA_TOPIC
        elif troubleshoot_compat and not power_topic and not sweet and not read_tdp:
            tail = HARDWARE_APPENDIX_SKIPPED_FOR_TROUBLESHOOT
        elif power_topic or sweet or read_tdp:
            tail = hardware_tdp_appendix
        else:
            tail = hardware_tdp_appendix
        verbosity_block = build_reply_verbosity_block(
            reply_verbosity,
            question=question,
            ask_mode=ask_mode,
            character_roleplay_on=character_roleplay_on,
        )
        language_block = build_reply_language_block(reply_language)
        if strategy_domain and ask_mode != "strategy":
            middle += _strategy_spoiler_constitution_compact_block(
                strategy_spoiler_consent,
                asked_entity=strategy_spoiler_asked_entity,
                kb_entity_match=strategy_spoiler_kb_entity_match,
                app_id=app_id,
                app_name=app_name,
            )
        return _assemble(
            dynamic_block + general_block + drg_glossary_block,
            middle + language_block + verbosity_block,
            tail,
        )

    ollama_q = user_asks_ollama_bonsai_host_or_latency(question)
    model_policy_q = _user_asks_model_policy_tiers_explainer(question)
    power_topic = user_wants_power_or_performance_topic(question)
    followup = is_strategy_followup_question(question)
    spoiler_policy = _strategy_spoiler_policy_block(
        strategy_spoiler_consent,
        followup,
        asked_entity=strategy_spoiler_asked_entity,
        kb_entity_match=strategy_spoiler_kb_entity_match,
        app_id=app_id,
        app_name=app_name,
    )
    if followup:
        strategy_block = (
            "\n\nSTRATEGY GUIDE MODE (active — follow-up turn):\n"
            f"{spoiler_policy}"
            "The user's message begins with the plugin's branch selection prefix. They already chose where they are stuck.\n"
            "Give direct, controller-first coaching for that exact beat on a Steam Deck (gamepad; short steps; pause-friendly; no PC keyboard assumptions).\n"
            "Do NOT output a ```bonsai-strategy-branches block on this turn.\n"
            "After coaching prose, emit exactly one ```bonsai-strategy-checklist fenced block with valid JSON "
            "(2–8 short actionable steps; each item needs \"id\" and \"label\") placed **before** the cheat section below. "
            "Use this exact opening fence line (no language tag on the fence name):\n"
            "```bonsai-strategy-checklist\n"
            '{"title":"…","items":[{"id":"1","label":"…"},{"id":"2","label":"…"}]}\n'
            "```\n"
            "The visible coaching text above the checklist should already explain the steps; the JSON title must match that beat.\n"
            f"{format_strategy_checklist_state_block(strategy_checklist_state)}"
            "End your reply with a clearly marked section using this exact markdown heading on its own line:\n"
            "**If you want to cheat…**\n"
            "Under it, give 2–5 CONCRETE solo-player examples (name the glitch, skip, or trick; say roughly how to do it in "
            "short steps). Assume the game may be running through **Steam on Steam Deck** and/or **emulation** (save "
            "states, rewind, fast-forward, practice tools) where that fits—mention Steam Input remaps or emulator menus "
            "when relevant. Do not hand-wave with 'look up cheats online'; each bullet must be actionable. "
            "Do not encourage cheating in multiplayer, competitive, or anti-cheat contexts; no piracy or illegal ROM talk.\n"
            "The **If you want to cheat…** heading and its bullets must be the last characters of your reply — nothing after them.\n"
        )
    else:
        strategy_block = (
            "\n\nSTRATEGY GUIDE MODE (active — first turn):\n"
            f"{spoiler_policy}"
            "You are a patient coach for someone playing on a Steam Deck (assume gamepad). Use plain spoken language; short steps; avoid jargon unless you explain it.\n"
            "Infer game title and rough progress from the user's text and any screenshots; state uncertainty honestly.\n"
            # Tactics first, not orientation first. Measured 2026-09-07 on the 61-question answer
            # set, three runs each, both shapes on the same build with the same checks: facts kept
            # 76.6% -> 79.5%, spoilers hidden when due 77.8% -> 88.9%, a whole question clean on
            # all three runs 60.7% -> 67.2%, and the reply twelve words shorter (103 -> 91) at the
            # same speed. The one thing that got worse was contradictions, 94.4% -> 90.7%, and
            # that is one extra question rather than a spread: both failures are the Pikmin 2 day
            # limit, the topic the model already gets wrong on this build. Maintainer's call, made
            # on those numbers. Plan 48 section 7 carries the full table.
            "Lead with the note's tactics in plain text first — skip the orientation — then you MUST end the reply with exactly one fenced block so the UI can show choices. "
            "Do not trail off into unrelated topics before the fence; the branch picker is mandatory on this turn.\n"
            "Use this exact opening fence line (no language tag on the fence name) and valid JSON only inside it (2–8 options, each with \"id\" and short \"label\" the player understands):\n"
            "```bonsai-strategy-branches\n"
            '{"question":"Where are you at in Half-Life 2?","options":['
            '{"id":"a","label":"Just arrived at the train station"},'
            '{"id":"b","label":"Fighting through Ravenholm"}]}\n'
            "```\n"
            "The example above shows the shape only — replace the game title, the question, and both "
            "option labels with ones that fit the current game and conversation; never copy the example's "
            "wording into your reply.\n"
            "Do not use a literal [bonsai-strategy-branches] line or parenthesized / URL-encoded JSON instead of this fence; "
            "the Deck UI reads the fenced block.\n"
            "The visible part above the fence should already ask the same branching question in natural language; the JSON question string must match that intent.\n"
            "The closing ``` of that fence must be the last characters of your reply — no prose, headings, or extra fences after it.\n"
            "Do NOT repeat this branching fence when the user later sends a message starting with [Strategy follow-up].\n"
        )

    if followup:
        if power_topic:
            strategy_tdp_prose = ""
        else:
            strategy_tdp_prose = (
                "\n\nDECK POWER / TDP (strategy follow-up): The branch message is gameplay-focused. "
                "Unless the user explicitly asks about FPS, TDP, watts, GPU MHz, battery drain, or thermal tuning in this message, "
                "do not discuss Deck power limits at length and do not output the ```json TDP recommendation block.\n"
            )
    else:
        if power_topic:
            strategy_tdp_prose = ""
        else:
            strategy_tdp_prose = (
                "\n\nDECK POWER / TDP (strategy first turn): The user did not ask about performance, FPS, TDP, watts, "
                "GPU clock, battery tuning, or thermal limits. Do not open with hardware or power talk. "
                "Do not output the ```json TDP/GPU recommendation block on this reply. Focus on gameplay coaching and the branch fence.\n"
            )

    middle = strategy_block + strategy_tdp_prose
    if ask_mode == "strategy" and not followup:
        progress_block = format_strategy_checklist_state_block(strategy_checklist_state)
        if progress_block:
            middle += progress_block

    if ask_mode == "strategy" and _user_asks_resolution_relevant_performance(question):
        middle += GRAPHICS_RESOLUTION_STRATEGY
    if _user_asks_sweet_spot_tuning(question):
        middle += SWEET_SPOT_QAM_LINE
    if app_name.strip() and _user_asks_deck_troubleshooting_or_compat_line(question) and not ollama_q:
        middle += DECK_TROUBLESHOOT_GAME_SETTINGS_LINE
    if ollama_q:
        middle += OLLAMA_BONSAI_SETUP_LINE
    if model_policy_q:
        middle += MODEL_POLICY_TIERS_LINE
    if ask_mode == "speed":
        middle += (
            "\n\nACCURACY (Speed mode): Prefer verifiable, conservative claims. "
            "If you are unsure about a fact, version number, store policy, or game-specific detail, say so briefly "
            "instead of inventing specifics. For hardware or OS claims, stick to what the system message already states.\n"
        )

    tail = ""
    if followup and power_topic:
        tail = "\n\n" + hardware_tdp_appendix
    elif not followup and power_topic:
        tail = (
            "\n\nTDP JSON ON THIS FIRST STRATEGY TURN: The user asked about performance or power. "
            "If you recommend TDP/GPU changes, output the required ```json ... ``` block on its own lines immediately above "
            "the opening ```bonsai-strategy-branches line. The branch fence remains last; no characters after its closing ```.\n\n"
        )
        tail += hardware_tdp_appendix

    verbosity_block = build_reply_verbosity_block(
        reply_verbosity,
        question=question,
        ask_mode=ask_mode,
        character_roleplay_on=character_roleplay_on,
    )
    language_block = build_reply_language_block(reply_language)
    return _assemble(
        dynamic_block + general_block + drg_glossary_block,
        middle + language_block + verbosity_block,
        tail,
    )


def format_ai_response(
    text: str,
    normalized_attachments: list,
    prepared_images: list,
    attachment_errors: list,
) -> str:
    """Append attachment debug/error suffixes so response context is preserved for UI rendering."""
    response_text = text or "No response text."
    if normalized_attachments:
        response_text += (
            "\n\n[AttachDebug: "
            f"requested={len(normalized_attachments)}, "
            f"prepared={len(prepared_images)}, "
            f"errors={len(attachment_errors)}]"
        )
    if attachment_errors:
        response_text += "\n\n[Attachment errors: " + "; ".join(attachment_errors) + "]"
    return response_text


_REPLY_FOLLOWUP_CHIP_LABELS = {
    "bad_information": "Bad information",
    "too_long": "Too long",
    "too_short": "Too short",
    "misidentified_game": "Misidentified game/problem",
    "unfenced_spoiler": "Unfenced spoiler",
}


def sanitize_reply_followup(raw: Any) -> Optional[dict]:
    """Normalize optional reply-follow-up payload from the Ask RPC dict."""
    if not isinstance(raw, dict):
        return None
    chip_id = str(raw.get("chip_id", "") or "").strip().lower()
    if chip_id not in _REPLY_FOLLOWUP_CHIP_LABELS:
        return None
    parent_question = str(raw.get("parent_question", "") or "").strip()
    parent_answer = str(raw.get("parent_answer", "") or "").strip()
    if not parent_question or not parent_answer:
        return None
    preferred_model = str(raw.get("preferred_model", "") or "").strip() or None
    return {
        "chip_id": chip_id,
        "parent_question": parent_question,
        "parent_answer": parent_answer,
        "preferred_model": preferred_model,
    }


# Decision D46 (2026-09-01): the parent answer is pasted into the follow-up message, and a
# Strategy reply can run to 1,600 tokens on its own. Against the Deck's 4,096-token window that
# paste plus the system prompt plus the new reply budget did not fit, and Ollama drops the start
# of the prompt silently. 1,500 characters (~400 tokens) keeps the orientation and the first
# tactics, which is what a refinement chip refers back to.
REPLY_FOLLOWUP_PARENT_ANSWER_MAX_CHARS = 1500
_REPLY_FOLLOWUP_TRIM_MARK = " […earlier answer trimmed to fit the model's window]"


def build_reply_followup_context_block(chip_id: str, parent_question: str, parent_answer: str) -> str:
    """Inject prior turn Q+A before the user's refinement message."""
    label = _REPLY_FOLLOWUP_CHIP_LABELS.get(chip_id, "Follow-up")
    pq = (parent_question or "").strip()
    pa = (parent_answer or "").strip()
    if len(pa) > REPLY_FOLLOWUP_PARENT_ANSWER_MAX_CHARS:
        pa = pa[:REPLY_FOLLOWUP_PARENT_ANSWER_MAX_CHARS].rstrip() + _REPLY_FOLLOWUP_TRIM_MARK
    return (
        "REPLY FOLLOW-UP CONTEXT\n"
        f"The user is refining their previous Ask ({label}).\n"
        f"Previous question:\n{pq}\n\n"
        f"Previous answer:\n{pa}\n\n"
        "Address the refinement request in the user's new message below.\n"
        "---\n"
    )

