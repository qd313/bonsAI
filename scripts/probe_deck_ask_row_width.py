#!/usr/bin/env python3
"""Title: Deck Ask-row width probe

Purpose: Dump the real geometry, computed style, and CSS vars behind the unified input host and
         the Ask bar so the roadmap bug "Unified input + Ask bar no longer span QAM width" can be
         fixed from measurement instead of another on-device guess.
Used for: docs/roadmap.md § Bugs "Unified input + Ask bar no longer span QAM width" — regression
          window 40f396f. Also the prerequisite named in docs/major-redesign.md P-0b.
Solves: Both rows are sized by a JS measurement loop (useUnifiedInputSurface.ts), not by CSS
        alone — the host's real width is read with getBoundingClientRect() and written into
        three CSS vars (--bonsai-search-host-width, --bonsai-askbar-outer-width,
        --bonsai-ask-margin-left) that section-4.ts then consumes. A screenshot cannot show
        which of the three is wrong, or whether the vars have simply gone stale. This probe reads
        every node and var in that chain in one shot and prints an explicit verdict per
        suspected cause (V1-V5) instead of raw numbers the reader has to interpret.
Does not: Change anything the page renders — read-only getBoundingClientRect() / getComputedStyle
          calls. Does not press any button; --watch (below) asks a human to trigger a re-layout
          (tab switch, avatar toggle) and only reports frames where a rect or var actually moved.

Run with the plugin open on the Deck, Main tab active:

    ssh deck@<ip> 'python3 -' < scripts/probe_deck_ask_row_width.py

Repeat with the AI character avatar on and off — the maintainer's report is that both rows are
inset from the QAM edges either way, which is why this probe treats the measurement loop as the
primary suspect rather than the avatar-row CSS from 40f396f.

To catch a measurement that only goes stale after a tab switch or the preset carousel settling,
use the watch form (mirrors probe_deck_tab_switch.py's two-phase arm/read design so this SSH
connection does not have to stay open across an unknown human reaction time):

    ssh deck@<ip> 'python3 - --watch 6' < scripts/probe_deck_ask_row_width.py
    # switch tabs away and back, or toggle the AI character, when told to
    ssh deck@<ip> 'python3 - --watch 6 --read-only' < scripts/probe_deck_ask_row_width.py

Runs ON the Deck against 127.0.0.1:8080, so no SSH tunnel is needed. Pure stdlib — the RFC6455
handshake and framing are lifted verbatim from probe_deck_tab_switch.py; that is also why this
file does not touch DOM node identity via attributes (a WeakMap on window instead), and why the
injected JS avoids optional chaining — the Deck's CEF is old enough that it is not worth finding
out where the line is.

Why CDP and not a `bonsaiDebugLog` from plugin code: plugin JS runs in SharedJSContext, whose
`document` contains none of our markup (docs/audit/decky-realms.md). Evaluating against the
QuickAccess target puts this JS in the document that actually holds the Ask row.
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
# Injected JS. Single-shot SAMPLE_JS covers the default run; WATCH_ARM_JS / WATCH_READ_JS cover
# --watch, using the same per-frame rAF loop shape as probe_deck_tab_switch.py.
# ---------------------------------------------------------------------------

# Shared helper bodies are duplicated into each JS string on purpose: each Runtime.evaluate call
# is its own closure, and CDP has no module system to import a helper across calls.
HELPERS_JS = r"""
  var r2 = function (v) { return Math.round(v * 100) / 100; };
  var classesOf = function (n) {
    if (!n) return '';
    var c = typeof n.className === 'string' ? n.className : (n.className && n.className.baseVal) || '';
    return c.trim();
  };
  var rectOf = function (el) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return { x: r2(r.x), right: r2(r.right), width: r2(r.width), height: r2(r.height) };
  };
  var offsetParentOf = function (el) {
    if (!el || !el.offsetParent) return null;
    var p = el.offsetParent;
    return p.tagName.toLowerCase() + (classesOf(p) ? '.' + classesOf(p).split(/\s+/).join('.') : '');
  };
  var styleOf = function (el) {
    if (!el) return null;
    var cs = getComputedStyle(el);
    return {
      width: cs.width, minWidth: cs.minWidth, maxWidth: cs.maxWidth,
      marginLeft: cs.marginLeft, marginRight: cs.marginRight,
      paddingLeft: cs.paddingLeft, paddingRight: cs.paddingRight,
      boxSizing: cs.boxSizing, transform: cs.transform,
    };
  };
  var describeNode = function (el) {
    if (!el) return null;
    return {
      tag: el.tagName.toLowerCase(),
      cls: classesOf(el),
      rect: rectOf(el),
      clientWidth: el.clientWidth,
      style: styleOf(el),
      offsetParent: offsetParentOf(el),
    };
  };
  var ancestorChain = function (el, maxLevels) {
    var out = [];
    var n = el ? el.parentElement : null;
    var depth = 0;
    while (n && depth < maxLevels) {
      out.push(describeNode(n));
      n = n.parentElement;
      depth++;
    }
    return out;
  };
  var anyAncestorTransformed = function (el, stopEl) {
    var n = el ? el.parentElement : null;
    var hits = [];
    while (n) {
      var tf = getComputedStyle(n).transform;
      if (tf && tf !== 'none') hits.push(classesOf(n).split(/\s+/)[0] || n.tagName.toLowerCase());
      if (n === stopEl) break;
      n = n.parentElement;
    }
    return hits;
  };

  // Everything from .bonsai-scope outward to <body>. The rows can only be as wide as the
  // narrowest ancestor allows, and bonsAI's own CSS reaches no further than .decky-qam-scope —
  // so if whitespace survives our resets, the ancestor that adds it is named here.
  var outerChain = function (scopeEl) {
    var out = [];
    var n = scopeEl;
    var depth = 0;
    while (n && n.tagName && n.tagName.toLowerCase() !== 'html' && depth < 14) {
      var cs = getComputedStyle(n);
      var r = n.getBoundingClientRect();
      out.push({
        depth: depth,
        tag: n.tagName.toLowerCase(),
        cls: classesOf(n),
        x: r2(r.x), right: r2(r.right), width: r2(r.width),
        padLeft: cs.paddingLeft, padRight: cs.paddingRight,
        marLeft: cs.marginLeft, marRight: cs.marginRight,
        bordLeft: cs.borderLeftWidth, bordRight: cs.borderRightWidth,
        boxSizing: cs.boxSizing,
      });
      n = n.parentElement;
      depth++;
    }
    return out;
  };

  var sample = function () {
    var qamScope = document.querySelector('.decky-qam-scope');
    var scope = document.querySelector('.bonsai-scope');
    var tabScroll = scope ? scope.querySelector('[class*="TabContentsScroll"]') : null;
    var mainPanel = document.querySelector('[data-bonsai-tab-panel="main"]');
    var unifiedHost = document.querySelector('.bonsai-unified-input-host');
    var textRow = document.querySelector('.bonsai-unified-input-text-row');
    var textBox = document.querySelector('.bonsai-unified-input-text-box');
    var field = unifiedHost ? unifiedHost.querySelector('textarea, input') : null;
    // The big Ask row (.bonsai-ask-bleed-wrap / .bonsai-askbar-merged) was deleted in plan 84; the
    // Ask button now is the small one in the question box's strip.
    var askPrimary = document.querySelector('.bonsai-ask-primary');

    var vars = {};
    if (scope) {
      var scs = getComputedStyle(scope);
      vars.searchHostWidth = scs.getPropertyValue('--bonsai-search-host-width').trim();
      vars.askbarOuterWidth = scs.getPropertyValue('--bonsai-askbar-outer-width').trim();
      vars.askMarginLeft = scs.getPropertyValue('--bonsai-ask-margin-left').trim();
    }
    if (unifiedHost) {
      vars.unifiedFieldWidth = getComputedStyle(unifiedHost).getPropertyValue('--bonsai-unified-field-width').trim();
    }

    return {
      qamScope: describeNode(qamScope),
      scope: describeNode(scope),
      tabScroll: describeNode(tabScroll),
      mainPanel: describeNode(mainPanel),
      unifiedHost: describeNode(unifiedHost),
      unifiedHostAncestors: ancestorChain(unifiedHost, 3),
      avatarOn: !!(textRow && textBox),
      textRow: describeNode(textRow),
      textBox: describeNode(textBox),
      field: describeNode(field),
      askPrimary: describeNode(askPrimary),
      askPrimaryAncestors: ancestorChain(askPrimary, 3),
      vars: vars,
      transformedAncestors: anyAncestorTransformed(unifiedHost, scope),
      outerChain: outerChain(scope),
    };
  };
