/* ============================================================
   Tab 6, round 2: the Connection doctor, drawn in the new layout (21-kit2.js).
   Round 1 picks: B (a doctor sheet over the panel), C (plain words first) and Wild 1
   ("Fix it for me": "as long as it works"). Not Wild 2 (the health light).
   Wild 1 bends the locked "one press per action" rule, so every option here that runs
   several steps lists them first, shows each as it runs, and can be stopped.
   Scenarios, checks and steps come from round 1 (46-doctor.js).
   ============================================================ */
const D2_STEPS = {
  pcoff: ["Search the network for your PC", "Use the address it finds", "Check that PC answers", "Ask your question again"],
  nomodels: ["Pull qwen2.5:1.5b (1.0 GB)", "Check it installed", "Ask your question again"],
  missing: ["Put llama3.1:8b first in the try order", "Ask your question again"],
  slow: ["Give answers 240 s instead of 120 s", "Ask your question again"],
};

/* The Ollama tab in the new layout, landed on the control that fixes it */
function d2Jump(root, panel, sc) {
  const back = h("button", { class: "q-btn backmain", "data-stop": "" }, h("span", { class: "ico", html: ICONS.back }), "Back to Main");
  const rows = [h("div", { class: "q-section-title" }, "Where AI runs"),
    h("div", { class: "q-row" }, h("span", { class: "grow" }, "Run AI on this Deck"), h("span", { class: "q-toggle" + (sc.where === "deck" ? " on" : ""), "data-stop": "" }))];
  if (sc.where === "pc") {
    rows.push(h("div", { class: "fieldrow", "data-stop": "" }, h("small", {}, "PC address"), h("span", { class: "val" }, "192.168.1.20:11434")),
      h("div", { class: "btnrow" }, h("button", { class: "q-btn", "data-stop": "", "data-row": "conn" }, "Test connection"), h("button", { class: "q-btn", "data-stop": "", "data-row": "conn", "data-name": "Find LAN" }, "Find LAN")));
  } else {
    rows.push(h("div", { class: "status ok" }, "Connected · Ollama v0.12.3"), h("button", { class: "q-btn", "data-stop": "", "data-name": "Browse models…" }, "Browse models…"));
  }
  rows.push(h("div", { class: "q-section-title" }, "Connection tuning"),
    h("div", { class: "q-row", "data-stop": "", "data-name": "Give up after" }, h("span", { class: "grow" }, "Give up after", h("small", {}, "How long an answer may take")), h("b", {}, "120 s")),
    h("button", { class: "q-btn", "data-stop": "", "data-name": "AI models…" }, "AI models… — Open source only"));
  const view = h("div", { class: "d2-jump" }, tabBar2(1), h("div", { class: "k2-gap" }), h("div", { class: "scroll d2-jump-in" }, back, ...rows));
  panel.append(view);
  const target = $(`[data-name="${sc.target}"]`, view);
  if (target) { target.classList.add("landed"); Deck.setRing(root, target); }
  const goBack = () => { view.remove(); Deck.setRing(root, $(".d2-fix", root) || $(".k2-cname", root)); };
  back.addEventListener("click", goBack);
  view.addEventListener("deckkey", (e) => { if (e.detail.key === "B") { e.preventDefault(); e.stopPropagation(); goBack(); } });
}

