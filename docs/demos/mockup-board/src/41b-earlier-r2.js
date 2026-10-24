/* ============================================================
   Tab 1, round 2: narrowing "N earlier", drawn in the new layout (21-kit2.js).
   What shipped 2026-10-08: day lines, oldest day first; a day opens six questions,
   then "Show 6 more". Round 1 picks: A (six at a time, now built), B (pages, "over-engineered"),
   Wild 2 (split by game, "better organization"). So round 2 is about games inside the list.
   Each saved question already remembers its game, so no new data is needed for any of these.
   ============================================================ */
const E2_STEP = 6;
const e2Game = (q) => (q.game === "Deck" ? "No game" : q.game);
const e2Short = (g) => (g === "Deep Rock Galactic: Survivor" ? "Deep Rock" : g);
/* Games in the order they first appear, with their questions */
function e2ByGame(items) {
  const m = new Map();
  for (const q of items) { const g = e2Game(q); if (!m.has(g)) m.set(g, []); m.get(g).push(q); }
  return [...m.entries()];
}

/* An older question as a closed row; A opens its answer under it */
function e2Row(q, { tag = "", stamp = "" } = {}) {
  const row = h("div", { class: "s-old" });
  const b = h("div", { class: "k2-q old", "data-stop": "" }, h("span", { class: "k2-redo", html: ICONS2.redo }), h("span", { class: "k2-qt" }, cut60(q.text)),
    tag ? h("span", { class: "e2-tag" }, tag) : "", stamp ? h("span", { class: "e2-tag" }, stamp) : "");
  b.addEventListener("click", () => {
    const open = $(".k2-answer", row);
    if (open) { open.remove(); b.classList.add("old"); return; }
    b.classList.remove("old");
    row.append(aBubble2([`(The answer to “${q.text}” opens here, as it does today.)`], { stopEach: false }));
  });
  row.append(b);
  return row;
}

/* Fill a list six at a time, with "Show 6 more" at the end; label(q, prev) may add a quiet line before a row */
function e2Fill(root, list, items, { rowOpts = () => ({}), label = null } = {}) {
  let shown = 0;
  const draw = (ringFirstNew) => {
    const before = shown;
    shown = Math.min(items.length, shown + E2_STEP);
    list.replaceChildren();
    items.slice(0, shown).forEach((q, i) => {
      const l = label && label(q, items[i - 1]);
      if (l) list.append(h("div", { class: "e2-label" }, l));
      list.append(e2Row(q, rowOpts(q)));
    });
    if (shown < items.length) {
      const more = earlierLine2(`Show ${Math.min(E2_STEP, items.length - shown)} more`, { cls: "more" });
      more.addEventListener("click", () => draw(true));
      list.append(more);
    }
    const target = ringFirstNew ? $$(".k2-q", list)[before] : $(".k2-q", list);
    if (target) Deck.setRing(root, target);
  };
  draw(false);
}

/* A line that opens and closes what sits under it */
function e2Opener(root, text, body, { cls = "day", onOpen } = {}) {
  const line = earlierLine2(text, { open: false, cls });
  body.hidden = true;
  line.addEventListener("click", () => {
    body.hidden = !body.hidden;
    $(".k2-echev", line).textContent = body.hidden ? "▸" : "▾";
    if (!body.hidden) onOpen ? onOpen() : Deck.setRing(root, $("[data-stop]", body) || line);
  });
  body.addEventListener("deckkey", (e) => { if (e.detail.key === "B" && !body.hidden) { e.preventDefault(); e.stopPropagation(); body.hidden = true; $(".k2-echev", line).textContent = "▸"; Deck.setRing(root, line); } });
  return [line, body];
}

