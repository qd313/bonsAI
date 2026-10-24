/* ============================================================
   Tab 7, round 2: your own notes, drawn in the new layout (21-kit2.js).
   Round 1 picks: C liked ("Keep as a note" from what you asked), Wild 1 "maybe" (say it).
   Not A (notes in the Session tab) or B (a notes button by the question box), so there is
   no notes screen here: a note shows up where it is used, as a line on the answer that read
   it, and that line is the way in to change or remove it.
   ============================================================ */
const N2_Q = "i'm doing a steel soul run, how do i beat the mantis lords";
const N2_A = ["On a Steel Soul run, play it safe: learn the first lord's three moves before you swing at all.", "When two drop at once, stay between them and pogo the one that dashes."];
const N2_NEXT_Q = "where do i go after the mantis lords";
const N2_NEXT_A = ["Head on to the City of Tears through the door the lords open. <b>On a Steel Soul run</b>, rest at the bench by the lift first, and leave the Soul Sanctum for later."];

/* The line above an answer that read your notes; pressing it opens them */
function n2Used(notes, open) {
  const on = notes.filter((n) => n.on).length;
  const b = h("button", { class: "n2-used", "data-stop": "" }, h("span", { class: "ico pin", html: ICONS.pin }), on ? `Read ${on} of your notes` : "Your notes are all off", h("span", { class: "k2-echev" }, "▸"));
  b.addEventListener("click", () => open(b));
  return b;
}

/* Your notes over the panel: switch one off, or remove it */
function n2Sheet(root, panel, notes, back, changed) {
  const inner = h("div", { class: "scroll s-sheet-in n2-in" });
  const sheet = h("div", { class: "s-sheet" }, h("div", { class: "s-sheet-h" }, h("span", { class: "s-gi", html: ICONS2.note }), "Your notes"), inner, hintBar([["B", "Close"], ["A", "On / off"]]));
  panel.append(sheet);
  const shut = () => { sheet.remove(); Deck.setRing(root, changed(back) || back); };
  sheet.addEventListener("deckkey", (e) => { if (e.detail.key === "B") { e.preventDefault(); shut(); } });
  const draw = (ringIdx, part = "row") => {
    const rows = notes.map((n, i) => {
      const row = h("button", { class: "note-row n2-row" + (n.on ? " on" : ""), "data-stop": "", "data-row": "n" + i },
        h("span", { class: "ico pin", html: ICONS.pin }), h("span", { class: "grow" }, n.text, h("small", {}, n.game || "Every game")),
        h("span", { class: "q-toggle" + (n.on ? " on" : "") }));
      const del = h("button", { class: "n2-del", "data-stop": "", "data-row": "n" + i, "aria-label": "Remove", html: ICONS2.trash });
      row.addEventListener("click", () => { n.on = !n.on; draw(i, "row"); });
      del.addEventListener("click", () => { notes.splice(i, 1); toast(panel, "Removed. Ask won't read it again.", 1500); draw(Math.min(i, notes.length - 1)); });
      return h("div", { class: "n2-line" }, row, del);
    });
    inner.replaceChildren(h("p", { class: "n2-say" }, "Ask reads the ones that are on, every time you ask about that game."), ...rows,
      notes.length ? "" : h("p", { class: "n2-say" }, "No notes left."));
    const line = $$(".n2-line", inner)[ringIdx ?? 0];
    Deck.setRing(root, line ? $(part === "del" ? ".n2-del" : ".n2-row", line) : null, { scroll: false });
  };
  draw(0);
}

