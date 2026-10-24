/* ============================================================
   Tab 3: a finished answer keeping its layout
   ============================================================ */
const FINISH_Q = "how do i beat false knight";
const FINISH_A = [
  "<b>False Knight</b> is a test of patience more than damage. He shows every swing before it lands, so the trick is to read him, not to rush him.",
  "Stay close to his left leg. When he raises the mace high, dash away; the shockwave rolls along the floor, so jump over it rather than running.",
  "After a few hits he topples and his armour cracks open. That is your window: hit the maggot's head as fast as you can until he stands back up. Only then do you gain Soul.",
  "If you are low on masks, use the Soul you saved to Focus right after he falls, not during his rampage. He leaps around the arena in that phase and will land on you.",
  "Bring the first Nail upgrade if you have it; it cuts the fight down to two cycles. Without it, expect three or four. Either way, the fight rewards waiting.",
];
const FINISH_CUTS = [[0, 1], [2, 3], [4]]; // how the finished answer is cut into sections

/* Reveal text one character at a time across paragraphs.
   onTick(paraIndex, visibleHtml) is called as letters arrive. */
async function streamParas(paras, onTick, { cps = 160, alive = () => true } = {}) {
  const plain = paras.map((p) => p.replace(/<[^>]+>/g, ""));
  for (let i = 0; i < paras.length; i++) {
    for (let n = 0; n <= plain[i].length; n += 3) {
      if (!alive()) return false;
      onTick(i, revealHtml(paras[i], n));
      await sleep(1000 / (cps / 3));
    }
    onTick(i, paras[i]);
  }
  return true;
}
/* Show the first n visible letters of a string that may hold <b> tags */
function revealHtml(html, n) {
  let out = "", seen = 0, open = false;
  for (let i = 0; i < html.length && seen < n; i++) {
    if (html[i] === "<") { const j = html.indexOf(">", i); const tag = html.slice(i, j + 1); out += tag; open = !tag.startsWith("</"); i = j; continue; }
    out += html[i]; seen++;
  }
  if (open) out += "</b>";
  return out;
}

