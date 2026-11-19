# Roadmap details

The long notes for roadmap entries that are still open or on the watch list. The roadmap keeps each entry short
and links to its note here. A note says what was tried, what it cost, what was ruled out and how to reproduce it.

The knowledge base long notes live in [roadmap-kb-details.md](roadmap-kb-details.md). Parked and watched items live in
[roadmap-shelved.md](roadmap-shelved.md). Notes for finished work go, word for word, to
[archive/roadmap-details-closed.md](archive/roadmap-details-closed.md) and, since 2026-10-03, to the trimmed archives
[archive/roadmap-trimmed-2026-10-roadmap-details.md](archive/roadmap-trimmed-2026-10-roadmap-details.md) and its sister files.

<!-- toc: written by scripts/docs_toc.py; do not hand-edit -->
**Contents**

- [The panel stops half way down and the Ask button is out of reach](#the-panel-stops-half-way-down-and-the-ask-button-is-out-of-reach)
- [Make the preset chips look more like chips](#make-the-preset-chips-look-more-like-chips)
- [Shipped, QA owed — why each was built this way](#shipped-qa-owed--why-each-was-built-this-way)
- [Small and cosmetic, as filed](#small-and-cosmetic-as-filed)
- [Ask / reply items with short entries, as filed](#ask--reply-items-with-short-entries-as-filed)
- [Deck health snapshot, Local reply TTS, On-Deck model benchmark](#deck-health-snapshot-local-reply-tts-on-deck-model-benchmark)
- [First-run ghost New chat label](#first-run-ghost-new-chat-label)
- [Replace the bonsAI tab icon](#replace-the-bonsai-tab-icon)
- [Adjustable text size in Settings](#adjustable-text-size-in-settings)
- [Focus / Deck UI items with short entries, as filed](#focus--deck-ui-items-with-short-entries-as-filed)
- [Permissions / safety items, as filed](#permissions--safety-items-as-filed)
- [Platform / upstream items, as filed](#platform--upstream-items-as-filed)
- [Controller macro test rig and live view](#controller-macro-test-rig-and-live-view)
- [The five-star and six-star platform items, as filed](#the-five-star-and-six-star-platform-items-as-filed)
- [A tap outside the AI models screen started the queued downloads and left the D-pad stuck in the Ollama tab](#a-tap-outside-the-ai-models-screen-started-the-queued-downloads-and-left-the-d-pad-stuck-in-the-ollama-tab)
- [Headline first: every answer opens with one line that stands alone](#headline-first-every-answer-opens-with-one-line-that-stands-alone)
- [Give the reclaimed height to the transcript](#give-the-reclaimed-height-to-the-transcript)
- [The floating panel inside SteamVR](#the-floating-panel-inside-steamvr)
- [One decision for three items: the SteamVR panel, leaving Decky, and reopening llama.cpp](#one-decision-for-three-items-the-steamvr-panel-leaving-decky-and-reopening-llamacpp)
- [Cost to a running game, second sighting](#cost-to-a-running-game-second-sighting)
- [Flow 2b bugs](#flow-2b-bugs)
- [Flow L6 findings](#flow-l6-findings)
- [Overnight run's first real run](#overnight-runs-first-real-run)
- [Flow L10 findings](#flow-l10-findings)
- [What bonsAI costs a running game](#what-bonsai-costs-a-running-game)
- [A faded ghost of the tab bar is left drawn over the chip row after touching the screen](#a-faded-ghost-of-the-tab-bar-is-left-drawn-over-the-chip-row-after-touching-the-screen)
- [The chat summary reads oddly in places](#the-chat-summary-reads-oddly-in-places)
- [A press that never opens its box (parental lock on) can leave a stale "return the ring here" note behind](#a-press-that-never-opens-its-box-parental-lock-on-can-leave-a-stale-return-the-ring-here-note-behind)
- [The walk check calls a stop hidden when a corner icon merely overlaps its box](#the-walk-check-calls-a-stop-hidden-when-a-corner-icon-merely-overlaps-its-box)
- [With Voice replies on "When I asked by voice", a spoken question's answer may not read itself aloud](#with-voice-replies-on-when-i-asked-by-voice-a-spoken-questions-answer-may-not-read-itself-aloud)
- [Roadmap clean-up task: trim this file (done 2026-09-15)](#roadmap-clean-up-task-trim-this-file-done-2026-09-15)
- [Reloading the plugin while a heavy game is running can leave Steam's interface gone until the Deck is restarted](#reloading-the-plugin-while-a-heavy-game-is-running-can-leave-steams-interface-gone-until-the-deck-is-restarted)
- [While reading an answer, the Show details line takes the suggestion chip's place above the question box](#while-reading-an-answer-the-show-details-line-takes-the-suggestion-chips-place-above-the-question-box)
- [The mic stops after about 3 or 4 seconds of speech](#the-mic-stops-after-about-3-or-4-seconds-of-speech)
- [The ring can vanish on the Search tab after closing a game note when a new word arrives](#the-ring-can-vanish-on-the-search-tab-after-closing-a-game-note-when-a-new-word-arrives)
- [Plan 94 notes moved from the roadmap (2026-10-17)](#plan-94-notes-moved-from-the-roadmap-2026-10-17)
- [Plan 96 notes moved from the roadmap (2026-10-18)](#plan-96-notes-moved-from-the-roadmap-2026-10-18)
- [Plan 103 sweep K2 notes moved from the roadmap (2026-11-10)](#plan-103-sweep-k2-notes-moved-from-the-roadmap-2026-11-10)
- [Plan 103 sweep K10 notes moved from the roadmap (2026-11-10)](#plan-103-sweep-k10-notes-moved-from-the-roadmap-2026-11-10)
- [Plan 103 sweep K11 notes moved from the roadmap (2026-11-10)](#plan-103-sweep-k11-notes-moved-from-the-roadmap-2026-11-10)
- [Plan 104 sweep K2 notes moved from the roadmap (2026-11-16)](#plan-104-sweep-k2-notes-moved-from-the-roadmap-2026-11-16)
- [Plan 105 notes moved from the roadmap (2026-11-17)](#plan-105-notes-moved-from-the-roadmap-2026-11-17)
- [Cancel and slow controls sweep notes moved from the roadmap (2026-11-19)](#cancel-and-slow-controls-sweep-notes-moved-from-the-roadmap-2026-11-19)
<!-- /toc -->

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
restart). All under `workshop:test-evidence/`. Also `workshop:test-evidence/round35-trap-*.json` and
[plan 35](../../bonsAI-workshop/archive/35-bugfix-session.md) § 7.

**Reproduced on demand 2026-09-15, which the entry had been waiting for.** It happened twice in one
sitting, both times within seconds of starting a brand new, empty chat while the panel was showing a
Session context row — that is, while the session still carried turns from another chat. Down, Left and
Right all did nothing from the question box and only Up escaped; the character button, the mode chip and
the Ask button were all on screen and none could be reached. Emptying the box first made no difference, so
it is not the text. Restarting the plugin cleared it both times. Three walks in the same sitting where
that row was absent, or the chat already had a reply in it, all reached the Ask button normally. That is
five observations, not proof of a cause, but it is a recipe to try. Evidence
`workshop:test-evidence/plan48-BUG-ask-input-ring-trap-2026-09-15.json`.

**Found again 2026-09-18 with a game running, and the trigger is now known.** Pressing A on the question box
opens Steam's own on-screen keyboard; once B closes it, Down and Right out of the box stop moving the
highlight -- the page's own idea of what is focused moves on to the Ask button or the mode button, but the
ring a person actually sees stays on the box, and only Up still gets out. It happened five times across two
panel reopens and one full close-and-reopen of the whole Quick Access Menu on Half-Life 2, and again in a
brand-new chat with Hades running; by the time Portal 2 was running it had cleared on its own, with no
restart needed. Three tries of the 15 September new-chat recipe the same night came back clean, so opening
the keyboard, not starting a new chat, looks like the real trigger. Evidence
`workshop:test-evidence/plan61-ASKBAR-FOCUS-TRAP-01.json` (the sighting), `workshop:test-evidence/plan61-focustrap-try2.json`
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
close the Quick Access Menu, and reopen it. Evidence `workshop:test-evidence/plan61-ASKBAR-FOCUS-TRAP-02.json`.

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
`workshop:test-evidence/plan70-R-R3-try2.json` (+ two screenshots).

**F2 looked at the code and found no clear cause (2026-09-26); the hidden "Save chat" shape was a
separate fault, fixed in `12ee3dfb`.** F2 listed the Deck readings that would settle the chip route
instead, and they were taken the same night.

**The reading, 2026-09-26 (plan 70, flow L7): not reproduced, 0 of 6.** With nothing running, three
chips that switch the Ask mode and three that do not, each pressed once with A: every time the ring
stayed on the chip and the page's own focus agreed, no on-screen keyboard opened, and afterwards Down
went to the question box and Right to the mode button. No press reached the box itself on A — Steam
delivers every press as a button event, never as a key or direction event. So the chip route alone does
not trap with nothing running. The same symptom did appear that night over Fallout 4 with no chip pressed
at all (its own entry now). Evidence `workshop:test-evidence/plan70-CHIP-TRAP-reading.json` (+ screenshots).

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
(`workshop:test-evidence/plan79-CHIP-BUTTON-09.json`). Row 07 passed in all three styles. The roadmap entry has the
current state.

[Plan](../../bonsAI-workshop/archive/60-chip-button-restyle.md) · evidence `workshop:test-evidence/plan60-QA-chip-button.json`.

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
  - **Status:** Accepted 2026-09-05 (D64) as one feature with the snapshot folded in. Planned in [39-connection-doctor.md](../../bonsAI-workshop/planning/39-connection-doctor.md).
  - **Goal:** **Fix this** on Ask failure walks probes → one next action with Ollama-tab deep link.
  - **Source:** [13-roadmap-feature-ideas.md](../../bonsAI-workshop/archive/13-roadmap-feature-ideas.md) § B3.
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
    retired; this note is what remains of it. [39-connection-doctor.md](../../bonsAI-workshop/planning/39-connection-doctor.md).
- ★★★★★ **Local reply TTS** (Phase 1–2 character voice)
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Goal:** Phase 1 offline TTS play/stop; Phase 2 character-aligned read-aloud (legal gate).
  - **Memo 2026-09-05:** [42-read-aloud-feasibility.md](../../bonsAI-workshop/planning/42-read-aloud-feasibility.md). SteamOS ships a voice since 3.7.13;
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
  - **Source:** [13-roadmap-feature-ideas.md](../../bonsAI-workshop/archive/13-roadmap-feature-ideas.md) § C1.
  - **Descoped 2026-09-06 (D75, open):** the gate in § C1 asked whether timings hold still before ranking on them. Nobody ran
    it; the plan takes the descope now: [43-model-speed-readout.md](../../bonsAI-workshop/planning/43-model-speed-readout.md) shows each model's last
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
    ([icons.tsx:61](../src/shared/icons/icons.tsx#L61)) draws inline so the glyph inherits `currentColor`
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
  - **Goal:** Research-only go/no-go vs Deck-local Ollama. Deliverable: `workshop:archive/spikes/llama-cpp-provider-eval.md`. Prior: [llama-cpp-provider.md](../../bonsAI-workshop/archive/spikes/llama-cpp-provider.md).
- ★★★★ **Steam Input layout parse** (VDF → AI context)
  - **Goal:** Parse controller VDF configs for actionable control context.
  - **Not in scope:** editing/writing controller configs.

## Controller macro test rig and live view

- ★★★★★ **Controller macro test rig + live view** (real gamepad input; DPS-owned)
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Goal:** Close the last missing capability for unattended on-Deck QA — [01-qa-automation-plan.md](../../bonsAI-workshop/archive/01-qa-automation-plan.md) **F1**, "there is no input injection on the Deck." A bridge board the Deck sees as a real controller (wired USB on the dock by default, Bluetooth for handheld-geometry runs, both from day one), a macro runner whose steps are gated on real UI state (`gpfocus` markers, never `activeElement` — the P1-5 lesson), and one PipeWire pipeline teeing the QA `.mkv` to file **and** a live analyzer stream for a single encoder's APU cost.
  - **Status, 2026-09-24:** built and in daily use; now ★★★★ on the roadmap and the maintainer's priority 1.
    The board, the press, chord and walk tools and the stop switch all exist. What is left: a recording that is
    also a live view (S3), checking the highlight from the video (S4), handheld runs over Bluetooth, and the
    nightly unattended run (P4). P4 needs the saved-walk replay fixed first. The full account is at the top of
    [plan 19](planning/19-controller-macro-test-rig.md).
  - **This is one track of five.** The program plan — including the two tracks that need no hardware and should land first (CI gate, static focus checks, both above) — is [21-ai-owned-testing-program.md](../../bonsAI-workshop/planning/21-ai-owned-testing-program.md), with effort, milestones and the autonomy boundaries.
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
  - **Feasibility:** [10-wake-word-listening-feasibility.md](../../bonsAI-workshop/planning/10-wake-word-listening-feasibility.md).
- ★★★★★★ **Deep mod AI hints** (install paths + compatdata)
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Goal:** Detect mod frameworks/files; mod-aware AI guidance. [12-deep-mod-ai-hints-feasibility.md](../../bonsAI-workshop/planning/12-deep-mod-ai-hints-feasibility.md).
- ★★★★★★ **In-game answer surface** (no-QAM reply; overlay research)
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Goal:** Read answer without leaving game. Full overlay upstream-gated; unblocked slice: toast carries ~2 lines (suppress Strategy/fenced replies).
  - **Source:** [13-roadmap-feature-ideas.md](../../bonsAI-workshop/archive/13-roadmap-feature-ideas.md) § C3.
  - **Reframed 2026-09-08:** the same surface is open in a headset, because SteamVR lets a separate program on the PC draw a panel over
    any game. The headset shapes (a notification card, a wrist panel, a note pinned in space, the full floating panel) are planned in
    [49-steam-frame-features.md](../../bonsAI-workshop/planning/49-steam-frame-features.md).
- ★★★ **bonsAI's own icon in the Quick Access Menu** (was ★★★★★★ "Native QAM shortcut tile")
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Goal:** bonsAI on its own icon in the menu, two stops instead of three.
  - **Re-planned 2026-09-23:** the separate free plugin [Quick Tab](https://github.com/moi952/decky-quick-tab) already
    does the pinning. bonsAI's share is a Deck test and a few fixes. [Plan 66](planning/66-quick-tab-own-menu-icon.md).
  - **Old study:** [archive/11-native-qam-tile-feasibility.md](../../bonsAI-workshop/archive/11-native-qam-tile-feasibility.md), kept for its
    section on running bonsAI outside Decky.
- ★★★★★★ **Remote Play diagnostics layer** (streaming host/client)
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Goal:** Streamed gameplay answers weight encode latency and host-vs-client fixes.
  - **Related:** noted (not folded) in [09-steam-frame-companion-feasibility.md](../../bonsAI-workshop/archive/09-steam-frame-companion-feasibility.md) § B8.
- ★★★★★★ **Steam Frame companion UX** (VR / LAN Deck)
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Goal:** Research-first companion workflows for Steam Frame. [09-steam-frame-companion-feasibility.md](../../bonsAI-workshop/archive/09-steam-frame-companion-feasibility.md).
  - **Planned 2026-09-08:** nine entries in [49-steam-frame-features.md](../../bonsAI-workshop/planning/49-steam-frame-features.md), each marked with whether a
    PC running SteamVR can test it before the Frame ships; PC setup steps in [50-steamvr-pc-setup.md](../../bonsAI-workshop/planning/50-steamvr-pc-setup.md).
    Still owed from the study: the four Frame tips rewritten, one README line, and the re-rate to ★★.

## A tap outside the AI models screen started the queued downloads and left the D-pad stuck in the Ollama tab

- ★★ `[ollama]` `[focus]` **A tap outside the AI models screen started the queued downloads and left the
  D-pad stuck in the Ollama tab** — **OPEN, reported 2026-09-16, not reproduced.** The maintainer did not
  press Done; they think they tapped outside the screen, and afterwards the models started downloading and
  the D-pad could not move in the Ollama tab, as if the screen were still open. Two things read in the code,
  neither proven on the device: (a) a tap outside closes the popup through Steam's own path, which never runs
  the plugin's own close (`onClose` in `src/features/models/useOllamaModelsHubModal.tsx` runs only from
  the screen's own Done and Cancel), so the tab restore and the return of the ring to the opener in
  `finalizeShowModalAndRestoreActiveTab` (`src/features/plugin-shell/useBonsaiPluginShell.ts`) are skipped and nothing owns
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
  way**, because that run may already be the change. Stars stay at two. [Plan](../../bonsAI-workshop/planning/49-steam-frame-features.md) ·
  [Second look § 2](../../bonsAI-workshop/planning/52-frame-features-second-look.md#2-headline-first-the-weakest-one-and-what-to-do-instead) ·
  [Bench findings § 4](../../bonsAI-workshop/planning/53-steamvr-bench-findings.md#4-the-headline-first-count-run-the-same-morning) ·
  [The count, sentence by sentence](../../bonsAI-workshop/planning/assets/53-headline-count-2026-09-12.md).

## Give the reclaimed height to the transcript

- ★★★ `[layout]` **Give the reclaimed height to the transcript** — **OPEN, measured 2026-09-16 on the Deck's built-in
  screen, no single cause, not built in plan 56.** On the Deck's own 1280 by 800 screen the panel is 454 pixels tall, not
  the 696 every earlier number assumed. There is no gap above the dock at all, because even a two-turn chat overflows the
  panel by 321 pixels and scrolls under the dock: a person sees about 143 pixels of chat, roughly three lines. The fixed
  rows take 311 of the 454 pixels before any chat: Steam's header (64), the tab bar plus its reserve (24), the chat slot
  row (54), a 12-pixel gap, and the dock (157). Getting more chat on this screen means shrinking or hiding one of those
  rows, which is a design call for the maintainer, not a fix. External-monitor record:
  [archive/30-collapsing-tab-bar.md](../../bonsAI-workshop/archive/30-collapsing-tab-bar.md) § 8 ·
  [plan 56 block 0](../../bonsAI-workshop/archive/56-feature-session-four.md#block-0--hygiene-and-three-measurements-the-session-alone-about-forty-minutes).

**The design call, 2026-10-08 ([D126](audit/maintainer-decisions-locked.md), [plan 84](../../bonsAI-workshop/planning/84-more-room-for-the-answer.md)).**
Re-measured that day: Steam's empty strip 14, Decky's title bar 34, Decky's gap 16, the tab bar 24, the ask area 162, the
answer 204 (the saved-chats row now scrolls away with the chat). The maintainer picked, over seven mockup rounds, the tab
bar in the empty strip, the chat's name in Decky's title bar, the ask area folded into the box, and Read aloud in the
answer's corner: 297 points for the answer. Every option drawn is in [the drawing](planning/assets/84-vertical-room.html).

**Status wording moved here from the roadmap entry on 2026-10-09 (docs sweep after plan 84), to keep the entry at five lines. Nothing was removed.** The entry read, word for word, until then:

- ★★★★ `[layout]` `[tabs]` **Give the reclaimed height to the transcript** — **OPEN, planned 2026-10-08 ([plan 84](../../bonsAI-workshop/planning/84-more-room-for-the-answer.md), calls in [D126](audit/maintainer-decisions-locked.md#d126--locked-2026-10-08-raised-2026-10-08--plan-84-more-room-for-the-answer-the-calls-from-seven-mockup-rounds)). Step 1, three Deck tests, passed the same night ([evidence](../../bonsAI-workshop/test-evidence/plan84-STEP1-DECK-TESTS.json)). Steps 2 and 3 (the ask area folds, Read aloud into the answer's corner) built and passed on the Deck's own screen that night too: the answer has 259 points now ([evidence](../../bonsAI-workshop/test-evidence/plan84-STEPS2-3-DECK.json)). Steps 4, 5 and 7 (the new tab bar, the chat's name with L2/R2 and the chats menu, the version in About) built and passed on the Deck the same night, with one bug sent on to step 6 ([evidence](../../bonsAI-workshop/test-evidence/plan84-STEPS4-5-7-DECK.json)); steps 6, 8 and 9 are not done.**
  On the Deck's own screen the answer gets 204 of the panel's 454 points. Picked over seven mockup rounds: the tab bar moves into the empty strip at the top, the chat's name goes in Decky's title bar, the ASK button and the context line fold into the question box, and Read aloud moves into the answer's corner.
  The answer then gets 297 points, about twice the words of a long answer on screen. [Drawing](https://claude.ai/artifact/EoRoxs11bVjfyBZ28tkM5P) · [Detail](roadmap-details.md#give-the-reclaimed-height-to-the-transcript).

**Where the build stood on 2026-10-09 ([plan 84](../../bonsAI-workshop/planning/84-more-room-for-the-answer.md) § 10).** Steps 2 and 3 (2026-10-08): the ask area measured 107 points (was 162) and the answer 259 ([evidence](../../bonsAI-workshop/test-evidence/plan84-STEPS2-3-DECK.json)). Steps 4, 5 and 7 (2026-10-08/09): the new tab bar, the chat's name with L2 and R2 and the chats menu, the version on the About tab ([evidence](../../bonsAI-workshop/test-evidence/plan84-STEPS4-5-7-DECK.json)). Step 6 (2026-10-09): the tab bar moved into the strip at the top, the other tabs lost their back arrow and name, and the answer measured 295 points ([evidence](../../bonsAI-workshop/test-evidence/plan84-STEP6-DECK.json)). The maintainer's question from the name helper, a Features entry of its own: should New chat warn when there are already eight chats.

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
  screen. [Plan](../../bonsAI-workshop/planning/49-steam-frame-features.md) · [PC setup](../../bonsAI-workshop/planning/50-steamvr-pc-setup.md) ·
  [The anti-cheat rule in full](../../bonsAI-workshop/planning/52-frame-features-second-look.md#4-the-floating-panel-and-anti-cheat) ·
  [Bench findings](../../bonsAI-workshop/planning/53-steamvr-bench-findings.md) · [The picture](../../bonsAI-workshop/planning/assets/53-panel-in-headset-2026-09-12.jpg).

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
  [Plan](../../bonsAI-workshop/planning/49-steam-frame-features.md) ·
  [Second look § 5](../../bonsAI-workshop/planning/52-frame-features-second-look.md#5-the-second-way-to-run-the-gap-plan-49-underplayed) ·
  [Bench findings § 3](../../bonsAI-workshop/planning/53-steamvr-bench-findings.md#3-the-plugins-python-side-on-this-pc-it-runs).

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

## Cost to a running game, second sighting

**2026-09-26 (plan 70 flow 0).** Deep Rock Galactic: Survivor, sitting at its own title screen,
fell from 60 to 4 frames a second (250 ms for a frame, read off Steam's own overlay) while an answer was
being written, with both the answering model and the note-search model loaded at once. Memory stayed
above the line: at least 1,821 MB was still free out of 14,804 with the game and both models loaded
together. Measured at the title screen, not during a mission, so a real level may cost more. Evidence
`workshop:test-evidence/plan70-FLOW0-MEMORY.json` (+ `-game.png`, `-answer.png`).

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
visible chip. Evidence `workshop:test-evidence/plan70-PRESET-ONE-LINE-03.json` (+ screenshot). **Not fixed
this wave — helper F2's guess:** Steam may be ignoring a chip's own change to "focusable" after it first
appears on screen. Needs one more Deck reading (flow L4.2) before a fix is attempted.

**Re-measured on the Deck 2026-09-26 (plan 70, flow L4.2): not reproduced in 3 tries, kept as a sighting,
not a bug.** The ring was left on "Save chat to Desktop", then the row was made to reappear by switching
to another tab and back — in all three tries the ring, the page's own active element and the highlighted
carousel slot were all the same chip, and that chip sat fully inside the visible strip, whether the
carousel had moved on its own or not. The afternoon sighting may need a different way of making the row
appear (right after an answer finishes, or a first open) rather than a tab switch. Evidence
`workshop:test-evidence/plan70-L4-CAROUSEL-READING.json` (+ screenshots).

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
`workshop:test-evidence/overnight-2026-09-26-200443.md` (+ `.json`).

## Flow L10 findings

Only the open item from plan 70's last three Deck blocks (flows L8, L9 and L10, 2026-09-27) stays here. The rest,
which later closed, is in [archive/roadmap-trimmed-2026-10-roadmap-details.md](archive/roadmap-trimmed-2026-10-roadmap-details.md).

**New, open: walking Down while an answer is still arriving loses the ring (★★).** Header, tab, chat row,
Retry, question, Show reasoning, then the first answer part, partly off screen; three Downs do nothing,
then nothing has focus. The same walk on the finished answer is fine. Not yet known whether the
piece-by-piece drawing is involved; worth checking with it switched off. Evidence
`workshop:test-evidence/plan70-FPS-pieces.json`.

## What bonsAI costs a running game

Older dated notes moved here from the roadmap entry on 2026-09-30 (docs sweep 5, plan 78), to bring the roadmap under its size limit. Nothing was removed.

  **A worse sighting 2026-09-26,** plus a screen freeze of up to 7.6 s during a later Deck check that same
  night. **Target set by the maintainer 2026-09-27:** at least 30 frames a second in the panel while an answer
  arrives with a game running. **PARTIAL, measured 2026-09-27:** from about 12 to 36 with the decode effect off
  and 30–33 with it kept (the maintainer's call), dipping into the 20s late in long answers; the game itself
  went from 14–17 to 23–31. Rows **GAME-LIGHT-01**, **STREAM-PIECES-01** partial. Next: a Deck processor
  profile mid-answer. [Detail](roadmap-details.md#flow-l10-findings).

  **2026-09-29 (plan 76, block 3):** with Deep Rock Galactic: Survivor on its title screen, the panel's median while an answer arrived was
  84.5 frames a second (thinking 90, idle 87.5). Evidence `workshop:test-evidence/plan76-SCR-10-try2.json`.
  **2026-10-02 (plan 79):** in a live mission, stopped on a level-up menu, the panel held about 69 frames a second while answers
  arrived, and the game 43 to 44 against 45 idle. Not yet tried in a real fight. Evidence `workshop:test-evidence/plan79-SCR-10-MISSION.json`.

## A faded ghost of the tab bar is left drawn over the chip row after touching the screen

Older dated notes moved here from the roadmap entry on 2026-10-01 (docs sweep 14, plan 78), to bring the roadmap under its size limit. Nothing was removed.

  **2026-09-28 (plan 76, build `39c17312`):** not reproduced with the D-pad. 66 samples over 15 s after Show details → Session and one D-pad press, exactly one tab bar drawn each time. The touch half still needs a person. Evidence `workshop:test-evidence/plan76-P76-M-TABBAR-GHOST.json`.

Moved here from the roadmap entry on 2026-10-18 (plan 96 docs sweep, to keep the entry at five lines). Nothing was removed.

  **2026-10-03 (plan 81):** one pretend touch showed no ghost ([note](archive/roadmap-trimmed-2026-10-roadmap.md#plan-81-note-one-pretend-touch-showed-no-ghost)). **2026-10-09 (plan 84):** the drop-down strip is gone from the code ([note](archive/roadmap-trimmed-2026-10-roadmap.md#plan-84-note-the-drop-down-strip-is-gone)).

## The chat summary reads oddly in places

Older dated note moved here from the roadmap entry on 2026-10-02 (docs sweep, plan 79), to keep the entry at five lines. Nothing was removed.

  **2026-10-01 (plan 78, Deck block 2, build `1fe0787a`), partly passed:** the Sum up button could not be pressed (greyed out: the one test chat had already summed itself up), so the two cards the chat made by itself that morning were read. No "Games:" line names a non-game. One card still has a line that says nothing ("Stuck on: No specific current sticking point mentioned, ..."), the kind the fix leaves on purpose because something follows the empty phrase. **Still owed:** "a chat opened in a game shows that game first" needs a test chat opened in a game. Evidence `workshop:test-evidence/plan78-P78-SUMUP-WORDING.json`.

Moved here from the roadmap entry on 2026-10-02 (docs sweep 3, plan 79), to keep the roadmap under its size limit. Nothing was removed.

  Measured on this PC's copy of the Deck's model, 45 summaries: a non-game on the Game line in 24 before, 0 after; lines that say nothing, 25 lines before, 10 after (the rest carry a clause and are kept on purpose); real lines lost, 0. Unit tests: `tests/test_chat_summary_tidy.py` (23), one in `tests/test_chat_summary_service.py`. Deck row **P78-SUMUP-WORDING**: partly passed, below.

## A press that never opens its box (parental lock on) can leave a stale "return the ring here" note behind

Moved here from the roadmap entry on 2026-10-02 (docs sweep, plan 79), to keep the roadmap under its size limit. Nothing was removed.

  **2026-09-29 (plan 77 block 2, row P77-OLLAMA-NOBOX-NOTE):** the box half PASSED: the Update, Tier 1 and Tier 2 boxes open on "Not now" and B returns the ring. The parental-lock half **still owed**: it needs Steam Family View with a PIN, so it is on the maintainer's checks page; the no-box half rests on unit tests. Evidence `workshop:test-evidence/plan77-BLOCK2-CHATS-BACKEND.json`.

## The walk check calls a stop hidden when a corner icon merely overlaps its box

Moved here from the roadmap entry on 2026-10-02 (docs sweep, plan 79), to keep the roadmap under its size limit. Nothing was removed.

  **2026-10-01 (plan 78, Deck block 2, build `1fe0787a`):** compared by the text's own line box, the answer's last line overlapped the Copy icon by 7 by 3 px. Evidence `workshop:test-evidence/plan78-QA-FREE-PLAY-01-NOGAME.json`.

  **2026-10-03 (plan 81):** fixed in the Deck tools project (commit `cde1c0e`, not pushed): the walk check now judges a control with words by where its words are. It takes effect after the tool server restarts. Entry moved to Verify; row **P81-WALK-READS-WORDS**.

  **2026-10-07 (plan 82, Deck block 2, build `60b8c57f`), passed on the Deck:** the question row and the answer sections read 100% visible; the old false alarm did not appear. Entry moved to Done and the archive. Evidence `workshop:test-evidence/plan82-P81-WALK-READS-WORDS.json`.

## With Voice replies on "When I asked by voice", a spoken question's answer may not read itself aloud

Moved here from the roadmap entry on 2026-10-02 (docs sweep 3, plan 79), to keep the roadmap under its size limit. Nothing was removed.

  Limits: a retry of a spoken question counts as typed and is not read (plan 78 questions item 8). The read-through's finding 5 (the setting's copy reset for a moment on every panel open, so an answer finishing in the first moments was not read) is fixed in `27a450ed`, proven by its unit test only, because the moment is too short to hit on purpose on the Deck or by hand. Finding 6 (developer builds only) is still only possible.

## Roadmap clean-up task: trim this file (done 2026-09-15)

**Clean-up task — trim this file. Done 2026-09-15.** The write-up (what it cost to read, the sizes before and after, and what was left on purpose) is in [archive/roadmap-trimmed-2026-10-roadmap-details.md](archive/roadmap-trimmed-2026-10-roadmap-details.md).

## Reloading the plugin while a heavy game is running can leave Steam's interface gone until the Deck is restarted

Moved here from the roadmap entry on 2026-10-03 (plan 81 paperwork 8), to keep the entry short. Nothing was removed.

In block 3d a reload during a game's start was also followed by the game's window never coming to the front (twice: Deep Rock Galactic: Survivor, Half-Life 2). Related: the entry above about the Home screen in front of a game.

**2026-10-03 (plan 81, Deck block 6, build `7e963807`):** a developer reload with a game running did not freeze Steam in either try, so the 2026-10-01 freeze was not reproduced. With plenty of memory the Decky tab was missing for about 1 min 40 s until Quick Access was closed and reopened; with the AI loaded and 2.4 to 3.4 GB free the plugin was back in about 45 s. The maintainer's call on marking it accepted is open (plan 81, question 3). Evidence `workshop:test-evidence/plan81-P81-RELOAD-LOOK.json`.

## While reading an answer, the Show details line takes the suggestion chip's place above the question box

Moved here from the roadmap entry on 2026-10-03 (plan 81 paperwork 8), to keep the entry short. Nothing was removed.

**Deck 2026-10-02 (build `c98f749e`):** the slot's wording, the chip's return, B closing details with the ring staying, and Up from the slot or a chip pass. **Still owed:** reaching the slot's line from the question box and pressing A on it (needs a right-stick scroll, the maintainer's hand check, checks page, Friday check 4), and the closed line landing 8 px inside the top.

Row **P79-SHOW-DETAILS-SLOT**. Evidence `workshop:test-evidence/plan79-P79-DETAILS-SLOT.json`.

## The mic stops after about 3 or 4 seconds of speech

Older notes moved here from the roadmap entry on 2026-10-11 (plan 89 docs sweep pass 2), when the entry moved to Verify. Nothing was removed. The heading the entry carried before: **OPEN again 2026-10-10 (reopened from Done): with a real voice on tiny.en it still stops after 3 or 4 seconds. First found by the maintainer 2026-10-09 on the Deck.**

The loudness-gate fix (`d73f9f5a`) made a recorded ten-second sentence come through whole on tiny.en, but only through a pretend microphone (row P87-VOICE-QUIET-SENTENCE, passed on the Deck 2026-10-10; evidence `workshop:test-evidence/plan87-P87-VOICE-QUIET-SENTENCE.json`). A real voice still stops early on tiny.en. On base.en the maintainer did not see the early stop.

Cause of the stop that remains: not known. Related: the repeat bug and the entry about making base.en the default speech model (both Done 2026-10-11, plan 88). Earlier record: [archive/roadmap-done-v0.5.0.md](archive/roadmap-done-v0.5.0.md).

**2026-10-10 evening (Deck, build `532761e2`, a recorded voice, no game):** not reproduced on either model: recorded 15- and 21-second questions grew to the end on tiny.en and on base.en (`workshop:test-evidence/v1010-VOICE-TINY-NOGAME.json`, `workshop:test-evidence/v1010-VOICE-BASE-NOGAME.json`). Stays OPEN: it was seen with a real voice only, so a real voice is the check.

**2026-10-11 (plan 88, build `68317980`):** not seen with a recorded voice on the new build: 15- and 21-second questions grew to the end and the live text never went empty (`workshop:test-evidence/p88-VOICE-WHOLE-NOGAME.json`). A guess from reading the code, not tested: the screen writes "what the mic wrote" before the box's text, and if Steam does not batch those two updates, the rule "the box was emptied, so dictation is over" can fire on the first words. Plan 88 does not touch this. Owed: the maintainer's real voice.

## The ring can vanish on the Search tab after closing a game note when a new word arrives

Older open-form text, word for word (moved here 2026-10-14, plan 93 docs sweep, when the entry went to Verify).

- ★ `[tabs]` **The ring can vanish on the Search tab after closing a game note when a new word arrives** — **OPEN, seen once on the Deck 2026-10-12 (plan 92, block 3); a sighting, not yet checked.**
  One press of Up brought the ring back. Lane N3c names a likely cause: a move onto a stop that is drawn in the same moment falls back to a plain focus that Steam's ring does not follow (`src/features/search-tab/SearchTab.tsx` about line 189, and `hop` in `useSearchNav.ts`). Needs a Deck reading first. The Search tab evidence files (`workshop:test-evidence/plan92-P90-SEARCH-TAB-WALK.json`, `-KB.json`) do not hold the sighting.

## Plan 94 notes moved from the roadmap (2026-10-17)

**Tab sections: the D-pad ring goes wrong after sections are opened (older note, word for word):**

  **2026-10-13 (plan 93):** (b) not reproduced: with every section open, the Ollama tab walks 19 stops down and the same 19 up, Terse mode a stop both ways; Settings walks 23 stops each way, clean. (b) waits for the maintainer's exact steps. Evidence `workshop:test-evidence/plan93-P93-M1-FOLDED-RING-OLLAMA.json`, `-SETTINGS.json`.

## Plan 96 notes moved from the roadmap (2026-10-18)

Older dated notes moved here, word for word, to keep the roadmap under its size limit.

**qwen2.5vl should not be the model downloaded first (older note):**

  **Deck 2026-10-14 (plan 93 Deck block D3, build `8ff99a0a`):** the starter-set box and run passed (row P93-B3-STARTER-DECK: gemma and nomic skipped as already there, tiny.en and base.en downloaded, `workshop:test-evidence/plan93-P93-B3-STARTER-DECK-D3.json`), and under "Open source only" neither qwen2.5vl:3b nor qwen2.5:3b is offered while gemma4:e2b-it-qat is (row P93-B3-POLICY, `plan93-P93-B3-POLICY-D3.json`; the screen has no word "Automatic" for the try orders, UNCLEAR). The run re-ran the Ollama installer although Ollama was in ~/.local/bin (`511a61fb`) and the button stayed on the open screen after the run (`08f67393`); **both fixes owe a re-check on the Deck** (row P93-B3-STARTER-DECK). **Stand-in 2026-10-14 (plan 93 block S1, this PC, build `7888115e`, Steam offline), passed on the stand-in (this PC), the plan's machine for a wipe:** row P93-B3-FIRST-RUN: after Clear all plugin data the first-run notice was 36 words with one button, the Local runtime (beta) notice came once at 39 words naming no model and did not return after close and reopen, and the starter-set box (reached from the AI models screen) named gemma4:e2b-it-qat, nomic-embed-text, tiny.en and base.en, about 4.5 GiB, never qwen2.5vl, Cancel first (`workshop:test-evidence/plan93-P93-B3-FIRST-RUN-standin.json`). Row P93-B3-POLICY on the stand-in: neither qwen2.5vl:3b nor qwen2.5:3b listed, gemma4:e2b-it-qat first under Deck essentials (`plan93-P93-B3-POLICY-standin.json`; a stand-in pass, not a Deck pass). **Stays in Verify only for the Deck re-check of the installer and button fixes (`511a61fb`, `08f67393`).**

**While reading an answer, the Show details line takes the suggestion chip's place above the question box (older note):**

  **2026-10-06, the maintainer by hand:** both lines were on screen at once (the slot's copy and the answer's own line under the rating buttons), and the maintainer's rule is that the answer's own line goes away while the slot holds it, with a smooth change on scroll. Filed as its own ★★ bug ("Both Show details lines show at once", now in Verify → Bugs): **2026-10-07 (plan 82, `8bfe1802`) fixed**, the answer's own line now fades out while the slot holds the copy; row **P82-ONE-DETAILS-LINE** passed on the Deck 2026-10-07 (block 3b, build `e34b0d57`; the bug is now in Done). The right-stick hand check (steps 3 and 4) is still owed.

**After pressing Stop on the mic, the next mic press does not work (older note):**

  **2026-10-10 evening (build `532761e2`, a recorded voice, no game):** not reproduced. On base.en, Stop then the mic about 18 s later started a new recording and added words (`workshop:test-evidence/v1010-VOICE-BASE-NOGAME.json`); on tiny.en, about 3 s later, the same (`workshop:test-evidence/v1010-VOICE-TINY-NOGAME.json`).

**Maintainer's ask: sweep every tab for buttons that are lopsided, pressed against an edge or too small for their words (older note):**

  **Look check run on the Deck 2026-10-18 (plan 96 block M, build `a1b00906`, before these fixes):** Settings, Permissions, Search, Developer (sections closed) and Ollama clean; About's Steam-drawn language dropdown reads as a light button (Steam's own control); Main's findings were the transcript's own rows and the chips (now exempt). Evidence `workshop:test-evidence/plan96-QA-LOOK-Main.json`, and the same name ending `-Settings`, `-Permissions`, `-Search`, `-Developer`, `-Ollama` and `-About`.

## Plan 103 sweep K2 notes moved from the roadmap (2026-11-10)

Older entries and sentences moved here word for word by the plan 103 bookkeeper sweep K2, each headed by where it stood.

**Bugs: Show details strip entry, as it stood:**

- ★★ `[focus]` `[chat]` **Show details: on some chats the D-pad cannot reach the "This answer / Session" tab strip, so "Sum up this chat" cannot be pressed** — **OPEN, found 2026-10-22 (plan 99 filming, build `8c23813e`, the Deck's own screen, a game running).**
  On the clip-2 chat (a Strategy chat with a tick list) the strip was reachable, and the Session tab showed "Sum up this chat" greyed with "the whole chat still fits". On the 4-turn and 8-turn chats the driver tried, Down from "Hide details" jumped into the chip ladder, and three tries never reached the strip, which was visible on screen.
  Root cause not known. Whether it depends on the chat's shape is the first thing to measure. Against plan 71's line it is not a trap: 0.6.0 ships with it, and it is a known problem for 0.6.1.
  Evidence `workshop:test-evidence/plan99-FILMING-SIGHTINGS.md` (section 1). These are sightings by the deck-driver while filming, not a verification row.

**Verify: summing-up entry, the old closing sentence:**

The reading row P103-M-SUMUP was not taken (the Deck was stuck).

**Bugs: tab sections entry, the older-note pointer line, as it stood:**

  **Older note (2026-10-13, plan 93):** moved to [roadmap-details.md](roadmap-details.md#plan-94-notes-moved-from-the-roadmap-2026-10-17).

## Plan 103 sweep K10 notes moved from the roadmap (2026-11-10)

Moved word for word when the mic entry passed on the Deck and moved to Done.

- ★ `[voice]` **With the mic off, the log shows "voice: stop pressed, no recording was running" lines (six in one clean-install run)** — **VERIFY, fixed 2026-11-09 (plan 103 lane B1, `f38156b2`). Was OPEN, found 2026-10-23 (plan 99 clean install).**
  The microphone was never started and its permission was off, yet the log carried six of these lines in one run, near the deck-driver's A presses. Harmless noise. Evidence `workshop:test-evidence/plan99-P99-TIER4-LOG.json`. For 0.6.1.
  **Fixed 2026-11-09:** the cause was the screen's clean-up when it goes away, which asked the back end to stop, not the two callers the plan named; it no longer asks when no recording ran. Owes **P103-MIC-LOG-01**: with the mic off, open and close the panel six times and look for none of the lines (six A presses would not exercise it).

## Plan 103 sweep K11 notes moved from the roadmap (2026-11-10)

Moved word for word when the quick-start box passed on the Deck and moved to Done.

- ★ `[docs]` `[first-run]` **The quick-start box ("Using bonsAI") leads with the home-PC story and never mentions the Install Ollama button** — **VERIFY, fixed 2026-11-09 (plan 103 lane B1, `777bf0dc`). Was OPEN, found 2026-10-23 (plan 99 clean install).**
  A new player who opens the box on a fresh Deck reads about entering a PC's LAN address and "every ask will fail" first, and is never pointed at the Install Ollama button on this Deck. Evidence `workshop:test-evidence/plan99-P99-TIER4-NO-DEV.json` (its seen field quotes the box).
  Not a release blocker under plan 71's line; for 0.6.1.
  **Fixed 2026-11-09:** the box now leads with running the AI on the Deck. Owes **P103-QUICKSTART-01**: a screenshot for the maintainer's eye on the checks page.
  **Deck 2026-11-10 (plan 103 block D1, build `3eabdfa27ab3`): P103-QUICKSTART-01 FAILED.** The box is on the Main tab and names this Deck first, but its title and first lines were above the top of the screen (`workshop:test-evidence/plan103-P103-QUICKSTART-01.json`). Cause: it used Steam's own popup, which has no height limit; it had been too tall since October and the new opening paragraph added to it. **Fixed 2026-11-10 (`4f1cff37`):** it now uses the plugin's shared two-button box (fixed height, the text scrolls, Down and Up read it, the ring opens on "Got it"), so it also looks like the other confirm boxes; the look is yours to judge from a picture. Owes **P103-QUICKSTART-02**: Deck check running in block D2's third part (no evidence file yet).


## Plan 104 sweep K2 notes moved from the roadmap (2026-11-16)

Moved word for word by sweep K2 of plan 104. Each block names the entry it stood in; the entry keeps its place, moved to Verify or Done, or is a call on the knowledge-base roadmap.

**Bugs entry: a long chat was not summed up and nothing said why (as it stood)**

- ★ `[chat]` **A long chat was not summed up and nothing said why; the "summed itself up before this answer" row sits under its answer** — **OPEN, found 2026-11-10 (plan 103 Deck block D1, row P103-SUMUP-01, UNCLEAR).**
  The long test chat was not summed up, and neither the screen nor the log gave a reason (the test chat did sum up, with a log line and a row on screen). First word 11.8 s, done 19.8 s. Evidence `workshop:test-evidence/plan103-P103-SUMUP-01.json` and `-try2.json`. **2026-11-14:** the plan 105 chat's lookup found no fault (no summary was due; that path writes nothing); plan 104 lane B2 confirms it and adds a log line saying why.

**Bugs entry: on Main, the second suggestion chip's words are cut (as it stood)**

- ★ `[ui]` **On Main, the second suggestion chip's words are cut and reach the screen's right edge** — **OPEN, found 2026-11-10 (plan 103 Deck block D1, row QA-LOOK-01-p103, UNCLEAR).**
  The look check found About clean; on Main the chip's words are cut. Evidence `workshop:test-evidence/plan103-QA-LOOK-01-p103.json`. **2026-11-14:** probably a long label caught mid-scroll, not a cut label; block D0 confirms, plan 104 lane T3 fixes the look check, and the chip's new look is plan 105's (your call there: keep the sliding, fade the cut ends).

**Bugs entry: the Ollama tab's Update button starts an update with no confirm box (as K1 wrote it; now a call, see the knowledge-base roadmap)**

- ★★ `[ollama]` **The Ollama tab's Update button starts a real Ollama update at once, with no confirm box** — **OPEN, found 2026-11-15 (plan 104 Deck block D0a, row P104-KB-THREADS-01).**
  A driver pressed A on it expecting a box (the row said one opens). The Deck's Ollama went from 0.40.9 to 0.40.16 at once, and Cancel 50 seconds later did not undo it. The first answer after it timed out at 180 s and the second took 100 s (usually about 20). Evidence `workshop:test-evidence/plan104-P104-KB-THREADS-01-try2.json`.

**Bugs entry: the Settings screen still read the old Ollama version (as it stood)**

- ★ `[ollama]` `[ui]` **The Settings screen still read "Ollama v0.40.9" after the Ollama update had made it 0.40.16** — **OPEN, found 2026-11-15 (plan 104 Deck block D0a).**
  It still read 0.40.9 when the driver last looked; whether it ever refreshes by itself was not checked. Evidence `workshop:test-evidence/plan104-P104-KB-THREADS-01-try2.json`.

**Bugs entry: first start, Install Ollama asked to turn on Internet downloads (as it stood)**

- ★★ `[ollama]` `[perms]` **First start: Install Ollama failed and asked to turn on Internet downloads, though every permission was already on** — **OPEN, reported 2026-11-11 by the maintainer.**
  On the first-start run the maintainer switched on all permissions, pressed Install Ollama, and it failed with a message to turn on Internet downloads. Check the whole first-start run: whether the popup reads the permission it just set, or an old copy of it. May be the same crash as the ★★★ entry on the install timing out (fixed 2026-11-11 and passed on the Deck 2026-11-15; it now sits in [Done after v0.6.0](#done-after-v060)): a permission saved after that crash never reached the back end. Plan 104 lane B1.

**Bugs entry: a question asked while a heavy game runs can freeze the Deck (as it stood)**

- ★★★ `[ask]` `[ollama]` **A question asked while a heavy game runs can use all the Deck's memory and freeze it** — **OPEN, found 2026-11-09 about 20:15 EST (plan 103 block D0a).**
  A picture question with God of War running: the lowest reading in the evidence was 970 MB of memory available (about 900 MB at the end), SSH stopped answering, and the maintainer restarted the Deck by hand. Both picture tries that night timed out, at 181.1 and 181.2 s (`workshop:test-evidence/plan103-P102-PICTURE-01-try2.json`). The plugin should check free memory before loading the AI and say so instead of loading. Evidence `workshop:planning/assets/103-handover-D0a.md`. **Readings 2026-11-15 (block D0a, nothing asked over a game):** available memory 11,962 MB idle, 5,649 with the AI loaded, 8,682 with Deep Rock Galactic: Survivor, 4,885 with God of War and 2,172 MB of swap in use (`workshop:test-evidence/plan104-P104-M-MEMORY-try2.json`).
  **Plan 104 lane G1; your call of 2026-11-14 (D141 call 9): warn, then let me ask anyway.** bonsAI loads nothing, shows a warning and offers a way to send the question regardless; the limit comes from block D0's readings. (Your 2026-11-10 wish to talk about it in a separate chat is answered.)

**Verify entry: a long chat's summing-up gave up after 68 seconds (as it stood)**

- ★ `[chat]` **A long chat's summing-up gave up after 68 seconds ("Couldn't sum up the chat this time")** — **VERIFY, hardened 2026-11-09 (plan 103 lane B2, `4de0db3e`, `c72e3db2`, `a7256a2b`); cause not proven. Was OPEN, found 2026-10-25 by the Deck driver (plan 98 block KS).**
  In the test chat (over 40 questions), a Strategy question about Hollow Knight showed "Couldn't sum up the chat this time, so this answer only knows the newest turns" before the answer; the summing-up ran about 68 seconds first. Cause unknown; a model still loading is one guess, unchecked. The answer itself was fine. Evidence `workshop:test-evidence/plan98-P98-GLOSSARY-FIRST-01.json` (side_effect) and its `-answer.png`.
  **Hardened 2026-11-09:** a summary the AI wrapped in a plain code fence is kept, not thrown away; the log now says why a summary call did not finish ("chat_summary: failed in X s (reason: ...)", "ask_ollama: chat summary failed"), and the line a player reads says why too. The Deck keeps no log from that night, so the cause is not proven. Owes **P103-SUMUP-01**: if it fails again the line says why; one question in the long test chat sums up or says why. **Deck 2026-11-09 (plan 103 block D0b, old build, row P103-M-SUMUP):** in the long test chat the "Couldn't sum up the chat this time" line did not show, and the old build wrote no summary lines to the log (the saved summary dated from 2026-11-04). The live time to the first word was **not measured**: the log's own guess was about 8 s and the whole turn took 28.4 s (`workshop:test-evidence/plan103-P103-M-SUMUP.json`). The row partly could not run.
  **Deck 2026-11-10 (plan 103 block D1, build `3eabdfa27ab3`, row P103-SUMUP-01): UNCLEAR, not a pass.** The long chat was not summed up and nothing said why; the test chat did sum up. See the new Bugs entry (`workshop:test-evidence/plan103-P103-SUMUP-01.json`, `-try2.json`). The row stays owed.

**Verify entry: first start, Install Ollama asked to turn on Internet downloads (as K2 wrote it, before block D1c)**

- ★★ `[ollama]` `[perms]` **First start: Install Ollama failed and asked to turn on Internet downloads, though every permission was already on** — **VERIFY, fixed 2026-11-15 (plan 104 lane B1, `081785a01` to `59fe02415`); unit-tested; owes row P104-FIRST-RUN-01, not yet recorded on the Deck. Was OPEN, reported 2026-11-11 by the maintainer.**
  The first-start box no longer says "turn on Internet downloads" while the switch reads on. A settings save that fails is reported and sent again, and Install Ollama retries once after a "downloads off" refusal. Owes the row on a staged first start (settings file and Ollama program moved aside, everything put back after). The original report: [Detail](roadmap-details.md#plan-104-sweep-k2-notes-moved-from-the-roadmap-2026-11-16).

## Plan 105 notes moved from the roadmap (2026-11-17)

Moved word for word by sweep K0 of plan 105 to make room in the roadmap. Each block names the entry it stood in; the entry keeps its place and a link here.

**Bugs entry: two documents disagree about a Decky button (the two 2026-10-22 notes, as they stood)**

  **2026-10-22 (plan 97 block A and L17, the monitor, build `73738058`):** Left from the Ask strip's Clear button landed on Voice input 3 of 3 times (`workshop:test-evidence/plan97-A-DECKY-BUTTON.json`). That is both where the button's own handler sends the ring and the control just left of Clear on screen, so the read cannot tell the two apart. The library's source cannot decide it either (the button is Steam's own, found at run time). Stays open.
  **2026-10-22 (plan 97 block E, build `15565346`):** the decisive read was taken and is undecided again. While an answer streams, Left from Clear landed on Stop generation; idle, on Voice input; both are the 20 px box directly to its left, so the handler's target and Steam's own neighbour are the same control (`workshop:test-evidence/plan97-P97-E-DECKY-BUTTON.json`). Row **P97-E-DECKY-BUTTON** measured, not decided.

**Bugs entry: tab sections (the 2026-10-17 and 2026-11-09 notes, as they stood)**

  **2026-10-17 (plan 94 block 6) and 2026-10-22 (plan 97 L14, `6da3e2d7`):** the Settings case (Down from an open section line stopped moving after a Steam pop-up) is covered by the freeze fix, now Done; row **P97-L14-SECTIONS** passed on the Deck 2026-10-22: Down from an open section line moved the ring 3 of 3 with the page without focus, on the Ollama, Settings (Data) and Developer tabs (`workshop:test-evidence/plan97-P97-L14-SECTIONS-try3.json`, control `-try2.json`). That row never owed parts (b) and (c), so they stay open and untouched. The 2026-10-17 note, word for word: [roadmap-details.md](archive/roadmap-details-closed.md#plan-97-third-sweep-notes-moved-from-the-roadmap-2026-10-22). The 2026-10-13 note (plan 93): [roadmap-details.md](roadmap-details.md#plan-94-notes-moved-from-the-roadmap-2026-10-17).
  **Deck 2026-11-09 (plan 103 block D0b, old build, row P103-M-TAB-SECTIONS):** a 20-press walk with three sections open: every stop was visible, no setting changed, and the last four Down presses did not move because the ring was already on the last button. Whether Terse mode takes the ring is **UNCLEAR, not a pass**: the control is not on the Settings tab, so the walk could not reach it (the runbook named a control that is not drawn there) (`workshop:test-evidence/plan103-P103-M-TAB-SECTIONS.json`). Parts (b) and (c) stay open.

**Features entry: AI models screen (the 2026-10-13 and 2026-10-14 notes, as they stood)**

  **2026-10-13 (plan 93):** the maintainer wants the "Deck essentials only" filter rethought as part of this. Side reading from the Deck: with "Deck essentials only" ticked, the licence pick changes nothing (4 rows either way). Evidence `workshop:test-evidence/plan93-P93-M13-GEMMA-FILTER.json`.
  **2026-10-14 (plan 93):** the maintainer thinks the Gemma model was hidden by another filter, maybe "Deck essentials only", when the Bugs entry about it was closed as not reproduced (the model is offered under "Open source only" in the catalog and in the AI models screen). Evidence `workshop:test-evidence/plan93-M13b-GEMMA-PICKER.json`.

**Features entry: What bonsAI costs a running game (the 2026-10-02 and 2026-10-10 note, as it stood)**

  With Deep Rock Galactic: Survivor on a menu mid-mission (2026-10-02) the game held 43 to 44 frames a second against 45 idle. Not yet tried in a real fight. Evidence `workshop:test-evidence/plan79-SCR-10-MISSION.json`. **2026-10-10 (plan 87 Deck block 5b, build `8608954d`): UNCLEAR.** 59.4 frames a second over 60 s with an answer streaming from this PC's AI for 11 of the 60 s, but the game was most likely paused on its Level Up screen, so it was not a live fight. A live-fight number stays owed. Evidence `workshop:test-evidence/plan87-P87-FIGHT-FRAME-RATE.json`.

**Verify entry: a note offer after a screen-only reload (the 2026-10-22 note, as it stood)**

  **Deck 2026-10-22 (plan 97 block C, build `73738058`): COULD NOT RUN the screen-only reload.** Reloading only the Quick Access page left it blank and only a plugin reload brought the panel back. After a plugin reload (which restarts the back end too) the card did not come back and the handled mark stayed in the browser's storage: that fits the fix but is not the screen-only case. Stays here as **proven by its tests only**, and goes on the maintainer's list. Evidence `workshop:test-evidence/plan97-P93-B6-NOTE-OFFER.json`.

**Verify entry: the sweep for lopsided buttons (the 2026-10-18 notes of plan 96 blocks D and E, as they stood)**

  **Deck 2026-10-18 (plan 96 blocks D and E):** on build `a29f9eb0` the look check found nothing on Settings, Permissions, Search, Developer, Ollama and About, and one thing on Main, the Ask pill (56 in 51) (`workshop:test-evidence/plan96-QA-LOOK2-Settings.json`, and the same name ending `-Permissions`, `-Search`, `-Developer`, `-Ollama`, `-About`, `-Main`). After the check learned that words must really spill (`331d4b56`), block E's Main run (build `f7413dbc`) had no Ask finding; one was left, the new "Open the Ollama tab" button reading light, fixed in `bba825e5` (`workshop:test-evidence/plan96-QA-LOOK3-main.json`). Row P96-F25-ASK-PILL passed.

**Verify entry: the faded ghost of the tab bar (the 2026-10-22 note, as it stood)**

  **Deck 2026-10-22 (plan 97 block E10, build `15565346`, Deep Rock Galactic: Survivor running): row P97-L15-GHOST passed on the pop-up route.** Three "Delete chat?" rounds, Steam's row hidden at every read (0.65 s to 10.2 s after B), no second strip in any screenshot, LB and RB still switched tabs, and no `tabBar.steamRowShown` line in the plugin log or the journal (`workshop:test-evidence/plan97-P97-L15-GHOST.json`). The earlier runs that also never showed it: [roadmap-details.md](archive/roadmap-details-closed.md#plan-97-fourth-sweep-notes-moved-from-the-roadmap-2026-10-22).

**Verify entry: the streamed answer's frame rate (the 2026-10-22 note, as it stood)**

  **2026-10-22 (plan 97 block B, build `73738058`, Deep Rock Galactic: Survivor):** the real fight COULD NOT RUN. One A at the game's title screen opened its save-slot screen (three saved games, each with a delete button), and the runbook stops there; no frame rate was sampled. Row SCR-10 stays owed for a real fight. Evidence `workshop:test-evidence/plan97-SCR-10.json`. The 2026-10-11 note, word for word: [roadmap-details.md](archive/roadmap-details-closed.md#plan-97-third-sweep-notes-moved-from-the-roadmap-2026-10-22).

**Sweep 2 (2026-11-17): entries as they stood before the Deck's block D1 results and the landings were written in (each now has a new Verify, Bugs or Features entry)**

*Features entry: a long answer is cut into sections while it writes (the 2026-11-14 lookup and the block D0 note, as they stood)*

  Plan 105's lookup (2026-11-14): the view does follow the end of a writing answer, but in jumps, and it stops whenever the ring is on the answer (which would explain the Deck run where the page stayed at the top). **Deck 2026-11-17 (plan 105 block D0, row P105-M-ANSWER-FOLLOW, `workshop:test-evidence/plan105-P105-M-ANSWER-FOLLOW.json`):** the page did not follow at all in either case measured, with nothing holding the ring and with the ring on a term inside the writing answer; the scroll position stayed at 0 throughout while the answer's newest text went below the visible area. A fix lands in the next batch (lane A8; not yet).
  The status line then read: PARTIAL: the cutting while it writes is built (2026-10-14, plan 93) and passed on the Deck 2026-10-14 (row P93-M4-ANSWER-FINISH-after, in Done); the view following the end of the answer smoothly while it writes is NOT built. Decided on the mock-up board 2026-10-10 (option A of round 2); carried over 2026-09-24 from plan 05.

*Bugs entry: Clear hid an answer (as it stood)*

  After a long question was refused, A on the X emptied the box, and the answer to the last question also vanished from the view (the question bubble stayed; the answer and its feedback buttons were gone). Whether the saved chat still holds the turn was not checked; seen once. Evidence `workshop:test-evidence/plan105-P105-M-PAPERCLIP-LEFT.json` (its side note) and the driver's handover `workshop:planning/assets/105-handover-D0.md`.

*Bugs entry: the AI models box, an installed model can vanish (as it stood)*

  The licence check runs before the rule that keeps installed models on screen, so with the default "open source only" setting an installed model outside it can drop out of the list while the count at the top still counts it. This may be the "hidden Gemma" the maintainer reported in October (see the AI models screen entry in Features). Same screen: it opens with 2 rows, not 3, because that setting hides one of the three "Deck essentials" models. Lane D5's area; row **P105-MODELS-BOX-01**.

*Features entry: AI models screen (as it stood)*

  Only a few models show up now. Grow the catalog a lot. The filters are confusing; cut them down to a few clear ones. Chosen for plan 105 (the maintainer, 2026-11-14, D142 call 4), look picked 2026-11-15: board 5, tab 3, C (word buttons and two switches); lane D5.

*Features entry: Terse answers capped at about 40 words (as it stood)*

  Today Terse asks for three lines, and three model lines wrap to nine or more screen lines on the Deck's panel. The cap becomes about 40 words. Related: the Done entry on the Terse slider stop (row P93-B13-TERSE-SLIDER).

*Features entry: "N earlier" one game at a time (as it stood)*

  An open day starts with a row of game buttons (All, each game asked about that day, No game). A on one shows only that game's questions, six at a time, and each row carries its game's name. Left or Right on the "N earlier" line flips the whole list: by day, as now, or one line per game across every day, each question stamped with its day. The maintainer: some players remember the day, some remember the game; this serves both. Each saved question already stores its game, so no new data is needed. Not chosen: a busy day that splits by game on its own, or questions sorted by game with labels.

*Features entry: Decode as the default (as it stood)*

  Decode becomes the default for both answers and chips, and the animation settings leave the Developer tab. Call 6: today's Decode values are the stock values; a short clip goes on the checks page for the maintainer's eye. Call 16 (default taken at go): the "fade" and "carousel" chip styles are deleted, "static" stays as the reduced-motion look (lane B2). Only the thumbs row ("Was this helpful?" and its two buttons) animates in under an answer (call 6; lane A4).

*Features entry: Headline first (as it stood)*

  Status line: OPEN, filed 2026-09-08. Not yet (D99): it waited for its own go; chosen for plan 105 (the maintainer, 2026-11-14, D142 call 5): build it, as plain text, after the mock-up (lane P1). It lands switched on only if the answer test shows more answers opening with their point and no loss of facts; otherwise switched off, with the numbers. The model would open every answer with one short sentence that carries the point and gives nothing away. The 2026-09-12 count: 2 of 10 answers already did, 0 of 10 gave anything away. By the maintainer's own rule that means build it, but they said not yet.

*Features entry: finish the controller test rig (the 2026-11-16 note, as it stood)*

  **2026-11-16 (plan 104 block D2c):** saved walks that depend on chat contents cannot be replayed on a changed chat: four replayed and none matched (the test chat had changed since they were saved, and a replay sets up no start of its own); the two Ollama-tab walks were not run. Evidence `workshop:test-evidence/plan104-P104-D2C4-REPLAYS.json`.

## Cancel and slow controls sweep notes moved from the roadmap (2026-11-19)

Moved word for word by the docs sweep after the cancel and slow controls round, to make room in the roadmap. Each block names the entry it stood in; the entry keeps its place and a link here.

*Features entry: Pressing Left enough times reaches the Quick Access Menu (the two 2026-11-17 notes, as they stood)*

  **Deck 2026-11-17 (plan 105 block D0, before the build, row P105-M-LEFT-EDGES, `workshop:test-evidence/plan105-P105-M-LEFT-EDGES.json`):** Left from the first control of the Ollama, Settings, Permissions and About tabs already lets the ring out to Steam's side rail; the tab bar always keeps it inside bonsAI; the question box and the idle mode button move it to the paperclip.
  **Deck 2026-11-17 (block D3b, build `1b45aa04b`, `workshop:test-evidence/plan105-P105-LEFT-TO-MENU-01-d3b.json`): PASS** on the paperclip, an answer paragraph and the "N earlier" line (out on the third Left); on Settings, Permissions and About (out on the first); the tab bar wraps; the Reply style slider holds two and the third goes out; presses 3 to 5 s apart never leave the paperclip; LEFT-HOLDS-STILL-01's two Lefts hold on the paperclip and a paragraph, a 3 s hold stays. **Not yet:** the first suggestion chip (no chips showed) and "Suggest as a tip" (all three Lefts stayed, unclear). The dock's "Show details" line goes out on the first Left (Bugs). Row **P105-LEFT-TO-MENU-01** stays open.

*Verify entry: Make the preset chips look more like chips (the maintainer's eye and the owed list, as they stood)*

  **The maintainer's eye, 2026-10-22 (the checks page):** "raised like buttons" PASS (row **CHIP-BUTTON-01**, closed) and "the soft blue fill" PASS (the look of row P79-CHIP-SOFT-FILL). The help and agent chips FAILED: "make sure the focus ring works on the How to use bonsAI chip" (row **CHIP-BUTTON-06** stays open; see the Verify entry on the help chip). The short chip's centring: no verdict (a new Features entry asks for the decode to move in step with the scroll). **The chip pace: "as they are", closed (the maintainer's call of 2026-10-22, plan 99 § 2 call 12).**
  Still owed: **CHIP-BUTTON-05** by eye (not part of that answer), **CHIP-BUTTON-06**, a short chip's centring (no short chip without a tip dot showed in 417 s on 2026-10-11, so that rests on its tests only; row P79-LONG-CHIPS is closed). The chip pace is no longer owed (call 12; its Deck rows P78-TIP-CHIP and P78-CHIP-PACE passed, in Done). **CHIP-BUTTON-05 and CHIP-BUTTON-06 stay owed.** **2026-11-17 (plan 105, `8d39cdc84`):** the agent chip now shows the blue focus fill under the ring (the help chip's fill already did); CHIP-BUTTON-06 is still owed on the Deck. **Deck 2026-11-17 (plan 105 block D1): COULD NOT RUN** (no agent chip appeared in the whole block); the agent chip could not be shown on demand, so it needs a hand check (`workshop:test-evidence/plan105-CHIP-BUTTON-06.json`). **Deck 2026-11-17 (plan 106 block W1c, build `4dfa35f7e`): the agent chip's blue fill under the ring PASSED** (Pyro answer, pictures saved; `workshop:test-evidence/plan106-CHIP-BUTTON-06.json`); **CHIP-BUTTON-05 and the maintainer's eye on CHIP-BUTTON-06 are still owed.**

*Verify entry: Developer option, sections open and close as the D-pad walks (the two block D3 notes, as they stood)*

  **Deck 2026-11-17 (block D3a, build `94a561bbf`):** the open-and-close rule passed; two of five arrivals left every section shut; the glide was 37.6 px for 7 frames (`workshop:test-evidence/plan105-P105-SECTIONS-AUTO-01.json`).
  **Deck 2026-11-17 (block D3b, build `1b45aa04b`, after `69d616afc` and `79d075ae8`):** arrivals PASS (the first section open on 5 of 5 Ollama and 3 of 3 Developer arrivals) and walking Down opens the next section PASS. **The glide still FAILS:** Up onto "Use local knowledge base" the row drops 20.8 px at about 38 ms and is back by about 150 ms (within 0.5 px at 300 ms); Up onto the Reply style slider settles 4 px lower (`workshop:test-evidence/plan105-P105-SECTIONS-AUTO-01-d3b.json`). Row **P105-SECTIONS-AUTO-01** stays open; the switch is off by default.

*Verify entry: First-time setup, bring back the starter set (the 2026-10-14 note, as it stood)*

  **2026-10-14 (plan 93):** the starter set is back: "Install the starter set" brings gemma4:e2b-it-qat, the note-search model and the two speech models (`bbd5de86`, `0f8f32aa`; see the Verify entry on the starter model). "Cut the steps" is not touched.

*Verify entry: The Ollama tab looks dated, fold Cancel into the buttons (the block D3b note, as it stood)*

  **Deck 2026-11-17 (block D3b, build `1b45aa04b`, `workshop:test-evidence/plan105-P105-OLLAMA-BUTTONS-01-d3b.json`): PASS** for the stops in order both ways (Update never skipped, nothing twice, every stop fully visible), the connection line staying 44 px before and after A with the ring kept, Left out from it and Right back, and no raw installer box. **Not run on purpose:** the job card, its Cancel and the bar (they need a real Ollama update, the maintainer's call; tests cover them). **Plan 106 (lanes F3, R1 and R2; Deck block W1, build `4dfa35f7e`):** lane D4b is built, the library download and the voice install on the same card with the voice install's first Cancel (`c275d29fe` to `04d4346ea`), and the three card notes are fixed. **Deck:** the ring is on Cancel at once and stays; the bar sits at the foot with the ring fully visible; **the card's site line is cut off with "…" (FAIL, in Bugs)**; the "Turn on internet downloads?" box and the bar leaving after a finish are still owed (`workshop:test-evidence/plan106-P105-OLLAMA-BUTTONS-01.json`, row P105-OLLAMA-BUTTONS-01). The voice install's card could not run: the Deck has no voice engine (row P105-JOB-CARD-ELSEWHERE-01, still owed).

*Verify entry: Show details, the D-pad and the tab strip (the 2026-11-10 note, as it stood)*

  **Deck 2026-11-10 (plan 103 block D2, build `3eabdfa27ab3`):** Down from "Hide details" lands on the strip 3 of 3 with no notes line, on the notes line then the strip 3 of 3 with one, and the same with a game running; the page never read out of focus (about 95 reads; about 125 across all of block D2). Not run: two fresh chats, an older answer, a covered answer. **P103-DETAILS-STRIP-01** stays owed for those, and the out-of-focus half rests on its tests until a Deck try catches the page out of focus (`workshop:test-evidence/plan103-P103-DETAILS-STRIP-01.json`, `-try2.json`). The original sighting: `workshop:test-evidence/plan99-FILMING-SIGHTINGS.md` (section 1). Older text: [roadmap-details.md](roadmap-details.md#plan-103-sweep-k2-notes-moved-from-the-roadmap-2026-11-10).

*Features entry: Finish the controller test rig (the 2026-11-17 driver tools note, as it stood)*

  **2026-11-17 (plan 105):** three driver tools landed: place a hand-written chat on the Deck (`ac2593acb`), wait for an answer the driver sent (`301811069`), and the knowledge-base read-back on this PC (`7798379af`); no Deck row of their own. Block D1 tried two: placing took 1.22 s and removing 1.04 s, but the open plugin did not show the placed chat (it reads its chat list once); the wait script printed READY and one line that fitted the sampler's timing (`workshop:test-evidence/plan105-P97-L3-SPOILER-BOLD.json`, `workshop:test-evidence/plan105-P105-ANSWER-FOLLOW-01.json`). **Block D2 (2026-11-17):** after a plugin reload the placed chat showed first in the chats menu (placing took 2.2 s, removing it 1.1 s, and the chat folder came back byte for byte; `workshop:test-evidence/plan105-P97-L3-SPOILER-BOLD-try2.json`). The 2026-11-16 replay note: [Detail](roadmap-details.md#plan-105-notes-moved-from-the-roadmap-2026-11-17).

*Verify entry: sweep every tab for lopsided buttons (the 2026-10-18 look check note, as it stood)*

  **Deck 2026-10-18 (plan 96 block F, build `24f5c300`):** the look check on Main found nothing; that was the Main run still owed after `bba825e5` (`workshop:test-evidence/plan96-QA-LOOK4-main.json`). The "AI is not set up" answer variant could not be made by the rig (it needs A on a text box). **Still owed:** the same run on the monitor (the ask names both screens). Older notes: [roadmap-details.md](roadmap-details.md#plan-96-notes-moved-from-the-roadmap-2026-10-18).

*Verify entry: Steam's on-screen keyboard for Rename chat (the 2026-10-22 Deck note, as it stood)*

  **Deck 2026-10-22 (plan 97 block D8, build `15565346`): row P97-L10-RENAME-KEYBOARD passed with the rig.** The ring was on the name field when the box opened, one A on the field showed Steam's keyboard, a typed letter landed, Save renamed the chat and renaming back worked (`workshop:test-evidence/plan97-P97-L10-RENAME-KEYBOARD.json`). It shows only that nothing broke. **Still owed:** the maintainer's own controller, **P97-L10-RENAME-KEYBOARD-HAND** in [testing-manual.md](testing-manual.md). Older notes: [roadmap-details.md](archive/roadmap-details-closed.md#plan-97-second-sweep-notes-moved-from-the-roadmap-2026-10-22).
