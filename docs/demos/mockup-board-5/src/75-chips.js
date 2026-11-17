/* ============================================================
   Tab 5: suggestion chips, softer cut ends.
   The bug as filed: on Main, the second chip's words are cut and reach the screen's right edge. The
   plugin does this on purpose: a chip too short for its words slides them sideways inside the chip
   (PresetChipScrollText, src/features/preset-carousel/presetChipButton.tsx). The two chips drawn are
   the two from the Deck picture of 10 November: "Which Ollama model fits my Deck setup?" and "How do
   I fix Steam Input for this game?" (presets.ts). The slide runs as the plugin's does, with its own
   numbers (presetRowLayout.ts): wait 1.5 s, slide at 20 points a second, stand 1 s at the end, snap
   back in 0.4 s, slide again, stand 1 s, then the row swaps the chip (1.5 s out, 1.2 s in).
     today  the plugin's own: an 8 point fade, on the side the words leave
     A      the same slide with a clear 24 point fade at the cut ends
     B      A, and the row stops 8 points short of both edges of the panel
     C      nothing slides at rest: a long chip ends in "…" and slides only while the ring is on it
     Wild   the words wrap onto two lines, nothing slides or fades
   Every name here starts with b5t5 so it cannot clash with another tab's file.
   ============================================================ */
const B5T5_WORDS = ["Which Ollama model fits my Deck setup?", "How do I fix Steam Input for this game?"];
const B5T5_PLAN = { speed: 20, read: 1000, snap: 400, fadeOut: 1500, fadeIn: 1200 }; // the plugin's numbers
let B5T5_UID = 0;

/* the fade at the cut ends: which side the words are leaving decides which end is faded (as the plugin does) */
function b5t5Mask(kind, px) {
  if (!px) return "";
  const f = px + "px";
  if (kind === "waiting") return `linear-gradient(to right, #000 calc(100% - ${f}), transparent)`;
  if (kind === "mid") return `linear-gradient(to right, transparent, #000 ${f}, #000 calc(100% - ${f}), transparent)`;
  if (kind === "end") return `linear-gradient(to right, transparent, #000 ${f})`;
  return "";
}

/* One chip. cfg: fade (points), mode "rest" (slides by itself, as today), "ring" (slides only while the ring is on it),
   "wrap" (never slides), wait (ms before it starts), offset (ms before its first turn). */
