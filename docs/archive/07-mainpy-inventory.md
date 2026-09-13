# `main.py` extraction inventory

Execution-order **step 6** / [05-plan.md](05-plan.md) §2.3. **Read-only** — no code was
changed producing this. Output is a `file:line` inventory of what logic remains inline in
`main.py` and where each piece belongs.

Measured against `main.py` at commit `8f6d9ad` (2971 lines). Every claim below cites a
line; anything not verified says `UNKNOWN`.

> **Superseded in part, 2026-08-03.** §8 item 6 (the `_coerce_instance` /
> `_ensure_background_state` removal) was **executed** the same day after **D11** was locked
> to Option A — `main.py` is now **2865 lines / 94 methods**, RPC surface unchanged at 50.
> Line numbers below are the pre-removal ones and are ~100 lines high after `main.py:496`.
> Everything else in this inventory is unexecuted and still current.

---

## 1. Answer to the §2.3 question

> *Is `main.py` a thin RPC facade, or does business logic live in both layers?*

**Both, and the split is not where the file says it is.** By count it looks like a facade —
27 of its 96 methods are 8 lines or fewer. By volume it is not: **the six largest public
RPCs are 706 lines, 24% of the file**, and one of them owns HTTP transport the module
header explicitly disclaims.

| Measure | Value |
|---|---|
| Total lines | 2971 |
| Methods on `class Plugin` | 96 (50 public RPC, 46 private) |
| Lines in the 50 public RPCs | 1767 |
| Lines in the 46 private helpers | 895 |
| Import block + class constants (`main.py:1-210`) | ~210 |
| Methods ≤ 8 lines (thin delegators) | 27 |
| `backend.services.*` modules imported | 29 of 40 on disk |
| Other `backend.*` imports | `constants`, `ollama_routing`, `ollama_urls` |

The remainder is concentrated. Ten methods hold 869 lines — **29% of the file in 10% of
its methods**:

| Method | `main.py:` | Lines |
|---|---|---|
| `start_background_game_ai` | 2354 | 210 |
| `test_ollama_connection` | 1038 | 178 |
| `clear_plugin_data` | 786 | 104 |
| `_run_background_request` | 2271 | 82 |
| `start_local_ollama_setup` | 1263 | 78 |
| `_finalize_immediate_background_local_command` | 2038 | 76 |
| `_start_custom_ollama_pull` | 1627 | 76 |
| `abort_background_game_ai` | 2605 | 71 |
| `start_rag_corpus_download` | 1412 | 65 |
| `install_rag_corpus_local` | 1522 | 60 |

---

## 2. The one clear contract violation

`main.py:6` states the file **"Does not: Own Ollama HTTP"**.

`test_ollama_connection` ([main.py:1038-1215](../../main.py), 178 lines) does. It is the
**only** `urllib` consumer in the file — `main.py:1081-1097` builds and opens requests
against `/api/version`, `/api/tags` and `/api/ps`, parses the JSON, and derives a
`vram_weight_share_pct_appx` ratio from `size_vram` vs `size` (`main.py:1103-1113`). That
last part is not even transport; it is a modelling decision about what "loaded in VRAM"
means, sitting in the RPC layer with no test.

Nothing else in `main.py` imports `urllib` for use (`main.py:20-21` are the only imports,
and lines 1081-1097 the only call sites).

**Belongs in:** a health/probe function beside the other Ollama HTTP code —
`ollama_service.py` already owns `best_effort_abort_ollama_inference`, or a new
`ollama_health_service.py` if that module is already large. The RPC keeps the
`_finish()` logging wrapper (`main.py:1044-1062`) and the loopback-recovery *policy*
(`main.py:1129-1190`), which is genuinely plugin-level because it decides when to call
`recover_loopback_ollama_listening` and what to tell the user.

**Split:** ~70 lines of transport out, ~108 lines of policy and logging stay.

---

## 3. The largest mechanical reduction is a compatibility shim

`_coerce_instance` ([main.py:254-257](../../main.py)):

```python
return self_or_cls() if isinstance(self_or_cls, type) else self_or_cls
```

Its docstring says *"api_version 1 uses an instance; older loaders may pass the class as
self."* `plugin.json:6` declares `"api_version": 1`. Under that loader the branch never
fires and the call is an identity function — **called at 55 sites**.

