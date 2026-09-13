# 42 — Reading answers aloud on the Deck: can it be done? (Sept 2026)

Written 2026-09-05, before any code. The fourth of the six features the maintainer asked to have planned
one at a time. This one is a memo, not a build plan: the roadmap has carried "Local reply TTS" at five stars
for months with no engine chosen and nobody having checked what can speak on a Deck at all. This memo checks.
The decisions are **D74** in [maintainer-decisions-locked.md](../audit/maintainer-decisions-locked.md).
Nothing in § 8 starts until they are answered and the Deck rows in § 7 have run.

Read first: [CLAUDE.md](../../CLAUDE.md); the model and effort table in [AGENTS.md](../../AGENTS.md) § 3;
[38-toast-answer-lines.md](38-toast-answer-lines.md), because reading aloud and the toast preview share one
text helper; [10-wake-word-listening-feasibility.md](10-wake-word-listening-feasibility.md) for the shape of
a feasibility memo in this repo and for what the microphone work learned about the Deck's sound system.

**One sentence:** press a button under an answer and the Deck reads it out loud, with the menu open or
closed, with no internet and nothing sent anywhere; press again to stop.

**The short answer:** yes, and more cheaply than the five stars suggest. The Deck already has a voice
(SteamOS added one for its screen reader in June 2025), the plugin already knows how to reach the Deck's
sound system from its background program, and a natural-sounding voice is one download of about 90 MB.
What is not known is how fast a natural voice runs on the Deck's chip beside a game, and that is a
measurement, not a guess. § 7 is that measurement.

---

## 1. What is true right now (checked 2026-09-05)

- **The plugin never makes a sound.** It listens (voice input through a local speech-to-text engine) but
  has no code that plays audio, on the screen side or in the background program. Nothing to reuse for
  playback; two hard things to reuse from listening, below.
- **The listening code already solves the two hard problems reading aloud needs.** First, the plugin's
  background program runs as root outside the person's Steam session, and the Deck's sound system lives
  inside that session. The microphone code finds the session's sound socket by reading the environment of
  a running Steam process and points its recorder at it. Playback needs exactly the same trick with the
  matching player program, which ships in the same system package as the recorder. Second, the Deck has
  no package manager, so the listening engine is installed by a download-and-smoke-test flow with a
  progress state the Settings tab shows. A speech engine installs the same way.
- **The lesson from that install.** The first version copied a ready-made program onto the Deck and it
  crashed with an illegal-instruction error, because it was built for newer chips than the Deck's. The fix
  was to build it on the Deck. Any speech program this memo proposes must pass the same test on the device
  before it is trusted: run once, produce sound, no crash. The whisper follow-up notes are in
  [voice-input-follow-up.md](../archive/voice-input-follow-up.md).
- **The AI model cannot speak.** Ollama runs text models only. Speech output has been requested since
  2024 and is still open; a 2025 request was closed into the older one. The Deck's Gemma 4 can hear, not
  talk. So a second, small program does the speaking, whatever the model.
- **The Deck already has a voice.** SteamOS 3.7.13, June 2025, added the Orca screen reader and the
  espeak-ng speech program to the system so that Steam's own screen reader (Settings → Accessibility) can
  talk. It is the classic robotic voice. It is on every up-to-date Deck with no download at all. Steam's
  screen reader itself only reads whatever control has focus, so it cannot be asked to read an answer; but
  the speech program it brought along can be run directly.
- **Other plugins play sound in gaming mode.** Game Theme Music plays music from the plugin's screen code
  with the browser's ordinary audio player, and it keeps playing when the menu closes. Audio Loader swaps
  Steam's own interface sounds. So the screen side is a proven fallback door if the background one fails.
- **The plugin is Apache 2.0**, and its model licence tiers (open source only, by default) are a real
  constraint on what gets bundled. The speech programs below are graded against that.
- **Answer lengths, for how long a read takes.** Speed answers are capped near 600 words, Strategy near
  1,200. Spoken at a normal pace that is up to four and eight minutes. A typical Balanced answer is one to
  two minutes.

## 2. What a person gets

**Phase 1, read aloud.**

- A **Read aloud** button under the answer. Press it and the Deck starts speaking within about a second,
  because the first sentence is made and played while the rest is still being made. Press again, or ask a
  new question, and it stops.
- Close the menu and it keeps reading, so a person can go back to the game and listen. Opening the menu
  shows the Stop button.
- It reads what is on screen, and only that: hidden spoiler blocks are left out (§ 5), formatting is not
  read as symbols, the branch menu of a Strategy answer is not read.
