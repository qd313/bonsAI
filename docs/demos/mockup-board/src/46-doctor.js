/* ============================================================
   Tab 6: the Connection doctor ("Fix this")
   Checks, failure lines and buttons follow the locked plan.
   ============================================================ */
const DOC_SCENARIOS = {
  pcoff: {
    label: "The PC is off or moved",
    where: "pc",
    error: "Could not reach Ollama at the configured host for model 'qwen2.5:3b'. Verify PC IP, firewall, and that Ollama is listening.",
    plain: "bonsAI couldn't reach the PC that runs your AI.",
    checks: ["Where the AI runs is set", "That PC answers", "It has models", "Your Ask model is there"],
    failAt: 1,
    say: "Nothing answered at that address.",
    action: "Search the network",
    target: "Find LAN",
  },
  nomodels: {
    label: "No models installed",
    where: "deck",
    error: "No model in bonsAI's routing list is installed on this Ollama host. Ollama reports no installed models. Open Ollama → Where AI runs and use Install Ollama or Browse models (Install the starter set), or pull qwen2.5vl:3b (one small multimodal model for chat and screenshots).",
    plain: "Your Deck's AI has no models yet.",
    checks: ["Where the AI runs is set", "Ollama is installed", "Ollama is running", "It has models", "Your Ask model is there"],
    failAt: 3,
    say: "The host answers but has no models.",
    action: "Pull a model",
    target: "Browse models…",
  },
  missing: {
    label: "Your model is missing",
    where: "deck",
    error: "No model in bonsAI's routing list is installed on this Ollama host. Installed on this host: llama3.1:8b, mistral:7b. Open Ollama → Where AI runs and use Install Ollama or Browse models (Install the starter set), or pull qwen2.5vl:3b.",
    plain: "The model your Ask uses isn't on this Deck.",
    checks: ["Where the AI runs is set", "Ollama is installed", "Ollama is running", "It has models", "Your Ask model is there"],
    failAt: 4,
    say: "The model your Ask uses is not on that host.",
    action: "Fix the try order",
    target: "AI models…",
  },
  slow: {
    label: "Too slow",
    where: "deck",
    error: "Ollama did not finish within 120 seconds for model 'qwen2.5:3b'. On Steam Deck this usually means inference is on CPU — configure Ollama to use the GPU, or pull a smaller model in Ollama → Where AI runs (e.g. qwen2.5:1.5b for Speed mode).",
    plain: "The answer took too long, so it was stopped.",
    checks: ["Where the AI runs is set", "Ollama is installed", "Ollama is running", "It has models", "Your Ask model is there"],
    failAt: -1,
    say: "Your setup looks fine; the answer took too long or the model gave up.",
    action: "Give it more time",
    target: "Give up after",
  },
};

/* Fill a check list one line at a time; stop at the first cross */
async function runChecks(listEl, sc, alive) {
  listEl.replaceChildren(...sc.checks.map((c) => h("div", { class: "chk wait" }, h("span", { class: "mark" }, "·"), h("span", {}, c))));
  const rows = $$(".chk", listEl);
  for (let i = 0; i < rows.length; i++) {
    rows[i].classList.replace("wait", "run");
    $(".mark", rows[i]).textContent = "…";
    await sleep(380);
    if (!alive()) return false;
    const bad = i === sc.failAt;
    rows[i].classList.replace("run", bad ? "bad" : "ok");
    $(".mark", rows[i]).innerHTML = bad ? ICONS.cross : ICONS.check;
    if (bad) { for (const r of rows.slice(i + 1)) r.classList.add("skipped"); break; }
  }
  return true;
}

