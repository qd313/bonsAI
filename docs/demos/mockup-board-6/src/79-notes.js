/* ============================================================
   Tab 9: three calls about words, not layout.
   Call one: should the AI also be told when a game has no notes?
     The real answer is quoted whole from the workshop's measurement file
     archive/research/kb-answer-eval-2026-11-16-p104-after-run1.md, case A-NOCARD-01 (sample 1), measured on
     plan 104's final build, where the AI is not told. No saved answer from the build that told the AI was
     found (the commit that told it, 0bbb683d0, was dropped; its helper copy holds no answer file), so that
     side shows the numbers only. Numbers: plan 104 section 12 and the knowledge-base roadmap ("10 against 11 of 24").
   Call two: the honest answer's Speed-mode option. Numbers from the workshop's files
     kb-answer-eval-2026-11-15-p104-h1-sp-base-s0/-s1000, -sp-honest-s0/-s1000, -sp-honest-left-s0/-s1000
     (nine Speed questions no note can answer, two runs each: 18 answers per setup).
   Call three: the starter-models box with Internet downloads off.
     src/features/downloads/downloadNotice.tsx:280-329 (title, pinned site lines, closing paragraph, buttons),
     downloadSites.ts:53-87 and downloadSizes.ts:28-56 (sites and sizes), src/features/models/localOllamaStarterSet.tsx:
     58-68 and 98-139 (the words; Browse models' "Install the starter set", nothing left out, Ollama already there),
     OllamaWhereAiRunsSection.constants.tsx:27-35, and src/shared/TwoButtonConfirmModal.tsx:122-135,298-322
     (240-point words box, the "More below" row, 64-point steps, the ring on Cancel).
   Every name here starts with b6t9 so it cannot clash with another tab's file.
   ============================================================ */

/* ---------- call one ---------- */
function b6t9Answer() {
  const holder = h("div", { style: "display:contents" });
  const root = deckFrame({ body: holder, header: false, height: 300 });
  root.classList.add("dt", "b6t9");
  const sc = h("div", { class: "scroll b6t9-chat" },
    qBubble2("how do i beat margit", { stop: false }),
    aBubble2([
      h("p", {}, "I'm keeping the specific steps for beating ", h("span", { class: "b6t9-spoil" }, "Margit"),
        " out of the guide for now, but generally, when facing a tough encounter like that, focus on managing your positioning and exploiting any weaknesses you notice. Pay close attention to the attack patterns and try to keep your distance or use defensive abilities effectively."),
    ], { stopEach: false }),
    h("div", { class: "b6t9-foot" }, "No notes for this game — this answer is from the model's own knowledge."));
  holder.append(tabBar2(0), h("div", { class: "k2-gap" }), sc);
  const src = h("p", { class: "b6t9-src" }, "A real answer, quoted whole: ELDEN RING, Strategy mode, from plan 104's final measurement (16 November). The greyed word is hidden behind a spoiler tap. The menu of choices under a Strategy answer is left out.");
  return [root, src];
}
function b6t9NoAnswer() {
  return h("div", { class: "b6t9-none" },
    h("b", {}, "No saved answer from this setup."), " The version that told the AI was built and measured, then taken out before it landed, and its answers were not kept. Only its count survives: ",
    h("b", {}, "of 24 answers to questions no note could answer, 10 said they did not know in one setup and 11 in the other."),
    " The record does not say which number is which. Either way it is one answer in 24: too close to call.");
}

/* ---------- call two ---------- */
function b6t9SpeedTable() {
  const row = (name, real, said) => h("tr", {}, h("td", {}, name), h("td", { class: "n" }, real), h("td", { class: "n" }, said));
  return h("div", { class: "b6t9-calls" },
    h("h4", {}, "Call two, the test numbers (you can skip this call)"),
    "We asked nine Speed-mode questions about things that are not in the game, twice in each setup (18 answers). A good answer says it does not know.",
    h("table", { class: "b6t9-tbl" },
      h("thead", {}, h("tr", {}, h("th", {}, "Setup"), h("th", {}, "Wrote about it as if real"), h("th", {}, "Said it did not know"))),
      h("tbody", {},
        row("Switch off (today)", "8 of 18", "7 of 18"),
        row("Switch on", "9 of 18", "7 of 18"),
        row("Switch on, loosely matching notes left out", "9 of 18", "7 of 18"))),
    "One answer more or less is chance. The switch changes nothing a player would notice; an earlier test said the same.");
}

