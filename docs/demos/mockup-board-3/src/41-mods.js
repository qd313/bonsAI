/* ============================================================
   Tab 1: the Mods screen (plan 101, round 3 question 2).
   Where it opens from, what it shows, what it controls. Drawn in the new layout (21-kit2.js), with
   the dense rows the density board picked (42-rows.css). The numbers and names are the maintainer's
   own Cyberpunk 2077 setup, read from the CyberFixed folder on 2026-10-27 (plan 101 § 4); the
   adult-content mod names are left out on purpose, since this file sits in the public repo.
     A  a door in the paperclip menu; the screen is a full-screen Steam popup (like the AI models screen)
     B  a Mods row on the Search tab, under the find box; the screen is a sheet drawn inside the tab
     C  both doors into one in-tab sheet
     D  the permission switch and its confirm box (goes with every option; not a choice between them)
   ============================================================ */
const M_TABS = [TABS2[0], ["Search", "search"], ...TABS2.slice(1)];
const M_GAME = "Cyberpunk 2077";
const M_Q = "What mods do I have, and could any be causing trouble?";
const M_NEVER = "bonsAI reads these files and never changes them.";
const MODS = {
  checked: "2 min ago",
  summary: [
    ["Manager", "Vortex · CyberFixed-Main", "Vortex put 1,163 files from 133 mods into the game folder. Read from the list Vortex keeps there, never from your Nexus account."],
    ["Frameworks", "CET 1.37.1 · RED4ext 1.29.1 · 3 more", "ArchiveXL 1.26.1, TweakXL 1.11.3 and Codeware 1.18.1. Versions read from the loaders' own files in the game folder."],
    ["Game", "2.31 · on the SD card", "Found through Steam's own list of library folders, so a game on an SD card or a second drive is seen too."],
    ["Loader logs", "last start: no errors", "The end of the CET and RED4ext logs is read on a troubleshooting question. That is where a mod that failed to load gets named."],
    ["Game settings", "Crowd Medium · FSR3 Balanced · RT off", "Read from the game's own settings file, so an answer about frame rate can see what is set. Never changed."],
  ],
  groups: [
    ["Load order", "4 REDmods", [["1  NCPD Prevention Police Enhancement", "2.7"], ["2  NIGHT CITY ALIVE Standard", "2.2"], ["3  NPCs Gone Wild", "4.3.2"], ["4  one more", ""]], "The order the game loads its own mod format in, read from the load-order file Vortex writes. bonsAI never reorders it."],
    ["Script mods", "19", [["AppearanceMenuMod", ""], ["Immersive First Person", "1.5.1"], ["no_dup_citizen", ""], ["react_to_horn", ""], ["Native Settings UI", "1.96"], ["auto_drive_enhanced", ""], ["Say Something Damn It", ""], ["VendorFilters", ""], ["and 11 more", ""]], "Mods that run through Cyber Engine Tweaks. Each has its own folder, and some keep a settings file bonsAI can read."],
    ["Loader plugins", "10 files", [["ArchiveXL", "1.26.1"], ["TweakXL", "1.11.3"], ["Codeware", "1.18.1"], ["Mod Settings", ""], ["Input Loader", ""], ["and 5 more", ""]], "Plugins the RED4ext loader starts with the game."],
    ["Archives", "238 files", [["VTK Vanilla HD · Body", "3.4"], ["VTK Vanilla HD · Head", "3.1"], ["Equipment-EX", "1.2.8"], ["Simple Watch", "1.0"], ["Porsche 911 colour packs", ""], ["The Bean Trunk · Virtual Atelier", "10.0"], ["and 60 more mods", ""]], "Clothing, vehicles, faces and textures, grouped by the mod they came from."],
    ["Scripts and tweaks", "439 files", [["Equipment-EX", ""], ["Perk Addition Framework", "1.0.0"], ["Easier Controller Sprint", "1.1.0"], ["Browser Extension Framework", "0.9.7"], ["and 40 more mods", ""]], "Compiled scripts and tweak files, grouped by the mod they came from."],
    ["Everything Vortex deployed", "133 mods", [["Always Best Quality", ""], ["AppearanceMenuMod", ""], ["ArchiveXL", "1.26.1"], ["Auto Drive Enhanced", ""], ["Browser Extension Framework", "0.9.7"], ["CET", "1.37.1"], ["and 127 more, A to Z", ""]], "The whole list as Vortex wrote it, with the version baked into each name."],
  ],
};

