"""User-triggered mDNS discovery for Ollama (_ollama._tcp.local only). No subnet or port scanning."""

from __future__ import annotations

import socket
import struct
import time
from typing import Any

from backend.services.local_ollama_setup_service import probe_ollama_http_ok

OLLAMA_MDNS_SERVICE = "_ollama._tcp.local."
MDNS_ADDR = ("224.0.0.251", 5353)
MAX_DISCOVERY_SECONDS = 15.0
MIN_DISCOVERY_SECONDS = 2.0
MAX_HOSTS = 8
_RECV_BUF = 65535


def _encode_dns_name(name: str) -> bytes:
    name = name.rstrip(".")
    out = bytearray()
    for label in name.split("."):
        if not label or len(label) > 63:
            raise ValueError("invalid DNS name")
        out.append(len(label))
        out.extend(label.encode("ascii", errors="ignore"))
    out.append(0)
    return bytes(out)


def _decode_dns_name(msg: bytes, offset: int) -> tuple[str, int]:
    labels: list[str] = []
    jumped = False
    jump_offset = offset
    while True:
        if offset >= len(msg):
            break
        length = msg[offset]
        if length == 0:
            offset += 1
            break
        if length & 0xC0 == 0xC0:
            if offset + 1 >= len(msg):
                break
            pointer = ((length & 0x3F) << 8) | msg[offset + 1]
            if not jumped:
                jump_offset = offset + 2
            offset = pointer
            jumped = True
            continue
        offset += 1
        end = offset + length
        if end > len(msg):
            break
        labels.append(msg[offset:end].decode("utf-8", errors="ignore"))
        offset = end
    if jumped:
        offset = jump_offset
    return ".".join(labels), offset


def _build_ptr_query(service_name: str, transaction_id: int = 0) -> bytes:
    header = struct.pack(">HHHHHH", transaction_id & 0xFFFF, 0, 1, 0, 0, 0)
    qname = _encode_dns_name(service_name)
    question = qname + struct.pack(">HH", 12, 1)  # PTR IN
    return header + question


def _parse_rr(msg: bytes, offset: int) -> tuple[dict[str, Any] | None, int]:
    if offset + 12 > len(msg):
        return None, offset
    name, offset = _decode_dns_name(msg, offset)
    if offset + 10 > len(msg):
        return None, offset
    rtype, rclass, _ttl, rdlength = struct.unpack(">HHIH", msg[offset : offset + 10])
    offset += 10
    rdata = msg[offset : offset + rdlength]
    offset += rdlength
    return {"name": name, "type": rtype, "class": rclass, "rdata": rdata}, offset


def _parse_dns_response(msg: bytes) -> list[dict[str, Any]]:
    if len(msg) < 12:
        return []
    _tid, flags, qdcount, ancount, nscount, arcount = struct.unpack(">HHHHHH", msg[:12])
    if flags & 0x8000 == 0:
        return []
    offset = 12
    for _ in range(qdcount):
        _, offset = _decode_dns_name(msg, offset)
        offset += 4
    records: list[dict[str, Any]] = []
    for _ in range(ancount + nscount + arcount):
        rec, offset = _parse_rr(msg, offset)
        if rec:
            records.append(rec)
        if offset >= len(msg):
            break
    return records


def _parse_srv_rdata(rdata: bytes) -> tuple[int, str]:
    if len(rdata) < 7:
        return 11434, ""
    _priority, _weight, port = struct.unpack(">HHH", rdata[:6])
    target, _ = _decode_dns_name(rdata, 6)
    return int(port), target.rstrip(".")


def _parse_a_rdata(rdata: bytes) -> str:
    if len(rdata) == 4:
        return ".".join(str(b) for b in rdata)
    return ""


def _instance_label(instance_fqdn: str) -> str:
    base = OLLAMA_MDNS_SERVICE
    if instance_fqdn.endswith("." + base):
        return instance_fqdn[: -len(base) - 1].rstrip(".")
    return instance_fqdn.rstrip(".")


