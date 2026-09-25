# 06 — Thinking blurbs: implementation review, best practice, confidence bounds

Status: **§ 7 items 1–6 and 8 all landed 2026-08-08.** Item 7 was declined; 9–12 remain optional. See
[§ 10 Implementation log](#10-implementation-log) for what shipped and what the maintainer chose.
Everything above § 10 is the original 2026-08-03 analysis and is left unedited except this header —
where it disagrees with the code now, § 10 is right.

Answers `docs/archive/roadmap-planning-questions.md` § 6.
Written 2026-08-03 from static reading of `main.py`, `py_modules/backend/services/`, `src/`, plus two
local probe runs against `bonsai_stream_tags.py` (recorded inline where they back a number).
No on-Deck run backs this document. Every claim is a `file:line` citation or marked **UNKNOWN**.

Feature shipped incrementally Jun–Jul 2026 (`docs/archive/roadmap-completed.md`).
QA rows **THINKING-01…03** and **THINKING-COPY-01** are still Open on-Deck.

---

## 1. Lifecycle as built

### 1.1 The pipeline in prose

There are **three writers** to one string (`thinking_summary`) and **one reader** (the italic line).

1. **Submit (client, t≈0).** `onAskOllama` mints a client-local sequence via `startNextRequest()`
   ([useBackgroundGameAi.ts:46-49](../../src/hooks/useBackgroundGameAi.ts)), sets `isAsking`, and
   immediately sets `thinkingSummary` from `composeThinkingBlurb(q, {requestId: seq, …})`
   ([useBonsaiAskOrchestration.ts:813-823](../../src/hooks/useBonsaiAskOrchestration.ts)).
   This is the only reason the line is instant — nothing has crossed the RPC boundary yet.

2. **Backend opener (t≈first prep).** `start_background_game_ai` bumps `_background_request_seq`,
   resets the partial snapshot ([main.py:2405-2407](../../main.py)); `run_game_ai_request` then publishes
   its **own** `compose_thinking_blurb(...)` through `_publish_thinking_phase`
   ([game_ai_request.py:195-205](../../py_modules/backend/services/game_ai_request.py)).

3. **Prep phases (backend, during real work).** `_publish_thinking_phase_key` → `format_thinking_phase`
   ([main.py:430-458](../../main.py)). Live emitters, and **only** these:
   - `proton_logs` — [game_ai_request.py:216](../../py_modules/backend/services/game_ai_request.py)
   - `searching_kb` — [game_ai_request.py:278](../../py_modules/backend/services/game_ai_request.py)
   - `tdp_read` — [game_ai_request.py:327](../../py_modules/backend/services/game_ai_request.py)
   - `screenshot_prep` — [ollama_ask_service.py:94](../../py_modules/backend/services/ollama_ask_service.py)
   - `model_retry` — [ollama_ask_service.py:281](../../py_modules/backend/services/ollama_ask_service.py)

4. **Model tag (during generation).** The system prompt always asks for a leading
   `<bonsai-status>…</bonsai-status>` ([ollama_prompts.py:806](../../py_modules/backend/services/ollama_prompts.py)
   → `build_bonsai_status_stream_instruction`, [:532-586](../../py_modules/backend/services/ollama_prompts.py)).
   Each content delta re-runs `extract_bonsai_status("".join(deltas))`
   ([ollama_service.py:376-389](../../py_modules/backend/services/ollama_service.py)); the summary is
   handed to `on_delta` and written into the snapshot
   ([ollama_ask_service.py:246-255](../../py_modules/backend/services/ollama_ask_service.py),
   [main.py:392-393](../../main.py)).
   **`on_delta` is built for every background Ask**, not only when token streaming is on — the setting
   only gates `update_partial` ([ollama_ask_service.py:241-255](../../py_modules/backend/services/ollama_ask_service.py)).
   So the model tag reaches the UI with the flag off too. That is a good design decision and it is easy to miss.

5. **Read + fallback.** `_merge_partial_into_background_status` copies the snapshot into the status payload
   while `status == "pending"` and the ids match; if no summary exists it substitutes
   `deterministic_thinking_phase_fallback` ([main.py:460-485](../../main.py),
   [bonsai_stream_tags.py:661-674](../../py_modules/backend/services/bonsai_stream_tags.py)).
   Otherwise `thinking_summary` is nulled.

6. **Poll.** 1200 ms normally, 150 ms while `status.streaming` or the token-streaming ref is true
   ([useBackgroundGameAi.ts:13-15, 70-77](../../src/hooks/useBackgroundGameAi.ts)).

7. **Apply.** `applyBackgroundStatusToUi` prefers `status.thinking_summary`, else recomposes client-side —
   this time keyed on the **backend** `request_id` — and runs `sanitizeThinkingSummary` over the result
   ([useBonsaiAskOrchestration.ts:439-454](../../src/hooks/useBonsaiAskOrchestration.ts)).

8. **Render (THINKING-03).** The italic line is gated on
   `expandedTurnKey === "live" && isAsking && thinkingSummary`
   ([MainTabChatTranscript.tsx:343-360](../../src/components/MainTabChatTranscript.tsx)) — deliberately
   *not* gated on `isStreamingPreview`, so it coexists with the streaming preview bubble rendered just
   below it at [:361-363](../../src/components/MainTabChatTranscript.tsx). THINKING-03's requirement is
   structurally satisfied; what is unverified on-Deck is whether it *updates* during the stream (see §2.6).

9. **Clear.** Terminal statuses clear it, except when a stream reveal is mid-flight, where the clear is
   deferred one frame to `isStreamSettling`
   ([useBonsaiAskOrchestration.ts:371-379, 517-524](../../src/hooks/useBonsaiAskOrchestration.ts)).
   Cancel, error, reset and field-clear paths each null it explicitly
   ([:476](../../src/hooks/useBonsaiAskOrchestration.ts), [:622](../../src/hooks/useBonsaiAskOrchestration.ts),
   [:705](../../src/hooks/useBonsaiAskOrchestration.ts), [:713](../../src/hooks/useBonsaiAskOrchestration.ts),
   [:1183](../../src/hooks/useBonsaiAskOrchestration.ts)). It also survives a QAM remount via the session
   snapshot ([bonsaiSessionSurvival.ts:59](../../src/utils/bonsaiSessionSurvival.ts)).

### 1.2 What genuinely works

- **Zero added inference cost.** No sidecar model, no second HTTP call. The whole feature is string
  selection plus one tag the main model was going to stream anyway.
- **Instant.** The client opener means the line is on screen before any RPC resolves.
- **Selection is time-independent by construction.** `compose_thinking_blurb` explicitly discards
  `elapsed_seconds` (`del elapsed_seconds  # kept for API parity`,
  [bonsai_stream_tags.py:578](../../py_modules/backend/services/bonsai_stream_tags.py)) and picks by
  `request_id` only. That is exactly the invariant THINKING-COPY-01 asks for, enforced in code rather
  than by convention.
- **The phases that exist are honest.** `proton_logs`, `searching_kb`, `tdp_read`, `screenshot_prep`,
  `model_retry` each fire immediately before the corresponding real work. The line is not lying.
- **Tag stripping is unusually careful.** `_strip_incomplete_bonsai_status_open`
  ([bonsai_stream_tags.py:76-103](../../py_modules/backend/services/bonsai_stream_tags.py)) hides
  `<`, `<bons`, and the broken `<bons you're asking…` prefix-then-prose form. That is real hard-won
  handling of small-model behaviour, and it is the difference between a clean stream and visible tag debris.
- **Teardown is disciplined.** The snapshot is lock-guarded, id-matched, and nulled on every non-pending
  status ([main.py:387-390, 481-484](../../main.py)), so a stale blurb cannot bleed into the next Ask.

---

## 2. Defects and fragility

Ordered by user-visible impact.

### 2.1 Two identity spaces for `request_id` → the opener changes for no reason

The client composes with `seq` from a **per-mount** counter starting at 1
([useBackgroundGameAi.ts:31, 46-49](../../src/hooks/useBackgroundGameAi.ts)). The backend composes with
`_background_request_seq`, a **per-plugin-lifetime** counter
([main.py:2405-2407](../../main.py)). These agree only by coincidence.

Because `_pick_template` is `hash(request_id) % len(pool)`
([bonsai_stream_tags.py:168-172](../../py_modules/backend/services/bonsai_stream_tags.py)), a different id
means a different template from the *same* pool for the *same* phase. So the first poll typically
rewrites the line from one generic opener to a different generic opener.

That is a direct **THINKING-COPY-01** violation, and it is the single most likely cause of the
"feels random / feels fake" impression: the very first thing the line does is change without anything
having happened.

### 2.2 The TS and Python intent classifiers have already drifted

`composeThinkingBlurb.ts` re-implements four Python predicates by hand
([composeThinkingBlurb.ts:262-324](../../src/utils/composeThinkingBlurb.ts) vs
[ollama_prompts.py:183-196, 243-256, 386-416](../../py_modules/backend/services/ollama_prompts.py)).
The troubleshooting one is not a mirror at all — TS uses a broad
`crash(es|ed|ing)?|stutter(ing)?|won't launch|proton` regex; Python uses a specific phrase list
(`"why is my game crashing"`, `"fix stuttering"`, `"proton issue"`, …).

Probe (`_resolve_compose_intent`, ask_mode=speed, no attachment):

| Question | Python intent | TS intent |
|---|---|---|
| `Why does Elden Ring crash on launch?` | `generic` | `troubleshooting` |
| `How do I fix stuttering?` | `troubleshooting` | `troubleshooting` |

So for the first question the client shows a log-diving line and the backend replaces it with a generic
one ~1.2 s later. This compounds §2.1: the line can change *pool* as well as *template*.

The duplication is not one function — it is ~330 lines of TS mirroring ~400 lines of Python, with no
shared fixture keeping them honest.

### 2.3 `sanitizeThinkingSummary` diverges, and can blank the line entirely

Python falls back to the original when stripping empties the string
(`return cleaned if cleaned else raw`,
[bonsai_stream_tags.py:73](../../py_modules/backend/services/bonsai_stream_tags.py)). Probe:
`sanitize_thinking_summary("Sure.") == "Sure."`.

TS has no such fallback and returns `""`
([composeThinkingBlurb.ts:390-399](../../src/utils/composeThinkingBlurb.ts)).

Consequence: a model that emits `<bonsai-status>Sure.</bonsai-status>` — precisely the lazy opener the
prompt warns against, so precisely the case that occurs — produces a backend summary of `"Sure."`, which
the client sanitizes to `""`, which fails the truthiness guard at
[MainTabChatTranscript.tsx:343](../../src/components/MainTabChatTranscript.tsx). **The thinking line
disappears mid-Ask** and does not come back until another phase publishes. One-line fix; disproportionate
symptom.

### 2.4 ~22 % of Asks show emoji-only text for every phase change

Every branch of `_phase_pool` returns exactly **5** entries with the emoji-only line last
([bonsai_stream_tags.py:382-563](../../py_modules/backend/services/bonsai_stream_tags.py)), and
`_pick_template` uses the same `request_id` for every phase. So when
`_stable_bucket(rid) % 5 == 4`, *every* phase transition in that Ask renders as a bare `🙄` / `🌳`
next to a spinner.

Probe over rid 1…50 with a five-phase sequence: **11/50 Asks were all-emoji**. That matches the
predicted 1-in-5. The fix is to mix the phase key into the bucket, not to remove the emoji lines.

### 2.5 Three declared phases have no emitter; one exported constant is dead

`AskThinkingPhase` declares nine phases
([bonsai_stream_tags.py:22-32](../../py_modules/backend/services/bonsai_stream_tags.py)). Grep across
`main.py` + `py_modules/` finds production emitters for six. **`experiment_journal`,
`building_context`, `connecting_model`** are referenced only by `format_thinking_phase` itself and by
`tests/test_bonsai_stream_tags.py` / `tests/test_background_partial_state.py`.

That is roughly 90 lines of copy (including the `still_building` elapsed variant and its
`_BUILDING_CONTEXT_MAX_SECONDS` logic) that no user has ever seen, plus four unit tests asserting
implementation shape rather than behaviour — the failure mode `docs/archive/00-phase0.md` already flagged.

Separately, `BONSAI_STATUS_STREAM_INSTRUCTION`
([ollama_prompts.py:508-515](../../py_modules/backend/services/ollama_prompts.py)) is superseded by
`build_bonsai_status_stream_instruction` and has no call site. Note the planning question cites the dead
constant as the live prompt — the dynamic builder is what actually ships.

### 2.6 The model tag is captured once and then frozen

`extract_bonsai_status` keeps only the first summary (`if summary is None`,
[bonsai_stream_tags.py:113-118](../../py_modules/backend/services/bonsai_stream_tags.py)), and it is
re-run against the full joined text on every delta. So the value is identical for every delta after the
tag closes, and `_update_partial_response` only overwrites when truthy
([main.py:392-393](../../main.py)).

Net effect: during the entire generation — the longest phase of a Deck Ask — the thinking line is
**static**. THINKING-03 says the line must stay visible and update from `<bonsai-status>`; today it stays
visible and updates exactly once. Whether that reads as "calm" or "stuck" on a 30 s Ask is a product
call, but it should be a deliberate one.

### 2.7 The model status line bypasses Strategy spoiler masking

Spoiler masking is applied inside `buildAnswerBubbleElement` only
([MainTabChatTranscript.tsx:248-260](../../src/components/MainTabChatTranscript.tsx)); the thinking line
renders `{thinkingSummary}` raw ([:358](../../src/components/MainTabChatTranscript.tsx)).

Template-composed blurbs are safe — they quote the user's own words. But the **model-emitted** tag is
free-form model text on a spoiler-masked surface, guarded only by a prompt sentence
([ollama_prompts.py:562-568](../../py_modules/backend/services/ollama_prompts.py)). A small model that
writes `<bonsai-status>Working out how to beat Malenia's waterfowl dance</bonsai-status>` leaks in plain
text above a masked answer. Same risk class as STREAM-03, one surface further out.

### 2.8 Lesser issues

- **`deterministic_thinking_phase_fallback` is near-dead.** The backend publishes an opener during prep
  ([game_ai_request.py:195-205](../../py_modules/backend/services/game_ai_request.py)), so the snapshot
  is rarely empty and the elapsed-time ladder ("Warming up the brain cells…" → "Still here. Still
  thinking…") only covers the sub-second window before that. Its "Drafting your masterpiece…" branch is
  unreachable in practice, since a partial implies deltas which imply a published summary.
- **Poll latency.** With token streaming off, `streaming` never goes true
  ([main.py:394-397](../../main.py)), so polling stays at 1200 ms and a phase change can be up to
  1.2 s stale. For `screenshot_prep` and `model_retry` — often shorter than that — the line can skip
  the phase entirely.
- **`extract_bonsai_status` is O(n²) over the stream** — full join plus two regex passes per delta
  ([ollama_service.py:382-385](../../py_modules/backend/services/ollama_service.py)). At Deck reply
  sizes (single-digit KB) this is noise, but it scales with reply length on a battery-powered device.
- **`elapsedSeconds` in `ComposeThinkingBlurbOptions`** is declared and never destructured
  ([composeThinkingBlurb.ts:38](../../src/utils/composeThinkingBlurb.ts)) — harmless, mirrors the
  Python `del`, but reads as a live knob.

---

## 3. Best practice for local-LLM thinking UX

Ranked by *value per unit of risk* on this hardware.

1. **Real pipeline steps — highest value.** They are free, always true, and unfakeable. bonsAI already
   has five and they are the best part of the feature. The gap is coverage, not quality: context
   assembly, model connect, and journal load are the slow parts of a Deck Ask and currently show nothing
   (§2.5). "Searching knowledge base for *your question*" is worth more than any joke because a user who
   sees it learns what the plugin actually does.
2. **Deterministic template copy — good, with a ceiling.** Cheap, instant, no variance. The ceiling is
   repetition: a fixed pool is a fixed pool, and users on a handheld they use daily will exhaust it. It
   works best as *connective tissue between real phases*, not as the main event.
3. **Model-emitted status — worth keeping, never worth relying on.** One tag costs ~15 tokens and gives
   genuine specificity that no template can. But compliance with a 3-B-parameter model is a probability,
   not a contract, and the failure modes are ugly (tag debris, lazy openers, spoilers). Treat it as an
   *enhancement layer* that may silently not arrive.
4. **Small sidecar model — not worth it here.** See §6.
5. **Showing real reasoning (`think: true`) — the actual long-term answer**, and blocked on the soft
   `num_predict` bug. That is a different feature from blurbs and should stay that way.

The industry pattern that fits bonsAI is **honest instrumentation with a light voice**: report the real
step, phrase it in character, and let model-emitted specificity override when it shows up. That is
roughly what is built. The problem is not the architecture; it is that three writers disagree about
what to write.

---

## 4. Claude / ChatGPT gap analysis

Architecture-level inference from public behaviour only. No insider knowledge.

**Structurally unavailable on-Deck:**

- **A dedicated reasoning channel.** Frontier products surface a separate reasoning stream produced by
  the same forward pass as the answer, not a status line the model was asked to author. bonsAI turns
  reasoning off precisely so it does not eat `num_predict`
  (`roadmap.md` § Bugs, soft `num_predict`). Until that is fixed there is no second channel to show.
- **Instruction-following headroom.** "Emit exactly one tag, first, under 120 chars, no markdown,
  no spoilers, in character" is a five-constraint instruction. Frontier models satisfy it near-always;
  Deck-class models satisfy it sometimes. This is a model-capability gap, and no amount of prompt
  engineering closes it.
- **Server-side orchestration.** Retrieval, tool calls, and sub-agent steps run as discrete, observable
  server events with sub-100 ms push to the client. bonsAI polls a mutex-guarded dict at 150–1200 ms.
- **Curation at scale.** Commercial copy is A/B tested against millions of sessions. A FOSS plugin has
  one maintainer's taste and a handful of testers.

**Genuinely replicable, and where the remaining wins are:**

- **Phase honesty.** Fully replicable, already partly done, and the single biggest perceived-quality
  lever left (§2.5).
- **Snippet weaving.** Already implemented and arguably *better* than the commercial baseline, which
  usually shows generic verbs. The user's own words plus the running game title is specificity that
  costs nothing.
- **Update cadence.** 150 ms fast-poll already matches the perceptual threshold. Making the fast path
  apply to prep phases as well as token streaming would close most of the felt gap.
- **Stability.** "Doesn't flicker, doesn't contradict itself, doesn't vanish" is not a model-capability
  problem — it is §2.1, §2.3, §2.4, all of which are fixable in one commit each.

Blunt summary: the gap that users actually feel is **not** wit or depth. It is that the commercial line
never changes without a reason, and bonsAI's changes without a reason within the first second.

---

## 5. Confidence bounds

**Cannot be promised, at any effort level:**

- Always witty. Humour is subjective and a fixed pool is finite; repeat exposure guarantees staleness.
- Always specific. Specificity beyond "your question + your game" requires the model tag, whose arrival
  is probabilistic on Deck-class models.
- Never generic. Some Asks legitimately have no phase (no logs, no KB, no screenshot, no retry) and no
  tag. Generic is the correct output there.

**Can be promised, and is testable:**

- Appears before the first poll resolves (already true).
- References the user's question snippet and running game when both exist (already true).
- Changes **only** when the phase key changes or the model emits a tag — no time-based rotation,
  no cross-writer churn (true in Python today, false end-to-end because of §2.1/§2.2).
- Never renders a lazy opener (true in Python, TS over-corrects into blank — §2.3).
- Never renders empty while `isAsking` (currently violable — §2.3).
- Never renders bare emoji for an entire Ask (currently ~22 % — §2.4).

**"Good enough" for a FOSS Deck plugin** is honestly reached when the *promisable* list above holds
on-Deck and the phase set covers the slow parts of the pipeline. The right claim in user-facing docs is
something like: *"bonsAI shows what it is actually doing while it works. The wording varies; the steps
are real."* That is defensible, verifiable, and does not invite comparison to a reasoning trace bonsAI
does not have. Claiming parity with commercial thinking indicators is not defensible and should not be
attempted.

---

## 6. Should the tiny-model path come back post-D2?

**No — and the reasoning is stronger now than at D2.**

D2 deleted `thinking_tiny_model_service.py` as dead code (`roadmap.md` § D2, `c8ed045`; restore with
`git show c8ed045^:py_modules/backend/services/thinking_tiny_model_service.py`). Independent of that
cleanup, the design does not fit the constraint:

- **It taxes the thing it decorates.** A second model must be resident or loaded. On a Deck already
  holding the answer model, that is VRAM pressure and cold-load latency added to the pending window —
  the exact window the blurb exists to make feel short.
- **Its ceiling is a tiny model's prose.** The quality gap between a tiny model's status line and a
  hand-written template woven with the user's own words is small, and the template wins on latency,
  determinism, and spoiler safety.
- **It cannot be more truthful.** A sidecar sees the question, not the pipeline. It can only guess what
  bonsAI is doing, while `_publish_thinking_phase_key` *knows*. Investing in honest phase coverage
  strictly dominates.
- **The variance is unbounded in the wrong direction.** Every failure mode of §2.3 and §2.7 —
  lazy openers, spoiler leaks, tag debris — reappears, now on a model with weaker instruction-following
  than the main one.

If perceived depth is the goal, the money goes to **Thinking effort control** + soft `num_predict`
(`roadmap.md`), which surfaces *real* reasoning from the model already answering. That is the
non-fake version of the same wish.

---

## 7. Recommended direction

**Primary: collapse to one writer, then extend honest phase coverage.**

Concretely — Python becomes the single source of blurb truth; the client renders and never composes.
The gap the client opener fills is real (RPC round-trip), so close it by returning the composed opener
**in the `start_background_game_ai` response** rather than by duplicating the composer. That kills §2.1
and §2.2 at once and lets ~330 lines of TS delete.

Ordered options with effort:

| # | Option | ★ | Notes |
|---|---|---|---|
| 1 | TS `sanitizeThinkingSummary` empty-fallback parity | ★ | One line. Stops the line vanishing (§2.3). Do first. |
| 2 | Mix phase key into `_stable_bucket` | ★ | Ends the ~22 % all-emoji Asks (§2.4). |
| 3 | Delete the three unemitted phases + dead `BONSAI_STATUS_STREAM_INSTRUCTION`, **or** wire emitters for `building_context` / `connecting_model` | ★ | Prefer wiring: those are the slow, silent parts of an Ask (§2.5, §3.1). Delete `experiment_journal` unless the journal load is on the Ask path. |
| 4 | Return the composed opener from `start_background_game_ai`; client renders it | ★★ | Kills §2.1 + §2.2. Enables #5. |
| 5 | Delete `composeThinkingBlurb.ts` pools + classifier mirrors | ★★ | Depends on #4. Removes the drift surface permanently. |
| 6 | Route the model tag through spoiler masking, or suppress it in Strategy mode | ★ | §2.7. Suppression is the cheap safe default. |
| 7 | Fast-poll (150 ms) during prep phases, not only token streaming | ★★ | Makes short phases visible; costs RPC on Deck — measure. |
| 8 | Allow mid-generation status updates (accept later `<bonsai-status>` tags) | ★★ | Prompt + `extract_bonsai_status` change. Do only if §2.6 tests badly on-Deck; risks flicker. |
| 9 | Tighten `<bonsai-status>` compliance further | ★★ | Diminishing returns — model-capability bound (§4). |
| 10 | Real pipeline steps only, drop faux wit | ★★★ | Full copy rewrite + QA. Not recommended as a whole: the voice is a differentiator. Keep voice, raise honesty. |
| 11 | Wire Thinking effort control to a separate visible channel | ★★★ | Blocked on soft `num_predict`. Separate feature. |
| 12 | Restore tiny-model blurbs | — | Not recommended (§6). |

Items 1–3 are independent one-commit fixes that raise the floor immediately. Items 4–6 are the
architecture direction. Everything else is optional.

---

## 8. Verification

### 8.1 Current coverage

| Row | Requirement | Automated today | Gap |
|---|---|---|---|
| **THINKING-01** | Pending line visible, no lazy openers, woven opener | `test_bonsai_stream_tags.py:42-45, 303-310`; `composeThinkingBlurb.test.ts`; preview `THINKING-01-pending-phases` (`tier2-deep.json:606`) asserts only that `thinking_summary` is *present* | No assert that it is non-empty; §2.3 would pass today |
| **THINKING-02** | Prep phases keep snippet + game, no generic downgrade | `test_bonsai_stream_tags.py:209-310`, `test_background_partial_state.py:111-152` | Unit-only; three tested phases have no emitter (§2.5), so tests cover dead code |
| **THINKING-03** | Line stays visible during token streaming | none | Render gate is correct by inspection ([MainTabChatTranscript.tsx:343](../../src/components/MainTabChatTranscript.tsx)); no test pins it |
| **THINKING-COPY-01** | Changes only on phase change / model tag | none end-to-end | The Python invariant is enforced by `del elapsed_seconds`; the *system* violates it via §2.1/§2.2 |

### 8.2 Suggested additions

**a. Shared intent fixture (highest value, catches §2.2 permanently).**
One `tests/fixtures/thinking-intent-fixtures.json` of `{question, ask_mode, has_shot, expected_intent}`
rows, consumed by both `src/utils/composeThinkingBlurb.test.ts` and `tests/test_bonsai_stream_tags.py`.
Drift then fails a test instead of shipping. This is the only cheap defence against hand-mirrored
predicates, and it stays useful even after option #5 removes the TS pools (it becomes the Python
regression suite).

**b. Pool-shape invariants (catches §2.4 and future copy edits).**
For rid in a fixed range and each phase, assert the emitted line is not emoji-only for *every* phase of
one Ask; assert every pool has length coprime-ish spread rather than a uniform 5.

**c. Sanitizer parity test (catches §2.3).**
A shared table of inputs (`"Yeah"`, `"Sure."`, `"Fine. Sure. Working"`, `""`) asserted identical in both
languages.

**d. Preview scenario `THINKING-COPY-01-stability`.**
Extend the existing `THINKING-01-pending-phases` shape (`tier2-deep.json:606`): `start_background_game_ai`
→ sleep 400 ms → `get_background_game_ai_status` → sleep 400 ms → status again → assert both
`thinking_summary` values are non-empty and equal when no phase boundary was crossed. This is the
scenario that would have caught §2.1, and it is automatable with the RPC-only pattern already in the
suite.

**e. Not automatable.** Whether the copy is *funny*, whether a 30 s static line reads as calm or stuck
(§2.6), and whether the model tag leaks spoilers in practice (§2.7) — all need a human on hardware.
Keep those as manual rows and say so.

---

## 9. Confidence statement (for users and maintainers)

> The thinking line reflects real work: when it says it is reading Proton logs, searching the knowledge
> base, preparing a screenshot, or retrying a model, it is doing that. The wording is drawn from written
> copy and varies between Asks. When the local model cooperates it adds a line of its own about your
> specific question; small models do not always cooperate, and bonsAI falls back to its own copy when
> they do not. This is a status indicator, not a reasoning trace — bonsAI does not currently show the
> model's internal reasoning, and does not claim to.

**Maintainer-facing:** the architecture is sound and cheap. Everything in §2 is a bug or a duplication,
not a design flaw. Fixing §2.1–§2.4 is four small commits and moves the feature from "feels random" to
"feels deliberate" without touching a single line of the copy pools.

---

## 10. Implementation log

### 10.1 Landed 2026-08-08 — § 7 items 1–3

All four gates green after each commit (`npm test` 485, `npm run test:py` 601, `tsc --noEmit`, `build`).
Nothing here is confirmed on-Deck yet; QA rows are in [testing.md](../testing.md).

| § 7 | Commit | What changed | Verified by |
|---|---|---|---|
| 1 | `22c4dc3` | TS `sanitizeThinkingSummary` gained Python's `cleaned or raw` fallback, and stopped reusing its `raw` binding as the strip accumulator — which is why the original was not available to fall back to (§2.3) | Parity table + idempotency case in both suites (§8.2c) |
| 2 | `151c990` | `_stable_bucket` takes a salt; `format_thinking_phase` passes the phase key (§2.4) | New test sweeps rid 1…50 × 5 phases and asserts no all-emoji Ask |
| 3a | `120980e` | `experiment_journal` phase deleted — literal, pool, and plain-text branch (§2.5) | Existing suite; the phase had no test of its own |
| 3b | `4e6d000` | `BONSAI_STATUS_STREAM_INSTRUCTION` deleted (§2.5) | Grep: zero call sites before and after |

Two notes worth keeping:

- **The §2.3 bug needed both halves.** Python already falls back, so the backend sends `"Sure."`
  correctly. The line vanished because the client sanitizes *again* on every poll — the sanitizers run
  in series, not in parallel, so a divergence that looks cosmetic compounds into an empty string. The
  new idempotency test pins the series behaviour, not just the single-pass output.
- **Two tests failed on the item-2 pick and were rewritten, not accommodated.**
  `test_format_thinking_phase_woven_tdp_read` and `..._model_retry` pinned one hardcoded `request_id`
  and asserted a specific template came back — implementation shape, the failure mode
  [audit/00-phase0.md](00-phase0.md) flags. They now sample a range of ids and assert what the
  pool actually promises: prose lines weave the question snippet, emoji-only lines are allowed.

### 10.2 Maintainer decisions, 2026-08-08

Recorded here rather than in chat, per the repo's refactor rules.

| Q | Decision | Consequence |
|---|---|---|
| §2.1/§2.2 — who writes the opener | **Backend owns it** (§7 #4 + #5). Return the composed opener from `start_background_game_ai`; the client renders and never composes. Fall back to *client owns the opener* (delete the backend opener at `game_ai_request.py:205-215`) only if the RPC round-trip is visibly late on-Deck | Unblocks deleting the TS pools and classifier mirrors. §8.2a's shared fixture becomes a Python-only regression suite |
| §2.5 — the two remaining silent phases | **Wire `building_context` and `connecting_model`.** Target the slowest stretch where nothing appears to happen. Constraint from the maintainer: the copy must stay honest *and* read as encouraging — it reacts to the user's prompt, it does not flatter it | `experiment_journal` was deleted instead; the journal left the Ask path on 2026-07-30 |
| §2.7 — model tag on a spoiler-masked surface | **Mask it, do not suppress it.** Render the block-glyph treatment inline: `working out how to beat ████ ██████ dance` | Keeps the specificity the model tag exists for. Needs the masker to reach the thinking line, which today only `buildAnswerBubbleElement` calls |
| §2.6 — static line for the whole generation | **Fix it — named as a major annoyance.** Accept later `<bonsai-status>` tags instead of freezing on the first | Prompt + `extract_bonsai_status` change. §7 #8 warns this risks flicker; that is now a thing to tune, not a reason to skip |
| §7 #7 — fast-poll during prep | **Leave at 1200 ms** | Already tried and reverted once for battery cost — see the comment at [useBackgroundGameAi.ts:65-70](../../src/hooks/useBackgroundGameAi.ts) |

### 10.3 Landed 2026-08-08 — § 7 items 4–6 and 8

| § 7 | Commit | What changed |
|---|---|---|
| 4 | `068374f` | `start_background_game_ai` composes the opener at accept time, publishes it, and returns it. Client renders it behind a constant placeholder for the round trip; the poll path no longer recomposes. Duplicate compose in `run_game_ai_request` deleted (§2.1, §2.2) |
| 5 | `57ff67c`, `f6a2812` | `composeThinkingBlurb.ts` gutted to the sanitizer and the placeholder, then renamed `thinkingSummaryText.ts` |
| 3 (rest) | `3fe6e1d` | `building_context` and `connecting_model` emitters wired; both pools rewritten to be encouraging (§2.5) |
| 6, 8 | `aa0bb05` | `extract_bonsai_status` reports the last *complete* tag; Strategy prompts teach `[[spoiler]]…[[/spoiler]]`; the client redacts marked spans to blocks (§2.6, §2.7) |

Three findings worth carrying forward:

- **`ai_character_random` defaults to *on*.** The blurb tone and the reply's character voice both come
  from `build_roleplay_system_suffix_meta`, which calls `random.choice`. Moving the opener to accept
  time would have meant two independent rolls — a deadpan blurb in front of a witty reply — so the
  resolved meta is threaded from accept into the request task and the character is picked exactly
  once per Ask. The first version of the test for this was itself flaky for the same reason, which is
  how the default was noticed.
- **Redaction needed a new mechanism, not the existing masker.** The answer bubble hides spoilers by
  collapsing a ```` ```bonsai-spoiler ```` fence, which needs somewhere to collapse to; a one-line
  status has nowhere. So the model marks a span and the client blocks it out in place. "Do not spoil"
  is still the first instruction — this is the fallback for when a 3B model does it anyway, and the
  unclosed-span case masks to end of line rather than printing what was flagged.
- **Flicker is held off by completeness, not by rate-limiting.** A `<bonsai-status>` still arriving has
  no closing marker, so it does not match and the previous line stays up. That is why §7 #8's flicker
  warning did not need a debounce.

### 10.4 On-Deck round 1, 2026-08-08 — the line still froze

First device pass on the § 10.3 build. Two reports, one non-issue and one real.

**"I did not see a Thinking…"** — working as intended, and it answers the
THINKING-OPENER-01 judgement call in the best available way. The placeholder is set, then replaced
when the RPC returns; the maintainer never saw it because that round trip is imperceptible on
device. The documented fallback (client owns the opener) is therefore **not needed** — the
backend-authoritative design stands.

**"Stuck on `Model's warming up for …` for the entire time"** on an Expert Ask with a screenshot.
Real, and § 10.3's item-8 fix did not cover it. The mistake in that fix was treating
mid-generation updates as a *model* problem: the prompt now invites later `<bonsai-status>` tags,
but a vision model on a screenshot Ask emitted none, and **every other publisher had already
finished**. All phases fire during prep. Once `ask_ollama` is called, the model tag was the only
remaining writer — so with no tag, the last prep line stayed up for the whole generation.

It was also *false* by then, which the original review missed: `connecting_model` claims the model
is warming up, and it had long since started writing.

Fixed in `67d4ad5` with two independent mechanisms, neither depending on model compliance:

- **A `generating` phase**, published on the first content token, whether or not token streaming is
  on. With streaming off there is no visible text at all, so this is the only signal that
  generation began. Skipped when the model did supply a tag.
- **`escalate_static_thinking_line`**, applied at merge time: a line that has not *changed* for a
  window is replaced by a rotating duration line, across three escalating tiers. A real phase
  change or model tag outranks it and resets the clock.

**This is a deliberate, narrow reversal of THINKING-COPY-01.** That rule forbids time-based
rotation, and it was right about what it was aimed at — reshuffling interchangeable jokes on a
timer felt random. What rotates here is a statement about *duration*, which is real information the
user has no other way to get, and only after a line has visibly gone quiet. The row is amended
rather than dropped: **copy may not change while the work has not, and may not predict how much
longer** — the second half is asserted, since an "almost done" followed by another 40 seconds is
worse than saying less.

Two implementation notes worth keeping.

The stale clock stamps on *change*, not on write. A phase re-publishing the same string every delta
would otherwise keep resetting it, and the line would never be recognised as stale however long it
sat there.

**Timing is randomised; content is not.** The first pass stepped on a fixed 7s beat, which the
maintainer called too rhythmic on device — an exact period reads as a spinner animation, and the eye
locks onto it and stops reading the words. Windows are now drawn from a range: 7–13s for the first
(it holds a real phase line, which is more specific than anything replacing it and earns a fair
showing) and 4–12s thereafter. The *choice* of line still steps additively through the pool, so two
consecutive windows can never show the same words — randomising both would let a line repeat back to
back, which looks like the stall this exists to disprove.

The schedule is a hash of `(request_id, window index)`, not a live roll: `_merge_partial_into_background_status`
re-derives it on every poll, so anything non-deterministic would strobe the line at the poll rate.
It also cannot use `_stable_bucket` with a per-index salt — that salt loop is `bucket * 31 + ord(ch)`,
so indices differing in one character yield near-identical, monotonically creeping durations.
`_static_window_bucket` adds an avalanche step; measured over 1995 windows the spread is
4.00–12.00s, mean 8.01, σ 2.32.

Found in passing and fixed separately (`b8f8ded`): `run_ask_ollama` resolved the AI character
**twice** — once for the `screenshot_prep` blurb, once for the reply's voice — so with
`ai_character_random` on (the default) a screenshot Ask could pair a deadpan status line with a
witty answer. Same defect the background opener was guarded against in `068374f`, one layer down.

### 10.5 Still open

- **§2.8 — `deterministic_thinking_phase_fallback` is now further from reach**, not closer: the opener
  is published before the task starts, so the sub-second window it covered is gone. Its
  "Drafting your masterpiece…" branch was already unreachable. Left in place; a deletion is a
  separate call.
- **The `still_building` pool is still unreachable.** `building_context` publishes once, at
  `elapsed_seconds=0`, so the `_BUILDING_CONTEXT_MAX_SECONDS` ladder never fires. Making it reachable
  needs a watchdog that re-publishes while the phase is still running — deliberately not built,
  because the long wait it would serve is the model load, and item 8 now covers that with real
  model-authored updates.
- **`[[spoiler]]` markers in the answer *body* are not handled.** They are only taught inside the
  status tag, and the body has its own fence mechanism, but a model that leaks the marker into prose
  would render it literally. Not seen; worth knowing.
- **§2.8 — `extract_bonsai_status` is still O(n²) over the stream**, and item 6 slightly raised the
  constant (the loop no longer short-circuits once a summary is found). Still noise at Deck reply
  sizes; still scales with reply length.
