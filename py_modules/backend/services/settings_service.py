"""Title: Reading and cleaning up your saved settings

Purpose: Every toggle and choice you make on the plugin's settings screens --
Permissions, Ask behavior, voice, the knowledge base, and the rest -- lives in
one file on disk, settings.json. This is what reads that file, and the one
place that decides what a saved value is allowed to be: a switch that was
never explicitly turned on stays off, a choice that no longer exists falls
back to its default, and a setting from an older version of the plugin is
carried forward to its new name instead of quietly vanishing.

Used for: main.py's settings handlers -- the questions the screen can ask to
load or save your settings -- on every load and every save. Also read
directly by ollama_ask_service for two settings -- reply style and
keep-alive -- that are checked often enough to skip going through the whole
settings object.

Solves: Turning whatever is actually sitting in settings.json -- which could
be missing, from an older version, or hand-edited into something invalid --
into a settings object every other file in the plugin can trust completely,
and writing it back to disk without risking a half-written file if the
plugin closes mid-save.

Does not: Show the settings screens, or push a changed setting to the screen
after it is saved -- that is the frontend's job. This file only cleans up and
stores.

How it works:
 1. Most settings are one of a few repeating shapes -- an on/off switch, a
    pick from a fixed list, a bounded piece of text -- built by
    `_bool_default_false()`, `_bool_default_true()`, `_enum()`,
    `_bounded_str()` and `_coerced_str()`. Each setting that fits one of
    these shapes is one row in the `_SIMPLE_FIELDS` table rather than its
    own function.
 2. A setting whose rule needs something more -- another setting's value, an
    old name it migrated from, a nested structure, or a caller-supplied list
    of valid choices -- gets its own function instead
    (`sanitize_preset_chip_animation()`, `sanitize_show_developer_tab()`,
    `sanitize_named_ollama_hosts()`, and others), and is applied by hand
    rather than through the table.
 3. `sanitize_settings()` runs every simple field through its table entry,
    then layers the special-case settings on top, including pairs that
    depend on each other -- the latency warning must stay below the request
    timeout (`_reconcile_latency_warning_before_timeout()`), and the model
    tier and its unlock flag are reconciled together
    (`reconcile_model_policy_tier()`).
 4. `load_settings()` reads settings.json and runs it through
    `sanitize_settings()`. For an install from before the Permissions tab
    existed, it grants the three permissions the plugin was already using at
    the time (writing files, reading the screenshot library, reading Steam's
    logs) rather than silently switching everything off -- but not the other
    two, Steam Web API and the microphone, which stay off even for an old
    install (see capabilities.py for why).
 5. `save_settings()` merges an incoming change into what is already saved,
    cleans up the result the same way, and writes it to a temporary file
    that is only swapped into place once the write has finished, so a crash
    mid-save cannot leave settings.json half-written.

Gotchas:
 - `preset_chip_fade_animation_enabled` is kept only because the screen
   still reads it. It is worked out from `preset_chip_animation` rather than
   saved on its own, because saving it independently could disagree with the
   setting it is meant to describe.
 - A setting removed or renamed in a newer version does not vanish silently.
   `sanitize_preset_chip_animation()` and `sanitize_show_developer_tab()` are
   two examples of a value from an older install being carried forward to
   its replacement, rather than falling back to the default -- which would
   otherwise look to the person like the setting had reset itself.
"""

import json
import os
import re
from typing import Any, Callable

from backend.services.ai_character_service import (
    sanitize_ai_character_accent_intensity,
    sanitize_ai_character_custom_text,
    sanitize_ai_character_enabled,
    sanitize_ai_character_preset_id,
    sanitize_ai_character_random,
)
from backend.services.capabilities import legacy_grandfather_capabilities, sanitize_capabilities
from backend.services.model_policy import reconcile_model_policy_tier
from backend.services.reply_language_service import sanitize_reply_language
from backend.services.voice_transcription_service import sanitize_voice_stt_model

UI_SCALE_PROFILE_IDS = frozenset({"handheld", "desktop", "couch", "immersive"})
DEFAULT_UI_SCALE_MANUAL_PROFILE = "handheld"


