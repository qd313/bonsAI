# bonsAI Troubleshooting & Knowledge Base

This document is the advanced/power-user guide for bonsAI.

For first-time setup, use `README.md` first (simple self-hosted install flow, Ollama setup, and starter model pulls).
For contributor workflows, use [development.md](development.md) (Windows/Bazzite build and deploy paths).

Roadmap and future features: [roadmap.md](roadmap.md). Steam Input search/jump and deep-link feasibility notes: [steam-input-research.md](steam-input-research.md). Opt-in character voice preset planning: [voice-character-catalog.md](voice-character-catalog.md).

This file tracks resolved issues, hardware-specific overrides, and architectural constraints for the bonsAI (Backend Ollama Node for Steam A.I.) project.

---

## 1. Core Hardware & Performance

### ISSUE: AI Responses are Slow (CPU Inference)
**Symptom:** Text generation takes 15-60 seconds. Task Manager on the PC shows high CPU usage but 0% GPU 3D/Compute usage.
**Cause:** Ollama is failing to hook into the GPU and falling back to system RAM.

#### FIX A: Platform Decision Flow (Windows First, Bazzite Second)
Pick one path based on your host machine:

1. **Windows (recommended first):**
   - Set `HSA_OVERRIDE_GFX_VERSION` if needed for your GPU (for RX 9070 XT, `12.0.1` is a known-good example).
   - Hard restart Ollama (quit tray app, end `ollama.exe`, relaunch).
   - Verify:
     ```bash
     curl -sS -m 5 http://127.0.0.1:11434/api/tags
     ```

2. **Bazzite (containerized ROCm path):**
   - Run:
     ```bash
     podman run -d \
       --restart always \
       --device /dev/kfd \
       --device /dev/dri \
       --security-opt label=disable \
       --group-add keep-groups \
       -e HSA_OVERRIDE_GFX_VERSION="12.0.1" \
       -e GPU_MAX_HW_QUEUES=1 \
       -v ollama:/root/.ollama \
       -p 11434:11434 \
       --name ollama \
       docker.io/ollama/ollama:rocm
     ```
   - Verify container and API:
     ```bash
     podman ps
     curl -sS -m 5 http://127.0.0.1:11434/api/tags
     ```

Quick notes:
- `HSA_OVERRIDE_GFX_VERSION` is hardware/driver-specific (`12.0.1` is an RX 9070 XT example, not universal).
- `GPU_MAX_HW_QUEUES=1` is optional stability tuning.
- `/dev/kfd` and `/dev/dri` are required for AMD ROCm GPU passthrough.

#### FIX B: VRAM Management
If setup is correct but responses are still slow, VRAM pressure can force CPU fallback (for example while gaming).
- **Fix:** First test a smaller model (for example `ollama run phi3:latest`), then scale up.

#### FIX C: Windows Vulkan Fallback (if ROCm path still fails)
If Windows still falls back to CPU after FIX A:
1. Open Windows **Environment Variables**.
2. Create a new User Variable: `OLLAMA_VULKAN=1`.
3. Remove stale/conflicting ROCm override values.
4. Hard restart Ollama and re-test.
---

## 1a. Permissions tab (blocked actions)

**Feature:** The **Permissions** tab (lock icon) controls high-impact actions: saving notes to Desktop, applying TDP/GPU suggestions from the model, attaching Steam screenshots to asks, opening external links from About, and the Debug tab Steam Input jump.

**Symptom:** Toasts like “Permission required” or backend errors mentioning Permissions when you try those actions.

**Fix:** Open the **Permissions** tab and set the relevant scope to **ON**. Ollama requests to your PC on the LAN are not gated by these toggles.

**Note:** If you upgraded from an older `settings.json` that had no `capabilities` block, the plugin enables all scopes until you save settings from the Permissions tab (grandfather behavior).

---

## 1b. Uninstall vs “Clear all data” (Settings)

**Uninstalling** the plugin from Decky removes the plugin bundle under `~/homebrew/plugins/` but often **leaves** Decky’s per-plugin **settings**, **runtime**, and **logs** directories. Reinstalling the same plugin can therefore look like nothing was reset.

**Settings → Advanced** (bottom of the tab): **Clear cache…** only clears the **current session** in RAM (Ask thread, attachments, etc.) and does **not** touch `settings.json`.

