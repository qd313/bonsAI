# Plan 74 — release wave two: knock the bug list down before 0.6.0

**Status: running, started 2026-09-28.** Asked for by the maintainer ("let's plan for another wave to knock
that list down", then "go"). Part of [plan 71](71-merge-experimental-into-main.md), Stage B: the second pass of
bug fixing before the last call on Friday 2 October.

## What this wave is for

After the roadmap check on 2026-09-28, the open bugs split into three kinds: ones nobody can fix until the Deck
shows them again, ones too big or risky for four days before a release, and small ones with a known cause. This
wave takes the small, known-cause ones, plus four licence and download fixes the licence check found. Every one
is chosen to be safe to ship this week.

## The maintainer's calls (2026-09-28)

1. **The default model's licence label:** fix the labels and the README wording after the release, not now.
   The licence check found that the "open source only" setting's default picture-reading model may carry a
   research licence at its size (from memory; check the model's page first). The default stays as it is for 0.6.0.
2. **The logo is the maintainer's own work.** Written into the notice file by lane 1.
3. **Lane 3 runs on Opus high, not the usual Opus xhigh for D-pad work, as a trial.** Measured below.

## The lanes

Each lane works in its own copy of the repo, one fix per commit, all checks green. Lanes never edit the
roadmap, the testing docs or the changelog; the session does that at landing.

| Lane | What | Helper | Fixes |
|---|---|---|---|
| 1 | The release download and its licences | Opus medium | 4 |
| 2 | Answers and chats | Opus medium | 6 |
| 3 | D-pad fixes whose cause the Deck already showed | **Opus high (trial)** | 6 |
| 4 | Looks already measured on the Deck | Opus xhigh | 3 |
| 5 | Back end and the knowledge library | Opus medium | 3, plus one test to find out |
| Deck | Check every fix; run three owed checks; try the one-off sightings once | Deck helper, Opus medium, from rows the session writes | — |

**Lane 1:** the download leaves out the notice file and the data folder (a fresh install loses the extra words
in "Find a setting by typing"); no licence texts for the ~50 code libraries built in; no licence note on the
314 wiki notes in the public code; the download check does not look for any of it.

**Lane 2:** the spinner that keeps spinning with thinking off; the dismissed troubleshooting hint that comes
back; the Session tab saying "nothing to sum up yet" after a sum-up; Copy joining two paragraphs; the
meaning-search hint appearing late; the panel rewriting its height for nothing.

**Lane 3:** B on the notes block or on "Hide details" throwing the ring to the tab bar; two older confirm boxes
opening on the action button; the ring landing on the tab bar after a download box closes; Up from Ask landing
on the mic or the paperclip; Down landing on Read aloud instead of Helpful, and Up from Helpful skipping choice
B; Up next to a spoiler cover, where A does nothing.

**Lane 4:** the decode chip's pale typing mark; Read aloud alone above an empty gap; "Clear cache…" 16 pixels
out of line and About's support button far too tall.

**Lane 5:** "Not in my notes" shown when the notes were never searched; the log not naming the notes and tips a
question used; "Reset to defaults" in the try-order picker saving a fixed list; and one test commit to find out
whether a copy's commit hook still rebuilds the shared checkout.

**Not in this wave** (see the roadmap for each): the nine known issues named in the release notes and watched;
the three security findings and two clean-ups planned for after the release; five bugs too big or risky for this
week; six library-quality bugs, better as their own library wave; about fourteen one-off sightings. The Deck walk
check's false alarm lives in the Deck tool, not in bonsAI, so it is fixed there, separately.

## The Opus-high trial (lane 3)

The routing table sends D-pad work to Opus xhigh. The maintainer asked to run it on Opus high and measure how it
does. No paired run: screen work stays out of paired runs (plan 33 § 4b). Recorded per fix, in the same columns as
plan 33 § 4b:

- **Deck first time** — the number that decides it: did the fix pass on the Deck on its first check?
- Checks green first time; problems the session finds reviewing the change before landing (a D-pad fix built on
  something the Deck never delivers counts as a must-fix); rounds to land; do the new tests fail without the fix?
- Tokens, turns, tool calls, minutes and dollars at list, from the helper's own log.

**Verdict rule** (plan 33's): Opus high replaces xhigh for measured D-pad fixes only if its Deck first-time rate
and review problems are no worse than the recent xhigh-reviewed focus fixes in plan 72. One lane is a small
sample; the verdict says how many fixes it rests on. The result goes into plan 33 § 4b.

## Landing

Order: lane 1 (no screen change), 5, 2, 4, then 3 last, because lanes 3 and 4 both touch the row of buttons
under an answer. Each landing: review the change, rebase onto the tip, all six checks green, then the
bookkeeper sweep for that lane's roadmap, testing and changelog rows. Then one deploy and the Deck pass.

## Log

- **2026-09-28:** plan written; five repo copies made from `c8fa25d9`; lanes started.

## Appendix — lane 3's brief (the Opus-high trial)

Lane 3 runs as its own session, not a helper inside the session that runs the wave: the app only loads a new
helper setting when a session starts, and the Opus-high helper was added mid-session. The session running the
wave sets lane 3's session to Opus 5.5 at high effort before sending it this brief.

**Where to work:** the repo copy `C:\Users\still\Documents\BonsAI\.claude\worktrees\p74-l3-focus` (branch
`refactor/p74-l3-focus`), by absolute path in every command. Never change the shared checkout at
`C:\Users\still\Documents\BonsAI`, never switch its branch.

**Ground rules:**
1. First act: `git merge-base --is-ancestor c8fa25d9 HEAD` in the copy. If it fails, stop and report.
2. Do **not** run `pnpm install` or any install: `node_modules` in the copy is a link to the shared checkout's.
3. Six checks before every commit: `npx tsc --noEmit`, `npm test`, `npm run test:py`, `npm run build`,
   `node scripts/check-focus-patterns.mjs`, `python scripts/verify.py --quick`.
4. Commit with `git -c core.hooksPath=.githooks commit ...`, files staged by name, never `git add -A`. One fix
   per commit, failing test first. Plain-language messages ending with
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
5. Never edit `docs/roadmap.md`, `docs/testing.md`, `docs/testing-manual.md` or `CHANGELOG.md`. Never touch
   the Deck (no `deck_*` tools, no SSH, no deploy). Never push, never `git rebase -i`. Never hand-edit
   `packages/bonsai-mcp/knowledge/architecture/`.
6. **The focus law.** On the device, Steam calls `Focusable` move handlers (`onMoveUp`, `onMoveDown`, ...) and
   `onActivate`, and moves the ring across containers only through its own transfer (`takeNavFocus`, a
   registered nav node's `TakeFocus`). It never delivers DOM `keydown` for the D-pad, and direction presses
   inside `onButtonDown` do not consume the press. A fix built on those is dead on the Deck and is sent back.
   A plain `focus()` is only safe between siblings inside one container.
7. If a fix resists, stop, commit nothing half-done, and write up what you learned.

**Read first:** `CLAUDE.md`, `AGENTS.md` (the Decky focus graph section), `docs/lessons-learned.md`. Then, per
bug, its roadmap entry (find it by the bold title), its "Detail" link in `docs/roadmap-details.md`, and the
evidence named.

**The six bugs** (★ unless marked):
1. **"B on the notes block sends the ring to the tab bar and leaves Show details open"**, plus the same thing on
   **"Hide details"** (the part still open of the ★★ entry "Three D-pad slips seen in the plan 68 Deck pass";
   testing row PLAN72-F-UP). The notes block handles only Up and Down, no B
   (`src/utils/buildKbNotesBlockElement.tsx` around lines 285–300), so B falls through to Steam's back-out.
   Wanted: B closes Show details and returns the ring to what opened it — reuse the existing close path.
2. **"Two older boxes open with the ring on their action button, not the safe choice"** — "Enable Tier 2 before
   pulling?" (`src/hooks/usePullModelSubmitSelected.tsx` around line 169) and the library's folder picker
   (`src/components/KnowledgeBaseSection.tsx` around line 232). The download notice already does it right
   (`src/features/downloads/downloadNotice.tsx` around line 210): copy that pattern; do not change the actions.
3. **"After the \"Update Ollama and models?\" box closes with B, the ring goes to the Ollama tab bar"** — since
   `eb4f4d16` the button opens the download notice first; the Deck still found the ring on the tab bar after it
   closed (`docs/test-evidence/plan72-F3-DL.json`, `ringAfterBoxClosed`). Wanted: back on the opening button.
4. **"Up from Ask lands on the mic one time and on the paperclip another"** — Ask sets no Up target of its own
   (`src/components/MainTabUnifiedAskBar.tsx`). Set it explicitly to the control directly above, the way its
   neighbours do.
5. **"A straight Down lands on Read aloud, not Helpful; Up from Helpful lands on choice A, skipping B"** —
   `docs/test-evidence/plan72-Z-FREEPLAY.json`; plan 72 § 7, the 18:10 entry. Follow the earlier Up fixes
   `8294e75b`, `29c0b075`, `9feef4e1` (tests in `src/components/MainTabChatTranscript.upWalk.test.tsx`).
6. ★★ **"Reaching a spoiler cover by Up lands the ring beside it, and A does nothing"** —
   `docs/test-evidence/plan70-SPOILER-CREDITS-01.json`.

**Shared area:** lane 4 fixes a look problem in the same row of buttons under an answer, and lane 2 changes the
waiting spinner and the dismissed hint in `MainTabChatTranscript.tsx`. Keep changes local to the focus wiring.

**Report when done:** commit hashes; tests added by name; for each fix, the roadmap entry, the testing row it
owes, one plain sentence on what a person would notice, your confidence it holds on the Deck (high, medium or
low) and why, and the exact button presses a Deck check should make; plus anything found and not fixed. Send
the report to the session running the wave with `SendMessage` (to
`local_d5152972-85f4-424b-a3b4-be4d85ebc062`), and also end your turn with it.

## Deck runbook, pass 1 (lanes 2, 4 and 5, plus two owed checks)

For the Deck helper. Build: the tip of `experimental` at `323903ea` or later, development deploy. Before
anything: take the lock, snapshot the settings, and read which screen the Deck is showing (built-in or
monitor). At the end: restore every setting key you changed, clear any pinned test chips, release the lock.
One evidence file per row, named `docs/test-evidence/plan74-<ROW>.json`. Pass only on what the row says;
anything else is a fail or "blocked", with the reason. Lanes 1 and 3 are not in this pass: lane 1 is checked
on the real release download, and lane 3 is still being built.

| Row | What it proves | Setup | Do | Pass when |
|---|---|---|---|---|
| P74-THINK-OFF-SPINNER | The waiting spinner stops once the answer starts (thinking off) | Settings: thinking off | Ask any Strategy question; read the line under the question every quarter second | Spinner and waiting phrase are there before any answer text, and gone within one second of the first answer words |
| P74-HINT-DISMISS | A dismissed troubleshooting hint stays dismissed in its chat | "Read game & screenshot context" off | Put a crash question in the question box (no A on the box; use the helper's text route), press Dismiss on the hint, close and reopen Quick Access; then switch to another chat and put a crash question in its box | The hint is still gone in the first chat after reopening, and shows in the other chat |
| P74-LOCAL-CMD-CHAT | A typed command's reply stays in its own chat | Steam ban lookup off | In chat 2 send `bonsai:vac-check`; switch to chat 1; close and reopen Quick Access | Chat 1 shows neither the "Steam Web API is off" reply nor the ban-lookup row; chat 2 still shows its own reply |
| P74-SUMUP-REASON | The Session tab says a summed-up chat is summed up | A chat long enough to sum up (use one that exists; if none, mark blocked) | Show details → Session → Sum up this chat; wait for the card | The line under the greyed button reads "This chat is already summed up. Ask more, then you can sum up again." |
| P74-NOMIC-HINT | The note-search model hint appears without leaving the Ollama tab | Knowledge library on and installed; Internet downloads allowed | Leave the Ollama tab open; over SSH run `ollama rm nomic-embed-text`; wait, reading the tab every 5 seconds | The hint and its Pull button appear within 45 seconds with no press. Then press Pull once to restore the model, and confirm it lands |
| P74-KB-LOG-LINE | The plugin log names the notes and tips a question used | Knowledge library on | Ask "How do I beat the Soul Master in Hollow Knight?" in Strategy; open the notes block; read the plugin log. Then ask a troubleshooting question ("my game stutters on the Deck") and read the log again | Exactly one `kb: question chose domain=strategy ... attached=N [...]` line for the first question, its titles matching the notes block; one `domain=compat` line naming the tip for the second; the question's own words appear in neither |
| P74-TRYORDER-RESET | "Reset to defaults" returns the try order to automatic | Note the current `text_model_routing_order` in the settings file | Ollama tab → text try order: move a row, Done; read the file. Reopen, Reset to defaults, Done; read the file again | After the first Done the file holds a list; after Reset and Done, `text_model_routing_order` is `[]`. Restore the original value |
| P74-CARET-COLOUR | The decode chip's typing mark is the accent colour | Chip style that types itself in (decode); note which character is chosen | Trigger a chip decode; sample the typing mark's and the letters' colours mid-animation | The mark is RGB 91,158,126 with no character chosen, or the chosen character's own colour; the letters stay RGB 196,211,226 at rest |
| P74-EMPTY-STOP | An empty stopped answer offers no Read aloud | — | Ask a long question and press Stop before any answer text arrives | The newest reply ("Request cancelled.") has no Read aloud button, and Show details comes straight after the bubble |
| P74-CLEAR-CACHE-ROW | "Clear cache…" lines up with the other Settings buttons | — | Settings tab; measure the buttons in that row and its neighbours | "Clear cache…" starts at x 64 and "Clear all data…" ends at 332, each 130 wide, level with the other rows |
| P74-ABOUT-SUPPORT | About's support button is sized like the other link buttons | — | About tab; measure the four link buttons; move the ring onto the support button | The support button is 268 × 42 at x 64 like the other three, and the QR picture is fully on screen while the ring is on it |
| DETAILS-LADDER-01 | Entering the chip ladder at its first chip shows the whole chip row | **The Deck's own screen**, not the monitor (if the monitor is showing, mark blocked); an answered chat | Show details → "This answer" tab; enter the chip ladder at chip 1, then step to chips 5 and 7 | The chip row and its "Chip 1 of 7" counter are 100% on screen at every step (the first measurement read 67%, 67% and 33%) |
| KB-NOCLOSE-TEXT-01 | The "no close match" line stays off when the answer used a matching note | Knowledge library on, Strategy mode | Ask a Half-Life 2 walkthrough question built on real chapter notes; read Show details | The "no close match" line does not appear under a reply built on a matching note |

**Pass 2, after lane 3 lands:** lane 3's six rows, the Helpful row's look after A on Helpful, and
REPLY-STOPS-MIRROR-01 (Down and Up through a reply with a hidden spoiler block visit the same stops).

## Deck runbook, pass 2 (lane 3, the Opus-high trial, plus two rows that waited for it)

Same rules as pass 1. Build: the tip of `experimental` at `7543270f` or later, freshly deployed. **These rows
decide the trial:** a lane 3 row passes "first time" only if it passes on this first run, with no fix in between.

| Row | What it proves | Setup | Do | Pass when |
|---|---|---|---|---|
| P74-B-CLOSES-DETAILS | B on the notes block or on "Hide details" closes Show details | An answer with a notes block | Walk to Show details, A; Down to the notes block, B. Then A again, stay on "Hide details", B. Then, with details shut, B on the notes block's line | First B: details closed, ring on "Show details". Second B: details closed, ring still on that line. Third: B backs out as it always did |
| P74-SAFE-FIRST-TIER2 | "Enable Tier 2 before pulling?" opens on its safe choice | Model policy "open source only" | Pull models: queue one open-weight model, Pull selected; read the ring; press A | The ring starts on "Not now"; after A nothing downloads and the policy is unchanged |
| P74-SAFE-FIRST-PICKER | The library's location box opens on its safe choice | No library installed: remove it first, note where it was | Ollama tab: "Download knowledge base"; read the ring; Down once; B. Then reinstall the library to where it was | The ring starts on "Not now"; Down reaches "Internal storage"; B closes the box with nothing downloaded; the reinstall lands. Also a screenshot of the box for a look by eye |
| P74-UPDATE-BOX-RING | The ring returns to "Update AI & models" after its box | Running the AI on the Deck | Ollama tab: Down to "Update AI & models", A, then B. Repeat, closing with "Not now" | Both times the ring is back on "Update AI & models", not the tab bar |
| P74-ASK-UP | Up from Ask always goes to the question box | A question in the box (text route) | Down from the box to Ask, Up. Then visit the mic (Right, Right from the box), come back Down to Ask, Up. Then the same via the paperclip | All three times the ring lands on the question box |
| P74-HELPFUL-DOWN-UP | Down lands on Helpful, and Up from Helpful lands on choice B | A Strategy answer with two choices | Walk Down to choice A, then B; Right to Read aloud (so the row "remembers" it); Up into the answer's last section; Down, Down, Down. Then Up from Helpful | The Downs visit A, B, then Helpful (not Read aloud); Up from Helpful lands on B. By eye: Helpful and B have not moved |
| P74-COVER-UP | Up onto a spoiler cover lands on it, and A opens it | Ask "How do I beat the boss in the Soul Sanctum in Hollow Knight?" (covers on its first and last sentences) | From Read aloud or Helpful press Up until the ring reaches the last cover; A. Keep pressing Up to the first cover; A. Then Up once more | The ring lands on each cover and A reveals it; the final Up goes to Show reasoning or the question, not back onto the same cover |
| P74-HELPFUL-ROW-LOOK | After Helpful, the row reads as one row (lane 4) | Newest answer, not yet rated | A on Helpful; measure the row | "Saved on this Deck" and the speaker share one row, vertical centres within 1 pixel, no line above the row; the ring is on the speaker |
| REPLY-STOPS-MIRROR-01 | Down and Up through a reply visit the same stops | A reply with two paragraphs, a hidden spoiler block and a two-button menu | Walk Down through every stop, then Up through every stop | The Up stops are the exact mirror of the Down stops |
