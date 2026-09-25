# Spoiler constitution (product rules)

Living product rulebook for when bonsAI should fence, unwrap, or (later) omit
spoiler-sensitive Strategy guidance.

- Bug slice that enforces named-entity display: [../archive/04-strategy-spoiler-false-positive.md](../archive/04-strategy-spoiler-false-positive.md)
- **Runtime encoding (shipped 2026-08-07):** built-in title profiles, subtractive prompt policy, display unwrap — see **Runtime encoding** below.
- Related Planned: **Spoiler coverage as a tiered setting** (★★★, open, [roadmap](../roadmap.md#knowledge-base-and-rag)), **Unfenced spoiler feedback** (soft-omit parked)
- Last checked against the code 2026-09-14. Gaps and the plan to close them: [../archive/54-spoiler-rules-gaps.md](../archive/54-spoiler-rules-gaps.md).

Draft locked from maintainer planning chat 2026-08-04. Rules 1–13 remain the product contract; the **Runtime encoding** section describes what code enforces today.

---

## Runtime encoding (shipped 2026-08-07)

**Scope:** strategy-domain guidance — Strategy mode, and Speed/Expert when strategy KB cards attach.

**Risk chip:** scored in `compute_heuristic_spoiler_risk_score` from ask mode, title profile (`low_narrative` −28 at `spoiler_risk_service.py:132`, `protect_progression` +10 at `:133`), KB section types, and entity signals (`asked_entity` **or** `kb_entity_match` → −18 at `:149`).

- Explicit consent is **not** a chip signal — it never reaches `build_spoiler_risk_signals`.
- Naming an entity **does** lower the band, even though it relaxes no title-level prompt policy. The two are answering different questions: the chip reports how spoilery the turn looks, while the named-entity carve-out (rule 7) governs what may be said in plain text about that one thing.

**Explicit consent:** unwraps **all** closed `bonsai-spoiler` fences for that turn, including collapsed history (`spoilerConsentEffective` stamped per turn).

Settings also has "start spoiler boxes open after I said spoilers are okay" (off by default). It
only changes whether the box starts open; the box is still there and can still be closed.

**Title profiles** (built-in; unknown stays conservative, treated as a story game):

| Profile | By Steam ID | By name only (no Steam ID — emulator shortcuts and the like) |
|---|---|---|
| No-story games (`low_narrative`) | Deep Rock Galactic: Survivor `2321470`, Left 4 Dead 2 `550`, The Sims 4 `1222670`, DOOM Eternal `782330` (added 2026-09-05) | State of Emergency, Deep Rock Galactic, Left 4 Dead 2, The Sims 4, Doom Eternal, Doom 64, Super Mario 64, Mario Kart 64, Smash Bros, Pikmin 2 |
| Story games (`protect_progression`) | Baldur's Gate 3 `1086940`, Fallout 4 `377160`, Hades `1145360`, Cyberpunk 2077 `1091500`, GTA San Andreas DE `1547000`, Red Dead Redemption 2 `1174180`, Half-Life 2 `220`, Portal 2 `620`, Black Mesa `362890`, Hollow Knight `367520`, GTA V Enhanced `3240220`, GTA V Legacy `271590`, GTA IV `12210`, Fallout: New Vegas `22380` | Ocarina of Time, Ship of Harkinian, Baldur's Gate 3, Fallout 4, Hades, Cyberpunk 2077, San Andreas, Red Dead Redemption 2, Half-Life 2, Portal 2, Black Mesa, Hollow Knight, Grand Theft Auto V / IV, GTA V / IV / 5 / 4, Paper Mario, Thousand-Year Door, New Vegas |
| Everything else | unknown | unknown |

Two things to know about this table. Ocarina of Time has no Steam ID in it today — the old one on
file was really Stardew Valley's ID and was removed 2026-08-21, so Ocarina is protected by its
name instead. And when a name matches both lists, the story-game answer wins: fencing too much
annoys a player, but fencing too little can never be taken back.

**Prompt policy (subtractive):**

- `low_narrative` → open routine boss/wave tactics; fence twists/endings/secret unlocks only.
- `protect_progression` / `unknown` → conservative avoid-clause; named-entity carve-out only (rule 7).
- KB *"Put spoilery walkthrough…"* clause suppressed when title is `low_narrative` **or** a named entity is active.
- Genre tags (`roguelike`, `action rpg`) are **not** title-level open signals (Hades stays protect).
- 2026-08-23: a no-story game with no boss named now gets the same plain "do not fence boss
  guidance" line the other two cases already had.
- 2026-09-02: on no-story games, and on any turn where the player named the thing they asked
  about, the wording that told the model *where* a spoiler block must sit was replaced by one
  plain "do not use spoiler fences in this reply" line. Measured on the answer test: fenced
  replies on those turns dropped from 28 of 96 to 3 of 96, and questions about endings still kept
  their fences (8 of 9).
- 2026-08-23: the prompt now recognises many more ways of naming a boss — saying the name first
  ("wheatley fight"), "deal with the exploders", "use / counter / play as", and a knowledge-base
  card's own title matched directly.
- One known limit: when nothing is running and the game is only read from the question, the risk
  score picks up that game's profile, but the prompt still treats the game as unknown, so the
  answer never claims a game is running. For story games this changes nothing. For a no-story game
  named only in the question, it means more fencing than intended. Plan 54 gap 3.

**Display unwrap** (`unwrapAskedEntitySpoilerFences`):

1. `spoilerConsentEffective` → all fences.
2. Else `low_narrative` **by AppID** → all fences.
3. Else named entity in question → fences mentioning that entity only.

Shipped 2026-08-15: a fence the turn already qualifies to open now streams as plain text from its
first word, instead of showing a "Spoiler hidden until complete…" chip while it arrives. The
mid-stream check reuses the same three rules above, so both gaps below apply while an answer is
still streaming, not only once it is done.

**Gap 1, wider than it looks.** Rule 2 only ever checks the Steam ID: `unwrapAskedEntitySpoilerFences.ts`
calls `titleProfileIsLowNarrative(appId)` with no game name, so the name-only side of the no-story
list is never reachable on screen. That is every name-only game in the table above, not only State
of Emergency — the N64 emulator shortcuts added 2026-09-05 are in the same spot. The prompt is told
to relax for these games; the screen keeps the box shut if the model fences anyway. Threading the
game's name through `buildAnswerBubbleElement` closes it; `tests/contracts/spoiler-title-profiles.json`
pins the two `resolve*` functions to each other in the meantime, and its README records this caller
gap.

**Gap 2, a second one.** The screen understands far fewer ways of naming a boss than the prompt
does — only "how do I beat / defeat / kill / fight / survive X" and "tips for X". A name-first
question like "wheatley fight" gets the relaxed prompt, but if the model fences anyway, the box on
screen stays shut: the backend works out the named thing but never sends it to the screen. Plan 54
gap 2.

Code: `spoiler_title_profiles.py` / `spoilerTitleProfiles.ts`, `ollama_prompts.py`, `spoiler_risk_service.py`.

What the named-boss promise covers today: the prompt relaxes for every way of naming a boss it
recognises, but the on-screen box only opens for the two ways the screen side understands (gap 2
above).

**Parked (not this ship):** soft-omit + soft-invite. Settings hide-by-risk-band is now the
roadmap's **Spoiler coverage as a tiered setting** entry (★★★, open).

---

## Commonality (what “low spoiler risk” really means)

Tone and Steam genre tags are weak proxies. The useful question is:

> **Does this game use hidden narrative or progression-gated knowledge as part of
> the designed experience?**

- If **no** (arcade / horde / pure multiplayer tactics / no progressive story
  secrets) → default open for routine boss/enemy guidance.
- If **yes** → default conservative (fence), then relax only with a clear signal
  (named entity, explicit consent phrase, known progress, or later risk-band
  settings).

**Do not** treat broad genres alone (`roguelike`, `action rpg`) as “almost never
spoil.” Counterexample: Hades shares `roguelike` with DRG Survivor; Hades bosses
and relationships *are* narrative.

### Examples (illustrative, not an allowlist)

| Usually open for tactics | Protect story / progression secrets |
|---|---|
| Tetris, Vampire Survivors, Brotato, DRG Survivor, TF2 class tips, Cuphead *patterns* | Hades / Hades II, Celeste, Hollow Knight, Outer Wilds, Portal, Undertale, Spiritfarer, Firewatch, Ori, Binding of Isaac endings/lore, Animal Well / Tunic secrets |

Story/campaign games that feel “laid back” still belong in the protect column.

---

## Rules

1. **Irreversible early perception.** Prefer gating text that would permanently
   change a first-time player’s view of early-game characters or goals.
2. **Player-shouldn’t-know-yet.** Fence (or later omit) information the
   protagonist/player is not supposed to have at that point (temples, later
   tools, late bosses, etc.). Example: answering a hookshot question must not
   freely spoil the longshot unless the user asked or opted in.
3. **Surprise / suspense.** Designed horror, fake-outs, and twist beats stay
   gated.
4. **Low-narrative titles.** Games without progressive story secrets rarely need
   spoilers for routine combat/boss tactics — use the commonality above, not
   genre substring alone.
5. **Premise & mechanics.** Almost never gate. How the game plays, controls, and
   difficulty framing stay plain.
6. **Lore ≠ spoiler.** Early guidance and background that does not affect the
   story stay plain. Things the player should not know yet stay gated.
7. **Named-entity consent.** If the user names a beat/boss/item in the question,
   tactics **for that named thing** are not hidden. Adjacent secrets stay fenced.
8. **Explicit opt-in wins.** Phrases like “spoilers are okay” open the turn;
   Settings spoiler masking off removes the mask UI entirely.
9. **Default when unsure.** Prefer fencing on progressive/story titles; prefer
   open only with a clear signal. Richer “when to mask by risk band” leans on the
   Planned **Spoiler confidence chip** and **User-adjustable spoiler fencing**
   (chip v1 is transparency-only and does not change fencing).
10. **Progression-gated knowledge stays gated.** Next-tool / next-area secrets
    stay behind a fence (or later soft-omit) unless asked or consented.
11. **Don’t fence the map of the conversation.** Orientation, controls, and
    “you’re stuck because of this mechanic” stay plain — without freely naming
    the next secret (rules 2 and 10).
12. **Surprise is sacred; grind is not.** Twists stay gated. Wave patterns, DPS
    checks, and arena layouts usually do not — unless learning them early ruins
    a designed discovery.
13. **Honest promises only.** Promise what code can keep (e.g. named-entity
    display unwrap). Do not promise zero false positives or perfect story
    judgment from a small local model.

---

## Mask vs omit (parked)

**Today:** tap-to-reveal fences (`bonsai-spoiler`) are the shipped control.

**Later (not the STRAT-SPOIL-DRG-01 ship):** for *adjacent* secrets, prefer
partial advice plus a soft invite (“say if you want the spoiler”) over dumping
masked content. Named-entity questions still get plain tactics for the thing
named (rule 7). Soft-omit belongs with constitution encoding + confidence /
adjustable fencing — not the false-positive bug fix.

---

## Relationship to the false-positive bug

[../archive/04-strategy-spoiler-false-positive.md](../archive/04-strategy-spoiler-false-positive.md)
ships the **named-entity display slice** (options 1+2+4). Constitution runtime encoding (profiles, consent history unwrap, Speed+KB inject) landed separately 2026-08-07; **STRAT-SPOIL-DRG-01** on-Deck QA remains its own gate.

The three required Deck rows under that gate are still unticked as of 2026-09-14. The false
positive itself was confirmed gone at the prompt on 2026-08-23, but nobody has signed off the
rows that check what actually shows on screen. Plan 54 gap 4.
