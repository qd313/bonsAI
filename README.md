# bonsAI

bonsAI is a Decky Loader plugin for running AI help on hardware you control.

- Self-hosted first: run Ollama on your Steam Deck or a PC on your local network.
- No required cloud AI API for the core workflow.
- Built on Ollama for local/LAN model serving.
- Works best when Ollama runs on a stronger LAN PC GPU.

## Self-hosted and model transparency

- Self-hosted means your prompts and responses can stay on infrastructure you run (Deck + your LAN).
- Open source and open weight are different:
  - Open source: source code is available under an open license.
  - Open weight: model weights are available for local use.
- Most LLMs are still not "glass-box" models. Even open-weight models can be hard to interpret internally and can still hallucinate.

## Requirements

- Steam Deck with Decky Loader.
- An Ollama server reachable from the Deck:
  - Option A (recommended): a Windows/Linux PC on your LAN.
  - Option B: local on the Deck/Linux handheld (usually slower).
- At least one model pulled in Ollama.

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
.\src\setup_ollama.ps1
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

If the Deck cannot connect, see firewall and `OLLAMA_HOST` guidance in `INSTALL_STEPS_TROUBLESHOOTING.md`.

## Set up Ollama (Linux / shell)

### Quick path (repo script)

Run from repo root:

```bash
./setup-ollama.sh
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
- Screenshot/vision workflows: use a multimodal Ollama model that supports image input.

See `INSTALL_STEPS_TROUBLESHOOTING.md` for advanced tuning and vision troubleshooting details.

## Configure bonsAI to your Ollama host

- Open bonsAI Settings in Decky.
- Set the Ollama host/base URL for where your server runs.
- Typical port is `11434`.
- Test with a simple prompt.

If connection fails, start with:
- `INSTALL_STEPS_TROUBLESHOOTING.md` (network/firewall/GPU notes)

## Developer and advanced docs

- Developers: `DEVELOPMENT.md`
- Power users and troubleshooting: `INSTALL_STEPS_TROUBLESHOOTING.md`
- Release history: `CHANGELOG.md`
