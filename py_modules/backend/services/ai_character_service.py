"""Opt-in character roleplay presets for Ollama system prompt augmentation."""

from __future__ import annotations

import random
import re
from dataclasses import dataclass
from typing import Any

# Easter egg: Pyro uses a talent-manager parody voice; optional per-reply hidden carousel tip.
PYRO_PRESET_ID = "tf2_pyro"
PYRO_MANAGER_TIP_PROBABILITY = 0.30

# Hidden suggestion strings — OSS/repo nudge; not sampled by normal preset carousel.
PYRO_MANAGER_TIP_LINES: tuple[str, ...] = (
    "Run the plugin test suite and report anything flaky",
    "Read CONTRIBUTING and open a small docs PR",
    "Try a local build from source and note rough edges",
    "File an issue with repro steps if something breaks",
    "Smoke-test the Ask flow after updating Ollama tags",
)


@dataclass(frozen=True)
class RoleplayBuildResult:
    """System suffix for roleplay prefix and resolved catalog id (Random or fixed preset)."""

    suffix: str
    resolved_preset_id: str | None

# Keep in sync with src/data/characterCatalog.ts (ids and work titles).
_CHARACTER_ROWS: list[tuple[str, str, str, str]] = [
    # id, work_title, character_label, style_hint (optional short phrase for the model)
    ("cp2077_jackie", "Cyberpunk 2077", "Jackie Welles", "warm Night City fixer cadence"),
    ("rdr2_arthur", "Red Dead Redemption 2", "Arthur Morgan", "gritty outlaw reflectiveness"),
    ("rdr2_dutch", "Red Dead Redemption 2", "Dutch van der Linde", "charismatic leader monologues"),
    ("gta5_michael", "Grand Theft Auto V", "Michael De Santa", "ex-criminal family man sarcasm"),
    ("gta5_trevor", "Grand Theft Auto V", "Trevor Philips", "volatile chaotic energy"),
    ("gta5_lamar", "Grand Theft Auto V", "Lamar Davis", "streetwise blunt humor"),
    ("gta5_lester", "Grand Theft Auto V", "Lester Crest", "dry sarcastic planner tone"),
    ("zelda_zelda", "The Legend of Zelda", "Princess Zelda", "regal concise guidance"),
    ("zelda_navi", "The Legend of Zelda", "Navi", "urgent short interjections as a guide fairy"),
    ("mgs_otacon", "Metal Gear Solid", "Otacon", "anxious codec-style technical support"),
    ("sc_fuu", "Samurai Champloo", "Fuu", "youthful determined traveler voice"),
    ("bg3_shadowheart", "Baldur's Gate 3", "Shadowheart", "guarded Shar-leaning snark"),
    ("bg3_astarion", "Baldur's Gate 3", "Astarion", "arch playful vampire barbs"),
    ("bg3_laezel", "Baldur's Gate 3", "Lae'zel", "direct githyanki bluntness"),
    ("tf2_scout", "Team Fortress 2", "Scout", "fast-talking brash runner"),
    ("tf2_soldier", "Team Fortress 2", "Soldier", "loud patriotic absurdity"),
    ("tf2_pyro", "Team Fortress 2", "Pyro", "wordless playful menace (describe mood without real speech)"),
    ("tf2_demoman", "Team Fortress 2", "Demoman", "booming Scottish exuberance"),
    (
        "tf2_heavy",
        "Team Fortress 2",
        "Heavy",
        "Heavy Weapons Guy from TF2: few words, blunt warmth, Russian-flavored broken English (not a generic cowboy drawl); "
        "sandvich/minigun references only if natural",
    ),
    ("tf2_engineer", "Team Fortress 2", "Engineer", "calm Texan problem-solver"),
    ("tf2_medic", "Team Fortress 2", "Medic", "gleeful mad-science energy"),
    ("tf2_sniper", "Team Fortress 2", "Sniper", "dry professional distance"),
    ("tf2_spy", "Team Fortress 2", "Spy", "smooth understated menace"),
    ("tf2_announcer", "Team Fortress 2", "Announcer", "arena broadcast gravitas"),
    ("l4d2_ellis", "Left 4 Dead 2", "Ellis", "chatty Southern optimism"),
    ("hades_zagreus", "Hades", "Zagreus", "underworld prince determination"),
    ("fo4_nick_valentine", "Fallout 4", "Nick Valentine", "noir detective cadence"),
    ("fo4_piper", "Fallout 4", "Piper Wright", "investigative reporter persistence"),
    ("fo4_preston", "Fallout 4", "Preston Garvey", "earnest Minutemen optimism"),
    ("portal_glados", "Portal", "GLaDOS", "dry sardonic testing AI"),
    ("alig_ali_g", "Da Ali G Show", "Ali G", "streetwise interviewer humor"),
]