function doctorR2Mock(kind, scKey) {
  const sc = DOC_SCENARIOS[scKey];
  const holder = h("div", { style: "display:contents" });
  const root = deckFrame({ body: holder, header: false });
  const body = mainTab2({ chatName: "Hollow Knight help", chatNo: 1, chatCount: 5, dockEl: dock2({ game: "Hollow Knight", mode: "Speed" }) });
  holder.append(body);
  const panel = $(".qam", root);
  const scr = body.scroller;
  let run = 0;

  // the failed answer, in plain words first; the exact error folds away
  const raw = h("details", { class: "raw" }, h("summary", { "data-stop": "" }, "The exact error"), h("p", {}, sc.error));
  $("summary", raw).addEventListener("click", (e) => { e.preventDefault(); raw.open = !raw.open; });
  const btns = h("div", { class: "d2-btns" });
  const failed = h("div", { class: "k2-answer d2-err" }, h("p", { class: "plain-head" }, sc.plain), btns, raw);
  const turn = h("div", { class: "k2-turn" }, qBubble2("how do i beat the false knight"), failed);
  scr.append(h("div", { class: "k2-turn" }, qBubble2("what is a good first upgrade in Hollow Knight"), aBubble2([SAMPLE.a[1]])), turn);

  const fix = h("button", { class: "fixbtn d2-fix", "data-stop": "", "data-row": "d2b" }, h("span", { class: "ico", html: ICONS.wrench }), "Fix this");
  if (kind === "upfront") {
    const forMe = h("button", { class: "fixbtn d2-fix", "data-stop": "", "data-row": "d2b" }, h("span", { class: "ico", html: ICONS.wrench }), "Fix it for me");
    const look = h("button", { class: "fixbtn quiet", "data-stop": "", "data-row": "d2b" }, "Show me the checks");
    btns.append(forMe, look);
    forMe.addEventListener("click", () => openSheet({ chainNow: true }));
    look.addEventListener("click", () => openSheet({}));
    forMe.setAttribute("data-start", "");
  } else {
    btns.append(fix);
    fix.addEventListener("click", () => openSheet({}));
    fix.setAttribute("data-start", "");
  }

  function openSheet({ chainNow = false }) {
    const my = ++run;
    const inner = h("div", { class: "scroll s-sheet-in d2-in" });
    const sheet = h("div", { class: "s-sheet" }, h("div", { class: "s-sheet-h" }, h("span", { class: "s-gi", html: ICONS2.search }), "Connection doctor"), inner, hintBar([["B", "Close"], ["A", "Select"]]));
    panel.append(sheet);
    const shut = () => { run++; sheet.remove(); Deck.setRing(root, $(".d2-fix", root)); };
    sheet.addEventListener("deckkey", (e) => { if (e.detail.key === "B") { e.preventDefault(); shut(); } });
    const list = h("div", { class: "chklist" });
    const out = h("div", { class: "doc-out" });
    inner.append(h("div", { class: "doc-title" }, h("span", { class: "ico", html: ICONS.wrench }), "Checking your setup"), list, out);
    Deck.setRing(root, null);
    runChecks(list, sc, () => my === run).then((ok) => {
      if (!ok) return;
      if (chainNow) { chain(out, sheet, my); return; }
      const act = h("button", { class: "q-btn primary", "data-stop": "", "data-row": "d2o" }, sc.action);
      const rep = h("button", { class: "q-btn quiet", "data-stop": "", "data-row": "d2o" }, h("span", { class: "ico", html: ICONS.file }), "Save a report");
      out.append(h("p", { class: "doc-say" }, sc.say), h("div", { class: "doc-btns" }, act, rep));
      if (kind === "chain") {
        const all = h("button", { class: "q-btn chain", "data-stop": "" }, `Fix it for me · ${D2_STEPS[scKey].length} steps`);
        out.append(all, h("p", { class: "d2-steps-note" }, "Steps: " + D2_STEPS[scKey].join(" → ")));
        all.addEventListener("click", () => chain(out, sheet, my));
      }
      rep.addEventListener("click", () => toast(panel, "Report saved to the Desktop: bonsai-report-2026-10-10.txt"));
      act.addEventListener("click", () => {
        if (scKey === "pcoff") { const hold = h("div", { class: "doc-search" }); out.append(hold); searchFlow(root, hold); return; }
        sheet.remove(); d2Jump(root, panel, sc);
      });
      Deck.setRing(root, act);
    });
  }

  // "Fix it for me": the steps are listed first, tick off one by one, and Stop works at any moment
  async function chain(out, sheet, my) {
    const steps = D2_STEPS[scKey];
    const box = h("div", { class: "chklist" }, ...steps.map((s) => h("div", { class: "chk wait" }, h("span", { class: "mark" }, "·"), h("span", {}, s))));
    const stop = h("button", { class: "q-btn quiet", "data-stop": "" }, "Stop");
    let stopped = false;
    stop.addEventListener("click", () => { stopped = true; });
    out.replaceChildren(h("p", { class: "doc-say" }, "Fixing it for you, one step at a time:"), box, stop);
    Deck.setRing(root, stop);
    const rows = $$(".chk", box);
    for (let i = 0; i < rows.length; i++) {
      if (stopped || my !== run) {
        for (const r of rows.slice(i)) r.classList.add("skipped");
        out.replaceChildren(h("p", { class: "doc-say" }, `Stopped after ${i} of ${rows.length} steps. Nothing else was changed.`), box);
        return;
      }
      rows[i].classList.replace("wait", "run"); $(".mark", rows[i]).textContent = "…";
      await sleep(750);
      rows[i].classList.replace("run", "ok"); $(".mark", rows[i]).innerHTML = ICONS.check;
    }
    if (my !== run) return;
    await sleep(300);
    sheet.remove();
    failed.replaceWith(aBubble2(["<b>Fixed, and asked again.</b> " + FINISH_A[0], FINISH_A[2]]));
    toast(panel, "Fixed. Your answer is in.", 1600);
    Deck.setRing(root, $(".k2-turn:last-child .k2-answer p", scr));
  }
  return root;
}

