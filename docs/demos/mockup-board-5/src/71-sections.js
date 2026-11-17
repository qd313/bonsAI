/* ============================================================
   Tab 1: tab sections, slightly shaded, with bold titles, and the first one open.
   Drawn on the Ollama tab's real five sections and rows (42-tabs-data.js, which is the plugin's own
   wording). The panel is the plugin's folded tab as it ships: section lines with their values, one
   line per setting, the help strip at the bottom showing the ringed row's longer text, and the small
   Open all button (src/features/folded-tabs).
     today  no shade; the tab opens with every section shut
     A      only the section line shaded
     B      the whole open section, line and settings, shaded as one block
     C      a coloured bar down the left of an open section, with a faint tint
     Wild   the settings sit in a darker well under their line
   Every name here starts with b5t1 so it cannot clash with another tab's file.
   ============================================================ */

/* the longer text under a row, joined (the density board's itemDesc) */
function b5t1Desc(it) {
  const parts = [];
  if (it.pre) parts.push(it.pre);
  if (it.descs) parts.push(it.descs[it.sel]);
  else if (it.desc) parts.push(it.desc);
  if (it.post) parts.push(it.post);
  return parts.join("<br>");
}

/* one setting, as one line (the density board's compactItem, cut down to the kinds the Ollama tab has) */
function b5t1Item(it, ctx) {
  const wrap = (row, ...rest) => {
    const d = b5t1Desc(it);
    const w = h("div", { class: "k-item" }, row, ...rest);
    if (d) w.dataset.desc = d;
    return w;
  };
  switch (it.t) {
    case "tog": {
      const sw = h("span", { class: "k-sw" + (it.on ? " on" : "") });
      const row = h("button", { class: "k-row", "data-stop": "" }, h("span", { class: "k-l" }, it.label), sw);
      row.addEventListener("click", () => { it.on = !it.on; sw.classList.toggle("on", it.on); ctx.changed(); });
      return [wrap(row, it.status ? h("div", { class: "k-line", html: it.status }) : "")];
    }
    case "choice": {
      const cap = h("div", { class: "k-cap" }, h("span", {}, it.label));
      const r = ctx.rowId();
      let w;
      const btns = it.opts.map((o, k) => {
        const b = h("button", { class: "k-opt" + (k === it.sel ? " on" : ""), "data-stop": "", "data-row": r, title: o }, o);
        b.addEventListener("click", () => {
          it.sel = k; btns.forEach((x, j) => x.classList.toggle("on", j === k));
          if (it.descs) { w.dataset.desc = b5t1Desc(it); ctx.refreshStrip(); }
          ctx.changed();
        });
        return b;
      });
      w = wrap(cap, h("div", { class: "k-seg" }, ...btns));
      return [w];
    }
    case "slider": {
      const val = h("b", {}, it.stops[it.sel]);
      const fill = h("i"), knob = h("u");
      const sl = h("button", { class: "k-sl", "data-stop": "", "data-slider": "" }, h("div", { class: "k-slh" }, h("span", {}, it.label), val), h("div", { class: "k-rail" }, fill, knob));
      const paint = () => { const p = (it.sel / (it.stops.length - 1)) * 100; fill.style.width = p + "%"; knob.style.left = p + "%"; val.textContent = it.stops[it.sel]; };
      sl.slide = (dir) => { it.sel = Math.max(0, Math.min(it.stops.length - 1, it.sel + dir)); paint(); ctx.changed(); };
      paint();
      return [wrap(sl)];
    }
    case "gbtn":
      return [wrap(h("button", { class: "k-btn" + (it.cyan ? " cyan" : ""), "data-stop": "" }, it.label))];
    case "line": return [h("div", { class: "k-line " + it.cls, html: it.html })];
    case "conn": return [h("div", { class: "k-row", style: "border:0" }, h("span", { class: "k-l", html: `On this Deck · <span class="cy">${it.addr}</span>` }), h("button", { class: "k-btn", style: "width:auto;margin:0;height:24px", "data-stop": "" }, "Test"))];
    case "pair": { const r = ctx.rowId(); return [h("div", { class: "k-pair" }, h("button", { class: "k-btn", "data-stop": "", "data-row": r }, it.a), h("button", { class: "k-btn" + (it.red ? " red" : ""), "data-stop": "", "data-row": r }, it.b))]; }
  }
  return [];
}

