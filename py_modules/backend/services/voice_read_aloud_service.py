"""Title: Voice read-aloud service

Purpose: Speak an answer's text out loud in the Deck's own built-in voice (espeak-ng), one
sentence at a time, over the Deck's session sound system.
Used for: The "Read aloud" button and, later, the auto-read Settings option (main.py's
start_voice_read_aloud / stop_voice_read_aloud / get_voice_read_aloud_status RPCs).
Solves: Splitting plain text into sentences without breaking on decimals, abbreviations or a
trailing initial; making sentence audio ahead of playback so the first sound starts fast; playing
each sentence in order through the session's sound sockets, found the same way the microphone
finds them (see env_for_audio_capture in voice_transcription_service.py); a clean, idempotent stop.
Does not: Call Ollama, read settings, or talk to the frontend directly — that is main.py's job.
Does not: Speak in any voice but the Deck's built-in one — a natural voice is Phase 2 (unbuilt).
"""

from __future__ import annotations

import os
import queue
import re
import shutil
import subprocess
import tempfile
import threading
import time
from typing import Any, Callable, Optional

from backend.services.voice_transcription_service import env_for_audio_capture

# --- Sentence splitting ---

# Tokens that end in "." without ending the sentence. Multi-part ones ("e.g.", "i.e.") are
# matched on the trailing fragment a backward scan finds (see _looks_like_abbreviation_or_initial):
# the scan stops at whitespace, so "i.e." yields the token "i.e" here.
_ABBREVIATIONS = frozenset(
    {
        "mr", "mrs", "ms", "dr", "st", "vs", "e.g", "i.e", "etc", "prof", "sr", "jr", "mt", "ft",
    }
)

_SENTENCE_END_CHARS = ".!?"
_MAX_SENTENCE_CHARS = 300


def _looks_like_abbreviation_or_initial(token: str) -> bool:
    """True when the word right before a '.' should not end a sentence.

    Covers the documented cases: known abbreviations (e.g., i.e., vs., Mr., Dr., St.) and a
    single trailing initial (the "J." in "J. K. Rowling").
    """
    stripped = token.strip()
    if not stripped:
        return False
    if stripped.lower() in _ABBREVIATIONS:
        return True
    if len(stripped) == 1 and stripped.isalpha():
        return True
    return False


def _split_sentence_punctuation(line: str) -> list[str]:
    """Split one line on '.', '!' and '?', skipping decimals, abbreviations and initials.

    A '.', '!' or '?' only ends a sentence when it is followed by whitespace or the end of the
    line — that alone rules out decimals like "2.5" (the '.' is followed by another digit, not
    whitespace). Abbreviations and single trailing initials are then ruled out by looking at the
    word immediately before the punctuation.
    """
    sentences: list[str] = []
    start = 0
    i = 0
    n = len(line)
    while i < n:
        ch = line[i]
        if ch in _SENTENCE_END_CHARS:
            next_is_boundary = (i + 1 == n) or line[i + 1].isspace()
            if next_is_boundary:
                j = i
                while j > start and not line[j - 1].isspace():
                    j -= 1
                token = line[j:i]
                if ch == "." and _looks_like_abbreviation_or_initial(token):
                    i += 1
                    continue
                piece = line[start : i + 1].strip()
                if piece:
                    sentences.append(piece)
                k = i + 1
                while k < n and line[k].isspace():
                    k += 1
                start = k
                i = k
                continue
        i += 1
    tail = line[start:].strip()
    if tail:
        sentences.append(tail)
    return sentences


def _split_long_sentence(sentence: str) -> list[str]:
    """A sentence over ~300 characters is split at a comma or semicolon so the first sound
    comes quickly, instead of waiting for the whole thing to be made at once."""
    if len(sentence) <= _MAX_SENTENCE_CHARS:
        return [sentence]
    pieces: list[str] = []
    remaining = sentence
    while len(remaining) > _MAX_SENTENCE_CHARS:
        window = remaining[:_MAX_SENTENCE_CHARS]
        split_at = max(window.rfind(","), window.rfind(";"))
        if split_at <= 0:
            break
        piece = remaining[: split_at + 1].strip()
        if piece:
            pieces.append(piece)
        remaining = remaining[split_at + 1 :].strip()
    if remaining:
        pieces.append(remaining)
    return pieces


def split_into_sentences(text: str) -> list[str]:
    """Split plain text into sentences to read one at a time.

    Splits on full stops, question marks, exclamation marks and line breaks. Does not split on
    decimals (2.5), common abbreviations (e.g., i.e., vs., Mr., Dr., St.) or a single trailing
    initial. Drops empty pieces and collapses runs of whitespace. A sentence over ~300 characters
    may be split again at a comma or semicolon.
    """
    if not text or not text.strip():
        return []
    sentences: list[str] = []
    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue
        for piece in _split_sentence_punctuation(line):
            collapsed = re.sub(r"\s+", " ", piece).strip()
            if not collapsed:
                continue
            sentences.extend(_split_long_sentence(collapsed))
    return [s for s in sentences if s]


