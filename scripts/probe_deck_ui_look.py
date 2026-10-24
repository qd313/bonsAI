#!/usr/bin/env python3
"""Title: Deck look check (what a person would call unsightly)

Purpose: Read the open bonsAI panel on the Deck and list the things the maintainer keeps catching by
    eye after every scripted check passed: button words that do not fit their button, a button
    whose gap to the panel's left edge and right edge differ when it is meant to sit centred or
    full width, a light button among the plugin's dark ones, a control pressed against the panel's
    edge while its neighbours keep the usual gap, and a spinner that is drawn but does not turn.
Used for: row QA-LOOK-01 in docs/testing-manual.md: run on every tab, on both screens, with every
    Deck block that touches the screen side, and attach the output to the evidence file:
        ssh deck@<ip> 'python3 - --json' < scripts/probe_deck_ui_look.py
    `--json` prints one object; without it, one line per finding. Exit code 1 when anything is found.
Solves: Plan 95 (2026-10-17): the maintainer found white host buttons, "Test connection" and an
    About link pressed against the right edge, overflowing link text and a still spinner, all on
    screens sessions had walked and screenshotted many times. A focus walk checks where the ring
    goes, not how the page looks; this checks how it looks.
Does not: Press anything or change the page (it only reads the page over the same debugging port
    deck_send_ask.py uses). It does not judge colors or spacing beyond the rules below, so a clean
    run is not a design review: a person still looks at one screenshot per tab.
"""
import base64
import json
import os
import socket
import struct
import sys
import urllib.request


# Transport, as in deck_send_ask.py (a plain WebSocket to Steam's debugging port on the Deck).
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


# The checks, run inside the panel's page. Numbers are in CSS pixels of the panel.
LOOK_JS = r"""JSON.stringify((() => {
  const scope = document.querySelector('.bonsai-scope');
  if (!scope) return {error: 'bonsAI panel is not open'};
  const P = scope.getBoundingClientRect();
  const tab = (document.querySelector('.bonsai-tab-bar') || {}).textContent || '';
  const out = [];
  const name = (el) => (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  const shown = (r) => r.width > 8 && r.height > 8 && r.bottom > 0 && r.top < innerHeight;
  const lum = (c) => { const m = (c || '').match(/\d+(\.\d+)?/g); if (!m || m.length < 3) return null;
    if (m.length > 3 && parseFloat(m[3]) < 0.5) return null; return (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) / 255; };
  // Steam's own language dropdown (plan 97 L8, the maintainer's call on 2026-10-22): the control is Steam's, not ours to
  // restyle, so no rule judges a control or a spinner inside its row. The row is AboutReplyLanguageSection.tsx's wrapper.
  const steamOwned = (el) => Boolean(el.closest('[data-bonsai-about-language-dropdown]'));
  const buttons = [...scope.querySelectorAll('button, [role=button], a, .DialogButton')]
    .filter((b) => shown(b.getBoundingClientRect()) && !b.closest('[aria-hidden=true]') && !steamOwned(b));
  const gaps = [];
  for (const b of buttons) {
    const r = b.getBoundingClientRect();
    const L = Math.round(r.left - P.left), R = Math.round(P.right - r.right);
    // 1. words that do not fit (cut off or spilling out); answer text and chips that scroll are skipped
    // scrollWidth counts the letter-spacing after the last letter, so the Ask pill read 56 in 51 while its word and
    // arrow sat whole inside the box (plan96-P96-F25-ASK-PILL.json): the words count as not fitting only when a
    // child or the text itself reaches past the control's own box.
    const spills = (() => {
      const past = (q) => q.width > 0 && (q.right > r.right + 1 || q.left < r.left - 1);
      if ([...b.children].some((k) => past(k.getBoundingClientRect()))) return true;
      const rng = document.createRange(); rng.selectNodeContents(b); return past(rng.getBoundingClientRect());
    })();
    if (b.scrollWidth > b.clientWidth + 1 && spills && !b.closest('.bonsai-preset-chip-label, .bonsai-chat-ai-bubble') && getComputedStyle(b).overflowX !== 'auto')
      out.push({rule: 'text-does-not-fit', control: name(b), need: b.scrollWidth, have: b.clientWidth});
    // 2. a light button among dark ones
    const bg = lum(getComputedStyle(b).backgroundColor);
    if (bg !== null && bg > 0.75) out.push({rule: 'light-button', control: name(b), brightness: Math.round(bg * 100) / 100});
    // 3. pressed against the panel edge (under 6 px) when it is not a full-width row, nor inside a full-bleed row
    // A control inside a row that asked for edge to edge (.bonsai-full-bleed-row: the suggestion chips) is meant to
    // touch the panel's edge (docs/design-language.md, rule 1), so it is not a finding (plan 96 F25).
    // The chat's own rows (.bonsai-chat-transcript: the answer, Show details, the notes card, the earlier pill) sit
    // 4 px from the panel's edge and keep a corner clear for the Copy and Retry icons by design (docs/lessons-learned.md,
    // the corner-icon paragraph), so neither the edge rule nor the lopsided rule judges them (plan 96 F25).
    const inChat = Boolean(b.closest('.bonsai-chat-transcript'));
    if (r.width < P.width - 4 && (L < 6 || R < 6) && !b.closest('.bonsai-full-bleed-row') && !inChat)
      out.push({rule: 'touches-panel-edge', control: name(b), left: L, right: R});
    if (r.width < P.width - 4 && !inChat) gaps.push({b, L, R, r});
  }
  // 4. lopsided: a lone button in its row, wide (over 60 % of the panel), with left and right gaps over 6 px apart
  for (const g of gaps) {
    const sameRow = gaps.filter((o) => o !== g && Math.abs(o.r.top - g.r.top) < 4);
    if (!sameRow.length && g.r.width > P.width * 0.6 && Math.abs(g.L - g.R) > 6)
      out.push({rule: 'lopsided', control: name(g.b), left: g.L, right: g.R});
  }
  // 5. a spinner drawn but not turning
  for (const sp of scope.querySelectorAll('[class*=spinner], [class*=Spinner], [class*=throbber], [role=progressbar]')) {
    if (!shown(sp.getBoundingClientRect()) || steamOwned(sp)) continue;
    const cs = getComputedStyle(sp);
    const kids = [...sp.querySelectorAll('*')].map((k) => getComputedStyle(k).animationName);
    if ((cs.animationName === 'none' || cs.animationPlayState === 'paused') && kids.every((a) => a === 'none'))
      out.push({rule: 'still-spinner', control: (sp.className + '').slice(0, 40)});
  }
  return {tab: tab.trim().slice(0, 30), panel: Math.round(P.width), screenHeight: innerHeight, findings: out};
})())"""


def main():
    as_json = "--json" in sys.argv
    sock = connect_qa()
    result = evaluate(sock, LOOK_JS)
    if as_json:
        print(json.dumps(result))
    elif "error" in result:
        print(result["error"])
    else:
        print(f"tab {result['tab']!r}, panel {result['panel']} px wide, screen {result['screenHeight']} px tall")
        for f in result["findings"]:
            print("  " + " ".join(f"{k}={v}" for k, v in f.items()))
        print(f"{len(result['findings'])} finding(s)")
    sys.exit(1 if result.get("error") or result.get("findings") else 0)


if __name__ == "__main__":
    main()
