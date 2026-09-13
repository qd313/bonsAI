#!/usr/bin/env python3
"""Title: Deck tab switch probe

Purpose: Sample the tab strip every frame across a shoulder-button press and report what changed.
Used for: The LB/RB tab-strip bug — docs/planning/03-lbrb-tab-flicker.md, row TAB-SWITCH-01.
Solves: probe_deck_tab_strip.py answers "what does the strip look like right now" in one shot. The
        remaining symptom is a *transition* — the strip looks busy and the icons shuffle on a
        shoulder press, most reproducibly on a press that cannot change tab. A single sample
        cannot see that. This records ~5s of frames and prints only the frames that differ.
Does not: Change anything the page renders. It reads geometry and computed style, and holds node
          identity in a WeakMap on `window` rather than stamping DOM attributes, so nothing about
          the markup differs while it runs. Also does not press the button — a human does that.

Run with the plugin open on the Deck, then press the shoulder button when told:

    ssh deck@<ip> 'python3 -' < scripts/probe_deck_tab_switch.py

Options are read from argv, so pass them through the same stdin form:

    ssh deck@<ip> 'python3 - --seconds 8 --label run-b' < scripts/probe_deck_tab_switch.py

Runs ON the Deck against 127.0.0.1:8080, so no SSH tunnel is needed. Pure stdlib — the RFC6455
handshake and framing are implemented here because the Deck's python has no websocket package.
Transport is lifted from probe_deck_tab_strip.py; that script is left alone because it is the
reference for the 2026-08-04 `.Active` finding (docs/audit/decky-tab-strip-classes.md).

Why CDP and not a `bonsaiDebugLog` from plugin code: plugin JS runs in SharedJSContext, whose
`document` contains none of our markup, and whose `activeElement` is always a shell `<body>`
(docs/audit/decky-realms.md). Evaluating against the QuickAccess target puts this JS in the
document that actually holds the strip, where `document.querySelector` is correct.
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
# Injected JS. ARM installs a per-frame sampler; READ hands the buffer back.
# Kept to plain ES6 without optional chaining, matching probe_deck_tab_strip.py — the Deck's CEF
# is old enough that it is not worth finding out where the line is.
# ---------------------------------------------------------------------------

ARM_JS = r"""
(() => {
  const SECONDS = __SECONDS__;
  const root = document.querySelector('.bonsai-decky-tabs-root');
  if (!root) return JSON.stringify({ ok: false, why: 'no .bonsai-decky-tabs-root - is bonsAI the open QAM tab?' });

  // Node identity without touching the DOM: a WeakMap keyed on the node itself. A replaced
  // TabContentsScroll shows up as a new integer rather than as an attribute we had to write.
  if (!window.__bonsaiProbeIds) { window.__bonsaiProbeIds = new WeakMap(); window.__bonsaiProbeNextId = 1; }
  const idOf = (el) => {
    if (!el) return 0;
    let id = window.__bonsaiProbeIds.get(el);
    if (!id) { id = window.__bonsaiProbeNextId++; window.__bonsaiProbeIds.set(el, id); }
    return id;
  };

  const classesOf = (n) => {
    if (!n) return '';
    const c = typeof n.className === 'string' ? n.className : (n.className && n.className.baseVal) || '';
    return c.trim();
  };

  // Ancestor walk from a glyph up to the tabs root, same shape probe_deck_tab_strip.py uses.
  const chainOf = (ic) => {
    const chain = [];
    let n = ic.parentElement;
    while (n) {
      chain.push(n.tagName.toLowerCase() + (classesOf(n) ? '.' + classesOf(n).split(/\s+/).join('.') : ''));
      if (n.classList && n.classList.contains('bonsai-decky-tabs-root')) break;
      n = n.parentElement;
    }
    return chain;
  };

  // Compact per-frame signature of Steam's focus classes: which ancestor depth carries which
  // class. This is the thing expected to churn during a switch, so it must be cheap to diff.
  const focusSigOf = (ic) => {
    const bits = [];
    let n = ic.parentElement, d = 0;
    while (n) {
      const cl = n.classList;
      if (cl) {
        if (cl.contains('gpfocus')) bits.push('gpfocus@' + d);
        if (cl.contains('gpfocuswithin')) bits.push('gpfocuswithin@' + d);
        if (cl.contains('Active')) bits.push('Active@' + d);
        if (cl.contains('active')) bits.push('active@' + d);
      }
      if (cl && cl.contains('bonsai-decky-tabs-root')) break;
      n = n.parentElement; d++;
    }
    return bits.join(',');
  };

  // Any non-identity transform between the glyph and the tabs root is where a carousel slide
  // would show up. Recorded with its depth so T2 can tell "Steam moved the row" from
  // "one chip moved".
  const transformSigOf = (ic) => {
    const bits = [];
    let n = ic.parentElement, d = 0;
    while (n) {
      const tf = getComputedStyle(n).transform;
      if (tf && tf !== 'none') bits.push(d + ':' + tf);
      if (n.classList && n.classList.contains('bonsai-decky-tabs-root')) break;
      n = n.parentElement; d++;
    }
    return bits.join('|');
  };

  const r2 = (v) => Math.round(v * 100) / 100;

  // Visibility signature of the whole ancestor chain. A bar that blinks out does it by way of
  // opacity / visibility / display / zero height on SOME ancestor, not on the glyph span the
  // first version of this probe watched. Recorded per depth so the culprit is identifiable
  // rather than just "something disappeared".
  const visSigOf = (el) => {
    const bits = [];
    let n = el, d = 0;
    while (n) {
      const cs = getComputedStyle(n);
      const r = n.getBoundingClientRect();
      if (cs.opacity !== '1' || cs.visibility !== 'visible' || cs.display === 'none' ||
          r.width === 0 || r.height === 0) {
        bits.push(d + ':o=' + cs.opacity + ',v=' + cs.visibility + ',d=' + cs.display +
                  ',wh=' + r2(r.width) + 'x' + r2(r.height));
      }
      if (n.classList && n.classList.contains('bonsai-decky-tabs-root')) break;
      n = n.parentElement; d++;
    }
    return bits.join('|');
  };

  const sample = () => {
    const glyphs = [];
    const icons = document.querySelectorAll('.bonsai-tab-title-icon');
    for (const ic of icons) {
      const rect = ic.getBoundingClientRect();
      const cs = getComputedStyle(ic);
      glyphs.push({
        k: ic.className,
        x: r2(rect.x), y: r2(rect.y), w: r2(rect.width), h: r2(rect.height),
        c: cs.color,
        fl: cs.filter,
        o: cs.opacity,
        f: focusSigOf(ic),
        t: transformSigOf(ic),
        v: visSigOf(ic),
      });
    }

    // The chips and the row that holds them - the actual "tab bar". Counts are included so a
    // chip that unmounts and remounts registers even if the survivors do not move.
    const leaves = document.querySelectorAll('.bonsai-tab-title-leaf');
    const leafSig = [];
    for (const lf of leaves) {
      const r = lf.getBoundingClientRect();
      const cs = getComputedStyle(lf);
      leafSig.push([r2(r.x), r2(r.y), r2(r.width), r2(r.height), cs.opacity, cs.visibility,
                    cs.backgroundColor, cs.boxShadow, cs.outlineStyle].join(','));
    }
    const stripRow = leaves.length ? leaves[0].parentElement : null;
    const stripRect = stripRow ? stripRow.getBoundingClientRect() : null;
    const rootRect = root.getBoundingClientRect();
    const sc = document.querySelector('.bonsai-decky-tabs-root [class*="TabContentsScroll"]');
    const scope = document.querySelector('.bonsai-scope');
    const rootCs = getComputedStyle(root);
    return {
      at: root.getAttribute('data-bonsai-active-tab'),
      // The two CSS vars the layout hooks write. T3 fires if either moves across the press.
      reserve: (rootCs.getPropertyValue('--bonsai-tab-strip-reserve') || '').trim(),
      bodyH: scope ? (getComputedStyle(scope).getPropertyValue('--bonsai-tab-body-height') || '').trim() : '',
      stable: scope ? (scope.classList.contains('bonsai-qam-strip-stable') ? 1 : 0) : -1,
      locked: scope ? (scope.classList.contains('bonsai-qam-height-locked') ? 1 : 0) : -1,
      scId: idOf(sc),
      scTop: sc ? r2(sc.scrollTop) : -1,
      scH: sc ? r2(sc.scrollHeight) : -1,
      scC: sc ? r2(sc.clientHeight) : -1,
      nGlyph: icons.length,
      nLeaf: leaves.length,
      leaves: leafSig.join(' | '),
      stripId: idOf(stripRow),
      strip: stripRect ? [r2(stripRect.x), r2(stripRect.y), r2(stripRect.width), r2(stripRect.height)].join(',') : '',
      stripVis: stripRow ? visSigOf(stripRow) : '',
      rootWH: r2(rootRect.width) + 'x' + r2(rootRect.height),
      g: glyphs,
    };
  };

  window.__bonsaiTabProbe = [];
  window.__bonsaiTabProbeChains = { first: null, last: null };
  const t0 = performance.now();
  const deadline = t0 + SECONDS * 1000;

  const tick = () => {
    const now = performance.now();
    const s = sample();
    s.ms = Math.round(now - t0);
    window.__bonsaiTabProbe.push(s);
    const icons = document.querySelectorAll('.bonsai-tab-title-icon');
    const chains = [];
    for (const ic of icons) chains.push({ icon: ic.className, chain: chainOf(ic) });
    if (!window.__bonsaiTabProbeChains.first) window.__bonsaiTabProbeChains.first = chains;
    window.__bonsaiTabProbeChains.last = chains;
    if (now < deadline) requestAnimationFrame(tick);
    else window.__bonsaiTabProbeDone = true;
  };
  window.__bonsaiTabProbeDone = false;
  requestAnimationFrame(tick);

  return JSON.stringify({ ok: true, glyphs: document.querySelectorAll('.bonsai-tab-title-icon').length });
})()
"""

READ_JS = r"""
JSON.stringify({
  done: !!window.__bonsaiTabProbeDone,
  frames: window.__bonsaiTabProbe || [],
  chains: window.__bonsaiTabProbeChains || null,
})
"""


# ---------------------------------------------------------------------------
# Transport (from probe_deck_tab_strip.py — unchanged)
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


# ---------------------------------------------------------------------------
# Diff / report
# ---------------------------------------------------------------------------

GLYPH_FIELDS = ("x", "y", "w", "h", "c", "fl", "o", "f", "t", "v")
FRAME_FIELDS = ("at", "reserve", "bodyH", "stable", "locked", "scId", "scTop", "scH", "scC",
                "nGlyph", "nLeaf", "leaves", "stripId", "strip", "stripVis", "rootWH")


def frame_key(frame):
    """Everything except the timestamp, canonicalised so two frames compare by value."""
    glyphs = [tuple(g.get(f) for f in GLYPH_FIELDS) for g in frame.get("g", [])]
    return (tuple(frame.get(f) for f in FRAME_FIELDS), tuple(glyphs))


def describe_delta(prev, cur):
    """Human-readable list of what changed between two frames."""
    out = []
    for f in FRAME_FIELDS:
        if prev.get(f) != cur.get(f):
            out.append("  %-8s %r -> %r" % (f, prev.get(f), cur.get(f)))
    pg, cg = prev.get("g", []), cur.get("g", [])
    if len(pg) != len(cg):
        out.append("  glyph count %d -> %d" % (len(pg), len(cg)))
        return out
    for i, (a, b) in enumerate(zip(pg, cg)):
        bits = []
        for f in GLYPH_FIELDS:
            if a.get(f) != b.get(f):
                bits.append("%s %r->%r" % (f, a.get(f), b.get(f)))
        if bits:
            out.append("  [%s] %s" % (short_glyph(b.get("k", "?")), "; ".join(bits)))
    return out


def short_glyph(cls):
    for token in str(cls).split():
        if token.startswith("bonsai-tab-title-icon--"):
            return token.replace("bonsai-tab-title-icon--", "")
    return str(cls)[:24]


def report(frames, chains, label):
    print("")
    print("=" * 72)
    print("RESULT%s  frames=%d" % ((" [" + label + "]") if label else "", len(frames)))
    print("=" * 72)
    if not frames:
        print("no frames recorded - the sampler never ran")
        return

    changed = []
    prev = frames[0]
    for cur in frames[1:]:
        if frame_key(prev) != frame_key(cur):
            changed.append((prev, cur))
        prev = cur

    print("\n-- frame 0 (resting state) --")
    print("  active tab   : %s" % frames[0].get("at"))
    print("  reserve/body : %s / %s" % (frames[0].get("reserve"), frames[0].get("bodyH")))
    print("  scope classes: strip-stable=%s height-locked=%s" % (frames[0].get("stable"), frames[0].get("locked")))
    print("  scroll node  : id=%s top=%s scrollH=%s clientH=%s"
          % (frames[0].get("scId"), frames[0].get("scTop"), frames[0].get("scH"), frames[0].get("scC")))
    for g in frames[0].get("g", []):
        print("  %-12s x=%-8s y=%-8s w=%-6s h=%-6s color=%-22s focus=%s"
              % (short_glyph(g.get("k", "?")), g.get("x"), g.get("y"), g.get("w"), g.get("h"),
                 g.get("c"), g.get("f") or "-"))

    print("\n-- changed frames: %d --" % len(changed))
    for prev_f, cur_f in changed:
        print("\n[%sms -> %sms]" % (prev_f.get("ms"), cur_f.get("ms")))
        for line in describe_delta(prev_f, cur_f):
            print(line)

    # Verdicts, phrased as the fix-track triggers in the plan so the answer is unambiguous.
    moved = colour = focus_churn = transform = vis_churn = False
    tab_changed = reserve_changed = node_changed = False
    count_churn = leaf_churn = strip_moved = strip_replaced = strip_vis = root_resized = False
    first = frames[0]
    for cur in frames[1:]:
        for a, b in zip(first.get("g", []), cur.get("g", [])):
            if (a.get("x"), a.get("y"), a.get("w"), a.get("h")) != (b.get("x"), b.get("y"), b.get("w"), b.get("h")):
                moved = True
            if a.get("c") != b.get("c") or a.get("fl") != b.get("fl") or a.get("o") != b.get("o"):
                colour = True
            if a.get("f") != b.get("f"):
                focus_churn = True
            if a.get("t") != b.get("t"):
                transform = True
            if a.get("v") != b.get("v"):
                vis_churn = True
        if cur.get("at") != first.get("at"):
            tab_changed = True
        if cur.get("reserve") != first.get("reserve") or cur.get("bodyH") != first.get("bodyH"):
            reserve_changed = True
        if cur.get("scId") != first.get("scId"):
            node_changed = True
        if cur.get("nGlyph") != first.get("nGlyph") or cur.get("nLeaf") != first.get("nLeaf"):
            count_churn = True
        if cur.get("leaves") != first.get("leaves"):
            leaf_churn = True
        if cur.get("strip") != first.get("strip"):
            strip_moved = True
        if cur.get("stripId") != first.get("stripId"):
            strip_replaced = True
        if cur.get("stripVis") != first.get("stripVis"):
            strip_vis = True
        if cur.get("rootWH") != first.get("rootWH"):
            root_resized = True

    def mark(v):
        return "YES" if v else "no "

    print("\n-- verdicts --")
    print("  tab actually changed (data-bonsai-active-tab) : %s   <- 'no' means this was a NO-OP press" % mark(tab_changed))
    print("  T1  glyph colour/filter/opacity changed       : %s" % mark(colour))
    print("  T2  glyph rect moved                          : %s" % mark(moved))
    print("  T2  ancestor transform changed (carousel)     : %s" % mark(transform))
    print("  T3  strip reserve / body height changed       : %s" % mark(reserve_changed))
    print("  T4  TabContentsScroll node replaced           : %s" % mark(node_changed))
    print("      Steam focus-class churn (gpfocus*)        : %s" % mark(focus_churn))
    print("\n-- flicker-specific (bar blinking, not sliding) --")
    print("  glyph/chip COUNT changed (unmount+remount)    : %s" % mark(count_churn))
    print("  chip rect/opacity/bg/shadow changed           : %s" % mark(leaf_churn))
    print("  ancestor opacity/visibility/display/0-size    : %s" % mark(vis_churn or strip_vis))
    print("  strip ROW rect changed                        : %s" % mark(strip_moved))
    print("  strip ROW node replaced                       : %s" % mark(strip_replaced))
    print("  tabs root resized                             : %s" % mark(root_resized))

    if chains and chains.get("first"):
        print("\n-- ancestor chain, first frame (reference; compare with probe_deck_tab_strip.py) --")
        for entry in chains["first"]:
            print("\n  --- %s" % entry.get("icon"))
            for c in entry.get("chain", []):
                print("      %s" % c[:150])
        if chains.get("last") and chains["last"] != chains["first"]:
            print("\n-- ancestor chain CHANGED by the last frame --")
            for entry in chains["last"]:
                print("\n  --- %s" % entry.get("icon"))
                for c in entry.get("chain", []):
                    print("      %s" % c[:150])
        else:
            print("\n  (ancestor chain identical in the last frame)")


def connect_qa():
    targets = json.loads(urllib.request.urlopen("http://127.0.0.1:8080/json/list", timeout=10).read())
    qa = [t for t in targets if "QuickAccess" in (t.get("title", "") + t.get("url", ""))]
    print("targets:", [t.get("title") for t in targets])
    if not qa:
        raise SystemExit("no QuickAccess target - is the QAM open?")
    return ws_connect(qa[0]["webSocketDebuggerUrl"])


def main():
    seconds = 5.0
    label = ""
    mode = "auto"  # auto | arm | read
    argv = sys.argv[1:]
    i = 0
    while i < len(argv):
        if argv[i] == "--seconds" and i + 1 < len(argv):
            seconds = float(argv[i + 1]); i += 2
        elif argv[i] == "--label" and i + 1 < len(argv):
            label = argv[i + 1]; i += 2
        elif argv[i] == "--arm-only":
            mode = "arm"; i += 1
        elif argv[i] == "--read-only":
            mode = "read"; i += 1
        else:
            raise SystemExit("usage: probe_deck_tab_switch.py [--seconds N] [--label NAME] [--arm-only | --read-only]")

    # Two-phase mode avoids a blind sleep: --arm-only evaluates the installer and returns
    # immediately (the page's own rAF loop keeps sampling after this SSH connection closes,
    # since it is not tied to the CDP socket). A separate --read-only connection later pulls
    # window.__bonsaiTabProbe back. This replaces guessing a sleep window that has to cover an
    # unknown human reaction time end-to-end over a chat round trip.
    if mode == "read":
        sock = connect_qa()
        data = evaluate(sock, 2, READ_JS)
        if not data.get("done"):
            print("(sampler still running / had not hit its deadline - reading what's buffered so far)")
        report(data.get("frames", []), data.get("chains"), label)
        return

    sock = connect_qa()
    armed = evaluate(sock, 1, ARM_JS.replace("__SECONDS__", repr(seconds)))
    if not armed.get("ok"):
        raise SystemExit("ARM FAILED: %s" % armed.get("why"))

    print("")
    print("*" * 72)
    print("ARMED - sampling for %.1fs across %d glyphs." % (seconds, armed.get("glyphs", 0)))
    print("PRESS THE SHOULDER BUTTON NOW (once), then keep your hands off the trackpad.")
    print("*" * 72)

    if mode == "arm":
        return

    # Sampling runs on the page's rAF clock; give it the full window plus slack for the
    # round-trip before reading the buffer back.
    time.sleep(seconds + 1.0)

    data = evaluate(sock, 2, READ_JS)
    if not data.get("done"):
        print("WARNING: sampler had not finished - the QAM may have lost focus or rAF was throttled")
    report(data.get("frames", []), data.get("chains"), label)


if __name__ == "__main__":
    main()