let M_UID = 0;
function mCtx() {
  const root = h("div", { class: "deck", tabindex: "0", role: "application", "aria-label": "Interactive mock-up. Use the arrow keys as the D-pad, Enter as A, Escape as B." });
  return { root, uid: String(++M_UID), onMods() {}, onClose() {}, onAsk() {} };
}
const mStage = (ctx) => ctx.root.firstElementChild;

/* ---------- the pieces every option shares ---------- */
function mRow(label, value, desc) {
  return h("button", { class: "k-row m-row", "data-stop": "", "data-desc": desc }, h("span", { class: "k-l" }, label), h("span", { class: "k-v m-v" }, value));
}
function mItem([name, ver], gdesc) {
  return h("button", { class: "k-row m-item", "data-stop": "", "data-desc": (ver ? `Version ${ver}. ` : "") + gdesc }, h("span", { class: "k-l" }, name), ver ? h("span", { class: "k-v" }, ver) : "");
}
const mSummary = () => MODS.summary.map(([l, v, d]) => mRow(l, v, d));
/* the folded groups: one line each with its count; A opens one and leaves the others as they are */
function mGroups(ctx, openSet, redraw) {
  const out = [];
  MODS.groups.forEach(([name, count, items, desc], gi) => {
    const open = openSet.has(gi);
    const line = h("button", { class: "k-fold m-fold" + (open ? " open" : ""), "data-stop": "", "data-desc": desc, "data-g": gi },
      h("span", { class: "k-ft" }, name), h("span", { class: "k-fs" }, count), h("span", { class: "k-fc" }, open ? "▾" : "▸"));
    line.addEventListener("click", () => { if (open) openSet.delete(gi); else openSet.add(gi); redraw(gi); });
    out.push(line);
    if (open) out.push(h("div", { class: "k-foldbody" }, ...items.map((it) => mItem(it, desc))));
  });
  return out;
}
/* the two (or three) buttons at the bottom: the only things the screen controls */
function mFoot(ctx, { done = false } = {}) {
  const r = "mfoot" + ctx.uid;
  const ask = h("button", { class: "k-btn", "data-stop": "", "data-row": r, "data-desc": `Puts “${M_Q}” in the question box, ready to send. Nothing is sent until you press Ask.` }, "Ask about my mods");
  ask.addEventListener("click", () => ctx.onAsk());
  const refresh = h("button", { class: "k-btn", "data-stop": "", "data-row": r, "data-desc": "Reads the game folder again now. Otherwise the look runs once, on your first question about the game, and is kept for the session." }, "Refresh");
  refresh.addEventListener("click", () => toast(mStage(ctx), "Checked again just now. Same 133 mods, nothing changed.", 2200));
  const kids = [ask, refresh];
  if (done) { const d = h("button", { class: "k-btn", "data-stop": "", "data-row": r, "data-desc": "Closes this screen. B does the same." }, "Done"); d.addEventListener("click", () => ctx.onClose()); kids.push(d); }
  return h("div", { class: "k-pair m-foot" }, ...kids);
}
/* the help strip follows the ring: the ringed row's longer text, as the density board picked */
function mStrip(ctx, strip) {
  ctx.root.addEventListener("ringmove", (e) => {
    const el = e.detail.el;
    if (!strip.isConnected) return;
    const host = el && el.closest("[data-desc]");
    if (host && strip.parentElement.contains(host)) {
      const lab = (host.querySelector(".k-l, .k-ft") || host).textContent;
      strip.innerHTML = `<span class="k-strip-l">${lab}</span>${host.dataset.desc}`;
      const r = el.getBoundingClientRect(), s = strip.getBoundingClientRect(), sc = el.closest(".scroll");
      if (sc && r.bottom > s.top - 6) { const z = r.height / el.offsetHeight || 1; sc.scrollBy({ top: (r.bottom - s.top + 10) / z }); }
    } else strip.innerHTML = "";
  });
}

