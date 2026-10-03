# Roadmap details

The long notes for roadmap entries that are still open or on the watch list. The roadmap keeps each entry short
and links to its note here. A note says what was tried, what it cost, what was ruled out and how to reproduce it.

The knowledge base long notes live in [roadmap-kb-details.md](roadmap-kb-details.md). Parked and watched items live in
[roadmap-shelved.md](roadmap-shelved.md). Notes for finished work go, word for word, to
[archive/roadmap-details-closed.md](archive/roadmap-details-closed.md) and, since 2026-10-03, to the trimmed archives
[archive/roadmap-trimmed-2026-10-roadmap-details.md](archive/roadmap-trimmed-2026-10-roadmap-details.md) and its sister files.

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

A smaller, separate fault was found and fixed 2026-09-20 while chasing this one: pressing Ask left Down doing nothing for as long as an answer was arriving (row **ASKBAR-DOWN-TO-STOP-01**). It reproduced every time and is not this bug.

**Sighting 2026-09-26, no evidence file:** ring stuck in the question box after an answer finished,
reported by the Deck helper. **Seen again 2026-09-26 (plan 70 flows 1+2a), twice more:** the ring sat in
the question box on its own after an answer, with nobody pressing anything. **Seen again 2026-09-26 (plan
70, flows L3 + 2d), a related shape:** right after pressing Ask, the ring moved onto the question box on
its own while the answer was still streaming in — an A there would have opened the on-screen keyboard
instead of doing nothing.

**Reproduced again 2026-09-26 (plan 70, flow R), the chip-fills-the-box shape from the 2026-09-15
recipe.** With a fresh Brotato chat, walking a chip's own words into the question box then trying to
reach Ask: the box took the ring and Down (3 presses) and Right (1 press) both did nothing, so Ask could
not be reached. Closing and reopening Quick Access cleared it and emptied the box.
A related shape seen the same session: walking Up from the question box with a game running landed

the ring on "Save chat to Desktop" while it read 0% visible, fully covered by the dock, and Up did
nothing further — also cleared only by closing and reopening the panel. Evidence
`docs/test-evidence/plan70-R-R3-try2.json` (+ two screenshots).

**F2 looked at the code and found no clear cause (2026-09-26); the hidden "Save chat" shape was a
separate fault, fixed in `12ee3dfb`.** F2 listed the Deck readings that would settle the chip route
instead, and they were taken the same night.

**The reading, 2026-09-26 (plan 70, flow L7): not reproduced, 0 of 6.** With nothing running, three
chips that switch the Ask mode and three that do not, each pressed once with A: every time the ring
stayed on the chip and the page's own focus agreed, no on-screen keyboard opened, and afterwards Down
went to the question box and Right to the mode button. No press reached the box itself on A — Steam
delivers every press as a button event, never as a key or direction event. So the chip route alone does
not trap with nothing running. The same symptom did appear that night over Fallout 4 with no chip pressed
at all (its own entry now). Evidence `docs/test-evidence/plan70-CHIP-TRAP-reading.json` (+ screenshots).

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

## The chat summary card appears behind the dock until Down is pressed

Older dated notes moved here from the roadmap entry on 2026-10-01 (docs sweep 14, plan 78), to bring the roadmap under its size limit. Nothing was removed.

  **2026-09-27 (plan 72, `a9fe54bb`):** the card now scrolls into view by itself, but a tall card on a long chat still leaves its last 10 pixels behind the dock, `docs/test-evidence/plan72-F-SUMUP.json`. The maintainer's call is pending.
  **2026-09-27 (plan 72, `c603925d`):** moving the ring onto the card after Sum up FAILED on the Deck,
  `docs/test-evidence/plan72-F6-SUMUP.json`.

Found 2026-09-25 during plan 68's Deck pass, rows SUMUP-02 and SUMUP-03. After the *Sum up this chat* button
finishes, the card that shows what the AI kept sits just behind the dock at the bottom of the screen. Opened straight
from the note under a summarised answer (SUMUP-02), only the top of the card showed above the dock. Either way,
a person does not see the card appear on its own — they have to press Down to bring it into view.
**Still true on the second Deck pass, 2026-09-26:** opened from the note again, the card still sat mostly behind
the dock. Deck check owed once a fix lands.

---

## Some saved answers have a hidden block's markers written twice, cause unknown

