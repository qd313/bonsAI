# How to work on bonsAI

The one "how to work here" guide, for people and for any AI tool. Claude Code also reads
[CLAUDE.md](CLAUDE.md), which holds only what is specific to that one tool and points back here for
everything else. Every other tool should read this file and nothing else to get started.

Alongside this, read [docs/lessons-learned.md](docs/lessons-learned.md) — the traps this project has
already fallen into. This file says how things work; that one says what has gone wrong.

## Writing to the maintainer

**Everything written to the maintainer is in simple, plain language.** Chat replies, questions,
reports, plans, and any document they will read.

Short sentences. Say what a person using the plugin would notice before any term of art. No internal
reference numbers, file paths, symbol names or measurement shorthand inside a sentence. Everyday
words instead of industry ones. Code-level detail belongs in a commit message, an audit document or
a test row — not in a reply.

Write-ups of measurements are where this slips most: say what changed for a person, then give the
number.

They have asked for this five times. On Claude Code a hook repeats the rule on every prompt, because
a line in a document was not enough for a long session to remember. A tool without that hook has to
follow the rule by reading this paragraph.

## What bonsAI is

A plugin for Decky Loader on the Steam Deck. It puts AI chat into the Quick Access Menu — the panel
that opens with the `...` button — and talks to Ollama running on the Deck itself or on a PC on the
same network. Nothing goes to a paid cloud service.

It ships as a TypeScript and React front end bundled into one file, plus a Python back end that
Decky Loader imports directly.

## Where things live

| Path | What is in it |
|---|---|
| `src/` | The screen side, TypeScript and React. Bundled to `dist/index.js` |
| `src/features/` | Whole features kept together (preset carousel, the Ask bar, voice) |
| `src/hooks/`, `src/components/`, `src/utils/`, `src/data/` | Most of the screen code, grouped by kind |
| `src/test-harness/` | Test setup and a stand-in for the Decky bridge |
| `main.py` | The class Decky loads. Every method the screen can call lives here |
| `py_modules/backend/services/` | The bulk of the back-end logic |
| `tests/` | Python tests |
| `packages/bonsai-mcp/` | An in-repo tool server, plus generated snapshots of the architecture |
| `scripts/` | Build, deploy, device capture, knowledge-base tooling |
| `docs/code-map.md` | Generated. Every file's title and purpose in one place — read this instead of counting files by hand |
| `docs/audit/` | Findings from past investigations. Read before working anything out again |

**Where each side starts.** The screen side starts at `src/index.tsx`, which wires up the tabs, the
styles and the calls to the back end; it is a composition root, not a god file. The back end starts
at `main.py`, named in `plugin.json`, with `class Plugin` and its `_main` and `_unload` lifecycle
hooks. `main.py` puts the plugin root on the import path itself, which is why back-end imports read
`from backend.services.X import ...`; `scripts/run_python_tests.py` reproduces that setup so tests
match what the loader does.

## How the two sides talk

This is the only channel between them. There is no HTTP server in the middle.

1. The screen calls `call<Args, Result>("method_name", ...args)` from `@decky/api`.
2. **Use `callDeckyWithTimeout()`** from [src/utils/deckyCall.ts](src/utils/deckyCall.ts) instead. It
   adds a 15-second deadline and tidies up error payloads. A bare `call()` can hang the panel
   forever. Watch the argument style: `call()` spreads its arguments, the wrapper takes an **array**.
3. Four places deliberately use the bare `call()`, each with a comment saying why: clearing plugin
   data, installing a knowledge-base corpus, and starting and stopping voice input. All four can
   outrun any deadline the panel could set. Anything new that skips the wrapper needs the same
   justification in a comment.
4. **A method the screen can call is any public `async def` indented four spaces inside
   `class Plugin`.** There is no decorator and no registry — the indentation *is* the contract.
5. `packages/bonsai-mcp/knowledge/architecture/rpc-map.json` lists every one of them. It is
   generated. Never edit it by hand.
6. **That generated map sorts methods by matching words in the name, so the name you choose decides
   where it is filed.** A knowledge-base method named `get_knowledge_base_*` lands under "other",
   away from its siblings, with no warning and no failure. Match the word the domain already uses.

