#!/usr/bin/env python3
"""Title: Deck knowledge-base read-back (one call, nothing pressed)

Purpose: Read the newest answer on the bonsAI Main tab and print one JSON object that holds what a
    knowledge-base Deck check looks at: whether the answer has finished; the notes line (its words, and
    the note names when it is open); how many spoiler covers the answer holds, shut and open; whether
    the "No close match" or the "Not in my notes" line is there; the game named in the game tag beside
    the Ask button; the control that has the ring and whether the panel's page has the window's focus;
    and the plugin log's newest "notes for this answer" line (the line kb_attach_log_line writes).
Used for: the knowledge-base rows run on the Deck by a driver, in place of fifteen or more separate reads:
        ssh deck@<ip> 'python3 - --json' < scripts/deck_kb_readback.py
    `--json` prints one object; without it, one line per key. Exit code 1 only when the panel is not open.
Solves: Plan 103 (lane T4): one knowledge-base check (ask, see which notes attached, count the covers, save
    the evidence) cost fifteen to twenty-five tool calls and nothing read the result back in one go.
Does not: Press anything or change the page (it reads over the same debugging port deck_send_ask.py uses),
    run a command, write a file, or read the settings file. It prints key names, counts, the notes line
    and the log line; never the answer's text. The class names it looks for are pinned against src/ by
    scripts/deck_kb_readback.test.mjs, so a rename breaks that test and not a Deck night.
"""
import base64
import glob
import json
import os
import socket
import struct
import sys
import urllib.request

ATTACH_MARKER = "notes for this answer:"  # the stable middle of kb_attach_log_line's line
LOG_DIR = os.path.join("~", "homebrew", "logs", "bonsAI")
LOG_TAIL_BYTES = 400000  # the newest log can be large; the line we want is near its end
LOG_LINE_MAX = 700


# Transport, as in probe_deck_ui_look.py (a plain WebSocket to Steam's debugging port on the Deck).
def ws_connect(url):
    _, rest = url.split("://", 1)
    hostport, path = rest.split("/", 1)
    host, port = hostport.split(":")
    s = socket.create_connection((host, int(port)), timeout=10)
    key = base64.b64encode(os.urandom(16)).decode()
    s.sendall(
        (f"GET /{path} HTTP/1.1\r\nHost: {hostport}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
         f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n").encode()
    )
    buf = b""
    while b"\r\n\r\n" not in buf:
        buf += s.recv(4096)
    return s


def ws_send(s, payload):
    data = payload.encode()
    header = bytearray([0x81])
    mask = os.urandom(4)
    n = len(data)
    if n < 126:
        header.append(0x80 | n)
    elif n < 65536:
        header.append(0x80 | 126)
        header += struct.pack(">H", n)
    else:
        header.append(0x80 | 127)
        header += struct.pack(">Q", n)
    s.sendall(bytes(header) + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))


def ws_recv(s):
    def read(n):
        out = b""
        while len(out) < n:
            chunk = s.recv(n - len(out))
            if not chunk:
                raise ConnectionError("socket closed")
            out += chunk
        return out

    msg = b""
    while True:
        b0, b1 = read(2)
        n = b1 & 0x7F
        if n == 126:
            n = struct.unpack(">H", read(2))[0]
        elif n == 127:
            n = struct.unpack(">Q", read(8))[0]
        msg += read(n)
        if b0 & 0x80:
            return msg.decode()


def evaluate(sock, expression):
    ws_send(sock, json.dumps({"id": 1, "method": "Runtime.evaluate",
                              "params": {"expression": expression, "returnByValue": True}}))
    while True:
        msg = json.loads(ws_recv(sock))
        if msg.get("id") == 1:
            result = msg.get("result", {}).get("result", {})
            if "value" not in result:
                raise SystemExit("EVAL FAILED: " + json.dumps(msg)[:600])
            return json.loads(result["value"])


def connect_qa():
    targets = json.loads(urllib.request.urlopen("http://127.0.0.1:8080/json/list", timeout=10).read())
    qa = [t for t in targets if "QuickAccess" in (t.get("title", "") + t.get("url", ""))]
    if not qa:
        raise SystemExit("no Quick Access page: is the menu open?")
    return ws_connect(qa[0]["webSocketDebuggerUrl"])