/* ---------- the Mods sheet, drawn inside a tab (B and C) ---------- */
function modsSheet(ctx) {
  const openSet = new Set([0]);
  const sc = h("div", { class: "scroll m-scroll" });
  const strip = h("div", { class: "k-strip m-strip" });
  const sheet = h("div", { class: "s-sheet m-sheet" },
    h("div", { class: "m-head" }, h("div", { class: "m-title" }, "Mods seen for " + M_GAME), h("div", { class: "m-sub" }, "Checked " + MODS.checked)),
    sc, strip, hintBar([["B", "Close"], ["A", "Open"]]));
  const draw = (ringG) => {
    sc.replaceChildren(h("div", { class: "k-sec first" }, "What bonsAI saw"), ...mSummary(),
      h("div", { class: "k-sec" }, "The mods, in groups"), ...mGroups(ctx, openSet, draw),
      h("div", { class: "k-line m-never" }, M_NEVER), mFoot(ctx));
    if (ringG != null) Deck.setRing(ctx.root, $(`.m-fold[data-g="${ringG}"]`, sc), { scroll: false });
  };
  draw();
  mStrip(ctx, strip);
  sheet.addEventListener("deckkey", (e) => { if (e.detail.key === "B") { e.preventDefault(); ctx.onClose(); } });
  return sheet;
}

/* ---------- the Mods screen as a full-screen Steam popup (A) ---------- */
function modsPopup(ctx) {
  const openSet = new Set([0]);
  const box = h("div", { class: "mbox" });
  const screen = h("div", { class: "dscreen" }, h("div", { class: "ds-bg" }), h("div", { class: "ds-top" }, h("span", {}, "83%"), h("span", {}, "3:53 AM")), box,
    h("div", { class: "ds-bottom" }, h("span", { class: "menu" }, "MENU"), h("span", {}, h("b", { class: "a" }, "A"), "SELECT"), h("span", {}, h("b", { class: "b" }, "B"), "BACK")));
  const left = h("div", { class: "m-left" }), right = h("div", { class: "scroll m-right" }), strip = h("div", { class: "k-strip m-pstrip" });
  const draw = (ringG) => {
    left.replaceChildren(h("div", { class: "k-sec first" }, "What bonsAI saw"), ...mSummary(), h("div", { class: "k-line m-never" }, M_NEVER));
    right.replaceChildren(h("div", { class: "k-sec first" }, "The mods, in groups"), ...mGroups(ctx, openSet, draw));
    if (ringG != null) Deck.setRing(ctx.root, $(`.m-fold[data-g="${ringG}"]`, right), { scroll: false });
  };
  draw();
  box.append(h("div", { class: "m-ptitle" }, h("h5", {}, "Mods seen for " + M_GAME), h("span", {}, `Checked ${MODS.checked} · 133 mods · Vortex`)),
    h("div", { class: "m-split" }, left, right), strip, mFoot(ctx, { done: true }));
  // Right from the left column goes to the list; Left from the list comes back; B closes
  screen.addEventListener("deckkey", (e) => {
    const cur = e.detail.stop;
    if (e.detail.key === "B") { e.preventDefault(); ctx.onClose(); return; }
    if (!cur) return;
    if (e.detail.key === "Right" && cur.closest(".m-left")) { const f = $(".m-right [data-stop]", box); if (f) { e.preventDefault(); Deck.setRing(ctx.root, f); } }
    else if (e.detail.key === "Left" && cur.closest(".m-right")) { const b = $(".m-left [data-stop]", box); if (b) { e.preventDefault(); Deck.setRing(ctx.root, b); } }
  });
  mStrip(ctx, strip);
  return screen;
}

