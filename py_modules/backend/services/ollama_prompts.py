"""Title: Writing the instructions the AI reads before answering

Purpose: Before every Ask question goes to the AI, it needs a full set of written instructions
— who bonsAI is, what game is running, what it should and should not talk about, how it should
handle spoilers, how long the reply should be, and so on. This file writes that whole instruction
sheet. It is also where this project keeps its "does this question look like X" checks — does it
sound like a power-tuning question, a troubleshooting question, a question about Ollama itself —
because those checks decide which extra instructions get added. Nothing here ever talks to
Ollama directly; it only produces the text that goes into the request, and does one light pass
of cleanup on the text that comes back.

Used for: Called by the Ask flow to build the instructions for a question before it is sent, and
by a couple of the same "does this question look like X" checks elsewhere in that same Ask flow so
a question is classified the same way everywhere it matters.

Solves: Keeps every fixed and conditional piece of instruction text in one file, so what the AI
is told does not end up scattered across the files that actually make the network call.

Does not: Send anything to Ollama or read anything back over the network — see ollama_service for
that. Decide the reply's word-count or reasoning budget — those live in ollama_ask_budgets.

How it works:

    the instructions, stacked top to bottom:

    +- what's on screen right now (game, screenshot hints)........ always present
    +- who bonsAI is, plus the required "thinking out loud" line... always present
    +- (Deep Rock Galactic: Survivor only) a small jargon note..... one specific game
    +- background material: Proton log excerpts, knowledge-base
    |  notes -- spliced in early, UNLESS the prompt is at risk of
    |  overflowing, in which case it moves to just above the last
    |  section instead, so it is the part nearest the end that
    |  survives if anything gets cut off
    +- whichever topic call-outs this question matched: help with
    |  Ollama itself, explaining model policy tiers, power/TDP
    |  tuning, display-resolution guidance, troubleshooting tips,
    |  or (in Strategy Guide mode) that mode's own coaching rules
    |  and spoiler policy
    +- reply length/style and reply language, if changed from the
    |  defaults
    +- the power/TDP rules, always last

1. `build_system_prompt()` is the one function that assembles all of this into the final text.
   Everything else in the file exists to feed it: a fixed block of instruction text, a check that
   decides whether a block is needed this turn, or a smaller function that fills in one variable
   piece (the current game, the measured power cap, the player's chosen reply style).
2. A family of small "does this question look like X" checks decide which topic instructions get
   added — things like `user_wants_power_or_performance_topic()`,
   `user_asks_ollama_bonsai_host_or_latency()`, `question_matches_troubleshooting_log_context()`,
   and several more. Each one only adds its block when it actually matches, so a question about,
   say, TDP tuning does not also carry unrelated instructions about troubleshooting Proton.
3. In Strategy Guide mode specifically, `extract_strategy_asked_entity()` works out whether the
   player named a specific boss or enemy by name. It prefers a title the knowledge base already
   knows about (`kb_card_names()`, matched by a helper in strategy_entity_extraction.py) over
   guessing from phrasing, because a guess that is wrong could unfence a spoiler the player never
   asked for. That result feeds
   `_strategy_spoiler_policy_block()`, which writes the actual spoiler rule for this turn — keep
   this one entity in the clear because the player asked about it by name, keep everything else
   wrapped, or, for a game whose own profile treats bosses as routine gameplay rather than story,
   relax the rule further still.
4. Once the AI has answered, `format_ai_response()` does one light pass over the reply — it never
   touches the wording. It used to also append a short `[AttachDebug: ...]` note to the visible
   answer any time the question carried an attachment at all, whether or not anything actually
   went wrong with it; that note is gone from the reply now (D104) and, where wired by the
   caller, the same counts go to the verbose app log instead. A separate note spelling out an
   actual attachment problem is still added, only when there was one.
5. Separately, `build_reply_followup_context_block()` handles the "this was wrong / too long /
   spoiled something" chips: when a person taps one and asks a refinement, this pastes the
   previous question and answer (trimmed to a safe length) ahead of their new message, so the
   model knows what is being refined.

Gotchas: Several of the fixed instruction blocks and the exact wording inside them were tuned
against measured answers on real questions, not just written once and left — a comment sits next
to each one that was, explaining what changed and what the numbers were. Changing that wording
without re-measuring can undo a fix that took real testing to find.

Split note: the named-entity extraction this file used to do (kb_card_names,
extract_strategy_asked_entity, kb_text_covers_asked_entity, and their phrasing patterns) now
lives in strategy_entity_extraction.py, the spoiler-policy wording (spoiler consent check,
low-spoiler-risk title logic, and the actual policy paragraphs) now lives in
strategy_spoiler_policy.py, and the topic classifiers plus their call-out text (Ollama host
help, model policy tiers, power/TDP, display resolution, troubleshooting) now live in
ask_topic_instructions.py; all are re-exported here.
"""

