import { describe, expect, it } from "vitest";
import { scrollTabContentsByStep } from "./chatPanelScroll";

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
