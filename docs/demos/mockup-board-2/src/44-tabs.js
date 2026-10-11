/* ============================================================
   Tab 2: make the other tabs much denser.
   One drawing per mode, for any of the five tabs:
     today  Steam's own rows, as the plugin draws them (42-tabs-data.js)
     A      compact rows; a row's longer text shows under it only while the ring is on it
     B      compact rows; one help strip at the bottom shows the ringed row's text
     C      compact rows; an (i) marks rows with more to read; X shows it in a small box
     D      every section folded to one line with its current values; A opens one
     tiles  switches as two-column tiles, choices as one strip of buttons; text as in B
   ============================================================ */
const QR = (() => {
  // a fixed made-up pattern that reads as a QR code; it encodes nothing
  let s = 7, cells = "";
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let y = 0; y < 25; y++) for (let x = 0; x < 25; x++) {
    const inFinder = (x < 8 && y < 8) || (x > 16 && y < 8) || (x < 8 && y > 16);
    if (!inFinder && rnd() > 0.52) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  }
  const finder = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
  return `<svg viewBox="0 0 25 25" shape-rendering="crispEdges" fill="#111">${cells}${finder(0, 0)}${finder(18, 0)}${finder(0, 18)}</svg>`;
})();

const stripTags = (s) => (s || "").replace(/<br>/g, " ").replace(/<[^>]+>/g, "");
function itemDesc(it) {
  const parts = [];
  if (it.pre) parts.push(it.pre);
  if (it.descs) parts.push(it.descs[it.sel]);
  else if (it.desc) parts.push(it.desc);
  if (it.post) parts.push(it.post);
  return parts.join("<br>");
}

/* ---------- today ---------- */
function todayItem(it, first, ctx) {
  const out = [];
  const hint = (html) => h("div", { class: "t-hint", html });
  switch (it.t) {
    case "sec": out.push(h("div", { class: "t-sec" + (first ? " first" : "") }, it.label)); break;
    case "tog": {
      if (it.pre) out.push(hint(it.pre));
      const sw = h("span", { class: "t-sw" + (it.on ? " on" : "") });
      const row = h("button", { class: "t-tog", "data-stop": "" }, h("div", { class: "t-lab" }, h("span", {}, it.label), sw),
        it.how === "decky" && it.desc ? h("div", { class: "t-desc", html: it.desc }) : "");
      row.addEventListener("click", () => { it.on = !it.on; sw.classList.toggle("on", it.on); ctx.changed(); });
      out.push(row);
      if (it.how === "below" && it.desc) out.push(hint(it.desc));
      if (it.status) out.push(h("div", { class: "t-line", html: it.status }));
      if (it.post) out.push(hint(it.post));
      break;
    }
    case "choice": {
      if (it.titled) out.push(h("div", { class: "t-title" }, it.label));
      const d = (it.desc || it.descs) ? hint(it.descs ? it.descs[it.sel] : it.desc) : null;
      if (d) out.push(d);
      const btns = it.opts.map((o, k) => {
        const b = h("button", { class: "t-opt" + (k === it.sel ? " on" : ""), "data-stop": "", "data-row": ctx.rowId() }, o);
        b.addEventListener("click", () => { it.sel = k; btns.forEach((x, j) => x.classList.toggle("on", j === k)); if (it.descs) d.innerHTML = it.descs[k]; ctx.changed(); });
        return b;
      });
      out.push(h("div", { class: "t-opts" + (it.tall ? " tall" : "") + (it.cyan ? " cyan" : "") + (it.small ? " small" : "") }, ...btns));
      break;
    }
    case "slider": {
      if (it.titled) out.push(h("div", { class: "t-title" }, it.label));
      if (it.desc) out.push(hint(it.desc));
      const val = h("b", {}, it.stops[it.sel]);
      out.push(h("div", { class: "t-slhead" }, `${it.head}: `, val));
      const fill = h("div", { class: "t-fill" }), knob = h("div", { class: "t-knob" });
      const box = h("button", { class: "t-slbox", "data-stop": "", "data-slider": "" }, h("div", { class: "t-track" }, h("div", { class: "t-rail" }), fill, knob));
      const paint = () => { const p = (it.sel / (it.stops.length - 1)) * 100; fill.style.width = p + "%"; knob.style.left = p + "%"; val.textContent = it.stops[it.sel]; };
      box.slide = (dir) => { it.sel = Math.max(0, Math.min(it.stops.length - 1, it.sel + dir)); paint(); ctx.changed(); };
      paint(); out.push(box);
      break;
    }
    case "sbtn":
      if (it.desc) out.push(hint(it.desc));
      out.push(h("div", { class: "t-sbrow" }, h("button", { class: "t-sb", "data-stop": "", style: it.wrap ? "min-height:60px" : null }, it.wrap ? "Jump to Steam Input\n(running game)" : it.label)));
      break;
    case "gbtn":
      out.push(h("button", { class: "t-gb" + (it.cyan ? " cyan" : "") + (it.picker ? " picker" : ""), "data-stop": "" }, it.label));
      if (it.how === "below" && it.desc) out.push(h("div", { class: "t-line dim", html: it.desc }));
      break;
    case "line": out.push(h("div", { class: "t-line " + it.cls, html: it.html })); break;
    case "conn": out.push(h("div", { class: "t-conn" }, h("span", { html: `${it.label}<br><span class="cy">${it.addr}</span>` }), h("button", { class: "t-gb", "data-stop": "", "data-row": ctx.rowId() }, it.btn))); break;
    case "pair": { const r = ctx.rowId(); out.push(h("div", { class: "t-pair" }, h("button", { class: "t-gb", "data-stop": "", "data-row": r }, it.a), h("button", { class: "t-gb" + (it.red ? " red" : ""), "data-stop": "", "data-row": r }, it.b))); break; }
    case "stack": {
      out.push(hint(it.desc), h("div", { class: "t-title" }, it.label));
      const btns = it.opts.map((o, k) => {
        const b = h("button", { class: "t-opt" + (k === it.sel ? " on" : ""), "data-stop": "" }, o);
        b.addEventListener("click", () => { it.sel = k; btns.forEach((x, j) => x.classList.toggle("on", j === k)); });
        return b;
      });
      out.push(h("div", { class: "t-stack" }, ...btns));
      break;
    }
    case "accent": out.push(h("div", { class: "t-title" }, it.label), h("div", { class: "t-hint" }, it.desc), h("button", { class: "t-acc", "data-stop": "" }, it.value, " ▾")); break;
    case "field": out.push(h("div", { class: "t-title" }, it.label), hint(it.desc), h("button", { class: "t-field", "data-stop": "" }, "")); break;
    case "dropdown": out.push(hint(it.desc), h("div", { class: "t-hint", html: it.pre }), h("button", { class: "t-drop", "data-stop": "" }, h("span", {}, it.value), h("span", {}, "▾"))); break;
    case "para": out.push(h("div", { class: "t-para" + (it.about ? " about" : "") + (it.beta ? " beta" : ""), html: it.html })); break;
    case "qr": out.push(h("div", { class: "t-qr", html: QR })); break;
  }
  return out;
}

