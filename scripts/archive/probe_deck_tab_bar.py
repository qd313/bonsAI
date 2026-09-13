#!/usr/bin/env python3
"""Title: Deck tab bar geometry probe

Purpose: Measure, on device, everything plan 30 (the collapsing tab bar) sizes itself against:
         Steam's header row, the six title leaves, the shoulder hints, the TabContentsScroll top,
         the two height variables, and the transcript's reading area.
Used for: docs/planning/30-collapsing-tab-bar.md § 8 — the baseline before W1 and the re-reads
          after W3 and W5. Run it before and after every deploy that touches the strip.
Solves: A screenshot cannot say which element owns the 85px above the body, and the height hooks
        write CSS variables nobody can see. This prints the numbers, and names the header row's
        ancestor chain so the hiding rule in section-1.ts can be written without a hashed class.
Does not: Change anything, or work while the QAM is closed — the QuickAccess CEF target must be
          live. Read-only Runtime.evaluate. Companion to probe_deck_tab_strip.py, which prints
          colours and class chains per glyph; this one prints geometry.

Run with the plugin open on the Deck:

    ssh deck@<ip> 'python3 -' < scripts/probe_deck_tab_bar.py

Runs ON the Deck against 127.0.0.1:8080, so no SSH tunnel is needed. Pure stdlib — the RFC6455
handshake and framing are implemented here because the Deck's python has no websocket package.

Reading the output: `header` is the shallowest ancestor of the tab leaves that also contains both
`img[aria-label]` hints and does not contain TabContentsScroll — Steam's own header row. Its
parent is the full-width wrapper the hiding rule targets. `contents.topRelScope` is where the
body starts; the gap between that and the bar's height is what the plan reclaims. All values are
CSS px at the current --bonsai-ui-scale.

Baseline 2026-09-02 (Main tab, six tabs, ring on a chip, no game): header 80.66px tall, leaf
bottoms 62px, contents top 84.66px, reserve 4px, body height 616px, transcript 412px.
"""
import base64
import json
import os
import socket
import struct
import urllib.request