Found 2026-09-25 during plan 68's Deck pass. A saved answer had its hidden spoiler block's opening marker
written twice and its closing marker written twice. The screen still drew one closed block correctly, but
the code that strips such a block out before the AI reads the chat stopped at the second opening marker, so
the hidden text went into the chat's memory as plain words — for every later question in that chat since
2026-09-21, and into its summary.

The chat memory now copes with doubled markers (`6843f8e1`) and hides more, not less, whenever it is in
doubt, proved by breaking it on all three doubled shapes (both doubled, opening doubled, closing doubled).
**Why an answer ends up saved with doubled markers in the first place is not known.**

---

Moved here from the roadmap entry on 2026-10-02 (docs sweep, plan 79), to keep the roadmap under its size limit. Nothing was removed.

  **2026-09-30 (plan 77 block 3, row SUMUP-12):** the Deck check of the guards PASSED: a saved answer with its markers doubled loaded as one closed cover, and the hidden word appeared nowhere in the log's memory line, the new answer or the rest of the chat file (no summary existed to check). The original cause is still unproven, so this stays PARTIAL. Evidence `docs/test-evidence/plan77-SUMUP-12.json`.

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

**Since then (2026-10-02):** row 09 passed on the Deck. The dot stayed still while a long label scrolled
(`docs/test-evidence/plan79-CHIP-BUTTON-09.json`). Row 07 passed in all three styles. The roadmap entry has the
current state.

[Plan](archive/60-chip-button-restyle.md) · evidence `docs/test-evidence/plan60-QA-chip-button.json`.

## Shipped, QA owed — why each was built this way

Only one note from this heading is still open. The rest is in [archive/roadmap-trimmed-2026-10-roadmap-details.md](archive/roadmap-trimmed-2026-10-roadmap-details.md).

- ★★★ **KB download Cancel** — shipped 2026-08-05; **KB-CANCEL-01 — not testable as written, and that is the blocker.** **To run this row at all the download has to be slowed** — throttle the link (`tc qdisc`), point the fetch at a stalled host, or add a dev-only delay. Until then the six frontend tests are the only coverage and the D-pad-reach half (the part unit tests cannot judge) is unproven.

## Small and cosmetic, as filed

- ★ **The active chip in Show details is hard to spot** — no focus ring, and the "Chip 1 of 6" counter is easy to miss. Filed by the maintainer.

- ★ **The question overlay is a few pixels out of line** with the native text field underneath it, most visible on a three-line question and on
  the empty-field placeholder.

- ★ **Focus ring gets clipped on grid layouts** — **OPEN, found 2026-08-27.** Tiles sit flush against the edge of their grid, so the
  highlight around a focused tile is cut off instead of drawn in full. Most visible on the AI character picker; check any other
  screen that lays tiles out in a grid. Needs each grid to leave a margin outside its own edge for the ring to fit.
- ★★ **Focus ring styling is inconsistent** between plugin controls and Steam's own — **PARTIAL.** Modal scoping shipped; a blanket rule was
  tried and reverted in favour of Steam's native outline.

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
  - **Goal:** LAN Ask host: add/pull models not in catalog. Blocked until a way is chosen (the four ways are below). **A choice among them is still owed.**
  - **The four ways, as first written down in `67b2b3f7`:**
    - **R1, instructions only.** The Deck shows the person how to pull the model on the PC themselves. Nothing is pulled by bonsAI.
    - **R2, pull from the Deck.** The Deck pulls the model onto the PC even though Ask runs on the PC. Likely the wrong way.
    - **R3, the plugin runs the pull on the PC.** Needs a security review before anyone builds it.
    - **R4, pin and route only.** bonsAI only pins and routes a model that is already on the PC. Nothing is pulled.

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
- **Built so far:** a UI scale section exists (Handheld or Couch size, with an Apply button). It is hidden for 0.6.0 and returns when the Developer tab is on (commit `12227980`).
  Still open: whether two steps are enough for reading at a distance, deciding what must not scale (icons and the 300px column; design-language Rules 1 and 6), and whether to show it again.

## Focus / Deck UI items with short entries, as filed

- ★★★ **Search density UX** (match emphasis + tighter rows)
  - **Goal:** Tighter, more scannable search results with highlighted match tokens.
- ★★★★ **SteamOS Share path** (capture → attach)
  - **Goal:** Faster path from SteamOS Share / capture flows into screenshot attach where APIs allow.
- ★★★★ **SteamOS spin hint card** (immutable spins)
  - **Goal:** Detection + deep link to troubleshooting for immutable spins.

