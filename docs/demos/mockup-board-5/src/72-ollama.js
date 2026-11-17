/* ============================================================
   Board 5, tab 2: the Ollama tab's "Where AI runs" section (plan 105, Features, three stars).
   The ask: fold Cancel into the buttons and modernise the look. Drawn inside today's folded tab; the fold
   itself is decided and is not drawn as a choice.
     today  the section as the code has it (OllamaWhereAiRunsSection, OllamaSetupStatusLine)
     A      the button that started the job turns into its own Cancel, progress fills it
     B      while a job runs, the buttons give way to one small job card with Cancel on it
     C      A, plus Test connection becomes one live status line
     Wild   A, plus one job bar at the bottom that follows you through the folded sections
     A and B again for the knowledge library download and the voice engine install
   Every word of the running and finished states is the code's own (stage names, the progress line, the
   result line); the model names and sizes are examples. All names here start with b5t2.
   ============================================================ */

/* ---------- the job scripts: what each job shows at each moment ---------- */
const b5t2Gb = (n) => (n >= 1 ? n.toFixed(1) + " GB" : Math.round(n * 1000) + " MB");
const b5t2Eta = (s) => (s >= 60 ? Math.floor(s / 60) + "m" + String(Math.round(s % 60)).padStart(2, "0") + "s" : Math.max(1, Math.round(s)) + "s");
const B5T2_TAGS = [["gemma4:e2b-it-qat", 3.2], ["nomic-embed-text", 0.27], ["qwen3:4b", 2.5], ["llama3.2:3b", 2.0], ["gemma3:4b", 3.3], ["phi4-mini", 2.5], ["mistral:7b", 4.1]];
const B5T2_AWAKE = "Keep the Deck awake and online until this finishes.";
const B5T2_SITE = { ollama: "From ollama.com and registry.ollama.ai", kb: "From huggingface.co (github.com if it does not answer)", voice: "From ghcr.io and huggingface.co" };
const B5T2_HELP_BUSY = "Install in progress — first-time setup can take up to 5 minutes. Keep Wi‑Fi on and avoid sleep or reboot until it finishes.";
const B5T2_HOLD_MS = { ollama: 5630, kb: 2900, voice: 6300 };

const B5T2_DEFS = {
  ollama: {
    total: 9600, cancelMs: 1500,
    at(ms) {
      const v = (sig, o) => ({ sig, ind: true, frac: -1, right: "", ...o });
      if (ms < 600) return v("check", { today: "Checking…", l1: "Checking what is installed", l2: B5T2_AWAKE });
      if (ms < 1500) return v("install", { today: "Installing Ollama…", l1: "Installing the newest Ollama", l2: B5T2_AWAKE });
      if (ms < 2200) return v("restart", { today: "Restarting Ollama so the new version is the one running…", l1: "Restarting Ollama", l2: "So the new version is the one answering." });
      if (ms < 9200) {
        const i = Math.floor((ms - 2200) / 1000), p = ((ms - 2200) % 1000) / 1000, [tag, size] = B5T2_TAGS[i];
        const pct = Math.round(p * 100), done = size * p, eta = b5t2Eta((1 - p) * size * 1000 / 25);
        return { sig: "pull" + i, ind: false, frac: (i + p) / 7, step: i + 1, tag, right: `${i + 1} of 7`,
          today: `Pull ${i + 1}/7 — ${tag} · Downloading 6e4c38e1172f: ${pct}% ${b5t2Gb(done)}/${b5t2Gb(size)} 25 MB/s ${eta}`,
          l1: `Downloading model ${i + 1} of 7 · ${tag}`, l2: `${b5t2Gb(done)} of ${b5t2Gb(size)} · 25 MB/s · about ${eta} left` };
      }
      return { sig: "complete", ind: false, frac: 1, right: "7 of 7", today: "Finishing…", l1: "Finishing up", l2: "" };
    },
  },
  kb: {
    total: 7000, cancelMs: 1000,
    at(ms) {
      const f = Math.min(1, ms / 7000), mb = Math.round(f * 210), pct = Math.round(f * 100);
      return { sig: "dl", ind: false, frac: f, right: pct + "%", today: `${pct}% (${mb} / 210 MB)`, l1: "Downloading the knowledge library", l2: `${mb} of 210 MB` };
    },
  },
  voice: {
    total: 9000, cancelMs: 1000,
    at(ms) {
      const v = (sig, o) => ({ sig, ind: true, frac: -1, right: "", ...o });
      if (ms < 1500) return v("pull", { today: "binary_pull_start", l1: "Fetching the build image", l2: B5T2_AWAKE });
      if (ms < 4500) return v("build", { today: "binary_build_start", l1: "Building the voice engine", l2: "This part has no percentage. It can take a few minutes." });
      if (ms < 8500) {
        const f = (ms - 4500) / 4000, mb = Math.round(f * 148), pct = Math.round(f * 100);
        return { sig: "model", ind: false, frac: f, right: pct + "%", today: `downloading (${pct}%)`, l1: "Downloading the base.en speech model", l2: `${mb} of 148 MB` };
      }
      return { sig: "verify", ind: false, frac: 1, right: "100%", today: "verifying", l1: "Checking the file", l2: "" };
    },
  },
};

/* One running job: its phase, its clock, its Cancel. change(kind) is told to redraw ("tick" = text only). */
class B5T2Job {
  constructor(name, change) {
    this.name = name; this.def = B5T2_DEFS[name]; this.change = change;
    this.phase = "idle"; this.ms = 0; this.hold = false; this.cancelAt = 0; this.freezeMs = 0; this.startAt = 0; this.sig = ""; this.t = null; this.last = 0; this.to = null;
  }
  view(freeze) { return this.def.at((freeze && this.cancelAt) ? this.freezeMs : this.ms); }
  clear() { clearInterval(this.t); clearTimeout(this.to); this.t = null; this.cancelAt = 0; }
  start() {
    if (this.phase === "running") return;
    this.clear(); this.phase = "running"; this.ms = 0; this.hold = false; this.startAt = Date.now(); this.sig = ""; this.last = Date.now();
    this.t = setInterval(() => this.tick(), 100);
    this.change();
  }
  tick() {
    if (this.phase !== "running") { clearInterval(this.t); return; }
    const n = Date.now(), d = n - this.last; this.last = n;
    if (this.hold) return;
    this.ms += d;
    if (this.ms >= this.def.total) { this.ms = this.def.total; clearInterval(this.t); this.phase = "done"; this.change("end"); return; }
    const s = this.def.at(this.cancelAt ? this.freezeMs : this.ms).sig;
    if (s !== this.sig) { this.sig = s; this.change(); } else this.change("tick");
  }
  cancel() {
    if (this.phase !== "running" || this.cancelAt) return;
    this.cancelAt = Date.now(); this.freezeMs = this.ms;
    this.change();
    this.to = setTimeout(() => { if (this.phase === "running") { this.clear(); this.phase = "cancelled"; this.change("end"); } }, this.def.cancelMs);
  }
  set(state) {
    this.clear(); this.hold = false;
    if (state === "idle") { this.phase = "idle"; this.ms = 0; }
    else if (state === "live") { this.phase = "idle"; this.start(); return; }
    else if (state === "held") { this.phase = "running"; this.hold = true; this.ms = B5T2_HOLD_MS[this.name]; this.startAt = Date.now() - 1000; }
    else if (state === "done") { this.phase = "done"; this.ms = this.def.total; }
    else { this.phase = state; this.ms = B5T2_HOLD_MS[this.name]; }
    this.change();
  }
  state() { return this.phase === "running" ? (this.hold ? "held" : "live") : this.phase; }
}

/* ---------- small pieces ---------- */
const B5T2_PATHS = {
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  dl: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
};
const b5t2Ic = (k) => h("span", { class: "b5t2-ic", html: svg2(B5T2_PATHS[k]) });
const b5t2Spin = () => h("span", { class: "b5t2-spin" });
const b5t2Wrap = (ctx, key, fn) => (e) => {
  ctx.press = { key, at: Date.now() };
  const el = e && e.currentTarget;
  if (el) { el.classList.add("pressed"); setTimeout(() => el.classList.remove("pressed"), 170); }
  fn(e);
};
const b5t2Pressed = (ctx, key) => (ctx.press && ctx.press.key === key && Date.now() - ctx.press.at < 170 ? " pressed" : "");

/* the job button (A, C, the wild one, and the two pieces elsewhere): the starter turns into its own Cancel */
function b5t2JobBtn(ctx, o) {
  const job = o.job, run = job.phase === "running", stopping = run && !!job.cancelAt;
  const v = run ? job.view(true) : null;
  const label = run ? (stopping ? "Stopping" : o.cancel) : (job.phase === "failed" ? "Try again" : o.idle);
  const btn = h("button", {
    class: "b5t2-btn " + (o.cls || "") + (run ? " job" : "") + (stopping ? " stopping" : "") + b5t2Pressed(ctx, o.key),
    "data-stop": "", "data-k": o.key, "data-label": o.help ? o.helpLabel : null, "data-help": run && o.help ? o.help : null,
  },
  run && !o.noFill ? h("span", { class: "b5t2-fill" + (v.ind ? " ind" : ""), "data-fill": "", "data-job": job.name, style: v.ind ? null : `width:${v.frac * 100}%` }) : null,
  h("span", { class: "b5t2-bl" }, run ? b5t2Ic("x") : b5t2Ic(o.icon), label),
  run && !o.noRight ? h("span", { class: "b5t2-br", "data-job": job.name, "data-live": "right" }, v.right) : null);
  btn.addEventListener("click", b5t2Wrap(ctx, o.key, o.onAct));
  return btn;
}

/* B: the small job card that stands in for the buttons while a job runs */
function b5t2JobCard(ctx, o) {
  const job = o.job, v = job.view(true), stopping = !!job.cancelAt;
  const cancel = h("button", { class: "b5t2-mini" + (stopping ? " stopping" : "") + b5t2Pressed(ctx, o.key), "data-stop": "", "data-k": o.key, "data-label": o.helpLabel || null, "data-help": o.help || null }, b5t2Ic("x"), stopping ? "Stopping" : "Cancel");
  cancel.addEventListener("click", b5t2Wrap(ctx, o.key, o.onAct));
  return h("div", { class: "b5t2-card" },
    h("div", { class: "b5t2-ch" }, h("span", { class: "b5t2-ct" }, stopping ? o.title.replace(/^(\w+)ing/, "Stopping") : o.title), cancel),
    h("div", { class: "b5t2-bar" }, h("span", { class: "b5t2-fill" + (v.ind ? " ind" : ""), "data-fill": "", "data-job": job.name, style: v.ind ? null : `width:${v.frac * 100}%` })),
    h("div", { class: "b5t2-zone" },
      h("div", { class: "b5t2-z1", "data-job": job.name, "data-live": "l1" }, v.l1),
      h("div", { class: "b5t2-z2", "data-job": job.name, "data-live": "l2" }, v.l2),
      h("div", { class: "b5t2-z3" }, B5T2_SITE[job.name])));
}

