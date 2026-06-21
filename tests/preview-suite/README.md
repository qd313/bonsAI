# Preview suite — tier batches

Scenario JSON files in this directory are driven by [scripts/run-preview-suite.mjs](../../scripts/run-preview-suite.mjs) and mapped to [docs/testing.md](../../docs/testing.md) tiers via [tier-manifest.json](./tier-manifest.json).

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

**Doc writeback (`--write`):** PASS → [testing.md](../../docs/testing.md#test-results); FAIL → [testing.md](../../docs/testing.md#failures-and-retries). Rows dedupe by scenario ID.

Agent loop: [.cursor/skills/bonsai-tier-qa/SKILL.md](../../.cursor/skills/bonsai-tier-qa/SKILL.md).

## Batch keys

| Batch | Runbook | Scenarios |
|-------|---------|-----------|
| `preGate` | Regression §1 | UNIT-A, UNIT-B |
| `tier0` | Tier 0 | SMOKE-A, C, F (5) |
| `tier1Core` | Tier 1 | SMOKE-B, SMOKE-E, BG-ASK |
| `tier1Boundaries` | Tier 3 TDP/GPU | TDP-*, GPU-800 |
| `tier2` | Tier 2 | char/VAC/stream/mDNS/desktop/vision |
| `deckOnly` | Tier 3–4 | E-* (skipped in preview; stub evidence) |
