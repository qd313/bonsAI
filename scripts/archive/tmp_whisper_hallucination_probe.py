#!/usr/bin/env python3
import os
import struct
import subprocess
import wave

bin_dir = "/home/deck/homebrew/settings/bonsAI/voice_bin"
model = "/home/deck/homebrew/settings/bonsAI/voice_models/ggml-tiny.en.bin"
env = os.environ.copy()
env["LD_LIBRARY_PATH"] = bin_dir

def run_wav(path: str, label: str) -> None:
    proc = subprocess.run(
        [
            f"{bin_dir}/whisper-cli",
            "-m",
            model,
            "-f",
            path,
            "-l",
            "en",
            "-t",
            "4",
            "-nt",
            "-ng",
            "-nfa",
        ],
        capture_output=True,
        text=True,
        env=env,
        timeout=60,
    )
    print(f"=== {label} RC={proc.returncode} ===")
    print("STDOUT:", repr(proc.stdout[:500]))
    print("STDERR tail:", repr(proc.stderr[-400:] if proc.stderr else ""))

# silence 3s
frames = 16000 * 3
pcm = struct.pack(f"<{frames}h", *([0] * frames))
with wave.open("/tmp/silence3.wav", "wb") as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(16000)
    wf.writeframes(pcm)
run_wav("/tmp/silence3.wav", "silence 3s")

# low noise ~RMS 150
pcm2 = struct.pack(f"<{frames}h", *([150] * frames))
with wave.open("/tmp/noise150.wav", "wb") as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(16000)
    wf.writeframes(pcm2)
run_wav("/tmp/noise150.wav", "noise rms~150")