/* the text updates that do not need a redraw */
function b5t2Paint(root, jobs) {
  for (const job of Object.values(jobs)) {
    if (job.phase !== "running") continue;
    const v = job.view(true), vt = job.view(false);
    $$(`[data-job="${job.name}"][data-live]`, root).forEach((el) => { const src = el.dataset.live === "today" ? vt : v; el.textContent = src[el.dataset.live] ?? ""; });
    $$(`[data-job="${job.name}"][data-fill]`, root).forEach((el) => { el.style.width = v.ind ? "" : v.frac * 100 + "%"; el.classList.toggle("ind", v.ind); });
  }
}

/* measuring: the drawn panel's own offsetHeight, taken on a copy kept off to the side */
const B5T2_SZ = {};
function b5t2Sizes(key, make, sel, states) {
  if (B5T2_SZ[key]) return B5T2_SZ[key];
  const host = h("div", { style: "position:fixed;left:-9999px;top:0;width:340px;visibility:hidden;pointer-events:none" });
  document.body.append(host);
  const out = {};
  for (const s of states) { const root = make(s); host.replaceChildren(root); const el = root.querySelector(sel); out[s.k] = el ? el.offsetHeight : 0; }
  host.remove();
  return (B5T2_SZ[key] = out);
}
const b5t2Ready = (fn) => { const go = () => setTimeout(fn, 80); if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go(); };

/* the little controls under a card: jump to a state, or let it run */
function b5t2Steps(root, groups) {
  const wrap = h("div", { class: "b5t2-steps" });
  const refresh = () => $$("button", wrap).forEach((b) => b.setAttribute("aria-pressed", String(!!b._active())));
  groups.forEach((g, gi) => {
    if (gi) wrap.append(h("span", { class: "sp" }));
    wrap.append(h("span", { class: "g" }, g.name));
    g.chips.forEach(([label, fn, active]) => {
      const b = h("button", { type: "button", "aria-pressed": "false" }, label);
      b._active = active; b.addEventListener("click", () => { fn(); refresh(); });
      wrap.append(b);
    });
  });
  root.addEventListener("b5t2render", refresh);
  refresh();
  return wrap;
}

/* the height readout: what each state measures, with today's numbers beside it */
function b5t2Readout(rows, root) {
  const box = h("div", { style: "display:grid;gap:4px" });
  const draw = () => {
    box.replaceChildren(...rows.map((r) => {
      const mine = b5t2Sizes(r.key, r.make, r.sel, r.states), base = r.base ? b5t2Sizes(r.base.key, r.base.make, r.sel, r.states) : null;
      const kids = [r.title];
      r.states.forEach((s, i) => {
        kids.push(i ? "·" : "", `${s.label} `, h("b", {}, `${mine[s.k]} px`));
        if (base && base[s.k] !== mine[s.k]) kids.push(h("span", { class: "vs" }, `(today ${base[s.k]})`));
      });
      if (r.live) { const el = root.querySelector(r.sel); if (el && el.offsetHeight) kids.push(h("span", { class: "vs" }, `· on screen now ${el.offsetHeight} px`)); }
      return h("p", { class: "d-measure" }, ...kids);
    }));
  };
  b5t2Ready(draw);
  root.addEventListener("b5t2render", () => setTimeout(draw, 40));
  return box;
}

/* ---------- the Ollama section: one drawing for today, A, B, C and the wild one ---------- */
const B5T2_FOLDS = [["Knowledge base (offline)", "Use local knowledge base on"], ["Reply style", "Reply style Balanced · Thinking Off"], ["Connection tuning", "Custom timeouts off · Keep models loaded 5m"], ["AI models", ""]];
const B5T2_HELP = {
  runOnDeck: "Off: use a PC on your home network. On: AI runs on this device.",
  autostart: "Starts the local AI when the Deck starts, and lets it keep the answering part and the note-searching part in memory at once — so questions come back about seven tenths of a second sooner.",
};
const B5T2_OL_STATES = [{ k: "idle", phase: "idle", label: "idle" }, { k: "running", phase: "running", label: "installing" }, { k: "done", phase: "done", label: "finished" }, { k: "failed", phase: "failed", label: "failed" }, { k: "cancelled", phase: "cancelled", label: "cancelled" }];
const B5T2_TEST_STATES = [{ k: "idle", test: "idle", label: "idle" }, { k: "testing", test: "testing", label: "testing" }, { k: "ok", test: "ok", label: "connected" }, { k: "bad", test: "bad", label: "not reachable" }];
const B5T2_FAIL = "Failed: llama3.2:3b did not download: could not reach registry.ollama.ai";
const B5T2_DONE = "Updated to Ollama 0.40.2 and restarted it.";
const B5T2_IDLE_HINT = "Install the official daemon, restart the service if needed, then pull models. Prefer stable Wi‑Fi.";

