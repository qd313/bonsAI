"""
Title: Deciding whether a question is a troubleshooting question at all

Purpose: The plugin keeps a set of troubleshooting tips -- for things like Proton, a
controller not pairing, a stuck update -- separate from its game-strategy notes. Before it
will search that tip sheet, it has to decide whether the question sounds like a
troubleshooting question in the first place. This file makes that call by matching the
question's wording against a list of known problem topics.
Used for: The one moment, in the knowledge-base search code, that decides whether to
search the troubleshooting tips at all for this question.
Solves: The check this file replaced only recognised a question as troubleshooting if it
literally contained the word "deck" or "proton". Most of the tip sheet's topics -- stick
drift, a stuck download, no sound -- have nothing to do with either word, so 24 of the tip
sheet's 27 topics could never be reached by anything a real person would type.
Does not: Change how the question is phrased to the AI, whether a Proton log gets
attached, what the reply is tagged with, or the message about permissions shown on
screen. All four of those keep the older, narrower word check they were already using.

Locked as decision D16 (2026-08-06). See docs/archive/rag-pr2-signoff.md.

Why this is its own separate check rather than widening the older one
(``question_matches_troubleshooting_log_context``, which several other things already
depend on): widening that one would also start attaching Proton logs, changing how the
question is framed to the AI, changing what the reply is tagged with, and changing the
on-screen permission message -- four side effects nobody asked for, to fix one thing. This
file only adds a new way to decide "search the tips or not"; nothing else reads it.

**Missing a real match matters more than one false alarm.** If this file fails to
recognise a genuine troubleshooting question, the person gets no tip and no sign one ever
existed. If it wrongly guesses a strategy question is troubleshooting, the search still
has to find something that actually matches closely enough, so nothing is attached anyway
-- it just costs one extra, invisible search. That is why the rules below lean toward
catching more questions rather than being precise about it.

How the weaker topics are told apart from the confident ones:

    does the question match ANY topic's word list?  -- no --> not troubleshooting
                 |
                yes
                 v
    is EVERY matching topic one of the three weak ones
    ("deck", "linux", "crash" -- words that show up in
    ordinary strategy questions too)?                -- no --> troubleshooting
                 |
                yes
                 v
    is a game currently running, or named
    in the question?                                 -- yes --> not troubleshooting
                 |                                              (too likely to be a
                 no                                              strategy question)
                 v
    is the matching topic "crash" or "linux"?         -- yes --> troubleshooting
                 |                                              (with nothing running,
                 no                                              these two stop being
                 v                                               ambiguous)
        not troubleshooting
        ("deck" alone never routes, even with
        nothing running -- "how do I beat the
        boss on my deck" is still a real
        strategy question)
"""

from __future__ import annotations

import re