def discover_mdns_ollama_hosts(timeout_seconds: float = 8.0) -> dict[str, Any]:
    """
    Browse ``_ollama._tcp.local`` via mDNS multicast only.

    Returns ``{ ok, hosts, error }`` where each host has ``label``, ``host`` (host:port), ``port``.
    """
    timeout = max(MIN_DISCOVERY_SECONDS, min(MAX_DISCOVERY_SECONDS, float(timeout_seconds or 8.0)))
    deadline = time.time() + timeout

    instances: dict[str, dict[str, Any]] = {}
    srv_ports: dict[str, int] = {}
    host_targets: dict[str, str] = {}
    ipv4_by_target: dict[str, str] = {}

    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 255)
        except OSError:
            pass
        sock.settimeout(0.35)
        sock.bind(("", 5353))
        mreq = struct.pack("4sl", socket.inet_aton("224.0.0.251"), socket.INADDR_ANY)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)
        query = _build_ptr_query(OLLAMA_MDNS_SERVICE)
        sock.sendto(query, MDNS_ADDR)
    except OSError as exc:
        return {
            "ok": False,
            "hosts": [],
            "error": "mDNS socket unavailable on this device.",
            "detail": str(exc)[:120],
        }

    try:
        while time.time() < deadline and len(instances) < MAX_HOSTS:
            remaining = max(0.1, deadline - time.time())
            sock.settimeout(min(0.5, remaining))
            try:
                data, _addr = sock.recvfrom(_RECV_BUF)
            except socket.timeout:
                continue
            except OSError:
                break
            for rec in _parse_dns_response(data):
                rtype = rec.get("type")
                name = str(rec.get("name") or "")
                rdata = rec.get("rdata") or b""
                if rtype == 12 and name.rstrip(".").lower() == OLLAMA_MDNS_SERVICE.rstrip(".").lower():
                    ptr_target, _ = _decode_dns_name(rdata, 0)
                    ptr_target = ptr_target.rstrip(".")
                    if ptr_target and ptr_target not in instances:
                        instances[ptr_target] = {
                            "label": _instance_label(ptr_target) or ptr_target,
                            "instance": ptr_target,
                        }
                elif rtype == 33:
                    port, target = _parse_srv_rdata(rdata)
                    if target:
                        srv_ports[target] = port
                        host_targets[name.rstrip(".")] = target
                elif rtype == 1:
                    ip = _parse_a_rdata(rdata)
                    if ip:
                        ipv4_by_target[name.rstrip(".")] = ip
    finally:
        try:
            sock.close()
        except OSError:
            pass

    hosts_out: list[dict[str, Any]] = []
    seen: set[str] = set()

    for instance, meta in instances.items():
        target = instance
        port = srv_ports.get(target, 11434)
        ip = ipv4_by_target.get(target) or ipv4_by_target.get(target.rstrip(".") + ".local")
        if not ip:
            for key, addr in ipv4_by_target.items():
                if target in key or key in target:
                    ip = addr
                    break
        if not ip:
            continue
        host_port = f"{ip}:{port}"
        if host_port in seen:
            continue
        seen.add(host_port)
        entry: dict[str, Any] = {
            "label": str(meta.get("label") or host_port)[:64],
            "host": host_port,
            "port": port,
        }
        base = f"http://{ip}:{port}"
        if probe_ollama_http_ok(base, timeout_seconds=1.5):
            entry["verified"] = True
        hosts_out.append(entry)
        if len(hosts_out) >= MAX_HOSTS:
            break

    hosts_out.sort(key=lambda h: (not h.get("verified"), h.get("label", "")))

    if not hosts_out:
        return {
            "ok": True,
            "hosts": [],
            "error": "",
            "hint": (
                "No _ollama._tcp services found. Advertise Ollama with Avahi or Bonjour "
                "(see docs/troubleshooting.md). Manual PC address still works."
            ),
        }

    return {"ok": True, "hosts": hosts_out, "error": ""}
