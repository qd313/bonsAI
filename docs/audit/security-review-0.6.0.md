# Security review for 0.6.0

Dated 2026-09-28. A dated record, not a living doc. Asked for by the maintainer ("start the security review"),
as plan 71, Stage E: a review of everything changed since 0.4.9 (about 1,900 commits; 104 Python and 348
screen-side files changed), because a lot of new network and download code came with the knowledge library
and voice.

**How it was done.** Three reviewers read the code, each covering one part: (1) everything that reaches the
internet or the home network; (2) what bonsAI does on the Deck itself: commands, files, and whether each
permission switch is really enforced; (3) the screen, and what text bonsAI did not write (answers, wiki
notes, downloaded lists) can make it do. They only read and reported. Every finding below was then checked
against the code by the session, and one fix was also tried on the Deck.

## In plain words

- **Nothing lets someone on the internet reach or take over the Deck.** No tracking, usage reporting or
  crash reporting exists anywhere in the code.
- **Eight findings, all small.** The most serious is rated two stars out of six. Two of them were found by
  two reviewers each (pictures in answers, and read aloud), so there were ten reports in all.
- **Five are being fixed before the release** (the last call is Friday 2 October). The other three are
  on the roadmap for after it.
- **The README's internet list needed corrections**, now made. One gap, pictures inside answers, is
  closed by fix 1.

**Status, 2026-09-28 00:50: the five "fix before release" findings are fixed and landed on experimental**
(`52688e65` pictures, `5ecdb221` library removal, `7e8bde91` read aloud, `8a312e2b` the leftover route,
`162d613b` the network search), each with a test that fails on the old code; all six checks pass. Left out of
fix 4 on purpose: limiting attachments to Steam's screenshot folders (the permission check alone closes the
route). The other three are on the roadmap.

## The findings, sorted

The release line (plan 71 § 5): a bug blocks the release if a new player, using bonsAI normally, would
hit it and it traps them, loses their things, leaks something private, breaks the first ten minutes, or
looks plainly broken. Anything else is fixed if there is room before the last call, or waits.

| # | What could happen | Stars | Who could cause it | Decision |
|---|---|---|---|---|
| 1 | A picture written into an answer is loaded from any website the moment the answer is drawn, with no press. That tells the site the Deck's address, and possibly words from the question. | ★★ | A tricked AI model (for example by text in a note it was given), or a fake "Ollama" on the home network | **Fix before release.** It breaks the README's promise about what leaves the Deck. |
| 2 | "Remove knowledge library" deletes whatever folder it has been told the library is in, and the check lets that be the whole home folder or a whole SD card. | ★★ | Only a program already running inside Steam's screen; the screen itself offers only two fixed folders | **Fix before release.** Never hit in normal use, but it would be catastrophic, and the guard is a few lines. |
| 3 | Read aloud passes a sentence that starts with a dash to the speech program as an instruction. It could make it read a file aloud instead of the answer. | ★ | Answer text | **Fix before release.** A one-word fix, tried on the Deck on 2026-09-28. |
| 4 | A leftover route can read a picture file and send it to an address even with the screenshot permission off or the parental lock on. | ★★ | Only a program already running inside Steam's screen | **Fix before release.** A small check. |
| 5 | "Find on network" can be made to loop forever by one crafted reply from anyone on the same Wi-Fi, until the Deck runs out of memory. | ★★ | Anyone on the home network, while the button is pressed | **Fix before release.** Cheap. The button is hidden with the Developer tab for 0.6.0, so a player cannot reach it anyway. |
| 6 | Replies from the Ollama address have no size limit, so a fake Ollama can fill the Deck's memory. | ★ | A fake Ollama the user pointed bonsAI at | **After the release.** It touches twelve places, including how answers stream in; too much change for this week.**Fixed in plan 77 (`96f7d896`); Deck check owed (row P77-OLLAMA-SIZE-LIMITS).** |
| 7 | An address typed as https is quietly sent as plain http, so the questions travel unencrypted. | ★ | Anyone on the network path, for the few users with Ollama behind an https server | **After the release.** Needs a call first: support https, or refuse it and say so. |
| 8 | The speech model for voice input is downloaded from a changing address and used without checking it is the expected file. | ★ | Whoever controls that download page | **After the release.** Pin the address and check the file; the other downloads are already checked. |

## The detail, for whoever fixes these

1. **Pictures.** `src/components/MainTabBonsaiAiMarkdownChunk.tsx`: `buildMdComponents` has no `img` entry,
   so react-markdown draws a real `<img>` with its default http/https filter. All three `ReactMarkdown`
   calls use the builder, so spoiler bodies are affected too. Fix: an `img` entry that shows only the
   description text. Found by reviewers 1 and 3.
2. **Library removal.** `knowledge_base_schema.is_allowed_corpus_install_path` accepts the home folder and
   `/run/media/<user>` themselves (`relative_to` on the same path succeeds). `rag_corpus_download_service.
   remove_corpus_at_path` then runs `shutil.rmtree`. The folder comes from the `rag_corpus_path` setting,
   which `save_settings` takes from the screen with only a `..` check. Fix: refuse those roots and a card's
   root, and delete a whole folder only when it is the standard `.bonsai/rag` layout.
