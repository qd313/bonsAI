"""VoiceTranscriptionSession must expose the surface main.py and its own methods call.

Regression test. ``742db60`` (Voice STT session daemon, 2026-07-17) replaced the
``def status(self)`` signature line with the new ``_transcribe_pcm`` method and never re-added
it, leaving ``status()``'s two body lines stranded as unreachable code after
``_transcribe_pcm``'s ``return``. Voice then raised
``AttributeError: 'VoiceTranscriptionSession' object has no attribute 'status'`` on every
attempt for about two and a half weeks.

Three separate callers were broken by that one line: ``start()`` (line ~1283) and ``stop()``
(~1501) inside this class, plus ``start_voice_transcription`` and
``get_voice_transcription_status`` in main.py. Nothing caught it because voice on-Deck QA is
deferred to Tier 2 (VOICE-01…07) and no unit test constructed a session.
"""

import types
import unittest

from backend.voice.voice_transcription_service import (
    VoiceTranscriptionSession,
    new_voice_transcription_state,
)

_LOGGER = types.SimpleNamespace(
    info=lambda *a, **k: None,
    warning=lambda *a, **k: None,
    error=lambda *a, **k: None,
    exception=lambda *a, **k: None,
)


class VoiceSessionStatusTests(unittest.TestCase):
    def _session(self) -> VoiceTranscriptionSession:
        # Constructing does not start capture; start()/stop() are what touch the microphone.
        return VoiceTranscriptionSession("/tmp/plugin", "/tmp/settings", "tiny.en", _LOGGER)

    def test_status_returns_the_live_state_mapping(self) -> None:
        session = self._session()
        status = session.status()
        self.assertIsInstance(status, dict)
        self.assertEqual(status.get("model_id"), "tiny.en")

    def test_status_returns_a_copy_not_the_internal_dict(self) -> None:
        """Callers mutate the polled snapshot (main.py sets ``streaming`` on it)."""
        session = self._session()
        first = session.status()
        first["injected"] = True
        self.assertNotIn("injected", session.status())

    def test_status_reflects_set_state(self) -> None:
        session = self._session()
        session._set_state(recording=True, partial_transcript="hello")
        status = session.status()
        self.assertTrue(status.get("recording"))
        self.assertEqual(status.get("partial_transcript"), "hello")

    def test_status_keys_match_the_shared_default_state(self) -> None:
        """The RPC returns `new_voice_transcription_state()` when no session exists, so a
        session's own snapshot must not be missing keys the frontend expects."""
        session = self._session()
        missing = sorted(set(new_voice_transcription_state()) - set(session.status()))
        self.assertEqual(missing, [])

    def test_public_surface_every_caller_relies_on_exists(self) -> None:
        """Guards the whole class of breakage, not just this instance of it."""
        for name in ("start", "stop", "force_stop", "status"):
            with self.subTest(method=name):
                self.assertTrue(
                    callable(getattr(VoiceTranscriptionSession, name, None)),
                    "VoiceTranscriptionSession.%s is missing or not callable" % name,
                )


if __name__ == "__main__":
    unittest.main()
