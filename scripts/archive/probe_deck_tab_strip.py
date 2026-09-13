#!/usr/bin/env python3
"""Title: Deck tab strip class probe

Purpose: Report the computed colour and full ancestor class chain of every tab glyph on device.
Used for: Any change to the tab strip CSS in src/styles/sections/section-1.ts.
Solves: The strip is styled by class names SteamOS owns, and guessing which ones exist has cost
        several fix attempts. This answers it from the running client instead.
Does not: Change anything, or work while the QAM is closed — the QuickAccess CEF target must be
          live. Read-only Runtime.evaluate.

Run with the plugin open on the Deck:

    ssh deck@<ip> 'python3 -' < scripts/probe_deck_tab_strip.py

Runs ON the Deck against 127.0.0.1:8080, so no SSH tunnel is needed. Pure stdlib — the RFC6455
handshake and framing are implemented here because the Deck's python has no websocket package.

Finding 2026-08-04: `.Active` is on none of them; the active tab carries a build-hashed Steam
class instead. See docs/audit/decky-tab-strip-classes.md.
"""
import base64
import json
import os
import socket
import struct
import urllib.request

JS = r"""
(() => {
  const out = [];
  for (const ic of document.querySelectorAll('.bonsai-tab-title-icon')) {
    const chain = [];
    let n = ic.parentElement;
    while (n) {
      const c = typeof n.className === 'string' ? n.className : (n.className && n.className.baseVal) || '';
      chain.push(n.tagName.toLowerCase() + (c ? '.' + c.trim().split(/\s+/).join('.') : ''));
      if (n.classList && n.classList.contains('bonsai-decky-tabs-root')) break;
      n = n.parentElement;
    }
    const cs = getComputedStyle(ic);
    out.push({
      icon: ic.className,
      color: cs.color,
      filter: cs.filter,
      activeAncestor: chain.some(s => /\.Active(\.|$)/.test(s) || /\.active(\.|$)/.test(s)),
      chain: chain,
    });
  }
  return JSON.stringify({ n: out.length, out: out });
})()
"""


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


targets = json.loads(urllib.request.urlopen("http://127.0.0.1:8080/json/list", timeout=10).read())
qa = [t for t in targets if "QuickAccess" in (t.get("title", "") + t.get("url", ""))]
print("targets:", [t.get("title") for t in targets])
if not qa:
    raise SystemExit("no QuickAccess target - is the QAM open?")

s = ws_connect(qa[0]["webSocketDebuggerUrl"])
ws_send(s, json.dumps({"id": 1, "method": "Runtime.evaluate",
                       "params": {"expression": JS, "returnByValue": True}}))
while True:
    msg = json.loads(ws_recv(s))
    if msg.get("id") == 1:
        r = msg.get("result", {}).get("result", {})
        if "value" not in r:
            print("EVAL FAILED:", json.dumps(msg)[:800])
            break
        data = json.loads(r["value"])
        print("glyphs found:", data["n"])
        for e in data["out"]:
            print("\n---", e["icon"])
            print("  color          :", e["color"])
            print("  filter         :", e["filter"])
            print("  Active ancestor:", e["activeAncestor"])
            for c in e["chain"]:
                print("     ", c[:150])
        break
