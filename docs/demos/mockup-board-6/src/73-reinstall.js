/* ============================================================
   Board 6, tab 3: Reinstall on a voice engine that is already there (plan 107), and the knowledge library's
   "done" line after the screen reloads. Uses tab 2's shared pieces (b6t2Shell, b6t2Card, b6t2Box, b6t2VoiceBody).
   The box's lines are the download notice's own sentence; the card's lines are the voice install job's own.
   Words an option proposes (A's line, B's model size, the library's "ready" line) are new and say so.
   All names here start with b6t3.
   ============================================================ */
const B6T3_ENGINE_LINE = "bonsAI will connect to https://ghcr.io to download the voice engine's build image, which then fetches its compilers from archive.ubuntu.com and security.ubuntu.com, and the sites they hand off to (about 500 MB).";
const b6t3ModelLine = (size) => `bonsAI will connect to https://huggingface.co to download the base.en speech model (${size}).`;
const B6T3_ONCE = "Shown once per site. After that, the size shows on the button.";
const B6T3_FAR = "This part has no percentage. It can take a few minutes.";

/* the voice install's steps. Today (and A's never) on a ready engine: it checks, finds both there, and ends.
   B: it really fetches, builds and downloads (sped up here: the real build takes minutes). */
const B6T3_QUICK = [[1300, { l1: "Fetching the build image", l2: B6T2_AWAKE, frac: null }], [1300, { l1: "Getting the speech model ready", l2: B6T2_AWAKE, frac: null }], [700, { l1: "Finishing up", l2: B6T2_AWAKE, frac: 1 }]];
function b6t3FullSteps() {
  const out = [[1500, { l1: "Fetching the build image", l2: B6T2_AWAKE, frac: null }], [2500, { l1: "Building the voice engine", l2: B6T3_FAR, frac: null }]];
  for (let p = 0; p <= 100; p += 10) out.push([300, { l1: "Downloading the base.en speech model", l2: `${Math.round(148 * p / 100)} of 148 MB`, frac: p / 100 }]);
  out.push([700, { l1: "Checking the file", l2: B6T2_AWAKE, frac: 1 }]);
  return out;
}

/* one panel: the Settings tab, "Voice input" open, the engine and the model both installed */
function b6t3VoicePanel(variant) {
  return b6t2Shell({
    tab: 2, height: 454, start: "reinstall",
    state: { phase: "idle", face: null, stopping: false, under: null },
    build: (s, api) => {
      const run = (steps, sites) => {
        api.stop(); s.phase = "run"; s.stopping = false; s.sites = sites; s.at = Date.now();
        let t = 0;
        steps.forEach(([ms, face], i) => { api.after(t, () => { s.face = face; api.render(i ? null : "cancel"); }); t += ms; });
        api.after(t, () => { s.phase = "idle"; s.face = null; api.render("reinstall"); api.toast("Voice engine ready", "Voice input is set up and ready to use.", 3200); });
      };
      const cancel = () => {
        if (s.stopping || Date.now() - s.at < 500) return;
        api.stop(); s.stopping = true; api.render();
        api.after(1000, () => { s.phase = "idle"; s.stopping = false; s.face = null; s.under = "cancelled"; api.render("reinstall"); });
      };
      const press = () => {
        s.under = null;
        if (variant === "A") { s.under = "already"; api.render("reinstall"); return; }
        s.phase = "box"; api.render("box-safe");
      };
      const button = b6t2Btn("Reinstall voice engine", "reinstall", "glass", variant === "C" ? null : press, variant === "C" ? { disabled: true } : null);
      const under = [];
      if (s.under === "already") under.push(h("div", { class: "b6t3-new plain" }, "Already installed: nothing to download."));
      if (s.under === "cancelled") under.push(h("div", { class: "b6t2-z1" }, "Install cancelled. Press Install voice engine to start again."));
      const card = s.phase === "run" && s.face ? b6t2Card(Object.assign({ title: s.stopping ? "Stopping the install" : "Voice engine install", stopping: s.stopping, sites: s.sites, onCancel: cancel }, s.face)) : null;
      const box = s.phase === "box" ? b6t2Box({
        title: "Download from the internet?",
        body: [B6T3_ENGINE_LINE, b6t3ModelLine(variant === "B" ? "about 150 MB" : "size not known ahead of time"), B6T3_ONCE],
        lastPlain: true,
        action: "Download",
        onAction: () => (variant === "B" ? run(b6t3FullSteps(), B6T2_SITES.voice) : run(B6T3_QUICK, "From huggingface.co")),
        onSafe: () => { s.phase = "idle"; api.render("reinstall"); },
      }) : null;
      return {
        body: b6t2SettingsFolds(true, b6t2VoiceBody({ ready: true, card, button, under })),
        box, onB: () => { s.phase = "idle"; api.render("reinstall"); },
        fallback: card ? "cancel" : variant === "C" ? "base" : "reinstall",
      };
    },
    onX: (e, s, api) => { const c = $('[data-k="cancel"]', api.root); if (c && s.phase === "run") { e.preventDefault(); c.click(); } },
  });
}

