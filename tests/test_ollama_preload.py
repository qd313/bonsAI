"""Boot-time Ask model warm-up (roadmap: Speed-mode VRAM preload, developer switch first).

Covers the pure helpers in ``backend.services.ollama_service`` that decide *which* installed
model is small enough to warm and *whether* the warm-up call went out at all. The switch itself
defaults off; on-boot wiring in ``main.Plugin`` is covered separately.
"""

import io
import json
import unittest
import urllib.error
from unittest.mock import MagicMock, patch

from backend.services.ollama_service import (
    PRELOAD_MAX_PARAMETER_BILLIONS,
    parse_parameter_size_billions,
    pick_preload_model,
    preload_ask_model_sync,
)


class _Logger:
    def __init__(self) -> None:
        self.infos: list[str] = []

    def info(self, msg, *args, **kwargs):
        self.infos.append(msg % args if args else msg)

    def warning(self, *args, **kwargs):
        pass

    def exception(self, *args, **kwargs):
        pass


def _http_error(body: str, code: int = 500) -> urllib.error.HTTPError:
    return urllib.error.HTTPError(
        url="http://127.0.0.1:11434/api/generate",
        code=code,
        msg="Server Error",
        hdrs=None,  # type: ignore[arg-type]
        fp=io.BytesIO(body.encode("utf-8")),
    )


class _Resp:
    def __init__(self, payload: bytes):
        self._payload = payload

    def read(self, n: int = -1):
        return self._payload

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class ParseParameterSizeBillionsTests(unittest.TestCase):
    def test_parses_billions(self):
        self.assertEqual(parse_parameter_size_billions("3.8B"), 3.8)

    def test_parses_millions_as_fraction_of_a_billion(self):
        self.assertAlmostEqual(parse_parameter_size_billions("893M"), 0.893)

    def test_case_insensitive_and_whitespace_tolerant(self):
        self.assertEqual(parse_parameter_size_billions(" 7b "), 7.0)

    def test_non_string_is_unknown(self):
        self.assertIsNone(parse_parameter_size_billions(None))
        self.assertIsNone(parse_parameter_size_billions(7))

    def test_unrecognised_shape_is_unknown_not_guessed(self):
        self.assertIsNone(parse_parameter_size_billions("large"))
        self.assertIsNone(parse_parameter_size_billions(""))


class PickPreloadModelTests(unittest.TestCase):
    def test_picks_first_model_at_or_under_the_cap(self):
        models = [
            {"name": "qwen2.5:32b", "details": {"parameter_size": "32B"}},
            {"name": "qwen2.5:3b", "details": {"parameter_size": "3B"}},
            {"name": "gemma3:1b", "details": {"parameter_size": "1B"}},
        ]
        self.assertEqual(pick_preload_model(models), "qwen2.5:3b")

    def test_exactly_at_the_cap_is_eligible(self):
        models = [{"name": "x:3b", "details": {"parameter_size": f"{PRELOAD_MAX_PARAMETER_BILLIONS}B"}}]
        self.assertEqual(pick_preload_model(models), "x:3b")

    def test_no_eligible_model_returns_none(self):
        models = [{"name": "big:32b", "details": {"parameter_size": "32B"}}]
        self.assertIsNone(pick_preload_model(models))

    def test_missing_or_unparsable_size_is_skipped_not_guessed(self):
        models = [
            {"name": "mystery:latest", "details": {}},
            {"name": "also-mystery", "details": {"parameter_size": "huge"}},
            {"name": "small:3b", "details": {"parameter_size": "3B"}},
        ]
        self.assertEqual(pick_preload_model(models), "small:3b")

    def test_empty_or_malformed_input_returns_none(self):
        self.assertIsNone(pick_preload_model(None))
        self.assertIsNone(pick_preload_model([]))
        self.assertIsNone(pick_preload_model("not-a-list"))


