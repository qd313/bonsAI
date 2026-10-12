/**
 * Title: A folded section opens and closes, several at once, and stays so through a rebuild
 * Purpose: Pin plan 91 § 2b's fold for the Deck check P91-FOLD-OLLAMA: A on a section line opens or
 *          closes it; several can be open; a first visit opens the first section only; and the open set
 *          survives the tab being unmounted and mounted again, as closing a Decky popup does to it
 *          (lessons-learned § 3). Also the line's own D-pad moves: Down into an open section or on to the
 *          next line, Up to the previous section's last control or line, the first line Up to the tab
 *          bar, the last line Down holding still.
 * Used for: FoldedSection.tsx, foldedTabsStore.ts.
 */
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  return { ...stubs, Focusable: SteamRingFocusable };
});

import { FoldedSection, foldLineBelow, type FoldChainSection } from "./FoldedSection";
import { resetFoldedTabsForTests } from "./foldedTabsStore";
import { registerNavFocus, resetNavFocusRegistry, unregisterNavFocus } from "../../utils/navFocusRegistry";
import { steamRingHolder, type SteamEl } from "../../test-harness/steamRing";

const TAB = "test-tab";

function Tab({ chain }: { chain: FoldChainSection[] }) {
  return (
    <div>
      {chain.map((s) => (
        <FoldedSection key={s.id} tab={TAB} chain={chain} id={s.id} title={`Section ${s.id}`} summary={`sum ${s.id}`}>
          <button data-row={s.id}>row in {s.id}</button>
        </FoldedSection>
      ))}
    </div>
  );
}

const CHAIN: FoldChainSection[] = [{ id: "a" }, { id: "b" }, { id: "c" }];

function line(container: HTMLElement, id: string): SteamEl {
  return container.querySelector<HTMLElement>(`[data-bonsai-fold-line="${id}"]`) as SteamEl;
}
function openIds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll<HTMLElement>('.bonsai-fold-line[data-open="true"]')).map(
    (el) => el.dataset.bonsaiFoldLine ?? "",
  );
}
function pressA(el: SteamEl) {
  act(() => {
    (el.__nav?.onOKButton as (() => void) | undefined)?.();
  });
}

beforeEach(() => {
  resetFoldedTabsForTests();
  resetNavFocusRegistry();
});
afterEach(() => cleanup());

describe("a folded section", () => {
  it("on a first visit, the first section is open and the rest are folded to their lines", () => {
    const { container } = render(<Tab chain={CHAIN} />);
    expect(openIds(container)).toEqual(["a"]);
    expect(container.querySelector('[data-row="a"]')).not.toBeNull();
    expect(container.querySelector('[data-row="b"]')).toBeNull();
    expect(line(container, "b").textContent).toContain("Section b");
    expect(line(container, "b").textContent).toContain("sum b");
  });

  it("A opens a folded section and closes an open one; the chevron and the line's data follow", () => {
    const { container } = render(<Tab chain={CHAIN} />);
    pressA(line(container, "b"));
    expect(openIds(container)).toEqual(["a", "b"]);
    expect(line(container, "b").textContent).toContain("▾");
    pressA(line(container, "a"));
    expect(openIds(container)).toEqual(["b"]);
    expect(line(container, "a").textContent).toContain("▸");
  });

  it("several sections can be open at once", () => {
    const { container } = render(<Tab chain={CHAIN} />);
    pressA(line(container, "b"));
    pressA(line(container, "c"));
    expect(openIds(container)).toEqual(["a", "b", "c"]);
  });

  it("the open set survives the tab being unmounted and mounted again (a Decky popup closing)", () => {
    const first = render(<Tab chain={CHAIN} />);
    pressA(line(first.container, "a"));
    pressA(line(first.container, "c"));
    first.unmount();
    const again = render(<Tab chain={CHAIN} />);
    expect(openIds(again.container)).toEqual(["c"]);
  });

  it("keeps a static class on the line, so Steam's own focus marker in it is never wiped", () => {
    const { container } = render(<Tab chain={CHAIN} />);
    const el = line(container, "b");
    el.classList.add("gpfocus");
    pressA(el);
    expect(el.classList.contains("gpfocus")).toBe(true);
    expect(el.getAttribute("data-open")).toBe("true");
  });
});

describe("a section line's D-pad moves", () => {
  it("Down: into an open section's first control; on to the next line when closed; the last line holds", () => {
    const entered: string[] = [];
    const chain: FoldChainSection[] = CHAIN.map((s) => ({ ...s, enterFromTop: () => (entered.push(s.id), true) }));
    const { container } = render(<Tab chain={chain} />);
    expect(line(container, "a").__nav?.onMoveDown?.()).toBe(true);
    expect(entered).toEqual(["a"]);
    act(() => {
      line(container, "b").__nav?.onMoveDown?.();
    });
    expect(steamRingHolder()).toBe(line(container, "c"));
    expect(line(container, "c").__nav?.onMoveDown?.()).toBe(true);
    expect(steamRingHolder()).toBe(line(container, "c"));
  });

  it("a section's last control hands Down to the next line, and on the last section holds still", () => {
    const { container } = render(<Tab chain={CHAIN} />);
    act(() => {
      expect(foldLineBelow(TAB, CHAIN, "a")).toBe(true);
    });
    expect(steamRingHolder()).toBe(line(container, "b"));
    act(() => {
      expect(foldLineBelow(TAB, CHAIN, "c")).toBe(true);
    });
    expect(steamRingHolder()).toBe(line(container, "b"));
  });

  it("Up: the previous section's last control when it is open, else its line; the first line goes to the tab bar", () => {
    const left: string[] = [];
    const chain: FoldChainSection[] = CHAIN.map((s) => ({ ...s, enterFromBottom: () => (left.push(s.id), true) }));
    const { container } = render(<Tab chain={chain} />);
    line(container, "b").__nav?.onMoveUp?.();
    expect(left).toEqual(["a"]);
    act(() => {
      line(container, "c").__nav?.onMoveUp?.();
    });
    expect(steamRingHolder()).toBe(line(container, "b"));

    const bar = { current: { TakeFocus: vi.fn(() => true) } };
    registerNavFocus("tab-bar", bar);
    line(container, "a").__nav?.onMoveUp?.();
    expect(bar.current.TakeFocus).toHaveBeenCalled();
    unregisterNavFocus("tab-bar", bar);
  });
});