function b5t2Panel(variant, preset) {
  const isToday = variant === "today", isB = variant === "B", isC = variant === "C", isW = variant === "W";
  const ctx = { press: null };
  const st = { autostart: true, test: "ok", prev: "ok", testResult: "ok" };
  const job = new B5T2Job("ollama", (k) => (k === "tick" ? b5t2Paint(root, { ollama: job }) : render(k)));
  let tt = null;

  const holder = h("div", { style: "display:contents" });
  const root = deckFrame({ body: holder, header: false });
  root.classList.add("dt", "b5t2", "b5t2-" + variant);
  const sc = h("div", { class: "dt-scroll scroll" });
  const strip = h("div", { class: "k-strip" });
  const dock = h("div", { class: "b5t2-dock" });
  holder.append(tabBar2(1), h("div", { class: "k2-gap" }), sc, dock);

  const runTest = () => {
    if (st.test === "testing") return;
    st.test = "testing"; render();
    clearTimeout(tt);
    tt = setTimeout(() => { st.test = st.testResult; st.prev = st.testResult; render(); }, 1400);
  };
  const setTest = (k) => {
    clearTimeout(tt);
    if (k === "idle") { st.test = "idle"; st.prev = null; }
    else if (k === "testing") st.test = "testing";
    else { st.test = k; st.prev = k; st.testResult = k; }
    render();
  };
  const startRun = () => { if (job.phase !== "running") { job.start(); } };
  const onAct = () => {
    if (isToday) { startRun(); return; }
    if (job.phase !== "running") startRun();
    else if (Date.now() - job.startAt > 600) job.cancel(); // a double press in the first half second is ignored
  };

  const foldLine = (label, summary, open, key) => h("button", { class: "k-fold" + (open ? " open" : ""), "data-stop": "", "data-k": key }, h("span", { class: "k-ft" }, label), h("span", { class: "k-fs" }, summary), h("span", { class: "k-fc" }, open ? "▾" : "▸"));
  const swRow = (key, label, on, help, fn) => {
    const sw = h("span", { class: "k-sw" + (on ? " on" : "") });
    const b = h("button", { class: "k-row", "data-stop": "", "data-k": key, "data-label": label, "data-help": help }, h("span", { class: "k-l" }, label), sw);
    b.addEventListener("click", fn);
    return b;
  };

  /* what the line under the buttons says, today: the stage, the result, the failure, and the raw log */
  function todayStatus() {
    const run = job.phase === "running", ended = ["done", "failed", "cancelled"].includes(job.phase);
    if (!run && !ended) return [h("div", { class: "b5t2-hint" }, B5T2_IDLE_HINT)];
    const out = [];
    if (run) out.push(h("div", { class: "b5t2-stage", "data-job": "ollama", "data-live": "today" }, job.view(false).today));
    if (job.phase === "done") out.push(h("div", { class: "b5t2-res b5t2-ok" }, B5T2_DONE));
    if (job.phase === "failed") out.push(h("div", { class: "b5t2-res b5t2-bad" }, B5T2_FAIL));
    if (job.phase === "cancelled") out.push(h("div", { class: "b5t2-res b5t2-bad" }, "Cancelled."));
    const lines = ["[bonsAI] Local Ollama setup started.", "[bonsAI] Model blobs store: /home/deck/.ollama/models (override with OLLAMA_MODELS).", "[bonsAI] Profile 'update_installed': refresh Ollama binary, then re-pull each locally installed tag.", "[bonsAI] Re-running official Ollama installer to update the binary…", "[bonsAI] Re-pulling 7 installed tag(s) for updates…"];
    const upto = job.phase === "done" ? 7 : Math.max(0, job.view(false).step || (job.ms >= 2200 ? 1 : 0));
    for (let i = Math.max(0, upto - 2); i < upto; i++) lines.push(`[bonsAI] ollama pull ${B5T2_TAGS[i][0]}`);
    if (job.phase === "done") lines.push("[bonsAI] Local Ollama setup finished.");
    if (job.phase === "cancelled") lines.push("[bonsAI] Setup stopped: Cancelled.");
    if (job.phase === "failed") lines.push("[bonsAI] Setup finished with a problem: " + B5T2_FAIL.replace("Failed: ", ""));
    out.push(h("pre", { class: "b5t2-pre" }, lines.join("\n")));
    return out;
  }

  /* what the options say under the button: the steps while it runs, the result after, the sites always */
  function zone() {
    const run = job.phase === "running";
    if (run) { const v = job.view(true); return h("div", { class: "b5t2-zone" }, h("div", { class: "b5t2-z1", "data-job": "ollama", "data-live": "l1" }, v.l1), h("div", { class: "b5t2-z2", "data-job": "ollama", "data-live": "l2" }, v.l2), h("div", { class: "b5t2-z3" }, B5T2_SITE.ollama)); }
    if (job.phase === "done") return h("div", { class: "b5t2-zone" }, h("div", { class: "b5t2-z1 ok" }, "✓ " + B5T2_DONE));
    if (job.phase === "failed") return h("div", { class: "b5t2-zone" }, h("div", { class: "b5t2-z1 bad" }, B5T2_FAIL), h("div", { class: "b5t2-z3" }, B5T2_SITE.ollama));
    if (job.phase === "cancelled") return h("div", { class: "b5t2-zone" }, h("div", { class: "b5t2-z1 mute" }, "Cancelled."), h("div", { class: "b5t2-z3" }, B5T2_SITE.ollama));
    return h("div", { class: "b5t2-zone" }, h("div", { class: "b5t2-z2" }, B5T2_IDLE_HINT), h("div", { class: "b5t2-z3" }, B5T2_SITE.ollama));
  }

  function setupBlock() {
    const run = job.phase === "running";
    const kids = [h("div", { class: "b5t2-lbl" }, "Local Ollama setup", h("span", {}, "Installed: 7"))];
    const browse = (hide) => h("button", { class: "b5t2-btn " + (isToday ? "old" : "alt"), disabled: hide, "data-stop": "", "data-k": "browse" }, isToday ? "Browse models…" : [h("span", {}, "Browse models"), b5t2Ic("chev")]);
    if (isToday) {
      const upd = h("button", { class: "b5t2-btn old" + (run ? " dark" : "") + b5t2Pressed(ctx, "act"), "data-stop": "", "data-k": "act", "data-label": "Update AI & models", "data-help": run ? B5T2_HELP_BUSY : null }, run ? "Updating…" : "Update AI & models");
      upd.addEventListener("click", b5t2Wrap(ctx, "act", onAct));
      kids.push(upd, browse(run));
      if (run) {
        const c = h("button", { class: "b5t2-btn b5t2-cancel" + b5t2Pressed(ctx, "cancel"), "data-stop": "", "data-k": "cancel" }, "Cancel");
        c.addEventListener("click", b5t2Wrap(ctx, "cancel", () => job.cancel()));
        kids.push(h("div", { class: "b5t2-cancelrow" }, c));
      }
      kids.push(...todayStatus());
    } else if (isB && run) {
      kids.push(b5t2JobCard(ctx, { job, key: "act", onAct, title: "Updating AI & models", helpLabel: "Update AI & models", help: B5T2_HELP_BUSY }));
    } else if (isB) {
      kids.push(b5t2JobBtn(ctx, { job, key: "act", onAct, idle: "Update AI & models", icon: "refresh", cancel: "", helpLabel: "Update AI & models" }), browse(false), zone());
    } else {
      kids.push(b5t2JobBtn(ctx, { job, key: "act", onAct, idle: "Update AI & models", icon: "refresh", cancel: "Cancel update", helpLabel: "Update AI & models", help: B5T2_HELP_BUSY, noRight: isW, noFill: isW }));
      if (!isW) kids.push(zone());
      kids.push(browse(run));
      if (isW) kids.push(h("div", { class: "b5t2-zone" }, run ? h("div", { class: "b5t2-z3" }, "The progress is in the bar at the bottom.") : zone()));
    }
    return h("div", { class: "b5t2-setup" }, ...kids);
  }

  function testBlock() {
    const t = st.test, testing = t === "testing";
    const shown = testing ? st.prev : t === "idle" ? null : t;
    if (isC) {
      const m = { idle: ["", "Not tested yet: A tests it", "127.0.0.1:11434"], testing: ["busy", "Checking the connection", "127.0.0.1:11434"], ok: ["ok", "Connected to this Deck's AI", "Ollama v0.34.1 · 7 models · 127.0.0.1:11434"], bad: ["bad", "Not reachable: Test again", "Could not connect to 127.0.0.1:11434"] }[t];
      const live = h("button", { class: "b5t2-live" + b5t2Pressed(ctx, "test"), "data-stop": "", "data-k": "test" },
        h("span", { class: "b5t2-dot " + m[0] }), h("span", { class: "b5t2-lt" }, h("div", { class: "b5t2-l1" }, m[1]), h("div", { class: "b5t2-l2" }, m[2])),
        testing ? b5t2Spin() : h("span", { class: "b5t2-re", html: svg2(B5T2_PATHS.refresh) }));
      live.addEventListener("click", b5t2Wrap(ctx, "test", runTest));
      return h("div", { class: "b5t2-testblk" }, live);
    }
    const btn = h("button", { class: "b5t2-gbtn" + (isToday ? "" : " steady") + b5t2Pressed(ctx, "test"), "data-stop": "", "data-k": "test" }, isToday ? (testing ? "…" : "Test connection") : (testing ? [b5t2Spin(), "Testing"] : "Test connection"));
    btn.addEventListener("click", b5t2Wrap(ctx, "test", runTest));
    const res = shown === "ok" ? h("div", { class: "b5t2-tres b5t2-ok" }, (isToday ? "" : "✓ ") + "Connected · Ollama v0.34.1 · 7 models")
      : shown === "bad" ? h("div", { class: "b5t2-tres b5t2-bad" }, isToday ? "Unreachable — could not connect to 127.0.0.1:11434" : "Not reachable: could not connect to 127.0.0.1:11434") : null;
    return h("div", { class: "b5t2-testblk" }, h("div", { class: "b5t2-trow" + (isToday ? "" : " steadyrow") }, h("div", { class: "b5t2-tt" }, "Ollama runs on this Deck at ", h("span", { class: "cy" }, "127.0.0.1:11434")), btn), res);
  }

  function build() {
    const sw1 = swRow("sw1", "Run AI on this Deck", true, B5T2_HELP.runOnDeck, () => {});
    const sw2 = swRow("sw2", "Start the AI with the Deck", st.autostart, B5T2_HELP.autostart, () => { st.autostart = !st.autostart; render(); });
    const body = h("div", { class: "k-foldbody" }, sw1, h("div", { class: "k-item" }, sw2, h("div", { class: "k-line" }, st.autostart ? "Set up and answering questions." : "")), setupBlock(), testBlock());
    return [foldLine("Where AI runs", `Run AI on this Deck on · Start the AI with the Deck ${st.autostart ? "on" : "off"}`, true, "f0"), body, ...B5T2_FOLDS.map(([n, s], i) => foldLine(n, s, false, "f" + (i + 1)))];
  }

  function showStrip() {
    const cur = Deck.current(root);
    strip.innerHTML = cur && cur.dataset.help ? `<span class="k-strip-l">${cur.dataset.label || ""}</span>${cur.dataset.help}` : "";
  }
  function buildDock() {
    const kids = [];
    if (isW && job.phase === "running") {
      const v = job.view(true), stopping = !!job.cancelAt;
      const x = h("button", { class: "b5t2-mini" + (stopping ? " stopping" : "") + b5t2Pressed(ctx, "bar"), "data-stop": "", "data-k": "bar" }, b5t2Ic("x"), stopping ? "Stopping" : "Cancel", h("i", { class: "b5t2-key" }, "X"));
      x.addEventListener("click", b5t2Wrap(ctx, "bar", () => job.cancel()));
      kids.push(h("div", { class: "b5t2-wbar" },
        h("div", { class: "b5t2-bar" }, h("span", { class: "b5t2-fill" + (v.ind ? " ind" : ""), "data-fill": "", "data-job": "ollama", style: v.ind ? null : `width:${v.frac * 100}%` })),
        b5t2Spin(), h("div", { class: "b5t2-wt" }, h("b", {}, stopping ? "Stopping the update" : "Updating AI & models"), h("small", { "data-job": "ollama", "data-live": "l1" }, v.l1)), x));
    }
    kids.push(strip);
    dock.replaceChildren(...kids);
  }

  function render(kind) {
    const cur = Deck.current(root), key = cur && cur.dataset.k, top = sc.scrollTop;
    sc.replaceChildren(...build());
    buildDock();
    sc.scrollTop = top;
    if (key) {
      let el = $(`[data-k="${key}"]`, root);
      if (!el || !Deck.stops(root).includes(el)) el = $(`[data-k="act"]`, root);
      if (el) Deck.setRing(root, el, { scroll: false });
    } else showStrip();
    if (kind === "end" && job.phase === "done") setTimeout(runTest, 300); // the code runs a connection test once a setup finishes
    root.dispatchEvent(new Event("b5t2render"));
  }
  root.addEventListener("ringmove", showStrip);
  root.addEventListener("deckkey", (e) => {
    if (isW && e.detail.key === "X" && job.phase === "running") { e.preventDefault(); b5t2Wrap(ctx, "bar", () => job.cancel())({}); }
  });

  if (preset) {
    job.set(preset.phase === "running" ? "held" : preset.phase || "idle");
    st.test = preset.test || "idle"; st.prev = st.test === "ok" || st.test === "bad" ? st.test : null; if (st.test === "bad") st.testResult = "bad";
  }
  const first = build();
  sc.replaceChildren(...first); buildDock();
  const start = $("[data-k=\"act\"]", root); start && start.setAttribute("data-start", "");
  root.scroller = sc;
  root.b5t2 = { job, st, setTest, render };
  return root;
}

function b5t2OllamaCard(variant) {
  return () => {
    const root = b5t2Panel(variant);
    const { job, setTest, st } = root.b5t2;
    const steps = b5t2Steps(root, [
      { name: "Install:", chips: [["Idle", () => job.set("idle"), () => job.state() === "idle"], ["Installing (live)", () => job.set("live"), () => job.state() === "live"], ["Installing (held)", () => job.set("held"), () => job.state() === "held"], ["Finished", () => job.set("done"), () => job.state() === "done"], ["Failed", () => job.set("failed"), () => job.state() === "failed"], ["Cancelled", () => job.set("cancelled"), () => job.state() === "cancelled"]] },
      { name: "Test connection:", chips: [["Idle", () => setTest("idle"), () => st.test === "idle"], ["Testing", () => setTest("testing"), () => st.test === "testing"], ["Connected", () => setTest("ok"), () => st.test === "ok"], ["Not reachable", () => setTest("bad"), () => st.test === "bad"]] },
    ]);
    const mk = (v) => (s) => b5t2Panel(v, { phase: s.phase, test: s.test });
    const base = variant === "today" ? null : { key: "today|setup", make: mk("today") };
    const baseT = variant === "today" ? null : { key: "today|test", make: mk("today") };
    const rows = [
      { title: "The install area, in the Deck's own pixels:", key: variant + "|setup", make: mk(variant), sel: ".b5t2-setup", states: B5T2_OL_STATES, base, live: true },
      { title: "The test row:", key: variant + "|test", make: mk(variant), sel: ".b5t2-testblk", states: B5T2_TEST_STATES, base: baseT },
    ];
    if (variant === "W") rows.push({ title: "The job bar, docked while a job runs:", key: "W|bar", make: mk("W"), sel: ".b5t2-wbar", states: [{ k: "running", phase: "running", label: "installing" }] });
    const note = h("p", { class: "b5t2-note" }, "Model names, sizes and the failure sentence are examples. Everything else is the code's own wording.");
    return [root, steps, b5t2Readout(rows, root), note];
  };
}

