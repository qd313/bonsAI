/* ============================================================
   Tab 5, round 2: maps and boss help in answers, drawn in the new layout (21-kit2.js).
   Round 1: liked C (the "where to aim" card: "limited scope, but helpful"), Wild 1 (mark my
   screenshot: needs a scoring test first) and Wild 2 (a map with fog: "like spoiler covering").
   Not liked: the line outline and the small maps ("too basic"). Overall: "Needs more maps".
   Layouts are rough, drawn for the mock-up only; a real map would need its own source check.
   ============================================================ */

/* Pick the nearest item in a D-pad direction; null when nothing lies that way */
function m5Near(items, cur, dir) {
  let best = null, bd = Infinity;
  for (const it of items) {
    if (it === cur) continue;
    const dx = it.cx - cur.cx, dy = it.cy - cur.cy;
    const ok = dir === "Left" ? dx < -3 : dir === "Right" ? dx > 3 : dir === "Up" ? dy < -3 : dy > 3;
    if (!ok) continue;
    const d = dir === "Left" || dir === "Right" ? Math.abs(dx) + 2 * Math.abs(dy) : Math.abs(dy) + 2 * Math.abs(dx);
    if (d < bd) { bd = d; best = it; }
  }
  return best;
}
const m5Center = (r) => ({ ...r, cx: r.x + r.w / 2, cy: r.y + r.h / 2 });

/* ---- an area map: the Forgotten Crossroads, room by room ---- */
const M5_ROOMS = [
  { id: "well", name: "The well", x: 108, y: 2, w: 24, h: 16, lit: true, say: "Up the well is Dirtmouth." },
  { id: "hub", name: "Crossroads bench", x: 88, y: 24, w: 64, h: 20, lit: true, icon: "bench", here: true, say: "You are here. A bench; most paths start from this room." },
  { id: "west", name: "West tunnels", x: 30, y: 28, w: 52, h: 14, lit: true, say: "West leads to Greenpath." },
  { id: "gp", name: "To Greenpath", x: 2, y: 24, w: 24, h: 22, lit: true, icon: "exit", say: "The way into Greenpath." },
  { id: "stag", name: "Stag station", x: 158, y: 26, w: 34, h: 16, lit: true, icon: "stag", say: "Fast travel, once you have paid the stag." },
  { id: "shop", name: "Charm shop", x: 198, y: 24, w: 40, h: 18, lit: false, icon: "shop", say: "A shop. What it sells stays covered until you open it." },
  { id: "temple", name: "Old temple", x: 30, y: 52, w: 66, h: 22, lit: false, say: "A sealed room. It matters much later; covered so it spoils nothing." },
  { id: "shaft", name: "The long drop", x: 110, y: 50, w: 20, h: 52, lit: true, say: "A long drop. The main way down." },
  { id: "arena", name: "False Knight's arena", x: 146, y: 52, w: 60, h: 28, lit: true, icon: "boss", say: "The False Knight. Beating him drops the City Crest." },
  { id: "grub", name: "Grub jar", x: 52, y: 84, w: 50, h: 16, lit: true, icon: "grub", say: "A trapped grub: break the jar." },
  { id: "east", name: "East tunnel", x: 136, y: 90, w: 66, h: 14, lit: false, say: "A long tunnel east." },
  { id: "peak", name: "To Crystal Peak", x: 206, y: 86, w: 32, h: 22, lit: false, icon: "exit", say: "Another area. Covered until you get there." },
  { id: "womb", name: "Glowing room", x: 22, y: 110, w: 66, h: 22, lit: false, say: "Something waits here. Covered: it is a fight." },
  { id: "fungal", name: "To Fungal Wastes", x: 100, y: 112, w: 42, h: 18, lit: true, icon: "exit", say: "Down into the Fungal Wastes." },
  { id: "basin", name: "Far down", x: 112, y: 140, w: 30, h: 22, lit: false, icon: "exit", say: "Much deeper. Covered." },
].map(m5Center);
const M5_LINKS = [["well", "hub"], ["hub", "west"], ["west", "gp"], ["hub", "stag"], ["stag", "shop"], ["west", "temple"], ["hub", "shaft"], ["stag", "arena"], ["shaft", "grub"], ["shaft", "east"], ["east", "peak"], ["grub", "womb"], ["shaft", "fungal"], ["fungal", "basin"]];
const M5_GLYPH = { bench: "⌂", stag: "S", shop: "$", boss: "☠", grub: "◍", exit: "➜" };

