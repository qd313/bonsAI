# FOSS advocate report

**Uncommitted changes** — preset chip refresh, `ask_mode` `deep`→`expert` migration, docs (2026-06-26)

Finding: Ollama setup system prompt still cites removed Settings → Connection UI
File: py_modules/backend/services/ollama_prompts.py:311
Severity: ★★
Reason: This diff adds LAN/Ollama preset chips (e.g. “How do I find Ollama on my LAN?”) and updates README/docs to the **Ollama** tab, but `OLLAMA_BONSAI_SETUP_LINE` still instructs the model to tell users **bonsAI Settings → Connection** for host URL, timeouts, and keep-alive. Those controls live on `OllamaTab.tsx` / `OllamaWhereAiRunsSection.tsx` (including **Find LAN** mDNS and named hosts). Users who tap the new chips get model guidance that misstates where self-hosted Ollama is configured and omits the shipped opt-in LAN discovery path.
Fix or alternative: In `OLLAMA_BONSAI_SETUP_LINE`, replace **Settings → Connection** with **Ollama → Where AI runs**; add a bullet for user-triggered **Find LAN** (`_ollama._tcp`, no subnet scan) and saved named hosts; keep timeout/keep-alive on the same tab.
Cost: low — one prompt-string edit in the file already touched by this change set.
