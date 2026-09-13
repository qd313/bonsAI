# Preview suite — tier batches

Scenario JSON files in this directory are driven by [scripts/run-preview-suite.mjs](../../scripts/run-preview-suite.mjs) and mapped to [docs/testing-manual.md](../../docs/testing-manual.md) tiers via [tier-manifest.json](./tier-manifest.json). Hub: [docs/testing.md](../../docs/testing.md).

## Running

```bash
# All scenarios (legacy)
pnpm run test:preview

# One tier batch with evidence + doc writeback
pnpm run test:preview:tier -- --tier=preGate --write
pnpm run test:preview:tier -- --tier=tier0 --evidence          # no doc writeback
pnpm run test:preview:tier -- --tier=tier0 --write               # evidence + docs

# Single scenario (pivot when a tier batch is flaky)
pnpm run test:preview -- --tier=tier0 --filter=SMOKE-A --evidence --write

# Preview panel required for tier0+ (C/D buckets): Decky: Open Preview
```

Evidence lands in `docs/test-evidence/<batch>/<date>-<sha>/<scenario-id>/`.

**Doc writeback (`--write`):** PASS → [testing-results-2026.md](../../docs/archive/testing-results-2026.md); FAIL → [testing-failures-2026.md](../../docs/archive/testing-failures-2026.md); progress → [testing-manual.md](../../docs/testing-manual.md). Rows dedupe by scenario ID.

Agent loop: `bonsai.workflow.get` id=`tier-qa`.

## Batch keys

| Batch | Runbook | Scenarios |
|-------|---------|-----------|
| `preGate` | Automated gates | UNIT-A, UNIT-B |
| `tier0` | Tier 0 | SMOKE-A, C, F (5) |
| `tier1Core` | Tier 1 | SMOKE-B, SMOKE-E, BG-ASK |
| `tier1Boundaries` | Tier 3 TDP/GPU | TDP-*, GPU-800 |
| `tier2` | Tier 2 | char/VAC/stream/mDNS/desktop/vision |
| `deckOnly` | Tier 3–4 | E-* (skipped in preview; stub evidence) |
