/* ============================================================
   Board 6, tab 2: the download card's cut-off line (plan 107).
   The first half of this file is shared: the job card, the job bar, a two-button box, the Ollama tab's
   "Where AI runs" section, the Settings tab's "Voice input" section and a small panel engine. Tabs 3 and 7
   (73-reinstall.js, 77-press.js) use them; the files are joined in number order. All names start with b6t2.
   Every word on a panel is the plugin's own (the job card and bar, the Ollama setup job, the voice install
   job, the setup block, the voice section), except the new wordings each option proposes, which say so.
   ============================================================ */

/* ---------- the plugin's own words ---------- */
const B6T2_AWAKE = "Keep the Deck awake and online until this finishes.";
const B6T2_SITES = { ollama: "From ollama.com, github.com and ollama.ai", voice: "From ghcr.io, ubuntu.com and huggingface.co", kb: "From huggingface.co or github.com" };
const B6T2_IDLE = "Install the official daemon, restart the service if needed, then pull models. Prefer stable Wi‑Fi.";
const B6T2_SITES_BUDGET = 46;
const B6T2_CARD_PX = 110, B6T2_LINE_PX = 13;

/* ---------- small pieces ---------- */
function b6t2Btn(label, key, cls, onClick, extra) {
  const b = h("button", Object.assign({ class: "b6t2-btn " + (cls || ""), "data-stop": "", "data-k": key }, extra || {}), label);
  if (onClick) b.addEventListener("click", onClick);
  return b;
}
function b6t2Fold(label, summary, open, key, onClick) {
  const b = h("button", { class: "k-fold" + (open ? " open" : ""), "data-stop": "", "data-k": key }, h("span", { class: "k-ft" }, label), h("span", { class: "k-fs" }, summary || ""), h("span", { class: "k-fc" }, open ? "▾" : "▸"));
  if (onClick) b.addEventListener("click", onClick);
  return b;
}
function b6t2Sw(label, on, key, onClick) {
  const b = h("button", { class: "k-row", "data-stop": "", "data-k": key }, h("span", { class: "k-l" }, label), h("span", { class: "k-sw" + (on ? " on" : "") }));
  if (onClick) b.addEventListener("click", onClick);
  return b;
}
const b6t2Fill = (frac) => h("div", { class: "b6t2-prog" }, h("span", { class: "b6t2-fill", "data-moving": frac == null ? "true" : "false", style: frac == null ? null : `width:${Math.round(frac * 1000) / 10}%` }));
function b6t2CancelBtn(o, key) {
  const b = h("button", { class: "b6t2-cancel", "data-stop": "", "data-k": key, "data-stopping": o.stopping ? "true" : "false" }, o.stopping ? "Stopping" : "Cancel", o.stopping || o.noX ? null : h("i", { class: "b6t2-key" }, "X"));
  if (o.onCancel) b.addEventListener("click", o.onCancel);
  return b;
}

/* the job card: title and Cancel, the progress line, then three one-line rows (two lines for the middle one with `two`) */
/* a one-line row as the Deck shows it, whatever this page's font: over about 46 characters it is cut there with "…"
   (measured on the Deck, the sites line's budget), so the drawing never shows more than the Deck does */
const b6t2Fit = (t) => (t && t.length > B6T2_SITES_BUDGET ? t.slice(0, B6T2_SITES_BUDGET) + "…" : t);
function b6t2Card(o) {
  return h("div", { class: "b6t2-card" + (o.two ? " two" : "") },
    h("div", { class: "b6t2-head" }, h("span", { class: "b6t2-title" }, o.title), b6t2CancelBtn(o, o.key || "cancel")),
    b6t2Fill(o.frac),
    h("div", { class: "b6t2-zone" },
      h("div", { class: "b6t2-l b6t2-now" }, b6t2Fit(o.l1)),
      h("div", { class: "b6t2-l b6t2-far", "data-far": "", title: o.l2 }, o.two ? o.l2 : b6t2Fit(o.l2)),
      h("div", { class: "b6t2-l b6t2-sites" }, b6t2Fit(o.sites))));
}

/* the bar at the panel's foot: a running job (title, Cancel, one line, a 3 px progress line) or how one ended */
function b6t2Bar(o) {
  if (o.result) {
    const r = o.result;
    return h("div", { class: "b6t2-bar", "data-tone": r.tone },
      h("div", { class: "b6t2-brw" }, h("span", { class: "b6t2-mark" }, r.tone === "ok" ? "✓" : "✕"), h("span", { class: "b6t2-btt" }, r.title)),
      h("div", { class: "b6t2-bline" }, r.sentence));
  }
  return h("div", { class: "b6t2-bar", "data-tone": "run" },
    h("div", { class: "b6t2-brw" }, h("span", { class: "b6t2-spin" }), h("span", { class: "b6t2-btt" }, o.title), b6t2CancelBtn(o, o.key || "bar")),
    h("div", { class: "b6t2-bline" }, o.line),
    b6t2Fill(o.frac));
}

