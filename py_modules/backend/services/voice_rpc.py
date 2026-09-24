"""Title: The voice input and read-aloud buttons the screen calls

Purpose: This is the code behind two related but separate voice features: typing a
question by talking (install the engine, start/stop/poll a recording) and having an
answer read back out loud (start/stop/poll a reading). Every function here is a
straight hand-off from a method of the same name on the plugin class in main.py -- the
class keeps the method so the screen's call still works, and the method's body just
calls the matching function here.

Used for: get_voice_engine_status, install_voice_engine, get_voice_install_status,
start_voice_transcription, stop_voice_transcription, get_voice_transcription_status,
start_voice_read_aloud, stop_voice_read_aloud, get_voice_read_aloud_status.

Solves: Keeps the Settings screen's Voice input panel and the answer's read-aloud
button out of main.py, next to the download/session-lifecycle code the other
background-job features in this plugin already use.

Does not: Do the actual speech-to-text or text-to-speech work, or install/download
anything itself -- `voice_transcription_service.py`, `voice_whisper_daemon.py` and
`voice_read_aloud_service.py` do that. Stopping a transcription session that has
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
from backend.services.capabilities import capability_enabled
from backend.services.transparency_service import build_voice_transcribe_snapshot
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


async def get_voice_engine_status(self, PLUGIN_ROOT: str) -> dict:
    """Return whisper binary + model readiness for the configured STT model."""
    settings = await self.load_settings()
    model_id = sanitize_voice_stt_model(settings.get("voice_stt_model"))
    ready = engine_readiness(PLUGIN_ROOT, decky.DECKY_PLUGIN_SETTINGS_DIR, model_id)
    install = dict(self._voice_install_state)
    return {**ready, "install": install}


async def install_voice_engine(self, PLUGIN_ROOT: str, model_id: str = "") -> dict:
    """Install whisper-cli (podman) and download the selected GGUF model (requires microphone_access)."""
    ok_gate, gate_out = await _require_microphone_access(self)
    if not ok_gate:
        return gate_out or {"accepted": False, "reason": "permission_denied"}

    settings = await self.load_settings()
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


async def get_voice_install_status(self) -> dict:
    """Poll voice model download progress."""
    return dict(self._voice_install_state)


async def start_voice_transcription(self, PLUGIN_ROOT: str) -> dict:
    """Start PipeWire/Pulse capture and local whisper interim transcription."""
    ok_gate, gate_out = await _require_microphone_access(self)
    if not ok_gate:
        return gate_out or {"accepted": False, "reason": "permission_denied"}

    settings = await self.load_settings()
    model_id = sanitize_voice_stt_model(settings.get("voice_stt_model"))
    ready = engine_readiness(PLUGIN_ROOT, decky.DECKY_PLUGIN_SETTINGS_DIR, model_id)
    if not ready.get("binary_ready"):
        return {
            "accepted": False,
            "error": "engine_missing",
            "reason": (
                "whisper-cli is not installed. Open Settings → Voice input and tap "
                "Install voice engine (downloads whisper-cli + model)."
            ),
        }
    if not ready.get("model_ready"):
        return {
            "accepted": False,
            "error": "model_missing",
            "reason": f"Download the {model_id} voice model in Settings → Voice input first.",
        }

    async with self._voice_lock:
        if self._voice_session is not None:
            st = self._voice_session.status()
            if st.get("recording"):
                return {"accepted": True, "status": st}
            old = self._voice_session
            self._voice_session = None
        else:
            old = None
    if old is not None:
        await asyncio.to_thread(old.force_stop)

    async with self._voice_lock:
        session = VoiceTranscriptionSession(
            PLUGIN_ROOT,
            decky.DECKY_PLUGIN_SETTINGS_DIR,
            model_id,
            logger,
        )
        out = await asyncio.to_thread(session.start)
        if out.get("accepted"):
            self._voice_session = session
        else:
            self._voice_session = None

    if out.get("accepted"):
        await self._persist_input_transparency(build_voice_transcribe_snapshot(model_id=model_id))
        await self._maybe_app_log(
            "voice.start",
            "voice transcription started",
            fields={"model_id": model_id},
        )
    return out


async def stop_voice_transcription(self) -> dict:
    """Stop capture and return finalized transcript."""
    async with self._voice_lock:
        session = self._voice_session
        self._voice_session = None
    if session is None:
        return {
            "stopped": True,
            "status": "idle",
            "finalized_transcript": "",
            "partial_transcript": "",
        }
    out = await asyncio.to_thread(session.stop)
    await self._maybe_app_log(
        "voice.stop",
        "voice transcription stopped",
        fields={"transcript_len": len(str(out.get("finalized_transcript") or ""))},
    )
    return out


async def get_voice_transcription_status(self) -> dict:
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


async def start_voice_read_aloud(self, text: str) -> dict:
    """Feature: read an answer's text aloud in the Deck's own voice.

    Input: plain text, already stripped of markdown and hidden spoiler blocks by the frontend
    (see plan 42 § 5, § 8 step 1 for the shared text helper). Output: {"ok", "sentence_count",
    "error"}. Returns at once — the reading itself runs in the background so no call here can
    outrun the RPC deadline. Starting while a previous reading is still going stops it first.
    """
    return await asyncio.to_thread(self._read_aloud_service.start, text)


async def stop_voice_read_aloud(self) -> dict:
    """Feature: stop reading aloud. Output: {"ok", "stopped"} — stopped is True only when a
    reading was actually in progress. Safe to call when nothing is playing."""
    return await asyncio.to_thread(self._read_aloud_service.stop)


async def get_voice_read_aloud_status(self) -> dict:
    """Feature: poll the read-aloud state while it plays in the background.

    Output: {"state": "idle"|"speaking"|"done"|"error", "sentence_index", "sentence_count",
    "error", "started_at"}.
    """
    return await asyncio.to_thread(self._read_aloud_service.status)
