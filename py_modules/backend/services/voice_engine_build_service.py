"""Title: Building the speech-to-text program from source

Purpose: SteamOS ships without whisper.cpp and its read-only system cannot
simply have a package installed onto it, so this file compiles whisper-cli
and whisper-server from source inside a podman container the first time
voice input is turned on, copies the finished binaries out to the plugin's
own folder, and marks a build as safe once it has actually been proven to
run on this Deck's CPU.

Used for: voice_transcription_service.install_whisper_cli(), which drives
the container build when no usable binary is found yet, and
_voice_binary_ready_for_inference(), which reads the "CPU safe" marker this
file writes so a build already proven to work is not re-tested on every
recording.

Solves: The built whisper binary is compiled for a specific set of CPU
instructions, and a binary that was fine on one Deck can crash (SIGILL) on
another. `_whisper_inference_ok()` runs one real decode on a silent test
file before any binary is trusted, and `_voice_bin_mark_cpu_safe()`
remembers a pass so that check is not repeated on every single recording.

Does not: Decide whether a build is needed in the first place, or download
the speech model -- voice_transcription_service.install_whisper_cli() and
voice_model_download_service.py own those decisions and call into this file
once they already know a container build has to run.
"""

from __future__ import annotations

import os
import struct
import subprocess
import tempfile
import wave
from typing import Optional

from backend.services.voice_transcript_decode_service import WHISPER_CLI_INFERENCE_ARGS
from backend.services.voice_whisper_runtime import (
    CHANNELS,
    SAMPLE_RATE,
    SAMPLE_WIDTH,
    WHISPER_THREADS,
    voice_bin_dir,
    voice_whisper_cli_path,
    voice_whisper_server_path,
    whisper_binary_usable,
)

# Do not float on :main — upstream image churn caused SIGILL on Deck when copying prebuilt binaries.
# Bump digest only after podman pull + CPU-safe compile + inference smoke on hardware. See docs/voice-input-follow-up.md.
WHISPER_CPP_IMAGE = (
    "ghcr.io/ggml-org/whisper.cpp"
    "@sha256:c0b535add76d7ff7613c70f32a7a4c794985f94238501e1b5b3b7f0eb56e9685"
)

VOICE_BIN_CPU_SAFE_MARKER = ".bonsai_cpu_safe"


def _link_versioned_sonames(bin_dir: str) -> None:
    """Create libfoo.so.N symlinks when podman cp resolved versioned sonames (e.g. .so.1.8.6)."""
    for name in os.listdir(bin_dir):
        if ".so." not in name:
            continue
        full = os.path.join(bin_dir, name)
        if not os.path.isfile(full):
            continue
        base, rest = name.split(".so.", 1)
        major = rest.split(".", 1)[0]
        link_name = f"{base}.so.{major}"
        link_path = os.path.join(bin_dir, link_name)
        if not os.path.exists(link_path):
            os.symlink(name, link_path)


def _write_silence_wav(path: str, seconds: float = 0.5) -> None:
    frames = int(SAMPLE_RATE * seconds)
    pcm = struct.pack(f"<{frames}h", *([0] * frames))
    with wave.open(path, "wb") as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(SAMPLE_WIDTH)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm)


def _whisper_inference_ok(whisper_bin: str, env: dict[str, str], model_path: str) -> bool:
    """True when whisper-cli can finish one decode pass (catches SIGILL / broken ggml builds)."""
    if not whisper_bin or not os.path.isfile(model_path):
        return False
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            wav_path = tmp.name
        try:
            _write_silence_wav(wav_path)
            proc = subprocess.run(
                [
                    whisper_bin,
                    "-m",
                    model_path,
                    "-f",
                    wav_path,
                    "-l",
                    "en",
                    "-t",
                    str(WHISPER_THREADS),
                    "-nt",
                    *WHISPER_CLI_INFERENCE_ARGS,
                ],
                capture_output=True,
                text=True,
                timeout=60,
                env=env,
            )
            return proc.returncode == 0
        finally:
            try:
                os.remove(wav_path)
            except OSError:
                pass
    except Exception:
        return False


def _voice_bin_cpu_safe_marker(bin_dir: str) -> str:
    return os.path.join(bin_dir, VOICE_BIN_CPU_SAFE_MARKER)


def _voice_bin_mark_cpu_safe(bin_dir: str) -> None:
    try:
        with open(_voice_bin_cpu_safe_marker(bin_dir), "w", encoding="utf-8") as f:
            f.write("1\n")
    except OSError:
        pass


def _voice_bin_keep_names() -> frozenset[str]:
    return frozenset(
        {
            "whisper-cli",
            "whisper-server",
            VOICE_BIN_CPU_SAFE_MARKER,
            "whisper-server.pid",
        }
    )


def _prune_voice_bin_non_libs(bin_dir: str, keep_paths: Optional[set[str]] = None) -> None:
    """Drop non-.so artifacts after bulk podman cp from image build dirs."""
    keep = set(keep_paths or ())
    keep_names = _voice_bin_keep_names()
    for name in os.listdir(bin_dir):
        path = os.path.join(bin_dir, name)
        if path in keep or name in keep_names or ".so" in name:
            continue
        try:
            if os.path.isfile(path):
                os.remove(path)
        except OSError:
            pass


