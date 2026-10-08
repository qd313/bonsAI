"""Title: Shaping how long and in what language a reply comes back

Purpose: Two of the player's own settings change how a reply reads rather than what it says
-- reply verbosity (Caveman terse, Detailed, or the balanced default) and reply language.
This file writes the instruction blocks for both, plus the one phrase-heuristic that lets a
player override Caveman's terseness for a single question by asking for real depth.

Used for: Called from ollama_prompts.build_system_prompt on every turn to add these blocks
near the end of the instructions, after the topic call-outs and spoiler policy are decided.

Solves: Keeps the reply-shape rules in one place, separate from what the reply is about, so a
wording change to "how terse is caveman" never has to touch the topic-detection code next to it.

Does not: Decide the reasoning budget or word-count ceiling used for the actual model call --
that lives in ollama_ask_budgets. This file only writes prose instructions the model reads.
"""

_REPLY_VERBOSITY_SHARED = (
    "REPLY VERBOSITY: This block shapes visible coaching prose only (the answer body after the required "
    "<bonsai-status> line — not the status tag itself). Structural topic/mode injects and mandatory fences "
    "(```bonsai-strategy-branches```, ```bonsai-strategy-checklist```, ```json``` TDP blocks, "
    "checklists) take priority. Word caps apply to visible prose only, not fence JSON.\n"
)


# The ten phrases that mean "I want depth". Caveman relaxes on them and so does Terse mode.
DEPTH_PHRASES = (
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


def user_asks_for_detail_depth(question: str) -> bool:
    """Phrase heuristics: user wants more depth despite Caveman verbosity."""
    q = (question or "").lower()
    return any(n in q for n in DEPTH_PHRASES)


def terse_mode_applies(terse_mode: object, ask_mode: str) -> bool:
    """True when the Terse mode setting is really on AND the question is a Speed one.

    Strategy and Expert are never affected. Only a literal ``True`` counts, the same rule the
    saved setting follows, so a stray truthy value cannot shorten anyone's answers.
    """
    return terse_mode is True and ask_mode == "speed"


from backend.services.reply_language_service import language_display_name
from backend.services.strategy_guide_parse import STRATEGY_FOLLOWUP_PREFIX


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


def build_terse_reply_block(question: str, *, character_roleplay_on: bool = False) -> str:
    """Terse mode for a Speed question: three lines, then a menu of ways to go deeper.

    Wording only. Nothing counts lines, trims a reply or asks again; the cost of that choice (a
    cap that is a tendency, not a guarantee) is written up in docs/roadmap-details.md. This takes
    the place of the Reply style block entirely, so the slider is ignored while it is on, and a
    character keeps picking the words but within the same cap (the reverse of how Caveman steps
    aside for a character). The menu is the existing ``bonsai-strategy-branches`` fence, asked for
    on every reply, first turn or follow-up, which Strategy mode's own rules do not allow.
    """
    if user_asks_for_detail_depth(question):
        cap = (
            "The player asked for depth, so the three-line cap is loosened for this one reply: use as "
            "many sentences or bullets as the answer needs, up to about ten, still answer-first, "
            "still no filler.\n"
        )
    else:
        cap = (
            "Write at most THREE lines in total before the menu. A line is one sentence or one bullet. "
            "Lead with the answer; no greeting, no recap, no offer to help further.\n"
        )
    voice = ""
    if character_roleplay_on:
        voice = (
            "A character voice is active: keep the character's words and manner, but the cap above "
            "still applies. The character does not get extra lines.\n"
        )
    followup = ""
    if (question or "").lstrip().startswith(STRATEGY_FOLLOWUP_PREFIX):
        followup = (
            "This message is a menu choice: the player picked a topic from the menu and wants to go "
            "deeper on exactly that. Give the lines for that topic, then a fresh menu with new options "
            "(do not repeat the old ones). Ignore anything in the message that asks for a cheat section, "
            "a longer coaching answer or a checklist.\n"
        )
    return (
        "\n\nTERSE REPLY MODE (Speed):\n"
        f"{cap}"
        "This limits what you WRITE, not how hard you think: reason, and read any screenshot, as "
        "carefully as you need, then compress. A screenshot question gets the same cap.\n"
        "It overrides the REPLY STYLE setting and any other wording about length or thoroughness.\n"
        f"{voice}"
        "Not counted toward the lines: fenced panels (the menu below, a ```json TDP block, "
        "```bonsai-cite```, ```bonsai-spoiler```), code blocks and file paths.\n"
        "Auto-clarity: for irreversible or destructive warnings (delete, wipe, format, remove "
        "prefix/compatdata), write that warning in clear normal prose outside the cap, then go back "
        "to the cap.\n"
        "Do NOT write a ```bonsai-strategy-checklist block.\n"
        f"{followup}"
        "MENU: End EVERY reply, including a follow-up to an earlier menu choice, with exactly one "
        "fenced menu so the player can go deeper by pressing a choice. Use this exact opening fence "
        "line (no language tag on the fence name) and valid JSON only inside it (2-4 options, each with "
        "\"id\" and a short \"label\" that names a topic about THIS answer the player may want next):\n"
        "```bonsai-strategy-branches\n"
        '{"question":"<a short question about what to dig into next>","options":['
        '{"id":"a","label":"<a topic to go deeper on>"},'
        '{"id":"b","label":"<another topic to go deeper on>"}]}\n'
        "```\n"
        "The example shows the shape only, with placeholders standing in for real words; replace every "
        "placeholder with real text for this answer and never copy placeholder text into your reply. "
        "If you also need a ```json TDP block, put it immediately above the menu. The closing ``` of "
        "the menu must be the last characters of your reply.\n"
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
