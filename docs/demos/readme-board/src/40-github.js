/* ============================================================
   Drawing the README the way GitHub shows it. Every piece here is something GitHub's own
   markdown really renders: headings, lists, tables, <details> folds, alert boxes, images.
   GitHub strips styles and scripts, so nothing here leans on either.
   ============================================================ */
function ghEl(html) { const d = document.createElement("div"); d.innerHTML = html; return d; }

/* A video or GIF stand-in: one still frame, with a play bar (a video file) or a GIF tag (a GIF).
   kind: "gif" (plays by itself, no sound, loops) or "video" (GitHub's player, press to play). */
function video(f, { shape = f.shape, kind = "gif", wide = false } = {}) {
  const cls = "vid shape-" + (wide ? "screen-wide" : shape);
  const still = f.still && STILLS[f.still];
  const useStill = still && ((shape === "plugin") === (f.shape === "plugin"));
  const inner = useStill
    ? `<img src="${still}" alt="">`
    : `<span class="ph" style="aspect-ratio:${shape === "plugin" ? "300/454" : "16/10"}">${f.still ? "same clip, the " + (shape === "plugin" ? "plugin-only crop" : "whole screen") : "new clip"}<br>(${shape === "plugin" ? "plugin only" : "whole screen"})</span>`;
  const bar = kind === "video"
    ? `<span class="bar"><span class="tri"></span><span>0:00 / ${f.len}</span><span class="line"></span></span>`
    : `<span class="bar gif"><span class="tag">GIF</span><span>${f.len}, plays by itself</span></span>`;
  return `<span class="${cls}">${inner}${bar}</span>`;
}
function shapeNote(shape) {
  return `<span class="shape-note">${shape === "plugin" ? "Plugin only (cropped)" : "Whole screen, with the game"}</span>`;
}

/* ---- the page's fixed parts ---- */
function ghTitle({ hero = "still", badges = false, oneLinerFirst = true } = {}) {
  let s = `<h1>bonsAI</h1>`;
  if (badges) s += `<div class="badges"><span class="badge"><span class="k">release</span><span class="v b">v0.6.0</span></span><span class="badge"><span class="k">license</span><span class="v b">Apache-2.0</span></span><span class="badge"><span class="k">runs</span><span class="v">on your own Deck or PC</span></span></div>`;
  s += `<p><b>${INTRO.oneLiner}</b></p><p>${INTRO.where}</p>`;
  if (hero === "still") s += `<p><img src="${STILLS.hero}" alt="${INTRO.heroAlt}" width="960"></p>`;
  if (hero === "plugin") s += `<p align="center"><img src="${STILLS["ask-about-your-game"]}" alt="bonsAI's Main tab on a Steam Deck, answering a question" width="360"></p>`;
  if (hero === "plugin-pair") s += `<p align="center"><img src="${STILLS["ask-about-your-game"]}" alt="" width="300"> &nbsp; <img src="${STILLS["show-details"]}" alt="" width="300"></p>`;
  if (hero === "video") s += `<p>${video(FEATURES[0], { shape: "screen", kind: "video", wide: true })}</p><p><em>${CAPTION} Two minutes: a new chat, the three modes, a question about the level, the thinking steps, the answer streaming in, your notes, the chips and a branch pick.</em></p>`;
  return s;
}
function ghToc(items) {
  return `<div class="toc"><b>Contents</b><ul>${items.map((i) => `<li><a href="#">${i}</a></li>`).join("")}</ul></div>`;
}
function ghFree({ box = false } = {}) {
  const pts = `<ul>${FREE.points.map((p) => `<li>${p}</li>`).join("")}</ul>`;
  const net = `<p><b>What does reach the internet</b>, so you can check the claim instead of trusting it:</p><ul>${FREE.internet.map((p) => `<li>${p}</li>`).join("")}</ul><p>${FREE.after}</p>`;
  if (box) return `<h2>Free, open and yours</h2><div class="alert note"><div class="t">${ICON_NOTE} Note</div><p>${FREE.lead}</p>${pts}</div>${net}`;
  return `<h2>Free, open and yours</h2><p>${FREE.lead}</p>${pts}${net}`;
}
const ICON_NOTE = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/></svg>`;
const ICON_WARN = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></svg>`;

