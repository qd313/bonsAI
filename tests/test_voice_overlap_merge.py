"""A spoken question must not come out with its words doubled.

The plugin decodes the newest three seconds of the recording again and again
(see voice_transcription_service._transcribe_loop). Every pass hears the same
words again, but not spelled the same: "two" becomes "2", the first word is
cut in half where the window starts. On the Deck on 2026-10-02 that gave
"Testing one, two. Testing 1 2 3 4 Testing One, two, three, four, five. ..."

Here a fake speech step plays a timed sentence into the real joining code
(merge_sliding_window_transcript, the same call the loop makes) and checks
that no stretch of three words shows up twice and no word goes missing.
"""

import random
import re
import unittest

from backend.services.voice_transcription_service import (
    SILENCE_HOLD_SECONDS,
    TRANSCRIBE_INTERVAL_S,
    WINDOW_SECONDS,
    merge_sliding_window_transcript,
)
from backend.services.voice_transcript_decode_service import _join_transcript_parts

SENTENCES = (
    "testing one two three four five six seven eight nine ten",
    "what is the best way to beat the second boss in this game today",
)
SECONDS_PER_WORD = 0.55
DIGITS = {
    "one": "1", "two": "2", "three": "3", "four": "4", "five": "5",
    "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10",
}


def _plain(word: str) -> str:
    word = re.sub(r"[^a-z0-9]+", "", word.lower())
    return DIGITS.get(word, word)


def _fake_whisper(words, t, rng):
    """What whisper would print for the audio between t-3s and t (with its habits)."""
    heard = []
    for i, word in enumerate(words):
        start, end = i * SECONDS_PER_WORD, i * SECONDS_PER_WORD + 0.45
        if end > t:
            continue
        if start >= t - WINDOW_SECONDS:
            heard.append(word)
        elif end > t - WINDOW_SECONDS + 0.1:  # the window starts inside this word
            heard.append(word[: max(3, len(word) - 1)])
    use_digits = rng.random() < 0.5
    out = []
    for word in heard:
        if use_digits:
            word = DIGITS.get(word, word)
        if rng.random() < 0.2:
            word += ","
        out.append(word)
    if out and rng.random() < 0.5:
        out[0] = out[0].capitalize()
    return " ".join(out)


def _run_recording(sentence, seed, pause_after_s=None):
    """Feed the sentence through the real merge, one pass every 0.4 s."""
    words = sentence.split()
    rng = random.Random(seed)
    finalized, partial = "", ""
    t = 0.5
    last_speech_end = len(words) * SECONDS_PER_WORD
    while t < last_speech_end + WINDOW_SECONDS:
        text = _fake_whisper(words, t, rng)
        if text:
            finalized, partial = merge_sliding_window_transcript(finalized, partial, text)
            silent_for = t - min(t, last_speech_end)
            if pause_after_s is not None and silent_for >= pause_after_s and partial:
                # What the loop does after a pause: fold the partial in.
                finalized = _join_transcript_parts(finalized, partial)
                partial = ""
        t += TRANSCRIBE_INTERVAL_S
    return _join_transcript_parts(finalized, partial)


def _repeated_run(text, size=3):
    plain = [_plain(w) for w in text.split() if _plain(w)]
    seen = {}
    for i in range(len(plain) - size + 1):
        run = tuple(plain[i : i + size])
        if run in seen:
            return " ".join(run)
        seen[run] = i
    return None


class VoiceOverlapMergeTests(unittest.TestCase):
    def test_same_sentence_five_times_has_no_stretch_twice(self):
        for sentence in SENTENCES:
            for seed in range(5):
                with self.subTest(sentence=sentence[:20], seed=seed):
                    out = _run_recording(sentence, seed)
                    self.assertIsNone(_repeated_run(out), f"doubled words in: {out!r}")

    def test_no_spoken_word_goes_missing(self):
        for sentence in SENTENCES:
            for seed in range(5):
                with self.subTest(sentence=sentence[:20], seed=seed):
                    out = _run_recording(sentence, seed)
                    heard = [_plain(w) for w in out.split()]
                    # Clipped first words ("Testin") count as the word they cut.
                    for word in sentence.split():
                        key = _plain(word)
                        self.assertTrue(
                            any(h and key.startswith(h) and len(h) >= 3 or h == key for h in heard),
                            f"{word!r} missing from {out!r}",
                        )

    def test_pause_then_redecode_does_not_double(self):
        # After 2 s of quiet the loop folds the partial into the finalized text;
        # the next pass still hears the same last seconds and must not add them again.
        for sentence in SENTENCES:
            for seed in range(5):
                with self.subTest(sentence=sentence[:20], seed=seed):
                    out = _run_recording(sentence, seed, pause_after_s=SILENCE_HOLD_SECONDS - 1.2)
                    self.assertIsNone(_repeated_run(out), f"doubled words in: {out!r}")

    def test_the_deck_screenshot_shape_is_reproduced_and_cured(self):
        # Consecutive decodes of the same few seconds, as seen on 2026-10-02.
        passes = [
            "Testing one, two.",
            "Testing 1 2 3 4",
            "Testing one, two, three, four, five.",
            "3 4 5 6",
            "for 5-6-7-8.",
            "5 6 7 8 9 10",
        ]
        finalized, partial = "", ""
        for text in passes:
            finalized, partial = merge_sliding_window_transcript(finalized, partial, text)
        out = _join_transcript_parts(finalized, partial)
        self.assertEqual(out.lower().count("testing"), 1, out)


if __name__ == "__main__":
    unittest.main()
