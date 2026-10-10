/* ============================================================
   Tab 2: the AI models box, its Filters button and filters step
   Drawn as the whole Deck screen: 853 x 533 (1280 x 800 at 1.5x).
   The box is about 658 x 418.
   ============================================================ */
const MODELS = [
  { name: "qwen2.5:1.5b", gb: 1.0, lic: "FOSS", tier: 1, modes: ["Speed"], fit: 6, group: "Deck essentials", date: "Sep '24" },
  { name: "qwen2.5:3b", gb: 1.9, lic: "Qwen", tier: 2, modes: ["Speed", "Strategy"], fit: 6, group: "Deck essentials", installed: true, ask: true, place: 1, date: "Sep '24" },
  { name: "gemma4:e2b-it-qat", gb: 3.2, lic: "Gemma", tier: 2, modes: ["Speed", "Strategy", "Vision"], fit: 5, group: "Deck essentials", installed: true, place: 2, date: "Apr '26", isNew: true },
  { name: "qwen2.5vl:3b", gb: 3.2, lic: "Qwen", tier: 2, modes: ["Vision"], fit: 5, group: "Deck essentials", date: "Feb '25" },
  { name: "granite3.3:2b", gb: 1.5, lic: "FOSS", tier: 1, modes: ["Speed"], fit: 5, group: "More models", date: "Apr '25" },
  { name: "phi4-mini", gb: 2.5, lic: "FOSS", tier: 1, modes: ["Speed", "Strategy"], fit: 4, group: "More models", date: "Feb '25" },
  { name: "llama3.2:3b", gb: 2.0, lic: "Llama", tier: 2, modes: ["Speed", "Strategy"], fit: 4, group: "More models", date: "Sep '24" },
  { name: "qwen2.5:7b", gb: 4.7, lic: "FOSS", tier: 1, modes: ["Strategy", "Expert"], fit: 3, group: "Expert (large)", date: "Sep '24" },
  { name: "qwen2.5:14b", gb: 9.0, lic: "FOSS", tier: 1, modes: ["Strategy", "Expert"], fit: 1, group: "Expert (large)", date: "Sep '24", big: true },
  { name: "mistral-small3.2", gb: 15, lic: "FOSS", tier: 1, modes: ["Expert", "Vision"], fit: 1, group: "Expert (large)", date: "Jun '25", big: true, isNew: true },
];
const LICENCES = ["Open source only (recommended)", "Also try open-weight models", "Any installed model"];
const MODE_NAMES = ["Speed", "Strategy", "Expert", "Vision"];
const SHOW_NAMES = ["Installed only", "Essentials only", "Recently added"];

function defaultFilters() { return { lic: 1, modes: new Set(), show: new Set(["Essentials only"]) }; }
function applyFilters(f) {
  return MODELS.filter((m) => {
    if (f.lic === 0 && m.tier > 1) return false;
    if (f.modes.size && !m.modes.some((x) => f.modes.has(x))) return false;
    if (f.show.has("Installed only") && !m.installed) return false;
    if (f.show.has("Essentials only") && m.group !== "Deck essentials") return false;
    if (f.show.has("Recently added") && !m.isNew) return false;
    return true;
  });
}
function filtersSummary(f) {
  const bits = [];
  if (f.lic !== 0) bits.push(LICENCES[f.lic]);
  for (const m of f.modes) bits.push(m);
  for (const s of f.show) bits.push(s);
  return { count: 1 + f.modes.size + f.show.size, text: bits.join(", ") || LICENCES[0] };
}

/* The whole Deck screen with Steam's top and bottom bars */
function deckScreen(inner) {
  const root = h("div", { class: "deck", tabindex: "0", role: "application", "aria-label": "Interactive mock-up of the Deck screen. Arrow keys are the D-pad, Enter is A, Escape is B." });
  const scr = h("div", { class: "dscreen" },
    h("div", { class: "ds-top" }, h("span", {}, "83%"), h("span", {}, "3:53 AM")),
    h("div", { class: "ds-bg" }), inner,
    h("div", { class: "ds-bottom" }, h("span", { class: "menu" }, "MENU"), h("span", {}, h("b", { class: "a" }, "A"), "SELECT"), h("span", {}, h("b", { class: "b" }, "B"), "BACK")));
  root.append(scr);
  return root;
}

