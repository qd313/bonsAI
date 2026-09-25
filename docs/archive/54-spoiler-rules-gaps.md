# 54 — Spoiler rules: closing the gaps between the rulebook and the code

Written 2026-09-14 from a read of the code against [spoiler-constitution.md](../planning/spoiler-constitution.md).
The rulebook is mostly in the code and working. Four gaps remain, all at the edges. This document says
what a person notices for each one, what causes it, how to close it, and in what order. No code is
written yet. The calls at the end wait for the maintainer and get a number in the decisions file when
answered.

Read first: the constitution; [04-strategy-spoiler-false-positive.md](04-strategy-spoiler-false-positive.md)
for the earlier fix and its Deck rows.

**One sentence:** the prompt side knows a game by name and understands how people type a boss's name;
the screen side knows neither, so a spoiler box the model draws anyway stays shut when the rules say it
should be open — send the screen what the backend already worked out, then sign the Deck rows off.

---

## 1. What works today

- A game is sorted into "no story to protect" or "protect the story". Both sides of the plugin use the
  same lists, and a shared test keeps them matching.
- The prompt changes by game. A no-story game is told not to fence routine boss tactics. A story game
  gets the careful wording. Naming a boss opens just that boss.
- Saying "spoilers are okay" opens every box for that turn, older answers in the thread included. Turning
  masking off in Settings shows everything as plain text.
- The risk chip under Show details reports how spoilery the turn looks. Consent does not move it; naming
  a boss lowers it.
- A box the turn qualifies to open streams as plain text from the first word, with no "hidden until
  complete" chip.

None of this changes.

## 2. The four gaps

### Gap 1 — The screen does not know a game by name

**What a person notices.** Playing an emulator shortcut such as Doom 64 or Super Mario 64, or any game
in the name-only part of the table, they ask a boss question in Strategy mode. The prompt is told not to
fence. If the model fences anyway, the box stays shut on screen and they have to tap to see routine
tactics. Steam games with an ID are unaffected.

**Why.** The screen side is handed only the Steam ID of the game the question was asked against. It is
never handed the name. The name lookup exists on the screen side and is tested, but nothing calls it.
Ten games are reachable by name only today; the rulebook noted this for one.

**Fix.** Carry the game's name alongside the ID from the ask through to the answer box, and save it on
each turn the same way the ID is saved, so a reopened chat gets the same answer. Then pass the name into
the unwrap check. Small change, one file on the way in and three on the way through.

**Proof.** A unit test where a turn with no ID and the name "Doom 64: Retribution" opens its boxes. A
second test where a story game by name ("Fallout: New Vegas") keeps them shut. The contract fixture
gains one case each way.

**Size.** ★. Cause known.

Code: `unwrapAskedEntitySpoilerFences.ts`, `buildAnswerBubbleElement.tsx`, `MainTabChatTranscript.tsx`,
`useBonsaiAskOrchestration.ts` (the per-turn stamp), `chatSlotTurns.ts` (saved turns).

### Gap 2 — The screen understands fewer ways of naming a boss than the prompt does

**What a person notices.** They type "wheatley fight" or "how do I deal with the exploders". The prompt
side recognises the boss and relaxes the rules for it. If the model still draws a box around that boss's
tactics, the screen does not recognise the name in the question and leaves the box shut. The only
phrasings the screen understands are "how do I beat / defeat / kill / fight / survive X" and "tips for X".
This is the phrasing most people use on a controller, and it was the whole point of the August fix on the
prompt side.

**Why.** The screen side has its own small copy of the "what did they name" guess, written before the
prompt side learned name-first phrasing, "deal with", "use / counter / play as", and matching the titles
of the attached game notes directly. The backend works out the named thing on every turn and then does
not send it to the screen.

**Fix, recommended.** Send the backend's answer to the screen. The ask result already carries "consent
was in effect" per turn; add "the thing they named" next to it. The screen stores it on the turn, and
the unwrap check uses it first, falling back to its own guess only for chats saved before the change.
Then the two sides can never disagree, and there is one guess to maintain instead of two.

**Fix, not recommended.** Copy the Python guess into TypeScript. More code, and two copies to keep in
step by hand, which is the situation the shared contract test exists to prevent.

**Proof.** A unit test where the unwrap opens a box because the turn carries the backend's named thing,
with a question the screen's own guess cannot read. A test that an archived turn carries the name. A
Python test that the ask result includes it. The mid-stream check uses the same gate, so one test that a
name-first question streams as plain text.

**Size.** ★★. Cause known.

Code: `game_ai_request.py` (the result dict), `backgroundAsk.ts` (the type), `useBonsaiAskOrchestration.ts`,
`unwrapAskedEntitySpoilerFences.ts`, `buildAnswerBubbleElement.tsx`, `chatSlotTurns.ts`.

### Gap 3 — A game recognised only from the question gets the careful prompt

**What a person notices.** With nothing running they ask "drg survivor what class". The risk chip says
low, because the plugin worked out the game from the question. The answer is fenced anyway, because the
prompt was written as if the game were unknown. The chip and the answer disagree. On story games nothing
is different, since unknown and story get the same careful wording.

