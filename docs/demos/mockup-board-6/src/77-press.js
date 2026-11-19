/* ============================================================
   Board 6, tab 7: presses that start or stop something big (plan 107).
     Call one: X pressed anywhere on a tab (not Main) stops the running download at once.
     Call two: Update AI & models starts at one press.
   Uses tab 2's shared pieces (b6t2Shell, b6t2Card, b6t2Bar, b6t2Box, the Ollama and Settings sections).
   The card, the bar and the result words are the plugin's own; the two boxes' words are new and say so.
   All names here start with b6t7.
   ============================================================ */
const B6T7_FACE = { l1: "Building the voice engine", l2: "This part has no percentage. It can take a few minutes.", frac: null };
const B6T7_RES_MS = 4000;

/* call one: the Settings tab with the voice engine install building. "Voice input" starts folded shut, so the
   card is not drawn and the bar at the foot shows the job; A on "Voice input" opens it and the card takes over. */
function b6t7XPanel(variant) {
  const log = h("p", { class: "b6t7-log" }, "Nothing pressed yet.");
  const say = (t) => log.replaceChildren(...t);
  const root = b6t2Shell({
    tab: 2, height: 400, start: "g2",
    state: { run: true, stopping: false, open: false, ended: false, res: false, box: false },
    build: (s, api) => {
      const noX = variant === "C"; // choice C: X stops nothing, so the X sign beside Cancel goes
      const card = s.run ? b6t2Card(Object.assign({ title: s.stopping ? "Stopping the install" : "Voice engine install", stopping: s.stopping, noX, sites: B6T2_SITES.voice, onCancel: () => b6t7Stop(s, api, say, "A on Cancel") }, B6T7_FACE)) : null;
      const under = s.ended ? [h("div", { class: "b6t2-z1" }, "Install cancelled. Press Install voice engine to start again.")] : [];
      const voice = b6t2VoiceBody({ ready: false, card, button: b6t2Btn("Install voice engine", "install", "glass", () => b6t7Again(s, api, say)), under });
      let bar = null;
      if (s.run && !s.open) bar = b6t2Bar({ title: s.stopping ? "Stopping the install" : "Voice engine install", line: B6T7_FACE.l1, frac: null, stopping: s.stopping, noX, onCancel: () => b6t7Stop(s, api, say, "A on the bar's Cancel") });
      else if (s.res && !s.open) bar = b6t2Bar({ result: { tone: "quiet", title: "Voice install cancelled", sentence: "Install cancelled." } });
      const box = s.box ? b6t2Box({
        title: "Stop the voice engine install?",
        body: ["Stopping ends the install now."],
        action: "Stop", safe: "Keep going",
        onAction: () => { s.box = false; b6t7Stop(s, api, say, "X, then Stop in the box"); },
        onSafe: () => { s.box = false; api.render(s.from); say(["Kept going."]); },
      }) : null;
      return {
        body: b6t2SettingsFolds(s.open, voice, () => { s.open = !s.open; api.render("g6"); }),
        bar, box, onB: () => { s.box = false; api.render(s.from); say(["B: kept going."]); },
        fallback: s.run ? (s.open ? "cancel" : "g6") : "g6",
      };
    },
    onX: (e, s, api) => {
      if (!s.run || s.stopping || s.box) return;
      e.preventDefault();
      const cur = Deck.current(api.root), on = cur && (cur.dataset.k === "cancel" || cur.dataset.k === "bar");
      const where = cur ? `the ring on “${(($(".k-ft, .k-l", cur) || cur).textContent).replace(/X$/, "").trim().slice(0, 32)}”` : "no ring";
      if (variant === "C") { say([h("b", {}, "X did nothing"), ` (${where}). X never stops a job here: move the ring to Cancel and press A.`]); return; }
      if (variant === "A" && !on) { say([h("b", {}, "X did nothing"), ` (${where}). Move the ring to Cancel first.`]); return; }
      if (variant === "B") { s.from = cur && cur.dataset.k; s.box = true; api.render("box-safe"); say([h("b", {}, "X asked first"), ` (${where}).`]); return; }
      b6t7Stop(s, api, say, `X with ${where}`);
    },
  });
  const ctl = b6t2Ctl("", [["Start the install again", () => b6t7Again(root.b6.s, root.b6, say)]]);
  return [root, log, ctl];
}
function b6t7Stop(s, api, say, how) {
  if (!s.run || s.stopping) return;
  api.stop(); s.stopping = true; api.render();
  say([h("b", {}, "Stopped"), ` by ${how}. The install has to be started again.`]);
  api.after(1000, () => {
    s.run = false; s.stopping = false; s.ended = true; s.res = !s.open; api.render();
    api.after(B6T7_RES_MS, () => { s.res = false; api.render(); });
  });
}
function b6t7Again(s, api, say) {
  api.stop(); Object.assign(s, { run: true, stopping: false, ended: false, res: false, box: false }); api.render(s.open ? "cancel" : null);
  say(["The install is running again."]);
}

