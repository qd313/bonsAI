/* ============================================================
   Tab 5: the Ollama tab's "AI models" takes A, Down, A to open.
   Drawn from the plugin's code on 2026-11-19:
     the five sections and their order     src/features/ai-connection/ollamaTabFolds.ts:27-33
     the four summaries                    ollamaTabFolds.ts:67-85 with sectionSummary.ts (" · ", 3+ switches counted)
     the button's words                    OllamaTab.tsx:411 with modelPolicy.ts:57-61 (the default level)
     the line's moves (Down, Up, Right, A) src/features/folded-tabs/FoldedSection.tsx:13-18,159-209
     Open all and Up from it               src/features/folded-tabs/FoldAllButton.tsx:12-21,51-52
     the box's title                       src/features/models/OllamaModelsHubModal.tsx:313
   Drawn state: the defaults (Run AI on this Deck on, Start with the Deck on, the library on, Balanced,
   Thinking Off, Custom timeouts off, Keep models loaded 5m, "Open source only (recommended)"). The first
   four sections are drawn shut so the drawing stays short; on the Deck the first one opens by itself.
     today  A opens the section, Down reaches the button, A opens the box
     A      A on the line opens the box at once; the line no longer folds
     B      a plain button row under Connection tuning, no section line
   Redrawn the same day after the maintainer wrote "This one doesn't work": a tap opened an empty grey box
   that only the Esc key could close, and the count read "0 presses". Now the ring starts on AI models, a tap
   counts as a press, the box says what it is and has a Close button, and "Show me" plays the presses.
   Every name here starts with b6t5 so it cannot clash with another tab's file.
   ============================================================ */

const B6T5_SECTIONS = [
  ["Where AI runs", "Run AI on this Deck on · Start the AI with the Deck on"],
  ["Knowledge base (offline)", "Use local knowledge base on"],
  ["Reply style", "Balanced · Thinking: Off"],
  ["Connection tuning", "Custom timeouts off · Keep models loaded: 5m"],
];
const B6T5_BUTTON = "AI models… — Open source only (recommended)";
const B6T5_LEVEL = "Open source only (recommended)";
/* what "Show me" presses, and what each press does, for the line under the panel */
const B6T5_STEPS = {
  today: [["A", "A: the section opens."], ["Down", "Down: the ring moves to the button."], ["A", "A: the box opens."]],
  A: [["A", "A: the box opens."]],
  B: [["A", "A: the box opens."]],
};
const B6T5_STEP_MS = 900;

function b6t5Line(title, summary, chevron, cls = "") {
  return h("button", { class: "k-fold " + cls, "data-stop": "" },
    h("span", { class: "k-ft" }, title), h("span", { class: "k-fs" }, summary), h("span", { class: "k-fc" }, chevron));
}