function b5t5Chip(text, cfg) {
  const run = h("span", { class: "b5t5-run" }, text);
  const room = h("span", { class: "b5t5-room" }, run);
  const btn = h("button", { class: "b5t5-chip", "data-stop": "", "data-row": "b5t5-" + cfg.uid, title: text }, room);
  let timers = [], ov = 0, ringed = false, holding = false, lastW = -1, dead = false;
  const T = (ms, fn) => { timers.push(setTimeout(() => { if (!dead) fn(); }, ms)); };
  const clear = () => { timers.forEach(clearTimeout); timers = []; };
  const mask = (kind) => { const m = b5t5Mask(kind, cfg.fade); room.style.webkitMaskImage = m; room.style.maskImage = m; };
  const move = (px, ms, ease) => { run.style.transition = ms ? `transform ${ms}ms ${ease || "linear"}` : "none"; run.style.transform = `translateX(${-px}px)`; };
  const measure = () => {
    if (!room.clientWidth) return false;
    ov = Math.max(0, Math.ceil(run.scrollWidth - room.clientWidth));
    return true;
  };
  const crawlMs = () => (ov / B5T5_PLAN.speed) * 1000;

  /* wait, slide, stand, snap back, slide again, stand: the plugin's whole time line for a long chip */
  function passes(waitMs, then) {
    room.classList.remove("b5t5-ell");
    mask("waiting"); move(0, 0);
    let t = waitMs;
    T(t, () => { mask("mid"); move(ov, crawlMs()); });
    t += crawlMs();
    T(t, () => mask("end"));
    t += B5T5_PLAN.read;
    T(t, () => { mask("mid"); move(0, B5T5_PLAN.snap, "ease-out"); });
    t += B5T5_PLAN.snap;
    T(t, () => move(ov, crawlMs()));
    t += crawlMs();
    T(t, () => mask("end"));
    t += B5T5_PLAN.read;
    T(t, then);
  }
  /* the row swaps the chip once its words have been read twice, unless the ring is on it */
  function leave() {
    if (ringed) { holding = true; return; }
    btn.style.opacity = "0";
    T(B5T5_PLAN.fadeOut, () => {
      move(0, 0); mask("waiting");
      btn.classList.add("b5t5-in"); btn.style.opacity = "1";
      T(B5T5_PLAN.fadeIn, () => btn.classList.remove("b5t5-in"));
      turn(0);
    });
  }
  function turn(first) { passes(1500 + first, leave); }
  function ringLoop() {
    passes(cfg.wait || 800, () => { mask("mid"); move(0, B5T5_PLAN.snap, "ease-out"); T(B5T5_PLAN.snap, ringLoop); });
  }
  function restart() {
    clear();
    if (!measure()) return;
    holding = false;
    btn.style.opacity = "1";
    if (cfg.mode === "wrap" || ov <= 0) { mask(""); move(0, 0); room.classList.remove("b5t5-ell"); return; }
    if (cfg.mode === "rest") { turn(cfg.offset || 0); return; }
    // ring: still, with a cut ending in "…", until the ring arrives
    mask(""); move(0, 0);
    if (ringed) ringLoop(); else room.classList.add("b5t5-ell");
  }
  function onRing(on) {
    ringed = on;
    if (cfg.mode === "rest") { if (!on && holding) { holding = false; leave(); } return; }
    if (cfg.mode !== "ring" || !measure() || ov <= 0) return;
    clear();
    if (on) ringLoop();
    else { mask("mid"); move(0, B5T5_PLAN.snap, "ease-out"); T(B5T5_PLAN.snap, () => { mask(""); room.classList.add("b5t5-ell"); }); }
  }

  const ro = new ResizeObserver(() => { const w = room.clientWidth; if (w !== lastW) { lastW = w; restart(); } });
  ro.observe(room);
  const mo = new MutationObserver(() => { const on = btn.classList.contains("ring"); if (on !== ringed) onRing(on); });
  mo.observe(btn, { attributes: true, attributeFilter: ["class"] });
  btn.b5t5info = () => { measure(); return { w: btn.offsetWidth, room: room.clientWidth, ov, secs: ov / B5T5_PLAN.speed }; };
  btn.b5t5destroy = () => { dead = true; clear(); ro.disconnect(); mo.disconnect(); };
  return btn;
}

/* The Main tab as it ships, with the chip row drawn the way the option says. */
function b5t5Panel(cfg0) {
  const cfg = { ...cfg0, uid: ++B5T5_UID };
  const chips = B5T5_WORDS.map((t, i) => b5t5Chip(t, { ...cfg, offset: i * 2500 }));
  chips[0].setAttribute("data-start", "");
  const row = h("div", { class: "b5t5-row" + (cfg.inset ? " b5t5-inset" : "") + (cfg.mode === "wrap" ? " b5t5-two" : "") }, ...chips);
  const dockEl = dock2({ game: "No game" });
  dockEl.querySelector(".k2-chips").replaceWith(row);
  const turn = h("div", { class: "turn" }, qBubble2(SAMPLE.q, { stop: false }), aBubble2(SAMPLE.a, { stopEach: false }));
  const body = mainTab2({ transcript: [turn], dockEl });
  const root = deckFrame({ body, header: false });
  root.classList.add("b5t5", "b5t5-v-" + cfg.id);
  root.b5t5chips = chips;
  root.b5t5row = row;
  root.b5t5destroy = () => chips.forEach((c) => c.b5t5destroy());
  return root;
}

/* Today's row height and chat height, read once from a throw-away copy of today's panel */
let B5T5_REF = null;
function b5t5Ref() {
  if (B5T5_REF) return B5T5_REF;
  const host = h("div", { style: "position:fixed;left:-9999px;top:0;visibility:hidden;pointer-events:none" });
  document.body.append(host);
  const root = b5t5Panel({ id: "ref", fade: 8, mode: "rest" });
  host.append(root);
  const ref = { row: root.b5t5row.offsetHeight, chat: $(".k2-scroll", root).offsetHeight, chipW: root.b5t5chips[0].offsetWidth };
  root.b5t5destroy();
  host.remove();
  return (B5T5_REF = ref);
}

