# Agent guide (IDE-neutral)

The single "how to work here" guide for humans and any AI tool. Claude Code also reads
[CLAUDE.md](CLAUDE.md) automatically at session start; that file holds only what is specific to
Claude (its hooks, its agents, its own commands) and points back here for everything else. Every
other tool should just read this file.

## Writing to the maintainer

**Everything written to the maintainer is in simple, plain language.** Chat replies, questions,
reports, plans, and any document they will read. Short sentences; say what a person using the
plugin would notice before any term of art; no internal identifiers, file paths, symbol names or
metric shorthand inside a sentence; everyday words instead of industry ones. Measurement write-ups
are where this slips most: say what changed for a person, then the number. They have asked for
this five times. On Claude Code this is also enforced mechanically (see CLAUDE.md) because a line
in a doc alone was not enough for a long session to remember; any tool without that enforcement
still has to follow the rule by reading this paragraph.

## What this is

bonsAI is a **Decky Loader plugin for SteamOS / Steam Deck** that provides
self-hosted AI assistance backed by a local or LAN Ollama instance. It ships as
a TypeScript/React frontend bundled to a single file plus a Python backend the
Decky Loader imports directly.

## Layout

| Path | Contents |
|---|---|
| `src/` | Frontend, TypeScript/React. Bundled to `dist/index.js` |
| `src/features/` | Vertical feature slices (`preset-carousel`, `unified-input`, `voice`) |
| `src/hooks/`, `src/components/`, `src/utils/`, `src/data/` | Type-bucket directories (most of the code lives here) |
| `src/test-harness/` | Vitest setup + `fakeDeckyRpc.ts` |
| `main.py` | The Decky `Plugin` class — RPC surface |
| `py_modules/backend/services/` | Service modules; the bulk of backend logic |
| `tests/` | Python `unittest` suites |
| `packages/bonsai-mcp/` | In-repo MCP server + generated architecture snapshots |
| `scripts/` | Build, deploy, Deck capture, RAG tooling |
| `docs/audit/` | Refactor recon output — read before re-deriving anything |
| `docs/code-map.md` | Generated: every file's Title/Purpose line. Check here instead of hand-counting files |

## Entry points

- **Frontend:** `src/index.tsx` — plugin root, tabs, scoped CSS, RPC
  wiring. Rollup config is one line delegating to `@decky/rollup`. Modals, tab
  payloads and shell state were extracted to `src/features/plugin-shell/` in
  refactor step 8; the file is a composition root now, not a god file.
- **Backend:** `main.py`, declared by `plugin.json` (`"main": "main.py"`,
  `api_version: 1`). `class Plugin` at `main.py:193`; lifecycle hooks
  `_main` (`main.py:308`) and `_unload` (`main.py:313`).
- `main.py:24-26` inserts the plugin root onto `sys.path`, which is why backend
  imports are `from backend.services.X import ...` rather than
  `py_modules.backend.services.X`. `scripts/run_python_tests.py` reproduces that
  path setup so tests match the loader.

## The TS ↔ Python boundary

This is the only way the two sides talk. There is no HTTP server between them.

1. Frontend calls `call<Args, Result>("method_name", ...args)` from `@decky/api`.
2. **Use `callDeckyWithTimeout()`** from
   [src/utils/deckyCall.ts](src/utils/deckyCall.ts), which adds a 15s deadline
   (`DECKY_RPC_TIMEOUT_MS`) and normalizes error payloads. A bare `call()` can
   hang the UI indefinitely. Note the arg convention differs: `call()` spreads
   its arguments, the wrapper takes them as an **array**.
3. Four call sites deliberately use raw `call()` and say why in a comment:
   `clear_plugin_data`, `install_rag_corpus_local`, `start_voice_transcription`,
   `stop_voice_transcription` — each can outrun any UI deadline. Everything else
   is wrapped; justify a new raw `call()` in a comment.
4. **An RPC method is any public `async def` at indent 4 on `class Plugin`.**
   There is no decorator or registry; indentation is the contract.
