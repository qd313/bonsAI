/* ============================================================
   Core: saving picks and comments, the D-pad engine, tabs, zoom
   ============================================================ */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

/* ---------- Store: the artifact database, or this browser as a fallback ---------- */
const Store = {
  db: null,
  mode: "starting", // starting | cloud | local
  picks: {},        // key -> {verdict, at}
  comments: [],     // {id, key, text, at, from}
  listeners: new Set(),
  LOCAL_KEY: "bonsai-mockups-round1",

  onChange(fn) { this.listeners.add(fn); },
  emit() { for (const fn of this.listeners) fn(); },

  loadLocal() {
    try {
      const raw = localStorage.getItem(this.LOCAL_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        this.picks = d.picks || {};
        this.comments = d.comments || [];
      }
    } catch (e) { /* storage blocked: start empty */ }
  },
  saveLocal() {
    try {
      localStorage.setItem(this.LOCAL_KEY, JSON.stringify({ picks: this.picks, comments: this.comments }));
    } catch (e) { /* ignore */ }
  },

  async start() {
    this.loadLocal();
    this.emit();
    let db = null;
    try { db = window.claude && window.claude.use ? await window.claude.use("db") : null; } catch (e) { db = null; }
    if (!db) { this.mode = "local"; this.emit(); return; }
    this.db = db;
    this.mode = "cloud";
    db.collection("picks").onSnapshot((snap) => {
      const next = {};
      for (const d of snap.docs) { const v = d.data(); if (v && v.verdict) next[d.id] = v; }
      this.picks = next;
      this.emit();
    }, () => { this.mode = "local"; this.emit(); });
    db.collection("comments").orderBy("at", "asc").onSnapshot((snap) => {
      this.comments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      this.emit();
    }, () => { this.mode = "local"; this.emit(); });
    this.emit();
  },

  async setPick(key, verdict) {
    const prev = this.picks[key] && this.picks[key].verdict;
    const next = prev === verdict ? null : verdict; // pressing the same button again clears it
    if (next) this.picks[key] = { verdict: next, at: new Date().toISOString() };
    else delete this.picks[key];
    this.emit();
    if (this.mode === "cloud") {
      try {
        const ref = this.db.doc("picks/" + key);
        if (next) await ref.set({ verdict: next, at: new Date().toISOString() });
        else await ref.delete();
        flashSaved();
      } catch (e) { flashSaved(true); }
    } else { this.saveLocal(); flashSaved(); }
  },

  async addComment(key, text) {
    const item = { key, text, at: new Date().toISOString(), from: "you" };
    if (this.mode === "cloud") {
      try { await this.db.collection("comments").add(item); flashSaved(); }
      catch (e) { flashSaved(true); }
    } else {
      this.comments.push({ id: "local-" + Date.now(), ...item });
      this.saveLocal(); this.emit(); flashSaved();
    }
  },

  async removeComment(id) {
    if (this.mode === "cloud") {
      try { await this.db.doc("comments/" + id).delete(); flashSaved(); } catch (e) { flashSaved(true); }
    } else {
      this.comments = this.comments.filter((c) => c.id !== id);
      this.saveLocal(); this.emit(); flashSaved();
    }
  },
};

let savedTimer = null;
function flashSaved(failed) {
  const el = $("#save-state");
  if (!el) return;
  el.textContent = failed ? "Could not save. Try again." : (Store.mode === "cloud" ? "Saved" : "Saved in this browser");
  el.dataset.state = failed ? "bad" : "ok";
  clearTimeout(savedTimer);
  savedTimer = setTimeout(renderSaveState, 2400);
}
function renderSaveState() {
  const el = $("#save-state");
  if (!el) return;
  el.dataset.state = Store.mode;
  el.textContent = Store.mode === "cloud" ? "Picks and comments save for Claude to read"
    : Store.mode === "local" ? "Saving in this browser only. Open the page on claude.ai so Claude can read your picks."
    : "Connecting…";
}

/* ---------- Pick buttons and comment threads ---------- */
function fmtTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch (e) { return ""; }
}

function reviewBlock(key, { compact = false, label = "Comments on this option" } = {}) {
  const wrap = h("div", { class: "review" + (compact ? " review--compact" : ""), "data-key": key });
  if (!compact) {
    const bar = h("div", { class: "pickbar", role: "group", "aria-label": "Your pick" },
      h("button", { class: "pick pick--like", type: "button", "data-verdict": "like", onclick: () => Store.setPick(key, "like") },
        h("span", { class: "pick-ico", html: ICONS.up }), "Like"),
      h("button", { class: "pick pick--no", type: "button", "data-verdict": "no", onclick: () => Store.setPick(key, "no") },
        h("span", { class: "pick-ico", html: ICONS.down }), "Not this"),
    );
    wrap.append(bar);
  }
  const list = h("ul", { class: "thread", "aria-label": label });
  const formId = "c-" + key;
  const ta = h("textarea", { id: formId, rows: compact ? 3 : 2, placeholder: compact ? "Anything about this whole mock-up…" : "What works, what doesn't, what to change…" });
  const btn = h("button", { class: "btn-add", type: "submit" }, "Add comment");
  const form = h("form", { class: "comment-form" },
    h("label", { class: "sr", for: formId }, label), ta, btn);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const t = ta.value.trim();
    if (!t) { ta.focus(); return; }
    Store.addComment(key, t);
    ta.value = "";
  });
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); form.requestSubmit(); }
  });
  wrap.append(list, form);
  return wrap;
}

