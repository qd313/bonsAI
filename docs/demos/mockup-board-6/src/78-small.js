/* ============================================================
   Board 6, tab 8: three small ones on Main.
   Call one: with ten chats saved and none open, Ask opens the "You have 10 chats" list first
     (useAskAtChatLimit.tsx, ChatSlotPickerModal.tsx, ChatSlotDeleteModal.tsx). Cancel or B sends nothing.
       1A  the question stays in the box (what is built now)
       1B  the box is cleared
   Call two: the Pyro character's Agent suggestion chip. About 3 answers in 10 the AI is told to end
     with one of five fixed lines (ai_character_service.py, PYRO_MANAGER_TIP_LINES), and the same line
     becomes the chip (MainTabPresetRow.tsx).
       2today  the line ends the answer and is on the chip
       2A      the chip only
   For the eye: the low-memory warning's Ask anyway button (ChatTranscriptHintRows.tsx), today and
     reading "Asking…" from the press. Being built this session.
   Every name here starts with b6t8 so it cannot clash with another tab's file.
   ============================================================ */
const B6T8_Q = "how do I beat the Mantis Lords";
const B6T8_CHATS = [
  ["Hollow Knight help", "2 h"], ["Mantis Lords tips", "yesterday"], ["Battery life on the Deck", "Mon"],
  ["Elden Ring builds", "Sun"], ["Why can't bonsAI reach my PC?", "Sat"], ["Stardew farm layout", "Nov 12"],
  ["Celeste chapter 7", "Nov 9"], ["Steam Input for Hades", "Nov 4"], ["Stuttering in Cyberpunk", "Oct 30"],
  ["Silksong first boss", "Oct 21"],
];
const B6T8_TIP = "Smoke-test the Ask flow after updating Ollama tags";
const B6T8_SLOW_MS = 2000; // drawn pause between the press and the asking starting; the real one is unknown

/* A reset link under a panel: rebuilds the panel in place */
function b6t8Resettable(make, walkStart) {
  const holder = h("div", { class: "deck-swap" });
  const walk = h("p", { class: "b6t8-walk" }, walkStart);
  const put = () => { const root = make(walk); holder.replaceChildren(root); walk.replaceChildren(walkStart); };
  put();
  const reset = h("button", { class: "b6t8-reset", type: "button", onclick: put }, "Start again");
  return [holder, walk, reset];
}

/* Turn the panel's own stops off while a box is open over it, and back on after */
function b6t8Freeze(root, on) {
  if (on) for (const el of root.querySelectorAll("[data-stop]")) { if (!el.closest(".b6t8-dim")) { el.removeAttribute("data-stop"); el.setAttribute("data-b6t8-off", ""); } }
  else for (const el of root.querySelectorAll("[data-b6t8-off]")) { el.removeAttribute("data-b6t8-off"); el.setAttribute("data-stop", ""); }
}