/* ---------- compact (A to D and tiles) ---------- */
function compactItem(it, first, ctx) {
  const wrap = (row, ...rest) => {
    const d = itemDesc(it);
    const w = h("div", { class: "k-item" }, row, ...rest);
    if (d) {
      w.dataset.desc = d;
      w.append(h("div", { class: "k-desc", html: d }));
      if (ctx.mode === "C") $(".k-row, .k-cap, .k-slh", w)?.append(h("i", { class: "k-i" }, "i"), h("span", { class: "k-xhint" }, "X  more"));
    }
    return w;
  };
  switch (it.t) {
    case "sec": return [h("div", { class: "k-sec" + (first ? " first" : "") }, it.label)];
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
          if (it.descs) { w.dataset.desc = itemDesc(it); const kd = $(".k-desc", w); if (kd) kd.innerHTML = itemDesc(it); ctx.refreshStrip(); }
          ctx.changed();
        });
        return b;
      });
      w = wrap(cap, h("div", { class: "k-seg" + (it.cyan ? " cyan" : "") }, ...btns));
      return [w];
    }
    case "stack": {
      const short = ["tiny.en · faster", "base.en · better"];
      const r = ctx.rowId();
      const btns = it.opts.map((o, k) => {
        const b = h("button", { class: "k-opt" + (k === it.sel ? " on" : ""), "data-stop": "", "data-row": r, title: o }, short[k]);
        b.addEventListener("click", () => { it.sel = k; btns.forEach((x, j) => x.classList.toggle("on", j === k)); });
        return b;
      });
      return [wrap(h("div", { class: "k-cap" }, h("span", {}, it.label)), h("div", { class: "k-seg cyan" }, ...btns))];
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
    case "sbtn": case "gbtn":
      return [wrap(h("button", { class: "k-btn" + (it.cyan ? " cyan" : "") + (it.picker ? " left" : ""), "data-stop": "", "data-row": it.group ? "g-" + it.group + ctx.tabKey : null }, it.picker ? `Character: ${it.label}` : it.wrap ? "Jump to Steam Input (running game)" : it.label))];
    case "line": return [h("div", { class: "k-line " + it.cls, html: it.cls === "info" ? it.html.replace(/<br><span class="dim">.*<\/span>/, "") : it.html })];
    case "conn": return [h("div", { class: "k-row", style: "border:0" }, h("span", { class: "k-l", html: `On this Deck · <span class="cy">${it.addr}</span>` }), h("button", { class: "k-btn", style: "width:auto;margin:0;height:24px", "data-stop": "" }, "Test"))];
    case "pair": { const r = ctx.rowId(); return [h("div", { class: "k-pair" }, h("button", { class: "k-btn", "data-stop": "", "data-row": r }, it.a), h("button", { class: "k-btn" + (it.red ? " red" : ""), "data-stop": "", "data-row": r }, it.b))]; }
    case "accent": return [wrap(h("button", { class: "k-row", "data-stop": "" }, h("span", { class: "k-l" }, it.label), h("span", { class: "k-v" }, h("b", {}, it.value), " ▾")))];
    case "field": return [wrap(h("div", { class: "k-cap" }, h("span", {}, it.label)), h("button", { class: "k-field", "data-stop": "" }, "Paste or type the key"))];
    case "dropdown": return [wrap(h("button", { class: "k-row", "data-stop": "" }, h("span", { class: "k-l" }, it.label), h("span", { class: "k-v" }, h("b", {}, it.value), " ▾")))];
    case "para":
      if (it.intro) return [wrap(h("button", { class: "k-row", "data-stop": "" }, h("span", { class: "k-l", style: "color:#9fb7d5;font-size:11.5px" }, "High-impact actions stay off until you turn them on.")))];
      if (it.beta) return [h("div", { class: "k-text beta" }, "Beta: check AI advice, especially TDP and performance changes, before relying on it.")];
      if (it.long) return [wrap(h("button", { class: "k-row", "data-stop": "" }, h("span", { class: "k-l" }, "What bonsAI is")), "")];
      return [h("div", { class: "k-text" }, it.html)];
    case "qr": return [h("div", { class: "k-qr", html: QR })];
    case "links": return [linksItem(it.variant, ctx)];
  }
  return [];
}
/* the long About text and the Permissions intro become the row's description */
function prepCompact(items) {
  for (const it of items) {
    if (it.t === "para" && it.long && !it.beta) it.desc = it.html;
    if (it.t === "para" && it.intro) it.desc = it.html;
  }
  return items;
}

