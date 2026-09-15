"""Title: Fixing "can't verify this secure site" on the Deck's own Python

Purpose: The copy of Python that Decky Loader runs the plugin's backend inside
is a self-contained bundle, and on a real Deck that bundle never picks up the
operating system's list of trusted certificate authorities -- the list every
secure (https) address is checked against. Without this file, every secure
download the plugin makes fails with a message about a certificate, even
though nothing is actually wrong with the connection or the download itself.
This file tries the normal way first, and only on exactly that failure,
retries once using one of a few file locations where SteamOS keeps its own
trusted-certificate list on disk.
Used for: wrapping every secure download the plugin makes -- the search-
knowledge download, the Pull Models list, installing Ollama, downloading a
speech-to-text model, and checking Steam's anti-cheat status -- so each of
them gets the retry without writing it out for themselves.
Solves: a real error, seen on the Deck itself: "CERTIFICATE_VERIFY_FAILED:
unable to get local issuer certificate". It happens only inside Decky's
bundled Python (SteamOS holo 3.8.25, confirmed by reading that process's own
environment: no certificate location is set, and the bundle's OpenSSL cannot
find one on its own). A plain, ordinary `python3` on the very same Deck does
not have this problem, because it finds the operating system's list without
being told where it is.
Does not: change how plain, unencrypted (http, not https) addresses are
handled -- those were never affected. And on any computer that is not hitting
this specific problem, nothing changes: the normal way is always tried first,
and succeeds there.
"""

from __future__ import annotations

import os
import ssl
import urllib.error
import urllib.request
from typing import Any, Optional

# Common Linux CA bundle locations, checked in order. SteamOS/Arch/Debian/Ubuntu ship the
# first; Fedora/RHEL the second; the third is a common symlink target on several distros
# (it is what SteamOS itself resolves to by default, confirmed on-device).
_FALLBACK_CAFILE_CANDIDATES = (
    "/etc/ssl/certs/ca-certificates.crt",
    "/etc/pki/tls/certs/ca-bundle.crt",
    "/etc/ssl/cert.pem",
)


def _fallback_ssl_context() -> Optional[ssl.SSLContext]:
    for candidate in _FALLBACK_CAFILE_CANDIDATES:
        if os.path.isfile(candidate):
            try:
                return ssl.create_default_context(cafile=candidate)
            except (ssl.SSLError, OSError):
                # OSError (e.g. FileNotFoundError) covers a candidate that stopped existing
                # between the isfile() check and load — ssl.create_default_context(cafile=)
                # opens and reads the file immediately, it does not defer to first use.
                continue
    return None


def _is_cert_verification_failure(exc: BaseException) -> bool:
    # urllib.request.AbstractHTTPHandler.do_open() catches every OSError the socket layer
    # raises — ssl.SSLCertVerificationError is a subclass of ssl.SSLError is a subclass of
    # OSError — and re-raises it as `urllib.error.URLError(err)`, with the original
    # exception preserved as `.reason`. So the raw SSLCertVerificationError never actually
    # escapes a real urlopen() call; only URLError does, wrapping it. Confirmed on-device:
    # the first version of this function caught ssl.SSLCertVerificationError directly and
    # never fired — the live traceback was `URLError: <urlopen error [SSL:
    # CERTIFICATE_VERIFY_FAILED] ...>`. Checking both here is deliberate: URLError is what
    # a real urlopen() raises, direct SSLCertVerificationError is kept as a defensive
    # fallback in case a future Python version or a non-http:// caller raises it unwrapped.
    if isinstance(exc, ssl.SSLCertVerificationError):
        return True
    if isinstance(exc, urllib.error.URLError) and isinstance(exc.reason, ssl.SSLCertVerificationError):
        return True
    return False


def urlopen_with_ca_fallback(request: urllib.request.Request, *, timeout: float) -> Any:
    """Drop-in replacement for urllib.request.urlopen(request, timeout=timeout).

    Tries the interpreter's default SSL context first — correct and sufficient on every
    normal install. Only on a certificate-verification failure does it retry once against a
    known system CA bundle path. A Deck (or any Linux host) with none of the candidate paths,
    or any other kind of failure (timeout, connection refused, HTTP error), re-raises the
    original exception unchanged rather than silently disabling verification or masking an
    unrelated error.
    """
    try:
        return urllib.request.urlopen(request, timeout=timeout)
    except Exception as exc:
        if not _is_cert_verification_failure(exc):
            raise
        ctx = _fallback_ssl_context()
        if ctx is None:
            raise
        return urllib.request.urlopen(request, timeout=timeout, context=ctx)
