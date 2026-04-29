"""Tests for localhost loopback helpers used before connection probes."""

import unittest

from backend.services.local_ollama_setup_service import is_loopback_ollama_host


class LocalLoopbackHostTests(unittest.TestCase):
    def test_ipv4_loopback_accepted(self):
        self.assertTrue(is_loopback_ollama_host("127.0.0.1"))

    def test_ipv6_loopback_accepted(self):
        self.assertTrue(is_loopback_ollama_host("::1"))

    def test_localhost_hostname_accepted(self):
        self.assertTrue(is_loopback_ollama_host("localhost"))
        self.assertTrue(is_loopback_ollama_host("LOCALHOST"))

    def test_lan_rejected(self):
        self.assertFalse(is_loopback_ollama_host("192.168.1.15"))
        self.assertFalse(is_loopback_ollama_host(""))

    def test_host_with_whitespace(self):
        self.assertTrue(is_loopback_ollama_host(" 127.0.0.1 "))

