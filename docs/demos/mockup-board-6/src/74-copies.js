/* ============================================================
   Board 6, tab 4: community copies of models under the licence setting.
   Read from the plugin's code, and run through its own rule for the example name:
   - the rule: model_policy.py. A name with a part before the slash is never "open source"; a copy of an open-source
     family comes out "unknown", which only the top level with its switch lets through. A copy of an open-weight
     family (a Mistral or Llama copy) comes out "open weight" and passes at the middle level already;
   - the rule is used when a question picks its model (ollama_ask_extras.py); a starred model goes first in the try
     order with no licence check (usePullModelPinForAsk.tsx) and is then filtered out all the same;
   - THE NAME BOX REFUSES A SLASH. Its pattern (mergePullModelCatalog.ts, the same one in the back end) allows
     lower-case letters, digits, dot, underscore, dash and one ":tag". So a community copy cannot be downloaded
     from the plugin today; the brief's "downloads fine" is not what the code does. Today is drawn as the code is;
   - the list: an installed model that is not in the built-in list sits under "Other installed (not in curated
     catalog)" with an empty licence slot, "Other" and a dash, and is never dimmed (PullModelsModal.tsx);
   - the reply when no model may answer: ollama_routing.py, word for word.
   Drawn, not from the code: the copy's name and size (examples), the sample question and answer (the kit's), and the
   new words of A and B (the line under the name box and the "Community copy" tag).
   ============================================================ */
const B6T4_COPY = "hf.co/someone/qwen3-4b-gguf";
const B6T4_STARTER = "gemma4:e2b-it-qat";
const B6T4_LEVELS = ["Open source only (recommended)", "Also try open-weight models", "Any installed model"];
const B6T4_NONE = `No model in bonsAI's routing list is installed on this Ollama host. Installed on this host: ${B6T4_COPY}. Open Ollama → Where AI runs and use Install Ollama or Browse models (Install the starter set), or pull ${B6T4_STARTER} (one small multimodal model for chat and screenshots).`;
const B6T4_LINE = {
  today: "Use lowercase letters, digits, . _ - and an optional :tag",
  A: "Community copy: bonsAI only uses it with “Any installed model”.",
  B: "Community copy of an open-source model: used from “Also try open-weight models” up.",
  C: "",
};
const B6T4_ST = { level: 0, alone: false };
const B6T4_DRAW = [];
/* may a question use the copy? today and A: the top level only; B: the middle level up; C: every level */
const b6t4Used = (opt, level) => opt === "C" || (opt === "B" ? level >= 1 : level === 2);

