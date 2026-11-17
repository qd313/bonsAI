/* ============================================================
   Board 5, tab 3: the AI models box (roadmap, Features, three stars).
   "A much bigger catalog and far simpler filters."
   Every real fact below is read from the plugin's code at tip d58e3155:
   - the 25 models, with their size, licence class, group, good-for tags and star rating, are copied from
     the built-in model list (pullModelCatalog.ts);
   - today's filters, their matching rules, their order and their defaults are ported from
     pullModelFilters.ts, usePullModelTableData.ts and pullModelsBoxMemory.ts;
   - the list's rows, columns and wording come from PullModelsModal.tsx and its stylesheet;
   - the "Suggested" chips are ported from pullModelRecommendations.ts.
   The 35 extra rows in the "about 60" view are made up on purpose and marked "Example row": no size, no stars.
   ============================================================ */

/* tag, size in GB, month released, licence label, licence class, group, good-for tags, stars out of 6 */
const b5t3RealRows = [
  ["qwen2.5vl:3b", 3.2, "2025-01", "Qwen Research (3B size)", "open_weight", "essentials", ["chat","vision","ocr","strategy"], 6],
  ["qwen3.5:4b", 3.4, "2026-02", "Apache 2.0", "foss", "essentials", ["chat","vision","ocr","strategy"], 6],
  ["gemma4:e2b-it-qat", 4.3, "2026-04", "Apache 2.0 (Gemma)", "foss", "essentials", ["chat","vision","ocr","strategy"], 6],
  ["qwen2.5:7b", 4.7, "2024-09", "Apache 2.0", "foss", "smallest", ["chat","strategy"], 5],
  ["llava:7b", 4.7, "2024-01", "Apache 2.0", "foss", "smallest", ["vision","ocr"], 4],
  ["gemma4:latest", 9.6, "2026-04", "Apache 2.0 (Gemma)", "foss", "smallest", ["chat","vision"], 4],
  ["gemma3:4b", 3.3, "2025-03", "Gemma Terms", "open_weight", "smallest", ["chat","vision"], 4],
  ["qwen3:1.7b", 1.4, "2025-04", "Apache 2.0", "foss", "smallest", ["strategy","chat"], 5],
  ["gemma3:1b", 0.8, "2025-03", "Gemma Terms", "open_weight", "smallest", ["chat"], 4],
  ["qwen2.5:3b", 1.9, "2024-09", "Qwen Research (3B size)", "open_weight", "smallest", ["chat"], 5],
  ["qwen2.5:1.5b", 1, "2024-09", "Apache 2.0", "foss", "smallest", ["chat"], 3],
  ["llama3.2:3b", 2, "2024-09", "Llama 3.2", "open_weight", "smallest", ["chat"], 5],
  ["llama3.2:1b", 1.3, "2024-09", "Llama 3.2", "open_weight", "smallest", ["chat"], 5],
  ["moondream", 1.7, "2024-03", "Apache 2.0", "unknown", "smallest", ["vision","ocr"], 4],
  ["qwen2.5:14b", 9, "2024-09", "Apache 2.0", "foss", "stretch", ["strategy","chat"], 4],
  ["minicpm-v:8b", 5.5, "2024-08", "MiniCPM", "unknown", "stretch", ["vision","ocr"], 4],
  ["llama3.2-vision:11b", 7.8, "2024-09", "Llama 3.2", "open_weight", "stretch", ["vision","ocr"], 3],
  ["gemma4:12b-it-qat", 7.2, "2026-06", "Apache 2.0 (Gemma)", "foss", "stretch", ["chat","vision","ocr","strategy"], 3],
  ["qwen3.5:9b", 6.6, "2026-03", "Apache 2.0", "foss", "stretch", ["chat","vision","ocr","strategy"], 4],
  ["granite4.2:8b", 5.3, "2026-08", "Apache 2.0", "foss", "stretch", ["chat","strategy"], 4],
  ["gemma4:e4b-it-qat", 6.1, "2026-04", "Apache 2.0 (Gemma)", "foss", "stretch", ["chat","vision","ocr","strategy"], 4],
  ["lfm2.5:8b", 5.2, "2026-05", "LFM Open License v1.0", "open_weight", "stretch", ["chat","strategy"], 4],
  ["deepseek-r1:1.5b", 1.1, "2025-01", "MIT", "open_weight", "specialist", ["strategy"], 4],
  ["llava-phi3", 2.9, "2024-04", "MIT", "foss", "specialist", ["vision"], 4],
  ["qwen2.5-coder:3b", 1.9, "2024-11", "Qwen Research (3B size)", "open_weight", "specialist", ["coding"], 3],
];
const B5T3_GROUPS = ["essentials", "smallest", "stretch", "specialist"];
const B5T3_GROUP_TODAY = { essentials: "Deck essentials", smallest: "More models", stretch: "Expert (large)", specialist: "Specialist" };
const B5T3_GROUP_NEW = { essentials: "Recommended for this Deck", smallest: "More that fit this Deck", stretch: "Bigger and slower on a Deck", specialist: "Specialist" };
/* the "!" the list puts after a name today (the plugin's own list of tags it tries last) */
const B5T3_BANG = new Set(["qwen2.5:1.5b", "qwen2.5:7b", "qwen2.5:14b", "llava:7b", "gemma3:4b", "gemma3:1b", "llama3.2:3b", "llama3.2:1b"]);
const B5T3_STRETCH_ORDER = ["gemma4:12b-it-qat", "qwen3.5:9b", "granite4.2:8b", "gemma4:e4b-it-qat", "lfm2.5:8b"];
/* the pretend Deck: two models installed, one pulled this month (shows the New badge) */
const B5T3_INSTALLED = ["gemma4:e2b-it-qat", "llama3.2:3b"];
const B5T3_NEW = "gemma4:e2b-it-qat";
const B5T3_SHORT = { chat: "Chat", vision: "Vis", ocr: "OCR", strategy: "Strat", coding: "Code" };
const B5T3_PLAIN = { chat: "Chat", vision: "Pictures", ocr: "Screen text", strategy: "Strategy", coding: "Coding" };
const B5T3_LONG = { chat: "chat", vision: "reads pictures", ocr: "reads text in pictures", strategy: "strategy help", coding: "coding" };

