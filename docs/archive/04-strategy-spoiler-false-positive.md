# 04 — Strategy spoiler false positives (STRAT-SPOIL-DRG-01)

Recon only. No fixes applied. Scope: why the roadmap bug
*"Genre-aware spoiler policy + KB entity match (DRG Survivor boss names); verify
STRAT-SPOIL-DRG-01 on Deck"* ([roadmap.md § Bugs](../roadmap.md#bugs)) is still open, and what
closing it can honestly promise.

Failure mode under study is **over-fencing**: masking routine boss tactics the
user named in their own question. Under-fencing is explicitly not the target.

---

## 1. Root-cause ranking

Four independent defects. Any one of them alone reproduces the bug on Deck.
Ranked by confidence × blast radius.

### R1 — Display unwrap only runs on the *live* turn ★ confidence: certain

Category **(b) unwrap misses cases**.

`src/components/MainTabChatTranscript.tsx:259-260`:

```
askQuestion: answerKey === "live" ? liveQuestion || lastExchange?.question || "" : "",
appId:       answerKey === "live" ? ollamaContext?.app_id ?? null : null,
```

`buildAnswerBubbleElement.tsx:127` gates the unwrap on
`spoilerMaskingEnabled && (askQuestion.trim() || appId)`. For any turn where
`answerKey !== "live"` both inputs are empty, the gate is false, and
`unwrapAskedEntitySpoilerFences` never runs. The fences come back.

Consequence: the answer can render correctly while it is live, then re-fence
itself the moment the user asks a second question or expands the turn from the
collapsed thread. This is not model variance — it is deterministic, and it means
a QA pass that scrolls back sees a FAIL even if the live render was a PASS.

`unwrapAskedEntitySpoilerFences.ts` itself is correct for the canonical repro:
`LOW_SPOILER_RISK_APP_IDS` contains `2321470` (`:12-14`), so for DRG Survivor the
`lowRiskApp` branch (`:64`) unwraps every fence regardless of entity match.

### R2 — The backend low-risk signal is gated on the KB corpus ★ confidence: certain

Category **(c) prompt not receiving genre/KB signals on Deck**.

`_strategy_spoiler_low_risk_addendum` returns the empty string unless
`_game_genres_are_low_spoiler_risk(genres)` or `kb_entity_match`
(`ollama_prompts.py:104-105`). Both inputs are corpus-derived:

- `lookup_game_genres` (`knowledge_base_service.py:427-443`) opens
  `resolve_corpus_db_path(settings)` and reads `games.genres` by AppID. No
  corpus installed, no row for the AppID, or an empty `genres` column → `""`.
- `kb_entity_match` is `kb_text_covers_asked_entity(kb_text, entity)`
  (`game_ai_request.py:354`), which needs KB prose actually attached to the turn.

The repro row says *"KB on + seeded corpus optional."* On the corpus-optional
path **both signals are off**, the addendum is empty, and the model receives the
unmodified restrictive policy. Rendered proof:

```
$ _strategy_spoiler_policy_block(False, False, game_genres='', asked_entity='Glyphid Dreadnought', kb_entity_match=False)
STRATEGY SPOILER POLICY (default): … Avoid story endings, major twists,
late-game boss names, and exact puzzle solutions in plain text …
```

Nothing about Glyphid Dreadnought survives. The `asked_entity` argument is
computed and threaded all the way from `game_ai_request.py:353` through
`main.py:2597/2649` to `ollama_prompts.py:882` — and then discarded by the
`if not … and not …` guard at `:104`.

With the seeded corpus present the signal does fire correctly:
`data/kb/strategy_seed.json` gives `2321470` the genres
`['bullet-heaven', 'roguelike', 'action']`, and both `bullet-heaven` and
`roguelike` are in `_BULLET_HEAVEN_GENRE_MARKERS` (`ollama_prompts.py:47-58`).
So this is a *coverage* gap, not a wiring bug — the backend path works only on
the seeded configuration.

### R3 — The prompt is additive, not subtractive ★ confidence: high

Category **(a) model still fences**.

When the addendum *does* fire, the restrictive text stays in the prompt verbatim.
The model sees, in one block (`ollama_prompts.py:172-181`):

> Avoid … **late-game boss names** … in plain text
> …
> The user asked about "Glyphid Dreadnought". Keep direct tactics for that entity
> in plain text; do NOT wrap routine boss/enemy guidance in fences.

Two more competing directives sit in the same system prompt:

