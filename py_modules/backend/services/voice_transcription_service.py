"""Title: Turning your spoken question into text, live and then once more at Stop

Purpose: This is what happens between pressing the mic button and seeing
your words in the question box: it records your microphone, shows words as
you talk by reading the recording so far with a local speech-to-text engine
(whisper.cpp), and when you press Stop (or Ask) it reads the whole recording
once more in one go and hands back that cleaner text. It is also what installs
that engine in the first place -- SteamOS ships without it, so this file builds
it from source inside a container the first time voice input is turned on, and
downloads the speech model that engine reads from.

Used for: The mic button on the Ask bar. main.py creates one
VoiceTranscriptionSession per recording and polls `status()` a few times a
second while you are talking; the Settings screen's "Install voice engine"
button drives `download_voice_model()` and `install_whisper_cli()`.

Solves: Whisper reads a fixed window of audio per pass, so a running game
slows down when the plugin asks for many passes, and stitching many short
overlapping reads together repeats or drops words at the seams (found on the
Deck on 2026-10-10: base.en took about 4.2 s per pass with a game running and
fell behind, tiny.en repeated phrases). Here the live words are only a
preview that is replaced as a whole on every pass, and the text you keep is the
one pass over the whole recording at Stop (plan 88). This file also copes with
a Deck whose CPU does not support every instruction the built whisper binary
assumes, and with a background plugin process that cannot simply "open the
microphone" the way a normal desktop app can.

Does not: Talk to a cloud speech service, or listen for a wake word -- both
are out of scope today. When the always-on background engine from
voice_whisper_daemon is available, this file prefers it over spawning its
own whisper-cli process for every decode pass; see that file for how that
shared engine is started and stopped.

Split (2026-09-24): finding and opening the microphone moved to
voice_audio_capture_service.py, downloading the speech model moved to
voice_model_download_service.py, turning one whisper decode pass into
text moved to voice_transcript_decode_service.py, and compiling whisper.cpp
from source inside its podman container moved to voice_engine_build_service.py.
Every name any of them took is still imported back in here, so nothing outside
this file had to change.

How it works:

How a recording becomes the text you keep:

    mic --(pw-record / parecord / arecord)--> the whole recording, kept up to
                                              2 minutes (MAX_RECORDING_SECONDS)
                                                        |
        live, only while someone has just spoken, resting as long as the
        last pass took: read the current block (at most 28 s, BLOCK_SECONDS)
        from its start; that text REPLACES the block's earlier text
                                                        |
        a block that reaches 28 s is read once more over exactly those 28 s,
        frozen, and the next block starts where it ended
                                                        |
                                 screen shows: frozen blocks + current block
                                                        |
    Stop, Ask, or the 2-minute limit -----> status "finishing" (recording off)
                                                        |
                       read the whole recording once with the chosen model
                       (silence after the last word cut off first: whisper
                        invents words such as "you" in it)
                                                        |
                          status "stopped", finalized_transcript = that text
                          (if that read fails or hears nothing usable, the
                          last live text is kept instead)

Rules the live part keeps: a pass that returns nothing never blanks words that
already appeared; no pass runs when no speech has arrived since the last one.

Installing the engine, the first time voice input is turned on:
 1. `download_voice_model()` fetches the chosen speech model file
    (VOICE_STT_MODEL_SPECS lists the choices) with a resumable download.
 2. `install_whisper_cli()` builds the actual whisper.cpp program from
    source inside a podman container, since SteamOS does not ship it and its
    read-only system cannot simply have a package installed onto it, then
    copies the finished binaries out to the plugin's own folder
    (`_finalize_voice_bin()`).
 3. `engine_readiness()` reports whether both pieces are in place before a
    recording is allowed to start, backed by
    `_voice_binary_ready_for_inference()`, which checks a real, short test
    decode (`_whisper_inference_ok()`) the first time that binary is used --
    catching a build that crashes on this particular Deck's CPU before it
    can crash mid-recording.

Gotchas:
 - The built whisper binary is compiled for a specific set of CPU
   instructions. `_whisper_inference_ok()` runs one real decode on a silent
   test file before the binary is ever trusted, and
   `_voice_bin_mark_cpu_safe()` remembers a pass so that check is not
   repeated on every single recording.
 - `status()` carries a comment recording a real bug: a past edit left its
   body unreachable behind another method's return, and every voice request
   failed with a missing-attribute error until it was restored. Worth
   reading if this method is ever touched again.
 - `stop()` returns only when the final text is ready, and its wait for the
   worker thread is long on purpose: the engine is released right after it,
   and releasing it under a pass still running made the next press unreliable.
   The engine is released exactly once per session (`_release_engine_once`).
 - This runs as a background plugin process, not inside the normal desktop
   session, so it cannot simply assume where the microphone's audio socket
   lives -- `env_for_audio_capture()` and `_discover_session_runtime_dir()`
   go find it.
"""

