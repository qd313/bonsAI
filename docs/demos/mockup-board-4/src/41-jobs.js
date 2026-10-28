/* ============================================================
   The jobs board: bonsAI working on its own, three situations the maintainer raised on 2026-10-28.
     Tab 1  A game dies at launch: a notice, an offer, a visible job with Stop, one answer; the one-press fix
            drawn as the maintainer's call; the switch that allows the watch.
     Tab 2  A longer job while you play: typed like a question, run on your PC's AI now or on the Deck once the
            game stops; the result is a report with steps you tick off.
     Tab 3  Help outside Game Mode: a guided checklist inside the plugin; Desktop Mode today through a Big Picture
            window (zero build); a bonsAI page in the desktop browser served by the same back end (the big build).
   Drawn on the mods board's pieces (the Search tab, the Mods sheet, Cyberpunk 2077 with 133 mods under Vortex)
   and the density board's kit. The log line in tab 1 is made up to look like a real RED4ext log line; the board
   says so. The frame-rate cost in tab 2 is the measured one (about a third while the Deck's model writes).
   ============================================================ */
{ const i = TABS.findIndex((t) => t.id === "t1"); if (i >= 0) TABS.splice(i, 1); }

ICONS2.mods = svg2('<path d="M10 3.5h4v2.3a1.7 1.7 0 0 0 1.7 1.7H18v4h-2.3a1.7 1.7 0 0 0 0 3.4H18v4h-4v-2.3a1.7 1.7 0 0 0-3.4 0V19H6v-4h2.3a1.7 1.7 0 0 0 0-3.4H6v-4h4z"/>');

const J_GAME = M_GAME;
let J_UID = 0;
function jCtx() { const c = mCtx(); c.uid = "j" + (++J_UID); return c; }

/* ---------- a half-size Deck screen: Steam's page for the game, and a plugin notice bottom right ---------- */
function jNotice({ title, body }) {
  return h("div", { class: "j-notice" }, h("span", { class: "j-nicon", html: ICONS2.logo }), h("div", { class: "j-ntext" }, h("b", {}, title), h("span", {}, body)));
}
function jGameScreen({ notice = null, caption = "" } = {}) {
  const scr = h("div", { class: "j-screen" },
    h("div", { class: "j-sc-top" }, h("span", {}, "83%"), h("span", {}, "9:41 PM")),
    h("div", { class: "j-sc-hero" }, h("div", { class: "j-sc-title" }, J_GAME)),
    h("div", { class: "j-sc-row" }, h("span", { class: "j-sc-play" }, "PLAY"), h("span", { class: "j-sc-meta" }, "LAST PLAYED · JUST NOW", h("br"), "PLAY TIME · 102 HOURS")),
    h("div", { class: "j-sc-foot" }, h("span", {}, h("b", { class: "a" }, "A"), "SELECT"), h("span", {}, h("b", { class: "b" }, "B"), "BACK")));
  scr.setNotice = (n) => { for (const o of $$(".j-notice", scr)) o.remove(); if (n) scr.append(jNotice(n)); };
  scr.setCaption = (t) => { for (const o of $$(".j-scap", scr)) o.remove(); if (t) scr.append(h("div", { class: "j-scap" }, t)); };
  scr.setNotice(notice); scr.setCaption(caption);
  return scr;
}

/* ---------- the Main tab as the stage (the mods board's layout, the Search tab in the bar, the mods icon by the game) ---------- */
function jMain(ctx, { turns = [], typed = "", chips = ["What mods do I have?", "How do I fix stuttering?"], game = J_GAME, mode = "Expert", modsIcon = true, chatName = "Cyberpunk help", chatNo = 2, chatCount = 5 } = {}) {
  const dk = dock2({ chips, typed, game, mode });
  if (modsIcon) $(".k2-game", dk).append(h("span", { class: "j-modsico", html: ICONS2.mods }));
  const body = mainTab2({ transcript: turns, chatName, chatNo, chatCount, dockEl: dk });
  body.replaceChild(tabBar2(0, M_TABS), body.firstElementChild);
  const panel = h("div", { class: "qam", style: `height:${PANEL.h}px` }, body);
  panel.body = body; panel.field = dk.field; panel.ask = dk.ask; panel.scroller = body.scroller; panel.dock = dk;
  panel.chips = $$(".k2-chip", dk);
  return panel;
}
const jOld = (q = "Where is the Kabuki ripperdoc?") => h("div", { class: "k2-turn" }, qBubble2(q, { open: false }));
/* a sheet or a box over the panel: the stops underneath stop counting while it is up */
function jCover(panel, el) { const body = panel.body || panel.firstElementChild; body.classList.add("is-gone"); panel.append(el); el.addEventListener("j-uncover", () => body.classList.remove("is-gone")); }
function jUncover(el) { el.dispatchEvent(new Event("j-uncover")); el.remove(); }

/* ---------- a card in the chat with buttons: the offer, the job card ---------- */
function jCard(ctx, { title, lines = [], buttons = [], cls = "" }) {
  const row = "card" + ctx.uid + (++J_UID);
  const card = h("div", { class: "j-card " + cls }, h("div", { class: "j-ctitle" }, title), ...lines.map((l) => h("p", { class: "j-cline", html: l })));
  if (buttons.length) card.append(h("div", { class: "j-cbtns" }, ...buttons.map(([label, fn, primary]) => {
    const b = h("button", { class: "j-cbtn" + (primary ? " primary" : ""), "data-stop": "", "data-row": row }, label);
    b.addEventListener("click", fn); return b;
  })));
  card.firstButton = () => $(".j-cbtn", card);
  return card;
}
/* Steam's own confirm box, as the plugin draws them: the action on the left, Not now on the right, the ring on Not now */
function jConfirm(ctx, panel, { title, body, yes = "Change it", onYes, onNo }) {
  const r = "cf" + ctx.uid + (++J_UID);
  const y = h("button", { class: "q-btn primary", "data-stop": "", "data-row": r }, yes);
  const n = h("button", { class: "q-btn", "data-stop": "", "data-row": r }, "Not now");
  const modal = h("div", { class: "q-modal m-cmodal" }, h("div", { class: "q-sheet" }, h("div", { class: "q-sheet-head" }, title), h("div", { class: "q-sheet-body m-cbody", html: body }), h("div", { class: "q-sheet-foot" }, y, n)));
  const close = (ok) => { jUncover(modal); if (ok) onYes(); else onNo && onNo(); };
  y.addEventListener("click", () => close(true)); n.addEventListener("click", () => close(false));
  modal.addEventListener("deckkey", (e) => { if (e.detail.key === "B") { e.preventDefault(); close(false); } });
  jCover(panel, modal); Deck.setRing(ctx.root, n, { scroll: false });
}

