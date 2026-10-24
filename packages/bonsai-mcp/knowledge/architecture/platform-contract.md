---
id: platform-contract
title: Decky platform contract
description: One-page focus, CSS, and build parity summary
---

# Decky platform contract (bonsAI)

## Focus-graph first

D-pad navigation uses Decky `Focusable` callbacks (`onMoveLeft`, `onMoveRight`, `onMoveUp`, `onMoveDown`, `onOKButton`, `onCancelButton`, `onButtonDown`) — not DOM `keydown`.

**New UI controls:** design the graph at the **section parent** level; use a document-flow **focus bridge** for sliders and other non-flow children. Full patterns and file references: `bonsai://architecture/focus-graph-patterns`. Policy: `bonsai://policy/decky-ui-focus` § **New controls & settings rows**.

## Durable layout

NEVER apply durable layout corrections via ref-set inline styles on React-managed nodes. Route dynamic geometry through CSS custom properties on `bonsaiScopeRef` consumed by `!important` rules, or the JSX `style` prop.

## Build parity

After changes to `src/`, `main.py`, or `plugin.json`, run `plugin.build` (decky-plugin-studio MCP) or `./scripts/build.ps1` / `./scripts/build.sh` before on-device QA.

## Preview vs on-device

Use `preview.start` for fast iteration. Use `deck.deploy` + on-device QA for focus/layout bugs the preview cannot reproduce faithfully.

## Debug sessions

Use decky-plugin-studio MCP: `deck.startTunnel`, `deck.probeIngest`, `deck.tailIngest`, `preview.runSequence`.

Plugin `fetch` to `http://127.0.0.1:7682` on the Deck requires a reverse tunnel from the dev PC unless developing on local SteamOS/Bazzite.

## Key files

- `src/index.tsx` — plugin shell, scoped CSS
- `src/styles/bonsaiScopeStylesheet.ts` — durable scoped CSS
- `src/features/ask/bar/` — ask bar layout
- `main.py` — Decky RPC entrypoint
- `py_modules/backend/<package>/` — the back end, one package per area
