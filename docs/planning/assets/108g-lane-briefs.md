# Plan 108g: the briefs (wake-word listening)

How a brief is assembled: the session hands each helper [108-helper-rules.md](108-helper-rules.md) (it keeps plan
105's and 106's rules), the section below with its letter, the tip hash, the absolute path of its own copy of the
repo, and the plan id (108g). A section says: what a player sees today, where it comes from, what to build, the files
owned, the tests, and the check that proves it. Evidence files are named `plan108g-<ROW>.json` by the driver, never by
a helper. The plan is [108g-wake-word-listening.md](../108g-wake-word-listening.md).

**Line numbers are as read at tip `28306e896` on 2026-11-19 by one reader, not yet spot-checked by a second; the
session re-checks every section against the tip at go.** A lane that finds a line has moved re-greps and says so; a
lane that finds its brief wrong says so and stops rather than building the brief's mistake.

## Rules special to plan 108g (on top of the shared page)

1. **Sound is never written to disk and never logged.** Not a recording, not a clip "for debugging", not a
   transcript in a log line. Logs carry counts, durations and state names. A test proves it: after a full listen and
   one wake, the settings folder holds no new file except a pid file (the tone's two files live in the plugin's
   runtime folder, `decky.DECKY_PLUGIN_RUNTIME_DIR`).
2. **Nothing listens unless three things are true at that moment:** `capability_enabled(settings,
   "microphone_access")`, the Kids lock state has been reported by the screen in this back-end session and is off,
   and a listening time is running. Check all three at start and again on every wake.
3. **The back end stays standard library only** (checked 2026-11-19: the only outside import in `main.py` and
   `py_modules/` is a lazy `PIL` in `py_modules/backend/media/screenshot_media.py`). The wake engine is a separate
   program the plugin starts and stops; it is never imported into the plugin's process.
4. **No back-end-to-screen events.** `@decky/api` exports `addEventListener`, but the plugin uses none (grep at the
   tip). The screen polls, as everywhere else (AGENTS.md, "How the two sides talk").
5. **New back-end method names carry the word the area already uses** so the generated map files them with the
   voice methods: every one starts `..._voice_wake_...` (list in lane D1).
6. **Model and effort per lane** are on each title line and in the plan's § 5. Pass both by hand on every start.
7. **Step 0 changes no shipped behaviour.** Lane T writes scripts only. Nothing under `py_modules/` or `src/` changes
   before the go.

## Facts every lane can lean on (read at the tip)

**Capturing sound** (`py_modules/backend/voice/voice_audio_capture_service.py`)
- `_resolve_capture_command(settings_dir)` (183-220) returns the command, a backend name and the environment. On the
  Deck it is `pw-record --rate 16000 --channels 1 --format s16 --raw -` with `--target <mic>` (187-206); fallbacks
  `parecord`, `arecord` (207-216).
- The microphone is found by name: the first source whose name holds `Internal_Mic` (132-160, match at 153).
- The session's sound socket is found by `env_for_audio_capture()` (116-129) and `_discover_session_runtime_dir()`
  (80-113). Call them again at every start; never cache the result (a restarted session moves it).
- **A pretend microphone for tests exists.** A file named `voice_capture_target` in the plugin's settings folder,
  holding a source name, replaces the microphone (167-180, used at 185-206; test
  `tests/test_voice_capture_target_override.py`). This is how recorded sentences were played to the plugin in
  October (`workshop:test-evidence/plan86-B5-SETUP-try2.json`: `pactl load-module module-null-sink sink_name=<name>`,
  write `<name>.monitor` into the file, `paplay --device=<name> <wav>`).
- `_pcm_rms(chunk)` (40-50) is pure Python. `audioop` no longer exists on the Deck's Python (3.14).

**Speech or quiet** (`py_modules/backend/voice/voice_level_gate.py`): `VoiceLevelGate` (84-151) learns the
microphone's resting level over about 40 s and calls a 64 ms slice voiced above three times that floor, never above
120 and never below 50 (constants 49-69). `observe(chunk)` 105, `window_voiced(pcm)` 114, `speech_rms(pcm)` 119,
`trim_trailing_silence(pcm)` 133. The Deck's own microphone is quiet: speech peaks at about 150 to 250 (file header).

**The recording session** (`py_modules/backend/voice/voice_transcription_service.py`): `VoiceTranscriptionSession`
(347). It opens its own capture process (531-538), keeps the whole recording up to `MAX_RECORDING_SECONDS = 120`
(205), reads it once at the end (`_finish_recording`, 720-751), and holds the shared engine as `"mic"`
(527; released once, 452-461). It ends only on Stop, Ask, the cap, or the capture process ending; there is no
end-on-silence. Its reader reports an error only when no chunk ever arrived (592-599): a stream that opens and then
delivers silence looks like a quiet room.

**The shared speech engine** (`py_modules/backend/voice/voice_whisper_daemon.py`): one `whisper-server` on
`127.0.0.1:18765` (60-62), started with `-t 4` (341; `WHISPER_THREADS = 4` at `voice_whisper_runtime.py:61`).
`acquire(reason, model_path, ...)` (252-321) counts holders by reason. **The first holder decides the model: a second
reason asking for a different model gets False and must use the one-off `whisper-cli` path** (302-309).
`release(reason)` 384-399. `force_stop()` (401-404) clears every holder; `main.py:2275-2283` calls it whenever the
mic is torn down. `transcribe(pcm)` returns "" when busy or not ready (406-430).
`tests/test_voice_whisper_daemon.py:73-226` already exercises a second reason named `"wake"`.

**Reading words** (`py_modules/backend/voice/voice_transcript_decode_service.py`): `_run_whisper_transcribe` 102,
`_whisper_decode_usable(text, rms)` 66, `_normalize_whisper_word` 55, `WHISPER_FILLER_WORDS` 36 and
`FILLER_MIN_RMS = 875.0` 34 (whisper invents short words on noise).