/* a section's current values for its closed line (the plugin's summarizeSection, as the density board drew it) */
function b5t1Summary(list, head) {
  const parts = [];
  const name = (it) => (head && it.label === head.label ? "" : it.label + ": ");
  const togs = list.filter((it) => it.t === "tog");
  for (const it of list) {
    if (it.t === "choice" || it.t === "slider") parts.push(name(it) + (it.t === "slider" ? it.stops[it.sel] : it.opts[it.sel]));
  }
  if (togs.length && togs.length <= 2) togs.forEach((it) => parts.push((head && it.label === head.label ? "" : it.label + " ") + (it.on ? "on" : "off")));
  else if (togs.length) parts.push(`${togs.filter((it) => it.on).length} of ${togs.length} on`);
  return parts.join(" · ");
}

/* The Ollama tab's panel. `startOpen` is the list of section numbers open when it is first drawn. */
function b5t1Panel(variant, startOpen) {
  const items = structuredClone(TAB_DATA.Ollama.items);
  let rowN = 0;
  const ctx = {
    rowId: () => `b5t1r${++rowN}`,
    changed: () => { refreshSummaries(); measureNow(); },
    refreshStrip: () => showStrip(),
  };
  const holder = h("div", { style: "display:contents" });
  const root = deckFrame({ body: holder, header: false });
  root.classList.add("dt", "mDBm", "has-strip", "b5t1", "b5t1-v-" + variant);
  const sc = h("div", { class: "dt-scroll scroll" });
  const strip = h("div", { class: "b5t1-strip" });
  const allBtn = h("button", { class: "b5t1-all", "data-stop": "" });
  const dock = h("div", { class: "b5t1-dock" }, h("div", { class: "b5t1-allrow" }, allBtn), strip);

  // split into sections, one per heading
  const sections = [];
  for (const it of items) { if (it.t === "sec" || !sections.length) sections.push({ head: it.t === "sec" ? it : null, list: [] }); if (it.t !== "sec") sections[sections.length - 1].list.push(it); }
  const openSet = new Set(startOpen);
  const sums = [];
  const refreshSummaries = () => sums.forEach(({ s, sum }) => (sum.textContent = b5t1Summary(s.list, s.head)));
  const allOpen = () => openSet.size === sections.length;

  const paintAll = () => { allBtn.replaceChildren(h("span", { class: "b5t1-alli" }, allOpen() ? "⊟" : "⊞"), allOpen() ? "Close all" : "Open all"); };

  const draw = () => {
    sc.replaceChildren();
    rowN = 0; sums.length = 0;
    sections.forEach((s, si) => {
      const isOpen = openSet.has(si);
      const sum = h("span", { class: "k-fs" }, b5t1Summary(s.list, s.head));
      const line = h("button", { class: "k-fold b5t1-line" + (isOpen ? " open" : ""), "data-stop": "" }, h("span", { class: "k-ft" }, s.head.label), sum, h("span", { class: "k-fc" }, isOpen ? "▾" : "▸"));
      line.addEventListener("click", () => {
        if (isOpen) openSet.delete(si); else openSet.add(si);
        draw();
        Deck.setRing(root, $$(".b5t1-line", sc)[si]);
        measureNow();
      });
      sums.push({ s, sum });
      const box = h("div", { class: "b5t1-sec" + (isOpen ? " open" : "") }, line);
      if (isOpen) { const body = h("div", { class: "k-foldbody" }); s.list.forEach((it) => body.append(...b5t1Item(it, ctx))); box.append(body); }
      sc.append(box);
    });
    paintAll();
  };
  draw();
  holder.append(tabBar2(TAB_DATA.Ollama.icon), h("div", { class: "k2-gap" }), sc, dock);

  allBtn.addEventListener("click", () => {
    const open = !allOpen();
    openSet.clear();
    if (open) sections.forEach((_, i) => openSet.add(i));
    draw();
    Deck.setRing(root, allBtn, { scroll: false });
    measureNow();
  });

  // the strip shows the ringed row's name and longer text, as the plugin's does
  function showStrip() {
    const cur = Deck.current(root);
    const host = cur && (cur.dataset.desc ? cur : cur.closest("[data-desc]"));
    if (host) {
      const lab = host.querySelector(".k-l, .k-cap span, .k-slh span")?.textContent || cur.firstChild?.textContent || "";
      strip.innerHTML = `<span class="b5t1-sl">${lab}</span>${host.dataset.desc}`;
    } else strip.innerHTML = "";
  }
  let lastLine = 0;
  root.addEventListener("ringmove", (e) => {
    const el = e.detail.el;
    showStrip();
    // keep the ringed row clear of the dock (the band and the strip)
    const r = el.getBoundingClientRect(), d = dock.getBoundingClientRect();
    const z = r.height / el.offsetHeight || 1;
    if (el !== allBtn && r.bottom > d.top - 4) sc.scrollBy({ top: (r.bottom - d.top + 8) / z });
    // remember the section the ring is in, for the way back from Open all
    const secEl = el.closest(".b5t1-sec");
    if (secEl) lastLine = $$(".b5t1-sec", sc).indexOf(secEl);
  });
  root.addEventListener("deckkey", (e) => {
    const cur = e.detail.stop; if (!cur) return;
    const k = e.detail.key;
    if ((k === "Left" || k === "Right") && cur.hasAttribute("data-slider")) { e.preventDefault(); cur.slide(k === "Right" ? 1 : -1); return; }
    // Open all: Right from any section line reaches it; Up, Left or B go back to the line it came from; Down and Right hold
    if (k === "Right" && cur.matches(".b5t1-line")) { e.preventDefault(); Deck.setRing(root, allBtn, { scroll: false }); return; }
    if (cur === allBtn && k !== "A") {
      e.preventDefault();
      if (k === "Up" || k === "Left" || k === "B") Deck.setRing(root, $$(".b5t1-line", sc)[lastLine] || $(".b5t1-line", sc));
    }
  });

  // the ring starts on the first section line, as it does when a tab is opened on the Deck
  const first = $(".b5t1-line", sc);
  first.classList.add("ring");
  first.setAttribute("data-start", "");
  root.scroller = sc;
  const measureNow = () => root.dispatchEvent(new Event("b5t1measure", { bubbles: true }));
  return root;
}