/* One panel. `variant` is "today", "A" or "B". `onCount` hears the press count and when the box opened. */
function b6t5Panel(variant, onCount) {
  const holder = h("div", { style: "display:contents" });
  const root = deckFrame({ body: holder, header: false });
  root.classList.add("dt", "b6t5");
  const sc = h("div", { class: "dt-scroll scroll" });
  const allBtn = h("button", { class: "b6t5-all", "data-stop": "" }, h("span", { class: "b6t5-alli" }, "⊞"), "Open all");
  const dock = h("div", { class: "b6t5-dock" }, allBtn);
  const closeBtn = h("button", { class: "b6t5-close", type: "button" }, "Close");
  const box = h("div", { class: "b6t5-box", hidden: true },
    h("div", { class: "b6t5-boxin" }, h("div", { class: "b6t5-boxt" }, "AI models"),
      h("div", { class: "b6t5-boxl" }, "Licence level: ", h("b", {}, B6T5_LEVEL)),
      h("div", { class: "b6t5-boxn" }, "This is the AI models box. Its rows are not drawn here; the box is the same in all three choices."),
      closeBtn));

  let aiOpen = false;   // today only: is the AI models section open
  let presses = 0, openedAt = null, opener = null;
  const timers = [];
  const tell = (said) => onCount && onCount(presses, openedAt, said);
  /* a tap or a mouse click straight on a stop counts as one press, like A with the ring there */
  const tap = (e) => { if (e && e.isTrusted && openedAt === null) presses++; };

  const openBox = (from) => {
    opener = from; box.hidden = false;
    if (openedAt === null) openedAt = presses;
    closeBtn.setAttribute("data-stop", "");
    Deck.setRing(root, closeBtn, { scroll: false });
    tell();
  };
  const closeBox = () => {
    box.hidden = true;
    closeBtn.removeAttribute("data-stop");
    Deck.setRing(root, opener && root.contains(opener) ? opener : $("[data-ai], [data-btn]", sc));
  };
  closeBtn.addEventListener("click", closeBox);

  const startKey = variant === "B" ? "btn" : "ai";
  const draw = (ringOn) => {
    sc.replaceChildren();
    B6T5_SECTIONS.forEach(([t, s]) => sc.append(b6t5Line(t, s, "▸")));
    if (variant === "today") {
      const line = b6t5Line("AI models", "", aiOpen ? "▾" : "▸", aiOpen ? "open" : "");
      line.dataset.ai = "";
      line.addEventListener("click", (e) => { tap(e); aiOpen = !aiOpen; draw("ai"); tell(); });
      sc.append(line);
      if (aiOpen) {
        const btn = h("button", { class: "k-btn", "data-stop": "" }, B6T5_BUTTON);
        btn.dataset.btn = "";
        btn.addEventListener("click", (e) => { tap(e); openBox(btn); });
        sc.append(h("div", { class: "k-foldbody" }, btn));
      }
    } else if (variant === "A") {
      const line = b6t5Line("AI models", B6T5_LEVEL, "›", "b6t5-door");
      line.dataset.ai = "";
      line.addEventListener("click", (e) => { tap(e); openBox(line); });
      sc.append(line);
    } else {
      const btn = h("button", { class: "k-btn", "data-stop": "" }, B6T5_BUTTON);
      btn.dataset.btn = "";
      btn.addEventListener("click", (e) => { tap(e); openBox(btn); });
      sc.append(h("div", { class: "b6t5-plain" }, btn));
    }
    const start = $(`[data-${startKey}]`, sc);
    if (start) start.setAttribute("data-start", "");
    if (ringOn) Deck.setRing(root, $(`[data-${ringOn}]`, sc));
  };
  draw(startKey);
  holder.append(tabBar2(1), h("div", { class: "k2-gap" }), sc, dock, box);

  let lastLine = null;
  root.addEventListener("ringmove", (e) => { if (e.detail.el.matches(".k-fold")) lastLine = e.detail.el; });
  root.addEventListener("deckkey", (e) => {
    const k = e.detail.key, cur = e.detail.stop;
    if (openedAt === null) { presses++; tell(); }
    // the box takes every press: A on Close or B closes it, and the ring goes back to what opened it
    if (!box.hidden) { e.preventDefault(); if (k === "B" || k === "A") closeBox(); return; }
    if (!cur) return;
    // Right from any section line: the floating Open all button
    if (k === "Right" && cur.matches(".k-fold")) { e.preventDefault(); Deck.setRing(root, allBtn, { scroll: false }); return; }
    if (cur === allBtn) {
      // A would open or close every section; this drawing does not draw the other sections' rows
      if (k === "A" || k === "Right" || k === "Down") { e.preventDefault(); return; }
      // Left or B: back to the line it came from (Up keeps the kit's order: the last stop above)
      if (k === "Left" || k === "B") { e.preventDefault(); Deck.setRing(root, lastLine || $(".k-fold", sc)); }
    }
  });

  root.scroller = sc;
  root.reset = () => {
    while (timers.length) clearTimeout(timers.pop());
    aiOpen = false; presses = 0; openedAt = null; box.hidden = true; closeBtn.removeAttribute("data-stop");
    draw(startKey); tell();
  };
  /* Show me: start again, then press what it takes, one press at a time, saying what each press did */
  root.play = () => {
    root.reset();
    Deck.activate(root);
    const done = [];
    B6T5_STEPS[variant].forEach(([k, words], i) => timers.push(setTimeout(() => { Deck.press(root, k); done.push(words); tell(done.join(" ")); }, B6T5_STEP_MS * (i + 1))));
  };
  return root;
}

/* A card: the panel, then Show me, the press count and Start again under it */
function b6t5Card(variant) {
  return () => {
    const out = h("p", { class: "b6t5-count" });
    let panel;
    const paint = (n, at, said) => {
      const show = h("button", { type: "button", class: "b6t5-show", onclick: () => panel.play() }, "▶ Show me");
      const again = h("button", { type: "button", onclick: () => panel.reset() }, "Start again");
      out.replaceChildren(show,
        h("span", {}, at === null ? "Presses so far: " : "The box opened after ", h("b", {}, String(at === null ? n : at)), at === null ? "" : (at === 1 ? " press" : " presses")),
        again,
        said ? h("span", { class: "b6t5-said" }, said) : "");
    };
    panel = b6t5Panel(variant, paint);
    paint(0, null);
    return [panel, out];
  };
}

TABS.push({
  id: "t5", n: 5, name: "AI models: A, Down, A", stars: 1,
  title: "The Ollama tab: opening \"AI models\" takes A, Down, A",
  today: [
    "On the Ollama tab the last line is called AI models. It is a section, and the only thing inside it is one button.",
    "So opening the AI models box takes three presses: A opens the section, Down moves to the button, A presses it.",
  ],
  deciding: [
    "Should one press be enough? If yes, which way: the line itself opens the box (A), or the line goes and a plain button takes its place (B).",
    "If you like it as it is, pick Today. The other four lines do not change in any choice.",
  ],
  howto: "The easy way: press Show me under each panel and watch. To try it yourself, tap a panel, then use the pad at the bottom of the page (or a keyboard: arrow keys, Enter for A, Esc for B). You can also tap the AI models line or the button directly. The white ring starts on AI models. The count under each panel says how many presses it took to open the box. Close shuts the box again. The four lines above are drawn shut to keep the drawing short.",
  options: [
    { id: "today", label: "Today", today: true, title: "Today: three presses (A, Down, A)",
      desc: "A opens the section. Down moves the ring to the one button inside. A opens the box. The AI models line shows nothing beside its name, so you cannot see the licence level until the box is open.",
      build: b6t5Card("today") },
    { id: "A", label: "A", title: "One press: the line itself opens the box",
      desc: "A on the AI models line opens the box at once. The line shows the licence level beside its name, with an arrow in place of the fold mark. It looks like the other lines but does not fold open, so it is the one line on the tab that acts differently, and Open all leaves it alone.",
      build: b6t5Card("A") },
    { id: "B", label: "B", title: "One press: a plain button, no line",
      desc: "The AI models line goes away. Its button sits by itself under Connection tuning, always in sight, and A on it opens the box. The tab then has four lines in place of five, and Up from Open all lands on the button.",
      build: b6t5Card("B") },
  ],
});
