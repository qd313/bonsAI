# 15 — Corpus licensing and attribution — executable plan

**Status:** `DONE` 2026-08-09 — Stages 1–5 complete (licence gate, generated `ATTRIBUTIONS.md`,
redistribution header, NOTICE + zip guard, drift/version tests + **KB-ATTRIB-02**).
Still blocks *first public corpus publish* until Phase 6 packaging/HF land; the legal scrub
itself is no longer open work.
**Roadmap:** [Backlog § Knowledge base — RAG Deck query — public publish (Phase 6)](../roadmap.md#knowledge-base) (★★★★)
**Already shipped and out of scope here:** per-reply credit on the knowledge chip and the
per-card `source_url` rule — landed 2026-08-09, see
[knowledge-base.md § Source attribution](../knowledge-base.md).

## How to use this file

Every task has an id (`ATTR-n.n`), an exact file, an acceptance criterion, and a verify
command. Work top to bottom.

**Line numbers were derived 2026-08-09 against `663d234`. Re-run each `grep` before editing
rather than trusting the number.**

**Stage 1 is a gate.** If a source turns out to be unusable, the cards from it do not get
written — and that is cheaper to discover before 181 cards exist than after.

## Progress

| Task | Title | State |
|---|---|---|
| ATTR-1.1…1.4 | Confirm each source's licence, at the source | ☑ Done 2026-08-09 — footers confirmed for all in-seed wikis; Zelda corrected to GFDL, excluded from publish (D19b, superseded by **D20** 2026-08-14: publish as one CC BY-SA 4.0 work, ShareAlike included) |
| ATTR-2.1…2.3 | Generate `ATTRIBUTIONS.md` from the corpus | ✅ Done 2026-08-09 |
| ATTR-3.1…3.2 | State the corpus licence and the ShareAlike obligation | ✅ Done 2026-08-09 |
| ATTR-4.1…4.2 | Repo-side `NOTICE` and the Apache/CC separation | ✅ Done 2026-08-09 |
| ATTR-5.1…5.3 | Tests and docs | ✅ Done 2026-08-09 |

States: `☐ Not started` · `▶ In progress` · `✅ Done` · `⛔ Blocked` · `✖ Dropped`

---

## 0. Why this exists

The reply a user reads now credits its sources. **Distribution does not.** Publishing a
~5 GB corpus of adaptations of CC BY-SA material is a redistribution, and it carries
obligations the plugin UI cannot discharge on its own.

Three specific problems, all verified rather than assumed:

**1. `ATTRIBUTIONS.md` is a hardcoded string, not a description of the corpus.**
[`write_attributions`](../../scripts/build_rag_db.py) at `:292` takes `out_dir`, ignores the
database entirely, and writes a fixed literal. It is therefore already wrong:

| It says | Actually |
|---|---|
| "interim 11-title QA mix" | 13 titles since 2026-08-09 |
| names only OoT and DRG Survivor | 13 games, and Portal 2 / Half-Life 2 will carry different licences from each other |
| no source URLs anywhere | CC BY-SA asks for a link to the material and to the licence |
| no licence URL | ditto |
| "Per-reply attribution also appears in Input transparency" | **was false until `663d234`** — the chip discarded every source |

A file that discharges a legal obligation must be **derived from the data it describes**, or
it drifts silently and nobody notices. It already did.

**2. Nothing states the corpus's own licence.** Cards are adaptations. Under ShareAlike the
adaptation inherits the source's licence — per work, not per database. A downstream user
currently cannot tell what they may do with the corpus, and *we* have not said.

**3. The plugin is Apache-2.0 ([LICENSE](../../LICENSE), `package.json:41`) and the corpus
will not be.** Apache-2.0 and CC BY-SA-3.0 cannot be combined into one work. What makes this
workable is that **the corpus is distributed separately** and downloaded at runtime — a
decision already recorded in the current attributions header and in Phase 6's shape. That
separation is load-bearing, not incidental, and needs writing down as such so a future change
does not casually bundle the corpus into the plugin zip and collapse the distinction.

---

## Stage 1 — Confirm each source's licence, at the source (gate)

Do this **before** writing cards from a source, not after. A source that turns out to be
unusable costs nothing today and costs a rewrite later.

- [x] **ATTR-1.1** — For every source that will contribute cards, record: exact licence name
      **and version**, the licence URL, where the statement was read, and the date.
      Machine-readable `rightsinfo` from the wiki's own `api.php` beats a page footer; a
      footer beats an assumption. Current state, measured 2026-08-09:

      | Source | Licence | How it was read |
      |---|---|---|
      | `theportalwiki.com` | CC BY 4.0 | `api.php` `rightsinfo` | **version confirmed 2026-08-09** |
      | `combineoverwiki.net` | CC BY-SA 4.0 | footer badge; `api.php` gave no version — **version confirmed 2026-08-09**; page footer *"Content is available under Creative Commons Attribution-ShareAlike unless otherwise noted"* — **footer reconfirmed 2026-08-09** |
      | `left4dead.fandom.com` | CC BY-SA 3.0 | snapshot `siteinfo` (`CC-BY-SA`) + `fandom.com/licensing` (3.0 Unported); page footer *"Community content is available under CC-BY-SA unless otherwise noted"* — **footer confirmed 2026-08-09** |
      | `fallout.fandom.com` | CC BY-SA 3.0 | snapshot `siteinfo` + `fandom.com/licensing`; page footer *"Community content is available under CC-BY-SA unless otherwise noted"* — **footer confirmed 2026-08-09** |
      | `cyberpunk.fandom.com` | CC BY-SA 3.0 | snapshot `siteinfo` + `fandom.com/licensing`; page footer *"Community content is available under CC-BY-SA unless otherwise noted"* — **footer confirmed 2026-08-09** |
      | `gta.fandom.com` | CC BY-SA 3.0 | dump carries no `siteinfo`; page footer links `fandom.com/licensing`, read via Wayback at the snapshot date; live footer *"Community content is available under CC-BY-SA unless otherwise noted"* — **footer confirmed 2026-08-09** |
      | `liquipedia.net` | CC-BY-SA | `api.php` `rightsinfo` |
      | `zelda.fandom.com` | **GFDL** | page footer: *"Community content is available under GNU Free Documentation License unless otherwise noted"* — **confirmed 2026-08-09**; seed had wrongly recorded `CC-BY-SA-3.0` (Fandom default assumed). **Excluded from publish** — GFDL does not mix with Creative Commons (unaffected by D19b→D20; this exclusion is independent of the BY-vs-ShareAlike question). The 2 affected cards (King Dodongo, Water Temple) were dropped from the seed entirely 2026-08-14 rather than published under the wrong licence |
      | `wiki.teamfortress.com` | **none published** | **excluded** — Valve ToU grants other users personal use only |
      | `developer.valvesoftware.com` | CC BY-NC-SA | **excluded** — NonCommercial is non-free |
      | `hades.fandom.com` | **CC BY-NC-SA 3.0** | **excluded** — snapshot `siteinfo`, which contradicts the archive.org item's `licenseurl` of CC BY-SA 3.0 |
      | `bg3.wiki` | CC BY-SA 4.0 **or** CC BY-NC-SA 4.0, per contributor | **excluded** — pre-2024-07-20 content is NonCommercial-only unless that contributor consented, and no page says which |
      | `reddead.fandom.com`, `sims.fandom.com` | CC BY-SA 3.0 | licence fine, **not used** — the only snapshots are 2020-02-23 and their pages for our titles are stubs |

      *Acceptance:* every row that will produce a card has a version and a URL. No row says
      "assumed" or inherits a version from a different wiki.

- [x] **ATTR-1.2** — For a source ingested from an **archive.org WikiTeam dump**, record the
      snapshot identifier and its date, and re-read `dumpMeta/siteinfo.json` from *that*
      snapshot rather than carrying a licence forward from this document. A licence is a fact
      as of a date.
      *Acceptance:* the recorded licence for a dump-sourced card matches that dump's own
      `siteinfo`. **Done 2026-08-09.** The check is not academic: `wiki-hadesfandomcom` claims
      CC BY-SA 3.0 in its item metadata and CC BY-NC-SA 3.0 in its own `siteinfo`, and the
      snapshot wins. [scripts/fetch_wiki_dump_pages.py](../../scripts/fetch_wiki_dump_pages.py)
      prints both. The snapshot date is recorded per card as `crawled_at` and shown on the
      chip as *"as of YYYY-MM-DD"*; the identifier lives in the roadmap's 6d entry.

- [x] **ATTR-1.3** — Decide and write down whether **CC BY 4.0** and **CC BY-SA 3.0/4.0**
      cards may coexist in one corpus file.
      *Decision (D19b, 2026-08-09, superseded by D20, 2026-08-14):* the publishable corpus
      ships as one **CC BY-SA 4.0** work; ShareAlike sources are included, not deferred.
      Per-card `source_license` stays queryable and governs individual reuse. GFDL and
      NonCommercial sources remain excluded — those exclusions were never about BY-vs-ShareAlike.
      *Acceptance:* recorded in [maintainer-decisions-locked.md](../audit/maintainer-decisions-locked.md) § D20.

- [x] **ATTR-1.4** — Confirm no card text is a **verbatim copy** of source prose. Cards are
      distilled and maintainer-authored; that is what makes them adaptations rather than
      reproductions. Spot-check at least one card per source against its page.
      *Acceptance:* no card is a paste. Any that is gets rewritten or dropped.
      *Spot-checks 2026-08-09 (maintainer):*
      - Portal **Gels** — pass
      - Combine **Gravity Gun** — pass (distilled vs encyclopedia overview)
      - L4D2 **Tank** — pass (*"the big one"* echoes Sacrifice graffiti *"one of the big ones"*;
        not a paste of the article)
      - Fallout **Deathclaw** — pass (wiki *"very high amount of health"* ↔ card rewrite,
        not verbatim)
      - GTA **Muscle** — pass (no copy/paste on Statistics)
      - **Cyberpunk Sandevistan** — now in the publish set under D20 (was optional under
        BY-only D19b); spot-check before first publish, not optional.
      - Zelda **King Dodongo** — moot; the card was dropped from the seed 2026-08-14 (GFDL
        exclusion, unaffected by D19b→D20).

---

## Stage 2 — Generate `ATTRIBUTIONS.md` from the corpus

- [x] **ATTR-2.1** — Rewrite `write_attributions` to take the **connection**, not just
      `out_dir`, and build the file from `SELECT DISTINCT source_url, source_license` across
      `sections` and `compat_patterns`, joined to game titles.
      `scripts/build_rag_db.py` (`format_attributions_markdown` / `write_attributions`).
      *Acceptance:* adding a card from a new wiki changes `ATTRIBUTIONS.md` with no edit to
      the script. Removing every card from a source removes its section.
      *Verify:* `python scripts/build_rag_db.py --seed --out build/kb-attrib && cat build/kb-attrib/ATTRIBUTIONS.md`
      — **done 2026-08-09**; unit coverage in `tests/test_build_rag_attributions.py`.

- [x] **ATTR-2.2** — Each entry names: the **source site**, the **licence with version**, a
      **link to the licence**, and the **cards taken from it**. Group by (source, licence),
      matching what the chip already does — `build_attribution_entries` in
      `transparency_service.py` is the same grouping and its shape is the one to mirror.
      Maintainer-authored cards get their own section and credit nobody.
      *Acceptance:* a reader can go from any card in the corpus to its source and licence.

- [x] **ATTR-2.3** — Keep `manifest["attributions_markdown"]` in step
      so the manifest and the file cannot disagree (same string written to both).
      *Acceptance:* they are byte-identical; a test asserts it.

---

## Stage 3 — State the corpus licence and the ShareAlike obligation

- [x] **ATTR-3.1** — Add a header to the generated file stating **what a downstream user may
      do with the corpus**: that cards are adaptations, that each card carries the licence of
      its source, that ShareAlike sources bind adaptations of their cards, and where the
      per-card licence lives (`source_license`, queryable). Say plainly that the corpus is
      **not** under the plugin's Apache-2.0 licence.
      *Acceptance:* the header answers "may I redistribute this?" without the reader opening
      the database. **Done 2026-08-09**, updated 2026-08-14 for D20 — `## May I redistribute
      this corpus?` in `_attributions_header_lines()` (now states the CC BY-SA 4.0 whole-work
      label, not the D19b BY-only note).

- [x] **ATTR-3.2** — Keep the existing *"sources can err → fix forward"* note from the Phase 6
      discovery lock, and add that cards are **distilled, not authoritative** — a wiki can be
      wrong and so can our distillation of it.
      *Acceptance:* present in the generated file, not only in this plan. **Done 2026-08-09**
      — `## Accuracy` section in the same header.

---

## Stage 4 — Repo-side `NOTICE` and the Apache/CC separation

- [x] **ATTR-4.1** — Extend [NOTICE](../../NOTICE) to record that the plugin ships **no**
      corpus content, that the corpus is a separate download under separate terms, and where
      its attributions live. Today `NOTICE` covers only the decky-plugin-template BSD
      derivation.
      *Acceptance:* someone auditing the *plugin* zip can see that no CC BY-SA material is in
      it, and where to look for the material that is. **Done 2026-08-09.**

- [x] **ATTR-4.2** — Add a guard that the release zip contains no corpus file. The separation
      is what keeps Apache-2.0 and CC BY-SA from colliding; it should fail a build rather than
      rely on nobody bundling it by accident. The zip verifier in `scripts/` is the place.
      *Acceptance:* a deliberately planted `corpus.db` in the staging dir fails the release
      build. **Done 2026-08-09** — `scripts/plugin_zip_corpus_guard.py` (dir or zip);
      hooked from `scripts/verify-decky-plugin-zip.sh`; tests in
      `tests/test_plugin_zip_corpus_guard.py`.

---

## Stage 5 — Tests and docs

- [x] **ATTR-5.1** — Extend tests so every distinct `(source_url, source_license)` in a built
      corpus appears in the generated `ATTRIBUTIONS.md`.
      *Verify:* `tests/test_build_rag_attributions.py` —
      `test_every_distinct_url_license_pair_appears_in_attributions` (in-memory seed).
      **Done 2026-08-09.**

- [x] **ATTR-5.2** — Assert the generated file names a licence **version** for every
      third-party source. "CC BY-SA" with no version is the gap Combine OverWiki's API left,
      and it must not reach a published corpus.
      *Done 2026-08-09* — `licence_string_includes_version` + heading scan; seed JSON check in
      `test_source_attribution.py`.

- [x] **ATTR-5.3** — Update [knowledge-base.md § Source attribution](../knowledge-base.md) to
      cover distribution as well as the reply, and add an on-Deck row **KB-ATTRIB-02** to
      [testing.md](../testing.md) for the published-corpus path.
      **Done 2026-08-09.**

---

## Not in scope

- Per-sentence citation in replies, or linking out to a wiki from the Deck (no browser).
- Relicensing the plugin. Apache-2.0 stays; the separation is the mechanism.
- Ingestion tooling itself — see the sourcing notes on
  [KB online / versus strategy content](../roadmap.md#knowledge-base).
- User-submitted content, which has its own moderation and licensing problem — see
  **Community tip contribution** in the roadmap.

## Open questions for the maintainer

1. ~~**Publishing target.**~~ **Resolved 2026-08-14 (D20).** HF licence dropdown is
   **CC BY-SA 4.0**, and ShareAlike cards are in the first-publish set, not deferred.
2. **Attribution for the L4D2 dump.** **Locked 2026-08-09 (hybrid):** Deck chip stays
   short (wiki · licence · as-of date); WikiTeam / archive.org snapshot line lives in
   generated `ATTRIBUTIONS.md`. See
   [17-kb-online-versus-strategy-content.md](17-kb-online-versus-strategy-content.md).
   *(L4D2 is BY-SA — included in first publish under D20 (no longer deferred); the hybrid
   attribution shape applies as designed.)*
