# Plan 58 phase 1, lane D (second run): Hollow Knight both ways, with today's reader

Written 2026-09-18 by the lane cut for the second Hollow Knight before-and-after
(docs/planning/58-phase-1-notes-shown-and-wiki-extracts.md, Appendix C). Same fourteen
pages, same six blind questions, same two answer questions as the first run
(`docs/test-evidence/plan58p1-D-hk-both-ways.md`), run again after the reader's
third and fourth passes (`scripts/extract_wiki_notes.py`), which were built to fix the
two things the first run found wrong: a search question that used to find False Knight
first and now missed him, and an answer question that used to keep both needed facts
and dropped to zero.

**In one line: the fix did not fix the thing it was built for. The False Knight search
question still misses him, and the answer question about him still keeps neither fact —
for a different reason than last time, but the same result. One more page (Nail
upgrades) now has something worth swapping to that did not before, and several of the
boss notes read like real advice now instead of a flat attack list. None of that moved
the six-question scoreboard. Today's verbatim set ties the first run's, and both still
lose to what ships today on the one question that matters.**

## How this run was done

All fourteen pages were fetched live again from `https://hollowknight.wiki/mw/api.php`
on 2026-09-17 (page revisions unchanged from the first run except Charms, which had a
newer edit). The reader was run on each with `--game-title "Hollow Knight"` and the
shipping note's own kind, plus `--explain` this time, which prints a score next to every
sentence the reader considered and says which ones it kept.

## The fourteen, side by side

### Ten swap in this time (one more than the first run)

| Section | Heading used today | Shipping chars | Today's verbatim chars |
|---|---|---|---|
| Dying, your Shade and lost Geo | Behaviour and Tactics | 690 | 872 |
| Charms and notches | Notches (no tactics heading on the page) | 686 | 826 |
| Nail upgrades and Pale Ore | Old Nail + five other per-upgrade headings, joined | 608 | 879 |
| False Knight | Behaviour and Tactics | 834 | 878 |
| Hornet in Greenpath | Behaviour and Tactics | 836 | 880 |
| Mantis Lords | Behaviour and Tactics | 868 | 879 |
| Soul Master | Behaviour and Tactics | 727 | 879 |
| Watcher Knights | Behaviour and Tactics | 703 | 879 |
| Broken Vessel | Behaviour and Tactics | 690 | 877 |
| Primal Aspid | Behaviour and Tactics | 532 | 756 |

**Nail upgrades and Pale Ore is new.** Last time this page had nothing usable — the
reader could only find the plain "Old Nail" stats section. The reader now joins that
section with five more headings that each cover one nail tier ("Sharpened Nail",
"Channelled Nail", "Coiled Nail", "Pure Nail", "Nail-bouncing") into one section, and
inside that combined section is the one sentence this note needs: "The Nail can be
upgraded by the Nailsmith up to four times if given enough Geo and Pale Ore, adding
additional damage." That is a genuine gain — the note's own subject, answered, in the
wiki's own words.

### What changed since the first run, for the nine that already swapped

- **Shade.** Drops the music-box detection detail the first run kept, and instead
  surfaces what a player would actually want to know: the Void Heart Charm makes the
  Shade die in one hit, and dying again before beating a Shade replaces it and the Geo
  total resets. The last sentence, a worked Geo example, is cut off mid-thought by the
  length cap.
- **Charms and notches.** Now opens with the wiki's own description of what a Charm is,
  instead of an image caption ("Charm Notch icon") glued onto the front of the text, and
  the stray video-file link in the middle is gone. But it lost something the first run
  had: where to buy the first extra Notch and what it costs (Salubra, 120 Geo). In
  trade it gained a fact the first run didn't have — Overcharm is safe to use in the
  Hall of Gods' one-hit-kill fights, because those already deal max damage regardless.
- **False Knight.** Drops the wiki's own throwaway line ("Most attack names used by the
  wiki are non-canon") that used to eat space for nothing, and now favours two
  healing-timing sentences over a flat attack list. It still does not reach the
  head-exposure or shockwave-dodge sentences the answer question needs — see "The
  honest read" below for exactly why.
- **Hornet in Greenpath.** Goes from a plain list of her four attacks with no advice at
  all, to real tactics: wait for her Lunge and get hits in, punish the recovery with
  Vengeful Spirit, and a downward-slash escape if a Needle Throw dodge is mistimed.
- **Mantis Lords.** Goes from a list of attack shapes to the actual advice: dodge, then
  strike before she vanishes, and the Boomerang attack is the safest moment to heal.
