# bonsAI

**bonsAI** is a [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) plugin that runs a **self-hosted** AI chat on your Steam Deck. It talks to **Ollama** on your machine or another computer on your home network. You do not need a paid cloud AI API for the main workflow, though you can run whatever models Ollama supports.

- Self-hosted: prompts and answers can stay on your Deck and LAN.
- Best experience when Ollama runs on a **PC with a GPU**; the Deck sends requests over the network.

## Glossary (quick)


| Term             | Meaning                                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ollama**       | A free app that downloads and runs **LLMs** (large language models) locally and serves them on a network port (by default **11434**).                      |
| **LLM**          | The trained model that generates text; you “pull” one or more into Ollama with `ollama pull <name>`.                                                       |
| **Decky Loader** | The framework that injects **bonsAI** (and other plugins) into Steam’s **Quick Access Menu (QAM)**.                                                        |
| **QAM**          | **Quick Access Menu** — the overlay you open with the **Quick Access** / Guide-style button, where the Decky icon lives.                                   |
| **LAN**          | Your home network (Wi‑Fi or Ethernet). The Deck and your PC must see each other on the LAN if Ollama runs on the PC.                                       |
| **Base URL**     | The address bonsAI uses to reach Ollama, usually `http://` **PC IP** `:11434` or `http://127.0.0.1:11434` if Ollama runs on the same device as the plugin. |
| **Model pull**   | Downloading a model’s weights into Ollama with `ollama pull <model>` (large download; do this on the Ollama host, not the Deck alone).                     |


## What bonsAI does