Nothing checks at build time that a called name exists in Python, so a typo is a failure at run
time, on the device. Two calls once pointed at methods that existed nowhere; both call sites
swallowed the error, which is why nobody noticed for weeks. That is the lesson worth keeping.

## Settings

Settings live in `settings.json` under the folder Decky gives the plugin.

Adding one setting the user can see touches the Settings tab, the settings hook, the load and save
methods, the back-end settings service, and two schema files on the screen side.

**That list is the cheap half.** Measured: one true/false setting is about 18 files and 30 separate
edits end to end. The cost is not the value-checking, it is the plumbing. The settings hook repeats
the field list in **seven** places; the plugin root in five; each tab's payload hook in three. None
of that repetition is caught by a type or a test. Budget for the plumbing.

Two things make it survivable:

- A setting with an ordinary rule is **one row per language**, in the simple-field tables on each
  side. The two row counts differ on purpose. Only genuinely custom rules stay as functions, each
  annotated with why it is exempt.
- Two shared contract files are asserted from both languages — the fresh-install payload and a set
  of hostile inputs — so an incomplete two-language edit fails a test instead of shipping.

**Python wins where the two disagree.** The save method decides what reaches disk. One deliberate
exception is documented where it happens.

## The Steam Deck focus graph

This is the section that has cost the most time. Everything here was earned by a bug.

Full patterns:
[focus-graph-patterns.md](packages/bonsai-mcp/knowledge/architecture/focus-graph-patterns.md).

### Adding a new control

- **Design a new Settings or panel row as an explicit focus graph in the section's parent**: list
  every stop, wire the move handlers on the element that owns focus, and check it on the device.
  Copy the UI-scale section, the Ollama tab, or the pull-models dialog.
  - **The common case is an exception: a plain toggle added to a section that already has some needs
    no focus wiring at all.** It inherits the section's chain. The rule above is about a *new focus
    owner* — a new section, a slider, a row of buttons, or anything that must hand focus to a
    different container. Adding one toggle to an existing section? Stop here and just add it.
- **For sliders, use the two shared builder functions** rather than wiring a bridge by hand. A
  hand-wired version let one press step a slider twice or escape the row entirely. Four sliders share
  the fixed version now; build new ones the same way.
- **Never hop between controls by searching the page** — no `document.querySelector`, no attribute
  or class lookup, no checking `document.activeElement` to confirm a move worked. Under Decky the
  global `document` is **the wrong document**: plugin code runs in a context whose document is a
  14-element shell, while the panel renders into a different one. Use a ref, the registry, or the
  helpers in [uiDocument.ts](src/utils/uiDocument.ts).
- **A DOM `focus()` does not move Steam's own focus ring between containers.** It sets the active
  element while Steam's ring stays behind and then clears, so presses keep going to the container
  you were trying to leave — and any helper that checks the active element will report a move that
  never happened. Inside one container a plain `focus()` is fine. To leave a container, use the
  register, unregister and take functions in
  [navFocusRegistry.ts](src/utils/navFocusRegistry.ts), which add a null check and a real
  did-it-work check around the underlying Steam call. The only direct call left in the whole front
  end is inside the registry itself.
- **Know which handler actually fires before wiring one.** The move-up and move-down handlers are
  props on Steam's focusable wrapper: they do nothing on a Decky button, which does not forward
  them. The button-down handler fires on both, for **every** button, so read which button it was
  through the helpers in [focusNavigation.ts](src/utils/focusNavigation.ts) — never by turning the
  event into a string. A button-down handler that changes state without checking which button came
  in will fire on a D-pad press: three controls toggled themselves that way. Checking for keyboard
  Up and Down is dead code here — a D-pad press sends no keyboard events at all, measured on the
  device.
- **Never overwrite an existing `tabindex`, and never put `-1` on something naturally focusable.**
  Decky sets `tabindex="0"` on the things it navigates, so replacing it removes them from Steam's
  graph. **But adding a missing one can be just as wrong.** A helper used to stamp one onto any
  element that lacked it, on the theory that a real Steam-owned control always carries one. Measured
  on the device, that theory is false: three controls Steam really was focusing carried none, and
  the helper broke them. Check before writing either.