/* ---------- call three ---------- */
const B6T9_SITES = [
  "bonsAI will connect to https://registry.ollama.ai to download gemma4:e2b-it-qat, nomic-embed-text (about 4.6 GB).",
  "bonsAI will connect to https://huggingface.co to download the tiny.en and base.en speech models (about 230 MB).",
  "bonsAI will connect to https://ghcr.io to download the voice engine's build image, which then fetches its compilers from archive.ubuntu.com and security.ubuntu.com, and the sites they hand off to (about 500 MB).",
];
const B6T9_CLOSING = "Internet downloads are off. Turning them on lets bonsAI download only when you press a download button. You can turn them off in Permissions.";
function b6t9Paras() {
  const tag = (t) => `<span class="b6t9-tag">${t}</span>`;
  return [
    { html: `The starter set is the answer model ${tag("gemma4:e2b-it-qat")}, which can chat, read screenshots and text in pictures, and help in Strategy mode; the note-search model ${tag("nomic-embed-text")}; and the speech models ${tag("tiny.en and base.en")} and the voice engine for the microphone. Rough download: about 5.3 GB in all (the answer model, the note-search model, the speech models and the voice engine).` },
    { hi: true, html: "A model you already have is not downloaded again. If one download fails the others still go ahead, and the tab says which one failed. The speech models download and the voice engine is built on this Deck, which can take several minutes, even with the microphone permission off; Voice input stays off until you turn it on in the Permissions tab." },
    { hi: true, html: "Default model folder on this account: /home/deck/.ollama/models (override with the OLLAMA_MODELS environment variable if you moved the store)." },
    { hi: false, html: "Downloads can take a while. Keep Ollama running and the Deck awake and online until they finish. Plug in if you can." },
  ];
}

/* The box. `first`: the closing paragraph goes above the site lines (option A). `onNote` hears what happened. */
function b6t9Box(first, onNote) {
  const root = h("div", { class: "deck", tabindex: "0", role: "application", "aria-label": "Interactive mock-up. Use the arrow keys as the D-pad, Enter as A, Escape as B." });
  const closing = h("div", { class: "b6t9-p hi mark" + (first ? "" : " last") }, B6T9_CLOSING);
  const pinned = h("div", { class: "b6t9-pinned" }, ...B6T9_SITES.map((s) => h("div", {}, s)));
  const paras = b6t9Paras().map((p, i, all) => h("div", { class: "b6t9-p" + (p.hi ? " hi" : "") + (first && i === all.length - 1 ? " last" : ""), html: p.html }));
  const words = first ? h("div", { class: "b6t9-words" }, closing, pinned, ...paras) : h("div", { class: "b6t9-words" }, pinned, ...paras, closing);
  const more = h("div", { class: "b6t9-more", hidden: true });
  const act = h("button", { class: "b6t9-btn act", type: "button", "data-stop": "", "data-row": "cf" }, "Turn on and download");
  const cancel = h("button", { class: "b6t9-btn safe", type: "button", "data-stop": "", "data-row": "cf", "data-start": "" }, "Cancel");
  const box = h("div", { class: "b6t9-box" }, h("div", { class: "b6t9-title" }, "Turn on internet downloads?"), words, more, h("div", { class: "b6t9-btns" }, act, cancel));
  root.append(h("div", { class: "b6t9-screen" }, box));
  cancel.classList.add("ring");

  let downs = 0, seenAt = null;
  const inView = () => { const c = closing.getBoundingClientRect(), w = words.getBoundingClientRect(); return c.height > 0 && c.top >= w.top - 1 && c.bottom <= w.bottom + 1; };
  const read = () => {
    const max = words.scrollHeight - words.clientHeight;
    more.textContent = words.scrollTop < max - 1 ? "▾ More below (press Down)" : "";
    if (seenAt === null && inView()) seenAt = downs;
    onNote && onNote({ downs, seenAt });
  };
  words.addEventListener("scroll", read);
  const reset = (said) => { words.scrollTop = 0; downs = 0; seenAt = null; Deck.setRing(root, cancel, { scroll: false }); read(); if (said) onNote({ downs, seenAt, said }); };
  act.addEventListener("click", () => reset("You pressed Turn on and download. The box would close and the downloads start; here it opens again."));
  cancel.addEventListener("click", () => reset("You pressed Cancel. The box would close and nothing is downloaded; here it opens again."));
  root.addEventListener("deckkey", (e) => {
    const k = e.detail.key;
    if (k === "B") { e.preventDefault(); cancel.click(); }
    else if (k === "Up" || k === "Down") {
      e.preventDefault(); // the ring stays on its button; the words move one step (64 points)
      if (k === "Down") downs++;
      words.scrollTop = Math.max(0, Math.min(words.scrollHeight - words.clientHeight, words.scrollTop + (k === "Down" ? 64 : -64)));
      read();
    }
  });
  // once drawn (and the fonts are in), see whether the words scroll
  const settle = () => {
    words.classList.remove("scrolls");
    if (words.scrollHeight > words.clientHeight + 1) { words.classList.add("scrolls"); more.hidden = false; } else more.hidden = true;
    read();
  };
  new ResizeObserver(settle).observe(box);
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(settle, 40));
  return root;
}
function b6t9BoxCard(first) {
  return () => {
    const out = h("p", { class: "b6t9-count" });
    const note = ({ downs, seenAt, said }) => {
      out.replaceChildren(
        "The paragraph that explains “Turn on and download” (marked in yellow at its left edge):",
        seenAt === null ? h("b", {}, "not in view yet") : h("b", {}, seenAt === 0 ? "in view when the box opens" : `in view after ${seenAt} Down ${seenAt === 1 ? "press" : "presses"}`),
        said ? h("span", {}, said) : "");
    };
    const box = b6t9Box(first, note);
    note({ downs: 0, seenAt: null });
    return [box, out];
  };
}