- A Settings choice, **Voice replies**, with three positions (the maintainer's call, D99, 2026-09-12): **Off**,
  the default, reads only on a press of the button; **When I asked by voice** reads out, on its own, any
  answer to a question that came in through the mic, and leaves typed questions alone; **Always** reads
  every answer out on its own. "On its own" means as soon as the answer finishes, menu open or closed.
  That is the in-game case the toast preview in plan 38 serves for short answers; reading serves it for
  long ones. (This replaced D74's single on/off switch, which only covered the menu-closed case.)
- One voice in Phase 1: the Deck's own, which works the moment the plugin is installed (the maintainer's
  call, D74). The natural voice, a one-time download of about 90 MB from the Settings tab the way the
  listening engine installs today, moves to Phase 2 with the character voices.

**Phase 2, a voice per character.** The natural voice download, and then, when an AI character is selected,
a voice that fits the character: a stock voice with the right regional sound, or an invented voice made
once from a description or a short recording (§ 6). Never a copy of a real person's voice without their
consent; that is the whole legal gate.

## 3. What can speak on the Deck: the options

Sizes are the download. Speed guesses are for the Deck's chip and are guesses until § 7 runs; the one
published measurement per engine is quoted so the guess is not bare. Licence classes use the plugin's own
words: open source means an OSI licence.

| Option | Where it comes from | Download | How it sounds | Speed on the Deck (guess) | Licence | Verdict |
|---|---|---|---|---|---|---|
| **A. The Deck's own voice** (espeak-ng) | Already on SteamOS 3.7.13 and later | none | Robotic, clear, tireless; fine for a 20-second hint, tiring for four minutes | Instant | GPL-3, a separate program the system ships; the plugin only runs it | **Phase 1's zero-install voice and the fallback for everything else** |
| **B. A Piper voice, run by the sherpa-onnx runner** | Runner: one 28 MB archive for Linux x64 from its releases (v1.13.7, 2026-09-01). Voice: about 63 MB each from the Piper voice set | about 90 MB | Natural; what Home Assistant uses; reads like a good audiobook app, not a person | A published measurement puts Piper at three times faster than real time on a desktop core; guess two to four times on the Deck, so a one-minute answer is ready in 15 to 30 seconds and the first sentence in about one | Runner Apache 2.0. Each voice carries its own data licence, checked per voice (§ 9, question 6). The Piper engine itself is not needed: the old binary is MIT, the new package is GPL-3, and the runner replaces both | **The natural voice; Phase 2 since the maintainer's call of 2026-09-05** |
| **C. Kokoro, same runner** | The runner's model set; 100 MB packed, 330 MB full | 100 to 330 MB | The best of the small voices; close to a person | Slower than real time on a Raspberry Pi 4 even with four threads; guess around real time on the Deck using every core, which the game also wants | Apache 2.0 | A quality option for listening with the menu open, later; not the default |
| **D. Kitten TTS nano, same runner** | The runner's model set; released Feb 2026 | about 25 MB | Decent; eight voices; the smallest natural voice there is | Faster than B, most likely | Apache 2.0 | The small alternative if Piper's per-voice licences turn out to be a bother; measure alongside B |
| **E. Supertonic, Pocket TTS, Inflect** | Python packages; the runner also supports the first two | 240 to 450 MB | Good to very good | Faster than real time on a four-core server | Pocket TTS MIT; Supertonic 3 OpenRAIL-M, which is not open source by the plugin's classes | Skip for now; the runner keeps the door open |
| **F. A speech server on the PC that runs Ollama** | The person's own PC | none on the Deck | Whatever the PC runs | Depends on the LAN | n/a | Not offline; a later option for LAN users |
| **G. Steam's own screen reader** | Already on the Deck | none | Same voice as A | Instant | n/a | No: it reads the focused control and cannot be aimed at an answer |
| **H. The browser's built-in speech inside Steam's interface** | Steam's web engine | none | Same voice as A, if it works at all | Instant | n/a | Unknown: on Linux it needs the speech service SteamOS now ships, and Valve's build may not have it switched on. One line of code to find out; row 06 |

Why the runner and not the engines directly: sherpa-onnx is one Apache 2.0 program that runs Piper,
Kokoro, Kitten and more, ships ready-built for Linux x64, and needs no Python packages, no compiler and no
container on the Deck. The listening engine needed a container and a 60-second compile because no clean
prebuilt existed; here one does. It comes as a shared build, so the plugin sets the library path before
running it, which the listening code already does for its own engine.

Ollama and the LAN PC are not the answer today, and nothing the maintainer waits on changes that.

### 3.1 OmniVoice, checked 2026-09-08

The maintainer asked whether OmniVoice, a new speech model from the same team that makes the runner in
option B, changes the plan. It was released 2026-03-31. Short answer: not on the Deck, yes on the PC.

**What it is.** One model that speaks over 600 languages, copies a voice from a three-to-ten-second clip,
or invents one from a few fixed keywords: gender, age, pitch, whisper, and one of ten English accents
(American, British, Australian, Canadian, Indian, and five non-native ones). Its own docs warn that some
keyword combinations are ignored. "British" is one bucket: no Scottish, no regional English, no free-text
description. Quality is its strength; in the paper's own tests it copied voices more closely and misread
fewer words than a leading paid service.

**Why it does not read on the Deck today.**

- **Built for graphics cards.** The install instructions cover NVIDIA, Apple and Intel Arc chips. On a CPU
  the authors say it is "rather slow"; in April they said they would look into it, and nothing has shipped
  since. The Deck's graphics chip is AMD, which the model's fast path does not support.
- **Size.** About 600 to 800 million parameters depending on what is counted, six to eight times Pocket TTS.
  It builds a whole sentence in 16 to 32 passes rather than streaming it, so the first sound waits for the
  whole first sentence.
- **Speed, measured elsewhere.** The one careful CPU measurement, on a top desktop chip with eight threads
  and a faithful conversion, took 28 seconds to make 10 seconds of speech with an automatic voice and 67
  seconds when copying a voice. The Deck has four cores at roughly half the per-core speed, so the guess is
  two to four minutes for a ten-second sentence, or half that with fewer passes. A second conversion claims
  twice real time on an unnamed CPU, but the team behind a third conversion says it treats the model as
  left-to-right, which it is not, so it computes a different model. A community C++ port with a Vulkan build
  exists, and Vulkan is the one road onto the Deck's graphics chip; nobody has published a number for an AMD
  chip like the Deck's, and the game owns that chip. Only a Deck test would settle it, and it is a half-day
  test, not a shell command: build the port in a container the way the listening engine is built, download
  about one gigabyte, time a 150-word answer on the CPU and on the graphics chip.
- **Download and memory.** About one gigabyte for the compressed weights plus the audio codec, against
  about 90 MB for option B. A guess of one and a half to two gigabytes of memory while speaking, shared with
  the game and the Ollama model.
- **Licence.** The code is Apache 2.0. The weights are CC-BY-NC, non-commercial, because of the training
  data. Under the middle path in call 6 that puts it on the looser tiers only, the same place as the
  non-commercial Piper voices. Its terms also forbid copying a voice without consent, which is the rule anyway.
- **Not in the runner.** The runner in option B does not run it (its changelog checked to version 1.13.7).
  Two requests ask the team for a conversion and for a smaller version; neither has an answer from the team.
  Since the same team makes both, this is the thing to re-check when Phase 2 starts: one line in the
  runner's changelog would change this section.

**What it changes.**

1. **Phase 1 and the natural reader voice: nothing.** The Deck's own voice, then Piper or Kitten or Pocket
   TTS through the runner, stay as planned.
2. **The invented character voice (§ 6, way 2): it is the PC-side tool.** § 6 said the design model "wants a
   graphics card" and did not name one. OmniVoice fits that role. For a one-time five-second clip a graphics
   card is not even required; on a PC CPU the wait is a minute or two, once. Its keyword design gives a
   generic British voice, not a heavy regional one, so for the accent the maintainer described the reliable
   route is still a five-second recording of their own voice, which Pocket TTS copies on the Deck directly.
   One new question for call 6: whether a clip made by a non-commercial model can ship inside the plugin as
   its default voice. The rules on what a model's output inherits are unsettled; settle it before that clip
   becomes the default.
3. **Option F, a speech server on the PC, gets much stronger.** On a PC graphics card OmniVoice runs five to
   forty times faster than real time depending on the card, and ready-made servers exist that speak an
   OpenAI-style interface. For a person whose Ollama already lives on a LAN PC, that PC could read every
   answer in the full character voice, designed or copied, at no cost to the Deck. It is still not offline,
   so it stays a later option, but it is now the best-sounding one.

## 4. How the sound gets out, and how fast

**Two doors.** The background program can play through the Deck's sound system with the player that
ships beside the recorder the microphone uses, pointed at the session socket the microphone code already
finds. That door keeps playing with the menu closed, needs no data to cross the plugin's bridge, and Stop
is ending one process. Or the screen side can play: the background program hands over a sound file as
text through the bridge and the browser's audio player plays it, as Game Theme Music does. That door is
proven on other plugins but a minute of speech is about 3.5 MB of text across the bridge, and the player
dies if the plugin reloads. **Recommendation: the background door, with the screen door as the fallback**
if playback from a root program into the session fails on the device. Rows 02 and 06 check both.

**The first sentence first.** The text is split into sentences; the engine makes one while the player
plays the previous one. So the wait before sound is one short sentence's work, about a second for B, and
the total work hides under playback as long as the engine stays ahead. For A it is nothing. For C it may
not stay ahead on the Deck; that is why C is not the default.

**What it costs the game.** A uses nothing. B uses about one core for a fraction of the answer's length.
C uses every core for most of it, which a running game notices. Battery follows the same order. Row 05
measures B beside Deep Rock Survivor, the same standard the model bake-off uses.

**Where the sound goes.** Whatever the Deck is using: speakers, headphones, Bluetooth, the dock. That is
the session's default output and needs no choosing. Volume is the Deck's volume; a plugin-side slider is
not needed in Phase 1.

## 5. What gets read, and what does not

- **The same text helper as the toast preview** (plan 38, build step 1): internal tags out, every hidden
  block out, formatting flattened. One helper, two users. Reading aloud adds sentence splitting on top.
- **Hidden spoiler blocks** are never read. Whether the voice says a short marker such as *"a spoiler is
  hidden here"* or skips silently is D74, question 3. Recommendation: say it, so the person knows the
  answer had more and can open the block on screen if they want it.
- **Tables and code** are not read out symbol by symbol. The voice says one phrase, *"there is a table on
  screen"*, and moves on.
- **Character answers** are read as written; the accent is already in the words.
- **The branch menu** at the end of a Strategy answer is not read; it is a control, not the answer.
- **Stop** on: the button, a new question, the plugin unloading, the Deck going to sleep.

## 6. Phase 2: a voice that fits the character, and the legal gate

The maintainer's ask, 2026-09-05: not a stock reader, and not a copy of any real performer, but an
invented character voice with a heavy regional accent, the way the character mode already writes in one.
Three ways to get there, cheapest first. All three keep the one rule that is the legal gate: **never a
copy of a real person's voice without that person's consent.** Invented voices, consented recordings and
a person's own voice are all fine; a soundalike of a named performer is not, and several US states now
make it unlawful.

1. **A stock voice with the right regional sound.** The Piper set has a British pack trained on 109
   consented speakers from across the UK, attribution licence, and the pack's speaker list says where
   each is from, so a young man from Surrey or London is a matter of picking the right number. The words
   already carry the slang and the rhythm, because the character mode writes them that way. What this
   cannot do is the performance: the exaggerated delivery of a comic character. Cost: one voice pack, the
   runner from § 3, no new engine; Deck speed as measured for B.
2. **Invent the voice once on the PC, then copy it on the Deck.** Two engines do this. One makes a new
   voice from a plain-language description (a young man from Surrey, a heavy London-Jamaican accent, quick
   and cocky); it wants a graphics card, so it runs once on the PC, never on the Deck. The other, Pocket
   TTS, takes a five-second clip of any voice and reads new text in it; it is a 100-million-parameter
   model that runs on two CPU cores, its code is MIT, and it is in the runner's model set. So: design the
   voice on the PC, keep a five-second clip, and the Deck reads every answer in it. The clip is of nobody.
   Or skip the design step and record yourself doing the accent for five seconds; your own voice needs
   nobody's permission. A five-second copy keeps the sound of the voice and much of the accent and loses
   some of the performance. Cost: Pocket TTS on the Deck is unmeasured (row 04 now includes it); one
   published measurement puts it near real time on a four-core server, so beside a game it may not keep
   ahead of playback. Its weights' licence is checked on the day; its terms forbid copying a voice without
   consent, which is the rule anyway.
3. **The voice-design model on the Deck itself.** No: it wants four to eight gigabytes of graphics memory,
   which the Deck shares with the game.

**The maintainer's call, 2026-09-05: way 2, the invented voice.** Row 04 decides whether it reads on the
Deck or only on the PC; way 1 stays as the fallback if row 04 fails. The rule stays as written.

### 6.1 Which stock voices would be out

Every English voice in the Piper set, with the licence on its own card, read 2026-09-05. Under the
rule "public domain or attribution-only" the middle column is what a person on the default tier
would see. One correction to the memo's first draft: Piper's best-known American voice, *lessac*, is
not attribution-only. Its recordings are licensed for research only and the licence forbids building
voice products with them at all, so it is out on every tier.

| Voice | Default tier | Why |
|---|---|---|
| **UK:** vctk (109 speakers), alba (Scottish), aru (12 Liverpool speakers) | in | attribution |
| **UK:** cori | in | public domain |
| **UK:** jenny_dioco | in | attribution; must be called *Jenny* in the app |
| **UK:** northern_english_male, southern_english_female | in | attribution, share-alike |
| **UK:** alan | check the voice folder | the Mycroft set is attribution share-alike overall; the card says "see URL" |
| **UK:** semaine (4 speakers) | looser tiers only | non-commercial |
| **US:** ljspeech, john, kristin, norman, bryce | in | public domain |
| **US:** joe, mike, kathleen, reza_ibrahim | in | CC0 |
| **US:** libritts, libritts_r (904 speakers) | in | attribution |
| **US:** sam | in | Apache 2.0 |
| **US:** arctic (18 speakers) | in, most likely | the CMU Arctic licence allows any use; the card only says "see licence file" |
| **US:** amy, danny | check the voice folder | as alan |
| **US:** kusal | out until checked | no licence found on the card or at its source |
| **US:** ryan, hfc_male, hfc_female | looser tiers only | non-commercial |
| **US:** l2arctic (24 accented speakers) | looser tiers only | non-commercial |
| **US:** lessac | **out on every tier** | research only; voice products forbidden |

The Kokoro and Kitten voices are Apache 2.0, and Pocket TTS's own pre-made voices are donated under
CC0; all in. Pocket TTS's weights are attribution-only, which is fine on the default tier under the
middle path.

**What the invented voice changes.** With way 2 chosen, the character voice needs no stock voice at
all. The plain reader can go the same way: design one voice for the plugin itself once, keep the clip,
and every Deck reads in it. Then the stock list above is an optional extra, not the product, and call 6
shrinks to whether to offer that list at all.

### 6.2 Front-load the voice: the maintainer's idea, 2026-09-08

The maintainer asked why the heavy work cannot be done once, up front, so the Deck only uses the result.
The answer splits in two, and the split is the whole design.

**A speech model is a reader, not a recording.** A voice is a note handed to the reader. The words are new
for every answer, so some program on the device reads each sentence fresh at answer time. That reading is
the slow part. Making the voice is the cheap part. OmniVoice is a superb reader that is far too slow on the
Deck (§ 3.1), and a voice refined inside it is only the clip and keywords it was given; using it at answer
time means running it at answer time. So the plan hands the same note to a fast reader. Two exist.

| Route | Work up front | Who does it | Each answer on the device |
|---|---|---|---|
| **A clip, read by Pocket TTS** | one clip of five to ten seconds per character | the maintainer on the PC, with OmniVoice | the small copying model reads in it; near real time on four CPU cores elsewhere, unmeasured on the Deck (row 04) |
| **A trained Piper voice** | OmniVoice reads a long script in the voice, about 1,300 to 1,600 phrases; a Piper voice is fine-tuned from an existing one on a graphics card, five days on an old 8 GB card, likely a day on a modern one | the maintainer on the PC, once per bundled character | the runner reads with a 60 MB voice file; the fastest and smallest route |
| **OmniVoice itself** | nothing | nobody | minutes per sentence on a Deck |

One person has done the second route: 1,644 phrases generated by another speech program, a Piper voice
fine-tuned on them, and a result that "sounds similar" to the program that made the speech. They did not
publish the voice because the copyright of weights trained from a program's output is unclear (§ 6.3).

**The bundled characters: up front, on the PC.** Locked 2026-09-08. Every character the plugin ships with
gets a voice designed once in OmniVoice on the maintainer's PC: keywords first, a short clip of the
maintainer's own voice where an accent needs more than the ten fixed ones, refined by ear, kept as a clip.
The clip route ships first because it costs one clip per character and keeps more of the performance. The
trained-voice route is the fallback if row 04 shows the copying model cannot keep ahead of playback beside
a game; it is also the upgrade if it can, for the characters people use most. New for the plugin either
way: hosting its own voice files. Clips are small enough to ship inside the plugin; trained voices at 60 MB
each are not, and would be downloaded on demand the way the natural voice is.

**A custom character: a later version.** Locked 2026-09-08. The person types a name and a description,
presses *Generate voice*, and the device spends minutes, once, inventing a voice; from then on the copying
model reads that character in it. The minutes are the OmniVoice design step run locally, on the CPU or
through the graphics chip, with no game running. What it needs on the device: the C++ port of OmniVoice
(§ 3.1), built the way the listening engine is built, plus about one gigabyte of model files, as an optional
download from Settings. Training a Piper voice on the device is out: the training guides say a CPU takes
"days and days", and that is a PC.

**Local with a warning, or LAN only?** The maintainer's thinking: bonsAI runs on any SteamOS machine, so the
Deck is the floor, not the target; a stronger machine may do in seconds what the Deck does in minutes; a
download button in Settings with a plain warning ("this is impossibly slow when run locally on a Steam Deck;
use a LAN PC") might be enough; and if OmniVoice needs the LAN anyway, build it LAN-only and say so in
Settings rather than a mixed setup. Locked as call 10 later the same day: local, with the warning worded
*minutes on a Steam Deck, seconds on a stronger machine*; the LAN server is not built; the half-day Deck test
of the port (row 07) is phase 0 of the custom-voice work.

Two facts shape it. First, the slowness is about *reading live*, not about the *one-time design step*: a
few minutes once per custom character is a wait a person will accept with a progress bar and a "close your
game first" line, even on a Deck; reading every answer with OmniVoice is what a Deck cannot do. Second, on
SteamOS the Python OmniVoice is never the local option: there is no package manager and no NVIDIA driver,
so the local build is the C++ port with its Vulkan backend, which is also the only road onto an AMD graphics
chip, Deck or desktop. That port is one person's project, has no releases yet, and has never been timed on
an AMD chip. Row 07 is that test.

**A LAN speech server** would mean a second program on the person's PC beyond Ollama, with its own install
(Python, PyTorch, an NVIDIA driver), an address to paste into Settings, and audio crossing the house network
for every sentence. It works, and it is the best sound available; it is also the most setup asked of anyone
so far. Not built; locked 2026-09-08. Reopened only if row 07 fails.

### 6.3 The licence question the clips raise

OmniVoice's weights are non-commercial (§ 3.1). A clip or a trained voice made from its output is neither
the weights nor a copy of them, and whether a licence on weights reaches the model's output is unsettled;
the Piper blogger above chose not to publish for exactly that reason. The plugin is free and Apache 2.0,
and a person playing alone is never touched by a non-commercial clause; a person streaming with the plugin
on screen might be. Open as call 11. The cheapest next step: ask the team directly in an issue whether
voices made with the model may ship inside a free open-source plugin; they answer issues. The fallback if
the answer is no: the maintainer's own recorded clips for characters where one voice with an accent will
do, and the stock consented voices of § 6.1 for the rest.

### 6.4 Shelved 2026-09-08: possible, but a legal check first

The maintainer shelved the character voices the same evening they were planned. Not because they cannot be
built: § 6.2 shows they can, and cheaply. Because the conversation that followed showed the legal ground is
not what it looks like, and that has to be checked before a single clip is made. The summary, so the next
session does not re-derive it. None of this is legal advice.

- **Fair use is the wrong tool.** It answers "may I use this copyrighted work?" A voice is not a copyrighted
  work. What protects a voice is each person's right to control the use of their own identity, which in most
  US states covers a distinctive, widely known voice. The two landmark cases were impersonators, not
  recordings; the singers won because the point of the imitation was to make people think of them.
- **"Not for profit" helps less than it feels like it should.** The older state laws mostly target adverts
  and sales, so a free plugin is in a better place than an advertiser. The newer laws written for AI voices
  (Tennessee's from 2024 and several since) cover making a simulation of someone's voice available at all,
  with exceptions for news, comment, criticism and parody, not for "free". Courts read "for your own
  advantage" broadly; a plugin that gains users because a recognisable voice is in it has an advantage.
- **Parody is the real defence, and it has a shape.** A comic character with its own material that happens to
  sound like a young London man uses the imitation as raw material: protected. A picker that says "sounds
  like Ali G" sells the imitation as the product: not. Same voice, different footing.
- **Every bundled character has two layers, and Ali G a third.** All 31 characters in the picker are named
  characters from games or TV. The studio owns the character (copyright; here fair use and parody do apply;
  text roleplay already sits on this layer, and the prompt already tells the model not to claim to be the
  official voice actor). The actor owns their voice (no fair use at all; this layer is new with any voice
  feature). Ali G is a living comedian's own persona, so performer and character are the same person.
- **What actually happens is not a lawsuit.** A complaint from an actor, a takedown, or the plugin pulled from
  a store. Game voice actors are, right now, the most organised group fighting AI voice copying. OmniVoice's
  own terms forbid impersonation regardless of the law.
- **The keyword route is the safe side of the grey.** OmniVoice's design step takes only fixed choices (gender,
  age, pitch, whisper, one of ten accents); it cannot be asked for a person. Describe the type, stop when it
  fits the character, never name the performer, never tune by ear toward them, never lean on their
  catchphrases, and keep the keyword string next to each clip as the record. A passing resemblance is then
  nobody's problem.

**What unshelving needs, in order.**

1. **The character sweep** (roadmap, two stars): one line per character naming the studio, the actor, whether
   the performer is a living person's own persona, and whether a voice could be made as a type rather than a
   copy. This also tells the text feature where it stands.
2. **The legal check**: a person qualified to say so reads the sweep and this section and says which
   characters, if any, may have a voice and under what rule. Until then, no clip is made.
3. **Call 11**: the OmniVoice team's answer on voices made with a non-commercial model (§ 6.3).

**What is not shelved.** *Read answers aloud*, the plain reader in the Deck's own voice, has no character in
it and stays open. The natural reader voice (Piper, Kitten or Pocket TTS through the runner) also stays open;
a stock consented voice reading as the plugin itself touches nobody's identity.

## 7. Proving it on the Deck

Rows go in the manual test doc when the build lands; the feasibility rows run before the build, when the
Deck is free. Another chat holds the Deck today. Rows 01 to 03 are shell commands over SSH and take under
half an hour; a probe script (§ 8, step 0) runs them in one go.

- **TTS-FEAS-01, the built-in voice is there.** Read the SteamOS version; confirm the speech program,
  the screen-reader speech service and the sound player exist; make a five-second sound file from one
  sentence. Pass: a file with speech in it, made in under a second.
- **TTS-FEAS-02, sound from the background.** From the plugin's background program, with the session
  socket found the way the microphone finds it, play that file with the menu closed and a game running.
  Then again with headphones, then Bluetooth. Pass: heard each time, on the right output, over the game.
- **TTS-FEAS-03, the natural voice runs.** Download the runner archive and one Piper medium voice to
  the Deck, set the library path, make a sound file from a 150-word answer taken from the answer test.
  Pass: no illegal-instruction crash, speech in the file; record seconds taken and memory used, and the
  seconds for the first sentence alone.
- **TTS-FEAS-04, the other voices** (same day): Kitten nano, Kokoro packed, and Pocket TTS reading from a
  five-second clip of the maintainer's own voice, same measure. Pocket TTS's number decides whether § 6
  way 2 is a Deck feature or a PC-only one.
- **TTS-FEAS-05, beside a game.** Row 03 again with Deep Rock Survivor running: seconds taken, and a
  note by eye on whether the game stuttered. This is the number that decides whether B is the default
  or only an option.
- **TTS-FEAS-06, the screen door.** From the plugin's screen code in gaming mode, play a short sound
  with the browser's audio player, close the menu, confirm it keeps playing; and ask the browser for its
  built-in voices (one line). Pass for the first half: heard with the menu closed. The second half is
  information only.
- **TTS-FEAS-07, OmniVoice on the device, one-time step only.** Build the C++ port in a container the way
  the listening engine is built; download the compressed model files, about one gigabyte; from keywords,
  make a ten-second clip on the CPU with eight threads, then again through the graphics chip, with no game
  running. Record seconds and memory each time. Repeat on a stronger SteamOS machine if one is at hand.
  Pass: a clip a person would accept waiting for, with a progress bar, on the Deck. The numbers decide the
  warning's wording and whether the LAN server has to be reopened. Half a day, not half an hour. **Phase 0 of
  the custom-voice work (step 9); nothing else in it starts first.**
- **TTS-FEAS-08, a trained voice from generated speech, on the PC.** OmniVoice reads about 1,500 phrases
  in one bundled character's voice; fine-tune a Piper voice from an existing English one; record the hours
  and the card; judge by ear against the clip route reading the same answer through the copying model.
  Pass: the trained voice is recognisably the same character. This decides whether the trained route is
  the fallback only or the default for the most-used characters.

## 8. Build steps, when this is picked up

Only after D74 is answered and rows 01 to 03 have passed. **Rows 01 and 02 passed on 2026-09-12** (§ 11); row 03
gates Phase 2 only, since Phase 1 uses the Deck's own voice, so the Phase 1 build started the same evening (D99).
Step 0 is `scripts/probe_deck_read_aloud.py`, which runs rows 01 and 02 as root over SSH, the plugin's real situation.

| # | Step | Who | Depends on |
|---|---|---|---|
| 0 | A probe script for rows 01 to 04 over SSH, in the shape of the existing Deck probes. Writes what it finds to a run file. | Opus xhigh writes it; anyone runs it | the Deck being free |
| 1 | The text helper shared with plan 38 (if plan 38 has not built it yet), plus sentence splitting. Tests: the plan 38 list, and sentences split on full stops, question marks and line breaks but not on decimals or abbreviations. | Sonnet 5 high lane | nothing |
| 2 | Background: a speak service. Takes text, splits it, makes each sentence with the Deck's own voice into a sound file, plays them in order through the session's sound system, stops on request. The engine is behind one small interface so Phase 2 adds the natural voice without touching the rest. Three bridge methods: start, stop, status. Start returns at once and the screen polls status, so no call outruns the 15-second deadline. Tests with a fake engine and a fake player. | Sonnet 5 high lane | 1 |
| 3 | Screen: the Read aloud / Stop button under the answer with a focus-graph entry, and the Settings row **Voice replies** with three positions, Off (default) / When I asked by voice / Always, in the same three-button row the input persistence setting uses (D99). Plumbing budget from the settings note in CLAUDE.md: about eighteen files, the same for a three-valued setting as for a boolean. | Sonnet 5 high lane; Opus xhigh reviews the focus entry | 2 |
| 4 | Docs: roadmap, testing rows, changelog. | Sonnet 5 high | 3 |
| 5 | Phase 2, the natural voice: download the runner and one voice, smoke-test once, write the ready marker; progress shown in Settings the way the listening engine's is. Reuse that code's download, progress and cancel pieces rather than copy them. A Settings row picks the voice. | Sonnet 5 high lane | Phase 1 shipped; row 03 passed |
| 6 | Phase 2, the character voices: the character-to-voice table (a stock speaker number, or a five-second clip) and passing the choice through; the clip path only if row 04 passed. | Sonnet 5 high lane | 5 |
| 7 | The bundled clips: design each character's voice on the PC, keep a clip, ship the clips inside the plugin, extend step 6's table to point at them. Nothing runs at build time. | the maintainer designs; Sonnet 5 high lane wires | 6; row 04 passed; call 11 answered |
| 8 | Trained voices, fallback or upgrade: the PC recipe as a script in the repo, a hosted voice file per character, on-demand download reusing step 5's pieces. | Sonnet 5 high lane; the training runs on the maintainer's PC | 7; row 08 |
| 9 | Custom character voice, later version: the OmniVoice port as an optional download from Settings (container build, progress, cancel, ready marker, reusing step 5's pieces), the *Generate voice* button with progress and the warning *minutes on a Steam Deck, seconds on a stronger machine*, the clip stored per custom character, tier gating for the non-commercial weights. | Opus xhigh plans; Sonnet 5 high lanes build | phase 0 is row 07; then 7; call 11 |
| 10 | LAN speech server: **not built**, locked 2026-09-08. Reopened only if row 07 fails; then an address setting, a health check, audio fetched by the background program and played through the session's sound system, said plainly in Settings as LAN-only. | Sonnet 5 high lane | row 07 failed |

**Effort, honestly.** Phase 1, the Deck's own voice only, is two stars: the plumbing exists, the engine
is there. Phase 2 is three stars: the natural voice download and its Settings state, plus the character
table; the copied-voice path adds a Deck measurement, not much code. The roadmap's five stars were the
price of not knowing any of this.

## 9. What the maintainer decided — D74, partly locked 2026-09-05 and 2026-09-08

Locked the same day, the maintainer's answers:

1. **The Deck's own voice for Phase 1.** No download. The natural voice moves to Phase 2.
2. **Reading new answers on their own when the menu is closed ships in Phase 1**, as a setting, off by
   default.
3. **A skipped spoiler block is said out loud**, one short phrase.
5. **The roadmap entry is split**: *Read answers aloud* (two stars, now that no download is in it) and *A
   voice per character* (three stars, since the download moved into it).

4. **The character voice: the invented one.** Locked later the same day. Way 2 in § 6: design the voice
   once on the PC, copy it on the Deck from a five-second clip; row 04 decides whether the Deck can carry
   the copying model; the stock regional voice is the fallback.

Still open:

6. **Voice licences, and whether to list stock voices at all.** § 6.1 has every English voice and which
   would be out. With the invented voice chosen, the plugin can design its own reader voice too, and the
   stock list becomes an optional extra. *Recommendation:* the plugin's own designed voice as the reader,
   the stock list offered as an extra and filtered by the model tier setting (the middle path), *lessac*
   never.

**Locked 2026-09-08**, after the OmniVoice research (§ 3.1, § 6.2):

7. **The bundled characters' voices are made up front on the maintainer's PC** with OmniVoice, and ship as
   clips; the trained-voice route is the fallback if the copying model is too slow beside a game.
8. **A custom character's voice is a later version** of the feature.
9. **An optional OmniVoice download button in Settings is acceptable.** No mixed Deck-and-PC setup.
10. **The custom voice step runs on the device, with the warning *minutes on a Steam Deck, seconds on a
    stronger machine*.** Locked later the same day. Through the C++ port, for the one-time design step only,
    on every SteamOS machine; the plugin shows the measured time after the first run. Live reading with
    OmniVoice stays off the device; the small copying model reads everywhere. **The LAN speech server is not
    built**; it is reopened only if the port fails its Deck test. **That half-day test (row 07) is phase 0 of
    the custom-voice work**; nothing else in it starts first.

Still open, raised 2026-09-08:

11. **Whether voices made with a non-commercial model may ship in the plugin** (§ 6.3). *Recommendation:*
    ask the team in an issue before any clip ships; design the voices meanwhile, since the answer changes
    only whether they ship, not the work.

**Shelved 2026-09-08**, later the same evening. The character voices (calls 7 to 10) are possible but wait on
a legal check and a character sweep; § 6.4 has the reason and the order. Call 11 stays open. The plain reader
is unaffected.

**Locked 2026-09-12 (D99): the go, and the setting's shape.** The maintainer's "yes" to starting Phase 1. Call 2's on/off
switch becomes one three-position choice, **Voice replies**: Off (default) / When I asked by voice / Always. "On its own"
means when the answer finishes, menu open or closed. The control is the three-button row the input persistence setting
already uses; the maintainer's word was "slider", and a real three-notch slider can replace the row if they prefer it by
eye. The middle position is the signal Voice follow-ups (D97) hangs off.

## 10. Sources

- SteamOS 3.7.13 notes, Orca and espeak-ng added: [Steam Deck HQ](https://steamdeckhq.com/news/steamos-3-7-13-released-with-wifi-regressions-fixes-for-steam-deck-oled-and-better-support-for-rog-ally/), [Steam news](https://store.steampowered.com/news/app/1675200/view/529850584204838038)
- Steam's screen reader, what it reads and how it is controlled: [Can I Play That](https://caniplaythat.com/2025/06/19/steam-adds-new-accessibility-features-in-beta/), [Steam Deck HQ](https://steamdeckhq.com/news/steam-deck-client-update-accessibility-features/)
- Ollama has no speech output: [issue 11021, closed into 5424](https://github.com/ollama/ollama/issues/11021)
- Piper today: [OHF-Voice/piper1-gpl](https://github.com/OHF-Voice/piper1-gpl) (GPL-3, Python); the archived MIT binary release: [rhasspy/piper 2023.11.14-2](https://github.com/rhasspy/piper/releases/tag/2023.11.14-2), Linux x64 archive 26 MB; a medium voice: [en_US lessac medium, 63 MB](https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_US/lessac/medium)
- The runner: [k2-fsa/sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx), Apache 2.0; [v1.13.7 release assets](https://github.com/k2-fsa/sherpa-onnx/releases), Linux x64 shared archive 27.9 MB; its [Kokoro](https://k2-fsa.github.io/sherpa/onnx/tts/pretrained_models/kokoro.html) and [Kitten](https://k2-fsa.github.io/sherpa/onnx/tts/pretrained_models/kitten.html) model pages, with the Raspberry Pi 4 speed figures
- CPU speed and quality of the small voices, July 2026: [Neo's four-model benchmark](https://heyneo.com/blog/kokoro-supertonic-inflect-nano-pocket-tts-cpu-benchmark); sizes, memory and licences, Aug 2026: [Picovoice's on-device comparison](https://picovoice.ai/blog/on-device-tts/) (a vendor page; its own engine is the one it favours)
- Kitten TTS, Feb 2026: [NYU Shanghai write-up](https://rits.shanghai.nyu.edu/ai/kittentts-state-of-the-art-voice-synthesis-in-under-25-mb/)
- Kokoro 82M, Apache 2.0, six times real time on a laptop: [VisionStory review](https://www.visionstory.ai/open-source/kokoro-tts)
- Plugins that play sound in gaming mode: [Game Theme Music](https://github.com/OMGDuke/SDH-GameThemeMusic) (browser audio player from the plugin's screen code), [Audio Loader](https://github.com/DeckThemes/SDH-AudioLoader)
- OmniVoice, 2026-03-31: [k2-fsa/OmniVoice](https://github.com/k2-fsa/OmniVoice), Apache 2.0 code; [model card](https://huggingface.co/k2-fsa/OmniVoice), weights CC-BY-NC; [voice design keywords](https://github.com/k2-fsa/OmniVoice/blob/master/docs/voice-design.md); [paper](https://huggingface.co/papers/2604.00688) (0.8B parameters, RTF 0.03 on an H20 graphics card); the authors on CPU speed, 2026-04-03: [discussion 2](https://huggingface.co/k2-fsa/OmniVoice/discussions/2); requests for a [conversion](https://github.com/k2-fsa/OmniVoice/issues/151) and a [smaller model](https://github.com/k2-fsa/OmniVoice/issues/69), unanswered
- OmniVoice on a CPU: [AFun9/Omnivoice-onnx](https://github.com/AFun9/Omnivoice-onnx) (i9-14900KF, 8 threads, 32 passes: RTF 2.8 automatic voice, 6.7 voice copy; 611 MB weights); [onnx-community/OmniVoice-Onnx](https://huggingface.co/onnx-community/OmniVoice-Onnx) (RTF 0.48, CPU unnamed) and the [phoonnx card](https://huggingface.co/OpenVoiceOS/phoonnx-omnivoice) that says that conversion is causal and so a different model; [omnivoice.cpp](https://github.com/ServeurpersoCom/omnivoice.cpp) (C++, GGML, CPU and Vulkan, MIT) with its [GGUF files](https://huggingface.co/Serveurperso/OmniVoice-GGUF) (656 MB + 289 MB); [OmniVoice-Studio](https://github.com/biosisca/OmniVoice-Studio) ("CPU works, just slower")
- The runner's changelog to 1.13.7: no OmniVoice; Pocket TTS streaming voice copy on CPU added in 1.12.24; Supertonic 3 in 1.13.2: [CHANGELOG](https://github.com/k2-fsa/sherpa-onnx/blob/master/CHANGELOG.md)

## 11. Progress log

- **2026-09-05** — Memo written. Found: SteamOS has shipped a voice since June 2025; the plugin's
  microphone code already reaches the session's sound system from root; a natural voice is one Apache 2.0
  runner plus one 63 MB voice, no compile, no container. Not yet measured: speed beside a game. Six
  questions to the maintainer as D74. Deck rows written, waiting on the Deck.
- **2026-09-05, later** — Four calls locked: the Deck's own voice for Phase 1, auto-read as an off-by-default
  setting, the spoken spoiler phrase, the split. The maintainer asked for an invented accent voice for the
  character rather than a stock one; researched and written up in § 6: Pocket TTS copies a voice from a
  five-second clip on two CPU cores and is in the runner's set, the voice-design models need a graphics
  card, so design on the PC and read on the Deck. Row 04 now measures Pocket TTS. Voice licences open,
  pros and cons written.
- **2026-09-05, later still** — The invented voice locked for the character (way 2). Every English Piper
  voice's licence card read: *lessac*, the best-known American voice, is research-only and out on every
  tier; five voices are non-commercial; the British 109-speaker pack and most of the rest are fine.
  § 6.1 has the table. Call 6 reframed: with an invented voice, the stock list is an optional extra.
- **2026-09-08** — The maintainer asked about OmniVoice, the new 600-language speech model from the runner's
  own team. Checked and written up as § 3.1: it needs a graphics card the Deck does not have, is ten times
  the download, non-commercial on the weights, and not in the runner; on the Deck's CPU the best guess is
  minutes per sentence. It is the right PC-side tool for the invented character voice in § 6, and it makes
  the PC speech server in option F the best-sounding path for LAN users. Nothing in the plan changes; one
  new question for call 6 about a clip made by a non-commercial model. Re-check the runner's changelog when
  Phase 2 starts.
- **2026-09-08, later** — The maintainer asked why the voice work cannot be done once, up front. Written up
  as § 6.2: the voice can be front-loaded, the words cannot; two fast readers take a front-loaded voice, a
  clip through the copying model or a trained Piper voice, and one person has already trained a Piper voice
  from generated speech. Locked: the bundled characters' voices are made up front on the PC and ship as
  clips; the custom character's voice is a later version; an OmniVoice download button is acceptable,
  LAN-only if local cannot work. Open: local with a warning or LAN-only (call 10, decided by new row 07),
  and the licence of voices made with a non-commercial model (call 11, § 6.3). Roadmap: the character-voice
  entry reshaped and three entries added, one per approach, with stars.
- **2026-09-08, evening** — Locked: the custom voice step runs on the device with the warning *minutes on a
  Steam Deck, seconds on a stronger machine*; the LAN speech server is not built; the half-day Deck test of
  the port (row 07) is phase 0 of the custom-voice work. Roadmap: the LAN entry marked deliberately not
  built, the custom-character entry updated. Committed.
- **2026-09-08, night** — Shelved the character voices. Possible (§ 6.2), but the legal ground is not what it
  looks like: fair use does not cover a voice, not-for-profit helps less than expected, every bundled
  character is a named character voiced by a real actor, and Ali G is a living performer's own persona.
  § 6.4 has the summary and what unshelving needs: a character sweep (new two-star roadmap item), a legal
  check, and call 11. Roadmap: the three character-voice entries marked shelved; the plain reader unchanged.
- **2026-09-12** — The go. After the Frame bench recap the maintainer said yes to starting Phase 1 and changed
  the setting's shape (D99): one three-position choice, Voice replies, Off / When I asked by voice / Always,
  off by default, in place of the on/off switch. Rows 01 and 02 ran the same evening as root over SSH with the
  new probe (§ 8, step 0): the Deck's own voice made a 5.4-second sentence in 23 ms, and a root program found
  the session's sound sockets the microphone's way, played the file, and the session's sound server showed
  one playback stream on the built-in speaker. What a machine cannot check is owed to the maintainer's ear:
  heard on speakers, headphones and Bluetooth, and over a running game (row 02's second half, row 05). Row
  03 is Phase 2's gate and did not run. Build lanes for steps 1 to 3 launched the same evening.
