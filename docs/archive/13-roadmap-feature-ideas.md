# 13 — New Planned feature ideas (star-rated)

Answers question 13 in [roadmap-planning-questions.md](roadmap-planning-questions.md).
Nothing here re-rates or removes an existing roadmap row.

**Filed to [roadmap.md](../roadmap.md) § Planned on 2026-08-07** (docs only — no
implementation):

| Stub | Star | Horizon | Roadmap status |
|---|---|---|---|
| **A1** KB coverage chip | ★ | Near | Filed |
| **A2** Copy reply to clipboard | ★★ | Near | Filed 2026-08-09 |
| **A3** Permission jump | ★★ | Near | Filed |
| **B3** Connection doctor | ★★★★ | Medium | Filed **as a candidate** — merge-vs-standalone against **Deck health snapshot** still undecided |
| **C1** On-Deck model benchmark | ★★★★★ | Long | Filed |
| **C2** Community tip contribution | ★★★★★ | Long | Filed |
| **C3** In-game answer surface | ★★★★★★ | Long | Filed, with the ★★ toast-snippet slice called out inside it |

**Not filed, still proposals:** **B1** RPC contract gate, **B2** per-game
preference memory. (**A2** filed 2026-08-09 — spike-before-build still on the row.)

Stars follow the roadmap's GTA scale (`★` easiest … `★★★★★` very high;
`★★★★★★` extreme scope or upstream-gated) and are **effort/risk, not value**.

---

## 1. Inventory — what the current roadmap under-serves

Eight gaps. None of these is an open bug row or an existing Planned bullet.

1. **An answer cannot leave the Deck in Gaming Mode.** Clipboard support is
   read-only by construction: `read_host_clipboard_text` ([main.py:1976](../../main.py))
   → `clipboard_service.py`, whose header states *"Does not: Write to the
   clipboard"* ([clipboard_service.py:6](../../py_modules/backend/services/clipboard_service.py)),
   backed by `read_host_clipboard.sh` (wl-paste, then xclip). The only export
   path is Desktop notes, which need `filesystem_write` **and** a reboot into
   Desktop Mode to read (`desktop_note_service.py`, `~/Desktop/bonsAI_logs/`).
   When a reply hands the user a terminal command or a LAN URL, they retype it.

2. **A permission denial is a dead end.** Blocked actions produce copy like
   *"enable Media library access in Permissions"*
   ([MainTabScreenshotBrowser.tsx:123](../../src/components/MainTabScreenshotBrowser.tsx))
   but nothing navigates there — even though the shell already owns
   `setCurrentTab` ([useBonsaiPluginShell.ts:50](../../src/hooks/useBonsaiPluginShell.ts)).
   Per-capability first-use modals are listed as *not in scope (future)* in
   [roadmap-completed.md:215](../archive/roadmap-completed.md), so no recovery
   path was ever designed.

3. **"Does the KB cover my game?" is unanswerable from the UI.**
   `get_session_rag_chip_candidates` already returns
   `{ok: false, reason: "no_sections" | "app_unresolved"}` and the frontend
   deliberately treats that as *silently fall back to static seeds*
   ([archive/roadmap-bugs-fixed.md](../archive/roadmap-bugs-fixed.md)). The real ceiling is content — DRG Survivor
   has **2 sections against a per-game cap of 6** (same archive).
   A user cannot tell apart "KB off", "no corpus", "corpus has nothing for this
   game", and "the KB actually helped".

4. **Thumbs feedback is write-only.** `save_ask_feedback`
   ([main.py:1963](../../main.py)) appends JSONL via
   `feedback_service.append_ask_feedback`; that module exposes only
   `feedback_log_path` and `append_ask_feedback` — no reader, no RPC, no UI.
   The user pays a tap and gets nothing back; the maintainer gets no aggregate.

5. **Nothing prevents the class of bug that broke voice for two and a half
   weeks.** Both August failures — `VoiceTranscriptionSession.status()` deleted,
   and `get_reply_language_snapshot` missing an `await` — passed `tsc`, 263
   frontend tests, 418 Python tests and `npm run build`
   ([archive/roadmap-bugs-fixed.md](../archive/roadmap-bugs-fixed.md)). Python tests import services, not
   `class Plugin`; `fakeDeckyRpc.ts` stubs the very RPC the frontend calls.
   `scripts/probe_deck_rpc_surface.py` was kept, but it runs only when a human
   remembers, against a deployed Deck. [CLAUDE.md](../../CLAUDE.md) separately
   records that **nothing checks a `call()` name exists in `main.py`**.

