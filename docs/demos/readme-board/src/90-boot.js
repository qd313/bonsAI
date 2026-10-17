/* ============================================================
   Boot: the header, the tabs, the option cards and the review blocks
   ============================================================ */
function buildHeader() {
  const root = $("#root");
  root.append(
    h("header", { class: "top" },
      h("h1", {}, "bonsAI README board", h("small", {}, "mock-ups of the new README, drawn as GitHub shows it"))),
    h("div", { class: "intro" },
      h("p", {}, "Five tabs, one per part of the page. Each card is a drawing of what a visitor to the GitHub page would see. Press Like or Not this under a card, and write anything you want changed. Your picks save inside this page for Claude to read."),
      h("p", {}, "The clips are stand-ins: one still frame from today's old GIFs, with a play bar drawn over it. Every clip will be re-recorded, in real time, on both screens.")),
    h("div", { id: "local-warn", hidden: true }, "Your picks are not reaching the saved store. Open this page in a web browser signed in to claude.ai, not in the Claude app's own panel, or they will be lost when the page reloads."),
    h("div", { class: "toolbar" },
      h("span", {}, "Show the GitHub drawings in:"),
      h("div", { class: "seg", role: "group", "aria-label": "GitHub theme" },
        ...[["follow", "Follow my theme"], ["light", "Light"], ["dark", "Dark"]].map(([v, l]) =>
          h("button", { type: "button", "data-gh": v, "aria-pressed": "false", onclick: () => setGh(v) }, l))),
      h("span", { id: "save-state", "data-state": "starting" }, "Connecting…")),
    h("div", { class: "tabs", id: "tablist", role: "tablist" }),
    h("div", { id: "panels" }));
}

function setGh(v) {
  if (v === "follow") delete document.body.dataset.gh; else document.body.dataset.gh = v;
  for (const b of $$(".toolbar [data-gh]")) b.setAttribute("aria-pressed", String(b.dataset.gh === v));
  try { localStorage.setItem("bonsai-readme-board-gh", v); } catch (e) { /* ignore */ }
}

function buildTabs() {
  const tablist = $("#tablist");
  const panels = $("#panels");
  TABS.sort((a, b) => a.n - b.n);
  for (const t of TABS) {
    const btn = h("button", { class: "tabbtn", role: "tab", id: `tabbtn-${t.id}`, "aria-controls": `tab-${t.id}`, "aria-selected": "false", tabindex: "-1", type: "button" },
      h("span", { class: "tab-n" }, `${t.n} / ${TABS.length}`),
      h("span", { class: "tab-name" }, t.name),
      h("span", { class: "tab-count" }));
    btn.addEventListener("click", () => showTab(t.id));
    btn.addEventListener("keydown", (e) => {
      const i = TABS.indexOf(t);
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const n = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
        showTab(n.id, { focus: true });
      }
    });
    tablist.append(btn);

    const panel = h("section", { class: "tabpanel", role: "tabpanel", id: `tab-${t.id}`, "aria-labelledby": `tabbtn-${t.id}`, hidden: true });
    const brief = h("div", { class: "brief" }, h("h2", {}, t.title));
    for (const p of t.brief) brief.append(h("p", { html: p }));
    brief.append(h("p", {}, h("b", {}, "What we're deciding:")), h("ul", {}, ...t.deciding.map((x) => h("li", {}, x))));
    brief.append(h("div", { class: "note-box", html: `<b>How to look:</b> ${t.howto}` }));
    panel.append(brief);

    const ordered = [...t.options].sort((a, b) => (b.round || 1) - (a.round || 1)); // newest round first
    const hasRounds = ordered.some((o) => (o.round || 1) > 1);
    let grid = null, round = null;
    for (const o of ordered) {
      const r = o.round || 1;
      if (!grid || r !== round) {
        round = r;
        if (hasRounds) panel.append(h("h3", { class: "round-title" }, r === 1 ? "Round 1, what you picked from" : `Round ${r}, drawn from your picks`));
        grid = h("div", { class: "opts" + (t.wide ? " two" : "") });
        panel.append(grid);
      }
      const key = `${t.id}-${o.id}`;
      const card = h("article", { class: "opt", "aria-labelledby": `h-${key}` });
      card.append(h("div", { class: "opt-head" },
        h("div", { class: "opt-tag" }, o.today ? h("span", { class: "today" }, "Today's shape") : o.wild ? h("span", { class: "wild" }, "Outside the box") : o.round ? h("span", { class: "round" }, `Round ${o.round} · option ${o.id}`) : `Option ${o.id}`),
        h("h4", { id: `h-${key}` }, o.title),
        h("p", { class: "opt-desc", html: o.desc })));
      let built;
      try { built = o.build(); } catch (err) { console.error(err); built = h("p", { class: "opt-desc" }, "This drawing failed: " + err.message); }
      card.append(built);
      card.append(reviewBlock(key));
      grid.append(card);
    }
    panel.append(h("section", { class: "overall" },
      h("h3", {}, "About this whole tab"),
      h("p", {}, "Mix-and-match ideas, things none of the options got right, or anything else."),
      reviewBlock(`${t.id}-overall`, { compact: true, label: "Comments on this tab" })));
    panels.append(panel);
  }
}

function showTab(id, { focus = false } = {}) {
  for (const t of TABS) {
    const on = t.id === id;
    const b = $(`#tabbtn-${t.id}`), p = $(`#tab-${t.id}`);
    b.setAttribute("aria-selected", String(on));
    b.tabIndex = on ? 0 : -1;
    p.hidden = !on;
    if (on && focus) b.focus();
  }
  try { localStorage.setItem("bonsai-readme-board-tab", id); } catch (e) { /* ignore */ }
  if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
}

function start() {
  buildHeader();
  buildTabs();
  let gh = "follow";
  try { gh = localStorage.getItem("bonsai-readme-board-gh") || "follow"; } catch (e) { /* ignore */ }
  setGh(gh);
  let tab = (location.hash || "").slice(1);
  if (!TABS.some((t) => t.id === tab)) { try { tab = localStorage.getItem("bonsai-readme-board-tab"); } catch (e) { /* ignore */ } }
  if (!TABS.some((t) => t.id === tab)) tab = TABS[0].id;
  showTab(tab);
  window.addEventListener("hashchange", () => {
    const id = (location.hash || "").slice(1);
    if (TABS.some((t) => t.id === id)) showTab(id);
  });
  Store.onChange(() => { renderReviews(); renderSaveState(); });
  renderReviews();
  renderSaveState();
  Store.start();
}
start();
