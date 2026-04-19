# bonsAI

bonsAI is a Decky Loader plugin for running a **self-hosted** AI chat using Ollama

- Self-hosted first: run Ollama on your Steam Deck or a PC on your local network
- No required cloud AI API for the core workflow
- Built on Ollama for local/LAN model serving
- Works best when Ollama runs on a stronger PC GPU

## Self-hosted and model transparency

- Self-hosted means your prompts and responses can stay on infrastructure you run (Deck + your LAN)
- Open source and open weight are different:
  - Open source: source code is available under an open license
  - Open weight: model weights are available for local use
- Most LLMs are still not "glass-box" models. Even open-weight models can be hard to interpret internally and can still hallucinate

## Requirements

- Steam Deck with Decky Loader (Targeting compatibility with any SteamOS PC)
- An Ollama server reachable from the Deck:
  - Option A (recommended): a Windows/Linux PC on your LAN
  - Option B: local on the Deck/Linux handheld (usually slower)
- At least one model pulled in Ollama (ideally multiple)

## Input sanitization

bonsAI runs a **deterministic input sanitization lane** on Ask text before it is sent to Ollama (NUL/control cleanup, length limits, and conservative empty-or-junk blocking). **Sanitization is on by default** for every install. There is **no Settings-tab toggle** for this feature and it's not recommended to disable it. To disable the sanitizer you use **exact magic phrases** in the Ask field (trimmed, case-insensitive, whole message only):

- `bonsai:disable-sanitize` — turns the lane **off** for future asks and persists that choice in the plugin `settings.json` key `input_sanitizer_user_disabled` (JSON `true`).
- `bonsai:enable-sanitize` — turns the lane **back on** and clears that flag.

Those control messages **do not call Ollama**; the plugin saves settings and shows a short confirmation in the normal response area.

**Security note:** Settings live on the device. Anyone who can open bonsAI (for example via QAM while the Deck is unlocked) could send the disable phrase or edit `settings.json`. Treat the Deck like any other local console for sensitive prompts.

More detail: [docs/troubleshooting.md](docs/troubleshooting.md) (sanitizer FAQ), [docs/prompt-testing.md](docs/prompt-testing.md) (how to test without skewing model benchmarks).

### Input handling transparency

After each Ask finishes (including blocked input), the **main** tab can show **Input handling (last Ask)** with raw text, post-sanitizer text, the system and user strings sent to Ollama, model id, and responses. Use **Run original in Ask** to paste the raw prompt back into the Ask field.

Optional **Verbose Ask logging to Desktop notes** (Settings → Desktop notes) appends the same detail to `~/Desktop/BonsAI_notes/bonsai-ask-trace-YYYY-MM-DD.md` when **Filesystem writes** is enabled. That file can contain long prompts; disable the toggle or delete the file if you need to reclaim space.

## Quick install flow

1. Install Decky Loader.
2. Install bonsAI.
3. Set up Ollama (below).
4. In bonsAI Settings, point host/base URL to your Ollama server.
5. Send a test prompt.

## Set up Ollama (Windows PowerShell)

### Quick path (repo script)

Run from repo root:

```powershell
.\scripts\setup_ollama.ps1
```

### Manual one-click commands

```powershell
$installerPath = "$env:TEMP\OllamaSetup.exe"
Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile $installerPath
Start-Process -FilePath $installerPath -Wait
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
ollama pull llama3
ollama run llama3 "Hello from bonsAI"
```

If the Deck cannot connect, see firewall and `OLLAMA_HOST` guidance in [docs/troubleshooting.md](docs/troubleshooting.md).

## Set up Ollama (Linux / shell)

### Quick path (repo script)

Run from repo root:

```bash
./scripts/setup-ollama.sh
```

### Manual one-click commands

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3
ollama pull gemma4
ollama run llama3 "Hello from bonsAI"
```

## Recommended models

- General prompts: `llama3`
- Alternate local text model: `gemma4`
- [ ] Screenshot/vision workflows: use a multimodal Ollama model that supports image input ## This part needs to actually recommend a FOSS model that handles screenshots and vision better. Let's pick a favorite and target it.

See [docs/troubleshooting.md](docs/troubleshooting.md) for advanced tuning and vision troubleshooting details.

## Configure bonsAI to your Ollama host

- Open bonsAI Settings in Decky.
- Set the Ollama host/base URL for where your server runs.
- Typical port is `11434`.
- Test with a simple prompt.

If connection fails, start with:
- [docs/troubleshooting.md](docs/troubleshooting.md) (network/firewall/GPU notes)

## Developer and advanced docs

- Developers: [docs/development.md](docs/development.md)
- Power users and troubleshooting: [docs/troubleshooting.md](docs/troubleshooting.md)
- Roadmap and future planning: [docs/roadmap.md](docs/roadmap.md)
- Prompt testing tracker: [docs/prompt-testing.md](docs/prompt-testing.md)
- Release history: [CHANGELOG.md](CHANGELOG.md)