function b5t5Card(cfg, { hint = "" } = {}) {
  return () => {
    const root = b5t5Panel(cfg);
    const out = h("p", { class: "b5t5-measure" });
    const fill = () => {
      const [a, b] = root.b5t5chips.map((c) => c.b5t5info());
      const row = root.b5t5row.offsetHeight, chat = $(".k2-scroll", root).offsetHeight;
      if (!a.w || !chat) return;
      const ref = b5t5Ref();
      const d = (x, y) => (x === y ? "same as today" : `${x > y ? "+" : "−"}${Math.abs(x - y)} on today`);
      const parts = ["Measured from the drawing:", "each chip is ", h("b", {}, `${a.w} pts`), h("span", { class: "vs" }, `(${d(a.w, ref.chipW)})`)];
      if (cfg.mode !== "wrap") {
        const s = (i) => (i.ov > 0 ? `${i.ov} pts, ${i.secs.toFixed(1)} s a pass` : "fits");
        parts.push("the words need more room than the chip has by ", h("b", {}, s(a)), " and ", h("b", {}, s(b)));
      }
      parts.push("chip row ", h("b", {}, `${row} pts`), "chat above it ", h("b", {}, `${chat} pts`), h("span", { class: "vs" }, `(${d(chat, ref.chat)})`));
      out.replaceChildren(...parts);
    };
    new ResizeObserver(() => setTimeout(fill, 30)).observe(root);
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(fill, 60));
    return [root, out, hint ? h("p", { class: "b5t5-hint" }, hint) : null];
  };
}

/* ============================================================
   Round 2 machinery (2026-11-15). The maintainer liked Today (long chips slide inside their box) and Wild (two
   lines, no sliding), and said: "Two lines only when selected". A chip stays one line and slides as today; it
   opens to two lines (or, in C, widens) only while the D-pad ring is on it. Three ways, all drivable:
     2A  the row grows: the chip row becomes two lines tall and the chat above loses that height
     2B  the chip opens upward as a bubble over the chat's bottom edge; nothing moves
     2C  the chip widens across the row on one line; its neighbours shrink to a stub (no second line at all)
   Numbers shown under each panel are read from a hidden twin of the drawn panel, not worked out by hand.
   ============================================================ */
const B5T5_SETS = [
  { id: "two", label: "Two long chips", texts: [B5T5_WORDS[0], B5T5_WORDS[1]] },
  { id: "mix", label: "One long, one short", texts: [B5T5_WORDS[0], "Battery tips"] },
  { id: "three", label: "Three chips", texts: [B5T5_WORDS[0], "Battery tips", B5T5_WORDS[1]] },
];
const B5T5_OPEN_MS = 160;
const b5t5Reduced = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
const b5t5Ms = () => (b5t5Reduced() ? 0 : B5T5_OPEN_MS);

/* One round 2 chip, in its slot. Long ones slide at rest exactly as Today's (same wait, speed, stand, snap, fades);
   open() stops the slide and lets the panel show every word; close() starts the slide's time line again. */
