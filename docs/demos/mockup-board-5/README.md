# bonsAI board 5: looks to pick before plan 105

Clickable mock-ups for five roadmap items that change how something looks or behaves, drawn at the Deck's real size
in Steam's own font and colours, on the density board's kit. Started 2026-11-14 in the planning chat of
[plan 105](../../planning/105-main-roadmap-wave-bugs-verify-and-features.md), at the maintainer's ask ("Now, in this
chat").

**Live page (private to the maintainer):** https://claude.ai/artifact/1LTEzAHYtXZHTJtPAzv7i5

Picks (**Like** / **Not this**) and comments are saved inside that page, not in this folder. Open it in a web browser
signed in to claude.ai, not in the Claude app's own panel: the panel cannot reach the saved picks and loses them on
reload.

`bonsai-board-5.html` is made by `sh build.sh` from the parts in `src/` and the kit in `../mockup-board-2/src`, and
is not stored in git (see `.gitignore`).

## Where things stand: all five picked (2026-11-16)

| Tab | Roadmap item | Stars | The pick, and the drawing a lane builds from |
|---|---|---|---|
| 1 | Tab sections: shading, bold titles, first section open | ★ | **B**, each open section one shaded block (`t1-B`, round 1). Lane C1 |
| 2 | The Ollama tab: modern look, Cancel folded in | ★★★ | **Round 2's "Elsewhere"** (`t2-2K`; "Let's go with this one"): the job card, the live connection line and one bar, the bar shown only when the card cannot be seen, the same card on the library download and the voice install. Round 2's B (`t2-2B`) shows the Ollama tab's own screen under the same rule. Lanes D4 and D4b |
| 3 | AI models: bigger list, simpler filters | ★★★ | **C**, word buttons and two switches (`t3-C`, round 1). Lane D5 |
| 4 | First-time setup: fewer steps | ★★★ | **Round 4's B** (`t4-4B`; picked in the chat, "B: with tick boxes"): the checklist of five downloads with sizes, sites and working tick boxes, the Internet downloads switch, then OK. Lane D3 |
| 5 | Suggestion chips: softer cut ends | ★ | **Round 2's C** (`t5-2C`; "Saves the most vertical space, which is still precious"): the selected chip takes the row on one line. Lane B3 |

## The rounds

