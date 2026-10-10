/* ============================================================
   Boot: build the tabs, the option cards and the review blocks
   ============================================================ */
function buildPage() {
  const tablist = $("#tablist");
  const panels = $("#panels");
  TABS.sort((a, b) => a.n - b.n);
  for (const t of TABS) {
    const btn = h("button", { class: "tabbtn", role: "tab", id: `tabbtn-${t.id}`, "aria-controls": `tab-${t.id}`, "aria-selected": "false", tabindex: "-1", type: "button" },
      h("span", { class: "tab-n" }, `${t.n} / ${TABS.length}`),
      h("span", { class: "tab-name" }, t.name),
      h("span", { class: "tab-meta" }, h("span", { class: "tab-stars", "aria-label": `${t.stars} stars` }, "★".repeat(t.stars)), h("span", { class: "tab-count" })));
    btn.addEventListener("click", () => { showTab(t.id); t.onShow && t.onShow(); });
    btn.addEventListener("keydown", (e) => {
      const i = TABS.indexOf(t);
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const n = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
        showTab(n.id, { focus: true }); n.onShow && n.onShow();
      }
    });
    tablist.append(btn);

    const panel = h("section", { class: "tabpanel", role: "tabpanel", id: `tab-${t.id}`, "aria-labelledby": `tabbtn-${t.id}`, hidden: true });
    const brief = h("div", { class: "brief" },
      h("h2", {}, t.title, h("small", { "aria-label": `${t.stars} stars` }, "★".repeat(t.stars))),
      h("section", {}, h("h3", {}, "What a player notices today"), h("ul", {}, ...t.today.map((x) => h("li", {}, x)))),
      h("section", {}, h("h3", {}, "What we're deciding"), h("ul", {}, ...t.deciding.map((x) => h("li", {}, x)))),
      h("div", { class: "note-box", html: `<b>How to try it:</b> ${t.howto}` }));
    if (t.controls) brief.append(t.controls());
    brief.append(h("p", { class: "summary", id: `summary-${t.id}` }, ""));
    panel.append(brief);

    let grid = null, group = null;
    for (const o of t.options) {
      if (!grid || o.group !== group) {
        group = o.group;
        if (o.groupTitle) panel.append(h("h3", { class: "group-title" }, o.groupTitle));
        grid = h("div", { class: "opts" + (t.wide ? " wide" : "") });
        panel.append(grid);
      }
      const key = `${t.id}-${o.id}`;
      const card = h("article", { class: "opt", "data-group": o.group || "", "aria-labelledby": `h-${key}` });
      card.append(h("div", { class: "opt-head" },
        h("div", { class: "opt-tag" }, o.today ? h("span", { class: "today" }, "Today") : o.wild ? h("span", { class: "wild" }, o.label.replace("Wild", "Outside the box")) : `Option ${o.label}`),
        h("h4", { id: `h-${key}` }, o.title),
        h("p", { class: "opt-desc" }, o.desc)));
      let built;
      try { built = o.build(); } catch (err) { console.error(err); built = h("p", { class: "opt-desc" }, "This mock-up failed to draw: " + err.message); }
      for (const node of [].concat(built).filter(Boolean)) {
        if (node.classList && (node.classList.contains("deck") || node.classList.contains("deck-swap"))) {
          card.append(h("div", { class: "deck-wrap" }, h("div", { class: "deck-scale" }, node)));
        } else card.append(node);
      }
      card.append(reviewBlock(key));
      grid.append(card);
    }
    panel.append(h("section", { class: "overall" },
      h("h3", {}, "About this whole mock-up"),
      h("p", {}, "Mix-and-match ideas, things none of the options got right, or anything else."),
      reviewBlock(`${t.id}-overall`, { compact: true, label: "Comments on this whole mock-up" })));
    panels.append(panel);
  }
}

function boot() {
  buildPage();
  Deck.init();
  Store.onChange(renderReviews);
  for (const b of $$(".zoom button")) b.addEventListener("click", () => setZoom(b.dataset.z));
  let z = "1";
  try { z = localStorage.getItem("bonsai-mockups-zoom") || "1"; } catch (e) {}
  setZoom(z);
  let first = TABS[0].id;
  const fromHash = (location.hash || "").slice(1);
  let saved = null;
  try { saved = localStorage.getItem("bonsai-mockups-tab"); } catch (e) {}
  if (TABS.some((t) => t.id === fromHash)) first = fromHash;
  else if (saved && TABS.some((t) => t.id === saved)) first = saved;
  showTab(first);
  const ft = TABS.find((t) => t.id === first);
  ft && ft.onShow && setTimeout(ft.onShow, 60);
  renderReviews();
  Store.start();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
