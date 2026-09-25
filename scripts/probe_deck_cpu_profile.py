#!/usr/bin/env python3
"""Title: Deck check -- where does the Quick Access page spend its time?

Purpose: Record a CPU profile of the Quick Access page (where the plugin draws) for a set number
         of seconds, straight from Steam's own debugger, and print which functions used the time:
         by their own work, and counting everything they called. Run it while an answer streams to
         see what each redraw of the panel actually costs.
Used for: plan 69's frame-rate work. Measured 2026-09-24 with a game running: while answer text
          appeared the page was busy in long blocks of 85 to 100 ms most of the time, and the panel
          fell to about 10 to 18 frames a second. A frame count cannot say which code is to blame;
          this can.
Solves: Guessing. The plugin bundle is not minified, so the profile names real functions -- the
        chat transcript, the answer bubble, the markdown renderer -- with their line in the bundle.
Does not: Press anything or change the page. Profiling slows the page a little while it runs, so do
          not take frame-rate numbers from the same run.

Run on the Deck with the plugin open, then start an answer within a few seconds:

    ssh deck@<ip> 'python3 - --seconds 60' < scripts/probe_deck_cpu_profile.py
    ssh deck@<ip> 'python3 - --seconds 7 --callers getBoundingClientRect' < scripts/probe_deck_cpu_profile.py

--callers NAME adds who called NAME (usually a browser call that forces a layout), three deep.

Transport (ws_connect / ws_send / ws_recv) is lifted verbatim from deck_send_ask.py: every probe runs
as a single file piped over ssh, so it cannot import a shared copy.
"""
import base64
import json
import os
import socket
import struct
import sys
import time
import urllib.request

# ---------------------------------------------------------------------------
# Transport (from deck_send_ask.py -- unchanged)
# ---------------------------------------------------------------------------


def ws_connect(url):
    _, rest = url.split("://", 1)
    hostport, path = rest.split("/", 1)
    host, port = hostport.split(":")
    s = socket.create_connection((host, int(port)), timeout=10)
    key = base64.b64encode(os.urandom(16)).decode()
    s.sendall(
        (
            "GET /%s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
            "Sec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n" % (path, hostport, key)
        ).encode()
    )
    buf = b""
    while b"\r\n\r\n" not in buf:
        buf += s.recv(4096)
    return s


def ws_send(s, payload):
    data = payload.encode()
    mask = os.urandom(4)
    n = len(data)
    if n < 126:
        hdr = struct.pack("!BB", 0x81, 0x80 | n)
    elif n < 65536:
        hdr = struct.pack("!BBH", 0x81, 0x80 | 126, n)
    else:
        hdr = struct.pack("!BBQ", 0x81, 0x80 | 127, n)
    s.sendall(hdr + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))


def ws_recv(s):
    def rd(n):
        b = b""
        while len(b) < n:
            c = s.recv(n - len(b))
            if not c:
                raise IOError("closed")
            b += c
        return b

    while True:
        h = rd(2)
        op = h[0] & 0x0F
        ln = h[1] & 0x7F
        if ln == 126:
            ln = struct.unpack("!H", rd(2))[0]
        elif ln == 127:
            ln = struct.unpack("!Q", rd(8))[0]
        body = rd(ln)
        if op == 1:
            return body.decode()


# ---------------------------------------------------------------------------
# Profiling
# ---------------------------------------------------------------------------


def call(sock, msg_id, method, params=None):
    ws_send(sock, json.dumps({"id": msg_id, "method": method, "params": params or {}}))
    while True:
        msg = json.loads(ws_recv(sock))
        if msg.get("id") == msg_id:
            if "error" in msg:
                raise SystemExit("%s failed: %s" % (method, json.dumps(msg["error"])[:400]))
            return msg.get("result", {})


def connect(title_part):
    targets = json.loads(urllib.request.urlopen("http://127.0.0.1:8080/json/list", timeout=10).read())
    hit = [t for t in targets if title_part in (t.get("title", "") + t.get("url", ""))]
    if not hit:
        raise SystemExit("no target matching %r - is the QAM open?" % title_part)
    sock = ws_connect(hit[0]["webSocketDebuggerUrl"])
    sock.settimeout(None)
    return sock


