/* ============================================================
   Tab 7: your own notes that Ask reads
   ============================================================ */
function startNotes() {
  return [
    { text: "I'm on a Steel Soul run (one life).", on: true, game: "Hollow Knight" },
    { text: "No spoilers past the City of Tears.", on: true, game: "Hollow Knight" },
    { text: "I play with the back buttons mapped to dash.", on: false, game: null },
  ];
}

/* Steam's on-screen keyboard, typing a sample sentence by itself */
function fakeKeyboard(root, panel, sample, done) {
  const typed = h("div", { class: "typed" }, "");
  const keys = h("div", { class: "keys-q" }, ..."QWERTYUIOPASDFGHJKL'ZXCVBNM,.?".split("").map((k) => h("span", {}, k)));
  const kb = h("div", { class: "q-kbd", "data-stop": "" }, typed, keys);
  const tip = h("div", { class: "kbd-tip" }, "Typing a sample for you · A saves · B cancels");
  panel.append(kb, tip);
  Deck.setRing(root, kb, { scroll: false });
  let n = 0, alive = true;
  const tick = setInterval(() => { n += 2; typed.textContent = sample.slice(0, n); if (n >= sample.length) clearInterval(tick); }, 30);
  const finish = (save) => { alive = false; clearInterval(tick); kb.remove(); tip.remove(); done(save ? sample : null); };
  kb.addEventListener("deckkey", (e) => { if (!alive) return; if (e.detail.key === "A") { e.preventDefault(); finish(true); } if (e.detail.key === "B") { e.preventDefault(); finish(false); } });
  kb.addEventListener("click", () => alive && finish(true));
}

function noteRow(n, redraw) {
  const r = h("button", { class: "note-row" + (n.on ? " on" : ""), "data-stop": "" },
    h("span", { class: "ico pin", html: ICONS.pin }), h("span", { class: "grow" }, n.text, n.game ? h("small", {}, n.game) : h("small", {}, "Every game")),
    h("span", { class: "q-toggle" + (n.on ? " on" : "") }));
  r.addEventListener("click", () => { n.on = !n.on; redraw(); });
  return r;
}