function b6t4Build(opt) {
  const s = { pulled: opt === "today", star: false, isNew: false };
  const boxBody = h("div", { class: "b6t4-box" });
  const box = deckFrame({ body: boxBody, header: false, height: 236 });
  box.classList.add("b6t4-wide");
  const mainBody = h("div", { class: "k2 b6t4-main", style: "display:contents" });
  const main = deckFrame({ body: mainBody, header: false, height: 236 });
  const note = h("p", { class: "b6t4-note", "aria-live": "polite" });
  const cell = (cls, ...kids) => h("div", { class: cls }, ...kids);

  function draw() {
    const used = b6t4Used(opt, B6T4_ST.level), alone = B6T4_ST.alone, ring = Deck.current(box), keep = ring && ring.dataset.k;
    const pull = h("button", { class: "b6t4-chip" + (opt === "today" ? " off" : ""), "data-stop": "", "data-row": "b6t4type", "data-k": "pull", "data-start": "", "aria-label": "Pull custom model tag" }, "Pull");
    pull.addEventListener("click", () => {
      if (opt === "today" || s.pulled) return;
      s.pulled = true; s.isNew = true;
      toast(box.querySelector(".qam"), h("span", {}, h("b", {}, "Pull started"), h("br"), `${B6T4_COPY} — watch progress in Settings.`));
      draw();
    });
    const star = h("button", { class: "b6t4-star", "data-stop": "", "data-k": "star", "aria-label": s.star ? `${B6T4_COPY} is used for Ask` : `Use ${B6T4_COPY} for Ask` }, s.star ? "★" : "☆");
    star.addEventListener("click", () => { s.star = true; draw(); });
    const pill = opt === "A" ? h("span", { class: "b6t4-pill o" }, "Unknown") : opt === "B" ? h("span", { class: "b6t4-pill o" }, "Community copy") : null;
    const copyRow = h("div", { class: "b6t4-row" + ((opt === "A" || opt === "B") && !used ? " dim" : "") },
      cell("", star), cell("c-m", h("span", { class: "c-n" }, B6T4_COPY), s.isNew ? h("span", { class: "b6t4-new" }, "New") : null, pill),
      cell("c-q", "2.5 GB"), cell("c-q", "Other"), cell("c-q", "—"), cell("c-d", "X"));
    const starterRow = h("div", { class: "b6t4-row" },
      cell("", h("span", { class: "b6t4-star", style: "display:grid;place-items:center" }, "☆")), cell("c-m", h("span", { class: "c-n" }, B6T4_STARTER), h("span", { class: "b6t4-pill" }, "FOSS")),
      cell("c-q", "4.3 GB"), cell("c-q", "Chat · Pictures"), cell("c-q", "★★★★★★"), cell("c-d", "X"));
    boxBody.replaceChildren(
      h("div", { class: "b6t4-title" }, "AI models"),
      h("div", { class: "b6t4-type" }, h("span", { class: "b6t4-field" }, B6T4_COPY), pull, h("button", { class: "b6t4-chip", "data-stop": "", "data-row": "b6t4type", "data-k": "close", "aria-label": "Close typing a model name by hand" }, "×")),
      h("div", { class: "b6t4-line" + (opt === "A" || opt === "B" ? " new" : "") }, B6T4_LINE[opt]),
      h("div", { class: "b6t4-head" }, ...["Pull", "Model", "Size", "Good for", "Deck fit", "Del"].map((t) => h("div", {}, t))),
      alone ? null : starterRow,
      h("div", { class: "b6t4-grp" }, "Other installed (not in curated catalog)"),
      s.pulled ? copyRow : h("div", { class: "b6t4-wait" }, "Press A on Pull: the copy is downloaded and lands here."),
      h("div", { class: "b6t4-legend" }, "Dimmed: your licence setting would not use it. ", h("i", {}, "Orange edge: slow on a Deck. Red edge: too big for this Deck.")));
    const back = keep && boxBody.querySelector(`[data-k="${keep}"]`);
    if (back) Deck.setRing(box, back, { scroll: false });

    /* what the next question gets, the copy being on the Deck */
    const copyWrites = used && (alone || s.star), fails = !used && alone;
    const reply = aBubble2([fails ? B6T4_NONE : SAMPLE.a[0]], { stopEach: false });
    if (fails) reply.classList.add("err");
    mainBody.replaceChildren(tabBar2(0), h("div", { class: "k2-gap" }), h("div", { class: "scroll k2-scroll" }, qBubble2(SAMPLE.q, { stop: false }), reply));
    const said = opt === "A" || opt === "B" ? " The line under the name and the tag in the list said so beforehand." : " Nothing on screen says why.";
    note.className = "b6t4-note" + (copyWrites ? "" : " bad");
    note.replaceChildren(...(
      copyWrites ? [h("b", {}, "The copy writes the answer.")]
      : used ? [h("b", {}, "The copy may be used, but the starter model answers first."), " It sits higher in the try order. Press A on the copy's star to put the copy first."]
      : fails ? [h("b", {}, "No answer."), " The copy is the only model on the Deck and this level will not use it." + said]
      : [h("b", {}, "The starter model writes the answer; the copy is passed over."), s.star ? " Its star is lit, and it is still passed over." : "", said]));
  }
  B6T4_DRAW.push(draw);
  draw();
  const first = opt === "today" ? "1 · The AI models box. The name box refuses the name; this copy was put on the Deck another way"
    : "1 · The AI models box: the copy's name is typed. Press A on Pull, then A on its star";
  return [h("p", { class: "b6t4-step" }, first), box, h("p", { class: "b6t4-step" }, "2 · The main screen: the next question, with the copy on the Deck"), main, note];
}