/* ---------- the second call: the library's line after the screen reloads ---------- */
function b6t3LibPanel(variant) {
  const root = b6t2Shell({
    tab: 1, height: 330, start: "kbupdate",
    state: { phase: "idle", version: "2026.11.04", done: false, reloaded: false, face: null },
    build: (s, api) => {
      const update = () => {
        api.stop(); s.phase = "run"; s.done = false; s.reloaded = false; s.at = Date.now();
        s.face = { l1: "Looking up the newest library", l2: B6T2_AWAKE, frac: null }; api.render("kbcancel");
        let t = 900;
        for (let mb = 0; mb <= 210; mb += 30) { const m = mb; api.after(t, () => { s.face = { l1: "Downloading the knowledge library", l2: `${m} of 210 MB`, frac: m / 210 }; api.render(); }); t += 280; }
        api.after(t, () => { s.face = { l1: "Finishing up", l2: B6T2_AWAKE, frac: 1 }; api.render(); });
        api.after(t + 600, () => { s.phase = "idle"; s.done = true; s.version = "2026.11.10"; api.render("kbupdate"); });
      };
      const cancel = () => { if (Date.now() - s.at < 500) return; api.stop(); s.phase = "idle"; api.render("kbupdate"); };
      let doneText = "Library updated.";
      if (variant === "ready") doneText = "Library ready.";
      else if (variant === "today" && s.reloaded) doneText = "Library downloaded.";
      const run = s.phase === "run";
      const main = run
        ? b6t2Card(Object.assign({ title: "Updating the library", sites: B6T2_SITES.kb, key: "kbcancel", onCancel: cancel }, s.face))
        : h("div", { class: "b6t2-pair" }, b6t2Btn("Update knowledge base", "kbupdate", "glass big", update), b6t2Btn("Remove", "kbremove", "red small"));
      const lines = run ? null : h("div", { class: "b6t2-zone2" }, s.done ? h("div", { class: "b6t3-new" }, "✓ " + doneText) : null, h("div", { class: "b6t2-z3" }, B6T2_SITES.kb));
      return {
        body: [
          b6t2Fold("Where AI runs", "Run AI on this Deck on · Start the AI with the Deck on", false, "f0"),
          b6t2Fold("Knowledge base (offline)", "Use local knowledge base on", true, "f1"),
          b6t2Sw("Use local knowledge base", true, "kbsw"),
          h("div", { class: "b6t2-body" }, h("div", { class: "b6t2-info sm" }, h("span", { style: "color:#7dcea0;font-weight:600" }, "Installed"), ` — version ${s.version}`), main, lines),
          b6t2Fold("Reply style", "", false, "f2"),
          b6t2Fold("Connection tuning", "", false, "f3"),
          b6t2Fold("AI models", "", false, "f4"),
        ],
        fallback: run ? "kbcancel" : "kbupdate",
      };
    },
  });
  const ctl = b6t2Ctl("Then:", [["Reload the screen", () => { const a = root.b6; if (!a.s.done) return; a.s.reloaded = true; a.render(); }], ["Start over", () => { const a = root.b6; a.stop(); Object.assign(a.s, { phase: "idle", version: "2026.11.04", done: false, reloaded: false }); a.render(); }]]);
  return [root, ctl];
}

