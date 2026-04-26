# Steam Input Search + Jump Research Brief

Planning artifact for roadmap item **Steam Input Settings Search + Jump (Research-First)** in `docs/roadmap.md`.

## Project status

- **Phase 1 (Debug tab jump, lexicon scaffold, `steamInputJump` helper):** **Complete** and marked in `docs/roadmap.md`.
- **Phase 2+** (full searchable catalog, unified search UI, ranked results, exhaustive Edit Layout enumeration): **not** planned to continue unless the roadmap item is explicitly revived.

## Objective

Determine whether BonsAI can reliably map user search text (for Steam Input settings) to a navigation target that opens the most relevant Steam Input settings surface, while preserving stable fallback behavior if exact deep-linking is unsupported.

## Key research questions

- Can Decky or Steam expose a stable API for opening specific Steam Input pages?
- If direct deep links are unavailable, can we route to the nearest reliable parent page (for example controller settings root) and guide the last steps?
- Are Steam Input settings per-game, global, or both for each searchable setting term?
- Which setting names are stable enough to index without version-fragile string matching?
- What is the minimum route confidence threshold before showing a jump button versus guidance-only output?

## Hypotheses to test

- **H1:** Exact per-setting deep-linking is not universally available through public plugin APIs.
- **H2:** A hybrid approach (best-effort jump + transparent manual breadcrumb fallback) is feasible and maintainable.
- **H3:** User trust improves when each result includes confidence labeling and a visible fallback path.

## Candidate integration paths

1. **Path A: Exact deep-link (if supported)**
   - Resolve search term -> canonical Steam Input setting key -> navigate.
   - Requires public/stable route API support.
2. **Path B: Nearest-screen jump + breadcrumb**
   - Resolve term -> nearest known settings screen -> display one to three manual steps.
   - Preferred fallback when full deep-link precision is unavailable.
3. **Path C: Guidance-only mode**
   - No runtime navigation call; provide ranked setting matches and step-by-step path text.
   - Lowest risk, highest compatibility baseline.

## Fallback UX policy

- Always show ranked matches even if navigation is unavailable.
- Show route confidence label per result (`Exact`, `Near`, `Manual only`).
- If exact jump fails at runtime, degrade to breadcrumb guidance with no hidden retry loops.
- Keep all fallback text local and deterministic (no mandatory network dependency).

## Data and indexing prep (planning)

- Draft a searchable setting lexicon with:
  - canonical term
  - aliases/synonyms
  - scope (`global`, `per-game`, `unknown`)
  - preferred target route (if any)
  - fallback breadcrumb text
- Keep lexicon versioned and human-editable to survive Steam UI wording changes.

## Validation checklist

- [ ] Verify behavior for global Steam Input terms.
- [ ] Verify behavior for per-game controller layout terms.
- [ ] Verify handling when game context is missing.
- [ ] Verify confidence labels map to actual navigation success rates.
- [ ] Verify fallback breadcrumb text still works after Steam client update.
- [ ] Verify no private UI patching is required for supported path.
- [ ] Verify controller-only flow (no touch required) for result selection.

## Out of scope for this research spike

- Direct editing/writing of Steam Input configuration files.
- Runtime patching of private Steam client internals.
- Claims of guaranteed exact deep-linking across all Steam versions.

---

## CEF remote debugging (route discovery)

Use this to learn real Big Picture `pathname` values as you move through Steam Input with a controller.

### Safety

CEF remote debugging exposes a powerful control surface. Enable only on trusted networks, disable when finished. See [DeckThemes CEF debugger notes](https://docs.deckthemes.com/CSSLoader/Cef_Debugger/) and [Decky loader discussion](https://github.com/SteamDeckHomebrew/decky-loader/issues/289) for port and security context.

### Steps (Game Mode / Big Picture)

1. Enable **CEF remote debugging** in Steam (exact menu location depends on Steam channel and version).
2. Note the Deck’s LAN IP (**Settings → Internet** on the Deck, or `ip addr` in Konsole).
3. On a desktop machine, open Chrome/Chromium at `chrome://inspect/#devices`.
4. Under **Discover network targets**, choose **Configure…** and add `DECK_IP:8081` (or `:8080` if that is what your build uses).
5. Under **Remote Target**, open the entry that corresponds to the **main Big Picture web UI** (often named like **Steam Big Picture Mode**). Decky plugin logs usually live under **SharedJSContext**; route sniffing for Steam’s own settings UI must use the Big Picture target, not SharedJSContext.
6. Open the **Console** on that target and paste the snippet below once per full UI reload.

### Console snippet (History API hook)

Logs `location.pathname` (plus search/hash) whenever history changes:

```js
(() => {
  if (window.__bonsaiHistoryHook) {
    console.warn("history hook already installed");
    return;
  }
  window.__bonsaiHistoryHook = true;

  const log = (reason) => {
    console.log(`[route] ${reason}`, location.pathname + location.search + location.hash);
  };

  const wrap = (name, orig) =>
    function (...args) {
      const ret = orig.apply(this, args);
      log(name);
      return ret;
    };

  history.pushState = wrap("pushState", history.pushState);
  history.replaceState = wrap("replaceState", history.replaceState);
  window.addEventListener("popstate", () => log("popstate"));

  log("initial");
})();
```

**Reading results:** If sub-tabs change the UI but **nothing logs**, those tabs are likely driven by local React state, not URL routes — use breadcrumb / `steam://` fallbacks (Path B/C in this doc). If paths log, copy the stable segments into [src/data/steam-input-lexicon.ts](../src/data/steam-input-lexicon.ts) as `primaryPathTemplate` (with `{appId}` where the numeric app id appears).

### Verified routes log (maintainer)

Record each confirmed template only after on-Deck verification. Bump `STEAM_INPUT_LEXICON_VERSION` in `src/data/steam-input-lexicon.ts` when changing entries.

| Steam build / channel | Decky / @decky/ui | Setting / screen | primaryPathTemplate | steamUrlTemplate | Confidence | Notes |
|----------------------|-------------------|------------------|---------------------|------------------|------------|-------|
| *(fill after test)*  | *(fill)*          | Per-game layout  | *(optional)*        | `steam://controllerconfig/{appId}` | Near | Phase 1 default |

---

## Steam client updates and regression discipline

Big Picture routes and `steam://` handling are **not** a stable public API. Ongoing maintenance is expected.

1. **After Steam client or SteamOS updates** that may touch Big Picture or Input, skim official release notes / changelogs (Valve hubs, Steam news, SteamOS release notes).
2. **Smoke test on hardware:** Debug tab → **Jump to Steam Input (running game)** with a known title focused; confirm the expected surface opens.
3. If behavior regresses, **document** Steam build, `@decky/ui` version, what opened instead, and which fallback ran; adjust `src/data/steam-input-lexicon.ts` or breadcrumb copy and bump `STEAM_INPUT_LEXICON_VERSION`.
4. Optional maintainer workflow: ingest a structured setting list (canonical term, aliases, scope, templates, breadcrumbs) into the lexicon array as follow-on milestones expand beyond Phase 1.

### Implemented code (Phase 1)

- Lexicon: [`src/data/steam-input-lexicon.ts`](../src/data/steam-input-lexicon.ts)
- Jump helper: [`src/utils/steamInputJump.ts`](../src/utils/steamInputJump.ts)
- UI entry: **Debug** tab → **Jump to Steam Input (running game)**
