# FOSS advocate report

Point-in-time review (whole codebase): transparency for contributors, dependency openness, and user-visible policy honesty.

Finding: npm/GitHub metadata still points at the Decky plugin template
File: package.json:16
Severity: ★★
Reason: `repository.url`, `bugs.url`, and `homepage` identify `SteamDeckHomebrew/decky-plugin-template`, while the shipped README and in-app links describe `cantcurecancer/bonsAI`. That mismatched canonical metadata obscures the real upstream for forks, issues, and license attribution—hurting community maintainability and reproducibility of where source-of-truth lives.
Fix or alternative: Replace `repository`, `bugs`, and `homepage` with the actual `cantcurecancer/bonsAI` URLs (matching README); align `keywords`/`description` if desired for npm/package clarity.
Cost: low — metadata-only edit; verify release workflows still resolve repo URLs correctly.

Finding: package author remains template placeholder text
File: package.json:27
Severity: ★
Reason: `"author": "You <you@you.tld>"` signals an unpublished scaffold package rather than the maintained plugin; contributors cannot rely on npm-level provenance without cross-checking README.
Fix or alternative: Set `author` (and optionally `contributors`) to the maintainer identity already implied by `plugin.json` / README, or use a neutral `"bonsAI contributors"` form plus repo URL.
Cost: low — one-line metadata.

Finding: Model policy tier identifiers and user-facing copy live in both Python and TypeScript without machine-checked parity
File: py_modules/backend/services/model_policy.py:15 (tier constants); src/data/modelPolicy.ts:20 (tier ids / labels)
Severity: ★★
Reason: Openness commitments shown in Settings depend on TS strings staying aligned with backend tier reconciliation and README anchors. Parallel definitions raise drift risk: UI could describe tiers differently from server-enforced routing, weakening transparency for users choosing FOSS-first defaults.
Fix or alternative: Single source of truth (e.g. JSON or YAML checked into repo) consumed by a small codegen step for TS + Python; or add a parity test (like character catalog tests) that asserts tier id sets and label hashes match.
Cost: medium — small schema + thin loaders, or one parity test plus manual discipline.
