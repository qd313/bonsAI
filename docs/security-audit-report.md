# Security audit report

**Last reviewed:** 2026-04-30 (full pass). **Purpose:** confirmed privacy and information-disclosure hazards in RPC responses, logs, browser consoles, and sensitive-action gates—not hypothetical CVE-style speculation.

**Legend:** **Open** = behavior present and actionable. **Mitigated** = verified safe behavior or fixed in tree. **Partial** = reduced risk; optional hardening noted.

**Regression verification:** `pnpm test` — pass (64 tests). `python scripts/run_python_tests.py` — pass (134 tests). Ran after edits in this pass.

---

## Open findings

No confirmed open findings after this review and the mitigation below.

---

## Mitigated (verified 2026-04-30)

Finding: Background asyncio task failure surfaced raw `str(exc)` in RPC/UI state  
File: main.py:1333  
Severity: ★★  
Attack vector: Any bug causing `_run_background_game_ai` to raise would expose exception text (paths, library internals) in `get_background_game_ai_status` payloads consumed by the Main tab.  
Specific fix: Use a fixed `_BACKGROUND_TASK_FAILED_USER_MESSAGE` for `response`/`error`; retain detail via `logger.exception` only (`main.py` `_BACKGROUND_TASK_FAILED_USER_MESSAGE`, ~112).  
Status: **Mitigated** (2026-04-30).

Finding: Decky RPC errors could concatenate Python tracebacks into user-visible strings  
File: src/utils/deckyCall.ts:29  
Severity: ★★★  
Attack vector: Decky error objects carrying `traceback` would surface full stacks in chat/toasts if appended to the UI message.  
Specific fix: `formatDeckyRpcError` returns `message`/`error` string only; logs traceback via `console.error` with a fixed prefix.  
Status: **Mitigated**.

Finding: INFO logs included full user question text  
File: main.py:1047; py_modules/backend/services/game_ai_request.py:55  
Severity: ★★  
Attack vector: Shared journald/plugin logs could retain secrets typed into Ask.  
Specific fix: Log `question_len` and types; avoid `%r` on question bodies.  
Status: **Mitigated**.

Finding: Unconditional browser logging of LAN IP, game title, and full Ask payload  
File: src/index.tsx (Ask path)  
Severity: ★★  
Attack vector: Anyone with DevTools could read prompts and addressing metadata.  
Specific fix: Removed sensitive `console.log` usage (no `console.log` in `src/` as of this pass).  
Status: **Mitigated**.

Finding: Ollama HTTP error bodies echoed into chat responses  
File: py_modules/backend/services/ollama_service.py:496  
Severity: ★★  
Attack vector: Verbose upstream JSON/errors could fill the chat UI.  
Specific fix: User-facing `response` is a short HTTP code + guidance string; `body` kept only on the internal dict for model detection and stripped before client merge (`main.py` `out.pop("body", None)` near ask path).  
Status: **Mitigated**.

Finding: Raw Python exception strings in RPC JSON for common failure paths  
File: main.py; py_modules/backend/services/desktop_note_service.py:25  
Severity: ★★  
Attack vector: RPC consumers could display filesystem paths or stack fragments from `str(exc)`.  
Specific fix: Desktop note writes map `OSError` to `DESKTOP_NOTE_WRITE_OS_ERROR_MESSAGE`; other RPC paths use curated strings where previously triaged.  
Status: **Mitigated**.

Finding: INFO logs included a prefix of model reply text  
File: py_modules/backend/services/ollama_service.py:482  
Severity: ★  
Attack vector: Log leakage of assistant content.  
Specific fix: Success path logs `model` and `response_len` only.  
Status: **Mitigated**.

Finding: Sensitive plugin actions without capability checks  
File: main.py; py_modules/backend/services/capabilities.py  
Severity: ★★★  
Attack vector: Filesystem writes, media enumeration, hardware/TDP apply, Steam Web API outbound calls without explicit permission toggles.  
Specific fix: `capability_enabled(settings, ...)` enforced before desktop notes, screenshots listing, TDP apply, VAC HTTP (`steam_web_api`), etc.  
Status: **Mitigated** (re-verified gates present).

---

## Partial / residual

Finding: RPC success payloads may include absolute Desktop note paths  
File: main.py:839  
Severity: ★  
Attack vector: With `filesystem_write` enabled, successful `append_desktop_*` RPCs return a full `path` (may include home directory/username). Local attacker or companion plugin with RPC access could observe layout.  
Specific fix (optional): Return basename or a path relative to `~/Desktop/BonsAI_notes` only; omit `path` when UI does not need it.

Finding: Python tracebacks still reachable in the browser console  
File: src/utils/deckyCall.ts:31  
Severity: ★  
Attack vector: Developer tooling / attached debugger sees `console.error(..., traceback)`. Expected for local debugging.  
Specific fix (optional): Gate verbose traceback logging behind an explicit dev flag.

Finding: Steam Web API key sent as HTTPS query parameter  
File: py_modules/backend/services/steam_vac_service.py:95  
Severity: ★  
Attack vector: Valve’s API shape places the key in the URL; corporate HTTPS proxies that log URLs could retain key material (infrastructure-dependent).  
Specific fix: Document operational risk; rely on user Permissions toggle + key hygiene; no alternative HTTP shape documented by Valve for `GetPlayerBans`.

---

## Revision log

| Date       | Summary                                                                 |
| ---------- | ----------------------------------------------------------------------- |
| 2026-04-30 | Full pass; refreshed mitigations; fixed background-task exception leak. |
| 2026-04-21 | Phase 2 triage (prior snapshot superseded by this document).            |
| 2026-04-19 | Initial documented findings (prior snapshot superseded).                  |