TABS.push({
  id: "t3", n: 3, name: "Reinstall voice", stars: 1,
  title: "Reinstall on a voice engine that is already there",
  today: [
    "With the voice engine and the speech model both installed, the button reads Reinstall voice engine.",
    "Pressing it shows the box that says what will be downloaded and from where, listing both the engine and the model (the first time each site is seen, or while internet downloads are off).",
    "Then nothing is downloaded: the install checks that both are there, the card shows for a few seconds, and “Voice engine ready” pops up. The box said something that did not happen.",
    "A second, smaller one: after the library updates, its line says “✓ Library updated.” After the screen reloads, it says “✓ Library downloaded.” instead, which is the wrong one of the two.",
  ],
  deciding: [
    "What Reinstall does when nothing is missing: say so in one line (A), really download it all again so the box is true (B), or be greyed out (C).",
    "For the library: one line that is true either way, or keep two lines and remember which one applies.",
  ],
  howto: "Click a panel, then use the arrow keys; Enter is A, Esc is B. In the voice panels, press A on Reinstall voice engine; in the box, the ring starts on Cancel, so press Left then A to download. In the library panels, press A on Update knowledge base, wait for it to finish, then click “Reload the screen” under the panel. B's install is sped up: the real build takes minutes. Model and library sizes on the cards are examples.",
  options: [
    { id: "today", label: "Today", today: true, group: "voice", title: "Today: the box, then nothing downloads", desc: "The box names the build image (about 500 MB) and the speech model. After Download, the card shows “Fetching the build image” and “Getting the speech model ready” for a few seconds, then “Voice engine ready”. Nothing came from the internet. The box only shows the first time each site is seen; after that Reinstall goes straight to the card.", build: () => b6t3VoicePanel("today") },
    { id: "A", label: "A", group: "voice", groupTitle: "Three ways to make it true", title: "Say it is already installed", desc: "No box and no card: one line appears under the button, “Already installed: nothing to download.” (new words). The ring stays on the button. Small to build. A broken engine that still looks installed could not be repaired from this button.", build: () => b6t3VoicePanel("A") },
    { id: "B", label: "B", group: "voice", title: "Really reinstall, so the box is true", desc: "Reinstall removes both and downloads them again: the build image (about 500 MB) and the base.en speech model (148 MB, shown as “about 150 MB”, new words), about 650 MB in all, plus the compilers the build fetches, whose size is not known. Then it rebuilds, which takes minutes. Useful to repair a broken engine; costly by mistake.", build: () => b6t3VoicePanel("B") },
    { id: "C", label: "C", group: "voice", title: "Greyed out while everything is installed", desc: "The button stays in place but cannot be pressed while the engine and the model are both there, and the D-pad passes over it (one fewer stop; drawn as skipped, to be checked on the Deck). Like A, there is no way to repair a broken engine from here.", build: () => b6t3VoicePanel("C") },
    { id: "kbToday", label: "Today", today: true, group: "kb", groupTitle: "The library's line after the screen reloads", title: "Today: the line can be the wrong one", desc: "After an update the line reads “✓ Library updated.” Reload the screen and the same finished update reads “✓ Library downloaded.”, because the plugin forgets which of the two it did.", build: () => b6t3LibPanel("today") },
    { id: "kbReady", label: "One line", group: "kb", title: "One line for both: “✓ Library ready.”", desc: "The same words after a first download and after an update, so they can never be wrong (new words). Words only; a little less telling.", build: () => b6t3LibPanel("ready") },
    { id: "kbRemember", label: "Remember", group: "kb", title: "Keep two lines and remember which applies", desc: "“✓ Library updated.” stays “updated” after a reload, because the plugin keeps a note of what it did. A small change to what is saved.", build: () => b6t3LibPanel("remember") },
  ],
});