function ollamaJump(root, panel, sc, mainBody) {
  const view = h("div", { class: "jumpview" });
  const backBtn = h("button", { class: "q-btn backmain", "data-stop": "" }, h("span", { class: "ico", html: ICONS.back }), "Back to Main");
  const rows = [];
  rows.push(h("div", { class: "q-section-title" }, "Where AI runs"));
  rows.push(h("div", { class: "q-row" }, h("span", { class: "grow" }, "Run AI on this Deck"), h("span", { class: "q-toggle" + (sc.where === "deck" ? " on" : ""), "data-stop": "", "data-name": "Run AI on this Deck" })));
  if (sc.where === "pc") {
    rows.push(h("div", { class: "fieldrow", "data-stop": "", "data-name": "PC address" }, h("small", {}, "PC address"), h("span", { class: "val" }, "192.168.1.20:11434")));
    rows.push(h("div", { class: "btnrow" }, h("button", { class: "q-btn", "data-stop": "", "data-row": "conn", "data-name": "Test connection" }, "Test connection"), h("button", { class: "q-btn", "data-stop": "", "data-row": "conn", "data-name": "Find LAN" }, "Find LAN")));
    rows.push(h("div", { class: "status bad" }, "Unreachable — connection refused"));
  } else {
    rows.push(h("div", { class: "status ok" }, "Connected · Ollama v0.12.3"));
    rows.push(h("button", { class: "q-btn", "data-stop": "", "data-name": "Browse models…" }, "Browse models…"));
  }
  rows.push(h("div", { class: "q-section-title" }, "Connection tuning"));
  rows.push(h("div", { class: "q-row", "data-stop": "", "data-name": "Give up after" }, h("span", { class: "grow" }, "Give up after", h("small", {}, "How long an answer may take")), h("b", {}, "120 s")));
  rows.push(h("button", { class: "q-btn", "data-stop": "", "data-name": "AI models…" }, "AI models… — Open source only"));
  const inner = h("div", { class: "scroll" }, backBtn, ...rows);
  view.append(tabStrip("OLLAMA"), inner);
  const all = $$(".qam > :not(.qam-head)", root);
  all.forEach((el) => el.classList.add("is-gone"));
  panel.append(view);
  const target = $(`[data-name="${sc.target}"]`, view);
  if (target) { target.classList.add("landed"); Deck.setRing(root, target); }
  const goBack = () => {
    view.remove();
    all.forEach((el) => el.classList.remove("is-gone"));
    const fix = $(".fixbtn, .doc-action", root);
    if (fix) Deck.setRing(root, fix);
  };
  backBtn.addEventListener("click", goBack);
  view.addEventListener("deckkey", (e) => { if (e.detail.key === "B") { e.preventDefault(); goBack(); } });
}

function searchFlow(root, holder, then) {
  let alive = true;
  const bar = h("div", { class: "srch" }, h("div", { class: "srch-t" }, "Searching the network… about 8 seconds. B cancels."), h("div", { class: "srch-bar" }, h("i")));
  holder.replaceChildren(bar);
  const cancel = (e) => { if (e.detail.key === "B") { e.preventDefault(); alive = false; root.removeEventListener("deckkey", cancel, true); holder.replaceChildren(h("p", { class: "doc-say" }, "Search stopped.")); then && then(false); } };
  root.addEventListener("deckkey", cancel, true);
  requestAnimationFrame(() => { $(".srch-bar i", bar).style.width = "100%"; });
  setTimeout(() => {
    root.removeEventListener("deckkey", cancel, true);
    if (!alive) return;
    const use = h("button", { class: "q-btn primary", "data-stop": "" }, "Use this one");
    holder.replaceChildren(h("p", { class: "doc-say" }, "Found Ollama at ", h("b", {}, "192.168.1.24"), ". Your PC may have a new address."), use);
    Deck.setRing(root, use);
    use.addEventListener("click", () => {
      const test = h("button", { class: "q-btn primary", "data-stop": "" }, "Test again");
      holder.replaceChildren(h("p", { class: "doc-say" }, "The address is filled in. Nothing else changed."), test);
      Deck.setRing(root, test);
      test.addEventListener("click", () => { holder.replaceChildren(h("p", { class: "doc-say good" }, "That PC answers. Press Retry on your question to ask again.")); then && then(true); });
    });
  }, 2600);
}

