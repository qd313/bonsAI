# Red vs Blue — 2026-04-20 (legal report / bout)

Release priorities for the imminent ship week were argued here under **counsel (Red / Blue)** and decided by the **human judge**. See the active freeze in [roadmap.md](roadmap.md).

## Schedule (America/New_York)

| When | What |
|------|------|
| **2026-04-20, 5:30 PM (17:30)** | **Check-in** — blockers, confirm **issues list** for counsel (Settings trim first, QAMP Phase 1, known bugs, scope creep), fight-doc skeleton ready. |
| **2026-04-20, 11:30 PM (23:30)** | **Counsel / bout** — openings, issues, closings, optional advisory ballot, **Judge’s ruling**. |

*(If check-in was meant to be **5:30 AM**, correct this table and [roadmap.md](roadmap.md) freeze references.)*

---

## Red Team — opening argument

**Counsel for release / risk (Petitioner):** *(Draft here.)*

- Frame: why the ship date and scope cap serve users (stability, testability, no silent regressions).
- Stress: **no new features** unless release-blocking or required to **trim safely**; **Settings tab** is the lead **trim-the-fat** surface (noise, grouping, progressive disclosure).
- Cite concrete risks: permissions, QAM/sysfs paths, Decky focus contracts.

---

## Blue Team — opening argument

**Counsel for vision / trust (Respondent):** *(Draft here.)*

- Frame: what must **not** be sacrificed for calendar (consent, honesty, broken first-run, misleading copy).
- Reserve **veto** or **cut-the-line** items: name any deferral that would materially harm trust or the self-hosted story, with one paragraph each.
- Acknowledge ship pressure; separate “can wait” from “should not ship without.”

---

## Issues / findings (what is at stake this week)

Fill as neutral **findings of fact** before closings.

1. **Trim the fat — Settings tab (lead item):** The Settings surface is overloaded; ship-week cleanup should prioritize **scanability, grouping, fewer simultaneous controls, progressive disclosure, shorter helper copy** before other UI or code churn.
2. **QAMP Reflection Phase 1:** Safe default vs hardware mirror lag; minimal verifiable behavior vs scope creep into Phase 2.
3. **Known bugs:** Question overlay alignment; D-pad scroll bottom cutoff — severity vs release bar.
4. **Other trim / debt:** Only after Settings is acceptably calm; code/bundle/doc noise last so it does not distract from (1).
5. **Scope creep (“tiny” asks):** List any late additions; counsel argues each.

---

## Red Team — closing argument

*(Draft here.)* Tie openings to issues; state recommended **defer / ship / trim** list for the week.

---

## Blue Team — closing argument

*(Draft here.)* Tie openings to issues; state **veto** targets (if any), **cut-the-line** requests (if any), and what must stay in scope for a defensible release.

---

## Advisory ballot (six specialists, one vote each when requested)

**Motions:** TBD — define the question(s) before collecting votes. Votes are **advisory** until the judge elevates them.

| Agent | Advisory vote | One-line rationale |
|-------|---------------|--------------------|
| security-auditor | | |
| foss-advocate | | |
| refactor-specialist | | |
| master-debugger | | |
| red-team | | |
| blue-team | | |

---

## Judge’s ruling (human)

**Nothing below is binding until filled in by the human judge.**

- **Date / time ruled:**  
- **Who won the fight** (plain language, optional score / prevailing theme):  
- **Accept / Reject / Partial** (per major motion or line item):  

| Item | Ruling | Consequence |
|------|--------|-------------|
| Example: Settings trim scope | | |
| Example: QAMP Phase 1 | | |
| Example: Known bugs in this release | | |

- **Week work list (after the bell):**  

---

## After the bell

Carry the **Judge’s ruling** table into actual tasks (issues, PRs, roadmap updates). Archive optional summary in [.cursor/agents/SUBAGENT_REPORTS.md](../.cursor/agents/SUBAGENT_REPORTS.md) if desired.
