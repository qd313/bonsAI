/* Headline first: three real answers, today and with a headline.
   Answers: the workshop's kb-answer-sample-2026-11-02-p102-reading.md (replies 1, 3 and 7), word for word
   on the left. On the right only the opening changes; each headline is written from the answer's own
   later sentences. The popup's two lines are cut near where Steam cuts them (the plugin's own budgets:
   about 32 letters on the title line and 29 on the body line, breaking at a space). */
const EXAMPLES = [
  {
    game: "Fallout 4", chat: "Fallout 4 help", mode: "Strategy",
    q: "how do i kill a deathclaw early",
    today: ["When you run into a Deathclaw early on, remember that it's tough. It has a lot of health and resists a lot of damage, especially from energy weapons. The key is to manage the distance and use cover. Don't get too close; try to keep it at a range where you can control the fight and use your cover effectively."],
    head: "Keep your distance and fight it from cover.",
    rest: ["A Deathclaw has a lot of health and resists a lot of damage, especially from energy weapons. Don't get too close; try to keep it at a range where you can control the fight and use your cover effectively."],
  },
  {
    game: "Fallout 4", chat: "Fallout 4 help", mode: "Expert",
    q: "my power armor suddenly stopped working properly",
    today: [
      "The reason your power armor stopped working properly is likely related to the fusion core draining, or perhaps an issue with the armor itself.",
      "Here is a breakdown of what you need to check:",
      { ol: [
        "<b>Fusion Core Drain:</b> The frame of your power armor runs on a fusion core that drains over time, and it drains faster when you are sprinting or using V.A.T.S. If the core drains completely, you will still be able to walk, but you will lose V.A.T.S. and steady aim, and you will become over-encumbered.",
        "<b>Over-encumbrance:</b> If you are carrying too much junk, it can negatively affect the fusion core's performance or cause other issues.",
      ] },
    ],
    head: "Check the fusion core first: it has most likely run out.",
    rest: [
      "Here is what to check:",
      { ol: [
        "<b>Fusion Core Drain:</b> The frame of your power armor runs on a fusion core that drains over time, and it drains faster when you are sprinting or using V.A.T.S. If the core drains completely, you will still be able to walk, but you will lose V.A.T.S. and steady aim, and you will become over-encumbered.",
        "<b>Over-encumbrance:</b> If you are carrying too much junk, it can negatively affect the fusion core's performance or cause other issues.",
      ] },
    ],
  },
  {
    game: "Mario Kart 64", chat: "Mario Kart 64 help", mode: "Strategy", same: true,
    q: "How do I get a rocket start off the line in Mario Kart 64?",
    today: ["To get a rocket start, you need to hold the gas while the lights change from red to blue. If you start too early, you'll spin your tires and go slower than everyone else. Then, hop and hold to drift, and wiggle the control stick side to side while you hold it. When you let go of the drift while the smoke is orange, you'll get a mini-turbo boost on top of your initial speed."],
    head: "To get a rocket start, you need to hold the gas while the lights change from red to blue.",
    rest: ["If you start too early, you'll spin your tires and go slower than everyone else. Then, hop and hold to drift, and wiggle the control stick side to side while you hold it. When you let go of the drift while the smoke is orange, you'll get a mini-turbo boost on top of your initial speed."],
  },
];

function plain(html) { const d = document.createElement("div"); d.innerHTML = html; return d.textContent; }
function flat(paras) { return paras.map((p) => (typeof p === "string" ? plain(p) : p.ol.map(plain).join(" "))).join(" "); }

/* Take words up to a letter budget; add an ellipsis when the text goes on past the second line */
function take(words, budget) {
  const used = [];
  let n = 0;
  while (words.length && n + words[0].length + (used.length ? 1 : 0) <= budget) { n += words[0].length + (used.length ? 1 : 0); used.push(words.shift()); }
  return used.join(" ");
}
function popupLines(text) {
  const words = text.split(/\s+/);
  const title = take(words, 32);
  let body = take(words, 29);
  if (words.length) body = body.replace(/[,;:]$/, "") + "…";
  return { title, body };
}

function para(p, cls) {
  if (typeof p === "string") return h("p", { class: cls || null, html: p });
  return h("ol", {}, ...p.ol.map((li) => h("li", { html: li })));
}
function panel(ex, withHead) {
  const paras = withHead ? [h("p", { class: "hf-head" }, ex.head), ...ex.rest.map((p) => para(p))] : ex.today.map((p) => para(p));
  const body = mainTab2({
    transcript: [h("div", { class: "c-turn" }, qBubble2(ex.q, { stop: false }), h("div", { style: "height:6px" }), aBubble2(paras, { stopEach: false }))],
    chatName: ex.chat, chatNo: 1, chatCount: 3,
    dockEl: dock2({ chips: ["What should I build first?", "Where do I find fusion cores?"], game: ex.game, mode: ex.mode }),
  });
  return h("div", { class: "deck" }, h("div", { class: "qam", style: "height:454px" }, body));
}
function popup(text) {
  const l = popupLines(text);
  return h("div", { class: "hf-toast" }, h("i", {}, "b"), h("b", {}, l.title), h("span", {}, l.body));
}
function card(ex, withHead) {
  const text = withHead ? ex.head + " " + flat(ex.rest) : flat(ex.today);
  const title = withHead ? h("h3", {}, h("em", {}, "With Headline first")) : h("h3", {}, "Today");
  const sub = withHead
    ? (ex.same ? "This answer already opens with its point, so nothing changes." : "The same answer, opening with the thing to do.")
    : "As the AI wrote it on 2 November.";
  return h("section", { class: "hf-card" + (withHead && ex.same ? " hf-same" : "") }, title, h("p", {}, sub),
    h("div", { class: "hf-stage" }, panel(ex, withHead)),
    h("div", { class: "hf-label" }, "The popup over your game"),
    h("div", { class: "hf-stage" }, popup(text)));
}

const main = document.getElementById("hf-main");
EXAMPLES.forEach((ex, i) => {
  main.append(h("section", { class: "hf-ex" },
    h("h2", {}, `${i + 1}. “${ex.q}”`, h("small", {}, `${ex.game} · ${ex.mode} mode`)),
    h("div", { class: "hf-pair" }, card(ex, false), card(ex, true))));
});

document.querySelectorAll("[data-z]").forEach((b) => b.addEventListener("click", () => {
  document.documentElement.style.setProperty("--zoom", b.dataset.z);
  document.querySelectorAll("[data-z]").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
}));
document.querySelectorAll("[data-b]").forEach((b) => b.addEventListener("click", () => {
  document.body.classList.toggle("hf-bold", b.dataset.b === "1");
  document.querySelectorAll("[data-b]").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
}));
