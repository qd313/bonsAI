/* ============================================================
   Board 6, tab 6: reaching the download bar's Cancel on the main screen.
   Every route below is read from the plugin's code:
   - the bar, its words and its own presses: JobBar.tsx (Up and B go back to where the ring came from, Down, Left and
     Right hold, X on the bar cancels, the X glyph is left off on Main) and ollamaSetupJob.ts (the update's words);
   - the question box and its strip: useMainTabAskBarFocus.ts and AskStripSendButtons.tsx (Down from the box lands on
     Ask, or on Stop while an answer is written; Up from a strip stop is the box; nothing claims Down from the strip);
   - X on Main: only two places in the plugin listen for X (the bar itself, and the body of every tab but Main).
   The chat, the chips and the question box's grey words are the kit's sample; the 43% on the progress line is drawn.
   ============================================================ */
const B6T6_PANELS = [];
const B6T6_COUNT = {
  today: ["no route.", " Only a tap on the screen reaches it."],
  A: ["2 presses", " (Down, Down). A third press, A, cancels. While an answer is being written there is no route: Ask is resting, so Down from the box lands on Stop."],
  B: ["2 presses", " (Down, Down), and the same while an answer is being written. From any stop of the strip it is 1 press."],
  C: ["no route on this screen.", " By the Ollama tab it is 2 presses (RB, then X), and you have left this screen."],
  D: ["the ring never goes there.", " X cancels in 1 press from anywhere on this screen."],
};

