/* ============================================================
   Tab 2, round 2: the AI models box, narrowed to what was liked in round 1:
   B (filters always in a column beside the list) and Wild 2 (answer three questions).
   Both remove the hidden filters step, so the Done trap cannot happen in any of these.
   Same box as round 1 (full Deck screen 853 x 533, box about 658 x 418); plan 84 did not touch it.
   ============================================================ */
const M2_ASK = [["Quick tips", ["Speed"]], ["Long plans", ["Strategy", "Expert"]], ["Screenshots", ["Vision"]], ["Anything", []]];
const M2_ROOM = [["Small", 2.5, "up to 2.5 GB"], ["Medium", 5, "up to 5 GB"], ["Any size", Infinity, "no limit"]];
const M2_LIC = [["Open source", "the models you can read and change"], ["Open-weight too", "free to use, rules on reuse"]];

function m2Filter(st) {
  return MODELS.filter((m) => {
    if (st.lic === 0 && m.tier > 1) return false;
    if (st.modes.size && !m.modes.some((x) => st.modes.has(x))) return false;
    if (m.gb > M2_ROOM[st.room][1]) return false;
    if (st.installed && !m.installed) return false;
    if (st.essentials && m.group !== "Deck essentials") return false;
    if (st.recent && !m.isNew) return false;
    return true;
  });
}
const m2Start = () => ({ lic: 1, modes: new Set(), room: 2, installed: false, essentials: false, recent: false, ask: 3 });