from __future__ import annotations

import asyncio
import os
import shutil
import subprocess
import threading
import time
from collections import deque
from typing import Any, Callable, Optional

from backend.ollama.local_ollama_setup_service import _env_for_host_system_tools
from backend.services.voice_engine_build_service import (
    VOICE_BIN_CPU_SAFE_MARKER,
    WHISPER_CPP_IMAGE,
    _build_whisper_cli_in_container,
    _build_whisper_server_in_container,
    _finalize_voice_bin,
    _link_versioned_sonames,
    _prune_voice_bin_non_libs,
    _run_whisper_container_build,
    _voice_bin_cpu_safe_marker,
    _voice_bin_keep_names,
    _voice_bin_mark_cpu_safe,
    _whisper_inference_ok,
    _write_silence_wav,
)
from backend.services.voice_model_download_service import (
    DEFAULT_VOICE_STT_MODEL,
    VALID_VOICE_STT_MODELS,
    VOICE_STT_MODEL_SPECS,
    _append_log_tail,
    _download_model_file,
    download_voice_model,
    model_file_complete,
    new_voice_install_state,
    sanitize_voice_stt_model,
    voice_model_path,
    voice_models_dir,
)
from backend.services.voice_audio_capture_service import (
    _discover_session_runtime_dir,
    _parse_proc_environ,
    _pcm_rms,
    _resolve_capture_command,
    _resolve_pipewire_mic_target,
    _runtime_dir_usable,
    env_for_audio_capture,
)
from backend.services.voice_level_gate import VoiceLevelGate
from backend.services.voice_transcript_decode_service import (
    FILLER_MIN_RMS,
    WHISPER_CLI_INFERENCE_ARGS,
    WHISPER_FILLER_WORDS,
    WHISPER_NON_SPEECH_TAGS,
    _WHISPER_TS_LINE,
    _is_whisper_filler_only,
    _is_whisper_non_speech_tag,
    _join_transcript_parts,
    _normalize_whisper_word,
    _parse_whisper_stdout,
    _run_whisper_transcribe,
    _whisper_decode_usable,
)
from backend.services.voice_whisper_runtime import (
    CHANNELS,
    SAMPLE_RATE,
    SAMPLE_WIDTH,
    voice_bin_dir,
    voice_whisper_cli_path,
    voice_whisper_runtime_env,
    voice_whisper_server_path,
    whisper_binary_usable,
    whisper_server_binary_usable,
)
from backend.services.voice_whisper_daemon import get_whisper_engine