function b6t6Panel(opt) {
  const st = { busy: false, job: "run", from: null, n: 0, tm: 0, msg: "" };
  const reach = opt === "A" || opt === "B";
  const s = {};
  const field = h("button", { class: "k2-field", "data-stop": "", "data-start": "", "data-k": "box" }, "Describe the level, boss, or puzzle you're stuck on.");
  const strip = h("div", { class: "k2-strip" });
  const bar = h("div", { class: "b6t6-bar" });
  const sc = h("div", { class: "scroll k2-scroll" }, qBubble2(SAMPLE.q), aBubble2(SAMPLE.a.slice(0, 3)));
  const chips = ["How do I fix stuttering?", "Why can't bonsAI reach my PC?"].map((c) => h("button", { class: "k2-chip", "data-stop": "", "data-row": "b6t6chips", "data-k": "chip" }, c));
  const body = h("div", { class: "k2", style: "display:contents" }, tabBar2(0), nameRow2("Hollow Knight help", 1, 8), h("div", { class: "k2-gap" }), sc,
    h("div", { class: "k2-dock" }, h("div", { class: "k2-chips" }, ...chips), h("div", { class: "k2-box" }, h("span"), field, strip)), bar);
  const root = deckFrame({ body, header: false });
  root.classList.add("b6t6");
  const read = h("p", { class: "b6t6-read", "aria-live": "polite" });
  const again = h("button", { class: "b6t6-again", type: "button", hidden: true }, "Start the download again");

  const ringK = () => { const r = Deck.current(root); return r ? r.dataset.k || "chat" : ""; };
  const names = () => ({ box: "the question box", clip: "the paperclip", mode: "the mode button", mic: st.busy ? "Stop" : "the microphone", ask: "Ask", bar: "the bar's Cancel", chip: "a suggestion chip", chat: "the chat" });
  const say = () => {
    const k = ringK();
    read.replaceChildren(k ? `Ring on ${names()[k]}. Presses since the question box: ${st.n}.` : "Click the panel, then press ↓.", st.msg ? h("br") : "", st.msg ? h("i", {}, st.msg) : "");
  };
  const held = (el) => { if (!el) return; el.classList.remove("b6t6-held"); void el.offsetWidth; el.classList.add("b6t6-held"); };
  const live = () => (st.busy ? [s.mode, s.mic] : [s.clip, s.mode, s.mic, s.ask]);
  const leave = () => Deck.setRing(root, st.from && live().includes(st.from) ? st.from : field);

  function drawStrip() {
    const k = ringK(), b = st.busy, row = "b6t6strip";
    s.clip = h("button", { class: "k2-ic" + (b ? " b6t6-rest" : ""), "data-stop": !b, "data-row": row, "data-k": "clip", "aria-label": "Attach", html: ICONS2.clip });
    s.mode = h("button", { class: "k2-mode", "data-stop": "", "data-row": row, "data-k": "mode" }, "Strategy");
    s.mic = b ? h("button", { class: "b6t6-stopb", "data-stop": "", "data-row": row, "data-k": "mic", "aria-label": "Stop generation" }, h("i"))
      : h("button", { class: "k2-ic k2-mic", "data-stop": "", "data-row": row, "data-k": "mic", "aria-label": "Speak", html: ICONS2.mic });
    s.ask = h("button", { class: "k2-ask" + (b ? " b6t6-rest" : ""), "data-stop": !b, "data-row": row, "data-k": "ask", "aria-label": "Ask" }, "Ask", h("span", { html: ICONS2.send }));
    strip.replaceChildren(s.clip, h("span", { class: "k2-game" }, h("span", { html: ICONS2.game }), "No game"), s.mode, s.mic, s.ask);
    if (s[k]) Deck.setRing(root, s[k].hasAttribute("data-stop") ? s[k] : field, { scroll: false });
  }

  function drawBar() {
    const onBar = ringK() === "bar";
    bar.hidden = st.job === "gone";
    again.hidden = st.job === "run";
    if (st.job === "gone" || st.job === "res") {
      bar.replaceChildren(...(st.job === "res" ? [h("div", { class: "b6t6-r1" }, h("span", { class: "b6t6-mark" }, "✕"), h("span", { class: "b6t6-tt" }, "Update cancelled")), h("div", { class: "b6t6-r2" }, "Cancelled.")] : []));
      if (onBar) leave();
      return;
    }
    const stopping = st.job === "stopping";
    const cx = h("button", { class: "b6t6-cx" + (stopping ? " stopping" : ""), "data-stop": reach, "data-k": "bar", "aria-label": "Cancel: Updating AI & models" },
      stopping ? "Stopping" : "Cancel", !stopping && opt === "D" ? h("i", { class: "b6t6-key" }, "X") : null);
    cx.addEventListener("click", cancel);
    s.bar = cx;
    bar.replaceChildren(
      h("div", { class: "b6t6-r1" }, h("span", { class: "b6t6-spin" }), h("span", { class: "b6t6-tt" }, stopping ? "Stopping the update" : "Updating AI & models"), cx),
      h("div", { class: "b6t6-r2" + (opt === "C" ? " where" : "") }, opt === "C" ? "Cancel on the Ollama tab" : "Downloading model 1 of 2 · gemma4:e2b-it-qat"),
      h("div", { class: "b6t6-pg" }, h("span")));
    if (onBar) Deck.setRing(root, cx, { scroll: false });
  }

  function cancel() {
    if (st.job !== "run") return;
    st.job = "stopping"; st.msg = "The download is stopping."; drawBar();
    clearTimeout(st.tm);
    st.tm = setTimeout(() => {
      st.job = "res"; st.msg = "The download has stopped. The bar says so for four seconds, then goes."; drawBar(); say();
      st.tm = setTimeout(() => { st.job = "gone"; st.msg = "The bar is gone."; drawBar(); say(); }, 4000);
    }, 1200);
  }
  again.addEventListener("click", () => { clearTimeout(st.tm); st.job = "run"; st.msg = ""; drawBar(); say(); });

  root.addEventListener("ringmove", (e) => { if (e.detail.el === field) st.n = 0; setTimeout(say, 0); });
  root.addEventListener("deckkey", (e) => {
    const { key, stop } = e.detail, k = stop ? stop.dataset.k : "";
    if (!stop) return;
    st.n += 1; st.msg = "";
    setTimeout(say, 0);
    if (key === "X") {
      e.preventDefault();
      if (st.job === "run" && (opt === "D" || (reach && k === "bar"))) cancel();
      else if (st.job === "run") st.msg = "X: nothing happens on this screen.";
      return;
    }
    if (key === "A" || !k || k === "chip") return;
    if (key === "B") { if (k === "bar") { e.preventDefault(); leave(); } return; }
    let to = null;
    if (k === "box") {
      if (key === "Up") { e.preventDefault(); Deck.setRing(root, chips[0]); return; }
      to = key === "Down" ? (st.busy ? s.mic : s.ask) : key === "Left" ? (st.busy ? null : s.clip) : s.mode;
    } else if (k === "bar") {
      if (key === "Up") { e.preventDefault(); leave(); return; }
    } else {
      const order = live(), i = order.indexOf(stop);
      if (key === "Up") to = field;
      else if (key === "Left") to = order[i - 1];
      else if (key === "Right") to = order[i + 1];
      else if (s.bar && st.job !== "gone" && st.job !== "res" && (opt === "B" || (opt === "A" && k === "ask"))) { st.from = stop; to = s.bar; }
      else st.msg = "Down: the ring stays. Nothing below takes it.";
    }
    e.preventDefault();
    if (to) Deck.setRing(root, to); else held(stop);
  });

  drawStrip(); drawBar(); say();
  B6T6_PANELS.push({ sc, busy: (v) => { st.busy = v; drawStrip(); say(); } });
  const c = B6T6_COUNT[opt];
  return [h("p", { class: "b6t6-count" }, "From the question box to the bar's Cancel: ", h("b", {}, c[0]), c[1]), root, read, again];
}