/* ---------- a job: fixed steps that run one after another; a sheet and a working line draw its state ---------- */
function jRunner(steps, { onDone, onStop, speed = 1 } = {}) {
  const st = { i: -1, done: new Set(), cancelled: false, finished: false, listeners: new Set(), steps };
  const emit = () => { for (const f of st.listeners) f(st); };
  st.on = (f) => { st.listeners.add(f); f(st); };
  st.stop = () => { if (st.finished || st.cancelled) return; st.cancelled = true; emit(); onStop && onStop(); };
  (async () => {
    await sleep(250 / speed);
    for (let i = 0; i < steps.length; i++) {
      if (st.cancelled) return;
      st.i = i; emit();
      await sleep(steps[i].ms / speed);
      if (st.cancelled) return;
      st.done.add(i); emit();
    }
    st.finished = true; emit();
    await sleep(350 / speed);
    if (!st.cancelled) onDone();
  })();
  return st;
}
/* the sheet: every step on a line, ticking; Stop; B hides it and the job carries on */
function jJobSheet(ctx, panel, { title, sub = "Close bonsAI or keep playing; it carries on.", runner, onHide }) {
  const list = h("div", { class: "j-steps" });
  const rows = runner.steps.map((s) => h("div", { class: "j-step wait" }, h("span", { class: "j-sdot" }), h("span", { class: "j-slab" }, s.label), h("span", { class: "j-sdet" }, "")));
  list.append(...rows);
  const stop = h("button", { class: "k-btn red", "data-stop": "" }, "Stop");
  const sheet = h("div", { class: "s-sheet j-sheet" }, h("div", { class: "m-head" }, h("div", { class: "m-title" }, title), h("div", { class: "m-sub" }, sub)), list, h("div", { class: "j-sheetfoot" }, stop), hintBar([["B", "Hide"], ["A", "Stop"]]));
  runner.on((st) => {
    rows.forEach((r, i) => {
      const cls = st.done.has(i) ? "done" : st.cancelled && i === st.i ? "stopped" : i === st.i ? "run" : "wait";
      r.className = "j-step " + cls;
      $(".j-sdet", r).textContent = st.done.has(i) ? (st.steps[i].done || "") : cls === "stopped" ? "stopped here; nothing changed" : "";
    });
    if (st.cancelled || st.finished) { stop.textContent = st.cancelled ? "Close" : "Done"; }
  });
  stop.addEventListener("click", () => { if (runner.cancelled || runner.finished) { jUncover(sheet); onHide(); } else runner.stop(); });
  sheet.addEventListener("deckkey", (e) => { if (e.detail.key === "B") { e.preventDefault(); jUncover(sheet); onHide(); } });
  jCover(panel, sheet); Deck.setRing(ctx.root, stop, { scroll: false });
  return sheet;
}
/* the working line above the chips */
function jWorkLine(ctx, { runner, label, onShow }) {
  const btn = h("button", { class: "j-wbtn", "data-stop": "" }, "Show");
  const text = h("span", { class: "j-wtext" }, label);
  const line = h("div", { class: "j-work" }, h("span", { class: "j-spin" }), text, btn);
  btn.addEventListener("click", () => { if (runner.cancelled || runner.finished) line.remove(); else onShow(); });
  runner.on((st) => {
    if (st.cancelled) { line.className = "j-work stopped"; text.textContent = "Stopped. Nothing was changed."; btn.textContent = "Hide"; }
    else if (st.finished) { line.className = "j-work done"; text.textContent = "Done. The answer is in the chat."; btn.textContent = "Hide"; }
    else if (st.i >= 0) text.textContent = `${label} · step ${st.i + 1} of ${st.steps.length} · ${st.steps[st.i].label.toLowerCase()}`;
  });
  return line;
}
function jPlaybar(root, items) {
  const bar = h("div", { class: "playbar" });
  items.forEach(([label, fn, alt], i) => { const b = h("button", { class: "play" + (alt ? " alt" : ""), type: "button" }, label); b.addEventListener("click", () => fn(root)); bar.append(b); });
  bar.append(h("span", {}, "or drive it yourself: click the panel; Enter is A, Esc is B"));
  return bar;
}
/* a tick row */
function jCheckRow(text, { done = false, sub = "", strip = "" } = {}) {
  const r = h("button", { class: "j-chk" + (done ? " done" : ""), "data-stop": "", "data-desc": strip || null }, h("span", { class: "j-box", html: ICONS.check }), h("span", { class: "grow" }, text, sub ? h("small", {}, sub) : ""));
  r.addEventListener("click", () => r.classList.toggle("done"));
  return r;
}

