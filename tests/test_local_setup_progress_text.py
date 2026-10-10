"""The line under the Update and Install buttons moves while a download runs.

`ollama pull` redraws one progress line with colour codes and block characters. The setup status
keeps the newest one as plain words (`progress_text`) so the tab can show it.
"""

from __future__ import annotations

import asyncio
import unittest
from unittest.mock import patch

from backend.services import local_ollama_setup_service as setup
from backend.services.local_setup_progress_text import progress_text_from_line

S = "backend.services.local_ollama_setup_service"
RAW = "\x1b[2K\x1b[1Gpulling 6e4c38e1172f:  43% \u2595\u2588\u2588\u2588        \u258f 1.3 GB/3.2 GB  25 MB/s   1m10s"


class ProgressTextTests(unittest.TestCase):
    def test_a_progress_line_becomes_one_plain_sentence(self):
        self.assertEqual(progress_text_from_line(RAW), "Downloading 6e4c38e1172f: 43% 1.3 GB/3.2 GB 25 MB/s 1m10s")

    def test_lines_without_a_percentage_give_nothing(self):
        self.assertEqual(progress_text_from_line("pulling manifest \u280b"), "")


class StatusCarriesProgressTests(unittest.TestCase):
    def test_the_status_holds_the_newest_progress_while_a_pull_runs_and_clears_it_after(self):
        state: dict = {"phase": "running"}
        seen: list[str] = []

        def fake_pull(_bin, _tag, log, _cancelled):
            log(RAW)
            seen.append(state["progress_text"])
            return True, ""

        async def go():
            with (
                patch(f"{S}._install_or_update_ollama_binary", return_value="/x/ollama"),
                patch(f"{S}.probe_ollama_http_ok", return_value=True),
                patch(f"{S}.ensure_ollama_server_listening_before_pull", return_value=True),
                patch(f"{S}.ensure_ollama_cli_home_ready", return_value=True),
                patch(f"{S}.list_installed_ollama_tags", return_value=["a:1"]),
                patch(f"{S}.run_ollama_pull", side_effect=fake_pull),
                patch(f"{S}.record_result", side_effect=lambda st, *_a: st.update(progress_text="")),
                patch(f"{S}.sys.platform", "linux"),
            ):
                logger = type("L", (), {"info": lambda *a, **k: None, "exception": lambda *a, **k: None})()
                await setup.run_local_setup(
                    profile="update_installed", state=state, logger=logger, cancel_event=asyncio.Event()
                )

        asyncio.run(go())
        self.assertEqual(seen, ["Downloading 6e4c38e1172f: 43% 1.3 GB/3.2 GB 25 MB/s 1m10s"])
        self.assertEqual(state["progress_text"], "")


if __name__ == "__main__":
    unittest.main()