- **To ask which control the ring already owns, use the two gamepad-aware helpers**, not the DOM
  ones. They read Steam's own on-screen ring marker, where the older active-element check can return
  a confident wrong answer. Two shipped bugs came from exactly that.
- **The plugin now places the ring on the question box when it opens, unless something else already
  owns it** (fixed 2026-09-15, confirmed on the Deck twice out of three tries). Opening a Decky
  plugin used to leave the ring unowned, with the first Down landing on the Back button in the
  header and the second reaching the tab bar; that was normal Steam behaviour and not a bug, but it
  cost a person two wasted presses. **The one time it still does not hold:** the very first open
  right after a fresh deploy's loader restart, when Decky's own navigation node for the field is not
  ready inside the plugin's one-second attempt. A test step that opens the plugin right after a
  deploy and immediately asks where focus is may still read *unowned* — reproduce a report of "the
  first press does nothing" from an ordinary fresh open, not a just-deployed one, before treating it
  as a regression.
- **Never mark Deck-facing work done without a D-pad row** in [docs/testing.md](docs/testing.md) or
  [docs/testing-manual.md](docs/testing-manual.md) for the new chain.
- **Plan 62, 2026-09-20 — three controls landed together, left to this note on purpose:** the AI models
  screen's Filters button opens a panel of tickable rows (Down or B inside it, or Up from its first row,
  closes it and returns to the Filters button); the newest answer's Show details gained a second tab,
  Session (Left/Right switch tabs, Up leaves to Hide details, Down enters the open tab, B closes the whole
  panel); Read aloud is now a small speaker on the Helpful/Not row, reached by Left/Right once the thumbs
  are greyed out. None of the three has a device check yet — see [docs/testing.md](docs/testing.md).

### The "From the notes" block — a worked example

One control wired end to end, with every trap it hit on the Steam Deck: where it sits in the walk, what Up
and Down do, why it uses `onOKButton` and not `onActivate`, why it is registered in a local map rather than
the shared one, and why a finished reply is not `"live"` by the time someone walks up to it. Read it before
adding a control that sits between two existing stops:
[docs/focus-graph.md](docs/focus-graph.md).

### A check backs three of these up

`scripts/check-focus-patterns.mjs`, run as `pnpm test:focus` in the build checks, reads the actual
code — not a text search — on every push. It fails when a **new** case appears of: hopping by page
search, a move handler wired onto a control that ignores it, or a `tabindex` of `-1` taking a
control out of the graph. Existing cases are grandfathered in a baseline file, updated with
`--update` after a deliberate, reviewed fix. It is a net that catches a mistake after it lands, not
a substitute for reading this section first.

### When a focus bug lands

1. If a screenshot or capture is mentioned: `screenshots/` is not tracked by git, so list it with a
   plain directory listing sorted by time — a file-search tool returns nothing for untracked files —
   then read the newest one to three.
2. Name the section parent and the focus stops, and match them to a pattern in the patterns file
   before editing anything at the leaves.
3. Apply **one** fix that the evidence supports — graph owner, registry, or the slider bridge. Not
   speculative styling.
4. Still wrong after that? Escalate to the focus triage prompt first, and only then the fuller
   debugger persona. Do not jump to the full debugger for every mention of the D-pad.

## Commands

```bash
npm test                 # screen-side tests
npm run test:py          # Python tests
npx tsc --noEmit         # type check (the build does not type-check)
npm run build            # bundle to dist/index.js
npm run mcp:generate     # regenerate the architecture snapshots
npm run mcp:validate     # fails if the snapshots differ from what is committed
python scripts/verify.py --quick    # the gate to run before every commit
python scripts/verify.py --full     # everything above, for a merge
```

All of them pass on a clean tree. Any failure is a regression.

Deploying to a Deck needs a `.env` — copy `.env.example`. It supplies the address, user, port,
folder and plugin name.

