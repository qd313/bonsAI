# Cancel buttons and slow controls: what was found (2026-11-18)

The maintainer asked two things on 2026-11-18. First: which Cancel and Stop buttons do not stop their
job at once, put things back and tell the person straight away, and what holds each one up. Second:
which other controls do not react when pressed. This page is the answer, read from the code and, for
one item, measured on the Deck. The fixes it led to are listed at the end.

A Cancel has three jobs: stop the work, leave nothing half done, and show at once that it was heard.

## How a Cancel works today

Every long job (the AI install or update, the knowledge library download, the voice install) runs in
the back end. Pressing Cancel raises a flag. The job looks at the flag between steps and stops when it
sees it. The screen then learns the job has ended the next time it asks for the job's status, which it
does every 1.5 seconds.

So a Cancel is slow in two ways: a step that does not look at the flag while it runs, and the wait for
the screen's next status check.

## The five Cancel and Stop paths

| Button | Heard at once? | Puts things back? | Shows it at once? |
|---|---|---|---|
| AI install or update (the job card, and Stop on the first-time card) | Mostly. See 1 to 3 below | The program: yes, the old Ollama is untouched. A model part way down: no, the part stays so the next try carries on | The card says "Stopping" at once, then waits for the next status check |
| Knowledge library download | Only while data is flowing. See 4 | Yes. The half file is deleted and the old library stays | Same |
| Voice engine install | No during the build: about 10 seconds. See 5 | The half speech model and the spare build folder: yes. The build image stays in podman (about 1.1 GB) for the next install | Same |
| Stop on an answer | The screen: yes. The back end pauses 1.5 seconds first if no word has arrived yet. See 6 | The words already written are kept, on purpose | Yes |
| Stop on the microphone | Yes | Not a cancel: it ends the recording and reads it | Yes |

### What holds each one up

1. **A model download only hears Cancel when Ollama prints a line.**
   `run_ollama_pull` (`py_modules/backend/ollama/local_ollama_setup_service.py`) reads the download
   program's output line by line and checks the flag once per line. While the program prints nothing
   (looking up the model, or a stalled connection) the Cancel waits. During a normal download lines
   come many times a second, which is why the Deck check on 2026-11-17 saw about one second.
2. **Three short steps of the AI setup do not look at the flag at all.** Waking Ollama through systemd
   (up to four calls of up to 30 seconds each), the `ollama list` warm-up after the keys step (up to 60
   seconds), and stopping a running Ollama before the keys are made again (up to 45 seconds). Each is
   usually under a second; on a Deck where systemd hangs they are not.
3. **The restart of the AI server after an update cannot be stopped half way.** It is left that way on
   purpose: stopping in the middle would leave the Deck with no AI running. Usually 5 to 10 seconds,
   at worst about 2.5 minutes. The card kept saying "Stopping the update" with no reason given.
4. **The knowledge library download waits on the network.** Looking up the newest library is one
   blocking fetch per site, up to 60 seconds each, and no Cancel is heard during it. During the download
   itself each read waits for a full 256 KB or for the 120 second network limit, so a stalled connection
   holds the Cancel.
5. **Cancelling the voice engine build takes 10 seconds, measured.** The build runs in a podman
   container, and Cancel removes it with `podman rm -f`. Podman first asks the container politely and
   waits 10 seconds, and the build's shell ignores the polite request. Measured on the Deck on
   2026-11-18 (podman 6.0.2): 10.2 seconds, with podman's own warning "StopSignal SIGTERM failed to stop
   container in 10 seconds, resorting to SIGKILL". With `-t 0` added: 0.14 seconds. The check after the
   build (one test read, up to 60 seconds) does not look at the flag either.
6. **Stop on an answer, before the first word, pauses the whole back end for 1.5 seconds.**
   `abort_background_game_ai` in `main.py` waits for the connection to open with a blocking wait on the
   back end's one event loop, so every other call from the screen waits too.
7. **Every card waits for the next status check.** The screen asks every 1.5 seconds and nothing asks
   sooner after a Cancel, so a job that stopped in 0.2 seconds can still read "Stopping" for 1.5.
8. **A Cancel in the first half second after a job starts is ignored**, on purpose, so a double press
   cannot start and cancel at once. Left as it is.

## Other controls that do not react at once

Found by reading every press that calls the back end. Each was read in the code; the first six were
checked a second time.

1. **Clear all data** looks frozen. The box stays up with nothing changing while the wipe runs, which
   can be minutes, and Cancel and B do nothing meanwhile.
2. **Delete chat**: the box stays up with no sign of work, and a delete that fails closes the box with
   no message.
3. **The + for a new chat**: nothing shows until three calls finish, and a second press makes a second chat.
4. **The notes list**: the on/off switch and Remove change only after the Deck answers, and a second
   press sends a second request. (The Search tab's same switch already flips at once.)
5. **Keep on a note card**: nothing changes until the save is done.
6. **Remove the knowledge library**: the row keeps saying "installed" until the answer is back.
7. **Sum up this chat**: the button keeps its label until the back end accepts, so a quick second press
   gets a "busy" message.
8. **Removing an AI model**: the row stays in the list until a slow refresh ends.
9. **Opening another saved chat**: the name changes at once but the old chat's words stay until the
   fetch returns; a failed fetch leaves them under the new name.
10. **Paste clipboard**: no busy look, and a double press pastes twice.
11. **Moving a model up or down the try order**: the number changes only after two round trips.
12. **Install the starter set in Browse models**: nothing shows until the start call answers.
13. **Renaming a chat that fails** closes the box with no message.
14. **The "use for Ask" star**: changes only after two round trips; a press on another row is dropped.
15. **Ask anyway**: waits on a call before it reacts (not confirmed to be slow).

Checked and found fine: ordinary settings switches, the connection test, Install and Update, Find PCs,
the library's Download and Update, pulling models, the voice install, the microphone, sending a
question, the thumbs, Copy, the screenshot buttons and the permission switches.

## What was done about it

See the roadmap entries dated 2026-11-18 for each fix and the Deck check it owes.
