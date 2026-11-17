/* ============================================================
   Tab 4: first-time setup (roadmap, Features, three stars: "bring back the starter set and make it simpler").
   The starter set is back already (one button installs the AI engine, the starter model, the note-search model and the
   two speech models). This tab is about cutting the steps. Every panel is the whole Deck screen (853 by 534 points: the
   Deck's own 1280 by 800 at 1.5 pixels a point), because the first-run boxes are Steam popups that close Quick Access,
   not parts of the 300-wide panel.
   Words, sizes and the real order come from the plugin's code (read on tip d58e3155):
     the Beta Notice and the order of the gates   features/plugin-shell/useDisclaimerAndLocalRuntimeGates.tsx
     the "Where should the AI run?" popup         features/ai-connection/first-run/FirstRunWhereAiRunsModal.tsx
     the download box, its site lines             features/downloads/downloadNotice.tsx, downloadSites.ts
     the starter set's words and sizes            features/models/localOllamaStarterSet.tsx, ...Section.constants.tsx
     the progress lines                           features/ai-connection/useLocalOllamaSetupFlow.tsx, back-end progress text
     the box with a scrolling middle              shared/TwoButtonConfirmModal.tsx (240 points of words, 64 a step)
   Three kinds of panel text: the plugin's own words (copied), proposed words for the options, and short amber board notes.
     T  today, pressable from the first open to the first question, with the "press Install too early" trap
     A  one first screen, one press starts everything, one changing line on the chat with a Stop
     B  the same first screen, then a live setup screen (every step, its site, how far) with a Stop that always works
     C  the smallest change: today's boxes, the beta line folded in, Install waiting for the check
     W  outside the box: no boxes at all, setup is the first message in the chat
   Every panel counts presses (A, B and the D-pad) from the first open until the Main tab is in front of you with the AI
   ready; that count is the number to compare. */

/* ---------- what the code says, word for word ---------- */
const B5T4_LINK = "https://github.com/qd313/bonsAI/issues";
const B5T4_BETA_NOTICE = "Welcome to bonsAI! This plugin is in beta, and its AI can be wrong, so check anything important. Heavy AI on the Deck can crash a game. Use at your own risk. Report bugs at " + B5T4_LINK;
const B5T4_W = {
  title: "Where should the AI run?",
  lead: "bonsAI needs Ollama, a free program that runs the AI. It can run on this Deck or on a PC on your home network. You can change this later on the Ollama tab.",
  runOnDeck: "Run AI on this Deck",
  runOnDeckHelp: "Works anywhere, no PC needed. The AI and your game share the Deck's chip, so both slow down while it answers.",
  autostart: "Start the AI with the Deck",
  autostartHelp: "Starts it each time the Deck turns on, so the first answer comes sooner.",
  installNote: "Install Ollama downloads it and the starter models, about 4.6 GB. You are asked before anything downloads.",
  pcHelp: "Just the PC's address, for example 192.168.1.20. bonsAI adds Ollama's usual port (11434) when you leave it out.",
  pcNeeds: "The PC needs Ollama with a model, and must accept connections from your network.",
};
/* downloadSites.ts: the five notices; the voice engine's is the one the already-decided change adds to the starter set */
const B5T4_N = {
  ollama: { site: "https://ollama.com", what: "Ollama, if it is not installed yet", size: null },
  models: { site: "https://registry.ollama.ai", what: "gemma4:e2b-it-qat, nomic-embed-text", size: "about 4.6 GB" },
  speech: { site: "https://huggingface.co", what: "the tiny.en and base.en speech models", size: "about 230 MB" },
  voice: { site: "https://ghcr.io", what: "the voice engine's build image, which then fetches its compilers from its own package servers", size: null },
  updOllama: { site: "https://ollama.com", what: "the newest Ollama", size: null },
  updModels: { site: "https://registry.ollama.ai", what: "newer versions of the models you have installed", size: null },
};
const b5t4Line = (n) => `bonsAI will connect to ${n.site} to download ${n.what} (${n.size || "size not known ahead of time"}).`;
const B5T4_CLOSING = "Internet downloads are off. Turning them on lets bonsAI download only when you press a download button. You can turn them off in Permissions.";
/* starterSetBoxBody(true, true): what the box says under the site lines on a fresh install */
const B5T4_PARAS = [
  { html: 'The starter set is the answer model <span class="b5t4-cy">gemma4:e2b-it-qat</span>, which can chat, read screenshots and text in pictures, and help in Strategy mode; the note-search model <span class="b5t4-cy">nomic-embed-text</span>; and the speech models <span class="b5t4-cy">tiny.en and base.en</span> for the microphone. Rough download: about 4.5 GiB in all (the answer model, the note-search model and the speech models).' },
  { hi: true, html: "A model you already have is not downloaded again. If one download fails the others still go ahead, and the tab says which one failed. The speech models download even with the microphone permission off; Voice input stays off until you turn it on in the Permissions tab." },
  { hi: true, html: "Cancel or B installs nothing. You can install Ollama and pull models later." },
  { hi: true, html: "Default model folder on this account: /home/deck/.ollama/models (override with the OLLAMA_MODELS environment variable if you moved the store)." },
  { html: "Downloads can take a while. Keep Ollama running and the Deck awake and online until they finish. Plug in if you can." },
];
const B5T4_VOICE_PARA = { hi: true, html: "The starter set also builds the voice engine, so the microphone works as soon as you turn on Voice input." };
const B5T4_RESULT = "Ollama 0.40.6 is ready. Downloaded 2 models. Downloaded gemma4:e2b-it-qat and nomic-embed-text. Speech models ready: tiny.en and base.en.";
const B5T4_MIC_OFF = "Turn on Voice input (microphone) in the Permissions tab to use them.";
const B5T4_TREE = "Ask anything — this slot keeps its own history.";

/* ---------- the download, played fast: the plugin's real stages and wording, invented numbers ---------- */
function b5t4Plan({ voice = false, engineOnly = false } = {}) {
  if (engineOnly) return [
    { id: "check", g: "ollama", ms: 600, text: "Checking…" },
    { id: "install", g: "ollama", ms: 1300, text: "Installing Ollama…" },
    { id: "service", g: "ollama", ms: 800, text: "Starting Ollama service…" },
    { id: "fin", g: "fin", ms: 400, text: "Finishing…" },
  ];
  const p = [
    { id: "check", g: "ollama", ms: 600, text: "Checking…" },
    { id: "install", g: "ollama", ms: 1300, text: "Installing Ollama…" },
    { id: "service", g: "ollama", ms: 800, text: "Starting Ollama service…" },
    { id: "pull1", g: "gemma", ms: 1800, pull: { n: 1, tag: "gemma4:e2b-it-qat", hash: "6e4c38e1172f", total: 4300, speed: 38 } },
    { id: "pull2", g: "nomic", ms: 900, pull: { n: 2, tag: "nomic-embed-text", hash: "970aa74c0a90", total: 270, speed: 24 } },
    { id: "sp1", g: "speech", ms: 700, speech: "tiny.en" },
    { id: "sp2", g: "speech", ms: 700, speech: "base.en" },
  ];
  if (voice) p.push({ id: "voice", g: "voice", ms: 1000, text: "Building the voice engine…" });
  p.push({ id: "fin", g: "fin", ms: 400, text: "Finishing…" });
  return p;
}
const b5t4Size = (mb) => (mb >= 1000 ? (mb / 1000).toFixed(1) + " GB" : Math.round(mb) + " MB");
const b5t4Time = (s) => (s >= 60 ? Math.floor(s / 60) + "m" + String(s % 60).padStart(2, "0") + "s" : s + "s");
/* the line useLocalOllamaSetupFlow draws while a run goes: "Pull 1/2 — gemma4:e2b-it-qat · Downloading 6e4c...: 43% ..." */
function b5t4StepDetail(s, pct) {
  if (s.pull) {
    const done = (s.pull.total * pct) / 100;
    const rem = Math.max(1, Math.round((s.pull.total - done) / s.pull.speed));
    return `Downloading ${s.pull.hash}: ${pct}% ${b5t4Size(done)}/${b5t4Size(s.pull.total)} ${s.pull.speed} MB/s ${b5t4Time(rem)}`;
  }
  if (s.speech) return `Downloading speech model ${s.speech}: ${pct}%`;
  return s.text;
}
function b5t4StepLine(s, pct) {
  if (s.pull) return `Pull ${s.pull.n}/2 — ${s.pull.tag} · ${b5t4StepDetail(s, pct)}`;
  if (s.speech) return `Pull 2/2 · ${b5t4StepDetail(s, pct)}`;
  return s.text;
}
function b5t4MakeRun(plan, onEmit) {
  const run = { plan, i: 0, t: 0, phase: "running", timer: null };
  const total = plan.reduce((a, s) => a + s.ms, 0);
  run.pct = () => { const s = plan[Math.min(run.i, plan.length - 1)]; return Math.min(99, Math.round((100 * run.t) / s.ms)); };
  run.step = () => plan[Math.min(run.i, plan.length - 1)];
  run.line = () => b5t4StepLine(run.step(), run.pct());
  run.detail = () => b5t4StepDetail(run.step(), run.pct());
  run.overall = () => (run.phase === "done" ? 100 : Math.round((100 * (plan.slice(0, run.i).reduce((a, s) => a + s.ms, 0) + run.t)) / total));
  run.emit = () => onEmit && onEmit(run);
  run.stop = () => { if (run.phase !== "running") return; run.phase = "stopped"; clearInterval(run.timer); run.emit(); };
  run.kill = () => { clearInterval(run.timer); run.phase = "killed"; onEmit = null; };
  run.timer = setInterval(() => {
    run.t += 100;
    if (run.t >= plan[run.i].ms) {
      run.i++; run.t = 0;
      if (run.i >= plan.length) { run.phase = "done"; clearInterval(run.timer); }
    }
    run.emit();
  }, 100);
  return run;
}
/* one row of option B: which of Ollama, answer model, note-search model, speech models, voice engine this is */
function b5t4Group(run, g) {
  const idx = run.plan.map((s, i) => [s, i]).filter(([s]) => s.g === g);
  const first = idx[0][1], last = idx[idx.length - 1][1];
  if (run.phase === "done" || run.i > last) return { state: "done" };
  if (run.i >= first) {
    const tot = idx.reduce((a, [s]) => a + s.ms, 0);
    const within = idx.filter(([, i]) => i < run.i).reduce((a, [s]) => a + s.ms, 0) + run.t;
    return { state: run.phase === "stopped" ? "stopped" : "run", pct: Math.min(99, Math.round((100 * within) / tot)) };
  }
  return { state: run.phase === "stopped" ? "notstarted" : "wait" };
}
const B5T4_GNAMES = { ollama: "Ollama", gemma: "the answer model", nomic: "the note-search model", speech: "the speech models", voice: "the voice engine" };
function b5t4KeptLine(run) {
  const gs = [...new Set(run.plan.map((s) => s.g))].filter((g) => g !== "fin");
  const kept = gs.filter((g) => b5t4Group(run, g).state === "done").map((g) => B5T4_GNAMES[g]);
  const rest = gs.filter((g) => b5t4Group(run, g).state !== "done").map((g) => B5T4_GNAMES[g]);
  const join = (a) => (a.length > 1 ? a.slice(0, -1).join(", ") + " and " + a[a.length - 1] : a[0] || "nothing");
  return `Stopped. Kept: ${join(kept)}. Not installed: ${join(rest)}.`;
}

