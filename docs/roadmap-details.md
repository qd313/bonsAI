# Roadmap details

> Trimmed 2026-09-24 by plan 65: the long notes for finished entries moved to [archive/roadmap-details-closed.md](archive/roadmap-details-closed.md), word for word. What is left here is the long notes for entries still open.

Long-form notes for **open** roadmap entries. The roadmap itself keeps each item to a few plain
sentences; everything that would otherwise have to be re-measured lives here — what was tried,
what it cost, which leads were ruled out, and the exact steps to reproduce.

Split out 2026-08-27, when roadmap entries had grown to twenty-plus lines each and the list had
stopped being readable as a list. **Fixed** items are not here; they go to
[archive/roadmap-bugs-fixed.md](archive/roadmap-bugs-fixed.md).

Each heading below matches a roadmap item's title, and the roadmap item links here.

## The panel stops half way down and the Ask button is out of reach

Long version of the roadmap entry. Moved here 2026-09-15; the roadmap keeps the symptom, what clears it and why the
entry is still open.

**The mechanism, found by reading after three deliberate attempts failed to reproduce it (2026-09-05).** The table that
hands the highlight between the panel's parts lives outside the panel and is keyed by fixed names, not by which copy of
the panel is on screen; it is only emptied when the plugin's code loads fresh. A stale entry therefore survives a panel
reopen, and the handler that asks it to move the highlight gets back something that still looks alive, reports the press
as handled, and moves nothing. That matches every symptom on record, including why only a loader restart clears it.

**The signature to chase.** At the moment of the trap Steam's ring and the page's own focus were on different elements
every time — the answer bubble versus a highlighted word, the question box versus the Ask button.

**A fix for that mechanism landed 2026-09-05** — a departing part of the panel can no longer unregister the one on
screen. Nothing proved it against the fault, because the fault never reproduced on demand. Three deliberate attempts
that day all failed to bring it back: leaving with B and reopening from the Decky list; a button-then-cancel around the
question box; and switching through all six tabs and back six times before walking the panel top to bottom. Every walk
reached the Ask button. How a person gets into the state is still not pinned down — it followed a game launch and
several panel reopens.

**Evidence, in order.** `round34-BUG-down-cannot-reach-ask-bar.json` (trapped, 10 presses),
`round34-BUG-down-walk-strategy-mode-control.json` (trapped, other Ask mode),
`round34-BUG-empty-chat-input-trap.json` (trapped, empty chat), then
`round34-BUG-down-walk-after-loader-restart.json` and `round34-BUG-input-to-ask-final-check.json` (both clean after the
restart). All under `docs/test-evidence/`. Also `docs/test-evidence/round35-trap-*.json` and
[plan 35](archive/35-bugfix-session.md) § 7.

**Reproduced on demand 2026-09-15, which the entry had been waiting for.** It happened twice in one
sitting, both times within seconds of starting a brand new, empty chat while the panel was showing a
Session context row — that is, while the session still carried turns from another chat. Down, Left and
Right all did nothing from the question box and only Up escaped; the character button, the mode chip and
the Ask button were all on screen and none could be reached. Emptying the box first made no difference, so
it is not the text. Restarting the plugin cleared it both times. Three walks in the same sitting where
that row was absent, or the chat already had a reply in it, all reached the Ask button normally. That is
five observations, not proof of a cause, but it is a recipe to try. Evidence
`docs/test-evidence/plan48-BUG-ask-input-ring-trap-2026-09-15.json`.

**Five more runs on 2026-09-15 evening, on build 1ac4d7a, and it did not come back once.** Run 1: a new chat
started from a chat with eight turns while the Session context row showed. Run 2: the box filled from a chip
press, then every direction. Run 3: a question asked first so the row carried a live turn, then a new chat.
Run 4: the same, plus the box filled from a chip. Run 5: an empty new chat with the row still showing one
turn, after the plugin was reopened with Hades running. Every Down, Left and Right from the box moved where
it should, every time. Evidence
`docs/test-evidence/plan55-trap-run1-walk-after-new-chat.json`,
`docs/test-evidence/plan55-trap-run2-chip-fill-then-dpad.json`,
`docs/test-evidence/plan55-trap-run3-new-chat-with-live-turn.json`,
`docs/test-evidence/plan55-trap-run4-chip-fill-with-live-turn-row.json`,
`docs/test-evidence/plan55-trap-run5-empty-chat-session-row-hades-running.json`.

**One more clean run 2026-09-18, build `0589565`, on the same 2026-09-15 recipe:** Down reached Ask and Up
climbed back out, no trap. Evidence `docs/test-evidence/plan61-focustrap-try1.json`.

**Found again 2026-09-18 with a game running, and the trigger is now known.** Pressing A on the question box
opens Steam's own on-screen keyboard; once B closes it, Down and Right out of the box stop moving the
highlight -- the page's own idea of what is focused moves on to the Ask button or the mode button, but the
ring a person actually sees stays on the box, and only Up still gets out. It happened five times across two
panel reopens and one full close-and-reopen of the whole Quick Access Menu on Half-Life 2, and again in a
brand-new chat with Hades running; by the time Portal 2 was running it had cleared on its own, with no
restart needed. Three tries of the 15 September new-chat recipe the same night came back clean, so opening
the keyboard, not starting a new chat, looks like the real trigger. Evidence
`docs/test-evidence/plan61-ASKBAR-FOCUS-TRAP-01.json` (the sighting), `docs/test-evidence/plan61-focustrap-try2.json`
and `-try3.json` (the clean tries).

**A second sighting, later the same night, reached a different way, with a working fix found.** This time
the question box itself was never pressed: a pinned suggestion filled the box, and the freeze appeared after
pressing the Ask button itself -- the press left no line in the plugin's own log, and the box emptied back to
its placeholder, as if the send had silently failed partway through. From there, Down and Right out of the
box did nothing a person could see, while the browser's own idea of what was focused had already moved to a
button; only Up worked. Four things were tried in order: going up to the chip row and back down did not
clear it; switching the panel's tabs with the shoulder buttons brought the two focus readings back into
agreement but Down was still dead; closing and reopening just the plugin panel left a different snag, the
ring stalling partway through an old reply, instead of a clean fix; **closing the whole Quick Access Menu and
reopening it did clear it**, restoring a normal walk from the top of the panel down through the chips to the
question box and the Ask button. On a controller alone, a person stuck like this can press the Steam button,
close the Quick Access Menu, and reopen it. Evidence `docs/test-evidence/plan61-ASKBAR-FOCUS-TRAP-02.json`.

**Later still the same night, with a game running throughout, the freeze stopped being occasional.** Across
the rest of the games block it reproduced on nearly every attempt to send a question, and reopening the whole
Quick Access Menu cleared it only until the next question. This is why the roadmap entry now says the trap
hits on most sends with a game running, not just sometimes. See the games-block write-up in plan 61's own log
for the full count.

**One more clean try 2026-09-18, after exiting Sifu, on the 15 September new-chat recipe:** Down and Right
both moved cleanly out of the question box; Left simply had nothing next to it. No trap this time. Evidence
`docs/test-evidence/plan61-focustrap-try5.json`.



**More history, moved from the roadmap 2026-09-21:**