/* tiles: runs of switches become a two-column grid */
function tilesItems(items, ctx) {
  const out = []; let run = null;
  items.forEach((it, i) => {
    if (it.t === "tog" && !it.status && !it.pre) {
      if (!run) { run = h("div", { class: "k-tiles" }); out.push(run); }
      const sw = h("span", { class: "k-sw" + (it.on ? " on" : "") });
      const t = h("button", { class: "k-tile" + (it.on ? " on" : ""), "data-stop": "", "data-row": ctx.tileRow(run, it) }, it.label, sw);
      t.addEventListener("click", () => { it.on = !it.on; sw.classList.toggle("on", it.on); t.classList.toggle("on", it.on); ctx.changed(); });
      const d = itemDesc(it);
      run.append(d ? h("div", { class: "k-item", "data-desc": d, style: "display:contents" }, t) : t);
      if (d) t.dataset.desc = d;
    } else { run = null; out.push(...compactItem(it, i === 0, ctx)); }
  });
  return out;
}

/* a short summary of a section's values, for the folded line */
function sectionSummary(list, head) {
  const parts = [];
  const name = (it) => (head && it.label === head.label ? "" : it.label + ": ");
  const togs = list.filter((it) => it.t === "tog");
  for (const it of list) {
    if (it.t === "choice" || it.t === "slider") parts.push(name(it) + (it.t === "slider" ? it.stops[it.sel] : it.opts[it.sel]));
    if (it.t === "stack") parts.push(it.label + ": " + it.opts[it.sel].split(" ")[0]);
    if (it.t === "dropdown") parts.push(it.value);
  }
  if (togs.length && togs.length <= 2) togs.forEach((it) => parts.push((head && it.label === head.label ? "" : it.label + " ") + (it.on ? "on" : "off")));
  else if (togs.length) parts.push(`${togs.filter((it) => it.on).length} of ${togs.length} on`);
  return parts.join(" · ");
}

