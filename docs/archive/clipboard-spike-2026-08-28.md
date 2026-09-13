# Clipboard write spike — 2026-08-28

Spike for roadmap **A2 — Copy reply to clipboard**
([13-roadmap-feature-ideas.md](../planning/13-roadmap-feature-ideas.md) A2,
[roadmap.md:191-194](../roadmap.md)). The roadmap calls out one risk by name: *"`wl-copy` has to
survive as the Wayland selection owner, so a fire-and-forget subprocess loses the clipboard the
moment it exits. That is the whole risk and it is unverified."* This doc works out what can be
decided from the repo and from public behavior of the tools involved, and marks plainly what
cannot — this machine has no Wayland session, no `wl-copy`/`xclip` binary, and no Deck to test
against.

## What already ships: the read path

- `read_host_clipboard_text` RPC — `main.py:2266-2270` — calls
  `read_host_clipboard_text(logger)` in
  [clipboard_service.py:22-53](../../py_modules/backend/services/clipboard_service.py).
- That function runs
  [read_host_clipboard.sh](../../py_modules/backend/scripts/read_host_clipboard.sh) with
  `subprocess.run(..., capture_output=True, text=True, timeout=6)` — a **blocking, waited-for**
  call. The script tries `wl-paste -n`, then `wl-paste` (no `-n`), then `xclip -o -selection
  clipboard`, in that order, after resolving `XDG_RUNTIME_DIR` / `WAYLAND_DISPLAY` for the `deck`
  user (`read_host_clipboard.sh:8-25`).
- Frontend: [clipboardStash.ts:42-51](../../src/utils/clipboardStash.ts) tries
  `navigator.clipboard.readText()` first and falls back to the RPC above on any rejection. The
  module header states the RPC exists because *"navigator.clipboard is blocked in CEF"*
  (`clipboardStash.ts:3`). I could not find a docs/audit entry or commit message establishing that
  claim was measured on-device rather than assumed defensively — treat it as **inherited, unverified
  provenance**, not as fresh spike evidence. What it does establish: the maintainers already
  expected `navigator.clipboard` to be unreliable in this WebView and built a fallback for it, which
  is directly relevant to the write side too.
- No Python test file exists for `clipboard_service.py` today (`grep -r clipboard tests/` — zero
  hits). The read path has shipped with zero automated coverage; this spike's write path adds the
  first.

## Frontend write path: `navigator.clipboard.writeText`

**Read and write are not the same API surface**, and Chromium (which CEF embeds) treats them
differently:

- `clipboard-write` is in the [Permissions Policy "powerful features, low risk"
  bucket](https://www.w3.org/TR/permissions-policy-1/): a call made **synchronously inside a user
  gesture** (a click handler) is generally allowed without a permission prompt, on a secure context.
  It does not require the Permissions API grant that `clipboard-read` does.
- `clipboard-read` requires an explicit `clipboard-read` permission grant through Chromium's
  permission broker. An embedded CEF build with no permission-prompt UI wired up — which is the
  most likely explanation for why `readText()` needed the RPC fallback above — has no way to grant
  that prompt, so it silently rejects. Nothing in that failure mode implies `writeText()` also
  fails; it is watched by a different, more permissive policy.
- The button press itself is the user gesture, so calling `writeText()` synchronously from the
  Copy button's `onClick` satisfies the gesture requirement without any extra plumbing.

This is a reasoned inference from Chromium's documented permission model, not a Deck measurement —
marked **UNKNOWN, confirm on-device** below. It is however testable at the unit level: jsdom lets
`npm test` mock `navigator.clipboard.writeText` and assert the call happens with the right text and
that a rejection is handled without throwing past the caller.

**Fallback inside the frontend, before ever leaving JS:** `document.execCommand('copy')` via a
temporary off-screen `<textarea>` — the pre-Clipboard-API mechanism, synchronous, no permission
model at all (deprecated, but still implemented everywhere Chromium is, including old CEF forks).
This is a second free chance before the flow has to leave the WebView.

## Backend write path: `wl-copy` selection ownership

This is the part the roadmap flagged as the real risk, and it is the part this desk cannot verify:
**UNKNOWN whether `wl-copy` is present on a stock SteamOS 3.x image**, and **UNKNOWN whether a
selection it holds survives Decky's plugin backend process lifecycle** (plugin reload, `_unload`,
loader restart). Both require a Steam Deck (or a SteamOS-equivalent Wayland/gamescope session) to
answer; neither is inferable from this repo or this machine.

What *is* knowable without a device — `wl-copy`'s own documented mechanism (`wl-clipboard`
upstream), which the roadmap's phrasing ("fire-and-forget subprocess loses the clipboard the
moment it exits") describes accurately as a *general* Wayland hazard but doesn't quite match how
`wl-copy` specifically defends against it:

- `wl-copy` reads all of stdin, then **forks itself into the background** and the foreground process
  (the one a shell or `subprocess.run` is waiting on) **exits immediately** once the fork completes.
  The backgrounded child is the one that registers as the `wl_data_source` and holds the selection —
  it keeps running, detached from whatever invoked it, until another program takes the selection or
  it receives a signal.
- That means the naive-sounding call `subprocess.run(["wl-copy"], input=text, text=True,
  timeout=6)` — the exact shape `read_host_clipboard.sh` already uses for reads — is *not* the
  "fire-and-forget" failure mode by itself: `subprocess.run` waiting for the **direct child** to
  exit is fine, because `wl-copy`'s direct child is designed to return fast, after its own
  grandchild has already detached to hold the selection.
- The failure mode the roadmap is right to worry about is **process-group / cgroup teardown**:
  if Decky (or `plugin_loader`, or systemd) kills the whole process group or cgroup the plugin
  backend lives in — which is normal on a plugin reload — a detached grandchild that is still a
  *member of that cgroup* dies with it even though it is no longer a child of the Python process.
  Linux cgroup kills do not check `ppid`. Whether Decky's plugin lifecycle does anything of the kind
  is **UNKNOWN** — `main.py`'s `_unload` hook (`main.py:313`) was not audited for this spike; it is
  the next thing to check on-device or by reading Decky Loader's own process-management code.
- The defensive move available from Python, at essentially no cost, is `start_new_session=True`
  (`setsid`) on the `Popen` call that launches `wl-copy`, which puts the forked grandchild in its
  own session rather than only relying on `wl-copy`'s own double-fork. This does not fix a cgroup
  kill, but it does remove the one failure mode fully inside this repo's control: a SIGHUP or
  process-group signal sent to the Python process's group no longer reaches the detached clipboard
  holder. No existing service in this repo uses `start_new_session` today (`grep -rn
  "start_new_session\|setsid" py_modules/` — zero hits before this change) — it is new, and it is
  the correct primitive for exactly this problem, not a speculative addition.

## Decision

**Primary: frontend `navigator.clipboard.writeText()`**, with an in-browser
`document.execCommand('copy')` fallback, and the backend RPC (`wl-copy` → `xclip -selection
clipboard -i` fallback, mirroring the read script's tool order) as the **last-resort** path only
reached if both frontend mechanisms reject.

Why this order and not backend-first: the frontend path is the one this desk can actually verify —
unit tests mock `navigator.clipboard` and `document.execCommand` and assert both the copied text and
the rejection-handling — while the backend path's central risk (selection survival across process
lifecycle) is undecidable without a Wayland session. Chromium's own permission model gives write a
real chance of working where read did not, so it is not a coin flip; it is the more-likely-to-work,
more-testable option, tried first, with the harder-to-verify path kept as a safety net rather than
promoted to primary on faith.

## What is confirmed vs. what is owed on-device

**Confirmed (desk-verifiable, in this change):**
- Unit tests assert `writeClipboardText` calls `navigator.clipboard.writeText` with the exact
  visible-answer text (spoiler placeholder included/excluded per masking state), and that a
  rejection there falls through to `execCommand('copy')`, and that a rejection there falls through
  to the RPC.
- `write_host_clipboard_text` (Python) is exercised with `subprocess.run` and `subprocess.Popen`
  mocked — asserting the command tried, the `start_new_session=True` flag, and the
  success/failure `{ok, error}` shape — without ever invoking a real `wl-copy`.
- `npx tsc --noEmit`, `npm test`, `npm run test:py`, `npm run build` all pass on this tree with the
  new code in place (see the PR/commit for exact counts).

**Owed on-device (cannot be produced from this desk):**
1. Does `navigator.clipboard.writeText()` actually succeed from a QAM button press under gamescope,
   or reject the same way `readText()` apparently does? This determines whether the primary path is
   live or the feature quietly runs on the `execCommand` fallback in practice.
2. Does `wl-copy` ship on stock SteamOS 3.x (`command -v wl-copy`), and does `xclip` exist as a
   fallback under gamescope specifically (it's an X11 tool; gamescope provides an XWayland
   compatibility layer, so it's plausible but unconfirmed)?
3. Does a `wl-copy` selection started from the plugin backend survive a **QAM close**, a **plugin
   reload**, and a **paste in another app** (Konsole, a phone over the LAN via a different
   mechanism — out of scope, this just means "does the Deck's own clipboard still show the text 30
   seconds later")? This is the roadmap's named risk and the one thing this whole spike exists to
   flag as unresolved.
4. Whether Decky's `_unload` / plugin-reload path sends any signal to the backend's process group
   that a `start_new_session=True` child would not survive either (a cgroup-wide kill would defeat
   the `setsid` mitigation described above).

If (1) fails on-device, the feature still works end-to-end via `execCommand`, which is why that
fallback is implemented and tested now rather than left as a stub. If **all three** paths fail
on-device (unlikely, but the RPC's ultimate backstop), the Copy button shows its non-crashing
failure state ("Copy failed") — see `docs/testing.md` **COPY-REPLY-01/02**.