function modelTable(list, { compact = false } = {}) {
  const body = h("div", { class: "mt" });
  body.append(h("div", { class: "mt-head" }, ...["PULL", "MODEL", "SIZE", "MODES", "DECK FIT", "TRY"].map((t) => h("span", {}, t))));
  let group = null;
  for (const m of list) {
    if (m.group !== group) { group = m.group; body.append(h("div", { class: "mt-group" }, group)); }
    const row = h("button", { class: "mt-row" + (m.installed ? " inst" : ""), "data-stop": "" },
      h("span", { class: "pull" }, m.installed ? (m.ask ? "★" : "☆") : "☐"),
      h("span", { class: "nm" }, h("b", {}, m.name), m.isNew ? h("i", { class: "new" }, "New") : "", h("i", { class: "lic " + (m.lic === "FOSS" ? "foss" : "ow") }, m.lic)),
      h("span", {}, m.gb.toFixed(1) + " GB"),
      h("span", { class: "modes" }, m.modes.join(" · ")),
      h("span", { class: "fit" }, "★".repeat(m.fit)),
      h("span", { class: "try" }, m.place ? h("b", {}, String(m.place)) : m.big ? h("i", { class: "skip" }, "Skipped: too big") : ""));
    row.addEventListener("click", () => {
      if (m.installed) return;
      row.classList.toggle("queued");
      $(".pull", row).textContent = row.classList.contains("queued") ? "✔" : "☐";
    });
    body.append(row);
  }
  if (!list.length) body.append(h("div", { class: "mt-empty" }, "No models match these filters."));
  return body;
}