function b5t5Chip2(text, cfg) {
  const run = h("span", { class: "b5t5-run" }, text);
  const room = h("span", { class: "b5t5-room" }, run);
  const btn = h("button", { class: "b5t5-chip b5t5-c2", "data-stop": "", "data-row": "b5t5-" + cfg.uid, title: text }, room);
  const slot = h("div", { class: "b5t5-slot" }, btn);
  let timers = [], ov = -1, nat = 0, state = "rest", lastW = -1, dead = false;
  const T = (ms, fn) => { timers.push(setTimeout(() => { if (!dead) fn(); }, ms)); };
  const clear = () => { timers.forEach(clearTimeout); timers = []; };
  const mask = (kind) => { const m = b5t5Mask(kind, 8); room.style.webkitMaskImage = m; room.style.maskImage = m; };
  const move = (px, ms, ease) => { run.style.transition = ms ? `transform ${ms}ms ${ease || "linear"}` : "none"; run.style.transform = `translateX(${-px}px)`; };
  const measure = () => {
    if (!room.clientWidth) return false;
    ov = Math.max(0, Math.ceil(run.scrollWidth - room.clientWidth));
    nat = Math.ceil(run.scrollWidth);
    return true;
  };
  const crawlMs = () => (ov / B5T5_PLAN.speed) * 1000;
  function passes(waitMs, then) {
    room.classList.remove("b5t5-ell");
    mask("waiting"); move(0, 0);
    let t = waitMs;
    T(t, () => { mask("mid"); move(ov, crawlMs()); });
    t += crawlMs();
    T(t, () => mask("end"));
    t += B5T5_PLAN.read;
    T(t, () => { mask("mid"); move(0, B5T5_PLAN.snap, "ease-out"); });
    t += B5T5_PLAN.snap;
    T(t, () => move(ov, crawlMs()));
    t += crawlMs();
    T(t, () => mask("end"));
    t += B5T5_PLAN.read;
    T(t, then);
  }
  function leave() {
    if (state !== "rest") return;
    btn.style.opacity = "0";
    T(B5T5_PLAN.fadeOut, () => {
      move(0, 0); mask("waiting");
      btn.classList.add("b5t5-in"); btn.style.opacity = "1";
      T(B5T5_PLAN.fadeIn, () => btn.classList.remove("b5t5-in"));
      passes(1500, leave);
    });
  }
  function restart() {
    clear();
    if (state !== "rest" || !measure()) return;
    btn.style.opacity = "1";
    if (ov <= 0) { mask(""); move(0, 0); room.classList.remove("b5t5-ell"); return; }
    // reduced motion: the plugin's own fallback is the words cut with "…", nothing moves
    if (b5t5Reduced()) { mask(""); move(0, 0); room.classList.add("b5t5-ell"); return; }
    passes(1500 + (cfg.offset || 0), leave);
  }
  const textW = (s) => {
    const old = run.textContent, ell = room.classList.contains("b5t5-ell");
    room.classList.remove("b5t5-ell");
    run.textContent = s;
    const w = run.offsetWidth;
    run.textContent = old;
    if (ell) room.classList.add("b5t5-ell");
    return w;
  };
  const api = {
    slot,
    isLong() { if (ov < 0) measure(); return ov > 0; },
    natural() { if (ov < 0) measure(); return nat; },
    open() {
      if (!api.isLong()) return false;
      clear(); state = "sel";
      run.textContent = text;
      room.classList.remove("b5t5-ell");
      run.style.transition = "none"; run.style.transform = "none"; mask("");
      btn.style.opacity = "1"; btn.classList.remove("b5t5-in");
      btn.classList.add("b5t5-sel");
      return true;
    },
    close() {
      if (state !== "sel") return;
      btn.classList.remove("b5t5-sel");
      btn.style.left = ""; btn.style.width = "";
      state = "closing";
      T(b5t5Ms(), () => { state = "rest"; restart(); });
    },
    /* C only: this chip is squeezed to a stub; show its first word and "…" (or all of it if that fits, or just "…") */
    stub(on, roomPx) {
      if (on) {
        clear(); state = "stub";
        btn.classList.remove("b5t5-sel"); btn.style.opacity = "1";
        room.classList.remove("b5t5-ell"); mask(""); move(0, 0);
        let s = text;
        if (textW(text) > roomPx) { const fw = text.split(" ")[0] + "…"; s = textW(fw) <= roomPx ? fw : "…"; }
        run.textContent = s;
        api.stubText = s;
      } else if (state === "stub") {
        run.textContent = text; state = "closing"; api.stubText = null;
        T(b5t5Ms(), () => { state = "rest"; restart(); });
      }
    },
    info() { return { ov, secs: ov / B5T5_PLAN.speed, lines: Math.round(room.scrollHeight / 13) }; },
    destroy() { dead = true; clear(); ro.disconnect(); },
    stubText: null,
    text,
  };
  const ro = new ResizeObserver(() => { const w = room.clientWidth; if (state === "rest" && w && w !== lastW) { lastW = w; restart(); } });
  ro.observe(room);
  btn.b5t5c = api;
  return btn;
}

