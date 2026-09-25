# 19 — Controller macro test rig + live view — discovery

Planning record for the roadmap entry of the same name. **Discovery locked 2026-08-23** in a
maintainer Q&A session; the calls in § 2 are decided, everything marked UNKNOWN or *spike* is
not. Recon and design only — **no implementation**. Effort uses the roadmap GTA scale.

**Status, 2026-09-24: built and in daily use; four pieces left, and the maintainer's priority 1.**
Until today the roadmap still said "board ordered, next: spikes S1 to S3". That was a month out of
date:
- **S1 and S2 are done.** The board is plugged into the Deck and read on the PC's COM7
  (`deck_status` reports `bridgeReady: true`; see `docs/test-evidence/plan65-DEPLOY.json`). Its
  button map was measured and fixed on 2026-08-25
  ([archive/22-xinput-near-miss-and-button-map.md](../archive/22-xinput-near-miss-and-button-map.md)).
  The Guide chord opens the Quick Access Menu from it.
- **P1 is done except the stream.** Pressing, chords, walks, sequences and a stop switch exist as
  `deck_pressButton`, `deck_pressChord`, `deck_walkTo`, `deck_runSequence`, `deck_stopAutomation` and
  `deck_automationStatus`.
- **P2's acceptance run passed in practice.** A nine-step walk drove the menu with nobody at the Deck
  on 2026-08-26 (plan 21, milestone M3). The full ask, wait and read-back ran unattended on
  2026-08-28 ([roadmap-details](../roadmap-details.md), this entry's status).
- **S5 is answered in practice, not by the plugin.** Sessions wait for a reply by watching the
  screen with `deck_waitFor`. No signal from the plugin itself was ever picked.

Still left:
1. **S3: one recording that is also a live view,** with its cost to the Deck measured. `deck_record`
   only saves a file.
2. **S4: checking the highlight from the video.**
3. **Handheld runs over Bluetooth** (P3). Nothing found shows they were tried.
4. **P4: the nightly run with nobody present.** It first needs the saved-walk replay to work right
   after a deploy; today it cannot, which is an open roadmap bug.

What none of this fixes: the checks that need a finger on the screen, a game that is not on the
Recent Games row, or ears. Those are the rest of what still waits on a person.
[Plan 67](67-stand-in-decks.md) (stand-in Decks) comes after this. It adds machines, not abilities.

**One sentence:** a bridge board the Deck sees as a real controller, a macro runner whose steps
are verified against real UI state, and one capture pipeline that yields the QA recording and a
live analyzer stream at the same time — closing the last missing capability for unattended
on-Deck QA.

Sources: [01-qa-automation-plan.md](../archive/01-qa-automation-plan.md) (findings F1–F7),
[02-dps-upstream-findings.md](02-dps-upstream-findings.md) + the
[mcp-setup.md findings log](../mcp-setup.md#dps-findings-log-bonsai) (P1-5),
[deck_send_ask.py](../../scripts/deck_send_ask.py), [record-deck.sh](../../scripts/record-deck.sh),
[troubleshooting.md](../troubleshooting.md) § 5, and the DPS repo at `qd313/decky-plugin-studio`
(read at v0.3.6, local checkout).

---

## 1. Where the pipeline stands (persisted from discovery, 2026-08-22)

The maintainer's target is full agent-run UI testing: select chips, launch Asks, wait for the
reply, record token streaming, evaluate smoothness, navigate the plugin menu. Status of each
stage:

| Stage | State | Evidence |
|---|---|---|
| Deploy a build to the Deck | **Working** — hash-verified deploy | `build.ps1` / `build.sh dev` |
| Press buttons / navigate menus | **Missing entirely** | F1 in [01-qa-automation-plan.md](../archive/01-qa-automation-plan.md) § 0: no input injection of any kind on the Deck |
| Type an exact question | **Working** | [deck_send_ask.py](../../scripts/deck_send_ask.py) writes the Ask field over CEF remote debugging (CDP, `127.0.0.1:8080`) and verifies the write; deliberately does not press Ask |
| Select a specific test chip | **Blocked twice** | Frozen test chips not built (roadmap Backlog ★★★; standing agreement in CLAUDE.md § Testing on the Deck); carousel cannot be walked backwards (roadmap § Bugs) |
| Press Ask / wait for reply | Nothing presses Ask; done-signals exist unwired | `get_background_game_ai_status` (`main.py:2729`), plugin log over SSH (F4), per-Ask trace file (F5) |
| Record the screen | **Working** | [record-deck.sh](../../scripts/record-deck.sh) — composited gamescope capture over PipeWire (`:74`), fixed duration, sudo prompt |
| Evaluate streaming smoothness | **Half** — video-only has a known blind spot | roadmap § Bugs *"Token streaming reveal is chunky under game load"*: ffmpeg `freezedetect` found the stalls, but video cannot split token-arrival stalls from render stalls; that row's own next step is on-device timestamp logging |

Two findings from the QA plan frame everything: the video-oracle idea was blocked less by the
oracle than by the absence of a way to press buttons (§ 3), and its A4 spike ("is CDP reachable?")
has since been answered **yes** in practice — every `probe_deck_*` script and the Ask injector run
over it. Reading state on-device is solved. Pressing buttons is the hole. This plan is the hole.

**Why real controller input and not synthetic events:** the findings log's P1-5
([mcp-setup.md:35](../mcp-setup.md)) records that a DOM `focus()` moves `activeElement` while
Steam's `gpfocus` stays behind — three bonsAI "fixes" shipped on exactly that false check. Only
input that enters through Steam's gamepad stack exercises the focus system the open bugs live in
(unreachable spoiler fence, one-way carousel, focus on inert text).

---

## 2. Locked decisions (2026-08-22 → 2026-08-23)

Local numbering (L1…), deliberately outside the maintainer D-series.

| # | Decision | Call | Why |
|---|---|---|---|
| L1 | Ownership | **DPS-owned from the start** (`qd313/decky-plugin-studio`); bonsAI is the first consumer | Operational Deck tooling belongs upstream ([AGENTS.md](../../AGENTS.md) § 2); DPS's own `deck_openPlugin` still returns *"Deck UI cannot be automated in v1"* (`mcp-server/src/tools/deckAutonomy.ts:70`) — this deletes that sentence |
| L2 | Input mechanism | **Bridge board** (ESP32-S3 class, ~$8) presenting a basic Xbox-style pad; **not** PC-native Bluetooth, **not** on-Deck uinput, **not** synthetic CDP events | A normal PC's USB/BT stack cannot play the controller role; a board keeps zero software on the Deck and full Steam Input fidelity |
| L3 | Transports | **Both from day one:** wired USB gadget (default; board lives on the dock) + Bluetooth pairing (undocked handheld runs) | Docked runs render at external-display resolution — geometry rows need handheld 800p, so BLE is not optional polish |
| L4 | Live view | **PipeWire lane:** one gstreamer pipeline teeing the proven gamescope capture to file (the QA `.mkv` artifact) **and** a low-latency network stream (watching + analyzer) | One encoder serves recording, eyes, and machine checks; avoids the second-encoder observer effect on the APU. Sunshine/Moonlight noted as an optional personal install QA never depends on; HDMI capture card deferred as the observer-neutral option if perf rows demand it |
| L5 | Verification | **Hybrid:** CDP state reads gate every macro step (millisecond, token-free); a `focus-visual` check confirms on the stream that the focus highlight actually moved after a real D-pad press | State reads must key off `gpfocus` markers, never `activeElement` (P1-5). Visual check closes the "state says yes, screen says no" class |
| L6 | Guardrails (v1) | **QAM-open interlock** (after the opening chord, every press requires CDP confirmation the QAM overlay is up; halt if it closes), **neutral-on-silence watchdog** in firmware (all buttons release if the PC heartbeat stops), **extension kill switch + always-visible agent-control status** | Maintainer-selected. While the QAM is open, controller input goes to the menu, not the game |
| L7 | Guardrails declined for now | Explicit arm-step per run; refuse-unless-`--with-game` flag | Maintainer did not select; revisit after any incident |
| L8 | Unattended sudo | **Scoped passwordless sudoers rule** naming only the capture/stream helper | The one blocker between "scripted" and "walk away" |
| L9 | V1 acceptance | **Golden-path smoke, unattended** (§ 5) | Proves every primitive once before real rows |
| L10 | Build order | **Not blocked on Frozen test chips** — v1 uses the typed-question path (injector + real A-press); chip-select macros arrive when frozen chips land | The chips feature stays valuable for one-press manual QA regardless |

Also settled in discovery: the Rii i4 keyboard on the dock does not participate (sealed 2.4 GHz
pair, and keyboard input bypasses the gamepad focus path under test); the bridge firmware may
optionally expose a composite keyboard interface later, at no cost now.

---

## 3. Architecture

```
PC (Windows)                              bridge board (ESP32-S3 class)          Steam Deck
─────────────                             ────────────────────────────           ──────────
DPS mcp-server                            firmware:
  serial bridge client ──USB (UART port)──► cmd parser, HID reports,
  macro runner + verify                     4 Hz heartbeat monitor,
  CDP client (reuses probe transport) ─┐    neutral-on-silence watchdog
  stream receiver + analyzer           │      │ native-USB port (gadget) ──USB──► dock  (wired mode)
DPS extension                          │      │ BLE HID pad  ─────────────BT────► Deck  (handheld mode)
  status bar: idle/armed/RUNNING …     │
  kill switch (severs serial ⇒ watchdog│
  releases all buttons, runner halts)  └────────────LAN────────────────────────► CDP 127.0.0.1:8080 (via SSH fwd)
                                                                                gamescope ─PipeWire─► gst tee:
                                            stream (RTP/UDP) ◄──────LAN─────────  ├─► file (.mkv artifact)
                                                                                  └─► network (live + analyzer)
                                                                                SSH: logs, helper, sudoers-scoped capture
```

- ESP32-S3 devkits carry **two USB ports** (native OTG + a UART chip): the native port faces the
  Deck as the gamepad, the UART port faces the PC as the command channel — both wired in docked
  mode, UART-only in BLE mode. Specific board SKU: chosen in spike S1.
- Serial protocol sketch: newline JSON — `{"t":"press","b":["A"],"ms":80}`,
  `{"t":"chord","hold":"GUIDE","tap":"R4"}`, `{"t":"hb"}` at 4 Hz; firmware neutralizes after
  ~750 ms of silence (tune in S1). Button set v1: D-pad, A/B/X/Y, LB/RB, Start/Select, Guide.
- Opening the QAM: an Xbox pad's Guide button is the Steam button on SteamOS, and
  [troubleshooting.md](../troubleshooting.md) § 5 (`:563-620`) already documents a native Guide
  Button Chord Layout recipe that opens the QAM and walks into bonsAI with per-step fire delays.
  The chord layout is configured once for the paired/plugged bridge pad. Verifying it fires from
  the bridge is spike S2, not new invention.

### Proposed DPS surface (flat `deck_*` naming per `mcp-server/src/toolRegistry.ts:58-197`)

| Tool | Purpose |
|---|---|
| `deck_padStatus` | Bridge present, transport in use, link health, watchdog state |
| `deck_padPress` | Buttons + hold-ms + gap-ms + repeat |
| `deck_padChord` | Hold one button, tap another (Guide chords) |
| `deck_padKill` | Agent-side abort — same effect as the extension kill switch |
| `deck_macroRun` / `deck_macroList` | Run a named or inline macro; per-step verify hooks; returns a step log |
| `deck_streamStart` / `deck_streamStop` | Start/stop the tee pipeline (`file`, `net`, or `both`) |

Macro step types: `press`, `chord`, `wait`, `verify` (kinds: `state` — a CDP expression that must
return truthy; `focus-visual` — expected rect from CDP, highlight confirmed on the stream;
`signal` — e.g. reply-finished). Macro files are data (JSON); **bonsAI's macros and CDP
assertions live in bonsAI** (`tests/macros/`), the engine lives upstream. bonsAI-specific
selectors (`.bonsai-scope`, chip rows, `gpfocus` containers) never enter DPS.

---

## 4. Golden-path smoke — the v1 acceptance run (L9)

One command on the PC; nobody touches the Deck. Game optionally running.

1. `deck_streamStart both` — pipeline up, artifact recording, live view visible.
2. `deck_padChord` fires the QAM-open chord → **verify(state):** QAM overlay present (CDP).
3. Macro walks to the bonsAI tab → **verify(state):** `.bonsai-scope` active tab is Main, using
   `gpfocus` markers (never `activeElement`, per P1-5).
4. Question lands verbatim via the existing injector (same CDP write + re-read verification
   `deck_send_ask.py` already performs).
5. One real A-press on Ask → **verify(state):** Ask began (thinking state visible).
6. **verify(signal):** reply finished — mechanism chosen in S5.
7. `deck_streamStop`; recording, per-step state log, and the plugin log land on the PC.

Pass = all verifies green with zero human input after invocation. Every later QA row is this
skeleton with different middles.

---

## 5. Spikes — all timeboxed, all before Phase 1 commits

| # | Question | Notes / UNKNOWNs |
|---|---|---|
| S1 | Board bring-up: does the Deck accept the board as a wired pad, and pair it over BLE? Does Steam UI navigation accept a generic HID pad, or is an Xbox (XInput) identity needed? | Board SKU, HID descriptor details, watchdog timing. Controller-2 semantics (built-in controls stay controller 1) — expected fine for UI nav, verify |
| S2 | Does the documented Guide-chord recipe fire from the bridge pad and open the QAM reliably? | Chord layouts are per-controller — one-time setup for the bridge pad; measure per-step fire delays |
| S3 | PipeWire tee: file + RTP from one pipeline; end-to-end latency; APU cost of the encode (observer effect, quantified); the scoped sudoers rule — and whether it survives a SteamOS update | UNKNOWN whether `/etc` overlay persistence covers sudoers.d across updates; document a reinstall step regardless |
| S4 | `focus-visual`: map a CDP element rect to stream-frame coordinates (scale factor UNKNOWN — measure); detect the focus highlight reliably against animation and compression | Ships advisory-only until its false-positive rate is measured; promoted to a gate later |
| S5 | Reply-finished signal: poll `get_background_game_ai_status` (`main.py:2729`) — from where? — vs. tailing the plugin log for the terminal-state write vs. watching the F5 ask-trace file appear | The status RPC is only trivially callable from page context; log/trace watching needs only SSH. Pick the least fragile |

---

## 6. Risks

- **Observer effect.** The stream encode competes for the APU with the game and Ollama — the
  exact contention the chunky-streaming bug is about. S3 quantifies it; performance rows may
  eventually want the HDMI capture card (zero on-Deck cost). Video corroborates streaming
  smoothness; the roadmap's timestamp instrumentation *decides* it — this rig makes those runs
  repeatable, it does not replace that work.
- **SteamOS updates** can reset the sudoers rule or (less likely) the CDP port — the latter is a
  risk every existing probe script already carries. Document re-setup; keep it one script.
- **BLE flakiness** (pairing state, radio) — mitigated by wired-default; BLE reserved for the
  rows that need handheld geometry.
- **CV brittleness** in `focus-visual` — advisory first (see S4), mechanical thresholds, no
  model-in-the-loop; final qualitative judgment stays with a human or an explicitly-invoked agent.
- **Scope discipline.** The rig can press buttons anywhere, including into games. It is QA
  tooling: dev-only, never shipped inside the plugin (consistent with the permission-center
  posture), guardrails per L6/L7.

---

## 7. Phasing

| Phase | Contents | Done when |
|---|---|---|
| P0 | Spikes S1–S3 (S4/S5 may trail into P2) | Board presses register in Steam UI; chord opens QAM; tee pipeline streams + records with known latency |
| P1 | DPS primitives: serial bridge, `deck_pad*`, `deck_macroRun` (blind steps + `state` verify), `deck_stream*`, extension status + kill switch | Tools callable from a bonsAI session; kill switch provably neutralizes mid-press |
| P2 | bonsAI integration: golden-path smoke macro + CDP assertions + reply-finished signal | **L9 acceptance:** unattended smoke passes end to end |
| P3 | `focus-visual` checks; handheld BLE geometry runs; chip-select macros (after Frozen test chips); first real rows — KB-ROUTER-01's four sentences, tab-tour smokes | A real testing.md row moves on rig evidence |
| P4 | Streaming-row repeatable runs (with the timestamp instrumentation), nightly-loop hookup per [01-qa-automation-plan.md](../archive/01-qa-automation-plan.md) A5 | The QA plan's "must be manual" column visibly shrinks |

Per CLAUDE.md, implementation commits update `docs/roadmap.md` and `docs/testing.md` (new rig
rows) in the same change sets.

---

## 8. What it unblocks

- **Answers P1-5** in the findings log — on-device input injection plus a real focus oracle.
- **STREAM-09 / D-PAD-SCROLL-02:** identical scripted scroll runs, judged on video.
- **KB-ROUTER-01 and the KB row family:** four exact sentences, four unattended Asks.
- **PHASE4-CHIPS-01** once Frozen test chips land (deterministic chip-select).
- **The focus-bug class** (spoiler fence, one-way carousel, inert-text stops): real presses +
  `gpfocus` reads + visual confirmation become a regression net instead of a manual repro.
- Tier 0 smokes stop needing a human for the driving half; the QA plan's judging half was
  already largely covered.

## 9. Maintainer actions and upstream mirroring

- Order the bridge board: an **ESP32-S3-DevKitC-1-style dev board with two USB ports** ("USB" +
  "COM"), ESP32-S3-WROOM-1 module, N16R8 or N8R2 variant — ~$9–12 single, clone two-packs ~$16.
  The dual ports are the hard requirement (native USB faces the Deck, COM faces the PC);
  single-port boards (Seeed XIAO ESP32S3, most "mini" boards) do not fit the wired topology.
  Plain ESP32 (no native USB) and ESP32-S2 (no Bluetooth) do not qualify. S1 still validates the
  unit on hardware.
  **Ordered 2026-08-24:** Amazon ASIN `B0GVSQXBK3` — WROOM-1 N16R8, dual Type-C (native "USB" +
  CH343P-bridged "UART"), BLE 5.0. Matches spec exactly. Windows may need a CH343 driver from
  WCH's site the first time the UART port is plugged in — not yet hit, note for S1.
- Approve the one-line sudoers rule at implementation time (L8).
- Upstream issues on `qd313/decky-plugin-studio` (tool surface, extension UI, firmware home,
  retiring the `deck_openPlugin` manual-checklist note): drafted from this doc **when you say
  go** — the findings-log row below points here meanwhile, per the AGENTS.md mirror rule.