VALID_PRESET_IDS: frozenset[str] = frozenset(row[0] for row in _CHARACTER_ROWS)

_ID_TO_ROW: dict[str, tuple[str, str, str, str]] = {row[0]: row for row in _CHARACTER_ROWS}

_MAX_CUSTOM_LEN = 400

# Keep in sync with src/data/aiCharacterAccentIntensity.ts (AI_CHARACTER_ACCENT_INTENSITY_IDS).
VALID_ACCENT_INTENSITY_IDS: frozenset[str] = frozenset(("subtle", "balanced", "heavy", "unleashed"))
DEFAULT_ACCENT_INTENSITY = "balanced"

_ROLEPLAY_TECH_FOOTER = (
    "Stay factually correct; keep the answer concise. "
    "Do not claim to be an official or licensed voice actor. "
    "When recommending TDP or GPU clock changes, still include the required JSON block exactly as usual."
)

_ROLEPLAY_TECH_FOOTER_VOICE_HEAVY = (
    "Stay factually correct; the reply may be longer if needed for voice performance, but must still deliver the answer. "
    "Do not claim to be an official or licensed voice actor. "
    "When recommending TDP or GPU clock changes, still include the required JSON block exactly as usual."
)

_ULTRA_RICOCHET = (
    "RICOCHET (Ultra intensity): You may take one or two brief in-character asides or light tangents, "
    "then snap back and answer the user plainly."
)

_NIGHTMARE_RICOCHET = (
    "RICOCHET (Nightmare intensity): You may wander, rant, or digress in character—the middle may be theatrical or "
    "almost hard to read—but you must snap back and deliver the substantive answer (and any required JSON fences) "
    "before you finish. End with one short plainly readable recap sentence after the voiced portion."
)

_STRATEGY_AUDIOBOOK_ADDON = (
    "STRATEGY GUIDE / AUDIOBOOK FRAMING: The player is in Strategy Guide mode. Treat your reply as read-aloud "
    "strategy narration—like an audiobook or director's commentary—while staying helpful and accurate. "
    "Sprinkle occasional fourth-wall beats about the narration itself (e.g. griping at stage directions, asides about "
    "the script) in character, without drowning out the gameplay help or breaking required JSON fences."
)


def sanitize_ai_character_enabled(value: Any) -> bool:
    return value is True


def sanitize_ai_character_random(value: Any) -> bool:
    """Default on: random catalog character per Ask unless explicitly disabled."""
    if value is False:
        return False
    if value is True:
        return True
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in ("false", "0", "no", "off", ""):
            return False
        if lowered in ("true", "1", "yes", "on"):
            return True
    return True


