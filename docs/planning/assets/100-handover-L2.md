# Plan 100 block L2 handover (2026-10-25 21:09 to 21:50 EDT; stopped by the usage limit)

Build on the Deck: dist/index.js sha256 prefix 222279568b09. Keep-awake held 21:09 EDT, expires 2026-10-26T09:09:57Z.
Library installed: the night's (version 2026.10.26, corpus.db 3,424,256 bytes, /home/deck/.bonsai/rag). Seed folder untouched.
Test chat: "In Hollow Knight, how do I beat the Mantis Lords" (now about 70 earlier entries; Clear cache in L1.4 wiped the open view only). Three saved chats remain.

## Deck state as left (NOT fully restored, I ran out of allowance)
- Mode chip: STRATEGY (must go back to Speed).
- Developer tab switch: ON (must go back OFF: Settings > Data > Show Developer tab).
- spoiler_tier: default (restored). rag_demote.json: empty (cleared in L2.1).
- "Save files to Desktop": ON (as required). One suggested-tip file left: ~/Desktop/bonsAI_logs/suggested-tips/game-20261026-014251.json.
- No game running; Ollama models unloaded earlier but the AI is loaded again by the last questions.
- Plugin open on Main tab, ring on the question box area. The last question asked was a GTA wording retry (see below).

## Rows (evidence files in test-evidence, plan100-<ROW>.json plus screenshots)
- P100-L2-SETUP: PASS
- P100-TIPS-01 (L1.1): FAIL (sentence 1 got Hollow Knight notes, no tip; storage and display tips PASS; Hornet no tip PASS)
- P100-NEEDS-01 (L1.2): UNCLEAR (no step carried a Needs line in two tries)
- P100-THANKS-01 (L1.3): FAIL for thanks and date (replies 52 and 65 words, repeated earlier advice; notes search was skipped, no notes block); follow-up PASS
- P100-ROUTE-SAVE-01 (L1.4): PASS across reopen; after Clear cache UNCLEAR (file entry gone but route no longer drawn)
- P100-HIDE-MORE-SCREEN-01 (L1.5): UNCLEAR both halves (the AI drew no cover); row back on Default
- P100-SEARCH-TIER-01 (L1.6): PASS
- P100-YOSHI-01 (L1.7): PASS
- QA-LOOK-01-p100 (L1.8): PASS (measured, probe found nothing on Main, Settings, Search)
- P100-L1-SWEEP (L1.9): PASS on no repeat/no lost ring; the sweep tool cannot press A/B; the answer-bubble stop is 96% visible behind the dock chip
- P100-LOWERED-01 (L2.1): PASS (no "Which note was it?" step appeared; tag shows on the opened note card only)
- P100-SUGGEST-01 (L2.2): PASS (saved line is hidden behind the dock until the ring moves down)
- P100-FOUR-GAMES-01 (L2.3): Portal 2 PASS; GTA FAIL; Sims 4 and BG3 MEASURED

## Open at the stop
- GTA retry: "Grand Theft Auto San Andreas: how does body armor work" logged "names a game the library does not know (grand theft auto)" and searched nothing. corpus.db does hold game 9 "Grand Theft Auto: San Andreas - The Definitive Edition", so the name matching misses both spellings. I was checking the aliases table when I stopped. This is a likely real bug; the first GTA evidence file says the chat's game took over, the retry shows the other failure (update that file's note).
- Not done: L2.4 second rounds; restoring mode chip and Developer switch; handover copy into the repo.
- Quirks: the first Ask in a fresh chat reply took up to 55 s with a game running; deck_walkTo returns about 5k tokens each; Down from the reply row never stops on "Not really" (Right from Helpful).
