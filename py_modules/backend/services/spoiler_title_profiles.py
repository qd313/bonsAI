"""Title: Deciding which games get extra spoiler caution, game by game

Purpose: Very different games get asked about in the Ask box. Some, like Deep
Rock Galactic or DOOM Eternal, barely have "spoilers" in the way most people
mean it -- knowing a boss's attack pattern is not really ruining anything.
Others, like Baldur's Gate 3 or a Zelda game, are built around discovering a
story, and telling someone how it ends is exactly the kind of thing this
plugin tries to avoid doing by accident. This file is a fixed, hand-kept
list that sorts known games into those two groups: by Steam's own game ID
where a game has one, and by name where it does not -- an emulated game
launched through a Steam shortcut has no Steam game ID at all.
Used for: deciding, before a reply is even written, how cautious the AI's
instructions and the spoiler-risk guess (see spoiler_risk_service) should be
for the specific game being asked about. The same two lists are kept in step
with the settings screen's own copy (src/data/spoilerTitleProfiles.ts), so a
game is treated the same in both places.
Solves: without a per-game list, every game would get the same one-size-
fits-all level of caution -- either annoyingly over-careful about games that
do not need it, or not careful enough about games that do.
Does not: hide or change any part of a reply itself -- this file only
answers "how careful should we be about this game," never the hiding.
Unlisted games are not guessed at either: an unrecognized game reports
"unknown" and falls back to the plugin's regular, game-blind spoiler rules
elsewhere.

Gotchas:
 - A known mistake elsewhere in the project is worth knowing here: the Steam
   game ID recorded for Ocarina of Time in the separate knowledge-base seed
   data is actually Stardew Valley's ID. This file's name-matching list for
   game titles is deliberately its own table, not built from the game-ID
   lists above it, specifically so it can never inherit that mistake.
 - When a game matches both lists (unusual, but possible for a title that is
   only in the name lists), the cautious answer wins -- being too careful
   about a game that did not need it is a smaller cost than not being
   careful enough about one that did.
"""

from __future__ import annotations

import re
from typing import Any, Literal

from backend.services.strategy_guide_parse import is_strategy_followup_question

SpoilerTitleProfile = Literal["low_narrative", "protect_progression", "unknown"]

# Low narrative: routine boss/tactics rarely spoil progressive story secrets.
LOW_NARRATIVE_APP_IDS = frozenset(
    {
        "2321470",  # Deep Rock Galactic: Survivor
        "550",  # Left 4 Dead 2
        "1222670",  # The Sims 4
        # 2026-09-05 tranche (D69): a campaign with named bosses, but nothing that reads as
        # a reveal -- the demons and their weak points are the whole conversation.
        "782330",  # DOOM Eternal
        # Plan 70 helper F (2026-09-26): wave-survival with no story at all -- the wave-20
        # bosses are just tough fights, nothing to spoil.
        "1942280",  # Brotato
    }
)

# Protect progression: story/campaign titles stay conservative unless the user names the entity.
PROTECT_PROGRESSION_APP_IDS = frozenset(
    {
        "1086940",  # Baldur's Gate 3
        "377160",  # Fallout 4
        "1145360",  # Hades
        "1091500",  # Cyberpunk 2077
        "1547000",  # GTA: San Andreas — The Definitive Edition
        "1174180",  # Red Dead Redemption 2
        "220",  # Half-Life 2
        # Portal 2 is the first title the two-profile split does not really fit: chamber
        # solutions spoil nothing, but the story is built on a late reveal. Protect, because
        # the cost of being wrong is asymmetric — over-fencing a puzzle hint annoys, and
        # under-fencing the ending cannot be taken back. Section type carries the rest.
        "620",  # Portal 2
        # 2026-09-05 tranche (D69). Black Mesa is Half-Life's story retold; Hollow Knight is
        # built on discovery; the GTA and Fallout entries are mission-driven like their
        # siblings above. GTA V has two Steam builds, both listed so either resolves.
        "362890",  # Black Mesa
        "367520",  # Hollow Knight
        "3240220",  # Grand Theft Auto V Enhanced
        "271590",  # Grand Theft Auto V Legacy
        "12210",  # Grand Theft Auto IV: The Complete Edition
        "22380",  # Fallout: New Vegas
        # Plan 70 helper F (2026-09-26): the Tower fights are against named Faction Leaders
        # who gate real story progression (one is a hard prerequisite for the Breeding Farm),
        # the same shape as the boss identities already protected above.
        "1623730",  # Palworld
        # Plan 70 helper G: the main quest is a discovered story built around Alduin's
        # return, so this stays conservative like its story-driven shelf-mates above.
        "489830",  # The Elder Scrolls V: Skyrim Special Edition
    }
)


