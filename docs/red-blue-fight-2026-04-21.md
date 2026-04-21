# Red vs Blue — 2026-04-21 (legal report / bout)

Release priorities for the imminent ship week are argued here under **counsel (Red / Blue)** and decided by the **human judge**. See the active freeze in [roadmap.md](roadmap.md).

## Schedule (America/New_York)


| When                                   | What                                                                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **2026-04-20**                         | **Planned check-in skipped** — maintainer day off; no 17:30 session.                                                                              |
| **2026-04-21 — effective immediately** | **Counsel / bout in session** — openings, issues, closings, optional advisory ballot, **Judge’s ruling** (no waiting on a late-night start time). |


*(Former placeholder times — Monday 2026-04-20 17:30 check-in / 23:30 bout — are superseded by the row above.)*

---

## Red Team — opening argument

**Counsel for release / risk (Petitioner):** *(Draft here.)*

- Frame: why the ship date and scope cap serve users (stability, testability, no silent regressions).
- Stress: **no new features** unless release-blocking or required to **trim safely**; **Settings tab** is the lead **trim-the-fat** surface (noise, grouping, progressive disclosure).
- Cite concrete risks: permissions, QAM/sysfs paths, Decky focus contracts.

---

## Blue Team — opening argument

**Counsel for vision / trust (Respondent):** *(Draft here.)*

- Frame: what must **not** be sacrificed for calendar (consent, honesty, broken first-run, misleading copy).
- Reserve **veto** or **cut-the-line** items: name any deferral that would materially harm trust or the self-hosted story, with one paragraph each.
- Acknowledge ship pressure; separate “can wait” from “should not ship without.”

---

## Issues / findings (what is at stake this week)

Fill as neutral **findings of fact** before closings.