# topic -> rules. Each rule is a tuple of terms that must **all** appear; any rule matching
# claims the topic. Single-term rules are reserved for words that mean nothing else in a
# gaming question ("gamescope", "steamvr"); everything ambiguous needs a second term, so
# "my controller" alone does not route a strategy question into troubleshooting.
#
# Rules were written from the corpus's own topic list plus the `tune` compat intents in
# tests/fixtures/kb_eval_v2.json. The `holdout` intents were not read while writing them --
# they are the blind check, and the misses are recorded rather than patched away.
_TOPIC_RULES: dict[str, tuple[tuple[str, ...], ...]] = {
    "proton": (
        ("proton",),
        ("compatibility layer",),
        ("compat layer",),
        ("windows game", "linux"),
        ("windows game", "closes"),
        ("windows game", "shuts"),
        ("windows game", "crash"),
        ("windows title", "black"),
    ),
    "wine": (
        ("wine",),
        ("prefix",),
        ("compatdata",),
        ("compatibility files",),
    ),
    "shader": (
        ("shader",),
        ("processing", "launch"),
        ("pre-caching",),
        ("precaching",),
    ),
    "anticheat": (
        ("anti-cheat",),
        ("anticheat",),
        ("anti cheat",),
        ("easy anti",),
        ("battleye",),
        ("multiplayer", "blocked"),
        ("online", "kicks"),
        ("online", "kicked"),
    ),
    "gamescope": (
        ("gamescope",),
        ("fsr",),
        ("upscal",),
        ("scaling", "blurry"),
        ("resolution", "smear"),
        ("resolution", "blurry"),
    ),
    "steam_input": (
        ("steam input",),
        ("controller", "not detected"),
        ("controller", "not working"),
        # "isnt working" catches the contraction spelling. Apostrophe deletion in
        # _normalize turns "isn't working" into "isnt working", which does not contain the
        # literal text "not working" -- the two rules are not the same string.
        ("controller", "isnt working"),
        ("controller", "layout"),
        ("controller", "profile"),
        ("controller", "mapping"),
        ("touchpad",),
        ("back button",),
        ("sticks", "ignore"),
        ("sticks", "ignores"),
    ),
    "gyro": (
        ("gyro",),
        ("motion control",),
        ("tilting",),
        ("tilt", "aim"),
        # No rule for "motion aiming". It reads as gyro, but it is also what Red Dead calls
        # its slow-motion aim, and that strategy question was being routed to the tip sheet.
    ),
    "controller": (
        ("stick drift",),
        ("deadzone",),
        ("dead zone",),
        ("rumble",),
        ("haptic",),
        # "vibrat" is a deliberate stem, same idea as "upscal" in gamescope below -- it
        # reaches "vibrate", "vibrating" and "vibration" without three separate entries.
        # Paired with "controller" because "vibrat" alone is common enough in an ordinary
        # sentence ("the whole room was vibrating") that it needs a second word to mean
        # anything about hardware.
        ("controller", "vibrat"),
        ("controller", "pair"),
        ("controller", "disconnect"),
    ),
    "storage": (
        ("sd card",),
        ("microsd",),
        ("micro sd",),
        ("memory card", "install"),
        ("out of room",),
        ("out of space",),
        ("disk space",),
        ("move", "library"),
        ("storage",),
    ),
    "streaming": (
        ("remote play",),
        ("steam link",),
        ("moonlight",),
        ("sunshine",),
        ("streaming",),
        ("stream", "desktop"),
        ("stream", "pc"),
        ("from my desktop", "wifi"),
    ),
    "network": (
        ("firewall",),
        ("port", "open"),
        ("subnet",),
        ("ip address",),
        ("lan",),
        ("wifi", "cannot see"),
        ("wifi", "cant see"),
        ("wifi", "cant find"),
    ),
    "updates": (
        ("steamos update",),
        ("system update",),
        ("update", "stuck"),
        ("update", "reboot"),
        ("update", "failed"),
        ("same version",),
    ),
    "steamvr": (
        ("steamvr",),
        ("headset",),
        ("vr",),
        ("index",),
    ),
    "emudeck": (
        ("emudeck",),
        ("emulator",),
        ("emulation",),
        ("pcsx2",),
        ("retroarch",),
        ("dolphin",),
        ("playstation 2",),
        ("ps2",),
    ),
    "fex": (
        ("fex",),
        ("x86", "arm"),
        ("translated", "binaries"),
        ("translation layer",),
    ),
    "bpm": (
        ("big picture",),
        ("television", "menus"),
        ("tv mode",),
    ),
    "gaming_mode": (
        ("game mode",),
        ("gaming mode",),
    ),
    "desktop_mode": (
        ("desktop mode",),
    ),
    "audio": (
        ("no sound",),
        ("no audio",),
        ("audio", "output device"),
        ("audio", "crackl"),
        ("headphones", "not"),
    ),
    "display": (
        ("refresh rate",),
        ("tearing",),
        ("vsync",),
        ("v-sync",),
        ("external monitor",),
        ("hdmi",),
        ("picture tears",),
        # "torn" is the word most people reach for instead of "tearing"; it does not share
        # a stem with it so needs its own entry. Paired with "screen" -- "torn" alone shows
        # up in plenty of sentences that have nothing to do with a display.
        ("screen", "torn"),
    ),
    "performance": (
        ("frame limit",),
        ("frame rate", "drop"),
        ("fps", "drop"),
        ("tdp",),
        ("battery", "hour"),
        ("battery", "drain"),
        ("fan", "loud"),
        ("fan", "scream"),
        ("overheat",),
        ("thermal",),
        # "stutter" is the plain word for what "frame rate drop" means in enthusiast terms.
        # Kept single-term: it names a game-performance symptom and nothing else in an
        # ordinary gaming sentence.
        ("stutter",),
        # "slows down" needs "game" alongside it -- a fight or a level "slowing down" is
        # ordinary strategy language, not a performance complaint.
        ("game", "slows down"),
    ),
    "crash": (
        ("crash",),
        ("wont launch",),
        ("closes itself",),
        ("shuts itself",),
        ("black screen",),
    ),
    "deck": (
        ("steam deck",),
        ("deck",),
    ),
    "linux": (
        ("linux",),
        ("steamos",),
        ("arch",),
    ),
    "windows_steam": (
        ("dual boot",),
        ("dual-boot",),
        ("windows steam",),
        ("both operating systems",),
        ("game bar",),
    ),
    "steam_frame": (
        ("steam frame",),
    ),
    "steam_machine": (
        ("steam machine",),
    ),
}