BYTES_PER_SECOND = SAMPLE_RATE * CHANNELS * SAMPLE_WIDTH
# The shortest rest between two live passes. A fast pass must not run ten times a second.
TRANSCRIBE_INTERVAL_S = 0.4
# How many times as long as the last pass took the rest must be, with a game running (plan 88). A pass
# on the Deck with a game running took about 4.2 s (base.en, 2026-10-10) and the old loop started the
# next one at once, so the engine worked nearly all the time and the game fell from 60 to 35 frames a
# second. Resting as long as the pass took keeps the engine busy about half the time at most.
LIVE_REST_FACTOR_GAME = 1.0
# With no game running there is nothing to protect, so the rest is only the floor above and passes run
# back to back, as before plan 88. Plan 88's rest of one pass length made a base.en pass (about 2.5 s
# on the Deck, 2026-10-11) change the words only every 4.4 to 5.5 s: the first words came about 4.4 s
# after the press, and a 9-second phrase showed no live words before Stop at all.
LIVE_REST_FACTOR_NO_GAME = 0.0
# A live block reads the recording from where the block began. Whisper reads 30 s at a time, so a
# block stops growing at 28 s: it is read once more over exactly those 28 s, frozen, and the next
# block starts where it ended. Text from two blocks is joined, never matched on overlap.
BLOCK_SECONDS = 28
# A recording stops by itself here, as if Stop had been pressed (plan 88). Nobody asks a question for
# two minutes, the whole recording is kept in memory (about 3.8 MB), and the final pass has to read it.
MAX_RECORDING_SECONDS = 120
# How long stop() waits for the worker thread: a live pass already running (the engine's own deadline
# is 45 s) plus the final pass. Shorter than that and the engine was released under a pass still using
# it, which made the next mic press unreliable.
STOP_JOIN_TIMEOUT_S = 120.0
# How long the final pass waits for the capture reader to hand over the last chunks of audio.
READER_JOIN_TIMEOUT_S = 3.0
WHISPER_MIN_DECODE_PCM_BYTES = BYTES_PER_SECOND // 4  # 0.25 s before first decode pass
# Whether audio holds speech is decided by voice_level_gate.VoiceLevelGate (the Deck's own mic
# is quiet, speech peaks at ~150–250 RMS, so a fixed average-loudness number cut quiet speakers off).


def new_voice_transcription_state() -> dict[str, Any]:
    return {
        "status": "idle",
        "recording": False,
        "streaming": False,
        "partial_transcript": "",
        "finalized_transcript": "",
        "model_id": DEFAULT_VOICE_STT_MODEL,
        "model_ready": False,
        "binary_ready": False,
        "capture_backend": "",
        "error": None,
        "started_at": None,
        "stopped_at": None,
    }


def _voice_bin_is_cpu_safe(plugin_root: str, settings_dir: str) -> bool:
    bin_dir = voice_bin_dir(plugin_root, settings_dir)
    return os.path.isfile(_voice_bin_cpu_safe_marker(bin_dir))


def _voice_binary_ready_for_inference(
    plugin_root: str,
    settings_dir: str,
    model_path: str = "",
) -> Optional[str]:
    path = whisper_binary_usable(plugin_root, settings_dir)
    if not path:
        return None
    bin_dir = voice_bin_dir(plugin_root, settings_dir)
    if model_path and os.path.isfile(model_path):
        if _voice_bin_is_cpu_safe(plugin_root, settings_dir):
            return path
        env = voice_whisper_runtime_env(plugin_root, settings_dir)
        if not _whisper_inference_ok(path, env, model_path):
            return None
        _voice_bin_mark_cpu_safe(bin_dir)
        return path
    if _voice_bin_is_cpu_safe(plugin_root, settings_dir):
        return path
    return None