/* ---------- the same idea elsewhere: the knowledge library download and the voice engine install ---------- */
function b5t2AlsoPanel(pattern, preset) {
  const isB = pattern === "B";
  const ctx = { press: null };
  const jobs = {};
  const change = (k) => (k === "tick" ? b5t2Paint(root, jobs) : render());
  jobs.kb = new B5T2Job("kb", change); jobs.voice = new B5T2Job("voice", change);
  const holder = h("div", { style: "display:contents" });
  const root = deckFrame({ body: holder, header: false });
  root.classList.add("dt", "b5t2", "b5t2-also");
  const sc = h("div", { class: "dt-scroll scroll" });
  holder.append(tabBar2(1), h("div", { class: "k2-gap" }), sc);
  const act = (j) => () => { if (j.phase !== "running") j.start(); else if (Date.now() - j.startAt > 600) j.cancel(); };

  const foldLine = (label, summary, key) => h("button", { class: "k-fold open", "data-stop": "", "data-k": key }, h("span", { class: "k-ft" }, label), h("span", { class: "k-fs" }, summary), h("span", { class: "k-fc" }, "▾"));
  const zoneFor = (j, resultOk, failLine, cancelLine) => {
    const kids = [];
    if (j.phase === "running") { const v = j.view(true); kids.push(h("div", { class: "b5t2-z1", "data-job": j.name, "data-live": "l1" }, v.l1), h("div", { class: "b5t2-z2", "data-job": j.name, "data-live": "l2" }, v.l2)); }
    else if (j.phase === "done") kids.push(h("div", { class: "b5t2-z1 ok" }, "✓ " + resultOk));
    else if (j.phase === "failed") kids.push(h("div", { class: "b5t2-z1 bad" }, failLine));
    else if (j.phase === "cancelled") kids.push(h("div", { class: "b5t2-z1 mute" }, cancelLine));
    kids.push(h("div", { class: "b5t2-z3" }, B5T2_SITE[j.name]));
    return h("div", { class: "b5t2-zone" }, ...kids);
  };

  function kbBlock() {
    const j = jobs.kb, run = j.phase === "running", done = j.phase === "done";
    const status = h("div", { class: "b5t2-info sm" }, h("span", { class: "b5t2-ok" }, "Installed"), ` — version ${done ? "2026.11.14" : "2026.09.27"}`, h("br"), h("span", { style: "color:#6b7c90" }, "~/.bonsai/rag/library"));
    const remove = h("button", { class: "b5t2-btn red small", disabled: run, "data-stop": "", "data-k": "kbremove" }, "Remove");
    let main;
    if (isB && run) main = b5t2JobCard(ctx, { job: j, key: "kb", onAct: act(j), title: "Updating the knowledge library" });
    else main = h("div", { class: "b5t2-pair" }, b5t2JobBtn(ctx, { job: j, key: "kb", onAct: act(j), idle: "Update knowledge base", icon: "refresh", cancel: "Cancel download", cls: "glass big" }), remove);
    const zone = isB && run ? null : zoneFor(j, "Library updated.", "Download failed: could not reach huggingface.co", "Download cancelled. Nothing was installed — start it again whenever you like.");
    return h("div", { class: "b5t2-blk b5t2-kbblk" }, status, main, zone);
  }
  function voiceBlock() {
    const j = jobs.voice, run = j.phase === "running", ready = j.phase === "done";
    const lines = h("div", { class: "b5t2-info" }, `Engine: ${ready ? "whisper-cli ready" : "whisper-cli not installed"}`, h("br"), `Model: ${ready ? "base.en ready" : "base.en not downloaded"}`, ready ? [h("br"), "Voice engine is ready for on-device transcription."] : !run ? [h("br"), "Tap Install voice engine below (uses podman on SteamOS)."] : null);
    let main;
    if (isB && run) main = b5t2JobCard(ctx, { job: j, key: "voice", onAct: act(j), title: "Installing the voice engine" });
    else main = b5t2JobBtn(ctx, { job: j, key: "voice", onAct: act(j), idle: ready ? "Reinstall voice engine" : "Install voice engine", icon: "dl", cancel: "Cancel install", cls: "glass voice" });
    return h("div", { class: "b5t2-blk b5t2-vblk" }, lines, main, isB && run ? null : zoneFor(j, "Voice engine installed.", "Install failed: the build did not finish", "Install cancelled."));
  }

  function render() {
    const cur = Deck.current(root), key = cur && cur.dataset.k, top = sc.scrollTop;
    sc.replaceChildren(
      h("div", { class: "b5t2-cap" }, "Excerpt 1 of 2 · the Ollama tab"),
      foldLine("Knowledge base (offline)", "Use local knowledge base on", "f1"), kbBlock(),
      h("div", { class: "b5t2-cap" }, "Excerpt 2 of 2 · the Settings tab"),
      foldLine("Voice input", "STT model base.en", "f2"), voiceBlock());
    sc.scrollTop = top;
    if (key) { let el = $(`[data-k="${key}"]`, root); if (!el || !Deck.stops(root).includes(el)) el = $(`[data-k="kb"]`, root); if (el) Deck.setRing(root, el, { scroll: false }); }
    root.dispatchEvent(new Event("b5t2render"));
  }
  if (preset) { for (const n of ["kb", "voice"]) jobs[n].set(preset[n] === "running" ? "held" : preset[n] || "idle"); }
  sc.replaceChildren(h("div", { class: "b5t2-cap" }, "Excerpt 1 of 2 · the Ollama tab"), foldLine("Knowledge base (offline)", "Use local knowledge base on", "f1"), kbBlock(), h("div", { class: "b5t2-cap" }, "Excerpt 2 of 2 · the Settings tab"), foldLine("Voice input", "STT model base.en", "f2"), voiceBlock());
  const start = $("[data-k=\"kb\"]", root); start && start.setAttribute("data-start", "");
  root.scroller = sc; root.b5t2 = { jobs, render };
  return root;
}

function b5t2AlsoCard(pattern) {
  return () => {
    const root = b5t2AlsoPanel(pattern);
    const { jobs } = root.b5t2;
    const chips = (j) => [["Idle", () => j.set("idle"), () => j.state() === "idle"], ["Running (live)", () => j.set("live"), () => j.state() === "live"], ["Running (held)", () => j.set("held"), () => j.state() === "held"], ["Finished", () => j.set("done"), () => j.state() === "done"], ["Failed", () => j.set("failed"), () => j.state() === "failed"], ["Cancelled", () => j.set("cancelled"), () => j.state() === "cancelled"]];
    const steps = b5t2Steps(root, [{ name: "Library download:", chips: chips(jobs.kb) }, { name: "Voice install:", chips: chips(jobs.voice) }]);
    const mk = (which) => (s) => b5t2AlsoPanel(pattern, { [which]: s.phase });
    const rows = [
      { title: "The library area:", key: "also" + pattern + "|kb", make: mk("kb"), sel: ".b5t2-kbblk", states: B5T2_OL_STATES, live: true },
      { title: "The voice area:", key: "also" + pattern + "|voice", make: mk("voice"), sel: ".b5t2-vblk", states: B5T2_OL_STATES, live: true },
    ];
    const note = h("p", { class: "b5t2-note" }, "Two parts of two tabs, drawn together to compare. Sizes and the failure sentences are examples.");
    return [root, steps, b5t2Readout(rows, root), note];
  };
}

/* ---------- the tab ---------- */
TABS.push({
  id: "t2", n: 2, name: "Ollama tab", stars: 3, wide: false,
  onShow: () => $$("#tab-t2 .deck").forEach((r) => r.dispatchEvent(new Event("b5t2render"))),
  title: "The Ollama tab: fold Cancel into the buttons and make it feel modern",
  today: [
    "Update AI & models goes dark and reads “Updating…”. A separate red Cancel button then appears on a row of its own, under Browse models, which is greyed out.",
    "Under that come a line of progress as the program prints it (“Downloading 6e4c38e1172f: 43% 1.3 GB/3.2 GB”) and a dark box of raw installer lines.",
    "Test connection turns into a lone “…” while it checks, and its button shrinks, so the words beside it move. The answer shows on a separate line below.",
    "Press Cancel and the ring jumps back to Update. The knowledge library does the same with a red Cancel that takes Remove's place. The voice engine install has no Cancel at all: its button greys out and the screen shows raw program words while it works.",
  ],
  deciding: [
    "Where Cancel lives while a job runs: on the button that started it (A), on one small job card that stands in for the buttons (B), or on a bar at the bottom that follows you around the tab (Wild).",
    "Whether Test connection becomes a live status line (C) instead of a button whose label changes.",
    "Whether the raw installer lines stay on this tab. All four drawings hide them.",
    "Whether the library download and the voice install get the same treatment (the last two cards).",
  ],
  howto: "Click a panel, then use the arrow keys; Enter is A. Press A on Update AI & models to watch a whole job run (it takes about ten seconds), and A again on the same button to cancel it where the drawing lets you. The small buttons under a panel jump straight to a state: “held” freezes it so you can compare drawings side by side. The first switch is fixed on here (off would show the PC address instead), and the closed sections do not open.",
  options: [
    { id: "today", label: "Today", today: true, group: "main", title: "The section as it ships", desc: "Update turns dark and reads “Updating…”, a separate red Cancel appears on its own row, and the raw installer box fills in under it. Test connection becomes “…”. When Cancel is pressed the ring jumps back to Update.", build: b5t2OllamaCard("today") },
    { id: "A", label: "A", group: "main", groupTitle: "Three ways to fold Cancel in", title: "The button that started the job becomes its own Cancel", desc: "Press A on Update and it answers at once: it dips, fills with progress from the left and now says Cancel update, with how far along it is on the right. Under it go the steps, the speed and the line that names the sites (ollama.com and registry.ollama.ai). The ring never moves: it is on the same button when the job starts, while it runs and when it ends. A second A in the first half second is ignored, so a double press cannot cancel by mistake. Browse models stays where it is, dimmed. Test connection keeps its place but shows a small spinner and the word Testing, at a fixed width, instead of a lone “…”.", build: b5t2OllamaCard("A") },
    { id: "B", label: "B", group: "main", title: "One small job card stands in for the buttons", desc: "While a job runs, Update and Browse models give way to one card: what is downloading, how far, how fast, the sites it comes from, and a Cancel button at its top right. The ring is handed to that Cancel on the press. It sits level with where Update was, so the ring barely travels, and it is never left on nothing. When the job ends the card turns back into the two buttons and the ring goes back to Update. Fewer boxes on screen, and the whole job is one thing to look at. Test connection works as in A.", build: b5t2OllamaCard("B") },
    { id: "C", label: "C", group: "main", title: "A, and Test connection becomes a live status line", desc: "Everything in A, plus Test connection stops being a button whose label changes. It becomes one status line that is the button: a coloured dot, “Connected to this Deck's AI” with the version and model count under it, or “Not reachable: Test again”. A on it tests again. It is the same height in every state, so nothing below it moves, and the ring stays on it through the check. The connection test also runs on its own when an update finishes, as the plugin does today, so you see it turn from checking to connected.", build: b5t2OllamaCard("C") },
    { id: "W", label: "Wild", wild: true, group: "main", title: "A job bar that follows you", desc: "The starting button still turns into its own Cancel, as in A, but it stays small: no progress inside it and no lines under it. The progress, the steps and a Cancel button live on a bar docked at the bottom of the panel, above the help strip. Because the sections are folded, you can leave Where AI runs and open another section, and the job and its Cancel are still in sight. Pressing X cancels from anywhere in the tab. The bar's own button is the last stop in the list, so the quick way to it is X. The same bar could hold the library download and the voice install.", build: b5t2OllamaCard("W") },
    { id: "KA", label: "A, elsewhere", group: "also", groupTitle: "The same idea elsewhere", title: "Pattern A on the library download and the voice install", desc: "The library's Update button turns into its own Cancel and fills with progress, and Remove stays beside it, dimmed. This replaces the red Cancel that takes Remove's place today. The voice engine install gets the first Cancel it has ever had, and plain words in place of the raw program words. The ring stays on the button in both. Each shows the sites its download comes from.", build: b5t2AlsoCard("A") },
    { id: "KB", label: "B, elsewhere", group: "also", title: "Pattern B on the library download and the voice install", desc: "While a job runs, its button row gives way to one small card with the same parts as in B: what is downloading, how far, the sites, and Cancel at the top right. The ring moves to that Cancel on the press and goes back to the button when the job ends. The voice install gets its first Cancel here too.", build: b5t2AlsoCard("B") },
  ],
});