/* The Main tab with the round 2 chip row. mode: "a" row grows, "b" floats, "c" widens. setId: one of B5T5_SETS. */
function b5t5Panel2(mode, setId) {
  const uid = ++B5T5_UID;
  const set = B5T5_SETS.find((s) => s.id === setId) || B5T5_SETS[0];
  const n = set.texts.length;
  const chips = set.texts.map((t, i) => b5t5Chip2(t, { uid, offset: i * 2500 }));
  chips[0].setAttribute("data-start", "");
  const row = h("div", { class: "b5t5-r2row b5t5-r" + mode }, ...chips.map((c) => c.b5t5c.slot));
  const W = 300, GAP = 6, PAD = 18; // the panel's width, the chip gap, the chip's side padding plus border
  const restW = (W - GAP * (n - 1)) / n;
  if (mode === "c") chips.forEach((c) => { c.b5t5c.slot.style.width = restW + "px"; });
  const dockEl = dock2({ game: "No game" });
  dockEl.querySelector(".k2-chips").replaceWith(row);
  // The end of the chat as on the Deck: the answer, "Was this helpful?" with its buttons, then the Show details line.
  // None of them is a place for the ring: here the ring only travels between the chips and the question box.
  const noStops = (el) => { el.removeAttribute("data-stop"); el.removeAttribute("data-row"); $$("[data-stop]", el).forEach((x) => { x.removeAttribute("data-stop"); x.removeAttribute("data-row"); }); return el; };
  const turn = h("div", { class: "turn" }, qBubble2(SAMPLE.q, { stop: false }), aBubble2(SAMPLE.a, { stopEach: false }), ...rateRow().map(noStops), noStops(detailsLine()));
  const body = mainTab2({ transcript: [turn], dockEl });
  const root = deckFrame({ body, header: false });
  root.classList.add("b5t5", "b5t5-v-2" + mode);
  const sc = $(".k2-scroll", root);
  // The chat is shown scrolled to its end, as it is on the Deck, and stays there when its height changes.
  const pin = () => { sc.scrollTop = sc.scrollHeight; };
  const pinRo = new ResizeObserver(pin);
  pinRo.observe(sc); pinRo.observe(turn);
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(pin, 30));

  let cur = -2, selIdx = -1;
  /* Show the chip at idx opened (if its words are long), the rest shut; -1 shuts everything. */
  function apply(idx) {
    const sel = idx >= 0 && chips[idx].b5t5c.isLong() ? idx : -1;
    selIdx = sel;
    let selW = 0, stubW = 0;
    if (mode === "c" && sel >= 0) {
      const minStub = 30;
      selW = Math.min(chips[sel].b5t5c.natural() + PAD + 1, W - GAP * (n - 1) - (n - 1) * minStub);
      stubW = (W - GAP * (n - 1) - selW) / (n - 1);
    }
    chips.forEach((c, i) => {
      const a = c.b5t5c;
      if (i === sel) {
        a.open();
        if (mode === "b") {
          const bw = n > 2 ? 147 : a.slot.offsetWidth;
          const left = Math.min(0, W - a.slot.offsetLeft - bw);
          c.style.width = bw + "px"; c.style.left = left + "px";
        }
        if (mode === "c") a.slot.style.width = selW + "px";
      } else if (mode === "c" && sel >= 0) {
        a.close(); a.stub(true, stubW - PAD); a.slot.style.width = stubW + "px";
      } else {
        a.close(); a.stub(false);
        if (mode === "c") a.slot.style.width = restW + "px";
      }
    });
    root.b5t5state = { sel, selW, stubW };
  }
  function sync() {
    const idx = chips.findIndex((c) => c.classList.contains("ring"));
    if (idx === cur) return;
    cur = idx;
    apply(idx);
  }
  const mo = new MutationObserver(sync);
  chips.forEach((c) => mo.observe(c, { attributes: true, attributeFilter: ["class"] }));
  root.b5t5chips = chips;
  root.b5t5row = row;
  root.b5t5apply = apply;
  root.b5t5pin = pin;
  root.b5t5destroy = () => { mo.disconnect(); pinRo.disconnect(); chips.forEach((c) => c.b5t5c.destroy()); };
  return root;
}