/* How tall the whole tab is, shut, with the first section open, and all open, read from throw-away copies of the panel */
const B5T1_HEIGHTS = {};
function b5t1Heights(variant) {
  if (B5T1_HEIGHTS[variant]) return B5T1_HEIGHTS[variant];
  const host = h("div", { style: "position:fixed;left:-9999px;top:0;visibility:hidden;pointer-events:none" });
  document.body.append(host);
  const read = (open) => {
    const root = b5t1Panel(variant, open);
    host.replaceChildren(root);
    const sc = $(".dt-scroll", root), last = sc.lastElementChild;
    return Math.round(last.offsetTop + last.offsetHeight);
  };
  const n = TAB_DATA.Ollama.items.filter((it) => it.t === "sec").length;
  const out = { shut: read([]), first: read([0]), all: read([...Array(n).keys()]) };
  host.remove();
  return (B5T1_HEIGHTS[variant] = out);
}

/* a card: the panel, then the heights read from it */
function b5t1Card(variant, startOpen) {
  return () => {
    const panel = b5t1Panel(variant, startOpen);
    const out = h("p", { class: "b5t1-measure" });
    const fill = () => {
      const m = b5t1Heights(variant), t = b5t1Heights("t");
      if (!m.shut || !t.shut) return;
      const d = (a, b) => (a === b ? "same as today" : `${a > b ? "+" : "−"}${Math.abs(a - b)} pts on today`);
      out.replaceChildren(
        "Whole tab, top to bottom:",
        "all shut ", h("b", {}, `${m.shut} pts`), h("span", { class: "vs" }, variant === "t" ? "" : `(${d(m.shut, t.shut)})`),
        "first section open ", h("b", {}, `${m.first} pts`),
        "all open ", h("b", {}, `${m.all} pts`), h("span", { class: "vs" }, variant === "t" ? "" : `(${d(m.all, t.all)})`));
    };
    // the throw-away copies need Steam's font in place, so read once the fonts are ready
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(fill, 40));
    return [panel, out];
  };
}

