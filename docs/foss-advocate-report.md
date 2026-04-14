# FOSS advocate report

Roadmap proposal review for planned documentation features. Severity uses the GTA star scale (★–★★★★★★).

Finding: AI sanitizer design can reduce user agency without explicit override
File: docs/roadmap.md:planned-input-sanitizer
Severity: ★★★
Reason: A model-mediated sanitize step can silently change user intent unless the user can inspect and bypass transformed input.
Fix or alternative: Require visible before/after text plus a one-tap `Use original input` bypass; keep deterministic local cleanup as the default baseline and use model rewrite only as optional augmentation.
Cost: medium - requires UX/state design and prompt pipeline branching.

Finding: Single custom character slot limits user control over personalization
File: docs/roadmap.md:planned-character-roleplay-mode
Severity: ★★
Reason: Restricting custom roleplay entries to one row reduces user sovereignty and makes personalization brittle for offline/local-first workflows.
Fix or alternative: Support a local editable list (add/edit/remove/export/import) for custom game/character presets, stored locally in plain JSON.
Cost: low - data-shape expansion and list-management UX.

Finding: Steam Input jump concept needs explicit fallback path when deep links fail
File: docs/roadmap.md:planned-steam-input-search-jump
Severity: ★★
Reason: Deep-link behavior may depend on proprietary or unstable route surfaces; without a guaranteed fallback, user control and reliability are reduced.
Fix or alternative: Define hybrid behavior up front: exact jump when supported, nearest-page jump otherwise, and always provide manual breadcrumb guidance.
Cost: low - documentation and routing policy work; medium if runtime confidence scoring is added.