/* ---------- the Main tab as the stage: one mod-aware answer, the paperclip as a stop ---------- */
function mMain(ctx, { typed = "", modsEntry = true, searchPill = null } = {}) {
  const turn = h("div", { class: "k2-turn" },
    qBubble2("Why does the frame rate drop in Kabuki market?"),
    aBubble2([
      "<b>Your crowd mods are the cost, not the shadows.</b> With NIGHT CITY ALIVE and the three reactivity mods loaded, the processor is the limit in Kabuki.",
      "Try Crowd density <b>Medium</b> in the game's settings, and lower the rates in react_to_horn's and ResponsiveV's own settings. Leave ray tracing off until that holds 55 to 60.",
    ]),
    detailsLine("Show details · read: your mods, game settings"));
  const dk = dock2({ chips: ["What mods do I have?", "How do I fix stuttering?"], typed, game: M_GAME, mode: "Expert" });
  const clip = h("button", { class: "k2-ic m-clip", "data-stop": "", "data-row": "strip", "aria-label": "Attach", html: ICONS2.clip });
  const strip = $(".k2-strip", dk);
  strip.replaceChild(clip, strip.firstElementChild);
  const body = mainTab2({ transcript: [turn], chatName: "Cyberpunk help", chatNo: 2, chatCount: 5, dockEl: dk });
  body.replaceChild(tabBar2(0, M_TABS), body.firstElementChild);
  if (searchPill) { const pill = h("button", { class: "s-yhint", "data-stop": "" }, h("b", {}, "Y"), "Search"); pill.addEventListener("click", searchPill); body.scroller.prepend(pill); }
  const panel = h("div", { class: "qam", style: `height:${PANEL.h}px` }, body);
  function openMenu() {
    const rows = [["Close menu & take screenshot", null], ["Attach recent screenshot", null]];
    if (modsEntry) rows.push(["Mods seen: 133 · open", () => ctx.onMods()]);
    const menu = h("div", { class: "m-menu" }, ...rows.map(([t, fn], i) => {
      const b = h("button", { class: "m-mrow" + (fn ? " new" : ""), "data-stop": "" }, t);
      b.addEventListener("click", () => { menu.remove(); if (fn) fn(); else { toast(panel, "As today: the screenshot entries.", 1600); Deck.setRing(ctx.root, clip, { scroll: false }); } });
      return b;
    }));
    menu.addEventListener("deckkey", (e) => { if (e.detail.key === "B") { e.preventDefault(); menu.remove(); Deck.setRing(ctx.root, clip, { scroll: false }); } });
    dk.append(menu);
    Deck.setRing(ctx.root, $$(".m-mrow", menu)[modsEntry ? 2 : 0], { scroll: false });
  }
  clip.addEventListener("click", openMenu);
  panel.clip = clip; panel.field = dk.field;
  return panel;
}