def install_whisper_cli(
    plugin_root: str,
    settings_dir: str,
    state: dict[str, Any],
    cancel_event: threading.Event,
    on_stage: Optional[Callable[[str, dict[str, Any]], None]] = None,
) -> None:
    """Install whisper-cli into plugin data via podman (SteamOS) or skip if already present."""
    dest = voice_whisper_cli_path(plugin_root, settings_dir)

    def stage(name: str, **fields: Any) -> None:
        state["stage"] = name
        if on_stage:
            on_stage(name, fields)

    cli_ready = whisper_binary_usable(plugin_root, settings_dir)
    model_path = voice_model_path(plugin_root, settings_dir, DEFAULT_VOICE_STT_MODEL)
    ready_path = _voice_binary_ready_for_inference(plugin_root, settings_dir, model_path) if cli_ready else None
    server_ready = whisper_server_binary_usable(plugin_root, settings_dir) if cli_ready else None
    if ready_path and server_ready:
        stage("binary_ready", path=ready_path)
        return

    podman = shutil.which("podman")
    if not podman:
        raise RuntimeError(
            "whisper-cli is not installed and podman was not found. "
            "Use Settings → Voice input → Install voice engine, or place bin/whisper-cli in the plugin."
        )

    env = _env_for_host_system_tools()
    stage("binary_pull_start", image=WHISPER_CPP_IMAGE)
    pull = subprocess.run(
        [podman, "pull", WHISPER_CPP_IMAGE],
        capture_output=True,
        text=True,
        timeout=900,
        env=env,
    )
    if pull.returncode != 0:
        raise RuntimeError((pull.stderr or pull.stdout or "podman pull failed")[:500])
    if cancel_event.is_set():
        raise RuntimeError("Binary install cancelled.")

    if ready_path and not server_ready:
        stage("binary_build_start", target="whisper-server")
        _build_whisper_server_in_container(podman, env, plugin_root, settings_dir)
        stage("binary_ready", path=ready_path)
        return

    ready_path = _voice_binary_ready_for_inference(plugin_root, settings_dir, model_path)
    if ready_path and whisper_server_binary_usable(plugin_root, settings_dir):
        stage("binary_ready", path=ready_path)
        return

    stage("binary_build_start")
    dest = _build_whisper_cli_in_container(podman, env, plugin_root, settings_dir)

    model_path = voice_model_path(plugin_root, settings_dir, DEFAULT_VOICE_STT_MODEL)
    if os.path.isfile(model_path):
        env_rt = voice_whisper_runtime_env(plugin_root, settings_dir)
        if not _whisper_inference_ok(dest, env_rt, model_path):
            raise RuntimeError(
                "whisper-cli was built but failed an inference smoke test on this CPU. "
                "Try Install voice engine again after a plugin restart."
            )
        _voice_bin_mark_cpu_safe(voice_bin_dir(plugin_root, settings_dir))

    stage("binary_ready", path=dest)


def engine_readiness(plugin_root: str, settings_dir: str, model_id: str) -> dict[str, Any]:
    model_id = sanitize_voice_stt_model(model_id)
    model_path = voice_model_path(plugin_root, settings_dir, model_id)
    model_ready = model_file_complete(plugin_root, settings_dir, model_id)
    whisper_bin = _voice_binary_ready_for_inference(
        plugin_root,
        settings_dir,
        model_path if model_ready else "",
    )
    return {
        "model_id": model_id,
        "binary_ready": whisper_bin is not None,
        "binary_path": whisper_bin or "",
        "model_ready": model_ready,
        "model_path": model_path if model_ready else "",
        "ready": whisper_bin is not None and model_ready,
    }