/* a two-button box: the action on the left, the safe button on the right where the ring starts */
function b6t2Box(o) {
  const act = h("button", { class: "b6t2-bact", "data-stop": "", "data-row": "box", "data-k": "box-act" }, o.action);
  const safe = h("button", { class: "b6t2-bsafe", "data-stop": "", "data-row": "box", "data-k": "box-safe" }, o.safe || "Cancel");
  act.addEventListener("click", o.onAction);
  safe.addEventListener("click", o.onSafe);
  return h("div", { class: "b6t2-scrim" }, h("div", { class: "b6t2-box", role: "dialog" },
    h("div", { class: "b6t2-bt" }, o.title),
    h("div", { class: "b6t2-bb" }, ...o.body.map((t, i) => h("div", { class: i === o.body.length - 1 && o.lastPlain ? "last" : "" }, t))),
    h("div", { class: "b6t2-brow" }, act, safe)));
}

/* ---------- the panel engine ----------
   build(s, api) gives { body: [...], bar, box, fallback, onB }; render() redraws and keeps the ring on the same
   data-k (or on `to`, or on the fallback). api.after() runs a timer that api.stop() clears. */
function b6t2Shell(o) {
  const s = Object.assign({}, o.state || {});
  const holder = h("div", { style: "display:contents" });
  const root = deckFrame({ body: holder, header: false, height: o.height || PANEL.h });
  root.classList.add("dt", "b6t2-deck");
  const sc = h("div", { class: "dt-scroll scroll b6t2-sc" }), dock = h("div", { class: "b6t2-dock" }), layer = h("div", { class: "b6t2-layer" });
  holder.append(tabBar2(o.tab), h("div", { class: "k2-gap" }), sc, dock, layer);
  const timers = [];
  let view = {};
  const api = {
    root, s,
    after(ms, fn) { timers.push(setTimeout(fn, ms)); },
    stop() { while (timers.length) clearTimeout(timers.pop()); },
    toast(title, body, ms = 2600) {
      const t = h("div", { class: "b6t2-toast" }, h("b", {}, title), body);
      $(".qam", root).append(t);
      setTimeout(() => t.remove(), ms);
    },
    render(to) {
      const cur = Deck.current(root), key = to || (cur && cur.dataset.k), top = sc.scrollTop;
      view = o.build(s, api);
      sc.replaceChildren(...view.body);
      dock.replaceChildren(...(view.bar ? [view.bar] : []));
      layer.replaceChildren(...(view.box ? [view.box] : []));
      sc.classList.toggle("is-gone", !!view.box);
      dock.classList.toggle("is-gone", !!view.box);
      sc.scrollTop = top;
      const start = $(`[data-k="${o.start}"]`, root);
      if (start) start.setAttribute("data-start", "");
      if (!key && !view.box) return;
      let el = key && $(`[data-k="${key}"]`, root);
      if (view.box && (!el || !view.box.contains(el))) el = $('[data-k="box-safe"]', root);
      if (!el || !Deck.stops(root).includes(el)) el = view.fallback && $(`[data-k="${view.fallback}"]`, root);
      if (el) Deck.setRing(root, el, { scroll: !!to });
      if (o.after) o.after(s, api);
    },
  };
  root.addEventListener("deckkey", (e) => {
    const k = e.detail.key;
    if (k === "B" && view.box && view.onB) { e.preventDefault(); view.onB(); return; }
    if (k === "X" && o.onX) o.onX(e, s, api);
  });
  api.render();
  root.b6 = api;
  return root;
}

/* the controls under a panel */
function b6t2Ctl(label, items) {
  return h("div", { class: "b6t2-ctl" }, label ? h("span", {}, label) : null, ...items.map(([t, fn]) => { const b = h("button", { type: "button" }, t); b.addEventListener("click", fn); return b; }));
}

/* ---------- the Ollama tab, "Where AI runs" open: the setup block with its buttons or the card ---------- */
function b6t2OllamaBody(s, api, o) {
  const block = [h("div", { class: "b6t2-lbl" }, "Local Ollama setup", h("span", {}, "Installed: 7"))];
  if (o.card) block.push(o.card);
  else block.push(
    b6t2Btn("Update AI & models", "update", "", o.onUpdate),
    b6t2Btn([h("span", {}, "Browse models"), h("span", { style: "color:#9ce7ff" }, "›")], "browse", "alt"),
    h("div", { class: "b6t2-zone2" }, s.ended ? h("div", { class: "b6t2-z1" }, s.ended) : h("div", { class: "b6t2-z2" }, B6T2_IDLE), h("div", { class: "b6t2-z3" }, B6T2_SITES.ollama)));
  return [
    b6t2Fold("Where AI runs", "Run AI on this Deck on · Start the AI with the Deck on", true, "f0"),
    b6t2Sw("Run AI on this Deck", true, "sw1"),
    b6t2Sw("Start the AI with the Deck", true, "sw2"),
    h("div", { class: "b6t2-body" }, ...block),
    b6t2Fold("Knowledge base (offline)", "Use local knowledge base on", false, "f1"),
    b6t2Fold("Reply style", "", false, "f2"),
    b6t2Fold("Connection tuning", "", false, "f3"),
    b6t2Fold("AI models", "", false, "f4"),
  ];
}

