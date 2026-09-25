# Plan 45 — The Steam settings shortcuts move above the question box

**Status, corrected 2026-09-24: built 2026-09-16 during [plan 56](56-feature-session-four.md); five of
the seven Deck checks in § 7 are done, and two are owed.** Rows SETTINGS-CARD-01 to 04 passed on the
Deck 2026-09-16 ([archive/testing-closed-2026.md](testing-closed-2026.md)). Row 05's jump
passed. Its return (the box comes back empty) is the intended behaviour since D107, so row 05 is done.
Row 06 (a one-result search at four words) has never run on the Deck. Row 07 has run only in part. On
2026-09-16, with a one-line box, the card showed six rows, read "Steam settings · 65 more" and stopped
19 px below the tab bar (`docs/test-evidence/plan56-SETTINGS-CARD-01.json`). The card rising as the box
grows taller has never been checked. Both rows are on [testing.md](../testing.md) and the roadmap's
Verify list. The Done line written 2026-09-16 said nothing was owed. That was wrong, and it was
corrected 2026-09-24. Until 2026-09-24 this line said "planned 2026-09-06, nothing built"; every call
was locked that day (D79).
**Roadmap entry:** ★★★ `[ask]` *Steam settings shortcuts float above the question box*, in Features.
**Mockups and the live rule tester:** [The settings list, moved up](https://claude.ai/code/artifact/1ab2a570-2ae5-45cd-b12b-332694f96fd5).

---

## 1. What a person would notice

Type two letters into the question box today and a list of matching Steam settings appears **under** the
box, as part of the bottom dock. The dock is pinned to the bottom edge of the panel, so the list grows
upward and pushes the box, the suggestion chips and the whole conversation up the screen with it. Every
extra letter moves everything again.

After this change the list appears **above** the box as a small card, and nothing underneath it moves. The
box stays exactly where it was. The D-pad walks up into the card and back down out of it.

## 2. Why it is worth doing

The jumping box is the real bug here, and it is much worse than it looks. Nothing limits how many results
come back, and two letters is all it takes to start searching. Typing `en` matches **71 of the 194**
settings. That grows the dock by roughly 2,300 pixels and throws the question box off the top of the panel,
so you have to scroll to find the thing you were typing into.

## 3. The sizes this is built against

All measured on the Deck, not guessed. Panel body **696px**, of which the reading area is **412px**, the
bottom dock **157px**, and the collapsed tab bar **20px**. The column is **300px** wide. Suggestion chips
are **30px** tall, two across. A result row is **30px** with a 2px gap.

The card is anchored to the top edge of the question box and holds eight rows plus a heading:
`6 + 22 + (8 × 32) − 2 + 6` = **288px**. It covers **209 of the 412px** of chat and it covers the chip row.

**The box grows as you type** — up to 200px — and the card is anchored to its top edge, so the card rises
with it. At the box's full height the card's top edge still lands at 167px, well clear of the tab bar. No
collision, but confirm it on the device rather than trusting this arithmetic.

## 4. Every call, locked

| | |
|---|---|
| **Where** | A card fixed to the top edge of the question box, growing upward over the chat. Nothing underneath moves. It covers the chip row. |
| **How many** | The best eight and nothing else. The card is always the same size and never scrolls. |
| **Up** | Puts the real highlight on the result nearest the box. Every result is a proper stop. |
| **Down** | Walks back down the list and then out into the box. No press inside the card does nothing. |
| **A** | Jumps straight to the Steam setting, as it does today. No confirming step. |
| **B** | Closes the card for the rest of that search and keeps what you typed. It returns when the box is emptied and a new search starts. |
| **Tap outside** | Same as B. |
| **Coming back from a jump** | Exactly as you left it — your words in the box, the card still open, so a second setting takes no retyping. |
| **The chips underneath** | Cannot take the highlight while the card is open. |
| **When it hides** | Past three words, or as soon as there is a question mark — **but never while the words are an exact run inside a setting's name.** |
| **Typing while the highlight is in the card** | Any letter hands the highlight straight back to the box and the list redraws. |
| **While a reply streams in** | Nothing changes. The card behaves the same either way. |
| **Heading** | *Steam settings*, with a count of how many were left out. |

## 5. Two things about the search that are not obvious

Both were checked against the code on 2026-09-06 and both shape the hide rule.

**What you type has to sit inside a setting's name as one whole piece.** It is not word-by-word matching.
So a long sentence matches nothing by itself — *how do I make the screen brighter* returns no results at
all today.

**The thing that does fire on a long sentence is the Deck basics word list**, which ships switched on. It
works the other way round: if your sentence *contains* one of its 88 words, it hits. *why is my battery
draining so fast* returns one result; *can you help me with performance* returns three. That is the whole
of the problem this hide rule exists for — a stray row or three, never a wall.

**Why the hide rule needs its let-out clause.** 123 of the 194 settings have names of three or more words.
*Enable Developer Mode* is three. *Steam Client Update Channel* is four. A plain three-word cut hides the
list at the exact moment someone finishes typing the name of the thing they were looking for. Checked
against the real data:

| What someone typed | Results | Plain three-word cut | With the let-out |
|---|---|---|---|
| `steam client update channel` | 1 | hidden | shows |
| `show switch to desktop option` | 1 | hidden | shows |
| `why is my battery draining so fast` | 1 | hidden | hidden |
| `can you help me with performance` | 3 | hidden | hidden |
| `how do i make the screen brighter` | 0 | hidden | hidden |

## 6. What the work actually is

**The hard part is focus, not paint.** There are already two ways through this list and they disagree with
each other, and one of them has to die.

1. The question box swallows Up and Down itself while results are showing and slides a marker through the
   list from a distance. The real highlight never leaves the box.
2. The result rows are also ordinary buttons, so the D-pad can walk onto them by going *down* past the box.

Order of work:

1. **Move the list out of the dock** into a card anchored to the box's top edge. Nothing else changes yet.
   This alone fixes the jumping box and is worth having on its own.
2. **Cap the list at eight** and give it the *Steam settings* heading with its count.
3. **Rewrite the D-pad wiring**: delete the marker the box slides, put the real highlight into the card on
   Up, and let Down walk out. B closes for the search. A stays as it is.
4. **Stop the chips taking the highlight while the card is open**, and check nothing else hidden behind it
   can either.
5. **Add the hide rule** with its let-out clause.
6. **Tap outside** behaves as B.

Every step keeps the tests green and lands as its own commit.

## 7. What has to be checked on the Deck

The free-play sweep is owed because this changes the Main tab, and every focused stop must also be visible.
New rows to write in the testing docs before the build starts:

- The box does not move when results appear, disappear, or change. Type `en` and confirm the box holds
  still where 71 results used to throw it off the top of the screen.
- Up from the box lands on the nearest result; Down from that result returns to the box; no press inside
  the card does nothing.
- With the card open, the D-pad cannot reach a suggestion chip.
- B closes the card, keeps the words, and the card stays gone until the box is emptied.
- A jumps to the setting; coming back finds the words and the card exactly as they were.
- `steam client update channel` still shows its one result at four words.
- The card rises with the box as the box grows, and never reaches the tab bar.

## 8. Still open

**The Deck basics word list.** It is the only reason a long sentence matches anything at all. The maintainer
folded this into the review already sitting in Features about whether those aliases stay, are left quiet, or
move under Developer, with what is written in section 5 added to it.

**Typing while the highlight is in the card** is locked as *hand it straight back*, but it means the list
redraws under your thumb mid-word. Worth watching on the device before calling it settled.
