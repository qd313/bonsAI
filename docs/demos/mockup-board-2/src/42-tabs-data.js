/* ============================================================
   Tab 2 data: the five other tabs, row by row, as the code has them on 2026-10-11
   (OllamaTab.tsx, SettingsTab.tsx, PermissionsTab.tsx, DeveloperTab.tsx, AboutTab.tsx and
   their parts). State drawn: the AI runs on this Deck, the Developer tab is on, the
   knowledge base is installed, scramble is off.
   desc: the row's longer text. how: where today puts it
     "decky"  under the label, inside Steam's own switch row
     "above"  bonsAI's own help line above the control
     "below"  bonsAI's own help line under the control
   ============================================================ */
const sec = (label) => ({ t: "sec", label });
const tog = (label, desc, on, o = {}) => ({ t: "tog", label, desc, on, how: o.how || "decky", ...o });
const choice = (label, opts, sel, o = {}) => ({ t: "choice", label, opts, sel, ...o });
const slider = (label, head, stops, sel, o = {}) => ({ t: "slider", label, head, stops, sel, ...o });
const sbtn = (label, o = {}) => ({ t: "sbtn", label, ...o });
const gbtn = (label, o = {}) => ({ t: "gbtn", label, ...o });
const line = (html, cls = "") => ({ t: "line", html, cls });
const para = (html, o = {}) => ({ t: "para", html, ...o });

const TERSE = "Speed mode only. Keeps each answer to three short lines and ends it with a menu of choices to dig deeper. It shortens what you see, not how hard the AI thinks, and the Reply style slider is ignored while it is on. Strategy and Expert answers are not changed.";