**Clear all data…** resets bonsAI to a **new-install** state on the device: it removes saved settings (including permissions), clears plugin runtime cache and log files under Decky’s homebrew layout, clears the Ollama host / disclaimer / unified-input keys stored in the plugin’s browser storage, and shows the beta notice again. It does **not** delete markdown files under `~/Desktop/BonsAI_notes/`.

---

## Input sanitizer (Ask lane)

### “Sanitizer blocked my prompt”
**Symptom:** Ask returns quickly with a message that the input was blocked or empty, and nothing is sent to Ollama.

**Cause:** With sanitization **on** (default), whitespace-only or otherwise unusable prompts are rejected after deterministic cleanup.

**Fix:** Type a real question. If you were pasting from a source that injected NUL or odd control characters, try retyping the first line or paste into a plain editor first. If you intentionally need to bypass the lane (advanced), see below.

### “I disabled sanitization by mistake”
**Symptom:** You sent `bonsai:disable-sanitize` or edited `settings.json` and asks no longer get the same guardrails.

**Fix:** In Ask, send exactly **`bonsai:enable-sanitize`** as the entire message (spacing/case around the phrase is fine; no extra text). You should get a confirmation and `input_sanitizer_user_disabled` returns to `false` in plugin `settings.json`.

**Security:** Disabling sanitization is stored locally. Anyone with access to the plugin while the device is unlocked could turn it off; re-enable when you are done testing on a shared Deck.

---

## Verbose Ask logging (Desktop notes)

**Feature:** Settings → **Desktop notes** → **Verbose Ask logging to Desktop notes** (`desktop_ask_verbose_logging`). When enabled and **Filesystem writes** is on, each completed Ask appends a large markdown block to `~/Desktop/BonsAI_notes/bonsai-ask-trace-YYYY-MM-DD.md` (UTC day) with full system and user prompt text, model name, and replies.

**Symptom:** Trace files grow quickly or contain sensitive prompts.

**Fix:** Turn the toggle off, or delete/rename the trace file on Desktop. The main tab **Input handling (last Ask)** section shows the latest trace in-plugin without writing to disk.

---

## 1b. AI character (roleplay tone)

**Feature:** Settings → **AI character** (small caps header) enables optional character tone for local Ollama replies. You can pick a preset grouped by game/show title, enable **Random** (one catalog character per Ask), or type a custom description. **Accent intensity** (four chips, default **balanced**) controls how strongly the system prompt asks for dialect/accent; it does not change TDP or JSON rules. The main Ask field shows a small pixel avatar; tap it to reopen the picker.

**Symptom:** Replies stay in a neutral voice after you enabled the feature.

**Fix:** Confirm **Enable** is on and you chose a preset, Random, or custom text (not only opened the picker). If **Random** is off and both preset and custom are empty, no roleplay instructions are sent.

---

## 1c. Latency warning vs backend timeout (Settings)

**Where:** Settings tab, under **Connection**, **Latency warning and backend timeout**.

**Behavior:** One Steam slider controls **Hard timeout (backend)** (10s steps, max 300s). The **Soft warning (latency)** value remains visible directly below it; the plugin keeps warning **strictly below** timeout so the slow hint can appear before a hard cancel.

**If values look wrong after editing `settings.json` by hand:** Save settings again from the plugin UI, or delete the file to regenerate defaults—the plugin normalizes out-of-order pairs on load.

---

## 1b. Desktop notes (`BonsAI_notes`)

### Saving from Game Mode
**Feature:** After a successful **Ask**, use **Save to Desktop note…** on the main tab. You choose the file name (without `.md`); the plugin appends an entry under `~/Desktop/BonsAI_notes/` on the **Steam Deck user** (not the remote Ollama PC). Each run adds a new timestamped **Question** / **Response** block; existing files are not replaced.

**Optional — daily chat log:** In **Settings**, enable **Auto-save chat to Desktop notes** (default off). With **Filesystem writes** enabled in **Permissions**, each **Ask** and each **AI reply** append to `~/Desktop/BonsAI_notes/bonsai-chat-YYYY-MM-DD.md` (UTC calendar day). Ask lines include paths for any screenshot you attached for that prompt.

