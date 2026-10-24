"""CERTIFICATE_VERIFY_FAILED on Decky Loader's frozen Python (see tls_ca_fallback.py's
module docstring for how this was diagnosed on-device) must not surface as an opaque SSL
error to users — urlopen_with_ca_fallback should retry once against a real system CA
bundle before giving up.

The exception shape matters: urllib.request.AbstractHTTPHandler.do_open() catches every
OSError the socket layer raises (ssl.SSLCertVerificationError is one) and re-raises it as
urllib.error.URLError(err), with the original preserved as `.reason`. A real urlopen() call
never lets the raw SSLCertVerificationError escape — confirmed on-device: a version of the
fallback that only caught ssl.SSLCertVerificationError directly never fired, because what
actually propagated was `URLError: <urlopen error [SSL: CERTIFICATE_VERIFY_FAILED] ...>`.
These tests raise the wrapped form to match reality, not the bare SSL exception.
"""

import ssl
import unittest
import urllib.error
import urllib.request
from unittest import mock

from backend.core.tls_ca_fallback import urlopen_with_ca_fallback


def _cert_url_error() -> urllib.error.URLError:
    """What a real urlopen() actually raises for this failure — see module docstring."""
    reason = ssl.SSLCertVerificationError(
        "[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: unable to get local issuer certificate"
    )
    return urllib.error.URLError(reason)


class UrlopenWithCaFallbackTests(unittest.TestCase):
    def test_returns_result_directly_when_default_context_works(self):
        req = urllib.request.Request("https://example.com/x")
        sentinel = object()
        with mock.patch("backend.core.tls_ca_fallback.urllib.request.urlopen", return_value=sentinel) as m:
            result = urlopen_with_ca_fallback(req, timeout=5)
        self.assertIs(result, sentinel)
        m.assert_called_once_with(req, timeout=5)

    def test_retries_with_fallback_context_on_wrapped_cert_verification_error(self):
        # os.path.isfile and ssl.create_default_context are both mocked — real filesystem
        # paths are POSIX-only and this suite must pass on a Windows dev machine too.
        req = urllib.request.Request("https://example.com/x")
        sentinel = object()
        fake_ctx = object()
        calls = []

        def _urlopen(request, timeout=None, context=None):
            calls.append({"request": request, "timeout": timeout, "context": context})
            if context is None:
                raise _cert_url_error()
            return sentinel

        with mock.patch(
            "backend.core.tls_ca_fallback.urllib.request.urlopen", side_effect=_urlopen
        ), mock.patch(
            "backend.core.tls_ca_fallback.os.path.isfile",
            side_effect=lambda p: p == "/etc/ssl/certs/ca-certificates.crt",
        ), mock.patch(
            "backend.core.tls_ca_fallback.ssl.create_default_context", return_value=fake_ctx
        ) as m_ctx:
            result = urlopen_with_ca_fallback(req, timeout=5)

        self.assertIs(result, sentinel)
        self.assertEqual(len(calls), 2)
        self.assertIsNone(calls[0]["context"])
        self.assertIs(calls[1]["context"], fake_ctx)
        m_ctx.assert_called_once_with(cafile="/etc/ssl/certs/ca-certificates.crt")

    def test_retries_on_unwrapped_cert_verification_error_too(self):
        """Defensive path: some caller or future Python raises the SSL error unwrapped."""
        req = urllib.request.Request("https://example.com/x")
        sentinel = object()

        def _urlopen(request, timeout=None, context=None):
            if context is None:
                raise ssl.SSLCertVerificationError("CERTIFICATE_VERIFY_FAILED")
            return sentinel

        with mock.patch(
            "backend.core.tls_ca_fallback.urllib.request.urlopen", side_effect=_urlopen
        ), mock.patch("backend.core.tls_ca_fallback.os.path.isfile", return_value=True), mock.patch(
            "backend.core.tls_ca_fallback.ssl.create_default_context", return_value=object()
        ):
            result = urlopen_with_ca_fallback(req, timeout=5)
        self.assertIs(result, sentinel)

    def test_tries_candidate_paths_in_order_skipping_missing_ones(self):
        req = urllib.request.Request("https://example.com/x")
        checked = []

        def _isfile(p):
            checked.append(p)
            return p == "/etc/pki/tls/certs/ca-bundle.crt"

        def _urlopen(request, timeout=None, context=None):
            if context is None:
                raise _cert_url_error()
            return object()

        with mock.patch(
            "backend.core.tls_ca_fallback.urllib.request.urlopen", side_effect=_urlopen
        ), mock.patch("backend.core.tls_ca_fallback.os.path.isfile", side_effect=_isfile), mock.patch(
            "backend.core.tls_ca_fallback.ssl.create_default_context", return_value=object()
        ):
            urlopen_with_ca_fallback(req, timeout=5)

        self.assertEqual(
            checked,
            ["/etc/ssl/certs/ca-certificates.crt", "/etc/pki/tls/certs/ca-bundle.crt"],
            "must check candidates in order and stop at the first that exists",
        )

    def test_reraises_original_error_when_no_fallback_cafile_exists(self):
        req = urllib.request.Request("https://example.com/x")
        with mock.patch(
            "backend.core.tls_ca_fallback.urllib.request.urlopen", side_effect=_cert_url_error()
        ), mock.patch("backend.core.tls_ca_fallback.os.path.isfile", return_value=False):
            with self.assertRaises(urllib.error.URLError):
                urlopen_with_ca_fallback(req, timeout=5)

    def test_candidate_that_vanishes_between_isfile_and_load_is_skipped(self):
        """ssl.create_default_context(cafile=) opens the file immediately — a candidate
        that passed isfile() but then fails to load (race, permissions) must not blow up
        the whole fallback; the next candidate should still be tried."""
        req = urllib.request.Request("https://example.com/x")
        sentinel = object()

        def _create_ctx(cafile=None):
            if cafile == "/etc/ssl/certs/ca-certificates.crt":
                raise FileNotFoundError(2, "No such file or directory")
            return object()

        def _urlopen(request, timeout=None, context=None):
            if context is None:
                raise _cert_url_error()
            return sentinel

        with mock.patch(
            "backend.core.tls_ca_fallback.urllib.request.urlopen", side_effect=_urlopen
        ), mock.patch("backend.core.tls_ca_fallback.os.path.isfile", return_value=True), mock.patch(
            "backend.core.tls_ca_fallback.ssl.create_default_context", side_effect=_create_ctx
        ):
            result = urlopen_with_ca_fallback(req, timeout=5)
        self.assertIs(result, sentinel)

    def test_non_cert_url_errors_are_not_retried(self):
        """A connection-refused URLError has a plain reason, not an SSL error — must not
        trigger the fallback (and must not be swallowed as if it were a cert problem)."""
        req = urllib.request.Request("https://example.com/x")
        with mock.patch(
            "backend.core.tls_ca_fallback.urllib.request.urlopen",
            side_effect=urllib.error.URLError(ConnectionRefusedError("connection refused")),
        ) as m:
            with self.assertRaises(urllib.error.URLError):
                urlopen_with_ca_fallback(req, timeout=5)
        m.assert_called_once()

    def test_other_exception_types_are_not_caught(self):
        req = urllib.request.Request("https://example.com/x")
        with mock.patch(
            "backend.core.tls_ca_fallback.urllib.request.urlopen", side_effect=ValueError("bad url")
        ):
            with self.assertRaises(ValueError):
                urlopen_with_ca_fallback(req, timeout=5)


if __name__ == "__main__":
    unittest.main()