/* call two: the Ollama tab, Update AI & models */
function b6t7UpdatePanel(variant) {
  return b6t2Shell({
    tab: 1, height: 360, start: "update",
    state: { run: false, stopping: false, ended: null, box: false },
    build: (s, api) => ({
      body: b6t2OllamaBody(s, api, {
        card: s.run ? b6t2UpdateCard(s, B6T2_AWAKE, { onCancel: () => b6t2CancelUpdate(s, api) }) : null,
        onUpdate: () => { if (variant === "A") { s.box = true; api.render("box-safe"); } else b6t2StartUpdate(s, api); },
      }),
      box: s.box ? b6t2Box({
        title: "Update Ollama?",
        body: ["Downloads about 1.5 GB for Ollama, then updates your installed models."],
        action: "Update",
        onAction: () => { s.box = false; b6t2StartUpdate(s, api); },
        onSafe: () => { s.box = false; api.render("update"); },
      }) : null,
      onB: () => { s.box = false; api.render("update"); },
      fallback: s.run ? "cancel" : "update",
    }),
    onX: (e, s, api) => { if (s.run && !s.box) { e.preventDefault(); b6t2CancelUpdate(s, api); } },
  });
}

TABS.push({
  id: "t7", n: 7, name: "Big presses", stars: 1,
  title: "Presses that start or stop something big",
  today: [
    "On every tab except the main one, pressing X stops a running download at once, wherever the white ring is. That includes the voice engine build, which can take about 15 minutes.",
    "The download card and the bar show a small X beside Cancel to say so.",
    "On the Ollama tab, Update AI & models starts at one press. A box used to ask first; it was taken away on purpose on 10 October. Since 17 November, Cancel stops an update while it downloads.",
    "Your rule from today: a Cancel is a kill switch and reacts at the press.",
  ],
  deciding: [
    "Call one, the X button: should X stop a job from anywhere (Today), only while the ring is on Cancel (A), only after asking (B), or never (C, drawn from your note)?",
    "Call two, Update: should it start at one press (Today), or ask first (A)? You picked A.",
  ],
  howto: "Tap a panel, then use the pad at the bottom of the page (or a keyboard: arrow keys, Enter for A, Esc for B, X for X). In call one the install is already running and the ring starts on a line far from it. Press X there and read the line under the panel: it says what your press did. Then move Down to the bar's Cancel and press X or A. A on Voice input opens it, and the card takes the bar's place. In call two, press A on Update AI & models; Cancel works after half a second. The words in the new boxes are drafts.",
  options: [
    { id: "today", label: "Today", today: true, group: "x", groupTitle: "Call one: X while a long job runs", title: "Today: X stops it from anywhere", desc: "One X anywhere on the tab, even with the ring on a section far away, stops the install at once. Fast, and it matches the kill-switch rule; an X pressed by habit or by mistake stops the build, and the install has to be started again.", build: () => b6t7XPanel("today") },
    { id: "A", label: "A", group: "x", title: "X stops it only from the card or the bar", desc: "X does nothing until the ring is on the card's Cancel or the bar's Cancel; from there X or A stops it at once. A stray X costs nothing; stopping from far away takes a few D-pad presses first.", build: () => b6t7XPanel("A") },
    { id: "B", label: "B", group: "x", title: "X anywhere asks first, for long jobs only", desc: "X opens a small box (draft words) with the ring on Keep going, so a stray X changes nothing; Left and A stop it. A on Cancel itself still stops at once. Short downloads such as the library would stop at once, as today. This puts a question in front of X, against the rule that Cancel reacts at the press; only X would ask.", build: () => b6t7XPanel("B") },
    { id: "C", label: "C", group: "x", title: "X stops nothing; only A on Cancel stops", desc: "Drawn from your note, “I don't want x to stop anything”. X does nothing on any tab, wherever the ring is. To stop a job you move the ring to Cancel, on the card or on the bar, and press A. The small X beside Cancel goes away. A stray X can never stop a download; stopping always takes a move to Cancel first. The same would hold for the bar on the main screen (tab 6).", build: () => b6t7XPanel("C") },
    { id: "uToday", label: "Today", today: true, group: "u", groupTitle: "Call two: Update AI & models", title: "Today: one press starts it, Cancel undoes it", desc: "A on Update swaps the buttons for the card at once, with the ring on its Cancel. One press to start; a press by mistake is undone with one more A (after half a second).", build: () => b6t7UpdatePanel("today") },
    { id: "uA", label: "A", group: "u", title: "Ask first: “Update Ollama?”", desc: "A box asks first and says the size, about 1.5 GB for Ollama (draft words). The ring starts on Cancel, so starting takes three presses: A, Left, A. This brings back the box that was taken away on 10 October.", build: () => b6t7UpdatePanel("A") },
  ],
});