TABS.push({
  id: "t4", n: 4, name: "Community copies", stars: 3, wide: true,
  title: "Community copies of models: which licence level may use them, and whether bonsAI says so",
  today: [
    "A community copy is a model that someone repacked and published under their own name, such as hf.co/someone/qwen3-4b-gguf. Since the last round of work bonsAI counts a copy of an open-source family as “unknown”, not open source: anyone can publish under that name, and it is not the model the list was checked against.",
    "The name box in the AI models box refuses any name with a slash: Pull stays grey and a line about allowed letters shows. So today such a copy cannot be downloaded from bonsAI at all. It reaches the Deck only another way: typed in the Deck's own terminal, or on a PC that bonsAI is pointed at.",
    "Once it is there, the list shows it under “Other installed” with no licence tag, never dimmed, and its star can be lit. But at “Open source only” and at “Also try open-weight models” no question ever uses it, and nothing says why. It is used only at “Any installed model”, which needs the switch “Allow non-FOSS and unclassified Ollama tags (Tier 3)”.",
    "If the copy is the only model on the Deck, every question gets the long line that starts “No model in bonsAI's routing list is installed”.",
    "One thing to know: a copy of an open-weight family, such as a Mistral or Llama copy, already passes at the middle level. Only copies of open-source families are held back to the top level.",
  ],
  deciding: [
    "Which level may use a community copy of an open-source family: the top level only (Today and A), the middle level up (B), or every level (C, as it was before the last round).",
    "Whether bonsAI says so where the name is typed and in the list (A), or stays silent (Today).",
    "A, B and C are drawn with the name box taking such a name. That is extra work on top of each one: today the box refuses it. If the box should go on refusing, A's line can sit in the list alone.",
  ],
  howto: "Pick a licence level and what else is installed with the switches below; every card follows. In A, B and C click the wide panel and press <kbd>Enter</kbd> on Pull, then <kbd>↓</kbd> and <kbd>Enter</kbd> on the copy's star. The small panel under it shows what the next question gets, and the line below says who wrote it.",
  controls: () => {
    const group = (label, items, key) => h("div", { class: "b6t4-sw", role: "group", "aria-label": label }, label + ":", ...items.map(([text, v]) =>
      h("button", { type: "button", "aria-pressed": String(B6T4_ST[key] === v), onclick: (e) => {
        B6T4_ST[key] = v;
        $$("button", e.currentTarget.parentNode).forEach((b) => b.setAttribute("aria-pressed", String(b === e.currentTarget)));
        B6T4_DRAW.forEach((d) => d());
      } }, text)));
    return h("div", {}, group("Licence level", B6T4_LEVELS.map((t, i) => [t, i]), "level"), group("Also on the Deck", [["The starter model too", false], ["Only the copy", true]], "alone"));
  },
  options: [
    { id: "today", label: "Today", today: true, title: "Refused in the name box; silent in the list and when asking", desc: "The box will not take the name. A copy that got onto the Deck another way is listed with no tag, can be starred, and is never used below the top level, with no word why.", build: () => b6t4Build("today") },
    { id: "A", label: "A", title: "Same rule, but it says so", desc: "Still used only at the top level. A line under the name box says so before the download, and the list tags the copy “Unknown” and dims it while your level would pass it over. Costs one line and one tag, plus the name box taking such names.", build: () => b6t4Build("A") },
    { id: "B", label: "B", title: "Allowed from the middle level up", desc: "A copy of an open-source family is used at “Also try open-weight models” and above, the same as copies of open-weight families already are. Still passed over at “Open source only”, and it says so. Costs a new tag, plus the name box taking such names.", build: () => b6t4Build("B") },
    { id: "C", label: "C", title: "As before: counted as open source", desc: "The copy is used at every level, “Open source only” included, with no check of who published it. Nothing new to read. The cost is the promise: “Open source only” could then answer with a file nobody checked.", build: () => b6t4Build("C") },
  ],
});