/* ---------- the panel ---------- */
function otherTabPanel(tabName, modeFull) {
  const [mode, variant] = modeFull.split(":");
  const data = TAB_DATA[tabName];
  let items = mode === "today" ? structuredClone(data.items) : prepCompact(structuredClone(data.items));
  if (variant && LINK_VARIANTS.includes(variant)) items = linksAsOne(items, variant);
  let rowN = 0;
  const tileRows = new Map();
  const ctx = {
    mode, tabKey: tabName,
    rowId: () => `r${++rowN}`,
    tileRow: (run, it) => { const n = (tileRows.get(run) || 0); tileRows.set(run, n + 1); return `tile-${rowN}-${tabName}-${run.dataset.k || (run.dataset.k = ++rowN)}-${Math.floor(n / 2)}`; },
    changed: () => { fold && refreshFolds(); measureNow(); },
    refreshStrip: () => strip && showStrip(),
  };
  const holder = h("div", { style: "display:contents" });
  const root = deckFrame({ body: holder, header: false });
  root.classList.add("dt", "m" + mode);
  const sc = h("div", { class: "dt-scroll scroll" });
  const strip = ["B", "tiles", "DB", "DBm"].includes(mode) ? h("div", { class: "k-strip" }) : null;
  if (strip) root.classList.add("has-strip");
  const fold = mode === "D" || mode === "DB" || mode === "DBm";
  const multi = mode === "DBm"; // sections stay open until you close them
  const openSet = new Set([0]);

  // split into sections
  const sections = [];
  for (const it of items) { if (it.t === "sec" || !sections.length) sections.push({ head: it.t === "sec" ? it : null, list: [] }); if (it.t !== "sec") sections[sections.length - 1].list.push(it); }

  let openSec = 0;
  const foldEls = [];
  function refreshFolds() { foldEls.forEach(({ s, sum }) => (sum.textContent = sectionSummary(s.list, s.head))); }
  const allOpen = () => openSet.size === sections.length;
  const setAll = (open) => { openSet.clear(); if (open) sections.forEach((_, i) => openSet.add(i)); };
  const draw = () => {
    sc.replaceChildren();
    rowN = 0; foldEls.length = 0;
    if (fold && variant === "top") {
      // round 3, A: a line at the top of the tab
      const r = "allrow";
      const mk = (label, open) => { const b = h("button", { class: "k-allb", "data-stop": "", "data-row": r }, label); b.addEventListener("click", () => { setAll(open); draw(); Deck.setRing(root, $$(".k-allb", sc)[open ? 0 : 1]); measureNow(); }); return b; };
      sc.append(h("div", { class: "k-allrow" }, mk("Open all sections", true), mk("Close all", false)));
    }
    sections.forEach((s, si) => {
      if (mode === "today") { if (s.head) sc.append(...todayItem(s.head, si === 0, ctx)); s.list.forEach((it) => sc.append(...todayItem(it, false, ctx))); return; }
      if (fold) {
        const sum = h("span", { class: "k-fs" }, sectionSummary(s.list, s.head));
        const isOpen = sections.length === 1 || (multi ? openSet.has(si) : si === openSec);
        const btn = h("button", { class: "k-fold" + (isOpen ? " open" : ""), "data-stop": "" }, h("span", { class: "k-ft" }, s.head ? s.head.label : ""), sum, h("span", { class: "k-fc" }, isOpen ? "▾" : "▸"));
        btn.addEventListener("click", () => { if (multi) { if (isOpen) openSet.delete(si); else openSet.add(si); } else openSec = isOpen ? -1 : si; draw(); const again = $$(".k-fold", sc)[si]; Deck.setRing(root, again); measureNow(); });
        foldEls.push({ s, sum });
        sc.append(btn);
        if (isOpen) { const body = h("div", { class: "k-foldbody" + (mode === "D" ? " mA" : "") }); s.list.forEach((it) => body.append(...compactItem(it, false, ctx))); sc.append(body); }
        return;
      }
      if (s.head) sc.append(...compactItem(s.head, si === 0, ctx));
      if (mode === "tiles") sc.append(...tilesItems(s.list, ctx));
      else s.list.forEach((it) => sc.append(...compactItem(it, false, ctx)));
    });
  };
  draw();
  holder.append(tabBar2(data.icon), h("div", { class: "k2-gap" }), sc);
  if (strip) holder.append(strip);

  // round 3, B and C: open or close every section from anywhere
  let xchip = null, fbtn = null, lastFold = 0;
  const flipAll = () => {
    const cur = Deck.current(root);
    const at = cur ? $$(".k-fold", sc).indexOf(cur.closest(".k-foldbody")?.previousElementSibling || cur) : -1;
    setAll(!allOpen()); draw();
    const folds = $$(".k-fold", sc);
    if (cur && cur === fbtn) Deck.setRing(root, fbtn, { scroll: false });
    else Deck.setRing(root, folds[Math.max(0, at)]);
    paintAll(); measureNow();
  };
  const paintAll = () => {
    const label = allOpen() ? "Close all" : "Open all";
    if (xchip) xchip.replaceChildren(h("b", {}, "X"), label);
    if (fbtn) { fbtn.replaceChildren(h("span", { class: "k-fbi" }, allOpen() ? "⊟" : "⊞"), label); fbtn.style.bottom = (strip && strip.innerHTML ? strip.offsetHeight + 8 : 10) + "px"; }
  };
  if (fold && variant === "x") { xchip = h("div", { class: "k-xall" }); holder.append(xchip); }
  if (fold && variant === "float") { fbtn = h("button", { class: "k-fbtn", "data-stop": "" }); fbtn.addEventListener("click", flipAll); holder.append(fbtn); }
  paintAll();

  // the help strip follows the ring
  function showStrip() {
    const cur = Deck.current(root);
    const host = cur && (cur.dataset.desc ? cur : cur.closest("[data-desc]"));
    if (host) {
      const lab = host.querySelector(".k-l, .k-cap span, .k-slh span")?.textContent || cur.firstChild?.textContent || "";
      strip.innerHTML = `<span class="k-strip-l">${lab}</span>${host.dataset.desc}`;
    } else strip.innerHTML = "";
  }
  root.addEventListener("ringmove", (e) => {
    if (strip) {
      showStrip();
      // keep the ringed row clear of the strip
      const r = e.detail.el.getBoundingClientRect(), s = strip.getBoundingClientRect();
      const z = r.height / e.detail.el.offsetHeight || 1;
      if (strip.innerHTML && r.bottom > s.top - 6) sc.scrollBy({ top: (r.bottom - s.top + 10) / z });
    }
    if (mode === "C") $$(".k-item.open", root).forEach((w) => { if (!w.contains(e.detail.el)) w.classList.remove("open"); });
    if (e.detail.el.matches(".k-fold")) lastFold = $$(".k-fold", sc).indexOf(e.detail.el);
    if (fbtn) paintAll();
    // A and D: the text opens under the ringed row, so bring the row and its text into view together
    if (mode === "A" || mode === "D") { const w = e.detail.el.closest(".k-item"); if (w && w.dataset.desc) setTimeout(() => Deck.reveal(w)); }
  });
  // sliders take Left and Right; X opens the (i) text in C
  root.addEventListener("deckkey", (e) => {
    const cur = e.detail.stop; if (!cur) return;
    if ((e.detail.key === "Left" || e.detail.key === "Right") && cur.hasAttribute("data-slider")) { e.preventDefault(); cur.slide(e.detail.key === "Right" ? 1 : -1); }
    if (e.detail.key === "X" && xchip) { e.preventDefault(); flipAll(); }
    // the floating button: Right from any section line reaches it; any other press goes back
    if (fbtn && e.detail.key === "Right" && cur.matches(".k-fold")) { e.preventDefault(); Deck.setRing(root, fbtn, { scroll: false }); }
    else if (fbtn && cur === fbtn && e.detail.key !== "A") { e.preventDefault(); Deck.setRing(root, $$(".k-fold", sc)[lastFold] || $(".k-fold", sc)); }
    if (e.detail.key === "X" && mode === "C") { const w = cur.closest(".k-item"); if (w && w.dataset.desc) { e.preventDefault(); w.classList.toggle("open"); const d = $(".k-desc", w); if (w.classList.contains("open") && d) setTimeout(() => Deck.reveal(d)); } }
  });

  const first = Deck.stops(root)[0] || $("[data-stop]", root);
  first && first.setAttribute("data-start", "");
  root.scroller = sc;
  const measureNow = () => root.dispatchEvent(new Event("dtmeasure", { bubbles: true }));
  return root;
}