function doctorR2Card(kind) {
  return () => {
    let key = "pcoff";
    const holder = h("div", { class: "deck-swap" });
    const pick = h("div", { class: "scen", role: "radiogroup", "aria-label": "What went wrong" }, h("span", {}, "What went wrong:"),
      ...Object.entries(DOC_SCENARIOS).map(([k, s]) => {
        const b = h("button", { type: "button", role: "radio", "aria-checked": String(k === key) }, s.label);
        b.addEventListener("click", () => { key = k; for (const x of $$("button", pick)) x.setAttribute("aria-checked", String(x === b)); draw(); });
        return b;
      }));
    const draw = () => holder.replaceChildren(doctorR2Mock(kind, key));
    draw();
    return [pick, holder];
  };
}

const DOCTOR_R2_OPTIONS = [
  { id: "2A", group: "r2", groupTitle: "Round 2: plain words, the sheet, and “Fix it for me”", label: "A", title: "Plain words, then the doctor sheet", desc: "Round 1's C and B together. The failed answer says what happened in one plain line, with Fix this inside it. Fix this opens the sheet over the panel with the checks and one next step. The exact error folds away.", build: doctorR2Card("sheet") },
  { id: "2B", group: "r2", label: "B", title: "A, plus “Fix it for me” at the end", desc: "After the checks, beside the one next step, a second button runs every step for you. The steps are listed before you press it, each ticks off as it runs, and Stop works at any moment. Then your question is asked again.", build: doctorR2Card("chain") },
  { id: "2C", group: "r2", label: "C", title: "“Fix it for me” first", desc: "The failed answer offers Fix it for me straight away, with “Show me the checks” beside it for anyone who wants to see first. The sheet still shows every step and a Stop button while it works.", build: doctorR2Card("upfront") },
];

/* Put round 2 on top of tab 6; round 1 stays below with its picks */
(() => {
  const t6 = TABS.find((t) => t.id === "t6");
  t6.title = "The Connection doctor, round 2";
  t6.today = [
    "Round 1: you liked the doctor sheet over the panel (B), plain words first (C), and “Fix it for me” (“as long as it works”). Not the health light.",
    "“Fix it for me” bends a rule you set in September: one press per action. Here every multi-step fix shows its steps first, ticks each one off, and can be stopped, so nothing happens out of sight.",
    "Nothing here is built yet. Pick what went wrong above each panel to see how each case plays.",
  ];
  t6.deciding = [
    "Whether “Fix it for me” is in at all, given the one-press rule.",
    "If it is: offered after the checks (B), or first (C).",
  ];
  t6.howto = "Pick what went wrong above a panel, then press A on <b>Fix this</b> (or <b>Fix it for me</b>). B closes the sheet. While a fix runs, Stop ends it. Round 1 is further down, with your picks.";
  t6.options = [...DOCTOR_R2_OPTIONS, ...t6.options.map((o, i) => ({ ...o, group: "r1", groupTitle: i === 0 ? "Round 1 (your earlier picks)" : undefined }))];
})();