# --- The engine behind a small interface ---


def espeak_available() -> bool:
    """True when the Deck's built-in speech program is installed."""
    return bool(shutil.which("espeak-ng"))


def _resolve_player_binary() -> str:
    for name in ("pw-play", "paplay"):
        if shutil.which(name):
            return name
    return ""


def player_available() -> bool:
    """True when a program exists to play a sound file on the Deck's session sound system."""
    return bool(_resolve_player_binary())


def _safe_remove(path: Optional[str]) -> None:
    if not path:
        return
    try:
        os.remove(path)
    except OSError:
        pass


class EspeakSentenceMaker:
    """Feature: turn one sentence into a wav file using the Deck's built-in voice (espeak-ng).

    Phase 2 adds a natural voice by swapping this class for another with the same ``make``
    method — nothing else in the pipeline needs to change.
    """

    def __init__(self, temp_dir: str) -> None:
        self._temp_dir = temp_dir

    def make(self, sentence: str) -> str:
        """Feature: make one wav file for ``sentence``. Output: the wav file's path.

        Raises on failure (missing binary, non-zero exit) so the pipeline can report it.
        """
        os.makedirs(self._temp_dir, exist_ok=True)
        fd, path = tempfile.mkstemp(suffix=".wav", dir=self._temp_dir, prefix="bonsai_read_aloud_")
        os.close(fd)
        try:
            proc = subprocess.run(
                ["espeak-ng", "-v", "en-us", "-s", "165", "-w", path, sentence],
                capture_output=True,
                text=True,
                timeout=30,
            )
            if proc.returncode != 0:
                raise RuntimeError(
                    "The Deck's speech program could not make that sentence: "
                    f"{(proc.stderr or '').strip()[:200]}"
                )
        except Exception:
            _safe_remove(path)
            raise
        return path