5. `packages/bonsai-mcp/knowledge/architecture/rpc-map.json` lists them all with
   line numbers. It is **generated** — never hand-edit it.
6. **The generated map classifies by substring, so the name you pick decides the
   domain.** `DOMAIN_KEYWORDS` in `generate-architecture.mjs` maps e.g. `rag` to
   `["rag_corpus"]` — so a knowledge-base RPC named `get_knowledge_base_*` files
   under `other`, away from its siblings, with no warning and no failure. Proof
   in-tree: `get_session_rag_chip_candidates` sits in `other`. Match the existing
   keyword for the domain you want.

Call sites are concentrated in `src/hooks/` plus `src/index.tsx`.

There is no compile-time check that a called name exists in `main.py`, so a typo
in an RPC name is a runtime failure. Two frontend calls once targeted methods
that existed nowhere in Python; both were wired 2026-08-02 under decision **D1**
(`get_session_rag_chip_candidates` at `main.py:1440`,
`merge_pulled_tags_into_routing_orders` at `main.py:1563`). How they went
unnoticed — both call sites swallowed the error — is the lesson worth keeping:
[docs/audit/phase1-map-verification.md](docs/audit/phase1-map-verification.md).

## Where settings live

`settings.json` under `decky.DECKY_PLUGIN_SETTINGS_DIR` (`main.py:263`, `:276`).

Adding one user-facing setting touches `SettingsTab.tsx` (UI) →
`usePluginSettings.ts` (state + debounced save) → RPC `load_settings` /
`save_settings` → `settings_service.py`, plus `src/data/bonsaiSettingsSchema.ts`
and `bonsaiSettingsNormalizers.ts`.

**That list is the normalization layer only, and it is the cheap half.** Measured
2026-08-05 by the step 11 friction test: one boolean is **~18 files and ~30 edit
points** end to end. The cost is not normalization — it is *plumbing*.
`usePluginSettings.ts` repeats the field list in **7** places (state, snapshot,
hydrate, load-failure reset, debounce deps, the returned object, the save
snapshot); `index.tsx` in **5**; each tab payload hook in **3**. None of that
duplication is caught by a type or a test, and `BonsaiSettingsSnapshotInput` has
no optional fields, so four full snapshot literals in `settingsContracts.test.ts`
and `bonsaiSessionSurvival.test.ts` must gain the key or `tsc` fails. Budget for
the plumbing, not the tables. See [docs/audit/03-friction.md](docs/audit/03-friction.md).

TS and Python still declare the setting shape independently, but **refactor step
7 (Phase 3.1) is complete** and changed what that costs:

- A setting whose rule is one of the plain shapes is **one row per language** —
  `_SIMPLE_FIELDS` in `settings_service.py` and `SIMPLE_FIELDS` in
  `bonsaiSettingsNormalizers.ts`. The two row counts differ on purpose —
  Python keeps fields out of its table when they need caller-supplied options or
  live in another service. Only genuinely custom rules
  (migrations, cross-field reconciliation, feature gates) stay as functions, and
  each one is annotated with why it is exempt.
- Drift is caught by two shared contracts asserted from both languages:
  `tests/contracts/settings-defaults.json` (fresh-install payload plus an
  idempotency check) and `tests/contracts/settings-hostile-inputs.json` (hostile
  input cases). An incomplete two-language edit fails a test rather than shipping.
- **Python is authoritative** where the two disagree (decision **D13**):
  `save_settings` decides what reaches disk. One deliberate exception is
  documented there.

## Decky focus graph

Full policy: MCP `bonsai.policy.get` id=`decky-ui-focus`. Patterns:
`bonsai://architecture/focus-graph-patterns` or
[focus-graph-patterns.md](packages/bonsai-mcp/knowledge/architecture/focus-graph-patterns.md).

### New controls