**Why.** Deliberate. The name read from the question is kept out of the prompt so the reply never claims a
game is running when none is. The risk chip is handed the resolved profile; the prompt is not.

**Fix.** Hand the prompt the resolved profile, not the name. The profile is already computed for the
chip on the same turn. The prompt then relaxes for a no-story game named in the question, and still
never says the game is running. One argument added to one call.

**Proof.** A Python test that a no-story game named in the question with nothing running gets the relaxed
wording, and a story game named the same way does not.

**Size.** ★. Needs a yes from the maintainer first — call A below.

Code: `game_ai_request.py`, `ollama_ask_service.py`, `ollama_prompts.py`.

### Gap 4 — The Deck rows for this whole area are still unticked

**What a person notices.** Nothing directly. The risk is that the false-positive fix from August was
confirmed at the prompt, not on screen, and the three required display rows have never been signed off
on the device.

**Fix.** Run the rows after gaps 1 to 3 land, so one Deck evening covers all of it. The rows already
written in the manual testing doc under STRAT-SPOIL-DRG-01: the three required ones (Deep Rock boss
named, then a second question, then with the knowledge base off), the streaming one, and the two Hades
guards. Two new rows for the new work:

- **Name-only game.** Doom 64 as an emulator shortcut, Strategy mode, a boss question. Expect plain
  text with no box. Covers gap 1.
- **Name-first question.** Portal 2 running, "wheatley fight". Expect Wheatley's tactics in plain text
  and any other story detail still boxed. Covers gap 2 and proves nothing else was opened.

And one for gap 3 if it goes ahead: nothing running, "drg survivor what class", expect plain text.

**Size.** One Deck evening. Whoever runs it reads the rows already written; a new row is written only
for the three cases above.

## 3. Order and cost

1. Gap 1 and gap 2 together, one lane, one commit each. They touch the same four screen-side files and
   the same per-turn record, so splitting them across lanes would conflict. Cause is known for both, so
   this is Sonnet 5 at high, straight through. About a day.
2. Gap 3 in the same lane if call A is yes. An hour.
3. The bookkeeper does the docs sweep: roadmap entry closed, testing rows added, changelog line.
4. Gap 4 on the Deck. One evening, after deploy.

Nothing here needs the Deck before the code is written. Nothing here touches focus, layout, or settings
plumbing.

## 4. What stays parked

- **Soft-omit and soft-invite** ("say if you want the spoiler" instead of a shut box for adjacent
  secrets). Still parked, still the right call; it belongs with the tiered setting.
- **Spoiler coverage as a tiered setting** (strict / default / open). Already on the roadmap at three
  stars with its own detail. Not part of this plan. Gap 2's fix helps it later, since every tier keeps
  "naming a boss opens it".

## 5. Calls for the maintainer — all three answered yes 2026-09-14 (D103)

- **A. Gap 3: relax the prompt for a no-story game recognised from the question?** Yes. The chip
  already says low, the game notes already attach, and the wording still never claims the game is
  running. The cost of no was a fenced answer that disagrees with its own chip.
- **B. Gap 2: send the backend's named thing to the screen, or copy the guess into TypeScript?**
  Send it. One guess to maintain, and the two sides cannot drift.
- **C. Go on the lane?** Yes. One Sonnet lane, about a day, then one Deck evening.

Filed as D103. Landed 2026-09-15 — see § 6.

## 6. What landed (2026-09-15)

| Commit | What a person notices |
|---|---|
| `f705cfd` | On a game the plugin knows only by name (an emulator shortcut such as Doom 64, no Steam ID), a spoiler box the model draws around routine boss tactics now opens as plain text instead of staying shut. The game's name is also saved with each turn, so a reopened chat shows the same thing. |
| `7657f17` | When you name the boss the way people type it ("wheatley fight", "how do I deal with the exploders"), a box the model draws around that boss's tactics opens, on screen, in the copied text and in read-aloud, because the screen now uses the back end's own reading of what you named. Other story detail stays boxed. |
| `9d2a590` | With nothing running, a question that names a no-story game ("drg survivor what class") gets the relaxed prompt the risk chip already assumed, so the answer is no longer fenced while the chip says low. The prompt still never says the game is running. Story games unchanged. |
| `cd5db91` | With streaming on, the two cases above are plain text from the first streamed word, with no "Spoiler hidden until complete…" chip, the same as a Deep Rock question already is. |

**What the plan missed.** A saved chat gets its game from the back end's own chat store, not from the
screen. That meant the game's name, and the boss name it worked out, both had to be saved there too — or
a reopened chat would shut the box again even after the live turn opened it. The streaming bubble also
needed the back end to publish the named boss before the model call started, not after; otherwise the box
showed the "hidden until complete" chip until the answer finished, even though the finished answer would
have opened it.

Gap 4's rows are owed and run in plan 55's Deck pass: three new rows, plus the six older rows already in
the STRAT-SPOIL-DRG-01 block.