### ISSUE: Save failed or permission error
**Checks:**
1. Switch to **Desktop Mode** at least once so the Desktop folder exists (SteamOS creates `~/Desktop` when needed).
2. Ensure the Deck user home volume is not full and is writable.
3. If you use unusual home layouts or symlinks, verify `~/Desktop/BonsAI_notes` resolves under your Deck user home.

---

## 2. Network & Communication (The Bridge)

### ERROR: `TypeError: Failed to fetch`
**Symptom:** Red error text in the Decky UI when clicking "Ask".
**Cause:** The Steam Deck UI (Chromium) is blocking the request due to CORS (Cross-Origin Resource Sharing) or browser security.
**Fix:** **NEVER** use `fetch()` in the `.tsx` file to hit the PC. Always route through the Python backend using `call("ask_game_ai", { ... })`.

### ERROR: `Connection Refused` or `Timeout`
**Symptom:** The backend log shows a failure to reach the PC IP.
**Fixes:**
1. **Host listening:** On the machine running Ollama, set `OLLAMA_HOST=0.0.0.0` (or use the Ollama app’s **Listen / expose on network** option when the platform provides it) so the Deck can reach TCP **11434**. Restart Ollama after changing this.
2. **Firewall:** Open Windows Defender Firewall -> Inbound Rules -> New Rule -> Port -> **TCP 11434** -> Allow.
3. **Verify via SSH:** Run this from the Cursor terminal while connected to the Deck:
   ```bash
   curl -sS -m 5 http://[PC_IP]:11434/api/tags
   ```

4. **Models installed:** On the Ollama host, run `ollama pull <model>` for each tag you use (for example `llama3` for text, `llava` or another vision tag for screenshots). The Deck only talks to Ollama; it does not download weights itself.

---

## 2.5 Screenshot Vision Setup (V1)

### Required model capability
- Screenshot attachments only work with Ollama models that support image input (vision/multimodal models).
- If a non-vision model is active, asks still run but image context may be ignored or return an attachment/model error.

### Configure screenshot attachment quality
- Open bonsAI `Settings` tab.
- Set **Attachment quality (vision)** to **Low**, **Mid**, or **Max** (JPEG resize/compression before send; **Low** is smallest payload, **Max** is highest quality).
- Legacy `settings.json` values that used numeric max dimensions are migrated on load.

### Screenshot sources in V1
- `Attach` opens a fullscreen screenshot browser with thumbnail previews.
- Browser content is populated from recent Steam screenshot files discovered on-device.
- Ordering behavior: best-effort active-game-first when AppID is available, then fallback to global recent screenshots.
- Current boundary: there is no supported Steam screenshot selection API in this project yet, so filesystem discovery remains the active path.

### Common failures and fixes
- **Attachment too large:** lower attachment quality to **Low** in Settings (or install Pillow for resize/compression).
- **Image preprocessing fallback warning:** install Pillow in plugin runtime if you need guaranteed resize/compression behavior on very large captures.
- **Model rejects image input:** switch to an Ollama vision-capable model.

---

## 3. Build & Deploy (`scripts/build.ps1` / `scripts/setup-dev.ps1`)

### ERROR: `sudo: a password is required` or build hangs at "Overwriting system files"
**Symptom:** `scripts/build.ps1` fails or hangs indefinitely at the `ssh` deploy step. Running `scripts/setup-dev.ps1` then `scripts/build.ps1` doesn't help, or only works once.

**Root causes (three separate bugs, all required fixing):**

1. **Sudoers file ownership:** The sudoers file at `/etc/sudoers.d/decky_restart` was written as `deck:deck` instead of `root:root`. Sudo silently ignores any sudoers include not owned by root (uid 0), so every NOPASSWD rule was dead even though `sudo -l` listed them.
   - **Fix:** Use `sudo install -o root -g root -m 0440` to write the file, never plain `mv` or `tee` without explicit ownership.

2. **Command-specific NOPASSWD unreliable over non-interactive SSH on SteamOS:** Even with correct ownership, comma-separated `Cmnd_Spec` entries (e.g. `NOPASSWD: /usr/bin/systemctl stop ..., /usr/bin/systemctl start ...`) were not honored by SteamOS sudo when invoked over non-interactive SSH (no TTY). `sudo -l` showed them, but `sudo -n <cmd>` still demanded a password.
   - **Fix:** Use a broad dev-mode override (`Defaults:<user> !authenticate` + `NOPASSWD: ALL`) during development, removed by `scripts/revert-dev.ps1`.

