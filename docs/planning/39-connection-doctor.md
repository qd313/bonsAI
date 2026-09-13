# 39 — The connection doctor, with the health report folded in

Written 2026-09-05, before any code. The second of the six features the maintainer picked to plan. Two
roadmap entries share one set of checks: the **Connection doctor** (four stars) and the **Deck health
snapshot** (five stars). The earlier feature review said plainly: do not build two check stacks. The
maintainer locked the calls the same day: one feature, with the report inside it. The decisions are **D64**
in [maintainer-decisions-locked.md](../audit/maintainer-decisions-locked.md). § 6 can start whenever this
is picked up.

Read first: [CLAUDE.md](../../CLAUDE.md); the model and effort table in [AGENTS.md](../../AGENTS.md) § 3;
[13-roadmap-feature-ideas.md](../archive/13-roadmap-feature-ideas.md) § B3, where the doctor was first drawn;
[38-toast-answer-lines.md](38-toast-answer-lines.md) for how these plans are shaped.

**One sentence:** when an Ask fails, a **Fix this** button runs the checks the plugin already has, shows
which one failed, and offers the one thing to do next, with a button that lands you on the right control.

---

## 1. What is true right now (checked 2026-09-05, nothing changed)

- **A failed Ask is a dead end.** The reply area shows an error line, or the backend's message, and the
  notification says *Ask failed* with the first 120 letters of it. There is no button and no next step.
  The message itself does not say why: the Ask path reports "could not reach the host for this model"
  and nothing finer, so a doctor cannot read the cause off the failure. It has to run the checks again.
