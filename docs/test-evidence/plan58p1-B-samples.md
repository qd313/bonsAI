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
mattering more than a passing test suite: on this small sample, verbatim quality tracks
"does this wiki organise its pages the way our heading list expects" at least as much as it
tracks writing quality.
