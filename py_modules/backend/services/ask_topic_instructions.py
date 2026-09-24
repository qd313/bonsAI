"""Title: Recognising a question's topic and writing its call-out

Purpose: Some questions need extra instructions beyond the base system prompt -- a power or
TDP tuning question needs the hardware appendix kept front and center, a display-resolution
question needs guidance broken out by 1280x800 / 1080p / 4K, a question about Ollama itself
needs host/network troubleshooting instead of in-game settings, and so on. This file holds
both halves of that: the "does this question look like X" checks, and the fixed block of
instruction text each one turns on.

Used for: Called from ollama_prompts.build_system_prompt for every Ask, to decide which
topic call-outs (if any) belong in this turn's instructions. question_matches_troubleshooting_log_context
is also called directly by knowledge_base_service.py so a troubleshooting-shaped question is
read the same way there.

Solves: Keeps a question's topic and its call-out text paired in one place, so a change to
when a topic fires and a change to what it says stay next to each other instead of drifting
apart across files.

Does not: Decide the Strategy Guide spoiler wording (strategy_spoiler_policy.py) or the
named-entity extraction that feeds it (strategy_entity_extraction.py) -- those are a
different job even though they also gate what build_system_prompt adds.
"""

import re
from typing import Optional

from backend.constants import (
    DEFAULT_OLLAMA_BASE_URL,
    OLLAMA_TAB_WHERE_AI_RUNS,
)


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

GRAPHICS_RESOLUTION_EXPERT = (
    "\n\nDISPLAY TARGETS (Expert mode): Give **concrete recommendations for all three** outputs—**1280×800**, **1080p**, and **4K**—in separate labeled sections. "
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
    if "proton" in s and any(
        kw in s
        for kw in (
            "deck",
            "sleep",
            "resume",
            "black screen",
            "crash",
            "launch",
            "stutter",
            "shader",
            "wine",
            "steamos",
            "compat",
        )
    ):
        return True
    if "deck" in s and any(
        kw in s
        for kw in (
            "sleep",
            "resume",
            "black screen",
            "crash",
            "proton",
            "steamos",
            "sd card",
            "storage",
            "update",
            "gamescope",
            "steam input",
        )
    ):
        return True
    return False


def question_matches_troubleshooting_log_context(question: str) -> bool:
    """True when the Ask matches troubleshooting presets (crashes, Proton, stutter, etc.)."""
    return _user_asks_deck_troubleshooting_or_compat_line(question)


OLLAMA_BONSAI_SETUP_LINE = (
    "\n\nOLLAMA / bonsAI (host & inference): The user is asking about **slow or failing Ollama responses** and/or **how Ollama is set up for bonsAI**. "
    "Answer as **LLM/host/network** guidance — **not** Steam **Performance / TDP / FPS / QAM game sliders** unless they explicitly tie slowness to those.\n"
    f"Cover, in plain steps: **bonsAI {OLLAMA_TAB_WHERE_AI_RUNS}** — base URL / host (Deck-local `{DEFAULT_OLLAMA_BASE_URL}` vs Ollama on a **PC** on the LAN), **hard timeout** and warning threshold, **Ollama keep-alive** (how long models stay loaded vs VRAM).\n"
    "Cover **host reachability**: on the PC running Ollama, `OLLAMA_HOST` / bind address, OS firewall allowing **11434**, same subnet as the Deck, and correcting typos in the URL.\n"
    "Cover **model load**: large or heavy tags are slower on Deck; suggest smaller or better-quantized models; **Ask mode** (Speed / Strategy / Expert) changes fallback chains; **model policy tier** can limit which tags run.\n"
    "Cover **telling network vs compute delay**: first-token wait vs steady tokens/s; if the host is remote, mention Wi‑Fi vs Ethernet and distance to the PC.\n"
    "Point to **docs/troubleshooting.md** themes (firewall, `OLLAMA_HOST`, LAN) when relevant. "
    "Do **not** output the ```json``` TDP/GPU recommendation block for this topic.\n"
)

HARDWARE_APPENDIX_SKIPPED_FOR_OLLAMA_TOPIC = (
    "Hardware appendix (Deck TDP/GPU JSON): **Skipped for this topic** — the user is focused on Ollama/bonsAI inference or networking, not in-game power sliders. "
    "Do **not** output the ```json``` TDP/GPU block unless they **also** explicitly ask for Deck TDP or GPU MHz changes in the same message.\n\n"
)

HARDWARE_APPENDIX_SKIPPED_FOR_TROUBLESHOOT = (
    "Hardware appendix (Deck TDP/GPU JSON): **Skipped for this topic** — troubleshooting/compat ask, not power tuning. "
    "Do **not** output the ```json``` TDP/GPU block unless the user explicitly asks for Deck watts, FPS, GPU MHz, "
    "battery drain, or thermal limits in the same message.\n\n"
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