- **The checks already exist, spread across the Ollama tab.** The *Test connection* button, and a quiet
  probe when the tab opens, already tell three cases apart: no host chosen; Ollama not installed on this
  Deck ("tap Install"); a host that does not answer ("check the PC IP, the firewall, and that Ollama is
  running"). For the on-Deck case it even tries to start the runtime and tests again. A reachable host
  also reports its version, its installed models and which are loaded. A separate button searches the
  network for hosts advertising themselves, about eight seconds. The install's own progress and phase
  are readable too.
- **Jumping to a control on another tab and landing the ring on it is a solved shape.** The Permissions
  jump does exactly this: it remembers where you came from, switches tab, lands the ring on the right
  row, and offers *Back to …*. It was measured on the Deck on 2026-09-05 and needed one fix for the ring
  to land across tabs, so both the shape and the trap are known. The Ollama tab's controls would need
  the same registration the Permissions rows have.
- **Typed commands exist.** Three today: the sanitizer on and off, the shortcut setup, the VAC check. A
  *diagnostics* command would take the same shape and needs no model.
- **Writing a file to the Desktop exists.** Append-only notes under the plugin's Desktop folder, gated by
  the file-write permission, with secret-looking fields scrubbed before they are written.
- **The Deck is busy today** and the routing rule says a stateful D-pad flow is measured on the device
  before it is handed to a helper. This plan does not need the Deck until § 7.

## 2. What a person gets

Your question fails. Under the failed reply sits one button, **Fix this**. Press it and a short list
appears, one line per check, filling in over a few seconds:

- Where the AI runs is set ✓
- That host answers ✗

Under the list is one sentence saying what that means, and one button naming the one thing to do next:
*Search the network for it*, *Install Ollama on this Deck*, *Start it*, *Pull a model*, *Fix the try
order*, or *Give it more time*. Pressing the button lands you on that control on the Ollama tab with the
ring already on it, and a *Back to Main* button waits at the top. Beside the action sits **Save a
report**, which writes a plain text file to the Desktop folder for a bug report, and nothing else.

The button lives under the failed reply and nowhere else (locked 2026-09-05). A tap on the *Ask failed*
notification already opens the panel on that reply, so it is one press away from there as well.

## 3. The checks, in order, and the one next action each

Each check is one line. The list stops at the first cross; the rest stay grey.

| # | Check | If it fails, the sentence | The one button |
|---|---|---|---|
| 1 | A place for the AI to run is chosen | You have not chosen where the AI runs yet. | **Choose where the AI runs** (the on-Deck toggle and host field) |
| 2 | On-Deck only: Ollama is installed | Ollama is not installed on this Deck yet. | **Install Ollama** |
| 3 | On-Deck only: it is running | Ollama is installed but not running. It was asked to start; try again in a moment. | **Test again** |
| 4 | LAN only: the host answers | Nothing answered at that address. | **Search the network** (runs the eight-second search; a found host gets a **Use this one** button that fills the field, nothing more) |
| 5 | At least one model is installed there | The host answers but has no models. | **Pull a model** |
| 6 | Your Ask model is among them | The model your Ask uses is not on that host. | **Fix the try order** (or **Pull it**) |
| 7 | Everything above passed, the Ask still failed | Your setup looks fine; the answer took too long or the model gave up. | **Give it more time** (the timeout settings) |

The doctor **offers; it does not act**, with one exception that already exists today: the connection
test starts the on-Deck runtime by itself. Nothing else changes a setting without a press.

## 4. The report, which is the health snapshot folded in

One file, plain text, written to the plugin's Desktop folder when **Save a report** is pressed or the
typed diagnostics command is sent. It needs the file-write permission; if that is off, the button says
so and offers the Permissions jump that already exists.

What goes in: the plugin version and build; the Deck's address on the network; where the AI runs and
what the checks above found, with the host's version, installed models and loaded models; the on-Deck
install's phase; every permission's state; whether the knowledge base is installed and which version;
whether the voice engine is ready; the settings with anything secret-looking removed (the scrubber
already exists); the last Ask's routing details, model tried and time taken, and the length of the last
question, not its words; the last two hundred lines of the plugin log. Read-only throughout.

## 5. What the maintainer decided — D64, locked 2026-09-05

Answered in chat the same day the plan was written.

1. **One feature.** The doctor, with **Save a report** inside it. The five-star snapshot entry retires into it.
2. **Fix this lives under the failed reply**, and nowhere else.
3. **Offers only.** One press per action; the one existing exception stays.
4. **A typed command for the report:** yes.
5. **The report holds everything listed in § 4.**
6. **Consent to break the Deck's setup for the checks:** yes, when the Deck is free and nobody is playing.
7. **Four stars.**

## 6. Build steps, when this is picked up

One thing per commit, all four gates green between commits. The Ollama tab and the failed-reply row are
not owned by either session running today, but the plugin's root file is; step 1 waits for that.

| Step | What lands | Who | Waits for |
|---|---|---|---|
| 1 | One backend call that runs the checks in § 3 in order and returns the list with a verdict and the next action's id. Reuses the existing probes; adds no new one. Tests for every row of the table, with the probes faked. | Sonnet 5 high lane | the bug session's root-file helper to land |
| 2 | The doctor panel: the list, the sentence, the action button, **Save a report**, **Back**. Focus graph entry first, then the control. Tests for the list states and the button labels. | Opus xhigh, after a device measurement of the failed-reply row | step 1 |
| 3 | The Ollama-tab jump: each target control registers itself the way the Permissions rows do; the action button arms the jump; *Back to Main* returns. Tests mirror the Permissions jump's. | Sonnet 5 high lane | step 2 |
| 4 | **Fix this** on the failed reply. | same lane | step 2 |
| 5 | The report writer and the typed command. Tests: every section present, secrets scrubbed, the question's words absent, permission off refused with the jump offered. | Sonnet 5 high lane | step 1 |
| 6 | Docs: the roadmap entry moves to Verify naming the rows below; rows in the manual test doc; a changelog line; the troubleshooting doc points at **Fix this** first. | the session's own driver | steps 2 to 5 |
| 7 | The Deck rows in § 7. | whoever holds the Deck, Opus xhigh reads the results | step 6 and a free Deck |

## 7. Proving it on the Deck

Every row starts from a deliberately broken setup and ends with it restored and read back off disk.

- **DOCTOR-01** Host field set to an address nothing answers at, LAN mode: an Ask fails; **Fix this**
  shows check 4 failing; **Search the network** runs and either lists the real PC with **Use this one**
  or says nothing was found.
- **DOCTOR-02** On-Deck mode with the runtime stopped over SSH: check 3 fails, the sentence says it was
  asked to start, **Test again** passes within a few seconds.
- **DOCTOR-03** A model that is not installed placed first in the try order: check 6 fails; **Fix the
  try order** lands the ring inside the picker; *Back to Main* returns.
- **DOCTOR-04** Everything healthy but the Ask still failed (a give-up time set very short): every check
  ticks, the sentence says the setup looks fine, and **Give it more time** lands the ring on the timeout
  settings.
- **DOCTOR-05** **Save a report** with the file-write permission on: the file appears in the Desktop
  folder with every section, no secret values, and no question text. With it off: the button explains
  and offers the Permissions jump.
- **DOCTOR-06** D-pad only, no touch: from the failed reply, Down reaches **Fix this**; inside the panel
  every stop is reachable and visible; B leaves. The free-play sweep runs because this changes the Main
  tab.

Frozen chips are not needed; any question fails the same way when the setup is broken.

## 8. Risks, and what to know

- **A decision tree on a D-pad is the Deck's hardest surface.** Keep it one vertical list with one action
  button. Every stop must be visible, not just highlighted; the dock has hidden stops before.
- **Landing the ring on another tab failed once already** and needed a fix on 2026-09-05. Step 3 copies
  the fixed shape, not the original.
- **The network search takes eight seconds.** The list must say it is searching, and B must cancel.
- **The doctor must never change a setting silently.** Decision 3 draws the line.
- **A report can leak.** Secrets are scrubbed by the existing writer; the question's words are left out
  on purpose; the log tail may still name games and hosts, and the file says so at its top.
- **Breaking the setup for QA is a real change to the Deck.** Decision 6, and every row restores.

## 9. Out of scope

Editing firewall or network settings; installing anything without a press; anything that fetches from
the web; pulling models onto a LAN host; ranking or recommending models; a live diagnostics screen that
polls; changing how an Ask reports failure to begin with (a finer cause would help the doctor skip the
re-check, and is worth its own small entry later).

## 10. Progress log

Written as work lands.

- **2026-09-05** — Plan written. D64 raised. Roadmap: both entries point here; nothing moved until the
  first call is answered.
- **2026-09-05, later** — D64 locked, all seven. Roadmap: the snapshot entry retired into the doctor's; the
  doctor's entry rewritten to the locked shape. Nothing built. Waits for the maintainer's "proceed" to build.