/* One Main tab wired to play a question when A is pressed on Ask */
function finishMock(kind) {
  const d = dock({ typed: FINISH_Q, mode: "Strategy", chips: ["Recommended controls", "Charms for this fight"] });
  const intro = h("div", { class: "turn" }, qBubble("what is a good first upgrade in Hollow Knight"), aBubble([SAMPLE.a[1]]));
  const body = mainTab({ transcript: [intro], dockEl: d, chatName: "How do I beat False Knight" });
  const root = deckFrame({ body });
  const panel = $(".qam", root);
  const sc = body.scroller;
  let run = 0;

  const ask = $(".askbtn", d);
  ask.dataset.start = "";
  d.field.removeAttribute("data-start");

  async function play() {
    const my = ++run;
    const alive = () => my === run;
    for (const t of $$(".turn.live", sc)) t.remove();
    d.field.textContent = "Describe the level, boss, or puzzle you're stuck on.";
    d.field.classList.remove("typed");
    ask.textContent = "stop";
    const turn = h("div", { class: "turn live" }, qBubble(FINISH_Q));
    sc.append(turn);
    turn.append(reasonLine(9));
    const bubble = h("div", { class: "ab writing" + (kind === "pages" ? " paged" : "") });
    let ghost = null;
    if (kind === "ready") {
      ghost = h("div", { class: "ghost-rows" }, ...rateRow(), detailsLine());
      for (const s of $$("[data-stop]", ghost)) { s.setAttribute("data-wait", ""); s.removeAttribute("data-stop"); }
    }
    if (kind === "curtain") {
      const tick = h("div", { class: "curtain" }, h("div", { class: "curtain-label" }, "Writing · Strategy"), h("div", { class: "curtain-line" }, ""), h("div", { class: "curtain-bar" }, h("i")));
      turn.append(tick);
      const total = FINISH_A.join("").length;
      let doneChars = 0;
      const ok = await streamParas(FINISH_A, (i, html) => {
        const plain = html.replace(/<[^>]+>/g, "");
        const sentences = plain.split(/(?<=[.;])\s+/);
        $(".curtain-line", tick).textContent = sentences[sentences.length - 1];
        doneChars = FINISH_A.slice(0, i).join("").length + plain.length;
        $(".curtain-bar i", tick).style.width = Math.min(100, (doneChars / total) * 100) + "%";
        pin(sc);
      }, { alive });
      if (!ok) return;
      tick.remove();
      const final = aBubble(FINISH_CUTS.map((c) => h("div", { class: "sec", html: c.map((k) => `<p>${FINISH_A[k]}</p>`).join("") })));
      final.classList.add("arrive");
      turn.append(final, ...rateRow(), detailsLine());
      ask.textContent = "ask";
      pin(sc);
      return;
    }
    turn.append(bubble);
    if (ghost) turn.append(ghost);
    const cursor = h("span", { class: "cursor" });

    // what the bubble holds while writing
    const live = [];
    const sections = [];
    function renderLive(i, html) {
      if (kind === "asgoes" || kind === "pages") {
        const si = FINISH_CUTS.findIndex((c) => c.includes(i));
        while (sections.length <= si) {
          const s = h("div", { class: "sec", "data-stop": "" });
          sections.push(s);
          bubble.append(s);
          if (kind === "pages") updatePages();
        }
        const s = sections[si];
        let p = $(`p[data-i="${i}"]`, s);
        if (!p) { p = h("p", { "data-i": i }); s.append(p); }
        p.innerHTML = html;
        for (const c of $$(".cursor", bubble)) c.remove();
        p.append(cursor);
      } else {
        if (!bubble.hasAttribute("data-stop")) bubble.setAttribute("data-stop", "");
        let p = live[i];
        if (!p) { p = h("p"); live[i] = p; bubble.append(p); }
        p.innerHTML = html;
        p.append(cursor);
      }
      if (kind !== "pages") pin(sc);
    }
    let page = 0;
    const pager = h("div", { class: "pager" }, h("button", { "data-stop": "", "data-row": "pg", onclick: () => flip(-1) }, "‹"), h("span", { class: "pg-n" }, ""), h("button", { "data-stop": "", "data-row": "pg", onclick: () => flip(1) }, "›"));
    function updatePages() {
      sections.forEach((s, k) => s.hidden = k !== page);
      $(".pg-n", pager).textContent = `Page ${page + 1} of ${sections.length}${bubble.classList.contains("writing") ? "…" : ""}`;
    }
    function flip(dir) { page = Math.max(0, Math.min(sections.length - 1, page + dir)); updatePages(); }
    if (kind === "pages") {
      turn.append(pager);
      bubble.addEventListener("deckkey", (e) => { if (e.detail.key === "Left" || e.detail.key === "Right") { e.preventDefault(); flip(e.detail.key === "Left" ? -1 : 1); } });
    }

    const ok = await streamParas(FINISH_A, (i, html) => {
      if (kind === "pages") {
        const si = FINISH_CUTS.findIndex((c) => c.includes(i));
        if (si > page && i === FINISH_CUTS[si][0] && html.length < 4) { /* a new page started */ }
      }
      renderLive(i, html);
    }, { alive });
    if (!ok) return;
    cursor.remove();
    ask.textContent = "ask";

    // the finish
    if (kind === "today") {
      turn.append(...rateRow(), detailsLine());
      await sleep(30);
      bubble.classList.remove("writing");
      recut(bubble);
      await sleep(450);
      // the saved chat reloads: the pane lands at the top for a moment
      sc.scrollTop = 0; flash(panel, "The chat reloads: the view jumps to the top…");
      await sleep(300); pin(sc, true);
      await sleep(600); pin(sc, true);
    } else if (kind === "soft") {
      const rows = h("div", { class: "rows-in" }, ...rateRow(), detailsLine());
      turn.append(rows);
      bubble.classList.remove("writing");
      bubble.classList.add("settling");
      recut(bubble, true);
      requestAnimationFrame(() => rows.classList.add("in"));
      pin(sc);
    } else if (kind === "ready") {
      bubble.classList.remove("writing");
      recut(bubble);
      for (const s of $$("[data-wait]", ghost)) { s.setAttribute("data-stop", ""); s.removeAttribute("data-wait"); }
      ghost.classList.add("on");
    } else if (kind === "asgoes" || kind === "pages") {
      bubble.classList.remove("writing");
      if (kind === "pages") updatePages();
      turn.append(...rateRow(), detailsLine());
      pin(sc);
    }
  }

  function recut(bubble, soft) {
    const html = FINISH_CUTS.map((c) => h("div", { class: "sec" + (soft ? " grow" : ""), "data-stop": "", html: c.map((k) => `<p>${FINISH_A[k]}</p>`).join("") }));
    const wasRing = bubble.classList.contains("ring");
    bubble.removeAttribute("data-stop");
    bubble.classList.remove("ring");
    bubble.replaceChildren(...html);
    if (wasRing) Deck.setRing(root, html[0], { scroll: false });
  }

  ask.addEventListener("click", () => { if (ask.textContent === "ask") play(); else { run++; ask.textContent = "ask"; } });
  root.replay = play;
  return root;
}
function pin(sc, instant) { sc.scrollTo({ top: sc.scrollHeight, behavior: instant ? "auto" : "auto" }); }
function flash(panel, text) { toast(panel, text, 1100); }