- ★★★ `[focus]` **The panel can get into a state where pressing Down stops half way and the Ask button is out of reach** —
  **OPEN, found 2026-09-05.** Down walked as far as the answer and stopped dead: ten presses, no movement, Left and Right
  dead too, only Up escaping. The Ask button, the preset chips and the question box were all on screen below and none
  could be reached. It happened on a chat with history and on a brand new empty one, in both Ask modes, so the mode is
  not the cause. **Only a Decky loader restart clears it**, not a panel reopen — so this is stale navigation state, not a
  permanently trapping control. **A fix landed 2026-09-05, but the entry stays here rather than in Verify**, because the
  fault never reproduced on demand, so nothing proved the fix against it. It closes only when the panel is driven hard
  over time and the state does not come back. The unrevealed-spoiler entry above is most likely the same fault and closes
  with it. The mechanism, the signature to chase and every run, including how it was finally reproduced on
  demand:
  [detail](roadmap-details.md#the-panel-stops-half-way-down-and-the-ask-button-is-out-of-reach).
  **The trigger is now known, found 2026-09-18.** Pressing Ask can leave the highlight stuck on the question
  box, unable to move down or right, even when the box itself was never pressed. **By the second half of
  tonight's run, with a game still open, this was happening on almost every question sent, not just once in
  a while** — raising how urgent this entry is. The only thing that reliably clears it: back out with the
  Steam button, close the whole Quick Access Menu, and reopen it — going up and back down, or switching the
  panel's tabs, does not. Full run history and the exact steps:
  [detail](roadmap-details.md#the-panel-stops-half-way-down-and-the-ask-button-is-out-of-reach).
  **One more try 2026-09-18, later in the same night:** with Hades still running, one question sent with the
  usual workaround went through cleanly and did not trap — a sample of one, so the "nearly every send" reading
  from earlier tonight still stands. Evidence `docs/test-evidence/plan61-ASKBAR-FOCUS-TRAP-03-tally.json`.
  **Not seen at all on 2026-09-19:** about ten questions were sent with Hollow Knight, Half-Life 2, Hades and
  Black Mesa running in turn, and the trap never happened once. The one thing done differently from the
  night before is that the plugin was reloaded after every settings edit tonight (see the pinned-chip entry
  above), which is worth trying again before calling this closed.
  **A separate, smaller fault was found and fixed 2026-09-20** while chasing this very entry: pressing Ask
  left Down doing nothing for as long as an answer was arriving, though Right kept working throughout — and
  it reproduces every time, unlike this one. Now fixed and moved to Verify as **ASKBAR-DOWN-TO-STOP-01**; it
  may well be part of what has been feeding these reports. But it is not this bug — today's runs saw no dead
  Left or Right, and nothing needed a full Quick Access Menu close to clear, so this entry stays open.

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

## Ordinary phrases attach game cards

  - **Implemented 2026-08-23:** `VECTOR_RECALL_FLOOR` raised `py_modules/backend/services/knowledge_base_service.py:148` from 0.50 to 0.515, against a fresh local repro (real `nomic-embed-text` via a local Ollama, real seed cards for the six phrases and the seven `V2-PARA-*` strategy rows in `kb_eval_v2.json` — script not committed). The two ranges overlap (noise up to 0.5308, a genuine paraphrase hit as low as 0.4302), so no single floor separates them cleanly; 0.515 was chosen to sit just above "one sentence"'s noise score (0.5034) and just below the lowest genuine score this change must not break (Mind Flayer / `V2-PARA-S04`, 0.5169).
  - **Re-measured all six phrases end-to-end** through `retrieve_knowledge_context` against the real test corpus (`build/knowledge-base-test/corpus.db`, real embeddings, real local Ollama for the query) rather than eyeballed:

    | Phrase | Before | After |
    |---|---|---|
    | "one sentence" | Praetorian | clean (genre fallback only) |
    | "please repeat that" | Glyphid Dreadnought, Nitra, Dreadnought Twins | Glyphid Dreadnought only |
    | "thank you very much" | Nitra | **unchanged — Nitra still attaches** |
    | "what time is it" | Glyphid Dreadnought, Praetorian, Classes | **unchanged — all three still attach** |
    | "our team" | clean (genre fallback only) | unchanged |
    | "four hours" | clean (genre fallback only) | unchanged |

    Matches D28's own prediction exactly: the two BM25-driven phrases are untouched (fixing them would mean touching `BM25_RELEVANCE_FLOOR`, out of scope here), "one sentence" is fully clean, and "please repeat that" is reduced but not clean. **Still OPEN, re-scoped to the two BM25-driven phrases and the residual `Glyphid Dreadnought` on "please repeat that"** — a keyword-side fix is a separate decision.

    **Maintainer call 2026-08-27:** interim, **live with the residual attachments** — the model is expected to mostly talk past an irrelevant card — but this row is now **research-first, not tune-first**: find out *why* a bare phrase clears the keyword bar for these cards before proposing any change. The backlog entry *Card relevance needs a second signal* (Knowledge base lane) is the vehicle for the eventual fix; the floors stay where they are (D28's correction note already forbids retuning `VECTOR_RECALL_FLOOR`, and `BM25_RELEVANCE_FLOOR` stays at 1.0 per D25).

    **On-Deck 2026-08-23 — all four phrases confirmed on hardware. The device reproduces the desk table exactly, card for card. D28's re-measure obligation is discharged.** Deep Rock Galactic: Survivor (`app_id 2321470`), corpus `2026.08.22`, model `gemma4:e2b-it-qat`, Strategy mode. Recordings `DeckRecord_20260823_170847`, `_172915`, `_173649`, `_173825`, `_173947`.

    | Phrase | Desk prediction | Cards actually attached on Deck |
    |---|---|---|
    | "one sentence" | clean (genre fallback only) | `Genre/compat fallback` **only** — reproduced on all three runs |
    | "please repeat that" | Glyphid Dreadnought only (was 3) | `boss: Glyphid Dreadnought` **only** |
    | "thank you very much" | unchanged — Nitra still attaches | `item: Nitra` |
    | "what time is it" | unchanged — all three still attach | `boss: Glyphid Dreadnought`, `enemy: Praetorian`, `mechanic: Classes` |

    **Method — and the correction it forced.** The card names are **not readable from the device UI**: *Show details* reports retrieval mode, `Trust tier`, and a corpus section count, but never names what was retrieved, and a `fallback_no_source` tier looks identical whether the payload was the genre fallback or a real game card. An earlier note on this row read that chip as "no cards attached" for *"one sentence"* — **that was wrong**, and the conclusion was only accidentally right. `kb_attached: true` was in the same snapshot the whole time, and `fallback_no_source` is a **trust tier** ([knowledge_base_schema.py:48](../py_modules/backend/services/knowledge_base_schema.py#L48)), not an attachment count. The authoritative source is the Desktop ask trace — `~/Desktop/bonsAI_logs/bonsai-ask-trace-<date>.md`, written when `desktop_ask_verbose_logging` is on ([main.py:2135](../main.py#L2135)) — which dumps the verbatim `--- Local knowledge base ---` block with one `[title / kind: Card] (trust: tier)` header per attached card. **Read the trace, not the panel**, for any card-attachment QA.

## An Ask that completes instantly loses its branch picker and checklist

  - **Not what the device measures**, and that is why it is one star rather than two: `gemma4:e2b-it-qat` takes 6-32s on this hardware, so the start call answers `pending` and the polled path — the fixed one — is what real Asks take. This bites a fast or cached completion.
  - **The same literal already carries `shortcut_setup`, `thinking_unsupported` and `model` through with a comment explaining why**, so the fix is to add the two strategy fields beside them. Confirm first that the RPC actually returns them on this path before adding the fields, and keep the test on the polled path as well — these are two different routes to the same panel.

## Live Ask user bubble shows a bare ellipsis after reopen

  - **On-Deck 2026-08-23 — half the fix works, and the failure moved.** Batch A chip #1 (*"one sentence"*, Deep Rock Galactic: Survivor), QAM closed and reopened mid-think. **The caption came back correctly and stayed correct for the whole thinking phase** — that is the `pending`-branch backfill ([useBonsaiAskOrchestration.ts:502-505](../src/hooks/useBonsaiAskOrchestration.ts#L502-L505)) doing exactly its job, and it is the first time this has been seen working on hardware. **It then reverted to `…` at the moment thinking finished.** So the bug is no longer "nothing ever refills the caption"; it is "something clears it again on the terminal transition".
  - **Lead, not yet proven — the one unguarded write.** All three in-flight writes to `askThreadDisplayQuestion` are blank-only (`(prev) => prev || value`) — pending at :504, completed at :605 — **except `restoreSessionSnapshot`, which assigns unconditionally** ([useBonsaiAskOrchestration.ts:1312](../src/hooks/useBonsaiAskOrchestration.ts#L1312)). A snapshot captured before the Ask was submitted holds `askThreadDisplayQuestion: ""`, and the survival snapshot is only written before a nested-modal open ([useBonsaiPluginShell.ts:115](../src/hooks/useBonsaiPluginShell.ts)), never on a plain QAM close — so the stored value is routinely stale. If the mount-restore effect lands after the pending poll, its bare assignment overwrites the good caption with the stale blank one, and the header falls back to the `|| "…"` literal at [MainTabChatTranscript.tsx:480](../src/components/MainTabChatTranscript.tsx#L480). The ordering is **not established** — do not fix on this alone. **Cheapest next step:** make :1312 blank-only like its two siblings and re-run the same chip; if the caption survives, that was it. Note the comment already at :599-603 anticipates the restore path but guards the *poll* writes rather than the *restore* write.
  - **Second asymmetry worth folding into the same fix:** the collapsed turn header at :480 reads `buildCollapsedTurnTitle(liveQuestion) || "…"` with no fallback, while the question bubble 46 lines below at :526 reads `liveQuestion || lastExchange?.question || ""`. Whatever clears `liveQuestion`, the header is the only one of the two with nothing to fall back on — which is why the symptom is a header showing `…` rather than a blank turn.
  - **Duplicate-question follow-on: not observed this run.** Batch A #1 produced a single turn. One clean run is not a close — the symptom was always intermittent — but it is one data point against it sharing a root cause with the caption bug, since the caption bug *did* reproduce in the same session.

---

## Terse mode (Speed answers in three lines)

Discovery ran with the maintainer on 2026-08-29. **Nothing is built.** This is the settled shape,
written down so the build does not have to re-ask any of it.

**What it is.** A toggle on the Ollama tab beside the reply-style slider, off out of the box, that
caps a **Speed**-mode answer at **three lines**. A line is a sentence or a bullet — one number
covering both shapes, because the promise is about what you can take in at a glance rather than
about grammar.

**It is an output rule, not an effort rule**, and this is the thing most likely to be got wrong by
whoever builds it. The model may think as long as it likes and read a screenshot as closely as it
likes; only what lands on screen is capped. The thinking-effort control is untouched, and a
screenshot question still comes back at three lines. The toggle's own help line has to say so,
because *shorter* reads as *dumber* otherwise.

**Speed mode only, and inside Speed it wins:**

| Against | Terse |
|---|---|
| Reply-style slider (Caveman / Balanced / Detailed) | **Ignored while in Speed** |
| AI character roleplay | **Overridden** — the character still picks the words, in three lines |
| Strategy and Expert ask modes | **Does not apply**, and the toggle says so in plain words |

The character override is a deliberate reversal of Caveman, which steps aside entirely when a
character is on ([ollama_prompts.py:967](../py_modules/backend/services/ollama_prompts.py#L967)).

**Two of Caveman's three escape hatches survive.**

- **Destructive warnings** drop out of terse and are written in normal prose — the same auto-clarity
  clause Caveman carries. A squeezed data-loss warning is the one failure worth spending lines on.
- **The ten depth phrases** still loosen the cap: `step by step`, `step-by-step`, `walkthrough`,
  `explain why`, `in detail`, `full guide`, `detailed guide`, `break it down`, `tutorial`,
  `comprehensive` (`user_asks_for_detail_depth`,
  [ollama_prompts.py:908](../py_modules/backend/services/ollama_prompts.py#L908)).
- **The character step-aside does not** — see the table above.

**Free alongside the three lines:** the existing fenced panels (`bonsai-strategy-branches`,
`bonsai-strategy-checklist`, the TDP `json` block, `bonsai-cite`), code blocks and file paths, and
pictures once anything can draw one. The `<bonsai-status>` line never counted — it is stripped
before display ([stripAssistantDisplayTags.ts](../src/utils/stripAssistantDisplayTags.ts)) and shown
as a streaming blurb, so it is not in the reply body at all.

**Getting more is the branch picker, and that is the real work.** Every terse reply ends with the
strategy branch fence; pressing an option gives three more lines and a fresh set of options, forever.
Buttons are **stacked full-width** in the 300px column rather than squeezed into one row, because a
full-width label can be a real phrase and the D-pad walk is then a straight line down. There is no
separate *explain further* chip, and no exit control — the Ask field stays live throughout, so the
menu is an offer rather than a trap. Today that fence is mandatory-once, Strategy-only, and
explicitly banned on follow-ups
([ollama_prompts.py:1317](../py_modules/backend/services/ollama_prompts.py#L1317)); all three have
to change. Locked as **[D40](audit/maintainer-decisions-locked.md)**.

**Enforcement is wording only** — nothing counts, nothing trims, nothing retries. Chosen with eyes
open: a trim can chop a reply mid-thought, and a retry costs a second round trip on a device where
that is slow. The cost is that the cap is a tendency rather than a guarantee, so it gets measured
instead of asserted.

**TERSE-01** counts lines across these ten questions — Speed mode, terse on — and passes at **8 of
10**. Approved by the maintainer 2026-08-29. They get pinned as a frozen chip batch when the work
starts, so each case is one press of A rather than a sentence thumb-typed on an on-screen keyboard.

| # | Question | Why it is in the set |
|---|---|---|
| 1 | how do i beat the dreadnought | KB boss card |
| 2 | what is the max tdp on a steam deck | short fact — should be one line |
| 3 | my game stutters when i turn | troubleshooting, invites rambling |
| 4 | should i cap fps at 30 or 40 | a choice — tempts pros and cons |
| 5 | what does proton do | a definition — tempts a paragraph |
| 6 | how do i deal with exploders | KB enemy card, and the known fence repro |
| 7 | is 8 watts enough for this game | a judgement — tempts hedging |
| 8 | what should i upgrade first | wide open; expected to fail first |
| 9 | why did my save not carry over | a cause question |
| 10 | how do i get more battery life | classic long-answer question |

**None of the ten contains a depth phrase, and that is not incidental.** Any of the ten words listed
above would loosen the cap on the very row written to measure it — the same reason `KB-ROUTER-01`'s
four sentences contain neither *deck* nor *proton*. Keep that property if a question is ever swapped.

**Known gap in the set:** none of the ten attaches a screenshot, so the *screenshots still get three
lines* rule is asserted and unmeasured. Worth an eleventh row if it ever misbehaves; the maintainer
chose the ten as they stand.

**Not decided:** the on-screen wording of the toggle and its help line.

**Pictures are exempt from the count, but nothing draws one.** The dungeon map and the boss outline
the maintainer described belong to **KB visual maps** in the backlog, which stays parked on purpose.
Terse ships without them.

---

## A chat carries what it has already covered into the next question

Row **CHAT-MEMORY-01**. Built 2026-09-21: a question now carries what its chat has already covered instead
of almost none of it, sized by the plugin's own budget rather than by whatever happens to be on disk.

**Tried on the Deck 2026-09-23 with nothing running, FAIL:** asking about Megaera in Hades, then "what
about her second phase" — the reply knew "her" meant Megaera but gave only generic fight advice, and Show
details said no search ran at all ("No game is running, so there is nothing to look up"). A third question,
"what weapon works best against her", lost track of who "her" was entirely and asked which game and
character were meant. Evidence `docs/test-evidence/plan64-FOLLOWUP-MEMORY-EVICTION.json`.

**Tried again 2026-09-23 with Hades running, still FAIL by this row's own rule:** 34 earlier turns were
carried, but the reply still opened with "I ain't got no idea what you're talkin' about without a name…
tell me which part" before guessing the right subject (Sandtraps) and giving two lines on it — the same
deflect-then-recover shape as with nothing running. Evidence `docs/test-evidence/plan64-CHAT-MEMORY-01.json`.

**The no-game half has a fix landed 2026-09-25 (plan 68):** with nothing running and the question naming no
game, a follow-up now searches the chat's own game instead of finding nothing to look up. Rerun on the Deck
is owed. **The second failure — the reply asking "tell me which part" before recovering — is exactly what
plan 68's row SUMUP-01 checks**, since it is the case a chat that has outgrown its room is built for.

---

## The chat sums itself up instead of being cleared

Asked for by the maintainer 2026-09-20. Two parts, and the second needs the first: **a chat keeps a short summary of what
it has covered instead of losing that memory outright**, and **the plugin rewrites that summary on its own once the chat
passes some size**, rather than waiting to be told.

What happens today, so nobody re-measures it:

- A chat slot saves the newest **200 turns** and drops anything older (`MAX_TURNS_PER_SLOT`). When a ninth chat is
  started, the oldest chat is deleted whole.
- Almost none of that reaches the model. A new question carries **the subject of a very recent Strategy or Expert
  question**, and nothing else; tapping a refinement chip pastes **the previous question and answer** ahead of the new
  message. There is no chat-wide memory at all.
- **Clear**, at the end of the Session tab, forgets that carried subject and the checklist position for the running
  game. It is the only control over this memory a person has, and all it can do is throw it away.

So the honest framing of this entry: the plugin has no session memory to compact yet. The first half of the work is
giving a chat a memory worth keeping; the second is keeping it small on its own.

**The first half landed 2026-09-21.** A question now carries what the chat has already covered, and how much of it is
carried is the plugin's decision rather than whatever happens to be on disk. Measured on the Deck with the same model and
the same chat, one difference between the two runs: asked *"and what about the boots?"*, a question naming no game at
all, it replied **"Please tell me which game you are referring to"** without the memory and **"You should keep the Iron
Boots off during the fight in Ocarina of Time so you can move freely and effectively use your Longshot to yank the
nucleus out of the water"** with it.

Three things that only showed up by running it rather than reading it, all now fixed and each with a test:

- **Carrying the conversation was not enough on its own.** With the turns plainly listed under a heading, the model still
  asked which game — it could see the chat and did not know it was allowed to use it. The heading is an instruction now.
- **The question being asked was already in the chat**, written when the Ask is accepted rather than after the answer, so
  it came back as "You asked: …" immediately before the very same question. Any trailing question is dropped.
- **A short chat asked for less room than its own heading needed** and came back empty with the room sitting unused.

What the block costs is bounded by two things, not one: the room, and **how long a person waits**. Reading the question
is the slow part, so the memory is held to what is worth waiting for rather than to what fits. And it sits at the **end**
of what the AI is told, behind the rules and the cards, because the server skips re-reading the front of a question that
has not changed and this block changes every turn.

Still to build (its own later plan): the spoiler-chance rating.

**Built 2026-09-25:** [plan 68](planning/68-chat-sums-itself-up.md), from twenty calls recorded as D118 in
the decisions file. A chat that has outgrown its room now gets a short summary of the older part right
before the next answer, written by the same AI, thinking off, about 200 words. The AI then carries that
summary plus the newest turns word for word. A note under the answer says a summary happened; on the newest
answer it opens Show details on the Session tab. *Sum up this chat* at the top of the Session tab does the
same by hand, in place of Clear, with a card showing what the AI kept; Clear and its confirm box are gone.
Each chat keeps its own summary and its own remembered subject now, in its own file, rather than the whole
plugin sharing one subject. Stop during a summary stops everything and saves nothing; a failure or time-out
answers the way it did before, with one warning line, and the next question tries again. Hidden spoiler
text is stripped before the AI ever reads the chat, checked by a unit test. Deck rows **SUMUP-01** to
**SUMUP-10** and a rerun of **CHAT-MEMORY-01** are owed (see [testing.md](testing.md)); the spoiler-chance
rating is left for a later plan of its own.

**Every call is in, 2026-09-20.** In the maintainer's own order:

1. **The summary goes into the next question**, so the model answers with the chat behind it — not just a panel a person
   reads. The useful shape, and the expensive one: it spends part of every reply's budget.
2. **It is written right before the next question**, not while the person is idle, and the extra wait is measured rather
   than guessed.
3. **Compact replaces Clear.** The Session tab loses Clear entirely. The person ends up with three deliberate choices
   in place of one blunt one: compact this chat, start a new chat (which begins with nothing carried over), or delete a
   chat. Compacting helps a conversation; sometimes a fresh chat is the better move, and that is the person's call.
   The job here is to offer the choice plainly instead of losing a conversation's memory with nobody choosing it.
4. **The chat's spoiler standing carries forward with the summary** — see *Spoilers* below, which is the largest piece of
   new thinking in this entry.
5. **The summary shows inside the Session tab, under the Compact button.** Exact shape settled when it is built.

**Measured on the Deck 2026-09-20.** Four of the five are answered. Every number below came off
the Deck itself, with its own model and its own AI server — which has moved on to Ollama 0.34.1
since this was last looked at. The target was, and stays, a good experience on the weakest machine
bonsAI will ever run on. A PC on the home network and the Steam Frame both hold more; note what
they hold when it is cheap to do so, but nothing is designed around them, and no choice here is
allowed to make the Deck worse.

- **How much the Deck's model really holds: far more than anyone thought, and more room is free
  in speed.** The model can hold 131,072 tokens. The 4,096 the plugin has been working to is the
  AI server's own default setting, not a limit of the model or of the machine. More room costs
  memory and nothing else: with a game running, answers came out at 21.7 tokens a second at
  4,096, at 8,192, at 16,384 and at 32,768 alike. Doubling the room costs 0.3 GB, quadrupling it
  0.6 GB. Under a heavy game the Deck had only 206 MB spare before the model loaded at all, and
  it still loaded at every size — but that is the edge, and it is why more room is a decision to
  take on purpose rather than a default to change quietly. **Still to decide.**

- **What more room costs a running game: nothing.** Measured two ways on 2026-09-20, because the
  maintainer asked for the worst case rather than a guess. Against a fixed graphics load, the model
  parked at 4,096 and at 16,384 scored 17,897 and 17,859 — the same number twice. So the size of the
  room is free in frames, and only costs memory. **What is not free is answering at all.** God of War
  ran **31** frames a second on its own, **20** while an answer was being written, and **31** again
  once it finished: about a third of the frame rate, gone for exactly as long as the answer takes, and
  fully returned afterwards. It runs both ways — the answer itself slowed from about 33 words-worth of
  text a second on an idle Deck to 12.5 with the game running. None of this is new, and none of it is
  caused by this feature; it is what asking costs today. It has its own roadmap entry now.
  Two honest limits on the frame numbers: they were read off the game's own on-screen counter at its
  menu rather than in play, and taking a screenshot itself loads the Deck — four in a row dragged the
  reading down on their own, so every number quoted here came from a single isolated capture.

- **What happens when a chat gets enormous: worse than losing the start. It falls off a cliff.**
  Going over does not trim to the edge. Sending 4,220 tokens into a 4,096-token space delivered
  2,051 of them. Sending 19,620 into the same space also delivered 2,051. One token too many
  costs about **half of everything sent**, every time, however far over it goes — and the half
  that goes is the beginning: who the AI is, the rules it must follow, and the game's cards.
  Proved by hiding a pass phrase at the very start of a long question. At 4,096 the model could
  not repeat it and answered with nonsense. At 16,384 it gave the phrase back word for word.

- **Where the tokens go today: two of the three Ask modes already do not fit**, with no chat
  memory in the question at all. One real question in each mode, the game's cards attached,
  thinking on medium:

  | Ask mode | who the AI is, and the rules | the game's cards | the question | thinking | the answer | total | against 4,096 |
  |---|---|---|---|---|---|---|---|
  | Speed | 566 | 475 | 9 | 512 | 800 | 2,362 | 1,734 spare |
  | Strategy | 1,098 | 1,410 | 9 | 512 | 1,600 | 4,629 | **533 over** |
  | Expert | 566 | 2,337 | 9 | 512 | 1,200 | 4,624 | **528 over** |

  So this feature cannot simply add a summary to the question. On two modes out of three there was
  nothing left to add it to. **That is the part now fixed (2026-09-21):** with the room raised to
  16,384, the worst of those three comes to 4,629 of 16,384, so there is space for a summary rather
  than a fight over what to drop. The table above is what the Deck's default gave; it is what a
  machine that cannot be raised would still give, which is why the budget work still matters.

- **How many tokens went in and how many came out: kept now, and the old guess was a fifth too
  big.** Counting characters and dividing by 3.5 made the plugin's own questions look 20% to 25%
  bigger than they are; the real figure measured 4.32 characters per token. That over-count was
  not harmless — the plugin pays for it by shortening the answer. On a Strategy question with
  cards and thinking on, the answer's allowance was 600 tokens and should have been 851. The real
  counts the AI server returns are now kept and learned from, so the guess corrects itself after
  the first reply of a session. Landed 2026-09-20.

**Still owed: what the summary costs.** How long writing it takes on its own, how much longer the
whole answer takes from press to first word, and how much of the answer's allowance the summary
eats. That one needs a summary to exist before it can be timed. What is already known is the
price of carrying anything at all: **reading the question is the slow part, at roughly 1.7 to 2
seconds for every 1,000 tokens.** A 500-token summary therefore costs about a second on every
question that carries it — before the cost of writing it.

**How often the summary is rewritten is what decides the cost (corrected 2026-09-20).** An earlier
version of this note said that writing the summary right before the next question costs about 14
seconds on every question. That was wrong, and the maintainer caught it: compacting happens when the
chat outgrows the space, not every turn — the way Claude Code's own auto-compact works. The cost
lands on the turn that compacts, and the turns in between are nearly free. Call 2 stands as written.

The numbers behind it, measured on the Deck. The AI server skips work it has already done on the
front of a question, as long as that part has not changed. With a long piece of session text at the
front and only the question itself changing: 15.3 seconds to the first word, then 1.1, then 0.8.
Change one word of that front text and the saving vanishes — 15.3, 15.3, 15.3.

Three things follow, and they are design rules rather than open questions:

- **Rewrite the summary only at the threshold, never every turn.** A rewrite costs a full re-read of
  everything in front of it — about 15 seconds on a chat this size — plus the cost of writing the
  summary. Between rewrites, questions cost about a second.
- **Nothing that changes every turn may sit in front of the summary.** The saving only holds while
  the text ahead of the question is exactly what it was last time. A clock, a turn counter, or a set
  of cards that comes back in a different order would destroy the saving for everything behind it,
  including the summary. This is worth checking on the real prompt before any of it is built.
- **Two honest limits.** The saving holds only while the model stays in memory (about five minutes
  idle and it is paid again), and moving between chats loses it.


**What the code said about today's behaviour, now checked rather than trusted (2026-09-20).** It was right about the
shape and wrong about the severity. When a question plus its reply allowance will not fit, the plugin shrinks the
**visible reply** first, never the thinking allowance, down to a floor of 600 tokens. Past that floor it sends the
request anyway, and the AI keeps the **end** and drops the **start** — who it is, the rules, the cards. The person gets a
confident answer with nothing behind it, and only the log says so. All of that held up. What did not hold up is "drops
the start": it does not drop the excess, it drops down to about half the space and stays there however far over the
question goes. That is the ceiling the summary has to live under, and it is a harder ceiling than this entry assumed:
every question carrying a summary spends part of the same space, so this feature can cause the very failure it exists to
prevent if the summary is not kept small. Both halves are ruled out by the maintainer anyway: the answer is not the part
that gets squeezed, and the plugin does not let the AI pick what to lose. See the shape below.

**Spoilers, and the second rating.** Today there is one spoiler number per answer: a **risk** rating of low, medium or
high, built from the game's own profile, the question, what the knowledge base returned and the model's own tag, with the
model's tag counting for about 60%. It is worked out fresh for each answer and never looks at earlier turns. So the
maintainer's read is right — there is one rating, and nothing that builds up over a chat. The new idea is a second number,
**spoiler chance**, that does look back: if one of the last twenty turns already touched a boss, this chat is likelier to
wander into spoilers than one that has not, and the summary carries that standing forward. One thing left to settle when
it is built: what the look-back counts and how far back it reaches. The other is settled — the standing belongs to one
chat and never follows a person into a new one, because a new chat starts with nothing carried over at all.
Whatever writes the summary must also keep hidden things hidden. A summary that spells out a fenced spoiler and
then pastes it into the next question is the worst failure this feature can have, and it needs its own check on the Deck.

**The plugin owns the token budget, not the model (2026-09-20).** The maintainer's wider point, and the harder half of
this entry: how many tokens a question spends, how much the summary costs, how much is dropped, and how the rest is split
between what the AI is told, its thinking and its answer — all of that has to be the plugin's decision, not the model's,
and the Deck is the machine it has to be right on.

What exists today is real but partial, and worth knowing before calling it a free-for-all. Each Ask mode already caps how
long the answer may run; thinking has its own separate budget, so turning thinking on cannot starve the answer; and when a
request will not fit, the plugin shrinks the answer rather than the thinking. What is missing is the part that decides
whether a person gets a good reply:

- ~~**The window is assumed, not asked for.**~~ **Fixed 2026-09-21, and it now goes further than asking.** The plugin
  *chooses* the room: it asks the server for 16,384 tokens rather than accepting its default 4,096, having measured that
  four times the room costs 0.6 GB of memory and nothing in speed or frame rate. Three rules hold it: never lower than
  what a server already gives, never more than the model can hold, and never changed once chosen — changing it reloads
  the model. **Strategy and Expert stop being cut short**: both had their answers trimmed to a 600-token floor and now
  get their full 1,600 and 1,200.
- ~~**The real counts arrive and are thrown away.**~~ **Fixed 2026-09-20.** The true count of what went in, what came
  out, and the guess made before sending are all kept side by side, so the gap between them is visible rather than
  assumed. The plugin learns the real characters-per-token figure from them and corrects itself after one reply.
- **The rules, the game cards and the chat itself have no stated share.** They are whatever size they happen to be, and
  the answer is squeezed to make room for them.
- **Past the floor, the AI chooses what to lose, and it loses the start** — who it is and what it must not do — while the
  plugin carries on as if nothing happened.

**The shape to build towards, set by the maintainer 2026-09-20.** Two things are ruled out. **Squeezing the answer to
make room for everything else is not the answer** — a reply that needs to be thorough cannot be cut short because
something unrelated grew. **Fixed hard limits per part are not the answer either** — 500 tokens for thinking, 500 for
the answer, 500 for the game cards, forever, regardless of the question, wastes the window on an easy question and
starves a hard one.

What is wanted instead is flexible with guard rails:

- Every part has a floor it is always guaranteed, so nothing can be starved out by something else growing.
- Above those floors the remaining room is shared according to what the question actually needs.
- Thinking has a ceiling it can never cross, so a runaway thinking budget can never eat the answer, the rules or the
  chat. A person who turns thinking on is asking for reasoning headroom, not for their answer to disappear.
- **Context is never lost by accident.** If something genuinely has to go, the plugin chooses what goes, and the person
  is told. That is the whole point of this feature — or at least an honest attempt to make it better than today, where
  the AI drops the start of the prompt and nobody finds out.

Related: the four-star **Session context and user stash** entry in the roadmap's Features list is the other half of the
same idea (live session facts plus notes the person can edit); if both are built, they should share one store rather
than each keeping their own.

---

## Make the preset chips look more like chips

Shipped 2026-09-17 under plan 60 (D110). Each chip now looks raised: a thin light line along its top edge and a soft
shadow beneath it. The two chips sit 6 pixels apart instead of 4. In decode, static and carousel mode there is now
8 pixels of open space between the chips and the question box, where before they touched (fade mode was already open
and keeps its own spacing). The word "Tip" became a small dot, the colour on the tags and on the resolving-text label
is quieter, and the chip the controller is on now shows a light bar along its bottom edge instead of the old blue
outline — a ring around the chip that nobody could actually see is gone too.

Passed on the Deck by measurement: rows 02, 03, 04, 05 and 06 (the one-chip check), and 08. **Row 09 failed on the
Deck 2026-09-18** — a real knowledge-base chip showed with no Tip dot — and is filed as its own bug on the roadmap.
Still owed: the maintainer's own look at rows 01 and 05, from the three screenshots named in the evidence file, and
row 07 (reduced motion), both on the maintainer's own page; and a look at the help and agent chips, which were not
on screen during this run. Italics were tried earlier for the label and turned down.

[Plan](archive/60-chip-button-restyle.md) · evidence `docs/test-evidence/plan60-QA-chip-button.json`.

## Shipped, QA owed — why each was built this way

Moved out of the roadmap's **Verify** section 2026-08-27. Each of these ships and works; what is
recorded here is the design reasoning, the options rejected and the measurements behind them, so
the choice does not have to be re-litigated when the QA row is finally run.

- ★★★ **Clear cache leaves the thread on disk — it clears the screen, not the session** — **fixed and device-confirmed 2026-08-27** across three separate causes ([D32](audit/maintainer-decisions-archive.md#d32--clear-cache-says-it-clears-the-thread-but-the-saved-chat-stays-on-disk-which-half-is-wrong) chat slot, [D34](audit/maintainer-decisions-archive.md#d34--locked-option-1-2026-08-27--clear-cache-is-undone-by-its-own-confirmation-box-what-should-come-back-afterwards) modal snapshot, [D35](audit/maintainer-decisions-archive.md#d35--locked-option-1-2026-08-27--clear-cache-clears-the-screen-but-the-ais-last-answer-is-still-stored-on-the-plugins-own-back-end-should-clearing-forget-it) backend forget). **CLEAR-CACHE-01** Partial — the "clears a generation still in flight" half is unit-tested only, because the model finishes faster than the D-pad walk to the button. Writeup: [archive/roadmap-bugs-fixed.md](archive/roadmap-bugs-fixed.md). **Still owed as its own follow-up (not settled by D32): orphan chat slots accumulate**, one per clear-and-reask cycle.

- ★ **You cannot ask for "the boss" — a card's type is not searchable** — fixed 2026-08-19; **KB-TYPE-01** Open. `sections_fts` indexes `(name, card)` only, so *"how do i beat the boss"* returned 0 candidates on a title whose boss card was right there, and the vector half did not rescue it. Fixed by **query-time type recall** (option b of the three in the original report): a generic type word pulls that game's cards of that type into the pool and marks them preferred, reusing the same flat `RRF_W_TOPIC` signal D22 introduced for compat. Chosen over indexing `section_type` in FTS because it needs no schema change and no corpus rebuild, so it reaches an already-installed corpus — and it is easy to reverse. Verified across three titles: DRG → Dreadnought, Hades → Theseus and Asterius, OoT → Volvagia/Gohma/Twinrova, and *"what dungeon should i do first"* → the dungeon card. Explicit route only, and a named card still outranks its own kind. **Narrowed 2026-08-19** once the Phase 4 cards took Ocarina of Time from three boss cards to six: the preference now applies only to kinds the keyword half missed entirely. `_sections_of_type` returns the game's first three cards of the kind **by section_id** — authoring order, no relevance in it — so preferring them unconditionally promoted an arbitrary slice over a real match. *"how do i beat the water temple boss"* returned Queen Gohma, Volvagia and Twinrova and dropped **Morpha**, whose card opens *"The Water Temple boss"*. Per kind rather than all-or-nothing, so a question naming two types can still rescue the half that found nothing. The rescue direction is unchanged and pinned by its own test. **Maintainer note:** this was one of the three options in the bug and you were mid-flight, so I took the reversible one; say the word if you want the FTS-index version instead.

- ★★ **You cannot ask about a game unless it is running** — fixed 2026-08-19 (**D19**); **KB-NEWTITLE-01** Open on-Deck. `resolve_title_from_question` scans the question against the alias table as a last resort, only when Steam supplies neither an AppID nor a name, so a running game always wins. Longest alias wins, word boundaries, 3-character minimum. Verified locally: *hl2 ravenholm* → Ravenholm, *drg survivor what class* → Classes, *how do gels work in portal 2* → Gels, *what is the best way to beat volvagia in oot* → Volvagia. **Two things the fix turned up:** a canonical title carrying punctuation (*The Legend of Zelda: Ocarina of Time*) never matched its own normalised form, so OoT resolved to nothing and fell through to the genre card; and the spoiler profile was unreachable by name, which D19 explicitly rules out — the name tables now carry the same two profiles in **both languages**, moved together with `tests/contracts/spoiler-title-profiles.json` (that contract caught the change, as designed). **On-Deck still owes** the negative direction: with a game running, a question naming a different title must still answer about the running game.

- ★★ **Expert mode attaches fewer knowledge cards than Strategy** — fixed 2026-08-18; **KB-EXPERT-01** Open, and it re-opens **KB-ASKMODE-01** for a re-run. The route flag asked for Strategy *by name* (`!= "strategy"`), so Expert carried the largest card budget (5) and the strictest relevance floor (4.0 against 1.0) at once. Now keyed off `_DECLARED_GAME_ASK_MODES`, the one definition of "the user declared this Ask to be about the game" — which the vector recall pass reads too, so Expert gained both together. Reproduced on the seed corpus before the fix and measured after: DRG Survivor *"what class should i pick"* Strategy 2 / Expert **1 → 2**; *"what should i upgrade"* Strategy 3 / Expert **1 → 3**. **On-Deck still owes** the count check against a real corpus — note it cannot be read off the screen, the Show details ladder prints no card count; use `scripts/probe_deck_kb_retrieval.py`. Writeup: [archive/roadmap-bugs-fixed.md](archive/roadmap-bugs-fixed.md).

- ★★ **Compat retrieval returns a tip from the wrong topic** — fixed 2026-08-18 (**D22**); **KB-ROUTER-02** Open on-Deck. The D16 router worked out the topic and retrieval discarded it. **The bug report's premise was half wrong and the fix changed because of it:** the on-topic tips were not out-ranked, they were **absent** — 0 of 8 storage tips and 0 of 10 steam_input tips ever reached the candidate list, because the questions share no vocabulary with them. So the topic now opens a recall path first and acts as a preference second. All four KB-ROUTER-01 sentences return an on-topic tip first (was 1 of 4); compat tune top-3 81% → 100%, and 96% on a Deck with no embed model, since the fix does not depend on one. Weight is the weakest that works, and a test pins that a clearly better off-topic tip can still win — raise it and D22 stops holding. Measurement: [audit/rag-compat-topic-preference-2026-08-18.md](archive/rag-compat-topic-preference-2026-08-18.md).

- ★★★ **KB download Cancel** — shipped 2026-08-05; **KB-CANCEL-01 — not testable as written, and that is the blocker.** Attempted on-Deck 2026-08-16 and abandoned: at 758502 bytes the whole download-decompress-install cycle takes **~0.9 s** (Deck log `Downloading…` 23:32:37.711 → `Knowledge base installed` 23:32:38.610), so there is no cancel window to press. What looked like a Cancel pass was the **storage picker** (`onPrimaryClick = installed ? runUpdate : openStoragePicker`, [KnowledgeBaseSection.tsx:527](../src/components/KnowledgeBaseSection.tsx)) — press one opens the internal/SD modal, press two starts the download. **To run this row at all the download has to be slowed** — throttle the link (`tc qdisc`), point the fetch at a stalled host, or add a dev-only delay. Until then the six frontend tests are the only coverage and the D-pad-reach half (the part unit tests cannot judge) is unproven.

- ★★★ **Soft** `num_predict` **+ thinking budget** — shipped 2026-08-10; **02 Verified, 01/03/04 Partial (automated, on-Deck confirm owed), 05 Open** (needs a real thinking model). Caps Speed 800 / Expert 1200 / Strategy 1600; soft continue on `done_reason=length` (max 2) with ephemeral **`Continuing…`**; C1 budgets in `ollama_ask_budgets.py` (`think: false` default). **Fixed 2026-08-15:** the cap table was keyed `deep` — the mode's pre-2026-06-26 name — so Expert silently ran on the Speed cap (800, not 1200) since the caps shipped; **EXPERT-CAP-01**. **Fixed 2026-08-15:** Stop landing within 120ms of the cue could persist `Continuing…` into the saved reply — `_update_partial_response`'s throttle dropped the cue-clear write; now a shrinking partial always bypasses the throttle, plus a client-side `stripSoftContinueCue` backstop. Unblocks **Thinking effort control**. Detail: [16-soft-num-predict-thinking-budget.md](archive/16-soft-num-predict-thinking-budget.md).

- ★★★ **Source attribution on knowledge chips** — shipped 2026-08-09; **KB-ATTRIB-01 Partial after on-Deck 2026-08-16 — one sub-check looks like a fail.** The positive case passes: a Portal 2 (`620`) Strategy Ask surfaced `theportalwiki.com · CC-BY-4.0 · as of 2026-08-09` under Show details with the card beneath it, credit accent on the block and a capture date that is not today's. **What did not pass:** the row requires the credit accent be *visibly distinct* from the amber an `open_weight` model chip uses, with both on screen — they were (`Routed gemma4:e2b-it-qat` four rows above), and in `DeckCapture_20260816_233808_game` **the two ambers read as the same colour**. Needs a maintainer eye on the panel and then most likely a token change in [design-tokens.md](design-tokens.md). Also still owed: the negative case (a maintainer-authored-only reply must show no accent and no credit block). **KB-ATTRIB-02** (published corpus ships `ATTRIBUTIONS.md`) is Verified on Deck.

- ★★★ **The eval harness scored every troubleshooting tip against the wrong vector** — fixed 2026-08-21. It kept **one** vector map keyed by `CorpusDoc.doc_id`, and `compat_patterns.pattern_id` and `sections.section_id` are independent sequences that both land in that field — so a section card's vector overwrote the tip's for every id in both tables, **122 of 124 tips** at the current corpus size. Production has never had this problem: it stores `section_vectors` and `compat_pattern_vectors` in separate tables. **Nothing that ships changed; what we could truthfully say about it did.** Corrected on the same corpus, tips only: vector-only top-3 **12.5% → 67.5%**, fusion **57.5% → 72.5%** against keyword's unchanged 65.0%. Across all labelled tuning rows, fusion top-3 **89.2% → 94.1%** against keyword's unchanged 88.2% — so the harness had been reporting that fusion barely beat keyword when it beats it by about six points. The `keyword` arm uses no vectors and is identical in both runs, which is what confirms the diagnosis. **The holdout ship gate is unchanged and still cannot separate the arms** (n=36, 83.3% both) — the correction did not buy a verdict. Prior reports carry a correction banner; [archive/research/kb-embed-bakeoff-2026-08-21-arms.md](archive/research/kb-embed-bakeoff-2026-08-21-arms.md) is the current one. **Does not disturb the compat recall decision taken 2026-08-18** — that was measured through the production service, not this harness.

- ★★★ **Vector half of hybrid retrieval has its own recall pass** — fixed 2026-08-18; **KB-RECALL-01** Open (on-Deck), **KB-RECALL-02** Verified (PC). The vector half no longer re-orders a keyword shortlist — it searches the resolved game's sections itself and RRF fuses two real lists, so a card that shares no keyword with the question is reachable. On `kb_eval_v2` (98 labeled strategy rows) top-3 went **95.9% → 100.0%** with **zero** regressions; the four queries measured on Deck 2026-08-17 now attach. **What a Deck still has to answer:** the pass costs an embed round trip (793–900 ms on device, ~28 ms against a PC Ollama), and it is gated to the **explicit** route so an Ask that merely happened while a game was open pays nothing — confirm both halves of that on hardware. Floor is measured, not guessed, and the two distributions **overlap**: [audit/rag-vector-recall-floor-2026-08-18.md](archive/rag-vector-recall-floor-2026-08-18.md). Writeup: [archive/roadmap-bugs-fixed.md](archive/roadmap-bugs-fixed.md).


---

## The shipping retrieval arm loses to the vector half alone on rows nobody tuned against

- ★★★★ **The shipping retrieval arm loses to the vector half alone on rows nobody tuned against** — found 2026-08-29 by the first
  measurement against the 92-row blind holdout (**D37**, endorsed the same day). On `holdout`, `vector_only` scores **83.7% top-3 / 64.1%
  top-1** against the shipping `rrf` arm's **79.3% / 56.5%** — **7.6 points of top-1**. On `tune` the two were level (91.5% top-3 each,
  `rrf` marginally ahead on top-1). An arm that ties on the rows its weights were tuned on and loses by that much on rows written blind is
  the textbook shape of **fusion weights that do not generalise**, and catching it is the whole reason a blind holdout exists.
  **Filed as [D38](audit/maintainer-decisions-locked.md#d38--deferred-at-the-maintainers-request-raised-2026-08-29--what-ships-is-beaten-by-half-of-itself-on-the-blind-rows-how-should-that-be-acted-on)
  and DEFERRED 2026-08-29 at the maintainer's request** — more data, more games and more questions
  first. **No weight changes until it is answered, and never by tuning against holdout**, which would burn the only clean gate in the
  fixture. The knot worth remembering: the weights were never tuned (equal, locked 2026-08-09), and `tune` rated the blend the best arm
  available — so the one split it is legal to tune against said "change nothing" while the gate said otherwise. **Groundwork done:** 51
  blind rows added to `tune`, which had none ([audit/kb-blind-tune-rows-2026-08-29.md](archive/kb-blind-tune-rows-2026-08-29.md)). Run of
  record: [archive/research/kb-embed-bakeoff-2026-08-29-arms.md](archive/research/kb-embed-bakeoff-2026-08-29-arms.md).

**The weight sweep ran, and the change was reverted — 2026-09-06 (D82).** Leaning the search toward meaning (counting
it twice the word search) wins on both the tuning questions and the held-back ones: right note first 69.6% against
65.5% on tuning, 43.0% against 37.0% on the held-back set — a consistent direction, though every range overlaps, so
this is a direction and not a separated result. **Reverted anyway, because it breaks three rules set on purpose:** a
note whose meaning index has not been built yet gets buried behind one that has; a strong exact word match can be
pushed aside by a weaker meaning match; and one case of the locked topic-preference decision (D22) stops holding. At
equal weight a word-first and a meaning-first note tie; halve the word weight and the meaning-first note wins every
tie, everywhere — that is a design decision, not a measurement one. **The maintainer's rule for lifting it:** not
until every note is guaranteed to have its meaning index before it can be searched. The other two objections are not
covered by that rule and still need answering separately if the lean is ever taken. Weights stay even. Full write-up:
D82 in [audit/maintainer-decisions-locked.md](audit/maintainer-decisions-locked.md).

## A troubleshooting question that only describes the symptom reaches no tips

- ★★ **A troubleshooting question that only describes the symptom reaches no tips** — found 2026-08-28 by the second batch of blind
  holdout rows, before any of them were scored. The compat router reaches a question that **names** a topic and not one that only says
  what is going wrong: *"the game drops me back to the library a few minutes in"* (`V2-BLIND-H55`) never routes, because the word *crash*
  is absent; *"my controller works fine on the desktop but the game doesn't seem to see half my buttons"* (`V2-BLIND-H19`) never routes,
  because the word *input* is absent. **Two of the four blind compat rows miss.** This is the D16 gate doing what it was specified to do —
  word-boundary topic matching replaced the old literal `deck`/`proton` phrase gate — so it is a reach limit rather than a regression, and
  the fix is a maintainer call, not a threshold tweak. Neither row was reworded to make it pass; both are named in the reach pin
  (`tests/test_compat_topic_router.py`). Worth noting the shape: a card-derived question about crashes says *crash*, so this hole was
  invisible until questions were written without reading the cards. Detail:
  [audit/kb-blind-holdout-rows-batch2-2026-08-28.md](archive/kb-blind-holdout-rows-batch2-2026-08-28.md) § 5.

**Built, measured, held back — 2026-09-06 (D81).** The agreed fix (let the meaning search run over the tip sheet when
no topic matched) was built and measured on four plainly-worded questions. One that used to get nothing now reaches
the controller tips — a real win. Two already worked and are unaffected. The crash question still fails, and is
arguably worse than before: it now attaches a tip about desktop mode, the wrong subject entirely, where it used to
attach nothing. **Why:** on the real tip sheet the plain word search almost always returns something, even a weak
match, so the meaning search rarely gets a turn — and even forced to run anyway, the closest tips to *"drops me back
to the library"* by meaning are about desktop mode and storage, not crashes. Matching by meaning does not connect how
a person describes a crash to how the crash tips are written; that is a fact about the tip sheet's wording, not the
code. Held, not shipped. The branch `lane/kb-symptom-search` is kept. The follow-up work — rewriting the tips to use
the words people actually type — is its own roadmap entry now. Full write-up: D81 in
[audit/maintainer-decisions-locked.md](audit/maintainer-decisions-locked.md).


**Re-measured 2026-09-07 with the tips rewritten and the routing widened, and it stays held.** The held branch does
reach further: with nothing running, all 24 of the fresh plainly-worded problem sentences get into the search, against
8 without it, and *"thank you very much"* still attaches nothing. **But what comes back is wrong.** *"game wont even
open"* and *"screen goes black when i open it"* both attach a tip about the on-screen keyboard; *"game keeps quiting to
the home screen"* attaches one about waking from sleep; *"buttons not working right half the time"* attaches one about a
PlayStation pad over Bluetooth; *"cant find my pc on the network"* attaches one about hotel Wi-Fi. **That is the same
objection that held it in the first place** — a wrong tip is worse than none.

**And the cause is now clear, which is the useful part.** The branch's meaning search is written to run *only when
nothing else finds anything*, and that almost never happens: a plain word search across 156 tips nearly always finds
something by shared words, so it wins first with a poor match and the meaning search never gets a turn. Every one of
those five came back by word search, not by meaning. **What is missing is not a wider gate — it is a way to say "none
of these tips fit."** Until there is one, opening the gate makes things worse.

**One more wrong tip, found on the device 2026-09-07 (R4):** on the routing already shipped, *"when I plug it into the
television the menus show up in the wrong spot on the screen and are hard to read"* comes back with a tip about Big
Picture Mode versus Desktop Mode, which does not answer it. Evidence
`docs/test-evidence/plan47-R4-problems-reach-tips.json`.

**More history, moved from the roadmap 2026-09-21:**

- ★★ `[KB]` **A troubleshooting question that only describes the symptom reaches no tips** — **ACCEPTED, held back
  2026-09-06, re-measured 2026-09-07 and still held (D52, D81).** The fix does reach further: with nothing running, all 24
  fresh plainly-worded problem sentences get into the search, against 8 without it, and *"thank you very much"* still
  attaches nothing. **But what comes back is wrong** — six measured examples, each attaching a tip about something else
  entirely, such as the on-screen keyboard for *"game wont even open"*. A wrong tip is worse than none, which is the same
  objection that held it the first time. **The cause is now clear, and it is the useful part.** The meaning search only
  runs when nothing else finds anything, and that almost never happens: a plain word search across 156 tips nearly always
  finds something by shared words, so it wins first with a poor match and the meaning search never gets a turn. **What is
  missing is not a wider gate — it is a way to say "none of these tips fit."** Until there is one, opening the gate makes
  things worse. The real fix is rewriting the tips, filed as its own entry below. All six wrong tips:
  [detail](roadmap-details.md#a-troubleshooting-question-that-only-describes-the-symptom-reaches-no-tips).

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

## Unrelated questions still get game cards stapled on (2026-09-02 wording)

See also [Ordinary phrases attach game cards](#ordinary-phrases-attach-game-cards) above.

- ★★ **Unrelated questions still get game cards stapled on** — **PARTIAL; the maintainer chose to live with it 2026-08-27.** With a game running,
  *"thank you very much"* still attaches a Nitra card and *"what time is it"* attaches three. Two of the six test phrases were fixed by the D28
  floor change; the other two come from the keyword half, and raising that floor pushes against D25. Confirmed on hardware, card for card.
  The residue is judged acceptable because the model mostly ignores an irrelevant card. Tables, method and the D28 numbers:
  [roadmap-details.md](roadmap-details.md#ordinary-phrases-attach-game-cards).


## Token streaming reveals text in chunks while a game is running

- ★★ **Token streaming reveals text in chunks while a game is running** — **measured properly on device 2026-08-28 with DRG Survivor
  actually running** (the condition earlier passes could not meet). Both halves of the old contradiction are real, at different moments:
  tokens arrive in bursts, and *during a paint burst* the QAM overlay dropped to **47 fps** with a worst frame of **50 ms** (39 frames over
  20 ms in a 3-second sample); *between bursts* it sat at a flat 60 fps, worst frame 17 ms. So the reveal is chunky because delivery is
  bursty, not because painting is slow — the repaint of a burst costs about a quarter of the frame budget for as long as the burst lasts.
  Overlay frames only: the rig reads the QAM's own page and cannot measure the game's frame rate — the maintainer's performance overlay is
  the judge of whether the game itself stutters during a burst. Full numbers in [testing.md](testing.md) **STREAM-11**.

## The tab names never appear

- ★★ **The tab names never appear** — **OPEN, filed by the maintainer 2026-08-30:** the strip shows glyphs only, and *Main*, *Ollama*,
  *Settings* and the rest are nowhere, though the mock-ups draw them. **Read the decision before writing any CSS:** this is not an
  oversight, it is [R5](archive/major-redesign.md) — *filled active glyph only, no micro labels, no width change, no height cost* — which the
  backlog entry **Tab-strip micro labels + wide active cell** records as deliberately not built. So the fix is to **reopen R5** in
  [audit/maintainer-decisions-locked.md](audit/maintainer-decisions-locked.md) first, and it needs settling alongside the collapsing tab
  bar below, which wants the active tab readable at a glance and is the natural place for a name to live. **Planned 2026-09-01:**
  settled inside [archive/30-collapsing-tab-bar.md](archive/30-collapsing-tab-bar.md) — the thin bar names the active tab at rest
  and the open strip names all six. R5 is reopened as **D44**. **Fixed 2026-09-02:** the bar shows the active tab's name at rest
  (11px caps in the character accent) and the open strip labels all six tabs (8px caps, PERMS and DEV as the short forms while
  Developer is mounted). D44 locked. Rows **TAB-BAR-01…06** pass on the Deck; the by-eye legibility check (**TAB-BAR-07**) is the
  maintainer's.


## Small and cosmetic, as filed

- ★ **The active chip in Show details is hard to spot** — no focus ring, and the "Chip 1 of 6" counter is easy to miss. Filed by the maintainer.

- ★ **The question overlay is a few pixels out of line** with the native text field underneath it, most visible on a three-line question and on
  the empty-field placeholder.

- ★ **Focus ring gets clipped on grid layouts** — **OPEN, found 2026-08-27.** Tiles sit flush against the edge of their grid, so the
  highlight around a focused tile is cut off instead of drawn in full. Most visible on the AI character picker; check any other
  screen that lays tiles out in a grid. Needs each grid to leave a margin outside its own edge for the ring to fit.
- ★★ **Focus ring styling is inconsistent** between plugin controls and Steam's own — **PARTIAL.** Modal scoping shipped; a blanket rule was
  tried and reverted in favour of Steam's native outline.

## Vertical space for the chat bubbles (the lane, as it read)

### Vertical space for the chat bubbles

**Overarching goal, set by the maintainer 2026-08-30:** buy back as much vertical room for the chat bubbles as possible — every bit of
height in the 300px column is worth something. Today most of it goes to chrome: a tab icon bar, a preset block, a button row under each
answer, and a Session context bar. These four each hand some of it back, which is why this lane is listed **first** rather than in the
alphabetical order the rest of the Backlog uses.

- ★★ **Show details becomes a divider, not a chip**
  - **Goal:** At the end of a reply, **Show details** stops being a button and becomes a full-width
    divider with the label in the middle — `---------- Show details ↓ ----------`. It reads as the end of
    the answer rather than as another control competing with it, and the row it currently shares stops
    needing to exist.
  - **Prior art in the same file:** the collapsed-history row (`.bonsai-chat-earlier-pill-row` + `-rule`)
    is already a label centred on a hairline. Copy that shape rather than inventing one.


## A setting for one or two preset chips

- ★★★ **A setting for one or two preset chips** — filed by the maintainer 2026-09-02.
  - **Goal:** A Settings option chooses whether the preset row shows one chip or two side by side. Two stays the default (D43); one gives
    the label the whole column, so most suggestions read at rest without scrolling.
  - **The cost is plumbing, not the row:** the row already reads one constant for "how many across" (`PRESET_VISIBLE_SLOTS`, which the
    carousel window, the seed queue and the corpus Tip guarantee all follow), so the render side is making that a live value. The setting
    itself is the ~18-file, ~30-edit-point walk in CLAUDE.md, plus a QA row per chip mode. The 2026-08-31 one-chip build (`fc1b245`) is the
    reference for how one across should behave.

## Copy sits in the answer corner, not in a button row

- ★★★ **Copy sits in the answer's corner, not in a button row**
  - **Goal:** **Copy** becomes a small semi-transparent icon in the corner of the answer bubble — the same weight as the microphone in the
    Ask field — drawn as the standard two-overlapping-rounded-squares copy glyph, styled to the SteamOS motif. The button row under the
    reply loses an entry and the transcript gains its height.
  - **The hard part is focus, not paint.** Answer bubbles are not D-pad stops today, so a control inside one needs a way in and back out
    ([AGENTS.md § The Steam Deck focus graph](../AGENTS.md#the-steam-deck-focus-graph)). Copy must not quietly become touch-only.

## Thinking tips replace the status blurb (Thinking effort Phase 2)

**Retired 2026-09-05 (D70 #6).** Real thinking replaces the composed phrases wherever thinking is on, under
**Reasoning display** ([40-reasoning-display.md](archive/40-reasoning-display.md)); the phrases stay as they are with thinking Off.
The roadmap entry is removed; this note is what remains of it.

- ★★ **Thinking effort control** — **Phase 1 shipped 2026-08-15; Phase 2 Backlog**
  - **Phase 1 (shipped):** Ollama tab → **Thinking** row, Off / Brief / Balanced / Deep, defaulting **Off**. Sends `think: true` for all three on levels — named levels are gpt-oss-only and qwen3 / deepseek-r1 reject a string (**D21**, superseding doc 16) — with effort carried by the reserved budget (256 / 512 / 1024) added to `num_predict`. A model that cannot think gets one silent retry with thinking off, is remembered for the session, and the user is told once. On-Deck **THINK-EFFORT-04**, **THINK-EFFORT-05** Open.
  - **Phase 2 (Backlog):** Replace the cosmetic `<bonsai-status>` blurb outright with hand-curated bonsAI tips — feature tips ("Ask-mode Speed trims replies for a quick answer") for generic asks, KB-strategy tips ("A run spent only kiting is a run that ends underpowered") for game-specific asks, selected contextually by current game/mode. Not a fallback for otherwise-empty moments — the generic filler copy goes away entirely. Data file shaped like `data/kb/strategy_seed.json`.
  - **Not in scope:** Reply verbosity → token budgets; caveman / lowering `num_predict`; native gpt-oss levels (needs per-model capability detection — see D21).
  - **Related:** **Reasoning display** (below) — once raw `thinking` streams live, it takes over the slot Phase 2 tips otherwise fill.

## Make token streaming the default and drop the setting

- ★★ **Make token streaming the default and drop the setting** (maintainer direction 2026-08-23)
  - **Goal:** `bonsai_token_streaming_enabled` goes away and streaming is simply how replies
    arrive. Stated by the maintainer 2026-08-23 as the intended end state, not a proposal.
  - **Gate:** the outstanding streaming bugs are fixed and the reveal performs well on the Deck.
    The live blocker is *Token streaming reveal is chunky under game load* in [Bugs](#bugs),
    measured 2026-08-22 with a game running; the earlier idle-Deck measurement that called it
    smooth does not cover this case.
  - **What it shrinks:** every QA row currently written as "with streaming on and with it off"
    loses half its work — **DESTRUCT-ADVICE-01** most directly, whose accepted limitation only
    exists on the streaming path. Do not spend on hardening the non-streaming path meanwhile.
  - **Two-language removal, so budget for the plumbing:** dropping a boolean is not the reverse of
    adding one. Python is authoritative (**D13**), both settings contracts need the key gone, and
    a Deck whose `settings.json` still carries it must not read as "the setting reset itself".

## User-adjustable spoiler fencing (absorbed into the tiered setting)

- ★★ **User-adjustable spoiler fencing** (hide by risk band)
  - **Goal:** Settings control for tap-to-reveal / fence masking by estimated risk band.
  - **Depends on:** spoiler confidence chip; shipped `strategy_spoiler_masking_enabled`.
  - **Related:** [spoiler-constitution.md](planning/spoiler-constitution.md).

## Ask / reply items with short entries, as filed

- ★★★ **Custom model in Pull Models picker** (custom pull + Ask pin + New badges)
  - **Goal:** Pull any valid Ollama-library tag; **Use for Ask** pin; **New** badge (≤30 days).
  - **Depends on:** shipped Pull Models picker + living overlay merge.
  - **Not in scope:** LAN/remote `ollama pull` (→ **LAN custom model pull**).
- ★★★ **Dynamic keep-alive / smart unload** (research spike)
  - **Goal:** Research-only: hold models loaded vs unload when a game takes focus on Deck APU? Spike decides go/no-go.
  - **Not in scope:** production unload before spike doc.
- ★★★ **Per-mode latency timeouts** (warn vs hard limit profiles)
  - **Goal:** Separate warning and timeout values per selected mode.
  - **Depends on:** Mode selector (shipped).

- ★★★★ **Connection doctor** (guided first-Ask repair — candidate)
  - **Status:** Accepted 2026-09-05 (D64) as one feature with the snapshot folded in. Planned in [39-connection-doctor.md](planning/39-connection-doctor.md).
  - **Goal:** **Fix this** on Ask failure walks probes → one next action with Ollama-tab deep link.
  - **Source:** [13-roadmap-feature-ideas.md](archive/13-roadmap-feature-ideas.md) § B3.
- ★★★★ **LAN custom model pull** (remote host — decision review)
  - **Goal:** LAN Ask host: add/pull models not in catalog — blocked until mechanism chosen (R1–R4).
  - **Depends on:** **Custom model in Pull Models picker**.
- ★★★★ **Session context and user stash** (deck-first context)
  - **Goal:** Live session facts + user-editable stash notes for Ask; no embeddings/cloud.
  - **Not in scope:** vector DBs; cloud sync.

## Deck health snapshot, Local reply TTS, On-Deck model benchmark

- ★★★★★ **Deck health snapshot** (full diagnostics + Ollama)
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Goal:** Read-only diagnostics dump to Desktop; Magic Ask `bonsai:diagnostics`.
  - **Folded 2026-09-05 (D64):** into **Connection doctor** as its **Save a report** button and typed command. The roadmap entry is
    retired; this note is what remains of it. [39-connection-doctor.md](planning/39-connection-doctor.md).
- ★★★★★ **Local reply TTS** (Phase 1–2 character voice)
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Goal:** Phase 1 offline TTS play/stop; Phase 2 character-aligned read-aloud (legal gate).
  - **Memo 2026-09-05:** [42-read-aloud-feasibility.md](planning/42-read-aloud-feasibility.md). SteamOS ships a voice since 3.7.13;
    the natural voice is the sherpa-onnx runner (Apache 2.0, 28 MB) plus one Piper voice (63 MB); playback goes out through the
    background program the way the microphone comes in. The legal gate is one rule: stock voices only, never a real person's voice.
    Calls open as D74, including a split into Phase 1 (three stars) and Phase 2 (two stars).
  - **Split 2026-09-05 (D74):** the five-star line is retired. The roadmap now carries **Read answers aloud** (two stars: the
    Deck's own voice, no download, auto-read setting, spoken spoiler phrase) and **A voice per character** (three stars: the
    natural voice download, then a stock regional voice or an invented one copied from a five-second clip). This note is what
    remains of the single entry.

- ★★★★★ **On-Deck model benchmark** (measured routing order)
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Goal:** Rank installed models by measured speed/completion; offer as try order (with confirmation).
  - **Depends on:** shipped routing pickers; overlaps **Dynamic keep-alive** measurements.
  - **Source:** [13-roadmap-feature-ideas.md](archive/13-roadmap-feature-ideas.md) § C1.
  - **Descoped 2026-09-06 (D75, open):** the gate in § C1 asked whether timings hold still before ranking on them. Nobody ran
    it; the plan takes the descope now: [43-model-speed-readout.md](planning/43-model-speed-readout.md) shows each model's last
    timing on this Deck, keeps a ten-entry record per model with the running game, and adds a one-press timing button. The
    record answers the gate over weeks of ordinary use; if timings hold still under "no game, Speed, thinking off", the ranking
    becomes a small feature on top. Retiring this line is call 5 of D75.

## First-run ghost New chat label

- ★★ **First-run ghost "New chat" label at the create position**
  - **Goal:** On a fresh install the `[+]` position carries a faint "New chat" hint, so the first
    thing a new user sees says what the button does.
  - **Board 6c-A; deliberately not built.** Locked decision: the create position is the literal
    `[+]`, re-confirmed on board 8f. Same rule as above — reopen the decision before building it.


## Replace the bonsAI tab icon

- ★★ **Replace the bonsAI tab icon with the redesign's**
  - **Goal:** The Main tab's glyph becomes the redesign's mark rather than the current tree drawing,
    which reads as a smudge at tab size. Expect to simplify it — flatter, more silhouette than
    illustration — because it is rendered at **14px** on a 300px column.
  - **It has to be an inline SVG path, not the PNG.** `BonsaiTreeTabIcon`
    ([icons.tsx:61](../src/components/icons.tsx#L61)) draws inline so the glyph inherits `currentColor`
    and the active-tab fill treatment; `assets/logo.png` cannot do either. Budget for a trace, not a
    file swap. Geometry is pinned by `icons.bonsaiGeometry.test.tsx`, so update that in the same change.

## Adjustable text size in Settings

- ★★★ **Adjustable text size in Settings**
  - **Goal:** A setting that scales the plugin's text so a reply can be made larger for reading at a
    distance, or smaller to fit more on screen — the second of which serves the vertical-space goal
    above.
  - **The scaling hook already exists.** `uiScalePx()` is applied throughout the stylesheet, so the
    mechanism is present; the work is exposing it as a setting, deciding what it does and does not
    scale (icons and the 300px column width must not move — design-language Rules 1 and 6), and
    paying the ~18-file plumbing cost one setting costs ([audit/03-friction.md](audit/03-friction.md)).


## Focus / Deck UI items with short entries, as filed

- ★★★ **Search density UX** (match emphasis + tighter rows)
  - **Goal:** Tighter, more scannable search results with highlighted match tokens.
- ★★★★ **SteamOS Share path** (capture → attach)
  - **Goal:** Faster path from SteamOS Share / capture flows into screenshot attach where APIs allow.
- ★★★★ **SteamOS spin hint card** (immutable spins)
  - **Goal:** Detection + deep link to troubleshooting for immutable spins.


## Spoiler coverage should be a setting with tiers

- ★★★ **Spoiler coverage should be a setting with tiers** — proposed by the maintainer on the corpus gap sheet, 2026-08-29:
  *"I think spoiler coverage should be matched to a future setting. On one setting, there's no spoiling of bosses/endings/chapters. On
  the another end it'll allow anything specifically asked by the user. On another it's anything past the intro/tutorial."* Today the fencing
  rule is fixed. **Half of it already ships:** their closing line — *"if the user asks about a boss or area specifically, they don't care
  about spoilers"* — is Phase 4's locked spoiler rule (stay unfenced when the user named the thing), so the instinct matches the code. What
  is new is wanting the rest exposed as a user choice. **Default if nothing is chosen, also from the sheet: fence only named story beats and
  endings.** Needs a Settings control (and therefore a focus-graph entry), a tier the spoiler service reads, and prompt wording per tier.
  [audit/corpus-gap-answers-2026-08-29.md](archive/corpus-gap-answers-2026-08-29.md) § 5.

## The corpus has no starting out card

- ★★★ **The corpus has no "starting out" card** — found 2026-08-29 by what the gap sheet's free-text answers asked for rather than by what it
  asked about. Every strategy card is about a *thing*: an enemy, an item, an area, a mechanic. The maintainer asked twice for **build and
  early-game guidance** ("pros and cons of different builds, make cards designed around early game, or even character design" — for both
  Cyberpunk 2077 and Fallout 4) and once for **an orientation card pitched at someone who knows a neighbouring game** ("explain this game to
  someone familiar to GTA but not RDR"). Neither shape fits the existing types cleanly. **Open question before any are written:** whether
  this is a new `section_type` (which is a schema and chip-wording change) or lives as `mechanic` with a naming convention. Not smuggled in
  under D39, which was only about four existing cards' kinds.


## Eval fixture cannot see a recall failure

- ★★ **Eval fixture cannot see a recall failure** (paraphrase rows)
  - **Goal:** `kb_eval_v2` has **1** labeled case out of 138 where keyword search returns nothing, so the slice that proves the vector half adds recall is a sample of one. Measured 2026-08-18 by the re-aligned harness. Add paraphrase rows — questions that ask for a card without using its words — until that slice can gate a regression.
  - **Starting material:** the 15 paraphrased questions in [audit/rag-vector-recall-floor-2026-08-18.md](archive/rag-vector-recall-floor-2026-08-18.md) are already written, measured and labelled with the card each one should return. `tests/fixtures/kb_eval_paraphrase_v0.json` (15 rows) exists but the arms run does not read it.
  - **Needs a maintainer call first:** the v2 fixture is approved and the PR2 bake-off was measured against it — new rows change what the numbers mean, so decide whether they join v2, form a v3, or stay a separate reported slice.
  - **Largely overtaken by the blind holdout rows, pending one measurement.** The 15 paraphrase rows joined v2 as `V2-PARA-*` under **D23** (all `tune`), and 56 blind rows joined as `V2-BLIND-*` under **D37** (all `holdout`) — 20 on 2026-08-28 and 36 later the same day, 18 of the second batch written as pure paraphrases sharing no vocabulary with their card. The keyword-blind slice was **3** labeled rows when last measured on 2026-08-28, up from 1. **It has not been re-counted since the second batch**, deliberately — no measurement was run while those rows were written. Re-count it on the next arms run before deciding whether this item is closed.

## KB visual maps

- ★★★ **KB visual maps** (strategy maps — later wave)
  - **Goal:** Optional visual strategy maps in KB-grounded replies after brief callout cards exist. **Two shapes named by the maintainer 2026-08-29:** a **dungeon map**, and a **boss outline** with the limbs and weak points marked the way Fallout marks them — so a player sees where to aim instead of reading a sentence about it.
  - **Still parked, and Terse mode does not un-park it.** Terse ships with no picture at all; its *pictures don't count against the three lines* clause is forward-looking. Nothing draws anything in a reply today — replies are `react-markdown` plus the existing fenced panels.
  - **Open:** what a boss outline is *made of* — characters the model types out, a drawing shipped with the card, or one the plugin draws from the card's own `Weak points:` line. Undecided 2026-08-29. A **dungeon map has to be authored** either way, which puts it behind the WikiTeam / archive.org source policy and a corpus rebuild — the same wall Phase 4 track 3 sits behind.
  - **Plan / depends on:** [17-kb-online-versus-strategy-content.md](planning/17-kb-online-versus-strategy-content.md) Stage 5; callout cards (OV-3.1). Phase 4 chip work remains orthogonal.

## KB online / versus strategy content, and RAG Phase 5

- ★★★★ **KB online / versus strategy content**
  - **Goal:** Online multiplayer strategy — versus, co-op, map callouts — new `section_type` values + spoiler table updates. Tier lists parked. Visual maps later wave in same plan.
  - **Plan:** [17-kb-online-versus-strategy-content.md](planning/17-kb-online-versus-strategy-content.md) (discovery locked 2026-08-09).
  - **Source policy:** WikiTeam / archive.org dumps only; hybrid attribution (short chip + snapshot in `ATTRIBUTIONS.md`).
- ★★★★ **RAG Deck query — corpus expansion (Phase 5)**
  - **Goal:** Corpus maturity after Phase 4 sample paths; session chip vector ranking.
  - **Status:** Seed deepening largely in remediation PR2; remainder depends Phase 4. [knowledge-base.md](knowledge-base.md) § Phase 5.

## RAG Phase 4: extended retrieval

- ★★★★ **RAG Deck query — extended retrieval (Phase 4)** — **tracks 1–2 shipped 2026-08-19, track 3 blocked**
  - **Goal:** Richer retrieval shapes — chip visibility, structured cards, per-game compat tips.
  - **Track 1 (shipped):** chip guarantee (≥1 corpus chip when candidates exist), game chips preferred over
    shared Deck tips, **Tip** badge on game chips only. The chip pool now draws **one kind at a time** rather than filling from the highest-priority kind first: the track 2 cards took Ocarina of Time to six boss cards and its whole pool became six *"How do I beat X?"*, with its items and enemies unreachable and six boss names offered in a carousel a player is only browsing. Enemy and item cards get their own wording (*"How do I deal with X?"*, *"How do I use X?"*). Costs nothing where a title's cards are lopsided — Left 4 Dead 2 files seventeen cards as `mechanic` and returns the same six chips, reordered. On-Deck **PHASE4-CHIPS-01** — **badge direction passed 2026-08-29**: the **Tip** badge lands on the game chip only, never on a shared compat chip or a static seed. **The clipping direction is blocked** by the vanishing-corpus-chip bug in Bugs above, which keeps 5 of the 6 game chips off the screen, so no long label ever renders to measure.
  - **Track 2 (shipped):** 16 structured cards for the two sample titles — 6 enemy, 6 item, 4 boss —
    authored with labelled lines (`Summary:` / `Weak points:` / `Uses:` / `Phases:` / `Tips:`), plus a
    conditional prompt clause that keeps those labels as light bullets in the reply. Corpus 117 → 133
    sections. Measured against the built corpus with the real embedding model: of 18 questions naming or
    describing a new card, **0 reached one before and 15 after** (16 once the type-recall preference was
    narrowed, below). The misses are pure paraphrases sharing no word with the card —
    `what do i do about the big one that tanks everything`, `something keeps grabbing me and sending me
    to the start`. No regression on the six questions that already worked.
    On-Deck **PHASE4-CARDS-01** — **not waiting on the device.** Its testing was completed 2026-08-22 (all six questions attach the right card first; the prose-only direction passes). What is left is a **maintainer call**, not a run: with `gemma4:e2b-it-qat` the bullets survive on 4 of 6 questions but the card's own labels on only 1 of 6, and whether to strengthen the prompt, route a larger model, or accept prose is the open question. Detail in [testing.md](testing.md).
  - **Track 3 (blocked):** per-game troubleshooting tips need an `app_id` column on `compat_patterns` —
    a **schema v4 bump and a corpus rebuild**, which by Decision 6 (no migration) makes every installed
    corpus stale until re-downloaded. Retrieval side is already built: it is the same recall-plus-flat-
    preference shape D22 introduced, so it reuses `preferred_ids` rather than adding a mechanism.
    Plan: [18-phase4-track3-per-game-compat-tips.md](planning/18-phase4-track3-per-game-compat-tips.md).
  - **Ship-shape lock relaxed:** Phase 4 was locked to ship all three tracks together. Two shipped without
    the third because the blocker is a release action rather than effort, and the two that shipped are the
    visible ones. **Maintainer call owed:** either accept the split or hold tracks 1–2 from the release
    notes until track 3 lands. [knowledge-base.md](knowledge-base.md) § Phase 4.

## RAG Phase 7, Community tip contribution, RAG Phase 8

- ★★★★ **RAG Deck query — retrieval infra (Phase 7)**
  - **Goal:** Optional sqlite-vss/ANN, auto-pull nomic, RRF extensions, vision→KB, demote, packs, intent retrieval.
  - **Status:** FTS+vector shipped in remediation; the locked **meaning-fallback** track (vector list into RRF when FTS is empty/weak) shipped 2026-08-18 as the per-game recall pass — sqlite-vss/ANN is now an optimisation of a path that exists, not a prerequisite. Remainder docs only. [knowledge-base.md](knowledge-base.md) § Phase 7.
- ★★★★★ **Community tip contribution** (corpus inbound path)
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Goal:** Reply → **Suggest as a tip** writes schema-valid card to Desktop + GitHub attach URL.
  - **Depends on:** **RAG Phase 6** public publish — **shipped 2026-08-16, so this is unblocked** ([archive/roadmap-completed.md](archive/roadmap-completed.md)).
  - **Source:** [13-roadmap-feature-ideas.md](archive/13-roadmap-feature-ideas.md) § C2.
- ★★★★★★ **RAG Deck query — catalog corpus (Phase 8)**
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Goal:** Large offline catalog after Phase 6 publish (~top 1000 Steam, ~100 Deck, emulated slice).
  - **Status:** Locked intent only. [knowledge-base.md](knowledge-base.md) § Phase 8.
  - **Depends on:** Phase 6 (shipped 2026-08-16) + likely Phase 7 infra.


## Permissions / safety items, as filed

- ★★★★ **Web permission** (Ask live search + online deps)
  - **Goal:** Opt-in capability for live web answers; offline Ask + local KB when off.
  - **Status:** Discovery locked; docs only. [web-permission-discovery.md](planning/web-permission-discovery.md).
  - **Depends on:** Capability Permission Center; Kids master lock (shipped — forces Web off when that key lands).

- ★★★★★ **VAC Phase 2 opponent IDs** (lobby/session API research)
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Status:** Phase 1 complete; on-device QA in [Verify](#verify).
  - **Goal:** Surface live opponent Steam identities for ban checks when metadata allows.


## Platform / upstream items, as filed

- ★★★★ **Llama.cpp provider spike** (Deck perf / replacement eval)
  - **Goal:** Research-only go/no-go vs Deck-local Ollama. Deliverable: `docs/archive/spikes/llama-cpp-provider-eval.md`. Prior: [llama-cpp-provider.md](archive/spikes/llama-cpp-provider.md).
- ★★★★ **Steam Input layout parse** (VDF → AI context)
  - **Goal:** Parse controller VDF configs for actionable control context.
  - **Not in scope:** editing/writing controller configs.

## The eleven long files, left long on purpose

Long version of the roadmap entry. Filed 2026-09-15 at the end of the clean-up's reshape phase; moved here for
the full file list. Nothing a person using the plugin would notice — this is about what the code costs to work
in, not what it does.

The clean-up decided up front not to split the plugin's main screen file or the other big screen files this
round: each is a day's careful work on code that draws things, and a mistake there is visible. This entry is
the promise that they were left on purpose rather than missed, with today's sizes recorded so nobody has to
measure again.

**Screen side, seven files:**

- The plugin's main file — 1,709 lines
- The model download window — 1,385 lines
- One style sheet — 1,344 lines
- The where-the-AI-runs settings section — 1,310 lines
- The animated chips row — 1,232 lines
- The chat transcript — 1,221 lines
- The Ask bar — 1,079 lines

One more file, the emoticon list, is 1,023 lines but is just a list — splitting it would gain nothing, so it
is not part of this plan.

**Back-end side, four files** the clean-up's plan did not name, and which are worth their own decision before
anyone starts:

- The knowledge base service — 2,092 lines
- The prompt builder — 1,571 lines
- Voice transcription — 1,294 lines
- The AI service — 1,270 lines

**Two worked examples already exist** from this phase: the question chips and the reply rating both came out
of the Ask file as their own pieces, each with a test written at the same time. The record of the order the
hooks ran in is what made both moves safe. Do the rest one file at a time, the same way, each with its own
Deck check. [Plan](archive/51-refactor-round-two.md).

## Controller macro test rig and live view

- ★★★★★ **Controller macro test rig + live view** (real gamepad input; DPS-owned)
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Goal:** Close the last missing capability for unattended on-Deck QA — [01-qa-automation-plan.md](archive/01-qa-automation-plan.md) **F1**, "there is no input injection on the Deck." A bridge board the Deck sees as a real controller (wired USB on the dock by default, Bluetooth for handheld-geometry runs, both from day one), a macro runner whose steps are gated on real UI state (`gpfocus` markers, never `activeElement` — the P1-5 lesson), and one PipeWire pipeline teeing the QA `.mkv` to file **and** a live analyzer stream for a single encoder's APU cost.
  - **Status, 2026-09-24:** built and in daily use; now ★★★★ on the roadmap and the maintainer's priority 1.
    The board, the press, chord and walk tools and the stop switch all exist. What is left: a recording that is
    also a live view (S3), checking the highlight from the video (S4), handheld runs over Bluetooth, and the
    nightly unattended run (P4). P4 needs the saved-walk replay fixed first. The full account is at the top of
    [plan 19](planning/19-controller-macro-test-rig.md). The status as first written follows.
  - **Status as first written:** **Discovery locked 2026-08-23** — decisions L1–L10, architecture, serial protocol, spikes and phasing in [19-controller-macro-test-rig.md](planning/19-controller-macro-test-rig.md). Board ordered 2026-08-24. Next concrete step: spikes S1–S3 (board bring-up, QAM Guide-chord from the bridge pad, tee-pipeline latency + scoped sudoers). **The V1 acceptance flow already ran in practice on 2026-08-28:** the Batch A re-run drove QAM chord → bonsAI panel → six frozen chips (real A-press each on chip and on **ask**) → reply-finished waits → ask-trace readback, unattended, with the existing bridge + CDP tooling — evidence in `runs/` and the KB-SPELLING-01 row. What V1 adds beyond that is the recording tee and the formalized safety interlocks.
  - **This is one track of five.** The program plan — including the two tracks that need no hardware and should land first (CI gate, static focus checks, both above) — is [21-ai-owned-testing-program.md](planning/21-ai-owned-testing-program.md), with effort, milestones and the autonomy boundaries.
  - **Owner split:** primitives (`deck_pad*`, `deck_macroRun`, `deck_stream*`, extension kill switch + always-visible agent-control status) land upstream in decky-plugin-studio per [AGENTS.md](../AGENTS.md); bonsAI keeps only its macro files and CDP assertions (`tests/macros/`). Answers findings-log **P1-5**; retires DPS's "Deck UI cannot be automated in v1" note.
  - **V1 acceptance:** one unattended golden-path smoke — QAM chord → bonsAI tab → question via the existing injector → real A-press on Ask → reply-finished signal → recording, step log and plugin log land on the PC, no human touch after invocation.
  - **Safety (locked):** QAM-open interlock (presses halt if the overlay closes), neutral-on-silence firmware watchdog, extension kill switch; dev tooling only, never shipped inside the plugin.
  - **Depends on / related:** deliberately **not** blocked on **Frozen test chips** (typed-question path first; chip-select macros when chips land). Makes **STREAM-09 / D-PAD-SCROLL-02** and the chunky-streaming row repeatable, but corroborates rather than replaces the poll/paint timestamp instrumentation that row calls for.

## The five-star and six-star platform items, as filed

- ★★★★★ **Steam Controller copilot** (Ibex gen-2)
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Goal:** AI copy tuned to gen-2 hardware + Steam Input–aligned suggestions.
- ★★★★★ **Wake-word listening** (beta; Deck first)
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Goal:** Opt-in always-on local wake **bonsAI** → STT → quiet Ask.
  - **Depends on:** Whisper voice Ask; Reply ready toast; Voice STT session daemon (shipped).
  - **Feasibility:** [10-wake-word-listening-feasibility.md](planning/10-wake-word-listening-feasibility.md).
- ★★★★★★ **Deep mod AI hints** (install paths + compatdata)
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Goal:** Detect mod frameworks/files; mod-aware AI guidance. [12-deep-mod-ai-hints-feasibility.md](planning/12-deep-mod-ai-hints-feasibility.md).
- ★★★★★★ **In-game answer surface** (no-QAM reply; overlay research)
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Goal:** Read answer without leaving game. Full overlay upstream-gated; unblocked slice: toast carries ~2 lines (suppress Strategy/fenced replies).
  - **Source:** [13-roadmap-feature-ideas.md](archive/13-roadmap-feature-ideas.md) § C3.
  - **Split 2026-09-05:** the toast slice is its own ★★ roadmap entry, **The answer's first lines in the reply-ready toast**, planned in
    [38-toast-answer-lines.md](planning/38-toast-answer-lines.md) with the maintainer's calls in **D63**. What stays under this entry is the
    overlay research. First step of the plan is a measurement: the reply-ready toast has never been recorded showing over a running game.
  - **Reframed 2026-09-08:** the same surface is open in a headset, because SteamVR lets a separate program on the PC draw a panel over
    any game. The headset shapes (a notification card, a wrist panel, a note pinned in space, the full floating panel) are planned in
    [49-steam-frame-features.md](planning/49-steam-frame-features.md).
- ★★★ **bonsAI's own icon in the Quick Access Menu** (was ★★★★★★ "Native QAM shortcut tile")
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Goal:** bonsAI on its own icon in the menu, two stops instead of three.
  - **Re-planned 2026-09-23:** the separate free plugin [Quick Tab](https://github.com/moi952/decky-quick-tab) already
    does the pinning. bonsAI's share is a Deck test and a few fixes. [Plan 66](planning/66-quick-tab-own-menu-icon.md).
  - **Old study:** [archive/11-native-qam-tile-feasibility.md](archive/11-native-qam-tile-feasibility.md), kept for its
    section on running bonsAI outside Decky.
- ★★★★★★ **Remote Play diagnostics layer** (streaming host/client)
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Goal:** Streamed gameplay answers weight encode latency and host-vs-client fixes.
  - **Related:** noted (not folded) in [09-steam-frame-companion-feasibility.md](archive/09-steam-frame-companion-feasibility.md) § B8.
- ★★★★★★ **Steam Frame companion UX** (VR / LAN Deck)
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Goal:** Research-first companion workflows for Steam Frame. [09-steam-frame-companion-feasibility.md](archive/09-steam-frame-companion-feasibility.md).
  - **Planned 2026-09-08:** nine entries in [49-steam-frame-features.md](planning/49-steam-frame-features.md), each marked with whether a
    PC running SteamVR can test it before the Frame ships; PC setup steps in [50-steamvr-pc-setup.md](planning/50-steamvr-pc-setup.md).
    Still owed from the study: the four Frame tips rewritten, one README line, and the re-rate to ★★.


## Every question waits about a second while the note search loads

Filed 2026-09-07 as "the note search has got about thirty per cent slower since August"; narrowed 2026-09-12.

**The device readings.** The same three questions, on the Deck: 793 to 900 milliseconds in August, 1078 to 1094
one September evening, 1103 to 1230 the next. The explanation offered at the time — that only the first question
after a quiet spell is slow — does not hold there: three questions asked back to back came back within 16
milliseconds of each other, no faster on the third than the first. A real question measured on 7 September took
1067 milliseconds for the same step.

**What the build machine says the two states cost** (`runs/plan48-embed-eviction-pc.json`, 2026-09-12): searching
the notes costs **1336 milliseconds when the model has to be loaded** and **14 milliseconds when it is already
there**. The Deck's per-question number sits on top of the loading figure, not the resident one. So the Deck
behaves as though the model is loaded from scratch for every question.

**What the build machine could not reproduce, and why that is still useful.** The leading idea was that writing an
answer pushes the search model out of memory. On this PC it does not: after a reply, both models were still
resident and the next search took 24 milliseconds. But this PC has far more memory than a Deck, so the honest
reading is that it never gets low enough to push anything out — which is itself why repeat questions are fast here
and slow there. A negative result here does not clear the Deck.

**What would settle it**, and it is cheap: read what the Deck is holding in memory at three moments — before a
question, after the notes are searched, and after the answer finishes. If the search model is gone after the
answer, the cause is settled. Row **KB-SPEED-02**.

**Two things ruled out.** A fresh process is not the difference (two separate runs of the check both read fast).
And nothing in the plugin throws the search model away: the answering model is asked to stay in memory for five
minutes, and the search model gets Ollama's own five-minute default because the request says nothing
(`ollama_embed_service.py:137`).

**A related risk, not yet a bug.** The search gives up after three seconds and falls back to word matching only,
silently (`knowledge_base_service.py:1620-1624`). A load takes 1.34 seconds on a strong PC. Today's Deck readings
are well under three seconds, but not so far under that a busy moment could not cross it, and a person would get
worse answers with nothing on screen to say why.


## A tap outside the AI models screen started the queued downloads and left the D-pad stuck in the Ollama tab

- ★★ `[ollama]` `[focus]` **A tap outside the AI models screen started the queued downloads and left the
  D-pad stuck in the Ollama tab** — **OPEN, reported 2026-09-16, not reproduced.** The maintainer did not
  press Done; they think they tapped outside the screen, and afterwards the models started downloading and
  the D-pad could not move in the Ollama tab, as if the screen were still open. Two things read in the code,
  neither proven on the device: (a) a tap outside closes the popup through Steam's own path, which never runs
  the plugin's own close (`onClose` in `src/features/plugin-shell/useOllamaModelsHubModal.tsx` runs only from
  the screen's own Done and Cancel), so the tab restore and the return of the ring to the opener in
  `finalizeShowModalAndRestoreActiveTab` (`src/hooks/useBonsaiPluginShell.ts`) are skipped and nothing owns
  the ring afterwards; the "Manage AI models…" button also never registers itself as the return-focus owner
  the way the two try-order buttons beside it do (`rememberModalReturnFocus`), so even a clean close returns
  the ring to whichever opener was remembered last; (b) the last frame of the maintainer's recording shows the
  Pull selected button lit, at the popup's bottom edge, so a tap meant for outside may have landed on it and
  started the queued download. Needs a device reproduction with an empty queue, so nothing downloads.

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*


## A name-withheld boss question on a story-protected game comes back with no spoiler box

- ★★★ `[reply]` **A name-withheld boss question on a story-protected game comes back with no spoiler box** —
  **OPEN, found 2026-09-18.** Nothing running, no consent phrase anywhere in the chat: asked about "the boss
  past the crystal spike area … the one that looks just like me" in Hollow Knight, the reply named Broken
  Vessel and gave its tactics in plain text with no cover; asked about "the boss at the end of the first area"
  in Hades, the reply named Theseus and Asterius the same way. Two games, both builds, the same shape. The
  plan 54 rows still marked owed (STRAT-SPOIL-NAME-01) would fail on this evidence. Evidence
  `docs/test-evidence/plan58p1-M-hk-boss-before.json`, `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-02.json`.
  **Seen again 2026-09-18 with Hades actually running and streaming on:** the same question, asked without
  naming a boss, still came back in plain text with no cover at any point. So the game being detected and
  running does not close the box either — this is not only a nothing-running gap. Evidence
  `docs/test-evidence/plan61-HADES-UNNAMED-STREAM-01-retry2.json`, `docs/test-evidence/plan61-HADES-UNNAMED-01-retry2.json`.
  **Sighting, 2026-09-19, Hollow Knight:** the same kind of question ("what is waiting at the end of the
  game") came back this time WITH its cover in place. Not closing this entry on one clean sighting, but
  worth recording. Evidence `docs/test-evidence/plan61-REPLY-STOPS-MIRROR-01-retry2.json`.

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*


## Headline first: every answer opens with one line that stands alone

- ★★ `[reply]` **Headline first: every answer opens with one line that stands alone** — **OPEN, filed 2026-09-08. Not yet
  (D99, 2026-09-12): it waits for its own go.** The model would be asked to start every answer with one short sentence that
  carries the point and gives nothing away, so the reply-ready popup, a spoken answer and any headset card always have a good
  first line to show. Sits beside Terse mode without replacing it. No headset or PC test needed.
  **The count that decided it ran 2026-09-12:** 2 of 10 answers already opened with a sentence that stands alone, and 0 of 10
  gave anything away. By the rule the maintainer locked (D97 call 4), that poor score means build it — then they read the
  count and said not yet. **When the go comes, the first step is still to count the 2026-09-07 answer-first run the same
  way**, because that run may already be the change. Stars stay at two. [Plan](planning/49-steam-frame-features.md) ·
  [Second look § 2](planning/52-frame-features-second-look.md#2-headline-first-the-weakest-one-and-what-to-do-instead) ·
  [Bench findings § 4](planning/53-steamvr-bench-findings.md#4-the-headline-first-count-run-the-same-morning) ·
  [The count, sentence by sentence](planning/assets/53-headline-count-2026-09-12.md).

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*


## Give the reclaimed height to the transcript

- ★★★ `[layout]` **Give the reclaimed height to the transcript** — **OPEN, measured 2026-09-16 on the Deck's built-in
  screen, no single cause, not built in plan 56.** On the Deck's own 1280 by 800 screen the panel is 454 pixels tall, not
  the 696 every earlier number assumed. There is no gap above the dock at all, because even a two-turn chat overflows the
  panel by 321 pixels and scrolls under the dock: a person sees about 143 pixels of chat, roughly three lines. The fixed
  rows take 311 of the 454 pixels before any chat: Steam's header (64), the tab bar plus its reserve (24), the chat slot
  row (54), a 12-pixel gap, and the dock (157). Getting more chat on this screen means shrinking or hiding one of those
  rows, which is a design call for the maintainer, not a fix. External-monitor record:
  [archive/30-collapsing-tab-bar.md](archive/30-collapsing-tab-bar.md) § 8 ·
  [plan 56 block 0](archive/56-feature-session-four.md#block-0--hygiene-and-three-measurements-the-session-alone-about-forty-minutes).

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*


## The floating panel inside SteamVR

- ★★★★★ `[platform]` **The floating panel inside SteamVR** — **OPEN, filed 2026-09-08; the first step is a ★★ test to find
  out.** bonsAI's panel floating over any VR game, drawn by a small program on the PC that runs SteamVR, so it serves every
  SteamVR headset and the Frame comes along. Not a Decky plugin. The in-game answer surface that is blocked on the Deck is open
  here. **Locked rule (D97):** the panel goes only through SteamVR's own panel door and never touches the game itself — in file,
  in memory or in input — because anything else risks an anti-cheat ban for someone playing online with bonsAI open. Best
  effort: each game's anti-cheat sets its own policy, and the README will say so once the panel ships.
  **Bench result, 2026-09-12: the panel works.** A panel showing a sample bonsAI answer appeared inside the headset view over a
  running SteamVR scene, with no plugin code at all, drawn entirely through SteamVR's own door. The in-headset menu is confirmed
  to be a web page, the same way the Deck's menu is. **Two things still unknown:** pointing at the panel, because the pretend
  headset has no controllers and a real one is needed; and whether the small notification card SteamVR accepted actually drew on
  screen. [Plan](planning/49-steam-frame-features.md) · [PC setup](planning/50-steamvr-pc-setup.md) ·
  [The anti-cheat rule in full](planning/52-frame-features-second-look.md#4-the-floating-panel-and-anti-cheat) ·
  [Bench findings](planning/53-steamvr-bench-findings.md) · [The picture](planning/assets/53-panel-in-headset-2026-09-12.jpg).

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*


## One decision for three items: the SteamVR panel, leaving Decky, and reopening llama.cpp

- ★★★★★★ `[platform]` **One decision for three items: the SteamVR panel, leaving Decky, and reopening llama.cpp** —
  **OPEN, filed 2026-09-08. Not yet (D99, 2026-09-12): nothing is built until the maintainer says.** The floating panel needs
  bonsAI to run outside Decky, which the old menu-icon study (archive, plan 11) kept circling, and any model on the Frame
  itself runs through llama.cpp, not Ollama. Three entries, one question: **does bonsAI grow a second way to run.** Decide it
  once. **The gap underneath it: there is no network door into bonsAI's Python side today**, so a panel on the PC would have a
  screen and no brain.
  **The price is now known, which is what D97 call 2 asked for.** The check ran 2026-09-12: the plugin's Python side started
  outside Decky on the maintainer's Windows PC behind a fifty-line stand-in for Decky, nine calls the frontend normally makes
  all came back with a working answer, and it reached Ollama on that PC. So "run the same Python side on the PC too" is a
  priced decision rather than a guess. What is missing: a small starter program, a way for a panel to reach it on the same
  machine, and PC-shaped answers for which game is running, the speaker, and the screenshot folder. llama.cpp stays closed.
  [Plan](planning/49-steam-frame-features.md) ·
  [Second look § 5](planning/52-frame-features-second-look.md#5-the-second-way-to-run-the-gap-plan-49-underplayed) ·
  [Bench findings § 3](planning/53-steamvr-bench-findings.md#3-the-plugins-python-side-on-this-pc-it-runs).

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*


## Clear cache cleared the screen but not the session

- ★★★ `[chat]` **Clear cache cleared the screen but not the session** — **VERIFY.** Fixed and confirmed 2026-08-27, and again on the
  Deck 2026-09-03. The orphan half is measured: the chat stays behind after a clear, so each clear-and-reask cycle leaves one more
  chat in the rotation — a follow-up, not a regression. Only the mid-generation half is still owed: clearing while a reply is still
  being written (unit-tested, not reproducible by hand yet). Row **CLEAR-CACHE-01**. **Tried on the Deck
  2026-09-18:** the D-pad walk from Ask to Clear cache took about 48 seconds and the reply finished in 43, so
  Clear landed on an already-finished answer, not a mid-answer one. Next try: switch tabs with the shoulder
  button and use a slower Deep-thinking question. Evidence
  `docs/test-evidence/plan61-CLEAR-CACHE-01-midanswer.json`. **Tried again on the Deck 2026-09-18, still
  BLOCKED:** using the shoulder button to switch tabs got to Clear cache in 63 seconds, but the reply (a
  slower, high-thinking question) had already finished at about 50 seconds, so Clear again landed on a
  finished answer, not one still being written. Clear itself worked cleanly: an empty transcript, and a fresh
  question started a clean session. Two tries tonight, both too slow to catch a reply mid-write. What is
  needed next is a reply that takes longer than about 70 seconds — a running game, or the sixty-tip question
  from SOFT-PREDICT-01 — or the maintainer's word to close this half as covered by its unit test instead.
  Evidence `docs/test-evidence/plan61-CLEAR-CACHE-01-midanswer-retry.json`.
  [Why](roadmap-details.md#shipped-qa-owed--why-each-was-built-this-way).

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*


## Soft reply-length cap and thinking budget

- ★★★ `[reply]` **Soft reply-length cap and thinking budget** — **VERIFY.** Shipped 2026-08-10. **01, 02 and 03 all pass:**
  02's empty continue stops quietly (automated); **01 and 03 confirmed on the Deck 2026-09-17** — a long five-part reply
  read with no seam and the `Continuing…` cue never showed live or saved (01); stopping partway kept the partial text
  with a `Stopped — partial answer kept.` notice (03). Evidence `docs/test-evidence/plan57-QA-SOFT-PREDICT-01.json`,
  `docs/test-evidence/plan57-QA-SOFT-PREDICT-03.json`. **SOFT-PREDICT-05 passed on the Deck 2026-09-18:** run on
  gemma4:e2b-it-qat (the Deck's real thinking-capable model; no other thinking model is installed) with Thinking
  Off, a full visible reply came back, no empty reply. Evidence `docs/test-evidence/plan61-SOFT-PREDICT-05.json`.
  Left: **SOFT-PREDICT-04** (a continue mid-menu in Strategy) — **tried 2026-09-18, blocked:** the long Hades
  walkthrough question came back as a short spoiler-careful refusal, so no reply reached the length wall.
  Evidence `docs/test-evidence/plan61-SOFT-PREDICT-04.json`.
  [Why](roadmap-details.md#shipped-qa-owed--why-each-was-built-this-way).

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*


## Named chat slots

**Deck runs of 2026-09-18 to 2026-09-23, moved here from the roadmap 2026-09-25 to keep it under its size
limit (word for word):**

- ★★★★★ `[chat]` **Named chat slots** — **VERIFY.** Redesign v3 landed 2026-08-30; the layout inverts to slot row,
  transcript, presets, Ask bar. Most rows pass on device. **As of 2026-09-18:** 05b passed (returning to a
  still-writing chat shows the question and partial text together); 05a's busy-indicator half, 06a and 06b
  failed (filed as its own bug above). **15d passed on the Deck 2026-09-23:** a fresh chat's title changed
  from "New chat" to the question 35 seconds after Ask, with the panel staying open and no reload — though the
  chat row was scrolled out of view at that exact moment, so nobody would actually have seen it change.
  **06c FAILED on the Deck 2026-09-23:** closing the Quick Access Menu (by the rig's GUIDE+A chord) while the
  answer was still arriving, then watching Steam's own toast window every 200 milliseconds for 150 seconds
  after the reply finished — no "Reply ready" notice ever showed, and reopening the panel showed none either.
  The rig has not yet proven its own toast-reading can see a toast at all, so the next run adds a control
  question before re-testing this row. **06c tried again 2026-09-23 with the control run first: still FAIL,
  cause found and fixed in `73be15f`.** The control confirmed the toast reader works (it caught an unrelated
  notice on its first read). Closing the menu properly took four B presses this time — the plugin's own
  panel was already closed after the second — and the reply finished 20 seconds later with the notice
  window read every 200 ms for 90 seconds; "Reply ready" never showed. Cause: the flag saying "a reply is on
  screen" was only written while the panel was open and was never cleared once it closed, so a reply that
  finished in the background read as already seen. **06c tried a fourth time on the Deck 2026-09-23 (flow
  E), PASS:** with the menu closed by four B presses, "Reply ready — Tap to open" appeared within 1 second
  of the answer finishing. Evidence `docs/test-evidence/plan64-CHAT-SLOTS-V3-06c-try4.json` (+ two
  screenshots). [Detail](archive/roadmap-completed.md#moved-from-the-roadmap-2026-09-02) · [More](roadmap-details.md#named-chat-slots).

- ★★★★★ `[chat]` **Named chat slots** — **VERIFY.** Redesign v3 landed 2026-08-30; the layout inverts to slot row, transcript, presets,
  Ask bar. Most rows pass on device. **05b passed on the Deck 2026-09-18:** returning to the chat still writing
  showed the question and the partial text at once, nothing missing. Evidence
  `docs/test-evidence/plan61-CHAT-SLOTS-V3-05b.json`. **05a's ask-bar-reads-busy half, 06a and 06b failed on the
  Deck 2026-09-18** — see the new "chat that is still writing does not look busy" bug above. Owed: **06c** (not
  attempted 2026-09-18) and **15d** (a recording made 2026-09-18 for the maintainer's own glance).
  [Detail](archive/roadmap-completed.md#moved-from-the-roadmap-2026-09-02).
  **CHAT-SLOTS-V2-01 passed on the Deck 2026-09-17:** Down twice from the tab strip reaches the chat text, and Up retraces
  the same path. Evidence `docs/test-evidence/plan57-QA-CHAT-SLOTS-V2-01.json`.

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*


## Searching the notes by meaning costs about a second, every time, on the Deck

- ★★★ `[KB]` **Searching the notes by meaning costs about a second, every time, on the Deck** — **ACCEPTED
  2026-09-06.** Repeated on the Deck: 1.10, 1.23 and 1.19 seconds across three questions in a row, the same band as
  the first time this was measured. The maintainer looked at the number and said that is fine — about a second before
  an answer that then takes tens of seconds to write out is not something a person would notice. **The one-second
  target this was measured against is retired.** The related finding still stands: a repeat search is fast on a
  PC (0.05 seconds) but not on the Deck, where the third question here was no faster than the first. **The cause
  is now measured** — the two models pushing each other out of memory, see the step above — and removing it reads
  as cheap; the acceptance above stands until the maintainer says otherwise. (D84) Evidence
  `docs/test-evidence/round34-drg-q*.json`, `docs/test-evidence/plan46-R2-strategy-half.json`.

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*


## Four questions still get notes about the wrong subject

- ★★ `[KB]` **Four questions still get notes about the wrong subject** — **OPEN, three of the four now say so,
  found 2026-09-07.** Asking Black Mesa how to tame a horse, asking Portal 2 where to buy a house, and asking about
  a Hades boss that does not exist all still attach a note. The floor added this wave cannot catch these without
  also throwing away twenty or more correct answers elsewhere in the library, so it was left as it is. **Three of
  the four now carry the new "no close match" line** (D88 above), so the answer no longer reads as grounded — but
  the wrong note is still attached and still shapes the reply. *"Where do i buy a house"* gets no line at all,
  because a word in it really does point at a card. Fixing the attachment itself, rather than labelling it, is
  wave-four note-writing work. **Found again 2026-09-18:** a Hades "boss at the end of the first area" question
  attached "Temple of Styx" first and the reply answered about Theseus and Asterius instead of Megaera, steered
  by the top note (`docs/test-evidence/plan58p1-QA-NOTES-BLOCK-02.json`).

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*


## The "no close match" line reads wrong next to a note the reply used

- ★★ `[KB]` **The "no close match" line reads wrong next to a note the reply used** — **OPEN, found 2026-09-18.**
  The line judges only the first attached note's scores, so on a Hollow Knight boss question it said the answer
  leaned on the model's own knowledge while the reply was actually built on the Broken Vessel note, attached
  second; on a Pikmin 2 question it said the same thing under a reply built on the very note the block showed.
  Either look at the best attached note, not just the first, or word the line as "a thin match" rather than a
  claim the notes were not used. Evidence `docs/test-evidence/plan58p1-M-hk-boss-before.json`,
  `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-04.json`. **Sighting, 2026-09-19, Half-Life 2:** a question the
  notes genuinely do not cover got the warning line for the first time, but a note card naming three notes
  showed underneath it at the same time, contradicting the line. Evidence
  `docs/test-evidence/plan61-W2-R5-hl2-retry3.json`.

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*


## Five checks from the August retrieval rework were never run on the Deck

- ★ `[KB]` **Five checks from the August retrieval rework were never run on the Deck** — **VERIFY, or retire.** The corpus
  format gate, the relevance floor, follow-ups searching the user's words, transparency matching what the model got, and
  the Developer kill-switch. Either one evening with pinned test chips, or close them as superseded by the rows that
  passed this week. **Run 2026-09-15: the relevance-floor row is really two checks bundled as one, and they point
  opposite ways.** Its on-topic half is a real regression guard worth keeping. Its off-topic half — an unrelated
  question should attach nothing — fails as written, but that failure is the behaviour the maintainer already accepted
  on 2026-08-27 in the "Unrelated questions still get game cards stapled on" entry above; the row and that entry now
  contradict each other, which is for the maintainer to settle by retiring or rewording one of them. Rows
  **KB-VARIANT-01**, **KB-FLOOR-01**, **KB-FOLLOWUP-01**, **KB-TRANSPARENCY-01**, **KB-KILLSWITCH-01**.
  **Tried again 2026-09-18 with Hades and Half-Life 2 running: KB-FOLLOWUP-01 and KB-TRANSPARENCY-01 stayed
  blocked, and KB-FLOOR-01's already-passed on-topic half could not be freshly confirmed either** — every one
  of them needed a question sent, and the Ask-box freeze above (the three-star focus entry) stopped every
  question from going out. Evidence `docs/test-evidence/plan61-KB-FOLLOWUP-01.json`,
  `docs/test-evidence/plan61-KB-TRANSPARENCY-01-retry.json`, `docs/test-evidence/plan61-KB-FLOOR-01-ontopic.json`.
  **Tried again at 12:50: KB-TRANSPARENCY-01 and KB-FLOOR-01's on-topic half stayed blocked** — Half-Life 2
  had dropped off the Recent Games row so it could not be launched, and the pinned test sentences below would
  have stopped the question anyway. **KB-FOLLOWUP-01 and KB-KILLSWITCH-01's Show details half are now blocked
  by that new pinned-chip problem instead of the earlier freeze:** the Megaera question they both depend on
  could not be sent because the pinned test sentence stopped showing and no test sentence may be typed by
  thumb. Evidence `docs/test-evidence/plan61-KB-TRANSPARENCY-01-retry2.json`,
  `docs/test-evidence/plan61-KB-FLOOR-01-ontopic-retry2.json`, `docs/test-evidence/plan61-KB-FOLLOWUP-01-retry2.json`,
  `docs/test-evidence/plan61-KB-KILLSWITCH-01-retry2.json`. On 2026-09-19 the maintainer played Half-Life 2
  once more, so it is back on the Recent Games row and these rows can run in the next Deck block.
  **Run again 2026-09-19, this one still cannot close:** **KB-FLOOR-01's on-topic half passes** clean, a
  Half-Life 2 question attached the right note as it should. **KB-KILLSWITCH-01's Show details half now
  passes too** — with the meaning-search switch off, the screen correctly says it is using plain keyword
  search and the game still gets an answer with a note attached; the switch was turned back on and
  confirmed. **KB-FOLLOWUP-01 is a partial:** the follow-up search does find the right note again, but the
  written reply asks which boss is meant instead of using the name it found — the search half passes, the
  reply half does not. **KB-TRANSPARENCY-01 is blocked, not by the Deck this time but by the plugin itself:**
  its log never records which notes were searched or attached, so there is nothing written down to check the
  on-screen note list against. That gap needs either the plugin's own activity log switched on before a
  question is asked, or a line added to the log naming which notes were attached — without one of those,
  this check can never be run as written. **KB-VARIANT-01 is still blocked**, since running it would mean
  replacing the very library under test. So this entry stays open: three of the five checks have real
  answers now, one is blocked by a plugin gap rather than a Deck problem, and one still cannot be run at
  all. Evidence `docs/test-evidence/plan61-KB-FLOOR-01-ontopic-retry3.json`,
  `docs/test-evidence/plan61-KB-KILLSWITCH-01-retry3.json`, `docs/test-evidence/plan61-KB-FOLLOWUP-01-retry3.json`,
  `docs/test-evidence/plan61-KB-TRANSPARENCY-01-retry3.json`.

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*


## Hidden spoiler box stays shut on games with no Steam ID and on name-first questions

- ★★ `[KB]` **Hidden spoiler box stays shut on games with no Steam ID and on name-first questions** — **VERIFY,
  landed 2026-09-15, four commits, unit-tested.** A game known only by name now opens its box; naming the boss
  first opens it on screen, in copied text and in read-aloud; a no-story game named in the question gets the same
  relaxed prompt its risk chip already assumed. **STRAT-SPOIL-TEXT-01 passed on the Deck 2026-09-15, both halves.**
  **STRAT-SPOIL-FIRST-01 passed on the Deck 2026-09-18:** naming Wheatley up front in Portal 2 kept the whole
  answer in plain text from the first streamed word, with no hidden box, and it was still plain after closing
  and reopening the chat; the old "Portal 2 not in the library" note is settled — it was installed all along.
  Evidence `docs/test-evidence/plan61-STRAT-SPOIL-FIRST-01.json`. **STRAT-SPOIL-NAME-01 tried 2026-09-18,
  blocked:** Doom 64: Retribution is genuinely installed, but it is not on the Deck's Recent Games row, the
  only list the launch tool can search, so it could not be started; someone needs to play it once by hand
  first. Evidence `docs/test-evidence/plan61-STRAT-SPOIL-NAME-01.json`. From the older **STRAT-SPOIL-DRG-01**
  block: **DRG-01b tried 2026-09-18 with Deep Rock Galactic: Survivor running, blocked** by the same Ask-box
  freeze as the three-star focus entry above (evidence `docs/test-evidence/plan61-DRG-01b.json`); **DRG-01c
  not tried on purpose** (would mean removing the library, out of scope tonight). **HADES-UNNAMED-STREAM-01
  and HADES-UNNAMED-01 (a fourth try) were tried again 2026-09-18 with Hades running and both FAILED**, sent
  cleanly this time with no focus trap at all: the reply came back in plain text with no spoiler box at any
  point, either while streaming or once finished. Both rows now ride on the new three-star bug above (a
  name-withheld boss question comes back with no cover), not on the Ask-box freeze. Evidence
  `docs/test-evidence/plan61-HADES-UNNAMED-STREAM-01-retry2.json`,
  `docs/test-evidence/plan61-HADES-UNNAMED-01-retry2.json`. **Still owed tonight:** STRAT-SPOIL-NAME-01 (Doom
  64 cannot be launched), DRG-01b (stopped by the focus trap), DRG-01c (left out on purpose). On 2026-09-19
  the maintainer said Doom 64 is not readily available, so STRAT-SPOIL-NAME-01 stays blocked until it is.
  [Plan 54](archive/54-spoiler-rules-gaps.md). **DRG-01b tried again 2026-09-19, still blocked:** Deep Rock
  Galactic: Survivor had fallen off the Recent Games row again, so it could not be launched. Evidence
  `docs/test-evidence/plan61-DRG-01b-retry.json`.

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*


## RAG Phase 8: catalog corpus

- ★★★★★★ `[KB]` **RAG Phase 8: catalog corpus** — **OPEN, intent only.** The change that makes most people's games get
  notes instead of the model's memory: about the top 1000 Steam titles, the top 100 on Deck, and an emulated slice. Months:
  it cannot be hand-written (161 cards took six weeks), so it needs an ingestion pipeline from wiki dumps, per-source
  licensing, a size budget, packs and the index. [knowledge-base.md](knowledge-base.md) § Phase 8. The first step is
  planned as [58 phase 1](archive/58-phase-1-notes-shown-and-wiki-extracts.md): a reader that takes a wiki's own
  sentences without rewriting them, ten games from sources already cleared, and a study of which sources cover many
  games under one licence. That [source study](archive/research/kb-catalog-sources-2026-09.md) landed 2026-09-17
  and recommends the Super Mario Wiki first, the per-wiki Fandom check second, and the walkthrough wiki third
  once its saved copy has been tried with the reader. The first ten games from those cleared sources landed
  2026-09-18, written from the wiki pages fetched that day, taking the library to 35 games; landing them
  reopened the July no-new-games lock, since the catalog phase starts here (D111).

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*


## A suggestion chip pulled from the game's notes shows no Tip mark

- ★ `[chips]` `[KB]` **A suggestion chip pulled from the game's notes shows no Tip mark** — **OPEN, found
  2026-09-18 on the Deck with Half-Life 2 running.** The knowledge base was on, and the suggestion chip
  showed real tips straight from the game's own notes — but the small coloured dot that is supposed to mark
  a chip as coming from the notes never appeared, so a person looking at the chip has no way to tell it is
  a real tip and not a guess. The dot is only meant to light up when a chip is marked as coming from the
  notes; these chips did carry real note content but arrived without that mark, or lost it on the way to
  the chip, so the two checks that decide "is this a note chip" and "should the dot show" are not agreeing
  with each other. Row **CHIP-BUTTON-09**. Evidence `docs/test-evidence/plan61-CHIP-BUTTON-09.json` and its
  two screenshots.

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*


## Reaching the Stop generation button by D-pad while a reply is streaming is hard to find

- ★ `[focus]` **Reaching the Stop generation button by D-pad while a reply is streaming is hard to find** —
  **OPEN, found 2026-09-16.** With a reply still being written, Down from the question box stalls (Ask is
  disabled) and Down from the live streaming answer never reaches Stop generation either; the only route found
  is the question box, then Right onto the Ask-mode button, then Right again onto Stop generation. Two long
  replies finished on their own before the ring reached the button by other routes. Not a trap, since Stop can
  still be reached — just not where a person would first look. Evidence
  `docs/test-evidence/plan56-GREYED-STEP-OVER-02.summary.json`. **Confirmed on the Deck 2026-09-17:** Down
  from the question box while a reply is streaming still goes nowhere; Stop generation is reached only by
  Right, then Right again. Evidence `docs/test-evidence/plan57-QA-GREYED-STEP-OVER-02.json`.

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*


## A chat that is still writing does not look busy from another chat

- ★★ `[chat]` **A chat that is still writing does not look busy from another chat** — **OPEN, found
  2026-09-18.** While one chat is still writing and you switch to another chat, nothing tells you the first
  one is busy: its dot in the chat row looks like every idle chat's dot, with no hollow cyan ring and no spark
  beside its ghost title; the other chat's own Ask button reads ready instead of busy; and when the first chat
  finishes, its dot never turns green. Seen on three separate tries. The code already has both dot states and
  the ask flow does mark a chat as generating and later clear it, so the state is not reaching the row on the
  device — worth a closer look, not yet explained. Evidence
  `docs/test-evidence/plan61-CHAT-SLOTS-V3-05a-busyhalf.json`, `docs/test-evidence/plan61-CHAT-SLOTS-V3-06a.json`,
  `docs/test-evidence/plan61-CHAT-SLOTS-V3-06b.json`.

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*


## The open tab strip redrawn: six equal cells, one icon family, only the current tab named

- ★★★ `[tabs]` `[ui]` **The open tab strip redrawn: six equal cells, one icon family, only the current tab named** —
  **VERIFY, landed 2026-09-17.** Six equal cells with one 22px icon each, only the current tab named, in the
  accent colour; the strip is taller (66px) so the chat row's row of dots no longer shows under it. Built in
  commits `6821f20`, `ef4a851`, `18be399`, `0378024`, `044acab`, `a957165`. **Deck run 2026-09-18: rows 01, 02,
  04, 05 and 06 all pass; 03 is captured and waits on the maintainer's own look; 07 failed and is filed as its
  own Bugs entry, above.** The free-play sweep has run once (the after-finished half); the streaming half is
  still owed. [Plan](archive/59-tab-strip-redesign-build.md) ·
  [Design](design/handoffs/tab-bar-open-strip/return-2026-09-16/).

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*


## A follow-up still names the wrong boss one run in three

- ★★★ `[KB]` **A follow-up still names the wrong boss one run in three** — **OPEN, left behind when the follow-up
  fix closed 2026-09-12.** Ask about a boss, then *"what about its second phase"*, and you now get the right boss two
  times in three, where it used to be wrong every time. The remaining third still names the rival boss. DOOM Eternal
  is wrong every time, and no amount of work on the search can close that one. This is the half the shipped fix did
  not cover, kept visible on purpose rather than archived with it. [Numbers](archive/48-kb-wave-three-session.md).
  (D98) **Sighting, 2026-09-19, Hades:** a different shape of the same family — a follow-up question about a
  boss's second phase found the right boss's note again, but the written reply asked which boss was meant
  instead of using her name. Evidence `docs/test-evidence/plan61-KB-FOLLOWUP-01-retry3.json`.

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

## Check that a spoiler cover actually happened

Long version of the roadmap entry. Moved here 2026-09-25 by the plan 70 bookkeeping pass; the roadmap keeps
the short summary and the decision.

Today the plugin tells the model to hide spoilers and then trusts it. Nothing reads the reply back to see
whether it did. That is why the same name-withheld boss question comes back covered some times and bare
others: the follow-up menu's rule is repeated and stressed all through the instructions and that one
holds, while the spoiler rule is said once. A device log from 2026-09-18 rules out the obvious explanation
— the instructions fitted the model's window with room to spare, and the model's own thinking mentions
wrapping the answer, yet the answer came back bare.

Build the same kind of safety net the follow-up menu already has: when a reply names a protected thing in
plain text and the turn's rules required a cover, hold it back or wrap it after the fact. Found while
fixing the menu bug; full reasoning and the five causes ruled out are in that lane's landing commit.

## Attaching a screenshot crashed the model once

Long version of the roadmap entry. Moved here 2026-09-25 by the plan 70 bookkeeping pass; the roadmap keeps
the short summary and the decision.

**First sighting, 2026-09-23.** A 2.6 MB screenshot attached to a question; after 14 seconds the reply said
"Ollama returned an incomplete stream". The Deck's own system log shows the model's process crashed with a
graphics-chip error ("ErrorDeviceLost") and wrote a crash dump. Ollama recovered on its own and later
questions worked. **Crashed again 2026-09-23, 2 of 2 with the same 2.6 MB PNG:** the same graphics-chip
error, the same "incomplete stream" message after about 14 seconds, and Ollama answering again about 10
seconds later. Evidence `docs/test-evidence/plan64-THINKING-05.json`,
`docs/test-evidence/plan64-SCREENSHOT-CRASH-try2.json`.

**Cause found 2026-09-23.** A smaller picture (a 1280×800 JPG, 177 KB) answered normally in 49.7 seconds
with a correct description of the screen; the crashing file is a 1920×1080 PNG at 2.6 MB. bonsAI only
shrinks a picture before sending it when the Pillow image library is present, and Pillow is not installed
on the Deck, so the full-size file goes to the model untouched. Evidence
`docs/test-evidence/plan64-SCREENSHOT-CRASH-small.json` (+ `.png`).

**Three ways to fix it were put to the maintainer:** ship the image library with the plugin, shrink
pictures some other way, or refuse pictures over a size limit with a message. A measured comparison backed
the second option: the unshrunk crash picture was a 2.6 MB file, 3.6 MB once packaged for sending; shrinking
it with `ffmpeg`, already on the Deck, brought it to 86 KB, 114 KB sent, in 0.2 seconds, still fully
readable. The Deck's own picture library was tried too, but it cannot be loaded inside Decky's own, older
Python, so using it would mean shipping a separate program instead. [The measured comparison and size
table](test-evidence/plan64-SCREENSHOT-SHRINK-COMPARISON.md).

**Why this only showed up that night:** the fallback that sends a picture untouched has worked this way,
unchanged, since 2026-04-13; that picture was the first large, barely-compressed one ever attached — a
screenshot taken while the Deck was plugged into an external monitor, about six times bigger than anything
sent before.

**The maintainer's decision, 2026-09-25 (D112):** shrink with `ffmpeg`, and refuse a picture with a message
if the shrink itself ever fails. Planned in plan 70.



## Measure how well the AI reads a screenshot

**Added 2026-09-25 by the maintainer: "an ignored part of the app".** Attaching a screenshot is a headline
feature, and nothing measures it. Every answer and search number in this project comes from typed questions.

**What is true today, read from the code.** A screenshot goes to a picture-capable model with the question.
The prompt asks it to look at the game world rather than the Steam overlay, and to say what it is looking at.
Steam's own screenshot file sometimes adds a game name. The note search never sees the picture: it runs on
the typed words and the running game only. So a screenshot of a boss, with *"how do I beat this?"*, searches
the notes for "how do I beat this" — the right boss note can only be found by luck. The plan to feed the
picture's guess into the search (*vision to entity*) was sketched in knowledge-base.md § Phase 7 and never
built or measured.

**Step 1 — a scored screenshot set (the measurement).**
- 40–60 real screenshots from the Deck, across games that have notes and a few that do not. Each labelled
  by hand with three answers: the game, the area or dungeon, and the boss or enemy if one is on screen.
- Mix of easy and hard: title screens and menus, plain play, a boss fight, a dark cave, a loading screen, a
  game with no notes at all. Some taken with the game running and its name known, some with it unknown
  (as if the picture were attached later).
- A scoring script that asks each question, reads the reply, and marks three things: right game, right area,
  right boss — plus "said it did not know" as its own, better-than-wrong result.
- Run it on every picture model the Deck offers, and record time to first word, because a picture is slow.
- Report three plain figures per model: out of a hundred screenshots, how often it named the game, the
  area, the boss.

**Step 2 — improvements, each measured against step 1.**
- **Feed the picture's guess into the note search.** Ask the model first what game, place and enemy it sees,
  then search the notes with that as well as the typed words. The earlier sketch wanted no extra call;
  measure whether one short extra call is worth its time.
- **Notes that say what things look like.** A boss note today says how to beat it, not what it looks like.
  A one-line "looks like" field on boss, area and enemy notes (colours, shape, a landmark) gives the
  search something to match the picture's description against. Rides a library release.
- **A screen guide note per game.** One note describing the game's on-screen display in words: where
  health, stamina and ammo sit and what they look like, the weapon or item slots, the minimap, and where
  a boss's name and health bar appear. It is the strongest clue to which game a picture is from, it lets
  the reply read the player's state (low health, weapon equipped, boss fight on), and it answers "what
  does this icon mean?", which gets nothing today. Written in words, not stored pictures: the Deck's model
  describes a picture in words and the notes are searched in words, so it fits what exists, with no
  image rights question and no bigger download. Needs a new note kind and rides a library release.
  Screenshots of each game's display go only in the step 1 test set, never shipped, to prove the notes
  help; if they do not, that is the case for the picture matching below.
- **Use the running game's name as a strong hint.** When a game is running the game is already known; the
  picture only has to find the place and the boss, a much easier task. Measure both cases separately.
- **Later, if the above stalls:** match the picture itself against reference pictures per note, with a
  picture-matching model. Bigger, needs pictures in the library and a size budget.

**Connected:** the big-screenshot crash (plan 70 shrinks them first — this set should use the shrunk size),
the Phase 7 entry's "a screenshot feeding the search", and the visual-maps idea.

## Opening "N earlier" floods a long chat with rows

Reported by the maintainer 2026-09-25, from a Deck capture taken at 23:03 that night during plan 68's
Deck pass (the file is in the untracked screenshots folder, DeckCapture_20260925_230318_game.png).

**What a person sees.** A long chat keeps its older turns folded behind one line, "42 earlier". Open it and
every one of those questions comes back as its own row, one after another: in the parrying chat that is 42
near-identical one-line rows ("What are good early weapon upgrades for th…" four times running), filling the
whole chat area and pushing the newest answer far below. Walking past them with the D-pad is one press per
row. There is nothing between "all folded" and "all open".

**Why it matters now.** Plan 68 lets a chat grow without losing its memory, so chats will get longer, and
this list grows with them (a chat keeps up to 200 turns).

**Options to draw before anything is built** (the house rule: a drawn comparison at true size, not a list):

- Open the earlier turns a few at a time — the newest five, with "N more" above them.
- Group them: by game, or by day, each group one line that opens on its own.
- Now that a chat sums itself up, fold everything the summary already covers behind one "Summed up" line
  that shows what the AI remembers, and list only the turns after it. (D118 call 15 turned down a summary
  card at the top of the chat as the way to *tell* a person the chat had summed itself up; this would be a
  way to *find your way around* a long chat, a different job.)
- A short filter line at the top of the opened list, to jump to a question by a word in it.

**Connected:** plan 68 (the chat sums itself up); "Give the reclaimed height to the transcript", since the
chat area is small to begin with on the Deck's own screen.

## Summing up offers a fresher title

Asked for by the maintainer 2026-09-25, while plan 68 was being tested on the Deck.

**What a person would see.** A chat is named after its first question, and a long chat drifts: the Deck's
longest chat is still called "wheatley fight" while it has spent its last forty questions on Half-Life 2
weapons. Every time the person presses *Sum up this chat*, the AI also looks at the chat's current title. If it
judges the title stale, the summary card offers its suggestion — for example *Rename to "Half-Life 2 weapons"?*
— with a choice to rename or keep. If the title still fits, nothing extra shows. The chat is never renamed
without the person saying yes.

**How it would work.** The same summary request carries the current title and asks for one more line at the
end: a suggested title, or "keep". One call, not two — plan 68 measured each summary call on the Deck at 13 to
40 seconds with a game running, and the extra line costs a few words of output, well under a second. The
suggestion is stored with the summary, not applied, so a reopened chat still shows the offer until it is
answered. Renaming goes through the existing rename path, so the chat list and the chat row update as they
do today.

**Before building.** A desk test of the instruction wording on the real chats, the way plan 68 tested its
summary wording: does the AI say "keep" for a title that still fits, and suggest something short and plain
when it does not? And the maintainer's calls on three things: whether an *automatic* summary (the one that
happens on its own before an answer) may also offer a title, or only the button; where the offer sits (on the
summary card, or as its own line under the button); and whether a title the person has renamed by hand is
ever second-guessed.

**Connected:** plan 68 (the chat sums itself up); the chat rename box.

