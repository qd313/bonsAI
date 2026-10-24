# bonsAI density board

Clickable mock-ups for two roadmap items about room, drawn at the Deck's real size in Steam's own
font and colours. Started 2026-10-11. A separate board from the first one (`docs/demos/mockup-board/`), at
the maintainer's request.

**Live page (private to the maintainer):** https://claude.ai/artifact/MjXaLUjnoSLNseFaixcA6g

Picks (**Like** / **Not this**) and comments are saved inside that page, not in this folder. Open it
in a web browser signed in to claude.ai, not in the Claude app's own panel: the panel cannot reach
the saved picks and loses them on reload.

`bonsai-density.html` is made by `sh build.sh` from the parts in `src/`, and is not stored in git (see `.gitignore`).

## Where things stand

| Tab | Roadmap item | Stars | Status |
|---|---|---|---|
| 1 | Make the Show details chips take less room | ★★ | **Decided 2026-10-11: A of round 2.** Round 1: liked D (short names, Session as the last chip: "put the tab into that special chip at the end"), A ("simple fix") and the facts line ("interesting idea"); not B or C. Round 2: picked A (D cleaned up, each box keeps the chip's full wording, the Show details line kept) over B (no Show details line). On the roadmap |
| 2 | Ollama tab denser | ★★★ | **Decided 2026-10-11: C of round 3**, a floating button in the bottom corner opens or closes every section; its colours must match bonsAI's and SteamOS's own buttons ("make sure the color of the button matches the design style of bonsAI and SteamOS"; the board's button now uses Steam's button grey). Round 1: liked D ("dense and more navigable") and B ("ok"), asked for D with B's bottom strip; not C. Round 2: picked B (folded sections, text in the bottom strip, sections stay open until closed) and asked "Maybe have an expand/collapse all sections (floating?)". Round 3 drawn: A a line at the top (Open all sections · Close all), B X opens or closes everything (a floating label shows which), C a floating button reached with Right from a section line |
| 3 | Settings tab denser | ★★★ | **Decided 2026-10-11:** as Ollama (round 3 C). Round 1: liked D. Round 2: picked B |
| 4 | Permissions tab denser | ★★★ | **Decided 2026-10-11: B of round 2, leave it as it is** ("this tab is short, so it's not so bad that the copy takes up space") |
| 5 | Developer tab denser | ★★★ | **Decided 2026-10-11:** as Ollama (round 3 C). Round 1: liked D. Round 2: picked B |
| 6 | About tab denser | ★★★ | **Decided 2026-10-11: D of round 3**, the links as small buttons beside a smaller QR code, on round 2's A. Round 1: liked A. Round 2: picked A, and asked "Can we redesign the links so they aren't a full row, try some boxes or other options". Round 3 drawn on A: four boxes two by two, one row of four icons, short one-line links, the links beside a smaller QR code. Support opens the QR code in the first three |

**Next step:** none on the board. Every tab is decided and both roadmap entries carry the picks (2026-10-11). Next is building them.

Scope calls from the maintainer (2026-10-11): a fresh board, not tabs 9 and 10 of the first; all five
tabs drawn, each on its own board tab; anything goes for the chips (shorter names, icons, folding some
away); draw a few ways to show a setting's longer text, not only "on hover"; the look must match
SteamOS (font, colours); then, the same day, show the plugin alone, without Steam's frame around it.

## How the review works

Same as the first board: the maintainer plays with each panel, picks and comments; Claude reads them
with `ArtifactData` `list` on the page URL (collections `picks`, ids like `t1-A` or `t3-wild`, and
`comments`, keyed `t1-A` or `t3-overall`), redraws, and republishes the same file. Board tab ids: `t1`
chips, `t2` Ollama, `t3` Settings, `t4` Permissions, `t5` Developer, `t6` About. Write everything to
the maintainer in plain language, one step at a time.

## For the session doing the work

- `10-head.html`, `15-kit.css`, `16-kit2.css`, `20-kit.js`, `21-kit2.js`, `30-core.js` and `90-boot.js`
  started as copies of the first board's kit and core. Changed here: the page title and browser
  storage keys; Steam's font; the tab bar and chat-name row in `21-kit2.js`, redrawn from Deck
  screenshots (six tabs in fixed places, the current one named in green, "bonsAI" on Main; back, new
  chat, the name, delete); and `deckFrame` in `30-core.js` can wrap a panel in SteamOS's frame (`chrome: true`), off by default
  since the maintainer asked for the plugin alone.
- `17-steam.css` holds that frame (unused unless switched on), the real tab bar and name row styles. `40-board.css` and `41-chips.js` are
  tab 1. `42-tabs-data.js` (every row of the five tabs, with its full wording), `43-tabs.css` and
  `44-tabs.js` are tabs 2 to 6.
- Publish `bonsai-density.html` with the `Artifact` tool and the page URL as `url`; leave
  `capabilities` and `icon` out on a republish so the saved picks and the font files stay connected.
- Check before publishing: `node --check` on the script part, then one load in a browser. The height
  readouts wait for the page to be on screen; in a hidden browser tab they stay blank. To preview
  locally, serve a folder holding the page and a `_blob/` folder with the four font files named by
  their ids (see `10-head.html`).

## Steam's font

The panels use Motiva Sans, Steam's own font, so text wraps where it does on the Deck. The copies on
the maintainer's PC (from SteamVR) and on the Deck (packed inside Steam's interface files) are sealed
by Valve and browsers cannot read them; they were left alone. The page uses the plain files Steam's
public store website serves to every browser (`store.fastly.steamstatic.com/public/shared/fonts/`,
Regular, Medium, Bold and Black), downloaded 2026-10-11 with the maintainer's OK and kept only in the
page's private storage. **Valve owns the font: never add the files to the repo or to a public page.**

Proof it matches: in Steam's font each chip sizes itself within 0.2 px of the width measured on the
Deck in plan 87 (for example "Read current TDP" 102.8 against 102.9), and the Permissions tab's
descriptions wrap word for word as in the Deck screenshot.

## Where the look came from

- **Colours and sizes:** sampled pixels from Deck screenshots on 2026-10-11 (the Deck's own screen,
  `plan81-P81-RING-WALK-ALL-TABS-*.png`, and the monitor runs `plan87-P87-B9-HEADING-settings-first-control.png`
  and `plan87-P87-F3-CHIPS-GRID-try3-toggle-after-walk-back.png`). Panel `#0e141b`, ring fill on a row
  `#32373d`, row divider `#272c32`, Steam button `#32373d` (white with the ring), switch on `#1a9fff`,
  labels `#dcdedf`, descriptions `#b8bcbf`, headings `#b7b9bb`, current tab `#52d88a`. Steam's frame:
  top bar 40, side menu 48 wide, button bar 40, in the panel's own pixels.
- **Chips:** the plugin's code on 2026-10-11 (`ContextChipLadder.tsx`, `ChipExpandedBody.tsx`, the
  `section-6.ts` styles).
- **Other tabs:** the tab components and the plan 87 measurements (`workshop:test-evidence/plan87-M4-OTHER-TABS.json`).
  State drawn: the AI runs on this Deck, the Developer tab is on, the knowledge base is installed,
  scramble is off.
- **How close today's drawing is to the Deck** (whole tab, top to bottom): within about 2% for
  Ollama, Settings, Permissions and About. Developer draws about 2365 against 2820 measured; the Deck
  run had extra rows showing (captured errors, loaded models), which the drawing leaves out.
