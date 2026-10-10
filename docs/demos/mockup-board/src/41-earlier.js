/* ============================================================
   Tab 1: the "N earlier" list opens a few questions at a time
   ============================================================ */
const EARLIER_POOL = [
  ["how do i get past the mantis lords", "Hollow Knight", 14], ["where is the city crest", "Hollow Knight", 10],
  ["best charms for a nail build", "Hollow Knight", 11], ["how do i open the white palace", "Hollow Knight", 16],
  ["why does my game stutter in deepnest", "Hollow Knight", 21], ["what does the shade cloak do", "Hollow Knight", 9],
  ["which weapon is best for a first escape", "Hades", 13], ["how do i beat theseus and asterius", "Hades", 20],
  ["what should i spend darkness on first", "Hades", 15], ["is the heat system worth it yet", "Hades", 22],
  ["how do i get the stygian blade aspects", "Hades", 18], ["what boons go well with the bow", "Hades", 12],
  ["best class for solo dreadnought", "Deep Rock Galactic: Survivor", 10], ["how do i unlock the gunner", "Deep Rock Galactic: Survivor", 11],
  ["what are overclocks for", "Deep Rock Galactic: Survivor", 9], ["the words on screen look blurry", "Deep Rock Galactic: Survivor", 15],
  ["how long does the battery last at 10 watts", "Deck", 8], ["can i cap the frame rate per game", "Deck", 13],
  ["why is my fan so loud", "Deck", 19], ["how do i move games to the sd card", "Deck", 9],
  ["what is a good tdp for hades", "Deck", 16], ["how do i take a screenshot", "Deck", 20],
  ["is it worth turning on half rate shading", "Deck", 10], ["where do i find the nailsmith", "Hollow Knight", 17],
];
function dayQuestions(seed, count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const p = EARLIER_POOL[(i * 7 + seed) % EARLIER_POOL.length];
    const hour = 9 + Math.floor((i / count) * 13);
    out.push({ text: p[0], game: p[1], hour, min: (i * 13 + seed * 5) % 60 });
  }
  return out;
}
const EARLIER_DAYS = [
  { label: "Wed 30 Sep", items: dayQuestions(1, 6) },
  { label: "Sat 3 Oct", items: dayQuestions(3, 64), big: true },
  { label: "Yesterday", items: dayQuestions(5, 9) },
  { label: "Today", items: dayQuestions(9, 7) },
];
const EARLIER_TOTAL = EARLIER_DAYS.reduce((n, d) => n + d.items.length, 0);
const cut60 = (s) => (s.length > 60 ? s.slice(0, 59) + "…" : s);
const hhmm = (q) => `${((q.hour + 11) % 12) + 1}:${String(q.min).padStart(2, "0")} ${q.hour < 12 ? "am" : "pm"}`;

function oldRow(q, { time = false } = {}) {
  const row = h("div", { class: "oldrow" });
  const b = h("button", { class: "qb old", "data-stop": "" }, time ? h("span", { class: "t" }, hhmm(q) + "  ") : "", cut60(q.text));
  b.addEventListener("click", () => {
    const open = row.querySelector(".ab");
    if (open) { open.remove(); return; }
    row.append(aBubble([`(The answer to "${q.text}" opens here, as it does today.)`], { stopEach: false }));
  });
  row.append(b);
  return row;
}

