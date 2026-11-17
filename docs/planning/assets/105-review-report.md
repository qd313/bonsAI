# Plan 105: the security and licence review, for you to read

Written 2026-11-17 by the chat that ran plan 105, from two read-only reviews of everything this session changed
(409 files, from the starting tip to `1b45aa04b`, the tip once every code change had landed). The security reviewer
and the licence reviewer each ran once (Sonnet, high effort). Their full answers are in plan 105, section 14.

**In short: nothing serious. Two two-star problems are worth fixing soon, and both are about downloads. Nothing
here has been fixed, waved away or filed in the roadmap. That waits for your answer.**

How to read an entry: the stars are the reviewer's own scale (one star is small, two is worth fixing soon, three
and up would be serious). "My check" is what I found when I read the code myself.

## The findings, most important first

### 1. Cancel does nothing while Ollama itself downloads (★★, security reviewer)
- **What you could notice:** you press Cancel (or Stop on the first-time setup card) while it says "Installing
  Ollama" or "Updating". The card says "Stopping", but the download goes on for up to 10 minutes. When it finishes,
  the run restarts the Deck's AI before it ends as "Stopped", which can cut off an answer that is being written.
- **Why:** the Ollama download is one long step that never checks for Cancel, and nothing checks for Cancel between
  that step and the restart. The first-time setup card says "Stop works at any moment", which is not true for that
  step.
- **Where:** the back end's Ollama install code (`local_ollama_setup_service.py`, the download step and the restart
  step).
- **Suggested fix:** make the download a step that can be stopped, as the voice engine's build already is; check for
  Cancel before the restart; until then, change the card's words.
- **My check:** confirmed. The gap is older than this session, but this session's new job card puts Cancel in front
  of people during exactly this step.

### 2. The voice engine's build fetches its tools without a check (★★ security reviewer, ★ licence reviewer)
- **What you could notice:** nothing. It matters because the voice engine is now part of the starter set on first
  setup, and is built for everyone who leaves the voice row ticked.
- **Why:** the build runs inside a pinned, known image (good). Inside it, it fetches a compiler from the image's
  package servers at whatever version they have that day. The program it builds is then run by the plugin. A
  tampered package could end up inside a program the plugin runs. Two Decks can also build slightly different engines.
- **Where:** the voice engine build (`voice_engine_build_service.py`), reached from the starter set's setup.
- **Suggested fix:** build from an image that already holds the compiler, pinned the same way; or pin the compiler's
  versions; or record a checksum of the built program and check it before first use.
- **My check:** confirmed. How likely any harm is, neither reviewer could tell.

### 3. Ollama's own download is not checked, and a cut-off download can leave it broken (★★, both reviewers)
- **What you could notice:** if the connection drops halfway (or the 10-minute limit hits) while Ollama updates,
  old and new files can be left mixed, and the Deck's AI may not start.
- **Why:** the Ollama file is fetched and unpacked straight over the old copy in one go, with no checksum and without
  stopping the unpack when the download fails part way.
- **Where:** the same Ollama install step as item 1.
- **Suggested fix:** check the download against the checksum Ollama publishes; unpack to a spare folder and swap it in
  only when the unpack worked.
- **My check:** confirmed. Older than this session. The new first-time screen now puts "ollama.com, about 1.5 GB" in
  front of every new person.

### 4. The licence file says nothing about the game characters or what is downloaded later (★★, licence reviewer)
- **What you could notice:** a reader of the licence file would not learn that the 31 characters' names belong to
  their games' owners, or that the plugin is not linked to them. Nor would they learn the licences of what it
  downloads when you ask (Ollama, the speech engine and models, the two starter models).
- **Why:** nothing ships in the zip that needs this, so it is a gap in what you tell people, not a legal breach.
- **Where:** the `NOTICE` file. The new document on who owns each character is not linked from it or the README.
- **Suggested fix:** two short paragraphs in `NOTICE`, one for each point.
- **My check:** confirmed (no such words in `NOTICE` or the README).

### 5. A Cancel that fails leaves the card stuck on "Stopping" (★★ licence reviewer, ★ security reviewer)
- **What you could notice:** if the Cancel request itself fails or times out, the card says "Stopping" for good while
  the job runs on, and pressing Cancel again does nothing.
- **Where:** the new job card (`runningJobs.ts`, `ollamaSetupJob.ts`), and the first-time setup card's Stop.
- **Suggested fix:** if the request fails, put Cancel back so it can be pressed again, and say so.
- **My check:** confirmed. This session's code.

### 6. A Stop at one moment after "Clear all data" leaves the Deck's AI switched off (★, security reviewer)
- **What you could notice:** after Clear all data, a Stop pressed at the wrong moment of the next setup leaves the
  Deck's AI not running until something starts it again.
