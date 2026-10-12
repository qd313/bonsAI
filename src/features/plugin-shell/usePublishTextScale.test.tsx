/**
 * Title: The Text size step reaches a plain popup
 * Purpose: Render a popup the way showModal does (a plain confirm-style body in Steam's shared page, with
 *          no box of the plugin's around it) with a size written through `textPx`, and check that the step the
 *          plugin root hands over decides its size on Small, Normal and Large, and that it is taken back
 *          when the plugin goes away.
 * Used for: usePublishTextScale.ts, plan 89 (S1): "popups the plugin draws".
 * Solves: A popup with no plugin box around it had no `--bonsai-text-scale` to read, so on Large its
 *         words stayed at Normal; this fails without the hook.
 * Does not: Open a real popup (showModal is Steam's); the test reads the same page root the popup
 *           inherits from.
 */
import { cleanup, render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TEXT_SCALE, TEXT_SCALE_VAR } from "../../data/chatTextSize";
import { getChatTitleState, resetChatTitleStore } from "../chat-title/chatTitleStore";
import { textPx } from "../../styles/sections/textPx";
import { makeFontSizeReader } from "../../test-harness/settledFontSize";
import { usePublishTextScale } from "./usePublishTextScale";

afterEach(() => {
  cleanup();
  resetChatTitleStore();
  document.documentElement.style.removeProperty(TEXT_SCALE_VAR);
});

/** A popup body as hooks like usePullModelDeleteConfirm draw it: no plugin box, one inline size. */
function popupWordsSize(): number {
  const { container } = render(<div className="bonsai-prose" style={{ fontSize: textPx(12) }}>Delete this model?</div>);
  /* No step handed in: the reader asks the elements above, up to the page's root, as the browser would. */
  return makeFontSizeReader("")(container.firstElementChild as HTMLElement);
}

describe("the Text size step in Steam's shared page, where plain popups are drawn", () => {
  it("makes a popup's words 12 on Normal, and the step times 12 on Small and Large", () => {
    for (const size of ["normal", "small", "large"] as const) {
      const { unmount } = renderHook(() => usePublishTextScale(size));
      expect(popupWordsSize(), size).toBeCloseTo(12 * TEXT_SCALE[size], 5);
      unmount();
    }
  });

  it("follows a change of the setting without a reload", () => {
    const view = renderHook(({ size }) => usePublishTextScale(size), { initialProps: { size: "normal" as "normal" | "large" } });
    expect(document.documentElement.style.getPropertyValue(TEXT_SCALE_VAR)).toBe("1");
    view.rerender({ size: "large" });
    expect(document.documentElement.style.getPropertyValue(TEXT_SCALE_VAR)).toBe("1.15");
    expect(getChatTitleState().textScale).toBe("1.15");
  });

  it("takes the variable back when the plugin goes away", () => {
    const view = renderHook(() => usePublishTextScale("large"));
    expect(document.documentElement.style.getPropertyValue(TEXT_SCALE_VAR)).toBe("1.15");
    view.unmount();
    expect(document.documentElement.style.getPropertyValue(TEXT_SCALE_VAR)).toBe("");
  });
});