It has a companion: `_ensure_background_state` ([main.py:496-529](../../main.py), 35 lines)
backfills attributes for "loaders that skip `__init__`" (`main.py:497`). Two things make
this worth a decision rather than a silent deletion:

1. It backfills **11 of the 29** attributes `__init__` sets (`main.py:213-247`). Voice,
   RAG-corpus, intent-pack, settings-save and local-Ollama-setup state are **not**
   backfilled, so the scenario it defends against is only half-defended anyway —
   `start_voice_transcription` (`main.py:2861`) touches `_voice_lock` with no guard.
2. If the class-passed path ever *did* fire, `_coerce_instance` would construct a **new
   instance** and silently discard all in-flight background state. It is not a safe
   fallback; it is a state-loss bug that never triggers.

**This was not a step-6 action.** Removing 55 call sites plus a 35-line method is the
single biggest mechanical shrink available in `main.py`, but it is only behavior-preserving
if the `api_version: 1` assumption is permanent — a maintainer call, filed as **D11**.

> **Locked Option A and executed 2026-08-03.** Both are gone; `main.py` 2971 → 2865
> (−103 lines, −2 methods), RPC surface unchanged at 50. The 53 `plugin = ...` aliases
> became direct `self` use rather than `plugin = self`, so no vestigial indirection remains.
>
> **The shim had a service-side half the inventory missed.**
> `ollama_ask_service.py:81` called `plugin_inst._ensure_background_state()` defensively
> before touching `_active_request_id()` and the chat attributes, and
> `tests/test_ollama_ask_service.py` carried a matching no-op on its `_FakePlugin`. Deleting
> only the `main.py` side would have thrown `AttributeError` on **every Ask** while the unit
> suite stayed green, because that fake satisfied the call. Both were removed with it.
>
> **How it was verified.** A token-level differ compared the pre- and post-transform files:
> after removing the intentionally deleted regions, both sides yield **15,446 identical
> tokens**, with 236 `plugin`/`plugin_bg` NAME tokens becoming `self` and **zero** other
> differences — proof the change is mechanical rather than merely untested, which matters
> because 8 test files cover only a fraction of the 53 methods touched. Then 413 Python
> tests, then a deploy: `bonsAI plugin loaded!`, no `Traceback`/`ERROR`, deployed `main.py`
> at 2865 lines. A text-level find-and-replace would have corrupted the
> `"plugin.lifecycle"` and `"plugin.data_clear"` log event names and the docstring prose;
> those are string tokens and were left untouched.

---

## 4. Duplicated state shapes

The background-request state dict is declared **four times**:

| Site | `main.py:` | Keys | Note |
|---|---|---|---|
| `_new_background_state` | 341-360 | 18 | canonical |
| `start_background_game_ai` | 2499-2518 | 18 | full literal, not derived from the canonical one |
| `_finalize_immediate_background_local_command` | 2076-2092 | 15 | **omits** `partial_response`, `streaming`, `thinking_summary` |
| `_ensure_background_state` | 502-503 | — | correctly calls `_new_background_state()` |

Two further sites merge instead of rebuilding (`main.py:2320`, `main.py:2664`), which is
the safe pattern.

**The 15-key literal is not a live bug.** Every read goes through
`_merge_partial_into_background_status` ([main.py:469-494](../../main.py)), which writes
all three missing keys unconditionally in both branches (`main.py:477-478`, `491-493`)
before the state reaches the frontend. It is a latent one: any new consumer reading
`_background_state` directly gets a `KeyError` shape that differs by code path.

The partial-stream snapshot is declared **three** times — `_new_partial_stream_snapshot`
(`main.py:363-369`), then re-literalled in `_clear_partial_stream_snapshot`
(`main.py:377-383`) and again in `_ensure_background_state` (`main.py:523-529`), both of
which could call the constructor.

**Belongs in:** a small `background_request_state.py` owning the shape and its
transitions (`new`, `pending`, `completed`, `cancelled`, `failed`). This is the highest
value-per-risk extraction in the file: pure data, no I/O, and the three tests that already
import `Plugin` for background state (`tests/test_background_abort_busy.py`,
`tests/test_background_partial_state.py`, `tests/test_token_stream_request_id_wiring.py`)
give it a starting net.

---

