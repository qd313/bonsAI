# bonsAI

**bonsAI** is a [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) plugin that runs a **self-hosted** AI chat on your Steam Deck. It talks to **Ollama** on your Deck or another machine on your home network. No paid cloud AI API is required for the main workflow.

<img width="385" height="568" alt="DeckCapture_20260428_002601" src="https://github.com/user-attachments/assets/a7e7223e-877b-43ac-a6bc-87199551e95a" />

## Quick start

1. Install **[Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader)** on your Steam Deck.
2. Install **bonsAI** from **[GitHub Releases](https://github.com/cantcurecancer/bonsAI/releases)** — open **Decky** from QAM → install from local ZIP.
3. Install **[Ollama](https://ollama.com/download)** on the machine that will run models, then pull the Deck essentials model: `ollama pull qwen2.5vl:3b` (one FOSS model for chat and screenshots). Optional Tier 2: `ollama pull gemma4:e2b-it-qat`.
4. Open **bonsAI** → **Settings** → set **Ollama host** to `http://127.0.0.1:11434` (same device) or `http://<PC-IP>:11434` (PC on your LAN) → **Main** → send a test message.

Unfamiliar with **QAM**, **LAN**, or **Ollama**? See [Glossary](#glossary-quick). Network and vision setup: [docs/troubleshooting.md](docs/troubleshooting.md).

## Glossary (quick)

| Term | Meaning |
| ---- | ------- |
| **Ollama** | Free app that runs **LLMs** locally on port **11434** (default). |
| **LLM** | The model that generates text; pull with `ollama pull <name>`. |
| **Decky Loader** | Framework that injects **bonsAI** into Steam's **Quick Access Menu (QAM)**. |
| **QAM** | **Quick Access Menu** — overlay opened with the **`...`** button; Decky lives here. |
| **LAN** | Your home network. Required when Ollama runs on a separate PC. |
| **Base URL** | Address bonsAI uses for Ollama, usually `http://127.0.0.1:11434` or `http://<PC-IP>:11434`. |

## What bonsAI does

- **Ask (chat)** — Prompts go through the Python backend to Ollama; replies show as markdown-style chunks.
- **Ask modes: Speed, Strategy, Expert** — Different model fallback chains; Strategy adds gameplay-coaching prompts.
- **Game context** — Active game included when available.
- **Presets** — Reusable prompt chips and a unified ask bar.
- **Screenshot attachments** — Vision asks with a Steam screenshot; needs a vision model and Permissions. See [troubleshooting](docs/troubleshooting.md#25-screenshot-vision-setup-v1).
- **TDP / power** — With Permissions, suggested TDP changes can be applied on the Deck.
- **AI character (roleplay)** — Optional tone via the in-app picker.

**Tabs:** **Main**, **Settings**, **Permissions**, **About**, **Debug**.

## Requirements

- Steam Deck (or SteamOS handheld) with **Decky Loader**.
- **Ollama** reachable from the Deck (on the Deck or a PC on the LAN).
- At least one **text** model; **vision** model optional (needed for screenshots).

## Where Ollama runs

| Where | When to use |
| ----- | ----------- |
| **On the Steam Deck** | Portable; use `http://127.0.0.1:11434`. Heavier CPU/VRAM load. |
| **PC on the LAN** | Faster on a GPU. Point bonsAI at `http://<PC-IP>:11434`. PC must listen on the network (`OLLAMA_HOST=0.0.0.0`, firewall **TCP 11434**). Details: [troubleshooting § Network](docs/troubleshooting.md#2-network--communication-the-bridge). |

## Advanced and power-user features

**Model policy tiers** — Settings controls how permissive Ollama model fallbacks are (Tier 1 FOSS-first default through Tier 3 beta unlock). Each reply can include a short model-source disclosure. Full tier table and licensing context: [troubleshooting](docs/troubleshooting.md) and [development guide § Architecture](docs/development.md#architecture-at-a-glance).

**Input sanitization** — On by default; cleans Ask text before Ollama. Disable only via exact phrases `bonsai:disable-sanitize` / `bonsai:enable-sanitize` in the Ask field (not recommended). Magic commands also cover Guide-chord setup help and optional Steam ban lookup. Details: [troubleshooting](docs/troubleshooting.md).

**Input handling transparency** — After each Ask, the Main tab can show raw vs sanitized text and what was sent to Ollama. Optional verbose logs to `~/Desktop/bonsAI_logs/` when Filesystem writes is enabled in Permissions.

**Open bonsAI faster** — Controller Guide chord setup: [troubleshooting § Shortcut](docs/troubleshooting.md#5-bonsai-shortcut-setup).

## Self-hosted note

Prompts and responses stay on hardware you control. Models can still hallucinate — treat answers as assistant output, not authority.

## Build from source

Want to develop on your Steam Deck (Cursor + Ollama + Decky on one machine)? See **[docs/development.md](docs/development.md)** — step-by-step setup, BPM fast-test loop, and architecture diagram.

More docs: [docs/DOCUMENTATION_INDEX.md](docs/DOCUMENTATION_INDEX.md) · [CHANGELOG.md](CHANGELOG.md)

## Buy me a beer

![Donate](assets/qrcode.png)