/* Read the numbers from a hidden twin of the panel: shut, then with the first long chip opened (no animation). */
function b5t5Probe(mode, setId) {
  const host = h("div", { style: "position:fixed;left:-9999px;top:0;visibility:hidden;pointer-events:none" });
  document.body.append(host);
  const root = b5t5Panel2(mode, setId);
  root.classList.add("b5t5-instant");
  host.append(root);
  const qam = $(".qam", root), sc = $(".k2-scroll", root), ans = $(".k2-answer", root), det = $(".detailsline", root), rate = $(".rate", root);
  const read = () => {
    root.b5t5pin();
    const q = qam.getBoundingClientRect(), s = sc.getBoundingClientRect(), a = ans.getBoundingClientRect(), d = det.getBoundingClientRect(), rt = rate.getBoundingClientRect();
    return { row: root.b5t5row.offsetHeight, chat: sc.offsetHeight, ansTop: a.top - q.top, detTop: d.top - q.top, s, a, d, rt };
  };
  const rest = read();
  const idx = root.b5t5chips.findIndex((c) => c.b5t5c.isLong());
  const out = { rest, idx };
  if (idx >= 0) {
    root.b5t5apply(idx);
    void root.offsetHeight;
    const sel = read();
    out.sel = sel;
    const c = root.b5t5chips[idx], r = c.getBoundingClientRect();
    out.chip = { w: r.width, h: r.height, top: r.top - sc.getBoundingClientRect().top, left: r.left - qam.getBoundingClientRect().left };
    out.info = c.b5t5c.info();
    out.coverChat = Math.max(0, sel.s.bottom - r.top);
    const over = (box) => Math.max(0, Math.min(box.bottom, r.bottom) - Math.max(box.top, r.top)); // vertical pts the bubble covers of a box
    out.coverLine = over(sel.d); out.lineH = sel.d.height;
    out.coverRate = over(sel.rt); out.coverAnswer = over(sel.a);
    out.gapBelowLine = sel.s.bottom - sel.d.bottom;
    out.coverNeighbour = 0;
    root.b5t5chips.forEach((o, i) => {
      if (i === idx) return;
      const orc = o.getBoundingClientRect();
      const ox = Math.max(0, Math.min(r.right, orc.right) - Math.max(r.left, orc.left));
      if (ox > 0 && r.top < orc.bottom && r.bottom > orc.top) out.coverNeighbour += ox;
    });
    out.stubs = root.b5t5chips.map((o, i) => (i === idx ? null : { w: o.getBoundingClientRect().width, text: o.b5t5c.stubText })).filter(Boolean);
    out.selW = r.width;
  }
  root.b5t5destroy();
  host.remove();
  return out;
}

function b5t5Card2(mode, desc) {
  return () => {
    let setId = "two";
    let root = b5t5Panel2(mode, setId);
    const out = h("p", { class: "b5t5-measure" });
    const fill = () => {
      const m = b5t5Probe(mode, setId);
      if (!m.rest.chat) return;
      const long = B5T5_SETS.find((s) => s.id === setId).texts[m.idx];
      const bits = ["Measured from the drawing, with the ring on “" + (long || "").replace(/(.{22}).*/, "$1") + "…”: "];
      const b = (x) => h("b", {}, x);
      const vs = (x) => h("span", { class: "vs" }, x);
      const r1 = (x) => Math.round(x * 10) / 10;
      if (m.idx < 0) { out.replaceChildren(h("span", {}, "No chip here has words too long for it, so nothing changes.")); return; }
      if (mode === "a") {
        bits.push("the chip row goes from ", b(`${m.rest.row} to ${m.sel.row} pts`), ", so the chat above loses ", b(`${r1(m.rest.chat - m.sel.chat)} pts`), " ", vs(`(${m.rest.chat} to ${m.sel.chat})`),
          ". The chat stays scrolled to its end, so the answer and the Show details line under it move up ", b(`${Math.round(m.rest.detTop - m.sel.detTop)} pts`), ". The words need ", b(`${m.info.lines} lines`), m.info.lines > 2 ? [" ", vs("(only two show, so the second ends in …)")] : null, ".");
      } else if (mode === "b") {
        bits.push("the row stays ", b(`${m.sel.row} pts`), " and the chat stays ", b(`${m.sel.chat} pts`), ". The bubble is ", b(`${r1(m.chip.h)} pts tall, ${r1(m.chip.w)} wide`),
          ", and it covers ", b(`${r1(m.coverChat)} pts`), " of the chat's bottom edge. With the chat at its end, that is empty space: the Show details line stops ", b(`${r1(m.gapBelowLine)} pts`), " above the edge, so ",
          b(m.coverLine + m.coverRate + m.coverAnswer > 0 ? `${r1(m.coverLine)} pts of that line, ${r1(m.coverRate)} of the helpful buttons and ${r1(m.coverAnswer)} of the answer box are covered` : "no words, buttons or answer box are covered"),
          ". If the chat is scrolled up, it covers ", b(`${r1(m.coverChat)} pts`), " of whatever text is there",
          m.coverNeighbour > 0 ? [". It also hides ", b(`${r1(m.coverNeighbour)} pts`), " of the chip beside it"] : null, ". The words need ", b(`${m.info.lines} lines`), ".");
      } else {
        bits.push("the row stays ", b(`${m.sel.row} pts`), " and the chat stays ", b(`${m.sel.chat} pts`), ". The chip widens from ", b(`${r1(m.rest.chat ? (300 - 6 * (B5T5_SETS.find((s) => s.id === setId).texts.length - 1)) / B5T5_SETS.find((s) => s.id === setId).texts.length : 0)} to ${r1(m.selW)} pts`),
          ", and the chip" + (m.stubs.length > 1 ? "s" : "") + " beside it shrink" + (m.stubs.length > 1 ? "" : "s") + " to ", b(m.stubs.map((s) => `${r1(s.w)} pts (“${s.text}”)`).join(" and ")), ".");
      }
      bits.push(" ", vs("Heights are exact. Word widths use a stand-in font here, so on the Deck they differ a little."));
      out.replaceChildren(h("span", {}, ...bits.flat().filter((x) => x != null)));
    };
    const settle = () => (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(fill, 80));
    const set = h("div", { class: "b5t5-set", role: "group", "aria-label": "Which chips the row shows" },
      ...B5T5_SETS.map((s) => h("button", { type: "button", "aria-pressed": String(s.id === setId), "data-set": s.id, onclick: (e) => {
        if (s.id === setId) return;
        setId = s.id;
        for (const bt of $$("button", set)) bt.setAttribute("aria-pressed", String(bt.dataset.set === setId));
        const next = b5t5Panel2(mode, setId);
        root.replaceWith(next);
        root.b5t5destroy();
        root = next;
        settle();
      } }, s.label)));
    settle();
    return [set, root, out, h("p", { class: "b5t5-hint" }, desc)];
  };
}