function notesR2Mock(kind) {
  const notes = [{ text: "No spoilers past the City of Tears.", on: true, game: "Hollow Knight" }];
  const holder = h("div", { style: "display:contents" });
  const root = deckFrame({ body: holder, header: false });
  const dk = dock2({ game: "Hollow Knight", mode: "Strategy", chips: ["Charms for this fight", "Recommended controls"] });
  const body = mainTab2({ chatName: "Hollow Knight help", chatNo: 1, chatCount: 5, dockEl: dk });
  holder.append(body);
  const panel = $(".qam", root);
  const sc = body.scroller;
  // closing the notes redraws every line, and the highlight comes back to the one you opened
  const openNotes = (from) => n2Sheet(root, panel, notes, from, (back) => {
    let again = null;
    for (const u of $$(".n2-used", sc)) { const nu = n2Used(notes, openNotes); u.replaceWith(nu); if (u === back) again = nu; }
    return again;
  });

  // the card that turns what you said into a short note; Keep, change who it is for, or Not now
  function keepCard(text, { onEdit, editLabel = "Edit", lead = "Keep this as a note?" } = {}) {
    let game = "Hollow Knight";
    const yes = h("button", { class: "q-btn primary", "data-stop": "", "data-row": "kc" }, "Keep");
    const edit = h("button", { class: "q-btn quiet", "data-stop": "", "data-row": "kc" }, editLabel);
    const no = h("button", { class: "q-btn quiet", "data-stop": "", "data-row": "kc" }, "Not now");
    const who = h("button", { class: "n2-who", "data-stop": "" }, "For: Hollow Knight ▸");
    const txt = h("p", { class: "kc-text" }, text);
    const card = h("div", { class: "keepcard n2-card" }, h("small", {}, lead), txt, who, h("div", { class: "kc-btns" }, yes, edit, no));
    who.addEventListener("click", () => { game = game ? null : "Hollow Knight"; who.textContent = `For: ${game || "every game"} ▸`; });
    yes.addEventListener("click", () => {
      notes.push({ text: txt.textContent, on: true, game });
      card.replaceChildren(h("p", { class: "kc-done" }, h("span", { class: "ico pin", html: ICONS.pin }), `Kept. Ask reads it on ${game ? "every Hollow Knight question" : "every question"} from now on.`));
      dk.field.textContent = N2_NEXT_Q; dk.field.classList.add("typed");
      Deck.setRing(root, dk.ask);
    });
    edit.addEventListener("click", () => onEdit(txt, yes));
    no.addEventListener("click", () => { card.remove(); Deck.setRing(root, dk.field); });
    card.yes = yes;
    return card;
  }
  const typeEdit = (txt, yes) => fakeKeyboard(root, panel, "Steel Soul run, so no risky plans.", (t) => { if (t) txt.textContent = t; Deck.setRing(root, yes); });

  // the next question shows the note at work: a line above the answer says which notes it read
  dk.ask.addEventListener("click", async () => {
    if (!dk.field.classList.contains("typed") || $(".n2-next", sc)) return;
    dk.field.textContent = "Describe the level, boss, or puzzle you're stuck on."; dk.field.classList.remove("typed");
    const wr = h("div", { class: "k2-writing" }, "Writing…");
    const turn = h("div", { class: "k2-turn n2-next" }, qBubble2(N2_NEXT_Q), wr);
    sc.append(turn); sc.scrollTop = sc.scrollHeight;
    await sleep(700);
    wr.replaceWith(n2Used(notes, openNotes), aBubble2(N2_NEXT_A));
    sc.scrollTop = sc.scrollHeight;
    Deck.setRing(root, $(".n2-used", turn));
  });

  if (kind === "button") {
    // round 1's C as it was: a Keep as a note button under every answer, beside the thumbs
    const rows = k2Rows();
    const keep = h("button", { class: "n2-keepbtn", "data-stop": "", "data-row": "thumbs", "data-start": "" }, h("span", { class: "ico pin", html: ICONS.pin }), "Keep as a note");
    $(".k2-thumbs", rows).append(keep);
    const turn = h("div", { class: "k2-turn" }, qBubble2(N2_Q), aBubble2(N2_A), rows);
    sc.append(turn);
    keep.addEventListener("click", () => {
      if ($(".n2-card", turn)) return;
      const card = keepCard("I'm doing a Steel Soul run.", { onEdit: typeEdit });
      rows.after(card); Deck.setRing(root, card.yes);
    });
  } else if (kind === "offer") {
    // bonsAI offers only when your question said something worth keeping; no button on every answer
    const card = keepCard("I'm doing a Steel Soul run.", { onEdit: typeEdit, lead: "You said you're on a Steel Soul run. Keep that as a note?" });
    card.yes.setAttribute("data-start", "");
    sc.append(h("div", { class: "k2-turn" }, qBubble2(N2_Q), aBubble2(N2_A), card, k2Rows()));
  } else {
    // B, plus saying it: "remember …" into the mic makes the same card, and the edit is said too
    sc.append(h("div", { class: "k2-turn" }, qBubble2("how do i beat the mantis lords"), aBubble2([N2_A[0]]), k2Rows()));
    dk.mic.setAttribute("data-start", "");
    const listen = async (said) => {
      dk.mic.classList.add("live"); dk.field.classList.add("typed");
      for (let i = 1; i <= said.length; i += 2) { dk.field.textContent = said.slice(0, i); await sleep(40); }
      dk.field.textContent = said; await sleep(450);
      dk.mic.classList.remove("live"); dk.field.textContent = "Describe the level, boss, or puzzle you're stuck on."; dk.field.classList.remove("typed");
    };
    const sayEdit = async (txt, yes) => { await listen("steel soul run, so no risky plans"); txt.textContent = "Steel Soul run, so no risky plans."; Deck.setRing(root, yes); };
    dk.mic.addEventListener("click", async () => {
      if (dk.mic.classList.contains("live") || $(".n2-card", sc)) return;
      await listen("remember I'm doing a Steel Soul run");
      const card = keepCard("I'm doing a Steel Soul run.", { onEdit: sayEdit, editLabel: "Say it again", lead: "You said “remember”. Keep this as a note?" });
      sc.append(h("div", { class: "k2-turn" }, card)); sc.scrollTop = sc.scrollHeight;
      Deck.setRing(root, card.yes);
    });
  }
  return root;
}