3. **`chown` syntax:** `chown -R deck deck /path` passes two positional file arguments instead of `user:group`. Correct form is `chown -R deck:deck /path`.

**Prevention checklist for future sudoers changes:**
- Always verify file ownership with `ls -l /etc/sudoers.d/decky_restart` (must be `root root`).
- Always validate with `sudo visudo -cf <file>` before installing.
- Always use `sudo -n` in automated scripts so a misconfigured rule fails fast instead of hanging.
- Always use `user:group` syntax for `chown`, never space-separated.

---

## 4. QAM / QAMP Reflection Strategy

### What is guaranteed today (safe default)
- bonsAI applies performance values to the system through backend writes (for example TDP via sysfs).
- After each prompt execution, bonsAI reports what was applied in the response panel.
- If Steam's QAM Performance slider does not immediately match, treat the backend applied value as source of truth first, then close/reopen QAM to re-check.

### Known architectural constraint
- There is no stable public Steam API in this project for directly writing QAM Performance tab slider state.
- Because of this, "hardware-applied value" and "QAM slider UI value" can temporarily diverge.

### Experimental path (disabled by default)
- Any future direct QAMP sync must be opt-in only and clearly labeled experimental.
- Candidate approaches such as `config.vdf` / protobuf edits are fragile and may require Steam restart or full reboot.
- Risks include breakage after Steam updates, profile corruption, and non-deterministic behavior.

### Validation checklist for every QAMP-related change
- Confirm applied values in bonsAI response output after prompt execution.
- Verify QAM reflection with per-game profile enabled and disabled.
- Verify after closing/reopening QAM Performance tab.
- Verify after Steam restart and full reboot.

## 5. bonsai shortcut setup

### Pro tip: global quick-launch (Steam Input macro)

Because Decky Loader acts as a secure container for plugins, we cannot force a custom QAM tile for BonsAI. On standard SteamOS or a Bazzite Gamescope session, you can use a native **Steam Input** chord macro to open BonsAI from almost anywhere (in-game or the Home screen) with one combination after setup.

**Short path in the main README:** [README.md](../README.md) (section *Open bonsAI quickly*). This section is the full recipe, delay ladder, and maintainer checks. For default plugin-shell smoke, see [regression-and-smoke.md](regression-and-smoke.md) §3 (Plugin shell), including the optional **Guide-chord / macro** row.

**In-app help (no Ollama):** In the main tab Ask field, send exactly `bonsai:shortcut-setup-deck` or `bonsai:shortcut-setup-stadia` (optional leading `/`, trim + casefold) for a **fixed** reply, **Open Controller settings** when Permissions allow, and a pointer here. bonsAI **cannot** auto-create the chord; you still build the macro in **Controller → Guide Button Chord Layout**.

#### What changes between devices

- **QAM left-rail order:** The vertical list under Quick Access Menu depends on your tabs and order; you need enough **D-pad down** (or the direction your rail uses) to reach the **Decky** row.
- **Decky position in that list:** If you add or reorder QAM items, the count of pad moves to Decky changes.
- **Plugin list order inside Decky:** bonsAI’s position in the loader list sets how many **D-pad** moves and one **A** press you need after Decky opens.

There is no single universal step count; treat every number below as a **starting point** you tune in **Controller** settings.

#### Generic macro shape

1. **Open QAM** (one bound command, e.g. *System* → *Quick Access Menu*).
2. ***n* × move along the QAM rail** (usually *D-pad down*) until the **Decky** row is selected.
3. **Confirm** to enter Decky (usually **A**).
4. ***m* × move in the plugin list** until **bonsAI** is highlighted.
5. **Confirm** to open the plugin (usually **A**).

Each of those steps is usually a **separate** command in the chord, with its own **Fire Start Delay** so the next input runs after the UI has finished the previous transition.

#### How to set up the chord (Steam / Deck)

1. **Access Chord settings:** Press the **Steam** button → **Settings** → **Controller** → **Guide Button Chord Layout** → **Edit** → **Edit Layout**.