# Topics whose rules are broad enough to fire on ordinary questions. A match on one of these
# alone is not enough to route -- "deck" appears in plenty of strategy asks, and "crash" is a
# thing bosses do to you. They confirm a routing decision another topic already made.
_WEAK_TOPICS = frozenset({"deck", "linux", "crash"})

# Of the weak topics, these two stop being ambiguous the moment there is no game in the
# picture at all -- no game running, and none named in the question. "My game keeps crashing"
# with nothing running has no boss to blame the word on; on a device with no game open, "linux"
# is a platform word, not scenery. "deck" stays weak even then: "how do I beat the boss on my
# deck" is a real strategy question and saying nothing is running does not change that.
_STRONG_WITHOUT_GAME_TOPICS = frozenset({"crash", "linux"})


def _normalize(question: str) -> str:
    """Lowercase, drop apostrophes, punctuation to spaces, collapse runs.

    Apostrophes are **deleted**, not spaced: "won't" has to become "wont" so a rule can be
    written as one word. Spacing it produces "won t", which no readable rule would match --
    a rule written as "won't launch" would then be permanently dead and look fine.
    """
    lowered = str(question or "").lower().replace("'", "").replace("’", "")
    # Keep the hyphen: "anti-cheat" and "dual-boot" are listed with and without it, and
    # flattening it here would make those two rules identical and one of them dead.
    cleaned = re.sub(r"[^a-z0-9\- ]+", " ", lowered)
    return f" {' '.join(cleaned.split())} "


def _term_matches(haystack: str, term: str) -> bool:
    """Match a term at a word boundary, allowing a suffix on its last word.

    Plain substring matching is what made "lan" fire on "plants", "plane" and "island" --
    three strategy questions routed into troubleshooting by a network rule. Requiring a
    boundary at the **start** only keeps the useful half: "upscal" still reaches "upscaling"
    and "smear" reaches "smeared", without inventing matches inside unrelated words.
    """
    return re.search(rf"(?<![a-z0-9]){re.escape(term)}", haystack) is not None


def _rule_matches(haystack: str, rule: tuple[str, ...]) -> bool:
    return all(_term_matches(haystack, term) for term in rule)


def match_compat_corpus_topics(question: str) -> list[str]:
    """Every corpus topic this question plausibly asks about, strongest signal first.

    Returned for diagnosis and eval reporting. Retrieval itself does not filter by topic --
    FTS already searches the whole tip sheet -- so this is about *whether* to search, not
    *what* to search.
    """
    haystack = _normalize(question)
    if not haystack.strip():
        return []
    strong: list[str] = []
    weak: list[str] = []
    for topic, rules in _TOPIC_RULES.items():
        if any(_rule_matches(haystack, rule) for rule in rules):
            (weak if topic in _WEAK_TOPICS else strong).append(topic)
    return strong + weak


def question_targets_compat_corpus(question: str, *, game_in_context: bool = True) -> bool:
    """True when the Ask names a troubleshooting topic the shared compat corpus covers.

    A weak-topic match on its own does not route. "How do I beat the boss on my deck" is a
    strategy question that happens to say "deck"; routing it to the tip sheet would attach
    troubleshooting advice to a boss fight.

    ``game_in_context`` tells the router whether a game is running or was named in the
    question. Defaulted to True so a caller that does not pass it keeps today's behaviour.
    When it is False, "crash" and "linux" are treated as strong enough to route alone --
    "my game keeps crashing" with nothing running is a plain troubleshooting sentence, not a
    boss fight. "deck" stays weak either way; see ``_STRONG_WITHOUT_GAME_TOPICS``.
    """
    weak_topics = _WEAK_TOPICS if game_in_context else (_WEAK_TOPICS - _STRONG_WITHOUT_GAME_TOPICS)
    return any(topic not in weak_topics for topic in match_compat_corpus_topics(question))


def known_compat_topics() -> frozenset[str]:
    """Topics this router can reach. Compared against the corpus in tests to catch drift."""
    return frozenset(_TOPIC_RULES)
