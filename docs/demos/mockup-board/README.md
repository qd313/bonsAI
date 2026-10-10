# bonsAI mock-up board

Round 1 of clickable mock-ups for seven roadmap items. Each one is drawn at the Deck's real size and
can be driven like a Deck. Started 2026-10-10.

**Live page (private to the maintainer):** https://claude.ai/artifact/XyZfUSPGRZdm2P3mTGV9tR

Your picks (**Like** / **Not this**) and comments are saved inside that page. They are not kept in
this folder. The page's link and saved picks stay the same every time the page is updated.

`bonsai-mockups.html` is not stored here: `sh build.sh` makes it from the parts in `src/`.

## Read this first: round 1 was drawn from an older copy of the branch

The session that drew round 1 started from the branch as it was before 2026-10-08, and only found
out when pushing. Since then:

- **Tab 1 is already built.** A day line in "N earlier" now shows six questions and a "Show N more"
  line; each A adds the next six (passed on the Deck 2026-10-08). That is close to option A.
- **Most of tab 4 is already built.** The Main tab was rebuilt 2026-10-09 (plan 84, after seven rounds
  of mock-ups): the tab bar moved up into the empty strip at the top, the chat's name moved beside
  Decky's back arrow, the ask area folded into the question box, and Read aloud moved into the
  answer's corner. The answer now gets 295 points of height instead of 204. Text size is still open.
- **Every Main tab panel in these drawings shows the old layout** (tab bar and chat row under the
  header, the old dock). Redraw the kit from plan 84's layout before the next round.
- The roadmap was re-sorted on 2026-10-09 with new items from the maintainer. Check it for new items
  that need mock-ups.

## Where things stand

| Tab | Roadmap item | Stars | Status |
|---|---|---|---|
| 1 | "N earlier" list: a day opens a few questions at a time | ★★ | Already built 2026-10-08 (found after drafting) |
| 2 | AI models box: a clearer Filters button, and Done that cannot leave the box by mistake | ★★ | Round 1 drafted |
| 3 | A finished answer keeps its layout | ★★ | Round 1 drafted |
| 4 | More room for the chat, plus text size (one tab for both) | ★★★ | Room half already built 2026-10-09; text size still open |
| 5 | Maps and boss outlines in answers (knowledge-base roadmap) | ★★★ | Round 1 drafted |
| 6 | Connection doctor ("Fix this") | ★★★★ | Round 1 drafted |
| 7 | Your own notes that Ask reads | ★★★★ | Round 1 drafted |
| 8 | Search in bonsAI: find an earlier question by a word in it | ★★ | Added to the list 2026-10-09 at the maintainer's ask; not drawn yet. Start from option 4 of the older search mock-up (https://claude.ai/artifact/CjiVzMEe8UipPda2kS2q18). The maintainer sees it as a bigger feature for a later release (about 0.7.0) |

**Next step:** tab 4 (text size only; the room half is built), started 2026-10-09. Tabs 1 to 3 come back at the end to narrow. Picks so far: tab 1 A, B and Wild 2; tab 2 B and Wild 2; tab 3 A and B (B "cleaner").

Left for a later session on purpose: terse mode, the Spy's reveal, search density, the model speed
readout, web permission, the SteamOS share path and the SteamOS hint card.

## How the review works

1. The maintainer opens one tab, starting with the easiest, and plays with each option.
2. They press Like or Not this, and leave comments on the page or in chat.
3. Claude reads the picks, changes the mock-up and updates the page. This repeats for a few rounds.
4. When the maintainer says **"proceed"**, the review moves to the next tab.

Everything written to the maintainer is in plain language. Go one step at a time and wait for their
word before moving on.

## Picking up in a new conversation

Start a new session on the `experimental` branch and paste this:

> Continue the bonsAI mock-up review. Read docs/demos/mockup-board/README.md, then read my picks
> and comments on the mock-up page and pick up at tab 2 (the AI models box). Same as before:
> plain language, one step at a time, and wait for me to say "proceed" before the next tab.

Change "tab 2" to whichever tab you are on. The table above says which tab is next, as long as
each session updates it.

## For the session doing the work

- **Read the picks and comments** with the `ArtifactData` tool, action `list`, on the page URL above.
  There are two collections:
  - `picks`: one document per option, id like `t1-A` (tab 1, option A), body `{verdict: "like" | "no", at}`.
  - `comments`: body `{key, text, at, from}`. `key` is the option (`t1-A`) or `t1-overall` for the
    whole tab. `from` is `"you"` (the maintainer) or `"claude"`.
- **Answer a comment on the page** by adding a `comments` document with the same `key` and
  `from: "claude"`. It shows under theirs with a blue edge.
- **Change a mock-up:** edit the parts in `src/`, run `sh build.sh`, then publish
  `bonsai-mockups.html` with the `Artifact` tool. Pass the page URL as `url` (read the page first;
  a new conversation must). Leave `capabilities` out so the saved picks stay connected, and leave
  `icon` out.
- **Check before publishing:** `node --check` on the script part, and one load in the headless
  browser for console errors.
- **What each part holds:** `20-kit.js` and `15-kit.css` draw the Deck's panel. `30-core.js` holds
  saving, the D-pad (arrow keys, Enter = A, Escape = B, Y) and the tabs. `41-` to `47-` are one file
  per tab. `48-tabs.css` holds each tab's own styles. `90-boot.js` builds the page.
- **Where the sizes and colours came from (the old layout):** the panel is 300 by 454: Steam's
  header 64, tab bar 20 + 4, chat row about 44 + 12 gap, dock about 165, so the chat gets about 145.
  Plan 84 changed all of that; its own drawing and section 1 have the new numbers. Colours and labels
  were read from the plugin's code and Deck screenshots on 2026-10-10. The AI models box fills the
  whole screen (853 by 533; the box itself is about 658 by 418).

## Roadmap lines found out of date while drawing (not yet changed)

- The old "policy tiers" are already inside the AI models filters, as the Licence group. Only the
  "pick what goes up top" half of that older note is left.
- "A finished answer keeps its layout" says no decision was recorded. In August the maintainer chose
  "rebuild at the finish" for the first version, and kept "keep the layout" as a later extra.
- "Session context and user stash" still names a strip with a Clear button. It is now the Session
  tab under Show details, with "Sum up this chat"; Clear was removed.
