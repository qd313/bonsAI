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

from typing import Literal

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
