/* ============================================================
   Tab 5: the Ollama tab's "AI models", moved under "Where AI runs", and that section's name.
   Third drawing, 2026-11-19 (late). The maintainer's note on the second one: "None of these, put it under
   Where AI runs and let's think of a slightly more fitting name for that section".
   Drawn from the plugin's code:
     the five sections and their order      src/features/ai-connection/ollamaTabFolds.ts:27-33
     the summaries                          ollamaTabFolds.ts:67-85
     "Where AI runs", open                  OllamaWhereAiRunsSection.tsx:565-834 (two switches, the setup block or
                                            the PC address row, the connection line)
     Update AI & models, Browse models      OllamaLocalSetupBlock.tsx:76-98,168-213 (drawn only with the AI on this Deck)
     the connection line (AI on this Deck)  OllamaConnectionLine.tsx:30-105 (44 px, a dot, two lines, a refresh arrow)
     PC address, Test connection, Find LAN  OllamaWhereAiRunsSection.tsx:686-832
     the fifth section's one button         OllamaTab.tsx:371-417 ("AI models… — <licence level>")
     the licence level's words              src/features/models/modelPolicy.ts:57-61
     the box's title                        src/features/models/OllamaModelsHubModal.tsx:313
   A fact the drawing rests on: "Browse models" and the fifth section's button open the same box at the same
   place (OllamaModelsHubModal.tsx:123, initialSection defaults to "browse"). With the AI on a PC, Browse models
   is not drawn and the fifth section is the only way in (OllamaTab.tsx:386-390). So the wish becomes: one
   "AI models" button inside the first section, in both states, in Browse models' place; the fifth line goes.
   The panel engine, the section lines, the switches and the buttons are tab 2's (72-card.js).
   Every name here starts with b6t5 so it cannot clash with another tab's file.
   ============================================================ */

const B6T5_LEVEL = "Open source only (recommended)";
const B6T5_OLD_BUTTON = "AI models… — " + B6T5_LEVEL;
const B6T5_STEP_MS = 450;
const B6T5_SUM = { on: "Run AI on this Deck on · Start the AI with the Deck on", off: "Run AI on this Deck off · Start the AI with the Deck on" };

/* the connection line with the AI on this Deck: one 44 px button that is also the status */
function b6t5Conn() {
  return h("button", { class: "b6t5-conn", "data-stop": "", "data-k": "conn" },
    h("span", { class: "b6t5-dot" }),
    h("span", { class: "b6t5-ct" }, h("span", { class: "b6t5-c1" }, "Connected to this Deck's AI"), h("span", { class: "b6t5-c2" }, "Ollama v0.34.1 · 7 models · 127.0.0.1:11434")),
    h("span", { class: "b6t5-re" }, "↻"));
}
/* the one door into the box, as drawn for the wish: its name on the left, the licence level and an arrow on the right */
function b6t5ModelsBtn(onOpen) {
  return b6t2Btn([h("span", { class: "b6t5-mn" }, "AI models"), h("span", { class: "b6t5-lv" }, B6T5_LEVEL), h("span", { class: "b6t5-ar" }, "›")], "models", "alt b6t5-models", onOpen);
}