function earlierMock(kind) {
  const sc = h("div", { class: "scroll" });
  const pill = h("button", { class: "earlier-pill", "data-stop": "", "data-start": "" }, h("span", { class: "pill" }, `${EARLIER_TOTAL} earlier`, h("span", { class: "chev" }, "▸")));
  const daysBox = h("div", { class: "days", hidden: true });
  sc.append(h("div", { class: "earlier-row" }, pill), daysBox,
    h("div", { class: "turn" }, qBubble("how do i beat the boss in the city of tears"), reasonLine(14),
      aBubble(["That's the <b>Soul Master</b>. Watch for him to stop and charge his orb: that is the moment to hit.", "When he dives at the floor, dash to the side and strike as he comes back up."]),
      ...rateRow(), detailsLine()));
  const body = mainTab({ transcript: [], chatName: "Hollow Knight help" });
  body.scroller.replaceWith(sc);
  body.scroller = sc;
  const root = deckFrame({ body });

  pill.addEventListener("click", () => {
    daysBox.hidden = !daysBox.hidden;
    $(".chev", pill).textContent = daysBox.hidden ? "▸" : "▾";
    pill.closest(".earlier-row").classList.toggle("open", !daysBox.hidden);
  });

  for (const day of EARLIER_DAYS) {
    const line = h("button", { class: "dayline", "data-stop": "" }, h("span", {}, `${day.label} · ${day.items.length}`), h("span", { class: "chev" }, "▸"));
    const list = h("div", { class: "daylist", hidden: true });
    const wrap = h("div", { class: "day" }, line, list);
    daysBox.append(wrap);
    let built = false;
    const toggle = () => {
      list.hidden = !list.hidden;
      $(".chev", line).textContent = list.hidden ? "▸" : "▾";
      if (!built) { buildDay(kind, day, list, line, root); built = true; }
    };
    line.addEventListener("click", toggle);
    // B inside an open day closes it and puts the ring back on its line
    wrap.addEventListener("deckkey", (e) => {
      if (e.detail.key !== "B") return;
      e.preventDefault();
      if (!list.hidden) { list.hidden = true; $(".chev", line).textContent = "▸"; Deck.setRing(root, line); }
    });
  }
  return root;
}

function buildDay(kind, day, list, line, root) {
  const items = day.items;
  const STEP = 6;
  if (kind === "today") {
    for (const q of items) list.append(oldRow(q));
    return;
  }
  if (kind === "more") {
    let shown = 0;
    const more = h("button", { class: "morerow", "data-stop": "" });
    const all = h("button", { class: "morerow quiet", "data-stop": "", "data-row": "more-" + day.label });
    more.dataset.row = "more-" + day.label;
    const addSome = (n) => {
      const first = shown;
      for (const q of items.slice(shown, shown + n)) list.insertBefore(oldRow(q), moreWrap);
      shown = Math.min(items.length, shown + n);
      const left = items.length - shown;
      more.textContent = `Show ${Math.min(STEP, left)} more · ${left} left`;
      all.textContent = "Show all";
      moreWrap.hidden = left === 0;
      return $$(".oldrow", list)[first];
    };
    const moreWrap = h("div", { class: "morewrap" }, more, all);
    list.append(moreWrap);
    addSome(STEP);
    more.addEventListener("click", () => { const r = addSome(STEP); if (r) Deck.setRing(root, $(".qb", r)); });
    all.addEventListener("click", () => { const r = addSome(items.length); if (r) Deck.setRing(root, $(".qb", r)); });
    return;
  }
  if (kind === "pages") {
    let page = 0;
    const pages = Math.ceil(items.length / STEP);
    const rows = h("div", { class: "pagerows" });
    const label = h("span", { class: "pg-n" });
    const prev = h("button", { class: "pg-b", "data-stop": "", "data-row": "pg" + day.label }, "‹");
    const next = h("button", { class: "pg-b", "data-stop": "", "data-row": "pg" + day.label }, "›");
    const pager = h("div", { class: "pagerrow" }, prev, label, next);
    const render = () => {
      rows.replaceChildren(...items.slice(page * STEP, page * STEP + STEP).map((q) => oldRow(q)));
      label.textContent = `${page * STEP + 1}–${Math.min(items.length, page * STEP + STEP)} of ${items.length}`;
      prev.disabled = page === 0; next.disabled = page === pages - 1;
    };
    prev.setAttribute("data-stop-disabled", ""); next.setAttribute("data-stop-disabled", "");
    prev.addEventListener("click", () => { if (page > 0) { page--; render(); } });
    next.addEventListener("click", () => { if (page < pages - 1) { page++; render(); } });
    list.append(rows);
    if (pages > 1) list.append(pager);
    // Left and Right on the day line also turn pages
    line.addEventListener("deckkey", (e) => {
      if ((e.detail.key === "Left" || e.detail.key === "Right") && !list.hidden) {
        e.preventDefault();
        (e.detail.key === "Left" ? prev : next).click();
      }
    });
    render();
    return;
  }
  if (kind === "hours" || kind === "games") {
    const groups = new Map();
    for (const q of items) {
      const k = kind === "hours" ? (q.hour < 12 ? "Morning" : q.hour < 17 ? "Afternoon" : "Evening") : q.game;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(q);
    }
    for (const [k, qs] of groups) {
      const g = h("button", { class: "dayline sub", "data-stop": "" }, h("span", {}, `${k} · ${qs.length}`), h("span", { class: "chev" }, "▸"));
      const gl = h("div", { class: "daylist sub", hidden: true });
      let shown = 0;
      const more = h("button", { class: "morerow", "data-stop": "" });
      const add = () => {
        const first = shown;
        for (const q of qs.slice(shown, shown + 5)) gl.insertBefore(oldRow(q, { time: kind === "hours" }), more);
        shown = Math.min(qs.length, shown + 5);
        more.textContent = `Show ${Math.min(5, qs.length - shown)} more · ${qs.length - shown} left`;
        more.hidden = shown >= qs.length;
        return $$(".oldrow", gl)[first];
      };
      gl.append(more);
      add();
      more.addEventListener("click", () => { const r = add(); if (r) Deck.setRing(root, $(".qb", r)); });
      g.addEventListener("click", () => { gl.hidden = !gl.hidden; $(".chev", g).textContent = gl.hidden ? "▸" : "▾"; });
      list.append(h("div", { class: "group" }, g, gl));
    }
    return;
  }
  if (kind === "scrub") {
    let i = items.length - 1;
    const preview = h("div", { class: "scrub-prev" });
    const ticks = h("div", { class: "scrub-ticks" }, ...items.map(() => h("i")));
    const bar = h("button", { class: "scrub", "data-stop": "" }, ticks, h("div", { class: "scrub-label" }));
    const render = () => {
      $$("i", ticks).forEach((t, k) => t.classList.toggle("on", k === i));
      $(".scrub-label", bar).textContent = `${i + 1} of ${items.length} · ${hhmm(items[i])}`;
      preview.textContent = cut60(items[i].text);
    };
    bar.addEventListener("deckkey", (e) => {
      if (e.detail.key === "Left" || e.detail.key === "Right") {
        e.preventDefault();
        i = Math.max(0, Math.min(items.length - 1, i + (e.detail.key === "Left" ? -1 : 1)));
        render();
      }
    });
    bar.addEventListener("click", (e) => {
      const r = ticks.getBoundingClientRect();
      if (e.clientX && e.target.closest(".scrub-ticks")) {
        i = Math.max(0, Math.min(items.length - 1, Math.floor(((e.clientX - r.left) / r.width) * items.length)));
        render();
        return;
      }
      const open = list.querySelector(".ab");
      if (open) open.remove(); else list.append(aBubble([`(The answer to "${items[i].text}" opens here.)`], { stopEach: false }));
    });
    list.append(preview, bar);
    render();
  }
}

