"""Title: The engine that turns your voice into text

Purpose: When you press the mic button and speak instead of typing, this is
the piece that understands what you said. It manages a small helper program
(whisper-server) that does the actual listening, and keeps one copy of it
running in the background so the next question does not have to wait for it
to start up again -- starting it takes real time, and a question asked right
after the last one should not pay that cost twice.

Used for: Every spoken question. voice_transcription_service records your
voice and hands the recording to `get_whisper_engine()`'s `transcribe()`
method to get text back.

Solves: Keeping exactly one whisper-server process alive, sharing it safely
between whatever wants it, and cleaning it up -- including a copy left behind
from a session that ended badly, found through a PID file on disk.

Does not: Capture the microphone itself, or decide when a recording is
finished -- voice_transcription_service owns that. This file only turns
already-recorded audio into words.

Gotchas:
 - The server remembers who asked for it ("mic" is the only asker today, a
   short label called a reason) and only stops once every asker that called
   `acquire()` has let go through `release()`, so it can be shared without one
   caller stopping it out from under another. See `acquire()` below for the
   rules that make that work.
 - A crash, a kill, or the Deck sleeping mid-transcribe can leave the
   whisper-server process running after the plugin itself has stopped. Every
   `acquire()` reads a PID file left behind by whatever ran before it and
   kills that leftover process first, so it cannot end up arguing with the
   new one over the same network port.
"""

from __future__ import annotations

import json
import os
import signal
import subprocess
import threading
import time
import urllib.error
import urllib.request
import uuid
from typing import Any, Optional

from backend.services.voice_whisper_runtime import (
    WHISPER_THREADS,
    _pcm_to_wav_bytes,
    _sanitize_whisper_transcript,
    voice_bin_dir,
    voice_whisper_runtime_env,
    voice_whisper_server_path,
    whisper_server_binary_usable,
)

WHISPER_SERVER_HOST = "127.0.0.1"
WHISPER_SERVER_PORT = 18765
WHISPER_SERVER_BASE_URL = f"http://{WHISPER_SERVER_HOST}:{WHISPER_SERVER_PORT}"
WHISPER_SERVER_HEALTH_TIMEOUT_S = 15.0
WHISPER_SERVER_HEALTH_POLL_S = 0.25
WHISPER_SERVER_INFERENCE_TIMEOUT_S = 45
WHISPER_SERVER_PID_FILE = "whisper-server.pid"

_engine: Optional["WhisperEngine"] = None
_engine_lock = threading.Lock()


def get_whisper_engine() -> "WhisperEngine":
    global _engine
    with _engine_lock:
        if _engine is None:
            _engine = WhisperEngine()
        return _engine


def force_whisper_engine_stop() -> None:
    get_whisper_engine().force_stop()


def _pid_file_path(plugin_root: str, settings_dir: str) -> str:
    return os.path.join(voice_bin_dir(plugin_root, settings_dir), WHISPER_SERVER_PID_FILE)


def _process_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def _read_pid_file(path: str) -> Optional[int]:
    try:
        with open(path, encoding="utf-8") as f:
            raw = (f.read() or "").strip()
        return int(raw) if raw.isdigit() else None
    except OSError:
        return None


def _write_pid_file(path: str, pid: int) -> None:
    try:
        with open(path, "w", encoding="utf-8") as f:
            f.write(f"{pid}\n")
    except OSError:
        pass


def _remove_pid_file(path: str) -> None:
    try:
        os.remove(path)
    except OSError:
        pass


def _kill_pid_best_effort(pid: int) -> None:
    if not _process_alive(pid):
        return
    try:
        os.kill(pid, signal.SIGTERM)
    except OSError:
        return
    deadline = time.monotonic() + 3.0
    while time.monotonic() < deadline:
        if not _process_alive(pid):
            return
        time.sleep(0.05)
    try:
        os.kill(pid, signal.SIGKILL)
    except OSError:
        pass


