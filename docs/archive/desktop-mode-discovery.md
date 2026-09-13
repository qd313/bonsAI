# Desktop mode discovery

Recon and provisional decisions from a brainstorming session on 2026-08-06/07:
**what would it take to make bonsAI available in Desktop mode on Deck/SteamOS?**

Nothing here is implemented. Decisions marked *provisional* are the maintainer's
calls from the session but have not been through
[maintainer-decisions-locked.md](maintainer-decisions-locked.md) — see
[Needs a D-number](#needs-a-d-number).

---

## The shape of the answer

The backend already runs in Desktop mode. The **UI** is the whole problem.

- Decky injects into Steam's **gamepadui** layer; the classic Desktop Steam
  window loads neither QAM nor Decky ([development.md:130](../development.md:130)).
- The Python side is nearly Decky-free: only 2 of 43 service modules import
  `decky` (`game_ai_request.py`, `ollama_ask_service.py`).
- 51 `src/` files import `@decky/ui`. Those are re-exports of Steam's own SP
  React components and exist only inside SharedJSContext, so a browser cannot
  import them.

**Target:** a localhost web UI served by the plugin, opened in a browser in
Desktop mode. Optionally reachable over LAN later. A native KDE app is
"extra credit", not scope.

---

## Lifecycle — corrected

An earlier claim in-session that "Decky reloads plugins on Steam restart, so
`_unload` runs every time" was **wrong**, and it distorted the hosting decision.

The plugin's Python lives in **`plugin_loader.service`**, a systemd unit
restarted independently of Steam ([development.md:167](../development.md:167),
[build.ps1:104](../../scripts/build.ps1:104)). A Steam restart reloads the
*frontend bundle* ([development.md:136](../development.md:136)), not the Python.
Some installs run the loader as a user unit ([development.md:171](../development.md:171)).

Consequences:

- An `aiohttp` server started in `_main` ([main.py:308](../../main.py:308))
  lives as long as `plugin_loader` does — **not** as long as a Steam session.
- There is **no bootstrap problem** for v1: the server runs whether or not Steam
  is running.
- `_unload` ([main.py:313](../../main.py:313)) still runs on Decky **Reload**,
  so the server must handle rebinding cleanly. Mostly a dev-loop concern.

**Recommended v1 shape:** bind loopback unconditionally at startup; check the
enable-setting **per request**. A desktop script that edits `settings.json` then
takes effect immediately, with no file watcher and no second writer to settings.

UNKNOWN: whether `_unload` is reliably awaited before a rebind on Decky Reload.

---

## Provisional decisions

| Question | Call | Notes |
|---|---|---|
| Surface | Localhost web UI | BPM-frictionless is an optional side path; native KDE app is extra credit |
| Audience | Shipped to users | Not a dev-only tool |
| Exposure | Off by default, opt-in per mode | Long-term: LAN with pairing |
| Visual parity | Normal web app | No `@decky/ui` shim; own CSS |
| Logic sharing | **Extract a headless core first** | See [Extraction scope](#extraction-scope) |
| Game context | **None — general mode** | `Router.MainRunningApp` is null in Desktop mode; not replaced |
| Parity | Parity **minus game context** | Screenshots, strategy checklist, running-game state stay QAM-only |
| Voice | QAM-only for v1 | Revisit; mic is on the wrong machine for LAN clients |
| Steam nav actions | Suppress at generation time | Prompts become surface-aware |
| Surface detection | Backend infers from transport | HTTP ⇒ web; Decky RPC ⇒ QAM. No new RPC args |
| Auth | Capabilities as-is **+ method allowlist** | Allowlist is code, not user-facing settings |
| Permissions on web | Full control | Owner's device. Accepted tradeoff: a leaked token escalates past chat |
| Discovery | QR / link in About tab **and** desktop launcher | Launcher must discover a bonsAI host on LAN — not necessarily the same machine |
| Hardware | Deck desktop, Bazzite PC, other handhelds, LAN clients | |
| v1 host | **Decky-hosted; extract later** | See [Hosting](#hosting) |
| Service down | Plugin starts it on demand | Post-extraction only. Has a known-fragile dependency — see [Privilege wrinkle](#privilege-wrinkle) |
| Install (post-extraction) | Plugin installs it **and** a standalone script | Two audiences, two paths |
| Migration | None — new paths, fresh start | Maintainer reaffirmed after pushback |
| Streaming | Poll for v1, **client designed for both** | Swap to SSE at extraction touches one module |
| Testing | Test the transport; smoke the rest | |
| KB expansion | After v1 | Bazzite / Desktop / Linux topics |
| Repo layout | Leaning `packages/bonsai-web/` | Deferred |
| Concurrency | Deferred, leaning shared-data / independent sessions | Must decide before v1 — see [Concurrency](#concurrency) |

---

## Extraction scope

Smaller than the raw `@decky/ui` count suggests. Across all non-component files
there are only **five distinct symbols**:

| Symbol | Files | Web meaning |
|---|---|---|
| `Router.MainRunningApp` | [useBonsaiAskOrchestration:206,291,292,439,570,801](../../src/hooks/useBonsaiAskOrchestration.ts:206), [useStrategyChecklistSession:9](../../src/hooks/useStrategyChecklistSession.ts:9), [useScreenshotBrowser:10](../../src/hooks/useScreenshotBrowser.ts:10), [steamInputJump:8](../../src/utils/steamInputJump.ts:8) | `null` — the correct answer under general mode |
| `toaster.toast` (`@decky/api`) | many | Own toast. Direct port |
| `showModal` / `ConfirmModal` | 5 files — the `use*Modal` hooks, [useDisclaimerAndLocalRuntimeGates:9](../../src/hooks/useDisclaimerAndLocalRuntimeGates.tsx:9) | Own modal host. 5 call sites clears the 3+ bar in [CLAUDE.md](../../CLAUDE.md) |
| `Navigation` / `QuickAccessTab` | [bonsaiReplySurface:8](../../src/utils/bonsaiReplySurface.ts:8), [useSteamSettingsSearch:10](../../src/hooks/useSteamSettingsSearch.ts:10), [steamSettingsNavigation:8](../../src/data/steamSettingsNavigation.ts:8), steamInputJump | **No meaning.** Cannot jump to a QAM tab from a browser |
| `Focusable` | the 3 `build*Element.tsx` files | Components misfiled under `utils/`. Move, don't port |

**For v1 (Ask only) the entanglement is two ports in one file.**
`useBonsaiAskOrchestration` touches Steam for exactly `Router.MainRunningApp`
(6 sites) and `toaster.toast` (10 sites). Nothing else.

### The reply builders split cleanly

[buildAnswerBubbleElement.tsx](../../src/utils/buildAnswerBubbleElement.tsx) is
~55 lines of Steam-specific outer wrapper over an already-pure content pipeline:
`stripAssistantDisplayTags`, `unwrapAskedEntitySpoilerFences`,
`prepareStreamMarkdown`, `splitResponseIntoChunks`. The web renderer reuses that
pipeline and swaps `<Focusable>` for `<div>`.

**Do not remove `Focusable` from the QAM path.** It carries chunk-by-chunk D-pad
scrolling, spoiler-fence diversion, and yielding to the parent turn-slot
([:147-172](../../src/utils/buildAnswerBubbleElement.tsx:147)). The comments
record two shipped attempts that failed on device
([:51-54](../../src/utils/buildAnswerBubbleElement.tsx:51)) and a regression
where focus "escaped to Save chat on Deck"
([:157](../../src/utils/buildAnswerBubbleElement.tsx:157)). Removing it stops
long answers scrolling with a d-pad.

---

## RPC surface risk

Reassuring: **no `shell=True`, no `os.system`, no `eval`** anywhere in
`py_modules/`. Every subprocess call is argv-list form. There is no
command-injection primitive.

The `data: Any` / `payload: Any` signatures are **not** raw passthrough — the
bodies extract specific keys and validate. The problem is that validation is
ad-hoc per method, so it is **unauditable**, not unsafe: coverage cannot be
proven systematically and no typed client can be generated from it.

### Needs a gate

| Method | Existing gate | Verdict |
|---|---|---|
| `read_host_clipboard_text` [:1976](../../main.py:1976) | **None** — no capability check, no settings check | Highest severity. Reads whatever was last copied. Queued as its own fix, independent of Desktop mode |
| `install_rag_corpus_local` [:1380](../../main.py:1380) | `show_developer_tab` only. Install dir sanitized [:1398](../../main.py:1398); **`source_dir` is not** [:1387-1390](../../main.py:1387) | Arbitrary-directory read + file copy. Dev-gated, so narrow |
| `test_ollama_connection` [:943](../../main.py:943), `ask_game_ai` / `start_background_game_ai` `PcIp` | UNKNOWN — bodies not read | Open SSRF question. Caller-supplied host ⇒ possible LAN pivot |

### Already gated — no phase needed

`take_steam_screenshot` (capability [:1988](../../main.py:1988)),
`append_desktop_debug_note` (`filesystem_write` [:1750](../../main.py:1750)),
`start_local_ollama_setup` (settings gate + enum profile [:1137](../../main.py:1137)),
`start_rag_corpus_download` (`sanitize_corpus_install_dir` [:1285](../../main.py:1285)),
`import_intent_pack` (typed parse [:898](../../main.py:898)).

### Scope reduction from general mode

"No game context" removes screenshots, running-game state, and strategy
checklist from the web surface entirely — **most of the risky tier drops out of
the audit**.

### Capability keys

Five, fixed, in [capabilities.py:12](../../py_modules/backend/services/capabilities.py:12):
`filesystem_write`, `media_library_access`, `steam_logs_read`, `steam_web_api`,
`microphone_access`. **None covers clipboard.** Adding a key means deciding
whether `legacy_grandfather_capabilities()` grandfathers it — precedent is that
the two most sensitive keys are opt-in even for legacy installs
([capabilities.py:37-40](../../py_modules/backend/services/capabilities.py:37)).

---

## Streaming

The QAM **already streams by polling**. `get_background_game_ai_status`
([main.py:2388](../../main.py:2388)) returns `partial_response` and `streaming`,
merged at [:2411](../../main.py:2411). So SSE would be a *second* streaming
mechanism, not a port of the existing one.

v1 reuses the proven poll path. The web client consumes an async token stream
whose v1 implementation happens to be a poll loop, so swapping in SSE at
extraction touches one module.

---

## Concurrency

Deferred, but **must be decided before v1.** Leaning shared-data /
independent-sessions, with one-surface-at-a-time as fallback.

Simultaneous *UIs* are unlikely — Steam's desktop client does not load Decky's
frontend at all. But the **backend state is a singleton**:
`get_background_game_ai_status` ([main.py:2388](../../main.py:2388)) and
`abort_background_game_ai` ([main.py:2413](../../main.py:2413)) take no job ID.
There is one background Ask slot for the whole plugin, so a second client can
abort or read the first one's answer.

**Fix is small — a job ID — not an architecture change.**

---

## Hosting

v1 is Decky-hosted. Three separate answers in-session pointed at eventual
extraction to a standalone service: LAN host discovery from machines with no
backend, a desktop enable-script, and lifecycle independence. The third of those
was based on my incorrect lifecycle claim and no longer applies.

**Remaining reasons to extract are product reasons, not technical ones:**
Bazzite-desktop users who should not have to install a Steam-injection tool, and
LAN clients on other machines.

**The price of extracting:** the Decky plugin becomes a client of the service
too — otherwise there are two backends and guaranteed drift. That makes the
**QAM path, which works today, depend on a service being up**, a new failure
mode paid for by existing users who never asked for Desktop mode.

Install target note: SteamOS has an immutable rootfs, but user units in
`~/.config/systemd/user/` and binaries under `~/.local` survive OS updates, so a
per-user service needs no `rpm-ostree` layering.

### Privilege wrinkle

"Plugin starts the service on demand" has prior art and a known-fragile
dependency:

- `systemctl --user` is already used
  ([local_ollama_setup_service.py:216,574](../../py_modules/backend/services/local_ollama_setup_service.py:216)).
- The plugin already probes `geteuid` and `sudo -n`
  ([:514-545](../../py_modules/backend/services/local_ollama_setup_service.py:514)),
  and its own hint says installs "may fail unless you use Desktop Konsole"
  ([:545](../../py_modules/backend/services/local_ollama_setup_service.py:545)).
- [voice_transcription_service.py:485](../../py_modules/backend/services/voice_transcription_service.py:485)
  discovers the interactive session's `XDG_RUNTIME_DIR` by parsing
  `/proc/<pid>/environ` because it lives in the **gamescope session**.
  `systemctl --user` needs the same thing — and **in Desktop mode that session
  does not exist, or is a different one.**

So the on-demand start fails in exactly the mode it is meant to serve, unless
the session lookup is generalized first.

---

## Open questions

1. **Concurrency model** — blocker for v1. Job ID on the background Ask slot.
2. **SSRF** — is caller-supplied `PcIp` validated in `test_ollama_connection`,
   `ask_game_ai`, `start_background_game_ai`?
3. **Repo layout** — `packages/bonsai-web/` (leaning) vs a second build target.
4. **Reply rendering** — structured-data extraction vs duplicated renderers.
   Evidence favours the thin-wrapper split above.
5. **`_unload` / rebind semantics** on Decky Reload.
6. Port selection and conflict handling.
7. What the v1 UI contains beyond the Ask box.
8. Behaviour when Ollama is unreachable from a LAN client (three-hop chain:
   browser → Deck backend → PC Ollama).

## Needs a D-number

Route through [maintainer-decisions-locked.md](maintainer-decisions-locked.md)
before implementation:

- General mode — **no game context on the web surface**. Makes the two surfaces
  different products; the largest scope call in this session.
- Parity minus game context — which features are permanently QAM-only.
- Full permission control from the web surface, including LAN clients.
- No migration at extraction — users lose history and re-download the corpus.
- Capabilities + method allowlist as the authorization model.