const B5T3_REAL = b5t3RealRows.map(([tag, gb, rel, lic, cls, group, tags, rating]) => ({
  tag, gb, rel, lic, cls, group, tags, rating, ex: false, fam: tag.match(/^[a-z]+/)[0],
  pics: tags.includes("vision") || tags.includes("ocr"), tooBig: false, big: group === "stretch",
}));
/* 35 made-up rows. Names say "Example row". No size, no stars. Their other fields only give the filters
   something to do; nothing about them is a claim about a real model. */
const B5T3_EXAMPLES = (() => {
  const sets = [["chat"], ["chat", "strategy"], ["chat", "vision"], ["vision", "ocr"], ["strategy"], ["chat", "vision", "ocr", "strategy"]];
  const out = [];
  let n = 26;
  for (const [group, count] of [["smallest", 17], ["stretch", 12], ["specialist", 6]]) {
    for (let i = 0; i < count; i++, n++) {
      const tags = sets[n % 6];
      out.push({
        tag: `Example row ${n}`, gb: null, rel: "", lic: "example", cls: n % 3 === 0 ? "open_weight" : "foss", group, tags, rating: null,
        ex: true, fam: `Example ${"ABCDEF"[Math.floor((n - 26) / 6)]}`,
        pics: tags.includes("vision") || tags.includes("ocr"), tooBig: group === "stretch" && n % 2 === 0, big: group === "stretch",
      });
    }
  }
  return out;
})();

/* ---------- small helpers, ported from the plugin ---------- */
const b5t3Gb = (gb) => (gb == null ? "—" : gb < 0.1 ? "< 0.1 GB" : `${gb.toFixed(gb >= 10 ? 0 : 1)} GB`);
const b5t3Stars = (e) => (e.rating ? "★".repeat(e.rating) : "—");
function b5t3Pill(e) {
  const label = (e.lic || "").trim();
  if (e.cls === "foss") return { t: /^(Apache|MIT)\b/i.test(label) || e.ex ? "FOSS" : label.replace(/\s*\(.*\)\s*$/, ""), o: false };
  if (e.cls === "open_weight") return { t: /research/i.test(label) ? "Research only" : "Open weight", o: true };
  return { t: "Unknown", o: true };
}
function b5t3Newest(a, b) { return b.rel.localeCompare(a.rel) || a.tag.localeCompare(b.tag); }
function b5t3StretchOrder(a, b) {
  const ra = B5T3_STRETCH_ORDER.indexOf(a.tag), rb = B5T3_STRETCH_ORDER.indexOf(b.tag);
  const ka = ra === -1 ? B5T3_STRETCH_ORDER.length : ra, kb = rb === -1 ? B5T3_STRETCH_ORDER.length : rb;
  return ka - kb || b5t3Newest(a, b);
}
const b5t3Cmp = (g) => (g === "stretch" ? b5t3StretchOrder : b5t3Newest);
const b5t3Tags = (e, map, sep) => e.tags.map((t) => map[t]).join(sep);
/* the four "jobs" the plugin already tells apart when it looks for a gap (pullModelRecommendations.ts) */
function b5t3Covers(e, role) {
  if (role === "speed") return e.tags.includes("chat");
  if (role === "strategy") return e.tags.includes("strategy");
  if (role === "expert") return e.group === "stretch" || (e.tags.includes("strategy") && (e.rating || 0) >= 5);
  return e.tags.includes("vision") || e.tags.includes("ocr");
}
const b5t3Score = (e) => {
  const mm = e.tags.includes("vision") && e.tags.includes("chat") ? 1.35 : e.tags.includes("vision") ? 1.15 : 1;
  return ((e.rating || 0) / Math.max(e.gb || 0, 0.35)) * mm;
};
/* the Suggested chips, as the box works them out from what is installed */
function b5t3Suggest(instSet) {
  const cat = B5T3_REAL;
  const swiss = cat.some((e) => instSet.has(e.tag) && e.tags.includes("chat") && e.tags.includes("vision") && (e.tags.includes("strategy") || e.tags.includes("ocr")));
  if (swiss) return [];
  const gaps = ["speed", "strategy", "expert", "vision"].filter((r) => !cat.some((e) => instSet.has(e.tag) && b5t3Covers(e, r)));
  if (!gaps.length) return [];
  const cands = cat.filter((e) => !instSet.has(e.tag) && gaps.some((r) => b5t3Covers(e, r))).sort((a, b) => {
    const ae = a.group === "essentials" ? 1 : 0, be = b.group === "essentials" ? 1 : 0;
    return ae !== be ? be - ae : b5t3Score(b) - b5t3Score(a);
  });
  const picked = [], covered = new Set();
  for (const e of cands) {
    const fills = gaps.filter((r) => !covered.has(r) && b5t3Covers(e, r));
    if (!fills.length) continue;
    picked.push(e);
    fills.forEach((r) => covered.add(r));
    if (covered.size >= gaps.length || picked.length >= 4) break;
  }
  return picked;
}

