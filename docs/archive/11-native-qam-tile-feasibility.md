# 11 — Native QAM shortcut tile + Decky decoupling — feasibility (2026-08-04)

> **Replaced 2026-09-23 by [plan 66](../planning/66-quick-tab-own-menu-icon.md).** A separate plugin, Quick Tab, now
> gives any Decky plugin its own menu icon, so the "blocked on Decky's team" verdict below no longer holds. Kept for its
> section on running bonsAI outside Decky, which the roadmap's "one decision for three items" entry still leans on.

**Status:** Research only (2026-08-04). **No implementation, no fork, no install-doc change.**
**Roadmap item:** ★★★★★★ **Native QAM shortcut tile** ([roadmap.md](../roadmap.md) → Planned, "under Decky; upstream research").
**Related:** [troubleshooting.md](../troubleshooting.md) §5 (Guide-chord macro, `bonsai:shortcut-setup-deck`).

---

## TL;DR

1. **A Decky plugin cannot register a sibling QAM tab today.** The mechanism exists and works — `TabsHook.add()` in decky-loader — but it is a **private field** and is deliberately **not** in the object handed to plugins. This is an API-surface fact, not a sandbox/security fact (see [Correction](#correction-to-troubleshootingmd-5) below).
2. **The upstream feature was already built, tested on-device, and closed unmerged.** [decky-loader PR #909](https://github.com/SteamDeckHomebrew/decky-loader/pull/909) (`feat: allow pinning plugins to top-level QAM`, 12 files) was closed by the lead maintainer with the single comment **"ai"** — an AI-authorship rejection, with **no technical review**. Tracking issue [#887](https://github.com/SteamDeckHomebrew/decky-loader/issues/887) is still open and unassigned.
3. **Full decoupling is not realistic for a QAM-shaped tool.** Everything bonsAI is *for* — answering about the game you are playing, without leaving it — lives inside the Steam Big Picture React tree. Leaving Decky means leaving the QAM, which means leaving the product.
4. **The honest v1 answer:** stay a Decky plugin. Spend the effort on **discoverability inside Decky** (★) and keep the macro docs. Treat the native tile as **blocked on an upstream social decision**, not on engineering.

---

## 1. Can a plugin register a left-rail QAM entry today?

**No.** Evidence, from decky-loader `main` @ 2026-08-02:

| Fact | Source |
|---|---|
| QAM tabs are injected by patching the minified Steam React tree — `findModuleByExport(… 'QuickAccessMenuBrowserView')`, then `afterPatch(renderer, 'type', …)` and `existingTabs.push(tab)` | `frontend/src/tabs-hook.tsx` |
| `TabsHook` supports `add(tab)` / `removeById(id)` and each entry becomes a **first-class sibling tab** with its own rail icon | `frontend/src/tabs-hook.tsx` |
| `private tabsHook: TabsHook = new TabsHook()` — **private**; `routerHook` and `toaster` next to it are `public` | `frontend/src/plugin-loader.tsx:72-74` |
| Decky adds exactly **one** tab, its own: `this.tabsHook.add({ id: QuickAccessTab.Decky, … })` (`QuickAccessTab.Decky` = **999**) | `frontend/src/plugin-loader.tsx:107-115` |
| The API object given to plugins exposes `routerHook`, `toaster`, `openFilePicker`, `executeInTab`, `fetchNoCors`, `injectCssIntoTab`, `removeCssFromTab`, `getExternalResourceURL`, `useQuickAccessVisible` (v2) — **`tabsHook` is absent from both the modern and legacy API objects** | `frontend/src/plugin-loader.tsx:700-790` |

So plugins render **inside** Decky's single tab (`PluginView`), one level down. `plugin.json` has no flag for this either — bonsAI's own [plugin.json](../../plugin.json) carries `"icon"` and `"flags": []`, both consumed by the Decky plugin *list*, not by the QAM rail.

### What upstream would have to ship

PR #909 is the reference implementation and its own answer to "how big is this?":

- `tabs-hook.tsx` extended from add-only to **ordered add + remove**.
- New `PinnedPluginsService`, mirroring the existing `HiddenPluginsService` / `FrozenPluginService` pattern (`frontend/src/hidden-plugins-service.tsx`, `frozen-plugins-service.tsx`).
- `pinnedPlugins: string[]` on `DeckyState`; persisted setting; cleared in `cleanup_plugin_settings` on uninstall.
- Stable numeric tab ids in `[100, 998]` derived from plugin name, so pinned tabs sit between Steam's built-ins and `QuickAccessTab.Decky` (999).
- 12 files changed, 1 commit, en-US strings only (Weblate fallback for other locales).

**Maintainer burden — the real objection.** `tabs-hook.tsx` is a patch against *minified Steam client internals*. Its commit history is thin and reactive: `Fixes for march 19th 2026 beta (#890)`, then nothing since `Rewrite router/tabs/toaster hooks (#661)` in Aug 2024. It breaks on Steam client betas on a recurring basis — issues [#202](https://github.com/SteamDeckHomebrew/decky-loader/issues/202), [#339](https://github.com/SteamDeckHomebrew/decky-loader/issues/339), [#448](https://github.com/SteamDeckHomebrew/decky-loader/issues/448), [#631](https://github.com/SteamDeckHomebrew/decky-loader/issues/631), [#888](https://github.com/SteamDeckHomebrew/decky-loader/issues/888), [#918](https://github.com/SteamDeckHomebrew/decky-loader/issues/918). Every extra tab shape is another thing to re-verify each time Valve ships a client update. A maintainer declining to widen that surface is a defensible call **independent of** the AI-authorship reason actually given.

### Why the feature is stalled (be precise about this)

PR #909 was **not rejected on technical grounds**. Timeline:

- 2026-03-10 — issue #887 opened by a user; 1 comment ("upvote"); still **open**.
- 2026-05-24 — PR #909 opened, marked ready, self-reported as tested on a ROG Ally X + Bazzite with dev decky-loader.
- 2026-06-06 — closed by `AAGaming00`. Full review body: **`ai`**. Zero formal reviews on the PR.
- 2026-06-06 — author's reply asked the project to publish a no-AI pledge in the README so contributors know up front, and withdrew gracefully.

There is currently **no AI-contribution policy** in decky-loader's README or CONTRIBUTING. The project is **GPL-2.0**, 7.1k stars, 249 forks, actively pushed.

**This matters to bonsAI specifically.** bonsAI is an AI product developed with heavy agent assistance, and that is visible in its commit history. An upstream contribution from this repo carries a live risk of the same one-word close, regardless of quality. Any upstream ask must lead with human authorship and on-device verification, or it should not be sent at all.

---

## 2. Is there a non-Decky path? (option D)

**No official one.** Valve ships no public extension point for the Quick Access Menu. There is no manifest, no registry, no signed-plugin path, no documented tab API. Decky exists precisely because the only way in is React-tree patching against the shipped client. Nothing in the 2026 SteamOS / Steam Deck material indicates that changing.

The one *supported* Steam integration is **non-Steam game shortcuts** — and it is the wrong shape. A shortcut launches bonsAI as an **app**, which in Game Mode means gamescope switches focus to it: it **replaces** the running game rather than overlaying it. `Router.MainRunningApp` would then report bonsAI itself, not the game — which breaks the feature the tool is built around.

---

## 3. What bonsAI actually depends on

Measured on this tree, not assumed.

### Frontend — genuinely coupled

| Symbol | Sites | Notes |
|---|---|---|
| `Focusable` | 13 | D-pad focus graph — see `.cursor/rules/decky-focus-graph.mdc` |
| `PanelSectionRow` / `PanelSection` | 8 / 5 | QAM panel chrome |
| `ToggleField` / `TextField` / `Button` / `Dropdown` | 6 / 3 / 3 / 1 | Steam-native controls |
| `ConfirmModal` + `showModal` | 5 + 2 | |
| `Router.MainRunningApp` | **13** | `useBonsaiAskOrchestration.ts` (×6), `useScreenshotBrowser.ts` (×2), `useStrategyChecklistSession.ts` (×3), `CharacterPickerModal.tsx:144`, `steamInputJump.ts:33` |
| `Tabs` + `QuickAccessTab` | 1 + 1 | `src/index.tsx` — `Navigation.OpenQuickAccessMenu(qamTab)` at `useSteamSettingsSearch.ts:43` |
| `Navigation` | — | `NavigateToExternalWeb`, `OpenQuickAccessMenu` |
| `toaster` | ~20 | Reply-ready toast is a **shipped, roadmap-tracked dependency** for hands-free wake when QAM is closed |
| `useQuickAccessVisible` | 1 | `src/index.tsx:145` — drives `setReplySurfaceVisible` |
| `call` | 1 | wrapped once in [deckyCall.ts](../../src/utils/deckyCall.ts) |

77 imports from `@decky/api` / `@decky/ui` across 61 files.

**The important read:** almost all of that is `@decky/ui`, which is a **Steam UI component library**, not a Decky-loader runtime dependency. `Focusable`, `PanelSection`, `Router`, `Navigation` are re-exports of Steam's own modules. A hypothetical non-Decky QAM injector would still need every one of them. Decky-loader-the-runtime is really only: `definePlugin`, `call`, `toaster`, `useQuickAccessVisible` — four symbols.

### Backend — barely coupled at all

Only **3 of 51** Python files import `decky`, and only for paths and logging:

- `decky.DECKY_PLUGIN_SETTINGS_DIR` ×16, `decky.HOME` ×5, `decky.logger` ×3, `decky.DECKY_PLUGIN_RUNTIME_DIR` ×2, `decky.DECKY_PLUGIN_LOG_DIR` ×1.
- `main.py:22`, `py_modules/backend/services/game_ai_request.py:18`, `py_modules/backend/services/ollama_ask_service.py:18`.

The 50-module service layer under `py_modules/backend/services/` has **zero** Decky knowledge. The real coupling is the **RPC contract**: 50 public `async def` at indent 4 on `class Plugin` ([CLAUDE.md](../../CLAUDE.md) — "indentation is the contract"), consumed via `callDeckyWithTimeout()`.

**Conclusion:** the backend is already ~95% decoupled by accident of good layering. Extracting it is cheap. It is also **the half that buys nothing**, because the user-facing value is entirely on the frontend side.

---

## 4. Feasibility matrix

| | **A — Stay Decky, improve discoverability** | **A+ — Native QAM tile (upstream)** | **B — Split package (backend as service)** | **C — Standalone app** | **D — Steam shortcut** |
|---|---|---|---|---|---|
| **What ships** | Decky plugin reorder guidance, sharper macro docs, in-app `bonsai:shortcut-setup-deck` | bonsAI as sibling rail icon above the Decky plug | UI stays a Decky plugin; Python becomes a systemd user service + local socket/HTTP | Desktop-mode app or gamescope overlay, own window | Non-Steam game entry launching bonsAI |
| **Steps to reach bonsAI** | QAM → Decky → bonsAI (3) | QAM → bonsAI (2) | unchanged (3) | leave the game entirely | leave the game entirely |
| **Blocked on others?** | **No** | **Yes** — Decky maintainer decision | No | No | No |
| **`Router.MainRunningApp`** | ✅ | ✅ | ✅ | ❌ **gone** — no running-game context | ❌ inverted (reports bonsAI) |
| **`call()` RPC** | ✅ | ✅ | ⚠️ rewrite transport; 50 methods + `deckyCall.ts` + `fakeDeckyRpc.ts` | ❌ replaced wholesale | ❌ |
| **QAM focus / D-pad graph** | ✅ | ✅ (same `PanelSection` tree, new parent) | ✅ | ❌ rebuild controller nav from scratch | ❌ |
| **`toaster` reply-ready** | ✅ | ✅ | ✅ | ❌ no Steam toast surface | ❌ |
| **Deploy zip / install** | unchanged | unchanged | **two** artifacts + service unit; breaks the Decky store install story | new packaging (Flatpak/RPM?) on an immutable, `steamos-readonly` OS | Steam-side, but user must install the app first |
| **Effort** | ★ | ★★ *(bonsAI side ~0 — the cost is upstream)* | ★★★★ | ★★★★★★ | ★★ |
| **Verdict** | **Do this** | **Ask, don't build** | Cost with no user-visible gain | Different product | Wrong shape |

**Reading the matrix:** the only column that improves the actual complaint (too many steps) without destroying the product is **A+**, and bonsAI's engineering share of A+ is roughly zero — the work is upstream, and upstream has already rejected an implementation of it once. **B** is the trap: it is the most *technically* satisfying option, and it changes nothing a user can see while still needing Decky for the panel. **C** is not a decoupling of bonsAI; it is a different program that happens to share a model backend.

---

## 5. Risks and policy

- **Security model.** Decky plugins are not sandboxed from each other in any meaningful sense; the backend runs as a normal Python process under `plugin_loader.service`. The barrier to a sibling tab is API surface (`private tabsHook`), not a privilege boundary. bonsAI's own capability gating ([PermissionsTab](../../src/components/PermissionsTab.tsx), Capability Permission Center) is bonsAI's, not Decky's.
- **Valve / ToS.** Decky is unofficial homebrew; Valve neither supports nor blocks it. Shipping a **forked Steam client** or undocumented client patches is out of scope by roadmap decision and should stay that way — it would make bonsAI responsible for every Steam client update, and it is not defensible to recommend to end users.
- **Why "undocumented injection" stays out of scope.** bonsAI could technically reach `window.__TABS_HOOK_INSTANCE` (set in `tabs-hook.tsx`) and call `add()` on Decky's private hook from plugin code. **Do not.** It would (a) depend on a private field with no compatibility promise, (b) break silently on any Decky refactor, (c) leave an orphan tab when bonsAI unloads unless removal is also hooked, and (d) be exactly the kind of thing that gets a plugin pulled from the store. Naming it here so nobody re-derives it and thinks it is clever.
- **FOSS / transparency.** decky-loader is GPL-2.0 with 249 forks, so a fork is *licensed*. It is not *advisable*: it would fork the plugin store, the update channel, and the Steam-beta break-fix treadmill onto bonsAI. Upstream contribution or nothing.

---

## 6. Upstream ask template

For [#887](https://github.com/SteamDeckHomebrew/decky-loader/issues/887) — **comment on the existing issue first; do not open a PR cold.**

> **Re: pinning plugins to the top-level QAM**
>
> Maintainer question before anyone writes more code: **is this feature wanted in principle?**
>
> PR #909 implemented it (ordered add/remove in `tabs-hook`, a `PinnedPluginsService` mirroring `HiddenPluginsService`, stable tab ids in `[100, 998]` below `QuickAccessTab.Decky`) and was closed without technical review. I am not asking you to reconsider that PR. I am asking whether the *feature* has a path, so that a contributor can decide whether to spend the time.
>
> Specifically, three things would settle it:
>
> 1. **Is a per-plugin pinned QAM tab something you would accept at all**, or is the answer "no, the rail stays one Decky tab"? A "no" is a fine answer and saves everyone effort.
> 2. **If yes — what is the shape you want?** Opt-in per plugin from the existing plugin-list context menu (as #909 did), or plugin-declared via a `plugin.json` flag, or something else? The maintenance concern I would raise myself is that `tabs-hook.tsx` patches minified Steam internals and breaks on client betas (#888, #918, #631); more tab shapes means more to re-verify each time. If that cost is the blocker, say so and I will stop asking.
> 3. **Is there a contribution policy** — AI assistance, review expectations, on-device test evidence — that a contributor should read first? #909's author asked for this to be written down in the README. Publishing it would prevent the next round of wasted work.
>
> Context for why I care: bonsAI is a self-hosted AI assistant plugin. Users reach it via QAM → Decky → plugin list, and the current workaround is a Steam Input Guide-chord macro with hand-tuned per-step delays, which is not something we can recommend to non-power-users.

**Rules for actually sending this:**
- Post it as a **human**, from a human account, in the maintainer's terms. Do not paste agent output.
- **Do not** attach a PR, a patch, or a diff on first contact. The ask is a yes/no on the feature.
- If the answer is no, or there is no answer in ~60 days, **close the roadmap item** and stop. Do not fork.

Nothing to ask Valve. There is no channel and no product surface to ask about.

---

## 7. Recommendation

**Do (bonsAI-only, unblocked, ★):**
1. Keep the roadmap item at ★★★★★★ but re-label it **`upstream-blocked`**, not `planned`. Link #887 and #909 so the next session does not re-derive this.
2. Document what *does* work today: Decky's plugin list is **drag-reorderable**, so putting bonsAI at position 1 removes every D-pad step after the Decky tab opens. That is the single highest-value, zero-code discoverability win and it belongs in [troubleshooting.md](../troubleshooting.md) §5 as step 0, ahead of the macro recipe.
3. Fix the §5 wording (below).

**Do not:**
- Build option B or C. Neither improves the user's path; C deletes the product's premise.
- Fork decky-loader.
- Touch `window.__TABS_HOOK_INSTANCE`.
- Change install docs away from Decky. There is no upstream path to change them *to*.

**Timeline, honestly:** bonsAI-side work is hours (docs). The native tile is **indefinite** — it depends on one maintainer's decision on a feature whose only implementation was closed with a one-word comment, in a project with no published contribution policy. Plan as if it never lands. If it does, bonsAI's adoption cost is near zero: PR #909's design pins *existing* plugins with no plugin-side changes at all.

### Correction to troubleshooting.md §5

Current text: *"Because Decky Loader acts as a secure container for plugins, we cannot force a custom QAM tile for BonsAI."*

That reads as a security boundary. It is not — it is an unexposed API (`private tabsHook`, `plugin-loader.tsx:72`) plus a maintenance-surface concern. Suggested replacement:

> Decky Loader renders every plugin inside its own single QAM tab, and its tab-registration API is internal — plugins have no supported way to add a sibling icon to the QAM rail. Upstream request: [decky-loader#887](https://github.com/SteamDeckHomebrew/decky-loader/issues/887).

---

## Sources

- [decky-loader](https://github.com/SteamDeckHomebrew/decky-loader) — `frontend/src/tabs-hook.tsx`, `frontend/src/plugin-loader.tsx` (main @ 2026-08-02)
- [Issue #887 — Add the ability to pin plugins to the QAM](https://github.com/SteamDeckHomebrew/decky-loader/issues/887) (open)
- [PR #909 — feat: allow pinning plugins to top-level QAM](https://github.com/SteamDeckHomebrew/decky-loader/pull/909) (closed unmerged)
- [PR #661 — Rewrite router/tabs/toaster hooks](https://github.com/SteamDeckHomebrew/decky-loader/pull/661)
- Steam-beta breakage: [#202](https://github.com/SteamDeckHomebrew/decky-loader/issues/202) · [#339](https://github.com/SteamDeckHomebrew/decky-loader/issues/339) · [#448](https://github.com/SteamDeckHomebrew/decky-loader/issues/448) · [#631](https://github.com/SteamDeckHomebrew/decky-loader/issues/631) · [#888](https://github.com/SteamDeckHomebrew/decky-loader/issues/888) · [#918](https://github.com/SteamDeckHomebrew/decky-loader/issues/918)
- [decky-frontend-lib](https://github.com/SteamDeckHomebrew/decky-frontend-lib) · [Deckbrew wiki — new API migration](https://wiki.deckbrew.xyz/en/plugin-dev/new-api-migration)
- [Decky Loader homepage](https://decky.xyz/)
