"""Title: Deciding whether the microphone is hearing speech right now

Purpose: While you talk, the plugin decodes the newest three seconds of the recording
again and again. Decoding costs the Deck real CPU, so a pass is only worth running when
there is speech in that window, and the plugin also needs to know when you last spoke so
it can tell a pause from the end of a sentence. This file answers both from how loud the
recording is, and the loudness it compares against adapts to this microphone and this room.

Used for: voice_transcription_service.VoiceTranscriptionSession -- `observe()` on every
chunk the capture process delivers, `window_voiced()` before every decode pass.

Solves: Found on the Deck on 2026-10-09 and reproduced on 2026-10-10 with a recorded
sentence played quietly: the gate used to compare the AVERAGE loudness of the last three
seconds against one fixed number (120). The Deck's own microphone is quiet (speech peaks at
about 150 to 250), so a normal speaker's average, which includes the gaps between words,
sat just under the number. The first couple of seconds passed (the button press and the
start of the sentence were loud enough), then every pass was skipped and the words stopped
growing for the rest of the recording while the mic still looked like it was listening.
Here a window counts as speech when a few short slices of it are clearly louder than the
quiet the microphone itself has been sitting at, however loud the speaker is on average.

Does not: Decode anything, decide when a recording starts or stops, or filter out the
words whisper makes up from noise -- voice_transcript_decode_service still does that.

How it works:

    every chunk from the mic --> cut into 64 ms slices --> each slice's loudness (RMS)
                                         |
                    the quietest fifth of the last ~40 s of slices = the "floor"
                                         |
         a slice is "voiced" when it is louder than 3 x floor, but never judged
         louder than 120 (the old fixed number) and never quieter than 50
                                         |
        a decode window is worth a pass when at least 4 of its slices are voiced
"""

from __future__ import annotations

from collections import deque

from backend.services.voice_audio_capture_service import _pcm_rms
from backend.services.voice_whisper_runtime import SAMPLE_WIDTH

# 64 ms of 16 kHz mono 16-bit sound.
SLICE_BYTES = 2048
# Never call a slice speech below this, whatever the floor says (a mic at rest is below it).
MIN_VOICED_RMS = 50.0
# Never ask for more than the old fixed gate: a noisy room cannot make speech inaudible to it.
MAX_VOICED_RMS = 120.0
FLOOR_MULTIPLE = 3.0
FLOOR_FRACTION = 0.2
# About 40 seconds of slices.
HISTORY_SLICES = 625
# Slices needed before the floor is trusted at all (until then the old fixed number applies).
MIN_HISTORY_SLICES = 10
# A window needs this many voiced slices (a quarter of a second) to count as speech, so one
# click of the button does not start a decode.
MIN_VOICED_SLICES = 4


def slice_levels(pcm: bytes) -> list[float]:
    """RMS of each 64 ms slice of `pcm`; a last piece under half a slice is left out."""
    levels: list[float] = []
    for start in range(0, len(pcm), SLICE_BYTES):
        piece = pcm[start : start + SLICE_BYTES]
        if len(piece) < SLICE_BYTES // 2 and levels:
            break
        if len(piece) >= SAMPLE_WIDTH:
            levels.append(_pcm_rms(piece))
    return levels


class VoiceLevelGate:
    """Learns the microphone's resting level and says which sound counts as speech."""

    def __init__(self) -> None:
        self._history: deque[float] = deque(maxlen=HISTORY_SLICES)

    def floor(self) -> float:
        """The loudness of the quietest fifth of what the mic has delivered so far."""
        ordered = sorted(self._history)
        return ordered[int(len(ordered) * FLOOR_FRACTION)] if ordered else 0.0

    def threshold(self) -> float:
        """The loudness a slice must reach to count as speech right now.

        Until the mic has been heard for a moment (the first 0.64 s) nothing is known about its
        resting level, so the old fixed number applies and a click cannot start a decode.
        """
        if len(self._history) < MIN_HISTORY_SLICES:
            return MAX_VOICED_RMS
        return min(MAX_VOICED_RMS, max(MIN_VOICED_RMS, self.floor() * FLOOR_MULTIPLE))

    def observe(self, chunk: bytes) -> bool:
        """Take one chunk from the mic; True when any slice of it is speech."""
        levels = slice_levels(chunk)
        if not levels:
            return False
        self._history.extend(levels)
        limit = self.threshold()
        return any(level >= limit for level in levels)

    def window_voiced(self, pcm: bytes) -> bool:
        """True when `pcm` (a decode window) holds enough speech to be worth a pass."""
        limit = self.threshold()
        return sum(1 for level in slice_levels(pcm) if level >= limit) >= MIN_VOICED_SLICES