const TAB_DATA = {
  Ollama: { icon: 1, measured: 1718, items: [
    sec("Where AI runs"),
    tog("Run AI on this Deck", "Off: use a PC on your home network. On: AI runs on this device.", true, { how: "below" }),
    tog("Start the AI with the Deck", "Starts the local AI when the Deck starts, and lets it keep the answering part and the note-searching part in memory at once — so questions come back about seven tenths of a second sooner.", true, { how: "below", status: "Set up and answering questions." }),
    line("<b>Local Ollama setup</b>&nbsp;&nbsp;Installed: 7", "lbl"),
    gbtn("Update AI & models", { cyan: true, desc: "Install the official daemon, restart the service if needed, then pull models. Prefer stable Wi‑Fi.", how: "below", group: "setup" }),
    gbtn("Browse models…", { cyan: true, group: "setup" }),
    { t: "conn", label: "Ollama runs on this Deck at", addr: "127.0.0.1:11434", btn: "Test connection" },
    line("Connected · Ollama v0.34.1 · 7 models", "ok"),
    sec("Knowledge base (offline)"),
    tog("Use local knowledge base", "Ground Strategy and troubleshooting Asks with downloaded offline cards (keyword or Keyword + meaning search).", true),
    line('<span class="ok">Installed</span> — version 2026.09.27<br><span class="dim">~/.bonsai/rag/library</span>', "info"),
    { t: "pair", a: "Update knowledge base", b: "Remove", red: true },
    sec("Reply style"),
    slider("Reply style", "Reply style", ["Caveman", "Balanced", "Detailed"], 1, { desc: "Bullet-first vs paragraph depth. Ask mode and model routing unchanged.", how: "above" }),
    tog("Terse mode", TERSE, false),
    choice("Thinking", ["Off", "Brief", "Balanced", "Deep"], 0, { descs: ["Answer straight away. Fastest.", "A moment of reasoning first, shown on screen as it happens.", "More reasoning on harder questions, shown on screen as it happens.", "Most reasoning, shown on screen as it happens. Noticeably slower on a Deck."], how: "above", titled: true }),
    sec("Connection tuning"),
    tog("Custom timeouts", null, false, { status: 'Default: <span class="amb">Warning 60s</span> <span class="dim">|</span> <span class="cy">Timeout 180s</span>' }),
    slider("Keep models loaded", "Unload delay", ["0", "15s", "30s", "1m", "2m", "3m", "5m", "15m", "30m", "45m", "60m", "120m", "240m"], 6, { desc: "How long Ollama keeps the model in memory after a prompt (VRAM on the host).", how: "above", titled: true }),
    sec("AI models"),
    gbtn("AI models… — Open source only (recommended)"),
  ] },

  Settings: { icon: 2, measured: 2133, items: [
    sec("Screenshot quality"),
    choice("Screenshot quality", ["Save memory", "Balanced", "Best detail"], 0, { desc: "For vision questions — lower quality uses less memory.", how: "above", tall: true }),
    sec("Text size"),
    choice("Text size", ["Small", "Normal", "Large"], 1, { desc: "How big the words in the chat are: your questions, the answers and the Show details text. The tabs and Settings stay the same.", how: "above" }),
    sec("Remember what I typed"),
    tog("Remember what I typed", "On puts back what you typed in the question box when you reopen the plugin. Off clears it each time.", false),
    sec("Story spoilers (Strategy mode)"),
    tog("Hide spoilers until I tap", "Strategy mode masks spoiler sections until you choose to reveal them.", true),
    sec("Suggestion chips"),
    tog("Show one chip instead of two", "The suggestion row above the question box shows one chip with the whole column, so its label reads more before it needs to scroll. Off shows two chips side by side — the default.", false),
    sec("Voice input"),
    { t: "stack", label: "STT model", opts: ["tiny.en (faster, less accurate)", "base.en (more accurate, recommended)"], sel: 1, desc: "Local speech-to-text for the Ask bar mic button. Enable the microphone permission in Permissions first. Audio is processed on-device and never saved.", how: "above" },
    line("Engine: whisper-cli ready<br>Model: base.en ready<br>Voice engine is ready for on-device transcription.", "info"),
    gbtn("Reinstall voice engine"),
    sec("AI voice & personality"),
    tog("AI voice & personality", "Preset, random, or custom character tone in replies.", true),
    gbtn("Random", { picker: true }),
    { t: "accent", label: "Accent intensity", value: "Default", desc: "Default — use the menu for full descriptions." },
    sec("Data"),
    tog("Show Developer tab", "Adds a Developer tab with logs, exports, and advanced tuning. Default off.", true),
    { t: "pair", a: "Clear cache...", b: "Clear all data..." },
  ] },

  Permissions: { icon: 3, measured: 786, items: [
    sec("Permissions"),
    para("High-impact actions stay off until you enable them here. AI requests on your home network are not gated by these toggles. Model policy and routing live on the <b>Ollama</b> tab. Docs, GitHub, and Steam settings links always open when you tap them.", { intro: true }),
    tog("Read game & screenshot context", "Lets bonsAI attach Steam screenshots and, on troubleshooting Asks, auto-attach local game/Proton log excerpts. One permission for screenshots and logs.", true),
    tog("Save files to Desktop", "Notes, logs, and exports under Desktop/bonsAI_logs. Off blocks those writes.", true),
    tog("Voice input (microphone)", "Record from this device's microphone for local speech-to-text in the Ask bar. Audio stays on-device and is never saved.", true),
    tog("Internet downloads", "Lets bonsAI download Ollama, AI models, voice models and the knowledge library, and refresh the recommended-models list. Off, nothing downloads.", true),
  ] },

  Developer: { icon: 4, measured: 2820, items: [
    sec("Knowledge base"),
    sbtn("Install seed knowledge base", { desc: "Public HF/GitHub download is not live yet. <b>build.ps1</b> copies a seed corpus (DRG Survivor + OoT alias sample) to the Deck. Install it into <code>~/.bonsai/rag</code> for Phase 1 testing. Hybrid retrieval also needs vectorized seed + <b>nomic-embed-text</b> on your Ask Ollama host.", how: "above" }),
    tog("Hybrid retrieval (meaning search)", "On, the knowledge base ranks cards by keyword match and meaning together. Off, it uses keyword match only — cards still attach, and Show details says Keyword search (hybrid disabled). Turn it off to tell a retrieval problem apart from an embedding one.", true),
    sec("Diagnostics"),
    tog("On-screen debug HUD", "Shows a small translucent log at the bottom of the plugin (focus, tab changes, ingest). Off by default so Settings and connection UI stay readable.", false),
    tog("Warm the Ask model at boot", "Loads the default Ask model into memory when the plugin starts, so the first question skips the cold load. Only ever warms a model of 3B parameters or under, and skips quietly if memory is tight — no error, no stuck status line.", false),
    sbtn("Jump to Steam Input (running game)", { desc: "Experimental: opens per-game controller configuration for the running game. Requires a focused/running title.", how: "above", wrap: true }),
    line("Captured runtime errors appear below.<br>No errors captured.", "grey"),
    sec("Navigation"),
    choice("Tab to open on (D15)", ["A · Main", "B · Resume", "C · 5 min"], 1, { cyan: true, titled: true, how: "above", descs: [
      "Every reopen starts on Main, whatever tab you left from. Takes effect the next time you close and reopen the plugin.",
      "Reopen lands on the tab you left. Shipped default. Takes effect the next time you close and reopen the plugin.",
      "Reopen resumes the tab within 5 minutes, then falls back to Main. Takes effect the next time you close and reopen the plugin."] }),
    sec("Logging & exports"),
    choice("App activity logging to Desktop", ["Off", "Default", "Verbose"], 0, { cyan: true, titled: true, how: "above", descs: [
      'No app activity log file on Desktop. Writes <span class="cy">bonsai-app-YYYY-MM-DD.log</span> under Desktop/bonsAI_logs/.',
      'Summary events (connection tests, asks, settings changes). Writes <span class="cy">bonsai-app-YYYY-MM-DD.log</span> under Desktop/bonsAI_logs/.',
      'Default events plus RPC details, setup log lines, and frontend errors. Writes <span class="cy">bonsai-app-YYYY-MM-DD.log</span> under Desktop/bonsAI_logs/.'] }),
    tog("Auto-save chat to Desktop notes", "Append Q+A to Desktop/bonsAI_logs/bonsai-chat-YYYY-MM-DD.md (UTC). Needs Save files to Desktop.", false),
    tog("Verbose Ask logging to Desktop notes", "Full Ollama trace to bonsai-ask-trace-*.md under Desktop/bonsAI_logs. Can be large/sensitive.", false),
    tog("Force session RAG chips", "Always fill preset carousel slots from the knowledge base instead of a 30% chance each, and reseed the chips immediately. For verifying SESSION-RAG-CHIPS-01 without waiting on the roll. Needs Use local knowledge base on and a covered game running.", false,
      { post: "<b>Frozen test chips</b><br>None pinned — the carousel is sampling normally. A pinned batch replaces the carousel with exact questions in order and stops it reseeding, so a QA row is one press per case instead of typing the sentence. Set the list from the host while preparing a run." }),
    sec("Animations"),
    choice("Preset suggestions", ["fade", "carousel", "static", "decode"], 0, { cyan: true, titled: true, small: true }),
    tog("Scramble animation", "New answer text scrambles through symbols for a moment before it settles into letters, like the decode chips. Off by default.", false),
  ] },

  About: { icon: 5, measured: 915, items: [
    sec("About bonsAI"),
    para("Version 0.5.0", { about: true }),
    para("Backend Ollama Node for Steam (A.I.) - An AI assistant embedded in the Steam Deck Quick Access Menu. Ask questions, search settings, and get game-specific performance suggestions (TDP/GPU clock recommendations are read-only — apply them yourself in Steam's Performance tab if you choose).", { about: true, long: true }),
    para("This plugin is in beta. AI-generated recommendations — especially TDP and performance changes — should be verified before relying on them. Use at your own risk!", { about: true, beta: true, long: true }),
    sec("Reply language"),
    { t: "dropdown", label: "Language", value: "Follow system", desc: "Plugin UI may stay partly English. Ask replies and translated strings follow this language.", how: "above", pre: '<span class="cy">Steam client language: English</span><br><b>Language: Follow system</b>' },
    sec("Links"),
    sbtn("GitHub", { link: true }),
    sbtn("Built on Ollama!", { link: true }),
    sbtn("Bugs & Feature Requests", { link: true }),
    { t: "qr" },
    sbtn("Support my Steam Sale habit", { link: true }),
  ] },
};
const TAB_NAMES = Object.keys(TAB_DATA);