3. **Read aloud.** `voice_read_aloud_service.py`: `["espeak-ng", …, "-w", path, sentence]` with no `--`.
   Tried on the Deck: with `--`, a sentence `-f/etc/hostname is a test` is spoken as text (exit 0); without
   it, espeak reads the file named. Found by reviewers 2 and 3.
4. **Leftover route.** `main.py` `ask_ollama` is callable from the screen; `ollama_ask_service.run_ask_ollama`
   prepares attachments without `capability_enabled(settings, "media_library_access")`. Only
   `game_ai_request.run_game_ai_request` checks it. Fix: refuse attachments there when the permission is off.
5. **Network search loop.** `ollama_mdns_discovery_service._decode_dns_name` follows compression pointers
   with no hop limit and no "must point backwards" rule. The RPC's timeout cannot stop the worker thread.
   Fix: bound the hops and the name length, and refuse forward pointers.
6. **Reply size.** Bare `resp.read()` in `ollama_health_probe.py`, `local_ollama_setup_service.py`,
   `token_accounting_service.py`, `response_verify.py`, `ollama_embed_service.py`, `ollama_preload_service.py`
   and the error body in `ollama_chat_stream.py`; the stream's `pending += chunk` grows without a newline.
   Suggested: one capped read helper and a per-line and per-answer cap in the stream.
7. **https downgrade.** `ollama_urls.normalize_ollama_base` always returns `http://host:port`.
8. **Speech model.** `voice_model_download_service.VOICE_STT_MODEL_SPECS` points at the moving `main` branch
   of the whisper.cpp Hugging Face repository, with no checksum. Suggested: pin to a commit, add a SHA-256
   check and a size cap. Related and smaller: the knowledge library's list of files is trusted on HTTPS
   alone, and a list that leaves out the checksums is accepted without a check.

## Checked and found sound

- **No admin rights on a Deck.** The plugin runs as the normal user; no sudo runs on a Deck and no sudoers
  rule is installed (one sudo branch exists for Linux PCs whose system folders are already writable).
- **Every permission switch is enforced where the work happens**, not only on screen: saving to the
  Desktop, the microphone, the Steam ban lookup, internet downloads, and game logs. The parental lock
  turns them all off, downloads included. The downloads switch is checked before each download starts; it
  does not stop one already running.
- **Files.** Chat and note file names cannot escape their folders; nothing loads pickle, yaml or `eval`;
  "Clear all data" deletes fixed folders the screen cannot change.
- **The Steam key** goes only to Valve, over HTTPS; it is left out of every log and never sent to the AI.
  It sits in the plugin's settings file as plain text, like every other setting.
- **Downloads.** TLS checking is never turned off; the certificate fallback retries only against the
  Deck's own certificate list, still fully checked. The voice engine image is pinned; the knowledge
  library's pieces are checked against their SHA-256; the recommended-models list is size-capped and
  checked field by field; Ollama checks its own model files. Model names cannot reach a shell or a path.
- **Answer text cannot act by itself.** No raw HTML is drawn; steam://, file:// and javascript: links are
  blanked; a link opens only on a tap; the power suggestion is shown as text and never applied; typed
  commands run only on an exact whole-line match; choice chips can never equal a typed command; settings
  jumps use a fixed table.
- **Browser storage** holds no key or other secret.

## Everything that connects outside the Deck

This is what the README's list is built from.

**Internet**
- **ollama.com** (the program itself is served from GitHub): installing or updating Ollama on the Deck.
  Needs *Internet downloads* and *Run AI on this Deck*.
- **Ollama's model library** (registry.ollama.ai and its storage): looking up and downloading models,
  including the note-search model. Same two switches.
- **GitHub** (raw.githubusercontent.com): the recommended-models list, at most weekly when the models
  screen opens. Same two switches.
- **Hugging Face, then GitHub as a fallback**: the knowledge library. Needs *Internet downloads*. The
  library's own file list names where its pieces come from (today those same two).
- **GitHub's container registry** (ghcr.io): the voice engine, pinned. **Ubuntu's software servers**, from
  inside the build step, which installs the tools needed to build the engine for the Deck's chip.
  **Hugging Face**: the speech model. All need *Internet downloads* and the microphone switch.
- **Valve** (api.steampowered.com): the Steam ban lookup. Needs the *Steam ban lookup* switch and the
  user's own key.
- **Pictures in answers**: any address, with no switch. Closed by fix 1.
- **Only on a tap**: the About tab's GitHub, PayPal and Ollama pages, and links inside answers.

**Home network**
- **The user's Ollama**, at the address they chose, over plain http: every question, Stop, the
  connection test, model lists and note search.
- **Find on network** (hidden for 0.6.0): a network-wide announcement, then a check of each Ollama found.

**Never leaves the Deck**
- An Ollama started by bonsAI listens only on the Deck itself; so does the speech engine.
