/* ============================================================
   Tab 8: Search in bonsAI. Find an earlier question by a word in it.
   Drawn in the new layout (plan 84), with the kit in 21-kit2.js.
   Eight saved chats, the most bonsAI keeps. The open one is long (28 questions over five days).
   ============================================================ */
const S_DAYS = ["Mon 5 Oct", "Tue 6 Oct", "Wed 7 Oct", "Yesterday", "Today"];
const S_GENERIC = "The saved answer shows here, word for word, as it was given.";
const S_CHATS = [
  { name: "Hollow Knight help", when: "now", qs: [
    { d: 0, t: "What does the Dream Nail do?" },
    { d: 0, t: "Where do I find the Mantis Claw?", a: "In the Mantis Village, at the bottom of the Fungal Wastes. Drop past the mantis warriors; the claw sits on a ledge at the end. They stop attacking once you have it." },
    { d: 0, t: "How do I beat the False Knight, quick tips please" },
    { d: 0, t: "Which charms are best early on?" },
    { d: 0, t: "Where is the Stag Station in Greenpath?" },
    { d: 0, t: "Is Greenpath safe before I have the Mantis Claw?", a: "Mostly, yes. You can explore most of it, but a few ledges need the claw. Come back once you have it." },
    { d: 0, t: "Where do I buy more map pieces?" },
    { d: 1, t: "How do I beat the Mantis Lords?", a: "Fight the first lord alone and learn her three moves: the dash, the dive and the boomerang. When two drop at once, stay between them and pogo whoever dashes. Heal only after a dive." },
    { d: 1, t: "Where is the entrance to Crystal Peak?" },
    { d: 1, t: "What are good early upgrades for the Nail?" },
    { d: 1, t: "How do I get to the City of Tears?" },
    { d: 1, t: "Which bench is closest to the Soul Sanctum?" },
    { d: 1, t: "How do I get past the spike rooms in Greenpath?" },
    { d: 2, t: "How do I beat Hornet at Greenpath?" },
    { d: 2, t: "What does the Spell Twister charm do?" },
    { d: 2, t: "Where do I find the Monarch Wings?" },
    { d: 2, t: "Do the mantis tribe stay friendly after the fight?", a: "Yes. Once you beat the Mantis Lords, the warriors bow as you pass and never attack again." },
    { d: 2, t: "How do I fight Nosk without taking damage?" },
    { d: 2, t: "Where is the Pale Ore in the Crystal Peak?" },
    { d: 3, t: "What should I bring into the Soul Sanctum?" },
    { d: 3, t: "Where do I get the Shade Cloak?" },
    { d: 3, t: "What is the fastest way to farm Geo?" },
    { d: 3, t: "Which charm notches should I buy first?" },
    { d: 3, t: "Can I come back to the Forgotten Crossroads later?" },
    { d: 4, t: "Can you remind me how Focus works while moving?" },
    { d: 4, t: "Where is the Soul Sanctum entrance?" },
    { d: 4, t: "Is the Soul Sanctum before or after the City of Tears?" },
    { d: 4, t: "How do I beat the Soul Master?", a: "Soul Master has two parts. At first he teleports and fires a soul orb: stay low and hit him after each orb. Later he slams the floor, so keep your Dash ready." },
  ] },
  { name: "Half-Life 2 run", when: "2 h ago", qs: [
    { t: "How do I get the Gravity Gun?" },
    { t: "How do I beat the gunship?", a: "Rockets, and patience. Shoot your laser-guided rocket, then steer it round the gunship's own shots. Hide under the bridge between rockets." },
    { t: "What do I do about the zombies in Ravenholm?" },
    { t: "How do I beat the Strider?" },
    { t: "How many rockets does the second Strider take?" },
  ] },
  { name: "Hades builds", when: "Yesterday", qs: [
    { t: "Which weapon should I start with?" },
    { t: "How does the Pact of Punishment work?" },
    { t: "What is the best boon from Athena?" },
    { t: "Which keepsake works with the Stygian Blade?" },
  ] },
  { name: "Celeste", when: "Mon", qs: [
    { t: "How do I get the strawberry in Forsaken City?" },
    { t: "How do I do a wall bounce?" },
    { t: "Any tips for the dream blocks in the Old Site?" },
  ] },
  { name: "Battery life", when: "Mon", qs: [
    { t: "How do I make the battery last longer?", a: "Cap the frame rate at 40, turn the screen down a little, and close the game's launcher if it stays open behind the game." },
    { t: "Does a frame limit save battery?" },
    { t: "Why does the fan get loud in menus?" },
    { t: "Is 40 fps a good battery setting?" },
  ] },
  { name: "Ollama on PC", when: "Sep 30", qs: [
    { t: "Why can't bonsAI reach my PC?" },
    { t: "Which model is fastest on the Deck?" },
    { t: "How do I open the firewall port?" },
  ] },
  { name: "Stutter fixes", when: "Sep 29", qs: [
    { t: "How do I fix stuttering in Proton games?" },
    { t: "Does shader pre-caching help with stutter?" },
    { t: "What does the performance overlay show?" },
  ] },
  { name: "Steel Soul run", when: "Sep 28", qs: [
    { t: "Which bosses are hardest on one life?" },
    { t: "Should I fight the Mantis Lords on Steel Soul?", a: "Yes, but only once you can beat them without healing on a normal save. They are fair and slow, so practise on another file first." },
    { t: "Best charms for a one-life run?" },
  ] },
];
/* Things outside the chats that "search everything" also finds */
const S_SETTINGS = [["Frame rate limit", "Steam's performance menu · saves battery"], ["Battery percentage", "Steam's top bar"], ["Performance overlay", "Steam's performance menu · shows stutter"], ["Screen brightness", "Steam's quick settings"], ["Answer cache", "bonsAI's Settings tab"]];
const S_MYNOTES = [["I'm on a Steel Soul run (one life).", "Your note · Hollow Knight"], ["No spoilers past the City of Tears.", "Your note · Hollow Knight"]];
const S_KB = [["Mantis Lords", "Game note · Hollow Knight"], ["Soul Master", "Game note · Hollow Knight"], ["Gunship", "Game note · Half-Life 2"], ["Stuttering in Proton games", "Help note · every game"], ["Battery and frame limits", "Help note · Steam Deck"]];
const S_SKIP = new Set("what does where find beat quick tips please which best early with have there that this from before after into your should about many make last longer good does take takes much fight work works come back later first more down remind while moving taking damage fastest under".split(" "));