_WHISPER_CONTAINER_CMAKE = r"""
cmake -S /app -B /tmp/bonsai-whisper-build -DCMAKE_BUILD_TYPE=Release \
  -DGGML_NATIVE=OFF \
  -DGGML_AVX512=OFF -DGGML_AVX512_VBMI=OFF -DGGML_AVX512_VNNI=OFF -DGGML_AVX512_BF16=OFF \
  -DGGML_AVX2=ON -DGGML_AVX=ON -DGGML_FMA=ON -DGGML_F16C=ON \
  -DWHISPER_BUILD_TESTS=OFF -DBUILD_SHARED_LIBS=ON
"""


def _run_whisper_container_build(
    podman: str,
    env: dict[str, str],
    bin_dir: str,
    build_script: str,
) -> None:
    run = subprocess.run(
        [
            podman,
            "run",
            "--rm",
            "--entrypoint",
            "bash",
            "-v",
            f"{bin_dir}:/out:Z",
            WHISPER_CPP_IMAGE,
            "-lc",
            build_script,
        ],
        capture_output=True,
        text=True,
        timeout=1800,
        env=env,
    )
    if run.returncode != 0:
        err = (run.stderr or run.stdout or "podman whisper build failed")[:500]
        raise RuntimeError(err)


def _finalize_voice_bin(plugin_root: str, settings_dir: str) -> None:
    bin_dir = voice_bin_dir(plugin_root, settings_dir)
    cli_path = voice_whisper_cli_path(plugin_root, settings_dir)
    server_path = voice_whisper_server_path(plugin_root, settings_dir)
    _link_versioned_sonames(bin_dir)
    _prune_voice_bin_non_libs(bin_dir, {cli_path, server_path})
    for name in os.listdir(bin_dir):
        path = os.path.join(bin_dir, name)
        if os.path.isfile(path):
            os.chmod(path, 0o755)


def _build_whisper_cli_in_container(
    podman: str,
    env: dict[str, str],
    plugin_root: str,
    settings_dir: str,
) -> str:
    """Compile whisper-cli + whisper-server inside the podman image (AVX2-only ggml)."""
    dest = voice_whisper_cli_path(plugin_root, settings_dir)
    server_dest = voice_whisper_server_path(plugin_root, settings_dir)
    bin_dir = voice_bin_dir(plugin_root, settings_dir)
    os.makedirs(bin_dir, exist_ok=True)

    build_script = (
        r"""
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq g++ make
"""
        + _WHISPER_CONTAINER_CMAKE
        + r"""
cmake --build /tmp/bonsai-whisper-build --target whisper-cli whisper-server -j4
cp /tmp/bonsai-whisper-build/bin/whisper-cli /out/
cp /tmp/bonsai-whisper-build/bin/whisper-server /out/
cp -a /tmp/bonsai-whisper-build/bin/lib*.so* /out/ 2>/dev/null || true
cp -a /tmp/bonsai-whisper-build/src/libwhisper.so* /out/ 2>/dev/null || true
cp -a /tmp/bonsai-whisper-build/ggml/src/libggml*.so* /out/ 2>/dev/null || true
"""
    )

    _run_whisper_container_build(podman, env, bin_dir, build_script)

    if not os.path.isfile(dest):
        raise RuntimeError("whisper-cli build finished but binary is missing from voice_bin.")
    if not os.path.isfile(server_dest):
        raise RuntimeError("whisper-server build finished but binary is missing from voice_bin.")

    _finalize_voice_bin(plugin_root, settings_dir)

    if not whisper_binary_usable(plugin_root, settings_dir):
        raise RuntimeError(
            "whisper-cli was built but failed to run (missing libraries). "
            "Try Install voice engine again."
        )
    _voice_bin_mark_cpu_safe(bin_dir)
    return dest


def _build_whisper_server_in_container(
    podman: str,
    env: dict[str, str],
    plugin_root: str,
    settings_dir: str,
) -> str:
    """Compile whisper-server only when whisper-cli is already CPU-safe in voice_bin."""
    server_dest = voice_whisper_server_path(plugin_root, settings_dir)
    bin_dir = voice_bin_dir(plugin_root, settings_dir)
    os.makedirs(bin_dir, exist_ok=True)

    build_script = (
        r"""
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq g++ make
"""
        + _WHISPER_CONTAINER_CMAKE
        + r"""
cmake --build /tmp/bonsai-whisper-build --target whisper-server -j4
cp /tmp/bonsai-whisper-build/bin/whisper-server /out/
"""
    )

    _run_whisper_container_build(podman, env, bin_dir, build_script)

    if not os.path.isfile(server_dest):
        raise RuntimeError("whisper-server build finished but binary is missing from voice_bin.")

    _finalize_voice_bin(plugin_root, settings_dir)
    return server_dest
