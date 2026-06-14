"""Tests for mDNS-only Ollama discovery (no subnet scan)."""

from __future__ import annotations

import socket
import unittest
from unittest.mock import patch

from backend.services.ollama_mdns_discovery_service import (
    OLLAMA_MDNS_SERVICE,
    _build_ptr_query,
    _encode_dns_name,
    discover_mdns_ollama_hosts,
)


class TestOllamaMdnsDiscoveryService(unittest.TestCase):
    def test_service_type_is_fixed(self) -> None:
        self.assertEqual(OLLAMA_MDNS_SERVICE, "_ollama._tcp.local.")

    def test_encode_dns_name_roundtrip(self) -> None:
        encoded = _encode_dns_name("_ollama._tcp.local")
        self.assertIn(b"\x07_ollama", encoded)

    def test_build_ptr_query_has_question(self) -> None:
        pkt = _build_ptr_query(OLLAMA_MDNS_SERVICE)
        self.assertGreater(len(pkt), 12)

    @patch("backend.services.ollama_mdns_discovery_service.socket.socket")
    def test_socket_failure_returns_curated_error(self, mock_socket_cls) -> None:
        mock_socket_cls.side_effect = OSError("no multicast")
        out = discover_mdns_ollama_hosts(timeout_seconds=3.0)
        self.assertFalse(out.get("ok"))
        self.assertEqual(out.get("hosts"), [])
        self.assertIn("mDNS", str(out.get("error", "")))

    @patch("backend.services.ollama_mdns_discovery_service.socket.socket")
    def test_empty_mdns_returns_hint_not_scan(self, mock_socket_cls) -> None:
        sock = mock_socket_cls.return_value
        sock.recvfrom.side_effect = socket.timeout()
        out = discover_mdns_ollama_hosts(timeout_seconds=2.0)
        self.assertTrue(out.get("ok"))
        self.assertEqual(out.get("hosts"), [])
        self.assertIn("hint", out)

    def test_timeout_clamped(self) -> None:
        with patch(
            "backend.services.ollama_mdns_discovery_service.socket.socket",
            side_effect=OSError("nope"),
        ):
            out = discover_mdns_ollama_hosts(timeout_seconds=999.0)
        self.assertFalse(out.get("ok"))


if __name__ == "__main__":
    unittest.main()
