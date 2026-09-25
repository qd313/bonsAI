import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScrambledAnswerText } from "./ScrambledAnswerText";
import { StreamScrambleContext, type StreamScrambleContextValue } from "./streamScrambleContext";
import { resetLiveScrambleMemoForTests } from "./liveScrambleMemo";

/* The markdown renderer's spoiler fences use Decky's Focusable; a real DOM stand-in keeps refs working. */
vi.mock("@decky/ui", async () => import("../../test-harness/fakeDeckyUi"));

const ON: StreamScrambleContextValue = { enabled: true, style: "settle", color: "green", settleMs: 400 };

function view(raw: string, streaming: boolean, value: StreamScrambleContextValue = ON) {
  return (
    <StreamScrambleContext.Provider value={value}>
      <ScrambledAnswerText plain={raw} raw={raw} streaming={streaming} spoilerMaskingEnabled />
    </StreamScrambleContext.Provider>
  );
}

/** What reads as real text: everything except the churning symbols. */
function realText(container: HTMLElement): string {
  const clone = container.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".bonsai-stream-scramble-churn").forEach((el) => el.remove());
  return clone.textContent ?? "";
}

function churnText(container: HTMLElement): string {
  return container.querySelector(".bonsai-stream-scramble-churn")?.textContent ?? "";
}