const NOTES_R2_OPTIONS = [
  { id: "2A", group: "r2", groupTitle: "Round 2: keeping a note from what you said", label: "A", title: "“Keep as a note” under every answer", desc: "Round 1's C in the new layout. The button sits beside Helpful and Not really. It offers a short note made from your question: Keep, Edit, or Not now, and you choose this game or every game. The next answer shows a line saying it read your notes. Press that line to switch a note off or remove it.", build: () => notesR2Mock("button") },
  { id: "2B", group: "r2", label: "B", title: "bonsAI offers only when it hears one", desc: "No button on every answer. When your question says something worth keeping, like “I'm doing a Steel Soul run”, a small card offers it under the answer. Everything after that is the same as A.", build: () => notesR2Mock("offer") },
  { id: "2C", group: "r2", label: "C", title: "B, plus saying it", desc: "Round 1's Wild 1 folded in. Press the mic and say “remember I'm doing a Steel Soul run”. Nothing saves by itself: the same card comes up to Keep or not, and “Say it again” replaces typing.", build: () => notesR2Mock("voice") },
];

/* Put round 2 on top of tab 7; round 1 stays below with its picks */
(() => {
  const t7 = TABS.find((t) => t.id === "t7");
  t7.title = "Your own notes, round 2";
  t7.today = [
    "Round 1: you liked “Keep as a note” from what you asked (C), and said maybe to saying it out loud. Not a notes list in the Session tab, and not a notes button by the question box.",
    "So there is no notes screen here. A note shows up where it is used: the answer that read it says so in one line, and that line is the way in to switch a note off or remove it.",
    "Nothing here is built yet.",
  ];
  t7.deciding = [
    "A button under every answer (A), or only when bonsAI hears something worth keeping (B).",
    "Whether saying “remember …” is in (C).",
    "Is the line on the answer enough of a way back to your notes, with no notes screen at all?",
  ];
  t7.howto = "In A press A on <b>Keep as a note</b>. In B the card is already there. In C press A on the mic. After <b>Keep</b>, press <b>Ask</b> to see the next answer read your note, then press A on <b>Read 2 of your notes</b>. B closes the notes. Round 1 is further down, with your picks.";
  t7.options = [...NOTES_R2_OPTIONS, ...t7.options.map((o, i) => ({ ...o, group: "r1", groupTitle: i === 0 ? "Round 1 (your earlier picks)" : undefined }))];
})();