TABS.push({
  id: "t6", n: 6, name: "Cancel on the bar", stars: 3, wide: false,
  onShow: () => B6T6_PANELS.forEach((p) => { if (!p.seen && p.sc.scrollHeight) { p.seen = true; p.sc.scrollTop = p.sc.scrollHeight; } }),
  title: "The download bar on the main screen: reaching its Cancel with the D-pad",
  today: [
    "While a download runs and its card is out of sight, a bar 56 points tall sits at the foot of the panel, on every tab, with a Cancel button.",
    "On the main screen the D-pad cannot reach that Cancel. Down from the question box lands on Ask, and Down from Ask does nothing. Down from the paperclip, the mode button and the microphone does nothing either. Only a tap on the screen cancels.",
    "X does nothing on the main screen, so the bar's Cancel shows no X there. On every other tab X stops the download from anywhere.",
  ],
  deciding: [
    "Whether the bar becomes a stop under the question box (A, B), stays out of reach and says where to cancel (C), or X stops the download from anywhere on the main screen (D).",
    "A and B add one stop under the question box on the most-used screen, only while a download runs. A is reached from Ask alone; B from every stop of the strip, so it also works while an answer is being written.",
    "Nothing on the main screen uses X today, so D is on offer. It makes this screen behave as the other tabs do now. Tab 7 asks whether X from anywhere should stop a long job at all; the two picks belong together.",
  ],
  howto: "Click a panel to drive it. Each starts with the ring on the question box and a download running. Press ↓ and ↑ and watch where the ring goes; a small dip means the ring stayed. The line under each panel counts your presses since the question box. A click on Cancel is a tap of the finger. Use the switch below to try the same route while an answer is being written.",
  controls: () => {
    const mk = (label, v) => h("button", { type: "button", "aria-pressed": String(!v), onclick: (e) => {
      B6T6_PANELS.forEach((p) => p.busy(v));
      $$("button", e.currentTarget.parentNode).forEach((b) => b.setAttribute("aria-pressed", String(b === e.currentTarget)));
    } }, label);
    return h("div", { class: "b6t6-sw", role: "group", "aria-label": "What the plugin is doing" }, "In every panel:", mk("Nothing is being asked", false), mk("An answer is being written", true));
  },
  options: [
    { id: "today", label: "Today", today: true, title: "A tap only", desc: "The ring cannot get onto the bar. Down from Ask and from the rest of the strip stays where it is, and X does nothing. Costs nothing; a person with only the pad has to leave this screen to cancel.", build: () => b6t6Panel("today") },
    { id: "A", label: "A", title: "Down from Ask lands on Cancel", desc: "One more Down after Ask puts the ring on the bar's Cancel; Up goes back to Ask. Adds one stop under the question box while a download runs. With the ring on the bar, X cancels too, as it already does on the other tabs.", build: () => b6t6Panel("A") },
    { id: "B", label: "B", title: "Down from any stop of the strip lands on Cancel", desc: "The same as A, from the paperclip, the mode button, the microphone or Stop as well. Up goes back to the stop you came from. Adds the same one stop, and it can be reached while an answer is being written.", build: () => b6t6Panel("B") },
    { id: "C", label: "C", title: "No new stop; the bar says where to cancel", desc: "The ring moves exactly as today. The bar's second line reads “Cancel on the Ollama tab” in place of the download's progress, so the progress words are lost on this screen. A tap still works.", build: () => b6t6Panel("C") },
    { id: "D", label: "D", title: "X cancels from anywhere on this screen", desc: "No new stop. X stops the download wherever the ring is, the chat included, and the X sign comes back on the bar's Cancel. One press, and one press by mistake stops a long download too.", build: () => b6t6Panel("D") },
  ],
});