## 5. Repeated block shapes

**Three near-identical local-command dispatch blocks** in `start_background_game_ai`
(`main.py:2438-2454` sanitizer, `2456-2475` shortcut, `2477-2494` VAC). Each is ~18 lines
differing only in the handler called and the kwargs passed to
`_finalize_immediate_background_local_command`. Collapses to a table plus one loop —
about 40 lines saved, and it is the kind of change `detect_local_ask_commands`
(`main.py:2378`) was clearly built to enable.

**Four repetitions of cancel-task-and-reset** in `clear_plugin_data`
(`main.py:790-799` background, `803-815` local Ollama setup, `819-831` voice install,
plus `817` delegating voice session teardown). Same shape each time: take the lock, cancel
the task, `await` it swallowing `CancelledError`, reset the state to its `new_*()`
default. Extracting `async def cancel_and_reset(lock, task_attr, state_attr, factory)`
would fold ~45 lines into ~15.

**Non-obvious detail worth preserving:** `clear_plugin_data` imports
`wipe_bonsai_cache_dir` and `wipe_proton_experiment_journal` **inside the function body**
(`main.py:851`), not at module scope. The journal wipe is the survivor of the deleted
Proton-journal feature (D2) and is why that service could not be removed outright.

---

## 6. Cross-cutting concerns threaded through the RPCs

These are not extractable as blocks — they are the reason the RPCs are long.

| Concern | Call sites | Where it lives now |
|---|---|---|
| `_coerce_instance(self)` | 55 | `main.py:254` — see §3 |
| `_maybe_app_log(...)` | 29 | `main.py:561-594`, delegates to `desktop_note_service` |
| `await load_settings()` inside another RPC | 24 | each RPC re-reads settings from disk |
| `asyncio.to_thread(...)` | 22 | sync service calls hoisted off the loop |
| `threading.*` primitives | 14 | abort/stream coordination, `main.py:213-247` |

The 24 in-RPC `load_settings()` calls are worth flagging for **step 7** (settings single
source of truth): every one is a disk read through
`settings_service.load_settings`, and several RPCs read settings two or three times in one
call path (`get_rag_corpus_status` at `main.py:1360` then again transitively through
`resolve_corpus_db_path`). Whatever step 7 builds should decide whether settings are
request-scoped or cached, because that decision changes 24 call sites.

---

## 7. What must stay in `main.py`

Not everything long is misplaced. These are genuinely the entry point's job:

- **Lifecycle** — `_main` (`main.py:306-310`), `_unload` (`main.py:312-337`).
- **Runtime state ownership** — the 29 attributes at `main.py:213-247`. Locks, tasks and
  events belong to the object the loader keeps alive. Services take them as arguments;
  they cannot own them.
- **Admission control and terminal-state publication** — the `_background_lock` sections
  in `start_background_game_ai` (`main.py:2417-2554`), `_run_background_request`
  (`main.py:2305-2339`), `get_background_game_ai_status` (`main.py:2582-2603`) and
  `abort_background_game_ai` (`main.py:2649-2673`). The *sequence* is the plugin's
  concurrency contract with the polling frontend.
- **Thin delegators** — 27 methods are already ≤8 lines and need nothing.
- **Wide-signature pass-throughs** — `ask_ollama` (`main.py:2727-2772`, 46 lines) and
  `_build_system_prompt` (`main.py:2677-2725`, 49 lines) look big in the size ranking but
  contain no logic: each forwards its arguments to one service call
  (`run_ask_ollama`; `build_system_prompt` + `append_deck_tdp_sysfs_grounding`). They are
  long because of parameter lists — 18 parameters each. Splitting them
  would add indirection with no gain. If they shrink, it will be as a side effect of step
  7 collapsing the settings-derived arguments, not as an extraction of their own.

One exception inside "must stay": `abort_background_game_ai` reaches into transport —
`wre.close()` on the live `urllib` response (`main.py:2616-2629`) and a raw
`threading.Thread` spawn (`main.py:2634-2644`). The *decision* to abort is plugin-level;
closing an HTTP handle is not. That belongs beside the other Ollama transport code.

---

## 8. Recommended extraction order

Ordered by value-per-risk, not by size. Nothing here is a step-6 action — step 6 is this
document.

