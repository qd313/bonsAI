/* ============================================================
   Board 6: the on-screen D-pad (added 2026-11-19).
   The kit drives a panel from the keyboard only (arrow keys, Enter, Esc, X). On a phone, a tablet or any
   screen without a keyboard that leaves the panels dead, and a choice about presses cannot be felt.
   This bar sends the same presses to the panel in use: the one last tapped, or, when none is, the panel
   nearest the middle of the screen.
   Every name here starts with b6pad or b6Pad so it cannot clash with a tab's file.
   ============================================================ */
(function b6PadStart() {
  const say = h("span", { class: "b6pad-say" }, h("b", {}, "No keyboard? "), "Tap a panel, then press here.");
  const key = (label, k, name) => h("button", { type: "button", "data-b6pad": k, "aria-label": name }, label);
  const pad = h("div", { class: "b6pad", role: "group", "aria-label": "On-screen D-pad for the panels" },
    say, key("◀", "Left", "Left"), key("▲", "Up", "Up"), key("▼", "Down", "Down"), key("▶", "Right", "Right"),
    h("span", { class: "b6pad-gap" }), key("A", "A", "A"), key("B", "B", "B"), key("X", "X", "X"));

  const shown = (el) => el && document.body.contains(el) && el.getClientRects().length > 0;
  function panelInUse() {
    if (shown(Deck.active)) return Deck.active;
    let best = null, bd = Infinity;
    for (const d of $$(".deck")) {
      if (!shown(d)) continue;
      const r = d.getBoundingClientRect();
      const dist = Math.abs(r.top + r.height / 2 - innerHeight / 2) + Math.abs(r.left + r.width / 2 - innerWidth / 2);
      if (dist < bd) { bd = dist; best = d; }
    }
    if (best) Deck.activate(best);
    return best;
  }

  // The kit lets go of the panel in use on any tap outside a panel; a tap on this bar must not do that,
  // and must not take the keyboard away from the panel either.
  pad.addEventListener("pointerdown", (e) => { e.stopPropagation(); });
  pad.addEventListener("mousedown", (e) => { e.preventDefault(); });
  pad.addEventListener("click", (e) => {
    const b = e.target.closest("[data-b6pad]");
    if (!b) return;
    const root = panelInUse();
    if (root) Deck.press(root, b.dataset.b6pad);
  });
  document.body.append(pad);
})();
