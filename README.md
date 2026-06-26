# bonsAI

**bonsAI** is a [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) plugin that runs a **self-hosted** AI chat on your Steam Deck. It talks to **Ollama** on your Deck or another machine on your home network. No paid cloud AI API is required for the main workflow.

<img width="385" height="568" alt="DeckCapture_20260428_002601" src="https://github.com/user-attachments/assets/a7e7223e-877b-43ac-a6bc-87199551e95a" />

## Quick start

1. Install **[Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader)** on your Steam Deck.
2. Install **bonsAI** from **[GitHub Releases](https://github.com/cantcurecancer/bonsAI/releases)** — open **Decky** from QAM → install from local ZIP.
3. Install **[Ollama](https://ollama.com/download)** on the machine that will run models, then pull the Deck essentials model: `ollama pull qwen2.5vl:3b` (one FOSS model for chat and screenshots). Optional Tier 2: `ollama pull gemma4:e2b-it-qat`.
4. Open **bonsAI** → **Ollama** → set **Where AI runs** to `http://127.0.0.1:11434` (same device) or `http://<PC-IP>:11434` (PC on your LAN) → **Main** → send a test message.

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

## What bonsAI does (shipped today)

- **Ask (chat)** — Prompts go through the Python backend to Ollama; replies render as markdown-style chunks in collapsible turn rows.
- **Ask modes: Speed, Strategy, Expert** — Different model fallback chains; Strategy adds gameplay-coaching prompts and spoiler controls.
- **Game context** — Active game included when available.
- **Presets** — Reusable prompt chips and a unified ask bar.
- **Screenshot attachments** — Vision asks with a Steam screenshot (attach icon on the Ask bar); needs a vision model and **Permissions → Media library access**. See [troubleshooting](docs/troubleshooting.md#25-screenshot-vision-setup-v1).
- **Voice input** — Local speech-to-text into the Ask field (mic button); requires **Permissions → Voice input** and a whisper.cpp model in **Settings → Voice input**.
- **TDP / power** — With **Permissions → Hardware control**, suggested TDP changes can be applied on the Deck; QAM Performance guidance after apply.
- **AI character (roleplay)** — Optional tone via the in-app picker; accent intensity in Settings.
- **Ollama tab** — Where AI runs, connection test, **Find LAN** (mDNS), saved LAN hosts, model pulls, and model-policy tiers.
- **Permissions** — User-controlled gates for filesystem writes, hardware, media/screenshots, Steam Web API (VAC check), and external links.
- **Background Ask** — Requests can finish while QAM is closed and restore on reopen.
- **Reply actions** — **Retry same prompt**, thumbs feedback, and optional input-transparency details per turn.
- **Magic Ask commands** — `bonsai:disable-sanitize` / `bonsai:enable-sanitize`, shortcut setup, and optional `bonsai:vac-check` (no Ollama required).

**Tabs:** **Main**, **Ollama**, **Settings**, **Permissions**, **About**, and optional **Developer** (Settings → **Show Developer tab** — advanced logging, token streaming experiment, Steam Input jump).

## What's planned

Backlog and in-progress work (RAG, couch 10-foot UI, native QAM tile, strategy checklists, and more) live in **[docs/roadmap.md](docs/roadmap.md)**. Shipped feature detail and QA cross-links: [archive/roadmap-completed.md](docs/archive/roadmap-completed.md).

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

More docs: [development.md](docs/development.md) · [testing.md](docs/testing.md) · [roadmap.md](docs/roadmap.md) · [CHANGELOG.md](CHANGELOG.md)

## Documentation

| Doc | Audience | What it is |
|-----|----------|------------|
| [troubleshooting.md](docs/troubleshooting.md) | Power users | GPU, network, vision, permissions, QAM, deploy edge cases |
| [development.md](docs/development.md) | Contributors | Deck-first setup, build/deploy, architecture, change-risk hotspots |
| [testing.md](docs/testing.md) | QA / contributors | PR gates, Deck QA runbook, shipped-feature coverage, Test Results |
| [roadmap.md](docs/roadmap.md) | Planning | In progress, planned backlog, completed summary |
| [security-audit-report.md](docs/security-audit-report.md) | Maintainers | RPC/log/UI disclosure review |
| [foss-advocate-report.md](docs/foss-advocate-report.md) | Maintainers | FOSS/transparency review |
| [archive/](docs/archive/) | — | Historical research, plans, and completed-feature detail |

## Buy me a beer

![Donate](assets/qrcode.png)
