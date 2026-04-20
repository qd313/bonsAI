# Security audit report (point-in-time)

**Reviewed:** 2026-04-19 against the then-current tree. **Purpose:** track privacy and information-disclosure hazards in RPC, logs, and user-visible errors. Re-run this review after large refactors; line numbers drift.

**Legend:** **Open** = behavior still present as described. **Mitigated** = addressed in code; see note.

---

**Finding:** Decky RPC errors concatenate optional Python tracebacks into user-visible strings  
**File:** [`src/index.tsx`](../src/index.tsx) (`formatDeckyRpcError`, ~276–286)  
**Severity:** ★★★  
**Status:** **Open** — `traceback` is still appended to the message returned to the UI when present.  
**Attack vector:** Python-side RPC failures may attach a `traceback` field; that string is shown in chat, connection status, media errors, and toasts.  
**Specific fix:** Return only a stable `message` in default builds; gate full tracebacks behind an explicit debug flag.

---

**Finding:** INFO logs include full user question text via printf-style `%r`  
**File:** [`main.py`](../main.py) (~926–927 `_execute_game_ai_request`, ~1528–1529 `ask_ollama`)  
**Severity:** ★★  
**Status:** **Open** — logging still includes `question=%r` / `user_message=%r` style reprs of user content at INFO.  
**Attack vector:** Shared logs or aggregated logging can leak prompts containing secrets.  
**Specific fix:** Log lengths/hashes at INFO; verbatim strings only at DEBUG behind opt-in.

---

**Finding:** Unconditional browser console logging of LAN IP, game title, and full prompt  
**File:** [`src/index.tsx`](../src/index.tsx) (~1317)  
**Severity:** ★★  
**Status:** **Open** — `console.log` still includes `pc` IP, game name, and full question JSON.  
**Attack vector:** Remote debugging or console observers can capture the same data.  
**Specific fix:** Remove or guard behind a debug flag defaulting off.

---

**Finding:** Ollama HTTP error responses embed the full remote response body in the returned error string  
**File:** [`backend/services/ollama_service.py`](../backend/services/ollama_service.py) (~292–296)  
**Severity:** ★★  
**Status:** **Open** — `HTTPError` path still interpolates full decoded `body` into the `response` string returned to callers.  
**Attack vector:** Verbose server bodies may expose paths or implementation details in the chat UI.  
**Specific fix:** User-facing text = short status + HTTP code; log full body only server-side.

---

**Finding:** Raw Python exception text returned in multiple RPC JSON payloads  
**File:** [`main.py`](../main.py) (e.g. ~488 `test_ollama_connection`, ~680 `list_recent_screenshots`, ~1144, ~1406, ~1580)  
**Severity:** ★★  
**Status:** **Open** — multiple paths still surface `str(e)` / `str(exc)` / f-strings with exceptions to the frontend.  
**Attack vector:** Exception strings can include library details or paths.  
**Specific fix:** Map to stable, user-safe messages; use `logger.exception` on the server for detail.

---

**Finding:** INFO logs include first 200 characters of model reply text  
**File:** [`backend/services/ollama_service.py`](../backend/services/ollama_service.py) (~282–283)  
**Severity:** ★  
**Status:** **Open** — successful responses still log `first_200=%r` from model output at INFO.  
**Attack vector:** Model output can echo or infer sensitive user content.  
**Specific fix:** Log `len(text)` or a hash at INFO; omit content prefixes unless debug.
