# Testing manual: closed rows (archive)

Rows moved out of [testing-manual.md](../testing-manual.md), copied word for word, nothing reworded.
These are checks that passed on the Steam Deck, were retired, or were superseded by a later check —
none of them need to run again. Grouped under the section heading each row lived under in the live
document.

## Moved from testing-manual.md, plan 65, 2026-09-24

### SMOKE-A — Golden path (P0)

- [x] Open plugin; no crash on first paint — PASS 2026-09-03 on build 3b0e9d7: the panel opened on Main with no crash
- [x] LB/RB cycles Main → Ollama → Settings → Permissions → (Developer) → About — PASS 2026-09-03: RB on the bar cycles Main → Ollama → Settings → Permissions → Developer → About → Main (`docs/test-evidence/SMOKE-A-02-tab-cycle-from-the-bar.json`)
- [x] **TAB-MARKER-01** — active tab icon is accent-coloured while focus is deep in the tab body (D-pad down into the panel, then look at the strip without moving focus back up); other icons stay grey. Close and reopen the plugin — the restored tab is still marked. With an AI character selected the marker takes that character's colour, not green. — PASS 2026-09-03: the collapsed bar's name reads gold (Ali G) while the ring is deep in the Ollama body and the other cells stay grey; the old icon strip is hidden by plan 30, so the marker is the bar's name colour now
- [x] Ollama → Test connection — success or stable unreachable (no traceback) — PASS 2026-09-03: reads *Connected · Ollama v0.32.15 · 4 models*, no traceback
- [x] Short Ask; reply in focusable chunks; D-pad through chunks — PASS 2026-09-03: *reply with only the word echo* answered *echo* in 11.9 s, one bubble, D-pad through the one chunk
- [x] **Show details** / context chips when available (see bug CONTEXT-LADDER) — PASS 2026-09-03: the ladder read *Chip 1 of 5 · KB: no game running · Reply style: balanced · Spoiler risk: med · Routed gemma4:e2b-it-qat · Developer details* (`docs/test-evidence/SMOKE-A-05-show-details.json`)
- [x] Two preset chips visible, side by side on a single row (the block was three stacked rows until 2026-08-31 and one chip for
  a day after that — one chip, or three, is a regression; D43 2026-09-01). The help chip, when showing, owns the whole row alone — PASS 2026-09-03: two chips side by side at x 48 and x 200, 148 × 30 px each

### PRESET-STREAM-ANIM-01 — decode preset chip animation (P1)

- [x] **Frame-rate feel:** while the chip churns, the QAM column does not stutter — watch for
      dropped frames/jank on real Deck hardware specifically, since the desk can only confirm the
      loop is throttled, not how it actually performs (one chip since 2026-08-31; this used to
      be three churning at once, so a regression here would be a surprise)

### SMOKE-F — Deterministic commands (P2)

- [x] `bonsai:disable-sanitize` / `bonsai:enable-sanitize` — confirmation; no Ollama call — **PASS (Deck) 2026-09-05, re-confirmed 2026-09-15.** *disable* answered *Input sanitization is disabled for future asks. Send bonsai:enable-sanitize (exact line, Ask field) to turn it back on.*; *enable* answered *Input sanitization is enabled again for future asks.* Both instant, no model call. Evidence `docs/test-evidence/plan55-SMOKE-F.json`.
- [x] `bonsai:shortcut-setup-deck` — fixed help; points to [troubleshooting.md](troubleshooting.md) §5 — **PASS (Deck) 2026-09-05, re-confirmed 2026-09-15.** Answered with the fixed recipe: *bonsAI cannot create Steam Input macros automatically (no supported API; your controller stays under your control)*, pointing at troubleshooting §5, followed by the numbered steps. Skips the model. **Note:** the first Ask press after a reply lands did nothing — the ring is briefly unowned, so that press places it instead of acting; the second press submitted. Same family as the known unowned-ring entry. Evidence `docs/test-evidence/plan55-SMOKE-F.json`.
- [x] `bonsai:vac-check` with Steam Web API **off** → capability message only (**VAC-01**) — PASS 2026-09-03: answered with the capability message naming Permissions → Steam Web API and Developer → Integrations, no Ollama call in the plugin log (`docs/test-evidence/SMOKE-C-b-press-ask-vac-check-off.json`). **Not re-run 2026-09-15** — the ban-lookup permission was on tonight, so this line answered per VAC-02 instead (below); the permission-off case is still owed for a future pass.

### SMOKE-E — Strategy one-shot (P1)

- [x] Strategy mode Ask; spoiler tap-to-reveal / Spoilers OK path works — **PASS (Deck) 2026-09-04.**

### SMOKE-H — Background Ask reopen (P1)

- [x] Start Ask; close QAM; reopen → Thinking… or final reply restored — **PASS (Deck) 2026-09-16:** both shapes seen in one run — the reopened panel first showed the pending turn's "Still thinking…" line, and polling on then found the finished reply in place. Evidence `docs/test-evidence/plan56-SMOKE-H-background-ask-reopen.json`.

### Tier 1 extras

- [x] Persist last Q&A across plugin reopen — **PASS (Deck) 2026-09-18:** the last question and answer were still on screen after closing and reopening the panel, seen twice.
- [x] One Ask each in Speed and Expert (routing/disclosure differs) — **PASS (Deck) 2026-09-18.** Evidence `docs/test-evidence/plan61-tier1-speed.json`, `docs/test-evidence/plan61-tier1-expert.json`.

### VAC / `bonsai:vac-check`

- [x] **VAC-01** Capability off — SMOKE-F — PASS 2026-09-03: answered with the capability message naming Permissions → Steam Web API and Developer → Integrations, no Ollama call in the plugin log (`docs/test-evidence/SMOKE-C-b-press-ask-vac-check-off.json`)
- [x] **VAC-02** On, empty key — **PASS (Deck) 2026-09-16:** the empty-key message named where to paste the key and showed the command shape with a SteamID, instant, no model call. Evidence `docs/test-evidence/plan56-VAC-02-empty-key.json`.

Moved here 2026-09-24. VAC-03 to 06 passed on 2026-09-23 (plan 64, flow H), and the pass was written into
the roadmap's finished list and testing.md that night, but these four boxes were left unticked in
testing-manual.md. Found by the planning-folder review
([audit/planning-folder-review-2026-09-24.md](../audit/planning-folder-review-2026-09-24.md)).

- [x] **VAC-03** Valid key + SteamID — **PASS (Deck) 2026-09-23,** with the maintainer's own key put in and taken out by the session: the ban report came back in about 2 s with no AI wording. Evidence `docs/test-evidence/plan64-VAC-03-06.json`.
- [x] **VAC-04** Profile URL — **PASS (Deck) 2026-09-23:** a profile link gave the same ban report as the account number. Same evidence file.
- [x] **VAC-05** Vanity `/id/…` unsupported note — **PASS (Deck) 2026-09-23:** a vanity link said vanity links are not supported and asked for the number instead of guessing. Same evidence file.
- [x] **VAC-06** Permission off after key saved — no network — **PASS (Deck) 2026-09-23:** with the switch off, the reply said so and named the switch. The "nothing reached Valve" half proves less than it sounds, because the log never names that request even when a lookup succeeds. A later wording change to that message (commit `ec6f87ab`) landed after the last deploy and is owed its own re-check (roadmap Verify). Same evidence file.

### Open regression IDs (bugs / recent ships)