- `ollama_prompts.py:821` — appended to `early_block` **only when KB cards are
  attached**: *"Put spoilery walkthrough detail inside ```bonsai-spoiler``` when
  the user has not opted in."* Unconditional; not gated by the low-risk signal.
  It fires in exactly the configuration where `kb_entity_match` is supposed to
  be strongest, and it sits adjacent to the KB cards the model is grounding in.
- `ollama_prompts.py:897` — *"After a brief orientation (no spoilers beyond what
  is needed to branch)"*.

Composition order is `dynamic + general + early_block + strategy_block + …`
(`ollama_prompts.py:987`), so the addendum is last and gets some recency
advantage. That is a tendency, not a guarantee — a 2B-class local model
(`gemma4:e2b-it-qat` is the on-Deck model of record in
`docs/archive/testing-full-pre-2026-07-30.md:545`) resolves instruction conflict
toward the prohibitive reading a meaningful fraction of the time. Fencing is
also the lower-cost error for the model: it satisfies both instructions at once.

### R4 — Streaming shows the mask before unwrap can apply ★ confidence: high, impact cosmetic

Category **(b)**, transient.

`SPOILER_FENCE_RE` (`unwrapAskedEntitySpoilerFences.ts:9`) requires a closing
```` ``` ````. Mid-stream the fence is open, so `prepareStreamMarkdown` classifies
it as a spoiler fence (`streamMarkdownPrepare.ts:35`) and emits
`waitChip: { kind: "spoiler" }` (`:129-134`). The user sees a spoiler mask chip
for the duration of the fence body, which then resolves to plain text on close.

This is by design for genuine spoilers, and it is the *opposite* polarity of what
`STREAM-03` verifies. It matters here only because a QA observer watching the
stream will report "spoiler mask appeared" — which reads as a FAIL against the
current acceptance wording.

### R5 — The test has never been run ★ confidence: certain

Category **(d) false alarm** — partially.

`docs/testing-manual.md:136` still shows `- [ ] STRAT-SPOIL-DRG-01`, unchecked.
There is no evidence row for it in `docs/testing-results-2026.md`. The two DRG
Survivor Deck rows on record (#41, #42) verify **KB retrieval**, not spoiler
fencing. So part of why the bug is open is simply that verification never
happened — but R1 and R2 are real defects that would have failed it.

### Dismissed

**Follow-up prefix asymmetry.** `extract_strategy_asked_entity` strips
`STRATEGY_FOLLOWUP_PREFIX` (`ollama_prompts.py:69-70`); the TS
`extractAskedBeatEntity` does not. Not a live defect — both use unanchored
search (`re.search` / `String.match` with a non-global pattern), so
`"[Strategy follow-up] How do I beat X?"` extracts `X` on both sides. Worth
noting only as drift that becomes a bug the day either regex is anchored.

---

## 2. Architecture: where a spoiler system should live

Four layers, in increasing determinism:

| Layer | Guarantee | Failure mode |
|---|---|---|
| Prompt policy | none — statistical | model ignores or over-applies it |
| Risk scoring (genre / KB / entity) | none — it only feeds the prompt | proxy is wrong for the title |
| Post-processing (strip fences) | **deterministic** | can only act on what the model marked |
| User settings (`strategy_spoiler_masking_enabled`) | deterministic, global | all-or-nothing; not per-turn |

The load-bearing insight: **a prompt can never be the enforcement layer for a
display invariant.** Prompting decides what the model *marks*; post-processing
decides what the user *sees*. bonsAI already has both, but the post-processing
layer is currently the weaker of the two (R1) — which is backwards.

Correct division of labour for this repo:

1. Prompt = best-effort steering. Reduces how often the model marks routine
   tactics as spoilers. Never trusted.
2. Post-process = the actual contract. If the user named the entity, its fence is
   unwrapped, deterministically, on every render path.
3. Risk scoring = input to (1) and to the future confidence chip. Never a gate on
   whether (2) runs.
4. Settings = the global escape hatch, already shipped.

**Where to sit on the tradeoff for Strategy mode.** Accept more false negatives
(under-fencing) **scoped strictly to the entity the user named in that turn**;
keep the default conservative everywhere else. Naming a boss in a question is
consent-in-fact for that boss — and only that boss. This is the principled line
because it derives the relaxation from an act of the user, not from a guess about
the title.

That argument specifically counts *against* widening the genre/AppID allowlist as
the primary fix. `data/kb/strategy_seed.json` already gives Hades the
`roguelike` genre, which `_game_genres_are_low_spoiler_risk` treats as low-risk —
and Hades is a game whose boss roster *is* narrative. A title-level allowlist
relaxes the whole reply; an entity-scoped unwrap relaxes one fence.

---

## 3. Confidence bounds — what we can and cannot promise

**Can promise (deterministic, unit-testable):**

- No `bonsai-spoiler` fence renders for content that mentions an entity the user
  named in the same turn — on every render path, live and historical.
- No fence renders at all for AppIDs on the low-risk allowlist.
- Both of the above hold regardless of what the model emitted.

**Can promise as bounded reduction only (statistical):**

- How often the model wraps routine tactics in the first place. Prompt changes
  move this; they do not floor it at zero. No fixed number is defensible without
  an on-Deck sample we do not have.
- Prose hedging — "I'll keep this spoiler-light" — is unaffected by any
  fence-level fix.

**Cannot promise at all without a stronger model or curated per-entity data:**

- *"Is this boss name a story twist?"* is a genuine judgement about narrative
  structure. Genre is a weak proxy (Hades), AppID allowlists do not scale past
  hand-maintained entries, and a 2B local model cannot be relied on to make the
  call.
- Entities the user did **not** name. If the model fences something adjacent that
  the user also wanted, no signal exists to unwrap it.
- Fences whose body never repeats the entity name — `entityMentioned` checks the
  body and the full fence (`unwrapAskedEntitySpoilerFences.ts:65`), but a fence
  reading *"his second phase adds a shockwave"* with the name only in the
  surrounding prose will not match.

**Honest user-facing wording:** "Tactics for a boss you asked about by name are
never hidden. Broader story detail may still be masked." That is a promise the
code can keep. "No false positives" is not.

---

## 4. Fix options

| # | Option | Effort | Effect |
|---|---|---|---|
| 1 | Thread `question` + `appId` into every turn, not just `live` | ★ | Closes R1. Deterministic. |
| 2 | Make the low-risk addendum **subtractive** — suppress the "late-game boss names" clause and the KB clause at `:821` when it fires | ★ | Closes R3. Removes the contradiction rather than arguing with it. |
| 3 | Server-side strip before the response leaves Python | ★ | Closes R1 *and* fixes saved-chat/export paths in one place. |
| 4 | Fall back to entity-only low-risk when genres are unavailable — drop the `and not kb_entity_match` guard at `:104` so a named entity alone qualifies | ★ | Closes R2 without touching the allowlist. |
| 5 | Expand genre/AppID allowlist | ★★ | Cheap, but raises false negatives (Hades). **Not recommended.** |
| 6 | Shared entity extraction across TS/Python | ★★ | Removes drift risk. Does not fix this bug. |
| 7 | Unwrap open fences mid-stream | ★★ | Closes R4. Cosmetic; defer until QA says the flash matters. |
| 8 | Spoiler confidence chip, transparency-only | ★★ | Separate roadmap item ([roadmap.md § Planned](../roadmap.md#planned)). Does not close this bug. |

**Recommended primary:** 1 + 2 + 4. All ★, all independently testable, and
together they cover the display path (1), the instruction conflict (2), and the
corpus-optional configuration (4). Option 4 is the one that makes the backend
work on an unseeded Deck, which is what the repro's "corpus optional" clause
demands.

**Recommended fallback:** 3, if an on-Deck run after 1/2/4 still shows fences.
Server-side stripping is the strongest available guarantee — the fence never
reaches the frontend — at the cost of losing the raw model output for
transparency views. Take that cost only if measurement says we need to.

**Do not do:** 5, for the reason in §2.

---

## 5. Verification

### Extended STRAT-SPOIL-DRG-01 matrix

| ID | AppID / title | Question | Consent | KB | Stream | Expected |
|---|---|---|---|---|---|---|
| DRG-01 | 2321470 DRG Survivor | How do I beat Glyphid Dreadnought? | no | on + seeded | on | plain text, no fence |
| DRG-01b | 2321470 | same | no | **off** | on | plain text — covers R2 |
| DRG-01c | 2321470 | same | no | on, **corpus absent** | on | plain text — covers R2 |
| DRG-01d | 2321470 | same, then **ask a 2nd question** | no | on | on | first answer stays unfenced after it leaves live — covers R1 |
| DRG-01e | 2321470 | same | no | on | **off** | plain text — isolates R4 |
| DRG-01f | 2321470 | `[Strategy follow-up]` + same | no | on | on | plain text on follow-up turn |
| HADES-01 | 1145360 Hades | How do I beat Megaera? | no | on | on | **fence expected** — guards against over-relaxing via `roguelike` genre |
| OOT-01 | 413150 OoT | How do I beat King Dodongo? | no | on | on | fence or minimized prose (existing row) |
| CONSENT-01 | 413150 | "Spoilers are okay — how do I beat King Dodongo?" | phrase | on | on | plain text (existing row) |
| MASK-OFF-01 | 2321470 | as DRG-01 | no | on | on | no tap-to-reveal UI at all (existing row) |

`HADES-01` is the new row that matters most — it is the regression guard for the
false-negative direction, and nothing in the current matrix covers it.

### Coverage reality

- **Preview suite** (`STREAM-03-strategy-spoiler`, last PASS 2026-06-09 /
  `a9237e4`) verifies that an open `bonsai-spoiler` fence **does** mask mid-stream
  with no body flash. That is the opposite polarity of this bug. There is **no
  preview coverage for over-fencing** today.
- `docs/planning/01-qa-automation-plan.md:193` and `:258` already call this out:
  spoiler-mask *appropriateness* ("are DRG Survivor boss names spoilers?") is
  classed as qualitative / vision-tier, not DOM-assertable.
- What *can* be automated cheaply and is not: a vitest case that renders a
  non-live turn and asserts no fence survives (R1), and a Python case asserting
  the addendum fires with `game_genres=""` and a non-empty `asked_entity` (R2/#4).
  The existing Python test
  (`tests/test_ollama_service.py:675 test_strategy_spoiler_policy_low_risk_genre_skips_fence_for_named_boss`)
  passes genres explicitly and therefore cannot catch R2.
- Everything downstream of "did the model fence it" stays on-Deck-only.

---

## 6. Verdict

**Not** acceptance of residual model variance — not yet. Two deterministic
defects (R1, R2) sit in front of the variance question and have never been ruled
out on-device, and R5 says the test that would have caught them was never run.

Closing the bug is: **an unwrap fix (R1) + a prompt tweak (R2/R3)**, then one
on-Deck pass over the matrix above. Residual variance is real but is the
*fourth* thing to blame, not the first.

Recommend rewording the roadmap acceptance criterion from "no spoiler fence for
boss tactics" to **"no spoiler fence is rendered for the entity named in the
question"** — a display-level invariant the code can actually guarantee and a
test can actually assert, rather than a claim about model behaviour.

---

## 7. Decisions (maintainer planning chat 2026-08-04)

Locked before implementation plan draft. Constitution lives separately:
[spoiler-constitution.md](../planning/spoiler-constitution.md). This bug ships **one
enforceable slice** of that rulebook, not the whole thing.

### Scope

| Topic | Decision |
|---|---|
| Primary fix | Recon options **1 + 2 + 4** only (thread `question`/`appId` on every turn; subtractive low-risk prompt; entity-only low-risk when genres/KB unavailable) |
| Option 3 (server-side strip) | **Fallback only** if on-Deck still fails after 1+2+4 — not committed in the same ship |
| Option 5 (widen genre/AppID allowlist) | **Do not** as primary fix (recon §2; Hades counterexample) |
| Option 7 / R4 mid-stream chip | **Shipped 2026-08-15.** No spoiler wait-chip while streaming for a fence the turn already qualifies to unwrap (consent, low-risk AppID, or named entity) — see NEEDS VERIFICATION below |
| Omit + soft invite | **Parked** in constitution / roadmap — out of this bug’s code |
| Shared TS/Python entity extraction (option 6) | Out of scope for this bug |

### Product / UX

| Topic | Decision |
|---|---|
| Acceptance criterion | **"No spoiler fence is rendered for the entity named in the question"** (display-level; not a claim about model behavior) |
| Honest user-facing line | Tactics for a boss you asked about by name are never hidden; broader story detail may still be masked |
| Named entity (incl. Hades / Megaera) | If the user asks by name → **plain text**, not fenced |
| Genre over-relax guard | Separate from named row: Hades (or similar) question that does **not** name the boss → story detail should **still** fence |
| Constitution | Long-term rulebook; ★★★★ Planned to encode later; referenced from this doc |

### Verification (ship gate — short subset)

Full recon matrix in §5 is coverage debt, not the minimum to close the bug.

**Automated (required)**

- Vitest: non-live turn still unwraps named-entity / low-risk AppID fences (R1)
- Python: low-risk addendum fires with empty `game_genres` + non-empty `asked_entity` (R2 / option 4)
- Vitest: an open spoiler fence streams as prose (no wait chip) when the turn's eligibility gate
  already qualifies it; an ineligible open fence still masks (R4, shipped 2026-08-15)

**On-Deck (required)**

1. **DRG-01** — Glyphid Dreadnought by name → plain text
2. **DRG-01d** — second question → first answer stays unfenced (R1)
3. **DRG-01b or DRG-01c** — KB off or corpus absent → still plain text (R2)
4. **DRG-01-STREAM-01** — as DRG-01 with streaming on → no *Spoiler hidden until complete…* chip at
   any point (R4)

**On-Deck (recommended if time)**

5. Hades, **named** Megaera → plain text (decision above; supersedes recon HADES-01 “fence expected” for the named case)
6. Hades, **not named** → story-adjacent detail still fenced (true genre over-relax guard); with
   streaming on this is also **HADES-UNNAMED-STREAM-01**, the regression guard for R4

**Not required to close:** stream off, follow-up prefix, OOT, CONSENT, MASK-OFF.

### Related docs

- Constitution draft: [spoiler-constitution.md](../planning/spoiler-constitution.md)
- Roadmap bug + Planned constitution feature: [roadmap.md](../roadmap.md)

---

## NEEDS VERIFICATION

All decisions in §7 were locked in chat from recon in this file. Before treating
them as implementation gospel, verify against current code and on-Deck behavior:

- [x] R1 still reproduces (historical / non-`live` turns re-fence) on current HEAD — **confirmed 2026-08-07** at `MainTabChatTranscript.tsx` `renderAnswerBubble`, which passed `askQuestion: ""` / `appId: null` for any `answerKey !== "live"`, and `buildAnswerBubbleElement` gates the unwrap on exactly those. **Fixed** — both now threaded per turn, AppID stamped onto the turn at completion
- [x] R2 still reproduces (corpus-optional / empty genres → empty addendum) on current HEAD — **confirmed 2026-08-07**: `_strategy_spoiler_low_risk_addendum` returned `""` and the rendered block contained nothing about the asked entity. **Fixed** via the named-entity arm plus a Python AppID allowlist mirroring the TS one
- [x] Option 4 (entity-only low-risk) does not over-relax narrative titles when the user did **not** name an entity — **covered by unit test** `test_strategy_spoiler_policy_narrative_app_id_without_entity_stays_fenced` and `test_strategy_spoiler_policy_story_game_keeps_default_fence`. When an entity **is** named, relaxation is scoped to it: the addendum says so explicitly and the avoid-clause reads *"late-game boss names other than X"* (`test_strategy_spoiler_policy_named_entity_does_not_relax_the_rest`). Still wants the on-Deck Hades pair to confirm the model honours the scoping
- [ ] Subtractive prompt change (option 2) does not drop needed fences for OOT-class progression secrets — **unit-level only so far**; the unnamed-ask path keeps the full avoid-clause, but whether the model still fences progression secrets is on-Deck behavior
- [ ] Ship-gate Deck rows DRG-01 + 01d + (01b\|01c) after 1+2+4
- [ ] Hades named vs unnamed expectations match §7 (recon HADES-01 row is partially superseded)
- [x] R4 (mid-stream spoiler chip flash) — **fixed 2026-08-15.** `prepareStreamMarkdown` takes an
      optional `unwrapOpenSpoilerFence` callback; `buildAnswerBubbleElement.tsx` builds it from the
      same eligibility gate as the closed-fence unwrap (`shouldUnwrapSpoilerFence`, extracted from
      `unwrapAskedEntitySpoilerFences.ts`), so a turn that would unwrap once the fence closes now
      streams it as prose from the moment the fence opens instead of masking until close. Called
      with no callback, `prepareStreamMarkdown` is byte-identical to before — the four pre-existing
      `streamMarkdownPrepare.test.ts` cases (including "masks open spoiler fence body (S1)") pass
      unedited. 12 new unit cases across the three files. **Still on-Deck:** confirm the preview
      scenario `STREAM-03-strategy-spoiler` stays PASS (opposite polarity — an ineligible open fence
      must still mask with no body flash), plus **DRG-01-STREAM-01** / **HADES-UNNAMED-STREAM-01**
      in [testing-manual.md](../testing-manual.md)
- [ ] Constitution ★★★★ roadmap item exists and links here / to [spoiler-constitution.md](../planning/spoiler-constitution.md) — encoding work is **not** part of this bug fix
- [ ] Option 3 only reconsidered if Deck still fails after 1+2+4

**NEEDS VERIFICATION**