/* ---------- today's matching rules, ported from the plugin ---------- */
function b5t3TodayMode(e, m) {
  if (m === "speed") return e.tags.includes("chat");
  if (m === "strategy") return e.tags.includes("strategy");
  if (m === "expert") return e.group === "stretch" || (e.tags.includes("strategy") && (e.rating || 0) >= 5);
  return e.tags.includes("vision") || e.tags.includes("ocr");
}
function b5t3TodayShown(c) {
  const st = c.st;
  /* the licence check comes FIRST in the plugin, before the "installed models always stay" rule */
  const base = (e) => {
    if (st.lic === 0 && e.cls !== "foss") return false;
    if (st.lic === 1 && !(e.cls === "foss" || e.cls === "open_weight")) return false;
    if (st.onlyInst && !c.isInst(e)) return false;
    if (st.essOnly && e.group !== "essentials" && !c.isInst(e)) return false;
    if (st.recent && !(c.isInst(e) && c.isNew(e))) return false;
    return true;
  };
  const modes = (e) => st.modes.size === 0 || [...st.modes].some((m) => b5t3TodayMode(e, m));
  const list = c.list();
  return {
    rows: list.filter((e) => base(e) && modes(e)),
    counts: Object.fromEntries(["speed", "strategy", "expert", "vision"].map((m) => [m, list.filter((e) => base(e) && b5t3TodayMode(e, m)).length])),
  };
}

/* ============================================================
   One card: the controls bar, the Deck screen with the box, a note
   ============================================================ */
