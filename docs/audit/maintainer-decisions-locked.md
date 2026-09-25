# Maintainer decisions locked (refactor / handoff)

> **Settled decisions before D90 were split out on 2026-09-24 (plan 65).** They now live, word for word, in [maintainer-decisions-archive.md](maintainer-decisions-archive.md). This file keeps D90 onward, plus any decision that is still open, deferred, or only partly answered, whatever its number.

> **Moved from** [roadmap.md](../roadmap.md) **2026-08-04.** Full decision record for D1–D15, execution order, and cleanup candidates. Active index: [roadmap.md](../roadmap.md). Reorg commit: `ba2e5c5` (`git show ba2e5c5`).

Evidence lives in this audit folder — especially [05-plan.md](../archive/05-plan.md).

---

## Decisions needed

Open questions that need a maintainer call before the work can continue. Written
in plain language on purpose — each one says what the situation is, what your
choices are, and what happens either way. **Locked calls (2026-08-02 for D1–D6,
2026-08-03 for D7–D10)** are in
[Maintainer decisions locked](maintainer-decisions-archive.md#maintainer-decisions-locked--2026-08-02); implement
from that section when it disagrees with an option above.

**One deferred (D38, now being acted on through D68).** D53 and D54 were answered 2026-09-05 as D65 and D66; D67 closed the structured-cards call; D68 and D69 were locked the same day (D69 waits on a library read for its title list). **D45–D52 were locked 2026-09-01** from the knowledge-base answer-quality plan ([planning/30-kb-answer-quality-plan.md](../planning/30-kb-answer-quality-plan.md)); **D53 and D54 are open** pending an explanation the maintainer asked for. The eval "D40" of 2026-08-31 is **D40b** from 2026-09-01 (resolved by D51). **D38** — the fusion weights, raised 2026-08-29 by D37's
first measurement — is **deferred at the maintainer's request** pending more data, more games and
more questions; it is not waiting on a decision today and nothing about the weights changes until it
is. **D37**, the blind holdout rows, was endorsed and locked
2026-08-29, and the measurement it was gating was run the same day (see D37 for the numbers and the
two findings that came out of them). **D39 and D40 are locked 2026-08-29 as well** — D39 by the
corpus gap sheet, and **D40** in discovery for **Terse mode**, before a line of code for it exists.
Before that, D18 — raised 2026-08-05 by the step 11 friction test — was locked as
option A on 2026-08-27 and implemented the same day.
**D32, D34 and D35 are all locked and implemented** (2026-08-27) — three separate causes of the one
*Clear cache* bug, which is now fixed and confirmed on device. **D33 is locked and implemented**
(2026-08-27, option C at 26px); it still owes a look on the Deck, which is what the maintainer asked
for. **D23–D27 were raised and locked during the RAG
work of 2026-08-18 to 2026-08-21; D28–D31 were raised and locked 2026-08-22.** Everything else
D1–D31 is locked; **D19 is superseded by D20** (below), and **D31 renumbers the superseded one to
D19b**. See the table below for D1–D15 and the sections below for D16, D17, D19–D31.

**Session handoff for the 2026-08-18 to 2026-08-21 RAG work:**
[session-handoff-2026-08-21.md](../archive/session-handoff-2026-08-21.md) — what shipped, what the numbers
are now, and what is still owed.

> **Numbering collision, flagged 2026-08-18 and resolved by [D31](maintainer-decisions-archive.md#d31--which-of-the-two-d19s-keeps-the-number)
> on 2026-08-22.** The superseded corpus-licence question becomes **D19b**; the live
> *"Can you reach the strategy corpus without the game running?"* keeps **D19**.

---

## Cleanup candidates — locked and executed 2026-08-02

### D38 — DEFERRED at the maintainer's request (raised 2026-08-29) — What ships is beaten by half of itself on the blind rows. How should that be acted on?

**Maintainer's position, 2026-08-29, in their own words: "I need more data, more games, more
questions before I can make an informed decision."** So this is **not** open for an answer yet, and
nothing about the fusion weights is to be changed until it is. What the deferral asks for is being
built — see *What is being done about it* below.

**The situation, in plain language.** The plugin finds knowledge cards two ways: **word matching**
(cards containing the words you typed) and **meaning matching** (cards that mean the same thing,
even sharing no words). It blends the two lists into one ranking, and each way currently gets an
**equal vote**.

The first measurement against the blind holdout rows says that equal vote is costing us:

| Split | keyword | vector_only | rrf (ships) |
|---|---|---|---|
| tune (n=117) | 75.2 / 86.3 | 74.4 / 91.5 | **75.2 / 91.5** |
| holdout (n=92) | 51.1 / 70.7 | **64.1 / 83.7** | 56.5 / 79.3 |

*(top-1 / top-3. Run of record:
[../archive/research/kb-embed-bakeoff-2026-08-29-arms.md](../archive/research/kb-embed-bakeoff-2026-08-29-arms.md))*

**On the blind rows the meaning half alone beats the shipping blend by 7.6 points of top-1.** The
reason is legible: the blind questions share no wording with their card by construction, so the
word-matching half has nothing to go on — and because it still gets an equal vote, it drags good
answers down the ranking.

**Why this is a decision and not just a number to change.** The weights
([knowledge_base_service.py:60-68](../../py_modules/backend/services/knowledge_base_service.py))
were never tuned. They were set equal and locked on 2026-08-09 with an explicit instruction: *"Equal
weights stay; do not 'tune' from a later peek at holdout."* That rule is correct — tuning after
peeking is how a ship gate quietly stops being one. But **the only split it is legitimate to tune
against said "change nothing"**: on tune, the blend was already the best arm available. So the rule
that keeps the gate honest was also blocking the fix the gate had just asked for. That is the knot,
and it is why this went to the maintainer rather than being quietly re-weighted.

**The options as they stood when it was raised.**

- **A — give tune the missing kind of question, then tune normally.** Write blind rows into `tune`
  so tuning can finally see keyword-hostile questions, sweep the weights on tune alone, and spend
  one holdout confirmation at the end. Costs writing effort; keeps the gate intact. Recommended.
- **B — re-weight from reasoning, then spend one holdout check to confirm.** Fast, but it uses up
  some of the gate's honesty and cannot be repeated.
- **C — change nothing.** Accept that the blend does worse on realistic questions than one of its
  own halves. Defensible while there are no users; less so after the first one.

**What is being done about it while it is deferred**, all of it option A's groundwork and none of it
touching a weight:

1. **51 blind rows added to `tune`** (`V2-BLINDT-01`…`51`), 2026-08-29 — the split had **zero**
   before, which is the whole reason it could not see the defect. Labelled tune 117 → 168. Method
   and disclosures: [kb-blind-tune-rows-2026-08-29.md](../archive/kb-blind-tune-rows-2026-08-29.md). **Every
   tune figure in the table above is superseded by this (R4)**; holdout is untouched.
2. **A weight sweep on `tune` only** — measuring whether any keyword/vector ratio looks better than
   equal, which is the legal move under the lock. Result to be recorded here.
3. **More games** — the maintainer asked for these explicitly. Flagged rather than started, because
   [knowledge-base.md](../knowledge-base.md) § Phase 5 locks *"no net-new titles in Phase 5"*
   (2026-07-30), sending catalog growth to Phase 8. Net-new titles therefore need that lock revisited
   first, and a title list only the maintainer can supply. Deepening the existing 13 is Phase 5 work
   and is gated on Phase 4 passing on the Deck, which is now all but complete.

**Not to be done meanwhile:** no weight change, and no tuning against holdout, whatever a later
number looks like.

---

### D41 — OPEN (raised 2026-08-31) — A card named after a category outranks the cards inside it

**One real regression** came out of the Hades split. `V2-S-HADES-02` asks *"which weapon is
easiest"* and expects `Stygian Blade`, whose card says *"the safest thing to learn on"*. It now
returns `Weapon aspects`, `Shield of Chaos`, `Adamant Rail` — the right card is not in the top three
at all.

The cause is plain: **`Weapon aspects` contains the word *weapon* and the six weapons do not.** They
are named `Stygian Blade`, `Eternal Spear` and so on. Before the split, one card was called
*Starting weapons* and won the same match honestly, because it *was* the answer.

**What must not be done:** rewording the Blade card to say *"easiest"*, or renaming `Weapon aspects`
to dodge the match. Both are fitting the corpus to a test question, and this repo has already
recorded that failure mode once ([00-phase0.md](../archive/00-phase0.md)).

**The real question:** should a card whose name is a *category* sit in the same pool as cards that
are *instances* of that category? Options:

1. **Accept it.** One tune row is wrong; the shipped `rrf` arm may well rank it correctly, and this
   was never measured per-case for `rrf` — the per-case data only exists for the keyword arm.
   **Measure `rrf` per-case before deciding anything.** Cheapest and most likely correct first step.
2. **Give instance cards their category word.** Name them `Stygian Blade (weapon)` and so on. Fixes
   retrieval generally rather than for one question, at the cost of clumsier chip labels — and chip
   width is already a known problem on a 300px column.
3. **Fold `Weapon aspects` into the mechanic it belongs beside** (`Mirror of Night`, `Darkness, keys
   and gems`) so the category name stops competing with the instances.

**Recommended first step is (1)** — the finding rests entirely on the keyword arm, which is not what
ships, and the tooling does not currently write per-case results for the fusion arms.

### D74 — PARTLY LOCKED 2026-09-05 (raised the same day) — Reading answers aloud: five calls locked, one open

Raised by the feasibility memo [planning/42-read-aloud-feasibility.md](../planning/42-read-aloud-feasibility.md),
the fourth of the six features planned one at a time on 2026-09-05. What the memo found, in one breath: the Deck
has had a voice of its own since SteamOS 3.7.13 (June 2025, added for Steam's screen reader); the plugin's
microphone code already knows how to reach the Deck's sound system from the background program; a natural
voice is one Apache 2.0 runner program (28 MB) plus one voice file (63 MB), no compile, no container. The one
unknown is speed beside a running game, and that is a Deck measurement, not a guess.

**What a person will notice.** A **Read aloud** button under the answer. Sound starts within about a second,
keeps going when the menu closes, and stops on a second press or a new question. Hidden spoiler blocks are
never read. With a character selected, later, the voice matches the character's type.

**The calls.** Each has a recommendation; none is locked.

1. **Which voice in Phase 1?** (a) the Deck's own voice only, no download, robotic; (b) the natural voice only,
   which needs a download before the button does anything; (c) both, the Deck's own voice from day one and
   the natural voice as an optional download that takes over once installed. *Recommended: (c).*
2. **Read new answers automatically when the menu is closed?** (a) yes, in Phase 1, as an off-by-default
   setting; (b) later. *Recommended: (a).* The in-game case is where listening beats reading.
3. **A hidden spoiler block is skipped: say so, or stay silent?** (a) one short phrase, *a spoiler is hidden
   here*; (b) silence. *Recommended: (a).*
4. **Phase 2's rule: stock voices only, never a copy of a real person's voice.** Yes closes the legal gate
   for good; no reopens it with lawyers. *Recommended: yes.*
5. **Split the roadmap entry** into Phase 1, read aloud (three stars) and Phase 2, a voice per character
   (two stars, after Phase 1), retiring the five-star line? *Recommended: yes.* The five stars priced not
   knowing any of the above.
6. **Voice licences.** Every Piper voice carries the licence of the recordings behind it. (a) ship only
   voices whose recordings are public domain or attribution-only, name them in About; (b) any voice that
   works. *Recommended: (a).* A voice is a model, and the plugin's tiers are about models.

**What is not a call.** Sound leaves through the background program, the way the microphone comes in;
the screen side is the fallback if that fails on the device. The text read is the toast preview's text
(plan 38's helper) split into sentences. Tables and code are announced in one phrase, not read out. Ollama
cannot speak and nothing on its roadmap changes that.

**Before any build, whatever the answers:** Deck rows TTS-FEAS-01 to 03 in the memo, under half an hour
over SSH, when the Deck is free. Row 05, the natural voice beside Deep Rock Survivor, decides whether the
natural voice is the default or an option.

**Locked 2026-09-05, the maintainer's answers.**

1. **Phase 1 uses the Deck's own voice only.** No download. The natural voice moves to Phase 2.
2. **Reading new answers on their own when the menu is closed ships in Phase 1**, as a setting, off by
   default.
3. **A skipped spoiler block is said out loud**, one short phrase.
5. **The roadmap entry is split.** *Read answers aloud* is two stars now that no download is in it; *A voice
   per character* is three stars, since the download moved into it. The five-star line is retired.

**Call 4, revised the same day.** The maintainer does not want a stock reader for the character voice and
is not asking for a copy of a named performer: they want an invented character voice with a heavy regional
accent, like the ones the character mode already writes. The rule as written allows that; it forbids only a
real person's voice without that person's consent. The memo's § 6 now has three ways: a stock British voice
from a 109-speaker consented pack, picked by region; an invented voice designed once on the PC from a
description, or a five-second recording of the maintainer's own voice, copied on the Deck by a small model
that runs on two CPU cores (unmeasured on the Deck; row 04 measures it); or the design model on the Deck
itself, which is a no. The call now: (a) the stock regional voice first; (b) straight to the invented voice,
after the Deck check; (c) both, stock first, invented when the check passes. *Recommended: (c).*

**Call 6, the pros and cons the maintainer asked for.** The question is whether the plugin ships only
voices whose recordings are public domain or attribution-only.

For:

- It keeps the plugin's promise. The default tier is open source only, and a voice is a model; a person who
  chose that tier gets no surprise in the voice list.
- The voices we want qualify anyway. The British 109-speaker pack and the standard American voice are
  attribution-only; the Kokoro and Kitten voices are Apache 2.0. Little is lost.
- Attribution is one line in About, the same line whatever the tier.
- Non-commercial voices bite people who stream or make videos with the plugin on screen; an
  attribution-only voice never does.
- One rule, no judgement calls later.

Against:

- Some of the best-sounding voices in the Piper set are non-commercial and would be out, so the very best
  voice is not in the picker.
- It needs upkeep: every new voice's card has to be checked before it is added, and voice cards are
  sometimes missing a licence or wrong about it, so checking the card is not always enough.
- It is a rule about recordings, not about what the plugin does. A person playing alone is never touched
  by a non-commercial clause; for them the rule only removes choices.
- An invented voice (call 4, way 2) sidesteps the question for the character voice but not for the plain
  reader.

A middle path: the voice list follows the tier setting the models already use. On the default
open-source-only tier, only public domain and attribution-only voices, named in About. On the looser
tiers, non-commercial voices too, marked as such, the way open-weight models are marked today.
*Recommended: the middle path.* Open until the maintainer says.

**Locked later the same day: call 4 is the invented voice.** The maintainer: "invented one sounds more like
what we need to go for." So way 2 in the memo's § 6: design the voice once on the PC from a description,
or from a five-second recording of the maintainer's own voice; copy it on the Deck with the small cloning
model. Row 04 decides whether the Deck can carry that model beside a game; the stock regional voice is the
fallback if it cannot. Never a real person's voice without their consent.

**Call 6, what would be out.** The maintainer asked which voices the attribution-only rule excludes. Every
English Piper voice's licence card was read on 2026-09-05; the table is § 6.1 of the memo. In one
breath: out on every tier, *lessac*, Piper's best-known American voice, because its recordings are
research-only and the licence forbids building voice products with them (a correction: the memo's first
draft called it attribution-only). Looser tiers only, because non-commercial: *ryan*, the two *hfc*
voices, *l2arctic* and *semaine*. Unclear until a voice folder is read: *alan*, *amy*, *danny*, *kusal*.
Everything else is in, including the British 109-speaker pack, the 904-speaker LibriTTS packs, and every
Kokoro, Kitten and Pocket TTS voice.

**Call 6, reframed by call 4.** With an invented voice for the character, the plugin can design its own
reader voice the same way, and then no stock voice is needed for anything. The stock list becomes an
optional extra. The call now: (a) the plugin's own designed voice as the reader, no stock list; (b) the
designed voice plus the stock list as an extra, filtered by the model tier setting, *lessac* never; (c)
stock voices only for the plain reader, filtered by tier. *Recommended: (b).* Open.


**Locked 2026-09-08, after the OmniVoice research (memo § 3.1 and § 6.2).** The maintainer asked why the heavy
voice work cannot be done once, up front. It can, for the voice; it cannot for the words, which are new every
answer and must be read on the device by a fast reader. The calls:

7. **The bundled characters' voices are made up front on the maintainer's PC.** OmniVoice designs each one from
   keywords or a short clip; what ships is a five to ten second clip per character, read on the device by the
   small copying model through the runner. If that model is too slow beside a game (memo row 04), the fallback
   is a trained Piper voice per character, made on the PC from OmniVoice-generated speech, about 60 MB each,
   downloaded on demand.
8. **A custom character's voice is a later version.** Type a name, press *Generate voice*, wait minutes once;
   the device runs the OmniVoice design step locally, then the copying model reads in the result.
9. **An optional OmniVoice download button in Settings is acceptable.** No mixed Deck-and-PC setup.

**Locked later the same day.**

10. **The custom voice step runs on the device, with the warning *minutes on a Steam Deck, seconds on a stronger
    machine*.** The maintainer's thinking, which the call keeps: bonsAI runs on any SteamOS machine, the Deck is
    the floor, a stronger machine may take seconds where the Deck takes minutes. What settled the wording: the
    slowness is about reading every answer live, not about a one-time design step, so a few minutes once, with a
    progress bar and the game closed, is a wait a person accepts even on a Deck. On SteamOS the local build is
    the community C++ port with its Vulkan backend, not the Python original, because there is no package manager
    and no NVIDIA driver; that port is one person's project, unreleased, and never timed on an AMD chip. So:
    local through the port for the one-time design step on every machine; the measured time shown after the
    first run; live reading with OmniVoice never on the device; **the LAN speech server is not built**, and is
    reopened only if the port fails its Deck test. **That half-day test (memo row 07) is phase 0 of the
    custom-voice work**; nothing else in it starts first.

**Open, raised 2026-09-08.**

11. **May voices made with a non-commercial model ship inside the plugin?** OmniVoice's weights are CC-BY-NC;
    a clip or a trained voice made from its output is not the weights, and whether the licence reaches output
    is unsettled. A blogger who trained a Piper voice from another program's speech did not publish it for this
    reason. *Recommendation:* ask the team in an issue before any clip ships; design the voices meanwhile,
    since the answer changes only whether they ship. Fallback: the maintainer's own recorded clips where one
    accented voice will do, and the consented stock voices of memo § 6.1 for the rest.

**Roadmap, 2026-09-08:** the ★★★ character-voice entry reshaped as *Voices for the bundled characters*; added
★★★ *Trained voices for the bundled characters*, ★★★ *Full-quality reading from a LAN PC* (deliberately not
built, later the same day) and ★★★★ *A voice for a custom character*.

**Shelved 2026-09-08, later the same evening.** The maintainer shelved calls 7 to 10, the character voices, after
a conversation about whether imitating Ali G or the Heavy by keywords alone would be fair use. The reason in one
breath: the feature is technically possible and cheap (memo § 6.2), but fair use is a copyright rule and a voice
is not a copyrighted work; what protects a voice is each person's right to their own identity, which the newer
AI-voice laws extend to simulations with no "free use" exception; every one of the 31 bundled characters is a
named character owned by a studio and voiced by a real actor, and Ali G is a living comedian's own persona; the
realistic risk is an actor's complaint, a takedown or a store removal, and OmniVoice's own terms forbid
impersonation. Memo § 6.4 has the summary. **Two gates before unshelving:** a written sweep of the 31 characters
(studio, actor, living persona, whether a voice could be a type rather than a copy), filed as the two-star
roadmap item *Which bundled characters copy a real person*, and a legal check by a person qualified to give one.
Call 11 stays open. *Read answers aloud* and the natural reader voice are not shelved; they have no character in
them. Roadmap: the three character-voice entries marked shelved with the reason; the sweep added.

### D75 — OPEN (raised 2026-09-06) — The model speed readout: six calls before anything is built

Raised by [planning/43-model-speed-readout.md](../planning/43-model-speed-readout.md), the fifth of the six
features planned one at a time. The five-star benchmark's own gate said to descope to a one-shot readout if
timings do not hold still; nobody ran the gate; the plan takes the descope now and lets the readout's record
answer the gate over time.

**What a person will notice.** In the model picker, a small badge per installed model: *9 words/s*, or *not
timed yet*. Under Show details, one plain line: how long the answer took, how long the model took to load,
when the first word came, how many words a second, and which game was running. In the Ollama tab, the last
few timings per model with their dates and conditions. A button, *Time this model now*, that asks one fixed
short question and reports the same line. Nothing is reordered for them, ever.

**Why it is cheap.** Every answer already carries its seconds and its model in the diagnostics the Developer
details chip shows; Ollama already reports the load, reading and writing times at the end of every stream
and the plugin reads only the counts beside them. Words a second is a division. The running game is already
in every Ask's context.

**The calls.** Each has a recommendation; none is locked.

1. **Both halves, or the record alone?** (a) the record with its badge and lines, no button; (b) the record
   plus the button. *Recommended: (b).* The button is what turns the bake-off's Deck half into ten presses
   and the only way to time a model that has never been picked.
2. **Where the numbers show.** (a) picker badge, Show details line, Ollama tab readout; (b) Show details and
   the Ollama tab only; (c) Developer tab only. *Recommended: (a).*
3. **Timing with a game running.** (a) run and record, the game's name on the entry; (b) warn first, then
   run; (c) refuse until the game is closed. *Recommended: (a).* A number with the game named is a true
   number, and the game-running case is the one people live in.
4. **Write each timing to the Desktop notes file too**, one line, when notes are on? (a) yes; (b) no.
   *Recommended: (a).* It reuses the notes writer and fills the bake-off sheet from a text file.
5. **The five-star entry.** (a) retire it; the ranking half lives in the details file behind the record's
   data; (b) keep it beneath this one. *Recommended: (a).*
6. **Stars.** Two for the record alone, three with the button. *Recommended: three.*

**What is not a call.** The badge is the last answer, not an average; averages of a game-running number
and a desk number are a number of nothing. The button's question is fixed, general and spoiler-free, thinking
off, a small cap, so numbers compare across dates. The record is cleared by Clear all plugin data. Nothing
leaves the device.

### D82 — OPEN, raised 2026-09-06 — Leaning the search on meaning wins on the measurements and breaks three rules we set on purpose

**Status: measured, tried, reverted. Nothing changed in the plugin. The numbers below are real and repeatable.**

**What was measured.** Nine different balances between the word search and the meaning search, run over the full
266-note library. Only one beat today's even split on **both** measures at once, and it was the one that counts the
meaning search twice as much as the word search:

| | right note first | in the top three |
|---|---|---|
| Today's even split, tuning questions (168) | 65.5% | 88.7% |
| Leaning on meaning, tuning questions (168) | **69.6%** | **89.9%** |
| Today's even split, held-back questions (135) | 37.0% | 51.9% |
| Leaning on meaning, held-back questions (135) | **43.0%** | **53.3%** |

The held-back questions are the honest test — no tuning is ever allowed to look at them. It won there too, and the
direction agreed on both sets independently. D68 authorised making this change on exactly this evidence.

**Two warnings about those numbers before anyone reads them as a win.**

1. **The ranges overlap.** This is a consistent direction, not a separated result. "Lean on meaning, the evidence is
   thin" is the honest one-line summary.
2. **The held-back numbers look far worse than the old ones (37% against about 70% in August) because the test got
   much harder, not because the search got worse.** The held-back set grew from 36 questions to 135 by adding blind
   questions about twelve newly added games, written by someone who had not read a single note and who described
   things instead of naming them. That is the new floor.

**Why it was reverted.** Making the change breaks three tests, and all three are guarding behaviour we chose on
purpose, not implementation detail:

1. **A note whose meaning-index has not been built yet gets buried.** Today, a note that is the best word-match still
   comes first even when its meaning-index is missing — there is a deliberate mechanism keeping it there. Halve the
   word search's weight and any note that *does* have a meaning-index outranks it. In plain terms: **a freshly added
   note could be pushed out of sight until its index is built.**
2. **The meaning search can now push aside a strong exact word match.** There is a test whose name is literally the
   rule — a note found by meaning may compete, but must not unseat the top word match. With the change it does. In
   plain terms: someone who types words that exactly match one note could be shown a different note first.
3. **A locked decision (D22) stops holding.** Preferring a topic was chosen over filtering by it, so a clearly better
   match elsewhere still surfaces. One of its cases stops surfacing.

The arithmetic behind all three is the same and it is not subtle: at equal weight, a note ranked first by words and a
note ranked first by meaning score the same. Halve the word weight and **the meaning-first note always wins**, in every
tie, everywhere.

**So this is not the two-constant flip D68 described.** D68 authorised acting on the measurement. It did not consider
that the same change quietly overturns three named guarantees, one of them a locked decision. Pushing it through would
mean editing those three tests to expect the opposite of what they were written to protect, which is a design decision
rather than a measurement one. That is why it stopped here.

**The options.**

1. **Leave the weights alone. Recommended for now.** The evidence is a direction, not a result, and the cost is three
   rules we set deliberately — including new notes being buried before their index exists, which would land exactly
   during a corpus release.
2. **Take the change and accept all three consequences**, updating those tests to match. Worth about four points on
   "right note first". Do this only if the three behaviours above are genuinely not wanted any more.
3. **Get the win without the cost. Recommended as the follow-up.** Keep the weights even and change the tie-break
   instead: let meaning rank higher *only* where there is no strong word match, and keep the existing protection for a
   note whose meaning-index is missing. That targets the same gap without touching any of the three rules. It is real
   work rather than a constant change, and needs its own measurement.

**ANSWERED 2026-09-06 — hold, and here is the condition for lifting it.** The maintainer's words: *"don't lean the
search towards meaning until its meaning index is built."*

So this is not a permanent no. It is a rule with a trigger. Leaning the search on meaning is blocked **for as long as
a note can exist whose meaning index has not been built yet** — because that is the case where the lean buries a
brand-new note out of sight. The moment every note is guaranteed to have its meaning index before it can be searched,
the objection in point 1 above disappears and the change can be reconsidered on the numbers, which are already on
record here.

The other two objections (a strong exact word match being pushed aside, and the topic-preference case) are **not**
covered by that trigger and still need answering separately if the lean is ever taken.

Weights stay even for now. The measurements stand.


## Refactor round two (plan 51): the calls from the planning discovery, 2026-09-09 to 2026-09-11

Eight grouped entries. Each locks the calls the maintainer made in the three-round discovery for
[plan 51](../planning/51-refactor-round-two.md), with the options passed over. The plan holds the
phases, the numbers and the worker instructions; this file holds only what was decided and why.

### D90 — LOCKED 2026-09-11 — Docs: archive by status, split the two giant docs, one neutral guide

**Raised** by the measurement that the testing doc is 315 KB and the roadmap 109 KB, that the repo
rule makes every landing read both, and that every doc was touched inside 90 days so age cannot
say which are stale.

#### The calls

- **Every doc gets one of four statuses:** active, shipped, superseded, abandoned. A cheap model
  proposes the list with a reason per doc; the maintainer confirms it once; the bookkeeper moves
  the files.
- **Archived docs are deleted 90 days after archiving,** and only when the maintainer says yes
  to a list of the overdue ones. Nothing is deleted automatically.
- **The roadmap and the testing doc are split** into a small current file and an archive file
  each. The rule to update both before marking work done stays; they just get small.
- **The orientation file shrinks** to under 8 KB and stops carrying hand-typed counts; a
  generated facts block replaces them. Four of its numbers were wrong on the day of measuring.
- **The neutral guide becomes the one guide** for a human and for any AI tool that reads it;
  the Claude file keeps only what is Claude-specific.
- **The 464 committed device-run files:** the ones a testing row cites move to the evidence
  folder; the rest leave git. New run files can no longer be committed by accident.
- **The lessons that live only in Claude's memory on this machine** move into a repo doc in the
  handoff phase, so other tools and people can read them.

#### Passed over

- Archiving by age: impossible here, the repo is young and active.
- Automatic deletion: a person says yes to a list, every time.

### D91 — LOCKED 2026-09-11 — Cursor is dropped; two personas survive in a tool-neutral form

**Raised** when the maintainer said Cursor will not be used on this project again and asked what
a tool-neutral persona would lose against a Claude-tailored one.

#### The calls

- **Delete the Cursor folder and the Cursor log-capture example script,** after two moves: the
  D-pad focus rule is rewritten into the neutral guide with the two corrections from the review
  saved on 2026-09-11 (its pointers into a settings file went stale, and it names a low-level
  focus handoff that a safer helper has since replaced), and each Cursor skill is compared against
  the guides so nothing they lack is lost.
- **Cursor mentions come out of the six live docs** that carry them. The changelog and the
  archive keep theirs as history.
- **The FOSS advocate and the security auditor survive** as one neutral body each, readable by
  any tool, plus a five-line Claude wrapper that pins the model and the tools and says "follow
  the body". One copy of the content, both benefits.

#### Passed over

- Keeping the folder for a possible return: the maintainer was clear it will not return.
- Claude-only agent files: other tools could not read them.
- Neutral files only: that loses the automatic pick-up, the model pin, the read-only tool set and
  the separate context window, and the last two matter most for an auditor.

### D92 — LOCKED 2026-09-11 — Headers and comments: length follows the file, never counts or line numbers

**Raised** when the maintainer asked whether the "three or four lines to a paragraph" limit should
go up, and asked that any of their own arbitrary rules be flagged when they hurt the priorities.

#### The calls

- **No fixed cap.** A small helper gets three to six sentences; a normal file a paragraph on
  what it is for and how it fits, plus a gotchas list when there is one; a big file adds a
  walk-through of its main flow, naming the functions in order, as long as it needs; a long
  function gets two or three sentences at the top, and a numbered step list when very long.
- **Keep the existing labels** as the skeleton, rewritten in plain words, plus "How it works" for
  big files and "Gotchas" when there are any. 278 of 298 files already carry the labels.
- **Names of files and functions are allowed inside code comments.** The plain-language rule is
  for what the maintainer reads.
- **Headers never carry counts or line numbers.** A checker verifies that every header is present,
  has its sections, and that every function it names still exists. A script gathers every header
  into one generated map of the code, which replaces a hand-written architecture doc.
- **A header cannot rescue a 1,480-line function.** The giants left unsplit get a "split later"
  roadmap entry so the next maintainer knows it is debt, not design.

#### Passed over

- The original cap: the maintainer flagged it as an arbitrary limit that could hurt maintainability.
- A new header format: it would touch all 298 files for no gain over the labels already there.

### D93 — LOCKED 2026-09-11 — The Deck is the gate; the preview is shelved; device checks are queued

**Raised** when the maintainer asked for a recording of the same check on the Deck and in the
in-IDE preview, and the preview turned out to be stuck on its loading screen.

#### The calls

- **Deck checks at the end of the delete, reshape and explain phases,** and after any merge that
  touches focus. Between those, the automated checks stand alone.
- **Any merge that touches D-pad focus goes to Opus after a device measurement.** Kept even
  though it is slower.
- **The preview is shelved.** It has never got past "Loading plugin preview" on this machine, its
  command channel accepts commands and never answers them, and it produced no image. It is not a
  gate and nothing in the plan depends on it. It is sorted with the other tooling in the docs
  phase, not fixed here.
- **Device checks are queued.** One runner per batch, holding the wake lock, running the ready
  check before every row. The ready check caught a build mismatch on 2026-09-09 before a single
  press.
- **Two tool fixes made on 2026-09-11 stand:** the Deck recorder asks the compositor for its
  video stream by numeric id, because asking by name connects but never delivers a frame; the walk
  tool writes an evidence file only for a named run, and the runs folder is ignored by git. Both
  are uncommitted until the maintainer says, and the plugin-studio server must be restarted to
  load them.

#### Passed over

- The preview as the gate between device checks: it does not load.
- Fixing the preview inside this plan: out of scope; shelved.

### D94 — LOCKED 2026-09-11 — Models and budget: the spawn line at 75%, enforced by a hook

**Raised** by the maintainer's first priority, tokens, and their ask that the one running the
session stop spawning workers before a limit hits and find a good stopping point.

#### The calls

- **Fable at max only for this plan and the review at the end of each phase.** Opus at extra-high
  effort runs each phase, lands, writes the freeze commit and does every behavior-touching step.
  Sonnet at high effort does the lanes, the tooling scripts, the docs triage, the tests, the merge
  step and the bookkeeping. Haiku stays on trial for sorting docs, existence checks and header
  drafts for small files, one batch in five checked by Sonnet, every use logged. Scripts do
  everything mechanical.
- **The spawn line.** The share of the five-hour window past which no new agent may start: 75%
  for a trial, one number in the project settings, changed by the maintainer saying "raise the
  spawn line to N". It is the figure the usage screen shows and it is account-wide.
- **A hook enforces it.** Past the line, a request to start an agent is refused with a plain
  message; the lane in flight finishes and commits; the session lands what is green, writes the
  handoff note and stops.
- **A phase starts only below half the spawn line.**
- **If a script cannot read the usage figure,** the maintainer reads the usage screen once and
  says the number, and the script maps token totals from the local session logs to a percent.
- **Every worker's cost goes into a ledger** from its completion notice.
- **Lanes:** three for behavior-adjacent work, up to six for purely scripted passes. The Workflow
  tool may fan out read-only work to Sonnet or Haiku workers; the maintainer gave that go on
  2026-09-09.

#### Passed over

- Watching the budget by the session runner alone: goodwill is not enforcement.
- Fable running execution sessions: earlier measurement put it behind most limit hits.

### D95 — LOCKED 2026-09-11 — The rules that are enforced by a check, and the list of numbers that may only improve

**Raised** when the maintainer asked what we have learned that can be enforced so the code is
written well from now on, not just cleaned once.

#### The calls

- **A list of numbers that may only get better,** with the 2026-09-09 measurements as the start
  values and the targets in the plan. The verify command fails if any number gets worse. It is
  what keeps the project from drifting back.
- **One verify command** with a quick mode (types plus the tests related to the change) before
  every lane commit, and a full mode (everything plus the build and the snapshot check) at every
  merge. It prints only failures, at most 40 lines.
- **Back-end method names are generated into a front-end type,** so a typo in a call name fails
  the type check instead of failing on the device. The one method nobody calls is deleted; all
  other names stay frozen.
- **Each setting is declared once,** so a new setting stops touching 18 files and 30 places. This
  is its own step in the reshape phase.
- **Only exact copies, and copies where one value differs, are merged on their own.** Anything
  else needs a written decision first.
- **Living docs never carry hand-typed counts or line numbers;** dated audit docs may.
- **A hook refuses a git push** unless a flag is set. **A hook reminds, but does not refuse,**
  when a file over 600 lines is read without a range.
- **Freeze the seams before anything moves; leaves first, roots last; the two back-end cycles are
  broken first.**

#### Passed over

- A hard refusal on whole-file reads: a worker rewriting a file needs the whole file.
- Test-impact analysis for the back end: the whole suite runs in 30 seconds.

### D96 — LOCKED 2026-09-11 — Copies of the repo, and the cost rules for workers

**Raised** by the 36 stale copies of the repo found on disk, the earlier session that started 442
commits behind, and a rule review that cost 130,000 tokens.

#### The calls

- **Prune the copies that are merged, clean and idle,** and delete their merged branches. The
  maintainer runs the script once; it skips anything touched in the last day.
- **The copy helper becomes a permanent script:** create from the current tip with the base
  recorded, list with base distance, prune with the safety rules.
- **All refactor work happens in a copy;** only the landing session touches the shared checkout;
  the merge step refuses a branch whose base is far behind.
- **Worker cost rules:** script the checkable part first and hand the model only the misses; one
  question per worker with the exact lines; a tool-call cap and a token cap in every brief; a
  fixed report shape; continue a worker with a message instead of spawning a new one; batches of
  eight to twelve files per worker; a cheap check before an expensive tool, for example the
  readiness check rather than the open-panel tool to ask whether the panel is open.

#### Passed over

- Shared-cache tricks: pnpm already shares one store across every copy.
- One worker per file: the fixed cost of starting a worker dominates.

### D97 — LOCKED 2026-09-12 (raised 2026-09-11) — The Frame features: four calls, the tips go, the voice shape and the anti-cheat rule

**Raised** by the maintainer's read of [planning/49-steam-frame-features.md](../planning/49-steam-frame-features.md)
on 2026-09-11. The plan listed four calls in its § 5 that were never filed. This entry files them, records the
three instructions the maintainer gave in the same chat, and points to the deeper look in
[planning/52-frame-features-second-look.md](../planning/52-frame-features-second-look.md).

#### Locked 2026-09-11

- **The seven Frame tips ship** (call 2 of the plan). The four old tips go, the seven from § 6 of the plan
  replace them, and the README gets one line saying bonsAI does not run on the Frame and how to use a Deck
  beside it. Shipped the same day; see the roadmap entry.
- **The floating panel follows Steam's own way of drawing over a game, and never touches the game.** The
  maintainer's words: we must not get people in trouble in online games. Best effort. The rules, in full, are
  in plan 52 § 4. The short form: use only SteamVR's official door for panels; never load anything into a
  game, never hook it, never read its memory, never send it input, never copy its picture. This is the same
  position bonsAI already holds on the Deck, where it lives inside Steam's own menu. What we cannot promise:
  each game's anti-cheat sets its own policy. The README says so when the panel ships.
- **Voice follow-ups have a sound cue and stay simple.** After a spoken answer ends: one short rising tone,
  the mic opens for a few seconds, and if the mic hears something it keeps listening until it goes quiet;
  then it matches a handful of words. A short falling tone when the mic closes. No wake word, no menu, no
  confirmation step. The full shape and the open questions are in plan 52 § 3.

#### The calls, locked 2026-09-12

The maintainer's own words: "go with your leans on the 4 items."

1. **The Frame entry's rating.** The study asked for six stars to become two. (a) Re-rate to two, since the
   nine planned entries now carry the work and this entry is only "the tips and the README line", which have
   shipped; (b) keep six and treat it as the umbrella for all nine; (c) close it as done and let the nine
   entries stand alone. **Locked: (c).** The entry has nothing left to do that is not on another line; see
   the roadmap's Done section.
2. **Does bonsAI grow a second way to run?** (the plan's 2.9). The floating panel cannot exist without an
   answer, because today the only way anything talks to bonsAI's Python side is through Decky on the Deck.
   There is no network door. The choices: (a) the PC program carries its own copy of the brain, a second
   implementation that would drift; (b) the Deck opens a small network door and the PC program asks the
   Deck, which must then be awake; (c) the Python side runs on the PC as well, unchanged, with the panel as
   its front, one code base on two hosts. **Locked: find out how far (c) is from true during the PC bench,
   before choosing.** The Python tests already pass on the maintainer's Windows PC, so the backend is less
   tied to the Deck than the plan assumed. Plan 52 § 5 lists what to check. **llama.cpp is not reopened by
   this decision;** that stays a Deck question, as the study said.
3. **Which headset for the tests.** The maintainer has none (2026-09-11). (a) None, pretend headset only:
   answers the panel questions, not the mic or the wrist panel; (b) a Quest with Steam Link, the cheapest
   that behaves like a Frame will; (c) wait for the Frame. **Locked: (a) now, (c) after.** No headset is
   bought for now; the Frame carries the mic and wrist-panel questions when it arrives.
4. **Headline first: build it, or count first.** The maintainer called it the weakest of the nine. (a) Build
   the prompt change as planned; (b) count first: take the answers the answer test already produces, and
   record how often the first sentence already stands alone and how often it leaks a spoiler; build the
   prompt change only if the count is poor; (c) drop it and let Headset mode's "answer for the ear" carry the
   shaped opening. **Locked: (b).** The count is counted first; the prompt change is only built if that count
   comes back poor. The count started 2026-09-12.

**Glance view is shelved (2026-09-12).** The maintainer's own words: "shelve the glanceable view for now.
It's too much UI change and we're not ready for it yet." The drawing and plan 52 § 6 stay as the record for
when it comes back.

#### Passed over

- A settings switch for each sound cue. One switch for the feature is enough; the tones are the feature.
- A confirmation step before a spoken "go on" reveals a spoiler. The word is the confirmation.
- Buying a headset now. Nothing in the next two steps needs one.

### D98 — LOCKED 2026-09-12 — Follow-up questions: tell the model the subject, and call it a partial fix

**Raised** by the device check on 2026-09-07 that closed out wave three's follow-up work
([planning/48-kb-wave-three-session.md](../planning/48-kb-wave-three-session.md) § 8, row W3-R4).
Evidence `runs/plan48-R4-followup-memory.json`. This entry needs the maintainer's answer before the
second half can be built; nothing is being built in the meantime.

#### What happens today

Deep Rock Galactic: Survivor running. Ask *"how do i beat the glyphid dreadnought"*, then ask
*"what about its second phase"*.

The looking-up half works, and works on the device: the right boss's note moves from third place to
first once the plugin remembers what you just asked about. That is exactly what shipped and it holds.

The answering half does not. The reply was about the Dreadnought Twins — a different boss. The
plugin still hands the model three notes, and the wrong boss's note is second in the pile. Its
content reads far more like a second phase than the right one does: health bars drifting apart, both
bosses turning immune while they heal. So the model picked it and wrote about that.

**The lesson, which decides the shape of any fix:** putting the right note first is not enough while
a better-matching wrong note is still in the pile. More ranking will not fix this.

#### One thing to know before reading the options

The remembered subject is not always something the person typed. When a question names nothing the
plugin remembers the name of the top note it attached instead. So any option that tells the model
*"they are asking about X"* can be telling it about something the person never said out loud. That
matters for spoilers: naming a boss is what unlocks that boss's spoilers today, so a remembered name
must not count as naming it unless you want that too. Each option below says what it does about that.

#### The options

1. **Tell the model the subject, leave the notes alone.** The follow-up's instructions say which
   thing the question is carrying on from. The person's question on screen is untouched, as it is
   today. Cheapest of the three, about half a day. The remembered name would **not** count as
   naming anything for spoiler purposes, so nothing gets unfenced that is not unfenced today.
   The risk: when the memory is wrong, the model is now confidently wrong instead of
   accidentally right — today a bare follow-up can still stumble onto the right note.
2. **Narrow the notes.** A bare follow-up with a remembered subject attaches only that subject's
   notes, so no rival note can win. About a day, because "only that subject" has to be defined —
   a boss can have more than one note and a person's follow-up sometimes genuinely needs a
   neighbouring one. The risk: a thinner answer. If the remembered note does not cover what was
   asked, there is nothing else in the pile to fall back on.
3. **Both.** Most likely to answer about the right thing, and the one shape where a failure cannot
   be traced to which half caused it. About a day and a half. Against the repo's own rule of one
   change at a time.
4. **Leave it as it is.** The search half already helps on its own: the right note is at least
   present and first, which it was not before. Costs nothing. The device row stays a half-pass and
   the entry stays open.

#### Measuring it rather than guessing

None of the above can be settled by argument — it depends on which note the small model on the Deck
reaches for. It **can** be measured off the device: the build machine has the Deck's own answering
model, so three boss-then-follow-up pairs run twice under each option would say which shape answers
about the right boss. The answer test cannot do two-turn questions today, so this costs roughly a
day of work before any of the options above are started, and it is the only way to avoid shipping a
guess to a device row that already half-failed once.

#### Measured 2026-09-12, off the device, on the maintainer's "measure it" instruction

Three boss-then-follow-up pairs from three games, three runs each, with the Deck's own answering model
and the library that ships. Every one of the 27 replies was read and judged by hand, and they are all
in `runs/plan48-followup-shapes.json` so the calls can be checked.

| | Answered about the right boss | Words per reply | Seconds |
|---|---|---|---|
| Today, as it ships | **0 of 9** | 87 | 1.24 |
| Tell the model the subject | **4 of 9** | 44 | 0.94 |
| Narrow the notes to that subject | 2 of 9, and neither named the boss | 65 | 1.06 |

**The first row is the finding nobody expected.** Today this does not "often" get the wrong boss. Across
three games and nine tries it got the right one **not once**. The feature that shipped puts the right
note first and the reply is still about something else, every time.

**Broken down by game, telling the model the subject:**

| Game | Right, out of 3 |
|---|---|
| Deep Rock Galactic: Survivor | 2 |
| Ocarina of Time | 2 |
| DOOM Eternal | 0 |

**DOOM Eternal is its own finding, and it limits what any of this can buy.** It failed every way that was
tried — including being handed only the one correct note and nothing else to be confused by. The small
model simply never connected "second phase" to that boss's note. No amount of better searching or better
wording fixes that one; it is the model reading the note.

**Set DOOM Eternal aside and telling the model the subject gets it right 4 times in 6** on the games where
the model can do the job at all. Against never.

**One side effect worth knowing before deciding:** telling the model the subject **halves the reply**, 87
words down to 44, and it comes back a little faster. Shorter is usually better on a 300-pixel column, but
it is a visible change to every follow-up answer, not just the wrong ones.

**Narrowing the notes is out.** It scored worse, and its two near-misses got the facts right without ever
naming the boss, which is not what a person asked for. The idea that the rival note was the problem turns
out to be only half true: with the rival gone the model still did not reliably answer about the right one.

**One thing that never failed:** in all 27 tries, under every approach, the right note was attached and
available to the model. The searching half of this feature works. The reading half is where it goes wrong.

#### The lean, now that it is measured

**Ship "tell the model the subject", and say plainly that it is a partial fix.** It takes a feature that is
wrong every single time to right about two times in three where the model is capable at all, it costs
nothing extra, it never removes a usable note, and it leaves spoilers exactly as they are. It is also the
smaller of the two changes.

**But do not call it fixed.** Four in nine is not a feature a person can rely on, and one game in three is
beyond reach of anything on the search side. If the standard is "a follow-up answers about the thing you
just asked about", that standard needs a bigger answering model, not more work here.

**Untried, if neither is taken:** put the remembered name into the words the model reads, so it sees "what
about the glyphid dreadnought's second phase" while the person still sees what they typed. That is a
stronger version of telling it the subject and was not measured.

#### Locked 2026-09-12

The maintainer read the measurement above and approved the recommendation in the maintainer's own
words: *"i approve your recommendation"*.

- **Ship "tell the model the subject."** One sentence in the prompt, on a bare follow-up that used the
  remembered subject, naming the thing the question carries on from. The wording and its position are
  exactly what was measured, including the closing line saying the reminder is not the user naming that
  thing themselves — which is the spoiler safeguard and stays in plain sight in the prompt.
- **Narrowing the notes to the remembered subject is rejected.** It scored worse (2 of 9 against 4),
  and neither of its two near-misses named the boss at all.
- **It ships described as a partial fix, with its numbers**, in the code and in the roadmap. Wrong every
  time before, right four times in nine after. Nobody is to read this entry later and think it was fixed.
- **DOOM Eternal stays broken and that is accepted for now.** The small model failed there every way
  tried, including being handed only the correct note. Closing that needs a bigger answering model, not
  more work on the search. If the standard is "a follow-up always answers about the thing you just asked
  about", this does not reach it and no amount of search work will.
- **A device check is owed** before this counts as done, and the shorter replies are part of what gets
  looked at: telling the model the subject roughly halves the answer, 87 words down to 44.
- **The untried idea stays untried** unless someone asks for it: putting the remembered name into the
  words the model reads, rather than adding a reminder beside them.

### D99 — LOCKED 2026-09-12 — After the Frame bench: two "not yet", reading aloud goes with a three-way setting, and a Clear button in the session context strip

**Raised** by the recap of the SteamVR bench ([planning/53-steamvr-bench-findings.md](../planning/53-steamvr-bench-findings.md))
on 2026-09-12, which put three things in front of the maintainer. Their answers, in their own words: *"1. not yet 2. not yet
either 3. yes, add this to the feature: a slider for default voice replies: off by default, only when the user uses voice for a
question, always. Also add a feature to roadmap: clear session context button in the session context strip."*

#### The calls

1. **The second way to run: not yet.** D97 call 2 is now priced (plan 53 § 3: the plugin's Python side already starts and answers
   on a PC; what is missing is a small starter program, a way for a panel to reach it on the same machine, and PC-shaped answers
   for three edges). The lean stays "the same Python side on the PC too". Nothing is built. The six-star roadmap entry stays open
   with the price on it.
2. **Headline first: not yet.** The count stands (2 of 10 first sentences stand alone, 0 of 10 give anything away; poor, so the
   D97 rule says build). The build waits for a separate go. When it comes, the first step is still to count the 2026-09-07
   answer-first run the same way, since it may already be the change.
3. **Reading answers aloud goes.** Phase 1 as locked in D74: the Deck's own voice, no download, the Read aloud button, the spoken
   spoiler phrase. Build order is plan 42 § 8; the first two Deck checks (rows 01 and 02) ran the same evening, results in plan 42
   § 11 and the testing doc.

   **The setting changes shape.** D74 call 2's on/off switch ("read new answers on their own when the menu is closed, off by
   default") is replaced by one three-position choice, **Voice replies**:

   | Position | What a person gets |
   |---|---|
   | **Off** (default) | An answer is read only when the Read aloud button is pressed. |
   | **When I asked by voice** | An answer to a question that came in through the mic is read out on its own. Typed questions are not. |
   | **Always** | Every answer is read out on its own. |

   Two things taken as read, each one line to change if wrong. *"On its own" means as soon as the answer finishes, whether the
   menu is open or closed*: D74's "when the menu is closed" wording is dropped, because the middle position covers the person
   who is not looking at the screen, and "always" is taken at its word. *The control is the three-button row the input
   persistence setting already uses* (three short labels side by side, a description under the chosen one), not a Steam slider:
   nothing in the plugin uses a real slider today, and that row already has its D-pad handling. The maintainer's word was
   "slider"; a three-position slider reads the same to a person and can replace the row later if they prefer it.

   This is the signal Voice follow-ups (D97) hangs off: the middle position is exactly the case where the mic should reopen
   after the answer is read. A three-valued setting costs the same plumbing as a boolean, about eighteen files (CLAUDE.md).

4. **A Clear button in the session context strip, filed as a two-star feature.** What a person notices: the **Session context
   (N turns)** bar under the chat gets a small **Clear** at its right end. Pressing it asks once, the same box the Settings tab's
   *Clear cache* uses, then the chat, the strip and the plugin's stored answer are cleared and the next question starts a new
   session. It only shows when there is something to clear, because the strip itself only appears once a turn has context.

   **One thing it must do that the Settings button does not do today.** The plugin remembers the subject of the last strategy
   question so a bare follow-up ("what about its second phase") can carry it forward (D98). That memory lives in the Python
   side and is dropped only when the game changes or the plugin restarts; the clear-session call never touches it. So after a
   clear, the first follow-up could still be about a boss from the cleared chat. Both Clear buttons get that forget in the same
   change.

   **Open, with a lean:** whether Clear here means the whole session (chat and all, as *Clear cache* does) or only the context
   handed to the model while the chat stays on screen. *Lean: the whole session.* One meaning for "clear" everywhere, and D32
   already settled that a cleared session is a new session. The lighter one is written only if the maintainer asks for it.

   Why it goes in the strip: the strip is where a person sees what the model was given; the way to reset it belongs beside it,
   not two tabs away in Settings. It needs a focus-graph entry and the modal return-focus registration the Settings button has.

#### Passed over

- A fourth position, "only when the menu is closed" (D74's old switch). Folded into Always.
- A per-answer "do not read this one". Stop is the button for that.
- Building the second way to run or Headline first "since the bench is warm". Both are the maintainer's to start.

---

### D100 — LOCKED 2026-09-13 — The maintainer watches the budget by hand; the automatic stop does not hold up the work

Raised on the first day of the clean-up. Nothing on this machine can read the usage figure the
usage screen shows, so the automatic stop that was meant to refuse new workers past three
quarters of the five-hour window has nothing to read. The maintainer's call: **they watch usage
themselves and say when to stop.** The work does not wait for the automatic stop to be made to
work.

This narrows D94 rather than replacing it. What still holds from D94: the three-quarters line
is still the line, the number still lives in one place, and the maintainer can still move it by
saying so. What changes:

- The stop is still built and still refuses to start a worker when it *can* read a figure. When
  it cannot, it allows the worker and says once that the budget is unknown.
- Nobody has to read the usage screen and type a number in to unblock a phase. Item 8 on the
  maintainer's list in the plan is dropped for now.
- The rule that a phase only starts below half the line becomes the maintainer's judgement
  instead of a check.
- Sessions keep the habits that make an early stop cheap anyway: each worker saves its work in
  its own copy of the project, and every stopping point gets a handover note.

Revisit if a way to read the figure turns up.

---

### D101 — LOCKED 2026-09-13 — Clear the seven old copies; the sorting list is approved

Two calls made together on the first day of the clean-up.

**The seven old copies of the project go.** Each held edits that were never saved anywhere, from
late August. All seven were checked against the plugin as it is today before anything was touched.
Six were chasing bugs that have since been fixed, several of those confirmed by pressing real
buttons on the Deck, which is stronger proof than the copies ever had. Two of the seven contain a
way of moving the model order list with the D-pad that was tried, tested on the device, found to
rewrite a person's list while they were only scrolling to read it, and ruled out in writing at the
time. Rescuing that would have quietly undone a decision already made on the device.

One idea in them was genuinely missing from the plugin: inside the models hub, pressing up at the
top of the tier choices or down at the bottom of the advanced switches does nothing instead of
hopping to the neighbouring group. It is filed on the roadmap so it survives the copies going.

**The sorting list is approved as it stands.** Of 121 write-ups: 66 stay, 44 are finished and go to
the archive, 9 were replaced by something newer and go to the archive, and 2 never happened and go
to the archive with a date to delete them after. Of the helper scripts: 63 stay, 10 are finished, 1
was abandoned. Of the 464 saved device runs, the 154 that a test row actually cites are kept as
evidence and the other 310 leave the project; they came from a bug that saved one on every run.

Six of the list's entries could not be judged by reading them and were settled against the project
itself rather than put to the maintainer. Two proved finished: the big main-screen redesign, whose
second half did ship, and the list of planning questions, every one of which already has a written
answer. Four stay open: the bugs in the Deck tooling this project does not own are all still
unfixed, per-game troubleshooting tips are still stuck on the plugin having no way to tie a tip to
one game, the list of testing jobs that need a person is a list of kinds of work rather than tasks,
and the automatic checks on pushed code really do still only warn rather than block.

Nothing here is deleted outright today except the seven copies. Everything archived keeps its
delete-after date in the archive index, and deleting any of it is a separate yes.

### D102 — LOCKED 2026-09-13 — Look before deleting: the older ask path, the answer checker, and the four packages all held

Three calls from the clean-up's measuring phase. All three are holds, and none of them stops the
delete phase — each simply drops out of it.

**The older way of asking the AI stays for now, and we looked for a use for it.** There are two ways
in the back end to ask a question about a game: one answers straight away, one starts the answer in
the background. The plugin only ever uses the background one. The older one is 44 lines, and it is
not a second copy of the answering logic — both ways hand off to the same shared piece. Looking for
anything that might want a one-call ask turned up nothing. The plugin does not. The tests do not.
The tool that puts a question on the Deck for testing does not, and would not: it types the question
and then deliberately stops short of pressing Ask, because the point of that tool is that what gets
tested is the real path a person uses. Reaching past the screen is what it is written to avoid.

So no use for it turned up. The one thing that would change that is wanting to ask the plugin a
question from a script — a nightly check, or comparing models without sitting in front of the Deck.
That is a real thing to want and this is most of the plumbing for it, but it would be a feature
built on purpose, not 44 lines kept on the chance. Re-check at the end of the clean-up.

**The answer checker stays, and the way to find out if it is worth having is to run it quietly.**
The plugin has a piece of back-end code meant to catch a reply that looks made up. It works, it has
its own test, and it has never once run: the field it fills is fed by a value nobody supplies. It
has three rules. Checked against every saved device run in the project — 412 of them — the rule
about a reply naming a store number for a game that was never attached would have fired zero times,
and the rule about a reply claiming certainty needs one exact phrase that appears nowhere in
anything this project has ever recorded. The third rule is the real one: it catches the AI being
asked for a power-tuning suggestion and not giving one. The plugin already spots that today and
writes it to the log, so what the checker would add is telling the person rather than only the log.

There is also a fourth part, which asks a second AI model whether the first one's answer looks made
up. That is an extra model call for every answer, on a handheld, and it is the expensive half.

The cheap way to settle it: switch on the three rules so they only write to the log. Nothing on
screen, no second model, nothing a person would notice. Leave it through normal use for a couple of
weeks and count what fires. That turns the question from a guess into a number, and the counts above
are the baseline it gets compared against. Filed on the roadmap; it is a small feature, not clean-up.

**All four unused packages wait for a build.** The checking tool lists six packages the project says
it needs but never imports. Two of those it is simply wrong about: our own measuring scripts run them
as commands rather than importing them, which the tool cannot see. Of the remaining four, two look
plainly dead — the old name of the Steam Deck interface library, which the project has moved off, and
type definitions for a bundler this project does not use. The other two are riskier: a helper library
for older-style compiled output, and the Linux build helper for the machine that actually builds the
plugin. Nothing imports a build helper by name, so "unused" tells us nothing about it.

Rather than split the four, all of them wait until there has been a build and the plugin has started
on the Deck. Removing two now and two later means two chances for a build to break instead of one,
for no gain — the build has to happen either way.

### D103 — LOCKED 2026-09-14 — Spoiler rules: close the four gaps, one lane, send the screen what the back end already knows

Three calls from plan 54, all yes. The rulebook is in the code and working; the four gaps are at
the edges, and this settles how to close them.

**A no-story game named only in the question gets the relaxed prompt.** With nothing running, a
question like "drg survivor what class" already gets the right risk chip, because the plugin worked
out the game from the words. The answer was still fenced, because the prompt was written as if the
game were unknown. Now the prompt is handed the same profile the chip already has. It is still never
handed the name, so the answer never claims a game is running when none is. Story games change
nothing, since unknown and story get the same careful wording.

**The screen gets the boss name from the back end instead of guessing again.** The back end works
out what the player named on every turn, and understands the ways people actually type it on a
controller. The screen had its own smaller guess and never saw the back end's. From now on the ask
result carries the named thing next to the "spoilers were okay" flag it already carries, and the
screen uses that first, falling back to its own guess only for chats saved before the change. One
guess to maintain, and the two sides cannot drift. Copying the back end's guess into the screen's
language was the other option and is rejected for that reason.

**Go on the lane.** One Sonnet lane at high, both screen-side gaps in it since they touch the same
files, the prompt gap in the same lane, then the bookkeeper's docs sweep, then one Deck evening for
the rows that have sat unticked since August plus the two new ones in plan 54. About a day of code.


### D104 — LOCKED 2026-09-15 — The third bug-fixing session: what is in, what waits, and the Deck pass that follows

Eleven calls from [plan 55](../planning/55-bugfix-session-three.md), ten answered, one still open.
The session does not start until the maintainer says go. It runs in a fresh session on **Fable 5.1 at
extra-high effort, by the maintainer's choice**, with Sonnet 5 lanes at high. The routing table asks
for Opus here, since nothing in the session is above three stars; the maintainer knows that and chose
Fable anyway, so it is recorded as their call rather than a slip. Two things follow. The bookkeeper
guard will refuse the session's own edits to the roadmap, the testing documents, the changelog and test
files, so all of those go through the bookkeeper helper. And the effort stays at extra-high, not max,
because max is what ran earlier Fable sessions into the usage limit.

**Wait for plan 54 before anything starts.** Four of the files this session's fixes need are changed
in plan 54's copy of the repo, and that lane has not committed yet. The maintainer will say when to
proceed. Nothing here touches that copy.

**Opening the panel with nothing highlighted: the device decides.** The guide says the ring being
unowned on open is normal Steam behaviour and not ours to fix; the roadmap has it as an open bug. One
time-boxed try at placing the ring on the chat's first useful stop. If it holds, the guide changes; if
Steam fights it, the roadmap entry closes as accepted.

**The technical line under screenshot answers goes.** Every answer to a question that carried a
screenshot ended with a line of computer text. Gone from the reply; the count lives only in a log line
when verbose logging is on.

**Wiping all plugin data is pre-authorised for the last step of the Deck pass.** Three rows have waited
on it since 5 September. Backup first, restore after, settings read back off disk and compared to the
backup. The maintainer will be away for hours, so no message-and-wait this time.

**Plan 54's Deck rows run in this pass** if it has landed and deployed by then and they are still open.

**One library point release is fine**, carrying the Megaera title fix and nothing else.

**Games may be launched and exited by the rig as needed.** Hades, Deep Rock Galactic: Survivor,
Portal 2 and Black Mesa are believed installed; each is confirmed on the Deck before a row relies on it.

**The five August knowledge-base rows are run, not retired.** Each row says whether it is still a real
check or stale, and the maintainer retires the stale ones from that.

**A fresh Fable session runs it**, reading plan 55 from block 0.

**The settings-list refactor is out for now.** The screen-side settings code writes out its list of
fifty-odd setting names seven times, so a new setting can quietly stop working in one place; folding
that into one table is protection for the next setting anyone adds, not something a person sees today.
The maintainer read the explanation under question 2 in plan 55 and said no for this session. It stays
on the roadmap.

**Still open.** Whether anyone else will be driving the Deck: unknown until plan 54's session has
finished, and the pass needs the Deck to itself.


### D105 — LOCKED 2026-09-15 — The fourth feature session: two features drawn instead of built, the Spy's reveal, the lighter Clear, and the wipe

Eight calls from [plan 56](../planning/56-feature-session-four.md), all answered the same evening.
The session does not start until the maintainer says go. It runs on **Fable 5.1 at extra-high
effort, by the maintainer's choice**, with Sonnet 5 lanes at high, five at most at once, the same
shape as plan 55. With the five-star entry dropped (below), nothing left in the session is above three
stars, so the routing table would ask for Opus here; the maintainer knows and chose Fable, recorded as
their call. The bookkeeper guard keeps the session's own hands off the roadmap, the testing documents,
the changelog and test files; the bookkeeper helper does that typing.

**Session context folding into Show details is drawn, not built.** Its shape was never decided — row,
tab or section inside Show details; per-turn or newest-only; how the D-pad climbs back out; what the
collapsed label says — and it shares files with two of the session's lanes. The maintainer chose to
see the options side by side, at true size, on a mockup page produced at the end of the session, and
to answer the four questions by looking.

**The reasoning display is dropped from this session and drawn on the same page.** Every build call
from 5 September still stands (three live lines at the answer's size, the fold with the seconds only,
live in Strategy mode with one confirm, saved and capped, a chip in Show details, the thinking tips
entry retired). What the 5 September decision left to the maintainer's eye — whether the folded line
works in a character's voice — is exactly what the mockup shows: the live lines filled with real
thinking captured from the Deck's own model on the PC, the plain folded line, and the folded line in
three characters' voices. Nothing is built until they have looked. The spoiler-verdict second job
waits with it.

**The Spy's reveal is a line under Show details.** Nothing in the answer itself: no hidden confession
block at the end (rejected: it puts the joke's answer in the reply), no *Was that true?* button
(rejected: a second model call on a handheld). Show details gains one chip whenever the Spy was on at
a lying level; its body says he was on and lists what he lied about, from a closing tag the model is
told to write. When the model forgets the tag, the chip still appears and says he did not confess, so a
person always learns he was on even when not what he lied about.

**The Spy lies only at the two heaviest accent levels**, the same gate Pyro's bad advice uses. Below
that he stays the smooth honest voice he already is. The floor is Pyro's and is not negotiable: nothing
that can damage the Deck, lose a save, cost money or turn off a protection; wasted time only. The
destructive-advice guard keeps running on his replies.

**The trick where the Spy opens claiming to be a different character is deferred** and becomes its
own roadmap entry. A character has no first message today, so the trick needs a greeting feature
first; that is work in its own right, not a line of prompt text.

**Found on the way, corrected in the roadmap's detail note:** the Spy has been in the character picker
since June, as an ordinary smooth voice. The note saying he was not there yet was wrong when written.
The picker does not change; the feature is the lying and the reveal.

**Clear in the Session context strip means only what the model sees.** The 12 September decision
leaned to the whole session; the maintainer chose the lighter meaning tonight. The plugin sends no chat
history to the model, so what it carries from one question into the next is the subject of the last
strategy question (for a bare follow-up) and the strategy checklist position for the running game. The
button, after the same confirm box Clear cache uses, forgets both and says so with a short toast; the
chat stays on screen and the bar's rows stay, because they are an honest record of what each past turn
attached. Clear cache in Settings gets the same forget in the same change, which closes the gap the 12
September decision named.

**The wipe is pre-authorised for the last step of the Deck pass**, backup first, restore after,
settings read back off disk and compared. The maintainer was told plainly that it also removes the
Deck's own Ollama and every model it downloaded, which the restore cannot put back, and said yes. It
runs after every other Deck check for that reason, and the report says exactly what is gone.

**The Deck is this session's.** The live remote connection from another process seen at 23:44 UTC is
a leftover.

**The dead space above the question box is measured first, and fixed only if one cause is named.**
The honest gain is about 56 pixels of gap and overflow, not the 61 the roadmap implies, because the
chat already scrolls and nothing caps a long reply. If the measurement finds no single cause, the entry
stays open as measured.

**What follows, in one line each.** Seven of the nine build in this session, in five Sonnet lanes plus
two measured items; two go to a mockup page; the roadmap entries for the reasoning display, the fold,
the Spy and the Clear button are reworded to match tonight's calls; a new entry holds the deferred
Spy trick.

### D106 — LOCKED 2026-09-16 — After the fourth feature session: the plain reasoning fold first, the session as a tab, the card's six rows, a Read aloud button, and one call left open

The maintainer's answers to the session's closing report ([plan 56](../planning/56-feature-session-four.md)
§ 10, entry 4), given in chat on 2026-09-16 with the mockup page open
(https://claude.ai/artifact/2De58qirE34754PEZVPmdb). Six items; five are calls, one is a question the
maintainer chose to leave open on purpose.

**1. The Ask bar that looked cut off was not the plugin.** The Deck had been drawing the panel at the
external monitor's size; when the monitor was unplugged the panel kept that size until Steam was
restarted, and the restart put it right. The session's own measurement on a fresh open agrees: nothing
was clipped. No entry, nothing to build; recorded so the next person who sees it knows to restart first.

**2. Whether the settings card keeps the typed words after a jump is left open, on purpose.** Today,
pressing A on a row opens the Steam setting and the words in the box are gone when the person comes
back. The maintainer is not sure yet which they want. The roadmap entry says so and does not wait on it:
the card is done as measured, and nobody builds either behaviour until this is answered.

**3. The card's six-row cap on the built-in screen stays.** The card shows up to eight rows but never
more than fit under the tab bar, which is six on the Deck's own screen, and names the rest as "N more"
in its heading. The maintainer looked at it and called it fine.

**4. The reasoning display builds with the plain folded line; the voiced fold comes later, as an
option.** The first version is what the 5 September calls (D70, D71) already describe, with the fold
in plain words: three live lines at the answer's size while the model thinks, then one folded line with
the seconds when the answer starts, and a press on that folded line opens the whole reasoning, the
"opened" block on the mockup page. The folded line in the character's own voice, which the page showed
in three voices, is not dropped: it becomes its own later entry, an optional extra on top of the plain
fold, built only after the first version is in and looked at. The spoiler-verdict second job waits
with the first version as before.

**5. Session context folds into Show details as a tab within the panel, option B on the page.** As
drawn: the opened Show details panel gets two tabs at its top, *This answer* and *Session · N*; Left and
Right switch between them; the chip row and its body stay where they are; only the newest turn shows
the Session tab, so it never repeats; the collapsed row still says *Show details*; Up from the tabs goes
to Hide details and then Read aloud, Down goes into the chips, and B anywhere inside closes the panel.
Those details were part of the drawing the maintainer picked, so they carry with the pick. One thing
the page did not draw: where Clear sits inside the Session tab. The builder puts it at the end of that
tab's body, the same button with the same confirm, unless the maintainer says otherwise.

**6. New: Read aloud becomes a button with a speaker icon on the Helpful row.** Today Read aloud is a
full-width dividing line above Show details, the same shape as Show details. The maintainer does not
want a second dividing line: Read aloud should be a small button with a speaker icon, on the same row as
Helpful and Not really. Filed as its own roadmap entry, two stars, with what it must keep: a real D-pad
stop, Left and Right along the row, the label flipping to Stop while the Deck is talking, and the
greyed-thumbs step-over from this session must not skip the row once Read aloud lives on it.

**Consequence.** The roadmap's reasoning-display entry moves from "drawn, call owed" to ready to build
with the plain fold, plus a new entry for the voiced fold; the session-fold entry and its open-questions
note record option B and the one Clear detail; the settings-card entry records the six-row call and the
open words-after-jump question; a new entry holds the Read aloud button. The three advice-first replies
the maintainer asked to read are written out in full in
`docs/test-evidence/plan56-KB-ANSWER-03-three-replies.md`, copied from the saved chats in the pre-wipe
backup; that read is still theirs to give.

### D107 — LOCKED 2026-09-16 — Third round: the three replies read well, the card's words stay cleared, the honesty line seen on screen, and five new entries from the maintainer's own hour with the AI models screen

The maintainer's answers to D106's two open items, given in chat on 2026-09-16 in the afternoon,
plus five new reports from their own use of the Deck the same day. Before writing, they had put the
Deck back the way the wipe found it: Ollama installed on the Deck again with gemma4 and
nomic-embed-text, and the knowledge base downloaded again.

**1. The three advice-first replies read as advice-first.** The maintainer read all three (written
out in full in `docs/test-evidence/plan56-KB-ANSWER-03-three-replies.md`) and said they look good.
That closes the read the row had waited for since 12 September. The roadmap entry moves to Done.

**2. The settings card keeps working the way it does today.** The box is empty when a person comes
back from a Steam setting opened through the card. D106's open item is closed; nothing about the card
is owed.

*Correction 2026-09-24: this closed the card's one open call, not its Deck checks. Rows SETTINGS-CARD-06
and 07 had never been run and still have not; they are on the roadmap's Verify list. Reading "nothing is
owed" as "every check passed" is how the card reached Done with two checks missing.*

**3. The honesty line, seen on the Deck's own screen.** The check D106 said was owed ran the same
afternoon on the plan 56 build, with nothing running: *black mesa how do i tame a horse* ends with
"— No close match in my notes, this answer leans on the model's own knowledge." and *how do i beat the
gonarch in black mesa* ends with the note's advice and the follow-up menu, no line. Lane K's fix is
confirmed on the device (`docs/test-evidence/plan56-HONESTY-LINE-03-on-screen.json`). The horse reply
took 151 seconds on the Deck's own model, and the footnote under it reads "150.8s (>60s): prefer GPU
for Ollama, not CPU" in full, so the "blank names" note plan 56 logged from a page read was the reader
splitting the bold words, not the plugin. That note closes as not a bug.

**4. New bug, fixed the same afternoon: the Ollama tab's "Open AI models…" button read like "OpenAI
models."** It now says "Manage AI models…", with the policy tier after the dash as before; the
button's spoken label, the hint inside the picker and the troubleshooting guide say the same. Commit
`79b1a0e`, deployed to the Deck the same afternoon.

**5. New bug: the AI models screen shows about two rows of the model list on the Deck's screen.**
Read in the code, not yet changed: the screen's body is capped at 520 pixels tall (or 72 percent of
the screen if that is smaller), and the parts above the list that never scroll away — the three
section buttons, the counts line, the custom tag box, the Suggested chips, two rows of filters and
the column headers — take about 430 of those, leaving roughly 90 pixels for rows. An external monitor
taller than about 720 pixels gets the same 520 cap, so it looks the same there, which answers the
maintainer's question. The popup itself has room: on the Deck's screen it stands 640 pixels tall. The
fix belongs with item 7's rework of that screen, or before it as a taller list. The maintainer's
recording is `recordings/DeckRecord_20260916_114238_game.mkv` on their PC (the folder is not in the
repo). Two stars.

**6. New bug: after the AI models screen was closed by a tap outside it, the queued models started
downloading and the D-pad could not move in the Ollama tab afterwards.** The maintainer did not
press Done; they think they tapped outside the screen. Two things read in the code, neither proven
on the device: a tap outside closes the popup through Steam's own path, which skips the plugin's own
clean-up (the tab restore and returning the ring to the button that opened the screen), so nothing
owns the ring afterwards; and the last frame of the recording shows the Pull selected button lit, at
the popup's bottom edge, so a tap meant for outside may have landed on it and started the queued
download. Needs a device reproduction with an empty queue, so nothing downloads. Two stars.

**7. New feature: retire the policy tiers as their own section and roll them into the filters at the
top of the AI models screen, and rework those filters.** Mockups first: the maintainer wants to pick
and choose what goes up there for people to filter by when they pull models. Not drawn yet; the page
would be drawn at the Deck's own screen size like the plan 56 page. Three stars.

**8. New bug: Download knowledge base needed two taps; the first did nothing the maintainer could
see.** Read in the code: the first press should open the storage choice popup (internal or SD card)
before anything downloads, and the second tap is what ran the download. Not reproduced; needs a run
with the plugin log on. One star.

**Consequence.** The roadmap: the advice-first read entry and the honesty-line entry move to Done;
the settings-card entry has nothing left owed; the blank-names note closes as not a bug; four new bug
entries and one new feature entry; a changelog line for the rename. The testing rows for the
advice-first read and the honesty line close.

### D108 — LOCKED 2026-09-16 (raised 2026-09-16) — Building the reasoning display: five small calls before the build session

Raised from [plan 57](../planning/57-reasoning-display-build.md) § 7, the build plan for the plain
first version of the reasoning display (the shape is already locked: D70, D71, D106). The plan had
six open items with defaults. The maintainer closed the first the same day: the Deck has its Ollama
and its models back after the plan 56 wipe, so the Deck rows can run on the Deck's own model. One
thing to check before those rows: the knowledge base on the SD card was wiped too, and two of the
rows ask a Strategy question that uses its cards, so it needs to be downloaded again first.

The five left, each with the options and the planner's lean. None of them stops the build from
starting; the defaults are the leans.

1. **What the one-time notice says**, the first time Thinking is moved off Off.
   - Option 1 (lean): two sentences and a question. *"While the AI thinks, its thinking shows on
     screen as it happens. It is not checked for spoilers, so it may mention things the answer
     itself will hide. Show it?"* Buttons: *Show thinking* and *Keep it off*. The spoiler part is
     said in as many words, which is the whole reason the notice exists.
   - Option 2: one line. *"Thinking shows on screen as it happens and is not checked for spoilers.
     Show it?"* Same buttons. Shorter, but "not checked for spoilers" is easy to read past.
   - Option 3: no confirm; a line of help text under the Thinking row only. This reopens D71,
     which chose the confirm, so it is listed for completeness, not recommended.

2. **What happens when the person declines the notice.**
   - Option 1 (lean): Thinking stays Off, nothing else changes, and the notice comes back the next
     time they move it off Off. Nothing to remember, nothing new to build.
   - Option 2: Thinking turns on anyway, but the live lines stay hidden; the stock phrases fill the
     wait and only the folded line shows once the answer starts. The person gets the thinking
     without the live spoiler risk. It is a fourth state to build and a hidden preference to store,
     and the fold still opens to unmasked text, so it only half solves what it sets out to.
   - Option 3: declining means never ask again and stay Off. The person would have to find out on
     their own that the row is dead. Not recommended.

3. **A turn where the model thinks but writes no answer.** The plugin already asks the model to go
   on when it runs out of room; if nothing comes, today's error line shows.
   - Option 1 (lean, for this version): no fold on such a turn. The fold appears only above an
     answer. Keeps the build to the states already drawn.
   - Option 2: the fold shows beside the error line, so an empty reply explains itself. Useful, and
     it answers the maintainer's "paid for and thrown away" point for exactly the turn where the
     thinking was the only thing paid for. But the fold and the error line have never shared a
     turn on screen, so it needs its own drawing and its own Deck row. The lean is to file it as a
     small follow-up entry once the fold exists, not to fold it into this build.
   - Option 3: show the reasoning as if it were the answer, marked as such. Confusing; a reader
     would take the model's notes for advice. Not recommended.

4. **How much saved thinking a turn keeps.** D70 said "a few thousand characters". The deepest level
   reserves about 4,000 characters' worth, and a go-on request can add more.
   - Option 1 (lean): 6,000 characters. A whole Deep think fits, with room for the go-on. Eight
     chats of two hundred turns each would add at most a few megabytes on disk, which is fine.
   - Option 2: 4,000, the number plan 56's contract used. Cuts the tail of a Deep think now and
     then.
   - Option 3: 12,000. Never cuts in practice, but an opened block that long is a scroll problem on
     the Deck's screen, and the live view only ever shows the newest lines anyway.
   - If a think is cut, the lean is to keep the end, not the start: the last sentences are the
     ones that led to the answer. A one-line note at the top says the start was cut.

5. **Order against the session-context tab**, the other Show details change from D106. Both change
   the same transcript file.
   - Option 1 (lean): the reasoning display first, on its own, this plan; the tab in its own
     session after it has landed. The reasoning display is the bigger piece, has the desk test and
     the device measurement in front of it, and the tab would otherwise sit waiting on the shared
     file the whole time.
   - Option 2: the tab first. It is three stars and smaller, so it would land sooner; the
     reasoning display then builds on top of the new panel. Costs the reasoning display another
     wait, and it has already waited since 5 September.
   - Option 3: both in one session, one after the other on the shared file. Saves a session start,
     but makes a long session on the model tier that hits the usage limit most, and a limit hit
     mid-way leaves the second piece half done.

**Consequence if unanswered.** The build starts on the leans: option 1 for every item. Nothing in
plan 57 waits on this entry except that the knowledge base check joins the Deck check before the
Deck rows.

**Answers, 2026-09-16 (the maintainer answered in chat):**

1. **Option 2: the one-line notice.** *"Thinking shows on screen as it happens and is not checked
   for spoilers. Show it?"* Buttons *Show thinking* and *Keep it off*.
2. **Option 1.** Declining leaves Thinking Off; the notice comes back the next time.
3. **Option 1, with a worry attached.** No fold on a turn with no answer in this version. The
   maintainer is worried about how often a thinking model will think and then write nothing, and
   does not want turning thinking on to make the plugin worse to use. So the build session measures
   it before the screen step: the existing answer test runs on the PC with Thinking at Balanced and
   at Deep, and counts the replies that came back empty. If any level comes back empty more than
   about one time in twenty, item 3 flips to option 2 inside this build (the fold shows beside the
   error line, so the person can at least see what the model did), and the cause goes on the
   roadmap as a bug. Plan 57 § 3a carries this as T5.
4. **Option 1.** 6,000 characters, the end kept when cut.
5. **Option 1.** The reasoning display first, alone; the session-context tab after it has landed.

**Consequence.** Plan 57 § 7 records the answers; § 3a gains the empty-reply count; the roadmap
entry is unchanged (still ready to build, calls locked).

---

### D109 — LOCKED 2026-09-16 (raised 2026-09-16) — The open tab strip redesign (Claude Design board 2a): approve the drawing, and three small calls

Raised from [plan 59](../planning/59-tab-strip-redesign-build.md), the build plan for the design
Claude Design handed back on 16 September, answering the brief of 14 September
([design/handoffs/tab-bar-open-strip/](../design/handoffs/tab-bar-open-strip/)). The returned files
are in that folder under `return-2026-09-16/`. Board 2a is the one the design says to build: six
equal cells, every icon the same 22px size, only the current tab's name shown under its icon in
small capitals, a soft fill on the lit cell with no box, LB and RB as pills, a solid bar with a
shadow. The thin bar at rest is unchanged. Nothing about how the bar behaves changes.

None of these stops the build from starting. If unanswered, the build starts on the leans.

1. **Approve board 2a as the design.**
   - Option 1 (lean): **yes, build 2a as drawn.** A yes also settles the two-star roadmap entry
     "replace the bonsAI tab icon with the redesign's" for the strip: the design puts the
     production logo, tinted in the accent, on the Main cell, and that entry asked for a shape the
     maintainer approves by eye. The board is that shape. The plugin's icon in Decky's own list is
     not part of this.
   - Option 2: a different board from the same file (1b to 1g). Each is drawn at 300px with its
     values; plan 59 would need its § 3 and § 5 rewritten for the chosen one.
   - Option 3: send it back to Claude Design with notes. The designer's own note says the three
     Deck photos never uploaded, so its "today" board is a reconstruction; a second round with the
     photos attached would let it true that up. Board 2a itself was drawn from the code's values
     and the real icon files, so this is optional, not a defect.

2. **What the name says under Permissions and Developer when they are the lit tab.** The design
   only ever shows "main" and "settings" lit, and its own note calls "settings" the longest name,
   which is only true if the two long tabs use short words.
   - Option 1 (lean): **"perms" and "dev", always**, at five tabs and at six. The thin bar at rest
     keeps saying Permissions and Developer in full, as it does today. Plan 30's "shorten only at
     six tabs" rule goes, because there is no longer a row of six names to fit.
   - Option 2: the full words "permissions" and "developer". At 9.5px bold they run about 10px past
     each side of their cell, five times the 2px the design allows for "settings". The name sits in
     the lower band, where the neighbouring cells have no name, so nothing collides; it just looks
     wider than its cell.
   - Option 3: today's rule, full words at five tabs and short at six. Keeps the switch between two
     spellings that the rest bar never makes, for a fit problem that no longer exists.

3. **The strip's height.** The brief allowed a taller strip that covers the whole chat row. The
   design kept 54px and added a shadow below the bar that darkens the half-pixel of the chat row
   still showing under it.
   - Option 1 (lean): **54px as drawn; check on the Deck; if the row's dots still peek out, 56 in
     the same build.** One number. The design's own board 1b used 56, so the look holds.
   - Option 2: 56px from the start. Covers the row outright; two more pixels of the answer area
     hidden while the strip is open, which is only while the D-pad is on the bar.

4. **The fallback if the small capitals look too small on the Deck.** Steam's font most likely has
   no true small capitals, so the browser makes them by shrinking full capitals. That can land the
   visible letters near today's 8px, which was the complaint.
   - Option 1 (lean): **plain capitals at the same 9.5px bold.** One line to change on the device
     evening, so the by-eye row does not stall waiting for a call.
   - Option 2: plain lowercase at 9.5px bold. Reads as the word, not a label; the design chose small
     capitals over this.
   - Option 3: small capitals at 10.5px. Keeps the look and buys size back; the overhang on
     "settings" grows to about 4px.

**Answers, 2026-09-16 (the maintainer answered in chat, the same day):**

1. **Option 1.** Board 2a is approved as drawn. The two-star "replace the bonsAI tab icon" entry
   closes for the strip with this build; the production logo is the shape.
2. **Option 1.** "perms" and "dev", always.
3. **Option 1.** 54px as drawn, checked on the Deck, 56 in the same build if the dots still peek
   out. The maintainer's words: it must not look sloppy.
4. **Option 1.** Plain capitals at the same 9.5px bold if the small capitals read too small. The
   maintainer's words: no bigger than they need to be, not ugly, just big enough to be readable and
   neat.

**Consequence.** Plan 59 § 4 records the answers; the roadmap gains the Features entry for the
build; the two-star tab-icon entry folds into it. Nothing else in plan 59 changes.

**Correction, 2026-09-17, to item 3: the open strip is built about 66 pixels tall, not 54 or 56.
The 14 September Deck photo and the desk render both put the chat row's dots 6 to 10 pixels below a
54 strip, so 56 would not have covered them. Shown a mockup of three heights drawn over that photo
(54 as drawn, about 66 covering the dots, about 72 covering the whole chat row), the maintainer
chose the middle one: cover the dots, leave the rest of the chat row. The exact number is confirmed
on the Deck (plan 59 row 2A-07).**

**Addition, 2026-09-17: for Astarion the lit colour is the designer's hand-picked lighter grey
(#c3d0d1) rather than the rule's answer, by the maintainer's choice from a side-by-side mockup. The
rule (lift toward white until the colour reads at 6:1 on the bar, else leave it) stays for every
other character.**

### D110 — LOCKED 2026-09-16 (raised 2026-09-16) — The suggestion chips as real buttons (Claude Design board B): six calls before the build

Raised from [plan 60](../planning/60-chip-button-restyle.md), the build plan for the design Claude
Design handed back on 16 September, answering the brief of 14 September
([design/handoffs/preset-chips/](../design/handoffs/preset-chips/)). The returned files are in that
folder under `return-2026-09-16/`. Board B, "a real button", is the locked direction, with the
toned-down accent from board A: a top-lit, bottom-dark chip with a hairline on its top edge and a
soft shadow beneath, the two chips 6 pixels apart instead of 4, the character colour on the badges
and tags quieter, and the chip the D-pad is on marked by a thin light bar along its bottom edge in
place of the pale blue outline. Italics were tried on board A and rejected. The maintainer answered
all six the same day; nothing is built, and the build runs in a later session.

1. **The Tip badge becomes the dot from the boards.** On screen today it is the word "TIP"; the
   boards drew a 7 by 7 square dot with 2 pixel corners in the character's colour at 80 percent.
   The plan leaned toward keeping the word; the maintainer chose the dot. The amber Test badge stays
   a word (a checking-only state that has to be obvious).

2. **Steam's white ring stays. The bar goes under it, and if the two cannot show together on the
   device, the ring wins and the bar is dropped.** The ring, the hairline, the shadow and the bar
   are all drawn with the same property and the ring's rule is set to win, so the build merges the
   lists for the focused chip and a test guards the merge. The maintainer's words: fine to stick with
   Steam's white ring if the board's look cannot be brought in. The pale blue outline goes either way.

3. **The gap the maintainer asked for is the one to the question box, about half a pixel.** The
   brief had left the designer to choose, and they widened the gap between the two chips instead.
   Both happen: the designer's 4 to 6 between the chips stays, and the 12 pixels from the row to the
   question box become 13 (half a pixel cannot be drawn; one is the smallest step). The maintainer
   expects the shadow beneath a chip may need tuning so it does not make the row look glued to the
   box; the board's 2 pixels down and 3 of blur is the ceiling, tuned by eye on the device.

4. **No pressed look.** The board's sunk state (gradient flipped, chip down 1 pixel) is not built,
   not for touch and not for an A press.

5. **The green help chip and the orange agent suggestion chip get the raised look too**, keeping
   their own colours.

6. **The decode-mode label is toned** with the same 70 percent accent, 30 percent label-colour mix
   as the `[beta]` tag.

**Measured on the Deck 2026-09-17, before the build, and two of the calls above rest on a wrong
premise** (evidence `docs/test-evidence/plan60-measure-before.json`; plan 60 § 10). First, the gap in
item 3: in decode, static and carousel mode the chip row sits directly on the question box today,
0 pixels, not 12; only fade mode has the 12. The maintainer's Deck is in decode mode, which is the
gap they were seeing. The build gives every mode 8 pixels under the chips (5 taken by the shadow, 3
clear) and leaves fade mode at its 12; the maintainer judges by eye on the device whether 8 reads
as open. Second, the ring in item 2: Steam's white ring has not been visible on a chip since the row
started clipping on 2026-09-01, because the ring is drawn outside the chip and the chip fills the
row. A focused chip shows only the thin blue border. So the ring rule stops targeting the chips
(it was drawing nothing a person could see, and with room added under the row its bottom edge
would have peeked out as a white line), and the bottom bar becomes the chip's focus cue, as the
design intended. White rings stay everywhere else. Both calls made by the one running the session
under the maintainer's "build now"; either can be reversed from the device evening.

### D111 — LOCKED 2026-09-17 (raised 2026-09-17) — 58 phase 1: the note's own words on screen, and wiki notes taken without rewriting — nine calls before the build

Raised from [the phase 1 plan](../planning/58-phase-1-notes-shown-and-wiki-extracts.md), written the
same day after a read of the knowledge base against the production RAG lessons. The maintainer
answered all nine the same day; nothing is built.

1. **The block's look: not answered yet, by design.** The maintainer's reply was "I don't even know
   what you're asking", which is fair because the block has to be drawn before it can be chosen.
   Lane A draws three versions at true size, the maintainer picks one, and the pick is added to this
   decision then.
2. **Trim only stands unless overturned.** The maintainer asked back: "Are you saying whether or not
   the AI can create facts? Or are you saying that the AI can riff off of the notes that it
   receives?" Both, in different places: in the reply the model still riffs off the notes it is
   given, unchanged; in the library an AI may never write a sentence into a wiki note, it may only
   cut. Trim only stands unless the maintainer says otherwise before lane B is briefed.
3. **Reopen the July no-new-games lock: "Yes".** The catalog phase starts here.
4. **The ten games (Mario Party 1, 2, 3, 6 and 7, Donkey Kong 64, Yoshi's Story, Diddy Kong Racing
   from the Super Mario Wiki; the first Smash game from SmashWiki; GTA III from the GTA wiki): "Add
   them, but verification of their facts might need to come from the feedback thumbs."** All ten are
   in. The maintainer does not expect to check each wiki note by hand; a thumbs-down that stops a
   wrong note coming back is the check they have in mind. That is the Phase 7 "demote" entry on the
   roadmap, not in this phase, recommended as the next build after phase 1.
5. **The walkthrough wiki at strategywiki.org:** the maintainer read its page footer in a browser on
   2026-09-17: "Content is available under Creative Commons Attribution-ShareAlike 4.0 unless
   otherwise noted." Share-alike 4.0, usable, recorded as footer evidence with the date; the
   machine-readable licence field could not be read because scripted reads are refused by a bot
   check.
6. **Keep the 99 notes and 159 tips written from AI memory: "Yes".** They stay, labelled as bonsAI's
   own notes with no source.
7. **Read aloud: "Screen only".** The block is never read out.
8. **The publish step: "I'll decide that later, you just work on improving it on disk."** Phase 1
   builds the library and installs it on the Deck from a local folder; nothing is pushed to the
   public download hosts; the publish call stays open, and the corrected Hades note waits on it.
9. **Time and the Deck: "Take as long as you need, nothing else is going on."** No time limit; the
   Deck is free.

### D113 — LOCKED 2026-09-19 (raised 2026-09-18) — Plan 61 automated verification session: the thirteen questions

Raised from [the plan 61 session](../planning/61-automated-verification-session.md) § 8, written before the
device work began. The maintainer answered all thirteen on 2026-09-19. D112 is left to the 58 phase 2 plan
and is not written here.

1. **The Deck handover while another session held it.** The recommended answer, (c) — message the other
   session, let it take its four readings, then take the Deck and say so — is what happened.
2. **Model pulls.** The recommended answer was yes to two small models under a gigabyte, no to a large one.
   **Overturned 2026-09-19: "You can download models."** Pulls are allowed, the large one included.
3. **The wipe (Clear all plugin data).** Recommended answer taken: not run tonight, the two rows that depend
   on it stay owed.
4. **Removing the knowledge base to hunt the two-taps download bug.** Recommended answer taken: no, stays
   owed.
5. **B while Show details is open.** Recommended answer taken: B should close the panel; this becomes a
   small fix for a later lane, not a verification item.
6. **The question row behind the Retry icon.** Recommended answer was yes, if it reads fully visible on
   every walk. **Closed by the maintainer 2026-09-19.**
7. **Reduced motion.** Recommended answer taken: stays on the maintainer's own page; the rig does not touch
   Steam's own settings.
8. **New pinned test sentences without waiting for a yes each time.** Recommended answer taken: yes, for
   that one night only.
9. **Launching and exiting the games one at a time, Deck on power.** Recommended answer taken: yes.
10. **The relevance-floor row's off-topic half.** Recommended answer taken: reword the row to match what was
    already accepted, rather than reopening the accepted entry.
11. **Refreshing the maintainer's own page at the end.** Recommended answer taken: yes.
12. **Which screen.** Recommended answer taken: the built-in screen.
13. **Six entries one step from Done.** The maintainer answered in these exact words on 2026-09-19:
    (a) Pulled models joining the try order: **"try them in the order the user set."**
    (b) Clear all plugin data leaving three things behind: **"keep that current behavior."**
    (c) The global quick-launch macro: **"drop it."**
    (d) The game a chat belongs to, shown above its title: **"yes."**
    (e) The Cancel button on a knowledge-base download: **"keep."**
    (f) A checklist the model got wrong, left in a reply as raw text: **"keep."**

What each answer does to the roadmap:

- **(a)** stays in Verify. The large-model half of this row can now be run, since downloads are allowed
  (question 2, overturned above). The maintainer's own words are quoted, not reinterpreted: this decision
  does not settle what "the order the user set" means for the existing rule that a large pulled model jumps
  to the top of the try order — that question is flagged back to the maintainer, unanswered.
- **(b)** closes to Done. The wipe itself was proven on the Deck on 2026-09-16; the three underscore-spelled
  flags this fix targets are proven only by their tests and have never been seen going with the rest on a
  real device.
- **(c)** moves to Shelved. Dropped on the maintainer's word, never run on real hardware. It comes back only
  if the maintainer asks for it again.
- **(d)** moves back to Features. The maintainer said yes to showing the game's name above a chat's title.
  That name already shows for every chat made after 2026-08-30. The variant where it only shows while the
  row has focus was never built, and this decision does not choose it — that stays open for a later build.
- **(e)** the Cancel button itself stays as it is, on the maintainer's word. The Deck check for it moves to
  Shelved: the download finishes in about a second, too fast to press Cancel in, so the check has nothing to
  run against until a throttle or a slower test copy exists.
- **(f)** closes to Done, as proven by its unit tests, with a watch note: if a raw, unparsed checklist is
  ever seen in a real reply on the Deck, this reopens as a fresh bug rather than staying closed on the
  strength of an old fix.

### D114 — LOCKED 2026-09-20 (raised 2026-09-20) — Plan 62 feature session five: the nine calls off the drawing board

Raised from [the drawing board](https://claude.ai/artifact/31aLBi17SH7AydhYfGYjBq), which drew all four
features at the Deck's own sizes before anything was chosen, and from
[the plan](../planning/62-feature-session-five.md) § 8. The maintainer picked four shapes on 2026-09-20 and
answered the three remaining calls the same day. Nothing was built first.

1. **The game a chat belongs to.** Chosen: **the name shows only while the ring is on the row.** The empty
   line stays held open, so the row is the same height either way. This settles what D113 (d) left open.
2. **Read aloud.** Chosen: **a small speaker at the right-hand end of the Helpful row, drawn as a bare glyph
   on nothing** — no border, no fill — the same treatment as the microphone in the Ask box. The full-width
   line goes.
3. **Session context folding into Show details.** Chosen: **Clear sits at the end of the Session tab's body,
   full width, with the same confirm box.** This was the last thing D106 left undrawn; nothing about that
   feature is open now.
4. **The AI models screen filters.** Chosen: **every filter goes behind one "Filters · N on" line** that
   opens a panel over the list, grouped under headings.
5. **Which filters are offered.** Six: licence (the old Policy tiers as one filter), Speed / Strategy /
   Expert, Vision, Installed only, Essentials only, and Recently added. **Coding is dropped** as rarely
   wanted on a Deck. **"FOSS only" is dropped as a separate switch**, because the licence filter covers it
   and two controls that can disagree is worse than one.
6. **Three more jobs in the same work:** let the screen use more of the popup it sits in, move the "type any
   model name" box to the bottom, and get the counts line onto one line. **Amended the same day — see
   call 10.** Two of these three turned out to buy no height at all, so the list was rebuilt around what
   actually buys room.
7. **The chat name sitting 14 pixels off-centre** — found while drawing feature 1, never reported before.
   Chosen: **take the × out of the centring**, so the game's name, the chat's name and the dots all sit on
   the row's true middle. The cost is accepted: about 28 pixels, roughly three characters, comes off the
   chat name so a long name cannot run under the ×.
8. **How faint the speaker is at rest.** Chosen: **45 per cent**, not the microphone's 15. Quiet but
   findable, and still full strength the moment the ring lands on it. Worth one look by eye on the Deck once
   it is built, because screens lie about faint things.
9. **The section buttons on the models screen, once Policy goes.** Chosen: **Advanced moves out of the
   section row.** First given as a button at the bottom; **amended the same day** once it was clear that a
   button at the bottom costs back what the row cost at the top. It becomes a small link in the screen's
   own title row instead, out of the scrolling part of the screen, which is worth about 38 pixels.

10. **The rule for the models screen, in the maintainer's own words:** *"I don't need the ordering fixed,
    I need to buy room. Don't change it if it doesn't give more space."* Given 2026-09-20 after two claimed
    savings were withdrawn. It heads that feature's section in the plan and settles the shape of the work:
    ordering and tidiness are not worth a commit on this screen. Two jobs came off the list (the tag box
    below the list, Advanced as a bottom button) and two better versions went on (the tag box behind a
    small button, about 32 pixels; Advanced as a title-row link, about 38). **What the rule also surfaced:**
    the model list is capped a second time by its own box — 48 percent of the screen height, or 400 pixels,
    whichever is smaller — inside the cap the two-row bug names. If that inner one is the limit actually
    biting, raising it is worth more than everything else on the list together, and it is the session's
    first measurement.

11. **Which room-buying changes go into the models screen.** The board drew all six at the real 569-pixel
    width and measured each gain from its own drawing. **The maintainer took all six on 2026-09-20**, the
    two that cost a person something included. In the order they are worth doing: let the list's own box be
    taller (value unknown, measured first, costs nothing); the suggested models off the top (~49 px, they
    move into the Filters panel); Advanced as a link beside the screen's name with the section row gone
    (~44 px); "type a model name" as one chip on the filter row (~32 px, one extra press); two rows of
    filter chips down to one line (~30 px, the shape already picked); the counts line shortened and its
    28-by-24 refresh button shrunk (~9 px). All six together take the drawing from five rows to eleven.
    **Two figures were corrected by measuring rather than by hand:** the counts line is worth about 9 rather
    than 14 to 23, because its height comes from the refresh button and the text does not wrap at that
    width; and a small "type a name" button on its own row saves only about 2, because the row is what
    costs, not the box — hence the chip on a row that already exists.
12. **What the drawing found, which outranks all of call 11.** At the sizes in the code today's screen
    should already fit about **five** model rows; the maintainer counted **two** on the Deck on 2026-09-17.
    Something else is squeezing the list, so none of the six is certainly the fix. **Change 1 therefore
    becomes the session's own job in block 0 rather than a lane's:** measure which limit is biting, and if
    it is the list's own box, change that one value, rebuild, deploy and re-count on the device. The bug
    may close in the first hour. If the cause is something else, it goes in the report and the roadmap and
    the other five are re-judged against the real number, never quietly dropped.

What these do to the roadmap: all four feature entries were reworded the same day with the chosen shape and
a link to the board. Two new things were opened along the way — the chat name being off-centre, folded into
feature 1 rather than filed on its own because the same lane is already in that file, and the check everyone
runs before a commit being red on a clean tree, found while writing the plan.

### D115 — LOCKED 2026-09-21 (raised 2026-09-21) — Plan 63 bug-fixing session: the ten calls before block 0

Raised from [the plan 63 session](../planning/63-bugfix-session-four.md) § 2, written before the session
began. The maintainer answered all ten on 2026-09-21.

1. **The failing pre-commit check.** Trim the three documents back under their limits. Not a new baseline,
   not raised limits.
2. **The seven focus bugs that share one file.** The session does them itself, in order. No lane, even with
   measurements in hand.
3. **What may happen on the Deck unattended.** Deploy builds, launch and quit games, change settings and put
   them back, download models. The 17 GB model still needs a separate ask.
4. **How deep into the knowledge-base bugs.** Code-shaped ones only. The note-rewriting ones wait for a
   notes session.
5. **The licence filter hiding 9 of 26 models.** Keep it — a filter should filter. The entry closes.
6. **The UI size setting.** Cut the choices to what is real. Not the full wiring job.
7. **B on the open details panel.** Accepted as it is. The entry closes as accepted behaviour, no code.
8. **Clearing the cache mid-answer.** Goes on the maintainer's own checklist. Five device tries is enough.
9. **The stuck-panel bug.** Watch for it across the night, do not chase it. Count presses; silence across a
   few hundred is the evidence.
10. **The roughly thirty old working copies.** Clear the finished ones, keep any holding work that never
    landed.

What these answers do to the roadmap:

- **(5)** closes to Done. The AI models list showing 17 of 26 models on the default setting is the intended
  shape, not a bug; nothing changes in code.
- **(7)** closes to Done as accepted behaviour. Pressing B on the open Show details panel stays as it is; no
  code follows.
- **(8)** the mid-generation half of "Clear cache cleared the screen but not the session" moves off this
  session's Verify list and onto the maintainer's own checklist. It stays recorded in Verify with a note;
  the rest of that entry is unchanged.

### D116 — LOCKED 2026-09-23 (raised 2026-09-23) — Plan 64 big verification session: the ten calls before flow 0

Raised from [the plan 64 session plan](../planning/64-big-verification-session.md) § 10, written before the
session began. The maintainer answered all ten on 2026-09-23, the first four while the plan was being
written and the other six just after.

1. **New chats.** Four checks need a brand-new chat, and each new chat pushes out the oldest of the eight
   saved ones. Yes: back up first, and put the eight chats back exactly at the end.
2. **Which known bugs to fix this session.** New bugs found tonight, plus the D-pad bugs already measured
   on the Deck and the small shared-tip bug. Nothing rated five stars, and not the spoiler safety net.
3. **A large model downloaded with the high-memory switch goes to the top of the try order**, as the code
   does now. This replaces the 19 September reading of "tried in the order the user set" for this one
   case. The 17 GB check runs as written.
4. **Publish the 2026.09.18 knowledge-base library** to both public download hosts. Yes.
5. **The preload timing check** may switch Ask to a small model for the timing, then switch it back. Yes.
6. **The two thinking-line checks** close after five clean tries, each worded differently, since unit
   tests cover the fix. Yes.
7. **The library format check** (the last August knowledge-base check) is retired as covered by its unit
   tests. It could only run by replacing the library under test.
8. **KB-ATTRIB-01 is reworded** to match the 21 September fix: a reply built only on bonsAI's own
   hand-written notes now names them under "No source page", and that is the fix working.
9. **The screen:** checks run on the Deck's own screen, not the monitor.
10. **Where the library lives:** the rig may remove the installed library and download it fresh through
    the plugin's own first-time download button, onto the **SD card**. That also tests the two-taps
    download bug, which needs a Deck with no library installed.

What these answers do to the roadmap:

- **(3)** the try-order entry's large-model half runs as written.
- **(4)** and **(10)** the ten-games entry's publish call and storage choice are made.
- **(6)** the thinking-line entry closes after five clean, varied tries.
- **(7)** the library format check is retired.
- **(8)** the KB-ATTRIB-01 call leaves "Calls waiting on you".
- The others change no entry.

### D117 — LOCKED 2026-09-24 (raised 2026-09-23) — Plan 65 trim and split: the seven calls before go, and the calls made during the night

Raised from [plan 65](../planning/65-trim-docs-split-long-files.md) § 9, written before the session began
(while plan 64 was still running on the Deck). The maintainer answered all seven the same day,
2026-09-23, before "go".

1. **How many helpers at once?** Five within the house rules (three on code, two on documents); five
   that may all split code; or three in all, gentler on the shared allowance. **Five, and all five may
   split code** — past the three-at-once rule, on purpose.
2. **Which files beyond the eleven?** The back end's front door, the Ask logic, the question builder.
   **All three.**
3. **How far to split each file?** About half; down to the 400-line house number; or one or two pieces
   each. **About half.**
4. **The four files plan 64 will most likely change** (transcript, Ask bar, main screen, Ask logic).
   Split now and carry its fixes across, or wait for it to finish. **Split now, land them last; the
   session carries fixes across.**
5. **The testing rows and the manual checks.** Wait for plan 64, or trim now around its rows. **Wait
   for plan 64.**
6. **The Deck check.** One combined check, one per file, or a later session. **One combined check, this
   session.**
7. **Stop the big files growing back?** A hard limit, a warning only, or nothing. **A hard limit**: a
   file over 800 lines of code may not grow; comments do not count.

The calls made during the night, not raised in advance:

- Lifting a whole block of hooks out into its own hook, called from the same spot and proved by the
  hook-order script, was allowed once the first split came back only 7% smaller with hook calls left
  untouched.
- The settings-snapshot move was left out of the main screen's split, because it copied a 48-field list
  twice; the rest of that file's split landed without it.
- The testing documents started as soon as plan 64 finished, in the same overnight run, rather than
  waiting for a separate session.
- The document helpers moved older, superseded history out to an archive rather than rewording the rows
  that stayed.
- Five decisions were kept open for doubt (D38, D41, D74, D75, D82); four were moved to closed on their
  own "settled by" line (D40's second entry, D53, D54, D81).
- Raising a growth limit needs its own step with a written reason, closing a loophole where recording a
  new baseline could silently raise a limit too.

### D118 — LOCKED 2026-09-24 (raised 2026-09-24) — Plan 68 the chat sums itself up: the calls from discovery

Raised during a discovery session on 2026-09-24, before [plan 68](../planning/68-chat-sums-itself-up.md)
was written. The five calls of 2026-09-20 in the roadmap entry still stand (the summary goes into the next
question; it is written right before the next question, only when the chat outgrows its room; Compact
replaces Clear; the spoiler standing goes with the summary; the summary shows in the Session tab under the
button). These are the calls made on top of them. Every option was drawn at true size on the
[mockup page](https://claude.ai/artifact/CrP6C7jACWBuWdKfLu7Em2) before it was picked; its first version
holds the options side by side, its current version only the picks.

**What it does**

1. **Who writes the summary.** The Deck's own AI, the model that is about to answer, with thinking off.
   Not picked: the plugin trimming turns without the AI (close to today), or the plugin first and the AI
   only when trimming is not enough.
2. **What the AI gets afterwards.** The summary plus the newest turns word for word, never fewer than
   the newest two questions and answers. Not picked: the summary alone.
3. **Pressing the button yourself** writes the summary right away, while you watch. Not picked: marking
   the chat and writing it before the next question.
4. **A game is running when the chat outgrows its room.** Sum up anyway. Not picked: waiting until the
   game closes; asking first.
5. **No setting** to turn automatic summing-up off.
6. **No warning beforehand.** Not picked: a line saying "this chat will sum itself up in about 3 more
   questions"; a fullness bar.
7. **Stop during the summary** stops everything: no summary, no answer, the chat unchanged, and the next
   question tries again. Not picked: skip the summary and still answer.
8. **If the summary fails or times out**, the question is answered the way it is today, one line says
   the summary did not happen, and the next question tries again. (Proposed as a default; not objected
   to.)
9. **Clear's two jobs.** The remembered strategy subject becomes part of each chat: a new chat starts
   with none, and an older chat gets its own back. The running game's checklist ticks stay with the
   game. Not picked: New chat also clearing the ticks; the summary clearing both.
10. **Language.** The person's reply language. Not picked: always English.
11. **Editing.** Read-only; pressing the button again writes a fresh one. Not picked: removing a line;
    editing the text.
12. **An old chat far too long for one pass** sums up only its newest part, in one wait, and says the
    oldest turns were left out. Not picked: several passes over all of it.
13. **A chat that changes game** needs nothing special: a question that names a game already wins over
    the chat's memory. Not picked: suggesting a new chat; one summary part per game.
14. **Spoiler chance** (the look-back rating) gets its own plan, later. This plan still makes sure a
    summary never repeats a hidden note.

**What it looks like**

15. **How the chat tells you.** A note under the answer that came right after summing up: *"The chat
    summed itself up before this answer. Press to read what it kept."* On the newest answer, pressing it
    opens Show details on the Session tab. On older answers it is plain text. Not picked: the "earlier"
    pill saying it; a summary card at the top of the chat.
16. **The wait.** One line with a spinner and a live timer, *"Summing up the chat so far · 12 s"*. Not
    picked: the summary's own words scrolling by under it.
17. **Where the button goes.** At the top of the Session tab, the summary right under it, the turn list
    below. Not picked: where Clear was, at the bottom; three buttons side by side.
18. **No confirm box.** Nothing is deleted. Not picked: a "Sum up this chat?" box.
19. **The button's words.** *Sum up this chat*, then *Sum up again*. Not picked: *Compact this chat*;
    *Compact*.
20. **No extra record on the answer.** The note is enough. Not picked: a *Chat summed up · 16 turns ·
    24 s* chip in that answer's Show details.

**Defaults proposed during discovery and not objected to:** the Session tab shows whenever the chat has
a question in it (its label already does; its body now shows the button even when no turn attached
anything extra; what its number counts is plan 68 § 8 question 4); the button is greyed out, with a reason, while an answer is being written or when the
whole chat still fits; closing the plugin mid-summary does not stop it; the summary stays around 200
words however many times it is rewritten; it is saved inside the chat's own file; the summary is never
read aloud; Settings' own *Clear session* is unchanged.

**The one gate.** The plan's first step measures the real wait on the Deck. If it is over a minute with a
game running, the build stops and the number goes back to the maintainer before anything else is built.

**Found during discovery:** since 2026-09-21 the Session tab's Clear box says "Start the next question
fresh?", but the chat's own memory still goes with the next question, so the box promises more than it
does. The plan removes Clear, which ends it.

What these answers do to the roadmap: the entry "The chat sums itself up instead of being cleared" gets a
link to plan 68 and loses its "Compact replacing Clear" wording in favour of *Sum up this chat*; its
spoiler chance rating becomes a separate, later piece.

### D119 — LOCKED 2026-09-24 (raised 2026-09-24) — Plan 69 streamed answers scramble into place: the calls from discovery

Raised during a discovery session on 2026-09-24, before [plan 69](../planning/69-streamed-answers-scramble.md)
was written. Every choice was tried on the working [mockup](https://claude.ai/artifact/Vr8xPftAhcUK4bQf9AYUo4)
at the Deck's true size before it was picked. Calls marked *proposed* were put forward during discovery and
accepted with "go with your leans".

**Measured first, at the maintainer's request (Deck, not a fast PC).** The Deck's model writes evenly (a
piece every 50 ms with a game running), but the plugin passes text on only in 4 KB lumps, about every
1.5 to 2 seconds with a game. The panel draws 8 to 40 frames a second while answer text appears with a game
running. Evidence: [scramble-stream-timing-2026-09-24.json](../test-evidence/scramble-stream-timing-2026-09-24.json).

**What it does**

1. **No blinking block** while the scramble is on, neither where letters settle nor at the end. Not
   picked: at the settle point like the chips; at the end like today; both.
2. **Spaces stay spaces.** Not picked: spaces scramble too, like the chips.
3. **When the answer finishes, the last letters finish settling.** Not picked: snap to real text.
4. **The thinking lines never scramble.**
5. **How letters settle is a Developer tab choice** — *Settle after a moment*, *Chip pace*, *Fixed tail* —
   until the right one is clear. **Default: Settle after a moment, 300 ms per letter** (*proposed*).
   *Fixed tail* keeps 10 letters (*proposed*).
6. **The colour of scrambled letters is a Developer tab choice** — same as text, dimmer, bonsAI green,
   streaming cyan. **Default: same as text** (*proposed*).
7. **No sliders.** The settle time and tail length are narrowed in the mockup first.
8. **Reduced motion shows plain text.**
9. **Stop turns scrambled letters real at once.**
10. **Closing and reopening the panel mid-answer** shows the earlier text plain; only new text scrambles.

**Where it lives**

11. **A new *Animations* section on the Developer tab**, and the *Preset suggestions* picker moves into
    it (*proposed*).
12. **The switch is called *Scramble animation*.** Off by default.
13. **The style and colour rows hide while the switch is off.**

**The bar and the fix**

14. **The hold-up fix is part of this work, done first, proved on the Deck on its own.**
15. **The scramble must not make the panel's frame rate worse** than it is today while text appears.
    "Not worse" means the usual frame rate within 10% and the longest single frame no more than 20 ms
    longer, over three runs each way (*proposed*).
16. **If the scramble is worse**, try reshuffling half as often and measure again; if it is still worse,
    it does not ship and the numbers go back to the maintainer (*proposed*).
17. **The hold-up fix faces the same bar**; if it is worse, the build stops and the numbers go back to
    the maintainer before the scramble is built (*proposed*).
18. **The game's own frame rate is measured too**, once after the fix and once with the scramble, from
    screenshots with Steam's performance overlay on (*proposed*).

What these answers do to the roadmap: the scramble entry gets a link to plan 69, and the accepted bug
"Token streaming reveals text in bursts while a game is running" gets its cause and a pointer to plan 69's
first step.
