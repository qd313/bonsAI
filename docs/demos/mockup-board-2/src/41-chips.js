/* ============================================================
   Tab 1: make the Show details chips take less room.
   Today's look read from the plugin on 2026-10-11 (ContextChipLadder.tsx, section-6.ts,
   ChipExpandedBody.tsx): pills 10 px, padding 4 by 10, gap 6, 24.4 tall, two to a row at
   most in the 300 px column, so the usual eight take five rows (145.9 px).
   Drawn in Steam's own font, so each chip sizes to its text and the rows break where the
   real ones do.
   ============================================================ */
const CI = {
  book: svg2('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>'),
  stack: svg2('<path d="M12 4l8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4M4 16l8 4 8-4"/>'),
  bolt: svg2('<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>'),
  lines: svg2('<path d="M5 7h14M5 12h10M5 17h6"/>'),
  bulb: svg2('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z"/>'),
  eye: svg2('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>'),
  cpu: svg2('<rect x="6" y="6" width="12" height="12" rx="1.5"/><path d="M9.5 9.5h5v5h-5zM9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>'),
  bug: ICONS2.bug,
  log: svg2('<path d="M6 3h8l4 4v14H6z"/><path d="M9 11h6M9 15h6"/>'),
  redo: ICONS2.redo,
  cam: svg2('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  mask: svg2('<path d="M3 9c3-2 15-2 18 0-.5 5-3 8-5 8-1.5 0-2.5-2-4-2s-2.5 2-4 2c-2 0-4.5-3-5-8z"/><path d="M8 11h2M14 11h2"/>'),
};

/* Each chip: today's label and its measured width, a short label, an icon, its box */
const CHIPS = [
  { k: "proton", full: "Read Proton log tail", w: 123, short: "Proton log", ico: "log", rc: "Proton log", extra: true,
    title: "Proton / Steam logs", body: () => [ul("Last 40 lines of the Proton log read", "Path: <span class=c-path>~/.steam/steam/logs/…</span>")] },
  { k: "tries", full: "Inject 2 prior tries", w: 123, short: "2 earlier tries", ico: "redo", rc: "2 tries", extra: true,
    title: "Proton experiment journal", body: () => [ul("2 earlier fixes you tried were sent with the question", "Latest: PROTON_USE_WINED3D=1 · did not help")] },
  { k: "shot", full: "Attach 1 screenshot", w: 118, short: "1 screenshot", ico: "cam", rc: "1 screenshot", extra: true,
    title: "Screenshot attachment", body: () => [ul("1 screenshot sent, 1280 × 800, medium quality")] },
  { k: "kb", full: "Keyword + meaning", w: 108, short: "KB search", ico: "book", rc: "KB",
    title: "Local knowledge base", body: () => [h("div", { class: "c-src" }, h("b", {}, "hollowknight.wiki"), h("small", {}, " · CC-BY-SA-3.0 · as of 2026-09-05"),
      h("div", { class: "c-src-cards" }, h("span", {}, "Hollow Knight — Starting out"), h("span", {}, "Hollow Knight — Soul, Focus"), h("span", {}, "Hollow Knight — Leaving the town"))),
      ul("Retrieval: Keyword + meaning", "Trust tier: wiki_no_patch", "Embed: 743.85 ms", "Re-rank: 27.41 ms")] },
  { k: "cov", full: "KB: 14 sections", w: 92.9, short: "14 sections", ico: "stack", rc: "14 sections",
    title: "Knowledge base coverage", body: () => [ul("14 sections match Hollow Knight", "Library: hollowknight.wiki")] },
  { k: "tdp", full: "Read current TDP", w: 102.9, short: "TDP 12 W", ico: "bolt", rc: "12 W",
    title: "Power context", body: () => [ul("12 W cap read for this reply")] },
  { k: "style", full: "Reply style: balanced", w: 120.2, short: "Balanced", ico: "lines", rc: "balanced",
    title: "Reply verbosity", body: () => [ul("Reply style: balanced", "Set on the Ollama tab")] },
  { k: "think", full: "Thinking: Balanced · 16 s · ~445 tokens", w: 205.7, short: "Thought 16 s", ico: "bulb", rc: "thought 16 s",
    title: "Reasoning", body: () => [ul("Level: Balanced", "Thought for 16 s", "About 445 tokens"), h("p", { style: "margin:6px 0 0;color:#9fb7d5;font-size:10px" }, "The token count is an estimate — Ollama's own count does not separate thinking from the answer.")] },
  { k: "spoil", full: "Spoiler risk: high", w: 94.6, short: "Spoilers: high", ico: "eye", rc: "spoilers high", warn: true,
    title: "Spoiler likelihood estimate", body: () => [ul("Estimated band: high", "Ask mode: strategy", "Title profile: protect_progression", "Transparency only — does not change spoiler masking")] },
  { k: "model", full: "Routed gemma4:e2b-it-qat", w: 150, short: "gemma4:e2b", ico: "cpu", rc: "gemma4:e2b",
    title: "Model source policy", body: () => [ul("Model: gemma4:e2b-it-qat", "Picked by: Strategy mode's routing", "Licence: Gemma terms of use")] },
  { k: "spy", full: "Spy", w: 37, short: "Spy", ico: "mask", rc: "Spy", extra: true, warn: true,
    title: "The Spy was lying", body: () => [ul("This answer was the Spy's: one detail in it is made up on purpose.")] },
  { k: "dev", full: "Developer details", w: 102.1, short: "Developer", ico: "bug", rc: "⋯",
    title: "Full transparency snapshot", body: () => [h("pre", {}, '{\n  "mode": "strategy",\n  "model": "gemma4:e2b-it-qat",\n  "kb": {"hits": 14, "retrieval": "hybrid"},\n  "tdp_w": 12,\n  "think_s": 16.2,\n  "spoiler_band": "high"\n}')] },
];
function ul(...items) { return h("ul", {}, ...items.map((t) => h("li", { html: t }))); }

const C_Q = "How do I beat False Knight?";
const C_A = [
  "Stay close and hit him in the head once his armour drops. That is where the real damage goes.",
  "Jump over his mace swings, and step back when he leaps so the shock waves miss you.",
];

/* The answer and its rows, then whatever the option draws for the details */
function cTurn(detailsEl, { line = true } = {}) {
  const t = h("div", { class: "c-turn" }, qBubble2(C_Q, { stop: false }), aBubble2(C_A, { stopEach: false }),
    h("div", { class: "c-help" }, "Was this helpful?"),
    h("div", { class: "c-thumbs" },
      h("button", { "data-stop": "", "data-row": "thumbs" }, h("span", { html: ICONS.up }), "Helpful"),
      h("button", { "data-stop": "", "data-row": "thumbs" }, h("span", { html: ICONS.down }), "Not really")));
  if (line) t.append(h("button", { class: "c-line", "data-stop": "" }, h("span", {}, "Hide details ↑")));
  t.append(detailsEl);
  return t;
}

/* Linear Left/Right and nearest-across Up/Down over a wrapped group of stops */
function gridKeys(root, items, { linear = true } = {}) {
  root.addEventListener("deckkey", (e) => {
    const cur = e.detail.stop;
    const i = items.indexOf(cur);
    if (i < 0) return;
    const k = e.detail.key;
    const top = (el) => Math.round(el.getBoundingClientRect().top);
    if (k === "Left" || k === "Right") {
      if (!linear) return;
      const j = i + (k === "Right" ? 1 : -1);
      if (j < 0 || j >= items.length) return;
      e.preventDefault(); Deck.setRing(root, items[j]);
    } else if (k === "Up" || k === "Down") {
      const rowTops = [...new Set(items.map(top))].sort((a, b) => a - b);
      const r = rowTops.indexOf(top(cur)) + (k === "Down" ? 1 : -1);
      if (r < 0 || r >= rowTops.length) {
        // leave the grid: the stop before the first item, or after the last
        const all = Deck.stops(root);
        const edge = k === "Up" ? all[all.indexOf(items[0]) - 1] : all[all.indexOf(items[items.length - 1]) + 1];
        e.preventDefault();
        if (edge) Deck.setRing(root, edge);
        return;
      }
      const cx = cur.getBoundingClientRect().left + cur.getBoundingClientRect().width / 2;
      let best = null, bd = Infinity;
      for (const it of items.filter((x) => top(x) === rowTops[r])) {
        const b = it.getBoundingClientRect(); const d = Math.abs(b.left + b.width / 2 - cx);
        if (d < bd) { bd = d; best = it; }
      }
      e.preventDefault(); Deck.setRing(root, best);
    }
  });
}

/* The open box follows the ring, as it does today */
function followRing(root, items, open) {
  root.addEventListener("ringmove", (e) => { const i = items.indexOf(e.detail.el); if (i >= 0) open(i); });
}

function cBox(chip, { full = false } = {}) {
  // with short chip names, the box keeps the chip's full wording under its title
  return h("div", { class: "c-box" }, h("h6", {}, chip.title, full ? h("small", { class: "c-full" }, chip.full) : ""), ...chip.body());
}

/* The height readout under each panel: from the top of the details to the top of the open box */
const C_TODAY = {};
function cMeasure(holder, today, key) {
  const out = h("p", { class: "d-measure" });
  const measure = () => {
    const root = $(".qam", holder), a = $(".c-measure-from", holder), b = $(".c-box", holder);
    if (!root || !a || !b) return;
    const s = 454 / root.getBoundingClientRect().height;
    if (!isFinite(s) || !root.getBoundingClientRect().height) return;
    const px = Math.round((b.getBoundingClientRect().top - a.getBoundingClientRect().top) * s);
    const n = key();
    if (!today) { if (C_TODAY[n] !== px) { C_TODAY[n] = px; $$(".deck-swap").forEach((x) => x !== holder && x.dispatchEvent(new Event("cmeasure"))); } }
    const ref = C_TODAY[n];
    out.replaceChildren("Room the chips take, above the open box:", h("b", {}, px + " px"),
      today && ref ? h("span", { class: "vs" }, `today ${ref} px with the same chips, so ${Math.round((1 - px / ref) * 100)}% less`) : "");
  };
  new ResizeObserver(measure).observe(holder);
  holder.addEventListener("cmeasure", measure);
  return out;
}

/* One card: pick 8 or 12 chips above the panel, the panel, the readout under it */
function chipCard(draw, { today = null } = {}) {
  return () => {
    let all = false;
    const holder = h("div", { class: "deck-swap" });
    const pick = h("div", { class: "scen", role: "radiogroup", "aria-label": "How many chips" }, h("span", {}, "Chips:"),
      ...["The usual 8", "A busy answer: 12"].map((name, k) => {
        const b = h("button", { type: "button", role: "radio", "aria-checked": String(k === 0) }, name);
        b.addEventListener("click", () => { all = k === 1; $$("button", pick).forEach((x, j) => x.setAttribute("aria-checked", String(j === k))); paint(); });
        return b;
      }));
    const paint = () => {
      const chips = CHIPS.filter((c) => all || !c.extra);
      const root = draw(chips);
      holder.replaceChildren(root);
      holder.dataset.scrolled = "";
      setTimeout(() => holder.dispatchEvent(new Event("cscroll")));
    };
    // open scrolled so the details line (or the facts line) sits near the top of the chat; waits until the tab is on screen
    holder.addEventListener("cscroll", () => {
      const sc = $(".scroll", holder), top = $(".c-line, .c-receipt, .c-quiet", holder) || $(".k2-answer", holder);
      if (!holder.dataset.scrolled && sc && top && sc.clientHeight) {
        const z = sc.getBoundingClientRect().height / sc.clientHeight || 1;
        sc.scrollTop += (top.getBoundingClientRect().top - sc.getBoundingClientRect().top) / z - (top.matches(".c-receipt") ? 120 : 70);
        holder.dataset.scrolled = "1";
      }
      holder.dispatchEvent(new Event("cmeasure"));
    });
    paint();
    const readout = cMeasure(holder, today, () => (all ? 12 : 8));
    return [h("div", { class: "d-picks" }, pick), holder, readout];
  };
}

/* The panel around any details drawing */
function chipPanel(detailsEl, opts) {
  const holder = h("div", { style: "display:contents" });
  const root = deckFrame({ body: holder, header: false });
  holder.append(mainTab2({ chatName: "How do I beat False Knight", chatNo: 2, chatCount: 5,
    dockEl: dock2({ game: "Hollow Knight", chips: ["Charms for this fight", "Recommended controls"] }),
    transcript: [cTurn(detailsEl, opts)] }));
  return root;
}

/* Today and A share one drawing: tabs row, caption, wrapped pills, box */
function wrappedChips(chips, { short = false, cls = "", tabs = true, caption = true, sessChip = false, line = true, boxOnRing = false } = {}) {
  const det = h("div", { class: "c-det " + cls });
  const from = h("div", { class: "c-measure-from" });
  det.append(from);
  if (tabs) det.append(h("div", { class: "c-tabs", "data-stop": "" }, h("span", { class: "c-tab on" }, "This answer"), h("span", { class: "c-tab" }, "Session · 100")));
  const cap = h("div", { class: "c-cap" });
  if (caption) det.append(cap);
  const els = chips.map((c, i) => h("button", { class: "c-chip" + (short ? "" : " fixed"), "data-stop": "", title: c.full }, short ? c.short : c.full));
  if (sessChip) els.push(h("button", { class: "c-chip sess", "data-stop": "" }, "Session · 100"));
  const grid = h("div", { class: "c-grid" }, ...els);
  const boxSlot = h("div");
  det.append(grid, boxSlot);
  const open = (i) => {
    els.forEach((e, j) => e.classList.toggle("open", j === i));
    cap.textContent = `Chip ${Math.min(i + 1, chips.length)} of ${chips.length}`;
    if (i < chips.length) boxSlot.replaceChildren(cBox(chips[i], { full: short }));
    else boxSlot.replaceChildren(h("div", { class: "c-box c-sess" }, h("button", { class: "c-sum" }, "Sum up this chat"),
      h("div", { class: "c-trow on" }, "How do I beat False Knight?"), h("div", { class: "c-trow" }, "Where is the Mothwing Cloak?")));
  };
  open(0);
  els[0].setAttribute("data-start", "");
  const root = chipPanel(det, { line });
  gridKeys(root, els);
  followRing(root, els, (i) => { open(i); root.closest(".deck-swap")?.dispatchEvent(new Event("cmeasure")); });
  // no Show details line: the box shows only while the ring is on a chip
  if (boxOnRing) root.addEventListener("ringmove", (e) => { if (!els.includes(e.detail.el)) { els.forEach((x) => x.classList.remove("open")); boxSlot.replaceChildren(); } });
  return root;
}

/* B: one row that slides sideways */
function slideChips(chips) {
  const det = h("div", { class: "c-det" }, h("div", { class: "c-measure-from" }),
    h("div", { class: "c-tabs", "data-stop": "" }, h("span", { class: "c-tab on" }, "This answer"), h("span", { class: "c-tab" }, "Session · 100")));
  const cap = h("div", { class: "c-cap" });
  const dots = h("span", { class: "c-dots" }, ...chips.map(() => h("i")));
  const els = chips.map((c) => h("button", { class: "c-chip fixed", "data-stop": "", "data-row": "slide" }, c.full));
  const grid = h("div", { class: "c-grid" }, ...els);
  const slide = h("div", { class: "c-slide at-start" }, grid);
  const boxSlot = h("div");
  det.append(h("div", { class: "c-capline" }, cap, dots), slide, boxSlot);
  const edges = () => { slide.classList.toggle("at-start", grid.scrollLeft < 2); slide.classList.toggle("at-end", grid.scrollLeft + grid.clientWidth > grid.scrollWidth - 2); };
  grid.addEventListener("scroll", edges);
  const open = (i) => {
    els.forEach((e, j) => e.classList.toggle("open", j === i));
    $$("i", dots).forEach((d, j) => d.classList.toggle("on", j === i));
    cap.textContent = `Chip ${i + 1} of ${chips.length} · ← → for more`;
    boxSlot.replaceChildren(cBox(chips[i]));
    const el = els[i], gl = grid.getBoundingClientRect(), r = el.getBoundingClientRect();
    const z = gl.width / grid.clientWidth || 1;
    if (r.left < gl.left + 18 * z) grid.scrollBy({ left: (r.left - gl.left) / z - 18, behavior: "smooth" });
    else if (r.right > gl.right - 18 * z) grid.scrollBy({ left: (r.right - gl.right) / z + 18, behavior: "smooth" });
  };
  open(0);
  els[0].setAttribute("data-start", "");
  const root = chipPanel(det);
  followRing(root, els, (i) => { open(i); root.closest(".deck-swap")?.dispatchEvent(new Event("cmeasure")); });
  return root;
}

/* C: a row of icons; the ringed one's name shows under the row */
function iconChips(chips) {
  const det = h("div", { class: "c-det" }, h("div", { class: "c-measure-from" }),
    h("div", { class: "c-tabs", "data-stop": "" }, h("span", { class: "c-tab on" }, "This answer"), h("span", { class: "c-tab" }, "Session · 100")));
  const row = h("div", { class: "c-icons", style: "margin-top:8px" });
  const els = [];
  for (const c of chips) {
    const b = h("button", { class: "c-ico" + (c.warn ? " warn" : ""), "data-stop": "", "data-row": "icons", "aria-label": c.full, html: CI[c.ico] });
    els.push(b); row.append(b);
  }
  if (chips.length > 10) row.style.gap = "3px";
  const name = h("div", { class: "c-iname" });
  const boxSlot = h("div");
  det.append(row, name, boxSlot);
  const open = (i) => {
    els.forEach((e, j) => e.classList.toggle("open", j === i));
    name.replaceChildren(h("b", {}, chips[i].full), `  ·  ${i + 1} of ${chips.length}`);
    boxSlot.replaceChildren(cBox(chips[i]));
  };
  open(0);
  els[0].setAttribute("data-start", "");
  const root = chipPanel(det);
  followRing(root, els, (i) => { open(i); root.closest(".deck-swap")?.dispatchEvent(new Event("cmeasure")); });
  return root;
}

/* Outside the box: no Show details line, one short line of facts under the answer */
function receiptChips(chips) {
  const det = h("div", { class: "c-det" });
  const line = h("div", { class: "c-receipt c-measure-from" });
  const els = [];
  chips.forEach((c, i) => {
    if (i) line.append(h("span", { class: "c-rdot" }, "·"));
    const b = h("button", { class: "c-rc" + (c.warn ? " warn" : ""), "data-stop": "", title: c.full }, c.rc);
    els.push(b); line.append(b);
  });
  const boxSlot = h("div");
  det.append(line, boxSlot);
  let shown = -1;
  const open = (i) => {
    shown = i;
    els.forEach((e, j) => e.classList.toggle("open", j === i));
    boxSlot.replaceChildren(i < 0 ? "" : cBox(chips[i]));
    if (i === chips.length - 1) boxSlot.firstChild.append(h("div", { class: "c-sess" }, h("button", { class: "c-sum" }, "Sum up this chat")));
  };
  open(0);
  els[0].setAttribute("data-start", "");
  const root = chipPanel(det, { line: false });
  gridKeys(root, els);
  followRing(root, els, (i) => { open(i); root.closest(".deck-swap")?.dispatchEvent(new Event("cmeasure")); });
  return root;
}

TABS.push({
  id: "t1", n: 1, name: "Show details chips", stars: 2,
  onShow: () => $$("#tab-t1 .deck-swap").forEach((x) => x.dispatchEvent(new Event("cscroll"))),
  title: "Make the Show details chips take less room",
  today: [
    "Under an answer, Show details opens a row of tabs, a \"Chip 1 of 8\" line, then the chips, then a box for the open chip.",
    "Most chips are too wide to fit three to a row, and one (Thinking) is too wide to share a row at all. So the usual eight take five rows, about 146 px, before the box even starts. On a busy answer there are twelve.",
    "The denser grid from 10 October passed. This is the next step: make the whole thing smaller.",
  ],
  deciding: [
    "Which way of shrinking reads best on the Deck. You can mix: for example A's short names inside D's layout.",
    "Whether the full chip name can move into the box's title (A, C, D and the outside-the-box idea all do this).",
  ],
  howto: "Click a panel, then use the arrow keys. The open box follows the ring, as it does today. Switch between 8 and 12 chips above each panel. The number under each panel is measured from the drawing: how tall everything above the open box is.",
  options: [
    { id: "today", label: "Today", today: true, title: "Five rows of full names", desc: "As it ships, in Steam's own font, so the rows break where the real ones do.", build: chipCard((c) => wrappedChips(c), { today: 0 }) },
    { id: "A", label: "A", title: "Smaller pills with short names", desc: "Slightly smaller text and padding, and each chip says only the fact: \"Thought 16 s\", \"Spoilers: high\", \"gemma4:e2b\". The full name becomes the box's title. Eight chips fit in two rows.", build: chipCard((c) => wrappedChips(c, { short: true, cls: "cA" }), { today: 1 }) },
    { id: "B", label: "B", title: "One row that slides", desc: "Today's chips, unchanged, in a single row that slides left and right like the suggestion chips above the question box. Dots show where you are. Always one row, however many chips.", build: chipCard((c) => slideChips(c), { today: 1 }) },
    { id: "C", label: "C", title: "A row of icons", desc: "Each chip becomes a small icon button, all in one row. The ringed one's full name shows just under the row. A yellow dot marks the ones worth a look (spoiler risk, the Spy). Smallest, but you learn the icons.", build: chipCard((c) => iconChips(c), { today: 1 }) },
    { id: "D", label: "D", title: "Short names, no tabs row", desc: "A's short pills, and the \"This answer / Session\" tabs row and the \"Chip 1 of 8\" line are gone. Session becomes the last chip (dashed), and opening it shows Sum up this chat.", build: chipCard((c) => wrappedChips(c, { short: true, cls: "cA cD", tabs: false, caption: false, sessChip: true }), { today: 1 }) },
    { id: "wild", label: "Wild", wild: true, title: "One line of facts, no Show details", desc: "The Show details line goes away. Under every answer sits one dim line: \"KB · 14 sections · 12 W · balanced · thought 16 s …\". Each word is a stop; the ring on one opens its box. The last dot opens Developer details and Session.", build: chipCard((c) => receiptChips(c), { today: 1 }) },
  ],
});

/* ---------- round 2 (2026-10-11): D was picked ("put the tab into that special chip at the end"); A liked as the simple fix ---------- */
const CHIPS_R2_OPTIONS = [
  { id: "2A", group: "r2", groupTitle: "Round 2: D, as you picked it", label: "A", title: "D: short names, Session as the last chip",
    desc: "The Show details line opens the chips. Short names in small pills, no tabs row and no \"Chip 1 of 8\" line. Session is the dashed chip at the end; on it you get Sum up this chat and the chat's questions. Each box keeps the chip's full wording in grey under its title.",
    build: chipCard((c) => wrappedChips(c, { short: true, cls: "cA cD", tabs: false, caption: false, sessChip: true }), { today: 1 }) },
  { id: "2B", group: "r2", label: "B", title: "The same, without the Show details line",
    desc: "The facts-line idea folded into D: the short pills sit under every answer, a little dimmed, with no Show details line to open first. A box opens only while the ring is on a pill and closes when you move on, so the chat stays clean. One press less, one line less.",
    build: chipCard((c) => wrappedChips(c, { short: true, cls: "cA cD c-quiet", tabs: false, caption: false, sessChip: true, line: false, boxOnRing: true }), { today: 1 }) },
];
(() => {
  const t = TABS.find((x) => x.id === "t1");
  t.title = "Show details chips, round 2: D, and whether the Show details line stays";
  t.today = [
    "Round 1: you liked D (short names, Session as the last chip), A (\"simple fix\") and the facts line (\"interesting idea\"). Not B or C.",
    "Round 2 draws D cleaned up, and D with the facts line's one idea taken in: no Show details line to press first.",
  ];
  t.deciding = [
    "Keep the Show details line (A) or show the pills straight under the answer (B).",
    "The short names below: anything you would word differently.",
  ];
  t.howto = "Click a panel, then use the arrow keys; the box follows the ring. Switch between 8 and 12 chips above each panel. Round 1 is further down with your picks.";
  t.controls = () => h("div", { class: "note-box c-names" }, h("b", {}, "The short names: "),
    ...CHIPS.map((c, i) => h("span", {}, (i ? " · " : "") + c.full + " → ", h("i", {}, c.short))), " · Session · 100 → ", h("i", {}, "Session · 100 (dashed, last)"));
  t.options = [...CHIPS_R2_OPTIONS, ...t.options.map((o, i) => ({ ...o, group: "r1", groupTitle: i === 0 ? "Round 1 (your picks are kept)" : undefined }))];
})();

/* decided in round 2 (2026-10-11): A, D as picked, with the Show details line */
(() => {
  const t = TABS.find((x) => x.id === "t1");
  t.title = "Show details chips: decided (A of round 2)";
  t.today = ["Decided in round 2: A. Short names in small pills, Session as the dashed chip at the end, the Show details line kept. It is on the roadmap.", ...t.today];
  t.options = t.options.map((o) => ({ ...o, groupTitle: o.groupTitle === "Round 2: D, as you picked it" ? "Round 2 (decided: A)" : o.groupTitle }));
})();