function renderReviews() {
  for (const wrap of $$(".review")) {
    const key = wrap.dataset.key;
    const verdict = Store.picks[key] && Store.picks[key].verdict;
    for (const b of $$(".pick", wrap)) b.setAttribute("aria-pressed", String(b.dataset.verdict === verdict));
    const card = wrap.closest(".opt");
    if (card) card.dataset.verdict = verdict || "";
    const list = $(".thread", wrap);
    list.replaceChildren();
    for (const c of Store.comments.filter((c) => c.key === key)) {
      const who = c.from === "claude" ? "Claude" : "You";
      const li = h("li", { class: "cmt cmt--" + (c.from === "claude" ? "claude" : "you") },
        h("div", { class: "cmt-head" }, h("b", {}, who), h("span", {}, fmtTime(c.at))),
        h("p", {}, c.text));
      if (c.from !== "claude") {
        li.append(h("button", { class: "cmt-del", type: "button", "aria-label": "Remove this comment", onclick: () => Store.removeComment(c.id) }, "Remove"));
      }
      list.append(li);
    }
  }
  // tab badges
  for (const t of TABS) {
    const likes = t.options.filter((o) => (Store.picks[t.id + "-" + o.id] || {}).verdict === "like").length;
    const nos = t.options.filter((o) => (Store.picks[t.id + "-" + o.id] || {}).verdict === "no").length;
    const notes = Store.comments.filter((c) => c.key.startsWith(t.id + "-")).length;
    const badge = $(`#tabbtn-${t.id} .tab-count`);
    if (badge) {
      const parts = [];
      if (likes) parts.push(likes + " liked");
      if (nos) parts.push(nos + " not");
      if (notes) parts.push(notes + (notes === 1 ? " note" : " notes"));
      badge.textContent = parts.join(" · ");
    }
    const sum = $(`#summary-${t.id}`);
    if (sum) {
      const liked = t.options.filter((o) => (Store.picks[t.id + "-" + o.id] || {}).verdict === "like").map((o) => o.label);
      const no = t.options.filter((o) => (Store.picks[t.id + "-" + o.id] || {}).verdict === "no").map((o) => o.label);
      sum.textContent = (liked.length || no.length)
        ? `Your picks: ${liked.length ? "like " + liked.join(", ") : ""}${liked.length && no.length ? " · " : ""}${no.length ? "not " + no.join(", ") : ""}`
        : "No picks yet on this tab.";
    }
  }
  renderSaveState();
}

/* ---------- The D-pad engine ----------
   Inside a mock, elements with data-stop are places the ring can land.
   Stops that share a data-row value sit side by side (Left/Right).
   Arrow keys = D-pad, Enter = A, Escape or Backspace = B.
   A mock can take over a press by listening for "deckkey" and calling preventDefault(). */