/* ---------- the pieces every panel shares ---------- */
function b5t4Icon(k, cls = "") { return h("span", { class: "st-i " + cls, html: STEAM_ICONS[k] }); }
/* The whole Deck screen. With a qam it is Quick Access open (rail + 300-wide panel); with a box it is a popup, and Steam closes Quick Access behind it. */
function b5t4Stage({ qam = null, box = null } = {}) {
  const top = h("div", { class: "st-top b5t4-top" }, ...(qam ? [b5t4Icon("search", "first")] : []), b5t4Icon("bell"), b5t4Icon("cast"),
    h("span", { class: "st-batt" }, "85%", h("i")), h("span", { class: "st-time" }, "1:35 PM"), h("span", { class: "st-avatar" }));
  const bot = h("div", { class: "st-foot b5t4-bot" }, h("span", { class: "b5t4-menu" }, "MENU"), h("b", { class: "a" }, "A"), "SELECT", h("b", { class: "b" }, "B"), "BACK");
  const el = h("div", { class: "b5t4-screen" }, h("div", { class: "b5t4-bg" }), top);
  if (qam) el.append(h("div", { class: "b5t4-mid" }, h("div", { class: "st-rail" }, ...["bell", "friends", "gear", "bolt", "music", "help", "plug"].map((k) => h("span", { class: k === "plug" ? "on" : "", html: STEAM_ICONS[k] }))), qam));
  if (box) el.append(h("div", { class: "b5t4-dim" }, box));
  el.append(bot);
  return el;
}
/* every stop that has a data-id, by that id, so a screen can put the ring back where it was */
function b5t4Ids(el) { const m = {}; for (const e of $$("[data-id]", el)) m[e.dataset.id] = e; return m; }
function b5t4Btn(label, { kind = "safe", row = null, id = null, greyed = false, on = null } = {}) {
  const b = h("button", { class: `b5t4-btn ${kind}${greyed ? " greyed" : ""}`, type: "button", "data-stop": "", "data-row": row, "data-id": id }, label);
  if (on) b.addEventListener("click", () => { if (!b.classList.contains("greyed")) on(); });
  return b;
}
/* Steam's switch rows and the small ones, as stops */
function b5t4SwitchRow(id, label, help, on, fn) {
  const b = h("button", { class: "b5t4-sw" + (on ? " on" : ""), type: "button", "data-stop": "", "data-id": id }, h("span", {}, label), h("span", { class: "t" }));
  b.addEventListener("click", fn);
  return { stop: b, el: h("div", {}, b, h("div", { class: "b5t4-help", style: "margin-top:3px" }, help)) };
}
/* The box that asks before a download (TwoButtonConfirmModal): title, words that scroll under pinned site lines, two buttons, the ring on Cancel */
function b5t4Confirm(ctx, { title, sites, paras = [], closing = null, actionLabel, onAction, onCancel }) {
  const pinned = h("div", { class: "b5t4-pinned", style: paras.length || closing ? "" : "padding-bottom:0" }, ...sites.map((n) => h("div", {}, b5t4Line(n))));
  const body = paras.map((p, i) => h("div", { class: "b5t4-p" + (p.hi ? " hi" : "") + (!closing && i === paras.length - 1 ? " last" : ""), html: p.html }));
  const words = h("div", { class: "b5t4-words" }, pinned, ...body, closing ? h("div", { class: "b5t4-p hi last" }, closing) : "");
  const more = h("div", { class: "b5t4-more", hidden: true });
  const read = () => { const max = words.scrollHeight - words.clientHeight; more.textContent = words.scrollTop < max - 1 ? "▾ More below (press Down)" : ""; };
  words.addEventListener("scroll", read);
  const act = b5t4Btn(actionLabel, { kind: "act", row: "cf", id: "act", on: onAction });
  const cancel = b5t4Btn("Cancel", { kind: "safe", row: "cf", id: "cancel", on: onCancel });
  const box = h("div", { class: "b5t4-box" }, h("div", { class: "b5t4-title", style: "margin-bottom:10px" }, title), words, more, h("div", { class: "b5t4-foot", style: "margin-top:0" }, act, cancel));
  box.addEventListener("deckkey", (e) => {
    const k = e.detail.key;
    if (k === "B") { e.preventDefault(); onCancel(); }
    else if (k === "Up" || k === "Down") {
      e.preventDefault(); // the ring stays on its button; the words move one step (64 points)
      words.scrollTop = Math.max(0, Math.min(words.scrollHeight - words.clientHeight, words.scrollTop + (k === "Down" ? 64 : -64)));
      read();
    }
  });
  const screen = b5t4Stage({ box });
  screen.afterShow = () => {
    words.classList.remove("scrolls");
    if (words.scrollHeight > words.clientHeight + 1) { words.classList.add("scrolls"); more.hidden = false; read(); } else more.hidden = true;
  };
  return { screen, cancel, act };
}
/* the PC address block, shared by the popup's off state, the PC screen and the wild option's message */
function b5t4PcParts(ctx, redraw) {
  const pc = ctx.pc;
  const field = h("button", { class: "b5t4-field" + (pc.ip ? "" : " empty"), type: "button", "data-stop": "", "data-id": "addr", "data-row": "addr" }, pc.ip || "For example 192.168.1.20");
  field.addEventListener("click", () => { pc.ip = pc.ip || "192.168.1.20"; pc.tested = null; ctx.recalc(); redraw("addr"); });
  const find = h("button", { class: "b5t4-glass", type: "button", "data-stop": "", "data-id": "find", "data-row": "addr" }, "Find LAN");
  find.addEventListener("click", () => { pc.ip = "192.168.1.20"; pc.tested = null; ctx.recalc(); redraw("find"); });
  const els = [
    h("div", { class: "b5t4-addr" }, h("div", {}, h("div", { class: "b5t4-label" }, "PC address"), field), find),
    h("div", { class: "b5t4-help" }, B5T4_W.pcHelp),
    h("div", { class: "b5t4-help", html: `This Deck's IP: <b>192.168.1.40</b>. ${B5T4_W.pcNeeds}` }),
  ];
  if (pc.tested === "busy") els.push(h("div", { class: "b5t4-help" }, "Testing…"));
  else if (pc.tested) els.push(h("div", { class: "b5t4-conn" }, "Connected · Ollama v0.40.6 · 3 models"));
  return els;
}
function b5t4TestPc(ctx, redraw) {
  if (!ctx.pc.ip.trim() || ctx.pc.tested === "busy") return;
  ctx.pc.tested = "busy"; redraw("act");
  ctx.after(700, () => { ctx.pc.tested = { ok: true }; ctx.recalc(); redraw("act"); });
}
/* The Main tab inside Quick Access: the empty chat as a new install shows it, the question box last */
function b5t4MainStage(ctx, cards = []) {
  const dk = dock2({ chips: ["How to use bonsAI"], placeholder: "Ask a quick question about your game.", mode: "Speed", game: "No game" });
  dk.field.dataset.id = "field";
  dk.field.addEventListener("click", () => ctx.toast(ctx.aiReady ? "The question box. Your first question goes here." : "No AI is ready yet, so a question would not be answered."));
  const sc = cards.length ? cards : [h("div", { class: "b5t4-empty" }, h("span", { class: "b5t4-tree", html: ICONS2.tree }), B5T4_TREE)];
  const body = mainTab2({ transcript: sc, chatName: "New chat", dockEl: dk });
  $(".k2-sub", body.nameRow).replaceChildren(h("span", { class: "k2-key" }, "LT"), "not saved yet", h("span", { class: "k2-key" }, "RT"));
  const panel = h("div", { class: "qam", style: `height:${PANEL.h}px` }, body);
  const screen = b5t4Stage({ qam: panel });
  return { screen, field: dk.field, byId: b5t4Ids(screen) };
}
/* The running card on the chat (options A, B and the wild one): one changing line, a bar, Stop */
function b5t4Card(ctx, { steps = false } = {}) {
  const byId = {};
  const title = h("div", { class: "b5t4-ctitle" }), line = h("div", { class: "b5t4-cline" });
  const fill = h("i"), track = h("div", { class: "b5t4-track" }, fill), note = h("div", { class: "b5t4-cnote" });
  const mk = (cls, id, label, fn) => { const b = h("button", { class: "b5t4-cbtn " + cls, type: "button", "data-stop": "", "data-id": id }, label); b.addEventListener("click", fn); byId[id] = b; return b; };
  const stop = mk("stop", "stop", "Stop", () => ctx.run && ctx.run.stop());
  const again = mk("go", "again", "Start again", () => { ctx.startRun(b5t4Plan({ voice: true })); ctx.tick && ctx.tick(ctx.run); card.paint(); Deck.setRing(ctx.root, byId.stop, { scroll: false }); });
  const show = mk("", "steps", "Show steps", () => ctx.showSetup());
  const btns = h("div", { class: "b5t4-cbtns" }, stop, again, ...(steps ? [show] : []));
  const card = h("div", { class: "b5t4-card" }, title, line, track, note, btns);
  card.byId = byId;
  card.paint = () => {
    const run = ctx.run;
    if (!run || !card.isConnected) return;
    const cur = Deck.current(ctx.root);
    if (run.phase === "running") {
      title.textContent = "Setting up the AI on this Deck";
      line.className = "b5t4-cline"; line.textContent = run.line();
      fill.style.width = run.overall() + "%"; track.hidden = false;
      note.textContent = "Stop works at any moment. Downloads come from ollama.com, registry.ollama.ai, huggingface.co and ghcr.io.";
    } else if (run.phase === "done") {
      title.textContent = "The AI is ready on this Deck";
      line.className = "b5t4-cline ok"; line.textContent = ctx.resultLine();
      fill.style.width = "100%"; track.hidden = false; note.textContent = "";
    } else {
      title.textContent = "Stopped";
      line.className = "b5t4-cline warn"; line.textContent = b5t4KeptLine(run);
      track.hidden = true; note.textContent = "Nothing half-installed is used. Start again carries on: what finished is not downloaded twice.";
    }
    stop.hidden = run.phase !== "running"; again.hidden = run.phase !== "stopped"; show.hidden = run.phase === "done";
    btns.hidden = run.phase === "done";
    if (cur && card.contains(cur) && (cur.hidden || btns.hidden)) {
      const next = [stop, again, show].find((b) => !b.hidden && !btns.hidden) || $('[data-id="field"]', ctx.root);
      if (next) Deck.setRing(ctx.root, next, { scroll: false });
    }
  };
  card.paint();
  return card;
}

