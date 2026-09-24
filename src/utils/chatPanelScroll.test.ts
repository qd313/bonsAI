import { describe, expect, it } from "vitest";
import { scrollElementTopToPaneTop, scrollTabContentsByStep } from "./chatPanelScroll";

describe("scrollTabContentsByStep", () => {
  it("returns false when no scroll parent", () => {
    const el = document.createElement("div");
    expect(scrollTabContentsByStep(el, "down")).toBe(false);
  });

  it("scrolls down when content overflows", () => {
    const scroll = document.createElement("div");
    scroll.className = "TabContentsScroll";
    Object.defineProperty(scroll, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(scroll, "clientHeight", { value: 200, configurable: true });
    scroll.scrollTop = 0;
    const chunk = document.createElement("div");
    scroll.appendChild(chunk);
    document.body.appendChild(scroll);
    expect(scrollTabContentsByStep(chunk, "down", 80)).toBe(true);
    expect(scroll.scrollTop).toBe(80);
    document.body.removeChild(scroll);
  });
});

describe("scrollElementTopToPaneTop", () => {
  /* The Deck's shape (plan64-NOTES-OPEN-SCROLL-rec.json): pane top 88, header 116 px below it,
     and the pane's own scroll-padding-top of 116 px that scrollIntoView honours. */
  function paneWithHeaderAt(headerTop: number) {
    const pane = document.createElement("div");
    pane.className = "_TabContentsScroll";
    pane.style.scrollPaddingTop = "116px";
    Object.defineProperty(pane, "scrollHeight", { value: 1500, configurable: true });
    Object.defineProperty(pane, "clientHeight", { value: 366, configurable: true });
    pane.scrollTop = 722;
    pane.getBoundingClientRect = () => ({ top: 88, bottom: 454 }) as DOMRect;
    const header = document.createElement("div");
    header.getBoundingClientRect = () => ({ top: headerTop, bottom: headerTop + 47 }) as DOMRect;
    pane.appendChild(header);
    document.body.appendChild(pane);
    return { pane, header };
  }

  it("brings the element to the pane's own top, not 116 px below it", () => {
    const { pane, header } = paneWithHeaderAt(204);
    expect(scrollElementTopToPaneTop(header)).toBe(true);
    expect(pane.scrollTop).toBe(722 + (204 - 88 - 4));
    pane.remove();
  });

  it("never scrolls past the end of the pane", () => {
    const { pane, header } = paneWithHeaderAt(800);
    scrollElementTopToPaneTop(header);
    expect(pane.scrollTop).toBe(1500 - 366);
    pane.remove();
  });
});