6. **Preferences are global; play is per-game.** Mode, character, accent and
   spoiler masking are single-valued in `settings.json`. Only the strategy
   checklist is AppID-scoped (`get`/`save`/`clear_strategy_checklist_session`,
   [main.py:803-861](../../main.py)). Wanting Strategy + spoilers-off for one
   title and Speed for troubleshooting means re-toggling Settings every session.

7. **First-run failure has no guided path.** The probes exist and are each
   separately reachable — `test_ollama_connection` ([main.py:943](../../main.py)),
   `discover_mdns_ollama_hosts` (:1084), `start_local_ollama_setup` (:1129), the
   compat KB — but a new user whose first Ask fails gets a toast
   ([bonsaiReplyReadyToast.ts:59-73](../../src/utils/bonsaiReplyReadyToast.ts))
   and a docs link. [Q2 (README redesign)](02-readme-redesign-plan.md) found the
   same cliff from the docs side.

8. **No hardware-state awareness at all.** Grep finds zero battery or thermal
   reads in `src/` or `py_modules/` outside prompt copy; the only sysfs code is
   `find_amdgpu_hwmon` for TDP. A 4B model on a shared APU at 12% battery
   behaves nothing like one on the dock, and bonsAI neither knows nor says so.

---

## 2. Band A — ★–★★ (small, shippable; Near-term)

### A1. ★ **KB coverage chip** (Show details — corpus honesty)

- **Goal:** Tell the user in one chip whether the local knowledge base had
  anything for the game they are asking about.
- **Depends on:** shipped — session RAG chip candidates RPC (`ok` / `reason`
  payload already returned), Show details context ladder
  (`ensure_context_chips_on_snapshot`), existing transparency chip rendering.
- **Not in scope (v1):** per-topic section counts; a KB browser (explicitly out
  of scope in **RAG Phase 7**); changing retrieval, ranking or chip policy; new
  Settings.
- **Horizon:** Near.
- **Why now:** the reason codes already exist and are discarded — gap 3 — and a
  thin corpus currently reads to users as a broken feature.
- **★ justification:** one chip string over one existing RPC field. No new
  permission, no new focusable control (chips already live under Show details,
  so no focus-graph edit), on-Deck QA rides the existing **CONTEXT-LADDER-01** row.
- **Merge flag:** adjacent to **RAG Phase 4** Track 1 (chip visibility V1/V3/V4).
  Fine as its own row **or** folded into Phase 4's visibility track — but it is
  transparency, not retrieval, so do not push it to Phase 5+.

### A2. ★★ **Copy reply to clipboard** (reply micro-action)

- **Goal:** Get a command, URL or fix out of a reply and into Konsole, Discord
  or a phone without retyping it.
- **Depends on:** shipped — reply micro-action row + `replyStopRegistry` mount
  registry, `liveTurnFocusGraph`, and the existing host-script clipboard pattern
  (`read_host_clipboard.sh`).
- **Not in scope (v1):** images/screenshots; clipboard history; copying a whole
  transcript (→ **Named chat slots** / Desktop notes).
- **Horizon:** Near.
- **★ justification:** needs a new RPC plus a `write_host_clipboard.sh`
  (`wl-copy` / `xclip -i`) — and **`wl-copy` has to survive as the Wayland
  selection owner**, so a fire-and-forget subprocess loses the clipboard the
  moment it exits. That is the whole risk and it is unverified. The reply action
  row also grows 2×2 → 2×3, which is a focus-graph edit
  (`.cursor/rules/decky-focus-graph.mdc`) and a **MICRO-05** re-run.
- **Why now:** gap 1 — the clipboard service is deliberately read-only and the
  only export path requires rebooting to Desktop Mode.
- **Sequencing note:** worth a 30-minute on-Deck spike on `wl-copy` persistence
  (Gaming Mode *and* BPM) **before** this gets a row. If ownership can't be held,
  the fallback is showing the snippet in a selectable form, which is a different
  and smaller feature.

### A3. ★★ **Permission jump** (denial → the toggle that fixes it)

- **Goal:** One press from "bonsAI can't do that" to the exact Permissions
  toggle that unblocks it.
- **Depends on:** shipped — Capability Permission Center, `setCurrentTab` in
  `useBonsaiPluginShell`, existing deny toasts and inline deny copy.
- **Not in scope (v1):** per-capability first-use consent modals (deferred in
  [roadmap-completed.md:215](../archive/roadmap-completed.md)); auto-enabling
  anything; changing the default-off policy; new capability keys.
