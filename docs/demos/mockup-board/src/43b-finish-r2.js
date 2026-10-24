/* ============================================================
   Tab 3, round 2: a finished answer keeps its layout, drawn in the new layout (21-kit2.js).
   Round 1 picks: A (cut into sections as it writes) and B (same rebuild, softer: "cleaner").
   Under a finished answer today: the Helpful / Not really thumbs and the "Show details" line;
   Read aloud and Copy sit in the answer's corners since plan 84. Long answers are cut into
   sections past about 900 letters, which is where the rebuild comes from.
   ============================================================ */
function k2Rows() {
  return h("div", { class: "k2-rows" },
    h("div", { class: "k2-thumbs" },
      h("button", { "data-stop": "", "data-row": "thumbs" }, h("span", { html: ICONS.up }), "Helpful"),
      h("button", { "data-stop": "", "data-row": "thumbs" }, h("span", { html: ICONS.down }), "Not really")),
    h("button", { class: "k2-detailsline", "data-stop": "" }, "Show details ↓"));
}
const k2Corners = () => [h("span", { class: "k2-bspeak", html: ICONS2.speaker }), h("span", { class: "k2-copy", html: ICONS2.copy })];
const k2Sec = (k) => h("div", { class: "k2-sec", "data-stop": "", html: FINISH_CUTS[k].map((i) => `<p>${FINISH_A[i]}</p>`).join("") });

function finishR2Mock(kind) {
  const holder = h("div", { style: "display:contents" });
  const root = deckFrame({ body: holder, header: false });
  const dk = dock2({ typed: FINISH_Q, chips: ["Recommended controls", "Charms for this fight"] });
  const intro = h("div", { class: "k2-turn" }, qBubble2("what is a good first upgrade in Hollow Knight"), aBubble2([SAMPLE.a[1]]));
  const body = mainTab2({ transcript: [intro], chatName: "How do I beat False Knight", chatNo: 2, chatCount: 5, dockEl: dk });
  holder.append(body);
  const panel = $(".qam", root);
  const sc = body.scroller;
  const ask = dk.ask;
  ask.setAttribute("data-start", "");
  let run = 0;

  async function play() {
    const my = ++run;
    const alive = () => my === run;
    for (const t of $$(".k2-turn.live", sc)) t.remove();
    dk.field.textContent = "Describe the level, boss, or puzzle you're stuck on."; dk.field.classList.remove("typed");
    ask.classList.add("resting");
    const turn = h("div", { class: "k2-turn live" }, qBubble2(FINISH_Q), h("div", { class: "k2-writing" }, "Writing · 9 s"));
    sc.append(turn);
    const bubble = h("div", { class: "k2-answer writing" });
    turn.append(bubble);
    const cursor = h("span", { class: "cursor" });
    const secs = [];
    const paras = [];
    const ok = await streamParas(FINISH_A, (i, html) => {
      if (kind === "asgoes") {
        // a section closes as soon as it is full; the next one starts under it
        const si = FINISH_CUTS.findIndex((c) => c.includes(i));
        while (secs.length <= si) { const s = h("div", { class: "k2-sec", "data-stop": "" }); secs.push(s); bubble.append(s); }
        let p = $(`p[data-i="${i}"]`, secs[si]);
        if (!p) { p = h("p", { "data-i": i }); secs[si].append(p); }
        p.innerHTML = html; p.append(cursor);
      } else {
        // one block while writing, as today
        if (!bubble.hasAttribute("data-stop")) bubble.setAttribute("data-stop", "");
        let p = paras[i];
        if (!p) { p = h("p"); paras[i] = p; bubble.append(p); }
        p.innerHTML = html; p.append(cursor);
      }
      sc.scrollTop = sc.scrollHeight;
    }, { alive });
    if (!ok) return;
    cursor.remove();
    ask.classList.remove("resting");
    $(".k2-writing", turn).textContent = "Show reasoning · 9 s";
    bubble.classList.remove("writing");

    if (kind === "now") {
      // what ships: the rows pop in, the answer is re-cut, and the view jumps to the top and back
      turn.append(k2Rows());
      await sleep(30);
      const wasRing = bubble.classList.contains("ring");
      bubble.removeAttribute("data-stop"); bubble.classList.remove("ring");
      bubble.replaceChildren(...FINISH_CUTS.map((_, k) => k2Sec(k)), ...k2Corners());
      if (wasRing) Deck.setRing(root, $(".k2-sec", bubble), { scroll: false });
      await sleep(450);
      sc.scrollTop = 0; toast(panel, "The chat reloads: the view jumps to the top…", 1100);
      await sleep(300); sc.scrollTop = sc.scrollHeight;
      await sleep(600); sc.scrollTop = sc.scrollHeight;
    } else if (kind === "soft") {
      // the same rebuild, but gentle: sections ease in, rows fade in, the view never moves
      const keep = sc.scrollTop;
      const wasRing = bubble.classList.contains("ring");
      bubble.removeAttribute("data-stop"); bubble.classList.remove("ring");
      bubble.classList.add("settling");
      bubble.replaceChildren(...FINISH_CUTS.map((_, k) => k2Sec(k)), ...k2Corners());
      if (wasRing) Deck.setRing(root, $(".k2-sec", bubble), { scroll: false });
      const rows = k2Rows(); rows.classList.add("fade");
      turn.append(rows);
      sc.scrollTop = keep;
      requestAnimationFrame(() => rows.classList.add("in"));
    } else {
      // sections were cut while writing, so nothing changes in the answer; only the rows fade in
      bubble.append(...k2Corners());
      const rows = k2Rows(); rows.classList.add("fade");
      turn.append(rows);
      requestAnimationFrame(() => rows.classList.add("in"));
    }
  }
  ask.addEventListener("click", () => { if (!ask.classList.contains("resting")) play(); else { run++; ask.classList.remove("resting"); } });
  root.replay = play;
  return root;
}