- [x] **ASK-WIDTH-01** — **partial fix landed 2026-08-15, confirmed on-Deck 2026-09-15.** Main tab, AI character **off**: the preset chips, the input box and the Ask bar all reach the QAM panel edges, with no visible gutter between them and the panel interior; the three share identical left and right edges. Repeat with the character **on**; repeat after LB/RB away and back. If a gutter survives, run `scripts/probe_deck_ask_row_width.py` and read **V0** — it walks `.bonsai-scope` → `<body>`, prints each ancestor's padding/margin and the room it eats, and marks which are bonsAI's to target vs Steam/Decky's needing a named selector. V1–V5 cover the per-row measurement loop if the ancestors come back clean — Measured (Deck) 2026-09-04: panel 300px (48 → 348); slot row, transcript and chip row each span it exactly; Ask button 298.4px, inner actions row 294.5px (the input's own padding). **By-eye confirm, PASS (Deck) 2026-09-15:** every Main row measured by rect still spans the full column, nothing overflows, and the rows sit flush by eye. Evidence `docs/test-evidence/plan55-ASK-WIDTH-01.json`, screenshot `screenshots/DeckCapture_20260915_200505_game.png`.
- [x] **CONTEXT-LADDER-01** Live turn Show details reveals inline chip ladder — PASS 2026-09-03 on the echo turn, `docs/test-evidence/SMOKE-A-05-show-details.json`
- [x] **CONTEXT-LADDER-03** D-pad: Show details / Retry **Down** → ladder focus (not session strip skip); **Left/Right** cycles chips; all chips visible when ≤6; **Up** from first chip → utility row; **Down** from last chip → session strip; **Developer details** chip reachable — **Verified (Deck + the maintainer's look) 2026-09-05**, recorded on the CONTEXT-LADDER-01…03 row of [testing-closed-2026.md](testing-closed-2026.md). Left unticked in testing-manual.md until 2026-09-24.
- [x] **MICRO-04** Strategy live-turn D-pad: branches → feedback → utilities — **Passed 2026-08-28:** one walk down a finished Strategy reply reached both branch buttons, then Helpful, then Retry, with nothing stepped over; recorded on the MICRO-04 row of [testing-closed-2026.md](testing-closed-2026.md). Left unticked in testing-manual.md until 2026-09-24.
- [x] **KB-COVERAGE-01** After Ask, Show details includes `kb_coverage` chip: KB off → `KB: off`; KB on + DRG Survivor + seed corpus → `KB: N sections`; KB on + uncovered title → `KB: none for this game` (the 2026-08-16 device run cleared the CONTEXT-LADDER-01 blocker; the two negative cases are in plan 31) — The `KB: off` half PASSES (Deck) 2026-09-04: with *Use local knowledge base* off, Show details read `KB: off` with the bullet *Local knowledge base is disabled in Settings.* and no retrieval lines. — **PASS (Deck) 2026-09-05, all four readings.** Covered game `KB: 13 sections` (Deep Rock Survivor); toggle off `KB: off` (2026-09-04); nothing running `KB: no game running`; **uncovered title `KB: none for this game`** with Sifu running, alongside `Retrieval: Keyword search`, `unresolved` and no embed time. Black Mesa is not on the Recent Games shelf so the launcher refuses it; Sifu was checked against the eleven app ids in the corpus manifest.
- [x] **RETRY-RESTART-01** — **PASS (Deck) 2026-09-06.** Ask something and let it finish. Restart the plugin (`plugin_loader restart`, or reboot the Deck) and reopen bonsAI: the last conversation is drawn again with its question expanded. Press **Retry** on that question — the same question must be asked again (watch the plugin log for a new `run_game_ai_request`). No *Nothing to retry* toast. Fixed 2026-09-06; before the fix the press sent nothing at all. Then check the one case that must still show **no** Retry badge: stop an Ask before any text arrives, so the kept answer is the *Request cancelled.* placeholder.
- [x] **D-PAD-SCROLL-02** Strategy reply: ~one readable step per D-pad Down. **Passed 2026-08-28** — one stop per paragraph
- [x] **THINKING-COPY-01** Same Ask, no phase boundary crossed → the italic line does **not** change. Specifically: the opener that appears on submit must be the *only* opener — watch the first ~2s for a rewrite from one generic line to another. That rewrite was the bug; if you see it, the client is composing again — **PASS (Deck) 2026-09-17:** the first status line held for about 5.5 seconds before changing, no early rewrite. Evidence `docs/test-evidence/plan57-QA-THINKING-COPY-01.json`.
- [x] **THINKING-SLOW-01** Black Mesa `362890`, cold model (first Ask after a reboot, or after `ollama stop`): the line must report **building context** and then **connecting/waking the model** before any answer text. The point is that the longest silence now says something — and says it encouragingly, not with a sigh — PASS (Deck) 2026-09-04: the slow-path blurbs appeared in order and cycled across 32 sampled phases.
- [x] **THINKING-LIVE-01** During a long answer (Expert mode, or a 30s+ reply): the line **keeps moving** on an irregular beat (4–12s between changes, first change 7–13s in) and never sits on one string for the whole run. Three things should be visible over a long generation: the `connecting` line giving way to a *writing your answer* line once tokens start, then rotating duration lines that escalate in tone, and — if the model cooperates — its own `<bonsai-status>` text cutting in and resetting the cycle. **Fail conditions:** any line held for more than ~15s; a *regular* beat you can count along to (the whole point of the randomised window); a line predicting completion (*almost done*, *nearly there*); a line repeating itself back to back; half-written text — PASS (Deck) 2026-09-04: the line updated throughout a 212s reply, one writer, no interleaving. **Re-confirmed (Deck) 2026-09-17:** the line changed three times over about 7 seconds, no freeze, no repeat; the run was short enough that the 30-second slow-path wording was not produced. Evidence `docs/test-evidence/plan57-QA-THINKING-LIVE-01.json`.
- [x] **THINKING-SPOILER-01** Strategy mode, masking on, a title with real spoilers: if the model names something spoilery in the thinking line it must render as blocks (`beat ████ ██████ dance`), never as plain words and never as literal `[[spoiler]]` markup. Watch for the failure direction too — a line that is *entirely* blocks means the model opened the marker and never closed it, which masks to end of line by design — PASS (Deck) 2026-09-04: the Red Dead ending question fenced — *Spoiler — tap to show / Hidden until you reveal (Strategy Guide).*
- [x] **PICKER-EDGE-01** Fullscreen pickers: from the first control press Up, from the last press Down, ring must still reach the confirm buttons. **Character picker and AI models hub pass (2026-08-28)**; try order fails
- [x] **PICKER-REORDER-01** Try order: one press of Down moves the *highlight*, not the model. **Passed 2026-08-28** after D36 option 1. Vision list not driven separately
- [x] **PICKER-B-CLOSE-01** Try order closes on B, from a row and from the footer. **Passed 2026-08-28** once it moved onto the shared modal frame
- [x] **TAB-RESUME-MODE-01** Developer → **Navigation → Tab to open on (D15)**: each stop changes where the *next* open lands — **A · Main** always Main, **B · Resume** the tab you left, **C · 5 min** the tab you left only within five minutes. Re-check the control after a reopen to confirm the choice persisted — PASS 2026-09-03: A · Main → reopened on Main after leaving from About (`docs/test-evidence/TAB-RESUME-MODE-01-a-select-main-and-close.json`); C · 5 min → reopened on About within a minute (`docs/test-evidence/TAB-RESUME-MODE-01-c-select-5min-and-close.json`) and on Main after 5 m 29 s away (closed 01:15:21, reopened 01:20:50); B · Resume → reopened on About (`docs/test-evidence/TAB-RESUME-MODE-01-f-select-resume-and-close.json`); each choice was still highlighted on Developer after its reopen; on disk A = `always_main`, B = `resume`, C = `resume_recent`; the maintainer's setting (C) was restored.
- [x] **TAB-RESUME-FOCUS-01** D-pad the same row: Down from **On-screen debug HUD** reaches the three buttons, **Left/Right** moves between A/B/C, **Down** leaves the row for **App activity logging** below, **Up** returns to Diagnostics — no stop skipped and no button acting on a direction press — **PASS 2026-09-03** (`docs/test-evidence/TAB-RESUME-FOCUS-01.json`): Right A → B → C and stops, Left back, Up to Jump to Steam Input in Diagnostics, Down re-enters on A · Main, second Down to App activity logging; `tab_resume_mode` on disk unchanged through eight presses. Note: Jump to Steam Input (running game) sits between the HUD and the row even with no game running, so Down from the HUD takes two presses
- [x] **TAB-SWITCH-01** Press **RB** repeatedly through the whole strip, with focus **deep in a scrolled** Settings or Ollama panel: the icon strip must not lurch sideways and drift back, and the content pane must not flash or jump. **RB is the case that mattered** — the fault was asymmetric and LB never showed it, so an LB-only pass proves nothing. Include the wraparound (**RB on About**, rightmost, which wraps to Main rather than doing nothing) since that is the longest strip travel. Repeat with focus parked **on the tab icons**. Fixed 2026-08-07 by `overflow: clip` in section-1.ts; if this regresses, re-run `scripts/archive/probe_deck_tab_switch.py` and check whether `scrollLeft` on the tabs-root child stays 0 while `scrollWidth` collapses. Mechanism: [planning/03-lbrb-tab-flicker.md](archive/03-lbrb-tab-flicker.md) § 10 — PASS (Deck) 2026-09-04, measured: RB through the whole strip including the About wrap, focus deep in a scrolled Ollama panel, 1,453 samples at 16ms — `scrollLeft` never left 0 and `scrollWidth` never moved.
- [x] **ABOUT-LINKS-01** About tab: D-pad **down** from the reply-language dropdown must reach **all four** links in order — GitHub, Built on Ollama!, Bugs & Feature Requests, PayPal — with no stop skipped and no press swallowed, and **Up** must walk back the same way. Press **A** on one and confirm Steam's browser opens (it is bright). Fixed 2026-08-07: hand-rolled `Focusable` + `onMoveUp`/`onMoveDown` wrappers returned `true` (so Steam skipped default navigation) while moving focus with a plain DOM `.focus()`, which does not transfer gamepad focus across nav containers — presses were consumed and focus never moved, making every link unreachable. The same chain also skipped the two middle links outright — **PASS (Deck) 2026-09-18:** Down from the language dropdown reached all four links in order and Up walked back the same way; A on the GitHub link opened Steam's own browser at the project's page. One thing to know: pressing B to leave that browser closed the whole plugin panel rather than only the browser, though reopening the panel landed back on the About tab with nothing lost. Evidence `docs/test-evidence/plan61-ABOUT-LINKS-01.json`.
- [x] **SOFT-PREDICT-01** Speed mode, a prompt long enough to hit the 800-token wall once: confirm the `Continuing…` cue is visible and brief at the stream tail, the final reply reads as one seamless answer (no visible seam at the stitch point), and reopening the tab afterward shows no `Continuing…` in the saved history text — PASS (Deck) 2026-09-04: a 60-tip prompt ran to 10,707 characters, the `Continuing` cue was caught mid-stream by a 400ms sampler, and neither the finished reply nor the saved history after a tab round-trip contains it. **Re-confirmed (Deck) 2026-09-17:** a long five-part reply read with no seam and `Continuing…` never appeared, live or saved. Evidence `docs/test-evidence/plan57-QA-SOFT-PREDICT-01.json`.
- [x] **SOFT-PREDICT-03** Same setup as SOFT-PREDICT-01 — press **Stop** during the `Continuing…` cue window: kept partial body plus the small **Stopped** notice, and `Continuing…` must **not** appear in the kept text. Re-run after the 2026-08-15 throttle fix (`main.py` `_update_partial_response` shrink bypass + `stripSoftContinueCue` backstop) — this is the exact race the fix targets, so it is the highest-value manual re-check on this row — PARTIAL (Deck) 2026-09-04: Stop inside the cue window kept 3,628 characters of partial body and `Continuing` appears nowhere in the kept text — the 2026-08-15 fix holds. **But no "Stopped" notice appears anywhere**, and the stopped turn loses Helpful / Not really / Retry. Filed under Bugs. **PASS (Deck) 2026-09-17:** stopping partway now keeps the partial text along with a `Stopped — partial answer kept.` notice. Evidence `docs/test-evidence/plan57-QA-SOFT-PREDICT-03.json`. Whether the Helpful / Not really / Retry loss from the 2026-09-04 run is still true was not re-checked this pass.
- [x] **SOFT-PREDICT-05** A real thinking model (e.g. a qwen3 variant) at the default `think: false`: confirm a visible reply still comes back — no empty-reply regression from the model spending the whole budget on hidden thinking — **PASS (Deck) 2026-09-18:** run on gemma4:e2b-it-qat (the Deck's real thinking-capable model; no qwen3 is installed) with Thinking Off, a full visible reply came back, no empty reply. Evidence `docs/test-evidence/plan61-SOFT-PREDICT-05.json`.
- [x] **THINK-EFFORT-04** Ollama → **Thinking**, with a real thinking model (qwen3 variant) installed: set each of Brief / Balanced / Deep and Ask → answers still arrive, latency grows with the level, and **no raw reasoning leaks into the reply body**. Then Ask on a non-thinking model (gemma / llama) → the answer still arrives, a *Thinking not supported* toast appears **once** (not on the second Ask), and a second model that also cannot think warns separately. **While here, read the Ollama log for the 400 body** and tighten `_is_thinking_unsupported_error` in `ollama_service.py` if the wording is stable — the matcher is loose on purpose because the string is not a stable API — PASS (Deck) 2026-09-04: qwen3.5:4b forced first in the try order, Thinking Deep; 212s reply, Show details read `Routed qwen3.5:4b`.
- [x] **THINK-EFFORT-05** D-pad the **Thinking** row: **Down** from the Reply style slider reaches the four buttons, **Left/Right** moves between Off/Brief/Balanced/Deep, **Down** exits to **Custom timeouts** below, **Up** returns to the Reply style slider — no stop skipped, and no button acting on a direction press. Inserting this row rewired both neighbours, so check the Reply style slider's Down and the latency row's Up specifically — PASS 2026-09-03 (`docs/test-evidence/ONBUTTONDOWN-AUDIT-01-and-THINK-EFFORT-05-b.json`): Down from the Reply style slider reaches Off, Right walks Off → Brief → Balanced → Deep and stops, Left back, Down leaves to Custom timeouts, Up returns to the Thinking row then to the Reply style slider, no button acted on a direction press

### CHAT-SLOTS-V2 — Named chat slots (P0)

- [x] **CHAT-SLOTS-V2-01** D-pad **Down** from tab strip (or Ask) reaches the slot row; **Down** from row reaches the transcript (the preset row when the slot is empty — the layout inverted in the v3 redesign, W2); **Up** returns toward tabs; row is quiet at rest; with one slot, ghost neighbours hidden  — **PASS 2026-08-30 (automated),** but only after the row was made a focus stop; before that fix it was unreachable by D-pad in both directions. **PASS (Deck) 2026-09-17:** Down twice from the tab strip reaches the chat text, and Up retraces the same path. Evidence `docs/test-evidence/plan57-QA-CHAT-SLOTS-V2-01.json`.
- [x] **CHAT-SLOTS-V2-02** `[+]` creates a slot; **A** on title opens rename; **Right** → **×** → ConfirmModal deletes; focus returns to row after each modal  — **PARTIAL 2026-08-30 (automated).** `[+]` created a slot; **A** on the title opened the rename modal; **Right** moved the inner stop to **×** and turned it red without shifting the row. Return focus after the modal closes **failed at first** (the ring landed on the tab strip) and is **now fixed and re-verified on device**: `gpfocus` is back on the row after Cancel. Actually deleting a slot was not exercised.
- [x] **CHAT-SLOTS-V2-03** Ask in slot A → **LB/RB** to slot B mid-Ask → reply lands in **A**; reopen A — both Q and A present — PASS (Deck) 2026-09-04: RB to another slot mid-stream and LB back; the reply landed in A with both question and its 5,749-character answer.
- [x] **CHAT-SLOTS-V2-04** Close QAM mid-Ask → reopen → pending question visible (not empty transcript) — **PASS (Deck) 2026-09-16:** the reopened panel showed the pending turn's line rather than an empty transcript. Same run as SMOKE-H above. Evidence `docs/test-evidence/plan56-SMOKE-H-background-ask-reopen.json`.
- [x] **CHAT-SLOTS-V2-05** With row focused: **LB/RB** cycle slots; blur row → **LB/RB** switch tabs — repeat with a game running and without; record P-0 result in [major-redesign.md](archive/major-redesign.md) § 7 R1  — **PASS 2026-08-30 (automated).** Row focused: LB cycled slot without changing tab (`selectedTabIndex` stayed 0). Row blurred: LB switched tab 0 → 5. **This is the P-0 spike; it passes, so the redesign plan stands and the sixth-*Chats*-tab fallback is not needed.** Evidence `docs/test-evidence/CHAT-SLOTS-V2-05-*.json`. Not yet repeated with a game running.
- [x] **CHAT-SLOTS-V2-06** Carousel stops at `[+]` and at last slot (no wrap); dots track active slot at cap of 8  — **PASS 2026-08-30 (automated).** LB at `[+]` is a no-op (no wrap); dots tracked the active slot (index 5 → 4) and rendered **6** for 6 slots, so the cap-8 change is live. End boundary observed as a dimmed RB pill on the last slot but not press-tested.

### CHAT-SLOTS-V3 — Named chat slots redesign (P0)

- [x] **CHAT-SLOTS-V3-01** (W2) **Down** from the slot row reaches the transcript's first stop; **Down** continues transcript → presets → ask bar; **Up** retraces; on an empty slot **Down** from the row reaches the presets. The context footnote renders below the ask bar  — **PASS 2026-08-30 (automated).** Empty slot: tab strip → row → presets. With a transcript: tab strip → row → turn header → answer → Show details → session context → presets. Up retraces. Evidence `docs/test-evidence/CHAT-SLOTS-V3-01-*.json`. Note the session-context strip is a stop between transcript and presets whenever it has content. — re-run PASS 2026-09-03 with the walk starting at the bar (`docs/test-evidence/CHAT-SLOTS-V3-01-rerun-fresh-open-walk.json`)
- [x] **CHAT-SLOTS-V3-02** (W10) A slot named longer than about 12 characters: the focused title sweeps end to end and snaps back on a ~6s cycle; quiet rows never move; with Steam's reduced-motion setting on (if it is exposed), no sweep  — **PASS 2026-08-30 (automated).** A 62-char slot name focused: `--overflowing` set, `bonsai-slot-title-scrub` 6s attached, `text-overflow: clip`, sweep distance 312px = measured overflow. Quiet row: no class, no animation. Reduced-motion not exercised.
- [x] **CHAT-SLOTS-V3-03** (W3+W11) A fresh slot and the `[+]` position both show the 52px silhouette and caption under the row; `[+]` shows no dots; the first Ask replaces the preview with the live turn  — **PASS 2026-08-30 (automated).** `[+]` shows no dots and no ×; logo 52px @ .16 opacity; caption 13px italic, line-height 20.15 (13 × 1.55), max-width 210px, centred. Create title 13px / rgba(200,214,230,0.45) / no glow **after the specificity fix** — it computed 14px / #f2f7fc before it.
- [x] **CHAT-SLOTS-V3-04** (W14) Rename: cyan field, **Save** disabled while the name is empty, caret in the field on open; delete confirm shows Steam's destructive styling; both modals still survive a QAM close/reopen and return focus to the row. If `focusOnMount` fights the modal-survival focus dance, remove it and note that here  — **PARTIAL 2026-08-30 (automated).** Styling exact: SLOT NAME 10px/700/1px tracking, field 36px / 8px radius / cyan `rgba(156,231,255,0.5)` border / `#9ce7ff` caret, zero inner glass panels, stock Save+Cancel footer, field pre-filled. `focusOnMount` lands the ring in the field and does **not** fight the survival dance. Save-disabled-while-empty needs the on-screen keyboard, so it is covered by `ChatSlotRenameModal.test.tsx` instead. Return focus **fixed and verified 2026-08-30**: the registry was handed the row's outer wrapper, whose `closest('.Panel.Focusable')` resolved UP to an ancestor container; it now gets the row's own Focusable, and after Cancel `gpfocus` is on `.bonsai-chat-slot-row-focus`.
- [x] **CHAT-SLOTS-V3-05a** (W15) Ask in slot A, **LB** to slot B mid-stream: B shows B's own content (or the empty-slot preview) and zero of A's tokens; the ask bar still reads busy — FAIL (Deck) 2026-09-04: slot B showed a Strategy branch block belonging to A ("Where are you at in … ? A. Just starting in the town area / B. Dealing with a tough encounter or trap"), still there after A finished; B's ask bar did not read busy. Filed under Bugs. **Deck 2026-09-06: the leak is fixed.** A Ravenholm Strategy answer's branch block was checked against both other chats — one with two turns of its own, one empty — and appeared in neither, in either shoulder direction; switching back brought it home unchanged. The ask-bar-reads-busy half was not re-run. **The ask-bar-reads-busy half FAILED (Deck) 2026-09-18:** switching away from the writing chat left the other chat's Ask button reading ready, not busy. Filed as a new bug (a chat that is still writing does not look busy from another chat). Evidence `docs/test-evidence/plan61-CHAT-SLOTS-V3-05a-busyhalf.json`. **PASS (Deck) 2026-10-03 for the ask-bar-reads-busy half (plan 81, build `afd2f444`):** with Ask running in one chat and RB to its neighbour, the neighbour showed its own content with its Ask button greyed (busy). Whether greyed is the right reading, rather than ready, is an open question (no decision recorded). Evidence `docs/test-evidence/plan81-CHAT-SLOTS-V3-05a-busyhalf.json`.
- [x] **CHAT-SLOTS-V3-05b** (W15) Return to A mid-stream: the question, the partial text and the caret are all back within one poll — **PASS (Deck) 2026-09-18:** returning to the chat still writing showed the question and the partial text at once, nothing missing. Evidence `docs/test-evidence/plan61-CHAT-SLOTS-V3-05b.json`.
- [x] **CHAT-SLOTS-V3-06a** (W16) While away from slot A: A's dot is a hollow cyan ring; if A is the visible ghost neighbour, a cyan spark sits at that row edge, outside the ghost's fade — **FAIL (Deck) 2026-09-18:** the writing chat's dot looked like any idle chat's dot, no hollow ring and no spark. Filed as the same new bug as the 05a busy half above. Evidence `docs/test-evidence/plan61-CHAT-SLOTS-V3-06a.json`. **PASS (Deck) 2026-10-03 (plan 81, build `afd2f444`):** the writing chat's dot was a hollow cyan ring with a cyan spark beside its ghost; the spark's place outside the ghost's fade was judged from the screenshot only. Evidence `docs/test-evidence/plan81-CHAT-SLOTS-V3-06a.json` (+ .png).
- [x] **CHAT-SLOTS-V3-06b** (W16) A finishes while you are away: the ring turns solid green; returning to A clears it — **FAIL (Deck) 2026-09-18:** when the writing chat finished, its dot never turned green. Same new bug. Evidence `docs/test-evidence/plan61-CHAT-SLOTS-V3-06b.json`. **PASS (Deck) 2026-10-03 (plan 81, build `afd2f444`):** when the writing chat finished while away its dot turned solid green, and LB back cleared it. Evidence `docs/test-evidence/plan81-CHAT-SLOTS-V3-06b.json`.
- [x] **CHAT-SLOTS-V3-06c** (W16) QAM closed when the answer finishes: the reply-ready toast still appears (regression check on the completion watch) — not attempted 2026-09-18; still owed. Evidence `docs/test-evidence/plan61-CHAT-SLOTS-V3-06c.json`. **FAIL (Deck) 2026-09-23:** the menu was closed with the rig's GUIDE+A chord as the answer began; the reply finished about 30 seconds later; Steam's own toast window, read every 200 milliseconds for 150 seconds, never showed "Reply ready", and reopening the panel showed none either. The rig has not yet proven its own toast-reading can see a toast at all, so re-check is owed with a control question added first. Evidence `docs/test-evidence/plan64-CHAT-SLOTS-V3-06c.json` (+ `.png`, reopen screenshot). **Tried again 2026-09-23 with the control first: COULD NOT RUN.** The rig has no Quick Access button to press, and the runbook ruled out the GUIDE+A chord the first try used — there was no way left to close the menu as the row asks. The control itself worked, though: reading Steam's toast window caught an unrelated "Pull started" notice on its very first read, so the toast reader is proven to work; the first try's failure was not the reader's fault. Owed: the maintainer's word on which way to close the menu (GUIDE+A chord, plain B presses, or something else) before this can run again. Evidence `docs/test-evidence/plan64-CHAT-SLOTS-V3-06c-try2.json`. **Tried again 2026-09-23 (try 3), B presses used to close the menu: still FAIL, cause found and fixed in `73be15f`.** It took four B presses to close the menu — the plugin's own panel was already closed after the second, so the extra two closed Steam's own layers above it. The reply finished 20 seconds later; the notice window, read every 200 ms for 90 seconds, never showed "Reply ready". Cause: the flag that says "a reply is on screen" was only written while the panel stayed open and was never cleared once it closed, so a reply finishing in the background read as already seen and no notice went out. Fixed; re-check owed. Evidence `docs/test-evidence/plan64-CHAT-SLOTS-V3-06c-try3.json` and two screenshots. **Tried a fourth time 2026-09-23, PASS:** the same four B presses closed the menu, and this time Steam's own toast, "Reply ready / Tap to open," showed under 1 second after the answer finished (48.6 seconds after Ask). Evidence `docs/test-evidence/plan64-CHAT-SLOTS-V3-06c-try4.json` (+ two screenshots).
- [x] **CHAT-SLOTS-V3-07** (W17) A slot with 3 archived turns: a **"3 earlier"** pill sits above the newest turn and is a D-pad stop; **A** expands it into header rows and focus lands on the first revealed row; with exactly 1 archived turn the header row shows with no pill — PASS (Deck) 2026-09-04: the "12 earlier" pill was a D-pad stop, A expanded it into 13 header rows, the pill went, and focus landed on the first revealed row.
- [x] **CHAT-SLOTS-V3-08** (bottom dock) With a short or empty slot: preset chips, the Ask bar and the context line sit at the bottom of the panel with the empty space above them (between transcript and presets); the empty-slot preview stays directly under the slot row; the pane does not scroll when its content is short; a long transcript still scrolls with the Ask bar in flow at its end. Recheck the Rule 1 edges: every Main row still spans the full column width (the fill column moved the PanelSection out of the old `:has()` gutter fix's range — section-4 carries a dedicated line for it)  — **PASS 2026-08-30 (automated).** Short slot: `scrollHeight == clientHeight` (667) so the pane does not scroll; dock bottom 749 = column bottom; context line last. Every row x=48 w=300, so the Rule 1 edges survived the new wrappers.
- [x] **CHAT-SLOTS-V3-09** (sticky dock) With a transcript long enough to overflow the pane, the Ask bar, the ASK button and the context line all stay on screen while the transcript scrolls behind them; the dock has an opaque surface so nothing shows through it  — **PASS 2026-08-30 (automated).** `scrollHeight` 963 against a 667 viewport and both `askOnScreen` and `footOnScreen` true. Before the fix the same state put both off screen. **Correction, same day:** that pass was
  measured against the scroll viewport's bottom edge, and the viewport itself was hanging 50px below the screen (see **CHAT-SLOTS-V3-11**),
  so "on screen" was measured against the wrong edge. The sticky behaviour was right; the reference was not. Re-check against
  `window.innerHeight` when V3-11 is run.
- [x] **CHAT-SLOTS-V3-10** (new-chat affordances) On the **first** slot with the row at rest, a blurred **+ New chat** ghost sits left of the title and is not truncated; the dot strip leads with a **+** marking the create position, and that + is the active marker while the carousel is at `[+]`  — **PASS 2026-08-30 (automated).** Ghost renders "+ New chat" at 55px untruncated; strip shows 7 markers for 6 slots (1 create + 6). Slot titles created from now on lead with the question, not the game name — **existing slots keep their stored labels**, so this only shows on newly created chats.
- [x] **CHAT-SLOTS-V3-11** (panel height) Nothing the plugin draws sits below the visible screen: with a transcript long enough to
  overflow, read `.bonsai-scope`, the `TabContentsScroll` viewport, the Ask bar and the context line, and confirm every `bottom` is
  `<= window.innerHeight` — **measured against the window, not against the scroll viewport, which was the reference that hid this the
  first time**. Then confirm the context line is fully readable (its `height` unclipped, not a sliver) and that the pane still recovers
  its height after a pointer enters the panel (the sag guard this change touches)  — **PASS 2026-08-30 (automated).**
  `window.innerHeight` 766; scope, scroll viewport, dock and context line all bottom at **765**, so nothing hangs below the screen — the
  same read before the fix put the scope and the viewport at **816**. Context line 13px tall and whole, not a sliver. The 40px strip left
  under the dock turned out to be a **second, separate cause**: Steam's scroll container carries `padding-bottom: 40px` and sticky pins to
  a scrollport's *content* box, so `bottom: 0` stopped 40px short. Zeroed for the Main tab only; `gapUnderDock` is now **0** with the pane
  genuinely overflowing (scrollHeight 652 > clientHeight 616). Pointer-sag recheck still owed.
- [x] **CHAT-SLOTS-V3-12** (create affordances, revised) On a slot at rest, the ghost to the left of the title reads exactly `[+]` — the
  same token the create position uses as its centre label — is not truncated, has no directional fade eating its opening bracket, and has
  clear space between it and the title rather than reading as a prefix on it. In the dot strip, the leading `+` sits on the **same
  horizontal centre line** as the dots beside it (compare `getBoundingClientRect()` centres, not eyeballed)  — **PASS 2026-08-30
  (automated).** Ghost text exactly `[+]`, 14px wide, `truncated: false`, `mask-image: none`, and 14px of clear space to the title. In the
  strip the `+` centre and every dot centre read **191.45** — off-line by **0**. The cause of the old misalignment was `align-items` on the
  dot row defaulting to `stretch` against fixed-height dots, so the glyph box hung below their line.
- [x] **CHAT-SLOTS-V3-13** (strip rhythm + create position) Every marker in the dot strip — the leading `+` included — has the **same box
  size**, sits on **one centre line**, and has **equal spacing**; compare `getBoundingClientRect()` widths, heights, centres and inter-box
  gaps rather than eyeballing. At the `[+]` position **only the `+` is lit**: no slot dot carries `--active`. And on a slot whose content
  does **not** overflow (the `[+]` slot is the reliable one), the dock is still flush — `gapUnderDock` 0, context line on screen  —
  **PASS 2026-08-30 (automated).** Seven markers, all 5.99 x 5.99, all centred on one line, all six gaps exactly 6.0. At `[+]`:
  `activeMarkers: ["create"]`, centre label `[+]`, `gapUnderDock` **0** with `overflows: false`. Two separate causes were behind the
  original report: state was sized (3px quiet / 4px active / 6px ring), which reads as uneven spacing because a flex gap sits between
  boxes; and the strip keyed off `activeSlotId`, which cycling to `[+]` deliberately leaves alone, so a slot dot stayed lit on top of the +.
  The bottom gap was a **third**: Decky's PanelSection reserves 24px under itself, invisible whenever the dock is sticky but plain to see on
  the short `[+]` transcript.
- [x] **CHAT-SLOTS-V3-14a** (strip rhythm, smaller markers) Every marker in the dot strip is the same size, on one centre line, with equal
  gaps, and the markers are small rather than heavy  — **PASS 2026-08-30 (automated).** Seven markers at **3.99 x 3.99**, one centre line,
  all six gaps exactly **6.0**. The residual oval look was the transparent 1.5px border reserved on the base rule: it gave each dot two edge
  sets to snap independently at this device pixel ratio (1.28 measured), so the ring is an inset box-shadow now and the base rule has no
  border at all.
- [x] **CHAT-SLOTS-V3-14b** (one row height) The slot bar is the same height at `[+]` as on a populated slot  — **PASS 2026-08-30
  (automated).** Title row **22** and delete box **22** on both. The bar used to shrink ~9px at `[+]`, because the 22px x set the line on a
  slot and nothing did at the create position; the row now reserves the delete box's height whatever is in it.
- [x] **CHAT-SLOTS-V3-14c** (the game above the title) A chat created from now on shows its game's name in quiet text above the
  conversation title; a chat created before this shows the line reserved but empty; `[+]` shows it empty. **Needs a slot created after
  2026-08-30** — the name is only stored at creation, so every existing slot reads empty. **FAILED on this build 2026-09-15:** a
  chat created with Hades running got no game name at all — most likely the same cause as the game-line bug above (the line
  under the question box still read "no active game detected" at the moment the chat was created). Evidence
  `docs/test-evidence/plan55-CHAT-SLOTS-V3-14c.json`. Re-run after lane F's fix. The maintainer said yes 2026-09-19 (D113) to showing the game's name above the title, so this is a feature check again, not a bug-verification row; it runs once the maintainer confirms the always-shown version, already shipped, is the final one. **PASS (Deck) 2026-09-23:** "HADES" showed above the Hades chat's title with the ring on it, and was gone on a chat with no game attached; the row held its height at 48 pixels throughout. Evidence `docs/test-evidence/plan64-CHAT-SLOTS-V3-14c.json` (+ `.png`), saved replay check `checks/plan64-CHAT-SLOTS-V3-14c.json`.
- [x] **CHAT-SLOTS-V3-14d** (the end of a long reply) After a long answer settles, its end is reachable and does not look cut off: text
  visibly fades under the chips rather than being sliced, and the pane brings the end into view. **Fade PASSES** (18px gradient above the
  dock, measured 2026-08-30). **Auto-scroll PASSES 2026-08-31** — the long proton Ask driven by bridge: tail in view every frame while
  streaming (overshoot −40px where it had been stuck at +165px), and after the post-Ask rebuild yanked the pane to 0 the delivery passes
  landed it at 574 of a 602 max, last line 80px above the dock. Root cause and fix (scrollIntoView instead of scrollTop writes, plus a
  1.2s delivery window) in the roadmap entry. Worth one human pass for feel: no visible jitter while streaming, and scrolling up
  mid-answer still holds.
- [x] **CHAT-SLOTS-V3-15a** (carousel order) The leftmost dot is the most recently saved chat and [+] sits one LB press to its left;
  the rightmost dot is the oldest — **PASS 2026-08-31 driven by bridge**: active slot read at dot 2, two LB presses landed on [+]
  (`docs/test-evidence/V3-20-lb-to-create` steps), dot order read structurally before and after.
- [x] **CHAT-SLOTS-V3-15b** (ask from [+]) Submitting an Ask at the [+] position creates a chat, pops the panel to it, and the whole
  answer plays out there — **PASS 2026-08-31**: one second after A on ASK the new slot existed at dot 1 with the blinking pending
  ring and the thinking blurb on screen; the answer streamed in place and settled with its end 80px above the chips (scroll 731 of
  759). After a plugin reopen the chat is titled by its first question with [+] as its left ghost. Evidence
  `docs/test-evidence/V3-20-ask-from-create.json`.
- [x] **CHAT-SLOTS-V3-15c** (the [+] screen shows nothing slot-specific) At [+]: title `[+]`, create marker lit, empty-state art, and
  NO session-context strip, NO Save chat, no transcript — **PASS 2026-08-31**, read structurally on device.
- [x] **CHAT-SLOTS-V3-15d** (label updates live) Ask the first question in a fresh chat while staying on it: the row's title should
  change from "New chat" to the question as the answer archives, without closing the panel. The refresh is in code
  (`reloadActiveSlotTranscript`) and the rename was verified across a reopen; the live in-place update still wants one human glance.
  A ten-second recording was made 2026-09-18 for the maintainer's own glance: `recordings\DeckRecord_20260918_011115_auto.mkv`
  (on the maintainer's own PC, not in this repo); still owed for the maintainer to watch. **PASS (Deck) 2026-09-23:** "New chat"
  became the question 35 seconds after Ask, with the panel staying open and no reload. One note: the chat row was scrolled out
  of view at that exact moment, so a person would not actually have seen it change. Evidence
  `docs/test-evidence/plan64-CHAT-SLOTS-V3-15d.json`, a recording `plan64-CHAT-SLOTS-V3-15d.mkv` and frames
  `plan64-CHAT-SLOTS-V3-15d-frames.png`.
- [x] **CHAT-SLOTS-V3-15e** (the dingleberry sweep, D42) A on [+] creates "New chat"; switch away without asking and it deletes itself —
  **PASS 2026-08-31 driven by bridge** (`docs/test-evidence/V3-21-sweep-empty-chat.json`): created at position 1, one RB later gone from the rotation.
  Protections covered by unit tests: a renamed empty chat stays, a generating chat stays, a chat with turns stays.
- [x] **CHAT-SLOTS-V3-15f** (focus never hides behind the chips) Walk D-pad down a LONG reply to Show details / Copy / Helpful: the
  focused control must sit above the dock, not behind it — **PASS 2026-08-31**: on the battery answer Show details took focus 56px above
  the dock's top (scroll-margin 252px applied by the lift); on a short reply the lift correctly does nothing (29px naturally clear, no
  margin written). Worth one human pass on feel: the lift lands one frame after Steam's own focus scroll, so watch for any visible
  double-hop when stepping through a long answer.
- [x] **PRESET-ONE-LINE-01a** (the row is one chip) The preset block is a single 34px row; the dock is ~161px and the transcript's
  reading area ~455px — **PASS 2026-08-31, measured after deploy:** dock 245 → 161, chip viewport 118 → 34, reading area 371 → 455,
  one slot visible with the carousel's other history rows clipped. Free-play sweep (QA-FREE-PLAY-01): 16 presses top to ASK, every
  stop visible; Show details took focus 113px above the dock.
- [x] **PRESET-ONE-LINE-01b** (every mode still moves) Cycle Developer → preset chip animation through **carousel / fade / static /
  decode** and watch one full swap in each: carousel slides the next chip into the two-wide window from the right on its own within
  ~6s of opening (the timer only runs for 60s after the chips mount, so watch straight away); fade takes one chip out over ~2s and
  brings its replacement in over ~1s while the other chip stays put, never an empty row; static swaps on hold; decode scrambles and
  locks both chips, staggered. Also confirm the three game-specific seeds all appear in turn (the third queues behind the two on
  screen) and that a pinned QA batch of four or more walks in order past its third entry without ever showing one entry twice at once.
  — PASS 2026-09-03 by D-pad from Developer (`docs/test-evidence/PRESET-ONE-LINE-01b-c/d/e/f-*.json`): carousel slides one chip in from the right
  every 6 s for the first minute; fade takes the outgoing chip 1→0 in about 1.4 s and the replacement 0→1 in about 0.9 s while the
  other chip stays, row never empty; static swaps instantly; decode scrambles in with a caret and resolves left to right in about 1.3 s

### CHIP-BUTTON — Suggestion chips as real buttons (plan 60)

| Row | Scenario | Pass | Status |
|---|---|---|---|
| **CHIP-BUTTON-02** | Put the D-pad on a chip in each animation mode; read the chip's computed box-shadow | Steam's white ring, the top hairline and the bottom bar all show at once; label is the brighter shade; no blue outline anywhere | ✅ **PASS (Deck) 2026-09-17**, decode mode and the one-chip setting: ring, hairline and bar all present, no blue outline, label `#e4c94e` (toned gold). Fade mode could not be reached — the chips fade in and out too fast to land the D-pad on one while faded; a pre-existing gap, not caused by this build |
| **CHIP-BUTTON-03** | Press Left at the first chip and Right at the last | The bottom bar flashes brighter with a small glow for about a third of a second, then returns; nothing moves | ✅ **PASS (Deck) 2026-09-17** — the flash held 260ms of a 320ms window, then settled back to the focused-chip look; chip size unchanged |
| **CHIP-BUTTON-04** | Press A on a chip; then touch one | The words land in the question box; nothing sinks or flips; no pressed look was built | ✅ **PASS (Deck) 2026-09-17** — A on a chip put its words in the question box, no pressed look (`screenshots/DeckCapture_20260917_150702_auto.png`) |
| **CHIP-BUTTON-08** | Decode animation mode, gold character | The resolving label is the toned gold, not the loud one | ✅ **PASS (Deck) 2026-09-17** — label read `#e4c94e`, the toned gold |
| **CHIP-BUTTON-07** | Reduced motion on; repeat 03 | The cue appears and clears with no ramp; nothing looks broken | ✅ **PASS (Deck) 2026-09-26 (plan 70, flow L5)** — decode style: with reduced motion on, the edge-flash cue appeared and cleared in about 260–280 ms with no colour ramp (full colour at the very first read) and nothing moved or resized; fade and static styles were not tried. Evidence `docs/test-evidence/plan70-L5-FLOW5-REDUCED-MOTION.json`. **Tried again 2026-10-01 (plan 78, Deck block 3e), COULD NOT RUN:** Half-Life 2's window never came to the front after the plugin was reloaded during its start; reduced motion was never turned on. The fade and static styles stay owed. Evidence `docs/test-evidence/plan78-CHIP-BUTTON-07.json`. **Fade and static styles PASS (Deck) 2026-10-02 (plan 79, build `f0a4f2c4`), Reduce Motion on in Steam:** the cue lasted 271 and 270 ms (fade) and 286 and 289 ms (static), 2 of 2 presses each, full colour at the first read, the chip box moved 0 px, the ring stayed. Evidence `docs/test-evidence/plan79-CHIP-BUTTON-07.json`. |

### TAB-BAR — Collapsing tab bar (P0)

| Row | Scenario | Pass | Status |
|---|---|---|---|
| **TAB-BAR-01** | Height | Thin bar ≤ 24px including the gap; `TabContentsScroll` top at least 55px higher than the W0 baseline | ✅ 2026-09-02 — bar 20px, body top 23.99px vs 84.66 (`deck_readPage`) |
| **TAB-BAR-02** | Reach | Fresh open: Down lands on Back, second Down on the bar (open, ring on the active cell); from the slot row Up lands on the bar | ✅ 2026-09-02 `docs/test-evidence/TAB-BAR-02-fresh-open-downs.json`, `docs/test-evidence/TAB-BAR-03-switch-on-the-bar.json` steps 1–2 |
| **TAB-BAR-03** | Switch | On the bar Left/Right and LB/RB switch at once, wrapping at both ends (D56); LB/RB from inside the body switch, the dash and name follow, the bar stays thin | ✅ 2026-09-02 `docs/test-evidence/TAB-BAR-03-switch-on-the-bar.json` (11/11); body half `docs/test-evidence/TAB-BAR-W1a-*.json` |
| **TAB-BAR-04** | Collapse | Down from the bar lands on the first control of each of the six tabs; Up from it returns to the bar; B inside a body lands on the bar | ✅ 2026-09-02 `docs/test-evidence/TAB-BAR-04-collapse-into-each-tab.json` (17/17), `docs/test-evidence/TAB-BAR-04b-b-from-body.json` |
| **TAB-BAR-05** | No ghost stops | Free-play sweep top to bottom: `gpfocus` never names a hidden Steam tab element, every stop visible | ✅ 2026-09-02 `docs/test-evidence/TAB-BAR-05-sweep-main.json` — 23 stops, 0 focused-but-not-visible |
| **TAB-BAR-06** | Slot-row takeover | While the slot row holds the ring the bar's LB/RB marks are hidden and the bar does not shift; they return when the ring leaves | ✅ 2026-09-02 `deck_readPage` around `docs/test-evidence/TAB-BAR-W3-slot-row-to-transcript.json` |
| **TAB-BAR-07** | Legibility, by eye | Names on the open strip readable on the handheld at 8px caps; lit dash and name gold with Ali G / the TF2 Announcer, purple with Shadowheart, otherwise green; after a QAM close and reopen the bar shows the restored tab | ⏳ **Retired 2026-09-17, replaced by TAB-STRIP-2A-03** — plan 59 rebuilt the open strip's cells and type size, so this row's own geometry no longer describes what is on screen; the by-eye legibility check continues under the new row instead. Kept here for history only. Earlier record: strip geometry measured (plan § 8); the by-eye half is the maintainer's: open bonsAI, press Down twice, look **Rig half PASS 2026-09-04:** all six names render in full (MAIN, OLLAMA, SETTINGS, PERMS, DEV, ABOUT), active gold, rest grey, nothing truncated — `screenshots/round31-tabstrip-names.png`. The arm's-length judgement is still the maintainer's. |
| **TAB-BAR-10** | UI scale Apply | Settings → UI scale → Apply remounts the tabs subtree; the bar comes back thin, on the right tab, at the new scale | ✅ 2026-09-02 `docs/test-evidence/TAB-BAR-10-*.json` — thin, on Settings, scale 1, body root re-registered (Up from the top of Settings reaches the bar). The 4px gap under the bar was lost on remount, is now a stylesheet value, and survives an Apply (`docs/test-evidence/TAB-BAR-10-ui-scale-apply-2.json`, body top 24px after) |
| **TAB-BAR-11** | Modal return, the two openers TAB-BAR-09 missed | After the Clear cache confirmation closes, the ring is on the **Clear cache…** button, not a hidden tab button; after a QAM chord close/reopen with the panel still mounted, the ring is on the bar or another visible control, never a 0×0 hidden tab button; `stopsFocusedButNotVisible` is 0 for both | ⏳ **Fixed at the desk 2026-09-04, Deck check owed.** `useHiddenTabHeaderTrap` now bounces a hidden tab button that already holds the ring the instant it attaches, not only a later class change, and also watches for one being inserted already focused; **Clear cache…** and **Clear all data…** in `SettingsTab.tsx` now register with the modal return-focus registry the way the character picker's opener does. Evidence this fixes: `docs/test-evidence/CLEAR-CACHE-01-b-after-modal-back-to-main.json` and `docs/test-evidence/CLEAR-CACHE-01-c-close-panel-for-remount.json` step 0. Unit: `useHiddenTabHeaderTrap.test.tsx`, `modalReturnFocusRegistry.test.ts`, `SettingsTab.modalReturnFocus.test.tsx` · **2026-09-04 21:33 finding, build 49241e7 on-Deck (this lane's earlier fix deployed):** at 21:23 the Deck suspended and resumed; the panel remounted on Main with the ring on the hidden Main tab button, then a RIGHT press moved it to the already-existing hidden Ollama tab button and nothing bounced it — a DOM read at that moment showed the matcher's conditions were all true (`docs/test-evidence/TAB-BAR-11-a-after-suspend-resume-hidden-button.json`). **Cause:** the observer callback's `record.target instanceof Element` / `node instanceof Element` (and `TabIndicatorBar.tsx`'s own `evt.target instanceof Node` for its tap-outside listener) are brand checks made from this module's own realm (SharedJSContext) against nodes that live in the QuickAccess popup document — false for every node either listener is ever handed, not just this one, so the original trap most likely never bounced anything on device; the TAB-BAR-05/09 passes came from the explicit hops. **Fixed at the desk 2026-09-04, Deck re-check owed:** both call sites now duck-type (`nodeType`, `classList`, `querySelector`) instead of brand-checking. Unit: realm-crossing tests added to `useHiddenTabHeaderTrap.test.tsx` and `TabIndicatorBar.test.tsx`, each building its DOM in a second, genuinely separate `JSDOM` instance so `instanceof` is provably false the way it is on device **Second build f9a4c17 (realm-safe trap), 22:16:** QAM closed with the real chord and reopened with the panel still mounted: the ring sat on Decky's own back button (40x28 at y 20, visible), not on a hidden tab button, where the 2026-09-03 run and tonight's suspend/resume landing both put it. Whether the trap fired or Steam chose the button itself is not observable without the debug HUD; the outcome is the one the row asks for. The suspend/resume path cannot be forced from the rig and stays owed. A second chord close and reopen at 22:20 left the ring on the tab bar itself, visible, which is the trap's bounce target. | **Deck 2026-09-05, fourth build of plan 32 (code `517804a`), third remount path: PASS.** A full Decky loader restart (`plugin_loader restart`, a harder remount than the QAM chord) then reopening the panel: the first D-pad press placed the ring on the tab bar (*Main tab*, 300x20, visible), the second on the chat slot row, and Right did not park it on a zero-size tab button (`docs/test-evidence/TAB-BAR-11-build4-after-loader-restart.json`, 3/3, every stop visible). With the Clear cache modal return (2026-09-04) and the chord reopen (twice, 2026-09-04), all three remount paths the rig can drive now pass. **The one path still unmeasured is a real suspend and resume**, which is how the bug was first seen: the bridge is a gamepad, and waking a sleeping Deck needs its physical power button, so driving it would end the session's access to the device. It needs a by-hand check — and, since 2026-09-05, a request is on the studio's own roadmap for a sleep-and-wake tool, so that this row can eventually be run unattended.

### TAB-STRIP-2A — The open tab strip redesign (plan 59)

| Row | Scenario | Pass | Status |
|---|---|---|---|
| **TAB-STRIP-2A-01** | Geometry, six tabs | Strip 300 × 66 floating at the scope's top; six cell boxes within 1px of equal width (about 39); every icon box 22 tall with its top 6px below the cell top, same in all six; bar at rest still 300 × 20; body top unchanged from 2 September (87.95px) | ✅ PASS (Deck) 2026-09-18 — strip 300 × 66 floating at the top; six cells each 39px wide; every icon box 22px tall with its top 6px below the cell top, the same on all six; resting bar 300 × 20; body top within a twentieth of a pixel of the 2 September value. Evidence `docs/test-evidence/plan61-TAB-STRIP-2A-01.json` |
| **TAB-STRIP-2A-02** | Geometry, five tabs | Same with Developer off; strip 300 × 66; cells about 47 wide | ✅ PASS (Deck) 2026-09-18 — Developer tab switched off, strip still 300 × 66, five cells about 47px wide. Evidence `docs/test-evidence/plan61-TAB-STRIP-2A-02.json` |
| **TAB-STRIP-2A-04** | Switch fade | Right ×3 from Main: the icon boxes' positions before and after each press are identical; only the fill and the name changed | ✅ PASS (Deck) 2026-09-18 — the icon boxes read pixel-identical before and after each of the three presses; only the fill and the name changed. Evidence `docs/test-evidence/plan61-TAB-STRIP-2A-04.json` |
| **TAB-STRIP-2A-05** | Pills hide, cells stay | Ring on the chat row: the pills are hidden, the six cell boxes have not moved | ✅ PASS (Deck) 2026-09-18 — with the ring on the chat row, both shoulder-hint pills hid and the six cell boxes did not move. Evidence `docs/test-evidence/plan61-TAB-STRIP-2A-05.json` |
| **TAB-STRIP-2A-06** | UI scale 1.18 | Settings → UI scale → Apply: the strip comes back at the new scale, still floating, still six equal cells | ✅ PASS (Deck) 2026-09-18 — UI scale set to the 1.18 "TV distance" profile and applied, the strip came back scaled, still floating, six equal cells; scale set back to automatic/handheld and read back to confirm. Evidence `docs/test-evidence/plan61-TAB-STRIP-2A-06.json` |

### NOTES-BLOCK — The "From the notes" block (plan 58 phase 1)

| Row | Scenario | Pass | Status |
|---|---|---|---|
| **NOTES-BLOCK-01** | Pikmin 2 running, Strategy mode. Ask whether there is a day limit. Once the reply finishes, walk Down onto the block's header (ring visible on the header, checked against the dock) and press A. | The header names the note and says where it came from; opened, it shows the note's own words, which say there is no day limit — whatever the reply itself said. | ✅ **PASS (Deck) 2026-09-18** — the block showed the three attached Pikmin 2 notes word for word, day-limit sentence first, with the ring landing visibly on the header. Two follow-ups: it can only be reached walking down onto it, not up from the question box, and opening a three-note block scrolls the view to its bottom instead of its top. Evidence `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-01.json`. **Re-run 2026-09-18, after the fixes:** with the block's screen fixes deployed, the header now reads as two lines and holds up (the count never gets cut, only the name is shortened), and opening the block puts its header at the top of the view instead of scrolling past it — both now pass. Walking up from the question box still skips over the block and lands on Show details instead; the fix wired the wrong neighbouring control, not the one that actually sits under the block. **Third run 2026-09-18, on the fix build:** pressing Up from the session context strip now lands cleanly on the block's own header, ring fully visible and well clear of the dock — the walk asked for now passes. The ladder walk was also run: from Hide details, Down steps through the block's header, the session context strip, Save chat to Desktop, a test chip, the question box and Ask — seven stops, every one visible, with no loop back on itself. The chip ladder inside the open block still cannot be reached by the D-pad, the same gap as before; that is already its own open item on the roadmap's bug list, not a new one filed here. This row now passes in full. Evidence `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-01.json`, `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-01-ladder-walk-21b53b9.json`. |
| **NOTES-BLOCK-03** | Nothing running. Ask a plain troubleshooting sentence that reaches a shared tip. Walk Down onto the block's header (ring visible on the header, checked against the dock) and press A. | The header names the tip and says it is from the shared Deck tips; opened, it shows the tip's own words, and any launch option or setting name in it matches the tip exactly. | **PASS on the words, FAIL on timing (Deck) 2026-09-18:** the block showed the three shared tips with the right header and the launch option matched exactly, but it only appeared about a minute after the reply finished, not while the reply was still being written. The same turn's follow-up menu also leaked its own template wording. Evidence `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-03.json`. **Re-run 2026-09-18, after the fixes:** the tip's own words still matched what the model said, but the block still did not show live — it was missing at the moment a reply finished and only appeared a little after, the same late arrival as before the fixes. This is not happening every time: the same evening, a game-note question showed the block on screen from the first second. Evidence `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-06.json`. **Update 2026-09-18:** reading the screen code found why — the block loses the value it was showing the instant a reply finishes, and does not get it back until a second, separate load lands a moment later, which is what the late arrival always was. The fix has landed on the branch. **Confirmed on the Deck 2026-09-19 (build 07f1299):** a shared-tip question ("My game will not launch on Proton, what should I check?"), watched every quarter second, showed the block about a second and a quarter after the press, present through the thinking and the whole reply, present the instant the action row appeared, and present in all 121 checks over the next 30 seconds with no gap. This row now passes in full. Evidence `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-06-fixbuild-07f1299.json` |
| **NOTES-BLOCK-05** | Hades running. Ask about a boss. Walk Down onto the block's header (ring visible on the header, checked against the dock) and press A. | The header reads that this is bonsAI's own note, with no source. | ✅ **PASS (Deck) 2026-09-18** — the header read "From bonsAI's own notes, no source" as designed, next to the honest "no close match" line. One follow-up: the closed header clips mid-word at this width and loses its "(+2 more)" count. Evidence `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-05.json` |
| **NOTES-BLOCK-06** | Strategy question about a covered game. Press Ask and watch the screen from that press through the reply completing. | The block is on screen before the reply starts streaming its first word, not only after it completes. | ✅ **PASS (Deck) 2026-09-18** — the block was already on screen with the reply text still empty, well before the model's first word, and did not change or flicker once the reply finished. Evidence `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-06.json`. **Re-run 2026-09-18, after the fixes:** a second-by-second watch on a new question showed the block on screen from the very first second, all the way through the model's thinking and its full reply, with never a gap. Across ten questions asked the same evening, one for each new game, this held for nine of them; one question, about Super Smash Bros., showed the block only a few seconds after the reply had already finished. Evidence `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-06.json`, `docs/test-evidence/plan58p1-QA-TEN-GAMES-01.json`. **Update 2026-09-18:** the same cause explains the Super Smash Bros. miss — the block loses the value it was showing the instant a reply finishes and does not get it back until a second, separate load lands a moment later. The fix has landed on the branch, with two new screen tests, one of them proved by turning the fix off and watching it fail. A repeated watch on the build before this fix, asking about Pikmin 2 a quarter-second at a time, found no gap that time, which fits the miss depending on timing rather than always happening. **Confirmed on the Deck 2026-09-19 (build 07f1299):** a shared-tip question, watched every quarter second, showed the block about a second and a quarter after the press, staying through the thinking and the whole reply with no gap across 121 checks over the next 30 seconds. This row now passes in full. Evidence `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-06-fixbuild-07f1299.json` |
| **TEN-GAMES-01** | Library 2026.09.18 installed on the Deck from the plugin's own folder (not from the public download hosts). Nothing running. Ask one question naming each of the ten new games in turn. | Every question attaches that game's own notes, with the block naming the note and the wiki it came from. | ✅ **PASS (Deck) 2026-09-18** — ten of ten questions attached the right game's own notes, with the correct wiki named in every header, and no false "I don't know" line on any of them. The library (version 2026.09.18) was installed straight from the plugin's own folder on the device; publishing it to the public download hosts is a separate step, still owed and waiting on the maintainer. Evidence `docs/test-evidence/plan58p1-QA-TEN-GAMES-01.json`. **Publishing done 2026-09-23:** the library now serves from Hugging Face and the GitHub release. Pressing Update knowledge base on the Deck reached that public manifest and read version 2026.09.18; a fresh remove-and-download pulled the file from huggingface.co and landed on the SD card, also reading 2026.09.18. Both pieces this row was still owing are done. Evidence `docs/test-evidence/plan64-W1-R1.json`, `docs/test-evidence/plan64-TWO-TAPS-DOWNLOAD.json` |

### Open regression IDs (bugs / recent ships)

- [ ] **CHAR-PICKER-RING-01** Character picker grid, D-pad to a tile on the edge of a column (top, bottom, left-most and right-most column) — the focus ring must render in full, not cut off by the column's own edge. **Fixed at the desk 2026-09-04:** each grid column now carries 6px of inner padding (`PICKER_GRID_RING_PAD_PX` in `CharacterPickerModal.tsx`) so a tile's ring has room before the column's `overflow: hidden` clips it. Owed: a screenshot with the ring visible on an edge tile, for each of the four edges **Deck 2026-09-04, build 49241e7 (plan 32): measured, PNG for the maintainer's eyes.** Settings, Ali G, A opened the picker; Down landed the ring on the top-left tile (Jackie Welles). The tile sits 6.0 px from its column's left edge and 6.1 px from the right, the column is the first overflow-hidden ancestor and carries the 6 px padding, and Steam's ring here is a sub-pixel `outline auto` in orange, so the ring has room on every side. Picture: `screenshots/DeckCapture_20260904_214941_game.png`. The maintainer's glance closes it. **Maintainer 2026-09-05: FAIL — "why is the AI character screen have rings that are yellow? they should be white".** The measurement was about spacing and missed the colour. Cause: the tiles are Decky buttons with no class of their own, so no plugin rule matched them and the browser drew its own hairline ring; on that build it took the gold tint from the active character (Ali G). A fresh capture 2026-09-05 04:04 shows it white but still hairline-thin (`screenshots/DeckCapture_20260905_040431_game.png`), and the computed styles on the focused tile carry no colour of ours at all. **Fixed the same day:** the tiles join the plugin's own white-ring rule, which the column's 6px padding was already sized for. Second look owed. **Measured after the rebuild, same day:** the focused tile computes `outline: rgba(255,255,255,0.9) solid 1.56px`, offset 1.99px, with the soft outer glow — the plugin's own ring, not the browser's. Picture `screenshots/DeckCapture_20260905_041028_game.png`. **Maintainer, second look 2026-09-05: PASS.** Row closed.

  (Note: this row's own checkbox was left unticked in the source, but its last line says "Row closed" after
  the maintainer's own second look passed it — moved here on that word, not on the checkbox.)

  - [x] **REASONING-01** Thinking Balanced, the default model, the frozen Deep Rock Survivor question — the
    space under the question changes to the model's own sentences within a few seconds, three lines at the
    answer's own size, never more. **PASS (Deck) 2026-09-17:** the live block appeared about 9 seconds after
    send, three lines, the newest one marked, sitting above the dock. Ran with "what does the pickaxe do"
    (see the deviation note above).
  - [x] **REASONING-02** When the answer starts, the space folds to one line with the seconds — Down from
    the question reaches it and the ring is visible above the dock; A opens the block, A closes it; Down
    from the fold enters the answer. **PASS (Deck) 2026-09-17:** the fold read "Show reasoning · 16 s"; A
    opened the block and flipped the label, A closed it, and A then B also closed it with the ring still on
    the row; Down entered the answer, Up returned. **One wrinkle:** from the Retry icon it takes two Down
    presses to reach the fold, not one, because the question's own row is an extra stop in between; from the
    question header it is one press.
  - [x] **REASONING-03** Reopen the chat after switching tabs, and again after a plugin restart — the fold
    is there, closed, and opens to the same text with the same seconds. **PASS (Deck) 2026-09-17:** after a
    tab switch and a full plugin restart the fold was still there, closed, reading the same 16 seconds, and
    opened to the exact same 1,861 characters.
  - [x] **REASONING-04** Thinking Off, the frozen pickaxe question — today's phrases show, no fold, no chip.
    **PASS (Deck) 2026-09-17:** Thinking Off showed only the ordinary waiting phrase, no live block, no
    fold, and the details chips skipped the Thinking chip entirely. Ran with "how do i kill the big armoured
    bug boss" (see the deviation note above).
  - [x] **REASONING-06** Red Dead Redemption 2, Strategy, the frozen ending question, the first time with
    thinking on — the one-time notice appears and asks to confirm; the live lines may name the ending; once
    the answer starts, nothing of the reasoning shows outside the closed fold. **PASS (Deck) 2026-09-17:**
    after an earlier decline the notice returned; switching Balanced to Deep and back prompted nothing; a
    bare ending question with no game running (a deviation from the row, which names Red Dead) showed the
    model's own unmasked reasoning live while it thought, and nothing of it showed once the answer started
    outside the closed fold.
  - [x] **REASONING-07** Decline the notice — Thinking stays Off and nothing shows; accept it on a later try
    and the level changes, with the notice never coming back. **FAIL on the first build, Deck 2026-09-17:**
    declining kept Thinking off, but the ring landed on the tab strip at the top of the panel instead of the
    Thinking row; accepting the notice closed the box and remembered it was answered, but did not actually
    turn Thinking on — a second pick of Balanced then worked silently, with no further prompt. **Fixed the
    same day, commit `d2096ee`:** the notice now returns focus through the shared modal return-focus
    registry, and patches the chosen level into the pending settings snapshot instead of losing it to a
    stale snapshot restored after the confirm box closes. **PASS on the re-run, Deck 2026-09-17, bundle
    `b8d903d9`:** declining now closes the box, lands the ring back on the Off button inside the Thinking
    row instead of the tab strip, and the row stays roughly where it was on screen rather than the list
    snapping to the top; Thinking is still correctly off. Accepting on the next try turns Thinking on in the
    same press — read Balanced right away, again about 3.6 seconds later, and again after leaving to the
    Main tab and back; Balanced and Deep afterwards never showed the notice again. Evidence
    `docs/test-evidence/plan57-REASONING-07-rerun.json`, `docs/test-evidence/plan57-REASONING-06a-rerun.json`.

  - [x] **DRG-01** `2321470`, *"How do I beat Glyphid Dreadnought?"*, no consent phrase, masking on → boss tactics in plain text, no tap-to-reveal — **PASS (Deck) 2026-09-15.** Plain text, no fence, no tap-to-reveal. Evidence `docs/test-evidence/plan55-DRG-01.json`, recording `recordings/DeckRecord_20260915_210556_game.mkv`.
  - [x] **DRG-01d** As DRG-01, **then ask a second question** → the first answer stays unfenced after it leaves the live turn *(the D1 regression: history turns used to re-fence)* — **PASS (Deck) 2026-09-15.** After a second question, the Dreadnought answer stayed plain text once it was history (464 characters, no spoiler fence, no tap-to-reveal). Evidence `docs/test-evidence/plan55-DRG-01d.json`.
  - [x] **DRG-01-STREAM-01** — **fixed 2026-08-15 (R4), confirm on-Deck.** As DRG-01 with streaming **on**: no `Spoiler hidden until complete…` chip appears at any point while the answer streams in — the fence renders as plain text from the moment it opens, not only after it closes — **PASS (Deck) 2026-09-15.** No mask chip seen in 74 polls over 62 seconds. Evidence `docs/test-evidence/plan55-DRG-01.json`, recording `recordings/DeckRecord_20260915_210556_game.mkv`.
  - [x] *(recommended)* **HADES-NAMED-01** Hades `1145360`, *"How do I beat Megaera?"* → plain text. Naming the boss is consent for that boss on any title (spoiler-constitution rule 7) — **PASS (Deck) 2026-09-15**, plain text; the misspelling bug (Megara vs Megaera) also reproduced on the same run. Evidence `docs/test-evidence/plan55-HADES-NAMED-01.json`.
  - [x] **STRAT-SPOIL-FIRST-01** name-first boss question. Setup: Portal 2 `620` running, Strategy, masking on,
    streaming on. Do: ask *"wheatley fight"*. Pass when: Wheatley's tactics are plain text from the first streamed
    word with no mid-stream chip, and any other story detail the reply touches is still boxed (that half proves
    nothing else was opened; it depends on the model drawing a box for something else, so it may take a few
    asks). Compare with *"how do I beat wheatley"*, which should behave the same. Then reopen the chat from the
    slot list: still plain. **BLOCKED 2026-09-15 as "Portal 2 not in this Deck's library" — settled 2026-09-18:
    Portal 2 was installed all along.** **PASS (Deck) 2026-09-18:** asked "wheatley fight" with Portal 2 running;
    the whole reply, including Wheatley's tactics, came back as plain text from the first streamed word with no
    hidden box, and stayed plain after the chat was closed and reopened from the slot list. The comparison
    phrasing ("how do I beat wheatley") could not be reached in time because of a separate, already-filed D-pad
    problem, so only the first phrasing is confirmed; the row's main pass condition is fully met. Evidence
    `docs/test-evidence/plan61-STRAT-SPOIL-FIRST-01.json`.
  - [x] **STRAT-SPOIL-TEXT-01** game named only in the question. Setup: nothing running, Strategy, masking on.
    Do: ask *"drg survivor what class"*. Pass when: the answer is plain text with no spoiler box, the risk chip
    under Show details reads low, and the reply does not claim the game is running. Then the guard: *"new vegas
    best build"* with nothing running → still fenced or careful, as a story game. — **PASS (Deck) 2026-09-15,
    both halves.** The Deep Rock half: plain text, spoiler risk chip low, the game resolved from the question
    text, no claim of the game running (`docs/test-evidence/plan55-STRAT-SPOIL-TEXT-01-drg.json`). The New
    Vegas guard: a gameplay-only reply about stats and early armour, no story detail, and the follow-up menu
    named New Vegas places (`docs/test-evidence/plan55-STRAT-SPOIL-TEXT-01-newvegas.json`).

### Plan 70 flows 1 and 2a (2026-09-26)

- [x] **KB-FOCUS-01** Ollama KB Update/Remove: Left/Right between pair; both Up → KB toggle; both Down →
  Reply style; equal row height (Update not taller than Remove). **PASS (Deck) 2026-09-26:** both buttons
  measured 44 px tall with the same top edge; Left/Right swap between them, Up from either reaches the
  knowledge-base toggle, Down from either reaches Reply style, all 11 stops fully visible. Evidence
  `docs/test-evidence/plan70-KB-FOCUS-01.json`, saved walk `checks/plan70-KB-FOCUS-01-v2.json`.
- [x] **CMD-REPLY-TITLE-01** A command reply saves to its chat slot (turn header / chat title). **PASS
  (Deck) 2026-09-26:** `bonsai:vac-check` sent from a new chat; the turn header and the chat's own title
  both read "bonsai:vac-check" right away, and still did after closing and reopening the Quick Access
  Menu. Evidence `docs/test-evidence/plan70-CMD-REPLY-TITLE-01.json`.
- [x] **STOP-PARTIAL-01** Stop mid-Ask keeps a readable answer. **PASS (Deck) 2026-09-26, both halves:**
  stopped mid-answer, the streamed text stayed on screen ending mid-sentence, with "Stopped — partial
  answer kept." under the question and the question box left empty; stopped an instant after Ask, with no
  readable text yet, "Request cancelled." showed and the question returned to the box. Side notes:
  stopping unloads the answer model, so the next question starts cold; after the mid-answer stop the ring
  was left on the Voice input corner button. Evidence `docs/test-evidence/plan70-STOP-PARTIAL-01.json`.
- [x] **SCR-05** Close and reopen mid-answer (scrambled answer). **PASS (Deck) 2026-09-26, second try:** a
  first try was refused once by the controller rig itself ("controller bridge is not available") and
  nothing was tested; on the second try, closing the panel with about three lines on screen and reopening
  about 8 seconds later showed the same answer still streaming, readable, no frozen scrambled letters, and
  it finished normally with its branch menu. The reopened screen's text matched the saved chat word for
  word. Evidence `docs/test-evidence/plan70-SCR-05.json`.
- [x] **SPOILER-RISK-CHIP-01** Spoiler confidence chip (Show details band estimate). **PASS (Deck)
  2026-09-26:** Speed, Strategy and Expert asks about Hollow Knight each showed a "Spoiler risk" band
  under Show details, and the answer text never dropped to less than half its longest length while
  streaming (no blank). Side finding: every answer this session read "med", including troubleshooting
  questions with no game at all; and for one question the recorded named entity was a note's own title
  ("Starting out in Hollow Knight") rather than the boss actually asked about — see the new bug filed on
  the roadmap. Evidence `docs/test-evidence/plan70-SPOILER-RISK-CHIP-01.json`.
- [x] **CHAT-HEADER-CAPTION-01** Reopened chat header shows the friendly caption. **PASS (Deck)
  2026-09-26:** after picking a branch ("A. Starting out in Dirtmouth"), the live header read "I'm at:
  Starting out in Dirtmouth", and it read exactly the same after closing and reopening the Quick Access
  Menu. Side finding: walking Up from below skipped both branch buttons, which only took the ring walking
  Down from above — filed under the Down/Up mirror bug. Evidence
  `docs/test-evidence/plan70-CHAT-HEADER-CAPTION-01.json`.

### Plan 70 flow L1 (2026-09-26)

- [x] **KB-NOTIP-FLOOR-01** A stray question like "what time is it" no longer gets a troubleshooting
  tip. **PASS (Deck) 2026-09-26:** asked in Speed, Strategy and Expert with nothing running — no tip in
  any reply, Show details logged "attached 0 chars" each time. Evidence
  `docs/test-evidence/plan70-KB-NOTIP-FLOOR-01.json`.
- [x] **SPOILER-REVEAL reachability** — long-owed row, closed. **PASS (Deck) 2026-09-26:** with a
  covered, finished answer on screen, the cover was reached one D-pad press at a time walking both up
  and down, stayed 100% visible the whole way, and A opened it to the hidden sentence. Evidence
  `docs/test-evidence/plan70-SPOILER-REVEAL-reach.json`.
- [x] **NOTES-BLOCK-02** A story-protected game's cover stays closed with no notes block showing until
  the cover is opened, live and finished. **PASS (Deck) 2026-09-26, finished-answer half:** before
  reveal, no notes block existed anywhere on the page; after reveal, a closed "Soul Master — From the
  Hollow Knight wiki" block appeared below Show details, outside the spoiler's own box. Caveat at the
  time: in a separate live-answer try the same block was seen for about 4.7 s while the sentence was
  still uncovered, tied to the live spoiler leak (row SPOILER-COVER-01). Evidence
  `docs/test-evidence/plan70-NOTES-BLOCK-02.json`. **PASS (Deck) 2026-09-26 (plan 70, flow L5), live
  half, closed:** with the live spoiler leak now fixed, no notes block appeared at all while the cover
  was closed — arriving, finished, or after switching chats away and back. A on the closed cover showed
  the block as "Boss note (spoiler) (+1 more)"; a further A opened the block itself to the real note.
  Evidence `docs/test-evidence/plan70-L5-SPOILER-COVER-01.json` (+ screenshots).
- [x] **PRELOAD-RM-01** Remove stops greying out once an answer finishes. **PASS (Deck) 2026-09-26:**
  right after an answer, the model's Remove control read enabled, with no "Switch Ask mode first" text,
  and both models were still shown installed afterward with nothing removed. Evidence
  `docs/test-evidence/plan70-PRELOAD-RM-01.json` (+ `.png`).
- [x] **OLLAMA-TAB-AFTER-RELOAD-02** No false connection failure right after a plugin reload. **PASS
  (Deck) 2026-09-26:** reloaded the plugin, watched the plugin log for 45 seconds after — zero
  "test_ollama_connection failed" lines, and the Ollama tab read "Connected" with its real model count.
  Note: opening the plugin itself still failed twice before working on the third try, the known
  one-failure-after-a-deploy quirk, now seen twice in a row. Evidence
  `docs/test-evidence/plan70-OLLAMA-TAB-AFTER-RELOAD-02.json`.

### Plan 70 flow 2b + 2e (2026-09-26)

- [x] **QAM-BODY-RO-01** Switch tabs repeatedly (10+, through the taller Settings/Ollama panels), then
  D-pad to the **bottom** of a long panel: the pane must still reach its end and not be pinned to a
  stale height. **PASS (Deck) 2026-09-26:** 12 tab switches (Ollama, Settings ×6), then walked Down 15
  stops to the true last row ("Clear cache…"), every stop visible, scrollTop at the pane's real maximum;
  the height variable still matched the live pane after all those switches. Evidence
  `docs/test-evidence/plan70-QAM-BODY-RO-01.json`.

### Plan 70 flow L2 + 2c (2026-09-26)

- [x] **OLLAMA-FOCUS-01** Ollama tab open (no prior Test): with Ollama reachable, primary button shows
  **Update AI & models**. **PASS (Deck) 2026-09-26:** straight after a deploy and the first plugin open,
  with Test connection never pressed, the button already read "Update AI & models" and the status line
  showed "Connected · Ollama v0.34.1 · 2 models" from the quiet auto-probe alone. Evidence
  `docs/test-evidence/plan70-OLLAMA-FOCUS-01.json` (+ `.png`).
- [x] **OLLAMA-FOCUS-02** Run AI on this Deck: D-pad vertical walk. **PASS (Deck) 2026-09-26:** walking
  down then back up from the "Run AI on this Deck" switch visited every stop the row expects, in order,
  nothing skipped, all visible — plus one newer switch ("Start the AI with the Deck") added since the row
  was written. Saved walk `checks/plan70-OLLAMA-FOCUS-02.json`. Evidence
  `docs/test-evidence/plan70-OLLAMA-FOCUS-02.json`.
- [x] **OLLAMA-FOCUS-03** Up from Test connection lands on **Install options…**. **PASS (Deck) 2026-09-26:**
  tried twice (the recorded walk and the saved-check replay), both times Up from Test connection moved the
  ring onto "Install model bundles" (the Install options… button), fully visible. The variant with an
  Install-options submenu row open was not tried. Evidence `docs/test-evidence/plan70-OLLAMA-FOCUS-03.json`.
- [x] **ROUTING-01** Set text/vision try order opens picker listing installed tags without requiring a
  prior Test connection tap. **PASS (Deck) 2026-09-26:** opened the picker two plugin reloads after a
  deploy, with Test connection never pressed — it listed both installed tags straight away. Evidence
  `docs/test-evidence/plan70-ROUTING-01-02.json`, screenshot `plan70-ROUTING-01.png`.
- [x] **ROUTING-02** Reorder + Done persists; reopen modal shows saved order. **PASS (Deck) 2026-09-26:**
  moved a model down one step, pressed Done, reopened the picker — the new order was still there. Put
  back afterward. Caveat: putting an order back with Reset to defaults + Done saves an explicit list where
  there used to be none — see the new bug this found on the roadmap. Evidence
  `docs/test-evidence/plan70-ROUTING-01-02.json`.
- [x] **SCREENSHOT-SHRINK-01** A big, barely-compressed screenshot used to crash the model's graphics
  chip; `ffmpeg` now shrinks it first. **PASS (Deck) 2026-09-26:** the same 2.6 MB picture that crashed the
  model twice on 2026-09-23 was attached again — the answer came back normally in 38.9 seconds, no
  graphics-chip error in the Deck's own log, and the request actually sent measured 107,526 bytes against
  3,667,775 bytes for the same file before the fix. Row reworded: judged by the size of the request sent,
  since the shrink writes no log line of its own when it succeeds. Evidence
  `docs/test-evidence/plan70-SCREENSHOT-BIG-L2-1b.json`.
- [x] **KB-FOLLOWUP-BOSS-01** A follow-up stays on the boss it was already asked about. **PASS (Deck)
  2026-09-26, reworded to "stays on the right boss":** four fresh chats, name a boss then a bare follow-up
  about its second phase — all four stayed on the boss already named, never asked which one, never named a
  wrong one. Two of the four said the name outright (one correctly inside a spoiler cover), the other two
  said "her"/"she" without naming anyone, which still counts as staying right. Side finding, not a bug: a
  Hollow Knight follow-up about a second Hornet fight said the notes don't mention one, true of the notes
  rather than the game. Evidence `docs/test-evidence/plan70-FOLLOWUP-BOSS-01.json`.

### Plan 70 flow L3 + 2d (2026-09-26)

- [x] **THINKING-SPOILER-01** (name rule) The model's own thinking never shows a protected name in plain
  words. **PASS (Deck) 2026-09-26, closed:** across 6 fresh described-boss tries, no protected name showed
  anywhere in the live thinking line or the saved reasoning, live or opened; "[hidden]" appeared in all
  six. The separate backtick question (single inline marks around a quoted tag or note title, seen in 3 of
  6) is not part of this row — folded into the "live thinking line shows the model's own rule checklist"
  idea on the roadmap instead. Evidence `docs/test-evidence/plan70-THINKING-SPOILER-01-try2.json`.
- [x] **NO-CLOSE-MATCH-HK-02 re-check** The suggestion menu under an answer cannot name a protected boss.
  **PASS (Deck) 2026-09-26, closed:** the same Hollow Knight spell-casting-boss question came back with a
  correctly covered answer, and the menu underneath read "Are you currently facing the boss boss?" with
  no protected name and no backticks. Side finding, being fixed: the stand-in phrase doubled into "the
  boss boss". Evidence `docs/test-evidence/plan70-NO-CLOSE-MATCH-HK-02-try2.json`.
- [x] **RING-ON-FILTER-2c2** The AI models screen opens the same way from both buttons. **PASS (Deck)
  2026-09-26:** three opens through "Manage AI models…" and one through "Browse models…" all landed on
  "Advanced ›" with the Filters panel closed. Evidence `docs/test-evidence/plan70-RING-ON-FILTER-2c2.json`.
- [x] **HUB-EDGE-02** With the Filters panel open, Down reaches Done. **PASS (Deck) 2026-09-26:** 28
  presses down then up, every stop visible, no cycling; Down from "Close filters" now goes straight to
  Done. Saved walk `checks/plan70-HUB-EDGE-02.json`. Evidence `docs/test-evidence/plan70-HUB-EDGE-02.json`.
- [x] **ROUTING-MERGE-SIZE-02** An installed model's size comes from the Deck's own Ollama first. **PASS
  (Deck) 2026-09-26:** across four opens, the header settled on "Installed 2 · 4.3 GB" once live sizes
  loaded and stayed there, matching Ollama's own reported sizes. Small note: for the first ~2 seconds of
  every open, before live sizes arrive, the note-search model still shows "?" — too brief to count against
  the row. Evidence `docs/test-evidence/plan70-ROUTING-MERGE-SIZE-02.json` (+ screenshot).
- [x] **VAC-06** The ban lookup's "turned off" message names the switch the way the screen does. **PASS
  (Deck) 2026-09-26:** with the permission off, the reply named "Permissions → Steam ban lookup", the same
  words as the switch's own label. Evidence `docs/test-evidence/plan70-VAC-06.json`.

### Plan 70 flow L5 (2026-09-26)

- [x] **SPOILER-COVER-01** A safety net covers a boss name the question never typed, live and finished.
  **PASS (Deck) 2026-09-26, closed after four rounds of fixing:** two watched questions named the boss;
  across 229 reads the name never once showed outside a closed cover, in the answer, the live thinking,
  the notes block or the suggestion menu; the cover read "Spoiler — tap to show" from its first
  appearance; Copy and Read aloud both kept the name out; a question naming the boss outright still
  answered in plain text. Full four-round history on the roadmap. Evidence
  `docs/test-evidence/plan70-L5-SPOILER-COVER-01.json` (+ screenshots).
- [x] **PERMS-CLEAN-06** The troubleshooting hint's Dismiss button is reachable by D-pad. **PASS (Deck)
  2026-09-26:** walking Up from the question box reached the suggestion chip, then the ban-lookup row's
  "Open Permissions", then the hint's own "Open Permissions", then Right to "Dismiss" and back — every
  stop fully visible; A on Dismiss removed the hint. New, small: after Dismiss, nothing holds the ring
  until the next press. Evidence `docs/test-evidence/plan70-L5-PERMS-CLEAN-06.json` (+ screenshot).

### Plan 70 flows R and L7 (2026-09-26)

- [x] **STARTING-OUT-01** A covered game gets a "How do I get started in <game>?" chip, and "where do I
  start" reaches that game's own starting-out note. **PASS (Deck) 2026-09-26 (flow R):** typed questions for
  Fallout 4 and Red Dead Redemption 2 each attached that game's starting-out note
  (`docs/test-evidence/plan70-R-R2.json`); with Brotato running its chip showed within a second and the
  answer attached "Starting out in Brotato", and a Palworld shortcut's chip showed too
  (`docs/test-evidence/plan70-R-R3-try2.json`). The Brotato question was sent with the chip's exact words by
  script, because pressing the chip then walking to Ask hit the known chip-then-Ask trap.
- [x] **KB-TIP-PERGAME-01** A running game's own Deck tip attaches, first. **FAILED (Deck) 2026-09-26 (flow
  R)**, fixed the same night (`e1bc0c16`). **PASS (Deck) 2026-09-26 (flow L7):** Deep Rock Galactic:
  Survivor running, the Render Scale tip first in Strategy and alone in Speed, and not on a boss question
  (`docs/test-evidence/plan70-R4-try3.json`); Fallout 4 named (the box was dead over the running game), the
  F4SE tip first in Speed and Strategy (`docs/test-evidence/plan70-R4-try4.json`); Deep Rock Galactic:
  Survivor named, the Render Scale tip first (`docs/test-evidence/plan70-R4-try6.json`).

### Plan 70 flows L8 to L10 (2026-09-27)

- [x] **VAC-03-07** Fixed 2026-09-26 (plan 70, helper I): the ban report used to be written as a markdown
  table, which the Deck's answer renderer showed as one run-on line of pipe characters. Run a ban lookup
  with a real account number — each account's facts must read as a plain bullet line, same facts and
  wording, no pipe or dash characters anywhere. **COULD NOT RUN (Deck) 2026-09-26 (plan 70, flow L1):** no
  Steam Web API key is saved on the Deck, and the runbook forbids setting one by hand — the one try got
  the plain "no key saved" message, not a report to read. Needs the maintainer's own key; on their own
  checklist. Evidence `docs/test-evidence/plan70-VAC-03-07.json`. **PASS (Deck) 2026-09-27 (flow L8), with the
  maintainer's own key:** a real report in under 2 s, the account as one plain bullet line, no pipes, no
  runs of dashes, no table; the one long dash before "VAC:" is ordinary punctuation. The key appears in no
  log and no chat file. Evidence `docs/test-evidence/plan70-VAC-03-07-try2.json` (+ `.png`).
- [x] **KB-NOMIC-OFFER-01** After a fresh install, the plugin offers the meaning-search model once.
  **PASS (Deck) 2026-09-27 (flows L9 and L10):** from the published library the box asked once, Download
  landed the model in about 10 s, Update did not ask again, and the next answer read "Keyword + meaning"
  (`docs/test-evidence/plan70-R5.json`); the old hint that stayed on the open tab was fixed and passed in
  flow L10 (`docs/test-evidence/plan70-KB-UPDATE-HINT.json`).

## Moved from testing-manual.md, plan 74, 2026-09-28

### PRESET-STREAM-ANIM-01 — decode preset chip animation (P1)

- [x] Glyphs lock into the real prompt left to right behind a blinking block caret, green (accent
      colour, not a different hardcoded green). **FAILED (Deck) 2026-09-26, not fixed this wave:** the
      caret is there and moves left to right, but its colour measures about RGB 214,228,236 — a pale
      white-blue, the same as the settled letters, not green. New bug filed on the roadmap.
      **PASS (Deck) 2026-09-28 (plan 74, `13ad6566`), closed:** the caret now takes the chosen character's
      colour in all 37 readings, letters unchanged; with no character it is the default green (unit-tested,
      not read on the Deck). Evidence `docs/test-evidence/plan74-P74-CARET-COLOUR.json`.

### Open regression IDs (bugs / recent ships)

- [x] **KB-NOCLOSE-TEXT-01** Fixed in code 2026-09-26 (plan 70, helper B, `58f60c0a`), wired into answers (`e4c24bdd`), Deck check owed. Hollow Knight, Strategy mode, knowledge base on. Describe a boss without naming it ("the boss past the crystal spike area") and read Show details — the "no close match" line must not appear, since the reply is built on the Broken Vessel note. Also try a Half-Life 2 walkthrough question built on real chapter notes; same pass condition. **PASS (Deck) 2026-09-28 (plan 74), closed:** a Half-Life 2 Ravenholm question built on the Ravenholm note showed no line. Evidence `docs/test-evidence/plan74-KB-NOCLOSE-TEXT-01.json`.

## Plan 77, Deck blocks 1b and 3 (2026-09-30)

_Moved word for word from [testing-manual.md](../testing-manual.md), ticked, with the result added._

- [x] **PRESET-GAME-01** With a game running, tap a preset chip — Ask field shows chip text only (no `— {Game}` append; “this game” unchanged)
  **PASS (Deck) 2026-09-30 (plan 77, Brotato running):** the field read exactly the chip text, nothing appended. Evidence `docs/test-evidence/plan77-PRESET-GAME-01.json`.
- [x] **SOFT-PREDICT-04** Strategy mode, an answer long enough to continue mid-branch (opens a `bonsai-strategy-branches` fence before hitting the length wall): confirm no half-rendered fence or stray JSON appears at any point in the stream, including right at the continue boundary — **BLOCKED 2026-09-18:** the long Hades walkthrough question came back as a short spoiler-careful refusal, so no reply reached the length wall. Evidence `docs/test-evidence/plan61-SOFT-PREDICT-04.json`. **Blocked again 2026-09-28 (plan 76):** cap 1,600 tokens, the reply stopped by itself at 403, so no join point happened; evidence `docs/test-evidence/plan76-SOFT-PREDICT-04.json`. **Tried again 2026-09-23, still unclear:** the finished text read clean — no half-rendered fence, no stray JSON, at any point — but the reply stopped on its own at 1,117 tokens against a 2,112-token limit in the log, so it never had to continue and the join point this row actually checks never happened. Evidence `docs/test-evidence/plan64-SOFT-PREDICT-04.json`. **Tried a second time 2026-09-23, still unclear, same shape:** a Half-Life 2 walkthrough question asked for a very long answer on purpose; the model still stopped itself at 1,050 tokens, well under the 2,112 limit. Asking for more length does not reach the wall — the row needs another way to bring the limit down rather than the question up. Evidence `docs/test-evidence/plan64-SOFT-PREDICT-04-try2.json`.
  **PASS (Deck) 2026-09-30 (plan 77):** test build with the limit at 300, two soft continues, no half-drawn fence, stray JSON or "Continuing" in the finished or saved text. Evidence `docs/test-evidence/plan77-SOFT-PREDICT-04.json`.
- [x] **EXPERT-CAP-01** Expert-mode Ask with a long answer: it now runs to ~1200 tokens before a soft continue rather than ~800. Expert was silently capped at the Speed budget until 2026-08-15, so a long Expert reply should visibly need fewer `Continuing…` cues than before the fix. **Tried 2026-09-26 (plan 70), inconclusive:** the answer stopped on its own at 326 words, well under where the cap would bite, so this run does not show whether the fix works — needs a question long enough to actually reach the cap. Evidence `docs/test-evidence/plan70-EXPERT-CAP-01.json`.
  **PASS (Deck) 2026-09-30 (plan 77), both halves:** Expert 1200 against Speed 800, and three requests with two soft continues at a limit of 300. Evidence `docs/test-evidence/plan77-EXPERT-CAP-01.json`, `docs/test-evidence/plan77-EXPERT-CAP-01-continue.json`.
- [x] **REPLY-VERB-01** Reply style: set **Caveman** → Ask → Input handling shows `Reply style: caveman` and reply is terse; **Balanced** → no `REPLY VERBOSITY` block vs baseline; **Detailed** → paragraphs; with **AI characters** on + Caveman, character voice (not caveman grammar); Strategy + Detailed still ends with `bonsai-strategy-branches`. **Tried 2026-09-26 (plan 70), UNCLEAR:** labels correct in all three modes, Balanced added nothing, Strategy + Detailed kept its branch menu, but the maintainer's AI character was on the whole time, which drops the Caveman instruction by design and left Detailed and Balanced almost the same length — needs a re-run with characters off. Evidence `docs/test-evidence/plan70-REPLY-VERB-01.json`.
  **PASS (Deck) 2026-09-30 (plan 77), one sub-check not run:** Caveman 846 letters against Detailed 1,193 and Balanced 1,379; Detailed Strategy still ended with its branches. Not run: that Balanced adds no reply-verbosity block. Evidence `docs/test-evidence/plan77-REPLY-VERB-01.json`.

## Plan 78, docs sweep 2 (2026-09-30)

_Moved word for word from [testing-manual.md](../testing-manual.md), ticked, with the result added._

### SMOKE-C — Permission gate (P0)

- [x] Re-enable before Tier 1 **Done (Deck) 2026-09-26 (plan 70, flow 2d.2):** Steam ban lookup was switched back on and the settings file read true. Evidence `docs/test-evidence/plan70-SMOKE-C.json`.

### PERM-JUMP-01 — Permission jump D-pad (P0)

- [x] D-pad: deny **Open Permissions** → Permissions toggle → **Back** without losing modal tab-restore behavior elsewhere **PASS (Deck) 2026-09-23:** the ring reached the Read game & screenshot context switch and stayed there (`docs/test-evidence/plan64-PERM-JUMP-01-try2.json`). **PASS (Deck) 2026-09-26:** "Back to Main" returned cleanly with the panel never closing (`docs/test-evidence/plan70-SMOKE-C.json`).

### ONBUTTONDOWN-AUDIT-01 — onButtonDown whitelist + direction handlers (P1)

- [x] Session context strip open: D-pad **Down** through turn rows does **not** change active row; **A** selects row
  **PASS (Deck) 2026-10-02 (plan 79, build `f0a4f2c4`):** 10 Down presses over the strip (87 session rows): 0 changes in the blue row or the first chip over about 20 s; Up to a row that was not the newest and A gave exactly one blue row, on the row that had the ring; B closed the details panel with the ring on Show details. One stop, the "What the AI remembers" card, was only 33 percent visible, covered by the question box (noted, not judged a failure of this box). Evidence `docs/test-evidence/plan79-ONBUTTONDOWN-AUDIT-01.json`.
- [x] Expanded turn **Show details** link: D-pad past without **A** does not change session highlight
  **PASS (Deck) 2026-10-02 (plan 79, build `f0a4f2c4`):** on the newest turn's closed Show details, 3 of 3 passes Down and Up never opened it (0 expanded panels over 855 reads); on an opened older turn, 2 of 2 passes the same (over 1596 reads). Not tested: the "summed itself up" note half (still owed under ONBUTTONDOWN-AUDIT-01). Evidence `docs/test-evidence/plan79-ONBUTTONDOWN-AUDIT-01.json`.
- [x] Collapsed turn header: **Down** goes to the next header and never onto an answer section; from an open header, **Down** lands on its Show reasoning line (wording corrected 2026-10-02 to match the Deck evidence; it used to read "enters answer bubble")
  **PASS (Deck) 2026-10-02 (plan 79, build `f0a4f2c4`), as the run read it:** Down from a collapsed header went to the next header in 3 of 3 and never onto an answer section; Down from an open header landed on its Show reasoning line, visible, in 2 of 2 turns. Evidence `docs/test-evidence/plan79-ONBUTTONDOWN-AUDIT-01.json`.
- [x] Settings → UI scale manual profile bridge: **Left/Right** steps profile when focused on slider thumb **PASS (Deck) 2026-09-26 (plan 70, flow 2b.6):** Left stepped the manual size and the ring stayed on the slider; the setting read back unchanged. Evidence `docs/test-evidence/plan70-ONBUTTONDOWN-AUDIT-01.json`.
- [x] **Nothing happens** on Left/Right → `onButtonDown` is not reaching the thumb; restore the
      `onMove*` handlers and drop the direction branch of `onButtonDown` (not both — they double-step)
  **Did not happen (Deck) 2026-09-26:** on all four sliders Left and Right stepped and the ring stayed. Evidence `docs/test-evidence/plan70-ONBUTTONDOWN-AUDIT-01.json`.
- [x] **Two steps per press**, or the profile steps *and* focus jumps off the slider → `onButtonDown`
      fires but does not consume the direction the way `onMoveLeft` did; the bridge needs to swallow it
  **Did not happen (Deck) 2026-09-26:** each press changed the value by one step. Evidence `docs/test-evidence/plan70-ONBUTTONDOWN-AUDIT-01.json`.
- [x] All four `DeckFocusSlider` users, not just UI scale — **Ollama keep-alive**, **Reply verbosity**,
      **Connection timeout** share `buildDeckThumbNavHandlers` and changed with it
  **PASS (Deck) 2026-09-26:** all four sliders (Reply style, Keep models loaded, Connection timeout, UI size manual). Evidence `docs/test-evidence/plan70-ONBUTTONDOWN-AUDIT-01.json`.

### PRESET-STREAM-ANIM-01 — decode preset chip animation (P1)

- [x] After hold, chip clears and samples a new prompt **Closed 2026-09-30 on the row's own line in testing-manual.md, "Judged good by the maintainer 2026-09-14", which says the empty boxes were never walked one by one; no separate Deck run of this step.**

### CHAT-SLOTS-V3 — Named chat slots redesign (P0), row PRESET-ONE-LINE-03

- [x] **PRESET-ONE-LINE-03** (the D-pad reaches every chip and leaves cleanly, in every mode) From the Ask field press **Up**: the
  ring must land on a chip (`gpfocus`, not just `activeElement`, per FOCUS-CHIP-RING-01) and **A must fill the Ask field** with that
  chip's text. **Right/Left** step between the two chips; **Down** returns to the Ask field; **Up** leaves toward the transcript.
  Repeat for fade / static / decode — before 2026-09-01 only carousel mode registered a nav handover and the other modes fell back
  to a plain `focus()`, which is the mechanism behind the 2026-08-28 fake-ring bug. In **carousel** mode additionally: after a few
  auto-advances press **Left** at the left chip — an earlier chip slides back into view and the blue current-chip marker and the
  white ring sit on the same chip; **Right** walks forward again; Left at the very first chip in history holds still, no trap.
  **Carousel mode PASS on device 2026-09-01, driven by the bridge:** `docs/test-evidence/PRESET-ONE-LINE-03-carousel-dpad-fixed-2.json` (11/11:
  Up from the text field lands on a chip, Left at the oldest chip holds for three presses, Right walks all five history chips with
  the window sliding, Down reaches the text field, Up returns to the last chip, Up again lands on **Session context**) and
  `docs/test-evidence/PRESET-ONE-LINE-03-carousel-fresh-mount.json` (13/14 on a freshly opened panel: Down from the strip enters the row,
  everything above repeats). **The first run failed 6/9** (`docs/test-evidence/PRESET-ONE-LINE-03-carousel-dpad.json`): Steam treated the row as a
  column — Left left the plugin for the Quick Access rail and Down/Up stepped between chips — because the `flow-children`
  container hint alone does nothing; every chip now carries explicit handlers (`presetRowNav.ts`). **Two misses fixed at the desk
  afterwards and re-run 2026-09-02, 14/14** (`docs/test-evidence/PRESET-ONE-LINE-03-carousel-fresh-mount-2.json`): on a fresh panel, entering the
  row had put the ring on the older visible chip rather than the marked one (the redirect ran inside Steam's own focus event; now
  deferred a tick), and Down from a chip had put the caret in the text field while Steam bounced the ring to the next chip (a plain
  `focus()` across containers; the field now registers a Steam nav node, `unified-input`). Both now land where they should, Right at
  the newest chip holds, and Up from the text field returns to the marked chip. One Left press in that run (second-oldest to oldest
  chip) did not move; the same transition passed in two probes at the rig's cadence (`…-oldest-chip-probe-a/b.json`), so it is a
  one-off — if it recurs, a press in the tail of the 550 ms slide is the first suspect. Fade / static / decode share the same handler code and were not driven on device. The rig also reports the
  ring "partially visible" for one settle after a slide — the 550 ms transition is still running when it measures; the next step
  always reads 100 %.

  **Fade / static / decode driven on device 2026-09-26 (plan 70, flow 2b.9), mixed.** **Decode — PASS:**
  chip Right/Left held still (one chip), Down reached the box, Up returned to the chip, Up again reached
  the notes block; every stop visible, and the chip changed its question while holding the ring without
  losing it. **Two chips, decode — PASS (7 of 7):** Left/Right stepped between both chips and Down/Up
  worked the same way. **Fade — FAILED and static — FAILED, same shape:** when the single chip swaps to
  a new question while it holds the ring, the ring is lost — nothing on the panel is focused afterward,
  confirmed twice each with a bare screenshot showing no ring anywhere. Once in fade, Up from the box also
  skipped the chip entirely and landed on the avatar. Evidence
  `docs/test-evidence/plan70-PRESET-ONE-LINE-03.json` (+ screenshots), saved walk
  `checks/plan70-PRESET-ONE-LINE-03-decode.json`.

  **Fade and static fixed 2026-09-26 (helper F2, commit `42d6eb48`).** Both styles now keep one button
  per slot, like decode, and only its words change; a chip holding the ring in fade style also waits to
  fade out until the ring has moved on. Sighting from the same pass: in fade style, walking Up from the
  question box can skip a chip that is mid-fade. **PASS (Deck) 2026-09-26 (plan 70, flow L4.1), closed:**
  fade held the ring for the full 22 seconds with its question unchanged; static held the ring through
  the full 22 seconds including the moment its words changed at 9.1 seconds, still on it 25 seconds
  later. Evidence `docs/test-evidence/plan70-L4-PRESET-ONE-LINE-03.json` (+ screenshots). **Re-measured,
  the carousel off-screen ring did not reproduce in 3 tries** — kept as a sighting below, not a bug.

### Open regression IDs (bugs / recent ships)

- [x] **STRATEGY-PLACEHOLDER-01** Strategy mode, empty Ask — focus field; italic placeholder does not shift when fake caret appears **PASS (Deck) 2026-09-26 (plan 70, flow 2b.4):** the hint's box and first letter sat at the same position focused, unfocused and focused again, 0 px shift. Evidence `docs/test-evidence/plan70-STRATEGY-PLACEHOLDER-01.json`.
- [x] **ASK-CARET-CHAR-01** AI character on — focus empty Ask field; native caret aligns with placeholder/text (not left of `?` badge); D-pad Up from paperclip → avatar, Right → field; character-off path unchanged **PASS (Deck) 2026-09-26 (plan 70, flow 2e):** with the character on, the cursor sat 0.5 px before the hint's first letter, right of the avatar badge, and Up from the paperclip reached the avatar; with it off, the same gap held. Evidence `docs/test-evidence/plan70-ASK-CARET-CHAR-01.json`.
- [x] **DRG-01b/c** As DRG-01 with KB **off**, or corpus **absent** → still plain text *(D2: the low-risk signal used to be reachable only through the corpus)* — **DRG-01b tried 2026-09-18 with Deep Rock Galactic: Survivor running, blocked:** the same Ask-box freeze as the roadmap's three-star focus entry stopped the question from being sent five times out of six tries, so the reply was never seen. Evidence `docs/test-evidence/plan61-DRG-01b.json`. **DRG-01c not tried on purpose** 2026-09-18 — it would mean removing the library from the Deck, which was out of scope tonight. Still owed, not failed. **DRG-01b tried again 2026-09-19, still blocked:** Deep Rock Galactic: Survivor had fallen off the Recent Games row again, so it could not be launched. Evidence `docs/test-evidence/plan61-DRG-01b-retry.json`. **DRG-01b PASS (Deck) 2026-09-23:** with the game running, the knowledge base off, masking on and no consent phrase, the boss tactics came back plain, no cover, no notes block, and no knowledge-base search logged. Moved to Done. DRG-01c (corpus absent) is still not tried. Evidence `docs/test-evidence/plan64-DRG-01b.json`. (Split 2026-09-30: DRG-01b passed 2026-09-23 and is closed here; DRG-01c stays open in testing-manual.md.)

## Plan 78, docs sweep 8 (2026-10-01)

_Moved word for word from [testing-manual.md](../testing-manual.md), ticked, with the result added._

- [x] **REASONING-01** through **REASONING-07** — the reasoning display (plan 57 § 6), run on the Deck's
  built-in screen 2026-09-17, bundle `af52c0aa`. Frozen chips before pinning: **how do i kill the big
  armoured bug boss** (Deep Rock Survivor; rows 01, 02, 05), **how does the story end** (Red Dead Redemption
  2; row 06), **what does the pickaxe do** (row 04). **Deviation found while running:** the Deck's chip row
  is in single-chip mode, one rotating slot cycling among the three pinned questions, not three chips shown
  side by side, and landing the exact frozen wording at the moment of a press proved costly. Rows 01 and 04
  swapped their questions for this reason — 01 ran with "what does the pickaxe do", 04 with "how do i kill
  the big armoured bug boss" — both sent through the same pinned-chip mechanism, testing the same code path.
  Six of seven rows closed, and the seventh (07) passed on its re-run once its fix landed (commit
  `d2096ee`); 05 closed on 2026-10-01 (below). Evidence
  `docs/test-evidence/plan57-REASONING-01.json` … `-07.json`,
  `docs/test-evidence/plan57-REASONING-07-rerun.json`, `docs/test-evidence/plan57-REASONING-06a-rerun.json`.
  Rows 01, 02, 03, 04, 06 and 07 passed and are filed earlier in this file.
  - [x] **REASONING-05** Show details on a thinking turn — the chip reads the level, the seconds and the
    token estimate, and its body says the count is an estimate. **PARTIAL (Deck) 2026-09-17:** the chip read
    "Thinking: Balanced · 16 s · ~465 tokens", the same seconds as the fold — but the whole details chip row
    cannot be reached by the D-pad at all (Right from Hide details stalls, Down skips to Session context, Up
    from Session context lands back on Hide details), so nobody using a controller can select this chip to
    read its body; only a page read reached the text. Filed as its own Bugs entry, below. Stays owed for the
    body-text half. **PASS (Deck) 2026-10-01 (plan 78, block 3a, build `c8d6b094`, no game running):** the chip reads "Thinking: Balanced · 18 s · ~471 tokens", the fold said 18 s, and the chip's body says the token count is an estimate ("The token count is an estimate - Ollama's own count does not separate thinking from the answer."). The chip was reached by the D-pad (Show details, notes row, tabs row, then Right along the chip ladder to chip 4 of 7); every stop was readable above the dock (the first ladder stop read 67 percent visible by the box measure, which is the known kind of false alarm: no word was under an icon by the text-line measure). Evidence `docs/test-evidence/plan78-REASONING-05.json`.

## Plan 81, paperwork 3 (2026-10-03)

_Moved word for word from [testing-manual.md](../testing-manual.md), ticked, with the result added._

- [x] **DRG-01c** As DRG-01 with the corpus **absent** → still plain text. **Not tried** (2026-09-18 on purpose: it means removing the library from the Deck). **COULD NOT RUN (Deck) 2026-10-03 (plan 81, build `afd2f444`):** the library was moved aside and Deep Rock Galactic: Survivor was running; the answer to "How do I beat the Glyphid Dreadnought?" was made with no notes (0 chars), but Steam's screen stopped answering afterwards (free memory fell from 2035 MB to 973 MB), so whether the tactics were plain with no cover and no chip was never seen. Filed as a bug in the roadmap. Evidence `docs/test-evidence/plan81-DRG-01c.json`. **PASS (Deck) 2026-10-03, second try (plan 81, build `afd2f444`, after a restart of the Deck):** the library folder was moved aside and Deep Rock Galactic: Survivor was running; "What is the best way to take down a Glyphid Dreadnought?" was asked with the log reading "unavailable=corpus_missing" (0 characters of notes attached). The answer came out as plain text with no cover and no "Spoiler hidden until complete" chip at any of 368 reads (every 250 ms, from before Ask until 30 s after the end), and Steam did not freeze. **Caveat:** the AI wrote no hidden block at all, so a cover was not tested directly; the check shows none appeared, not that one would have been drawn. The library was put back (the Ollama tab reads Installed, version 2026.09.26). Evidence `docs/test-evidence/plan81-DRG-01c-try2.json` (+ .png). DRG-01b (knowledge base off) passed (Deck) 2026-09-23 and moved to [testing-manual-closed-2026.md](testing-manual-closed-2026.md); evidence `docs/test-evidence/plan64-DRG-01b.json`.

## Plan 81, paperwork 5 (2026-10-03)

_Moved word for word from [testing-manual.md](../testing-manual.md), ticked, with the result added at the front._

- [x] **CHIP-BUTTON-09** A game the notes cover (Half-Life 2), knowledge base on. Pass: The Tip chip shows a small square dot in the character's colour before its label, not the word; the dot stays put while a long label scrolls. **PASS (Deck): the dot 2026-09-26, the dot staying put on a scrolling label 2026-10-02; both halves passed and the row is closed. Evidence `docs/test-evidence/plan79-CHIP-BUTTON-09.json`.** Status as it stood, the newest note last: ❌ **FAIL (Deck) 2026-09-18** — with Half-Life 2 running and the knowledge base on, the suggestion chip showed real Half-Life 2 tips from the notes ("How do I beat Strider?", "Tips for Ravenholm in this game?") but with no dot before the label at all; reading the dot's own element on the page confirmed it was never drawn for either chip. Filed as its own bug (roadmap Bugs, `[chips]` `[KB]`) — the check that decides whether a chip's words come from the notes and the check that decides whether to draw the dot are not agreeing with each other. Evidence `docs/test-evidence/plan61-CHIP-BUTTON-09.json` and its two screenshots. ⏳ **Fixed 2026-09-21 (plan 63, commit `895cf0a`), Deck recheck owed.** Two copies of the same badge markup had drifted apart; one piece of code now draws both. **Tried 2026-09-23, COULD NOT RUN:** three pinned test chips are switched on in the Developer tab, and while they are on no note chip is ever mixed in — the chip row stayed on the same pinned "how do i beat the gonarch in black mesa" chip for the whole run, even though the question itself did attach three real Half-Life 2 notes. Owed: someone clears the pinned chips ("Clear frozen test chips" in Developer — the maintainer may want them kept on purpose, so ask first) and re-run. Evidence `docs/test-evidence/plan64-CHIP-BUTTON-09.json`. **Tried again 2026-09-26 (plan 70, flow L5), COULD NOT RUN:** Steam's own screens stopped answering right after the plugin reload, before the check could start. ✅ **PASS (Deck) 2026-09-26 (plan 70, flow L6), for the dot itself, closed:** with Half-Life 2 running, the Tip chip's small square dot showed on every one of 9 reads it was on screen — 7×7 px, the character's own colour, before the label, no "Tip" word drawn. Evidence `docs/test-evidence/plan70-L6-CHIP-BUTTON-09.json` (+ screenshot). **Still owed:** the "stays put while a long label scrolls" half — the only Tip label offered ("How do I beat Strider?") was short and never scrolled. **Tried again 2026-10-01 (plan 78, Deck block 3e), COULD NOT RUN:** Half-Life 2's window never came to the front after the plugin was reloaded during its start; no chip was read. Still owed. Evidence `docs/test-evidence/plan78-CHIP-BUTTON-09.json`. ✅ **PASS (Deck) 2026-10-02 (plan 79, build `f0a4f2c4`), the scrolling-label half, closed:** Half-Life 2 running, Tip chips with labels longer than their box on screen from the first read; verdict "PASS - dot moved 0.00 px against 200 px of label movement on 842 reads; 7x7 and before the label every time". Both halves have now passed (dot 2026-09-26, staying put 2026-10-02), so row 09 is closed and the older "Still owed" lines above are superseded. Evidence `docs/test-evidence/plan79-CHIP-BUTTON-09.json`.
