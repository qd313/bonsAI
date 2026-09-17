# Plan 58 phase 1, lane D: the fourteen Hollow Knight notes, made two ways

Written 2026-09-17 by the lane cut for the Hollow Knight before-and-after
(docs/planning/58-phase-1-notes-shown-and-wiki-extracts.md, Appendix C). This
is the numbers-first read the plan asks for: the same fourteen notes that
ship today, alongside the same fourteen pages read again and cut to length
by the reader with no word changed, measured on the same six search
questions and the same two answer questions. The swap itself is a separate,
second commit that the maintainer has not approved yet — this file is the
evidence for that decision, not the decision.

**In one line: five of the fourteen pages had nothing worth swapping to, and
of the nine that did swap, one search question got noticeably worse and one
answer question lost two facts that the trimming length limit cut off
before it reached them.** The rest were a wash — no question moved outside
normal noise. See "The honest read" at the end.

## How the nine were picked and the five were not

All fourteen pages were fetched live from `https://hollowknight.wiki/mw/api.php`
on 2026-09-17 — no archive fallback was needed for any of them. The reader
(`scripts/extract_wiki_notes.py`) was run on each with `--game-id 15
--game-title "Hollow Knight"` and the shipping note's own kind
(boss/enemy/item/area/mechanic) passed as `--section-type`.

Nine pages landed on a section that reads as something a player asked for
that topic would actually want, and those nine replaced the shipping card's
text (and its `crawled_at` date) in the scratch copy of the seed. Five did
not, and were left exactly as they ship — the rule the plan sets out:
"where a page has no section the reader can use ... write 'no usable
section' for that row and keep the shipping note."

## The fourteen, side by side

Every verbatim note below passed the reader's own word-for-word check —
every sentence it kept was found on the page it read. "Chars" is the
character count of the card text, shipping vs. verbatim.

### The nine that swapped

| Section | Wiki heading used | Why | Shipping chars | Verbatim chars |
|---|---|---|---|---|
| Dying, your Shade and lost Geo | Behaviour and Tactics | exact match on "tactics" | 690 | 719 |
| Charms and notches | Notches (fallback) | no tactics heading on this page; first section with real content, and it happens to cover notches, buying the first one, and the Overcharm mechanic | 686 | 822 |
| False Knight | Behaviour and Tactics | exact match on "tactics" | 834 | 826 |
| Hornet in Greenpath | Behaviour and Tactics | exact match on "tactics" | 836 | 879 |
| Mantis Lords | Behaviour and Tactics | exact match on "tactics" | 868 | 777 |
| Soul Master | Behaviour and Tactics | exact match on "tactics" | 727 | 523 |
| Watcher Knights | Behaviour and Tactics | exact match on "tactics" | 703 | 493 |
| Broken Vessel | Behaviour and Tactics | exact match on "tactics" | 690 | 852 |
| Primal Aspid | Behaviour and Tactics | exact match on "tactics" | 532 | 756 |

**What a person notices reading these:** the boss and enemy notes read like a
longer, more exact version of the same fight — attack names in bold, one
line each, straight from the wiki. The wiki adds a line most players do not
need ("Most attack names used by the wiki are non-canon") at the top of
five of them; harmless, but it is the one sentence in the set that reads as
throat-clearing rather than advice. Charms and notches picked up genuinely
useful detail the shipping version did not have (the exact Geo cost and
location of the first extra notch) at the cost of one stray image caption
("Charm Notch icon") glued onto the front of the first sentence, and a
dropped video-embed link that reads as a raw URL in the middle of the text.

### The five kept as shipping (no usable section)