## Permissions / safety items, as filed

- ★★★★ **Web permission** (Ask live search + online deps)
  - **Goal:** Opt-in capability for live web answers; offline Ask + local KB when off.
  - **Status:** Discovery locked; docs only. [web-permission-discovery.md](planning/web-permission-discovery.md).
  - **Depends on:** Capability Permission Center; Kids master lock (shipped — forces Web off when that key lands).

- ★★★★★ **VAC Phase 2 opponent IDs** (lobby/session API research)
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Status:** Phase 1 complete; on-device QA in [Verify](roadmap.md#verify).
  - **Goal:** Surface live opponent Steam identities for ban checks when metadata allows.

## Platform / upstream items, as filed

- ★★★★ **Llama.cpp provider spike** (Deck perf / replacement eval)
  - **Goal:** Research-only go/no-go vs Deck-local Ollama. Deliverable: `docs/archive/spikes/llama-cpp-provider-eval.md`. Prior: [llama-cpp-provider.md](archive/spikes/llama-cpp-provider.md).
- ★★★★ **Steam Input layout parse** (VDF → AI context)
  - **Goal:** Parse controller VDF configs for actionable control context.
  - **Not in scope:** editing/writing controller configs.

## Controller macro test rig and live view

- ★★★★★ **Controller macro test rig + live view** (real gamepad input; DPS-owned)
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Goal:** Close the last missing capability for unattended on-Deck QA — [01-qa-automation-plan.md](archive/01-qa-automation-plan.md) **F1**, "there is no input injection on the Deck." A bridge board the Deck sees as a real controller (wired USB on the dock by default, Bluetooth for handheld-geometry runs, both from day one), a macro runner whose steps are gated on real UI state (`gpfocus` markers, never `activeElement` — the P1-5 lesson), and one PipeWire pipeline teeing the QA `.mkv` to file **and** a live analyzer stream for a single encoder's APU cost.
  - **Status, 2026-09-24:** built and in daily use; now ★★★★ on the roadmap and the maintainer's priority 1.
    The board, the press, chord and walk tools and the stop switch all exist. What is left: a recording that is
    also a live view (S3), checking the highlight from the video (S4), handheld runs over Bluetooth, and the
    nightly unattended run (P4). P4 needs the saved-walk replay fixed first. The full account is at the top of
    [plan 19](planning/19-controller-macro-test-rig.md).
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

**Ruled out 2026-09-21:** the shape that has bitten this repo before — a per-turn fact reaching the
screen only once an answer completes, not during the half-written updates along the way — does not apply
here; the chat's own name rides every update, including the half-written ones, and there is now a test
proving it. Every step from the back end to the dot reads correctly in the code. What would settle it is
a log captured on the Deck while the fault is actually happening.

**Three more clean tries on the Deck 2026-09-26 (plan 70, flow 4.4), dot half did not appear.** Two test
chats (X writing, Y switched-to), each try switching to Y about 19 seconds after X's first words. In all 3
counted tries, X's dot showed busy (a hollow cyan ring) from the moment of the switch until the answer
finished, and turned green within the same second the plugin's own log said it finished — the dot itself
behaved correctly every time. **Ask half, unclear, the maintainer's call:** Y's own Ask button read greyed
(not "ready") the whole time X was writing, even once in a try with words already typed into Y's box —
and turned ready the moment X finished. The row as written expects Y's Ask to read ready while X writes;
what was seen is the opposite. Which reading is actually correct behaviour is for the maintainer to
decide. Evidence `docs/test-evidence/plan70-F4-BUSY-DOT.json` (+ screenshots).

## The open tab strip redrawn: six equal cells, one icon family, only the current tab named

- ★★★ `[tabs]` `[ui]` **The open tab strip redrawn: six equal cells, one icon family, only the current tab named** —
  **VERIFY, landed 2026-09-17.** Six equal cells with one 22px icon each, only the current tab named, in the
  accent colour. **Deck run 2026-09-18: rows 01, 02, 04, 05 and 06 pass; 03 is captured and waits on the
  maintainer's own look.** Row 07 (the dots) is not a lost bug: it was settled by the maintainer's 2026-09-26 call
  (keep the dots, make them line up exactly), fixed in `e3e849bd` and closed 2026-09-27, the Deck's own screen
  included (evidence `docs/test-evidence/plan72-F5-DOTS-rowlit-deckscreen.json`, written up in
  [archive/roadmap-bugs-fixed.md](archive/roadmap-bugs-fixed.md)). No pick is owed.
  [Plan](archive/59-tab-strip-redesign-build.md).

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

**Built 2026-10-02 (plan 79, [D122](audit/maintainer-decisions-locked.md#d122--locked-2026-10-02-raised-2026-10-02--plan-79-the-last-session-before-060-the-ten-calls) call 6).**
The questions that stood here before it was built (a desk test of the wording, whether the automatic summary may also
offer a title, where the offer sits, whether a hand-renamed title is second-guessed) are in
[archive/roadmap-trimmed-2026-10-roadmap-details.md](archive/roadmap-trimmed-2026-10-roadmap-details.md).
Passed on the Deck 2026-10-02: the offer card from the automatic summing-up, both buttons reachable by the D-pad,
and Keep leaves the title. **Still owed:** pressing Rename, and the Sum up button route (it was greyed that day).
Row **P79-FRESHER-TITLE**, evidence `docs/test-evidence/plan79-P79-FRESHER-TITLE.json`.

**Connected:** plan 68 (the chat sums itself up); the chat rename box.

## Saved Deck-walk replay across builds

**Proven on the Deck 2026-09-26 (plan 70 flow 0).** A saved Settings walk (31 steps) replayed against a
newer build; the build fingerprint still read as different, but the replay ran to the end with no
refusal and reported zero differing landings. Evidence `docs/test-evidence/plan70-FLOW0-REPLAY.json`.

**All 30 saved walks re-run and re-saved where they still applied, 2026-09-26 (plan 70, flow L6), closed.**
20 of 30 landed exactly where saved (small id or pixel-shift differences only) and were re-saved fresh on
tonight's build. 7 were not re-saved because the screen itself changed since they were made, on purpose or
by content, and need the maintainer's own call on what the walk should now expect: a Session-tab walk now
stops on "Sum up this chat" (the plan 68 button); a tall-answer walk needs an answer as tall as the one it
was saved on; a reply-buttons walk now spends its presses on a branch menu instead of reaching Show
details and Ask; a chip walk's first step now lands on "Save chat to Desktop" (tonight's own fix); a
session-tab walk expects 7 rows where tonight's chat has 6. The remaining 2 need a chat that has already
been summed up, which nothing on the Deck tonight was. Evidence `docs/test-evidence/plan70-FLOW6-RESAVE.json`.

## Cost to a running game, second sighting

**2026-09-26 (plan 70 flow 0).** Deep Rock Galactic: Survivor, sitting at its own title screen,
fell from 60 to 4 frames a second (250 ms for a frame, read off Steam's own overlay) while an answer was
being written, with both the answering model and the note-search model loaded at once. Memory stayed
above the line: at least 1,821 MB was still free out of 14,804 with the game and both models loaded
together. Measured at the title screen, not during a mission, so a real level may cost more. Evidence
`docs/test-evidence/plan70-FLOW0-MEMORY.json` (+ `-game.png`, `-answer.png`).

**Whether two models loaded causes trouble with a game running: measured 2026-09-26, same evidence.**
1.8 GB was still free with the game at its title screen and both models loaded, so under D112's rule
the memory safety check stays unbuilt — the room did not actually run tight.

**A third sighting, 2026-09-26 (plan 70 flow 2a).** During the SCR-05 check (no game running this
time), Steam's own performance overlay recorded the Deck's screen freezing for as long as 7.6 seconds
at some point between two readings.

## Flow 2b bugs

Only the open sightings from plan 70's flow 2b + 2e D-pad walks (2026-09-26) stay here. The closed ones, with their
fixes and Deck passes, are in [archive/roadmap-trimmed-2026-10-roadmap-details.md](archive/roadmap-trimmed-2026-10-roadmap-details.md).

**In carousel style, Down from "Save chat to Desktop" can land on a chip slid mostly off screen.** Found
on the Deck 2026-09-26 (plan 70, flow 2b.9). The ring landed on a chip showing only about 4% of itself at
the left edge, with the fully visible chip beside it holding no ring; Right moved the ring onto the
visible chip. Evidence `docs/test-evidence/plan70-PRESET-ONE-LINE-03.json` (+ screenshot). **Not fixed
this wave — helper F2's guess:** Steam may be ignoring a chip's own change to "focusable" after it first
appears on screen. Needs one more Deck reading (flow L4.2) before a fix is attempted.

**Re-measured on the Deck 2026-09-26 (plan 70, flow L4.2): not reproduced in 3 tries, kept as a sighting,
not a bug.** The ring was left on "Save chat to Desktop", then the row was made to reappear by switching
to another tab and back — in all three tries the ring, the page's own active element and the highlighted
carousel slot were all the same chip, and that chip sat fully inside the visible strip, whether the
carousel had moved on its own or not. The afternoon sighting may need a different way of making the row
appear (right after an answer finishes, or a first open) rather than a tab switch. Evidence
`docs/test-evidence/plan70-L4-CAROUSEL-READING.json` (+ screenshots).

**Three more one-off focus sightings from free play, 2026-09-26 (plan 70, flow 2b/2e), not yet reproduced
on purpose:** the newest answer's turn folded shut by itself after switching tabs and back; after
pressing Clear, nothing held the ring afterward; after picking a new character Accent, the ring landed on
"Show Developer tab" and the first LB press did not switch tabs. Recorded to check for a pattern next
time, not measured closely enough yet to fix.

## Flow L6 findings

Only the open sighting from plan 70's flow L6 Deck pass (2026-09-26, build `532b76f8`) stays here. The rest is in
[archive/roadmap-trimmed-2026-10-roadmap-details.md](archive/roadmap-trimmed-2026-10-roadmap-details.md).

**With details open, Down from "N earlier" jumps straight to the notes block.** Sighted during free play.
Expanding an older turn and walking Down from its "N earlier" row skips over the newest turn's own Retry,
question, answer and "Hide details" entirely, landing straight on the notes block underneath. Not yet
reproduced on purpose or measured further.
## Overnight run's first real run

**Run 2026-09-26, 20:03-20:04 EDT, 76 seconds, unattended.** `node scripts/deck_overnight_run.mjs` held
the Deck awake, deployed the newest build, replayed all 30 saved walks one at a time, ran this PC's own
`python scripts/verify.py --quick` (passed), and wrote its plain-words report. Nothing needed a human
mid-run — the command itself worked end to end.

**But the walks proved nothing this time.** All 30 came back showing differences. The cause is not the
walks or the build: deploying leaves the plugin's own panel closed, and the command neither reopens it
nor puts each walk back on the specific screen it is meant to start from, so every walk was compared
against the wrong starting point rather than a real regression. Some walks also compared against an
older build on top of that (their own saved build hash differs from tonight's), which the report already
says does not count as a real difference on its own.

**Next step, not yet built:** open the plugin after deploying, and start each saved walk from its own
starting screen — each walk file already says which screen that is — before replaying it. Once that is
in place, a real overnight run can put this row on the schedule. Evidence
`docs/test-evidence/overnight-2026-09-26-200443.md` (+ `.json`).

## Flow L10 findings

Only the open item from plan 70's last three Deck blocks (flows L8, L9 and L10, 2026-09-27) stays here. The rest,
which later closed, is in [archive/roadmap-trimmed-2026-10-roadmap-details.md](archive/roadmap-trimmed-2026-10-roadmap-details.md).

**New, open: walking Down while an answer is still arriving loses the ring (★★).** Header, tab, chat row,
Retry, question, Show reasoning, then the first answer part, partly off screen; three Downs do nothing,
then nothing has focus. The same walk on the finished answer is fine. Not yet known whether the
piece-by-piece drawing is involved; worth checking with it switched off. Evidence
`docs/test-evidence/plan70-FPS-pieces.json`.

## What bonsAI costs a running game

Older dated notes moved here from the roadmap entry on 2026-09-30 (docs sweep 5, plan 78), to bring the roadmap under its size limit. Nothing was removed.

  **A worse sighting 2026-09-26,** plus a screen freeze of up to 7.6 s during a later Deck check that same
  night. **Target set by the maintainer 2026-09-27:** at least 30 frames a second in the panel while an answer
  arrives with a game running. **PARTIAL, measured 2026-09-27:** from about 12 to 36 with the decode effect off
  and 30–33 with it kept (the maintainer's call), dipping into the 20s late in long answers; the game itself
  went from 14–17 to 23–31. Rows **GAME-LIGHT-01**, **STREAM-PIECES-01** partial. Next: a Deck processor
  profile mid-answer. [Detail](roadmap-details.md#flow-l10-findings).

  **2026-09-29 (plan 76, block 3):** with Deep Rock Galactic: Survivor on its title screen, the panel's median while an answer arrived was
  84.5 frames a second (thinking 90, idle 87.5). Evidence `docs/test-evidence/plan76-SCR-10-try2.json`.
  **2026-10-02 (plan 79):** in a live mission, stopped on a level-up menu, the panel held about 69 frames a second while answers
  arrived, and the game 43 to 44 against 45 idle. Not yet tried in a real fight. Evidence `docs/test-evidence/plan79-SCR-10-MISSION.json`.

## A Strategy checklist that arrives while the panel is closed never shows, and after any reopen a refine chip sends its follow-up in Speed mode

Older dated note moved here from the roadmap entry on 2026-10-01 (docs sweep 9, plan 78), to bring the roadmap under its size limit. Nothing was removed.

  **2026-10-01 (plan 78, Deck block 1, build `57586da0`, row P78-REOPEN-CHECKLIST), UNCLEAR:** neither question produced a checklist, because the AI is only asked for a checklist on the follow-up turn after a choice button is pressed, so the row's route could not show the case. The route is corrected in the row (ask, press the first choice button, close Quick Access at once, reopen); the re-run is owed. Evidence `docs/test-evidence/plan78-P78-REOPEN-CHECKLIST-try2.json`.

Moved here from the roadmap entry on 2026-10-02 (docs sweep, plan 79), to keep the roadmap under its size limit. Nothing was removed.

  **2026-10-01 (plan 78, Deck block 2, build `1fe0787a`, row P78-REOPEN-CHECKLIST), partly passed:** on two tries by the corrected route the AI wrote no checklist at all (the saved turns hold none), so the reopen proved nothing; the checklist half could not be produced in four tries over two blocks and rests on its unit tests. The follow-up's mode passed: the "Not really" then "Too long" follow-up went out in Strategy mode (log line "ask_strategy: branch fence requested in prompt=True (mode=strategy, app_id=2321470)"). On the maintainer's list (plan 78 question 9). Evidence `docs/test-evidence/plan78-P78-REOPEN-CHECKLIST-try3.json`. Older note: [roadmap-details.md](roadmap-details.md#a-strategy-checklist-that-arrives-while-the-panel-is-closed-never-shows-and-after-any-reopen-a-refine-chip-sends-its-follow-up-in-speed-mode).

Moved here from the roadmap entry on 2026-10-02 (docs sweep 3, plan 79), to keep the roadmap under its size limit. Nothing was removed.

  The back end's status now says which mode the question was asked in, and a reopened panel reads it from there instead of assuming Speed; with no mode known, the mode and the attachments are left unset, never made up. A second cause is fixed in the same commit: a saved checklist that began loading when the panel opened could finish after the new checklist was drawn and wipe it. Limit: after a reopen a refine chip still does not re-send the original screenshot (nothing saved holds it).

## A faded ghost of the tab bar is left drawn over the chip row after touching the screen

Older dated notes moved here from the roadmap entry on 2026-10-01 (docs sweep 14, plan 78), to bring the roadmap under its size limit. Nothing was removed.

  **2026-09-28 (plan 76, build `39c17312`):** not reproduced with the D-pad. 66 samples over 15 s after Show details → Session and one D-pad press, exactly one tab bar drawn each time. The touch half still needs a person. Evidence `docs/test-evidence/plan76-P76-M-TABBAR-GHOST.json`.

## The chat summary reads oddly in places

Older dated note moved here from the roadmap entry on 2026-10-02 (docs sweep, plan 79), to keep the entry at five lines. Nothing was removed.

  **2026-10-01 (plan 78, Deck block 2, build `1fe0787a`), partly passed:** the Sum up button could not be pressed (greyed out: the one test chat had already summed itself up), so the two cards the chat made by itself that morning were read. No "Games:" line names a non-game. One card still has a line that says nothing ("Stuck on: No specific current sticking point mentioned, ..."), the kind the fix leaves on purpose because something follows the empty phrase. **Still owed:** "a chat opened in a game shows that game first" needs a test chat opened in a game. Evidence `docs/test-evidence/plan78-P78-SUMUP-WORDING.json`.

Moved here from the roadmap entry on 2026-10-02 (docs sweep 3, plan 79), to keep the roadmap under its size limit. Nothing was removed.

  Measured on this PC's copy of the Deck's model, 45 summaries: a non-game on the Game line in 24 before, 0 after; lines that say nothing, 25 lines before, 10 after (the rest carry a clause and are kept on purpose); real lines lost, 0. Unit tests: `tests/test_chat_summary_tidy.py` (23), one in `tests/test_chat_summary_service.py`. Deck row **P78-SUMUP-WORDING**: partly passed, below.

## When the length limit cuts a choice menu, the next part of the answer is lost

  **Two Deck sessions never produced the case (2026-09-30 build `7d84ee3b`, 2026-10-01 build `24cbbd6b`), both UNCLEAR:** at a limit of 300 and 340 tokens the long questions were cut and continued, with no fence text or JSON on screen and the screen and saved chat agreeing, but the model never reached its choice menu before the wall and no "dropped a choice fence" log line appeared. Unit tests are the proof so far. Evidence `docs/test-evidence/plan77-P77-CUT-MENU-TEXT.json`, `docs/test-evidence/plan78-P77-CUT-MENU-TEXT.json`.

Moved here from the roadmap entry on 2026-10-02 (docs sweep 3, plan 79), to keep the roadmap under its size limit. Nothing was removed.

  On a test build with the limit at 300 tokens, the menu block opened right at the wall; the next piece's 1,018 letters never reached the screen or the saved chat, and no menu showed. Rare at the normal limit. Evidence `docs/test-evidence/plan77-SOFT-PREDICT-04.json`.
  A choice menu cut by the length wall that the continuation does not finish is now dropped cleanly; the rest of the answer is kept, shown and saved. Limit: the piece after a dropped fence shows when it ends, not live. The check is the same low-limit run as SOFT-PREDICT-04: the final letters roughly equal the sum of the pieces, the same in the saved chat, no fence text or JSON on screen, and a "dropped a choice fence" log line. Deck check owed: row **P77-CUT-MENU-TEXT**.
  Older note (2026-09-30, UNCLEAR, the same result as below): [roadmap-details.md](roadmap-details.md#when-the-length-limit-cuts-a-choice-menu-the-next-part-of-the-answer-is-lost).

## After the quick start is opened and closed, the help chip stayed and the suggestion chips never took the row

Moved here from the roadmap entry on 2026-10-02 (docs sweep, plan 79), to keep the roadmap under its size limit. Nothing was removed.

  **2026-10-01 (build `f0a4f2c4`), UNCLEAR:** not run. The only reset for the help flag, "Clear all plugin data", is not allowed in a test, so the fix rests on its unit tests and on the maintainer's first-install check (after opening the quick start and closing it, the help chip is gone and the suggestion chips are back). Evidence `docs/test-evidence/plan78-P78-HELP-CHIP-DISMISS.json`.

Moved here from the roadmap entry on 2026-10-02 (docs sweep 3, plan 79), to keep the roadmap under its size limit. Nothing was removed.

  Real, and there for weeks (the capture-then-mark order came in with `e7728fa9` on 3 August; the snapshot's help flag goes back to May); it only became plain once one chip fills the whole row. Cause: opening the quick start first saves a note of the session that still says "help not seen", and when the popup closes Decky builds a fresh panel that trusts that note over the stored flag. Fix: right after the note is taken, the popup marks the note itself as seen (`src/features/plugin-shell/usePluginHelpModal.tsx`, `src/utils/bonsaiSessionSurvival.ts`); "Clear all plugin data" still brings the chip back. Tests: `src/index.helpChip.test.tsx`, 4 tests, 2 fail without the fix.

## A press that never opens its box (parental lock on) can leave a stale "return the ring here" note behind

Moved here from the roadmap entry on 2026-10-02 (docs sweep, plan 79), to keep the roadmap under its size limit. Nothing was removed.

  **2026-09-29 (plan 77 block 2, row P77-OLLAMA-NOBOX-NOTE):** the box half PASSED: the Update, Tier 1 and Tier 2 boxes open on "Not now" and B returns the ring. The parental-lock half **still owed**: it needs Steam Family View with a PIN, so it is on the maintainer's checks page; the no-box half rests on unit tests. Evidence `docs/test-evidence/plan77-BLOCK2-CHATS-BACKEND.json`.

## After the release: two clean-ups behind the scenes

Moved here from the roadmap entry on 2026-10-02 (docs sweep, plan 79), to keep the roadmap under its size limit. Nothing was removed.

  **2026-09-30 (plan 78 helper G):** the read-through was done and its real findings are fixed: findings 1 to 3 (plan 78 helper L) and 4 and 5 (helper M) are under Verify, each with its unit tests; finding 6 is still only possible. Evidence `docs/test-evidence/plan78-G-after-answer-readthrough.md`. The other half, removing the unused live-line trimming code, still waits for after the release.

## The walk check calls a stop hidden when a corner icon merely overlaps its box

Moved here from the roadmap entry on 2026-10-02 (docs sweep, plan 79), to keep the roadmap under its size limit. Nothing was removed.

  **2026-10-01 (plan 78, Deck block 2, build `1fe0787a`):** compared by the text's own line box, the answer's last line overlapped the Copy icon by 7 by 3 px. Evidence `docs/test-evidence/plan78-QA-FREE-PLAY-01-NOGAME.json`.

## With Voice replies on "When I asked by voice", a spoken question's answer may not read itself aloud

Moved here from the roadmap entry on 2026-10-02 (docs sweep 3, plan 79), to keep the roadmap under its size limit. Nothing was removed.

  Limits: a retry of a spoken question counts as typed and is not read (plan 78 questions item 8). The read-through's finding 5 (the setting's copy reset for a moment on every panel open, so an answer finishing in the first moments was not read) is fixed in `27a450ed`, proven by its unit test only, because the moment is too short to hit on purpose on the Deck or by hand. Finding 6 (developer builds only) is still only possible.

## Roadmap clean-up task: trim this file (done 2026-09-15)

**Clean-up task — trim this file. Done 2026-09-15.** The write-up (what it cost to read, the sizes before and after, and what was left on purpose) is in [archive/roadmap-trimmed-2026-10-roadmap-details.md](archive/roadmap-trimmed-2026-10-roadmap-details.md).

## After picking a setting from the search list above the question box, Down cannot get past the answer

Moved here from the roadmap entry on 2026-10-02 (docs sweep 4, plan 79), when it went to Verify. Nothing was removed.

- ★★★ `[focus]` **After picking a setting from the search list above the question box, Down cannot get past the
  answer** — **OPEN, found by the maintainer 2026-10-02; only a Steam restart cleared it.** The answer is also drawn
  behind the question box, and the ring shows as one big box around both. Screenshot
  `screenshots/DeckCapture_20261002_004346_game.png`. Measure on the Deck first; may be kin to the old focus trap.
  **Not reproduced on the Deck in seven tries by three routes (2026-10-02; `docs/test-evidence/plan79-P79-M1-TRAP.json`, `-try2`, `-try3`).**
  **2026-10-02 (plan 79):** two fixes for kin of this fault landed; neither is proven to be the maintainer's own route. Down with Steam's ring on the whole answer no longer does nothing when the panel's page has lost the browser's focus (`affa7fa0`, test `src/utils/answerBubbleNavigation.ringOnBubble.test.ts`), and a closing settings list now hands the ring to the question box (`8c8fffb0`, in Verify). Deck check owed: row **P79-TRAP-DOWN-BUBBLE**, the same route five times. Not run yet.

**Routes tried on the Deck (plan 79, measured 2026-10-02):** a pick from the Quick Access list and from the Steam Settings list; the on-screen keyboard opened and closed (the word itself was put in by the test script, so the typing route is only half done); B on a list row, and a pick then back and B. Down and Up moved normally with one ring each time. One side finding became its own entry (the ring vanishes when the list closes under it).

Original entries moved from Features on 2026-10-02 when their builds went to Verify, kept for their first wording:

- ★★★ `[ollama]` **Fold the "Models & routing" section into the AI models box** — **OPEN, an idea from the
  maintainer 2026-10-02.** Less clutter on the Ollama tab. **Mockups first, at a later time,** drawn true size, so
  the maintainer can choose where each piece goes.
- ★★★ `[layout]` `[focus]` `[chips]` **While reading an answer, the Show details line takes the suggestion
  chip's place above the question box** — **NEW, filed by the maintainer 2026-09-23. Not started.** Today
  the suggestion chip stays pinned above the question box no matter where in a reply the person has
  scrolled. The idea: while scrolling through an answer, that answer's own Show details line shows there
  instead of the chip; once the person scrolls past the answer and its Show details line, the chip comes
  back. The maintainer's own proposed cure for the bug **"Show details' chip ladder hides under the
  question box"**, below. **Needs a plan and animated mockups before anything is built**, since the swap
  between the chip and the line happens as the person scrolls — drawn at the Deck's real size, from the
  real screen, showing the swap in motion.
