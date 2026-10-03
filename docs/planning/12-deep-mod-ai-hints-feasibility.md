# 12 — Deep mod AI hints — feasibility (2026-08-04)

Research only. No code, no roadmap edits, no implementation. Answers the six
questions raised against the Planned item at
[roadmap.md § Planned — Deep mod AI hints](../roadmap.md#features) — *"★★★★★★ **Deep mod AI hints**
(install paths + compatdata) — Detect mod frameworks/files; mod-aware AI
guidance"*.

**Verdict: GO on a descoped v1 (tiers A + D-generic, ★ + ★★). NO-GO on tier C
(deep scan). CONDITIONAL on tier B1 (Workshop ACF).**

The roadmap item bundles two things that have wildly different risk profiles:
*mod-aware guidance* (cheap, safe, and currently missing outright) and *mod
detection* (expensive, and — this is the finding that decides the memo —
**systematically wrong for the users who mod the most**). Ship the first,
do not ship the second.

Two structural blockers, both verified against the tree, are in §1. Read them
before the exemplar table; they are why the table's conclusion is "detection is
not worth building" rather than "here is how to build detection".

---

## 0. Three corrections to the brief's premises

**0.1 — `ai_character_service.py` does not guard against reckless compatdata
deletes. It does the opposite.** The brief cites it as existing bad-advice
protection. The actual text is a deliberately-terrible tip line in the Pyro
easter egg — `"Delete my compatdata folder to fix this crash"`
([ai_character_service.py:30-36](../../py_modules/backend/services/ai_character_service.py)) —
and the persona prompt at
[:299-306](../../py_modules/backend/services/ai_character_service.py)
instructs the model to *encourage* deleting compatdata in prose. There is **no
production guardrail anywhere** against destructive prefix/compatdata advice.
This flips question 4 from "tie into the existing guardrail" to "**a guardrail
has to be written**", and it is the single largest safety cost of any mod work
(§5.3).

**0.2 — Mod Asks do not currently reach the troubleshooting prompt path at
all.** `_user_asks_deck_troubleshooting_or_compat_line`
([ollama_prompts.py:386-439](../../py_modules/backend/services/ollama_prompts.py))
is a hand-listed phrase gate. It contains no `mod`, no `bepinex`, no `smapi`,
no `workshop`, no `load order`. "My game crashes when I load my mods" matches
nothing, so it gets **no** `DECK_TROUBLESHOOT_GAME_SETTINGS_LINE`
([:485-493](../../py_modules/backend/services/ollama_prompts.py)), **no** compat
KB retrieval (`should_retrieve_knowledge` returns `(False, "")` outside Strategy
mode — [knowledge_base_service.py:78-96](../../py_modules/backend/services/knowledge_base_service.py)),
and **no** Proton log attach ([game_ai_request.py:210-214](../../py_modules/backend/services/game_ai_request.py)).
Tier A is therefore not a nice-to-have on top of a working path; it closes a
live gap in the shipped one.

**0.3 — Legal exposure is smaller than the brief assumes, and located
elsewhere.** Reading files on the user's own device that the user already owns
raises no Nexus or Steam Workshop ToS question — those ToS govern *fetching from
their services*. The exposure begins at automated retrieval of mod metadata
(Nexus API, Workshop scraping), which belongs to the **Web permission** item,
not this one. Do not let a misplaced legal worry drive the scoping; the real
reasons to descope are correctness and support load.

---

## 1. The two blockers

### 1.1 Mod managers invert the signal

The three dominant Deck modding workflows install mods **outside the game
directory** and inject at launch:

| Manager | Where mods actually live | Game folder looks |
|---|---|---|
| **Mod Organizer 2** (Bethesda) | Own `mods/` tree + VFS overlay, usually in its own Proton prefix | **Vanilla** |
| **r2modman / Thunderstore MM** (Unity) | `~/.config/r2modmanPlus-local/<Game>/profiles/<p>/BepInEx/` | **Vanilla** |
| **Vortex** (multi-game) | Staging folder + deploy; deploy target varies by game and method | Mixed |
| Manual install | In the game folder | Modded |

A game-folder scanner therefore reports **"no mods detected" for the most
heavily modded users** and "mods detected" mainly for the manual-install
minority. A detector whose sensitivity is inverted on its primary audience is
worse than no detector: it will state, with the authority of having "checked",
that a 200-mod MO2 load order is a clean install — and then the model will
reason from that.

This cannot be fixed by scanning harder. Fixing it means discovering and parsing
three third-party managers' private state formats, which is a larger project
than the mod hints themselves.

### 1.2 bonsAI cannot currently locate a game's install directory

Verified: **zero occurrences of `libraryfolders` anywhere in `src/`,
`py_modules/`, `main.py`, `scripts/`, or `data/`.** The only appmanifest read in
the tree hardcodes two roots:

```
~/.local/share/Steam/steamapps/appmanifest_<id>.acf
~/.steam/steam/steamapps/appmanifest_<id>.acf
```
([screenshot_media.py:426-435](../../py_modules/backend/services/screenshot_media.py))

So SD-card libraries and second internal libraries — routine on Deck — are
invisible today. Any tier B2/C needs:

1. a real `libraryfolders.vdf` parser. The backend is stdlib-only (see
   [10-wake-word-listening-feasibility.md §2.1](10-wake-word-listening-feasibility.md));
   there is no `vdf` package and the only existing "VDF parsing" is a ±2200-char
   regex window over `screenshots.vdf`
   ([screenshot_media.py:450-474](../../py_modules/backend/services/screenshot_media.py));
2. an allowlist that accepts **arbitrary user-chosen mount points**
   (`/run/media/mmcblk0p1/...`, custom mounts).

Point 2 is the inversion of what makes the current design safe.
`path_allowed_for_proton_log`
([proton_troubleshooting_logs.py:39-72](../../py_modules/backend/services/proton_troubleshooting_logs.py))
is defensible precisely because the allowed set is *two fixed roots plus one
numeric AppID*, resolved through `os.path.realpath` and rejected unless the
parent matches exactly. Replace that with "roots we read out of a config file"
and the security argument gets much harder to make in a permissions dialog.

**The `dosdevices` trap.** Any prefix walk must never traverse
`compatdata/<appid>/pfx/dosdevices/` — `z:` is a symlink to `/`. One naive
`os.walk` with `followlinks=True` escapes to the entire filesystem in a single
hop. This is the concrete reason the shipped design reads compatdata
**direct children only, no `pfx/` walk**
([proton_troubleshooting_logs.py:60-71](../../py_modules/backend/services/proton_troubleshooting_logs.py)),
and it should stay that way.

---

## 2. Exemplar detection table

Five titles covering the distinct on-disk shapes. `<lib>` = a Steam library root
(unknown to bonsAI today, per §1.2).

| # | Title / class | Where mods live | Highest-confidence marker | Confidence if found | False-positive traps | False-negative traps |
|---|---|---|---|---|---|---|
| 1 | **Skyrim SE** (489830) — Bethesda / Proton | `<lib>/steamapps/common/Skyrim Special Edition/Data/`; SKSE at game root (`skse64_loader.exe`, `Data/SKSE/Plugins/*.dll`); load order in the **prefix** at `compatdata/489830/pfx/drive_c/users/steamuser/AppData/Local/Skyrim Special Edition/plugins.txt` + `loadorder.txt`; INIs under `.../Documents/My Games/Skyrim Special Edition/` | `skse64_loader.exe` present, or `plugins.txt` listing non-vanilla `.esp` | **Medium.** SKSE is near-certain evidence of *intent to mod*; `plugins.txt` content requires a vanilla-name diff to interpret | Base game ships `Data/*.esm` — the folder proves nothing. Creation Club `cc*.esl` files are indistinguishable from mods. A vanilla `plugins.txt` always exists | **MO2 users have a clean game folder.** The most-modded Skyrim installs on Deck look vanilla to a folder scan |
| 2 | **Stardew Valley** (413150) + **SMAPI** | `<lib>/steamapps/common/Stardew Valley/Mods/<Mod>/manifest.json`; `StardewModdingAPI` binary at game root; launch options rewritten to run SMAPI | `Mods/*/manifest.json` containing `UniqueID` + `EntryDll` | **High** — one of the few genuinely reliable markers in the whole landscape | `Mods/` survives mod removal. SMAPI ships its own `ErrorHandler` mod, so "≥1 mod" is true for every SMAPI install | Native Linux build → **no `compatdata` prefix exists at all**; a compatdata-centric design finds nothing. Launch options live in `userdata/<id>/config/localconfig.vdf`, which bonsAI does not parse and no allowlist covers |
| 3 | **Unity + BepInEx** (e.g. Lethal Company 1966720, Valheim 892970) | `<lib>/steamapps/common/<Game>/BepInEx/{core,plugins,config}`; `winhttp.dll` (Proton) or `run_bepinex.sh` + `doorstop_libs/` (native); `doorstop_config.ini`; `BepInEx/LogOutput.log` | `BepInEx/LogOutput.log` — proves the loader **actually ran**, and its header carries the BepInEx version | **High** for "loader ran"; **Medium** for "which plugins" | `winhttp.dll` is a generic proxy-DLL name used by non-mod tools. An uninstalled BepInEx leaves the whole `BepInEx/` tree behind indefinitely | **r2modman/TMM profiles live outside the game dir** and inject via launch options — clean game folder, fully modded game |
| 4 | **Workshop-managed** (e.g. Cities: Skylines 255710, RimWorld 294100) | `<lib>/steamapps/workshop/content/<appid>/<publishedfileid>/`; metadata in `<lib>/steamapps/workshop/appworkshop_<appid>.acf` | `appworkshop_<appid>.acf` — a single flat ACF file, same shape and location class as the manifest already read | **High** for *subscribed count and IDs*; **zero** for names or enablement | Subscribed ≠ enabled — the in-game mod list is separate state. Some titles use Workshop only for maps/skins/saves. Bethesda titles **do not use Workshop** for SSE at all, so absence proves nothing | Nothing significant — this is the one clean signal |
| 5 | **Non-Steam: Heroic / Lutris** (e.g. GOG Cyberpunk + CET/REDmod) | `~/Games/Heroic/Prefixes/default/<Game>/pfx/`, Lutris `~/Games/<game>/`; entirely outside Steam layout | — | **None** | — | **No AppID exists.** Non-Steam shortcuts get synthetic 32-bit IDs, there is no `appmanifest`, and `collect_proton_troubleshooting_logs` already refuses non-numeric AppIDs ([proton_troubleshooting_logs.py:116-118](../../py_modules/backend/services/proton_troubleshooting_logs.py)). The compat KB already carries the caveat card: *"Heroic/Lutris titles are outside Steam compatdata; paths differ from Steam library."* (`data/kb/compat_patterns.json`) |

**Reading of the table:** exactly one row (#4, Workshop ACF) is both
high-confidence and cheap. Rows #1–#3 all carry the same fatal false negative —
the mod manager moved the evidence — and rows #1 and #5 are effectively
undetectable. Detection quality does not improve with effort here; it plateaus
low.

---

## 3. Detection tiers

### Tier A — Prompt-only ★

**No filesystem access. No new capability. No new RPC.**

Two edits:

1. Extend the phrase gate at
   [ollama_prompts.py:386-439](../../py_modules/backend/services/ollama_prompts.py)
   with mod vocabulary (`mod`/`mods`/`modded`, `load order`, `bepinex`, `smapi`,
   `skse`, `mo2` / `mod organizer`, `vortex`, `r2modman`, `thunderstore`,
   `workshop item`, `.esp`/`.esl`). Word-boundary regex — bare `"mod"` substring
   would fire on *model*, *modem*, *moderate*, *modify*, and this repo has prior
   art for exactly that failure mode (the `steam_machine` chip-template bug,
   [roadmap.md § Bugs](../roadmap.md#bugs)).
2. Add a `MOD_CONTEXT_LINE` to the `middle` assembly at
   [ollama_prompts.py:849-855](../../py_modules/backend/services/ollama_prompts.py),
   sibling to `DECK_TROUBLESHOOT_GAME_SETTINGS_LINE`. Content in §5.1.

**Free side effects of (1):** mod Asks start reaching the compat KB
(`should_retrieve_knowledge` → `domain="compat"`) and, when `steam_logs_read` is
on, start attaching Proton logs — which is often where a mod crash is actually
visible.

**Modes:** Troubleshooting/Speed/Expert only. **Exclude Strategy.** Mod-aware
strategy advice compounds two accuracy problems (does the mod exist? does it
change this mechanic?) and interacts badly with the spoiler chain.

**Cannot infer:** anything about the user's actual install. That is the point —
tier A makes no detection claim, so it cannot make a false one.

### Tier B — Shallow scan ★★ / ★★★

Split, because the two halves have opposite cost/benefit:

**B1 — Workshop ACF only ★★.** Read `steamapps/workshop/appworkshop_<appid>.acf`
under the two known roots. Same allowlist shape as today: fixed roots, numeric
AppID, single named file, no walk. Yields *subscribed item count + published
file IDs*. Names require `ISteamRemoteStorage/GetPublishedFileDetails`, i.e. an
outbound call behind `steam_web_api` — so without that, the honest context line
is `"17 Workshop items are subscribed for this title"` and nothing more. Still
useful. Misses SD-card libraries (§1.2).

**B2 — `libraryfolders.vdf` + `appmanifest` `installdir` ★★★.** New parser, new
allowlist shape, and **on its own it yields no mod information at all** — it is
pure infrastructure for tier C. **Do not build B2 unless C is approved.**

### Tier C — Deep scan ★★★★★ — **NO-GO**

Bounded walk of install dir + prefix. Requires: B2, a new capability key, an
allowlist over arbitrary mount roots, depth/dirent/byte/wall-clock budgets, and
`dosdevices` exclusion. And after all of it, §1.1 still stands — it is wrong for
MO2/r2modman/Vortex users, who are the users asking.

Performance is a secondary objection but a real one: a Bethesda `Data/` tree is
thousands of entries, and on a microSD card a cold `stat` sweep competes for I/O
with the running game. The existing Proton-log collector already runs off-thread
via `run_in_executor` ([game_ai_request.py:226-231](../../py_modules/backend/services/game_ai_request.py)),
which is the right pattern, but off-thread does not make SD I/O free.

### Tier D — KB / RAG cards ★★ (generic) / ★★★+ (per-AppID)

`data/kb/compat_patterns.json` currently holds **124 cards across 27 topics**
(`proton`, `deck`, `anticheat`, `storage`, …) and has **no `mods` topic**.
Cards are flat objects — `pattern_id`, `topic`, `platforms`, `card`,
`source_url`, `source_license` — authored through `scripts/gen_compat_patterns.py`.

**D-generic ★★:** add a `mods` topic (~10–15 cards): what BepInEx/SMAPI/MO2/
r2modman/Vortex/Workshop are and where each puts things; "mods live outside the
game folder with a manager"; Proton-prefix vs native-Linux differences; the
Heroic/Lutris caveat; anti-cheat + mods; "back up your saves and prefix before
changing load order". This is authoring work, not engineering, and it ships in
the same change as tier A — the tier-A gate is what makes `domain="compat"`
retrieval fire for these Asks.

**D-per-AppID ★★★+:** per-title mod cards are catalog scale — that is RAG
Phase 8 ([roadmap.md § Planned](../roadmap.md#features)), gated behind the Phase 6 public
publish. Not a v1 conversation.

### Summary

| Tier | ★ | New capability | New FS reads | What it delivers | Verdict |
|---|---|---|---|---|---|
| **A** prompt-only | ★ | none | none | Mod Asks reach the compat path; framework-aware phrasing | **Ship** |
| **D-generic** KB cards | ★★ | none | none | Grounded, offline, per-framework facts | **Ship** (with A) |
| **B1** Workshop ACF | ★★ | yes (or reuse — §4) | 1 file, fixed roots | Subscribed item count + IDs | **Conditional** |
| **B2** library discovery | ★★★ | yes | VDF + manifests, arbitrary roots | Nothing on its own | Only if C |
| **C** deep scan | ★★★★★ | yes | Bounded walk, arbitrary roots | Detection that is wrong for manager users | **No-go** |
| **D-per-AppID** | ★★★+ | none | none | Per-title mod guidance | Phase 8 |

---

## 4. Permission / capability spec sketch

*Only needed if B1 or C is approved. Tiers A + D need none — that is most of
their value.*

### 4.1 New key, not a widened one

**Do not reuse `steam_logs_read`.** `CAPABILITY_KEYS`
([capabilities.py:12-18](../../py_modules/backend/services/capabilities.py))
has five entries, and the Permission Center presents `media_library_access &&
steam_logs_read` as the single user-facing toggle **"Read game & screenshot
context"** ([PermissionsTab.tsx:39-41](../../src/components/PermissionsTab.tsx)).
Users consented to *bounded log tails and screenshots*. Silently promoting that
to *your game install folders* is exactly the consent break the permissions
policy exists to prevent.

Proposed: `game_install_read`, default `False`, and **excluded from
`legacy_grandfather_capabilities`** ([capabilities.py:34-41](../../py_modules/backend/services/capabilities.py))
the way `steam_web_api` and `microphone_access` already are — existing installs
must opt in explicitly.

Cost of the key itself: the six-file settings tax (CLAUDE.md § *Where settings
live*) plus a focus-graph entry for the new toggle
(`.cursor/rules/decky-focus-graph.mdc`). Roughly ★ on its own; it is the reads
behind it that cost.

### 4.2 Allowlist design

Mirror `path_allowed_for_proton_log` structurally:

```
path_allowed_for_game_install(candidate, app_id, home, library_roots) -> bool
```

- `realpath()` the candidate **and** every library root; require
  `rp.startswith(root + os.sep)` — the anti-symlink-escape shape at
  [proton_troubleshooting_logs.py:45-71](../../py_modules/backend/services/proton_troubleshooting_logs.py)
- `library_roots` derived **only** from a parsed `libraryfolders.vdf`. Never
  from user text, never from model output, never from a settings string
- **Never traverse `pfx/dosdevices/`** (§1.2)
- Extension allowlist for *content* reads: `.json`, `.cfg`, `.ini`, `.txt`,
  `.log`, `.acf`, `.manifest`. Binaries (`.dll`, `.exe`, `.so`) may be
  **stat'ed for existence only, never read**
- Budgets, following the shipped precedent
  (`TOTAL_LOG_BUDGET_BYTES = 96 KB`, `PER_FILE_TAIL_BYTES = 64 KB` —
  [proton_troubleshooting_logs.py:18-19](../../py_modules/backend/services/proton_troubleshooting_logs.py)):
  max depth **3**, max **500** dirents, max **32 KB** total text, **750 ms**
  wall clock, hard stop past any limit with a warning in `warnings[]` rather
  than a partial silent result
- Run off the event loop via `run_in_executor`, as the log collector does
- Skip entirely when the budget would be spent during active gameplay, or
  accept the single Ask-time cost and measure it on-device first

### 4.3 Copy requirements

- **"suspected" vs "observed"** — "observed" only for a file bonsAI directly
  read (`BepInEx/LogOutput.log` exists). Everything else is "suspected".
  Never "installed", never "you have", never a count presented as complete
- Every surface repeats: **bonsAI does not install, enable, disable, or modify
  mods**
- Detection is never endorsement — no "this mod is safe/popular/recommended"
- Absence is never asserted: "no markers found in the folders bonsAI can read",
  never "you have no mods" (§1.1 is why)

---

## 5. AI guidance quality

### 5.1 Injection point and shape

Tier A has no data block — it is a `middle` prompt section
([ollama_prompts.py:849-855](../../py_modules/backend/services/ollama_prompts.py)).
If B1 ever ships, its context block goes through `stack_context_blocks`
alongside the Proton and KB blocks
([game_ai_request.py:316-319](../../py_modules/backend/services/game_ai_request.py)),
which is already the one place bounded local evidence enters the prompt.

`MOD_CONTEXT_LINE` must state, explicitly:

- bonsAI **has not inspected the user's files**; nothing below is verified
- do **not** name specific mod versions, file names, or load-order positions —
  ask instead
- do **not** assert compatibility between two named mods, or between a mod and
  a game version. State that this needs checking against the mod's own page
- do **not** advise disabling, spoofing, or working around anti-cheat, and do
  not predict VAC/EAC outcomes (the compat KB's `anticheat` cards already carry
  the correct conservative framing — reuse it, do not re-derive it)
- do **not** advise deleting `compatdata`, the prefix, or a save without an
  explicit backup step **first** in the same answer
- **ask which mod manager** the user uses before giving path-specific steps —
  the answer changes completely between manual / MO2 / r2modman / Vortex

### 5.2 Confidence labelling in Show details

If detection ships, mirror `build_proton_log_transparency`
([transparency_service.py:190-200](../../py_modules/backend/services/transparency_service.py)):

```
mod_context_detected: bool
mod_context_signals: list[str]      # e.g. ["appworkshop_255710.acf: 17 items"]
mod_context_confidence: "suspected" | "observed"
mod_context_notes: str              # skips, budget stops, unreadable roots
```

Tier A ships **no chip** — there is nothing detected to disclose. Adding one
would imply detection that did not happen.

### 5.3 The guardrail that has to be written

Per §0.1 there is no destructive-advice check today. The input sanitizer
([input_sanitizer_service.py](../../py_modules/backend/services/input_sanitizer_service.py))
is **input-side only** — it normalizes and size-caps the user's question; it
never sees the reply. This section proposed `response_verify.py` as the natural
home for an output-side check.

**Built 2026-08-23, and it did not go there — maintainer accepted the departure
the same day.** The guard lives in its own module,
[destructive_advice_guard.py](../../py_modules/backend/services/destructive_advice_guard.py),
wired into `run_game_ai_request` after a successful reply. Two reasons, both
accepted: it shares no logic with what `response_verify.py` already does, so
co-locating them would file by coincidence rather than by subject; and it was
written alongside four other parallel work streams, where a separate file
removed any chance of a collision in a shared file. QA row
**DESTRUCT-ADVICE-01** in [testing.md](../testing.md).

**Accepted limitation — the warning is appended after the reply completes.**
With token streaming on, the risky line is already on screen before the warning
lands beneath it. The maintainer accepted this on 2026-08-23: the app and repo
already carry disclaimers telling the user to double-check AI answers, and a
delayed flag is worth more than no flag. Catching it earlier would mean judging
a reply mid-generation, which is a much larger change and is not planned. What
this does oblige is **proving the flag actually appears** — see the QA row.

Whether that guardrail is in scope for a ★-tier prompt change is a maintainer
call (§7). Worth weighing honestly: mod advice is the first Ask topic where
following bad advice is **destructive and manual**. A wrong TDP number is
read-only and reversible by design — Ask never writes sysfs
([game_ai_request.py:403](../../py_modules/backend/services/game_ai_request.py)).
A wrong "just delete your prefix" costs the user a save file, and bonsAI cannot
undo it because bonsAI never touched it.

---

## 6. Risks

| Risk | Severity | Mitigation in the recommended v1 |
|---|---|---|
| **Wrong mod advice → destroyed save / load order** | **High** — destructive, manual, irreversible | Tier A prompt rules (§5.1); backup-first rule; the §5.3 guardrail if approved |
| **Inverted detection (§1.1)** | **High** — actively misleads power users | Eliminated: v1 detects nothing |
| **Trust damage to the permissions story** | Medium-high | Eliminated: v1 adds no capability and reads no new files |
| **Scan cost during gameplay** | Medium | Eliminated in v1; §4.2 budgets if B1/C ever ship |
| **Keyword gate false positives (`mod` → `model`)** | Medium | Word-boundary regex; watch for the `model policy` Ask, which has its own gate at [ollama_prompts.py:361-383](../../py_modules/backend/services/ollama_prompts.py) and must keep winning |
| **Support load from confident-sounding mod claims** | Medium | "bonsAI will not claim" list (§8) in README + troubleshooting |
| **Legal (Nexus/Workshop ToS)** | **Low** | §0.3 — local reads are not the exposure; online fetch is, and that is the Web permission item |

---

## 7. Dependencies and sequencing

**Nothing blocks the recommended v1.** Tier A + D-generic depend on no other
roadmap item.

| Item | Relationship |
|---|---|
| **Web permission** | Required for *live* mod/patch news and Workshop item **names**. Not required for v1 |
| **RAG Phase 6 publish → Phase 8 catalog** | Required for **per-AppID** mod cards. Generic framework cards need neither |
| **Steam Input layout parse** ([roadmap.md § Planned](../roadmap.md#features)) | **Not a dependency** — different VDF, different purpose. One real synergy: it would build the first genuine VDF parser in the tree, which tier B2 could reuse. If both are wanted, sequence Steam Input first |
| **`steam_web_api` capability** (shipped) | Would turn B1's opaque published-file IDs into names |

### Realistic timeline vs the ★★★★★★ label

★★★★★★ is accurate **for tier C** and stays accurate — §1.1 means the effort
buys unreliable output, so it is high-effort *and* low-value, the worst
quadrant. The ★★★★★★ rating is not wrong; the item is.

Recommendation: **split the roadmap entry** rather than re-estimate it.

- ★ **Mod-aware Ask prompting** — near-term (tier A)
- ★★ **Mod cards in compat KB** — near-term (tier D-generic)
- ★★ **Workshop subscription context** — medium-term, needs a permission
  decision (tier B1)
- ★★★★★★ **Mod install detection** — long-term, **currently no-go**, with
  §1.1 recorded as the reason so it is not re-derived next session

### Decisions needed from the maintainer

These belong in `docs/roadmap.md` § **Decisions needed**, per the refactor rules:

1. **Split the roadmap item into the four bullets above, or keep one
   ★★★★★★ entry?**
2. **Is the output-side destructive-advice guardrail (§5.3) in scope for the
   tier-A change, or a separate item?** Recommend separate — it is broader than
   mods and should not be bundled into a prompt tweak.
3. **Approve tier B1 (Workshop ACF) for a later pass?** If yes, it needs the
   `game_install_read` key decision (§4.1) up front, not after the code exists.
4. **Does "port configuration manager" belong in this epic?** Research says
   **no** — it shares the "read game install layout" plumbing but none of the
   advice-quality risk, and bundling would drag a ★★ item behind a no-go one.

---

## 8. Go / no-go

**GO — v1 = tier A + tier D-generic.** One commit's worth of prompt gate + one
prompt section + ~10–15 KB cards. No new capability, no new filesystem read, no
new RPC, no new frontend surface. It is net trust-positive because it makes **no
detection claim at all** — there is nothing for it to be wrong about — while
closing the §0.2 gap where mod Asks currently miss the compat path entirely.

**CONDITIONAL — tier B1**, pending decision 3.

**NO-GO — tiers B2 and C**, on §1.1 (inverted sensitivity) and §1.2 (the
allowlist would have to accept arbitrary mount roots). Revisit only if someone
solves manager-state discovery, which is a larger project than this item.

### "bonsAI will not claim" — for README and troubleshooting.md

- bonsAI **does not scan** your game install folders or Proton prefixes
- bonsAI **cannot list** your installed mods, their versions, or your load order
- bonsAI **will not download, install, enable, disable, or update** any mod
- bonsAI **will not edit** game files, INI files, launch options, or Steam
  configuration
- bonsAI **cannot tell you** whether a mod is compatible with your game version
  or with another mod — check the mod's own page
- bonsAI **will not help bypass, spoof, or disable anti-cheat**, and cannot
  predict VAC or EAC outcomes
- bonsAI **does not read** your Nexus, Thunderstore, or Workshop account, and
  fetches nothing online
- When bonsAI discusses mods it is reasoning from **general public knowledge and
  its offline knowledge base**, not from anything on your device

---

## What I could not verify

- **Manager install paths for MO2, r2modman, and Vortex on SteamOS** are from
  general knowledge, not observed on a Deck. The *direction* of §1.1 (managers
  keep mods outside the game folder and inject at launch) is architectural and
  holds regardless; the exact paths would need on-device confirmation before
  any code depends on them.
- **`appworkshop_<appid>.acf` field layout** — the file's existence and location
  are well established, but its key names were not read from a real file during
  this research. Confirm before B1 is scoped.
- **SD-card walk cost on Deck** — no measurement taken. Tier C is rejected on
  correctness, not on this number, so it was not worth measuring.
- **Whether `plugins.txt` reliably lives at the stated prefix path across Proton
  versions** — not verified; irrelevant to the recommendation, since no tier
  that reads it is being recommended.