function earlierR2Mock(kind) {
  const holder = h("div", { style: "display:contents" });
  const root = deckFrame({ body: holder, header: false });
  const body = mainTab2({ chatName: "Hollow Knight help", chatNo: 1, chatCount: 5, dockEl: dock2() });
  holder.append(body);
  const sc = body.scroller;
  const total = EARLIER_DAYS.reduce((n, d) => n + d.items.length, 0);

  const box = h("div", { class: "s-days" });
  const top = earlierLine2(`${total} earlier`, { open: false });
  top.setAttribute("data-start", "");
  let mode = "day"; // the wild option flips this with Left and Right

  function dayView() {
    const out = [];
    for (const day of EARLIER_DAYS) {
      const inner = h("div", { class: "s-rows" });
      const games = e2ByGame(day.items);
      const split = (kind === "split" && day.items.length > E2_STEP && games.length > 1);
      const [line, b] = e2Opener(root, `${day.label} · ${day.items.length}`, inner, {
        onOpen: () => {
          if (split) {
            // a busy day: one line per game, each opens six at a time
            inner.replaceChildren(...games.flatMap(([g, qs]) => {
              const list = h("div", { class: "s-rows" });
              return e2Opener(root, `${g} · ${qs.length}`, list, { cls: "more e2-game", onOpen: () => e2Fill(root, list, qs) });
            }));
            Deck.setRing(root, $("[data-stop]", inner));
          } else if (kind === "tags") {
            // same six at a time, but each game's questions run together under a quiet label
            const sorted = games.flatMap(([, qs]) => qs);
            const list = h("div", { class: "s-rows" });
            inner.replaceChildren(list);
            e2Fill(root, list, sorted, { label: (q, prev) => (!prev || e2Game(prev) !== e2Game(q) ? `${e2Game(q)} · ${games.find(([g]) => g === e2Game(q))[1].length}` : null) });
          } else if (kind === "chips") {
            // game buttons at the top of the open day; A on one shows only that game
            const list = h("div", { class: "s-rows" });
            const chips = h("div", { class: "e2-chips" });
            const opts = [["All", day.items], ...games];
            opts.forEach(([g, qs], k) => {
              const c = h("button", { class: "e2-chip" + (k === 0 ? " on" : ""), "data-stop": "", "data-row": "e2c" + day.label }, e2Short(g), h("small", {}, String(qs.length)));
              c.addEventListener("click", () => { for (const x of $$(".e2-chip", chips)) x.classList.toggle("on", x === c); e2Fill(root, list, qs, { rowOpts: (q) => ({ tag: k === 0 ? e2Short(e2Game(q)) : "" }) }); });
              chips.append(c);
            });
            inner.replaceChildren(games.length > 1 ? chips : "", list);
            e2Fill(root, list, day.items, { rowOpts: (q) => ({ tag: games.length > 1 ? e2Short(e2Game(q)) : "" }) });
            if (games.length > 1) Deck.setRing(root, $(".e2-chip", chips));
          } else {
            const list = h("div", { class: "s-rows" });
            inner.replaceChildren(list);
            e2Fill(root, list, day.items);
          }
        },
      });
      out.push(line, b);
    }
    return out;
  }

  function gameView() {
    const all = EARLIER_DAYS.flatMap((d) => d.items.map((q) => ({ ...q, day: d.label })));
    return e2ByGame(all).flatMap(([g, qs]) => {
      const list = h("div", { class: "s-rows" });
      return e2Opener(root, `${g} · ${qs.length}`, list, { onOpen: () => e2Fill(root, list, qs, { rowOpts: (q) => ({ stamp: q.day }) }) });
    });
  }

  function drawBox() {
    box.replaceChildren(...(mode === "day" ? dayView() : gameView()));
    if (kind === "flip") $(".k2-epill", top).textContent = `${total} earlier · by ${mode}`;
  }
  drawBox();
  const wrap = box;
  wrap.hidden = true;
  top.addEventListener("click", () => {
    wrap.hidden = !wrap.hidden;
    $(".k2-echev", top).textContent = wrap.hidden ? "▸" : "▾";
    if (!wrap.hidden) Deck.setRing(root, $("[data-stop]", box));
  });
  wrap.addEventListener("deckkey", (e) => { if (e.detail.key === "B" && !wrap.hidden) { e.preventDefault(); wrap.hidden = true; $(".k2-echev", top).textContent = "▸"; Deck.setRing(root, top); } });
  if (kind === "flip") {
    top.append(h("span", { class: "e2-flip" }, "‹ ›"));
    top.addEventListener("deckkey", (e) => {
      if (e.detail.key !== "Left" && e.detail.key !== "Right") return;
      e.preventDefault();
      mode = mode === "day" ? "game" : "day";
      drawBox();
      toast(root.querySelector(".qam"), mode === "game" ? "Now grouped by game" : "Now grouped by day", 1100);
    });
    $(".k2-epill", top).textContent = `${total} earlier · by day`;
  }

  const newest = h("div", { class: "k2-turn" }, qBubble2("how do i beat the boss in the city of tears"),
    aBubble2(["That's the <b>Soul Master</b>. Watch for him to stop and charge his orb: that is the moment to hit.", "When he dives at the floor, dash to the side and strike as he comes back up."]));
  sc.append(top, wrap, newest);
  return root;
}