- **Horizon:** Near.
- **Why now:** gap 2 — five capabilities can deny, none of them points anywhere.
- **★ justification:** no backend change and no new capability, but it touches
  every deny site (screenshot attach, Desktop note, Proton log read, mic, Steam
  Web API), needs a return-tab story that coexists with the existing modal
  tab-restore locks in `useBonsaiPluginShell`, and adds one focusable control per
  deny surface → focus-graph entries.

---

## 3. Band B — ★★★–★★★★ (medium, in-plugin)

### B1. ★★★ **RPC contract gate** (name check + live `Plugin` smoke)

- **Goal:** Make an unreachable or broken RPC fail a gate instead of a user
  report.
- **Shape (two phases):**
  1. **Name check.** Extend `generate-architecture.mjs` so the pre-commit
     snapshot pass fails when a `call()` / `callDeckyWithTimeout()` name in
     `src/` has no matching `async def` at indent 4 in `main.py`. Orphan RPCs
     (defined, never called) report only.
  2. **Live smoke.** Instantiate `class Plugin` with
     `DECKY_PLUGIN_SETTINGS_DIR` pointed at a temp dir and `await` every
     read-only RPC, asserting each returns rather than raises.
     `scripts/probe_deck_rpc_surface.py` already defines the read-only set and
     the write redirection — this turns it from a remembered step into a test.
- **Depends on:** shipped — architecture snapshot generator + `.githooks/pre-commit`,
  `probe_deck_rpc_surface.py`, the `sys.path` setup in `run_python_tests.py`.
- **Not in scope:** mocking Ollama or judging reply content (→ **Prompt testing
  pass**, QA backlog); write-path RPCs; replacing on-Deck QA.
- **Horizon:** Near.
- **Why now:** gap 5 — two RPCs were dead in production at the same time, one of
  them for two and a half weeks, and *every* existing gate passed. D3 is about
  to move more code across exactly that boundary.
- **★ justification:** two languages, a change to a generated-file generator
  (the snapshots must not be hand-edited), and phase 2 needs a `decky` module
  shim so `main.py` imports outside the loader. No UI, no permissions, no
  on-Deck QA. Refactor coupling is *positive* — it protects D3 rather than
  competing with it.
- **Placement flag:** could go under **QA backlog** instead. Recommend Planned —
  it is prevention infrastructure with a ship shape, not a manual QA pass.

### B2. ★★★ **Per-game preference memory** (AppID-scoped defaults)

- **Goal:** Let the answer style a user picked for a game come back with the
  game, instead of re-toggling Settings each session.
- **v1 shape:** mode, AI character preset, and spoiler masking remembered per
  AppID; a small "using your saved setup for *Elden Ring*" chip with a one-tap
  "use global instead".
- **Depends on:** shipped — the per-AppID strategy checklist persistence pattern,
  mode selector, character picker, `strategy_spoiler_masking_enabled`, running
  AppID tracking ([useStrategyChecklistSession.ts:42](../../src/hooks/useStrategyChecklistSession.ts)).
- **Not in scope (v1):** per-game model routing or keep-alive; per-game corpus;
  unbounded storage (cap ~20 AppIDs, LRU prune); any sync.
- **Horizon:** Medium.
- **Why now:** gap 6 — everything except the checklist is global, and the
  AppID-scoped storage pattern is already proven in-repo.
- **★ justification:** a settings-shape change, which is the six-file
  two-language chore **D12** exists to reduce; a precedence rule to get right
  (per-game vs global vs in-session override); a **Clear all data** story; and a
  small Settings/QAM surface → focus graph.
- **Sequencing note:** ship **after** D12 Option A (declarative field table) or
  pay the settings cost at full price.

### B3. ★★★★ **Connection doctor** (guided first-Ask repair)

- **Goal:** When the first Ask fails, walk the user to a working Ollama instead
  of handing them a toast and a docs link.
- **v1 shape:** a **Fix this** action on Ask failure that runs the probes the
  backend already has, in order — host reachable? (`test_ollama_connection`) →
  anything advertising on LAN? (`discover_mdns_ollama_hosts`) → is local Ollama
  installed and running? (`get_local_ollama_setup_status`) → is any model
  pulled? — and states exactly one next action per outcome, deep-linking to the
  Ollama-tab control that performs it.
- **Depends on:** shipped — those four probes, Ollama tab controls, named hosts,
  compat KB troubleshooting tips. Shares the deep-link mechanism with **A3**.
- **Not in scope (v1):** editing firewall or network config; running installs
  without consent; a read-only diagnostics dump (that is **Deck health
  snapshot**); anything web (→ **Web permission**).