# --- field kinds -------------------------------------------------------------
# Most settings are one of a handful of boring shapes. These build the coercer for a
# shape so `_SIMPLE_FIELDS` below can declare a setting in one row rather than a
# hand-written function. Settings whose rules are genuinely their own -- the two legacy
# migrations, the latency/timeout pair, model policy, capabilities, named hosts, routing
# order -- stay as functions further down, on purpose. A row that needs a special case is
# a sign it belongs there instead.
#
# The exact predicates matter and are not interchangeable: `is True` and `is not False`
# differ for every non-boolean value, and the two string kinds differ for non-strings.


def _bool_default_false(value: Any) -> bool:
    """Off unless the value is exactly ``True`` -- any other type stays off."""
    return value is True


def _bool_default_true(value: Any) -> bool:
    """On unless the user explicitly saved ``False`` -- a missing key stays on."""
    return value is not False


def _enum(options: frozenset[str], default: str, *, strip: bool = False, lower: bool = False):
    """Membership in ``options`` or the default. ``strip``/``lower`` normalize first."""

    def _coerce(value: Any) -> str:
        if isinstance(value, str):
            candidate = value
            if strip:
                candidate = candidate.strip()
            if lower:
                candidate = candidate.lower()
            if candidate in options:
                return candidate
        return default

    return _coerce


def _bounded_str(max_len: int):
    """Trimmed and length-capped. A non-string is rejected outright, not stringified."""

    def _coerce(value: Any) -> str:
        if not isinstance(value, str):
            return ""
        return value.strip()[:max_len]

    return _coerce


def _coerced_str(max_len: int):
    """As ``_bounded_str`` but stringifies non-strings, so ``123`` becomes ``"123"``.

    Kept distinct because ``rag_corpus_version`` has always behaved this way and a version
    written as a number would otherwise start coming back empty.
    """

    def _coerce(value: Any) -> str:
        return str(value or "").strip()[:max_len]

    return _coerce


def clamp_int(value: Any, default: int, minimum: int, maximum: int) -> int:
    """Coerce an arbitrary value to int and clamp it to an inclusive range."""
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default
    return max(minimum, min(maximum, parsed))


def sanitize_unified_input_persistence_mode(
    value: Any,
    valid_modes: set[str],
    default_mode: str,
) -> str:
    """Validate persistence mode strings and fall back to the configured default."""
    if isinstance(value, str) and value in valid_modes:
        return value
    return default_mode


def sanitize_ask_mode(
    value: Any,
    valid_modes: set[str],
    default_mode: str,
) -> str:
    """Validate main-tab Ask mode strings and fall back to the configured default."""
    if value == "deep":
        value = "expert"
    if isinstance(value, str) and value in valid_modes:
        return value
    return default_mode


_VALID_DESKTOP_APP_LOG_LEVELS = frozenset({"off", "default", "verbose"})

_VALID_PRESET_CHIP_ANIMATION = frozenset({"fade", "carousel", "static", "decode"})

# Which tab a reopen lands on -- one value per option in roadmap D15. Read only by the
# frontend; the backend's job here is to let the key survive a save_settings round trip.
_VALID_TAB_RESUME_MODES = frozenset({"always_main", "resume", "resume_recent"})
DEFAULT_TAB_RESUME_MODE = "resume"

# How much hidden reasoning to ask the model for. Values match ASK_THINKING_BUDGET in
# ollama_ask_budgets; the wire value is a boolean either way (D21). Defaults off: thinking
# costs latency and tokens, and an unrecognised value must not turn it on.
_VALID_ASK_THINK_EFFORTS = frozenset({"off", "low", "medium", "high"})
DEFAULT_ASK_THINK_EFFORT = "off"


def sanitize_preset_chip_animation(value: Any, legacy_fade: Any) -> str:
    """Main-tab preset chip animation mode; migrates from legacy fade boolean when unset.

    ``stream`` was retired by the Ghost in the Shell chip-decode rewrite. A Deck whose
    settings.json still holds it maps forward to ``decode`` rather than falling through to the
    ``fade`` default below -- a silent downgrade to fade would read as "the setting reset itself."
    Python is authoritative here (D13); ``normalizePresetChipAnimation`` in
    bonsaiSettingsNormalizers.ts mirrors this exact mapping.
    """
    if isinstance(value, str):
        t = value.strip()
        if t == "stream":
            return "decode"
        if t in _VALID_PRESET_CHIP_ANIMATION:
            return t
    if legacy_fade is False:
        return "static"
    return "fade"