- **Why:** the step that rebuilds Ollama's key files stops the AI first, then checks for Cancel.
- **My check:** confirmed. Older than this session (July).

### 7. Turning Internet downloads off does not stop a download already running (★, security reviewer)
- **What you could notice:** you turn the switch off during setup, and the downloads (including the long voice build)
  carry on.
- **Why:** the permission is checked once, when the run starts.
- **Suggested fix:** check it between steps, or have the switch cancel the run.
- **My check:** confirmed.

### 8. A made-up model name can pass the "open source only" setting (★, security reviewer)
- **What you could notice:** typing a name such as `someone/mistral:7b` into the custom download box labels it open
  source, because the part before the slash is ignored.
- **Suggested fix:** let the open-source list match only names with no part before the slash (Ollama's own library).
- **My check:** confirmed. The older family rules already worked this way; this session's new list copied it.

### 9. Search packs imported in an old version can no longer be removed (★, security reviewer)
- **What you could notice:** only someone who imported a settings-search pack in versions 0.4.6 to 0.4.9 (0.6.0 had no
  import screen). Their pack still loads, and nothing can remove it except Clear all data.
- **Suggested fix:** drop imported packs once, on load; or leave it.
- **My check:** confirmed. The 0.4 versions had the import screen; this session removed the unused remove code.

### 10. The download sites shown may not be complete (★, licence reviewer; the security reviewer could not tell)
- **What you could notice:** the first-time checklist's voice row says its build "fetches compilers from its own
  package servers" without naming them; the job card names only Ollama's two sites even during a full setup. Some
  downloads may also be handed on to other sites (a download network), which neither reviewer could check.
- **Suggested fix:** name the voice build's package servers; add "and the sites they hand off to".
- **My check:** the unnamed package servers are confirmed; the hand-offs I could not tell.

### 11. Two release months in the new models list are not real release months (★, licence reviewer)
- **What you could notice:** the bigger models list sorts newest first, so a wrong month moves a row.
- **Where:** `gemma4:26b` borrows its month from the other Gemma 4 rows (the sources file says so; the list does not);
  `gemma3:270m` shows July 2025, and the reviewer remembers August.
- **My check:** the borrowed month is confirmed; July or August for `gemma3:270m` I could not tell.

### 12. Anyone who picked a chip or answer animation now gets the new one (★, licence reviewer)
- **What you could notice:** someone who had set static chips or turned the letter scramble off on the Developer tab
  now gets decoding chips and scrambled answers. Reduced motion and a running game still turn the effects off.
- **Suggested fix:** one line in the changelog.
- **My check:** confirmed, and chosen on purpose in this plan (Decode as the default). The changelog line is the open part.

### 13. The characters document does not cover the small character pictures (★, licence reviewer)
- **What you could notice:** nothing on the Deck. The document covers voices only; the small emblems that still ship
  (a letter, a prop and a colour per character) are not reviewed in it.
- **Suggested fix:** one sentence on what ships now, and one saying the emblems were not reviewed.
- **My check:** confirmed.

### 14. The Deck test script that places a chat can lose a chat made at the same moment (★, security reviewer)
- **What you could notice:** only during a test run: a chat made on the Deck while the script runs could drop off the
  chat list.
- **My check:** confirmed in reading. It is a test tool, used only by the Deck drivers.

## What the reviewers looked at and found fine
- **The Internet downloads switch** on the first-time screen starts as the saved permission (off on a new install);
  only your press turns it on; a failed save puts it back; the parental lock blocks it; OK stays grey until it is on.
  "Not now" and B download nothing.
- **The checklist** names each download with its size and site, the totals add up (6.9 GB with everything, 5.8 GB with
  the least), the note-search model can be unticked, and the speech models and voice engine untick together. A part
  left out stays out, and is offered again (asking first) where its feature is first used.
- **The back end** checks the permission and the parental lock on every start, including the voice install.
- **The speech models** are pinned and checked by size and checksum; a Stop removes a half-written file. The voice
  build's Stop removes its container.
- **The bigger models list:** all 22 new rows' licences match their sources; open-weight rows are dimmed, never hidden,
  never called "FOSS"; rows can only download their own name, and only when you pick them.
- **The Deck test scripts** cannot be made to run anything on the Deck or the PC by a crafted chat or answer.
- **What was deleted** (the old avatars, the unused pack manager) leaves nothing calling into it.
- **Old settings files** with the removed keys, or with nonsense values, still load safely.
- **No new package or licence** entered the build.

One thing a reviewer raised that I checked and found right: the starter-set box counts Ollama's size only when it is
the follow-up of Install Ollama, which is when Ollama is downloaded too.

## What I need from you
For each entry: fix now, file for later, or leave as it is. Items 1, 2 and 5 are the ones I would fix first. Until you
answer, nothing here is changed, and the final report does not call the session ready to push.