- ALWAYS design new Settings/QAM rows as an **explicit focus graph in the section parent** (list
  each stop, wire `onMoveUp`/`onMoveDown`/`onMoveLeft`/`onMoveRight`/`onButtonDown` on the **Deck
  focus owner**, verify on-device). Mirror `SettingsTabUiScaleSection.tsx`, `OllamaTab.tsx`, or
  `PullModelsModal.tsx`.
  - **Exception, and it is the common case: a plain `ToggleField` added to an existing
    `PanelSection` needs no focus wiring of its own.** It inherits the section's chain — the
    "Hide spoilers until I tap" and "Show Developer tab" toggles in `src/components/SettingsTab.tsx`
    are current examples (around lines 342 and 535 as of this writing). **That file grows fast —
    line citations for it go stale in days, not months, so search for the label text if these have
    moved rather than trusting the number.** The rule above governs **new focus owners**: a new
    section, a slider, a button row, or any control that must hand focus to a *different*
    container. If you are adding one toggle to a section that already has some, stop here and just
    add it.
- For sliders, use the two shared, unit-tested builder functions instead of hand-wiring a bridge:
  `buildDeckThumbNavHandlers` (`src/components/deck/DeckFocusSlider.tsx:47`) and
  `buildUiScaleBridgeNav` (`src/components/SettingsTabUiScaleSection.tsx:55`). Do not assume DOM
  order or nested `DeckFocusSlider` thumbs join the vertical graph on their own. A 2026-09-04 fix
  pulled the Left/Right stepping logic into these two functions after a hand-wired version let one
  press step a slider twice or escape the row entirely; four sliders (reply style, keep-alive,
  connection timeout, UI scale) share the fix now — build new ones the same way.
- NEVER hop between Decky D-pad siblings via `document.querySelector` / aria / `data-*` / class
  lookup or `document.activeElement` success checks. Under Decky the **global `document` is the
  wrong document entirely** — plugin JS runs in SharedJSContext, whose document is a 14-element
  shell, while the UI renders into the QAM popup document. Use a ref/registry, an element-scoped
  query, or `getUiDocument()` / `elementHasFocus()` from
  [uiDocument.ts](src/utils/uiDocument.ts). Evidence:
  [docs/audit/decky-realms.md](docs/audit/decky-realms.md).
- **A DOM `focus()` does not move Steam's gamepad focus across navigation containers.** It sets
  `activeElement` while `gpfocus` stays behind and then clears, so Steam keeps routing presses to
  the container you were trying to leave — and any helper that verifies with `activeElement`
  reports a move that did not happen. Within one container a plain `focus()` is fine (the spoiler
  fence relies on it). To leave a container, use the registry — `registerNavFocus` /
  `unregisterNavFocus` / `takeNavFocus` in
  [navFocusRegistry.ts](src/utils/navFocusRegistry.ts) — not the raw Steam prop underneath it.
  Every file that hands off focus this way already goes through those three functions, which add a
  null check and a real "did it actually report success" check around the underlying
  `navRef.current.TakeFocus(true)` call; the only direct call left in the whole frontend is inside
  the registry's own `takeNavFocus` helper. Write a new control against the registry functions, not
  the raw call.
- **Know which handler actually fires before wiring one.** `onMoveUp`/`onMoveDown` are SteamUI
  `Focusable` props: they do nothing on a Decky `Button`, which does not forward them.
  `onButtonDown` fires on both, for **every** button — its argument is a `GamepadEvent`, so read
  `evt.detail.button` (`OK = 1`, `DIR_UP = 9`, `DIR_DOWN = 10`) via the predicates in
  [focusNavigation.ts](src/utils/focusNavigation.ts). Never stringify it, and never let a
  state-changing `onButtonDown` act without whitelisting the button — three controls toggled
  themselves on a D-pad press that way. A keyboard-style Up/Down check on a real keyboard event is
  dead code on the Deck, too — a controller D-pad press sends zero keyboard events to the page,
  measured on device.