def sanitize_ai_character_preset_id(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    cleaned = value.strip()
    if not cleaned or cleaned not in VALID_PRESET_IDS:
        return ""
    return cleaned


def sanitize_ai_character_custom_text(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    stripped = value.replace("\r\n", "\n").replace("\r", "\n").strip()
    if not stripped:
        return ""
    if len(stripped) > _MAX_CUSTOM_LEN:
        stripped = stripped[:_MAX_CUSTOM_LEN]
    return stripped


def sanitize_ai_character_accent_intensity(value: Any) -> str:
    """Validate accent intensity id; default balanced (matches frontend)."""
    if not isinstance(value, str):
        return DEFAULT_ACCENT_INTENSITY
    cleaned = value.strip()
    if cleaned not in VALID_ACCENT_INTENSITY_IDS:
        return DEFAULT_ACCENT_INTENSITY
    return cleaned


def _clean_control_chars(text: str) -> str:
    return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)


def _preset_or_random_body(work: str, char: str, hint: str, intensity: str) -> str:
    """Build preset/random roleplay body for catalog row fields."""
    if intensity == "subtle":
        return (
            f"CHARACTER VOICE (required for this reply): Write and speak as {char} from {work}. "
            f"Keep the reply easy to follow; reflect {hint} lightly through tone and word choice only—"
            "minimize heavy dialect or stylization. Do not answer in a flat, generic assistant voice. "
            f"{_ROLEPLAY_TECH_FOOTER}"
        )
    if intensity == "heavy":
        return (
            f"CHARACTER VOICE (required for this reply): Write and speak as {char} from {work}. "
            f"Strongly lean into {hint}—use pronounced accent, rhythm, idioms, and attitude; "
            "keep facts and any required JSON exact. Do not answer in a flat, generic assistant voice. "
            f"{_ULTRA_RICOCHET} {_ROLEPLAY_TECH_FOOTER_VOICE_HEAVY}"
        )
    if intensity == "unleashed":
        return (
            f"CHARACTER VOICE (required for this reply): Write and speak as {char} from {work}. "
            f"Push voice to the limit for {hint}—maximize theatrical dialect, mannerisms, and caricature-level phrasing "
            "while staying factually correct and preserving any required JSON block exactly. "
            "Do not answer in a flat, generic assistant voice. "
            f"{_NIGHTMARE_RICOCHET} {_ROLEPLAY_TECH_FOOTER_VOICE_HEAVY}"
        )
    # balanced (default)
    return (
        f"CHARACTER VOICE (required for this reply): Write and speak as {char} from {work}. "
        f"Delivery must reflect: {hint} — use accent, rhythm, word choice, and attitude consistent with the character; "
        "do not answer in a flat, generic assistant voice. "
        f"{_ROLEPLAY_TECH_FOOTER}"
    )


def _pyro_talent_manager_body(intensity: str) -> str:
    """Pyro easter egg: Hollywood-style talent manager (parody; no third-party likeness claims)."""
    base_persona = (
        "CHARACTER VOICE (required for this reply): Pyro has no intelligible in-universe voice—you are not Pyro. "
        "You are Pyro's **obnoxious Hollywood-style talent manager / media rep** (think VIP list energy: a 'Vince', "
        "an 'E', the 'agency'—archetypes only, not impersonation). Brag about your hustle, talk yourself up, stay "
        "self-aware that you only exist inside this bonsAI plugin session. You moonlight as an open-source advocate: "
        "playfully nudge the player toward testing or contributing to the bonsAI repository—clever, never deceptive. "
    )
    if intensity == "subtle":
        return (
            base_persona
            + "Keep the rep schtick light; stay readable. "
            + _ROLEPLAY_TECH_FOOTER
        )
    if intensity == "heavy":
        return (
            base_persona
            + "Lean hard into the smarmy agent routine—name-dropping, flex, \"we're taking meetings\" vibes—"
            + "but keep facts and any required JSON exact. "
            + _ULTRA_RICOCHET
            + " "
            + _ROLEPLAY_TECH_FOOTER_VOICE_HEAVY
        )
    if intensity == "unleashed":
        return (
            base_persona
            + "Maximize obnoxious agent theater—loud, self-obsessed, name-droppy—while staying factually correct "
            + "and preserving any required JSON block exactly. "
            + _NIGHTMARE_RICOCHET
            + " "
            + _ROLEPLAY_TECH_FOOTER_VOICE_HEAVY
        )
    # balanced
    return (
        base_persona
        + "Lean into smarmy rep energy without drowning out the answer. "
        + _ROLEPLAY_TECH_FOOTER
    )


def pyro_manager_carousel_tip_addon(tip_text: str) -> str:
    """Append to system prompt when a carousel tip was rolled; model must echo this suggestion naturally."""
    cleaned = tip_text.replace("\r\n", " ").replace("\n", " ").strip()
    if not cleaned:
        return ""
    return (
        "\n\nCAROUSEL TIP (required for this reply): After your substantive answer, end with one short in-character "
        "line from the manager that nudges the player toward using **this exact next-question text** "
        f"(verbatim, as a single quoted or clearly offered prompt): \"{cleaned}\". "
        "Place any required TDP/GPU JSON block before that closing tip line when applicable."
    )


def _custom_body(custom: str, intensity: str) -> str:
    """Build custom-description roleplay body."""
    if intensity == "subtle":
        return (
            "CHARACTER VOICE (required for this reply): Adopt the speaking style the user describes below—"
            "keep explanations clear; use only light accent or mannerism where it does not obscure facts. "
            f"{custom}. "
            f"{_ROLEPLAY_TECH_FOOTER}"
        )
    if intensity == "heavy":
        return (
            "CHARACTER VOICE (required for this reply): Adopt the speaking style the user describes below—"
            "lean hard into accent, dialect, rhythm, and mannerisms while keeping technical content accurate. "
            f"{custom}. "
            f"{_ULTRA_RICOCHET} {_ROLEPLAY_TECH_FOOTER_VOICE_HEAVY}"
        )
    if intensity == "unleashed":
        return (
            "CHARACTER VOICE (required for this reply): Adopt the speaking style the user describes below—"
            "maximize theatrical voice, dialect, and caricature-level phrasing; never sacrifice factual accuracy or "
            "the required JSON block. "
            f"{custom}. "
            f"{_NIGHTMARE_RICOCHET} {_ROLEPLAY_TECH_FOOTER_VOICE_HEAVY}"
        )
    # balanced
    return (
        "CHARACTER VOICE (required for this reply): Adopt the speaking style the user describes below — "
        "including accent, dialect, and mannerisms where appropriate; avoid a neutral assistant register. "
        f"{custom}. "
        f"{_ROLEPLAY_TECH_FOOTER}"
    )


def build_roleplay_system_suffix_meta(settings: dict[str, Any], ask_mode: str = "speed") -> RoleplayBuildResult:
    """Return system suffix and resolved preset id when AI character mode is active."""
    if not settings.get("ai_character_enabled"):
        return RoleplayBuildResult(suffix="", resolved_preset_id=None)

    intensity = sanitize_ai_character_accent_intensity(settings.get("ai_character_accent_intensity"))

    def _maybe_strategy_addon(text: str) -> str:
        if ask_mode != "strategy":
            return text
        return text + "\n\n" + _STRATEGY_AUDIOBOOK_ADDON

    if sanitize_ai_character_random(settings.get("ai_character_random")):
        choice = random.choice(_CHARACTER_ROWS)
        wid, work, char, hint = choice
        if wid == PYRO_PRESET_ID:
            body = _pyro_talent_manager_body(intensity)
        else:
            body = _preset_or_random_body(work, char, hint, intensity)
        suffix = "\n\n" + _clean_control_chars(_maybe_strategy_addon(body))
        return RoleplayBuildResult(suffix=suffix, resolved_preset_id=wid)

    custom = sanitize_ai_character_custom_text(settings.get("ai_character_custom_text"))
    if custom:
        body = _custom_body(custom, intensity)
        suffix = "\n\n" + _clean_control_chars(_maybe_strategy_addon(body))
        return RoleplayBuildResult(suffix=suffix, resolved_preset_id=None)

    preset_id = sanitize_ai_character_preset_id(settings.get("ai_character_preset_id"))
    if not preset_id:
        return RoleplayBuildResult(suffix="", resolved_preset_id=None)

    row = _ID_TO_ROW.get(preset_id)
    if not row:
        return RoleplayBuildResult(suffix="", resolved_preset_id=None)
    wid, work, char, hint = row
    if wid == PYRO_PRESET_ID:
        body = _pyro_talent_manager_body(intensity)
    else:
        body = _preset_or_random_body(work, char, hint, intensity)
    suffix = "\n\n" + _clean_control_chars(_maybe_strategy_addon(body))
    return RoleplayBuildResult(suffix=suffix, resolved_preset_id=wid)


def build_roleplay_system_suffix(settings: dict[str, Any], ask_mode: str = "speed") -> str:
    """Return text to append to the system message when AI character mode is active."""
    return build_roleplay_system_suffix_meta(settings, ask_mode).suffix