def arg(name, default):
    argv = sys.argv[1:]
    if name in argv:
        i = argv.index(name)
        if i + 1 < len(argv):
            return argv[i + 1]
    return default


def summarize(profile, top):
    nodes = {n["id"]: n for n in profile["nodes"]}
    parent = {}
    for n in profile["nodes"]:
        for child in n.get("children", []):
            parent[child] = n["id"]
    samples = profile.get("samples", [])
    deltas = profile.get("timeDeltas", [])
    if not samples:
        raise SystemExit("the profile holds no samples")

    def key(node_id):
        cf = nodes[node_id]["callFrame"]
        url = cf.get("url", "")
        short = url.rsplit("/", 2)[-2:] if url else []
        return "%s  %s:%d" % (cf.get("functionName") or "(anonymous)", "/".join(short) or "-", cf.get("lineNumber", -1) + 1)

    self_ms, total_ms = {}, {}
    special = {"(idle)": 0.0, "(program)": 0.0, "(garbage collector)": 0.0}
    all_ms = 0.0
    # Each sample's time is the gap to the NEXT sample, so shift the deltas by one.
    for i, node_id in enumerate(samples):
        dt = (deltas[i + 1] if i + 1 < len(deltas) else 0) / 1000.0
        all_ms += dt
        name = nodes[node_id]["callFrame"].get("functionName", "")
        if name in special:
            special[name] += dt
            continue
        k = key(node_id)
        self_ms[k] = self_ms.get(k, 0.0) + dt
        seen = set()
        cur = node_id
        while cur is not None:
            kk = key(cur)
            if kk not in seen:
                seen.add(kk)
                total_ms[kk] = total_ms.get(kk, 0.0) + dt
            cur = parent.get(cur)
    busy = all_ms - special["(idle)"]
    print("profiled %.1f s: idle %.1f s, busy %.1f s (script and rendering work %.1f s, program %.1f s, "
          "garbage collector %.1f s)" % (all_ms / 1000, special["(idle)"] / 1000, busy / 1000,
                                          (busy - special["(program)"] - special["(garbage collector)"]) / 1000,
                                          special["(program)"] / 1000, special["(garbage collector)"] / 1000))
    print("\nTop by own work (ms):")
    for k, v in sorted(self_ms.items(), key=lambda kv: -kv[1])[:top]:
        print("  %8.0f  %s" % (v, k))
    print("\nTop counting everything they called (ms), roots and React internals left in:")
    for k, v in sorted(total_ms.items(), key=lambda kv: -kv[1])[:top]:
        print("  %8.0f  %s" % (v, k))
    callers_of = arg("--callers", "")
    if callers_of:
        # For samples whose own function is the named one (usually a browser call such as
        # getBoundingClientRect), the chain of callers above it, three deep.
        chains = {}
        for i, node_id in enumerate(samples):
            if nodes[node_id]["callFrame"].get("functionName", "") != callers_of:
                continue
            dt = (deltas[i + 1] if i + 1 < len(deltas) else 0) / 1000.0
            chain, cur = [], parent.get(node_id)
            while cur is not None and len(chain) < 3:
                chain.append(key(cur))
                cur = parent.get(cur)
            chains[" <- ".join(chain)] = chains.get(" <- ".join(chain), 0.0) + dt
        print("\nWho called %s (ms), three callers deep:" % callers_of)
        for k, v in sorted(chains.items(), key=lambda kv: -kv[1])[:top]:
            print("  %8.0f  %s" % (v, k))


def main():
    seconds = float(arg("--seconds", "40"))
    title = arg("--target", "QuickAccess")
    interval_us = int(arg("--interval-us", "1000"))
    top = int(arg("--top", "35"))
    sock = connect(title)
    call(sock, 1, "Profiler.enable")
    call(sock, 2, "Profiler.setSamplingInterval", {"interval": interval_us})
    call(sock, 3, "Profiler.start")
    print("profiling %s for %.0f s ..." % (title, seconds), flush=True)
    time.sleep(seconds)
    result = call(sock, 4, "Profiler.stop")
    call(sock, 5, "Profiler.disable")
    summarize(result["profile"], top)


main()