/* ---------- the Search tab with a Mods row under the find box (B and C) ---------- */
function mSearch(ctx) {
  const sc = h("div", { class: "scroll s-tabpage" });
  const gameRow = h("div", { class: "s-games" }, ...["All", M_GAME, "Hollow Knight", "Hades"].map((g, k) =>
    h("button", { class: "s-game" + (k === 1 ? " on" : ""), "data-stop": "", "data-row": "g" + ctx.uid }, g)));
  const box = h("button", { class: "s-box", "data-stop": "" }, h("span", { class: "s-mag", html: ICONS2.search }), h("span", { class: "s-ph" }, "Chats, settings, notes…"));
  const rowA = h("div", { class: "s-words" }), rowB = h("div", { class: "s-words" });
  ["kabuki", "crowd", "stutter", "vortex", "upscaling", "crash", "police", "load order"].forEach((w, i) =>
    (i < 4 ? rowA : rowB).append(h("button", { class: "s-word", "data-stop": "", "data-row": (i < 4 ? "w1" : "w2") + ctx.uid }, w)));
  const modsRow = h("button", { class: "m-srow", "data-stop": "" },
    h("span", { class: "s-gi", html: ICONS2.gear }),
    h("span", { class: "grow" }, h("b", {}, "Mods seen · 133"), h("small", {}, "Vortex · 5 frameworks · load order of 4 · checked 2 min ago")),
    h("span", { class: "k-fc" }, "▸"));
  modsRow.addEventListener("click", () => ctx.onMods());
  const notes = [["Playing on the TV at 10 feet; keep text big.", true], ["No spoilers past the start of Phantom Liberty.", true]];
  const notesSec = h("div", { class: "s2-notes" },
    h("div", { class: "s-group" }, h("span", { class: "s-gi", html: ICONS2.note }), "Your notes", h("small", {}, "2 on")),
    ...notes.map(([t, on]) => h("button", { class: "note-row" + (on ? " on" : ""), "data-stop": "" }, h("span", { class: "ico pin", html: ICONS.pin }), h("span", { class: "grow" }, t, h("small", {}, M_GAME)), h("span", { class: "q-toggle" + (on ? " on" : "") }))),
    h("p", { class: "s-hint" }, "Ask reads the ones that are on. New notes come from what you say in a chat."));
  sc.append(h("div", { class: "s-tabtitle" }, "Search"), gameRow, h("div", { class: "s-find" }, box, rowA, rowB),
    h("div", { class: "s-group m-sgroup" }, h("span", { class: "s-gi", html: ICONS2.gear }), M_GAME + "'s mods"), modsRow, notesSec);
  const panel = h("div", { class: "qam", style: `height:${PANEL.h}px` }, h("div", { style: "display:contents" }, tabBar2(1, M_TABS), h("div", { class: "k2-gap" }), sc));
  panel.modsRow = modsRow;
  return panel;
}