const sDay = (q) => (q.d != null ? S_DAYS[q.d] : null);
const sNewest = (ci) => S_CHATS[ci].qs.length - 1;
function sEsc(t) { return t.replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
function sMark(text, word) {
  if (!word) return sEsc(text);
  const re = new RegExp("(" + word.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&") + ")", "ig");
  return sEsc(text).replace(re, "<mark>$1</mark>");
}
/* The words worth a button: in the most questions, ignoring short and common ones */
function sWords(texts, n = 8) {
  const c = new Map();
  for (const t of texts) {
    const seen = new Set();
    for (const w of t.toLowerCase().replace(/[^a-z0-9' ]/g, " ").split(/\s+/)) {
      if (w.length < 4 || S_SKIP.has(w) || seen.has(w)) continue;
      seen.add(w); c.set(w, (c.get(w) || 0) + 1);
    }
  }
  // "charms" counts as "charm" when both are there
  for (const w of [...c.keys()]) if (w.endsWith("s") && c.has(w.slice(0, -1))) { c.set(w.slice(0, -1), c.get(w.slice(0, -1)) + c.get(w)); c.delete(w); }
  return [...c.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, n).map(([w, k]) => ({ w, k }));
}
const sChatTexts = (cis) => cis.flatMap((ci) => S_CHATS[ci].qs.map((q) => q.t));
/* One group per chat that has a match; each hit jumps to that question */
function sChatGroups(ctx, cis, word, { snippet = false } = {}) {
  const out = [];
  for (const ci of cis) {
    const hits = [];
    S_CHATS[ci].qs.forEach((q, qi) => {
      if (!q.t.toLowerCase().includes(word.toLowerCase())) return;
      hits.push({ html: sMark(q.t, word), sub: (sDay(q) || S_CHATS[ci].when) + (snippet ? " · " + (q.a || S_GENERIC).slice(0, 58) + "…" : ""), go: () => sJump(ctx, ci, qi) });
    });
    if (hits.length) out.push({ label: S_CHATS[ci].name, icon: "chat", hits });
  }
  return out;
}

/* ---------- the finder: a find box, word buttons, and the matches ---------- */
function sFinder(ctx, { words, groups, sample = "mantis", placeholder = "Find a word", note = "" }) {
  const wrap = h("div", { class: "s-find" });
  const box = h("button", { class: "s-box", "data-stop": "" }, h("span", { class: "s-mag", html: ICONS2.search }), h("span", { class: "s-ph" }, placeholder));
  const rowA = h("div", { class: "s-words" }), rowB = h("div", { class: "s-words" });
  const results = h("div", { class: "s-results" });
  let word = null;
  words.forEach((o, i) => {
    const b = h("button", { class: "s-word", "data-stop": "", "data-row": (i < 4 ? "w1-" : "w2-") + ctx.uid, "data-w": o.w }, o.w, o.k ? h("small", {}, String(o.k)) : "");
    b.addEventListener("click", () => pick(o.w));
    (i < 4 ? rowA : rowB).append(b);
  });
  function pick(w) {
    word = w;
    $(".s-ph", box).replaceChildren(h("b", {}, w));
    for (const b of $$(".s-word", wrap)) b.classList.toggle("on", b.dataset.w === w);
    draw();
    const first = $(".s-hit", results);
    Deck.setRing(ctx.root, first || box);
  }
  function clear() {
    word = null;
    $(".s-ph", box).textContent = placeholder;
    for (const b of $$(".s-word", wrap)) b.classList.remove("on");
    draw();
    Deck.setRing(ctx.root, box);
  }
  function draw() {
    results.replaceChildren();
    if (!word) { results.append(h("p", { class: "s-hint" }, note || "Pick a word, or press A on the box to type one.")); return; }
    const gs = groups(word);
    const n = gs.reduce((s, g) => s + g.hits.length, 0);
    const clr = h("button", { class: "s-clear", "data-stop": "" }, "Clear");
    clr.addEventListener("click", clear);
    results.append(h("div", { class: "s-count" }, h("span", {}, n ? `${n} ${n === 1 ? "match" : "matches"} for “${word}”` : `Nothing has “${word}”`), clr));
    for (const g of gs) {
      results.append(h("div", { class: "s-group" }, h("span", { class: "s-gi", html: ICONS2[g.icon] || "" }), g.label, h("small", {}, String(g.hits.length))));
      for (const hit of g.hits) {
        const b = h("button", { class: "s-hit", "data-stop": "" }, h("span", { class: "s-ht", html: hit.html }), h("small", {}, hit.sub));
        b.addEventListener("click", hit.go);
        results.append(b);
      }
    }
  }
  box.addEventListener("click", () => fakeKeyboard(ctx.root, ctx.panel, sample, (t) => { if (t) pick(t); else Deck.setRing(ctx.root, box); }));
  wrap.append(box, rowA, rowB, results);
  wrap.box = box;
  wrap.reset = clear;
  draw();
  return wrap;
}

/* ---------- a Main tab in the new layout, with the chat state ---------- */
let S_UID = 0;
function sMain(ctx, { chat = 0, tabs = TABS2, tab = 0, dockOpts = {} } = {}) {
  ctx.chat = chat;
  const dk = dock2(dockOpts);
  const body = mainTab2({ chatName: S_CHATS[chat].name, chatNo: chat + 1, chatCount: S_CHATS.length, dockEl: dk });
  body.firstChild.replaceWith(tabBar2(tab, tabs));
  ctx.holder.replaceChildren(body);
  Object.assign(ctx, { body, sc: body.scroller, dk });
  sWireName(ctx);
  return ctx;
}
function sCtx() {
  const holder = h("div", { style: "display:contents" });
  const root = deckFrame({ body: holder, header: false });
  return { root, holder, panel: $(".qam", root), uid: ++S_UID };
}
function sWireName(ctx) {
  const nm = $(".k2-cname", ctx.body.nameRow);
  nm.addEventListener("click", () => (ctx.onName ? ctx.onName() : toast(ctx.panel, "Opens the chats menu, as today.", 1600)));
}
function sSetChat(ctx, ci) {
  ctx.chat = ci;
  const nr = nameRow2(S_CHATS[ci].name, ci + 1, S_CHATS.length);
  ctx.body.nameRow.replaceWith(nr);
  ctx.body.nameRow = nr;
  sWireName(ctx);
}
function sTurn(q, { found = false } = {}) {
  const qb = qBubble2(q.t);
  if (found) qb.classList.add("s-found");
  return h("div", { class: "k2-turn" }, qb, aBubble2([q.a || S_GENERIC]));
}
/* The chat at rest: "N earlier" (closed) and the newest question with its answer */
function sNewestView(ctx, { earlier } = {}) {
  const ci = ctx.chat;
  const n = sNewest(ci);
  const line = earlier ? earlier(ctx) : (() => {
    const l = earlierLine2(`${n} earlier`, { open: false });
    l.addEventListener("click", () => toast(ctx.panel, "Opens the day lines, as today.", 1500));
    return l;
  })();
  ctx.sc.replaceChildren(...[].concat(line), sTurn(S_CHATS[ci].qs[n]));
  ctx.sc.scrollTop = ctx.sc.scrollHeight;
}
/* Jump: open the found question in its own chat, with a way back */
function sJump(ctx, ci, qi) {
  const from = { chat: ctx.chat, label: S_CHATS[ctx.chat].qs[sNewest(ctx.chat)].t };
  if (ctx.beforeJump) ctx.beforeJump();
  if (ci !== ctx.chat) sSetChat(ctx, ci);
  const q = S_CHATS[ci].qs[qi];
  const back = h("button", { class: "s-back", "data-stop": "" }, "‹ Back to where you were");
  back.addEventListener("click", () => (ctx.afterBack ? ctx.afterBack(from) : (sSetChat(ctx, from.chat), sNewestView(ctx, { earlier: ctx.earlier }), Deck.setRing(ctx.root, $(".k2-answer p", ctx.sc)))));
  const kids = [back];
  if (qi > 0) kids.push(h("div", { class: "s-ctx" }, `${qi} earlier ${qi === 1 ? "question" : "questions"} above this one`));
  kids.push(sTurn(q, { found: true }));
  if (qi < sNewest(ci)) kids.push(h("div", { class: "s-ctx" }, `${sNewest(ci) - qi} newer below · Down keeps reading`));
  ctx.sc.replaceChildren(...kids);
  ctx.sc.scrollTop = 0;
  Deck.setRing(ctx.root, $(".s-found", ctx.sc));
  toast(ctx.panel, `Jumped to ${sDay(q) || S_CHATS[ci].when} in “${S_CHATS[ci].name}”.`, 1800);
}

/* ---------- "N earlier" with its day lines (built 2026-10-08), optionally with a find line on top ---------- */
function sEarlierBlock(ctx, { find = false } = {}) {
  const ci = ctx.chat;
  const qs = S_CHATS[ci].qs.slice(0, -1);
  const line = earlierLine2(`${qs.length} earlier`, { open: false });
  const box = h("div", { class: "s-days", hidden: true });
  line.setAttribute("data-start", "");
  const days = h("div", { class: "s-daylist" });
  S_DAYS.forEach((label, d) => {
    const items = qs.map((q, qi) => [q, qi]).filter(([q]) => q.d === d);
    if (!items.length) return;
    const dl = earlierLine2(`${label} · ${items.length}`, { open: false, cls: "day" });
    const list = h("div", { class: "s-rows", hidden: true });
    let shown = 6;
    const fill = () => {
      list.replaceChildren(...items.slice(0, shown).map(([q, qi]) => sOldRow(ctx, ci, qi)));
      if (items.length > shown) {
        const more = earlierLine2(`Show ${Math.min(6, items.length - shown)} more`, { cls: "more" });
        more.addEventListener("click", () => { shown += 6; fill(); Deck.setRing(ctx.root, $$(".k2-q", list)[shown - 6] || dl); });
        list.append(more);
      }
    };
    dl.addEventListener("click", () => {
      list.hidden = !list.hidden;
      $(".k2-echev", dl).textContent = list.hidden ? "▸" : "▾";
      if (!list.hidden) { fill(); Deck.setRing(ctx.root, $(".k2-q", list)); }
    });
    days.append(dl, list);
  });
  if (find) {
    const f = sFinder(ctx, {
      words: sWords(qs.map((q) => q.t), 8),
      groups: (w) => sChatGroups(ctx, [ci], w).map((g) => ({ ...g, label: "In this chat" })),
      note: "Pick a word to list only the questions that have it. The days are still below.",
    });
    box.append(h("div", { class: "s-inline" }, f), days);
  } else box.append(days);
  line.addEventListener("click", () => {
    box.hidden = !box.hidden;
    $(".k2-echev", line).textContent = box.hidden ? "▸" : "▾";
    if (!box.hidden) Deck.setRing(ctx.root, $("[data-stop]", box));
  });
  box.addEventListener("deckkey", (e) => { if (e.detail.key === "B") { e.preventDefault(); box.hidden = true; $(".k2-echev", line).textContent = "▸"; Deck.setRing(ctx.root, line); } });
  return [line, box];
}
/* An older question as a closed row; A opens its answer under it */
function sOldRow(ctx, ci, qi) {
  const q = S_CHATS[ci].qs[qi];
  const row = h("div", { class: "s-old" });
  const b = qBubble2(q.t, { open: false });
  b.addEventListener("click", () => {
    const open = $(".k2-answer", row);
    if (open) { open.remove(); b.classList.add("old"); return; }
    b.classList.remove("old");
    row.append(aBubble2([q.a || S_GENERIC], { stopEach: false }));
  });
  row.append(b);
  return row;
}

/* ---------- the chats menu (built 2026-10-09), optionally with "Find in your chats" on top ---------- */
function sChatsMenu(ctx, { find = false } = {}) {
  const m = h("div", { class: "s-menu" });
  const inner = h("div", { class: "scroll s-menu-in" });
  m.append(inner);
  ctx.panel.append(m);
  let view = "list";
  const nameEl = () => $(".k2-cname", ctx.body.nameRow);
  const close = () => { m.remove(); Deck.setRing(ctx.root, nameEl()); };
  function drawList(ringSel) {
    view = "list";
    const kids = [h("h4", {}, "Your chats")];
    if (find) {
      const fr = h("button", { class: "s-findrow", "data-stop": "" }, h("span", { class: "s-mag", html: ICONS2.search }), "Find in your chats", h("small", {}, "all 8"));
      fr.addEventListener("click", drawFind);
      kids.push(fr);
    }
    S_CHATS.forEach((c, i) => {
      const r = h("button", { class: "s-crow" + (i === ctx.chat ? " on" : ""), "data-stop": "" }, h("span", {}, c.name), h("small", {}, c.when));
      r.addEventListener("click", () => { m.remove(); sSetChat(ctx, i); sNewestView(ctx, { earlier: ctx.earlier }); Deck.setRing(ctx.root, nameEl()); });
      kids.push(r);
    });
    const act = (label, icon, row, cls = "") => h("button", { class: "s-cact " + cls, "data-stop": "", "data-row": "ca" + row + ctx.uid, onclick: () => toast(ctx.panel, label + ": as today.", 1300) }, h("span", { class: "s-gi", html: ICONS2[icon] }), label);
    kids.push(h("div", { class: "s-cacts" }, act("New chat", "plus", 0), act("Rename chat", "pencil", 0), act("Sum up this chat", "sum", 1), act("Save to Desktop note", "save", 1), act("Delete chat", "trash", 2, "danger")));
    kids.push(h("p", { class: "s-mhint" }, "B, or A on the name again, goes back to the chat."));
    inner.replaceChildren(...kids);
    inner.scrollTop = 0;
    Deck.setRing(ctx.root, ringSel ? $(ringSel, inner) : $("[data-stop]", inner), { scroll: false });
  }
  function drawFind() {
    view = "find";
    const back = h("button", { class: "s-mback", "data-stop": "" }, "‹ Your chats");
    back.addEventListener("click", () => drawList(".s-findrow"));
    const all = S_CHATS.map((_, i) => i);
    const f = sFinder(ctx, { words: sWords(sChatTexts(all), 8), groups: (w) => sChatGroups(ctx, all, w), placeholder: "Find a word in any chat" });
    inner.replaceChildren(h("h4", {}, "Find in your chats"), back, f);
    Deck.setRing(ctx.root, f.box, { scroll: false });
  }
  ctx.beforeJump = () => m.remove();
  m.addEventListener("deckkey", (e) => {
    if (e.detail.key !== "B") return;
    e.preventDefault();
    if (view === "find") drawList(".s-findrow"); else close();
  });
  drawList(find ? ".s-findrow" : ".s-crow.on");
}

/* ---------- the options ---------- */
function searchMock(kind) {
  const ctx = sCtx();
  const { root } = ctx;

  if (kind === "today" || kind === "menu") {
    sMain(ctx);
    ctx.earlier = kind === "today" ? (c) => sEarlierBlock(c) : null;
    ctx.onName = () => sChatsMenu(ctx, { find: kind === "menu" });
    sNewestView(ctx, { earlier: ctx.earlier });
    $("[data-start]", root)?.removeAttribute("data-start");
    (kind === "menu" ? $(".k2-cname", root) : $(".k2-eline", root)).setAttribute("data-start", "");
  } else if (kind === "earlier") {
    sMain(ctx);
    ctx.earlier = (c) => sEarlierBlock(c, { find: true });
    sNewestView(ctx, { earlier: ctx.earlier });
  } else if (kind === "asked") {
    sMain(ctx, { dockOpts: { placeholder: "Describe the level, boss, or puzzle you're stuck on." } });
    sNewestView(ctx);
    const field = ctx.dk.field;
    field.setAttribute("data-start", "");
    let card = null;
    const typedQ = "how do i beat the mantis lords";
    field.addEventListener("click", () => fakeKeyboard(root, ctx.panel, typedQ, (t) => {
      if (!t) { Deck.setRing(root, field); return; }
      field.textContent = t; field.classList.add("typed");
      card && card.remove();
      const keys = t.toLowerCase().split(/\s+/).filter((w) => w.length >= 4 && !S_SKIP.has(w));
      const scored = [];
      S_CHATS.forEach((c, ci) => c.qs.forEach((q, qi) => {
        const s = keys.filter((k) => q.t.toLowerCase().includes(k)).length;
        if (s >= 2) scored.push({ ci, qi, q, s });
      }));
      scored.sort((a, b) => b.s - a.s);
      const top = scored.slice(0, 2);
      card = h("div", { class: "s-asked" }, h("div", { class: "s-asked-h" }, h("span", { class: "s-gi", html: ICONS2.redo }), "You asked this before", h("small", {}, "A opens it · Ask asks again")),
        ...top.map((m) => {
          let html = sEsc(m.q.t);
          for (const k of keys) html = html.replace(new RegExp("(" + k + ")", "ig"), "<mark>$1</mark>");
          const b = h("button", { class: "s-hit", "data-stop": "" }, h("span", { class: "s-ht", html }), h("small", {}, `${S_CHATS[m.ci].name} · ${sDay(m.q) || S_CHATS[m.ci].when}`));
          b.addEventListener("click", () => { card.remove(); card = null; field.textContent = "Describe the level, boss, or puzzle you're stuck on."; field.classList.remove("typed"); sJump(ctx, m.ci, m.qi); });
          return b;
        }));
      ctx.dk.prepend(card);
      Deck.setRing(root, $(".s-hit", card));
    }));
    ctx.dk.ask.addEventListener("click", () => toast(ctx.panel, field.classList.contains("typed") ? "Asks it again as a new question, as today." : "Type a question first.", 1500));
  } else if (kind === "tab") {
    const TABS_S = [TABS2[0], ["Search", "search"], ...TABS2.slice(1)];
    const all = S_CHATS.map((_, i) => i);
    let finderEl = null;
    const showSearch = (keepRing) => {
      const sc = h("div", { class: "scroll s-tabpage" });
      if (!finderEl) {
        finderEl = sFinder(ctx, {
          words: sWords(sChatTexts(all), 8), placeholder: "Find a word in any chat",
          groups: (w) => sChatGroups(ctx, filterGames(), w, { snippet: true }),
          note: "Searches every saved chat: the questions and, later, the answers too. Pick a word, or a game first.",
        });
      }
      const games = [["All chats", null], ["Hollow Knight", [0, 7]], ["Half-Life 2", [1]], ["Hades", [2]]];
      const gameRow = h("div", { class: "s-games" }, ...games.map(([g, cis], k) => {
        const b = h("button", { class: "s-game" + (k === ctx.game ? " on" : ""), "data-stop": "", "data-row": "games" + ctx.uid }, g);
        b.addEventListener("click", () => { ctx.game = k; for (const x of $$(".s-game", gameRow)) x.classList.toggle("on", x === b); const w = $(".s-word.on", finderEl); if (w) w.click(); else Deck.setRing(root, b); });
        return b;
      }));
      function filterGames() { const g = games[ctx.game || 0][1]; return g || all; }
      sc.append(h("div", { class: "s-tabtitle" }, "Search your chats"), gameRow, finderEl);
      ctx.holder.replaceChildren(tabBar2(1, TABS_S), h("div", { class: "k2-gap" }), sc);
      if (!keepRing) Deck.setRing(root, finderEl.box, { scroll: false });
      else { const on = $(".s-hit", finderEl) || finderEl.box; Deck.setRing(root, on); }
    };
    ctx.game = 0;
    ctx.chat = 0;
    // A jump draws the Main tab first; Back comes back to the Search tab with the same word
    ctx.beforeJump = () => sMain(ctx, { chat: 0, tabs: TABS_S, tab: 0 });
    ctx.afterBack = () => showSearch(true);
    showSearch(false);
    finderEl.box.setAttribute("data-start", "");
  } else if (kind === "voice") {
    sMain(ctx);
    sNewestView(ctx);
    const mic = ctx.dk.mic;
    mic.setAttribute("data-start", "");
    ctx.dk.field.removeAttribute("data-start");
    mic.addEventListener("click", async () => {
      if (mic.classList.contains("live")) return;
      mic.classList.add("live");
      const field = ctx.dk.field;
      field.textContent = "Listening…";
      await sleep(900);
      field.textContent = "find the mantis lords"; field.classList.add("typed");
      await sleep(700);
      mic.classList.remove("live");
      field.textContent = "Describe the level, boss, or puzzle you're stuck on."; field.classList.remove("typed");
      const all = S_CHATS.map((_, i) => i);
      const gs = sChatGroups(ctx, all, "mantis");
      const n = gs.reduce((s, g) => s + g.hits.length, 0);
      const card = h("div", { class: "s-voicecard" }, h("div", { class: "s-asked-h" }, h("span", { class: "s-gi", html: ICONS2.search }), `${n} earlier questions with “mantis”`, h("small", {}, "a word search, no AI")));
      for (const g of gs) for (const hit of g.hits) {
        const b = h("button", { class: "s-hit", "data-stop": "" }, h("span", { class: "s-ht", html: hit.html }), h("small", {}, `${g.label} · ${hit.sub}`));
        b.addEventListener("click", hit.go);
        card.append(b);
      }
      ctx.sc.append(h("div", { class: "k2-turn" }, qBubble2("find the mantis lords"), card));
      Deck.setRing(root, $(".s-hit", card));
    });
  } else if (kind === "everything") {
    sMain(ctx);
    sNewestView(ctx);
    const hint = h("button", { class: "s-yhint", "data-stop": "", "data-start": "" }, h("b", {}, "Y"), "Search everything");
    ctx.sc.prepend(hint);
    ctx.dk.field.removeAttribute("data-start");
    const open = () => {
      if ($(".s-sheet", ctx.panel)) return;
      const all = S_CHATS.map((_, i) => i);
      const kindGroup = (label, icon, list, w, say) => {
        const hits = list.filter(([t, s]) => (t + " " + s).toLowerCase().includes(w)).map(([t, s]) => ({ html: sMark(t, w), sub: s, go: () => toast(ctx.panel, say(t), 1800) }));
        return hits.length ? [{ label, icon, hits }] : [];
      };
      const f = sFinder(ctx, {
        words: [{ w: "mantis" }, { w: "battery" }, { w: "stutter" }, { w: "soul" }],
        placeholder: "Chats, settings, notes…",
        groups: (w) => {
          const chats = sChatGroups(ctx, all, w);
          const merged = chats.length ? [{ label: "Your chats", icon: "chat", hits: chats.flatMap((g) => g.hits.map((x) => ({ ...x, sub: g.label + " · " + x.sub }))) }] : [];
          return [...merged,
            ...kindGroup("Settings", "gear", S_SETTINGS, w, (t) => `Opens “${t}” where it lives.`),
            ...kindGroup("Your notes", "note", S_MYNOTES, w, () => "Opens your note."),
            ...kindGroup("Game and help notes", "book", S_KB, w, (t) => `Shows the note “${t}”, in its own words.`)];
        },
        note: "One box for everything bonsAI knows: your chats, the settings it can open, your own notes, and its game notes.",
      });
      const sheet = h("div", { class: "s-sheet" }, h("div", { class: "s-sheet-h" }, h("span", { class: "s-gi", html: ICONS2.search }), "Search everything"), h("div", { class: "scroll s-sheet-in" }, f), hintBar([["B", "Close"], ["A", "Open"]]));
      ctx.panel.append(sheet);
      ctx.beforeJump = () => sheet.remove();
      sheet.addEventListener("deckkey", (e) => { if (e.detail.key === "B") { e.preventDefault(); sheet.remove(); Deck.setRing(root, hint); } });
      Deck.setRing(root, f.box, { scroll: false });
    };
    hint.addEventListener("click", open);
    root.addEventListener("deckkey", (e) => { if (e.detail.key === "Y") { e.preventDefault(); open(); } });
  }
  return root;
}

TABS.push({
  id: "t8", n: 8, name: "Search", stars: 2,
  title: "Search in bonsAI: find an earlier question by a word in it",
  today: [
    "There is no search. To find something you asked before, you open the chats menu, switch to the right chat, open “N earlier”, open a day, and read down the list. Eight chats are kept, and a long one holds dozens of questions.",
    "Typing on the Deck means Steam's on-screen keyboard. So every option also has word buttons, built from your own questions, that the D-pad can pick with no typing at all.",
    "You called this a bigger feature for a later release (about 0.7.0), and said a find box inside “N earlier” felt like too much for that small list.",
  ],
  deciding: [
    "Where search lives: in the chats menu, inside “N earlier”, behind the question box, or a tab of its own.",
    "What it searches: this chat, every chat, or everything bonsAI knows.",
    "How a word gets in: typed, picked from word buttons, or said out loud.",
  ],
  howto: "Drawn in the <b>new layout</b>, the one that shipped on 9 October. Pick a word button (or press A on the find box: a sample word is typed for you), then A on a match to jump to it. Each jump has <b>Back to where you were</b> at the top.",
  options: [
    { id: "today", label: "Today", today: true, title: "Open chats and days by hand", desc: "What ships now. Try to find the Mantis Lords question: open “27 earlier”, then each day. A on the chat's name opens the chats menu to switch chats.", build: () => searchMock("today") },
    { id: "A", label: "A", title: "“Find in your chats” in the chats menu", desc: "A on the chat's name opens the chats menu, with a find line at the top. It searches all eight chats; the matches are grouped by chat, and A jumps to the one you want.", build: () => searchMock("menu") },
    { id: "B", label: "B", title: "A find line inside “N earlier”", desc: "The idea from the older mock-up, on top of the day lines you already have. Opening “27 earlier” shows the find line first and the days under it. This chat only.", build: () => searchMock("earlier") },
    { id: "C", label: "C", title: "“You asked this before”", desc: "No new box: start typing a question as usual. If you have asked it before, the old question shows above the box. A opens that answer; Ask still asks again.", build: () => searchMock("asked") },
    { id: "D", label: "D", title: "A Search tab", desc: "Its own tab, next to Main. The whole panel is for searching: pick a game, then a word, and each match shows the start of its answer. Room to grow for a later release.", build: () => searchMock("tab") },
    { id: "W1", label: "Wild 1", wild: true, title: "Say “find …”", desc: "Press the mic and say “find the mantis lords”. The matches come back as a list in the chat. It is a plain word search, so it needs no AI and is instant.", build: () => searchMock("voice") },
    { id: "W2", label: "Wild 2", wild: true, title: "Y searches everything", desc: "Press Y anywhere on the Main tab. One box finds your chats, the settings bonsAI can open, your own notes, and its game notes.", build: () => searchMock("everything") },
  ],
});