import re
from typing import Callable, Optional, Any

from backend.tdp_intent import is_current_tdp_read_intent
from backend.services.strategy_guide_parse import (
    format_strategy_checklist_state_block,
    is_strategy_followup_question,
)
from backend.services.strategy_entity_extraction import (
    kb_card_names,
    extract_strategy_asked_entity,
    kb_text_covers_asked_entity,
)
from backend.services.strategy_spoiler_policy import (
    user_consents_strategy_spoilers,
    _strategy_kb_spoiler_clause_suppressed,
    _strategy_spoiler_policy_block,
    _strategy_spoiler_constitution_compact_block,
)
from backend.services.ask_topic_instructions import (
    user_wants_power_or_performance_topic,
    _user_asks_sweet_spot_tuning,
    SWEET_SPOT_QAM_LINE,
    GRAPHICS_RESOLUTION_SPEED,
    GRAPHICS_RESOLUTION_STRATEGY,
    GRAPHICS_RESOLUTION_EXPERT,
    _user_asks_resolution_relevant_performance,
    user_asks_ollama_bonsai_host_or_latency,
    append_deck_tdp_sysfs_grounding,
    _user_asks_model_policy_tiers_explainer,
    _user_asks_deck_troubleshooting_or_compat_line,
    question_matches_troubleshooting_log_context,
    OLLAMA_BONSAI_SETUP_LINE,
    HARDWARE_APPENDIX_SKIPPED_FOR_OLLAMA_TOPIC,
    HARDWARE_APPENDIX_SKIPPED_FOR_TROUBLESHOOT,
    MODEL_POLICY_TIERS_LINE,
    DECK_TROUBLESHOOT_GAME_SETTINGS_LINE,
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
    strategy_title_profile: str = "",
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
        title_profile=strategy_title_profile,
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
                title_profile=strategy_title_profile,
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
        title_profile=strategy_title_profile,
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
            '{"question":"Where are you at in <THIS GAME>?","options":['
            '{"id":"a","label":"<a place early in THIS game>"},'
            '{"id":"b","label":"<a place later in THIS game>"}]}\n'
            "```\n"
            "The example above shows the shape only, with placeholders standing in for real "
            "words — it is not itself a real game, place, or question. Replace every placeholder "
            "with the actual game title, question, and option labels that fit the current game "
            "and conversation; never copy any placeholder text into your reply.\n"
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
    """Append an attachment error suffix so a real problem is preserved for UI rendering.

    D104: every answer to a question that carried an attachment used to end with a
    `[AttachDebug: requested=1, prepared=1, errors=0]` line, whether or not anything went
    wrong. Nothing on screen removed it and no setting turned it off. That debug line is gone
    from the reply entirely now -- a caller that wants the counts logs them itself (verbose
    app log only), rather than showing them to the person asking. A genuine attachment error
    is still reported in the reply, since that one is not decoration.
    """
    response_text = text or "No response text."
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

