"""Title: One readable progress line from Ollama's download output

Purpose: `ollama pull` redraws a progress bar on one line, with colour codes and block
    characters, for every layer of a model. This turns one such line into a short plain one for
    the Ollama tab, such as "Downloading 6e4c38e1172f: 43% 1.3 GB/3.2 GB 25 MB/s 1m10s".

Used for: the setup run in local_ollama_setup_service.py, which keeps the newest result in the
    setup status so the line under the Update and Install buttons moves while a download runs.

Does not: decide when a download is done or failed; a line with no percentage gives "".
"""

from __future__ import annotations

import re

_ESCAPES = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]")
_BAR_AND_SPINNER = re.compile("[\u2580-\u259f\u2800-\u28ff\u2500-\u257f]+")
_PULLING_PREFIX = re.compile(r"^pulling\s+(?=[0-9a-f]{8,}:)", re.I)


def progress_text_from_line(line: str) -> str:
    """In: one output line of `ollama pull`. Out: the short plain line, or "" if it has no percentage."""
    text = _BAR_AND_SPINNER.sub(" ", _ESCAPES.sub("", line or ""))
    text = " ".join(text.split())
    if "%" not in text:
        return ""
    return _PULLING_PREFIX.sub("Downloading ", text)
