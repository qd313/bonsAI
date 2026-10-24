# 30 — Knowledge base: making the answers better (plan)

Written 2026-09-01 from the roadmap, the code, the eval reports, and a read of the maintainer's
Deck (Ollama version, loaded model, plugin log, and the 161 asks recorded in the ask trace).
Plain language on purpose. Nothing in this file has been built yet unless the checklist says so.

Facts are cited as `file:line`. Where I could not verify something it says UNKNOWN.

---

## Executive summary

**What the knowledge base is today.** A small offline library of game notes ("cards": 161 in the
source file, 133 on the maintainer's Deck) plus 124 Deck troubleshooting tips. When you ask a
question, the plugin searches the cards for the running game, glues the best 1–5 onto the
instructions it sends the AI, and the AI writes the answer. The search half has been measured
carefully for a month. **The answer half — what the small model on the Deck actually does with
the cards — has never been measured at all.** That is the biggest gap.

**Where the search stands.** On questions written without looking at the cards (the honest test
set), the shipping search finds the right card in its top three **78%** of the time and first
**54%** of the time. Its "meaning" half alone does better (83% / 63%), which is the open question
D38 the maintainer has deferred until there is more data. Adding cards has made the score drift
*down* a little each time, mostly because the test only allows one right answer per question
(D40, open).

**The biggest things we can do for answer quality, in order:**

1. **Measure the answer, not just the search.** Build a small answer test that runs the Deck's
   own model (`gemma4:e2b-it-qat`) on the PC against ~30 real questions and checks, without a
   judge: did the reply use the card's facts, did it invent anything the card contradicts, did
   it keep the spoiler and menu rules. Every other item below is guesswork until this exists.
2. **Put the new cards on the Deck.** The Deck is on corpus `2026.08.22` (133 cards); the source
   has 161. Twenty-eight cards — State of Emergency, the Hades weapons, the Cyberpunk / Fallout /
   Red Dead entity cards and the three "which should I pick" comparison cards — have never been
   seen by the device. That needs a corpus release (a publish action; needs your go-ahead).
3. **Feed the small model less noise.** A Strategy ask sends about **2,000 tokens of prompt, of
   which only ~200 are the cards**; the other 1,800 are instructions. Some of those instructions
   are dead weight: the model obeyed the citation-fence instruction **1 time in 89**, and the UI
   cannot display that fence anyway; ~230 tokens of screenshot-reading rules go out on every
   text-only ask. Small models follow fewer instructions better. Trim, and move the cards right
   next to the question. All of it measurable with item 1.
4. **Stop silent truncation before it bites.** Ollama on the Deck runs a **4,096-token window**
   and the plugin never sets one. A troubleshooting ask can attach up to **96 KB of Proton logs
   (~25,000 tokens)**; Ollama then silently keeps the *end* of the prompt and throws away the
   start — which is where the AI's identity, the rules, and the game line live. Not yet seen in
   the 161 recorded asks (none attached logs), but it is reachable by construction. Cheap to fix
   by budgeting the prompt; optionally by raising the window as a measured experiment.
5. **Spoiler fences misfire, measured.** In the recorded asks the model wrapped tactics in a
   spoiler fence on **8 of 41** asks about low-story games, and on **21 of 53** asks that named
   the thing being asked about (the UI unwraps the named ones on display; the low-story ones show).
   Your proposed spoiler tiers setting plus a prompt fix belongs here.
6. **Follow-ups have no memory.** The model receives only the system prompt and the one new
   message — never the previous turns. "What about the second phase?" arrives with no game entity
   to search and no idea what "the" refers to.
7. **Retrieval housekeeping already agreed but not done:** the keyword-vs-meaning weight sweep on
   the tune split (D38 groundwork item 2 — no tooling exists for it yet), per-case results for the
   arm that actually ships (D41 step 1), and a fixture that can hold more than one right answer
   (D40).
8. **Content shapes the corpus lacks:** "starting out" and comparison cards (three now exist,
   type undecided), per-game Deck tips (content for 7 titles collected; blocked on schema v4), and
   troubleshooting questions that describe a symptom without naming a topic (2 of 4 blind rows
   miss; maintainer call filed 2026-08-28).

**Things that need your attention** are in § 6. **Questions that decide the shape of the work**
are in § 3 — please answer those before I build anything past item 1.

---

## Checklist

Legend: ✅ done / fixed this session · ❌ blocked, or a bug found this session and not yet fixed ·
⬜ not attempted yet.

### Research (this session)

- ✅ Read the roadmap, the KB architecture doc, the locked decisions D16–D42, the last four eval
  reports and the code behind retrieval and the prompt.
- ✅ Measured the Deck: Ollama `0.32.15`, model `gemma4:e2b-it-qat` (Q4_0, 1.66 GB), context
  window **4096**, no `OLLAMA_CONTEXT_LENGTH` set, corpus `2026.08.22` on the SD card.
- ✅ Measured the last six asks in the plugin log: prompt 1808–1954 tokens, replies 154–430
  tokens, payload 8.5–9.1 KB, every one ended on `stop` (no cut-offs).
- ✅ Measured 161 recorded asks in the Deck ask trace (numbers in § 2.3).
- ✅ Maintainer answered Q1–Q8 (2026-09-01); recorded as D45–D52. Q9 / Q10 answered 2026-09-05: D65 (their own kind) and D66 (test both shapes first, row KB-ANSWER-03).

### Bugs and gaps found this session (not fixed)

- ❌ **No context window is set on the Ollama request**, and the Proton-log path can send ~6×
  the window. `ollama_service.py:497-501` sends only `num_predict` and `temperature`;
  `proton_troubleshooting_logs.py:18` allows 96 KiB; `knowledge_base_service.py:1917` stacks logs
  then cards under 100 KiB. Ollama keeps the tail and drops the head, silently. **Fixed by W3
  on 2026-09-03** (logs 4 KiB, follow-up paste 1,500 characters, overflow warning).
- ❌ **The citation-fence instruction is dead.** Obeyed 1 time in 89 KB asks on device, and no
  frontend code handles `bonsai-cite` (grep of `src/` finds nothing), so the one time it fired the
  user saw a raw code box. `ollama_prompts.py:1182-1193`.
- ❌ **Spoiler fences fire where the prompt says not to.** 8/41 low-story-title asks, 21/53
  named-entity asks in the raw model output (§ 2.3). Already a PARTIAL roadmap bug for the
  *where*; this is the first count of *how often*.
- ❌ **9 of 122 Strategy first turns came back with no branch menu** (the model skipped the
  mandatory fence), so those users got no picker.
- ❌ **The Deck corpus is 28 cards behind the source file** (`2026.08.22` = 133; seed = 161).
- ❌ **The D38 weight sweep has no tooling.** `scripts/eval_kb_embed_models.py` has no way to
  vary `RRF_W_FTS` / `RRF_W_VEC`; the sweep D38 lists as groundwork item 2 has never run.
- ❌ **No end-to-end answer test exists.** `eval_kb_embed_models.py` measures which cards are
  found; nothing measures what the model writes from them. The only data point is
  `PHASE4-CARDS-01` (labels kept 1 of 6, bullets 4 of 6, content accurate 6 of 6).
- ❌ **Chat history never reaches the model.** `ollama_ask_service.py:170` builds
  `[system, user]` only; the follow-up chips paste the parent turn into the user message, and a
  typed follow-up gets nothing.

### Found 2026-09-02, from the first answer-test run (W1)

- ❌ **Spoiler fences misfire on 28 of 96 samples where none was due** (PC, Deck's model, 37 cases
  × 3 samples, corpus `2026.09.01`). Nine cases fence *every* sample: Left 4 Dead 2 Tank and Witch
  (a low-narrative title, where the prompt never asks for fences), Half-Life 2 antlions, Hades
  Theseus and Asterius, Fallout 4 deathclaw and legendary enemies, Red Dead "coming from GTA", and
  both Ocarina cases. What gets fenced is a harmless opening line — *"This guide focuses on general
  tactics against the Tank."* — not a spoiler. The other checks are healthy: facts from the cards
  survive **90.9%** (90/99), no contradictions (9/9), branch menu **97.0%** (64/66), fence present
  when due 9/9, expected card attached 99/99. So the fence is the largest answer-side defect and it
  is now a number the W4/W6 prompt work can move.
  [archive/research/kb-answer-eval-2026-09-02-baseline.md](../../../bonsAI-workshop/archive/research/kb-answer-eval-2026-09-02-baseline.md).
- ❌ **Pressing *Update knowledge base* on the Deck through the bridge started no download.** The
  focus ring was read on the button (visible, y=640) and A was pressed at 05:10Z; ten minutes
  later the SD-card manifest and `settings.json` still read `2026.08.22` and the plugin log has no
  download line. Either the press never reached the handler, or the manifest fetch failed and the
  *Update failed* toast was missed (the poll watched the panel, not the toast layer). **Narrowed
  the same day:** the identical fetch-and-install code ran cleanly from the Deck over SSH
  (Hugging Face reachable, checksum verified), so the network is not the cause — the suspect is
  the button itself (`Focusable onOKButton` on the Update row). Still needs one thumb press with
  eyes on the toast to settle; the corpus itself is installed (W2b). **Settled 2026-09-03: the
  button works** — a bridge press with the ring verified on it raised *Already up to date — Version
  2026.09.01 is the latest* within half a second. The 09-02 press stays unexplained; treat it as
  the one-driver lesson (§ 6 item 8), not as a button bug.
- ❌ **`deck_captureScreenshot` is broken on this PC** — DPS cannot find its capture scripts
  directory — so the Update press could not be checked visually. A DPS install problem, not bonsAI.
- ℹ️ Two things the run showed that are not bugs: an uncovered game (Elden Ring) in Strategy mode
  attaches a genre fallback card (*Soulslike basics*, trust `fallback_no_source`) by design, and the
  model wrapped that whole answer in a spoiler fence; and for State of Emergency *"how do i get more
  time in a round"* the right card was first all three times, yet the reply never mentioned the
  +15 s pickups — it paraphrased the vaguer Kaos-mode card beside it instead.

### Work items (decisions in brackets; D53 / D54 answered 2026-09-05 as D65 / D66)

- ✅ **W1** Answer test harness shipped 2026-09-02: `scripts/eval_kb_answers.py` +
  `tests/fixtures/kb_answer_eval.json` (37 cases), runs the real Ask pipeline on the PC with
  `gemma4:e2b-it-qat`. Baseline taken (§ 4.1): facts 90.9%, fence-not-misfired 70.8%, menu 97.0%,
  card attached 100%, 1.4 s per answer, 2.6 min per run. Row **KB-ANSWER-01**. *(D45)*
- ✅ **W2a** Corpus point release **`2026.09.01`** published 2026-09-01 (161 cards, 124 tips, 899,835 bytes,
  sha `daf4d9f0…`), verified served by both Hugging Face and the GitHub release (D49).
- ✅ **W2b** `2026.09.01` installed on the Deck **over SSH, 2026-09-02 12:35Z** (maintainer's call, § 6
  item 8): fetched the manifest from Hugging Face, installed into a side folder, verified the
  decompressed `corpus.db` against the manifest's `db_sha256` (161 sections, 1,417,216 bytes), swapped
  the three files into `/run/media/…/.bonsai/rag` atomically, set `rag_corpus_version` in
  `settings.json`. The plugin process held no open handle on the old file (checked `/proc/<pid>/fd`),
  so its next knowledge-base access opens the new one. The bridge press on *Update knowledge base*
  had started no download (bug list above); the same download path worked from the Deck over SSH,
  so the network is not the reason.
- ✅ **W12a** Five confirmed sentences pinned as frozen test chips 2026-09-02 (**KB-ANSWER-02**), appended
  after the five chips another session already had in the batch (ten in rotation, the cap is twelve).
- ✅ **W12b** **KB-ANSWER-02 run on the Deck 2026-09-03: 5 of 5 as expected** — four named-boss / no-story
  questions with no spoiler fence and the branch menu, the Red Dead ending question with one collapsed
  spoiler box. Deck-local model, character voice on, 20–25 s per answer. Details in testing.md; two
  content slips and the chip-row rotation limit are in § 6.
- ✅ **W3** Prompt budget guard shipped 2026-09-03 *(D46)*: attached Proton logs capped at **4 KiB**
  (`TOTAL_LOG_BUDGET_BYTES`; the collector still scans 96 KiB, `RAW_READ_BUDGET_BYTES`, filters to
  error-ish lines and keeps the newest), the follow-up chip's pasted parent answer capped at
  **1,500 characters** (`REPLY_FOLLOWUP_PARENT_ANSWER_MAX_CHARS`), and `prompt_window_warning` logs
  a warning at the POST site whenever prompt + `num_predict` exceeds the assumed 4,096-token window
  (`ASSUMED_CONTEXT_WINDOW_TOKENS`). Why 4 KiB and not the 6–8 KiB first guessed: a Speed
  troubleshooting Ask on the Deck already carries ~1,700 prompt tokens plus an 800-token reply
  budget plus up to 2 KiB of tips, leaving ~1,000 tokens, and log lines run ~3 characters per token.
  Three unit tests. `num_ctx` stays unset (a separate, measured call).
- ✅ **W4a** Fence misfire fix shipped in code 2026-09-02, gated by W1: on low-narrative and
  named-entity turns the two fence-format sentences become one plain "do not fence" line
  (`_strategy_spoiler_policy_block`, three new unit tests). Misfires **28/96 → 3/96 and 5/96** in
  two runs, ending questions still fenced 8/9, facts and menu unchanged or better (§ 4.1). Re-run on
  the shipped text: **91/96 not misfired, 9/9 fenced when due**, facts 91.9%, menu 98.5%
  (`kb-answer-eval-2026-09-02-shipped-fence-fix.md`). The five left are the story-title arm the fix
  deliberately does not touch (Fallout 4 *legendary enemy* has no extractable entity). Deck feel
  run owed as **KB-ANSWER-02**, after W2b.
- ⬜ **W4b** Prompt diet: drop the citation fence instruction; skip screenshot rules when no image
  is attached; move the card block to just before the question. Measured with W1 before/after.
- ⬜ **W5** "Not in my notes" line when a game ask attaches no card (§ 4.4). *(D48)*
- ⬜ **W6** Spoiler tiers setting + prompt wording per tier (§ 4.5). *(D50)*
- ⬜ **W7** Follow-up memory: last turn(s) to the model and/or carry the previous entity into
  retrieval (§ 4.6). *(D47)*
- ⬜ **W8** Eval tooling: weight sweep flag, per-case output for `rrf`, multi-answer rows
  (D38 item 2, D41 step 1, D40). *(D51)*
- ⬜ **W9** Symptom-only troubleshooting reach (§ 4.8). *(D52)*
- ⬜ **W10** Section type for "starting out" / comparison cards, then author the Cyberpunk /
  Fallout / Red Dead ones the gap sheet asked for. *(D53 → D65: their own kind, 2026-09-05)*
- ⬜ **W11** Card style pass for small models: convert prose cards to labelled short lines
  (22 of 161 are labelled today). *After W1 shows it helps.*
- ⬜ **W12** On-Deck QA rows owed for shipped KB work (§ 5, "Verify" rows), pinned as frozen
  test chips once the sentences are confirmed with you.
- ⬜ **W13** Roadmap and testing.md updates for each item above, in the same change set.

---

## 1. What the KB does today, in one page

**Search.** `retrieve_knowledge_context` (`knowledge_base_service.py:1321`) resolves the game
(AppID → alias table → a title named in the question, D19), runs a keyword search scoped to that
game with a relevance floor, runs a separate "meaning" search over that game's cards when the ask
is explicitly about the game (Strategy or Expert mode), rescues cards by *kind* when the question
says "the boss" (D25), and fuses the lists with equal weights (`RRF_W_FTS = RRF_W_VEC = 1.0`,
locked 2026-08-09 — D38 is about whether that lock should move). Troubleshooting asks go to the
shared tip sheet instead, routed by topic words (D16) with the routed topic as a preference (D22).

**Budget.** Speed 1 card / 2 KB, Strategy 3 / 6 KB, Expert 5 / 10 KB
(`knowledge_base_service.py:305-316`). Cards average 303 characters, the longest is 714, so the
byte caps never bite today.

**Prompt.** The cards are rendered as a block (`--- Local knowledge base … ---`) and spliced into
the system prompt *before* the mode instructions (`ollama_prompts.py:1179-1206`). The model gets
exactly two messages: that system prompt and the user's question (`ollama_ask_service.py:170`).
Follow-up chips paste the parent question and answer into the user message
(`ollama_prompts.py:1432-1445`); a Strategy branch pick sends `[Strategy follow-up] …`.

**What the user sees.** The reply, plus under *Show details* a chip saying which search ran
(*Keyword + meaning* / *Keyword search*), the trust tier, wiki credits, and a coverage chip
(*KB: 9 sections* / *KB: none for this game*). Nothing in the reply body itself says whether a
card was used.

**Measurement.** `tests/fixtures/kb_eval_v2.json`: 341 questions, 260 labelled (168 tune, 92
holdout; 289 strategy, 52 troubleshooting). Run with
`python scripts/eval_kb_embed_models.py --arms-only`. Holdout is the ship gate and must not be
tuned against (R1). Every number series restarts when rows are added (R4).

## 2. Where we are, with numbers

### 2.1 Search quality — latest run (2026-08-31c, 161 cards)

| Split | keyword | meaning only | shipping blend |
|---|---|---|---|
| tune (168), first place / top-3 | 63.1 / 81.0 | 70.8 / 91.1 | **66.1 / 89.9** |
| holdout (92), first place / top-3 | 48.9 / 70.7 | **63.0 / 82.6** | 54.3 / 78.3 |

Read: on honest questions the blend is beaten by its own meaning half by ~9 points of first
place. D38 (deferred by you). Do not change weights until it is answered.

Every card batch since 2026-08-29 cost a point or so of first place and almost nothing of top-3.
Five of the seven "regressions" on 08-31 were the fixture allowing one right answer where two
cards are fair (D40). One was real and self-inflicted: the new Cyberpunk *Choosing a build* card
absorbed the word *build* and pushed *Berserk* out of the top three for *"which implant suits a
melee build"* (`kb-card-name-collisions-2026-08-31.md`).

### 2.2 The Deck, measured 2026-09-01

| | |
|---|---|
| Ollama | `0.32.15`, env: `OLLAMA_VULKAN=1 OLLAMA_NUM_PARALLEL=1 OLLAMA_MAX_LOADED_MODELS=1 OLLAMA_FLASH_ATTENTION=0 OLLAMA_IGPU_ENABLE=1` |
| Loaded model | `gemma4:e2b-it-qat`, Q4_0, 1.66 GB in VRAM, **`context_length: 4096`** (from `/api/ps`) |
| Corpus installed | `2026.08.22`, 133 cards with vectors, on the SD card |
| Last six asks | prompt 1808–1954 tokens, reply 154–430 tokens, all `done_reason=stop` |

### 2.3 The 161 recorded asks (Deck ask trace, `~/Desktop/bonsAI_logs/`)

| What was counted | Result |
|---|---|
| Largest prompt seen (system + user) | ~2,600 tokens (estimate, chars ÷ 3.8) — none over 4,096 |
| Asks with Proton logs attached | **0** — the overflow path has not been exercised on this Deck |
| Strategy first turns → branch fence present | **113 of 122** (93%) |
| KB-block asks → citation fence present | **1 of 89** (1%) |
| Low-story-title asks → spoiler fence fired anyway | **8 of 41** (20%) |
| Named-entity asks → spoiler fence fired anyway | **21 of 53** (40%; display unwrap hides these) |
| Status line present | 153 of 161 (95%) |
| Reply length | avg ~930 chars, max ~3,400 chars (~900 tokens) |

Caveat: these are raw model outputs; the frontend unwraps named-entity fences and drops
malformed checklists, so the user-visible rates are lower for those two rows.

### 2.4 Prompt anatomy

Strategy first turn, three short cards, built locally from `build_system_prompt`:

| Piece | Approx. tokens |
|---|---|
| Game line + screenshot/vision rules + SoH rule (always sent, even with no image) | ~230 |
| Identity, general-purpose clause, status-line rules | ~330 |
| Glossary clause (DRG only) | ~60 |
| **The three cards** | **~200** |
| KB instruction incl. citation fence + structured-cards clause | ~110 |
| Strategy mode: spoiler policy, coach rules, branch fence spec, TDP clause | ~900 |
| Total | ~1,985 (device measured 1,808–1,954) |

The model reads roughly **nine tokens of instruction for every token of knowledge**.

## 3. Questions for you (the decisions that change the work)

Each has my recommendation. **Answered 2026-09-01:** Q1–Q8 are locked as **D45–D52** in
`docs/audit/maintainer-decisions-locked.md`; Q9 and Q10 were open as **D53 / D54** until 2026-09-05, now **D65 / D66** (the maintainer had asked
for more explanation — § 3b).

**Q1 — What counts as a "better answer", and does a PC run count as evidence?**
I propose four checks that need no judge: (a) the reply contains the card's key facts (a short
list of must-mention terms per question, like the fixture's `withheld_card_terms`); (b) it
contradicts nothing on the card (a short list of must-not-say claims); (c) spoiler fence only
where the rules allow; (d) the branch menu is present on a first turn. Run on the PC with the same
`gemma4:e2b-it-qat` tag, temperature as shipped, ~30 questions drawn from the existing fixture
(so nobody writes new cards *and* new questions in the same session). **Recommendation:** yes,
build it; treat PC numbers as the regression gate and keep the on-Deck run for feel. The trade:
it costs one Ollama round trip per question (~30 s a run on the PC), and a term-overlap check can
be gamed by a model that parrots the card — so (b) matters as much as (a).

**Q2 — The 4,096-token window: budget the prompt, raise the window, or both?**
*Budget* (cap Proton logs to ~6 KB of the most recent, cap the pasted parent answer at ~1,500
characters, warn in the log when a prompt would not fit) is free and mechanical. *Raising* the
window to 8,192 by sending `num_ctx` costs KV-cache memory on a shared APU while a game runs —
UNKNOWN how much for this model until measured. **Recommendation:** budget now; try 8,192 as a
measured experiment (VRAM and time-to-first-token with DRG Survivor running) before it becomes a
setting.

**Q3 — Should follow-ups remember?**
Options: (a) send the last one or two turns as chat history (costs window; a Strategy reply is
up to ~900 tokens); (b) carry only the previous turn's *asked entity* into retrieval, so "and the
second phase?" still searches "Dreadnought Twins"; (c) both; (d) leave it — the chips already
paste the parent turn. **Recommendation:** (b) first, it is cheap and needs no window; (a) only
after Q2 settles how much room there is.

**Q4 — When no card matches on a game question, should the reply say so?**
Today the reply looks the same whether it came from your notes or from the model's memory; only
*Show details* knows. The May note on your Deck desktop (`bonsai-debug-wronginfo.md`) is what a
small model does with no notes: confident, wrong, and tidy. **Recommendation:** append one muted
plain line, built by code not by the model (same mechanism as the destructive-advice notice), e.g.
*"No bonsAI notes matched this question for Deep Rock Galactic: Survivor — this is general
knowledge."* Only on explicit game asks (Strategy / Expert), never on troubleshooting. Risk: it is
one more line in a 300 px column.

**Q5 — Publish the 161-card corpus now?**
It is a release action on Hugging Face and GitHub, so I will not do it without a yes. Same
schema (3), so the Deck updates in place. **Recommendation:** yes, before any on-Deck answer
testing, otherwise the device tests the wrong corpus (the 08-21 handoff's lesson).

**Q6 — Spoiler tiers: build it now, and confirm the tiers.**
Your proposal (gap sheet, 08-29): *strict* (no bosses / endings / chapters), *default* (fence
only named story beats and endings), *open* (anything the user asks about). Needs a Settings
control (focus-graph entry), a value the spoiler service reads, and prompt wording per tier.
**Recommendation:** build it after W1 exists, so the wording per tier is measured on the 8/41
misfire set rather than eyeballed. Confirm: default tier = "named story beats and endings", and
the strict tier keeps the named-entity unwrap (you asked about it, you get it)?

**Q7 — D40: how should the fixture handle two fair answers?**
Options in the decisions file. **Recommendation:** option 1 (a row may list up to two acceptable
cards) for tune and *unread* holdout rows, with a rule that a row may name a second card only
with a written reason; retire `V2-S-SOE-07` (no card can answer it, as you said); leave
`V2-S-SOE-09` alone. Option 4 (split ambiguous rows into two sharper questions) for the handful
of cases where it is obvious.

**Q8 — Symptom-only troubleshooting questions.**
*"the game drops me back to the library a few minutes in"* never reaches the tip sheet because it
does not say *crash*. Options: (a) add symptom phrases to the router per topic ("drops me back",
"closes itself", "doesn't see my buttons") — cheap, but a list that is never finished; (b) let
the meaning search run on the tip sheet when no topic routes — it was measured and removed on
08-18 because it cost a case, but that was *with* a routed topic; (c) accept the miss.
**Recommendation:** (b), gated to the no-topic case only, measured on the 17 holdout compat rows.

**Q9 — "Starting out" and comparison cards: new kind or `mechanic`?**
Three exist as `mechanic` (*Choosing a build* ×2, *Weapon choice*, *Coming from GTA*). A new kind
(say `guide`) changes the schema and the chip wording (*"How do I start in X?"* is better than
*"What should I know about Choosing a build?"*); staying `mechanic` costs nothing.
**Recommendation:** new kind, because the chip wording is the user-facing half and the
one-kind-at-a-time chip pool would then surface exactly one of these per game.

**Q10 — Strategy first turn: answer first, then the menu?**
Today *"how do i beat the twins"* gets an orientation and a menu before tactics, by design. With
a card hit on a named thing, the small model could give the tactic straight away and *still* end
with the menu. This is a product-feel call, not a bug. **Recommendation:** try it only if W1 shows
the current shape loses the card's facts; otherwise leave it.

### 3b. Q9 and Q10, explained further (2026-09-01)

**Q9 — a new card kind for "starting out" / comparison cards (D53).** Every card has a *kind*
(`section_type`): boss, enemy, item, area, mechanic, quest, dungeon. The kind is used in three
places a user can see or feel: (1) the **chip wording** on the Main tab — an enemy card becomes
*"How do I deal with X?"*, an item *"How do I use X?"*, and anything else *"What should I know
about X?"*; (2) the **chip pool draws one kind at a time**, so a game with six enemy cards and one
mechanic card still shows a mix; (3) **"the boss" / "this level" rescue** — a question that names
a kind pulls that game's cards of that kind into the search. The three comparison cards are filed
as `mechanic` today, so they surface as *"What should I know about Choosing a build?"*, which is
an odd thing to offer a new player, and they compete with every other mechanic card for the one
mechanic chip slot. A new kind (working name `guide`) would let the chip say *"How do I get
started in Fallout 4?"* / *"Which weapon should I start with in Hades?"*, would guarantee one such
chip per game that has one, and would let *"where do I start"* questions rescue the guide card
the way *"the boss"* rescues a boss card. **Cost:** a value added to the allowed kinds in the
seed validator and the Python/TS kind lists, one chip template, one rescue phrase list, and a
corpus rebuild — no schema-version bump, because the column is free text. **Risk:** a fourth
wording to keep under 300 px. **If left as `mechanic`:** nothing to do, and the cards keep being
found by keyword and meaning search exactly as now; only the chips and the rescue miss out.

**Q10 — tactic first, then the menu (D54).** A Strategy first turn today is told: give a short
orientation, do **not** reveal much, and end with a menu of 2–8 "where are you stuck?" buttons.
That shape is right when the question is vague (*"I'm stuck in the water temple"*). It is wrong
when the question already names the thing and a card matched (*"how do I beat the twins"* with the
*Dreadnought Twins* card attached): the player asked a direct question and gets a menu instead of
the answer, and the small model spends its best tokens on the orientation. The proposal is a
narrow rule: **when the asked entity is known and a card for it attached, answer it directly
first (bullets from the card), then still end with the menu** so the branch picker never
disappears. Nothing changes on vague first turns or on follow-ups. **Cost:** one conditional
paragraph in the Strategy prompt, keyed off the same `asked_entity` + `kb_entity_match` signals
the spoiler policy already uses, and a D45 before/after run. **Risk:** with a 2B model, adding a
condition sometimes makes *both* behaviours worse; that is exactly what the answer test exists to
catch, which is why the plan says try it only after D45's harness shows the current shape loses
the card's facts.

## 4. The work, in more detail

### 4.1 W1 — Answer test harness (the instrument everything else needs)

**Shipped 2026-09-02.** What was built differs from the sketch above in one useful way: instead of
re-assembling the prompt from pieces, the harness loads the real `Plugin` class from `main.py`
(with a stub `decky` module, the same trick the Python tests use) and calls the real
`run_game_ai_request`, so retrieval, stacking, the spoiler signals, the prompt, the Ollama call
with soft-continue, the branch parser and the safety guard are all the shipped code. Anything it
measures is what the Deck does, apart from the GPU.

- `scripts/eval_kb_answers.py` — `--samples 3` by default (the shipped temperature is stochastic,
  so it reports rates), `--only id,id`, `--label name` for before/after pairs, `--variant` as the
  hook for prompt experiments (W4, W6, D54), `--model` / `--ollama` / `--corpus`.
- `tests/fixtures/kb_answer_eval.json` — 37 cases over all 13 corpus titles plus one uncovered game:
  22 Strategy, 8 Expert, 7 Speed; three story-beat questions that *should* fence; two comparison
  cards; two EmuDeck titles resolved by name. Must-mention terms are copied from the cards.
  Synonym calibration after a run is allowed and dated in the case note; nothing else is.
- Output: `workshop:archive/research/kb-answer-eval-<date>-<label>.md` (summary, per-case table,
  failures, one reply per case) and `build/kb-answer-eval/<same>.json` (every reply, every check,
  the first sample's full system prompt, `payload_bytes`, `prompt_eval`).
- Cost: **1.4 s per answer** on the maintainer PC, **2.6 minutes** for the whole fixture. Cheap
  enough to run before and after every prompt edit.

**Baseline (2026-09-02, corpus `2026.09.01`, prompt as shipped):**

| Check | Rate |
|---|---|
| Facts from the card kept | 90.9% (90/99) |
| Nothing the card contradicts | 100% (9/9) |
| No spoiler fence where none was due | **70.8% (68/96)** |
| Fence present on a story-beat question | 100% (9/9) |
| Branch menu on a Strategy first turn | 97.0% (64/66) |
| No menu on Speed / Expert | 100% (45/45) |
| Expected card attached | 100% (99/99) |
| Cases clean on all three samples | 56.8% (21/37) |

Mean prompt: 1,539 tokens (Ollama `prompt_eval`), 7.2 KB payload. The fence row is the one to
move; everything else is already close to the ceiling, which is itself a finding — the cards are
reaching the reply, and the model is keeping them straight.

**First experiments, same day** (each run twice, independently, by accident of a double launch —
which turned out to be useful, because it shows the run-to-run noise):

| Prompt | Fence not misfired | Fence when due | Facts | Menu |
|---|---|---|---|---|
| Shipped (baseline) | 70.8% (68/96) | 9/9 | 90.9% | 97.0% |
| Drop only the placement sentence, run 1 | 100% | **0/9** | 88.9% | 100% |
| Drop only the placement sentence, run 2 | 100% | **0/9** | 91.9% | 100% |
| Replace both fence sentences with a plain "do not fence" line, run 1 | 94.8% | 8/9 | 93.9% | 100% |
| Replace both fence sentences with a plain "do not fence" line, run 2 | **96.9%** (93/96) | 8/9 | 93.9% | 97.0% |
| **Shipped after the fix** (`_strategy_spoiler_policy_block`, re-measured) | **94.8%** (91/96) | **9/9** | 91.9% | 98.5% |

What it says: the sentence *"every ```bonsai-spoiler block must appear above the branch fence"*
is what makes the model fence at all — remove it and no reply fences, not even the ending
questions. Replacing both fence-format sentences with one plain line on low-narrative and
named-entity turns, and leaving story-title turns with nothing named untouched, keeps the
protection where it is due and removes the misfire where it is not. The remaining misfires are
Fallout 4 *"a legendary enemy healed back to full"* (no entity extracted, so the turn stays on the
story-title arm) and one Cyberpunk attributes sample. **The second variant now ships**
(`_strategy_spoiler_policy_block`), with three unit tests pinning the three arms, and a re-run on
the shipped text is recorded in the checklist. Run-to-run noise on this fixture is about two
points on any rate, so a change under five points is not a finding.

### 4.2 W3 — Prompt budget guard

- `proton_troubleshooting_logs.py:18` `TOTAL_LOG_BUDGET_BYTES` 96 KiB → a value that fits the
  window with room for cards and a reply (~6–8 KB), keeping the *end* of the logs (already what
  `_maybe_filter_and_truncate` does).
- `build_reply_followup_context_block`: cap the pasted parent answer.
- `ollama_service.py`: estimate prompt tokens before the POST (chars ÷ 3.5) and log a warning
  when estimate + `num_predict` exceeds the window; the log line is the evidence the QA row reads.
- Optional experiment: `options.num_ctx` from a Developer toggle, measured on device.

### 4.3 W4 — Prompt diet

- Remove the citation-fence sentence (dead: 1/89, unrendered).
- Send the screenshot/vision rules only when an image is attached (~230 tokens saved per ask).
- Move the KB block after the mode instructions, immediately before the question, or into the
  user message as *"Notes from the knowledge base:"* — small models weight the end of the prompt
  more. Measure both placements with W1.
- Keep `STRUCTURED CARDS` (conditional already) and the glossary clause (DRG only).
- Tests in `tests/test_ollama_service.py` assert layer order; they change with this and must be
  re-aimed at behaviour, not shape (repo rule 6).

### 4.4 W5 — "Not in my notes" line

Code-built notice appended after the reply on explicit game asks with `kb_attached=False` and
coverage status `sections` (the corpus knows the game but nothing matched). Not shown when the KB
is off or the game is uncovered (the coverage chip already says that). Needs a focus-graph check
if it is a stop.

### 4.5 W6 — Spoiler tiers

Setting `strategy_spoiler_tier` (strict / default / open) → `settings_service.py` +
`bonsaiSettingsNormalizers.ts` (~18 files, ~30 edit points per CLAUDE.md — budget for it) →
`spoiler_risk_service.py` / `ollama_prompts.py` wording per tier → Settings control with a
focus-graph entry. QA row per tier on a story title (Hades) and a low-story title (DRG).

### 4.6 W7 — Follow-up memory

(b) from Q3: when the new question has no entity and no card hit, retrieve with
`question + previous asked entity` and note it in transparency (`notes="carried_entity:…"`).
(a) if chosen: last N turns as `messages`, trimmed to fit the Q2 budget.

### 4.7 W8 — Eval tooling

- `--w-fts` / `--w-vec` sweep on `tune` only, report per pair; never print holdout in a sweep run.
- Per-case JSON for every arm, not just keyword (D41 step 1 needs the `rrf` column).
- `expect_section` may be a list (D40 option 1) with a required `note` explaining the second card.

### 4.8 W9 — Symptom-only reach

Per Q8: when `match_compat_corpus_topics` returns nothing and the phrase gate did not fire,
allow a meaning-search pass over the tip sheet with the second-signal gate, measured on the 17
holdout compat rows first.

### 4.9 W10 / W11 — Content

- W10: kind for orientation/comparison cards, then the three gap-sheet asks (Cyberpunk and
  Fallout 4 builds / early game — one exists each, both hand-written and thin; Red Dead *Coming
  from GTA* exists).
- W11: the 2B model kept content accurate on all six labelled cards in `PHASE4-CARDS-01`. A
  style pass turning the 139 prose cards into `Summary: / Tips:` lines is a corpus rebuild and a
  release, so it comes after W1 shows the labelled shape actually scores better.

## 5. Roadmap items, where each stands

| Item (roadmap lane) | Status today | What moves it |
|---|---|---|
| Spoiler tiers setting (Backlog ★★★) | Proposed 08-29, nothing built | Q6 → W6 |
| "Starting out" card shape (Backlog ★★★) | Three cards exist as `mechanic`; kind undecided | Q9 → W10 |
| DRG glossary (Backlog ★★★) | Shipped; one touch tap + explain-further send owed on device | W12 |
| Eval paraphrase rows (Backlog ★★) | Largely overtaken by 107 blind rows; keyword-blind slice now 4 rows (was 1) | Close after next arms run confirms the count |
| KB visual maps (★★★) | Parked | Nothing yet |
| Online / versus content (★★★★) | Plan 17 only | Nothing yet |
| Phase 5 corpus depth (★★★★) | In progress: 133 → 161 (10 re-types, SoE ×6, HL2 split, Hades weapons, 14 entity/comparison cards) | W2 release, W10, W11 |
| Phase 4 track 3 per-game tips (★★★★) | Blocked on schema v4; content for 7 titles collected 08-29 | A v4 corpus release; retrieval side already built |
| Phase 7 infra (★★★★) | Meaning fallback shipped 08-18; rest docs | W8 partly |
| Community tips (★★★★★) | Unblocked since Phase 6; not started | Nothing yet |
| Phase 8 catalog (★★★★★★) | Intent only | Nothing |
| **Bug** D38 blend loses on holdout (★★★★) | Deferred by you; groundwork item 1 done, item 2 has no tooling | W8 sweep |
| **Bug** arms verdict compares one pair (★) | Open | Small fix inside W8 |
| **Bug** chip label overflow, no truncation (★★★) | Confirmed on device 08-29 | Preset-row work (not KB code) |
| **Bug** chip rotation biased to top of list (★) | Open | One-line shuffle in `sessionRagComposer.ts` |
| **Bug** symptom-only troubleshooting misses (★★) | Maintainer call filed 08-28 | Q8 → W9 |
| **Bug** unrelated questions attach cards (★★) | PARTIAL, accepted 08-27 | Leave |
| **Bug** spoiler fence lands mid-reply (★★) | PARTIAL; now measured 8/41 and 21/53 | W6 + W4, checked by W1 |
| **Verify** KB-ASKMODE-01 re-run, KB-RECALL-01, KB-EXPERT-01, KB-COVERAGE-01 negatives, KB-FLOOR-01, KB-FOLLOWUP-01, KB-TRANSPARENCY-01, KB-ROUTER-01, KB-KILLSWITCH-01, KB-VARIANT-01 | Open on device | W12, after W2 so the device holds the current corpus |
| **Verify** PHASE4-CARDS-01 | Testing complete; maintainer call owed (labels 1/6 with the 2B model) | W1 turns the call into a measured choice |
| **Verify** PHASE4-CHIPS-01 clipping | Failed 08-29 (379.8 px in a 300 px slot) | Preset-row work |

## 6. Things to bring to your attention

1. **Silent truncation is one permission away.** With *Read game & screenshot context* on and a
   question that matches the Proton phrase gate, the prompt can be ~25,000 tokens against a
   4,096 window. The AI would then answer with its identity, rules and game line cut off. None
   of your 161 recorded asks took that path, which is why nobody has seen it.
2. **The citation fence instruction is dead** and the UI cannot render the fence. Removing it is
   a pure win; I will do it under W4 unless you object.
3. **Your Deck has never seen the 28 newest cards.** Every on-Deck KB row since 08-29 was run
   against the 133-card corpus.
4. **Spoiler misfires now have a rate** (20% on low-story titles in raw output). The tiers
   setting will not fix that by itself; the prompt wording needs the W1 loop.
5. **The one-line preset row bug** (three chips side by side, filed 08-31) is not KB code, but
   the KB chips live in it and PHASE4-CHIPS-01's clipping direction is stuck behind it.
6. **Every card batch will keep lowering first-place scores** until D40 is settled. That is the
   fixture, not the corpus.
7. **Whoever writes a card cannot write its blind question.** W10/W11 authoring should be done in
   a different session from any new eval rows, as the 08-29 plan already says.
8. **The Deck cannot safely be driven by two chats at once, and the corpus install is still
   owed.** (2026-09-02) The bridge registers CDP *reads* as tunnels but a button press leaves no
   trace, so "zero tunnels" only means nobody is looking. My window was: check the registry
   (empty), open the panel, walk to *Update knowledge base*, verify the ring on it, press A — and
   nothing downloaded; five minutes later another session launched Half-Life 2 and opened its
   tunnel. Two ways to finish W2b, your call: **(a)** you press *Update knowledge base* yourself
   (Where AI runs tab → Knowledge base) and tell me what the toast said — thirty seconds, and it
   also tells us whether the button works; or **(b)** I install over SSH with no UI at all
   (`fetch_remote_manifest` + `install_corpus_from_manifest` into the SD-card path, then set
   `rag_corpus_version` in `settings.json`), which the plugin picks up on its next Ask because it
   reads settings from disk every time. For any future Deck window I will say which minutes I need
   and ask you to hold the other chats first. **Done 2026-09-02/03: you chose (b); installed over
   SSH, verified, and the UI label reads 2026.09.01. The Update button itself was re-tested on
   2026-09-03 with the Deck held for me and works.**
9. **The fence misfire is fixed in code, measured, and waiting for one Deck run.** The cheap
   experiment worked (§ 4.1 table): misfires 28/96 → 3/96 and 5/96 in two runs, ending questions
   still fenced. It ships in `_strategy_spoiler_policy_block` with unit tests. What it needs from
   you: the corpus install (item 8) and then a yes on the five frozen-chip sentences in
   **KB-ANSWER-02** (testing.md), which I will pin only after you confirm them. W4b (prompt diet)
   and W6 (tiers) follow the same gate. **Done 2026-09-03: confirmed on the Deck, 5 of 5.**
10. **Your Deck answers with a character voice on (*Ali G*), and the PC harness measures with it off.**
    On the five Deck runs the voice cost two facts: the Tank reply turned *a punch near a drop kills
    you* into *kills him*, and the Volvagia reply never named the Megaton Hammer. The other three kept
    their cards straight. Prompt size on the Deck was 1,880–2,074 tokens against the PC's 1,539 mean —
    the character block is the difference. Worth a harness switch (`--character <preset>`) so the
    numbers reflect what you actually ship yourself; cheap to add, and it would make the character
    presets measurable the same way the prompt is.
11. **A ten-chip frozen batch is only half reachable by thumb.** The chip row stops walking the batch
    60 s after the panel opens and an Ask does not restart it, so chips 6–10 never appeared; four of the
    five sentences went in through the typing script instead. Filed on the roadmap (★). Until it is
    fixed, keep a pinned batch to five or reopen the panel to advance it.

## 7. Testing on the Deck — how the rows will be run

Per the standing instruction: for every on-Deck row, I will show you the exact sentences first,
get them confirmed, and only then pin them as a frozen test chip batch (3–12 entries) — A on a
chip fills the Ask field without submitting. First batch, once W2 is on the device: the six
`PHASE4-CARDS-01` questions plus *"how do i beat the boss"* (KB-TYPE) and one symptom-only
troubleshooting sentence, so W1's PC numbers and the device can be compared on the same words.

## 8. Not in scope here

Preset-row layout (three chips side by side), Terse mode, the reasoning display, model routing
changes, new titles (Phase 8), and anything that tunes against the holdout split.