class VoiceTranscriptionSession:
    """Background capture + live whisper reads + one final read at Stop; thread-safe status reads."""

    def __init__(
        self,
        plugin_root: str,
        settings_dir: str,
        model_id: str,
        logger: Any,
        game_running: bool = False,
    ) -> None:
        self.plugin_root = plugin_root
        self.settings_dir = settings_dir
        self.model_id = sanitize_voice_stt_model(model_id)
        self.logger = logger
        # Whether a game was running when the mic was pressed; it decides how long the live passes rest.
        self.game_running = bool(game_running)
        self._lock = threading.Lock()
        self._state = new_voice_transcription_state()
        self._state["model_id"] = self.model_id
        # Set by stop(): the person (or the screen) ended the recording.
        self._stop_event = threading.Event()
        # Set when the recording ends by itself: the time limit, or the microphone going away.
        self._finish_event = threading.Event()
        # Set by force_stop(): tear down without the final pass (permission revoked, plugin unloading).
        self._skip_final = False
        self._capture_proc: Optional[subprocess.Popen] = None
        self._reader_thread: Optional[threading.Thread] = None
        self._worker_thread: Optional[threading.Thread] = None
        # Every sample from the start of the recording, up to MAX_RECORDING_SECONDS.
        self._all_pcm = bytearray()
        # Where the current live block begins in `_all_pcm`.
        self._block_start = 0
        self._frozen_text = ""
        self._block_text = ""
        # True when speech arrived since the last live pass began; a pass runs only then.
        self._voiced_since_pass = False
        self._level_gate = VoiceLevelGate()
        self._capture_backend = ""
        self._use_daemon = False
        self._engine_held = False

    def _transcribe_pcm(
        self,
        whisper_bin: str,
        model_path: str,
        env: dict[str, str],
        pcm: bytes,
    ) -> str:
        if self._use_daemon:
            text = get_whisper_engine().transcribe(pcm)
            if text:
                return text
        return _run_whisper_transcribe(whisper_bin, model_path, pcm, env)

    def status(self) -> dict[str, Any]:
        """Snapshot of the live session state for RPC polling.

        Restored 2026-08-03. ``742db60`` (Voice STT session daemon) replaced this method's
        signature line with ``_transcribe_pcm`` and never re-added it, leaving these two body
        lines stranded as unreachable code after that method's ``return``. ``start()``,
        ``stop()`` and both voice RPCs all call it, so voice raised
        ``AttributeError: 'VoiceTranscriptionSession' object has no attribute 'status'`` on
        every attempt from then until this fix.
        """
        with self._lock:
            return dict(self._state)

    def _set_state(self, **fields: Any) -> None:
        with self._lock:
            self._state.update(fields)

    def _append_pcm(self, chunk: bytes) -> None:
        """Add audio to the whole-recording buffer; at the time limit, ask the recording to finish."""
        if not chunk:
            return
        with self._lock:
            room = MAX_RECORDING_SECONDS * BYTES_PER_SECOND - len(self._all_pcm)
            if room <= 0:
                self._finish_event.set()
                return
            if len(chunk) >= room:
                chunk = chunk[:room]
                self._finish_event.set()
            if self._level_gate.observe(chunk):
                self._voiced_since_pass = True
            self._all_pcm += chunk

    def _pcm_from(self, start: int, end: Optional[int] = None) -> bytes:
        """A copy of the recording from byte `start` (to byte `end`, or to the latest audio)."""
        with self._lock:
            return bytes(self._all_pcm[start:end])

    def _recorded_bytes(self) -> int:
        with self._lock:
            return len(self._all_pcm)

    def _live_text(self) -> str:
        return _join_transcript_parts(self._frozen_text, self._block_text)

    def _live_rest_s(self, took: float) -> float:
        """How long to wait before the next live pass, given how long the last one took."""
        factor = LIVE_REST_FACTOR_GAME if self.game_running else LIVE_REST_FACTOR_NO_GAME
        return max(TRANSCRIBE_INTERVAL_S, took * factor)

    def _release_engine_once(self) -> None:
        """Let go of the shared speech engine, once per session however many paths end it.

        The engine counts holders by name, and every session is "mic": a second release, arriving
        after a newer recording had already taken its hold, would drop the newer one.
        """
        with self._lock:
            held, self._engine_held = self._engine_held, False
        if held:
            get_whisper_engine().release("mic")

    def _begin_finishing(self) -> None:
        """Recording is over for the person: the final pass is (about to be) running."""
        with self._lock:
            if self._state.get("status") == "recording":
                self._state.update(status="finishing", recording=False, streaming=False)

    def start(self) -> dict[str, Any]:
        """Start one recording: check the engine is ready, open the
        microphone, and launch the two background threads that do the
        ongoing work.

        In: nothing beyond what was already given to `__init__()` -- the
        model to use, and where the plugin and its settings live.

        Out: `{"accepted": True}` once recording has actually begun, or
        `{"accepted": False, "error": ...}` when it could not. Whether the
        recording is using the shared background engine or a plain per-call
        one is decided here too (`self._use_daemon`), read by
        `_transcribe_pcm()` on every decode pass.

        What can go wrong, in the order this checks for it: the speech
        engine or model is not installed yet (`engine_readiness()` catches
        both); a recording is already running, in which case this simply
        returns the existing one rather than starting a second; or no
        microphone capture tool could be started at all
        (`_resolve_capture_command()` raises), in which case the shared
        engine that was just claimed is released again before returning, so
        a failed start does not leave it held forever.

        Once capture is underway, `_capture_reader_loop()` and
        `_transcribe_loop()` run on their own threads and this method
        returns immediately -- it does not wait for any words to appear.
        """
        ready = engine_readiness(self.plugin_root, self.settings_dir, self.model_id)
        if not ready["binary_ready"]:
            err = (
                "whisper-cli is not installed. Open Settings → Voice input and tap "
                "Install voice engine (downloads whisper-cli + model)."
            )
            self._set_state(status="error", recording=False, streaming=False, error=err)
            return {"accepted": False, "error": err}
        if not ready["model_ready"]:
            err = f"Voice model {self.model_id} is not downloaded yet."
            self._set_state(status="error", recording=False, streaming=False, error=err)
            return {"accepted": False, "error": err}

        if self._worker_thread and self._worker_thread.is_alive():
            return {"accepted": True, "status": self.status()}

        self._stop_event.clear()
        self._finish_event.clear()
        self._skip_final = False
        with self._lock:
            self._all_pcm = bytearray()
            self._block_start = 0
            self._frozen_text = ""
            self._block_text = ""
            self._voiced_since_pass = False
        self._level_gate = VoiceLevelGate()

        model_path = voice_model_path(self.plugin_root, self.settings_dir, self.model_id)
        engine = get_whisper_engine()
        # acquire() answers for this model; daemon_available() would say yes
        # to a server another reason holds for a different one.
        self._use_daemon = engine.acquire("mic", model_path, self.plugin_root, self.settings_dir)
        self._engine_held = True

        try:
            cmd, backend, capture_env = _resolve_capture_command(self.settings_dir)
            self._capture_backend = backend
            self._capture_proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                env=capture_env,
            )
        except Exception as exc:
            err = str(exc)[:500]
            self._set_state(status="error", recording=False, streaming=False, error=err)
            self._release_engine_once()
            return {"accepted": False, "error": err}

        self._set_state(
            status="recording",
            recording=True,
            streaming=True,
            partial_transcript="",
            finalized_transcript="",
            model_ready=True,
            binary_ready=True,
            capture_backend=self._capture_backend,
            error=None,
            started_at=time.time(),
            stopped_at=None,
        )

        self._reader_thread = threading.Thread(target=self._capture_reader_loop, name="bonsai-voice-capture", daemon=True)
        self._worker_thread = threading.Thread(target=self._transcribe_loop, name="bonsai-voice-stt", daemon=True)
        self._reader_thread.start()
        self._worker_thread.start()
        return {"accepted": True}

    def _capture_reader_loop(self) -> None:
        proc = self._capture_proc
        if proc is None or proc.stdout is None:
            return
        chunks_read = 0
        try:
            while not self._stop_event.is_set() and not self._finish_event.is_set():
                chunk = proc.stdout.read(4096)
                if not chunk:
                    break
                chunks_read += 1
                self._append_pcm(chunk)
        except Exception as exc:
            self.logger.warning("voice capture reader failed: %s", exc)
            self._set_state(error=str(exc)[:300])
        finally:
            stderr = ""
            if proc.stderr is not None:
                try:
                    stderr = (proc.stderr.read() or b"").decode("utf-8", errors="replace")[:300]
                except Exception:
                    pass
            if proc.poll() is None:
                try:
                    proc.terminate()
                except Exception:
                    pass
            if chunks_read == 0:
                msg = (stderr or "Microphone capture produced no audio.").strip()[:300]
                self._set_state(
                    status="error",
                    recording=False,
                    streaming=False,
                    error=f"Microphone capture failed: {msg}",
                )
            # The microphone going away (or the time limit) ends the recording by itself: the worker
            # then reads what was captured, exactly as if Stop had been pressed.
            if not self._stop_event.is_set():
                self._finish_event.set()

    def _decode(self, pcm: bytes, whisper_bin: str, model_path: str, env: dict[str, str]) -> Optional[str]:
        """One whisper read of `pcm`; its text, or None when the read failed or heard nothing usable.

        Whether a lone filler word ("yes", "test") is believed depends on how loud the speech in
        `pcm` was, not on the average of the whole read with its pauses.
        """
        try:
            text = (self._transcribe_pcm(whisper_bin, model_path, env, pcm) or "").strip()
        except Exception as exc:
            self.logger.warning("voice whisper pass failed: %s", exc)
            return None
        if not text:
            return None
        if not _whisper_decode_usable(text, self._level_gate.speech_rms(pcm)):
            return None
        return text

    def _freeze_block(self, whisper_bin: str, model_path: str, env: dict[str, str]) -> None:
        """The current block has reached BLOCK_SECONDS: read exactly those seconds once more, keep
        that text for good, and start the next block where this one ended."""
        block_bytes = BLOCK_SECONDS * BYTES_PER_SECOND
        pcm = self._pcm_from(self._block_start, self._block_start + block_bytes)
        text = None
        if self._level_gate.window_voiced(pcm):
            text = self._decode(pcm, whisper_bin, model_path, env)
        # A failed read keeps what the live passes had for this block.
        self._frozen_text = _join_transcript_parts(self._frozen_text, text if text else self._block_text)
        self._block_text = ""
        self._block_start += block_bytes
        # Whatever already sits in the new block gets its own live pass.
        with self._lock:
            self._voiced_since_pass = True
        self._set_state(
            partial_transcript="",
            finalized_transcript=self._frozen_text,
            streaming=True,
        )

    def _live_pass(self, whisper_bin: str, model_path: str, env: dict[str, str]) -> bool:
        """One live read of the current block. True when a read was made (the engine was used)."""
        block_bytes = BLOCK_SECONDS * BYTES_PER_SECOND
        if self._recorded_bytes() - self._block_start >= block_bytes:
            self._freeze_block(whisper_bin, model_path, env)
            return True
        with self._lock:
            voiced, self._voiced_since_pass = self._voiced_since_pass, False
        if not voiced:
            return False
        pcm = self._pcm_from(self._block_start)
        if len(pcm) < WHISPER_MIN_DECODE_PCM_BYTES:
            with self._lock:
                self._voiced_since_pass = True
            return False
        if not self._level_gate.window_voiced(pcm):
            return False
        text = self._decode(pcm, whisper_bin, model_path, env)
        # A read that returns nothing (or only noise) never blanks words that already appeared.
        if text:
            self._block_text = text
            self._set_state(
                partial_transcript=self._block_text,
                finalized_transcript=self._frozen_text,
                streaming=True,
            )
        return True

    def _transcribe_loop(self) -> None:
        """The background thread that keeps turning recorded audio into
        live text while a recording runs, then reads the whole recording once
        when it ends.

        In: nothing directly -- it reads the audio `_capture_reader_loop()`
        is appending to the shared buffer, and keeps running until `stop()`
        sets the stop flag or the recording ends by itself.

        Out: nothing returned. Instead it calls `_set_state()` so the plugin's
        own RPC can hand `status()` the latest text on every poll, and ends
        with `_finish_recording()`.

        What can go wrong: the speech engine or model files went missing
        after `start()` already checked them, in which case this ends the
        session in an error state immediately rather than looping forever;
        or one single read raises, which is logged and skipped rather than
        ending the whole recording over one bad pass. Audio that is too short or too quiet is
        skipped rather than shown, so a burst of room noise does not get typed out as a word.
        """
        whisper_bin = whisper_binary_usable(self.plugin_root, self.settings_dir)
        model_path = voice_model_path(self.plugin_root, self.settings_dir, self.model_id)
        env = voice_whisper_runtime_env(self.plugin_root, self.settings_dir)
        if not whisper_bin or not os.path.isfile(model_path):
            self._set_state(status="error", recording=False, streaming=False, error="Engine not ready.")
            self._release_engine_once()
            return

        next_pass_at = 0.0
        while not self._stop_event.is_set() and not self._finish_event.is_set():
            if time.monotonic() < next_pass_at:
                time.sleep(0.05)
                continue
            began = time.monotonic()
            try:
                ran = self._live_pass(whisper_bin, model_path, env)
            except Exception as exc:
                # One bad pass must not end the worker: a dead worker leaves the screen listening
                # to a recording whose words never change again.
                self.logger.warning("voice live pass crashed: %s", exc)
                ran = True
            if ran:
                took = time.monotonic() - began
                next_pass_at = time.monotonic() + self._live_rest_s(took)
            else:
                time.sleep(0.05)

        self._finish_recording(whisper_bin, model_path, env)

    def _finish_recording(self, whisper_bin: str, model_path: str, env: dict[str, str]) -> None:
        """Read the whole recording once and publish that as the final text.

        The status reads "finishing" (recording off) while this runs and "stopped" after. When the
        read fails, hears nothing usable, or is skipped, the final text is the last live text.
        """
        self._begin_finishing()
        reader = self._reader_thread
        if reader is not None and reader.is_alive() and reader is not threading.current_thread():
            reader.join(timeout=READER_JOIN_TIMEOUT_S)
        final = self._live_text()
        try:
            if not self._skip_final:
                pcm = self._pcm_from(0)
                if len(pcm) >= WHISPER_MIN_DECODE_PCM_BYTES and self._level_gate.window_voiced(pcm):
                    # The silence after the speech is not handed over: whisper invents words in it.
                    text = self._decode(self._level_gate.trim_trailing_silence(pcm), whisper_bin, model_path, env)
                    if text:
                        final = text
        except Exception as exc:
            self.logger.warning("voice final pass failed: %s", exc)
        with self._lock:
            failed = self._state.get("status") == "error"
            self._state.update(
                status="error" if failed else "stopped",
                recording=False,
                streaming=False,
                partial_transcript="",
                finalized_transcript=final,
                stopped_at=time.time(),
            )
        self._release_engine_once()

    def stop(self) -> dict[str, Any]:
        """End the recording and return the final text. Returns only when that text is ready.

        Safe to call twice at once (the second call just waits for the same worker): the screen's
        Stop and a start that arrives while this is still finishing both end up here.
        """
        self._stop_event.set()
        self._begin_finishing()
        proc = self._capture_proc
        if proc is not None and proc.poll() is None:
            try:
                proc.terminate()
                proc.wait(timeout=2)
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass
        reader = self._reader_thread
        if reader is not None and reader.is_alive():
            reader.join(timeout=READER_JOIN_TIMEOUT_S)
        worker = self._worker_thread
        if worker is not None and worker.is_alive():
            worker.join(timeout=STOP_JOIN_TIMEOUT_S)
            if worker.is_alive():
                self.logger.warning("voice worker still running %s s after stop", STOP_JOIN_TIMEOUT_S)
        with self._lock:
            if self._state.get("status") == "finishing":
                # No worker ever ran the final pass (it died or never started): keep what was live.
                self._state.update(
                    status="stopped",
                    partial_transcript="",
                    finalized_transcript=_join_transcript_parts(self._frozen_text, self._block_text),
                    stopped_at=time.time(),
                )
        self._release_engine_once()
        st = self.status()
        return {
            "stopped": True,
            "finalized_transcript": st.get("finalized_transcript") or "",
            "partial_transcript": "",
            "status": st.get("status") or "stopped",
        }

    def force_stop(self) -> None:
        """Immediate teardown when permission is revoked or the plugin unloads: no final pass.

        A stop already under way is not cut short; this then just waits for it, so a new recording
        never starts while the old one is still finishing.
        """
        if not self._stop_event.is_set():
            self._skip_final = True
        self.stop()