# Same two profiles, reachable by title name. **Required by D19:** a title recognised from the
# question text has no AppID to look up -- "what is the best way to beat volvagia in oot" with
# nothing running resolved to Ocarina of Time and then fenced as `unknown`, which is the one
# outcome D19 ruled out.
#
# Substring match on a normalised title, so the corpus's canonical form ("The Legend of Zelda:
# Ocarina of Time") and a user's shorthand both land. Kept as a separate table from the AppID
# sets rather than derived from them: the AppID for Ocarina in the seed is **Stardew Valley's**
# (a known open bug), so deriving names from IDs would inherit that error and spread it.
_LOW_NARRATIVE_TITLES = (
    "state of emergency",
    "deep rock galactic",
    "left 4 dead 2",
    "the sims 4",
    # 2026-09-05 tranche (D69). The emulated titles are Steam shortcuts with no AppID, so the
    # name is the only handle; "smash bros" covers both the N64 game and Melee.
    "doom eternal",
    "doom 64",
    "super mario 64",
    "mario kart 64",
    "smash bros",
    "pikmin 2",
    # 2026-09-18: the five Mario Party emulated shortcuts (58 phase 1). Party rounds and
    # minigames are not a discovered story, so "mario party" covers all five by substring.
    "mario party",
    # 58 phase 1 lane G (2026-09-18): three more emulated N64 shortcuts with no AppID, all
    # light on plot the way their shelf-mates above are.
    "donkey kong 64",
    "yoshi's story",
    "diddy kong racing",
)

_PROTECT_PROGRESSION_TITLES = (
    "ocarina of time",
    "ship of harkinian",
    "baldur's gate 3",
    "baldurs gate 3",
    "fallout 4",
    "hades",
    "cyberpunk 2077",
    "san andreas",
    "red dead redemption 2",
    "half-life 2",
    "half life 2",
    "portal 2",
    # 2026-09-05 tranche (D69). "gta v" also catches Vice City, which protecting is the
    # right side to err on; Paper Mario is a chapter story, unlike its N64 shelf-mates.
    "black mesa",
    "hollow knight",
    "grand theft auto v",
    "grand theft auto iv",
    "gta v",
    "gta iv",
    "gta 5",
    "gta 4",
    "paper mario",
    "thousand-year door",
    "new vegas",
    # 58 phase 1 lane G (2026-09-18): GTA III - The Definitive Edition has a Steam AppID,
    # but this title-name fallback is added to match its siblings above (San Andreas, IV, V),
    # which all carry both an AppID entry and a name entry.
    "grand theft auto iii",
    "gta iii",
    # Plan 70 helper F (2026-09-26): the maintainer's own copy runs from a non-Steam shortcut
    # named "Palworld" with no real Steam AppID, so the name is the only handle, like the
    # emulated titles above.
    "palworld",
    # Plan 70 helper G: Skyrim has a Steam AppID too; the name matches its story-driven
    # siblings above, which carry both an AppID entry and a name entry.
    "skyrim",
)


def _normalize_title(name: str) -> str:
    return " ".join((name or "").strip().lower().split())


def resolve_title_spoiler_profile(app_id: str = "", app_name: str = "") -> SpoilerTitleProfile:
    """Return built-in profile for AppID or, when absent, a title-name fallback (e.g. SoE)."""
    aid = str(app_id or "").strip()
    if aid in LOW_NARRATIVE_APP_IDS:
        return "low_narrative"
    if aid in PROTECT_PROGRESSION_APP_IDS:
        return "protect_progression"
    title = _normalize_title(app_name)
    if not title:
        return "unknown"
    # Protect first: when a title matches both tables the conservative answer wins, because
    # over-fencing annoys and under-fencing cannot be taken back.
    if any(known in title for known in _PROTECT_PROGRESSION_TITLES):
        return "protect_progression"
    if any(known in title for known in _LOW_NARRATIVE_TITLES):
        return "low_narrative"
    return "unknown"


def title_profile_is_low_narrative(app_id: str = "", app_name: str = "") -> bool:
    return resolve_title_spoiler_profile(app_id, app_name) == "low_narrative"


def protected_title_named_in_question(question: str) -> str:
    """The story game from the protect table that the question names, or "" when it names none.

    Whole-word match on the same names the title fallback uses, so "hades" fires on "beat
    hades" and not on "shades of blue". Several can match ("gta v" inside "grand theft auto
    v"): the longest wins, so the name that comes back is the fullest one the player typed.
    Plan 77 helper J; returns the name rather than a yes/no since plan 78 helper A, so a log
    line can say which game was named.
    """
    text = _normalize_title(question)
    if not text:
        return ""
    named = [
        known
        for known in _PROTECT_PROGRESSION_TITLES
        if re.search(rf"(?<![a-z0-9]){re.escape(known)}(?![a-z0-9])", text)
    ]
    return max(named, key=len) if named else ""


def question_names_protected_title(question: str) -> bool:
    """True when the question text itself names a story game from the protect table."""
    return bool(protected_title_named_in_question(question))


