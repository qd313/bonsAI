/* ============================================================
   Saving picks and comments: the page's own database on claude.ai, or this browser as a fallback.
   Copied from the density board (docs/demos/mockup-board-2/src/30-core.js) with a new storage key.
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

const Store = {
  db: null,
  mode: "starting", // starting | cloud | local
  picks: {},        // key -> {verdict, at}
  comments: [],     // {id, key, text, at, from}
  listeners: new Set(),
  LOCAL_KEY: "bonsai-readme-board",

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
  const warn = $("#local-warn");
  if (warn) warn.hidden = Store.mode !== "local";
  const el = $("#save-state");
  if (!el) return;
  el.dataset.state = Store.mode;
  el.textContent = Store.mode === "cloud" ? "Picks and comments save for Claude to read"
    : Store.mode === "local" ? "Saving in this browser only. Open the page on claude.ai in a web browser so Claude can read your picks."
    : "Connecting…";
}

function fmtTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch (e) { return ""; }
}

const ICONS = {
  up: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 2 2.5 8.5h3.3V14h4.4V8.5h3.3z"/></svg>`,
  down: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 14l5.5-6.5h-3.3V2H5.8v5.5H2.5z"/></svg>`,
};

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
  const ta = h("textarea", { id: formId, rows: compact ? 3 : 2, placeholder: compact ? "Anything about this whole tab…" : "What works, what doesn't, what to change…" });
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
  }
}