```bash
./scripts/build.sh dev       # build and deploy to a Deck over SSH
./scripts/build.sh local     # build and deploy on this machine
./scripts/build.sh release   # build a distributable zip
```

`scripts/build.ps1` is the Windows equivalent of `dev`.

## Testing on the Deck

**When the maintainer has to run questions on the device, offer to pin them as fixed test chips
first — every time, before asking them to type anything.** Standing instruction.

1. Work out the exact questions the test row needs.
2. **Show the list and get it confirmed before pinning anything.** A wrong sentence invalidates the
   row it was meant to test; several knowledge-base rows are worded specifically around which words
   they avoid.
3. Only then pin them.

The reason it is a rule: the alternative is thumb-typing a sentence on an on-screen keyboard, once
per case, and one mistyped word changes what is under test without saying so.

Pin a batch by writing the fixed-chip setting (free text, 3 to 12 entries, 160 characters each — a
batch under 3 counts as off), or from the Developer tab. The pinned batch replaces the rotation in
order, badges each chip in amber, and stops reseeding until cleared. Pressing A fills the Ask field
exactly and **does not send** — sending is a separate step. `scripts/deck_send_ask.py` is the
fallback for a one-off sentence not worth a batch; it types the question and deliberately stops
short of sending.

## Before marking work done

Before marking Deck-facing work done — a feature, a plan step, or a bug fix — update these in the
**same change set as the code**, not as a follow-up:

1. **[docs/roadmap.md](docs/roadmap.md).** Feature shipped: move it to the completed archive and
   update anything that depended on it. Bug fixed: resolve the row. Partly shipped: move what
   landed, leave a smaller entry for the rest.
2. **[docs/testing.md](docs/testing.md).** Add or update the coverage row, with the test's status
   left open until it has run on the device. Add steps when the change needs new ones. For a bug
   fix, note which check now passes, or add a row that would catch it coming back.
3. **[docs/testing-manual.md](docs/testing-manual.md).** When a check there passes, tick it and move it to
   the closed archive in the same change. A pass written only in the roadmap or testing.md leaves the box
   looking owed; that happened to the ban lookup's four checks on 2026-09-23. The closed-rows check in
   `scripts/verify.py` now fails a change that closes a row in one place and leaves it open in another.
4. **[docs/troubleshooting.md](docs/troubleshooting.md)** — whenever setup, permissions or what the
   user sees has changed.

A documents-only change needs no matching code change. The reverse is not true.

## Conventions

- **Every file opens with a header** — title, purpose, what it is used for, what problem it solves,
  and what it deliberately does not do. Match it when adding a file. The rules, and what is exempt,
  are in [docs/code-clarity.md](docs/code-clarity.md). Headers never carry counts or line numbers.
- **Screen work follows [docs/design-language.md](docs/design-language.md).** Eight rules, each
  earned by a bug. The first: the panel column is 300 pixels — use all of it, and treat a gutter as
  a bug until proven otherwise. Also: never target Steam or Decky by class name, because those names
  are scrambled at build time and match nothing; width comes from the stylesheet, not from a
  measurement; and measure on the device before changing layout, because a screenshot cannot show
  which element is at fault. The values live in [docs/design-tokens.md](docs/design-tokens.md).
- **Keep the names of back-end methods stable.** Renaming one is a breaking change across two
  languages with no compiler to catch it.
- **Generated files are not editable.** The JSON snapshots under
  `packages/bonsai-mcp/knowledge/architecture/` are rewritten and staged by the pre-commit hook on
  every commit. Change the generator instead. Three other files are rewritten on every commit too,
  so a comment typed into one vanishes; they are listed in
  [docs/code-clarity.md](docs/code-clarity.md).
- **`import-graph.json` answers "who imports this?"** — the full both-ways list for every file on
  the screen side, plus cycles and orphans. Check it before moving anything; it is more reliable
  than a text search, which misses imports written at a different relative depth. `hotspots.json` is
  a size ranking, not a dependency map.
- **One change per commit**, behaviour preserved, tests green in between. Never mix moving code with
  rewriting it — it makes the change unreadable and makes it impossible to find the breaking commit
  later.