- **Ask (chat)** — Send questions from the main tab; the **Python backend** calls Ollama (the UI does not `fetch` the PC directly; that avoids browser security issues). Replies are shown in the chat area with markdown-style chunks.
- **Ask modes: Speed, Strategy, Expert** — The mode control on the main tab (labels: **Speed**, **Strategy**, **Expert**) picks different **Ollama model fallback chains** and, for Strategy only, a different **coaching** style in the system prompt. Broadly: **Speed** prioritizes a faster, smaller-model chain; **Expert** allows deeper, larger-model fallbacks; **Strategy** sits in the **middle** for model choice and is tuned for **gameplay help** (see below).
- **Strategy mode (the middle mode)** — Use this when you want **how do I get past this / where should I go next?**-style help rather than a quick setting lookup. The assistant is steered toward **Strategy Guide** behavior: **Steam Deck** and **gamepad**-first, step-by-step coaching, and honest uncertainty. On an initial Strategy response, the model may end with a **small multiple-choice block** the plugin can show as **branch options** so you narrow the topic (e.g. where you are in the game); in follow-up messages you get **deeper tips** for the branch you implied or selected—without repeating that branching block. Replies can take **longer** than **Speed** mode because the model is allowed a richer answer. For raw speed or for non-game questions, use **Speed** or **Expert** instead.
- **Game context** — When available, the active game is included so answers can be **game-aware** (name/context depends on what Steam/Decky exposes for that session).
- **Presets** — Quick **preset chips** and a unified **search / ask** bar help you reuse common prompts without retyping.
- **Screenshot attachments (vision)** — You can attach a **Steam screenshot** for image+text asks. Ollama must be using a **multimodal (vision) model**; set **Attachment quality** under Settings. **Permissions** may be required to read screenshots; see [docs/troubleshooting.md](docs/troubleshooting.md#25-screenshot-vision-setup-v1) (vision setup).
- **Performance (TDP / power) guidance** — The assistant can discuss power limits; with **Permissions**, bonsAI may **apply** suggested TDP changes on the Deck. After changes, the UI reports what was applied. For QAM display quirks and verification, see [docs/troubleshooting.md](docs/troubleshooting.md#4-qam--qamp-reflection-strategy).
- **AI character (roleplay tone)** — Optional style via the in-app character picker; technical keys are summarized for contributors in [docs/development.md](docs/development.md).
- **Model policy and disclosure** — You choose a **Model policy** tier in Settings. Successful replies can include a short **model source** line with a link; see the [Model policy tiers](#model-policy-tiers) section below.

**Tabs (simple map):** **Main** (Ask and thread), **Settings** (Ollama URL, policy, timing, notes), **Permissions** (lock icon — what’s gated), **About** (links and context), **Debug** (diagnostics; mainly for advanced users and contributors).

## Requirements

- A Steam Deck (or compatible **SteamOS** handheld) with **Decky Loader** installed.
- **Ollama** reachable from the Deck:
  - **Option A (recommended):** a Windows or Linux **PC on the same LAN** (often much faster on a dedicated GPU).
  - **Option B:** Ollama **on the Deck** (same device as the plugin) — expect heavier CPU/VRAM use and slower generation.
- At least one text model **pulled** in Ollama. For vision/screenshots, also pull a **multimodal** model from the [Ollama library](https://ollama.com/library).

## 1) Install the plugin (end users)

You do **not** need a copy of this git repo to use bonsAI.

1. **Install [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader)** on the Steam Deck using the official project instructions (Stable channel is a good default for most users).
2. **Download the release bundle**
  - Open the project’s [GitHub Releases](https://github.com/cantcurecancer/DeckySettingsSearch/releases) page.  
  - Download the **plugin `.zip` asset** for bonsAI (e.g. a file like `pluginname-version.zip` — exact filename follows each release).
3. **Install the plugin in Decky**
  - Open **Decky Loader** from the QAM, open its **settings** (gear), and use the **install plugin from a local ZIP** / **developer**-style option (wording can change between Decky versions). Point it at the downloaded `.zip`.  
  - If your build ships through the **Decky store** instead, you can use that path when it is available; the release ZIP remains the direct install from source.
4. You should see **bonsAI** in Decky’s plugin list. Continue with Ollama setup before expecting answers.

## 2) Set up Ollama (step by step)

### Choose where Ollama runs


| Where                                               | When to use                                                                                                                                                                                    |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PC on the LAN**                                   | You want faster answers and have a main rig. You will point bonsAI at `http://<PC-IP>:11434`. You must make Ollama **listen** on the network and allow **port 11434** through the PC firewall. |
| **On the Steam Deck (beta, not fully implemented)** | Use bonsAI on the go. Use `http://127.0.0.1:11434` in Settings (see below). Use the **Linux** install method. Expect higher load on the Deck.                                                  |


### Install Ollama (official + optional repo scripts)

**Windows (typical for a gaming PC)**

- **Official:** download and run the installer from [ollama.com/download](https://ollama.com/download) (Windows)
or
- **Manual one-liner (PowerShell)** if you prefer copy-paste:
  ```powershell
  $installerPath = "$env:TEMP\OllamaSetup.exe"
  Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile $installerPath
  Start-Process -FilePath $installerPath -Wait
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
  ollama pull llama3
  ollama run llama3 "Hello from bonsAI"
  ```

**Linux (Linux PC, Bazzite, etc. Deck specific instructions for local Ollama is forthcoming)**

- **Official:** [ollama.com/download](https://ollama.com/download) or:
  ```bash
  curl -fsSL https://ollama.com/install.sh | sh
  ```
  The script runs the official install and then tries to `ollama pull` the models it lists. **If a `pull` fails**, open the [Ollama model library](https://ollama.com/library) and use a current tag, or use the **FOSS-first** lists below.
- **Manual pulls after install:** use the **five-line default `ollama pull` block** under [Pull models (required)](#pull-models-required). Quick check after pulling:
  ```bash
  ollama run qwen2.5:1.5b "Hello from bonsAI"
  ```

### Let the Deck reach Ollama (PC on LAN)

If bonsAI runs on the Deck and Ollama runs on a **PC**, do all of the following on the **PC that runs Ollama**:

1. **Listen on the LAN** — set `**OLLAMA_HOST=0.0.0.0`** (user or system environment variable) **or** use the Ollama app’s “listen on network / expose on LAN” option if your build has it. **Restart Ollama** after changing this.
2. **Firewall** — allow **inbound TCP 11434** (Windows: Defender Firewall → Inbound rules → new rule for port 11434).
3. **Check** — from the Deck (Terminal or SSH) or from the PC:
  ```bash
   curl -sS -m 5 http://<PC-IP>:11434/api/tags
  ```
   You should see JSON listing models, not a connection error.

More edge cases (CORS is not the issue for bonsAI; the Python backend does the call), WSL, and Bazzite/ROCm are covered in [docs/troubleshooting.md](docs/troubleshooting.md#2-network--communication-the-bridge) (section **2 · Network & communication**).

### Pull models (required)

You need a **text** model for every ask and, for **screenshot** asks, a **vision** (multimodal) model. bonsAI tries tags **in a fixed order** per **Speed / Strategy / Expert**; the first name that exists in Ollama wins. Defaults are **Tier 1 (FOSS-first)**, then Tier 2+ tags only if your [Model policy](#model-policy-tiers) allows them.

**Default install (smallest useful set, Tier 1 only)** — the **first** FOSS tag in each mode for text and for vision, from [refactor_helpers.py](refactor_helpers.py) (`_TEXT_FOSS_`*, `_VISION_FOSS_*`). There are **five** `ollama pull` lines because **Strategy** and **Expert** use the same first **vision** tag (`qwen2.5vl:latest`). Check tags on [ollama.com/library](https://ollama.com/library). Rough **total disk: ~22–30 GB** in typical Ollama quants.

```bash
ollama pull qwen2.5:1.5b     # text · Speed
ollama pull qwen2.5:latest   # text · Strategy
ollama pull qwen2.5:14b      # text · Expert
ollama pull llava:7b         # vision · Speed
ollama pull qwen2.5vl:latest  # vision · Strategy & Expert
```

**Full try order (every hop and fallback chain)** including Tier 1 FOSS, open-weight tails, and high-VRAM tails: see [refactor_helpers.py](refactor_helpers.py) (`TEXT_MODELS_BY_MODE`, `VISION_MODELS_BY_MODE`, `select_ollama_models`).

**Tier 2, Tier 3, and large / high-VRAM models**

- In **bonsAI → Settings → Model policy**, pick a **tier** to allow broader model families in the try lists ([Model policy tiers](#model-policy-tiers) below). Tier 2+ still only uses models you have actually `pull`ed in Ollama.
- For **larger** checkpoints (e.g. 31B / 38B class) after the default ~16 GB–friendly chain, turn on **Allow high-VRAM model fallbacks** in the same place. This can **OOM** on smaller GPUs. Which tags are appended, per mode, is in [refactor_helpers.py](refactor_helpers.py) (`_TEXT_HIGH_VRAM_*`, `_VISION_HIGH_VRAM_*`); [docs/roadmap.md](docs/roadmap.md#reference--vision-model-fallback-order) (**Reference — vision model fallback order**).
- `settings.json` keys and code pointers: [docs/development.md](docs/development.md#stack-and-layout) (bullet **Ask modes (main screen)**: `select_ollama_models`, `model_allow_high_vram_fallbacks`).
- Slow runs or GPU not used: [docs/troubleshooting.md](docs/troubleshooting.md#1-core-hardware--performance) §1; vision attach issues: [§2.5 Screenshot / vision](docs/troubleshooting.md#25-screenshot-vision-setup-v1).

**Windows** — `scripts/setup_ollama.ps1` may `ollama pull llama3` as a quick smoke test; for Tier 1 parity with the plugin, prefer the block above.

## 3) Configure bonsAI and your first Ask

1. On the Deck, open the **Quick Access Menu (QAM)** (Quick Access / Guide button, depending on your device).
2. Open **Decky** from the QAM, then open **bonsAI** from the plugin list (order depends on your QAM layout).
3. Open the **Settings** tab. Set the **Ollama host / base URL** to:
  - `http://<PC-IP>:11434` if Ollama is on a PC, or
  - `http://127.0.0.1:11434` if Ollama runs **on the same Steam Deck** as the plugin.  
   Default Ollama **port** is **11434** unless you changed it.
4. Return to the **main** tab. Send a **short test question** (or use a connection test if your build exposes one in Settings). You should get a model reply, not a timeout.
5. **Permissions (lock tab)** — Optional until you need them. The **Permissions** tab gates things like: saving **Desktop notes**, **applying** TDP or similar tuning from the model, **attaching** Steam screenshots, opening **external** links from **About**, and some **Debug** features. Ollama connectivity itself is not blocked by these toggles. See [docs/troubleshooting.md](docs/troubleshooting.md#1a-permissions-tab-blocked-actions).

## Open bonsAI faster (optional)

To jump into the QAM and Decky with a **controller chord** (Guide + other buttons), tune **Controller → Guide Button Chord** in Steam. **Fire Start Delay** and D-pad steps depend on your QAM order. Full recipe: [docs/troubleshooting.md](docs/troubleshooting.md#5-bonsai-shortcut-setup) — section **5 · bonsai shortcut setup**.

**Ask-field shortcuts (not normal prompts)** — for sanitizer and shortcut help phrases (e.g. `bonsai:shortcut-setup-deck`), see [Input sanitization](#input-sanitization) below; they are **not** part of the default onboarding path.

---

## Self-hosted and model transparency

- **Self-hosted** means your prompts and responses stay on hardware you control (the Deck and your LAN).
- **Open source** (the code) and **open weight** (the model) are not the same thing; both differ from a closed, hosted-only service.
- Most LLMs are not fully interpretable: even good models can **hallucinate** or be wrong. Treat answers as **assistant** output, not authority.

### Model policy tiers

bonsAI routes Ask requests through **ordered Ollama model fallbacks**. In **Settings → Model policy** you choose how permissive that list is. Classifications are **heuristic** (for UX and routing), not legal advice.


| Tier                                                | What it unlocks vs Tier 1 (FOSS-aligned routing)                                                                                                                                                                                                                                                                  |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tier 1 — Open-source only** (default)             | Only families the plugin treats as **open-source–aligned** for routing (e.g. many Qwen/Llava-style tags in our table). Safest default; stay here unless you need broader tags.                                                                                                                                    |
| **Tier 2 — Open-source + open model (open-weight)** | Adds common **“open model”** releases (e.g. Llama, Gemma, InternVL in our table): weights are usually published for local inference, but **licenses, training visibility, or use rules may differ** from Tier 1. This tier unlocks newer and faster models that bonsAI can use, but may not be as open as Tier 1. |
| **Tier 3 — Non-FOSS + unclassified (beta)**         | Requires an explicit **unlock** toggle. Adds tags we classify as **non-FOSS** and **any Ollama name not in the curated list** (“unclassified”) — treat license and trust as **unknown** until you verify upstream.                                                                                                |


**Recommendation:** Do not raise the tier unless you **need** a model outside Tier 1 or **know** why you are accepting broader terms. Each successful reply includes a short **Model source disclosure** with a link back to this section.

## Input sanitization (advanced; on by default)

> This is **not** part of the default “get chatting” path — read once if you change behavior or hit odd blocks.

bonsAI runs a **deterministic input sanitization lane** on Ask text before it is sent to Ollama (NUL/control cleanup, length limits, and conservative empty-or-junk blocking). **Sanitization is on by default** for every install. There is **no Settings-tab toggle** for this feature and it is not recommended to disable it. To disable the sanitizer you use **exact magic phrases** in the Ask field (trimmed, case-insensitive, whole message only):

- `bonsai:disable-sanitize` — turns the lane **off** for future asks and persists that choice in the plugin `settings.json` key `input_sanitizer_user_disabled` (JSON `true`).
- `bonsai:enable-sanitize` — turns the lane **back on** and clears that flag.

Those control messages **do not call Ollama**; the plugin saves settings and shows a short confirmation in the normal response area.

**Global quick-launch (Guide chord) help** — same rules (whole message, trim, casefold; an optional **leading `/`** is ignored). **Does not** write Steam macros or VDF; it shows fixed guidance and can offer **Open Controller settings** when **External and Steam navigation** is allowed in **Permissions**:

- `bonsai:shortcut-setup-deck` — Deck-style example (Guide + R4 or grip), link to the full doc.
- `bonsai:shortcut-setup-stadia` — Stadia / non-Deck pad; pick a spare button, same macro shape.

**Security note:** Settings live on the device. Anyone who can open bonsAI (for example via QAM while the Deck is unlocked) could send the disable phrase or edit `settings.json`. Treat the Deck like any other local console for sensitive prompts.

More detail: [docs/troubleshooting.md](docs/troubleshooting.md) (sanitizer FAQ), [docs/prompt-testing.md](docs/prompt-testing.md) (how to test without skewing model benchmarks).

### Input handling transparency

After each Ask finishes (including blocked input), the **main** tab can show **Input handling (last Ask)** with raw text, post-sanitizer text, the system and user strings sent to Ollama, model id, and responses. Use **Run original in Ask** to paste the raw prompt back into the Ask field.

Optional **Verbose Ask logging to Desktop notes** (Settings → Desktop notes) appends the same detail to `~/Desktop/BonsAI_notes/bonsai-ask-trace-YYYY-MM-DD.md` when **Filesystem writes** is enabled. That file can contain long prompts; disable the toggle or delete the file if you need to reclaim space.

## Developer and advanced docs


| Topic                                          | Audience                | Doc                                                                                                                                  |
| ---------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Index of all `docs/*.md` guides                | Everyone                | [docs/README.md](docs/README.md)                                                                                                     |
| Build, deploy, stack, settings keys            | Contributors            | [docs/development.md](docs/development.md)                                                                                           |
| Network, GPU, permissions, vision setup        | Power users             | [docs/troubleshooting.md](docs/troubleshooting.md)                                                                                   |
| Roadmap, shipped vs planned                    | Planning / contributors | [docs/roadmap.md](docs/roadmap.md)                                                                                                   |
| QA matrices, release checks                    | QA / contributors       | [docs/prompt-testing.md](docs/prompt-testing.md)                                                                                     |
| PR regression + Deck smoke checklist           | Contributors / QA       | [docs/regression-and-smoke.md](docs/regression-and-smoke.md)                                                                         |
| Release notes                                  | Everyone                | [CHANGELOG.md](CHANGELOG.md)                                                                                                         |
| Character catalog (roleplay)                   | Contributors / lore     | [docs/voice-character-catalog.md](docs/voice-character-catalog.md)                                                                   |
| Steam Input jump (debug)                       | Contributors            | [docs/steam-input-research.md](docs/steam-input-research.md)                                                                         |
| RAG / KB research (not implemented)            | Contributors            | [docs/rag-sources-research.md](docs/rag-sources-research.md)                                                                         |
| Refactor sweep + unified input (archive)       | Contributors            | [docs/refactor-specialist-sweep.md](docs/refactor-specialist-sweep.md#unified-input-refactor-completed)                              |