/* ============================================================
   ROUND 2 (2026-11-15). The maintainer pressed Like on B (the job card), C (the live connection line), Wild
   (the following bar) and "B, elsewhere", and answered "All three together". Round 1 above is left exactly as
   it was; everything below is new and starts with b5t2 (the R2 names end in 2).
   One engine (b5t2R2Shell) runs all three new drawings:
     - a job running shows ONE face: the card in its section, or the bar at the bottom, never both. The card
       and the bar are both built from the same job, and every live word is painted into both by one routine
       (b5t2Paint2), so they cannot say different things.
     - the bar sits under the help strip, at the very bottom edge, so it never covers the strip; the list keeps
       room for both, and the ring is scrolled clear of both.
     - 2A: the bar shows whenever the ring is outside the section (or the section is folded) and the card
       folds to one line; 2B: the bar shows only while the card cannot be seen, and the card never folds.
     - 2K: the same on the library download and the voice install, which live on two tabs, so leaving a tab is
       what brings the bar. One bar; what it does with two jobs is a switch you can press.
   ============================================================ */
const B5T2_N = {
  ollama: { run: "Updating AI & models", stop: "Stopping the update", noun: "Update" },
  kb: { run: "Updating the library", stop: "Stopping the download", noun: "Library download" },
  voice: { run: "Voice engine install", stop: "Stopping the install", noun: "Voice install" },
};
const B5T2_RES = {
  ollama: { done: B5T2_DONE, failed: B5T2_FAIL, cancelled: "Cancelled." },
  kb: { done: "Library updated.", failed: "Download failed: could not reach huggingface.co", cancelled: "Download cancelled. Nothing was installed — start it again whenever you like." },
  voice: { done: "Voice engine installed.", failed: "Install failed: the build did not finish", cancelled: "Install cancelled." },
};
const B5T2_RES_MS = 4000;
const B5T2_R2_MODELS = [...B5T2_TAGS, ["gemma3:12b", 8.1], ["qwen3:8b", 5.2], ["llama3.1:8b", 4.9], ["phi4", 9.1], ["deepseek-r1:7b", 4.7], ["mistral-nemo", 7.1], ["codellama:7b", 3.8], ["qwen2.5:3b", 1.9]];
const B5T2_R2_STATES = [{ k: "idle", phase: "idle", label: "idle" }, { k: "running", phase: "running", label: "running" }, { k: "done", phase: "done", label: "finished" }, { k: "failed", phase: "failed", label: "failed" }, { k: "cancelled", phase: "cancelled", label: "cancelled" }];
const b5t2BarLine = (name, v) => (name !== "ollama" && v.right && v.l2 ? v.right + " · " + v.l2 : v.l1);
const b5t2Reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/* the one routine that writes live words and progress into every place a running job is shown */
function b5t2Paint2(root, jobs) {
  for (const job of Object.values(jobs)) {
    if (job.phase !== "running") continue;
    const v = job.view(true), bar = b5t2BarLine(job.name, v);
    $$(`[data-job="${job.name}"][data-live]`, root).forEach((el) => { el.textContent = el.dataset.live === "bar" ? bar : (v[el.dataset.live] ?? ""); });
    $$(`[data-job="${job.name}"][data-fill]`, root).forEach((el) => { el.style.width = v.ind ? "" : v.frac * 100 + "%"; el.classList.toggle("ind", v.ind); });
  }
}

/* the card (B) with its one-line note beside it: only one of the two is ever drawn at a time */
function b5t2Card2(c, name, key, o) {
  const job = c.jobs[name], T = B5T2_N[name], v = job.view(true), stopping = !!job.cancelAt;
  const cancel = h("button", { class: "b5t2-mini" + (stopping ? " stopping" : "") + b5t2Pressed(c.ctx, key), "data-stop": "", "data-k": key, "data-label": o.help ? o.helpLabel : null, "data-help": o.help || null },
    b5t2Ic("x"), stopping ? "Stopping" : "Cancel", stopping ? null : h("i", { class: "b5t2-key" }, "X"));
  cancel.addEventListener("click", b5t2Wrap(c.ctx, key, o.onAct));
  const card = h("div", { class: "b5t2-card" },
    h("div", { class: "b5t2-ch", "data-face": name }, h("span", { class: "b5t2-ct" }, stopping ? T.stop : T.run), cancel),
    h("div", { class: "b5t2-bar" }, h("span", { class: "b5t2-fill" + (v.ind ? " ind" : ""), "data-fill": "", "data-job": name, style: v.ind ? null : `width:${v.frac * 100}%` })),
    h("div", { class: "b5t2-zone" },
      h("div", { class: "b5t2-z1", "data-job": name, "data-live": "l1" }, v.l1),
      h("div", { class: "b5t2-z2", "data-job": name, "data-live": "l2" }, v.l2),
      h("div", { class: "b5t2-z3" }, B5T2_SITE[name])));
  const note = h("div", { class: "b5t2-away" }, b5t2Spin(), h("span", {}, T.run + " · in the bar below"));
  return h("div", { class: "b5t2-cw", "data-cw": name }, card, note);
}

/* the lines under the buttons when no job runs: the result (the same sentence the bar uses) and the sites */
function b5t2Zone2(c, name, idleText) {
  const j = c.jobs[name], R = B5T2_RES[name], kids = [], ended = ["done", "failed", "cancelled"].includes(j.phase);
  if (j.phase === "done") kids.push(h("div", { class: "b5t2-z1 ok" }, "✓ " + R.done));
  else if (j.phase === "failed") kids.push(h("div", { class: "b5t2-z1 bad" }, R.failed));
  else if (j.phase === "cancelled") kids.push(h("div", { class: "b5t2-z1 mute" }, R.cancelled));
  else if (idleText) kids.push(h("div", { class: "b5t2-z2" }, idleText));
  kids.push(h("div", { class: "b5t2-z3" }, B5T2_SITE[name]));
  return h("div", { class: "b5t2-zone", "data-face": ended ? name : null }, ...kids);
}

/* one bar for one job: the title, the facts line, the count chip when two jobs want the bar, Cancel with its key */
function b5t2R2Bar(c, s, more, isX) {
  const name = s.name, job = c.jobs[name], T = B5T2_N[name], ctx = c.ctx;
  const bar = h("div", { class: "b5t2-wb", "data-bar": name });
  if (s.kind === "res") {
    const ph = s.phase, ok = ph === "done", sentence = B5T2_RES[name][ph];
    bar.classList.add("res", ok ? "okk" : ph === "failed" ? "bad" : "mute");
    bar.append(h("div", { class: "b5t2-wr1" }, h("span", { class: "b5t2-wi" }, b5t2Ic(ok ? "check" : "x")), h("span", { class: "b5t2-wtt" }, T.noun + (ok ? " finished" : ph === "failed" ? " failed" : " cancelled"))), h("div", { class: "b5t2-wr2", title: sentence }, sentence));
    return bar;
  }
  const v = job.view(true), stopping = !!job.cancelAt, key = "bar:" + name, row = "bar" + name;
  const x = h("button", { class: "b5t2-mini compact" + (stopping ? " stopping" : "") + b5t2Pressed(ctx, key), "data-stop": "", "data-k": key, "data-row": row, "data-label": name === "ollama" ? "Update AI & models" : null, "data-help": name === "ollama" ? B5T2_HELP_BUSY : null },
    stopping ? "Stopping" : "Cancel", stopping || !isX ? null : h("i", { class: "b5t2-key" }, "X"));
  x.addEventListener("click", b5t2Wrap(ctx, key, () => job.cancel()));
  let chip = null;
  if (more > 0) {
    chip = h("button", { class: "b5t2-more" + b5t2Pressed(ctx, "barmore"), "data-stop": "", "data-k": "barmore", "data-row": row, "data-label": "Two jobs are running", "data-help": "The bar shows one at a time. A switches it to the other job." }, more + " jobs");
    chip.addEventListener("click", b5t2Wrap(ctx, "barmore", () => { const names = c.list.map((l) => l.name), i = names.indexOf(c.shown[0].name); c.st.pin = names[(i + 1) % names.length]; c.sync({ settle: true }); }));
  }
  bar.append(
    h("div", { class: "b5t2-wr1" }, b5t2Spin(), h("span", { class: "b5t2-wtt" }, stopping ? T.stop : T.run), chip, x),
    h("div", { class: "b5t2-wr2", "data-job": name, "data-live": "bar" }, b5t2BarLine(name, v)),
    h("div", { class: "b5t2-bar" }, h("span", { class: "b5t2-fill" + (v.ind ? " ind" : ""), "data-fill": "", "data-job": name, style: v.ind ? null : `width:${v.frac * 100}%` })));
  return bar;
}

/* the engine: one panel, the jobs, the bar at the bottom edge and the rule for when it shows.
   mk(c) gives the drawing its pieces: names, start, rule(), home(), fallback(), build(), preset(), after(), tabbar() */
