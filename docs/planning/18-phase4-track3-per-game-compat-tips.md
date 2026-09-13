# Phase 4 track 3 — per-game troubleshooting tips

**Status: BLOCKED on a schema change, written up 2026-08-19.** Tracks 1 and 2 of Phase 4
shipped the same day; this one did not, and the reason is structural rather than effort.

Locked spec: [knowledge-base.md](../knowledge-base.md) § Phase 4 — *"Track 3 retrieval (P1):
prefer per-game AppID tips first; fall back to shared `compat_patterns`"*, *"Tip volume (T1):
~3–5 tips each for the sample titles"*, *"Per-game hybrid: same FTS→vector hybrid as shared
tips"*, *"No running game (N1): shared tips only"*.

---

## Why it is blocked

`compat_patterns` has no per-game column:

```sql
CREATE TABLE IF NOT EXISTS compat_patterns (
    pattern_id INTEGER PRIMARY KEY,
    topic TEXT NOT NULL,
    platforms TEXT NOT NULL DEFAULT '[]',
    card TEXT NOT NULL,
    source_url TEXT,
    source_license TEXT
);
```

There is nowhere to record that a tip is about *this game*. Adding one is a **schema v4 bump**,
and by the corpus's own rule (**Decision 6**, no migration) every installed corpus becomes
keyword-only-and-stale until re-downloaded. The published artifact would need a point release
for any of it to reach a user.

That is a deliberate, announced release action, not a quiet edit, which is why it stopped here
rather than shipping at speed alongside the other two tracks.

## The shape when it is unblocked

**Schema.** Add `app_id TEXT` (nullable) to `compat_patterns`, indexed. Null means the tip is
shared — which is every tip that exists today, so the column is additive and the existing 124
rows need no authoring. `compat_patterns_fts` does **not** need the new column: it is a filter,
not a search term, and indexing it would let a bare AppID string match text.

**Retrieval.** The machinery already exists as of 2026-08-18. Per-game tips are the same shape
of signal as the routed topic in **D22** — a flat preference over a recall path:

1. When a game is resolved, pull that game's tips into the pool (`app_id = ?`), no keyword gate,
   exactly as `_compat_tips_for_topics` does for the routed topic.
2. Mark them preferred so they outrank an equally-good shared tip.

Reuse `preferred_ids` and `RRF_W_TOPIC` rather than adding a third weight. If per-game tips
should outrank routed-topic tips, that is one comparison, not a new mechanism — but do not
assume it: **measure before adding a second weight**, because the last two weights in this
system both turned out to need the *weakest* value that worked, not the strongest.

**N1 holds for free.** With no game resolved there is no `app_id` to filter on, so the pool is
the shared sheet — the behaviour the lock asks for, with no extra branch.

**Authoring.** 3–5 tips each for the sample titles (DRG Survivor, Ocarina/Ship of Harkinian).
Per-game tips are where a Deck-specific quirk lives — a title that needs a launch option, a
known Proton version, a controller layout that ships broken. Those are exactly the claims that
go stale, so date them and expect to fix forward.

### Maintainer-supplied quirks, 2026-08-21

From the maintainer's own Deck. Both confirmed verbatim on 2026-08-21 — record them as given.

| Title | Launch option | Provenance |
|---|---|---|
| Fallout 4 (`377160`) | `moshortcut://"F4SE"` | Launches F4SE through Mod Organizer 2. Confirmed verbatim by the maintainer, whose Deck it runs on. Write the card with the string exactly as it appears here; it is shorter than most MO2 guides show, and it is the one that works on the machine we have evidence from. |
| GTA: San Andreas – DE (`1547000`) | `%command% -dx12` | Runs on the maintainer's Deck. **Symptom unknown** — they do not know what it fixes. |

**Write the GTA card without a symptom rather than guessing one.** A compat tip normally leads
with the problem, because the problem is what a user types. This one cannot, so it says what it
is — a launch option the maintainer runs — and stops there. Inventing "fixes crashes on launch"
would make it more findable and possibly false, and a wrong compat claim is the kind that costs
trust fastest.

### Two problems with the content, and the better question to ask

**1. The question asked was too narrow.** *"Any launch options, Proton versions, or broken
controller layouts?"* returned two answers because those are three categories out of many. A
per-game tip is any Deck-specific thing about a title: a graphics setting that costs half the
battery, a menu that does not take touch input, a save that lives somewhere unexpected, a first
launch that takes five minutes compiling shaders and looks hung. The maintainer plays these
games and will know several without thinking of them as "compat". **Ask what is annoying about
playing each title on a Deck, not what is configured.**

**2. Neither title is a sample title.** The lock names Deep Rock Galactic: Survivor and
Ocarina of Time / Ship of Harkinian; the real knowledge is Fallout 4 and GTA: San Andreas – DE.
Both are in the corpus already (`game_id` 5 and 9). Three options, in preference order:

- **Move the sample titles to Fallout 4 and San Andreas.** Track 3 exists to prove per-game tips
  work; proving it on titles with genuine tips beats proving it on titles whose tips were
  invented to fill a quota. Nothing in the retrieval design cares which titles they are.
- **Cover four titles**, two proven and two thin. More authoring for no extra proof.
- **Keep the locked pair and write DRG/OoT tips from research.** Cheapest to say, worst to trust:
  it puts unverified claims in the one part of the corpus users will act on directly.

Recommend the first, and treat the volume target (3–5 each) as a target rather than a gate —
two real tips are worth more than five padded ones.

**Maintainer answered 2026-08-22: option three — keep Deep Rock Galactic: Survivor and Ocarina of
Time, and write their tips from research.** Locked as **D29**. This is the option this page rated
worst, and the maintainer chose it with that rating in front of them, so it is settled and not to
be re-argued. What follows from it, so it is handled rather than forgotten:

- **Every researched tip is an unverified claim and the card must say so.** The two
  maintainer-supplied quirks (Fallout 4, San Andreas) have a named provenance — *runs on the
  maintainer's Deck, confirmed 2026-08-21*. A researched DRG or Ocarina tip has nothing of the
  kind. Give them a distinct provenance line and the weaker trust tier the corpus already has for
  exactly this; do not let the two kinds render identically.
- **Prefer quirks that are checkable on the maintainer's own Deck** over ones that are not. A
  shader-compilation stall or a menu that ignores touch can be confirmed in a minute; a claim
  about a specific Proton build cannot, and is the kind that goes stale silently.
- **The Fallout 4 and San Andreas quirks do not disappear.** They are real, dated and already
  written up above. Author them as shared-sheet or per-game tips anyway rather than discarding the
  only verified per-game knowledge in the repo because the sample titles went elsewhere.
- **Volume stays a target, not a gate.** Under this option the temptation to pad to 3–5 is
  stronger, not weaker, because there is no natural supply. Two defensible tips beat five
  researched ones.

## What to check before starting

- **Whether the corpus is due a release anyway.** This work is cheap to bundle with a point
  release and expensive as its own. If a release is already planned for the Phase 4 content
  cards, this rides along.
- **Whether `platforms` already carries what you need.** It holds a JSON list and is FTS-indexed
  today. It is not an AppID, but check the authoring intent before adding a parallel column.
- **The eval fixture.** `kb_eval_v2` compat rows are labelled by `expect_topic`, and a compat
  card's `name` *is* its topic — so the eval currently cannot tell a per-game tip from a shared
  one on the same topic. Track 3 needs a label that distinguishes them, or it ships unmeasured.
  This is the same blind spot recorded for the recall slice; see
  [rag-compat-topic-preference-2026-08-18.md](../archive/rag-compat-topic-preference-2026-08-18.md) § 6.
