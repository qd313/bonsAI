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
