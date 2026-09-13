# Glance view — design handoff

Drawn 2026-09-11 for the roadmap entry **Glance view: the answer alone, in big text** (two stars).
The brief, the values behind every measurement and the open questions are in
[docs/planning/52-frame-features-second-look.md § 6](../../../planning/52-frame-features-second-look.md).

The canvas: https://claude.ai/code/artifact/c48fb3e2-38ef-4c91-997c-c515353eec96

## Files

- `Today.dc.html` — the Main tab as built: tab bar, chat row, transcript, dock. A reference board.
- `Main.dc.html` — the leading candidate: only the answer, edge to edge, text one third bigger.
- `OptionBare.dc.html` — option A as first drawn, before the rail, kept so the rail can be judged against nothing.
- `OptionOneAtATime.dc.html` — option B: one paragraph fills the screen, Down moves on.
- `OptionTabBarStays.dc.html` — option C: the tab bar stays and a Read aloud button sits at the bottom.
- `NewAnswerStays.dc.html` — a new answer arrives while glance is open: glance stays and shows it (recommended).
- `NewAnswerLifts.dc.html` — the same moment, the other way: the full panel comes back on its own.
- `canvas.json` — where each board sits and the sticky notes beside them.

Every board is 300 by 700 px, the real column width. The glance boards carry a position rail on the right: arrows, the stop you are on, one block per paragraph. The dark ground behind the panel (#0e141b) is
Steam's own colour and is the one value not taken from our stylesheet. The font is the one the other
mockups under `docs/demos/` use, since the plugin inherits Steam's.

## Rebuilding the canvas after a change

Edit the `.dc.html` files here, then reassemble and save the canvas from a Claude Code session with
the design skill (`/design`), passing all seven boards and `canvas.json`. The assembled page is
about two megabytes and is not committed; only these source files are.