/* ---------- Call one: ten chats ---------- */
function b6t8TenPanel(clearOnCancel, walk) {
  const dockEl = dock2({ typed: B6T8_Q });
  const body = mainTab2({ transcript: [], chatName: "New chat", dockEl });
  const sub = body.nameRow.querySelector(".k2-sub");
  if (sub && sub.childNodes[1]) sub.childNodes[1].textContent = "not saved yet";
  const root = deckFrame({ body, header: false });
  root.classList.add("b6t8");
  dockEl.ask.setAttribute("data-start", "");
  const qam = root.querySelector(".qam");
  let open = null;
  const say = (...parts) => walk.replaceChildren(...parts);

  function close() {
    if (open) open.remove();
    open = null;
    b6t8Freeze(root, false);
  }
  function cancel(where) {
    close();
    if (clearOnCancel) { dockEl.field.textContent = "Describe the level, boss, or puzzle you're stuck on."; dockEl.field.classList.remove("typed"); }
    Deck.setRing(root, root.querySelector(".k2-cname"));
    say(h("b", {}, `${where}: `), "nothing is sent and no chat is deleted. ",
      clearOnCancel ? "The question box is empty; the question is gone." : "Your question is still in the box, ready to ask again.",
      " The ring goes back to the chat's name.");
  }
  function sent(label) {
    close();
    dockEl.field.textContent = "Describe the level, boss, or puzzle you're stuck on.";
    dockEl.field.classList.remove("typed");
    body.scroller.replaceChildren(h("div", { class: "k2-turn" }, qBubble2(B6T8_Q, { stop: false })));
    Deck.setRing(root, dockEl.field);
    say(h("b", {}, "Delete: "), `"${label}" is deleted, a fresh chat is made, and the question goes into it.`);
  }
  function showDelete(label) {
    close();
    const del = h("button", { class: "b6t8-glass", "data-stop": "", "data-row": "b6t8-del", onclick: () => sent(label) }, "Delete");
    const keep = h("button", { class: "b6t8-glass", "data-stop": "", "data-row": "b6t8-del", onclick: () => cancel("Cancel in the Delete chat? box") }, "Cancel");
    open = h("div", { class: "b6t8-dim" }, h("div", { class: "b6t8-box" },
      h("div", { class: "b6t8-title" }, "Delete chat?"),
      h("div", { class: "b6t8-words" }, `Delete "${label}" and its transcript? This cannot be undone.`),
      h("div", { class: "b6t8-two" }, del, keep)));
    b6t8Freeze(root, true);
    qam.append(open);
    open.b6t8where = "B in the Delete chat? box";
    Deck.setRing(root, keep);
    say("The Delete chat? box. The ring starts on Cancel, so a habit press of A keeps the chat.");
  }
  function showList() {
    const rows = B6T8_CHATS.map(([nm, when]) => h("button", { class: "b6t8-glass", "data-stop": "", onclick: () => showDelete(nm) },
      h("span", { class: "b6t8-nm" }, nm), h("span", { class: "b6t8-when" }, when)));
    const cancelBtn = h("button", { class: "b6t8-glass", "data-stop": "", onclick: () => cancel("Cancel in the list") }, "Cancel");
    open = h("div", { class: "b6t8-dim" }, h("div", { class: "b6t8-box" },
      h("div", { class: "b6t8-title" }, "You have 10 chats"),
      h("div", { class: "b6t8-words" }, "Pick a chat to delete to make room for the new one. You will be asked to confirm. B keeps all of them."),
      h("div", { class: "b6t8-list scroll" }, ...rows),
      h("div", { class: "b6t8-cancelrow" }, cancelBtn)));
    b6t8Freeze(root, true);
    qam.append(open);
    open.b6t8where = "B in the list";
    Deck.setRing(root, rows[0]);
    say("The \"You have 10 chats\" list. Down walks the chats; Cancel is last. Try Cancel or Esc (B).");
  }
  root.addEventListener("deckkey", (e) => {
    if (open && e.detail.key === "B") { e.preventDefault(); cancel(open.b6t8where); }
  });
  dockEl.ask.addEventListener("click", () => { if (!open) showList(); });
  return root;
}

/* ---------- Call two: Pyro's Agent suggestion chip ---------- */
function b6t8PyroPanel(tipInAnswer, walk) {
  const paras = [
    "Pyro gives a happy little bounce and taps the frame-rate counter with one glove.",
    "Pyro points at the Deck's quick settings: cap the frame rate at 40, then set the game's own limit to match. A small, delighted clap.",
  ];
  const ans = aBubble2(paras);
  if (tipInAnswer) {
    const p = h("p", { "data-stop": "" }, h("span", { class: "b6t8-same" }, B6T8_TIP));
    ans.insertBefore(p, ans.querySelector(".k2-bspeak"));
  }
  const turn = h("div", { class: "k2-turn" }, qBubble2("How do I fix stuttering?", { stop: false }), ans);
  const dockEl = dock2({});
  const inject = h("button", { class: "b6t8-inject", "data-stop": "", "aria-label": "Agent suggestion" },
    tipInAnswer ? h("span", { class: "b6t8-same" }, B6T8_TIP) : B6T8_TIP);
  dockEl.querySelector(".k2-chips").after(inject);
  const body = mainTab2({ transcript: [turn], chatName: "Stuttering help", dockEl });
  const root = deckFrame({ body, header: false });
  root.classList.add("b6t8");
  inject.setAttribute("data-start", "");
  inject.addEventListener("click", () => {
    dockEl.field.textContent = B6T8_TIP;
    dockEl.field.classList.add("typed");
    walk.replaceChildren(h("b", {}, "A on the chip: "), "its words go into the question box, ready to ask.");
  });
  return root;
}