| # | Extraction | Lines moved | Risk | Why this order |
|---|---|---|---|---|
| 1 | Background-request state shape → `background_request_state.py` | ~60 | LOW | Pure data, 3 existing tests touch it, kills a 4-way duplication |
| 2 | `test_ollama_connection` transport → `ollama_service.py` | ~70 | LOW-MED | Removes the only header contradiction; no test today, so add one with the move |
| 3 | ~~Local-command dispatch table in `start_background_game_ai`~~ | ~40 | **Dropped 2026-08-04** | The three blocks differ in the *kind* of one argument, not its value — they do not collapse. See the note below |
| 4 | `cancel_and_reset` helper for `clear_plugin_data` | ~45 | MED | Four subsystems; a mistake here breaks *Clear all data*, which has burned this refactor once already ([05-plan.md](05-plan.md) §1.1) |
| 5 | `abort_background_game_ai` transport half | ~25 | MED | Cross-thread HTTP close; hard to test, easy to get subtly wrong |
| 6 | `_coerce_instance` + `_ensure_background_state` removal | 103 | ~~Blocked on D11~~ **done 2026-08-03** | Biggest shrink; D11 locked Option A. See §3 |

Items 1-2 are worth doing before **step 7**. Item 6 is done — it was pulled ahead of its
place in this order precisely because it interacts with step 7, which touches instance
lifetime. Items 3-5 can wait until after **step 8**.

> **Executed 2026-08-03 as roadmap step 12 — items 1, 2, 4 and 5.** `main.py` 2865 → 2743,
> with 60 new tests (`test_background_request_state.py`, `test_ollama_health_probe.py`,
> `test_async_task_lifecycle.py`, `test_ollama_abort_transport.py`), each mutation-checked.
> Item 2 removed the last `urllib` use from `main.py`, so §2's contract violation is closed.
>
> **The sequencing note above lapsed and is worth learning from.** "Items 1-2 before step 7"
> was written into this doc and nowhere else; step 7 shipped without them because the
> execution order in `roadmap.md` never referenced this list. Advice that lives only in an
> audit document does not survive contact with the next session — it has to become a
> numbered step.
>
> **Item 3 was examined and dropped from this list** by maintainer call 2026-08-04. See roadmap
> step 12 for the reasoning: the three
> dispatch blocks differ in the *kind* of their `shortcut_setup` argument (omitted / from the
> handler / explicit None), so a table needs a three-way mode enum with one mode per row. That
> relocates the difference instead of collapsing it, and puts an indirection on the Ask
> admission path to save ~17 lines. Recommendation is to drop it from this list.

---

## 9. Coverage reality (corrects §2.3)

[05-plan.md](05-plan.md) §2.3 says *"5 of 50 Python tests import `Plugin`, all testing
locking, not RPC behavior."* Both halves are now out of date:

- **8** test files import `Plugin`: `test_background_abort_busy.py`,
  `test_background_partial_state.py`, `test_intent_pack_store_lock.py`,
  `test_merge_pulled_tags_rpc.py`, `test_session_rag_chip_candidates_rpc.py`,
  `test_settings_save_lock.py`, `test_strategy_checklist_store_lock.py`,
  `test_token_stream_request_id_wiring.py`.
- **Two of them do test RPC behavior** — `test_merge_pulled_tags_rpc.py` (8 tests) and
  `test_session_rag_chip_candidates_rpc.py` (7 tests), both added 2026-08-02 with the D1
  wiring. They are the only worked examples of testing a `class Plugin` RPC directly, and
  are the pattern to copy for extractions 1-5 above.

Still true: **none of the ten largest methods has a behavioral test.** `test_ollama_connection`,
`clear_plugin_data`, `start_local_ollama_setup`, `start_rag_corpus_download` and
`install_rag_corpus_local` are entirely uncovered.

## 10. Other corrections to §2.3 premises

- **"3021 lines"** → 2971 at `8f6d9ad` (the D2 cleanup removed 50).
- **"imports 35 of 42 services"** → 29 distinct `backend.services.*` modules of 40 on
  disk, plus 3 non-service `backend.*` modules.
- **"complexity 467 — the #1 hotspot by nearly 3×"** — not re-measured here; see
  `packages/bonsai-mcp/knowledge/architecture/hotspots.json`, which is regenerated each
  commit.