function m5AreaSvg(sel, shown) {
  const by = Object.fromEntries(M5_ROOMS.map((r) => [r.id, r]));
  const lit = (r) => r.lit || shown.has(r.id);
  const links = M5_LINKS.map(([a, b]) => {
    const A = by[a], B = by[b];
    return `<line x1="${A.cx}" y1="${A.cy}" x2="${B.cx}" y2="${B.cy}" stroke="${lit(A) && lit(B) ? "#6f8296" : "#2b3542"}" stroke-width="5" stroke-linecap="round"/>`;
  }).join("");
  const rooms = M5_ROOMS.map((r) => {
    const L = lit(r), on = r.id === sel;
    const fill = L ? (r.icon === "boss" ? "#3a2226" : "#1f2b38") : "url(#m5fog)";
    const g = L && r.icon ? `<text x="${r.x + 4}" y="${r.y + 11}" font-size="9" fill="${r.icon === "boss" ? "#ff8a7a" : "#9ce7ff"}">${M5_GLYPH[r.icon]}</text>` : "";
    const pin = r.here ? `<circle cx="${r.cx + 18}" cy="${r.cy}" r="4" fill="#facc15"/><circle cx="${r.cx + 18}" cy="${r.cy}" r="7" fill="none" stroke="#facc15" stroke-opacity=".5"/>` : "";
    return `<g><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="3" fill="${fill}" stroke="${on ? "#fff" : L ? "#7d93aa" : "#3a4654"}" stroke-width="${on ? 2.2 : 1}"/>${g}${pin}</g>`;
  }).join("");
  return `<svg viewBox="0 0 240 166" role="img" aria-label="Map of the Forgotten Crossroads. Rooms you have not reached are covered.">
    <defs><pattern id="m5fog" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#151b23"/><rect width="3" height="6" fill="#1b232d"/></pattern></defs>
    <rect width="240" height="166" fill="#0c1218"/>${links}${rooms}</svg>`;
}

