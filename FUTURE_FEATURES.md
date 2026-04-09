# Future Features -- Detailed Breakdown

Ranked by difficulty using the GTA wanted star system (★ = easy, ★★★★★★ = you'll need a tank).

> **DO NOT IMPLEMENT YET** -- This document is for planning and scoping only.

**Implemented:** The [Suggested AI Prompts](#suggested-ai-prompts) section below is shipped; it remains here as a record of scope and acceptance criteria.

Each feature includes:
- **Refined subtasks** with exact API signatures, file paths, and code patterns
- **Done when** -- clear acceptance gate so we know it's finished
- **NOT in scope** -- hard boundary to prevent requirements creep
- **References** to other Decky/Steam projects where applicable
- **Prerequisites** if the feature depends on another

---

## ★☆☆☆☆☆ Suggested AI Prompts

**Status: Implemented** (`src/index.tsx` -- `PRESET_PROMPTS`, `getRandomPresets`, `getContextualPresets`, `detectPromptCategory`, preset `PanelSectionRow` + `ButtonItem` rows, multi-line question `textarea`.)

**Summary:** Preset prompt buttons so users don't have to type common requests.

**Why it's ★☆☆☆☆☆:** Pure frontend. No backend changes. Just an array of strings rendered as `ButtonItem`s.

**Implementation details:**
- Game name auto-appends via `Router.MainRunningApp.display_name` (used when applying a preset and in `onAskOllama`)
- Each preset is a `ButtonItem` in its own `PanelSectionRow` for reliable D-pad focus (nested `Focusable` alone was not sufficient)

**Subtasks:**
- [x] Define `PRESET_PROMPTS` master array (15-20 strings) covering performance, battery, thermals, controls, and general advice:
  - "Optimize for battery life"
  - "Max performance for this game"
  - "Lower TDP for 2D/indie games"
  - "Balance FPS and battery"
  - "Reduce fan noise"
  - "What settings should I use?"
  - "Set TDP to minimum for menu/idle"
  - "Best settings for 60fps"
  - "Best settings for 30fps with max battery"
  - "Is this game Deck verified?"
  - "Why is my game crashing?"
  - "Recommended controller layout?"
  - "How do I fix stuttering?"
  - "Optimize for online multiplayer"
  - "Set GPU clock for this game"
  - (18 entries with `category` tags in code)
- [x] On first load (no previous prompt): show 3 random presets from the pool
- [x] After a prompt is answered: show 3 most contextually relevant follow-up presets based on the previous question/response category (e.g. if user asked about battery, show thermal/power follow-ups)
- [x] Render below the question field inside the "Ask Ollama (AI)" `PanelSection` (compact `ButtonItem`s; question field is a multi-line `textarea`, not `TextField`)
- [x] On select: set `ollamaQuestion` state to chosen prompt text; if `Router.MainRunningApp` is active, append ` for {game_name}`
- [x] Ensure each preset is D-pad navigable (`PanelSectionRow` + `ButtonItem` per preset)
- [x] Style as smaller/compact buttons to not dominate the UI (reduced padding, smaller font); Ask button styled more prominently

**Files affected:** `src/index.tsx` only

**Done when:** User sees 3 relevant preset buttons. On first load they're random. After a prompt, they're contextual follow-ups. D-pad to a preset, press A, question field populates (including game name if running). Pressing Ask sends normally.

**NOT in scope:** Custom user-defined presets, prompt editing/history, AI-powered prompt generation, backend changes.

---

## ★★☆☆☆☆ Diagnostic & Latency Warnings

**Summary:** If an AI response takes too long, warn the user that Ollama might be running on CPU instead of GPU.

**Why it's ★★☆☆☆☆:** Simple `time.time()` wrapper on the backend + conditional UI element on the frontend.

**Implementation details:**
- `main.py` already uses `asyncio.get_running_loop().run_in_executor()` for the Ollama HTTP call (line 332)
- Current timeout is 180s at `urllib.request.urlopen(req, timeout=180)` (line 300)

**Subtasks:**
- [ ] In `ask_game_ai()` (line 215): record `start = time.time()` before `await plugin.ask_ollama(...)`, compute `elapsed = time.time() - start` after
- [ ] Add `"elapsed_seconds": round(elapsed, 1)` to the return dict alongside `success`, `response`, etc.
- [ ] Reduce `urlopen` timeout from 180s to 120s (line 300)
- [ ] If `urlopen` times out, return `{"success": False, "response": "Ollama did not respond within 120s. Check that Ollama is running and your PC IP is correct."}`
- [ ] Frontend: read `data.elapsed_seconds` from response; if `> 15`, render a yellow `PanelSectionRow` warning below the response chunks: "Response took {N}s -- verify Ollama is using your GPU, not CPU. CPU inference is dramatically slower."

**Files affected:** `main.py` (timer + elapsed field + timeout change), `src/index.tsx` (warning banner)

**Done when:** A response taking >15s shows a visible yellow warning. A total timeout of 120s returns a clear error message instead of hanging.

**NOT in scope:** User-configurable threshold, GPU detection on the PC, Ollama health-check endpoint, auto-retry.

---

## ★★☆☆☆☆ Persist Last Question & Answer

**Summary:** When the user closes and reopens the QAM, their last question and the AI's answer should still be there.

**Why it's ★★☆☆☆☆:** Decky exposes `DECKY_PLUGIN_SETTINGS_DIR` for on-disk JSON storage. The project already uses `window.localStorage` for search queries (`src/index.tsx` lines 387-401), but backend JSON under Decky's settings dir is more reliable and survives reboots.

**Implementation details:**
- Python: `decky.DECKY_PLUGIN_SETTINGS_DIR` resolves to `/home/deck/homebrew/settings/bonsAI/`
- Frontend calls backend via `call("load_settings")` / `call("save_settings", data)` (standard Decky RPC pattern)

**Subtasks:**
- [ ] Backend: add `SETTINGS_PATH = os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "settings.json")` at module level
- [ ] Backend: add `async def load_settings(self) -> dict`:
  ```python
  if not os.path.isfile(SETTINGS_PATH):
      return {}
  with open(SETTINGS_PATH, "r", encoding="utf-8") as f:
      return json.load(f)
  ```
- [ ] Backend: add `async def save_settings(self, data: dict) -> None`:
  ```python
  os.makedirs(decky.DECKY_PLUGIN_SETTINGS_DIR, exist_ok=True)
  with open(SETTINGS_PATH, "w", encoding="utf-8") as f:
      json.dump(data, f)
  ```
- [ ] Frontend: on mount (`useEffect([], ...)`), call `call("load_settings")` and populate `ollamaIp`, `ollamaQuestion`, `ollamaResponse` from the result
- [ ] Frontend: after successful AI response in `onAskOllama`, call `call("save_settings", { ip: ollamaIp, question: ollamaQuestion, response: responseText, timestamp: Date.now() })`
- [ ] On new question submission, the persisted data is naturally overwritten on success

**Files affected:** `main.py` (2 new RPC methods + SETTINGS_PATH), `src/index.tsx` (load on mount, save after response)

**Done when:** Close QAM, reopen it -- last IP, question, and answer are restored. Survives reboot.

**NOT in scope:** Multiple conversation history, response versioning, cloud sync, clearing persisted data UI.

**Reference:** [decky-plugin-template main.py](https://github.com/SteamDeckHomebrew/decky-plugin-template/blob/main/main.py) uses `decky.DECKY_PLUGIN_SETTINGS_DIR` with `migrate_settings()`.

---

## ★★☆☆☆☆ Show Deck IP Address & Connection Info

**Summary:** Display the Steam Deck's own IP address and add a connection test button to verify Ollama reachability.

**Why it's ★★☆☆☆☆:** Python `socket.gethostbyname(socket.gethostname())` returns the Deck's LAN IP. Ollama exposes `GET /api/version` for health checks.

**Implementation details:**
- Keep this as a `PanelSection` in the existing single-page QAM view (no separate tab needed)
- Connection test hits `http://{pc_ip}:11434/api/version` with a 5s timeout

**Subtasks:**
- [ ] Backend: add `async def get_deck_ip(self) -> str`:
  ```python
  import socket
  try:
      return socket.gethostbyname(socket.gethostname())
  except Exception:
      result = subprocess.run(["hostname", "-I"], capture_output=True, text=True, timeout=5, env=Plugin._clean_env())
      return result.stdout.strip().split()[0] if result.stdout.strip() else "unknown"
  ```
- [ ] Backend: add `async def test_ollama_connection(self, pc_ip: str) -> dict`:
  - GET `http://{pc_ip}:11434/api/version` with 5s timeout
  - Return `{"reachable": True, "version": "0.5.1"}` on success
  - Return `{"reachable": False, "error": "Connection timed out"}` on failure
- [ ] Frontend: add "Connection Info" `PanelSection` below the AI section
  - Display Deck IP (read-only text, fetched on mount via `call("get_deck_ip")`)
  - "Test Connection" `ButtonItem` that calls `test_ollama_connection` and shows result as inline text or toast

**Files affected:** `main.py` (2 new RPC methods), `src/index.tsx` (new PanelSection)

**Done when:** Deck IP is displayed on screen; "Test Connection" button pings Ollama and shows reachable/unreachable with version number and which model is currently loaded.

**Additional detail:**
- After successful version check, also hit `GET /api/tags` to list available models and show the currently loaded one (e.g., "llama3.1:8b")
- Display as: "Connected -- Ollama v0.5.1 -- Model: llama3.1:8b"

**NOT in scope:** Separate tab/page, network scanning, auto-discovery of Ollama servers, mDNS, model switching/pulling from the plugin.

---

## ★★☆☆☆☆ Combine Search Box with Question Box

**Summary:** Merge the Decky settings search filter box with the AI question input into a unified text field.

**Why it's ★★☆☆☆☆:** Mostly UI restructuring. Both text fields already exist and work independently.

**Implementation details:**
- Current search box (`src/index.tsx` line 458) filters `SETTINGS_DATABASE` on every keystroke
- Current AI question box (line 669) submits to Ollama on Enter
- They live in separate `PanelSection`s
- The PC IP field should move to the Connection Info section (feature 4)

**Subtasks:**
- [ ] Replace the search `TextField` and AI question `TextField` with a single unified `TextField` at the top of the plugin
- [ ] Typing filters settings in real-time (existing behavior, driven by `searchQuery` state)
- [ ] Below the filtered results, add an "Ask AI" `ButtonItem` that submits the current text to Ollama
- [ ] Enter key behavior: if there are matching settings results, select the first one; if no results match, submit to AI
- [ ] "X" clear `Button` resets both the search filter and any AI response state
- [ ] Move the PC IP `TextField` to the Connection Info section (prerequisite: feature 4 implemented, or keep it as a separate collapsed section)
- [ ] Remove the now-redundant separate "Ask Ollama (AI)" PanelSection header

**Files affected:** `src/index.tsx` (UI refactor -- merge two PanelSections into one)

**Done when:** Single text field serves both settings search and AI question. D-pad navigates search results. "Ask AI" button submits to Ollama. No duplicate text fields.

**NOT in scope:** NLP-based auto-detection of search vs. AI intent, fuzzy/typo-tolerant search, search result ranking.

**Prerequisite:** Feature 4 (Connection Info section) should be done first so the PC IP field has a new home.

---

## ★★★☆☆☆ Multi-Language Support

**Summary:** The system prompt currently hardcodes "in English." It should detect the device language and respond accordingly.

**Why it's ★★★☆☆☆:** Need to locate Steam's language config, parse VDF format, and dynamically modify the system prompt.

**Implementation details:**
- Steam stores language in `/home/deck/.local/share/Steam/config/config.vdf` under `InstallConfigStore > Software > Valve > Steam > language` (values: `"english"`, `"german"`, `"schinese"`, `"japanese"`, etc.)
- Also available in `/home/deck/.local/share/Steam/registry.vdf` under `Registry > HKCU > Software > Valve > Steam > language`
- The `vdf` PyPI package (pure Python, no C extensions) parses KeyValues1 format: `vdf.load(f)` returns nested dict
- System prompt at `main.py` line 257: `"Always answer directly, concisely, and in English."`

**Subtasks:**
- [ ] Bundle `vdf` PyPI package: `pip install --target py_modules vdf`
- [ ] Add `sys.path.insert(0, os.path.join(os.path.dirname(__file__), "py_modules"))` at top of `main.py`
- [ ] Add `_detect_steam_language() -> str`:
  ```python
  import vdf
  config_path = os.path.expanduser("~/.local/share/Steam/config/config.vdf")
  with open(config_path, encoding="utf-8") as f:
      cfg = vdf.load(f)
  return cfg.get("InstallConfigStore", {}).get("Software", {}).get("Valve", {}).get("Steam", {}).get("language", "english")
  ```
- [ ] Replace `"in English"` in `system_content` (line 257) with `f"in {Plugin._detect_steam_language().capitalize()}"`
- [ ] Add a `language_override` field in `settings.json` (from feature 3); if set, use that instead of auto-detected
- [ ] Frontend: optional language dropdown in Connection Info section (feature 4) showing detected language and allowing override

**Files affected:** `main.py` (language detection + prompt modification), `py_modules/` (vendored vdf package), `src/index.tsx` (optional override UI)

**Done when:** A German user with Steam set to German sees German AI responses without any configuration. Manual override works via settings.

**NOT in scope:** Per-prompt language switching, translation of plugin UI labels/buttons, testing every Ollama-supported language, right-to-left text support.

**Prerequisite:** Feature 3 (persist settings) for the language override field.

**Reference:** [`vdf` PyPI package](https://github.com/ValvePython/vdf) -- API: `vdf.load(f)` returns nested dict, `vdf.loads(s)` for strings, `mapper=vdf.VDFDict` for files with duplicate keys.

---

## ★★★☆☆☆ Background Prompt Completion

**Summary:** If the user closes the QAM while the AI is still generating a response, the backend should finish and cache the result.

**Why it's ★★★☆☆☆:** Requires decoupling the frontend request lifecycle from the backend task. The `Plugin` instance persists across QAM open/close (it lives as long as the Decky loader), but React state resets on unmount.

**Implementation details:**
- `ask_ollama()` (line 245) already runs in `run_in_executor` -- the executor task continues even if the frontend disconnects
- The key insight: store the result on the `Plugin` class instance, which outlives the QAM panel

**Subtasks:**
- [ ] Backend: add class-level state:
  ```python
  _pending_result: dict | None = None
  _pending_question: str = ""
  _pending_in_progress: bool = False
  ```
- [ ] Backend: modify `ask_game_ai` to set `_pending_in_progress = True` before the Ollama call and store the final result in `_pending_result` after completion (regardless of whether the frontend is still listening)
- [ ] Backend: add `async def get_pending_response(self) -> dict`:
  - Returns `{"status": "ready", "result": self._pending_result}` if result exists and `_pending_in_progress` is False
  - Returns `{"status": "processing", "question": self._pending_question}` if still in progress
  - Returns `{"status": "none"}` if no pending work
- [ ] Backend: add `async def clear_pending(self) -> None` to reset `_pending_result` after the frontend reads it
- [ ] Frontend: on mount (`useEffect([], ...)`), call `get_pending_response()`:
  - If `status === "ready"`: populate response, show indicator "Answered while QAM was closed"
  - If `status === "processing"`: show "Still thinking... ({question})" and poll every 2s
- [ ] Frontend: on new question, call `clear_pending()` first
- [ ] Handle race: if user submits a new question while one is pending, the new one overwrites (single-slot, not a queue)

**Files affected:** `main.py` (class-level state + 2 new RPC methods + modify ask_game_ai), `src/index.tsx` (mount check + polling)

**Done when:** User asks a question, closes QAM before response arrives, reopens QAM -- answer is displayed with a "completed in background" label.

**NOT in scope:** Multiple concurrent requests, request queue, push notification/toast on background completion, progress percentage, cancellation.

---

## ★★★☆☆☆ Debugging & Log Analysis (Proton Logs)

**Summary:** Find, read, and feed Steam Proton/game logs to the AI for automated troubleshooting.

**Why it's ★★★☆☆☆:** Need to locate the right log files, parse them meaningfully, and feed relevant excerpts without exceeding context limits.

**Implementation details:**
- Proton logs live at `~/steam-{APPID}.log` when the user adds `PROTON_LOG=1 %command%` to launch options
- `PROTON_LOG_DIR` env var can redirect the output directory (defaults to `$HOME`)
- Log lines contain prefixes like `err:`, `warn:`, `fixme:`, `Unhandled exception`, `DXVK`, `vulkan`
- Steam client logs at `~/.local/share/Steam/logs/console_log.txt`
- Logs can be large (MBs for verbose sessions) -- must truncate

**Subtasks:**
- [ ] Backend: add `async def get_proton_log(self, app_id: str) -> dict`:
  ```python
  home = os.path.expanduser("~")
  log_dir = os.environ.get("PROTON_LOG_DIR", home)
  log_path = os.path.join(log_dir, f"steam-{app_id}.log")
  # Also check ~/steam-{app_id}.log if PROTON_LOG_DIR differs
  ```
  - If found: read last 200 lines, filter for lines containing `err:`, `warn:`, `fixme:`, `Unhandled exception`, `DXVK`, `vulkan`, `crash`
  - Return `{"found": True, "log_excerpt": str, "full_size_bytes": int, "path": str}`
  - If not found: return `{"found": False, "hint": "Enable Proton logging: add PROTON_LOG=1 %command% to launch options"}`
- [ ] Backend: add `async def get_steam_client_log(self) -> dict`:
  - Read last 100 lines of `~/.local/share/Steam/logs/console_log.txt`
  - Return `{"found": bool, "log_excerpt": str}`
- [ ] Backend: modify `ask_ollama()` to accept optional `log_context: str` parameter; when present, append to system prompt: `"\n\nThe following are recent Proton/game log excerpts for troubleshooting:\n{log_context}"`
- [ ] Frontend: add a "Diagnose" `ButtonItem` next to "Ask" that:
  - Calls `get_proton_log(appId)` for the active game
  - If log found: prepends "[Proton log attached]" to the question and sends with log context
  - If log not found: shows the hint about enabling Proton logging

**Files affected:** `main.py` (2 new RPC methods + modify ask_ollama for log context), `src/index.tsx` (Diagnose button)

**Done when:** User clicks "Diagnose", plugin reads Proton log for the active game, AI receives log context and provides troubleshooting advice. Clear message if logging is not enabled.

**NOT in scope:** Enabling/disabling Proton logging from the plugin, real-time log streaming, crash dump analysis, automatic error detection without user action, privacy consent dialog.

> **Status: UNCERTAIN** -- This feature's value is debatable. Most users won't have `PROTON_LOG=1` enabled, and the ones who do are likely technical enough to read logs themselves. Consider deprioritizing or folding this into a more general "AI context injection" framework if one emerges.

---

## ★★★★☆☆ Steam Input Analysis (.vdf Parsing)

**Summary:** Parse Valve's VDF controller configuration files and feed meaningful data to the AI for controller setup help.

**Why it's ★★★★☆☆:** VDF is a custom KeyValues1 format. Controller configs are deeply nested with internal identifiers. Mapping to human-readable names requires either IGA localization blocks or a hardcoded lookup table.

**Implementation details:**
- Controller configs at `/home/deck/.local/share/Steam/steamapps/common/Steam Controller Configs/{USERID}/config/{APPID}/`
- Alternative path: `/home/deck/.local/share/Steam/userdata/{SteamID64}/241100/remote/controller_config/{APPID}/`
- Templates at `/home/deck/.local/share/Steam/controller_base/templates/`
- IGA (In-Game Actions) files: `game_actions_{appid}.vdf` with `localization > english` blocks mapping `#Action_Fire` -> `"Fire"`
- `vdf` PyPI package: `vdf.load(f)` returns nested dict; `mapper=vdf.VDFDict` handles duplicate keys

**Subtasks:**
- [ ] Backend: add `_find_controller_config(app_id: str) -> str | None`:
  - Search `~/.local/share/Steam/steamapps/common/Steam Controller Configs/*/config/{app_id}/` for `.vdf` files
  - Fallback: search `~/.local/share/Steam/userdata/*/241100/remote/controller_config/{app_id}/`
  - Return path to the most recently modified `.vdf` file, or None
- [ ] Backend: add `async def get_controller_layout(self, app_id: str) -> dict`:
  - Find and parse VDF config using `vdf.load(f, mapper=vdf.VDFDict)`
  - Extract binding groups (action sets) and individual bindings
  - Return `{"found": bool, "bindings": [{"action": str, "input": str}], "source": "per-game"|"template"}`
- [ ] Build `STEAM_INPUT_NAMES` hardcoded map for the 20 most common identifiers:
  ```python
  {"button_a": "A Button", "button_b": "B Button", "button_x": "X Button", "button_y": "Y Button",
   "left_trigger": "Left Trigger", "right_trigger": "Right Trigger", "left_bumper": "Left Bumper",
   "right_bumper": "Right Bumper", "dpad_north": "D-Pad Up", "dpad_south": "D-Pad Down",
   "left_trackpad": "Left Trackpad", "right_trackpad": "Right Trackpad", "joystick_move": "Left Stick", ...}
  ```
- [ ] For IGA games: look for `game_actions_{app_id}.vdf`, parse `localization > english` block to get human-readable action names
- [ ] Frontend: inject controller summary into AI context when user asks about controls, or show in a collapsible "Controller Layout" section
- [ ] Prerequisite: `vdf` package bundled (feature 6)

**Files affected:** `main.py` (config finder + parser + RPC method), `src/index.tsx` (optional layout display)

**Done when:** For a game with a controller config, the plugin can produce "A = Jump, B = Dodge, LT = Aim" style summary and feed it to the AI when asked about controls.

**NOT in scope:** Editing controller configs, community layout browsing/downloading, creating new layouts, supporting every possible binding type, gamepad remapping.

**Prerequisite:** Feature 6 (vdf package bundled in `py_modules/`).

**Reference:** [Steamworks IGA docs](https://partner.steamgames.com/doc/features/steam_controller/iga_file), [ValvePython/vdf](https://github.com/ValvePython/vdf).

---

## ★★★★☆☆ Advanced Thermal & Fan Curve Tuning

**Summary:** Direct hardware fan curve control via sysfs, going beyond TDP to full thermal management.

**Why it's ★★★★☆☆:** Hardware-level writes with real safety concerns. Must interact with `jupiter-fan-control.service`. Wrong values can cause thermal issues.

**Implementation details:**
- Fan control via `steamdeck` hwmon (discover by scanning `/sys/class/hwmon/hwmon*/name` for `"steamdeck"` -- same pattern as existing `_find_amdgpu_hwmon`)
- `fan1_input` (RPM, read-only), `fan1_target` (RPM, writable via `_write_sysfs`)
- Temperature from amdgpu hwmon `temp1_input` (millidegrees, divide by 1000 for Celsius)
- **Critical:** must stop `jupiter-fan-control.service` before taking manual control (Fantastic plugin pattern). Must restart it on unload.
- LCD and OLED Decks use the same `steamdeck` hwmon driver and `jupiter-fan-control.service` (differ by DMI board name, not sysfs API)

**Subtasks:**
- [ ] Backend: add `_find_steamdeck_hwmon() -> str | None` scanning `/sys/class/hwmon/hwmon*/name` for `"steamdeck"`
- [ ] Backend: add `_read_temp() -> float` reading `{amdgpu_hwmon}/temp1_input`, dividing by 1000 for Celsius
- [ ] Backend: add `_read_fan_rpm() -> int` reading `{steamdeck_hwmon}/fan1_input`
- [ ] Backend: add `_set_fan_rpm(rpm: int)` writing clamped value (1000-6000 RPM) to `{steamdeck_hwmon}/fan1_target` via `_write_sysfs`
- [ ] Backend: add `async def enable_manual_fan(self) -> dict`:
  - `subprocess.run(["systemctl", "stop", "jupiter-fan-control.service"], env=_clean_env())`
  - Return `{"manual": True}`
- [ ] Backend: add `async def disable_manual_fan(self) -> dict`:
  - `subprocess.run(["systemctl", "start", "jupiter-fan-control.service"], env=_clean_env())`
  - Return `{"manual": False}`
- [ ] Backend: add `async def get_thermal_status(self) -> dict`:
  - Return `{"temp_c": float, "fan_rpm": int, "manual_active": bool}`
- [ ] Define 3 preset profiles as RPM-at-temperature tables:
  - **Silent:** 1000 RPM < 60C, 2500 RPM at 70C, 4000 RPM at 80C, max at 90C
  - **Balanced:** 2000 RPM < 50C, 3500 RPM at 65C, 5000 RPM at 80C, max at 85C
  - **Performance:** 3000 RPM always, 5000 RPM at 60C, max at 70C
- [ ] Safety failsafe: if `_read_temp() > 90`, force `_set_fan_rpm(6000)` regardless of profile
- [ ] Frontend: profile selector as 3 `ButtonItem`s + current temp/RPM display (polled every 3s when section visible)
- [ ] **On plugin unload (`_unload`):** always call `disable_manual_fan()` to restore system fan control

**Files affected:** `main.py` (hwmon discovery + fan control + thermal reads + 3 RPC methods), `src/index.tsx` (profile selector + live temp/RPM)

**Done when:** User selects a fan profile, plugin takes fan control, shows live temp/RPM. Unloading plugin restores system fan control. Temperature failsafe is always active when manual mode is on.

**NOT in scope:** Custom curve editor GUI, AI-driven dynamic fan adjustment, per-game fan profiles, OLED-specific thermal tuning.

**Reference:** [NGnius/Fantastic](https://github.com/NGnius/Fantastic) -- `backend-rs/src/control.rs` for fan loop pattern, `backend-rs/src/sys.rs` for sysfs paths. Note: Fantastic hardcodes `hwmon5` which is fragile; always discover by name.

---

## ★★★★★☆ Global Screenshots & Vision (Gamescope)

**Summary:** Capture in-game screenshots from gamescope and send them to a multimodal AI for visual analysis.

**Why it's ★★★★★☆:** Requires gamescope integration, image processing pipeline, multimodal Ollama API, and significant data transfer over Wi-Fi.

**Implementation details:**
- Gamescope writes screenshots to `/tmp/gamescope_*.png` on `Super+S` hotkey (documented in gamescope README)
- Programmatic capture via: (a) `xdotool key super+s` to trigger gamescope screenshot, (b) watch `/tmp/` for newest `gamescope_*.png`, or (c) PipeWire `pipewiresrc` (how Decky Recorder works)
- [gamescope-dbus](https://github.com/ShadowBlip/gamescope-dbus) offers `RequestScreenshot` D-Bus call but is NOT stock SteamOS
- Ollama multimodal API: `POST /api/chat` with `"images": ["<base64>"]` in the user message object
- Vision-capable models (prioritized by size, smallest first for low barrier to entry):
  1. `moondream` (1.8B, ~1.5GB VRAM) -- best for low-end hardware, runs on almost anything
  2. `bakllava` (7B, ~4.5GB VRAM) -- mid-range, good quality/size tradeoff
  3. `llava` (7B, ~4.5GB VRAM) -- similar to bakllava, widely tested
  4. `llama3.2-vision` (11B, ~7.8GB VRAM) -- best quality, needs 8GB VRAM

> **Hardware targeting philosophy:** Always aim for low barrier to entry. Most gamers have 8GB VRAM on their main rig, but we must also consider the upcoming Steam Machine and its RAM/VRAM limitations. Default recommendation should be `moondream` or `bakllava`, with `llama3.2-vision` as the premium option for beefy PCs.

**Subtasks:**
- [ ] Backend: add `async def capture_screenshot(self) -> dict`:
  - **Method 1 (preferred):** Run `xdotool key super+s` via subprocess, wait 500ms, find newest `/tmp/gamescope_*.png` by mtime
  - **Method 2 (fallback):** Run `grim /tmp/bonsai_capture.png` if `grim` is available
  - Read the PNG file, resize to max 1024px longest side (use `convert` from ImageMagick: `convert input.png -resize 1024x1024> output.png`), base64-encode
  - Return `{"success": bool, "image_b64": str, "size_bytes": int}`
  - Clean up temp files after encoding
- [ ] Backend: modify `ask_ollama()` to accept optional `image_b64: str = None` parameter:
  - When present, add `"images": [image_b64]` to the user message dict
  - Override model selection: try `["moondream", "bakllava", "llava", "llama3.2-vision"]` (smallest first, low barrier to entry)
- [ ] Backend: modify `ask_game_ai()` to accept and pass through `image_b64` from frontend
- [ ] Frontend: add "Screenshot + Ask" `ButtonItem` that:
  - Calls `capture_screenshot()`, then calls `ask_game_ai` with the image data
  - Shows "Capturing..." then "Analyzing..." loading states
- [ ] Handle timing: fire capture immediately on button press (before QAM overlay animation completes)
- [ ] Document in `INSTALL_STEPS_TROUBLESHOOTING.md`: user must `ollama pull llama3.2-vision` on their PC

**Files affected:** `main.py` (capture function + modify ask_ollama for images + new model list), `src/index.tsx` (Screenshot+Ask button), `INSTALL_STEPS_TROUBLESHOOTING.md` (vision model setup)

**Done when:** User presses "Screenshot + Ask", plugin captures the game screen, sends image + question to a vision model, and displays the AI's visual analysis.

**NOT in scope:** Video/continuous capture, frame selection UI, multiple images per prompt, model auto-download, real-time screen sharing, thumbnail preview in QAM.

**Prerequisites:** ImageMagick (`convert`) or Pillow on the Deck for resize. Vision model pre-pulled on the PC (recommend `ollama pull moondream` for low-end, `ollama pull llama3.2-vision` for high-end). `xdotool` installed on SteamOS (usually available).

**Reference:** [Ollama API docs -- images](https://github.com/ollama/ollama/blob/main/docs/api.md), [llama3.2-vision on Ollama](https://ollama.com/library/llama3.2-vision).

---

## ★★★★★☆ Voice Command Input (PipeWire + Whisper)

**Summary:** Capture audio from the Steam Deck's microphone via PipeWire, send to a Whisper server on the PC, and use the transcription as the AI prompt.

**Why it's ★★★★★☆:** Full audio pipeline across two devices. Recording, HTTP file upload, speech-to-text, then AI inference -- four async stages.

**Implementation details:**
- `pw-record` is available on SteamOS (Arch-based, PipeWire is the audio stack)
- Record as 16kHz mono s16 WAV (Whisper's native format -- avoids resampling)
- Must use `_clean_env()` when spawning `pw-record` (strip Decky's `LD_` overrides, same as existing `_write_sysfs` pattern)
- whisper.cpp server: `POST /inference` with multipart file upload; response contains transcription text
- Record-then-upload (not streaming) is simpler and works with stock whisper.cpp server

**Subtasks:**
- [ ] Backend: add `_recording_proc: subprocess.Popen | None = None` as class-level state
- [ ] Backend: add `async def start_recording(self) -> dict`:
  ```python
  self._recording_proc = subprocess.Popen(
      ["pw-record", "--rate", "16000", "--format", "s16", "/tmp/bonsai_voice.wav"],
      env=Plugin._clean_env()
  )
  return {"recording": True}
  ```
- [ ] Backend: add `async def stop_recording(self) -> dict`:
  - Send `SIGINT` to `_recording_proc`, `proc.wait(timeout=5)` for clean WAV header finalization
  - Verify `/tmp/bonsai_voice.wav` exists and is > 1KB
  - Return `{"success": bool, "size_bytes": int}`
- [ ] Backend: add `async def transcribe_audio(self, pc_ip: str) -> dict`:
  - Build multipart form POST to `http://{pc_ip}:8080/inference` with `file=@/tmp/bonsai_voice.wav`
  - Use `urllib.request` with multipart encoding (or `subprocess.run(["curl", ...])` as simpler alternative)
  - Parse JSON response for transcription text
  - Return `{"success": bool, "text": str, "elapsed_s": float}`
- [ ] Frontend: add a microphone `ButtonItem` with push-to-talk UX:
  - `onActivate`: call `start_recording()`, change button text to "Recording... (press to stop)", show pulsing red indicator
  - Second press: call `stop_recording()` then `transcribe_audio()`, populate `ollamaQuestion` with transcribed text
  - Optionally auto-submit to AI after transcription populates the field
- [ ] Frontend: handle error states: "No microphone detected", "Whisper server unreachable", "Recording too short"
- [ ] Document Whisper server setup in `INSTALL_STEPS_TROUBLESHOOTING.md`:
  ```
  # On your PC, alongside Ollama:
  # Option A: whisper.cpp server
  ./build/bin/whisper-server -m models/ggml-base.en.bin --host 0.0.0.0 --port 8080
  # Option B: faster-whisper with OpenAI-compatible API
  ```

**Files affected:** `main.py` (3 new RPC methods + class-level proc state), `src/index.tsx` (mic button + recording state), `INSTALL_STEPS_TROUBLESHOOTING.md` (Whisper setup docs)

**Done when:** User presses mic button, speaks a question, presses again to stop -- transcription appears in the question field. Works with Steam Deck built-in mic and external headset.

> **Design principle:** This feature has a lot of moving parts (recording, upload, transcription, then AI inference). Keep the implementation as lightweight and lean as possible -- minimal state, no background threads beyond the recording process, and fail fast with clear error messages at each stage.

**NOT in scope:** Voice activation detection, wake word, continuous listening, noise cancellation, echo cancellation, streaming ASR, real-time transcription display.

**Prerequisites:** User runs whisper.cpp server on PC (port 8080). Recommend `ggml-base.en` model (~140MB) for speed; `ggml-small.en` (~460MB) for accuracy. Deck mic not muted in QAM audio settings. `pw-record` available on SteamOS (standard).

**Reference:** [whisper.cpp server](https://github.com/ggerganov/whisper.cpp) -- API: `POST /inference -F "file=@clip.wav" -F "response_format=json"`.

---

## ★★★★★★ Deep Mod & Port Configuration Manager

**Summary:** Game-specific mod detection and AI-assisted mod advice. Phase 1 is read-only detection; full mod management is Phase 2+.

**Why it's ★★★★★★ (you'll need a tank):** Even scoped to Phase 1, this touches game directory scanning, Proton prefix paths, mod framework detection, and per-game ecosystem knowledge. Full mod installation/management would be its own standalone plugin.

**Implementation details:**
- Game install paths discoverable via `~/.local/share/Steam/steamapps/appmanifest_{APPID}.acf` -> `"installdir"` field
- Actual game files at `~/.local/share/Steam/steamapps/common/{installdir}/`
- Proton prefix (where Windows-side mods live): `~/.local/share/Steam/steamapps/compatdata/{APPID}/pfx/drive_c/`
- Common mod indicators: `mods/` folder, `BepInEx/`, `SMAPI/`, `.pak` override files, `dinput8.dll` (mod loader hook), `d3d9.dll` / `dxgi.dll` (ReShade/ENB)

**Subtasks (Phase 1 only -- detection and AI context, NO installation):**
- [ ] Backend: add `_get_game_install_path(app_id: str) -> str | None`:
  - Parse `~/.local/share/Steam/steamapps/appmanifest_{app_id}.acf` (KeyValues format, use `vdf.load`)
  - Extract `"installdir"` value
  - Return full path: `~/.local/share/Steam/steamapps/common/{installdir}/`
- [ ] Backend: add `_scan_for_mods(game_path: str, app_id: str) -> dict`:
  - Check for known mod framework directories: `BepInEx/`, `mods/`, `SMAPI/`, `MelonLoader/`
  - Check Proton prefix `compatdata/{app_id}/pfx/drive_c/` for DLL hooks: `dinput8.dll`, `d3d9.dll`, `dxgi.dll`
  - Count `.pak` / `.zip` / `.esp` / `.esm` files in mod-related directories
  - Return `{"mods_detected": ["BepInEx framework", "3 .pak mod files"], "mod_framework": "BepInEx" | null, "game_path": str}`
- [ ] Backend: add `async def get_mod_info(self, app_id: str) -> dict` RPC method combining the above
- [ ] Backend: when user asks about mods, inject mod context into system prompt: `"The following mods/frameworks were detected in the game directory: {list}"`
- [ ] Frontend: add "Mod Info" collapsible section showing detected mods for the active game (only visible when a game is running and mods are detected)

**Files affected:** `main.py` (game path discovery + mod scanner + RPC method), `src/index.tsx` (mod info display)

**Done when (Phase 1):** Plugin detects existing mods in a game directory and provides that context to the AI. AI can answer "what mods do I have installed?" and "are these mods compatible with Steam Deck?"

**NOT in scope (Phase 1):**
- ~~Mod downloading from any source (Nexus, Steam Workshop, etc.)~~ -- **permanently out of scope**, not needed
- ~~Mod installation, extraction, or file placement~~ -- **permanently out of scope**, not needed
- Steam Workshop integration
- Port configuration (source ports for Doom, Quake, etc.)
- Per-game mod handler architecture

**Potentially useful for Phase 2+ (separate planning doc each):**
- Load order management (read-only display of load order, helpful for Bethesda games)
- Mod updates or version checking (detect outdated mods, show latest available)
- Nexus Mods API integration (read-only: check mod compatibility, show descriptions)

**Prerequisite:** Feature 6 (vdf package bundled) for parsing `.acf` manifest files.

---

## Cross-Cutting Prerequisites & Dependency Graph

Features are not independent. The dependency graph below shows which features should be built first.

**Shared dependencies:**
- **`vdf` PyPI package** (bundled in `py_modules/`): needed by features 6, 8, 9, 13. Bundle it once in feature 6.
- **`settings.json` infrastructure**: built in feature 3, reused by features 6 (language override) and 7 (pending state).
- **Connection Info section**: built in feature 4, provides a home for PC IP (needed by feature 5's search box merge).

**Recommended build order:**
1. Feature 1 (Suggested Prompts) -- standalone, no dependencies **(implemented)**
2. Feature 2 (Latency Warnings) -- standalone, no dependencies
3. Feature 3 (Persist Settings) -- foundational for features 6, 7
4. Feature 4 (Deck IP / Connection) -- foundational for feature 5
5. Feature 5 (Combine Search Box) -- depends on feature 4
6. Feature 6 (Multi-Language) -- depends on feature 3; bundles `vdf` for features 8, 9, 13
7. Feature 7 (Background Prompts) -- depends on feature 3
8. Feature 8 (Proton Logs) -- depends on feature 6 (vdf)
9. Feature 9 (Steam Input) -- depends on feature 6 (vdf)
10. Feature 10 (Fan Curves) -- standalone but high-risk; test extensively
11. Feature 11 (Vision/Screenshots) -- standalone; needs PC-side model setup
12. Feature 12 (Voice Input) -- standalone; needs PC-side Whisper setup
13. Feature 13 (Mod Manager Phase 1) -- depends on feature 6 (vdf)

```
                        ┌─────────────────────────────────────────────────────────┐
                        │              BONSAI FEATURE DEPENDENCY GRAPH             │
                        └─────────────────────────────────────────────────────────┘

  ╔═══════════════════════╗        ╔═══════════════════════╗
  ║  1 ★☆☆☆☆☆          ║        ║  2 ★★☆☆☆☆          ║
  ║  Suggested Prompts    ║        ║  Latency Warnings     ║
  ║  (standalone, done)   ║        ║  (standalone)         ║
  ╚═══════════════════════╝        ╚═══════════════════════╝


  ╔═══════════════════════╗        ╔═══════════════════════╗
  ║  3 ★★☆☆☆☆          ║        ║  4 ★★☆☆☆☆          ║
  ║  Persist Settings     ║        ║  Deck IP / Connection ║
  ╚═══════╤═══════╤═══════╝        ╚═══════════╤═══════════╝
          │       │                             │
          │       │                             ▼
          │       │                 ╔═══════════════════════╗
          │       │                 ║  5 ★★☆☆☆☆          ║
          │       │                 ║  Combine Search Box   ║
          │       │                 ╚═══════════════════════╝
          │       │
          │       ▼
          │   ╔═══════════════════════╗
          │   ║  7 ★★★☆☆☆          ║
          │   ║  Background Prompts   ║
          │   ╚═══════════════════════╝
          │
          ▼
  ╔═══════════════════════╗
  ║  6 ★★★☆☆☆          ║
  ║  Multi-Language       ║
  ║  (bundles vdf pkg)    ║
  ╚═══╤═══════╤═══════╤═══╝
      │       │       │
      │       │       │
      ▼       │       ▼
  ┌─────────┐ │   ┌─────────────┐
  │ 8 ★★★☆☆☆│ │   │ 13 ★★★★★★  │
  │ Proton  │ │   │ Mod Manager │
  │ Logs ⚠️  │ │   └─────────────┘
  └─────────┘ │
              ▼
          ┌────────────┐
          │ 9 ★★★★☆☆│
          │ Steam      │
          │ Input      │
          └────────────┘


  ════════════════════════════════════════════════════════════
   STANDALONE (no dependencies, but high complexity / PC setup)
  ════════════════════════════════════════════════════════════

  ╔═══════════════════════╗  ╔═══════════════════════╗  ╔═══════════════════════╗
  ║ 10 ★★★★☆☆          ║  ║ 11 ★★★★★☆          ║  ║ 12 ★★★★★☆          ║
  ║ Fan Curves            ║  ║ Vision / Screenshots  ║  ║ Voice Input           ║
  ║ ⚠️ HIGH RISK (hwmon)  ║  ║ 🖥️ needs PC model    ║  ║ 🖥️ needs PC whisper   ║
  ╚═══════════════════════╝  ╚═══════════════════════╝  ╚═══════════════════════╝

  Legend:  ⚠️  = uncertain or high-risk    🖥️ = requires PC-side setup
           ═══ = build this first           ──▶ = depends on
```