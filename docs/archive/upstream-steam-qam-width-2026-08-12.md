# Upstream: Steam QAM tab panes capped at 300px inside an 806px container

**Filed against:** Valve / SteamOS (Steam client, `steamdeck_publicbeta`)
**Found:** 2026-08-12, while QA-ing bonsAI on device.
**Status:** Not a bonsAI bug. No bonsAI code change made. Draft below is ready to paste
into [ValveSoftware/SteamOS issues](https://github.com/ValveSoftware/SteamOS/issues).

## Why this file exists

A large dead area appeared to the right of the bonsAI plugin panel in the Quick Access
Menu. It looked like a plugin layout regression. It is not: **Steam's own Quick Settings
tab reproduces it identically**, and the constraint comes from a Steam CSS class, not from
`bonsaiScopeStylesheet.ts`. Recording the measurements so this is not re-derived.

Do **not** "fix" this in `src/styles/` — see [Why we did not work around it](#why-we-did-not-work-around-it).

---

## Issue draft (paste target)

### Summary

After a recent `steamdeck_publicbeta` client update, the Quick Access Menu shell renders
much wider than before, but each tab pane is still capped at `max-width: 300px`. Every QAM
tab — including Steam's own — now floats in a container roughly 2.5x its width, leaving a
large empty region to the right of all QAM content.

### Environment

| | |
|---|---|
| Steam update channel | `steamdeck_publicbeta` (`~/.local/share/Steam/package/beta`) |
| Display | Docked. `card0-DP-1` connected alongside internal `card0-eDP-1` |
| External resolution | 1920x1080 |
| QAM window | 855 x 766 CSS px, `devicePixelRatio` 1.28 |

### Expected

Tab pane fills the QAM tab container, as it did prior to the update.

### Actual

Pane is capped at 300px inside an 806px flex container; ~506px is dead space.

Measured live via the Steam client's own CEF remote-debugging endpoint
(`--remote-debugging-port=8080`), `Runtime.evaluate` against the `QuickAccess_uid2` target:

| Element | Class | Width | `max-width` |
|---|---|---|---|
| QAM window | — | 855px | — |
| Tab container | `_32AONYfEkmb0E6cwY31wPP oIVg-eNHeYCNPq0blN3Dk` (`display: flex`) | 806px | — |
| Third-party plugin pane | `_1QO7bWVxsVONFdHDAJGCtF tab_undefined ...` | **300px** | **300px** |
| **Steam's own Quick Settings pane** | `_1QO7bWVxsVONFdHDAJGCtF tab_Settings ...` | **300px** | **300px** |

The pane carries `flex: 1 1 1px` but is held at 300px by the `max-width` on its own class.
No inline width is set (`element.style.width` is empty), so the cap is from a stylesheet
rule, not runtime layout code.

Both panes share the `_1QO7bWVxsVONFdHDAJGCtF` class, which is where the cap appears to
live — so this affects first-party and third-party QAM tabs equally.

### Regression evidence

Same Deck, same dock, same 1920x1080 external display, ~2 weeks apart:

- **2026-07-30** — QAM shell ~348 CSS px; pane at 300px filled it essentially edge to edge.
- **2026-08-12** — QAM shell 855 CSS px; pane still 300px.

The pane cap did not change. The shell width did. Only the Steam client changed between the
two observations.

### Repro

1. Steam Deck on `steamdeck_publicbeta`, docked to an external 1080p display.
2. Open the Quick Access Menu.
3. Select **Quick Settings** (no third-party software required).
4. Observe content occupying a ~300px column on the left of a much wider panel.

### Notes

- Reproduces on Steam's own tab, so Decky Loader and its plugins are not involved.
- Valve has been changing docked-display behaviour in recent beta builds, which is a
  plausible neighbourhood for the shell-width change.
- Not verified undocked — no undocked measurement was taken, so whether this is
  docked-specific is **UNKNOWN**.

---

## Why we did not work around it

Overriding the cap from `src/styles/` was considered and rejected:

1. It would make bonsAI the only ~806px-wide tab in a QAM where Steam's own tabs stay 300px.
2. The bonsAI tab body is a narrow-column layout; stretching it to 806px is not free.
3. It hard-codes a fight against a client bug that will likely vanish on a beta push, at
   which point the override becomes the regression.

The scope stylesheet already carries a lot of QAM-compat workarounds
(`useQamPanelHeightGuard`, `.decky-qam-scope` stretching). Adding a width override that
assumes an 806px container would age badly.

## How to re-measure

The Steam client exposes CEF remote debugging on the Deck at `127.0.0.1:8080`. Forward it
and drive it with the DevTools Protocol:

```bash
ssh -f -N -L 8080:127.0.0.1:8080 deck@$DECK_IP
```

Then `GET http://127.0.0.1:8080/json/list`, take the `webSocketDebuggerUrl` for the
`QuickAccess_uid2` target, and issue `Runtime.evaluate`. This reads the real Steam UI, not
the IDE preview, so it is the only way to confirm a first-party-vs-plugin question like
this one.
