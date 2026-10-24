/* ============================================================
   Tab 8, round 2: search, in the new layout (21-kit2.js), built from round 1's pieces (49-search.js).
   Round 1 picks: A (find in the chats menu), C ("You asked this before"), D (a Search tab)
   and Wild 2 (Y searches everything). Not B (a find line inside "N earlier") or Wild 1 (say "find").
   Tab 7's round 2 asked for one place that holds your notes for every game; the Search tab
   in B and C is that place.
   ============================================================ */
const S_TABS2 = [TABS2[0], ["Search", "search"], ...TABS2.slice(1)];
const S_NOTES_ALL = [
  { text: "I'm on a Steel Soul run (one life).", game: "Hollow Knight", on: true },
  { text: "No spoilers past the City of Tears.", game: "Hollow Knight", on: true },
  { text: "Skip the story bits; I've seen them.", game: "Hades", on: true },
  { text: "I play with the back buttons mapped to dash.", game: null, on: false },
];
const S_GAMES2 = [["All", null], ["Hollow Knight", [0, 7]], ["Half-Life 2", [1]], ["Hades", [2]]];

/* The Search tab: one box for chats, settings, your notes and game notes, a game row,
   and, before you pick a word, every note you have kept */
function sSearchTab2(ctx, { onBack }) {
  const { root } = ctx;
  const all = S_CHATS.map((_, i) => i);
  const notes = S_NOTES_ALL.map((n) => ({ ...n }));
  let game = 0, finderEl = null, notesSec = null;
  const inGame = (sub) => !S_GAMES2[game][1] || sub.includes(S_GAMES2[game][0]) || /every game|Steam|bonsAI/.test(sub);
  const list = (label, icon, rows, w, say) => {
    const hits = rows.filter(([t, s]) => inGame(s) && (t + " " + s).toLowerCase().includes(w)).map(([t, s]) => ({ html: sMark(t, w), sub: s, go: () => toast(ctx.panel, say(t), 1800) }));
    return hits.length ? [{ label, icon, hits }] : [];
  };
  function show(keepRing) {
    const sc = h("div", { class: "scroll s-tabpage" });
    if (!finderEl) {
      finderEl = sFinder(ctx, {
        words: [{ w: "mantis" }, { w: "soul" }, { w: "battery" }, { w: "stutter" }, { w: "charm" }, { w: "boss" }, { w: "story" }, { w: "dash" }],
        placeholder: "Chats, settings, notes…",
        groups: (w) => {
          const chats = sChatGroups(ctx, S_GAMES2[game][1] || all, w);
          const merged = chats.length ? [{ label: "Your chats", icon: "chat", hits: chats.flatMap((g) => g.hits.map((x) => ({ ...x, sub: g.label + " · " + x.sub }))) }] : [];
          return [...merged,
            ...list("Your notes", "note", notes.map((n) => [n.text, "Your note · " + (n.game || "every game")]), w, () => "Opens your note: switch it off, change it, or remove it."),
            ...list("Settings", "gear", S_SETTINGS, w, (t) => `Opens “${t}” where it lives.`),
            ...list("Game and help notes", "book", S_KB, w, (t) => `Shows the note “${t}”, in its own words.`)];
        },
        note: "One box for your chats, the settings bonsAI can open, your own notes and its game notes. Pick a word, or a game first.",
      });
      new MutationObserver(() => { if (notesSec) notesSec.hidden = !!$(".s-count", finderEl); }).observe(finderEl, { childList: true, subtree: true });
    }
    const gameRow = h("div", { class: "s-games" }, ...S_GAMES2.map(([g], k) => {
      const b = h("button", { class: "s-game" + (k === game ? " on" : ""), "data-stop": "", "data-row": "g2" + ctx.uid }, g);
      b.addEventListener("click", () => { game = k; for (const x of $$(".s-game", gameRow)) x.classList.toggle("on", x === b); drawNotes(); const w = $(".s-word.on", finderEl); if (w) w.click(); else Deck.setRing(root, b); });
      return b;
    }));
    // every note you kept, for every game, lives here; it steps aside while a word is picked
    notesSec = h("div", { class: "s2-notes" });
    function drawNotes(ring) {
      const shown = notes.map((n, i) => [n, i]).filter(([n]) => !S_GAMES2[game][1] || !n.game || n.game === S_GAMES2[game][0]);
      notesSec.replaceChildren(h("div", { class: "s-group" }, h("span", { class: "s-gi", html: ICONS2.note }), "Your notes", h("small", {}, `${notes.filter((n) => n.on).length} on`)),
        ...shown.map(([n, i]) => {
          const r = h("button", { class: "note-row" + (n.on ? " on" : ""), "data-stop": "", "data-i": i }, h("span", { class: "ico pin", html: ICONS.pin }),
            h("span", { class: "grow" }, n.text, h("small", {}, n.game || "Every game")), h("span", { class: "q-toggle" + (n.on ? " on" : "") }));
          r.addEventListener("click", () => { n.on = !n.on; drawNotes(i); });
          return r;
        }),
        h("p", { class: "s-hint" }, "Ask reads the ones that are on. New notes come from what you say in a chat."));
      if (ring != null) Deck.setRing(root, $(`.note-row[data-i="${ring}"]`, notesSec), { scroll: false });
    }
    drawNotes();
    notesSec.hidden = !!$(".s-count", finderEl);
    sc.append(h("div", { class: "s-tabtitle" }, "Search"), gameRow, finderEl, notesSec);
    ctx.holder.replaceChildren(tabBar2(1, S_TABS2), h("div", { class: "k2-gap" }), sc);
    sc.addEventListener("deckkey", (e) => { if (e.detail.key === "B") { e.preventDefault(); onBack(); } });
    // a jump draws the Main tab; its Back returns here with the same word
    ctx.beforeJump = () => sMain(ctx, { chat: 0, tabs: S_TABS2, tab: 0 });
    ctx.afterBack = () => show(true);
    Deck.setRing(root, keepRing ? ($(".s-hit", finderEl) || finderEl.box) : finderEl.box, { scroll: false });
  }
  return show;
}