function notesMock(kind) {
  const notes = startNotes();
  const sc = h("div", { class: "scroll" });
  const dk = dock({ chips: ["Charms for this fight", "Recommended controls"], mode: "Strategy", context: "Context: active game Hollow Knight" });
  const body = mainTab({ transcript: [], chatName: "Hollow Knight help", dockEl: dk });
  body.scroller.replaceWith(sc);
  const root = deckFrame({ body });
  const panel = $(".qam", root);

  if (kind === "session") {
    const dl = detailsLine();
    const det = h("div", { class: "details", hidden: true });
    sc.append(h("div", { class: "turn" }, qBubble("how do i beat the mantis lords"), reasonLine(12),
      aBubble(["On a Steel Soul run, play it safe: learn the first lord's three moves before you swing at all.", "When two drop at once, stay between them and pogo the one that dashes."]),
      ...rateRow(), dl, det));
    let tab = "session";
    const draw = (ringSel) => {
      const on = notes.filter((n) => n.on);
      const tabs = h("div", { class: "dtabs" },
        h("button", { class: "dtab" + (tab === "answer" ? " on" : ""), "data-stop": "", "data-row": "dtabs", onclick: () => { tab = "answer"; draw(".dtab:first-child"); } }, "This answer"),
        h("button", { class: "dtab" + (tab === "session" ? " on" : ""), "data-stop": "", "data-row": "dtabs", onclick: () => { tab = "session"; draw(".dtab:last-child"); } }, "Session · 3"));
      const content = h("div", { class: "dcontent" });
      if (tab === "answer") {
        content.append(h("div", { class: "used" }, h("b", {}, "Your notes it read"), ...on.map((n) => h("div", { class: "used-n" }, h("span", { class: "ico pin", html: ICONS.pin }), n.text)), on.length ? "" : h("div", { class: "used-n" }, "None were on.")),
          h("div", { class: "used" }, h("b", {}, "From the notes"), h("div", { class: "used-n" }, "Mantis Lords · From the Hollow Knight wiki")));
      } else {
        const add = h("button", { class: "q-btn quiet addnote", "data-stop": "" }, h("span", { class: "ico", html: ICONS.plus }), "Add a note");
        add.addEventListener("click", () => fakeKeyboard(root, panel, "I'd rather hear about charms than items.", (t) => { if (t) notes.push({ text: t, on: true, game: "Hollow Knight" }); draw(".addnote"); }));
        content.append(
          h("button", { class: "q-btn", "data-stop": "" }, "Sum up this chat"),
          h("div", { class: "remember" }, h("b", {}, "What the AI remembers"), h("small", {}, "61 turns · just now")),
          h("div", { class: "mynotes" }, h("div", { class: "mn-head" }, h("span", { class: "ico", html: ICONS.note }), "My notes", h("small", {}, `Ask reads the ${on.length} that are on`)),
            ...notes.map((n, i) => { const r = noteRow(n, () => draw(`.note-row[data-i="${i}"]`)); r.dataset.i = i; return r; }), add));
      }
      det.replaceChildren(tabs, content);
      const t = ringSel ? $(ringSel, det) : null;
      if (t) Deck.setRing(root, t);
    };
    dl.addEventListener("click", () => {
      det.hidden = !det.hidden;
      dl.textContent = det.hidden ? "Show details ↓" : "Hide details ↑";
      if (!det.hidden) draw(".dtab:last-child");
    });
    det.addEventListener("deckkey", (e) => { if (e.detail.key === "B") { e.preventDefault(); det.hidden = true; dl.textContent = "Show details ↓"; Deck.setRing(root, dl); } });
    dl.setAttribute("data-start", "");
    $("[data-start]", dk)?.removeAttribute("data-start");
  } else if (kind === "button") {
    sc.append(h("div", { class: "turn" }, qBubble("how do i beat the mantis lords"), reasonLine(12), aBubble(["On a Steel Soul run, play it safe: learn the first lord's three moves before you swing at all."]), ...rateRow(), detailsLine()));
    const tools = $(".qbox .tools", dk);
    const nb = h("button", { class: "notesbtn", "data-stop": "", "data-start": "" }, h("span", { class: "ico", html: ICONS.note }), h("span", { class: "cnt" }, String(notes.filter((n) => n.on).length)));
    $(".mode", tools).before(nb);
    $("[data-start]", dk.field.parentElement)?.removeAttribute("data-start");
    dk.field.removeAttribute("data-start");
    nb.addEventListener("click", () => {
      const sheetBody = h("div", { class: "q-sheet-body" });
      const close = h("button", { class: "q-btn quiet", "data-stop": "" }, "Done");
      const m = h("div", { class: "q-modal" }, h("div", { class: "q-sheet" }, h("div", { class: "q-sheet-head" }, "Notes Ask reads"), sheetBody, h("div", { class: "q-sheet-foot" }, close)), hintBar([["B", "Close"], ["A", "On / off"]]));
      panel.append(m);
      const draw = (sel) => {
        const add = h("button", { class: "q-btn quiet addnote", "data-stop": "" }, h("span", { class: "ico", html: ICONS.plus }), "Add a note");
        add.addEventListener("click", () => fakeKeyboard(root, panel, "I'd rather hear about charms than items.", (t) => { if (t) notes.push({ text: t, on: true, game: "Hollow Knight" }); draw(".addnote"); }));
        sheetBody.replaceChildren(
          h("div", { class: "q-section-title" }, "For Hollow Knight (running now)"), ...notes.map((n, i) => [n, i]).filter(([n]) => n.game).map(([n, i]) => { const r = noteRow(n, () => draw(`.note-row[data-i="${i}"]`)); r.dataset.i = i; return r; }),
          h("div", { class: "q-section-title" }, "For every game"), ...notes.map((n, i) => [n, i]).filter(([n]) => !n.game).map(([n, i]) => { const r = noteRow(n, () => draw(`.note-row[data-i="${i}"]`)); r.dataset.i = i; return r; }), add);
        $(".cnt", nb).textContent = String(notes.filter((n) => n.on).length);
        if (sel) Deck.setRing(root, $(sel, sheetBody));
      };
      draw();
      const shut = () => { m.remove(); Deck.setRing(root, nb); };
      close.addEventListener("click", shut);
      m.addEventListener("deckkey", (e) => { if (e.detail.key === "B") { e.preventDefault(); shut(); } });
      Deck.setRing(root, $(".note-row", sheetBody), { scroll: false });
    });
  } else if (kind === "keep") {
    const qb = qBubble("i'm doing a steel soul run, how do i beat the mantis lords");
    const keep = h("button", { class: "keepbtn", "data-stop": "", "data-row": "rate" }, h("span", { class: "ico", html: ICONS.pin }), "Keep as a note");
    const rate = rateRow();
    $(".spk", rate[1]).before(keep);
    const turn = h("div", { class: "turn" }, qb, reasonLine(12), aBubble(["On a Steel Soul run, play it safe: learn the first lord's three moves before you swing at all.", "When two drop at once, stay between them and pogo the one that dashes."]), ...rate, detailsLine());
    sc.append(turn);
    keep.setAttribute("data-start", "");
    dk.field.removeAttribute("data-start");
    keep.addEventListener("click", () => {
      if ($(".keepcard", turn)) return;
      const yes = h("button", { class: "q-btn primary", "data-stop": "", "data-row": "kc" }, "Keep");
      const edit = h("button", { class: "q-btn quiet", "data-stop": "", "data-row": "kc" }, "Edit");
      const no = h("button", { class: "q-btn quiet", "data-stop": "", "data-row": "kc" }, "Not now");
      const card = h("div", { class: "keepcard" }, h("small", {}, "Keep this for every Hollow Knight question?"), h("p", { class: "kc-text" }, "I'm doing a Steel Soul run."), h("div", { class: "kc-btns" }, yes, edit, no));
      keep.closest(".rate").after(card);
      Deck.setRing(root, yes);
      yes.addEventListener("click", () => { card.replaceChildren(h("p", { class: "kc-done" }, h("span", { class: "ico pin", html: ICONS.pin }), "Kept. Ask will read it on every Hollow Knight question. Change it in Show details → Session.")); Deck.setRing(root, keep); });
      edit.addEventListener("click", () => fakeKeyboard(root, panel, "Steel Soul run, so I can't afford risky plans.", (t) => { if (t) $(".kc-text", card).textContent = t; Deck.setRing(root, yes); }));
      no.addEventListener("click", () => { card.remove(); Deck.setRing(root, keep); });
    });
  } else if (kind === "voice") {
    sc.append(h("div", { class: "turn" }, qBubble("how do i beat the mantis lords"), reasonLine(12), aBubble(["Learn the first lord's three moves before you swing at all."]), ...rateRow(), detailsLine()));
    const mic = h("button", { class: "micbtn", "data-stop": "", "data-start": "", html: ICONS.mic });
    const tools = $(".qbox .tools", dk);
    $$("span", tools).pop().replaceWith(mic);
    dk.field.removeAttribute("data-start");
    mic.addEventListener("click", async () => {
      if (mic.classList.contains("live")) return;
      mic.classList.add("live");
      dk.field.classList.add("typed");
      dk.field.textContent = "Listening…";
      const said = "remember I'm doing a Steel Soul run";
      for (let i = 1; i <= said.length; i += 2) { dk.field.textContent = said.slice(0, i); await sleep(45); }
      dk.field.textContent = said;
      await sleep(500);
      mic.classList.remove("live");
      dk.field.textContent = "Describe the level, boss, or puzzle you're stuck on.";
      dk.field.classList.remove("typed");
      const undo = h("button", { class: "q-btn quiet", "data-stop": "" }, "Undo");
      const card = h("div", { class: "turn" }, h("div", { class: "notecard" }, h("span", { class: "ico pin", html: ICONS.pin }), h("div", {}, h("b", {}, "Saved a note"), h("p", {}, "You're doing a Steel Soul run.")), undo));
      sc.append(card);
      sc.scrollTop = sc.scrollHeight;
      undo.addEventListener("click", () => { card.remove(); Deck.setRing(root, mic); });
    });
  } else if (kind === "chips") {
    sc.append(h("div", { class: "turn" }, qBubble("how do i beat the mantis lords"), reasonLine(12), aBubble(["On a Steel Soul run, play it safe: learn the first lord's three moves before you swing at all."]), ...rateRow(), detailsLine()));
    const chips = $(".chips", dk);
    const draw = () => {
      chips.replaceChildren(...notes.slice(0, 2).map((n, k) => {
        const c = h("button", { class: "chip notechip" + (n.on ? " on" : ""), "data-stop": "", "data-row": "chips" }, h("span", { class: "ico pin", html: ICONS.pin }), k === 0 ? "Steel Soul" : "No spoilers past City");
        c.addEventListener("click", () => { n.on = !n.on; c.classList.toggle("on", n.on); });
        return c;
      }), h("button", { class: "chip notechip add", "data-stop": "", "data-row": "chips" }, h("span", { class: "ico", html: ICONS.plus })));
    };
    draw();
    $(".notechip", chips).setAttribute("data-start", "");
    dk.field.removeAttribute("data-start");
  }
  return root;
}