- **No new shared abstraction without three existing places** that would collapse into it.
- **Cite the file and line for a factual claim.** Write "unknown" rather than guessing.
- **Write findings into `docs/audit/`, not into chat**, so the next session reads a summary instead
  of working it out again.
- **Establish who calls what with a text search and `git log -S`.** Read a whole file only when
  changing it or when its logic is genuinely unclear.
- **When a test fails after a move**, check whether it was asserting the shape of the code rather
  than the behaviour, before contorting the code to keep it passing.
- **Do not `git push` unless the maintainer explicitly asks.**

## Which model does which work

The short form. The evidence and the cost table are in
[docs/planning/33-model-routing.md](docs/planning/33-model-routing.md).

The model tier is the expensive lever, not the effort setting. Opus from high to max costs about a
quarter more per turn; Opus to Fable is two and a half to three times more. Eight of ten times the
usage limit stopped a session, it was a Fable session at max. Cheaper models did the one- to
three-star work fine when the cause was already known. Focus and layout fixes failed at every tier
until someone measured on the device — the measurement fixed them, not a stronger model.

| Work | Plan | Implement | Land and review |
|---|---|---|---|
| Five and six stars | Fable 5.1 max: decisions and briefs, not a long document | Sonnet 5 high | Opus extra-high |
| Three and four stars | Opus extra-high | Sonnet 5 high when the cause is known; Opus itself when it is not | Opus extra-high |
| One and two stars | none, or Opus in the same session | Sonnet 5 high | Opus only if it touches focus or settings plumbing |
| Focus, layout, screen work | Opus extra-high, **after** a device measurement | Opus with the measurement in hand | Opus; the device row is the gate |
| Pixel polish | a measurement or a person — the tools cannot see pixels | Opus extra-high | human eyes |
| Knowledge base and back end | Opus extra-high | Sonnet 5 high | Opus; the answer-quality harness, not the device |
| Documents and bookkeeping | | Sonnet 5 high or Opus medium | |
| Read-only lookups with a checkable answer | | Haiku 4.5 or Sonnet 5 low; whoever asked confirms with a search | |
| Deck testing | Opus writes the rows and the expected results | Sonnet may run rows already written; never Haiku | Opus reads the failures |

Rules that go with it:

- **Move up a tier only after the tier below failed on the device twice, with a measurement in
  hand.** Going up because a fix feels hard is what the record says does not help.
- **Opus effort:** extra-high for anything that writes code or a plan, medium for explanations and
  tooling fixes. Max bought nothing measurable over extra-high.
- **Helper lanes:** at most five for feature or bug work, at most three for a refactor, because
  refactor lanes overlap on files. Each brief carries the check on what its copy is based on, which
  files it owns, one change per commit, and the gates to run. **Lanes hand back code, tests and a
  short report only** — they never edit the roadmap, the testing documents or the changelog. Do not
  start lanes just before the usage window resets.
- **Haiku 4.5 is on trial** for read-only lookups whose answer can be checked, and for summarising
  logs. Not for editing documents, anything on the device, or any code.

## The two tool servers

Setup, and the running log of problems found, are in [docs/mcp-setup.md](docs/mcp-setup.md).

**bonsai** is in this repo, under `packages/bonsai-mcp/`. It serves the policies, the workflows, the
personas, the architecture snapshots and a search over `docs/`. Call its session bootstrap yourself
at the start of a session — nothing injects it automatically.

**decky-plugin-studio** builds, deploys and drives a real Deck. **It is a separate project and that
repo is the source of truth.** When it has a bug or a gap, write it in the findings log in
[docs/mcp-setup.md](docs/mcp-setup.md) *and* raise it upstream. Do not quietly fix or fork its
tooling inside bonsAI.

The two personas that review code live in [docs/agents/](docs/agents/) as plain documents, so they
read the same whether a person opens them, Claude runs them as an agent, or another tool calls the
matching prompt.

**The in-panel preview is shelved.** It has never got past its loading screen on this machine, so
nothing gates on it, and it cannot check Deck focus behaviour in any case — it has no equivalent of
Steam's gamepad focus system. Use the device.