const Deck = {
  active: null,

  stops(root) {
    return $$("[data-stop]", root).filter((el) => {
      if (el.closest("[hidden]") || el.closest(".is-gone")) return false;
      if (el.matches("[disabled]") && !el.hasAttribute("data-stop-disabled")) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
  },

  rows(root) {
    const rows = [];
    let last = null;
    for (const el of this.stops(root)) {
      const r = el.dataset.row || null;
      if (r && last && last.id === r) last.items.push(el);
      else { last = { id: r || Symbol(), items: [el] }; rows.push(last); }
    }
    return rows;
  },

  current(root) { return $("[data-stop].ring", root); },

  setRing(root, el, { scroll = true } = {}) {
    for (const old of $$(".ring", root)) old.classList.remove("ring");
    if (!el) return;
    el.classList.add("ring");
    if (scroll) this.reveal(el);
    root.dispatchEvent(new CustomEvent("ringmove", { detail: { el } }));
  },

  reveal(el) {
    const sc = el.closest(".scroll");
    if (!sc) return;
    const er = el.getBoundingClientRect();
    const sr = sc.getBoundingClientRect();
    const z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--zoom")) || 1;
    const pad = 8;
    let dy = 0;
    if (er.height > sr.height - pad * 2) dy = er.top - sr.top - pad;
    else if (er.bottom > sr.bottom - pad) dy = er.bottom - sr.bottom + pad;
    else if (er.top < sr.top + pad) dy = er.top - sr.top - pad;
    if (dy) sc.scrollBy({ top: dy / z, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  },

  press(root, key) {
    const cur = this.current(root);
    const target = cur || root;
    const ev = new CustomEvent("deckkey", { detail: { key, stop: cur }, bubbles: true, cancelable: true });
    target.dispatchEvent(ev);
    if (ev.defaultPrevented) return;
    if (key === "A") { if (cur) cur.click(); return; }
    if (key === "B") return;
    const rows = this.rows(root);
    if (!rows.length) return;
    if (!cur) { this.setRing(root, rows[0].items[0]); return; }
    const ri = rows.findIndex((r) => r.items.includes(cur));
    const row = rows[ri];
    const ci = row.items.indexOf(cur);
    if (key === "Left" && ci > 0) this.setRing(root, row.items[ci - 1]);
    else if (key === "Right" && ci < row.items.length - 1) this.setRing(root, row.items[ci + 1]);
    else if (key === "Down" || key === "Up") {
      const nr = rows[ri + (key === "Down" ? 1 : -1)];
      if (!nr) { if (cur.closest(".scroll")) this.nudge(cur, key); return; }
      const cx = cur.getBoundingClientRect().left + cur.getBoundingClientRect().width / 2;
      let best = nr.items[0], bd = Infinity;
      for (const it of nr.items) {
        const r = it.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - cx);
        if (d < bd) { bd = d; best = it; }
      }
      this.setRing(root, best);
    }
  },

  nudge(el, key) {
    const sc = el.closest(".scroll");
    if (sc) sc.scrollBy({ top: key === "Down" ? 60 : -60, behavior: "smooth" });
  },

  activate(root) {
    if (this.active && this.active !== root) this.active.classList.remove("is-active");
    this.active = root;
    root.classList.add("is-active");
    if (!this.current(root)) {
      const start = $("[data-start]", root);
      const first = start && this.stops(root).includes(start) ? start : this.stops(root)[0];
      if (first) this.setRing(root, first, { scroll: false });
    }
  },

  init() {
    document.addEventListener("pointerdown", (e) => {
      const root = e.target.closest(".deck");
      if (!root) { if (this.active) this.active.classList.remove("is-active"); this.active = null; return; }
      this.activate(root);
      const stop = e.target.closest("[data-stop]");
      if (stop && root.contains(stop)) this.setRing(root, stop, { scroll: false });
    });
    document.addEventListener("focusin", (e) => {
      const root = e.target.closest && e.target.closest(".deck");
      if (root && e.target === root) this.activate(root);
    });
    document.addEventListener("keydown", (e) => {
      const root = this.active;
      if (!root || !document.body.contains(root)) return;
      if (e.target.closest && e.target.closest("textarea, input, select, .review")) return;
      if (!root.contains(document.activeElement) && document.activeElement !== document.body) return;
      const map = { ArrowUp: "Up", ArrowDown: "Down", ArrowLeft: "Left", ArrowRight: "Right", Enter: "A", " ": "A", Escape: "B", Backspace: "B", y: "Y", Y: "Y", x: "X", X: "X" };
      const key = map[e.key];
      if (!key) return;
      e.preventDefault();
      this.press(root, key);
    });
  },
};

/* A mock root: the device frame, with focus and the hint line underneath */
function deckFrame({ title = "", height = PANEL.h, body, hint, game = "no active game detected", header = true }) {
  const root = h("div", { class: "deck", tabindex: "0", role: "application", "aria-label": "Interactive mock-up. Use the arrow keys as the D-pad, Enter as A, Escape as B." });
  const panel = h("div", { class: "qam", style: `height:${height}px` });
  if (header) {
    panel.append(
      h("div", { class: "qam-head" },
        h("span", { class: "qam-back", html: ICONS.back }),
        h("span", { class: "qam-title" }, "BONSAI"), h("span", { class: "qam-ver" }, "v0.6.0")),
    );
  }
  panel.append(body);
  root.append(panel);
  return root;
}

/* ---------- Tabs and zoom ---------- */
function showTab(id, { focus = false } = {}) {
  for (const t of TABS) {
    const on = t.id === id;
    $(`#tabbtn-${t.id}`).setAttribute("aria-selected", String(on));
    $(`#tabbtn-${t.id}`).tabIndex = on ? 0 : -1;
    $(`#tab-${t.id}`).hidden = !on;
  }
  if (focus) $(`#tabbtn-${id}`).focus();
  const t = TABS.find((x) => x.id === id);
  if (t && !t.revealed) { t.revealed = true; requestAnimationFrame(() => revealStarts($(`#tab-${id}`))); }
  try { localStorage.setItem("bonsai-mockups-tab", id); } catch (e) {}
  try { history.replaceState(null, "", "#" + id); } catch (e) {}
}

/* On first view, scroll each panel so its starting point is in sight */
function revealStarts(panel) {
  const z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--zoom")) || 1;
  for (const deck of $$(".deck", panel)) {
    const s = $("[data-start]", deck);
    const sc = s && s.closest(".scroll");
    if (!sc) continue;
    const dy = (s.getBoundingClientRect().top - sc.getBoundingClientRect().top) / z - 10;
    sc.scrollTop += dy;
  }
}

function setZoom(z) {
  document.documentElement.style.setProperty("--zoom", z);
  for (const b of $$(".zoom button")) b.setAttribute("aria-pressed", String(b.dataset.z === String(z)));
  try { localStorage.setItem("bonsai-mockups-zoom", String(z)); } catch (e) {}
}
