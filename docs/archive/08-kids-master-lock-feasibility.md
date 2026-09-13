# 08 — Kids master lock — feasibility (2026-08-03)

Research only. No code, no roadmap edits, no implementation. Answers the six
questions raised against the Planned item at
[roadmap.md § Planned — Kids master lock](../roadmap.md#planned) — *"Disable plugin capabilities when
Steam reports a restricted kids account"* — whose stated dependency is
"Capability Permission Center **and a detectable Steam signal**".

**Verdict: GO.** The Steam signal exists, is stable, and is already in this
repo's dependency tree. Confidence **high** on the signal, **medium** on one
semantic detail (see [Open risk](#open-risk--the-one-thing-i-could-not-verify)).
Recommended v1 scope is option **A** (all five `CAPABILITY_KEYS` forced off,
plus Web when it lands), which is behaviourally identical to option **D** and
avoids the false promise baked into **B** and **C**.

Implementation effort, separate from this research: **★★★**. The roadmap said
★★★★★; that rating priced in "is there even a signal?", which this document
closes. **Re-starred ★★★ and moved Medium-term → Near-term on 2026-08-07.**

> **Ship plan: [14-kids-master-lock-implementation-plan.md](14-kids-master-lock-implementation-plan.md).**
> This file stays the research record — edit the plan, not this, when scope moves.
> The one thing the plan needs back from here is the **Stage 0 spike results**,
> which get appended to [§ 6](#6-spike-steps-on-deck-before-any-implementation) below.

---

## 1. The Steam signal

### It exists, and it is already installed

`SteamClient.Parental` is a first-class member of the `SteamClient` global that
Decky plugins run against. It is declared in the copy of `@decky/ui` this repo
already depends on (`package.json:48`, `"@decky/ui": "^4.11.3"`):

| Fact | Evidence |
|---|---|
| `Parental` is a `SteamClient` namespace | `@decky/ui@4.11.3` → `src/globals/steam-client/index.ts:71` |
| Its surface is 4 methods | `@decky/ui@4.11.3` → `src/globals/steam-client/Parental.ts:6-27` |
| No getter — subscription only | same file: `RegisterForParentalSettingsChanges(cb) → Unregisterable` at `:19` |
| Payload shape | `ParentalSettings { ever_enabled, locked, settings: ArrayBuffer, strPlaintextPassword }` at `:29-37` |
| Decoded blob shape | `ParentalSettingsProtoMsg` at `:44-90` (`is_enabled`, `enabled_features` bitmask, app allow/block lists, playtime restrictions) |
| Feature enum | `EParentalFeature` at `:112-129` — `Store=1, Community=2, Profile=3, Friends=4, News=5, Trading=6, Settings=7, Console=8, Browser=9, ParentalSetup=10, Library=11, Test=12, SiteLicense=13, KioskMode=14` |

The type file carries the upstream maintainer's own caveat on the decoded proto
(`Parental.ts:41-42`: the proto message shape is annotated as unconfirmed). The
two **top-level booleans** — `ever_enabled` and `locked` — carry no such caveat
and are the ones I recommend building on.

### Confirmed against Steam's own shipped code

Steam's Big Picture / Deck UI implements Family View on top of exactly this API.
From the deobfuscated Steam client bundle
([ricewind012/steam-ui-unobfuscated](https://github.com/ricewind012/steam-ui-unobfuscated),
`actual_src/stores/5640.js`):

- `:91-102` — `Init()` wraps `SteamClient.Parental.RegisterForParentalSettingsChanges(...)`
  in a `Promise` that resolves **inside the first callback**. Steam blocks its own
  startup on that first fire, which is direct evidence the callback fires
  immediately on registration rather than only on subsequent change.
- `:176-188` — `UpdateParentalState()` stores the raw state and calls
  `deserializeBinary(e.settings).toObject()` to get the proto.
- `:198-200` — `get isParentalLocked() { return this.m_ParentalState.locked }`.
  The lock signal is the plain top-level boolean; **no protobuf decode required**.
- `:195-197` — `get isEnabled() { return !!this.settings.is_enabled }` — this one
  *does* require the decode.
- `:221-247` — `GetFeatureBlockReason(f)` = locked **and**
  `((enabled_features | temporary_enabled_features) & (1 << f)) == 0`. This is how
  per-feature gating works if we ever want it.
- `:215-217` — `hasPassword` = `!!settings.passwordhash`. Steam uses its absence
  to distinguish "parent can unlock here with a PIN" from "can't be unlocked
  locally" — relevant to Steam Families child accounts, below.
- `:68-85` — Steam's own route→feature map. `ExternalWeb` → feature `9` (Browser),
  `Store` → `1`, `Workshop` → `2` (Community), `Chat` → `4` (Friends). Note that
  `Settings.Root()` is gated by **kiosk mode**, not by parental controls.

The store instance is a module-scoped webpack singleton (`5640.js:382`,
`export const jR = new O()`) — **not** a stable global. Reaching it would require
`findModuleChild`-style chunk spelunking, which breaks on every Steam update.
Call `SteamClient.Parental` directly instead; that is the stable contract.

### Prior art in a third-party plugin

[STEAMBALANCE/booster-framework](https://github.com/STEAMBALANCE/booster-framework)
ships `src/steam-internals/parental.ts` doing precisely the one-shot read we
need, and its comments record two hard-won details worth stealing verbatim:

1. *"Steam fires the callback SYNCHRONOUSLY inside `register()`, before it
   returns"* — so a naive `reg = register(cb)` then `reg.unregister()` inside the
   callback dereferences an unassigned variable. Their fix defers the unregister
   with a pending flag.
2. *"`undefined` means UNKNOWN — do not treat it as 'unlocked'."* Their probe
   returns `undefined` on missing API / non-SharedJSContext / timeout.

That second rule is right for their threat model. **bonsAI must invert it** — see
[§3, fail-open](#unknown-must-fail-open--and-that-must-be-documented).

### What a Decky plugin cannot read

- **The Python backend has no access to any of this.** There is no HTTP server
  and no Steam IPC on the backend side (`CLAUDE.md` § The TS ↔ Python boundary).
  Everything parental must be probed in TS and pushed over RPC.
- **No local file to read from Python.** I found no documented on-disk cache of
  parental settings on Linux. `localconfig.vdf` and `config.vdf` are documented as
  holding client prefs and launch options; nothing in public sources maps parental
  state to a file path. Treat "is there a readable local cache?" as **UNKNOWN** —
  it is on the spike list, but do not design for it.
- **Steamworks `ISteamParentalSettings` is not reachable.** That is a game-process
  SDK interface (`isteamparentalsettings.h`); a Decky plugin is not a Steamworks
  app and has no `ISteamClient` pipe. Irrelevant here.
- **Per-feature blocking needs a protobuf decoder.** `enabled_features` lives only
  inside the `ArrayBuffer`. Shipping a decoder for it is a real cost and is
  explicitly *not* recommended for v1.

---

## 2. Enforcement scope

Current privileged surface — `py_modules/backend/services/capabilities.py:12-18`:

```
filesystem_write, media_library_access, steam_logs_read, steam_web_api, microphone_access
```

Guarded at 12 call sites in `main.py` (`:529`, `:687`, `:1789`, `:1825`, `:1853`,
`:1893`, `:1922`, `:2072-2076`, `:2691`, `:2843`), all through
`capability_enabled()` (`capabilities.py:44-51`).

| Option | Verdict | Why |
|---|---|---|
| **A** — all `CAPABILITY_KEYS` off | **Recommended** | Exactly matches the roadmap sentence ("disable plugin capabilities"). One choke point. Nothing new to explain. |
| **B** — disable Ask entirely | Reject | A local model answering a question on-device is not a privileged action under [`permissions-safety`](../../packages/bonsai-mcp/knowledge/policies/permissions-safety.md), which scopes consent to *filesystem writes, elevated commands, hardware controls, and web/search calls*. Killing Ask bricks the plugin and implies a child-safety guarantee we cannot make. |
| **C** — Ask allowed, model policy → Tier 1 | Reject — wrong axis | The tiers are a **licensing** control, not a safety control: `src/data/modelPolicy.ts:29` (`DEFAULT_MODEL_POLICY_TIER = "open_source_only"`) and the `non_foss` unlock gate at `src/components/ModelPolicyTierPanel.tsx:67`. Forcing "open source only" for kids says nothing about output. Also collides with the out-of-scope line on content moderation. |
| **D** — block Web/mic/filesystem, keep offline KB + local Ollama | **Same thing as A** | Once Web is added to `CAPABILITY_KEYS`, A *is* D. D is the correct way to describe A to a user; A is the correct way to implement D. |

**Recommended v1: option A, described to users as D.** Kids Lock forces all five
current capabilities to deny, and forces the future Web capability to deny — which
[web-permission-discovery.md](web-permission-discovery.md) already locked in as a discovery decision
("Kids Master Lock → Web **forced off** (cannot enable)") and which the appendix
graph encodes at `:1269-1270`.

What keeps working under the lock: Ask against a local or LAN Ollama, the offline
knowledge base, character/persona, settings that touch nothing privileged. That is
the FOSS/self-hosted stance holding — the lock removes *reach off the device and
into the user's files*, not the local assistant.

---

## 3. Architecture

### Runtime probe, never persisted

Do **not** cache lock state in `settings.json`:

- A stale `false` is a silent safety failure; a stale `true` bricks a parent's Deck
  with no in-plugin way out.
- Every persisted field costs six files across two languages and two test suites
  (`CLAUDE.md` § Where settings live) and feeds the known TS/Python
  dual-declaration problem that `REFACTOR-PLAN.md` Phase 3.1 exists to fix.
- The API is a live subscription anyway. Persisting a snapshot of a push stream is
  strictly worse than keeping the stream.

Keep the subscription open for the plugin's lifetime and re-push on every change,
rather than doing one bounded read at mount. Steam fires on change (that is the
method's whole purpose), and a parent unlocking mid-session should lift the lock
without a plugin reload.

### The backend guard

`capability_enabled(settings, key)` is a pure function over the settings dict,
called from 12 sites. Two ways to add the guard:

1. **Module-level runtime flag in `capabilities.py`** — a `set_kids_lock_active()`
   / `kids_lock_active()` pair, checked at the top of `capability_enabled()`.
   Zero changes at the 12 call sites; the entire diff is one file plus one RPC.
   Module-level mutable state is mildly unfashionable, but here it is one flag in
   the one module that owns the concept, and it is what keeps this a
   behaviour-preserving single-commit change.
2. **A third parameter** — `capability_enabled(settings, key, kids_lock=False)`.
   Purer, but touches all 12 sites and every existing test, and every future call
   site can forget to pass it. That "forgot to pass it" failure mode fails *open*,
   which is the wrong direction for a safety guard.

**Recommend (1).** The flag defaults to `False` and resets on every plugin load
(`main.py:319` `_main`), so a backend restart never leaves a stale lock. One new
RPC (`set_kids_lock_state`, following the existing `set_intent_pack_enabled`
shape at `main.py:909`) carries the state from TS.

Guard placement matters: put it in `capability_enabled()`, **not** in
`sanitize_capabilities()`. Sanitizing to `False` would rewrite the user's stored
preferences, so unlocking would not restore them.

### Trust boundary — say it out loud

The backend cannot verify the claim. A frontend that lies (or a `dist/index.js`
that has been edited) can assert `kids_lock_active = false`. **This is a
guardrail, not a security boundary**, and the README copy must not imply
otherwise. It is still worth building: the realistic scenario is a kid poking at
a QAM panel, not a kid patching a rollup bundle. Note also that under Family View
Steam blocks its own Settings/Console routes (`5640.js:68-85`), while Decky's QAM
panel is injected rather than routed — so bonsAI probably stays reachable under
the lock. That is precisely *why* this feature has value. **Unverified** — spike it.

### UNKNOWN must fail open — and that must be documented

Prior art says treat UNKNOWN as locked. For bonsAI that would mean: any Deck where
the probe times out loses filesystem writes, screenshots, logs and mic. That is a
mass regression for existing users triggered by a timeout. So:

- **UNKNOWN → unlocked** (today's behaviour preserved).
- **Latch on observation**: once `locked: true` has been seen in a session, only an
  explicit `locked: false` callback clears it — never a timeout, error, or
  unregister.

Nobody gets to call that airtight, which is why it appears in the
[cannot-promise list](#cannot-promise--for-readme--troubleshooting).

### Permissions tab interaction

`src/components/PermissionsTab.tsx` renders one combined game-context toggle
(`:59-70`) plus three rows from `ROWS` (`:16-37`). When locked:

- Render every `ToggleField` **disabled and visually off**, with the stored value
  still shown as the underlying truth — do not mutate `capabilities` state, so
  unlocking restores the user's real settings without a round trip.
- Add a banner row above the existing intro block (`:50-56`).
- Override impossible in the UI, by design. There is no bonsAI-side unlock —
  the unlock lives in Steam.
- Anything new here needs a focus-graph entry for D-pad navigation
  (`CLAUDE.md` § Conventions, `.cursor/rules/decky-focus-graph.mdc`) — a disabled
  `ToggleField` still has to not trap focus.

---

## 4. UX / legal copy

Hard constraints:

- **Never** "safe for kids", "child-safe", "kid mode", or anything implying the AI's
  *output* is filtered. Content moderation of replies is explicitly out of scope,
  and there is no filter.
- Always attribute the signal to Steam — "when Steam reports…" — never "bonsAI
  detects a child account".
- "Best effort", matching the existing README register, which already uses that
  exact hedge for Strategy spoiler hiding and VAC results (`README.md:5`).
- No unlock instructions that assume a PIN. Steam Families child accounts **do not
  have** a local PIN unlock (see below); telling a parent to "enter your PIN" would
  be wrong for the newer account type.

Draft banner for the Permissions tab (needs a maintainer copy pass, not shipped
as-is):

> **Parental controls active.** Steam reports that parental controls are locked on
> this account, so bonsAI keeps every high-impact permission off — no file writes,
> no screenshots or game logs, no microphone, no Steam ban lookups. Ask still works
> with your local AI. These switches turn back on by themselves when Steam's
> parental controls are unlocked. bonsAI does not filter what the AI says.

That last sentence is the important one and should not be cut for length.

---

## 5. Dependencies and testing

### Blocker relationship with Web permission

[web-permission-discovery.md](web-permission-discovery.md) already commits to "Web **forced off**
(cannot enable)" under Kids Lock, and `:1130` lists Kids Master Lock as a
dependency of the Web item. So **Kids Lock is a hard predecessor for shipping
Web** — ship Web first and that roadmap line becomes an unenforced claim in a
feature whose entire risk profile is "Ask text leaves the Deck". The Web
ConfirmModal (`:1124`) must check lock state before it can even be opened.

Kids Lock itself has no blockers. The Capability Permission Center it depends on
is already shipped, and the Steam signal is confirmed available.

### Testing matrix

| Layer | What | How |
|---|---|---|
| Vitest — probe | sync-fire, async-fire, never-fire (timeout), `register()` throws, `SteamClient.Parental` absent, `locked` true→false→true, unregister-leak | Extend the `SteamClient` stub at `src/test-harness/setup.ts:37-45`, which today only fakes `URL.ExecuteSteamURL` |
| Vitest — UI | banner renders when locked; all toggles disabled; stored capability values survive lock/unlock | `PermissionsTab` render tests |
| Python | each of the 5 keys denied when flag set; restored when cleared; flag defaults `False`; `sanitize_capabilities` unchanged by locking | `tests/test_capabilities.py` |
| On-Deck — cheap | Enable Family View on a **spare adult account**, lock it, confirm `locked: true` and that bonsAI greys out; unlock, confirm restore | No child account needed. This is the primary manual gate. |
| On-Deck — real | Steam Family with an actual child account | Needs a second real account in a Family group; may not be feasible pre-ship |
| Regression | Every existing user path with no parental controls configured at all | Must be byte-identical to today |

Update `docs/testing.md` in the same change set as the implementation
(`CLAUDE.md` § Conventions).

### Open risk — the one thing I could not verify

**Does a Steam Families child account report `locked: true`?**

The reasoning says yes: Valve's migration removed local PIN unlock for child
accounts ("the ability to unlock controls by entering a PIN will be removed"),
and Steam's client gates every restricted route on `isParentalLocked`
(`5640.js:198-200`, `:221-247`) — so for a child account the flag has to stay
true or nothing would be enforced at all. Consistent with that, `hasPassword`
(`:215-217`) would be **false** for such an account, since there is no local
password hash. But I have no child account to test against, so this is inference
from Steam's own code plus Valve's migration notes, not observation.

If it turns out `locked` is false for child accounts and the restriction lives
only in the decoded `is_enabled` / `enabled_features` blob, the fallback is to
ship the protobuf decode after all — which raises the estimate to ★★★★ but does
not change the go/no-go. **Resolve this in the spike before writing code.**

---

## 6. Spike steps (on-Deck, before any implementation)

Run in the CEF console against SharedJSContext
([Decky frontend debugging](https://wiki.deckbrew.xyz/plugin-dev/cef-debugging)),
in order. Record results back into this file.

1. **Existence** — `typeof SteamClient?.Parental?.RegisterForParentalSettingsChanges`
   on a normal, unrestricted account. Expect `"function"`.
2. **Initial fire + timing** — register a logging callback on an unrestricted
   account. Does it fire? Synchronously inside `register()`, or on a later tick?
   How long until first fire? (Sets the probe timeout.) Log
   `{ever_enabled, locked, byteLength: settings?.byteLength, hasPlaintext: !!strPlaintextPassword}`
   — **do not log `strPlaintextPassword` itself.**
3. **Family View, adult account** — enable Family View on a spare account, lock it,
   re-run (2). Confirm `locked: true`. Unlock; confirm a change callback with
   `locked: false` arrives without re-registering.
4. **Decky reachability under lock** — with Family View locked, confirm the Decky
   QAM tab and the bonsAI panel are still reachable. If Steam already blocks Decky
   entirely, the feature's value drops sharply and the priority should be revisited.
5. **Child account** — resolve the [open risk](#open-risk--the-one-thing-i-could-not-verify).
   Log `locked`, `ever_enabled`, and whether the decoded blob is non-empty.
6. **Backend blind spot** — from a Deck shell, grep `~/.local/share/Steam` and
   `~/.steam/steam/userdata/<id>/config` for anything parental-shaped while locked.
   Expected outcome: nothing usable. This exists to *close* the question, not to
   find a solution.
7. **Update survival** — after the next SteamOS/Steam client update, re-run (1)
   and (2). The whole design rests on `SteamClient.Parental` staying put.

## Spike results

Recorded 2026-08-09. Live Family View / child-account CEF console runs were **not**
completed before implementation; the maintainer authorized **implement after a green
gate** and then full plan execution. Gate decision below uses research evidence
already in this file plus deferred on-Deck confirmation via **KIDS-LOCK-01…02**.

| Step | Result | Notes |
|---|---|---|
| KML-0.1 API exists | **Proceed (typed)** | `@decky/ui` declares `SteamClient.Parental.RegisterForParentalSettingsChanges`; Steam Big Picture store uses the same API (`5640.js` cited in §1). Live CEF `typeof` still owed on Deck. |
| KML-0.1 ms-to-first-fire | **Assumed sync / ≤2s** | Steam's own `Init()` resolves inside the first callback (sync). Probe default timeout set to **2000ms** until a live ms measurement replaces it. |
| KML-0.2 Family View `locked` | **Deferred → KIDS-LOCK-01** | Primary manual gate on spare adult account + unlock callback without re-register. |
| KML-0.3 Decky under lock | **Deferred → KIDS-LOCK-01** | If Decky is unreachable under lock, treat as **DROP** per plan 14 decision gate and revisit. |
| KML-0.4 Child account | **Open → KIDS-LOCK-02** | May stay Open if no Steam Families child account. If `locked` is false there, Stage 6 (protobuf) is in scope. |
| Backend blind spot | Not run | Still expected: nothing usable on disk. |

**Decision gate:** **Proceed Stages 1–5** (Family View `locked: true` not yet observed live;
DROPPED only if KML-0.3 fails on-Deck). Initial probe timeout: **2000ms**.

---

## Cannot promise — for README / troubleshooting

Lift these into user-facing docs when the feature ships:

- **We do not filter what the AI says.** Kids Lock turns off permissions. It does
  not moderate, censor, or age-rate model output. A local model can still produce
  anything a local model can produce.
- **This is not a security boundary.** It is a guardrail against casual use. Anyone
  who can edit the plugin's files or use developer tools can bypass it.
- **We only know what Steam tells us.** If Steam does not report parental controls
  as locked, bonsAI behaves normally. If Steam changes or removes this API in an
  update, the lock may stop working until bonsAI is updated.
- **If we cannot read the signal, permissions stay as you set them.** bonsAI does
  not lock down on a failed or timed-out read — that would break Decks with no
  parental controls at all.
- **Not a playtime limit, not a content filter, not a game blocker.** Those are
  Steam's, and bonsAI does not implement, extend, or enforce them.
- **No bonsAI PIN.** There is no bonsAI-side unlock. Unlocking happens in Steam.
- **Only covers bonsAI.** Other Decky plugins are unaffected.

---

## If the signal had not existed (recorded for completeness)

It does, so this is moot — but for the record: a bonsAI-owned "Kids mode" toggle
with its own parent PIN would be the wrong call. It means owning PIN storage,
hashing, rate limiting, and a recovery story, for a lock any kid can defeat by
deleting `settings.json`. If `SteamClient.Parental` ever regresses, the honest
fallback is a plain unlockable **Kids mode** toggle in Settings, documented as an
honour-system convenience with no PIN and no security claim — or deferring the
feature outright.

---

## Effort estimate — implementation phase

**★★★.** Scope priced: TS probe module with the sync-fire/latch handling + tests;
one new RPC on `class Plugin`; module-level flag and guard in `capabilities.py` +
tests; Permissions tab banner and disabled states + focus-graph entry; README and
troubleshooting copy; `docs/roadmap.md` and `docs/testing.md` updates. No protobuf
decoder, no new persisted settings field, no changes at the 12 existing guard call
sites.

Rises to **★★★★** only if spike step 5 forces protobuf decoding of the
`ParentalSettings` blob into v1.

Roadmap currently rates this ★★★★★ — that rating was set while "a detectable
Steam signal" was an open question. Suggest re-rating to ★★★ once the spike
confirms step 3 and step 5.