/* ---------- the options ---------- */
function optionA() {
  const ctx = mCtx();
  const showMain = (typed = "") => { const p = mMain(ctx, { typed }); ctx.root.replaceChildren(p); Deck.setRing(ctx.root, typed ? p.field : p.clip, { scroll: false }); };
  ctx.onMods = () => { const p = modsPopup(ctx); ctx.root.replaceChildren(p); Deck.setRing(ctx.root, $("[data-stop]", p), { scroll: false }); };
  ctx.onClose = () => showMain();
  ctx.onAsk = () => showMain(M_Q);
  showMain();
  return ctx.root;
}
function optionB() {
  const ctx = mCtx();
  const showSearch = () => { const p = mSearch(ctx); ctx.root.replaceChildren(p); Deck.setRing(ctx.root, p.modsRow, { scroll: false }); };
  ctx.onMods = () => { const sheet = modsSheet(ctx); mStage(ctx).append(sheet); Deck.setRing(ctx.root, $("[data-stop]", sheet), { scroll: false }); };
  ctx.onClose = () => { const s = $(".m-sheet", ctx.root); if (s) s.remove(); Deck.setRing(ctx.root, mStage(ctx).modsRow, { scroll: false }); };
  ctx.onAsk = () => { const p = mMain(ctx, { typed: M_Q, modsEntry: false, searchPill: showSearch }); ctx.root.replaceChildren(p); Deck.setRing(ctx.root, p.field, { scroll: false }); };
  ctx.root.addEventListener("deckkey", (e) => { if (e.detail.key === "Y" && !e.defaultPrevented && $(".k2-dock", ctx.root)) { e.preventDefault(); showSearch(); } });
  showSearch();
  return ctx.root;
}
function optionC() {
  const ctx = mCtx();
  let where = "main";
  const showMain = (typed = "") => { where = "main"; const p = mMain(ctx, { typed, searchPill: () => showSearch() }); ctx.root.replaceChildren(p); Deck.setRing(ctx.root, typed ? p.field : p.clip, { scroll: false }); };
  const showSearch = () => { where = "search"; const p = mSearch(ctx); ctx.root.replaceChildren(p); Deck.setRing(ctx.root, p.modsRow, { scroll: false }); };
  // either door lands on the same sheet, over the Search tab; B goes back to where you came from
  ctx.onMods = () => { ctx.back = where; const p = mSearch(ctx); ctx.root.replaceChildren(p); const sheet = modsSheet(ctx); p.append(sheet); where = "sheet"; Deck.setRing(ctx.root, $("[data-stop]", sheet), { scroll: false }); };
  ctx.onClose = () => { if (ctx.back === "main") showMain(); else { where = "search"; const s = $(".m-sheet", ctx.root); if (s) s.remove(); Deck.setRing(ctx.root, mStage(ctx).modsRow, { scroll: false }); } };
  ctx.onAsk = () => showMain(M_Q);
  ctx.root.addEventListener("deckkey", (e) => {
    if (e.defaultPrevented) return;
    if (e.detail.key === "B" && where === "search") { e.preventDefault(); showMain(); }
    else if (e.detail.key === "Y" && where === "main") { e.preventDefault(); showSearch(); }
  });
  showMain();
  return ctx.root;
}
/* the Permissions tab as it ships (the density board left it as it is), plus the new row and its confirm box */
function optionD() {
  const ctx = mCtx();
  const rows = [
    ["Save files to Desktop", "Lets bonsAI save a note or a chat to your Desktop folder.", false],
    ["Read game & screenshot context", "Attaches screenshots and game logs to your questions for the AI.", true],
    ["Read game install folders", "Reads the list of mod files, their settings and the game's own settings in your game folders and your mod manager's profile. Never changes them.", false, true],
    ["Voice input (microphone)", "Lets you speak a question instead of typing it.", false],
    ["Internet downloads", "Ollama, AI models, the voice engine and the knowledge library.", true],
  ];
  const sc = h("div", { class: "scroll dt-scroll" });
  const panel = h("div", { class: "qam", style: `height:${PANEL.h}px` });
  const draw = (ring) => {
    sc.replaceChildren(h("div", { class: "t-para", html: "Everything here starts off until you turn it on. AI questions to a PC on your home network are not blocked by these switches." }));
    rows.forEach(([label, desc, on, isNew], i) => {
      const sw = h("span", { class: "t-sw" + (on ? " on" : "") });
      const row = h("button", { class: "t-tog", "data-stop": "", "data-start": isNew ? "" : null },
        h("div", { class: "t-lab" }, h("span", {}, label, isNew ? h("i", { class: "m-newtag" }, "new") : ""), sw), h("div", { class: "t-desc", html: desc }));
      row.addEventListener("click", () => { if (isNew && !rows[i][2]) confirm(i); else { rows[i][2] = !rows[i][2]; draw(i); } });
      sc.append(row);
    });
    if (ring != null) Deck.setRing(ctx.root, $$(".t-tog", sc)[ring], { scroll: false });
  };
  const confirm = (i) => {
    const yes = h("button", { class: "q-btn primary", "data-stop": "", "data-row": "cf" + ctx.uid }, "Turn on");
    const no = h("button", { class: "q-btn", "data-stop": "", "data-row": "cf" + ctx.uid }, "Not now");
    const modal = h("div", { class: "q-modal m-cmodal" }, h("div", { class: "q-sheet" },
      h("div", { class: "q-sheet-head" }, "Read game install folders?"),
      h("div", { class: "q-sheet-body m-cbody" }, "bonsAI will read the list of mod files, their settings and the game's own settings file, in your game folders and your mod manager's profile, to answer questions about your mods.", h("br"), h("br"), "It never changes a mod, a setting or a load order, and sends nothing online."),
      h("div", { class: "q-sheet-foot" }, no, yes)));
    const close = (turnOn) => { modal.remove(); if (turnOn) { rows[i][2] = true; toast(panel, "On. bonsAI reads your mod files; it never changes them.", 2400); } draw(i); };
    yes.addEventListener("click", () => close(true));
    no.addEventListener("click", () => close(false));
    modal.addEventListener("deckkey", (e) => { if (e.detail.key === "B") { e.preventDefault(); close(false); } });
    panel.append(modal);
    Deck.setRing(ctx.root, no, { scroll: false });
  };
  draw();
  panel.append(h("div", { style: "display:contents" }, tabBar2(4, M_TABS), h("div", { class: "k2-gap" }), sc));
  ctx.root.append(panel);
  return ctx.root;
}