- **Soul Master.** Goes from two attack descriptions with no strategy to the real punish
  window on his Clock attack (approach him, jump the bottom orb when it's lowest) — but
  picks up a stray one-word fragment ("Soul Master") riding along at the very end.
- **Watcher Knights.** Goes from attack descriptions only to a genuine kill combo: three
  hits with the Descending Dark spell, boosted by the Shaman Stone charm.
- **Broken Vessel.** No better than last time. The page's real advice (which charms to
  bring, when to cast a spell, using Nail Arts) all scores high enough to deserve a
  place, but sits far enough down the page that the length cap is already spent on
  earlier attack descriptions by the time the reader gets to it. Today's card picked a
  different set of attacks than the first run's card, but still has no advice in it.
- **Primal Aspid.** Byte-for-byte identical to the first run. This page's one usable
  section was already all advice and already fit under the length cap, so nothing about
  today's changes touches it.

### Four kept as shipping (one fewer than the first run, but for a mixed reason)

| Section | What the reader finds today | Why it's still not used |
|---|---|---|
| Starting out in Hollow Knight | Same as before: developer, release dates, ports, one line of what the game is | Still credits and version history, not what to do first |
| Soul, Focus and spells | Same one sentence as before: a tutorial-prompt location | Still a fragment, not the mechanic |
| Movement abilities and where they are | Same one sentence as before: where to find one item | Still a single drop location, not "where the abilities are" |
| Leaving the Forgotten Crossroads | **New: the reader now finds a whole section, "Area Features"** — but it is a bare list of every NPC, enemy, boss and item in the area | This is exactly the "stat-box scrap" case the plan calls out by name. Matching a heading does not make a list of names into directions out of an area. |

Leaving the Forgotten Crossroads is the one case where "the reader found a section" and
"the section is worth using" pulled apart. The heading fix (from the fourth pass) did
its job — "Area Features" is now on the reader's list and it found the right one — but
what's under that heading on this page is an inventory, not a walkthrough. Judged the
same way the first run judged Charms (fallback content that happens to be good is kept;
matched content that happens to be useless is not), this one stays with the shipping
note.

## The Appendix C measurement

### Six blind search questions, three ways

"Shipping" is today's cards. "First-run verbatim" is copied from the first report.
"Today's verbatim" is the ten-note swap above, measured the same way (one search test
run, three internal samples).

| Question | Shipping: top 3? / first? | First-run verbatim: top 3? / first? | Today's verbatim: top 3? / first? |
|---|---|---|---|
| Where do I go after the first area | Yes (3rd) / No | Yes (3rd) / No | Yes (3rd) / No |
| How do I heal without a potion | No / No | No / No | No / No |
| Tips for the boss guarding the crossroads (False Knight, name withheld) | **Yes (1st) / Yes** | **No — dropped out of the top 3 / No** | **No — still out of the top 3 / No** |
| How to get double jump | No / No | No / No | No / No |
| How do I get out of the poison water area | No / No | No / No | No / No |
| Is there a secret post-game boss | n/a | n/a | n/a |

**Nothing moved between the first run and today on any of the six questions.** The
False Knight row is still the only real change, and it is still a loss from shipping,
by the same margin as before. Today's verbatim note lists his attacks and two healing
sentences, but — like the first run's note — it never says where the fight is or who
he is, because that framing lives in the wiki's info box as a `Location:` label, not as
a sentence anywhere on the page. Neither this reader nor the one before it can turn a
label into the opening sentence a search question about "the boss guarding the
crossroads" needs.

**The whole-fixture check, so nothing else moved:** across the labelled holdout
questions (156 of them, covering every game in the library, not just Hollow Knight),
the search found the right note in the top three 84.0% of the time before the swap and
83.3% after — identical to the first run's numbers. The right note came first 57.7% of
the time both before and after, also identical. Editing ten Hollow Knight cards instead
of nine did not move the rest of the library.

### The two answer questions

Three answers per question per corpus, same model and settings as the first run
(`gemma4:e2b-it-qat`, medium thinking).

| Question | Corpus | Facts kept | No contradiction |
|---|---|---|---|
| How do I beat the big armored bug boss in the Forgotten Crossroads? (False Knight) | Shipping | 2/3 | 3/3 |
| Same question | Today's verbatim | **0/3** | 3/3 |
| I just started and don't have a map — Cornifer and benches (Starting out) | Shipping | 3/3 | 3/3 |
| Same question | Today's verbatim | 2/3 | 3/3 |

The Starting-out card is byte-for-byte the same in both corpora — it wasn't touched by
this swap — so the difference between 3/3 and 2/3 there is the model rolling
differently between runs, not a real change. Likewise the shipping False Knight card
scored 3/3 in the first run and 2/3 here on the exact same text. **The number that
matters is False Knight's verbatim score: 0 of 3 in the first run, 0 of 3 today.** That
part did not move at all.

## The False Knight note, quoted in full, and whether it now has the two facts the test needs

This is today's verbatim card for False Knight in full:

