# bonsAI

**bonsAI** is a [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) plugin that brings **self-hosted** AI chat to your Steam Deck Quick Access Menu (QAM). It talks to **Ollama** on your Deck or another machine on your home network. No paid cloud AI API is required for the main workflow: prompts and responses stay on hardware you control. Models can still hallucinate: treat answers as assistant output, not authority.

> **Beta software!** AI answers can be wrong or incomplete and features may break with Steam/Decky/plugin updates. Verify anything important yourself. Review **Permissions** before enabling. **Strategy** spoiler hiding and **VAC** results are best-effort but not foolproof. **Ollama on this Deck** can tax the system during games. **Power tips:** TDP apply is optional (**Permissions → Adjust power limits (beta)**). GPU clock suggestions are not written to hardware. Check **QAM → Performance** before you change settings.



## Quick start

1. Install **[Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader)** on your Steam Deck
2. Install **bonsAI** from the **[latest GitHub Release](https://github.com/cantcurecancer/bonsAI/releases)** — open **Decky** from QAM → Settings → Developer → install plugin from URL: [https://github.com/qd313/bonsAI/releases/latest/download/bonsAI.zip](https://github.com/qd313/bonsAI/releases/latest/download/bonsAI.zip)
3. **Install Ollama and a model**
  - **Deck**: **bonsAI → Ollama** → enable **Ollama on this Deck** → **Install Tier 1 essentials** `qwen2.5vl:3b` for chat + screenshots). Optional: **Install Tier 2 one-model multimodal** `gemma4:e2b-it-qat`)
  - **LAN PC:** Install **[Ollama]([https://ollama.com/download)** ([https://ollama.com/download](https://ollama.com/download)), then `ollama pull qwen2.5vl:3b` (optional: `ollama pull gemma4:e2b-it-qat`)
4. Open **bonsAI** → **Ollama** → set **Where AI runs** to `http://127.0.0.1:11434` (same device) or `http://<PC-IP>:11434` (PC on your LAN) → **Main** → send a test message

Unfamiliar with **QAM**, **LAN**, or **Ollama**? See [Glossary](#glossary-quick) below. Network, vision, and permission setup: [docs/troubleshooting.md](docs/troubleshooting.md)

## Glossary (quick)


| Term             | Meaning                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------ |
| **Ollama**       | Free app that runs **LLMs** locally on port **11434** (default)                            |
| **LLM**          | The model that generates text, pull with `ollama pull <name>`                              |
| **Decky Loader** | Framework that injects **bonsAI** into Steam's **Quick Access Menu (QAM)**                 |
| **QAM**          | **Quick Access Menu** — overlay opened with the `...` button, Decky lives here             |
| **LAN**          | Your home network. Required when Ollama runs on a separate PC                              |
| **Base URL**     | Address bonsAI uses for Ollama, usually `http://127.0.0.1:11434` or `http://<PC-IP>:11434` |




## What you can do



### Chat and game help

- **Ask** from the **Main** tab. Pick **Speed**, **Strategy**, or **Expert** on the mode chip
- **Strategy mode**: "How do I beat this level?" type questions with spoiler-safe tips, multiple choice branching, and a per-game **checklist** that remembers progress
- **Preset chips** above the Ask bar suggest common prompts (battery, performance, controls, troubleshooting, and more). Tap a preset to copy the question to the text area
- **Game context**: The game title and Steam appID is included in your prompt when a game is running
- **Screenshots**: Attach to your prompt (attach paperclip icon in the text area). Needs a vision model and **Permissions → Read game & screenshot context**. See [troubleshooting § Screenshot vision](docs/troubleshooting.md#25-screenshot-vision-setup-v1)
- **Voice input**: Local voice-to-text via the mic button. To enable go to **Permissions → Voice input (microphone)** and install a whisper model under **Settings → Voice input**
- **Character tone**: You can choose an optional character voice/tone that the AI will respond with. Adjust accent intensity in **Settings**
- **Conversation history**: collapsible chat rows. **Retry same prompt** and thumbs feedback (local use only). AI reponses will **finish in the background** when you close QAM



### Find settings faster

- Type in the Ask bar to **search Steam and QAM settings** and jump straight to a matching screen, no AI model required
- **Search intent packs** (Settings) — import offline alias JSON to extend settings search without cloud services



### Power and performance (beta)

- AI can suggest **TDP** limits. Enable **Permissions → Adjust power limits**, bonsAI applies TDP on the Deck and reminds you to verify in **QAM → Performance**
- **GPU clock** lines in replies are **recommendations only**, not currently written to hardware



### Setup and models (Ollama tab)

- **Where AI runs** — Ollama on the Deck (`127.0.0.1:11434`) or a PC on your LAN
- **Install Ollama on this Deck** wizard with Tier 1 / Tier 2 essentials pulls when you want local inference
- **Find LAN** (mDNS) —  save **named hosts**, run a **connection test**, and tune slow-reply warnings and timeouts
- **AI models** hub — policy tiers (FOSS-first default), browse/pull/delete models, and a short **model source** note on replies
- **Response verification** — optional rules on the Ollama tab to double-check replies before they reach you

For **Find LAN**, the Ollama host may need **Avahi/Bonjour** publishing — see [troubleshooting § Find Ollama on LAN](docs/troubleshooting.md#find-ollama-on-lan-mdns--optional).

### Trust and control

- **Permissions** gated: read game & screenshot context, save chat/logs to Desktop, adjust power limits, voice input, open web links, and (beta) Steam ban lookup (`bonsai:vac-check`). Steam Web API key lives under **Developer → Integrations** when the Developer tab is enabled
- **Input handling (last Ask)** on the main tab: See raw vs sanitized text and what was sent to Ollama
- **Magic Ask commands** (no Ollama required for these): `bonsai:disable-sanitize` / `bonsai:enable-sanitize`, `bonsai:shortcut-setup-deck`, `bonsai:shortcut-setup-stadia`, and `bonsai:vac-check`
- **Save to Desktop note**: Export Q&A to `~/Desktop/bonsAI_logs/` when **Permissions → Save files to Desktop** is on

**Tabs:** **Main · Ollama · Settings · Permissions · About** (+ optional **Developer** via Settings → **Show Developer tab** — logging, token streaming experiment, Steam Input jump).

## What's planned

Upcoming work includes user notes stash, couch-distance readability, native QAM shortcut tile, RAG on a LAN PC, and more — see **[docs/roadmap.md](docs/roadmap.md#planned)**. Shipped feature detail: [docs/archive/roadmap-completed.md](docs/archive/roadmap-completed.md).

## Requirements

- Steam device with **Decky Loader**
- **Ollama** reachable from the Deck (on the Deck or a PC on the LAN). You can locally install and update Ollama and its models from bonsAI
- Download at least one **text** model. A **vision** model is optional (needed for screenshot asks)



## Where Ollama runs


| Where                 | When to use                                                                                                                                                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **On the Steam Deck** | Portable; use `http://127.0.0.1:11434`. Heavier CPU/VRAM load — may affect game performance                                                                                                                                                    |
| **PC on the LAN**     | Much faster on a GPU. Point bonsAI at `http://<PC-IP>:11434`. PC must listen on the network (`OLLAMA_HOST=0.0.0.0`, firewall **TCP 11434**). Details: [troubleshooting § Network](docs/troubleshooting.md#2-network--communication-the-bridge) |




## Go deeper

**Model policy tiers** — **Ollama tab → AI models** controls how permissive model fallbacks are (Tier 1 FOSS-first default through Tier 3 beta unlock). Each reply can include a short model-source disclosure. See [Model policy tiers](#model-policy-tiers) below and [troubleshooting](docs/troubleshooting.md)

**Input sanitization** — On by default; cleans Ask text before Ollama. Disable only via exact phrases `bonsai:disable-sanitize` / `bonsai:enable-sanitize` in the Ask field (not recommended). Details: [troubleshooting](docs/troubleshooting.md)

**Input handling and logs** — After each Ask, Main can show what was sent vs sanitized. Optional verbose traces go to `~/Desktop/bonsAI_logs/` when **Permissions → Save files to Desktop** is enabled

**Open bonsAI faster (beta)** — Controller Guide chord macro: [troubleshooting § Shortcut](docs/troubleshooting.md#5-bonsai-shortcut-setup)

**Developer tab** — Opt-in under Settings for advanced logging, experimental token streaming, and Steam Input jump to the running game's controller config

### Model policy tiers


| Tier       | Default stance                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------ |
| **Tier 1** | FOSS-first model fallbacks (recommended default)                                                 |
| **Tier 2** | Adds open-weight models (e.g. Gemma-class tags)                                                  |
| **Tier 3** | Unlocks non-FOSS / beta AI models available on Ollama after explicit unlock in the AI models hub |


Change tier on **Ollama tab → AI models → Policy**. Licensing and tag-level detail: [troubleshooting](docs/troubleshooting.md) and [development guide § Architecture](docs/development.md#architecture-at-a-glance)

## Build from source

Contributors: see **[docs/development.md](docs/development.md)** — Deck-first setup, build/deploy scripts, and architecture overview.

More docs: [development.md](docs/development.md) · [testing.md](docs/testing.md) · [roadmap.md](docs/roadmap.md) · [CHANGELOG.md](CHANGELOG.md)

## Documentation


| Doc                                                       | Audience          | What it is                                                         |
| --------------------------------------------------------- | ----------------- | ------------------------------------------------------------------ |
| [troubleshooting.md](docs/troubleshooting.md)             | Power users       | GPU, network, vision, permissions, QAM, deploy edge cases          |
| [development.md](docs/development.md)                     | Contributors      | Deck-first setup, build/deploy, architecture, change-risk hotspots |
| [testing.md](docs/testing.md)                             | QA / contributors | PR gates, Deck QA runbook, shipped-feature coverage, Test Results  |
| [roadmap.md](docs/roadmap.md)                             | Planning          | In progress, planned backlog, completed summary                    |
| [security-audit-report.md](docs/security-audit-report.md) | Maintainers       | RPC/log/UI disclosure review                                       |
| [foss-advocate-report.md](docs/foss-advocate-report.md)   | Maintainers       | FOSS/transparency review                                           |
| [archive/](docs/archive/)                                 | —                 | Historical research, plans, and completed-feature detail           |




## Buy me a beer

Donate