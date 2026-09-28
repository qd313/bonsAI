# Licence for the game notes in this folder

bonsAI's code is Apache-2.0 (see `LICENSE` and `NOTICE` at the top of the repository). The game
notes in this folder are **not** Apache-2.0. Many of them are adapted from fan wikis, and those
wikis' licences travel with them.

These notes never go into the plugin download. They are built into the separate knowledge
library, which people download inside bonsAI if they want it. That library carries its own
`ATTRIBUTIONS.md` listing every source.

## `strategy_seed.json`

Each note has a `source_url` and a `source_license` field.

- **A note with a `source_url`** is adapted from that wiki page, by that wiki's contributors
  (the page's history lists them), under the licence in its `source_license` field. Adapted
  means reworded and shortened to answer questions asked on a Steam Deck. The link on the note
  is its credit.
- **A note marked `bonsAI-maintainer`** (with no `source_url`) was written for bonsAI.

The wikis the notes come from, and their licences:

| Wiki | Site | Licence |
|---|---|---|
| Brotato Wiki | brotato.wiki.spellsandguns.com | CC-BY-SA-4.0 |
| Combine OverWiki (Half-Life, Portal, Black Mesa) | combineoverwiki.net | CC-BY-SA-4.0 |
| Cyberpunk Wiki | cyberpunk.fandom.com | CC-BY-SA-3.0 |
| The Doom Wiki | doomwiki.org | CC-BY-SA-4.0 |
| The Unofficial Elder Scrolls Pages | en.uesp.net | CC-BY-SA-2.5 |
| Fallout Wiki | fallout.fandom.com | CC-BY-SA-3.0 |
| GTA Wiki | gta.fandom.com | CC-BY-SA-3.0 |
| Hollow Knight Wiki | hollowknight.wiki | CC-BY-SA-3.0 |
| Left 4 Dead Wiki | left4dead.fandom.com | CC-BY-SA-3.0 |
| Palworld Wiki | palworld.wiki.gg | CC-BY-SA-4.0 |
| The Portal Wiki | theportalwiki.com | CC-BY-4.0 |
| Super Mario Wiki | www.mariowiki.com | CC-BY-SA-4.0 |
| Pikipedia | www.pikminwiki.com | CC-BY-SA-4.0 |
| SmashWiki | www.ssbwiki.com | CC-BY-SA-4.0 |

What each licence name means, with a link to its plain-language summary:

- CC-BY-SA-4.0: Creative Commons Attribution-ShareAlike 4.0,
  <https://creativecommons.org/licenses/by-sa/4.0/>
- CC-BY-SA-3.0: Creative Commons Attribution-ShareAlike 3.0,
  <https://creativecommons.org/licenses/by-sa/3.0/>
- CC-BY-SA-2.5: Creative Commons Attribution-ShareAlike 2.5,
  <https://creativecommons.org/licenses/by-sa/2.5/>
- CC-BY-4.0: Creative Commons Attribution 4.0,
  <https://creativecommons.org/licenses/by/4.0/>
- bonsAI-maintainer: written for bonsAI by its maintainer.

## `compat_patterns.json`

These are tips written for bonsAI (every one is marked `bonsAI-maintainer`). Where a tip has a
`source_url`, that is the page where a fact in it was checked, not a page it was copied from.

## Copies of the notes elsewhere in the repository

`src/utils/kbNoteUsedByAnswer.fixtures.json` holds copies of 13 of the wiki-adapted notes above
(from the Combine OverWiki and the Hollow Knight Wiki), plus a few written for bonsAI, so a test
can check real answers against them. The same terms apply to those copies.

## The terms for this folder as a whole

The notes in this folder, taken together, are shared under **CC BY-SA 4.0**, the same terms as
the published library. That works for every source above: BY-SA 2.5 and 3.0 allow an adaptation
to be shared under a later version of the same licence, and CC BY 4.0 material may be included
in a CC BY-SA 4.0 work. If you reuse a note, keep its source link and licence with it.