JS = r"""
(() => {
  const q = (s, r = document) => r.querySelector(s);
  const scope = q('.bonsai-scope');
  const root = q('.bonsai-decky-tabs-root');
  if (!scope || !root) return JSON.stringify({ error: 'scope/root missing', scope: !!scope, root: !!root });
  const f = v => Math.round(v * 100) / 100;
  const R = el => { const r = el.getBoundingClientRect(); return { x: f(r.x), y: f(r.y), w: f(r.width), h: f(r.height), bottom: f(r.bottom) }; };
  const cls = el => (typeof el.className === 'string' ? el.className : '').trim().split(/\s+/).filter(Boolean);
  const rootRect = root.getBoundingClientRect();
  const scopeRect = scope.getBoundingClientRect();
  const leaves = Array.from(root.querySelectorAll('.bonsai-tab-title-leaf'));
  const hints = Array.from(root.querySelectorAll('img[aria-label]'));
  const contents = root.querySelector('[class*="TabContentsScroll"]');
  const ourBar = scope.querySelector('.bonsai-tab-bar');
  let header = null;
  const chain = [];
  let n = leaves[0] ? leaves[0].parentElement : null;
  while (n && n !== root) {
    const hasAllLeaves = leaves.every(l => n.contains(l));
    const hasAllHints = hints.every(h => n.contains(h));
    const hasContents = contents ? n.contains(contents) : false;
    chain.push({ tag: n.tagName.toLowerCase(), classes: cls(n), rect: R(n), hasAllLeaves, hasAllHints, hasContents, childCount: n.children.length, display: getComputedStyle(n).display });
    if (!header && hasAllLeaves && hasAllHints && !hasContents) header = n;
    n = n.parentElement;
  }
  const cs = getComputedStyle;
  const out = {
    uiScale: cs(scope).getPropertyValue('--bonsai-ui-scale').trim() || null,
    scope: R(scope),
    root: R(root),
    contents: contents ? {
      rect: R(contents),
      topRelRoot: f(contents.getBoundingClientRect().top - rootRect.top),
      topRelScope: f(contents.getBoundingClientRect().top - scopeRect.top),
      marginTop: cs(contents).marginTop,
      zIndex: cs(contents).zIndex,
      scrollTop: contents.scrollTop,
      scrollHeight: contents.scrollHeight,
      clientHeight: contents.clientHeight,
    } : null,
    leaves: leaves.map(l => ({ label: l.getAttribute('aria-label'), rect: R(l), bottomRelRoot: f(l.getBoundingClientRect().bottom - rootRect.top), display: cs(l).display })),
    hints: hints.map(h => ({ label: h.getAttribute('aria-label'), rect: R(h), visibility: cs(h).visibility, display: cs(h).display })),
    header: header ? {
      classes: cls(header),
      rect: R(header),
      bottomRelRoot: f(header.getBoundingClientRect().bottom - rootRect.top),
      display: cs(header).display,
      parent: header.parentElement ? { classes: cls(header.parentElement), rect: R(header.parentElement), display: cs(header.parentElement).display } : null,
    } : null,
    chainFromLeaf0: chain,
    vars: {
      tabStripReserve: cs(root).getPropertyValue('--bonsai-tab-strip-reserve').trim(),
      tabBodyHeight: cs(scope).getPropertyValue('--bonsai-tab-body-height').trim(),
      scopeClasses: cls(scope),
      activeTab: root.getAttribute('data-bonsai-active-tab'),
    },
    ourBar: ourBar ? { rect: R(ourBar), classes: cls(ourBar), open: ourBar.classList.contains('bonsai-tab-bar--open'), strip: (() => { const s = ourBar.querySelector('.bonsai-tab-bar__strip'); return s ? R(s) : null; })() } : null,
    transcript: (() => { const t = scope.querySelector('.bonsai-chat-transcript'); return t ? { rect: R(t), scrollHeight: t.scrollHeight, clientHeight: t.clientHeight } : null; })(),
    slotRow: (() => { const d = scope.querySelector('.bonsai-chat-slot-row'); return d ? R(d) : null; })(),
    dock: (() => { const d = scope.querySelector('.bonsai-main-tab-dock'); return d ? R(d) : null; })(),
    gameContext: (scope.textContent.match(/Context: [^\n]{0,60}/) || [null])[0],
  };
  return JSON.stringify(out);
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


def summary(d):
    if "error" in d:
        return "ERROR: %s" % d["error"]
    lines = []
    c = d.get("contents") or {}
    h = d.get("header") or {}
    v = d.get("vars") or {}
    lines.append("ui scale            : %s" % d.get("uiScale"))
    lines.append("active tab          : %s" % v.get("activeTab"))
    lines.append("scope               : %s" % json.dumps(d.get("scope")))
    lines.append("steam header row    : %s (classes %s, display %s)" % (json.dumps(h.get("rect")), " ".join(h.get("classes") or []), h.get("display")))
    lines.append("header bottom/root  : %s" % h.get("bottomRelRoot"))
    lines.append("leaf bottoms/root   : %s" % [l["bottomRelRoot"] for l in d.get("leaves") or []])
    lines.append("hints               : %s" % [(x["label"], x["visibility"], x["display"]) for x in d.get("hints") or []])
    lines.append("contents top/scope  : %s (margin-top %s, z %s)" % (c.get("topRelScope"), c.get("marginTop"), c.get("zIndex")))
    lines.append("contents height     : %s (scrollHeight %s, scrollTop %s)" % (c.get("clientHeight"), c.get("scrollHeight"), c.get("scrollTop")))
    lines.append("--bonsai-tab-strip-reserve : %s" % v.get("tabStripReserve"))
    lines.append("--bonsai-tab-body-height   : %s" % v.get("tabBodyHeight"))
    lines.append("our bar             : %s" % json.dumps(d.get("ourBar")))
    lines.append("transcript          : %s" % json.dumps(d.get("transcript")))
    lines.append("slot row            : %s" % json.dumps(d.get("slotRow")))
    lines.append("dock                : %s" % json.dumps(d.get("dock")))
    lines.append("game context        : %s" % d.get("gameContext"))
    lines.append("chain from leaf 0 (tag.classes  rect  leaves/hints/contents):")
    for e in d.get("chainFromLeaf0") or []:
        lines.append("   %s.%s  %s  %s/%s/%s  display=%s" % (
            e["tag"], ".".join(e["classes"])[:80], json.dumps(e["rect"]),
            e["hasAllLeaves"], e["hasAllHints"], e["hasContents"], e["display"]))
    return "\n".join(lines)


targets = json.loads(urllib.request.urlopen("http://127.0.0.1:8080/json/list", timeout=10).read())
qa = [t for t in targets if "QuickAccess" in (t.get("title", "") + t.get("url", ""))]
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
        print(summary(data))
        print("\n---JSON---")
        print(json.dumps(data))
        break