| #   | Area                                        | Stakes                                                                                                                                                                                                                                                                         |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Trim the fat — Settings tab (lead item)** | The Settings surface is overloaded; ship-week cleanup should prioritize **scanability, grouping, fewer simultaneous controls, progressive disclosure, shorter helper copy** before other UI or code churn.                                                                     |
| 2   | **QAMP Reflection Phase 1**                 | Safe default vs hardware mirror lag; minimal verifiable behavior vs scope creep into Phase 2.                                                                                                                                                                                  |
| 3   | **Known bugs**                              | Question overlay alignment; D-pad scroll bottom cutoff — severity vs release bar.                                                                                                                                                                                              |
| 4   | **Other trim / debt**                       | Only after Settings is acceptably calm; code/bundle/doc noise last so it does not distract from finding **1**.                                                                                                                                                                 |
| 5   | **Scope creep (“tiny” asks)**               | List any late additions; counsel argues each. Per-item positions for the **full roadmap inventory** (including [Planned candidates](roadmap.md#planned-candidates-not-shipped) and **Shipped feature reference** extensions) are in **Roadmap items — Red/Blue matrix** below. |


---

## Roadmap items — Red/Blue matrix

Inventory keyed to [docs/roadmap.md](roadmap.md) as of **2026-04-21**, reconciled with **Completed** (shipped items are not listed here). If a feature appears in both **Up next** and **Planned candidates**, it is one row labeled **Up next + Planned**. Rows are grouped by **Source** in this order: **In progress** → **Known bug** → **Up next** → **Up next + Planned** → **Planned** → **Shipped mirror**; within each group, **★ ascending** (ties: alphabetical by feature title). This table is **counsel only**; the **Judge’s ruling** section remains the human-owned decision record.


| Source         | Feature                                                                     | ★      | Red Team                                                                                                                                                                                           | Blue Team                                                                                                                                              |
| -------------- | --------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| In progress    | QAMP Reflection Phase 1 (safe default — verify applied state)               | ★★★    | **minimal ship** — sysfs truth + explicit verification copy only; no Phase 2 or profile experiments in this window. Couples `main.py` / QAM UX strings; keep blast radius to copy + safe defaults. | Aligns with “every performance action user-verifiable.” **Veto** any rush to Phase 2 disguised as Phase 1.                                             |
| Known bug      | Question overlay alignment drift                                            | ★      | **defer** unless QA proves visible regression on hardware; cosmetic vs release bar.                                                                                                                | **Defer** — polish after trust-critical surfaces; avoid churn in shared `TextField` paths this week.                                                   |
| Known bug      | D-pad scroll bottom cutoff (response tail)                                  | ★★     | **must-fix** if smoke on Deck reproduces unreadable answers; else **defer** with known-issue + troubleshooting pointer. Touches focus/scroll contracts in `src/index.tsx` (high coupling).         | If reproduced: **Cut-the-line:** controller users must not believe the model stopped mid-answer. Prefer minimal scroll/focus fix over hiding severity. |
| Up next        | Prompt testing and tuning                                                   | ★★     | **defer** — process-heavy; belongs post-release with [prompt-testing.md](prompt-testing.md) matrix ownership.                                                                                      | **Defer** — improves quality narrative but not blocking honest ship if prompts unchanged.                                                              |
| Up next        | Text Ask model preference chains (per-mode ordered tags)                    | ★★     | **defer** — settings schema + validation + try-next parity with vision path; easy to ship mis-ordered fallbacks that confuse support.                                                              | **Defer** — fine for power users once docs + defaults match shipped honesty; ensure FOSS-first defaults when implemented.                              |
| Up next        | QAMP verification checklist (matrix across profiles / reboot / GPU prompts) | ★★★    | **defer** — QA artifact, not user feature; do not block release for exhaustive matrix.                                                                                                             | **Defer** — run as internal confidence; publish gaps in testing notes if needed, not scope creep.                                                      |
| Up next        | QAMP Reflection Phase 2 (experimental profile sync)                         | ★★★★★  | **defer** — blocked on Phase 1; undocumented Steam internals = release suicide if rushed.                                                                                                          | **Veto** any merge without explicit experimental gating + warnings; aligns with no silent capability changes.                                          |
| Planned        | Debugging and Proton log analysis                                           | ★★★    | **defer** — log discovery/truncation/RPC surface; `PROTON_LOG=1` dependency limits value.                                                                                                          | **Defer** — if shipped later, consent + size limits + “limited value” honesty in UI.                                                                   |
| Planned        | Multi-language responses                                                    | ★★★    | **defer** — detection + prompt + persistence; risk of wrong-language outputs and support load.                                                                                                     | **Defer** — when added, pair with honest “UI still English” scope from roadmap.                                                                        |
| Planned        | Per-mode latency / timeout profiles                                         | ★★★    | **defer** — mode-keyed settings + resolution in `main.py` / UI; couples all modes’ failure semantics.                                                                                              | **Defer** — user-visible once stable; document interaction with existing timeouts first.                                                               |
| Planned        | Search results density + live match emphasis                                | ★★★    | **defer** — unified search UX churn; incremental filter bugs annoy power users.                                                                                                                    | **Defer** — improves scanability; avoid hiding failures behind tighter layout.                                                                         |
| Planned        | System prompt reorder + general-purpose assistant clause                    | ★★★    | **defer** — `build_system_prompt` refactor affects every Ask; needs staged rollout + [prompt-testing.md](prompt-testing.md).                                                                       | **Defer** — trust lives in predictable JSON/TDP tail; do not reorder without documented contract tests.                                                |
| Planned        | Global BonsAI quick-launch via Steam Input macro (documentation spike)      | ★★★★   | **defer** — doc/test work still competes with freeze priorities; low code risk if picked up.                                                                                                       | Align — low-risk trust win via [README.md](../README.md) / [development.md](development.md) clarity on Guide chord path.                               |
| Planned        | Llama.cpp compatibility evaluation (research spike)                         | ★★★★   | **defer** — research-only output expected; no production toggle this week.                                                                                                                         | **Defer** — FOSS story benefits from evidence-based go/no-go doc, not a rushed provider switch.                                                        |
| Planned        | Offline intent pack exchange (local JSON)                                   | ★★★★   | **defer** — schema versioning + merge conflicts + import trust boundary.                                                                                                                           | **Defer** — local-first aligns with promise; require explicit import consent path.                                                                     |
| Planned        | Pyro talent-manager easter egg (hidden preset)                              | ★★★★   | **defer** — special-case roleplay + carousel injection + metadata contract; regression risk in `PresetAnimatedChips`.                                                                              | **Defer** — playful OSS nudge is on-brand; must not read as deceptive third-party likeness (roadmap already bounds this).                              |
| Planned        | Steam Input layout analysis (VDF → AI context)                              | ★★★★   | **defer** — parser + discovery + wrong-layout liability; couples bundled VDF support.                                                                                                              | **Defer** — when accurate, strengthens Deck-native story; never present guesses as facts.                                                              |
| Planned        | Strategy Guide prompt path (beta)                                           | ★★★★   | **defer** — new mode routing + presets + Steam Input copy; large QA matrix.                                                                                                                        | **Defer** — “cheat only on ask” policy must stay explicit in UX when this lands.                                                                       |
| Planned        | Strategy Guide safety and spoilers                                          | ★★★★   | **defer** — depends on Strategy path; tap-to-reveal + consent flows are easy to half-ship.                                                                                                         | **Defer** — spoiler UX is trust-sensitive; ship only with defaults safe for casual players.                                                            |
| Planned        | Local runtime mode (default) + beta risk warning                            | ★★★★★  | **defer** — provider routing + health checks + in-game perf risk; highest blast radius class.                                                                                                      | **Defer** — default-on local inference demands loud beta honesty; no silent switch from remote-first mental model.                                     |
| Planned        | RAG knowledge base (PC-hosted ingest + Deck query)                          | ★★★★★  | **defer** — companion service + Chroma + LAN + `network_web_access` gating; largest new trust surface.                                                                                             | **Defer** — ship only with Permission Center tie-in and plain-language corpus/refresh disclosure (per roadmap).                                        |
| Planned        | Restricted kids account master lock                                         | ★★★★★  | **defer** — needs reliable Steam signal + global lock above capabilities; legal/UX sensitive.                                                                                                      | **Defer** — if implemented, messaging must not overclaim enforcement; coordinate with Permission Center narrative.                                     |
| Planned        | Strategy checklist workflow (chat-scoped)                                   | ★★★★★  | **defer** — depends on Strategy path + interactive state + prompt sync.                                                                                                                            | **Defer** — checklist lies hurt more than no checklist; ship only with clear non-persistence story.                                                    |
| Planned        | VAC opponent check (phased)                                                 | ★★★★★  | **defer** — API keys, rate limits, privacy/confidence messaging; high misuse optics risk.                                                                                                          | **Defer** — never punitive automation; confidence labels mandatory if revived.                                                                         |
| Planned        | Voice command input (Whisper)                                               | ★★★★★  | **defer** — PipeWire + RPC + mic consent + failure states; not freeze material.                                                                                                                    | **Defer** — requires explicit recording consent UX and local-service honesty before any ship.                                                          |
| Planned        | Deep mod and port configuration manager                                     | ★★★★★★ | **defer** — scan breadth + false-positive mod guidance = support and safety load.                                                                                                                  | **Defer** — mod detection must not imply endorsement or auto-install (roadmap **Not in scope** stays sacred).                                          |
| Planned        | Native QAM entry for BonsAI (beneath Decky) — decouple research             | ★★★★★★ | **defer** — upstream Steam/Decky dependency; not a plugin-only diff.                                                                                                                               | **Defer** — doc honest macro path until platform supports; **Veto** undocumented UI injection as default approach (per roadmap).                       |
| Shipped mirror | Desktop mode debug note — follow-ups (NL triggers, raw export)              | ★★★    | **defer** — feature expansion beyond v1/v2 shipped; watch permission paths (`~/Desktop/BonsAI_notes/`).                                                                                            | **Defer** — follow-ups must preserve explicit save semantics and no silent path writes.                                                                |
| Shipped mirror | Higher-resolution character avatars (GTA-style art pass)                    | ★★★    | **defer** — art pipeline + assets + small-size clarity; unrelated to release mechanics.                                                                                                            | **Defer** — improves character promise when ready; keep TF2 / likeness rules from roadmap.                                                             |
| Shipped mirror | Input sanitizer lane — future rewrite / block / bypass paths                | ★★★    | **defer** — new model paths + transparency requirements; couples `main.py` prompts + Settings.                                                                                                     | **Defer** — any new rewrite path must stay visible and overrideable (**Use original input**); **Veto** hidden rewriting.                               |
| Shipped mirror | Capability Permission Center — `network_web_access` extension (planned)     | ★★★★   | **defer** — new toggle class + outbound HTTP semantics; blocks clean RAG story until designed.                                                                                                     | Align — when RAG/web calls land, this gate is **trust-critical**; design copy before implementation so users know what leaves the Deck.                |
| Shipped mirror | Preset carousel — deferred arrow controls + Phase 1 shipped baseline        | ★★★★   | **defer** — controller focus on carousel controls is fiddly on Deck.                                                                                                                               | **Defer** — Phase 1 shipped; completing nav controls is polish, not trust blocker.                                                                     |
| Shipped mirror | Global screenshots and vision — strategy extension                          | ★★★★★  | **defer** — richer context injection + vision-model dependency; not required for this ship window.                                                                                                 | **Defer** — strategy help must label screenshot/context limits so users do not infer omniscience.                                                      |
| Shipped mirror | Steam Input settings search — Phase 2+ (unified search, deep links)         | ★★★★★  | **defer** — research-gated; route discovery fragility called out in roadmap.                                                                                                                       | **Defer** — avoid brittle route injection; honesty in “may not reach exact panel” beats magic.                                                         |


---

## Red Team — closing argument

*(Draft here.)* Tie openings to issues; state recommended **defer / ship / trim** list for the week.

---

## Blue Team — closing argument

*(Draft here.)* Tie openings to issues; state **veto** targets (if any), **cut-the-line** requests (if any), and what must stay in scope for a defensible release.

---

## Advisory ballot (six specialists, one vote each when requested)

**Motions:** TBD — define the question(s) before collecting votes. Votes are **advisory** until the judge elevates them.


| Agent               | Advisory vote | One-line rationale |
| ------------------- | ------------- | ------------------ |
| security-auditor    |               |                    |
| foss-advocate       |               |                    |
| refactor-specialist |               |                    |
| master-debugger     |               |                    |
| red-team            |               |                    |
| blue-team           |               |                    |


---

## Judge’s ruling (human)

**Nothing below is binding until filled in by the human judge.**

Canonical titles and ★ ratings follow [docs/roadmap.md](roadmap.md). In each table, set **Ruling** to **Accept** (take work in the ruling window), **Defer** (postpone), or **Partial**; use **Consequence** for scope notes, dependencies, or follow-up tasks.

- **Date / time ruled:**  
- **Who won the fight** (plain language, optional score / prevailing theme):

### Bugfixes ([Known bugs](roadmap.md#known-bugs))


| Item                                       | ★   | Ruling | Consequence |
| ------------------------------------------ | --- | ------ | ----------- |
| Question overlay alignment drift           | ★   | defer  |             |
| D-pad scroll bottom cutoff (response tail) | ★★  | accept |             |


### In progress ([In progress](roadmap.md#in-progress))


| Item                                                                                        | ★   | Ruling                | Consequence |
| ------------------------------------------------------------------------------------------- | --- | --------------------- | ----------- |
| QAMP Reflection Phase 1 — Safe Default (verify applied state / sysfs truth + user guidance) | ★★★ | accept (phase 1 only) |             |


### Up next ([Up next](roadmap.md#up-next))


| Item                                                                       | ★     | Ruling | Consequence |
| -------------------------------------------------------------------------- | ----- | ------ | ----------- |
| Text Ask model preference chains (user-configurable per-mode ordered tags) | ★★    | defer  |             |
| Prompt testing and tuning                                                  | ★★    | accept |             |
| QAMP verification checklist (profiles / QAM reopen / reboot / GPU prompts) | ★★★   | defer  |             |
| QAMP Reflection Phase 2 — Experimental Opt-In (Steam profile sync)         | ★★★★★ | defer  |             |


### Planned candidates ([Planned candidates (not shipped)](roadmap.md#planned-candidates-not-shipped))


| Item                                                                   | ★      | Ruling | Consequence |
| ---------------------------------------------------------------------- | ------ | ------ | ----------- |
| Per-mode latency / timeout profiles                                    | ★★★    | defer  |             |
| Multi-language responses                                               | ★★★    | defer  |             |
| Search results density + live match emphasis                           | ★★★    | defer  |             |
| Debugging and Proton log analysis                                      | ★★★    | defer  |             |
| System prompt reorder + general-purpose assistant clause               | ★★★    | defer  |             |
| Strategy Guide prompt path (beta)                                      | ★★★★   | defer  |             |
| Strategy Guide safety and spoilers                                     | ★★★★   | defer  |             |
| Steam Input layout analysis                                            | ★★★★   | defer  |             |
| Offline intent pack exchange (local JSON)                              | ★★★★   | defer  |             |
| Llama.cpp compatibility evaluation (research spike)                    | ★★★★   | defer  |             |
| Local runtime mode (default) + beta risk warning                       | ★★★★★  | defer  |             |
| Restricted kids account master lock                                    | ★★★★★  | defer  |             |
| Strategy checklist workflow (chat-scoped)                              | ★★★★★  | defer  |             |
| Native QAM entry for BonsAI (beneath Decky icon) — decouple research   | ★★★★★★ | defer  |             |
| Global BonsAI quick-launch via Steam Input macro (documentation spike) | ★★★★   | accept |             |
| Pyro talent-manager easter egg (hidden preset)                         | ★★★★   | defer  |             |
| Voice command input                                                    | ★★★★★  | defer  |             |
| VAC opponent check (phased)                                            | ★★★★★  | defer  |             |
| RAG knowledge base (PC-hosted ingest + Deck query)                     | ★★★★★  | defer  |             |
| Deep mod and port configuration manager                                | ★★★★★★ | defer  |             |


**Issues / findings (this bout):** Use the **Issues / findings** section and table above for Settings trim, scope creep, and cross-links; add rows here only if you want them on the same **Accept / Defer** ballot.

**Shipped feature reference (extensions only):** Follow-up work under [Shipped feature reference (backlog mirror)](roadmap.md#shipped-feature-reference-backlog-mirror) (avatars art pass, sanitizer futures, desktop note follow-ups, preset carousel arrows, `network_web_access`, Steam Input Phase 2+, screenshots strategy extension) is **not** duplicated above — add rows if you want those extensions explicitly ruled.

- **Week work list (after the bell):**
  1. **Settings trim (Issues finding 1)** — scanability, grouping, progressive disclosure, shorter copy on Settings (per roadmap priority order).
  2. **D-pad scroll / last AI chunk** — fix controller focus so every `bonsai-ai-response-chunk` is reachable when the model reply is split (`MainTab.tsx` / `splitResponseIntoChunks`).
  3. **QAMP Reflection Phase 1** — keep sysfs truth; ensure post-Ask copy (UI + transcript) tells users to re-open QAM Performance if sliders look stale (`MainTab.tsx`, `buildResponseText` in `settingsAndResponse.ts`).
  4. **Prompt testing and tuning** — run/extend matrices in [prompt-testing.md](prompt-testing.md); log results for ship sign-off.
  5. **Global BonsAI quick-launch (Steam Input macro)** — verify macro on hardware; align [README.md](../README.md) + [troubleshooting.md](troubleshooting.md) with best-known delays and QAM rail count notes.

---

## After the bell

Carry the **Judge’s ruling** table into actual tasks (issues, PRs, roadmap updates). Archive optional summary in [.cursor/agents/SUBAGENT_REPORTS.md](../.cursor/agents/SUBAGENT_REPORTS.md) if desired.