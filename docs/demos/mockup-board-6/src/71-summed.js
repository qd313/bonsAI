/* ============================================================
   Board 6, tab 1: where the "summed itself up" row sits.
   The row's words say "before this answer", but the plugin draws it under the answer
   (MainTabChatTranscript.tsx: the answer bubble, then the summary note). Words copied from
   buildChatSummaryNoteElement.tsx (NOTE_NEWEST). The D-pad walk today, from its own comment:
   the answer's last paragraph, Down, the note, Down, Helpful, then Show details.
     today  the row under the answer, words unchanged
     A      the row above the answer, between the question and the answer (same words)
     B1, B2 the row stays under the answer, with words that are true where it sits
   Every name here starts with b6t1 so it cannot clash with another tab's file.
   ============================================================ */
const B6T1_NOTE = "The chat summed itself up before this answer. Press to read what it kept.";
const B6T1_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h5V4M20 9h-5V4M4 15h5v5M20 15h-5v5"/></svg>';
const B6T1_ANSWER = [SAMPLE.a[1], SAMPLE.a[3]]; // two short paragraphs, so the row is in view without a press

/* The row. words: a string, or [before, marked new part, after] for B's new wording. */
function b6t1Note(words) {
  const text = typeof words === "string" ? h("span", {}, words)
    : h("span", {}, words[0], h("span", { class: "b6t1-new" }, words[1]), words[2]);
  return h("div", { class: "b6t1-note", "data-stop": "", "data-what": "the summed-up row" },
    h("span", { class: "b6t1-ico", html: B6T1_ICON }), text);
}

/* What the ring is on, said in words for the line under the panel */
function b6t1Name(el) {
  if (!el) return "";
  if (el.dataset.what) return el.dataset.what;
  if (el.closest(".k2-answer")) {
    const ps = Array.from(el.parentNode.querySelectorAll("p"));
    return `answer, paragraph ${ps.indexOf(el) + 1} of ${ps.length}`;
  }
  if (el.closest(".k2-q")) return "the question";
  return (el.textContent || "").trim() || "a stop";
}

/* cfg.where: "under" or "above"; cfg.words: the row's words */
function b6t1Panel(cfg) {
  const note = b6t1Note(cfg.words);
  const q = qBubble2(SAMPLE.q);
  q.dataset.what = "the question";
  const ans = aBubble2(B6T1_ANSWER);
  const last = ans.querySelectorAll("p")[B6T1_ANSWER.length - 1];
  const rate = rateRow();
  const details = detailsLine();
  const turn = h("div", { class: "b6t1-turn" }, q);
  if (cfg.where === "above") turn.append(note, ans); else turn.append(ans, note);
  turn.append(...rate, details);
  const body = mainTab2({ transcript: [turn], dockEl: dock2({}) });
  const root = deckFrame({ body, header: false });
  root.classList.add("b6t1");
  (cfg.where === "above" ? q : last).setAttribute("data-start", "");
  root.b6t1note = note;
  return root;
}

function b6t1Card(cfg, hint) {
  return () => {
    const root = b6t1Panel(cfg);
    const walk = h("p", { class: "b6t1-walk" }, "Click the panel, then press Down to walk the answer.");
    const seen = [];
    root.addEventListener("ringmove", (e) => {
      const name = b6t1Name(e.detail.el);
      if (seen[seen.length - 1] !== name) seen.push(name);
      while (seen.length > 4) seen.shift();
      walk.replaceChildren("Ring on: ", h("b", {}, name), seen.length > 1 ? `  (came from: ${seen.slice(0, -1).join(", then ")})` : "");
    });
    root.addEventListener("deckkey", (e) => {
      if (e.detail.key === "A" && e.detail.stop === root.b6t1note) {
        e.preventDefault();
        walk.replaceChildren(h("b", {}, "A on the row: "), "the plugin opens Show details on the Session tab and puts the ring on Sum up this chat. Not drawn here.");
      }
    });
    return [root, walk, hint ? h("p", { class: "b6t1-hint" }, hint) : null];
  };
}

TABS.push({
  id: "t1", n: 1, name: "Summed-up row", stars: 1,
  title: "The \"summed itself up\" row: above the answer, or new words under it",
  today: [
    "When a chat gets long, it sums itself up before the next answer is written. A small row then says so: \"The chat summed itself up before this answer. Press to read what it kept.\"",
    "The row sits under the answer, so \"before this answer\" points the wrong way: the answer it means is the one above it.",
  ],
  deciding: [
    "Move the row above the answer it speaks of (A), so the words are true where they sit and the D-pad meets the row on the way down to the answer.",
    "Or leave it where it is and change the words (B1 or B2). Only the words change.",
    "What it costs: A changes the D-pad order of an answer, and touches five files. B is a change of words only.",
  ],
  howto: "Click a panel, then press Down and Up. The ring starts on the first stop of the newest turn. The line under each panel says where the ring is and where it came from. Enter on the row tells you what the plugin would open. In B1 and B2 the new words have a faint blue mark so you can find them; the mark is not part of the design.",
  options: [
    { id: "today", label: "Today", today: true, title: "Under the answer, saying \"before this answer\"",
      desc: "As it ships. Down from the answer's last paragraph lands on the row, then Helpful. The words point at an answer that is above them.",
      build: b6t1Card({ where: "under", words: B6T1_NOTE }) },
    { id: "A", label: "A", title: "Above the answer it speaks of",
      desc: "The row moves between the question and the answer, with the same words, which are now true. Down from the question meets the row first, then the answer. The answer moves down by the row's height, about two short lines. Costs a change to the D-pad order of an answer, in five files.",
      build: b6t1Card({ where: "above", words: B6T1_NOTE }) },
    { id: "B1", label: "B1", title: "Stays under, new words: \"just before the answer above\"",
      desc: "Nothing moves; the D-pad order stays as today. Only the words change, so they point up at the answer they mean. Words only.",
      build: b6t1Card({ where: "under", words: ["The chat summed itself up ", "just before the answer above", ". Press to read what it kept."] }) },
    { id: "B2", label: "B2", title: "Stays under, shorter words: \"Summed up before the answer above\"",
      desc: "Same place and D-pad order as today. The words are shorter than B1. Words only.",
      build: b6t1Card({ where: "under", words: ["", "Summed up before the answer above", ". Press to read what it kept."] }) },
  ],
});