class PickPreloadModelTryOrderTests(unittest.TestCase):
    """The try order decides which model; the size cap only decides whether to bother.

    Warming *some* small model is worse than warming none: it spends memory on a model no
    question will reach and leaves the first question exactly as slow. Found on the Deck
    2026-09-05 (PRELOAD-01) with the four models below actually installed.
    """

    DECK_2026_09_05 = [
        {"name": "qwen2.5:1.5b", "details": {"parameter_size": "1.5B"}},
        {"name": "qwen3.5:4b", "details": {"parameter_size": "4.7B"}},
        {"name": "gemma4:e2b-it-qat", "details": {"parameter_size": "4.6B"}},
        {"name": "nomic-embed-text:latest", "details": {"parameter_size": "137M"}},
    ]

    def test_ask_model_over_the_cap_warms_nothing_rather_than_something_else(self):
        """The exact Deck case: Ask routed to a 4.6B model, a 1.5B one also installed."""
        picked = pick_preload_model(
            self.DECK_2026_09_05, ["gemma4:e2b-it-qat", "qwen3.5:4b"]
        )
        self.assertIsNone(picked)

    def test_ask_model_under_the_cap_is_the_one_warmed(self):
        picked = pick_preload_model(self.DECK_2026_09_05, ["qwen2.5:1.5b", "qwen3.5:4b"])
        self.assertEqual(picked, "qwen2.5:1.5b")

    def test_an_entry_in_the_order_that_is_not_installed_is_stepped_over(self):
        """Ask falls through a try-order entry it cannot use, and so does the warm-up."""
        picked = pick_preload_model(
            self.DECK_2026_09_05, ["never-pulled:7b", "qwen2.5:1.5b"]
        )
        self.assertEqual(picked, "qwen2.5:1.5b")

    def test_without_a_try_order_an_embedding_model_is_never_warmed(self):
        """A fresh install has no saved order. An embedding model passes any size cap and can
        never answer a question, so it must not be the fallback pick."""
        picked = pick_preload_model(
            [
                {"name": "nomic-embed-text:latest", "details": {"parameter_size": "137M"}},
                {"name": "qwen2.5:1.5b", "details": {"parameter_size": "1.5B"}},
            ],
            None,
        )
        self.assertEqual(picked, "qwen2.5:1.5b")

    def test_without_a_try_order_falls_back_to_the_first_small_chat_model(self):
        picked = pick_preload_model(self.DECK_2026_09_05, None)
        self.assertEqual(picked, "qwen2.5:1.5b")