const EARLIER_R2_OPTIONS = [
  { id: "2now", group: "r2", groupTitle: "Round 2: games inside the list (new layout)", label: "Now", today: true, title: "What shipped on 8 October", desc: "Day lines, oldest first. A day opens six questions, then “Show 6 more”. Open “Sat 3 Oct · 64” to see a busy day mix four games.", build: () => earlierR2Mock("now") },
  { id: "2A", group: "r2", label: "A", title: "A busy day splits by game", desc: "Only a day with more than six questions and more than one game splits: “Hollow Knight · 19”, “Hades · 16” and so on, each opening six at a time. Small days open straight away, as now.", build: () => earlierR2Mock("split") },
  { id: "2B", group: "r2", label: "B", title: "Each game's questions sit together", desc: "No extra press. The day still opens six at a time, but its questions are sorted by game, with a quiet game label above each run.", build: () => earlierR2Mock("tags") },
  { id: "2C", group: "r2", label: "C", title: "Game buttons in the open day", desc: "An open day starts with a row of buttons: All, Hollow Knight, Hades, Deep Rock, No game. A on one shows only that game's questions, six at a time. Each row also carries its game.", build: () => earlierR2Mock("chips") },
  { id: "2W", group: "r2", label: "Wild", wild: true, title: "Flip between days and games", desc: "Left or Right on “86 earlier” flips the whole list: by day, as now, or one line per game across every day, each question stamped with its day.", build: () => earlierR2Mock("flip") },
];

/* Put round 2 on top of tab 1; round 1 stays below with its picks */
(() => {
  const t1 = TABS.find((t) => t.id === "t1");
  t1.title = "“N earlier”: six at a time shipped; now, how games fit in";
  t1.today = [
    "Shipped 8 October: a day line opens six questions, then “Show 6 more”. That is round 1's option A, which you liked.",
    "You also liked splitting a day by game (“better organization”). A busy day mixes games: the sample Saturday has 64 questions across Hollow Knight, Hades, Deep Rock and no game at all.",
    "Each saved question already remembers which game it was asked in, so every option here works with the chats people already have.",
  ];
  t1.deciding = [
    "Whether games show up inside the list at all.",
    "If so: an extra line per game, labels with no extra press, game buttons, or flipping the whole list.",
    "Pages (round 1's B) are left out: you called them too much for this list, and search (tab 8) covers finding things.",
  ];
  t1.howto = "Press A on <b>86 earlier</b>, then A on <b>Sat 3 Oct · 64</b>. B closes what you last opened. Round 1 is further down, with your picks.";
  t1.options = [...EARLIER_R2_OPTIONS, ...t1.options.map((o, i) => ({ ...o, group: "r1", groupTitle: i === 0 ? "Round 1 (your earlier picks)" : undefined }))];
})();