function doctorMock(kind, scKey) {
  const sc = DOC_SCENARIOS[scKey];
  const scroll = h("div", { class: "scroll" });
  const body = mainTab({ transcript: [], chatName: "Hollow Knight help", dockEl: dock({ typed: "", mode: "Speed", placeholder: "" }) });
  body.scroller.replaceWith(scroll);
  const root = deckFrame({ body });
  const panel = $(".qam", root);
  let run = 0;

  const q = qBubble("how do i beat the false knight");
  const turn = h("div", { class: "turn" }, q);
  scroll.append(h("div", { class: "turn" }, qBubble("what is a good first upgrade in Hollow Knight"), aBubble([SAMPLE.a[1]])), turn);

  function doctorBody(container, { inSheet = false } = {}) {
    const list = h("div", { class: "chklist" });
    const outcome = h("div", { class: "doc-out" });
    container.append(h("div", { class: "doc-title" }, h("span", { class: "ico", html: ICONS.wrench }), "Checking your setup"), list, outcome);
    const my = ++run;
    runChecks(list, sc, () => my === run).then((ok) => {
      if (!ok) return;
      const act = h("button", { class: "q-btn primary doc-action", "data-stop": "", "data-row": "docbtn" }, sc.action);
      const rep = h("button", { class: "q-btn quiet doc-report", "data-stop": "", "data-row": "docbtn" }, h("span", { class: "ico", html: ICONS.file }), "Save a report");
      outcome.append(h("p", { class: "doc-say" }, sc.say), h("div", { class: "doc-btns" }, act, rep));
      if (kind === "chain") {
        const all = h("button", { class: "q-btn chain", "data-stop": "" }, "Fix it for me");
        outcome.append(all);
        all.addEventListener("click", () => chainFix(outcome));
      }
      rep.addEventListener("click", () => toast(panel, "Report saved to the Desktop: bonsai-report-2026-10-10.txt"));
      act.addEventListener("click", () => {
        if (scKey === "pcoff") { const holder = h("div", { class: "doc-search" }); outcome.append(holder); searchFlow(root, holder); return; }
        if (inSheet) $(".q-modal", root)?.remove();
        ollamaJump(root, panel, sc, body);
      });
      Deck.setRing(root, act);
    });
  }

  async function chainFix(outcome) {
    const steps = scKey === "pcoff"
      ? ["Searching the network", "Found Ollama at 192.168.1.24", "Address filled in", "That PC answers", "Asking your question again"]
      : scKey === "nomodels" ? ["Pulling qwen2.5:1.5b (1.0 GB)", "Model installed", "Asking your question again"]
      : scKey === "missing" ? ["Putting llama3.1:8b first in the try order", "Asking your question again"]
      : ["Giving answers 240 s instead of 120 s", "Asking your question again"];
    const box = h("div", { class: "chklist chain-list" });
    outcome.replaceChildren(h("p", { class: "doc-say" }, "One press, every step shown:"), box);
    for (const s of steps) {
      const r = h("div", { class: "chk run" }, h("span", { class: "mark" }, "…"), h("span", {}, s));
      box.append(r);
      await sleep(700);
      r.classList.replace("run", "ok");
      $(".mark", r).innerHTML = ICONS.check;
    }
    toast(panel, "Answer on its way…", 1800);
  }

  // the failed reply, per option
  if (kind === "inline" || kind === "chain") {
    const fix = h("button", { class: "fixbtn", "data-stop": "", "data-start": "" }, h("span", { class: "ico", html: ICONS.wrench }), "Fix this");
    const holder = h("div", { class: "doc-inline" });
    turn.append(aBubble([sc.error], { cls: "err" }), fix, holder);
    fix.addEventListener("click", () => { holder.replaceChildren(); fix.hidden = true; doctorBody(holder); });
  } else if (kind === "sheet") {
    const fix = h("button", { class: "fixbtn", "data-stop": "", "data-start": "" }, h("span", { class: "ico", html: ICONS.wrench }), "Fix this");
    turn.append(aBubble([sc.error], { cls: "err" }), fix);
    fix.addEventListener("click", () => {
      const sheetBody = h("div", { class: "q-sheet-body" });
      const close = h("button", { class: "q-btn quiet", "data-stop": "" }, "Close");
      const m = h("div", { class: "q-modal" }, h("div", { class: "q-sheet" }, h("div", { class: "q-sheet-head" }, "Connection doctor"), sheetBody, h("div", { class: "q-sheet-foot" }, close)), hintBar([["B", "Close"], ["A", "Select"]]));
      panel.append(m);
      const shut = () => { run++; m.remove(); Deck.setRing(root, fix); };
      close.addEventListener("click", shut);
      m.addEventListener("deckkey", (e) => { if (e.detail.key === "B") { e.preventDefault(); shut(); } });
      doctorBody(sheetBody, { inSheet: true });
      Deck.setRing(root, close, { scroll: false });
    });
  } else if (kind === "plain") {
    const raw = h("details", { class: "raw" }, h("summary", { "data-stop": "" }, "The exact error"), h("p", {}, sc.error));
    const fix = h("button", { class: "fixbtn in", "data-stop": "", "data-start": "" }, h("span", { class: "ico", html: ICONS.wrench }), "Fix this");
    const holder = h("div", { class: "doc-inline" });
    const bub = h("div", { class: "ab err plain" }, h("p", { class: "plain-head" }, sc.plain), fix, holder, raw);
    turn.append(bub);
    fix.addEventListener("click", () => { fix.hidden = true; doctorBody(holder); });
    $("summary", raw).addEventListener("click", (e) => { e.preventDefault(); raw.open = !raw.open; });
  } else if (kind === "light") {
    turn.remove();
    const row = $(".chatrow", root);
    const lamp = h("button", { class: "lamp " + (scKey === "slow" ? "ok" : "warn"), "data-stop": "", "data-start": "", title: "Setup health" }, h("span", { class: "ico", html: ICONS.light }));
    row.append(lamp);
    const ctx = $(".ctxline", root);
    ctx.textContent = scKey === "slow" ? "Context: no active game detected" : "AI: " + sc.say.replace(/\.$/, "") + " · A on the light to fix";
    ctx.classList.add(scKey === "slow" ? "x" : "warnline");
    lamp.addEventListener("click", () => {
      const sheetBody = h("div", { class: "q-sheet-body" });
      const close = h("button", { class: "q-btn quiet", "data-stop": "" }, "Close");
      const m = h("div", { class: "q-modal" }, h("div", { class: "q-sheet" }, h("div", { class: "q-sheet-head" }, "Setup health"), sheetBody, h("div", { class: "q-sheet-foot" }, close)), hintBar([["B", "Close"]]));
      panel.append(m);
      const shut = () => { run++; m.remove(); Deck.setRing(root, lamp); };
      close.addEventListener("click", shut);
      m.addEventListener("deckkey", (e) => { if (e.detail.key === "B") { e.preventDefault(); shut(); } });
      doctorBody(sheetBody, { inSheet: true });
    });
  }
  return root;
}

