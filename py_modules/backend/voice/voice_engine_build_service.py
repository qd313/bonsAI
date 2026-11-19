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
import uuid
import wave
from typing import Any, Optional

from backend.voice.voice_engine_record import (
    BUILD_TOOLS_NAME,
    RECORD_NAME,
    take_build_tools,
    write_voice_engine_record,
)
from backend.voice.voice_engine_swap import new_staging_dir, remove_staging, swap_in_staged_engine
from backend.voice.voice_transcript_decode_service import WHISPER_CLI_INFERENCE_ARGS
from backend.voice.voice_stoppable_run import CANCELLED_MESSAGE, run_stoppable
from backend.voice.voice_whisper_runtime import (
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

# The package servers the build image's apt reaches (the image is Ubuntu's; read from the whisper.cpp project's
# own image recipe, ubuntu:22.04). The download notice names them (downloadSites.ts: VOICE_BUILD_PACKAGE_SITES) and
# tests/test_download_sites_match_backend.py keeps the two lists equal. Every build writes the package sources it
# really used into the engine record, so a Deck can confirm this list.
VOICE_BUILD_PACKAGE_SERVERS = ("archive.ubuntu.com", "security.ubuntu.com")

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


def _whisper_inference_ok(
    whisper_bin: str, env: dict[str, str], model_path: str, cancel_event: Any = None
) -> bool:
    """True when whisper-cli can finish one decode pass (catches SIGILL / broken ggml builds).

    With a `cancel_event` the pass is stoppable (a Cancel ends it within a second and the Cancel error
    is raised, not turned into False). Without one it runs as a plain blocking call, as before.
    """
    if not whisper_bin or not os.path.isfile(model_path):
        return False
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            wav_path = tmp.name
        try:
            _write_silence_wav(wav_path)
            cmd = [
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
            ]
            if cancel_event is None:
                proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60, env=env)
            else:
                proc = run_stoppable(cmd, env=env, timeout=60, cancel_event=cancel_event)
            return proc.returncode == 0
        finally:
            try:
                os.remove(wav_path)
            except OSError:
                pass
    except RuntimeError as exc:
        if str(exc) == CANCELLED_MESSAGE:
            raise
        return False
    except Exception:
        return False


def _voice_bin_cpu_safe_marker(bin_dir: str) -> str:
    return os.path.join(bin_dir, VOICE_BIN_CPU_SAFE_MARKER)


def _voice_bin_is_cpu_safe(plugin_root: str, settings_dir: str) -> bool:
    bin_dir = voice_bin_dir(plugin_root, settings_dir)
    return os.path.isfile(_voice_bin_cpu_safe_marker(bin_dir))


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
            RECORD_NAME,
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


# The compiler comes from the image's own package servers. The build only goes ahead when apt will check
# the signature of every package: the source lists must not switch checking off, and the three apt
# switches that would allow unsigned packages are set to "false" on the command line (a command-line
# setting beats any apt config file in the image). `BONSAI_APT_DIR` is only for the test that runs this piece.
_APT_SIGNED_ONLY_SCRIPT = r"""
set -e
export DEBIAN_FRONTEND=noninteractive
APT_DIR="${BONSAI_APT_DIR:-/etc/apt}"
UNSIGNED_SWITCH="(trusted|allow-insecure)[ =:\"']*(yes|true|1|on)([^a-z0-9]|\$)"
if grep -rEqi "$UNSIGNED_SWITCH" "$APT_DIR/sources.list" "$APT_DIR/sources.list.d" 2>/dev/null; then
  echo "bonsAI: this image's package sources switch off signature checks, so the build is refused." >&2
  exit 1
fi
APT_SIGNED="-o Acquire::AllowInsecureRepositories=false -o Acquire::AllowDowngradeToInsecureRepositories=false -o APT::Get::AllowUnauthenticated=false"
apt-get $APT_SIGNED update -qq
apt-get $APT_SIGNED install -y -qq g++ make
"""

