import json
import re
import socket
import urllib.error
import urllib.request
from typing import Any, Callable

from backend.services.strategy_guide_parse import (
    extract_strategy_guide_branches,
    is_strategy_followup_question,
)


def _user_wants_power_or_performance_topic(question: str) -> bool:
    """True when the user message plausibly asks for Deck power/performance tuning."""
    q = (question or "").lower()
    return bool(
        re.search(
            r"\b("
            r"tdp|watts?|fps|frame\s*rate|frametime|frame\s*pacing|performance|"
            r"gpu\s*clock|\bmhz\b|\bgpu\b|thermal|overclock|underclock|\bapu\b|"
            r"battery(\s+life|\s+drain|\s+saving)?|"
            r"power\s*(limit|cap|saving|profile|draw)|"
            r"stutter|stuttering|boost\s*mode"
            r")\b",
            q,
            flags=re.IGNORECASE,
        )
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
) -> str:
    """Build the system message used for Ollama requests from game and attachment context."""
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
    core_identity = (
        "You are bonsAI, an expert system assistant embedded on a Steam Deck handheld. "
        "Always answer directly, concisely, and in English.\n\n"
    )
    game_context = (
        f"{game_line} {attachment_game_context_line} {attachment_name_context_line} {vdf_context_line} "
        f"{vision_line} {vision_priority_line} {genre_franchise_cue_line} {game_intent_line}\n\n"
    )
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
        return core_identity + game_context + hardware_tdp_appendix

    power_topic = _user_wants_power_or_performance_topic(question)
    followup = is_strategy_followup_question(question)
    if followup:
        strategy_block = (
            "\n\nSTRATEGY GUIDE MODE (active — follow-up turn):\n"
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

    out = core_identity + game_context + strategy_block

    if followup:
        if power_topic:
            out += "\n\n" + hardware_tdp_appendix
        else:
            out += (
                "\n\nDECK POWER / TDP (strategy follow-up): The branch message is gameplay-focused. "
                "Unless the user explicitly asks about FPS, TDP, watts, GPU MHz, battery drain, or thermal tuning in this message, "
                "do not discuss Deck power limits at length and do not output the ```json TDP recommendation block.\n"
            )
    else:
        if power_topic:
            out += (
                "\n\nTDP JSON ON THIS FIRST STRATEGY TURN: The user asked about performance or power. "
                "If you recommend TDP/GPU changes, output the required ```json ... ``` block on its own lines immediately above "
                "the opening ```bonsai-strategy-branches line. The branch fence remains last; no characters after its closing ```.\n\n"
            )
            out += hardware_tdp_appendix
        else:
            out += (
                "\n\nDECK POWER / TDP (strategy first turn): The user did not ask about performance, FPS, TDP, watts, "
                "GPU clock, battery tuning, or thermal limits. Do not open with hardware or power talk. "
                "Do not output the ```json TDP/GPU recommendation block on this reply. Focus on gameplay coaching and the branch fence.\n"
            )

    return out


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
) -> dict:
    """Execute one Ollama chat request attempt and return a normalized success/error payload."""
    # Strategy replies include branching JSON plus optional cheat section — allow more tokens than speed/deep defaults.
    num_predict = 900 if ask_mode == "strategy" else 500
    body_dict = {
        "model": model_name,
        "messages": messages,
        "stream": False,
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
        url, model_name, len(payload),
    )
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=request_timeout_seconds) as resp:
            raw = resp.read().decode("utf-8")
            data = json.loads(raw)
            text = data.get("message", {}).get("content", "No response text.")
            assistant_raw = text
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
        logger.exception("ask_ollama: unexpected error model=%s", model_name)
        return {
            "success": False,
            "response": f"Ollama request failed for model '{model_name}'. Check the Deck plugin log.",
        }