function b5t3Card(kind) {
  const st = {
    big: false, inst: 0, lic: 0, queued: new Set(), pinned: B5T3_NEW,
    modes: new Set(), onlyInst: false, essOnly: true, recent: false, /* today */
    fit: 0, pics: false,                                              /* A */
    open: { rec: true, more: true, pics: true, slow: false, pc: false }, /* B */
    fits: true, oss: true, word: null, allWords: false,               /* C */
    jobs: new Set(),                                                  /* wild */
  };
  const box = h("div", { class: "b5t3-box" });
  const stage = h("div", { class: "b5t3-screen" },
    h("div", { class: "b5t3-bg" }),
    h("div", { class: "b5t3-top" }, h("span", {}, "83%"), h("span", {}, "3:53 AM")),
    box,
    h("div", { class: "b5t3-bottom" }, h("span", { class: "menu" }, "MENU"),
      h("span", {}, h("b", { class: "a" }, "A"), "SELECT"), h("span", {}, h("b", { class: "b" }, "B"), "BACK")));
  const root = h("div", { class: "deck", tabindex: "0", role: "application", "aria-label": "Interactive mock-up of the AI models box. Use the arrow keys as the D-pad, Enter as A, Escape as B." }, stage);
  const c = { st, box, root, kind };

  c.list = () => (st.big ? [...B5T3_REAL, ...B5T3_EXAMPLES] : B5T3_REAL);
  c.isInst = (e) => st.inst === 1 && B5T3_INSTALLED.includes(e.tag);
  c.isNew = (e) => c.isInst(e) && e.tag === B5T3_NEW;
  /* C has no separate setting: its "Open source only" switch is the licence rule */
  c.usable = (e) => e.cls === "foss" || ((kind === "C" ? !st.oss : st.lic === 1) && e.cls === "open_weight");
  c.toast = (t) => toast(stage, t, 3400);
  /* inside a group: rows your licence setting would use first, then the plugin's own order */
  c.order = (g) => (a, b) => (Number(c.usable(b)) - Number(c.usable(a))) || b5t3Cmp(g)(a, b);

  c.redraw = (ringSel, o = {}) => {
    const cur = Deck.current(root);
    const key = cur && cur.dataset.key;
    const tops = $$(".scroll", box).map((s) => s.scrollTop);
    c.draw();
    $$(".scroll", box).forEach((s, i) => { s.scrollTop = o.top && s.classList.contains("b5t3-scroll") ? 0 : (tops[i] || 0); });
    const sel = ringSel || (key ? `[data-key="${key}"]` : null);
    const t = sel && $(sel, box);
    if (t) Deck.setRing(root, t, { scroll: false });
  };

  /* pressing A on a row's first button: star it when installed, queue it when not */
  c.press = (e) => {
    if (c.isInst(e)) { st.pinned = e.tag; c.toast(`Ask will use ${e.tag}.`); }
    else if (e.ex) { c.toast("Example row: nothing to download. It only shows how a long list looks."); return; }
    else if (st.queued.has(e.tag)) st.queued.delete(e.tag);
    else {
      st.queued.add(e.tag);
      if (kind !== "today" && !c.usable(e)) c.toast("Queued. bonsAI will not use it until open-weight models are allowed in Advanced.");
    }
    c.redraw(`[data-key="s:${e.tag}"]`);
  };
  c.slot = (e, rowKey) => {
    const inst = c.isInst(e), on = st.queued.has(e.tag), pin = st.pinned === e.tag;
    const b = h("button", { class: "b5t3-slot" + (inst ? " inst" + (pin ? " pin" : "") : on ? " sel" : ""), "data-stop": "", "data-row": rowKey, "data-key": "s:" + e.tag,
      "aria-label": inst ? `Use ${e.tag} for Ask` : `Select ${e.tag} to pull` }, inst ? (pin ? "★" : "☆") : on ? "✔" : "");
    b.addEventListener("click", () => c.press(e));
    return b;
  };
  c.xbtn = (e, rowKey) => {
    const b = h("button", { class: "b5t3-x", "data-stop": "", "data-row": rowKey, "data-key": "x:" + e.tag, "aria-label": "Remove " + e.tag }, "X");
    b.addEventListener("click", () => c.toast(`Drawing only: this would ask before removing ${e.tag}.`));
    return b;
  };
  c.modelCell = (e, bang) => {
    const p = b5t3Pill(e);
    return h("div", { class: "c-mo" }, h("span", { class: "b5t3-mline" },
      h("span", { class: "b5t3-name" }, e.tag + (bang && B5T3_BANG.has(e.tag) ? " !" : "")),
      c.isNew(e) ? h("span", { class: "b5t3-new" }, "New") : null,
      h("span", { class: "b5t3-pslot" }, h("span", { class: "b5t3-pill" + (p.o ? " o" : "") }, p.t))));
  };
  const note = (e) => (e.tooBig ? ["big", "too big for this Deck"] : e.group === "stretch" ? ["slow", "slow on a Deck"] : null);
  const rowClass = (e) => (e.group === "stretch" ? (e.tooBig ? " big" : " slow") : "") + (c.isInst(e) ? " inst" : "") + (e.ex ? " ex" : "") + (kind !== "today" && !c.usable(e) ? " dim" : "");
  /* today's row, with the plugin's own columns */
  c.todayRow = (e) => {
    const key = "r:" + e.tag;
    return h("div", { class: "b5t3-row" + rowClass(e), role: "row" },
      h("div", { class: "c-pull" }, c.slot(e, key)), c.modelCell(e, true),
      h("div", { class: "c-sz" }, b5t3Gb(e.gb)),
      h("div", { class: "c-md", title: b5t3Tags(e, B5T3_PLAIN, " · ") }, b5t3Tags(e, B5T3_SHORT, " ")),
      h("div", { class: "c-st" }, b5t3Stars(e)),
      h("div", { class: "c-del" }, c.isInst(e) ? c.xbtn(e, key) : null));
  };
  /* a roomier row for the options that have no filter column: the size cell says "slow" or "too big" */
  c.wideRow = (e) => {
    const key = "r:" + e.tag, n = note(e);
    return h("div", { class: "b5t3-row" + rowClass(e), role: "row", title: !c.usable(e) ? "Your licence setting would not use this one." : null },
      h("div", { class: "c-pull" }, c.slot(e, key)), c.modelCell(e, false),
      h("div", { class: "c-sz" }, b5t3Gb(e.gb), n ? h("em", { class: n[0] }, n[1]) : null),
      h("div", { class: "c-md" }, b5t3Tags(e, B5T3_PLAIN, " · ")),
      h("div", { class: "c-st" }, b5t3Stars(e)),
      h("div", { class: "c-del" }, c.isInst(e) ? c.xbtn(e, key) : null));
  };
  /* two lines: the name and size, then one short "good for" line */
  c.twoRow = (e) => {
    const key = "r:" + e.tag, n = note(e), p = b5t3Pill(e);
    const t2 = [b5t3Tags(e, B5T3_LONG, " · ")];
    return h("div", { class: "b5t3-two" + rowClass(e), role: "row" },
      c.slot(e, key),
      h("div", { style: "min-width:0" },
        h("div", { class: "t1" }, h("span", { class: "b5t3-name" }, e.tag), c.isNew(e) ? h("span", { class: "b5t3-new" }, "New") : null,
          h("span", { class: "b5t3-pill" + (p.o ? " o" : "") }, p.t)),
        h("div", { class: "t2" }, t2[0].charAt(0).toUpperCase() + t2[0].slice(1),
          n ? h("em", { class: n[0] }, " · " + n[1]) : null,
          !c.usable(e) ? h("em", {}, " · needs the open-weight setting") : null)),
      h("div", { class: "sz" }, b5t3Gb(e.gb)),
      c.isInst(e) ? c.xbtn(e, key) : h("span", {}));
  };
  c.switchBtn = (label, on, fn, key, row) => {
    const b = h("button", { class: "b5t3-sw" + (on ? " on" : ""), "data-stop": "", "data-row": row, "data-key": key, "aria-pressed": String(on) }, label, h("i", {}));
    b.addEventListener("click", () => { fn(); c.redraw(`[data-key="${key}"]`, { top: true }); });
    return b;
  };
  c.head = (cols, cls) => h("div", { class: "b5t3-head", role: "row" }, ...cols.map(([t, k]) => h("div", { class: k || "" }, t)));

  /* ---------- the box around every option ---------- */
  c.counts = () => {
    const inst = c.list().filter(c.isInst), igb = inst.reduce((s, e) => s + (e.gb || 0), 0);
    const q = [...st.queued], qgb = q.reduce((s, t) => s + ((B5T3_REAL.find((e) => e.tag === t) || {}).gb || 0), 0);
    return h("div", { class: "b5t3-counts" }, h("span", {}, `Installed ${inst.length} · ${b5t3Gb(igb || 0.05)}`), h("span", {}, `Queue ${q.length} · ${b5t3Gb(qgb || 0.05)}`), h("span", {}, "Offline sizes"));
  };
  c.foot = () => {
    const q = [...st.queued], qgb = q.reduce((s, t) => s + ((B5T3_REAL.find((e) => e.tag === t) || {}).gb || 0), 0);
    const done = h("button", { class: "b5t3-btn", "data-stop": "", "data-row": "foot", "data-key": "done" }, q.length ? `Pull selected (${q.length}) · ${b5t3Gb(qgb)}` : "Done");
    const cancel = h("button", { class: "b5t3-btn", "data-stop": "", "data-row": "foot", "data-key": "cancel" }, "Cancel");
    done.addEventListener("click", () => c.toast("Drawing only: this would save your picks and close the box."));
    cancel.addEventListener("click", () => c.toast("Drawing only: this would close the box."));
    return h("div", { class: "b5t3-foot" }, done, cancel);
  };
  c.draw = () => {
    const adv = h("button", { class: "b5t3-adv", "data-stop": "", "data-row": "adv", "data-key": "adv" }, "Advanced ›");
    adv.addEventListener("click", () => c.toast(kind === "today" ? "Drawing only: Advanced holds the open-weight unlock and a few model switches." : "Drawing only: Advanced is where the licence setting would live."));
    box.replaceChildren(...[
      h("div", { class: "b5t3-title" }, h("h5", {}, "AI models"), adv),
      c.counts(),
      h("div", { class: "b5t3-main" }, ...b5t3Kinds[kind](c)),
      kind === "today" ? null : h("div", { class: "b5t3-legend" }, kind === "C" ? null : "Dimmed: your licence setting would not use it. ", h("i", {}, "Orange edge: slow on a Deck. Red edge: too big for this Deck.")),
      c.foot(),
    ].filter(Boolean));
  };

  /* today only: Right and Left cross between the column and the list as the plugin does, Down past the column goes to Done */
  if (kind === "today") {
    const mid = (el) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; };
    const nearest = (els, y) => els.reduce((b, el) => (Math.abs(mid(el) - y) < Math.abs(mid(b) - y) ? el : b), els[0]);
    root.addEventListener("deckkey", (ev) => {
      const cur = ev.detail.stop, key = ev.detail.key;
      if (!cur) return;
      const col = $(".b5t3-col", box), lbox = $(".b5t3-lbox", box);
      const inCol = col && col.contains(cur), inList = lbox && lbox.contains(cur);
      if (key === "Right" && inCol) {
        ev.preventDefault();
        const els = Deck.stops(lbox).filter((x) => x.classList.contains("b5t3-slot"));
        if (els.length) Deck.setRing(root, nearest(els, mid(cur)));
      } else if (key === "Left" && inList && cur.classList.contains("b5t3-slot")) {
        ev.preventDefault();
        const els = Deck.stops(col);
        if (els.length) Deck.setRing(root, nearest(els, mid(cur)));
      } else if (key === "Up" && inList && Deck.stops(lbox)[0] === cur) {
        ev.preventDefault();
        Deck.setRing(root, $(".b5t3-adv", box));
      } else if (key === "Down" && inCol && Deck.stops(col).pop() === cur) {
        ev.preventDefault();
        Deck.setRing(root, $('[data-key="done"]', box));
      }
    });
  }

  /* the controls under the card: how long the list is, what is installed, the licence setting */
  const seg = (label, items, get, set) => {
    const g = h("div", { class: "b5t3-cg" }, h("span", { class: "b5t3-cl" }, label));
    const wrap = h("div", { class: "b5t3-seg", role: "group", "aria-label": label });
    items.forEach(([text, val]) => {
      const b = h("button", { type: "button", "aria-pressed": String(get() === val) }, text);
      b.addEventListener("click", () => {
        set(val);
        for (const x of $$("button", wrap)) x.setAttribute("aria-pressed", String(x === b));
        c.redraw(null, { top: true });
      });
      wrap.append(b);
    });
    g.append(wrap);
    return g;
  };
  const bar = h("div", { class: "b5t3-ctl" },
    seg("Models in the list", [["Today's 25", false], ["About 60 (35 are examples)", true]], () => st.big, (v) => { st.big = v; }),
    seg("Pretend this Deck has", [["No models", 0], ["Two models", 1]], () => st.inst, (v) => { st.inst = v; }),
    kind === "today" || kind === "C" ? null :
      seg("Licence setting, kept in Advanced", [["Open source only", 0], ["Also open-weight", 1]], () => st.lic, (v) => { st.lic = v; }));
  c.draw();
  const first = $("[data-key='clear']", box) || $(".b5t3-pick [data-stop], .b5t3-tg [data-stop], .b5t3-fold[data-stop], .b5t3-job [data-stop]", box) || $(".b5t3-slot", box);
  if (first) first.setAttribute("data-start", "");
  const foot = {
    today: "The box opens with Open source only and Deck essentials only both on, which is why it opens with so few rows. The Suggested chip at the bottom of the column can name a model the list is hiding.",
    A: "Press A on a dimmed row to queue it anyway. Everything the old Show group did is now the three choices at the top.",
    B: "No filters. Fold a heading with A to shorten a long list. Nothing here is hidden: a folded heading still shows how many rows are inside.",
    C: "The words are built from whatever is in the list right now, so a longer catalog gets more words without anyone writing them. Press a picked word again to clear it.",
    wild: "The box picks one model for each job. Everything else for that job is one fold away, and the last fold holds the whole list.",
  }[kind];
  return [bar, root, h("p", { class: "b5t3-note" }, foot)];
}