- **Never overwrite an existing `tabindex`, and never add `-1` to a natively focusable element** —
  Decky sets `tabindex="0"` on the nodes it navigates, so replacing it removes them from Steam's
  graph. **But adding a missing `tabindex` can be just as wrong.** `focusDeckOwner`
  (`src/utils/liveTurnFocusGraph.ts:25`) used to stamp one onto any element that had none, on the
  theory that a real Steam-owned control always carries one — measured on device, that theory is
  false: three controls Steam really was focusing carried no `tabindex` at all, so the helper broke
  them. It has since been fixed to check for a real Steam-owned element first. Both directions are
  dangerous; check before writing either one.
- Prefer the two gamepad-aware helpers over the DOM ones when asking "which control does the ring
  already own": `elementHasGamepadFocus` and `uiGamepadFocusElement`
  (`src/utils/uiDocument.ts:88,110`) read Steam's own on-screen ring marker, where the older
  `elementHasFocus` / `activeElement` check can return a confident wrong answer. This is the exact
  fix behind two shipped bugs (a reply-grid column bug and a spoiler-reveal bug) that both happened
  because the older check silently returned "yes" instead of an obvious "no".
- **Nothing owns the ring when a plugin opens, and the first two Downs are Steam's, not yours.**
  Entering a Decky plugin leaves the ring unowned; the first D-pad Down lands on the **Back
  button** in the header, and the second reaches the tab bar (or whatever the plugin's first
  element is). This is normal Steam behaviour, not a bug, and not the plugin's to fix. A macro or
  QA step that opens the plugin and immediately asserts where focus is will read *unowned* and
  must spend a press first. A bug report of the form "the first press does nothing" is usually
  this — reproduce it from a *known* ring position before believing it.
- NEVER mark Deck-facing UI done without a **D-pad row in `docs/testing.md` /
  `docs/testing-manual.md`** for the new control chain. The in-IDE preview does **not** validate
  Deck focus graphs — it has no equivalent of Steam's gamepad focus system at all.

### An automated check backs three of these up

`scripts/check-focus-patterns.mjs`, run as `pnpm test:focus` in CI
(`.github/workflows/tests.yml:116`), reads the actual code — not text search — on every push and
fails when a **new** case appears of: a page-search/`activeElement` hop, a move prop wired onto a
control that ignores it, or a `tabindex` of `-1` removing a control from the graph. Existing cases
are grandfathered in `scripts/focus-baseline.json`. After a deliberate, reviewed fix, update the
baseline with `node scripts/check-focus-patterns.mjs --update`. Treat it as a safety net that
catches a mistake after it lands, not a substitute for reading this section first.

### Focus / D-pad bugs

1. If a screenshot or capture is mentioned, follow `bonsai.workflow.get` id=`screenshot-ingest`:
   `screenshots/` is **gitignored**, so list it with a plain directory listing sorted by modified
   time — **not** a glob/file-search tool, which returns empty for gitignored files — then read the
   newest 1–3 captures.
2. Name the **section parent** and focus stops; match Pattern A/B/C/D in `focus-graph-patterns`
   before editing leaves.
3. Apply **one** evidence-backed fix (graph owner / registry / bridge — not speculative CSS).
4. Still wrong after that, or instrumentation/log proof is needed → escalate with the MCP prompt
   `bonsai/triage/focus-bug` first, then the fuller `bonsai/persona/master-debugger` if that does
   not resolve it. Do not jump straight to the full debugger for every D-pad mention.

## Commands

```bash
npm test                 # vitest, src/**/*.test.{ts,tsx}
npm run test:py          # python unittest via scripts/run_python_tests.py
npx tsc --noEmit         # typecheck (build does not typecheck)
npm run build            # rollup -> dist/index.js
npm run test:preview     # in-IDE QAM preview suite (see below)
npm run mcp:generate     # regenerate architecture snapshots
npm run mcp:validate     # fails if snapshots differ from HEAD
```

All four of `npm test`, `npm run test:py`, `npx tsc --noEmit`, and `npm run build`
pass on a clean tree. Any failure is a regression.

Deploy to a Deck (needs `.env`, copy from `.env.example`):

```bash
./scripts/build.sh dev       # build + deploy to remote Deck over SSH
./scripts/build.sh local     # build + deploy on this machine (Bazzite/Deck)
./scripts/build.sh release   # distributable zip via Decky CLI
```

