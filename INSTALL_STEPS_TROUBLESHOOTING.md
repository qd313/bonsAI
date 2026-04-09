# bonsAI Troubleshooting & Knowledge Base

This document tracks all resolved issues, hardware-specific overrides, and architectural constraints for the bonsAI (Backend Ollama Node for Steam A.I.) project.

---

## 1. Core Hardware & Performance

### ISSUE: AI Responses are Slow (CPU Inference)
**Symptom:** Text generation takes 15-60 seconds. Task Manager on the PC shows high CPU usage but 0% GPU 3D/Compute usage.
**Cause:** Ollama is failing to hook into the GPU and falling back to system RAM.

#### FIX A: AMD RDNA 4 (RX 9070 XT) Override
Newer AMD cards often require a manual shader version override on Windows to trigger ROCm acceleration.
1. Open **System Environment Variables**.
2. Add a new User Variable:
   - **Name:** `HSA_OVERRIDE_GFX_VERSION`
   - **Value:** `12.0.1` (Targeting RDNA 4 architecture).
3. **Hard Restart Ollama:** Quit the app from the System Tray, kill any `ollama.exe` in Task Manager, and relaunch.

#### FIX B: VRAM Management
If the PC's VRAM is full (e.g., a game is running in 4K), Ollama will offload to CPU.
- **Fix:** Use a smaller model for testing (e.g., `ollama run phi3:latest`) to verify the GPU pipeline works before scaling up to Llama 3 8B or larger.

#### FIX C: The Vulkan Override (The Silver Bullet for RDNA 4)
If ROCm overrides fail and the PC still uses CPU inference, bypass ROCm entirely using Vulkan:
1. Open Windows **Environment Variables**.
2. Create a new User Variable: `OLLAMA_VULKAN` set to `1`.
3. Remove any `HSA_OVERRIDE_GFX_VERSION` variables.
4. Hard restart the Ollama service.
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

## 3. QAM / QAMP Reflection Strategy

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