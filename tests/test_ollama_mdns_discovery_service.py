"""Tests for mDNS-only Ollama discovery (no subnet scan)."""

from __future__ import annotations

import socket
import unittest
from unittest.mock import patch

from backend.services.ollama_mdns_discovery_service import (
    OLLAMA_MDNS_SERVICE,
    _build_ptr_query,
    _decode_dns_name,
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



class _ReadLimitedBytes(bytes):
    """A packet that gives up after too many reads, so a decoder that loops forever fails the
    test quickly instead of hanging the whole run (the old decoder did exactly that)."""

    def __getitem__(self, key):  # type: ignore[override]
        self.reads = getattr(self, "reads", 0) + 1
        if self.reads > 10_000:
            raise RuntimeError("decoder never stopped reading the packet")
        return bytes.__getitem__(self, key)


class TestDecodeDnsNameIsBounded(unittest.TestCase):
    """0.6.0 security review: one crafted reply to "Find on network" could loop the decoder
    forever (a name whose compression pointer points back at itself), growing memory."""

    def _decode(self, raw: bytes, offset: int = 0) -> tuple[str, int]:
        return _decode_dns_name(_ReadLimitedBytes(raw), offset)

    def test_a_label_then_a_pointer_back_to_itself_stops(self) -> None:
        name, offset = self._decode(b"\x03abc\xc0\x00")
        self.assertEqual(name, "abc")
        self.assertEqual(offset, 6)

    def test_a_bare_self_pointer_stops(self) -> None:
        self.assertEqual(self._decode(b"\xc0\x00"), ("", 2))

    def test_a_forward_pointer_is_refused(self) -> None:
        # Offset 0 points forward to offset 2, which points back to 0: a two-step loop.
        self.assertEqual(self._decode(b"\xc0\x02\xc0\x00"), ("", 2))

    def test_reserved_label_types_stop(self) -> None:
        for first in (0x40, 0x80):
            with self.subTest(first=hex(first)):
                # Enough bytes follow that reading the reserved byte as a length would succeed.
                name, _ = self._decode(b"\x03abc" + bytes([first | 1]) + b"x" * 80 + b"\x00")
                self.assertEqual(name, "abc")

    def test_a_name_longer_than_255_bytes_stops(self) -> None:
        label = bytes([63]) + b"a" * 63
        name, _ = self._decode(label * 6 + b"\x00")
        self.assertLessEqual(len(name), 255)

    def test_a_normal_compressed_name_still_decodes(self) -> None:
        header = b"\x00" * 12
        base = _encode_dns_name("_ollama._tcp.local")  # sits at offset 12
        instance_at = len(header) + len(base)
        msg = header + base + b"\x06studio\xc0\x0c" + b"\x00\x0c"
        self.assertEqual(self._decode(msg, 12), ("_ollama._tcp.local", instance_at))
        self.assertEqual(self._decode(msg, instance_at), ("studio._ollama._tcp.local", instance_at + 9))


if __name__ == "__main__":
    unittest.main()
