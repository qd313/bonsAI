# Maintainer's answers to the corpus gap sheet, 2026-08-29

Source record. The maintainer filled in the gap sheet published as
[Corpus Gap Sheet](https://claude.ai/code/artifact/94ee8fb9-ba7f-405c-8eda-5831bbf7bd44) and pasted
the result back. **Their words are reproduced here rather than paraphrased**, because everything
written into the corpus from this point traces back to them and a paraphrase would launder that.

What each answer unblocks is in § 6.

---

## 1. State of Emergency

The biggest hole in the corpus: 5 cards, and both blind-row batches skipped the game entirely
because the section titles alone were not enough to write a confident question.

| Question | Answer |
|---|---|
| What kind of game is it? | **Arcade riot brawler — crowds, chaos, score** |
| Which mode do people play? | **Kaos — the arcade score mode** |

**What a new player gets wrong in the first ten minutes:**
> "They aren't causing enough chaos. They also don't know when to focus on adding time to a round
> via +15s pickups."

**Enemies or hazards worth a card:**
> "Any late-round enemy with a rocket launcher"

**Weapons or pickups worth a card:**
> "Grenade launcher - easiest to use given the controls
> Rocket launcher - easiest to misuse and cause harm to the player
> Flamethrower - strategy would be to run in circles in the middle of an enemy swarm, I think"

**Note the hedge on the flamethrower** — "I think". That one is a lead, not a verified fact, and
any card written from it must not read as confident. The other two are stated plainly.

## 2. What's annoying on the Deck

Asked in the framing the 2026-08-21 handoff insisted on: what is *annoying*, not what is configured.
Answers cover seven titles the maintainer actually plays on the device.

| Title | In their words |
|---|---|
| Deep Rock Galactic: Survivor | "framerate. Late-round swarms tank the framerate, even when the framerate was very good and table at the beginning of the round" |
| Ocarina of Time (emulated) | "antiquated controls. The game is from a different era." |
| Half-Life 2 | "The game was designed for a mouse and keyboard. Getting this game to feel right (aiming, navigating while running) takes practice on the deck." |
| Baldur's Gate 3 | "Game is very complex, can't tell if I should go trackpad route or controller route. Pros and cons of both needs to be explained. Also need tuned graphics settings for good experience." |
| Fallout 4 | "Some framerate instability, but also not knowing what button on the deck does what action" |
| GTA: San Andreas – DE | "Need tuned graphics settings for good experience." |
| State of Emergency | "Totally different era of arcade shoot-'em-up. User needs to understand the controls and how to exploit them for their benefit" |

**The shape of these is worth noticing.** Only two are the "set this launch option" kind the track 3
plan assumed. Five are about **controls and expectations** — a game from a different era, a game
built for a mouse, a game whose input scheme the player cannot map to a Deck. That is a different
kind of tip from a Proton flag, and it is the kind that does not go stale.

Already on file from 2026-08-21 and unchanged: Fallout 4 `moshortcut://"F4SE"` (F4SE through Mod
Organizer 2) and GTA: San Andreas – DE `%command% -dx12`.

## 3. The four type calls

All four answered. See [D39](maintainer-decisions-locked.md) for the locked record.

| Cards | Call |
|---|---|
| Cyberpunk's *Sandevistan* / *Kerenzikov* / *Berserk* | **Leave as mechanic** — "not worth the churn" |
| Portal 2's gels, funnels, plates, bridges | **Leave as mechanic** |
| Half-Life 2's *Antlions and the sand* | **Split into two cards** |
| Hades' *Starting weapons* | **One card per weapon instead** |

The first two match what the depth plan proposed leaving alone, so nothing changes there. The second
two are new work and are the only card authoring this round has an explicit instruction for.

## 4. Which things deserve a card

Three games answered; **Hades, Baldur's Gate 3 and The Sims 4 were left blank.** Per the sheet's own
instruction that a blank means "don't write this card", those three get no entity cards from this
round.

| Game | Ticked | Free text |
|---|---|---|
| Cyberpunk 2077 | Cyberpsychos; Ripperdocs; Quickhacks; Iconic weapons | "Pros and cons of different builds, make cards designed around early game (or even character design)" |
| Fallout 4 | Feral Ghouls; Stimpaks and chems; Legendary enemies and their drops | "Pros and cons of different builds, make cards designed around early game (or even character design)" |
| Red Dead Redemption 2 | Legendary animals; Tonics and provisions; Horse breeds; Satchel upgrades | "Give very basic advice for total noobs. Explain this game to someone familiar to GTA but not RDR" |

**The free-text answers are the more interesting half, and they are not entity cards.** Twice the
maintainer asked for **build and early-game guidance**, and once for **an orientation card pitched at
someone who knows a neighbouring game**. Neither shape exists in the corpus today — every strategy
card is about a thing (an enemy, an item, an area), none is about *starting out*. That is a genuine
gap the sheet was not designed to find.

Notably **Super Mutants was offered and not ticked** for Fallout 4, while Feral Ghouls was. Worth
respecting rather than second-guessing.

## 5. Spoilers

Default line, chosen: **"Fence only named story beats and endings."**

The free-text answer is a feature proposal rather than a preference, and is quoted in full:

> "I think spoiler coverage should be matched to a future setting. On one setting, there's no
> spoiling of bosses/endings/chapters. On the another end it'll allow anything specifically asked by
> the user. On another it's anything past the intro/tutorial. I think if the user asks about a boss
> or area specifically, they don't care about spoilers."

**The last sentence is already the shipped rule** — Phase 4's spoiler lock reads "Stay **unfenced**
when the user asked about that boss/item **by name**". So the instinct matches what the code already
does; what is new is wanting the *rest* of it to be a user-facing choice with tiers. Filed on the
roadmap.

## 6. What each answer unblocks

| Answer | Unblocks | Blocked by |
|---|---|---|
| Deck annoyances, 7 titles | Phase 4 **track 3** content, which has been waiting on exactly this since August | **Still needs schema v4** (`app_id` on `compat_patterns`) before it can ship as per-game compat tips — the content is no longer the blocker, the schema is |
| Four type calls | Two "leave alone" (no work), two splits (HL2 antlions, Hades weapons) | Nothing |
| Entity picks, 3 games | ~11 entity cards to author | Nothing |
| Build / early-game / orientation cards | A card *shape* the corpus does not have | Needs a decision on whether that is a new `section_type` or fits `mechanic` |
| State of Emergency answers | The corpus's thinnest title, and the one no blind row could ever cover | Nothing |
| Spoiler tiers | A settings feature | Not started; roadmap only |

**One thing to carry forward.** Every card written from this page is authored from the maintainer's
own knowledge, so it is `source_license: bonsAI-maintainer` with an empty `source_url` and the
weaker `fallback_no_source` trust tier — the same standing as the existing DRG Survivor and Ocarina
entity cards. That is honest and precedented. It also means **whoever writes these cards can never
write a blind eval question for them**, which is arithmetic rather than policy and should be spent
deliberately.
