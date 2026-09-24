"""Title: Working out which boss or enemy the player named

Purpose: Before the game can decide how much of a spoiler policy to relax, it needs to
know whether the player actually named a specific boss, enemy, or other entity by name --
"how do I beat the Tank" names one; "how do I get past this part" does not. This file pulls
that name out of the question, preferring a title the knowledge base already knows about
over guessing from phrasing, and also checks whether an attached knowledge-base block
already covers the entity that was asked about.

Used for: Called from ollama_prompts.build_system_prompt's callers (game_ai_request.py
passes the result in as ``strategy_spoiler_asked_entity``) and from spoiler_risk_service,
so the same question is read the same way everywhere a spoiler decision depends on it.

Solves: Getting this wrong is not symmetric. An empty result over-fences a player who did
name the thing; a *wrong* result un-fences content they never asked about. Every check in
this file is written to reject a doubtful capture rather than return one, and a shortened
form -- "twins" for "Dreadnought Twins" -- still finds the corpus's full title.

Does not: Decide the actual spoiler wording or policy text for the turn -- that is
ollama_prompts._strategy_spoiler_policy_block and friends, which take this file's result
as an input.
"""

import re

from backend.services.strategy_guide_parse import STRATEGY_FOLLOWUP_PREFIX

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