function b5t2R2Shell(mk, preset) {
  const ctx = { press: null }, forced = (preset && preset.force) || "";
  const st = { res: {}, prev: {}, from: "", pin: null, mode: "count", barSig: null, target: null, smoothUntil: 0, raf: 0, tm: 0, busy: false };
  const c = { ctx, st, jobs: {}, forced, list: [], shown: [] };
  const cfg = mk(c);
  Object.assign(st, cfg.init || {}); st.from = cfg.start;
  const holder = h("div", { style: "display:contents" });
  const root = deckFrame({ body: holder, header: false });
  root.classList.add("dt", "b5t2", "b5t2-r2", "b5t2-" + cfg.cls);
  const sc = h("div", { class: "dt-scroll scroll" });
  const strip = h("div", { class: "k-strip" });
  const dock = h("div", { class: "b5t2-dock2" });
  const tabHost = h("div", { style: "display:contents" });
  holder.append(tabHost, h("div", { class: "k2-gap" }), sc, dock);
  Object.assign(c, { root, sc, dock, strip });
  cfg.names.forEach((n) => { c.jobs[n] = new B5T2Job(n, (k) => onJob(n, k)); });
  c.render = (k) => render(k); c.sync = (o) => sync(o);

  const scale = () => { const q = $(".qam", root), hh = q.offsetHeight; return hh ? q.getBoundingClientRect().height / hh : 1; };

  function onJob(n, k) {
    if (k === "tick") { b5t2Paint2(root, c.jobs); return; }
    const ph = c.jobs[n].phase, was = st.prev[n]; st.prev[n] = ph;
    if (["done", "failed", "cancelled"].includes(ph)) { if (was !== ph) st.res[n] = { phase: ph, at: Date.now() }; } else delete st.res[n];
    render(k);
    cfg.after && cfg.after(c, n, k);
  }

  /* is this job's face (the card header, or the result lines) really on screen, clear of the strip? */
  function seen(n) {
    if (forced) return forced !== "bar";
    const el = $(`[data-face="${n}"]`, sc);
    if (!el || el.closest(".away")) return false;
    const r = el.getBoundingClientRect(), s = sc.getBoundingClientRect(), sh = strip.getBoundingClientRect().height;
    if (!r.width || !r.height) return false;
    return r.top >= s.top - 0.5 && r.bottom <= s.bottom - sh + 0.5;
  }
  const needBar = (n) => (forced ? forced === "bar" : cfg.rule(c) === "leave" ? !cfg.home(c, n) : !seen(n));

  function sync(o = {}) {
    if (st.busy) return;
    st.busy = true;
    try {
      const rule = cfg.rule(c);
      const run = cfg.names.filter((n) => c.jobs[n].phase === "running" && needBar(n)).sort((a, b) => c.jobs[b].startAt - c.jobs[a].startAt).map((n) => ({ name: n, kind: "run" }));
      let list = run;
      if (!run.length) {
        list = [];
        for (const n of cfg.names) {
          const r = st.res[n];
          if (!r || c.jobs[n].phase === "running") continue;
          if (forced || !needBar(n)) { delete st.res[n]; continue; }
          if (r.phase !== "failed" && Date.now() - r.at > B5T2_RES_MS) { delete st.res[n]; continue; }
          list.push({ name: n, kind: "res", phase: r.phase, at: r.at });
        }
        list.sort((a, b) => b.at - a.at);
      }
      const timed = list.filter((l) => l.kind === "res" && l.phase !== "failed");
      clearTimeout(st.tm);
      if (timed.length) st.tm = setTimeout(() => sync({}), Math.max(60, B5T2_RES_MS - (Date.now() - Math.min(...timed.map((l) => l.at))) + 60));
      let shown = list, more = 0;
      if (list.length > 1) {
        if (st.mode === "newest") shown = [list[0]];
        else if (st.mode === "stack") shown = list.slice(0, 2).reverse();
        else { const i = Math.max(0, list.findIndex((x) => x.name === st.pin)); shown = [list[i]]; more = list.length; }
      }
      c.list = list; c.shown = shown;
      $$("[data-cw]", sc).forEach((el) => el.classList.toggle("away", rule === "leave" && run.some((r) => r.name === el.dataset.cw)));
      const cur = Deck.current(root), onBar = !!(cur && dock.contains(cur)), before = dock.offsetHeight;
      const sig = shown.map((s) => [s.name, s.kind, s.phase || "", c.jobs[s.name].cancelAt ? "x" : ""].join(":")).join("|") + "#" + more;
      if (sig !== st.barSig) {
        st.barSig = sig;
        const key = onBar ? cur.dataset.k : null;
        dock.replaceChildren(strip, ...shown.map((s, i) => b5t2R2Bar(c, s, i === shown.length - 1 ? more : 0, i === shown.length - 1)));
        if (onBar) {
          let el = key && $(`[data-k="${key}"]`, dock);
          if (!el || !Deck.stops(root).includes(el)) { el = $(`[data-k="${st.from}"]`, sc); if (!el || !Deck.stops(root).includes(el)) el = $(`[data-k="${cfg.fallback(c)}"]`, sc); }
          if (el) Deck.setRing(root, el, { scroll: false });
        }
      }
      const dockH = dock.offsetHeight;
      sc.style.paddingBottom = dockH + 18 + "px";
      if (o.settle || dockH !== before) settle();
    } finally { st.busy = false; }
    root.dispatchEvent(new Event("b5t2render"));
  }

  /* keep the ring clear of the bar and the strip (the board's own reveal only knows the panel's edge) */
  function settle() {
    const el = Deck.current(root);
    if (!el || !sc.contains(el)) return;
    const z = scale(), er = el.getBoundingClientRect(), sr = sc.getBoundingClientRect(), dr = dock.getBoundingClientRect();
    const top = sr.top, bottom = dr.height ? Math.min(sr.bottom, dr.top) : sr.bottom, pad = 8;
    let dy = 0;
    if (er.height > bottom - top - pad * 2) dy = er.top - top - pad;
    else if (er.bottom > bottom - pad) dy = er.bottom - bottom + pad;
    else if (er.top < top + pad) dy = er.top - top - pad;
    if (Math.abs(dy) < 1) return;
    const t = Math.max(0, Math.min(sc.scrollHeight - sc.clientHeight, sc.scrollTop + dy / z));
    st.target = t; st.smoothUntil = Date.now() + 500;
    sc.scrollTo({ top: t, behavior: b5t2Reduce() ? "auto" : "smooth" });
  }

  function showStrip() {
    const cur = Deck.current(root);
    strip.innerHTML = cur && cur.dataset.help ? `<span class="k-strip-l">${cur.dataset.label || ""}</span>${cur.dataset.help}` : "";
  }

  function render(kind) {
    const cur = Deck.current(root), key = cur && cur.dataset.k, onBar = !!(cur && dock.contains(cur)), top = sc.scrollTop;
    if (cfg.tabbar) tabHost.replaceChildren(cfg.tabbar(c));
    sc.replaceChildren(...cfg.build(c));
    sc.scrollTop = st.newTab ? 0 : top; st.newTab = false;
    if (st.target != null && Date.now() < st.smoothUntil) sc.scrollTo({ top: st.target, behavior: "smooth" });
    if (key && !onBar) {
      let el = $(`[data-k="${key}"]`, sc);
      if (!el || !Deck.stops(root).includes(el)) el = $(`[data-k="${cfg.fallback(c)}"]`, sc);
      if (el) Deck.setRing(root, el, { scroll: false });
    } else if (!key) showStrip();
    sync({ settle: !!key });
  }

  root.addEventListener("ringmove", (e) => {
    const el = e.detail && e.detail.el;
    if (el && !dock.contains(el) && el.dataset.k) st.from = el.dataset.k;
    showStrip(); sync({ settle: true });
  });
  root.addEventListener("deckkey", (e) => {
    if (e.detail.key !== "X") return;
    const n = c.shown.length ? c.shown[c.shown.length - 1].name : null;
    const run = Object.values(c.jobs).filter((j) => j.phase === "running").sort((a, b) => b.startAt - a.startAt);
    const target = n && c.jobs[n].phase === "running" ? c.jobs[n] : run[0];
    if (target) { e.preventDefault(); b5t2Wrap(ctx, "bar:" + target.name, () => target.cancel())({}); }
  });
  root.addEventListener("keydown", (e) => { cfg.key && cfg.key(c, e); });
  root.addEventListener("b5t2show", () => sync({}));
  sc.addEventListener("scroll", () => { if (st.raf) return; st.raf = requestAnimationFrame(() => { st.raf = 0; sync({}); }); });

  if (preset) cfg.preset && cfg.preset(c, preset);
  tabHost.replaceChildren(...(cfg.tabbar ? [cfg.tabbar(c)] : []));
  sc.replaceChildren(...cfg.build(c));
  sync({});
  const start = $(`[data-k="${cfg.start}"]`, root); start && start.setAttribute("data-start", "");
  root.scroller = sc; root.b5t2 = c;
  return root;
}

/* ---------- 2A and 2B: the Ollama section ---------- */
function b5t2R2Ollama(variant, preset) {
  return b5t2R2Shell((c) => {
    const st = c.st, leave = variant === "2A";
    let tt = 0;
    const runTest = () => {
      if (st.test === "testing") return;
      st.test = "testing"; c.render();
      clearTimeout(tt);
      tt = setTimeout(() => { st.test = st.testResult; st.testPrev = st.testResult; c.render(); }, 1400);
    };
    c.setTest = (k) => {
      clearTimeout(tt);
      if (k === "idle") { st.test = "idle"; st.testPrev = null; } else if (k === "testing") st.test = "testing"; else { st.test = k; st.testPrev = k; st.testResult = k; }
      c.render();
    };
    c.setOpen = (v) => { st.open = v; c.render(); };
    c.setModels = (v) => { st.models = v; c.render(); };
    c.go = (k) => { const el = $(`[data-k="${k}"]`, c.root); if (el && Deck.stops(c.root).includes(el)) Deck.setRing(c.root, el); };
    const foldLine = (label, summary, open, key, fn) => {
      const b = h("button", { class: "k-fold" + (open ? " open" : ""), "data-stop": "", "data-k": key }, h("span", { class: "k-ft" }, label), h("span", { class: "k-fs" }, summary), h("span", { class: "k-fc" }, open ? "▾" : "▸"));
      if (fn) b.addEventListener("click", fn);
      return b;
    };
    const swRow = (key, label, on, help, fn) => {
      const b = h("button", { class: "k-row", "data-stop": "", "data-k": key, "data-label": label, "data-help": help }, h("span", { class: "k-l" }, label), h("span", { class: "k-sw" + (on ? " on" : "") }));
      b.addEventListener("click", fn);
      return b;
    };
    const onAct = () => { const j = c.jobs.ollama; if (j.phase !== "running") j.start(); else if (Date.now() - j.startAt > 600) j.cancel(); };
    const setupBlock = () => {
      const job = c.jobs.ollama, run = job.phase === "running";
      const kids = [h("div", { class: "b5t2-lbl" }, "Local Ollama setup", h("span", {}, "Installed: 7"))];
      if (run) kids.push(b5t2Card2(c, "ollama", "act", { onAct, helpLabel: "Update AI & models", help: B5T2_HELP_BUSY }));
      else kids.push(
        b5t2JobBtn(c.ctx, { job, key: "act", onAct, idle: "Update AI & models", icon: "refresh", cancel: "", helpLabel: "Update AI & models" }),
        h("button", { class: "b5t2-btn alt", "data-stop": "", "data-k": "browse" }, [h("span", {}, "Browse models"), b5t2Ic("chev")]),
        b5t2Zone2(c, "ollama", B5T2_IDLE_HINT));
      return h("div", { class: "b5t2-setup" }, ...kids);
    };
    const testBlock = () => {
      const t = st.test;
      const m = { idle: ["", "Not tested yet: A tests it", "127.0.0.1:11434"], testing: ["busy", "Checking the connection", "127.0.0.1:11434"], ok: ["ok", "Connected to this Deck's AI", "Ollama v0.34.1 · 7 models · 127.0.0.1:11434"], bad: ["bad", "Not reachable: Test again", "Could not connect to 127.0.0.1:11434"] }[t];
      const live = h("button", { class: "b5t2-live" + b5t2Pressed(c.ctx, "test"), "data-stop": "", "data-k": "test" },
        h("span", { class: "b5t2-dot " + m[0] }), h("span", { class: "b5t2-lt" }, h("div", { class: "b5t2-l1" }, m[1]), h("div", { class: "b5t2-l2" }, m[2])),
        t === "testing" ? b5t2Spin() : h("span", { class: "b5t2-re", html: svg2(B5T2_PATHS.refresh) }));
      live.addEventListener("click", b5t2Wrap(c.ctx, "test", runTest));
      return h("div", { class: "b5t2-testblk" }, live);
    };
    return {
      cls: variant, names: ["ollama"], start: "act",
      init: { open: true, models: false, autostart: true, test: "ok", testPrev: "ok", testResult: "ok" },
      rule: () => (leave ? "leave" : "seen"),
      home: (cc) => { const r = Deck.current(cc.root); return cc.st.open && (!r || !!r.closest("[data-home]")); },
      fallback: (cc) => (cc.st.open ? "act" : "f0"),
      build: (cc) => {
        const sw1 = swRow("sw1", "Run AI on this Deck", true, B5T2_HELP.runOnDeck, () => {});
        const sw2 = swRow("sw2", "Start the AI with the Deck", st.autostart, B5T2_HELP.autostart, () => { st.autostart = !st.autostart; cc.render(); });
        const f0 = foldLine("Where AI runs", `Run AI on this Deck on · Start the AI with the Deck ${st.autostart ? "on" : "off"}`, st.open, "f0", () => cc.setOpen(!st.open));
        f0.setAttribute("data-home", "");
        const out = [f0];
        if (st.open) out.push(h("div", { class: "k-foldbody", "data-home": "" }, sw1, h("div", { class: "k-item" }, sw2, h("div", { class: "k-line" }, st.autostart ? "Set up and answering questions." : "")), setupBlock(), testBlock()));
        B5T2_FOLDS.forEach(([n, s], i) => {
          if (i < 3) { out.push(foldLine(n, s, false, "f" + (i + 1))); return; }
          out.push(foldLine(n, st.models ? "example list" : s, st.models, "f4", () => cc.setModels(!st.models)));
          if (st.models) out.push(h("div", { class: "k-foldbody" }, ...B5T2_R2_MODELS.map(([tag, size], j) => h("button", { class: "k-row", "data-stop": "", "data-k": "m" + (j + 1) }, h("span", { class: "k-l" }, tag), h("span", { class: "k-v" }, b5t2Gb(size))))));
        });
        return out;
      },
      preset: (cc, p) => {
        cc.jobs.ollama.set(p.phase === "running" ? "held" : p.phase || "idle");
        st.test = p.test || "idle"; st.testPrev = st.test === "ok" || st.test === "bad" ? st.test : null; if (st.test === "bad") st.testResult = "bad";
        if (p.open === false) st.open = false;
      },
      after: (cc, n, k) => { if (k === "end" && cc.jobs.ollama.phase === "done") setTimeout(runTest, 300); },
    };
  }, preset);
}

