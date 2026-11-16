# Plan 104, Deck block DR: the smoke pass, then everything put back

Written 2026-11-16 by the chat running plan 104. The last Deck block. For one fresh `deck-driver` helper (Sonnet 5.5
medium). The helper file's rules apply in full, and so does **everything above the line "# D0a" in
`docs/planning/assets/104-runbook-block-D0.md`**: read that part first. Evidence goes to
`C:\Users\still\Documents\bonsAI-workshop\test-evidence\plan104-<ROW>.json`; handover
`C:\Users\still\Documents\bonsAI-workshop\planning\assets\104-handover-DR.md`. You commit nothing, deploy nothing.
**Read the last handover first** (your task names it). Keep every reply small; never `deck_listGames`.

**What the Deck looked like before plan 104** (read 2026-11-16 from the plan's own backup,
`/home/deck/p104-settings-backup.tgz`, made 2026-11-15 16:24): four chats (first questions: "Hollow Knight: which
areas should I explore first after Greenpath" (the long test chat from plan 103, 0387a7f6), "In Hollow Knight, how do I
beat the Soul Master?", "how do I handle the exploders", "What is the best first weapon in Deep Rock Galactic
Survivor?"); the mode chip on **Speed**; the Developer tab **off**; Internet downloads off; the published library
**2026.10.25** installed. Of the settings file's 50 keys, only three differ today: `ask_mode`, `rag_corpus_version`,
`show_developer_tab`. Steam's performance overlay was on (level 2) and is still on: leave it.

**Never:** press the Ollama tab's Update button; "Clear all data"; type a PIN or password; print a settings value (key
names only: the file holds a Steam key); turn Internet downloads on; delete a chat you cannot match below.

---

## DR.0: setup and the smoke pass (rows P104-DR-SETUP, P104-DR-SMOKE)

A new queue line ("plan 104 block DR, about 45 minutes"); `deck_status`; renew the hold for 90 minutes; the build hash
against your task; `free -m`; no game; `/api/ps`. Then one Hollow Knight question naming a boss, in your own words, in
the test chat (56b1b403, "chat 1 of 7"): **pass when** the answer finishes and a notes line names a Hollow Knight note.

## DR.1: the published library back (row P104-DR-LIBRARY)

Internet downloads are off, as before the plan, so do not use Remove and Download (turning the switch on is the
maintainer's call). Put back the copy block D1 kept instead:
1. Read `rag_corpus_path` from the settings file (that key only) and write it down. Read the backup:
   `ls -l /home/deck/p104-rag-published-backup` (three files: `ATTRIBUTIONS.md`, `corpus-manifest.json`, `corpus.db`)
   and its version: `python3 -c "import json;print(json.load(open('/home/deck/p104-rag-published-backup/corpus-manifest.json'))['version'])"`
   (expected 2026.10.25). If the path is empty or the backup does not hold those three files: stop this row, COULD NOT
   RUN, and say what you saw.
2. Nothing running, the AI unloaded. Copy the backup's three files over the installed ones, file by file:
   `cp -a /home/deck/p104-rag-published-backup/. <rag_corpus_path>/` (write the exact command you ran). Then
   `ls -l <rag_corpus_path>/` and the installed manifest's version, read the same way: it reads the backup's version.
3. Reload the plugin (`deck_reloadPlugin`; nothing running), open it, and read `rag_corpus_version` (that key only).
   **Pass when** it reads the backup's version and one Hollow Knight question still attaches a Hollow Knight note. If
   the key still reads 2026.11.16 although the files are back, do not edit the settings file: write it down and go on
   (the session decides).

## DR.2: the chats (row P104-DR-CHATS)

Delete, through the plugin's own Delete chat control (title row, Right to "Delete chat", A, then in Steam's box Left
to "Delete", A), exactly these chats made by this plan's drivers, matched by their first question: the test chat
"In Hollow Knight which attacks does Hornet use in her first fight at Greenpath and how can I avoid them" (56b1b403);
"In Hollow Knight how do I beat the Soul Master boss in the Soul Sanctum"; "In Hollow Knight what is the best way to
beat the Mantis Lords at Mantis Village" (on 2026-11-16 at 04:45 the plan-made ids were 56b1b403, ae3277f5 and
eb65c387); and any chat block D2c's handover names as made by it. **Never** any of the
four chats listed at the top. Then compare the chat ids with the backup's (ids only, first eight characters; the
first line is before the plan, the second today):
`ssh deck@192.168.86.52 'python3 -c "import tarfile,os;t=tarfile.open(\"/home/deck/p104-settings-backup.tgz\");print(sorted(n.split(\"/\")[-1][:8] for n in t.getnames() if n.startswith(\"bonsAI/chat_slots/\") and n.endswith(\".json\") and \"index\" not in n));print(sorted(f[:8] for f in os.listdir(\"/home/deck/homebrew/settings/bonsAI/chat_slots\") if f.endswith(\".json\") and \"index\" not in f))"'`
**Pass when** the two lines match (the same four chats). Leave the long test chat (0387a7f6) as the open one.

## DR.3: the settings, key by key (row P104-DR-SETTINGS)

1. Through the plugin's own screens: the mode chip back to **Speed** (read it after); "Show Developer tab" **off**
   (Settings, Data). The spoiler row and "Read game & screenshot context" stay as they are (they never changed).
2. Compare today's settings file with the backup, **key names only**:
   `ssh deck@192.168.86.52 'python3 -c "
import json,tarfile,hashlib
cur=json.load(open(\"/home/deck/homebrew/settings/bonsAI/settings.json\"))
old=json.load(tarfile.open(\"/home/deck/p104-settings-backup.tgz\").extractfile(\"bonsAI/settings.json\"))
h=lambda v: hashlib.sha256(json.dumps(v,sort_keys=True).encode()).hexdigest()
print(sorted(k for k in set(cur)|set(old) if (k in cur)!=(k in old) or (k in cur and k in old and h(cur[k])!=h(old[k]))))"'`
   **Pass when** it prints an empty list (or only `rag_corpus_version`, if DR.1 could not set it back: say so). Any
   other key: name it; change nothing by hand.
3. The suggestion row shows the everyday chips (no pinned test batch).

## DR.4: nothing left behind (row P104-DR-RESTORE)

- `ollama list` names only: `nomic-embed-text` and `gemma4:e2b-it-qat`, nothing else pulled.
- No test picture left: `find /home/deck/.local/share/Steam/userdata/23333482/760/remote -newer /home/deck/p104-settings-backup.tgz -type f | head`
  prints nothing (if it prints files, list their names and leave them: the session decides).
- `/home/deck/p104-rag-published-backup`: remove it **only if DR.1 passed** (`rm -rf` on exactly that path).
- `/home/deck/p104-settings-backup.tgz`: remove it **only if DR.2 and DR.3 passed** (`rm` on exactly that path).
  Leave `/home/deck/p100-settings-backup.tgz` (the maintainer decides about it).
- No game running; the AI unloaded; the plugin on the Main tab; Quick Access closed; the hold released
  (`deck_restorePowerSettings` if this block changed any); `python scripts/deck_queue.py done <id> --result "<...>"`; a
  last `deck_status`; `deck_releaseMachine`.

## DR.5: handover (`104-handover-DR.md`)

Each put-back in one line: done, or not done and why. The library's version. The chats left (first questions). The key
names that still differ from the backup. Anything on the Deck that is not as the maintainer left it on 2026-11-15,
said plainly (Steam's performance overlay was on before and is still on).