def _reap_stale_server_pid(plugin_root: str, settings_dir: str) -> None:
    pid_path = _pid_file_path(plugin_root, settings_dir)
    pid = _read_pid_file(pid_path)
    if pid is None:
        return
    _kill_pid_best_effort(pid)
    _remove_pid_file(pid_path)


def _build_multipart_wav_body(wav_bytes: bytes, fields: dict[str, str]) -> tuple[bytes, str]:
    boundary = f"----bonsai{uuid.uuid4().hex}"
    b_boundary = boundary.encode("ascii")
    chunks: list[bytes] = []
    for name, value in fields.items():
        chunks.append(b"--" + b_boundary + b"\r\n")
        chunks.append(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode())
        chunks.append(value.encode("utf-8") + b"\r\n")
    chunks.append(b"--" + b_boundary + b"\r\n")
    chunks.append(
        b'Content-Disposition: form-data; name="file"; filename="audio.wav"\r\n'
        b"Content-Type: audio/wav\r\n\r\n"
    )
    chunks.append(wav_bytes)
    chunks.append(b"\r\n--" + b_boundary + b"--\r\n")
    return b"".join(chunks), boundary


def parse_whisper_server_json(body: str) -> str:
    """Extract transcript text from whisper-server JSON and sanitize like CLI stdout."""
    if not (body or "").strip():
        return ""
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return _sanitize_whisper_transcript(body.strip())
    if isinstance(data, dict):
        text = data.get("text")
        if isinstance(text, str) and text.strip():
            return _sanitize_whisper_transcript(text.strip())
        segments = data.get("segments")
        if isinstance(segments, list):
            parts = []
            for seg in segments:
                if isinstance(seg, dict):
                    seg_text = seg.get("text")
                    if isinstance(seg_text, str) and seg_text.strip():
                        parts.append(seg_text.strip())
            if parts:
                return _sanitize_whisper_transcript(" ".join(parts))
    return ""