function modelsBox2(kind) {
  let st = m2Start();
  let view = "list"; // list | questions | closed
  let qStep = 0;
  const box = h("div", { class: "mbox" });
  const root = deckScreen(box);

  /* Right from the column goes to the list; Left from the list comes back to where you were in the column */
  let lastSide = null;
  root.addEventListener("deckkey", (e) => {
    const cur = e.detail.stop;
    if (!cur) return;
    if (e.detail.key === "Right" && cur.closest(".m2-side") && !cur.dataset.row) {
      const first = $(".m2-list [data-stop]", box);
      if (first) { e.preventDefault(); lastSide = cur.dataset.key; Deck.setRing(root, first); }
    } else if (e.detail.key === "Left" && cur.closest(".m2-list")) {
      const back = (lastSide && $(`.m2-side [data-key="${lastSide}"]`, box)) || $(".m2-side [data-stop]", box);
      if (back) { e.preventDefault(); Deck.setRing(root, back); }
    } else if (e.detail.key === "B" && view === "questions") {
      e.preventDefault(); view = "list"; render(".m2-help");
    } else if (e.detail.key === "B" && view === "list") {
      e.preventDefault(); view = "closed"; render();
    }
  });

  const row = (key, label, on, onClick, { sub = "", radio = false, count = null } = {}) => {
    const b = h("button", { class: "fl-row m2-row" + (on ? " on" : ""), "data-stop": "", "data-key": key },
      h("span", { class: "tick" }, on ? (radio ? "●" : "✔") : radio ? "○" : ""), h("span", { class: "m2-l" }, label, sub ? h("small", {}, sub) : ""),
      count != null ? h("span", { class: "m2-n" }, String(count)) : "");
    b.addEventListener("click", () => { onClick(); render(`[data-key="${key}"]`); });
    return b;
  };
  const title = (t) => h("div", { class: "fl-title" }, t);

  function columnFilters() {
    // round 1's B, tidied: what matches up top, counts beside each choice, the groups in the order people use them
    const n = m2Filter(st).length;
    const clear = h("button", { class: "m2-clear", "data-stop": "", "data-key": "clear", "data-row": "m2top" }, "Clear");
    clear.addEventListener("click", () => { st = m2Start(); render(".m2-clear"); });
    const out = [h("div", { class: "m2-top" }, h("b", {}, `${n} ${n === 1 ? "model" : "models"} match`), clear)];
    if (kind === "help") {
      const help = h("button", { class: "q-btn m2-help", "data-stop": "", "data-key": "help" }, "Help me choose…");
      help.addEventListener("click", () => { view = "questions"; qStep = 0; render(".m2-pill"); });
      out.push(help);
    }
    out.push(title("LICENCE"));
    M2_LIC.forEach(([l], k) => out.push(row("lic" + k, l, st.lic === k, () => { st.lic = k; }, { radio: true })));
    out.push(title("GOOD FOR"));
    for (const m of MODE_NAMES) {
      const c = MODELS.filter((x) => x.modes.includes(m) && (st.lic === 1 || x.tier === 1)).length;
      out.push(row("m-" + m, m, st.modes.has(m), () => { st.modes.has(m) ? st.modes.delete(m) : st.modes.add(m); }, { count: c }));
    }
    out.push(title("SHOW"));
    out.push(row("inst", "Installed only", st.installed, () => { st.installed = !st.installed; }));
    out.push(row("ess", "Deck essentials only", st.essentials, () => { st.essentials = !st.essentials; }));
    out.push(row("new", "Recently added", st.recent, () => { st.recent = !st.recent; }));
    return out;
  }

  function columnQuestions() {
    // Wild 2's three questions, living in the column for good
    const n = m2Filter(st).length;
    const out = [h("div", { class: "m2-top" }, h("b", {}, `${n} ${n === 1 ? "model" : "models"} fit`))];
    out.push(title("WHAT DO YOU ASK MOST?"));
    M2_ASK.forEach(([l, modes], k) => out.push(row("ask" + k, l, st.ask === k, () => { st.ask = k; st.modes = new Set(modes); }, { radio: true })));
    out.push(title("HOW MUCH ROOM ON THIS DECK?"));
    M2_ROOM.forEach(([l, , sub], k) => out.push(row("room" + k, l, st.room === k, () => { st.room = k; }, { radio: true, sub })));
    out.push(title("WHICH LICENCES?"));
    M2_LIC.forEach(([l], k) => out.push(row("lic" + k, l, st.lic === k, () => { st.lic = k; }, { radio: true })));
    out.push(row("inst", "Only what I have", st.installed, () => { st.installed = !st.installed; }));
    return out;
  }

  function questionStep() {
    // "Help me choose": one question at a time in the list's place; the column fills in from the answers
    const Q = [
      ["What do you ask most?", M2_ASK.map(([l]) => l), (k) => { st.ask = k; st.modes = new Set(M2_ASK[k][1]); }],
      ["How much room is there on this Deck?", M2_ROOM.map(([l, , s]) => `${l} · ${s}`), (k) => { st.room = k; }],
      ["Which licences are fine?", M2_LIC.map(([l]) => l), (k) => { st.lic = k; }],
    ];
    const [q, opts, act] = Q[qStep];
    const pills = opts.map((o, k) => {
      const b = h("button", { class: "m2-pill", "data-stop": "", "data-row": "m2q" }, o);
      b.addEventListener("click", () => {
        act(k); st.essentials = false;
        if (qStep < Q.length - 1) { qStep++; render(".m2-pill"); } else { view = "list"; render(".m2-list [data-stop]"); }
      });
      return b;
    });
    const skip = h("button", { class: "m2-skip", "data-stop": "" }, "Skip, back to the list");
    skip.addEventListener("click", () => { view = "list"; render(".m2-help"); });
    return h("div", { class: "m2-q" }, h("small", {}, `Question ${qStep + 1} of ${Q.length}`), h("h6", {}, q), h("div", { class: "m2-pills" }, ...pills), skip);
  }

  function render(ringSel) {
    box.replaceChildren();
    if (view === "closed") {
      box.className = "mbox closed";
      const again = h("button", { class: "q-btn", "data-stop": "" }, "Open AI models again");
      box.append(h("div", { class: "closed-msg" }, h("p", {}, "The box closed. Your filters are kept: they are all on screen, so nothing was hidden or lost."), again));
      again.addEventListener("click", () => { view = "list"; render(".m2-side [data-stop]"); });
      Deck.setRing(root, again, { scroll: false });
      return;
    }
    box.className = "mbox m2";
    box.append(h("div", { class: "mb-title" }, h("h5", {}, "AI models"), h("button", { class: "adv", "data-stop": "", "data-row": "m2head" }, "Advanced ›")));
    box.append(h("div", { class: "mb-counts" }, "Installed 2 · 5.1 GB", h("span", {}, "Queue 0 · < 0.1 GB"), h("span", {}, "Live catalog · Live sizes")));
    const side = h("div", { class: "fl-side scroll m2-side" }, ...(kind === "questions" ? columnQuestions() : columnFilters()));
    const right = view === "questions" ? questionStep() : h("div", { class: "fl-list scroll m2-list" }, modelTable(m2Filter(st)));
    box.append(h("div", { class: "mb-main split" }, side, right));
    const foot = h("div", { class: "mb-foot" });
    if (view === "questions") {
      // while a question is up, nothing at the bottom can close the box
      const back = h("button", { class: "mb-btn", "data-stop": "", "data-row": "foot" }, "Back to the list");
      back.addEventListener("click", () => { view = "list"; render(".m2-help"); });
      foot.append(back);
    } else {
      const done = h("button", { class: "mb-btn", "data-stop": "", "data-row": "foot" }, "Done");
      const cancel = h("button", { class: "mb-btn", "data-stop": "", "data-row": "foot" }, "Cancel");
      done.addEventListener("click", () => { view = "closed"; render(); });
      cancel.addEventListener("click", () => { view = "closed"; render(); });
      foot.append(done, cancel);
    }
    box.append(foot);
    const target = ringSel ? $(ringSel, box) : null;
    if (target) Deck.setRing(root, target);
  }
  render();
  const start = kind === "help" ? $(".m2-help", box) : $(".m2-side .m2-row", box);
  if (start) start.setAttribute("data-start", "");
  return root;
}

