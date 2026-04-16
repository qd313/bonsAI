import json
import re
import socket
import urllib.error
import urllib.request
from typing import Any, Callable


def build_system_prompt(
    question: str,
    app_id: str,
    app_name: str,
    normalized_attachments: list,
    prepared_images: list,
    lookup_app_name: Callable[[str], str],
    lookup_screenshot_vdf_metadata: Callable[[str], dict],
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
        "If the title hint says Ship of Harkinian, treat it as an Ocarina of Time remake/reimplementation context."
    )
    user_game_intent = bool(re.search(r"\b(game|title|level|boss|area)\b", question or "", flags=re.IGNORECASE))
    game_intent_line = (
        "The user is asking about the game itself. Focus first on in-game UI, world art style, HUD motifs, character design, "
        "and objective text. Minimize Steam overlay/plugin UI mentions unless absolutely necessary."
        if user_game_intent
        else "If the user asks about gameplay context, prioritize game-specific visual cues over Steam UI."
    )
    return (
        "You are bonsAI, an expert system assistant embedded on a Steam Deck handheld. "
        "Always answer directly, concisely, and in English. "
        "The Steam Deck APU supports a TDP range of 3-15 watts and GPU clock of 200-1600 MHz. "
        "Never suggest power values outside these hardware limits. "
        f"{game_line} {attachment_game_context_line} {attachment_name_context_line} {vdf_context_line} {vision_line} {vision_priority_line} {genre_franchise_cue_line} {game_intent_line}\n\n"
        "IMPORTANT: When you recommend or apply a TDP or GPU clock change, you MUST include this exact JSON block in your response:\n"
        '```json\n{"tdp_watts": <int 3-15>, "gpu_clock_mhz": <int 200-1600 or null>}\n```\n'
        "Without this JSON block, the change will NOT be applied. Only include it when actively recommending a change."
    )


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
) -> dict:
    """Execute one Ollama chat request attempt and return a normalized success/error payload."""
    body_dict = {
        "model": model_name,
        "messages": messages,
        "stream": False,
        "keep_alive": -1,
        "options": {
            "num_predict": 500,
            "temperature": 0.4,
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
            text = format_ai_response(
                text,
                normalized_attachments,
                prepared_images,
                attachment_errors,
            )
            if attachment_warnings:
                logger.info("ask_ollama: attachment warnings: %s", "; ".join(attachment_warnings))
            logger.info(
                "ask_ollama: OK model=%s response_len=%d first_200=%r",
                model_name, len(text), text[:200],
            )
            return {
                "success": True,
                "response": text,
                "model": model_name,
                "assistant_raw": assistant_raw,
            }
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return {
            "success": False,
            "response": f"HTTP {e.code} from {url} using model '{model_name}': {body}",
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
            "response": f"Failed to reach {url} using model '{model_name}': {e}",
        }
    except Exception as e:
        return {
            "success": False,
            "response": f"Failed to reach {url} using model '{model_name}': {e}",
        }