/** In small steps, each its own act(), so React renders between ticks the way the page does. */
function advance(ms: number) {
  for (let left = ms; left > 0; left -= 25) {
    act(() => {
      vi.advanceTimersByTime(Math.min(25, left));
    });
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  resetLiveScrambleMemoForTests();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("ScrambledAnswerText, switch off", () => {
  it("renders the section exactly as the plain markdown would, with no scramble span", () => {
    const { container } = render(view("Hello **world**", true, { ...ON, enabled: false }));
    expect(container.querySelector(".bonsai-stream-scramble")).toBeNull();
    expect(container.querySelector("strong")?.textContent).toBe("world");
  });
});

describe("ScrambledAnswerText, streaming with Settle after a moment", () => {
  it("shows new letters as symbols, keeps spaces, and settles them after the chosen moment", () => {
    const { container } = render(view("Hello world", true));
    expect(realText(container)).toBe("");
    expect(churnText(container)).toHaveLength(11);
    expect(churnText(container)[5]).toBe(" ");
    advance(390);
    expect(realText(container)).toBe("");
    advance(60);
    expect(realText(container)).toBe("Hello world");
    expect(churnText(container)).toBe("");
  });

  it("times each letter from when it arrived, so later text settles later", () => {
    const { container, rerender } = render(view("Hello world", true));
    advance(200);
    rerender(view("Hello world, miner", true));
    advance(250);
    expect(realText(container)).toBe("Hello world");
    expect(churnText(container)).toHaveLength(7);
    advance(250);
    expect(realText(container)).toBe("Hello world, miner");
  });

  it("colours the symbols by the chosen colour", () => {
    const { container } = render(view("Hello world", true, { ...ON, color: "cyan" }));
    expect(container.querySelector(".bonsai-stream-scramble-churn--cyan")).not.toBeNull();
  });

  it("leaves the bold marks out of the symbols and turns them into bold once settled", () => {
    const { container } = render(view("Use **the hammer**", true));
    expect(churnText(container)).toHaveLength("Use the hammer".length);
    advance(500);
    expect(container.querySelector("strong")?.textContent).toBe("the hammer");
    expect(realText(container)).toBe("Use the hammer");
  });

  it("stops its timer once every letter is real and the markdown has caught up", () => {
    const started = vi.spyOn(window, "setInterval");
    const cleared = vi.spyOn(window, "clearInterval");
    render(view("Hello world", true));
    expect(started).toHaveBeenCalledTimes(1);
    advance(700);
    expect(cleared).toHaveBeenCalledWith(started.mock.results[0]!.value);
  });
});

describe("ScrambledAnswerText, the other two styles", () => {
  it("Fixed tail keeps the last ten letters scrambled while the answer streams", () => {
    const { container } = render(view("one two three four", true, { ...ON, style: "tail" }));
    advance(200);
    expect(churnText(container).replace(/\s/g, "")).toHaveLength(10);
    expect(realText(container)).toBe("one tw");
  });

  it("Chip pace settles one letter every 42 ms, whatever the model is doing", () => {
    const { container } = render(view("abcdefghijklmnopqrstuvwxyz", true, { ...ON, style: "chip" }));
    advance(550);
    expect(realText(container)).toBe("abcdefghijklm");
  });
});

describe("ScrambledAnswerText, reopening the panel mid-answer", () => {
  it("brings back what was on screen as plain text, and scrambles only what arrives after", () => {
    const first = render(view("Hello world", true));
    advance(100);
    first.unmount();
    const { container, rerender } = render(view("Hello world again", true));
    expect(realText(container)).toBe("Hello world again");
    expect(churnText(container)).toBe("");
    rerender(view("Hello world again, more", true));
    expect(realText(container)).toBe("Hello world again");
    expect(churnText(container)).toHaveLength(", more".length);
  });

  it("scrambles a new answer from its first letter, even straight after another one", () => {
    const first = render(view("Old answer text", true));
    advance(700);
    first.unmount();
    const { container } = render(view("New", true));
    expect(realText(container)).toBe("");
    expect(churnText(container)).toHaveLength(3);
  });
});

describe("ScrambledAnswerText, when the answer ends", () => {
  it("keeps settling the letters still scrambling, and has them all real within 0.6 s", () => {
    const { container, rerender } = render(view("Hello world, miners", true));
    advance(100);
    rerender(view("Hello world, miners", false));
    expect(realText(container)).toBe("");
    advance(300);
    const midway = realText(container);
    expect(midway.length).toBeGreaterThan(5);
    expect(midway.length).toBeLessThan(19);
    advance(310);
    expect(container.querySelector(".bonsai-stream-scramble")).toBeNull();
    expect(realText(container)).toBe("Hello world, miners");
  });

  it("settles text the stream never showed along with it, rather than popping it in", () => {
    const { container, rerender } = render(view("Hello world, miners", true));
    advance(450);
    expect(realText(container)).toBe("Hello world, miners");
    rerender(view("Hello world, miners. Dig deep.", false));
    expect(realText(container)).toBe("Hello world, miners");
    expect(churnText(container)).toHaveLength(". Dig deep.".length);
    advance(650);
    expect(realText(container)).toBe("Hello world, miners. Dig deep.");
  });

  it("hands the unsettled letters to the finished section that replaces the streaming one", () => {
    const streamingView = render(view("Dig down first, then mine the gold", true));
    advance(100);
    streamingView.unmount();
    const { container } = render(view("Dig down first, then mine the gold", false));
    expect(churnText(container).length).toBeGreaterThan(0);
    advance(700);
    expect(realText(container)).toBe("Dig down first, then mine the gold");
    expect(container.querySelector(".bonsai-stream-scramble")).toBeNull();
  });

  it("turns every letter real at once when the answer was stopped", () => {
    const { container, rerender } = render(view("Hello world, miners", true));
    advance(100);
    rerender(view("Hello world, miners", false, { ...ON, stopped: true }));
    expect(container.querySelector(".bonsai-stream-scramble")).toBeNull();
    expect(realText(container)).toBe("Hello world, miners");
  });

  it("leaves a section that does not hold the settle point alone", () => {
    const { rerender } = render(view("Hello world, miners", true));
    advance(100);
    rerender(view("Hello world, miners", false));
    const other = render(view("A different paragraph entirely", false));
    expect(other.container.querySelector(".bonsai-stream-scramble")).toBeNull();
  });
});

describe("ScrambledAnswerText, reduced motion", () => {
  it("draws no scramble at all when the system asks for less motion", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    );
    const { container } = render(view("Hello world", true));
    expect(container.querySelector(".bonsai-stream-scramble")).toBeNull();
    expect(realText(container)).toBe("Hello world");
  });
});