const MODELS_R2_OPTIONS = [
  { id: "2A", group: "r2", groupTitle: "Round 2: the column you liked, and the three questions", label: "A", title: "The filters column, tidied", desc: "Round 1's B with three changes: “7 models match” and Clear at the top of the column, a count beside each Good for choice, and Right and Left to move between the column and the list.", build: () => modelsBox2("column") },
  { id: "2B", group: "r2", label: "B", title: "The column asks the three questions", desc: "Wild 2 kept for good: the column is the three questions (what you ask, how much room, which licences) instead of filter names. The list changes as you answer.", build: () => modelsBox2("questions") },
  { id: "2C", group: "r2", label: "C", title: "Filters column, plus “Help me choose”", desc: "A's column, with “Help me choose…” at the top. It asks the three questions one at a time where the list was, then fills in the column for you. While a question is up, the only button at the bottom is “Back to the list”.", build: () => modelsBox2("help") },
];

/* Put round 2 on top of tab 2; round 1 stays below with its picks */
(() => {
  const t2 = TABS.find((t) => t.id === "t2");
  t2.title = "The AI models box, round 2: the filters always on screen";
  t2.today = [
    "Round 1: you liked the filters living in a column beside the list (B), and answering three questions instead (Wild 2).",
    "Both fix the two problems at once. There is no Filters button to miss, and no hidden filters step, so Done can never throw your picks away.",
    "The box is the same today as when round 1 was drawn; the Main tab rebuild did not touch it.",
  ];
  t2.deciding = [
    "Whether the column shows filter names, or the three questions.",
    "Whether “Help me choose” is worth having on top of the column.",
  ];
  t2.howto = "Up and Down walk the column; A ticks a choice and the list changes at once. Right jumps to the list, Left comes back. Round 1 is further down, with your picks.";
  t2.options = [...MODELS_R2_OPTIONS, ...t2.options.map((o, i) => ({ ...o, group: "r1", groupTitle: i === 0 ? "Round 1 (your earlier picks)" : undefined }))];
})();