**Round 1, drawn 2026-11-14.** Liked 2026-11-15: `t1-B`; `t2-B`, `t2-C`, `t2-W`, `t2-KB` ("All three together");
`t3-C`; `t4-A` ("Too many words on this popup"), not `t4-C`; `t5-today` and `t5-wild` ("Two lines only when
selected").

**Round 2, drawn 2026-11-15 for tabs 2, 4 and 5.** Liked 2026-11-16: `t2-2K`, `t4-2C`, `t5-2C`.

- **Tab 2** (`t2-2A`, `t2-2B`, `t2-2K`): A, the card shrinks to a one-line note and the bar appears whenever you
  leave the section; B, the card never shrinks and the bar shows only when the card is out of sight; Elsewhere, B's
  rule on the library download and the voice install, with three ways to show two jobs at once (the drawing starts
  on the newest job with a "2 jobs" chip; the page does not save which switch was looked at). Measured: bar 56 px,
  card 110 px, note 28 px; the bar and the help strip do not overlap.
- **Tab 4** (`t4-2A`, `t4-2B`, `t4-2C`): round 1's A had 211 words. A, 102 words; B, 33 words with the sites one press
  away; C, 99 words, three small rows with sizes and site tags. All reach the first question in 2 presses. The
  microphone switch is gone from all three. Notes left on the page: on A, "I want a checklist of all the things it's
  installing and from what site"; on C, "Why don't we know the size of Ollama? Just look at their releases and avg
  the MB size".
- **Tab 5** (`t5-2A`, `t5-2B`, `t5-2C`): A, the chip row grows from 32 to 43 points; B, the selected chip floats up as
  a two-line bubble; C, the selected chip widens across the row on one line and its neighbours shrink to a stub.

**Round 3, drawn 2026-11-16 for tab 4** (`t4-3C`): C as a full checklist. Five rows, one per download, each with its
size and its site, and the total at the top right; a switch above the panel shows tick boxes in place of the small
pictures. 111 words; 442 of the 454 points the Deck's screen leaves, in a stand-in font (12 to spare). The sizes were
looked up that day:

| Download | Size on the drawing | Where the number came from |
|---|---|---|
| Ollama (the file the Deck fetches) | about 1.5 GB | The average of its last 11 Linux releases, 0.40.6 to 0.40.16: 1,371 to 1,474 MiB each, 1,442 on average. Unpacked on the Deck: 2.4 GB |
| The answer model gemma4:e2b-it-qat | about 4.3 GB | Ollama's model site: 4,336 MB |
| The note-search model nomic-embed-text | about 270 MB | Ollama's model site: 274 MB |
| The speech models tiny.en and base.en | about 230 MB | The plugin's own figure; not measured again |
| The voice engine | about 500 MB | Its published image, the exact version the code pins: 503 MB |
| **All five** | **about 6.9 GB** | The sum |

Today's plugin says "about 4.6 GB" for "Ollama and the starter models". That is the two models alone; plan 105's
§ 12 has the finding.

**Round 4, drawn 2026-11-16 for tab 4** (`t4-4A`, `t4-4B`), from two notes left on round 3: "I think it'll be good to
copy the permission that is auto-enabled to this screen. User toggles it and hits a confirm OK", and "Also show me a
version with functional tickboxes".

- **A:** the five downloads, then the Internet downloads switch in the Permissions tab's own words (starting off),
  then OK. OK is grey until the switch is on; a press on grey OK moves the ring to the switch. "Use the AI on my PC"
  and "Not now" are buttons beside OK. 102 words; 392 of 454 points; 4 presses to the first question (3 if the ring
  starts on the switch; round 3 took 2).
- **B:** A with tick boxes that work. The AI engine and the answer model are locked on; the note-search model, the
  speech models and the voice engine can be unticked, the last two together. The total follows the ticks (6.9 GB
  with all, 5.8 GB with the least). 125 words; 392 points; 4 presses.

The two big choice tiles of rounds 1 to 3 became three buttons on one row, which is what pays for the switch.
Checked in the planning chat by pressing through both panels: the ring's start, the grey OK, the switch, Down
landing on OK only once it can be pressed, each tick box and the total, and the shortest way's count.

## Questions the drawings raised

Each has a default that plan 105 takes on "go" (its § 12 has the list): the first section opens again every time you
come to a tab; the raw installer box leaves the Ollama tab; "Browse models…" turns grey with no dots while a job
runs; a half-second guard against a double press; the models box opens on 17 rows; a model outside the licence
setting is dimmed, and an installed one is always shown; two jobs at once show the newest with a "2 jobs" chip.
Still open on tab 4, with its default: the ring starts on "Not now", not on the switch.

Answered by the picks: the person turns Internet downloads on with the switch on the first screen, and can untick
three of the five downloads; the beta line is small print; no microphone switch on
the first screen; the 56 px bar stays; every site is named on the first screen; no floating chip bubble; the chip
row does not stop short of the screen's edges.

## For the session doing the work

- Each tab is two files in `src/`: `6N-<name>.css` (wrapped in `<style>`) and `7N-<name>.js` (one `TABS.push`).
  Names are prefixed `b5tN`. Tab ids: `t1` sections, `t2` Ollama, `t3` models, `t4` first run, `t5` chips.
- `build.sh` holds this page's own copies of Steam's four font files (ids in `FONT_*`). Republish
  `bonsai-board-5.html` to the same page so the saved picks and the fonts stay connected.
- Read picks with the page's saved data (collections `picks`, ids like `t1-A`, and `comments`).
- Drawn, not from the code: the model names, sizes and failure sentences on tab 2; the six example rows on tab 3; the
  download speeds and the voice-engine line on tab 4. Chip slide lengths on tab 5 were checked in a stand-in font.
- No drawing was seen in Steam's own font by the planning chat (its browser could not load the page's fonts); every
  height above is from a stand-in font.