/* ---------- the board tab ---------- */
function mBrief() {
  const col = (title, items) => h("section", {}, h("h3", {}, title), h("ul", {}, ...items.map((x) => h("li", { html: x }))));
  return h("div", { class: "m-brief" },
    col("What the screen shows", [
      "<b>What bonsAI saw:</b> the manager and its profile, the frameworks with their versions, the game's version and where it is, whether the loaders' last start had errors, and the game's own graphics settings.",
      "<b>The mods, in groups:</b> the load order, script mods, loader plugins, archives, scripts and tweaks, and the whole list the manager wrote. Each group is one line with its count; A opens it.",
      "The ringed row's longer text shows in the strip at the bottom, as on the Ollama tab.",
    ]),
    col("What it controls", [
      "<b>Refresh:</b> read the game folder again now. Otherwise the look runs once, on your first question about the game.",
      "<b>Ask about my mods:</b> puts the question in the box, ready to send.",
      "<b>Open or close a group.</b> That is all. The switch that allows the look at all lives on the Permissions tab (D).",
    ]),
    col("What it never does", [
      "Never installs, removes, enables, disables or updates a mod, never edits a setting or a load order.",
      "Never says \"you have no mods\": when it finds nothing it says where it looked.",
      "Never reads your Nexus, Thunderstore or Workshop account, and sends nothing online.",
    ]));
}
TABS.push({
  id: "t1", n: 1, name: "The Mods screen", stars: 6, wide: true,
  title: "The Mods screen: where it opens from, what it shows, what it controls",
  today: [
    "Nothing about mods shows anywhere, and the AI is not told about them: a question about mods gets the same answer as on an unmodded game.",
    "The paperclip menu by the question box has two entries: take a screenshot, attach a recent screenshot.",
    "The Search tab (left of Main) has a game row, a find box with word buttons, and your notes.",
  ],
  deciding: [
    "Where the Mods screen opens from: the paperclip menu by the question box (A), the Search tab under the find box (B), or both doors into one sheet (C).",
    "Whether it is a full-screen Steam popup (A, like the AI models screen) or a sheet drawn inside the tab (B, C, like a game note on the Search tab).",
    "The switch and its confirm box (D) go with every option; it is drawn to be read, not to be picked against the others.",
  ],
  howto: "Click a panel, then use the arrow keys; Enter is A; Escape is B. In A, press A on the paperclip, then on “Mods seen”. In B the Search tab is already open: press A on the Mods row. In C try both doors (the paperclip, or Y for the Search tab). In D, press A on the new row.",
  controls: mBrief,
  options: [
    { id: "A", label: "A", title: "A door in the paperclip menu; the screen is a full-screen popup", desc: "A third entry in the menu that already holds the screenshot entries: “Mods seen: 133 · open”. It opens a Steam popup over the whole screen, like the AI models screen, with room for two columns: what bonsAI saw on the left, the groups on the right. Done or B closes it. Ask about my mods puts the question in the box.", build: optionA },
    { id: "B", label: "B", title: "A Mods row on the Search tab; the screen is a sheet inside the tab", desc: "Your idea. Under the find box, in the game's section, one row says “Mods seen · 133” with the manager and the frameworks. A opens a sheet over the tab, as a game note opens, 300 wide and scrolling; B closes it. No new door on the Main tab. Ask about my mods switches to Main with the question typed.", build: optionB },
    { id: "C", label: "C", title: "Both doors, one sheet", desc: "The paperclip entry from A and the Search tab row from B, both opening the same in-tab sheet from B. From the Main tab the sheet opens over the Search tab, and B brings you back to where you came from. One screen to build, two ways in: while playing, the paperclip; while browsing, the Search tab.", build: optionC },
    { id: "D", label: "D", group: "perm", groupTitle: "Also drawn: the permission switch, which goes with every option", title: "The switch on the Permissions tab, and its confirm box", desc: "A new row in the Permissions tab, off for everyone until turned on, in today's row style (the density board left this tab as it is). Turning it on shows a confirm box in plain words that says what is read and what is never touched. The Kids lock forces it off.", build: optionD },
  ],
});