**Installing the engine** (`voice_engine_build_service.py`, `voice_model_download_service.py`, `voice_rpc.py`): the
speech programs are compiled in a podman container from a digest-pinned image (60-63), kept by name (163-172),
staged and swapped (`voice_engine_swap.py`), recorded with checksums (`voice_engine_record.py`), and proven by one
real read before they are trusted (`_whisper_inference_ok`, 100-143). Models are pinned to a commit
(`voice_model_download_service.py:60-61`) and checked (`_check_downloaded_model`, 290). Every download is gated on
the internet-downloads permission (`voice_rpc.py:88-99`) and stoppable (`voice_stoppable_run.py`). Every site is named
on screen (`src/features/downloads/downloadSites.ts:28-30, 73`) and
`tests/test_download_sites_match_backend.py` keeps the two lists equal.

**Permissions and the Kids lock** (`py_modules/backend/core/capabilities.py`): `CAPABILITY_KEYS` 70;
`capability_enabled` 135 (the Kids lock is checked first); `legacy_grandfather_capabilities` 115 (a new key not named
there would be switched ON for old installs). The lock is a module flag (88-98), reset to off at every back-end start
(`main.py:353`) and set only by the screen through `set_kids_lock_state` (`main.py:1034-1041`). **The screen pushes
it from a React hook that is mounted only while the panel is open** (`src/features/permissions/useKidsLock.ts:71`,
mounted at `src/index.tsx:375`). `subscribeSteamParental` (`src/features/permissions/steamParental.ts:83`) is a plain
function and can be called outside React.

**The back end's lifecycle** (`main.py`): voice state 296-301; `_main` 350-364; `_unload` 412-428; the settings save
stops the mic when the microphone permission goes off (859-864); `clear_plugin_data` 887;
`_stop_voice_transcription_internal` 2275-2283; the voice methods 2285-2311. A method the screen can call is any
`async def` indented four spaces in `class Plugin`.

**Asking** (`main.py:1639`, `py_modules/backend/ask/ask_payload.py:96`): the Ask needs an address unless it is a
local command (1663-1668), answers `busy` while another runs (1716-1730), and files the question into the chat named
by `chat_slot_id`. **The address for a PC's AI and the open chat's id live in the browser's storage**
(`src/shared/storageKeys.ts:27` and `:58`; readers in `src/features/plugin-shell/pluginStorage.ts:49-56` and `:84`).
The address rule is `ollamaLocalOnDeck ? "127.0.0.1:11434" : savedIp`
(`src/features/ai-connection/useOllamaConnectionState.ts:68-71`,
`src/features/settings/bonsaiSettingsSchema.ts:296`). The mode is the saved setting `ask_mode`. The payload's exact
shape is at `src/features/ask/flow/useBonsaiAskOrchestration.ts:1225-1281`.

**After the panel closes** (`src/features/ask/flow/bonsaiAskCompletionWatch.ts`): `startAskCompletionWatch()` (89-94)
polls at module scope and survives the panel unmounting; `handleAskTerminalForToast`
(`src/features/answer/notices/bonsaiReplyReadyToast.ts:50-85`) shows the answer's first lines, or "Reply ready" /
"Tap to open" (64-65). `showPhaseToast` (`bonsaiPhaseToast.ts:23`) replaces the previous notice. The plugin's
load-time code is the `definePlugin(() => { ... })` block (`src/index.tsx:1221-1234`; `onDismount() {}` is empty at
1232). Whether the Main tab is on screen is the module flag `isReplySurfaceVisible()`
(`src/features/answer/notices/bonsaiReplySurface.ts:26`, fed from `src/index.tsx:229`).

**Sleep and wake:** `SteamClient.System.RegisterForOnSuspendRequest` and `RegisterForOnResumeFromSuspend` exist in
the installed types (`node_modules/@decky/ui/dist/globals/steam-client/system/index.d.ts:43-44`). The plugin uses
neither today (grep at the tip).

**What a setting costs:** one true/false setting touched 11 files (`dev_preload_ask_model`: `main.py`,
`py_modules/backend/settings/settings_service.py` with its `_SIMPLE_FIELDS` row at 383,
`src/features/settings/bonsaiSettingsNormalizers.ts`, `bonsaiSettingsSchema.ts`, `settingsPayload.ts`,
`usePluginSettings.ts` with `SETTINGS_FIELD_BACKEND_KEY` at 130, two settings tests, the two contract files in
`tests/contracts/`, and its own test) before any screen row. `microphone_access` appears in 45 files.

## What was read on the Deck (read-only, 2026-11-19; nothing was changed)

- 8 processor threads ("AMD Custom APU 0932"), 15.1 GB of memory, SteamOS 3.9.5 build 20261023.100, about 717 GB free
  on `/home`.
- Decky's own Python is 3.14 (`/tmp/_MEI*/libpython3.14.so.1.0`); the system's is 3.14 too (`/usr/lib/python3.14`).
  Neither has numpy or an ONNX runtime.
- Sound: one microphone source, `alsa_loopback_device.alsa_input.pci-0000_04_00.5-platform-nau8821-max.HiFi__Internal_Mic__source`
  (float32le, 2 channels, 48000 Hz); two outputs, `...HiFi__Speaker__sink` and `...HiFi__Headphones__sink`. All
  were SUSPENDED (nothing was playing).
- Present: `pw-record`, `pw-play`, `pw-cat`, `pw-loopback`, `pw-top`, `paplay`, `parecord`, `arecord`, `pactl`,
  `wpctl`, `podman`, `mangohud`, `mangoapp`. Present as files, not tried:
  `/usr/lib/pipewire-0.3/libpipewire-module-echo-cancel.so` and `/usr/lib/spa-0.2/aec/libspa-aec-webrtc.so`.
