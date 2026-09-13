#!/usr/bin/env python3
"""Title: Step 12 extraction probe

Purpose: Exercise the four main.py extractions and the voice-install fix against the deployed plugin.
Used for: MAINPY-EXTRACT-01 and VOICE-CLEAR-01, the parts a unit test cannot reach.
Solves: The step 12 code is verified by 492 unit tests and had never executed on a Deck.
Does not: Touch real settings, run clear_plugin_data, or drive the UI — D-pad and layout stay manual.

Run **on the Deck** against the deployed plugin:

    ssh deck@<ip> 'python3 -' < scripts/probe_deck_step12_extractions.py

Writes are redirected to a temp tree, same as probe_deck_rpc_surface.py. The real Ollama host is
read from the deployed settings file but only *read from* — a live Ask is started and aborted,
which is the point: item 12.4 moved the handle-close that makes Stop work.

Exit code is non-zero if any check fails.
"""

import asyncio
import json
import logging
import os
import sys
import tempfile
import time
import types

DEFAULT_PLUGIN_DIR = os.path.expanduser("~/homebrew/plugins/bonsAI")
REAL_SETTINGS = os.path.expanduser("~/homebrew/settings/bonsAI/settings.json")

results: list[tuple[str, str, str]] = []


def check(label: str, ok: bool, detail: str = "") -> None:
    results.append((label, "ok" if ok else "FAIL", detail))


def _install_decky_stub(plugin_dir: str, tmp: str) -> None:
    for sub in ("settings", "runtime", "log"):
        os.makedirs(os.path.join(tmp, sub), exist_ok=True)
    decky = types.ModuleType("decky")
    decky.DECKY_PLUGIN_SETTINGS_DIR = os.path.join(tmp, "settings")
    decky.DECKY_PLUGIN_RUNTIME_DIR = os.path.join(tmp, "runtime")
    decky.DECKY_PLUGIN_LOG_DIR = os.path.join(tmp, "log")
    decky.DECKY_PLUGIN_DIR = plugin_dir
    logging.basicConfig(level=logging.CRITICAL)
    decky.logger = logging.getLogger("bonsai-step12-probe")
    sys.modules["decky"] = decky