class PreloadAskModelSyncTests(unittest.TestCase):
    def setUp(self) -> None:
        # The room calculation reads the server itself; keep these tests off the network. 0 means
        # "say nothing", the old request shape. The test below that needs a number patches it again.
        window = patch("backend.services.ollama_service.choose_window_tokens", return_value=0)
        window.start()
        self.addCleanup(window.stop)

    @patch("backend.services.ollama_service.choose_window_tokens", return_value=16384)
    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_warms_with_the_same_room_ask_will_ask_for(
        self, mock_urlopen: MagicMock, mock_window: MagicMock
    ) -> None:
        """Deck, plan 64 flow H (PRELOAD-01): the warm-up loaded at the server's 4,096 default and
        the first Ask, asking for 16,384, reloaded the model -- warm and cold both 9.8 s."""
        tags_body = json.dumps(
            {"models": [{"name": "qwen2.5:1.5b", "details": {"parameter_size": "1.5B"}}]}
        ).encode("utf-8")
        mock_urlopen.side_effect = [_Resp(tags_body), _Resp(b"{}")]

        preload_ask_model_sync("http://127.0.0.1:11434", _Logger())

        mock_window.assert_called_once()
        self.assertEqual(mock_window.call_args.args[1], "qwen2.5:1.5b")
        sent_body = json.loads(mock_urlopen.call_args_list[1].args[0].data.decode("utf-8"))
        self.assertEqual(sent_body["options"], {"num_ctx": 16384})

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_warms_the_first_eligible_small_model(self, mock_urlopen: MagicMock) -> None:
        tags_body = json.dumps(
            {
                "models": [
                    {"name": "qwen2.5:32b", "details": {"parameter_size": "32B"}},
                    {"name": "qwen2.5:3b", "details": {"parameter_size": "3B"}},
                ]
            }
        ).encode("utf-8")
        mock_urlopen.side_effect = [_Resp(tags_body), _Resp(b"{}")]

        preload_ask_model_sync("http://127.0.0.1:11434", _Logger())

        self.assertEqual(mock_urlopen.call_count, 2)
        tags_req = mock_urlopen.call_args_list[0].args[0]
        gen_req = mock_urlopen.call_args_list[1].args[0]
        self.assertIn("/api/tags", tags_req.full_url)
        self.assertIn("/api/generate", gen_req.full_url)
        sent_body = json.loads(gen_req.data.decode("utf-8"))
        self.assertEqual(sent_body["model"], "qwen2.5:3b")
        self.assertEqual(sent_body["prompt"], "")
        self.assertNotIn("options", sent_body)  # nothing known about the room: say nothing

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_no_eligible_model_skips_without_a_warm_request(self, mock_urlopen: MagicMock) -> None:
        tags_body = json.dumps(
            {"models": [{"name": "qwen2.5:32b", "details": {"parameter_size": "32B"}}]}
        ).encode("utf-8")
        mock_urlopen.return_value = _Resp(tags_body)

        preload_ask_model_sync("http://127.0.0.1:11434", _Logger())

        self.assertEqual(mock_urlopen.call_count, 1)

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_an_empty_saved_order_still_uses_the_order_ask_would_build(
        self, mock_urlopen: MagicMock
    ) -> None:
        """The maintainer's Deck, measured 2026-09-05 (PRELOAD-01).

        The saved try order was ``[]``. Reading only the saved order would fall back to guessing
        and warm ``qwen2.5:1.5b`` at 1.5B, but Ask's own resolver builds
        ``["gemma4:e2b-it-qat", "qwen2.5:1.5b", ...]`` from what is installed, so Ask's first
        model is the 4.6B one. Warming nothing is the right answer, and warming the 1.5B model is
        the wrong one: no question would have reached it.
        """
        tags_body = json.dumps(
            {
                "models": [
                    {"name": "qwen2.5:1.5b", "details": {"parameter_size": "1.5B"}},
                    {"name": "qwen3.5:4b", "details": {"parameter_size": "4.7B"}},
                    {"name": "gemma4:e2b-it-qat", "details": {"parameter_size": "4.6B"}},
                    {"name": "nomic-embed-text:latest", "details": {"parameter_size": "137M"}},
                ]
            }
        ).encode("utf-8")
        mock_urlopen.return_value = _Resp(tags_body)

        preload_ask_model_sync(
            "http://127.0.0.1:11434",
            _Logger(),
            settings={"text_model_routing_order": []},
        )

        # Only /api/tags was fetched: no warm request went out at all.
        self.assertEqual(mock_urlopen.call_count, 1)

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_unreachable_host_is_swallowed_silently(self, mock_urlopen: MagicMock) -> None:
        mock_urlopen.side_effect = urllib.error.URLError("connection refused")

        # Must not raise -- an unreachable host at boot is exactly the case this has to be quiet about.
        preload_ask_model_sync("http://127.0.0.1:11434", _Logger())

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_vram_pressure_on_the_warm_request_is_swallowed_silently(
        self, mock_urlopen: MagicMock
    ) -> None:
        tags_body = json.dumps(
            {"models": [{"name": "qwen2.5:3b", "details": {"parameter_size": "3B"}}]}
        ).encode("utf-8")
        mock_urlopen.side_effect = [
            _Resp(tags_body),
            _http_error('{"error":"model requires more system memory than is available"}'),
        ]

        # Must not raise -- memory pressure at boot is the headline case in the roadmap entry.
        preload_ask_model_sync("http://127.0.0.1:11434", _Logger())

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_malformed_tags_response_is_swallowed_silently(self, mock_urlopen: MagicMock) -> None:
        mock_urlopen.return_value = _Resp(b"not json")

        preload_ask_model_sync("http://127.0.0.1:11434", _Logger())


if __name__ == "__main__":
    unittest.main()