> - Leaping Bludgeon: False Knight leaps into the air and slams his mace down in front
> of him when he lands. False Knight targets the Knight when he leaps, so he strikes
> where the Knight was when he started his leap. While False Knight is in the air, he
> lifts his mace above his head and then swings it in an overhead arc before he lands,
> bringing his large body and mace down simultaneously. In Phase 3, this attack also
> causes barrels to fall.
> Hits: -
> After False Knight recovers from the second stagger, he goes into Phase 3 where
> barrels now drop during the Leaping Bludgeon attack and even more barrels drop during
> the Slam attack. When False Knight staggers and the Maggot pops out, heal if
> necessary then get in as much damage as possible. If healing is needed, the safest
> opportunity is to wait until False Knight goes into a Rage and then heal up in a
> corner of the room.

878 characters. **No, the two facts the question needs are not in it,** and the reason
is different from the first run's reason, which matters for anyone deciding whether the
next fix would help:

- **First run's problem:** the facts were on the page, in the right section, but sat
  past the 880-character cutoff because the reader took the section from the top down.
- **Today's problem:** the reader no longer just takes the top of the section — it
  scores every sentence and keeps the highest-scoring ones regardless of position. The
  sentence that carries the head-exposure fact — "When staggered, he falls back and
  lands on his chest, revealing the head of the Maggot" — was scored and considered,
  and it lost. It contains no word from the reader's list of tactic words ("revealing"
  is not "exposed"; "falls back" is not "dodge"). A handful of narrative sentences
  about a much later, harder difficulty mode scored higher purely by using words like
  "before" and "after" several times each, and one of those has already been kept in
  the printed card above ("After False Knight recovers from the second stagger...").
  The shockwave-dodge fact fares differently again: **the page's current text does not
  say to jump the shockwave anywhere at all** — checked directly against the fetched
  page — so no reader, however it scores sentences, could produce that fact from this
  page today.

So this is not a cap problem any more, and it is not a case of the model inventing or
dropping something it was given — the model was shown a card that plainly does not say
either fact, and (checked directly) it declined to guess and asked which part of the
fight the player needed help with instead. The honest gap is: one fact is a page a
reader can never win, because it isn't written in prose on the page at all; the other
fact is written on the page but in words this reader's list does not recognise as a
tactic. Both are named in lane B's own write-up (`docs/test-evidence/plan58p1-B-samples.md`,
"Third pass") before this run confirmed it against a live answer test.

## What the reader could not parse or handle here

- **A structured fact that lives only in a wiki's info box, never as a sentence,
  cannot be recovered by any rule that only reads prose or the page's fact-box lines
  as a last resort.** False Knight's location is exactly this case — it's a label,
  not a sentence, and it sits inside the fight's info box rather than a stand-alone
  fact line the fourth pass's "open with the fact-box lines" rule was built to catch.
- **A word list that recognises "exposed" does not recognise "revealing the head"** —
  a wording gap, not a length gap, confirmed by reading the live page directly.
- **A stray one-word label can still survive into a note** — Soul Master's card ends
  with the bare fragment "Soul Master", a label unit that fit the leftover space after
  everything else was scored and placed.
- **Real advice can still lose to attack descriptions on a long page** — Broken
  Vessel's charm and spell advice scores high enough to deserve a spot but sits far
  enough down the page that the cap is already spent by the time the reader reaches it.
- **A useful fact can be traded for another when a heading changes** — Charms and
  notches lost its concrete "buy the first Notch here for this much Geo" fact when the
  lead-sentence rule changed what opens the note, even though the note gained a
  different fact in return.

## The honest read, for the maintainer's decision

The plan says the numbers decide, and here they are without a recommendation baked in.
The fourth pass added a real, general capability — Nail upgrades now has something
worth swapping to, and five of the boss notes read like advice instead of an attack
list — but **none of that moved the six measured questions or the two answer rows from
where the first run left them.** False Knight is still the one real loss, for a
different, now precisely-named reason (a wording gap and a page that never states the
location in prose, rather than a length cap), and it still costs the same thing: the
search question that used to find him first now doesn't, and the answer question that
used to keep both facts still keeps neither. Everything else is an exact repeat of the
first run's pattern. **Today's verbatim set ties the first run's verbatim set. Neither
beats the rewrites that ship today.** Per the plan's own fallback (§ 9): if the
verbatim set still loses, the rewrites stay, and the reader ships as the fetch-and-
credit half for the ten new games, with the block making a note's nature visible either
way.

## What was not changed

- `tests/test_knowledge_base_service.py`'s labelled-line count (`test_a_structured_card_uses_known_labels_on_every_line`,
  asserting 22) does not need editing. None of today's ten swapped cards open with one
  of the five recognised labels (`Summary:`, `Weak points:`, `Uses:`, `Phases:`,
  `Tips:`) on their first line, so the count of structured cards in the seed is
  unchanged. Checked directly against every swapped card's first line before writing
  this line.