const B5T5_R2 = [
  { id: "2A", group: "r2", groupTitle: "Round 2: two lines only when selected", label: "A", title: "The row grows while a long chip is selected",
    desc: "A chip stays one line and slides as it does today. While the ring is on a long chip, the whole chip row opens to two lines tall and the chat above gives up that height; when the ring leaves, it closes again. Chips that fit never change. It opens and closes in 0.16 seconds; with reduced motion, at once.",
    build: b5t5Card2("a", "Click the panel. The ring lands on the first chip and the row opens. Right and Left move between chips, Down goes to the question box (the row closes), Up comes back.") },
  { id: "2B", group: "r2", label: "B", title: "The chip floats up over the chat, nothing moves",
    desc: "A chip stays one line and slides as today. The chip with the ring opens upward into a two-line bubble that floats over the bottom edge of the chat. The chip row keeps its height, the chat keeps its height, and the question box does not move. The bubble covers a little of the chat for as long as the ring is on it, and is opaque so the answer under it does not show through. It opens and closes in 0.16 seconds; with reduced motion, at once.",
    build: b5t5Card2("b", "Click the panel. The ring lands on the first chip and the bubble opens upward. Right and Left move between chips, Down goes to the question box (the bubble closes), Up comes back.") },
  { id: "2C", group: "r2", label: "C", title: "The chip takes the row, on one line (no second line)",
    desc: "Not the two lines you asked for; it is here so you can compare. While the ring is on a long chip it widens across the row on one line, so every word shows with no second line and nothing changes height. Its neighbours shrink to a stub: their first word and “…”. A chip that fits never changes. Chips not selected slide as today. It opens and closes in 0.16 seconds; with reduced motion, at once.",
    build: b5t5Card2("c", "Click the panel. The ring lands on the first chip and it widens. Right and Left move between chips, Down goes to the question box (the row goes back), Up comes back.") },
];