/* ============================================================
   What each option puts in the middle of the box
   ============================================================ */
const b5t3Kinds = {
  /* Today: the filter column beside the list, exactly as the code draws it */
  today(c) {
    const st = c.st;
    const { rows, counts } = b5t3TodayShown(c);
    const inst = new Set(B5T3_INSTALLED.filter(() => st.inst === 1));
    const row = (key, label, on, radio, count, fn, disabled) => {
      const b = h("button", { class: "b5t3-crow" + (on ? " on" : ""), "data-stop": disabled ? null : "", "data-key": "f:" + key, "aria-pressed": String(on), disabled: disabled ? true : null, title: disabled ? "Turn on the unlock in Advanced first." : null },
        h("span", { class: "b5t3-tick" }, radio ? (on ? "●" : "○") : on ? "✔" : ""), h("span", { class: "b5t3-lbl" }, label), count != null ? h("span", { class: "b5t3-n" }, String(count)) : null);
      if (!disabled) b.addEventListener("click", () => { fn(); c.redraw(`[data-key="f:${key}"]`, { top: true }); });
      return b;
    };
    const clear = h("button", { class: "b5t3-clear", "data-stop": "", "data-row": "ctop", "data-key": "clear" }, "Clear");
    clear.addEventListener("click", () => { st.modes = new Set(); st.onlyInst = false; st.essOnly = true; st.recent = false; c.redraw('[data-key="clear"]', { top: true }); });
    const n = rows.length;
    const col = h("div", { class: "scroll b5t3-col" },
      h("div", { class: "b5t3-ctop" }, h("span", { class: "b5t3-count" }, `${n} ${n === 1 ? "model matches" : "models match"}`), clear),
      h("div", { class: "b5t3-ctitle" }, "License"),
      row("lic0", "Open source only (recommended)", st.lic === 0, true, null, () => { st.lic = 0; }),
      row("lic1", "Also try open-weight models", st.lic === 1, true, null, () => { st.lic = 1; }),
      row("lic2", "Any installed model", false, true, null, () => {}, true),
      h("div", { class: "b5t3-ctitle" }, "Good for"),
      ...[["speed", "Speed"], ["strategy", "Strategy"], ["expert", "Expert"], ["vision", "Vision"]].map(([id, l]) =>
        row("m-" + id, l, st.modes.has(id), false, counts[id], () => { st.modes.has(id) ? st.modes.delete(id) : st.modes.add(id); })),
      h("div", { class: "b5t3-ctitle" }, "Show"),
      row("inst", "Installed only", st.onlyInst, false, null, () => { st.onlyInst = !st.onlyInst; }),
      row("ess", "Deck essentials only", st.essOnly, false, null, () => { st.essOnly = !st.essOnly; }),
      row("new", "Recently added", st.recent, false, null, () => { st.recent = !st.recent; }));
    const chips = h("div", { class: "b5t3-chips" });
    const tip = (key, text, cls, msg) => { const b = h("button", { class: "b5t3-chip " + cls, "data-stop": "", "data-key": key }, text); b.addEventListener("click", () => c.toast(msg)); return b; };
    chips.append(tip("typename", "Type a name", "full", "Drawing only: this opens a box to type a model name."));
    if (!inst.has(B5T3_NEW)) chips.append(tip("starter", "Install the starter set", "full", "Drawing only: this would download the starter models."));
    const sug = b5t3Suggest(inst);
    if (sug.length) {
      chips.append(h("div", { class: "b5t3-ctitle" }, "Suggested"));
      for (const e of sug) {
        const b = h("button", { class: "b5t3-chip" + (st.queued.has(e.tag) ? " on" : ""), "data-stop": "", "data-key": "sg:" + e.tag }, e.tag);
        b.addEventListener("click", () => { st.queued.has(e.tag) ? st.queued.delete(e.tag) : st.queued.add(e.tag); c.redraw(`[data-key="sg:${e.tag}"]`); });
        chips.append(b);
      }
    }
    col.append(chips);
    const body = h("div", { class: "scroll b5t3-scroll" });
    let any = false;
    for (const g of B5T3_GROUPS) {
      const rs = rows.filter((e) => e.group === g).sort(b5t3Cmp(g));
      if (!rs.length) continue;
      any = true;
      body.append(h("div", {}, h("div", { class: "b5t3-gt" }, B5T3_GROUP_TODAY[g]), ...rs.map(c.todayRow)));
    }
    if (!any) body.append(h("div", { class: "b5t3-empty" }, "No models match the current filters."));
    const list = h("div", { class: "b5t3-lbox b5t3-g-today" },
      c.head([["Pull"], ["Model"], ["Size"], ["Modes", "modes"], ["Deck fit"], ["Del"]]), body);
    return [h("div", { class: "b5t3-split" }, col, h("div", { class: "b5t3-lside" }, list))];
  },

  /* A: three plain choices and one switch, then one list */
  A(c) {
    const st = c.st;
    const visible = (e) => c.isInst(e) || (((st.fit === 2) || ((st.fit === 1) === e.big)) && (!st.pics || e.pics));
    const all = c.list();
    const sections = B5T3_GROUPS.map((g) => [g, all.filter((e) => e.group === g && visible(e)).sort(c.order(g))]).filter(([, r]) => r.length);
    const total = sections.reduce((s, [, r]) => s + r.length, 0);
    const labels = ["Fits this Deck", "Bigger and slower", "Everything"];
    const seg = h("div", { class: "b5t3-3", role: "group", "aria-label": "Which models to show" }, ...labels.map((l, i) => {
      const b = h("button", { class: st.fit === i ? "on" : "", "data-stop": "", "data-row": "pick", "data-key": "fit:" + i, "aria-pressed": String(st.fit === i) }, l);
      b.addEventListener("click", () => { st.fit = i; c.redraw(`[data-key="fit:${i}"]`, { top: true }); });
      return b;
    }));
    const pick = h("div", { class: "b5t3-pick" }, seg,
      c.switchBtn("Can read pictures", st.pics, () => { st.pics = !st.pics; }, "pics", "pick"),
      h("span", { class: "b5t3-sum" }, `${total} ${total === 1 ? "model" : "models"}`));
    const body = h("div", { class: "scroll b5t3-scroll" });
    for (const [g, rs] of sections) body.append(h("div", {}, h("div", { class: "b5t3-gt" }, B5T3_GROUP_NEW[g], h("small", {}, String(rs.length))), ...rs.map(c.wideRow)));
    const hidden = st.fit === 0 ? all.filter((e) => e.big && !visible(e) && (!st.pics || e.pics)).length : 0;
    if (!total) body.append(h("div", { class: "b5t3-empty" }, h("b", {}, "Nothing matches."), " Pick Everything or turn off Can read pictures."));
    if (hidden) body.append(h("div", { class: "b5t3-more" }, `${hidden} bigger and slower models are not shown here. Pick “Bigger and slower” to see them.`));
    const list = h("div", { class: "b5t3-lbox b5t3-g-wide" }, c.head([["Pull"], ["Model"], ["Size"], ["Good for"], ["Deck fit"], ["Del"]]), body);
    return [pick, list];
  },

  /* B: no filters at all. One list under plain headings, a short "good for" line on every row */
  B(c) {
    const st = c.st;
    const bucket = (e) => (e.tooBig ? "pc" : e.big ? "slow" : e.group === "essentials" ? "rec" : e.pics ? "pics" : "more");
    const defs = [
      ["rec", "Recommended for this Deck", "The list's own starter picks", "essentials"],
      ["more", "More that fit this Deck", "Smaller models; they chat or help with strategy", "smallest"],
      ["pics", "Reads pictures", "These can look at a screenshot and still fit", "smallest"],
      ["slow", "Bigger and slower on a Deck", "They run, but slowly. A PC does better.", "stretch"],
      ["pc", "For your PC", "Too big to run well on a Deck", "stretch"],
    ];
    const all = c.list();
    const body = h("div", { class: "scroll b5t3-scroll" });
    for (const [id, title, sub, g] of defs) {
      const rs = all.filter((e) => bucket(e) === id).sort(c.order(g));
      const open = st.open[id];
      const f = h("button", { class: "b5t3-fold", "data-stop": "", "data-key": "fold:" + id, "aria-expanded": String(open) },
        h("b", {}, `${title} · ${rs.length}`), h("small", {}, open ? sub : `${sub}. Press A to open.`), h("span", {}, open ? "▾" : "▸"));
      f.addEventListener("click", () => { st.open[id] = !st.open[id]; c.redraw(`[data-key="fold:${id}"]`); });
      body.append(f);
      if (open) {
        if (rs.length) body.append(...rs.map(c.twoRow));
        else body.append(h("div", { class: "b5t3-empty" }, id === "pc" ? "Nothing here yet. No model in today's list is for a PC only." : "Nothing here."));
      }
    }
    return [h("div", { class: "b5t3-lbox" }, body)];
  },

  /* C: toggles and word buttons built from the list */
  C(c) {
    const st = c.st;
    const all = c.list();
    const base = (e) => c.isInst(e) || ((!st.fits || !e.big) && (st.oss ? e.cls === "foss" : (e.cls === "foss" || e.cls === "open_weight")));
    const pool = all.filter(base);
    /* the words: what the models can do, then the model families, each only if the pool has one */
    const capMatch = (w, e) => (w === "pictures" ? e.pics : e.tags.includes(w));
    const words = [];
    for (const w of ["chat", "pictures", "strategy", "coding"]) { const n = pool.filter((e) => capMatch(w, e)).length; if (n) words.push([w, n, true]); }
    const fams = {};
    for (const e of pool) fams[e.fam] = (fams[e.fam] || 0) + 1;
    words.push(...Object.entries(fams).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([w, n]) => [w, n, false]));
    if (st.word && !words.some((w) => w[0] === st.word)) st.word = null;
    const match = (e) => !st.word || (["chat", "pictures", "strategy", "coding"].includes(st.word) ? capMatch(st.word, e) : e.fam === st.word);
    const rows = pool.filter(match).sort((a, b) => B5T3_GROUPS.indexOf(a.group) - B5T3_GROUPS.indexOf(b.group) || b5t3Cmp(a.group)(a, b));
    const shown = st.allWords ? words : words.slice(0, 9);
    const tg = h("div", { class: "b5t3-tg" },
      c.switchBtn("Fits this Deck", st.fits, () => { st.fits = !st.fits; }, "fits", "tg"),
      c.switchBtn("Open source only", st.oss, () => { st.oss = !st.oss; }, "oss", "tg"),
      h("span", { class: "b5t3-sum" }, `${rows.length} ${rows.length === 1 ? "model" : "models"}`));
    const find = h("div", { class: "b5t3-find" }, h("span", { class: "b5t3-findl" }, "Pick a word to narrow the list"),
      ...shown.map(([w, n]) => {
        const b = h("button", { class: "b5t3-word" + (st.word === w ? " on" : ""), "data-stop": "", "data-row": "words", "data-key": "w:" + w, title: `${n} in the list`, "aria-pressed": String(st.word === w) }, w);
        b.addEventListener("click", () => { st.word = st.word === w ? null : w; c.redraw(`[data-key="w:${w}"]`, { top: true }); });
        return b;
      }),
      words.length > 9 ? (() => {
        const b = h("button", { class: "b5t3-word more", "data-stop": "", "data-row": "words", "data-key": "morewords" }, st.allWords ? "Fewer words ▴" : `${words.length - 9} more words ▾`);
        b.addEventListener("click", () => { st.allWords = !st.allWords; c.redraw('[data-key="morewords"]'); });
        return b;
      })() : null);
    const body = h("div", { class: "scroll b5t3-scroll" }, ...rows.map(c.wideRow));
    const cut = all.filter((e) => !base(e) && !c.isInst(e));
    const bigCut = cut.filter((e) => st.fits && e.big).length, licCut = cut.length - bigCut;
    if (!rows.length) body.append(h("div", { class: "b5t3-empty" }, h("b", {}, "Nothing matches."), " Press the picked word again, or turn a switch off."));
    const bits = [];
    if (bigCut && st.fits) bits.push(`${bigCut} bigger models are off: turn off Fits this Deck`);
    if (licCut) bits.push(`${licCut} need the open-weight setting: turn off Open source only`);
    if (bits.length) body.append(h("div", { class: "b5t3-more" }, bits.join(". ") + "."));
    const list = h("div", { class: "b5t3-lbox b5t3-g-wide" }, c.head([["Pull"], ["Model"], ["Size"], ["Good for"], ["Deck fit"], ["Del"]]), body);
    return [tg, find, list];
  },

  /* Wild: four jobs, one suggested model each */
  wild(c) {
    const st = c.st;
    const all = c.list();
    const jobs = [
      ["speed", "Quick answers", "Short questions, fast replies"],
      ["strategy", "Strategy help", "Plans for a boss, a build or a route"],
      ["vision", "Reading screenshots", "Looks at a picture and says what is in it"],
      ["expert", "Big, slow thinking", "Hard questions; the models here run slowly on a Deck"],
    ];
    const body = h("div", { class: "scroll b5t3-scroll" });
    for (const [role, title, sub] of jobs) {
      const mine = all.filter((e) => b5t3Covers(e, role));
      const real = mine.filter((e) => !e.ex && c.usable(e) && !c.isInst(e));
      const best = (role === "expert" ? real.sort(b5t3StretchOrder) : real.filter((e) => !e.big).sort((a, b) => b5t3Score(b) - b5t3Score(a)))[0];
      const have = mine.filter(c.isInst).filter((e) => !e.big || role === "expert");
      const rest = mine.filter((e) => e !== best).sort(c.order(role === "expert" ? "stretch" : "smallest"));
      const open = st.jobs.has(role);
      const job = h("div", { class: "b5t3-job" },
        h("div", { class: "b5t3-jh" }, h("b", {}, title), h("small", {}, sub)),
        h("div", { class: "b5t3-jn" }, "On this Deck now: ", h("b", {}, have.length ? have.map((e) => e.tag).join(", ") : "nothing yet")),
        best ? c.twoRow(best) : h("div", { class: "b5t3-empty" }, "Nothing to suggest under this licence setting."));
      const f = h("button", { class: "b5t3-fold", "data-stop": "", "data-key": "job:" + role, "aria-expanded": String(open) },
        h("b", {}, `${rest.length} more for this job`), h("small", {}, open ? "" : "Press A to open"), h("span", {}, open ? "▾" : "▸"));
      f.addEventListener("click", () => { open ? st.jobs.delete(role) : st.jobs.add(role); c.redraw(`[data-key="job:${role}"]`); });
      job.append(f);
      if (open) job.append(...rest.map(c.twoRow));
      body.append(job);
    }
    const az = all.slice().sort((a, b) => a.tag.localeCompare(b.tag));
    const open = st.jobs.has("all");
    const f = h("button", { class: "b5t3-fold", "data-stop": "", "data-key": "job:all", "aria-expanded": String(open) },
      h("b", {}, `Everything, A to Z · ${az.length}`), h("small", {}, open ? "" : "Press A to open"), h("span", {}, open ? "▾" : "▸"));
    f.addEventListener("click", () => { open ? st.jobs.delete("all") : st.jobs.add("all"); c.redraw('[data-key="job:all"]'); });
    body.append(f);
    if (open) body.append(...az.map(c.twoRow));
    return [h("div", { class: "b5t3-lbox" }, body)];
  },
};

