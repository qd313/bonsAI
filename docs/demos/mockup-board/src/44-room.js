/* ============================================================
   Tab 4: more room for the chat, and adjustable text size
   Today: the panel is 454 tall; fixed rows take about 309; chat gets about 145.
   ============================================================ */
const ROOM_SIZES = [
  { px: 11, name: "Small" }, { px: 12, name: "Handheld (today)" }, { px: 14, name: "Large" }, { px: 16, name: "Couch" },
];
let roomFs = 12;

function roomTranscript() {
  return [
    h("div", { class: "turn" }, qBubble("what is a good first upgrade in Hollow Knight"), reasonLine(18),
      aBubble(SAMPLE.a), ...rateRow(), detailsLine()),
  ];
}

function readoutFor(root) {
  const out = h("div", { class: "readout" });
  root.updateReadout = () => {
    const sc = $(".scroll", root);
    if (!sc || !sc.clientHeight) return;
    const fs = parseFloat(getComputedStyle($(".ab", root) || root).fontSize) || roomFs;
    const room = sc.clientHeight;
    const lines = Math.floor((room - 16) / (fs * 1.25));
    const gain = room - 145;
    out.replaceChildren(
      "Chat gets ", h("b", {}, `${room} px`), gain > 2 ? ` (+${gain})` : "", ` · room for about `, h("b", {}, `${lines} lines`), ` of ${fs} px answer text`);
  };
  return out;
}

function roomMock(kind) {
  const tr = roomTranscript();
  let rowEl, dk;
  if (kind === "slim") {
    rowEl = h("div", { class: "chatrow slim" },
      h("span", { class: "main" }, "Hollow Knight help"), h("span", { class: "dots" }, h("span", { class: "plus" }, "+"), ...[0, 1, 2, 3, 4].map((i) => h("i", { class: i === 2 ? "on" : "" }))),
      h("span", { class: "game" }, "· no game"));
    dk = dock({ context: "" });
    $(".ctxline", dk).remove();
  } else if (kind === "merge") {
    rowEl = null;
    dk = dock();
  } else if (kind === "oneline") {
    rowEl = null;
    dk = dock();
    $(".ctxline", dk).remove();
  } else {
    rowEl = undefined;
    dk = dock();
  }
  const body = mainTab({ transcript: tr, dockEl: dk, chatName: "Hollow Knight help", rowEl });
  if (kind === "merge") {
    const strip = $(".tabbar-q", body);
    strip.replaceWith(h("div", { class: "mergebar" },
      h("div", { class: "mb-bars" }, ...[0, 1, 2, 3, 4, 5].map((i) => h("i", { class: i === 0 ? "on" : "" }))),
      h("div", { class: "mb-line" }, h("span", { class: "lb" }, "LB"),
        h("span", { class: "nm" }, h("b", {}, "Hollow Knight help"), h("span", { class: "dots" }, ...[0, 1, 2, 3, 4].map((i) => h("i", { class: i === 2 ? "on" : "" })))),
        h("span", { class: "lb" }, "RB"))));
  }
  if (kind === "oneline") {
    const strip = $(".tabbar-q", body);
    strip.replaceWith(h("div", { class: "oneline" }, h("span", { class: "cur" }, "MAIN"), h("span", { class: "sep" }, "›"),
      h("span", { class: "nm" }, "Hollow Knight help"), h("span", { class: "dots" }, ...[0, 1, 2, 3, 4].map((i) => h("i", { class: i === 2 ? "on" : "" }))),
      h("span", { class: "game" }, "no game")));
  }
  const root = deckFrame({ body });
  const ro = readoutFor(root);
  if (kind === "tuck") {
    root.classList.add("tuck");
    root.addEventListener("ringmove", (e) => {
      const inDock = !!e.detail.el.closest(".dock");
      root.classList.toggle("reading", !inDock);
      setTimeout(() => root.updateReadout(), 220);
    });
    root.classList.add("reading");
  }
  if (kind === "lens") {
    root.addEventListener("deckkey", (e) => {
      if (e.detail.key !== "Y" && !(e.detail.key === "B" && $(".lens", root))) return;
      e.preventDefault();
      const open = $(".lens", root);
      if (open) { open.remove(); return; }
      const cur = Deck.current(root);
      const src = cur && cur.closest(".ab") ? cur : $(".ab [data-stop]", root);
      const lens = h("div", { class: "lens" }, h("div", { class: "lens-text", html: src.innerHTML }), h("div", { class: "lens-hint" }, "Y or B to close"));
      $(".qam", root).append(lens);
    });
  }
  // the answer bubble's first section is a good place to start
  const first = $(".ab [data-stop]", root);
  if (first) { $("[data-start]", root)?.removeAttribute("data-start"); first.setAttribute("data-start", ""); }
  setTimeout(() => root.updateReadout(), 50);
  const extra = kind === "lens" ? h("p", { class: "readout" }, "Put the ring on part of the answer, then press ", h("b", {}, "Y"), " (the Y key).") : null;
  return [root, ro, extra];
}