/* ---------- a card: one tab's panel, with its height read under it ---------- */
const TODAY_DRAWN = {};
function tabsCard(mode, cur) {
  return () => {
    const holder = h("div", { class: "deck-swap", "data-tab": cur });
    const out = h("p", { class: "d-measure" });
    const measure = () => {
      const sc = $(".dt-scroll", holder);
      if (!sc || !sc.clientHeight) return;
      // measure to the bottom of the last row, so a tab shorter than the panel still reads true
      const r = sc.getBoundingClientRect(), last = sc.lastElementChild;
      if (!last || !r.height) return;
      const unit = r.height / 430; // the visible part of the tab is 430 of the panel's own pixels
      const ownPx = Math.round((last.getBoundingClientRect().bottom - r.top) / unit + sc.scrollTop * (r.height / sc.clientHeight) / unit + 24);
      const screens = (ownPx / 430).toFixed(1);
      if (mode === "today" && TODAY_DRAWN[cur] !== ownPx) {
        TODAY_DRAWN[cur] = ownPx;
        $$(`.deck-swap[data-tab="${cur}"]`).forEach((x) => x !== holder && x.dispatchEvent(new Event("dtmeasure")));
      }
      const ref = TODAY_DRAWN[cur];
      out.replaceChildren("Whole tab, top to bottom:", h("b", {}, `${ownPx} px`), `about ${screens} screens`,
        mode === "today" ? h("span", { class: "vs" }, `measured on the Deck: ${TAB_DATA[cur].measured} px`)
          : ref ? h("span", { class: "vs" }, `today ${ref} px, so ${Math.round((1 - ownPx / ref) * 100)}% shorter`) : "");
    };
    holder.addEventListener("dtmeasure", () => setTimeout(measure, 30));
    new ResizeObserver(measure).observe(holder);
    holder.replaceChildren(otherTabPanel(cur, mode));
    setTimeout(measure, 30);
    return [holder, out];
  };
}

