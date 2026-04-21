# Security audit report (point-in-time)

**Last reviewed:** 2026-04-21 (Phase 2 ship-week pass). **Prior review:** 2026-04-19. **Purpose:** track privacy and information-disclosure hazards in RPC, logs, and user-visible errors. Re-run after large refactors; line numbers drift.

**Legend:** **Open** = behavior still present as described. **Mitigated** = addressed in code; see note. **Partial** = reduced risk; follow-up noted.

**Phase 2 note:** Mitigations were triaged and implemented in-tree (RPC error shaping, logging redaction, Ollama HTTP handling, `body` stripping before UI-bound payloads). Optional follow-up: gate `console.error` traceback logging behind an explicit dev flag if contributors want quieter consoles.

---

**Finding:** Decky RPC errors concatenate optional Python tracebacks into user-visible strings  
**File:** [`src/index.tsx`](../src/index.tsx) (`formatDeckyRpcError`)  
**Severity:** ★★★  
**Status:** **Mitigated** — UI shows **message only**; tracebacks go to `console.error` with a fixed prefix so they are not concatenated into chat, toasts, or connection status.  
**Attack vector:** (historical) Python RPC failures could attach `traceback`; that string was shown in the UI.  
**Residual:** Anyone with DevTools open can still read `console.error` output (expected for local debugging).

---

**Finding:** INFO logs include full user question text via printf-style `%r`  
**File:** [`main.py`](../main.py) (`_execute_game_ai_request`, `ask_ollama` logging)  
**Severity:** ★★  
**Status:** **Mitigated** — INFO lines now log **`question_len`** / **`question_len`** instead of `%r` question text.  
**Attack vector:** (historical) Shared logs could leak prompts containing secrets.

---

**Finding:** Unconditional browser console logging of LAN IP, game title, and full prompt  
**File:** [`src/index.tsx`](../src/index.tsx) (Ask path)  
**Severity:** ★★  
**Status:** **Mitigated** — **Removed** the `console.log` that included PC IP, game name, and full question JSON.  
**Attack vector:** (historical) Remote debugging or console observers could capture the same data.

---

**Finding:** Ollama HTTP error responses embed the full remote response body in the returned error string  
**File:** [`backend/services/ollama_service.py`](../backend/services/ollama_service.py) (`HTTPError` path)  
**Severity:** ★★  
**Status:** **Mitigated** — User-facing `response` is a **short** HTTP code + model message; full body length is logged at **WARNING** without logging full body content by default. Raw `body` remains **only** on the in-memory `result` dict inside `ask_ollama` for model-not-found detection and is **stripped** (`body` key popped) before merging into payloads returned to callers / transparency.  
**Attack vector:** (historical) Verbose server bodies could appear in the chat UI.

---

**Finding:** Raw Python exception text returned in multiple RPC JSON payloads  
**File:** [`main.py`](../main.py) (`test_ollama_connection`, `list_recent_screenshots`, `_execute_game_ai_request` failure path, `ask_ollama` outer except); [`backend/services/desktop_note_service.py`](../backend/services/desktop_note_service.py) (`append_*_sync` helpers)  
**Severity:** ★★  
**Status:** **Mitigated** — Same RPC paths as 2026-04-21 Phase 2. **Desktop notes:** `OSError` from filesystem writes no longer surfaces `str(exc)` to the UI; [`desktop_note_service.py`](../backend/services/desktop_note_service.py) returns a fixed **`DESKTOP_NOTE_WRITE_OS_ERROR_MESSAGE`**, logs detail with **`logger.warning(..., exc_info=True)`**, and still returns **`str(exc)`** only for intentional **`ValueError`** validation (e.g. missing question text). [`main.py`](../main.py) continues to pass through the `error` string from the sync helper result.

---

**Finding:** INFO logs include first 200 characters of model reply text  
**File:** [`backend/services/ollama_service.py`](../backend/services/ollama_service.py) (success path logging)  
**Severity:** ★  
**Status:** **Mitigated** — success path logs **model name and `response_len` only** (no content prefix).

---

## Revision log

| Date | Summary |
|------|---------|
| 2026-04-19 | Initial report (five findings, all open). |
| 2026-04-21 | Phase 2: mitigations landed as above; partial remaining on desktop-note `error` passthrough. |
| 2026-04-21 | Desktop note `OSError` responses sanitized in `desktop_note_service.py`; `ValueError` validation text unchanged. |