function modelsBox(kind, cfg = {}) {
  let f = defaultFilters();
  let mode = "list"; // list | filters | closed
  let lostNote = "";
  const box = h("div", { class: "mbox" });
  const root = deckScreen(box);
  const chipsWanted = cfg.chips || null;

  function render(ringSel) {
    box.replaceChildren();
    if (mode === "closed") {
      box.className = "mbox closed";
      const again = h("button", { class: "q-btn", "data-stop": "", "data-start": "" }, "Open AI models again");
      box.append(h("div", { class: "closed-msg" }, h("p", {}, lostNote || "The box closed."), again));
      again.addEventListener("click", () => {
        const lic = f.lic; f = defaultFilters(); f.lic = lic; mode = "list"; lostNote = ""; render(".filtersbtn, .fchip, .preset, .split .fl-row, .wiz-pill");
      });
      Deck.setRing(root, again, { scroll: false });
      return;
    }
    box.className = "mbox " + kind;
    const sum = filtersSummary(f);
    const list = applyFilters(f);
    const adv = h("button", { class: "adv", "data-stop": "" }, "Advanced ›");
    box.append(h("div", { class: "mb-title" }, h("h5", {}, "AI models"), adv));
    box.append(h("div", { class: "mb-counts" }, "Installed 2 · 5.1 GB", h("span", {}, "Queue 0 · < 0.1 GB"), h("span", {}, "Live catalog · Live sizes")));

    // ---- the filters control, per option ----
    const main = h("div", { class: "mb-main" });
    if (kind === "today" || kind === "button") {
      const fb = kind === "today"
        ? h("button", { class: "filtersbtn today", "data-stop": "", "data-row": "frow" }, h("b", {}, `Filters · ${sum.count} on`), h("span", {}, sum.text))
        : h("button", { class: "filtersbtn big", "data-stop": "", "data-row": "frow" }, h("span", { class: "fico", html: ICONS.filter }), h("b", {}, "Filters"), h("span", { class: "badge" }, String(sum.count)), h("span", { class: "fsum" }, sum.text), h("span", { class: "fchev", html: mode === "filters" ? ICONS.chevD : ICONS.chevR }));
      const typed = h("button", { class: "typename", "data-stop": "", "data-row": "frow" }, "Type a name");
      box.append(h("div", { class: "mb-frow" }, fb, typed));
      fb.addEventListener("click", () => { mode = mode === "filters" ? "list" : "filters"; render(mode === "filters" ? ".fl-row" : ".filtersbtn"); });
      if (mode === "filters") main.append(filterPanel(kind));
      else main.append(modelTable(list));
    } else if (kind === "split") {
      main.classList.add("split");
      const side = h("div", { class: "fl-side scroll" }, ...filterRows({ compact: true }));
      main.append(side, h("div", { class: "fl-list scroll" }, modelTable(list)));
    } else if (kind === "chips") {
      const row = h("div", { class: "fchips" });
      const want = chipsWanted ? chipsWanted() : ["Licence", ...MODE_NAMES, ...SHOW_NAMES];
      if (want.includes("Licence")) {
        const lc = h("button", { class: "fchip lic on", "data-stop": "", "data-row": "chips" }, ["Open source", "Open-weight too", "Any model"][f.lic] + " ▾");
        lc.addEventListener("click", () => { f.lic = (f.lic + 1) % 3; render(".fchip.lic"); });
        row.append(lc);
      }
      for (const name of [...MODE_NAMES, ...SHOW_NAMES]) {
        if (!want.includes(name)) continue;
        const on = f.modes.has(name) || f.show.has(name);
        const c = h("button", { class: "fchip" + (on ? " on" : ""), "data-stop": "", "data-row": "chips", "data-name": name }, name.replace(" only", ""));
        c.addEventListener("click", () => {
          const set = MODE_NAMES.includes(name) ? f.modes : f.show;
          set.has(name) ? set.delete(name) : set.add(name);
          render(`.fchip[data-name="${name}"]`);
        });
        row.append(c);
      }
      box.append(row);
      main.append(h("div", { class: "fl-list scroll" }, modelTable(list)));
    } else if (kind === "presets") {
      const P = [
        ["Fits while gaming", "Small, fast, open source", () => ({ lic: 0, modes: new Set(["Speed"]), show: new Set() })],
        ["Best answers", "Strategy and Expert", () => ({ lic: 1, modes: new Set(["Strategy", "Expert"]), show: new Set() })],
        ["Reads screenshots", "Vision models", () => ({ lic: 1, modes: new Set(["Vision"]), show: new Set() })],
        ["Everything", "No filters but the licence", () => ({ lic: f.lic, modes: new Set(), show: new Set() })],
      ];
      const row = h("div", { class: "presets" });
      P.forEach(([t, s, mk], k) => {
        const on = cfg._preset === k;
        const b = h("button", { class: "preset" + (on ? " on" : ""), "data-stop": "", "data-row": "pre" }, h("b", {}, t), h("small", {}, s));
        b.addEventListener("click", () => { f = mk(); cfg._preset = k; render(`.preset:nth-child(${k + 1})`); });
        row.append(b);
      });
      box.append(row);
      main.append(h("div", { class: "fl-list scroll" }, modelTable(list)));
    } else if (kind === "wizard") {
      const Q = [
        ["What do you ask most?", ["Quick tips", "Long plans", "Screenshots"], (k) => { f.modes = new Set([["Speed"], ["Strategy", "Expert"], ["Vision"]][k]); }],
        ["How much room on this Deck?", ["Small", "Medium", "Any size"], (k) => { cfg._room = k; }],
        ["Which licences?", ["Open source", "Open-weight too"], (k) => { f.lic = k; }],
      ];
      cfg._ans = cfg._ans || [null, null, f.lic];
      const wz = h("div", { class: "wizard" });
      Q.forEach(([q, opts, act], qi) => {
        const r = h("div", { class: "wiz-q" }, h("span", { class: "wiz-t" }, q));
        opts.forEach((o, k) => {
          const b = h("button", { class: "wiz-pill" + (cfg._ans[qi] === k ? " on" : ""), "data-stop": "", "data-row": "wq" + qi }, o);
          b.addEventListener("click", () => { cfg._ans[qi] = k; act(k); render(`.wiz-q:nth-child(${qi + 1}) .wiz-pill:nth-of-type(${k + 1})`); });
          r.append(b);
        });
        wz.append(r);
      });
      box.append(wz);
      let l2 = list;
      if (cfg._room === 0) l2 = l2.filter((m) => m.gb <= 2.5);
      if (cfg._room === 1) l2 = l2.filter((m) => m.gb <= 5);
      main.append(h("div", { class: "fl-list scroll" }, modelTable(l2)));
    }
    box.append(main);

    // ---- footer ----
    const foot = h("div", { class: "mb-foot" });
    if (kind === "button" && mode === "filters") {
      const show = h("button", { class: "mb-btn primary", "data-stop": "", "data-row": "foot" }, `Show ${list.length} models`);
      const clear = h("button", { class: "mb-btn", "data-stop": "", "data-row": "foot" }, "Clear filters");
      show.addEventListener("click", () => { mode = "list"; render(".filtersbtn"); });
      clear.addEventListener("click", () => { const lic = f.lic; f = defaultFilters(); f.lic = lic; f.show = new Set(); render(".fl-row"); });
      foot.append(show, clear);
    } else {
      const done = h("button", { class: "mb-btn", "data-stop": "", "data-row": "foot" }, "Done");
      const cancel = h("button", { class: "mb-btn", "data-stop": "", "data-row": "foot" }, "Cancel");
      done.addEventListener("click", () => {
        lostNote = mode === "filters" && kind === "today"
          ? "The whole box closed. Your filter picks (all but Licence) are gone, and you have to set them again."
          : "Done: the box closed.";
        mode = "closed"; render();
      });
      cancel.addEventListener("click", () => { lostNote = "Cancel: the box closed."; mode = "closed"; render(); });
      foot.append(done, cancel);
    }
    box.append(foot);
    const target = ringSel ? $(ringSel, box) : null;
    if (target) Deck.setRing(root, target);
  }

  function filterRows({ compact = false } = {}) {
    const rows = [];
    rows.push(h("div", { class: "fl-title" }, "LICENCE"));
    if (!compact) rows.push(h("div", { class: "fl-help" }, "Controls which installed models bonsAI will try, in order. Your PC or Deck still decides what is installed."));
    LICENCES.forEach((l, k) => {
      const r = h("button", { class: "fl-row" + (f.lic === k ? " on" : ""), "data-stop": "", "data-name": "lic" + k, disabled: k === 2 ? true : null }, h("span", { class: "tick" }, f.lic === k ? "✔" : ""), compact ? ["Open source", "Open-weight too", "Any model"][k] : l);
      r.addEventListener("click", () => { f.lic = k; render(`.fl-row[data-name="lic${k}"]`); });
      rows.push(r);
    });
    rows.push(h("div", { class: "fl-title" }, "MATCHES ASK MODE"));
    for (const m of MODE_NAMES) {
      const r = h("button", { class: "fl-row" + (f.modes.has(m) ? " on" : ""), "data-stop": "", "data-name": m }, h("span", { class: "tick" }, f.modes.has(m) ? "✔" : ""), m);
      r.addEventListener("click", () => { f.modes.has(m) ? f.modes.delete(m) : f.modes.add(m); render(`.fl-row[data-name="${m}"]`); });
      rows.push(r);
    }
    rows.push(h("div", { class: "fl-title" }, "SHOW"));
    for (const s of SHOW_NAMES) {
      const r = h("button", { class: "fl-row" + (f.show.has(s) ? " on" : ""), "data-stop": "", "data-name": s }, h("span", { class: "tick" }, f.show.has(s) ? "✔" : ""), s);
      r.addEventListener("click", () => { f.show.has(s) ? f.show.delete(s) : f.show.add(s); render(`.fl-row[data-name="${s}"]`); });
      rows.push(r);
    }
    return rows;
  }

  function filterPanel(k) {
    const panel = h("div", { class: "fl-panel scroll" });
    if (k === "button") panel.append(h("button", { class: "fl-back", "data-stop": "" }, "‹ Back to the models"));
    panel.append(...filterRows());
    if (k === "today") {
      const close = h("button", { class: "fl-close", "data-stop": "" }, "Close filters");
      close.addEventListener("click", () => { mode = "list"; render(".filtersbtn"); });
      panel.append(close);
    }
    const back = $(".fl-back", panel);
    if (back) back.addEventListener("click", () => { mode = "list"; render(".filtersbtn"); });
    // B inside the panel closes the filters, as today
    panel.addEventListener("deckkey", (e) => { if (e.detail.key === "B") { e.preventDefault(); mode = "list"; render(".filtersbtn"); } });
    return panel;
  }

  render();
  root.addEventListener("deckkey", (e) => {
    if (e.detail.key === "B" && !e.defaultPrevented && mode !== "closed") { e.preventDefault(); lostNote = "B: the box closed."; mode = "closed"; render(); }
  });
  root.rerender = () => render();
  const startEl = $(".filtersbtn, .fchip, .preset, .fl-row, .wiz-pill", box);
  if (startEl) startEl.setAttribute("data-start", "");
  return root;
}

