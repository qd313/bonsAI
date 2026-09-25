#!/usr/bin/env python3
"""Title: Deck check -- does the question box's blinking cursor sit against the hint's first letter?

Purpose: Measure, on the Deck itself, where the drawn blinking cursor sits relative to the first
         letter of the empty question box's hint ("Describe the level, boss, or puzzle you're stuck
         on.") and print PASS or FAIL with the numbers. The maintainer's rule (2026-09-24): the
         cursor sits right against the "D", about half a pixel clear of it, level with it.
Used for: docs/testing.md row ASK-CARET-01, and any change to the Ask bar, its padding, its text
          size or the UI scale -- run it after the deploy, with the ring on the question box.
Solves: This bug came back more than once, because each Deck check measured something next to the
        bug instead of the bug. The last one compared the hint's font size with the cursor's and
        passed while the cursor sat 5 px left of the "D" and 4 px above it (measured 2026-09-24).
        This script measures the one thing a person sees -- the gap between the cursor and the
        letter -- so a pass means the cursor is where it should be.
Does not: Press anything, type anything, or change the page. Read-only, like the other probe_deck_*
          scripts. Does not put the ring on the question box: the cursor is only drawn while the
          box has focus, and the script says so when it finds no cursor.

Run with the QAM open on the bonsAI Main tab, the ring on the question box, the box empty, and the
Ask mode on Strategy (the only mode that draws the hint):

    ssh deck@<ip> 'python3 -' < scripts/probe_deck_ask_caret.py

Transport (ws_connect / ws_send / ws_recv / evaluate / connect_qa) is lifted verbatim from
deck_send_ask.py, which took it from probe_deck_ask_row_width.py: every probe runs as a single file
piped over ssh, so it cannot import a shared copy.
"""
import base64
import json
import os
import socket
import struct
import urllib.request

# The pass band, in CSS pixels. The cursor's right edge should sit this close to where the "D" is
# drawn (its ink, not its letter box), and its top and bottom this close to the letter's own.
GAP_MIN_PX = 0.0
GAP_MAX_PX = 1.5
LEVEL_TOLERANCE_PX = 1.5

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


def evaluate(sock, msg_id, expression):
    ws_send(sock, json.dumps({"id": msg_id, "method": "Runtime.evaluate",
                              "params": {"expression": expression, "returnByValue": True}}))
    while True:
        msg = json.loads(ws_recv(sock))
        if msg.get("id") != msg_id:
            continue
        result = msg.get("result", {}).get("result", {})
        if "value" not in result:
            raise SystemExit("EVAL FAILED: " + json.dumps(msg)[:900])
        return json.loads(result["value"])


def connect_qa():
    targets = json.loads(urllib.request.urlopen("http://127.0.0.1:8080/json/list", timeout=10).read())
    qa = [t for t in targets if "QuickAccess" in (t.get("title", "") + t.get("url", ""))]
    if not qa:
        raise SystemExit("no QuickAccess target - is the QAM open?")
    return ws_connect(qa[0]["webSocketDebuggerUrl"])


# ---------------------------------------------------------------------------
# Injected JS (read-only)
# ---------------------------------------------------------------------------

# The "D" is measured twice: its letter box from a text range (where layout put it), and where its
# ink starts inside that box from a canvas in the same font (the letter's own left side bearing,
# which a range cannot see). The gap a person sees runs from the cursor's right edge to the ink.
MEASURE_JS = r"""
(function () {
  var scope = document.querySelector('.bonsai-scope');
  if (!scope) return JSON.stringify({ problem: 'bonsai-scope not found - open the QAM to the bonsAI Main tab' });
  var hint = scope.querySelector('.bonsai-unified-input-strategy-placeholder');
  if (!hint) return JSON.stringify({ problem: 'no hint on screen - the box must be empty and the Ask mode Strategy' });
  var caret = scope.querySelector('.bonsai-unified-input-fake-caret');
  if (!caret) return JSON.stringify({ problem: 'no cursor drawn - put the ring on the question box first' });
  var text = null;
  for (var i = 0; i < hint.childNodes.length; i++) {
    if (hint.childNodes[i].nodeType === 3) { text = hint.childNodes[i]; break; }
  }
  if (!text) return JSON.stringify({ problem: 'the hint has no text node' });
  var range = document.createRange();
  range.setStart(text, 0);
  range.setEnd(text, 1);
  var d = range.getBoundingClientRect();
  var c = caret.getBoundingClientRect();
  var cs = getComputedStyle(hint);
  var ctx = document.createElement('canvas').getContext('2d');
  ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
  var m = ctx.measureText(text.data.charAt(0));
  return JSON.stringify({
    letter: text.data.charAt(0),
    letterBox: { left: d.left, top: d.top, bottom: d.bottom },
    inkOffset: -m.actualBoundingBoxLeft,
    caret: { left: c.left, right: c.right, top: c.top, bottom: c.bottom, width: c.width },
    caretClass: caret.className,
    screen: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio }
  });
})()
"""


def main():
    sock = connect_qa()
    got = evaluate(sock, 1, MEASURE_JS)
    if got.get("problem"):
        raise SystemExit("CANNOT MEASURE - " + got["problem"])
    box = got["letterBox"]
    caret = got["caret"]
    ink_left = box["left"] + got["inkOffset"]
    gap = ink_left - caret["right"]
    top_off = caret["top"] - box["top"]
    bottom_off = caret["bottom"] - box["bottom"]
    screen = got["screen"]
    print("screen        : %sx%s CSS px at %.2f (the Deck's own screen reports about 853x533 at 1.5;"
          " the 1080p monitor 1500x843 at 1.28)" % (screen["width"], screen["height"], screen["dpr"]))
    print("cursor        : %s" % got["caretClass"])
    print("first letter  : %r, letter box starts at x=%.2f, ink at x=%.2f" % (got["letter"], box["left"], ink_left))
    print("cursor        : x=%.2f..%.2f (%.2f wide), y=%.2f..%.2f" % (
        caret["left"], caret["right"], caret["width"], caret["top"], caret["bottom"]))
    print("gap to letter : %.2f px   (wanted %.1f to %.1f)" % (gap, GAP_MIN_PX, GAP_MAX_PX))
    print("top vs letter : %+.2f px   bottom vs letter: %+.2f px   (wanted within %.1f)" % (
        top_off, bottom_off, LEVEL_TOLERANCE_PX))
    ok = (
        GAP_MIN_PX <= gap <= GAP_MAX_PX
        and abs(top_off) <= LEVEL_TOLERANCE_PX
        and abs(bottom_off) <= LEVEL_TOLERANCE_PX
    )
    print("\nPASS - the cursor sits against the first letter." if ok else
          "\nFAIL - the cursor is not against the first letter; see the numbers above.")
    raise SystemExit(0 if ok else 1)


main()
