/**
 * Title: The connection line's four states, each one line of the same height
 *
 * Purpose: Pin OllamaConnectionLine.tsx (plan 105, lane D4; board 5 tab 2, round 1 C): not tested yet, checking,
 * connected (the version, the model count and the address; "Started for this check" when the check woke the
 * service) and not reachable (the reason) all draw at the line's one height of 44 px, with the full sentence on the
 * row for the help strip, and Left and Right hold still.
 *
 * Does not: run a check or walk the tab (OllamaWhereAiRunsSection.jobCard.test.tsx, OllamaTab.jobWalk.test.tsx).
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  return { ...stubs, Focusable: SteamRingFocusable };
});

import { CONNECTION_LINE_HEIGHT_PX, OllamaConnectionLine } from "./OllamaConnectionLine";
import type { ConnectionStatus } from "./OllamaWhereAiRunsSection.types";
import type { SteamEl } from "../../test-harness/steamRing";

const ADDRESS = "127.0.0.1:11434";

function draw(status: ConnectionStatus | null, checking = false) {
  return render(
    <OllamaConnectionLine status={status} checking={checking} address={ADDRESS} onTest={() => {}} navRef={{ current: null }} onMoveUp={() => true} onMoveDown={() => true} />,
  );
}

describe("the connection line", () => {
  const cases: Array<[string, ConnectionStatus | null, boolean, string, string]> = [
    ["not tested yet", null, false, "Not tested yet: A tests it", ADDRESS],
    ["checking", null, true, "Checking the connection", ADDRESS],
    ["connected", { reachable: true, version: "0.40.2", models: ["a:1"], recovery_attempted: true }, false, "Connected to this Deck's AI", `Started for this check · Ollama v0.40.2 · 1 model · ${ADDRESS}`],
    ["not reachable", { reachable: false, error: "Connection `refused`" }, false, "Not reachable: Test again", "Connection refused"],
  ];
  for (const [name, status, checking, title, detail] of cases) {
    it(`${name}: "${title}", one line under it, at the one height`, () => {
      const { container } = draw(status, checking);
      expect(screen.getByText(title)).toBeTruthy();
      expect(screen.getByText(detail)).toBeTruthy();
      const button = container.querySelector<HTMLElement>("[data-bonsai-connection-line]")!;
      expect(button.style.height).toBe(`${CONNECTION_LINE_HEIGHT_PX}px`);
      expect(CONNECTION_LINE_HEIGHT_PX).toBe(44);
      const row = container.querySelector<SteamEl>("[data-bonsai-help]")!;
      expect(row.getAttribute("data-bonsai-help")).toBe(detail);
      expect(row.__nav?.onMoveLeft?.()).toBe(true);
      expect(row.__nav?.onMoveRight?.()).toBe(true);
    });
  }
});