def story_game_named_over_running_no_story_game(
    app_id: str = "", app_name: str = "", question: str = ""
) -> str:
    """The story game this turn's notes should come from, or "" when the running game keeps them.

    Plan 78 helper A, the maintainer's call D121 item 1 (an exception to D19's "the running game
    picks the notes"): when the game running is a no-story game (the Deep Rock Galactic kind)
    AND the question names, in full, a game from the short protected story list, the named game
    picks the notes for that one turn. Judging the turn by the named game's spoiler profile was
    not enough (plan 77, helper J, first try): the spoiler covers come from the attached notes,
    which name the bosses to hide, and the running game's notes name none of Hollow Knight's.

    Returns the protected name as the table spells it (``"hollow knight"``), which is also
    the line the back end logs. ``""`` -- nothing changes -- when nothing is running, when the
    running game is a story game or unknown (they keep the notes), or when the question names
    no protected story game. Only for that one turn: a later bare follow-up names no game, so it
    returns "" and goes back to the running game.
    """
    if resolve_title_spoiler_profile(app_id, app_name) != "low_narrative":
        return ""
    return protected_title_named_in_question(question)


def resolve_turn_title_spoiler_profile(
    app_id: str = "", app_name: str = "", question: str = ""
) -> SpoilerTitleProfile:
    """The profile one turn is judged by: the game's own, unless a no-story game is running
    and the question itself names a story game.

    Plan 77 helper J (seen on the Deck 2026-09-30): with Deep Rock Galactic: Survivor running,
    a Hollow Knight boss question came back with no covers, because the running game's
    "no story" profile decided the whole turn. The running game still picks which notes are
    attached; it must not decide what a *different* game's spoiler is worth. Only ever moves
    toward more caution -- a story game running with a no-story game named stays protected,
    and an unknown game is already conservative.
    """
    profile = resolve_title_spoiler_profile(app_id, app_name)
    if profile == "low_narrative" and question_names_protected_title(question):
        return "protect_progression"
    return profile


def questions_the_answer_above_answered(
    question: str, reply_followup: Any = None, chat_turns: Any = None
) -> list[str]:
    """The earlier question(s) a button or chip pressed under an answer belongs to, newest first.

    Plan 79 helper AE (D122 item 9). A choice button ("I'm at: ...") and a refine chip are sent as
    new questions that name no game, but they belong to the answer above them, and that answer's
    game must stay with them. Two things tell the back end which question that was:

    - A refine chip sends ``reply_followup`` with the parent question, exactly.
    - A choice button sends text starting with ``[Strategy follow-up]``. The screen also quotes
      "Earlier I asked: ..." into it, but only from a memory that is empty after a plugin reload
      or a reopened chat, so the saved chat is read too: the user turns before the live one,
      newest first, stepping back over earlier button presses until a typed question is reached.

    A plain typed question returns ``[]``: it goes to the running game (plan 78 question 1).
    """
    found: list[str] = []
    if isinstance(reply_followup, dict):
        parent = str(reply_followup.get("parent_question") or "").strip()
        if parent:
            found.append(parent)
    if not (is_strategy_followup_question(question) or (found and is_strategy_followup_question(found[-1]))):
        return found
    turns = [t for t in chat_turns if isinstance(t, dict)] if isinstance(chat_turns, list) else []
    if turns and str(turns[-1].get("role") or "") == "user":
        turns = turns[:-1]  # the live question is saved into the chat before it runs
    for turn in reversed(turns):
        text = str(turn.get("text") or "").strip()
        if str(turn.get("role") or "") != "user" or not text:
            continue
        found.append(text)
        if not is_strategy_followup_question(text):
            break
    return found


def set_aside_running_game_for_named_story_game(
    app_id: str, app_name: str, question: str, log: Any, earlier_questions: Any = ()
) -> tuple[str, str, str, str]:
    """``(app_id, app_name, named_story_game, title_text)`` for one turn: the running game's own
    id and name, or blanks plus the named game when the exception in
    ``story_game_named_over_running_no_story_game`` fires.

    Blank id and name make the rest of the ask treat the turn exactly as the same question with
    nothing running (D19): the title the question names is looked up in the library, its notes
    are attached, its covers and choice menu apply, and the follow-up memory keys the turn by
    that title, not the running game. Writes the one log line the Deck check reads when it fires.

    ``title_text`` is the text that names the game, which the title lookup must read: the
    question itself, or (plan 79 helper AE) the earlier question a button or chip pressed under
    an answer belongs to, when only that one names the game. ``earlier_questions`` comes from
    ``questions_the_answer_above_answered``; the question itself always wins.
    """
    named = story_game_named_over_running_no_story_game(app_id, app_name, question)
    title_text, carried = question, False
    if not named:
        for earlier in earlier_questions or ():
            named = story_game_named_over_running_no_story_game(app_id, app_name, earlier)
            if named:
                title_text, carried = earlier, True
                break
    if not named:
        return app_id, app_name, "", question
    log.info(
        "spoiler: named story game picks the notes this turn (running no-story game %r appid=%s, "
        "%s names %r) -- notes, covers and menu follow the named game",
        app_name,
        app_id,
        "the answer above, whose question" if carried else "question",
        named,
    )
    return "", "", named, title_text