/* ---- the whole kingdom, region by region ---- */
const M5_WORLD = [
  { id: "cliffs", name: "Howling Cliffs", x: 6, y: 6, w: 44, h: 22, lit: false },
  { id: "dirt", name: "Dirtmouth", x: 88, y: 2, w: 54, h: 14, lit: true },
  { id: "peak", name: "Crystal Peak", x: 168, y: 6, w: 62, h: 28, lit: false },
  { id: "cross", name: "Forgotten Crossroads", x: 78, y: 22, w: 84, h: 28, lit: true, zoom: true },
  { id: "green", name: "Greenpath", x: 6, y: 36, w: 64, h: 34, lit: true },
  { id: "rest", name: "Resting Grounds", x: 172, y: 40, w: 50, h: 20, lit: false },
  { id: "fog", name: "Fog Canyon", x: 74, y: 58, w: 44, h: 22, lit: false },
  { id: "city", name: "City of Tears", x: 122, y: 58, w: 62, h: 34, lit: false, goal: true },
  { id: "edge", name: "Kingdom's Edge", x: 200, y: 66, w: 36, h: 60, lit: false },
  { id: "gardens", name: "Queen's Gardens", x: 6, y: 78, w: 62, h: 30, lit: false },
  { id: "fungal", name: "Fungal Wastes", x: 66, y: 86, w: 54, h: 24, lit: true },
  { id: "water", name: "Royal Waterways", x: 122, y: 98, w: 74, h: 16, lit: false },
  { id: "deep", name: "Deepnest", x: 6, y: 114, w: 74, h: 38, lit: false },
  { id: "basin", name: "Ancient Basin", x: 88, y: 122, w: 80, h: 28, lit: false },
].map(m5Center);
function m5WorldSvg(sel, shown) {
  const regs = M5_WORLD.map((r) => {
    const L = r.lit || shown.has(r.id), on = r.id === sel;
    const label = L ? `<text x="${r.cx}" y="${r.cy + 3}" text-anchor="middle" font-size="7.5" font-weight="700" fill="#e8eef5">${r.name}</text>` : `<text x="${r.cx}" y="${r.cy + 3}" text-anchor="middle" font-size="8" fill="#4c5a6a">? ? ?</text>`;
    const goal = r.goal ? `<circle cx="${r.x + r.w - 6}" cy="${r.y + 6}" r="3.5" fill="#facc15"/>` : "";
    const zoom = r.zoom ? `<text x="${r.x + r.w - 9}" y="${r.y + r.h - 4}" font-size="8" fill="#9ce7ff">⊕</text>` : "";
    return `<g><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="7" fill="${L ? "#1d2a37" : "url(#m5fog)"}" stroke="${on ? "#fff" : L ? "#6f8296" : "#33404e"}" stroke-width="${on ? 2.2 : 1}"/>${label}${goal}${zoom}</g>`;
  }).join("");
  return `<svg viewBox="0 0 240 156" role="img" aria-label="Map of the whole kingdom. Regions you have not reached are covered.">
    <defs><pattern id="m5fog" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#151b23"/><rect width="3" height="6" fill="#1b232d"/></pattern></defs>
    <rect width="240" height="156" fill="#0c1218"/>${regs}</svg>`;
}

/* ---- a screenshot, marked in several places ---- */
const M5_MARKS = [
  { n: 1, x: 138, y: 84, r: 22, kind: "hit", sure: true, name: "Egg sac", say: "Hit here. The only part that takes damage." },
  { n: 2, x: 72, y: 104, r: 14, kind: "avoid", sure: true, name: "Front legs", say: "Don't stand under them; they stomp." },
  { n: 3, x: 186, y: 40, r: 14, kind: "dodge", sure: false, name: "Spit", say: "Not sure: this may be where it spits from. Check the note." },
];
function m5ShotSvg(sel, { plain = false } = {}) {
  const col = { hit: "#7dff9a", avoid: "#ff8a7a", dodge: "#ffd36b" };
  const marks = plain ? "" : M5_MARKS.map((m) => {
    const on = m.n === sel;
    return `<g><circle cx="${m.x}" cy="${m.y}" r="${m.r + (on ? 2 : 0)}" fill="none" stroke="${col[m.kind]}" stroke-width="${on ? 3 : 2}" ${m.sure ? "" : 'stroke-dasharray="4 3"'}/>
      <circle cx="${m.x + m.r * 0.72}" cy="${m.y - m.r * 0.72}" r="7" fill="${col[m.kind]}"/><text x="${m.x + m.r * 0.72}" y="${m.y - m.r * 0.72 + 3.5}" text-anchor="middle" font-size="9" font-weight="800" fill="#0b0f14">${m.n}</text></g>`;
  }).join("");
  return `<svg viewBox="0 0 260 140" role="img" aria-label="Your screenshot with three numbered marks">
    <rect width="260" height="140" fill="#2b2a24"/><rect y="96" width="260" height="44" fill="#3a352a"/>
    <path d="M0 96 Q60 80 120 92 T260 86 V140 H0z" fill="#4a4233"/>
    <g fill="#191713" stroke="#0c0b09" stroke-width="2"><ellipse cx="140" cy="46" rx="58" ry="26"/>
    <path d="M96 52 L60 108 M106 60 L84 116 M176 56 L214 106 M168 62 L190 118" stroke="#191713" stroke-width="7" stroke-linecap="round"/></g>
    <ellipse cx="138" cy="84" rx="20" ry="16" fill="#d9cfb4" opacity="0.92"/><path d="M180 40 l10 -6" stroke="#8fae5a" stroke-width="3"/>
    ${marks}</svg>`;
}

