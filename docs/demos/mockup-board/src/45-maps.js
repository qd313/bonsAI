/* ============================================================
   Tab 5: maps and boss outlines in answers
   Example content comes from real notes in the knowledge base.
   ============================================================ */
const FK_PARTS = [
  { id: "head", n: 1, name: "Head", say: "Hit it only after he topples and the armour opens. The only real damage, and the only Soul.", x: 128, y: 34, good: true },
  { id: "mace", n: 2, name: "Mace", say: "Not a target. When it goes up high, dash away; jump the shockwave.", x: 214, y: 30, good: false },
  { id: "armour", n: 3, name: "Armour", say: "Hits here do almost nothing. Wait for the topple.", x: 110, y: 92, good: false },
  { id: "legs", n: 4, name: "Left leg", say: "Stand close to it: most swings miss you there.", x: 92, y: 132, good: null },
];
function falseKnightSvg(sel) {
  const mk = (p) => {
    const on = p.id === sel;
    const col = p.good ? "#7dff9a" : p.good === false ? "#ff8a7a" : "#ffd36b";
    return `<g class="mk${on ? " on" : ""}"><circle cx="${p.x}" cy="${p.y}" r="${on ? 12 : 9}" fill="none" stroke="${col}" stroke-width="${on ? 2.5 : 1.6}"/>
      <text x="${p.x}" y="${p.y + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="${col}">${p.n}</text></g>`;
  };
  return `<svg viewBox="0 0 260 150" role="img" aria-label="Outline of the False Knight with four marked parts">
    <defs><pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="2" fill="rgba(125,255,154,0.05)"/></pattern></defs>
    <rect width="260" height="150" fill="#06120b"/><rect width="260" height="150" fill="url(#scan)"/>
    <g fill="none" stroke="#7dff9a" stroke-width="1.6" stroke-linejoin="round" opacity="0.85">
      <path d="M58 140 L66 104 Q60 70 86 56 Q112 44 140 50 Q172 56 176 86 Q180 112 168 140"/>
      <path d="M82 140 L88 118 M150 140 L146 118"/>
      <path d="M112 52 Q112 26 128 20 Q144 26 144 50"/>
      <path d="M116 24 L106 10 M140 24 L150 10"/>
      <path d="M170 74 L206 40"/>
      <rect x="200" y="14" width="30" height="30" rx="6" transform="rotate(20 215 29)"/>
      <path d="M84 84 Q120 100 166 84" opacity="0.6"/>
    </g>
    ${FK_PARTS.map(mk).join("")}
    <text x="8" y="14" font-size="9" fill="#7dff9a" opacity="0.8" font-family="monospace">FALSE KNIGHT · WHERE TO HIT</text>
  </svg>`;
}