/* ============================================================ Tab 1: a game dies at launch ============================================================ */
const FAIL = {
  notice: { title: "Cyberpunk 2077 stopped 4 s after starting", body: "Open bonsAI to let it look at why." },
  offerTitle: "Cyberpunk 2077 stopped 4 seconds after starting.",
  offer: ["bonsAI can read Steam's log for the game, the loaders' logs and your mod list, then ask the AI once.", "<b>About 40 s on your PC's AI.</b> Nothing is changed."],
  steps: [
    { label: "Steam's log for the game", ms: 1400, done: "2 lines look like errors" },
    { label: "The mod list and the loaders' logs", ms: 1600, done: "RED4ext: 1 plugin failed to load" },
    { label: "Asking the AI on your PC", ms: 2600, done: "answer ready" },
  ],
  answer: [
    "<b>The game stopped because a loader plugin did not load.</b> RED4ext's log ends with: <i>Codeware 1.18.1 needs game 2.31; this game is 2.3.</i> Steam's log only says the game exited.",
    "The usual causes with a log like this, most likely first:",
    "<b>1.</b> A plugin built for a newer game. Update the game, or get the Codeware made for 2.3 from its own page.<br><b>2.</b> The Proton version. Mod loaders on the Deck want Proton Experimental or GE; this game is set to Proton 9.<br><b>3.</b> The loaders' launch option is missing: <code>WINEDLLOVERRIDES=\"winmm,version=n,b\" %command%</code>",
    "Back up your saves before you change anything. Say which you tried and I'll go on from there.",
  ],
  doneNotice: { title: "bonsAI looked at Cyberpunk 2077", body: "A loader plugin did not load. Open bonsAI for the steps." },
};
function jFailTurn(ctx, { fixes = false, onFix } = {}) {
  const ab = aBubble2(FAIL.answer);
  if (fixes) {
    const r = "fix" + ctx.uid;
    const b1 = h("button", { class: "j-cbtn", "data-stop": "", "data-row": r }, "Set the loaders' launch option");
    const b2 = h("button", { class: "j-cbtn", "data-stop": "", "data-row": r }, "Try Proton Experimental");
    b1.addEventListener("click", () => onFix("launch")); b2.addEventListener("click", () => onFix("proton"));
    ab.append(h("div", { class: "j-abtns" }, b1, b2));
  }
  return h("div", { class: "k2-turn" }, earlierLine2("bonsAI looked at Cyberpunk 2077 · 41 s", { cls: "day" }), ab, detailsLine("Show details · read: Steam's log, RED4ext's log, your mods"));
}
/* A, B and C are one machine: notice or not, fixes or not */
function jLaunch({ notice = true, fixes = false } = {}) {
  const ctx = jCtx();
  const screen = jGameScreen({ caption: notice ? "" : "No notice on the game's page. The offer waits inside bonsAI." });
  const slot = h("div", { class: "j-slot" });
  ctx.root.append(h("div", { class: "j-pair" }, screen, slot));
  let panel = null, runner = null;
  const show = (turns, ring) => { panel = jMain(ctx, { turns, chips: ["Why did it stop?", "What mods do I have?"] }); slot.replaceChildren(panel); Deck.setRing(ctx.root, ring ? ring(panel) : panel.field, { scroll: false }); return panel; };
  const idle = () => { screen.setNotice(null); show([jOld()]); };
  const offer = () => {
    if (notice) screen.setNotice(FAIL.notice);
    const card = jCard(ctx, { title: FAIL.offerTitle, lines: FAIL.offer, buttons: [["Look now", () => run(), true], ["Not now", () => idle()]] });
    show([jOld(), card], () => card.firstButton());
  };
  const run = () => {
    const p = show([jOld(), jCard(ctx, { title: FAIL.offerTitle, lines: ["Looking now. You can close bonsAI; a notice comes when it is done."] })]);
    runner = jRunner(FAIL.steps, {
      onDone: () => result(),
      onStop: () => { if (notice) screen.setNotice(null); },
    });
    const line = jWorkLine(ctx, { runner, label: "Looking at " + J_GAME, onShow: () => sheet() });
    const sheet = () => jJobSheet(ctx, p, { title: "Looking at " + J_GAME, runner, onHide: () => { if (!line.isConnected) p.dock.prepend(line); Deck.setRing(ctx.root, p.field, { scroll: false }); } });
    sheet();
  };
  const result = () => {
    if (notice) screen.setNotice(FAIL.doneNotice);
    const turn = jFailTurn(ctx, { fixes, onFix: (kind) => fix(kind) });
    const p = show([jOld(), turn], () => $("[data-stop]", turn));
    p.scroller.scrollTop = 0;
  };
  const fix = (kind) => {
    const launch = kind === "launch";
    jConfirm(ctx, panel, {
      title: launch ? "Change Cyberpunk 2077's launch options?" : "Change Cyberpunk 2077's Proton version?",
      body: launch
        ? "Today: <b>none</b>.<br>New: <code>WINEDLLOVERRIDES=\"winmm,version=n,b\" %command%</code><br><br>bonsAI keeps a copy of today's in your notes, so you can put it back. The game is not started."
        : "Today: <b>Proton 9.0</b>.<br>New: <b>Proton Experimental</b>.<br><br>bonsAI keeps a note of today's choice, so you can put it back. The game is not started.",
      onYes: () => {
        const card = jCard(ctx, { cls: "ok", title: launch ? "Launch option set." : "Proton Experimental set.", lines: [launch ? "Today's (none) is kept in your notes. Press Play on the game's page to try it." : "Was: Proton 9.0, kept in your notes. Press Play on the game's page to try it."] });
        panel.scroller.append(card); panel.scroller.scrollTop = panel.scroller.scrollHeight;
        Deck.setRing(ctx.root, panel.field, { scroll: false });
      },
    });
  };
  if (fixes) result(); else offer();
  ctx.root.play = async () => {
    if (fixes) { result(); return; }
    idle(); await sleep(900); offer(); await sleep(1800); run();
  };
  ctx.root.reset = () => { if (fixes) result(); else offer(); };
  return ctx.root;
}
/* D: the switch, on the Settings tab in today's row style */
function jWatchSwitch() {
  const ctx = jCtx();
  const rows = [
    ["Watch game launches", "When a game stops within 20 seconds of starting, bonsAI offers to look at why. Never while another game is running, and one offer per game a day. Needs the Read Steam's logs switch on the Permissions tab.", true, true],
    ["Notice when a reply is ready", "A notice when an answer finishes while bonsAI is closed, and when a job you started is done.", true],
    ["Jobs on this Deck wait for the game to stop", "A longer job that needs the AI on this Deck runs once the game stops, so it never costs the game its frames. Off: it runs at once and says what it costs.", true, true],
  ];
  const sc = h("div", { class: "scroll dt-scroll" });
  const panel = h("div", { class: "qam", style: `height:${PANEL.h}px` });
  const draw = (ring) => {
    sc.replaceChildren(h("div", { class: "t-sec first" }, "Notices and jobs"));
    rows.forEach(([label, desc, on, isNew], i) => {
      const sw = h("span", { class: "t-sw" + (on ? " on" : "") });
      const row = h("button", { class: "t-tog", "data-stop": "", "data-start": i === 0 ? "" : null },
        h("div", { class: "t-lab" }, h("span", {}, label, isNew ? h("i", { class: "j-newtag" }, "new") : ""), sw), h("div", { class: "t-desc", html: desc }));
      row.addEventListener("click", () => { rows[i][2] = !rows[i][2]; draw(i); });
      sc.append(row);
    });
    if (ring != null) Deck.setRing(ctx.root, $$(".t-tog", sc)[ring], { scroll: false });
  };
  draw();
  panel.append(h("div", { style: "display:contents" }, tabBar2(3, M_TABS), h("div", { class: "k2-gap" }), sc));
  ctx.root.append(panel);
  return ctx.root;
}

