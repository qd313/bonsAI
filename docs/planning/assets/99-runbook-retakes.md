# Plan 99 runbook: four retakes on the Deck's own screen

For a fresh deck-driver helper. Written 2026-10-22 23:00 by the release session after the first filming pass.
Read [99-runbook-filming.md](99-runbook-filming.md) first: § 0 (the tools), § 1 (the set-up) and § 4 (put back)
apply unchanged, and the log is the same file, `recordings/p99-filming-log.md` (append; the first pass's notes
are above). Then the first pass's lessons, which it wrote at the end of the log: the GUIDE+A chord does NOT
make a Steam screenshot (a screenshot tool call mid-take did), so never call the screenshot tool during a take;
the Expert item in the mode menu is reached by A on the chip, then RIGHT, then DOWN; typing into any field that
has the ring works with the scratch copy of the send-question script the first pass made (see its log).

The Deck is on its own screen (1280x800). The game is closed, the AI is on the Deck, the Developer tab is on,
the overlay is at 3. Redo the set-up: game running (Deep Rock Galactic: Survivor, id 2321470, hub menu),
Developer tab off, overlay 0, AI on the PC (address 192.168.86.38, Test connection, then AI models… with
`gemma4:e4b-it-qat` first), Thinking on. No pretend microphone this time. Chats: ten exist; delete none.

## Why these four

| Clip | What the first take lacked | Why |
|---|---|---|
| Ask about the game you're playing | the Keep card, Show reasoning opened | the typed sentence had no word the note offer listens for; the reasoning line was never pressed |
| Your own notes | the Keep card, the "read 1 of your notes" line, the notes sheet | same trigger problem, so nothing was kept |
| Saved chats | "Sum up this chat" | the chat still fit on screen; Sum up only wakes when a chat is longer than the model's memory window |
| Close the menu, keep playing | nothing wrong with the take itself, but a "Screenshot Taken" toast sits in it | the driver took a screenshot mid-take |

**The Keep card's rule** (from the code): the question must contain "I'm on a … run" or "I'm doing / playing
a … run (or playthrough, challenge, mode, difficulty)", or "I'm playing on …", or "I prefer …", or "I don't
want …", or "no spoilers". Use the exact openings below. The card reads "Keep this as a note?" under the answer.

## The takes, in order (new wording every retake)

| # | Clip (master name; overwrite the first pass's file after copying it to `<clip>-pass1-deck.mkv`) | Length | Steps | Must show |
|---|---|---|---|---|
| R1 | Ask about the game you're playing (`ask-about-your-game-deck.mkv`) | 150 s | Start on an existing chat with history, Speed mode. Pencil: New chat. Mode chip: A, then the menu: Expert, then again to Strategy (read the chip after each; if the menu will not give Strategy on camera twice, set Strategy off camera first, restart the take, and say so in the log). Type: "I'm on a Hazard 3 run as the Scout in the Crystalline Caverns and the swarm overwhelms me around minute twelve. How should I build and position?" Ask. The thinking fold shows steps; the answer streams with the decode effect. The Keep card appears under the answer: Down to it, A on Keep (the card says it is kept). UP to the line above the answer reading "Show reasoning · N s", A opens it; wait two seconds; A or B closes it (read which). Down to the "Where are you at?" box (A or B choices): A on one. The second answer streams; Down to its checklist, A ticks one step. Let the recorder run out. | the mode chip changing; the Keep card and a press on Keep; the reasoning block open; a choice pressed; a ticked step |
| R2 | Your own notes (`your-notes-deck.mkv`) | 75 s | New chat, Speed. Type: "I'm on a Hazard 4 run with the Engineer, mostly turrets. What should I upgrade first?" Ask. The answer arrives with the Keep card; Down, A on Keep. Clear the box. Type: "Which overclocks fit my current run?" Ask. The answer carries a line saying it read 1 of your notes; Down to that line, A opens the notes view (whatever it is on this build: a sheet over the screen or an inline list; describe it in the log). B closes it at the end. | Keep pressed; the "read 1 of your notes" line; the notes view open |
| — | **Off camera, before R3:** make one chat long enough to sum up. Expert mode, one chat, questions that invite long answers ("Explain every Scout weapon and when each is best", "Walk me through the first ten minutes of a Hazard 4 run step by step", "Compare all the Engineer turrets", "What does every resource do and where does it drop?", "Describe each biome's hazards in detail", "Give a full build order for the Driller"). After each answer, open Show details → the Session tab and read the "Sum up this chat" button: stop when it is no longer greyed (its grey text says "the whole chat still fits"). Note how many questions it took. If after ten long answers it is still greyed, log it as cannot-film and skip R3's Sum up part, filming only the flip and the delete box again without a screenshot call. | | |
| R3 | Saved chats (`saved-chats-deck.mkv`) | 90 s | Main on the long chat. Press RT, RT, LT a second apart so chats flip past, ending on the long chat. Down to Show details, A; Right to the Session tab; Down to "Sum up this chat", A; the summary card appears (a few seconds with the PC). Then UP to the pencil (New chat) and A: the "You have 10 chats" box; Down to Cancel, read focus so Cancel is under the ring, A. | three flips; the summary card; the delete box and Cancel |
| R4 | Close the menu, keep playing (`reply-ready-deck.mkv`) | 50 s | Main, Speed, a chat with history. Type: "What are the three most common mistakes a new Gunner makes?" Ask, then the GUIDE+A chord at once. The game's hub for 10 to 20 seconds; the "Reply ready" popup appears. Reopen with the chord so the answer shows for the last seconds. **No screenshot tool call from the recorder's start to its end.** | the game alone; the popup; the answer on reopen |

Retakes: at most one more per clip, new wording.

## Put back

As § 4 of the filming runbook: AI back on the Deck, PC address as it was, model order reset, Developer tab on,
overlay 3, game closed, keep-awake released. Also try once more to set the Ask mode back to Strategy (the first
pass could not); if the menu refuses again, say so. Leave `~/p99-settings-backup.tgz` on the Deck.

## Report

Plain language, under 400 words: one line per take (file, length, what it shows, trim suggestion), how many
questions the long chat needed, what the notes view looked like, settings put back or not.