- The plugin's voice folder: `voice_bin` holds `whisper-cli` (976 KB), `whisper-server` (1.3 MB), the four
  libraries, the engine record and the CPU-safe marker; `voice_models` holds `ggml-base.en.bin` (148 MB) and
  `ggml-tiny.en.bin` (78 MB). The words `--vad` and `vad-model` are inside `whisper-cli` (a text search of the file;
  the option was not run).
- Battery: `/sys/class/power_supply/BAT1/` has `current_now`, `voltage_now`, `capacity`, `status`. There is no
  `power_now`; watts are current times voltage. It was on the charger.

## Outside facts (each with its address; none confirmed on the Deck yet)

| Engine | What was found | Address | Standing |
|---|---|---|---|
| sherpa-onnx keyword spotting | Listens for phrases given in a text file (tokens per line, a boost score after `:`, a trigger threshold after `#`); no training to change the phrase. Other projects report the small English model needs a boost score to hear uncommon words | https://k2-fsa.github.io/sherpa/onnx/kws/index.html | **First choice to test.** Not yet confirmed here |
| its code and its English model (`sherpa-onnx-kws-zipformer-gigaspeech-3.3M-2024-01-01`) | Code and model both published as Apache-2.0 (seen on mirrors, not on the project's own licence file). The model is English only and has 3.3 million parameters | https://github.com/k2-fsa/sherpa-onnx , https://huggingface.co/openEuler/sherpa-kws | For the open-source reviewer |
| GigaSpeech, the recordings that model learned from | Access terms: non-commercial research and education. The data card says a model's licence is separate and that its owners take no responsibility for it | https://huggingface.co/datasets/speechcolab/gigaspeech | **The licence question, call g7** |
| its Python packages | Wheels for Python 3.14 on x86-64 Linux are reported for the 1.13 series, as two packages (`sherpa-onnx-core` with the libraries, `sherpa-onnx` with the bindings). Whether numpy is needed was not found | https://pypi.org/project/sherpa-onnx | Not yet confirmed here; step 0 tries it |
| openWakeWord | Code Apache-2.0. Ready-made models are CC BY-NC-SA 4.0, and none says "bonsai". A custom word means training on synthetic speech plus background sets, some non-commercial | https://huggingface.co/davidscripka/openwakeword | Out unless the maintainer wants to own a training pipeline (call g7 c) |
| microWakeWord | A training framework for microcontrollers; a Python reader exists (`pymicro-wakeword`, TensorFlow Lite). Needs a trained model per word. Licence not found | https://pypi.org/project/pymicro-wakeword/ | Out for the same reason |
| pocketsphinx keyphrase | Any phrase from a pronouncing dictionary, no training, one threshold per phrase; its own guide says three or four beats work best and short phrases confuse easily. Licence not found by this search | https://cmusphinx.github.io/wiki/tutoriallm | Not tested; a last resort |
| whisper.cpp's speech detector | `whisper-cli --vad --vad-model <file>`; the detector models are published for it (`ggml-silero-v5.1.2.bin`, a v6.2.0 also named). Licence of those files not found by this search | https://huggingface.co/ggml-org/whisper-vad | **The fallback.** The option's words are in the Deck's built program |
| Porcupine | Needs an account key and contacts its maker's server (the study, § 2.2; not re-checked) | workshop plan 10 | Out |

Measured on this Deck earlier, not outside: one whisper read with a game running took 1.90 to 2.16 s on tiny.en and
4.14 to 4.22 s on base.en (2026-10-10, `docs/archive/roadmap-done-v0.5.0.md:163`), and a pass costs the same however
short the clip (workshop plan 88, "Why").

---

# Step 0

## T — The test kit (★★ `[QA]` `[voice]`, Sonnet high)

**What a player sees today.** Nothing; there is no listener.

**What to build.** New files only, under `scripts/wake_bench/`. Each opens with the house header. You never run
anything against the Deck; the driver does.

1. `make_clips.ps1` and `make_clips.py`: build the first set of word recordings on this PC with Windows' own speech
   voices: both phrases ("bonsai", "hey bonsai"), every installed English voice, three speeds, each followed by a
   short question and 1.5 s of silence, 16 kHz mono 16-bit WAV, into a scratch folder the session names. Forty clips.
   (Synthetic voices are only a first sieve. The maintainer's forty recordings are test Z5.)
2. `run_engine.py`: plays a WAV through one engine as a stream of 4096-byte chunks, exactly as the plugin would feed
   it, and prints one JSON line per wake with its time. Two engines behind one small function each:
   - `sherpa_kws`: the keyword spotter through the `sherpa_onnx` Python package, imported lazily; the keywords file
     and model folder are arguments. Print the package version and the model's file checksums.
   - `whisper_gate`: the plugin's own pieces, imported from `py_modules` with the same path set-up as
     `scripts/run_python_tests.py`: `VoiceLevelGate` decides when the last 2 s are worth a read; the read is
     `whisper-cli` with tiny.en, with and without `--vad`, at 1, 2 and 4 threads; the text is matched against a word
     list read from a file.
   It reports: clips heard out of clips played; wrong wakes per hour; seconds of work per second of sound; peak
   memory.
3. `whisper_spelling.py`: runs `whisper-cli` on each word clip and writes the exact text it returns to a JSON file.
   That file becomes the word list lane C matches against. It is measured, never guessed.
4. `deck_cost.py`: standard library only, runs under the Deck's `/usr/bin/python3`. Given process ids, it samples
   `/proc/<pid>/stat` and `/proc/<pid>/status` once a second and `/sys/class/power_supply/BAT1/current_now` and
   `voltage_now` every five seconds, for a given time, and prints averages as JSON: share of one core, memory, watts.
5. `listen_probe.py`: a stand-in listener for the Deck, before any plugin code exists. It starts the capture exactly
   as the plugin does (`_resolve_capture_command`), feeds the chosen engine, plays a short tone with `pw-play` on a
   wake, and prints one line per wake. `--seconds N`. It writes no sound anywhere.

**Files owned:** `scripts/wake_bench/**`, `tests/test_wake_bench_counting.py`. Nothing else.

**Tests.** Unit tests for the counting and the word match only (a fake engine). **Proof for your report:** run
`run_engine.py` on this PC for both engines over the forty clips and one hour of the session's talk file; paste the
table.

## Z — The step 0 runbook (the session writes the block files from this; the Deck driver runs them)

Order: the open-source reviewer answers call g7 first. Then Z1 on this PC, Z1 on the Deck, Z6, Z2, Z4, Z7, then the
maintainer's Z3 and Z5. One evidence file per test: `plan108g-Z1-ENGINES.json` … `plan108g-Z8-ECHO.json`.

**Sound files (never committed, never copied into the repo or the workshop):** the forty word clips from lane T; two
hours of talk without the word: ninety minutes of public-domain audiobook reading plus thirty minutes recorded from a
talkative game's own sound on the Deck (the driver records the speaker output with `pw-record`, the same `--target
<sink> -P "{ stream.capture.sink=true }"` form the capture code uses at
`voice_audio_capture_service.py:199-203`).

**Getting the engine onto the Deck for the test:** try in this order and write down which worked, because that
decides lane A. (1) The two Python packages for 3.14, unpacked into `/tmp/p108g/` and run under `/usr/bin/python3`
with `PYTHONPATH`. (2) The project's ready-made Linux programs from its release page. (3) If neither starts, say so:
the engine would need a container build like the speech reader's, which adds a lane. Everything goes in `/tmp/p108g/`
and is removed at the end; nothing is installed.

| Test | Steps | Record |
|---|---|---|
| Z1 | `run_engine.py` for each engine, each phrase, over the forty clips and the two hours. On the PC, then on the Deck. Also `whisper_spelling.py` on the Deck | Heard of 40; wrong wakes; work per second of sound; memory; the spellings file |
| Z2 | Unload the Deck's AI. Start a game into live play. `listen_probe.py` off, then on, ten minutes each: once in a quiet room, once with the game's sound on the speakers. Read the frame rate off Steam's performance overlay 12 times per state (a screenshot every 5 s); try `mangoapp`'s own log first and use it if it works. `deck_cost.py` on the probe's process ids | Mean frame rate per state; share of one core; memory |
| Z3 (the maintainer unplugs the Deck) | Home screen, no game, AI unloaded. `deck_cost.py` ten minutes with the probe off, ten with it on | Watts, both states |
| Z4 | Play the thirty-minute game-sound file twice through the Deck's speakers at half volume (`pw-play`) while the probe listens on the real microphone. Then one hour of the audiobook file from a speaker across the room | Wrong wakes per hour; for each, what whisper wrote for the clip (to judge the second check) |
| Z5 (the maintainer speaks) | Twenty times in a quiet room, twenty with game sound, each phrase, at arm's length. The probe prints the time of each wake | Heard of 20, four times; time from the end of the word to the tone |
| Z6 | With the probe running: a second `pw-record` for ten seconds while a clip plays into the pretend microphone; then the plugin's own mic button with the probe running. By hand: Steam's own voice test | Whether both recordings hold the whole sentence |
| Z7 | `deck_sleepAndWake` five times with the probe running | Whether it wakes to the word within 10 s; what processes are left |
| Z8, only if Z4 fails on speakers | Load the echo-cancel module for the probe's own stream (one `pw-cli`/`pactl` load, removed after) and repeat Z4's speaker half | Wrong wakes; the maintainer's ear on the game's sound |

Also try once, expecting "no": a small mark drawn through Decky's whole-screen hook (`routerHook.addGlobalComponent`)
with a game in front; say in the report whether it shows.

**The lines** are the plan's § 5 and are not changed after a test has run. The report says go or no-go per test, then
overall, in plain words.

## Mock-up board 7: three tabs (★ each, Opus at medium or high by the house rule of 2026-11-19, Fable if the maintainer asks; built to the rules in the board's own brief)

Board 7 belongs to plans 108a to 108g; the main session numbers the files. Rules as in plan 107's mock-up brief
(`107-mockup-briefs.md` in this folder, "Rules for every helper"): true size, real words copied from the code,
each option a card with Like / Not this, pressable where the choice is about behaviour.

### Tab "g-switch": where the switch lives and what the warning says (call g3)

- **Facts.** The Voice input section: `src/features/voice/VoiceInputSettingsSection.tsx` (the "STT model" row at 346,
  "Install voice engine" / "Reinstall voice engine" at 332-333, "Enable Voice input (microphone) in the Permissions
  tab first." at 271). The microphone permission's words: "Voice input (microphone)" and "Speak your question. Audio
  stays on this Deck, never saved." (`src/features/permissions/PermissionsTab.tsx:78-82`). The Kids lock banner:
  `PermissionsTab.tsx:90-92`. The study's draft warning: workshop plan 10, lines 509-521.
- **Options.** Today (no such switch) · A: a row under Voice input, "Listen for the wake word", with a warning box on
  the first press · B: a sixth permission in Permissions with the same warning · two wordings of the warning: the
  study's, cut to what fits the box, and a shorter plain one. Each warning must say: the microphone stays open; sound
  stays on the Deck; the question's text goes to your AI, which may be a PC on your network; it can wake by mistake,
  also in voice chat; it uses some battery; headphones help.
- **Cost to state.** A: about 18 files less than B (B is the 45-file permission path). Both add one D-pad stop.

### Tab "g-sign": how you can tell it is listening, and for how long (call g2)

- **Facts.** The mic button's labels: `src/features/ask/bar/MainTabUnifiedAskBar.tsx:792-796`. The chat's name bar:
  `src/features/chats/title/ChatTitleView.tsx`. Nothing of ours can be drawn over a game.
- **Options.** A: a listening time you start (drawn: the choice of 15 minutes, 1 hour, "until the Deck sleeps",
  which is 8 hours at most; a
  small mark beside the chat's name and a tint on the mic button while it runs; a notice when it starts and when it
  ends) · B: always on from start-up (drawn: the same mark; a notice each time the Deck starts) · C: A now, B later.
  Make A pressable: start, see the mark, let a short pretend time run out, see the ending notice.
- **Cost to state.** A needs no saved setting. B needs one (about 18 files), the Kids lock watch running from
  start-up, and a plan of its own.

### Tab "g-wake": what happens when it hears you, and how you stop it (call g4)

- **Facts.** Today's notices: `src/features/answer/notices/bonsaiReplyReadyToast.ts:64-65` ("Reply ready" / "Tap to
  open", or the answer's first lines), "Ask failed" at 79. A notice is Steam's own small card; it cannot take the
  D-pad while a game is in front.
- **Options, drawn as a strip of moments over a stand-in game picture:** A: tone only, then the answer notice · B:
  tone, then one notice "Asked: <the heard words>", then the answer notice · C: tone, a "Listening…" notice, then
  "Asked: …", then the answer. For cancel, show each: tap the notice; say "never mind"; open the panel and press the
  mic button. Also draw the two failures: "Didn't catch a question." and "bonsAI is still answering. Ask again when
  it is done."
- **Cost to state.** Each extra notice is one more card over the game. Cancel by voice costs nothing extra (the
  question is read anyway).

---

# The build (only after a go)

## A — The engine's set-up (★★★ `[voice]`, Sonnet high; the security reviewer and the open-source reviewer read it before it lands)

**What a player sees today.** "Install voice engine" under Voice input fetches the speech programs and a speech
model, behind the internet-downloads permission, with every site named and a Cancel that works.

**What to build.** The session fills in which delivery step 0 proved (packages, ready-made programs, or a container
build) and the exact versions and checksums. If the fallback engine won, this lane shrinks to item 6.

1. New `py_modules/backend/voice/wake_engine_install.py`: fetch the engine's files into `<settings>/wake_bin/` and
   its model into `<settings>/wake_models/`. Every file is pinned to an exact version and a SHA-256 written in the
   code; a file that does not match is deleted and the install fails with a plain line. Copy the patterns, do not
   import private helpers across files unless they are already shared: staging then swap
   (`voice_engine_swap.py`), the record of what was installed (`voice_engine_record.py`), the stoppable run
   (`voice_stoppable_run.py`), the download itself (`voice_model_download_service.py:168-305`).
2. A self-test before trust, like `_whisper_inference_ok` (`voice_engine_build_service.py:100-143`): start the
   engine, feed one second of silence, expect a clean exit and no wake. A crash (the Deck's processor refusing an
   instruction) marks the engine "not usable on this Deck"; it never raises into the plugin.
3. `wake_engine_ready(plugin_root, settings_dir) -> dict` with `ready`, `engine_changed`, `reason`.
4. Methods on `class Plugin` (bodies in `py_modules/backend/voice/wake_rpc.py`, which lane D1 creates; land after
   D1 or hand D1 your three functions): `install_voice_wake_engine()`, `cancel_voice_wake_install()`,
   `get_voice_wake_engine_status()`. Gates in this order: microphone permission (`voice_rpc.py:57-65`), internet
   downloads (`voice_rpc.py:88-99`, checked again inside the lock), not already running.
5. Name every new site in `src/features/downloads/downloadSites.ts` and keep
   `tests/test_download_sites_match_backend.py` equal.
6. Fallback engine only: one more model file (the speech detector's), pinned and checked the same way, from the site
   the speech models already use.

**Files owned:** `wake_engine_install.py`, `tests/test_wake_engine_install.py`, the two download-sites files. **Not
yours:** `voice_engine_build_service.py`, `voice_model_download_service.py`, `main.py` (lane D1's).

**Tests.** A wrong checksum deletes the file and fails; Cancel mid-download leaves no partial file and no staging
folder; a failed self-test leaves the old engine as it was; downloads off refuses before any network call; the sites
lists match. Break the checksum check on purpose once, see the test fail, name it in the commit. Search `tests/` for
anything that patches `urlopen` or `subprocess` in the files you copy patterns from.

**Your report names** every host contacted, every file fetched with its size and checksum, what is executed, and what
is left on disk after a stop, a failure and a success.

**The check:** P108G-LISTEN-01 cannot run without it; its own proof is the security reviewer's read plus a real
install in the phase 1 Deck block.

## B — The listener (★★★ `[voice]`, Sonnet high; security reviewer before landing)

**What a player sees today.** Nothing listens.

**What to build.** New `py_modules/backend/voice/wake_listener.py`, `wake_engine.py`, `wake_tone.py`.

1. `WakeListener(plugin_root, settings_dir, logger, on_wake, mic_busy)`. `start(seconds)` opens the capture with
   `_resolve_capture_command(settings_dir)` (so the pretend microphone works), starts one reader thread
   (`bonsai-wake-capture`) and the engine. `stop(reason)` ends the thread, the capture process and the engine, and is
   safe to call twice. `status()` returns a copy under a lock.
2. States: `off`, `starting`, `listening`, `hearing`, `reading`, `paused`, `error`. `status()` carries `state`,
   `ends_in_seconds`, `wakes`, `false_starts`, `stop_reason`, `error`. No words: the heard question is held by
   lane D1's code, never by the listener.
3. A ring of the last 3.0 s of sound (96,000 bytes), in memory only, overwritten as sound arrives.
4. `VoiceLevelGate.observe` on every chunk. The engine is fed only while a voiced slice was seen in the last second,
   starting with the last half second from the ring, so a quiet room costs almost nothing.
5. `wake_engine.py`: three plain functions around the engine step 0 picked (`start_engine`, `feed`, `stop_engine`)
   and a reader for its output. The engine is a child process with its own pid file, reaped at the next start if a
   crash left it behind (pattern: `voice_whisper_daemon.py:84-146`). One engine only; no plug-in layer.
6. On a wake: ignored unless the state is `listening`; ignored for 2.0 s after a question ended; otherwise play the
   tone, set `hearing`, and hand the stream to the recorder lane C builds (`on_wake` gets the ring's content, then
   every later chunk goes to the recorder until it says it is finished). Then the ring is emptied and listening
   resumes.
7. `mic_busy()` is asked once a second. While it is true the listener is `paused`: per step 0's Z6 result it either
   stops feeding the engine, or closes its capture and reopens it afterwards.
8. The time limit: at `ends_in_seconds == 0` the listener stops itself with reason `time`.
9. A capture process that ends, or delivers no chunk for 5 s, is an `error` with a plain line, never a silent quiet
   room.
10. `wake_tone.py`: `play_tone("heard" | "gave_up")` writes two short WAVs once (0.15 s, two notes, generated with
    `wave` and `math`) into the plugin's runtime folder and plays one with `pw-play`, falling back to `paplay`, using
    `env_for_audio_capture()`. It never blocks the reader thread.

**Files owned:** the three new files, `tests/test_wake_listener.py`, `tests/test_wake_engine.py`,
`tests/test_wake_tone.py`. **Not yours:** every existing voice file (import from them; change none), `main.py`.

**Tests** (fake capture process, fake engine): one wake calls `on_wake` once; a wake while `hearing` is ignored; a
wake 1 s after a question ended is ignored and one 3 s after is not; the ring never passes 3 s; the time limit stops
the capture and the engine; `stop()` twice is safe and leaves no thread and no child; a dead capture is an error; the
settings folder gains no file but the pid file (rule 1). Break the "ignored while hearing" guard on purpose once and
name the failing test in the commit. `tests/test_seam_contracts.py`: add nothing unless you change a frozen name;
do not let `voice_whisper_runtime.py` import your files (its loop test, 154-180).

**The check:** P108G-LISTEN-02, -03 (with lane C), -05 (with lane D1).

## C — The question's end (★★★ `[voice]`, Sonnet high)

**What a player sees today.** A recording ends only at Stop, Ask or two minutes.

**What to build.** New `py_modules/backend/voice/wake_question_recorder.py`.

1. `WakeQuestionRecorder(gate, seed_pcm, max_seconds=15.0, start_wait_seconds=4.0, end_pause_seconds=1.5)`.
   `feed(chunk)` returns `waiting`, `recording`, `done` or `gave_up`. It is `done` when speech has been heard and
   then 1.5 s passes with no voiced slice, or at 15 s of sound after the wake; `gave_up` when no voiced slice arrives
   in the first 4 s. `seed_pcm` (the listener's ring) is kept at the front, so words said straight after the wake
   word are not lost.
2. `read(plugin_root, settings_dir, model_id, logger) -> str`: one read of the whole clip with the person's chosen
   speech model, after `trim_trailing_silence`. Hold the shared engine as `"wake"` for this one read
   (`acquire`/`release`, released exactly once, also on an error: pattern at
   `voice_transcription_service.py:452-461`); when `acquire` answers False, or `transcribe` returns "", use
   `_run_whisper_transcribe`. Judge the text with `_whisper_decode_usable` and the gate's `speech_rms`. The sound is
   dropped as soon as the read returns.
3. `split_wake_word(text, spellings) -> (heard_word, question)`. `spellings` is the list measured in step 0
   (`whisper_spelling.py`'s file, copied into a constant with the evidence file named beside it). The word must be at
   the start. When it is not there, `heard_word` is False: the wake counts as a false start and nothing is asked.
   **If step 0 showed whisper writes the word recognisably in fewer than 36 of the 40 clips, this second check is
   left out and your task text says so.**
4. `is_cancel(question) -> bool`: the whole question is "never mind", "cancel" or "stop" (only if call g4 kept
   cancel by voice).

**Files owned:** the new file, `tests/test_wake_question_recorder.py`.

**Tests.** A pause ends it; the cap ends it; silence gives up; the seed is kept; a filler-only read returns "";
the word is cut from the front; no word at the front means not asked; the engine is released once on success, on an
empty read and on an exception; nothing is written to disk. Both directions for the "word at the start" guard.

**The check:** P108G-LISTEN-01, -03; P108G-QUIET-03.

## D1 — The calls and the stops (★★★ `[voice]` `[perms]`, Sonnet high; security reviewer before landing; after B and C)

**What to build.**

1. New `py_modules/backend/voice/wake_rpc.py` (the shape of `voice_rpc.py`), and on `class Plugin` in `main.py`,
   beside the voice methods (2285-2311), each a one-line hand-off:
   - `start_voice_wake_listening(minutes: int = 10)`: refuses with a plain `reason` unless the microphone permission
     is on, the Kids lock state has been reported this session and is off, the wake engine and the speech engine are
     ready, and no listen is already running. `minutes` is clamped to 1 to 480 ("until the Deck sleeps" is sent as
     480). Returns at once; the capture starts on a thread.
   - `stop_voice_wake_listening()`, `get_voice_wake_status()`, `cancel_voice_wake_question()` (drops the question
     being heard or read; nothing is kept; a `gave_up` tone).
   - `take_voice_wake_question()`: returns `{id, question}` once, then `{}` until the next question.
2. "Reported this session": in `py_modules/backend/core/capabilities.py`, a second module flag set by
   `mark_kids_lock_reported()` and read by `kids_lock_reported()`; `set_kids_lock_state` (`main.py:1034`) sets it;
   `_main` (`main.py:353`) clears it. `capability_enabled` is not changed.
3. The stops, each ending listening within a second and leaving no child process: `_unload` (`main.py:412`, before
   the mic teardown); the settings save when the microphone permission goes off (`main.py:859-864`); the Kids lock
   coming on (`main.py:1034-1041`); `clear_plugin_data` (`main.py:887`; also remove `wake_bin` and `wake_models`,
   the way the voice folders are handled there).
4. `mic_busy` for lane B: true while `self._voice_session` exists and is recording or finishing.
5. When a wake's question is ready: check rule 2's three conditions again; if any fails, drop it.
6. `get_voice_wake_status()` adds two fields to the listener's own: `question_ready` (true from the moment a
   question was read until it is taken or cancelled) and `last_question` (the text, for the Developer tab's line).
   `last_question` is emptied at a cancel, at the next wake, when listening ends, and 60 s after it was read,
   whichever comes first.

**Files owned:** `wake_rpc.py`, `main.py`, `capabilities.py`, `tests/test_wake_rpc.py`,
`tests/test_kids_lock_reported.py`. The generated `src/types/rpcMethods.ts` is rewritten by the commit; never edit it
by hand. Run `npm run mcp:validate`.

**Tests.** Each refusal, with its words; a start before the lock was reported is refused; each of the four stops;
`take` returns a question once; a question is dropped when the permission went off while it was being read; a second
start while one runs is refused. Search `tests/` for `set_kids_lock_state`, `_stop_voice_transcription_internal` and
`clear_plugin_data` and run those files too.

**The check:** P108G-LISTEN-04, -05.

## D2 — The Kids lock watch and the test button (★★ `[perms]` `[ui]`, Sonnet high; after D1)

**What to build.**

1. New `src/features/permissions/kidsLockWatch.ts`: `startKidsLockWatch()` subscribes with `subscribeSteamParental`
   at plugin load and pushes `set_kids_lock_state` with the same latch as `useKidsLock.ts` (unknown means unlocked
   unless a lock was already seen; only an explicit "unlocked" clears it; a failed push is retried once). Move the
   latch into one plain function both use, so there is one rule. Call `startKidsLockWatch()` in the `definePlugin`
   block (`src/index.tsx:1221`) and its unsubscribe in `onDismount` (1232). `useKidsLock` keeps working as it does.
2. On the Developer tab, with the existing row helpers (`src/features/developer/developerRows.tsx:79, 111`): a button
   "Listen for the wake word for 10 minutes (test)" that turns into "Stop listening", and a line under it: "Off",
   "Listening, 8 min left", "Heard: <the question>", or the refusal's reason. It polls `get_voice_wake_status` once a
   second only while that tab is mounted and a listen is running. All calls through `callDeckyWithTimeout`.

**Files owned:** `kidsLockWatch.ts` and its test, `useKidsLock.ts` (the latch move only), the `definePlugin` block of
`src/index.tsx`, the developer rows file you add the row to, its test.

**Tests.** The watch pushes on change with the panel never mounted; unknown never unlocks a seen lock; the button's
three states; no polling when off. A button added to an existing section needs no new focus wiring (AGENTS.md); prove
it with a D-pad walk test of that section, and name the Deck row.

**The check:** P108G-LISTEN-01 to -05 are run from this button; P108G-KIDS-LOCK-01.

## E — The watcher that asks (★★★ `[voice]` `[ask]`, Sonnet high; security reviewer before landing; after D2)

**What a player sees today.** A question is only ever sent by the Ask bar.

**What to build.** New `src/features/voice/wake/wakeAskWatch.ts` and `wakeNotices.ts`, plain modules, no React.

1. `startWakeAskWatch()` / `stopWakeAskWatch()`, the same counter pattern as `bonsaiAskCompletionWatch.ts:35-99`.
   It polls `get_voice_wake_status` every 500 ms while the last answer said a listen is running, and not at all
   otherwise. Whoever starts a listen calls `startWakeAskWatch()`; the `definePlugin` block calls it once at load, in
   case the screen side reloaded under a running listen.
2. When the status says a question is ready: `take_voice_wake_question()`; ignore an id already handled.
3. **bonsAI's panel is open** (its screen code is mounted): do not send. Add a small subscribe to
   `src/features/voice/useVoiceAskInput.ts`; while that hook is mounted it is registered, and it writes the question
   into the question box with its own `setUnifiedInputFromVoice` (111-124). A registered subscriber is how the
   watcher knows the panel is open. The person presses Ask. Confirm first that the hook is mounted on every tab,
   not only on Main; if it is not, or if the write needs a change inside `useBonsaiAskOrchestration.ts`, stop and
   report.
4. **Otherwise (the panel is closed)** build the same payload the Ask bar sends (`useBonsaiAskOrchestration.ts:1225-1281`): `question`;
   `PcIp` by the rule at `useOllamaConnectionState.ts:68-71` (settings from `load_settings`, the saved address from
   `loadSavedIp()`); `appId` and `appName` from `Router.MainRunningApp` (as `useVoiceTranscription.ts:81-90` reads
   it); `ask_mode` from the settings; `spoiler_consent: false`; `attachments: []`; `chat_slot_id` from
   `pluginStorage.ts:84` when there is one. Send with `callDeckyWithTimeout("start_background_game_ai", [payload])`.
   Accepted: `startAskCompletionWatch()`. `busy`: the notice "bonsAI is still answering. Ask again when it is done."
   and nothing is retried. `invalid` or `blocked`: a notice with the response's own words.
5. `wakeNotices.ts`: the notices call g4 picked, through `showPhaseToast`. The "Asked: …" notice shows at most 80
   characters of the question. A tap on a notice shown while the question is still being heard or read calls
   `cancel_voice_wake_question`.

**Files owned:** the two new files and their tests, `useVoiceAskInput.ts` (the subscribe only) and one new test
beside it, the `definePlugin` block of `src/index.tsx` (after D2 has landed).

**Tests** (the Decky stand-in in `src/test-harness/`). The payload equals a fixture with the Ask bar's field names;
nothing is sent while the panel is open, and the box gets the text; one question is sent once when the status
repeats; `busy` shows its notice and sends nothing more; the watch stops polling when listening ends; no chat id
still sends. `src/features/ask/` has a hook-order contract (`tests/contracts/ask-hook-order.json`): you add no hook
there.

**The check:** P108G-QUIET-01 to -05.

## F — The switch, the warning, the mark, the listening time (★★★ `[ui]` `[voice]`, Opus extra-high; after the picks for g2 and g3, and after a Deck measurement of the Voice input section)

**The drawing is the design.** Build what was picked on board 7 (tabs "g-switch" and "g-sign"), at the sizes drawn;
measure the drawing itself. Where this brief and the drawing disagree, the drawing wins and your report says so.

**What to build, if the picks are the recommended ones** (a row under Voice input; a listening time you start):

1. A row in the Voice input section: "Listen for the wake word", a choice of length, Start and Stop. No saved
   setting: the chosen length and "the warning was accepted" are browser-storage keys in `src/shared/storageKeys.ts`,
   so a cleared browser store shows the warning again. `VoiceInputSettingsSection.tsx` is 468 lines; put the row in
   its own file.
2. The warning box before the first Start, with the picked words; "No" leaves it off.
3. With the microphone permission off: the row says why and offers the way to Permissions, with the existing jump
   (`src/features/permissions/permissionDeepLink.ts`). With the engine missing: the row offers the set-up through the
   existing download notice.
4. The mark while a listen runs, where the drawing puts it, and a notice when a listen starts and when it ends.
5. The row in the Search tab's settings list (`src/features/search-tab/bonsaiSettingsIndex.ts`).
6. The D-pad routes written into `docs/focus-graph.md`.

If g3 picked a sixth permission, the session splits this lane: the permission's plumbing first (Sonnet high;
`CAPABILITY_KEYS`, an explicit `False` in `legacy_grandfather_capabilities`, both contract files, an old settings
file still loading), then the screen.

**Tests.** The walk of the section with the new row, modelling Steam's scroll, no stop visited twice; the warning's
two answers; the three row states; an old settings file loads with listening off.

**The check:** P108G-SWITCH-01 to -04, QA-FREE-PLAY-01, QA-LOOK-01 on both screens.

## G — Sleep and speakers (★★ `[voice]`, Sonnet high; after F)

1. In the `definePlugin` block: register `SteamClient.System.RegisterForOnSuspendRequest` to call
   `stop_voice_wake_listening`, and `RegisterForOnResumeFromSuspend` to do what Z7 decided (by default: nothing but a
   notice, "Listening ended when the Deck went to sleep."). Unregister both in `onDismount`. Guard for the functions
   being absent.
2. If call g5 chose "pause on speakers": in the listener's once-a-second check, read `pactl list sinks short` with
   the capture environment; while a sink whose name holds `Speaker` is `RUNNING`, the state is `paused` with the
   reason `speakers`. If no sink name holds `Speaker`, the rule does nothing and the status says so. The row from
   lane F says "Paused while sound is on the speakers."

**Files owned:** the `definePlugin` block, `wake_listener.py` (item 2 only), their tests.
**The check:** P108G-SLEEP-01, P108G-SPEAKERS-01.

## H — The words (★ `[docs]`, Sonnet medium)

README's voice part and `docs/troubleshooting.md`: what the wake word cannot promise, from the study's list (workshop
plan 10, lines 651-672), rewritten in plain words and corrected for what was built. The row's help text. Not the
roadmap, the testing files or the changelog (the bookkeeper's).

---

## The bookkeeper's paperwork

- **At go:** D145's g-calls as answered, in the house shape. The roadmap entry gains the step 0 date.
- **After step 0:** the entry's status line says go or no-go with the numbers and their evidence files. One stale
  line to fix while there: `docs/testing.md:293` still says "A live recording round-trip on-Deck is still
  unverified"; row P86-VOICE-01 passed on 2026-10-16 (`docs/archive/testing-closed-2026.md:858`), so the line should
  say what is still owed is the maintainer's own voice.
- **As each phase lands:** its rows from the plan's § 6 as open rows in `docs/testing.md`; the hand checks in
  `docs/testing-manual.md` and on the "checks only you can do" page. The entry reads PARTIAL from phase 1 and moves
  to Verify, with its rows named, when phase 3 lands.
- **Headset mode's entry:** its "waits on" line is updated when phase 3 lands; nothing else about it changes.

## The reviewers' questions

**Security (Sonnet high; lanes A, B, D1, D2, E, then the whole feature against call g8).**
1. Can any sound, or any heard word, reach a file, a log line or another machine, other than the question's text
   going to the AI the person chose?
2. Can listening start, or keep running, with the microphone permission off, under the Kids lock, before the lock
   was reported, after the plugin unloaded, or past its time? Name the line that stops each.
3. Can a child process (capture, engine, tone) outlive the plugin, or be started twice?
4. What does lane A fetch, from where, pinned how, and what runs? What is on disk after a stop, a failure, a
   success?
5. Can a notice, a status reply or the Developer tab leak a question that was cancelled?
6. Can sound played by the Deck itself (a game, a video) make bonsAI ask a question nobody asked, and what bounds it?

**Open-source (Sonnet high; call g7 and lane A).**
1. The engine's code licence, read from its own licence file.
2. The model file's stated licence, and the terms of the recordings it learned from. Is shipping a download of that
   model consistent with the plugin's "open source only" stance? Say yes, no, or "only with this notice".
3. Every transitive piece lane A fetches (the runtime library the engine needs), with its licence.
4. If the answer to 2 is no: is the fallback (the speech reader plus its detector model) clean?