STEAM_WEB_API_KEY_MAX_LEN = 128


def sanitize_show_developer_tab(value: Any, legacy_show_debug_tab: Any = None) -> bool:
    """Only explicit ``true`` shows the Developer tab; legacy ``show_debug_tab`` migrates on read."""
    if value is True:
        return True
    if legacy_show_debug_tab is True:
        return True
    return False


def sanitize_model_routing_order(value: Any) -> list[str]:
    """Dedupe Ollama tags for text/vision try-order lists (max 16)."""
    from backend.ollama_routing import MAX_MODEL_ROUTING_ORDER_LEN
    from backend.services.ollama_catalog_service import normalize_ollama_pull_tags

    return normalize_ollama_pull_tags(value)[:MAX_MODEL_ROUTING_ORDER_LEN]


MAX_NAMED_OLLAMA_HOSTS = 4

# Frozen test chips: a QA batch pinned into the preset carousel. Twelve is four full carousels,
# which is more than any single docs/testing.md row needs; the cap exists so a malformed write
# cannot put an unbounded list in front of the sampler. The length cap matches what a chip can
# show without the QAM column clipping it -- a question longer than this is not testable anyway.
MAX_FROZEN_TEST_CHIPS = 12
FROZEN_TEST_CHIP_MAX_LEN = 160
NAMED_OLLAMA_HOST_LABEL_MAX = 32
NAMED_OLLAMA_HOST_VALUE_MAX = 128


def sanitize_frozen_test_chips(value: Any) -> list[str]:
    """QA-only: exact questions pinned into the preset carousel, in order.

    Free text on purpose. The carousel's older compile-time freeze resolved each entry against
    the built-in preset list and skipped anything that did not match, which made it useless for
    the questions QA actually runs -- those are not built-in presets. Order is preserved because
    a testing.md row is a sequence, and duplicates are dropped because a repeated chip wastes a
    carousel slot the tester is trying to step through.
    """
    if not isinstance(value, list):
        return []
    out: list[str] = []
    seen: set[str] = set()
    for item in value:
        if len(out) >= MAX_FROZEN_TEST_CHIPS:
            break
        if not isinstance(item, str):
            continue
        text = item.strip()[:FROZEN_TEST_CHIP_MAX_LEN]
        if not text or text in seen:
            continue
        seen.add(text)
        out.append(text)
    return out


def sanitize_named_ollama_hosts(value: Any) -> list[dict[str, str]]:
    """Up to four labeled ``host:port`` presets for quick Connection switching."""
    if not isinstance(value, list):
        return []
    out: list[dict[str, str]] = []
    for item in value:
        if len(out) >= MAX_NAMED_OLLAMA_HOSTS:
            break
        if not isinstance(item, dict):
            continue
        label = item.get("label")
        host = item.get("host")
        if not isinstance(label, str) or not isinstance(host, str):
            continue
        lab = label.strip()[:NAMED_OLLAMA_HOST_LABEL_MAX]
        h = host.strip()[:NAMED_OLLAMA_HOST_VALUE_MAX]
        if not lab or not h:
            continue
        out.append({"label": lab, "host": h})
    return out


REQUEST_TIMEOUT_RECONCILE_STEP_SECONDS = 10

OLLAMA_KEEP_ALIVE_OPTIONS = frozenset(
    {
        "0s",
        "15s",
        "30s",
        "1m",
        "2m",
        "3m",
        "5m",
        "15m",
        "30m",
        "45m",
        "60m",
        "120m",
        "240m",
    }
)
DEFAULT_OLLAMA_KEEP_ALIVE = "5m"

REPLY_VERBOSITY_OPTIONS = frozenset({"caveman", "balanced", "detailed"})
DEFAULT_REPLY_VERBOSITY = "balanced"


