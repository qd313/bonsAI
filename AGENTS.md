# Agent guide (IDE-neutral)

This repository uses **two MCP servers** for agent-assisted development.

## 1. bonsAI knowledge (`bonsai`)

In-repo server: [`packages/bonsai-mcp/`](packages/bonsai-mcp/). Setup: [docs/mcp-setup.md](docs/mcp-setup.md).

**Session start:** `bonsai.session.bootstrap`

| Tool | Purpose |
|------|---------|
| `bonsai.session.bootstrap` | Always-on policy **ids** + fetch hints (full text via `policy.get`) |
| `bonsai.policy.list` / `bonsai.policy.get` | Policy slices (git, focus, deploy, …) |
| `bonsai.workflow.get` | Deck dev loop, tier QA, preview, screenshot ingest |
| `bonsai.docs.search` / `bonsai.docs.get` | Search or read `docs/` |
| `bonsai.arch.rpcMap` | RPC methods from `main.py` |
| `bonsai.arch.hotspots` | Change-risk hotspots + test inventory |
| `bonsai.arch.previewTiers` | Preview suite tier manifest |
| `bonsai.report.archive` | Append to `.cursor/agents/SUBAGENT_REPORTS.md` |

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