TABS.push({
  id: "t3", n: 3, name: "AI models", stars: 3,
  title: "The AI models box: a much bigger list and far fewer filters",
  today: [
    "The box opens with only 2 or 3 of the 25 models showing. 'Deck essentials only' is switched on to start with and hides the other 22.",
    "There are 11 filter rows in three groups (Licence, Good for, Show). Several do nothing you can see: pick a licence while 'Deck essentials only' is on and the list may not change.",
    "The licence check runs before the rule that keeps installed models on screen. So a model already on the Deck can vanish from the list when its licence is outside your setting, while the count at the top still counts it.",
    "A model can be suggested at the bottom of the filter column and be missing from the list above it.",
  ],
  deciding: [
    "How a list of 25 today, and about 60 later, is sorted so you find a model without a filter column.",
    "What replaces 'Deck essentials only', so that nothing is hidden by surprise.",
    "Whether a model you cannot use yet (its licence, or too big for the Deck) is hidden or shown dimmed.",
  ],
  howto: "Click a box, then use the arrow keys as the D-pad, Enter as A, Esc as B. Under each box, switch between today's 25 models and about 60, and pretend the Deck has two models installed. The 35 extra rows are made up and say 'Example row'. They have no size and no stars.",
  wide: true,
  options: [
    { id: "today", label: "Today", today: true, title: "The box as it is now",
      desc: "The real 25 models and the real 11 filter rows. It opens on 'Open source only' plus 'Deck essentials only', so 2 rows show; tick 'Also try open-weight models' and a third joins.",
      build: () => b5t3Card("today") },
    { id: "A", label: "A", title: "Three choices and one switch",
      desc: "Licence: gone as a filter (a tag on every row, dimmed when your setting would not use it). Good for: merged into one switch, 'Can read pictures'. Show: merged into three choices, and installed models always show. It opens on 'Fits this Deck' with 17 rows.",
      build: () => b5t3Card("A") },
    { id: "B", label: "B", title: "No filters, just headings",
      desc: "Licence: gone (a tag and dimming). Good for: gone (one plain 'good for' line on every row). Show: gone (the headings sort the list, and long ones fold). It opens with the first three headings open and 17 rows.",
      build: () => b5t3Card("B") },
    { id: "C", label: "C", title: "Word buttons and two switches",
      desc: "Licence: merged into one switch, 'Open source only'. Good for: merged into word buttons the list builds for itself. Show: merged into one switch, 'Fits this Deck'. Installed models always show. It opens with 8 rows.",
      build: () => b5t3Card("C") },
    { id: "wild", label: "Wild", wild: true, title: "Four jobs, one suggested model each",
      desc: "Licence: gone (a tag and dimming). Good for: becomes the four jobs the plugin already tells apart. Show: gone (installed models are named under their job). It opens with 4 jobs and one suggested model for each.",
      build: () => b5t3Card("wild") },
  ],
});