function searchR2Mock(kind) {
  const ctx = sCtx();
  const { root } = ctx;
  const withTab = kind !== "small";
  let openSearch = null;

  function drawMain(ringSel) {
    ctx.beforeJump = null; ctx.afterBack = null;
    sMain(ctx, { chat: 0, tabs: withTab ? S_TABS2 : TABS2, tab: 0 });
    sNewestView(ctx);
    if (kind !== "tab") {
      ctx.onName = () => sChatsMenu(ctx, { find: true });
      sAskedWire(ctx);
    } else ctx.dk.field.removeAttribute("data-start");
    if (withTab) {
      const hint = h("button", { class: "s-yhint", "data-stop": "" }, h("b", {}, "Y"), "Search");
      hint.addEventListener("click", () => openSearch(false));
      ctx.sc.prepend(hint);
      if (kind === "tab") hint.setAttribute("data-start", "");
    }
    if (ringSel) Deck.setRing(root, $(ringSel, root));
  }
  if (withTab) {
    openSearch = sSearchTab2(ctx, { onBack: () => drawMain(".s-yhint") });
    root.addEventListener("deckkey", (e) => { if (e.detail.key === "Y" && !$(".s-tabpage", root)) { e.preventDefault(); openSearch(false); } });
  }
  drawMain();
  return root;
}

const SEARCH_R2_OPTIONS = [
  { id: "2A", group: "r2", groupTitle: "Round 2: the four you liked, put together", label: "A", title: "Small: find in the chats menu, and “You asked this before”", desc: "Round 1's A and C together, with nothing new on screen. Type a question you asked before and the old one shows above the box. Or press A on the chat's name: “Find in your chats” sits at the top of the chats menu.", build: () => searchR2Mock("small") },
  { id: "2B", group: "r2", label: "B", title: "Big: a Search tab, and Y opens it", desc: "Round 1's D and Wild 2 together. Press Y anywhere on Main, or walk to the Search tab. One box finds your chats, settings, your notes and game notes, and a row of games narrows it. Before you pick a word, the tab lists every note you have kept, for every game: the notes home you asked for on tab 7.", build: () => searchR2Mock("tab") },
  { id: "2C", group: "r2", label: "C", title: "Both: A on Main, B for everything", desc: "The small pieces stay on Main for the quick case (finding a chat, or noticing a repeat question). Y and the Search tab are for everything else, and they hold your notes.", build: () => searchR2Mock("both") },
];

/* Put round 2 on top of tab 8; round 1 stays below with its picks */
(() => {
  const t8 = TABS.find((t) => t.id === "t8");
  t8.title = "Search in bonsAI, round 2";
  t8.today = [
    "Round 1: you liked find in the chats menu (A), “You asked this before” (C), a Search tab (D), and Y searching everything (Wild 2). Not a find line inside “N earlier”, and not saying “find”.",
    "On tab 7 you asked for one place that holds your notes for every game. The Search tab below is that place: before you pick a word it lists them all, with on and off switches.",
    "You called search a bigger feature for a later release (about 0.7.0). The small version (A) could come sooner, since it adds nothing new to the screen.",
  ];
  t8.deciding = [
    "Small (A), big (B), or both (C).",
    "Is the Search tab the right home for your notes, or should notes have their own spot?",
  ];
  t8.howto = "In A press A on the question box (a question you asked before is typed for you), or A on the chat's name for <b>Find in your chats</b>. In B and C press <b>Y</b>, or A on the Y Search line, then pick a word or a game. A on a match jumps to it; <b>Back to where you were</b> brings you back. B leaves the Search tab. Round 1 is further down, with your picks.";
  t8.options = [...SEARCH_R2_OPTIONS, ...t8.options.map((o, i) => ({ ...o, group: "r1", groupTitle: i === 0 ? "Round 1 (your earlier picks)" : undefined }))];
})();