/* ============================================================ Tab 2: a longer job while you play ============================================================ */
const LOAD = {
  q: "make my cyberpunk mod loadout run better",
  title: "This is a longer job.",
  lines: ["bonsAI will read your <b>133 mods</b>, their settings, the loaders' logs and the game's own settings, then write a report with steps you tick off."],
  pc: "Runs on <b>your PC's AI</b> (192.168.86.30). About a minute, and it costs the game nothing.",
  deck: "The AI is on <b>this Deck</b>. While you play, writing the report costs the game about a third of its frames, so bonsAI can wait for the game to stop. About 3 minutes then.",
  steps: [
    { label: "Your mods, settings and load order", ms: 1300, done: "133 mods · 4 REDmods · 19 script mods" },
    { label: "The loaders' logs from the last start", ms: 1300, done: "2 mods did not load" },
    { label: "The game's own settings", ms: 900, done: "Crowd High · FSR3 Balanced · RT off" },
    { label: "Writing the report", ms: 2600, done: "5 steps" },
  ],
  report: "<b>Crowds cost you the frames, not shadows.</b> NIGHT CITY ALIVE, react_to_horn and ResponsiveV all add work for the processor, and Crowd density is on High. Ray tracing is already off.",
  checks: [
    ["Crowd density: High → Medium", "The game's own settings · the biggest single gain", "Open the game's Settings, Gameplay, Crowd density. bonsAI read High from the game's settings file."],
    ["react_to_horn: reaction rate 100 → 60", "Its own settings file under the script mods", "The file sits in the mod's folder under Cyber Engine Tweaks. A text editor in Desktop Mode, or the mod's own menu in game."],
    ["NIGHT CITY ALIVE: turn off Extra traffic", "In Vortex, the mod's settings", "On the PC, in Vortex. On the Deck the copied folder keeps whatever Vortex set."],
    ["Browser Extension Framework and Simple Watch did not load last start", "Check their pages for a 2.31 version, or disable them in Vortex", "RED4ext's log named both. A mod that does not load costs nothing, but it may be why something is missing."],
    ["Keep ray tracing off; try FSR3 Quality after the above", "The game's own settings", "Only once the crowd changes hold 55 to 60 in Kabuki."],
  ],
  closing: "Do one at a time and play five minutes between, so you know which one helped. Back up your saves first. bonsAI changed nothing.",
  notice: { title: "bonsAI finished: your Cyberpunk 2077 loadout report", body: "Five steps to tick off. Open bonsAI." },
};
function jReportTurn(ctx, { onMods, onSave, question = true }) {
  const ab = aBubble2([LOAD.report]);
  const r = "rep" + ctx.uid;
  const b1 = h("button", { class: "j-cbtn", "data-stop": "", "data-row": r }, "Open the Mods sheet"); b1.addEventListener("click", onMods);
  const b2 = h("button", { class: "j-cbtn", "data-stop": "", "data-row": r }, "Save to the Desktop"); b2.addEventListener("click", onSave);
  ab.append(h("div", { class: "j-chklist" }, ...LOAD.checks.map(([t, s]) => jCheckRow(t, { sub: s }))), h("p", { "data-stop": "", html: LOAD.closing }), h("div", { class: "j-abtns" }, b1, b2));
  const kids = [];
  if (question) kids.push(qBubble2(LOAD.q));
  kids.push(earlierLine2("bonsAI worked on this · 58 s on your PC", { cls: "day" }), ab, detailsLine("Show details · read: your mods, the loaders' logs, game settings"));
  return h("div", { class: "k2-turn" }, ...kids);
}
/* the report as a sheet with the strip (B) */
function jReportSheet(ctx, panel, { onClose, onMods }) {
  const sc = h("div", { class: "scroll m-scroll" });
  const strip = h("div", { class: "k-strip m-strip" });
  const r = "rs" + ctx.uid;
  const mods = h("button", { class: "k-btn", "data-stop": "", "data-row": r, "data-desc": "The Mods sheet on the Search tab: what bonsAI saw, and the mods in groups." }, "Open the Mods sheet");
  mods.addEventListener("click", onMods);
  const save = h("button", { class: "k-btn", "data-stop": "", "data-row": r, "data-desc": "Writes this report as a text file in bonsAI's Desktop folder. Needs the Save files to Desktop switch." }, "Save to the Desktop");
  save.addEventListener("click", () => toast(panel, "Saved to Desktop/bonsAI_logs/cyberpunk-loadout-report.txt", 2200));
  sc.append(h("div", { class: "j-sheet-p", html: LOAD.report }), h("div", { class: "k-sec" }, "Steps, tick as you go"),
    h("div", { class: "j-sheet-chk" }, ...LOAD.checks.map(([t, s, d]) => jCheckRow(t, { sub: s, strip: d }))),
    h("div", { class: "k-line m-never", html: LOAD.closing }), h("div", { class: "k-pair m-foot" }, mods, save));
  const sheet = h("div", { class: "s-sheet m-sheet" }, h("div", { class: "m-head" }, h("div", { class: "m-title" }, "Loadout report for " + J_GAME), h("div", { class: "m-sub" }, "Written 58 s on your PC · 2 of 5 steps ticked")), sc, strip, hintBar([["B", "Close"], ["A", "Tick"]]));
  mStrip(ctx, strip);
  sheet.addEventListener("deckkey", (e) => { if (e.detail.key === "B") { e.preventDefault(); jUncover(sheet); onClose(); } });
  jCover(panel, sheet); Deck.setRing(ctx.root, $("[data-stop]", sc), { scroll: false });
  return sheet;
}
/* A: typed like a question, the PC's AI. B: a chip starts it, the result is a sheet, finished reports on the Search tab. C: on the Deck, the job waits for the game to stop. */
function jLoadout({ where = "pc", via = "typed" } = {}) {
  const ctx = jCtx();
  let panel = null, runner = null, phase = "start";
  const chips = via === "chip" ? ["Tune my mod loadout", "What mods do I have?"] : ["What mods do I have?", "How do I fix stuttering?"];
  const show = (turns, opts = {}, ring) => { panel = jMain(ctx, { turns, chips, ...opts }); ctx.root.replaceChildren(panel); Deck.setRing(ctx.root, ring ? ring(panel) : panel.field, { scroll: false }); wire(); return panel; };
  const wire = () => {
    panel.ask.addEventListener("click", () => { if (phase === "start") card(); });
    if (via === "chip") panel.chips[0].addEventListener("click", () => { if (phase === "start") card(); });
  };
  const start = () => { phase = "start"; show([jOld()], via === "typed" ? { typed: LOAD.q } : {}, (p) => via === "typed" ? p.ask : p.chips[0]); };
  const card = () => {
    phase = "card";
    const lines = [...LOAD.lines, where === "pc" ? LOAD.pc : LOAD.deck];
    const buttons = where === "pc"
      ? [["Run now on my PC", () => run("now"), true], ["When the game stops", () => run("wait")], ["Not now", () => start()]]
      : [["When the game stops", () => run("wait"), true], ["Run now anyway", () => run("now")], ["Not now", () => start()]];
    const c = jCard(ctx, { title: LOAD.title, lines, buttons, cls: where === "pc" ? "" : "warn" });
    show([jOld(), h("div", { class: "k2-turn" }, qBubble2(LOAD.q), c)], {}, () => c.firstButton());
  };
  const run = (when) => {
    phase = "run";
    const waiting = when === "wait";
    const p = show([jOld(), h("div", { class: "k2-turn" }, qBubble2(LOAD.q), jCard(ctx, { title: waiting ? "Waiting for the game to stop." : "Working on it.", lines: [waiting ? "The job starts the moment Cyberpunk 2077 stops, and a notice comes when the report is ready. Close bonsAI and play." : (where === "pc" ? "About a minute on your PC. Close bonsAI or keep playing; a notice comes when it is done." : "About 3 minutes on this Deck, while you play. A notice comes when it is done.")] }))]);
    const begin = () => {
      runner = jRunner(LOAD.steps, { onDone: () => done(), speed: where === "pc" ? 1 : 0.6 });
      line.remove();
      const wl = jWorkLine(ctx, { runner, label: "Loadout report", onShow: () => jJobSheet(ctx, p, { title: "Loadout report for " + J_GAME, runner, onHide: () => { if (!wl.isConnected) p.dock.prepend(wl); Deck.setRing(ctx.root, p.field, { scroll: false }); } }) });
      p.dock.prepend(wl);
    };
    let line;
    if (waiting) {
      const stopBtn = h("button", { class: "j-wbtn red", "data-stop": "" }, "Stop");
      line = h("div", { class: "j-work wait" }, h("span", { class: "j-spin" }), h("span", { class: "j-wtext" }, "Waiting for Cyberpunk 2077 to stop · then about " + (where === "pc" ? "1 min" : "3 min")), stopBtn);
      stopBtn.addEventListener("click", () => { line.remove(); start(); });
      p.dock.prepend(line);
      ctx.root.gameStops = () => { if (line.isConnected) begin(); };
    } else { line = h("span"); begin(); }
    Deck.setRing(ctx.root, p.field, { scroll: false });
  };
  const done = () => {
    phase = "done";
    if (via === "chip") {
      const open = earlierLine2("Your loadout report is ready · open", { cls: "day" });
      open.addEventListener("click", () => jReportSheet(ctx, panel, { onClose: () => Deck.setRing(ctx.root, open, { scroll: false }), onMods: () => modsSheet2() }));
      const p = show([jOld(), h("div", { class: "k2-turn" }, qBubble2("Tune my mod loadout"), open)], {}, () => open);
      toast(p, "bonsAI finished: your Cyberpunk 2077 loadout report", 2600);
    } else {
      const turn = jReportTurn(ctx, { onMods: () => modsSheet2(), onSave: () => toast(panel, "Saved to Desktop/bonsAI_logs/cyberpunk-loadout-report.txt", 2200) });
      const p = show([jOld(), turn], {}, () => $("[data-stop]", turn));
      p.scroller.scrollTop = 0;
      toast(p, "bonsAI finished: your Cyberpunk 2077 loadout report", 2600);
    }
  };
  const modsSheet2 = () => { const s = modsSheet(ctx); const onClose = ctx.onClose; ctx.onClose = () => { jUncover(s); ctx.onClose = onClose; Deck.setRing(ctx.root, $(".s-sheet [data-stop]", panel) || panel.field, { scroll: false }); }; jCover(panel, s); Deck.setRing(ctx.root, $("[data-stop]", s), { scroll: false }); };
  const search = () => {
    const p = mSearch(ctx);
    const rep = h("button", { class: "m-srow", "data-stop": "" }, h("span", { class: "s-gi", html: ICONS2.sum }), h("span", { class: "grow" }, h("b", {}, "Reports · 1"), h("small", {}, "Loadout report · 2 of 5 steps ticked · today 9:41 PM")), h("span", { class: "k-fc" }, "▸"));
    rep.addEventListener("click", () => jReportSheet(ctx, p, { onClose: () => Deck.setRing(ctx.root, rep, { scroll: false }), onMods: () => ctx.onMods() }));
    p.modsRow.after(rep);
    ctx.root.replaceChildren(p); Deck.setRing(ctx.root, rep, { scroll: false });
    ctx.onMods = () => { const s = modsSheet(ctx); const was = ctx.onClose; ctx.onClose = () => { s.remove(); ctx.onClose = was; Deck.setRing(ctx.root, $(".s-sheet [data-stop]", p) || rep, { scroll: false }); }; p.append(s); Deck.setRing(ctx.root, $("[data-stop]", s), { scroll: false }); };
  };
  ctx.root.addEventListener("deckkey", (e) => {
    if (e.defaultPrevented) return;
    if (e.detail.key === "Y" && via === "chip" && phase === "done" && $(".k2-dock", ctx.root)) { e.preventDefault(); search(); }
    else if (e.detail.key === "B" && via === "chip" && !$(".k2-dock", ctx.root) && !$(".s-sheet", ctx.root)) { e.preventDefault(); done(); }
  });
  start();
  ctx.root.play = async () => {
    start(); await sleep(900); card(); await sleep(1800);
    if (where === "pc") run("now"); else { run("wait"); await sleep(2200); ctx.root.gameStops && ctx.root.gameStops(); }
  };
  return ctx.root;
}