const B5T5_TAB = {
  id: "t5", n: 5, name: "Suggestion chips", stars: 1,
  title: "Suggestion chips: softer cut ends",
  today: [
    "The two chips above the question box are not wide enough for their words, so the words slide sideways inside the chip: they wait 1.5 seconds, slide to the end, stand for a second, jump back and slide again. While they slide, the end they are leaving is cut.",
    "On the Deck picture the first chip reads \"Which Ollama model fits\" and stops. The second shows \"ix Steam Input for this ga\", caught mid-slide. The row also runs right to the screen's edge, as the question box does.",
    "This is how it was designed, not a fault. The edges already fade, but by only 8 points, which is hard to see.",
  ],
  deciding: [
    "You chose to soften it and keep the sliding: make the cut ends fade clearly, and stop the row a few points short of the screen's edges.",
    "How strong the fade is (A), whether the row also stops short (B), and whether chips should slide at all when nothing is selected (C).",
    "Open question: if the chip row stops short of the edges, should the question box below stop short too, so the two line up?",
  ],
  howto: "The chips slide by themselves, each on its own beat, so watch for a minute: after the second slide a chip fades out and comes back, as the plugin's row does. Click a panel, then Left and Right move the ring between the two chips. A chip with the ring on it is held in place and is not swapped. The numbers under each panel are measured from the drawing.",
  options: [
    { id: "today", label: "Today", today: true, title: "As it is now: an 8 point fade, row to the edge",
      desc: "The plugin as it ships. The words slide and the end they leave fades by only 8 points, so the cut looks hard. The chips fill the row edge to edge, and the second chip touches the screen's right edge.",
      build: b5t5Card({ id: "t", fade: 8, mode: "rest" }) },
    { id: "A", label: "A", title: "A clear fade at both cut ends",
      desc: "The same slide and timing. The fade is 24 points, so the words melt away at the cut end instead of stopping. While the words slide, both ends fade. Nothing else changes: the chips still reach the edge.",
      build: b5t5Card({ id: "a", fade: 24, mode: "rest" }) },
    { id: "B", label: "B", title: "A clear fade, and the row stops short of the edges",
      desc: "A, plus 8 points of space at each side of the row. The chips get a little narrower, so the words slide a little further. The question box below still runs edge to edge, so the row is narrower than the box.",
      build: b5t5Card({ id: "b", fade: 24, mode: "rest", inset: true }) },
    { id: "C", label: "C", title: "Still at rest, sliding only while selected",
      desc: "Nothing moves until the ring is on a chip. A chip with long words ends in \"…\". Put the ring on it and, after a short wait, the words slide to the end, stand, jump back and slide again until the ring moves away; the chip then goes back to \"…\". Quietest to look at, but you have to select a chip to read it.",
      build: b5t5Card({ id: "c", fade: 24, mode: "ring", wait: 800 }, { hint: "Click the panel. The ring lands on the first chip and it starts to slide; Right moves to the second." }) },
    { id: "wild", label: "Wild", wild: true, title: "Two lines, no sliding",
      desc: "The words wrap onto two lines in a taller chip. Nothing slides and nothing is cut, except words past two lines, which end in \"…\". The cost is height: the chip row grows and the chat above it shrinks by the same amount, as measured below.",
      build: b5t5Card({ id: "w", fade: 0, mode: "wrap" }) },
  ],
};

/* Round 2 goes above round 1; round 1 and its picks stay below, unchanged. */
B5T5_TAB.title = "Suggestion chips, round 2: two lines only while a chip is selected";
B5T5_TAB.today = [
  "Round 1: you liked Today (a long chip slides its words inside its box, and the row runs to the screen's edges) and Wild (the words wrap onto two lines, with no sliding). Wild costs 11 points of chat height.",
  "Asked which, you answered: \"Two lines only when selected\". So a chip stays one line and slides as it does today. It opens to two lines only while the D-pad ring is on it.",
  "A chip that already fits on one line never changes.",
];
B5T5_TAB.deciding = [
  "Round 2 asks how the chip should open: does the whole row grow (A), does the chip float up over the chat (B), or does it widen across the row on one line (C)?",
  "A makes the chat lose 11 points while the ring is on a long chip. B keeps everything in place but covers a little of the chat. C is not two lines at all; it is there to compare.",
  "Each panel has a switch for two long chips, one long and one short, or three chips, because the real row can show more than two.",
];
B5T5_TAB.howto = "Click a panel, then use the arrow keys. The ring lands on the first chip and it opens. Left and Right move between chips; Down moves to the question box and Up comes back, so you can feel the row open and close. The chat is shown scrolled to its end, as on the Deck. Chips that are not selected slide on their own, so wait a few seconds. The numbers under each panel are measured from the drawing. Round 1 is further down, with your picks.";
B5T5_TAB.options = [...B5T5_R2, ...B5T5_TAB.options.map((o, i) => ({ ...o, group: "r1", groupTitle: i === 0 ? "Round 1 (your picks are kept)" : undefined }))];
TABS.push(B5T5_TAB);
