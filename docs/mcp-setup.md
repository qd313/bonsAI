# bonsAI MCP setup

bonsAI uses **two complementary MCP servers**:

| Server | Package | Role |
|--------|---------|------|
| **bonsai** | In-repo [`packages/bonsai-mcp/`](../packages/bonsai-mcp/) | Policies, workflows, personas, architecture index, doc search |
| **decky-plugin-studio** | [Decky Plugin Studio](https://github.com/qd313/decky-plugin-studio) extension | Build, deploy, preview, tunnel, screenshots |

## Decky Plugin Studio (source of truth)

[Decky Plugin Studio](https://github.com/qd313/decky-plugin-studio) (DPS) is a **separate project**. That repo is the source of truth for the extension, MCP `deck.*` / `preview.*` / `plugin.*` tools, capture/record helpers, and Init Pack templates. bonsAI only **consumes** the published VSIX (see [upstream consumer sync](https://github.com/qd313/decky-plugin-studio/blob/main/docs/MCP_CONSUMER_SYNC.md)).

| Situation | What to do |
|-----------|------------|
| Bug, gap, or confusing DPS behavior while working in bonsAI | Document it here (this file and/or [troubleshooting.md](troubleshooting.md) § Decky Plugin Studio) **and** open or update an issue/PR on [qd313/decky-plugin-studio](https://github.com/qd313/decky-plugin-studio) |
| Need to add / delete / change DPS tooling, MCP surface, pack skills, or capture scripts | Change **upstream first** (or in the same effort), then bump the consumer VSIX / `mcp.json` pin in bonsAI |
| Temporary workaround only in bonsAI | Still document the workaround **and** the intended upstream fix so it is not forgotten |

Do **not** permanently fork DPS behavior into bonsAI. Product-specific MCP (`bonsai`) and app code stay here; studio ops stay in DPS.

**Which file your client reads.** `mcp.json` (repo root, no leading dot) is a generic config that
any MCP client can point at, or that some auto-load by convention; **`.mcp.json` — with the
leading dot — is Claude Code's**, and it was missing entirely until 2026-08-27, so Claude Code
sessions had *no* MCP servers while `mcp.json` sat in the root looking authoritative. The failure
is silent: tools are simply absent, with no error and nothing in the transcript to say a server
was expected. If tools are missing, check which file your client actually reads before debugging
the server. Keep the two in step.

**Installed version:** pin `mcp.json` to the installed VSIX path under your editor's extensions
folder (for example `~/.cursor/extensions/decky-plugin-studio.decky-plugin-studio-extension-<version>/`
on a VS Code-family editor that uses that layout). After upgrading the VSIX, update the path and
reload the MCP client.

### DPS findings log (bonsAI)

Record consumer-facing notes below so maintainers can sync upstream. Newest first.

**Full write-up with DPS `file:line` citations and requested changes:
[planning/02-dps-upstream-findings.md](planning/02-dps-upstream-findings.md)** (drafted
2026-08-08 against DPS `e7af320` / v0.3.6 — ready to file as upstream issues). The rows
below are the index; the draft is the detail.

| Date | Finding | Documented in bonsAI | Upstream (issue/PR) | Status |
|------|---------|----------------------|---------------------|--------|
| 2026-09-23 | **`deck_replayChecks` refuses to replay a check saved before a deploy, reporting a different build fingerprint — so replay can never run right after a deploy, which is exactly when it is meant to.** The fingerprint appears to include the plugin's own Python cache files, which change on every deploy, so the build looks "different" even when nothing a person would notice has changed. Reported to the Decky Plugin Studio session 2026-09-23. Ask: leave the Python cache files out of the fingerprint. **Update 2026-09-25:** the fix is already written in the Deck tools project (its commit `556ffcb`, 2026-09-23, leaves Python cache files out of the build fingerprint), but it is not pushed, and the night this was seen the tools were still running the old code. Left: re-save the saved walks on a current build and push the tools project; even then, a replay across builds shows the differences rather than a pass. Planned in plan 70. | this file | *pending* | Fix written upstream, not pushed |
| 2026-09-25 | **The walk check judges a stop "visible" by sampling 9 points across its whole box, rather than where its text actually sits — so the question row and the answer's last part always read part-hidden behind the Retry and Copy corner icons, even though a person can read them fine.** Found while planning plan 70. Tools project, `mcp-server/src/deck/readFocus.ts` around lines 121–135 and 493–545. Ask: sample around the text itself, not the whole box. Owed upstream. | this file | *pending* | Open, needs filing |
| 2026-09-19 | **The exit-game tool trusts Steam's own running-apps list, which can read empty while the game process is still alive; the screen-reading connection can also drop mid-run while SSH still works.** Tonight, mid-Black-Mesa, the connection this session uses to see the screen and press buttons stopped answering for several minutes; once it came back, Steam's own running-apps list said nothing was running, but the Black Mesa process itself was still alive at full CPU on its own main menu, 32 minutes after the last press. The session ended it over SSH by process, not through the exit tool. Ask: have the exit tool check the process list as well as Steam's own running-apps list before deciding nothing is running. | [archive/61-automated-verification-session.md](archive/61-automated-verification-session.md) § 10 | *pending* | Open, needs filing |
| 2026-09-18 | **The game-launch tool can only find a game on the Recent Games row, not the full Library.** Tonight, God of War, Hollow Knight, Black Mesa and Doom 64: Retribution are all installed on the Deck, but none had been played recently, so none was on that row and the launcher refused all four before pressing anything. Raise upstream: launch from the Library grid, not only the Recent Games row. | [roadmap.md](roadmap.md) § Verify | *pending* | Open, needs filing |
| 2026-09-15 | **The settings-snapshot tool crashes on a real settings folder.** `deck_snapshotSettings` with `includeData` failed with `spawnSync cmd.exe ENOBUFS` against a 75 MB settings and data folder that includes the voice models. The session backed the folders up over SSH with `tar` instead (`runs/plan55-backups/`). Ask: stream or chunk the copy instead of buffering it whole. | this file | *pending* | Open, needs filing |
| 2026-09-15 | **The build-match check in `deck_checkReady` can never pass.** It compares 151 files in this checkout against 188 on the Deck, so the file count never matches even right after a clean deploy. Ask: compare by hash of the files that matter, or drop the file-count half of the check. | this file | *pending* | Open, needs filing |
| 2026-08-28 | **P1-12 — the controller bridge intermittently fails to open its COM port since v0.3.9, killing a walk mid-run.** Seen four times in one evening, always the same shape: `deck_status` reports `bridgeReady: true`, a run of presses lands, then a later press in the same or next call dies with `pad.py exit 1 … open_port` — and the very next call works again. Never seen before tonight; v0.3.9 changed pad.py and removed a 3-second per-command wait, so the suspicion is two invocations now overlapping on COM7 where the old dead wait accidentally serialized them. Cost: `deck_walkTo` died mid-walk twice and a `deck_runSequence` lost its first step (recovered because `stopOnFailure: false`). Workaround that held: prefer one `deck_runSequence` batch over many single calls, and just retry on failure. | this file | — | Open, needs filing |
| 2026-08-28 | **P1-11 — `deck_deploy` (remote) cannot deploy to a stock Decky install at all: it writes as `deck`, and every plugin directory under `~/homebrew/plugins` is owned by `root`.** After the Deck rebooted mid-session the tool refused with a clear, well-written error naming the cause and two remedies, so this is not a reporting bug — it is a missing prerequisite. Measured: `~/homebrew/plugins` and all 10+ plugin directories on this Deck are `root:root` (Decky Loader 3.2.8-pre1 runs as root and owns them), while `sudo -l` shows `deck` has `(ALL) ALL` **with a password** and only two unrelated NOPASSWD entries. So the `deck` account cannot create, replace, rename or remove a plugin directory, and the fallback the error suggests (`ssh deck@… sudo rm -rf …`) also prompts for a password a non-interactive rig cannot answer. Related to **P1-8** — same root ownership, opposite symptom: there the upload succeeded and shipped unreadable, here it correctly refuses to start. Two things would fix it without asking every user to grant blanket passwordless sudo: install through Decky Loader's own root service instead of `deck`, and state the sudo requirement up front (in `deck_configure`/`deck_status`) rather than at the first failed deploy. Blocks all device QA until the maintainer acts. | [testing.md](testing.md) **DRG-GLOSSARY-01** (the row it blocked) | — | Open, needs filing |
| 2026-08-28 | **P2-5 — `deck_getEnv` reports `pluginLoaderActive: "inactive
inactive"` while the loader is running.** Measured against the same Deck in the same minute: `systemctl is-active plugin_loader` returns `active` and `pgrep` shows two live `PluginLoader` processes (`Decky Loader v3.2.8-pre1`). The doubled value suggests the probe queries two unit names and concatenates both answers, so a Deck where only one name exists reads as `inactive` twice rather than as `active`. Cheap to trip over: it is the field you check first when asking why a deploy or a panel open failed, and it points away from the real cause. | this file | — | Open, needs filing |
| 2026-08-28 | **P1-10 — `deck_walkTo` / `deck_readFocus` report a focused control's *text*, never its accessible name, so an icon-only control reads back as everything around it.** bonsAI's tab strip icons now carry an `aria-label` (*Ask bonsAI*, *Where AI runs*, …), and a page read confirms it on the focused element's own title node — but the rig still returns `ownerText: "About bonsAIBackend Ollama Node for Steam…"`, i.e. the whole tab's contents, because it walks up to the nearest ancestor with text. That is exactly what made a chip look focused while the ring was on the tab strip: label matching found chip text from the strip. Ask: prefer `aria-label` (and `aria-labelledby`) on the focused element and its subtree before falling back to ancestor text. | [testing.md](testing.md) **FOCUS-CHIP-RING-01** | DPS f3e25b8 | Fixed upstream (DPS f3e25b8, v0.3.9), **verified on device 2026-08-28**: icon-only controls now report their own aria-label (`labelSource: "aria-label"`), ancestor text no longer satisfies a walk, and unnamed containers say so |
| 2026-08-28 | **P1-9 — `deck_openPlugin` reports `alreadyOpen: true` when the ring is merely on the Decky pane header, with the plugin panel not mounted at all.** Seen three times in one session, each after a `plugin_loader` restart: the stage detail reads *"ring is already inside \"bonsAI\"'s own panel (`<BUTTON>` in \"Decky\")"*, while a page read shows no `.bonsai-scope` in the document. The caller then acts on a panel that is not there. Ask: verify the plugin's own root is mounted, not just that the ring sits somewhere inside the Decky pane. Workaround: read the page for the plugin's root element after `deck_openPlugin` and press Down + A yourself if it is missing. | [testing.md](testing.md) run notes 2026-08-28 | DPS v0.3.9 | Fixed upstream (v0.3.9 rootSelector / panelRootSelector), **verified on device 2026-08-28** twice: with `.decky/preview.json` naming `.bonsai-scope`, `deck_openPlugin` reported 'panel is NOT open whatever the pane labels say', drove the open itself and confirmed the mount — first fully autonomous opens ever |
| 2026-08-28 | **P1-8 — `deck_deploy` (remote) ships the plugin unreadable: every uploaded directory lands `drwx------ root:root`, so the unprivileged backend dies at import** (`No module named 'backend'` in the loader log) while the root-served frontend still renders — which disguises the failure as a settings bug (settings fail to load, panel resets to defaults per D18). Cost three loader restarts before the log was read. Cause is the elevated-copy chain (`sudo cp -a` preserves the 700 staging modes, then `chown -R root:root`), introduced by the P2-5 fix. Workaround: `chmod -R u+rwX,go+rX` on the plugin dir over SSH, then restart `plugin_loader`. **Rule: when a deploy "didn't take", read the loader log before blaming settings.** | [roadmap.md](roadmap.md) § Platform / upstream | DPS v0.3.9 | Fixed upstream (staging-dir chmod in deployHelpers.ts), **verified on device 2026-08-28** on two consecutive deploys: everything landed `drwxr-xr-x`, backend imported cleanly, no manual chmod for the first time |
| 2026-08-27 | **P1-7 — `deck_waitFor`'s verdict contradicts its own value, in both directions.** One session observed `satisfied: true` on a `null` (the reply it waited for had not started — the false-success direction that makes this P1); a second session observed `satisfied: false` after the full timeout with a truthy final `value`, twice, once a plain boolean `true` — so "return only booleans" is not a workaround. Practical rule until fixed: treat `value` as the finding and confirm any wait with a direct `deck_readPage`. | [audit/spoiler-dpad-01-keydown-dead-code-2026-08-27.md](archive/spoiler-dpad-01-keydown-dead-code-2026-08-27.md) § blockers | DPS `docs/ROADMAP.md` row | Filed upstream |
| 2026-08-27 | **P3-4 — `deck_status` does not report bridge health**, the one thing that actually blocked a session (board unplugged; every press tool refused, nothing surfaced it earlier). Ask: probe the COM port and report `bridgeReady`. Until then: one harmless direction press is the first act of any device session. | same | DPS `docs/ROADMAP.md` row | Filed upstream |
| 2026-08-27 | **P3-5 — `deck_openPlugin` fails when the panel is already open** ("walked 1 control(s) without finding bonsAI" — while standing inside bonsAI; its own failure payload shows `deckyPluginRoot: true`). Ask: report success with `alreadyOpen: true`. Workaround: read the failure's focus payload before retrying. | same | DPS `docs/ROADMAP.md` row | Filed upstream |
| 2026-08-27 | **P3-6 — `deck_runSequence` refuses to start from an unowned ring**, which is the normal state after every plugin open and every finished Ask; `deck_walkTo` already has `acquireFocus` for exactly this. Ask: same option, default on. Workaround: one `deck_walkTo` (or bare press) to place the ring before the sequence. | same | DPS `docs/ROADMAP.md` row (filed by the 2026-08-26 session) | Filed upstream |
| 2026-08-30 | **P3-7 — `deck_openPlugin` needs 2-3 attempts after `deck_deploy`, and the retry can toggle the QAM closed.** Reproduced 5/5 deploy cycles. Attempt 1 fails at `read-initial` scanning only `SharedJSContext` (QAM targets not enumerable yet after the loader restart); attempt 2 reads focus fine but fires the QAM chord blind, and since the chord is a toggle it *closes* an already-open QAM, leaving the UI worse than it found it; attempt 3 works. Asks: retry target enumeration before declaring the debugger unreachable, and gate the chord on `visibleQuickAccessTab` rather than firing unconditionally. Filed upstream as [DPS#3](https://github.com/qd313/decky-plugin-studio/issues/3). Workaround: just call it up to three times. | this session's device QA | [DPS#3](https://github.com/qd313/decky-plugin-studio/issues/3) | Filed upstream |
| 2026-08-27 | **P2-4 — `deck_captureScreenshot` is broken when `mcp.json` points at the DPS source tree: the build does not copy capture scripts into `dist`.** The tool errors with *"Missing capture scripts: …/mcp-server/dist/scripts/deck/studio-capture-common.sh or studio-capture.sh"*. Pointing at the source tree is not optional — P1-6's fallout (`d98a97a`) is why the version-pinned extension path was abandoned — so on-device screenshots are simply unavailable from agent sessions. Ask: copy `scripts/` into `dist` at build time, or resolve the scripts from the source tree when `dist` lacks them. Workaround: `scripts/screenshot-deck.ps1` in this repo. **Corroborated 2026-08-30, failing one step earlier:** both `deck_captureScreenshot` and `deck_installCaptureHelper` now error with *"Could not find the capture scripts directory"*, trying `\c:\Users\...\mcp-server\dist\scripts` (note the malformed leading backslash - a path-join bug on Windows) twice and then `templates\scripts`. Same root cause family (scripts not shipped into `dist`), plus the join bug; the repo workaround script still works and produced this session's captures. **Filed upstream 2026-08-30 as [DPS#2](https://github.com/qd313/decky-plugin-studio/issues/2)**, including the duplicated candidate path and the fact that `deck_installCaptureHelper` — the documented remedy — fails with the same error, so there is no in-tool way out. | [audit/spoiler-dpad-01-keydown-dead-code-2026-08-27.md](archive/spoiler-dpad-01-keydown-dead-code-2026-08-27.md) § blockers | DPS `docs/ROADMAP.md` row | Filed upstream |
| 2026-08-27 | **P2-5 — `deck_deploy` targets a lowercased plugin path and fails.** Observed: `scp -r ".../dist" "deck@…:~/homebrew/plugins/bonsai/dist"` errored while the installed plugin lives at `~/homebrew/plugins/bonsAI` (name per `plugin.json`). Two asks: derive the remote path from `plugin.json`'s `name` verbatim rather than a lowercased form, and use the temp-dir-then-elevated-move pattern this repo's `build.ps1` uses — `homebrew/plugins` is not generally writable over plain scp. Workaround: `./scripts/build.ps1` (Windows) / `./scripts/build.sh dev`. | same | DPS `docs/ROADMAP.md` row (filed 2026-08-26, corroborated 08-27) | Filed upstream |
| 2026-08-26 | **P1-6 — a second VS Code window with DPS installed kills its own MCP server on startup: the ingest listener has no `error` handler.** `mcp-server/src/index.ts:30` calls `startIngestServer(...7682)` at module load and `mcp-server/src/ingest/server.ts:43` calls `server.listen(port, "127.0.0.1")` with nothing bound to the server's `'error'` event, so `EADDRINUSE` becomes an unhandled `'error'` event and takes the process down with exit code 1 — before the MCP handshake. `spawnMcpProcess` (`extension/src/mcp/client.ts:102`) guards only on its own module-level `mcpProcess`, which is per extension host, so every window spawns one and only the first gets the port. Observed here with the bonsAI and decky-plugin-studio workspaces both open: the DPS panel read *Server running* in one window while the other looped `[decky-mcp] MCP server exited (code 1) before replying`. This is **P1-4's global-state problem on a second port** — the fix there should cover this one. Debug ingest is optional; the rest of the server is not. Ask: handle the `'error'` event, log to stderr, continue with ingest disabled — filed upstream as [qd313/decky-plugin-studio#1](https://github.com/qd313/decky-plugin-studio/pull/1) (`server.on("error")` + `isIngestRunning()` + `ingest/server.test.ts`; 81 pass, 0 fail). Workaround until then: `deckyPluginStudio.ingestPort` per workspace (bonsAI window now 7683) and `DEBUG_INGEST_PORT` per MCP client entry (bonsAI `mcp.json` now 7684). | [mcp.json](../mcp.json), `.vscode/settings.json` | [DPS#1](https://github.com/qd313/decky-plugin-studio/pull/1) | PR open |
| 2026-08-23 | **P1-5 answered by design — controller macro test rig, discovery locked.** On-device input via a bridge board the Deck sees as a real controller (wired USB + BLE), a macro runner with state-verified steps (`gpfocus`, never `activeElement`), a PipeWire file+network tee for recording and live analysis, and an extension kill switch with an always-visible agent-control status. New surface proposed for DPS: `deck_padStatus/Press/Chord/Kill`, `deck_macroRun/List`, `deck_streamStart/Stop`; retires `deck_openPlugin`'s *"Deck UI cannot be automated in v1"* checklist note (`mcp-server/src/tools/deckAutonomy.ts:70`). Upstream issues to be drafted from the plan on maintainer go. | [planning/19-controller-macro-test-rig.md](planning/19-controller-macro-test-rig.md) | *pending* | Design locked |
| 2026-08-12 | **P1-5 (★★★★★ to fix upstream) — no way to test D-pad navigation on a Deck, through Steam's gamepad focus.** `preview.injectFocusEvent` drives the in-IDE `@decky/ui` mocks, where Steam's nav graph does not exist; `deck.deploy` puts real code on real hardware but offers no way to drive it. CEF remote debugging is not a substitute: a DOM `focus()` moves `activeElement` while `gpfocus` stays behind, so `activeElement` checks report moves that never happened — bonsAI shipped three "fixes" that passed exactly that check (post-mortem in `src/utils/navFocusRegistry.ts`). Cost this session: a spoiler fence reported unreachable by D-pad had every inspectable property correct, so "registry skips it" vs "the press never arrives" could not be separated, and the bug went back to the reporter for manual repro. Ask: on-device input injection, a focus oracle reporting `gpfocus` (not `activeElement`), and a before/after press trace — or at minimum, document that DPS cannot validate Deck focus graphs. | [02-dps-upstream-findings.md § P1-5](planning/02-dps-upstream-findings.md) | *pending* | Open |
| 2026-08-08 | **D1 — `snapshotDom` truncates at 8183 bytes with no marker.** The cap is silent: the stored HTML has no ellipsis, no `truncated` flag, and ends mid-declaration. Because a plugin's injected `<style>` block can be the first child of the snapshotted node, the entire snapshot can be CSS and never reach rendered markup — which is exactly what happened to every bonsAI DOM assert. Ask: a configurable cap, a `truncated: true` field on the result, and an option to skip `<style>`/`<script>` nodes. | [testing.md](testing.md#preview-suite-evidence-invalidated-2026-08-08) | *pending* | Open |
| 2026-08-08 | **D4 — `final.png` is a placeholder, not a capture.** Byte-identical within a batch (11202 B / 10220 B); the image is a flat dark rectangle reading `Decky preview snapshot` and the viewport size. It is stored under the name of a screenshot, so consumers archive it as evidence. Ask: real capture, or `ok: false` so callers stop storing fiction. | same | *pending* | Open |
| 2026-08-08 | **D3 — `focusPath` echoes the injected inputs.** Every run records `["onMove(Down)","onMove(Down)"]` and `active-element.txt` reads `document.body`, so any assert over it is a tautology. Ask: a per-input trace with node identity, or document explicitly that it is an input echo and not a focus oracle. | same | *pending* | Open |
| 2026-08-08 | **D2 — `callTestHook` IPC times out. Not our registration gate, and not the hook lookup.** E1 answered from source: `sandbox-host.tsx:29` sets `window.__DECKY_PREVIEW__ = true` before the plugin renders, and our `registerPreviewTestHooks` runs from a mount effect, so the gate passes; DPS also still honours the legacy `__bonsaiTestHooks` name (`:20-26`). A missing hook already returns a precise `Unknown preview hook: …` (`:132-137`). The timeout is **infrastructure**: when the preview backend is down the message never returns at all. Root cause is P2-3 + P2-2 below. | [02-dps-upstream-findings.md § P3-3](planning/02-dps-upstream-findings.md) | *pending* | Root-caused |
| 2026-08-08 | **P0-1 — the `@decky/api` shim lacks `useQuickAccessVisible`, so the preview cannot mount bonsAI at all.** Imported at `src/index.tsx:9` since 2026-07-17 (`ebd9ca7`). The sandbox module throws a `SyntaxError` while evaluating imports, before `mount()` registers the `message` listener — so every IPC command times out at 120s with the real error visible only in the iframe console. **Blocks the entire preview suite; one line of shim fixes it.** | [02-dps-upstream-findings.md § P0-1](planning/02-dps-upstream-findings.md) | *pending* | **Blocking** |
| 2026-08-08 | **P1-4 — two workspaces with DPS installed silently share one preview.** `preview-state.json`, `preview-ipc/` and ports 8766/8765 are all global with no workspace key; only `sandbox/<basename>/preview-rpc.json` is per-workspace. Observed: a DPS-repo preview held 8766 with `allowed: 0`, so every bonsAI `callRpc` returned *"not allowlisted"* despite a correct 52-method allowlist on disk, and DOM commands were consumed by the other workspace's bridge. **Practical rule until fixed: only one workspace may have a preview open at a time.** | [02-dps-upstream-findings.md § P1-4](planning/02-dps-upstream-findings.md) | *pending* | Open |
| 2026-08-08 | **P2-3 — a dead Vite child leaves the preview reporting healthy.** `isOpen()` checks the VS Code panel object, not the backend, and `preview-state.json` is only cleared on panel dispose. Hit live today: the state file advertised `127.0.0.1:5290` while that port refused connections, yet the bridge kept consuming commands and timing each out at 120s. **This is what actually blocks automated preview runs.** | same, § P2-3 | *pending* | Open |
| 2026-08-08 | **P2-1 — the IPC bridge stops permanently on the first tick where the preview is not open** (`ipcBridge.ts:144-151`) and is only re-armed by `PreviewManager.start()`. **P2-2 — one unanswerable command stalls the whole queue**, serially, at 120s each, including `callRpc`, which never touches the webview. | same, §§ P2-1, P2-2 | *pending* | Open |
| 2026-08-08 | **No way to reset preview backend state between scenarios.** Settings written by one scenario persist into the next in the same batch. Worked example: `tests/preview-suite/tier2-deep.json` sent partial `capabilities` blocks, and because the backend merge is shallow, an omitted key silently disabled that capability for the rest of the batch. Ask: a per-scenario state reset, or a documented teardown hook. | same | *pending* | Open |

## Prerequisites

```bash
cd packages/bonsai-mcp
npm install
npm run build
```

From repo root you can also run:

```bash
pnpm run mcp:build
```

## Root `mcp.json`

Some MCP clients auto-load [`mcp.json`](../mcp.json) at the repo root on project open; check your
client's own docs for whether it does. It carries both servers — `bonsai` and
`decky-plugin-studio` — pinned to local paths. Keep **decky-plugin-studio** configured in the same
file (see [AGENTS.md](../AGENTS.md)).

Add to your MCP client's own settings if it does not read `mcp.json` automatically:

```json
{
  "mcpServers": {
    "bonsai": {
      "command": "node",
      "args": ["packages/bonsai-mcp/dist/index.js"],
      "env": {
        "BONSAI_REPO_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

**After first clone or MCP changes:** run `pnpm run mcp:install && pnpm run mcp:build`, then
restart or reload your MCP client. Confirm **bonsai** shows as connected in its MCP settings view.

**Session start:** a `sessionStart` hook auto-injects a **slim** bootstrap (always-on policy ids + when to fetch). Agents may also call `bonsai.session.bootstrap`. Full policy bodies: `bonsai.policy.get` only when the task needs them (avoids triple-injecting focus/layout walls every chat).

## Claude Desktop

Edit `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bonsai": {
      "command": "node",
      "args": ["/absolute/path/to/bonsAI/packages/bonsai-mcp/dist/index.js"],
      "env": {
        "BONSAI_REPO_ROOT": "/absolute/path/to/bonsAI"
      }
    }
  }
}
```

## Generic MCP clients

- Transport: **stdio**
- Entry: `node packages/bonsai-mcp/dist/index.js`
- Required env: `BONSAI_REPO_ROOT` → git repo root (must contain `plugin.json`, `main.py`, `packages/bonsai-mcp/`)

## Key tools

| Tool | When |
|------|------|
| `bonsai.session.bootstrap` | Start of session — policy ids + fetch hints (not full bodies) |
| `bonsai.workflow.get` | Deck dev loop, tier QA, preview, screenshots |
| `bonsai.policy.get` / `bonsai.policy.list` | Specific policy slices |
| `bonsai.docs.search` / `bonsai.docs.get` | Search or read `docs/` |
| `bonsai.arch.rpcMap` / `bonsai.arch.hotspots` | Codebase context |
| `bonsai.arch.previewTiers` | Preview-suite tiers and the scenarios in each |
| `bonsai.report.archive` | Append subagent findings |

## Key prompts

| Prompt | When |
|--------|------|
| `bonsai/persona/master-debugger` | Focus, layout, log capture |
| `bonsai/persona/security-auditor` | RPC, logging, permissions review |
| `bonsai/triage/focus-bug` | Short focus triage (screenshots → graph → one fix; debugger on second loop) |
| `bonsai/triage/empty-ai-reply` | Silent/truncated AI replies |

**Archived:** Red/Blue ship counsel and `bonsai/plan/ship-review` → [docs/archive/red-blue-counsel/](../docs/archive/red-blue-counsel/README.md).

## Knowledge without MCP

All knowledge files are plain markdown under `packages/bonsai-mcp/knowledge/` and remain readable in git without MCP.

Regenerate architecture JSON after RPC or structure changes (`main.py`, `src/`, `tests/preview-suite/`, `.env.example`):

```bash
pnpm run mcp:generate
pnpm run mcp:validate
```

Commit any changes under `packages/bonsai-mcp/knowledge/architecture/` in the **same** change set. CI workflow `validate-mcp.yml` fails the push/PR when those snapshots are stale.

### Prevent stale CI failures locally

**Git hooks (recommended):** `pnpm run mcp:install-hooks` (also runs via `pnpm install` / `prepare`).  
- **pre-commit** regenerates and stages `packages/bonsai-mcp/knowledge/architecture/*.json` automatically.  
- **pre-push** runs `mcp:validate` and blocks the push if snapshots are still stale.

Manual check:

```bash
pnpm run mcp:generate
pnpm run mcp:validate
```
