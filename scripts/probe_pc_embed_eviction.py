#!/usr/bin/env python3
"""Title: PC embedding-eviction probe

Purpose: Find out, on the maintainer's PC, whether asking the chat model something pushes the
         embedding model out of Ollama's memory, so that the next search has to reload it.
Used for: docs/planning/48-kb-wave-three-session.md, lane w3-speedcheck, part two — a candidate
          explanation for runs/plan48-R6-time-budget.json, where a Deck search that should take
          tens of milliseconds took over a second right after the chat model had just answered.
Solves: Nothing on its own — this is a measurement, not a fix. It reads what Ollama says it has
         loaded (``/api/ps``) before and after each step, so a slow reading can be told apart from
         a reload the model itself reports, rather than guessed at.
Does not: Touch the Deck, change any setting, or draw a conclusion about the Deck from a PC
          reading — this machine has far more memory than a Deck, so a clean result here does not
          clear the Deck; it only says this machine could not reproduce the problem, which is
          itself expected if the cause is a memory limit the PC does not have.

Run from the maintainer PC with Ollama running (127.0.0.1:11434 by default):

    python scripts/probe_pc_embed_eviction.py
    python scripts/probe_pc_embed_eviction.py --out runs/plan48-embed-eviction-pc.json
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
PY_MODULES = REPO_ROOT / "py_modules"
if str(PY_MODULES) not in sys.path:
    sys.path.insert(0, str(PY_MODULES))

from backend.ollama_connectivity import ollama_http_base_from_pc_ip_field  # noqa: E402
from backend.ollama_urls import build_ollama_chat_url  # noqa: E402
from backend.services.ollama_embed_service import (  # noqa: E402
    DEFAULT_EMBEDDING_MODEL,
    OllamaEmbedError,
    embed_texts,
)

DEFAULT_ASK_MODEL = "gemma4:e2b-it-qat"
EMBED_TIMEOUT_S = 30.0  # generous: a cold load, not just a request, is timed here on purpose
CHAT_TIMEOUT_S = 60.0


def loaded_models(base_http: str) -> list[str]:
    """Return the model names Ollama's own ``/api/ps`` says are loaded right now."""
    req = urllib.request.Request(f"{base_http}/api/ps", method="GET")
    try:
        with urllib.request.urlopen(req, timeout=5.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        return [f"(could not read /api/ps: {exc})"]
    return [str(m.get("name") or m.get("model") or "?") for m in data.get("models", []) or []]


def timed_embed(pc_ip: str, model: str) -> float:
    """One embedding call, timed. Raises ``OllamaEmbedError`` on failure — the caller decides
    whether that stops the run."""
    t0 = time.perf_counter()
    embed_texts(pc_ip, ["how do i beat the glyphid dreadnought"], model=model, timeout_s=EMBED_TIMEOUT_S)
    return round((time.perf_counter() - t0) * 1000, 2)


def unload(base_http: str, model: str) -> None:
    """Ask Ollama to drop `model` from memory right now (``keep_alive: 0``), best-effort, so
    step 1's "cold" reading is not measuring whatever another process left warm."""
    body = json.dumps({"model": model, "keep_alive": 0}).encode("utf-8")
    req = urllib.request.Request(
        f"{base_http}/api/generate", data=body,
        headers={"Content-Type": "application/json"}, method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10.0) as resp:
            resp.read()
    except (urllib.error.URLError, TimeoutError, OSError):
        pass  # best-effort -- a failed unload just means step 1 may not be truly cold


def timed_chat(pc_ip: str, model: str) -> float:
    """One short, throwaway ``/api/chat`` completion, timed. Raises on any HTTP, JSON or shape
    problem."""
    url = build_ollama_chat_url(ollama_http_base_from_pc_ip_field(pc_ip))
    body = json.dumps(
        {
            "model": model,
            "messages": [{"role": "user", "content": "Reply with one word: ready"}],
            "stream": False,
            "think": False,
            "options": {"num_predict": 8},
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        url, data=body, headers={"Content-Type": "application/json"}, method="POST"
    )
    t0 = time.perf_counter()
    with urllib.request.urlopen(req, timeout=CHAT_TIMEOUT_S) as resp:
        resp.read()
    return round((time.perf_counter() - t0) * 1000, 2)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--pc-ip", default="127.0.0.1")
    p.add_argument("--embed-model", default=DEFAULT_EMBEDDING_MODEL)
    p.add_argument("--ask-model", default=DEFAULT_ASK_MODEL)
    p.add_argument(
        "--out",
        default=str(REPO_ROOT / "runs" / "plan48-embed-eviction-pc.json"),
        help="Where to write the JSON evidence file.",
    )
    return p.parse_args()


def main() -> int:
    args = parse_args()
    base_http = ollama_http_base_from_pc_ip_field(args.pc_ip)

    print("ollama host :", base_http)
    print("embed model :", args.embed_model)
    print("ask model   :", args.ask_model)
    print()

    print("unloading both models so step 1 starts cold ...")
    unload(base_http, args.embed_model)
    unload(base_http, args.ask_model)
    time.sleep(1.0)
    print("loaded now  :", loaded_models(base_http))
    print()

    steps: list[dict[str, Any]] = []

    def record(label: str, fn, **kwargs) -> None:
        loaded_before = loaded_models(base_http)
        try:
            ms = fn(**kwargs)
            error = None
        except (OllamaEmbedError, urllib.error.URLError, TimeoutError, OSError) as exc:
            ms = None
            error = str(exc)
        loaded_after = loaded_models(base_http)
        steps.append(
            {
                "step": label,
                "loaded_before": loaded_before,
                "ms": ms,
                "error": error,
                "loaded_after": loaded_after,
            }
        )
        print("%-32s %8s ms   before=%s  after=%s"
              % (label, ("%.2f" % ms) if ms is not None else "FAILED", loaded_before, loaded_after))
        if error:
            print("    error:", error)

    record("1. embed (cold)", timed_embed, pc_ip=args.pc_ip, model=args.embed_model)
    record("2. embed (no chat between)", timed_embed, pc_ip=args.pc_ip, model=args.embed_model)
    record("3. chat generation", timed_chat, pc_ip=args.pc_ip, model=args.ask_model)
    record("4. embed (after chat)", timed_embed, pc_ip=args.pc_ip, model=args.embed_model)

    step1_ms = steps[0]["ms"]
    step2_ms = steps[1]["ms"]
    step4_ms = steps[3]["ms"]
    evicted = None
    if step1_ms is not None and step2_ms is not None and step4_ms is not None:
        # A generous line: step 4 counts as "slowed by the chat call" only if it is both clearly
        # slower than the back-to-back reading in step 2 and in the same range as the cold read
        # in step 1 -- i.e. it looks like a reload, not ordinary noise.
        evicted = step4_ms > step2_ms * 2 and step4_ms >= step1_ms * 0.5

    report = {
        "probe": "probe_pc_embed_eviction.py",
        "when": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "machine": "maintainer PC (Windows) -- NOT the Deck; see what_this_means",
        "ollama_host": base_http,
        "embed_model": args.embed_model,
        "ask_model": args.ask_model,
        "steps": steps,
        "looks_like_eviction_on_this_machine": evicted,
        "what_this_means": (
            "This checks one guess for why a Deck search is slow right after a question is "
            "answered: that answering pushes the note-search model out of memory, so the next "
            "search has to reload it. On this PC, step 2 (a repeat search with no answer in "
            "between) and step 4 (a search right after an answer) came out "
            + (
                "close together, so nothing here got pushed out of memory."
                if evicted is False
                else (
                    "far apart, with step 4 much slower, which is what pushing the model out of "
                    "memory would look like."
                    if evicted
                    else "not fully measured -- see the per-step errors."
                )
            )
            + " This machine has far more memory than a Deck. A clean result here does not clear "
            "the Deck -- it likely just means this PC never runs low enough on memory to push "
            "anything out, which would itself explain why repeat questions are fast here and slow "
            "on the Deck. Nothing about the Deck is decided by this reading alone."
        ),
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print()
    print("wrote", out_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
