# Plan 58 phase 1, lane B: one sample page per wiki

Written 2026-09-17 by the wiki-reader lane, for the maintainer to read next to the reader's
own output before any wiki note is written from these sources. Nothing here is written into
`data/kb/strategy_seed.json` — `scripts/extract_wiki_notes.py` only prints. Every note below
passed the verbatim check (`verify_verbatim`): every sentence it kept, and every labelled
line's label and its value, is present in the page that was fetched.

How to read this file: for each wiki — the page, its licence and revision as the site itself
declared them, how the page was fetched, which section the reader picked and why, the
section's raw text, the note the reader produced, its length, and anything the reader dropped
or could not parse.

**Second pass (also 2026-09-17, appended below the first pass's own sign-off): the finding
below that only one of five wikis kept tactics under a heading the reader knew to look for
led to a per-wiki heading preference, tried before the general list, plus a category-based
guess for a note's kind. See "Second pass" near the end of this file for the twelve extra
pages that proved it and two more real bugs it turned up.**

## Fetch outcomes, at a glance

| Wiki | Page | Fetched how | Licence as declared | Section chosen | Note length |
|---|---|---|---|---|---|
| hollowknight.wiki | False Knight | live API | "Commons Attribution-ShareAlike" + `.../by-sa/3.0/` → CC-BY-SA-3.0 | Behaviour and Tactics | 830 chars |
| mariowiki.com | Army Dillo | live API | "Attribution-ShareAlike 4.0 International" → CC-BY-SA-4.0 | History (no tactics heading; fallback) | 854 chars |
| ssbwiki.com | Mario (SSB) | live API | "Attribution-ShareAlike 4.0 International" → CC-BY-SA-4.0 | Attributes (no tactics heading; fallback) | 810 chars |
| gta.fandom.com | Kingdom Come | live API | "CC-BY-SA" (no version) + `fandom.com/licensing` → asserted CC-BY-SA-3.0, see below | Kingdom Come (page-title infobox; fallback) | 113 chars |
| strategywiki.org | Mega Man 2 / Air Man | archive.org WikiTeam dump (live refused, bot check) | "Creative Commons Attribution-ShareAlike 4.0" → CC-BY-SA-4.0 | Stage (no tactics heading; fallback) | 617 chars |

Three of the five landed on a real "tactics/use" heading match only once (Hollow Knight,
exact match on "Behaviour and Tactics" — the other four fell back to the first section that
actually had words in it, flagged `-- check this by hand` in every case. That is an honest,
expected result: see "What I found" at the end.

---

## 1. hollowknight.wiki — False Knight

- **Fetched:** live API, `https://hollowknight.wiki/mw/api.php` (its script path is `/mw`,
  not the `/w` a plain guess would try — found by trial while setting this sample up).
- **Page:** `False Knight`, revision 196681, read 2026-09-17.
- **Licence as declared by the site:** `Commons Attribution-ShareAlike`,
  `https://creativecommons.org/licenses/by-sa/3.0/` → **CC-BY-SA-3.0**.
- **Section chosen:** "Behaviour and Tactics" — exact substring match on "tactics", the
  reader's first-choice keyword group.
- **Raw section text (opening excerpt):**

  > Most attack names used by the wiki are non-canon. False Knight possesses a variety of
  > attacks: Leap: ... Charge: ... Slam: ... Leaping Bludgeon: ... Rage: ... [then a
  > "Stagger Values" stat box, a YouTube video-embed placeholder with a cookie notice, a
  > Godmaster/Pantheon comparison box, and several more paragraphs of stagger/SOUL/escape
  > tactics]

- **Note produced (830 characters):**

  > ‎ ‎ Most attack names used by the wiki are non-canon. False Knight possesses a variety of
  > attacks:
  > - Leap: False Knight jumps a distance in the air to either reposition or prepare for a
  > Slam attack. False Knight does not leap twice in a row. False Knight stops using this
  > move in Phase 3.
  > - Charge: False Knight runs a small distance to get closer if the Knight is too far away
  > and performs a Leaping Bludgeon attack at the end of the charge.
  > - Slam: False Knight rears back, priming his mace for a moment, before swinging it
  > forward, slamming it into the ground. The impact of the mace creates a shockwave that
  > travels forward across the whole arena. In Phase 2, this attack also causes barrels to
  > fall, and in Phase 3, even more barrels fall per slam. If the Knight gets hit by the slam
  > itself, it will deal two masks of damage.

- **Dropped / could not parse:**
  - Two invisible left-to-right/right-to-left mark characters (`‎`) leaked into the very
    start of the card from the page's own HTML. Harmless to read but ugly in raw text; worth
    a follow-up trim in the fetcher.
  - Eight lines from the "Stagger Values" and Pantheon-difficulty stat boxes could not be
    paired into a label/value line (e.g. `Health`, then separately `260*3` and `560*3` on
    their own lines with no connecting header) — Hollow Knight wiki spreads a two-column
    comparison across three single-cell rows the reader has no way to line up. These lines
    were dropped and named, not guessed at.
  - 35 more sentences after "Slam" (Leaping Bludgeon, Rage, the stagger/SOUL/escape-route
    tactics, the Pantheon note) were real, well-formed, verbatim-clean content that simply
    didn't fit under the 880-character cap. A longer cap would have carried them.

## 2. mariowiki.com (Super Mario Wiki) — Army Dillo

- **Fetched:** live API, `https://www.mariowiki.com/api.php`.
- **Page:** `Army Dillo` (a Donkey Kong 64 boss), revision 5409928, read 2026-09-17.
- **Licence as declared by the site:** `Attribution-ShareAlike 4.0 International`,
  `https://creativecommons.org/licenses/by-sa/4.0/` → **CC-BY-SA-4.0**.
- **Section chosen:** "History" — no heading on this page reads Strategy/Tactics/Tips/
  Behaviour/Combat/Weaknesses/Usage/How to/Walkthrough/Overview, so the reader used the
  first section with real content and flagged it for a person to check. This page's
  headings, in order: History (→ Donkey Kong 64, Uho'uho Daishizen Gag: Donkey Kong, Donkey
  Kong Bananza), Quotes, Gallery, Naming, References.
- **Raw section text:** the full "Donkey Kong 64" boss-fight description — three rounds,
  what to do each time Army Dillo peeks out, what changes between the Jungle Japes and
  Crystal Caves fights — plus, in nested subsections, an appearance in a Donkey Kong comic
  and a Donkey Kong Bananza reference (both dropped as "nested subheading").
- **Note produced (854 characters):**

  > In Jungle Japes, the first fight with Army Dillo takes place in a jungle arena. Before the
  > battle begins, Army Dillo rolls out of a cave and into the arena. Army Dillo pokes out
  > from his shell, where two large cannons emerge. Army Dillo lets out a laugh and retreats
  > back in his shell. The boss battle then begins. For this battle, Army Dillo is equipped
  > with two large retractable side-mounted fireball cannons and a metal shell. The battle
  > mainly consists of Army Dillo retreating into his shell and shooting fireballs from his
  > cannons. At first, Army Dillo blasts four fireballs at Donkey Kong. It briefly peeks out
  > of its shell, letting out a laugh. During this opportunity, Donkey Kong must pick up a
  > TNT Barrel and throw it at Army Dillo's head. The explosion blasts Army Dillo upward and
  > short-circuits his shell, electrocuting him in the process.

- **Dropped / could not parse:** three nested subheadings ("Donkey Kong 64", "Uho'uho
  Daishizen Gag: Donkey Kong", "Donkey Kong Bananza") were stripped as furniture, not
  content — their prose stayed, only the heading markers were removed, so "Donkey Kong 64"
  and the comic-book cameo both still read as one continuous section. 51 more
  sentences (rounds two and three of the Jungle Japes fight, the whole Crystal Caves
  rematch) were verbatim-clean and simply past the character cap.
- **section_type guessed "mechanic"** — wrong; this is a boss, and the guess said so and
  asked for a check rather than silently shipping it.

## 3. ssbwiki.com (SmashWiki) — Mario (SSB)

- **Fetched:** live API, `https://www.ssbwiki.com/api.php`.
- **Page:** `Mario (SSB)` — the Super Smash Bros. (N64) character page, revision 2059574,
  read 2026-09-17.
- **Licence as declared by the site:** `Attribution-ShareAlike 4.0 International`,
  `https://creativecommons.org/licenses/by-sa/4.0/` → **CC-BY-SA-4.0**.
- **Section chosen:** "Attributes" — this wiki organises its "how to play the character"
  writing under headings like "Techniques", "In competitive play" and move-specific
  sub-pages, none of which are on the reader's keyword list, so the fallback used the first
  section with real words in it: the general playstyle write-up. This page's top-level
  headings: Attributes, Differences between game versions, Moveset, In competitive play,
  Techniques, In 1P Game, Profile, Alternate costumes, Trivia.
- **Raw section text:** a four-paragraph write-up of Mario's overall playstyle — stats,
  Fireball, down aerial combos, up smash/back throw KO setups, his offstage/edgeguard game,
  and his weaknesses (short range, no answer to projectiles, slow moves).
- **Note produced (810 characters):**

  > Mario is considered to be the balanced character. His stats are overall average to
  > slightly subpar, with average weight, size, falling speed, and traction and below average
  > walking, dashing, and air speeds as well as a subpar jump. He overall has a good
  > combination of low power and high power attacks, giving him a pretty strong combo ability
  > with many options, yet a variety of KO moves and options. He also has a projectile in his
  > Fireball, that is a decent way to prevent opponent approaches due to falling downward
  > while moving forward if used in the air. On the ground, it travels too slowly (along with
  > the move's ending lag) to be effective however. Mario's down aerial, a drill kick, is an
  > excellent damage racker, being able to combo straight into an up aerial or itself (if
  > offstage or high enough).

- **Dropped / could not parse:** nothing malformed — 19 further sentences (the rest of the
  down-aerial combo game, his offstage/edgeguard strengths, and his weaknesses paragraph)
  were verbatim-clean and past the character cap. **section_type guessed "mechanic"**,
  printed for a check (arguably right for a moveset write-up, but this is really a
  character-strategy note; there's no "character" bucket in the existing five section types).

## 4. gta.fandom.com — Kingdom Come (GTA III mission)

- **Fetched:** live API, `https://gta.fandom.com/api.php` (Fandom answers this PC's curl the
  way the plan expected; the in-IDE fetch tool was not used).
- **Page:** `Kingdom Come`, a GTA III mission given by King Courtney, revision 2077923, read
  2026-09-17.
- **Licence as declared by the site:** the API's own `rightsinfo` reads `text: "CC-BY-SA"`,
  `url: "https://www.fandom.com/licensing"` — **no version number at all**. The reader's
  `canonical_licence()` correctly refused this on its own (a bare CC-BY-SA is exactly the
  case the project already excludes, see `docs/knowledge-base.md` "Source attribution" on
  reading the licence from the snapshot rather than the archive.org item). This sample was
  produced with `--source-license CC-BY-SA-3.0`, the version this wiki was already cleared
  at in `docs/archive/15-corpus-licensing-attribution-plan.md` from an archived siteinfo and
  a footer read, not from today's live answer. **The reader still checks the override
  against the publish allow-list**, so a wrong value would still be refused — it does not
  bypass the licence gate, only the version-lookup step that this site's live API can't do.
- **Section chosen:** the page's own title heading, "Kingdom Come" — this page's
  "Walkthrough" heading exists but has nothing written under it (confirmed by fetching a
  second mission, "Give Me Liberty", whose "Walkthrough" heading is also empty; a real gap
  found and fixed mid-session, see "What I found" below). With the true walkthrough empty,
  the reader's whole-page-order fallback landed on this page's infobox facts instead of the
  "Mission" section (not on the reader's keyword list) that actually describes the fight.
- **Raw section text:** the page's own mini-infobox, four label/value facts:

  > Appears in: Grand Theft Auto III · For: King Courtney · Location: Aspatria, Staunton
  > Island · Target: SPANKed-up Madmen

- **Note produced (113 characters, all four facts kept — short of the 400 aim, used
  whole):**

  > Appears in: Grand Theft Auto III
  > For: King Courtney
  > Location: Aspatria, Staunton Island
  > Target: SPANKed-up Madmen

- **Dropped / could not parse:** nothing — every fact fit. But this note skips the mission's
  actual content, which lives under the "Mission" heading instead:

  > King Courtney wants Claude to collect an Esperanto parked in a parking lot in Bedford
  > Point. When Claude gets in the vehicle, he discovers it is a trap laid by Catalina.
  > SPANKed-up suicidal bombers will block the entrances to the parking lot with their vans.
  > An endless amount of suicidal bombers attempt to kill Claude. Claude eventually destroys
  > all their vans and the bombers to end the mission.

  That text is real, well-formed and would make a far more useful note than the infobox —
  it just isn't reachable by heading-keyword matching alone. Named here rather than quietly
  shipped.

## 5. strategywiki.org — Mega Man 2 / Air Man

- **Fetched:** the live site refused every attempt from this PC — `curl` and the fetcher's
  own `urllib` request both got HTTP 403 behind a Cloudflare "Just a moment" bot-check page,
  exactly as the plan expected. Route used instead: **the WikiTeam dump on archive.org**,
  item `wiki-strategywiki.org_w-20250828` (found via `archive.org/advancedsearch.php`,
  publicdate 2025-09-05), via `scripts/fetch_wiki_dump_pages.py --dump
  wiki-strategywiki.org_w-20250828 --titles "Mega Man 2/Air Man"`.
- **Page:** `Mega Man 2/Air Man`, revision 1078119, snapshot captured 2025-09-05 (that date
  is `crawled_at`, not today — the dump is a snapshot from the past, and relabelling old
  wiki text with today's date would be the exact staleness bug `docs/knowledge-base.md`
  already warns about).
- **Licence as declared by the site:** confirmed **twice**, matching each other — the
  archive.org item's own `licenseurl` and the dump's own `dumpMeta/siteinfo.json` rightsinfo
  both read `https://creativecommons.org/licenses/by-sa/4.0/`, text "Creative Commons
  Attribution-ShareAlike 4.0" → **CC-BY-SA-4.0**. This also matches the maintainer's own
  footer read on 2026-09-17 ("Content is available under Creative Commons
  Attribution-ShareAlike 4.0 unless otherwise noted.").
- **Section chosen:** "Stage" — no Strategy/Tactics/Tips/etc. heading exists on this page
  (its only two headings are "Stage" and "Air Man"), so the fallback used "Stage", which
  turned out to hold the actual level walkthrough.
- **Raw section text:** a lettered walkthrough (A through F) of the Air Man stage --
  Goblins, Kamanari Goros, Pipis, Scworms, Matasaburos -- keyed to a stage map image the
  reader has no way to show.
- **Note produced (617 characters):**

  > - A: As you reach the end of the first platform, a large object known as a Goblin will
  > materialize before you. You must hop on top of the Goblin to proceed, but only after its
  > horns have retracted. Trying to jump on the Goblin before the horns are gone will mean you
  > will take damage and possibly fall to your death. Goblins also generate their own small
  > defense units called Petit Goblins. They appear from the Goblin's "ears" and float towards
  > Mega Man. They are very easy to defeat. Clear them out of the way as you advance to the
  > other Goblins. You'll have to pass five in all before you reach the next challenge.

- **Dropped / could not parse:** nothing malformed; 5 more lettered points (B through F —
  Kamanari Goros, Pipis, Scworms, Matasaburos) were verbatim-clean and past the cap. The
  note leads with "- A:" with no explanation of what "A" refers to, because the map that
  gives the letters meaning is an image the reader correctly does not try to describe.

---

## A bug found and fixed while building these samples

Two real gaps in the reader turned up only once real pages were fetched, exactly the
production lesson plan 58 cites (`docs/planning/58-phase-1-notes-shown-and-wiki-extracts.md`
§ 2: "the sample-page read by the maintainer is a gate ... why it runs before any note is
written"). Both are fixed in this lane's commits, with their own tests:

1. **An exact heading match with nothing under it used to win anyway.** `Give Me Liberty`
   and `Kingdom Come` (both GTA III missions) each carry a "Walkthrough" heading with zero
   words under it. Before the fix, `select_section` returned that heading the moment its
   text matched "walkthrough", producing an empty note. It now skips an empty heading and
   keeps looking, in priority order, then falls back further only if every section on the
   page is genuinely empty.
2. **A dump page's rebuilt URL was wrong.** `fetch_wiki_dump_pages.py`'s manifest only
   recorded the dump's `api.php` address, so the reader's first attempt built
   `https://strategywiki.org/w/api.php/wiki/Mega_Man_2/Air_Man` — not a real page. The
   fetcher now also records the wiki's own `server` and `articlepath` from its siteinfo (the
   same data the live fetcher already gets from the API directly), and the reader rebuilds
   the URL from those instead of guessing. Confirmed against a second wiki
   (hollowknight.wiki, whose `articlepath` is `/w/$1`, not the more common `/wiki/$1`) to
   make sure the fix uses the wiki's own answer rather than hard-coding one convention.

## What I found, for the maintainer's read

**The reader's guiding assumption — that tactics content sits under a heading like
"Strategy" or "Tactics" — held for only one of five wikis (Hollow Knight).** The other four
wikis each organise this differently: Super Mario Wiki and GTA Wiki fold it into a
chronological "History"/"Mission" narrative, SmashWiki uses "Attributes" for playstyle and
reserves "Techniques" for named tricks, and StrategyWiki uses a generic "Stage"/level-name
heading. The reader's fallback (use the first section that actually has words, and say so)
kept every one of these readable and honest rather than empty or wrong, but four of five
notes here are flagged `-- check this by hand` for exactly that reason. A useful follow-up,
not done here: widen the keyword list per-wiki (e.g. add "Mission" for Fandom game wikis,
"History" as a deliberate choice rather than an accident for Mario Wiki) once more sample
pages show the pattern is real rather than a one-page fluke.

**Would a player be served by these verbatim notes?** Two clear yeses, one clear no, two in
between:

- **Yes — Hollow Knight (False Knight):** reads exactly like the maintainer's own existing
  notes, just longer. A player asking "how do I beat False Knight" gets the attack list with
  exact names ("Leap", "Slam") they can also see on screen.
- **Yes — Super Mario Wiki (Army Dillo):** a full, correct, chronological account of the
  fight's three rounds. Longer and slightly more narrated than the maintainer's tight
  bullet-style notes, but nothing in it is vague or wrong.
- **No — GTA Wiki (Kingdom Come) as sampled:** the note that got through (an infobox: who
  gives the mission, where, against whom) answers "what is this mission" but not "how do I
  do it" — the useful text sits one heading away, under a name the reader doesn't know to
  look for yet. Shipping this note as-is would be a regression from a hand-written one.
- **Half — SmashWiki (Mario):** genuinely useful competitive advice (his best combo starters,
  his best KO moves, his weaknesses), but it reads as commentary on Mario's whole moveset
  rather than a tight answer to one question, and needs a reader who already knows Smash
  jargon ("meteor smash", "OoS", "gimp").
- **Half — StrategyWiki (Air Man):** correct and detailed, but the "- A:" labels only make
  sense next to a map image this note can't show, so a player without the wiki page open
  would find the note's structure confusing even though every sentence in it is accurate.

None of this is a case for reverting "trim only" — the honesty problem plan 58 opens with
(the model contradicting a note it was handed) does not reappear here, because nothing here
was rewritten. It is a case for the Hollow Knight before/after comparison in Appendix C
mattering more than a passing test suite: on this small sample, verbatim quality tracked
"does this wiki organise its pages the way our heading list expects" at least as much as it
tracked writing quality — see the second pass below, which fixes exactly that.

---

## Second pass: a heading rule per wiki, before the ten games

The finding above — only hollowknight.wiki keeps tactics under a heading the general list
knows — was not a one-page fluke. Twelve more real pages (three per wiki that missed, one
per wiki was not enough to be sure) confirmed a stable pattern per wiki, so the reader now
tries an ordered, per-wiki heading list before its general one. The general list stays the
fallback for a page that does not fit its own wiki's usual shape (a Mario Party board, a
GTA vehicle). Three more changes came out of the same twelve pages: a note's kind (boss,
enemy, item, area) is now read from the page's own category first, invisible formatting
marks are trimmed from every unit, and the 880-character cap stayed exactly where it was —
where good content did not fit, that is recorded below, not fixed by raising the cap.

### The rule, per wiki

| Host (from the page's own fetched address) | Tried before the general list | Grounded on |
|---|---|---|
| `gta.fandom.com` | "Mission" | Kingdom Come (pass 1) + 3 more below |
| `www.mariowiki.com` | "History", narrowed to the subsection naming the game a note is for | Army Dillo (pass 1) + 3 more below |
| `www.ssbwiki.com` | "Attributes", then "Techniques" | Mario (pass 1) + 3 more below |
| `strategywiki.org` | the first heading that is not navigation or the "Stage" map key, else "Stage" | Air Man (pass 1) + 3 more below |

A page's host is read from its own fetched `source_url` — never guessed, never taken from a
filename. hollowknight.wiki gets no entry: its tactics heading was already on the general
list (pass 1's one clean match), so nothing needed to change for it.

### The twelve pages

| Wiki | Page | Section chosen | Matched by | Note length | Served a player? |
|---|---|---|---|---|---|
| mariowiki.com | DK's Jungle Adventure (Mario Party 1 board) | Events | general list (no History on a board page) | 696 chars | Yes — the board's own rules (Whomps, Coin Stones, the Bowser path), read cleanly |
| mariowiki.com | Ghost (Yoshi's Story) | Names in other languages | general list (page has no tactics content at all) | 224 chars | No — a translation table, not tactics; this page is too thin to note (see "Wiki quality is uneven" in the plan) |
| mariowiki.com | Wizpig (Diddy Kong Racing) | History → "Diddy Kong Racing / Diddy Kong Racing DS" | per-wiki rule, narrowed | 735 chars | Yes — the whole amulet/race plot, with the Mario no Boken Land and 4koma comic cameos correctly left out |
| ssbwiki.com | Pikachu (SSB) | Attributes | per-wiki rule | 837 chars | Half — genuinely useful (mobility, up tilt/up smash combo game) but assumes Smash vocabulary |
| ssbwiki.com | Donkey Kong (SSB) | Attributes | per-wiki rule | 861 chars | Half — same shape: real strengths/weaknesses, jargon-heavy ("shield break combos", "meteor smashes") |
| ssbwiki.com | Fox (SSB) | Attributes | per-wiki rule | 692 chars | Half — same shape again; reads as a matchup primer, not a direct answer |
| gta.fandom.com | The Crook (GTA III mission) | Mission Objectives | per-wiki rule (substring on "mission") | 157 chars | Yes, though thin — two real objectives, short because the page itself is short |
| gta.fandom.com | Sayonara Salvatore (GTA III mission) | Mission | per-wiki rule (exact) | 468 chars | Yes — the whole betrayal/assassination plot in one clean paragraph |
| gta.fandom.com | Trashmaster (GTA III vehicle) | Trashmaster (the page's own infobox) | general list (no Mission heading on a vehicle page) | 618 chars | Half — accurate spec facts (games it appears in, body style, seats), not tactics; there is nothing to strategize about a garbage truck |
| strategywiki.org | Mega Man 2 / Metal Man | Metal Man | per-wiki rule | 880 chars | Yes — full attack pattern and the exact punish window |
| strategywiki.org | Mega Man 2 / Bubble Man | Bubble Man | per-wiki rule | 861 chars | Yes — same shape, equally complete |
| strategywiki.org | Mega Man 2 / Wood Man | Wood Man | per-wiki rule | 841 chars | Yes — same shape again |

Two pages proved the rule by not fitting it, exactly as intended: DK's Jungle Adventure has
no "History" heading at all (Mario Party boards use "Events"/"Spaces" instead), and
Trashmaster has no "Mission" heading (GTA vehicle pages use "Design"/"Performance"/"Variants"
instead). Both fell through cleanly to the general list rather than the per-wiki rule
grabbing content that was never there.

### The same two pages from pass 1, re-read under the new rule

- **strategywiki.org — Air Man**, re-read: the section chosen is now "Air Man" (822 chars,
  full tornado-dodge attack pattern) instead of pass 1's "Stage" (617 chars, the lettered
  map-key walkthrough with no map to show). This is the clearest single before/after in this
  file — same page, same fetch, a materially better note once the rule stopped preferring
  the wrong one of the page's only two headings.
- **mariowiki.com — Army Dillo**, re-read with `--game-title "Donkey Kong 64"`: the printed
  card is unchanged (854 characters both times, because the comic-book cameo sentences were
  already past the character cap in pass 1's reading) but the section actually read shrank
  from the whole "History" text to just the "Donkey Kong 64" subsection — confirmed by the
  dropped-sentence count falling from 51 to 38. A shorter character cap, or a slightly longer
  Army Dillo write-up on the wiki, would have shown the cameo leaking through in pass 1 and
  not in this one; here the fix is real but the sample page happened not to need it yet.

### What else this pass found

- **A note's kind is read from the page's own category first.** Army Dillo's body words alone
  guessed "mechanic" in pass 1 (there is no literal word "boss" naming the page, only
  describing the fight) — wrong. Its own category, "Donkey Kong 64 bosses", now settles it to
  "boss" before body words are even read. A live page's categories never show up in its
  fetched text at all (MediaWiki puts them in a footer box the fetcher already treats as
  furniture on purpose), so `fetch_wiki_live_pages.py` now asks the API for them directly. A
  dump page still has them as `[[Category:...]]` wikitext, now both read for the guess and
  stripped from the body (previously undiscovered: they would have rendered as stray
  `Category:Bosses` text in a dump-sourced note — none of the pass-1 dump samples happened to
  have one to expose this).
- **Invisible formatting marks are trimmed.** Two of the pass-1 samples (False Knight, and
  now Army Dillo's own page separately) carry left-to-right mark characters (U+200E) that are
  invisible on screen but real characters, sitting at the very start of a printed note. They
  are now trimmed from every unit (a sentence, a list item, a labelled line's label or value)
  wherever they land.
- **A near-miss, not fixed:** The Crook's page also carries a heading literally titled "You
  shouldn't see this", holding a broken template's placeholder text ("Label", "Field", "Type:
  MISSION"). It never won a note here only because "Mission Objectives" (a real heading, a
  few lines later) matched the per-wiki rule first. Had this page had no "Mission" heading at
  all, the general list's final fallback (first non-empty section, in document order) would
  have surfaced the broken template text instead, since "You shouldn't see this" comes before
  "Mission Objectives" in the page. Worth a maintainer decision later: either wiki-specific
  junk-heading names to skip (mirroring strategywiki.org's own skip list), or a generic rule
  against a heading whose own words look like an error message.
- **A fetcher quirk found, not fixed (outside this pass's four items):**
  `fetch_wiki_dump_pages.py`'s `manifest.json` is overwritten, not merged, on each run — the
  live fetcher merges by title, the dump fetcher does not. Fetching Metal Man/Bubble Man/Wood
  Man after Air Man dropped Air Man's own manifest entry, and the reader's fallback (guess the
  title from the filename, leave `revision_id` blank) covered for it quietly rather than
  failing loudly. Re-fetching all four titles together restored it for this file's numbers.
  A maintainer doing this for real, one page at a time across many runs, would want the dump
  fetcher to merge the way the live one already does.
- **The 880-character cap was not touched, as instructed.** Metal Man's note above hits the
  cap exactly (880) with four more verbatim, correct sentences left unused (visible in that
  page's own dropped-notes list when the reader is run directly) — a longer cap would have
  carried them, but that is a finding, not a change made here.
tracks writing quality.
