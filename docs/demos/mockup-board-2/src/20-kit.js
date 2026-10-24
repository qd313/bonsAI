/* ============================================================
   Kit: icons and builders for the Deck's Quick Access panel
   Sizes measured on the Deck's own 1280 by 800 screen:
   panel 300 wide by 454 tall; Steam's header 64; tab bar 20 + 4;
   chat row about 44 + 12 gap; dock about 165; chat gets about 145.
   ============================================================ */
const PANEL = { w: 300, h: 454 };
const TABS = [];
const ICONS = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12H5M11 5l-7 7 7 7"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11v9H4v-9h3zm0 0 4-8a2 2 0 0 1 2.6 1.6L13 9h5.5a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.3 20H7"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 13V4H4v9h3zm0 0 4 8a2 2 0 0 0 2.6-1.6L13 15h5.5a2 2 0 0 0 2-2.3l-1.2-7A2 2 0 0 0 17.3 4H7"/></svg>',
  retry: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5"/></svg>',
  clip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 11.5 12.5 20a5 5 0 0 1-7-7L14 4.5a3.5 3.5 0 0 1 5 5L10.5 18a2 2 0 0 1-3-3l7.5-7.5"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  speaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4zM16 9a4 4 0 0 1 0 6"/></svg>',
  filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h18l-7 8v6l-4 2v-8L3 5z"/></svg>',
  sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17 19 7"/></svg>',
  cross: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  wrench: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 8-8-1.3-1.3a4 4 0 0 0-5-5l3 3-2 2-3-3z"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></svg>',
  note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h14v12l-4 4H5z"/><path d="M15 20v-4h4M8 9h8M8 13h5"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h6l-1 6 3 3H7l3-3-1-6zM12 13v8"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  chevD: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  chevR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>',
  light: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" fill="currentColor"/></svg>',
};
const ico = (name, cls = "") => h("span", { class: "ico " + cls, html: ICONS[name] || "" });

/* The rows above the chat */
function tabStrip(cur = "MAIN") {
  return h("div", { class: "tabbar-q" }, "LB",
    h("span", { class: "bars" }, ...[0, 1, 2, 3, 4, 5].map((i) => h("i", { class: i === 0 ? "on" : "" }))),
    h("span", { class: "cur" }, cur), h("span", { class: "rb" }, "RB"));
}
function chatRow(name = "How do I beat the boss in Hollow Knight", { stop = false } = {}) {
  return h("div", { class: "chatrow" },
    h("div", { class: "names" }, h("span", { class: "side" }, "…hat i"),
      h("span", { class: "main", "data-stop": stop ? "" : null }, name), h("span", { class: "side" }, "wheat…")),
    h("div", { class: "dots" }, h("span", { class: "plus" }, "+"), ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => h("i", { class: i === 2 ? "on" : "" }))));
}

/* Chat pieces */
function qBubble(text, { stop = true } = {}) {
  return h("div", { class: "qb", "data-stop": stop ? "" : null }, text, h("span", { class: "retry", html: ICONS.retry }));
}
function reasonLine(sec = 18) { return h("button", { class: "reasonline", "data-stop": "" }, `Show reasoning · ${sec} s`); }
function aBubble(paras, { stopEach = true, cls = "" } = {}) {
  const ab = h("div", { class: "ab " + cls });
  for (const p of paras) {
    const el = typeof p === "string" ? h("p", { class: "sec", html: p }) : p;
    if (stopEach && !el.hasAttribute("data-stop")) el.setAttribute("data-stop", "");
    ab.append(el);
  }
  return ab;
}
function rateRow() {
  return [
    h("div", { class: "helpful" }, "Was this helpful?"),
    h("div", { class: "rate" },
      h("button", { "data-stop": "", "data-row": "rate" }, h("span", { html: ICONS.up }), "Helpful"),
      h("button", { "data-stop": "", "data-row": "rate" }, h("span", { html: ICONS.down }), "Not really"),
      h("span", { class: "spk", html: ICONS.speaker })),
  ];
}
function detailsLine(label = "Show details ↓") { return h("button", { class: "detailsline", "data-stop": "" }, label); }

/* The dock under the chat */
function dock({ chips = ["Recommended controls", "What do I see in this screenshot"], placeholder = "Describe the level, boss, or puzzle you're stuck on.", typed = "", mode = "Strategy", context = "Context: no active game detected", chipStops = true } = {}) {
  const d = h("div", { class: "dock" });
  const chipEls = chips.map((c) => h("button", { class: "chip", "data-stop": chipStops ? "" : null, "data-row": "chips" }, c));
  const field = h("button", { class: "field" + (typed ? " typed" : ""), "data-stop": "", "data-start": "" }, typed || placeholder);
  d.append(
    h("div", { class: "chips" }, ...chipEls),
    h("div", { class: "qbox" }, field,
      h("div", { class: "tools" }, h("span", { html: ICONS.clip }),
        h("button", { class: "mode" + (mode === "Speed" ? " speed" : ""), "data-stop": "" }, mode), h("span", { html: ICONS.mic }))),
    h("div", { class: "askrow" }, h("button", { class: "askbtn", "data-stop": "" }, "ask")),
    h("div", { class: "ctxline" }, context));
  d.field = field;
  return d;
}

/* A whole Main tab: header + tab bar + chat row + transcript + dock = 454 */
function mainTab({ transcript, dockEl, chatName, height = PANEL.h, rowEl } = {}) {
  const body = h("div", { class: "maintab", style: "display:contents" });
  const sc = h("div", { class: "scroll" });
  for (const t of [].concat(transcript || [])) sc.append(t);
  body.append(tabStrip(), rowEl === undefined ? chatRow(chatName) : rowEl || "", sc, dockEl || dock());
  body.scroller = sc;
  return body;
}

/* A sample Hollow Knight turn, used across mock-ups */
const SAMPLE = {
  q: "what is a good first upgrade in Hollow Knight",
  a: [
    "Right then, listen up. When you're just starting out, you ain't looking for fancy gear yet, you're looking for that first real boost.",
    "You gotta head down to the <b>City of Tears</b> and hit the <b>Nailsmith</b>. That first upgrade, mate, it costs Geo alone.",
    "It's the first step to getting your Nail stronger, which means you can start bouncing off those enemies and spikes like a proper ninja.",
    "Don't mess about with the Pale Ore yet; save that for later when you're getting serious.",
  ],
};
function sampleTurn({ q = SAMPLE.q, a = SAMPLE.a, rating = true, details = true, reasoning = 18 } = {}) {
  const t = h("div", { class: "turn" }, qBubble(q));
  if (reasoning) t.append(reasonLine(reasoning));
  t.append(aBubble(a));
  if (rating) t.append(...rateRow());
  if (details) t.append(detailsLine());
  return t;
}

/* Small helpers for timed demos */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function toast(panel, text, ms = 2600) {
  const t = h("div", { class: "q-toast" }, text);
  panel.append(t);
  setTimeout(() => t.remove(), ms);
}
function hintBar(items) {
  return h("div", { class: "q-hint" }, ...items.map(([k, label]) => h("span", {}, h("b", { class: k.toLowerCase() }, k), label)));
}