/* One panel. `name` is the first section's name; `today` draws the tab as it is now. `hear` gets the count. */
function b6t5Panel(name, today, hear) {
  let presses = 0, openedAt = null;
  const timers = [];
  const tell = (said) => hear && hear(presses, openedAt, said);
  const root = b6t2Shell({
    tab: 1, start: "f0", state: { deck: true, box: false, old: false, from: "models" },
    build(s, api) {
      const open = (from) => (e) => {
        if (e && e.isTrusted && openedAt === null) presses++; // a tap straight on the button counts as one press
        if (openedAt === null) openedAt = presses;
        s.from = from; s.box = true; api.render(); tell();
      };
      const close = () => { s.box = false; api.render(s.from); };
      const flip = () => { s.deck = !s.deck; s.old = false; api.render("sw1"); tell(s.deck ? "Now drawn with the AI on this Deck." : "Now drawn with the AI on a PC."); };
      const door = today ? null : b6t5ModelsBtn(open("models"));
      const inside = s.deck
        ? [h("div", { class: "b6t2-lbl" }, "Local Ollama setup", h("span", {}, "Installed: 7")),
           b6t2Btn("Update AI & models", "update", ""),
           today ? b6t2Btn([h("span", {}, "Browse models"), h("span", { style: "color:#9ce7ff" }, "›")], "browse", "alt", open("browse")) : door,
           h("div", { class: "b6t2-zone2" }, h("div", { class: "b6t2-z2" }, B6T2_IDLE), h("div", { class: "b6t2-z3" }, B6T2_SITES.ollama)),
           b6t5Conn()]
        : [b6t2Btn("Save current PC address as quick host", "save", "alt b6t5-ctr"),
           h("div", { class: "b6t5-addr" },
             h("div", { class: "b6t5-addrbox" }, h("div", { class: "b6t5-cap" }, "PC address"),
               h("button", { class: "b6t5-field", "data-stop": "", "data-k": "addr" }, "192.168.1.20"),
               h("div", { class: "b6t2-z3" }, "Just the PC's address, for example 192.168.1.20. bonsAI adds Ollama's usual port (11434) when you leave it out.")),
             h("button", { class: "b6t5-test", "data-stop": "", "data-row": "b6t5-addr", "data-k": "test" }, "Test connection"),
             h("button", { class: "b6t5-lan", "data-stop": "", "data-row": "b6t5-addr", "data-k": "lan" }, "Find LAN")),
           h("div", { class: "b6t2-z3" }, "This Deck's IP: ", h("span", { style: "color:#8fa0b4" }, "192.168.1.37")),
           h("div", { class: "b6t5-ok" }, "Connected · Ollama v0.34.1 · 7 models"),
           door];
      const body = [
        b6t2Fold(name, s.deck ? B6T5_SUM.on : B6T5_SUM.off, true, "f0"),
        b6t2Sw("Run AI on this Deck", s.deck, "sw1", flip),
        b6t2Sw("Start the AI with the Deck", true, "sw2"),
        h("div", { class: "b6t2-body" }, ...inside.filter(Boolean)),
        b6t2Fold("Knowledge base (offline)", "Use local knowledge base on", false, "f1"),
        b6t2Fold("Reply style", "Balanced · Thinking: Off", false, "f2"),
        b6t2Fold("Connection tuning", "Custom timeouts off · Keep models loaded: 5m", false, "f3"),
      ];
      if (today) {
        body.push(b6t2Fold("AI models", "", s.old, "f4", () => { s.old = !s.old; api.render("f4"); }));
        if (s.old) body.push(h("div", { class: "k-foldbody" }, h("button", { class: "k-btn", "data-stop": "", "data-k": "oldbtn", onclick: open("oldbtn") }, B6T5_OLD_BUTTON)));
      }
      const box = !s.box ? null : h("div", { class: "b6t2-scrim" }, h("div", { class: "b6t5-boxin" },
        h("div", { class: "b6t5-boxt" }, "AI models"),
        h("div", { class: "b6t5-boxl" }, "Licence level: ", h("b", {}, B6T5_LEVEL)),
        h("div", { class: "b6t5-boxn" }, "This is the AI models box. Its rows are not drawn here; the box itself does not change."),
        h("button", { class: "b6t5-close", type: "button", "data-stop": "", "data-k": "box-safe", onclick: close }, "Close")));
      return { body, box, fallback: today ? "f4" : "models", onB: close };
    },
  });
  root.classList.add("b6t5");
  const api = root.b6;
  root.addEventListener("deckkey", () => { if (openedAt === null && !api.s.box) { presses++; tell(); } });
  root.reset = (deck = true) => {
    while (timers.length) clearTimeout(timers.pop());
    presses = 0; openedAt = null;
    Object.assign(api.s, { deck, box: false, old: false });
    api.render("f0");
    const sc = root.querySelector(".b6t2-sc"); if (sc) sc.scrollTop = 0;
    tell();
  };
  /* Show me: start at the top of the tab, then press what it takes, one press at a time */
  root.play = () => {
    root.reset(true);
    Deck.activate(root);
    const keys = today ? [...Array(9).fill("Down"), "A", "Down", "A"] : [...Array(4).fill("Down"), "A"];
    keys.forEach((k, i) => timers.push(setTimeout(() => {
      Deck.press(root, k);
      const last = i === keys.length - 1;
      tell(last ? (today ? "Nine Downs to reach the AI models line, then A, Down, A." : "Four Downs to reach AI models, then A.") : `Pressing ${k}…`);
    }, B6T5_STEP_MS * (i + 1))));
  };
  return root;
}