/* What each tab is like today, for the brief at the top of its board tab */
const TAB_BRIEFS = {
  Ollama: [
    "About 4 screens tall on the Deck (1718 px).",
    "Terse mode is the biggest single row, about 170 px: its description runs to 8 lines. \"Start the AI with the Deck\" has a 5-line note under it.",
    "Four section headings each add about 60 px of space.",
  ],
  Settings: [
    "About 5 screens tall on the Deck (2133 px), the second longest tab.",
    "Four sections hold a single switch each (Remember what I typed, Story spoilers, Suggestion chips, Data), and each still gets its own heading.",
    "The voice section alone is about 300 px.",
  ],
  Permissions: [
    "Under 2 screens on the Deck (786 px): five switches and a 4-line note at the top.",
    "Every switch carries a 3- to 6-line description. Read game & screenshot context is the longest, about 144 px.",
    "Already short, so the question is how far to go.",
  ],
  Developer: [
    "About 6½ screens on the Deck (2820 px), the longest tab.",
    "Hybrid retrieval's row alone is about 270 px. Several choices carry a paragraph that changes with the pick.",
    "Only shows when Show Developer tab is on, and is mostly for testing, so it can be the densest.",
  ],
  About: [
    "About 2 screens on the Deck (915 px), mostly text and link buttons.",
    "The first place the ring can stop, the language picker, is about 379 px down the page.",
    "Each link button takes about 62 px.",
  ],
};

const DT_OPTIONS = [
  ["today", "Today", "Steam's own rows, every word showing", "As it ships: big switch rows with the description always under the name, section headings with room above, buttons in their own rows. The drawn height is shown next to the one measured on the Deck."],
  ["A", "A", "Text shows only on the ringed row", "Your idea. Every row is one line: the name and its switch, button or value. The longer text opens under the row the ring is on, and closes when the ring moves on. The page grows a little under the ring as you walk."],
  ["B", "B", "One help strip at the bottom", "Same one-line rows. The ringed row's text always appears in a strip at the bottom of the panel, so nothing in the list moves as you walk. The strip covers the bottom of the list while it shows."],
  ["C", "C", "Press X to read more", "Same one-line rows. Rows with more to say carry a small (i); on the ringed row it turns into \"X more\". X opens the text in a small box under the row. Quietest, but the text is one press away."],
  ["D", "D", "Folded sections", "Each section is one line with its current values, like \"Reply style · Balanced · Terse mode off · Thinking: Off\". A opens a section and closes the one before. Inside, rows work like A."],
  ["tiles", "Wild", "Switches as tiles, two to a row", "Runs of switches become small tiles side by side, choices one strip of buttons, and the longer text sits in B's help strip. The densest of all; tiles have room for only a short name."],
];

TAB_NAMES.forEach((name, i) => {
  TABS.push({
    id: "t" + (i + 2), n: i + 2, name: `${name} tab`, stars: 3,
    title: `Make the ${name} tab denser`,
    today: TAB_BRIEFS[name],
    deciding: [
      "Where a row's longer text goes: under the row only while the ring is on it (your idea, A), in one help strip at the bottom (B), or behind a press (C).",
      "Whether sections fold away (D), and whether switches can sit two to a row (outside the box).",
      "These mix, and the five tabs can differ: for example D on the long tabs and A on the short ones.",
    ],
    howto: "Click a panel, then use the arrow keys; Enter flips a switch or picks a button; Left and Right move a slider. In C, press X to read a row's text. The number under each panel is measured from the drawing.",
    options: DT_OPTIONS.map(([mode, label, title, desc]) => ({ id: mode === "tiles" ? "wild" : mode, label, today: mode === "today", wild: mode === "tiles", title, desc, build: tabsCard(mode, name) })),
  });
});

/* ---------- round 2 (2026-10-11) ----------
   Picked in round 1: D (folded sections) on Ollama, Settings, Permissions and Developer; on Ollama
   "maybe we can have the expansion below, as seen in option B" (the bottom strip); B "ok".
   Permissions: today liked too ("this tab is short, so it's not so bad"). About: A. */
