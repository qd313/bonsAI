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