TABS.push({
  id: "t9", n: 9, name: "Three calls about words", stars: 1, wide: true,
  title: "Three calls about words: no-notes games, the Speed option, the starter box",
  today: [
    "Call one: when a game has no notes, the player sees a small line under every answer: “No notes for this game — this answer is from the model's own knowledge.” The AI itself is not told.",
    "Call two: inside the plugin there is an unused switch. It was meant to make Speed answers say “I don't know” more often. Tests showed it changes nothing. It is off, and no screen shows it.",
    "Call three: when Internet downloads are off and you press a download button, a box asks “Turn on internet downloads?”. The sentence that says what turning them on means is the box's last paragraph, out of sight until you press Down several times.",
  ],
  deciding: [
    "Call one: tell the AI too, or leave it to the line the player sees. You picked: leave it.",
    "Call two (you can skip it): delete the unused switch from the code, or leave it there switched off. A player sees no difference either way. With no pick it stays.",
    "Call three: leave the box as it is, or move the explaining sentence to the top.",
  ],
  howto: "Call one shows a real answer from today's setup; no answer from the other setup was kept, so that side shows its numbers. Call two's numbers are just below. For call three, tap a box, then press Down and Up to scroll the words (the ring stays on Cancel), Left and Right to move between the buttons, A to press one, B to cancel. Use the pad at the bottom of the page, or a keyboard (arrow keys, Enter for A, Esc for B). The line under each box says when the explaining sentence comes into view. It has a yellow mark at its left edge.",
  controls: b6t9SpeedTable,
  options: [
    { id: "c1-leave", group: "c1", groupTitle: "Call one: should the AI also be told when a game has no notes?", label: "Today", today: true,
      title: "Leave it: only the player sees the line",
      desc: "The answer comes from the model's own knowledge and the plugin adds the line under it. Nothing to build.",
      build: b6t9Answer },
    { id: "c1-tell", group: "c1", label: "A", title: "Tell the AI as well",
      desc: "The AI would get the same “the notes do not cover this” sentence it already gets for the other two cases, in Strategy and Expert (not Speed). Built once and measured: it made no clear difference. The line under the answer stays either way.",
      build: b6t9NoAnswer },
    { id: "c2-keep", group: "c2", groupTitle: "Call two (you can skip this one): an unused switch inside the code. Numbers above, under the brief", label: "Today", today: true,
      title: "Leave it in the code, switched off",
      desc: "Nothing changes on any screen. The switch stays in case a later change makes it useful. With no pick, this is what happens.",
      build: () => null },
    { id: "c2-remove", group: "c2", label: "A", title: "Delete it from the code",
      desc: "Nothing changes on any screen either: it is off today. The code gets a little smaller and there is one less thing to test.",
      build: () => null },
    { id: "c3-today", group: "c3", groupTitle: "Call three: the box that asks before the first downloads (drawn for the starter models)", label: "Today", today: true,
      title: "Today: the explaining sentence comes last",
      desc: "The box opens on the three download sites and a long description of the starter models. The sentence that says what “Turn on and download” does is the last paragraph. You have to press Down several times to see it. Drawn as the box from Browse models, with Ollama already installed.",
      build: b6t9BoxCard(false) },
    { id: "c3-A", group: "c3", label: "A", title: "The explaining sentence comes first",
      desc: "The same words in a new order: the sentence about Internet downloads is the first thing you read, above the site lines. Nothing else changes: same box, same size, same buttons.",
      build: b6t9BoxCard(true) },
  ],
});