`scripts/build.ps1` is the Windows equivalent of `dev`. `.env` supplies
`DECK_IP`, `DECK_USER`, `DECK_PORT`, `DECK_DIR`, `PLUGIN_NAME`.

## Testing on the Deck

**When you need the maintainer to run questions on the device, offer to pin them as frozen
test chips first — every time, before asking them to type anything.** Standing instruction from
the maintainer, 2026-08-22.

The rule:

1. Work out the exact questions the QA row needs.
2. **Show them the list and get it confirmed before pinning anything.** A wrong sentence
   invalidates the row it was meant to test — several KB rows are worded specifically around
   which words they avoid (`KB-ROUTER-01`'s four sentences contain neither "deck" nor "proton").
3. Only then pin them and freeze them in the chip rotation.

Why it is a rule and not a nicety: the alternative is thumb-typing a verbatim sentence on an
on-screen keyboard, once per case, and a single mistyped word changes what is under test without
saying so. `scripts/deck_send_ask.py` exists for exactly this problem and solves half of it — it
types the question but deliberately does not press Ask.

**The chip-freezing capability shipped 2026-08-22.** Pin a batch by writing
`dev_frozen_test_chips` in settings (free text, 3-12 entries, 160 chars each — **a batch under 3
is treated as off**), or from Developer → *Knowledge base (dev QA)*. The pinned batch replaces the
carousel in order, badges each chip **TEST** in amber, and stops reseeding until cleared. Pressing
A on a chip **fills the Ask field verbatim and does not submit** — the Ask press is a separate
step, the same split `deck_send_ask.py` uses. On-Deck row: **QA-FROZEN-CHIPS-01**.

So the offer is real: make it, then pin. `deck_send_ask.py` is the fallback for a one-off sentence
not worth a batch.

## Before marking work done

Before marking Deck-facing work **done** (feature implementation, plan execution, or bug fix),
update the same three docs, **in the same change set as the code** — not a follow-up:

1. **`docs/roadmap.md`**
   - Feature shipped: remove from Backlog, add a line to the completed archive, update any
     dependency notes.
   - Bug fixed: remove or resolve the Bugs row.
   - Partial ship: move the completed scope to Completed, leave a smaller Planned follow-up.
2. **`docs/testing.md`**
   - Add or update a row in Shipped feature coverage (feature id, test id(s), status Open until
     on-Deck QA).
   - Add or extend scenario steps when the change needs new QA steps.
   - For bug fixes: note which check now passes, or add a regression row.
3. **`docs/troubleshooting.md`** — also update this one when setup, permissions, or user-facing
   behavior changes.

Docs-only changes (a roadmap edit with no code) are exempt from needing a matching code change, but
not from the reverse.

## Conventions

- **Module headers.** Most `src/` and `py_modules/` files open with a
  `Title: / Purpose: / Used for: / Solves: / Does not:` block. Match it when
  adding a file. Rules and exclusions: [docs/code-clarity.md](docs/code-clarity.md).
- **UI work follows [docs/design-language.md](docs/design-language.md).** Eight rules,
  each earned by a specific bug. Rule 1: the QAM column is **300 CSS px** — use all of
  it, a gutter is a bug until proven otherwise. Also: never target Steam/Decky by class
  name (they are hashed — `[class*="PanelSection"]` matches **nothing**), width comes
  from CSS not from a measurement, and measure layout on device before changing it
  (`scripts/probe_deck_ask_row_width.py`) because a screenshot cannot show which element
  is at fault. Values live in [docs/design-tokens.md](docs/design-tokens.md).
- **Keep Decky RPC method names stable.** Renaming one is a two-language breaking
  change with no compiler to catch it.
- **New Settings/QAM controls need a focus-graph entry** for D-pad navigation — see
  "Decky focus graph" above before writing the control.
- **Generated files are not editable.** The six JSON snapshots under
  `packages/bonsai-mcp/knowledge/architecture/` are rewritten and staged by
  `.githooks/pre-commit` on every commit (installed via npm `prepare`). Change
  `packages/bonsai-mcp/scripts/generate-architecture.mjs` instead.
- **`import-graph.json` answers "who imports this?"** — full `imports` /
  `importedBy` sets for every TS file under `src/`, plus cycle and orphan
  detection. Check it before moving a symbol; it is more reliable than grep,
  which misses specifiers that differ by relative depth. `hotspots.json` is a
  size ranking, not a dependency graph.
- **Do not `git push` unless the user explicitly asks.** No `cursor/*` branches (a
  naming convention left over from a retired tool; still avoid it for clarity in `git log`).

## Refactor rules

The repo is mid-refactor; see [REFACTOR-PLAN.md](REFACTOR-PLAN.md) for phases and
[docs/audit/](docs/audit/) for completed recon. Questions that need a maintainer
call go in
[docs/audit/maintainer-decisions-locked.md](docs/audit/maintainer-decisions-locked.md)
— which also holds the locked D1–D15 calls and the authoritative execution order
— (plain language, with
options) — not into chat, where they get lost.

1. **One refactor per commit**, behavior-preserving, tests green between commits.
   Never mix a move with a rewrite — it makes the diff unreviewable and
   `git bisect` useless when something breaks on-device.
2. **No new abstraction without 3+ existing call sites** that would collapse into it.
3. **Cite `file:line` for factual claims.** Write `UNKNOWN` rather than inferring.
4. **Persist recon to `docs/audit/`**, not to chat, so the next session reads a
   summary instead of re-deriving it.
5. **Use `grep` and `git log -S` to establish call sites.** Read a file in full
   only when modifying it or when its logic is non-obvious. Do not survey broadly.
6. When a test fails after a move, check whether it asserted implementation shape
   rather than behavior before contorting the code to keep it passing. This repo
   has prior art for that failure mode (`docs/audit/00-phase0.md`).

## 1. bonsAI knowledge (`bonsai`)

In-repo server: [`packages/bonsai-mcp/`](packages/bonsai-mcp/). Setup: [docs/mcp-setup.md](docs/mcp-setup.md).

**Session start:** `bonsai.session.bootstrap` — call this yourself at the start of a session; no
tool auto-injects it any more.

| Tool | Purpose |
|------|---------|
| `bonsai.session.bootstrap` | Always-on policy **ids** + fetch hints (full text via `policy.get`) |
| `bonsai.policy.list` / `bonsai.policy.get` | Policy slices (git, focus, deploy, …) |
| `bonsai.workflow.get` | Deck dev loop, tier QA, preview, screenshot ingest |
| `bonsai.docs.search` / `bonsai.docs.get` | Search or read `docs/` |
| `bonsai.arch.rpcMap` | RPC methods from `main.py` |
| `bonsai.arch.hotspots` | Change-risk hotspots + test inventory |
| `bonsai.arch.previewTiers` | Preview suite tier manifest |
| `bonsai.report.archive` | Append subagent findings to a report log (the server's write path is currently `.cursor/agents/SUBAGENT_REPORTS.md` — a leftover from the removed Cursor setup that still needs a code fix in `packages/bonsai-mcp/src/paths.ts` to point somewhere durable) |

| Prompt | Purpose |
|--------|---------|
| `bonsai/persona/master-debugger` | Decky focus, layout, log capture |
| `bonsai/persona/security-auditor` | Security / PII review |
| `bonsai/persona/foss-advocate` | FOSS / transparency |
| `bonsai/persona/refactor-specialist` | Maintainability sweeps |
| `bonsai/triage/focus-bug` | Short focus triage |
| `bonsai/triage/empty-ai-reply` | AI envelope debugging |

Resources: `bonsai://policy/{id}`, `bonsai://workflow/{id}`, `bonsai://persona/{id}`, `bonsai://architecture/{name}` (include **`focus-graph-patterns`** for new UI controls), `bonsai://index`.

**Archived:** Red/Blue ship counsel → [docs/archive/red-blue-counsel/](docs/archive/red-blue-counsel/README.md).

## 2. Decky Plugin Studio (`decky-plugin-studio`)

Operational Deck preview and deploy. Requires the [Decky Plugin Studio](https://github.com/qd313/decky-plugin-studio) VSIX.

**Source of truth:** [qd313/decky-plugin-studio](https://github.com/qd313/decky-plugin-studio) — not this repo. bonsAI consumes the VSIX/MCP server. Document DPS bugs, gaps, and needed adds/deletes/changes in [docs/mcp-setup.md](docs/mcp-setup.md) (findings log) **and** mirror them upstream (issue/PR). Do not permanently fix or fork DPS tooling only in bonsAI. Policy: `bonsai://policy/decky-plugin-studio`.

| Tool | Purpose |
|------|---------|
| `deck.configure` | Set DECK_IP, DECK_USER, ingest port |
| `deck.startTunnel` / `deck.stopTunnel` | Reverse SSH tunnel for NDJSON ingest |
| `deck.probeIngest` / `deck.tailIngest` | Debug log capture from Deck |
| `deck.captureScreenshot` | Pull Deck UI screenshot |
| `deck.deploy` | Build + deploy to Deck |
| `plugin.detect` / `plugin.build` / `plugin.verifyZip` | Workspace validation and build |
| `preview.start` / `preview.stop` / `preview.status` | In-IDE QAM preview |
| `preview.injectFocusEvent` | Simulate D-pad input |
| `preview.setHardware` | Hardware simulator |
| `preview.runSequence` | Input sequence + DOM snapshot |
| `preview.callRpc` / `preview.readLog` | Backend RPC and log tail |
| `preview.snapshotDom` / `preview.captureScreenshot` | DOM inspect + preview PNG |

## 3. Model and effort routing

Policy since 2026-09-05 (D59). The evidence, the cost table, and the per-session record are in
[docs/planning/33-model-routing.md](docs/planning/33-model-routing.md); this is the short form. A
`UserPromptSubmit` hook (`.claude/hooks/model-routing-check.py`, git-ignored, local to the maintainer's
machine) hands every implementation kickoff this table and asks the session for a gentle one-line
heads-up when the running model or effort is outside it. A second hook, the bookkeeper guard, refuses
a Fable session's own edits to the roadmap, testing docs, changelog and test files and points it to the
`bookkeeper` helper (Sonnet 5 high) instead; setting `BONSAI_BOOKKEEPER_GUARD=off` turns it off for one
session.

**Why it is shaped this way.** The model tier is the expensive lever, not the effort: Opus high to max costs
about 25% more per turn, Opus to Fable costs 2.5 to 3 times more, and Fable 5.1 max writes 4.5 times the
output per turn. Eight of ten usage-limit stalls were Fable max sessions. Cheap models did the ★ to ★★★
work fine when the cause was known. Focus and layout fixes failed on the device at every tier; measuring
first fixed them, not a stronger model.

| Work | Plan | Implement | Land and review |
|---|---|---|---|
| ★★★★★ and ★★★★★★ | Fable 5.1 max: decisions and lane briefs, not a long document | Sonnet 5 high lanes | Opus xhigh |
| ★★★ and ★★★★ | Opus xhigh | Sonnet 5 high lanes when the cause is known; Opus xhigh itself when it is not | Opus xhigh |
| ★ and ★★ | none, or Opus xhigh in the same session | Sonnet 5 high | Opus xhigh only if it touches focus or settings plumbing |
| `[focus]` `[layout]` `[ui]` | Opus xhigh, **after** a device measurement | Opus xhigh with the measurement; Sonnet only when the measurement already named the cause | Opus xhigh; the device row is the gate |
| Pixel polish | a measurement or a human; the tools cannot see pixels | Opus xhigh | human eyes |
| `[KB]` `[ollama]` backend | Opus xhigh | Sonnet 5 high | Opus xhigh; the eval harness, not the Deck |
| Docs, roadmap bookkeeping, explanations | | the `bookkeeper` helper (Sonnet 5 high) or Opus medium; a Fable session hands it off, the guard enforces this | |
| Read-only lookups with a checkable answer | | Haiku 4.5 or Sonnet 5 low; the caller greps to confirm | |
| Deck QA | Opus xhigh writes the rows and expect strings | Sonnet 5 high may run rows already written; never Haiku | Opus xhigh reads the failures |

Rules that go with the table:

- **Escalate one tier only after the tier below failed on the device twice with a measurement in hand.**
  Going up because a fix feels hard is what the record says does not help.
- **Opus effort:** xhigh for anything that writes code or a plan; medium for explanations and tooling
  fixes. Max on Opus bought nothing measurable over xhigh.
- **Refactor, in this order:** recon by Sonnet lanes citing `file:line` (`import-graph.json`, `git log -S`);
  the plan and the D entries on Opus xhigh; mechanical moves as Sonnet lanes, one move per commit, at
  most three lanes because refactor lanes overlap on files; behavior-touching steps (normalizers, RPC
  names, the focus registry) by Opus xhigh itself; landing and a device check after each batch, serial.
  REFACTOR-PLAN.md § Refactor rules still apply.
- **Lane sessions (bugs or features):** Opus xhigh orchestrates; Fable only when the same session also
  plans ★★★★★ scope. Five lanes at most, Sonnet 5 high, each brief carrying the ancestry check, file
  ownership, one fix per commit and the four gates. **Lanes return code, tests and a one-paragraph report
  only**; the orchestrator briefs the `bookkeeper` helper, which moves those rows in one commit per
  landing; the orchestrator never types them itself when it runs on Fable. Do not launch lanes near a
  usage-limit reset. A helper's front-matter effort is honored (every lane turn on record ran at high); a
  helper with no front matter inherits the main chat's effort, which is where the "max" lane turns came
  from.
- **Bookkeeper helper:** does three jobs — the docs sweep after a landing, writing tests to a stated
  behavior, and a set of code changes from a plan that already names the cause and the files. It works in
  the shared checkout and never switches branches. Handing off costs a little time, so it is worth it for
  a sweep or a batch of edits, not for a single line — batch every edit from one landing into one brief.
  It registers when a chat starts, so a chat opened before it was added falls back to a general-purpose
  helper pinned to Sonnet, given the same brief.
- **Haiku 4.5 is on trial** for read-only lookups whose answer the caller can check, log-tail summaries, and
  as the default model for `prompt` and `agent` hooks. Not for editing roadmap or testing docs, anything on
  the Deck, or any code. **Log every use in plan 33 § 4a** (what it looked up, grep-confirmed or not, whether
  Sonnet had to step in); more than two step-ins in ten uses and it is dropped. It is a tidy-up, not the
  lever; the lever is which tier runs the main session.
- **Max effort:** on Opus, use xhigh instead (max cost 5% more and bought nothing). On Fable, max only for
  ★★★★★ decision lists and lane briefs, or root-causing a bug that failed on the device twice with a
  measurement; Fable high otherwise. **Ultracode** (xhigh plus self-started workflows) only for read-only
  fan-out with checkable pieces: plan citation checks, multi-dimension diff review, KB card audits, batch
  lookups; pin the worker model to Sonnet or Haiku. Never for implementation, ★–★★ items, or as a session
  default. Details: plan 33 § 2a.

## Preview test suite

```bash
pnpm run test:preview:tier -- --tier=tier0 --evidence --write
pnpm run test:preview -- --filter=SMOKE-A
```

Workflow: `bonsai.workflow.get` with `id=tier-qa`. Deck-only E-bucket: `tests/preview-suite/deck-only-e-bucket.json`.

## Git policy

Do not `git push` unless the user explicitly asks. No `cursor/*` branches. See `bonsai://policy/git-branch`.

## Preview limitations

- Approximate `@decky/ui` mocks (not pixel-perfect Steam CEF)
- Hardware reads from simulator; Ollama at `127.0.0.1:11434` by default
- Focus/layout bugs need on-device QA via `deck.deploy`