/* ---------- For the eye: Ask anyway ---------- */
function b6t8AnywayPanel(busyAtPress, walk) {
  const warn = "Not enough free memory to start the AI. The Deck has about 5,200 MB free and the AI needs about 4,100 MB, so loading it would leave only about 1,100 MB (bonsAI keeps at least 2,000 MB back). To make room, close the game, pick a smaller model on the Ollama tab, or use the AI on a PC. Asking anyway may freeze the Deck.";
  const turn = h("div", { class: "k2-turn" }, qBubble2(SAMPLE.q, { stop: false }), aBubble2([warn], { stopEach: false }));
  const btn = h("button", { class: "b6t8-glass b6t8-any", "data-stop": "", "data-start": "" }, "Ask anyway");
  const row = h("div", { class: "b6t8-anyrow" }, btn);
  const body = mainTab2({ transcript: [turn, row], chatName: "Hollow Knight help", dockEl: dock2({}) });
  const root = deckFrame({ body, header: false });
  root.classList.add("b6t8");
  let pressed = false;
  btn.addEventListener("click", () => {
    if (pressed) return;
    pressed = true;
    if (busyAtPress) { btn.textContent = "Asking…"; btn.classList.add("b6t8-busy"); }
    walk.replaceChildren(busyAtPress ? "Pressed: the button says Asking… at once." : "Pressed: nothing on the screen changes yet.");
    setTimeout(() => {
      row.replaceWith(h("div", { class: "b6t8-wait" }, "(the question goes again; the answer would start here)"));
      walk.replaceChildren(`${B6T8_SLOW_MS / 1000} s later (drawn; the real wait varies): the row goes away and the question goes again.`);
    }, B6T8_SLOW_MS);
  });
  return root;
}

TABS.push({
  id: "t8", n: 8, name: "Three small ones", stars: 1,
  title: "Three small ones on Main: ten chats, Pyro's chip, Ask anyway",
  today: [
    "With ten chats saved and none open, pressing Ask first opens the \"You have 10 chats\" list, so you can delete one to make room. Cancel or B sends nothing. Right now your question stays in the box.",
    "With the Pyro character, about 3 answers in 10 end with a fixed suggestion line, and the same line shows as a chip under the suggestion chips. Seen on the Deck: the answer's last line was the bare chip words, so it read like a copy.",
  ],
  deciding: [
    "Ten chats: after Cancel or B, does your question stay in the box (1A, as built now, but not yet your word) or is the box cleared (1B)?",
    "Pyro: keep the line in the answer and on the chip (Today), or show it on the chip only (2A)?",
    "Not a choice: the last two panels show a change being built this session, the low-memory warning's Ask anyway button.",
  ],
  howto: "Click a panel, then use the arrow keys, Enter as A and Esc as B. In the ten-chats panels the ring starts on Ask: press Enter, then try Cancel, Esc, or pick a chat and Delete. In the Pyro panels the ring starts on the Agent suggestion chip; the words that repeat have a faint yellow mark (not part of the design). Start again resets a panel. The ten chat names and the Pyro answer are made up for the drawing; every button and box word is the plugin's own.",
  options: [
    { id: "1A", group: "c1", groupTitle: "Call one: ten chats saved and none open", label: "1A", title: "Cancel or B: the question stays in the box",
      desc: "What is built now. After Cancel or B, in the list or in the Delete chat? box, nothing is sent and your question is still typed, so one press of Ask tries again.",
      build: () => b6t8Resettable((w) => b6t8TenPanel(false, w), "Press Enter on Ask.") },
    { id: "1B", group: "c1", label: "1B", title: "Cancel or B: the box is cleared",
      desc: "After Cancel or B nothing is sent and the question is gone too, so the screen is back to an empty box. To ask it again you type it again.",
      build: () => b6t8Resettable((w) => b6t8TenPanel(true, w), "Press Enter on Ask.") },
    { id: "2today", group: "c2", groupTitle: "Call two: the Pyro character's Agent suggestion chip", label: "Today", today: true, title: "The line ends the answer and is on the chip",
      desc: "The AI is told to end with the suggestion, in character, and the same words show on the chip. When the AI writes it bare, as on the Deck, it looks like a copy.",
      build: () => b6t8Resettable((w) => b6t8PyroPanel(true, w), "Press Enter on the chip, or Up to read the answer.") },
    { id: "2A", group: "c2", label: "2A", title: "The chip only",
      desc: "The AI is no longer told to end with the line. The answer is just the answer; the suggestion shows only on the chip. One fewer line in the answer.",
      build: () => b6t8Resettable((w) => b6t8PyroPanel(false, w), "Press Enter on the chip, or Up to read the answer.") },
    { id: "eyeToday", group: "eye", groupTitle: "For the eye only, not a choice: Ask anyway (being built this session)", label: "Today", today: true, title: "Ask anyway does not change when pressed",
      desc: "Under the low-memory warning, pressing Ask anyway shows nothing until the question goes again, so it is not clear the press was taken. A second press does nothing. The memory numbers are an example.",
      build: () => b6t8Resettable((w) => b6t8AnywayPanel(false, w), "Press Enter on Ask anyway.") },
    { id: "eyeNew", group: "eye", label: "Built", title: "Being built this session: it reads \"Asking…\" from the press",
      desc: "The same button changes to Asking… the moment it is pressed, until the question goes again.",
      build: () => [h("span", { class: "b6t8-built" }, "Being built this session"), ...b6t8Resettable((w) => b6t8AnywayPanel(true, w), "Press Enter on Ask anyway.")] },
  ],
});
