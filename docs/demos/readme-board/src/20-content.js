/* ============================================================
   The README's content, as the new page would say it. One list of features, each with a title,
   a one-line summary, a longer "how it works" text, the stand-in picture and the clip's shape.
   The drawings on every tab are built from this one list, so the words are the same everywhere.
   ============================================================ */
const CAPTION = "Filmed on a Steam Deck in real time, with the AI running on the Deck itself.";

const FEATURES = [
  { id: "ask", title: "Ask about the game you're playing",
    short: "bonsAI knows which game is running. Ask about a boss, a level or a puzzle.",
    long: `Open the menu mid-game and type, or pick a suggestion chip; the game's name goes in with your question. Pick a mode on the question box: <b>Speed</b> for a quick reply, <b>Strategy</b> for coaching like a strategy guide, <b>Expert</b> for the most effort and detail. Switch on <b>Thinking</b> and you can watch the steps while it works. The answer streams in as it's written.`,
    still: "ask-about-your-game", shape: "plugin", len: "1:52", main: true,
    note: "This is the long Main-tab video: new chat, the three modes, a question about the level, the thinking steps, the answer streaming in, Show reasoning, your notes, the chips and a branch pick." },
  { id: "wiki", title: "Notes from the game's wiki",
    short: "Answers can use notes from community wikis, 38 games so far, and it works offline.",
    long: `The knowledge library is a one-time download. When an answer uses a note, it says where the note came from, and you can open the note under the answer.`,
    still: "show-details", shape: "plugin", len: "0:40" },
  { id: "notes", title: "Your own notes",
    short: "Tell bonsAI what matters to you and it remembers.",
    long: `Say something worth keeping, like "I'm on a Steel Soul run", and a small card under the answer offers to keep it, for this game or for every game. Later answers say <b>Read 1 of your notes</b>; press that line to switch a note off or remove it.`,
    still: null, shape: "plugin", len: "0:35" },
  { id: "spoiler", title: "Spoilers stay hidden until you ask",
    short: "In Strategy mode, anything that looks like a spoiler is covered.",
    long: `Press <b>A</b> on a cover to open it. This works on a best-effort basis and can miss things.`,
    still: "spoiler", shape: "plugin", len: "0:20" },
  { id: "where", title: "“Where are you at?”",
    short: "Strategy can ask where you are in the game, then gives you a checklist of steps.",
    long: `Tick off steps as you go. Your progress is saved on the Deck, for each game.`,
    still: "strategy-checklist", shape: "plugin", len: "0:50" },
  { id: "shot", title: "Ask about a screenshot",
    short: "Take a screenshot and ask what's on screen: a puzzle, a menu, an error message.",
    long: `Press the paperclip on the question box, pick <b>Close menu &amp; take screenshot</b>, then ask. This needs a model that can see pictures; the starter model can.`,
    still: "ask-about-a-screenshot", shape: "screen", len: "1:05" },
  { id: "search", title: "Search your chats, settings and notes",
    short: "A Search tab to the left of Main finds things without any AI.",
    long: `One find box looks through your chats, the game notes and even Steam's own settings. Type "brightness" and jump straight to that Steam setting.`,
    still: "find-a-setting", shape: "screen", len: "0:30" },
  { id: "ready", title: "Close the menu, keep playing",
    short: "Close the menu while an answer is being written. A popup tells you when it's ready.",
    long: `The answer keeps going in the background. The <b>Reply ready</b> popup shows its first lines, and the full answer waits in the chat.`,
    still: "reply-ready", shape: "screen", len: "0:45" },
  { id: "chats", title: "Saved chats",
    short: "Keep up to ten chats and flip between them with the shoulder buttons.",
    long: `At ten, <b>New chat</b> asks which chat to delete first, and nothing is deleted without the <b>Delete chat</b> box. When a chat gets long, bonsAI sums up the older part so it isn't forgotten, and you can ask it to sum up at any time.`,
    still: "switch-chats", shape: "plugin", len: "0:30" },
  { id: "voice", title: "Talk instead of typing",
    short: "Press the mic button and talk. Your speech becomes text on the Deck itself.",
    long: `Words appear as you talk. When you stop, bonsAI reads the whole recording once more and tidies the text, which takes a couple of seconds. The recording is deleted as soon as that's done.`,
    still: null, shape: "plugin", len: "0:25" },
  { id: "details", title: "See how it answered",
    short: "Show details under any answer shows which model wrote it and which notes it used.",
    long: `The <b>Session</b> tab inside it holds the chat's history and the <b>Sum up this chat</b> button.`,
    still: "show-details", shape: "plugin", len: "0:15" },
];

const INTRO = {
  oneLiner: `A helper for your Steam Deck that answers questions about your games, using an AI that runs on your own Deck or your own PC.`,
  where: `bonsAI lives in the Deck's <b>Quick Access Menu</b>, the panel the <b><code>...</code></b> button opens. Press it mid-game, ask how to beat a boss or why the game stutters, and keep playing.`,
  heroAlt: "bonsAI open beside a game on a Steam Deck, answering a question about it",
};