# After the compile: write down what was used, next to the built programs (voice_engine_record.take_build_tools reads
# it back and the file is deleted). The three BONSAI_ names are only for the test that runs this piece.
_BUILD_TOOLS_RECORD_SCRIPT = (
    r"""
OUT_DIR="${BONSAI_OUT_DIR:-/out}"
APT_DIR="${BONSAI_APT_DIR:-/etc/apt}"
{
  echo "os: $(. "${BONSAI_OS_RELEASE:-/etc/os-release}" && echo "$PRETTY_NAME")"
  grep -rhE '^(deb |URIs:)' "$APT_DIR/sources.list" "$APT_DIR/sources.list.d" 2>/dev/null | sed 's/^/package source: /' || true
  echo "g++: $(g++ --version | head -n1)"
  echo "make: $(make --version | head -n1)"
  dpkg-query -W -f='package version: ${Package} ${Version}\n' g++ make gcc binutils || true
} > "$OUT_DIR/"""
    + BUILD_TOOLS_NAME
    + '" || true\n'
)

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
    cancel_event: Any = None,
) -> None:
    """Run the compile in a named container. A Cancel (cancel_event set) removes the container and raises."""
    container = f"bonsai-whisper-build-{uuid.uuid4().hex[:8]}"
    run = run_stoppable(
        [
            podman,
            "run",
            "--rm",
            "--name",
            container,
            "--entrypoint",
            "bash",
            "-v",
            f"{bin_dir}:/out:Z",
            WHISPER_CPP_IMAGE,
            "-lc",
            build_script,
        ],
        env=env,
        timeout=1800,
        cancel_event=cancel_event,
        podman=podman,
        container_name=container,
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


def _build_in_staging(
    podman: str,
    env: dict[str, str],
    plugin_root: str,
    settings_dir: str,
    build_script: str,
    cancel_event: Any,
    needed: tuple[str, ...],
    full: bool,
) -> None:
    """Compile into a spare folder; only after a good compile swap the new files into the engine folder.

    A Cancel or a failure deletes the spare folder and leaves the old engine as it was (voice_engine_swap.py).
    """
    bin_dir = voice_bin_dir(plugin_root, settings_dir)
    os.makedirs(bin_dir, exist_ok=True)
    staging = new_staging_dir(bin_dir)
    try:
        _run_whisper_container_build(podman, env, staging, build_script, cancel_event)
        for name in needed:
            if not os.path.isfile(os.path.join(staging, name)):
                raise RuntimeError(f"{name} build finished but binary is missing from voice_bin.")
        tools = take_build_tools(staging)
        swap_in_staged_engine(staging, bin_dir, full)
        _finalize_voice_bin(plugin_root, settings_dir)
        write_voice_engine_record(bin_dir, WHISPER_CPP_IMAGE, tools)
    finally:
        remove_staging(staging)


def _build_whisper_cli_in_container(
    podman: str,
    env: dict[str, str],
    plugin_root: str,
    settings_dir: str,
    cancel_event: Any = None,
) -> str:
    """Compile whisper-cli + whisper-server inside the podman image (AVX2-only ggml)."""
    dest = voice_whisper_cli_path(plugin_root, settings_dir)
    bin_dir = voice_bin_dir(plugin_root, settings_dir)

    build_script = (
        _APT_SIGNED_ONLY_SCRIPT
        + _WHISPER_CONTAINER_CMAKE
        + r"""
cmake --build /tmp/bonsai-whisper-build --target whisper-cli whisper-server -j4
cp /tmp/bonsai-whisper-build/bin/whisper-cli /out/
cp /tmp/bonsai-whisper-build/bin/whisper-server /out/
cp -a /tmp/bonsai-whisper-build/bin/lib*.so* /out/ 2>/dev/null || true
cp -a /tmp/bonsai-whisper-build/src/libwhisper.so* /out/ 2>/dev/null || true
cp -a /tmp/bonsai-whisper-build/ggml/src/libggml*.so* /out/ 2>/dev/null || true
"""
        + _BUILD_TOOLS_RECORD_SCRIPT
    )

    _build_in_staging(
        podman, env, plugin_root, settings_dir, build_script, cancel_event, ("whisper-cli", "whisper-server"), True
    )

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
    cancel_event: Any = None,
) -> str:
    """Compile whisper-server only when whisper-cli is already CPU-safe in voice_bin.

    Built in the same spare folder as a full build; only whisper-server (and the record) is replaced, the
    libraries already in voice_bin stay.
    """
    server_dest = voice_whisper_server_path(plugin_root, settings_dir)

    build_script = (
        _APT_SIGNED_ONLY_SCRIPT
        + _WHISPER_CONTAINER_CMAKE
        + r"""
cmake --build /tmp/bonsai-whisper-build --target whisper-server -j4
cp /tmp/bonsai-whisper-build/bin/whisper-server /out/
"""
        + _BUILD_TOOLS_RECORD_SCRIPT
    )

    _build_in_staging(podman, env, plugin_root, settings_dir, build_script, cancel_event, ("whisper-server",), False)
    return server_dest