# The read, run inside the panel's page. Every class name below is pinned against src/ by the test.
# No optional chaining: the Deck's browser is old (the other probe scripts avoid it too).
READBACK_JS = r"""JSON.stringify((function () {
  var scope = document.querySelector('.bonsai-scope');
  if (!scope) return {error: 'bonsAI panel is not open'};
  var words = function (el) { return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : ''; };
  var slots = scope.querySelectorAll('.bonsai-chat-turn-slot');
  var slot = slots.length ? slots[slots.length - 1] : null;
  var bubble = slot ? slot.querySelector('.bonsai-chat-ai-bubble') : null;
  var header = slot ? slot.querySelector('.bonsai-chat-turn-row-header') : null;
  var streaming = Boolean(
    (bubble && bubble.classList.contains('bonsai-chat-ai-bubble--stream-preview')) ||
    (header && header.classList.contains('bonsai-chat-turn-row-header--streaming')));
  var block = slot ? slot.querySelector('.bonsai-kb-notes-block') : null;
  var notes = {present: Boolean(block), label: null, open: false, count: 0, names: []};
  if (block) {
    var label = block.getAttribute('aria-label') || '';
    var more = /\(\+(\d+) more\)/.exec(label);
    notes.label = label;
    notes.open = block.getAttribute('aria-expanded') === 'true';
    notes.count = more ? Number(more[1]) + 1 : 1;
    if (notes.open) {
      // A name is a bold line: the header's name, or "Name · source" above each note in the open body.
      var bolds = block.querySelectorAll('b');
      var clean = function (b) {
        var copy = b.cloneNode(true);
        var tags = copy.querySelectorAll('.bonsai-kb-note-demoted-tag');
        for (var i = 0; i < tags.length; i++) tags[i].parentNode.removeChild(tags[i]);
        return words(copy);
      };
      var body = block.children.length > 1 ? block.lastElementChild : null;
      var heads = body && body.children.length > 1 ? body.children : [];
      for (var k = 0; k < heads.length; k++) {
        var t = words(heads[k].firstElementChild);
        if (t.indexOf(' · ') > 0) notes.names.push(t.split(' · ')[0]);
      }
      if (!notes.names.length && bolds.length) notes.names.push(clean(bolds[0]));
    }
  }
  var text = words(bubble);
  var ring = document.querySelector('.gpfocus');
  var active = document.activeElement;
  var focused = ring || (active && active !== document.body ? active : null);
  var name = function (el) {
    return (el.getAttribute('aria-label') || words(el)).slice(0, 60);
  };
  var firstClass = function (el) {
    var c = typeof el.className === 'string' ? el.className : '';
    var m = /bonsai-[\w-]+/.exec(c);
    return m ? m[0] : c.split(/\s+/)[0] || '';
  };
  var game = scope.querySelector('.bonsai-ask-strip-game__name');
  var tabBar = scope.querySelector('.bonsai-tab-bar');
  return {
    tab: words(tabBar).slice(0, 30),
    turns: slots.length,
    answerShown: Boolean(bubble),
    finished: Boolean(bubble) && !streaming,
    streaming: streaming,
    notes: notes,
    spoilers: {
      shut: bubble ? bubble.querySelectorAll('.bonsai-spoiler-reveal-target').length : 0,
      open: bubble ? bubble.querySelectorAll('.bonsai-spoiler-collapse-target').length : 0
    },
    noCloseMatchLine: text.indexOf('No close match in my notes') >= 0,
    notInMyNotesLine: text.indexOf('Not in my notes') >= 0,
    game: game ? words(game) : null,
    focus: focused ? {label: name(focused), cls: firstClass(focused), via: ring ? 'ring' : 'activeElement'} : null,
    windowFocus: document.hasFocus()
  };
})())"""


def last_attach_line(text):
    """The newest line in the log text that holds the attach marker, cut to a sane length, or None."""
    found = None
    for line in text.splitlines():
        if ATTACH_MARKER in line:
            found = line
    return found.strip()[:LOG_LINE_MAX] if found is not None else None


def newest_attach_line(log_dir=LOG_DIR):
    """The attach line from the plugin's newest log files (newest first, the last few), or None."""
    files = glob.glob(os.path.join(os.path.expanduser(log_dir), "*.log"))
    files.sort(key=os.path.getmtime, reverse=True)
    for path in files[:3]:
        try:
            with open(path, "rb") as fh:
                fh.seek(0, os.SEEK_END)
                fh.seek(max(0, fh.tell() - LOG_TAIL_BYTES))
                line = last_attach_line(fh.read().decode("utf-8", errors="replace"))
        except OSError:
            continue
        if line:
            return {"file": os.path.basename(path), "line": line}
    return None


def main():
    as_json = "--json" in sys.argv
    result = evaluate(connect_qa(), READBACK_JS)
    result["attachLine"] = newest_attach_line()
    if as_json:
        print(json.dumps(result))
    else:
        for key, value in result.items():
            print(f"{key}: {json.dumps(value)}")
    sys.exit(1 if result.get("error") else 0)


if __name__ == "__main__":
    main()