| Section | Page's own heading the reader picked | Why it was rejected | What a player would have gotten instead |
|---|---|---|---|
| Starting out in Hollow Knight | "Hollow Knight" (the page's own lead/infobox) | developer, release dates, engine version, and one sentence of flavour text — no starting-out guidance at all | a Kickstarter-and-credits blurb, not what to do first |
| Nail upgrades and Pale Ore | "Old Nail" (fallback) | base Nail stats and flavour text only ("Damage: 5, Type: Equipment, Source: Starting item") — never mentions Pale Ore or upgrading at all | facts about the starting weapon, not the upgrade path the note is named for |
| Soul, Focus and spells | "How to Acquire" | one sentence: you start with Focus, plus the tutorial prompt location — nothing about Soul or the other spells | a fragment of the topic, not the mechanic |
| Movement abilities and where they are | "How to Acquire" (on the Mothwing Cloak page) | one sentence: where to find the Cloak — nothing about movement generally | a single item's drop location, not "where the abilities are" |
| Leaving the Forgotten Crossroads | "How to Access" | one sentence about the well in Dirtmouth — that is how to get *in*, and the shipping note is about getting *out* | the wrong direction entirely |

All five of these matched a heading on the reader's list ("how to" or the
tactics-list fallback), so nothing was broken — the page genuinely does not
carry the kind of section the shipping note needs. Two of the five (Nail,
Forgotten Crossroads) have the real content on the page, just under a
heading name the reader does not know to look for ("Sharpened Nail" /
"Coiled Nail" per-upgrade sections; "Area Features"). That is a reader
limitation to flag for later, not something this lane's brief allows fixing
here — lane B, which owns the reader, already landed its two passes.

## The Appendix C measurement

Six blind search questions (a person's question, not the note's own
wording), one search test run per corpus, three samples internally per the
tool's own settings. "Shipping" is today's cards; "Verbatim" is the scratch
copy with the nine swaps applied.

| Question | What it's asking for | Shipping: right note in top 3? | Shipping: right note first? | Verbatim: right note in top 3? | Verbatim: right note first? |
|---|---|---|---|---|---|
| Where do I go after the first area | Leaving the Forgotten Crossroads | Yes (3rd) | No | Yes (3rd) | No |
| How do I heal without a potion | Soul, Focus and spells | No | No | No | No |
| Tips for the boss guarding the crossroads (name withheld) | False Knight | **Yes (1st)** | **Yes** | **No — dropped out of the top 3 entirely** | No |
| How to get double jump | Movement abilities and where they are | No | No | No | No |
| How do I get out of the poison water area | Movement abilities and where they are | No | No | No | No |
| Is there a secret post-game boss | (none expected — this is the "no card should answer" row) | n/a | n/a | n/a | n/a |

**The one real move is the third row, and it is a loss.** Before the swap,
asking about "the tough warrior guarding the crossroads" (False Knight's
role and location, not his name) found False Knight first every time. After
the swap it does not appear in the top three at all. The reason is visible
in the note itself: the shipping card opens "The armoured maggot in the
Forgotten Crossroads, and the first real fight" — it names the location and
the role in the first sentence. The verbatim card opens with a flat list of
attack names and never mentions where the fight happens or what the boss's
role is, because that framing sentence is the wiki's own writing style, not
something in the "Behaviour and Tactics" section at all — it lives in the
page's lead paragraph, which the reader correctly does not fold in (mixing
sections back together would defeat the point of picking one). Everything
else on the six rows moved by at most one search rank in either direction,
which is inside the normal run-to-run noise for this test.

**The two rows that already missed (Soul/Focus, and both movement rows) are
unaffected either way**, because none of those three sections had a usable
verbatim replacement — they are all in the "kept as shipping" five, so the
before and after cards are identical for them. Their misses are a pre-existing
gap, not something this comparison changed.

**The whole-fixture check, so nothing else moved:** across the labelled
holdout questions (156 in total, all games), the shared search blend found
the right note in the top three 84.0% of the time before the swap and 83.3%
after; the right note first, 57.7% both times. Both changes are well inside
the tool's own noise band for this sample size, so the rest of the library
was not disturbed by editing nine Hollow Knight cards.

### The two answer questions

Three answers per question per corpus, same settings both times
(`gemma4:e2b-it-qat`, medium thinking).