TABS.push({
  id: "t1", n: 1, name: "Tab sections", stars: 1,
  title: "Tab sections: slightly shaded, bold titles, first one open",
  today: [
    "Each tab folds into section lines. A line shows the section's name in capital letters and, beside it, the section's current values. There is no shade: the line and the settings under it sit on the same dark background as the rest of the panel.",
    "A tab opens with every section shut, so the first thing you see is a stack of closed lines.",
  ],
  deciding: [
    "How a section stands apart from the settings inside it: a shade on its line only (A), a shade over the whole open section (B), a coloured bar and a faint tint (C), or settings sunk in a darker well (outside the box).",
    "The titles are drawn a little bigger and bolder in every option here, so that part is not a choice between them.",
    "Every option opens with the first section already open. Today's panel shows what the plugin does now, every section shut.",
    "Open question: when you leave a tab and come back, should the first section open again, or stay as you left it?",
  ],
  howto: "Click a panel, then use the arrow keys. Down and Up walk the section lines and the settings. Enter opens or closes a section or flips a switch. Left and Right move a slider. Right from a section line jumps to the small Open all button. The white ring starts on the first section line. The strip at the bottom shows the longer text of the setting the ring is on. The numbers under each panel are measured from the drawing.",
  options: [
    { id: "today", label: "Today", today: true, title: "As it is now: no shade, every section shut",
      desc: "The plugin as it ships. A section line is plain: bold capital name, its values, a small arrow. The settings under it sit on the same background. The tab opens with all five sections shut; press Enter on a line to open it. The ring is a grey fill with a white edge.",
      build: b5t1Card("t", []) },
    { id: "A", label: "A", title: "Only the section line is shaded",
      desc: "Each section line sits on a slightly lighter band, with a bigger, bolder name. The settings under it stay on the plain background, so the line reads as a heading bar. The ring stays easy to see: on a line the grey fill is lighter than the shade and the white edge is unchanged. First section open.",
      build: b5t1Card("a", [0]) },
    { id: "B", label: "B", title: "The whole open section is one shaded block",
      desc: "Each section is a small rounded block a few points in from the sides. An open section is its line and its settings on one shade, so you can see where it starts and ends. The blocks cost a little height and make the settings a few points narrower. The white edge on a line is as clear as before; a setting's grey fill is a little weaker here, because the block is lighter than the panel. First section open.",
      build: b5t1Card("b", [0]) },
    { id: "C", label: "C", title: "A coloured bar down the left of the open section",
      desc: "An open section gets a thin green bar down its left edge and a very faint green tint over the line and its settings. Shut sections stay plain, so the open one is easy to spot as you scroll. The ring is as clear as today; on the line it covers the bar for a moment. First section open.",
      build: b5t1Card("c", [0]) },
    { id: "wild", label: "Wild", wild: true, title: "Settings sunk in a darker well",
      desc: "Backwards from the others: the section line is a lighter band, and its settings sit in a darker well under it, like a drawer pulled open. The ring's grey fill stands out more against the dark, so this one shows the ring best. First section open.",
      build: b5t1Card("w", [0]) },
  ],
});