_reply_verbosity_field = _enum(REPLY_VERBOSITY_OPTIONS, DEFAULT_REPLY_VERBOSITY)
_ollama_keep_alive_field = _enum(OLLAMA_KEEP_ALIVE_OPTIONS, DEFAULT_OLLAMA_KEEP_ALIVE)


# These two are the only field-table entries that also have callers outside this module
# (``ollama_ask_service`` reads both straight off the settings dict), so they keep a named
# function rather than living only as a row.
def sanitize_reply_verbosity(value: Any) -> str:
    """Validate global reply prose style; migrate legacy short → caveman; balanced = no inject."""
    if isinstance(value, str) and value.strip().lower() == "short":
        value = "caveman"
    return _reply_verbosity_field(value)


def sanitize_ollama_keep_alive(value: Any) -> str:
    """Validate Ollama keep_alive duration tokens and fall back to the plugin default."""
    return _ollama_keep_alive_field(value)


def _reconcile_latency_warning_before_timeout(
    latency: int,
    timeout: int,
    *,
    min_latency: int,
    max_latency: int,
    max_timeout: int,
) -> tuple[int, int]:
    """Ensure latency warning is strictly less than request timeout (matches frontend)."""
    if latency < timeout:
        return latency, timeout
    t = timeout
    while latency >= t and t < max_timeout:
        t = min(max_timeout, t + REQUEST_TIMEOUT_RECONCILE_STEP_SECONDS)
    if latency < t:
        return latency, t
    w = latency
    while w >= t and w > min_latency:
        w -= 5
    if w >= t:
        w = max(min_latency, min(max_latency, t - 5))
    return w, t


def resolve_screenshot_attachment_preset(data: Any, default_preset: str) -> str:
    """Prefer screenshot_attachment_preset; map legacy screenshot_max_dimension when absent."""
    if not isinstance(data, dict):
        return default_preset
    p = data.get("screenshot_attachment_preset")
    if isinstance(p, str) and p in ("low", "mid", "max"):
        return p
    dim = data.get("screenshot_max_dimension")
    try:
        di = int(dim)
    except (TypeError, ValueError):
        return default_preset
    if di == 1920:
        return "mid"
    if di == 3160:
        return "max"
    return "low"


def sanitize_rag_corpus_path(value: Any) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""
    # Reject obvious traversal; install flow sets absolute paths under home/SD.
    if ".." in raw.replace("\\", "/"):
        return ""
    return raw[:512]


# --- the field table ---------------------------------------------------------
# One row per setting whose rule is a plain shape. Adding such a setting is one row here
# plus one in the TypeScript table; `tests/contracts/settings-defaults.json` fails if the
# two disagree. Anything needing a legacy migration, another field's value, or a nested
# structure is deliberately absent -- see the functions above and `sanitize_settings` below.
_SIMPLE_FIELDS: dict[str, Any] = {
    # Developer and Desktop logging opt-ins.
    "desktop_debug_note_auto_save": _bool_default_false,
    "desktop_ask_verbose_logging": _bool_default_false,
    "show_onscreen_debug_hud": _bool_default_false,
    # QA only: forces every eligible preset-carousel slot to a session RAG chip.
    "dev_force_session_rag_chips": _bool_default_false,
    # Speed-mode VRAM preload: warm the default Ask model at boot instead of on the first
    # question. Developer switch first (roadmap); off by default.
    "dev_preload_ask_model": _bool_default_false,
    # One suggestion chip instead of two (roadmap [chips]). Two stays the shipped default (D43).
    "preset_single_chip": _bool_default_false,
    "desktop_app_log_level": _enum(_VALID_DESKTOP_APP_LOG_LEVELS, "off", strip=True),
    # Defaults to "resume" rather than an off-like value: D15 option B is the locked
    # behavior, and this control exists to compare the alternatives, not to gate it.
    "tab_resume_mode": _enum(_VALID_TAB_RESUME_MODES, DEFAULT_TAB_RESUME_MODE, strip=True),
    # Ask behavior.
    "input_sanitizer_user_disabled": _bool_default_false,
    "latency_timeouts_custom_enabled": _bool_default_false,
    "reply_verbosity": sanitize_reply_verbosity,
    "ask_think_effort": _enum(_VALID_ASK_THINK_EFFORTS, DEFAULT_ASK_THINK_EFFORT, strip=True),
    "ollama_keep_alive": _ollama_keep_alive_field,
    # ``None`` means "never saved", which is off -- same result as any other non-``True``.
    "ollama_local_on_deck": _bool_default_false,
    # Off unless the person turns it on -- it changes how the Deck starts.
    "ollama_local_autostart": _bool_default_false,
    "model_allow_high_vram_fallbacks": _bool_default_false,
    # Presentation, defaulting on: only an explicit ``False`` turns these off.
    "strategy_spoiler_masking_enabled": _bool_default_true,
    "ui_scale_auto_enabled": _bool_default_true,
    "strategy_spoiler_auto_reveal_after_consent": _bool_default_false,
    "ui_scale_manual_profile": _enum(
        UI_SCALE_PROFILE_IDS, DEFAULT_UI_SCALE_MANUAL_PROFILE, strip=True, lower=True
    ),
    # Knowledge base.
    "use_local_knowledge_base": _bool_default_false,
    # Kill-switch for the vector half of retrieval. Defaults on: only an explicit ``False``
    # turns it off, and turning it off leaves keyword search fully working.
    "rag_hybrid_retrieval_enabled": _bool_default_true,
    "rag_corpus_version": _coerced_str(64),
    # Voice. Off unless the person turns it on -- an unrecognised value must not start reading
    # answers out loud on its own (D99 call 3).
    "voice_reply_mode": _enum(frozenset({"off", "voice_only", "always"}), "off", strip=True),
    # Credentials.
    "steam_web_api_key": _bounded_str(STEAM_WEB_API_KEY_MAX_LEN),
}


