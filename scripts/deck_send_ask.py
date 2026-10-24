#!/usr/bin/env python3
"""Title: Deck Ask-field text injector

Purpose: Put an exact question into the bonsAI Ask field on the Deck from the maintainer's PC, so
         a QA question is typed once (correctly) instead of thumb-typed on the on-screen keyboard.
Used for: docs/testing.md KB QA rows whose steps quote a verbatim sentence -- KB-ROUTER-01,
          KB-ASKMODE-01, KB-FLOOR-01, KB-FOLLOWUP-01, KB-NEWTITLE-01. A mistyped question silently
          changes what is being tested: KB-ROUTER-01's four sentences are chosen precisely because
          none of them contain "deck" or "proton", so one stray word invalidates the row.
Solves: SteamOS ships no clipboard tool (wl-copy / xclip / xsel / copyq all absent) and the rootfs
        is immutable, so the paste route costs a steamos-readonly disable that a system update then
        reverts. CDP is already open on the Deck at 127.0.0.1:8080 and is how every other
        probe_deck_* script works.
Does not: Press Ask. The submit, the mode selection and the reading of Show details stay manual, so
          what is under test is still the real on-device path -- this replaces the keyboard only.
          Does not touch any field but the Ask input, and does not change the Ask mode.

UNLIKE the other probe_deck_* scripts, this one WRITES to the page. It is confined to the Ask
input's value. React owns that input, so a plain `.value =` is reverted on the next render; the
write goes through the native HTMLInputElement value setter plus a bubbling `input` event, which
is what React's onChange listener actually reads. That trick is load-bearing and silent when it
fails, so the script re-reads the field after a delay and prints VERIFIED / NOT VERIFIED rather
than trusting the write.

Run with the QAM open on the bonsAI Main tab. The flags MUST go inside the quoted remote
command — outside it, ssh rejoins the words and the remote shell re-splits them, so a
multi-word --text silently keeps only its first word, and the VERIFIED line below then
honestly confirms the truncated write (measured 2026-08-27: sent a 14-word question, field
held 'in', script printed VERIFIED):

    ssh deck@<ip> 'python3 - --text "your question here"' < scripts/deck_send_ask.py
    ssh deck@<ip> 'python3 - --read'  < scripts/deck_send_ask.py   # report state, write nothing
    ssh deck@<ip> 'python3 - --clear' < scripts/deck_send_ask.py   # empty the field

Transport (ws_connect / ws_send / ws_recv / evaluate / connect_qa) is lifted verbatim from
probe_deck_ask_row_width.py, which took it from probe_deck_tab_switch.py. The injected JS avoids
optional chaining for the same reason those files do: the Deck's CEF is old enough that it is not
worth finding out where the line is.
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
# Transport (from probe_deck_ask_row_width.py -- unchanged)
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
# Injected JS
# ---------------------------------------------------------------------------

# Shared preamble: locate the Ask input and the mode trigger. Duplicated into each expression
# because every Runtime.evaluate is its own closure and CDP has no way to import across calls.
FIND_JS = r"""
  var scope = document.querySelector('.bonsai-scope');
  var field = scope ? scope.querySelector('input[type="text"]') : null;
  var modeBtn = scope ? scope.querySelector('.bonsai-ask-mode-trigger') : null;
  var askBtn = scope ? scope.querySelector('.bonsai-ask-primary') : null;
  var modeText = modeBtn ? (modeBtn.textContent || '').trim() : '';
  var askText = askBtn ? (askBtn.textContent || '').trim() : '';
"""

READ_JS = r"""
(function () {
  %s
  return JSON.stringify({
    scope: !!scope,
    found: !!field,
    value: field ? field.value : null,
    placeholder: field ? (field.getAttribute('placeholder') || '') : '',
    mode: modeText,
    askLabel: askText
  });
})()
""" % FIND_JS

# The write. `desc.set.call` is the native setter -- assigning field.value directly leaves React's
# internal value tracker in sync with the old value, so React treats the subsequent input event as
# a no-op and reverts on the next render.
WRITE_JS = r"""
(function () {
  %s
  if (!field) return JSON.stringify({ scope: !!scope, found: false });
  var text = %s;
  var proto = window.HTMLInputElement.prototype;
  var desc = Object.getOwnPropertyDescriptor(proto, 'value');
  if (desc && desc.set) {
    desc.set.call(field, text);
  } else {
    field.value = text;
  }
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
  return JSON.stringify({
    scope: true,
    found: true,
    nativeSetter: !!(desc && desc.set),
    immediate: field.value,
    mode: modeText
  });
})()
"""


def main():
    argv = sys.argv[1:]
    text = None
    mode = "read"
    if "--read" in argv:
        mode = "read"
    elif "--clear" in argv:
        mode = "write"
        text = ""
    elif "--text" in argv:
        i = argv.index("--text")
        if i + 1 >= len(argv):
            raise SystemExit("--text needs a value")
        text = argv[i + 1]
        mode = "write"
    else:
        raise SystemExit("usage: --text \"question\" | --read | --clear")

    sock = connect_qa()

    if mode == "read":
        state = evaluate(sock, 1, READ_JS)
        if not state.get("scope"):
            raise SystemExit("bonsai-scope not found - open the QAM to the bonsAI Main tab")
        print("Ask mode : %s" % (state.get("mode") or "?"))
        print("field    : %s" % ("found" if state.get("found") else "NOT FOUND"))
        print("value    : %r" % state.get("value"))
        print("hint     : %s" % state.get("placeholder"))
        return

    write = evaluate(sock, 1, WRITE_JS % (FIND_JS, json.dumps(text)))
    if not write.get("scope"):
        raise SystemExit("bonsai-scope not found - open the QAM to the bonsAI Main tab")
    if not write.get("found"):
        raise SystemExit("Ask input not found - is the Main tab active?")

    # Re-read after a render tick. An immediate read proves nothing: React reverts a mistracked
    # write on its NEXT render, which has not happened yet when the write expression returns.
    time.sleep(0.5)
    after = evaluate(sock, 2, READ_JS)
    actual = after.get("value")

    print("Ask mode      : %s" % (after.get("mode") or "?"))
    print("native setter : %s" % write.get("nativeSetter"))
    print("wrote         : %r" % text)
    print("field now     : %r" % actual)
    if actual == text:
        print("\nVERIFIED - the field holds exactly what was sent. Press Ask on the Deck.")
    else:
        print("\nNOT VERIFIED - the field does not match what was sent.")
        print("Do NOT run the test on this; the plugin did not receive the question you think.")
        sys.exit(1)


main()
