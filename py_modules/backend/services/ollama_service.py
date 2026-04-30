import json
import os
import re
import shutil
import signal
import socket
import sys
import subprocess
import urllib.error
import urllib.request
from typing import Any, Callable, Optional
from urllib.parse import urlparse

from refactor_helpers import normalize_ollama_base

from backend.services.strategy_guide_parse import (
    STRATEGY_FOLLOWUP_PREFIX,
    extract_strategy_guide_branches,
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


def _strategy_spoiler_policy_block(consent: bool, followup: bool) -> str:
    """Injected after STRATEGY GUIDE MODE header; defines ```bonsai-spoiler fences and ordering."""
    if consent:
        lines = (
            "STRATEGY SPOILER POLICY (user opted in): The user explicitly consented to spoilers for this turn "
            "(plugin toggle and/or their wording). Give direct walkthrough detail, names, and puzzle solutions as needed. "
            "You may still wrap optional ultra-sensitive notes in ```bonsai-spoiler ... ``` fences, "
            "but it is not required for normal tactics.\n"
        )
        if not followup:
            lines += (
                "On this first turn, the ```bonsai-strategy-branches fence remains the last characters of the reply; "
                "place any optional ```bonsai-spoiler blocks above it only.\n\n"
            )
        else:
            lines += "\n"
        return lines
    if followup:
        return (
            "STRATEGY SPOILER POLICY (default): Coaching is spoiler-minimized unless the user opted in. "
            "Avoid story endings, major twists, and precise puzzle or boss spoilers in plain text. "
            "Put spoilery narrative only inside ```bonsai-spoiler ... ``` fences "
            "(opening line exactly ```bonsai-spoiler, closing ``` on its own line). "
            "These fences may appear anywhere in this reply. "
            "Even under **If you want to cheat…**, keep spoilery plot or ending detail inside ```bonsai-spoiler "
            "when the user has not opted in.\n\n"
        )
    return (
        "STRATEGY SPOILER POLICY (default): Coaching is spoiler-minimized by default; say so briefly in your opening. "
        "Avoid story endings, major twists, late-game boss names, and exact puzzle solutions in plain text unless "
        "essential for branching; prefer vague labels until the player picks a branch.\n"
        "Put unavoidably spoilery detail only inside ```bonsai-spoiler ... ``` fences "
        "(opening line exactly ```bonsai-spoiler).\n"
        "On this first turn, every ```bonsai-spoiler block must appear **above** the opening ```bonsai-strategy-branches line; "
        "the branch fence must still close the reply — no characters after its closing ```.\n\n"
    )

# Smaller than 64KiB so Stop re-checks ``cancel_requested`` more often while ``read()`` blocks on slow streams.
OLLAMA_CHAT_READ_CHUNK = 4096


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

GRAPHICS_RESOLUTION_DEEP = (
    "\n\nDISPLAY TARGETS (Expert / Deep mode): Give **concrete recommendations for all three** outputs—**1280×800**, **1080p**, and **4K**—in separate labeled sections. "
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
    return False


def question_matches_troubleshooting_log_context(question: str) -> bool:
    """True when the Ask matches troubleshooting presets (crashes, Proton, stutter, etc.)."""
    return _user_asks_deck_troubleshooting_or_compat_line(question)


OLLAMA_BONSAI_SETUP_LINE = (
    "\n\nOLLAMA / bonsAI (host & inference): The user is asking about **slow or failing Ollama responses** and/or **how Ollama is set up for bonsAI**. "
    "Answer as **LLM/host/network** guidance — **not** Steam **Performance / TDP / FPS / QAM game sliders** unless they explicitly tie slowness to those.\n"
    "Cover, in plain steps: **bonsAI Settings → Connection** — base URL / host (Deck-local `http://127.0.0.1:11434` vs Ollama on a **PC** on the LAN), **hard timeout** and warning threshold, **Ollama keep-alive** (how long models stay loaded vs VRAM).\n"
    "Cover **host reachability**: on the PC running Ollama, `OLLAMA_HOST` / bind address, OS firewall allowing **11434**, same subnet as the Deck, and correcting typos in the URL.\n"
    "Cover **model load**: large or heavy tags are slower on Deck; suggest smaller or better-quantized models; **Ask mode** (Speed / Strategy / Deep) changes fallback chains; **model policy tier** can limit which tags run.\n"
    "Cover **telling network vs compute delay**: first-token wait vs steady tokens/s; if the host is remote, mention Wi‑Fi vs Ethernet and distance to the PC.\n"
    "Point to **docs/troubleshooting.md** themes (firewall, `OLLAMA_HOST`, LAN) when relevant. "
    "Do **not** output the ```json``` TDP/GPU recommendation block for this topic.\n"
)

HARDWARE_APPENDIX_SKIPPED_FOR_OLLAMA_TOPIC = (
    "Hardware appendix (Deck TDP/GPU JSON): **Skipped for this topic** — the user is focused on Ollama/bonsAI inference or networking, not in-game power sliders. "
    "Do **not** output the ```json``` TDP/GPU block unless they **also** explicitly ask for Deck TDP or GPU MHz changes in the same message.\n\n"
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
    strategy_spoiler_consent: bool = False,
) -> str:
    """Build the system message used for Ollama requests from game and attachment context.

    Layers (excluding optional roleplay prefix from ``main.py``): dynamic game/attachment/vision → identity +
    general-purpose clause → ``early_context_suffix`` (e.g. Proton excerpts) → topic/mode injects → TDP + JSON
    contract tail. Future RAG snippets belong immediately before the topic injects (same splice as
    ``early_context_suffix``, or an adjacent block in ``main.py``).
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
    dynamic_block = (
        f"{game_line} {attachment_game_context_line} {attachment_name_context_line} {vdf_context_line} "
        f"{vision_line} {vision_priority_line} {genre_franchise_cue_line} {game_intent_line}\n\n"
    )
    general_block = BONSAI_SYSTEM_IDENTITY + GENERAL_PURPOSE_ASSISTANT_CLAUSE
    early_stripped = (early_context_suffix or "").strip()
    early_block = f"\n\n{early_stripped}" if early_stripped else ""

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
            gfx = GRAPHICS_RESOLUTION_DEEP if ask_mode == "deep" else GRAPHICS_RESOLUTION_SPEED
        troubleshoot = (
            app_name.strip()
            and _user_asks_deck_troubleshooting_or_compat_line(question)
            and not ollama_q
        )
        middle = (
            (OLLAMA_BONSAI_SETUP_LINE if ollama_q else "")
            + (MODEL_POLICY_TIERS_LINE if model_policy_q else "")
            + (SWEET_SPOT_QAM_LINE if sweet else "")
            + gfx
            + (DECK_TROUBLESHOOT_GAME_SETTINGS_LINE if troubleshoot else "")
        )
        tail = HARDWARE_APPENDIX_SKIPPED_FOR_OLLAMA_TOPIC if ollama_q else hardware_tdp_appendix
        return dynamic_block + general_block + early_block + middle + tail

    ollama_q = user_asks_ollama_bonsai_host_or_latency(question)
    model_policy_q = _user_asks_model_policy_tiers_explainer(question)
    power_topic = user_wants_power_or_performance_topic(question)
    followup = is_strategy_followup_question(question)
    spoiler_policy = _strategy_spoiler_policy_block(strategy_spoiler_consent, followup)
    if followup:
        strategy_block = (
            "\n\nSTRATEGY GUIDE MODE (active — follow-up turn):\n"
            f"{spoiler_policy}"
            "The user's message begins with the plugin's branch selection prefix. They already chose where they are stuck.\n"
            "Give direct, controller-first coaching for that exact beat on a Steam Deck (gamepad; short steps; pause-friendly; no PC keyboard assumptions).\n"
            "Do NOT output a ```bonsai-strategy-branches block on this turn.\n"
            "End your reply with a clearly marked section using this exact markdown heading on its own line:\n"
            "**If you want to cheat…**\n"
            "Under it, give 2–5 CONCRETE solo-player examples (name the glitch, skip, or trick; say roughly how to do it in "
            "short steps). Assume the game may be running through **Steam on Steam Deck** and/or **emulation** (save "
            "states, rewind, fast-forward, practice tools) where that fits—mention Steam Input remaps or emulator menus "
            "when relevant. Do not hand-wave with 'look up cheats online'; each bullet must be actionable. "
            "Do not encourage cheating in multiplayer, competitive, or anti-cheat contexts; no piracy or illegal ROM talk.\n"
        )
    else:
        strategy_block = (
            "\n\nSTRATEGY GUIDE MODE (active — first turn):\n"
            f"{spoiler_policy}"
            "You are a patient coach for someone playing on a Steam Deck (assume gamepad). Use plain spoken language; short steps; avoid jargon unless you explain it.\n"
            "Infer game title and rough progress from the user's text and any screenshots; state uncertainty honestly.\n"
            "After a brief orientation (no spoilers beyond what is needed to branch), you MUST end the reply with exactly one fenced block so the UI can show choices. "
            "Do not trail off into unrelated topics before the fence; the branch picker is mandatory on this turn.\n"
            "Use this exact opening fence line (no language tag on the fence name) and valid JSON only inside it (2–8 options, each with \"id\" and short \"label\" the player understands):\n"
            "```bonsai-strategy-branches\n"
            '{"question":"Where are you at in … ?","options":[{"id":"a","label":"…"},{"id":"b","label":"…"}]}\n'
            "```\n"
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

    return dynamic_block + general_block + early_block + middle + tail


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


def _ollama_http_base_from_pc_ip_field(pc_ip: str) -> str:
    """Resolve ``http://host:port`` used for Ollama API calls (same as chat URL base)."""
    raw = (pc_ip or "").strip() or "127.0.0.1:11434"
    _, _, base = normalize_ollama_base(raw)
    return base


def _is_loopback_ollama_base(base_http: str) -> bool:
    try:
        h = urlparse(base_http).hostname or ""
        return h in ("127.0.0.1", "localhost", "::1", "[::1]")
    except Exception:
        return False


def _guess_ollama_cli_paths() -> list[str]:
    """PATH + typical install paths — Decky's Python PATH often misses ``~/.local/bin``."""
    out: list[str] = []
    seen: set[str] = set()

    def _add(candidate: Optional[str]) -> None:
        if not candidate:
            return
        p = os.path.abspath(os.path.expanduser(candidate))
        if not os.path.isfile(p) or not os.access(p, os.X_OK):
            return
        if p in seen:
            return
        seen.add(p)
        out.append(p)

    _add(shutil.which("ollama"))
    _add(os.path.expanduser("~/.local/bin/ollama"))
    for fixed in (
        "/home/deck/.local/bin/ollama",
        "/usr/local/bin/ollama",
        "/usr/bin/ollama",
    ):
        _add(fixed)
    return out


def request_ollama_stop_model_via_api(
    base_http: str,
    model_name: str,
    logger: Any,
    *,
    timeout_seconds: float = 20.0,
) -> bool:
    """
    Cancel in-flight generation and unload the model (same idea as CLI ``ollama stop``):

    POST ``/api/generate`` with minimal prompt + ``keep_alive: 0``.

    Builds differ — retry shapes seen upstream (empty prompt, whitespace prompt, ``\"0s\"`` keep-alive).
    """
    mn = str(model_name or "").strip()
    if not mn:
        return False
    url = f"{base_http.rstrip('/')}/api/generate"
    variants: list[dict] = [
        {"model": mn, "prompt": "", "keep_alive": 0, "stream": False},
        {"model": mn, "prompt": " ", "keep_alive": 0, "stream": False},
        {"model": mn, "prompt": "", "keep_alive": "0s", "stream": False},
        {"model": mn, "prompt": "", "keep_alive": 0},
    ]

    last_err: Optional[BaseException] = None
    for body_obj in variants:
        payload = json.dumps(body_obj).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
                raw = resp.read(65536)
            try:
                parsed = json.loads((raw or b"{}").decode("utf-8", errors="replace") or "{}")
            except json.JSONDecodeError:
                parsed = None
            if isinstance(parsed, dict) and parsed.get("error"):
                err_txt = str(parsed.get("error") or "")
                logger.warning(
                    "request_ollama_stop_model_via_api: HTTP 200 but JSON error model=%s err=%s",
                    mn,
                    err_txt[:300],
                )
                last_err = RuntimeError(err_txt or "ollama error in body")
                continue
            logger.info(
                "request_ollama_stop_model_via_api: POST /api/generate unload ok model=%s variant_keys=%s",
                mn,
                sorted(body_obj.keys()),
            )
            return True
        except urllib.error.HTTPError as he:
            last_err = he
            try:
                snippet = he.read().decode("utf-8", errors="replace")[:420]
            except Exception:
                snippet = ""
            logger.warning(
                "request_ollama_stop_model_via_api: HTTP %s model=%s body=%r snippet=%s",
                he.code,
                mn,
                body_obj,
                snippet,
            )
        except urllib.error.URLError as err:
            last_err = err
            logger.warning(
                "request_ollama_stop_model_via_api: URL error model=%r body=%s err=%s",
                mn,
                body_obj,
                err,
            )
        except Exception as exc:
            last_err = exc
            logger.warning(
                "request_ollama_stop_model_via_api: failed model=%s body_obj=%s err=%s",
                mn,
                body_obj,
                exc,
            )

    if last_err is not None:
        logger.warning(
            "request_ollama_stop_model_via_api: all unload variants exhausted model=%s last_err=%s",
            mn,
            last_err,
        )
    return False


def try_ollama_cli_stop_model(model_name: str, logger: Any, *, timeout_seconds: float = 25.0) -> bool:
    """
    Fallback on the Deck: invoke ``ollama stop <tag>`` if we locate a binary.

    Uses sanitized env via local-setup helpers so Steam-runtime ``LD_*`` does not break the binary.
    """
    mn = str(model_name or "").strip()
    if not mn:
        return False
    candidates = _guess_ollama_cli_paths()
    if not candidates:
        logger.info("try_ollama_cli_stop_model: no ollama binary found — skip CLI stop")
        return False
    try:
        from backend.services.local_ollama_setup_service import _env_for_ollama_cli as _cli_env_for  # noqa: PLC0415
    except Exception as exc:
        logger.warning("try_ollama_cli_stop_model: import env helper failed err=%s", exc)
        return False

    for ob in candidates:
        env = _cli_env_for(ob)
        try:
            proc = subprocess.run(
                [ob, "stop", mn],
                env=env,
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
            )
            if proc.returncode == 0:
                logger.info("try_ollama_cli_stop_model: %s stop %s ok", ob, mn)
                return True
            logger.warning(
                "try_ollama_cli_stop_model: %s exited %s stderr=%s",
                ob,
                proc.returncode,
                (proc.stderr or "")[:500],
            )
        except subprocess.TimeoutExpired:
            logger.warning("try_ollama_cli_stop_model: timeout %s stopping model=%s", ob, mn)
            return False
        except Exception as exc:
            logger.warning("try_ollama_cli_stop_model: %s invoke err=%s", ob, exc)
    return False


def try_sigterm_linux_ollama_runner_procs(logger: Any, _model_name: str = "") -> int:
    """
    Linux-only last resort after unload + ``ollama stop``: terminate same-UID processes whose cmdline matches
    an Ollama *runner*. Some builds leave inference workers pegging CPU briefly or longer after CLI stop succeeds.
    """
    if sys.platform != "linux":
        return 0
    my_uid = os.getuid()
    my_pid = os.getpid()
    killed: list[int] = []
    try:
        entries = sorted(os.listdir("/proc"), key=lambda x: int(x) if x.isdigit() else 10**18)
    except OSError as exc:
        logger.debug("sigterm_linux_ollama_runners: list /proc err=%s", exc)
        return 0
    for name in entries:
        if not name.isdigit():
            continue
        pid = int(name)
        if pid == my_pid:
            continue
        try:
            with open(os.path.join("/proc", name, "status"), encoding="utf-8") as fh:
                uid_line = None
                for line in fh:
                    if line.startswith("Uid:"):
                        uid_line = line
                        break
            if uid_line is None:
                continue
            proc_uid = int(uid_line.split()[1])
        except (OSError, ValueError):
            continue
        if proc_uid != my_uid:
            continue
        try:
            with open(os.path.join("/proc", name, "cmdline"), "rb") as fh:
                raw = fh.read()
        except OSError:
            continue
        if not raw:
            continue
        cmd_l = raw.replace(b"\x00", b" ").decode("utf-8", "replace").lower()
        if "ollama" not in cmd_l or "runner" not in cmd_l:
            continue
        try:
            os.kill(pid, signal.SIGTERM)
            killed.append(pid)
        except OSError as exc:
            logger.debug("sigterm_linux_ollama_runners: kill pid=%s err=%s", pid, exc)
        if len(killed) >= 24:
            break
    if killed:
        logger.info(
            "try_sigterm_linux_ollama_runner_procs: sent SIGTERM to %d ollama runner proc(s)",
            len(killed),
        )
    return len(killed)


def best_effort_abort_ollama_inference(
    *,
    pc_ip_field: str,
    model_name: Optional[str],
    logger: Any,
) -> None:
    """
    After the user presses Stop (HTTP read abort + threading Event), aggressively wind down inference:

    - POST ``/api/generate`` unload on whichever host backs ``pc_ip_field`` (LAN or localhost).
    - On **localhost Ollama**, also run ``ollama stop <tag>`` **after** the API attempt: HTTP unload can
      return 200 while CPU-offloaded inference keeps running; CLI ``stop`` is documented to abort in-flight work.

    Prefer this over naive PID kills: Ollama owns runner processes; unloading + ``ollama stop`` is the supported pair.
    """
    base = _ollama_http_base_from_pc_ip_field(pc_ip_field)
    mn = str(model_name or "").strip() if model_name is not None else ""
    if not mn:
        logger.info("best_effort_abort_ollama_inference: no active model snapshot — skipping server stop.")
        return
    request_ollama_stop_model_via_api(base, mn, logger)
    # On-loopback: always run `ollama stop` after unload API (HTTP unload alone can leave CPU offload running).
    if _is_loopback_ollama_base(base):
        logger.info(
            "best_effort_abort_ollama_inference: localhost Ollama — running ollama stop after unload API (%s)",
            mn,
        )
        try_ollama_cli_stop_model(mn, logger)
        try_sigterm_linux_ollama_runner_procs(logger, mn)
    else:
        logger.info(
            "best_effort_abort_ollama_inference: remote Ollama host — unload API only (no local ollama CLI).",
        )


def post_ollama_chat(
    url: str,
    model_name: str,
    messages: list,
    request_timeout_seconds: int,
    normalized_attachments: list,
    prepared_images: list,
    attachment_warnings: list,
    attachment_errors: list,
    logger: Any,
    ask_mode: str = "speed",
    keep_alive: str = "5m",
    cancel_requested: Optional[Callable[[], bool]] = None,
    on_http_response_opened: Optional[Callable[[Any], None]] = None,
    on_http_response_done: Optional[Callable[[], None]] = None,
) -> dict:
    """Execute one Ollama chat request attempt and return a normalized success/error payload."""

    def _should_cancel() -> bool:
        return bool(cancel_requested and cancel_requested())

    # Strategy replies include branching JSON plus optional cheat section — allow more tokens than speed/deep defaults.
    num_predict = 900 if ask_mode == "strategy" else 500
    body_dict = {
        "model": model_name,
        "messages": messages,
        # stream:true returns HTTP headers + HTTPResponse promptly; stream:false buffers the full completion first.
        "stream": True,
        "keep_alive": keep_alive,
        "options": {
            "num_predict": num_predict,
            "temperature": 0.42 if ask_mode == "strategy" else 0.4,
        },
    }
    # Keep transport payload shape explicit so backend/frontend contracts remain stable.
    payload = json.dumps(body_dict).encode("utf-8")
    logger.info(
        "ask_ollama: POST %s model=%s payload_bytes=%d",
        url,
        model_name,
        len(payload),
    )
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=request_timeout_seconds) as resp:
            if on_http_response_opened:
                try:
                    on_http_response_opened(resp)
                except Exception:
                    logger.exception("ask_ollama: on_http_response_opened hook failed model=%s", model_name)
            try:
                pending = b""
                deltas: list[str] = []
                stream_err_txt: Optional[str] = None
                done_flag = False

                def _apply_stream_obj(jo: dict) -> None:
                    nonlocal stream_err_txt, done_flag
                    err_any = jo.get("error")
                    if err_any is not None:
                        if isinstance(err_any, dict):
                            stream_err_txt = str(
                                err_any.get("message") or err_any.get("detail") or "ollama error"
                            )
                        else:
                            stream_err_txt = str(err_any)
                    msg_blk = jo.get("message") if isinstance(jo.get("message"), dict) else {}
                    mc = msg_blk.get("content")
                    if isinstance(mc, str) and mc:
                        deltas.append(mc)
                    if jo.get("done"):
                        done_flag = True

                while True:
                    if _should_cancel():
                        try:
                            resp.close()
                        except Exception:
                            pass
                        logger.info("ask_ollama: cancelled mid-request model=%s", model_name)
                        return {
                            "success": False,
                            "response": "Request stopped (connection closed).",
                            "cancelled": True,
                        }
                    while True:
                        nl = pending.find(b"\n")
                        if nl < 0:
                            break
                        line = pending[:nl].strip()
                        pending = pending[nl + 1 :]
                        if not line:
                            continue
                        try:
                            jo = json.loads(line.decode("utf-8", "replace"))
                        except json.JSONDecodeError:
                            if _should_cancel():
                                return {
                                    "success": False,
                                    "response": "Request stopped (connection closed).",
                                    "cancelled": True,
                                }
                            logger.warning(
                                "ask_ollama: NDJSON decode skip model=%s line=%s",
                                model_name,
                                line[:200],
                            )
                            continue
                        if isinstance(jo, dict):
                            _apply_stream_obj(jo)
                        if done_flag:
                            break
                    if done_flag:
                        break
                    try:
                        chunk = resp.read(OLLAMA_CHAT_READ_CHUNK)
                    except Exception as exc:
                        if _should_cancel():
                            logger.info("ask_ollama: read interrupted by cancel model=%s (%s)", model_name, exc)
                            return {
                                "success": False,
                                "response": "Request stopped (connection closed).",
                                "cancelled": True,
                            }
                        raise
                    if not chunk:
                        break
                    pending += chunk
                if pending.strip():
                    try:
                        jo_tail = json.loads(pending.strip().decode("utf-8", "replace"))
                    except json.JSONDecodeError:
                        jo_tail = None
                    if isinstance(jo_tail, dict):
                        _apply_stream_obj(jo_tail)
                if stream_err_txt:
                    return {
                        "success": False,
                        "response": (
                            f"Ollama streamed an error for model '{model_name}'. "
                            f"{stream_err_txt[:600]}"
                        ),
                        "body": stream_err_txt[:4000],
                    }
                assistant_raw = "".join(deltas)
                if _should_cancel():
                    return {
                        "success": False,
                        "response": "Request stopped (connection closed).",
                        "cancelled": True,
                    }
                text = assistant_raw.strip() or "No response text."
                strategy_guide_branches = None
                if ask_mode == "strategy":
                    visible, strategy_guide_branches = extract_strategy_guide_branches(text)
                    text = visible
                text = format_ai_response(
                    text,
                    normalized_attachments,
                    prepared_images,
                    attachment_errors,
                )
                if attachment_warnings:
                    logger.info("ask_ollama: attachment warnings: %s", "; ".join(attachment_warnings))
                logger.info("ask_ollama: OK model=%s response_len=%d", model_name, len(text))
                return {
                    "success": True,
                    "response": text,
                    "model": model_name,
                    "assistant_raw": assistant_raw,
                    "strategy_guide_branches": strategy_guide_branches,
                }
            finally:
                if on_http_response_done:
                    try:
                        on_http_response_done()
                    except Exception:
                        logger.exception("ask_ollama: on_http_response_done hook failed model=%s", model_name)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        logger.warning(
            "ask_ollama: HTTPError code=%s model=%s body_len=%d",
            e.code,
            model_name,
            len(body),
        )
        return {
            "success": False,
            "response": (
                f"Ollama returned HTTP {e.code} for model '{model_name}'. "
                "Check the host Ollama log; the full error body is not copied into the chat UI."
            ),
            "status": e.code,
            "body": body,
        }
    except urllib.error.URLError as e:
        if isinstance(e.reason, (TimeoutError, socket.timeout)):
            return {
                "success": False,
                "response": (
                    f"Ollama did not respond within {request_timeout_seconds} seconds. "
                    "Check that Ollama is running and your PC IP is correct."
                ),
            }
        return {
            "success": False,
            "response": (
                f"Could not reach Ollama at the configured host for model '{model_name}'. "
                "Verify PC IP, firewall, and that Ollama is listening."
            ),
        }
    except Exception as e:
        if cancel_requested and cancel_requested():
            logger.info("ask_ollama: treating error as cancel model=%s err=%s", model_name, e)
            return {
                "success": False,
                "response": "Request stopped (connection closed).",
                "cancelled": True,
            }
        logger.exception("ask_ollama: unexpected error model=%s", model_name)
        return {
            "success": False,
            "response": f"Ollama request failed for model '{model_name}'. Check the Deck plugin log.",
        }