/* ---------- 2K: the library download and the voice install, one bar shared ---------- */
function b5t2R2Also(preset) {
  return b5t2R2Shell((c) => {
    const st = c.st;
    c.setTab = (n) => { st.tab = n; st.newTab = true; c.render(); };
    c.setMode = (m) => { st.mode = m; st.pin = null; c.sync({ settle: true }); };
    c.go = (k) => { const el = $(`[data-k="${k}"]`, c.root); if (el && Deck.stops(c.root).includes(el)) Deck.setRing(c.root, el); };
    const act = (j) => () => { if (j.phase !== "running") j.start(); else if (Date.now() - j.startAt > 600) j.cancel(); };
    const fold = (label, summary, key, open = true) => h("button", { class: "k-fold" + (open ? " open" : ""), "data-stop": "", "data-k": key }, h("span", { class: "k-ft" }, label), h("span", { class: "k-fs" }, summary), h("span", { class: "k-fc" }, open ? "▾" : "▸"));
    const kbBlock = () => {
      const j = c.jobs.kb, run = j.phase === "running", done = j.phase === "done";
      const status = h("div", { class: "b5t2-info sm" }, h("span", { class: "b5t2-ok" }, "Installed"), ` — version ${done ? "2026.11.14" : "2026.09.27"}`, h("br"), h("span", { style: "color:#6b7c90" }, "~/.bonsai/rag/library"));
      const main = run ? b5t2Card2(c, "kb", "kb", { onAct: act(j) })
        : h("div", { class: "b5t2-pair" }, b5t2JobBtn(c.ctx, { job: j, key: "kb", onAct: act(j), idle: "Update knowledge base", icon: "refresh", cancel: "", cls: "glass big" }), h("button", { class: "b5t2-btn red small", "data-stop": "", "data-k": "kbremove" }, "Remove"));
      return h("div", { class: "b5t2-blk b5t2-kbblk" }, status, main, run ? null : b5t2Zone2(c, "kb"));
    };
    const voiceBlock = () => {
      const j = c.jobs.voice, run = j.phase === "running", ready = j.phase === "done";
      const lines = h("div", { class: "b5t2-info" }, `Engine: ${ready ? "whisper-cli ready" : "whisper-cli not installed"}`, h("br"), `Model: ${ready ? "base.en ready" : "base.en not downloaded"}`, ready ? [h("br"), "Voice engine is ready for on-device transcription."] : !run ? [h("br"), "Tap Install voice engine below (uses podman on SteamOS)."] : null);
      const main = run ? b5t2Card2(c, "voice", "voice", { onAct: act(j) })
        : b5t2JobBtn(c.ctx, { job: j, key: "voice", onAct: act(j), idle: ready ? "Reinstall voice engine" : "Install voice engine", icon: "dl", cancel: "", cls: "glass voice" });
      return h("div", { class: "b5t2-blk b5t2-vblk" }, lines, main, run ? null : b5t2Zone2(c, "voice"));
    };
    return {
      cls: "K", names: ["kb", "voice"], start: "kb", init: { tab: 1, newTab: false },
      rule: () => "seen", home: () => true,
      fallback: (cc) => ({ 1: "kb", 2: "voice" }[cc.st.tab] || "other"),
      tabbar: (cc) => {
        const bar = tabBar2(cc.st.tab);
        $$(".k2-tb", bar).forEach((el, i) => { el.style.cursor = "pointer"; el.addEventListener("click", () => cc.setTab(i)); });
        return bar;
      },
      key: (cc, e) => { if (e.key === "]" || e.key === "[") { e.preventDefault(); cc.setTab((cc.st.tab + (e.key === "]" ? 1 : 5)) % 6); } },
      build: (cc) => {
        if (st.tab === 1) return [fold("Where AI runs", "Run AI on this Deck on", "g0", false), fold("Knowledge base (offline)", "Use local knowledge base on", "f1"), kbBlock(), ...B5T2_FOLDS.slice(1).map(([n, s], i) => fold(n, s, "f" + (i + 2), false))];
        if (st.tab === 2) return [fold("Voice input", "STT model base.en", "f5"), voiceBlock(), fold("Other settings", "", "f6", false)];
        return [h("div", { class: "b5t2-cap" }, "Any other tab"), h("button", { class: "k-row", "data-stop": "", "data-k": "other" }, h("span", { class: "k-l" }, "A row on another tab")), h("p", { class: "b5t2-note2" }, "Nothing here is drawn. It stands for any tab with no job of its own.")];
      },
      preset: (cc, p) => {
        for (const n of ["kb", "voice"]) cc.jobs[n].set(p[n] === "running" ? "held" : p[n] || "idle");
        if (p.tab) st.tab = p.tab;
        if (p.mode) st.mode = p.mode;
      },
    };
  }, preset);
}

/* ---------- the numbers under a panel: measured from the drawing itself ---------- */
function b5t2R2Box(root, statics) {
  const box = h("div", { style: "display:grid;gap:4px" });
  let t = 0;
  const draw = () => {
    t = 0;
    const c = root.b5t2, q = $(".qam", root), qh = q.offsetHeight, kids = [];
    statics().forEach((line) => kids.push(h("p", { class: "d-measure" }, ...line)));
    if (!qh || !c.sc.offsetHeight) kids.push(h("p", { class: "d-measure" }, "The live numbers show once this tab is open."));
    else {
      const z = q.getBoundingClientRect().height / qh, px = (n) => Math.round(n / z);
      const bars = $$(".b5t2-wb", c.dock), br = bars.map((b) => b.getBoundingClientRect()), sr = c.sc.getBoundingClientRect(), dr = c.dock.getBoundingClientRect(), tr = c.strip.getBoundingClientRect();
      const barH = br.reduce((s, r) => s + r.height, 0);
      const overlap = tr.height ? br.reduce((s, r) => s + Math.max(0, Math.min(tr.bottom, r.bottom) - Math.max(tr.top, r.top)), 0) : 0;
      kids.push(h("p", { class: "d-measure" }, "Right now:", bars.length ? [` the bar is `, h("b", {}, px(barH) + " px"), bars.length > 1 ? " (two stacked)," : ","] : " no bar,", ` the help strip is `, tr.height ? h("b", {}, px(tr.height) + " px") : "not showing", ` · together `, h("b", {}, px(dr.height) + " of " + qh + " px"), ` · bar and strip overlap by `, h("b", {}, px(overlap) + " px")));
      const ring = Deck.current(root), rr = ring && ring.getBoundingClientRect();
      const under = $$("[data-stop]", c.sc).filter((el) => { const r = el.getBoundingClientRect(); return dr.height && r.width && r.bottom > dr.top + 1 && r.top < dr.bottom; }).map((el) => ((el.querySelector(".k-ft, .k-l") || el).textContent.trim().slice(0, 22)) + (el.getBoundingClientRect().top < dr.top ? " (part)" : " (all)"));
      const stops = Deck.stops(root).filter((el) => c.sc.contains(el)), last = stops[stops.length - 1];
      const lastGap = last ? (c.sc.scrollHeight - dr.height / z) - ((last.getBoundingClientRect().bottom - sr.top) / z + c.sc.scrollTop) : 0;
      kids.push(h("p", { class: "d-measure" },
        ring && c.sc.contains(ring) ? ["The ring is ", h("b", {}, rr.bottom <= (dr.height ? dr.top : sr.bottom) ? "clear of them" : "UNDER them")] : (ring ? "The ring is on the bar." : "No ring yet."),
        ` · under them right now: `, h("b", {}, under.length ? under.join(", ") : "nothing"),
        ` · scrolled all the way down, the last row ends `, h("b", {}, px(lastGap) + " px"), ` above the bar`));
    }
    box.replaceChildren(...kids);
  };
  const later = () => { if (!t) t = setTimeout(draw, 60); };
  b5t2Ready(draw);
  root.addEventListener("b5t2render", later);
  return box;
}