function doctorCard(kind) {
  return () => {
    let key = "pcoff";
    const holder = h("div", { class: "deck-swap" });
    const pick = h("div", { class: "scen", role: "radiogroup", "aria-label": "What went wrong" }, h("span", {}, "What went wrong:"),
      ...Object.entries(DOC_SCENARIOS).map(([k, s]) => {
        const b = h("button", { type: "button", role: "radio", "aria-checked": String(k === key) }, s.label);
        b.addEventListener("click", () => { key = k; for (const x of $$("button", pick)) x.setAttribute("aria-checked", String(x === b)); draw(); });
        return b;
      }));
    const draw = () => holder.replaceChildren(doctorMock(kind, key));
    draw();
    return [pick, holder];
  };
}

TABS.push({
  id: "t6", n: 6, name: "Connection doctor", stars: 4,
  title: "The Connection doctor: “Fix this” under a failed answer",
  today: [
    "When an Ask fails, the error is printed as an ordinary answer, in the plugin's own words: “Could not reach Ollama at the configured host… Verify PC IP, firewall…”. There is no button to do anything about it.",
    "Already locked: “Fix this” sits under the failed reply and nowhere else. It runs the checks the plugin already has and stops at the first one that fails. It offers one next step; nothing changes without a press. “Save a report” writes a read-only report to the Desktop.",
  ],
  deciding: [
    "How the checks show up: under the reply, in a sheet over the panel, or inside the failed answer itself.",
    "How the failed answer is worded.",
    "Two wild ideas bend locked rules on purpose (one press for several steps; a light that checks before you ask). Say if either is worth reopening.",
  ],
  howto: "Pick what went wrong above each panel, then press A on <b>Fix this</b>. Try the step button: it jumps to the right control in the Ollama tab, with Back to Main at the top. While searching the network, B cancels.",
  options: [
    { id: "A", label: "A", title: "The checks open under the reply", desc: "A on Fix this fills in a short list right under the answer, one line at a time, then one sentence, one step button and Save a report.", build: doctorCard("inline") },
    { id: "B", label: "B", title: "A doctor sheet over the panel", desc: "Fix this opens a sheet with the same list. The chat stays where it was underneath; B closes the sheet.", build: doctorCard("sheet") },
    { id: "C", label: "C", title: "Plain words first", desc: "The failed answer says what happened in one plain line, with Fix this inside it. The exact error folds away under “The exact error”.", build: doctorCard("plain") },
    { id: "W1", label: "Wild 1", wild: true, title: "“Fix it for me”", desc: "After the checks, one press runs every step in order and shows each one, then asks again. Bends the “one press per change” rule.", build: doctorCard("chain") },
    { id: "W2", label: "Wild 2", wild: true, title: "A health light", desc: "A small light on the chat row turns amber when the setup has a problem, before you even ask. A on it opens the same checks. Bends “under the failed reply only”.", build: doctorCard("light") },
  ],
});