function finishR2Card(kind) {
  return () => {
    const root = finishR2Mock(kind);
    const bar = h("div", { class: "playbar" },
      h("button", { type: "button", class: "play", onclick: () => root.replay() }, "▶ Play the answer"),
      h("label", {}, h("input", { type: "checkbox", id: "boxes2-" + kind, onchange: (e) => root.classList.toggle("show-boxes", e.target.checked) }), " Show the D-pad boxes"));
    return [root, bar];
  };
}

const FINISH_R2_OPTIONS = [
  { id: "2now", group: "r2", groupTitle: "Round 2: the two you liked, in the new layout", label: "Now", today: true, title: "What ships now", desc: "One block while it writes. At the finish the thumbs and Show details pop in, the answer is cut into sections, and the view jumps to the top and back.", build: finishR2Card("now") },
  { id: "2A", group: "r2", label: "A", title: "Cut as it writes, rows fade in", desc: "Round 1's A. Each section closes as soon as it is full, so the answer never changes at the finish. The only thing that happens then: the thumbs and Show details fade in under it.", build: finishR2Card("asgoes") },
  { id: "2B", group: "r2", label: "B", title: "Today's rebuild, made gentle", desc: "Round 1's B, the one you called cleaner. One block while writing, as now; at the finish the sections ease in and the rows fade in. The view never moves, and the highlight stays where it was.", build: finishR2Card("soft") },
];

/* Put round 2 on top of tab 3; round 1 stays below with its picks */
(() => {
  const t3 = TABS.find((t) => t.id === "t3");
  t3.title = "A finished answer keeps its layout, round 2";
  t3.today = [
    "Round 1: you liked cutting the answer into sections while it writes (A) and a gentler version of today's rebuild (B), which you called cleaner.",
    "In the new layout the answer has more room (295 points), so a long answer's change at the finish is easier to see, not harder.",
    "Under a finished answer today: the Helpful and Not really buttons, then Show details. Read aloud and Copy now sit in the answer's corners.",
  ];
  t3.deciding = [
    "A or B: does the answer get its sections while it writes, or keep one block and settle gently at the end?",
    "Either way the jump to the top goes, and the highlight stays on what you were reading.",
  ];
  t3.howto = "Press A on <b>Ask</b> in the question box (or use Play) and watch the moment the answer finishes. Walk Down into the answer while it writes to see where the highlight can sit. Round 1 is further down, with your picks.";
  t3.options = [...FINISH_R2_OPTIONS, ...t3.options.map((o, i) => ({ ...o, group: "r1", groupTitle: i === 0 ? "Round 1 (your earlier picks)" : undefined }))];
})();
