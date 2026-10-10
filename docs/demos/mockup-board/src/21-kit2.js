/* ============================================================
   Kit, new layout: the Main tab as it ships since 2026-10-09 (plan 84).
   Panel 300 x 454 on the Deck's own screen, top to bottom:
   tab bar 20 (in Steam's old empty strip), the chat's name 28 (in Decky's bar),
   gap 4, chat 295, chips 32, gap 2, question box 73 (small Ask and the game tag in its strip).
   Sizes, colours and icons read from plan 84's drawing (docs/planning/assets/84-vertical-room.html).
   Round 2 of the other tabs should move onto this kit too.
   ============================================================ */
const svg2 = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICONS2 = {
  back: svg2('<path d="M11 5l-7 7 7 7M4.5 12H20"/>'),
  clip: svg2('<path d="M20 11.5l-8.3 8.3a5 5 0 0 1-7.1-7.1l8.3-8.3a3.3 3.3 0 0 1 4.7 4.7l-8.3 8.3a1.7 1.7 0 0 1-2.4-2.4l7.6-7.6"/>'),
  mic: svg2('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>'),
  speaker: svg2('<path d="M4 9.5v5h3.5L12 18V6L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
  copy: svg2('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>'),
  gear: svg2('<circle cx="12" cy="12" r="7" stroke-width="3.4" stroke-dasharray="2.75 2.75"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1.6"/>'),
  game: svg2('<path d="M7 8h10a4.5 4.5 0 0 1 4.5 4.5v.5a3 3 0 0 1-5.3 1.9L15 13.5H9l-1.2 1.4A3 3 0 0 1 2.5 13v-.5A4.5 4.5 0 0 1 7 8z"/><path d="M7.5 10.5v3M6 12h3"/>'),
  down: svg2('<path d="M6 9l6 6 6-6"/>'),
  redo: svg2('<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4.5H15"/>'),
  send: svg2('<path d="M5 12h13M13 6.5l5.5 5.5-5.5 5.5"/>'),
  server: svg2('<rect x="4" y="4" width="16" height="7" rx="1.5"/><rect x="4" y="13" width="16" height="7" rx="1.5"/><path d="M8 7.5h.01M8 16.5h.01"/>'),
  bug: svg2('<rect x="7" y="7.5" width="10" height="12.5" rx="5"/><path d="M12 7.5V4.5M3.5 13h3.5M17 13h3.5M5 19l2.5-1.5M19 19l-2.5-1.5M5.5 7l2.2 2M18.5 7l-2.2 2"/>'),
  info: svg2('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.6v.2"/>'),
  search: svg2('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
  tree: svg2('<path d="M12 21v-7M9 21h6"/><path d="M12 14c-4.2 0-6.5-2-6.5-4.6C5.5 6.5 8.4 4 12 4s6.5 2.5 6.5 5.4C18.5 12 16.2 14 12 14z"/>'),
  lock: svg2('<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
  plus: svg2('<path d="M12 5v14M5 12h14"/>'),
  pencil: svg2('<path d="M4 20h4L19.5 8.5l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
  sum: svg2('<path d="M5 6h14M5 10h14M5 14h9M5 18h6"/>'),
  save: svg2('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
  trash: svg2('<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/>'),
  chat: svg2('<path d="M4 5h16v11H10l-5 4z"/>'),
  note: svg2('<path d="M5 4h14v12l-4 4H5z"/><path d="M15 20v-4h4M8 9h8M8 13h5"/>'),
  book: svg2('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>'),
};
/* The tabs, in the order LB and RB walk them */
const TABS2 = [["Main", "tree"], ["Ollama", "server"], ["Settings", "gear"], ["Permissions", "lock"], ["Developer", "bug"], ["About", "info"]];

/* The 20-point tab bar: the current tab's icon and name in the middle, the others dimmed around it */
function tabBar2(cur = 0, tabs = TABS2) {
  const n = tabs.length;
  const icon = (k) => h("span", { class: "k2-ti", html: ICONS2[tabs[(cur + k + n) % n][1]] });
  return h("div", { class: "k2-tabbar" },
    h("span", { class: "k2-sh" }, "LB"),
    h("span", { class: "k2-side l" }, icon(-2), icon(-1)),
    h("span", { class: "k2-mid" }, h("span", { class: "k2-ti", html: ICONS2[tabs[cur][1]] }), tabs[cur][0].toUpperCase()),
    h("span", { class: "k2-side r" }, icon(1), icon(2), icon(3)),
    h("span", { class: "k2-sh" }, "RB"));
}

/* The 28-point row in Decky's bar: back arrow, the chat's name with its menu arrow, "LT chat 3 of 8 RT" under it */
function nameRow2(name, no = 1, count = 8, { stop = true } = {}) {
  const nm = h("span", { class: "k2-cname", "data-stop": stop ? "" : null, "data-name": "" },
    h("span", { class: "k2-nm" }, h("b", {}, name), h("i", { class: "k2-car", html: ICONS2.down })),
    h("span", { class: "k2-sub" }, h("span", { class: "k2-key" }, "LT"), `chat ${no} of ${count}`, h("span", { class: "k2-key" }, "RT")));
  return h("div", { class: "k2-namerow" }, h("span", { class: "k2-back", html: ICONS2.back }), h("span", { class: "k2-cpill" }, nm), h("span", { class: "k2-mirror" }));
}

/* Chips 32, gap 2, question box 73 */
function dock2({ chips = ["How do I fix stuttering?", "Why can't bonsAI reach my PC?"], placeholder = "Describe the level, boss, or puzzle you're stuck on.", typed = "", game = "No game", mode = "Strategy" } = {}) {
  const d = h("div", { class: "k2-dock" });
  const field = h("button", { class: "k2-field" + (typed ? " typed" : ""), "data-stop": "", "data-box": "" }, typed || placeholder);
  const mic = h("button", { class: "k2-ic k2-mic", "data-stop": "", "data-row": "strip", "aria-label": "Speak", html: ICONS2.mic });
  const ask = h("button", { class: "k2-ask", "data-stop": "", "data-row": "strip" }, "Ask", h("span", { html: ICONS2.send }));
  d.append(
    h("div", { class: "k2-chips" }, ...chips.map((c) => h("button", { class: "k2-chip", "data-stop": "", "data-row": "chips2" }, c))),
    h("div", { class: "k2-box" }, h("span", { class: "k2-avatar" }), field,
      h("div", { class: "k2-strip" }, h("span", { class: "k2-ic", html: ICONS2.clip }),
        h("span", { class: "k2-game" }, h("span", { html: ICONS2.game }), game),
        h("span", { class: "k2-mode" }, mode), mic, ask)));
  d.field = field; d.mic = mic; d.ask = ask;
  return d;
}

/* A whole Main tab in the new layout. Pass header: false to deckFrame with it. */
function mainTab2({ transcript, chatName = "Hollow Knight help", chatNo = 1, chatCount = 8, dockEl, tab = 0 } = {}) {
  const body = h("div", { class: "k2", style: "display:contents" });
  const sc = h("div", { class: "scroll k2-scroll" });
  for (const t of [].concat(transcript || [])) sc.append(t);
  const row = nameRow2(chatName, chatNo, chatCount);
  body.append(tabBar2(tab), row, h("div", { class: "k2-gap" }), sc, dockEl || dock2());
  body.scroller = sc;
  body.nameRow = row;
  return body;
}

/* Chat pieces in the new look */
function qBubble2(text, { stop = true, open = true } = {}) {
  return h("div", { class: "k2-q" + (open ? "" : " old"), "data-stop": stop ? "" : null }, h("span", { class: "k2-redo", html: ICONS2.redo }), h("span", { class: "k2-qt" }, text));
}
function aBubble2(paras, { stopEach = true } = {}) {
  const ab = h("div", { class: "k2-answer" });
  for (const p of paras) {
    const el = typeof p === "string" ? h("p", { html: p }) : p;
    if (stopEach && !el.hasAttribute("data-stop")) el.setAttribute("data-stop", "");
    ab.append(el);
  }
  ab.append(h("span", { class: "k2-bspeak", html: ICONS2.speaker }), h("span", { class: "k2-copy", html: ICONS2.copy }));
  return ab;
}
/* One line of the "N earlier" list: "42 earlier", "Yesterday · 9", "Show 6 more" */
function earlierLine2(text, { open = null, cls = "" } = {}) {
  return h("button", { class: "k2-eline " + cls, "data-stop": "" }, h("span", { class: "k2-epill" }, text), h("span", { class: "k2-erule" }), open == null ? "" : h("span", { class: "k2-echev" }, open ? "▾" : "▸"));
}