/* ---- text size: Settings mock-ups ---- */
function settingsFrame(inner) {
  const body = h("div", { style: "display:contents" });
  body.append(tabStrip("SETTINGS"), inner);
  return deckFrame({ body });
}
function sizePreview(fs) {
  return h("div", { class: "size-prev" }, h("div", { class: "ab", style: `--ans-fs:${fs}px` }, h("p", {}, "You gotta head down to the ", h("b", {}, "City of Tears"), " and hit the ", h("b", {}, "Nailsmith"), ". That first upgrade costs Geo alone.")));
}
function sizeMock(kind) {
  const inner = h("div", { class: "scroll set-scroll" });
  const root = settingsFrame(inner);
  const lines = (fs) => Math.floor((145 - 16) / (fs * 1.25));
  if (kind === "two") {
    let cur = 0;
    const steps = [{ n: "Handheld", fs: 12, d: "Arm's length: the Deck in your hands." }, { n: "Couch", fs: 15, d: "TV distance: every word bigger." }];
    const draw = () => {
      inner.replaceChildren(h("div", { class: "q-section-title" }, "Text size"),
        h("div", { class: "two-sizes" }, ...steps.map((s, k) => {
          const b = h("button", { class: "size-card" + (cur === k ? " on" : ""), "data-stop": "", "data-row": "sz" }, h("span", { class: "aa", style: `font-size:${s.fs + 6}px` }, "Aa"), h("b", {}, s.n), h("small", {}, s.d));
          b.addEventListener("click", () => { cur = k; draw(); Deck.setRing(root, $$(".size-card", inner)[k]); });
          return b;
        })),
        sizePreview(steps[cur].fs),
        h("p", { class: "set-note" }, `Chat shows about ${lines(steps[cur].fs)} lines at this size.`),
        h("div", { class: "q-row" }, h("span", { class: "grow" }, "Screenshot quality", h("small", {}, "the next setting down")), h("span", { class: "q-toggle on" })));
    };
    draw();
  } else if (kind === "slider") {
    let k = 1;
    const draw = () => {
      const s = ROOM_SIZES[k];
      const slider = h("div", { class: "q-slider", "data-stop": "", role: "slider", "aria-valuenow": k },
        h("div", { class: "track" }, h("i", { style: `width:${(k / 3) * 100}%` }), h("span", { class: "knob", style: `left:${(k / 3) * 100}%` })),
        h("div", { class: "ticks" }, ...ROOM_SIZES.map((r, i) => h("span", { class: i === k ? "on" : "" }, r.name.replace(" (today)", "")))));
      slider.addEventListener("deckkey", (e) => {
        if (e.detail.key === "Left" || e.detail.key === "Right") { e.preventDefault(); k = Math.max(0, Math.min(3, k + (e.detail.key === "Left" ? -1 : 1))); draw(); Deck.setRing(root, $(".q-slider", inner), { scroll: false }); }
      });
      slider.addEventListener("click", (e) => {
        const r = $(".track", slider).getBoundingClientRect();
        if (e.clientX) { k = Math.max(0, Math.min(3, Math.round(((e.clientX - r.left) / r.width) * 3))); draw(); Deck.setRing(root, $(".q-slider", inner), { scroll: false }); }
      });
      inner.replaceChildren(h("div", { class: "q-section-title" }, "Text size"),
        h("div", { class: "set-label" }, h("b", {}, s.name), h("span", {}, `${s.px} px answer text`)), slider,
        sizePreview(s.px),
        h("p", { class: "set-note" }, `Chat shows about ${lines(s.px)} lines at this size. Icons, buttons and the panel width stay the same.`));
    };
    draw();
  } else if (kind === "quick") {
    // a Main tab where the answer itself carries A− and A+
    const sc = h("div", { class: "scroll" });
    let fs = 12;
    const ab = aBubble(SAMPLE.a);
    const minus = h("button", { class: "sz-btn", "data-stop": "", "data-row": "rate" }, "A−");
    const plus = h("button", { class: "sz-btn", "data-stop": "", "data-row": "rate" }, "A+");
    const apply = () => { ab.style.setProperty("--ans-fs", fs + "px"); };
    minus.addEventListener("click", () => { fs = Math.max(10, fs - 1); apply(); });
    plus.addEventListener("click", () => { fs = Math.min(18, fs + 1); apply(); });
    const rate = rateRow();
    $(".spk", rate[1]).before(minus, plus);
    sc.append(h("div", { class: "turn" }, qBubble(SAMPLE.q), reasonLine(18), ab, ...rate, detailsLine()));
    const body = mainTab({ transcript: [], chatName: "Hollow Knight help" });
    body.scroller.replaceWith(sc);
    const r2 = deckFrame({ body });
    const first = $(".ab [data-stop]", r2);
    $("[data-start]", r2)?.removeAttribute("data-start");
    plus.setAttribute("data-start", "");
    return [r2, h("p", { class: "readout" }, "Only the answer's words change size. Your size is kept for every answer.")];
  }
  return root;
}