/* ============================================================ Tab 3: help outside Game Mode ============================================================ */
const HEROIC = {
  q: "help me set up heroic on my deck",
  intro: "<b>Heroic runs your GOG, Epic and Amazon games on the Deck.</b> It needs Desktop Mode once, to install; after that the games sit in Game Mode like any other. Six steps; bonsAI keeps the list until you finish.",
  steps: [
    ["Switch to Desktop Mode", "Steam button, Power, Switch to Desktop. This list is here when you come back, and bonsAI is reachable there through a Big Picture window.", ""],
    ["Install Heroic from Discover", "Open Discover (the shopping-bag icon in the taskbar), search for Heroic Games Launcher, press Install. It is a Flatpak, so SteamOS updates leave it alone.", "yes"],
    ["Sign in to GOG or Epic in Heroic", "Open Heroic, pick the store, sign in in the window it opens. bonsAI never sees your login.", ""],
    ["Install the game", "Pick where it goes: the home folder or the SD card. Big games go on the card.", "no"],
    ["Add it to Steam from Heroic", "In Heroic, the game's menu, Add to Steam. That makes the shortcut Game Mode needs.", "no"],
    ["Return to Game Mode", "Double-tap Return to Gaming Mode on the desktop. The game is in your library under Non-Steam.", ""],
  ],
  checks: { yes: "Checked: Heroic is installed (seen in the app list).", no: "bonsAI can check this: press Check again once you have done it." },
};
function jGuideSheet(ctx, panel, { onClose, done = new Set([0, 1]) }) {
  const list = h("div", { class: "j-gsteps" });
  const strip = h("div", { class: "k-strip" });
  const prog = h("span", { class: "j-gprog" }, "");
  const r = "gf" + ctx.uid;
  const ask = h("button", { class: "k-btn", "data-stop": "", "data-row": r }, "Ask about this step");
  const check = h("button", { class: "k-btn", "data-stop": "", "data-row": r }, "Check again");
  const foot = h("div", { class: "j-gfoot" }, h("div", { class: "k-pair" }, ask, check));
  const sheet = h("div", { class: "s-sheet j-guide" }, h("div", { class: "m-head" }, h("div", { class: "m-title" }, "Set up Heroic on this Deck"), h("div", { class: "m-sub" }, "Kept until you finish, across Desktop and Game Mode · ", prog)), list, strip, foot, hintBar([["B", "Close"], ["A", "Tick"]]));
  const draw = (ring) => {
    list.replaceChildren(...HEROIC.steps.map(([label, text, can], i) => {
      const row = h("button", { class: "j-gstep" + (done.has(i) ? " done" : ""), "data-stop": "", "data-desc": text + (can ? " " + HEROIC.checks[can] : "") },
        h("span", { class: "j-gnum" }, done.has(i) ? "" : String(i + 1)), h("span", { class: "j-gl" }, label), can ? h("span", { class: "j-gcan " + (can === "yes" ? "yes" : "") }, can === "yes" ? "checked ✓" : "can check") : "");
      row.addEventListener("click", () => { if (done.has(i)) done.delete(i); else done.add(i); draw(i); });
      return row;
    }));
    prog.textContent = `${done.size} of ${HEROIC.steps.length} done`;
    if (ring != null) Deck.setRing(ctx.root, $$(".j-gstep", list)[ring], { scroll: false });
  };
  draw();
  mStrip(ctx, strip);
  ask.addEventListener("click", () => { const cur = $(".j-gstep.ring", list); toast(panel, `“${cur ? $(".j-gl", cur).textContent : "Install Heroic"}: how?” goes in the question box, with the step attached.`, 2400); });
  check.addEventListener("click", () => toast(panel, "Checked just now: Heroic is installed. The game is not in Steam yet.", 2400));
  sheet.addEventListener("deckkey", (e) => { if (e.detail.key === "B") { e.preventDefault(); jUncover(sheet); onClose(); } });
  jCover(panel, sheet); Deck.setRing(ctx.root, $(".j-gstep", list), { scroll: false });
  return sheet;
}
/* a Main tab holding the Heroic answer with the checklist's door, used by A and inside B's Big Picture window */
function jGuideMain(ctx, { open = false, asked = true } = {}) {
  const door = earlierLine2("Open the checklist · 6 steps · 2 done", { cls: "day" });
  const turn = h("div", { class: "k2-turn" }, qBubble2(HEROIC.q), aBubble2([HEROIC.intro]), door);
  const panel = jMain(ctx, { turns: asked ? [turn] : [jOld()], typed: asked ? "" : HEROIC.q, chips: ["Set up Heroic", "Install a mod manager"], game: "No game", modsIcon: false, chatName: "Heroic setup", chatNo: 3, chatCount: 6 });
  door.addEventListener("click", () => jGuideSheet(ctx, panel, { onClose: () => Deck.setRing(ctx.root, door, { scroll: false }) }));
  panel.door = door;
  if (open) jGuideSheet(ctx, panel, { onClose: () => Deck.setRing(ctx.root, door, { scroll: false }) });
  return panel;
}
function jGuideA() {
  const ctx = jCtx();
  const show = (asked) => { const p = jGuideMain(ctx, { asked }); ctx.root.replaceChildren(p); if (asked) Deck.setRing(ctx.root, p.door, { scroll: false }); else { Deck.setRing(ctx.root, p.ask, { scroll: false }); p.ask.addEventListener("click", () => show(true)); } return p; };
  show(false);
  ctx.root.play = async () => { show(false); await sleep(900); const p = show(true); await sleep(1200); p.door.click(); };
  return ctx.root;
}
/* the Desktop Mode drawings */
function jDiscover() {
  return h("div", { class: "j-win j-discover" }, h("div", { class: "j-wtitle" }, "Discover"),
    h("div", { class: "j-wbody" },
      h("div", { class: "j-dside" }, ...["Home", "Search", "Installed", "Updates", "Settings"].map((x, i) => h("span", { class: i === 1 ? "on" : "" }, x))),
      h("div", { class: "j-dmain" },
        h("div", { class: "j-dapp" }, h("span", { class: "j-dicon" }), h("div", {}, h("b", {}, "Heroic Games Launcher"), h("small", {}, "GOG, Epic and Amazon games · Flathub")), h("span", { class: "j-dinst" }, "Install")),
        h("div", { class: "j-dshot" }),
        h("p", {}, "An open-source launcher for GOG, Epic Games Store and Amazon Prime Games. Runs Windows games through Wine or Proton."))));
}
function jDesktop(rightWin, rightName) {
  return h("div", { class: "deck-swap" }, h("div", { class: "j-desk" }, jDiscover(), rightWin,
    h("div", { class: "j-task" }, h("span", { class: "j-tk logo" }), h("span", { class: "j-tk on" }, "Discover"), h("span", { class: "j-tk" }, rightName), h("span", { class: "j-tclock" }, "9:41 PM"))));
}
function jDesktopBpm() {
  const ctx = jCtx();
  const panel = jGuideMain(ctx, { open: true });
  const win = h("div", { class: "j-win j-bpm" }, h("div", { class: "j-wtitle" }, "Steam · Big Picture Mode"),
    h("div", { class: "j-bpmbody" }, h("div", { class: "j-bpmhero" }, "Cyberpunk 2077"), h("div", { class: "j-bpmplay" }, "PLAY"), h("div", { class: "j-bpmrail" }), h("div", { class: "j-bpmqam" }, panel)));
  return jDesktop(win, "Steam");
}
function jDesktopPage() {
  const steps = HEROIC.steps.map(([label, , can], i) => h("div", { class: "j-wstep" + (i < 2 ? " done" : "") }, h("span", { class: "j-gnum" }, i < 2 ? "✓" : String(i + 1)), h("span", {}, label), can ? h("span", { class: "j-gcan " + (can === "yes" ? "yes" : "") }, can === "yes" ? "checked" : "can check") : ""));
  const win = h("div", { class: "j-win j-ff" }, h("div", { class: "j-wtitle" }, h("span", { class: "j-url" }, "http://localhost:8411"), "bonsAI — Firefox"),
    h("div", { class: "j-ffbody" },
      h("div", { class: "j-whead" }, h("span", { class: "j-wlogo", html: ICONS2.logo }), "bonsAI", h("small", {}, "Set up Heroic · 2 of 6 done")),
      h("div", { class: "j-wsteps" }, ...steps),
      h("div", { class: "j-wchat" }, h("div", { class: "j-wq" }, "Discover says Install, then nothing happens"), h("div", { class: "j-wa" }, "Discover sometimes shows Install twice on the Deck. Press it once more and watch the taskbar: Heroic appears there when it is done. I'll check for it when you say so."), h("div", { class: "j-wbox" }, "Ask about this step…", h("span", {}, "Ask")))));
  return jDesktop(win, "Firefox");
}

