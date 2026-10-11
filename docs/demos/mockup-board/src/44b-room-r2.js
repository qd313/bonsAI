/* ============================================================
   Tab 4, round 2: how far Text size reaches, drawn in the new layout (21-kit2.js).
   Round 1 was skipped as out of date: since it was drawn, the room half shipped (plan 84,
   2026-10-09) and the Text size row shipped (2026-10-10: Small / Normal / Large in Settings,
   answer 10.8 / 12 / 13.8 px, question 9.9 / 11 / 12.65). It changes only the chat's words;
   the maintainer wants it to reach all the text if possible. That reach is the one question left.
   ============================================================ */
const T4_SIZES = [["Small", 0.9], ["Normal", 1], ["Large", 1.15]];

/* The Settings tab in the new layout, with the Text size row that changes this panel */
function t4Settings(size, setSize) {
  const sizes = h("div", { class: "t4-sizes" }, ...T4_SIZES.map(([n], k) => {
    const b = h("button", { class: "t4-sz" + (k === size ? " on" : ""), "data-stop": "", "data-row": "t4sz" }, n);
    b.addEventListener("click", () => setSize(k, true));
    return b;
  }));
  return h("div", { class: "t4-settings" }, tabBar2(2), h("div", { class: "k2-gap" }),
    h("div", { class: "scroll t4-set-in" },
      h("div", { class: "q-section-title" }, "Screen"),
      h("div", { class: "q-row", "data-stop": "" }, h("span", { class: "grow" }, "Screenshot quality", h("small", {}, "Smaller is faster to send")), h("b", {}, "Medium")),
      h("div", { class: "q-row t4-textrow" }, h("span", { class: "grow" }, "Text size", h("small", {}, "How big the words are")), sizes),
      h("div", { class: "q-section-title" }, "Answers"),
      h("div", { class: "q-row", "data-stop": "" }, h("span", { class: "grow" }, "Voice replies", h("small", {}, "Read answers aloud")), h("b", {}, "When I ask by voice")),
      h("div", { class: "q-row", "data-stop": "" }, h("span", { class: "grow" }, "Keep answers to reuse", h("small", {}, "Asking again is instant")), h("span", { class: "q-toggle on" })),
      h("div", { class: "q-row", "data-stop": "" }, h("span", { class: "grow" }, "Hide spoilers", h("small", {}, "Covers story reveals until you open them")), h("span", { class: "q-toggle on" }))));
}

function roomR2Mock(reach, size, view, setSize) {
  const holder = h("div", { style: "display:contents" });
  const root = deckFrame({ body: holder, header: false });
  root.classList.add("t4r2", "reach-" + reach);
  root.style.setProperty("--ts", T4_SIZES[size][1]);
  if (view === "settings") {
    holder.append(t4Settings(size, setSize));
    $(".t4-sz.on", root).setAttribute("data-start", "");
  } else {
    const dk = dock2({ game: "Hollow Knight", mode: "Strategy", chips: ["Charms for this fight", "Recommended controls"] });
    const body = mainTab2({ chatName: "How do I beat False Knight", chatNo: 2, chatCount: 5, dockEl: dk,
      transcript: [earlierLine2("12 earlier", { open: false }), h("div", { class: "k2-turn" }, qBubble2(FINISH_Q), aBubble2(FINISH_A.slice(0, 3)))] });
    holder.append(body);
    $("[data-start]", root)?.removeAttribute("data-start");
    $(".k2-answer p", root).setAttribute("data-start", "");
  }
  return root;
}

function roomR2Card(reach) {
  return () => {
    let size = 2, view = "main";
    const holder = h("div", { class: "deck-swap" });
    const radio = (label, items, get, set) => {
      const g = h("div", { class: "scen", role: "radiogroup", "aria-label": label }, h("span", {}, label + ":"),
        ...items.map((name, k) => {
          const b = h("button", { type: "button", role: "radio", "aria-checked": String(k === get()) }, name);
          b.addEventListener("click", () => set(k));
          return b;
        }));
      g.sync = () => $$("button", g).forEach((b, k) => b.setAttribute("aria-checked", String(k === get())));
      return g;
    };
    const setSize = (k, fromPanel) => {
      size = k; sizePick.sync(); draw();
      if (fromPanel) { const root = $(".deck", holder); Deck.setRing(root, $(".t4-sz.on", root), { scroll: false }); }
    };
    const sizePick = radio("Text size", T4_SIZES.map(([n]) => n), () => size, (k) => setSize(k));
    const viewPick = radio("Show", ["Main tab", "Settings tab"], () => (view === "main" ? 0 : 1), (k) => { view = k ? "settings" : "main"; viewPick.sync(); draw(); });
    const draw = () => holder.replaceChildren(roomR2Mock(reach, size, view, setSize));
    draw();
    return [h("div", { class: "t4-picks" }, sizePick, viewPick), holder];
  };
}

const ROOM_R2_OPTIONS = [
  { id: "2now", group: "r2", groupTitle: "Round 2: how far Text size reaches", label: "Now", today: true, title: "What ships now: the chat's words only", desc: "Since 10 October. The answer and your question grow on Large and shrink on Small. Everything else, including the chips, the question box, the chat's name, the tab bar and every other tab, stays the same size.", build: roomR2Card("chat") },
  { id: "2A", group: "r2", label: "A", title: "The whole Main tab", desc: "The chips, the question box, the game tag, Ask and the chat's name grow too. The tab bar and the other tabs stay as they are. The rows keep their heights, so nothing moves and the chat keeps its room.", build: roomR2Card("main") },
  { id: "2B", group: "r2", label: "B", title: "Everything, every tab", desc: "A, plus the tab bar, the small LT and RT keys, and every word on the other tabs, Settings included. Pick Settings tab above the panel to see it, and try the Text size buttons there.", build: roomR2Card("all") },
];

/* Put round 2 on top of tab 4; round 1 stays below, drawn before both halves shipped */
(() => {
  const t4 = TABS.find((t) => t.id === "t4");
  t4.title = "Text size, round 2: how far it reaches";
  t4.today = [
    "Both halves of round 1 have shipped since it was drawn. The chat got its room on 9 October: an answer has 295 points of height now, up from 204. The Text size row came on 10 October: Small, Normal and Large in Settings.",
    "Text size changes only the chat's words today. You said you want it to change all the text in the plugin if possible. That is the one question left here.",
    "The rows keep their heights in every option, so bigger words never push the chat smaller.",
  ];
  t4.deciding = [
    "The whole Main tab (A), or everything on every tab (B).",
  ];
  t4.howto = "Pick a text size above each panel, and Main tab or Settings tab. On the Settings tab, the Text size buttons in the panel work too. Round 1 is further down; it was drawn before both halves shipped.";
  delete t4.controls;
  delete t4.onShow;
  t4.options = [...ROOM_R2_OPTIONS, ...t4.options.map((o, i) => ({ ...o, group: "r1", groupTitle: i === 0 ? "Round 1 (drawn before the room and Text size shipped)" : undefined }))];
})();