const R2_FOLD_STRIP = ["DB", "Folded sections, text in the bottom strip", "Round 1's D with your note: sections fold to one line with their values, and A opens one and closes the one before. Inside, rows are one line, and the ringed row's longer text shows in the strip at the bottom, as in B, so nothing grows under the row."];
const R2_FOLD_MULTI = ["DBm", "The same, but sections stay open", "Like A, except opening a section leaves the others as they are; A on its line again closes it. You can keep the two or three sections you use open together."];
const R2 = {
  Ollama: { opts: [R2_FOLD_STRIP, R2_FOLD_MULTI], today: "Round 1: you liked D (\"dense and more navigable\") and B (\"ok\"), and asked for D with B's bottom strip. Not C.", deciding: ["One section open at a time (A), or several (B)."] },
  Settings: { opts: [R2_FOLD_STRIP, R2_FOLD_MULTI], today: "Round 1: you liked D. Drawn here with the bottom strip you asked for on the Ollama tab.", deciding: ["One section open at a time (A), or several (B). Settings has ten sections, the most of any tab."] },
  Developer: { opts: [R2_FOLD_STRIP, R2_FOLD_MULTI], today: "Round 1: you liked D. Drawn here with the bottom strip you asked for on the Ollama tab.", deciding: ["One section open at a time (A), or several (B)."] },
  Permissions: { opts: [["DB", "One-line rows, text in the bottom strip", "The same look as the long tabs. Permissions has a single section, so there is nothing to fold: just one-line rows, and the ringed switch's text in the strip at the bottom."], ["today", "Leave it as it is", "Today's Steam rows with every word showing. You liked this too: the tab is short, so the text costs little."]],
    today: "Round 1: you liked D and today's look (\"this tab is short, so it's not so bad that the copy takes up space\").", deciding: ["Match the other tabs (A), or leave Permissions as it is (B)."] },
  About: { opts: [["A", "One-line rows, text under the ringed row", "Round 1's A, as you picked it: one line per row, and \"What bonsAI is\" opens its paragraph under itself when the ring is on it. The beta warning stays visible."], ["DB", "Like the long tabs: folded sections and the bottom strip", "The layout the long tabs are heading for, so every tab works the same way. About has three short sections."]],
    today: "Round 1: you liked A.", deciding: ["Keep A here (A), or match the long tabs (B)."] },
};
TAB_NAMES.forEach((name, i) => {
  const t = TABS.find((x) => x.id === "t" + (i + 2));
  const r = R2[name];
  t.title = `${name} tab, round 2`;
  t.onShow = () => $$(`#tab-${t.id} .deck-swap`).forEach((x) => x.dispatchEvent(new Event("dtmeasure")));
  t.today = [r.today, ...TAB_BRIEFS[name].slice(0, 1)];
  t.deciding = [...r.deciding, "Whether every tab should work the same way."];
  t.howto = "Click a panel, then use the arrow keys; Enter opens a section, flips a switch or picks a button; Left and Right move a slider. The number under each panel is measured from the drawing. Round 1 is further down with your picks.";
  const r2 = r.opts.map(([mode, title, desc], k) => ({ id: "2" + "AB"[k], group: "r2", groupTitle: k === 0 ? "Round 2" : undefined, label: "AB"[k], title, desc, build: tabsCard(mode, name) }));
  t.options = [...r2, ...t.options.map((o, j) => ({ ...o, group: "r1", groupTitle: j === 0 ? "Round 1 (your picks are kept)" : undefined }))];
});

/* ---------- round 3 (2026-10-11) ----------
   Round 2 picks: chips A; Ollama, Settings, Developer B (sections stay open), with "Maybe have an
   expand/collapse all sections (floating?)"; Permissions B (leave it as it is); About A, with "Can we
   redesign the links so they aren't a full row, try some boxes or other options". */
const LINK_VARIANTS = ["tiles", "icons", "list", "qr"];
const LINK_ICONS = {
  code: svg2('<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16"/>'),
  heart: svg2('<path d="M12 20s-7.5-4.6-9.2-9.4C1.6 7.2 3.8 4 7 4c2 0 3.3 1.1 5 3 1.7-1.9 3-3 5-3 3.2 0 5.4 3.2 4.2 6.6C19.5 15.4 12 20 12 20z"/>'),
  out: svg2('<path d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5"/>'),
};
const LINKS = [
  { full: "GitHub", short: "GitHub", ico: "code" },
  { full: "Built on Ollama!", short: "Ollama", ico: "llama" },
  { full: "Bugs & Feature Requests", short: "Bugs & ideas", ico: "bug2" },
  { full: "Support my Steam Sale habit", short: "Support", ico: "heart", qr: true },
];
/* the Links section's four buttons and the QR code become one item */
function linksAsOne(items, variant) {
  const i = items.findIndex((it) => it.t === "sec" && it.label === "Links");
  const rest = items.slice(i + 1);
  const end = rest.findIndex((it) => it.t === "sec");
  const n = end < 0 ? rest.length : end;
  return [...items.slice(0, i + 1), { t: "links", variant }, ...rest.slice(n)];
}
function linksItem(variant, ctx) {
  const ico = (l) => h("span", { class: "k-li", html: l.ico === "code" || l.ico === "heart" ? LINK_ICONS[l.ico] : ICONS2[l.ico] });
  const qr = h("div", { class: "k-lqr", hidden: true }, h("div", { class: "k-qr", html: QR }), h("small", {}, "Scan with your phone to support"));
  const r = ctx.rowId();
  const btn = (l, cls, kids) => {
    const b = h("button", { class: cls, "data-stop": "", "data-row": variant === "list" ? null : r }, ...kids);
    if (l.qr && variant !== "qr") b.addEventListener("click", () => { qr.hidden = !qr.hidden; ctx.changed(); if (!qr.hidden) setTimeout(() => Deck.reveal(qr)); });
    return b;
  };
  if (variant === "tiles") {
    const grid = h("div", { class: "k-ltiles" });
    LINKS.forEach((l, k) => { const b = btn(l, "k-ltile", [ico(l), h("span", {}, l.short)]); b.dataset.row = r + "-" + Math.floor(k / 2); grid.append(b); });
    return h("div", { class: "k-links" }, grid, qr);
  }
  if (variant === "icons") return h("div", { class: "k-links" }, h("div", { class: "k-licons" }, ...LINKS.map((l) => btn(l, "k-licon", [ico(l), h("span", {}, l.short)]))), qr);
  if (variant === "list") return h("div", { class: "k-links" }, ...LINKS.map((l) => btn(l, "k-row k-lrow", [ico(l), h("span", { class: "k-l" }, l.full), h("span", { class: "k-lout", html: l.qr ? "" : LINK_ICONS.out }, l.qr ? "QR ▾" : "")])), qr);
  // qr: three small buttons beside the QR code
  const col = h("div", { class: "k-lcol" }, ...LINKS.filter((l) => !l.qr).map((l) => { const b = btn(l, "k-btn k-lsmall", [ico(l), l.full]); b.removeAttribute("data-row"); return b; }));
  const q = h("button", { class: "k-lqrbtn", "data-stop": "" }, h("div", { class: "k-qr", html: QR }), h("small", {}, "Support my Steam Sale habit"));
  return h("div", { class: "k-links k-lside" }, col, q);
}