function roomSizeControl() {
  const wrap = h("div", { class: "sizectl", role: "group", "aria-label": "Answer text size for every mock-up on this tab" },
    h("span", { class: "lbl" }, "Answer text size on this tab:"),
    ...ROOM_SIZES.map((s) => {
      const b = h("button", { type: "button", "aria-pressed": String(s.px === roomFs) }, `${s.px} px`, h("small", {}, s.name.replace(" (today)", "")));
      b.addEventListener("click", () => {
        roomFs = s.px;
        for (const x of $$("button", wrap)) x.setAttribute("aria-pressed", String(x === b));
        $("#tab-t4").style.setProperty("--ans-fs", s.px + "px");
        for (const d of $$("#tab-t4 .opt[data-group='room'] .deck")) d.updateReadout && d.updateReadout();
      });
      return b;
    }));
  return wrap;
}

TABS.push({
  id: "t4", n: 4, name: "More room + text size", stars: 3,
  title: "More room for the chat, and a text size that really changes",
  today: [
    "On the Deck's own screen the panel is 454 px tall. The rows that never scroll take about 309, so the chat gets about 145: roughly one short question and five lines of answer.",
    "Rows named for shrinking or hiding: the chat row, the chip row and the context line.",
    "The text size setting is hidden for 0.6.0. Its Couch step mostly grows spacing and icons; the words stay the same size.",
  ],
  deciding: [
    "Which rows shrink, merge or hide, so the chat gets more room.",
    "Whether a text size setting comes back, how many steps it has, and where it lives.",
    "Bigger words means fewer lines. Use the size buttons above the mock-ups to see the trade-off in every panel at once.",
  ],
  howto: "Change the answer text size with the buttons just below, and watch the line count under each panel. In option B, walk Down into the question box to see the dock come back.",
  controls: roomSizeControl,
  onShow: () => { for (const d of $$("#tab-t4 .deck")) d.updateReadout && d.updateReadout(); },
  options: [
    { id: "today", group: "room", groupTitle: "Room for the chat", label: "Today", today: true, title: "What ships now", desc: "Chat row, chip row, question box, Ask and the context line all stay put.", build: () => roomMock("today") },
    { id: "A", group: "room", label: "A", title: "Slimmer rows", desc: "The chat row shrinks to one line with its dots beside the name, and the game name moves up into it, so the context line goes.", build: () => roomMock("slim") },
    { id: "B", group: "room", label: "B", title: "Tuck the dock while reading", desc: "While the ring is in the chat, the chips, Ask and context line tuck away and the question box shrinks to one line. Walk Down into it and everything comes back.", build: () => roomMock("tuck") },
    { id: "C", group: "room", label: "C", title: "The chat name moves into the tab bar", desc: "One row holds LB, the chat's name and its dots, and RB. The tab dashes become a thin line on top. The chat row is gone.", build: () => roomMock("merge") },
    { id: "W1", group: "room", label: "Wild 1", wild: true, title: "A lens", desc: "Keep small text for room, and press Y to blow up just the part of the answer the ring is on. Y or B puts it back.", build: () => roomMock("lens") },
    { id: "W2", group: "room", label: "Wild 2", wild: true, title: "One info line", desc: "The tab name, the chat's name, its dots and the game share one thin line at the top. The context line goes.", build: () => roomMock("oneline") },
    { id: "TA", group: "size", groupTitle: "Text size", label: "Size A", title: "Two sizes that really grow the words", desc: "Today's Handheld and Couch, but Couch makes the words bigger (12 to 15 px), with a preview right under it.", build: () => sizeMock("two") },
    { id: "TB", group: "size", label: "Size B", title: "A four-step slider", desc: "Small, Handheld, Large, Couch. Left and Right move it; the preview and line count change as you go.", build: () => sizeMock("slider") },
    { id: "TC", group: "size", label: "Size C", title: "A− and A+ on the answer itself", desc: "No trip to Settings. Two small buttons beside Helpful and Not really change only the answer's words.", build: () => sizeMock("quick") },
  ],
});
