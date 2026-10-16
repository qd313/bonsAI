"""Title: The voice input buttons the screen calls

Purpose: This is the code behind typing a question by talking (install the engine,
start/stop/poll a recording). Every function here is a straight hand-off from a method
of the same name on the plugin class in main.py -- the class keeps the method so the
screen's call still works, and the method's body just calls the matching function here.

Used for: get_voice_engine_status, install_voice_engine, get_voice_install_status,
start_voice_transcription, stop_voice_transcription, get_voice_transcription_status.

Solves: Keeps the Settings screen's Voice input panel out of main.py, next to the
download/session-lifecycle code the other background-job features in this plugin already
use.

Does not: Do the actual speech-to-text work, or install/download anything itself --
`voice_transcription_service.py` and `voice_whisper_daemon.py` do that. Stopping a transcription session that has
nothing to do with a running Ask -- e.g. on plugin unload, or when the microphone
permission is revoked mid-save -- stays a small helper on the Plugin class itself
(``_stop_voice_transcription_internal``), since main.py's lifecycle and settings-save
code call it directly too; only the RPC-facing calls to it moved here.
"""

import asyncio
from typing import Any

from backend.services.async_background_job import (
    make_state_updating_on_stage,
    new_threading_cancel_event,
)
from backend.services.capabilities import capability_enabled, downloads_off_refusal
from backend.services.transparency_service import build_voice_transcribe_snapshot
from backend.services.voice_model_download_service import (
    VALID_VOICE_STT_MODELS,
    install_in_progress_refusal,
    model_file_complete,
)
from backend.services.voice_transcription_service import (
    VoiceTranscriptionSession,
    download_voice_model,
    engine_readiness,
    install_whisper_cli,
    new_voice_install_state,
    new_voice_transcription_state,
    sanitize_voice_stt_model,
)

import decky

logger = decky.logger


async def _require_microphone_access(self) -> tuple[bool, dict[str, Any]]:
    settings = await self.load_settings()
    if not capability_enabled(settings, "microphone_access"):
        return False, {
            "accepted": False,
            "error": "permission_denied",
            "reason": "Enable Voice input (microphone) in the Permissions tab first.",
        }
    return True, {}


async def get_voice_engine_status(self, PLUGIN_ROOT: str):
    """Return whisper binary + model readiness for the configured STT model."""
    settings = await self.load_settings()
    model_id = sanitize_voice_stt_model(settings.get("voice_stt_model"))
    ready = engine_readiness(PLUGIN_ROOT, decky.DECKY_PLUGIN_SETTINGS_DIR, model_id)
    install = dict(self._voice_install_state)
    # Both speech models, not only the chosen one: Browse models' "Install the starter set" button stays
    # while either is missing.
    speech_models_ready = {
        m: model_file_complete(PLUGIN_ROOT, decky.DECKY_PLUGIN_SETTINGS_DIR, m) for m in sorted(VALID_VOICE_STT_MODELS)
    }
    return {**ready, "install": install, "speech_models_ready": speech_models_ready}


async def install_voice_engine(self, PLUGIN_ROOT: str, model_id: str = ""):
    """Install whisper-cli (podman) and download the selected GGUF model (requires microphone_access)."""
    ok_gate, gate_out = await _require_microphone_access(self)
    if not ok_gate:
        return gate_out or {"accepted": False, "reason": "permission_denied"}

    settings = await self.load_settings()
    if not capability_enabled(settings, "internet_downloads"):
        # The engine image (ghcr.io) and the model (huggingface.co) are both downloads.
        return downloads_off_refusal()
    mid = sanitize_voice_stt_model(model_id or settings.get("voice_stt_model"))
    async with self._voice_install_lock:
        existing = self._voice_install_task
        if existing is not None and not existing.done():
            return {"accepted": False, "reason": "Voice engine install already running.", "error": "busy"}

        self._voice_install_cancel = new_threading_cancel_event()
        self._voice_install_state = new_voice_install_state()
        self._voice_install_state.update(
            {"phase": "running", "done": False, "accepted": True, "model_id": mid}
        )

        on_stage = make_state_updating_on_stage(self._voice_install_state)

        async def runner() -> None:
            try:
                await asyncio.to_thread(
                    install_whisper_cli,
                    PLUGIN_ROOT,
                    decky.DECKY_PLUGIN_SETTINGS_DIR,
                    self._voice_install_state,
                    self._voice_install_cancel,
                    on_stage,
                )
                await asyncio.to_thread(
                    download_voice_model,
                    PLUGIN_ROOT,
                    decky.DECKY_PLUGIN_SETTINGS_DIR,
                    mid,
                    self._voice_install_state,
                    self._voice_install_cancel,
                    on_stage,
                )
            except Exception as exc:
                self._voice_install_state.update(
                    {"phase": "failed", "done": True, "error": str(exc)[:500]}
                )

        self._voice_install_task = asyncio.create_task(runner())

    await self._maybe_app_log("voice.install", "voice engine install accepted", fields={"model_id": mid})
    return {"accepted": True, "model_id": mid}


async def get_voice_install_status(self):
    """Poll voice model download progress."""
    return dict(self._voice_install_state)


def _log_start_refused(model_id: str, error: str) -> None:
    """One plain line in the plugin log: a microphone press reached the back end and was refused."""
    logger.info("voice: recording start refused (%s), model %s", error, model_id)