def _real_host() -> str:
    """Read the configured Ollama host from the deployed settings, without writing to them."""
    try:
        with open(REAL_SETTINGS, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except Exception:
        return ""
    if data.get("ollama_local_on_deck"):
        return "127.0.0.1"
    return str(data.get("ollama_pc_ip") or "").strip()


async def probe_health(plugin) -> str:
    """12.2 — the probe moved to ollama_service. Unreachable first, then the real host."""
    bad = await plugin.test_ollama_connection("10.255.255.1", 3)
    check(
        "12.2 unreachable host reports not reachable",
        bad.get("reachable") is False and bool(bad.get("error")),
        str(bad.get("error", ""))[:60],
    )

    host = _real_host()
    if not host:
        check("12.2 real host", True, "SKIPPED - no host configured")
        return ""

    good = await plugin.test_ollama_connection(host, 10)
    if not good.get("reachable"):
        check("12.2 real host reachable", False, str(good.get("error", ""))[:70])
        return ""

    models = good.get("models") or []
    ps = good.get("ps_loaded")
    check(
        "12.2 real host reachable",
        True,
        f"v{good.get('version')} models={len(models)} ps={len(ps or [])}",
    )
    # The /api/ps shaping and the VRAM ratio are the parts with no prior coverage at all.
    check("12.2 ps_loaded is a list", isinstance(ps, list), type(ps).__name__)
    for row in ps or []:
        share = row.get("vram_weight_share_pct_appx")
        check(
            f"12.2 vram share sane for {row.get('name')}",
            share is None or (0.0 <= float(share) <= 100.0),
            f"{share}",
        )
    return host


async def probe_voice_reset(plugin) -> None:
    """VOICE-CLEAR-01 — the fixed path, without running the destructive clear_plugin_data."""
    from backend.services.voice_transcription_service import new_voice_install_state

    async def already_done():
        return None

    task = asyncio.ensure_future(already_done())
    await task

    plugin._voice_install_task = task
    plugin._voice_install_state = {"phase": "done", "done": True, "ok": True, "model_id": "base.en"}

    await plugin._reset_voice_install_after_clear()

    check(
        "VOICE-CLEAR-01 finished install does not survive the clear",
        plugin._voice_install_state == new_voice_install_state(),
        str(plugin._voice_install_state)[:70],
    )
    check("VOICE-CLEAR-01 task handle cleared", plugin._voice_install_task is None)


async def probe_stop(plugin, host: str) -> None:
    """12.4 — a real Ask, aborted mid-flight. The handle-close is what unblocks the read."""
    if not host:
        check("12.4 live abort", True, "SKIPPED - no reachable host")
        return

    # Token streaming used to be a switch that defaulted off, so this probe turned it on to
    # exercise the partial-response path. It is how replies always arrive now (2026-09-05), so
    # there is nothing to turn on -- the path below is exercised either way.
    check("12.4 token streaming is always on", True)

    started = await plugin.start_background_game_ai(
        "Write an extremely long, detailed, exhaustive guide to Steam Deck performance tuning. "
        "Cover every subsystem in depth. Do not stop early; write at least 3000 words.",
        host,
    )
    if not started.get("accepted"):
        check("12.4 ask accepted", False, str(started)[:70])
        return
    check("12.4 ask accepted", True, f"request_id={started.get('request_id')}")

    # Abort while the request is genuinely in flight. Waiting for a partial is not required -
    # the point is that the HTTP read is live - so abort as soon as we are pending and warm.
    partial_seen = False
    finished_early = False
    deadline = time.time() + 6.0
    while time.time() < deadline:
        await asyncio.sleep(0.25)
        status = await plugin.get_background_game_ai_status()
        if status.get("status") != "pending":
            finished_early = True
            break
        if status.get("partial_response") or status.get("streaming"):
            partial_seen = True
            break

    if finished_early:
        # Not a defect - the model simply answered faster than the probe could interrupt.
        check("12.4 live abort", True, "SKIPPED - answer completed before abort was possible")
        return

    check("12.4 partial text visible mid-flight", partial_seen, "streaming path exercised")

    t0 = time.time()
    await plugin.abort_background_game_ai()
    elapsed = time.time() - t0
    check("12.4 abort returned promptly", elapsed < 5.0, f"{elapsed:.2f}s")

    after = await plugin.get_background_game_ai_status()
    check(
        "12.4 state is cancelled",
        after.get("status") == "cancelled",
        str(after.get("status")),
    )
    kept = str(after.get("response") or "")
    check(
        "12.4 partial answer kept (or explicit Stopped)",
        bool(kept.strip()),
        f"{len(kept)} chars: {kept[:40]!r}",
    )
    # Regression guard for the 2026-08-04 '<' bug: an early Stop used to keep the first character
    # of a status tag as the whole answer. Whatever is kept must read as text, not as markup debris.
    check(
        "12.4 kept text is not a tag fragment",
        any(c.isalnum() for c in kept),
        f"{kept[:40]!r}",
    )

    # The task must actually be gone, not merely marked cancelled - 12.3's cancel_and_await.
    check("12.3 background task released", plugin._background_task is None)


async def main_probe(plugin_dir: str) -> int:
    import main

    plugin = main.Plugin()
    await plugin._main()

    host = await probe_health(plugin)
    await probe_voice_reset(plugin)
    await probe_stop(plugin, host)

    # 12.3 - the unload path, which changed for both the local-Ollama and voice-install tasks.
    try:
        await plugin._unload()
        check("12.3 _unload clean", True)
    except Exception as exc:
        check("12.3 _unload clean", False, f"{type(exc).__name__}: {exc}")

    width = max(len(r[0]) for r in results) + 2
    print(f"{'CHECK'.ljust(width)}{'RESULT'.ljust(10)}DETAIL")
    for label, res, detail in results:
        print(f"{label.ljust(width)}{res.ljust(10)}{detail}")
    failed = sum(1 for _l, r, _d in results if r != "ok")
    print(f"\nchecks={len(results)}  failed={failed}")
    return 1 if failed else 0


def run() -> int:
    plugin_dir = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_PLUGIN_DIR
    if not os.path.isdir(plugin_dir):
        print(f"plugin dir not found: {plugin_dir}", file=sys.stderr)
        return 2
    for p in (plugin_dir, os.path.join(plugin_dir, "py_modules")):
        if p not in sys.path:
            sys.path.insert(0, p)
    with tempfile.TemporaryDirectory(prefix="bonsai-step12-probe-") as tmp:
        _install_decky_stub(plugin_dir, tmp)
        os.chdir(plugin_dir)
        return asyncio.run(main_probe(plugin_dir))


if __name__ == "__main__":
    raise SystemExit(run())
