# Handover, plan 93 block A (2026-10-13 ~21:30 Deck time)

- Build on the Deck: matches the local build (deck_checkReady buildMatches pass, 160 files); repo tip 06d1ab6e. No deploy, no reload.
- Screen: the Deck's own, page window 854 x 454. Modals live in the "Steam Big Picture Mode" page (854 x 534); read them with deck_readPage target "Steam Big Picture Mode".
- Keep-awake: held, expires 2026-10-14T09:12:05Z (480 min taken ~21:12).
- Backup: ~/p93-backup/settings.json and ~/p93-backup/chat_slots/ on the Deck (chats live in ~/homebrew/settings/bonsAI/chat_slots).
- Test chat: NOT on the Deck. Only one chat exists: "How do I balance FPS and battery?" (2 turns, "chat 1 of 1"). No question was asked. Block B needs a test chat made or the owner's word. I opened its Delete chat box once and closed with B; still there.
- Settings changed and restored: tab_resume_mode resume_recent -> always_main -> resume_recent (confirmed in file); ask_mode speed -> strategy -> expert -> speed (confirmed). AI models filters: licence Tier 2 (open-weight) and "Deck essentials only" ticked, as found; both put back.
- Side effect: "Update AI & models" ran at once (no box; internet downloads is on and the site notice was seen). It finished in ~20 s: "Ollama 0.40.3 is up to date. 2 models refreshed." Models and version unchanged.
- Deck state now: plugin open on Main tab, ring on the Ask mode chip (Speed), no game, no model loaded, Ollama tab sections closed, Settings/Developer sections may be left open (fold state only).
- Quirks: tool outputs for walkTo/readFocus are huge; use deck_readPage with small expressions. The floating Open all button remembers where the ring came from (UP from it returns there). Reply style slider on the Ollama tab is a reply-length slider; the Ask mode is the chip beside the question box (LEFT x2 from Ask). Sweeps write runs/plan93-M1-*.json in the repo; deck_saveCheck wrote checks/P93-M1-FOLDED-RING-OLLAMA.json and checks/P93-M1-FOLDED-RING-SETTINGS.json (untracked). Screenshots also remain in screenshots/ (copies are in docs/test-evidence).
- Internet downloads key is capabilities.internet_downloads (true).
