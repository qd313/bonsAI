# 07 — Named chat slots: post-mortem and v2 redesign (2026-08-03)

Evidence for the ★★★★★ **Named chat slots** row in
[roadmap.md](../roadmap.md#planned) ("redesign only; do not re-ship the old
mini-list / fullscreen picker approach").

**Sources.** `git show 247a9c9` (add, 2026-07-17 18:44), `58089df` (disable,
2026-07-18 00:36), `8ace7c0` (remove, 2026-07-18 00:37). The feature was live
for **under six hours**. Recovered files: `chat_threads_service.py` (494 lines),
`useChatThreads.ts` (189), `ChatThreadsModal.tsx` (251),
`ChatThreadsMiniList.tsx` (80), `chatThreadsApi.ts` (81), `chatThreadIdle.ts`
(40), `types/chatThreads.ts` (45), plus 328 lines added to `main.py`.

This document does not implement anything. Scope is post-mortem, redesign, and
ship plan.

---

## 0. The headline

**`chat_threads_service.py` was not the problem.** It is atomic-write
(`tmp` + `fsync` + `os.replace`), bounded (50 threads / 200 turns / 120 KB per
turn), path-sanitised, and it was the only layer with tests
(`tests/test_chat_threads_service.py`, 110 lines). Every failure below is in the
**wiring around it** — the completion path in `main.py`, the dual-write between
Python and React, and the Main-tab focus graph.

That matters for v2: the storage layer is reusable nearly as-is. The parts that
must be redesigned are ownership, correlation, and surface.

**The feature shipped with all eight of its own test rows unchecked.**
`git show 247a9c9:docs/testing.md:641-648` adds CHAT-SLOTS-01…08 as `[ ]` in the
same commit that adds the feature. Nothing verified it before it reached a Deck.

---

## 1. Root causes

### 1.1 The write-after-launch race — most likely cause of lost replies

`main.py:2776-2791` (at 247a9c9):

```python
plugin._background_task = asyncio.create_task(
    plugin._run_background_request(request_id, parsed_question, ...)
)
if chat_thread_id:
    await plugin._chat_threads_record_user_turn(
        thread_id=chat_thread_id, question=parsed_question, request_id=request_id, ...
    )
```

The task is launched **before** the user turn is recorded, and
`_chat_threads_record_user_turn` is what sets `pending_request_id` on the thread.
The `await` yields to the event loop. On any fast completion path — a local Ask
command, a blocked/invalid input, a cached or very fast Ollama reply —
`_chat_threads_record_assistant_turn` (`main.py:676-718`) runs first, calls
`find_thread_by_pending_request`, finds nothing, and hits:

```python
thread = find_thread_by_pending_request(settings_dir, int(request_id), logger)
if thread is None:
    return
```

**The reply is silently discarded.** No log, no error, no retry. The user sees an
answer on screen, closes the QAM, reopens, and the answer is gone — or the
transcript shows the question with no answer.

`_chat_threads_store_lock` does not help. A lock gives mutual exclusion, not
ordering; it guarantees the two writes do not interleave, not that the user turn
wins the race.

This is the single best explanation for **CHAT-SLOTS-01** ("bubble transcript
shows Q then A, not answer-only") being written as a test row at all — the
symptom was known when the feature shipped.

### 1.2 Ownership was re-derived instead of carried

The thread id is known at submit time. `_parse_chat_thread_id` (`main.py:624`)
pulls it off the ask payload, and it is threaded through
`_run_background_request` at `main.py:2708`, `:2730`, `:2750`. Then the
completion path **throws it away** and reconstructs it by scanning:

```python
def find_thread_by_pending_request(settings_dir, request_id, logger=None):
    for summary in list_thread_summaries(settings_dir, logger):
        thread = load_thread(settings_dir, tid, logger)
        if thread.get("pending_request_id") == request_id:
            return thread
```

Two consequences:

- **Correctness.** `pending_request_id` is mutable persisted state used as a
  correlation channel. A second Ask on the same thread overwrites it
  (`append_turn` sets it on every user turn). A plugin restart mid-Ask leaves it
  stale. `set_thread_pending_request(None)` clears it. Any of these routes the
  reply to the wrong thread or to nowhere. **CHAT-SLOTS-02** ("switch active
  thread mid-Ask → completion appends to thread that owned the request") is
  exactly this hazard, and it was never verified.
- **Cost.** Every completion deserialises up to 50 JSON files, each up to 200
  turns of up to 120 KB. On a Deck, on the reply path.

### 1.3 Two independent correlation mechanisms for one fact

The frontend built a *second* answer to "which thread owns request N", in
`useChatThreads.ts`:

```ts
const requestThreadMapRef = useRef<Map<number, string>>(new Map());
const bindRequestToThread = (requestId, threadId) => { ... };
const resolveThreadForRequest = (requestId) =>
  requestThreadMapRef.current.get(requestId) ?? activeThreadIdRef.current;
```

So the same question is answered by a persisted `pending_request_id` scan on the
Python side and a plain `useRef` Map on the TS side. They can disagree, and they
have different lifetimes: the ref Map is **not** in `bonsaiSessionSurvival`, so
it is wiped by any `showModal` remount, while the backend value survives. The
`?? activeThreadIdRef.current` fallback then quietly attributes an orphaned reply
to whatever thread happens to be selected — a silent overwrite.

### 1.4 Dual-write: nobody owned the transcript

Three writers touched the same conversation:

1. Python appended turns to disk on ask and on completion.
2. React held `askThreadCollapsed` in state plus the survival snapshot.
3. `reloadActiveThread()` (`useBonsaiAskOrchestration.ts:466`) pulled disk back
   over the UI after every completion.

And the reconstruction step drops data. `turnsToCollapsedPairs`
(`chatThreadsApi.ts`) only emits a pair when it sees `user` then `assistant`:

```ts
for (const turn of turns) {
  if (turn.role === "user") pendingQ = { id: turn.id, text: turn.text };
  else if (turn.role === "assistant" && pendingQ) { pairs.push(...); pendingQ = null; }
}
```

A trailing unpaired user turn is **discarded**. While a request is in flight the
persisted question is not in the rebuilt transcript at all — so reopening the QAM
mid-Ask shows an empty or answer-only view. Combined with §1.1, a dropped
assistant turn makes the question disappear permanently on the next reload.

### 1.5 Cross-language shape drift that `tsc` cannot see

Python persists (`chat_threads_service.py:_normalize_strategy_checklist`):

```python
return {"title": frag["title"], "items": frag["items"], "checked_ids": frag["checked_ids"]}
```

TypeScript declares (`types/chatThreads.ts`):

```ts
strategy_checklist?: StrategyChecklistState | null;
```

and `StrategyChecklistState` (`types/bonsaiUi.ts:43-47`) is
`StrategyChecklistPayload & { checkedIds: string[]; appId?: string; appName?: string }`.

So the backend writes `checked_ids` and drops `appId`/`appName` entirely; the
frontend reads `.checkedIds` and `.appName` in `applyThreadToTranscript`. Both
resolve to `undefined`. **Restoring a thread could never restore its checklist
state** — `STRATEGY-CHECKLIST-THREAD` was unpassable as written.

`tsc --noEmit` cannot catch this: the value crosses an untyped RPC boundary and
the hand-written type simply asserts a shape the backend never produces. This is
the settings-drift problem of [D12](../audit/maintainer-decisions-locked.md#d12--settings-live-in-two-languages-how-far-do-you-want-to-go-to-fix-that)
/ [D13](../audit/maintainer-decisions-locked.md#d13--ts-and-python-disagree-about-five-settings-which-side-is-right),
reappearing in a second data domain before the first was fixed.

### 1.6 Every thread RPC bypassed the timeout wrapper

All six functions in `chatThreadsApi.ts` used bare `call()` from `@decky/api`,
with no justifying comment — against the rule in
[CLAUDE.md](../../CLAUDE.md) § *The TS ↔ Python boundary*, which lists exactly
four sanctioned raw call sites and requires a comment for a new one.

The worst instance is on the **Ask submit path**:
`ensureThreadForAsk` → `createThread` → `createChatThreadRpc` → raw
`call("create_chat_thread")`, and `useBonsaiAskOrchestration.ts:654` awaits it
before setting `isAsking`. A hung `create_chat_thread` therefore hangs **every
Ask**, with no 15 s deadline and no error surface.

### 1.7 Ref-lags-state duplicate threads

```ts
const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
const activeThreadIdRef = useRef<string | null>(null);
useEffect(() => { activeThreadIdRef.current = activeThreadId; }, [activeThreadId]);
```

`ensureActiveThreadForAsk` reads `activeThreadIdRef.current`, but `createThread`
only calls `setActiveThreadId` — the ref updates one effect flush later. Two Asks
submitted before that flush both observe `null` and both create a thread. The
second becomes active and the first is orphaned with a single dangling turn. This
is a plausible second contributor to the reported "overwrite" behaviour.

### 1.8 The mini-list focus graph was broken by construction

`ChatThreadsMiniList.tsx` renders one "All chats…" `Focusable` plus up to five
chip `Focusable`s. Every one of them wires:

```ts
onMoveUp={() => { focusUpRef?.current?.focus(); }}
onMoveDown={() => { focusDownRef?.current?.focus(); }}
```

— the *same two external refs* for all six. Pressing down on chip 1 leaves the
list entirely instead of moving to chip 2, so **chips 2–5 are unreachable by
D-pad**. There is no intra-list graph at all. **CHAT-SLOTS-07** could not have
passed.

This violates `.cursor/rules/decky-focus-graph.mdc` on three counts: no explicit
focus graph in the section parent, no registry of mounted focus owners, and no
`true` return from `onMove*`.

**The modal was the better half.** `ChatThreadsModal.tsx` uses ref registries
(`rowRefs` / `deleteRefs` as `Map<string, HTMLDivElement>`), index-based
neighbours, and explicit edge escapes — the approved pattern, matching
`PullModelsModal.tsx`. Its only defect is inconsistent return values: row and
delete handlers `return true`, while the New chat and Close handlers return
`undefined`. **Keep this component's shape in v2.**

### 1.9 Clutter was structural

- The mini-list added **up to six permanent focus stops on Main**, above the Ask
  field, present whether or not the user had ever named a thread.
- `ChatThreadAppIdBanner.tsx` added a conditional seventh element whenever the
  running app differed from the thread's `origin_app_id` — a modal-ish
  interruption for a mismatch the user did not ask about.
- The picker ran `get_chat_threads_desktop_sizes` on open — a Desktop folder
  walk in a component whose job is choosing a chat. Rows showed
  `3h ago · 412 KB`; byte counts are storage-management information, not
  chat-selection information.

### 1.10 Feature surface grew faster than its verification

Two new settings (`chat_idle_timeout_minutes` with a 5/15/30/60 enum,
`dev_bundle_thread_title_in_reply`), each paying the six-file two-language tax
described in CLAUDE.md § *Where settings live*. Plus a Desktop mirror
(`append_thread_chat_event_sync`, `delete_thread_desktop_folder`,
`folder_size_bytes` — 184 lines added to `desktop_note_service.py`) and an idle
TTL with `sessionStorage`.

Special mention: `parse_bundled_thread_title` extracts
`<bonsai-thread-title>…</bonsai-thread-title>` from model output and persists it
as the thread label. That makes a **model-controlled string** into persisted UI
text, non-deterministically, gated on a dev setting. Drop it.

---

## 2. Architectural mistakes a redesign must avoid

| # | Mistake | Rule for v2 |
|---|---|---|
| 1 | Re-deriving request→thread ownership at completion time | Carry `thread_id` through the request end-to-end; never search for it |
| 2 | Using mutable persisted state (`pending_request_id`) as a correlation channel | Correlation is immutable request metadata, not thread state |
| 3 | Two correlation mechanisms (backend scan + frontend ref Map) | Exactly one, backend-side |
| 4 | Three writers to one transcript | One writer. Python owns disk; React renders it |
| 5 | Launching work before recording the state that work depends on | Record first, then launch |
| 6 | Silent `return` on a missing thread | A dropped turn is a fault — log it |
| 7 | Hand-written TS types asserting an unverified Python shape | One field table per language, mirroring step 7b/7d |
| 8 | Raw `call()` on the Ask submit path | `callDeckyWithTimeout()`, no exceptions |
| 9 | Per-item `onMove*` pointing at shared external refs | Registry + index-based neighbours, `return true` |
| 10 | Permanent Main-tab focus stops for an occasional action | Zero new always-present stops |
| 11 | Model output becoming persisted UI text | Labels come from the user or a deterministic heuristic |
| 12 | Shipping with the feature's own test rows unchecked | Rows checked before the roadmap entry moves to Completed |

---

## 3. UI options, ranked for Deck D-pad + QAM width

| | Pattern | Main-tab focus stops added | Reachable in-game | Verdict |
|---|---|---|---|---|
| **B** | Single **All chats…** entry, no mini-list | 0–1 | Yes | **Recommended surface** |
| **D** | Auto-save silent slots, rename on demand | 0 | n/a | **Recommended policy** — complements B, not an alternative |
| E | Game-scoped default slot | 0 | Yes | **Later, as labelling only** — see below |
| A | Threads only in Settings / Developer | 0 | No | Rejected — the feature exists to switch chats mid-game |
| C | LB/RB slot carousel | 0 | Yes | Rejected — see below |

**Why B.** It is the only option that puts the picker behind a single stop while
keeping it reachable from where Asks happen. The picker itself is proven: three
shipped modals in this repo (`PullModelsModal.tsx` 42 KB, `CharacterPickerModal.tsx`
25 KB, `ModelRoutingOrderModal.tsx` 7.9 KB) already do list-of-rows with D-pad,
and `ChatThreadsModal.tsx` already followed their pattern correctly (§1.8).

**Why D, not "name it up front".** v1 required no naming, but it created a thread
on first Ask and then had to label it — hence the heuristic labeller, the
`<bonsai-thread-title>` tag, and the relabel-on-first-turn branch in
`append_turn`. Inverting this is cheaper: **every Ask always lands in a slot**;
the slot has a deterministic auto-label (`heuristic_thread_label` is fine —
`"<Game>: <first 60 chars of question>"`); renaming is an explicit action in the
picker. No model involvement, no naming friction, no empty threads.

**Why C is rejected.** LB/RB are already contended — `docs/planning/03-lbrb-tab-flicker.md`
documents a tab-flicker bug on those very bumpers, and Steam plus the running
game both claim them. A bumper binding is also an invisible affordance with
nowhere to show which slot you are on without adding the Main-tab indicator that
option B exists to avoid.

**Why E is deferred.** Auto-scoping threads to the running game is what produced
v1's `origin_app_id` mismatch banner and its Continue / New thread branch
(CHAT-SLOTS-04). Auto-switching context on app change is a behaviour with real
failure modes (Steam reports app changes during suspend/resume). In v2, the
running game is a **label input and a picker sort key** — not a scoping rule.

### UI sketch (prose)

**Main tab.** Unchanged in the default case. No mini-list, no chips, no banner.

The entry point attaches to the existing per-turn header row
(`.bonsai-chat-turn-row-header` in `MainTabChatTranscript.tsx:199-220`) and the
existing reply micro-actions (`replyMicroActions.ts`, `buildReplyActionsElement.tsx`)
rather than becoming a new row. Concretely: one **Chats…** micro-action alongside
the existing reply actions, which are already in the focus graph and already
have D-pad coverage. *Net new always-present Main focus stops: zero.*

If that placement does not survive on-device D-pad review, the fallback is a
single `PanelSectionRow` **All chats…** button directly above the Ask field —
one stop, wired into the section parent's graph — which is option B's plain form.
Decide this on-device, not on paper.

**The picker.** `ChatThreadsModal.tsx` restored nearly verbatim, minus the
Desktop size column and total. Each row: label, then relative time. `New chat`
at top, `Close` at bottom, `×` delete per row behind the existing `ConfirmModal`.
Add a `Rename` affordance per row (the one genuinely new control). Ref registry
and index-based neighbours as v1 already had; every `onMove*` returns `true`.

**Rename.** Decky's `showModal` + a text field, reusing whatever
`CharacterPickerModal.tsx` does for nested modals, and the
`onBeforeNestedDeckyModal` / `onCompleteNestedDeckyModalClose` survival hooks
v1's delete flow already threaded through.

### Data flow

```
Ask submit
  └─ thread_id resolved synchronously from a ref that createThread sets directly
     (not via useEffect) — or omitted, in which case Python creates one
  └─ callDeckyWithTimeout("ask_...", [{ ..., chat_thread_id }])
       └─ Python: record user turn  ──►  THEN launch background task
                                          (ordering inverted from v1 §1.1)
       └─ Python: request_id → thread_id recorded in an in-memory dict
                  owned by the Plugin instance, not in thread files

Completion
  └─ _record_assistant_turn(request_id) looks up thread_id in that dict —
     O(1), no scan, no pending_request_id field at all
  └─ on miss: log a fault (never a silent return)

Render
  └─ React renders from its own live state during the Ask (unchanged today)
  └─ On thread switch / QAM reopen: one get_chat_thread, mapped to
     AskThreadCollapsedTurn[] by a mapper that PRESERVES a trailing
     unpaired user turn as a question-with-pending-answer
```

The in-memory `request_id → thread_id` dict is deliberate: a request does not
outlive the plugin process, so it does not need to. If the plugin restarts
mid-Ask the reply is lost anyway — that is existing behaviour, and it fails
loudly rather than writing to a guessed thread.

---

## 4. Data model

**Reuse `chat_threads_service.py` substantially.** Recover with
`git show 247a9c9:py_modules/backend/services/chat_threads_service.py`. Changes:

| Change | Reason |
|---|---|
| **Delete** `pending_request_id` from the schema | §1.2 — replaced by the in-memory map |
| **Delete** `set_thread_pending_request`, `find_thread_by_pending_request` | Same |
| **Delete** `parse_bundled_thread_title` | §1.10 — model-controlled persisted text |
| **Drop or fix** `strategy_checklist` | §1.5 — see below |
| Keep | `index.json` + per-thread file, atomic writes, `MAX_*` bounds, `sanitize_thread`, `heuristic_thread_label`, `wipe_all_threads` |
| Lower | `MAX_THREADS` 50 → 5 for v2 (§5) |

`index.json` + per-thread files is the right shape and should not be replaced.
It keeps the picker's list load O(1 file) while a thread's turns stay lazy, and
it is already atomic. A single combined file would rewrite every thread's turns
on every append.

**Where persistence lives.** Three stores exist and must stay distinct:

- **`settings.json`** — user preferences. Threads do **not** go here. v2 should
  add **zero** settings (no idle TTL, no dev title toggle).
- **`chat_threads/`** under `DECKY_PLUGIN_SETTINGS_DIR` — the thread store,
  as v1 had it. Sibling of `settings.json`, not inside it.
- **`bonsaiSessionSurvival`** — module-level in-memory only, per its own header:
  *"Does not: Persist across plugin restarts."* It survives `showModal`
  remounts. v2 adds exactly one field, `activeThreadId: string | null`, so a
  remount does not lose the selection. It must **not** carry turns; those come
  from disk.

**Desktop mirror: cut entirely from v2.** It was 184 lines in
`desktop_note_service.py` plus the size-scan RPC, and it created the orphan-folder
problem still documented in
[troubleshooting.md:242](../troubleshooting.md). Existing per-response Desktop
autosave (`append_desktop_chat_event`) already covers "I want my chats as files"
and is orthogonal to slots.

**Strategy-checklist scoping: cut from v2.** It never worked (§1.5) and it is the
one field that forces a cross-language shape contract. If it returns in v3, it
needs a field table per language mirroring step **7b/7d**, not a hand-written type.

---

## 5. Dependency on D3

**Current state.** [D9](../audit/maintainer-decisions-locked.md#d9--how-far-does-the-entry-point-split-actually-go)
locked 2026-08-03: *done = finish step 8 (`index.tsx` only)*, with
`useBonsaiAskOrchestration.ts` and `MainTab.tsx` as follow-ups.

- `index.tsx` — **1493 lines**, target 700–800. In progress; the last four
  commits extracted the desktop-note, character-picker and models-hub modals and
  the Ollama connection state. Remaining per step 8: plugin-help modal,
  session-reset, UI-scale and error-capture state, then the tab payloads.
- `useBonsaiAskOrchestration.ts` — **1260 lines**, 13 characterization tests,
  explicitly a follow-up and **not** in step 8.

**What must land before slots are safe.** The blocker is not `index.tsx`. It is
the two seams inside the orchestration hook:

1. **A single owner for "which thread is active", readable synchronously at
   submit time.** v1's failure (§1.7) was a ref synced by `useEffect`. v2 needs
   the setter and the ref updated in the same call, in one place.
2. **The completion path must carry `thread_id` rather than re-derive it.** The
   submit site (`useBonsaiAskOrchestration.ts:654`) and the completion site
   (`:466`) are ~200 lines apart in the same hook; the value has to survive
   between them without a second correlation mechanism.

**Can slots be a thin layer over extracted session state? Yes — but not over
`ChatThreadsBridge`.** v1's answer was a **nine-method** bridge object
(`getActiveThreadId`, `ensureThreadForAsk`, `bindRequestToThread`,
`resolveThreadForRequest`, `touchActivity`, `reloadActiveThread`,
`saveChecklistToThread`, `clearActiveUiOnly`, `hydrateThreadTranscript`) injected
into the largest hook and held through a mutable ref to dodge dependency arrays.
That is not a thin layer; it is a second state machine wearing the first one's
coat, and it coupled slots to the file D9 deferred.

The v2 surface should be **two** values threaded as ordinary args:

- `activeThreadId: string | null` — read at submit, sent in the ask payload
- `onThreadTurnsChanged?: () => void` — a refresh signal after completion

Everything else — list, create, delete, rename, load — lives in `useChatThreads`
and talks to the picker, never to the orchestration hook.

**Recommended sequencing.** Slots do **not** need to wait for step 8 to finish;
they need the two seams above, which are local. But building slots *during* step 8
means feature commits interleaved with behavior-preserving refactor commits in
the same files, against refactor rule 1 (*one refactor per commit… never mix a
move with a rewrite*). **Finish step 8, then build slots**, and take the
`useBonsaiAskOrchestration.ts` follow-up split either before slots or not at all —
v2's two-value surface is small enough not to require it.

---

## 6. Scope cut for v2

| Slice | Effort | In v2? |
|---|---|---|
| **S1** — service restore, minus `pending_request_id` / checklist / title-parse; `MAX_THREADS` 5; unit tests | ★★ | Yes |
| **S2** — RPC layer: `list` / `get` / `create` / `delete` / `rename`, in-memory `request_id → thread_id` map, **record-then-launch** ordering | ★★★ | Yes |
| **S3** — `chatThreadsApi.ts` on `callDeckyWithTimeout`, turn mapper preserving trailing user turn, `useChatThreads` with synchronous active-id | ★★ | Yes |
| **S4** — picker modal restored, minus Desktop sizes, plus Rename; registry focus graph, all handlers `return true` | ★★★ | Yes |
| **S5** — single Main entry point (micro-action, fallback to one row), `activeThreadId` in survival | ★★ | Yes |
| **S6** — on-Deck D-pad verification (§7) | ★★ | Yes |
| — | | |
| S7 — Desktop mirror + folder sizes + orphan cleanup | ★★★★ | **No** |
| S8 — idle TTL + `chat_idle_timeout_minutes` setting | ★★ | **No** |
| S9 — strategy-checklist scoping per thread | ★★★ | **No** |
| S10 — appId mismatch banner / Continue / New thread | ★★★ | **No** |
| S11 — model-authored thread titles | ★ | **No** |
| S12 — game-scoped default slot (option E) | ★★★ | **No** — v3 |

**v2 = S1–S6, ★★★ overall.** Five named threads, always auto-saved, renamable,
deletable, one entry point, no new settings, no Desktop mirror, no TTL.

Five rather than fifty: it is the number that fits one QAM-width picker without
scrolling, and pruning-by-recency (already in `_prune_oldest_thread`) is
comprehensible at 5 and mysterious at 50. **CHAT-SLOTS-06** (the 51st-thread
prune test) disappears as a scenario.

---

## 7. Verification

v1's matrix had 11 rows and verified none of them. The failure was not row count
— it was that the rows described **user journeys** ("close QAM, reopen, check the
bubble") which only a human on a Deck can run, so nothing gated the ship. v2
splits by what can actually gate: the races and mappers go to unit tests, and
only what genuinely needs hardware stays manual.

### Unit — Python (`tests/test_chat_threads_service.py`, extend)

| Test | Guards |
|---|---|
| `test_user_turn_recorded_before_task_launch` | §1.1 — assert ordering directly, e.g. a fake that fails if the completion hook runs first |
| `test_assistant_turn_routes_by_request_map` | §1.2 — completion with two live threads lands in the owner |
| `test_unknown_request_id_logs_fault` | §1.1 — a dropped turn must log, never `return` silently |
| `test_prune_at_five_threads` | Bound at the new `MAX_THREADS` |
| `test_rename_persists_and_reindexes` | New control |

### Unit — TS

| Test | Guards |
|---|---|
| `turnsToCollapsedTurns` preserves a trailing unpaired user turn | §1.4 — the reason a mid-Ask reopen looked empty |
| Concurrent `ensureThreadForAsk` yields one thread | §1.7 — mutation-check it (revert to the `useEffect` ref and it must fail) |
| Every `chatThreadsApi` export routes through `callDeckyWithTimeout` | §1.6 — a grep-style assertion is fine |
| `useChatThreads` against `fakeDeckyRpc` | list / create / rename / delete / select |

Mutation-check the first two, per the standard set at step 5
([04-coverage.md](../audit/04-coverage.md)) — *a characterization test that cannot fail is
worse than none*.

### On-Deck (`docs/testing.md`) — four rows, down from eleven

| Row | Scenario |
|---|---|
| **CHAT-SLOTS-V2-01** | D-pad reaches the Chats entry from the Ask field and returns; no new stop appears when no threads exist |
| **CHAT-SLOTS-V2-02** | Picker graph: `New chat` ↔ rows ↔ per-row `Rename`/`×` ↔ `Close`; every edge escapes somewhere; delete `ConfirmModal` returns focus to the row |
| **CHAT-SLOTS-V2-03** | Ask in slot A → switch to slot B mid-Ask → reply lands in A; reopen A and both Q and A are present |
| **CHAT-SLOTS-V2-04** | Close QAM mid-Ask → reopen → question visible with pending answer, not an empty transcript |

02 is manual because preview does not validate Deck focus graphs
([D10](../audit/maintainer-decisions-locked.md#d10--focus-and-d-pad-behavior-has-no-automated-coverage-what-gates-the-remaining-split)).
03 and 04 have unit counterparts above; they stay manual because they are the two
failures that actually reached a user, and they exercise real timing.

**Ship gate:** all four rows checked before the roadmap entry moves to Completed.
That is the process fix for §1.10, and it is the only one that would have caught
v1.

---

## 8. Phased ship plan

| Phase | Contents | Gate |
|---|---|---|
| **P0** | Finish step 8 (`index.tsx` → 700–800) | Existing step 8 gates |
| **P1** | S1 + S2 — service + RPC + record-then-launch + request map. No UI. | `npm run test:py`; Python unit rows above |
| **P2** | S3 — TS API layer, mapper, `useChatThreads`. Still no UI. | `npm test`, `npx tsc --noEmit`; TS unit rows, two mutation-checked |
| **P3** | S4 — picker modal, no entry point yet (reachable from Developer tab for QA only) | Preview suite + **CHAT-SLOTS-V2-02** on-Deck |
| **P4** | S5 — the single Main entry point; `activeThreadId` into survival; Developer-tab QA hook removed | **CHAT-SLOTS-V2-01** on-Deck |
| **P5** | S6 — full pass; `docs/roadmap.md` + `docs/testing.md` updated in the same change set | **V2-03** and **V2-04** on-Deck |

P1 and P2 ship no user-visible change, which makes them individually revertable —
the property v1 lacked when all 34 files landed in one commit and had to be
removed in one commit six hours later.

---

## 9. Open maintainer calls

Neither blocks P0–P2.

- **Entry-point placement.** Reply micro-action (zero new stops, but crowds an
  existing row) vs. one dedicated `PanelSectionRow` above the Ask field (one
  stop, clearer). §3 recommends trying the micro-action and falling back. This is
  a look-at-it-on-the-Deck call, best made at P4.
- **Slot count.** 5 is proposed on picker-fit grounds. If the intended use is
  "one chat per game I'm playing this month", 5 may be low; 8–10 still fits with
  scrolling but weakens the argument for dropping CHAT-SLOTS-06.