"""

SAMPLE_JS = (
    r"""
(() => {
"""
    + HELPERS_JS
    + r"""
  var unifiedHost = document.querySelector('.bonsai-unified-input-host');
  if (!unifiedHost) return JSON.stringify({ ok: false, why: 'no .bonsai-unified-input-host - is Main the open QAM tab?' });
  return JSON.stringify({ ok: true, sample: sample() });
})()
"""
)

WATCH_ARM_JS = (
    r"""
(() => {
  var SECONDS = __SECONDS__;
"""
    + HELPERS_JS
    + r"""
  var unifiedHost = document.querySelector('.bonsai-unified-input-host');
  if (!unifiedHost) return JSON.stringify({ ok: false, why: 'no .bonsai-unified-input-host - is Main the open QAM tab?' });

  var canon = function (s) {
    // Drop the ancestor chains and offsetParent labels from the change-detection key: they are
    // useful in the report but noisy frame to frame (Decky churns focus classes constantly).
    return JSON.stringify({
      uh: s.unifiedHost, ab: s.askPrimary, f: s.field, v: s.vars, av: s.avatarOn,
    });
  };

  window.__bonsaiAskWidthProbe = [];
  var t0 = performance.now();
  var deadline = t0 + SECONDS * 1000;
  var lastKey = null;

  var tick = function () {
    var now = performance.now();
    var s = sample();
    var key = canon(s);
    if (key !== lastKey) {
      s.ms = Math.round(now - t0);
      window.__bonsaiAskWidthProbe.push(s);
      lastKey = key;
    }
    if (now < deadline) requestAnimationFrame(tick);
    else window.__bonsaiAskWidthProbeDone = true;
  };
  window.__bonsaiAskWidthProbeDone = false;
  requestAnimationFrame(tick);

  return JSON.stringify({ ok: true });
})()
"""
)

WATCH_READ_JS = r"""
JSON.stringify({
  done: !!window.__bonsaiAskWidthProbeDone,
  frames: window.__bonsaiAskWidthProbe || [],
})
"""


# ---------------------------------------------------------------------------
# Transport (from probe_deck_tab_switch.py — unchanged)
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
    print("targets:", [t.get("title") for t in targets])
    if not qa:
        raise SystemExit("no QuickAccess target - is the QAM open?")
    return ws_connect(qa[0]["webSocketDebuggerUrl"])


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

TOL_PX = 1.5  # sub-pixel rounding noise on Deck's display scale; anything past this is real


def _w(node):
    return node["rect"]["width"] if node and node.get("rect") else None


def print_node(label, node, indent="  "):
    if not node:
        print("%s%-14s (not found)" % (indent, label))
        return
    r = node["rect"]
    st = node["style"]
    print(
        "%s%-14s <%s class=\"%s\">\n%s    rect x=%s right=%s w=%s h=%s  clientWidth=%s  offsetParent=%s\n"
        "%s    css width=%s min-width=%s max-width=%s margin=%s/%s padding=%s/%s box-sizing=%s transform=%s"
        % (
            indent, label, node["tag"], node["cls"],
            indent, r["x"], r["right"], r["width"], r["height"], node["clientWidth"], node["offsetParent"],
            indent, st["width"], st["minWidth"], st["maxWidth"], st["marginLeft"], st["marginRight"],
            st["paddingLeft"], st["paddingRight"], st["boxSizing"], st["transform"],
        )
    )


def print_chain(label, chain, indent="  "):
    if not chain:
        print("%s%s: (none)" % (indent, label))
        return
    print("%s%s (host -> outward):" % (indent, label))
    for i, node in enumerate(chain):
        if not node:
            continue
        r = node["rect"]
        print(
            "%s  [%d] <%s class=\"%s\"> x=%s right=%s w=%s css-width=%s"
            % (indent, i, node["tag"], node["cls"], r["x"], r["right"], r["width"], node["style"]["width"])
        )


def _px(value):
    """'12px' -> 12.0; anything non-numeric (auto, %, '') -> 0.0."""
    try:
        return float(str(value).replace("px", "").strip())
    except (TypeError, ValueError):
        return 0.0


def inset_contributors(chain):
    """Ancestors at or above .bonsai-scope that eat horizontal room, widest first.

    This is the question the roadmap bug actually turns on once bonsAI's own insets are zero:
    the rows cannot be wider than their narrowest ancestor, and our CSS stops at
    .decky-qam-scope. Anything listed above that is Steam's and needs a named selector.
    """
    hits = []
    for node in chain or []:
        eaten = (
            _px(node.get("padLeft")) + _px(node.get("padRight"))
            + max(0.0, _px(node.get("marLeft"))) + max(0.0, _px(node.get("marRight")))
            + _px(node.get("bordLeft")) + _px(node.get("bordRight"))
        )
        if eaten > 0.5:
            hits.append((eaten, node))
    hits.sort(key=lambda h: -h[0])
    return hits


def verdicts(s):
    out = []

    reference = s.get("tabScroll") or s.get("scope") or s.get("qamScope")
    uh = s.get("unifiedHost")
    ab = s.get("askPrimary")

    # V0 — the "too much whitespace at the QAM edges" question, answered by name.
    chain = s.get("outerChain") or []
    contributors = inset_contributors(chain)
    if chain:
        outermost = chain[-1]
        scope_node = chain[0]
        left_gap = round(scope_node["x"] - outermost["x"], 2)
        right_gap = round(outermost["right"] - scope_node["right"], 2)
        detail = "scope vs outermost ancestor: left_gap=%spx right_gap=%spx" % (left_gap, right_gap)
        if contributors:
            detail += "; eats room: " + ", ".join(
                "%s(%s) %.1fpx" % (n["tag"], (n["cls"].split() or ["-"])[0], eaten)
                for eaten, n in contributors[:4]
            )
        out.append(("V0", abs(left_gap) > TOL_PX or abs(right_gap) > TOL_PX, detail))
    else:
        out.append(("V0", None, "ancestor chain above .bonsai-scope not captured"))

    # V1
    if reference and uh:
        left_gap = round(uh["rect"]["x"] - reference["rect"]["x"], 2)
        right_gap = round(reference["rect"]["right"] - uh["rect"]["right"], 2)
        inset = abs(left_gap) > TOL_PX or abs(right_gap) > TOL_PX
        out.append((
            "V1", inset,
            "unified-input-host vs tab scroll column: left_gap=%spx right_gap=%spx (>%.1fpx = inset)"
            % (left_gap, right_gap, TOL_PX),
        ))
    else:
        out.append(("V1", None, "unified-input-host or reference column not found"))

    # V2
    vars_ = s.get("vars", {})
    outer_var = vars_.get("askbarOuterWidth", "")
    if uh and outer_var:
        try:
            outer_px = float(outer_var.replace("px", "").strip())
            stale = abs(outer_px - uh["rect"]["width"]) > TOL_PX + 1.5  # + the deliberate -1px tuning constant
            out.append((
                "V2", stale,
                "--bonsai-askbar-outer-width=%s vs live host width=%spx (expected host width - 1px)"
                % (outer_var, uh["rect"]["width"]),
            ))
        except ValueError:
            out.append(("V2", None, "--bonsai-askbar-outer-width not parseable: %r" % outer_var))
    else:
        out.append(("V2", None, "--bonsai-askbar-outer-width or host missing"))

    # V3
    if uh and ab:
        # Plan 84: the Ask button is the small one in the box's strip, so the old "left edges line
        # up" test no longer means anything. It must sit inside the host, not poke out of its sides.
        left_out = round(uh["rect"]["x"] - ab["rect"]["x"], 2)
        right_out = round(ab["rect"]["right"] - uh["rect"]["right"], 2)
        out.append((
            "V3", left_out > TOL_PX or right_out > TOL_PX,
            "small Ask (.bonsai-ask-primary) outside the host: left=%spx right=%spx (>%.1fpx = pokes out)"
            % (left_out, right_out, TOL_PX),
        ))
    else:
        out.append(("V3", None, "small Ask (.bonsai-ask-primary) or host missing"))

    # V4 — avatar-off only
    field = s.get("field")
    if s.get("avatarOn"):
        out.append(("V4", None, "skipped — AI character avatar is on this sample"))
    elif uh and field:
        expected_min = uh["rect"]["width"] - 16 - TOL_PX  # 8px left + 8px right inset
        narrow = field["rect"]["width"] < expected_min
        out.append((
            "V4", narrow,
            "textarea width=%spx vs host width=%spx (expect >= host-16px with avatar off)"
            % (field["rect"]["width"], uh["rect"]["width"]),
        ))
    else:
        out.append(("V4", None, "textarea/input or host not found"))

    # V5
    transformed = s.get("transformedAncestors") or []
    out.append((
        "V5", bool(transformed),
        "ancestors with a non-none transform between host and scope: %s" % (transformed or "(none)"),
    ))

    return out


def print_verdicts(s):
    print("\n-- verdicts --")
    for vid, fired, detail in verdicts(s):
        mark = "?  " if fired is None else ("YES" if fired else "no ")
        print("  %s %s  %s" % (vid, mark, detail))


def print_outer_chain(chain):
    if not chain:
        print("  (ancestor chain above .bonsai-scope not captured)")
        return
    print("\n-- ancestors at/above .bonsai-scope (scope -> body) --")
    print("  %-3s %-46s %8s %8s %8s  %-16s %-16s" % ("d", "node", "x", "right", "width", "padding L/R", "margin L/R"))
    for node in chain:
        label = node["tag"] + ("." + (node["cls"].split() or ["-"])[0] if node["cls"] else "")
        print(
            "  %-3s %-46s %8s %8s %8s  %-16s %-16s"
            % (
                node["depth"], label[:46], node["x"], node["right"], node["width"],
                "%s / %s" % (node["padLeft"], node["padRight"]),
                "%s / %s" % (node["marLeft"], node["marRight"]),
            )
        )
    contributors = inset_contributors(chain)
    if contributors:
        print("\n  room eaten by ancestor (padding + positive margin + border), widest first:")
        for eaten, node in contributors:
            label = node["tag"] + ("." + (node["cls"].split() or ["-"])[0] if node["cls"] else "")
            reach = "bonsAI CAN target" if node["depth"] <= 1 else "Steam/Decky - needs a named selector"
            print("    %-46s %6.1fpx   (%s)" % (label[:46], eaten, reach))


def report_sample(s):
    print("\n-- QAM / scope chain --")
    print_node("qamScope", s.get("qamScope"))
    print_node("scope", s.get("scope"))
    print_node("tabScroll", s.get("tabScroll"))
    print_node("mainPanel", s.get("mainPanel"))
    print_outer_chain(s.get("outerChain"))

    print("\n-- unified input host --")
    print_node("unifiedHost", s.get("unifiedHost"))
    print_chain("ancestors", s.get("unifiedHostAncestors"))
    print("  avatarOn: %s" % s.get("avatarOn"))
    if s.get("avatarOn"):
        print_node("textRow", s.get("textRow"))
        print_node("textBox", s.get("textBox"))
    print_node("field", s.get("field"))

    print("\n-- Ask bar --")
    print_node("askPrimary", s.get("askPrimary"))
    print_chain("ancestors", s.get("askPrimaryAncestors"))

    print("\n-- CSS vars (read off .bonsai-scope) --")
    for k, v in sorted(s.get("vars", {}).items()):
        print("  %-18s %r" % (k, v))

    print_verdicts(s)


def main():
    watch_seconds = None
    label = ""
    mode = "auto"  # auto | arm | read
    argv = sys.argv[1:]
    i = 0
    while i < len(argv):
        if argv[i] == "--watch" and i + 1 < len(argv):
            watch_seconds = float(argv[i + 1]); i += 2
        elif argv[i] == "--label" and i + 1 < len(argv):
            label = argv[i + 1]; i += 2
        elif argv[i] == "--arm-only":
            mode = "arm"; i += 1
        elif argv[i] == "--read-only":
            mode = "read"; i += 1
        else:
            raise SystemExit(
                "usage: probe_deck_ask_row_width.py [--watch SECONDS] [--label NAME] "
                "[--arm-only | --read-only]"
            )

    if watch_seconds is None and mode != "read":
        sock = connect_qa()
        result = evaluate(sock, 1, SAMPLE_JS)
        if not result.get("ok"):
            raise SystemExit("SAMPLE FAILED: %s" % result.get("why"))
        print("\n" + "=" * 72)
        print("RESULT%s (single sample)" % ((" [" + label + "]") if label else ""))
        print("=" * 72)
        report_sample(result["sample"])
        return

    # --watch: same two-phase arm/read shape as probe_deck_tab_switch.py, so a slow human action
    # (switch tabs, toggle the avatar) is not raced against a fixed sleep chosen in advance.
    if mode == "read":
        sock = connect_qa()
        data = evaluate(sock, 2, WATCH_READ_JS)
        if not data.get("done"):
            print("(sampler still running / had not hit its deadline - reading what's buffered so far)")
        frames = data.get("frames", [])
        print("\n" + "=" * 72)
        print("RESULT%s  changed-frames=%d" % ((" [" + label + "]") if label else "", len(frames)))
        print("=" * 72)
        if not frames:
            print("no geometry change recorded across the watch window")
            return
        for f in frames:
            print("\n[t=%sms]" % f.get("ms"))
            report_sample(f)
        return

    sock = connect_qa()
    armed = evaluate(sock, 1, WATCH_ARM_JS.replace("__SECONDS__", repr(watch_seconds)))
    if not armed.get("ok"):
        raise SystemExit("ARM FAILED: %s" % armed.get("why"))

    print("")
    print("*" * 72)
    print("ARMED - watching Ask-row geometry for %.1fs." % watch_seconds)
    print("Switch tabs away and back, or toggle the AI character, NOW.")
    print("*" * 72)

    if mode == "arm":
        return

    time.sleep(watch_seconds + 1.0)
    data = evaluate(sock, 2, WATCH_READ_JS)
    if not data.get("done"):
        print("WARNING: sampler had not finished - the QAM may have lost focus or rAF was throttled")
    frames = data.get("frames", [])
    print("\n" + "=" * 72)
    print("RESULT%s  changed-frames=%d" % ((" [" + label + "]") if label else "", len(frames)))
    print("=" * 72)
    if not frames:
        print("no geometry change recorded across the watch window")
        return
    for f in frames:
        print("\n[t=%sms]" % f.get("ms"))
        report_sample(f)


if __name__ == "__main__":
    main()
