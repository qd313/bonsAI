/**
 * Title: A folded section opens and closes, several at once, and stays so through a rebuild
 * Purpose: Pin plan 91 § 2b's fold for the Deck check P91-FOLD-OLLAMA: A on a section line opens or
 *          closes it; several can be open; a first visit has every section closed; and the open set
 *          survives the tab being unmounted and mounted again, as closing a Decky popup does to it
 *          (lessons-learned § 3). Also the line's own D-pad moves: Down into an open section or on to the
 *          next line, Up to the previous section's last control or line, the first line Up to the tab
 *          bar, the last line Down (and the last section's last control Down) onto the floating Open all
 *          button through Steam's own transfer (plan 93: Down never reached it before).
 * Used for: FoldedSection.tsx, foldedTabsStore.ts.
 */
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  return { ...stubs, Focusable: SteamRingFocusable };
});

import { FoldedSection, foldAllNavId, foldLineBelow, type FoldChainSection } from "./FoldedSection";
import { foldSectionToReturnTo, personPressCount, resetFoldedTabsForTests, toggleSection } from "./foldedTabsStore";
import { registerNavFocus, resetNavFocusRegistry, unregisterNavFocus } from "../../shared/dpad/navFocusRegistry";
import { putSteamRingOn, steamRingHolder, type SteamEl } from "../../test-harness/steamRing";

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

/** The tab's Open all button as Steam's registry holds it: a nav node whose TakeFocus the test watches. */
function foldAllButton(): { TakeFocus: ReturnType<typeof vi.fn> } {
  const holder = { current: { TakeFocus: vi.fn(() => true) } };
  registerNavFocus(foldAllNavId(TAB), holder);
  return holder.current;
}

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
  it("on a first visit, every section is folded to its line", () => {
    const { container } = render(<Tab chain={CHAIN} />);
    expect(openIds(container)).toEqual([]);
    expect(container.querySelector('[data-row="a"]')).toBeNull();
    expect(container.querySelector('[data-row="b"]')).toBeNull();
    expect(line(container, "b").textContent).toContain("Section b");
    expect(line(container, "b").textContent).toContain("sum b");
  });

  it("A opens a folded section and closes an open one; the chevron and the line's data follow", () => {
    const { container } = render(<Tab chain={CHAIN} />);
    pressA(line(container, "a"));
    pressA(line(container, "b"));
    expect(openIds(container)).toEqual(["a", "b"]);
    expect(line(container, "b").textContent).toContain("▾");
    pressA(line(container, "a"));
    expect(openIds(container)).toEqual(["b"]);
    expect(line(container, "a").textContent).toContain("▸");
  });

  it("several sections can be open at once", () => {
    const { container } = render(<Tab chain={CHAIN} />);
    pressA(line(container, "a"));
    pressA(line(container, "b"));
    pressA(line(container, "c"));
    expect(openIds(container)).toEqual(["a", "b", "c"]);
  });

  it("the open set survives the tab being unmounted and mounted again (a Decky popup closing)", () => {
    const first = render(<Tab chain={CHAIN} />);
    pressA(line(first.container, "a"));
    pressA(line(first.container, "c"));
    pressA(line(first.container, "a"));
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

describe("a person's presses on a section line are noted (so the arrival code stops placing the ring)", () => {
  it("Down, Up, Right and A on a line each count; nothing else does", () => {
    const { container } = render(<Tab chain={CHAIN} />);
    const before = personPressCount();
    const el = line(container, "b");
    act(() => {
      el.__nav?.onMoveDown?.();
    });
    expect(personPressCount()).toBe(before + 1);
    act(() => {
      el.__nav?.onMoveUp?.();
    });
    expect(personPressCount()).toBe(before + 2);
    act(() => {
      el.__nav?.onMoveRight?.();
    });
    expect(personPressCount()).toBe(before + 3);
    pressA(el);
    expect(personPressCount()).toBe(before + 4);
  });
});

describe("a section line's D-pad moves", () => {
  it("Down: into an open section's first control; on to the next line when closed; the last line to the Open all button", () => {
    const entered: string[] = [];
    const chain: FoldChainSection[] = CHAIN.map((s) => ({ ...s, enterFromTop: () => (entered.push(s.id), true) }));
    toggleSection(TAB, ["a", "b", "c"], "a");
    const { container } = render(<Tab chain={chain} />);
    const button = foldAllButton();
    expect(line(container, "a").__nav?.onMoveDown?.()).toBe(true);
    expect(entered).toEqual(["a"]);
    act(() => {
      line(container, "b").__nav?.onMoveDown?.();
    });
    expect(steamRingHolder()).toBe(line(container, "c"));
    let claimed: unknown;
    act(() => {
      claimed = line(container, "c").__nav?.onMoveDown?.();
    });
    expect(claimed).toBe(true);
    /* Steam's own transfer onto the button's registered node: the button is outside the pane, another container. */
    expect(button.TakeFocus).toHaveBeenCalledTimes(1);
    /* And Up from the button comes back to this line. */
    expect(foldSectionToReturnTo(TAB)).toBe("c");
  });

  it("a section's last control hands Down to the next line, and on the last section to the Open all button", () => {
    const { container } = render(<Tab chain={CHAIN} />);
    const button = foldAllButton();
    act(() => {
      expect(foldLineBelow(TAB, CHAIN, "a")).toBe(true);
    });
    expect(steamRingHolder()).toBe(line(container, "b"));
    expect(button.TakeFocus).not.toHaveBeenCalled();
    act(() => {
      expect(foldLineBelow(TAB, CHAIN, "c")).toBe(true);
    });
    expect(button.TakeFocus).toHaveBeenCalledTimes(1);
    expect(foldSectionToReturnTo(TAB)).toBe("c");
  });

  it("with no Open all button on screen, Down at the tab's end still claims the press and holds", () => {
    const { container } = render(<Tab chain={CHAIN} />);
    act(() => {
      putSteamRingOn(line(container, "c"));
    });
    expect(line(container, "c").__nav?.onMoveDown?.()).toBe(true);
    expect(steamRingHolder()).toBe(line(container, "c"));
  });

  it("Up: the previous section's last control when it is open, else its line; the first line goes to the tab bar", () => {
    const left: string[] = [];
    const chain: FoldChainSection[] = CHAIN.map((s) => ({ ...s, enterFromBottom: () => (left.push(s.id), true) }));
    toggleSection(TAB, ["a", "b", "c"], "a");
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