/* ---------- the steppers and cards for the three new options ---------- */
function b5t2R2OllamaCard(variant) {
  return () => {
    const root = b5t2R2Ollama(variant), c = root.b5t2, job = c.jobs.ollama, st = c.st;
    const ringIs = (k) => () => { const r = Deck.current(root); return !!r && r.dataset.k === k; };
    const steps = b5t2Steps(root, [
      { name: "Install:", chips: [["Idle", () => job.set("idle"), () => job.state() === "idle"], ["Installing (live)", () => job.set("live"), () => job.state() === "live"], ["Installing (held)", () => job.set("held"), () => job.state() === "held"], ["Finished", () => job.set("done"), () => job.state() === "done"], ["Failed", () => job.set("failed"), () => job.state() === "failed"], ["Cancelled", () => job.set("cancelled"), () => job.state() === "cancelled"]] },
      { name: "Test connection:", chips: [["Idle", () => c.setTest("idle"), () => st.test === "idle"], ["Testing", () => c.setTest("testing"), () => st.test === "testing"], ["Connected", () => c.setTest("ok"), () => st.test === "ok"], ["Not reachable", () => c.setTest("bad"), () => st.test === "bad"]] },
      { name: "Where AI runs:", chips: [["Open", () => c.setOpen(true), () => st.open], ["Folded shut", () => c.setOpen(false), () => !st.open]] },
      { name: "AI models (a short example list):", chips: [["Closed", () => c.setModels(false), () => !st.models], ["Open", () => c.setModels(true), () => st.models]] },
      { name: "Put the ring on:", chips: [["The card or Update", () => { c.go("f0"); c.go("act"); }, ringIs("act")], ["Knowledge base (just below)", () => c.go("f1"), ringIs("f1")], ["AI models", () => c.go("f4"), ringIs("f4")]] },
    ]);
    const mk = (v) => (s) => b5t2R2Ollama(v, { phase: s.phase, test: s.test, force: "card" });
    const today = (v) => (s) => b5t2Panel(v, { phase: s.phase, test: s.test });
    const rows = [
      { title: "The install area, in the Deck's own pixels:", key: "r2" + variant + "|setup", make: mk(variant), sel: ".b5t2-setup", states: B5T2_OL_STATES, base: { key: "today|setup", make: today("today") }, live: true },
      { title: "The connection line:", key: "r2" + variant + "|test", make: mk(variant), sel: ".b5t2-testblk", states: B5T2_TEST_STATES, base: { key: "today|test", make: today("today") } },
    ];
    const one = (force, sel) => b5t2Sizes("r2" + variant + "|" + force + sel, () => b5t2R2Ollama(variant, { phase: "running", force }), sel, [{ k: "x" }]).x;
    const facts = b5t2R2Box(root, () => {
      const bar = one("bar", ".b5t2-wb"), card = one("card", ".b5t2-card");
      if (variant === "2A") { const line = one("bar", ".b5t2-away"); return [["A bar on its own is ", h("b", {}, bar + " px"), " tall. The card is ", h("b", {}, card + " px"), "; folded to its one-line note it is ", h("b", {}, line + " px"), h("span", { class: "vs" }, `(the list below moves up ${card - line} px each time you leave, and down again when you come back)`)]]; }
      return [["A bar on its own is ", h("b", {}, bar + " px"), " tall. The card is ", h("b", {}, card + " px"), "; it never folds, so nothing below it moves when the bar comes or goes."]];
    });
    const note = h("p", { class: "b5t2-note" }, "Model names, sizes and the failure sentence are examples. Everything else is the code's own wording. Where AI runs can be folded shut here, and AI models can open on a short list of the example models, so there is something to walk down into. The other sections stay closed.");
    return [root, steps, b5t2Readout(rows, root), facts, note];
  };
}

function b5t2R2AlsoCard() {
  return () => {
    const root = b5t2R2Also(), c = root.b5t2, { kb, voice } = c.jobs, st = c.st;
    const chips = (j) => [["Idle", () => j.set("idle"), () => j.state() === "idle"], ["Running (live)", () => j.set("live"), () => j.state() === "live"], ["Running (held)", () => j.set("held"), () => j.state() === "held"], ["Finished", () => j.set("done"), () => j.state() === "done"], ["Failed", () => j.set("failed"), () => j.state() === "failed"], ["Cancelled", () => j.set("cancelled"), () => j.state() === "cancelled"]];
    const steps = b5t2Steps(root, [
      { name: "You are on:", chips: [["Ollama tab (library)", () => c.setTab(1), () => st.tab === 1], ["Settings tab (voice)", () => c.setTab(2), () => st.tab === 2], ["Another tab", () => c.setTab(3), () => st.tab === 3]] },
      { name: "Library download:", chips: chips(kb) },
      { name: "Voice install:", chips: chips(voice) },
      { name: "Two jobs at once, the bar shows:", chips: [["One bar and a count", () => c.setMode("count"), () => st.mode === "count"], ["Both bars stacked", () => c.setMode("stack"), () => st.mode === "stack"], ["Only the newest", () => c.setMode("newest"), () => st.mode === "newest"]] },
      { name: "Quick set-up:", chips: [["Both running, on another tab", () => { kb.set("held"); voice.set("held"); c.setTab(3); }, () => kb.state() === "held" && voice.state() === "held" && st.tab === 3]] },
    ]);
    const mk = (which, tab) => (s) => b5t2R2Also({ [which]: s.phase, tab, force: "card" });
    const rows = [
      { title: "The library area (Ollama tab):", key: "r2K|kb", make: mk("kb", 1), sel: ".b5t2-kbblk", states: B5T2_R2_STATES, live: true },
      { title: "The voice area (Settings tab):", key: "r2K|voice", make: mk("voice", 2), sel: ".b5t2-vblk", states: B5T2_R2_STATES, live: true },
    ];
    const bars = (mode, sel) => b5t2Sizes("r2K|bars|" + mode + sel, () => b5t2R2Also({ kb: "running", voice: mode === "one" ? "idle" : "running", tab: 3, mode: mode === "stack" ? "stack" : "count", force: "bar" }), sel, [{ k: "x" }]).x;
    const facts = b5t2R2Box(root, () => [["One bar is ", h("b", {}, bars("one", ".b5t2-dock2") + " px"), " tall, with or without the “2 jobs” chip. Two bars stacked are ", h("b", {}, bars("stack", ".b5t2-dock2") + " px"), "; the help strip sits on top of whichever it is."]]);
    const note = h("p", { class: "b5t2-note" }, "Two tabs, one panel. [ and ] stand in for the shoulder buttons that change tab. The closed sections around the two jobs are only there to give the ring somewhere to walk. Sizes and the failure sentences are examples.");
    return [root, steps, b5t2Readout(rows, root), facts, note];
  };
}

/* ---------- round 2 goes above round 1 ---------- */
const B5T2_R2_OPTIONS = [
  { id: "2A", group: "r2", groupTitle: "Round 2: the three you liked, as one look", label: "A", title: "The card, the live line and a bar that follows you, with the bar shown whenever you leave",
    desc: "Press A on Update and the buttons give way to one small card: what is downloading, how far, how fast, the sites it comes from, and Cancel at its top right. The ring goes to that Cancel on the same press, level with where Update was, so it never jumps or goes missing. Test connection is the live status line, one height in every state, and the ring stays on it through the check. Walk away while the job runs (down into another section, or fold this section shut) and the card shrinks to one line while a small bar appears at the bottom with the same words and its own Cancel. The ring stays on the row you moved to. Come back and the bar goes and the card is whole again. X cancels from anywhere. The bar sits under the help strip, not over it, and the ring is kept clear of both. When the job ends the bar goes (after a few seconds, if it has a result to show); a ring on the card's Cancel moves to Update, and a ring on the bar's Cancel returns to the row it came from.",
    build: b5t2R2OllamaCard("2A") },
  { id: "2B", group: "r2", label: "B", title: "The same, with the bar shown only when the card cannot be seen",
    desc: "The same card, the same live line, the same bar. The one difference is when the bar comes: only while the card is out of sight, because this section is folded shut or the card has scrolled off the screen. Walk down into the next section while the card is still on screen and nothing changes: the card stays whole, no bar, and nothing below it moves. So A changes the screen every time you leave; B only when it must. The ring is where it is in A at every step: on Cancel when the job starts, on Update when it ends, never on nothing.",
    build: b5t2R2OllamaCard("2B") },
  { id: "2K", group: "r2", label: "Elsewhere", title: "The same look on the library download and the voice install, with one bar shared",
    desc: "The library download (on the Ollama tab) and the voice engine install (on the Settings tab) get the same card, with the sites they come from. The voice install gets its first Cancel. Leave a tab while a job runs and the bar appears for it; come back and the bar goes and the card is there. This uses B's rule (the bar only when the card cannot be seen). There is only ever one bar. With two jobs at once, it shows the newest and a “2 jobs” chip: press A on the chip to switch to the other. The two other ways are one press away on the chips below: both bars stacked, or the newest only (the older job then has no sign of itself until you go back to its tab). X cancels the job on the bar. The ring is where it is in A and B at every step.",
    build: b5t2R2AlsoCard() },
];
(() => {
  const t = TABS.find((x) => x.id === "t2");
  t.title = "The Ollama tab, round 2: the card, the live line and the bar, as one look";
  t.today = [
    "Round 1: you liked B (one small job card in place of the buttons), C (Test connection as a live status line), Wild (a small bar that follows you) and “B, elsewhere” (the same card for the library download and the voice install). Asked which to build, you said: “All three together.”",
    "Round 2 draws the three as one look. It asks two things: does it feel crowded, and when should the bar appear.",
    ...t.today,
  ];
  t.deciding = [
    "Does one card, one status line and one bar feel crowded on a panel this small?",
    "When the bar appears: every time you walk away from the section (A), or only when the card cannot be seen (B).",
    "With two jobs at once, the bar can show a count, stack both, or show only the newest (the third drawing).",
    "Whether the raw installer lines may leave the tab. Every drawing hides them.",
  ];
  t.howto = "Click a panel, then use the arrow keys; Enter is A and X cancels. Press A on Update AI & models: the card comes up and the ring is already on its Cancel. Press Down until the ring is in another section to see the bar (in A at once, in B only when the card is out of sight), or press A on the Where AI runs title to fold it shut. The buttons under a panel jump to any state, fold the section and put the ring where you want it. In the third drawing they also change tab. A job takes about ten seconds, and “held” freezes it so you can compare. The first switch is fixed on. Where AI runs folds shut, AI models opens on a short example list, and the other sections stay closed.";
  t.onShow = () => $$("#tab-t2 .deck").forEach((r) => { r.dispatchEvent(new Event("b5t2show")); r.dispatchEvent(new Event("b5t2render")); });
  t.options = [...B5T2_R2_OPTIONS, ...t.options.map((o) => (o.group === "main" ? { ...o, group: "r1", groupTitle: o.id === "today" ? "Round 1 (your picks are kept)" : undefined } : o))];
})();
