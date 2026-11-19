/* ============================================================
   Tab 5: the Ollama tab's "AI models" takes two presses.
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

function b6t5Line(title, summary, chevron, cls = "") {
  return h("button", { class: "k-fold " + cls, "data-stop": "" },
    h("span", { class: "k-ft" }, title), h("span", { class: "k-fs" }, summary), h("span", { class: "k-fc" }, chevron));
}

/* One panel. `variant` is "today", "A" or "B". `onCount` hears the press count and whether the box is open. */
function b6t5Panel(variant, onCount) {
  const holder = h("div", { style: "display:contents" });
  const root = deckFrame({ body: holder, header: false });
  root.classList.add("dt", "b6t5");
  const sc = h("div", { class: "dt-scroll scroll" });
  const allBtn = h("button", { class: "b6t5-all", "data-stop": "" }, h("span", { class: "b6t5-alli" }, "⊞"), "Open all");
  const dock = h("div", { class: "b6t5-dock" }, allBtn);
  const box = h("div", { class: "b6t5-box", hidden: true },
    h("div", { class: "b6t5-boxin" }, h("div", { class: "b6t5-boxt" }, "AI models"),
      h("div", { class: "b6t5-bar" }), h("div", { class: "b6t5-bar s" }), h("div", { class: "b6t5-bar" }), h("div", { class: "b6t5-bar s" })));

  let aiOpen = false;   // today only: is the AI models section open
  let presses = 0, openedAt = null, opener = null;
  const tell = () => onCount && onCount(presses, openedAt);

  const openBox = (from) => { opener = from; box.hidden = false; if (openedAt === null) openedAt = presses; tell(); };
  const closeBox = () => { box.hidden = true; if (opener) Deck.setRing(root, opener); };

  const draw = (ringOn) => {
    sc.replaceChildren();
    B6T5_SECTIONS.forEach(([t, s], i) => {
      const line = b6t5Line(t, s, "▸");
      if (i === 3) line.dataset.tuning = "";
      sc.append(line);
    });
    if (variant === "today") {
      const line = b6t5Line("AI models", "", aiOpen ? "▾" : "▸", aiOpen ? "open" : "");
      line.dataset.ai = "";
      line.addEventListener("click", () => { aiOpen = !aiOpen; draw("ai"); });
      sc.append(line);
      if (aiOpen) {
        const btn = h("button", { class: "k-btn", "data-stop": "" }, B6T5_BUTTON);
        btn.dataset.btn = "";
        btn.addEventListener("click", () => openBox(btn));
        sc.append(h("div", { class: "k-foldbody" }, btn));
      }
    } else if (variant === "A") {
      const line = b6t5Line("AI models", B6T5_LEVEL, "›", "b6t5-door");
      line.dataset.ai = "";
      line.addEventListener("click", () => openBox(line));
      sc.append(line);
    } else {
      const btn = h("button", { class: "k-btn", "data-stop": "" }, B6T5_BUTTON);
      btn.dataset.btn = "";
      btn.addEventListener("click", () => openBox(btn));
      sc.append(h("div", { class: "b6t5-plain" }, btn));
    }
    if (ringOn) Deck.setRing(root, $(`[data-${ringOn}]`, sc));
  };
  draw();
  holder.append(tabBar2(1), h("div", { class: "k2-gap" }), sc, dock, box);

  let lastLine = null;
  root.addEventListener("ringmove", (e) => { if (e.detail.el.matches(".k-fold")) lastLine = e.detail.el; });
  root.addEventListener("deckkey", (e) => {
    const k = e.detail.key, cur = e.detail.stop;
    if (openedAt === null) { presses++; tell(); }
    // the box takes every press; B closes it and the ring goes back to the control that opened it
    if (!box.hidden) { e.preventDefault(); if (k === "B") closeBox(); return; }
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

  const start = $("[data-tuning]", sc);
  start.classList.add("ring");
  start.setAttribute("data-start", "");
  root.scroller = sc;
  root.reset = () => { aiOpen = false; presses = 0; openedAt = null; box.hidden = true; draw("tuning"); tell(); };
  return root;
}

/* A card: the panel and the press counter under it */
function b6t5Card(variant) {
  return () => {
    const out = h("p", { class: "b6t5-count" });
    let panel;
    const paint = (n, at) => {
      const again = h("button", { type: "button", onclick: () => panel.reset() }, "Start again");
      out.replaceChildren(
        at === null ? "Presses so far:" : "The box opened after",
        h("b", {}, String(at === null ? n : at)),
        at === null ? "(the ring starts on Connection tuning)" : (at === 1 ? "press" : "presses"),
        again);
    };
    panel = b6t5Panel(variant, paint);
    paint(0, null);
    return [panel, out];
  };
}

TABS.push({
  id: "t5", n: 5, name: "AI models takes two presses", stars: 1,
  title: "The Ollama tab: \"AI models\" takes two presses to open",
  today: [
    "The last section of the Ollama tab is called AI models. Inside it there is only one button, which opens the AI models box.",
    "So you press A on the section line to open it, press Down to reach the button, then press A again to open the box.",
    "From the Open all button at the bottom, Up comes back to the AI models line.",
  ],
  deciding: [
    "Whether the AI models line should open the box straight away (A), or the line should go and leave a plain button (B), or it stays as it is.",
    "The other four sections are not changed by any option.",
  ],
  howto: "Click a panel, then use the arrow keys. The white ring starts on the Connection tuning line. Down walks the lines, Enter is A, Esc is B and closes the box. Right from a line jumps to Open all; Up from Open all comes back. Open all does not open the other sections in this drawing. The count under each panel shows how many presses it took to open the box. The first four sections are drawn shut to keep the drawing short.",
  options: [
    { id: "today", label: "Today", today: true, title: "As it is now: open the section, then press the button",
      desc: "From Connection tuning: Down, A, Down, A, so four presses. The AI models line has no value beside it, so you cannot see the licence level until you open it.",
      build: b6t5Card("today") },
    { id: "A", label: "A", title: "A on the line opens the box at once",
      desc: "The line looks like the other section lines, but A opens the box instead of folding open. The licence level shows on the line, with an arrow in place of the fold mark. Two presses from Connection tuning. One D-pad stop fewer. Open all and Close all no longer touch this line, so it is the one line on the tab that acts differently.",
      build: b6t5Card("A") },
    { id: "B", label: "B", title: "A plain button row, no section line",
      desc: "The AI models section goes; its button sits on its own under Connection tuning, always in sight. Two presses from Connection tuning. One D-pad stop fewer. The tab has four sections, and Up from Open all lands on the button.",
      build: b6t5Card("B") },
  ],
});