function ghBefore({ box = false } = {}) {
  const items = `<ul>${BEFORE.map((p) => `<li>${p}</li>`).join("")}</ul>`;
  if (box) return `<h2>Before you start</h2><div class="alert warn"><div class="t">${ICON_WARN} Warning</div>${items}</div>`;
  return `<h2>Before you start</h2>${items}`;
}
function ghNeed({ checklist = false } = {}) {
  if (checklist) return `<h2>What you need</h2><ul style="list-style:none;padding-left:0">${NEED.map((p) => `<li>☐ ${p}</li>`).join("")}</ul>`;
  return `<h2>What you need</h2><ul>${NEED.map((p) => `<li>${p}</li>`).join("")}</ul>`;
}
function ghInstall({ layout = "today" } = {}) {
  let s = `<h2>Install</h2><p>${INSTALL.lead}</p>`;
  const pic = (st) => st ? `<p><img src="${STILLS[st.still]}" alt="The Where AI runs section of the Ollama tab" width="300"></p>` : "";
  if (layout === "today") {
    s += INSTALL.steps.map((st, i) => `<p><b>${i + 1}. ${st.title}</b></p>${pic(st.still ? st : null)}${st.body}`).join("");
  } else if (layout === "table") {
    s += `<table class="full plain"><tbody>` + INSTALL.steps.map((st, i) => `<tr><td style="width:70%"><p><b>${i + 1}. ${st.title}</b></p>${st.body}</td><td>${st.still ? `<img src="${STILLS[st.still]}" alt="" width="260">` : ""}</td></tr>`).join("") + `</tbody></table>`;
  } else if (layout === "folds") {
    s += INSTALL.steps.map((st, i) => `<details${i === 0 ? " open" : ""}><summary>${i + 1}. ${st.title}</summary>${pic(st.still ? st : null)}${st.body}</details>`).join("");
  } else if (layout === "headings") {
    s += INSTALL.steps.map((st, i) => `<h3>${i + 1}. ${st.title}</h3>${pic(st.still ? st : null)}${st.body}`).join("");
  }
  return s;
}
function ghTail() {
  return `<h2>Getting help</h2><ul>${TAIL.help.map((p) => `<li>${p}</li>`).join("")}</ul>` +
    `<h2>Help build it</h2><p>${TAIL.build}</p>` +
    `<h2>License</h2><ul>${TAIL.licence.map((p) => `<li>${p}</li>`).join("")}</ul>` +
    `<h2>Buy me a beer</h2><p>${TAIL.beer}</p><p><span class="vid" style="width:120px"><span class="ph" style="aspect-ratio:1">QR code</span></span></p>`;
}

/* ---- the feature part, in each shape ---- */
function featureBody(f, { layout = "side", kind = "gif", shape = f.shape, wide = false } = {}) {
  const text = `<p>${f.short}</p><p>${f.long}</p>`;
  const v = video(f, { kind, shape, wide }) + shapeNote(shape);
  const cap = `<p><em>${CAPTION}</em></p>`;
  if (layout === "stack") return `<p>${v}</p>${cap}${text}`;
  if (layout === "side") return `<table class="full plain"><tbody><tr><td style="width:55%">${text}${cap}</td><td>${v}</td></tr></tbody></table>`;
  if (layout === "side-left") return `<table class="full plain"><tbody><tr><td style="width:${shape === "plugin" ? "320px" : "580px"}">${v}</td><td>${text}${cap}</td></tr></tbody></table>`;
  return text;
}

function ghFeatures({ shape = "today", open = ["ask"], kind = "gif", alt = false } = {}) {
  let s = `<h2>What it does</h2>`;
  const list = (f) => `<li><a href="#"><b>${f.title}</b></a>: ${f.short}</li>`;
  const side = (i) => (alt && i % 2) ? "side-left" : "side";
  if (shape === "today") {
    s += FEATURES.map((f) => `<h3>${f.title}</h3>${featureBody(f, { layout: "stack", kind })}`).join("");
  } else if (shape === "folds") {
    s += FEATURES.map((f, i) => `<details${open.includes(f.id) ? " open" : ""}><summary>${f.title} <span class="sub">· ${f.short}</span></summary>${featureBody(f, { layout: side(i), kind })}</details>`).join("");
  } else if (shape === "jump") {
    s += `<p>Jump to a feature:</p><ul>${FEATURES.map(list).join("")}</ul>`;
    s += FEATURES.map((f, i) => `<h3>${f.title}</h3>${featureBody(f, { layout: side(i), kind })}`).join("");
  } else if (shape === "table") {
    s += `<table class="full"><thead><tr><th>Feature</th><th>What it does</th></tr></thead><tbody>${FEATURES.map((f) => `<tr><td><a href="#"><b>${f.title}</b></a></td><td>${f.short}</td></tr>`).join("")}</tbody></table>`;
    s += FEATURES.map((f) => `<h3>${f.title}</h3>${featureBody(f, { layout: "side-left", kind })}`).join("");
  } else if (shape === "one-fold") {
    s += `<details open><summary>Pick a feature</summary><ul>${FEATURES.map(list).join("")}</ul></details>`;
    s += FEATURES.map((f) => `<details${open.includes(f.id) ? " open" : ""}><summary>${f.title}</summary>${featureBody(f, { layout: "side", kind })}</details>`).join("");
  }
  s += `<p>There's more: characters that change the tone of replies and a choice of AI models. The <b><a href="#">user guide</a></b> covers everything.</p>`;
  return s;
}

/* The whole README in one shape. */
function ghWhole(o = {}) {
  const tocItems = ["Free, open and yours", "What it does", "Before you start", "What you need", "Install", "Getting help", "Help build it", "License", "Buy me a beer"];
  const html = ghTitle({ hero: o.hero || "still", badges: !!o.badges }) + ghToc(tocItems) + ghFree({ box: !!o.freeBox }) +
    ghFeatures({ shape: o.features || "today", open: o.open, kind: o.kind, alt: !!o.alt }) + ghBefore({ box: !!o.beforeBox }) + ghNeed() +
    ghInstall({ layout: o.install || "today" }) + ghTail();
  return ghPage(html, o);
}
function ghPage(html, { zoom = null } = {}) {
  const page = h("div", { class: "gh" });
  page.innerHTML = html;
  const wrap = h("div", { class: "ghwrap" + (zoom ? " zoomed" : "") }, page);
  if (zoom) wrap.style.setProperty("--z", String(zoom));
  return wrap;
}
