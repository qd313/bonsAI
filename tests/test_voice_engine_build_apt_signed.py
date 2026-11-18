"""Title: The voice engine's build only installs packages whose signatures apt checks

Purpose: The voice engine is compiled inside a pinned image, but the compiler (g++, make) is installed
there from the image's own package servers. These tests pin that apt is never told to skip signature
checks: the scripts the build really sends to podman carry no insecure switch and set the safe ones, and
the guard piece, run for real with a stand-in apt-get, refuses an image whose package sources say
"trusted=yes" before any package is fetched.
Used for: voice_engine_build_service._build_whisper_cli_in_container, _build_whisper_server_in_container
and _APT_SIGNED_ONLY_SCRIPT.
Does not: Run podman, build anything or touch the network. What a real build installs is only proven by
a real build on a Deck.
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.voice import voice_engine_build_service as build  # noqa: E402

# Anything here on an apt line (or in a package source) lets unsigned or stale packages in.
INSECURE = re.compile(
    r"--allow-unauthenticated|--force-yes|--allow-insecure-repositories|--allow-downgrade-to-insecure-repositories"
    r"|AllowInsecureRepositories[ =]*(true|1|yes)|AllowDowngradeToInsecureRepositories[ =]*(true|1|yes)"
    r"|AllowUnauthenticated[ =]*(true|1|yes)|Check-Valid-Until[ =]*(false|0|no)|Verify-Peer[ =]*(false|0|no)"
    r"|trusted=yes|allow-insecure=yes",
    re.IGNORECASE,
)


def _scripts_sent_to_podman() -> dict[str, str]:
    """The two build scripts exactly as they would be sent to podman, captured without running it."""
    out: dict[str, str] = {}
    for name in ("_build_whisper_cli_in_container", "_build_whisper_server_in_container"):
        with tempfile.TemporaryDirectory() as plugin_root, tempfile.TemporaryDirectory() as settings_dir:
            seen: list[str] = []
            with patch.object(build, "_run_whisper_container_build", side_effect=lambda p, e, b, script, c=None: seen.append(script)):
                with patch.object(build, "voice_bin_dir", return_value=os.path.join(settings_dir, "voice_bin")):
                    try:
                        getattr(build, name)("podman", {}, plugin_root, settings_dir)
                    except RuntimeError:
                        pass  # the stand-in build produced no binary, which is fine here
            out[name] = seen[0]
    return out


class AptSignedOnly(unittest.TestCase):
    def test_no_build_script_carries_an_insecure_apt_switch(self) -> None:
        for name, script in _scripts_sent_to_podman().items():
            apt_lines = [ln for ln in script.splitlines() if "apt-get" in ln or "apt " in ln]
            self.assertTrue(apt_lines, name)
            # The whole script, not only the apt lines: the switches live in a variable the apt lines use.
            for line in script.splitlines():
                self.assertIsNone(INSECURE.search(line), f"{name}: {line}")

    def test_every_apt_call_forces_signature_checks_on(self) -> None:
        for name, script in _scripts_sent_to_podman().items():
            self.assertIn("set -e", script, name)
            self.assertIn("-o Acquire::AllowInsecureRepositories=false", script, name)
            self.assertIn("-o Acquire::AllowDowngradeToInsecureRepositories=false", script, name)
            self.assertIn("-o APT::Get::AllowUnauthenticated=false", script, name)
            for line in script.splitlines():
                if line.startswith("apt-get "):
                    self.assertTrue(line.startswith("apt-get $APT_SIGNED "), f"{name}: {line}")

    def test_the_insecure_pattern_catches_what_it_is_for(self) -> None:
        for bad in (
            "apt-get install -y --allow-unauthenticated g++",
            "apt-get -o Acquire::AllowInsecureRepositories=true update",
            "deb [trusted=yes] http://example.com/ jammy main",
            "apt-get install --force-yes g++",
        ):
            self.assertIsNotNone(INSECURE.search(bad), bad)


@unittest.skipUnless(shutil.which("bash"), "needs bash")
class AptGuardRunsForReal(unittest.TestCase):
    """Run the guard piece of the script with a stand-in apt-get that only writes down what it was asked."""

    def _run_guard(self, sources_list: str) -> tuple[int, str, str]:
        with tempfile.TemporaryDirectory() as tmp:
            apt_dir = os.path.join(tmp, "apt")
            os.makedirs(os.path.join(apt_dir, "sources.list.d"))
            with open(os.path.join(apt_dir, "sources.list"), "w", encoding="utf-8", newline="\n") as f:
                f.write(sources_list)
            fake_bin = os.path.join(tmp, "fakebin")
            os.makedirs(fake_bin)
            log = os.path.join(tmp, "apt-calls.txt")
            fake = os.path.join(fake_bin, "apt-get")
            with open(fake, "w", encoding="utf-8", newline="\n") as f:
                f.write('#!/bin/sh\necho "$@" >> "$FAKE_APT_LOG"\n')
            os.chmod(fake, 0o755)
            env = dict(os.environ)
            env.update({"BONSAI_APT_DIR": apt_dir, "FAKE_APT_LOG": log, "PATH": fake_bin + os.pathsep + env.get("PATH", "")})
            proc = subprocess.run(["bash", "-c", build._APT_SIGNED_ONLY_SCRIPT], env=env, capture_output=True, text=True, timeout=30)
            calls = ""
            if os.path.isfile(log):
                with open(log, encoding="utf-8") as f:
                    calls = f.read()
            return proc.returncode, calls, proc.stderr

    def test_a_trusted_yes_source_refuses_the_build_before_any_package_is_fetched(self) -> None:
        code, calls, err = self._run_guard("deb [trusted=yes] http://archive.ubuntu.com/ubuntu jammy main\n")
        self.assertEqual(code, 1)
        self.assertIn("switch off signature checks", err)
        self.assertEqual(calls, "")

    def test_an_ordinary_source_installs_with_signature_checks_forced_on(self) -> None:
        code, calls, _err = self._run_guard("deb http://archive.ubuntu.com/ubuntu jammy main\n")
        self.assertEqual(code, 0)
        self.assertIn("update", calls)
        self.assertIn("install -y -qq g++ make", calls)
        self.assertEqual(calls.count("AllowInsecureRepositories=false"), 2)


if __name__ == "__main__":
    unittest.main()
