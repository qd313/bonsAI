# bonsAI

**bonsAI** is a [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) plugin that runs a **self-hosted** AI chat on your Steam Deck. It talks to **Ollama** on your machine or another computer on your home network. You do not need a paid cloud AI API for the main workflow, though you can run whatever models Ollama supports.

- Self-hosted: prompts and answers can stay on your Deck and LAN.
- Best experience when Ollama runs on a **PC with a GPU**; the Deck sends requests over the network.

<img width="385" height="568" alt="DeckCapture_20260428_002601" src="https://github.com/user-attachments/assets/a7e7223e-877b-43ac-a6bc-87199551e95a" />

## Quick start

1. Install **[Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader)** on the Steam Deck (official instructions; Stable is a good default).
2. Download **bonsAI** from **[GitHub Releases](https://github.com/cantcurecancer/bonsAI/releases)** (same org/repo as in-app links). Open **Decky** from the QAM → settings (gear) → **install from local ZIP** / developer install (wording varies by Decky version) and point at the plugin `.zip`. If/when the plugin is on the **Decky store**, you can use that path instead. **Bleeding edge:** maintainers can use the **Build plugin zip** workflow under **Actions** and the `bonsai-plugin-*` artifact—see [docs/development.md](docs/development.md) → **Release (plugin zip)**.
3. On a **PC on the same LAN** (recommended), install **[Ollama](https://ollama.com/download)**. Make Ollama reachable at **`<PC-IP>:11434`** (`OLLAMA_HOST`, firewall)—full checklist and `curl` test: [docs/troubleshooting.md](docs/troubleshooting.md#2-network--communication-the-bridge).
4. On the Ollama host, pull at least one **text** model, for example `ollama pull qwen2.5:1.5b`. For **screenshots / vision**, also pull a multimodal model (e.g. `llava`); see [docs/troubleshooting.md](docs/troubleshooting.md#25-screenshot-vision-setup-v1). The plugin tries several model names in order per **Speed / Strategy / Expert**; defaults are **Tier 1 (FOSS-first)**. Full tag lists, **Model policy** tiers, and high-VRAM fallbacks are documented in [docs/development.md](docs/development.md#stack-and-layout) and [`refactor_helpers.py`](refactor_helpers.py) (`select_ollama_models`, `TEXT_MODELS_BY_MODE`, `VISION_MODELS_BY_MODE`).
5. Open **bonsAI** → **Settings** → set **Ollama host / base URL** to `http://<PC-IP>:11434`, or `http://127.0.0.1:11434` if Ollama runs on the same device as the plugin (port **11434** unless you changed it).
6. Open the **Main** tab and send a short test message.

_Unfamiliar with **QAM**, **LAN**, or **Ollama**? See [Glossary](#glossary-quick) below. **Model policy** tiers are explained under [Model policy tiers](#model-policy-tiers)._

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

- **Ask (chat)** — Questions from the main tab go through the **Python backend** to Ollama (not direct `fetch` from the UI). Replies show in the chat area with markdown-style chunks.
- **Ask modes: Speed, Strategy, Expert** — Picks different **model fallback chains**; **Strategy** also uses a **gameplay-coaching** system prompt. **Speed** favors smaller/faster models; **Expert** allows larger fallbacks; **Strategy** is the middle choice for **where do I go / how do I get past this**-style help. More behavior detail: [docs/roadmap.md](docs/roadmap.md).
- **Game context** — When available, the active game is included for **game-aware** answers.
- **Presets** — **Preset chips** and a unified **search / ask** bar for reusing prompts.
- **Screenshot attachments (vision)** — Attach a **Steam screenshot** for image+text asks; needs a **vision** model and **Attachment quality** in Settings. **Permissions** may be required; see [docs/troubleshooting.md](docs/troubleshooting.md#25-screenshot-vision-setup-v1).
- **Performance (TDP / power)** — With **Permissions**, suggested TDP changes can be **applied** on the Deck. QAM quirks: [docs/troubleshooting.md](docs/troubleshooting.md#4-qam--qamp-reflection-strategy).
- **AI character (roleplay)** — Optional tone via the in-app picker; keys for contributors: [docs/development.md](docs/development.md).
- **Model policy** — Tier in Settings controls how permissive fallback tags are; replies can include a short **model source** line. See [Model policy tiers](#model-policy-tiers) below.

**Tabs:** **Main** (Ask), **Settings** (Ollama URL, policy, timing, notes), **Permissions** (gated actions), **About**, **Debug**.

## Requirements

- Steam Deck (or compatible **SteamOS** handheld) with **Decky Loader**.
- **Ollama** reachable from the Deck: **PC on the LAN** (recommended) or **on the Deck** (heavier load, slower).
- At least one **text** model in Ollama; **vision** model optional but needed for screenshot asks.

## Detailed setup

You do **not** need this git repo to **use** bonsAI—only the release ZIP (or store install).

### Where Ollama runs

| Where                                               | When to use                                                                                                                                                                                    |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PC on the LAN**                                   | Faster on a GPU. Point bonsAI at `http://<PC-IP>:11434`. Ollama must **listen** on the network and allow **TCP 11434** through the firewall.                                                      |
| **On the Steam Deck**                               | On-the-go; use `http://127.0.0.1:11434`. Expect higher CPU/VRAM use. Linux install: [ollama.com/download](https://ollama.com/download).                                                           |

### Install Ollama

- **Windows:** Installer from [ollama.com/download](https://ollama.com/download).
- **Linux:** Same page, or `curl -fsSL https://ollama.com/install.sh | sh`. If bundled `pull` steps fail, pick tags from the [Ollama library](https://ollama.com/library). Quick smoke test: `ollama run qwen2.5:1.5b "Hello from bonsAI"`.

### PC on LAN: Deck → Ollama

Do this on the **machine that runs Ollama**: `OLLAMA_HOST=0.0.0.0` (or the app’s “listen on network” option), **restart Ollama**, allow **inbound TCP 11434**, then verify with `curl` as in [docs/troubleshooting.md](docs/troubleshooting.md#2-network--communication-the-bridge). WSL, Bazzite/ROCm, and more: same doc.

### First run and permissions

Open **Decky** → **bonsAI** → **Settings** for the base URL; **Main** for your first Ask. **Permissions** (lock tab) gate Desktop notes, TDP apply, screenshot attach, some external links, and parts of **Debug**—not basic Ollama connectivity. See [docs/troubleshooting.md](docs/troubleshooting.md#1a-permissions-tab-blocked-actions).

## Open bonsAI faster (optional)

Controller **Guide chord** setup: [docs/troubleshooting.md](docs/troubleshooting.md#5-bonsai-shortcut-setup).

**Ask-field shortcuts** (e.g. `bonsai:shortcut-setup-deck`): [Input sanitization](#input-sanitization)—not part of default onboarding.

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

**Steam account ban lookup (optional)** — `bonsai:vac-check` plus one or more **64-bit SteamIDs** or `steamcommunity.com/profiles/765…` links (space- or comma-separated). **Skips Ollama** and calls Valve **GetPlayerBans** when **Permissions → Steam Web API** is on and you saved a **Steam Web API** key under **Settings → Connection**. Output is **account-level** for those IDs only—not proof someone was your in-game opponent unless you verified the IDs. Vanity `/id/…` profile URLs are not resolved in this build.

**Security note:** Settings live on the device. Anyone who can open bonsAI (for example via QAM while the Deck is unlocked) could send the disable phrase or edit `settings.json`. Treat the Deck like any other local console for sensitive prompts.

More detail: [docs/troubleshooting.md](docs/troubleshooting.md) (sanitizer FAQ), [docs/prompt-testing.md](docs/prompt-testing.md) (how to test without skewing model benchmarks).

### Input handling transparency

After each Ask finishes (including blocked input), the **main** tab can show **Input handling (last Ask)** with raw text, post-sanitizer text, the system and user strings sent to Ollama, model id, and responses. Use **Run original in Ask** to paste the raw prompt back into the Ask field.

Optional **Verbose Ask logging to Desktop notes** (Settings → Desktop notes) appends the same detail to `~/Desktop/BonsAI_notes/bonsai-ask-trace-YYYY-MM-DD.md` when **Filesystem writes** is enabled. That file can contain long prompts; disable the toggle or delete the file if you need to reclaim space.

## Buy me a beer
![Donate](assets/qrcode.png)

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