def _http_get_health(base_url: str, timeout: float) -> tuple[int, str]:
    req = urllib.request.Request(f"{base_url}/health", method="GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        return exc.code, (exc.read() or b"").decode("utf-8", errors="replace")


def _health_is_ready(status: int, body: str) -> bool:
    if status != 200:
        return False
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return False
    return isinstance(data, dict) and data.get("status") == "ok"


def _post_inference_wav(base_url: str, wav_bytes: bytes, timeout: float) -> str:
    fields = {
        "language": "en",
        "response_format": "json",
        "no_timestamps": "true",
        "suppress_nst": "true",
    }
    payload, boundary = _build_multipart_wav_body(wav_bytes, fields)
    req = urllib.request.Request(
        f"{base_url}/inference",
        data=payload,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
    return parse_whisper_server_json(raw)


class WhisperEngine:
    """Module singleton: one whisper-server per active mic/wake session reasons."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._transcribe_lock = threading.Lock()
        self._reason_refcount: dict[str, int] = {}
        self._proc: Optional[subprocess.Popen[Any]] = None
        self._daemon_ready = False
        self._model_path = ""
        self._plugin_root = ""
        self._settings_dir = ""
    def daemon_available(self) -> bool:
        with self._lock:
            return self._daemon_ready

    def acquire(
        self,
        reason: str,
        model_path: str,
        plugin_root: str,
        settings_dir: str,
    ) -> None:
        """Ask for the shared whisper-server to be running and ready, starting
        it if it is not.

        In: `reason` is a short label for who is asking -- only "mic" is used
        today, but a future caller (a wake-word listener, say) could ask under
        its own reason and share the same server. `model_path` is which speech
        model to run; `plugin_root` and `settings_dir` say where to find the
        server program and where to write its PID file.

        Out: nothing. A caller finds out whether the server is actually ready
        by asking `daemon_available()` afterwards, or by trying `transcribe()`
        and getting an empty string back on failure.

        Two or more reasons holding the server at once is fine by design: each
        is counted, and the server only stops once every reason that asked has
        let go through `release()`. What can go wrong: a reason that calls
        `acquire()` and never calls `release()` leaks -- the server keeps
        running until `force_whisper_engine_stop()` is called and clears every
        reason at once. And if a different model is asked for while the server
        is already running for an older one, the running server is stopped and
        restarted for the new model even if another reason is still holding
        onto the old one; that older holder is not told, it just finds the
        server gone the next time it tries to use it.
        """
        with self._lock:
            self._reason_refcount[reason] = self._reason_refcount.get(reason, 0) + 1
            if self._daemon_ready and self._model_path == model_path:
                return
            if self._proc is not None and self._model_path != model_path:
                self._stop_server_locked()

        server_bin = whisper_server_binary_usable(plugin_root, settings_dir)
        if not server_bin:
            with self._lock:
                self._daemon_ready = False
            return

        _reap_stale_server_pid(plugin_root, settings_dir)
        env = voice_whisper_runtime_env(plugin_root, settings_dir)
        cmd = [
            server_bin,
            "-m",
            model_path,
            "-l",
            "en",
            "-t",
            str(WHISPER_THREADS),
            "-ng",
            "-nt",
            "--host",
            WHISPER_SERVER_HOST,
            "--port",
            str(WHISPER_SERVER_PORT),
        ]
        try:
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                env=env,
            )
        except Exception:
            with self._lock:
                self._daemon_ready = False
            return

        ready = self._wait_for_health()
        with self._lock:
            if not ready or proc.poll() is not None:
                try:
                    proc.terminate()
                    proc.wait(timeout=2)
                except Exception:
                    try:
                        proc.kill()
                    except Exception:
                        pass
                self._daemon_ready = False
                return
            self._proc = proc
            self._daemon_ready = True
            self._model_path = model_path
            self._plugin_root = plugin_root
            self._settings_dir = settings_dir
            _write_pid_file(_pid_file_path(plugin_root, settings_dir), proc.pid)

    def release(self, reason: str) -> None:
        with self._lock:
            count = self._reason_refcount.get(reason, 0)
            if count <= 1:
                self._reason_refcount.pop(reason, None)
            else:
                self._reason_refcount[reason] = count - 1
            if self._reason_refcount:
                return
            self._stop_server_locked()

    def force_stop(self) -> None:
        with self._lock:
            self._reason_refcount.clear()
            self._stop_server_locked()

    def transcribe(self, pcm: bytes) -> str:
        if not pcm:
            return ""
        with self._lock:
            if not self._daemon_ready or self._proc is None or self._proc.poll() is not None:
                self._daemon_ready = False
                return ""
        if not self._transcribe_lock.acquire(blocking=False):
            return ""
        try:
            with self._lock:
                if not self._daemon_ready:
                    return ""
            wav_bytes = _pcm_to_wav_bytes(pcm)
            return _post_inference_wav(
                WHISPER_SERVER_BASE_URL,
                wav_bytes,
                WHISPER_SERVER_INFERENCE_TIMEOUT_S,
            )
        except Exception:
            with self._lock:
                self._daemon_ready = False
            return ""
        finally:
            self._transcribe_lock.release()

    def _wait_for_health(self) -> bool:
        deadline = time.monotonic() + WHISPER_SERVER_HEALTH_TIMEOUT_S
        while time.monotonic() < deadline:
            try:
                status, body = _http_get_health(WHISPER_SERVER_BASE_URL, timeout=2.0)
                if _health_is_ready(status, body):
                    return True
            except Exception:
                pass
            time.sleep(WHISPER_SERVER_HEALTH_POLL_S)
        return False

    def _stop_server_locked(self) -> None:
        proc = self._proc
        self._proc = None
        self._daemon_ready = False
        self._model_path = ""
        pid_path = ""
        if self._plugin_root and self._settings_dir:
            pid_path = _pid_file_path(self._plugin_root, self._settings_dir)
        if proc is not None and proc.poll() is None:
            try:
                proc.terminate()
                proc.wait(timeout=3)
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass
        if pid_path:
            pid = _read_pid_file(pid_path)
            if pid is not None:
                _kill_pid_best_effort(pid)
            _remove_pid_file(pid_path)
        self._plugin_root = ""
        self._settings_dir = ""