- **Horizon:** Medium.
- **Why now:** gap 7, and [Q2](02-readme-redesign-plan.md) found the same
  new-user cliff from the docs side — a visual README and an in-plugin repair
  path are two halves of one problem.
- **★ justification:** no new capability, but it is a stateful multi-step flow
  on the Deck's hardest surface (D-pad through a decision tree), it sits on the
  Ask lifecycle mid-D3, and every branch needs on-Deck QA against a
  *deliberately broken* setup — a QA fixture that does not exist yet.
- **Merge flag:** shares its probe set with **Deck health snapshot** (★★★★★).
  Keep both only if the doctor is the *interactive* front end and the snapshot
  is the *dump*; otherwise make this Phase 1 of that row. **Do not build two
  probe stacks.**

---

## 4. Band C — ★★★★★–★★★★★★ (large or upstream-gated)

### C1. ★★★★★ **On-Deck model benchmark** (measured routing order)

- **Goal:** Rank the models actually installed on *this* Deck by measured speed
  and completion, and offer that as the try order instead of a hand-sorted list.
- **Depends on:** shipped — user-owned routing pickers + `resolve_routing_order`
  (`ollama_routing.py`), keep-alive, `elapsed_seconds`, and the `eval_count` /
  `prompt_eval_count` / `done_reason` already logged at
  [ollama_service.py:610](../../py_modules/backend/services/ollama_service.py).
- **Not in scope (v1):** benchmarking LAN hosts; any quality/"which model is
  smarter" scoring — speed and completion only; auto-applying a new order
  without confirmation; publishing results anywhere.
- **Horizon:** Long.
- **Why now:** routing order is user-owned but users have no data to order it
  with, and the numbers needed are already produced and dropped into the log.
- **★ justification / blockers:** the honest blocker is **measurement
  validity** — a run while a game holds the APU, or on battery, or thermally
  throttled, gives a different ranking than one on the dock, and the Deck has no
  stable idle state to measure from. Plus minutes of model loading (cancel +
  progress UI), interaction with keep-alive and the **Dynamic keep-alive /
  smart unload** spike, and it writes a setting the user owns.
  **Go/no-go gate:** a spike proving run-to-run variance is small enough that
  the ranking is stable. If it is not, this descopes to a one-shot "how fast is
  this model here?" readout and nothing more.

### C2. ★★★★★ **Community tip contribution** (corpus inbound path)

- **Goal:** Let a user who knows a fix turn it into a KB tip card the project can
  actually accept — without bonsAI running a server or collecting anything.