/* the Ollama update's steps as the card says them (the setup job's own lines) */
const B6T2_STEPS = { check: ["Checking what is installed", true], install: ["Installing the newest Ollama", true] };
function b6t2UpdateCard(s, line2, extra) {
  const [l1] = B6T2_STEPS[s.step] || B6T2_STEPS.install;
  return b6t2Card(Object.assign({ title: s.stopping ? "Stopping the update" : "Updating AI & models", stopping: s.stopping, l1, l2: line2, sites: B6T2_SITES.ollama, frac: null }, extra || {}));
}
/* press Update: the card at once, the ring on its Cancel; Cancel: "Stopping" for a second, then the buttons and "Cancelled." */
function b6t2StartUpdate(s, api) {
  api.stop(); s.run = true; s.stopping = false; s.ended = null; s.step = "check"; s.at = Date.now();
  api.render("cancel");
  api.after(600, () => { s.step = "install"; api.render(); });
}
function b6t2CancelUpdate(s, api) {
  if (!s.run || s.stopping || Date.now() - (s.at || 0) < 500) return;
  s.stopping = true; api.render();
  api.after(1000, () => { s.run = false; s.stopping = false; s.ended = "Cancelled."; api.render("update"); });
}

/* ---------- the Settings tab's folds, and "Voice input" open ---------- */
function b6t2SettingsFolds(open, voiceBody, onVoice) {
  return [
    b6t2Fold("Screenshot quality", "", false, "g1"),
    b6t2Fold("Text size", "", false, "g2"),
    b6t2Fold("Remember what I typed", "", false, "g3"),
    b6t2Fold("Story spoilers (Strategy mode)", "", false, "g4"),
    b6t2Fold("Suggestion chips", "Show one chip instead of two off", false, "g5"),
    b6t2Fold("Voice input", "STT model: base.en", open, "g6", onVoice),
    ...(open ? [voiceBody] : []),
    b6t2Fold("AI voice & personality", "off", false, "g7"),
    b6t2Fold("Data", "Show Developer tab off", false, "g8"),
  ];
}
/* the section's body: the model choice, the engine lines, then the install button (or the card) and the lines under it */
function b6t2VoiceBody(o) {
  const ready = o.ready, busy = !!o.card;
  const lines = [`Engine: ${ready ? "whisper-cli ready" : "whisper-cli not installed"}`, h("br"), `Model: ${ready ? "base.en ready" : "base.en not downloaded"}`];
  if (ready && !busy) lines.push(h("br"), "Voice engine is ready for on-device transcription.");
  if (!ready && !busy) lines.push(h("br"), "Tap Install voice engine below (uses podman on SteamOS).");
  const under = [];
  if (!busy && o.under) under.push(...o.under);
  if (!busy) under.push(h("div", { class: "b6t2-z3" }, B6T2_SITES.voice));
  return h("div", { class: "b6t2-body" },
    h("div", { class: "b6t2-lbl" }, "STT model"),
    h("div", { class: "b6t2-chs" }, h("button", { class: "b6t2-ch", "data-stop": "", "data-row": "stt", "data-k": "tiny" }, "tiny.en · faster"), h("button", { class: "b6t2-ch on", "data-stop": "", "data-row": "stt", "data-k": "base" }, "base.en · better")),
    h("div", { class: "b6t2-info" }, ...lines),
    busy ? o.card : o.button,
    under.length ? h("div", { class: "b6t2-zone2" }, ...under) : null);
}

/* ============================================================
   Tab 2 itself
   ============================================================ */
const B6T2_WORDINGS = {
  A1: "Keep the Deck awake and online until done.",
  A2: "Keep the Deck awake and online till it ends.",
  A3: "Deck must stay awake and online until done.",
};

