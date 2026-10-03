# Plan 80, step 1 — findings sheet 03: Features, second half

- **Slice:** `docs/roadmap.md` Features, from "Connection doctor" (line 249) to the `## Verify` heading (line 332).
- **Date:** 2026-10-03. **Branch:** `experimental`. Read-only check; no roadmap file was edited.
- **Entries:** 23. **Verdicts:** true 18 · stale 5 · done with proof 0 · fixed with no proof 0 · unclear 0.
- **Status changes proposed:** none. Every entry stays OPEN. Five entries need their words fixed (stale).
- **No Deck evidence exists for any entry in this slice** except the controller test rig (row OVERNIGHT-RUN-01) and the SteamVR bench (a written findings document, not a recording file).
- Link bases: locked decisions `audit/maintainer-decisions-locked.md`, older ones `audit/maintainer-decisions-archive.md`. All links inside the 23 entries resolve today (file and heading checked).

## Connection doctor
- **Title / place:** "Connection doctor", Features, line 249 (four stars, `[ask]`).
- **Verdict:** true.
- **Proof:** no code for it. A search of `src/`, `main.py` and `py_modules/` for a Fix this button or a report command found nothing. Plan file `planning/39-connection-doctor.md` says "written 2026-09-05, before any code".
- **Decision owed?** No. Calls already locked: [D64](audit/maintainer-decisions-archive.md#d64--locked-2026-09-05-raised-2026-09-05--the-connection-doctor-and-the-health-report-seven-calls-before-go).
- **Test owed?** No (nothing built). No evidence exists.
- **Proposed entry:**
  - ★★★★ `[ask]` **Connection doctor** — **OPEN, planned 2026-09-05, calls locked (D64).** When an Ask fails, a **Fix this** button under the reply runs the checks the plugin already has and shows the one that failed.
  - It offers one next step, with a button that lands you on that control in the Ollama tab. Nothing changes without a press.
  - It also holds **Save a report** (a button and a typed command): a read-only report of the setup, written to the Desktop. This is the old **Deck health snapshot**, folded in. [Plan](planning/39-connection-doctor.md).
- **Long notes:** none linked from the entry. The "Deck health snapshot" long note is under the benchmark heading in the details file (see "On-Deck model benchmark").

## Session context and user stash
- **Title / place:** "Session context and user stash", Features, line 252 (four stars, `[ask]`).
- **Verdict:** stale. The entry reads as if nothing exists. Half of it does.
- **Proof:** the Session context strip is built: `src/components/SessionContextStrip.tsx`; its Clear button is closed in `archive/roadmap-completed.md` (the entry "Clear button in the session context strip", moved 2026-09-16, [D99](audit/maintainer-decisions-locked.md#d99--locked-2026-09-12--after-the-frame-bench-two-not-yet-reading-aloud-goes-with-a-three-way-setting-and-a-clear-button-in-the-session-context-strip)). The user-editable notes half: no code found (searching for a stash, user notes: only an unrelated clipboard helper).
- **Decision owed?** No decision recorded for the notes half.
- **Test owed?** No (the notes half is not built). No evidence exists for it.
- **Proposed entry:**
  - ★★★★ `[ask]` **Session context and user stash** — **OPEN, half done.** The live half exists: the Session context strip shows how many turns the chat carries, with a Clear button.
  - Not built: notes you write and edit yourself that Ask reads. No embeddings, no cloud.
- **Long notes:** none linked. The details file has a short filed copy under "Platform / upstream items" area (line 556, four lines). It can be dropped once the entry says all of it.

## A spoiler-chance rating for the chat's own summary
- **Title / place:** "A spoiler-chance rating for the chat's own summary", Features, line 254 (four stars, `[ask]`).
- **Verdict:** true.
- **Proof:** `audit/maintainer-decisions-locked.md` D118 call 14, line 1807: "Spoiler chance (the look-back rating) gets its own plan, later." No code for a rating found. The summary itself shipped (plan 68).
- **Decision owed?** No. Locked: [D118](audit/maintainer-decisions-locked.md#d118--locked-2026-09-24-raised-2026-09-24--plan-68-the-chat-sums-itself-up-the-calls-from-discovery).
- **Test owed?** No. None exists.
- **Proposed entry:**
  - ★★★★ `[ask]` **A spoiler-chance rating for the chat's own summary** — **OPEN, not started (D118 call 14).** The chat now sums itself up (see Verify, plan 68).
  - Rating how likely that summary swept up a spoiler is a later plan of its own.
  - [Detail](archive/roadmap-completed.md#the-chat-sums-itself-up-instead-of-being-cleared-closed-2026-09-26).
- **Long notes:** none (the link goes to the archive).

## LAN custom model pull
- **Title / place:** "LAN custom model pull", Features, line 258 (four stars, `[ollama]`).
- **Verdict:** stale. Its one dependency has shipped, and "R1 to R4" is not explained anywhere I can read.
- **Proof:** "Custom model in the Pull Models picker" is gone from the roadmap because it shipped: `archive/roadmap-completed.md` line 621 ("Shipped and walked on the Deck 2026-09-05"; PULL-CUSTOM-01, 02 and PULL-PIN-01 pass; PULL-NEW-BADGE-01 passed 2026-09-16, evidence `test-evidence/plan56-WIPE-01.summary.json`). Code: `src/components/PullModelsModal.customTagChip.test.tsx`. "R1–R4" appears in `roadmap-details.md` line 554 with no list behind it.
- **Decision owed?** Yes, a mechanism has to be chosen. No decision recorded.
- **Test owed?** No (nothing built). No evidence exists.
- **Proposed entry:**
  - ★★★★ `[ollama]` **LAN custom model pull** — **OPEN, blocked on a call: which way to pull a model onto another computer on your network.** No decision recorded.
  - The picker for typing a custom model name on the Deck itself already shipped. This is the same for a remote Ollama host.
- **Long notes:** the details file keeps a four-line copy (line 553, "LAN custom model pull (remote host — decision review)"). Keep the goal line; the "R1–R4" wording needs the maintainer to say what those were (see Notes).

## Web permission
- **Title / place:** "Web permission", Features, line 261 (four stars, `[perms]`).
- **Verdict:** true.
- **Proof:** no web-search code in `src/`, `main.py` or `py_modules/`. `planning/web-permission-discovery.md` says "Discovery in progress (2026-07-30); docs only — not implementing yet." The Kids lock exists (`py_modules/backend/services/capabilities.py`, line 89, "Session Kids master lock"), so the "kids lock forces it off" part is possible.
- **Decision owed?** No decision recorded. The entry says "discovery locked" but no D number backs it.
- **Test owed?** No. None exists.
- **Proposed entry:**
  - ★★★★ `[perms]` **Web permission** — **OPEN, discovery written, nothing built.** An opt-in so Ask can fetch live answers about current patches and news.
  - With it off, Ask and the local knowledge base work offline as today. The Kids lock forces it off.
  - [Discovery](planning/web-permission-discovery.md) · [Detail](roadmap-details.md#permissions--safety-items-as-filed).
- **Long notes:** the details section "Permissions / safety items, as filed" holds this entry (four lines) and the VAC Phase 2 entry. Both are shorter than their roadmap lines; they can be dropped once the roadmap lines say the same. The discovery file's own link `roadmap.md#planned` points at a heading that no longer exists (see Notes).

## Llama.cpp provider spike
- **Title / place:** "Llama.cpp provider spike", Features, line 264 (four stars, `[platform]`).
- **Verdict:** true.
- **Proof:** no llama.cpp code anywhere. `archive/spikes/llama-cpp-provider.md` exists. The deliverable named in the details file, `archive/spikes/llama-cpp-provider-eval.md`, does not exist. [D99](audit/maintainer-decisions-locked.md#d99--locked-2026-09-12--after-the-frame-bench-two-not-yet-reading-aloud-goes-with-a-three-way-setting-and-a-clear-button-in-the-session-context-strip) call 1 says llama.cpp "stays closed".
- **Decision owed?** No new one. It stays closed under D99 call 1 and D97 call 2.
- **Test owed?** No. None exists.
- **Proposed entry:**
  - ★★★★ `[platform]` **Llama.cpp provider spike** — **OPEN, research only; stays closed (D99).** A go or no-go on running models through llama.cpp instead of Ollama on the Deck.
  - Prior study: [llama-cpp-provider.md](archive/spikes/llama-cpp-provider.md). [Detail](roadmap-details.md#platform--upstream-items-as-filed).
- **Long notes:** the details section "Platform / upstream items, as filed" (this entry and Steam Input layout parse, six lines). All of it is already in the roadmap lines; none must stay.

## Steam Input layout parse
- **Title / place:** "Steam Input layout parse", Features, line 267 (four stars, `[platform]`).
- **Verdict:** true.
- **Proof:** the code reads only screenshot captions from `screenshots.vdf` (`py_modules/backend/services/screenshot_media.py:544`) and has a word list for Steam Input (`src/data/steam-input-lexicon.ts`). No controller-layout parsing found.
- **Decision owed?** No decision recorded.
- **Test owed?** No. None exists.
- **Proposed entry:**
  - ★★★★ `[platform]` **Steam Input layout parse** — **OPEN, not started.** Read the controller layout files so Ask knows what each button does in the running game.
  - Not in scope: writing or changing controller layouts.
- **Long notes:** shared section "Platform / upstream items, as filed" (see above). Nothing must stay.

## Finish the controller test rig
- **Title / place:** "Finish the controller test rig", Features, line 269 (four stars, `[QA]` `[platform]`).
- **Verdict:** stale in two places. The status is right (PARTIAL).
- **Proof:**
  - "(see the bug entry above)" points at nothing: no replay bug entry is left in `roadmap.md`. The fix is recorded in `roadmap-details.md` line 1781 ("Proven on the Deck 2026-09-26 (plan 70 flow 0)"; evidence `test-evidence/plan70-FLOW0-REPLAY.json`; re-save run `test-evidence/plan70-FLOW6-RESAVE.json`: 20 of 30 walks re-saved, 7 need the maintainer's call, 2 need a summed-up chat).
  - OVERNIGHT-RUN-01 in `testing.md` line 214 says "Partial (Deck) 2026-09-26": the command passed in 76 seconds; all 30 walks showed differences because the plugin panel was not reopened. Evidence `test-evidence/overnight-2026-09-26-200443.md`.
  - The entry says "Plan 70 built two of the four pieces" but no plan 70 link is given. The plan file is now `archive/70-kb-wave-four-and-deck-test-wave.md` (moved by commit 71225356, "Plan 70 closes"); the entry should link it.
- **Decision owed?** Yes in part: seven re-save walks wait on the maintainer's call about what they should now expect (details file line 1781 area). No decision number recorded.
- **Test owed?** Yes. OVERNIGHT-RUN-01 ([testing.md](testing.md), row OVERNIGHT-RUN-01). Evidence: `test-evidence/overnight-2026-09-26-200443.md`. The fix to reopen the panel before each walk is not built, so no fresh run exists.
- **Proposed entry:**
  - ★★★★ `[QA]` `[platform]` **Finish the controller test rig** — **PRIORITY 1 (maintainer, 2026-09-24). PARTIAL: built and driving every Deck session.**
  - Left from [plan 19](planning/19-controller-macro-test-rig.md): a recording that is also a live view, checking the highlight from the video, handheld runs over Bluetooth, and the nightly unattended run. The walk replay now works across builds (Deck 2026-09-26).
  - The first nightly run on 2026-09-26 ran by itself, but the 30 walks checked nothing yet (the panel was not reopened first). Row **OVERNIGHT-RUN-01** in [testing.md](testing.md). [Detail](roadmap-details.md#overnight-runs-first-real-run).
- **Long notes:** three headings. "Overnight run's first real run" (details line 2513): keep "Run 2026-09-26", "But the walks proved nothing this time" and "Next step, not yet built". "Controller macro test rig and live view" (line 848): keep the goal and safety lines and "Status, 2026-09-24"; the "Status as first written" line can go to the archive. "Saved Deck-walk replay across builds" (line 1781): keep the first two paragraphs; the "Cost to a running game" heading under it is a different topic.

## A note pinned in space
- **Title / place:** "A note pinned in space", Features, line 277 (four stars, `[reply]`).
- **Verdict:** true.
- **Proof:** no SteamVR panel code in the repo. `planning/49-steam-frame-features.md` is the plan. [D97](audit/maintainer-decisions-locked.md#d97--locked-2026-09-12-raised-2026-09-11--the-frame-features-four-calls-the-tips-go-the-voice-shape-and-the-anti-cheat-rule) call 3: "No headset is bought for now; the Frame carries the mic and wrist-panel questions when it arrives."
- **Decision owed?** No (locked in D97 call 3).
- **Test owed?** Needs a Deck-free check on a PC with SteamVR, and a real headset to judge reading. No evidence exists.
- **Proposed entry:**
  - ★★★★ `[reply]` **A note pinned in space** — **OPEN, filed 2026-09-08; needs the floating panel first.** In a headset, park the answer on a wall or table so it stays there while you play.
  - Needs the SteamVR panel first. The pretend headset can show it fixed in the room; a real headset judges whether it reads. No headset is being bought for now (D97 call 3); this waits for the Frame. [Plan](planning/49-steam-frame-features.md).
- **Long notes:** none linked.

## A wrist panel
- **Title / place:** "A wrist panel", Features, line 283 (four stars, `[reply]`).
- **Verdict:** true.
- **Proof:** as above: no code; plan 49; D97 call 3. The pretend headset has no hands (`planning/53-steamvr-bench-findings.md` lines 49-52).
- **Decision owed?** No (D97 call 3, same link as above).
- **Test owed?** Needs a real headset with tracked controllers. No evidence exists.
- **Proposed entry:**
  - ★★★★ `[reply]` **A wrist panel** — **OPEN, filed 2026-09-08; needs the floating panel first.** In a headset, a small panel rides on one controller: turn your wrist, read, drop your hand and it is gone.
  - Only testable with a real headset and tracked controllers. This waits for the Frame (D97 call 3). [Plan](planning/49-steam-frame-features.md).
- **Long notes:** none linked.

## SteamOS Share path
- **Title / place:** "SteamOS Share path", Features, line 289 (four stars, `[ui]`).
- **Verdict:** true.
- **Proof:** no Share-flow code found (searched `src/`, `py_modules/`). Not in the details file, the decisions or the tests.
- **Decision owed?** No decision recorded.
- **Test owed?** No. None exists.
- **Proposed entry:**
  - ★★★★ `[ui]` **SteamOS Share path** — **OPEN, not started.** A faster way from Steam's Share and capture screens into attaching a screenshot, where Steam's own tools allow it.
- **Long notes:** none.

## SteamOS spin hint card
- **Title / place:** "SteamOS spin hint card", Features, line 291 (four stars, `[ui]`).
- **Verdict:** true.
- **Proof:** no detection of unusual SteamOS builds found. The word "immutable" appears only in model-setup and knowledge-base text (`py_modules/backend/services/local_ollama_setup_service.py`, `knowledge_base_cards.py`), not as a feature.
- **Decision owed?** No decision recorded.
- **Test owed?** No. None exists.
- **Proposed entry:**
  - ★★★★ `[ui]` **SteamOS spin hint card** — **OPEN, not started.** Notice a locked-down SteamOS variant and show a card that links to the right troubleshooting.
- **Long notes:** none.

## On-Deck model benchmark
- **Title / place:** "On-Deck model benchmark", Features, line 293 (five stars, `[ollama]`).
- **Verdict:** true.
- **Proof:** no ranking code. No speed badge or "time this model" code found either (so the plan 43 readout is also unbuilt). [D75](audit/maintainer-decisions-locked.md#d75--open-raised-2026-09-06--the-model-speed-readout-six-calls-before-anything-is-built) is still headed OPEN; "Whether this line retires" is its call. D72 is closed: [D72](audit/maintainer-decisions-archive.md#d72--locked-2026-09-05-raised-2026-09-05--newer-models-for-the-deck-what-to-pull-and-measure).
- **Decision owed?** Yes: [D75](audit/maintainer-decisions-locked.md#d75--open-raised-2026-09-06--the-model-speed-readout-six-calls-before-anything-is-built).
- **Test owed?** No (nothing built). No evidence exists.
- **Proposed entry:**
  - ★★★★★ `[ollama]` **On-Deck model benchmark** — **OPEN, cut down on 2026-09-06; the call to retire it is open (D75).** The idea: rank installed models by measured speed and offer that as the try order.
  - Its own test said: if timings do not hold still, shrink it to a one-time readout. That readout is now its own three-star entry, [plan 43](planning/43-model-speed-readout.md). Desk study of this quarter's models: [plan 41](planning/41-deck-model-survey.md) (calls D72).
  - [Detail](roadmap-details.md#deck-health-snapshot-local-reply-tts-on-deck-model-benchmark).
- **Long notes:** heading "Deck health snapshot, Local reply TTS, On-Deck model benchmark" (details line 560). Not read in full for this sheet: it holds three entries, one of which (Deck health snapshot) was folded into the Connection doctor. A helper must keep the benchmark's gate wording; the snapshot part can go to the archive once the doctor entry says all of it.

## VAC Phase 2: opponent IDs
- **Title / place:** "VAC Phase 2: opponent IDs", Features, line 290 (five stars, `[perms]`). The line sits after the ★★★★★ benchmark, so it is in order.
- **Verdict:** true.
- **Proof:** Phase 1 is done (`archive/roadmap-completed.md` line 900, "VAC / ban lookup (Phase 1 — Ask command) — complete"). No opponent-ID code: the only matches for "opponent" are warning text that a ban lookup is not proof someone was your opponent (`py_modules/backend/services/steam_vac_service.py:219`).
- **Decision owed?** No decision recorded.
- **Test owed?** No (nothing built). The Phase 1 on-device QA is a separate Verify item.
- **Proposed entry:**
  - ★★★★★ `[perms]` **VAC Phase 2: opponent IDs** — **OPEN, research.** Show who you are playing against so you can check their ban record, when the game's data allows it.
  - Phase 1 (type in the IDs yourself) is done.
- **Long notes:** shared "Permissions / safety items, as filed"; nothing must stay.

## Steam Controller copilot (Ibex gen-2)
- **Title / place:** "Steam Controller copilot (Ibex gen-2)", Features, line 295 (five stars, `[platform]`).
- **Verdict:** true.
- **Proof:** no gen-2 code or copy found (search for the name in `src/`, `py_modules/`).
- **Decision owed?** No decision recorded.
- **Test owed?** No. None exists.
- **Proposed entry:**
  - ★★★★★ `[platform]` **Steam Controller copilot (Ibex gen-2)** — **OPEN, not started.** Answers worded for the new controller and its Steam Input layouts.
  - [Detail](roadmap-details.md#the-five-star-and-six-star-platform-items-as-filed).
- **Long notes:** heading "The five-star and six-star platform items, as filed" (details line 865). Holds this entry, Wake-word, Deep mod hints, In-game answer surface, Remote Play and others. Keep only what is not already in a roadmap line (see each entry).

## The floating panel inside SteamVR
- **Title / place:** "The floating panel inside SteamVR", Features, line 297 (five stars, `[platform]`).
- **Verdict:** true.
- **Proof:** `planning/53-steamvr-bench-findings.md`: pointing, lines 49-52 ("sent the panel no pointer events at all, across two runs"), notification card, line 56 ("2.4 ... Accepted, not seen"). Picture `planning/assets/53-panel-in-headset-2026-09-12.jpg`. Rule: [D97](audit/maintainer-decisions-locked.md#d97--locked-2026-09-12-raised-2026-09-11--the-frame-features-four-calls-the-tips-go-the-voice-shape-and-the-anti-cheat-rule). No panel code in the repo. The bench is a findings document, not a Deck test file.
- **Decision owed?** The build waits on the one-decision entry below ([D99](audit/maintainer-decisions-locked.md#d99--locked-2026-09-12--after-the-frame-bench-two-not-yet-reading-aloud-goes-with-a-three-way-setting-and-a-clear-button-in-the-session-context-strip) call 1, "not yet").
- **Test owed?** Yes: pointing at the panel (real headset needed) and whether the notification card drew. Evidence: only `planning/53-steamvr-bench-findings.md`; no test row, no recording file.
- **Proposed entry:**
  - ★★★★★ `[platform]` **The floating panel inside SteamVR** — **OPEN, filed 2026-09-08; the bench works, nothing is built.** bonsAI's panel floating over any VR game, drawn by a small PC program, not a Decky plugin.
  - **Locked rule (D97):** it goes only through SteamVR's own panel door and never touches the game, to avoid an anti-cheat ban.
  - Bench 2026-09-12: a sample answer appeared in the headset view. Still unknown: pointing at it (needs a real headset) and whether the notification card drew. [Detail](roadmap-details.md#the-floating-panel-inside-steamvr).
- **Long notes:** heading "The floating panel inside SteamVR" (details line 1228). It is almost the same text as the roadmap entry plus the link list (plan 50, plan 52 section 4, plan 53, the picture). Keep the link list; the rest can go.

## Stand-in Decks on the maintainer's PC
- **Title / place:** "Stand-in Decks on the maintainer's PC", Features, line 305 (five stars, `[QA]` `[platform]`). Sits after the ★★★★★ floating panel; in order.
- **Verdict:** true.
- **Proof:** `planning/67-stand-in-decks.md` line 3: "Nothing built, nothing installed, nothing run. Phase 0 is next, and it starts only when the maintainer says so." Order after the controller rig is set in the same file.
- **Decision owed?** No decision recorded (it waits on the maintainer's start).
- **Test owed?** No. None exists.
- **Proposed entry:**
  - ★★★★★ `[QA]` `[platform]` **Stand-in Decks on the maintainer's PC** — **OPEN, planned 2026-09-23, nothing built.** Up to four virtual Decks so several AI sessions can test at once instead of queuing for the one Deck.
  - Phase 0 first: one stand-in on Windows; if that fails, a Linux dual boot. Comes after the controller test rig. [Plan 67](planning/67-stand-in-decks.md).
- **Long notes:** none linked.

## The folded reasoning line in the character's own voice
- **Title / place:** "The folded reasoning line in the character's own voice", Features, line 304, **a two-star entry that sits out of order** between the five-star entries (Stand-in Decks above, Wake-word below). Stars should go up through the list, so it belongs at the start of the list (with the two-star and three-star entries above line 249).
- **Verdict:** stale. The entry says it builds only after the reasoning display's first version has landed and been looked at. It has.
- **Proof:** `archive/roadmap-completed.md` lines 476-510 ("Reasoning display", closed 2026-09-18): six of seven Deck rows passed 2026-09-17, REASONING-07 passed on re-run; the fold row ships. Evidence `test-evidence/plan57-REASONING-01.json` to `-07.json`. The voiced fold itself is not built: the word "voiced" appears in the code only in tests of the plain fold (`src/components/MainTabChatTranscript.reasoningFold.test.tsx`). Locked as a later optional entry in [D106](audit/maintainer-decisions-locked.md#d106--locked-2026-09-16--after-the-fourth-feature-session-the-plain-reasoning-fold-first-the-session-as-a-tab-the-cards-six-rows-a-read-aloud-button-and-one-call-left-open) call 4.
- **Decision owed?** Yes, small: how the voiced line gets written (a fixed phrase per character, or the model asked each time). Named as undecided in the entry; no decision recorded.
- **Test owed?** No (nothing built). No evidence exists. The mockup page is a claude.ai link outside the repo.
- **Proposed entry:**
  - ★★ `[reply]` **The folded reasoning line in the character's own voice** — **OPEN, optional, filed 2026-09-16 (D106).** The plain folded line has shipped, so this can be picked up.
  - The mockup showed the line written in a character's voice, for example "See the booyakasha · 41 s" for Ali G. Not decided: a fixed phrase per character, or the model asked once each time.
  - It must fall back to the plain line when the character is off or the phrase is missing. [Mockup page](https://claude.ai/artifact/2De58qirE34754PEZVPmdb).
- **Long notes:** none linked.

## Wake-word listening
- **Title / place:** "Wake-word listening", Features, line 314 (five stars, `[voice]`).
- **Verdict:** true.
- **Proof:** no wake-word code. `planning/10-wake-word-listening-feasibility.md`: "Verdict: CONDITIONAL GO, scope reduced", research only.
- **Decision owed?** No decision recorded.
- **Test owed?** No. None exists.
- **Proposed entry:**
  - ★★★★★ `[voice]` **Wake-word listening** — **OPEN, beta; study says conditional go, nothing built.** Opt-in, always listening on the Deck for the word "bonsAI", then it hears your question and asks quietly.
  - [Feasibility](planning/10-wake-word-listening-feasibility.md).
- **Long notes:** shared "five-star and six-star platform items" section; nothing must stay (it points at the same feasibility file).

## Deep mod AI hints
- **Title / place:** "Deep mod AI hints", Features, line 316 (six stars, `[platform]`).
- **Verdict:** true.
- **Proof:** no mod-framework code. `planning/12-deep-mod-ai-hints-feasibility.md`: "GO on a descoped v1 ... NO-GO on tier C"; research only.
- **Decision owed?** No decision recorded (the study ends with a go on a smaller first version, but nobody has chosen to start).
- **Test owed?** No. None exists.
- **Proposed entry:**
  - ★★★★★★ `[platform]` **Deep mod AI hints** — **OPEN; study says go on a smaller first version, nothing built.** Spot which mod tools a game uses, so answers can be mod-aware.
  - [Feasibility](planning/12-deep-mod-ai-hints-feasibility.md).
- **Long notes:** shared section; nothing must stay.

## One decision for three items: the SteamVR panel, leaving Decky, and reopening llama.cpp
- **Title / place:** "One decision for three items: the SteamVR panel, leaving Decky, and reopening llama.cpp", Features, line 318 (six stars, `[platform]`).
- **Verdict:** true.
- **Proof:** [D99](audit/maintainer-decisions-locked.md#d99--locked-2026-09-12--after-the-frame-bench-two-not-yet-reading-aloud-goes-with-a-three-way-setting-and-a-clear-button-in-the-session-context-strip) call 1: "The second way to run: not yet." Price: `planning/53-steamvr-bench-findings.md` section 3 (the Python side ran on a Windows PC, nine calls answered). No second-way-to-run code in the repo.
- **Decision owed?** Yes, the maintainer's go. Linked: [D99](audit/maintainer-decisions-locked.md#d99--locked-2026-09-12--after-the-frame-bench-two-not-yet-reading-aloud-goes-with-a-three-way-setting-and-a-clear-button-in-the-session-context-strip) and [D97](audit/maintainer-decisions-locked.md#d97--locked-2026-09-12-raised-2026-09-11--the-frame-features-four-calls-the-tips-go-the-voice-shape-and-the-anti-cheat-rule) call 2.
- **Test owed?** No (nothing built). The bench result is in plan 53, not a test file.
- **Proposed entry:**
  - ★★★★★★ `[platform]` **One decision for three items: the SteamVR panel, leaving Decky, and reopening llama.cpp** — **OPEN. Not yet (D99, 2026-09-12): nothing is built until the maintainer says.**
  - The question: does bonsAI grow a second way to run? Today the Python side has no network door, so a PC panel would have a screen and no brain.
  - The price is known: the Python side ran on a Windows PC and all nine calls came back working. Still missing: a starter program and a way for a panel to reach it. [Detail](roadmap-details.md#one-decision-for-three-items-the-steamvr-panel-leaving-decky-and-reopening-llamacpp).
- **Long notes:** heading at details line 1247. Keep "The price is now known" paragraph and the link list; the opening sentence about the old menu-icon study can go to the archive.

## Remote Play diagnostics layer
- **Title / place:** "Remote Play diagnostics layer", Features, line 326 (six stars, `[platform]`).
- **Verdict:** true.
- **Proof:** the only Remote Play code is a link into Steam's Remote Play settings page (`src/data/steamSettingsNavigation.ts:28`); no diagnostics. Source note: `archive/09-steam-frame-companion-feasibility.md` section B8 (file exists).
- **Decision owed?** No decision recorded.
- **Test owed?** No. None exists.
- **Proposed entry:**
  - ★★★★★★ `[platform]` **Remote Play diagnostics layer** — **OPEN, not started.** When you stream a game, answers weigh encoding delay and whether the fix belongs on the host or the client.
  - Noted in [09-steam-frame-companion-feasibility.md](archive/09-steam-frame-companion-feasibility.md) section B8.
- **Long notes:** shared section; nothing must stay.

## In-game answer surface
- **Title / place:** "In-game answer surface", Features, line 328 (six stars, `[reply]`).
- **Verdict:** stale. It says the toast slice "is its own ★★ entry above"; that entry is closed.
- **Proof:** `archive/roadmap-completed.md` line 9-11: "The answer's first lines in the reply-ready toast (closed 2026-09-28)", "passed on the Deck (row T75-FEATURE-F1-REAL-POPUP, build c71f1d8b)". No full-overlay code. Overlay still upstream-gated per the details file (line 889 area).
- **Decision owed?** No decision recorded for the overlay.
- **Test owed?** No for the toast (passed). No evidence exists for the overlay (research only).
- **Proposed entry:**
  - ★★★★★★ `[reply]` **In-game answer surface** — **OPEN, research only.** Read an answer without leaving the game. The full overlay waits on Valve's side.
  - The toast slice has shipped (answer's first lines in the popup, passed on the Deck 2026-09-28, see [archive](archive/roadmap-completed.md#the-answers-first-lines-in-the-reply-ready-toast-closed-2026-09-28)).
  - The same surface in a headset is **The floating panel inside SteamVR**; see [plan 49](planning/49-steam-frame-features.md).
- **Long notes:** the "In-game answer surface" block in the shared platform section: the "Split 2026-09-05" bullet can go (the split is done); keep the "Reframed 2026-09-08" bullet.

## Notes for the review
- **History re-check (full history now available):** no hash of mine had failed to resolve. I re-ran the history searches; they found only planning and lock commits (da394887 connection doctor calls, eb750a97 speed readout, f2b8f1d0 headset plan, 657cb0ed SteamVR bench). None changes a verdict.
- **Out of order:** the two-star "folded reasoning line" entry sits in the five-star group at line 304. Move it to the front of the Features list when the roadmap is rebuilt.
- **Needs the maintainer:** (1) LAN custom model pull: what "R1 to R4" were. They are named in the entry and in the details file but no list of them exists in the files I read. (2) Controller rig: seven re-save walks wait on a call about what they should now expect (details file, "Saved Deck-walk replay across builds"). (3) The Connection doctor and the speed readout are planned but unbuilt; D75 is still OPEN.
- **Dangling references:**
  - Controller rig entry: "see the bug entry above" and the mention of "Plan 70" have no link. Plan 70 is now in `archive/70-kb-wave-four-and-deck-test-wave.md`.
  - `planning/web-permission-discovery.md` links to `roadmap.md#planned`, a heading that does not exist now.
  - In-game answer surface says "its own ★★ entry above"; that entry is archived.
- **Evidence gaps:** no recording file exists for the SteamVR bench (plan 53 holds the written result and one picture). The roadmap's wording "discovery locked" for Web permission has no decision number behind it.
- **Not read in full:** the details heading "Deck health snapshot, Local reply TTS, On-Deck model benchmark" (about 230 lines). Its split between "stays" and "archive" needs a helper who reads it whole.