/* ============================================================ the board tabs ============================================================ */
function jBrief(cols) {
  return h("div", { class: "m-brief" }, ...cols.map(([title, items]) => h("section", {}, h("h3", {}, title), h("ul", {}, ...items.map((x) => h("li", { html: x }))))));
}
TABS.push({
  id: "t1", n: 1, name: "A game dies at launch", stars: 4, wide: true,
  title: "A game dies at launch: bonsAI notices, offers to look, and answers",
  today: [
    "A game that stops seconds after starting leaves you on its page in the library with nothing said. bonsAI knows nothing happened.",
    "If you open bonsAI and type “cyberpunk won't start”, the answer comes from Steam's log for the game only, and only with the Read Steam's logs switch on.",
    "Steam already tells every plugin when a game starts and when it stops. bonsAI uses the start for the game tag and ignores the stop.",
  ],
  deciding: [
    "Whether bonsAI speaks up by itself with a notice on the game's page (A), or keeps the offer inside the panel for the next time you open it (B).",
    "Whether the answer may offer one-press fixes, a Proton change or a launch option, with a copy of today's kept (C). The house rule since the connection doctor: nothing changes without a press, and Stop works at any step.",
    "The switch (D) goes with every option: on for everyone, or off until turned on.",
  ],
  howto: "Press <b>Play it through</b> under A to watch the whole thing: the notice, the offer, the steps, the answer. Or drive it: click the panel, Enter on <b>Look now</b>, then B hides the steps while they carry on. In C press Enter on one of the two fix buttons. The RED4ext log line is made up to look like a real one.",
  controls: () => jBrief([
    ["How it works", ["The trigger is Steam's own game-stopped signal within 20 seconds of its game-started one.", "The job is fixed steps in code: Steam's log, the loaders' logs and the mod list (plan 101's look), then one question to the AI. Not a free-roaming helper.", "A notice is Decky's own kind, like the reply-ready notice today; tapping it opens bonsAI."]],
    ["What it never does", ["Never restarts the game, never changes a file or a setting on its own (C changes one thing, after a press, with a copy kept).", "Never says “the cause is X” when the log does not say so; it gives the usual causes in order.", "Never fires while another game is running, and at most once per game a day."]],
    ["What it costs, roughly", ["The job engine (trigger, fixed steps, the sheet with Stop, the notices): about three stars, shared with tab 2.", "The launch-failure job on top: about two stars, after plan 101 lands.", "The one-press fixes: about two stars more, your call."]],
  ]),
  options: [
    { id: "A", label: "A", title: "A notice on the game's page, then a visible job with Stop", desc: "Steam's page shows a plugin notice: the game stopped 4 s after starting. Opening bonsAI shows the offer at the top of the chat; Look now runs three steps you can watch, hide, or stop; the answer names what the log says and the usual causes in order. A second notice says it is done.", build: () => { const r = jLaunch({ notice: true }); return [r, jPlaybar(r, [["Play it through", (x) => x.play()], ["Start over", (x) => x.reset(), true]])]; } },
    { id: "B", label: "B", title: "No notice: the offer waits inside bonsAI", desc: "The same offer, steps and answer, but nothing appears over the game's page. You find the offer the next time you open bonsAI. Quieter, and easy to miss; the answer is the same.", build: () => { const r = jLaunch({ notice: false }); return [r, jPlaybar(r, [["Play it through", (x) => x.play()], ["Start over", (x) => x.reset(), true]])]; } },
    { id: "C", label: "C", title: "The answer may offer a one-press fix", desc: "Your call. The same answer ends with two buttons: set the loaders' launch option, or try Proton Experimental. Each opens a plain confirm box that shows today's value and the new one, keeps a copy of today's in your notes, and never starts the game. Steam gives plugins both calls; other Decky plugins use them.", build: () => { const r = jLaunch({ notice: true, fixes: true }); return [r, jPlaybar(r, [["Start over", (x) => x.reset(), true]])]; } },
    { id: "D", label: "D", group: "sw", groupTitle: "Also drawn: the switches, which go with every option", title: "The switches on the Settings tab", desc: "Three rows in today's row style: Watch game launches (the trigger), the notice when a reply or a job is ready (exists today, now covers jobs), and whether a job that needs the Deck's own AI waits for the game to stop (tab 2). On for everyone, or off until turned on: your call.", build: jWatchSwitch },
  ],
});
TABS.push({
  id: "t2", n: 2, name: "A longer job while you play", stars: 3, wide: true,
  title: "A longer job while you play: “make my Cyberpunk loadout run better”",
  today: [
    "Every answer is one question and one reply, a minute or two at most, and nothing runs after it. If you close bonsAI the answer waits there.",
    "The Deck's own model costs a running game about a third of its frames while it writes (measured in God of War, 31 to 20 and back). A model on your PC over the network costs the game nothing.",
    "bonsAI cannot try a change, play, and measure. There is no frame-rate reader inside the plugin, and it cannot play the game.",
  ],
  deciding: [
    "How a job starts: typed like any question, with bonsAI recognising a job-shaped ask (A, C), or from a chip shown when mods were seen (B).",
    "Where and when it runs: your PC's AI now (A), or the Deck's own AI once the game stops (C). The card says what it costs either way.",
    "What the result looks like: a report in the chat with steps you tick off (A), or a sheet with the strip, with finished reports kept on the Search tab (B).",
  ],
  howto: "Press <b>Play it through</b> under each. In A and C the question is already typed: Enter on Ask shows the job card. In B press Enter on the <b>Tune my mod loadout</b> chip. While a job runs, <b>Show</b> on the working line opens the steps, B hides them again. In B, once the report is ready, Y opens the Search tab with the Reports row. In C the game must stop first: the second button under the panel does that.",
  controls: () => jBrief([
    ["How it works", ["The job is plan 101's look (your mods, their settings, the loaders' logs, the game's settings) plus the mod knowledge cards, then one long question to the AI, written as a report with steps.", "It runs behind the screen like the chat summary does today, with the same kind of Stop as the connection doctor's sheet.", "The result is advice you apply. Ticking a step is for you; bonsAI changes nothing."]],
    ["What it never does", ["Never edits a mod, a mod's settings, a load order or the game's settings. A proposed settings file written to the Desktop folder for you to copy in is the most it could do later, with a backup, on your press.", "Never runs the Deck's own model during play without saying what it costs.", "Never claims two mods are compatible; it says to check the mod's own page."]],
    ["What it costs, roughly", ["The job engine, shared with tab 1: about three stars.", "The loadout job on top: two to three stars, after plan 101 and the mod cards land.", "A frame-rate reader so bonsAI could measure its own advice: not in reach; the test rig measures from outside."]],
  ]),
  options: [
    { id: "A", label: "A", title: "Typed like a question; the job runs on your PC's AI now", desc: "You type it like any question. bonsAI recognises a job-shaped ask and answers with a card: what it will read, where it runs and what it costs, with Run now, When the game stops, and Not now. A working line above the chips shows the step; Show opens the steps; a notice comes when it is done. The report is an answer with five steps to tick off, and two buttons: the Mods sheet, and save to the Desktop.", build: () => { const r = jLoadout({ where: "pc", via: "typed" }); return [r, jPlaybar(r, [["Play it through", (x) => x.play()]])]; } },
    { id: "B", label: "B", title: "A chip starts it; the result is a sheet; finished reports live on the Search tab", desc: "A chip, Tune my mod loadout, shows once mods were seen. The same card and working line. When it is done the chat gets one line, Your loadout report is ready, and A opens the report as a sheet like the Mods sheet: the steps to tick, the ringed step's longer text in the strip, the two buttons at the end. The Search tab gains a Reports row under the game, so a report is there next week.", build: () => { const r = jLoadout({ where: "pc", via: "chip" }); return [r, jPlaybar(r, [["Play it through", (x) => x.play()]])]; } },
    { id: "C", label: "C", title: "On the Deck: the job waits for the game to stop", desc: "The honest Deck path. When the AI runs on this Deck the card says what running now would cost (about a third of the frames) and offers When the game stops first, Run now anyway second. A waiting line sits above the chips; the moment the game stops the job starts and a notice comes when the report is ready, about three minutes later.", build: () => { const r = jLoadout({ where: "deck", via: "typed" }); return [r, jPlaybar(r, [["Play it through", (x) => x.play()], ["The game stops now", (x) => x.gameStops && x.gameStops(), true]])]; } },
  ],
});
TABS.push({
  id: "t3", n: 3, name: "Help outside Game Mode", stars: 4, wide: true,
  title: "Help outside Game Mode: a launcher to set up, a mod that needs the desktop",
  today: [
    "bonsAI lives in the Quick Access Menu. Desktop Mode has no Quick Access Menu, so the panel is out of reach there unless you open a Big Picture window and alt-tab between it and Discover or Konsole.",
    "A question like “how do I set up Heroic?” gets a prose answer from the knowledge cards. There is no list to tick, and bonsAI cannot see whether a step landed.",
    "The strategy checklist (five dots, tick a step) and your notes exist and could carry this.",
  ],
  deciding: [
    "A guided checklist inside the plugin (A): steps with ticks, the ringed step's longer text, Ask about this step, and bonsAI checking the steps it can see (an app in the app list, a shortcut in Steam).",
    "Whether the Big Picture window route is good enough for Desktop Mode in a first version (B: works today, zero build, clumsy).",
    "Or a bonsAI page in the desktop browser, served by the same back end on the Deck itself (C): the real “be there” answer, and the biggest build. Still Decky: a second face on the same engine, not a separate install.",
  ],
  howto: "In A press Enter on Ask, then on <b>Open the checklist</b>; Enter ticks a step, the strip shows the step's longer text, B closes. B and C are drawings of the Deck's desktop at half size, with the panel inside the Big Picture window in B; they are not driven.",
  controls: () => jBrief([
    ["How it works", ["A checklist is knowledge-base content: one per task (Heroic, Lutris, a mod manager, a mod that needs the desktop), with the SteamOS steps and what bonsAI can check after each.", "Progress is kept in the back end, which runs in both modes, so the list survives the switch to Desktop Mode and back.", "A check is a read: the installed app list, a folder, a Steam shortcut. bonsAI never does the step for you."]],
    ["What it never does", ["Never clicks in Discover, Dolphin or Konsole, never reads the desktop screen.", "Never installs Heroic, a mod manager or a mod. A plugin that installs software as root is a no for the store and for trust.", "Never signs in anywhere for you."]],
    ["What it costs, roughly", ["The checklist sheet and its door: two to three stars, reusing the route look; each task's steps are content.", "B is zero build: a line in the guide.", "C, the desktop page: four to five stars, its own later roadmap entry; a second screen to keep working, locked to this Deck only."]],
  ]),
  options: [
    { id: "A", label: "A", title: "A guided checklist inside bonsAI", desc: "You ask for help with Heroic. The answer is three lines and a door: Open the checklist, 6 steps. The sheet lists the steps; A ticks one; the strip shows the step's longer text; two steps carry a “can check” badge, and Check again reads whether they landed. Ask about this step puts the step in the question box. The list is kept until you finish, in Desktop Mode too.", build: () => { const r = jGuideA(); return [r, jPlaybar(r, [["Play it through", (x) => x.play()]])]; } },
    { id: "B", label: "B", today: true, title: "Desktop Mode today: a Big Picture window beside Discover", desc: "What works now, with nothing built: in Desktop Mode, open Steam's Big Picture window, press the Quick Access button, and bonsAI is there with the checklist. You alt-tab between that window and Discover. Clumsy, but real, and the back end is the same one.", build: () => [jDesktopBpm(), h("p", { class: "j-cap" }, h("b", {}, "Half size."), " Discover on the left with Heroic's Install button; the Big Picture window on the right with bonsAI's checklist open in the Quick Access panel.")] },
    { id: "C", label: "C", title: "A bonsAI page in the desktop browser, from the same back end", desc: "The back end that runs the panel also serves one small page on the Deck itself, reachable only from this Deck. Open it in Firefox beside Discover: the same checklist, the same chat, the same model, the same notes. Nothing to install twice. The biggest build on this board, and its own later entry; it is still Decky, not a bolt-on.", build: () => [jDesktopPage(), h("p", { class: "j-cap" }, h("b", {}, "Half size."), " Discover on the left; Firefox on the right showing bonsAI's own page: the checklist, a question about the step, the answer.")] },
  ],
});
