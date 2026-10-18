import { afterEach, describe, expect, it, vi } from "vitest";
import { toaster } from "@decky/api";
import { dismissPhaseToast, peekActivePhaseToast, showPhaseToast } from "./bonsaiPhaseToast";

describe("bonsaiPhaseToast", () => {
  afterEach(() => {
    dismissPhaseToast();
    vi.clearAllMocks();
  });

  it("dismisses the prior toast before showing the next", () => {
    showPhaseToast({ title: "Listening…", body: "Speak now", duration: 3000 });
    const first = peekActivePhaseToast();
    expect(first).not.toBeNull();

    showPhaseToast({ title: "Reply ready", body: "Tap to open", duration: 4000 });
    expect(first?.dismiss).toHaveBeenCalledTimes(1);
    expect(toaster.toast).toHaveBeenCalledTimes(2);
    expect(peekActivePhaseToast()?.data).toMatchObject({ title: "Reply ready" });
  });

  it("clears active toast on dismissPhaseToast", () => {
    const notification = showPhaseToast({ title: "Thinking…", body: "…", duration: 2000 });
    dismissPhaseToast();
    expect(notification.dismiss).toHaveBeenCalledTimes(1);
    expect(peekActivePhaseToast()).toBeNull();
  });
});