def sanitize_settings(
    data: Any,
    default_latency_warning_seconds: int,
    default_request_timeout_seconds: int,
    min_latency_warning_seconds: int,
    max_latency_warning_seconds: int,
    min_request_timeout_seconds: int,
    max_request_timeout_seconds: int,
    valid_persistence_modes: set[str],
    default_persistence_mode: str,
    valid_ask_modes: set[str],
    default_ask_mode: str,
) -> dict:
    """Normalize the full settings payload into a bounded, backend-safe settings object."""
    raw = data if isinstance(data, dict) else {}
    latency = clamp_int(
        raw.get("latency_warning_seconds"),
        default_latency_warning_seconds,
        min_latency_warning_seconds,
        max_latency_warning_seconds,
    )
    timeout = clamp_int(
        raw.get("request_timeout_seconds"),
        default_request_timeout_seconds,
        min_request_timeout_seconds,
        max_request_timeout_seconds,
    )
    latency, timeout = _reconcile_latency_warning_before_timeout(
        latency,
        timeout,
        min_latency=min_latency_warning_seconds,
        max_latency=max_latency_warning_seconds,
        max_timeout=max_request_timeout_seconds,
    )
    mp_tier, mp_unlock = reconcile_model_policy_tier(
        raw.get("model_policy_tier"), raw.get("model_policy_non_foss_unlocked")
    )
    preset_chip_animation = sanitize_preset_chip_animation(
        raw.get("preset_chip_animation"),
        raw.get("preset_chip_fade_animation_enabled"),
    )
    out: dict[str, Any] = {name: coerce(raw.get(name)) for name, coerce in _SIMPLE_FIELDS.items()}

    # Everything below needs something a table row cannot express: another field's value,
    # a legacy key, a nested structure, or a caller-supplied set of valid options.
    out.update(
        {
            # Clamped as a pair -- the warning must land below the timeout.
            "latency_warning_seconds": latency,
            "request_timeout_seconds": timeout,
            # Reconciled as a pair -- tier 3 requires the non-FOSS acknowledgment.
            "model_policy_tier": mp_tier,
            "model_policy_non_foss_unlocked": mp_unlock,
            # Valid options come from the Plugin class constants, not from this module.
            "unified_input_persistence_mode": sanitize_unified_input_persistence_mode(
                raw.get("unified_input_persistence_mode"),
                valid_persistence_modes,
                default_persistence_mode,
            ),
            "ask_mode": sanitize_ask_mode(raw.get("ask_mode"), valid_ask_modes, default_ask_mode),
            # Read a legacy key as well as their own.
            "screenshot_attachment_preset": resolve_screenshot_attachment_preset(raw, "low"),
            "preset_chip_animation": preset_chip_animation,
            # Deprecated, and derived from the live field rather than read independently.
            #
            # D13 resolved the TS/Python split here **towards TypeScript**, against the general
            # "Python is authoritative" rule, because reading this key on its own produces a
            # self-contradictory payload: ``preset_chip_animation: "carousel"`` alongside
            # ``preset_chip_fade_animation_enabled: True`` says fades are on while a non-fade
            # animation is selected. The frontend already derived it on both the normalize and
            # the save path (``settingsPayload.ts``), so Python was the odd one out.
            #
            # Harmless where it is consumed: ``MainTabPresetRow`` gates on
            # ``presetChipAnimation === "fade" && presetChipFadeAnimationEnabled``, so the flag
            # is only ever read when the animation is already ``fade``.
            "preset_chip_fade_animation_enabled": preset_chip_animation == "fade",
            "show_developer_tab": sanitize_show_developer_tab(
                raw.get("show_developer_tab"), raw.get("show_debug_tab")
            ),
            # Structured or list-valued.
            "capabilities": sanitize_capabilities(raw.get("capabilities")),
            "named_ollama_hosts": sanitize_named_ollama_hosts(raw.get("named_ollama_hosts")),
            "dev_frozen_test_chips": sanitize_frozen_test_chips(raw.get("dev_frozen_test_chips")),
            "text_model_routing_order": sanitize_model_routing_order(raw.get("text_model_routing_order")),
            "vision_model_routing_order": sanitize_model_routing_order(
                raw.get("vision_model_routing_order")
            ),
            # Path validation beyond a length cap (traversal rejection).
            "rag_corpus_path": sanitize_rag_corpus_path(raw.get("rag_corpus_path")),
            # Owned by another service; imported rather than redefined here.
            "ai_character_enabled": sanitize_ai_character_enabled(raw.get("ai_character_enabled")),
            "ai_character_random": sanitize_ai_character_random(raw.get("ai_character_random")),
            "ai_character_preset_id": sanitize_ai_character_preset_id(raw.get("ai_character_preset_id")),
            "ai_character_custom_text": sanitize_ai_character_custom_text(
                raw.get("ai_character_custom_text")
            ),
            "ai_character_accent_intensity": sanitize_ai_character_accent_intensity(
                raw.get("ai_character_accent_intensity")
            ),
            "reply_language": sanitize_reply_language(raw.get("reply_language")),
            "voice_stt_model": sanitize_voice_stt_model(raw.get("voice_stt_model")),
        }
    )
    return out


