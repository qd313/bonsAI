# 02 — README.md redesign — plan

Planning answer to [roadmap-planning-questions.md](roadmap-planning-questions.md) § 2.
Recon and specification only — **no README text written, no images produced**.
Effort uses the roadmap GTA scale (`★` … `★★★★★★`).

Sources: [README.md](../../README.md) (159 lines / 1,450 words),
[DOCUMENTATION_INDEX.md](../DOCUMENTATION_INDEX.md),
[troubleshooting.md](../troubleshooting.md),
[pluginQuickStartInstructions.tsx](../../src/data/pluginQuickStartInstructions.tsx),
[PermissionsTab.tsx](../../src/components/PermissionsTab.tsx),
[development.md § two tracks](../development.md),
[deck-screen-recording.md](../archive/spikes/deck-screen-recording.md).

---

## 0. Findings that bound the plan

Established during recon. Each one changes what the rewrite can claim, so they
come before the outline.

| # | Finding | Evidence |
|---|---------|----------|
| **F1** | **The power-limit permission does not exist.** `adjust_power_limits`, `allowPowerLimit`, and `power_limit` return **zero** matches repo-wide. The Permissions tab ships **four** toggles: Read game & screenshot context (inline), Save files to Desktop, Steam ban lookup, Voice input (microphone). | [PermissionsTab.tsx:16-60](../../src/components/PermissionsTab.tsx#L16) |
| **F2** | **Three files carry the stale TDP claim**, not one. README L5, L63, L80 — and the in-plugin copy at [pluginQuickStartInstructions.tsx:66-67](../../src/data/pluginQuickStartInstructions.tsx#L66) ("optional **Adjust power limits** in Permissions"). Fixing README alone leaves the plugin lying to the user. | grep `power limits` |
| **F3** | ~~Install URL is broken three ways, not two.~~ **Resolved.** The GitHub account is `qd313` (renamed from `cantcurecancer`); the old name is unregistered and was claimable by anyone, which made it a live supply-chain risk (the RAG corpus manifest and the Pull Models overlay both fetched from it at runtime). Maintainer call (2026-08-14): `qd313` is canonical everywhere; `cantcurecancer` is being defensively registered on a throwaway account so it can't be taken. See § 7. | `git remote -v`; grep |
| **F4** | **Search intent packs have no UI.** No user-facing string in `src/components/` or `src/index.tsx`; only `useIntentPacks.ts` / `intentPackSearch.ts` remain, and [troubleshooting.md:630](../troubleshooting.md) titles the section "What they do (**backend still present**)". Roadmap carries `★ Intent packs later review`. README L57 describes a Settings control the user cannot see. | grep; [roadmap.md § Near-term](../roadmap.md#planned) |
| **F5** | **Response verification has no UI either.** Zero matches for `erification` in `src/components/*.tsx` or `src/index.tsx`. README L74 is describing removed surface. | grep |
| **F6** | **`knowledge-base.md` is maintainer-facing, not a power-user link.** Its own line 3 routes users elsewhere: "User setup: troubleshooting.md § Knowledge base". The brief assumed it belonged in the power-user funnel; it belongs in the collapsed contributors block, and the user-facing KB link is [troubleshooting § Knowledge base](../troubleshooting.md#knowledge-base-offline-strategy-cards). | [knowledge-base.md:3](../knowledge-base.md) |
| **F7** | **Capture output is `.png` and `.mkv` — never GIF.** `bonsai-capture.sh` writes PNG; `bonsai-record.sh` writes VP8-in-MKV (`/tmp/deck_record.mkv`, ~2.5 Mbps compressed / 8 Mbps full). **Every GIF in the plan needs a PC-side `ffmpeg` conversion step** that does not exist yet. | [bonsai-capture.sh:117](../../scripts/deck/bonsai-capture.sh#L117), [bonsai-record.sh:198,428](../../scripts/deck/bonsai-record.sh#L428) |
| **F8** | **Root `assets/` may ship inside the release zip.** The deploy scripts copy only `dist/assets`, but the release path shells out to the Decky CLI (`cli/decky`) whose copy list is not readable here. Putting 8 MB of GIFs in `assets/` risks bloating every user's download. Use a separate directory and verify with [verify-decky-plugin-zip.sh](../../scripts/verify-decky-plugin-zip.sh). | [build.sh:185,227](../../scripts/build.sh#L185) |
| **F9** | **Model tags in the current README are correct** — `qwen2.5vl:3b` (Tier 1) and `gemma4:e2b-it-qat` (Tier 2) match code. Do not "fix" them during the rewrite. Two unbalanced parentheses on L14–15 are the only defect. | [deckEssentialsTags.ts:8-14](../../src/data/deckEssentialsTags.ts#L8) |
| **F10** | **`LICENSE` exists but README never mentions it.** A public-facing README should say what the licence is in one line. | `ls LICENSE` |

---

## 1. Target outline

### Length budget

| | Current | Target |
|---|---|---|
| Total lines | 159 | **≤ 100** |
| Words in the visible body | 1,450 | **≤ 750** |
| Words above the fold (title → step 1) | ~230 | **≤ 90** |
| Markdown tables in the visible body | 4 | **0** |
| Images | 1 | 6 |

"Visible body" = everything before the collapsed `<details>` contributors block.
The contributors block is excluded from the word budget because a casual reader
never expands it. **Zero tables in the visible body** is the load-bearing rule —
every table in the current README (glossary, where-Ollama-runs, model tiers,
documentation) is either a relocation target or a deletion, and tables render
badly on the phone screens where a lot of Deck owners read GitHub.

### Section map

| # | Heading | Purpose (1 line) | Media | Budget |
|---|---------|------------------|-------|--------|
| — | `# bonsAI` + one-sentence what-it-is | A Deck owner knows in 15 words whether this is for them. | — | 3 lines |
| — | *(unheaded)* hero image | Show the thing running, before any instruction. | `hero.png` **PNG** | 2 lines |
| — | *(unheaded)* beta note, 2 sentences | Honest limits without a wall of warnings. | — | 3 lines |
| 1 | `## Before you start` | The two prerequisites (a Deck with Decky; somewhere to run Ollama) + the one-sentence Ollama definition. | — | 6 lines |
| 2 | `## 1. Install bonsAI` | QAM → Decky → install from URL, with the canonical zip URL. | `01-install-from-url.gif` **GIF** | 10 lines |
| 3 | `## 2. Tell bonsAI where the AI runs` | The single most common failure — set the base URL before anything else. | `02-where-ai-runs.png` **PNG** | 12 lines |
| 4 | `## 3. Get a model` | Two branches: on-Deck wizard, or `ollama pull` on a PC. | `03-install-essentials.png` **PNG** | 12 lines |
| 5 | `## 4. Send your first Ask` | The payoff. Type, send, see a reply stream in. | `04-first-ask.gif` **GIF** | 8 lines |
| 6 | `## What else it does` | 5–6 one-line bullets, each ≤ 18 words, no sub-bullets. | `05-main-tab-presets.png` **PNG** | 10 lines |
| 7 | `## If it isn't working` | Three most likely causes inline, then one link out. | — | 6 lines |
| 8 | `## Go deeper` | The power-user funnel — links only, no explanation. | — | 10 lines |
| 9 | `<details><summary>Contributors</summary>` | Build from source, architecture, docs index, licence. Collapsed. | — | 12 lines |
| 10 | `## Buy me a beer` | Unchanged. | `qrcode.png` (existing) | 3 lines |

Steps are numbered **1–4**, not 1–6. Four steps reads as achievable; six reads as
a project. "Before you start" is deliberately unnumbered so it does not inflate
the count.

### What moves out of the visible body

| Current README | Destination |
|---|---|
| Glossary table (L22–32) | Deleted. QAM / Ollama / LAN defined inline once each (§ 3). The rest is maintainer vocabulary — [docs/glossary.md](../glossary.md) already owns it. |
| Where Ollama runs table (L99–105) | Two sentences inside step 2; the `OLLAMA_HOST` / firewall detail goes to [troubleshooting § Network](../troubleshooting.md#2-network--communication-the-bridge). |
| Model policy tiers table (L122–132) | [troubleshooting.md](../troubleshooting.md) — needs a new short section; one `Go deeper` line points at it. |
| Input sanitization (L114–116) | [troubleshooting § Input sanitizer](../troubleshooting.md#input-sanitizer-ask-lane) (section already exists). |
| Build from source (L134–138) | Collapsed contributors block, one line → [development.md](../development.md). |
| Documentation table (L140–151) | Replaced by one link to [DOCUMENTATION_INDEX.md](../DOCUMENTATION_INDEX.md), which already **is** this table. |
| Uninstall vs Clear all data (L18) | `Go deeper` line → [troubleshooting § 1b](../troubleshooting.md#1b-uninstall-vs-clear-all-data-settings). Not a first-run concern. |
| Requirements (L91–95) | Folded into "Before you start". |

---

## 2. Visual / media plan

### Shot list

Six assets. Directory: **`assets/readme/`** — separate from `assets/` so a zip-size
check (F8) can be run on the directory as a unit and so plugin-shipped art
(`logo.png`) is never confused with documentation art.

| # | File | Type | Mode | Capture | Target size | Shows |
|---|------|------|------|---------|-------------|-------|
| A | `assets/readme/hero.png` | PNG | Gaming Mode (Track B) | `screenshot-deck.ps1 -Mode game` | 960×600, ≤ 400 KB | Main tab with preset chips + Ask bar, a game running behind the QAM overlay. Re-shoot at v0.5.0 — the current file is from 2026-07-06. |
| B | `assets/readme/01-install-from-url.gif` | **GIF** | BPM (Track A) | `record-deck.ps1 -Seconds 12` → ffmpeg | 640 px wide, ≤ 3 MB | QAM → Decky plug icon → Settings → Developer → paste URL → install. **Motion is the information here** — this is the step people get lost in. |
| C | `assets/readme/02-where-ai-runs.png` | PNG | BPM (Track A) | `screenshot-deck.ps1 -Mode desktop` | 640×800 (QAM crop), ≤ 250 KB | Ollama tab, **Where AI runs** with a filled-in base URL. Static state the reader must match — PNG, not GIF. |
| D | `assets/readme/03-install-essentials.png` | PNG | BPM (Track A) | `screenshot-deck.ps1 -Mode desktop` | 640×800 (QAM crop), ≤ 250 KB | Ollama tab → **Install Tier 1 essentials** button with `qwen2.5vl:3b` visible. |
| E | `assets/readme/04-first-ask.gif` | **GIF** | BPM (Track A) | `record-deck.ps1 -Seconds 10` → ffmpeg | 640 px wide, ≤ 3 MB | Type a question → send → reply streams in. The payoff shot; a still cannot convey that it works. |
| F | `assets/readme/05-main-tab-presets.png` | PNG | Gaming Mode (Track B) | `screenshot-deck.ps1 -Mode game` | 640×800 (QAM crop), ≤ 250 KB | Preset chip row + mode chip (Speed / Strategy / Expert). Optional — cut first if the budget is tight. |

**Total media budget: ≤ 8 MB.** GitHub serves README images through its own
proxy with no lazy-loading for GIFs; two 3 MB GIFs is already the practical
ceiling before the page feels slow on Deck-tethered mobile data.

### GIF vs PNG rule

Use a **GIF only when motion carries information a caption cannot** — navigation
paths (B) and streaming output (E). Everything else is PNG: static UI state that
the reader compares against their own screen is easier to read as a still, loads
faster, and stays legible when GitHub scales it down. Never animate a shot whose
whole point is "your screen should look like this".

### Conversion (does not exist yet — F7)

`record-deck` produces `.mkv`. Two-pass palette conversion on the PC, run from
the repo root after pulling the clip back:

```bash
ffmpeg -y -i recordings/clip.mkv -vf "fps=12,scale=640:-1:flags=lanczos,palettegen=stats_mode=diff" /tmp/pal.png
```

```bash
ffmpeg -y -i recordings/clip.mkv -i /tmp/pal.png -lavfi "fps=12,scale=640:-1:flags=lanczos,paletteuse=dither=bayer:bayer_scale=3" assets/readme/01-install-from-url.gif
```

12 fps and Bayer dithering are the trade that keeps a UI clip under 3 MB without
banding on the Deck's dark gradients. If a clip still exceeds budget, cut its
length before cutting frame rate — below ~10 fps QAM transitions read as broken.

### Maintainer capture checklist

Per [development.md § Test bonsAI after deploy](../development.md) — Track A is
BPM from Desktop Mode, Track B is Gaming Mode.

**Once, before the session**

- [ ] `.env` has `DECK_IP` / `DECK_USER` (both capture scripts hard-fail without them).
- [ ] `.\scripts\screenshot-deck.ps1 -InstallDeckHelper`
- [ ] `.\scripts\record-deck.ps1 -InstallDeckHelper`
- [ ] `ffmpeg` on PATH on the PC (conversion is PC-side, not Deck-side).
- [ ] Deploy the build the shots will depict: `.\scripts\build.ps1`. Confirm the About tab reads **0.5.0** — a version-mismatched hero is worse than a stale one.

**Track A — BPM, from Desktop Mode** → assets B, C, D, E

- [ ] Fully exit and relaunch Steam so the new bundle loads, then Steam → View → Big Picture Mode.
- [ ] Set Steam UI scale to its default before shooting — a non-default scale makes the screenshots not match the reader's screen.
- [ ] Open QAM (`...`) → Decky plug → bonsAI.
- [ ] **Before shot C:** clear any real LAN IP. Use `192.168.1.50` as the documented example so it matches the in-plugin copy at [pluginQuickStartInstructions.tsx:34](../../src/data/pluginQuickStartInstructions.tsx#L34).
- [ ] **Before shot E:** pick a question with a short answer. A 300-word reply cannot be shown in 10 seconds.
- [ ] `.\scripts\screenshot-deck.ps1 -Mode desktop` / `.\scripts\record-deck.ps1 -Mode desktop -Seconds 12`
- [ ] Check `plugin_ui=yes` in the `---RECORD_RESULT---` line — the scripts exit non-zero on a game-only capture, do not ship a clip that failed this.

**Track B — Gaming Mode** → assets A, F

- [ ] Return to Gaming Mode; launch a title whose art is unambiguous and safe to publish.
- [ ] QAM → Decky → bonsAI → Main tab with preset chips visible.
- [ ] `.\scripts\screenshot-deck.ps1 -Mode game`
- [ ] Confirm a contemporaneous PNG shows bonsAI chrome (the spike's parity requirement).

**After capture**

- [ ] Crop QAM-only shots to the overlay strip; downscale per the shot list.
- [ ] Scrub every frame for: real LAN IPs, Steam account name, friend list, library titles you would rather not publish.
- [ ] `du -sh assets/readme/` ≤ 8 MB.
- [ ] Build a release zip and run `scripts/verify-decky-plugin-zip.sh` on it; compare size against the previous release to confirm `assets/readme/` did not ship (F8). If it did, move the directory to `docs/assets/readme/`.

---

## 3. Tone and language rules

1. **Second person, present tense, imperative.** "Open the Quick Access Menu", not "The Quick Access Menu should be opened" or "we then navigate to".
2. **Define exactly three terms, inline, once each, at first use.** **QAM** ("Quick Access Menu — the `...` button overlay"), **Ollama** ("free app that runs AI models on your own hardware"), **LAN** ("your home network"). Bold the term, put the gloss in the same sentence, never in a table. Everything else — LLM, base URL, tag, inference, fallback — is either avoided or self-evident from context.
3. **No maintainer vocabulary in the visible body.** Banned: RPC, backend, service, sanitizer, policy tier, capability gate, mDNS, Avahi, FOSS-first, splice, corpus. Each is either a `Go deeper` link target or nothing.
4. **One idea per bullet, ≤ 18 words, no nesting.** The current "What you can do" bullets run 30–45 words with parenthetical asides; they are the single biggest source of the word overrun.
5. **Name the button the way the button is named.** Bold exact UI strings and copy them from source, not memory — **Where AI runs**, **Install Tier 1 essentials**, **Read game & screenshot context**, **Save files to Desktop**, **Voice input (microphone)**, **Steam ban lookup**.
6. **State failure modes as fixes, not warnings.** "If every Ask fails with a connection error, the address on the Ollama tab is wrong or empty" beats "note that an incorrect address may cause failures".
7. **Beta note: two sentences, ≤ 45 words, and every clause must be true today.** Proposed shape — *"bonsAI is beta. AI answers can be wrong, features may break when Steam or Decky updates, and power tips (TDP, GPU clock) are suggestions only — bonsAI never changes those settings for you. Check **QAM → Performance** yourself."* This drops the stale power-limit claim (F1), the spoiler/VAC hedges (edge cases, → troubleshooting), and the "Ollama on this Deck can tax the system" line (belongs in step 2, where the reader is choosing).
8. **No em-dash-stacked qualifiers and no "may be simplified later" / "planned for removal".** Roadmap hedging in the README is a signal to the reader that the docs are not maintained. Planned work lives in [roadmap.md](../roadmap.md); the README describes what ships.

---

## 4. Go deeper — link map

Ten lines, links only, no prose explanation beyond the one-line gloss. Anchors
verified against current heading text.

| Link | One-line gloss |
|---|---|
| [troubleshooting § Network](../troubleshooting.md#2-network--communication-the-bridge) | Ollama on a PC: `OLLAMA_HOST`, firewall, TCP 11434, `Failed to fetch`. |
| [troubleshooting § Screenshot vision](../troubleshooting.md#25-screenshot-vision-setup-v1) | Attaching screenshots to an Ask, and which models can read them. |
| [troubleshooting § Permissions tab](../troubleshooting.md#1a-permissions-tab-blocked-actions) | What each permission unlocks and what breaks when it is off. |
| [troubleshooting § Voice input](../troubleshooting.md#voice-input-speech-to-text) | Speech-to-text setup and whisper model install. |
| [troubleshooting § Knowledge base](../troubleshooting.md#knowledge-base-offline-strategy-cards) | Offline strategy cards — the user-facing KB doc (**not** `knowledge-base.md`, F6). |
| [troubleshooting § bonsai shortcut](../troubleshooting.md#5-bonsai-shortcut-setup) | Guide-button chord to open bonsAI without the QAM. |
| [troubleshooting § Uninstall vs Clear all data](../troubleshooting.md#1b-uninstall-vs-clear-all-data-settings) | Removing the plugin does not erase your settings. |
| [troubleshooting § UI scale](../troubleshooting.md#3b-ui-scale--qam-layout) | Text too small, or the Ask bar clipping off-screen. |
| [roadmap § Planned](../roadmap.md#planned) | What is being built next. |
| [CHANGELOG.md](../../CHANGELOG.md) | What changed in this release. |

Contributors block (collapsed) carries the remaining three:
[development.md](../development.md) (build, deploy, architecture),
[DOCUMENTATION_INDEX.md](../DOCUMENTATION_INDEX.md) (every other doc),
[knowledge-base.md](../knowledge-base.md) (offline RAG architecture — maintainers).

**One link per concept.** The current README links `troubleshooting.md` bare
seven times with no anchor (L20, L112, L114, L132, and inside three bullets); a
bare link to a 700-line document is not a funnel.

---

## 5. Do-not-duplicate matrix

| Topic | Owner | README may contain | README must not contain |
|---|---|---|---|
| First-time install | **README** | The whole flow, steps 1–4 | — |
| Network / LAN setup | [troubleshooting § 2](../troubleshooting.md#2-network--communication-the-bridge) | "Use `http://<PC-IP>:11434`" + link | `OLLAMA_HOST=0.0.0.0`, firewall rules, mDNS, Avahi service XML |
| Screenshot vision | [troubleshooting § 2.5](../troubleshooting.md#25-screenshot-vision-setup-v1) | One bullet: needs a vision model + a permission | Model capability matrix, attachment quality settings, failure table |
| Permissions detail | [troubleshooting § 1a](../troubleshooting.md#1a-permissions-tab-blocked-actions) | The four toggle names, one line | Per-toggle consequences, backend enforcement |
| Model policy tiers | troubleshooting (**new short section**) | One `Go deeper` line | The tier table (currently L122–132) |
| Input sanitization | [troubleshooting § Input sanitizer](../troubleshooting.md#input-sanitizer-ask-lane) | Nothing | `bonsai:disable-sanitize`, the whole L114–116 block |
| Magic Ask commands | troubleshooting | Nothing | The `bonsai:*` command list (L82) |
| Offline knowledge base | [troubleshooting § KB](../troubleshooting.md#knowledge-base-offline-strategy-cards) user / [knowledge-base.md](../knowledge-base.md) architecture | One bullet + link | Corpus phases, retrieval flow, manifest |
| Build / deploy | [development.md](../development.md) | One line in the collapsed block | Script names, `.env` keys, Track A/B |
| Doc inventory | [DOCUMENTATION_INDEX.md](../DOCUMENTATION_INDEX.md) | One link | The documentation table (L140–151) — it is a verbatim subset |
| Planned work | [roadmap.md](../roadmap.md) | One link | Feature-by-feature "planned" prose (L87–89), and every "may be removed later" aside |
| Terminology | [glossary.md](../glossary.md) | Three inline definitions (QAM, Ollama, LAN) | The glossary table (L22–32) |
| Release history | [CHANGELOG.md](../../CHANGELOG.md) | One link | Version notes |

Rule of thumb: **the README owns the happy path; every branch off it is a link.**
If a sentence begins "if that doesn't work" or "advanced:", it belongs elsewhere.

---

## 6. Shared copy with `pluginQuickStartInstructions.tsx`

**Recommendation: manual sync over a shared snippet, with the overlap deliberately
shrunk to three facts and marked in both files.**

Reasons, in order of weight:

1. The repo rule is **no new abstraction without 3+ call sites** ([CLAUDE.md](../../CLAUDE.md) § Refactor rules). There are two consumers: a GitHub-rendered Markdown file and a JSX tree with inline styles. They share no renderer, so a "shared snippet" means inventing a build step that emits both — real machinery for two consumers.
2. The two audiences want different copy anyway. The README teaches someone who has not installed the plugin; the modal talks to someone already inside it. Forcing identical wording makes both worse.
3. The actual failure this is meant to prevent is **drift on facts, not wording** — and F2 shows exactly that drift already happened (the TDP claim is stale in both files simultaneously).

**Shared facts — exactly three.** These must agree in substance, not phrasing:

| # | Fact | README | TSX |
|---|---|---|---|
| S1 | Set **Where AI runs** before anything else; if it is empty or wrong, every Ask fails with a connection error. | Step 2 | [:27-37](../../src/data/pluginQuickStartInstructions.tsx#L27) |
| S2 | The three Ask modes are **Speed / Strategy / Expert**; Strategy is the gameplay-coaching one. | "What else it does" | [:53-56](../../src/data/pluginQuickStartInstructions.tsx#L53) |
| S3 | TDP and GPU-clock output is **suggestion-only**; bonsAI does not apply power settings. Verify in QAM → Performance. | Beta note | [:65-68](../../src/data/pluginQuickStartInstructions.tsx#L65) — **currently wrong, F2** |

**Mechanism (cheap, greppable, no build step):**

- In README, one HTML comment above each shared claim: `<!-- sync: S1 — src/data/pluginQuickStartInstructions.tsx -->`. Invisible on GitHub, greppable in the repo.
- In the TSX module header, extend `Used for:` with a back-reference: `Shared facts S1–S3 with README.md § Install — change both.`
- Add the pairing to the review checklist so a PR touching either file is asked about the other.

**Rejected:** a Vitest assertion comparing strings across a `.md` and a `.tsx`. It
can only test exact substring equality, which forces the two audiences into
identical wording — the thing that makes the modal bad — and it breaks on
punctuation. Prose is not a good test subject.

---

## 7. Install and release hygiene

### Canonical repo — resolved 2026-08-14 (F3)

`cantcurecancer` was never a second repo — it is this account's **former** GitHub
username. `gh api user` confirms the account is `qd313` (id 17815999); GitHub's
rename redirect was the only reason `cantcurecancer/bonsAI` URLs still resolved.
`api.github.com/users/cantcurecancer` returns **404** — the name was unregistered
and claimable by anyone, which was a live risk: the RAG corpus manifest and the
Pull Models catalog overlay both fetched from that address at runtime, so
claiming it would have let a stranger control what those features served.

**Decision:** `qd313/bonsAI` is canonical, not the old name. All ~24 doc/code
references were swept to `qd313` (2026-08-14). `cantcurecancer` is being
registered on a throwaway account defensively, so it can't be claimed by someone
else — it is **not** being used as a repo name. The old recommendation on this
page (rename *to* `cantcurecancer`) is superseded; do not follow it.

Canonical install URL:

```
https://github.com/qd313/bonsAI/releases/latest/download/bonsAI.zip
```

Still worth confirming when this README rewrite happens: that the release asset
is actually named `bonsAI.zip` — `/latest/download/` 404s on a filename mismatch,
which reads to a new user as "the plugin is gone". Note `qd313/decky-plugin-studio`
(11 refs) is a **different, real** repo — do not sweep it.

### Hero asset versioning

**Recommendation: stable filename, versioned metadata.** Keep
`assets/readme/hero.png` (no version in the name) and record the version in three
places that cost nothing: the image alt text (`bonsAI v0.5.0 — Main tab …`), a
`assets/readme/MANIFEST.md` table (file, plugin version, capture date, Track A/B,
Steam UI scale), and the commit message.

Versioned filenames (`hero-v0.5.0.png`) were considered and rejected: every
version bump would rename a file and edit the README, and any external page or
forum post embedding the raw URL would break on each release.

**Staleness trigger, not a schedule:** re-shoot when the depicted surface changes,
not every release. A `MINOR` bump in `plugin.json` that touched the Main tab,
Ollama tab, or Permissions tab is the trigger. Practical hook: add a line to the
release checklist in [development.md](../development.md) asking "did any tab in
`assets/readme/MANIFEST.md` change since the last capture?" — cheaper and more
honest than wiring a version check into `sync-versions.mjs`, which cannot know
whether pixels changed.

---

## 8. Prioritized edit checklist

Two independent tracks. **Copy work needs no hardware; asset work needs a Deck.**
Copy items C1–C3 are correctness fixes that are worth landing on their own even
if the redesign stalls.

### Copy track

| ID | Item | ★ | Notes |
|---|---|---|---|
| **C1** | Resolve the repo name (§ 7), then fix README L12 to the single canonical zip URL. | ★ | **Blocking** — do first, it is a broken install link. Needs a maintainer decision, not effort. |
| **C2** | Delete the stale power-limit claims: README L5, L63, L80 **and** [pluginQuickStartInstructions.tsx:65-68](../../src/data/pluginQuickStartInstructions.tsx#L65). | ★ | Four edits, two languages. The TSX edit is the one that matters — it is shipping to users now (F1, F2). |
| **C3** | Cut removed-surface copy: Search intent packs (L57), Response verification (L74), the power-limit clause in L80. Fix the unbalanced parens on L14–15. | ★ | F4, F5, F9. |
| **C4** | Rewrite the beta note to the two-sentence form (§ 3.7). | ★ | Replaces L5 entirely. |
| **C5** | Relocate: model tiers table → troubleshooting (new short section); sanitization L114–116 → existing troubleshooting § Input sanitizer; where-Ollama-runs table L99–105 → troubleshooting § Network. | ★★ | Touches troubleshooting.md — additive sections only, not the wholesale rewrite that is out of scope. |
| **C6** | Restructure to the § 1 section map: four numbered steps, glossary table → three inline definitions, documentation table → one index link, build-from-source → collapsed `<details>`. | ★★★ | The main rewrite. Do after C1–C5 so it is a structural diff, not a structural-plus-correctness diff. |
| **C7** | Write the `Go deeper` block from the § 4 map and verify all ten anchors resolve on GitHub. | ★ | Anchor rot is silent; click every one after the first push. |
| **C8** | Add the `<!-- sync: S1–S3 -->` comments and the TSX header back-reference (§ 6). | ★ | Do in the same commit as C2 so the shared facts land correct and marked together. |
| **C9** | Add a one-line licence mention (F10) and confirm the About tab links match the canonical repo. | ★ | |
| **C10** | Update [DOCUMENTATION_INDEX.md](../DOCUMENTATION_INDEX.md) and [roadmap.md](../roadmap.md) if the redesign changes what README owns; close § 2 in [roadmap-planning-questions.md](roadmap-planning-questions.md). | ★ | Repo rule: roadmap and docs update in the same change set. |

**Copy track total: ★★★★ · ~10 edits across 4 files, no hardware.**

### Asset track

| ID | Item | ★ | Notes |
|---|---|---|---|
| **A1** | Create `assets/readme/` + `MANIFEST.md`; verify the release zip does not swallow it (F8). | ★ | Do first — it decides the final paths, and if the zip check fails everything relocates to `docs/assets/readme/`. |
| **A2** | Track A session: capture C, D (PNG) and B, E (MKV). | ★★ | One BPM session, ~30 min including staging a clean example IP and a short-answer prompt. |
| **A3** | Track B session: capture A (hero re-shoot) and F (presets). | ★★ | Needs Gaming Mode and a running game; the parity check applies. |
| **A4** | Convert B and E to GIF, crop and downscale all PNGs, verify ≤ 8 MB total. | ★★ | The ffmpeg step does not exist yet (F7) — first run includes writing it down in `MANIFEST.md` or a small script. |
| **A5** | Privacy scrub every frame; confirm no LAN IP, account name, or friend list is visible. | ★ | Cheap, and unrecoverable if skipped — these go on the public internet. |
| **A6** | Add the release-checklist line to [development.md](../development.md) for hero staleness (§ 7). | ★ | One line. |

**Asset track total: ★★★ · two Deck sessions plus conversion.**

### Suggested order

C1 → C2 → C3 (one commit each; all three are correctness and independently
shippable) → A1 → A2/A3 → A4/A5 → C4–C9 (the rewrite, now able to reference real
files) → C10 + A6.

The rewrite lands **after** capture on purpose: writing image references before
the images exist produces a README with broken embeds if the capture session
slips, and the exact shot content tends to change what the surrounding sentence
should say.

---

## 9. Out of scope, restated

- No README text written here — § 1 is a structure and a budget, not prose.
- No image files produced — § 2 is a shot list and a capture procedure.
- No wholesale rewrite of `troubleshooting.md` or `development.md`. C5 and A6 add
  short sections and one checklist line to those files; anything larger is
  separate work.
- The three relocation targets in C5 assume troubleshooting keeps its current
  structure. If it is restructured later, the § 4 anchors need re-verification.
