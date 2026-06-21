---
id: scripts-automation
title: Scripts and automation
tags: [deploy, scripts, alwaysApply]
alwaysApply: true
description: Build/deploy discipline, flaky retry, and debug ingest tunnel rules
---

## Scripts & Automation

- ALWAYS capture and inspect the full stdout and stderr of the actual failing command before forming hypotheses; NEVER rely solely on exit codes or indirect diagnostics from surrounding code.
- NEVER hardcode credentials, secrets, IP addresses, hostnames, or any developer-local configuration in version-controlled files; ALWAYS externalize them to a gitignored `.env` (loaded at runtime) with a committed `.env.example` template documenting every required variable.
- ALWAYS validate runtime/deployment parity before debugging behavior: after refactors, prove all moved modules import and load on target (plugin startup logs plus a smoke RPC) before changing feature logic or UI.
- **Deck deploy build — always run `scripts/build.ps1` / `scripts/build.sh`:** After any change to `src/`, `main.py`, `plugin.json`, or other Deck-facing artifacts—and as the **final step** before wrapping debugging or handoff—run **`./scripts/build.ps1`** (Windows) or **`./scripts/build.sh`** (Linux) yourself in the agent session (do not only instruct the user). The scripts load repo-root `.env`, run install + Rollup build, and deploy to the Deck (see each script for behavior); when deploy is in scope, confirm `plugin_loader.service` startup is clean before the next hypothesis loop.
- **Flaky runs — keep trying:** `scripts/build.ps1` documents that **`scp` / remote Decky Loader steps can fail or look stuck**; **~60 seconds with no new output** usually means you should **stop the run and start the script again**—a **second attempt often succeeds**. On **any** non-zero exit or hang, capture **full stdout/stderr**, then **retry the full script at least once** before assuming a code regression (transient SSH or deck-side issues are normal).
- **If it runs too long — escalate to the user:** If wall-clock **exceeds ~3 minutes** or there is **no progress for ~60–90 seconds** (especially after a retry), **do not block indefinitely** — summarize the last successful stage and output tail, then **ask the user** whether to retry, run **`pnpm run build`** only (skip full deploy), or stop.
- When instrumenting the Decky front-end with `fetch` to `http://127.0.0.1:<port>`, treat `<port>` as **the Deck's loopback** unless an SSH reverse tunnel (e.g. from the dev PC: `ssh -N -R 127.0.0.1:<port>:127.0.0.1:<port> deck@<deck-host>`) forwards that port to the machine where the ingest server runs; **verify with a probe from an SSH session on the Deck** (same URL as the plugin) before asking the user to reproduce for log capture.
