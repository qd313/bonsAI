"""Title: Deck network helpers

Purpose: Discover the Deck LAN IPv4 address for Ollama remote-access hints.
Used for: Settings and setup flows that show the Deck IP to other machines on the LAN.
Solves: Pure asyncio-friendly interface enumeration without privileged network scanning.
Does not: Open firewall ports, configure Ollama bind addresses, or perform mDNS discovery.
"""

from __future__ import annotations

import asyncio
import ipaddress
import os
import re
import socket
import struct
import subprocess
from typing import Optional


def _valid_ipv4(candidate: str) -> bool:
    try:
        parsed = ipaddress.ip_address(candidate)
    except Exception:
        return False
    if parsed.version != 4:
        return False
    return not (parsed.is_loopback or parsed.is_unspecified or parsed.is_link_local)


def _interface_ipv4_candidates() -> list[dict[str, str]]:
    results: list[dict[str, str]] = []
    try:
        iface_names = [name for name in os.listdir("/sys/class/net") if name and name != "lo"]
    except Exception:
        return results

    sock: Optional[socket.socket] = None
    try:
        import fcntl

        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        for iface in iface_names:
            if iface.startswith(("docker", "veth", "br-", "virbr", "zt", "tailscale", "tun", "tap")):
                continue
            try:
                request = struct.pack("256s", iface[:15].encode("utf-8"))
                response = fcntl.ioctl(sock.fileno(), 0x8915, request)
                ip = socket.inet_ntoa(response[20:24]).strip()
                results.append({"iface": iface, "ip": ip})
            except Exception:
                continue
    except Exception:
        return results
    finally:
        if sock is not None:
            try:
                sock.close()
            except Exception:
                pass
    return results


def resolve_deck_lan_ip_sync() -> str:
    """Best-effort IPv4 discovery for the Steam Deck LAN address (sync)."""
    s: Optional[socket.socket] = None
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(2.0)
        s.connect(("1.1.1.1", 80))
        ip = str(s.getsockname()[0] or "").strip()
        if _valid_ipv4(ip):
            return ip
    except Exception:
        pass
    finally:
        if s is not None:
            try:
                s.close()
            except Exception:
                pass

    try:
        iface_candidates = _interface_ipv4_candidates()
        valid_iface = next(
            (candidate for candidate in iface_candidates if _valid_ipv4(str(candidate.get("ip", "")))),
            None,
        )
        if valid_iface:
            return str(valid_iface.get("ip", ""))
    except Exception:
        pass

    try:
        route = subprocess.run(
            ["ip", "-4", "route", "get", "1.1.1.1"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=1.5,
            text=True,
        )
        route_text = (route.stdout or "").strip()
        match = re.search(r"\bsrc\s+(\d+\.\d+\.\d+\.\d+)\b", route_text)
        ip = match.group(1).strip() if match else ""
        if _valid_ipv4(ip):
            return ip
    except Exception:
        pass

    try:
        host_ip = str(socket.gethostbyname(socket.gethostname()) or "").strip()
        if _valid_ipv4(host_ip):
            return host_ip
    except Exception:
        pass

    try:
        host_i = subprocess.run(
            ["hostname", "-I"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=1.5,
            text=True,
        )
        host_tokens = [token.strip() for token in (host_i.stdout or "").split() if token.strip()]
        ip = next((token for token in host_tokens if _valid_ipv4(token)), "")
        if _valid_ipv4(ip):
            return ip
    except Exception:
        pass

    return "unknown"


async def get_deck_ip_async(*, timeout_seconds: float = 4.0) -> str:
    """Return the Steam Deck LAN IP address (async wrapper)."""
    try:
        return await asyncio.wait_for(asyncio.to_thread(resolve_deck_lan_ip_sync), timeout=timeout_seconds)
    except Exception:
        return "unknown"