/* A card: the panel, then Show me, the press count, Start again, and the two states to draw */
function b6t5Card(name, today) {
  return () => {
    const out = h("p", { class: "b6t5-count" });
    let panel;
    const paint = (n, at, said) => {
      out.replaceChildren(
        h("button", { type: "button", class: "b6t5-show", onclick: () => panel.play() }, "▶ Show me"),
        h("span", {}, at === null ? "Presses from the top of the tab: " : "The box opened after ", h("b", {}, String(at === null ? n : at)), at === null ? "" : (at === 1 ? " press" : " presses")),
        h("button", { type: "button", onclick: () => panel.reset(true) }, "Start again"),
        h("button", { type: "button", onclick: () => panel.reset(false) }, "Draw it with the AI on a PC"),
        said ? h("span", { class: "b6t5-said" }, said) : "");
    };
    panel = b6t5Panel(name, today, paint);
    paint(0, null);
    return [panel, out];
  };
}

TABS.push({
  id: "t5", n: 5, name: "AI models, under Where AI runs", stars: 1,
  title: "The Ollama tab: AI models moves under “Where AI runs”. What should that section be called?",
  today: [
    "On the Ollama tab the last line is AI models. It is a section with one button inside. From the top of the tab it takes twelve presses to open the box.",
    "The first section, Where AI runs, already has a way into the same box: Browse models. But only when the AI runs on this Deck. With the AI on a PC that button is not there.",
  ],
  deciding: [
    "You wrote: “None of these, put it under Where AI runs and let's think of a slightly more fitting name for that section.” That is drawn below. The AI models line is gone. The first section holds one AI models button, in the place of Browse models, because both opened the same box. It is there with the AI on a PC as well.",
    "What is left to pick is the section's name. Four are drawn. If you have a better one, write it in the note box.",
  ],
  howto: "The easy way: press Show me under a panel and watch. To try it yourself, tap a panel, then use the pad at the bottom of the page (or a keyboard: arrow keys, Enter for A, Esc for B). You can also tap the AI models button directly. The white ring starts on the first line. Tap the first switch, or the button under the panel, to see the section with the AI on a PC. The box that opens is a stand-in: Close shuts it. The other three lines are drawn shut and do not open here.",
  options: [
    { id: "today", label: "Today", today: true, title: "Today: a fifth line with one button in it",
      desc: "For comparison. AI models is the last line. Show me walks the whole way: nine Downs, A, Down, A. Browse models, in the first section, opens the same box in five presses, but only with the AI on this Deck.",
      build: b6t5Card("Where AI runs", true) },
    { id: "n-models", label: "Name 1", title: "“AI & models”",
      desc: "Short, and it uses words the section already has: its first button reads Update AI & models. Five presses from the top of the tab. Messages elsewhere that say “Ollama → Where AI runs” would change to the new name.",
      build: b6t5Card("AI & models", false) },
    { id: "n-setup", label: "Name 2", title: "“AI setup”",
      desc: "Says what you do here: choose where the AI runs, install or update it, and pick its models. The shortest of the four, so the summary beside it keeps the most room.",
      build: b6t5Card("AI setup", false) },
    { id: "n-where", label: "Name 3", title: "“Where AI runs & models”",
      desc: "The old name with the new part added. It is the closest to today, and the longest: look at how little room it leaves for the summary beside it.",
      build: b6t5Card("Where AI runs & models", false) },
    { id: "n-keep", label: "Name 4", title: "Keep “Where AI runs”",
      desc: "Only the button moves; the name stays. Nothing else in the plugin has to be reworded. The name then says less than the section holds.",
      build: b6t5Card("Where AI runs", false) },
  ],
});