/* A figure the D-pad walks: nav(dir) moves inside it and returns false when nothing lies that way */
function m5Figure(cls, draw, { nav, onA }) {
  const fig = h("div", { class: "m5-fig " + cls, "data-stop": "" });
  const cap = h("div", { class: "m5-cap" });
  const redraw = () => { const [svg, capKids] = draw(fig); fig.innerHTML = svg; cap.replaceChildren(...capKids); };
  fig.addEventListener("deckkey", (e) => {
    const k = e.detail.key;
    if (["Left", "Right", "Up", "Down"].includes(k)) {
      if (nav(k)) { e.preventDefault(); redraw(); }
      else if (k === "Left" || k === "Right") e.preventDefault();
    } else if (k === "A" && onA) { e.preventDefault(); onA(); redraw(); }
    else if (k === "B" && fig.dataset.zoomed) { e.preventDefault(); onA && onA("B"); redraw(); }
  });
  redraw();
  return [fig, cap];
}

function mapsR2Mock(kind) {
  const holder = h("div", { style: "display:contents" });
  const root = deckFrame({ body: holder, header: false });
  const body = mainTab2({ chatName: kind === "shot" ? "Black Mesa help" : "Hollow Knight help", chatNo: 1, chatCount: 5, dockEl: dock2({ game: kind === "shot" ? "Half-Life" : "Hollow Knight" }) });
  holder.append(body);
  const sc = body.scroller;
  let q, parts;

  if (kind === "card") {
    const TABS5 = {
      Hit: [["◎", "Head", "only after he topples and the armour opens. The only real damage.", "good"], ["✕", "Armour", "hits here do almost nothing.", "bad"]],
      Dodge: [["⤒", "Mace slam", "the shockwave rolls along the floor: jump it.", "warn"], ["↔", "Rampage", "he leaps across the room: stay in the middle.", "warn"], ["▼", "Falling rocks", "after a rampage, rocks drop where you stand.", "warn"]],
      Bring: [["⚔", "First Nail upgrade", "cuts the fight to two rounds.", "tool"], ["✚", "Soul for Focus", "heal right after he falls, not during a rampage.", "tool"]],
    };
    const names = Object.keys(TABS5);
    let t = 0;
    const card = h("div", { class: "m5-card", "data-stop": "", "data-start": "" });
    const draw = () => {
      card.replaceChildren(
        h("div", { class: "m5-card-h" }, h("span", { class: "ico", html: ICONS.target }), "False Knight · what to do"),
        h("div", { class: "m5-tabs" }, ...names.map((n, k) => h("span", { class: "m5-tab" + (k === t ? " on" : "") }, n))),
        ...TABS5[names[t]].map(([g, n, s, c]) => h("div", { class: "aim-row " + c }, h("span", { class: "g" }, g), h("span", {}, h("b", {}, n), " ", s))),
        h("div", { class: "aim-src" }, "From the note's own lines · Left and Right switch tabs"));
    };
    card.addEventListener("deckkey", (e) => { if (e.detail.key === "Left" || e.detail.key === "Right") { e.preventDefault(); t = (t + (e.detail.key === "Left" ? names.length - 1 : 1)) % names.length; draw(); } });
    draw();
    q = "how do i beat the false knight";
    parts = [h("p", { "data-stop": "" }, "Patience wins this one. Here is the fight on one card:"), card];
  } else if (kind === "fog") {
    let sel = M5_ROOMS.find((r) => r.here);
    const shown = new Set();
    const [fig, cap] = m5Figure("area", () => {
      const L = sel.lit || shown.has(sel.id);
      return [m5AreaSvg(sel.id, shown), [h("b", {}, L ? sel.name : "Covered room"), " ", L ? sel.say : "A to uncover it. It may spoil what is there."]];
    }, { nav: (d) => { const n = m5Near(M5_ROOMS, sel, d); if (n) sel = n; return !!n; }, onA: () => shown.add(sel.id) });
    fig.setAttribute("data-start", "");
    q = "show me a map of the crossroads";
    parts = [h("p", { "data-stop": "" }, "Here is the Crossroads. The rooms you have asked about are open; the rest stay covered, like a spoiler."), fig, cap];
  } else if (kind === "route") {
    const STEPS = [
      ["Dirtmouth", "Start here. Drop down the well.", false],
      ["Forgotten Crossroads", "Go right, past the stag station.", false],
      ["False Knight's arena", "Beat him: he drops the City Crest. You need it.", true],
      ["Down the long drop", "Into the Fungal Wastes.", true],
      ["The city gate", "Show the City Crest; the gate opens.", true],
      ["City of Tears", "You are there. Rain, and a bench just inside.", true],
    ];
    let open = 2;
    const strip = h("div", { class: "m5-route" });
    const draw = (ringIdx) => {
      strip.replaceChildren(...STEPS.map(([n, s, cover], k) => {
        const hidden = cover && k >= open;
        const st = h("button", { class: "m5-stop" + (hidden ? " covered" : "") + (k === STEPS.length - 1 ? " goal" : ""), "data-stop": "" },
          h("span", { class: "m5-dot" }), h("span", { class: "m5-st" }, h("b", {}, hidden ? `Step ${k + 1}` : n), h("small", {}, hidden ? (k === open ? "A shows this step" : "Covered") : s)));
        st.addEventListener("click", () => { if (hidden && k === open) { open++; draw(k); } });
        return st;
      }));
      if (ringIdx != null) Deck.setRing(root, $$(".m5-stop", strip)[ringIdx]);
    };
    draw();
    $$(".m5-stop", strip)[2].setAttribute("data-start", "");
    q = "how do i get to the city of tears";
    parts = [h("p", { "data-stop": "" }, "Six steps from Dirtmouth. The later ones are covered so you can stop where you like; A on the next one shows it."), strip];
  } else if (kind === "world") {
    let zoom = false;
    let sel = M5_WORLD.find((r) => r.id === "cross");
    let room = M5_ROOMS.find((r) => r.here);
    const shown = new Set();
    const [fig, cap] = m5Figure("world", (f) => {
      if (zoom) { f.dataset.zoomed = "1"; return [m5AreaSvg(room.id, new Set()), [h("b", {}, room.lit ? room.name : "Covered room"), " ", room.lit ? room.say : "Covered.", h("small", {}, " · B zooms back out")]]; }
      delete f.dataset.zoomed;
      const L = sel.lit || shown.has(sel.id);
      return [m5WorldSvg(sel.id, shown), [h("b", {}, L ? sel.name : "Not reached yet"), " ", sel.zoom ? "A zooms in to every room." : sel.goal ? "Where you asked about. The dot marks it." : L ? "You have been here." : "Covered until you get there."]];
    }, {
      nav: (d) => { if (zoom) { const n = m5Near(M5_ROOMS, room, d); if (n) room = n; return !!n; } const n = m5Near(M5_WORLD, sel, d); if (n) sel = n; return !!n; },
      onA: (why) => { if (why === "B") { zoom = false; return; } if (!zoom && sel.zoom) zoom = true; },
    });
    fig.setAttribute("data-start", "");
    q = "where is the city of tears";
    parts = [h("p", { "data-stop": "" }, "Here is the whole kingdom. The City of Tears is marked; places you haven't been stay covered."), fig, cap];
  } else if (kind === "shot") {
    let i = 0;
    const [fig, cap] = m5Figure("shot", () => {
      const m = M5_MARKS[i];
      return [m5ShotSvg(m.n), [h("b", {}, `${m.n} · ${m.name}`), " ", m.say, h("span", { class: "m5-sure" + (m.sure ? "" : " no") }, m.sure ? "sure" : "not sure")]];
    }, { nav: (d) => { if (d !== "Left" && d !== "Right") return false; i = (i + (d === "Left" ? M5_MARKS.length - 1 : 1)) % M5_MARKS.length; return true; } });
    fig.setAttribute("data-start", "");
    q = "how do i hurt this thing";
    parts = [h("p", { "data-stop": "", html: "That's the <b>Gonarch</b>. I marked three things on your screenshot. Left and Right step through them." }), fig, cap];
  }

  const qb = qBubble2(q);
  if (kind === "shot") $(".k2-qt", qb).before(h("span", { class: "m5-thumb", html: m5ShotSvg(0, { plain: true }) }));
  sc.append(h("div", { class: "k2-turn" }, qb, aBubble2(parts, { stopEach: false })));
  return root;
}

