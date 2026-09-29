"""Title: Does the question name some other game the library does not know

Purpose: Tell a question that names a well-known game the notes library has nothing on (Valheim,
Elden Ring, Minecraft ...) apart from a bare follow-up that names no game at all. The
knowledge-base search falls back on the chat's own game when a question names nothing; that
fallback is right for "what about the fourth one" and wrong for "any tips for the early nights
in Valheim" asked in a Half-Life 2 chat, which used to get Half-Life 2's notes.
Used for: game_ai_request.py, asked only once nothing is running and the library's own title
match found nothing, right before it would fall back on the chat's own game.
Solves: A question about a different game, one the library has no notes on, was answered with
the chat's own game's notes attached. Deck pass 1 of plan 74 saw a Valheim question in a
Half-Life 2 chat do exactly that.
Does not: Search the library, guess at names it has not been told, or handle a game the
library knows -- the library's own alias match wins before this is asked. The list is a
deliberate short set of well-known titles, not every game on Steam; a title outside it behaves
as it did before (the chat's own game is used). Words that are also everyday words (Rust, Ark,
Control, Inside, Raft) are left out on purpose, because a false match would drop good notes.
"""

from __future__ import annotations

import re

from backend.services.knowledge_base_schema import normalize_alias

# Titles are written the way a person types them; both "baldur's gate" and "baldurs gate" are
# listed because normalising drops the apostrophe into a space ("baldur s gate").
_WELL_KNOWN_OTHER_GAMES = (
    "valheim", "minecraft", "terraria", "stardew valley", "elden ring", "dark souls",
    "dark souls 2", "dark souls 3", "demon's souls", "demons souls", "bloodborne", "sekiro",
    "lies of p", "the witcher 3", "witcher 3", "baldur's gate 3", "baldurs gate 3",
    "baldur's gate", "baldurs gate", "hogwarts legacy", "starfield", "civilization vi",
    "civilization 6", "stellaris", "factorio", "satisfactory", "subnautica", "no man's sky",
    "no mans sky", "dota 2", "counter strike", "counter-strike 2", "cs2", "apex legends",
    "fortnite", "rocket league", "overwatch", "destiny 2", "halo infinite", "halo reach",
    "master chief collection", "persona 5", "persona 4", "monster hunter world",
    "monster hunter rise", "monster hunter wilds", "god of war", "horizon zero dawn",
    "horizon forbidden west", "grand theft auto", "gta v", "gta 5",
    "gta iv", "cuphead", "slay the spire", "vampire survivors",
    "risk of rain 2", "lethal company", "phasmophobia", "fall guys",
    "helldivers 2", "warframe", "path of exile", "diablo 4", "diablo iv", "diablo 3",
    "world of warcraft", "final fantasy xiv", "final fantasy 7", "final fantasy vii",
    "dragon age", "the sims", "cities skylines", "rimworld",
    "oxygen not included", "kerbal space program", "disco elysium", "undertale", "deltarune",
    "outer wilds", "sifu", "returnal", "ghost of tsushima", "death stranding",
    "resident evil", "silent hill", "metal gear solid", "street fighter 6", "tekken 8",
    "mortal kombat", "super mario", "breath of the wild", "tears of the kingdom",
    "pokemon", "animal crossing", "splatoon", "super smash bros", "metroid", "like a dragon",
    "yakuza", "nier automata", "bayonetta", "forza horizon",
    "assassin's creed", "assassins creed", "borderlands", "bioshock",
    "team fortress 2", "garry's mod", "garrys mod", "half-life alyx", "euro truck simulator",
    "farming simulator", "project zomboid", "7 days to die", "sons of the forest",
    "green hell", "don't starve", "dont starve", "binding of isaac", "enter the gungeon",
    "noita", "balatro", "black myth wukong", "lost ark", "escape from tarkov",
    "hunt showdown", "rainbow six siege", "pubg", "call of duty", "battlefield 2042",
    "battlefield 4", "roblox", "genshin impact", "honkai star rail", "hearthstone",
    "league of legends", "valorant", "chrono trigger", "earthbound", "sonic frontiers",
    "sonic mania", "sonic the hedgehog", "crash bandicoot", "spyro", "shovel knight",
    "hotline miami", "spelunky", "dave the diver", "octopath traveler",
    "fire emblem", "xenoblade", "dragon quest", "kingdom hearts", "age of empires",
    "xcom", "crusader kings", "hearts of iron", "europa universalis",
    "divinity original sin", "pillars of eternity", "alan wake",
    "metro exodus", "ori and the blind forest", "blasphemous", "hi-fi rush",
    "monster train",
)


def _build_pattern() -> "re.Pattern[str]":
    names = sorted({normalize_alias(n) for n in _WELL_KNOWN_OTHER_GAMES}, key=len, reverse=True)
    return re.compile(r"(?<!\w)(" + "|".join(re.escape(n) for n in names if n) + r")(?!\w)")


_PATTERN = _build_pattern()


def other_game_named_in(question: str) -> str:
    """The normalised title of a well-known game the question names, or "" when it names none.

    Longest title wins ("dark souls 3" over "dark souls"), on whole words only.
    """
    text = normalize_alias(question)
    if not text:
        return ""
    match = _PATTERN.search(text)
    return match.group(1) if match else ""


def other_game_besides(question: str, own_title: str) -> str:
    """The other well-known game the question names, or "" when it names none or names the
    chat's own game (however the chat spells it -- the same game is not "another game")."""
    other = other_game_named_in(question)
    own = normalize_alias(own_title)
    if not other or not own or other in own or own in other:
        return ""
    return other