/* ---------- the counter, the context of one panel, the shortest-way player ---------- */
const b5t4Results = {};
let b5t4Uid = 0;
function b5t4Ctx(key, name, variant) {
  const ctx = {
    key, name, variant, uid: ++b5t4Uid,
    root: h("div", { class: "deck b5t4-deck", tabindex: "0", role: "application", "aria-label": "Interactive mock-up of the whole Deck screen. Use the arrow keys as the D-pad, Enter as A, Escape as B." }),
    gen: 0, press: { A: 0, B: 0, D: 0 }, finished: false, kbd: false, auto: false, seen: false, queue: [],
    flags: { ringMain: false, mic: false }, holdCheck: false,
  };
  ctx.total = () => ctx.press.A + ctx.press.B + ctx.press.D;
  ctx.after = (ms, fn) => { const g = ctx.gen; return setTimeout(() => { if (g === ctx.gen) fn(); }, ms); };
  ctx.whenSeen = (fn) => (ctx.seen ? fn() : ctx.queue.push([ctx.gen, fn]));
  if (typeof IntersectionObserver !== "undefined") {
    new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { ctx.seen = true; const q = ctx.queue.splice(0); for (const [g, fn] of q) if (g === ctx.gen) fn(); } }).observe(ctx.root);
  } else ctx.seen = true;
  ctx.show = (el, ring, tick = null) => {
    ctx.tick = tick;
    ctx.root.replaceChildren(el);
    if (ring) Deck.setRing(ctx.root, ring, { scroll: false });
    if (el.afterShow) el.afterShow();
  };
  const screenEl = () => ctx.root.firstElementChild;
  ctx.note = (text) => {
    const s = screenEl(); if (!s) return;
    const n = h("div", { class: "b5t4-note" }, "Board note: " + text);
    s.append(n); setTimeout(() => n.remove(), 7000);
  };
  ctx.toast = (text) => { const s = screenEl(); if (!s) return; const t = h("div", { class: "b5t4-toast" }, text); s.append(t); setTimeout(() => t.remove(), 2600); };
  ctx.resultLine = () => {
    const done = ctx.engineOnly ? "Ollama 0.40.6 is ready." : B5T4_RESULT + " " + (ctx.flags.mic ? "Voice input is on." : B5T4_MIC_OFF);
    return done + (ctx.voice && !ctx.engineOnly ? " The voice engine is built." : "");
  };
  ctx.recalc = () => {
    const deckReady = !!ctx.run && ctx.run.phase === "done" && !ctx.engineOnly;
    const pcReady = !!ctx.pc && ctx.pc.tested && ctx.pc.tested !== "busy";
    ctx.aiReady = ctx.st && ctx.st.onDeck === false ? !!pcReady : deckReady || !!pcReady;
  };
  ctx.startRun = (plan) => {
    if (ctx.run) ctx.run.kill();
    ctx.run = b5t4MakeRun(plan, (r) => {
      ctx.tick && ctx.tick(r);
      if (r.phase === "done") { ctx.recalc(); ctx.onRunDone && ctx.onRunDone(); ctx.checkFinish(); }
    });
    return ctx.run;
  };
  ctx.checkFinish = () => {
    if (ctx.finished || ctx.where !== "main") return;
    if (ctx.engineOnly && ctx.run && ctx.run.phase === "done") ctx.finish("Stopped at the trap: Ollama is installed but no AI model came with it, so the first question has nothing to answer it.", true);
    else if (ctx.aiReady) ctx.finish("The Main tab is in front of you and the AI is ready.");
  };
  ctx.finish = (msg, bad = false) => {
    if (ctx.finished) return;
    ctx.finished = true; ctx.doneMsg = msg; ctx.doneBad = bad;
    b5t4Results[key] = { n: ctx.total(), a: ctx.press.A, b: ctx.press.B, d: ctx.press.D, auto: ctx.auto, bad };
    ctx.refresh(); document.dispatchEvent(new Event("b5t4results"));
  };
  ctx.showMain = (cards = []) => {
    ctx.where = "main";
    const m = b5t4MainStage(ctx, cards);
    ctx.show(m.screen, m.byId[ctx.mainRing] || m.field, (r) => cards.forEach((c) => c.paint && c.paint()));
    ctx.mainRing = null;
    ctx.checkFinish();
  };
  ctx.onRunDone = () => { if (ctx.where === "main" && variant === "T") ctx.toast("Local Ollama setup complete — Running connection test."); };
  ctx.initState = () => {
    if (ctx.run) ctx.run.kill();
    ctx.run = null; ctx.aiReady = false; ctx.engineOnly = false; ctx.downloadsOn = false; ctx.voice = false; ctx.where = "start";
    ctx.st = { checking: true, onDeck: true, autostart: false, refusal: false, holdPending: false };
    ctx.pc = { ip: "", tested: null };
    ctx.flags.mic = false;
  };
  ctx.refresh = () => {
    if (!ctx.bar) return;
    ctx.bar.num.textContent = String(ctx.total());
    ctx.bar.brk.textContent = `A ${ctx.press.A} · B ${ctx.press.B} · D-pad ${ctx.press.D}`;
    ctx.bar.state.className = "b5t4-state" + (ctx.doneBad ? " bad" : "");
    ctx.bar.state.textContent = ctx.finished ? `Counter stopped${ctx.auto ? " (shortest way)" : ""}. ${ctx.doneMsg}` : "Counting. It stops when the Main tab shows with the AI ready.";
  };
  ctx.reset = () => {
    ctx.gen++; ctx.queue.length = 0; ctx.auto = false;
    ctx.press = { A: 0, B: 0, D: 0 }; ctx.finished = false; ctx.doneMsg = ""; ctx.doneBad = false; ctx.mainRing = null;
    ctx.initState(); ctx.refresh(); ctx.begin();
  };
  /* the presses: A, B and the D-pad, from keys (counted before any box reacts) or a click (one A) */
  ctx.root.addEventListener("deckkey", (e) => {
    if (ctx.finished) return;
    const k = e.detail.key;
    if (k === "A") { ctx.press.A++; ctx.kbd = true; setTimeout(() => { ctx.kbd = false; }, 0); }
    else if (k === "B") ctx.press.B++;
    else if (k === "Up" || k === "Down" || k === "Left" || k === "Right") ctx.press.D++;
    else return;
    ctx.refresh();
  }, true);
  ctx.root.addEventListener("click", (e) => {
    if (ctx.finished || ctx.kbd) return;
    if (e.target.closest && e.target.closest("[data-stop]")) { ctx.press.A++; ctx.refresh(); }
  }, true);
  /* the shortest way plays itself, one press at a time, so it can be watched; its count comes from the same counter */
  ctx.play = async (steps) => {
    ctx.reset(); ctx.auto = true;
    const g = ctx.gen;
    ctx.root.classList.add("is-active");
    await sleep(500);
    for (const s of steps) {
      if (g !== ctx.gen) return;
      if (typeof s === "string") { Deck.press(ctx.root, s); await sleep(520); }
      else { let n = 0; while (!s.wait() && g === ctx.gen && n++ < 400) await sleep(100); await sleep(350); }
    }
  };
  ctx.bar = null;
  return ctx;
}
function b5t4Bar(ctx, steps, extras = []) {
  const num = h("b", { class: "b5t4-num" }, "0"), brk = h("span", { class: "b5t4-brk" }), state = h("span", { class: "b5t4-state" });
  ctx.bar = { num, brk, state };
  const over = h("button", { class: "b5t4-ob", type: "button", onclick: () => { ctx.reset(); ctx.root.focus({ preventScroll: true }); } }, "Start over");
  const play = h("button", { class: "b5t4-ob", type: "button", onclick: () => ctx.play(steps()) }, "Play the shortest way");
  const bar = h("div", { class: "b5t4-bar" },
    h("div", { class: "b5t4-count" }, h("span", { class: "b5t4-lab" }, "Presses so far"), num, brk, state),
    h("div", { class: "b5t4-btns" }, ...extras, over, play));
  ctx.refresh();
  return bar;
}
function b5t4Toggle(label, on, fn) {
  const b = h("button", { class: "b5t4-ob", type: "button", "aria-pressed": String(on) }, label);
  b.addEventListener("click", () => { const next = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", String(next)); fn(next); });
  return b;
}
function b5t4Cancels(rows) {
  return h("div", { class: "b5t4-cancels" }, h("h5", {}, "If you press Cancel or B"), h("ul", {}, ...rows.map(([step, text]) => h("li", { html: `<b>${step}:</b> ${text}` }))));
}
const b5t4Wait = (ctx, fn) => ({ wait: fn });

/* ---------- Today, and option C: the popup "Where should the AI run?" and the box that follows ---------- */
function b5t4WhereEl(ctx) {
  const st = ctx.st, v = ctx.variant, run = ctx.run, byId = {};
  const busy = !!run && run.phase === "running";
  const deckReady = !!run && run.phase === "done";
  const ran = !!run || st.refusal;
  const word = busy ? run.line() : deckReady ? "Installed" + (ctx.engineOnly ? "" : " (2 models)") : st.checking ? "Checking…" : "Not installed";
  const redraw = (id) => ctx.drawWhere(id);
  const kids = [h("div", { class: "b5t4-title" }, B5T4_W.title), h("div", {}, B5T4_W.lead)];
  if (v === "C") kids.push(h("div", { class: "b5t4-help", html: `<b>Beta.</b> The AI can be wrong and heavy AI can crash a game. Use at your own risk.` }));
  const run1 = b5t4SwitchRow("run", B5T4_W.runOnDeck, B5T4_W.runOnDeckHelp, st.onDeck, () => { st.onDeck = !st.onDeck; ctx.recalc(); redraw("run"); });
  byId.run = run1.stop; kids.push(run1.el);
  let wstat = null, stageEl = null;
  if (st.onDeck) {
    const auto = b5t4SwitchRow("start", B5T4_W.autostart, B5T4_W.autostartHelp, st.autostart, () => { st.autostart = !st.autostart; redraw("start"); });
    byId.start = auto.stop; kids.push(auto.el);
    wstat = h("div", { class: "b5t4-wstat" }, "Local Ollama setup: ", h("span", {}, word));
    kids.push(wstat);
    if (busy) {
      stageEl = h("div", { class: "b5t4-stage" }, run.line());
      kids.push(stageEl, h("div", { class: "b5t4-fine" }, "Setup is running. The line above changes as it goes; a first-time install can take a few minutes."));
    } else if (deckReady) kids.push(h("div", { class: "b5t4-ok" }, ctx.resultLine()));
    else if (st.refusal) kids.push(h("div", { class: "b5t4-bad" }, "Failed (check the Internet downloads permission?)"));
    kids.push(h("div", { class: "b5t4-help" }, B5T4_W.installNote));
  } else {
    kids.push(...b5t4PcParts(ctx, redraw));
  }
  const label = st.onDeck ? (busy ? (deckReady ? "Updating…" : "Installing…") : deckReady ? "Update AI & models" : "Install Ollama") : ctx.pc.tested === "busy" ? "Testing…" : "Test connection";
  const greyed = st.onDeck ? busy || (v === "C" && st.checking) : ctx.pc.tested === "busy" || !ctx.pc.ip.trim();
  const press = () => {
    if (!st.onDeck) return b5t4TestPc(ctx, redraw);
    if (busy) return;
    if (deckReady) return ctx.note("Update AI & models is not drawn here; it opens the same kind of box.");
    if (v === "T" && st.checking) return ctx.engineBox();   // the trap: pressed before "Checking…" ended
    ctx.starterBox();
  };
  const act = b5t4Btn(label, { kind: "act", row: "foot", id: "act", greyed, on: press });
  const no = b5t4Btn(ran ? "Close" : "Not now", { kind: "safe", row: "foot", id: "no", on: () => ctx.showMain() });
  byId.act = act; byId.no = no;
  kids.push(h("div", { class: "b5t4-foot" }, act, no));
  const box = h("div", { class: "b5t4-box pop" }, ...kids);
  box.addEventListener("deckkey", (e) => {
    const k = e.detail.key, cur = e.detail.stop;
    if (k === "B") { e.preventDefault(); ctx.showMain(); }
    else if (k === "Down" && cur && !cur.closest(".b5t4-foot")) {
      const rows = Deck.rows(ctx.root), ri = rows.findIndex((r) => r.items.includes(cur)), nr = rows[ri + 1];
      if (nr && nr.items.includes(no)) { e.preventDefault(); Deck.setRing(ctx.root, no, { scroll: false }); }   // the foot is entered on Not now
    }
  });
  const screen = b5t4Stage({ box });
  Object.assign(byId, b5t4Ids(box));
  return { screen, byId, update: (r) => { if (wstat && r.phase === "running") { $("span", wstat).textContent = r.line(); if (stageEl) stageEl.textContent = r.line(); } } };
}
function b5t4InstallWhere(ctx) {
  ctx.drawWhere = (ringId) => {
    const cur = Deck.current(ctx.root);
    const id = ringId || (cur && cur.dataset.id) || "no";
    const w = b5t4WhereEl(ctx);
    ctx.where = "where";
    const phase = ctx.run ? ctx.run.phase : null;
    ctx.show(w.screen, w.byId[id] || w.byId.no, (r) => { if (r.phase !== phase) ctx.drawWhere(); else w.update(r); });
  };
  ctx.releaseCheck = () => { ctx.st.checking = false; ctx.st.holdPending = false; if (ctx.where === "where" && !ctx.run) ctx.drawWhere(); };
  ctx.startCheck = () => {
    ctx.st.checking = true;
    ctx.after(ctx.variant === "C" ? 2400 : 1800, () => { if (ctx.holdCheck) ctx.st.holdPending = true; else ctx.releaseCheck(); });
  };
  /* the box that asks about the starter set (Install Ollama pressed after the check ended) */
  ctx.starterBox = () => {
    const asking = !ctx.downloadsOn;
    const withVoice = ctx.variant === "C";
    const { screen, cancel } = b5t4Confirm(ctx, {
      title: asking ? "Turn on internet downloads?" : "Also install the starter models?",
      sites: [B5T4_N.ollama, B5T4_N.models, B5T4_N.speech, ...(withVoice ? [B5T4_N.voice] : [])],
      paras: withVoice ? [...B5T4_PARAS.slice(0, 3), B5T4_VOICE_PARA, ...B5T4_PARAS.slice(3)] : B5T4_PARAS,
      closing: asking ? B5T4_CLOSING : null,
      actionLabel: asking ? "Turn on and download" : "Install Ollama and the starter models",
      onAction: () => { ctx.downloadsOn = true; ctx.voice = withVoice; ctx.st.refusal = false; ctx.startRun(b5t4Plan({ voice: withVoice })); ctx.drawWhere("act"); },
      onCancel: () => ctx.drawWhere("act"),
    });
    ctx.where = "box";
    ctx.show(screen, cancel);
  };
  /* the other box: Install pressed while the popup still said Checking... It installs the engine and no model. */
  ctx.engineBox = () => {
    ctx.st.refusal = true;
    const { screen, cancel } = b5t4Confirm(ctx, {
      title: "Turn on internet downloads?",
      sites: [B5T4_N.updOllama, B5T4_N.updModels],
      closing: B5T4_CLOSING,
      actionLabel: "Turn on and download",
      onAction: () => { ctx.downloadsOn = true; ctx.engineOnly = true; ctx.st.refusal = false; ctx.startRun(b5t4Plan({ engineOnly: true })); ctx.drawWhere("act"); },
      onCancel: () => ctx.drawWhere("act"),
    });
    ctx.where = "box";
    ctx.show(screen, cancel);
  };
}

/* ---------- options A and B: the one first screen ---------- */
function b5t4WelcomeEl(ctx) {
  const byId = {};
  const deck = h("button", { class: "b5t4-tile main", type: "button", "data-stop": "", "data-id": "deck", "data-row": "tiles" },
    h("h5", {}, "Run the AI on this Deck"),
    h("p", {}, "One press sets up Ollama, the starter models and the speech models: about 4.5 GiB in all, from the sites below. It turns on Internet downloads, only for downloads you start."),
    h("p", {}, "Your game and the AI share the Deck's chip, so both slow down."));
  const pc = h("button", { class: "b5t4-tile", type: "button", "data-stop": "", "data-id": "pc", "data-row": "tiles" },
    h("h5", {}, "Use the AI on my PC"),
    h("p", {}, "A PC on your home network runs the AI. Nothing is downloaded. You type its address next."));
  deck.addEventListener("click", () => ctx.startDeck());
  pc.addEventListener("click", () => ctx.showPc());
  const mic = h("button", { class: "b5t4-minisw" + (ctx.flags.mic ? " on" : ""), type: "button", "data-stop": "", "data-id": "mic", "data-row": "foot" }, h("span", {}, "Also turn on the microphone (Voice input)"), h("span", { class: "t" }));
  mic.addEventListener("click", () => { ctx.flags.mic = !ctx.flags.mic; mic.classList.toggle("on", ctx.flags.mic); });
  const no = b5t4Btn("Not now", { kind: "safe", row: "foot", id: "no", on: () => ctx.leave() });
  byId.deck = deck; byId.pc = pc; byId.mic = mic; byId.no = no;
  const sites = h("div", { class: "b5t4-sites" }, h("h6", {}, "Where the downloads come from"), ...[B5T4_N.ollama, B5T4_N.models, B5T4_N.speech, B5T4_N.voice].map((n) => h("div", { class: "l" }, b5t4Line(n))));
  const box = h("div", { class: "b5t4-box pop", style: "gap:6px;padding-top:26px" },
    h("div", { class: "b5t4-title" }, "Welcome to bonsAI. Where should the AI run?"),
    h("div", { class: "b5t4-tiles" }, deck, pc),
    sites,
    h("div", { class: "b5t4-beta", html: `<b>Beta.</b> The AI can be wrong, so check anything important. Heavy AI on the Deck can crash a game. Use at your own risk. Bug link: About tab. Not now changes nothing; the Ollama tab sets up the AI later.` }),
    h("div", { class: "b5t4-footrow" }, mic, no));
  box.addEventListener("deckkey", (e) => {
    const k = e.detail.key, cur = e.detail.stop;
    if (k === "B") { e.preventDefault(); ctx.leave(); }
    else if (k === "Up" && cur && cur.closest(".b5t4-footrow")) { e.preventDefault(); Deck.setRing(ctx.root, deck, { scroll: false }); }   // Up from the foot lands on the main choice
  });
  return { screen: b5t4Stage({ box }), byId };
}
function b5t4PcEl(ctx) {
  const byId = {};
  const redraw = (id) => ctx.showPc(id);
  const ready = ctx.pc.tested && ctx.pc.tested !== "busy";
  const act = b5t4Btn(ready ? "Ask your first question" : ctx.pc.tested === "busy" ? "Testing…" : "Test connection", { kind: "act", row: "foot", id: "act", greyed: !ready && (ctx.pc.tested === "busy" || !ctx.pc.ip.trim()), on: () => (ready ? ctx.showMain() : b5t4TestPc(ctx, redraw)) });
  const back = b5t4Btn("Back", { kind: "safe", row: "foot", id: "back", on: () => ctx.begin() });
  byId.act = act; byId.back = back;
  const box = h("div", { class: "b5t4-box pop" }, h("div", { class: "b5t4-title" }, "Use the AI on my PC"),
    h("div", { class: "b5t4-help" }, "Nothing is downloaded on this path. Back changes nothing."), ...b5t4PcParts(ctx, redraw), h("div", { class: "b5t4-foot" }, act, back));
  box.addEventListener("deckkey", (e) => { if (e.detail.key === "B") { e.preventDefault(); ctx.begin(); } });
  const screen = b5t4Stage({ box });
  screen.byId = Object.assign(byId, b5t4Ids(box));
  return screen;
}
function b5t4SetupEl(ctx) {
  const run = ctx.run, byId = {};
  const ROWS = [
    { g: "ollama", name: "Ollama", site: "ollama.com" },
    { g: "gemma", name: "The answer model gemma4:e2b-it-qat", site: "registry.ollama.ai · about 4.6 GB for both models" },
    { g: "nomic", name: "The note-search model nomic-embed-text", site: "registry.ollama.ai" },
    { g: "speech", name: "The speech models tiny.en and base.en", site: "huggingface.co · about 230 MB" },
    { g: "voice", name: "The voice engine", site: "ghcr.io" },
  ];
  const rows = ROWS.map((r) => {
    const dot = h("span", { class: "b5t4-dot" }), det = h("div", { class: "b5t4-sd" }), bar = h("i"), barw = h("span", { class: "b5t4-sbar" }, bar);
    const el = h("div", { class: "b5t4-step wait" }, dot, h("div", { class: "b5t4-sn" }, r.name, h("small", {}, "from " + r.site)), h("div", {}, det, barw));
    return { r, el, det, bar, barw };
  });
  const paint = (run) => {
    for (const x of rows) {
      const g = b5t4Group(run, x.r.g);
      x.el.className = "b5t4-step " + (g.state === "notstarted" ? "wait" : g.state);
      x.barw.hidden = g.state !== "run";
      if (g.state === "run") { x.det.textContent = run.detail(); x.bar.style.width = g.pct + "%"; }
      else x.det.textContent = { done: x.r.g === "ollama" ? "Installed" : x.r.g === "voice" ? "Built" : "Done", wait: "Waiting", stopped: "Stopped here. Not installed.", notstarted: "Not started" }[g.state];
    }
  };
  paint(run);
  const running = run.phase === "running", done = run.phase === "done";
  const sub = running ? h("div", { class: "b5t4-help" }, "You can hide this screen. The downloads keep going, and Stop works at any moment.")
    : done ? h("div", { class: "b5t4-ok" }, "Everything is installed, the voice engine included. " + (ctx.flags.mic ? "Voice input is on." : "Voice input is off: turn it on in the Permissions tab."))
      : h("div", { class: "b5t4-help", style: "color:#fbbf24" }, b5t4KeptLine(run) + " Nothing half-installed is used.");
  let foot;
  if (running) {
    const hide = b5t4Btn("Hide (keeps downloading)", { kind: "act", row: "foot", id: "hide", on: () => ctx.showMain([ctx.card()]) });
    const stop = b5t4Btn("Stop", { kind: "safe", row: "foot", id: "stop", on: () => run.stop() });
    byId.hide = hide; byId.stop = stop; foot = h("div", { class: "b5t4-foot" }, hide, stop);
  } else if (done) {
    const go = b5t4Btn("Ask your first question", { kind: "act", row: "foot", id: "go", on: () => ctx.showMain() });
    byId.go = go; foot = h("div", { class: "b5t4-foot" }, go);
  } else {
    const again = b5t4Btn("Start again", { kind: "act", row: "foot", id: "again", on: () => { ctx.startRun(b5t4Plan({ voice: true })); ctx.showSetup("hide"); } });
    const close = b5t4Btn("Close", { kind: "safe", row: "foot", id: "close", on: () => ctx.showMain([ctx.card()]) });
    byId.again = again; byId.close = close; foot = h("div", { class: "b5t4-foot" }, again, close);
  }
  const box = h("div", { class: "b5t4-box pop", style: "gap:6px" }, h("div", { class: "b5t4-title" }, "Setting up the AI on this Deck"), sub, h("div", { class: "b5t4-steps" }, ...rows.map((x) => x.el)), foot);
  box.addEventListener("deckkey", (e) => {
    if (e.detail.key !== "B") return;
    e.preventDefault();
    if (running) ctx.showMain([ctx.card()]); else if (done) ctx.showMain(); else ctx.showMain([ctx.card()]);
  });
  const screen = b5t4Stage({ box });
  screen.byId = byId; screen.paint = paint;
  return screen;
}
/* A and B share the first screen and the press that starts everything; they differ in where the wait is shown */
function b5t4InstallWelcome(ctx, variant) {
  ctx.begin = () => {
    ctx.where = "welcome";
    const w = b5t4WelcomeEl(ctx);
    ctx.show(w.screen, ctx.flags.ringMain ? w.byId.deck : w.byId.no);
  };
  ctx.leave = () => { ctx.showMain(); ctx.note("Not now: nothing was downloaded and nothing was turned on. The AI is not set up, so the counter keeps going."); };
  ctx.showPc = (ringId) => {
    ctx.where = "pc";
    const s = b5t4PcEl(ctx);
    ctx.show(s, s.byId[ringId] || s.byId.back, () => {});
  };
  ctx.card = () => b5t4Card(ctx, { steps: variant === "B" });
  ctx.startDeck = () => {
    ctx.downloadsOn = true; ctx.voice = true;
    ctx.startRun(b5t4Plan({ voice: true }));
    if (variant === "A") ctx.showMain([ctx.card()]); else ctx.showSetup("hide");
  };
  ctx.showSetup = (ringId) => {
    if (!ctx.run) return;
    ctx.where = "setup";
    const s = b5t4SetupEl(ctx);
    const phase = ctx.run.phase;
    ctx.show(s, s.byId[ringId] || s.byId.hide || s.byId.go || s.byId.close, (r) => {
      if (r.phase !== phase) ctx.showSetup(r.phase === "done" ? "go" : "close"); else s.paint(r);
    });
  };
}

/* ---------- the options, each a whole flow ---------- */
function b5t4Today() {
  const ctx = b5t4Ctx("T", "Today", "T");
  b5t4InstallWhere(ctx);
  ctx.begin = () => {
    ctx.where = "beta";
    const ok = h("button", { class: "b5t4-blue", type: "button", "data-stop": "", "data-id": "ok" }, "Got it");
    ok.addEventListener("click", () => { ctx.st.checking = true; ctx.startCheck(); ctx.drawWhere("no"); });
    const box = h("div", { class: "b5t4-box sbox" }, h("div", { class: "b5t4-title" }, "bonsAI - Beta Notice"), h("div", { class: "b5t4-steamtext" }, B5T4_BETA_NOTICE), ok);
    ctx.show(b5t4Stage({ box }), ok);
  };
  const trap = b5t4Toggle("Trap: the check never ends", false, (on) => {
    ctx.holdCheck = on;
    if (on && ctx.where === "where" && !ctx.run) { ctx.st.checking = true; ctx.st.holdPending = true; ctx.drawWhere(); }
    else if (!on && ctx.st.holdPending) ctx.releaseCheck();
  });
  const steps = () => [
    "A",
    b5t4Wait(ctx, () => ctx.where === "where" && !ctx.st.checking),
    "Left", "A",
    "Left", "A",
    b5t4Wait(ctx, () => ctx.run && ctx.run.phase === "done"),
    "B",
  ];
  const bar = b5t4Bar(ctx, steps, [trap]);
  ctx.reset();
  return [bar, ctx.root, b5t4Cancels([
    ["The Beta Notice", "only one button, Got it. Steam draws this box; what B does there was not checked."],
    ["Where should the AI run?", "Not now or B closes it and changes nothing. It is marked as seen and never comes back, so the AI stays unset until the person finds the Ollama tab."],
    ["The starter box (Internet downloads off)", "Cancel or B installs nothing and leaves Internet downloads off. The box's own words say so (the last of the middle paragraphs)."],
    ["The other box (Install pressed while it said Checking…)", "Cancel or B installs nothing. The popup is left showing a red line, Failed (check the Internet downloads permission?), and its Not now button reads Close."],
    ["While it downloads", "The popup has no Stop. Close or B leaves the downloads running. Stop is the red Cancel button on the Ollama tab, and it ends with the line Cancelled."],
  ])];
}
function b5t4OptC() {
  const ctx = b5t4Ctx("C", "C", "C");
  b5t4InstallWhere(ctx);
  ctx.begin = () => {
    ctx.where = "where";
    ctx.st.checking = true;
    ctx.drawWhere("no");
    ctx.whenSeen(() => { if (ctx.where === "where") ctx.startCheck(); });
  };
  const steps = () => [
    b5t4Wait(ctx, () => ctx.where === "where" && !ctx.st.checking),
    "Left", "A",
    "Left", "A",
    b5t4Wait(ctx, () => ctx.run && ctx.run.phase === "done"),
    "B",
  ];
  const bar = b5t4Bar(ctx, steps);
  ctx.reset();
  return [bar, ctx.root, b5t4Cancels([
    ["Where should the AI run?", "Not now or B closes it and changes nothing; the beta line was on it, so there is no other box to dismiss. Marked as seen, so it does not come back. The AI stays unset until the person finds the Ollama tab."],
    ["Install while it says Checking…", "the button is greyed and does nothing, as every greyed button does today. The check ends in about two seconds, then Install works."],
    ["The starter box (Internet downloads off)", "Cancel or B installs nothing and leaves Internet downloads off, in the box's own words, as today."],
    ["While it downloads", "As today: no Stop in the popup; Close leaves the downloads running; Stop is on the Ollama tab. This option does not change that."],
  ])];
}
function b5t4OptA() {
  const ctx = b5t4Ctx("A", "A", "A");
  b5t4InstallWelcome(ctx, "A");
  const ring = b5t4Toggle("Ring starts on the big button", false, (on) => { ctx.flags.ringMain = on; if (ctx.where === "welcome" && ctx.press.A + ctx.press.B + ctx.press.D === 0) ctx.begin(); });
  const steps = () => [...(ctx.flags.ringMain ? [] : ["Up"]), "A", b5t4Wait(ctx, () => ctx.finished)];
  const bar = b5t4Bar(ctx, steps, [ring]);
  ctx.reset();
  return [bar, ctx.root, b5t4Cancels([
    ["The first screen", "Not now or B changes nothing: nothing is downloaded and Internet downloads stay off. The small print on the screen says so. The AI stays unset until the person finds the Ollama tab."],
    ["Use the AI on my PC", "Back or B returns to the first screen. Nothing is downloaded on that path."],
    ["While it downloads", "Stop on the card at any moment. The card then says what was kept and what was not installed. Start again carries on without downloading finished parts twice."],
  ])];
}
function b5t4OptB() {
  const ctx = b5t4Ctx("B", "B", "B");
  b5t4InstallWelcome(ctx, "B");
  const ring = b5t4Toggle("Ring starts on the big button", false, (on) => { ctx.flags.ringMain = on; if (ctx.where === "welcome" && ctx.press.A + ctx.press.B + ctx.press.D === 0) ctx.begin(); });
  const steps = () => [...(ctx.flags.ringMain ? [] : ["Up"]), "A", b5t4Wait(ctx, () => ctx.run && ctx.run.phase === "done"), "A"];
  const bar = b5t4Bar(ctx, steps, [ring]);
  ctx.reset();
  return [bar, ctx.root, b5t4Cancels([
    ["The first screen", "As in A: Not now or B changes nothing, and the small print says so."],
    ["The setup screen", "Stop works at any moment: that step shows Stopped here. Not installed, the steps before it stay Done, the steps after it say Not started, and a line names what was kept. Hide or B keeps the downloads going and shows the one-line card on the chat, which has Show steps."],
    ["After a Stop", "Start again carries on without downloading finished parts twice. Close shows the card with the same line."],
  ])];
}

/* the wild one: no boxes; the first message in the chat does the whole setup */
function b5t4OptW() {
  const ctx = b5t4Ctx("W", "Wild", "W");
  ctx.begin = () => ctx.drawWild("go");
  ctx.leave = () => { ctx.wild = "later"; ctx.drawWild("again"); };
  ctx.drawWild = (ringId) => {
    ctx.where = "main";
    const byId = {};
    const mk = (cls, id, label, fn) => { const b = h("button", { class: "b5t4-cbtn " + cls, type: "button", "data-stop": "", "data-id": id }, label); b.addEventListener("click", fn); byId[id] = b; return b; };
    let msg;
    const mode = ctx.wild || "ask";
    if (mode === "run") {
      msg = b5t4Card(ctx, { steps: false });
    } else if (mode === "later") {
      msg = h("button", { class: "b5t4-later", type: "button", "data-stop": "", "data-id": "again" }, "The AI is not set up yet. Press here to set it up.");
      msg.addEventListener("click", () => { ctx.wild = "ask"; ctx.drawWild("go"); });
      msg.byId = { again: msg };
    } else if (mode === "pc") {
      const redraw = (id) => ctx.drawWild(id);
      const ready = ctx.pc.tested && ctx.pc.tested !== "busy";
      const act = ready ? mk("go", "act", "Done", () => { ctx.showMain(); }) : mk("go", "act", ctx.pc.tested === "busy" ? "Testing…" : "Test connection", () => b5t4TestPc(ctx, redraw));
      const back = mk("", "back", "Back", () => { ctx.wild = "ask"; ctx.drawWild("pc"); });
      msg = h("div", { class: "b5t4-msg" }, h("h5", {}, "Use a PC on my home network"), h("p", {}, "Nothing is downloaded on this path."), ...b5t4PcParts(ctx, redraw), act, back);
      msg.byId = byId;
    } else {
      const go = mk("go", "go", "Set up the AI on this Deck", () => { ctx.downloadsOn = true; ctx.voice = true; ctx.startRun(b5t4Plan({ voice: true })); ctx.wild = "run"; ctx.drawWild("stop"); });
      const pc = mk("", "pc", "Use a PC on my home network", () => { ctx.wild = "pc"; ctx.drawWild("addr"); });
      const later = mk("", "again", "Ask me later (changes nothing)", () => ctx.leave());
      msg = h("div", { class: "b5t4-msg" },
        h("h5", {}, "Hi, I'm bonsAI."),
        h("p", {}, "I need an AI to run before I can answer. One press sets it all up: about 4.5 GiB, and it turns on Internet downloads for downloads you start."),
        h("p", { class: "sites", html: "<b>Downloads come from</b> ollama.com (Ollama), registry.ollama.ai (the models, about 4.6 GB), huggingface.co (the speech models, about 230 MB) and ghcr.io (the voice engine)." }),
        go, pc, later,
        h("p", { class: "betaprint", html: `<b>Beta.</b> The AI can be wrong, so check anything important. Heavy AI on the Deck can crash a game. Use at your own risk. Report bugs at ${B5T4_LINK}.` }));
      msg.byId = byId;
    }
    const m = b5t4MainStage(ctx, [msg]);
    ctx.show(m.screen, m.byId[ringId] || m.byId.go || m.field, () => msg.paint && msg.paint());
    ctx.checkFinish();
  };
  ctx.initStateOrig = ctx.initState;
  ctx.initState = () => { ctx.initStateOrig(); ctx.wild = "ask"; };
  ctx.onRunDone = () => {};
  const steps = () => ["A", b5t4Wait(ctx, () => ctx.finished)];
  const bar = b5t4Bar(ctx, steps);
  ctx.reset();
  return [bar, ctx.root, b5t4Cancels([
    ["Ask me later", "changes nothing; the message shrinks to one line at the top of the chat, and pressing it brings the message back."],
    ["Use a PC", "Back returns to the message; nothing is downloaded on that path."],
    ["While it downloads", "Stop on the message card at any moment; it says what was kept and what was not installed. There is no box, so B does nothing."],
  ])];
}

/* ---------- round 2 (2026-11-15): A with fewer words ----------
   The maintainer liked round 1's A and wrote "Too many words on this popup". Round 2 draws A's first screen three times
   with fewer words. Everything after the first screen is round 1's A: the press that starts everything, the changing
   line and Stop on the chat, the PC path, Not now. The sizes and site names are the same as round 1 used.
     2A  about half the words: one line on what happens, the total, the sites as short names on one line, two choices
     2B  the fewest words: a title, two choices with one line each, and Details (sites, beta notice, long explanation)
     2C  small pictures: three rows with an icon, a name and a size, the sites as tags, then the two choices
   The word counts and heights on the cards are measured from the drawn screens, not written by hand. */
const B5T4_R2_BETA = "Beta: the AI can be wrong, and heavy AI can crash a game. Use at your own risk.";
const B5T4_R2_SITES = ["ollama.com", "registry.ollama.ai", "huggingface.co", "ghcr.io"];
const B5T4_ICO = {
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="3"/></svg>',
  tick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M7.5 12.5l3.2 3.2 6-7"/></svg>',
  engine: STEAM_ICONS.gear,
  models: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="10" y="10" width="4" height="4"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></svg>',
  speech: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5M8.5 21.5h7"/></svg>',
};
function b5t4Tile(id, main, title, lines, fn) {
  const t = h("button", { class: "b5t4-tile" + (main ? " main" : ""), type: "button", "data-stop": "", "data-id": id, "data-row": "tiles" }, h("h5", {}, title), ...lines.map((l) => h("p", {}, l)));
  t.addEventListener("click", fn);
  return t;
}
/* the first screen of 2A, 2B or 2C */
function b5t4Wel2El(ctx, kind) {
  const byId = {};
  const LINES = {
    "2A": { deck: ["Sets up Ollama, the starter models, the speech models and the voice engine. About 4.5 GiB in all. Turns on Internet downloads, only for downloads you start.", "Your game and the AI share the Deck's chip, so both slow down."], pc: ["A PC on your home network runs it. Nothing is downloaded."] },
    "2B": { deck: ["About 4.5 GiB from 4 sites. Turns on Internet downloads."], pc: ["Nothing is downloaded."] },
    "2C": { deck: ["About 4.5 GiB in all. Turns on Internet downloads, only for downloads you start."], pc: ["Nothing is downloaded."] },
    "3C": { deck: ["Downloads the five things above, about 6.9 GB. Turns on Internet downloads, only for downloads you start."], pc: ["Nothing is downloaded."] },
  }[kind];
  const deck = b5t4Tile("deck", true, "Run the AI on this Deck", LINES.deck, () => ctx.startDeck());
  const pc = b5t4Tile("pc", false, "Use the AI on my PC", LINES.pc, () => ctx.showPc());
  const no = b5t4Btn("Not now", { kind: "safe", row: "foot", id: "no", on: () => ctx.leave() });
  byId.deck = deck; byId.pc = pc; byId.no = no;
  const kids = [h("div", { class: "b5t4-title" }, kind === "2B" ? "Where should the AI run?" : "Welcome to bonsAI. Where should the AI run?")];
  let foot;
  if (kind === "2A") {
    kids.push(h("div", { class: "b5t4-tiles" }, deck, pc),
      h("div", { class: "b5t4-sitesl" }, h("b", {}, "Downloads come from"), B5T4_R2_SITES.join(", ")),
      h("div", { class: "b5t4-beta" }, B5T4_R2_BETA));
    foot = h("div", { class: "b5t4-footrow r2" }, h("div", { class: "b5t4-help" }, "Not now changes nothing."), no);
  } else if (kind === "2B") {
    const det = b5t4Btn("Details", { kind: "safe", row: "foot", id: "details", on: () => ctx.showDetails() });
    byId.details = det;
    kids.push(h("div", { class: "b5t4-tiles" }, deck, pc));
    foot = h("div", { class: "b5t4-footrow r2b" }, det, no);
  } else {
    /* round 3: every download is its own row, with a size looked up on 2026-11-16 (see the board's README for where each number came from) */
    const ROWS3 = [
      { ico: "engine", name: "AI engine (Ollama)", size: "about 1.5 GB", tags: ["ollama.com"] },
      { ico: "models", name: "Answer model gemma4:e2b-it-qat", size: "about 4.3 GB", tags: ["registry.ollama.ai"] },
      { ico: "models", name: "Note-search model nomic-embed-text", size: "about 270 MB", tags: ["registry.ollama.ai"] },
      { ico: "speech", name: "Speech models tiny.en and base.en", size: "about 230 MB", tags: ["huggingface.co"] },
      { ico: "speech", name: "Voice engine (whisper.cpp)", size: "about 500 MB", tags: ["ghcr.io"] },
    ];
    const ROWS2 = [
      { ico: "engine", name: "AI engine (Ollama)", size: "size not known ahead of time", tags: ["ollama.com"] },
      { ico: "models", name: "Starter models", size: "about 4.6 GB", tags: ["registry.ollama.ai"] },
      { ico: "speech", name: "Speech models and voice engine", size: "about 230 MB, engine size not known ahead of time", tags: ["huggingface.co", "ghcr.io"] },
    ];
    const three = kind === "3C", ROWS = three ? ROWS3 : ROWS2;
    kids.push(h("div", { class: "b5t4-rows" + (three ? " r3" : "") }, h("div", { class: "b5t4-rowh" }, h("span", {}, "What the Deck choice downloads"), ...(three ? [h("span", { class: "b5t4-total" }, "about 6.9 GB in all")] : [])),
      ...ROWS.map((r) => h("div", { class: "b5t4-row" }, h("span", { class: "b5t4-ico" + (three && ctx.flags.ticks ? " tick" : ""), html: B5T4_ICO[three && ctx.flags.ticks ? "tick" : r.ico] }), h("div", { class: "b5t4-rn" }, r.name, h("small", {}, r.size)), h("div", { class: "b5t4-tags" }, ...r.tags.map((t) => h("span", { class: "b5t4-tag" }, t)))))),
      h("div", { class: "b5t4-tiles" }, deck, pc),
      h("div", { class: "b5t4-beta" }, B5T4_R2_BETA));
    foot = h("div", { class: "b5t4-footrow r2" }, h("div", { class: "b5t4-help" }, "Not now changes nothing."), no);
  }
  kids.push(foot);
  const box = h("div", { class: "b5t4-box pop", style: "gap:6px;padding-top:26px" }, ...kids);
  box.addEventListener("deckkey", (e) => {
    const k = e.detail.key, cur = e.detail.stop;
    if (k === "B") { e.preventDefault(); ctx.leave(); }
    else if (k === "Up" && cur && cur.closest(".b5t4-footrow")) { e.preventDefault(); Deck.setRing(ctx.root, deck, { scroll: false }); }   // Up from the foot lands on the main choice
  });
  return { screen: b5t4Stage({ box }), byId };
}
/* 2B's Details screen: the full site list, the beta notice, the longer explanation */
function b5t4Details2El(ctx) {
  const byId = {};
  const go = b5t4Btn("Run the AI on this Deck", { kind: "act", row: "foot", id: "go", on: () => ctx.startDeck() });
  const back = b5t4Btn("Back", { kind: "safe", row: "foot", id: "back", on: () => ctx.begin2("details") });
  byId.go = go; byId.back = back;
  const sites = h("div", { class: "b5t4-sites" }, h("h6", {}, "Where the downloads come from"), ...[B5T4_N.ollama, B5T4_N.models, B5T4_N.speech, B5T4_N.voice].map((n) => h("div", { class: "l" }, b5t4Line(n))));
  const box = h("div", { class: "b5t4-box pop", style: "gap:6px;padding-top:26px" },
    h("div", { class: "b5t4-title" }, "Details"),
    h("div", { class: "b5t4-help", html: "<b>Run the AI on this Deck</b> sets up Ollama, the starter models, the speech models and the voice engine: about 4.5 GiB in all. It turns on Internet downloads, only for downloads you start. Your game and the AI share the Deck's chip, so both slow down." }),
    sites,
    h("div", { class: "b5t4-beta", html: `<b>Beta.</b> The AI can be wrong, so check anything important. Heavy AI on the Deck can crash a game. Use at your own risk. Bug link: About tab.` }),
    h("div", { class: "b5t4-help", html: "<b>Use the AI on my PC</b> downloads nothing. <b>Not now</b> changes nothing; the Ollama tab sets up the AI later." }),
    h("div", { class: "b5t4-foot", style: "margin-top:2px" }, go, back));
  box.addEventListener("deckkey", (e) => { if (e.detail.key === "B") { e.preventDefault(); ctx.begin2("details"); } });
  return { screen: b5t4Stage({ box }), byId };
}
function b5t4InstallWelcome2(ctx, kind) {
  b5t4InstallWelcome(ctx, "A");   // the same press that starts everything, the chat card with Stop, the PC path, Not now
  ctx.begin2 = (ringId) => {
    ctx.where = "welcome";
    const w = b5t4Wel2El(ctx, kind);
    ctx.show(w.screen, w.byId[ringId] || (ctx.flags.ringMain ? w.byId.deck : w.byId.no));
  };
  ctx.begin = () => ctx.begin2();
  ctx.showDetails = () => {
    ctx.where = "details";
    const d = b5t4Details2El(ctx);
    ctx.show(d.screen, d.byId.back);
  };
}
/* measured, not counted by hand: every word a person would read in the box (hidden pieces left out), and how tall the box is */
function b5t4Words(root) {
  let n = 0;
  const walk = (e) => {
    for (const c of e.childNodes) {
      if (c.nodeType === 3) n += c.nodeValue.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
      else if (c.nodeType === 1 && !c.hidden) walk(c);
    }
  };
  walk(root);
  return n;
}
function b5t4Probe(build) {
  const host = h("div", { style: "position:absolute;left:-10000px;top:0;width:853px;pointer-events:none" });
  document.body.append(host);
  try {
    const el = build();
    host.append(el);
    const box = $(".b5t4-box", el), dim = $(".b5t4-dim", el);
    return { words: b5t4Words(box), height: Math.round(Math.max(box.offsetHeight, box.scrollHeight)), room: dim.clientHeight };
  } finally { host.remove(); }
}
const b5t4Fake = () => ({ flags: { mic: false, ringMain: false }, startDeck() {}, showPc() {}, leave() {}, showDetails() {}, begin2() {} });
const b5t4Meas = {};
function b5t4Measure() {
  const out = {
    r1: b5t4Probe(() => b5t4WelcomeEl(b5t4Fake()).screen),
    "2A": b5t4Probe(() => b5t4Wel2El(b5t4Fake(), "2A").screen),
    "2B": b5t4Probe(() => b5t4Wel2El(b5t4Fake(), "2B").screen),
    "2B-details": b5t4Probe(() => b5t4Details2El(b5t4Fake()).screen),
    "2C": b5t4Probe(() => b5t4Wel2El(b5t4Fake(), "2C").screen),
    "3C": b5t4Probe(() => b5t4Wel2El(b5t4Fake(), "3C").screen),
    "4A": b5t4Probe(() => b5t4Wel4El(b5t4Fake4(), "4A").screen),
    "4B": b5t4Probe(() => b5t4Wel4El(b5t4Fake4(), "4B").screen),
  };
  Object.assign(b5t4Meas, out);
  document.dispatchEvent(new Event("b5t4measured"));
}
const b5t4Fit = (m) => (m.height <= m.room ? h("span", { class: "ok" }, `fits, ${m.room - m.height} points to spare`) : h("span", { class: "bad" }, `too tall by ${m.height - m.room} points`));
function b5t4MeasureCard(kind) {
  const el = h("div", { class: "b5t4-meas" });
  const draw = () => {
    const m = b5t4Meas[kind], r = b5t4Meas.r1;
    if (!m || !r) { el.textContent = "Measuring…"; return; }
    const kids = [h("div", {}, "Words on the first screen: ", h("b", {}, String(m.words)), ` (round 1's A: ${r.words}, so ${Math.round((100 * m.words) / r.words)}%)`),
      h("div", {}, "Box height: ", h("b", {}, m.height + " points"), ` of the ${m.room} the Deck's screen leaves (round 1's A: ${r.height}). It `, b5t4Fit(m), ".")];
    if (kind[0] === "4") { const c = b5t4Meas["3C"]; if (c) kids.push(h("div", {}, `Round 3's checklist, the one you liked: ${c.words} words, ${c.height} points.`)); }
    if (kind === "3C") { const c = b5t4Meas["2C"]; if (c) kids.push(h("div", {}, `Round 2's C, the one you liked: ${c.words} words, ${c.height} points.`)); }
    if (kind === "2B") {
      const d = b5t4Meas["2B-details"];
      if (d) kids.push(h("div", {}, "The Details screen: ", h("b", {}, String(d.words)), " words, ", h("b", {}, d.height + " points"), " tall. It ", b5t4Fit(d), "."));
    }
    el.replaceChildren(...kids);
  };
  draw();
  document.addEventListener("b5t4measured", draw);
  return el;
}
function b5t4Round2(kind, name) {
  const ctx = b5t4Ctx(kind, name, "A");
  b5t4InstallWelcome2(ctx, kind);
  const ring = b5t4Toggle("Ring starts on the big button", false, (on) => { ctx.flags.ringMain = on; if (ctx.where === "welcome" && ctx.press.A + ctx.press.B + ctx.press.D === 0) ctx.begin(); });
  const steps = () => [...(ctx.flags.ringMain ? [] : ["Up"]), "A", b5t4Wait(ctx, () => ctx.finished)];
  const again = () => { if (ctx.where === "welcome" && ctx.press.A + ctx.press.B + ctx.press.D === 0) ctx.begin(); };
  const ticks = kind === "3C" ? [b5t4Toggle("Tick boxes instead of pictures", false, (on) => { ctx.flags.ticks = on; again(); })] : [];
  const bar = b5t4Bar(ctx, steps, [...ticks, ring]);
  ctx.reset();
  const rows = [
    ["The first screen", "Not now or B changes nothing: nothing is downloaded and Internet downloads stay off. The screen says so." + (kind === "2B" ? " Details or B on the Details screen goes back." : "")],
    ["Use the AI on my PC", "Back or B returns to the first screen. Nothing is downloaded on that path."],
    ["While it downloads", "Stop on the card at any moment. The card then says what was kept and what was not installed. Start again carries on without downloading finished parts twice."],
  ];
  return [bar, ctx.root, b5t4MeasureCard(kind), b5t4Cancels(rows)];
}
const b5t4Opt2A = () => b5t4Round2("2A", "Round 2 A");
const b5t4Opt2B = () => b5t4Round2("2B", "Round 2 B");
const b5t4Opt2C = () => b5t4Round2("2C", "Round 2 C");
const b5t4Opt3C = () => b5t4Round2("3C", "Round 3 C");

/* ---------- round 4 (2026-11-16): the permission switch on the screen, and tick boxes that work ----------
   The maintainer liked round 3's checklist and wrote two notes on it: "I think it'll be good to copy the permission
   that is auto-enabled to this screen. User toggles it and hits a confirm OK", and "Also show me a version with
   functional tickboxes".
     4A  the checklist, then the Internet downloads switch (the Permissions tab's own words), then OK. Nothing is
         turned on by itself: OK is grey until the person turns the switch on.
     4B  the same, and the three downloads the AI can run without can be unticked. The total follows the ticks.
   The two big tiles are gone: the choices are three buttons on one row, which pays for the switch's height. */
const B5T4_R4_ITEMS = [
  { id: "ollama", ico: "engine", name: "AI engine (Ollama)", mb: 1510, size: "about 1.5 GB", tag: "ollama.com", need: true },
  { id: "gemma", ico: "models", name: "Answer model gemma4:e2b-it-qat", mb: 4336, size: "about 4.3 GB", tag: "registry.ollama.ai", need: true },
  { id: "nomic", ico: "models", name: "Note-search model nomic-embed-text", mb: 274, size: "about 270 MB", tag: "registry.ollama.ai", why: "for the knowledge base" },
  { id: "speech", ico: "speech", name: "Speech models tiny.en and base.en", mb: 230, size: "about 230 MB", tag: "huggingface.co", why: "for voice input" },
  { id: "voice", ico: "speech", name: "Voice engine (whisper.cpp)", mb: 503, size: "about 500 MB", tag: "ghcr.io", why: "for voice input, ticks with the row above" },
];
const b5t4R4Fresh = () => ({ allow: false, ticks: { nomic: true, speech: true, voice: true } });
const b5t4R4Total = (t) => "about " + (B5T4_R4_ITEMS.reduce((s, i) => s + (i.need || t[i.id] ? i.mb : 0), 0) / 1000).toFixed(1) + " GB";
function b5t4Wel4El(ctx, kind) {
  const byId = {}, s = ctx.r4, boxes = kind === "4B";
  const redraw = (id) => ctx.begin4(id, true);
  const rowEl = (it) => {
    const on = !boxes || it.need || s.ticks[it.id];
    const mark = h("span", { class: "b5t4-ico" + (boxes ? (on ? " tick" : " untick") + (it.need ? " lock" : "") : ""), html: boxes ? (on ? B5T4_ICO.tick : B5T4_ICO.box) : B5T4_ICO[it.ico] });
    const sub = it.size + (boxes ? " · " + (it.need ? "needed" : it.why) : "");
    const kids = [mark, h("div", { class: "b5t4-rn" }, it.name, h("small", {}, sub)), h("div", { class: "b5t4-tags" }, h("span", { class: "b5t4-tag" }, it.tag))];
    if (!boxes || it.need) return h("div", { class: "b5t4-row" }, ...kids);
    const b = h("button", { class: "b5t4-row pick" + (on ? "" : " off"), type: "button", "data-stop": "", "data-id": it.id }, ...kids);
    b.addEventListener("click", () => {
      const v = !s.ticks[it.id];
      s.ticks[it.id] = v;
      if (it.id === "speech" || it.id === "voice") s.ticks.speech = s.ticks.voice = v;   // voice input needs both or neither
      redraw(it.id);
    });
    byId[it.id] = b;
    return b;
  };
  /* the Permissions tab's own row, word for word */
  const sw = h("button", { class: "b5t4-minisw r4" + (s.allow ? " on" : ""), type: "button", "data-stop": "", "data-id": "allow" },
    h("span", {}, h("b", {}, "Internet downloads"), h("small", {}, "Lets bonsAI download Ollama, models and the knowledge library. Off: nothing downloads.")), h("span", { class: "t" }));
  sw.addEventListener("click", () => { s.allow = !s.allow; redraw("allow"); });
  const ok = b5t4Btn("OK, install on this Deck", { kind: "act", row: "foot", id: "ok", on: () => ctx.startDeck4() });
  if (!s.allow) {
    ok.classList.add("greyed");
    ok.addEventListener("click", () => { Deck.setRing(ctx.root, sw, { scroll: false }); sw.classList.add("nudge"); setTimeout(() => sw.classList.remove("nudge"), 900); });   // never a dead press: the ring goes to the switch
  }
  const pc = b5t4Btn("Use the AI on my PC", { kind: "safe", row: "foot", id: "pc", on: () => ctx.showPc() });
  const no = b5t4Btn("Not now", { kind: "safe", row: "foot", id: "no", on: () => ctx.leave() });
  byId.allow = sw; byId.ok = ok; byId.pc = pc; byId.no = no;
  const head = h("div", { class: "b5t4-rowh" }, h("span", {}, boxes ? "What OK downloads. Untick what you do not want" : "What OK downloads"),
    h("span", { class: "b5t4-total" }, b5t4R4Total(boxes ? s.ticks : b5t4R4Fresh().ticks) + " in all"));
  const box = h("div", { class: "b5t4-box pop", style: "gap:6px;padding-top:26px" },
    h("div", { class: "b5t4-title" }, "Welcome to bonsAI. Where should the AI run?"),
    h("div", { class: "b5t4-rows r3" }, head, ...B5T4_R4_ITEMS.map(rowEl)),
    sw,
    h("div", { class: "b5t4-footrow r4" }, ok, pc, no),
    h("div", { class: "b5t4-beta" }, B5T4_R2_BETA + " Not now changes nothing."));
  box.addEventListener("deckkey", (e) => {
    const k = e.detail.key, cur = e.detail.stop;
    if (k === "B") { e.preventDefault(); ctx.leave(); }
    else if (k === "Down" && cur === sw) { e.preventDefault(); Deck.setRing(ctx.root, s.allow ? ok : no, { scroll: false }); }   // Down lands on OK once it can be pressed, on Not now before
  });
  return { screen: b5t4Stage({ box }), byId };
}
function b5t4InstallWelcome4(ctx, kind) {
  b5t4InstallWelcome(ctx, "A");   // the chat card with Stop, the PC path and Not now are round 1's A
  ctx.r4 = b5t4R4Fresh();
  ctx.begin4 = (ringId, keep) => {
    if (!keep) ctx.r4 = b5t4R4Fresh();
    ctx.where = "welcome";
    const w = b5t4Wel4El(ctx, kind);
    ctx.show(w.screen, w.byId[ringId] || (ctx.flags.ringMain ? w.byId.allow : w.byId.no));
  };
  ctx.begin = () => ctx.begin4();
  ctx.startDeck4 = () => {
    const t = ctx.r4.ticks, boxes = kind === "4B", voice = !boxes || t.voice;
    ctx.downloadsOn = true; ctx.voice = voice;
    let plan = b5t4Plan({ voice });
    if (boxes) plan = plan.filter((p) => (p.g !== "nomic" || t.nomic) && (p.g !== "speech" || t.speech));
    ctx.startRun(plan);
    ctx.showMain([ctx.card()]);
  };
  const base = ctx.resultLine;
  ctx.resultLine = () => {
    const t = ctx.r4.ticks;
    if (kind !== "4B" || (t.nomic && t.speech)) return base();
    const out = [...(t.nomic ? [] : ["the note-search model"]), ...(t.speech ? [] : ["the speech models and the voice engine"])];
    return "Ollama 0.40.6 is ready. Downloaded " + (t.nomic ? "gemma4:e2b-it-qat and nomic-embed-text" : "gemma4:e2b-it-qat") + "." + (t.speech ? " Speech models ready: tiny.en and base.en. The voice engine is built." : "") + " Left out, as you chose: " + out.join(" and ") + ".";
  };
}
const b5t4Fake4 = () => ({ ...b5t4Fake(), r4: b5t4R4Fresh(), begin4() {}, startDeck4() {} });
function b5t4Round4(kind, name) {
  const ctx = b5t4Ctx(kind, name, "A");
  b5t4InstallWelcome4(ctx, kind);
  const ring = b5t4Toggle("Ring starts on the switch", false, (on) => { ctx.flags.ringMain = on; if (ctx.where === "welcome" && ctx.press.A + ctx.press.B + ctx.press.D === 0) ctx.begin(); });
  const steps = () => [...(ctx.flags.ringMain ? [] : ["Up"]), "A", "Down", "A", b5t4Wait(ctx, () => ctx.finished)];
  const bar = b5t4Bar(ctx, steps, [ring]);
  ctx.reset();
  const rows = [
    ["The first screen", "Not now or B changes nothing: nothing is downloaded and Internet downloads stay as they were. Turning the switch on and then leaving keeps it on, as it would on the Permissions tab."],
    ["OK while the switch is off", "OK is grey. Pressing it moves the ring to the switch; nothing else happens."],
    ...(kind === "4B" ? [["Something unticked", "It is not downloaded. Its feature says so when you first use it and offers the download then: the knowledge base for the note-search model, Voice input for the speech models and the voice engine. The AI engine and the answer model cannot be unticked: without them there is nothing to answer."]] : []),
    ["While it downloads", "Stop on the card at any moment. The card then says what was kept and what was not installed. Start again carries on without downloading finished parts twice."],
  ];
  return [bar, ctx.root, b5t4MeasureCard(kind), b5t4Cancels(rows)];
}
const b5t4Opt4A = () => b5t4Round4("4A", "Round 4 A");
const b5t4Opt4B = () => b5t4Round4("4B", "Round 4 B");

/* ---------- the board tab ---------- */
function b5t4WordsTable() {
  const table = h("table", {});
  const draw = () => {
    const rows = [["Round 1, A (the one you liked)", b5t4Meas.r1], ["Round 2, A", b5t4Meas["2A"]], ["Round 2, B", b5t4Meas["2B"]], ["Round 2, B, the Details screen", b5t4Meas["2B-details"]], ["Round 2, C (the one you liked)", b5t4Meas["2C"]], ["Round 3, C as a full checklist (the one you liked)", b5t4Meas["3C"]], ["Round 4, A: with the permission switch", b5t4Meas["4A"]], ["Round 4, B: with working tick boxes", b5t4Meas["4B"]]];
    table.replaceChildren(h("tr", {}, h("th", {}, "Screen"), h("th", {}, "Words"), h("th", {}, "Box height (points)"), h("th", {}, "Room on the Deck's screen")),
      ...rows.map(([n, m]) => (m ? h("tr", {}, h("td", {}, n), h("td", { class: "n" }, String(m.words)), h("td", { class: "n" }, String(m.height)), h("td", { class: "n" }, String(m.room))) : h("tr", {}, h("td", {}, n), h("td", { colspan: "3" }, "measuring…")))));
  };
  draw();
  document.addEventListener("b5t4measured", draw);
  return h("div", { class: "b5t4-results", style: "margin-top:8px" }, h("h3", {}, "Words on the first screen, measured"), table,
    h("p", {}, "Counted from the drawn screens in this page: every word a person reads in the box before pressing, not the Deck's own top and bottom bars. The heights come from the same drawing. The page's font loads from the network, so the numbers settle a moment after the page opens."));
}
function b5t4Controls() {
  const names = { T: "Today", A: "A  one first screen", B: "B  live setup screen", C: "C  smallest change", W: "Wild  no boxes", "2A": "Round 2 A  half the words", "2B": "Round 2 B  fewest words", "2C": "Round 2 C  small pictures", "3C": "Round 3 C  full checklist", "4A": "Round 4 A  permission switch", "4B": "Round 4 B  working tick boxes" };
  const table = h("table", {});
  const draw = () => {
    table.replaceChildren(h("tr", {}, h("th", {}, "Option"), h("th", {}, "Presses"), h("th", {}, "A"), h("th", {}, "B"), h("th", {}, "D-pad"), h("th", {}, "How")),
      ...Object.entries(names).map(([k, n]) => {
        const r = b5t4Results[k];
        return r ? h("tr", {}, h("td", {}, n), h("td", { class: "n" }, String(r.n)), h("td", { class: "n" }, String(r.a)), h("td", { class: "n" }, String(r.b)), h("td", { class: "n" }, String(r.d)), h("td", {}, (r.bad ? "stopped at the trap · " : "") + (r.auto ? "shortest way" : "your own presses")))
          : h("tr", {}, h("td", {}, n), h("td", { colspan: "5" }, "not finished yet"));
      }));
  };
  draw();
  document.addEventListener("b5t4results", draw);
  b5t4Measure();   // the word counts and heights below are read off the drawn screens; again when the font has loaded
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(b5t4Measure);
  window.addEventListener("load", b5t4Measure);
  return h("div", { style: "grid-column: 1 / -1; display: contents" },
    b5t4WordsTable(),
    h("div", { class: "b5t4-results" }, h("h3", {}, "Presses from first open to the first question"),
      table,
      h("p", {}, "The count stops when the Main tab shows with the AI ready. It counts every A, B and D-pad press you make on a panel (a click counts as one A), and the same for the shortest-way player, so the numbers are measured, not written by hand.")));
}
TABS.push({
  id: "t4", n: 4, name: "First-time setup", stars: 3, wide: true,
  title: "First-time setup: put the starter set first and cut the steps",
  today: [
    "The first open shows a Beta Notice. Got it opens a second box, “Where should the AI run?”. Install Ollama in that box opens a third one, which asks to turn on internet downloads and names where each download comes from.",
    "Then you wait. The popup shows one changing line and has no Stop; Stop is a red Cancel button on the Ollama tab.",
    "A trap: press Install Ollama while the popup still says “Checking…” and a different box opens. It installs the AI engine only, with no AI model, and the first question has nothing to answer it.",
    "The microphone and the other permissions are separate switches on the Permissions tab, after all that.",
  ],
  deciding: [
    "How many presses and boxes may stand between a fresh install and the first question. The panels count them.",
    "Whether one press may turn on internet downloads and start the whole starter set, when the sites and the size are on the same screen as that press.",
    "How the person can stop: no Stop in the popup (today), a Stop on the chat (A, wild), or a live screen that shows every step (B).",
    "Where the ring starts on a new first screen: on Not now (your rule of 18 October, one more press) or on the main button. A and B have a switch to feel both.",
    "Whether the beta line may be small print folded into the first screen instead of its own box.",
  ],
  howto: "Click a panel, then use the arrow keys; Enter is A; Escape is B. Each panel starts at the first open and counts your presses above it. “Play the shortest way” presses the quickest route by itself so you can watch it and get its number; “Start over” sets the panel back. Today has a trap switch: with it on, the check never ends, so you can press Install too early. On the PC path, A on the address box fills a sample address (the real one opens the keyboard). Download sizes and speeds on screen are drawn; the words and sites are the plugin's own.",
  controls: b5t4Controls,
  options: [
    { id: "T", label: "Today", today: true, title: "Today: Beta Notice, popup, download box, wait, first question", desc: "The real flow on a fresh install, with the real words and sizes of each box: the Beta Notice, the “Where should the AI run?” popup, the box that asks to turn on downloads (its title and site lines stay put, the rest scrolls under them), then the wait. Press Install too early to see the trap.", build: b5t4Today },
    { id: "A", label: "A", title: "One first screen, one press starts everything", desc: "The beta line becomes small print on one first screen with two big choices. The download sites are on that same screen, so the one press that starts the AI also turns on internet downloads. The wait is one changing line and a Stop on the chat itself. There is no box after it.", build: b5t4OptA },
    { id: "B", label: "B", title: "The same first screen, then a live setup screen", desc: "The same single start as A, then one setup screen that lists every step: what is downloading, from which site, how far. Stop works at any moment and says what was kept. Hide keeps it going and leaves the one-line card on the chat. It ends on a button, Ask your first question.", build: b5t4OptB },
    { id: "C", label: "C", title: "The smallest change: today's boxes with two fixes", desc: "Today's popup and today's download box, but the beta line moves into the popup so the Beta Notice goes, and Install waits, greyed, until the check ends so the trap cannot happen. Nothing else changes: the same boxes, the same wait.", build: b5t4OptC },
    { id: "W", label: "Wild", wild: true, title: "No boxes: setup is the first message in the chat", desc: "Quick Access never closes. When you open bonsAI for the first time, the chat's first message is from bonsAI: it names the sites, shows the beta line as small print and has one big button. The same message becomes the progress card with a Stop. No popup means nothing to dismiss and nothing that throws you out of Quick Access.", build: b5t4OptW },
  ],
});

/* ---------- round 2 (2026-11-15): the maintainer liked A and wrote "Too many words on this popup"; not C ---------- */
(() => {
  const t = TABS.find((x) => x.id === "t4");
  t.title = "First-time setup, round 2: A with fewer words";
  t.today = [
    "Round 1: you liked A (one first screen, one press starts everything) and wrote “Too many words on this popup”. You did not pick C (today's boxes with two fixes).",
    "Round 2 draws A's first screen three times with fewer words. Everything after the first screen is the same as A: the one press, the changing line and Stop on the chat, the PC path, Not now. The word counts below are measured from the drawn screens.",
    "Today's real flow is still drawn at the bottom for comparison: a Beta Notice, a popup, a download box, then a wait with no Stop.",
  ];
  t.deciding = [
    "How few words still feel safe on a screen that turns on Internet downloads with one press.",
    "Are the download site names on the screen (A and C), or one press away behind Details (B)? The project's README says bonsAI names where each download comes from before it starts. B says “from 4 sites” on the screen and puts the names one press away.",
    "Do small pictures and tags (C) read faster than words?",
    "Do you still want a microphone switch on this screen? Round 2 leaves it off, so Voice input stays off until the Permissions tab.",
    "Where the ring starts: on Not now (one more press) or on the big button. Each panel has a switch to feel both.",
  ];
  t.howto = "Click a panel, then use the arrow keys; Enter is A; Escape is B. Each panel counts your presses above it, from the first open until the Main tab shows with the AI ready. “Play the shortest way” presses the quickest route for you. Under each panel is the measured word count and box height of its first screen, next to round 1's A. In B, press Details to see the longer screen. Round 1 is further down with your picks kept.";
  t.title = "First-time setup, round 3: C as a full checklist";
  t.today = [
    "Round 2: you liked C (small pictures and site tags). You wrote two notes: “I want a checklist of all the things it's installing and from what site”, and “Why don't we know the size of Ollama? Just look at their releases and avg the MB size”.",
    "Round 3 is C with both notes done: every download is its own row with its size and its site, and the total is the real one. The sizes were looked up on 16 November: Ollama's Linux download averaged over its last 11 releases (1.4 to 1.5 GB each), the two models from Ollama's own model site, the voice engine from its published image.",
    "One thing this turned up: today's popup says “about 4.6 GB”. That is the two models alone. With Ollama itself and the voice engine the real download is about 6.9 GB.",
    ...t.today,
  ];
  t.deciding = [
    "Is this the checklist you meant: a plain list of five, or boxes you can untick to leave something out? The switch above the panel shows tick boxes in place of the pictures. Nothing can be unticked in this drawing.",
    "Five rows make the box taller than round 2's C. The measured height is under the panel.",
    ...t.deciding,
  ];
  t.title = "First-time setup, round 4: the permission switch on the screen";
  t.today = [
    "Round 3: you liked the checklist and wrote two notes on it: “I think it'll be good to copy the permission that is auto-enabled to this screen. User toggles it and hits a confirm OK”, and “Also show me a version with functional tickboxes”.",
    "Round 4 draws both. In A the Internet downloads switch from the Permissions tab sits under the checklist, off, and OK is grey until you turn it on. Nothing turns itself on any more. B is the same with tick boxes that work.",
    "To make room for the switch, the two big choice tiles became three buttons on one row.",
    ...t.today,
  ];
  t.deciding = [
    "Turning the switch on yourself costs presses: 4 from first open to the first question (3 if the ring starts on the switch), against 2 in round 3. The panels count them.",
    "With tick boxes (B): which downloads may be left out. This drawing locks the AI engine and the answer model, and ties the speech models to the voice engine.",
    "Where the ring starts: on Not now (your rule of 18 October) or on the switch. Each panel has a button to feel both.",
    ...t.deciding,
  ];
  t.options = [
    { id: "4A", group: "r4", groupTitle: "Round 4: the permission switch on the screen", label: "A", title: "A, the checklist, the Internet downloads switch, then OK",
      desc: "The five downloads with their sizes and sites, as in round 3. Under them is the Internet downloads switch, in the Permissions tab's own words, and it starts off. OK is grey until you turn the switch on; press OK early and the ring goes to the switch. Then OK starts everything. Use the AI on my PC and Not now sit beside OK.", build: b5t4Opt4A },
    { id: "4B", group: "r4", label: "B", title: "B, the same, with tick boxes that work",
      desc: "Every row has a tick box. The AI engine and the answer model are locked on, because nothing can answer without them. The note-search model, the speech models and the voice engine can be unticked; the speech models and the voice engine tick together, since Voice input needs both. The total at the top right follows the ticks. Whatever you leave out is offered again the first time you use the feature that needs it.", build: b5t4Opt4B },
    { id: "3C", group: "r3", groupTitle: "Round 3: C as a full checklist, with every size", label: "C", title: "C, every download on its own row with its size and site",
      desc: "Five rows: the AI engine, the answer model, the note-search model, the speech models and the voice engine. Each has its size and the site it comes from, and the total is at the top right. The rest is round 2's C: the two choices and one short beta line. Press “Tick boxes instead of pictures” to see the same list with tick boxes.", build: b5t4Opt3C },
    { id: "2A", group: "r2", groupTitle: "Round 2: A, with fewer words", label: "A", title: "A, about half the words: the sites stay on the screen",
      desc: "One line on what the big button does and the total size, the four download sites as short names on one line, two choices, and the beta line as one short line. The sites are on the screen before anything downloads. The microphone switch is gone from this screen.", build: b5t4Opt2A },
    { id: "2B", group: "r2", label: "B", title: "B, the fewest words: the site names are one press away",
      desc: "A title, two choices with one short line each, and a Details button. Details opens the full site list, the beta notice and the longer explanation. The screen says “from 4 sites”, but the names are one press away, not on the screen; A keeps the names on the screen. The beta notice is behind Details too. Weigh that against the README's promise to name each download's site before it starts.", build: b5t4Opt2B },
    { id: "2C", group: "r2", label: "C", title: "C, small pictures instead of words",
      desc: "Three small rows, each with an icon, a name and a size: the AI engine, the starter models, the speech models with the voice engine. The sites sit beside them as small tags. Then the two choices and one short beta line.", build: b5t4Opt2C },
    ...t.options.map((o, i) => ({ ...o, group: "r1", groupTitle: i === 0 ? "Round 1 (your picks are kept)" : undefined })),
  ];
})();