const MAPS_R2_OPTIONS = [
  { id: "2A", group: "r2", groupTitle: "Round 2: more maps, and fuller boss help", label: "A", title: "The aim card, fuller", desc: "Round 1's card, grown to three tabs: Hit, Dodge and Bring. Left and Right switch tabs. Ten boss notes have the Hit line today; Dodge and Bring would need two new lines in each boss note.", build: () => mapsR2Mock("card") },
  { id: "2B", group: "r2", label: "B", title: "An area map, room by room, with covers", desc: "A real map of one area: benches, the stag, the boss room, the exits. Rooms you have asked about in this chat are open; the rest wear the spoiler cover. The D-pad walks room to room; A uncovers one.", build: () => mapsR2Mock("fog") },
  { id: "2C", group: "r2", label: "C", title: "A route, one step at a time", desc: "For “how do I get to…”: the way there as a line of stops, with what you need on the way. Later steps are covered; A on the next one shows it, so you only see as far as you want.", build: () => mapsR2Mock("route") },
  { id: "2D", group: "r2", label: "D", title: "The whole kingdom, then zoom in", desc: "A map of every region, with the place you asked about marked and unreached regions covered. A on the Crossroads zooms into its rooms (the same map as option B); B zooms back out.", build: () => mapsR2Mock("world") },
  { id: "2W", group: "r2", label: "Wild", wild: true, title: "Your screenshot, marked in several places", desc: "Round 1's Wild 1, grown: up to three numbered marks (hit, avoid, dodge), each saying whether the Deck's AI is sure. An unsure mark is dashed. Before any build: your scoring test, with Opus or Fable grading the small models' marks out of 10.", build: () => mapsR2Mock("shot") },
];