/* one panel: the Ollama tab with an update running, held on the step that shows the line */
function b6t2CardPanel(o) {
  const root = b6t2Shell({
    tab: 1, height: 330, start: "cancel",
    state: { run: true, stopping: false, step: "install", at: 0 },
    build: (s, api) => ({
      body: b6t2OllamaBody(s, api, {
        card: s.run ? b6t2UpdateCard(s, o.line, Object.assign({ two: o.two, onCancel: () => b6t2CancelUpdate(s, api) }, o.face || {})) : null,
        onUpdate: () => b6t2StartUpdate(s, api),
      }),
      fallback: s.run ? "cancel" : "update",
    }),
    onX: (e, s, api) => { if (s.run) { e.preventDefault(); b6t2CancelUpdate(s, api); } },
  });
  /* the note follows the Deck's measured rule (b6t2Fit), not this page's font */
  const n = o.line.length, height = o.two ? B6T2_CARD_PX + B6T2_LINE_PX : B6T2_CARD_PX;
  const verdict = o.two ? `shown whole on two lines (${n} characters)` : n > B6T2_SITES_BUDGET ? "cut off on the Deck" : `fits on the Deck (${n} characters, the limit is about ${B6T2_SITES_BUDGET})`;
  const meas = h("p", { class: "b6t2-meas" }, `The line: `, h("b", {}, `${n} characters`), ` · `, h("b", {}, verdict), ` · card `, h("b", {}, `${height} px`), ` tall`);
  return [root, meas];
}

TABS.push({
  id: "t2", n: 2, name: "Download card line", stars: 1,
  onShow: () => $$("#tab-t2 .deck").forEach((r) => r.b6measure && setTimeout(r.b6measure, 60)),
  title: "The download card's line that gets cut off",
  today: [
    "While a download waits for its first numbers, the card's middle line reads “Keep the Deck awake and online until this finishes.” It is 51 characters. The card has room for about 46, so the Deck shows it cut off with “…”.",
    "The same line shows on every download card: the Ollama install and update, the knowledge library download and the voice engine install.",
    "The card is a fixed 110 pixels tall in every state, so nothing under it moves while a job runs.",
  ],
  deciding: [
    "A shorter line that fits (three wordings to pick from, all 45 characters or fewer, all keeping “awake” and “online”).",
    "Or keep the whole sentence and let the card grow by one line.",
  ],
  howto: "Each panel is the Ollama tab with an update running, stopped on the step that shows the line. The line under each panel says how long the line is and whether it fits on the Deck. Press Cancel (or X) to end the update and Update AI & models to start it again. Every one-line row is cut where the Deck was measured to cut it (after about 46 characters), whatever font this page has.",
  options: [
    { id: "today", label: "Today", today: true, group: "main", title: "Today: cut off", desc: "The line is 51 characters and the card shows about 46, so it ends in “…”. Nothing to build.", build: () => b6t2CardPanel({ line: B6T2_AWAKE }) },
    { id: "A1", label: "A1", group: "main", groupTitle: "Three shorter wordings", title: "“Keep the Deck awake and online until done.”", desc: "42 characters, so it fits. Same meaning, plainest ending. Words only: one line changes in two places, and the card stays 110 pixels.", build: () => b6t2CardPanel({ line: B6T2_WORDINGS.A1 }) },
    { id: "A2", label: "A2", group: "main", title: "“Keep the Deck awake and online till it ends.”", desc: "44 characters: fits, with three to spare. A little more spoken. Words only.", build: () => b6t2CardPanel({ line: B6T2_WORDINGS.A2 }) },
    { id: "A3", label: "A3", group: "main", title: "“Deck must stay awake and online until done.”", desc: "43 characters. Reads as a rule rather than a request. Words only.", build: () => b6t2CardPanel({ line: B6T2_WORDINGS.A3 }) },
    { id: "B", label: "B", group: "main", groupTitle: "Keep the sentence", title: "The whole sentence on two lines", desc: `The middle line may wrap onto a second line, so the full sentence shows. The card grows by one ${B6T2_LINE_PX}-pixel line, from ${B6T2_CARD_PX} to ${B6T2_CARD_PX + B6T2_LINE_PX} pixels, in every state, so everything under it sits ${B6T2_LINE_PX} pixels lower on all three download cards.`, build: () => b6t2CardPanel({ line: B6T2_AWAKE, two: true }) },
    { id: "built", label: "For the eye", wild: true, group: "eye", groupTitle: "For the eye only, not a choice", title: "Being built this session: the Ollama download shows a number", desc: "While the newest Ollama downloads, the card shows how far it has got in megabytes, the way a model download does today, instead of only moving stripes. The exact words and where they sit are not final. Today's card is first, then the one being built.", build: () => [h("p", { class: "b6t2-cap" }, "Today"), ...b6t2CardPanel({ line: B6T2_AWAKE }).slice(0, 1), h("p", { class: "b6t2-cap" }, "Being built this session"), ...b6t2CardPanel({ line: "Downloading Ollama: 412 MB of 1.5 GB", face: { frac: 0.27 } }).slice(0, 1)] },
  ],
});