function finishCard(kind) {
  return () => {
    const root = finishMock(kind);
    const bar = h("div", { class: "playbar" },
      h("button", { type: "button", class: "play", onclick: () => root.replay() }, "▶ Play the answer"),
      h("label", {}, h("input", { type: "checkbox", id: "boxes-" + kind, onchange: (e) => root.classList.toggle("show-boxes", e.target.checked) }), " Show the D-pad boxes"));
    return [root, bar];
  };
}

TABS.push({
  id: "t3", n: 3, name: "Finished answer", stars: 2,
  title: "A finished answer keeps its layout",
  today: [
    "Short answers (under about 900 letters) look the same before and after. Longer ones change at the end.",
    "While it writes, the answer is one big block with a glow and a blinking cursor. The D-pad box covers the whole answer.",
    "When it finishes: the rating and Show details rows pop in (the page grew about 300 px on the Deck), the answer is cut into sections (one 1,100 px box became 151 px), and the view jumps to the top for a moment, then back.",
  ],
  deciding: [
    "Should the answer look the same the moment it finishes, or is a rebuild fine if it is calmer?",
    "In August you chose \"rebuild at the finish\" for the first version and kept \"keep the layout\" as a later extra. This is that later extra.",
  ],
  howto: "Press A on <b>ASK</b> inside a panel (or use Play) and watch the moment the answer finishes. Tick <b>Show the D-pad boxes</b> to see where the ring can land.",
  options: [
    { id: "today", label: "Today", today: true, title: "Rebuild at the finish", desc: "What ships now: one block while writing, then rows pop in, the answer is re-cut, and the view jumps.", build: finishCard("today") },
    { id: "A", label: "A", title: "Cut into sections as it writes", desc: "Each section closes as soon as it is full, so nothing re-cuts at the end. Only the rows under it arrive.", build: finishCard("asgoes") },
    { id: "B", label: "B", title: "Same rebuild, softer", desc: "Keeps today's rebuild, but the rows fade in, the boxes shrink gently, and the view never jumps.", build: finishCard("soft") },
    { id: "C", label: "C", title: "Rows waiting from the start", desc: "The rating and Show details rows sit under the answer, dim, from the first word. The page never grows at the end.", build: finishCard("ready") },
    { id: "W1", label: "Wild 1", wild: true, title: "Pages instead of scrolling", desc: "The answer fills one screen-sized page at a time. Left and Right turn pages. Nothing moves when it finishes.", build: finishCard("pages") },
    { id: "W2", label: "Wild 2", wild: true, title: "A curtain while it writes", desc: "While writing you see only the newest sentence and a progress bar. The full answer appears once, already in its final shape.", build: finishCard("curtain") },
  ],
});
