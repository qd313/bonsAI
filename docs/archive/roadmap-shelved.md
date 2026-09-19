# Roadmap: shelved entries

Work that is parked on purpose, not dropped and not finished. Each one was moved out of
[the roadmap](../roadmap.md) so the live lists stay short; the roadmap keeps a one-line pointer to each
under its **Shelved** heading, saying what unshelves it.

Nothing here is cancelled. When a shelved entry comes back, move the whole block back into Bugs or
Features at its star position and drop its line from the roadmap's Shelved list.

---

- ★ `[platform]` `[shelved]` **In-IDE preview never gets past its loading screen** *— **OPEN, shelved 2026-09-11
  (D93): not a gate for anything.** On the maintainer's machine the preview stops on its loading screen and never
  moves past it; its command channel takes commands but never answers, and it produced no screenshot. Sorted with
  the other tooling in plan 51's docs phase. It unshelves when the preview loads the plugin on the maintainer's
  machine. [Plan](../planning/51-refactor-round-two.md).*

- ★★ `[ui]` `[shelved]` **Glance view: the answer alone, in big text** *— **OPEN, shelved 2026-09-12: too much UI change, and
  we're not ready for it yet, in the maintainer's own words.** Opening the menu from the popup would have shown only the
  answer, large, with the chips, the question box and the tab bar out of the way, so a person opens, reads and closes in a
  couple of seconds; B would return to the full panel. The mockup and the press list are kept in
  [plan 52 § 6](../planning/52-frame-features-second-look.md#6-glance-view-the-brief-and-the-mockup) and the design handoff
  folder, for when it comes back. [Plan](../planning/49-steam-frame-features.md) ·
  [Drawing](https://claude.ai/code/artifact/c48fb3e2-38ef-4c91-997c-c515353eec96).*

- ★★★ `[KB]` `[shelved]` **KB download Cancel, the Deck check** *— **VERIFY, shelved 2026-09-19 (D113).** The
  Cancel button itself is unchanged — the maintainer's word was to keep it. Shipped 2026-08-05. The download
  finishes in about a second on device, too fast to ever press Cancel in, so the check has nothing to run
  against today. Row **KB-CANCEL-01**. Unshelves when a throttle or a slower test copy exists.*

- ★★★ `[voice]` `[shelved]` **Voices for the bundled characters** *— **OPEN, shelved 2026-09-08 (D74): possible, but a legal check first.** Each
  bundled character would get a voice invented once on the maintainer's PC with OmniVoice, shipped as a five to ten second clip and
  read on the device by a small copying model. Shelved because a voice is not covered by fair use, every character here is voiced by a
  real actor, and "free" is not a defence under the newer AI-voice laws. Unshelving needs the character sweep, a legal check, and the
  open licence call. [Memo](../planning/42-read-aloud-feasibility.md).*

- ★★★ `[voice]` `[shelved]` **Trained voices for the bundled characters** *— **OPEN, shelved with the clip route 2026-09-08 (D74).** The fallback
  if the copying model is too slow beside a game: a small trained voice file per character, about 60 MB, made once on the maintainer's
  PC from OmniVoice speech and downloaded on demand; the fastest way to read. Same legal gate as the clip route, plus the plugin
  hosting its own voice files for the first time. [Memo](../planning/42-read-aloud-feasibility.md).*

- ★★★★ `[voice]` `[shelved]` **A voice for a custom character** *— **OPEN, shelved with the bundled voices 2026-09-08 (D74).** Type a name, press
  **Generate voice**, wait minutes once while the device invents a voice; from then on the small copying model reads that character in
  it. Needs OmniVoice on the device as an optional download of about one gigabyte, with the warning "minutes on a Steam Deck, seconds
  on a stronger machine"; no LAN server. Phase 0 is a half-day Deck test of the port. Waits on the same legal gate as the bundled
  voices. [Memo](../planning/42-read-aloud-feasibility.md).*

- ★★★★★ `[platform]` `[shelved]` **Global quick-launch macro** *— **VERIFY, shelved 2026-09-19 (D113): the
  maintainer said drop it.** Guide-chord docs live in [troubleshooting.md](../troubleshooting.md) § 5; the
  checklist was never run on hardware. It never ran on real hardware and now never will. Unshelves only on
  the maintainer's own word.*