const FREE = {
  lead: `bonsAI is free and open source. It runs on your own hardware, your privacy stays yours. No paid API, no data centers.`,
  points: [
    `<b>Your questions stay on your hardware</b>, on your Deck, on your own PC, or wherever you point it.`,
    `<b>No account, no cloud service, nothing collected.</b>`,
    `<b>Every line of code is here to read.</b>`,
  ],
  internet: [
    `Installing Ollama (the program that runs the AI) and its models: <b>ollama.com</b>, and <b>GitHub</b> for the program itself.`,
    `The knowledge library: <b>Hugging Face</b>, with <b>GitHub</b> as backup.`,
    `Voice input: the speech engine from <b>GitHub</b>, the tools to build it from <b>Ubuntu's servers</b> and the speech model from <b>Hugging Face</b>.`,
  ],
  after: `Nothing downloads until you switch on <b>Internet downloads</b> on the Permissions tab, and bonsAI tells you where each download comes from before it starts. Links inside answers open only when you tap them.`,
};

const BEFORE = [
  `<b>AI answers can be wrong.</b> Treat them as suggestions, and check anything that matters.`,
  `<b>Running the AI on the Deck slows your game down</b>, because they share the same chip. A PC on your home network is much faster.`,
  `<b>This is a new release.</b> A few problems are known; see <a href="#">known problems</a>.`,
];

const NEED = [
  `A Steam Deck with <b><a href="#">Decky Loader</a></b> installed. Decky is a free add-on that lets plugins like bonsAI into the Quick Access Menu.`,
  `Somewhere to run the AI: the Deck itself, or a PC on your home network. bonsAI installs the program it needs, <b>Ollama</b>, on the Deck for you.`,
  `About 4 GB free on the Deck for the first AI model, if it runs on the Deck.`,
];

const INSTALL = {
  lead: `bonsAI isn't in Decky's plugin store, because the store doesn't accept plugins built on an AI model. You install it from this page instead. It takes a few minutes.`,
  steps: [
    { title: "Add bonsAI to Decky", body: `<ol><li>Press <b><code>...</code></b>, open <b>Decky</b> (the plug icon), then the <b>gear</b> for Decky's settings.</li><li>Under <b>General</b>, switch on <b>Developer mode</b>. A <b>Developer</b> section appears.</li><li>In <b>Developer</b>, find <b>Install Plugin from URL</b>, paste this link and press <b>Install</b>:<pre><code>https://github.com/qd313/bonsAI/releases/latest/download/bonsAI.zip</code></pre></li><li>bonsAI now shows in the Decky list. Open it.</li></ol>` },
    { title: "Allow downloads", body: `<p>Open the <b>Permissions</b> tab and switch on <b>Internet downloads</b>. Everything is off on a fresh install, so nothing downloads without your say-so.</p>` },
    { title: "Choose where the AI runs", still: "where-ai-runs", body: `<p>Open the <b>Ollama</b> tab. Pick one:</p><ul><li><b>On the Deck</b> (works anywhere, slower in games): switch on <b>Run AI on this Deck</b>, then press <b>Install Ollama</b>. When it asks whether to add the starter set too, say yes. About 4.5 GB in all.</li><li><b>On a PC on your home network</b> (much faster): install <a href="#">Ollama</a> on the PC and download a model there. Then type the PC's address into <b>PC address</b> on the Deck, something like <code>http://192.168.1.20:11434</code>, and press <b>Test connection</b>.</li></ul>` },
    { title: "Ask something", body: `<p>Open the <b>Main</b> tab, pick a suggestion chip or type a question, and press <b>ask</b>.</p><p><b>Optional:</b> for notes from game wikis, open <b>Ollama → Knowledge base (offline)</b>, switch on <b>Use local knowledge base</b> and press <b>Download knowledge base</b>.</p>` },
  ],
};

const TAIL = {
  help: [
    `The <b><a href="#">user guide</a></b> explains every tab and setting.`,
    `<b><a href="#">Troubleshooting</a></b> covers network, screenshot and permission problems.`,
    `Found a bug or have an idea? <a href="#">Open an issue on GitHub</a>. Please say which bonsAI version you have (the small number beside the bonsAI title) and where the AI runs.`,
  ],
  build: `Want to help, or build it yourself? Start with the <a href="#">development guide</a>.`,
  licence: [
    `<b>The code</b> is <a href="#">Apache-2.0</a>. A little of it comes from the Decky plugin template, under its own BSD license; <a href="#">NOTICE</a> has the details.`,
    `<b>The game notes</b> and the <b>knowledge library</b> are CC BY-SA 4.0. Many notes are reworded from fan wikis, and each keeps a link to its source and that wiki's license.`,
    `<b>Other people's code</b> that bonsAI uses keeps its own license. The download carries all of them.`,
  ],
  beer: `Supporting my Steam sale habit. Scan or tap:`,
};
