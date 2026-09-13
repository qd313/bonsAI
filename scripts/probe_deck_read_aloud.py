#!/usr/bin/env python3
"""Title: Deck read-aloud probe (plan 42 rows TTS-FEAS-01 and 02)

Purpose: Prove, on the Deck itself, the two things Phase 1 of reading answers aloud stands on:
         the built-in voice is there and makes speech quickly (row 01), and a program running the
         way the plugin's background program runs -- as root, outside the Steam session -- can play
         that speech through the session's sound system (row 02).
Used for: docs/planning/42-read-aloud-feasibility.md § 7 rows 01 and 02, before the build in § 8.
Solves: Row 02 is the one that could sink the plan. The plugin's Python side runs as root with
        none of the session's sound sockets in its environment; the microphone code finds them by
        reading a Steam process's environment. This probe reuses that exact code path
        (voice_transcription_service._env_for_audio_capture) rather than re-deriving it, so a
        pass here is a pass for the plugin, not for a hand-built environment.
Does not: Judge whether a human heard the sound -- it reports that a playback stream appeared on
          the session's sound server and which output it went to. Whether it was audible over a
          game is the maintainer's ear, see the testing doc row. Does not download anything, does
          not touch the plugin's settings, leaves one small sound file in /tmp.

Run from the PC, as root on the Deck (the plugin's real situation):

    ssh deck@<ip> 'sudo -n python3 -' < scripts/probe_deck_read_aloud.py

Or as the deck user for comparison (the session env is already set there):

    ssh deck@<ip> 'python3 -' < scripts/probe_deck_read_aloud.py

Prints one OK / FAIL / INFO line per check and a JSON summary at the end.
"""
import json
import os
import shutil
import subprocess
import sys
import time
import wave

PLUGIN_DIR = "/home/deck/homebrew/plugins/bonsAI"
sys.path.insert(0, PLUGIN_DIR)
sys.path.insert(0, os.path.join(PLUGIN_DIR, "py_modules"))

SENTENCE = "The mushroom cap breaks after three hits, so wait for the third swing and roll left."
# Per user: a root run and a deck-user run must not fight over one file in /tmp.
WAV = f"/tmp/bonsai_read_aloud_probe_{os.getuid()}.wav"

summary: dict = {"user": os.environ.get("USER") or os.environ.get("LOGNAME") or str(os.getuid())}


def say(kind: str, msg: str) -> None:
    print(f"{kind} {msg}", flush=True)


def os_version() -> str:
    try:
        with open("/etc/os-release", encoding="utf-8") as f:
            for line in f:
                if line.startswith("VERSION_ID="):
                    return line.split("=", 1)[1].strip().strip('"')
    except OSError:
        pass
    return "unknown"


def row01() -> bool:
    """The built-in voice is there and makes speech from one sentence in well under a second."""
    summary["steamos"] = os_version()
    say("INFO", f"SteamOS {summary['steamos']}, running as uid {os.getuid()}")
    tools = {t: shutil.which(t) for t in ("espeak-ng", "speech-dispatcher", "orca", "pw-play", "paplay", "pactl")}
    summary["tools"] = tools
    for name, path in tools.items():
        say("OK" if path else "INFO", f"{name}: {path or 'missing'}")
    if not tools["espeak-ng"]:
        say("FAIL", "row01: no built-in voice program on this Deck")
        return False
    if os.path.exists(WAV):
        os.remove(WAV)
    t0 = time.perf_counter()
    r = subprocess.run(["espeak-ng", "-v", "en-us", "-s", "165", "-w", WAV, SENTENCE], capture_output=True, text=True, timeout=20)
    ms = int((time.perf_counter() - t0) * 1000)
    if r.returncode != 0 or not os.path.exists(WAV):
        say("FAIL", f"row01: speech program exit {r.returncode}: {(r.stderr or '').strip()[:160]}")
        return False
    with wave.open(WAV) as w:
        seconds = w.getnframes() / float(w.getframerate())
    summary["row01"] = {"make_ms": ms, "speech_seconds": round(seconds, 2), "bytes": os.path.getsize(WAV)}
    ok = ms < 1000 and seconds > 1.0
    say("OK" if ok else "FAIL", f"row01: {seconds:.1f} s of speech made in {ms} ms")
    return ok


def row02() -> bool:
    """A root program plays the file through the session's sound system, found the microphone's way."""
    try:
        from backend.services import voice_transcription_service as vts  # noqa: WPS433
    except Exception as e:  # noqa: BLE001
        say("FAIL", f"row02: cannot import the plugin's voice code from {PLUGIN_DIR}: {e!r}")
        return False
    env = vts._env_for_audio_capture()  # the microphone's own session-socket discovery
    rd, ps = env.get("XDG_RUNTIME_DIR", ""), env.get("PULSE_SERVER", "")
    summary["row02"] = {"runtime_dir": rd, "pulse_server": ps, "inherited_runtime_dir": os.environ.get("XDG_RUNTIME_DIR", "")}
    say("OK" if rd else "FAIL", f"row02: session sockets found at {rd or 'nowhere'} (pulse: {ps or 'none'})")
    if not rd:
        return False

    def pactl(*args: str) -> str:
        try:
            return subprocess.run(["pactl", *args], capture_output=True, text=True, timeout=5, env=env).stdout
        except Exception as e:  # noqa: BLE001
            return f"ERR {e!r}"

    info = pactl("info")
    default_sink = next((l.split(":", 1)[1].strip() for l in info.splitlines() if l.startswith("Default Sink")), "")
    summary["row02"]["default_sink"] = default_sink
    say("OK" if default_sink else "FAIL", f"row02: the session's sound server answers; default output {default_sink or 'unknown'}")
    if not default_sink:
        return False

    player = shutil.which("pw-play") or shutil.which("paplay")
    if not player:
        say("FAIL", "row02: no sound player on this Deck")
        return False
    before = pactl("list", "sink-inputs", "short").strip().splitlines()
    t0 = time.perf_counter()
    proc = subprocess.Popen([player, WAV], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    seen: list[str] = []
    while proc.poll() is None:
        time.sleep(0.4)
        now = pactl("list", "sink-inputs", "short").strip().splitlines()
        for line in now:
            if line not in before and line not in seen:
                seen.append(line)
    played_s = round(time.perf_counter() - t0, 2)
    err = (proc.stderr.read() if proc.stderr else "").strip()
    summary["row02"].update({"player": os.path.basename(player), "exit": proc.returncode, "seconds": played_s, "streams_seen": seen})
    if proc.returncode != 0:
        say("FAIL", f"row02: {os.path.basename(player)} exit {proc.returncode}: {err[:160]}")
        return False
    say("OK" if seen else "FAIL", f"row02: {os.path.basename(player)} played for {played_s} s; playback streams seen on the server: {len(seen)}")
    for line in seen:
        say("INFO", f"row02 stream: {line}")
    return bool(seen)


def main() -> int:
    ok1 = row01()
    ok2 = row02() if ok1 else False
    summary["pass"] = {"row01": ok1, "row02": ok2}
    print("SUMMARY " + json.dumps(summary, indent=None), flush=True)
    return 0 if (ok1 and ok2) else 1


if __name__ == "__main__":
    sys.exit(main())