/* Option C lets you pick which chips sit up top */
function chipsCard() {
  const ALL = ["Licence", ...MODE_NAMES, ...SHOW_NAMES];
  const want = new Set(["Licence", "Speed", "Strategy", "Vision", "Installed only", "Recently added"]);
  let root;
  const pickers = h("fieldset", { class: "chippick" }, h("legend", {}, "Which filters go up top? (tick to try)"),
    ...ALL.map((n) => {
      const id = "cp-" + n.replace(/\W+/g, "");
      const cb = h("input", { type: "checkbox", id, checked: want.has(n) ? true : null });
      cb.addEventListener("change", () => { cb.checked ? want.add(n) : want.delete(n); root.rerender(); });
      return h("label", { for: id }, cb, " " + n);
    }));
  root = modelsBox("chips", { chips: () => [...want] });
  return [root, pickers];
}

TABS.push({
  id: "t2", n: 2, name: "AI models box", stars: 2, wide: true,
  title: "The AI models box: a Filters button you can't miss, and a filters step you can't leave by mistake",
  today: [
    "The Filters button is a grey bar that reads like a label, so it is easy to miss.",
    "With the filters open, “Close filters” sits about ten rows down, off screen. Done is always on screen, so a player presses Done. That closes the whole box and throws away every filter pick except Licence.",
    "Good news: the old “policy tiers” are already inside the filters, as the Licence group. What is left from that older note is choosing what goes up top.",
  ],
  deciding: [
    "A clearer button, with an icon.",
    "Done while the filters are open goes back to the list, never out of the box.",
    "Which filters people see first when they pull a model.",
  ],
  howto: "This box fills the Deck's whole screen, so it is drawn at full screen size. Press A on the Filters button, change a filter, then try Done.",
  options: [
    { id: "today", label: "Today", today: true, title: "A grey bar, and Done that leaves", desc: "What ships now. Open the filters, then press Done to feel the trap.", build: () => modelsBox("today") },
    { id: "A", label: "A", title: "A real button, and Done becomes “Show models”", desc: "A filter icon, a count badge and an arrow. While the filters are open, the bottom buttons become “Show 7 models” and “Clear filters”, so nothing there can close the box. “Back to the models” also sits at the top.", build: () => modelsBox("button") },
    { id: "B", label: "B", title: "Filters always beside the list", desc: "No hidden step at all. The filters live in a column on the left and the list updates as you tick. Done only ever means done.", build: () => modelsBox("split") },
    { id: "C", label: "C", title: "Filter chips up top", desc: "One row of chips under the counts. A turns a chip on or off; the Licence chip steps through its three choices. Tick below to choose which chips sit up top.", build: chipsCard },
    { id: "W1", label: "Wild 1", wild: true, title: "Presets instead of filters", desc: "Four big starting points: Fits while gaming, Best answers, Reads screenshots, Everything. One press sets every filter.", build: () => modelsBox("presets") },
    { id: "W2", label: "Wild 2", wild: true, title: "Answer three questions", desc: "What do you ask most, how much room is there, which licences. The list narrows as you answer.", build: () => modelsBox("wizard") },
  ],
});