TABS.push({
  id: "t7", n: 7, name: "Your own notes", stars: 4,
  title: "Notes you write yourself, that Ask reads",
  today: [
    "Ask already remembers the chat: “Sum up this chat” keeps a summary under Show details → Session.",
    "What does not exist yet: short notes you write and edit yourself, like “I'm on a Steel Soul run” or “no spoilers past the City of Tears”, that Ask reads every time. No cloud, nothing clever: just your words.",
    "Typing on the Deck means Steam's on-screen keyboard, so every option tries to keep typing short.",
  ],
  deciding: [
    "Where notes live and how you get to them.",
    "Whether notes belong to one game, to every game, or both.",
    "How a note gets made: typed, kept from something you asked, or said out loud.",
  ],
  howto: "In option A, press A on <b>Show details</b>, then walk Down to <b>My notes</b>. When a keyboard opens, it types a sample sentence for you: press A to save it or B to cancel.",
  options: [
    { id: "A", label: "A", title: "“My notes” in the Session tab", desc: "Under Show details → Session, next to “What the AI remembers”. Each note has an on/off switch. “This answer” lists which notes were read.", build: () => notesMock("session") },
    { id: "B", label: "B", title: "A notes button by the question box", desc: "A small note icon with a count sits beside the mode button. It opens notes for the running game and notes for every game.", build: () => notesMock("button") },
    { id: "C", label: "C", title: "“Keep as a note” from what you asked", desc: "Less typing: bonsAI offers a short note made from your question. Keep it, edit it, or say not now.", build: () => notesMock("keep") },
    { id: "W1", label: "Wild 1", wild: true, title: "Say it", desc: "Press the mic and say “remember I'm doing a Steel Soul run”. A note card appears with Undo.", build: () => notesMock("voice") },
    { id: "W2", label: "Wild 2", wild: true, title: "Notes as chips", desc: "Your notes ride in the chip row as pins. Lit means Ask reads it on the next question. The + chip adds one.", build: () => notesMock("chips") },
  ],
});