async def start_voice_transcription(self, PLUGIN_ROOT: str, game_running: bool = False):
    """Start PipeWire/Pulse capture and local whisper interim transcription.

    `game_running` is the screen's word that a game was running when the mic was pressed: the live
    words then rest between passes to keep the game smooth, and without a game they come as fast as
    the engine can make them. An old screen that sends nothing counts as "no game".

    Every outcome writes one plain line through the ordinary logger (the activity log is off by
    default), so the plugin log file shows whether a microphone press arrived.
    """
    ok_gate, gate_out = await _require_microphone_access(self)
    if not ok_gate:
        settings = await self.load_settings()
        _log_start_refused(sanitize_voice_stt_model(settings.get("voice_stt_model")), "permission_denied")
        return gate_out or {"accepted": False, "reason": "permission_denied"}

    settings = await self.load_settings()
    model_id = sanitize_voice_stt_model(settings.get("voice_stt_model"))
    ready = engine_readiness(PLUGIN_ROOT, decky.DECKY_PLUGIN_SETTINGS_DIR, model_id)
    # A model (or the engine) that is still being installed is "not ready yet", not "not installed".
    busy = install_in_progress_refusal(
        PLUGIN_ROOT,
        decky.DECKY_PLUGIN_SETTINGS_DIR,
        model_id,
        self._voice_install_state,
        bool(ready.get("model_ready")),
        bool(ready.get("binary_ready")),
    )
    if busy is not None:
        _log_start_refused(model_id, str(busy["error"]))
        return busy
    if not ready.get("binary_ready"):
        _log_start_refused(model_id, "engine_missing")
        return {
            "accepted": False,
            "error": "engine_missing",
            "reason": (
                "whisper-cli is not installed. Open Settings → Voice input and tap "
                "Install voice engine (downloads whisper-cli + model)."
            ),
        }
    if not ready.get("model_ready"):
        _log_start_refused(model_id, "model_missing")
        return {
            "accepted": False,
            "error": "model_missing",
            "reason": f"Download the {model_id} voice model in Settings → Voice input first.",
        }

    async with self._voice_lock:
        if self._voice_session is not None:
            st = self._voice_session.status()
            if st.get("recording"):
                logger.info("voice: recording start accepted, one was already running, model %s", model_id)
                return {"accepted": True, "status": st}
            old = self._voice_session
            self._voice_session = None
        else:
            old = None
    if old is not None:
        # An earlier recording that is still finishing its final read is waited for here (force_stop
        # joins the same worker), so the new recording never takes the engine out from under it.
        await asyncio.to_thread(old.force_stop)

    async with self._voice_lock:
        session = VoiceTranscriptionSession(
            PLUGIN_ROOT,
            decky.DECKY_PLUGIN_SETTINGS_DIR,
            model_id,
            logger,
            game_running=bool(game_running),
        )
        out = await asyncio.to_thread(session.start)
        if out.get("accepted"):
            self._voice_session = session
        else:
            self._voice_session = None

    if not out.get("accepted"):
        _log_start_refused(model_id, str(out.get("error") or out.get("reason") or "not_accepted")[:200])
    else:
        logger.info(
            "voice: recording started, model %s, %s",
            model_id,
            "game running" if game_running else "no game",
        )
        await self._persist_input_transparency(build_voice_transcribe_snapshot(model_id=model_id))
        await self._maybe_app_log(
            "voice.start",
            "voice transcription started",
            fields={"model_id": model_id},
        )
    return out


async def stop_voice_transcription(self):
    """Stop capture, read the whole recording once, and return that final transcript.

    Returns only when the final text is ready (the screen calls this with no deadline). The session
    stays registered until then: a start that arrives meanwhile finds it, waits for it to finish,
    and only then opens a new recording, so two recordings never share the speech engine.
    """
    async with self._voice_lock:
        session = self._voice_session
    if session is None:
        logger.info("voice: stop pressed, no recording was running")
        return {
            "stopped": True,
            "status": "idle",
            "finalized_transcript": "",
            "partial_transcript": "",
        }
    out = await asyncio.to_thread(session.stop)
    async with self._voice_lock:
        # A newer start may already have replaced it; leave that one alone.
        if self._voice_session is session:
            self._voice_session = None
    logger.info(
        "voice: recording stopped, transcript %d characters",
        len(str(out.get("finalized_transcript") or "")),
    )
    await self._maybe_app_log(
        "voice.stop",
        "voice transcription stopped",
        fields={"transcript_len": len(str(out.get("finalized_transcript") or ""))},
    )
    return out


async def get_voice_transcription_status(self):
    """Poll interim/final transcript while recording."""
    settings = await self.load_settings()
    if not capability_enabled(settings, "microphone_access"):
        await self._stop_voice_transcription_internal()
        return {
            **new_voice_transcription_state(),
            "status": "permission_denied",
            "error": "Microphone permission revoked.",
            "recording": False,
            "streaming": False,
        }

    async with self._voice_lock:
        session = self._voice_session
    if session is None:
        return new_voice_transcription_state()
    st = await asyncio.to_thread(session.status)
    st["streaming"] = bool(st.get("recording")) and (
        bool(st.get("partial_transcript")) or bool(st.get("finalized_transcript"))
    )
    return st
