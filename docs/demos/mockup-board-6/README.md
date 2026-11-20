# bonsAI board 6: your open calls, drawn (plan 107)

Clickable mock-ups for every open call on the two roadmaps where the choice changes what a person sees or presses.
One tab per call, each choice drawn at the Deck's real size in Steam's own font and colours, on the density board's
kit. Started 2026-11-19 in the planning chat of
[plan 107](../../planning/107-bugs-and-verify-toward-zero-third-sweep.md), under the project rule made the same day:
a call that changes what a person sees or presses is drawn before it is asked (AGENTS.md, "Writing to the
maintainer").

**Live page (private to the maintainer):** https://claude.ai/artifact/QGFsXVuRXkDcH3YDcqjsKv

Picks (**Like** / **Not this**) and comments are saved inside that page, not in this folder. Open it in a web
browser signed in to claude.ai, not in the Claude app's own panel: the panel cannot reach the saved picks and loses
them on reload.

`bonsai-board-6.html` is made by `sh build.sh` from the parts in `src/` and the kit in `../mockup-board-2/src`, and
is not stored in git. `sh build.sh some-name.html` writes to another file (used by helpers to check their own tab).

## The tabs

| Tab | The call | Roadmap entry | What a pick starts (plan 107 lane) |
|---|---|---|---|
| 1 | Where the "summed itself up before this answer" row sits | Bugs ★ `[chat]` | T1 |
| 2 | The cut-off "Keep the Deck awake…" line on the download card | Bugs ★ `[ui]` | C1 |
| 3 | Reinstall on a voice engine that is already there; the library's line after a reload | Bugs ★ `[voice]` `[ollama]` | R1 (and D2's wording) |
| 4 | Community copies of models under "Open source only" | Bugs ★ `[ollama]` | M1 |
| 5 | The Ollama tab's "AI models" moves under Where AI runs; that section's name | Bugs ★ `[ui]` | M2 |
| 6 | Reaching the download bar's Cancel on Main with the D-pad | Bugs ★ `[ollama]` | M3 |
| 7 | X anywhere stops a long job; Update starts at one press | Bugs ★ (security leftovers, gap 6) and a knowledge-base call | X1 |
| 8 | Ten chats then Cancel; the Pyro chip; the "Ask anyway" button's look | Verify ★★ `[chat]`; plan 106 § 13.1 | S1, L1 |
| 9 | Tell the AI when a game has no notes; the unused Speed option; the starter box's last paragraph | Knowledge-base calls; Verify ★★ `[first-run]` | N1 |

Who drew what, and from which lines of the code: [the briefs](../../planning/assets/107-mockup-briefs.md). Tabs 4
and 6 were drawn by Fable (the two that matter most: which models may answer, and a new D-pad route on Main); the
rest by Opus.

## Where things stand

Drawn 2026-11-19. The maintainer picked in three rounds that evening; the picks are in
[plan 107, section 4](../../planning/107-bugs-and-verify-toward-zero-third-sweep.md), with the notes word for word.

**Every call is picked.** Tab 1 (A), tab 2 (A1), tab 3 (B, and one library line), tab 4 (B), tab 5 (AI models
goes under the first section, which is called "AI & models"), tab 6 (B), tab 7 (Update asks first; X stops
nothing), tab 8 (the question stays; the chip only; "Ask anyway" inside the warning's bubble, a little more
see-through, reading "Asking…" from the press), tab 9 (leave the AI untold; the Short box before the first
downloads). Tab 9's unused switch was skipped, as offered: it stays, switched off.

The page has an on-screen D-pad at its foot (`60-pad.css`, `70-pad.js`), so every panel can be driven by a tap
with no keyboard. What changed in each round and why: the last three sections of
[the briefs](../../planning/assets/107-mockup-briefs.md).