function gonarchScene(marked) {
  return `<svg viewBox="0 0 260 140" role="img" aria-label="${marked ? "Screenshot with the egg sac circled" : "Screenshot of the Gonarch"}">
    <rect width="260" height="140" fill="#2b2a24"/>
    <rect y="96" width="260" height="44" fill="#3a352a"/>
    <path d="M0 96 Q60 80 120 92 T260 86 V140 H0z" fill="#4a4233"/>
    <g fill="#191713" stroke="#0c0b09" stroke-width="2">
      <ellipse cx="140" cy="46" rx="58" ry="26"/>
      <path d="M96 52 L60 108 M106 60 L84 116 M176 56 L214 106 M168 62 L190 118" stroke="#191713" stroke-width="7" stroke-linecap="round"/>
    </g>
    <ellipse cx="138" cy="84" rx="20" ry="16" fill="#d9cfb4" opacity="0.92"/>
    <path d="M138 68 L138 58" stroke="#a89a78" stroke-width="3"/>
    ${marked ? `<circle cx="138" cy="84" r="27" fill="none" stroke="#ff4d4d" stroke-width="3"/>
      <path d="M182 120 L160 100" stroke="#ff4d4d" stroke-width="3" stroke-linecap="round"/>
      <rect x="176" y="114" width="78" height="20" rx="4" fill="#ff4d4d"/>
      <text x="215" y="128" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">Aim here</text>` : ""}
  </svg>`;
}

const CROSSROADS = {
  center: { id: "fc", name: "Forgotten Crossroads", x: 130, y: 80, say: "You are here. The hub: most roads start from these tunnels." },
  links: [
    { id: "gp", name: "Greenpath", dir: "West", x: 40, y: 80, say: "West. Overgrown and green; a good next step." },
    { id: "cp", name: "Crystal Peak", dir: "East", x: 220, y: 80, say: "East. Needs a way through first; come back later." },
    { id: "fw", name: "Fungal Wastes", dir: "South", x: 130, y: 140, say: "South. Acid pools and bouncing mushrooms." },
  ],
};
function compassSvg(sel, { big = false } = {}) {
  const all = [CROSSROADS.center, ...CROSSROADS.links];
  const node = (n) => {
    const on = n.id === sel, w = Math.max(70, n.name.length * 6.2 + 14);
    return `<g class="node${on ? " on" : ""}"><rect x="${n.x - w / 2}" y="${n.y - 13}" width="${w}" height="26" rx="5" fill="${n.id === "fc" ? "#22402d" : "#1d2733"}" stroke="${on ? "#fff" : n.id === "fc" ? "#52d88a" : "#5a6b80"}" stroke-width="${on ? 2.2 : 1.2}"/>
      <text x="${n.x}" y="${n.y + 4}" text-anchor="middle" font-size="10" font-weight="600" fill="#e8eef5">${n.name}</text></g>`;
  };
  const line = (n) => `<line x1="130" y1="80" x2="${n.x}" y2="${n.y}" stroke="#5a6b80" stroke-width="2" stroke-dasharray="4 3"/>`;
  return `<svg viewBox="-10 50 280 ${big ? 120 : 112}" role="img" aria-label="Map: Forgotten Crossroads and where its roads lead">
    ${CROSSROADS.links.map(line).join("")}${all.map(node).join("")}
    <text x="0" y="62" font-size="9" fill="#9fb7d5">N ↑</text></svg>`;
}

const FOG_ROOMS = [
  { id: "dm", name: "Dirtmouth", x: 130, y: 20, seen: true },
  { id: "fc", name: "Crossroads", x: 130, y: 62, seen: true },
  { id: "gp", name: "Greenpath", x: 40, y: 62, seen: true },
  { id: "cp", name: "Crystal Peak", x: 222, y: 40, seen: false },
  { id: "fw", name: "Fungal Wastes", x: 130, y: 104, seen: false },
  { id: "ct", name: "City of Tears", x: 222, y: 104, seen: false },
];
const FOG_LINKS = [["dm", "fc"], ["fc", "gp"], ["fc", "cp"], ["fc", "fw"], ["fw", "ct"]];
function fogSvg(sel, revealed) {
  const by = Object.fromEntries(FOG_ROOMS.map((r) => [r.id, r]));
  const lit = (r) => r.seen || revealed.has(r.id);
  return `<svg viewBox="-12 0 284 124" role="img" aria-label="Map with rooms you have not reached hidden in fog">
    ${FOG_LINKS.map(([a, b]) => `<line x1="${by[a].x}" y1="${by[a].y}" x2="${by[b].x}" y2="${by[b].y}" stroke="${lit(by[a]) && lit(by[b]) ? "#5a6b80" : "#2a3340"}" stroke-width="2"/>`).join("")}
    ${FOG_ROOMS.map((r) => {
      const on = r.id === sel;
      const L = lit(r);
      return `<g><rect x="${r.x - 40}" y="${r.y - 11}" width="80" height="22" rx="5" fill="${L ? "#1d2733" : "#141a21"}" stroke="${on ? "#fff" : L ? "#5a6b80" : "#2a3340"}" stroke-width="${on ? 2.2 : 1.2}" ${L ? "" : 'stroke-dasharray="3 3"'}/>
      <text x="${r.x}" y="${r.y + 4}" text-anchor="middle" font-size="9.5" font-weight="600" fill="${L ? "#e8eef5" : "#4c5a6a"}">${L ? r.name : "? ? ?"}</text></g>`;
    }).join("")}</svg>`;
}

function mapsMock(kind) {
  let q, paras, extra = [];
  const sc = h("div", { class: "scroll" });
  const body = mainTab({ transcript: [], chatName: kind === "screenshot" ? "Black Mesa help" : kind === "card" ? "Ocarina help" : "Hollow Knight help" });
  body.scroller.replaceWith(sc);
  const root = deckFrame({ body });
  const panel = $(".qam", root);

  if (kind === "outline") {
    let i = 0;
    const fig = h("div", { class: "vats", "data-stop": "", "data-start": "" });
    const cap = h("div", { class: "vats-cap" });
    const draw = () => { fig.innerHTML = falseKnightSvg(FK_PARTS[i].id); const p = FK_PARTS[i]; cap.replaceChildren(h("b", {}, `${p.n} · ${p.name}`), " ", p.say); };
    fig.addEventListener("deckkey", (e) => { if (e.detail.key === "Left" || e.detail.key === "Right") { e.preventDefault(); i = (i + (e.detail.key === "Left" ? FK_PARTS.length - 1 : 1)) % FK_PARTS.length; draw(); } });
    fig.addEventListener("click", (e) => { const t = e.target.closest(".mk"); if (t) { const k = $$(".mk", fig).indexOf(t); if (k >= 0) { i = k; draw(); } } });
    draw();
    sc.append(h("div", { class: "turn" }, qBubble("where do i hit false knight"), reasonLine(11),
      aBubble([h("p", { "data-stop": "" }, "Here's where to hit him. Left and Right step through the marks."), fig, cap, h("p", { "data-stop": "" }, "Stay by his left leg, wait for the topple, then go for the head.")]),
      ...rateRow(), detailsLine()));
  } else if (kind === "chip") {
    const chip = h("button", { class: "mapchip", "data-stop": "", "data-start": "" }, h("span", { class: "ico", html: ICONS.map }), h("span", {}, "Map: Forgotten Crossroads"), h("span", { class: "ico", html: ICONS.chevR }));
    sc.append(h("div", { class: "turn" }, qBubble("where do i go after the crossroads"), reasonLine(9),
      aBubble([h("p", { "data-stop": "", html: "From the <b>Forgotten Crossroads</b>, head west to <b>Greenpath</b> first. Crystal Peak to the east needs a way through, so leave it for later." }), chip]),
      ...rateRow(), detailsLine()));
    chip.addEventListener("click", () => openMapViewer(root, panel, chip));
  } else if (kind === "card") {
    const rows = [
      ["◎", "Nucleus", "The only part that can be hurt.", "good"],
      ["↗", "Hookshot", "Drags the nucleus out onto the floor.", "tool"],
      ["✕", "The water around it", "Hitting it does nothing.", "bad"],
    ];
    const card = h("div", { class: "aimcard", "data-stop": "", "data-start": "" },
      h("div", { class: "aim-head" }, h("span", { class: "ico", html: ICONS.target }), "Morpha · where to aim"),
      ...rows.map(([g, n, s, c]) => h("div", { class: "aim-row " + c }, h("span", { class: "g" }, g), h("span", {}, h("b", {}, n), " ", s))),
      h("div", { class: "aim-src" }, "From the note's “Weak points” line"));
    sc.append(h("div", { class: "turn" }, qBubble("how do i beat morpha"), reasonLine(8),
      aBubble([h("p", { "data-stop": "" }, "Morpha hides in the water, so you can't just swing at it."), card, h("p", { "data-stop": "" }, "Keep to the walkway edges and let it come to you.")]),
      ...rateRow(), detailsLine()));
  } else if (kind === "compass") {
    let sel = "fc";
    const order = { fc: { Left: "gp", Right: "cp", Down: "fw" }, gp: { Right: "fc" }, cp: { Left: "fc" }, fw: { Up: "fc" } };
    const fig = h("div", { class: "compass", "data-stop": "", "data-start": "" });
    const cap = h("div", { class: "vats-cap blue" });
    const draw = () => {
      fig.innerHTML = compassSvg(sel);
      const n = [CROSSROADS.center, ...CROSSROADS.links].find((x) => x.id === sel);
      cap.replaceChildren(h("b", {}, n.name), " ", n.say);
    };
    fig.addEventListener("deckkey", (e) => {
      const go = order[sel][e.detail.key];
      if (go) { e.preventDefault(); sel = go; draw(); }
      else if (e.detail.key === "Left" || e.detail.key === "Right") e.preventDefault();
    });
    draw();
    sc.append(h("div", { class: "turn" }, qBubble("where do the roads from the crossroads go"), reasonLine(7),
      aBubble([h("p", { "data-stop": "" }, "Three roads lead out of the Crossroads. The D-pad walks the map; Up from the centre leaves it."), fig, cap]),
      ...rateRow(), detailsLine()));
  } else if (kind === "screenshot") {
    const shot = h("div", { class: "shot", html: gonarchScene(false) });
    const marked = h("div", { class: "shot marked", "data-stop": "", "data-start": "", html: gonarchScene(true) });
    sc.append(h("div", { class: "turn" },
      h("div", { class: "qb" }, shot, "how do i hurt this thing", h("span", { class: "retry", html: ICONS.retry })), reasonLine(16),
      aBubble([h("p", { "data-stop": "", html: "That's the <b>Gonarch</b>. Only the pale sac under its body takes damage, so every shot anywhere else is wasted." }), marked, h("p", { "data-stop": "" }, "Keep moving sideways while you shoot; its spit lands where you stood.")]),
      ...rateRow(), detailsLine()));
  } else if (kind === "fog") {
    const revealed = new Set();
    let sel = "fc";
    const ids = FOG_ROOMS.map((r) => r.id);
    const fig = h("div", { class: "compass fog", "data-stop": "", "data-start": "" });
    const cap = h("div", { class: "vats-cap blue" });
    const draw = () => {
      fig.innerHTML = fogSvg(sel, revealed);
      const r = FOG_ROOMS.find((x) => x.id === sel);
      const lit = r.seen || revealed.has(r.id);
      cap.replaceChildren(lit ? h("b", {}, r.name) : h("b", {}, "Not reached yet"), " ", lit ? (r.seen ? "You have been here." : "Shown because you asked.") : "A to show it. It may spoil what's there.");
    };
    fig.addEventListener("deckkey", (e) => {
      if (e.detail.key === "Left" || e.detail.key === "Right") {
        e.preventDefault();
        sel = ids[(ids.indexOf(sel) + (e.detail.key === "Left" ? ids.length - 1 : 1)) % ids.length]; draw();
      }
    });
    fig.addEventListener("click", () => { revealed.add(sel); draw(); });
    draw();
    sc.append(h("div", { class: "turn" }, qBubble("show me a map of where i've been"), reasonLine(6),
      aBubble([h("p", { "data-stop": "" }, "Rooms you haven't reached stay in the fog. Left and Right pick a room; A shows a fogged one."), fig, cap]),
      ...rateRow(), detailsLine()));
  }
  return root;
}

function openMapViewer(root, panel, back) {
  let sel = "fc";
  const nodes = { fc: { Left: "gp", Right: "cp", Down: "fw" }, gp: { Right: "fc" }, cp: { Left: "fc" }, fw: { Up: "fc" } };
  const pane = h("div", { class: "mapview" });
  const fig = h("div", { class: "mv-fig", "data-stop": "" });
  const cap = h("div", { class: "mv-cap" });
  const close = h("button", { class: "q-btn quiet", "data-stop": "" }, "Close map");
  const draw = () => {
    fig.innerHTML = compassSvg(sel, { big: true });
    const n = [CROSSROADS.center, ...CROSSROADS.links].find((x) => x.id === sel);
    cap.replaceChildren(h("b", {}, n.name), h("p", {}, n.say));
  };
  pane.append(h("div", { class: "mv-head" }, h("span", { class: "ico", html: ICONS.map }), "Forgotten Crossroads"), fig, cap, close, hintBar([["B", "Close"], ["A", "Select"]]));
  panel.append(pane);
  draw();
  const shut = () => { pane.remove(); Deck.setRing(root, back); };
  fig.addEventListener("deckkey", (e) => {
    const k = e.detail.key;
    if (k === "B") { e.preventDefault(); shut(); return; }
    const go = nodes[sel][k];
    if (go) { e.preventDefault(); sel = go; draw(); }
    else if (k === "Left" || k === "Right" || k === "Up") e.preventDefault();
  });
  close.addEventListener("click", shut);
  close.addEventListener("deckkey", (e) => { if (e.detail.key === "B") { e.preventDefault(); shut(); } });
  Deck.setRing(root, fig);
}

TABS.push({
  id: "t5", n: 5, name: "Maps in answers", stars: 3,
  title: "Maps and boss outlines in answers",
  today: [
    "Answers are words only. Nothing draws a picture today.",
    "You asked (August) for two shapes: a dungeon map, and a boss outline with the weak points marked the way Fallout marks them, so a player sees where to aim instead of reading about it.",
    "A real map has to be drawn by someone and checked against the notes' source rules. A few notes already carry a “Weak points” line, and area notes name where their roads lead, so some pictures could be made from words we already have.",
  ],
  deciding: [
    "Which kind of picture is worth it first: a boss outline, a map, or a card made from the note's own words.",
    "Inside the answer, or behind a button that opens it big.",
    "How pictures and spoiler covers work together: boss and area notes are already the riskiest kind.",
  ],
  howto: "The pictures add no new places for the ring. Put the ring on a picture and use Left and Right (and Up and Down on the maps) to explore it.",
  options: [
    { id: "A", label: "A", title: "A boss outline, Fallout style", desc: "A green outline with numbered marks: green to hit, red to avoid, amber to stand by. Left and Right step through the marks with a line of advice for each. Needs a drawing per boss.", build: () => mapsMock("outline") },
    { id: "B", label: "B", title: "A map button that opens big", desc: "The answer stays words, plus one button. A opens the map over the whole panel; the D-pad walks it, B closes it.", build: () => mapsMock("chip") },
    { id: "C", label: "C", title: "A “where to aim” card from the note's words", desc: "No art at all. The plugin turns a note's “Weak points” line into a short card: hit this, use that, ignore this. Ten notes have that line today.", build: () => mapsMock("card") },
    { id: "D", label: "D", title: "A small compass map inside the answer", desc: "Drawn by the plugin from the roads an area note already names. No artist needed. The D-pad walks from room to room.", build: () => mapsMock("compass") },
    { id: "W1", label: "Wild 1", wild: true, title: "Mark my screenshot", desc: "Attach a screenshot of the fight, and the answer sends it back with the weak spot circled.", build: () => mapsMock("screenshot") },
    { id: "W2", label: "Wild 2", wild: true, title: "A map with fog", desc: "Rooms you haven't reached stay hidden, so the map never spoils what's ahead. A on a fogged room shows it, if you want.", build: () => mapsMock("fog") },
  ],
});