- **v1 shape:** a reply → **Suggest as a tip** action that writes a schema-valid
  card (the corpus's own section format, plus AppID and source attribution) to
  `~/Desktop/bonsAI_logs/` and shows the GitHub URL to attach it to. Entirely
  local; the transport is the user's own browser on their own machine.
- **Depends on:** **RAG Phase 6** (public corpus + ATTRIBUTIONS + legal scrub) —
  there is no point accepting contributions before there is a published corpus
  to contribute to. Shipped: Desktop notes + `filesystem_write`, thumbs
  feedback, corpus schema.
- **Not in scope:** any upload from the plugin; telemetry; auto-merge; writing
  unreviewed cards into the local corpus; wiki scraping (→ Phase 5/7).
- **Horizon:** Long.
- **Why now:** gaps 3 and 4 — the corpus ceiling is *content*, not retrieval
  ([archive/roadmap-bugs-fixed.md](../archive/roadmap-bugs-fixed.md)), and the one signal users already give is
  written to a file nothing reads.
- **★ justification / blockers:** the cost is not the code. It is moderation,
  licensing and attribution of user-submitted text, and a review pipeline the
  maintainer runs forever. A PII scrub cannot be fully guaranteed, so the copy
  must say plainly *"you are publishing this"*. Blocked on Phase 6's legal
  lessons by design.

### C3. ★★★★★★ **In-game answer surface** (no-QAM reply; overlay research)

- **Goal:** Read an answer without leaving the game.
- **Reality check:** the shipped **Reply ready toast** already proves bonsAI can
  put something on screen with the QAM closed — and it is capped at a title plus
  *"Tap to open"* ([bonsaiReplyReadyToast.ts:44](../../src/utils/bonsaiReplyReadyToast.ts)).
  Everything past that (a persistent, scrollable, dismissible overlay over
  gameplay) needs a surface Decky plugins do not have: Steam's in-game overlay
  is closed and gamescope layer injection is not a supported plugin API.
  **Native QAM shortcut tile** is the adjacent upstream ask, and it only
  shortens the path *into* the QAM — it does not remove the need to open it.
- **The slice that is not blocked:** extend the toast to carry the first ~2 lines
  of the reply. That slice alone is **★★**. One hard guardrail: **spoiler
  fencing does not exist in a toast**, so a snippet must be suppressed for
  Strategy mode and for any reply containing a fence — the same leak class as
  **STREAM-03**.
- **Depends on:** shipped — reply ready toast, background Ask, spoiler fence
  detection. **Blocked** beyond the snippet on an upstream overlay surface.
- **Not in scope:** a forked Steam client or undocumented UI injection (the same
  line the Native QAM tile row draws); rendering into the game process; input
  capture during gameplay.
- **Horizon:** Long.
- **Why now:** it is the most-wanted thing this product cannot do and it has no
  row — so the cheap slice keeps getting overlooked along with the expensive one.
- **★ justification:** the full form is upstream-gated with no known API, and the
  guardrail (spoilers on a surface that cannot mask) is a product problem, not
  plumbing. **Recommendation: split.** File the ★★ toast-snippet slice as a
  Near-term row and keep the overlay as research.

---

## 5. Top 3 for the next quarter

Assuming the maintainer is mid-D3 (`index.tsx` at 1291 lines per **D14**) and
holding RAG remediation PR1/PR2 docs-locked.

1. **B1 — RPC contract gate (★★★).** *New Planned row.* The only proposal that
   makes the rest of the quarter safer: D3 moves call sites across the exact
   boundary that produced two silent production failures in August, and the cost
   is a generator change plus a test harness, not product design. Ship phase 1
   (name check) **before** the next `index.tsx` extraction commit.
2. **A1 — KB coverage chip (★).** *New Planned row, or folded into Phase 4 Track
   1.* During remediation the maintainer is staring at retrieval output
   constantly; a chip that says "the corpus had nothing for this game" turns that
   eval work into something users can see, and the data is already in the RPC
   response. Cheapest honest win on the list.
3. **A3 — Permission jump (★★).** *New Planned row.* Independent of both D3 and
   RAG, so it is safe work when the refactor is blocked, and it closes a
   first-run cliff the README rewrite cannot reach from the docs side.

**Deliberately not in the top 3:**

- **A2 clipboard copy** — good idea, but `wl-copy` selection ownership is
  unverified. Spike it, then file it.
- **B3 connection doctor** — highest user value in band B, but it is a stateful
  D-pad flow layered on the Ask lifecycle, which is the worst thing to build on
  a half-finished D3. Queue for the quarter after.
- **B2 per-game memory** — sequence after D12's field table or pay the six-file
  settings cost twice.

---

## 6. Do not add — bugfixes or already covered

| Idea | Why it is not a new row |
|---|---|
| Reply verbosity / length control | Already fix lean (3) inside the **Soft `num_predict` + thinking budget** bug row, feeding **Thinking effort control**. |
| KB browser, or tap a citation to its source | Explicitly *not in scope* in **RAG Phase 7**. Re-proposing re-litigates a locked scope. |
| "Make RAG chips appear more reliably" | **Phase 4** Track 1 (V1/V3/V4) already locks the ≥1-chip guarantee and the **Tip** badge. |
| Warm the model before the first Ask | Belongs to the **Dynamic keep-alive / smart unload** spike — do not pre-empt its go/no-go. |
| Persist and browse past answers | This is **Named chat slots**, blocked on the D3 state machine by design. |
| Faster capture → attach | **SteamOS Share path** (★★★★). |
| Read replies aloud | **Local reply TTS** Phase 1. |
| "Install voice engine" is live when already ready; KB seed advertises a setting that is already on | Both are open ★ **Bugs** with fix leans written. Not features. |
| Battery / thermal-aware Ask guard | Real gap (8), but half of it is the keep-alive spike's question and the other half needs a sysfs-read permission story. Raise it *inside* that spike. |
| Surface the thumbs JSONL as a digest | Gap 4 is real, but a standalone feedback screen serves the maintainer, not the user. Fold the signal into **C2**, where it has a destination. |

---

## Notes

- Everything proposed here reuses a shipped subsystem (transparency chips,
  Permission Center, reply micro-actions, session RAG chip RPC, routing order,
  Desktop notes, reply-ready toast, the snapshot generator). No greenfield
  platform is proposed.
- No proposal adds a new capability key. **A3** and **B3** only navigate to
  existing toggles; **C2** writes through the existing `filesystem_write` gate.
- Housekeeping, unrelated to this question:
  [10-wake-word-listening-feasibility.md](10-wake-word-listening-feasibility.md)
  answers **Q10**.
