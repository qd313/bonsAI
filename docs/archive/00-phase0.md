# Phase 0 — Delete (completed 2026-08-02)

Findings from the Phase 0 verification pass. Written so later sessions don't
re-derive them. Commits: `00adaf4`, `c5c782a`.

---

## Test baseline — fully green as of `372aae5`

**Every suite passes. Any red is a regression you introduced.**

```
npm test         -> 44 files, 217 tests, all pass
npx tsc --noEmit -> exit 0, no output
npm run build    -> rollup succeeds, dist/index.js written
npm run test:py  -> Ran 399 tests, OK (skipped=4)
```

Phase 0 found two pre-existing Python failures at `aa8d2c4`. Both were stale
*tests*, not code defects, and both were fixed before Phase 1 (`7e81420`,
`372aae5`) so that later phases have an unambiguous signal:

| Test | Was | Fix |
|---|---|---|
| `test_local_ollama_teardown...test_removes_tags_and_home_paths` | ERROR — patched `local_ollama_teardown_service.subprocess`, which that module never imported | `b43480e` had moved process-stopping behind `_stop_local_ollama_listener`. Retargeted the assertion there. Also retargeted the other patches at the teardown module (it uses `from ... import`, so patching the source module never intercepted the calls) and switched the fake home from a hardcoded `/home/deck` to `tempfile.TemporaryDirectory` |
| `test_ollama_prompts_stream_instruction...test_character_off_encourages_playful_sarcasm` | FAIL — asserted the literal word `sarcastic` | `ff6547f` ("Thinking blurb copy refresh") deliberately reworded the branch to "disgruntled or dry-deadpan". Renamed to `test_character_off_requests_wry_tone` and asserted the durable intent instead of one adjective |

Both are the same failure mode the plan predicts for `settingsAndResponse.test.ts`
in Phase 3.2 — **tests pinned to implementation shape rather than behavior**, left
behind when the thing they mirrored moved. Worth remembering that the repo has
prior art for this: the fix is to re-assert the behavior, not to restore the old
wording.

> Side effect cleaned up going forward: the teardown test used to create real
> directories under `C:\home\deck` on a Windows dev host. Empty residue may still
> exist there from earlier runs; it is safe to delete and will not be recreated.

---

## `src/v0-drafts/` — deleted, was never tracked

56 files. Verified unreferenced: no dynamic imports, no build-config globs, no
string path references.

- `.gitignore:73` ignored it — `git ls-files src/v0-drafts` returned **0 files**.
  It was never committed, so `git` was never a recovery path.
- `tsconfig.json:23` excluded it from compilation.
- `packages/bonsai-mcp/scripts/generate-architecture.mjs:54` and `:67` skip it,
  so it never appeared in the generated module map.
- `vitest.config.ts:5` only collects `src/**/*.test.ts`.

Consequence the original plan didn't account for: **a fresh clone never had this
directory.** It cost a new contributor nothing; it only added local grep noise.

**Archived before deletion** to
`C:\Users\still\Documents\bonsai-v0-drafts-archive-2026-08-02.zip`
(228 KB, 56 entries verified readable). Outside the repo, so it will not be
picked up by any tooling.

The v0-drafts guards in `.gitignore`, `tsconfig.json`, and
`generate-architecture.mjs` were **left in place on purpose** — they cost a
reader nothing and stop the archived files from being committed or swept into
the generated module map if anyone restores them locally. The stale mention in
`docs/code-clarity.md` was removed, because a doc pointing at a missing
directory does mislead.

`docs/archive/roadmap-completed.md:20` still mentions v0-drafts. Left alone —
it is a historical record of what was true at the time, not current guidance.

---

## `src/config.ts` — was a generated artifact, not dead code

The plan called it "likely dead." Correct about *usage*, wrong about *why it
existed*:

- Zero importers. Nothing in `src/` imported it; `tsc --noEmit` is clean without it.
- It exported `HostIp` / `PcIp` string constants holding LAN IPs.
- **`scripts/build.sh` regenerated it on every full build** via
  `do_generate_config()`, called from `do_full_build()`. Deleting only the file
  would not have stuck — the next `./scripts/build.sh` would have recreated it.
- `scripts/build.ps1` never generated it. The Windows deploy path reads
  `DECK_IP` from `.env` directly (`build.ps1:16`), so it was unaffected.

Removed in `00adaf4`: the file, `do_generate_config()`, its call site, **and**
the `PC_IP` preflight assertion in `build.sh`. That last one matters — `PC_IP`
was consumed *only* by the generator, so leaving `: "${PC_IP:?...}"` would have
hard-failed `./scripts/build.sh` for any contributor whose `.env` lacked a
variable nothing used. Verified nothing else reads `PC_IP` or `DECK_IP` from the
environment at build time.

`.env.example` still documents `PC_IP`. Left in place — it is still the
documented way to tell the Deck which host to reach for Ollama at runtime; it is
just no longer a build-time input.

> **Note, not an action item:** `src/config.ts` was tracked in a public repo and
> its history still contains real LAN IPs. Deleting the file does not scrub
> history. Low sensitivity (private-range addresses), flagged for awareness only.

---

## Bonus finding — Phase 1's map-generation task is already done

Phase 1 asks whether `module-map.json` / `rpc-map.json` are hand-maintained or
generated, and says to write a generator plus a pre-commit hook if hand-maintained.

**They are already generated, and the hook already exists:**

- `.githooks/pre-commit` runs `packages/bonsai-mcp/scripts/sync-architecture-for-commit.mjs`,
  which regenerates and stages the architecture snapshots (`rpc-map.json`,
  `hotspots.json`, `import-graph.json`, `test-inventory.json`,
  `preview-tiers.json`, `env-vars.json` — the first three renamed/added later on
  2026-08-02; see [phase1-map-verification.md](phase1-map-verification.md)).
- Installed per clone by `pnpm run mcp:install-hooks`, wired to npm `prepare`
  (`package.json:24-25`) so it self-installs on `pnpm install`.
- `npm run mcp:validate` exists with a `--check-generated` drift flag.

Observed working: the hook fired on both Phase 0 commits. **Drift was zero** —
regenerating after deleting a `src/` file produced no diff, because the maps only
track imported modules and never referenced `config.ts` or `v0-drafts`.

Phase 1 should verify the maps against current code for accuracy, but the
"write a generator / add a hook" half of that phase is **already satisfied**.
Scope Phase 1 down accordingly.
