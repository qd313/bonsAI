# FOSS advocate report

Full-codebase review per [.cursor/agents/foss-advocate.md](../.cursor/agents/foss-advocate.md). Severity uses the GTA star scale (★–★★★★★★).

Finding: npm metadata still references the Decky template and placeholder author
File: package.json:13-28
Severity: ★★
Reason: `repository`, `bugs`, `homepage`, and `author` still describe `decky-plugin-template` and `You <you@you.tld>`, while the UI uses `https://github.com/cantcurecancer/bonsAI` (`src/index.tsx`:323-324). That mismatch hides the real source-of-truth for contributors, forks, and automated tools that read `package.json`.
Fix or alternative: Point `repository`, `bugs`, and `homepage` at the actual bonsAI GitHub repo; set `author` to the real maintainer or org.
Cost: low — edit metadata only.

Finding: LICENSE copyright is still a placeholder
File: LICENSE:3-4
Severity: ★
Reason: The text uses “Hypothetical Plugin Developer”, which does not identify who grants the BSD-3-Clause terms. That weakens clarity for redistribution and attribution (a core FOSS hygiene concern).
Fix or alternative: Replace with the real copyright holder(s) consistent with `plugin.json` and intended ownership.
Cost: low — legal/name decision, one file.

Finding: Full user prompts are written to the browser console on every ask
File: src/index.tsx:905
Severity: ★★★
Reason: `console.log` includes the full `question` (and game context) with no opt-in, setting, or in-UI notice. That reduces user control over where prompt text ends up (logs, remote debugging, support captures) and works against local-first / self-hosted expectations.
Fix or alternative: Remove the log, or guard it behind an explicit “Debug logging” toggle persisted in settings (default off).
Cost: low for removal; medium if you add a setting and wire it through.

Finding: Full user prompts are logged at INFO on the backend (two call paths)
File: main.py:785-787, main.py:1064-1067
Severity: ★★★
Reason: `_execute_game_ai_request` and `ask_ollama` log `%r` / full question text, so prompts are stored in Decky’s logging pipeline at INFO by default, without documented rationale or user-visible control—same sovereignty concern as client logging, on the server side.
Fix or alternative: Log only length/hash, or move full text to DEBUG behind an env flag; document the trade-off in a comment at the log site.
Cost: medium — must preserve enough signal for support without full prompt retention.

Finding: About tab does not link to the upstream Ollama project
File: src/components/AboutTab.tsx:14-67
Severity: ★★
Reason: Users get bonsAI’s GitHub and issues links, but no link to the inference runtime’s home or source (e.g. Ollama’s project). That undercuts stack transparency called out in the roadmap (`docs/roadmap.md` ~70-75).
Fix or alternative: Add a “Built on Ollama” (or similar) control that opens the official Ollama OSS project or docs, matching the pattern used for GitHub.
Cost: low — UI string + one URL constant.

Finding: Hardcoded Ollama model fallback lists lack rationale in code
File: refactor_helpers.py:9-18
Severity: ★
Reason: `TEXT_MODELS_TO_TRY` and `VISION_MODELS_TO_TRY` order affects which open-weight models run first, but there is no comment on ordering goals (speed, availability, license) or why alternatives were not chosen—hurts forks and community maintenance.
Fix or alternative: Add a short comment block above these lists (ordering policy, compatibility with stock Ollama pulls, optional note on vision vs text).
Cost: low.