const R3_ALL = [
  ["DBm:top", "A line at the top: Open all · Close all", "Two small buttons sit at the very top of the tab, the first place the ring lands. Always in the same place, easy to find; it scrolls away with the list."],
  ["DBm:x", "X opens or closes every section", "Press X anywhere on the tab. A small floating label in the top corner says what X will do (\"X Open all\" or \"X Close all\"). Nothing to walk to, and it never scrolls away."],
  ["DBm:float", "A floating button you can reach", "A small button floats in the bottom corner, over the list (and above the help strip when it shows). Right from any section line jumps to it; A on it opens or closes everything; any other press goes back."],
];
const R3_LINKS = [
  ["A:tiles", "Four boxes, two by two", "GitHub, Ollama, Bugs & ideas and Support as four boxes with an icon. Support opens the QR code under the boxes."],
  ["A:icons", "One row of four icons", "The four links as small icon buttons in a single row, each named underneath. The smallest; Support opens the QR code under the row."],
  ["A:list", "Short one-line links", "Each link is one line with its icon and a small arrow that says it opens outside. Support opens the QR code under it."],
  ["A:qr", "Links beside the QR code", "The QR code stays visible but smaller, on the right with its caption; the three other links sit as small buttons beside it."],
];
(() => {
  const regroup = (opts) => opts.map((o) => ({ ...o, groupTitle: o.groupTitle === "Round 2" ? "Round 2 (your picks are kept)" : o.groupTitle }));
  for (const [id, name] of [["t2", "Ollama"], ["t3", "Settings"], ["t5", "Developer"]]) {
    const t = TABS.find((x) => x.id === id);
    t.title = `${name} tab, round 3: open or close every section`;
    t.today = [
      id === "t2" ? "Round 2: you picked B, sections stay open until closed, and asked: \"Maybe have an expand/collapse all sections (floating?)\"." : "Round 2: you picked B, sections stay open until closed. Round 3 asks the same question as on the Ollama tab.",
      "Everything else here is decided: folded sections, one line per setting, the longer text in the strip at the bottom.",
    ];
    t.deciding = ["Where the open-all / close-all control lives: a line at the top (A), the X button (B), or a floating button (C). One answer can cover all three folded tabs."];
    t.howto = "Click a panel, then use the arrow keys. In B press X; in C press Right on any section line. Enter opens a section, flips a switch or picks a button. Rounds 1 and 2 are further down with your picks.";
    t.options = [...R3_ALL.map(([mode, title, desc], k) => ({ id: "3" + "ABC"[k], group: "r3", groupTitle: k === 0 ? "Round 3: open or close every section" : undefined, label: "ABC"[k], title, desc, build: tabsCard(mode, name) })), ...regroup(t.options)];
  }
  const ab = TABS.find((x) => x.id === "t6");
  ab.title = "About tab, round 3: links that aren't full rows";
  ab.today = ["Round 2: you picked A, and asked: \"Can we redesign the links so they aren't a full row, try some boxes or other options\".", "Today the four links take about 62 px each, plus a 132 px QR code."];
  ab.deciding = ["Which shape the links take. The rest of the tab is decided (A: one line per row, the longer text under the ringed row)."];
  ab.howto = "Click a panel, then use the arrow keys; Enter on Support shows the QR code. The rest of the tab is round 2's A. Rounds 1 and 2 are further down with your picks.";
  ab.options = [...R3_LINKS.map(([mode, title, desc], k) => ({ id: "3" + "ABCD"[k], group: "r3", groupTitle: k === 0 ? "Round 3: the links" : undefined, label: "ABCD"[k], title, desc, build: tabsCard(mode, "About") })), ...regroup(ab.options)];
  const pm = TABS.find((x) => x.id === "t4");
  pm.title = "Permissions tab: decided, leave it as it is";
  pm.today = ["Decided in round 2: you picked B, leave it as it is. The tab is short, so the text costs little.", ...pm.today.slice(1)];
  pm.options = regroup(pm.options);
})();