2. **Pick a trigger** that does not collide with in-game actions (e.g. hold **Steam** + **R4**). On the **Buttons** tab (or back grips, etc.), choose the face or grip you want.

3. **Add commands in order** (use **Add Extra Command** from the gear menu on the previous command in the stack):

   - **Open QAM:** *System* → *Quick Access Menu* (this is always the first command in the stack).
   - **Reach Decky on the QAM rail:** For each *D-pad* move that advances the selection toward the Decky row, add an extra command and set **D-pad** (down or the direction your layout needs). The **first** move after QAM opens should use **Fire Start Delay** around **100–150 ms** so QAM is fully open before the pad acts.
   - **Open Decky:** Add **A** (or *Confirm*) once the Decky row is selected. Set **Fire Start Delay** on this command a bit higher than the last rail step (e.g. **+50 ms** over the previous command’s delay) so Decky has time to focus.
   - **Reach bonsAI in the plugin list:** Add *D-pad* moves and a final **A** with **increasing** delays per step, same idea as the QAM rail.

**Fire Start Delay (starting points, not law):** Steam applies delay **before** that command’s action. After the first post-QAM *D-pad*, increase delay slightly on each following step (e.g. add about **50 ms** per step) so focus and animation can keep up. If the UI lags (thermal throttle, many plugins), nudge the failing step up by **25–50 ms** at a time.

#### If the macro misbehaves (tuning)

- **A step is skipped (focus never reaches the right row):** Increase **Fire Start Delay** on the **first command that should run after** the transition that was too fast—often the command right after QAM opens, or right after **A** opens Decky.
- **Selection overshoots (too many moves):** Reduce **Fire Start Delay** on the *D-pad* command that moved one row too late, or remove one *D-pad* if you added a spare.
- **Repeat from Home and from in-game** after changes; timing can differ slightly.

*Reverse* pad directions are only an option if your Guide Button Chord command stack supports them for your layout.

#### Testing your macro (end users)

Hold **Steam** and press your chord button (e.g. **R4**). You should see QAM open and the chain advance into the bonsAI panel without manual correction. If a step fails, adjust **Fire Start Delay** on that step or the one immediately after the missed transition, then re-test.

#### Verification checklist (maintainers / release QA)

Run with a build that also satisfies [regression-and-smoke.md](regression-and-smoke.md) §3 *Plugin shell* when you touch QAM, Decky, or first paint.

- [ ] Chord triggers from the **Home** shell and with a **game focused** (at least one title).
- [ ] QAM opens reliably; the rail moves until **Decky** is selected, then **Decky** opens.
- [ ] The Decky list advances until **bonsAI** is selected and the plugin **main** tab is visible (no blank panel, no need to complete the last steps by hand).
- [ ] Re-run after SteamOS or Steam **Big Picture** updates if macro behavior regresses.

**Last verified (optional):** *Record SteamOS / Steam client build when a maintainer runs the checklist on hardware; update after major client updates.*

---

## Steam Input jump (Phase 1, Debug tab)

Phase 1 is the **completed** scope for this feature; full search + catalog (Phase 2+) is deferred per [roadmap.md](roadmap.md).

**Symptom:** Toast says there is no running game, or the wrong Steam surface opens.

**Checks:**

1. **MainRunningApp:** The jump uses `Router.MainRunningApp` from Decky. A title should be running or focused in a way Steam reports to the client. If you are only on the Steam shell with no game, start or focus a game and retry.
2. **steam:// behavior:** Phase 1 uses `steam://controllerconfig/<appId>` via `SteamClient.URL.ExecuteSteamURL` (same family as Settings search `steam://open/settings/...`). If nothing happens, confirm Steam handled other `steam://` links from bonsAI recently; restart Steam if the client URL dispatcher is stuck.
3. **After a Steam update:** Big Picture routes and `steam://` targets can change. Follow the smoke-test and changelog discipline in [steam-input-research.md](steam-input-research.md) and update `src/data/steam-input-lexicon.ts` if needed.
4. **Wrong tab inside controller UI:** Sub-tabs may be local React state without distinct URLs. Use breadcrumb hints in the lexicon entry and optional `primaryPathTemplate` once you have verified paths from CEF sniffing.