/* Put round 2 on top of tab 5; round 1 stays below with its picks */
(() => {
  const t5 = TABS.find((t) => t.id === "t5");
  t5.title = "Maps and boss help in answers, round 2";
  t5.today = [
    "Round 1: you liked the “where to aim” card, marking your own screenshot, and the map with fog. The line outline and the small maps were too basic, and you asked for more maps.",
    "bonsAI cannot see your save file, so it does not know which rooms you have reached. In these drawings it opens what you have asked about in this chat, and covers the rest the way spoiler covers already work.",
    "Map layouts here are rough, drawn for the mock-up. A real map has to be drawn and checked against the notes' source rules before it can ship.",
  ];
  t5.deciding = [
    "Which maps are worth it: one area room by room, a route, or the whole kingdom with zoom.",
    "How far the boss card grows (Hit, Dodge, Bring), since each new line has to be written into every boss note.",
    "Whether marking screenshots goes ahead to your scoring test.",
  ];
  t5.howto = "Put the highlight on a map or card, then use the D-pad inside it. A uncovers, zooms or shows the next step; B zooms back out. Round 1 is further down, with your picks.";
  t5.options = [...MAPS_R2_OPTIONS, ...t5.options.map((o, i) => ({ ...o, group: "r1", groupTitle: i === 0 ? "Round 1 (your earlier picks)" : undefined }))];
})();