class SessionAudioPlayer:
    """Feature: play one wav file on the Deck's session sound system until it ends or is stopped.

    Uses the same session-socket discovery the microphone code uses to reach the person's sound
    output from the plugin's background program, which runs outside their Steam session.
    """

    def __init__(self, env_getter: Optional[Callable[[], dict[str, str]]] = None) -> None:
        self._env_getter = env_getter or env_for_audio_capture
        self._proc_lock = threading.Lock()
        self._proc: Optional[subprocess.Popen] = None

    def play(self, path: str) -> None:
        """Feature: play ``path``, blocking until it finishes or ``stop`` ends it."""
        player_bin = _resolve_player_binary()
        if not player_bin:
            raise RuntimeError("No sound player found on the Deck (tried pw-play, paplay).")
        env = self._env_getter()
        proc = subprocess.Popen(
            [player_bin, path],
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        with self._proc_lock:
            self._proc = proc
        try:
            proc.wait()
        finally:
            with self._proc_lock:
                if self._proc is proc:
                    self._proc = None

    def stop(self) -> None:
        """Feature: end whatever is currently playing. Safe to call when nothing is."""
        with self._proc_lock:
            proc = self._proc
        if proc is None or proc.poll() is not None:
            return
        try:
            proc.terminate()
            proc.wait(timeout=2)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass


# --- The pipeline ---

_QUEUE_POLL_SECONDS = 0.05


def _put_until_stopped(q: "queue.Queue[Any]", item: Any, stop_event: threading.Event) -> bool:
    """``q.put`` that gives up as soon as ``stop_event`` is set. Returns False if it gave up."""
    while not stop_event.is_set():
        try:
            q.put(item, timeout=_QUEUE_POLL_SECONDS)
            return True
        except queue.Full:
            continue
    return False


def _get_until_stopped(
    q: "queue.Queue[Any]", stop_event: threading.Event
) -> tuple[bool, Any]:
    """``q.get`` that gives up as soon as ``stop_event`` is set. First value is False if so."""
    while not stop_event.is_set():
        try:
            return True, q.get(timeout=_QUEUE_POLL_SECONDS)
        except queue.Empty:
            continue
    return False, None


class VoiceReadAloudService:
    """Feature: read a block of text aloud, one sentence at a time, on a background thread.

    A sentence is made (turned into a wav file) while the previous one plays, so the first sound
    starts as soon as the first sentence is made — not after the whole answer is. Temp files are
    deleted as soon as they have played, or immediately on stop.
    """

    def __init__(
        self,
        temp_dir: str,
        maker: Optional[Any] = None,
        player: Optional[Any] = None,
    ) -> None:
        self._maker = maker or EspeakSentenceMaker(temp_dir)
        self._player = player or SessionAudioPlayer()
        self._state_lock = threading.Lock()
        self._state = "idle"
        self._sentence_index = 0
        self._sentence_count = 0
        self._error: Optional[str] = None
        self._started_at: Optional[float] = None
        self._stop_event = threading.Event()
        self._worker: Optional[threading.Thread] = None

    # --- Public surface: start, stop, status ---

    def start(self, text: str) -> dict[str, Any]:
        """Feature: start reading ``text`` aloud. Stops any current reading first.

        Output: {"ok", "sentence_count", "error"}. Returns at once; the reading itself runs on a
        background thread.
        """
        self.stop()

        cleaned = (text or "").strip()
        if not cleaned:
            return {"ok": False, "sentence_count": 0, "error": "Nothing to read."}

        sentences = split_into_sentences(cleaned)
        if not sentences:
            return {"ok": False, "sentence_count": 0, "error": "Nothing to read."}

        if not espeak_available():
            error = "The Deck's speech program is not installed."
            with self._state_lock:
                self._state = "error"
                self._error = error
            return {"ok": False, "sentence_count": 0, "error": error}

        if not player_available():
            error = "No sound player found on the Deck."
            with self._state_lock:
                self._state = "error"
                self._error = error
            return {"ok": False, "sentence_count": 0, "error": error}

        stop_event = threading.Event()
        with self._state_lock:
            self._state = "speaking"
            self._sentence_index = 0
            self._sentence_count = len(sentences)
            self._error = None
            self._started_at = time.time()
            self._stop_event = stop_event

        worker = threading.Thread(target=self._run, args=(sentences, stop_event), daemon=True)
        self._worker = worker
        worker.start()
        return {"ok": True, "sentence_count": len(sentences), "error": None}

    def stop(self) -> dict[str, Any]:
        """Feature: stop reading. Output: {"ok", "stopped"}. Safe when nothing is playing."""
        with self._state_lock:
            was_active = self._state == "speaking"
            stop_event = self._stop_event
            worker = self._worker

        stop_event.set()
        try:
            self._player.stop()
        except Exception:
            pass
        if worker is not None and worker.is_alive():
            worker.join(timeout=5)

        with self._state_lock:
            self._state = "idle"
            self._sentence_index = 0
            self._sentence_count = 0
            self._error = None
            self._started_at = None
            self._worker = None

        return {"ok": True, "stopped": was_active}

    def status(self) -> dict[str, Any]:
        """Output: {"state", "sentence_index", "sentence_count", "error", "started_at"}."""
        with self._state_lock:
            return {
                "state": self._state,
                "sentence_index": self._sentence_index,
                "sentence_count": self._sentence_count,
                "error": self._error,
                "started_at": self._started_at,
            }

    # --- The worker thread ---

    def _producer(
        self,
        sentences: list[str],
        stop_event: threading.Event,
        q: "queue.Queue[tuple[str, Any]]",
    ) -> None:
        """Makes each sentence's audio, one ahead of playback, feeding a maxsize=1 queue."""
        for sentence in sentences:
            if stop_event.is_set():
                return
            try:
                path = self._maker.make(sentence)
            except Exception as exc:
                _put_until_stopped(q, ("error", str(exc)), stop_event)
                return
            if not _put_until_stopped(q, ("ok", path), stop_event):
                _safe_remove(path)
                return
        _put_until_stopped(q, ("done", None), stop_event)

    def _run(self, sentences: list[str], stop_event: threading.Event) -> None:
        q: "queue.Queue[tuple[str, Any]]" = queue.Queue(maxsize=1)
        producer_thread = threading.Thread(
            target=self._producer, args=(sentences, stop_event, q), daemon=True
        )
        producer_thread.start()

        index = 0
        try:
            while True:
                got, item = _get_until_stopped(q, stop_event)
                if not got:
                    break
                kind, payload = item
                if kind == "done":
                    break
                if kind == "error":
                    with self._state_lock:
                        self._state = "error"
                        self._error = payload
                    break

                path = payload
                with self._state_lock:
                    self._sentence_index = index
                try:
                    self._player.play(path)
                except Exception as exc:
                    with self._state_lock:
                        self._state = "error"
                        self._error = str(exc)
                    _safe_remove(path)
                    break
                _safe_remove(path)
                index += 1
                if stop_event.is_set():
                    break
        finally:
            producer_thread.join(timeout=5)
            while True:
                try:
                    kind, payload = q.get_nowait()
                except queue.Empty:
                    break
                if kind == "ok" and payload:
                    _safe_remove(payload)

        if not stop_event.is_set():
            with self._state_lock:
                if self._state == "speaking":
                    self._state = "done"
