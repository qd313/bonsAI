"""Title: The download notice names the same addresses the back end really uses

Purpose: The notice before each download (src/features/downloads/downloadSites.ts) names where
bonsAI will connect. Those addresses are copies of back-end constants; this fails if a back-end
download address stops starting with one of the sites the notice can name, so a notice cannot
quietly name the wrong place after the back end moves.
Used for: downloadSites.ts against local_ollama_setup_service.py, ollama_catalog_service.py,
voice_engine_build_service.py, voice_model_download_service.py and knowledge_base_schema.py.
Does not: Touch the network.
"""

from __future__ import annotations

import re
import unittest
from pathlib import Path

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.services import knowledge_base_schema as kb  # noqa: E402
from backend.services import local_ollama_setup_service as setup  # noqa: E402
from backend.services import ollama_catalog_service as catalog  # noqa: E402
from backend.services import voice_engine_build_service as voice_build  # noqa: E402
from backend.services import voice_model_download_service as voice_models  # noqa: E402

SITES_TS = Path(__file__).resolve().parent.parent / "src" / "features" / "downloads" / "downloadSites.ts"


def _notice_sites() -> set[str]:
    return set(re.findall(r'_SITE = "(https://[^"]+)"', SITES_TS.read_text(encoding="utf-8")))


class DownloadSitesMatchBackend(unittest.TestCase):
    def test_every_backend_download_address_is_a_named_site(self) -> None:
        sites = _notice_sites()
        backend_urls = [
            setup.OLLAMA_OFFICIAL_INSTALL_SH,
            "https://ollama.com/download",  # the tarball base in run_tarball_user_local_install
            f"https://{catalog.REGISTRY_HOST}/",
            "https://" + voice_build.WHISPER_CPP_IMAGE,
            kb.DEFAULT_MANIFEST_HF_URL,
            kb.DEFAULT_MANIFEST_GITHUB_URL,
            *(spec["url"] for spec in voice_models.VOICE_STT_MODEL_SPECS.values()),
        ]
        for url in backend_urls:
            self.assertTrue(
                any(url == s or url.startswith(s + "/") for s in sites),
                f"{url} is not under any site the download notice names: {sorted(sites)}",
            )

    def test_tarball_base_is_still_where_the_code_says(self) -> None:
        src = Path(setup.__file__).read_text(encoding="utf-8")
        self.assertIn('base = "https://ollama.com/download"', src)


if __name__ == "__main__":
    unittest.main()
