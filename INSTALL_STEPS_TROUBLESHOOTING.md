# bonsAI Troubleshooting & Knowledge Base

This document tracks all resolved issues, hardware-specific overrides, and architectural constraints for the bonsAI (Backend Ollama Node for Steam A.I.) project.

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

## 2. Network & Communication (The Bridge)

### ERROR: `TypeError: Failed to fetch`
**Symptom:** Red error text in the Decky UI when clicking "Ask".
**Cause:** The Steam Deck UI (Chromium) is blocking the request due to CORS (Cross-Origin Resource Sharing) or browser security.
**Fix:** **NEVER** use `fetch()` in the `.tsx` file to hit the PC. Always route through the Python backend using `call("ask_game_ai", { ... })`.

### ERROR: `Connection Refused` or `Timeout`
**Symptom:** The backend log shows a failure to reach the PC IP.
**Fixes:**
1. **Host Listening:** Ensure the Windows PC has environment variable `OLLAMA_HOST=0.0.0.0`.
2. **Firewall:** Open Windows Defender Firewall -> Inbound Rules -> New Rule -> Port -> **TCP 11434** -> Allow.
3. **Verify via SSH:** Run this from the Cursor terminal while connected to the Deck:
   ```bash
   curl -sS -m 5 http://[PC_IP]:11434/api/tags
   ```

- TODO: toggle switch in Ollama "Expose Ollama to the network"
- TODO: make sure the user installs the appropriate AI models

---

## 3. Build & Deploy (`build.ps1` / `setup-dev.ps1`)

### ERROR: `sudo: a password is required` or build hangs at "Overwriting system files"
**Symptom:** `build.ps1` fails or hangs indefinitely at the `ssh` deploy step. Running `setup-dev.ps1` then `build.ps1` doesn't help, or only works once.

**Root causes (three separate bugs, all required fixing):**

1. **Sudoers file ownership:** The sudoers file at `/etc/sudoers.d/decky_restart` was written as `deck:deck` instead of `root:root`. Sudo silently ignores any sudoers include not owned by root (uid 0), so every NOPASSWD rule was dead even though `sudo -l` listed them.
   - **Fix:** Use `sudo install -o root -g root -m 0440` to write the file, never plain `mv` or `tee` without explicit ownership.

2. **Command-specific NOPASSWD unreliable over non-interactive SSH on SteamOS:** Even with correct ownership, comma-separated `Cmnd_Spec` entries (e.g. `NOPASSWD: /usr/bin/systemctl stop ..., /usr/bin/systemctl start ...`) were not honored by SteamOS sudo when invoked over non-interactive SSH (no TTY). `sudo -l` showed them, but `sudo -n <cmd>` still demanded a password.
   - **Fix:** Use a broad dev-mode override (`Defaults:<user> !authenticate` + `NOPASSWD: ALL`) during development, removed by `revert-dev.ps1`.

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
## 🚀 Pro-Tip: Create a Global Quick-Launch Shortcut for BonsAI

Because Decky Loader acts as a secure container for plugins, we cannot force a custom button onto the main Steam interface. However, whether you are on standard SteamOS or running a Bazzite Gamescope session, you can use a native **Steam Input Macro** to instantly open BonsAI from *anywhere* (in-game or on the Home Screen) with a single button combination.

We recommend binding this to a **Guide Button Chord** (e.g., holding the `Steam` or `Guide` button + `R4`). This ensures the shortcut works globally without interfering with your standard in-game controls.

### How to set up the BonsAI Quick-Launch Macro:

1. **Access Chord Settings:**
   * Press the `Steam` button and go to **Settings** > **Controller**.
   * Scroll down to **Guide Button Chord Layout** and click **Edit**.
   * Click **Edit Layout**.

2. **Pick Your Trigger Button:**
   * Navigate to the **Buttons** tab (or wherever you want to map this, such as the Back Grips).
   * Find an available button, like `R4`, and select it.

3. **Build the Macro Sequence:**
   You will need to stack commands and add slight delays so the Steam UI has time to catch up to the inputs. 

   * **Command 1 (Open Menu):** Select `System` > `Quick Access Menu`.
   * **Command 2 (Navigate to Decky):** Press the Gear icon next to your new command -> `Add Extra Command`. Set this command to `D-Pad Down`. 
     * *Important:* Click the Gear icon next to Command 2, select `Settings`, and increase the **Fire Start Delay** to `100` or `150` (to give the QAM time to open).
   * **Command 3, 4, etc. (Scroll down):** Repeat the `Add Extra Command` process for `D-Pad Down` as many times as needed to reach the Decky plug icon in your specific left-rail list. (Increase the Fire Start Delay slightly for each new command, e.g., `200`, `250`).
   * **Command 5 (Open Decky):** Add one final Extra Command mapped to the `A Button` to enter the Decky menu. (Set Fire Start Delay to roughly `50` higher than the last command).
   * **Command 6 (Scroll to BonsAI):** Depending on where BonsAI lives in your specific plugin list, add subsequent `D-Pad Down` and `A Button` extra commands with increasing delays to finalize the sequence.

**Testing Your Macro:**
Once built, hold the `Steam` button and press your assigned button (e.g., `R4`). You should see the QAM fly open and automatically navigate straight into the BonsAI panel! If it misses a step, go back into the chord settings and slightly increase the **Fire Start Delay** for the step that failed.
