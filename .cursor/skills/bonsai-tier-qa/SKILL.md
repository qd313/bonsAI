---
name: bonsai-tier-qa
description: >-
  Agentic tier-by-tier QA for bonsAI: preGate → Tier 0 → Tier 1+ preview batches,
  evidence under docs/test-evidence/, doc writeback to testing.md
  (Test Results and failures sections). Pivot to single-scenario runs when a batch is flaky;
  use deck.deploy for E-bucket deck-only scenarios.
---

# bonsAI tier QA loop

## When to use

- Closing a runbook tier ([testing.md](../../docs/testing.md))
- After changes to `src/`, `main.py`, preview scenarios, or RPC paths
- User asks for preview-suite / tier QA / evidence writeback

Companion skills: [decky-preview](../decky-preview/SKILL.md), [bonsai-deck-dev-loop](../bonsai-deck-dev-loop/SKILL.md).

---

## Preflight

1. **Shell gates** (no preview required):
   ```bash
   pnpm exec tsc --noEmit
   pnpm run test:preview:tier -- --tier=preGate --evidence --write
   ```
2. **Preview panel** — Command Palette → **Decky: Open Preview** (keep tab open).
3. **Sidecar** — Confirm RPC works:
   - `preview.status` or read `~/.decky-plugin-studio/preview-state.json` for `url` + `httpPort`
   - If tier0 RPC steps fail with `fetch failed`, restart preview or start sidecar manually (see decky-plugin-studio sidecar docs).
4. **Ollama** — Required for `tier1Core`, `tier1Boundaries`, `tier2` (`requiresOllama` in [tier-manifest.json](../../tests/preview-suite/tier-manifest.json)).
5. **Build parity** — After `src/` / `main.py` / `plugin.json` edits: `plugin.build` or `./scripts/build.ps1` before on-device QA.

Record environment in [testing.md](../../docs/testing.md) **Environment matrix** before Tier 1+.

---

## Tier loop

Batches and order: [tests/preview-suite/tier-manifest.json](../../tests/preview-suite/tier-manifest.json) → `executionOrder`.

```bash
# Full tier with evidence + doc writeback (PASS/FAIL → testing.md)
pnpm run test:preview:tier -- --tier=tier0 --write

# Evidence only (no doc mutation)
pnpm run test:preview:tier -- --tier=tier0 --evidence
```

| Batch | Runbook | Preview | Ollama |
|-------|---------|---------|--------|
| `preGate` | Regression §1 | No | No |
| `tier0` | Tier 0 | Yes | No |
| `tier1Core` | Tier 1 | Yes | Yes |
| `tier1Boundaries` | Tier 3 clamps | Yes | Yes |
| `tier2` | Tier 2 opt-in | Yes | Yes |
| `deckOnly` | Tier 3–4 E-bucket | **No** (skipped) | — |

After each batch:

1. Read `docs/test-evidence/<batch>/<date>-<sha>/batch-summary.json`
2. Review FAIL rows in [testing.md](../../docs/testing.md#failures-and-retries)
3. Update [testing.md](../../docs/testing.md) progress tracker (auto via `--write`)
4. **Do not proceed** to next tier if core smokes FAIL without triage

---

## Pivot to single scenario

When a batch is flaky or one scenario blocks the rest:

```bash
pnpm run test:preview:tier -- --tier=tier0 --filter=SMOKE-A --evidence --write
pnpm run test:preview:tier -- --tier=tier0 --filter=SMOKE-C --evidence --write
```

Inspect evidence per scenario:

- `manifest.json` — status, error, file list
- `dom-final.html`, `focus-path.json`, `rpc-last.json`
- `final.png` (html2canvas when extension ≥ 0.1.2)
- `plugin-log-tail.txt`

Fix root cause, re-run **only** the failed ID, then re-run the full tier batch once green.

---

## E-bucket (deck-only)

Scenarios in [deck-only-e-bucket.json](../../tests/preview-suite/deck-only-e-bucket.json) are **not runnable in preview**. Runner marks them `skipped` and writes stub manifests.

**On-Deck path:**

1. `deck.configure` — set DECK_IP, DECK_USER
2. `plugin.build` → `deck.deploy`
3. Optional: `deck.startTunnel` → `deck.probeIngest` / `deck.tailIngest`
4. Manual runbook steps for **QAMP-DECK-***, CEF/CORS, clean install
5. Record PASS/FAIL in [testing.md](../../docs/testing.md) with build + SteamOS version

Use [decky-screenshot-ingest](../decky-screenshot-ingest/SKILL.md) for layout/focus evidence.

---

## Doc writeback rules (`--write`)

- **PASS** → upsert row in `testing.md` **Test Results** (dedupe by preview scenario ID)
- **FAIL** → upsert row in `testing.md` **Preview FAIL table**
- Checkboxes ticked **PASS only** when `checkboxIds` match list items in testing.md
- Notes are short: `[manifest](test-evidence/.../manifest.json)` (+ truncated error on FAIL)

---

## Subagent escalation

| Issue | Persona |
|-------|---------|
| Focus / layout / ingest | **master-debugger** |
| RPC / logging / permissions | **security-auditor** |
| Ship scope / tier priority | **red-team** / **blue-team** |

Archive substantive runs in [.cursor/agents/SUBAGENT_REPORTS.md](../../.cursor/agents/SUBAGENT_REPORTS.md).
