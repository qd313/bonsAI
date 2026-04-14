Finding: Decky RPC errors concatenate optional Python tracebacks into user-visible strings
File: src/index.tsx:205
Severity: ★★★
Attack vector: When a Python-side RPC failure surfaces through `call()`, Decky may attach a `traceback` field on the error object. `formatDeckyRpcError` appends that traceback to the message. Those strings are shown in the main chat area, connection test status, and media error state (e.g. `setOllamaResponse`, `setConnectionStatus`, `setMediaError`), exposing stack frames and filesystem paths to anyone who can read the plugin UI.
Specific fix: Strip or gate tracebacks: return only `e.message` (and optionally a stable error code) in release builds; if diagnostics are needed, show traceback only when a dedicated debug flag is enabled and never merge raw `traceback` into default user-facing strings.

Finding: INFO logs include full user question text via printf-style `%r`
File: main.py:785
Severity: ★★
Attack vector: `_execute_game_ai_request` logs the full `question` string with `%r`, and `ask_ollama` does the same at `main.py:1064` for `user_message`. Log aggregation or shared devices can leak prompts that contain passwords, recovery codes, or other sensitive text.
Specific fix: Log only non-sensitive metadata (e.g. character length, a short hash prefix, attachment count) at INFO; move any verbatim content to DEBUG behind an explicit opt-in, or omit entirely.

Finding: Unconditional browser console logging of LAN IP, game title, and full prompt
File: src/index.tsx:905
Severity: ★★
Attack vector: `onAskOllama` logs `pc` IP, game name, and the full question with `JSON.stringify` to the Chromium console. Anyone with access to remote debugging or another process reading console output can capture the same data.
Specific fix: Remove the log line in production builds, or guard it behind a compile-time or runtime debug flag defaulting to off.

Finding: Ollama HTTP error responses embed the full remote response body in the returned error string
File: backend/services/ollama_service.py:186
Severity: ★★
Attack vector: On `urllib.error.HTTPError`, the handler decodes the entire body and interpolates it into `response` returned to the plugin caller, which becomes user-visible model error text. A misconfigured or verbose Ollama server can return internal paths or implementation details in that body.
Specific fix: For user-facing text, return a short generic message plus HTTP status (e.g. "Ollama returned HTTP {code}"); log the full body only through the logger at WARNING/ERROR on the backend.

Finding: Raw Python exception text returned in multiple RPC JSON payloads
File: main.py:831
Severity: ★★
Attack vector: The same pattern appears at `main.py:968`–`969`, `main.py:1112`, `main.py:444`, and `main.py:629`: exception objects are converted with `str(e)` or `str(exc)` into `response`, `error`, or connection `error` fields. Those strings can include paths or library-specific details and are returned to the frontend like normal RPC data.
Specific fix: Map exceptions to stable, user-safe messages (e.g. "Request failed"); log full exceptions with `logger.exception` on the server only. For `test_ollama_connection` and `list_recent_screenshots`, return a fixed category string plus optional numeric code instead of `str(e)`.

Finding: INFO logs include first 200 characters of model reply text
File: backend/services/ollama_service.py:175
Severity: ★
Attack vector: After a successful Ollama call, the service logs `text[:200]` as part of operational logging. Model output can repeat or infer sensitive user content from the prompt.
Specific fix: Log only `len(text)` or a hash at INFO; omit content prefixes unless debug logging is explicitly enabled.