| Question | Corpus | Facts kept | No contradiction | Note attached |
|---|---|---|---|---|
| How do I beat the big armored bug boss in the Forgotten Crossroads? (False Knight) | Shipping | 3/3 | 3/3 | 3/3 |
| Same question | Verbatim | **0/3** | 3/3 | 3/3 |
| I just started and don't have a map — Cornifer and benches (Starting out) | Shipping | 3/3 | 3/3 | 3/3 |
| Same question | Verbatim | 3/3 | 3/3 | 3/3 |

The second question is unchanged because its card ("Starting out in Hollow
Knight") is one of the five kept as shipping — there was nothing to swap,
so of course nothing moved.

The first question is the one that matters, and it needs the honest reading
the plan asks for.

## Is the fixture fair to the verbatim note? Here, no — and here is exactly why

The question expects two things in the reply: that the fight tells the
player to hit the head once it is exposed, and to jump over the shockwave
rather than back away from it. The shipping card says both outright. The
verbatim card, cut to the reader's 880-character limit, stops after the
Leap/Charge/Slam attacks and never reaches either fact.

**Those two facts are on the wiki page.** Reading the fetched page directly:
"When staggered, he falls back and lands on his chest, revealing the head
of the Maggot" and the description of the Leaping Bludgeon attack both
appear in the same "Behaviour and Tactics" section the reader chose — they
are simply further down than the 880-character cut-off reaches. The
sample-page write-up from lane B flagged exactly this in advance: "35 more
sentences after 'Slam' ... were real, well-formed, verbatim-clean content
that simply didn't fit under the 880-character cap. A longer cap would have
carried them." This is that prediction landing on a real answer-test row.

So the fair reading is: **this is not the wiki lacking the fact, and it is
not the model inventing or dropping a fact it was given — it is the fixed
trim length cutting off real, useful, verbatim content before it reaches
the part a specific test question needs.** Scoring it as a note failure
would be the wrong lesson; the actual finding is that 880 characters is too
short for a boss with this many attacks and a head-exposure mechanic
described after them. Reading the model's actual reply (checked directly,
not just the pass/fail score) confirms it did not invent anything wrong —
it correctly declined to guess and asked the player where they were in the
game, because three boss cards were attached and none of the one it needed
most had the fact.

## What the reader could not parse or handle here

- **Two pages had content in the right section but past the character cap**
  even in the ones that did swap — Hornet in Greenpath and Broken Vessel
  both still had further attacks or details past the cut noted in the
  reader's own "dropped" list, though neither of those cut-off details were
  asked about by the fixed test questions this pass ran.
- **An image caption occasionally glues onto the front of a sentence** — the
  Charms note opens with "Charm Notch icon" (the alt text of an inline
  icon image) directly before the real first sentence. Readable, but
  visibly a scrap, not a place to end a trim.
- **A raw file link survives into a note** — the Charms note's middle
  sentence carries a bare `https://hollowknight.wiki/w/File:Overcharmed.webm`
  link that the page's own markup attaches to that sentence; nothing in the
  reader treats a bare media link as furniture to drop.
- **The five "no usable section" pages are a heading-list gap, not a wiki
  gap**, for at least two of them (Nail, Forgotten Crossroads): the real
  content exists on the page under a heading the reader's list does not
  know ("Coiled Nail"/"Pure Nail" per-upgrade headings; "Area Features").
  Widening the heading list is exactly the kind of change lane B's own
  write-up already flagged as a follow-up, not something in this lane's
  file list to fix.

## The honest read, for the maintainer's decision

The plan says the numbers decide, not taste, so here they are without a
recommendation baked in: nine of fourteen pages had something to swap to.
Of those nine, eight moved nothing outside normal noise on the six search
questions and the whole-fixture check. One (False Knight) lost a search hit
it used to win outright, because the verbatim card is a pure attack list
with no framing sentence saying where or who the fight is, and that same
card's missing head-exposure fact (present on the page, cut by the length
limit) is why the matching answer question dropped from a clean pass to a
clean fail. The other answer question, unaffected, stayed perfect because
its card was not touched. Nothing here argues for or against "trim only" as
a rule — every problem found traces to the 880-character cap and the
heading list, not to the rule that an AI may not write into a wiki note.