TABS.push({
  id: "t1", n: 1, name: "“N earlier” list", stars: 2,
  title: "A day in the “N earlier” list opens a few questions at a time",
  today: [
    "A on “86 earlier” shows one line per day, oldest first: “Sat 3 Oct · 64”.",
    "A on a day line opens every question from that day at once. On a busy day that is a wall of 64 rows to walk through.",
  ],
  deciding: [
    "You asked for about five to seven at a time, with a way to get the next few.",
    "Pick how the next few are reached, and whether a day should be split up some other way first.",
  ],
  howto: "Press A on <b>86 earlier</b>, then A on <b>Sat 3 Oct · 64</b>. B closes a day and puts the ring back on its line.",
  options: [
    { id: "today", label: "Today", today: true, title: "Everything at once", desc: "What ships now. Try walking from the top of Saturday to the newest answer.", build: () => earlierMock("today") },
    { id: "A", label: "A", title: "“Show 6 more” at the end", desc: "Six questions, then a row that says how many are left. The ring lands on the first new question. “Show all” sits beside it.", build: () => earlierMock("more") },
    { id: "B", label: "B", title: "Pages of six", desc: "Six at a time with a page row under them. Left and Right on the day line, or the arrows, turn the page.", build: () => earlierMock("pages") },
    { id: "C", label: "C", title: "Split the day by time", desc: "A busy day opens into Morning, Afternoon and Evening. Each opens five at a time, with the time shown.", build: () => earlierMock("hours") },
    { id: "W1", label: "Wild 1", wild: true, title: "A scrub bar", desc: "The day becomes one bar with a tick per question. Left and Right slide through them with a preview; A opens the one shown.", build: () => earlierMock("scrub") },
    { id: "W2", label: "Wild 2", wild: true, title: "Split the day by game", desc: "The day opens into one line per game: Hollow Knight, Hades, the Deck itself. Each opens five at a time.", build: () => earlierMock("games") },
  ],
});