def load_settings(path: str, sanitize_func: Callable[[Any], dict], logger: Any) -> dict:
    """Read settings from disk and return a sanitized settings object on every path.

    If the file exists but has no ``capabilities`` object (legacy installs), all capability
    toggles are grandfathered to True until the user saves explicit values.
    """
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            logger.warning("load_settings: expected object in %s, got %s", path, type(data).__name__)
            return sanitize_func({})
        sanitized = sanitize_func(data)
        if "capabilities" not in data or not isinstance(data.get("capabilities"), dict):
            sanitized = {**sanitized, "capabilities": legacy_grandfather_capabilities()}
        return sanitized
    except FileNotFoundError:
        return sanitize_func({})
    except Exception as exc:
        logger.warning("load_settings: failed to read %s: %s", path, exc)
        return sanitize_func({})


def save_settings(
    path: str,
    settings_dir: str,
    incoming: Any,
    current: dict,
    sanitize_func: Callable[[Any], dict],
    logger: Any,
) -> dict:
    """Persist merged settings and return the sanitized payload that was written."""
    payload = incoming if isinstance(incoming, dict) else {}
    merged = {**current, **payload}
    sanitized = sanitize_func(merged)
    try:
        os.makedirs(settings_dir, exist_ok=True)
        tmp_path = f"{path}.tmp"
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(sanitized, f, indent=2, sort_keys=True)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, path)
        return sanitized
    except Exception as exc:
        logger.exception("save_settings: failed to write %s", path)
        raise RuntimeError(f"Failed to save settings: {exc}") from exc
